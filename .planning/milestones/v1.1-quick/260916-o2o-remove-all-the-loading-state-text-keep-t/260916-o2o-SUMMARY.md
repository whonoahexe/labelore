---
phase: quick-260916-o2o
plan: 01
subsystem: ui
tags: [react, loading-state, accessibility, css-tokens, suspense]

requires:
  - phase: quick-260910-jz8
    provides: centralized spacing/type/color design tokens and test/token-guard.test.ts

provides:
  - copy-free pending branches (skeleton-only) across dashboard, roadmap, traceability and search pages
  - real skeletons for artifact-page and plan-pair-page, sharing the existing skeleton CSS rule groups
  - RouteProgress — a debounced (150ms), portal-mounted top bar loader replacing app-shell.tsx's text Suspense fallback
  - test/web/loading-state-contract.test.ts — source-text regression guard pinning the copy removal and the surviving accessibility contract

affects: [dashboard-page.tsx, roadmap-page.tsx, traceability-page.tsx, search-page.tsx, artifact-page.tsx, plan-pair-page.tsx, app-shell.tsx, route-progress.tsx, globals.css]

actuals:
  tokens: 5180
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Suspense fallback debounce via a mount-effect's clearTimeout cleanup — Suspense unmounts the fallback the instant the chunk resolves, so that cleanup IS the whole debounce, no separate cancellation flag needed"
    - "createPortal escape from a `position: relative` stacking-context ancestor (.shell-content, z-index:1) so a fixed-position element can paint above a sticky header despite DOM nesting"
    - "Shared skeleton CSS rule groups extended via a growing compound comma-selector (.dashboard-loading, .roadmap-loading, .artifact-loading, .plan-pair-loading) rather than parallel per-page rules"

key-files:
  created:
    - src/web/components/route-progress.tsx
    - test/web/loading-state-contract.test.ts
  modified:
    - src/web/pages/dashboard-page.tsx
    - src/web/pages/roadmap-page.tsx
    - src/web/pages/traceability-page.tsx
    - src/web/pages/search-page.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/pages/plan-pair-page.tsx
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - test/web/build-splitting.test.ts

key-decisions:
  - "Sliced each pending branch for the contract test via an isPending -> isError source-text window, additionally resolving dashboard-page.tsx's factored-out DashboardLoading() function by name so its skeleton markup is covered even though it sits above the isPending check"
  - "Generalized visual-contract.test.ts's line-based ruleBlocks helper into a comment-stripping, comma-selector-aware ruleBlocksContaining, since the shared skeleton rule group's selector list grows across all three tasks"
  - ".route-progress-bar uses a single var(--primary) colour value with no color-mix() recipe, keeping clear of the token guard's recurring/duplicate-recipe rule"
  - "Deferred the plan's task-3 <human-check> (live route-transition sweep + reduced-motion toggle) per workflow.human_verify_mode: end-of-phase — recorded as WINDOWS.md entry #8 (unrun-verify) rather than blocking task completion, since no checkpoint task was authored in this plan"

requirements-completed: [O2O-01, O2O-02, O2O-03]

