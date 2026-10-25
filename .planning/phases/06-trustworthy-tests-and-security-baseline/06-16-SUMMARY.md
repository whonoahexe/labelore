---
phase: 06-trustworthy-tests-and-security-baseline
plan: 16
subsystem: testing
tags: [fixtures, lendshed, todos, notes, vitest, growth-timing]
requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "Lendshed fixture project and README rules (06-01), measureGrowth helper (06-02)"
provides:
  - "Eight made-up Lendshed notes and seven made-up Lendshed todos under test/fixtures/lendshed/.planning"
  - "test/helpers/todo-corpus.ts with TODO_KEYS and NOTE_KEYS on Lendshed, no sibling list, no sketch-data readers"
  - "Four todo unit test files that read only Lendshed, synthetic and Labelore files, with no skips and no fixed millisecond budgets"
affects: [06-17, 06-18, 06-22]
tech-stack:
  added: []
  patterns: ["per-file pins counted in the fixture itself (R5, R6)", "measureGrowth for hostile-input and 500 x 500 cost tests"]
key-files:
  created:
    - test/fixtures/lendshed/.planning/notes/2026-03-24-crop-tool-photos-and-member-avatars.md
    - test/fixtures/lendshed/.planning/notes/2026-03-24-round-member-avatars.md
    - test/fixtures/lendshed/.planning/notes/2026-03-23-checkout-sound-cues.md
    - test/fixtures/lendshed/.planning/notes/2026-03-23-scanner-debug-logging-for-checkout-kiosk.md
    - test/fixtures/lendshed/.planning/notes/2026-03-23-back-button-closes-the-kiosk.md
    - test/fixtures/lendshed/.planning/notes/2026-03-24-raise-single-export-size-cap.md
    - test/fixtures/lendshed/.planning/notes/2026-03-26-steward-desk-milestone-brief.md
    - test/fixtures/lendshed/.planning/notes/2026-03-20-export-bundle-design.md
    - test/fixtures/lendshed/.planning/todos/completed/2026-03-24-add-crop-and-round-member-avatars.md
    - test/fixtures/lendshed/.planning/todos/completed/2026-03-23-checkout-sound-cues.md
    - test/fixtures/lendshed/.planning/todos/completed/2026-03-23-scanner-debug-logging.md
    - test/fixtures/lendshed/.planning/todos/completed/kiosk-detect-vanished-shed-sensor.md
    - test/fixtures/lendshed/.planning/todos/pending/pre-milestone-sensor-and-shed-cleanup.md
    - test/fixtures/lendshed/.planning/todos/pending/overdue-reminders-not-reported-to-desk.md
    - test/fixtures/lendshed/.planning/todos/pending/desk-retention-and-access-rules.md
  modified:
    - test/helpers/todo-corpus.ts
    - test/todo-file.test.ts
    - test/web/todo-lifecycle.test.ts
    - test/web/todo-lifecycle-corpus.test.ts
    - test/presentation/todo-notes.test.ts
key-decisions:
  - "Merged the former duet and portal relation tests in todo-notes.test.ts into two Lendshed tests (one project now holds both families), pinned per file"
  - "Kept DUET_ROOT, PORTAL_ROOT, RESOUNDANT_ROOT and the homedir import in the helper because test/e2e/todo-fixture-server.ts still imports them until 06-17"
  - "Pinned 'Open 211 days' for the pending Lendshed cleanup todo against the fixed Asia/Kolkata test clock (2026-10-23), counted by hand from its 2026-03-26 date"
patterns-established:
  - "Growth tests build their input inside make(n) and keep n and 8n under any extractor cap"
status: complete
actuals:
  tokens: 60000
  tasks: 2
  commits: 2
plan_head_before: 3ddd91079034ac0944116277f693b2742751b023
plan_head_after: f1f29fa6e0d7372d5860bdfd8b9fb3bf039f021f
---

# Phase 6 Plan 16: Lendshed notes and todos Summary

**Eight made-up Lendshed notes and seven made-up Lendshed todos replace the duet, portal and sibling originals; the four todo unit test files now read only Lendshed, synthetic and Labelore files, with the two provenance tests deleted and the fixed-budget timing tests converted to growth ratios.**

## Performance

- **Tasks:** 2 of 2
- **Files:** 15 new fixture files, 5 modified test files

## Accomplishments

- Authored the made-up Lendshed notes and todos under README rules R1-R4 (an interrupted earlier run had written the fixtures and the crop-todo test edits; they were reviewed and kept).
- `TODO_KEYS`/`NOTE_KEYS` entries for the duet and portal families point at Lendshed; `FIXTURE_ROOTS` is `[FX_ROOT, LABELORE_FIXTURE_ROOT, SYNTHETIC_ROOT]`; the sibling list, `TODO_SIBLING_ROOTS` and the three sketch-data readers are gone.
- The two byte-for-byte provenance tests (todo and note) are deleted per D-19.
- The resoundant sibling pins now run unconditionally on the made-up `overdue-reminders-not-reported-to-desk` (four folds, linked note) and `desk-retention-and-access-rules` (a link to a todo stays plain text, adds no note).
- Labelore's own todo 001 is read at `.planning/todos/completed/001-sketches-page-in-labelore.md` in all three test files, unconditionally, re-pinned to status done and (5 of 7) checks.
- `todo-file.test.ts` (hostile body) and `todo-notes.test.ts` (500 x 500) use `measureGrowth`; no fixed budgets or `performance.now` remain.

