// Pins the remote mirror lifecycle (load / refresh swap / failure cleanup / dispose), the guarded
// temp-dir removal, the real ssh|tar pipe runner (with local stand-ins, no network), and
// POST /api/refresh through createApp.
import { cp, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildMirrorCommands,
  parseRemoteTarget,
  type MirrorCommands,
  type MirrorRunResult,
  type RemoteTarget,
} from '../../src/cli/remote-target.ts';
import { LocalFsPlanningFilesystem, removeTempDirSync } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { createApp } from '../../src/server/index.ts';
import { RemoteSnapshotSource, spawnMirrorRunner, type MirrorRunner } from '../../src/server/remote-source.ts';

const FIXTURES = resolve(import.meta.dirname, '../../fixtures');
const ADDRESS = 'sftp://fixture-host/srv/proj';

const OK: MirrorRunResult = {
  sshExit: 0,
  tarExit: 0,
  sshStderr: '',
  tarStderr: '',
  timedOut: false,
  spawnError: null,
};

function target(): RemoteTarget {
  const parsed = parseRemoteTarget(ADDRESS);
  if (parsed.kind !== 'remote') throw new Error('fixture address must parse as remote');
  return parsed.target;
}

async function mirrorDirs(): Promise<Set<string>> {
  return new Set((await readdir(tmpdir())).filter((name) => name.startsWith('labelore-remote-')));
}

async function expectedFixture(name: string) {
  const repository = new PlanningRepository(new LocalFsPlanningFilesystem(join(FIXTURES, name)), 'x');
  const snapshot = await repository.load();
  return { name: snapshot.project?.name, artifactCount: Object.keys(snapshot.project?.artifacts ?? {}).length };
}

/** A fake runner: copies a fixture's .planning into destDir, or returns a configured failure. */
function makeRunner() {
  const state: {
    fixture: string;
    failure: Partial<MirrorRunResult> | null;
    destDirs: string[];
  } = { fixture: 'sparse-started', failure: null, destDirs: [] };
  const runner: MirrorRunner = async (commands) => {
    state.destDirs.push(commands.destDir);
    if (state.failure) return { ...OK, ...state.failure };
    await cp(join(FIXTURES, state.fixture, '.planning'), join(commands.destDir, '.planning'), { recursive: true });
    return { ...OK };
  };
  return { state, runner };
}

let baseline: Set<string>;
const sources: RemoteSnapshotSource[] = [];
const extraDirs: string[] = [];

beforeEach(async () => {
  baseline = await mirrorDirs();
});

afterEach(async () => {
  for (const source of sources.splice(0)) source.dispose();
  for (const dir of extraDirs.splice(0)) await rm(dir, { recursive: true, force: true });
  // Nothing this test run created may be left behind.
  const leftovers = [...(await mirrorDirs())].filter((name) => !baseline.has(name));
  expect(leftovers).toEqual([]);
});

function track(source: RemoteSnapshotSource): RemoteSnapshotSource {
  sources.push(source);
  return source;
}

describe('RemoteSnapshotSource lifecycle', () => {
  it('load() mirrors, labels the snapshot with the remote address and keeps the mirror in the temp dir', async () => {
    const { state, runner } = makeRunner();
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    const snapshot = await source.load();
    const expected = await expectedFixture('sparse-started');

    expect(snapshot.loadStatus).toEqual({ status: 'ok' });
    expect(snapshot.rootPath).toBe(ADDRESS);
    expect(snapshot.project?.name).toBe(expected.name);
    const [dir] = state.destDirs;
    expect(existsSync(dir)).toBe(true);
    expect(resolve(dir, '..')).toBe(resolve(tmpdir()));
    expect(dir.split('/').pop()?.startsWith('labelore-remote-')).toBe(true);
  });

  it('refresh() swaps in the new mirror and removes the old one', async () => {
    const { state, runner } = makeRunner();
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    await source.load();
    state.fixture = 'dense';
    const refreshed = await source.refresh();
    const expected = await expectedFixture('dense');

    expect(refreshed.loadStatus).toEqual({ status: 'ok' });
    expect(refreshed.project?.name).toBe(expected.name);
    expect(Object.keys(refreshed.project?.artifacts ?? {}).length).toBe(expected.artifactCount);
    expect(source.getSnapshot()).toBe(refreshed);
    expect(existsSync(state.destDirs[1])).toBe(true);
    expect(existsSync(state.destDirs[0])).toBe(false);
  });

  it('a failed refresh keeps the previous snapshot and mirror, and removes the failed dir', async () => {
    const { state, runner } = makeRunner();
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    const first = await source.load();
    state.failure = { sshExit: 65 };
    const failed = await source.refresh();

    expect(failed.loadStatus.status).toBe('path-not-found');
    expect(failed.loadStatus.status !== 'ok' && failed.loadStatus.message).toContain(ADDRESS);
    expect(source.getSnapshot()).toBe(first);
    expect(existsSync(state.destDirs[1])).toBe(false);
    expect(existsSync(state.destDirs[0])).toBe(true);
  });

  it('an initial failure serves a failure snapshot and leaves no directory', async () => {
    const { state, runner } = makeRunner();
    state.failure = { sshExit: 255, sshStderr: 'Permission denied (publickey).' };
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    await source.load();
    const snapshot = source.getSnapshot();

    expect(snapshot.loadStatus.status).toBe('permission-denied');
    expect(snapshot.project).toBeNull();
    expect(existsSync(state.destDirs[0])).toBe(false);
  });

  it('a successful refresh after a failed first load becomes current', async () => {
    const { state, runner } = makeRunner();
    state.failure = { sshExit: 255, sshStderr: 'ssh: Could not resolve hostname fixture-host' };
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    await source.load();
    state.failure = null;
    const refreshed = await source.refresh();
    expect(refreshed.loadStatus.status).toBe('ok');
    expect(source.getSnapshot()).toBe(refreshed);
  });

  it('dispose() removes the current mirror and is idempotent', async () => {
    const { state, runner } = makeRunner();
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    await source.load();
    source.dispose();
    expect(existsSync(state.destDirs[0])).toBe(false);
    expect(() => source.dispose()).not.toThrow();
  });
});

