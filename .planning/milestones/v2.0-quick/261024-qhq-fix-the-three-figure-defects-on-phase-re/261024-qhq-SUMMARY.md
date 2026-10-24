---
phase: quick-261024-qhq
plan: 01
subsystem: rendering
tags: [figures, ascii-diagram, lanes-figure, research-page]
requires: []
provides:
  - ragged right-border recovery for closed boxes in the diagram lift
  - unboxed start and end labels promoted to nodes in the diagram graph
affects: [every rendered document page with a box diagram, phase Research pages]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - test/rendering/fixtures/lb-v1-01-read-layer-diagram.txt
    - test/rendering/fixtures/sp-v1-02-storage-tiles-mockup-diagram.txt
  modified:
    - src/rendering/ascii-lift.ts
    - src/rendering/ascii-graph.ts
    - src/web/components/lifted-diagram.tsx
    - src/web/styles/globals.css
    - test/rendering/ascii-lift.test.ts
    - test/rendering/ascii-graph.test.ts
    - test/web/lane-diagram.test.ts
    - test/web/research-view-contract.test.ts
    - test/e2e/research-briefing.spec.ts
decisions:
  - "Unboxed start and end labels on a wire count as nodes (the user's locked decision); pointer notes, wire labels and prose beside a diagram stay notes"
status: complete
commits: 1
plan_head_before: a69d05c84d6f8d4f8676c2703ab322468cbcaecf
plan_head_after: f3253b2
completed: 2026-10-24
---

# Quick 261024-qhq: Three figure defects on the phase Research page

The Architecture chapter of a phase Research page now draws its system diagram correctly in both views, and the directory trees in its notes use the full chapter width.

Summary written after the fact, at the v2.0 milestone close, from the plan and commit `f3253b2`. The fix itself landed on 2026-10-24.

## What you now see

- **Shown as drawn:** a box whose right border the author drew further right than the rest, like the CLI box in labelore's own v1.0 Phase 1 research diagram, now widens to fit its longest line. Its title sits inside the card, and the stray vertical bars beside it are gone.
- **The lanes figure:** the same diagram now redraws as lanes, with six nodes: the `.planning` folder on disk, Layer A, Layer B, the CLI, stdout JSON and the Vitest golden-file suite. The unboxed labels at the start and end of a wire count as nodes now.
- **No stray scrollbars:** a figure that fits no longer shows a thin vertical scrollbar inside its body.
- **Research notes:** a figure inside a research note, like the fixtures/test tree under "Directory structure", now spans the chapter, the same width as the `src/` tree above it. The note's prose keeps its narrower reading width.

## What stayed the same

- Every other diagram in the test fixtures lifts and graphs as before, and the sketch golden file is unchanged.
- The one-row sketch rule still holds: a single-row box that overruns its border by 3 or more columns does not widen.
