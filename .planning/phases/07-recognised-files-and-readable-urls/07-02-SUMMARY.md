---
phase: 07-recognised-files-and-readable-urls
plan: 02
subsystem: planning-repo
tags: [discovery, folder-table, kind-derivation, drawer, fixtures, vitest]

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-01: fileClass and sizeBytes on refs, artifacts and DTOs; the Shapes fixture project; internal-file exclusions"
provides:
  - "src/planning-repo/folders.ts: FOLDER_RULES (17 rows, each with URL segment, name rule, kind rule and GSD source), folderRuleOf, EXACT_NAME_KINDS, kindOfPath"
  - "Position-gated kind derivation: every filename grammar applies only where GSD writes it, so a deeper ROADMAP.md or STATE.md is unknown"
  - "New wire kinds: handoff, continue-here, coverage (unprefixed), deferred-items, skeleton, graduated-patterns, codebase-*, spikes-*, sketches-*, spike, sketch, seed, thread, report, forensics, onboarding, intel, graph"
  - "Files under phases/, milestones/vX.Y-phases/ and quick/ that are not in a phase or quick-task folder stay in the model at location other"
  - "DrawerFileRow.fileClass and sizeBytes; After-stage placement of recognised unprefixed files and non-text files"
  - "test/helpers/fixture-roots.ts: ALL_FIXTURE_ROOTS, and a walk-equals-model check over every root"
affects: [07-03, 07-04, 07-05, 07-06, 07-07, 07-08, 07-09, 07-10]

actuals:
  tokens: 16800
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "One pure folder table, many readers: kind, URL segment and name rule come from FOLDER_RULES; each row cites its GSD 1.18 source"
    - "Position first, then name, never content: exact names and grammars are gated by where the file sits"
    - "A stray is kept where it falls (location other, null identity) instead of being dropped from the model"

key-files:
  created:
    - src/planning-repo/folders.ts
    - test/helpers/fixture-roots.ts
    - test/folders.test.ts
    - test/recognition-kinds.test.ts
    - test/fixtures/shapes/.planning/ (HANDOFF.json, .continue-here.md, PATTERNS.md, phases/README.md, phases/02-glaze-recipes/{02-CONTEXT,COVERAGE,deferred-items,SKELETON,.continue-here}.md, quick/README.md, codebase/{ARCHITECTURE,STACK,CONVENTIONS}.md, spikes/{MANIFEST,CONVENTIONS}.md, spikes/001-kiln-sensor/README.md, seeds/SEED-001-glaze-library.md, threads/kiln-vendor-call.md, sketches/001-shelf-board/synthetic-planning/{ROADMAP,STATE}.md)
  modified:
    - src/planning-repo/discovery.ts
    - src/presentation/drawer.ts
    - src/planning-repo/handlers/artifact-token.ts
    - test/discovery.test.ts
    - test/presentation/drawer.test.ts
    - test/__golden__/dense.json
    - test/fixtures/shapes/README.md

key-decisions:
  - "Exact-name map and every filename grammar are gated by position; the folder table is consulted after them, then unknown"
  - "The research/ row keeps the NN-TOKEN, plan and quick-artifact grammars it had before but not the root-document names, so research/STATE.md cannot take the state kind (T-07-04)"
  - "A first segment under quick/ that is not a {date}-{time}-{slug} folder, and any file directly in quick/, is location other: a stray quick/ folder or note is no longer a drawer task"
  - "Known documents keep their own slot in a phase folder whatever their file class; only the files left over go to the non-text group"
  - "File-name order (not full path) decides ties in the recognised and non-text groups of the After stage"

patterns-established:
  - "kindOfPath(relUnderPlanning, location) is the single kind derivation; the walk keeps the pinned debug and positionKind literals in front of it"
  - "Folder rows carry kindOf(segmentsAfterFolder), so a later URL grammar reads folder, urlSegment and nameRule from the same table"

requirements-completed: [DATA-07]

