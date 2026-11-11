// Source mode's selection (Phase 12: SRC-02, D-05, D-06; sketch 062 E): what a click on a line number, a shift-click
// and a click on a block's bracket do to the selected range, how the range reads in the chip, the link Copy link
// copies, and the one place that writes the range into the URL fragment. Everything is pure except
// writeSelectionHash, which only replaces the current history entry (T-12-26): the path, the query and the page's
// own history state stay as they are, so a click never adds an entry and the router never sees the change.
import { formatLineHash, sourceLinkOf } from '../../presentation/source-link.ts';
import type { LineRange } from '../../presentation/source-link.ts';

/** A selected range plus the line a shift-click extends from (the first line that was clicked). */
export interface Selection extends LineRange {
  anchor: number;
}

export type SelectionEvent =
  | { kind: 'number'; line: number; shift: boolean }
  | { kind: 'block'; from: number; to: number }
  | { kind: 'clear' };

/** The selection a parsed fragment names: its first line is the anchor. */
export function selectionOf(range: LineRange): Selection {
  return { from: range.from, to: range.to, anchor: range.from };
}

/**
 * The selection after an event. A number click selects that line; clicking the one selected line again clears it;
 * shift extends from the anchor (ordered); a block selects its whole run; clear empties it.
 */
export function selectionAfter(current: Selection | null, event: SelectionEvent): Selection | null {
  if (event.kind === 'clear') return null;
  if (event.kind === 'block') {
    const from = Math.min(event.from, event.to);
    return { from, to: Math.max(event.from, event.to), anchor: from };
  }
  const { line, shift } = event;
  if (shift && current !== null) {
    return { from: Math.min(current.anchor, line), to: Math.max(current.anchor, line), anchor: current.anchor };
  }
  if (!shift && current !== null && current.from === line && current.to === line) return null;
  return { from: line, to: line, anchor: line };
}

/** "L33" for one line, "L33–L40" (en dash) for a range or a whole block. */
export function selectionLabel(range: LineRange): string {
  return range.from === range.to ? `L${range.from}` : `L${range.from}–L${range.to}`;
}

/** The absolute link Copy link copies: the origin, the page's path, `?source=1` and the fragment. */
export function selectionLinkOf(origin: string, pathname: string, range: LineRange): string {
  return `${origin}${sourceLinkOf(pathname, range)}`;
}

/**
 * Puts the range in the address bar as a fragment, or removes the fragment for null. Replaces the current history
 * entry and passes `window.history.state` through, so the router's own state is untouched and the history length
 * does not grow.
 */
export function writeSelectionHash(range: LineRange | null): void {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${search}${range === null ? '' : formatLineHash(range)}`);
}
