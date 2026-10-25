---
phase: 06-trustworthy-tests-and-security-baseline
plan: 13
subsystem: testing
tags: [fixtures, lendshed, review, review-fix, review-threads, vitest, measureGrowth]
requires: [06-01, 06-02]
provides:
  - Ten made-up Lendshed REVIEW and REVIEW-FIX files across phases 01-04 and the v1.0 folders
  - Review report, threads view, corpus guard and review-context tests that read only Lendshed, clean-REVIEW.md and Labelore files
affects: [06-22]
tech-stack:
  added: []
  patterns: [fxPath/fxRead for fixture reads, loadProject(FX_ROOT) corpus walk with minimum counts, measureGrowth instead of a fixed ms budget]
key-files:
  created:
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-REVIEW.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-REVIEW-FIX.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-REVIEW.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-REVIEW-FIX.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-REVIEW.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-REVIEW.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/01-member-data-foundation/01-REVIEW.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/03-catalogue-browsing/03-REVIEW.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-FIX.md
  modified:
    - test/review-report.test.ts
    - test/web/review-threads.test.ts
    - test/web/review-threads-corpus.test.ts
    - test/presentation/review-context.test.ts
  deleted:
    - test/fixtures/review/sp01-REVIEW.md
    - test/fixtures/review/sp03-REVIEW.md
    - test/fixtures/review/dd01-REVIEW.md
    - test/fixtures/review/dd02-REVIEW.md
    - test/fixtures/review/dd02-REVIEW-FIX.md
    - test/fixtures/review/sb02-REVIEW.md
    - test/fixtures/review/sb02-REVIEW-FIX.md
    - test/fixtures/review/sb14-REVIEW.md
key-decisions:
  - "The corpus guard asserts at least 7 Lendshed reviews and at least 8 review-family files (reviews plus fix reports), because only seven made-up REVIEW files exist (the plan's 'at least 8' only holds when the three fix reports are counted)"
  - "Pins came out equal to the old ones wherever the rewrite kept the structure (counts, verdicts, tallies, block grouping); only names, paths, commits and dates were re-pinned"
status: complete
commits: 5
plan_head_before: f673a7df03ead531339a00006bd2338cd7e81880
plan_head_after: bcab52b908aec4883d7b40c898d9387b376eb08f
actuals:
  tokens: 60000
  tasks: 3
  commits: 5
---

# Phase 6 Plan 13: Review family on Lendshed Summary

The eight review files copied from private work are gone from the repo; their structure lives on as made-up Lendshed REVIEW and REVIEW-FIX files, and the four review test files read only those, `clean-REVIEW.md` and Labelore's own reviews, with every pin recalculated and no skips, gates or fixed millisecond budget.

## What was done

- Task 1 (tracer, commit 3de9a92, from the interrupted run): the Lendshed phase 01 REVIEW and REVIEW-FIX (CR-01 and WR-01 fixed, IN-01 to IN-03 skipped) and the corpus guard loading Lendshed through `loadProject(FX_ROOT)` with the join test moved onto it.
- Task 2 (commit f5b2fe1; files from the salvaged wip commit 6e1a4ae, reviewed here and kept): the other seven review files plus the two other fix reports. One line copied verbatim from an original (`**Fix:** scope the claim ...` in the v1.0 phase 04 review) was reworded, a line-overlap check against the originals found no other shared prose beyond structural headings, and the eight copies were removed with `git rm`. The deny-list grep over `test/fixtures/review` and `test/fixtures/lendshed` prints nothing.
- Task 3 (commit bcab52b): `review-report`, `review-threads`, `review-threads-corpus` and `review-context` retargeted to `fxPath`/`fxRead`; header comments now say made-up; the fixed 250 ms budget became a `measureGrowth` test; the corpus guard walks Lendshed and `clean-REVIEW.md`.
- Merge commit cc273fc brought the interrupted run's branch in.

Pins were recounted from the fixture files by grep (finding counts per severity, first-file grouping, files-reviewed lists minus named files, commit hashes, dates, `File:` spans), then the tests were run; the extractor output was only used as a second opinion. The 62 tests across the four files pass with zero skips.

## Per-file quirk ledger (input for 06-22)

