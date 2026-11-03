// Pure, DOM-free filter predicate over an already-fetched TraceabilityRow — no `document`,
// `window`, or React import, so vitest can exercise it directly with no jsdom. Mirrors the seam
// roadmap-deep-link.ts already establishes for extracted web logic testable in isolation from its
// consuming page component (03-04-PLAN.md Task 3).
import {
  parseRequirementState,
  requirementStateOf,
  type RequirementState,
  type TraceabilityRow,
  type TraceabilityViewModel,
} from '../../presentation/traceability.ts';

export type TraceabilityStatusFilter = 'all' | 'uncovered' | 'disagreement';

export interface TraceabilityFilterState {
  query: string;
  status: TraceabilityStatusFilter;
  /** NS4-04/D-03: off by default. Off means the deferred tiers render every row they hold,
   * untouched by query/status; on means the same query/status rules apply to them too. A
   * separate axis from `status` — it governs *whether* the filter reaches the deferred tiers at
   * all, not *how* it filters them. */
  includeHistory: boolean;
  /** D-05: which requirement state the page is narrowed to. `complete` and `pending` keep the
   * active-tier rows whose own checkbox says so; `validated` and `out-of-scope` hold no active-tier
   * row at all (they show the previous milestones and the Out of Scope list). */
  state: RequirementState | 'all';
  /** The milestone a seeded `validated` view is narrowed to; null means every previous milestone. */
  milestone: string | null;
}

export const DEFAULT_TRACEABILITY_FILTER: TraceabilityFilterState = {
  query: '',
  status: 'all',
  includeHistory: false,
  state: 'all',
  milestone: null,
};

/** D-14: narrows by requirement ID or requirement text (case-insensitive), then isolates the two
 * highest-value slices — uncovered rows and rows whose two status signals disagree. Local
 * component state only — never a refetch, never URL state (see traceability-page's own filter
 * controls). Never mutates the row it is given; both status values stay exactly as the projection
 * produced them. */
export function matchesTraceabilityFilter(
  row: TraceabilityRow,
  filter: TraceabilityFilterState,
): boolean {
  const query = filter.query.trim().toLowerCase();
  const matchesQuery =
    query.length === 0 ||
    row.id.toLowerCase().includes(query) ||
    row.text.toLowerCase().includes(query);
  if (!matchesQuery) return false;
  if (filter.status === 'uncovered' && !row.uncovered) return false;
  if (filter.status === 'disagreement' && !row.statusDisagreement) return false;
  if (filter.state === 'all') return true;
  // The state axis reads the requirement's own checkbox through the same predicate the project
  // page's counts use, so a count and the rows it opens can never disagree.
  return requirementStateOf(row) === filter.state;
}

/** D-05: the filter a page opens on, read once from the address (`?state=` and `?milestone=`).
 * A value outside the fixed state list, or a milestone the project does not have, is ignored and
 * the page opens unfiltered. `complete` and `pending` describe the active tier, so a milestone other
 * than the current one cannot narrow them; `out-of-scope` takes no milestone. Pure, never throws,
 * and nothing from the address is rendered or written back (T-09-03). */
export function seedTraceabilityFilter(
  search: string,
  view: Pick<TraceabilityViewModel, 'currentMilestone' | 'archivedMilestones'>,
): TraceabilityFilterState {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return DEFAULT_TRACEABILITY_FILTER;
  }
  const state = parseRequirementState(params.get('state'));
  if (state === null) return DEFAULT_TRACEABILITY_FILTER;

  const requested = params.get('milestone');
  const known =
    requested !== null &&
    (requested === view.currentMilestone ||
      view.archivedMilestones.some((archive) => archive.version === requested));
  const milestone = known ? requested : null;

  if (state === 'out-of-scope') return { ...DEFAULT_TRACEABILITY_FILTER, state };
  if (state === 'validated') return { ...DEFAULT_TRACEABILITY_FILTER, state, milestone };
  // complete / pending: a milestone that was named but rejected, or that is not the current one,
  // means the address describes something this page cannot show, so it opens unfiltered.
  if (requested !== null && (milestone === null || milestone !== view.currentMilestone)) {
    return DEFAULT_TRACEABILITY_FILTER;
  }
  return { ...DEFAULT_TRACEABILITY_FILTER, state, milestone };
}

/** NS4-04/D-03: the deferred-tier gate. With `includeHistory` false a deferred row matches
 * unconditionally, regardless of query or status — the tiers stay unfiltered while the toggle is
 * off. With it true the row is subject to the exact same query/status rules an active row would
 * be, via a delegate call rather than a second, divergent matching rule. */
export function matchesDeferredTraceabilityFilter(
  row: TraceabilityRow,
  filter: TraceabilityFilterState,
): boolean {
  if (!filter.includeHistory) return true;
  return matchesTraceabilityFilter(row, filter);
}
