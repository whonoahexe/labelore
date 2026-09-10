---
phase: 02-situational-awareness-artifact-reading
plan: 03
subsystem: ui
tags: [react, dashboard, roadmap, history, base-sera, oklch, responsive]

requires:
  - phase: 02-situational-awareness-artifact-reading
    plan: 02
    provides: 'Cycle-free ProjectPresentation, sourced DashboardViewModel, and milestone-qualified canonical routes'
provides:
  - 'Current-position-first dashboard with distinct formal and observed progress, next work, and typed attention'
  - 'Ordered vertical roadmap with wave blockers and separately labeled archived milestone trees'
  - 'Local Studio Portal preset b3Dqcuo4na visual system with resilient light/dark control and bounded overflow'
affects: [02-04, 02-05, 02-06, artifact-reading, browser-uat]

actuals:
  tokens: 22489
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - 'React pages render source-complete presentation view models and never parse planning artifacts'
    - 'Active milestone flow and archived history remain separate milestone-qualified collections'
    - 'The root .dark class is the single theme truth shared by OKLCH tokens and future document renderers'

key-files:
  created:
    - src/presentation/roadmap.ts
    - src/web/pages/dashboard-page.tsx
    - src/web/pages/roadmap-page.tsx
    - src/web/components/app-shell.tsx
    - src/web/components/theme-toggle.tsx
    - src/web/components/ui/button.tsx
    - src/web/styles/globals.css
  modified:
    - src/web/app-router.tsx
    - src/server/index.ts
    - src/web/main.tsx
    - index.html

key-decisions:
  - "Formal ROADMAP plan counts are the dashboard's sole primary progress display; observed SUMMARY counts stay compact and explicitly sourced."
  - 'Only resolved incomplete or dangling sibling plan references become blocked-by labels; authored phase dependency prose remains display-only.'
  - 'History is always subordinate to the active milestone and never participates in current status or progress presentation.'
  - 'Preset b3Dqcuo4na is adapted into local source with no runtime dependency on Studio Portal.'

patterns-established:
  - 'Roadmap projection: ProjectPresentation -> MilestoneFlow -> ordered RoadmapPhaseRow -> deterministic WaveBand'
  - 'Situational shell: immutable presentation APIs -> query-owned loading/error states -> source-labelled React hierarchy'
  - 'Containment: min-width zero at shell boundaries plus local overflow wrappers for tables, code, and Mermaid'

requirements-completed:
  [
    DASH-01,
    DASH-02,
    DASH-03,
    DASH-04,
    ROAD-01,
    ROAD-02,
    ROAD-03,
    HIST-01,
    HIST-02,
    UI-01,
    UI-02,
    UI-03,
  ]

coverage:
  - id: D1
    description: 'Active and archived milestones render as distinct ordered phase trees with deterministic waves and verbatim dependency blockers.'
    requirement: ROAD-01
    verification:
      - kind: unit
        ref: 'test/presentation/roadmap.test.ts'
        status: pass
    human_judgment: false
  - id: D2
    description: 'The dashboard leads with sourced current position and one next item, then separates formal progress, observed completion, and typed attention.'
    requirement: DASH-01
    verification:
      - kind: unit
        ref: 'test/presentation/dashboard.test.ts'
        status: pass
      - kind: integration
        ref: 'test/server/deep-links.test.ts#serves presentation, dashboard, roadmap, and history from the same snapshot identity'
        status: pass
    human_judgment: false
  - id: D3
    description: 'Dashboard and roadmap use the authorized Studio Portal visual language in responsive light and dark themes.'
    requirement: UI-01
    verification:
      - kind: integration
        ref: 'test/web/shell-contract.test.ts'
        status: pass
      - kind: e2e
        ref: 'NODE_ENV=production node src/server/index.ts . --smoke'
        status: pass
    human_judgment: true
    rationale: 'Visual hierarchy, theme appearance, and 390px/desktop behavior require the end-of-phase browser judgment owned by Plan 02-06.'
  - id: D4
    description: 'Shell boundaries contain wide tables, code, and Mermaid locally without globally clipping the document body.'
    requirement: UI-03
    verification:
      - kind: unit
        ref: 'test/web/shell-contract.test.ts#contains wide children locally without clipping the document body'
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 3: Situational Dashboard and Roadmap Shell Summary

**A sourced current-position dashboard and milestone-safe vertical roadmap now run inside the locked Studio Portal `b3Dqcuo4na` visual system, with active/history separation, deterministic plan waves, resilient theming, and responsive long-content containment.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-27T09:36:10Z
- **Completed:** 2026-08-27T09:54:27Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Added a pure roadmap view-model projection that preserves milestone identity, dotted phase order, authored dependency prose, exact formal progress, and deterministic wave bands with unresolved blockers.
- Replaced the fixture landing screen with a current-position-first dashboard, one explained immediate item, compact previews, one prioritized typed attention list, and visibly separate ROADMAP/SUMMARY signals.
- Added active and archived roadmap trees with compact always-visible phase facts, accessible in-place detail disclosures, explicit empty states, and canonical destinations for duplicate phase numbers.
- Ported the authorized OKLCH light/dark token blocks and base-sera Button locally, then polished the shell and pages around squared geometry, lucide semantics, responsive grids, and bounded wide-content scrollers.
- Exposed presentation, dashboard, roadmap, and history endpoints from the same immutable snapshot identity; the complete suite passes all 190 tests.

