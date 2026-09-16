import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** quick-260916-o2o (O2O-03): the single Suspense fallback for app-shell.tsx's lazy-loaded
 * Outlet, replacing the former text-based fallback. On a loopback-only server a route chunk
 * normally resolves in well under a frame — showing a bar immediately would flash on every
 * navigation, so the bar is debounced behind `ROUTE_PROGRESS_DELAY_MS`. Because this component is
 * itself the Suspense fallback, React unmounts it the instant the chunk resolves — that unmount's
 * cleanup IS the whole debounce, no other bookkeeping needed. */
export const ROUTE_PROGRESS_DELAY_MS = 150;

export function RouteProgress(): React.JSX.Element {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), ROUTE_PROGRESS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="page-stack" aria-busy="true">
      {visible ? (
        <>
          <span className="sr-only" role="status" aria-live="polite">
            Loading
          </span>
          {createPortal(
            // .shell-content is a `position: relative` stacking context (z-index: 1), so a
            // `position: fixed` bar rendered inside the Outlet could never paint above the sticky
            // header no matter its own z-index — the portal escapes to document.body instead.
            <div className="route-progress" aria-hidden="true">
              <span className="route-progress-bar" />
            </div>,
            document.body,
          )}
        </>
      ) : null}
    </main>
  );
}
