// The quick-jump palette's rules as a pure model (Phase 13, 13-05): which groups show, in which order, in which
// state, with which notices, and what the empty palette holds. The host (components/search-field.tsx) only
// renders what comes back, so every rule here is unit-tested without a browser.
//
// Typed text searches everything at once in one list (D-01): Exact match (or IDs), Pages, Files, Projects,
// Content matches, then the See all row; a group with no rows is not drawn. Nothing typed shows Recent, Key pages
// and Projects (D-02). The Projects group never depends on the index (D-16), so it shows while the index builds,
// refreshes or fails. The model never invents "no match" while an answer is pending, building or refreshing.
import type { JumpGroup, JumpGroupKey, JumpRow } from '../../presentation/jump.ts';
import { JUMP_GROUP_LABELS, pageTargetsOf, phaseLabelOf } from '../../presentation/jump.ts';
import { headPhaseOf } from '../../presentation/dashboard-head.ts';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { projectMapState } from '../../presentation/project-map-state.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { foldCase } from '../../presentation/search.ts';
import type { JumpApiResponse } from '../../server/search-index.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { projectRootPath } from '../project-path.ts';
import type { RecentEntry } from './recent-pages.ts';

/** How many project rows the palette shows, empty or typed (UI-SPEC: the full list is on the landing page). */
export const PALETTE_PROJECT_CAP = 8;

export type PaletteRow =
  | { type: 'jump'; key: string; row: JumpRow }
  | { type: 'project'; key: string; entry: ProjectListEntry; current: boolean }
  | { type: 'recent'; key: string; title: string; path: string }
  | { type: 'key-page'; key: string; title: string; path: string }
  | { type: 'see-all'; key: string; query: string; href: string };

export interface PaletteNotice {
  kind: 'indexing' | 'index-error' | 'request-error' | 'no-match' | 'id-not-found' | 'projects-loading' | 'projects-error';
  heading: string;
  /** The Meta line under the heading, or null. */
  body: string | null;
  /** 'alert' only for the one genuine failure; everything else is a quiet status. */
  role: 'status' | 'alert';
}

export interface PaletteGroup {
  key: string;
  /** The group's label, or null for a group drawn without one (a notice, the See all row). */
  label: string | null;
  rows: PaletteRow[];
  /** A notice drawn in place of the group's rows (or, for a group with no rows, as its whole content). */
  notice: PaletteNotice | null;
}

export interface PaletteModel {
  groups: PaletteGroup[];
  /** What the list says when it holds nothing at all, else null. */
  empty: PaletteNotice | null;
  /** True while a ready index is the previous generation and a rebuild is running (D-11). */
  refreshing: boolean;
  /** The text of the polite live region: the result count once the answer has settled, else ''. */
  announcement: string;
}

/** A page offered on the empty palette. */
export interface KeyPage {
  key: string;
  title: string;
  path: string;
}

export interface PaletteInput {
  /** The trimmed-or-not query the host has settled on (already debounced). */
  query: string;
  jump: { state: 'idle' | 'pending' | 'ready' | 'error'; data: JumpApiResponse | undefined };
  projects: { state: 'pending' | 'error' | 'ready'; entries: readonly ProjectListEntry[] };
  currentSlug: string;
  recent: readonly RecentEntry[];
  keyPages: readonly KeyPage[];
}

export type PaletteIcon = 'hash' | 'page' | 'file' | 'content' | 'recent' | 'search' | 'project';

const NOTICES = {
  indexing: {
    kind: 'indexing',
    heading: 'Indexing…',
    body: 'Pages and files will appear once the index finishes. Projects are available now.',
    role: 'status',
  },
  indexError: {
    kind: 'index-error',
    heading: 'Search is unavailable.',
    body: "The index could not be built. Pages and projects below still work; check that the project's .planning folder can be read, then refresh.",
    role: 'alert',
  },
  // The request itself failed (server restarting, connection dropped): not the index, so not the index's words.
  requestError: {
    kind: 'request-error',
    heading: 'Search could not be loaded.',
    body: 'The request failed. Projects below still work; keep typing or reopen the palette to try again.',
    role: 'alert',
  },
  projectsLoading: { kind: 'projects-loading', heading: 'Loading projects…', body: null, role: 'status' },
  projectsError: { kind: 'projects-error', heading: 'Projects could not be listed.', body: null, role: 'status' },
} as const satisfies Record<string, PaletteNotice>;

