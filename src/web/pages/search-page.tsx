import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import type { SearchApiResponse } from '../../server/search-index.ts';

async function fetchSearchResults(query: string, signal: AbortSignal): Promise<SearchApiResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Search request failed (${response.status})`);
  return (await response.json()) as SearchApiResponse;
}

/** The /search route (D-03): reads its query from ?q= so a refresh or a bookmarked link reproduces
 * the same results. */
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
        <p className="eyebrow">Findability</p>
        <h1>Searching…</h1>
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
          <h1>
            Results for &quot;{query}&quot;
          </h1>
          <p className="lede">
            {view.total} {view.total === 1 ? 'result' : 'results'}
          </p>
        </div>
      </header>
      <ul className="search-result-list">
        {view.results.map((hit) => (
          <li key={hit.path}>
            <Link to={hit.url}>
              <strong>{hit.title}</strong>
              <span className="search-result-path">{hit.path}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
