---
phase: quick-260930-mp6
plan: 01
subsystem: rendering / research-view figures
tags: [research, figures, diagram, lanes, graph, sketch-012]
requires: [quick-260930-jzt lifted diagram, quick-260929-3x3 figure frame]
provides: [buildDiagramGraph, layoutLanes, LaneDiagramFigure, NodeDetails]
affects: [RESEARCH System architecture chapter]
tech-stack:
  added: []
  patterns: [pure graph port with cell-index grids, measured width budget via ResizeObserver callback, imperative Fit]
key-files:
  created:
    - src/rendering/ascii-graph.ts
    - src/rendering/lane-layout.ts
    - src/web/components/lane-diagram.tsx
    - test/rendering/ascii-graph.test.ts
    - test/rendering/lane-layout.test.ts
    - test/web/lane-diagram.test.ts
    - test/rendering/fixtures/sketch-012-graphs.json
    - test/rendering/fixtures/sp-v1-02-storage-health-diagram.txt
    - test/rendering/fixtures/sp-v1-04-transfers-diagram.txt
    - test/rendering/fixtures/sp-p03-account-admin-diagram.txt
    - test/rendering/fixtures/lb-v1-02-situational-awareness-diagram.txt
    - test/rendering/fixtures/lb-v1.1-05-per-type-views-diagram.txt
    - .planning/quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/gen-sketch-golden.ts
    - .planning/quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/capture-side-by-side.mjs
  modified:
    - src/web/views/research-briefing-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/research-view-contract.test.ts
    - test/e2e/research-briefing.spec.ts
    - test/e2e/measure.ts
decisions:
  - "Thin rule is stricter than the sketch (>=4 nodes, wires >= nodes/2, quality >= 0.6, dangling <= 2, <= 60 nodes); studio-portal v1.0/03 therefore shows as drawn"
  - "Fallback chip is quiet; 'Service & steps' only when a step node is in the lane"
  - "--figure-lane uses a 42% recipe (40% already recurs in .search-snippet; the plan's 45% recurs in .copy-field-row)"
  - "A source with a node stacked under it in its lane leaves by its side (added after the side-by-side check)"
metrics:
  duration: ~1h10m
  completed: 2026-09-30
status: complete
commits: 4
plan_head_before: 183513220b1b67a7e6ed5b69fdcd078c72881b8a
plan_head_after: b1ddaeb081f2b9a8ea721a07af67be469e2c58ce
actuals:
  tokens: 45000
  tasks: 3
  commits: 4
---

# Phase quick-260930-mp6 Plan 01: Sketch 012 B "Lanes by kind" Summary

The RESEARCH System architecture figure is now drawn as lanes by kind: the author's ASCII is read into a typed graph (pure port of sketch 012's shapes.js + graph.js, bug-compatible, parity-tested against the sketch's own output) and laid out one lane per kind with orthogonal rounded wires; a node click opens a details panel, and "Shown as drawn" swaps back to the lifted figure.

## What was built

- `src/rendering/ascii-graph.ts`: `buildDiagramGraph(LiftedFigure)` returning nodes/edges/groups/quality/dangling/thin. Cell-index grids replace the sketch's per-probe scans; more than 120 cards or 60 nodes returns an empty thin graph before any scan.
- `src/rendering/lane-layout.ts`: `layoutLanes(graph, budget)` with lane order, per-lane cap (uncapped, 2, 1) and wrap, compact flag, orthogonal wires, wire-label anchors, group rects.
- `src/web/components/lane-diagram.tsx`: `LaneDiagramFigure`, `LaneDiagram`, `NodeDetails`; measured budget, Fit, selection (node toggle, Escape, Close), wire labels, groups.
- CSS in the quick-260929-3x3 block plus `--figure-wire`, `--figure-lane`, `--figure-icon`, `--figure-group-fill`; design-language rows and conventions.
- Tests: golden parity (8 fixtures), bridging/side-label/fan-out/group cases, thin verdicts for 10 fixtures, perf bound, layout expectations and invariants at 940 and 1440, static markup, RESEARCH view (23 nodes), CSS contract. Full suite: 82 files, 1585 tests green; typecheck clean; eslint clean on src/ and test/.
- Narrow e2e `test/e2e/research-briefing.spec.ts` passes in one run (2/2).

## Drawn or thin verdict for the 12 liftable corpus diagrams

| Diagram | Verdict | Nodes / lanes at 1440 (body 1222px) |
|---|---|---|
| studio-portal v1.0/01 identity | drawn | 7 nodes, 5 lanes, 1 group |
| studio-portal v1.0/02 storage health | drawn | 9 nodes, 6 lanes, prober threads wrapped in Worker lane |
| studio-portal v1.0/03 file browsing | thin (shown as drawn) | 2 nodes |
| studio-portal v1.0/04 transfers | drawn | 23 nodes, 6 lanes |
| studio-portal phases/01 identity sessions | drawn | 15 nodes, 5 lanes |
| studio-portal phases/02 roles | drawn | 11 nodes, 4 lanes |
| studio-portal phases/03 account admin | thin | not in the sketch |
| studio-portal phases/04 bulk archive | drawn | 11 nodes, 4 lanes |
| labelore v1.0/01 read layer | thin | not in the sketch |
| labelore v1.0/02 situational awareness | drawn | 23 nodes, 4 lanes |
| labelore v1.0/03 search/browsing | thin | not in the sketch |
| labelore v1.1/05 per-type views | thin | not in the sketch |

