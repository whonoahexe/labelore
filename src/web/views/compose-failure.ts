// The shared way a view composer reports that it threw (G-11-2, L2B-WR-03). The pause, spikes and indexes composers
// guard their whole body so a malformed lift cannot take the page down: the page falls back to the plain document.
// Falling back silently made a regression look like the feature simply not appearing, so the guard now says so once,
// in every build: a throw inside a composer is a programming error (each one reads malformed lift fields as empty
// without throwing), the console is the local user's own, and nothing is sent anywhere. Pure apart from that one
// call; it holds no state.

/** Writes one console line naming `view` and carrying `error`, and returns null so the caller can `return` it. */
export function composeFailed(view: string, error: unknown): null {
  console.error(`The ${view} page could not be composed; showing the document instead.`, error);
  return null;
}
