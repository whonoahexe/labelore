// Pure, generic page-window helper — clamps the requested page into range and returns the visible
// slice plus the 1-based window bounds used for display. No React import, no side effects, so this
// module stays importable by a Node-only vitest file (mirrors the scroll-settle.ts extraction).

export interface PageWindow<T> {
  /** The items visible on the resolved page. */
  items: T[];
  /** The resolved (clamped) 1-based page number. */
  page: number;
  /** Total number of pages; `0` when `items` is empty. */
  totalPages: number;
  /** 1-based index of the first visible item; `0` when `items` is empty. */
  start: number;
  /** 1-based index of the last visible item; `0` when `items` is empty. */
  end: number;
  /** Total number of items across all pages. */
  total: number;
}

/**
 * Slices `items` into a single page of at most `pageSize` elements. `page` is clamped into
 * `[1, totalPages]` (guarding the zero-total case), so an out-of-range or non-positive page can
 * never produce an empty result when items exist.
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): PageWindow<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const resolvedPage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const startIndex = (resolvedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const slice = items.slice(startIndex, endIndex);

  return {
    items: slice,
    page: resolvedPage,
    totalPages,
    start: total === 0 ? 0 : startIndex + 1,
    end: total === 0 ? 0 : endIndex,
    total,
  };
}
