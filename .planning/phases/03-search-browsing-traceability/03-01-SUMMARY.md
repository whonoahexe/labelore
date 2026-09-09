---
phase: 03-search-browsing-traceability
plan: 01
subsystem: search
tags: [minisearch, full-text-search, hono, react-router, tanstack-query, base-ui-combobox]

# Dependency graph
requires:
  - phase: 02-dashboard-roadmap-rendering
    provides: presentationRoutePatterns, ArtifactDto/ProjectPresentation shape, PlanningRepository/ProjectSnapshot assembly, the shell/nav/app-router conventions this plan extends
provides:
  - MiniSearch-backed full-text index (SearchDocument/SearchHit/SearchIndexState) over every reachable artifact
  - A dual whole-and-split tokenizer that indexes an ID- or path-shaped token as both its intact literal and its constituent parts
  - A non-blocking readiness state machine (building/ready/error) built off the request-serving path
  - GET /api/search answering 200 in every readiness state
  - The header SearchField combobox and the /search results page, both routed through presentationRoutePatterns
  - D-11 fix — every artifact discover() finds is reachable from the assembled Project (root, phase, archived-phase, quick, milestone-root, research, other), each carrying an authoritative location field
affects: [03-02, 03-03, 03-04]

# Actuals (#2632)
actuals:
  tokens: 31633
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: ["minisearch@7.2.0"]
  patterns:
    - "Non-blocking index construction: build*(snapshot) factory scheduled via setImmediate, state() accessor never returns a half-populated index"
    - "Dual whole-and-split tokenization for ID/path-shaped tokens (ROLE-07 -> role-07 + role + 07)"
    - "ArtifactLocation as a single domain-level union, re-exported (not redeclared) by planning-repo/types.ts — the IdScheme/Mention convention extended to a third type"
    - "QuickTask.artifacts mirrors Phase.artifacts exactly so both artifact-bearing model types share one shape"

key-files:
  created:
    - src/server/search-index.ts
    - src/web/components/search-field.tsx
    - src/web/pages/search-page.tsx
    - test/server/search-index.test.ts
  modified:
    - src/domain/model.ts
    - src/planning-repo/types.ts
    - src/planning-repo/discovery.ts
    - src/planning-repo/assemble.ts
    - src/server/artifact-index.ts
    - src/server/project-presentation.ts
    - src/server/index.ts
    - src/presentation/routes.ts
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - eslint.config.js
    - test/assemble.test.ts
    - test/presentation/roadmap.test.ts
    - test/presentation/routes.test.ts
    - test/rendering/plan-sections.test.ts
    - test/rendering/references.test.ts
    - test/server/deep-links.test.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-empty.json
    - test/__golden__/sparse-started.json

key-decisions:
  - "Resumed Task 1 from a prior killed-executor session's substantially-complete uncommitted work, per explicit user instruction to build on top of it rather than discard it — reconciled, fixed two defects (tab-splitting tokenizer bug, a web-tsconfig typecheck break from setImmediate), and committed as one atomic unit."
  - "Fixed setImmediate/tsconfig.web.json incompatibility with a scoped `/// <reference types=\"node\" />` on search-index.ts rather than switching to setTimeout(0) (whose ordering vs. the test's own setImmediate-based waitForBuild() is unspecified at the top level) or widening tsconfig.web.json's types globally."
  - "search-index.ts's collectReachableArtifacts was extended to walk QuickTask.artifacts as part of Task 2, even though search-index.ts wasn't named in Task 2's file list — required by Task 2's own acceptance criterion (searching a literal path token must return exactly the three quick/ files containing it) and the function's own pre-existing comment already anticipated this exact extension."
  - "Task 3's 9 behavior assertions were investigated individually against the pre-Task-3 implementation (TDD fail-fast rule) and found to genuinely already pass — Task 1's tracer was written production-quality from the start. Documented as the 'feature already exists' branch rather than forcing an artificial RED phase."

patterns-established:
  - "Dual-indexing tokenizer pattern for ID/path-shaped search terms, reusing mentions.ts's ID_PATTERNS.requirement grammar for the ID half."
  - "isReady(state) type guard as the narrow, explicit way to check SearchIndexState readiness."

requirements-completed: [FIND-01, FIND-02, FIND-05]

