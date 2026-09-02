---
phase: 03-search-browsing-traceability
plan: 02
subsystem: search
tags: [minisearch, snippet-extraction, react, base-ui-combobox, oklch]

# Dependency graph
requires:
  - phase: 03-search-browsing-traceability
    provides: "03-01's MiniSearch-backed index (SearchDocument/SearchHit/SearchIndexState), GET /api/search readiness state machine, the header SearchField combobox, and ArtifactDto.location — this plan extends the ranked-result path with grouping and snippets rather than duplicating it"
provides:
  - "buildSearchGroups: D-07 two-level taxonomy (location, then artifact kind) over ranked search hits"
  - "extractSnippets: D-08 match-centred snippet windows over raw markdown body, with merged highlight ranges and heading-anchor resolution"
  - "src/rendering/slug.ts — the single stableSlug implementation, shared by the renderer and the snippet anchor resolver"
  - "GET /api/search groups[] and fileCount fields, additive alongside the existing flat results[]/total"
  - "The /search results page rendering grouped, snippet-bearing, progressively-revealed results"
  - "ArtifactDto.warnings — lets a search row (or any future consumer) mark a parse-warning artifact unreadable without dropping it"
affects: [03-03, 03-04]

# Actuals (#2632)
actuals:
  tokens: 14270
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structural type redeclaration to preserve a one-way dependency boundary: presentation/search.ts redeclares SearchHit's shape as SearchHitLike rather than importing it from server/search-index.ts, so the presentation layer never depends on the MiniSearch/index-construction layer."
    - "Snippet windowing by occurrence priority: all matched-term occurrences are collected, then windows are seeded in longest-term-first order so an intact ID/path literal always wins the centring over its own split parts; occurrences absorbed into an earlier window are marked consumed so they never spawn a redundant second snippet."
    - "Group-order-for-free: buildSearchGroups iterates presentation.milestones/phases in their already-assembled, already-sorted order (comparePhaseNumbers upstream in assemble.ts) rather than re-sorting groups itself."

key-files:
  created:
    - src/rendering/slug.ts
    - src/presentation/search.ts
  modified:
    - src/rendering/markdown.ts
    - src/server/project-presentation.ts
    - src/server/search-index.ts
    - src/server/index.ts
    - src/web/pages/search-page.tsx
    - src/web/styles/globals.css
    - test/presentation/search.test.ts
    - test/rendering/markdown.test.ts
    - test/web/visual-contract.test.ts
    - test/presentation/roadmap.test.ts
    - test/rendering/plan-sections.test.ts
    - test/rendering/references.test.ts

key-decisions:
  - "Added ArtifactDto.warnings (project-presentation.ts) rather than threading Artifact.warnings through search-index.ts's SearchDocument/SearchHit — presentation/search.ts already looks up each hit's ArtifactDto by path to resolve its location, so warnings rides the same lookup with no second data path."
  - "presentation/search.ts imports only routes it needs from the plan's allowed five-module list (naming.ts, project-presentation.ts, slug.ts) — routes.ts and discovery.ts were not needed in practice (row URLs already arrive pre-built on each hit; group ordering comes for free from presentation's own already-sorted structures) and were left unimported rather than imported-but-unused."
  - "A milestone-root hit's archived-milestone group is resolved via naming.ts's canonical parseMilestoneFileName on its basename, not via SearchHit.milestoneKey — that field is only ever set from a hit's phaseIdentity, which milestone-root artifacts never carry (they have no phase). This mirrors the exact function discovery.ts itself already uses to classify these files, not a new path-prefix heuristic."

requirements-completed: [FIND-03, FIND-04]

