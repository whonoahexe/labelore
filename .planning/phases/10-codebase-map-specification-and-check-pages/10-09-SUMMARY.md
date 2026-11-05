---
phase: 10-codebase-map-specification-and-check-pages
plan: 09
subsystem: ui-sketches
tags: [sketch, codebase, architecture, structure, concerns, risk-piles, reuse]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-06 winner (042 A, Rail + column frame), 10-03 fresh maps and the concern-counting rule, 10-24 summary
provides:
  - sketch 044 winner E (Risk piles) for the Concerns panel, with "Most dangerous" kept as an accent ring
  - the 043 decision: reuse the shipped RESEARCH figures (lane diagram, clean tree, swaps) for Architecture and Structure, no new 043 variant
  - the mapping from each 043 part to the shipped component 10-12 builds against, and the parts that have none
affects: [10-12 codebase panels build, 10-08 Codebase page frame]

actuals:
  tokens: 95000
  tasks: 3
  commits: 4
plan_head_before: a413e8774b0b8281063d34132de6341682dd77ae
plan_head_after: c8e4d0d842029d6facc920ee75e30a74d6b7e527

key-files:
  created:
    - .planning/sketches/043-codebase-architecture-structure/index.html
    - .planning/sketches/043-codebase-architecture-structure/README.md
    - .planning/sketches/044-codebase-concerns/index.html
    - .planning/sketches/044-codebase-concerns/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "044 winner E, Risk piles: nine columns, one segment per concern, Security first; no synthesis"
  - "Most dangerous: kept, as the accent ring on the mark in E (the first Security item, else the first Tech Debt item), no sentence and no pull line"
  - "043 winner: reuse. Architecture and Structure use the shipped lane diagram (012 B), clean-list tree (009 B) and anti-pattern swaps (032 A) inside 042 A's frame; none of the 043 variants is built"

requirements-completed: [VIEW-13]

duration: two rounds of sketching plus the checkpoint answer
completed: 2026-11-05
---

# Phase 10 Plan 09: Sketches 043 and 044 and the panel choices Summary

**The Concerns panel will be built as sketch 044 E (nine piles of one segment per concern, Security first, the most dangerous item marked by an accent ring), and the Architecture and Structure panels will reuse the figures already shipped for the Research page instead of a new 043 design.**

## Rounds

| Round | What was shown | Result |
|-------|----------------|--------|
| 1 | 043 A Diagram first, B Lens switch, C Map + legend; 044 A Count strip, B Count grid, C Gutter ledger (commits d3c249b, df57a56) | Rejected by the user: "both the sketches have no creativity in them. plain boring wall of texts" |
| 2 | Visual-first D, E, F for both sketches (commit abae7b8): 043 D boxes and arrows + treemap, E territory bands, F metro lines + sunburst; 044 D hotspots on the codebase treemap, E risk piles, F shape chart | 044 E chosen ("for 44, E seems fine"); 043 not chosen, the user asked to keep the shipped architecture diagrams ("keep our original architecture diagrams that we have planned before, we already have a component for that") |

Both rounds stay in the two sketch folders as the record (round 1 as the tabs "Round 1 A/B/C", round 2 as D, E, F). Each README has a "Where each mark comes from" table for round 2.

## Winners

