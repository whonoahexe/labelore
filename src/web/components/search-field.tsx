import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@base-ui/react/combobox';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { SearchApiResponse, SearchHit } from '../../server/search-index.ts';

// D-02: the debounce band the UI contract specifies (120-200ms), landed at the midpoint.
const DEBOUNCE_MS = 160;
// D-01: the dropdown is a compact preview, not the full results list — /search carries the rest.
const DROPDOWN_LIMIT = 8;

async function fetchSearch(query: string, signal: AbortSignal): Promise<SearchApiResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Search request failed (${response.status})`);
  return (await response.json()) as SearchApiResponse;
}

/** Header search field (D-01): a debounced, abort-guarded Combobox whose input is never disabled
 * — even while the index is building (D-04) — with a compact dropdown of ranked rows. */
export function SearchField(): React.JSX.Element {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const trimmed = debounced.trim();
  // D-02: the stale-response guard is TanStack Query's own AbortSignal, keyed on the debounced
  // query — never a hand-rolled request counter. An in-flight response for an earlier query is
  // aborted (or its result discarded) the instant a newer query supersedes it.
  const search = useQuery({
    queryKey: ['search', 'dropdown', trimmed],
    queryFn: ({ signal }) => fetchSearch(trimmed, signal),
    enabled: trimmed.length > 0,
    // D-04: while the index is building, poll until it resolves so a query typed mid-build
    // resolves itself automatically — never a dropped query.
    refetchInterval: (latest) => (latest.state.data?.status === 'building' ? 500 : false),
  });

  const open = query.trim().length > 0;
  const ready = search.data?.status === 'ready';
  const results = ready && search.data ? search.data.results : [];
  const total = ready && search.data ? search.data.total : 0;
  const hits = results.slice(0, DROPDOWN_LIMIT);
  const isIndexing = trimmed.length > 0 && search.data?.status === 'building';
  const isEmpty = trimmed.length > 0 && ready && total === 0;

  function commitToSearchPage(): void {
    const submitted = query.trim();
    if (submitted.length === 0) return;
    navigate(`${presentationRoutePatterns.search}?q=${encodeURIComponent(submitted)}`);
  }

  return (
    <Combobox.Root
      items={hits}
      filteredItems={hits}
      filter={null}
      open={open}
      onInputValueChange={(value) => setQuery(value)}
    >
      <Combobox.InputGroup className="search-field">
        <Search aria-hidden="true" className="search-field-icon" />
        <Combobox.Input
          placeholder="Search"
          aria-label="Search planning artifacts"
          className="search-field-input"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            commitToSearchPage();
          }}
        />
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner
          className="search-dropdown-positioner"
          sideOffset={8}
          align="start"
          positionMethod="fixed"
        >
          <Combobox.Popup className="search-dropdown">
            {search.isError ? (
              <div className="notice destructive search-dropdown-notice" role="alert">
                Search is unavailable.
              </div>
            ) : isIndexing ? (
              <div className="search-dropdown-status" aria-live="polite">
                <p>Indexing…</p>
                <small>Results will appear automatically once the index finishes.</small>
              </div>
            ) : isEmpty ? (
              <Combobox.Empty className="search-dropdown-empty">No matches</Combobox.Empty>
            ) : (
              <Combobox.List className="search-dropdown-list">
                {(hit: SearchHit) => (
                  <Combobox.Item
                    key={hit.path}
                    value={hit}
                    render={<Link to={hit.url} />}
                    className="search-dropdown-item"
                  >
                    <span className="search-result-title">{hit.title}</span>
                    <span className="search-result-path">{hit.path}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            )}
            {total > 0 ? (
              <Link
                className="text-link search-dropdown-footer"
                to={`${presentationRoutePatterns.search}?q=${encodeURIComponent(trimmed)}`}
              >
                See all {total} {total === 1 ? 'result' : 'results'}
              </Link>
            ) : null}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