## Layout constants tuned

None of the plan's constants were changed. One routing rule was added after the side-by-side check (see Deviations).

## e2e counts that moved

- LB v1.0/02: 23 `.lifted-diagram-card` became 23 `.lane-diagram-node` (same count); the lifted 23 return through "Shown as drawn".
- SP v1.0/02: 9 lifted boxes now appear after "Shown as drawn"; drawn view has 9 nodes / 6 lanes.

## Composed side-by-side PNGs (sketch 012 B left, build right)

Directory `test/e2e/screenshots/mp6/` (gitignored):
`sp-v1-02-light.png`, `lab-v1-02-light.png`, `sp-v1-01-light.png`, `sp-v1-03-light.png`, `sp-v1-04-light.png`, `sp-01-light.png`, `sp-02-light.png`, `sp-04-light.png`; dark: `sp-v1-02-dark.png`, `lab-v1-02-dark.png`, `sp-02-dark.png`, `sp-04-dark.png`; selected pair `sp-v1-02-selected-light.png`; wider corpus (build only) `sp-p03-light.png`, `lb-v1-01-light.png`, `lb-v1-03-light.png`, `lb-v1.1-05-light.png`; `report.json` holds the scroll-width measurements. Every drawn diagram measured `scrollWidth <= clientWidth` on the figure body at 1440px (no horizontal scrollbar).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Planning arithmetic: storage health node width 141 vs floor() 140**
- **Found during:** Task 1
- **Issue:** the plan's floor formula at the 940 default budget gives 140 for six lanes; 141 x 6 + 96 = 942 would overflow the budget and break the plan's own "width at most 940" invariant. 141 is what the formula gives at a 942 budget.
- **Fix:** tests assert 140 at 940 (formula and invariant hold).

**2. [Rule 1 - Bug] `--figure-lane` recipe recurrence**
- **Issue:** the plan's 40% muted recipe already recurs in `.search-snippet`, and the token-guard fails on recurring recipes.
- **Fix:** 42%; `--figure-group-fill` stays at 25%.
- **Commit:** 991f22e

**3. [Rule 1 - Bug] Stacked-lane wires ran behind the nodes below the source**
- **Found during:** Task 3 side-by-side check on storage health
- **Fix:** a source with another node stacked directly under it in its lane exits by its side toward the target (`lane-layout.ts`). Wire-start/tip invariants still pass.
- **Commit:** 5f0d863

**4. [Rule 2 - Missing critical] Panel lists lost bullets; selected node was clipped by the narrowed canvas**
- **Fix:** `list-style: disc` on the panel lists (matches the sketch); a layout effect scrolls the selected node into view.
- **Commit:** 5f0d863

### Notes (not deviations)

- **Measured body width:** at 1440px the frame body content width is 1222px on the current RESEARCH page (not the 942px assumed at planning), so at 1440 storage health is not compact (K=1, 187px nodes) and lanes are wider than in the planned arithmetic. The 940 default and its tests are unchanged; the measured budget takes over after the first ResizeObserver callback.
- **Tracer gate:** after Task 1 the automated verify (vitest set, typecheck, lint) was re-run and passed; the tracer's human-check (dev server on 5180) is folded into the end-of-phase human check (`human_verify_mode: end-of-phase`).
- **`npm run lint` on this checkout** fails on 59 errors in gitignored `.playwright-mcp/jzt/*.mjs` scratch files left by quick-260930-jzt (not part of the repo). eslint on `src` and `test` is clean. Left in place, not mine to delete.
- **Bundle check:** the served index references `index-Br8ghIub.js`; the string `lane-diagram` lives in the lazily loaded `artifact-page-*.js` chunk and in the CSS, both in `dist/`. `labelore.service` was rebuilt and restarted and is active; the scratch server on 5193 was stopped by PID.

## Winner deviations left in place

- In the sketch and in the build, an author wire label can sit over a group's label (studio-portal v1.0/01: "Auth middleware" partly covered by the "(2) POST /api/ws-ticket..." label). Same in the sketch; left as is.
- Wide multi-layer stacked lanes (v1.0/04) still have wires that cross other nodes' columns and a wire label ("dest/source touches a 'cloud:' remote") partly behind a node; the sketch's own B has the same crossings. Candidate for a later routing pass.
- Client lane with four peers (labelore v1.0/02 Dashboard, Roadmap/history, Artifact page, Preview) wraps 2x2 under the cap rule instead of the sketch's single row.
- The first paint lays out at the 940 default until the ResizeObserver fires (up to about 2s on a cold first load of the lazy chunk, then it relayouts to the measured width).

## Thin diagrams: candidates for a later extraction pass

studio-portal phases/03 account administration (a box-less flow: 48 rows, few boxes, dense asides), studio-portal v1.0/03 file browsing (2 nodes), labelore v1.0/01, v1.0/03 and v1.1/05. Loosening thin needs a better extractor for box-less step flows, not a looser threshold.

## Known Stubs

None.

## Threat Flags

None. Author text renders as React text nodes; svg path data is numbers only; no new endpoints, no installs.

## Self-Check: PASSED

Files present: src/rendering/ascii-graph.ts, src/rendering/lane-layout.ts, src/web/components/lane-diagram.tsx, the three test files, sketch-012-graphs.json and the five new fixtures, gen-sketch-golden.ts, capture-side-by-side.mjs, and 17 PNGs in test/e2e/screenshots/mp6/. Commits found: 991f22e, 8f6fcca, 5f0d863, b1ddaeb.
