import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { routeChunkStore } from './route-chunk-store.ts';

/** debug/loading-state-regression: the visible half of the route-transition top bar. The loading
 * SIGNAL lives in route-chunk-store.ts (see that file's header for why it cannot come from this
 * Suspense boundary, nor from `useNavigation()`); this component only subscribes to it and draws.
 *
 * On a loopback-only server a cached chunk resolves in well under a frame, so the bar stays
 * debounced behind `ROUTE_PROGRESS_DELAY_MS` to avoid flashing on every navigation. */
export const ROUTE_PROGRESS_DELAY_MS = 150;

/** The placeholder that keeps the outlet's layout box while a chunk loads. Deliberately empty —
 * the visible feedback is `RouteProgress`, which now paints during navigations too. */
export function RouteFallback(): React.JSX.Element {
  return <main className="page-stack" aria-busy="true" />;
}

export function RouteProgress(): React.JSX.Element | null {
  const loading = useSyncExternalStore(
    routeChunkStore.subscribe,
    routeChunkStore.getSnapshot,
    routeChunkStore.getSnapshot,
  );
  const [debouncePassed, setDebouncePassed] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setDebouncePassed(true), ROUTE_PROGRESS_DELAY_MS);
    // Resetting in the cleanup (rather than in the effect body, which would be a synchronous
    // cascading setState) is what re-arms the debounce for the next navigation.
    return () => {
      clearTimeout(timer);
      setDebouncePassed(false);
    };
  }, [loading]);

  // Guarding on `loading` here as well as on the debounce means the bar disappears in the same
  // render that the chunk resolves, rather than surviving until the cleanup runs.
  if (!loading || !debouncePassed) return null;

  // .shell-content is a `position: relative` stacking context (z-index: 1), so a `position: fixed`
  // bar rendered inside the shell's content column could never paint above the sticky header no
  // matter its own z-index — the portal escapes to document.body instead.
  return createPortal(
    <>
      <span className="sr-only" role="status" aria-live="polite">
        Loading
      </span>
      <div className="route-progress" aria-hidden="true">
        <span className="route-progress-bar" />
      </div>
    </>,
    document.body,
  );
}
