// Positive controls for the growth harness itself (Pitfall 11): a harness that cannot see a planted
// quadratic cannot be trusted to clear a real scanner.
import { describe, expect, it } from 'vitest';
import { GROWTH_LIMIT, bestOf, measureGrowth } from './growth.ts';

let sink = 0;

describe('measureGrowth', () => {
  it('reads a planted nested loop above the limit', () => {
    const growth = measureGrowth<number[]>({
      make: (n) => Array.from({ length: n }, (_, i) => i),
      run: (items) => {
        let total = 0;
        for (const a of items) for (const b of items) total += a ^ b;
        sink += total;
      },
      startSize: 200,
      minBaseMs: 2,
      maxSize: 1 << 16,
      attempts: 1,
      floorMs: 0,
    });
    expect(growth.ratio).toBeGreaterThan(GROWTH_LIMIT);
  });

  it('reads a planted single loop below the limit', () => {
    const growth = measureGrowth<number[]>({
      make: (n) => Array.from({ length: n }, (_, i) => i),
      run: (items) => {
        let total = 0;
        for (const a of items) total += a ^ 7;
        sink += total;
      },
      startSize: 20_000,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('reports 1 for work too cheap to tell from cache effects, and the raw ratio when floorMs is 0', () => {
    const options = {
      make: (n: number) => n,
      run: (n: number) => void (sink += n),
      maxSize: 1 << 12,
      attempts: 1,
    };
    expect(measureGrowth({ ...options, floorMs: 1000 }).ratio).toBe(1);
    expect(measureGrowth({ ...options, floorMs: 0 }).ratio).toBeGreaterThan(0);
  });

  it('reports the base size and both timings', () => {
    const growth = measureGrowth<number>({ make: (n) => n, run: (n) => void (sink += n), maxSize: 1 << 12 });
    expect(growth.n).toBeGreaterThan(0);
    expect(growth.t1).toBeGreaterThanOrEqual(0);
    expect(growth.t2).toBeGreaterThanOrEqual(0);
  });
});

describe('bestOf', () => {
  it('returns the smallest of the timings', () => {
    let call = 0;
    const best = bestOf(() => {
      call += 1;
      const until = performance.now() + (call === 2 ? 0 : 3);
      while (performance.now() < until);
    }, 3);
    expect(best).toBeLessThan(2);
    expect(call).toBe(3);
  });
});