coverage:
  - id: D1
    description: "Search results group by location taxonomy first (active phases in order, then root/research/quick, then archived milestones version-ascending) and artifact type second (plan, summary, context, then generic), per D-07/FIND-03."
    requirement: "FIND-03"
    verification:
      - kind: unit
        ref: "test/presentation/search.test.ts#buildSearchGroups — 6 tests covering taxonomy order, archived-milestone version ordering, milestone-root grouping via the naming grammar, kind clustering, the unreadable marker, and the trailing 'other' fallback"
        status: pass
      - kind: integration
        ref: "manual verification — node src/server/index.ts fixtures/dense, GET /api/search?q=IDENT-02 and q=identity, confirmed grouped/ordered output against real project data"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every result row carries a snippet centred on its own highest-scoring match (D-08): matched-term occurrences are located in the raw body (never rendered HTML), windowed with surrogate-safe boundaries, overlapping highlights merged, and each snippet resolves a heading anchor via the same slug function the renderer uses for heading ids."
    requirement: "FIND-04"
    verification:
      - kind: unit
        ref: "test/presentation/search.test.ts#extractSnippets — 7 tests covering all 9 behaviors from Task 1 (deep-body centring, longest-term preference, no-match handling, highlight merging, multi-snippet ordering stability, heading-anchor resolution, surrogate-pair safety)"
        status: pass
      - kind: unit
        ref: "test/rendering/markdown.test.ts#stableSlug (extracted to src/rendering/slug.ts) — 3 tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET /api/search returns groups[] and fileCount alongside the unchanged results[]/total in every readiness state; every row in groups also appears in results; a parse-warning artifact's row is marked unreadable rather than dropped."
    verification:
      - kind: integration
        ref: "test/presentation/search.test.ts#GET /api/search — grouped response (Task 2) — 4 tests"
        status: pass
    human_judgment: false
  - id: D4
    description: "The /search page renders grouped results with match-centred snippets escaped as React text (only the matched span wrapped in <mark>), a match-count control that expands remaining snippets in place, and per-group progressive reveal via the existing dashboard show-more pattern — no pagination, no page state in the URL."
    verification:
      - kind: unit
        ref: "grep-based acceptance checks — 0 dangerouslySetInnerHTML occurrences, exact copy strings present, no 'page=' string, color-mix(in oklch, var(--primary) highlight rule"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction correctness — whether the reused loading skeleton reads sensibly above a grouped layout, which element draws the eye first (group header vs. row title), highlight legibility in both themes, and click-to-anchor navigation landing on the right section — needs a human's eyes on the real rendered page. Documented as this task's own <human-check> block, deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase."
  - id: D5
    description: "The header dropdown remains a compact navigating surface, unchanged in behavior from plan 03-01, now with pinned test coverage for its row cap, footer pluralization, route-derived href, head-truncation, and bounded-height/scroll rules."
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#header search dropdown — navigating surface (03-02 Task 3, D-01) — 6 tests"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-02
status: complete
---

# Phase 3 Plan 2: Search Grouping and Snippets Summary

**Search results now group by location-then-artifact-type (D-07) and every row carries a match-centred snippet with a working heading deep-link (D-08), built on top of plan 03-01's ranked-result path without duplicating it.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-02T10:20:42Z
- **Completed:** 2026-09-02T10:40:52Z
- **Tasks:** 3
- **Files modified:** 14 (2 created, 12 modified)

## Accomplishments

- `src/presentation/search.ts`: `buildSearchGroups` (the D-07 two-level taxonomy: active-milestone
  phases first in phase-number order, then root docs, research, quick, then archived milestones
  ordered version-ascending, then a trailing fallback group — each hit's group comes from the
  artifact's own `location` field, never re-derived from its path) and `extractSnippets` (D-08's
  raw-body snippet windows: longest-matched-term centring so an intact ID/path literal always wins
  over its own split parts, surrogate-pair-safe window boundaries, merged overlapping highlight
  ranges, and heading-anchor resolution through the one shared slug function).
- `src/rendering/slug.ts`: `stableSlug` extracted verbatim from `markdown.ts` — now the single slug
  implementation in the codebase, with zero imports so the presentation layer can depend on it
  without inverting the rendering → presentation direction.
