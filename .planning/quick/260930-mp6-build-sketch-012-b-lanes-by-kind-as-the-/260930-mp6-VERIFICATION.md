---
task: quick-260930-mp6
verified: 2026-09-30T17:10:00+05:30
status: human_needed
score: 8/8 must-have truths verified in code, tests or screenshots; 1 visual/interaction sign-off left to the end-of-phase human check
behavior_unverified: 0
gaps: []
human_verification:
  - test: "Hard-refresh http://cinedise:4173, open studio-portal v1.0/02 storage health, v1.0/01, phases/02 and phases/04 in light and dark at 1440px"
    expected: "Each reads as sketch 012 B: kind lanes with icon heads, short labels, rounded wires with arrowheads, no horizontal scrollbar"
    why_human: "Visual fidelity to a sketch is a judgement call. The PNGs match structurally, but no test can rule on it."
  - test: "On storage health, click Health registry, then press Escape. Then try Fit to width and Expand"
    expected: "The panel opens with Details, From (4 probers), To (Broadcast bus plus its label) and As written. Its wires turn primary and the rest dims. Escape clears it. Fit scales without a scrollbar. Expand relays out for the wider body."
    why_human: "Escape and panel are covered by the e2e for LB v1.0/02. Fit and Expand have no automated assertion (both are imperative DOM code)."
  - test: "Open v1.0/03 file browsing and phases/03 account administration"
    expected: "A quiet 'Shown as drawn' chip, 'This figure keeps the author's layout.' and the lifted figure"
    why_human: "The screenshot shows this for v1.0/03, and unit tests cover the thin verdicts. Nobody has looked at phases/03 in the live app."
---

# Quick 260930-mp6 Verification: sketch 012 B as the RESEARCH architecture diagram

**Goal:** Build sketch 012 B (lanes by kind) as the RESEARCH architecture diagram.
**Verdict:** The goal is achieved in the code and the live build. Status is `human_needed` only for the plan's own end-of-phase visual and interaction check. No gaps were found.

## Evidence I ran myself

| Check | Result |
|---|---|
| `npm test` (full vitest) | 82 files, 1585 tests pass |
| `npm run typecheck` | exit 0 |
| `npx eslint src test` | clean. The bare `npm run lint` fails on gitignored `.playwright-mcp/jzt` scratch files, as the SUMMARY says. |
| `npx playwright test test/e2e/research-briefing.spec.ts` (narrow, 2 tests) | 2 passed |
| Live service | `labelore` is active. `:4173` serves `artifact-page-Db09t1OK.js` (HTTP 200) containing `lane-diagram-node`. `dist/index.html` (17:00:43) is newer than the last source commit (17:00:42). |
| Commits | 991f22e, 8f6fcca, 5f0d863 and b1ddaeb are on master. The tree is clean apart from the untracked PLAN, SUMMARY and COVERAGE files. |
| Debt markers and raw HTML | No TBD/FIXME/XXX in the three new source files. No `dangerouslySetInnerHTML` in any of them. |
| Tokens | The `.lane-diagram` primary uses are only the hot wire, the hot arrowhead, the selected node border and ring, and the Client icon. Other `--primary` hits found are pre-existing rules for `.clean-tree-folder` and `.view-research-*`. |

## Observable truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | MP6-03/05/06: 7 corpus diagrams drawn as lanes by kind, with icon heads, alternating shade, uniform nodes and orthogonal rounded wires | VERIFIED | `ascii-graph.ts`, `lane-layout.ts` and `lane-diagram.tsx` exist and are wired. `research-briefing-components.tsx` renders `LaneDiagramFigure`. Golden parity against `sketch-012-graphs.json` is green. PNGs `sp-v1-02`, `lab-v1-02`, `sp-v1-01`, `sp-02`, `sp-04` and `sp-v1-04` show lanes in order, icon heads, alternating shading, rounded wires with arrowheads and wire labels. Only the Client icon is orange-tinted, in both themes. |
| 2 | MP6-04: fits at 1440 with no horizontal scroll. Probers wrap in the Worker lane. Fit and Expand work. | VERIFIED for width and wrap. Fit and Expand are code-only. | `report.json` shows `bodyScroll == bodyClient` (1262) for every drawn doc. In the storage-health PNG, four probers stack in the Worker lane. Layout tests pass at 940 and 1440. The measured budget comes from a ResizeObserver, and Fit is imperative. Neither has an automated assertion, so they go to the human check. |
| 3 | MP6-01: side label, bridging and fan-out survive | VERIFIED | The golden and named tests are green: "Host kernel / devices" is a node, all four probers have wires to "Health registry", LB v1.0/02 has its 4 implied fan-out edges, and v1.0/01 has its "Auth middleware" group of 4 members. The PNGs show all of them. |
| 4 | MP6-07: node click opens a details panel; the node's wires turn primary and the rest dims; a second click, Close or Escape clears it | VERIFIED | The e2e passes (click Dashboard, panel with "As written", Escape hides it). The selected-pair PNG shows Details, From (with the mpsc/watch label), To (with the Event::TierHealth label), As written, primary wires and dimmed nodes. The CSS reads `--primary` for hot wires, arrowheads and the selected node. |
| 5 | MP6-02: thin graphs fall back to the lifted figure with a quiet "Shown as drawn" chip. Drawn figures have a toggle. | VERIFIED | The thin verdicts are tested for 10 fixtures. `sp-v1-03-light.png` shows the quiet chip, "This figure keeps the author's layout." and the lifted figure. The e2e toggles to 23 lifted cards and back. `report.json` gives `drawn:false` for sp-v1-03, sp-p03, lb-v1-01, lb-v1-03 and lb-v1.1-05. |
| 6 | MP6-08: only theme tokens and tones; squared corners; light and dark both read | VERIFIED | `research-view-contract`, `token-guard`, `class-vocabulary` and `css-source-order` are green in the full suite. The colour grep above found no destructive or warning token. The dark PNGs (`lab-v1-02`, `sp-02`) read cleanly with no invented hue. |
| 7 | MP6-09: side-by-side PNGs exist for the sketch diagrams, dark variants, the selected pair and the wider corpus, and deviations are fixed or recorded | VERIFIED | 17 PNGs plus `report.json` are in `test/e2e/screenshots/mp6/`. The 8 sketch diagrams (light), the 4 dark, the selected pair and the 4 wider-corpus diagrams are all present. The SUMMARY records the deviations it left in place, and I saw the same ones in the PNGs. |
| 8 | MP6-10: tests, typecheck, lint and the narrow e2e pass; dist rebuilt; service restarted | VERIFIED | See the table above. |

## Anti-patterns and deviations (none block)

- The "Read just now" sticky bar overlaps the top-right of the captured frames. This is page chrome in the screenshots, not a diagram defect. In the selected-pair PNG it also hides the panel's Close button.
- Client lane in labelore v1.0/02 wraps 2x2 rather than the sketch's single row (the width cap). Recorded in the SUMMARY.
- The layout starts at the 940 default until the ResizeObserver fires, so there is a relayout flash on first load. Recorded in the SUMMARY.
- v1.0/04 wires cross other lanes' nodes, as in the sketch's own B. Recorded in the SUMMARY.
- `--figure-lane` is 42% against the plan's 40%, and storage health's node width at a 940 budget is 140 against the plan's 141. Both are recorded in the SUMMARY and are consistent with the guard tests.

## Requirements

MP6-01 to MP6-10 are all covered by the truths above. None is orphaned.
