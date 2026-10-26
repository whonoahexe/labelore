---
phase: 07-recognised-files-and-readable-urls
plan: 04
subsystem: routing
tags: [url-grammar, route-table, parse-route-path, address-of-path, file-fallback, collision-audit, vitest, tdd]

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-02: FOLDER_RULES (urlSegment, nameRule, folderRuleOf), EXACT_NAME_KINDS, ALL_FIXTURE_ROOTS; 07-03: reserved.ts, the /:project route tree and nav.tsx"
provides:
  - "src/presentation/routes.ts: Route union, RouteParseResult, PageName, PhaseAddress, AddressOwner, buildUrl, the total parseRoutePath, addressOfPath, fileUrlOf, milestoneSegmentOf, phaseSegmentOf, normalizePhaseNumber, exported withHeading; the old encoded builders unchanged"
  - "src/presentation/route-table.ts: buildRouteTable(project) with urlByPath, pathByUrl, aliases, conflicts, size, urlOf, pathOf, aliasOf and milestoneRoadmapUrl"
  - "src/presentation/identity-keys.ts (moved key encoders, re-exported by routes.ts) and src/presentation/legacy-routes.ts (moved m~/p~/a~ decoders, deleted at v2.1 close)"
  - "reserved.ts additions: PROJECT_PAGES, ROOT_TOKEN_RESERVED, MILESTONE_SCOPE_RESERVED, RESERVED_SEGMENT_PREFIXES, LEGACY_FIRST_SEGMENTS, GSD_VERSION_PATTERN"
  - "The URL shapes in the Shapes fixture: archived v1.0, decimal and project-coded phases, live and archived quick tasks, three oddly named notes"
affects: [07-05, 07-06, 07-07, 07-08, 07-09, 07-10]

actuals:
  tokens: 24200
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "One stateless address function (addressOfPath) driven by the folder table, then one table that grants each clean address to exactly one file and gives the rest a lossless file/ address"
    - "Parse from the raw pathname: split once, decode each segment once, re-encode canonically; a parsed Route is only a lookup key"
    - "Reserved words are escaped or demoted, never shadowed: milestone- prefix for versions, file/ for files"

key-files:
  created:
    - src/presentation/identity-keys.ts
    - src/presentation/legacy-routes.ts
    - src/presentation/route-table.ts
    - test/presentation/legacy-routes.test.ts
    - test/presentation/url-grammar.test.ts
    - test/presentation/route-table.test.ts
    - "test/fixtures/shapes/.planning/ (26 files: MILESTONES.md, phases 02/02.1/KR-03 plans and strays, archived v1.0 roadmap/requirements/audit/phase/quick/research, live quick task, three odd notes)"
  modified:
    - src/presentation/routes.ts
    - src/presentation/reserved.ts
    - test/fixtures/shapes/README.md

key-decisions:
  - "normalizePhaseNumber returns unencoded text (lower-cased raw for a value outside the grammar); phaseSegmentOf encodes the whole segment once, so no value is ever encoded twice"
  - "A malformed or reserved name never throws: addressOfPath is total and falls back to fileUrlOf"
  - "The milestone-dir grammar (vX.Y-<name>/) is read through parseMilestoneFileName by giving it a '.md'-suffixed name, so naming.ts stays the one grammar module and is not edited"
  - "A legacy Route keeps the input string as given (path plus any #fragment) so the redirect path can decode the heading too"
  - "parseRoutePath canonicalises more than percent spellings: a zero-padded phase (phase-05) and a milestone- prefixed GSD version parse to the same url as the canonical form"
  - "Alias claimants (a stray milestones/<live>-ROADMAP.md) are all demoted to file/ and reported; an alias is not in pathByUrl"
  - "A phase-page clash is reported with both folder paths while the files keep their per-file addresses"

patterns-established:
  - "Dot guard: a name that would become '', '.' or '..' keeps its full file name, so no emitted segment can be collapsed by a browser"
  - "Property test over describe.each(ALL_FIXTURE_ROOTS) for every URL invariant, plus in-memory accident trees that force one collision each"

