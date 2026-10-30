// The server's list of projects and the runtime of each loaded one (PLAT-02). Entries are keyed by a
// slug allocated once (allocateSlug) and de-duplicated by identity; a runtime is built lazily on the
// first request for its slug, coalesced so concurrent requests start one load, and the registry never
// answers a request from any project but the one its slug names.
//
// Listing is memory only (D-02): list() never calls createSource, so showing the switcher costs no
// project load. This file imports no node:fs; folder checks go through resolveTargetPath, a row's
// PROJECT.md title through project-title.ts, and every read or write of Labelore's own settings file
// goes through the SettingsStore (PLAT-06): store.mutate re-reads the file first, so two Labelore
// instances never mint the same slug (D-11). Nothing here ever writes inside a target project (SEC-05).
import { homedir } from 'node:os';
import { basename, resolve, sep } from 'node:path';
import { resolveTargetPath, LOAD_STATUS_MESSAGES } from '../cli/target-path.ts';
import { parseRemoteTarget } from '../cli/remote-target.ts';
import {
  LocalFsPlanningFilesystem,
  canonicalizePath,
  listChildEntries,
  statPathSync,
} from '../planning-fs/local-fs.ts';
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
import {
  SCAN_DIRECTORY_VALVE,
  SCAN_MAX_DEPTH,
  SCAN_RESULT_CAP,
  resolveScanFolder,
  scanForProjects,
} from './folder-scan.ts';
import type { ScanListing } from './folder-scan.ts';
import { ProjectRuntime } from './project-runtime.ts';
import type { SnapshotSource } from './project-runtime.ts';
import { readProjectTitle } from './project-title.ts';
import { RemoteSnapshotSource } from './remote-source.ts';
import type { MirrorRunner } from './remote-source.ts';
import { addEntry, forgetEntry, saveFailedNotice, setNameHint, skippedNotice, stampOpened } from './settings-model.ts';
import type { SettingsEntry } from './settings-model.ts';
import { MemorySettingsStore } from './settings-store.ts';
import type { SettingsStore } from './settings-store.ts';

const DEFAULT_MAX_LOADED = 5;
/** How long a folder check made by list() is trusted before the next list() looks again. */
const DEFAULT_VALIDATE_TTL_MS = 10_000;

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
  /** How long list() trusts a folder check of an unloaded local entry, and a row's PROJECT.md title
   * (default 10 000 ms). */
  validateTtlMs?: number;
  /** Where the remembered project list lives (default: an in-memory store that never touches disk). */
  store?: SettingsStore;
  /** The folder Labelore's settings file lives in, checked against every local target so the file can
   * never land inside a project (D-19). Default: the folder of store.location(); null disables the check. */
  settingsDir?: string | null;
}

export type RegisterOutcome =
  | { ok: true; slug: string; duplicate: boolean }
  | { ok: false; status: FailedLoadStatus };

/** The largest target add() accepts (the same bound the settings file enforces on read). */
const MAX_TARGET_LENGTH = 1024;
export const INVALID_INPUT_MESSAGE = 'Enter a folder path or an ssh:// target.';

export type AddFailure =
  | { ok: false; code: 'invalid-input'; error: string }
  | { ok: false; code: 'invalid-target'; status: FailedLoadStatus }
  | { ok: false; code: 'settings-inside'; error: string; pathChecked: string };

export type AddOutcome = { ok: true; slug: string; name: string; duplicate: boolean } | AddFailure;

export type ForgetOutcome =
  | { ok: true }
  | { ok: false; code: 'unknown' }
  | { ok: false; code: 'save-failed'; error: string };

export interface OpenOutcome {
  slug: string;
  state: ProjectLoadState;
}

/** The message for a target that holds Labelore's own settings folder (research Open Question 4). */
export function settingsInsideMessage(settingsDir: string): string {
  return (
    `Labelore keeps its own settings inside this project (${settingsDir}), so it will not add it. ` +
    'Set LABELORE_CONFIG_DIR to a folder outside the project and restart.'
  );
}

export interface ScanFound {
  /** The canonical path of the project folder. */
  path: string;
  displayPath: string;
  name: string;
  alreadyAdded: boolean;
}

export type ScanOutcome =
  | { ok: false; error: string }
  | { ok: true; folder: string; found: ScanFound[]; capped: boolean; cap: number };

export interface AddManyResult {
  target: string;
  slug?: string;
  duplicate?: boolean;
  error?: string;
}

