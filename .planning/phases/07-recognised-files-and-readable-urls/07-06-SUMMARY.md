---
phase: 07-recognised-files-and-readable-urls
plan: 06
subsystem: server
tags: [routes, route-table, readable-urls, api-documents, nav-09, nav-10, hono, vitest]
status: complete

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-04: Route union, buildUrl, parseRoutePath, addressOfPath and buildRouteTable (urlOf, pathOf, aliasOf, milestoneRoadmapUrl, conflicts)"
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-05: test/e2e/app-url.ts and the standing URL contract scan"
provides:
  - "buildArtifactUrl, buildPhaseUrl, buildPlanUrl and buildMilestoneUrl keep their names and signatures and emit the readable grammar; new buildPlanSummaryUrl"
  - "One route table per derived bundle (DerivedViews.routeTable) shared by the presentation, the artifact index and the search state, swapped with them in one assignment"
  - "GET /api/documents?route=<readable URL> is the only document endpoint; it parses with parseRoutePath and resolves only through the table (404 with found false for misses, internal file/ URLs, traversal and malformed input)"
  - "Artifact keys, PlanDto.key and PlanDto.summary.key are the files' table URLs; the opaque join keys (phase.key, milestone.key, phaseKey, milestoneKey) are unchanged"
  - "MilestoneDto.overviewUrl and roadmapUrl; ProjectPresentation.routeAliases and urlConflicts"
  - "Search hits, document-source links, ledger queue links and dashboard blocker links take their URLs from the table or from presentation keys"
affects: [07-07, 07-08, 07-09, 07-10]

requirements-completed: [NAV-09, NAV-10]

actuals:
  tokens: 25850
  tasks: 3
  commits: 3
plan_head_before: 61d73b63ee16db113c76340e47a44408d77317d5
plan_head_after: 037d75e6d32f09be088b6ffaba212f5ccd2a5938

tech-stack:
  added: []
  patterns:
    - "Table-first emitters: every server module that links a file asks the bundle's route table and falls back to the stateless owner-aware builder only for a path the table lacks"
    - "Request text selects, never opens: /api/documents parses to a Route, builds the canonical URL, follows an alias, and only then reads the indexed artifact"

key-files:
  created:
    - test/server/documents-route.test.ts
  modified:
    - src/presentation/routes.ts
    - src/presentation/dashboard.ts
    - src/presentation/drawer.ts
    - src/server/index.ts
    - src/server/artifact-index.ts
    - src/server/project-presentation.ts
    - src/server/search-index.ts
    - src/server/document-sources.ts
    - src/server/dashboard-ledger.ts
    - src/web/pages/roadmap-deep-link.ts
    - test/presentation/routes.test.ts
    - test/presentation/drawer.test.ts
    - test/presentation/dashboard.test.ts
    - test/web/roadmap-deep-link.test.ts

key-decisions:
  - "buildUrl percent-encodes the plan number segment, so a hostile plan id stays one inert segment and parses as a document route instead of adding a scope"
  - "The token-path artifact endpoint is deleted rather than redirected; /api/documents?route= is the single document endpoint"
  - "parsePresentationUrl and PresentationRoute stay as names but alias parseRoutePath and Route; the legacy parser is imported only by its own test (and the 07-08 redirect path)"
  - "A roadmap row or drawer header for a shipped milestone links to MilestoneDto.roadmapUrl with no redirect hop; the milestone's overview stays the milestone row's own url"

patterns-established:
  - "Bundle-captured resolution: the documents handler captures derived first, and the table, index and registry it uses all come from that one bundle"
  - "Test-local legacy builders: the decoder test keeps its own copies of the pre-v2.1 builders so it can keep proving old links decode"

