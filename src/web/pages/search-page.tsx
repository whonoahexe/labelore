import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { ChevronRight, FileText, Loader, Search } from 'lucide-react';
import { Link, useProjectScope, useProjectSlug } from '../nav.tsx';
import { Button, buttonVariants } from '../components/ui/button.tsx';
import { apiFetch, projectUrl } from '../api.ts';
import { projectKey } from '../query-keys.ts';
import { EMPTY_SELECTION, facetSearchParams } from '../../presentation/search-facets.ts';
import type { FacetSelection } from '../../presentation/search-facets.ts';
import type {
  SearchHighlightRange,
  SearchMilestoneSection,
  SearchOutsideGroup,
  SearchResultRow,
  SearchSectionGroup,
  SearchSnippet,
} from '../../presentation/search.ts';
import type { SearchApiResponse } from '../../server/search-index.ts';
import { classifySearchState, countLineOf, crumbsOf, readSearchUrl } from './search-view.ts';

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
        if (!milestone.archived) {
          return (
            <section key={milestone.key} className="search-section" aria-labelledby={headingId}>
              <h2 className="search-milestone-label" id={headingId}>
                {milestone.label}
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
                aria-label={open ? `Hide ${milestone.label}` : `Show ${milestone.label}`}
                onClick={() => toggleMilestone(milestone.key)}
              >
                <ChevronRight aria-hidden="true" />
                <span>{milestone.label}</span>
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
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();

  const search = useQuery({
    queryKey: projectKey(slug, scope, 'search', 'page', query, selection),
    queryFn: ({ signal }) => fetchSearchResults(slug, scope, query, selection, signal),
    enabled: query.length > 0,
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

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setSearchParams(facetSearchParams(next, selection));
  }

  function clearFilters(): void {
    setSearchParams(facetSearchParams(query, EMPTY_SELECTION), { replace: true });
  }

  if (state === 'empty-query') {
    return (
      <main className="page-stack search-page">
        <p className="eyebrow">Search</p>
        <h1>Search</h1>
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
        <SearchQueryField query={query} onSubmit={onSubmit} />
        <p className="empty-note">
          Nothing in .planning/ contains that exact token or its prefix. Search does not correct
          typos or match approximately — check the spelling and try again.
        </p>
      </main>
    );
  }

  const view = answer;
  const filtered = selection.phase.length + selection.type.length + selection.req.length > 0;
  const hiddenNote = `${plural(view.unfilteredTotal, 'result', 'results')} for "${query}" are hidden by your filters.`;

  return (
    <main className="page-stack search-page">
      <p className="eyebrow">Search</p>
      <h1>Results for &quot;{query}&quot;</h1>
      <SearchQueryField query={query} onSubmit={onSubmit} />
      <div className="search-countline">
        <span>{countLineOf(view, filtered)}</span>
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
