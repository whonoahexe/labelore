// Phase 13, 13-06: the search page as a source-text contract (no browser here; the browser half is
// test/helpers/shoot-pages.ts). Web-layer files are read as raw text and never imported, in the style of
// test/web/shell-contract.test.ts, so tsconfig.server.json need not compile JSX.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** The file with block and line comments blanked, so the checks bind to code and not to prose about it. */
function code(path: string): string {
  return source(path)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + ' '.repeat(m.length - lead.length));
}

const PAGE = 'src/web/pages/search-page.tsx';

describe('search page: data and address (D-10)', () => {
  it('writes its request and its address through the shared facet writer, never by hand', () => {
    const page = code(PAGE);
    expect(page).toContain('facetSearchParams(');
    expect(page).toContain('readSearchUrl(');
    expect(page).not.toMatch(/q=\$\{encodeURIComponent/);
  });

  it('keeps the last answer itself, tagged by project and scope, never through the previous-data option', () => {
    const page = code(PAGE);
    expect(page).not.toMatch(/placeholderData|keepPreviousData/);
    expect(page).toContain('lastAnswer');
    expect(page).toContain('owner');
  });

  it('polls every 500 ms while the index builds or a refresh is running', () => {
    const page = code(PAGE);
    expect(page).toMatch(/refetchInterval/);
    expect(page).toMatch(/status === 'building'/);
    expect(page).toMatch(/refreshing === true/);
    expect(page).toMatch(/\? 500 : false/);
  });

  it('submitting a query pushes a history entry: the query form does not pass replace', () => {
    const page = code(PAGE);
    const submit = /function onSubmit[\s\S]*?\n {2}\}\n/.exec(page)?.[0] ?? '';
    expect(submit).toContain('setSearchParams(');
    expect(submit).not.toContain('replace');
  });
});

describe('search page: states (FIND-09, D-11)', () => {
  it('classifies the state once and renders from it', () => {
    expect(code(PAGE)).toContain('classifySearchState(');
  });

  it('declares SearchLoading directly above SearchPage so the loading contract slices only the pending branch', () => {
    const page = code(PAGE);
    const loading = page.indexOf('function SearchLoading()');
    const pageFn = page.indexOf('export function SearchPage()');
    expect(loading).toBeGreaterThan(-1);
    expect(pageFn).toBeGreaterThan(loading);
    expect(page.slice(loading, pageFn)).toContain('roadmap-loading');
  });
});

describe('search page: results (FIND-07, FIND-08, D-12, D-13)', () => {
  it('retires the location grouping: nothing on the page reads groups, the old cards or the old classes', () => {
    const page = code(PAGE);
    const retiredType = ['Search', 'ResultGroup'].join('');
    expect(page).not.toContain(retiredType);
    expect(page).not.toMatch(/view\.groups|search-result-card|search-groups|search-group-rows/);
  });
});

describe('search page: corpus text is never HTML (T-13-20)', () => {
  it('renders snippets as highlight ranges: text nodes and mark elements', () => {
    const page = code(PAGE);
    expect(page).toContain('highlightedSnippetNodes(');
    expect(page).toContain('<mark');
  });

  it('links every row and snippet through the project-aware Link', () => {
    expect(code(PAGE)).toMatch(/import \{[^}]*\bLink\b[^}]*\} from '\.\.\/nav\.tsx'/);
  });
});

describe('search page: filters and counts (FIND-06, D-09, D-10)', () => {
  it('a filter change replaces the history entry, in the tabs, the options and Clear filters', () => {
    const page = code(PAGE);
    expect((page.match(/replace: true/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('names the active types beside the count line when a pasted link carries several', () => {
    expect(code(PAGE)).toMatch(/countLineOf\([^)]*activeTypeTab|activeTypes/);
  });

  it('shows the filter row only for results and filtered-zero, never while indexing for the first time', () => {
    const page = code(PAGE);
    const firstStart = page.slice(page.indexOf("state === 'first-start'"), page.indexOf("state === 'index-error'"));
    expect(firstStart).not.toContain('SearchFilters');
    expect(page).toContain('<SearchFilters');
  });

  it("drives the filters from the selection the server applied, not the address's (WR-03, T-13-07)", () => {
    const page = code(PAGE);
    expect(page).toContain(
      "const applied: FacetSelection = search.data !== undefined && search.data.status === 'ready' ? search.data.selection : selection;",
    );
    expect(page).toContain('const filtered = applied.phase.length + applied.type.length + applied.req.length > 0;');
    expect(page).toContain('selection={applied}');
    expect(page).not.toContain('<SearchFilters facets={view.facets} query={query} selection={selection}');
  });
});