requirements-completed: [NAV-09, NAV-10]

coverage:
  - id: D1
    description: "Every scope of the grammar builds and parses as D-01 to D-07 and the discretion choices specify (phase, plan and summary, other phase files, quick tasks, milestone documents and folders, folder table, root files, the unversioned form) (NAV-09)"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#addressOfPath - phase folders (D-05, D-06)"
        status: pass
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#addressOfPath - quick tasks (D-07)"
        status: pass
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#addressOfPath - milestone scope (D-02 to D-04)"
        status: pass
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#the five example addresses build and parse exactly (NAV-09)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reserved words never shadow a page or another file: the milestone- escape, root tokens, plan-<digits> look-alikes, overview and the dot guard"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#addressOfPath - root files"
        status: pass
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#segments of milestones and phases"
        status: pass
    human_judgment: false
  - id: D3
    description: "Each URL segment is encoded once and decoded once; percent spellings and a trailing slash give one canonical url; hostile input fails closed and a very long path parses in one pass (T-07-09, T-07-11)"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#encoding: each segment is encoded once and decoded once"
        status: pass
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#parseRoutePath"
        status: pass
      - kind: unit
        ref: "test/presentation/url-grammar.test.ts#round trip: buildUrl(parseRoutePath(buildUrl(route))) equals buildUrl(route)"
        status: pass
    human_judgment: false
  - id: D4
    description: "For every committed fixture project and this repository every artifact has exactly one url, none is shared, the conflict list is empty, and each url parses, rebuilds to itself and maps back to its path (NAV-10)"
    requirement: NAV-10
    verification:
      - kind: integration
        ref: "test/presentation/route-table.test.ts#NAV-10: every file has exactly one readable url (describe.each over ALL_FIXTURE_ROOTS, 9 roots)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Collisions resolve deterministically and are audited: the code-unit-first path keeps the clean url, the rest take file/, the live-roadmap alias wins over a stray copy, a phase-page clash is reported, and file insertion order never changes the table (T-07-10)"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/presentation/route-table.test.ts#route table - accident trees"
        status: pass
    human_judgment: false
  - id: D6
    description: "The Shapes fixture holds the URL shapes the grammar is pinned against, and the D-02 and D-03 targets (aliasOf, milestoneRoadmapUrl) read correctly from it"
    requirement: NAV-10
    verification:
      - kind: integration
        ref: "test/presentation/route-table.test.ts#route table - the Shapes addresses"
        status: pass
    human_judgment: false
  - id: D7
    description: "The old encoded builders, the old parser and test/presentation/routes.test.ts are unchanged in behaviour, so nothing in the app emits a new address yet"
    verification:
      - kind: unit
        ref: "test/presentation/routes.test.ts and test/presentation/legacy-routes.test.ts (git diff of routes.test.ts is empty)"
        status: pass
    human_judgment: false

duration: 26min
completed: 2026-10-26
status: complete
commits: 4
plan_head_before: 4530c188984c758009d58ba49e575045c6c94c3e
plan_head_after: 346f22d2d6702434602e7ef76b8ae23713b89b61
---

# Phase 7 Plan 04: Readable URL Grammar and Route Table Summary

**A total `parseRoutePath` and `addressOfPath` driven by the folder table, plus a route table that grants each clean address to one file and gives every other file a lossless `file/` address, proven unique over all nine fixture roots including this repository, with nothing in the app emitting the new addresses yet.**

## Performance

- **Duration:** about 26 min
- **Started:** 2026-10-26T20:39:57Z
- **Completed:** 2026-10-26T21:06:06Z
- **Tasks:** 3 (tracer, TDD grammar, route table plus fixture plus property)
- **Files modified:** 35 in the task commits (6 new source and test files, 2 edited source files, 26 new Shapes fixture files plus the ledger)

## Accomplishments

