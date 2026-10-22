// Mirrors a remote project's `.planning/` over the system `ssh` client into a fresh local temp
// directory, then reads that mirror through the unchanged LocalFsPlanningFilesystem and
// PlanningRepository. This is the only module that imports node:child_process; every disk touch is
// delegated to src/planning-fs/local-fs.ts so DATA-01's single-importer boundary holds.
//
// The remote side only ever runs a path check and `tar -c` (see buildMirrorCommands), so the
// remote host is never written to.
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import {
  LocalFsPlanningFilesystem,
  canonicalizePath,
  createTempDirSync,
  pathExistsSync,
  removeTempDirSync,
} from '../planning-fs/local-fs.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import type { FailedLoadStatus, ProjectSnapshot } from '../planning-repo/types.ts';
import {
  buildMirrorCommands,
  classifyMirrorResult,
  type MirrorCommands,
  type MirrorRunResult,
  type RemoteTarget,
} from '../cli/remote-target.ts';

const MIRROR_PREFIX = 'labelore-remote-';
const DEFAULT_TIMEOUT_MS = 120_000;
const STDERR_CAP = 8 * 1024;

export type MirrorRunner = (commands: MirrorCommands, options: { timeoutMs: number }) => Promise<MirrorRunResult>;

/**
 * Spawns ssh (stdout piped) and the local tar (stdin piped) from argv arrays with no shell, and
 * resolves once both have closed. Never rejects: spawn failures and timeouts are reported on the
 * result so classifyMirrorResult can map them.
 */
