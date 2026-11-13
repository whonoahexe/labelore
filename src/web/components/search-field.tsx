import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { Check, Clock, FileText, Hash, Loader, PanelsTopLeft, Search, TextSearch } from 'lucide-react';
import {
  AppLink,
  Link,
  useAppNavigate,
  useProjectLocation,
  useProjectNavigate,
  useProjectScope,
  useProjectSlug,
} from '../nav.tsx';
import { apiFetch, fetchPresentation, fetchProjects, projectUrl } from '../api.ts';
import { projectKey, projectsKey } from '../query-keys.ts';
import { projectRootPath } from '../project-path.ts';
import { isEditableTarget, isSearchShortcut, shortcutHintFor } from '../../presentation/shell-header.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { SearchHighlightRange } from '../../presentation/search.ts';
import type { JumpApiResponse } from '../../server/search-index.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { humanizeKind } from '../views/kinds.ts';
import {
  buildPaletteModel,
  hrefOfRow,
  keyPagesOf,
  rowIconOf,
  titleForPath,
} from '../palette/palette-model.ts';
import type { KeyPage, PaletteGroup, PaletteNotice, PaletteRow } from '../palette/palette-model.ts';
import { browserStorage, readRecent, recentKey, recordRecent } from '../palette/recent-pages.ts';
import { ProjectPathIcon } from './project-row.tsx';
import { buttonVariants } from './ui/button.tsx';

// D-02: the debounce band the UI contract specifies (120-200ms), landed at the midpoint.
const DEBOUNCE_MS = 160;

// D-03: the rows arrive from the server after the query is typed, so the highlight must follow the rows,
// not the keystroke. Base UI 1.7.0's ComboboxRoot types autoHighlight as a boolean, and `true` highlights
// on input change only (the highlight is dropped while the list is empty and never returns when the rows
// land). The engine it hands the prop to also takes 'always', which highlights the first row whenever rows
// appear; the type just does not admit it, hence the cast.
const AUTO_HIGHLIGHT = 'always' as unknown as boolean;

/** What the list shows before the project's presentation has loaded: the one page that always exists. */
const FALLBACK_KEY_PAGES: readonly KeyPage[] = [
  { key: 'key-page:dashboard', title: 'Dashboard', path: presentationRoutePatterns.dashboard },
];

/** One labelled group of the palette's list, in the shape Base UI's grouped Combobox reads: `value` is the
 * group's key, `items` its rows. The label and notice ride along for the renderer. The server caps every group
 * (JUMP_GROUP_CAPS) and the model caps Projects, so the host slices nothing. */
interface ListGroup {
  value: string;
  label: string | null;
  notice: PaletteNotice | null;
  items: PaletteRow[];
}

