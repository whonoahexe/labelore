// The server's list of projects and the runtime of each loaded one (PLAT-02). Entries are keyed by a
// slug allocated once (allocateSlug) and de-duplicated by identity; a runtime is built lazily on the
// first request for its slug, coalesced so concurrent requests start one load, and the registry never
// answers a request from any project but the one its slug names.
//
// Listing is memory only (D-02): list() never calls createSource, so showing the switcher costs no
// project read. This file imports no node:fs; folder checks go through resolveTargetPath.
import { homedir } from 'node:os';
import { resolveTargetPath, LOAD_STATUS_MESSAGES } from '../cli/target-path.ts';
import { parseRemoteTarget } from '../cli/remote-target.ts';
import { LocalFsPlanningFilesystem } from '../planning-fs/local-fs.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import type { FailedLoadStatus, ProjectSnapshot } from '../planning-repo/types.ts';
import { homeShortened, orderProjects } from '../presentation/project-list.ts';
import type {
  ProjectKind,
  ProjectListEntry,
  ProjectListResponse,
  ProjectLoadState,
} from '../presentation/project-list.ts';
import { allocateSlug, slugOf } from '../presentation/project-slug.ts';
import { projectDisplayName } from '../presentation/shell-header.ts';
import { ProjectRuntime } from './project-runtime.ts';
import type { SnapshotSource } from './project-runtime.ts';
import { RemoteSnapshotSource } from './remote-source.ts';
import type { MirrorRunner } from './remote-source.ts';

const DEFAULT_MAX_LOADED = 5;

export function failedSource(status: FailedLoadStatus): SnapshotSource {
  const snapshot: ProjectSnapshot = {
    loadStatus: status,
    readAt: new Date().toISOString(),
    rootPath: status.pathChecked,
    project: null,
    warnings: [],
    exclusions: [],
  };
  return { getSnapshot: () => snapshot };
}

/** Parses the raw target once (ssh or local) and loads the project it names. Never throws for a bad
 * target: that is a failed source carrying the server's own status. */
export async function createSnapshotSource(
  rawPath: string,
  options: { remoteRunner?: MirrorRunner } = {},
): Promise<SnapshotSource> {
  const remote = parseRemoteTarget(rawPath);
  if (remote.kind === 'invalid') return failedSource(remote.status);
  if (remote.kind === 'remote') {
    const source = new RemoteSnapshotSource(
      remote.target,
      options.remoteRunner ? { runner: options.remoteRunner } : {},
    );
    await source.load();
    return source;
  }

  const resolved = resolveTargetPath(rawPath);
  if (!('rootPath' in resolved)) return failedSource(resolved);

  const planningFilesystem = new LocalFsPlanningFilesystem(resolved.rootPath);
  const repository = new PlanningRepository(planningFilesystem, resolved.rootPath);
  await repository.load();
  return repository;
}

export interface ProjectRegistryOptions {
  /** Builds the source for a target; defaults to createSnapshotSource. A throw becomes a failed source. */
  createSource?: (target: string) => Promise<SnapshotSource>;
  /** How many runtimes stay loaded at once (default 5). */
  maxLoaded?: number;
  /** The home folder paths are shortened against in the list (default os.homedir()). */
  home?: string;
  /** The ssh mirror runner for the default createSource (tests pass a fake). */
  remoteRunner?: MirrorRunner;
  /** Milliseconds clock (default Date.now). */
  now?: () => number;
}

export type RegisterOutcome =
  | { ok: true; slug: string; duplicate: boolean }
  | { ok: false; status: FailedLoadStatus };

interface RegistryEntry {
  slug: string;
  /** The canonical root of a local project; the password-free address of an ssh one. */
  target: string;
  kind: ProjectKind;
  /** What makes two registrations the same project. */
  identity: string;
  addedOrder: number;
  lastOpened: string | null;
  state: ProjectLoadState;
  failure: FailedLoadStatus | null;
  runtime: ProjectRuntime | null;
  loading: Promise<ProjectRuntime | null> | null;
}

/** The ssh identity ignores the scheme (ssh://, sftp:// and scp forms to one place are one project),
 * lower-cases the host, reads a missing port as 22 and keeps user and remote root case-sensitive. */
function sshIdentity(target: { user: string | null; host: string; port: number | null; remoteRoot: string }): string {
  return `ssh:${target.user ?? ''}@${target.host.toLowerCase()}:${target.port ?? 22}:${target.remoteRoot}`;
}

export class ProjectRegistry {
  private readonly createSource: (target: string) => Promise<SnapshotSource>;
  private readonly maxLoaded: number;
  private readonly home: string;
  private readonly now: () => number;
  private readonly entries: Map<string, RegistryEntry>;
  private nextOrder: number;
  private closed: boolean;

