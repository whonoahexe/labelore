---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 18
subsystem: web-views
tags: [indexes, intel, graph, bounded-summary, grid, view-19]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 adoption of C1, C2, X2 and approval of X5; 11-13 bounded intel and graph summaries (structured.index, IndexSummary.graph); 11-15 and 11-16 view-kind wiring and route redirect pattern"
provides:
  - "The 'indexes' view kind (34): intel and graph both map to it through viewKindOf; viewOwnsLargeFile(kind) is true for intel and graph only"
  - "The large-file bypass in document-route.tsx: a large intel or graph file opens the Indexes page, listed, binary and image files keep their pages"
  - "buildIndexesContext (pure), INDEX_TILE_ORDER, INGEST_TILE_ORDER, graphArtifactsOf, tileKeyOfPath, firstTileUrl (src/presentation/indexes-context.ts)"
  - "indexesContext on /documents for intel and graph files, with the graph summary awaited once per request (cached per bundle by 11-13)"
  - "composeIndexes (pure) and IndexesView: the grid, the Graph tile with counts and its two status chips, the open Graph panel (counts, freshness cells, report lines, foot), the not-built ghost"
  - "The bare /indexes redirect to the first tile in grid order (payload keys only), not-found where there is no tile address"
affects: [11-19]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 98eb98ad0a229a9f3a9a129be3ada1a085ba20d8
plan_head_after: 4b36f3d4748ea2fc3a11a8cbc3d2abbc220d85fd

key-files:
  created:
    - src/presentation/indexes-context.ts
    - src/web/views/indexes-page.ts
    - src/web/views/indexes-page-components.tsx
    - test/web/indexes-page.test.ts
  modified:
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/pages/document-route.tsx
    - src/web/route-dispatch.ts
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - test/web/view-registry.test.ts
    - test/web/route-dispatch.test.ts
    - test/server/documents-route.test.ts

key-decisions:
  - "The context carries the bounded summaries themselves (IntelSummary per tile, the GraphSummary on the Graph tile) instead of pre-composed figures; composeIndexes turns them into figures, so 11-19 adds figures and panels without touching the server"
  - "Every graphs/ file opens the Graph tile; each JSON intel file its own tile; SYNTHESIS.md and the four ingest documents open Synthesis; .last-refresh.json and unknown intel files open the page with no tile open"
  - "Synthesis is appended last when it exists beside JSON intel; the ingest-docs order (Synthesis, Graph) applies only when SYNTHESIS.md exists and no JSON intel does"
  - "A project with intel but no graphs/ draws the not-built Graph ghost; a project with only graphs/ draws only the Graph tile; a ghost has no address so the bare /indexes skips it"
  - "Closing an open tile collapses it in place (X3): view state only, derived from the address during render so another address resets it; Esc closes and focus returns to the tile's button"
  - "Big counts at --fs-display-1 (X5 approved at 11-01): the page renders five sizes (display-3 h1, display-1 counts, fs-7 open-tile title, fs-4 body, fs-2 labels)"

requirements-completed: [VIEW-19]

coverage:
  - id: D1
    description: "Every Phase 7 intel and graph address opens one Indexes page with that file's tile open in place; .last-refresh.json opens it with no tile open; the kinds intel and graph map to the view kind 'indexes'"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/view-registry.test.ts (viewKindOf, resolveViewFor), test/web/indexes-page.test.ts (tileKeyOfPath, openKey), test/server/documents-route.test.ts (openKey per file)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A graph.json above the text cap (class large) opens the Indexes page, not the File details card; listed, binary and image files keep their pages"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/view-registry.test.ts (viewOwnsLargeFile true for intel and graph only); test/server/documents-route.test.ts (12,000-node graph over the cap summarised on the Graph tile)"
        status: pass
      - kind: other
        ref: "shoot-pages on a generated 20,000-node, 6.5 MB graph: /graphs/graph.json renders the Indexes page, no FAIL line"
        status: pass
    human_judgment: false
  - id: D3
    description: "The bare /indexes redirects to the first tile address in grid order and is not-found where neither intel/ nor graphs/ holds a file; no header tab"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/route-dispatch.test.ts (the bare /indexes: Lendshed, no graphs, ingest-docs, Shapes, stamp-only, keyless payload)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Graph tile shows node and edge counts with '{n} commits behind' in-flight and 'Last update failed' missing chips; its open panel shows the counts and the freshness cells; a failed update reads as the last good counts plus the chip"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/indexes-page.test.ts (composeIndexes chips, cells, Counts not read)"
        status: pass
      - kind: other
        ref: "screenshots of /graphs/graph.json and /intel/stack.json on Lendshed at 1280 and 390, light and dark, beside sketch 055 A"
        status: pass
    human_judgment: true
  - id: D5
    description: "The /documents response for an index file carries the bounded indexesContext only: no raw JSON in the rendered HTML, Lendshed's graph.json response under 32 KB with no node id beyond the hubs, no raw key of stack.json"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/server/documents-route.test.ts (graph.json, stack.json, over-cap graph)"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-11-07
status: complete
commits: 2
---

# Phase 11 Plan 18: Indexes page spine Summary

**Every intel and graph address now opens one Indexes page built from sketch 055 A: a grid with one tile per index file in UI-SPEC order, the Graph tile showing its node and edge counts with "{n} commits behind" and "Last update failed" chips and opening to the counts and freshness cells, a large graph.json reaching the page through `viewOwnsLargeFile`, and the bare /indexes leading to the first tile, all from the bounded summary with the raw data never sent.**

## Accomplishments

