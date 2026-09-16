import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import type {
  SearchHighlightRange,
  SearchResultGroup,
  SearchResultRow,
  SearchSnippet,
} from '../../presentation/search.ts';
import type { SearchApiResponse } from '../../server/search-index.ts';

async function fetchSearchResults(query: string, signal: AbortSignal): Promise<SearchApiResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Search request failed (${response.status})`);
  return (await response.json()) as SearchApiResponse;
}

// D-08: progressive reveal per group, mirroring the dashboard attention panel's existing
// "Show N more" pattern — never pagination, never page state in the URL.
const GROUP_PAGE_SIZE = 5;

/** Splits a snippet's text at its already-merged, non-overlapping highlight ranges and returns
 * plain text nodes with only the matched slices wrapped in `<mark>` — corpus text never becomes
 * an HTML string, satisfying T-03-02-01. */
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
  const to = snippet.anchor ? `${row.url}#${encodeURIComponent(snippet.anchor)}` : row.url;
  return (
    <Link className="search-snippet" to={to}>
      {highlightedSnippetNodes(snippet.text, snippet.highlights)}
    </Link>
  );
}

function SearchRow({ row }: { row: SearchResultRow }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = row.snippets;
  const hasMore = rest.length > 0;

  return (
    <li>
      <article className="search-result-card">
        <header className="search-result-card-header">
          <Link className="search-result-card-title" to={row.url}>
            {row.title}
          </Link>
          {row.matchCount > 0 ? (
            <span className="status-chip">
              {row.matchCount} {row.matchCount === 1 ? 'match' : 'matches'}
            </span>
          ) : null}
          {row.warningTone ? (
            <span className="status-chip" data-tone={row.warningTone === 'unreadable' ? 'destructive' : 'warning'}>
              {row.warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
            </span>
          ) : null}
        </header>
        <span className="search-result-path">{row.path}</span>
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
      </article>
    </li>
  );
}

// WR-03: both keys fold in the query. `row.path` and `group.key` are query-independent, so a
// group or file matching two different searches was reconciled as the same component instance and
// carried its `expanded`/`limit` state into unrelated results. Keying by query remounts instead.
function SearchGroupSection({
  group,
  query,
}: {
  group: SearchResultGroup;
  query: string;
}): React.JSX.Element {
  const [limit, setLimit] = useState(GROUP_PAGE_SIZE);
  const visibleRows = group.rows.slice(0, limit);

  return (
    <section className="search-group" aria-labelledby={`search-group-${group.key}`}>
      <h2 className="search-group-label" id={`search-group-${group.key}`}>
        {group.label}
      </h2>
      <ul className="search-group-rows">
        {visibleRows.map((row) => (
          <SearchRow key={`${query}:${row.path}`} row={row} />
        ))}
      </ul>
      {limit < group.rows.length ? (
        <div className="attention-more">
          <span>
            Showing {limit} of {group.rows.length}
          </span>
          <button type="button" onClick={() => setLimit((value) => value + GROUP_PAGE_SIZE)}>
            Show more
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** The /search route (D-03): reads its query from ?q= so a refresh or a bookmarked link reproduces
 * the same results. Results render grouped by location then artifact type (D-07), each row carrying
 * a snippet centred on its own highest-scoring match (D-08). */
export function SearchPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const search = useQuery({
    queryKey: ['search', 'page', query],
    queryFn: ({ signal }) => fetchSearchResults(query, signal),
    enabled: query.length > 0,
    refetchInterval: (latest) => (latest.state.data?.status === 'building' ? 500 : false),
  });

  if (query.length === 0) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Findability</p>
        <h1>Search</h1>
        <p className="empty-note">Type a query in the header field to search .planning/.</p>
      </main>
    );
  }

  if (search.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="roadmap-loading" aria-hidden="true" />
      </main>
    );
  }

  if (search.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>Search could not be loaded.</h1>
        <section className="notice destructive" role="alert">
          <h2>Request failed</h2>
          <p>{search.error.message}</p>
        </section>
      </main>
    );
  }

  const view = search.data;
  if (view.status !== 'ready') {
    return (
      <main className="page-stack" aria-busy="true">
        <p className="eyebrow">Findability</p>
        <h1>Indexing…</h1>
        <p className="empty-note">Results will appear automatically once the index finishes.</p>
      </main>
    );
  }

  if (view.total === 0) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Findability</p>
        <h1>No matches for &quot;{query}&quot;.</h1>
        <p className="empty-note">
          Nothing in .planning/ contains that exact token or its prefix. Search does not correct
          typos or match approximately — check the spelling and try again.
        </p>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <header className="page-intro">
        <div>
          <p className="eyebrow">Findability</p>
          <h1>Results for &quot;{query}&quot;</h1>
          <p className="lede">
            {view.total} {view.total === 1 ? 'result' : 'results'} across {view.fileCount}{' '}
            {view.fileCount === 1 ? 'file' : 'files'}
          </p>
        </div>
      </header>
      <div className="search-groups">
        {view.groups.map((group) => (
          <SearchGroupSection key={`${query}:${group.key}`} group={group} query={query} />
        ))}
      </div>
    </main>
  );
}
