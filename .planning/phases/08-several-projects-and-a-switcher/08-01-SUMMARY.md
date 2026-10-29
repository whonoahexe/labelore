---
phase: 08-several-projects-and-a-switcher
plan: 01
subsystem: api
tags: [hono, project-registry, lru, multi-project, slug, ssh-mirror]

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "the /api/documents route table and /api/files bytes route inside src/server/index.ts, the slugOf helper and reserved words"
provides:
  - "ProjectRuntime: one project's derived bundle, commit log, file dates, coalesced refresh, in-flight count and dispose"
  - "createProjectApi(resolve, mountPrefix): every project read handler written once, resolved per request"
  - "ProjectRegistry: slug-keyed entries, identity de-duplication, lazy coalesced loading, LRU of five, folder re-validation, disposal"
  - "createRegistryApp: GET /api/projects plus the project API mounted at /api/projects/:slug, with a reserved guard slot"
  - "Shared project list DTO (ProjectListEntry, homeShortened, orderProjects) and allocateSlug / isValidSlug"
  - "createApp as a guard-free single-runtime test wrapper over the same handlers"
affects: [08-02, 08-03, 08-04, 08-05, 08-06, 08-07, 08-08, 08-12, 08-16, 08-17]

actuals:
  tokens: 24500
  tasks: 2
  commits: 2
plan_head_before: 572906e5de71d4bed82f748eea7ca8450044affb
plan_head_after: 9b5fe3c75199b4df4f00cdf1dc0400be4a24f680

tech-stack:
  added: []
  patterns:
    - "Runtime captured first in every handler (c.get('runtime'), then runtime.derived) so one request is answered from one bundle of one project"
    - "Registry keeps a recency Set of ready slugs; eviction skips the just-loaded entry and any runtime with a request in flight"
    - "Listing never creates a source; unloaded local folders are re-checked with resolveTargetPath and memoised"

key-files:
  created:
    - src/server/project-runtime.ts
    - src/server/project-api.ts
    - src/server/project-registry.ts
    - src/server/registry-api.ts
    - src/presentation/project-list.ts
    - test/server/registry-api.test.ts
    - test/server/project-registry.test.ts
  modified:
    - src/server/index.ts
    - src/server/project-presentation.ts
    - src/server/search-index.ts
    - src/presentation/project-slug.ts
    - test/presentation/project-slug.test.ts
    - test/server/derived-snapshot-isolation.test.ts
    - test/server/documents-route.test.ts
    - test/web/note-view-contract.test.ts
    - test/web/review-view-contract.test.ts
    - test/web/todo-view-contract.test.ts

key-decisions:
  - "toProjectPresentation takes (snapshot, slug, routeTable): the slug sits second, as the plan wrote it, and the Phase 7 routeTable moved to third; every caller but the runtime passes only the snapshot"
  - "ProjectApiEnv carries a mountPrefix variable beside runtime, set by the first middleware, so 08-12 reads the raw mount prefix without touching registry-api.ts"
  - "The project API re-asks the registry when the runtime it got was disposed before the in-flight count was taken, closing the eviction race between resolve and increment"
  - "ssh identity ignores the scheme, lower-cases the host, reads a missing port as 22 and keeps user and remote root case-sensitive (research A3)"
  - "LRU cap of five loaded runtimes through the maxLoaded option (research A4); failed runtimes are not counted"

patterns-established:
  - "Every project API handler starts with const runtime = c.get('runtime'); const activeDerived = runtime.derived"
  - "Source-pin tests that read handler text read src/server/project-api.ts, not index.ts"

requirements-completed: [PLAT-02, PLAT-08]

coverage:
  - id: D1
    description: "GET /api/projects lists every registered project with its state and never creates a source or loads a project"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/server/registry-api.test.ts#GET /api/projects lists both projects unloaded, without creating a source"
        status: pass
      - kind: unit
        ref: "test/server/project-registry.test.ts#(b) list states"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each slug under /api/projects/<slug> answers every parameterless GET route from its own project, equal to the single-project wrapper, and a document URL shared by two projects never resolves to the other's file"
    requirement: PLAT-08
    verification:
      - kind: integration
        ref: "test/server/registry-api.test.ts#/api/projects/<slug>"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unknown slug answers 404 { error: 'Unknown project' } and loads nothing; every project API route is reachable under /api/projects/:slug"
    requirement: PLAT-02
    verification:
      - kind: integration
        ref: "test/server/registry-api.test.ts#route-set equality"
        status: pass
    human_judgment: false
  - id: D4
    description: "Slug collisions allocate base and base-2; the same canonical root, or an ssh target that normalises to the same user, host, port and root, is one project"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/presentation/project-slug.test.ts#allocateSlug"
        status: pass
      - kind: unit
        ref: "test/server/project-registry.test.ts#identity de-duplication"
        status: pass
    human_judgment: false
  - id: D5
    description: "At most five runtimes stay loaded; the sixth disposes the least recently used idle one, a busy one is never disposed, concurrent loads coalesce, and heap stays bounded across three rounds of eight projects"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/server/project-registry.test.ts#(c) the least-recently-used cap"
        status: pass
      - kind: unit
        ref: "test/server/project-registry.test.ts#(e) heap across repeated switching"
        status: pass
    human_judgment: false
  - id: D6
    description: "Eviction or disposal removes an ssh mirror directory, and a disposed runtime's scheduled search build never runs"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/server/project-registry.test.ts#(d) ssh mirrors"
        status: pass
      - kind: unit
        ref: "test/server/project-registry.test.ts#(f) a disposed runtime"
        status: pass
    human_judgment: false
  - id: D7
    description: "A local entry whose folder disappears lists as unavailable with the server's own path-not-found message and the path checked, without a load"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/server/project-registry.test.ts#(b) list states shows a deleted folder as unavailable"
        status: pass
    human_judgment: false
  - id: D8
    description: "The registry app keeps its first registration slot free for 08-03's request guard"
    requirement: PLAT-02
    verification: []
    human_judgment: true
    rationale: "A comment marks the slot; 08-03 owns the test that the guard runs before every route. Nothing here can assert a guard that does not exist yet."

