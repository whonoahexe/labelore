// One project's served state (D-05, PLAT-02): the derived bundle built from its snapshot, the commit
// log and file dates read from its folder, the coalesced refresh, and its disposal. The slug-keyed
// registry owns one of these per loaded project and the project API reads only the runtime it is
// handed, so nothing here is shared between two projects.
//
// This file keeps the node:child_process users (commit log, file dates) behind their own modules and
// imports no Node module itself.
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { ScopedPlanningFilesystem } from '../planning-fs/scoped-fs.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import { buildReferenceRegistry } from '../presentation/references.ts';
import { buildRouteTable } from '../presentation/route-table.ts';
import type { RouteTable } from '../presentation/route-table.ts';
import { buildArtifactIndex } from './artifact-index.ts';
import { createCommitLog, type CommitLog } from './commit-times.ts';
import { createFileDates, createGitRunner, type FileDates, type GitRunner } from './file-dates.ts';
import { createIndexSummary, type IndexSummary } from './index-summary.ts';
import { toProjectPresentation } from './project-presentation.ts';
import { createSearchIndexState } from './search-index.ts';
import { flatInventory, isValidWorkstreamName, readWorkstreamInventory } from './workstreams.ts';
import type { WorkstreamInventory } from './workstreams.ts';

export interface SnapshotSource {
  getSnapshot(): ProjectSnapshot;
  /** Optional: a source with nothing to refresh into (the failed-initial-load literal) simply omits
   * this member. TGT-08 empty edge: POST refresh against such a source is not an error - it answers
   * 200 with `refreshed: false`. */
  refresh?(): Promise<ProjectSnapshot>;
  /** Optional: a source that owns resources (the remote ssh mirror's temp directory) releases them
   * here. The runtime calls it at most once, from dispose(). */
  dispose?(): void;
  /** Optional: the live filesystem behind the snapshot, for the read-only sketch and image routes.
   * Sources without one (the failed-load literal, test doubles) answer 404 on those. */
  planningFilesystem?(): PlanningFilesystem | null;
}

/** D-05: every read handler serves from one of these bundles, built together from a single
 * snapshot, and replaced together in one assignment - never mutated field by field. The route table is
 * built first and shared by the presentation, the artifact index and the search state, so a URL is never
 * resolved by one bundle's table against another bundle's index. */
export interface DerivedViews {
  routeTable: RouteTable;
  presentation: ReturnType<typeof toProjectPresentation>;
  artifactIndex: ReturnType<typeof buildArtifactIndex>;
  referenceRegistry: ReturnType<typeof buildReferenceRegistry>;
  searchIndexState: ReturnType<typeof createSearchIndexState>;
  /** The Indexes page's graph summary service (11-13): built with the bundle, so a refresh drops what it cached. */
  indexSummary: IndexSummary;
}

/** What one refresh came to; the handler maps each to today's JSON body and status. */
export type RefreshOutcome =
  /** The source has nothing to refresh into: 200, `refreshed: false`. */
  | { kind: 'unsupported'; readAt: string; loadStatus: ProjectSnapshot['loadStatus'] }
  /** The bundle was swapped: 200, `refreshed: true`. */
  | { kind: 'refreshed'; readAt: string; loadStatus: ProjectSnapshot['loadStatus'] }
  /** Nothing was swapped and the previous bundle keeps serving: 500, `refreshed: false`. */
  | { kind: 'failed'; error: string };

/** What a workstream-scoped runtime knows about its scope: where a virtual path really lives (11-29). */
export interface RuntimeScope {
  readonly name: string;
  realPathOf(virtualPath: string): string;
}

