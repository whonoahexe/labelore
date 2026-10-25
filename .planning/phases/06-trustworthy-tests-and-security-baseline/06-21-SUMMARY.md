---
phase: 06-trustworthy-tests-and-security-baseline
plan: 21
subsystem: testing
tags: [vitest, playwright, re-pinning, growth-ratio, test-privacy]
status: complete
requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: growth-ratio helper (06-01) and the gate runner (06-02)
provides:
  - Project-research unit tests and the research-page browser spec pinned to Labelore's v2.1 research as it stands today
  - Drawer test pinned to today's current milestone and the shipped list
  - Drawer spec that asserts instead of skipping
  - Deterministic tilde-path test under a stubbed HOME
  - No fixed millisecond budgets left in the three previously unowned timing tests
affects: [06-22 real-path scan, phase 07 and later planning updates that touch .planning/research]
actuals:
  tokens: 32000
  tasks: 3
  commits: 5
plan_head_before: f6cddfd916457ce20c6557aaada2bd653b0d9e76
plan_head_after: 555873223a6f297126504b1ffb44c70987569be4
tech-stack:
  added: []
  patterns:
    - "Archived shipped files (.planning/milestones/v1.0-research) carry the old template shape; current files carry today's"
    - "Absent sections are asserted absent, never skipped"
key-files:
  created: []
  modified:
    - test/project-research-lift.test.ts
    - test/presentation/project-research.test.ts
    - test/helpers/project-research-fixtures.ts
    - test/e2e/research-page.spec.ts
    - test/presentation/drawer.test.ts
    - test/e2e/planning-drawer.spec.ts
    - test/target-path.test.ts
    - test/plan-structure.test.ts
    - test/server/dashboard-ledger.test.ts
key-decisions:
  - "Keep the old template-shape coverage by reading the archived v1.0 research in the lift tests, and pin today's research separately"
  - "Where today's research lacks a section the page used to draw, the browser spec asserts nothing is drawn for it"
  - "Drawer test pins the current milestone and the shipped list rather than a default place that moves with every tracking update"
requirements-completed: []
duration: 40 min
completed: 2026-10-25
---

# Phase 6 Plan 21: Re-pin Labelore's own live-file tests Summary

The 22 tests that failed because they read Labelore's own planning files now pass against today's content, the drawer spec can no longer skip, the tilde-path test runs on every machine, and the last three fixed-millisecond timing tests assert growth.

## Accomplishments

- **Project research tests (21 failures).** `test/project-research-lift.test.ts` and `test/presentation/project-research.test.ts` now pin the v2.1 research (researched 2026-10-25, nine gaps, 6 + 2 stack entries, 9 alternatives, 10 / 6 / 7 features, 6 anti-patterns, 33 pitfalls, 13 checks). The previous template-shape expectations moved to a second block that reads the archived `.planning/milestones/v1.0-research` files, so the lift keeps its coverage of a summary with phases, a stack decision, a competitor table and a build order. Pins that named a private project were replaced by a shape match.
- **Fixtures.** `test/helpers/project-research-fixtures.ts` now describes a made-up project (Lendshed) with invented competitor, tool and hardware wording; every shape the tests rely on is kept.
- **Research page spec.** `test/e2e/research-page.spec.ts` passes on port 4199 (35 passed, 0 skipped). It pins 25 Oct 2026, 8 and 33 spine counts and the first pitfall. Where today's research has no phases, stack decision, matrix, overview diagram, project tree or build order, the spec asserts the page draws nothing for it.
- **Drawer.** `test/presentation/drawer.test.ts` pins v2.1 as the current milestone, the default place as one of its phases, and the shipped list v2.0, v1.1, v1.0 with phase counts 0, 1, 4 and quick-task counts 40, 13, 5. `test/e2e/planning-drawer.spec.ts` has no `test.skip`; the three conditions are expectations on this repository (7 passed).
- **Tilde path.** `test/target-path.test.ts` builds its own home folder with `vi.stubEnv('HOME', ...)` (and `USERPROFILE`), links the fixture inside it, and always asserts. No early return and no call to the operating system's home-directory function; it passes with `HOME=/nonexistent-home-for-test`.
- **Timing.** `plan-structure.test.ts` (four pathological shapes) and `dashboard-ledger.test.ts` (12 vs 96 blockers, both under the section cap) use `measureGrowth`; measured ratios read 7.6 to 8.3, so they exercise real growth. The lift robustness test also moved to growth.

