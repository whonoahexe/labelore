// Pins Source mode's line fragment (Phase 12: D-05, T-12-06): #L12 and #L12-L30 are the only forms read;
// anything else is ignored; a range is ordered and clamped to the file.
import { describe, expect, it } from 'vitest';
import { formatLineHash, hasLineHash, parseLineHash, sourceLinkOf } from '../../src/presentation/source-link.ts';

describe('hasLineHash', () => {
  it('accepts one line and a range', () => {
    expect(hasLineHash('#L12')).toBe(true);
    expect(hasLineHash('#L12-L30')).toBe(true);
    expect(hasLineHash('#L123456789')).toBe(true);
  });

  it('rejects lower-case l, ten digits, extra characters, a bare range end and the empty hash', () => {
    for (const hash of ['#l12', '#L1234567890', '#L12x', '#L12-30', '#L12-L', '#L-12', '#L', '#', '', 'L12', '#L12-L30-L40', '#L12 ', '#L١٢']) {
      expect(hasLineHash(hash), hash).toBe(false);
    }
  });
});

describe('parseLineHash', () => {
  it('reads one line as a range of one', () => {
    expect(parseLineHash('#L12', 100)).toEqual({ from: 12, to: 12 });
  });

  it('reads a range', () => {
    expect(parseLineHash('#L12-L30', 100)).toEqual({ from: 12, to: 30 });
  });

  it('orders a reversed range', () => {
    expect(parseLineHash('#L30-L12', 100)).toEqual({ from: 12, to: 30 });
  });

  it('clamps to the file', () => {
    expect(parseLineHash('#L500', 40)).toEqual({ from: 40, to: 40 });
    expect(parseLineHash('#L10-L500', 40)).toEqual({ from: 10, to: 40 });
    expect(parseLineHash('#L5', 0)).toEqual({ from: 1, to: 1 });
  });

  it('ignores line zero and anything that is not a line fragment', () => {
    expect(parseLineHash('#L0', 10)).toBeNull();
    expect(parseLineHash('#L0-L5', 10)).toBeNull();
    expect(parseLineHash('#l12', 10)).toBeNull();
    expect(parseLineHash('#L1234567890', 10)).toBeNull();
    expect(parseLineHash('#L12x', 10)).toBeNull();
    expect(parseLineHash('', 10)).toBeNull();
  });
});

describe('formatLineHash and sourceLinkOf', () => {
  it('writes one line and a range', () => {
    expect(formatLineHash({ from: 12, to: 12 })).toBe('#L12');
    expect(formatLineHash({ from: 12, to: 30 })).toBe('#L12-L30');
  });

  it('builds the file URL with ?source=1 and the fragment', () => {
    expect(sourceLinkOf('/v1.1/phase-1/plan-06', { from: 12, to: 30 })).toBe('/v1.1/phase-1/plan-06?source=1#L12-L30');
    expect(sourceLinkOf('/roadmap', null)).toBe('/roadmap?source=1');
  });

  it('round-trips through parseLineHash', () => {
    expect(parseLineHash(formatLineHash({ from: 7, to: 9 }), 20)).toEqual({ from: 7, to: 9 });
  });
});