coverage:
  - id: D1
    description: "COVERAGE.md, deferred-items.md and SKELETON.md in a phase or quick-task folder, .continue-here.md at any depth, root HANDOFF.json and root PATTERNS.md (graduated-patterns, never patterns) get their kinds by position (DATA-07)"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "test/folders.test.ts#kindOfPath - the exact-name map"
        status: pass
      - kind: e2e
        ref: "test/recognition-kinds.test.ts#recognition by position - every Shapes fixture file"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every filename grammar applies only at its position: a root-document name one folder deeper is unknown while the root document keeps its kind; archived quick tasks keep plan and summary"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "test/folders.test.ts#kindOfPath - filename grammars apply only at their position"
        status: pass
      - kind: e2e
        ref: "test/recognition-kinds.test.ts#recognition by position - tracer (Shapes)"
        status: pass
    human_judgment: false
  - id: D3
    description: "One folder table maps every top-level GSD folder to its kind rule, URL segment and name rule, each row citing its GSD source; any other folder is unknown"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "test/folders.test.ts#FOLDER_RULES"
        status: pass
      - kind: unit
        ref: "test/folders.test.ts#kindOfPath - the folder table"
        status: pass
    human_judgment: false
  - id: D4
    description: "Files directly under phases/, in a non-phase folder under phases/ or milestones/vX.Y-phases/, and under quick/ outside a dated task folder keep a model entry at location other; for every committed fixture root and this repository every discovered path is in presentation.artifacts"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "test/discovery.test.ts#discover - position-aware classification"
        status: pass
      - kind: integration
        ref: "test/recognition-kinds.test.ts#the walk and the model agree (describe.each over ALL_FIXTURE_ROOTS)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The drawer lists a phase's recognised unprefixed files and its images, binaries and large files in the After stage in the contracted order, with fileClass and sizeBytes on each row; internal files and plain text produce no row"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "test/presentation/drawer.test.ts#buildDrawerViewModel - the After stage (DATA-07, DATA-08)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The dense golden changed only where recognition changed"
    verification:
      - kind: unit
        ref: "test/snapshot.golden.test.ts (dense, regenerated and reviewed)"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-10-26
status: complete
commits: 4
plan_head_before: 22302279a5a6bb797229264c01c925a468e2a76a
plan_head_after: 3b605f856f5f77394cdc3f25dc95f8ea405cc118
---

# Phase 7 Plan 02: Recognition by Position and the Folder Table Summary

**One pure folder table (17 GSD folders, each citing its source) plus position-gated filename grammars recognise COVERAGE.md, deferred-items.md, SKELETON.md, .continue-here.md, HANDOFF.json and the root PATTERNS.md by where they live, stop a deeper ROADMAP.md posing as the root one, keep stray files in the model, and place recognised unprefixed files and images/binaries in a phase's drawer After stage.**

## Performance

- **Duration:** about 21 min
- **Started:** 2026-10-26T19:52:00Z (approximate, not captured at start)
- **Completed:** 2026-10-26T20:13:00Z
- **Tasks:** 3 (tracer, TDD folder table, non-text drawer rows and golden review)
- **Files modified:** 31 (8 authored code and test-helper files, 21 Shapes fixture files and ledger, 1 golden, 1 comment fix)

## Accomplishments

- Tracer: a COVERAGE.md and a HANDOFF.json are recognised by position from disk to the drawer, and `sketches/001-shelf-board/synthetic-planning/ROADMAP.md` is `unknown` while the root ROADMAP.md keeps `roadmap`. Tracer `<verify>` is automated-only and `human_verify_mode` is end-of-phase, so it was re-run after the commit (4 files, 48 tests passed): tracer verified end-to-end, expansion continued.
- `folders.ts`: `EXACT_NAME_KINDS` (byte-equal, case-sensitive, scoped to root, phase-or-quick folder or any depth), `kindOfPath` (exact names, then grammars gated by position, then the folder table, then `unknown`), and `FOLDER_RULES` for codebase, research, notes, todos, debug, spikes, sketches, seeds, threads, reports, forensics, onboarding, intel, graphs, ui-reviews, quick-batches and workstreams (reserved).
- `classify()`: a file directly under `phases/` or `milestones/vX.Y-phases/`, or inside a folder that does not parse as a phase directory, is location `other` with no identity; under `quick/` only a `{date}-{time}-{slug}` folder is a task, so `quick/README.md` has `quickTaskId` null.
- Walk-equals-model: `ALL_FIXTURE_ROOTS` (eight fixture roots plus this repository) all satisfy "every discovered path is in `presentation.artifacts`".
- Drawer: `fileClass` and `sizeBytes` on every `DrawerFileRow`; a phase's After stage lists known post-plan documents, then Continue here / Coverage / Deferred items / Skeleton, then image, binary and large files labelled with their full file name.
- Kind probe over all nine roots before and after: the only change outside the Shapes fixture is `fixtures/dense` `HANDOFF.json` (`unknown` to `handoff`).