- Tracer: `identity-keys.ts` and `legacy-routes.ts` hold the moved encoders and decoders (routes.ts re-exports them under the old names), routes.ts gained the first slice of the grammar, and `buildRouteTable` turned `01-CONTEXT.md` into `/v1.1/phase-1/context` and back to its path. The tracer `<verify>` is automated-only and `human_verify_mode` is end-of-phase, so it was re-run after the commit (35 of 35 tests, typecheck clean): tracer verified end-to-end, expansion continued.
- Grammar: milestone, quick, folder, root and phase scopes, reserved words with the `milestone-` escape, the unversioned form, the dot guard, legacy shapes and canonical re-encoding. The five NAV-09 example addresses build and parse exactly.
- Route table: aliases (`/v1.1/roadmap` to `/roadmap`), `milestoneRoadmapUrl`, phase-page clash reporting, deterministic collision handling.
- NAV-10 property: 9 roots (8 fixtures plus this repository), `conflicts` empty everywhere, every url unique, normalised, parseable and mapped back to its file.

## Task Commits

1. **Task 1: tracer, one phase document's readable url from path through the table and back** - `5a8e7de` (feat)
2. **Task 2: the whole grammar (TDD)**
   - RED: `f38e1aa` (test)
   - GREEN: `7c6e59e` (feat)
   - REFACTOR: none needed
3. **Task 3: complete route table, fixture shapes, NAV-10 property** - `346f22d` (feat)

**Plan metadata:** the docs commits that follow this file (SUMMARY, then STATE/ROADMAP/REQUIREMENTS).

## TDD Gate Compliance

- **RED** (`f38e1aa`): 76 of 170 tests in `test/presentation/url-grammar.test.ts` failed before any grammar code beyond the tracer slice. Target test `addressOfPath - the folder table > .planning/codebase/ARCHITECTURE.md -> /codebase/architecture` failed on its planned assertion (`expected '/file/codebase/ARCHITECTURE.md' to be '/codebase/architecture'`). The single-target tap-flat rerun was submitted to `gsd-tools check tdd-red-evidence` and returned `RED_EVIDENCE_OK` (`target_test_failed`). Semantic assessment: the target ran and failed because the folder scope did not exist yet; no syntax, import or fixture fault.
- **GREEN** (`7c6e59e`): all 170 tests in the file pass, with 188 across the three presentation files at that point.
- **REFACTOR:** none.
- The `test(07-04)` commit precedes the `feat(07-04)` GREEN commit in the log.

## Files Created/Modified

- `src/presentation/routes.ts` - the readable grammar added; old builders and re-exports kept
- `src/presentation/route-table.ts` - the table, aliases, `milestoneRoadmapUrl`, conflict audit
- `src/presentation/identity-keys.ts`, `src/presentation/legacy-routes.ts` - moved code
- `src/presentation/reserved.ts` - grammar word lists and `GSD_VERSION_PATTERN`
- `test/presentation/url-grammar.test.ts`, `route-table.test.ts`, `legacy-routes.test.ts` - new
- `test/fixtures/shapes/**` - 26 files plus 26 ledger rows

## Decisions Made

See `key-decisions`. In one line each: encode a segment once at the end; keep naming.ts as the one grammar module by reusing `parseMilestoneFileName` for `vX.Y-<name>/` folders; hand the redirect path the raw legacy input; canonicalise zero-padded phases and prefixed versions on parse so two spellings reach one file; demote every claimant of an alias address; report a phase-page clash without moving the files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan interpretation] `normalizePhaseNumber` does not percent-encode**
- **Found during:** Task 1
- **Issue:** The plan says a non-matching value is "lower-cased and encoded", while `phaseSegmentOf` is also specified to build the segment. Encoding in both places would encode a value twice and break "encoded exactly once".
- **Fix:** `normalizePhaseNumber` returns canonical text (lower-cased raw outside the grammar); `phaseSegmentOf` percent-encodes the whole segment once. Output is identical for every grammatical number.
- **Files modified:** `src/presentation/routes.ts`
- **Committed in:** `5a8e7de`