## Task Commits

1. **Task 1 (tracer): crop-and-round todo and its two notes through TODO_KEYS** - `b705367` (the salvage commit from the interrupted run carried this task's fixtures, key repoint and dcrop re-pins; the verify command `-t dcrop` passes with 6 tests)
2. **Task 2: other notes and todos, keys and roots, provenance tests deleted, 001 re-pinned, growth timing** - `f1f29fa` (the remaining fixtures were already in `b705367`; this commit holds the rest of the helper and test changes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree has no node_modules**
- **Found during:** verification
- **Issue:** `npm run test:gate` and `npm run typecheck` need `node_modules` in the worktree root.
- **Fix:** a temporary symlink to the main checkout's `node_modules` (untracked, ignored, not committed) for the verification run.

**2. [Judgement] Task 1 and Task 2 commits are not cleanly separated**
- The interrupted run's salvage commit already held all fifteen fixtures plus the dcrop repoint, so Task 1's commit is that commit and Task 2's commit holds only the test and helper changes.

**3. [Judgement] Duet and portal relation tests merged into Lendshed tests**
- Both families now live in one project, so `todo-notes.test.ts` runs two Lendshed tests (listed-notes family, mentioned-brief family) in place of the `duet`/`portal` ones. All original facts are still pinned.

None otherwise - the plan was executed as written.

## Verification

- `npm run test:gate -- test/todo-file.test.ts test/web/todo-lifecycle.test.ts test/web/todo-lifecycle-corpus.test.ts test/presentation/todo-notes.test.ts`: total=138 passed=138 failed=0 skipped=0 todo=0
- `npm run test:gate -- test/web/note-page.test.ts test/web/note-page-corpus.test.ts test/note-lift.test.ts`: total=121 passed=121 failed=0 skipped=0 todo=0
- `npm run typecheck`: exit 0
- Acceptance greps (sketch/sibling names, home-directory and copied-project roots, skips, `performance.now`/`Date.now` in the four test files): all print nothing; the 001 completed-path string appears twice in `test/todo-file.test.ts`.
- A deny-list grep over the Lendshed notes and todos for the original project names, tarball/DICOM/vault vocabulary, hosts and "sketch" found nothing.

## Per-file ledger (input for 06-18 and 06-22)

| Lendshed file | Replaces | Quirks kept |
|---|---|---|
| todos/completed/2026-03-24-add-crop-and-round-member-avatars.md | duet crop-and-round todo | full-instant `created`, `notes:` list of two, five `files:`, Problem/Solution/Resolution, quick task id + date in Resolution, bullet list with backticks |
| todos/completed/2026-03-23-checkout-sound-cues.md | duet sound-effects todo | one file, one listed note, Resolution with quick task id but no inline date (closed day comes from the id), cosmetic severity |
| todos/completed/2026-03-23-scanner-debug-logging.md | duet call-debug-logging todo | three files, major severity, no Resolution (closing null) |
| todos/completed/kiosk-detect-vanished-shed-sensor.md | portal vanished-device todo | `title`/`date`/`priority` keys only, no headings (leftover prose becomes Details), mentions the brief by bare `notes/` path |
| todos/pending/pre-milestone-sensor-and-shed-cleanup.md | portal pre-milestone cleanup todo | four unchecked checkboxes, no heading, mentions the brief by bare `notes/` path |
| todos/pending/overdue-reminders-not-reported-to-desk.md | resoundant download-failures todo | high priority, `[[wiki]]` link to the design note, four `##` folds |
| todos/pending/desk-retention-and-access-rules.md | resoundant retention todo | H1 plus intro prose (Details fold), two numbered `##` folds, `[[todo-slug]]` link that stays plain text |
| notes/2026-03-24-crop-tool-photos-and-member-avatars.md | duet crop note | `date` with time, `promoted: true`, one long paragraph |
| notes/2026-03-24-round-member-avatars.md | duet round note | same shape as the crop note |
| notes/2026-03-23-checkout-sound-cues.md | duet sound note | `promoted: true`, single paragraph |
| notes/2026-03-23-scanner-debug-logging-for-checkout-kiosk.md | duet call-debug note | `promoted: true`, single paragraph |
| notes/2026-03-23-back-button-closes-the-kiosk.md | duet back-button note | promoted but no todo points at it (reverse lookup is empty) |
| notes/2026-03-24-raise-single-export-size-cap.md | portal download-cap note | no todo points at it (reverse lookup is empty) |
| notes/2026-03-26-steward-desk-milestone-brief.md | portal milestone brief | `title`/`date`/`context` frontmatter, H1, three `##` sections, mentioned (not listed) by two todos |
| notes/2026-03-20-export-bundle-design.md | resoundant tarball design note | `title`/`date`/`context`, H1, `##` mechanism and decisions, linked by wiki from both pending sibling todos |

## Known Stubs

None.

## Threat Flags

None. The only new surface is committed made-up text; T-06-31 mitigation is the rewritten fixtures plus the removed sibling and sketch readers (the deny-list grep over the finished tree is 06-17's).

## Self-Check: PASSED

- Fixture files: all fifteen exist under `test/fixtures/lendshed/.planning/{notes,todos}`.
- Commits `b705367` and `f1f29fa` are ancestors of HEAD.