function listGroupOf(group: PaletteGroup): ListGroup {
  return { value: group.key, label: group.label, notice: group.notice, items: group.rows };
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

/** The search page for a query: the address is built from the route patterns, never written out. */
function searchPageHref(trimmed: string): string {
  return `${presentationRoutePatterns.search}?q=${encodeURIComponent(trimmed)}`;
}

/** A text split at its highlight ranges into text nodes and `mark` nodes: corpus text never becomes an HTML
 * string (T-03-02-01, T-13-01). Ranges come from the server as plain offsets; anything out of order or out of
 * bounds is clamped away rather than trusted. */
function markedText(text: string, ranges: readonly SearchHighlightRange[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    const start = Math.max(range.start, cursor);
    const end = Math.min(range.end, text.length);
    if (end <= start) continue;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<mark key={start}>{text.slice(start, end)}</mark>);
    cursor = end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

const ROW_ICONS = {
  hash: Hash,
  page: PanelsTopLeft,
  file: FileText,
  content: TextSearch,
  recent: Clock,
  search: Search,
} as const;

/** What a row prints, whatever its kind: line 1 is the icon, the title (an ID first) and the chips; line 2 is
 * the path in mono. Every string stays a React text node. */
interface RowView {
  id: string | null;
  title: string;
  titleNodes: React.ReactNode;
  chips: React.ReactNode;
  path: string | null;
  pathNodes: React.ReactNode;
  snippet: React.ReactNode;
  note: React.ReactNode;
}

function Chip({ label, tone }: { label: string; tone: string }): React.JSX.Element {
  return (
    <span className="status-chip" data-tone={tone}>
      {label}
    </span>
  );
}

function viewOf(row: PaletteRow): RowView {
  switch (row.type) {
    case 'jump': {
      const jump = row.row;
      const kindLabel =
        (jump.kind === 'file' || jump.kind === 'content') && jump.artifactKind !== null
          ? humanizeKind(jump.artifactKind)
          : null;
      return {
        id: jump.id,
        title: jump.title,
        titleNodes: markedText(jump.title, jump.titleHighlights),
        chips: (
          <>
            {jump.chips.map((chip) => (
              <Chip key={chip.label} label={chip.label} tone={chip.tone} />
            ))}
            {kindLabel === null ? null : <Chip label={kindLabel} tone="quiet" />}
          </>
        ),
        path: jump.subtitle === '' ? null : jump.subtitle,
        pathNodes: markedText(jump.subtitle, jump.subtitleHighlights),
        snippet:
          jump.snippet === null ? null : (
            <span className="palette-row-snippet">{markedText(jump.snippet.text, jump.snippet.highlights)}</span>
          ),
        note: null,
      };
    }
    case 'project': {
      const { entry } = row;
      return {
        id: null,
        title: entry.name,
        titleNodes: entry.name,
        chips: (
          <>
            {row.current ? (
              <>
                <Check aria-hidden="true" />
                <span className="sr-only">Current</span>
              </>
            ) : null}
            {entry.state === 'loading' ? (
              <span className="status-chip" data-tone="quiet">
                <Loader aria-hidden="true" />
                Opening…
              </span>
            ) : null}
            {entry.state === 'unavailable' ? <Chip label="Unavailable" tone="missing" /> : null}
          </>
        ),
        path: entry.displayPath,
        pathNodes: entry.displayPath,
        snippet: null,
        note:
          entry.state === 'unavailable' && entry.reason ? <span className="source-note">{entry.reason}</span> : null,
      };
    }
    case 'recent':
    case 'key-page':
      return {
        id: null,
        title: row.title,
        titleNodes: row.title,
        chips: null,
        path: row.path,
        pathNodes: row.path,
        snippet: null,
        note: null,
      };
    case 'see-all':
      return {
        id: null,
        title: `See all results for "${row.query}"`,
        titleNodes: `See all results for "${row.query}"`,
        chips: (
          <kbd className="search-dialog-esc-hint" aria-hidden="true">
            ↵
          </kbd>
        ),
        path: null,
        pathNodes: null,
        snippet: null,
        note: null,
      };
  }
}

/** The inside of one palette row (UI-SPEC row anatomy). A plain component so a test can render it without the
 * dialog: the row element around it is the Combobox item, a link. */
export function PaletteRowBody({ row }: { row: PaletteRow }): React.JSX.Element {
  const icon = rowIconOf(row);
  const view = viewOf(row);
  return (
    <>
      {icon === 'project' && row.type === 'project' ? (
        <ProjectPathIcon kind={row.entry.kind} className="palette-row-icon" />
      ) : icon === 'project' ? null : (
        (() => {
          const Icon = ROW_ICONS[icon];
          return <Icon className="palette-row-icon" aria-hidden="true" />;
        })()
      )}
      <span className="palette-row-title" title={view.id === null ? view.title : `${view.id} ${view.title}`}>
        {view.id === null ? null : <span className="palette-row-id">{view.id}</span>}
        {view.titleNodes}
      </span>
      <span className="palette-row-chips">{view.chips}</span>
      {view.path === null ? null : (
        <span className="palette-row-path" title={view.path}>
          {/* The block is rtl so the ellipsis lands on the head; bdi keeps the path itself reading left to right. */}
          <bdi>{view.pathNodes}</bdi>
        </span>
      )}
      {view.snippet}
      {view.note}
    </>
  );
}

/** A quiet status line (or, for the one genuine failure, the shared destructive notice). */
function PaletteStatus({ notice, bare = false }: { notice: PaletteNotice; bare?: boolean }): React.JSX.Element {
  if (notice.role === 'alert') {
    return (
      <div className="notice destructive search-dialog-notice" role="alert">
        <p>{notice.heading}</p>
        {notice.body === null ? null : <p>{notice.body}</p>}
      </div>
    );
  }
  const working = notice.kind === 'indexing' || notice.kind === 'projects-loading';
  return (
    <div className="palette-status" role={bare ? undefined : 'status'}>
      {working ? (
        <span className="status-chip" data-tone="quiet">
          <Loader aria-hidden="true" />
          {notice.heading}
        </span>
      ) : (
        <p>{notice.heading}</p>
      )}
      {notice.body === null ? null : <small>{notice.body}</small>}
    </div>
  );
}

/** One row of the list: a real link, so middle-click and "copy link address" keep working. A project row is an
 * AppLink to that project's root; every other row is a project-scoped Link. */
function PaletteItem({
  row,
  onChoose,
}: {
  row: PaletteRow;
  onChoose(row: PaletteRow, event: React.MouseEvent): void;
}): React.JSX.Element {
  const href = hrefOfRow(row);
  return (
    <Combobox.Item
      value={row}
      render={row.type === 'project' ? <AppLink to={projectRootPath(row.entry.slug)} /> : <Link to={href} />}
      className="palette-row"
      data-current={row.type === 'project' && row.current ? 'true' : undefined}
      onClick={(event: React.MouseEvent) => onChoose(row, event)}
    >
      <PaletteRowBody row={row} />
    </Combobox.Item>
  );
}

interface PaletteBodyProps {
  slug: string;
  scope: string | null;
  pathname: string;
  presentation: ProjectPresentation | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Closes the palette (clearing everything: the body unmounts with the popup). */
  onClose(): void;
}

/** Everything inside the popup. It mounts when the palette opens and unmounts when it closes, so its queries are
 * observed - and the project list re-read (staleTime 0) - only while the palette is open (D-16), and a reopened
 * palette starts empty with its Recent list read afresh (D-02). */
function PaletteBody({
  slug,
  scope,
  pathname,
  presentation,
  inputRef,
  onClose,
}: PaletteBodyProps): React.JSX.Element {
  const navigate = useProjectNavigate();
  const appNavigate = useAppNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const highlightedRef = useRef<PaletteRow | null>(null);
  // Recent is read once per opening. The page you are on is where you already are, so it is left out.
  const [recent] = useState(() =>
    readRecent(browserStorage(), recentKey(slug, scope)).filter((entry) => entry.path !== pathname),
  );

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
    // D-04, D-11: while the index builds, or a refresh is running, poll until it resolves so a query typed
    // mid-build resolves itself automatically - never a dropped query.
    refetchInterval: (latest) =>
      latest.state.data?.status === 'building' || latest.state.data?.refreshing === true ? 500 : false,
  });
  // The last answer stays on screen while the next one is on its way. TanStack Query's previous-data option is
  // never used in this app (query-keys.test.ts: it can show one project's data under another's address), so the
  // palette keeps the last answer itself, in this mount's state, tagged with the project and scope it came from
  // and shown only to that same project and scope. The body unmounts when the palette closes.
  const owner = `${slug}|${scope ?? ''}`;
  const [lastAnswer, setLastAnswer] = useState<{ owner: string; data: JumpApiResponse } | null>(null);
  if (jump.data !== undefined && jump.data !== lastAnswer?.data) setLastAnswer({ owner, data: jump.data });
  const answer = jump.data ?? (lastAnswer?.owner === owner ? lastAnswer.data : undefined);
  const jumpState = trimmed.length === 0 ? 'idle' : jump.isError ? 'error' : jump.data === undefined ? 'pending' : 'ready';

  // D-16: the project list is read every time the palette opens; the body mounting with the popup is what makes
  // the query observed (and refetched, staleTime 0) only while the palette is open.
  const projects = useQuery({ queryKey: projectsKey, queryFn: fetchProjects, staleTime: 0 });
  const projectsState = projects.data ? 'ready' : projects.isPending ? 'pending' : 'error';

  const keyPages = useMemo(() => (presentation === undefined ? FALLBACK_KEY_PAGES : keyPagesOf(presentation)), [presentation]);
  const model = useMemo(
    () =>
      buildPaletteModel({
        query: trimmed,
        jump: { state: jumpState, data: answer },
        projects: { state: projectsState, entries: projects.data?.projects ?? [] },
        currentSlug: slug,
        recent,
        keyPages,
      }),
    [trimmed, jumpState, answer, projectsState, projects.data, slug, recent, keyPages],
  );
  const items = useMemo(() => model.groups.map(listGroupOf), [model.groups]);

  // D-11: "Index updated" is said once when a refresh lands while the palette is open. Tracked during render
  // (the documented pattern for state derived from a changing value), not in an effect.
  const builtAt = answer?.builtAt ?? null;
  const [track, setTrack] = useState<{ query: string; builtAt: string | null; updated: boolean }>({
    query: '',
    builtAt: null,
    updated: false,
  });
  if (track.query !== trimmed || (builtAt !== null && builtAt !== track.builtAt)) {
    setTrack({
      query: trimmed,
      builtAt: builtAt ?? track.builtAt,
      updated: builtAt !== null && track.builtAt !== null && builtAt !== track.builtAt,
    });
  }

  function commitToSearchPage(): void {
    const submitted = query.trim();
    if (submitted.length === 0) return;
    navigate(searchPageHref(submitted));
  }

  function openRow(row: PaletteRow): void {
    onClose();
    if (row.type === 'project') {
      appNavigate(projectRootPath(row.entry.slug));
      return;
    }
    navigate(hrefOfRow(row));
  }

  function chooseWithClick(_row: PaletteRow, event: React.MouseEvent): void {
    // A modified click opens a new tab and leaves the palette where it is; a plain one closes it.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onClose();
  }

  return (
    <Combobox.Root
      inline
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      items={items}
      filteredItems={items}
      filter={null}
      // D-03: the first row (the Exact row when there is one) is highlighted whenever the rows change.
      autoHighlight={AUTO_HIGHLIGHT}
      onInputValueChange={(value) => setQuery(value)}
      onItemHighlighted={(row) => {
        highlightedRef.current = (row as PaletteRow | undefined) ?? null;
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
              openRow(highlighted);
              return;
            }
            commitToSearchPage();
            onClose();
          }}
        />
        {model.refreshing ? (
          <span className="status-chip" data-tone="quiet" role="status">
            <Loader aria-hidden="true" />
            Updating index…
          </span>
        ) : null}
        <kbd className="search-dialog-esc-hint" aria-hidden="true">
          Esc
        </kbd>
      </Combobox.InputGroup>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {track.updated ? 'Index updated' : model.announcement}
      </p>
      <div className="search-dialog-results">
        <Combobox.Empty>{model.empty === null ? null : <PaletteStatus notice={model.empty} bare />}</Combobox.Empty>
        <Combobox.List className="search-dialog-list">
          {(group: ListGroup) =>
            group.items.length === 0 ? (
              <div key={group.value} className="palette-group">
                {group.label === null ? null : <div className="palette-group-label">{group.label}</div>}
                {group.notice === null ? null : <PaletteStatus notice={group.notice} />}
              </div>
            ) : (
              <Combobox.Group key={group.value} items={group.items} className="palette-group">
                {group.label === null ? null : (
                  <Combobox.GroupLabel className="palette-group-label">{group.label}</Combobox.GroupLabel>
                )}
                <Combobox.Collection>
                  {(row: PaletteRow) => <PaletteItem key={row.key} row={row} onChoose={chooseWithClick} />}
                </Combobox.Collection>
              </Combobox.Group>
            )
          }
        </Combobox.List>
      </div>
      <p className="search-dialog-legend">↑↓ move · Enter open · Esc close</p>
    </Combobox.Root>
  );
}

