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
  /** Best time per call at n, in milliseconds. */
  t1: number;
  /** Best time per call at n * factor, in milliseconds. */
  t2: number;
  /** t2 / t1, with t1 floored at a microsecond so a zero reading cannot divide by zero; 1 under floorMs. */
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
  /**
   * Upper bound on the big input's size, in the units make() takes (characters, for most callers). The
   * default keeps the big input near 256 KB: past that, a memory-bound scan leaves the private L2 cache
   * and, with sixteen test workers sharing the L3 cache and memory bandwidth, reads 40 to 60 for an 8x
   * step without any algorithmic growth. A quadratic function at 128k characters already costs seconds,
   * so the cap does not blunt the harness.
   */
  maxSize?: number;
  /**
   * If the big input finishes in under this many milliseconds the ratio is not trusted: work that cheap
   * is dominated by cache-level effects (a 32 KB input sits in the L1 cache, a 256 KB one does not, so a
   * plain memory scan reads 25 to 30 for an 8x step), and a super-linear scan would have cost far more
   * than this at the same sizes. The ratio is then reported as 1. Pass 0 to always trust the ratio, as a
   * test must when its size cap is so low that even a quadratic function would finish quickly.
   */
  floorMs?: number;
  /**
   * How many times to repeat a measurement that reads at or above GROWTH_LIMIT, keeping the lowest
   * ratio. A scheduler stall or a garbage-collection pause can push one linear reading over the limit
   * under parallel load; a genuinely quadratic function reads about 64 every time, so the lowest of
   * three readings stays far above the limit. Planted-quadratic controls pass 1 to save time.
   */
  attempts?: number;
}

function measureOnce<T>(options: GrowthOptions<T>): Growth {
  const { make, run, startSize = 1000, factor = 8, reps = 5, minBaseMs = 4, maxSize = 1 << 18, floorMs = 1 } = options;
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
  // When the size cap stops the search before the base run clears the noise floor, time several calls
  // per sample instead, so timer resolution and one-off pauses stop dominating a sub-millisecond run.
  const calls = Math.min(200, Math.max(1, Math.ceil(minBaseMs / Math.max(base, 0.001))));
  const timed = (input: T): number =>
    bestOf(() => {
      for (let i = 0; i < calls; i += 1) run(input);
    }, reps) / calls;
  run(big);
  const t1 = timed(small);
  const t2 = timed(big);
  const ratio = t2 < floorMs ? 1 : t2 / Math.max(t1, 0.001);
  return { n, t1, t2, ratio };
}

/** Warm up once, grow n until the base run clears the noise floor, then time n and n * factor. */
export function measureGrowth<T>(options: GrowthOptions<T>): Growth {
  const attempts = options.attempts ?? 3;
  let best = measureOnce(options);
  for (let attempt = 1; attempt < attempts && best.ratio >= GROWTH_LIMIT; attempt += 1) {
    const next = measureOnce(options);
    if (next.ratio < best.ratio) best = next;
  }
  return best;
}