function noMatchNotice(query: string): PaletteNotice {
  return {
    kind: 'no-match',
    heading: `Nothing matches "${query}".`,
    body: 'Try a page name, an ID such as D-12 or WR-03, or a project name.',
    role: 'status',
  };
}

function idNotFoundNotice(id: string): PaletteNotice {
  return {
    kind: 'id-not-found',
    heading: `No ${id} in this project.`,
    body: 'It may be in another project. Check the spelling, or search the text instead.',
    role: 'status',
  };
}

/** The pages worth one keystroke on an empty palette: Dashboard, Roadmap (a map-only project has none) and the
 * phase STATE names, when it resolves. */
export function keyPagesOf(presentation: ProjectPresentation): KeyPage[] {
  const pages: KeyPage[] = [{ key: 'key-page:dashboard', title: 'Dashboard', path: presentationRoutePatterns.dashboard }];
  if (!projectMapState(presentation.artifacts).mapOnly) {
    pages.push({ key: 'key-page:roadmap', title: 'Roadmap', path: presentationRoutePatterns.roadmap });
  }
  const phase = headPhaseOf(presentation);
  if (phase !== null) {
    const milestone = presentation.milestones.find((candidate) => candidate.phases.includes(phase));
    const target = pageTargetsOf(presentation).find((candidate) => candidate.phaseKey === phase.key);
    if (milestone !== undefined && target !== undefined) {
      pages.push({
        key: `key-page:${phase.key}`,
        title: `${phaseLabelOf(phase, milestone)} · ${phase.name}`,
        path: target.url,
      });
    }
  }
  return pages;
}

/** What a page is called in Recent: the page's own name, else the artifact's title, else null (an address the
 * project does not know is never remembered). */
export function titleForPath(pathname: string, presentation: ProjectPresentation): string | null {
  const page = pageTargetsOf(presentation).find((target) => target.url === pathname);
  if (page !== undefined) return page.title;
  const artifact = presentation.artifacts.find((candidate) => candidate.key === pathname);
  return artifact === undefined ? null : artifact.title;
}

/** The projects whose name contains `query` (case-insensitive), in the order given, at most `cap`. */
export function filterProjects(
  entries: readonly ProjectListEntry[],
  query: string,
  cap: number = PALETTE_PROJECT_CAP,
): ProjectListEntry[] {
  const needle = foldCase(query.trim());
  const matches = needle === '' ? entries : entries.filter((entry) => foldCase(entry.name).includes(needle));
  return matches.slice(0, cap);
}

export function rowIconOf(row: PaletteRow): PaletteIcon {
  switch (row.type) {
    case 'project':
      return 'project';
    case 'recent':
      return 'recent';
    case 'key-page':
      return 'page';
    case 'see-all':
      return 'search';
    case 'jump':
      switch (row.row.kind) {
        case 'page':
          return 'page';
        case 'file':
          return 'file';
        case 'content':
          return 'content';
        default:
          return 'hash';
      }
  }
}

/** Where a row opens: a jump row's address plus the anchor of the item it names (D-05), a project's root, or the
 * path the row carries. */
export function hrefOfRow(row: PaletteRow): string {
  switch (row.type) {
    case 'jump':
      return row.row.anchor === null ? row.row.url : `${row.row.url}#${row.row.anchor}`;
    case 'project':
      return projectRootPath(row.entry.slug);
    case 'see-all':
      return row.href;
    case 'recent':
    case 'key-page':
      return row.path;
  }
}

/** The search page for a query, built from the route patterns and never written out as a literal. */
function searchPageHref(query: string): string {
  return `${presentationRoutePatterns.search}?q=${encodeURIComponent(query)}`;
}

function projectRow(entry: ProjectListEntry, currentSlug: string): PaletteRow {
  return { type: 'project', key: `project:${entry.slug}`, entry, current: entry.slug === currentSlug };
}

/** The Projects group: its rows, or a quiet notice while the list loads or when it failed; null when the list is
 * ready and no project matches. */
