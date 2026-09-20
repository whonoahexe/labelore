---
sketch: 001
name: trace-row-layout
question: "How should a trace-row be laid out so rhythm, phase placement, the two-column split and scannability all improve?"
winner: "C"
tags: [traceability, layout, list-row]
---

# Sketch 001: Trace-row layout

## Design Question
The current row (ID / text / Phase block on the left, unlabeled chips on the right) has uneven
vertical rhythm, a Phase block that reads as an afterthought, a right column detached from the
phase name it describes, and nothing lining up row to row. Which layout fixes all four?

## How to View
open .planning/sketches/001-trace-row-layout/index.html

Toolbar (bottom right): Light/Dark, Phone/Tablet/Desktop width, Mixed/Stress data. Widths use
container queries, so the Phone button really exercises the narrow layout.

## Variants
- **Current** — the shipped layout, for reference.
- **A: Ledger** — one aligned grid; header row once; each phase name shares a line with its own chip; chips share a right edge. Closest to current markup, mostly CSS.
- **B: Card + footer** — single column; ID and flags on top, text, then a ruled "Covered by" strip. Left rule takes the row's worst tone.
- **C: Status rail** — fixed left rail with one rollup chip; phases become quiet lines under the text with a tone square.

## What to Look For
- Scan straight down the list in each variant: can you find the odd one out (mismatch, uncovered, no-directory) without reading?
- Switch to **Stress**: long text, four covering phases, a phase name too long for one line, an unresolved reference.
- Switch to **Phone**: which variant needs the least reflow?
- Dark mode: chip tones and the B left rule against the dark card.

## Trade-offs
| | Change size | Scan speed | Narrow screens | Catch |
|---|---|---|---|---|
| A | CSS + minor markup | Good | Loses column header, stacks | Multi-phase rows get tall in the coverage column |
| B | Markup restructure | Good (colour column) | Best | Rows are taller; fewer per screen |
| C | Markup + new derived field | Best | Rail moves inline | Needs a "worst phase" rollup the page does not compute today; hides per-phase chips |
