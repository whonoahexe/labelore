import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { Search } from 'lucide-react';
import { Link, useProjectLocation, useProjectNavigate, useProjectScope, useProjectSlug } from '../nav.tsx';
import { apiFetch, projectUrl } from '../api.ts';
import { projectKey } from '../query-keys.ts';
import { isEditableTarget, isSearchShortcut, shortcutHintFor } from '../../presentation/shell-header.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { JUMP_GROUP_LABELS } from '../../presentation/jump.ts';
import type { JumpRow } from '../../presentation/jump.ts';
import type { JumpApiResponse } from '../../server/search-index.ts';
import { buttonVariants } from './ui/button.tsx';

// D-02: the debounce band the UI contract specifies (120-200ms), landed at the midpoint.
const DEBOUNCE_MS = 160;

// D-03: the rows arrive from the server after the query is typed, so the highlight must follow the rows,
// not the keystroke. Base UI 1.7.0's ComboboxRoot types autoHighlight as a boolean, and `true` highlights
// on input change only (the highlight is dropped while the list is empty and never returns when the rows
// land). The engine it hands the prop to also takes 'always', which highlights the first row whenever rows
// appear; the type just does not admit it, hence the cast.
const AUTO_HIGHLIGHT = 'always' as unknown as boolean;

/** One labelled group of the palette's list, in the shape Base UI's grouped Combobox reads: `value` is the
 * group's label, `items` its rows. The server caps every group (JUMP_GROUP_CAPS), so the host slices nothing. */
interface PaletteGroup {
  value: string;
  items: JumpRow[];
}

function fetchJump(
  slug: string,
  scope: string | null,
  query: string,
  from: string,
  signal: AbortSignal,
): Promise<JumpApiResponse> {
  return apiFetch<JumpApiResponse>(
    projectUrl(slug, `/jump?q=${encodeURIComponent(query)}&from=${encodeURIComponent(from)}`, scope),
    { signal },
  );
}

/** Where a row opens: its address, plus the anchor of the item it names when it has one (D-05). */
function hrefOf(row: JumpRow): string {
  return row.anchor === null ? row.url : `${row.url}#${row.anchor}`;
}

/** The search page for a query: the address is built from the route patterns, never written out. */
function searchPageHref(trimmed: string): string {
  return `${presentationRoutePatterns.search}?q=${encodeURIComponent(trimmed)}`;
}

/** An ID row prints its ID, then its title. */
function titleOf(row: JumpRow): string {
  return row.id === null ? row.title : `${row.id} ${row.title}`;
}

/** NAV-04 (quick-260911-243), Phase 13: the quick-jump palette. The header trigger opens a large centred
 * @base-ui/react Dialog over a full-screen scrim, wrapping an inline grouped Combobox fed by /jump: an exact
 * decision or finding ID first (the current phase's copy highlighted, so Enter opens it), then the other
 * groups the server returns. Keeps the Phase-3 query behaviour: debounce, abort signal, polling while the
 * index builds. */
export function SearchDialog(): React.JSX.Element {
  const navigate = useProjectNavigate();
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();
  const { pathname } = useProjectLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const highlightedRef = useRef<JumpRow | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const trimmed = debounced.trim();
  // D-02: the stale-response guard is TanStack Query's own AbortSignal, keyed on the project's slug, the
  // debounced query and the page the palette was opened on (the server ranks the current phase first,
  // D-04) - never a hand-rolled request counter. An in-flight response for an earlier query is aborted
  // (or its result discarded) the instant a newer query supersedes it.
  const jump = useQuery({
    queryKey: projectKey(slug, scope, 'jump', trimmed, pathname),
    queryFn: ({ signal }) => fetchJump(slug, scope, trimmed, pathname, signal),
    enabled: trimmed.length > 0,
    // D-04: while the index is building, poll until it resolves so a query typed mid-build
    // resolves itself automatically — never a dropped query.
    refetchInterval: (latest) => (latest.state.data?.status === 'building' ? 500 : false),
  });

  const ready = jump.data?.status === 'ready';
  const groups: PaletteGroup[] =
    ready && jump.data
      ? jump.data.groups.map((group) => ({ value: JUMP_GROUP_LABELS[group.key], items: group.rows }))
      : [];
  const isIndexing = trimmed.length > 0 && jump.data?.status === 'building';
  const isEmpty = trimmed.length > 0 && ready && groups.length === 0;
  const notFoundId = ready && jump.data ? jump.data.notFoundId : null;

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
    navigate(searchPageHref(submitted));
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
        aria-label="Quick jump"
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
            <Dialog.Title className="sr-only">Quick jump</Dialog.Title>
            <Combobox.Root
              inline
              open={open}
              onOpenChange={handleOpenChange}
              items={groups}
              filteredItems={groups}
              filter={null}
              // D-03: the first row (the Exact row when there is one) is highlighted whenever the rows change.
              autoHighlight={AUTO_HIGHLIGHT}
              onInputValueChange={(value) => setQuery(value)}
              onItemHighlighted={(row) => {
                highlightedRef.current = (row as JumpRow | undefined) ?? null;
              }}
            >
              <Combobox.InputGroup className="search-dialog-field">
                <Search aria-hidden="true" />
                <Combobox.Input
                  ref={inputRef}
                  placeholder="Jump to a page, ID or project…"
                  aria-label="Quick jump"
                  className="search-dialog-input"
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    event.preventBaseUIHandler();
                    const highlighted = highlightedRef.current;
                    if (highlighted) {
                      handleOpenChange(false);
                      navigate(hrefOf(highlighted));
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
                {jump.isError ? (
                  <div className="notice destructive search-dialog-notice" role="alert">
                    Search is unavailable.
                  </div>
                ) : isIndexing ? (
                  <div className="search-dialog-status" aria-live="polite">
                    <p>Indexing…</p>
                    <small>Results will appear automatically once the index finishes.</small>
                  </div>
                ) : isEmpty ? (
                  <Combobox.Empty className="search-dialog-empty">
                    {notFoundId === null ? `Nothing matches "${trimmed}".` : `No ${notFoundId} in this project.`}
                  </Combobox.Empty>
                ) : trimmed.length === 0 ? (
                  <div className="search-dialog-hint">
                    <p>Jump to a page or an ID like D-12 or WR-03, or search the planning corpus.</p>
                    <ul className="search-dialog-legend">
                      <li>↑↓ move</li>
                      <li>Enter open</li>
                      <li>Esc close</li>
                    </ul>
                  </div>
                ) : (
                  <Combobox.List className="search-dialog-list">
                    {(group: PaletteGroup) => (
                      <Combobox.Group key={group.value} items={group.items} className="palette-group">
                        <Combobox.GroupLabel className="palette-group-label">{group.value}</Combobox.GroupLabel>
                        <Combobox.Collection>
                          {(row: JumpRow) => (
                            <Combobox.Item
                              key={row.key}
                              value={row}
                              render={<Link to={hrefOf(row)} />}
                              className="search-dialog-item"
                              onClick={() => handleOpenChange(false)}
                            >
                              <span className="search-result-title">{titleOf(row)}</span>
                              <span className="palette-row-chips">
                                {row.chips.map((chip) => (
                                  <span key={chip.label} className="status-chip" data-tone={chip.tone}>
                                    {chip.label}
                                  </span>
                                ))}
                              </span>
                              <span className="search-result-path">{row.subtitle}</span>
                            </Combobox.Item>
                          )}
                        </Combobox.Collection>
                      </Combobox.Group>
                    )}
                  </Combobox.List>
                )}
              </div>
            </Combobox.Root>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