  constructor(options: ProjectRegistryOptions = {}) {
    const remoteRunner = options.remoteRunner;
    this.createSource =
      options.createSource ?? ((target) => createSnapshotSource(target, remoteRunner ? { remoteRunner } : {}));
    this.maxLoaded = options.maxLoaded ?? DEFAULT_MAX_LOADED;
    this.home = options.home ?? homedir();
    this.now = options.now ?? Date.now;
    this.entries = new Map();
    this.nextOrder = 0;
    this.closed = false;
  }

  /** Adds a project by its raw target, parsing it once. An existing identity is a duplicate and adds
   * nothing; a target the server cannot read is refused with its own status. Never loads a project. */
  async register(rawTarget: string): Promise<RegisterOutcome> {
    const remote = parseRemoteTarget(rawTarget);
    let target: string;
    let kind: ProjectKind;
    let identity: string;
    if (remote.kind === 'invalid') return { ok: false, status: remote.status };
    if (remote.kind === 'remote') {
      target = remote.target.rawPath;
      kind = 'ssh';
      identity = sshIdentity(remote.target);
    } else {
      const resolved = resolveTargetPath(rawTarget);
      if (!('rootPath' in resolved)) return { ok: false, status: resolved };
      target = resolved.rootPath;
      kind = 'local';
      identity = resolved.rootPath;
    }

    for (const entry of this.entries.values()) {
      if (entry.identity === identity) return { ok: true, slug: entry.slug, duplicate: true };
    }
    const slug = allocateSlug(slugOf(target), new Set(this.entries.keys()));
    this.entries.set(slug, {
      slug,
      target,
      kind,
      identity,
      addedOrder: this.nextOrder,
      lastOpened: null,
      state: 'unloaded',
      failure: null,
      runtime: null,
      loading: null,
    });
    this.nextOrder += 1;
    return { ok: true, slug, duplicate: false };
  }

  /** The project list, built from memory only (D-02): no source is created and nothing is read. */
  async list(): Promise<ProjectListResponse> {
    const ordered = orderProjects([...this.entries.values()]);
    const projects: ProjectListEntry[] = ordered.map((entry) => ({
      slug: entry.slug,
      name: projectDisplayName(null, entry.target),
      kind: entry.kind,
      target: entry.target,
      displayPath: homeShortened(entry.target, this.home),
      state: entry.state,
      reason: entry.state === 'unavailable' ? (entry.failure?.message ?? null) : null,
      pathChecked: entry.state === 'unavailable' ? (entry.failure?.pathChecked ?? null) : null,
      lastOpened: entry.lastOpened,
      sessionOnly: false,
    }));
    return { projects, notices: [] };
  }

  /**
   * The runtime for a slug: null for an unknown slug (or after dispose), the ready runtime when there
   * is one, the one in-flight load when a load is running, else a fresh load. Never throws: a source
   * that cannot be created becomes a failed one, and a failed runtime is still returned so the client
   * can show the invalid-target screen. A failed runtime is reloaded only when `retryFailed` is true.
   */
  async runtime(slug: string, options: { retryFailed?: boolean } = {}): Promise<ProjectRuntime | null> {
    if (this.closed) return null;
    const entry = this.entries.get(slug);
    if (!entry) return null;
    if (entry.loading) return entry.loading;
    if (entry.runtime && !(entry.state === 'unavailable' && options.retryFailed === true)) return entry.runtime;
    if (entry.runtime) {
      entry.runtime.dispose();
      entry.runtime = null;
    }
    return this.load(entry);
  }

  private load(entry: RegistryEntry): Promise<ProjectRuntime | null> {
    entry.state = 'loading';
    const loading = (async (): Promise<ProjectRuntime | null> => {
      let runtime: ProjectRuntime;
      try {
        runtime = new ProjectRuntime(await this.createSource(entry.target), entry.slug);
      } catch {
        const status: FailedLoadStatus = {
          status: 'path-not-found',
          pathChecked: entry.target,
          rawPath: entry.target,
          message: LOAD_STATUS_MESSAGES['path-not-found']({ pathChecked: entry.target, rawPath: entry.target }),
        };
        runtime = new ProjectRuntime(failedSource(status), entry.slug);
      }
      if (this.closed) {
        runtime.dispose();
        return null;
      }
      const { loadStatus } = runtime.derived.presentation;
      entry.runtime = runtime;
      if (loadStatus.status === 'ok') {
        entry.state = 'ready';
        entry.failure = null;
      } else {
        entry.state = 'unavailable';
        entry.failure = loadStatus;
      }
      return runtime;
    })().finally(() => {
      entry.loading = null;
    });
    entry.loading = loading;
    return loading;
  }

  /** How many runtimes are loaded and serving (failed ones are not counted). */
  loadedCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) if (entry.state === 'ready' && entry.runtime) count += 1;
    return count;
  }

  /** Disposes every runtime once; afterwards runtime() answers null. Idempotent. */
  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const entry of this.entries.values()) {
      entry.runtime?.dispose();
      entry.runtime = null;
      entry.state = 'unloaded';
    }
  }
}
