---
phase: 06-trustworthy-tests-and-security-baseline
plan: 01
subsystem: testing
tags: [vitest, playwright, fixtures, lendshed, fail-loud, test-gate]

requires:
  - phase: 05-per-type-document-views
    provides: the CONTEXT brief extractor and page that the first retargeted tests exercise
provides:
  - "test/fixtures/lendshed: a made-up GSD project (root documents plus phase 01 CONTEXT) and a README holding the fiction, ID map and authoring rules R1-R9"
  - "test/helpers/fixture-project.ts: FX_ROOT, FX_PLANNING, fxPath, fxRead, loadFixtureProject and the moved loaders; throws on a missing tree or file"
  - "test/e2e/fixture-root.ts and a playwright.config.ts that always serves Lendshed on 4198 and throws at load when it is missing"
  - "npm run test:gate: fails on any failed, skipped or todo test and on a run that collects nothing"
  - "test/e2e/fixture-server.ts: startFixtureServer, the one shared helper for the debug, learnings, note and todo families"
affects: [06-05, 06-06, 06-07, 06-08, 06-09, 06-10, 06-11, 06-12, 06-13, 06-14, 06-15, 06-16, 06-17, 06-18, 06-19, 06-20, 06-21, 06-22]

actuals:
  tokens: 16000
  tasks: 2
  commits: 3
plan_head_before: b5098981a85180a924ffd876c6e0edb51c10b33c
plan_head_after: db7c94598894d9145761417ad8397e17f98bba5b

tech-stack:
  added: []
  patterns:
    - "A test whose fixture is missing throws through fxPath, never skips"
    - "Playwright config resolves the fixture root at load and throws when it is absent"
    - "One shared e2e fixture server with repo-confined placements instead of per-family servers"

key-files:
  created:
    - test/fixtures/lendshed/README.md
    - test/fixtures/lendshed/.planning/PROJECT.md
    - test/fixtures/lendshed/.planning/ROADMAP.md
    - test/fixtures/lendshed/.planning/REQUIREMENTS.md
    - test/fixtures/lendshed/.planning/STATE.md
    - test/fixtures/lendshed/.planning/MILESTONES.md
    - test/fixtures/lendshed/.planning/config.json
    - test/fixtures/lendshed/.planning/milestones/v1.0-ROADMAP.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-REQUIREMENTS.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md
    - test/helpers/fixture-project.ts
    - test/helpers/vitest-gate.mjs
    - test/e2e/fixture-root.ts
    - test/e2e/fixture-server.ts
    - test/fixture-project.test.ts
    - test/playwright-config.test.ts
  modified:
    - playwright.config.ts
    - package.json
    - eslint.config.js
    - test/helpers/todo-corpus.ts
    - test/context-brief.test.ts
    - test/e2e/context-brief.spec.ts

key-decisions:
  - "Lendshed is one invented app (a neighbourhood tool library); structure is kept from a real reference project, every word is new"
  - "The gate also fails when vitest exits non-zero with no failing test (an unhandled error), not only on failed, skipped, todo or empty runs"
  - "startFixtureServer has no optional sources: every requested file must exist and must resolve inside the repository"

patterns-established:
  - "Fail-loud fixtures: import-time throw in fixture-project.ts, config-load throw in playwright.config.ts"
  - "Fixture authoring rules R1-R9 live in the Lendshed README and bind every later plan"

requirements-completed: [TEST-02, TEST-04]

coverage:
  - id: D1
    description: "Lendshed fixture tree exists with root documents, one phase CONTEXT and a README map, with no word from another project"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "git grep -niwE 'cinedise|studio-portal|resoundant|pyedge|deid|sideby|duet|edgecan|ibis' -- test/fixtures/lendshed (no output)"
        status: pass
    human_judgment: true
    rationale: "That the invented prose is genuinely unrelated to the reference project is a judgment a word-list grep cannot prove; the standing leak test lands in 06-22"
  - id: D2
    description: "A unit test reads the Lendshed phase 01 CONTEXT through fxPath with no existence gate"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "test/context-brief.test.ts#parses statement, inList, outList and drift (Lendshed fixture)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Importing the fixture helper or loading the Playwright config throws when the Lendshed tree is missing"
    requirement: TEST-04
    verification:
      - kind: unit
        ref: "test/fixture-project.test.ts#fxPath throws on a file the fixture does not hold"
        status: pass
      - kind: unit
        ref: "test/playwright-config.test.ts#throws when the folder has no .planning directory"
        status: pass
    human_judgment: false
  - id: D4
    description: "npm run test:gate exits non-zero on a failed, skipped or todo test and on zero tests"
    requirement: TEST-04
    verification:
      - kind: integration
        ref: "node test/helpers/vitest-gate.mjs test/does-not-exist.test.ts (exit 1); probe files with a skip, a todo and a failure each exit 1; npm run test:gate on three files exits 0 with skipped=0"
        status: pass
    human_judgment: false
  - id: D5
    description: "A browser test opens the Lendshed phase 01 CONTEXT page on port 4198 and passes with no skip"
    requirement: TEST-04
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#CONTEXT brief — Lendshed fixture (4198) phase 01"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-25
status: complete
---

# Phase 6 Plan 01: Lendshed Fixture Tracer Summary