- `GET /api/search` now returns `groups[]` and `fileCount` alongside the unchanged `results[]`/
  `total` in every readiness state; verified end-to-end against `fixtures/dense`.
- `/search` renders the grouped, snippet-bearing reading surface: match-count chips, an explicit
  "Unreadable" marker for parse-warning artifacts (degrade, don't hide), snippets rendered as
  escaped React text with only the matched span wrapped in `<mark>`, per-row expand-in-place for
  additional snippets, and per-group progressive reveal reusing the dashboard's existing
  `.attention-more` pattern — no pagination, no page state in the URL.
- The header dropdown (plan 03-01) needed no source changes — its row cap, footer pluralization,
  route-derived href, and head-truncation/bounded-height CSS already matched this plan's Task 3
  spec exactly; only pinning test coverage was added.

## Task Commits

Each task was committed atomically:

1. **Task 1: Group projection and match-centred snippet extraction** - `0463650` (feat)
2. **Task 2: The /search reading surface** - `5bd0250` (feat)
3. **Task 3: The compact dropdown that navigates rather than investigates** - `c0dc31f` (test)

_Note: Task 3 required no production-code changes — see Deviations._

## Files Created/Modified

- `src/rendering/slug.ts` - Extracted `stableSlug`, zero imports
- `src/presentation/search.ts` - `buildSearchGroups`, `extractSnippets`, `SearchResultGroup`/`SearchResultRow`/`SearchSnippet` DTOs
- `src/rendering/markdown.ts` - Imports `stableSlug` from `slug.ts` instead of defining it locally
- `src/server/project-presentation.ts` - `ArtifactDto.warnings` field
- `src/server/search-index.ts` - `SearchApiResponse` gains `groups`/`fileCount`
- `src/server/index.ts` - `/api/search` calls `buildSearchGroups`/`extractSnippets`, attaches snippets per row from the indexed document's raw body
- `src/web/pages/search-page.tsx` - Grouped rendering, snippet highlighting, per-row/per-group progressive reveal
- `src/web/styles/globals.css` - Group/card/snippet/highlight CSS rules, replacing the old flat `.search-result-list`
- `test/presentation/search.test.ts` - New file: 9 `buildSearchGroups`/`extractSnippets` behavior tests + 4 `GET /api/search` response-shape tests
- `test/rendering/markdown.test.ts` - Direct `stableSlug` unit tests
- `test/web/visual-contract.test.ts` - 6 tests pinning the dropdown's navigating-surface contract
- `test/presentation/roadmap.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts` - Fixture updates for the new required `ArtifactDto.warnings` field

## Decisions Made

- Added `ArtifactDto.warnings` rather than threading warnings through the search-index layer —
  `presentation/search.ts` already looks up each hit's `ArtifactDto` by path to resolve its
  `location`, so the `unreadable` flag rides that same lookup with no second data path or extra
  server-layer plumbing.
- `presentation/search.ts` uses only the imports it actually needs from the plan's allowed
  five-module list; `routes.ts` and `discovery.ts` weren't needed in practice (hit URLs arrive
  pre-built, and group ordering comes for free from `presentation`'s already-sorted milestone/phase
  structures) and were left unimported.
