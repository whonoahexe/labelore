---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 04
subsystem: testing
tags: [made-up-examples, fixtures, intel, graphify, markers, lendshed]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 confirmation that C13 is adopted and no plan is re-planned"
provides:
  - "readMadeUpMarker reads markers from raw JSON (top level or _meta) and from frontmatter fence lines"
  - "intel and graph rule kinds in MADE_UP_EXAMPLE_KINDS"
  - "Lendshed made-up intel (five files plus the .last-refresh stamp) and graph (graph.json, GRAPH_REPORT.md, .last-build-status.json), all indexed"
affects: [11-05, 11-06, 11-13, 11-24]

actuals:
  tokens: 33000
  tasks: 2
  commits: 2
plan_head_before: fcc8f68d611a6dd91cbf5c8862d00ab3b7bb46cd
plan_head_after: 5eab63fbb7e0f7536d84a5fd9389a9efe769e45b

tech-stack:
  added: []
  patterns:
    - "Made-up marker read order: parsed frontmatter, fence lines, first-line comment, raw JSON"

key-files:
  created:
    - test/fixtures/lendshed/.planning/intel/stack.json
    - test/fixtures/lendshed/.planning/intel/file-roles.json
    - test/fixtures/lendshed/.planning/intel/api-map.json
    - test/fixtures/lendshed/.planning/intel/dependency-graph.json
    - test/fixtures/lendshed/.planning/intel/arch-decisions.json
    - test/fixtures/lendshed/.planning/intel/.last-refresh.json
    - test/fixtures/lendshed/.planning/graphs/graph.json
    - test/fixtures/lendshed/.planning/graphs/GRAPH_REPORT.md
    - test/fixtures/lendshed/.planning/graphs/.last-build-status.json
  modified:
    - test/helpers/made-up-examples.ts
    - test/made-up-examples.test.ts
    - test/fixtures/README.md

key-decisions:
  - "stack.json follows the writer's real shape (_meta plus flat lists), not the plan's {_meta, entries} wording, because the writer schema and sketch 055 record it flat"
  - "graph and .last-build-status.json derive from gsd-core/bin/lib/graphify.cjs; the intel files from agents/gsd-intel-updater.md"
  - "GRAPH_REPORT.md is indexed with the type graph-report (its kind is unknown until 11-03 widens the graphs row), so the rule neither binds nor breaks on it"

requirements-completed: [VIEW-19]

duration: 25min
completed: 2026-11-07
status: complete
commits: 2
---

# Phase 11 Plan 04: Intel and graph made-up examples Summary

**The made-up example rule now reads markers from raw JSON and from frontmatter fence lines, binds the intel and graph kinds, and Lendshed carries labelled, indexed intel and a 40-node failed-build graph for the Indexes page.**

## Accomplishments

- `markerFromJson` (top-level keys, else `_meta`, through the guarded `tryParseJson`; invalid JSON or a non-object is a missing marker, never a throw) and `markerFromFenceLines` (line scan inside a leading `---` fence) added; `readMadeUpMarker` tries parsed frontmatter, fence lines, comment, then JSON.
- `intel` and `graph` appended to `MADE_UP_EXAMPLE_KINDS`; the "JSON markers" test block plants top-level, `_meta`, missing, graph, invalid-JSON, wrong-type, prototype-key and fence-line cases.
- Lendshed gained `intel/` (stack, file-roles, api-map, dependency-graph, arch-decisions, `.last-refresh.json`) and `graphs/` (graph.json with 40 nodes, 60 links, six communities and a 40-character invented `built_at_commit`; GRAPH_REPORT.md with Summary, God Nodes and one line over 5 KB; `.last-build-status.json` with status failed and exit code 1). All nine are rows in `test/fixtures/README.md`, and the README documents the two new marker forms.
- Snapshot of Lendshed classes `stack.json` and `arch-decisions.json` as `intel` and `graph.json` as `graph`.

## Task Commits

1. **Task 1: One marked intel JSON passes the made-up rule end to end** - `eff8526` (feat)
2. **Task 2: The rest of intel and the graph, indexed** - `5eab63f` (test)

## Deviations from Plan

**1. [Rule 1 - Shape fidelity] stack.json is not `{_meta, entries}`**
- **Found during:** Task 1
- **Issue:** the plan text says every intel file is `{_meta, entries}`, but the writer schema (`gsd-intel-updater.md`) and sketch 055's recorded real shape make stack.json flat lists beside `_meta`.
- **Fix:** stack.json is `_meta` (with the marker) plus `languages`, `frameworks`, `tools`, `build_system`, `test_framework`, `package_manager`, `content_formats`; its index row says so.
- **Files modified:** test/fixtures/lendshed/.planning/intel/stack.json, test/fixtures/README.md
- **Commit:** eff8526

**2. [Rule 3 - Blocking] The Task 1 verify command cannot pass as written**
- `npm run test:gate -- test/made-up-examples.test.ts -t "JSON"` filters the other 14 tests, and the gate counts filtered tests as skipped, so it prints `skipped=14` and exits non-zero even though the 7 JSON tests pass. Ran the whole file instead (`total=21 passed=21 failed=0 skipped=0`). The later plans that reuse this verify pattern will meet the same gate behaviour.

**3. [Environment] node_modules symlink**
- The worktree has no `node_modules`; a symlink to the main checkout's was used for running tests and is untracked (removed before return). `fixture-leak.test.ts` read it as a file until `/node_modules` was added to the shared `.git/info/exclude`; that line is harmless to the main checkout (it already ignores the directory).

## Deferred Issues (out of scope, pre-existing)

Full gate (`npm run test:gate -- test`) at the end: total=6302 passed=6299 failed=3. The three failures are not caused by this plan: `test/web/pattern-map-corpus.test.ts` and `test/web/ui-spec-corpus.test.ts` (two tests) report "11-PATTERNS.md / 11-UI-SPEC.md needs a pinned entry" because Phase 11's own planning files were added without corpus pins. They fail identically without this plan's files. `deferred-items.md` was not written, to avoid a merge conflict with the parallel executor; the orchestrator should route these to whichever plan owns the pins. With node_modules excluded, `fixture-leak.test.ts` and `made-up-examples.test.ts` pass (29/29). Typecheck and ESLint on the touched files are clean. No per-project total another test pins moved when Lendshed gained files.

## Known Stubs

None.

## Threat Flags

None. T-11-07 mitigated (guarded parse, prototype keys stripped, invalid JSON is a missing marker; planted cases cover it). T-11-52 mitigated (invented Lendshed content only; `built_at_commit` and hashes are invented hex; fixture-leak passes).

## Self-Check: PASSED

- All nine fixture files and the three modified files exist.
- Commits eff8526 and 5eab63f are ancestors of HEAD.
- `ls test/fixtures/lendshed/.planning/intel/*.json | wc -l` prints 5; `"status": "failed"` and `built_at_commit` each match once; snapshot verify prints `wrong kinds:` with no path and exits 0.
