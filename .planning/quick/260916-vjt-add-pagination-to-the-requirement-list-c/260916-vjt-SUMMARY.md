---
phase: quick-260916-vjt
plan: 01
subsystem: ui
tags: [react, pagination, roadmap-page, css-tokens]

requires: []
provides:
  - "Pure generic paginate() helper (src/web/pages/list-pagination.ts) reusable for any future list needing a page window"
  - "Per-phase requirement pagination on the roadmap page, 4 cards per page, styled via the dashboard's shared pagination rule set"
affects: [roadmap-page, dashboard-page, globals.css]

actuals:
  tokens: 4663
  tasks: 3
  commits: 2
plan_head_before: 8603d5e6a02734c4cf1cb4c30d9a1cd4d69dc073

tech-stack:
  added: []
  patterns:
    - "Pure page-window helper (src/web/pages/list-pagination.ts) mirrors the scroll-settle.ts extracted-web-logic seam: no React import, Node-testable, generic over element type"
    - "New pagination styling is added by comma-grouping selectors onto an existing rule set rather than duplicating a parallel block, keeping token-guard's allowlist untouched"

key-files:
  created:
    - src/web/pages/list-pagination.ts
    - test/web/list-pagination.test.ts
    - test/web/requirement-pagination-contract.test.ts
  modified:
    - src/web/pages/roadmap-page.tsx
    - src/web/styles/globals.css

key-decisions:
  - "paginate() lives as a standalone module rather than inline in roadmap-page.tsx, matching the project's established pure-helper-plus-source-assertion pattern (scroll-settle.ts) since the vitest config is Node-only with no jsdom/render testing available"
  - "CSS reuse achieved via comma-grouped selectors extending .attention-pagination's existing rules rather than a duplicate .requirement-pagination block, per the plan's explicit 'no new CSS value' constraint"

requirements-completed: [VJT-01, VJT-02, VJT-03]

coverage:
  - id: D1
    description: "Roadmap requirement list shows at most 4 cards per phase with working prev/next controls, per-phase independent state, and out-of-range page state clamped to a real page"
    requirement: VJT-01
    verification:
      - kind: unit
        ref: "test/web/list-pagination.test.ts#paginate (12 cases: empty/exact-multiple/remainder/below-range/above-range/generic)"
        status: pass
      - kind: automated_ui
        ref: "playwright script against fixtures/dense with a temporarily widened Phase 1 requirement list (5 IDs): confirmed 4 cards on page 1, 'Showing 1-4 of 5', prev disabled, next click reveals card 5 with next disabled, and Phase 2's independent nav (2 requirements, no nav rendered) unaffected"
        status: pass
    human_judgment: false
  - id: D2
    description: "Controls carry real focusable buttons with screen-reader labels, per-phase distinct accessible names, and match the dashboard's Needs-attention pagination visual language with no new CSS value introduced"
    requirement: VJT-02
    verification:
      - kind: unit
        ref: "test/web/requirement-pagination-contract.test.ts (8 cases pinning the grouped-selector arrangement across all 8 sites, including the media-query override)"
        status: pass
      - kind: unit
        ref: "test/token-guard.test.ts and test/web/visual-contract.test.ts — both green, no assertion edited"
        status: pass
      - kind: automated_ui
        ref: "playwright screenshots in both dark and light theme (toggled via the in-app theme button) confirmed identical button geometry, disabled-opacity, and counter styling to the dashboard's attention-pagination"
        status: pass
    human_judgment: false
  - id: D3
    description: "A phase declaring 4 or fewer requirements renders exactly as before, with no nav element and no visual change"
    requirement: VJT-03
    verification:
      - kind: unit
        ref: "test/web/list-pagination.test.ts#'3 items, page 1, size 4 — all visible on a single page'"
        status: pass
      - kind: automated_ui
        ref: "playwright check against fixtures/dense Phase 2 (2 requirements): requirement-pagination nav count is 0"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-16
status: complete
---

# Quick 260916-vjt: Paginate the roadmap requirement list, 4 at a time Summary

**Per-phase requirement pagination on the roadmap page (4 cards/page) built on a new pure `paginate()` helper and styled by comma-grouping selectors onto the dashboard's existing pagination rule set — zero new CSS values.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-16T17:30:53Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified — `list-pagination.ts` and `requirement-pagination-contract.test.ts` are new)

## Accomplishments

