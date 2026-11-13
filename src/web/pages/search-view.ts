// The search page's pure model (Phase 13, 13-06). Skeleton: the rules arrive with the page.
import { EMPTY_SELECTION } from '../../presentation/search-facets.ts';
import type { FacetSelection } from '../../presentation/search-facets.ts';
import type { SearchMilestoneSection, SearchOutsideGroup, SearchResultRow, SearchSectionGroup } from '../../presentation/search.ts';

export type SearchPageState =
  | 'empty-query'
  | 'loading'
  | 'request-error'
  | 'first-start'
  | 'index-error'
  | 'no-match'
  | 'filtered-zero'
  | 'results';

export interface SearchStateData {
  status: 'building' | 'ready' | 'error';
  total: number;
  unfilteredTotal: number;
  refreshing: boolean;
}

export function readSearchUrl(_params: URLSearchParams | string): { query: string; selection: FacetSelection } {
  return { query: '', selection: { ...EMPTY_SELECTION } };
}

export function classifySearchState(_input: {
  query: string;
  isPending: boolean;
  isError: boolean;
  data: SearchStateData | undefined;
}): SearchPageState {
  return 'empty-query';
}

export function countLineOf(
  _counts: { total: number; unfilteredTotal: number; fileCount: number },
  _filtered: boolean,
  _activeTypes: readonly string[] = [],
): string {
  return '';
}

export function crumbsOf(
  _parent: Pick<SearchMilestoneSection, 'version' | 'label'> | Pick<SearchOutsideGroup, 'label'>,
  _group: Pick<SearchSectionGroup, 'label' | 'phaseNumber'> | null,
  _row: Pick<SearchResultRow, 'kind'>,
): string[] {
  return [];
}