- A `milestone-root` hit's archived-milestone group is resolved via `naming.ts`'s canonical
  `parseMilestoneFileName` on the hit's basename — the one case where `SearchHit.milestoneKey` is
  always null (it's derived only from `phaseIdentity`, which milestone-root artifacts never carry).
  This reuses the exact grammar `discovery.ts` itself already applies to classify these files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Added `ArtifactDto.warnings` to expose per-artifact parse warnings**
- **Found during:** Task 1 (designing `SearchResultRow.unreadable`)
- **Issue:** The plan requires `unreadable` to be true when an artifact carries a parse warning, but `ArtifactDto` (the only per-artifact DTO `presentation/search.ts` is allowed to import) had no field exposing warnings — only the single-artifact `/api/artifacts/*` endpoint returned them, from the raw domain `Artifact` directly.
- **Fix:** Added `warnings: unknown[]` to `ArtifactDto`, populated as `artifact.warnings` (pass-through, same convention the artifact endpoint already used) in `artifactDtos()`.
- **Files modified:** `src/server/project-presentation.ts`
- **Verification:** New required field caught three pre-existing test fixtures missing it (`test/presentation/roadmap.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts`) via `npm run typecheck`; all three updated with `warnings: []`, full suite green afterward.
- **Committed in:** `0463650` (Task 1 commit)

**2. [Rule 1 - Bug] Test fixture body concatenation produced a single unbroken token, hiding a real MiniSearch match**
- **Found during:** Task 2, writing the `GET /api/search` grouped-response integration test
- **Issue:** `'x'.repeat(50) + 'IDENT-02 ...'` concatenates directly with no whitespace, so the tokenizer indexed one long combined token instead of `ident-02` — the query never matched, `groups` came back empty, and the test's own assertion (`groups.length > 0`) failed with 0.
- **Fix:** Rewrote the fixture body to `${'x '.repeat(30)}IDENT-02 ...` (whitespace-separated padding).
- **Files modified:** `test/presentation/search.test.ts`
- **Verification:** Re-ran the test; `groups.length` is now 6 as expected, all 4 Task 2 API tests pass.
- **Committed in:** `5bd0250` (Task 2 commit)

**3. [Task 3 — no production code needed] The header dropdown already matched Task 3's spec exactly**
- **Found during:** Task 3 start, reading `search-field.tsx` and `globals.css` per `<read_first>`
- **Observation:** Plan 03-01 had already implemented the named `DROPDOWN_LIMIT = 8` constant, the singular/plural footer copy, the `presentationRoutePatterns.search`-derived footer href, the RTL head-truncation CSS rule, and the bounded `max-height`/`overflow-y: auto` dropdown CSS — all of Task 3's acceptance criteria for source code were already satisfied.
- **Action taken:** No production-code edit was made. Only the test coverage the plan explicitly calls for (`test/web/visual-contract.test.ts` region-scoped assertions) was added, pinning the existing behavior against regression.
- **Files modified:** `test/web/visual-contract.test.ts` only.
- **Committed in:** `c0dc31f` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing-critical, 1 bug) + 1 no-op-by-observation (documented, not a fix). **Impact on plan:** Both auto-fixes were necessary for the plan's own stated behavior (unreadable marking) and test correctness (fixture tokenization). No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `buildSearchGroups`, `extractSnippets`, and the shared `stableSlug` are available for 03-03/03-04
  to build on without re-deriving grouping, snippet, or heading-anchor logic.
- `ArtifactDto.warnings` is now a general-purpose field any future presentation module can read
  (not search-specific) — first real use here, available for the tree navigator or traceability view
  if either needs the same degrade-don't-hide marker.
- One human-judgment item remains for end-of-phase UAT (coverage `D4`): visual verification of the
  grouped `/search` page against 03-UI-SPEC.md's Dimension 2 focal-point flag, loading-skeleton fit,
  highlight legibility in both themes, and click-to-anchor navigation — no automated test asserts
  pixel-level layout or perceived visual priority.
- Full suite green at 426/426; `npm run build` succeeds; `npm run lint` clean except the pre-existing,
  out-of-scope `test/web/visual-contract.test.ts` `no-regex-spaces` pair already logged in
  `deferred-items.md`/`WINDOWS.md` by plan 03-01 (untouched by this plan).

---
*Phase: 03-search-browsing-traceability*
*Completed: 2026-09-02*

## Self-Check: PASSED

All key-files (created/modified) confirmed present on disk with `[ -f ]`; all three task commit
hashes (`0463650`, `5bd0250`, `c0dc31f`) confirmed present in `git log --oneline --all`.
