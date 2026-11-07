---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 27
subsystem: test-fixtures
tags: [workstreams, fixture, brinkwater, baseline]

requires:
  - phase: 11-01
    provides: "C8 adopted (a live workstream folder is work, so a project with a map and a workstream is not map-only)"
  - phase: 11-03
    provides: "projectMapState reading workstream folders"
provides:
  - "test/fixtures/brinkwater: a made-up project in GSD's workstream layout with an active pointer and one executing workstream (intake)"
  - "test/fixtures/brinkwater in RELATIVE_ROOTS, so every all-roots test walks it"
  - "test/workstream-fixture.test.ts: the pre-workstream baseline load of the fixture"
affects: [11-28, 11-29, 11-31]

actuals:
  tokens: 11500
  tasks: 2
  commits: 2
plan_head_before: 75c7757887875109e38a5b1d55063fcd7bd85bdb
plan_head_after: ff9867543a1bd98826d004c905bfdf7cab127d10

tech-stack:
  added: []
  patterns:
    - "A fixture whose label-less file (active-workstream, one word and a newline as GSD writes it) is labelled by its index row"

key-files:
  created:
    - test/fixtures/brinkwater/.planning/PROJECT.md
    - test/fixtures/brinkwater/.planning/config.json
    - test/fixtures/brinkwater/.planning/active-workstream
    - test/fixtures/brinkwater/.planning/codebase/STACK.md
    - test/fixtures/brinkwater/.planning/todos/pending/2026-05-02-gauge-calibration.md
    - test/fixtures/brinkwater/.planning/workstreams/intake/ROADMAP.md
    - test/fixtures/brinkwater/.planning/workstreams/intake/STATE.md
    - test/fixtures/brinkwater/.planning/workstreams/intake/REQUIREMENTS.md
    - test/fixtures/brinkwater/.planning/workstreams/intake/phases/01-sensor-feed/01-01-PLAN.md
    - test/fixtures/brinkwater/.planning/workstreams/intake/phases/01-sensor-feed/01-01-SUMMARY.md
    - test/fixtures/brinkwater/.planning/workstreams/intake/phases/02-feed-alerts/02-01-PLAN.md
    - test/workstream-fixture.test.ts
  modified:
    - test/helpers/fixture-roots.ts
    - test/fixtures/README.md

key-decisions:
  - "Brinkwater's markdown files carry the made-up label as frontmatter keys or a first-line comment, config.json as top-level keys, and active-workstream as its index row, since the file holds only the name"
  - "Only codebase/STACK.md is a rule kind, so it alone needs a marker and an index row under the rule; the active-workstream row is added beyond the rule to record its label"

patterns-established:
  - "Baseline-first fixture: the new root is loaded and pinned as today's flat model before any code that changes it lands"

requirements-completed: [VIEW-20]
status: complete
---

# Phase 11 Plan 27: The Brinkwater workstream fixture Summary

**A made-up harbour tide-gauge project in GSD's workstream layout (an executing intake workstream and an active pointer), registered as a fixture root and pinned as today's flat model.**

## Performance

- **Tasks:** 2 of 2
- **Files:** 12 created, 2 modified; nothing under `src/`

## Accomplishments

- The Brinkwater root: PROJECT.md, config.json, `codebase/STACK.md`, a root todo and `.planning/active-workstream` holding `intake`. No root ROADMAP.md, STATE.md or `phases/`, as a migrated GSD project has none.
- The intake workstream: ROADMAP.md (phase 1 done, phase 2 not started), STATE.md in the real shape (frontmatter with `workstream`, `status: executing`, `current_phase` and a `progress` block of phases and plans, plus the bold-line body GSD's inventory falls back to), REQUIREMENTS.md, and two phase folders (a plan and a summary, then a plan).
- `test/fixtures/brinkwater` joined `RELATIVE_ROOTS`; the fixtures README gained two index rows (the STACK.md rule-kind row and the `active-workstream` label row) and a "Workstream project" paragraph.
- `test/workstream-fixture.test.ts` (9 tests) pins the baseline: it loads through the real repository without a throw, is not map-only (C8), holds no root ROADMAP or STATE, reaches every `workstreams/intake/` file (including the phase files) as an artifact at location `other` with no phases in the project model, has the root todo, treats `active-workstream` as root internal bookkeeping (an exclusion, not an artifact), and holds only `intake\n`.
- The flat first screen photographs at 1280 and 390, light and dark (four PNGs, no FAIL). It shows the overview with "No STATE.md yet" and empty Decisions and Pace, because the workstream's STATE is not read at the root; this is the baseline the last waves change.

## Task Commits

1. **Task 1 (tracer): The Brinkwater root with the intake workstream loads end to end as today's flat model** - `eff0e11`
2. **Task 2: Intake's requirements, phases and the root todo, the full gate and the baseline screenshot** - `ff98675`

## Verification

- Task 1 gate (workstream-fixture, made-up-examples, fixture-leak, project-map-state): 45 passed, 0 failed, 0 skipped.
- Full unit gate: 287 files, 6985 tests, `gate: total=6985 passed=6985 failed=0 skipped=0 todo=0`. The new root shifted no pinned per-project total or corpus guard.
- `npm run build` then `shoot-pages.ts --root test/fixtures/brinkwater --address /` produced 4 PNGs with no FAIL line.
- `git diff --stat -- src` prints nothing.

## Deviations from Plan

None - plan executed exactly as written. The precondition held: 11-01-SUMMARY.md records C8 as adopted (plans 11-03, 11-27) and its Re-plan required section reads `none`.

## Known Stubs

None. The fixture's plans reference files such as `intake/poll.ts` that do not exist; they are invented project content, not Labelore stubs.

## Threat Flags

None. Fixture text is invented; `fixture-leak.test.ts` passed in the full gate (T-11-41).

## Next Phase Readiness

- 11-28 adds the ledger and notices workstreams, the archived workstream and the scope decision beside intake.
- Brinkwater is a flat-model baseline: its project-level overview shows "No STATE.md yet" until workstream code lands.

## Self-Check: PASSED

- All 12 created files and the two modified files exist; commits `eff0e11` and `ff98675` are ancestors of HEAD.
