---
phase: 07-recognised-files-and-readable-urls
plan: 01
subsystem: planning-repo
tags: [file-class, discovery, readHead, internal-files, fixtures, vitest]

requires:
  - phase: 06-test-health-and-security
    provides: Lendshed-style made-up fixture rules, test:gate, source-scan helpers
provides:
  - "src/planning-repo/file-class.ts: the file-class policy decided before any read (extension sets, bounded NUL sniff, 1 MiB cap, position-scoped internal rules)"
  - "FileClass, Artifact.fileClass/sizeBytes, ArtifactRef.fileClass/sizeBytes, ArtifactDto.fileClass/sizeBytes"
  - "PlanningFilesystem port: DirEntry.size and optional readHead(relPath, maxBytes) in LocalFs and the in-memory port (which now holds bytes)"
  - "The made-up Shapes fixture project (Kilnrow) with test/helpers/shapes-project.ts"
affects: [07-02, 07-03, 07-04, 07-05, 07-06, 07-07, 07-08, 07-09, 07-10]

actuals:
  tokens: 42000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Policy decided before any read: discovery classes a file from name, port size and a bounded head; the registry returns the empty-body shape for non-text refs without calling read()"
    - "Position-scoped internal rules: root-only name set, root-only folders, and a .lock/.tmp suffix rule at any depth"
    - "Binary fixtures are carried as Uint8Array through the in-memory port so size parity with LocalFs holds"

key-files:
  created:
    - src/planning-repo/file-class.ts
    - test/helpers/shapes-project.ts
    - test/file-class.test.ts
    - test/recognition-classes.test.ts
    - test/fixtures/shapes/README.md
    - test/fixtures/shapes/.planning/ (PROJECT.md, ROADMAP.md, STATE.md, config.json, state.json, milestone.lock, estimation-calibration.json, tmp/, async-jobs/, phases/01-kiln-bookings/ (CONTEXT, PNG, PDF), ui-reviews/ (PNG, SVG), notes/ (two NUL stubs), sketches/001-shelf-board/state.json)
  modified:
    - src/domain/model.ts
    - src/planning-fs/types.ts
    - src/planning-fs/local-fs.ts
    - src/planning-fs/in-memory-fs.ts
    - src/planning-repo/types.ts
    - src/planning-repo/discovery.ts
    - src/planning-repo/registry.ts
    - src/planning-repo/assemble.ts
    - src/server/project-presentation.ts
    - src/server/search-index.ts
    - test/helpers/from-directory.ts
    - test/fs-equivalence.test.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-empty.json
    - test/__golden__/sparse-started.json

key-decisions:
  - "classifyFile sniffs the head only for a name whose extension decides nothing (needsHeadSniff), so a NUL inside notes.md does not make it binary; known text extensions are text by name"
  - "isInternalPath applies the .lock/.tmp suffix rule case-insensitively to files at any depth, while the root name set is byte-equal (STATE.JSON stays visible, Milestone.Lock is internal by its suffix)"
  - "estimation-calibration.json is internal (planner assumption A4), so the dense fixture's copy moved from artifacts to exclusions"
  - "The in-memory port reports sizes for text too, so fs-equivalence stays green from the tracer on"

patterns-established:
  - "File class is a property of the ref and the artifact; every consumer reads fileClass instead of re-deriving it from a path"
  - "Test literals for ArtifactRef, Artifact and ArtifactDto carry fileClass: 'text', sizeBytes: 0 unless a test is about classes"

requirements-completed: [DATA-07, DATA-08]