## Task Commits

1. **Task 1: tracer, COVERAGE.md and HANDOFF.json by position, deeper ROADMAP.md demoted** - `0caab5c` (feat)
2. **Task 2: folder table, strays kept in the model, walk-equals-model (TDD)**
   - RED: `4d725e5` (test)
   - GREEN: `93dcbb0` (feat)
   - REFACTOR: none needed
3. **Task 3: non-text drawer rows and the reviewed golden** - `3b605f8` (feat)

**Plan metadata:** the docs commits that follow this file (SUMMARY, then STATE/ROADMAP/REQUIREMENTS).

## TDD Gate Compliance

- **RED** (`4d725e5`): 50 of the new tests failed before any folder code. Target test `test/folders.test.ts > kindOfPath - the folder table > codebase/ARCHITECTURE.md (other) is codebase-architecture` failed on its planned assertion (`expected 'unknown' to be 'codebase-architecture'`). The single-target tap-flat rerun was submitted to `gsd-tools check tdd-red-evidence` and returned `RED_EVIDENCE_OK` (`target_test_failed`). Semantic assessment: the target executed and failed because no folder table existed; no syntax, import or fixture fault. The `FOLDER_RULES` tests failed with TypeErrors from not-yet-exported symbols and were not used as evidence.
- **GREEN** (`93dcbb0`): all 188 tests in the four target files pass.
- **REFACTOR:** none.
- Gate log check found the `test(07-02)` commit before the `feat(07-02)` commits.

## Dense golden diff (reviewed in full)

`git diff 2230227..HEAD -- test/__golden__` lists only `dense.json`, three changed lines, all one file:

- `.planning/HANDOFF.json` kind: `unknown` to `handoff` (artifact entry, plus the `artifactKind` of its two phase-reference entries).

No root-name file one folder deeper exists in the dense fixture, so nothing else changed. sparse-empty and sparse-started are untouched. (The golden was regenerated in Task 1, where the change happens, rather than Task 3, so no commit leaves a failing golden; Task 3 re-ran `-u` and produced no further diff.)

## Files Created/Modified

- `src/planning-repo/folders.ts` - the folder table, exact-name map and position-gated `kindOfPath`
- `src/planning-repo/discovery.ts` - `deriveKind` deleted; the walk falls back to `kindOfPath`; `classify()` keeps strays at location `other`
- `src/presentation/drawer.ts` - `fileClass`/`sizeBytes` on rows; recognised unprefixed and non-text files in the After stage
- `src/planning-repo/handlers/artifact-token.ts` - comment now names `kindOfPath` instead of the deleted `deriveKind`
- `test/folders.test.ts`, `test/recognition-kinds.test.ts`, `test/helpers/fixture-roots.ts` - new
- `test/discovery.test.ts`, `test/presentation/drawer.test.ts` - updated and extended
- `test/fixtures/shapes/**` - one example of each recognised shape, each with a ledger row

## Decisions Made