duration: 27 min
completed: 2026-10-29
status: complete
---

# Phase 8 Plan 01: Project runtimes and the slug-keyed registry Summary

**One process now serves several projects: a ProjectRuntime per project behind a slug-keyed ProjectRegistry with an LRU of five, every project read handler written once and mounted at /api/projects/:slug, and a cheap GET /api/projects list.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-10-29T17:36:00Z (approximate)
- **Completed:** 2026-10-29T18:03:00Z
- **Tasks:** 2
- **Files modified:** 17 (7 created, 10 modified)

## Accomplishments

- The createApp closure became `ProjectRuntime` (bundle, commit log, file dates, coalesced refresh, dispose) and `createProjectApi`; the handler bodies moved unchanged except that each one now takes its runtime from its own request first. `createApp` is a guard-free single-runtime wrapper over the same factory, so every existing URL and server test still works.
- `ProjectRegistry` registers projects by identity (canonical root, or a normalised ssh identity), allocates slugs once, loads lazily and coalesced, keeps at most five runtimes loaded by least recent use, never evicts a runtime with a request in flight, removes ssh mirrors and cancels scheduled index builds on disposal, and lists without loading anything.
- `createRegistryApp` serves `GET /api/projects`, the project API at `/api/projects/:slug`, the `/api` 404 and the production static block, with the first registration slot reserved and commented for 08-03's guard.
- Tracer proof: Lendshed and Shapes each answer all nine parameterless GET routes with their own data, equal to the single-project wrapper (readAt aside), under interleaved requests; the same document URL in both projects returns each project's own artifact.

## Task Commits

1. **Task 1: Two projects from one process, each answered by its own runtime** - `1d3fd60` (feat, tracer)
2. **Task 2: Registry lifecycle: load states, an LRU of five, disposal and bounded heap** - `9b5fe3c` (feat)

**Plan metadata:** committed with this summary (docs: complete plan)

The tracer gate ran after Task 1: the plan's gate command and typecheck were re-run end to end, passed, and expansion continued (human_verify_mode end-of-phase, automated-only verify).

## Files Created/Modified

- `src/server/project-runtime.ts` - SnapshotSource, DerivedViews, RefreshOutcome, ProjectRuntime
- `src/server/project-api.ts` - createProjectApi, ProjectApiEnv; all read handlers and refresh
- `src/server/project-registry.ts` - ProjectRegistry, createSnapshotSource, failedSource
- `src/server/registry-api.ts` - createRegistryApp with the reserved guard slot
- `src/presentation/project-list.ts` - list DTO, homeShortened, orderProjects
- `src/presentation/project-slug.ts` - SLUG_PATTERN, isValidSlug, allocateSlug
- `src/server/index.ts` - createApp reduced to the test-only wrapper; startServer unchanged in behaviour
- `src/server/project-presentation.ts` - toProjectPresentation takes the registry slug
- `src/server/search-index.ts` - createSearchIndexState gains cancel()
- `test/server/registry-api.test.ts`, `test/server/project-registry.test.ts` - new suites
- `test/presentation/project-slug.test.ts` - allocateSlug and isValidSlug cases
- Four existing source-pin tests now read `project-api.ts` (see deviations)

## Decisions Made

See `key-decisions` above. In short: slug second and routeTable third on `toProjectPresentation`; `mountPrefix` carried as a context variable; a re-resolve loop for a runtime evicted between the registry's answer and the in-flight increment; the research A3 ssh identity and A4 cap of five as planned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] toProjectPresentation signature differs from the plan's description**
- **Found during:** Task 1
- **Issue:** The plan described `toProjectPresentation(snapshot, slug = slugOf(...))`, but after Phase 7 the second parameter was already the route table. Adding the slug as a third parameter would not satisfy the plan's acceptance grep `toProjectPresentation(snapshot, slug`.
- **Fix:** Signature is now `(snapshot, slug = slugOf(snapshot.rootPath), routeTable = ...)`. The only caller that passed a route table was `createApp`, which moved into `ProjectRuntime`; all other callers pass only the snapshot and are unaffected.
- **Files modified:** src/server/project-presentation.ts, src/server/project-runtime.ts
- **Verification:** full test suite and typecheck pass
- **Committed in:** 1d3fd60