- **Task 1 (tracer): the graph file opens the grid.** `intel` and `graph` map to the new `indexes` view kind; `buildIndexesContext` joins the presentation's `structured.index` lifts and the awaited graph summary into tiles (Graph, Architecture, Stack, File roles, API surface, Dependencies; Synthesis, Graph for an ingest-docs project; a hatched "Not built" ghost when there is no graphs/ folder). `/documents` carries it as `indexesContext` for an intel or graph file only; the graph summary is awaited once per request (cached per bundle by 11-13) and a failure leaves the tile at "Counts not read". Verified: Lendshed's graph.json response is far under 32 KB, names only the report's six hubs, and a 12,000-node graph over the 1 MiB text cap answers with the same small shape. The grid, the Graph tile and its open panel were photographed on Lendshed (a stale graph whose last update failed: 40 nodes, 60 edges, one "Last update failed" chip and a `missing` Last auto-update cell) and on a generated 6.5 MB graph.
- **Task 2: the bare /indexes.** `route-dispatch.ts` sends /indexes to the first tile address in grid order, taken from a payload key and never from the typed address; Lendshed leads to /graphs/graph.json, an ingest-docs project to /intel/SYNTHESIS.md, Shapes and a stamp-only payload are not-found, and a payload whose index files carry no key is not-found.
- Full unit gate: `gate: total=6736 passed=6736 failed=0 skipped=0 todo=0`; typecheck, lint and build exit 0.

## Task Commits

1. Task 1 (tracer): `a701697`
2. Task 2: `4b36f3d`

## Side-by-side with sketch 055 A

Shot on Lendshed (`/graphs/graph.json`, `/intel/stack.json`) and a generated 20,000-node graph, each at 1280 and 390, light and dark, beside the sketch's A tab. No FAIL line (one h1, no sideways scroll at 390, no page errors). The grid, the three-column rhythm with the Graph tile wide, the open tile spanning the row with a Close button and the freshness cells with the in-flight and missing borders match. Differences left on purpose, each owned by 11-19 or by the data:

- The Architecture, Stack, File roles, API surface and Dependencies tiles carry a one-line figure ("3 layers", "13 entries") and open to their foot only; their key figures, split bars, chips and full panels are 11-19's. Their tile buttons are real (`aria-expanded`, `aria-controls`) and navigate to the file's address.
- The open Graph panel shows the three counts the bounded summary holds (nodes, edges, communities), the freshness cells and the report's Summary lines as written. The extraction split, "Most connected" bars and the "Not sent to this page" line are not drawn yet (11-19); the summary already carries `hubs`, `notSent` and `notSentTotal` for them.
- No slide or transition: the Indexes CSS block adds none.
- The sketch repeats the file path as a label above the open panel's title; this build shows the path once, in the panel foot.

## Deviations from Plan

**1. [Rule 3 - Blocking] The panel shows three counts, not four, and "Last good build" appears only for an ok status.**
- **Found during:** Task 1
- **Issue:** The plan's open panel names "the four counts and the freshness cells". 11-13's `GraphSummary` carries nodes, edges and communities but no import-cycle count or thin-community count, and no last good build date other than the status file's own timestamp (a failed status does not say when the last good build was). Lifting those needs a change to `liftGraphReport` in 11-13's `src/server/index-summary.ts`, outside this plan's `files_modified`.
- **Fix:** Showed the three counts that exist and the Summary lines as written; "Last good build" appears when the status is ok (its date, aged to the snapshot read time), else is omitted (absence is silent). Import cycles and a good-build date from graph.json's mtime are left for 11-19 or a follow-up that extends the 11-13 lift.
- **Files modified:** src/web/views/indexes-page.ts
- **Commit:** a701697

**2. [Rule 1 - Bug] Lint: setState inside an effect** in the first IndexesView draft (resetting "collapsed" when the address changes). Replaced by the derive-during-render pattern. Commit a701697.

**3. Extra test file.** `test/web/indexes-page.test.ts` (13 tests: tile order, openKey, ghost, ingest-docs, composer chips, cells, age) was added beyond the plan's named test files. `test/web/route-dispatch.test.ts` also gained the Task 2 cases the plan listed.

**4. [Environment]** `node_modules` is a symlink to the main checkout's (untracked, removed before return). The labelore service serves the main checkout, so both `systemctl --user restart labelore` steps were skipped: after merge the main checkout needs `npm run build` and `systemctl --user restart labelore`.

## Known Stubs

None that block the plan's goal. The five non-graph tiles show one-line figures and open to their foot only by design: their key figures and panels are 11-19's (declared in the plan objective). They are not hardcoded or mock data; each line reads the bounded summary.

## Threat Flags

None beyond the plan's register. T-11-28 mitigated and tested (only the bounded context ships; Lendshed's graph.json response is under 32 KB with no node id beyond the hubs and no raw stack.json key; a 12,000-node over-cap graph answers the same size). T-11-29 mitigated (the summary is awaited once per request and is cached and capped by 11-13; `viewOwnsLargeFile` admits intel and graph only, tested).

## Self-Check: PASSED

- Created: src/presentation/indexes-context.ts, src/web/views/indexes-page.ts, src/web/views/indexes-page-components.tsx, test/web/indexes-page.test.ts exist
- Commits a701697 and 4b36f3d are ancestors of HEAD
- Acceptance: `'indexes'` in kinds.ts (3), `viewOwnsLargeFile(` in document-route.tsx (1), `toBe(34)` in view-registry.test.ts (1), `'/indexes'` in route-dispatch.ts (1), `.graph(` in project-api.ts (1)