- New `src/web/pages/list-pagination.ts`: a pure, generic `paginate<T>(items, page, pageSize)` helper that clamps out-of-range/negative page requests into `[1, totalPages]` and reports 1-based `start`/`end` window bounds, collapsing to `0`/`0` on an empty list.
- `PhaseFlow` in `roadmap-page.tsx` now holds its own `requirementPage` state per phase (via `useState` inside the per-phase component, so `MilestoneTree`'s `key={phase.key}` remounting already gives every phase an independent window) and renders only the current 4-item slice, with a `requirement-pagination` nav (accessible name `Requirements pagination for Phase {number}`) that appears only when a phase declares more than 4 requirements.
- `globals.css`'s existing `.attention-pagination` rule set (base layout, actions wrapper, page-status counter, button geometry/hover/disabled/svg states, and the narrow-viewport override) was extended to also match `.requirement-pagination`/`.requirement-pagination-actions`/`.requirement-page-status` via comma-grouped selectors — no declaration body changed, no new value introduced.
- New `test/web/requirement-pagination-contract.test.ts` pins the grouped-selector arrangement at all 8 sites (kept separate from the already-dirty `visual-contract.test.ts`, per plan instruction).

## Task Commits

Each task was committed atomically:

1. **Task 1: Page the requirement list end-to-end at four per page** - `047cdd6` (feat)
2. **Task 2: Give the controls the dashboard's appearance without adding a single CSS value** - `85c675f` (feat)
3. **Task 3: Full-suite regression sweep and visual confirmation** - no commit (verification-only task; the gate was already green, no code changes required)

**Plan metadata:** committed separately by the orchestrator after this SUMMARY is written.

## Files Created/Modified

- `src/web/pages/list-pagination.ts` - Pure generic page-window helper with clamping
- `test/web/list-pagination.test.ts` - Unit coverage of the helper's boundaries plus source-wiring assertions against roadmap-page.tsx
- `src/web/pages/roadmap-page.tsx` - PhaseFlow requirement section rewired to a paged 4-item window with per-phase state and prev/next nav
- `src/web/styles/globals.css` - Attention-pagination rule set extended to cover requirement-pagination class names via comma-grouped selectors (8 sites)
- `test/web/requirement-pagination-contract.test.ts` - Stylesheet-source assertions pinning the grouped-selector arrangement

## Decisions Made

- `paginate()` extracted as a standalone Node-testable module (no React import) rather than inlined in `PhaseFlow`, following the `scroll-settle.ts` precedent, since this project's vitest config has no jsdom/render testing.
- Styling reuse implemented via selector grouping rather than a duplicate CSS block, satisfying the plan's explicit "no new CSS value" constraint and keeping `token-guard.test.ts`'s allowlist unaffected (declarations are unchanged, only selector lists grew).

## Deviations from Plan

None - plan executed exactly as written. Task 3's regression sweep found nothing to fix: `npm test` (732 tests), `npm run typecheck`, `npm run lint`, and `npx prettier --check` on the four non-CSS touched files all passed clean on the first run.

**Note on `globals.css` and prettier:** `npx prettier --check` on the full `src/web/styles/globals.css` reports a diff, but it is entirely attributable to content that predates this plan — the font-family stack wrap point, the pre-existing uncommitted scrollbar `:is()` selector reformatting, and one `transition` shorthand line inside the (already-existing, now-grouped) `.attention-pagination button` rule that was already present and already non-compliant before this plan started (confirmed by running `prettier --check` against the pre-plan baseline at commit `810b218`, which fails identically). Per the plan's explicit instruction to leave the pre-existing uncommitted scrollbar hunks untouched, and per the deviation-rules scope boundary (only auto-fix issues directly caused by this task's own changes), this pre-existing formatting gap was left as found rather than auto-fixed. None of the lines this plan actually authored are non-compliant — confirmed by running `prettier --check` against only the four non-CSS files this plan touched, which passes clean.

## Issues Encountered

None. The dev server for the visual-confirmation pass was launched on a scratch port (4322) against `fixtures/dense`, with `fixtures/dense/.planning/ROADMAP.md` temporarily widened to 5 requirement IDs on Phase 1 to exercise the paginated state, then reverted via `git checkout --` and diff-confirmed byte-identical to its pre-edit backup before the server was stopped.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `paginate()` helper is generic and can be reused by any future list on this dashboard that needs the same fixed-height windowing treatment.
- No blockers or concerns for future work.

---
*Phase: quick-260916-vjt*
*Completed: 2026-09-16*

## Self-Check: PASSED

All created files (`src/web/pages/list-pagination.ts`, `test/web/list-pagination.test.ts`, `test/web/requirement-pagination-contract.test.ts`, this SUMMARY) confirmed present on disk. Both task commits (`047cdd6`, `85c675f`) confirmed present in git history.
