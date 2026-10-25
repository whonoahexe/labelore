---
phase: 06-trustworthy-tests-and-security-baseline
plan: 10
subsystem: testing
tags: [fixtures, lendshed, summary-page, summary-run, summary-corpus, playwright, vitest]
requires:
  - phase: 06-01
    provides: Lendshed fixture scaffold, fxPath / FIXTURE_BASE_URL, README rules R1-R9
  - phase: 06-02
    provides: growth helper (measureGrowth, GROWTH_LIMIT) and the gate runner
  - phase: 06-09
    provides: the Lendshed PLAN files these summaries pair with, and the quick t8m SUMMARY
provides:
  - Five made-up Lendshed SUMMARY files (phase 01 x2, phase 04 x2, v1.0 phase 02)
  - Summary unit, handler, corpus and browser tests reading only Lendshed and Labelore files
  - Corpus walker that ignores research and *-research folders (D-18), so the two failing Labelore summary tests pass
  - Summary extractor timing converted from a fixed budget to growth
status: complete
actuals:
  tokens: 70000
  tasks: 2
  commits: 2
plan_head_before: 75855a2cdcd3fe2f8b59c209a30372e57aaeb1be
plan_head_after: 82d3bc74560035a3c1d437604abe60da468ff20f
---

# Phase 6 Plan 10: Summary family on Lendshed Summary

**The summary page's extractor, handler, corpus and browser spec now run on five made-up Lendshed SUMMARY files, every pin recounted from those files, nothing skipped, and the corpus walker no longer trips over the archived v1.0 research summary.**

## What was built

- Lendshed SUMMARY files, each pairing with the plan family 06-09 wrote:
  - `phases/01-member-sign-in-sessions/01-01-SUMMARY.md`
  - `phases/01-member-sign-in-sessions/01-06-SUMMARY.md`
  - `phases/04-bulk-loan-export/04-06-SUMMARY.md`
  - `phases/04-bulk-loan-export/04-07-SUMMARY.md`
  - `milestones/v1.0-phases/02-shed-inventory-health/02-12-SUMMARY.md`
- `test/summary-run.test.ts`: the four studio-portal-gated tests became Lendshed tests with no existence gate; the silent `if (!existsSync(...)) return` is gone; the fixed 250 ms hostile-body test is now `measureGrowth` against `GROWTH_LIMIT`, plus an untimed test that the 1 MB shape still reads as three sections. No `performance.now` or `Date.now` remain.
- `test/web/summary-run.test.ts`: the 01-01 and 04-06 handler tests read Lendshed through `fxPath`; the reference-project describe is gone.
- `test/web/summary-run-corpus.test.ts`: loads Lendshed with the real repository (`FX_ROOT`); new Lendshed walk test, a Lendshed "structured.summary on every file" test asserting at least 6 summaries, and an exact `[7, 8]` requirement-resolution pin over six listed paths. The 01-01, 04-06, 04-07 (both tests), 01-06 and 02-12 pins moved to Lendshed. The Labelore walk skips research and `*-research` folders and its minimums are re-pinned on today's files (110 summaries, 154 resolved IDs).
- `test/e2e/summary-page.spec.ts`: both reference-project tests became `FX 01-01 summary page` and `FX 04-06 summary page` against `FIXTURE_BASE_URL`, with no skip.

## Verification

- `npm run test:gate -- test/summary-run.test.ts test/web/summary-run.test.ts test/web/summary-run-corpus.test.ts`: total=75 passed=75 failed=0 skipped=0 todo=0.
- `npx playwright test test/e2e/summary-page.spec.ts`: 4 passed, 0 skipped (only this spec was run).
- `npm run typecheck` clean.
- Acceptance greps: no `runIf|skipIf|test.skip|SP_PLANNING|STUDIO_PORTAL|homedir|helpers/studio-portal` in the four test files (baseline 25 lines); no deny-listed reference-project words in the four test files or the fixture (baseline 15); no `performance.now` / `Date.now` in the unit file (baseline 2); 01-06 starts with `---` and parses as malformed YAML (gray-matter throws, one warning on the artifact); 02-12 does not start with `---`.
- Leak check beyond the deny-list: no reference-specific vocabulary (auth library names, tier, archive job, cloud tunnel, ZIP and similar) in the five new files.

