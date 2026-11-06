---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 13
subsystem: planning-repo
tags: [intel, graph, bounded-summary, handler, index-summary, graph-scan, view-19]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 adoption of C3, C5, C14; 11-03 intel/graphs accept .md and the large class; 11-04 Lendshed intel and graph; 11-12 guarded-handler shape"
provides:
  - "IndexIntelHandler: a bounded structured.index per intel or graph file under the text cap, a label digest body under 2 KB, frontmatter of _meta scalars and the marker keys only"
  - "INDEX_BOUNDS and GRAPH_READ_CAP_BYTES (src/server/index-bounds.ts)"
  - "createIndexSummary, scanGraphElements, liftGraphReport, GraphSummary (src/server/index-summary.ts); one IndexSummary per ProjectRuntime derived bundle (derived.indexSummary)"
  - "largeGraphText, writeLargeGraph, writeIngestDocsProject and an --out CLI (test/helpers/index-fixtures.ts)"
affects: [11-14, 11-24]

actuals:
  tokens: 27000
  tasks: 3
  commits: 3
plan_head_before: b784ee1ca7fce11a0fa88d26a0eadd3a55f58559
plan_head_after: 2e857fce9b0d0ff0d3b65bedc72e366676717fa9

tech-stack:
  added: []
  patterns:
    - "One-pass byte scanner (depth, string and escape state) that parses one depth-three element at a time and keeps a degree Map, never the object graph"
    - "Summary-only handlers: the raw machine JSON is reduced to capped lists with totals before it can reach frontmatter, body or structured"
    - "Per-bundle service object (indexSummary) that drops its cache when the bundle is replaced on refresh"

key-files:
  created:
    - src/server/index-bounds.ts
    - src/server/index-summary.ts
    - src/planning-repo/handlers/index-intel.ts
    - src/planning-repo/handlers/index-intel-lift.ts
    - test/helpers/index-fixtures.ts
    - test/index-intel-handler.test.ts
    - test/server/index-summary.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/server/project-runtime.ts

key-decisions:
  - "IndexIntelHandler is registered before ContinueHereHandler (not just before Generic) because test/pause-handler.test.ts pins ContinueHereHandler as second to last; the two never match the same ref"
  - "graph.json is scanned for built_at_commit even when GRAPH_REPORT.md supplies counts and God Nodes, in an elements-off mode that parses no element; the commits-behind figure needs the commit and A5 puts it only in graph.json"
  - "countsRead on GraphSummary means counts were read from either the report or the scan; a truncated graph.json with no report is countsRead false and listed unreadable (invalid)"
  - "Stack list items are cut to 40 characters (INDEX_BOUNDS.listItemChars) so four lists of 12 stay inside the 4 KB summary bound"
  - "arch-decisions names at most 40 keys (INDEX_BOUNDS.archKeys) with the total kept: 'every key' holds for any real file and the cap guards a hostile one"
  - "The git argv carries -c core.fsmonitor=false, --no-pager and a trailing -- beside rev-list --count, matching file-dates.ts hardening"

requirements-completed: [VIEW-19]

coverage:
  - id: D1
    description: "A small intel or graph file lifts to a bounded structured.index, a label digest under 2 KB and frontmatter of _meta plus marker keys; a marker planted deep in the entries reaches no frontmatter, body, structured, /presentation, /documents HTML or search hit"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/index-intel-handler.test.ts (stack.json, planted marker, invalid JSON, prototype keys)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every intel kind (stack, file-roles, api-map, dependency-graph, arch-decisions, synthesis, ingest-doc, stamp, unknown) lifts within its bounds with the total kept, and every summary stays under 4 KB for a planted 5,000-entry file"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/index-intel-handler.test.ts (Task 3 blocks)"
        status: pass
    human_judgment: false
  - id: D3
    description: "scanGraphElements equals JSON.parse on a generated 20,000-node graph (counts, top-10 hubs, built_at_commit), grows linearly (ratio 7.8 from 2,500 to 20,000 nodes), and returns counts not read with no text for a graph cut mid-element"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/server/index-summary.test.ts (scanGraphElements)"
        status: pass
    human_judgment: false
  - id: D4
    description: "createIndexSummary reads report, status then graph.json through readBytesWithin('.planning'), never reads a file over 96 MiB, only stats snapshot and html files, validates the commit before git, and serves the 20,000-node summary under 16 KB with at most 10 hubs"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/server/index-summary.test.ts (createIndexSummary blocks, runtime block)"
        status: pass
    human_judgment: false