| Lendshed file | Original it replaces | Quirks kept |
| --- | --- | --- |
| phases/01-member-sign-in-sessions/01-REVIEW.md and 01-REVIEW-FIX.md | the reference phase 01 pair (read directly by the old corpus guard) | CR-01 and WR-01 fixed, IN-01 to IN-03 skipped; fix report "Partial"; joined through the real repository load |
| phases/02-roles-and-permissions/02-REVIEW.md and 02-REVIEW-FIX.md | sb02 and its fix | 10 findings (3 critical); fix run fixed 4, skipped 3, 3 left out of scope; one reviewed file listed that is "outside scope" (`check.ts`); a finding naming the same path twice in its File line (IN-02, merged to one span); WR-02 reason starts "Intentionally skipped - accepted project risk" |
| phases/03-account-admin-and-sessions/03-REVIEW.md | sp03 | quoted phase number (`phase: "03"`), `reviewed_at` instead of `reviewed`; Warning Findings / Info Findings buckets; "Failure scenario" extra labelled block next to "Suggested fix"; an unhandled "Areas Reviewed Clean" section; WR-03 with seven line spans; no `files_reviewed_list` |
| phases/04-bulk-loan-export/04-REVIEW.md | sb14 | `blockers_resolved` string note in the frontmatter (CR-01 and CR-02 fixed with commits), `critical_original` count; 12 findings, 16 files |
| milestones/v1.0-phases/01-member-data-foundation/01-REVIEW.md | sp01 | inline `> RESOLVED` quote lines with commit on CR-01 and WR-01; `resolved:` and `open:` frontmatter lists; a file changed in the phase but missing from the declared scope; the Files Reviewed line with a trailing note; 9 findings (1/5/3) |
| milestones/v1.0-phases/03-catalogue-browsing/03-REVIEW.md | dd01 | the large report: 26 findings, 4 critical (15 warnings, 7 info), 20 listed files, 12 file blocks, WR-03 with two spans, no fix sibling |
| milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW.md and 04-REVIEW-FIX.md | dd02 and its fix | 18 findings with one critical left open; fix report with combined headings (WR-04 / WR-05, WR-08 / WR-09), a commit note on WR-10 "(folded into WR-01, as planned)", "Discoveries recorded rather than fixed" and "Not touched (per the known-and-accepted list)" sections the extractor leaves unhandled; `fix_scope: warnings_only` |

## Deviations from Plan

**1. [Rule 1 - Bug] Verbatim line in a Lendshed fixture**
- **Found during:** Task 2 (line-overlap check against the originals)
- **Issue:** one `**Fix:**` sentence in the v1.0 phase 04 review matched an original word for word.
- **Fix:** reworded it.
- **Files modified:** test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW.md
- **Commit:** f5b2fe1

**2. [Judgement] Minimum-count assertion**
- **Issue:** the plan asks for at least 8 Lendshed REVIEW files, but only seven made-up REVIEW files exist (10 counting the three fix reports, as the plan's own file list does).
- **Fix:** assert at least 7 reviews and at least 8 review-family files.

**3. [Judgement] Hostile-body growth test guard**
- **Issue:** the old test only timed the call. Under `measureGrowth` the run function checks that the review extractor still finds a finding and the fix extractor still finds its one entry, so a regression that drops them cannot look fast. The review extractor reads two findings from that hostile body (the fix-section heading counts too), so the guard checks for at least one rather than pinning two.

The salvaged wip commit held no scratch or probe files, so none had to be removed. The interrupted run's merge was clean.

## Known pre-existing failures (not touched)

`test/presentation/drawer.test.ts`, `test/presentation/project-research.test.ts`, `test/project-research-lift.test.ts` and `test/web/summary-run-corpus.test.ts` fail in the full unit run, as the plan brief says other plans own them.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 10 Lendshed review files found; `git ls-files test/fixtures/review` prints only `clean-REVIEW.md`.
- Commits 3de9a92, 6e1a4ae, cc273fc, f5b2fe1 and bcab52b are all ancestors of HEAD.
- The four review test files pass (62 tests, 0 skipped, 0 todo); the acceptance greps (old prefixes, gates, deny-list, `performance.now`) print nothing.