coverage:
  - id: D1
    description: "A PNG in a phase folder is listed in /api/presentation as fileClass image with its on-disk size, bodyLength 0 and its file name as title (DATA-08)"
    requirement: DATA-08
    verification:
      - kind: e2e
        ref: "test/recognition-classes.test.ts#lists the PNG as an image with its on-disk size, an empty body and its file name as the title"
        status: pass
    human_judgment: false
  - id: D2
    description: "No image, binary or large file is ever passed to read(), and none enters the search index (D-10)"
    requirement: DATA-08
    verification:
      - kind: e2e
        ref: "test/recognition-classes.test.ts#never passes the PNG to read()"
        status: pass
      - kind: unit
        ref: "test/file-class.test.ts#never head-sniffs an image, a binary or a known-text name, and never reads a non-text ref"
        status: pass
      - kind: e2e
        ref: "test/recognition-classes.test.ts#returns no hit for a word that only appears inside the SVG script"
        status: pass
    human_judgment: false
  - id: D3
    description: "The file-class policy: binary extensions, the 8000-byte NUL sniff window, the 1,048,576-byte text cap, case-insensitive extensions, zero-byte files"
    requirement: DATA-08
    verification:
      - kind: unit
        ref: "test/file-class.test.ts#classifyFile (extension, sniff and size-cap groups)"
        status: pass
      - kind: unit
        ref: "test/file-class.test.ts#discovery through the in-memory port"
        status: pass
    human_judgment: false
  - id: D4
    description: "GSD internal files and folders are absent from artifacts, drawer inputs and search, recorded once each as exclusions, position-scoped, with config.json kept (D-11)"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "test/file-class.test.ts#isInternalPath - position-scoped GSD bookkeeping"
        status: pass
      - kind: e2e
        ref: "test/recognition-classes.test.ts#keeps every internal fixture path out of the payload and records each once as an exclusion"
        status: pass
      - kind: e2e
        ref: "test/recognition-classes.test.ts#keeps config.json in the index and a state.json one level down as a visible text artifact"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both ports agree on the Shapes fixture byte for byte, and refresh() reclassifies from scratch inside a swapped bundle"
    verification:
      - kind: unit
        ref: "test/fs-equivalence.test.ts#fs-equivalence - shapes"
        status: pass
      - kind: unit
        ref: "test/recognition-classes.test.ts#reclassifies an extension-less file by its new head and drops a new internal file, leaving the first snapshot untouched"
        status: pass
      - kind: unit
        ref: "test/server/derived-snapshot-isolation.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "The web layer never renders discovery exclusions (prohibition, D-11)"
    verification:
      - kind: unit
        ref: "test/recognition-classes.test.ts#finds the word \"exclusions\" nowhere in src/web"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-10-26
status: complete
commits: 4
plan_head_before: 8764ab147cf8f82c69f7aea8861dc24e66c85fd0
plan_head_after: a2d44a455dcc15c60f2d15c021b078cfa04f6b70
---

# Phase 7 Plan 01: File Recognition and Internal Files Summary

**File-class policy decided before any read: images, binaries and oversized text are listed with their size and never read or indexed, and GSD bookkeeping (state.json, locks, tmp/, async-jobs/, logs/) is excluded by position, proven from the filesystem port to /api/presentation and /api/search against a made-up Shapes project.**

## Performance

- **Duration:** about 30 min
- **Started:** 2026-10-26T19:19:33Z
- **Completed:** 2026-10-26T19:50:00Z
- **Tasks:** 3 (tracer, TDD policy, equivalence and golden review)
- **Files modified:** 95 (including 59 test literals that gained two fields, 3 goldens and the new fixture tree)

## Accomplishments

- Tracer: a PNG in a Shapes phase folder reaches the presentation payload as `fileClass: 'image'` with `sizeBytes` equal to its length on disk, `bodyLength: 0` and its file name as title; a spy filesystem records no `read()` of it; a search for its name finds no `.png` hit. Root `state.json` is absent from the payload and recorded once as an exclusion.
- Policy module `file-class.ts` (no node imports): extension sets, `needsHeadSniff`, `classifyFile` (image, binary, bounded 8000-byte NUL sniff, 1,048,576-byte cap), and `isInternalPath` with each GSD name cited to the GSD file that writes it.
- Port additions: `DirEntry.size`, optional `readHead` (LocalFs opens read-only through `resolveContained`, closes in `finally`); the in-memory port accepts `Uint8Array` contents, reports sizes and implements `readHead`.
- Shapes fixture project (Kilnrow) with a README ledger of every file and a helper that throws when the fixture is missing.
- Byte-for-byte LocalFs vs in-memory equivalence on Shapes, refresh reclassification, and a standing source scan that `src/web` never names discovery exclusions.

## Task Commits

