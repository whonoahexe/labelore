// Phase 13, 13-06: the search page's rules as a pure model. What the address says, which state the page is in,
// what the count line reads and how a row's breadcrumb is laid out - no browser and no server involved.
import { describe, expect, it } from 'vitest';
import type {
  SearchMilestoneSection,
  SearchOutsideGroup,
  SearchResultRow,
  SearchSectionGroup,
} from '../../src/presentation/search.ts';
import {
  classifySearchState,
  countLineOf,
  crumbsOf,
  readSearchUrl,
} from '../../src/web/pages/search-view.ts';
import type { SearchStateData } from '../../src/web/pages/search-view.ts';

function data(overrides: Partial<SearchStateData> = {}): SearchStateData {
  return { status: 'ready', total: 4, unfilteredTotal: 4, refreshing: false, ...overrides };
}

function row(kind: string): Pick<SearchResultRow, 'kind'> {
  return { kind };
}

describe('readSearchUrl', () => {
  it('reads the query and the repeated phase, type and req values through the shared bounded parser', () => {
    const read = readSearchUrl('?q=watcher&type=plan&type=summary&phase=v1.1%2Fphase-5&req=find-06');
    expect(read.query).toBe('watcher');
    expect(read.selection).toEqual({ phase: ['v1.1/phase-5'], type: ['plan', 'summary'], req: ['FIND-06'] });
  });

  it('trims the query and reads an address with no filters as the empty selection', () => {
    const read = readSearchUrl(new URLSearchParams('q=%20%20session%20'));
    expect(read.query).toBe('session');
    expect(read.selection).toEqual({ phase: [], type: [], req: [] });
  });

  it('reads a missing query as the empty string and drops values the parser refuses', () => {
    const read = readSearchUrl(`?type=${'x'.repeat(200)}&phase=%00`);
    expect(read.query).toBe('');
    expect(read.selection).toEqual({ phase: [], type: [], req: [] });
  });
});

describe('classifySearchState', () => {
  const base = { query: 'watcher', isPending: false, isError: false };

  it('an empty query is the empty-query state, whatever else is true', () => {
    expect(classifySearchState({ ...base, query: '', isPending: true, isError: false, data: undefined })).toBe('empty-query');
    expect(classifySearchState({ ...base, query: '', data: data() })).toBe('empty-query');
  });

  it('a request still waiting with nothing to show is loading', () => {
    expect(classifySearchState({ ...base, isPending: true, data: undefined })).toBe('loading');
  });

  it('a failed request with nothing to show is a request error', () => {
    expect(classifySearchState({ ...base, isError: true, data: undefined })).toBe('request-error');
  });

  it('an index that is still building is the first start, never no-match', () => {
    expect(classifySearchState({ ...base, data: data({ status: 'building', total: 0, unfilteredTotal: 0 }) })).toBe('first-start');
  });

  it('an index that could not be built is an index error', () => {
    expect(classifySearchState({ ...base, data: data({ status: 'error', total: 0, unfilteredTotal: 0 }) })).toBe('index-error');
  });

  it('a ready index that found nothing at all is no-match', () => {
    expect(classifySearchState({ ...base, data: data({ total: 0, unfilteredTotal: 0 }) })).toBe('no-match');
  });

  it('filters hiding every hit is filtered-zero, never no-match', () => {
    expect(classifySearchState({ ...base, data: data({ total: 0, unfilteredTotal: 7 }) })).toBe('filtered-zero');
  });

  it('hits are results, and stay results while a refresh is running', () => {
    expect(classifySearchState({ ...base, data: data() })).toBe('results');
    expect(classifySearchState({ ...base, data: data({ refreshing: true }) })).toBe('results');
    expect(classifySearchState({ ...base, data: data({ refreshing: true, total: 0, unfilteredTotal: 3 }) })).toBe('filtered-zero');
  });

  it('data on screen wins over a pending or failed refetch of the same page', () => {
    expect(classifySearchState({ ...base, isPending: true, data: data() })).toBe('results');
    expect(classifySearchState({ ...base, isError: true, data: data() })).toBe('results');
  });
});

describe('countLineOf', () => {
  it('without a filter reads results across files, singular at one', () => {
    expect(countLineOf({ total: 38, unfilteredTotal: 38, fileCount: 31 }, false)).toBe('38 results across 31 files');
    expect(countLineOf({ total: 1, unfilteredTotal: 1, fileCount: 1 }, false)).toBe('1 result across 1 file');
  });

  it('with any filter reads Showing shown of total', () => {
    expect(countLineOf({ total: 4, unfilteredTotal: 38, fileCount: 4 }, true)).toBe('Showing 4 of 38 results');
    expect(countLineOf({ total: 0, unfilteredTotal: 38, fileCount: 0 }, true)).toBe('Showing 0 of 38 results');
  });

  it('names the active types after the count when several are active', () => {
    expect(countLineOf({ total: 9, unfilteredTotal: 38, fileCount: 9 }, true, ['plan', 'quick-task'])).toBe(
      'Showing 9 of 38 results · Plan, Quick Task',
    );
  });
});

describe('crumbsOf', () => {
  const live = { version: 'v1.1', label: 'v1.1 Live refresh' } as Pick<SearchMilestoneSection, 'version' | 'label'>;

  it('lays a phase row out as milestone version, padded phase number and name, then kind', () => {
    const group = { kind: 'phase', label: 'File Watcher and Live Refresh', phaseNumber: '5' } as SearchSectionGroup;
    expect(crumbsOf(live, group, row('plan'))).toEqual(['v1.1', '05 File Watcher and Live Refresh', 'Plan']);
  });

  it('pads the leading digits of a decimal phase number', () => {
    const group = { kind: 'phase', label: 'Hotfix', phaseNumber: '2.1' } as SearchSectionGroup;
    expect(crumbsOf(live, group, row('summary'))).toEqual(['v1.1', '02.1 Hotfix', 'Summary']);
  });

  it('lays a Milestone files or Quick tasks row out as version, that label, then kind', () => {
    const files = { kind: 'milestone-files', label: 'Milestone files', phaseNumber: null } as SearchSectionGroup;
    const quick = { kind: 'quick', label: 'Quick tasks', phaseNumber: null } as SearchSectionGroup;
    expect(crumbsOf(live, files, row('roadmap'))).toEqual(['v1.1', 'Milestone files', 'Roadmap']);
    expect(crumbsOf(live, quick, row('quick-task'))).toEqual(['v1.1', 'Quick tasks', 'Quick Task']);
  });

  it('falls back to the milestone name when it has no version', () => {
    const group = { kind: 'milestone-files', label: 'Milestone files', phaseNumber: null } as SearchSectionGroup;
    expect(crumbsOf({ version: null, label: 'First light' }, group, row('roadmap'))).toEqual([
      'First light',
      'Milestone files',
      'Roadmap',
    ]);
  });

  it('lays an outside row out as the group label then kind', () => {
    const project = { key: 'project', label: 'Project', count: 2, rows: [] } as SearchOutsideGroup;
    expect(crumbsOf(project, null, row('requirements'))).toEqual(['Project', 'Requirements']);
  });
});
