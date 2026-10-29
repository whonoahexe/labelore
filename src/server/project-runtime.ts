// One project's served state (D-05, PLAT-02): the derived bundle built from its snapshot, the commit
// log and file dates read from its folder, the coalesced refresh, and its disposal. The slug-keyed
// registry owns one of these per loaded project and the project API reads only the runtime it is
// handed, so nothing here is shared between two projects.
//
// This file keeps the node:child_process users (commit log, file dates) behind their own modules and
// imports no Node module itself.
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { buildReferenceRegistry } from '../presentation/references.ts';
import { buildRouteTable } from '../presentation/route-table.ts';
import type { RouteTable } from '../presentation/route-table.ts';
import { buildArtifactIndex } from './artifact-index.ts';
import { createCommitLog, type CommitLog } from './commit-times.ts';
import { createFileDates, type FileDates } from './file-dates.ts';
import { toProjectPresentation } from './project-presentation.ts';
import { createSearchIndexState } from './search-index.ts';

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
}

/** What one refresh came to; the handler maps each to today's JSON body and status. */
export type RefreshOutcome =
  /** The source has nothing to refresh into: 200, `refreshed: false`. */
  | { kind: 'unsupported'; readAt: string; loadStatus: ProjectSnapshot['loadStatus'] }
  /** The bundle was swapped: 200, `refreshed: true`. */
  | { kind: 'refreshed'; readAt: string; loadStatus: ProjectSnapshot['loadStatus'] }
  /** Nothing was swapped and the previous bundle keeps serving: 500, `refreshed: false`. */
  | { kind: 'failed'; error: string };

export class ProjectRuntime {
  readonly slug: string;
  readonly source: SnapshotSource;
  /** Replaced only by one whole-bundle assignment (D-05). */
  derived: DerivedViews;
  readonly fileDates: FileDates;
  readonly commits: CommitLog;
  /** Requests currently being answered from this runtime; the registry never evicts a busy one. */
  inFlightRequests: number;
  disposed: boolean;
  private inFlight: Promise<ProjectSnapshot> | null;

  constructor(source: SnapshotSource, slug: string, commitLog?: CommitLog) {
    this.source = source;
    this.slug = slug;
    this.inFlightRequests = 0;
    this.disposed = false;
    this.inFlight = null;
    this.derived = this.buildDerivedViews(source.getSnapshot());
    this.fileDates = createFileDates(this.derived.presentation.rootPath);
    // quick-261018-hbd: Pace times plans from the target's commits; read once, reset on refresh.
    this.commits = commitLog ?? createCommitLog(this.derived.presentation.rootPath);
  }

  // D-05/WR-03: builds all derived views from one snapshot. This stays the file's only
  // presentation-building call site, whichever way `snapshot` was obtained.
  private buildDerivedViews(snapshot: ProjectSnapshot): DerivedViews {
    const slug = this.slug;
    const routeTable = buildRouteTable(snapshot.project);
    const presentation = toProjectPresentation(snapshot, slug, routeTable);
    const artifactIndex = buildArtifactIndex(snapshot, routeTable);
    const referenceRegistry = buildReferenceRegistry(presentation);
    // D-04/FIND-05: constructing the state object is synchronous and cheap (just a status flag);
    // the actual MiniSearch build is scheduled off this path inside buildFrom - callers never wait
    // on index readiness.
    const searchIndexState = createSearchIndexState();
    searchIndexState.buildFrom(snapshot, routeTable);
    return { routeTable, presentation, artifactIndex, referenceRegistry, searchIndexState };
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

  /** Releases everything this runtime owns: cancels the scheduled search build, then lets the source
   * free its resources (the ssh mirror directory). Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.derived.searchIndexState.cancel();
    this.source.dispose?.();
  }
}
