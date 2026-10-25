---
phase: 06-trustworthy-tests-and-security-baseline
plan: 17
subsystem: testing
tags: [playwright, fixtures, todos, lendshed, fixture-server]
requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "Shared fixture server and Lendshed fixture (06-01), Lendshed todos and notes with the todo helper keys (06-16)"
provides:
  - "test/e2e/todo-page.spec.ts running on the shared fixture server with in-repo placements only"
  - "test/helpers/todo-corpus.ts with no copied-project, sibling or home-directory root"
affects: [06-18, 06-22]
tech-stack:
  added: []
  patterns: ["placement lists built from planningFiles(root) filtered to todos/ and notes/, every source required"]
key-files:
  created: []
  modified:
    - test/e2e/todo-page.spec.ts
    - test/helpers/todo-corpus.ts
  deleted:
    - test/e2e/todo-fixture-server.ts
    - test/fixtures/todos/duet (5 notes, 3 completed todos)
    - test/fixtures/todos/portal (2 notes, 1 completed todo, 1 pending todo)
key-decisions:
  - "Placement list is built once in the spec from the Lendshed, Labelore-fixture and synthetic todos/ and notes/ files, plus Labelore's own completed todo 001, its note and the chrome-drift quick SUMMARY at their current paths; any missing source throws"
  - "The 420px sweep keeps its at-least-11 todo floor; the in-repo corpus holds 14 todos"
requirements-completed: [TEST-02, TEST-03, TEST-04]
duration: 2 min
completed: 2026-10-26
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: b7d3d8a52dee668a80ce0e6105d70d485d7226db
plan_head_after: 23e30a5531714701b4800448133fa1eb09911ee8
---

# Phase 6 Plan 17: Finish the todo family Summary

**The todo browser spec now runs on the shared fixture server with required in-repo placements only, the old todo server, the helper's duet/portal/home-directory roots and the twelve copied private files are gone, and all eight browser tests pass with none skipped.**

## Performance

- **Tasks:** 2 of 2
- **Files:** 2 modified, 14 deleted (twelve copies, the old server, plus the helper edit counted in the second commit)

## Accomplishments

- `test/e2e/todo-page.spec.ts` calls `startFixtureServer(PLACEMENTS)`. Placements are the todos and notes of Lendshed, the Labelore todo fixture and the synthetic fixture, plus Labelore's completed todo 001, its note and the chrome-drift quick SUMMARY. No optional sources, no placed list.
- The closed todo with a resolution and two notes now asserts on the Lendshed "Add crop and round member avatars" todo (created 24 Mar 2026, steps `24 Mar 09:20` / `24 Mar 15:17` / `quick 260326-m3d`, five files). The checklist todo and the note-is-not-a-todo test follow the Lendshed cleanup todo and brief.
- `test/e2e/todo-fixture-server.ts` deleted. `DUET_ROOT`, `PORTAL_ROOT`, `RESOUNDANT_ROOT` and the `homedir` import removed from `test/helpers/todo-corpus.ts`; the header now names only the four in-repo sources.
- `git ls-files test/fixtures/todos` lists only `test/fixtures/todos/labelore/`.

## Task Commits

1. **Task 1 (tracer): spec on the shared fixture server, proven on the Lendshed crop-and-round page** - `2e2effc`
2. **Task 2: old server, helper roots and the duet/portal copies removed** - `23e30a5`

## Deviations from Plan

### Judgement calls

**1. Task 1 commit also carries the other constant re-pins.** The five path constants and the checklist/note values were edited in the same pass as the placement list, so the Task 1 commit holds the full spec retarget; Task 2 then only removed files and helper exports. The tracer verify and the full spec both pass.

**2. Labelore's completed todo 001 is placed at `.planning/todos/completed/`.** That is its current location (06-16 already moved the tests there), so the placement uses it.

No auto-fixes were needed; no other deviations.

## Verification

- `npx playwright test test/e2e/todo-page.spec.ts`: 8 passed, 0 skipped (tracer `--grep` run: 1 passed).
- `npm run test:gate -- test/todo-file.test.ts test/web/todo-lifecycle.test.ts test/web/todo-lifecycle-corpus.test.ts test/presentation/todo-notes.test.ts`: total=138 passed=138 failed=0 skipped=0 todo=0.
- `npm run test:gate -- test/web/note-page.test.ts test/web/note-page-corpus.test.ts test/note-lift.test.ts`: total=121 passed=121 failed=0 skipped=0 todo=0.
- `npm run typecheck`: exit 0.
- Acceptance greps: `startFixtureServer(` count 1, `todo-fixture-server` count 0, the home-directory/root grep prints nothing, the deny-list grep over the todo files and both fixture trees prints nothing, `test/e2e/todo-fixture-server.ts` is absent.

## Known Stubs

None.

## Threat Flags

None. T-06-23 is mitigated: the last roots, the home-directory import, the old server and the private copies are removed.

## Self-Check: PASSED

- Commits `2e2effc` and `23e30a5` are on master; `commits: 2` measured from the plan ledger.
- `test/helpers/todo-corpus.ts` and `test/e2e/todo-page.spec.ts` exist; `test/e2e/todo-fixture-server.ts` and the duet/portal fixture folders are absent.
