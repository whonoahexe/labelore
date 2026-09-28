// Parses an ASCII directory tree (`├──` / `└──` / `│` guides with `# comments`) into rows a clean
// list can draw (quick-260929-3x3, sketch 009 Tree B "Clean list"). A faithful, pure port of the
// sketch's `parseTree()` — plus parent links, so folders collapse and the "Changed only" filter can
// keep a changed file's ancestors. No DOM, no Node APIs, no research-specific import: the
// lifted-figures-everywhere todo reuses this unchanged for every document.
//
// T-3x3-02: each line is clipped and parsed with linear scans (no regex over the whole line), and
// a tree is capped at MAX_ROWS rows.

export type TreeBadge = 'NEW' | 'EXTEND' | 'EXISTING';

export interface TreeRow {
  /** Prefix length / 4, rounded — the indentation level. */
  depth: number;
  /** The author's guide glyphs and indentation, verbatim. */
  prefix: string;
  name: string;
  /** The `# comment` text (continuation comment-only lines are appended), badge prefix removed. */
  note: string;
  /** A name ending in `/`. */
  dir: boolean;
  badge: TreeBadge | null;
  /** Index of the nearest shallower row above, or null for a root. */
  parent: number | null;
}

const MAX_LINE = 2000;
export const TREE_MAX_ROWS = 2000;
const GUIDE = '│├└─';

function isPrefixChar(ch: string): boolean {
  return GUIDE.includes(ch) || /\s/.test(ch);
}

function badgeOf(note: string): { badge: TreeBadge | null; note: string } {
  for (const badge of ['NEW', 'EXTEND', 'EXISTING'] as const) {
    if (!note.startsWith(badge)) continue;
    const after = note[badge.length];
    if (after !== undefined && /[A-Za-z0-9_]/.test(after)) continue;
    let rest = badge.length;
    while (rest < note.length && (/\s/.test(note[rest]) || note[rest] === ':' || note[rest] === '—' || note[rest] === '-')) {
      rest += 1;
    }
    return { badge, note: note.slice(rest) };
  }
  return { badge: null, note };
}

/** Parses `text` into tree rows, in document order. */
export function parseTree(text: string): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const rawLine of text.split('\n')) {
    if (rows.length >= TREE_MAX_ROWS) break;
    const line = (rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine).slice(0, MAX_LINE);
    const chars = Array.from(line);
    let prefixLength = 0;
    while (prefixLength < chars.length && isPrefixChar(chars[prefixLength])) prefixLength += 1;
    const prefix = chars.slice(0, prefixLength).join('');
    const rest = chars.slice(prefixLength).join('');
    if (rest === '') continue;
    const hash = rest.indexOf('#');
    if (hash === 0) {
      const comment = rest.slice(1).trim();
      if (comment !== '' && rows.length > 0) rows[rows.length - 1].note += ` ${comment}`;
      continue;
    }
    const name = (hash === -1 ? rest : rest.slice(0, hash)).trim();
    if (name === '') continue;
    const note = hash === -1 ? '' : rest.slice(hash + 1).trim();
    rows.push({
      depth: Math.round(prefixLength / 4),
      prefix,
      name,
      note,
      dir: name.endsWith('/'),
      badge: null,
      parent: null,
    });
  }
  const stack: number[] = [];
  rows.forEach((row, index) => {
    const parsed = badgeOf(row.note);
    row.badge = parsed.badge;
    row.note = parsed.note.trim();
    while (stack.length > 0 && rows[stack[stack.length - 1]].depth >= row.depth) stack.pop();
    row.parent = stack.length > 0 ? stack[stack.length - 1] : null;
    stack.push(index);
  });
  return rows;
}

/** Indices of every NEW / EXTEND row plus all of its ancestors — what "Changed only" keeps. */
export function changedOnlySet(rows: TreeRow[]): Set<number> {
  const keep = new Set<number>();
  rows.forEach((row, index) => {
    if (row.badge !== 'NEW' && row.badge !== 'EXTEND') return;
    let cursor: number | null = index;
    while (cursor !== null && !keep.has(cursor)) {
      keep.add(cursor);
      cursor = rows[cursor].parent;
    }
  });
  return keep;
}

export interface TreeCounts {
  files: number;
  folders: number;
  /** NEW + EXTEND rows. */
  changed: number;
}

export function treeCounts(rows: TreeRow[]): TreeCounts {
  let files = 0;
  let folders = 0;
  let changed = 0;
  for (const row of rows) {
    if (row.dir) folders += 1;
    else files += 1;
    if (row.badge === 'NEW' || row.badge === 'EXTEND') changed += 1;
  }
  return { files, folders, changed };
}

/** A misdetection guard: only text with three or more `├──` / `└──` lines is a directory tree. */
export function isDirectoryTree(text: string): boolean {
  let count = 0;
  for (const line of text.split('\n')) {
    const clipped = line.slice(0, MAX_LINE);
    if (clipped.includes('├──') || clipped.includes('└──')) count += 1;
    if (count >= 3) return true;
  }
  return false;
}