export interface AddManyOutcome {
  /** How many targets became new entries (a duplicate adds nothing). */
  added: number;
  results: AddManyResult[];
}

interface RegistryEntry {
  slug: string;
  /** The canonical root of a local project; the password-free address of an ssh one. */
  target: string;
  kind: ProjectKind;
  /** What makes two registrations the same project. */
  identity: string;
  addedOrder: number;
  lastOpened: string | null;
  /** True when the entry has a row in the settings file (or was written to it this run); register()
   * entries and session-only entries are memory only. */
  persisted: boolean;
  /** True for a CLI path that failed validation: listed for this run, never written (D-22). */
  sessionOnly: boolean;
  /** True for a local target holding the settings folder: listed unavailable, never loaded (D-19). */
  blocked: boolean;
  /** The title remembered from the last successful load (D-21); used for ssh rows. */
  nameHint: string | null;
  /** list()'s last PROJECT.md title read of this local entry: when, and what it found. */
  title: string | null;
  titleAt: number | null;
  state: ProjectLoadState;
  failure: FailedLoadStatus | null;
  runtime: ProjectRuntime | null;
  loading: Promise<ProjectRuntime | null> | null;
  /** list()'s last folder check of this entry while it is unloaded and local: when, and what it found. */
  validatedAt: number | null;
  validation: FailedLoadStatus | null;
}

/** The ssh identity ignores the scheme (ssh://, sftp:// and scp forms to one place are one project),
 * lower-cases the host, reads a missing port as 22 and keeps user and remote root case-sensitive. */
function sshIdentity(target: { user: string | null; host: string; port: number | null; remoteRoot: string }): string {
  return `ssh:${target.user ?? ''}@${target.host.toLowerCase()}:${target.port ?? 22}:${target.remoteRoot}`;
}

/** What makes two saved targets the same project: a local target is its canonical root as written, an
 * ssh one follows sshIdentity. Pure (no folder is looked at). Pass it to FileSettingsStore so the file
 * is read and de-duplicated by the same rule the registry uses. */
export function identityOfTarget(target: string): string {
  const remote = parseRemoteTarget(target);
  return remote.kind === 'remote' ? sshIdentity(remote.target) : target;
}

type ParsedTarget =
  | { ok: true; target: string; kind: ProjectKind; identity: string }
  | { ok: false; status: FailedLoadStatus; kind: ProjectKind };

type AddCore =
  | { ok: true; entry: RegistryEntry; duplicate: boolean }
  | { ok: false; failure: AddFailure; kind: ProjectKind };

export class ProjectRegistry {
  private readonly createSource: (target: string) => Promise<SnapshotSource>;
  private readonly maxLoaded: number;
  private readonly home: string;
  private readonly now: () => number;
  private readonly validateTtlMs: number;
  private readonly store: SettingsStore;
  /** The folder the settings file lives in, or null when there is none to protect. */
  private readonly settingsDir: string | null;
  private readonly entries: Map<string, RegistryEntry>;
  /** Slugs of the ready runtimes, least recently used first. */
  private readonly recency: Set<string>;
  /** The store's read notices followed by this run's save failures (D-12), each once. */
  private readonly notices: string[];
  /** The slug a forgotten project had, by identity, so a re-add this run gets it back while free (D-10). */
  private readonly forgotten: Map<string, string>;
  private nextOrder: number;
  private closed: boolean;

  constructor(options: ProjectRegistryOptions = {}) {
    const remoteRunner = options.remoteRunner;
    this.createSource =
      options.createSource ?? ((target) => createSnapshotSource(target, remoteRunner ? { remoteRunner } : {}));
    this.maxLoaded = options.maxLoaded ?? DEFAULT_MAX_LOADED;
    this.home = options.home ?? homedir();
    this.now = options.now ?? Date.now;
    this.validateTtlMs = options.validateTtlMs ?? DEFAULT_VALIDATE_TTL_MS;
    this.store = options.store ?? new MemorySettingsStore();
    this.settingsDir = ProjectRegistry.settingsDirOf(this.store, options.settingsDir);
    this.entries = new Map();
    this.recency = new Set();
    this.notices = [];
    this.forgotten = new Map();
    this.nextOrder = 0;
    this.closed = false;

    // One unloaded entry per saved project, in file order. 08-04's parseSettings has already validated
    // and skipped bad entries, so a hand-edited slug that passed is used as written (D-12).
    const saved = this.store.read();
    for (const notice of saved.notices) this.note(notice);
    for (const entry of saved.state.projects) this.restore(entry);
  }

