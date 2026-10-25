// Growth-ratio timing (SEC-01, TEST-01, Pitfall 11). A fixed millisecond budget flakes under parallel
// load and proves nothing about the shape of the cost. This helper times a function at size n and at
// 8n and reports the ratio of the two best-of-N times: a linear scanner reads about 8, a quadratic one
// about 64, so GROWTH_LIMIT = 24 sits with a 3x margin on both sides.
//
// Two rules for every caller:
//   1. Build inputs inside make(), never inside run(): measureGrowth builds the small and big inputs
//      outside the timed region, so construction cost never pollutes the ratio.
//   2. Caps are not growth. When the code under test rejects or truncates input past a size cap
//      (a row limit, a character limit, a node limit), keep both n and 8n below the cap, or assert the
//      over-cap case is flat instead. A ratio taken across a cap measures the cap, not the algorithm.

/** Between linear (8) and quadratic (64) at an 8x step. */
export const GROWTH_LIMIT = 24;

/** Smallest of `reps` timings of `fn`, in milliseconds. */
export function bestOf(fn: () => void, reps: number): number {
  let best = Infinity;
  for (let i = 0; i < reps; i += 1) {
    const started = performance.now();
    fn();
    best = Math.min(best, performance.now() - started);
  }
  return best;
}

export interface Growth {
  /** The base size that cleared the noise floor. */
  n: number;
  /** Best time at n, in milliseconds. */
  t1: number;
  /** Best time at n * factor, in milliseconds. */
  t2: number;
  /** t2 / t1, with t1 floored at a microsecond so a zero reading cannot divide by zero. */
  ratio: number;
}

export interface GrowthOptions<T> {
  /** Builds the input for size n. Runs outside every timed region. */
  make: (n: number) => T;
  /** The work being measured. */
  run: (input: T) => void;
  startSize?: number;
  factor?: number;
  reps?: number;
  /** The base run must take at least this long before the ratio is trusted. */
  minBaseMs?: number;
  /** Upper bound on the big input's size. */
  maxSize?: number;
}

/** Warm up once, grow n until the base run clears the noise floor, then time n and n * factor. */
export function measureGrowth<T>(options: GrowthOptions<T>): Growth {
  const { make, run, startSize = 1000, factor = 8, reps = 5, minBaseMs = 4, maxSize = 1 << 22 } = options;
  let n = startSize;
  run(make(n));
  let probe = make(n);
  let base = bestOf(() => run(probe), reps);
  while (base < minBaseMs && n * 2 * factor <= maxSize) {
    n *= 2;
    probe = make(n);
    base = bestOf(() => run(probe), reps);
  }
  const small = make(n);
  const big = make(n * factor);
  run(big);
  const t1 = bestOf(() => run(small), reps);
  const t2 = bestOf(() => run(big), reps);
  return { n, t1, t2, ratio: t2 / Math.max(t1, 0.001) };
}