**One made-up GSD project (Lendshed) committed in-repo and read end to end by a unit test and a browser test on port 4198, with loaders and a Playwright config that throw on a missing tree and a gate command that fails on any skip, todo or empty run.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-25T13:07:54Z
- **Completed:** 2026-10-25T13:18:00Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments

- A neighbourhood tool-library fiction (two milestones, 44 requirement IDs, three reserved quick-task IDs) with a README that fixes the name map and the authoring rules R1-R9 for the seventeen plans that follow.
- `fixture-project.ts` throws at import when the tree is missing and `fxPath` throws on a missing file, so a missing fixture is a failure; the loaders moved there and `todo-corpus.ts` re-exports them so no importer changed.
- `playwright.config.ts` no longer reaches into the home directory: the 4198 server is unconditional and the config throws at load when `test/fixtures/lendshed/.planning` is absent.
- `npm run test:gate` fails on any failed, skipped or todo test and on a run that collects nothing; verified with a skip, a todo, a failure and a missing file.
- `startFixtureServer` is the one shared e2e server: no placements serves Lendshed directly, placements copy into a temp project and refuse any source that is missing or resolves outside the repository.

## Task Commits

1. **Task 1: Lendshed phase 01 CONTEXT read end to end by a unit test and by the browser on port 4198** - `0a0ff3d` (feat, tracer)
2. **Task 2: Prove fail-loud behaviour, add the zero-skip gate and the shared e2e fixture server** - `2af8496` (test), `db7c945` (feat)

**Plan metadata:** added by the docs commit that follows this file

## Files Created/Modified

- `test/fixtures/lendshed/` - the made-up project: README, five root documents, config.json, two archived v1.0 documents, phase 01 CONTEXT
- `test/helpers/fixture-project.ts` - FX_ROOT, FX_PLANNING, fxPath, fxRead, loadFixtureProject and the moved loaders
- `test/helpers/todo-corpus.ts` - moved bodies replaced by a re-export; now-unused imports dropped
- `test/e2e/fixture-root.ts` - FIXTURE_ROOT, FIXTURE_PORT, FIXTURE_BASE_URL, resolveFixtureRoot
- `test/e2e/fixture-server.ts` - startFixtureServer, FixturePlacement, FixtureServer
- `test/helpers/vitest-gate.mjs` and `package.json` - the gate and the `test:gate` script
- `playwright.config.ts` - unconditional second server on 4198 against Lendshed
- `test/context-brief.test.ts`, `test/e2e/context-brief.spec.ts` - first retargeted unit and browser tests
- `test/fixture-project.test.ts`, `test/playwright-config.test.ts` - fail-loud and config-shape tests
- `eslint.config.js` - node globals for `test/**/*.mjs`

## Decisions Made

- The made-up out-of-scope list ends with "Phase 4" rather than the reference's two-phase destination, because Lendshed's roadmap has four phases and no phase 5.
- The gate script treats a non-zero vitest exit with no failing test as a failure, so an unhandled error can never read as green.
- The old studio-portal describe and its guard stay in `context-brief.spec.ts` for plan 06-05; it skips on this machine because no `~/studio-portal` exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESLint did not know node globals for the new `.mjs` gate script**
- **Found during:** Task 2
- **Issue:** `npm run lint` (a plan-level verification) failed with ten `no-undef` errors on `test/helpers/vitest-gate.mjs`
- **Fix:** added `test/**/*.mjs` to the node-globals file list in `eslint.config.js`
- **Files modified:** eslint.config.js
- **Verification:** `npm run lint` exits 0
- **Committed in:** db7c945

**2. [Rule 2 - Missing critical] Gate also fails on a non-zero vitest exit with no failing test**
- **Found during:** Task 2
- **Issue:** the plan's gate rules (missing report, failed, skipped, todo, zero total) would pass a run that crashed after writing a clean report
- **Fix:** exit 1 when vitest's own exit code is non-zero
- **Files modified:** test/helpers/vitest-gate.mjs
- **Verification:** gate exits 0 on a clean three-file run and 1 on the four failing probes
- **Committed in:** db7c945

### Plan observations

- **TDD red step:** every behaviour pinned by the Task 2 tests was already implemented by the tracer task, so the tests could not fail first; the only failure seen was one of my own test bounds (the Lendshed `.planning` holds 9 files, not 10), corrected before the test commit. The gate and shared server have no unit tests in the plan; they were exercised by hand (skip, todo, failure, missing file, plain server, placed server and four bad placements).
- **Config import under vitest:** importing `playwright.config.ts` from a vitest test worked, so the text-fallback the plan allowed was not needed.
- **Search keys in config.json:** the plan names "the three GSD search keys"; the made-up file sets `brave_search`, `firecrawl` and `exa_search` to false.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** both needed for the plan's own verification and intent; no scope creep.

## Issues Encountered

- 25 unit tests in five files (`project-research-lift`, `presentation/project-research`, `presentation/drawer`, `web/pattern-map-corpus`, `web/summary-run-corpus`) fail on the starting commit and still fail identically; confirmed on an untouched copy of the starting commit. Logged in `deferred-items.md`.
- Playwright prints a Vite HMR port 24678 conflict on startup because two dev servers share it; the run still passes and the second server existed before this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 06-05 onward can repoint tests at `fxPath(...)` and add files to Lendshed under rules R1-R9; the e2e family plans can call `startFixtureServer`.
- The standing real-path scan (06-22) and the per-file quirk ledger (last plan) are still to come.

## Self-Check: PASSED

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-25*