## Task Commits

1. Task 1 (tracer): `6ec759d`, with the salvaged interrupted-run work merged first (`80e58fa`, merge `2b088b2`)
2. Task 2: `675194c`
3. Task 3: `5558732`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The drawer spec's skip hid a stale label match**
- **Found during:** Task 2
- **Issue:** The plan said v2.0 quick tasks have both a plan and a summary file, and they do, but the spec looked for files labelled exactly `Plan` and `Summary`. The drawer now labels them `<date> <id> plan` and `<date> <id> summary`, so the match had been failing quietly behind the skip.
- **Fix:** Match the label's last word; the expectation that a pair exists now holds and the Plan / Summary switch assertions run.
- **Files modified:** test/e2e/planning-drawer.spec.ts
- **Commit:** 675194c

**2. [Rule 1 - Scope] Research-page spec needed far more than three pins**
- **Found during:** Task 1
- **Issue:** The plan named the date, file count and first pitfall, but 19 of the spec's tests failed because today's research is a different shape from the v1.0 research the page was built on. The phase inspector, stack decision, competitor matrix, lane diagram, clean tree, bottleneck call-out and build-order DAG have no data on 4199 today.
- **Fix:** Re-pinned every test to today's values and turned the template-only tests into "the page draws nothing for this" assertions. Browser coverage of those panels is therefore gone; the lift (data) coverage remains through the archived v1.0 files. A browser fixture with template-shaped research would restore it.
- **Files modified:** test/e2e/research-page.spec.ts
- **Commit:** 6ec759d

**3. [Rule 1 - Bug] Spine clicks replace history, so Back leaves the page**
- **Found during:** Task 1
- **Issue:** The old Summary test returned via a pitfall chip then Back; today there is no chip, and Back after a spine click goes to the previous document.
- **Fix:** The test returns through the Summary spine instead.
- **Commit:** 6ec759d

**4. [Rule 2 - Privacy] Ledger test pinned a private name from fixtures/dense**
- **Found during:** Task 3
- **Issue:** The dense-fixture decision title contains the private project name; the committed fixture text is owned by another plan's scrub.
- **Fix:** The pin matches the title's shape with a regular expression, so it passes before and after the fixture is scrubbed.
- **Commit:** 5558732

**Total deviations:** 4 (3 Rule 1, 1 Rule 2). **Impact:** None on the plan's goal; deviation 2 narrows browser coverage of the template-shaped panels, as stated above.

## Issues Encountered

- The earlier interrupted run's WIP commit was reviewed and kept: it passed against current files and held no private names. Only the browser spec, the drawer files and Task 3 still needed work.
- Noticed, not changed (planning content is never edited): the last pitfall rows of the current PITFALLS file show names such as "to 33 Minor" on the research page, which suggests the pitfall-heading reader mis-handles a range heading. Worth a look in a later display fix.

## Known Stubs

None.

## Threat Flags

None. T-06-26 mitigated: the deny-list grep over all nine files is empty.

## Self-Check

Acceptance and verification commands re-run after the final commit:

- `npm run test:gate` over the six unit files: `gate: total=206 passed=206 failed=0 skipped=0 todo=0`
- `npx playwright test test/e2e/research-page.spec.ts`: 35 passed, none skipped
- `npx playwright test test/e2e/planning-drawer.spec.ts`: 7 passed, none skipped
- `HOME=/nonexistent-home-for-test vitest run test/target-path.test.ts`: 12 passed
- Deny-list grep, `performance.now|Date.now` grep, `rel.startsWith('..')` grep, `test.skip` grep, `homedir` grep: all print nothing
- All three task commits are ancestors of HEAD

## Self-Check: PASSED
