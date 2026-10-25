---
phase: 06-trustworthy-tests-and-security-baseline
plan: 20
subsystem: testing
tags: [timing, growth-ratio, diagram, caps, flaky-tests]
requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "measureGrowth and GROWTH_LIMIT (06-02), made-up Lendshed diagram fixtures and golden (06-19)"
provides:
  - "Every diagram timing test (ascii-lift, ascii-graph, ascii-tree, figure-detect) asserts growth, none an absolute millisecond budget"
  - "test/helpers/diagram-grids.ts: adversarial grid shapes sized by cell count, kept inside the lift row and column caps"
affects: [06-22]
tech-stack:
  added: []
  patterns: ["caps-are-not-growth: size the 8x step strictly below the cap, with make() asserting the input is not a rejected one", "over-cap case asserted flat (ratio below 3) only where the code returns before reading the input"]
key-files:
  created:
    - test/helpers/diagram-grids.ts
  modified:
    - test/rendering/ascii-graph.test.ts
    - test/rendering/ascii-lift.test.ts
    - test/rendering/ascii-tree.test.ts
    - test/rendering/figure-detect.test.ts
key-decisions:
  - "Grids are sized by cell count and capped at 40,000 cells so the largest lifts to fewer cards than MAX_GRAPH_NODES"
  - "parseTree is varied below TREE_MAX_ROWS rather than asserted flat above it, because the split over the whole input is linear even when rows stop at the cap"
  - "classifyFence gets both a below-cap growth test and an over-cap flat test, since it returns before reading text past FIGURE_MAX_CHARS"
requirements-completed: [TEST-01, TEST-03]
duration: 20 min
completed: 2026-10-26
status: complete
commits: 2
plan_head_before: 4e834728a4e9393060b1b16a24f0dd0b0ca4d8bd
plan_head_after: 19dd49e4b2f1b666f42cccfae13c50d7c7850d52
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 6 Plan 20: Diagram timing tests as growth Summary

The sixteen fixed 250/100 ms diagram timing reads are now growth-ratio assertions that respect the lifter, graph, tree and fence size caps, so they no longer flake under full-suite load.

## Accomplishments

- **Graph build (tracer, d111599):** four adversarial grid shapes are lifted outside the timed region and `buildDiagramGraph` is timed with `measureGrowth` over grid area up to 40,000 cells. `make()` asserts the lifted figure has fewer cards than `MAX_GRAPH_NODES`, so the node-cap rejection is never what gets timed. Measured ratios were about 8 to 13 (linear) against `GROWTH_LIMIT` 24.
- **Lift (19dd49e):** the four grid shapes (including the three former 250 ms reads) are timed by area, inside `LIFT_MAX_ROWS` by `LIFT_MAX_COLS`. Measured ratios about 5 to 8. The 250 x 300 grids at the caps still lift (untimed correctness checks kept).
- **Tree (19dd49e):** `parseTree` is varied from 20 lines up to just below `TREE_MAX_ROWS` (ratio about 7); the 100,000-line cap check is kept untimed as `toHaveLength(TREE_MAX_ROWS)`. `collapseFolderChains` (no cap) is timed with `measureGrowth`, with the 100,000-row result assertion kept.
- **Fence detect (19dd49e):** `classifyFence` on tree text is timed strictly below `FIGURE_MAX_CHARS` (ratio about 9), and the over-cap case asserts a ratio below 3 for an input 8x larger.
- Deny-list sweep: the word-bounded search over all seven files and `fenced-figure.test.ts` already found nothing (06-19 swept them); no edits were needed.
- The full suite stayed green (3542 passed, 0 skipped); the seven files passed three runs in a row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a shared helper file not named in `files_modified`**
- **Found during:** Task 1
- **Issue:** ascii-lift and ascii-graph needed the same four grid shapes and sizing logic; duplicating them would drift.
- **Fix:** created `test/helpers/diagram-grids.ts` (committed with Task 1).
- **Commit:** d111599

**2. [Plan wording] Deny-list sweep needed no edits**
- **Found during:** Task 2
- **Issue:** the plan expected 15 hit lines; 06-19 had already removed them. Only substring matches (`onEdge`, `nodeId`) remain, which are not the listed words.
- **Fix:** none required.

**3. [Plan wording] parseTree not asserted flat above its cap**
- **Found during:** Task 2
- **Issue:** the plan allowed a flat-ratio assertion above a cap, but `parseTree` splits the whole input before it stops at the row cap, so an 8x larger over-cap input is genuinely about 8x slower. A flat assertion would be false.
- **Fix:** varied size strictly below the cap instead, and kept the over-cap row-count check untimed.

**Total deviations:** 3 (1 blocking-helper, 2 plan-wording). **Impact:** none on the goal; `GROWTH_LIMIT` was not loosened.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- test/helpers/diagram-grids.ts present; commits d111599 and 19dd49e on master.
- No `performance.now` or `Date.now` left in ascii-lift, ascii-graph, ascii-tree or figure-detect tests; `measureGrowth` present in ascii-graph.
- Lint and typecheck clean; plan verification (seven files, three runs) passed.