duration: 70min
completed: 2026-11-07
status: complete
commits: 3
---

# Phase 11 Plan 13: Bounded intel and graph summaries Summary

**Any intel or graph file, however large or broken, now yields a short bounded summary built on the server: small files lift through a new handler to `structured.index` plus a 2 KB label digest, and graph.json is summarised lazily by a one-pass byte scanner that matches JSON.parse on 20,000 nodes without ever building the graph.**

## Performance

- **Duration:** about 70 min
- **Tasks:** 3 (Task 1 a tracer, Tasks 2 and 3 TDD-marked)
- **Files:** 7 created, 2 modified

## Accomplishments

- **Handler (Task 1, tracer).** `IndexIntelHandler` claims `intel` and `graph` refs of class `text`. JSON goes through `tryParseJson`, markdown through `tryParseFrontmatter`; the result is `structured.index` (a capped summary), `body` = `digestOf(summary)` (labels, at most 2048 bytes) and `frontmatter` = `_meta` scalars plus `made_up_example`, `derived_from`, `gsd_core_version`. Invalid JSON or any throw gives an empty body, empty frontmatter, no `structured.index` and the existing warning. The planted-marker test proves a unique string deep in a file-roles file reaches no frontmatter, body, structured, `/api/presentation`, `/api/documents` HTML or `/api/search` hit, while a control search for a path the digest names does hit.
- **Bounds in one module.** `INDEX_BOUNDS` (10 hubs, 12 paths, 6 routes, 8 dependencies, 2 KB digest, 400-char report line cap, plus list, label, split and key caps) and `GRAPH_READ_CAP_BYTES` (96 MiB) live in `src/server/index-bounds.ts`, no Node import. Every cut list keeps its total so the UI can say "{shown} of {n}"; the digest carries "12 of 13 entries", "6 of 8 routes".
- **Graph summary (Task 2).** `scanGraphElements` walks the bytes once (depth, string, escape state), counts the top-level `nodes` and `links`/`edges` elements, parses each depth-three element alone, keeps a degree `Map` and picks the top 10 with a bounded insertion pass. On a generated 20,000-node, 60,000-link graph it equals JSON.parse for counts, hubs and `built_at_commit`; measureGrowth reads 7.8 for an 8x step (limit 24). `createIndexSummary` reads GRAPH_REPORT.md (Summary counts and God Nodes), then `.last-build-status.json` (status, exit code, duration, head), then graph.json under the cap; other files in graphs/ are only named and sized. `commitsBehind` runs `rev-list --count {commit}..HEAD` only for a `/^[0-9a-f]{7,40}$/` commit and is null on any failure. The runtime builds one `IndexSummary` per derived bundle (`derived.indexSummary`), so a refresh drops the cache; entries are also keyed by path, size and read time.
- **Remaining kinds (Task 3).** File-roles type split and 12 paths grouped by folder, api-map method counts and 6 routes, dependency-graph production/development split and the 8 most used (by `used_by` length, then name), arch-decisions keys and `overview.pattern` layers, SYNTHESIS.md document count, classification count and conflict buckets in the file's own words (`blockers`, `competing`, `autoResolved`; a line it cannot read gives no buckets), decisions/requirements/constraints/context heading and status counts, `.last-refresh.json` date only, unknown intel files by key names (markdown by heading names). All stay under 4 KB for planted 5,000-entry files.
- **Fixtures.** `largeGraphText(n)` / `writeLargeGraph(dir, n)` (deterministic, awkward labels with braces, quotes, backslashes and non-ASCII, a `built_at_commit`), `writeIngestDocsProject(dir)` (five markdown intel files, no graphs/) and a CLI: `node test/helpers/index-fixtures.ts --out <folder> --shape large-graph | ingest-docs`.

## Task Commits

