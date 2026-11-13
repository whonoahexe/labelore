// Phase 13, 13-06: the search page as a source-text contract (no browser here; the browser half is
// test/helpers/shoot-pages.ts). Web-layer files are read as raw text and never imported, in the style of
// test/web/degradation-ui-contract.test.ts, so tsconfig.server.json need not compile JSX.
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

  it("keys the query on the project, the scope, the query and the selection (T-13-21's other half)", () => {
    expect(code(PAGE)).toContain("projectKey(slug, scope, 'search', 'page', query, selection)");
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

  it('first start: aria-busy, the Indexing… heading, a quiet Loader chip and the automatic-results copy, no filters', () => {
    const page = source(PAGE);
    const branch = page.slice(page.indexOf("state === 'first-start'"));
    expect(branch).toContain('aria-busy="true"');
    expect(page).toContain('Indexing…');
    expect(page).toContain('Results will appear automatically once the index finishes.');
  });

  it('a refresh keeps the results, says Updating index… in the count line and announces Index updated politely', () => {
    const page = source(PAGE);
    expect(page).toContain('Updating index…');
    expect(page).toContain('Index updated');
    expect(page).toMatch(/role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
    expect(page).toContain('builtAt');
  });

  it('an index error is a destructive notice with role alert and a Try again button that refetches', () => {
    const page = source(PAGE);
    expect(page).toContain('Search is unavailable.');
    expect(page).toContain('notice destructive');
    expect(page).toContain('role="alert"');
    expect(page).toContain('Try again');
    expect(page).toContain('refetch');
  });

  it('keeps the shipped no-match, request-failure and empty-query copy', () => {
    const page = source(PAGE);
    expect(page).toContain('Nothing in .planning/ contains that exact token or its prefix.');
    expect(page).toContain('Search could not be loaded.');
    expect(page).toContain('Search plans, phases, decisions and every other planning file in this project.');
    expect(page).toContain('Search this project…');
  });

  it('says the filtered-to-zero words and never the no-match copy for hidden hits', () => {
    const page = source(PAGE);
    expect(page).toContain('No results match these filters.');
    expect(page).toContain('are hidden by your filters.');
  });
});

describe('search page: results (FIND-07, FIND-08, D-12, D-13)', () => {
  it('draws a milestone label line and a fold button for an archived milestone, with aria-expanded and Show/Hide', () => {
    const page = source(PAGE);
    expect(page).toContain('search-milestone-label');
    expect(page).toContain('search-milestone-fold');
    expect(page).toContain('aria-expanded');
    expect(page).toMatch(/`Hide \$\{[^}]+\}`|'Hide '/);
    expect(page).toMatch(/`Show \$\{[^}]+\}`|'Show '/);
  });

  it('pages a group at 5 with Showing n of m and Show more, and folds extra snippets behind a toggle', () => {
    const page = source(PAGE);
    expect(page).toContain('GROUP_PAGE_SIZE = 5');
    expect(page).toContain('Show more');
    expect(page).toContain('Show fewer matches');
    expect(page).toMatch(/more \$\{|more match/);
  });

  it('draws each row as a breadcrumb, a title link and one snippet, the full path in the title attribute', () => {
    const page = source(PAGE);
    expect(page).toContain('crumbsOf(');
    expect(page).toContain('search-crumb');
    expect(page).toContain('search-row-title');
    expect(page).toMatch(/title=\{row\.path\}/);
  });

  it('keeps the Warning/Unreadable chip and the Source link', () => {
    const page = source(PAGE);
    expect(page).toContain("warningTone === 'unreadable' ? 'Unreadable' : 'Warning'");
    expect(page).toContain("warningTone === 'unreadable' ? 'destructive' : 'warning'");
    expect(page).toContain('row.sourceUrl');
  });

  it('retires the location grouping: nothing on the page reads groups, the old cards or the old classes', () => {
    const page = code(PAGE);
    const retiredType = ['Search', 'ResultGroup'].join('');
    expect(page).not.toContain(retiredType);
    expect(page).not.toMatch(/view\.groups|search-result-card|search-groups|search-group-rows/);
  });
});

describe('search page: corpus text is never HTML (T-13-20)', () => {
  it('has no raw-HTML prop anywhere', () => {
    const page = source(PAGE);
    expect(page).not.toContain('dangerouslySetInnerHTML');
    expect(page).not.toContain('innerHTML');
  });

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
  it('file types are single-select tabs: buttons in a labelled group with aria-pressed and the count in the name', () => {
    const page = source(PAGE);
    expect(page).toContain('role="group"');
    expect(page).toContain('aria-label="File type"');
    expect(page).toContain('aria-pressed');
    expect(page).toContain('withTypeTab(');
    expect(page).toContain('activeTypeTab(');
    expect(page).toContain('facets.type.allCount');
    expect(page).toMatch(/aria-label=\{`\$\{[^}]+\}, \$\{plural\([^)]*\)\}`\}|\$\{[^}]+\}, \$\{[^}]*results/);
    expect(page).toContain('data-zero');
  });

  it('phase and requirement are Base UI menus of checkbox items that stay open while choosing', () => {
    const page = source(PAGE);
    expect(page).toContain("from '@base-ui/react/menu'");
    expect(page).toContain('Menu.CheckboxItem');
    expect(page).toContain('closeOnClick={false}');
    expect(page).toContain('toggleFacetValue(');
    expect(page).toContain('dropdownLabelOf(');
    expect(page).toContain('search-filter-option');
  });

  it('a filter change replaces the history entry, in the tabs, the options and Clear filters', () => {
    const page = code(PAGE);
    expect((page.match(/replace: true/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('Clear filters renders only while a filter is active and clears all three facets, keeping the query', () => {
    const page = source(PAGE);
    expect(page).toContain('Clear filters');
    expect(page).toContain('facetSearchParams(query, EMPTY_SELECTION)');
    expect(page).toMatch(/filtered \? \(|\{filtered && /);
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
