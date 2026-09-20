// Pure, DOM-free reading-position picker (READ-07, D-13). The IntersectionObserver hook
// (`use-active-section.ts`) is the only caller — this module owns none of the DOM plumbing so it
// can be exercised directly with vitest, no jsdom, mirroring the `scroll-settle.ts` seam.

/**
 * Chooses which outline entry is "active" from three pure inputs: the outline's own entry order,
 * the set of ids currently visible (intersecting the observation band), and the previously active
 * id. Adjacency rule (READ-07): when two or more entries are visible at once, the one that comes
 * first in `order` wins — never re-sorted by visibility. Empty rule (READ-07): with nothing
 * visible, the previous entry stays active if it is still a member of `order`; otherwise the first
 * entry in `order` takes over (or `null` when `order` is itself empty).
 */
export function pickActiveEntry(
  order: readonly string[],
  visible: ReadonlySet<string>,
  previous: string | null,
): string | null {
  for (const id of order) {
    if (visible.has(id)) return id;
  }
  if (previous !== null && order.includes(previous)) return previous;
  return order[0] ?? null;
}

/**
 * D-13 planner discretion: a section counts as "being read" once any part of it crosses a band
 * that starts 10% down the viewport and extends to 70% down (i.e. ends 30% from the bottom). The
 * generous negative bottom margin keeps a long section active until the next one actually enters
 * the band, rather than flipping the instant the next heading appears at the very bottom edge.
 */
export const ACTIVE_SECTION_ROOT_MARGIN = '-10% 0px -70% 0px';
export const ACTIVE_SECTION_THRESHOLD = 0;