coverage:
  - id: D1
    description: "Loading copy removed from the four already-skeletoned pending branches (dashboard/roadmap/traceability/search); skeleton geometry, aria-busy and a polite sr-only status all retained; the orphaned --space-12 token dropped"
    requirement: "O2O-01"
    verification:
      - kind: unit
        ref: "test/web/loading-state-contract.test.ts#keeps skeleton geometry and drops the eyebrow/headline copy from every pending branch"
        status: pass
      - kind: unit
        ref: "test/web/loading-state-contract.test.ts#drops the skeleton top offset and the now-orphaned --space-12 token together"
        status: pass
      - kind: unit
        ref: "test/token-guard.test.ts (full suite — 6 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "artifact-page and plan-pair-page render pulsing skeletons (instead of text-only pending states), built from the shared .dashboard-loading/.roadmap-loading rule groups rather than a divergent style"
    requirement: "O2O-02"
    verification:
      - kind: unit
        ref: "test/web/loading-state-contract.test.ts#gives artifact and plan-pair pages skeletons built from the shared skeleton rule groups"
        status: pass
    human_judgment: false
  - id: D3
    description: "RouteProgress — a debounced, portal-mounted top bar loader — replaces app-shell.tsx's text Suspense fallback; layered above the sticky header and toast viewport, below the drawer/dialog layer; static under prefers-reduced-motion"
    requirement: "O2O-03"
    verification:
      - kind: unit
        ref: "test/web/loading-state-contract.test.ts#debounces, portals and cleans up the route-transition top bar loader"
        status: pass
      - kind: unit
        ref: "test/web/loading-state-contract.test.ts#layers the route-progress bar above the header and neutralizes it under reduced motion"
        status: pass
      - kind: unit
        ref: "test/web/build-splitting.test.ts#wraps the routed Outlet in a Suspense boundary with a real fallback element"
        status: pass
    human_judgment: true
    rationale: "Plan's task 3 <verify> block includes a <human-check> (live visual confirmation that the bar sweeps above the header on a slow chunk, stays invisible on a fast one, and is static under OS reduced-motion). Source-text contract tests prove the debounce/portal/reduced-motion-CSS shape exists but cannot observe rendered timing or motion; deferred per workflow.human_verify_mode: end-of-phase and recorded as WINDOWS.md entry #8."

duration: 9min
completed: 2026-09-16
status: complete
---

# Quick 260916-o2o: Remove loading-state text, keep the skeletons, add a top bar loader Summary

**Stripped every visible loading headline from six routed pages and the shell's Suspense fallback, gave artifact/plan-pair pages real skeletons sharing the existing skeleton CSS, and replaced the text-based route-transition fallback with a debounced, portal-mounted top bar (`RouteProgress`).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-16T12:09:05Z
- **Completed:** 2026-09-16T12:18:00Z
- **Tasks:** 3 (all completed)
- **Files modified:** 11 (2 created, 9 modified)

## Accomplishments