export class ProjectRuntime {
  readonly slug: string;
  /** Set only on a runtime that serves one workstream; null on every project's own runtime. */
  readonly scope: RuntimeScope | null;
  readonly source: SnapshotSource;
  /** Replaced only by one whole-bundle assignment (D-05). */
  derived: DerivedViews;
  readonly fileDates: FileDates;
  readonly commits: CommitLog;
  /** Requests currently being answered from this runtime; the registry never evicts a busy one. */
  inFlightRequests: number;
  disposed: boolean;
  private inFlight: Promise<ProjectSnapshot> | null;
  private readonly runGit: GitRunner;
  /** The workstream inventory of the current bundle; dropped with every successful refresh. */
  private inventory: Promise<WorkstreamInventory> | null;
  /** One runtime per listed workstream, created on first use and disposed with this one. */
  private readonly scoped: Map<string, Promise<ProjectRuntime | null>>;
  /** The workstream runtimes that finished loading, for isBusy(). */
  private readonly children: Set<ProjectRuntime>;

  constructor(source: SnapshotSource, slug: string, commitLog?: CommitLog, runGit?: GitRunner, scope?: RuntimeScope) {
    this.source = source;
    this.slug = slug;
    this.scope = scope ?? null;
    this.inventory = null;
    this.scoped = new Map();
    this.children = new Set();
    // The commits-behind figure of the graph summary: a short timeout and a small buffer, one number back.
    this.runGit = runGit ?? createGitRunner(3000, 64 * 1024);
    this.inFlightRequests = 0;
    this.disposed = false;
    this.inFlight = null;
    this.derived = this.buildDerivedViews(source.getSnapshot());
    const dates = createFileDates(this.derived.presentation.rootPath);
    // A scoped file's date is the date of the file on disk, not of its virtual path.
    this.fileDates = scope ? { addedAt: (path) => dates.addedAt(scope.realPathOf(path)) } : dates;
    // quick-261018-hbd: Pace times plans from the target's commits; read once, reset on refresh.
    this.commits = commitLog ?? createCommitLog(this.derived.presentation.rootPath);
  }

  // D-05/WR-03: builds all derived views from one snapshot. This stays the file's only
  // presentation-building call site, whichever way `snapshot` was obtained.
  private buildDerivedViews(snapshot: ProjectSnapshot): DerivedViews {
    const slug = this.slug;
    const routeTable = buildRouteTable(snapshot.project);
    const presentation = toProjectPresentation(snapshot, slug, routeTable, this.scope?.realPathOf.bind(this.scope));
    const artifactIndex = buildArtifactIndex(snapshot, routeTable);
    const referenceRegistry = buildReferenceRegistry(presentation);
    // D-04/FIND-05: constructing the state object is synchronous and cheap (just a status flag);
    // the actual MiniSearch build is scheduled off this path inside buildFrom - callers never wait
    // on index readiness.
    const searchIndexState = createSearchIndexState();
    searchIndexState.buildFrom(snapshot, routeTable);
    // Creating the summary does no read: the graph is scanned only when the Indexes page asks (11-13, D-04).
    const indexSummary = createIndexSummary({
      fs: () => this.planningFilesystem(),
      git: this.runGit,
      root: presentation.rootPath,
    });
    return { routeTable, presentation, artifactIndex, referenceRegistry, searchIndexState, indexSummary };
  }

  /** Re-reads the source and swaps the bundle (T-04-01-01: concurrent callers share one walk). */
  async refresh(): Promise<RefreshOutcome> {
    const source = this.source;
    if (!source.refresh) {
      // TGT-08 empty edge: a source with nothing to refresh into is not an error.
      return {
        kind: 'unsupported',
        readAt: this.derived.presentation.readAt,
        loadStatus: this.derived.presentation.loadStatus,
      };
    }
    if (this.disposed) return { kind: 'failed', error: 'Refresh failed' };
    // Bound once, outside the coalescing branch - `source.refresh` is a method on `source` (e.g.
    // `PlanningRepository.prototype.refresh`, which reads `this.fs`/`this.rootPath`), so calling
    // an unbound reference to it would silently drop `this` and throw.
    const refresh = source.refresh.bind(source);

    try {
      if (!this.inFlight) {
        this.inFlight = refresh().finally(() => {
          this.inFlight = null;
        });
      }
      const snapshot = await this.inFlight;
      // CR-01/D-04: a resolved refresh whose loadStatus is not ok is a reachable failure -
      // PlanningRepository.refresh() never throws (D-12), it resolves normally with
      // project: null. Answer a failure and leave `derived` untouched so no served response is
      // ever built from the failed snapshot; the previously retained bundle keeps serving.
      if (snapshot.loadStatus.status !== 'ok') {
        return { kind: 'failed', error: snapshot.loadStatus.message };
      }
      // A runtime disposed while the walk ran must not schedule a search build of its own.
      if (this.disposed) return { kind: 'failed', error: 'Refresh failed' };
      // D-05: the atomic swap - every field the derived bundle carries replaces together in one
      // assignment, never mutated piecemeal. Only reached on an ok load status.
      this.derived = this.buildDerivedViews(snapshot);
      this.commits.reset();
      // The listing may have changed with the files: drop the inventory and every workstream runtime, which
      // the next request rebuilds from the new listing.
      this.resetScopes();
      return { kind: 'refreshed', readAt: snapshot.readAt, loadStatus: snapshot.loadStatus };
    } catch {
      // PlanningRepository.refresh() documents that it never throws; this catch is purely a
      // defensive boundary. `derived` is left untouched - D-04 retains the previous snapshot.
      return { kind: 'failed', error: 'Refresh failed' };
    }
  }

