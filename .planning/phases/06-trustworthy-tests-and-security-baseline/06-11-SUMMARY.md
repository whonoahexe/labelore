---
phase: 06-trustworthy-tests-and-security-baseline
plan: 11
subsystem: testing
tags: [fixtures, lendshed, uat, security-register, playwright, vitest]
requires: [06-01, 06-02]
provides:
  - Four Lendshed UAT files and two Lendshed SECURITY files
  - Made-up test/helpers/security-synthetic.ts
  - UAT and security tests that read only Lendshed and Labelore files
affects: [06-22]
tech-stack:
  added: []
  patterns: [fxPath/FX_PLANNING corpus walk with FX: keys, measureGrowth instead of fixed ms budgets, FIXTURE_BASE_URL browser specs]
key-files:
  created:
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/03-catalogue-browsing/03-UAT.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-UAT.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-UAT.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-UAT.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-SECURITY.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-SECURITY.md
  modified:
    - test/helpers/security-synthetic.ts
    - test/uat-session.test.ts
    - test/web/uat-session.test.ts
    - test/web/uat-session-corpus.test.ts
    - test/web/security-console.test.ts
    - test/web/security-console-corpus.test.ts
    - test/e2e/uat-page.spec.ts
    - test/e2e/security-page.spec.ts
key-decisions:
  - "Lendshed security phase 01 register has 27 threats and phase 03 has 30; both keep ten trust-boundary crossings"
  - "Synthetic open-threats doc reopens the 3rd and 6th mitigated high-severity rows (T-03-03 and T-03-11 in Lendshed)"
status: complete
commits: 3
plan_head_before: 3ddd910
plan_head_after: 9a1f63af8ff94672949a11f52ffab65f1e1e0d4a
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 11: UAT and security-register families on Lendshed Summary

The UAT and security-register tests, their corpus guards, the synthetic open-threats helper and both browser specs now read only made-up Lendshed files (plus Labelore's own archived files, which stay pinned per D-03); nothing is gated, skipped or timed against a fixed millisecond budget.

## What was done

- Task 1 (tracer, commit 58e6e7f): the archived v1.0 phase 03 UAT with six resolved YAML gaps, the unit test, the corpus guard entry and the browser spec for it, with pins recalculated.
- Task 2 (commit ce5af33): the other three UAT files, the full UAT unit/view/corpus family on `fxPath`/`FX:` keys (at least four Lendshed UAT files asserted), the fixed-budget test converted to `measureGrowth`.
- Task 3 (commit f8c17e8, salvaged from the interrupted run and reviewed here): the two SECURITY files, the rewritten `security-synthetic.ts`, `security-console.test.ts`, `security-console-corpus.test.ts` and `security-page.spec.ts` retargeted, both fixed-budget blocks converted to growth, at least two Lendshed SECURITY files asserted. Reviewed critically on resume: nothing incomplete, no scratch files, no further edits were needed.

## Verification

- `npm run test:gate` over the five unit files: `gate: total=120 passed=120 failed=0 skipped=0 todo=0`.
- `npx playwright test test/e2e/uat-page.spec.ts test/e2e/security-page.spec.ts`: 5 passed, 0 skipped.
- Acceptance greps: no gate/skip/studio-portal path references (empty), no deny-list words in the test files or `test/fixtures/lendshed` (empty), no `performance.now`/`Date.now` in the owned unit files (empty), four `*-UAT.md` files under Lendshed.

## Quirks each Lendshed file keeps (input for the 06-22 ledger)

- `milestones/v1.0-phases/03-catalogue-browsing/03-UAT.md`: archived file; 6 tests all pass, six resolved gaps in YAML form (pin: tests 6, pass 6, gaps 6, mode items).
- `phases/01-member-sign-in-sessions/01-UAT.md`: 7 tests, 6 pass and 1 skipped; a `Notes` extra section after Gaps (pin: tests 7, pass 6, skipped 1, extras Notes).
- `phases/02-roles-and-permissions/02-UAT.md`: a `Resolution` section before Tests, `status: passed`, gaps written as prose (pin: tests 3, pass 3, gaps 4, mode prose); Summary count differs from test count by design of the shape.
- `phases/03-account-admin-and-sessions/03-UAT.md`: 5 tests all pass; a `reverified:` strip with a fix commit reference, `reverified_at` key in the gap (pin: tests 5, gaps 1, mode items); the four-card layout with one source-only resolution entry.
- `phases/01-member-sign-in-sessions/01-SECURITY.md`: 27 threats (2 critical, 14 high, 4 medium, 7 low; mitigate 20, accept 6, transfer 1), 10 boundaries with 1 destination grouping, 2 data stores, 6 accepted risks, 3 residual observations, one audit row, sign-off 4/4; the T-01-06 reverse link to its plan and `status: verified`.
- `phases/03-account-admin-and-sessions/03-SECURITY.md`: 30 threats (mitigate 22, accept 8), 10 boundaries all singles, 8 accepted risks, one audit row, sign-off 4/4, `threats_open: 0`; the base the synthetic open-threats doc derives from.

## Deviations from Plan

### Resumed run

The run was resumed from an interrupted executor's branch (`worktree-agent-acff7e0be17e3932a`), merged with `--no-ff` (merge 9a1f63a, no conflicts). Task 3's work arrived as a `wip: salvage` commit; after review it was kept as is, so Task 3 has no commit of its own beyond that one. Commit count is the three plan commits (the merge commit is not counted).

Otherwise none: the plan executed as written.

## Known Stubs

None.

## Threat Flags

None. All new files are made up; the deny-list grep over the tests, helper and Lendshed fixtures is clean (T-06-18).

## Self-Check: PASSED