/** NAV-04 (quick-260911-243), Phase 13: the quick-jump palette. The header trigger opens a large centred
 * @base-ui/react Dialog over a full-screen scrim, wrapping an inline grouped Combobox fed by /jump: an exact
 * decision, finding, requirement, plan or quick-task ID first (the current phase's copy highlighted, so Enter
 * opens it), then pages, files, projects and content matches. With nothing typed it offers Recent, Key pages
 * and Projects. Keeps the Phase-3 query behaviour: debounce, abort signal, polling while the index builds.
 * It also records each page the viewer opens into the per-browser Recent list (D-02). */
export function SearchDialog(): React.JSX.Element {
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();
  const { pathname } = useProjectLocation();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  // The shell reads the same entry, so this shares its cache and costs no extra request.
  const presentation = useQuery({
    queryKey: projectKey(slug, scope, 'presentation'),
    queryFn: () => fetchPresentation(slug, scope),
  }).data;

  // D-02: remember the page being viewed. Only this browser's localStorage is touched, never the project.
  useEffect(() => {
    if (presentation === undefined) return;
    const title = titleForPath(pathname, presentation);
    if (title === null) return;
    recordRecent(browserStorage(), recentKey(slug, scope), { path: pathname, title, at: Date.now() });
  }, [pathname, presentation, slug, scope]);

  function handleOpenChange(next: boolean): void {
    setOpen(next);
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
      setOpen(!open);
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
            <PaletteBody
              slug={slug}
              scope={scope}
              pathname={pathname}
              presentation={presentation}
              inputRef={inputRef}
              onClose={() => handleOpenChange(false)}
            />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