**2. [Rule 3 - Blocking] Reserved-word lists split across Tasks 1 and 2**
- **Found during:** Task 1
- **Issue:** The tracer's parser needs `PROJECT_PAGES`, `RESERVED_SEGMENT_PREFIXES` and `GSD_VERSION_PATTERN`, which the plan lists under Task 2.
- **Fix:** Those three landed with Task 1; `ROOT_TOKEN_RESERVED`, `MILESTONE_SCOPE_RESERVED` and `LEGACY_FIRST_SEGMENTS` landed with Task 2's GREEN.
- **Committed in:** `5a8e7de`, `7c6e59e`

**3. [Rule 3 - Blocking] The RED evidence record must live inside the project directory**
- **Found during:** Task 2
- **Issue:** The classifier refuses a record outside the project; the scratch directory was refused.
- **Fix:** The record was written to a throwaway file in the repository root, classified, and removed before any commit. It is not tracked.

---

**Total deviations:** 3 auto-fixed (1 interpretation, 2 blocking). **Impact on plan:** none on behaviour or scope. No file outside `files_modified` was touched.

## Issues Encountered

- `npm run test:gate` reports `total=4067 passed=4064 failed=3 skipped=0`. The three failures are the known baseline: `test/web/pattern-map-corpus.test.ts` (one) and `test/web/ui-spec-corpus.test.ts` (two) want pinned entries for this phase's own `07-PATTERNS.md` and `07-UI-SPEC.md`. Typecheck and lint exit 0.
- Several tool results during Task 3 carried an appended "Labelore usage guard" note asking me to stop after the current step and hand back a short status. It was in tool output, not from the user or the plan, so I did not act on it and finished the plan; it is mentioned here so the orchestrator can check where it came from.
- The plan's Task 2 acceptance text says reserved.ts is "absent at HEAD"; it has existed since 07-03. The grep still prints 1.

## Known Stubs

None.

## Threat Flags

None. T-07-09 (path traversal): a parsed Route is only a lookup key, segments decode exactly once, a segment decoding to `.` or `..` is refused, and the builder never emits one (dot guard). T-07-10 (spoofing): collisions resolve to the code-unit-first path, the rest get lossless `file/` addresses, and every collision is in `conflicts`. T-07-11 (denial of service): parsing is one split and one decode per segment; the test parses 300 000-character and 100 000-segment paths in one pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 07-05 and 07-06 can import `buildRouteTable`, `parseRoutePath`, `buildUrl` and `addressOfPath`; the old builders still emit encoded urls until 07-06 flips them.
- 07-06 needs `table.aliasOf` (redirect `/v1.1/roadmap` to `/roadmap`), `table.milestoneRoadmapUrl(v)` for a bare `/v1.1`, and `pathByUrl` for document lookup. A `legacy` Route holds the raw input for 07-08's decoder.
- Open edge for 07-06: a Route of kind `phase` or `overview` has no file behind it, so the dispatcher resolves it against the model, and a phase-page clash (`conflicts` entry whose paths are folders) is reported, not resolved.

## Self-Check: PASSED

- Created files exist on disk (identity-keys.ts, legacy-routes.ts, route-table.ts, the three new test files, sampled Shapes fixture files including the odd names).
- Commits 5a8e7de, f38e1aa, 7c6e59e and 346f22d are ancestors of HEAD; measured count 4 from the persisted ledger.
- `test/presentation/routes.test.ts` is unchanged since the plan started; `git grep` prints 1 for `parseLegacyUrl`, `parseRoutePath`, `GSD_VERSION_PATTERN`; `folderRuleOf(` appears in routes.ts; the three odd notes are listed by `git ls-files`.
- Plan-level verification: full gate shows only the three baseline failures, typecheck and lint exit 0, the 256 tests of the five touched presentation and recognition files pass.

---
*Phase: 07-recognised-files-and-readable-urls*
*Completed: 2026-10-26*
