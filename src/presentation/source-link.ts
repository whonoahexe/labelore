// Source mode's line fragment (Phase 12: D-05): `#L12` is one line, `#L12-L30` a range. Pure strings in,
// strings and numbers out, no imports. A fragment that does not match exactly is ignored, never turned
// into a selector or a pattern (T-12-06).

/** An inclusive, ordered, 1-based line range. */
export interface LineRange {
  from: number;
  to: number;
}

/** Case-sensitive: `#L`, 1 to 9 digits, optionally `-L` and 1 to 9 digits, and nothing else. */
const LINE_HASH = /^#L(\d{1,9})(?:-L(\d{1,9}))?$/;

/** True only for a well-formed line fragment. */
export function hasLineHash(hash: string): boolean {
  return LINE_HASH.test(hash);
}

/**
 * The ordered range a line fragment names, clamped to 1 through max(lineCount, 1); null when the
 * fragment is not a line fragment or names line 0.
 */
export function parseLineHash(hash: string, lineCount: number): LineRange | null {
  const match = LINE_HASH.exec(hash);
  if (match === null) return null;
  const first = Number(match[1]);
  const second = match[2] === undefined ? first : Number(match[2]);
  if (first === 0 || second === 0) return null;
  const max = Math.max(Number.isFinite(lineCount) ? Math.floor(lineCount) : 1, 1);
  const clamp = (value: number): number => Math.min(Math.max(value, 1), max);
  return { from: clamp(Math.min(first, second)), to: clamp(Math.max(first, second)) };
}

/** `#L12` for one line, `#L12-L30` for a range. */
export function formatLineHash(range: LineRange): string {
  return range.from === range.to ? `#L${range.from}` : `#L${range.from}-L${range.to}`;
}

/** The pathname plus `?source=1` plus the fragment (no fragment for a null range). */
export function sourceLinkOf(pathname: string, range: LineRange | null): string {
  return `${pathname}?source=1${range === null ? '' : formatLineHash(range)}`;
}
