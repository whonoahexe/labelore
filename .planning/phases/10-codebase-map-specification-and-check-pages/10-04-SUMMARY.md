---
phase: 10-codebase-map-specification-and-check-pages
plan: 04
subsystem: testing
tags: [fixtures, lendshed, spec, ai-spec, user-setup, made-up-examples]
requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: "10-02 made-up example rule and index; 10-24 README index rows"
provides:
  - "Seven made-up Lendshed specification examples (3 SPEC, 2 AI-SPEC, 2 USER-SETUP), each with a first-line marker and an index row"
affects: [10-spec-pages, 10-ai-spec-page, 10-user-setup-page, sketches]
tech-stack:
  added: []
  patterns: ["marker comment on line 1 for frontmatter-less made-up files", "one index row per example in test/fixtures/README.md"]
key-files:
  created:
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-SPEC.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-SPEC.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-SPEC.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-AI-SPEC.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-AI-SPEC.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-USER-SETUP.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-USER-SETUP.md
  modified:
    - test/fixtures/README.md
    - test/fixtures/lendshed/README.md
key-decisions:
  - "02-AI-SPEC.md body is a byte-for-byte copy of templates/AI-SPEC.md below its H1 (diff-checked), so the unfilled-slot rule is testable against the real template"
  - "03-SPEC.md omits Edge Coverage and Prohibitions sections (older-template shape) in addition to the planned missing Acceptance line"
  - "None of the three ALL_FIXTURE_ROOTS pin tests needed an edit; the full unit suite stayed at 5431/5431"
requirements-completed: [VIEW-21, VIEW-11]
duration: 25min
completed: 2026-11-04
status: complete
commits: 3
plan_head_before: a413e8774b0b8281063d34132de6341682dd77ae
plan_head_after: b9ae102185833a50e2bda2b90f4f0e5c4d55e669
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
---

# Phase 10 Plan 04: Made-up specification examples Summary

**Seven Lendshed made-up examples (locked, above-gate and long specs; empty and half-filled AI specs; part-done and all-pending user setups with a planted placeholder value) filled by hand from GSD's templates, marked and indexed.**

## Accomplishments

- Task 1 (tracer): 01-SPEC.md, locked at 0.14 against the gate, five requirements each with Current, Target and Acceptance; recognised as kind `spec`; first index row.
- Task 2: 02-SPEC.md above the gate (0.31, gate written `<= 0.20`, Constraint Clarity marked below minimum, unresolved edge and prohibition rows, write-anyway note); 03-SPEC.md with nine requirements, the sixth without an Acceptance line, two long statements, score 0.18 with no gate in the header; 02-AI-SPEC.md (template body unchanged, only the H1 filled); 04-AI-SPEC.md (loan-note drafting assistant, sections 1, 1b, 2, 3, 4, 5 written, 4b, 6, 7 left as template slots, 6 of 16 checklist items ticked).
- Task 3: 04-USER-SETUP.md (3 of 6 steps done, `Status: Complete` disagreeing with its boxes, `LOANNOTE_MODEL_KEY=PLACEHOLDER-NOT-A-REAL-KEY` beside the third variable); 02-USER-SETUP.md (all pending); Phase 10 note in the Lendshed README; seven index rows total.

## Task Commits

1. Task 1: `ae6caf0` locked 01-SPEC.md and first index row
2. Task 2: `d4e8f15` three more files plus four index rows
3. Task 3: `b9ae102` two user setups, README note, two index rows

## Pin edits

None. The three tests the plan allowed to be edited (recognition-kinds, route-table, review-ledger) all passed unchanged against the new files, so none was touched. Full gate: `total=5431 passed=5431 failed=0 skipped=0 todo=0`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verify command read the wrong object**
- **Found during:** Task 1
- **Issue:** The plan's snapshot one-liners read `project.artifacts[<phase path>]`, but `project.artifacts` holds only root-level artifacts; phase files live under `project.phases[].artifacts`. The command printed `kind: undefined` for a correct file.
- **Fix:** Ran the same check against the merged `project.phases[].artifacts` (01-SPEC.md is `spec`; the four Task 2 files are `spec`, `spec`, `ai-spec`, `ai-spec`; "wrong kinds: 0"). No repo file changed.
- **Files modified:** none
- **Commit:** n/a

**2. [Rule 3 - Blocking] Worktree had no node_modules**
- **Fix:** Per-entry symlinks to the main checkout's node_modules (git-ignored), as the dispatch allowed. Nothing installed.

Otherwise the plan executed as written.

## Known Stubs

None. The unfilled template slots in 02-AI-SPEC.md and 04-AI-SPEC.md are the intended fixture shape, not stubs in code.

## Threat Flags

None. The only planted value is `PLACEHOLDER-NOT-A-REAL-KEY`; `test/fixture-leak.test.ts` passes in the full gate (T-10-07).

## Self-Check: PASSED

- All seven example files exist; `grep -c "^| test/fixtures/lendshed/.planning/phases/" test/fixtures/README.md` prints 7
- `grep -c "PLACEHOLDER-NOT-A-REAL-KEY"` on 04-USER-SETUP.md prints 1; `grep -c "gate: <= 0.20"` on 02-SPEC.md prints 1; 04-AI-SPEC.md has 6 ticked items
- Commits `ae6caf0`, `d4e8f15`, `b9ae102` are ancestors of HEAD