coverage:
  - id: D1
    description: "Header SearchField and /search page both resolve one shared MiniSearch index through presentationRoutePatterns; an exact requirement ID or file path returns the file containing it."
    requirement: "FIND-02"
    verification:
      - kind: e2e
        ref: "manual tracer run — npm run build && node src/server/index.ts fixtures/dense --port 4311, GET /api/search?q=IDENT-02"
        status: pass
      - kind: unit
        ref: "test/server/search-index.test.ts#processSearchTerm dual-indexes an ID-shaped/path-shaped token"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every artifact discover() finds is reachable from the assembled Project, carrying an authoritative location field — 52/52 for fixtures/dense, and confirmed equal for sparse-empty (3/3) and sparse-started (7/7)."
    requirement: "FIND-01"
    verification:
      - kind: unit
        ref: "test/assemble.test.ts#D-11 reachable-equals-discovered — makes the set of reachable artifact paths exactly equal the set of discovered paths — 52 members"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET /api/search answers HTTP 200 in every readiness state (building/ready/error), and /api/dashboard is never blocked by index construction."
    requirement: "FIND-05"
    verification:
      - kind: integration
        ref: "test/server/search-index.test.ts#createApp — /api/search readiness integration (Task 3)"
        status: pass
      - kind: other
        ref: "npm run smoke — 'Labelore smoke passed' unchanged after Task 3"
        status: pass
    human_judgment: false
  - id: D4
    description: "Search UI states (empty/loading/error/populated/partial/overflow) match 03-UI-SPEC.md's Copywriting Contract and search-header-field/search-dropdown resolutions exactly."
    verification: []
    human_judgment: true
    rationale: "Visual/interaction correctness of the Combobox dropdown states, debounce feel, and copy rendering needs a human's eyes on the real browser UI — no automated test asserts pixel-level layout or perceived responsiveness."

duration: 47min
completed: 2026-09-02
status: complete
---

# Phase 3 Plan 1: Exact-Token Search Summary

**MiniSearch-backed full-text search with a dual whole-and-split tokenizer for ID/path-shaped tokens, a non-blocking readiness state machine, and a D-11 fix making every discovered artifact reachable and location-tagged.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-09-02T09:31:00Z (resumed session; task 1 work substantially pre-existing)
- **Completed:** 2026-09-02T10:18:25Z
- **Tasks:** 3
- **Files modified:** 27 (4 created, 23 modified — includes 3 golden fixtures and eslint.config.js)

## Accomplishments

- End-to-end exact-token search wired from source markdown through MiniSearch to a rendered browser row: header `SearchField` combobox, `/search` results page, `GET /api/search`, all resolving through `presentationRoutePatterns` rather than hand-built hrefs.
- Dual whole-and-split tokenizer (`tokenizeSearchText`/`processSearchTerm`) indexes an ID- or path-shaped token (`ROLE-07`, `backend/src/authz/mod.rs`) as both its intact lowercased literal and every split constituent part longer than one character, satisfying FIND-02's exact-token guarantee.
- Non-blocking readiness state machine (`createSearchIndexState`/`isReady`): `building` → `ready`/`error`, MiniSearch construction scheduled off the request path via `setImmediate`, so `GET /api/search` and `/api/dashboard` both answer 200 while the index builds — satisfies FIND-05.
- D-11 closed at the source: `Artifact.location` (a single `ArtifactLocation` union defined once in `domain/model.ts`) and `QuickTask.artifacts` (mirroring `Phase.artifacts`) mean every file `discover()` finds is reachable from the assembled `Project` — proven by an equality assertion across all three fixtures (dense: 52/52, sparse-started: 7/7, sparse-empty: 3/3), not a spot check.
- `LOCATION_ORDER` hoisted to a module-level export in `discovery.ts` for future consumers (e.g. a tree navigator) to reuse the one committed ordering.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end exact-token search — one query, every layer** - `62a05d0` (feat)
2. **Task 2 RED: add failing test for D-11 reachable-equals-discovered** - `77e9e32` (test)
3. **Task 2 GREEN: every discovered file becomes reachable and attributable** - `8320d7d` (feat)
4. **Task 3: readiness, cancellation, and query bounds** - `84d5d84` (test)

_Note: Task 2 (tdd="true") followed a strict RED→GREEN split — implementation was reverted via a saved patch, the new test suite confirmed failing for the right reasons (4 of 5 new assertions failed; the fifth, an empty-input regression guard, correctly passed unchanged), then the patch was reapplied and reverified green before committing. Task 3 (also tdd="true") is documented separately below — its behavior assertions genuinely already passed against Task 1/2's implementation._

