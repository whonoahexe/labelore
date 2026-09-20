import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SECTION_ROOT_MARGIN,
  ACTIVE_SECTION_THRESHOLD,
  pickActiveEntry,
} from '../../src/web/views/active-section.ts';

describe('pickActiveEntry', () => {
  it('picks the first visible id in order when two entries are visible (READ-07 adjacency)', () => {
    const order = ['a', 'b', 'c'];
    const visible = new Set(['c', 'b']);
    expect(pickActiveEntry(order, visible, null)).toBe('b');
  });

  it('keeps the previous entry active when nothing is currently visible (READ-07 empty)', () => {
    const order = ['a', 'b', 'c'];
    expect(pickActiveEntry(order, new Set(), 'b')).toBe('b');
  });

  it('falls back to the first entry when the previous entry is no longer in order', () => {
    const order = ['a', 'b', 'c'];
    expect(pickActiveEntry(order, new Set(), 'z')).toBe('a');
  });

  it('returns null for an empty order regardless of previous', () => {
    expect(pickActiveEntry([], new Set(), 'a')).toBeNull();
    expect(pickActiveEntry([], new Set(), null)).toBeNull();
  });

  it('returns the first entry when nothing is visible and there is no previous', () => {
    expect(pickActiveEntry(['a', 'b'], new Set(), null)).toBe('a');
  });

  it('is a pure function of (order, visible, previous) — outline order is never re-sorted by visibility', () => {
    const order = ['x', 'y', 'z'];
    expect(pickActiveEntry(order, new Set(['z', 'x', 'y']), null)).toBe('x');
  });
});

describe('active-section constants', () => {
  it('exports a non-empty root margin and a zero threshold', () => {
    expect(ACTIVE_SECTION_ROOT_MARGIN.length).toBeGreaterThan(0);
    expect(ACTIVE_SECTION_THRESHOLD).toBe(0);
  });
});
