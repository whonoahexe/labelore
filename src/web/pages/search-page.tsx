import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import type { SetURLSearchParams } from 'react-router';
import { Menu } from '@base-ui/react/menu';
import { Check, ChevronDown, ChevronRight, FileText, Loader, Search } from 'lucide-react';
import { Link, useProjectScope, useProjectSlug } from '../nav.tsx';
import { Button, buttonVariants } from '../components/ui/button.tsx';
import { apiFetch, fetchPresentation, projectUrl } from '../api.ts';
import { projectKey } from '../query-keys.ts';
import { EMPTY_SELECTION, facetSearchParams } from '../../presentation/search-facets.ts';
import type { FacetDimension, FacetSelection, SearchFacet } from '../../presentation/search-facets.ts';
import type {
  SearchHighlightRange,
  SearchMilestoneSection,
  SearchOutsideGroup,
  SearchResultRow,
  SearchSectionGroup,
  SearchSnippet,
} from '../../presentation/search.ts';
import type { SearchApiResponse } from '../../server/search-index.ts';
import { humanizeKind } from '../views/kinds.ts';
import { PlanningTree, SearchModeSwitch } from '../components/planning-tree.tsx';
import { stripEmoji } from './strip-emoji.ts';
import {
  activeTypeTab,
  classifySearchState,
  countLineOf,
  crumbsOf,
  dropdownLabelOf,
  readSearchUrl,
  searchModeOf,
  toggleFacetValue,
  withSearchMode,
  withTypeTab,
} from './search-view.ts';
import type { SearchMode } from './search-view.ts';

function fetchSearchResults(
  slug: string,
  scope: string | null,
  query: string,
  selection: FacetSelection,
  signal: AbortSignal,
): Promise<SearchApiResponse> {
  return apiFetch<SearchApiResponse>(
    projectUrl(slug, `/search?${facetSearchParams(query, selection).toString()}`, scope),
    { signal },
  );
}

// D-08: progressive reveal per group, mirroring the dashboard attention panel's existing
// "Show N more" pattern - never pagination, never page state in the URL.
const GROUP_PAGE_SIZE = 5;

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** Splits a snippet's text at its already-merged, non-overlapping highlight ranges and returns
 * plain text nodes with only the matched slices wrapped in `<mark>` - corpus text never becomes
 * an HTML string, satisfying T-03-02-01 and T-13-20. */
