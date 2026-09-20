import { useEffect, useState } from 'react';
import {
  ACTIVE_SECTION_ROOT_MARGIN,
  ACTIVE_SECTION_THRESHOLD,
  pickActiveEntry,
} from '../views/active-section.ts';

/**
 * Tracks which outline entry is currently being read via a single `IntersectionObserver` over the
 * elements named by `ids` (READ-07, D-13). One hook, two id lists (D-11): Source mode passes
 * rendered heading ids, View mode passes `view-block-N` / `view-remainder` ids — the hook itself
 * has no opinion on which.
 *
 * Visual only — this hook never reads or writes `location`, `history`, or the URL hash (Phase 2
 * D-16). Because `DocumentView` mutates its subtree after mount (Mermaid replaces `<pre>` nodes
 * with `<svg>`), this hook observes the wrapper elements the readers themselves own (rendered
 * headings, `section.view-block`, `details#view-remainder`) rather than anything Mermaid might
 * later replace.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || ids.length === 0) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        setActive((previous) => pickActiveEntry(ids, visible, previous));
      },
      { rootMargin: ACTIVE_SECTION_ROOT_MARGIN, threshold: ACTIVE_SECTION_THRESHOLD },
    );

    for (const element of elements) observer.observe(element);

    return () => observer.disconnect();
    // `ids` is compared by its joined value, not by reference — callers (ArtifactReader,
    // ViewReader) pass a freshly-mapped array on every render, so a reference-identity
    // dependency would re-run this effect (and re-create the observer) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('\u0000')]);

  return active;
}
