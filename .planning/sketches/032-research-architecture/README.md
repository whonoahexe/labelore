---
sketch: 032
name: research-architecture
question: "Inside 031's E frame, how should the Architecture panel show the system overview, the project structure (no rationale), the anti-patterns and the suggested build order as a graph?"
winner: "A"
tags: [research, architecture, diagram, tree, anti-patterns, build-order, graph, dag]
---

# Sketch 032: Architecture panel

## Design Question
The Architecture spine of the Research page (031, E), opened. The user's brief: the system overview
as the diagram designed for the phase research page, the recommended project structure without the
rationale, the anti-patterns, and the suggested build order as a graph.

## How to View
open .planning/sketches/032-research-architecture/index.html

It opens on Architecture; the other spines still work. Use Project to switch between Cinedise
Portal (10 anti-patterns, a 12-step build order across 3 tracks) and Labelore (3, and 4 steps A–D).

## Data
`data.js` comes from `gen-data.mjs` (it takes the Cinedise research directory as an argument). The
frame and the system-overview graph and lane layout come from 031's `data.js`.
- **Project structure:** the fenced tree under "Recommended Project Structure", parsed by the shipped
  `src/rendering/ascii-tree.ts` (folder chains collapsed, `# comments` as notes, NEW/MOD badges).
  The Structure Rationale is dropped, and so is the section's lead paragraph.
- **Anti-patterns:** both spellings: "What people do / Why it's wrong / Do this instead"
  (Labelore) and "Why wrong / Instead" (Cinedise).
- **Build order:** Cinedise's Step / Deliverable / Depends on / Notes table, with short names taken
  from its ASCII graph. Labelore's "### Phase A — name" prose, with prerequisites read from the
  sentences that say "depends" or "needs" ("Phases A–C" expands to A, B, C).

## The same in every variant
- **System overview:** the shipped lane diagram (031's hand-built graph, laid out by
  `layoutLanes`). Click a node for its details.
- **Project structure:** the shipped clean tree, with folding folders, notes in a second column,
  new/mod chips, and "Changed only · 20" when the tree marks changes.
- **Build-order graph:** a step's column is its longest chain of prerequisites. Wires are drawn on
  the transitive reduction, so A→D is not drawn when A→B→D already says it. Within a column, steps
  are ordered by the mean row of what they wait for, to cut crossings. Clicking a step lights its
  wires and opens a panel: what it delivers, Waits for, Unlocks (chips that select), notes, and
  non-step prerequisites ("Also waits for: spike S1"). A "Roadmap grouping" / "Why this order"
  toggle sits underneath.

## Variants
- **A: Swaps + layered graph.** Anti-patterns as one row each: the mistake struck through → what to
  do instead. Click a row for "What people do" / "Why it's wrong". The graph is plain layers,
  left to right.
- **B: Cards + tracks.** Anti-patterns as Don't / Instead cards with a Why toggle. The graph has one
  swimlane per track from the step-id prefix (Hardening H, Backend B, Interface U; Labelore is
  one "Phases" lane), so parallel work reads as parallel lanes.
- **C: One at a time + waves.** One anti-pattern at a time: a big number, the mistake struck
  through, → instead, and why. A strip of numbered squares and ← → move between them. The graph
  shades its columns as waves ("Start here", "Then · 2", …).

## What to Look For
- Cinedise's 10 anti-patterns: list (A), cards (B) or one at a time (C)?
- The 12-step graph: are tracks (B) worth the extra height, or are layers (A/C) clearer?
- Is the step panel the right amount of detail?

## Winner
**A: Swaps + layered graph.** Build it. User: "oh wow A is perfect".
- Anti-patterns are one row each: number, the mistake struck through, →, what to do instead. Click
  a row to open "What people do" (when the file has it) and "Why it's wrong" in mono labels.
- The build order is a layered left-to-right DAG. A step's column is its longest chain of
  prerequisites. Wires are drawn on the transitive reduction, and steps in a column are ordered by
  the mean row of their prerequisites. Node width comes from the panel width (168–250px), and long
  names get a third line. Clicking a step lights its wires and opens a panel: what it delivers,
  Waits for / Unlocks chips, notes, and "Also waits for" for non-step prerequisites.
- The system overview (shipped lane diagram) and the project structure (shipped clean tree,
  rationale dropped) sit above them, as in every variant.
- Known for the build: the overview graph is hand-built here; the shipped ASCII extractor still
  can't read either project's system overview.