  private static settingsDirOf(store: SettingsStore, explicit: string | null | undefined): string | null {
    if (explicit === null) return null;
    if (explicit !== undefined) return resolve(explicit);
    const file = store.location();
    return file === null ? null : resolve(file, '..');
  }

  private note(notice: string): void {
    if (!this.notices.includes(notice)) this.notices.push(notice);
  }

  private noteSaveFailure(reason: string): void {
    this.note(saveFailedNotice(reason));
  }

  /** True when the settings folder is `root` or sits inside it (path-segment containment, canonical paths). */
  private settingsInside(root: string): boolean {
    const dir = this.settingsDir;
    if (dir === null) return false;
    const prefix = root.endsWith(sep) ? root : root + sep;
    return dir === root || dir.startsWith(prefix);
  }

  /** Parses the raw target once (ssh or local, D-17); a local target is resolved here and nowhere else. */
  private parse(rawTarget: string): ParsedTarget {
    const remote = parseRemoteTarget(rawTarget);
    if (remote.kind === 'invalid') return { ok: false, status: remote.status, kind: 'ssh' };
    if (remote.kind === 'remote') {
      return { ok: true, target: remote.target.rawPath, kind: 'ssh', identity: sshIdentity(remote.target) };
    }
    const resolved = resolveTargetPath(rawTarget);
    if (!('rootPath' in resolved)) return { ok: false, status: resolved, kind: 'local' };
    return { ok: true, target: resolved.rootPath, kind: 'local', identity: resolved.rootPath };
  }

  private blankEntry(slug: string, target: string, kind: ProjectKind, identity: string): RegistryEntry {
    const entry: RegistryEntry = {
      slug,
      target,
      kind,
      identity,
      addedOrder: this.nextOrder,
      lastOpened: null,
      persisted: false,
      sessionOnly: false,
      blocked: false,
      nameHint: null,
      title: null,
      titleAt: null,
      state: 'unloaded',
      failure: null,
      runtime: null,
      loading: null,
      validatedAt: null,
      validation: null,
    };
    this.nextOrder += 1;
    this.entries.set(slug, entry);
    return entry;
  }

  /** Marks a local entry whose root holds the settings folder: unavailable, never loaded. */
  private block(entry: RegistryEntry, pathChecked: string): void {
    entry.blocked = true;
    entry.state = 'unavailable';
    entry.failure = {
      status: 'not-a-gsd-project',
      pathChecked,
      message: settingsInsideMessage(this.settingsDir ?? ''),
    };
  }

  /** Makes the in-memory entry of one saved project. */
  private restore(saved: SettingsEntry): RegistryEntry | null {
    const remote = parseRemoteTarget(saved.target);
    const kind: ProjectKind = remote.kind === 'local' ? 'local' : 'ssh';
    const identity = identityOfTarget(saved.target);
    for (const other of this.entries.values()) {
      if (other.identity === identity) {
        this.note(skippedNotice('it repeats another saved project'));
        return null;
      }
    }
    const entry = this.blankEntry(saved.slug, saved.target, kind, identity);
    entry.persisted = true;
    entry.lastOpened = saved.lastOpened;
    entry.nameHint = saved.name ?? null;
    if (remote.kind === 'invalid') {
      entry.state = 'unavailable';
      entry.failure = remote.status;
    } else if (kind === 'local') {
      const canonical = canonicalizePath(resolve(saved.target));
      const root = canonical.ok ? canonical.resolved : saved.target;
      if (this.settingsInside(root)) this.block(entry, root);
    }
    return entry;
  }

  /** Adds a project by its raw target, parsing it once. An existing identity is a duplicate and adds
   * nothing; a target the server cannot read is refused with its own status. Never loads a project and
   * never writes the settings file (tests and in-memory registration only). */
  async register(rawTarget: string): Promise<RegisterOutcome> {
    const parsed = this.parse(rawTarget);
    if (!parsed.ok) return { ok: false, status: parsed.status };
    const existing = this.findByIdentity(parsed.identity);
    if (existing) return { ok: true, slug: existing.slug, duplicate: true };
    const slug = allocateSlug(slugOf(parsed.target), new Set(this.entries.keys()));
    this.blankEntry(slug, parsed.target, parsed.kind, parsed.identity);
    return { ok: true, slug, duplicate: false };
  }

  private findByIdentity(identity: string): RegistryEntry | null {
    for (const entry of this.entries.values()) if (entry.identity === identity) return entry;
    return null;
  }

