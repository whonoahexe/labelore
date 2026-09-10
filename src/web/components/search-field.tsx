import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { isEditableTarget, isSearchShortcut, shortcutHintFor } from '../../presentation/shell-header.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { SearchApiResponse, SearchHit } from '../../server/search-index.ts';
import { buttonVariants } from './ui/button.tsx';

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

/** NAV-04 (quick-260911-243): the header search surface — an icon trigger with a ⌘K/Ctrl K hint
 * that opens a large centred @base-ui/react Dialog over a full-screen scrim, wrapping an inline
 * Combobox. Keeps every Phase-3 query behaviour (D-01 through D-04) unchanged. */
export function SearchDialog(): React.JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const highlightedRef = useRef<SearchHit | null>(null);

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

  const ready = search.data?.status === 'ready';
  const results = ready && search.data ? search.data.results : [];
  const total = ready && search.data ? search.data.total : 0;
  const hits = results.slice(0, DROPDOWN_LIMIT);
  const isIndexing = trimmed.length > 0 && search.data?.status === 'building';
  const isEmpty = trimmed.length > 0 && ready && total === 0;

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setQuery('');
      setDebounced('');
      highlightedRef.current = null;
    }
  }

  function commitToSearchPage(): void {
    const submitted = query.trim();
    if (submitted.length === 0) return;
    navigate(`${presentationRoutePatterns.search}?q=${encodeURIComponent(submitted)}`);
  }

  // Global ⌘K/Ctrl+K: registered in an effect, removed in its cleanup, so there is exactly one
  // subscription regardless of re-renders or StrictMode double-mount (T-243-02).
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent): void {
      if (event.repeat || event.defaultPrevented) return;
      if (!isSearchShortcut(event)) return;

      const target = event.target as (EventTarget & { tagName?: string }) | null;
      const targetElement = target instanceof HTMLElement ? target : null;
      const editable = isEditableTarget(
        targetElement
          ? { tagName: targetElement.tagName, isContentEditable: targetElement.isContentEditable }
          : null,
      );
      // A ⌘K/Ctrl+K typed inside some other editable field is left alone — unless that field is
      // the dialog's own input, in which case the shortcut still toggles the dialog closed.
      const insideOwnPopup = Boolean(targetElement && popupRef.current?.contains(targetElement));
      if (editable && !insideOwnPopup) return;

      event.preventDefault();
      handleOpenChange(!open);
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'search-trigger' })}
        aria-label="Search planning artifacts"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search aria-hidden="true" />
        <kbd className="search-trigger-kbd" aria-hidden="true">
          {shortcutHintFor(typeof navigator === 'undefined' ? '' : navigator.platform)}
        </kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="search-dialog-backdrop" />
        <Dialog.Viewport className="search-dialog-viewport">
          <Dialog.Popup ref={popupRef} className="search-dialog" initialFocus={inputRef}>
            <Dialog.Title className="sr-only">Search planning artifacts</Dialog.Title>
            <Combobox.Root
              inline
              open={open}
              onOpenChange={handleOpenChange}
              items={hits}
              filteredItems={hits}
              filter={null}
              onInputValueChange={(value) => setQuery(value)}
              onItemHighlighted={(hit) => {
                highlightedRef.current = (hit as SearchHit | undefined) ?? null;
              }}
            >
              <Combobox.InputGroup className="search-dialog-field">
                <Search aria-hidden="true" />
                <Combobox.Input
                  ref={inputRef}
                  placeholder="Search plans, phases, decisions…"
                  aria-label="Search planning artifacts"
                  className="search-dialog-input"
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    event.preventBaseUIHandler();
                    const highlighted = highlightedRef.current;
                    if (highlighted) {
                      handleOpenChange(false);
                      navigate(highlighted.url);
                      return;
                    }
                    commitToSearchPage();
                    handleOpenChange(false);
                  }}
                />
                <kbd className="search-dialog-esc-hint" aria-hidden="true">
                  Esc
                </kbd>
              </Combobox.InputGroup>
              <div className="search-dialog-results">
                {search.isError ? (
                  <div className="notice destructive search-dialog-notice" role="alert">
                    Search is unavailable.
                  </div>
                ) : isIndexing ? (
                  <div className="search-dialog-status" aria-live="polite">
                    <p>Indexing…</p>
                    <small>Results will appear automatically once the index finishes.</small>
                  </div>
                ) : isEmpty ? (
                  <Combobox.Empty className="search-dialog-empty">No matches</Combobox.Empty>
                ) : trimmed.length === 0 ? (
                  <div className="search-dialog-hint">
                    <p>Search plans, phases and decisions across the planning corpus.</p>
                    <ul className="search-dialog-legend">
                      <li>↑↓ move</li>
                      <li>Enter open</li>
                      <li>Esc close</li>
                    </ul>
                  </div>
                ) : (
                  <Combobox.List className="search-dialog-list">
                    {(hit: SearchHit) => (
                      <Combobox.Item
                        key={hit.path}
                        value={hit}
                        render={<Link to={hit.url} />}
                        className="search-dialog-item"
                        onClick={() => handleOpenChange(false)}
                      >
                        <span className="search-result-title">{hit.title}</span>
                        <span className="search-result-path">{hit.path}</span>
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                )}
                {total > 0 ? (
                  <Link
                    className="text-link search-dialog-footer"
                    to={`${presentationRoutePatterns.search}?q=${encodeURIComponent(trimmed)}`}
                    onClick={() => handleOpenChange(false)}
                  >
                    See all {total} {total === 1 ? 'result' : 'results'}
                  </Link>
                ) : null}
              </div>
            </Combobox.Root>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
