---
phase: 02-situational-awareness-artifact-reading
plan: 02
subsystem: presentation-contracts
tags: [routing, dashboard, projection, checkpoints, deep-links]

requires:
  - phase: 02-situational-awareness-artifact-reading
    plan: 01
    provides: "Hono/Vite delivery shell, immutable snapshot boundary, and production SPA fallback"
provides:
  - "Milestone-qualified canonical URL codec with fail-closed parsing and direct nested-route delivery"
  - "Cycle-free ProjectPresentation DTO with structured STATE blockers and reusable PLAN checkpoint projection"
  - "Pure dashboard selectors preserving STATE, ROADMAP, observed-summary, dependency, and human-wait provenance"
affects: [02-03, 02-04, 02-05, 02-06]

actuals:
  tokens: 0
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "Canonical destinations are built and parsed by one milestone-qualified codec"
    - "Artifact bodies are interpreted once at the handler/segmenter boundary, then consumed as structured DTOs"
    - "Dashboard view models derive from one immutable ProjectPresentation snapshot and retain source provenance"

key-files:
  created: [src/presentation/routes.ts, src/rendering/plan-segments.ts, src/server/project-presentation.ts, src/presentation/dashboard.ts]
  modified: [src/server/index.ts, src/web/app-router.tsx, src/planning-repo/handlers/state.ts, .gitignore]

key-decisions:
  - "Phase identity always includes milestone context, project code, and phase number; a bare phase number is never canonical identity."
  - "Malformed and traversal-shaped route tokens fail closed and never become filesystem paths."
  - "Formal ROADMAP checklist progress and observed SUMMARY progress remain separate exact signals with explicit provenance."
  - "Only explicitly linked passing verification or UAT evidence suppresses the matching human wait."

patterns-established:
  - "Presentation pipeline: immutable Project snapshot -> cycle-free ProjectPresentation -> pure view-model selector"
  - "Route pipeline: typed identity -> shared URL builder -> shared parser -> typed success/failure"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, ROAD-04, NAV-06]

coverage:
  - id: D1
    description: "Canonical active/archive phase, plan, artifact, and heading routes round-trip difficult identities and reject malformed input."
    requirement: NAV-06
    verification:
      - kind: integration
        ref: "test/presentation/routes.test.ts and test/server/deep-links.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Structured blockers, checkpoints, pass links, and canonical resolved keys serialize without domain-graph cycles."
    requirement: DASH-03
    verification:
      - kind: integration
        ref: "test/server/project-presentation.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Current position, next work, attention, and formal-versus-observed progress remain exact, deterministic, and source-labelled."
    requirement: DASH-04
    verification:
      - kind: integration
        ref: "test/presentation/dashboard.test.ts"
        status: pass
    human_judgment: false

duration: 12h 31m elapsed
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 2: Presentation Contracts Summary

**Canonical copied routes and truthful dashboard data now share one tested projection boundary, preserving identity, source provenance, and human-verification state without reparsing artifact bodies in the UI.**

## Performance

- **Duration:** 12h 31m elapsed
- **Started:** 2026-08-27T02:32:26+05:30
- **Completed:** 2026-08-27T15:03:17+05:30
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Added a reversible, milestone-qualified codec for milestone, phase, plan, artifact, and heading destinations, including Unicode and encoded separators.
- Proved direct production requests for nested presentation routes return the SPA shell while API and asset requests retain their own failure behavior.
- Projected authored STATE blockers and bounded PLAN checkpoints once into a cycle-free JSON contract with exact passing-evidence linkage.
- Built deterministic dashboard selectors for current position, dependency-ready next work, prioritized attention, and distinct formal/observed progress.
- Added 39 focused route, projection, and dashboard tests; the complete suite now passes all 174 tests.

## Task Commits