  /**
   * Adds a project and remembers it (PLAT-06, PLAT-07). The slug is allocated inside store.mutate, against
   * the latest file and every slug in use here (D-11). There is no await between the duplicate check and
   * the entry being created, so two simultaneous adds of one target yield one entry. A failed write keeps
   * the entry for this run and adds the save-failed notice (D-12). An ssh target is checked for syntax
   * only; it connects on first open.
   */
  async add(rawTarget: string): Promise<AddOutcome> {
    const core = this.addNow(rawTarget);
    if (!core.ok) return core.failure;
    return { ok: true, slug: core.entry.slug, name: await this.displayName(core.entry), duplicate: core.duplicate };
  }

  /**
   * Adds each target through add(), in order: one parse and one folder check per target (D-17), nothing
   * loaded. A target that cannot be added carries the server's own message in its result and the others
   * are still added. The caller bounds the number of targets.
   */
  async addMany(targets: readonly string[]): Promise<AddManyOutcome> {
    const results: AddManyResult[] = [];
    let added = 0;
    for (const target of targets) {
      const outcome = await this.add(target);
      if (outcome.ok) {
        results.push({ target, slug: outcome.slug, duplicate: outcome.duplicate });
        if (!outcome.duplicate) added += 1;
      } else if (outcome.code === 'invalid-target') {
        results.push({ target, error: outcome.status.message });
      } else {
        results.push({ target, error: outcome.error });
      }
    }
    return { added, results };
  }

  /**
   * Looks for GSD projects under a folder the user typed (PLAT-05, D-15). Only a request calls this
   * (D-16). The folder is resolved and confined to home by resolveScanFolder; the walk goes through the
   * read-only listing. Each result says whether the registry already holds it, by identity.
   */
  async scan(rawFolder: unknown, options: { home?: string; list?: ScanListing } = {}): Promise<ScanOutcome> {
    const home = options.home ?? this.home;
    const resolved = resolveScanFolder(rawFolder, {
      home,
      canonicalize: canonicalizePath,
      stat: statPathSync,
    });
    if (!resolved.ok) return { ok: false, error: resolved.error };

    const walked = await scanForProjects({
      root: resolved.folder,
      list: options.list ?? listChildEntries,
      maxDepth: SCAN_MAX_DEPTH,
      cap: SCAN_RESULT_CAP,
      valve: SCAN_DIRECTORY_VALVE,
    });
    const found = await Promise.all(
      walked.found.map(async (path): Promise<ScanFound> => {
        const shortened = homeShortened(path, resolved.canonicalHome);
        return {
          path,
          displayPath: shortened === path ? homeShortened(path, home) : shortened,
          name: (await readProjectTitle(path)) ?? basename(path),
          alreadyAdded: this.findByIdentity(path) !== null,
        };
      }),
    );
    return { ok: true, folder: resolved.display, found, capped: walked.capped, cap: SCAN_RESULT_CAP };
  }

  private addNow(rawTarget: string): AddCore {
    if (
      typeof rawTarget !== 'string' ||
      rawTarget.length < 1 ||
      rawTarget.length > MAX_TARGET_LENGTH ||
      rawTarget.includes('\0')
    ) {
      return {
        ok: false,
        kind: 'local',
        failure: { ok: false, code: 'invalid-input', error: INVALID_INPUT_MESSAGE },
      };
    }
    const parsed = this.parse(rawTarget);
    if (!parsed.ok) {
      return {
        ok: false,
        kind: parsed.kind,
        failure: { ok: false, code: 'invalid-target', status: parsed.status },
      };
    }
    if (parsed.kind === 'local' && this.settingsInside(parsed.target)) {
      return {
        ok: false,
        kind: 'local',
        failure: {
          ok: false,
          code: 'settings-inside',
          error: settingsInsideMessage(this.settingsDir ?? ''),
          pathChecked: parsed.target,
        },
      };
    }
    const existing = this.findByIdentity(parsed.identity);
    if (existing) return { ok: true, entry: existing, duplicate: true };

    const wanted = this.forgotten.get(parsed.identity);
    let slug: string | undefined;
    let addedFromFile = false;
    const result = this.store.mutate((state) => {
      const taken = new Set([...state.projects.map((project) => project.slug), ...this.entries.keys()]);
      const base = wanted !== undefined && !taken.has(wanted) ? wanted : allocateSlug(slugOf(parsed.target), taken);
      const added = addEntry(state, {
        target: parsed.target,
        identity: parsed.identity,
        slugBase: base,
        identityOf: identityOfTarget,
        now: new Date(this.now()).toISOString(),
      });
      slug = added.slug;
      addedFromFile = added.duplicate;
      return added.state;
    });
    if (!result.ok) this.noteSaveFailure(result.reason);
    // The update never ran (the file could not be read): the entry lives for this run only.
    slug ??= allocateSlug(slugOf(parsed.target), new Set(this.entries.keys()));

    const savedRow = result.state.projects.find((project) => project.slug === slug);
    const entry = this.blankEntry(slug, parsed.target, parsed.kind, parsed.identity);
    entry.persisted = true;
    if (addedFromFile && savedRow) {
      entry.lastOpened = savedRow.lastOpened;
      entry.nameHint = savedRow.name ?? null;
    }
    this.forgotten.delete(parsed.identity);
    return { ok: true, entry, duplicate: addedFromFile };
  }