## Files Created/Modified

- `src/server/search-index.ts` - MiniSearch construction, dual tokenizer, readiness state machine, bounded query entry point, `isReady` guard
- `src/web/components/search-field.tsx` - Debounced, abort-guarded header search combobox
- `src/web/pages/search-page.tsx` - `/search` route reading its query from `?q=`
- `test/server/search-index.test.ts` - Tokenizer, readiness, ordering, corpus-coverage, and `createApp` integration tests
- `src/domain/model.ts` - `ArtifactLocation` union (single definition), `Artifact.location`, `QuickTask.artifacts`
- `src/planning-repo/types.ts` - Re-exports `ArtifactLocation` from `domain/model.ts` instead of redeclaring it
- `src/planning-repo/discovery.ts` - Hoisted `LOCATION_ORDER` to a module-level export
- `src/planning-repo/assemble.ts` - Widened root-only filter to loose-artifact filter; `QuickTask.artifacts` built via `toDomainArtifact`
- `src/server/artifact-index.ts`, `src/server/project-presentation.ts` - Extended to walk `QuickTask.artifacts`; `ArtifactDto.location` added
- `src/server/index.ts` - `GET /api/search` route
- `src/presentation/routes.ts` - `search: '/search'` route pattern and `{ kind: 'search' }` union member
- `src/web/app-router.tsx`, `src/web/components/app-shell.tsx`, `src/web/styles/globals.css` - `/search` route registration, `SearchField` mounted in the shell header, search-specific CSS
- `eslint.config.js` - `argsIgnorePattern: '^_'` added to `no-unused-vars` (needed for MiniSearch's tokenize/processTerm callback signature's unused `field` parameter)
- `test/assemble.test.ts` - D-11 reachable-equals-discovered test suite (RED then GREEN)
- `test/presentation/roadmap.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts` - Fixture updates for the new required `ArtifactDto.location` field
- `test/presentation/routes.test.ts`, `test/server/deep-links.test.ts` - `/search` route round-trip and deep-link matrix entries
- `test/__golden__/dense.json`, `sparse-empty.json`, `sparse-started.json` - Regenerated goldens, purely additive (354 insertions, 0 deletions across all three)

## Decisions Made