See `key-decisions`. In one line each: gate everything by position because the same name means different things in different folders; keep research/'s old non-root grammars so the plan's "keep exactly the kinds they have" holds for real files without reopening the spoofing hole; follow the plan's rule that only a dated folder is a quick task; known documents keep their slot so a large REVIEW.md does not move.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two existing drawer tests asserted behaviour the plan changes**
- **Found during:** Tasks 1 and 2
- **Issue:** `splits files into before, plans, after and other` expected `deferred-items.md` in `other`; `lists a group newest first, with unparseable names last and undated` expected `quick/stray-dir/notes.md` and `quick/loose-note.md` as undated quick tasks. The plan's recognition rules (deferred-items is a recognised unprefixed file; only a dated folder is a quick task) contradict both.
- **Fix:** First test now expects `Deferred items` in After and `UI review` alone in `other`. Second test now expects three dated tasks and asserts the two strays are location `other` in the presentation.
- **Files modified:** `test/presentation/drawer.test.ts`
- **Verification:** drawer tests pass (40).
- **Committed in:** `0caab5c` and `93dcbb0`

**2. [Rule 1 - Bug] Dense golden regenerated in Task 1, not Task 3**
- **Found during:** Task 1
- **Issue:** Recognising HANDOFF.json in the tracer changed three golden lines, so the tracer commit would have left `test/snapshot.golden.test.ts` failing.
- **Fix:** Regenerated and reviewed the golden in the tracer commit; Task 3 re-ran the update and the diff was unchanged.
- **Committed in:** `0caab5c`

**3. [Rule 1 - Plan interpretation] research/ row keeps three legacy grammars but not the root-document names**
- **Found during:** Task 2
- **Issue:** The plan says research files keep exactly their kinds from before, yet also says no root-document name below the root may take a root kind (T-07-04). The two conflict for a hypothetical `research/STATE.md`.
- **Fix:** The research row applies the plan, `NN-TOKEN` and quick-artifact grammars as before and drops the root-document and `vX.Y-` names. Every real research file in all nine roots is `unknown` either way (the probe shows no change).
- **Files modified:** `src/planning-repo/folders.ts`
- **Committed in:** `93dcbb0`

---

**Total deviations:** 3 auto-fixed (2 bugs in existing test expectations, 1 plan-text conflict resolved toward the threat model). **Impact on plan:** no scope creep. One behaviour consequence worth carrying forward: loose files and stray folders under `quick/` are no longer drawer tasks (they remain in the model and search at location `other`).

## Issues Encountered

- `npm run test:gate` reports `total=3788 passed=3785 failed=3 skipped=0`. The three failures are the pre-existing baseline: `test/web/pattern-map-corpus.test.ts` (one) and `test/web/ui-spec-corpus.test.ts` (two) want pinned entries for this phase's own `07-PATTERNS.md` and `07-UI-SPEC.md`. Not touched by this plan. Typecheck and lint exit 0.
- Prettier flags the touched source files, but it flags untouched ones too (naming.ts) and is not part of lint or the gate, so formatting was left as the repository has it.

## Known Stubs

None.

## Threat Flags

None. T-07-04 (spoofing by a root-document name below the root) is mitigated: grammars are position-gated and `test/folders.test.ts` pins each gate, including the sketch ROADMAP.md and STATE.md, `phases/05-x/ROADMAP.md` and `workstreams/alpha/STATE.md`. T-07-05: `config.json` stays kind `config` at the root through the unchanged grammar path; the folder table adds no second reader for it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 07-04 can read `folder`, `urlSegment` and `nameRule` for every top-level folder from `FOLDER_RULES`; the new kinds are on the wire and have no designed view, so they fall back to the generic notice (kinds absent from `VIEW_KINDS`, except `coverage`, which engages the existing generic coverage manifest by design).
- The drawer view model carries `fileClass` and `sizeBytes` per row; rendering the `{EXT} · {size}` badge and `data-file-class` attribute from UI-SPEC section 3 is still to do in the web layer.
- The three baseline failures above need 07-PATTERNS and 07-UI-SPEC pins, which belong to the phase docs.

## Self-Check: PASSED

- Created files exist on disk (folders.ts, fixture-roots.ts, both new test files, all Shapes fixture files listed in the ledger).
- Commits 0caab5c, 4d725e5, 93dcbb0 and 3b605f8 are ancestors of HEAD; measured count 4 from the persisted ledger.
- Task acceptance criteria re-run and passing; plan-level verification: full gate shows only the three baseline failures, typecheck and lint exit 0, dense golden diff reviewed.