1. **Task 1 (tracer): stack.json reads as a bounded summary, no raw JSON anywhere** - `5e8a122` (feat)
2. **Task 2: graph summary (report, status, bounded element scan, commits behind)** - `303f672` (feat)
3. **Task 3: remaining intel kinds, ingest-docs markdown, unknown files** - `2e857fc` (test; also the Stack item cut and the handler order fix)

## Deviations from Plan

**1. [Rule 1 - Verify command] Task 1's second automated verify read `a.body`, which the snapshot CLI omits**
- **Found during:** Task 1
- **Issue:** `node src/cli/snapshot.ts` serialises artifacts with `bodyLength` and no `body`, so the plan's one-liner threw on `a.body.length` after `structured.index` was already present.
- **Fix:** ran the same check against `bodyLength` (`bodyLength <= 2048 && > 0`); it prints `bounded: true body: 256`. No code change.

**2. [Rule 3 - Blocking] IndexIntelHandler registered before ContinueHereHandler**
- **Found during:** Task 3 full gate
- **Issue:** I first appended the handler after ContinueHereHandler; `test/pause-handler.test.ts` pins ContinueHereHandler at `HANDLERS.length - 2`.
- **Fix:** moved IndexIntelHandler one slot earlier. The two never claim the same ref (kinds `intel`/`graph` versus `continue-here`). Task 1's commit carries the old order; Task 3's commit fixes it.
- **Files modified:** src/planning-repo/handlers/index.ts

**3. [Rule 2 - Missing bound] Stack list item cut and an arch key cap**
- **Found during:** Task 3 (planted 5,000-entry stack.json came to 6.2 KB)
- **Issue:** four lists of 12 items at 120 characters exceed the 4 KB summary bound.
- **Fix:** `listItemChars: 40` for stack items; `archKeys: 40` and `unknownKeys: 24` as caps with totals kept ("every key" holds for any real file).

**4. Scan runs even when the report has everything.** The plan's tier order says the scan is the "else"; Lendshed's own truth requires `built_at_commit` read while the report supplies counts, and A5 puts the commit only in graph.json. In that case the scan runs in an elements-off mode that parses no element (a depth-tracking pass), so the cost is a byte walk, not a parse. Within the 96 MiB cap only.

**5. TDD order.** The two TDD-marked tasks were implemented alongside their tests rather than strictly RED first; tests were written against the plan's behavior blocks and all failed-first checks that mattered (the two Task 3 failures) were real defects found by the tests.

**Environment notes.** The labelore service serves the main checkout, so the plan's `systemctl --user restart labelore` was skipped (the worktree build passed). `node_modules` was symlinked for the gate and removed before return.

## Known Stubs

None. The page that renders these summaries is a later plan; `derived.indexSummary` and `structured.index` have no consumer yet by design ("No page yet").

## Threat Flags

None beyond the plan's register. T-11-18 (cap before any read, one linear pass, growth test, byte cap), T-11-19 (marker test across frontmatter, body, HTML, search), T-11-20 (hex pattern before git; hostile `--upload-pack=` commit never reaches it), T-11-21 (tryParseJson plus `Object.hasOwn`, `__proto__` node ids tested) and T-11-22 (all graph bytes via `readBytesWithin('.planning', ...)`, any failure an `unreadable` entry) are mitigated and tested.

## Self-Check: PASSED

- src/server/index-bounds.ts, src/server/index-summary.ts, src/planning-repo/handlers/index-intel.ts, src/planning-repo/handlers/index-intel-lift.ts, test/helpers/index-fixtures.ts, test/index-intel-handler.test.ts, test/server/index-summary.test.ts exist
- Commits 5e8a122, 303f672 and 2e857fc are ancestors of HEAD
- Acceptance greps: `IndexIntelHandler` in handlers/index.ts = 2, `GRAPH_READ_CAP_BYTES` in index-bounds.ts = 1, `readBytesWithin('.planning'` in index-summary.ts = 2, `from 'node:` in index-summary.ts = 0, `createIndexSummary(` in project-runtime.ts = 1, `competing` in index-intel-lift.ts present
- Full gate 6557 tests, the one failure (pause-handler order pin) fixed and re-run green; typecheck, lint and build exit 0