1. **Task 1 RED: Route and deep-link regression suites** — `81ae3b7` (test)
2. **Task 1 GREEN: Canonical presentation routes** — `0f337fd` (feat)
3. **Task 2 RED: Project projection regression suite** — `a78d07a` (test)
4. **Task 2 GREEN: Structured situational projection** — `b02061a` (feat)
5. **Task 3 RED: Dashboard selector regression suite** — `48323c8` (test)
6. **Task 3 GREEN: Truthful dashboard selectors** — `20e5316` (feat)
7. **Regression fixtures: Structured blocker goldens** — `ccd0f0a` (test)
8. **Quality gate: Presentation contract formatting** — `6c1e3db` (style)

## Files Created/Modified

- `src/presentation/routes.ts` — canonical identity keys, URL builders, and fail-closed parser
- `src/rendering/plan-segments.ts` — bounded semantic segment and checkpoint projection
- `src/server/project-presentation.ts` — cycle-free snapshot DTO and exact evidence linkage
- `src/presentation/dashboard.ts` — pure current/next/attention/progress selectors
- `src/planning-repo/handlers/state.ts` — structured authored blocker extraction
- `src/server/index.ts` — injectable production static root and protected fallback ordering
- `src/web/app-router.tsx` — route declarations backed by the shared codec
- `test/presentation/*.test.ts` / `test/server/*.test.ts` — edge, security, and provenance coverage

## Decisions Made

The URL is a presentation identity, never a filesystem path. Active and archived phases that share a number remain distinct through milestone context. Dashboard selection is deliberately downstream of one cycle-free projection: formal ROADMAP counts, observed SUMMARY counts, STATE-authored facts, dependency results, and checkpoint waits keep their identities and source labels instead of collapsing into one inferred status.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made the production static root injectable and ignored generated build output**

- **Found during:** Task 1 deep-link integration
- **Issue:** Nested-route tests needed an isolated production root, while local builds could leave `dist/` as worktree noise.
- **Fix:** Added the `staticRoot` server option and ignored generated `dist/` output.
- **Files modified:** `src/server/index.ts`, `.gitignore`
- **Verification:** Deep-link integration, full suite, typecheck, lint, and build pass.
- **Committed in:** `0f337fd`

**2. [Rule 2 - Missing Critical] Carried exact formal ROADMAP checklist counts through ProjectPresentation**

- **Found during:** Task 3 selector implementation
- **Issue:** Dashboard selectors could not preserve formal numerator/denominator truth from the narrower initial DTO.
- **Fix:** Extended ProjectPresentation with exact formal plan checkbox counts instead of recomputing or inferring them in the selector.
- **Files modified:** `src/server/project-presentation.ts`, related tests
- **Verification:** Null-formal, zero-plan, precision, discrepancy, and snapshot-isolation tests pass.
- **Committed in:** `20e5316`

**3. [Rule 1 - Bug] Updated repository goldens for the new structured blocker field**

- **Found during:** Full regression gate
- **Issue:** Existing golden snapshots correctly detected the intentional StateHandler DTO addition.
- **Fix:** Updated all affected dense and sparse goldens.
- **Files modified:** `test/__golden__/dense.json`, `test/__golden__/sparse-empty.json`, `test/__golden__/sparse-started.json`
- **Verification:** All 174 tests pass.
- **Committed in:** `ccd0f0a`

---

**Total deviations:** 3 auto-fixed (1 blocking integration seam, 1 missing source-truth field, 1 expected golden update)
**Impact on plan:** The additions are confined to the stated route/projection contract and strengthen its testability and provenance guarantees.

## Issues Encountered

The delegated executor exhausted its CLI usage allowance after completing and committing the implementation. The orchestrator resumed from the clean worktree, ran the full quality gate, applied formatting, and completed this summary without changing product scope.

## User Setup Required

None.

## Next Phase Readiness

Plan 02-03 can now expose and render the tested dashboard and roadmap contracts. Its actual application UI must receive the substantial polish the user requested; the earlier fixture approval is not final visual approval, and Studio Portal preset `b3Dqcuo4na` remains the design baseline.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-27*
