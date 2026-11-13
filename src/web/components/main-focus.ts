// The shared "focus the main content once the next project's shell has mounted" request (Phase 8 D-06,
// Phase 13 D-15). Choosing a row of another project - in the header switcher or in the quick-jump palette -
// sets it; the switcher that mounts in that project's shell consumes it and moves focus once. The whole shell is
// keyed by slug, so the control that was used is gone by then and cannot do it itself.

/** Set when a row of another project is chosen, cleared when the next shell consumes it. */
let focusMainOnNextMount = false;

/** Asks the next project shell to move focus to the main content when it mounts. */
export function requestMainFocusOnNextMount(): void {
  focusMainOnNextMount = true;
}

/** True once after a request was made, then false until the next one. */
export function consumeMainFocusRequest(): boolean {
  const requested = focusMainOnNextMount;
  focusMainOnNextMount = false;
  return requested;
}

/** The main content landmark, made focusable on demand: it is a plain region, so it takes focus only
 * when asked to, and never joins the tab order (tabindex -1). */
export function mainContent(): HTMLElement | null {
  const main = document.getElementById('main-content');
  if (main && !main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  return main;
}

export function focusMainContent(): void {
  mainContent()?.focus({ preventScroll: true });
}