**2. [Rule 3 - Blocking] Four existing source-pin tests had to follow the moved handlers**
- **Found during:** Task 1 (full-suite run)
- **Issue:** The plan says every pre-existing test file under test/server passes unmodified, but `derived-snapshot-isolation.test.ts` and `documents-route.test.ts` read the text of `src/server/index.ts` for `app.get('/api/documents'` and the first statement `const activeDerived = derived;`, and three web contract tests (note, review, todo) read `index.ts` for the context try blocks. Those handlers now live in `project-api.ts` with the D-05 capture as `const runtime = c.get('runtime');` then `const activeDerived = runtime.derived;`. A text pin on code that moved cannot pass unmodified.
- **Fix:** Pointed each pin at `src/server/project-api.ts` and updated the expected strings; the properties pinned (bundle captured before the lookup, context built inside a try block) are unchanged. `refresh.test.ts` and every behavioural server test are untouched.
- **Files modified:** test/server/derived-snapshot-isolation.test.ts, test/server/documents-route.test.ts, test/web/note-view-contract.test.ts, test/web/review-view-contract.test.ts, test/web/todo-view-contract.test.ts
- **Verification:** the five files pass
- **Committed in:** 1d3fd60

**3. [Rule 1 - Bug] Eviction race between the registry's answer and the in-flight increment**
- **Found during:** Task 2
- **Issue:** `registry.runtime()` resolves a promise, so a load finishing in the same tick could evict (dispose) the runtime before the project API's middleware incremented `inFlightRequests`, leaving the request on a released source (an ssh mirror already removed).
- **Fix:** The middleware checks `runtime.disposed` in the same synchronous step as the increment and asks the registry again (up to three times; it reloads the evicted project), else answers 404.
- **Files modified:** src/server/project-api.ts
- **Verification:** all registry and server suites pass
- **Committed in:** 9b5fe3c

**4. [Rule 1 - Bug] Test double inflated the heap measurement**
- **Found during:** Task 2
- **Issue:** The first heap run read 1.35 times because `vi.fn` retains every call's result, holding all 24 evicted snapshots alive.
- **Fix:** The heap test uses plain functions; the ratio now reads about 1.01 (99.8 MB, 100.4 MB, 100.7 MB).
- **Files modified:** test/server/project-registry.test.ts
- **Committed in:** 9b5fe3c

**5. [Rule 1 - Bug] "Answers differ" check cannot hold for /sketches**
- **Found during:** Task 1
- **Issue:** The plan asks that the two slugs answer differently on every parameterless GET route, but neither made-up fixture has a sketch manifest, so `/sketches` is `{ available: false, ... }` for both.
- **Fix:** `/sketches` is still compared to the single-project wrapper for each slug; only the differs check is skipped for it, with the reason in a comment.
- **Files modified:** test/server/registry-api.test.ts
- **Committed in:** 1d3fd60

---

**Total deviations:** 5 auto-fixed (2 blocking, 3 bug/test)
**Impact on plan:** All necessary for correctness or to keep the suite honest. No scope creep.

## Issues Encountered

- The worktree has no `node_modules`; module resolution finds the main checkout's through the parent directories, so tests and `tsc` ran with the main checkout's binaries. For the `npm run test:gate` runs only, a temporary `node_modules` symlink was created and removed afterwards (a symlink left in place made `fixture-leak.test.ts` fail with EISDIR).
- Three tests fail with and without this plan: the PATTERNS and UI-SPEC corpus guards have no pinned entry for Phase 8's own planning documents. Logged in `deferred-items.md`; not touched here.

## Known Stubs

None. `sessionOnly` is always false and `lastOpened` always null in this plan by design; 08-16 and 08-04 populate them.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: info-disclosure | src/server/registry-api.ts | GET /api/projects lists registered folder paths and unavailable-reason text. No request guard exists yet; 08-03 registers it in the reserved first slot before any write endpoint, and startServer still serves the legacy app until 08-06. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-03 can register the request guard and body limit in the marked first slot of `createRegistryApp`.
- 08-04 and 08-16 supply persistence: `lastOpened`, the PROJECT.md title for `name`, and `sessionOnly`.
- 08-06 switches `startServer` to the registry app, deletes the in-handler Sec-Fetch-Site check, and adds the source scan that keeps `createApp` out of `startServer`.
- 08-12 reads `c.get('mountPrefix')` to serve sketch files without editing `registry-api.ts`.

## Self-Check: PASSED

All created files exist on disk, both task commits are ancestors of HEAD (`1d3fd60`, `9b5fe3c`), the plan's gate commands pass (total 429, failed 0, skipped 0, todo 0 for the Task 2 gate), `tsc` for both configs and `eslint .` exit 0, and the full suite shows only the three pre-existing Phase 8 corpus-guard failures.

---
*Phase: 08-several-projects-and-a-switcher*
*Completed: 2026-10-29*
