---
phase: 02-situational-awareness-artifact-reading
plan: 07
subsystem: dashboard
tags: [dashboard, routing, presentation, gap-closure, tdd]

# Dependency graph
requires:
  - phase: 02-situational-awareness-artifact-reading (plan 02)
    provides: buildDashboardViewModel, NextWorkItem selectors, buildPhaseUrl/routes.ts identity helpers
provides:
  - phaseWork() and blockerWork() next-work items that emit router-resolvable buildPhaseUrl routes
  - dashboard test fixtures grounded in phaseKeyOf/milestoneKeyOf instead of opaque literal strings
  - computedPercent.display rounded to at most one decimal place on the public /api/dashboard contract
affects: [phase-3-web-shell, dashboard-page-rendering]

# Actuals (#2632)
actuals:
  tokens: 3059
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentation selectors that emit navigation urls import buildPhaseUrl from ./routes.ts rather than exposing raw DTO identity keys as urls (matches references.ts and roadmap.ts)."
    - "Test fixtures for identity-bearing DTOs derive their key fields from the real phaseKeyOf/milestoneKeyOf helpers instead of hand-written literal strings, so a route/identity confusion cannot silently pass the suite."

key-files:
  created: []
  modified:
    - src/presentation/dashboard.ts
    - test/presentation/dashboard.test.ts

key-decisions:
  - "Rounded computedPercent.display via toFixed(1) with the trailing '.0' stripped, so whole percentages render as '50%' and fractional ones as '28.6%' — one consistent formatting rule."
  - "Did not introduce a second URL-building helper; buildPhaseUrl remains the single canonical producer shared by dashboard.ts, references.ts, and roadmap.ts."

patterns-established:
  - "Pattern: NextWorkItem.url values are always router-resolvable destinations (buildPhaseUrl/buildPlanUrl output or the literal /roadmap), never a bare DTO identity key."

requirements-completed: [DASH-02, DASH-03]

coverage:
  - id: D1
    description: "Phase-kind next-work item's url resolves through parsePresentationUrl to the same phase identity, closing the CR-01 404 gap"
    requirement: "DASH-02"
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#phase-kind next-work url round-trips through the canonical phase-URL builder (CR-01)"
        status: pass
      - kind: manual_procedural
        ref: "curl http://127.0.0.1:4173/api/dashboard against ~/gsd-lore and ~/studio-portal; next.immediate.url begins with /milestones/"
        status: pass
    human_judgment: false
  - id: D2
    description: "Blocker-kind next-work item's url resolves to the current phase's canonical route when resolvable, and to /roadmap otherwise"
    requirement: "DASH-02"
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#blocker-kind next-work url round-trips to the current phase route when resolvable (CR-01)"
        status: pass
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#blocker-kind next-work url falls back to /roadmap when no current phase is resolvable (CR-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dashboard test fixtures derive phase/milestone keys from phaseKeyOf/milestoneKeyOf instead of opaque literal strings, closing the fixture-weakness root cause behind CR-01"
    requirement: "DASH-02"
    verification:
      - kind: unit
        ref: "npm test — 240 tests pass, up from 236 before this plan"
        status: pass
    human_judgment: false
  - id: D4
    description: "current.progress.computedPercent.display renders at most one decimal place instead of a full floating-point expansion"
    requirement: "DASH-02"
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#computedPercent.display renders at most one decimal place, never a raw float (WR-03)"
        status: pass
      - kind: manual_procedural
        ref: "curl http://127.0.0.1:4173/api/dashboard against ~/studio-portal; computedPercent.display was '96.7%'"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 07: Route dashboard next-work items through canonical phase URLs Summary

**Fixed the dashboard's primary "Next up" CTA and blocker link to emit `buildPhaseUrl`-built routes instead of bare `PhaseDto` identity keys, closing CR-01, and rounded `computedPercent.display` to one decimal place, closing WR-03.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-29T18:48:00Z
- **Completed:** 2026-08-29T18:55:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `phaseWork()` now emits `buildPhaseUrl(phase.identity)` instead of the bare `phase.key` identity segment, which no route in `app-router.tsx` registered — the "Next up" primary CTA for a phase-kind item now resolves through `parsePresentationUrl` to the roadmap phase view instead of the router's catch-all NotFound.
- `blockerWork()` now emits `buildPhaseUrl(currentPhase.identity)` when a current phase is resolvable, and the literal `/roadmap` otherwise — matching the same producer `references.ts` and `roadmap.ts` already use, so one phase never yields two different route shapes across producers.
- Rebuilt `test/presentation/dashboard.test.ts` fixtures on the real `phaseKeyOf`/`milestoneKeyOf` helpers (`LIVE_IDENTITY`/`LATER_IDENTITY`/derived keys) instead of hand-written opaque `'phase:01'`/`'phase:02'`/`'milestone:v2'` literals, closing the fixture-weakness root cause that let CR-01 ship past 236 passing tests.
- Added regression coverage for the phase-kind url round-trip, the blocker-kind url with and without a resolvable current phase, cross-producer url equality (dashboard vs. roadmap), and human-verification/plan distinctness (DASH-03 adjacency).
- Rounded `current.progress.computedPercent.display` via `toFixed(1)` with a stripped trailing `.0`, so the public `/api/dashboard` contract renders `'28.6%'` / `'50%'` instead of a full floating-point expansion (WR-03), while `computedPercent.value` stays the unrounded number.

