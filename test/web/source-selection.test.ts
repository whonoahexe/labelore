// Pins the pure half of Source's selection (Phase 12: SRC-02, D-05, D-06): what a number click, a shift-click, a
// bracket click and a clear do to the selection, the two label forms, the copied link, and the one fragment writer
// (history.replaceState with the page's own state, so no history entry is added and the router never sees it).
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  selectionAfter,
  selectionLabel,
  selectionLinkOf,
  selectionOf,
  writeSelectionHash,
} from '../../src/web/source/source-selection.ts';
import type { Selection } from '../../src/web/source/source-selection.ts';

const line = (selected: Selection | null, n: number, shift = false): Selection | null =>
  selectionAfter(selected, { kind: 'number', line: n, shift });

describe('selectionAfter', () => {
  it('selects the clicked line and remembers it as the anchor', () => {
    expect(line(null, 12)).toEqual({ from: 12, to: 12, anchor: 12 });
  });

  it('replaces a selection with the line clicked next', () => {
    const range = line(line(null, 12), 18, true);
    expect(line(range, 40)).toEqual({ from: 40, to: 40, anchor: 40 });
  });

  it('clears when the one selected number is clicked again', () => {
    expect(line(line(null, 12), 12)).toBeNull();
  });

  it('does not clear a range when one of its ends is clicked', () => {
    const range = line(line(null, 12), 18, true);
    expect(line(range, 12)).toEqual({ from: 12, to: 12, anchor: 12 });
  });

  it('shift-click extends from the anchor downward', () => {
    expect(line(line(null, 12), 18, true)).toEqual({ from: 12, to: 18, anchor: 12 });
  });

  it('shift-click extends from the anchor upward, ordered', () => {
    expect(line(line(null, 18), 12, true)).toEqual({ from: 12, to: 18, anchor: 18 });
  });

  it('keeps the anchor while shift-clicking again', () => {
    const first = line(line(null, 12), 18, true);
    expect(line(first, 5, true)).toEqual({ from: 5, to: 12, anchor: 12 });
  });

  it('shift-click with nothing selected selects that one line', () => {
    expect(line(null, 7, true)).toEqual({ from: 7, to: 7, anchor: 7 });
  });

  it('shift-click on the one selected line keeps it (it only extends, never clears)', () => {
    expect(line(line(null, 7), 7, true)).toEqual({ from: 7, to: 7, anchor: 7 });
  });

  it('selects a whole block from its first to its last line, whatever was selected', () => {
    expect(selectionAfter(null, { kind: 'block', from: 88, to: 134 })).toEqual({ from: 88, to: 134, anchor: 88 });
    expect(selectionAfter(line(null, 3), { kind: 'block', from: 136, to: 169 })).toEqual({ from: 136, to: 169, anchor: 136 });
  });

  it('orders a block whose ends arrive reversed', () => {
    expect(selectionAfter(null, { kind: 'block', from: 20, to: 10 })).toEqual({ from: 10, to: 20, anchor: 10 });
  });

  it('clears on a clear event', () => {
    expect(selectionAfter(line(null, 12), { kind: 'clear' })).toBeNull();
    expect(selectionAfter(null, { kind: 'clear' })).toBeNull();
  });

  it('builds a selection from a parsed fragment with the first line as anchor', () => {
    expect(selectionOf({ from: 3, to: 5 })).toEqual({ from: 3, to: 5, anchor: 3 });
  });
});

describe('selectionLabel', () => {
  it('reads L33 for one line', () => {
    expect(selectionLabel({ from: 33, to: 33 })).toBe('L33');
  });

  it('reads L33–L40 with an en dash for a range', () => {
    expect(selectionLabel({ from: 33, to: 40 })).toBe('L33–L40');
  });

  it('gives a whole block its own range label', () => {
    expect(selectionLabel({ from: 88, to: 134 })).toBe('L88–L134');
  });
});

describe('selectionLinkOf', () => {
  it('is the absolute address with ?source=1 and the fragment', () => {
    expect(selectionLinkOf('http://127.0.0.1:4198', '/lendshed/phase-1/plan-06', { from: 33, to: 40 })).toBe(
      'http://127.0.0.1:4198/lendshed/phase-1/plan-06?source=1#L33-L40',
    );
  });

  it('writes one line as #L33', () => {
    expect(selectionLinkOf('http://x', '/p', { from: 33, to: 33 })).toBe('http://x/p?source=1#L33');
  });
});

describe('writeSelectionHash', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubWindow(search: string): { replaceState: ReturnType<typeof vi.fn>; state: object } {
    const state = { key: 'router-state', idx: 4 };
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/lendshed/phase-1/plan-06', search, hash: '' },
      history: { state, replaceState },
    });
    return { replaceState, state };
  }

  it('replaces the entry with the page state, its path and query, and the fragment', () => {
    const { replaceState, state } = stubWindow('?source=1');
    writeSelectionHash({ from: 12, to: 18 });
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(state, '', '/lendshed/phase-1/plan-06?source=1#L12-L18');
  });

  it('removes the fragment when the selection is cleared', () => {
    const { replaceState, state } = stubWindow('?source=1');
    writeSelectionHash(null);
    expect(replaceState).toHaveBeenCalledWith(state, '', '/lendshed/phase-1/plan-06?source=1');
  });

  it('keeps an address with no query as it is', () => {
    const { replaceState, state } = stubWindow('');
    writeSelectionHash({ from: 5, to: 5 });
    expect(replaceState).toHaveBeenCalledWith(state, '', '/lendshed/phase-1/plan-06#L5');
  });
});