- Removed the eyebrow/`<h1>` copy from `DashboardLoading()`, `RoadmapPage`, `TraceabilityPage` and `SearchPage`'s pending branches, keeping the pulsing skeleton geometry and adding a `sr-only role="status" aria-live="polite"` span so screen readers still get an announcement.
- Dropped the skeleton rule's now-meaningless `margin-top: var(--space-12)` and the orphaned `--space-12` token itself, keeping `test/token-guard.test.ts` green.
- Gave `artifact-page.tsx` and `plan-pair-page.tsx` real skeletons (`.artifact-loading`, `.plan-pair-loading`) by extending the existing `.dashboard-loading`/`.roadmap-loading` shared CSS rule groups rather than writing parallel rules, plus a `span:last-child` height override on each suggesting their resolved shape (metadata above a long document; header above stacked panels).
- Built `RouteProgress` (`src/web/components/route-progress.tsx`): a 150ms-debounced, `createPortal`-mounted top bar that is the shell's single Suspense fallback, replacing the former `PageLoadingFallback` text screen. The debounce is just the mount-effect's `clearTimeout` cleanup — Suspense unmounts the fallback the instant the chunk resolves, so no separate cancellation bookkeeping is needed.
- Added `.route-progress`/`.route-progress-bar` CSS: fixed, `z-index: 40` (above the header's 20 and the toast viewport's 30, below the drawer/dialog layer's 60-71), a single `var(--primary)` sweep, and a `prefers-reduced-motion: reduce` override that goes full-width and static.
- Wrote `test/web/loading-state-contract.test.ts`, a source-text regression suite (region-scoped pending-branch slicing, a comment-stripping/comma-selector-aware CSS rule-block extractor) covering all six pages plus the shell across all three tasks — 7 tests, all passing.
- Updated `test/web/build-splitting.test.ts`'s Suspense-boundary pin to the new `<Suspense fallback={<RouteProgress />}>` shape.

## Task Commits

1. **Task 1: Strip loading copy from the four skeleton-backed pages and re-seat the skeleton offset** - `1bf0e51` (feat)
2. **Task 2: Give artifact and plan-pair pages real skeletons** - `b606219` (feat)
3. **Task 3: Replace the Suspense text fallback with a debounced top bar route loader** - `41a4c4e` (feat)

**Plan metadata:** Not committed (per quick task constraints, docs commit handled separately by the orchestrator).

## Files Created/Modified

- `src/web/components/route-progress.tsx` - New: `RouteProgress` component and `ROUTE_PROGRESS_DELAY_MS` constant
- `test/web/loading-state-contract.test.ts` - New: source-text contract pinning the copy removal and accessibility contract across all six pages and the shell
- `src/web/pages/dashboard-page.tsx` - `DashboardLoading()` drops eyebrow/h1, adds sr-only status span
- `src/web/pages/roadmap-page.tsx` - Pending branch drops eyebrow/h1, adds sr-only status span
- `src/web/pages/traceability-page.tsx` - Pending branch drops eyebrow/h1, adds sr-only status span
- `src/web/pages/search-page.tsx` - Pending branch (`isPending`, not the empty-query branch) drops eyebrow/h1, adds sr-only status span
- `src/web/pages/artifact-page.tsx` - Pending branch gains `.artifact-loading` skeleton + sr-only status span
- `src/web/pages/plan-pair-page.tsx` - Pending branch gains `.plan-pair-loading` skeleton + sr-only status span
- `src/web/components/app-shell.tsx` - Deletes `PageLoadingFallback`; imports and wires `RouteProgress` as the Suspense fallback
- `src/web/styles/globals.css` - Skeleton rule groups extended with artifact/plan-pair classes; `margin-top`/`--space-12` dropped; new `.route-progress`/`.route-progress-bar`/`@keyframes route-progress-sweep` rules plus a reduced-motion override
- `test/web/build-splitting.test.ts` - Suspense-boundary assertion updated to the `RouteProgress` shape

## Decisions Made

See `key-decisions` in frontmatter — summarized: the pending-branch test slicer resolves dashboard-page's factored-out loading function by name; the CSS rule-block test helper was generalized (comment-stripped, comma-selector-aware) to track the shared skeleton group's growing selector list across tasks; the route bar uses one bare `var(--primary)` value (no `color-mix()`); and the plan's task-3 human-check was deferred per `human_verify_mode: end-of-phase` rather than blocking task completion.

## Deviations from Plan

None — plan executed exactly as written. (One self-caught adjustment during task 3, corrected before commit: the first draft of `route-progress.tsx`'s doc comment named the old `PageLoadingFallback` function, which the plan's own acceptance criteria forbid — reworded before verification/commit, not tracked as a deviation since it never reached a commit.)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three tasks complete; full `npm test` (696 tests), `npm run typecheck`, `npm run lint`, and `npm run build` all pass.
- One outstanding manual verification: task 3's `<human-check>` (visually confirm the top bar's debounce/sweep/reduced-motion behavior against a live dev server). Recorded as `.planning/WINDOWS.md` entry #8 (`unrun-verify`, open) rather than blocking — the user can start the dev server and click between Dashboard/Roadmap/Traceability, and toggle OS reduce-motion, to close it out.

---
*Phase: quick-260916-o2o*
*Completed: 2026-09-16*

## Self-Check: PASSED

All created files found on disk (`src/web/components/route-progress.tsx`, `test/web/loading-state-contract.test.ts`, this SUMMARY.md); all three task commits (`1bf0e51`, `b606219`, `41a4c4e`) present in `git log --oneline --all`; `status: complete` set.
