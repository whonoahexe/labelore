// Pure, DOM-free filter predicate over an already-fetched TraceabilityRow — no `document`,
// `window`, or React import, so vitest can exercise it directly with no jsdom. Mirrors the seam
// roadmap-deep-link.ts already establishes for extracted web logic testable in isolation from its
// consuming page component (03-04-PLAN.md Task 3).
import type { TraceabilityRow } from '../../presentation/traceability.ts';

export type TraceabilityStatusFilter = 'all' | 'uncovered' | 'disagreement';

export interface TraceabilityFilterState {
  query: string;
  status: TraceabilityStatusFilter;
}

export const DEFAULT_TRACEABILITY_FILTER: TraceabilityFilterState = { query: '', status: 'all' };

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
