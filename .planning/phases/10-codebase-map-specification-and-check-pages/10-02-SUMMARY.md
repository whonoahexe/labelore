---
phase: 10-codebase-map-specification-and-check-pages
plan: 02
subsystem: testing
tags: [fixtures, vitest, made-up-examples, markers]
status: complete

requires:
  - phase: 07-file-shapes
    provides: the Shapes fixture project and its three codebase map documents
provides:
  - MADE_UP_EXAMPLE_KINDS, the one exported kind set later phases append to
  - a failing test for the made-up example marker and index rule (VIEW-21)
  - test/fixtures/README.md, the one index of made-up examples
affects: [10-24 Tidemark map-only fixture, phase 11 types, any plan adding a spec or check fixture]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2
plan_head_before: 64e575eb5be8997896d8289c51d2121e43d1ab50
plan_head_after: 7b5e945d65b3843061835452b255af2947d112bc
commits: 2

tech-stack:
  added: []
  patterns: [marker-in-file plus index plus failing test, planted positive controls on mkdtemp projects]

key-files:
  created:
    - test/helpers/made-up-examples.ts
    - test/made-up-examples.test.ts
    - test/fixtures/README.md
  modified:
    - test/fixtures/shapes/.planning/codebase/STACK.md
    - test/fixtures/shapes/.planning/codebase/ARCHITECTURE.md
    - test/fixtures/shapes/.planning/codebase/CONVENTIONS.md
    - test/fixtures/shapes/README.md

key-decisions:
  - "The index lives at test/fixtures/README.md (the examples span three fixture roots), not in Lendshed's README"
  - "fixtures/dense and the repository root are exempt by name with a reason; every other fixture root is checked"
  - "A file carrying both marker forms counts as one marked example, the frontmatter form winning"

requirements-completed: [VIEW-21]

duration: 15min
completed: 2026-11-04
---

# Phase 10 Plan 02: Made-up example marker rule Summary

**The made-up example rule is now a test: a marker line in each file, one index at test/fixtures/README.md, and a vitest check that fails on a missing marker, an unindexed file, an indexed file that is absent, or a duplicate row.**

## Accomplishments

- `test/helpers/made-up-examples.ts` exports `MADE_UP_EXAMPLE_KINDS` (spec, ai-spec, user-setup, eval-review, dom-verify, reviews and the seven codebase kinds), `EXEMPT_ROOTS`, `readMadeUpMarker`, `parseMadeUpIndex`, `findMadeUpProblems` and `formatProblems`. Problems sort by repo-relative path then kind. Scans are character scans; no regex is built from file text.
- `test/made-up-examples.test.ts` loads every fixture root except the exempt ones through the real repository. Planted mkdtemp controls prove each problem kind fires exactly once, that both-forms counts once, that an empty root is clean, and that ordering is stable. A non-vacuity check shows the real loader sees Shapes' three map documents.
- `test/fixtures/README.md` holds the rule text, both marker forms, the index table (three Shapes rows) and a "For later phases" paragraph naming `MADE_UP_EXAMPLE_KINDS`.
- Shapes' STACK, ARCHITECTURE and CONVENTIONS documents carry a first-line comment marker (gsd-core 1.19.0); the Shapes ledger rows note "marker added by 10-02".

Gate: `npm run test:gate -- test/made-up-examples.test.ts test/fixture-leak.test.ts test/no-skips.test.ts` reports total=60 passed=60 failed=0 skipped=0 todo=0.

## Deviations from Plan

### Auto-fixed Issues

None to the plan's scope. One environment note: the worktree had no `node_modules`, so a directory of symlinks to the main checkout's packages was created (git-ignored, nothing installed). A single top-level symlink was tried first and broke `fixture-leak.test.ts`, which reads every untracked entry git lists.

## Deferred Issues

A full `npm run test:gate` run in this worktree shows 4 failures in `test/web/ui-spec-corpus.test.ts`, `test/web/pattern-map-corpus.test.ts` and `test/web/uat-session-corpus.test.ts`. All concern this repository's own `.planning` phase 09 and 10 files lacking pinned corpus entries; none touch files changed here. They are out of scope for this plan and belong to whichever plan pins those corpora.

## Known Stubs

None.

## Threat Flags

None. T-10-47 (deny-list leak test) and T-10-48 (character scans, planted controls) are mitigated as planned.

## Self-Check: PASSED

- test/helpers/made-up-examples.ts, test/made-up-examples.test.ts, test/fixtures/README.md: present
- Commits 4606e87 and 7b5e945 are on the branch