## Task Commits

1. **Task 1 RED: Roadmap projection regression suite** — `86cf310` (test)
2. **Task 1 GREEN: Vertical roadmap and milestone history** — `e23042c` (feat)
3. **Task 2: Sourced situational dashboard and shell** — `12a5bcb` (feat)
4. **Task 3: Authorized Studio Portal visual system** — `f9ce370` (feat)
5. **Plan verification fix: Await production server readiness** — `76e527f` (fix)

## Files Created/Modified

- `src/presentation/roadmap.ts` — active/history milestone flows, phase rows, wave bands, and exact sibling blocker projection
- `src/web/pages/dashboard-page.tsx` — D-01 through D-04 current-position hierarchy over DashboardViewModel
- `src/web/pages/roadmap-page.tsx` — accessible D-05 through D-08 vertical flow and archived disclosure trees
- `src/web/components/app-shell.tsx` — canonical navigation, visible snapshot time, loading/error status, and min-width-safe shell
- `src/web/components/theme-toggle.tsx` — storage-resilient root `.dark` theme control with decorative lucide icons
- `src/web/components/ui/button.tsx` — locally adapted base-sera Button primitive with squared geometry
- `src/web/styles/globals.css` — exact authorized tokens plus the responsive dashboard, roadmap, and containment system
- `src/server/index.ts` — single-snapshot presentation endpoints and production-listening readiness
- `test/presentation/roadmap.test.ts` / `test/web/shell-contract.test.ts` — identity, ordering, theme, navigation, and overflow contracts

## Decisions Made

React owns hierarchy and interaction only. Formal and observed progress are already distinct view-model signals before render; the roadmap similarly receives ordered milestone-qualified records and never interprets dependency prose. Archived milestones remain a deliberately subdued second section, even when their phase numbers match the active milestone. The visual source was adapted locally from preset `b3Dqcuo4na`; runtime code has no path or import back to Studio Portal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Loaded the local visual system through the browser entry point**

- **Found during:** Task 3 (Studio-portal-derived themes, components, and containment)
- **Issue:** Creating `globals.css` alone would leave the authorized tokens and containment rules outside the runtime bundle, while the no-flash initializer still followed the older fixture fallback.
- **Fix:** Imported the stylesheet from `src/web/main.tsx` and aligned `index.html` theme initialization with the authorized dark-default root-class contract.
- **Files modified:** `src/web/main.tsx`, `index.html`
- **Verification:** Build emits the local CSS bundle; shell contract tests assert the import and `.dark` initialization.
- **Committed in:** `f9ce370`

**2. [Rule 2 - Missing Critical] Added source and delivery regression checks for the UI boundary**

- **Found during:** Task 3 plan-wide verification
- **Issue:** The requested UI-01 through UI-03 source contracts and same-snapshot API delivery had no direct regression assertion in the plan-declared roadmap test file.
- **Fix:** Added a focused shell-contract suite and extended the existing deep-link integration suite across all four presentation endpoints.
- **Files modified:** `test/web/shell-contract.test.ts`, `test/server/deep-links.test.ts`
- **Verification:** 13 focused integration/source tests and the complete 190-test suite pass.
- **Committed in:** `f9ce370`

**3. [Rule 1 - Bug] Removed the production startup race exposed by smoke verification**

- **Found during:** Plan-wide production smoke
- **Issue:** `startServer()` returned the Hono Node server before its socket necessarily emitted `listening`, allowing the immediate smoke fetch to fail intermittently.
- **Fix:** Production startup now resolves only after the server reports `listening`, while preserving the existing early return when already ready.
- **Files modified:** `src/server/index.ts`
- **Verification:** `NODE_ENV=production node src/server/index.ts . --smoke` passes after a clean production build.
- **Committed in:** `76e527f`

---

**Total deviations:** 3 auto-fixed (2 missing critical integration guarantees, 1 production startup bug)
**Impact on plan:** All changes stay within the dashboard/roadmap delivery and visual-shell boundary; no deferred reader, graph, search, or write capability was added.

## Issues Encountered

The first production smoke reached the local fetch before the server was listening. The startup seam now waits for the authoritative Node event and the same smoke passes consistently.

## User Setup Required

None.

## Next Phase Readiness

- Plan 02-04 can mount the document renderer inside the established shell and reuse its local table, code, Mermaid, token, and theme boundaries.
- Plan 02-05 can replace the intentionally deferred canonical artifact destination with plan/summary reading without changing route identity.
- Plan 02-06 still owns browser-level visual judgment at 390px and desktop widths, including the Cloudflare tunnel requested for the SSH-only environment.

## Self-Check: PASSED

All declared files exist, all five production/TDD commits resolve, the summary validator passes, and coverage classification routes only the planned browser judgment to human UAT.

---

_Phase: 02-situational-awareness-artifact-reading_
_Completed: 2026-08-27_