- **Sketch 044: E, Risk piles.** README `winner: "E"`, the E tab is marked "★ Selected", MANIFEST row 044 reads "E Risk piles (build it)". No synthesis.
- **Most dangerous: kept.** E draws it as an accent ring on the mark (the first Security item, else the first Tech Debt item) with a key in the picture's foot; no sentence, no pull line. F's callout with the title is not built.
- **Sketch 043: reuse, no new variant.** README `winner: "synthesis"` (the plan's acceptance grep accepts A, B, C or synthesis; the Winner section states the real decision, reuse). MANIFEST row 043 reads "Reuse — shipped lane diagram (012 B) + clean tree (009 B) + swaps (032 A) (build it)". No 043 tab is marked selected.

## What 10-12 builds against (043 reuse mapping, verified to exist at this commit)

| Part of the panel | Shipped component and exports |
|-------------------|-------------------------------|
| System Overview diagram | `LaneDiagramFigure({ text, title, caption })` in `src/web/components/lane-diagram.tsx` (lanes by kind; its own "Shown as drawn" chip and fallback `AsDrawn`, which shows `LiftedDiagram` from `src/web/components/lifted-diagram.tsx`; `LaneDiagram`, `NodeDetails` are also exported); frame `FigureFrame` in `src/web/components/figure-frame.tsx` |
| Choosing diagram, tree or plain from a fence | `FencedFigure({ text, title, caption })`, `FigureFor`, `FencedCode` in `src/web/components/fenced-figure.tsx`; detector `classifyFence` in `src/rendering/figure-detect.ts`; a figure the lift rejects falls back to `PlainDiagram` in the same frame |
| Directory Layout titled "Directory structure" | `CleanTreeFigure({ text, title, caption })` and `CleanTree` in `src/web/components/clean-tree.tsx`; model `parseTree`, `collapseFolderChains`, `treeCounts` in `src/rendering/ascii-tree.ts` |
| Anti-Patterns as swaps | `SwapRows({ items })` in `src/web/pages/research-atoms.tsx`; items are `SwapItem { bad, good, details: [{ label, text }] }` from `src/presentation/project-research-panels.ts` |

**No shipped component** (they render as the 042 frame's plain or keyed sections unless 10-12's plan says otherwise): the Component Responsibilities table, Entry Points, Pattern Overview, "Where to add new code" (the lookup), Directory Purposes, and the plain sections (Layers, Data Flow, Key Abstractions, Constraints, Error Handling, Cross-Cutting, Key File Locations, Naming Conventions, Special Directories). Nothing from rounds 1 and 2 is a design for them.

## Open items for 10-12

1. **Lane diagram on a codebase ARCHITECTURE diagram.** `LaneDiagramFigure` takes raw fence text, not a RESEARCH-shaped view model, so it can be handed Labelore's System Overview as is. Checked by running the shipped detector and lift on the committed maps: Labelore's diagram classifies as `diagram`, lifts to 7 nodes and `buildDiagramGraph` reports it not thin (quality 0.79); the Tidemark fixture lifts to 3 nodes, not thin (quality 0.77); Labelore's Directory Layout classifies as `tree`. What is NOT checked, and is open: whether the lane diagram puts each Labelore box in a sensible lane, because its lane kinds (`client`, `edge`, `service`, `worker`, `channel`, `data`, `external`) come from keyword lists in `src/rendering/ascii-graph.ts` written for RESEARCH diagrams. If the lanes read wrong for a codebase diagram, the figure's "Shown as drawn" fallback (the lifted text) is always available. Nothing was designed around this.
2. **`SwapRows` takes a RESEARCH view model type.** The component is generic (bad, good, details) but its prop type lives in `src/presentation/project-research-panels.ts`. 10-12 either maps the Anti-Patterns subsections (What happens, Why it's wrong, Do this instead; one Tidemark-style subsection may lack labels) into `SwapItem`, or the plan moves the type; the UI-SPEC says the swaps keep the 032 treatment.
3. **Concern placement is a build decision, not a 043 matter.** 044 E needs the concern counts and each concern's fields from 10-05's reader; the Priority tint reads the concern's `Priority` field when stated, and the section squares follow UI-SPEC's Tone mapping (Security `in-flight` above zero, `complete` at zero; others neutral, dashed at zero).

## Deviations from Plan

### Auto-fixed Issues

None.

### Judgement calls

**1. Plan's winner acceptance grep predates round 2.** The Task 3 acceptance line `grep -E '^winner: "?(A|B|C|synthesis)'` cannot match `winner: "E"` (round 2 introduced D, E and F). 044's README records `winner: "E"` as the user chose; 043's records `synthesis` with the reuse decision in its Winner section. The MANIFEST grep `^\| (043|044) \|.*\(build it\)` prints two lines.

**2. Round 2 was added before the checkpoint was resolved.** The user rejected round 1, so Task 3 was re-presented with visual-first D, E, F (commit abae7b8) before the final answer. This went beyond the plan's three variants per sketch and is recorded under "Rounds" above.

## Verification

- Both sketches pass the plan's verify commands (12 headless-Chrome screenshots each, the required-text checks) and the copy checks (no cinedise, duet or studio-portal; `data-tone="destructive"` count 0 in 044; no `oklch(`, hex or `destructive` literal in either file).
- Swept all variants, states, both themes, 1280 and 390: no sideways page scroll, no console errors; four font sizes in every variant.
- Screenshots (round 1 and round 2) are in the session scratchpad (`sketch-043-044/` and `sketch-043-044-r2/`), not committed.

## Known Stubs

None. This plan builds sketches only.

## Threat Flags

None. No application code changed; the sketches hold Labelore's own public map text, the made-up Tidemark fixture and invented Tech Debt items in Labelore's own words (threat T-10-16 mitigated by the greps above and the user's review).

## Self-Check: PASSED

- 043 and 044 `index.html` and `README.md` and MANIFEST rows 043 and 044: found
- Commits d3c249b, df57a56, abae7b8, c8e4d0d on this branch: found
- README winners: 043 `synthesis` (reuse), 044 `E`; MANIFEST "(build it)" on both rows: found