export const spawnMirrorRunner: MirrorRunner = (commands, { timeoutMs }) =>
  new Promise<MirrorRunResult>((resolve) => {
    const result: MirrorRunResult = {
      sshExit: null,
      tarExit: null,
      sshStderr: '',
      tarStderr: '',
      timedOut: false,
      spawnError: null,
    };
    const ssh = spawn(commands.ssh.command, commands.ssh.args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tar = spawn(commands.tar.command, commands.tar.args, {
      shell: false,
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    let closed = 0;
    const finish = (timer: NodeJS.Timeout): void => {
      closed += 1;
      if (closed < 2) return;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      result.timedOut = true;
      ssh.kill('SIGKILL');
      tar.kill('SIGKILL');
    }, timeoutMs);

    const collect = (child: ChildProcess, key: 'sshStderr' | 'tarStderr'): void => {
      child.stderr?.setEncoding('utf8');
      child.stderr?.on('data', (chunk: string) => {
        if (result[key].length < STDERR_CAP) result[key] = (result[key] + chunk).slice(0, STDERR_CAP);
      });
    };
    collect(ssh, 'sshStderr');
    collect(tar, 'tarStderr');

    const fail = (which: 'ssh' | 'tar', other: ChildProcess, error: Error): void => {
      if (!result.spawnError) result.spawnError = { which, message: error.message };
      other.kill('SIGKILL');
      tar.stdin?.end();
    };
    ssh.on('error', (error) => fail('ssh', tar, error));
    tar.on('error', (error) => fail('tar', ssh, error));
    tar.stdin?.on('error', () => {
      // EPIPE when tar exits before ssh has finished writing; the exit codes carry the story.
    });

    if (ssh.stdout && tar.stdin) ssh.stdout.pipe(tar.stdin);
    ssh.on('close', (code) => {
      result.sshExit = code;
      finish(timer);
    });
    tar.on('close', (code) => {
      result.tarExit = code;
      finish(timer);
    });
  });

interface Mirror {
  dir: string;
  snapshot: ProjectSnapshot;
  /** The filesystem over the mirror directory, swapped together with the snapshot on refresh. */
  fs: PlanningFilesystem;
}

function failureSnapshot(status: FailedLoadStatus, label: string): ProjectSnapshot {
  return {
    loadStatus: status,
    readAt: new Date().toISOString(),
    rootPath: label,
    project: null,
    warnings: [],
    exclusions: [],
  };
}

/** A snapshot source backed by a read-only ssh mirror of one remote project's `.planning/`. */
export class RemoteSnapshotSource {
  private readonly target: RemoteTarget;
  private readonly runner: MirrorRunner;
  private readonly timeoutMs: number;
  private current: Mirror | null = null;
  private lastFailure: ProjectSnapshot | null = null;

  constructor(target: RemoteTarget, options: { runner?: MirrorRunner; timeoutMs?: number } = {}) {
    this.target = target;
    this.runner = options.runner ?? spawnMirrorRunner;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Mirrors into a NEW temp dir. Returns the new mirror on success; on failure the dir is already
   * removed and a failure snapshot comes back instead. Never throws. */
  private async mirror(): Promise<{ mirror: Mirror } | { failure: ProjectSnapshot }> {
    let dir: string;
    try {
      dir = createTempDirSync(MIRROR_PREFIX);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        failure: failureSnapshot(
          {
            status: 'permission-denied',
            pathChecked: this.target.label,
            message: `Cannot mirror ${this.target.label}: could not create a temp directory (${message})`,
          },
          this.target.label,
        ),
      };
    }
    try {
      const commands = buildMirrorCommands(this.target, dir);
      const run = await this.runner(commands, { timeoutMs: this.timeoutMs });
      const outcome = classifyMirrorResult(
        run,
        this.target,
        pathExistsSync(join(dir, '.planning')),
        this.timeoutMs,
      );
      if (!outcome.ok) {
        removeTempDirSync(dir, MIRROR_PREFIX);
        return { failure: failureSnapshot(outcome.status, this.target.label) };
      }
      if (outcome.remoteWarning) {
        console.warn(`Remote ${this.target.label}: ${outcome.remoteWarning}`);
      }
      // LocalFsPlanningFilesystem's containment guard compares realpaths, so the root must be
      // canonical or a symlinked TMPDIR would reject every read.
      const canonical = canonicalizePath(dir);
      const canonicalDir = canonical.ok ? canonical.resolved : dir;
      const fs = new LocalFsPlanningFilesystem(canonicalDir);
      const repository = new PlanningRepository(fs, this.target.label);
      const snapshot = await repository.load();
      return { mirror: { dir, snapshot, fs } };
    } catch (error) {
      removeTempDirSync(dir, MIRROR_PREFIX);
      const message = error instanceof Error ? error.message : String(error);
      return {
        failure: failureSnapshot(
          {
            status: 'path-not-found',
            pathChecked: this.target.label,
            rawPath: this.target.rawPath,
            message: `Mirroring ${this.target.label} failed: ${message}`,
          },
          this.target.label,
        ),
      };
    }
  }

  async load(): Promise<ProjectSnapshot> {
    const result = await this.mirror();
    if ('failure' in result) {
      this.lastFailure = result.failure;
      return result.failure;
    }
    this.current = result.mirror;
    this.lastFailure = null;
    return result.mirror.snapshot;
  }

  /** Re-mirrors into a NEW temp dir. On success the new mirror replaces the current one in a single
   * assignment and only then is the old directory removed (served data is all in memory after load,
   * so this is safe). On failure the new dir is already gone and `current` is untouched, so the last
   * good snapshot keeps serving; the failure snapshot is returned for POST /api/refresh to report. */
  async refresh(): Promise<ProjectSnapshot> {
    const result = await this.mirror();
    if ('failure' in result) {
      if (!this.current) this.lastFailure = result.failure;
      return result.failure;
    }
    const previous = this.current;
    this.current = result.mirror;
    this.lastFailure = null;
    if (previous) removeTempDirSync(previous.dir, MIRROR_PREFIX);
    return result.mirror.snapshot;
  }

  getSnapshot(): ProjectSnapshot {
    if (this.current) return this.current.snapshot;
    if (this.lastFailure) return this.lastFailure;
    throw new Error('RemoteSnapshotSource.getSnapshot() called before load()');
  }

  /** The filesystem over the current mirror, for the read-only sketch route; null before a good load
   * and after dispose(). */
  planningFilesystem(): PlanningFilesystem | null {
    return this.current?.fs ?? null;
  }

  /** Removes the current mirror directory. Idempotent. */
  dispose(): void {
    if (!this.current) return;
    removeTempDirSync(this.current.dir, MIRROR_PREFIX);
    this.current = null;
  }
}
