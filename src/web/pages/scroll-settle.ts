// Pure, DOM-free settle loop that defers a scroll until the measured layout stops moving across
// consecutive frames. Mirrors the same extracted-web-logic seam already established elsewhere in
// this directory: no browser globals and no React import, so vitest can exercise it directly with
// no jsdom. Callers inject a host that supplies the frame-scheduling primitives
// (requestAnimationFrame/cancelAnimationFrame in production, a manual driver in tests).

/**
 * A single injected host that supplies everything the settle loop needs to measure layout, scroll,
 * and drive its own frame loop, without the module ever touching a browser global directly.
 */
export interface ScrollSettleHost {
  /** Returns a numeric layout signature for the target, or `null` if it is not mounted/measurable. */
  measure(): number | null;
  /** Scrolls the target into position. */
  scroll(): void;
  /** Schedules `callback` for the next frame; returns an opaque handle for `cancel`. */
  schedule(callback: () => void): number;
  /** Cancels a previously scheduled frame. */
  cancel(handle: number): void;
}

export interface ScrollSettleOptions {
  /** Absolute ceiling on the number of frames measured, independent of stability. Default 30. */
  maxFrames?: number;
  /** Consecutive equal measurements required before the loop considers the layout settled. Default 2. */
  stableFrames?: number;
}

/**
 * Defers a scroll until the host's measured layout signature stops changing across consecutive
 * frames, bounded by `maxFrames`. Measures immediately (synchronously, on call); if the first
 * measurement is `null` (the target is not yet mounted), the loop stops without scrolling and
 * without scheduling a frame. Otherwise it scrolls on every frame whose signature differs from the
 * previous one, and stops once either the stability counter reaches `stableFrames` consecutive
 * equal measurements or the total frame count reaches `maxFrames`.
 *
 * Returns a disposer that cancels any outstanding scheduled frame. Safe to call more than once.
 */
export function scrollWhenSettled(
  host: ScrollSettleHost,
  options?: ScrollSettleOptions,
): () => void {
  const maxFrames = options?.maxFrames ?? 30;
  const stableFrames = options?.stableFrames ?? 2;

  let disposed = false;
  let handle: number | null = null;
  let frameCount = 0;
  let stableCount = 0;
  let lastSignature: number | null = null;

  function tick(): void {
    if (disposed) return;
    frameCount += 1;
    const signature = host.measure();
    if (signature === null) return;

    if (lastSignature === null || signature !== lastSignature) {
      lastSignature = signature;
      stableCount = 0;
      host.scroll();
    } else {
      stableCount += 1;
    }

    if (stableCount >= stableFrames) return;
    if (frameCount >= maxFrames) return;
    handle = host.schedule(tick);
  }

  tick();

  return function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (handle !== null) {
      host.cancel(handle);
      handle = null;
    }
  };
}