## Task Commits

Each task was committed atomically, following the TDD RED/GREEN cycle per `tdd="true"` task:

1. **Task 1 RED: failing round-trip test for phase/blocker next-work urls** - `9f60159` (test)
2. **Task 1 GREEN: route phase and blocker next-work items through buildPhaseUrl** - `c583391` (feat)
3. **Task 2: ground dashboard fixtures in phaseKeyOf/milestoneKeyOf** - `bdab04d` (test)
4. **Task 3 RED: failing test for computedPercent.display rounding** - `9ac65e5` (test)
5. **Task 3 GREEN: round computedPercent.display to at most one decimal place** - `318d3b4` (feat)

**Plan metadata:** committed alongside this SUMMARY.md.

## Files Created/Modified
- `src/presentation/dashboard.ts` - `phaseWork()`/`blockerWork()` now emit `buildPhaseUrl` routes; new `formatPercentDisplay()` helper rounds `computedPercent.display`.
- `test/presentation/dashboard.test.ts` - Fixtures grounded in `phaseKeyOf`/`milestoneKeyOf`; new regression tests for the url round-trip, blocker fallback, cross-producer equality, human-verification distinctness, and percentage rounding.

## Decisions Made
- Formatted `computedPercent.display` with `toFixed(1)` plus a trailing-`.0` strip rather than `Math.round(x * 10) / 10` — both satisfy the `<behavior>` spec identically; `toFixed` was chosen for direct string-output clarity at the call site.
- Left `planWork()`'s `url: plan.key` and `checkpointWork()`'s `url: checkpoint.planKey` untouched — the plan's `<action>` scoped the fix to `phaseWork()` and `blockerWork()` only; those two functions' `url` fields are plan/checkpoint identity keys consumed elsewhere as identity, not as the CR-01 regression surface.

## Deviations from Plan

None - plan executed exactly as written. All three tasks (tracer/TDD, standard, TDD) followed their specified RED/GREEN cycles and acceptance criteria without requiring auto-fixes, blockers, or architectural changes.

## Issues Encountered

None. The first two `<automated>` test writes required minor fixture adjustments during authoring (an initial phase-kind test draft used a `plans: []` override that didn't reproduce the phase-selection precondition needed to make phase:02 the immediate item) — corrected before the RED-phase commit, not a deviation from the plan's specified change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Verification gap 1 (CR-01) is closed: `npm test` passes 240 tests (up from 236), `npm run typecheck`, `npm run lint`, and `npm run build` all exit clean, and live reproduction against both `~/gsd-lore` and `~/studio-portal` confirms `next.immediate.url` now begins with `/milestones/` rather than the bare `p~` identity segment.
- `npm run smoke -- fixtures/dense` passes.
- WR-03 is closed alongside it in the same file/function, as scoped by the plan.
- No shipped behavior changed outside `phaseWork`, `blockerWork`, and the `computedPercent` display string, per the plan's `<success_criteria>`.
- Ready for the next plan in Phase 2's wave sequence (02-08).

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-29*

## Self-Check: PASSED

- `src/presentation/dashboard.ts` — FOUND
- `test/presentation/dashboard.test.ts` — FOUND
- `.planning/phases/02-situational-awareness-artifact-reading/02-07-SUMMARY.md` — FOUND
- Commits `9f60159`, `c583391`, `bdab04d`, `9ac65e5`, `318d3b4`, `3bb6517` — all FOUND in `git log --oneline --all`
- Re-ran plan `<verification>`: `npm test` (240 pass, > 236 baseline), `npm run typecheck` (clean), `npm run lint` (clean), `npm run build` (succeeds), live `/api/dashboard` reproduction against `~/gsd-lore` and `~/studio-portal` (both `url` values begin with `/milestones/`), `npm run smoke -- fixtures/dense` (passes)