coverage:
  - id: D1
    description: "Every text artifact of the Shapes and Lendshed fixtures is served by GET /api/documents at the readable URL its presentation key names"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/server/documents-route.test.ts#serves every text artifact at the readable URL its presentation key names"
        status: pass
    human_judgment: false
  - id: D2
    description: "Misses, traversal spellings, internal file/ URLs and malformed percent sequences answer 404 with found false; config.json at /settings stays masked"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/server/documents-route.test.ts#answers 404 for an internal file, traversal spellings and malformed percent sequences"
        status: pass
      - kind: unit
        ref: "test/server/documents-route.test.ts#serves config.json at /settings with its secrets masked"
        status: pass
    human_judgment: false
  - id: D3
    description: "The four builders emit the readable grammar and buildPlanSummaryUrl exists; plan keys equal the PLAN and SUMMARY file keys so a drawer row is active on either page"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/presentation/routes.test.ts#the builders emit the readable grammar"
        status: pass
      - kind: unit
        ref: "test/presentation/drawer.test.ts#marks one plan row active on either page: matchUrls are the plan page and the summary page (D-05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "MilestoneDto carries overviewUrl and roadmapUrl, the payload carries routeAliases and a sorted, deterministic urlConflicts, and the drawer header links straight to the roadmap"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/server/documents-route.test.ts#lists conflicts sorted by URL with the paths inside each sorted, and the live aliases"
        status: pass
      - kind: unit
        ref: "test/presentation/drawer.test.ts#links a shipped milestone straight to its roadmap page, and to its overview when it has no roadmap (D-02, D-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Search hits, source links, ledger queue links and blocker links come from the table, so a collision loser is never linked at the winner's address"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/server/documents-route.test.ts#links a collision loser from search at its own file/ address, never the winner's"
        status: pass
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#takes the blocker link from the source artifact key the payload reports, not from a stateless address"
        status: pass
    human_judgment: false
  - id: D6
    description: "resolveRoadmapDeepLink reads /v1.1/phase-2 and /v1.1/overview"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/roadmap-deep-link.test.ts#resolveRoadmapDeepLink"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-10-27
---

# Phase 7 Plan 06: Server on Readable URLs Summary

**Every URL the server emits is now one readable address from a single route table built per derived bundle: /api/documents resolves a parsed route only through that table, the token-path endpoint is gone, and milestones, aliases and the conflict audit ride on the payload.**

## Performance

- **Duration:** 17 min (06:00 to 06:17 UTC)
- **Tasks:** 3 (one tracer, two auto)
- **Files:** 33 changed against the plan's 21 (875 insertions, 335 deletions); the 12 extra files are test fixtures and expectations the new DTO fields and URLs reached (see Deviations)

## Accomplishments

- **Tracer (Task 1):** the four builders keep their names and now emit the 07-04 grammar; `buildPlanSummaryUrl` added. `buildDerivedViews` builds the route table first and hands it to `toProjectPresentation`, `buildArtifactIndex` and `searchIndexState.buildFrom`, and keeps it on `DerivedViews`, so a refresh swaps all of them in the one assignment. `lookupRoute` builds the canonical URL (heading dropped), follows an alias, takes `pathOf`, and reads only an indexed artifact. `planRoutes` and the `/api/artifacts/*` handler are deleted.
- **Payload (Task 2):** `MilestoneDto.overviewUrl` and `roadmapUrl`; `ProjectPresentation.routeAliases` and `urlConflicts` (sorted by URL, paths sorted, empty for both committed fixtures). The drawer's shipped-milestone header links straight to `roadmapUrl`. `parsePresentationUrl` and `PresentationRoute` alias the readable parser and `Route`. `resolveRoadmapDeepLink` reads `/v1.1/phase-2` and `/v1.1/overview`.
- **Emitters (Task 3):** the source resolver, ledger queue, search hits (via a `urls` map on the ready state) and dashboard blocker links take table URLs. `blockerUrl` now resolves the source path through `presentation.artifacts`; `sourceDestination` keeps its signature with a doc comment explaining why a root file's stateless address is its table address.

## Task Commits

1. **Task 1 (tracer): readable document URL served end to end** - `329918e`
2. **Task 2: milestone and plan URLs, drawer header, deep-link resolver, migrated presentation tests** - `c790302`
3. **Task 3: path-only artifact URLs through the table, full gate** - `037d75e`

Tracer feedback gate: no `blocking-human` gate and auto mode off with `human_verify_mode: end-of-phase`; the tracer's `<verify>` is automated only, so it was re-run end to end (270 passed, 0 skipped) before expansion.

## Verification

