// debug/loading-state-regression. The rest of this project's web coverage is source-text pinning,
// which is an IMPLICIT oracle — it can only check that a file mentions the right identifiers. That
// is precisely why the original regression shipped green: the broken wiring
// (`<Suspense fallback={<RouteProgress />}>`) also contained `createPortal`, `document.body`,
// `ROUTE_PROGRESS_DELAY_MS = 150`, `clearTimeout` and the a11y attributes, so every assertion in
// loading-state-contract.test.ts passed while the bar could not paint on any in-app navigation.
//
// These tests are the behavioural guard. They drive `trackRouteChunk` and `routeChunkStore`
// directly — no DOM, no React renderer, no Suspense boundary — which is the point: the loading
// signal must exist independently of whether any boundary mounts. The broken version had no store
// at all and could not have satisfied a single assertion below.
import { describe, expect, it } from 'vitest';
import { routeChunkStore, trackRouteChunk } from '../../src/web/components/route-chunk-store.ts';

/** A promise with its settlers hoisted, so a test can hold a "chunk" open and inspect the store
 * while it is genuinely mid-flight rather than inferring from a resolved one. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Drains the microtask queue, which is where `emit()` parks its listener notifications. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('route chunk store (debug/loading-state-regression)', () => {
  it('starts idle when nothing is in flight', () => {
    expect(routeChunkStore.getSnapshot()).toBe(false);
  });

  it('reports loading SYNCHRONOUSLY when the lazy factory is invoked, before the chunk resolves', async () => {
    const chunk = deferred<{ default: string }>();
    const load = trackRouteChunk(() => chunk.promise);

    expect(routeChunkStore.getSnapshot(), 'idle until the factory is actually called').toBe(false);

    const pending = load();
    // The load-bearing assertion. React.lazy invokes the factory during render, so the flag has to
    // be true on that same synchronous tick for the shell — which sits above the boundary and is
    // already committed — to be able to paint the bar over the still-visible previous page.
    expect(routeChunkStore.getSnapshot(), 'loading while the chunk is genuinely in flight').toBe(
      true,
    );

    chunk.resolve({ default: 'PlanPairPage' });
    await expect(pending, 'the module value passes through the wrapper unchanged').resolves.toEqual(
      { default: 'PlanPairPage' },
    );
    expect(routeChunkStore.getSnapshot(), 'idle again once the chunk lands').toBe(false);
  });

  it('clears the flag when a chunk REJECTS, so a failed route cannot strand the bar on screen', async () => {
    const chunk = deferred<never>();
    const pending = trackRouteChunk(() => chunk.promise)();
    expect(routeChunkStore.getSnapshot()).toBe(true);

    chunk.reject(new Error('Failed to fetch dynamically imported module'));

    await expect(pending).rejects.toThrow('Failed to fetch dynamically imported module');
    expect(routeChunkStore.getSnapshot(), 'the finally block ran').toBe(false);
  });

  it('counts concurrent chunks rather than toggling a boolean', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const firstPending = trackRouteChunk(() => first.promise)();
    const secondPending = trackRouteChunk(() => second.promise)();

    expect(routeChunkStore.getSnapshot()).toBe(true);

    first.resolve('a');
    await firstPending;
    // A naive boolean would have cleared here and hidden the bar while a chunk was still loading.
    expect(routeChunkStore.getSnapshot(), 'one of two chunks landed — still loading').toBe(true);

    second.resolve('b');
    await secondPending;
    expect(routeChunkStore.getSnapshot(), 'both landed — idle').toBe(false);
  });

  it('notifies subscribers on both edges, and stops after unsubscribe', async () => {
    const seen: boolean[] = [];
    const unsubscribe = routeChunkStore.subscribe(() => seen.push(routeChunkStore.getSnapshot()));

    const chunk = deferred<string>();
    const pending = trackRouteChunk(() => chunk.promise)();
    await tick();
    expect(seen, 'rising edge delivered').toContain(true);

    chunk.resolve('done');
    await pending;
    await tick();
    expect(seen.at(-1), 'falling edge delivered').toBe(false);

    unsubscribe();
    const quiet = deferred<string>();
    const quietPending = trackRouteChunk(() => quiet.promise)();
    const countAfterUnsubscribe = seen.length;
    await tick();
    quiet.resolve('ignored');
    await quietPending;
    await tick();
    expect(seen.length, 'no notifications after unsubscribe').toBe(countAfterUnsubscribe);
  });

  it('defers notification off the render pass that invoked the factory', async () => {
    let notifiedSynchronously = false;
    const unsubscribe = routeChunkStore.subscribe(() => {
      notifiedSynchronously = true;
    });

    const chunk = deferred<string>();
    const pending = trackRouteChunk(() => chunk.promise)();
    // React.lazy calls the factory mid-render. A synchronous notify here would be a
    // set-state-during-render of AppShell, so `emit()` parks it in a microtask — the flag itself
    // is already accurate (asserted above), only the subscriber call is deferred.
    expect(notifiedSynchronously, 'listener not called on the factory tick').toBe(false);
    await tick();
    expect(notifiedSynchronously, 'listener called on the following microtask').toBe(true);

    chunk.resolve('done');
    await pending;
    unsubscribe();
  });
});
