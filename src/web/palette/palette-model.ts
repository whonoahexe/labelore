// RED stub (13-05 Task 1): the signatures the tests pin, with neutral behaviour. Replaced in the GREEN commit.
import type { JumpRow } from '../../presentation/jump.ts';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import type { JumpApiResponse } from '../../server/search-index.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import type { RecentEntry } from './recent-pages.ts';

export const PALETTE_PROJECT_CAP = 8;

export type PaletteRow =
  | { type: 'jump'; key: string; row: JumpRow }
  | { type: 'project'; key: string; entry: ProjectListEntry; current: boolean }
  | { type: 'recent'; key: string; title: string; path: string }
  | { type: 'key-page'; key: string; title: string; path: string }
  | { type: 'see-all'; key: string; query: string; href: string };

export interface PaletteNotice {
  kind: 'indexing' | 'index-error' | 'no-match' | 'id-not-found' | 'projects-loading' | 'projects-error';
  heading: string;
  body: string | null;
  role: 'status' | 'alert';
}

export interface PaletteGroup {
  key: string;
  label: string | null;
  rows: PaletteRow[];
  notice: PaletteNotice | null;
}

export interface PaletteModel {
  groups: PaletteGroup[];
  empty: PaletteNotice | null;
  refreshing: boolean;
  announcement: string;
}

export interface KeyPage {
  key: string;
  title: string;
  path: string;
}

export interface PaletteInput {
  query: string;
  jump: { state: 'idle' | 'pending' | 'ready' | 'error'; data: JumpApiResponse | undefined };
  projects: { state: 'pending' | 'error' | 'ready'; entries: readonly ProjectListEntry[] };
  currentSlug: string;
  recent: readonly RecentEntry[];
  keyPages: readonly KeyPage[];
}

export type PaletteIcon = 'hash' | 'page' | 'file' | 'content' | 'recent' | 'search' | 'project';

export function keyPagesOf(_presentation: ProjectPresentation): KeyPage[] {
  return [];
}

export function titleForPath(_pathname: string, _presentation: ProjectPresentation): string | null {
  return null;
}

export function filterProjects(
  _entries: readonly ProjectListEntry[],
  _query: string,
  _cap: number = PALETTE_PROJECT_CAP,
): ProjectListEntry[] {
  return [];
}

export function rowIconOf(_row: PaletteRow): PaletteIcon {
  return 'search';
}

export function hrefOfRow(_row: PaletteRow): string {
  return '';
}

export function buildPaletteModel(_input: PaletteInput): PaletteModel {
  return { groups: [], empty: null, refreshing: false, announcement: '' };
}