- `npm run test:gate`: total=4106 passed=4106 failed=0 skipped=0 todo=0
- `npm run typecheck`: exit 0; `npm run lint`: exit 0
- Acceptance greps: no `api/artifacts` in `src/`; `buildRouteTable(` and `parseRoutePath(` present in `src/server/index.ts`; no `planRoutes` in `artifact-index.ts`; no `parseLegacyUrl` in `routes.ts`, `src/server` or `src/web`; `buildArtifactUrl(null` appears twice, both documented root-file fallbacks (`sourceDestination`, `blockerUrl`).
- The four pre-existing browser-spec failures from the environment notes were not touched and the Playwright suite was not run (the web is still on the old router until 07-07).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] buildUrl encodes the plan number segment**
- **Found during:** Task 2, writing the hostile-identity cases for routes.test.ts
- **Issue:** `buildUrl` joined `route.planNumber` raw, so `buildPlanUrl(identity, '02-07 / plan.%2F 雪')` produced a URL with spaces and an extra slash.
- **Fix:** `plan-${encodePart(route.planNumber)}`. Digits are unchanged; a hostile id stays one inert segment and parses as a document route, never a plan.
- **Files modified:** src/presentation/routes.ts
- **Commit:** c790302

**2. [Rule 3 - Blocking] Tests outside the plan's file list reached by the new URLs and DTO fields**
- **Found during:** Tasks 1 to 3
- **Issue:** Expectations or typed literals in files the plan does not list failed or stopped compiling: `test/server/dashboard-ledger.test.ts` (phase URLs no longer contain the opaque phase key), `test/config-masking.test.ts` (its page helper also fetched the deleted endpoint), `test/presentation/legacy-routes.test.ts` (built old-style URLs through the flipped builders), `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts`, `test/web/plan-context.test.ts`, `test/presentation/search.test.ts`, `test/presentation/sketches.test.ts` and `test/presentation/dashboard-head.test.ts` (new `MilestoneDto`/`ProjectPresentation` fields, readable plan URL).
- **Fix:** Expectation-level edits only. `legacy-routes.test.ts` gained test-local copies of the old encoded builders so the decoder keeps being proven against what the old builders wrote.
- **Commits:** 329918e, c790302

**3. [Rule 1 - Bug] Web corpus tests asserted file-named and `/artifacts/` hrefs**
- **Found during:** Task 3 full gate
- **Issue:** `test/web/todo-lifecycle.test.ts`, `todo-lifecycle-corpus.test.ts` and `review-threads-corpus.test.ts` expected note hrefs containing `.md` / starting `/artifacts/` and a review-fix URL containing `01-REVIEW-FIX.md`. The readable addresses are `/notes/<name>` and `/v1.0/phase-1/review-fix`.
- **Fix:** Expectations updated to the readable addresses.
- **Commit:** 037d75e

**4. [Ordering] search-index `urls` map built in Task 1, not Task 3**
- **Issue:** Task 1 passes the table to `buildFrom`; an accepted-but-unused parameter would fail lint, so the `urls` map and the hit mapping landed with Task 1. Task 3 added the test that pins it.

**5. [Criterion note] The Task 2 grep for legacy literals matches `test/presentation/url-grammar.test.ts`**
- `url-grammar.test.ts` (07-04) holds `'/milestones/m~v1.1'` and `'/artifacts/a~x'` on purpose: it pins that old shapes parse as `legacy` routes. They stay; every other match is gone (only `legacy-routes.test.ts` and `url-grammar.test.ts` remain).

**Total deviations:** 5 (1 missing-critical fix, 2 blocking test migrations, 1 bug-expectation migration, 1 ordering note) plus 1 criterion clarification. **Impact:** no production behaviour beyond the plan; the extra files are tests.

## Known Interim State

- The browser app still routes the old encoded patterns (`presentationRoutePatterns` is unchanged for the interim router) and fetches `/api/documents`, which already answers readable routes. Readable navigation in the browser is 07-07; the Playwright specs were not run here.
- `milestone` rows in the roadmap view model keep `url: buildMilestoneUrl(version)` (the overview page); only the drawer header links to `roadmapUrl`.

## Known Stubs

None.

## Threat Flags

None. The change removes an endpoint and routes request text only through the table (T-07-13 to T-07-16 mitigations are tested in `test/server/documents-route.test.ts`).

## Next Phase Readiness

Ready for 07-07 (the web dispatcher): the payload now carries `routeAliases`, `urlConflicts`, and each milestone's `overviewUrl` and `roadmapUrl`; `parseRoutePath`, `Route` and the builders are the single grammar.

## Self-Check: PASSED

- Created and modified key files exist on disk (documents-route.test.ts, routes.ts, artifact-index.ts, project-presentation.ts, search-index.ts, roadmap-deep-link.ts).
- Commits 329918e, c790302 and 037d75e are ancestors of HEAD.
