// The palette's Recent list (Phase 13, D-02): the pages this viewer opened last, kept only in this browser's
// localStorage and never written into the target project's .planning/. Storage is untrusted in both directions:
// it can throw (private mode, a locked-down policy), be full, be edited by hand or be written by another script
// on the same origin, so every access sits in try/catch and every entry read back is shape-checked before it is
// used (T-13-15). An entry holds a path, a title and a time and nothing else.

/** How many recent pages the palette remembers and shows. */
export const RECENT_LIMIT = 5;

const MAX_PATH_LENGTH = 512;
const MAX_TITLE_LENGTH = 200;
const KEY_PREFIX = 'labelore:palette-recent:';

export interface RecentEntry {
  /** A project-relative address, one leading '/'. */
  path: string;
  title: string;
  /** Epoch milliseconds the page was opened. */
  at: number;
}

/** The two calls the list needs; window.localStorage satisfies it. */
export interface RecentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// A control character in a stored address or title was never put there by the router.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/;

/** The storage key of one project's list; inside a workstream the scope follows, so a scope's project-relative
 * paths are never replayed in another scope. */
export function recentKey(slug: string, scope: string | null): string {
  return scope === null ? `${KEY_PREFIX}${slug}` : `${KEY_PREFIX}${slug}:ws:${scope}`;
}

/** The entry when it is a well-formed one, else null. Only the three known fields survive. */
function checked(value: unknown): RecentEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { path, title, at } = value as Record<string, unknown>;
  if (typeof path !== 'string' || typeof title !== 'string') return null;
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (title.length > MAX_TITLE_LENGTH) return null;
  if (CONTROL_CHARACTER.test(path) || CONTROL_CHARACTER.test(title)) return null;
  return { path, title, at };
}

/** The remembered pages, newest first, at most RECENT_LIMIT. Anything unreadable or malformed gives fewer
 * entries (or none), never an error. */
export function readRecent(storage: RecentStorage | null, key: string): RecentEntry[] {
  if (storage === null) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return [];
  }
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const entries: RecentEntry[] = [];
  for (const candidate of parsed) {
    const entry = checked(candidate);
    if (entry !== null) entries.push(entry);
    if (entries.length === RECENT_LIMIT) break;
  }
  return entries;
}

/** Puts `entry` first, drops an older entry for the same path, keeps RECENT_LIMIT, and returns the list it
 * stored. A malformed entry stores nothing; a write that fails is swallowed (the list is a convenience). */
export function recordRecent(storage: RecentStorage | null, key: string, entry: RecentEntry): RecentEntry[] {
  const next = checked(entry);
  if (storage === null || next === null) return readRecent(storage, key);
  const list = [next, ...readRecent(storage, key).filter((existing) => existing.path !== next.path)].slice(
    0,
    RECENT_LIMIT,
  );
  try {
    storage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage may be full or blocked; the palette simply has no Recent group.
  }
  return list;
}

/** window.localStorage, or null where reading it throws (blocked storage) or there is no window. */
export function browserStorage(): RecentStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
