# Quick Task 260916-o2o: remove all the loading state text, keep the skeletons and add a top bar load - Context

**Gathered:** 2026-09-16
**Status:** Ready for planning

<domain>
## Task Boundary

Remove all loading state text, keep the skeletons and add a top bar loader.

</domain>

<decisions>
## Implementation Decisions

### Text-only screens (no skeleton)
- `artifact-page.tsx` ("Loading the document…") and `plan-pair-page.tsx` ("Loading plan review…") currently render loading text with no skeleton at all.
- Decision: add a matching skeleton block to both, consistent with the existing skeletons in dashboard-page.tsx (`.dashboard-loading`), roadmap-page.tsx / traceability-page.tsx / search-page.tsx (`.roadmap-loading`).

### Top bar loader scope
- Decision: route-navigation only. The top bar loader replaces `app-shell.tsx`'s `PageLoadingFallback` — the `Suspense` fallback wrapping route transitions (`app-shell.tsx:31-38`, mounted at `app-shell.tsx:116`).
- Per-page data-fetch loading states (dashboard/roadmap/traceability/search/artifact/plan-pair `isPending` branches) are NOT wired to the top bar loader — their skeletons remain the sole in-page loading signal, just with the eyebrow/h1 text stripped out.

### Top bar loader behavior
- Claude's discretion (user selected "You decide").
- Recommended default: indeterminate animated sweep bar, debounced ~150ms before showing, so it doesn't flash on the sub-frame loads `app-shell.tsx`'s existing comment (lines 28-30) already describes as the common case for this loopback-only server.

### Claude's Discretion
- Exact debounce timing, animation easing, and bar height/placement (top bar loader visual behavior).
- Skeleton markup/shape for artifact-page.tsx and plan-pair-page.tsx (should visually match the existing `.dashboard-loading` / `.roadmap-loading` skeleton conventions, adapted to each page's content shape).

</decisions>

<specifics>
## Specific Ideas

Current loading states found in the codebase (as of this task, before changes):
- `dashboard-page.tsx:78-90` — `DashboardLoading()`: eyebrow "Situational awareness" + h1 "Reading the current position…" + `.dashboard-loading` skeleton spans. Remove the `<p className="eyebrow">` and `<h1>`, keep the skeleton div.
- `roadmap-page.tsx:255-263` — eyebrow "Execution map" + h1 "Reading the roadmap…" + `.roadmap-loading` skeleton div. Remove text, keep skeleton.
- `traceability-page.tsx:160-168` — eyebrow "Requirement coverage" + h1 "Reading the traceability view…" + `.roadmap-loading` skeleton div. Remove text, keep skeleton.
- `search-page.tsx:154-162` — eyebrow "Findability" + h1 "Searching…" + `.roadmap-loading` skeleton div. Remove text, keep skeleton. (Note: `search-page.tsx:178-186`'s "Indexing…" state is a distinct empty-state, not a loading-skeleton state — out of scope unless it clearly reads as a loading state too; use judgment.)
- `artifact-page.tsx:374-380` — eyebrow "Artifact reading" + h1 "Loading the document…", no skeleton. Remove text, add a new skeleton.
- `plan-pair-page.tsx:98-103` — h1 "Loading plan review…", no eyebrow, no skeleton. Remove text, add a new skeleton.
- `app-shell.tsx:31-38` — `PageLoadingFallback()`: eyebrow "Loading" + h1 "Opening view…", explicitly documented as having "no skeleton chrome" by design. This is the one being replaced by the new top bar loader — remove the text-based fallback content and drive a top bar loader component instead (still needs an accessible `role="status"`/`aria-live` equivalent since the current fallback carries that on its `<main>`).

Existing skeleton CSS lives at `src/web/styles/globals.css:1790-1804+` (`.dashboard-loading`, `.roadmap-loading` shared rules) — new skeletons for artifact-page/plan-pair-page should follow the same class-naming and rule-sharing pattern rather than introducing a divergent skeleton style.

Styling convention for this project (not stated elsewhere in this repo's docs, but an established pattern in `globals.css`): always use `var(--space/fs/lh/ls/fw/font/color-*)` design tokens for spacing, type, and color — never raw values. Add a new token if the top bar loader needs one not yet defined; don't hardcode a one-off value.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>
