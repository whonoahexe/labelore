---
phase: 10-codebase-map-specification-and-check-pages
plan: 07
subsystem: testing
tags: [fixtures, lendshed, eval-review, dom-verify, reviews, made-up-examples]
requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: "10-02 made-up example rule and index; 10-04 earlier Lendshed examples"
provides:
  - "Seven made-up Lendshed check examples (2 EVAL-REVIEW, 3 DOM-VERIFY, 2 REVIEWS), each marked and indexed"
affects: [10-check-pages, sketches, review-threads-corpus-test]
tech-stack:
  added: []
  patterns: ["frontmatter marker keys for DOM-VERIFY and REVIEWS", "first-line comment marker for frontmatter-less EVAL-REVIEW"]
key-files:
  created:
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-DOM-VERIFY.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-DOM-VERIFY.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-DOM-VERIFY.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-EVAL-REVIEW.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-REVIEWS.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-REVIEWS.md
  modified:
    - test/fixtures/README.md
key-decisions:
  - "Eval review scores follow the auditor's own formula (60% coverage, 40% infrastructure over five components), so the dimension and component statuses were chosen to make 64 and 12 reachable"
  - "04-REVIEWS reviews plans 04-02 and 04-03 so the approve-versus-revise split and the plan_coverage block (codex missed 04-03) both have a real plan to sit on"
requirements-completed: [VIEW-21]
duration: 30min
completed: 2026-11-04
status: partial
commits: 3
plan_head_before: 54c016943902f1d9932413a5c4b542b3ab182368
plan_head_after: f63255f81407eebad379e90a66b7d50ff3558802
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase 10 Plan 07: Made-up check examples Summary

**Seven Lendshed check examples (browser checks in all three outcomes, eval reviews at NEEDS WORK 64 and NOT IMPLEMENTED 12, a single-reviewer and a four-lane disagreeing cross-AI review with a failed Qwen stub), marked and indexed. One existing test now fails because of them and was left unedited as the plan requires.**

## BLOCKER: one test outside the pin allow-list fails

`npm run test:gate -- test` ends `total=5520 passed=5519 failed=1 skipped=0 todo=0`.

- Failing: `test/web/review-threads-corpus.test.ts` > "REVIEW corpus - Lendshed" > "every report extracts and every review composes". Message: `.planning/phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md: expected undefined to be defined` (`a.structured.review`).
- Cause: its helper `isReview` (line 62) is `path.endsWith('-REVIEW.md') && !path.endsWith('-UI-REVIEW.md') && ...`, so it also matches `*-EVAL-REVIEW.md` (kind `eval-review`, not a code review). The two new EVAL-REVIEW files have no `structured.review`.
- Not edited: only `recognition-kinds`, `route-table` and `review-ledger` tests may be edited by this plan, and a failure elsewhere stops the task and is reported. The likely one-line fix is to add `&& !path.endsWith('-EVAL-REVIEW.md')` to `isReview` (and the same in any sibling helper in that file); it should be done by the orchestrator or a later plan. The failure is only in that test; everything else, including `made-up-examples` and `fixture-leak`, is green.

## Accomplishments

- Task 1 (tracer): 01-DOM-VERIFY.md, `could_not_look` / `target_unreachable`, all counts 0, body naming what stopped the check and what the operator would change; recognised as kind `dom-verify`; first index row.
- Task 2: 02-DOM-VERIFY.md (`nothing_to_report` / `no_criteria`); 03-DOM-VERIFY.md (`verified`, 7 checked, 4 passed, 2 failed, 1 needs_review, seven body lines, verdict word plain, bold or in backticks, page text in inline code); 03-EVAL-REVIEW.md (NOT IMPLEMENTED 12/100, AI-SPEC Present No, four dimensions MISSING, Must fix steps only); 04-EVAL-REVIEW.md (NEEDS WORK 64/100, five dimensions with Code, LLM Judge and Human measurements, no Critical gaps, three-group Remediation Plan); four index rows.
- Task 3: 04-REVIEWS.md (reviewers claude, codex, opencode, qwen; overall risk LOW, MEDIUM, HIGH; Claude approves and OpenCode asks to revise plan 04-03; codex `models` value "unknown"; `plan_coverage` for codex; Plan-Revision Conflicts entry between its markers; `## 04-02` heading in each reviewer body; two concerns raised by more than one reviewer; Qwen failed-lane stub with the "failed or returned empty output" header; writer's Consensus Summary); 01-REVIEWS.md (one reviewer); two index rows (seven check rows total).

## Task Commits

1. Task 1: `8d502dc` could-not-look browser check and first index row
2. Task 2: `a251392` two browser checks, two eval reviews, four index rows
3. Task 3: `f63255f` two review files, two index rows

## Pin edits

None. None of the three allowed tests (recognition-kinds, route-table, review-ledger) needed a change; the one failure is in a test outside the allow-list (see above).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verify command read the wrong object**
- **Found during:** Tasks 1 and 2
- **Issue:** The plan's snapshot one-liners read `project.artifacts[<phase path>]`, which holds only root-level artifacts, so they print `kind: undefined` for correct files (the known defect from 10-04).
- **Fix:** Ran the same check against the merged `project.phases[].artifacts` plus root artifacts with a scratchpad script. All seven files report the expected kind (`dom-verify`, `eval-review`, `reviews`); "wrong kinds: 0". No repo file changed.

**2. [Rule 3 - Blocking] Worktree had no node_modules**
- **Fix:** Per-entry symlinks to the main checkout's node_modules (git-ignored). Nothing installed.

### Plan-internal contradictions resolved in the fixtures (documented, not auto-fixed)

**3. Eval review scores versus the stated statuses.** The plan asks for 64/100 with "two COVERED, two PARTIAL, one MISSING" and 12/100 with "Infrastructure Audit all Not found or Missing". The auditor's own formula (`eval.cjs`: coverage = covered/total, 60% weight, plus infrastructure sum over five components, 40% weight) makes both impossible (2 of 5 covered needs an infrastructure score of 100 for 64; all-missing infrastructure gives at most 0 for 12). To keep every score internally consistent, 04-EVAL-REVIEW has three COVERED, one PARTIAL, one MISSING (still a mix of all three statuses; Coverage 3/5, Infrastructure 70, overall 64) and 03-EVAL-REVIEW has three Partial components and two Not found/Not configured (Infrastructure 30, overall 12). The Infrastructure Audit uses the writer's five components rather than the plan's "four".

**4. 04-REVIEWS plans.** The plan listed `plans_reviewed: [04-02]`; the file lists `[04-02, 04-03]` so the approve-versus-revise split and the incomplete-coverage block for codex have a second plan to attach to. The two shared concerns are on plan 04-02 as asked.

## Known Stubs

None. (The empty "Should fix soon" and "Nice to have" headings in 03-EVAL-REVIEW.md are the writer's own template headings, left empty on purpose per the plan's "Must fix steps only".)

## Threat Flags

None. All reviewer bodies and model ids are written fresh in Lendshed's fiction (`example-model-a/b/c`, `unknown`); `test/fixture-leak.test.ts` passes.

## Self-Check: PASSED

All seven files exist, commits `8d502dc`, `a251392`, `f63255f` are ancestors of HEAD, `grep` acceptance counts hold (failed-lane header 1, `^## 04-02` 3, index rows 7, `Verdict:** NOT IMPLEMENTED` 1, `^needs_review: 1` 1). The full gate is not green (one failure, above), which is reported rather than fixed.