  /**
   * Registers the command-line targets in argument order (D-09, D-22). One that validates is added and
   * so remembered; one that fails is listed for this run only, unavailable with the server's own
   * reason, and never written to the settings file.
   */
  async registerCliTargets(rawPaths: readonly string[]): Promise<void> {
    for (const raw of rawPaths) {
      const core = this.addNow(raw);
      if (core.ok) continue;
      const { failure } = core;
      let status: FailedLoadStatus;
      if (failure.code === 'invalid-target') {
        status = failure.status;
      } else if (failure.code === 'settings-inside') {
        status = { status: 'not-a-gsd-project', pathChecked: failure.pathChecked, message: failure.error };
      } else {
        const shown = String(raw).replaceAll('\0', '').slice(0, 200);
        status = {
          status: 'path-not-found',
          pathChecked: shown,
          rawPath: shown,
          message: LOAD_STATUS_MESSAGES['path-not-found']({ pathChecked: shown, rawPath: shown }),
        };
      }
      const identity = `session:${status.pathChecked}`;
      if (this.findByIdentity(identity)) continue;
      const slug = allocateSlug(slugOf(status.pathChecked), new Set(this.entries.keys()));
      const entry = this.blankEntry(slug, status.pathChecked, core.kind, identity);
      entry.sessionOnly = true;
      entry.state = 'unavailable';
      entry.failure = status;
      entry.blocked = failure.code === 'settings-inside';
    }
  }

  /**
   * Forgets a project by editing settings.json only (D-10): its runtime is disposed and its files are
   * untouched. When the write fails the entry stays and the answer carries the save-failed copy.
   */
  async forget(slug: string): Promise<ForgetOutcome> {
    const entry = this.entries.get(slug);
    if (!entry) return { ok: false, code: 'unknown' };
    if (entry.persisted) {
      const result = this.store.mutate((state) => forgetEntry(state, slug));
      if (!result.ok) return { ok: false, code: 'save-failed', error: saveFailedNotice(result.reason) };
    }
    entry.runtime?.dispose();
    entry.runtime = null;
    this.recency.delete(slug);
    this.entries.delete(slug);
    if (!entry.sessionOnly) this.forgotten.set(entry.identity, slug);
    return { ok: true };
  }

  /**
   * Opens a project (D-08): stamps lastOpened (and lastActive in the file) for that entry only, starts its
   * load without waiting for it and retries an entry that failed before. Nothing else changes and the
   * registry keeps no active project: a tab names its project in its own URL.
   */
  async open(slug: string): Promise<OpenOutcome | null> {
    if (this.closed) return null;
    const entry = this.entries.get(slug);
    if (!entry) return null;
    const stamp = new Date(this.now()).toISOString();
    entry.lastOpened = stamp;
    if (entry.persisted) {
      const result = this.store.mutate((state) => stampOpened(state, slug, stamp));
      if (!result.ok) this.noteSaveFailure(result.reason);
    }
    void this.runtime(slug, { retryFailed: true }).catch(() => undefined);
    return { slug, state: entry.state };
  }

  /** The project list, built without loading anything (D-02): no source is created. An unloaded local
   * entry has its folder looked at again at most once per validateTtlMs, so a deleted folder lists as
   * unavailable with the server's own message; ssh entries are never probed. A local row is named by
   * its PROJECT.md title (read cheaply, same memo window), an ssh row by the title remembered from its
   * last successful load. Ordered last opened first (D-04). */
  async list(): Promise<ProjectListResponse> {
    const ordered = orderProjects([...this.entries.values()]);
    const projects = await Promise.all(
      ordered.map(async (entry): Promise<ProjectListEntry> => {
        const failure = entry.state === 'unavailable' ? entry.failure : this.revalidated(entry);
        return {
          slug: entry.slug,
          name: await this.displayName(entry),
          kind: entry.kind,
          target: entry.target,
          displayPath: homeShortened(entry.target, this.home),
          state: failure ? 'unavailable' : entry.state,
          reason: failure?.message ?? null,
          pathChecked: failure?.pathChecked ?? null,
          lastOpened: entry.lastOpened,
          sessionOnly: entry.sessionOnly,
        };
      }),
    );
    return { projects, notices: [...this.notices] };
  }

