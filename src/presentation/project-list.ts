// The project list the server answers at GET /api/projects and the web renders in its switcher.
// Pure: no Node import, so the server and the browser bundle share it. The server builds entries from
// memory only (D-02): listing never loads a project.

export type ProjectKind = 'local' | 'ssh';

/** `unloaded` has no runtime yet (or was evicted), `loading` has one load in flight, `ready` is
 * served from memory, `unavailable` failed to load or its folder is gone. */
export type ProjectLoadState = 'unloaded' | 'loading' | 'ready' | 'unavailable';

export interface ProjectListEntry {
  slug: string;
  name: string;
  kind: ProjectKind;
  /** The canonical root of a local project; the (password-free) address of an ssh one. */
  target: string;
  /** The target the way a person reads it: `~/work/portal` for a path under home. */
  displayPath: string;
  state: ProjectLoadState;
  /** The server's own message when `state` is `unavailable`, else null. */
  reason: string | null;
  /** The path the server checked when `state` is `unavailable`, else null. */
  pathChecked: string | null;
  /** ISO time the project was last opened, or null when it never was. */
  lastOpened: string | null;
  /** True for a project that exists only for this server run (not remembered). */
  sessionOnly: boolean;
}

export interface ProjectListResponse {
  projects: ProjectListEntry[];
  notices: string[];
}

/** `~` plus the remainder when `path` is `home` or sits under it; any other path (an ssh address
 * included) comes back unchanged. */
export function homeShortened(path: string, home: string): string {
  if (home === '' || home === '/') return path;
  if (path === home) return '~';
  if (path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path;
}

/** A new array ordered by `lastOpened` descending (most recent first), then the never-opened items in
 * the order they were added. Equal `lastOpened` values keep their added order (stable, D-04). */
export function orderProjects<T extends { lastOpened: string | null; addedOrder: number }>(items: readonly T[]): T[] {
  const opened = items.filter((item) => item.lastOpened !== null);
  const never = items.filter((item) => item.lastOpened === null);
  opened.sort((left, right) => {
    const a = left.lastOpened ?? '';
    const b = right.lastOpened ?? '';
    if (a !== b) return a < b ? 1 : -1;
    return left.addedOrder - right.addedOrder;
  });
  never.sort((left, right) => left.addedOrder - right.addedOrder);
  return [...opened, ...never];
}