## Deviations from Plan

**1. [Rule 3 - Blocking] The Labelore walker fix landed in Task 1, not Task 2**
- Task 1's verify requires the three summary unit files to pass with zero failures, and two of the corpus tests failed on `milestones/v1.0-research/SUMMARY.md`. The D-18 fix (`isResearchFolder`, used by both the walk and `isSummary`) was therefore committed with Task 1 (`deb3d4f`). Task 2 only re-checked it.

**2. [Rule 3 - Blocking] Proof pills needed backticked tokens in the made-up descriptions**
- The first 01-01 draft matched Proof deliverable D5 to the first accomplishment and left D1 unmatched, because the composer pairs by shared backticked spans or five-letter words. The fix was in the fixture: the coverage descriptions now quote one distinctive backticked name each (`lendshed_session`, `POST /api/sign-in`, `touchSession`, `openStore`, `passcode-gate.ts`), which is how the real summaries read. The test pin (one pill per row, D4 human) was not loosened.

**3. 04-07 composes tasks from the commit count, not a task table**
- The Lendshed 04-07 task table row carries a trailing annotation, as the reference does, so the page counts 2 commits rather than 1 task. The pins this plan carries for 04-07 (seven cards, awaiting checkpoint, one pending requirement) do not depend on it; recorded as a quirk below.

**4. Requirement resolution is `[7, 8]`, not the planning example**
- Counted by hand from the six listed files: 01-01 gives 3 of 3, 04-06 gives 3 of 4 (EXPT-09 is deliberately absent), 04-07 gives 1 of 1; 01-06, 02-12 and the quick t8m cite none. The plan's example absent ID (SIGN-09) was not used because 01-01's requirement list must copy its PLAN verbatim; EXPT-09 in 04-06 plays the same role.

**5. Labelore minimum counts set to today's measured values**
- 110 summaries on disk (was 73) and 154 resolved IDs (was 134). The ID total was read from a deliberately failing run; the file count was cross-checked with a separate `find`.

## Deferred issues

None from this plan. The Lendshed ROADMAP lists only plans 04-01 to 04-05 for phase 4, while this plan adds 04-06 and 04-07 summaries as the plan required; README R9 reserves ROADMAP edits to 06-09, so the roadmap plan list was left alone. The summary pages for 04-06 and 04-07 render without a matching PLAN file.

## Lendshed file quirks (input for the 06-22 ledger)

| File | Quirks it keeps |
|------|-----------------|
| `phases/01-member-sign-in-sessions/01-01-SUMMARY.md` | full frontmatter (requires empty, 5 affects, 5 added dependencies, 4 patterns plus 2 established, 13 key files), five Proof rows with D4 needing a human, five Rule deviations split 4/0/1, Task 1 with three kinds (feat, tracer, tdd), requirements SIGN-01/05/06 all resolved |
| `phases/01-member-sign-in-sessions/01-06-SUMMARY.md` | malformed YAML (a plain scalar starting with a backtick on a `provides:` line, so frontmatter parses to nothing and the artifact carries one warning), empty "Files Created/Modified" heading, three un-tagged deviation subsections, task arrows across several commits |
| `phases/04-bulk-loan-export/04-06-SUMMARY.md` | `status: awaiting-checkpoint`, `requirements-pending` of four including the absent EXPT-09, partial H1 suffix, tasks table with a hashless pending row, two Rule 1 cards plus two extras sections, flagged-conflict section, pending-human section, `decisions:` (not `key-decisions`) with six entries |
| `phases/04-bulk-loan-export/04-07-SUMMARY.md` | awaiting a checkpoint with exactly one pending requirement (EXPT-05), seven Rule deviation cards (3 Rule 3, 2 Rule 1, 2 Rule 2), coverage with an empty `verification: []` and a human-judgment row, single-row task table with an annotated commit cell (page counts commits, not tasks) |
| `milestones/v1.0-phases/02-shed-inventory-health/02-12-SUMMARY.md` | no frontmatter at all, status and task hashes in the preamble facts, execution-note blockquote, a Criterion/Status table, no phase identity beyond the path |

## Self-Check: PASSED

All five Lendshed SUMMARY files exist, commits `deb3d4f` and `82d3bc7` are ancestors of HEAD, and the gate, typecheck and Playwright runs above passed.