function projectsGroup(input: PaletteInput, query: string): PaletteGroup | null {
  const base = { key: 'projects', label: 'Projects' };
  if (input.projects.state === 'pending') return { ...base, rows: [], notice: NOTICES.projectsLoading };
  if (input.projects.state === 'error') return { ...base, rows: [], notice: NOTICES.projectsError };
  const rows = filterProjects(input.projects.entries, query).map((entry) => projectRow(entry, input.currentSlug));
  return rows.length === 0 ? null : { ...base, rows, notice: null };
}

function jumpGroup(group: JumpGroup): PaletteGroup {
  return {
    key: group.key,
    label: JUMP_GROUP_LABELS[group.key],
    rows: group.rows.map((row) => ({ type: 'jump', key: `${group.key}:${row.key}`, row })),
    notice: null,
  };
}

function emptyPalette(input: PaletteInput): PaletteModel {
  const groups: PaletteGroup[] = [];
  if (input.recent.length > 0) {
    groups.push({
      key: 'recent',
      label: 'Recent',
      rows: input.recent.map((entry) => ({ type: 'recent', key: `recent:${entry.path}`, title: entry.title, path: entry.path })),
      notice: null,
    });
  }
  if (input.keyPages.length > 0) {
    groups.push({
      key: 'key-pages',
      label: 'Key pages',
      rows: input.keyPages.map((page) => ({ type: 'key-page', key: `key-page:${page.path}`, title: page.title, path: page.path })),
      notice: null,
    });
  }
  const projects = projectsGroup(input, '');
  if (projects !== null) groups.push(projects);
  return { groups, empty: null, refreshing: false, announcement: '' };
}

const BEFORE_PROJECTS: readonly JumpGroupKey[] = ['exact', 'ids', 'pages', 'files'];

function countOf(groups: readonly PaletteGroup[]): number {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}

function announce(count: number, refreshing: boolean): string {
  if (count === 0) return refreshing ? '' : 'No results';
  return count === 1 ? '1 result' : `${count} results`;
}

export function buildPaletteModel(input: PaletteInput): PaletteModel {
  const query = input.query.trim();
  if (query === '') return emptyPalette(input);

  const { state, data } = input.jump;
  // A failed request and a failed index build are told apart (WR-02): only the server's own 'error' status
  // means the index could not be built.
  const requestFailed = state === 'error';
  const failed = requestFailed || data?.status === 'error';
  const building = !failed && data?.status === 'building';
  const ready = !failed && data?.status === 'ready' ? data : null;
  const refreshing = ready !== null && ready.refreshing;
  const projects = projectsGroup(input, query);

  const groups: PaletteGroup[] = [];
  if (failed) {
    groups.push(
      requestFailed
        ? { key: 'request-error', label: null, rows: [], notice: NOTICES.requestError }
        : { key: 'index-error', label: null, rows: [], notice: NOTICES.indexError },
    );
  } else if (building) {
    groups.push({ key: 'indexing', label: null, rows: [], notice: NOTICES.indexing });
  } else if (ready !== null) {
    for (const key of BEFORE_PROJECTS) {
      const found = ready.groups.find((candidate) => candidate.key === key);
      if (found !== undefined && found.rows.length > 0) groups.push(jumpGroup(found));
    }
  }
  if (projects !== null) groups.push(projects);
  if (ready !== null) {
    const content = ready.groups.find((candidate) => candidate.key === 'content');
    if (content !== undefined && content.rows.length > 0) groups.push(jumpGroup(content));
    // The last group has no label and holds one row, so Enter on it opens every match on the search page.
    if (ready.contentTotal > 0) {
      groups.push({
        key: 'see-all',
        label: null,
        rows: [{ type: 'see-all', key: 'see-all', query, href: searchPageHref(query) }],
        notice: null,
      });
    }
  }

  // A no-match is only ever said about a settled answer: ready, current, not mid-refresh, and nothing else to show.
  const settled = ready !== null && state === 'ready' && !refreshing;
  let empty: PaletteNotice | null = null;
  if (settled && groups.length === 0) {
    empty = ready.notFoundId === null ? noMatchNotice(query) : idNotFoundNotice(ready.notFoundId);
  }
  const announcement = ready !== null && state === 'ready' ? announce(countOf(groups), refreshing) : '';
  return { groups, empty, refreshing, announcement };
}
