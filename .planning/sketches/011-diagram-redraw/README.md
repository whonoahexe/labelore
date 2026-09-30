---
sketch: 011
name: diagram-redraw
question: "Can the architecture diagram be redrawn from the author's ASCII (real cards, SVG connectors, the author's arrangement kept) so every RESEARCH diagram looks designed, and what happens when it can't?"
winner: "none"
tags: [documents, per-type-views, research, figures, diagram, redraw]
---

# Sketch 011: Diagram redraw

## Design Question
Sketch 009 B ("Lifted") keeps the author's ASCII as the drawing and puts cards behind it. That reads
well only when the ASCII is already clean. Most studio-portal diagrams are dense, ragged and full of
prose, so the lifted version still looks like annotated ASCII. This sketch redraws the diagram
instead, while keeping the author's arrangement as the skeleton.

## How to View
http://cinedise:4174/011-diagram-redraw/ (or through the sketch quick tunnel)

At the top: **A / B / C** variants. The chips switch between the 8 diagrams. The frame bar has
**Compact / Expanded** detail, **Source** (the author's ASCII below the figure for comparison) and
**Shown as drawn** (forces the fallback). In compact mode, click a card to open its details.

## Grounded in the real model
`data.js` is the shipped `liftDiagram()` output (src/rendering/ascii-lift.ts), produced by
`gen-data.ts`. Nothing in the sketch is hand-placed. It uses the model's cards and frames, traces
every line and arrow glyph into SVG, and places each card's title and detail lines on the rows they
came from.

## Variants
- **A: Faithful redraw.** The author's grid, with real bordered cards, SVG wires (half-segments
  per glyph, reaching into card edges) and arrowheads in primary. Rows get real heights: titles tall,
  wires short, blank rows almost gone. Compact mode collapses detail rows, so the diagram shrinks and
  each card shows `+N`. A note on a collapsed row becomes an `i` marker. A box around other cards
  becomes a dashed group, with its wires drawn inside it.
- **B: Tidy grid + margin notes.** Same as A, plus whitespace-only columns squashed, horizontal
  arrows given room, and every note moved to a numbered margin list. Hovering a number highlights
  its partner.
- **C: Flow rail.** The author's positions are dropped. Cards stack into tiers on one spine, side
  by side when they share rows, with notes as labels on the joins. Calmest, least faithful: fan-outs
  and cross-links are lost.

## Fallback
Every diagram gets a confidence score: how much of the author's text landed in cards, and how many
stray line pieces (ragged edges and stubs that touch no card and carry no arrow) had to be dropped.
Low confidence, or a model rejection, shows the figure **as drawn** (009 A's framed ASCII) with a
quiet `Shown as drawn` chip and a `Redraw anyway` button. All 8 diagrams currently pass.

## What to Look For
- **v1.0 · 01 identity:** 009 couldn't handle this one. Here it becomes a dashed AUTH MIDDLEWARE
  group with the fan-out, the ◄──► check and the SQLite link drawn inside it.
- **Compact vs Expanded on storage-health and roles:** is the shape-first default right, and is `+N`
  a clear enough affordance?
- **v2.0 · 02 roles and 04 bulk archive:** stacked step cards joined by short arrows. Is the gap
  between them enough?
- **B's margin notes vs A's in-place notes:** does moving notes out help, or break the link between
  a note and its wire?
- **C:** is losing the arrangement acceptable in exchange for calm?