function highlightedSnippetNodes(text: string, highlights: SearchHighlightRange[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  highlights.forEach((range, index) => {
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    nodes.push(<mark key={index}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function SnippetLink({ row, snippet }: { row: SearchResultRow; snippet: SearchSnippet }): React.JSX.Element {
  // 09 D-01: a snippet's heading lives in the file, not on the designed page a root document opens on,
  // so a snippet with an anchor leads into the source when the row has one.
  const to = snippet.anchor
    ? `${row.sourceUrl ?? row.url}#${encodeURIComponent(snippet.anchor)}`
    : row.url;
  return (
    <Link className="search-snippet" to={to}>
      {highlightedSnippetNodes(snippet.text, snippet.highlights)}
    </Link>
  );
}

// The quiet Source link: the same ghost xs look as the View/Source toggle (UI-SPEC section 2).
const sourceLinkClass = buttonVariants({ variant: 'ghost', size: 'xs' });

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Sketch 064 F's row: the breadcrumb (milestone, phase, kind), the title link, one snippet and a toggle for the
 * rest. The kind and the phase live in the breadcrumb, the full path in the title link's tooltip. */
function SearchRow({
  row,
  crumbs,
  phaseCrumb,
}: {
  row: SearchResultRow;
  crumbs: string[];
  phaseCrumb: boolean;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = row.snippets;
  const hasMore = rest.length > 0;

  return (
    <li className="search-row">
      <p className="search-crumb">
        {crumbs.map((crumb, index) => {
          const space = crumb.indexOf(' ');
          const emphasised = phaseCrumb && index === 1 && space > 0;
          return (
            <Fragment key={index}>
              {index > 0 ? <ChevronRight aria-hidden="true" /> : null}
              {emphasised ? (
                <span>
                  <b>{crumb.slice(0, space)}</b>
                  {crumb.slice(space)}
                </span>
              ) : (
                <span>{crumb}</span>
              )}
            </Fragment>
          );
        })}
      </p>
      <div className="search-row-head">
        <Link className="search-row-title" to={row.url} title={row.path}>
          {row.title}
        </Link>
        {row.warningTone ? (
          <span className="status-chip" data-tone={row.warningTone === 'unreadable' ? 'destructive' : 'warning'}>
            {row.warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
          </span>
        ) : null}
        {row.sourceUrl ? (
          <Link
            className={sourceLinkClass}
            to={row.sourceUrl}
            aria-label={`View source of ${fileNameOf(row.path)}`}
            title="View source"
          >
            <FileText aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {first ? (
        <div className="search-snippets">
          <SnippetLink row={row} snippet={first} />
          {expanded ? rest.map((snippet, index) => <SnippetLink key={index} row={row} snippet={snippet} />) : null}
        </div>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          className="search-snippet-toggle"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show fewer matches' : `+${rest.length} more ${rest.length === 1 ? 'match' : 'matches'}`}
        </button>
      ) : null}
    </li>
  );
}

/** One group's rows in one list, paged at the shipped size with "Showing n of m" and "Show more". */
function SearchRows({
  label,
  rows,
  crumbsOfRow,
  phaseCrumb,
}: {
  label: string;
  rows: SearchResultRow[];
  crumbsOfRow: (row: SearchResultRow) => string[];
  phaseCrumb: boolean;
}): React.JSX.Element {
  const [limit, setLimit] = useState(GROUP_PAGE_SIZE);
  const visibleRows = rows.slice(0, limit);
  return (
    <>
      <ul className="search-rows" aria-label={label}>
        {visibleRows.map((row) => (
          <SearchRow key={row.path} row={row} crumbs={crumbsOfRow(row)} phaseCrumb={phaseCrumb} />
        ))}
      </ul>
      {limit < rows.length ? (
        <div className="attention-more">
          <span>
            Showing {limit} of {rows.length}
          </span>
          <button type="button" onClick={() => setLimit((value) => value + GROUP_PAGE_SIZE)}>
            Show more
          </button>
        </div>
      ) : null}
    </>
  );
}

function MilestoneGroups({ milestone }: { milestone: SearchMilestoneSection }): React.JSX.Element {
  return (
    <>
      {milestone.groups.map((group: SearchSectionGroup) => (
        <SearchRows
          key={group.key}
          label={group.phaseNumber === null ? group.label : `${group.phaseNumber} ${group.label}`}
          rows={group.rows}
          crumbsOfRow={(row) => crumbsOf(milestone, group, row)}
          phaseCrumb={group.kind === 'phase'}
        />
      ))}
    </>
  );
}

/** Milestone, then phase (D-12, D-13): the live milestone opens on a label line, archived milestones follow as
 * fold buttons that say how many results they hold, and the groups outside any phase come after them. Which
 * archived milestones are open is this component's state, keyed by milestone, so a refresh keeps them open. */
function SearchSections({ view }: { view: SearchApiResponse }): React.JSX.Element {
  const [openMilestones, setOpenMilestones] = useState<ReadonlySet<string>>(new Set());
  const toggleMilestone = (key: string): void =>
    setOpenMilestones((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div className="search-sections">
      {view.sections.milestones.map((milestone) => {
        const headingId = `search-milestone-${milestone.key}`;
        // A milestone's name may lead with an emoji (the roadmap writes them); the page shows words only.
        const name = stripEmoji(milestone.label);
        if (!milestone.archived) {
          return (
            <section key={milestone.key} className="search-section" aria-labelledby={headingId}>
              <h2 className="search-milestone-label" id={headingId}>
                {name}
                <span className="search-milestone-count">{plural(milestone.count, 'result', 'results')}</span>
              </h2>
              <MilestoneGroups milestone={milestone} />
            </section>
          );
        }
        const open = openMilestones.has(milestone.key);
        return (
          <section key={milestone.key} className="search-section" aria-labelledby={headingId}>
            <h2 className="search-milestone-title" id={headingId}>
              <button
                type="button"
                className="search-milestone-fold"
                aria-expanded={open}
                aria-label={open ? `Hide ${name}` : `Show ${name}`}
                onClick={() => toggleMilestone(milestone.key)}
              >
                <ChevronRight aria-hidden="true" />
                <span>{name}</span>
                <span className="search-milestone-count">{plural(milestone.count, 'result', 'results')}</span>
              </button>
            </h2>
            {open ? <MilestoneGroups milestone={milestone} /> : null}
          </section>
        );
      })}
      {view.sections.outside.map((group: SearchOutsideGroup) => {
        const headingId = `search-outside-${group.key}`;
        return (
          <section key={group.key} className="search-section" aria-labelledby={headingId}>
            <h2 className="search-milestone-label" id={headingId}>
              {group.label}
              <span className="search-milestone-count">{plural(group.count, 'result', 'results')}</span>
            </h2>
            <SearchRows
              label={group.label}
              rows={group.rows}
              crumbsOfRow={(row) => crumbsOf(group, null, row)}
              phaseCrumb={false}
            />
          </section>
        );
      })}
    </div>
  );
}

/** The query field, bound to `q`. Submitting a new query pushes a history entry; the key remounts it when the
 * address changes under it (back, forward, a header search), so it always shows the query the page is for. */
function SearchQueryField({
  query,
  onSubmit,
}: {
  query: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}): React.JSX.Element {
  return (
    <form className="search-query" role="search" onSubmit={onSubmit} key={query}>
      <label>
        <Search aria-hidden="true" />
        <span className="sr-only">Search this project</span>
        <input
          className="search-query-input"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search this project…"
          autoComplete="off"
        />
      </label>
    </form>
  );
}

/** UI-SPEC count rule 8: every facet control's accessible name carries its count ("Plan, 10 results"). */
const countName = (label: string, count: number): string => `${label}, ${plural(count, 'result', 'results')}`;

/** A Phase or Requirement dropdown: a Base UI menu of checkbox items. Several values may be chosen (OR within the
 * facet) and the menu stays open while choosing. A value at zero stays listed, dashed, and a chosen value at zero
 * stays chosen so it can be cleared. Every choice replaces the history entry (D-10). */
function SearchFilterMenu({
  dimension,
  facet,
  query,
  selection,
  setSearchParams,
}: {
  dimension: Extract<FacetDimension, 'phase' | 'req'>;
  facet: SearchFacet;
  query: string;
  selection: FacetSelection;
  setSearchParams: SetURLSearchParams;
}): React.JSX.Element {
  const name = dimension === 'phase' ? 'Phase' : 'Requirement';
  const chosen = facet.values.some((value) => value.selected);
  return (
    <Menu.Root>
      <Menu.Trigger
        className={`${buttonVariants({ variant: 'outline', size: 'sm' })} search-filter-trigger`}
        data-on={chosen}
      >
        <span className="search-filter-trigger-label">{dropdownLabelOf(dimension, facet.values)}</span>
        <ChevronDown aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="search-filter-menu" align="start" sideOffset={4}>
          <Menu.Popup className="search-filter-popup" aria-label={name}>
            {facet.values.map((value) => (
              <Menu.CheckboxItem
                key={value.value}
                className="search-filter-option"
                checked={value.selected}
                closeOnClick={false}
                data-zero={value.count === 0}
                aria-label={countName(value.label, value.count)}
                onCheckedChange={() =>
                  setSearchParams(facetSearchParams(query, toggleFacetValue(selection, dimension, value.value)), {
                    replace: true,
                  })
                }
              >
                <span className="search-filter-box" aria-hidden="true">
                  <Menu.CheckboxItemIndicator>
                    <Check aria-hidden="true" />
                  </Menu.CheckboxItemIndicator>
                </span>
                <span className="search-filter-label">{value.label}</span>
                <span className="search-filter-count">{value.count}</span>
              </Menu.CheckboxItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** The filter row (FIND-06): file type as tabs (All or one type; sketch 064 F), then the Phase and Requirement
 * dropdowns and Clear filters. Counts are the server's disjunctive counts; the address is the state. */
function SearchFilters({
  facets,
  query,
  selection,
  filtered,
  setSearchParams,
}: {
  facets: NonNullable<SearchApiResponse['facets']>;
  query: string;
  selection: FacetSelection;
  filtered: boolean;
  setSearchParams: SetURLSearchParams;
}): React.JSX.Element {
  const pressed = activeTypeTab(selection);
  const pressTab = (kind: string | null): void =>
    setSearchParams(facetSearchParams(query, withTypeTab(selection, kind)), { replace: true });
  return (
    <>
      <div className="search-tabs" role="group" aria-label="File type">
        <button
          type="button"
          className="search-tab"
          aria-pressed={pressed === 'all'}
          data-zero={facets.type.allCount === 0}
          aria-label={countName('All', facets.type.allCount)}
          onClick={() => pressTab(null)}
        >
          All <span className="search-tab-count">{facets.type.allCount}</span>
        </button>
        {facets.type.values.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className="search-tab"
            aria-pressed={pressed === tab.value}
            data-zero={tab.count === 0}
            aria-label={countName(humanizeKind(tab.value), tab.count)}
            onClick={() => pressTab(tab.value)}
          >
            {humanizeKind(tab.value)} <span className="search-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="search-filters">
        <SearchFilterMenu dimension="phase" facet={facets.phase} query={query} selection={selection} setSearchParams={setSearchParams} />
        <SearchFilterMenu dimension="req" facet={facets.req} query={query} selection={selection} setSearchParams={setSearchParams} />
        {filtered ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSearchParams(facetSearchParams(query, EMPTY_SELECTION), { replace: true })}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </>
  );
}

/** The page in its File tree mode (quick-261115-k9z): the switch and the project's whole `.planning/` file tree, built
 * from the presentation payload the shell already caches. The query field, tabs and filters are not drawn. */
function SearchTreeMode({ onModeChange }: { onModeChange: (next: SearchMode) => void }): React.JSX.Element {
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();
  const presentation = useQuery({
    queryKey: projectKey(slug, scope, 'presentation'),
    queryFn: () => fetchPresentation(slug, scope),
  }).data;
  return (
    <main className="page-stack search-page">
      <p className="eyebrow">Search</p>
      <h1>Planning files</h1>
      <SearchModeSwitch mode="tree" onChange={onModeChange} />
      {presentation === undefined ? (
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
      ) : (
        <PlanningTree artifacts={presentation.artifacts} />
      )}
    </main>
  );
}

function SearchLoading(): React.JSX.Element {
  return (
    <main className="page-stack" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        Loading
      </span>
      <div className="roadmap-loading" aria-hidden="true" />
    </main>
  );
}

/** The /search route (D-03, D-10): the address is the page's state, so a refresh, a back step or a pasted link
 * reproduces the same query and filters. Hits are grouped by milestone, then phase (D-12), each row carrying a
 * snippet centred on its own highest-scoring match (D-08). It is honest while the index builds or refreshes
 * (D-11): the first start says Indexing…, a refresh keeps what is on screen, and neither says "no results". */
export function SearchPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { query, selection } = useMemo(() => readSearchUrl(searchParams), [searchParams]);
  const mode = searchModeOf(searchParams);
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();

  const search = useQuery({
    queryKey: projectKey(slug, scope, 'search', 'page', query, selection),
    queryFn: ({ signal }) => fetchSearchResults(slug, scope, query, selection, signal),
    enabled: mode === 'search' && query.length > 0,
    // D-11: while the index builds, or a refresh is running, poll until it resolves.
    refetchInterval: (latest) =>
      latest.state.data?.status === 'building' || latest.state.data?.refreshing === true ? 500 : false,
  });

  // A filter change must not flash a skeleton. TanStack Query's previous-data option is never used in this app
  // (query-keys.test.ts: it can show one project's data under another's address), so the page keeps the last
  // answer itself, tagged with the project, scope and query it came from and shown only to that same page.
  const owner = `${slug}|${scope ?? ''}`;
  const [lastAnswer, setLastAnswer] = useState<{ owner: string; query: string; data: SearchApiResponse } | null>(null);
  if (search.data !== undefined && search.data !== lastAnswer?.data) setLastAnswer({ owner, query, data: search.data });
  const answer =
    search.data ?? (lastAnswer !== null && lastAnswer.owner === owner && lastAnswer.query === query ? lastAnswer.data : undefined);

  // D-11: "Index updated" is said once when a new index arrives. Tracked during render (the documented pattern
  // for state derived from a changing value), not in an effect.
  const builtAt = answer?.builtAt ?? null;
  const [track, setTrack] = useState<{ builtAt: string | null; updated: boolean }>({ builtAt: null, updated: false });
  if (builtAt !== null && builtAt !== track.builtAt) setTrack({ builtAt, updated: track.builtAt !== null });

  const state = classifySearchState({ query, isPending: search.isPending, isError: search.isError, data: answer });

  // The filters that took effect (T-13-07): once this address's own answer is in, the page shows and writes back
  // the server's selection, so a stale or edited link (a renamed phase, ?type=bogus) neither claims a filter that
  // filtered nothing nor gets its unknown value written back by the next tab press. Until that answer arrives the
  // address's own selection stands, so a tab press shows at once.
  const applied: FacetSelection = search.data !== undefined && search.data.status === 'ready' ? search.data.selection : selection;

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setSearchParams(facetSearchParams(next, applied));
  }

  function clearFilters(): void {
    setSearchParams(facetSearchParams(query, EMPTY_SELECTION), { replace: true });
  }

  function switchMode(next: SearchMode): void {
    setSearchParams(withSearchMode(searchParams, next));
  }

  if (mode === 'tree') return <SearchTreeMode onModeChange={switchMode} />;

  if (state === 'empty-query') {
    return (
      <main className="page-stack search-page">
        <p className="eyebrow">Search</p>
        <h1>Search</h1>
        <SearchModeSwitch mode="search" onChange={switchMode} />
        <SearchQueryField query={query} onSubmit={onSubmit} />
        <p className="empty-note">Search plans, phases, decisions and every other planning file in this project.</p>
      </main>
    );
  }

  if (state === 'request-error') {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>Search could not be loaded.</h1>
        <SearchModeSwitch mode="search" onChange={switchMode} />
        <section className="notice destructive" role="alert">
          <h2>Request failed</h2>
          <p>{search.error?.message}</p>
        </section>
      </main>
    );
  }

  if (state === 'loading' || answer === undefined) return <SearchLoading />;

  if (state === 'first-start') {
    return (
      <main className="page-stack search-page" aria-busy="true">
        <p className="eyebrow">Search</p>
        <h1>Indexing…</h1>
        <span className="status-chip" data-tone="quiet" role="status">
          <Loader aria-hidden="true" />
          Indexing
        </span>
        <SearchModeSwitch mode="search" onChange={switchMode} />
        <SearchQueryField query={query} onSubmit={onSubmit} />
        <p className="empty-note">Results will appear automatically once the index finishes.</p>
      </main>
    );
  }

  if (state === 'index-error') {
    return (
      <main className="page-stack search-page">
        <p className="eyebrow">Search</p>
        <h1>Search</h1>
        <SearchModeSwitch mode="search" onChange={switchMode} />
        <SearchQueryField query={query} onSubmit={onSubmit} />
        <section className="notice destructive" role="alert">
          <h2>Search is unavailable.</h2>
          <p>The index could not be built. Check that the project&apos;s .planning folder can be read, then try again.</p>
          <Button type="button" variant="outline" onClick={() => void search.refetch()}>
            Try again
          </Button>
        </section>
      </main>
    );
  }

  if (state === 'no-match') {
    return (
      <main className="page-stack search-page">
        <p className="eyebrow">Search</p>
        <h1>No matches for &quot;{query}&quot;.</h1>
        <SearchModeSwitch mode="search" onChange={switchMode} />
        <SearchQueryField query={query} onSubmit={onSubmit} />
        <p className="empty-note">
          Nothing in .planning/ contains that exact token or its prefix. Search does not correct
          typos or match approximately — check the spelling and try again.
        </p>
      </main>
    );
  }

  const view = answer;
  const filtered = applied.phase.length + applied.type.length + applied.req.length > 0;
  // A pasted link with several file types presses no tab, so the count line names the types it filters by.
  const activeTypes = activeTypeTab(applied) === null ? applied.type : [];
  const hiddenNote = `${plural(view.unfilteredTotal, 'result', 'results')} for "${query}" are hidden by your filters.`;

  return (
    <main className="page-stack search-page">
      <p className="eyebrow">Search</p>
      <h1>Results for &quot;{query}&quot;</h1>
      <SearchModeSwitch mode="search" onChange={switchMode} />
      <SearchQueryField query={query} onSubmit={onSubmit} />
      {view.facets === null ? null : (
        <SearchFilters facets={view.facets} query={query} selection={applied} filtered={filtered} setSearchParams={setSearchParams} />
      )}
      <div className="search-countline">
        <span>{countLineOf(view, filtered, activeTypes)}</span>
        {view.refreshing ? (
          <span className="status-chip" data-tone="quiet" role="status">
            <Loader aria-hidden="true" />
            Updating index…
          </span>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {track.updated ? 'Index updated' : ''}
      </p>
      {state === 'filtered-zero' ? (
        <section className="notice">
          <h2>No results match these filters.</h2>
          <p>{hiddenNote}</p>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </section>
      ) : (
        <SearchSections key={query} view={view} />
      )}
    </main>
  );
}
