---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 28
subsystem: test-fixtures
tags: [workstreams, fixture, brinkwater, scope-decision, adapter]

requires:
  - phase: 11-01
    provides: "C12 adopted (an archived workstream's files stay ordinary milestone-folder documents in every mode)"
  - phase: 11-27
    provides: "test/fixtures/brinkwater with the intake workstream and the pre-workstream baseline test"
provides:
  - "Brinkwater's hard workstream shapes: ledger (own config.json, plans 22 of 22 beside phases 4 of 6, verifying), notices (STATE.md only, as GSD's create writes it) and one archived workstream at milestones/ws-archive-2026-05-01/"
  - "test/workstream-fixture.test.ts extended to pin all three workstream folders and the archive as today's flat model"
  - "The user's scope decision for workstreams: adapter"
affects: [11-29, 11-30, 11-31, 11-32]

actuals:
  tokens: 9500
  tasks: 2
  commits: 1
plan_head_before: e7ec194fb31eb9b81c032fe6498b66642ed019d3
plan_head_after: c1f06591d0d38b2f0654e2efa82afdeeffe7a2d7

tech-stack:
  added: []
  patterns:
    - "Archived-workstream files are plain milestone documents; only the ws-* folder name carries meaning for the index"

key-files:
  created:
    - test/fixtures/brinkwater/.planning/workstreams/ledger/ROADMAP.md
    - test/fixtures/brinkwater/.planning/workstreams/ledger/STATE.md
    - test/fixtures/brinkwater/.planning/workstreams/ledger/REQUIREMENTS.md
    - test/fixtures/brinkwater/.planning/workstreams/ledger/config.json
    - test/fixtures/brinkwater/.planning/workstreams/ledger/phases/04-tide-tables/04-01-SUMMARY.md
    - test/fixtures/brinkwater/.planning/workstreams/notices/STATE.md
    - test/fixtures/brinkwater/.planning/milestones/ws-archive-2026-05-01/STATE.md
    - test/fixtures/brinkwater/.planning/milestones/ws-archive-2026-05-01/phases/01-cold-storage/01-01-SUMMARY.md
  modified:
    - test/fixtures/README.md
    - test/workstream-fixture.test.ts

key-decisions:
  - "Workstream scope is built as the adapter: a ScopedPlanningFilesystem at the filesystem port, each workstream served by the unmodified runtime and createProjectApi at /api/projects/{slug}/ws/{name} (user reply: adapter)"
  - "realPath: shown for copy-path and file facts"

requirements-completed: [VIEW-20]
status: complete
---

# Phase 11 Plan 28: Ledger, notices, the archive and the scope decision Summary

**Brinkwater now holds the hard workstream shapes (a plans-done-phases-not ledger, a roadmap-less notices, an archived workstream), pinned as today's flat model, and the user has chosen the ScopedPlanningFilesystem adapter for the workstream wave.**

## Performance

- **Tasks:** 2 of 2 (Task 1 tracer committed; Task 2 was a blocking-human decision, answered "adapter")
- **Files:** 8 created, 2 modified; nothing under `src/`

## Accomplishments

- Ledger workstream: ROADMAP.md, STATE.md (status verifying, `completed_phases` 4 of 6 beside `completed_plans: 22` of 22, with the bold-line body), REQUIREMENTS.md, its own config.json and `phases/04-tide-tables/04-01-SUMMARY.md`.
- Notices workstream: only the STATE.md GSD's create writes (Not started, Current Phase None, no roadmap).
- Archived workstream at `milestones/ws-archive-2026-05-01/` with STATE.md and `phases/01-cold-storage/01-01-SUMMARY.md`; loaded today as ordinary milestone-folder documents (RESEARCH C12), and the project is still not map-only.
- Every new file is labelled as made up; `test/fixtures/README.md` gained the index rows for rule-kind files.
- `test/workstream-fixture.test.ts` grew by 8 tests: three workstream folders (`intake`, `ledger`, `notices`), ledger's files as artifacts at location `other`, the plans-done-phases-not counts, ledger's own config.json, notices holding only STATE.md, and the archive as plain documents.

## Scope decision

**Chosen: adapter** (user reply, verbatim: "adapter").

- A `ScopedPlanningFilesystem` at the filesystem port presents `.planning/workstreams/{name}/` as the scope's `.planning/`, with the shared root files overlaid.
- Each workstream is served by the unmodified `runtime` and `createProjectApi` at `/api/projects/{slug}/ws/{name}`. Discovery, assembly, every handler, every presentation builder, `PhaseIdentity` and the dense and serialize goldens stay untouched.
- Scoped artifacts carry virtual paths (`.planning/ROADMAP.md` inside a scope). The user gave no alternative for how scoped paths show, so the default stands: **realPath: shown for copy-path and file facts**. A `realPath` on scoped artifacts maps the virtual path back to the file on disk.
- Phase 13 search must key on scope plus path, not path alone, because the same virtual path recurs in every scope.
- Not chosen: tag-and-split and cut. So no re-plan is needed: plans 11-29 to 11-32 proceed as planned, and VIEW-20 stays in this phase.
- T-11-59 (Repudiation, the scope decision) is mitigated by this section; 11-29's first-task precondition reads it.

## Task Commits

1. **Task 1 (tracer): Ledger, notices and the archived workstream load end to end as today's flat model** - `c1f0659`
2. **Task 2: The user confirms the workstream scope design** - decision checkpoint, no commit (recorded above)

## Verification

- Task 1 gate: full unit gate green, 6993 of 6993 tests (6985 before, plus the 8 new tests), 0 failed, 0 skipped.
- `git diff --stat -- src` for the task commit prints nothing; no module under `src/` imports scope code (D-17 cut line).

## Deviations from Plan

None - plan executed exactly as written. The precondition held: 11-01-SUMMARY.md records C12 as adopted and its Re-plan required section does not name 11-28 (re-plan: none).

## Known Stubs

None. Fixture content is invented project text, not Labelore stubs.

## Threat Flags

None. Fixture text is invented (T-11-41 guarded by `fixture-leak.test.ts`, which passed in the full gate).

## Next Phase Readiness

- 11-29 to 11-32 build the adapter; 11-29's precondition reads the "Scope decision" section above.
- Brinkwater is the flat-model baseline for those plans: three live workstreams, one archive, an active pointer.

## Self-Check: PASSED

- All 8 created files and both modified files exist in `c1f0659`; the commit is an ancestor of HEAD.