1. **Task 1: tracer, one PNG and one internal state.json end to end** - `f31f995` (feat)
2. **Task 2: every file class and internal rule (TDD)**
   - RED: `df7ff5a` (test)
   - GREEN: `f44bd5f` (feat)
   - REFACTOR: none needed
3. **Task 3: equivalence, refresh, web guard, reviewed golden diff** - `a2d44a4` (test)

**Plan metadata:** the docs commits that follow this file (SUMMARY, then STATE/ROADMAP/REQUIREMENTS).

## Tracer feedback gate

Tracer `<verify>` is automated-only (`npx vitest run test/recognition-classes.test.ts`); human_verify_mode is end-of-phase, so it was re-run after the commit, passed (4 of 4), and expansion continued: tracer verified end-to-end.

## TDD Gate Compliance

- **RED** (`df7ff5a`): 20 of the new tests failed before any policy code. Target test `test/file-class.test.ts > classifyFile - by extension, with no head needed > classes known binary extensions as binary` failed on its planned assertion (`sheet.pdf: expected 'text' to be 'binary'`) because only the image rule existed. `gsd-tools check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`) on the single-target rerun. The whole-file TAP run was first rejected as `invalid_record` (`Non-TAP data in report`: vitest's TAP-flat reporter emits multi-line `expected` values unindented), so per the reference the planned target was rerun alone with the same reporter and that real record submitted. Semantic assessment: the target executed and failed for the intended reason; no syntax, import or fixture fault. Other RED failures were TypeErrors from not-yet-exported symbols (`BINARY_EXTENSIONS`, `readHead`), which are expected in a RED set and were not used as evidence.
- **GREEN** (`f44bd5f`): all 56 tests in the three target files pass.
- **REFACTOR:** none.
- Gate log check found both the `test(07-01)` and `feat(07-01)` commits.

## Files Created/Modified

- `src/planning-repo/file-class.ts` - the policy: constants, extension sets, `classifyFile`, `needsHeadSniff`, `isInternalPath`
- `src/planning-fs/types.ts`, `local-fs.ts`, `in-memory-fs.ts` - `DirEntry.size`, `readHead`, bytes-capable in-memory port
- `src/planning-repo/discovery.ts` - internal exclusions before the dir/file branch; head sniff only where the extension decides nothing
- `src/planning-repo/registry.ts` - empty-body literal for non-text refs before `fs.read`
- `src/domain/model.ts`, `src/planning-repo/types.ts`, `assemble.ts`, `src/server/project-presentation.ts` - `fileClass` and `sizeBytes` on ref, artifact and DTO
- `src/server/search-index.ts` - only text-class artifacts are reachable for indexing
- `test/fixtures/shapes/**`, `test/helpers/shapes-project.ts` - the Shapes project and helper
- `test/helpers/from-directory.ts` - keeps image/binary/NUL files as bytes
- `test/file-class.test.ts`, `test/recognition-classes.test.ts`, `test/fs-equivalence.test.ts` - new and extended tests

## Golden diff review

`git diff 8764ab1 -- test/__golden__` read in full. Allowed changes only:

- `fileClass` and `sizeBytes` keys added on every artifact: 147 of each (dense 58+... across the artifact maps; sparse-empty 1 artifact file entry set; sparse-started 5), every `fileClass` is `"text"`.
- One file moved from artifacts to exclusions in `dense.json`: `.planning/estimation-calibration.json` (25 removed lines, replaced by an exclusion with reason `GSD internal file, kept out of the index (D-11)`).
- No other line changed.

## Decisions Made

See `key-decisions` above. Rationale in one line each: sniff only where the name decides nothing (keeps `.md` with an odd byte readable and matches the plan's own behavior list); suffix rule is case-insensitive because GSD temp names vary in case while root names are exact; A4 kept as planned and reversible (adding a name back is additive).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Required `fileClass`/`sizeBytes` broke typecheck in 53 test files**
- **Found during:** Task 1
- **Issue:** `ArtifactRef`, `Artifact` and `ArtifactDto` literals in 53 existing test files no longer typechecked once the fields became required, and `search-index` would have skipped any artifact without `fileClass: 'text'`.
- **Fix:** Added `fileClass: 'text', sizeBytes: 0` to each literal (scripted insertion, then four hand repairs where the script hit a wrong literal; typecheck is the proof).
- **Files modified:** 53 test files, none under `src/`.
- **Verification:** `npm run typecheck` rc 0; full suite unchanged except baseline failures.
- **Committed in:** `f31f995`

**2. [Rule 1 - Bug] In-memory port had no sizes, so fs-equivalence and discovery expectations broke at the tracer**
- **Found during:** Task 1
- **Fix:** `InMemoryPlanningFilesystem.list()` sets `size` for files from the tracer on (Task 2 extended it to bytes); `test/discovery.test.ts` expectation gained `fileClass: 'text', sizeBytes: 7`.
- **Committed in:** `f31f995`

**3. [Rule 1 - Bug] Four existing tests asserted the dense fixture's old counts and its estimation-calibration.json artifact**
- **Found during:** Task 2
- **Issue:** With A4 in force, the dense fixture has 51 discovered files and 22 root artifacts, one more exclusion, and `config-masking` read the calibration file as an artifact.
- **Fix:** Updated `test/assemble.test.ts` (52 to 51, 23 to 22, search documents 52 to 51), `test/server/project-presentation.test.ts` (second exclusion) and `test/config-masking.test.ts` (HANDOFF.json unchanged; calibration file now absent and excluded). The `json-config` handler still lists the name; harmless.
- **Committed in:** `f44bd5f`

**4. [Rule 1 - Plan inconsistency] Task 3's refresh case used `notes/a.md` with a NUL body expected to become binary**
- **Issue:** Task 2's own behavior list classes `.md` as text without a sniff, so that expectation contradicts the policy.
- **Fix:** The refresh test uses an extension-less file (`notes/entry`) that goes from words to a NUL-bearing body and asserts binary, an empty body, the new internal `state.json` excluded and the first snapshot unchanged.
- **Committed in:** `a2d44a4`

**5. [Rule 1 - Bug] Tracer assertion too broad once the sketch `state.json` existed**
- **Fix:** The tracer test asserts `.planning/state.json` itself is absent rather than any path ending in `/state.json`.
- **Committed in:** `df7ff5a`

---

**Total deviations:** 5 auto-fixed (1 blocking, 4 bugs/inconsistencies). **Impact on plan:** all necessary for correctness; no scope creep. Touching 53 test files beyond `files_modified` is the one notable footprint.

## Issues Encountered

- Three tests fail before and after this plan, not touched by it: `test/web/pattern-map-corpus.test.ts` (one) and `test/web/ui-spec-corpus.test.ts` (two) want pinned entries for this phase's own `07-PATTERNS.md` and `07-UI-SPEC.md`. `npm run test:gate` therefore reports `total=3642 passed=3639 failed=3 skipped=0`; every other test passes, and typecheck and lint exit 0.
- vitest's TAP-flat reporter produced a record the classifier rejected until the RED target was rerun on its own (see TDD Gate Compliance).

## Known Stubs

None.

## Threat Flags

None. The new surface (`readHead`, per-file `size` in `list()`) goes through the same containment guard as `read()` and opens read-only, as T-07-03 requires. Mitigations in place: T-07-01 (size from the stat, `large` never read, head bounded to 8000 bytes), T-07-02 (internal files never become refs; source scan shows `src/web` never names exclusions), T-07-03.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Every later plan can read `fileClass` and `sizeBytes` from the presentation and rely on internal files being absent; `MAX_IMAGE_BYTES` is exported for the image page.
- Shapes already carries the phase folders and README ledger rows that 07-02 to 07-04 extend; only plan 07-01 edits its `ROADMAP.md`.
- The three baseline failures above need 07-PATTERNS and 07-UI-SPEC pins, which belong to the phase docs and not to this plan.

## Self-Check: PASSED

- Created files exist on disk (file-class.ts, shapes-project.ts, both test files, Shapes README and PNG).
- Commits f31f995, df7ff5a, f44bd5f and a2d44a4 are ancestors of HEAD; `check evaluation-scope --plan 07-01 --commits-only` resolved with all four.
- All task acceptance criteria re-run and passing; plan-level verification: `test:gate` over the plan's files passes (197/197), full gate shows only the three baseline failures, typecheck and lint exit 0.

---
*Phase: 07-recognised-files-and-readable-urls*
*Completed: 2026-10-26*
