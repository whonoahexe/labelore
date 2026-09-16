/** debug/loading-state-regression — the loading signal behind the shell's route-transition top bar.
 *
 * quick-260916-o2o (O2O-03) originally drove that bar purely as app-shell.tsx's `<Suspense
 * fallback>`. That wiring could only ever paint on the *initial* load: React renders a Suspense
 * fallback when the boundary MOUNTS, but react-router v8 runs every in-app navigation inside
 * `React.startTransition`, and during a transition React deliberately keeps an already-mounted
 * boundary's current children on screen rather than swapping in its fallback. Measured 2026-09-16:
 * with a route chunk held for 2500 ms, a hard load showed the bar at t=432 ms while a client-side
 * navigation to the same URL never showed it at all — in both the dev and production builds.
 *
 * `useNavigation()` is not the answer either: react-router 8.3.0 short-circuits `completeNavigation`
 * before it ever publishes a `loading` navigation when no matched route declares a loader or
 * middleware (router.js:693), which is every route in this app — and a `React.lazy` chunk download
 * happens in React's render phase, invisible to the router's navigation lifecycle regardless.
 *
 * So the signal comes from the lazy factory itself. `trackRouteChunk` wraps each factory
 * (app-router.tsx) and counts chunks in flight here; `RouteProgress` (route-progress.tsx) renders
 * from this store ABOVE the Suspense boundary, where it is already committed and therefore free to
 * repaint while the boundary below it is suspended. The bar lands over the still-visible previous
 * page — the intended top-bar-loader behaviour, and no blank flash.
 *
 * This is a plain `.ts` module, deliberately: it is module state plus pure functions with no JSX
 * and no DOM, so `test/web/route-chunk-store.test.ts` can import it directly under
 * tsconfig.server.json without that config having to grow `jsx`/DOM settings it should not have.
 */

let chunksInFlight = 0;
const listeners = new Set<() => void>();

function emit(): void {
  // The counter is incremented from inside the `React.lazy` factory, which React invokes during
  // render. Notifying subscribers synchronously there would be a set-state-during-render of a
  // different component; a microtask defers it past the current render pass while still landing
  // far inside the 150 ms debounce window.
  queueMicrotask(() => {
    for (const listener of listeners) listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isLoadingSnapshot(): boolean {
  return chunksInFlight > 0;
}

/** The `subscribe`/`getSnapshot` pair `RouteProgress` hands to `useSyncExternalStore`, exposed as
 * one object so the tracking behaviour can be driven directly in a test with no DOM and no React
 * renderer. The original regression shipped green because this file's only coverage was
 * source-text pinning, which cannot tell a working signal from a broken one. */
export const routeChunkStore = { subscribe, getSnapshot: isLoadingSnapshot };

/** Wraps a `React.lazy` factory so the shell's progress bar knows a route chunk is in flight.
 * `React.lazy` memoizes the promise, so an already-loaded route never re-enters this and never
 * re-shows the bar — which is correct: there is nothing to wait for. The decrement is in a
 * `finally` so a chunk that 404s cannot strand the bar on screen forever. */
export function trackRouteChunk<T>(load: () => Promise<T>): () => Promise<T> {
  return async () => {
    chunksInFlight += 1;
    emit();
    try {
      return await load();
    } finally {
      chunksInFlight -= 1;
      emit();
    }
  };
}
