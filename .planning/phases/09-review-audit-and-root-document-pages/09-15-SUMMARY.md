---
phase: 09-review-audit-and-root-document-pages
plan: 15
subsystem: ui
tags: [coverage, handler, view, matrix, react, css]
requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: status-square, the view-local CSS block idiom, ResearchInline, the milestone audit handler/composer split (09-10 to 09-14)
provides:
  - CoverageHandler and structured.coverage (h1, none declaration, decision matrix)
  - composeCoverage and CoverageView / coverageHeaderProps
  - Lendshed made-up phase 02 (one-line) and phase 04 (matrix) COVERAGE.md fixtures
affects: [09-16 user review]
actions: none
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: ad293fb731431c29a7b5b176f9c618ca138cc853
plan_head_after: 53fb4101b0d5ffcd3ded1a8b56387eeabaf95857
commits: 2
tech-stack:
  added: []
  patterns: [extractor split from handler so a throwing extractor is provable, pure composer with no module-level state, one marked CSS region per page]
key-files:
  created:
    - src/planning-repo/handlers/coverage.ts
    - src/planning-repo/handlers/coverage-body.ts
    - src/web/views/coverage-matrix.ts
    - src/web/views/coverage-matrix-components.tsx
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/COVERAGE.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/COVERAGE.md
    - test/coverage-handler.test.ts
    - test/web/coverage-matrix.test.ts
    - test/web/coverage-view-contract.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
key-decisions:
  - "A table with no decision column yields no matrix at all, so the Shapes 'Capability | Covered by | Status' file falls back to the promoted-section view"
  - "A matrix wins over a none paragraph; a table line also ends a paragraph so a table under a declaration is never swallowed into its reason"
  - "An empty decision cell gets the quiet chip 'No decision' in the Other group rather than a blank chip"
  - "A decision-column table with no data row is treated as no matrix"
requirements-completed: [VIEW-10]
duration: 40min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 15: API coverage page Summary

**A COVERAGE.md opens on a quiet "No external API in this phase" card with its reason when it is the usual one-liner, and on an "n integrated, m opted out" matrix (bar, lead caption, Integrated and Opted out groups, dashed "No reason given") when it holds a decision table; any other table keeps the generic view.**

## Accomplishments
- CoverageHandler (registered before the generic handler) reads the declaration paragraph (case-insensitive, blockquote markers dropped, reason is the text after the first colon, else the whole paragraph) and the first decision table; columns are found by header text (decision or row; capability, else method or feature, else the first remaining column; reason prefix), bold markers and backticks stripped from decisions, dash and empty reasons null, 50,000-character body, 500-row and 2000-character caps, line scans only.
- composeCoverage is pure with no module-level state; groups in file order with empty ones omitted; only the complete and quiet tones are written, never missing.
- CoverageView: Unplug card, or matrix head (lead number summary, two-segment bar sized by counts, ruled caption) and rows with status-square, wrapping mono capability, decision chip and reason in Meta.
- Verified in headless Chrome at 1280 and 390 on both Lendshed pages; both read as designed.

## Task Commits
1. **Task 1: a one-line COVERAGE.md opens on the No external API card** - `be9c4dd` (feat)
2. **Task 2: the capability matrix** - `53fb410` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extractor split into coverage-body.ts**
- **Found during:** Task 1 (the "a throwing extractor keeps title and body" test needs a mockable module boundary)
- **Fix:** extractor and types live in `coverage-body.ts`; `coverage.ts` holds the handler and re-exports `extractCoverage`, `CoverageBody` and `CoverageNone`, so the plan's export contract holds. Same precedent as 09-14.
- **Commit:** be9c4dd

**2. [Rule 1 - Bug] An absolute-budget timing assertion tripped test/no-skips.test.ts**
- **Fix:** replaced with cap assertions on row count and cell length (the growth ratio tests remain).
- **Commit:** 53fb410

Other notes: the growth tests keep inputs below the caps (rows below 500, characters below 50,000) as the harness requires; the 10,000-row and 200k-character inputs are asserted as capped rather than as growth. Tests, typecheck, lint and `vite build` were run with the main checkout's binaries (the worktree has no node_modules), so `npm run test:gate` was not used; the full vitest run (242 files, 5385 tests, no skips), both tsc projects, eslint and the build all pass. `systemctl --user restart labelore` was skipped per the worktree instructions; the orchestrator restarts after merge. A temporary server on port 4399 with its own settings dir was used for screenshots and stopped.

The acceptance grep for "No external API in this phase" in `coverage-matrix.ts` prints 3 rather than 1 because the header comments quote the phrase as well as the constant; the phrase exists as intended.

**Total deviations:** 2 auto-fixed. **Impact:** none on scope.

## Known Stubs
None.

## Threat Flags
None.

## Next Phase Readiness
Ready for 09-16 and the user's visual review.

## Self-Check: PASSED
Created files exist, commits be9c4dd and 53fb410 are on the branch, acceptance greps pass.