describe('RemoteSnapshotSource planningFilesystem', () => {
  it('hands out the current mirror filesystem, and null after a failed load or dispose', async () => {
    const { state, runner } = makeRunner();
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    expect(source.planningFilesystem()).toBeNull();
    await source.load();
    const fs = source.planningFilesystem();
    expect(fs).not.toBeNull();
    expect(await fs?.exists('.planning')).toBe(true);
    source.dispose();
    expect(source.planningFilesystem()).toBeNull();

    state.failure = { sshExit: 255, sshStderr: 'Permission denied (publickey).' };
    const failing = track(new RemoteSnapshotSource(target(), { runner }));
    await failing.load();
    expect(failing.planningFilesystem()).toBeNull();
  });
});

describe('removeTempDirSync guard', () => {
  it('refuses a foreign prefix, a nested path and the fixtures directory', async () => {
    const foreign = await mkdtemp(join(tmpdir(), 'other-prefix-'));
    extraDirs.push(foreign);
    const owned = await mkdtemp(join(tmpdir(), 'labelore-remote-'));
    extraDirs.push(owned);

    expect(removeTempDirSync(foreign, 'labelore-remote-')).toBe(false);
    expect(existsSync(foreign)).toBe(true);
    expect(removeTempDirSync(join(owned, 'nested'), 'labelore-remote-')).toBe(false);
    expect(existsSync(owned)).toBe(true);
    expect(removeTempDirSync(FIXTURES, 'labelore-remote-')).toBe(false);
    expect(existsSync(join(FIXTURES, 'dense'))).toBe(true);
    expect(removeTempDirSync(owned, 'Bad Prefix')).toBe(false);
    expect(removeTempDirSync(owned, 'labelore-remote-')).toBe(true);
    expect(existsSync(owned)).toBe(false);
  });
});

describe('POST /api/refresh through createApp', () => {
  it('re-mirrors on success and keeps serving the earlier content on failure', async () => {
    const { state, runner } = makeRunner();
    const source = track(new RemoteSnapshotSource(target(), { runner }));
    await source.load();
    const app = createApp(source, false);
    const first = await expectedFixture('sparse-started');
    const second = await expectedFixture('dense');

    state.fixture = 'dense';
    const ok = await app.request('/api/refresh', { method: 'POST' });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { refreshed: boolean }).refreshed).toBe(true);
    const dashboard = (await (await app.request('/api/dashboard')).json()) as { projectName?: string };
    expect(JSON.stringify(dashboard)).toContain(second.name ?? '');
    expect(JSON.stringify(dashboard)).not.toContain(first.name ?? '\u0000');

    state.failure = { sshExit: 65 };
    const bad = await app.request('/api/refresh', { method: 'POST' });
    expect(bad.status).toBe(500);
    expect(((await bad.json()) as { error: string }).error).toContain(ADDRESS);
    const after = await (await app.request('/api/dashboard')).text();
    expect(after).toContain(second.name ?? '');
  });
});

describe('spawnMirrorRunner with local stand-ins', () => {
  async function freshDest(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'labelore-remote-'));
    extraDirs.push(dir);
    return dir;
  }

  function commandsWith(ssh: MirrorCommands['ssh'], destDir: string): MirrorCommands {
    return { ssh, tar: buildMirrorCommands(target(), destDir).tar, destDir };
  }

  it('pipes a tar stream from the first command into the local tar', async () => {
    const dest = await freshDest();
    const result = await spawnMirrorRunner(
      commandsWith(
        { command: 'tar', args: ['-C', join(FIXTURES, 'dense'), '-cf', '-', '.planning'] },
        dest,
      ),
      { timeoutMs: 30_000 },
    );
    expect(result.sshExit).toBe(0);
    expect(result.tarExit).toBe(0);
    expect((await stat(join(dest, '.planning', 'PROJECT.md'))).isFile()).toBe(true);
  });

  it('reports the remote exit code and stderr', async () => {
    const dest = await freshDest();
    const result = await spawnMirrorRunner(
      commandsWith({ command: 'sh', args: ['-c', 'echo boom >&2; exit 65'] }, dest),
      { timeoutMs: 30_000 },
    );
    expect(result.sshExit).toBe(65);
    expect(result.sshStderr).toContain('boom');
  });

  it('resolves with a spawnError when the binary is missing', async () => {
    const dest = await freshDest();
    const result = await spawnMirrorRunner(
      commandsWith({ command: 'labelore-no-such-binary', args: [] }, dest),
      { timeoutMs: 30_000 },
    );
    expect(result.spawnError?.which).toBe('ssh');
  });

  it('kills both children on timeout', async () => {
    const dest = await freshDest();
    const started = Date.now();
    const result = await spawnMirrorRunner(commandsWith({ command: 'sleep', args: ['5'] }, dest), {
      timeoutMs: 200,
    });
    expect(result.timedOut).toBe(true);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