- **Resumed Task 1 as a single reconciled commit, not incrementally.** A prior executor session left `search-index.ts`, `search-field.tsx`, `search-page.tsx`, and the routes/index/app-router/app-shell/globals.css wiring substantially complete but uncommitted. Per explicit instruction, this work was kept (not discarded), reconciled against the plan, and committed as Task 1's single atomic commit — documented plainly in both the commit body and here.
- **Fixed a genuine tokenizer defect found during reconciliation.** `tokenizeSearchText` split on `\n`, `\r`, and `\p{Z}` but not the tab character (a control character outside the Unicode `Zs` category) — `'hello,\tworld!  日本語'` tokenized to `['hello', '\tworld', '日本語']` instead of `['hello', 'world', '日本語']`. Fixed by adding `\t` to the explicit control-character class already carrying `\n`/`\r`.
- **Fixed a `setImmediate`/`tsconfig.web.json` typecheck break found during reconciliation.** Because `search-field.tsx`/`search-page.tsx` type-import from `search-index.ts`, the whole module is pulled into the web TypeScript program, whose `types` list has no `"node"` entry — so the Node global `setImmediate` resolved to nothing under `npm run typecheck`. Fixed with a scoped `/// <reference types="node" />` on `search-index.ts` rather than switching to `setTimeout(0)` (whose ordering relative to the test file's own `setImmediate`-based `waitForBuild()` helper is unspecified at the top level in Node — risked a flaky, non-deterministic test) or widening `tsconfig.web.json`'s `types` globally (broader blast radius than needed).
- **Extended `search-index.ts`'s `collectReachableArtifacts` to walk `QuickTask.artifacts` as part of Task 2**, even though `search-index.ts` was not named in Task 2's `<files>` list. Task 2's own acceptance criterion ("searching the literal `src/transport/adapter-stub.ts` ... returns exactly the three `quick/` files") requires it, and the function's pre-existing comment ("walked uniformly so a future artifact-bearing collection (mirroring Phase.artifacts/QuickTask.artifacts) needs no second copy") already anticipated this exact extension.
- **`eslint.config.js` given a project-wide `argsIgnorePattern: '^_'`** so the `_field` parameter `tokenizeSearchText`/`processSearchTerm` carry (to match MiniSearch's `tokenize`/`processTerm` callback signature) lints cleanly, following the leading-underscore convention the code already used.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tokenizer did not split on the tab character**
- **Found during:** Task 1 reconciliation
- **Issue:** `TOKENIZE_SPLIT` regex explicitly listed `\n`/`\r` alongside `\p{Z}` but omitted `\t`, so `hello,\tworld!` tokenized with a leading tab still attached to `world`.
- **Fix:** Added `\t` to the explicit control-character class in `TOKENIZE_SPLIT`.
- **Files modified:** `src/server/search-index.ts`
- **Verification:** `test/server/search-index.test.ts`'s existing "splits on Unicode whitespace and excluded punctuation" test now passes (was the one pre-existing failure reported at session start: 11/12 → 12/12).
- **Committed in:** `62a05d0` (Task 1 commit)

**2. [Rule 1/3 - Blocking bug] `setImmediate` broke `npm run typecheck` under `tsconfig.web.json`**
- **Found during:** Task 1 reconciliation, running the plan's own `<verify>` block
- **Issue:** `search-field.tsx`/`search-page.tsx` type-import from `search-index.ts`; TypeScript pulls the whole module into the web program regardless of the import being type-only, and `tsconfig.web.json`'s `types` array (`vite/client`, `react`, `react-dom`) has no `"node"` entry — `setImmediate` resolved to `Cannot find name 'setImmediate'`.
- **Fix:** Added a scoped `/// <reference types="node" />` directive to the top of `search-index.ts`.
- **Files modified:** `src/server/search-index.ts`
- **Verification:** `npm run typecheck` passes cleanly under both `tsconfig.server.json` and `tsconfig.web.json`.
- **Committed in:** `62a05d0` (Task 1 commit)

**3. [Rule 3 - Blocking] `npm run lint` failed on an intentionally-unused MiniSearch callback parameter**
- **Found during:** Task 1, running the plan's own `<verify>` block
- **Issue:** `tokenizeSearchText`/`processSearchTerm`'s `_field` parameter (required by MiniSearch's `tokenize`/`processTerm` signature, unused in this implementation) tripped `@typescript-eslint/no-unused-vars` — the project's eslint config had no `argsIgnorePattern` despite the code already using the leading-underscore convention.
- **Fix:** Added `argsIgnorePattern: '^_'` to `eslint.config.js`'s base rules.
- **Files modified:** `eslint.config.js`
- **Verification:** `npm run lint` no longer flags `search-index.ts`.
- **Committed in:** `62a05d0` (Task 1 commit)

**4. [Rule 2 - Missing critical, in-scope extension] `search-index.ts` did not walk `QuickTask.artifacts`**
- **Found during:** Task 2 implementation, verifying its own acceptance criterion
- **Issue:** `collectReachableArtifacts` only walked `project.artifacts` and `phase.artifacts` — quick-task artifacts (newly given a `QuickTask.artifacts` map by this same task) were still unreachable by search, failing Task 2's explicit "three quick/ files" acceptance criterion.
- **Fix:** Extended `collectReachableArtifacts` to also walk `project.quickTasks[].artifacts`, with `phaseIdentity: null` (quick tasks carry no phase identity).
- **Files modified:** `src/server/search-index.ts`
- **Verification:** `test/assemble.test.ts`'s "searches the literal src/transport/adapter-stub.ts..." test passes; returns exactly 3 results, all `.planning/quick/` paths.
- **Committed in:** `8320d7d` (Task 2 GREEN commit)

**5. [Rule 2 - Missing critical, artifact-list completeness] `isReady` type guard not yet exported**
- **Found during:** Task 3, cross-checking the plan's "Artifacts this phase produces" list against the current export surface
- **Issue:** The plan's bottom-of-file artifact inventory names `isReady` as one of `search-index.ts`'s exports; it wasn't present after Tasks 1-2.
- **Fix:** Added `export function isReady(state): state is Extract<SearchIndexState, {status:'ready'}>`.
- **Files modified:** `src/server/search-index.ts`
- **Verification:** New positive/negative test in `test/server/search-index.test.ts`.
- **Committed in:** `84d5d84` (Task 3 commit)

### Out-of-Scope (Not Fixed — Logged)

**6. [Scope boundary] Pre-existing `no-regex-spaces` lint failures in `test/web/visual-contract.test.ts`**
- **Found during:** Every `npm run lint` invocation across all three tasks
- **Issue:** Two `no-regex-spaces` errors (lines 438-439) in a file this plan never touches. Confirmed pre-existing via `git diff HEAD -- test/web/visual-contract.test.ts` returning empty before any of this plan's commits.
- **Action taken:** Left unfixed per the scope-boundary rule. Logged to `.planning/phases/03-search-browsing-traceability/deferred-items.md` and to the `WINDOWS.md` ledger (`lint-warning`, phase 03, entry id 3).
- **Impact:** `npm run lint` over the whole repo reports 2 errors throughout this plan's execution; `npm run lint` scoped to this plan's own files reports 0.
- **Resolved 2026-09-10 (quick-260910-0x4):** The two regex literals (`/:root \{\n  --table-zebra:/` and `/\.dark \{\n  --table-zebra:/`) now use a counted `{2}` quantifier in place of the literal two-space run (`/:root \{\n {2}--table-zebra:/` and `/\.dark \{\n {2}--table-zebra:/`, `test/web/visual-contract.test.ts:438-439`). `npm run lint` exits 0, silent, over the whole repo. `WINDOWS.md` ledger entry 3 closed by the same task. The entry in `deferred-items.md` was struck outright (it is a live open-issue queue, not a historical record).

---

**Total deviations:** 5 auto-fixed (2 bugs, 2 blocking, 1 missing-critical/completeness) + 1 out-of-scope logged, not fixed (subsequently resolved 2026-09-10 by quick-260910-0x4).
**Impact on plan:** All auto-fixes were necessary for correctness (tokenizer), buildability (typecheck), or the plan's own stated acceptance criteria (lint cleanliness, quick-task search reachability, artifact-list completeness). No scope creep — the one out-of-scope item found was deliberately left alone and logged rather than fixed.

## Issues Encountered

None beyond the deviations documented above.

## TDD Gate Compliance

- **Task 2** (`tdd="true"`): Full RED→GREEN cycle. RED commit `77e9e32` (`test(03-01): add failing test for D-11 reachable-equals-discovered`) confirmed 4 of 5 new assertions failing for the right reasons against the pre-Task-2 implementation (verified by reverting the implementation via a saved patch, running the tests, then reapplying). GREEN commit `8320d7d` (`feat(03-01): every discovered file becomes reachable and attributable`) confirmed all 5 assertions passing plus the full 387-test suite green. No REFACTOR commit — no cleanup was identified beyond the implementation itself.
- **Task 3** (`tdd="true"`): No RED commit. All 9 behavior assertions were individually investigated against the pre-Task-3 (Task 1/2) implementation per the TDD fail-fast rule ("test doesn't fail in RED — feature may already exist") and found to genuinely already pass — `search-index.ts` was written production-quality in Task 1's tracer from the start (total `searchIndex`, single-statement `ready` assignment, explicit tiebreak, truncation-before-tokenization), and Task 1/2's route/component wiring already satisfied the readiness-integration and deep-link requirements. This is the documented "feature already exists" branch, not a skipped RED phase — each assertion was verified failing-would-be-wrong before being accepted as a genuine pass, not assumed. Committed as `84d5d84` (`test(03-01): readiness, cancellation, and query bounds (Task 3)`), which also adds the `isReady` guard (Deviation 5 above) as a small non-behavior-affecting completeness addition alongside the test suite.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Search, the `/search` route, and the D-11 reachability fix are in place and verified against all three fixtures. `LOCATION_ORDER` is now exported from `discovery.ts` for the next plan's tree navigator to reuse.
- `03-02` (browsing/tree navigator), `03-03`, and `03-04` in this phase can build on `presentationRoutePatterns`, `ArtifactDto.location`, and the `QuickTask.artifacts` shape without re-deriving any of them.
- One human-judgment item remains for end-of-phase UAT: visual/interaction verification of the search UI states (empty/loading/error/populated/partial/overflow) against 03-UI-SPEC.md's Copywriting Contract — no automated test asserts pixel-level layout or perceived debounce responsiveness (see `coverage: D4` above).

---
*Phase: 03-search-browsing-traceability*
*Completed: 2026-09-02*

## Self-Check: PASSED
