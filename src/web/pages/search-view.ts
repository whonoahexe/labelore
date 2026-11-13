// The search page's pure model (Phase 13, 13-06): what the address says, which of the page's states it is in,
// what the count line reads and how a result row's breadcrumb is laid out. No React, no fetching: the page is
// the thin shell around these rules, and the tests exercise them without a browser.
//
// The address is the page's state (D-10): `q`, then repeated `phase`, `type` and `req`. It is read through
// the same bounded parser the server uses (`parseFacetSelection`) and written through the one writer
// (`facetSearchParams`), so what a pasted link carries is exactly what the server filters by.
import { parseFacetSelection, paddedNumber } from '../../presentation/search-facets.ts';
import type { FacetSelection } from '../../presentation/search-facets.ts';
import type { SearchMilestoneSection, SearchOutsideGroup, SearchResultRow, SearchSectionGroup } from '../../presentation/search.ts';
import { humanizeKind } from '../views/kinds.ts';

/** The page's states, one per view the UI-SPEC's States table names. */
export type SearchPageState =
  | 'empty-query'
  | 'loading'
  | 'request-error'
  | 'first-start'
  | 'index-error'
  | 'no-match'
  | 'filtered-zero'
  | 'results';

/** The part of the /search answer the classification reads (a real `SearchApiResponse` satisfies it). */
export interface SearchStateData {
  status: 'building' | 'ready' | 'error';
  total: number;
  unfilteredTotal: number;
  refreshing: boolean;
}

/** The query and the filters an address carries. The query is trimmed; the selection is bounded and may still
 * name values the project does not have (the server drops those and answers with the selection that took effect). */
export function readSearchUrl(params: URLSearchParams | string): { query: string; selection: FacetSelection } {
  const read = typeof params === 'string' ? new URLSearchParams(params) : params;
  return {
    query: (read.get('q') ?? '').trim(),
    selection: parseFacetSelection((dimension) => read.getAll(dimension)),
  };
}

/**
 * Which state the page is in (FIND-09, D-11). An answer on screen decides: a refresh in flight keeps the page on
 * 'results', and a failed or pending refetch of a page that has an answer does not blank it. Only with nothing to
 * show does a pending request read 'loading' and a failed one 'request-error'. The index building for the first
 * time is 'first-start', never 'no-match': no-match needs a ready index that found nothing at all, and hits that
 * the filters hide are 'filtered-zero', never no-match either.
 */
export function classifySearchState(input: {
  query: string;
  isPending: boolean;
  isError: boolean;
  data: SearchStateData | undefined;
}): SearchPageState {
  if (input.query.length === 0) return 'empty-query';
  const data = input.data;
  if (data === undefined) return input.isError ? 'request-error' : 'loading';
  if (data.status === 'building') return 'first-start';
  if (data.status === 'error') return 'index-error';
  if (data.unfilteredTotal === 0) return 'no-match';
  if (data.total === 0) return 'filtered-zero';
  return 'results';
}

/**
 * The count line under the query field. No filter: "{n} results across {m} files". Any filter: "Showing {shown} of
 * {total} results" (UI-SPEC count rule 5). `activeTypes` is passed only when a pasted link carries several file
 * types, which presses no tab: the types are named after the count so the page says what it is filtering by.
 */
export function countLineOf(
  counts: { total: number; unfilteredTotal: number; fileCount: number },
  filtered: boolean,
  activeTypes: readonly string[] = [],
): string {
  const line = filtered
    ? `Showing ${counts.total} of ${counts.unfilteredTotal} ${counts.unfilteredTotal === 1 ? 'result' : 'results'}`
    : `${counts.total} ${counts.total === 1 ? 'result' : 'results'} across ${counts.fileCount} ${counts.fileCount === 1 ? 'file' : 'files'}`;
  return activeTypes.length > 0 ? `${line} · ${activeTypes.map(humanizeKind).join(', ')}` : line;
}

/**
 * A result row's breadcrumb, from the section it sits in (sketch 064 F). A milestone row: the milestone's version
 * (its name when it has none), then the phase as "{NN} {name}" or the group's own label for Milestone files and
 * Quick tasks, then the kind. A row outside any milestone has no group: the outside group's label, then the kind.
 */
export function crumbsOf(
  parent: Pick<SearchMilestoneSection, 'version' | 'label'> | Pick<SearchOutsideGroup, 'label'>,
  group: Pick<SearchSectionGroup, 'label' | 'phaseNumber'> | null,
  row: Pick<SearchResultRow, 'kind'>,
): string[] {
  const kind = humanizeKind(row.kind);
  if (group === null) return [parent.label, kind];
  const place = group.phaseNumber === null ? group.label : `${paddedNumber(group.phaseNumber)} ${group.label}`;
  const milestone = 'version' in parent && parent.version !== null ? parent.version : parent.label;
  return [milestone, place, kind];
}
