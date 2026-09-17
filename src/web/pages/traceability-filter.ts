// Pure, DOM-free filter predicate over an already-fetched TraceabilityRow — no `document`,
// `window`, or React import, so vitest can exercise it directly with no jsdom. Mirrors the seam
// roadmap-deep-link.ts already establishes for extracted web logic testable in isolation from its
// consuming page component (03-04-PLAN.md Task 3).
import type { TraceabilityRow } from '../../presentation/traceability.ts';

export type TraceabilityStatusFilter = 'all' | 'uncovered' | 'disagreement';

export interface TraceabilityFilterState {
  query: string;
  status: TraceabilityStatusFilter;
  /** NS4-04/D-03: off by default. Off means the deferred tiers render every row they hold,
   * untouched by query/status; on means the same query/status rules apply to them too. A
   * separate axis from `status` — it governs *whether* the filter reaches the deferred tiers at
   * all, not *how* it filters them. */
  includeHistory: boolean;
}

export const DEFAULT_TRACEABILITY_FILTER: TraceabilityFilterState = {
  query: '',
  status: 'all',
  includeHistory: false,
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
  if (filter.status === 'uncovered') return row.uncovered;
  if (filter.status === 'disagreement') return row.statusDisagreement;
  return true;
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