  /** The live filesystem behind the snapshot, or null. Called as a method on `source` so `this` survives. */
  planningFilesystem(): PlanningFilesystem | null {
    return this.source.planningFilesystem?.() ?? null;
  }

  /** True while this runtime or any workstream runtime it holds is answering a request. */
  isBusy(): boolean {
    if (this.inFlightRequests > 0) return true;
    for (const child of this.children) if (child.inFlightRequests > 0) return true;
    return false;
  }

  private resetScopes(): void {
    const stale = [...this.scoped.values()];
    // Finished runtimes are released now; one still loading is released as soon as it resolves.
    for (const child of this.children) child.dispose();
    this.scoped.clear();
    this.inventory = null;
    this.children.clear();
    for (const pending of stale) void pending.then((runtime) => runtime?.dispose()).catch(() => undefined);
  }

  /** The project's workstream inventory, read once per bundle; always flat for a scoped runtime. */
  workstreamInventory(): Promise<WorkstreamInventory> {
    if (this.scope) return Promise.resolve(flatInventory());
    if (!this.inventory) {
      const fs = this.planningFilesystem();
      this.inventory = fs ? readWorkstreamInventory(fs) : Promise.resolve(flatInventory());
    }
    return this.inventory;
  }

  /**
   * The runtime serving one workstream, or null. A name is a path segment only after the grammar check AND an
   * exact match against a listed workstream folder; anything else (an unknown, file-named or malformed name)
   * is null and nothing is created or remembered for it.
   */
  async workstreamRuntime(name: string): Promise<ProjectRuntime | null> {
    if (this.disposed || this.scope || !isValidWorkstreamName(name)) return null;
    const existing = this.scoped.get(name);
    if (existing) return existing;
    const pending = this.createScoped(name);
    this.scoped.set(name, pending);
    const runtime = await pending.catch(() => null);
    if (runtime === null && this.scoped.get(name) === pending) this.scoped.delete(name);
    return runtime;
  }

  private async createScoped(name: string): Promise<ProjectRuntime | null> {
    const fs = this.planningFilesystem();
    if (!fs) return null;
    const inventory = await this.workstreamInventory();
    if (!inventory.entries.some((entry) => entry.name === name && entry.kind === 'folder')) return null;
    const scopedFs = new ScopedPlanningFilesystem(fs, name);
    const repository = new PlanningRepository(scopedFs, this.derived.presentation.rootPath);
    await repository.load();
    if (this.disposed) return null;
    const runtime = new ProjectRuntime(repository, this.slug, undefined, this.runGit, {
      name,
      realPathOf: (virtualPath) => scopedFs.realPathOf(virtualPath),
    });
    this.children.add(runtime);
    return runtime;
  }

  /** Releases everything this runtime owns: cancels the scheduled search build, then lets the source
   * free its resources (the ssh mirror directory). Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resetScopes();
    this.derived.searchIndexState.cancel();
    this.source.dispose?.();
  }
}