  /** A row's name (D-21): never changes the slug. */
  private async displayName(entry: RegistryEntry): Promise<string> {
    if (entry.kind === 'ssh') return entry.nameHint ?? projectDisplayName(null, entry.target);
    if (!entry.blocked) {
      const at = this.now();
      if (entry.titleAt === null || at - entry.titleAt >= this.validateTtlMs) {
        entry.title = await readProjectTitle(entry.target);
        entry.titleAt = at;
      }
    }
    return entry.title ?? projectDisplayName(null, entry.target);
  }

  /** The failure found by looking at an unloaded local entry's folder, memoised for validateTtlMs;
   * null when the folder is fine or the entry is not one that is looked at. */
  private revalidated(entry: RegistryEntry): FailedLoadStatus | null {
    if (entry.kind !== 'local' || entry.state !== 'unloaded') return null;
    const at = this.now();
    if (entry.validatedAt === null || at - entry.validatedAt >= this.validateTtlMs) {
      const resolved = resolveTargetPath(entry.target);
      entry.validation = 'rootPath' in resolved ? null : resolved;
      entry.validatedAt = at;
    }
    return entry.validation;
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
    if (entry.runtime && !(entry.state === 'unavailable' && options.retryFailed === true)) {
      if (entry.state === 'ready') this.touch(slug);
      return entry.runtime;
    }
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
        const source =
          entry.blocked && entry.failure ? failedSource(entry.failure) : await this.createSource(entry.target);
        runtime = new ProjectRuntime(source, entry.slug);
      } catch {
        const status: FailedLoadStatus = {
          status: 'path-not-found',
          pathChecked: entry.target,
          rawPath: entry.target,
          message: LOAD_STATUS_MESSAGES['path-not-found']({ pathChecked: entry.target, rawPath: entry.target }),
        };
        runtime = new ProjectRuntime(failedSource(status), entry.slug);
      }
      if (this.closed || this.entries.get(entry.slug) !== entry) {
        runtime.dispose();
        return null;
      }
      const { loadStatus, projectName } = runtime.derived.presentation;
      entry.runtime = runtime;
      entry.validatedAt = null;
      entry.validation = null;
      if (loadStatus.status === 'ok') {
        entry.state = 'ready';
        entry.failure = null;
        this.rememberName(entry, projectName);
        this.touch(entry.slug);
        this.evictOverCap(entry);
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

  /** Saves the title a successful load found when it differs from the saved hint (D-21). */
  private rememberName(entry: RegistryEntry, projectName: string | null): void {
    if (!entry.persisted || projectName === null || projectName.trim() === '' || projectName === entry.nameHint) return;
    entry.nameHint = projectName;
    const result = this.store.mutate((state) => setNameHint(state, entry.slug, projectName));
    if (!result.ok) this.noteSaveFailure(result.reason);
  }

  /** Marks a ready runtime as the most recently used. */
  private touch(slug: string): void {
    this.recency.delete(slug);
    this.recency.add(slug);
  }

  /** While more than maxLoaded runtimes are ready, disposes the least recently used one that has no
   * request in flight and is not the one just loaded; its entry returns to unloaded. When every
   * candidate is busy the registry stays over the cap until the next load (Pitfall 9). */
  private evictOverCap(justLoaded: RegistryEntry): void {
    for (const slug of [...this.recency]) {
      if (this.loadedCount() <= this.maxLoaded) return;
      if (slug === justLoaded.slug) continue;
      const candidate = this.entries.get(slug);
      if (!candidate?.runtime || candidate.state !== 'ready' || candidate.loading) continue;
      if (candidate.runtime.inFlightRequests > 0) continue;
      candidate.runtime.dispose();
      candidate.runtime = null;
      candidate.failure = null;
      candidate.state = 'unloaded';
      this.recency.delete(slug);
    }
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
    this.recency.clear();
    for (const entry of this.entries.values()) {
      entry.runtime?.dispose();
      entry.runtime = null;
      entry.state = 'unloaded';
    }
  }
}
