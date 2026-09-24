---
sketch: 007
name: context-ideas
question: "How should the CONTEXT brief's Specific ideas and Deferred show rules as rules, and where parked ideas went and why?"
winner: "C"
tags: [documents, per-type-views, context, ideas, deferred]
---

# Sketch 007: Context ideas

## Design Question
The shipped `.view-context-ideas` shows Specific ideas and Deferred as two identical panels.
Items are cut to 2 lines, the title/text split is inconsistent, and the parts that matter are
buried in the grey text: which specifics are hard rules, and for each deferred item, what
happened to it (declined, passed over, handed on), which decision it came from, where it went
and when to revisit it. How should this section look instead?

## How to View
open .planning/sketches/007-context-ideas/index.html
(or https://cinedise.persian-elnath.ts.net/sketches/007-context-ideas/)

Toolbar: Doc switches between studio-portal P1 (3 specifics, 5 deferred, mostly "passed over")
and P3 (5 specifics, 10 deferred, mostly "declined option + revisit if…").

## Variants
- **A: Refined panels** — the lowest-effort option. The same two side-by-side panels with scope-block labels. Specifics shown in full; Deferred rows get a title, a tag for what happened, a → destination, and a More toggle for long text.
- **B: Guidance + register** — a full-width "Standing guidance" band (numbered rules + "How the user leans" quote + notes), then Deferred as a table: Idea / What happened + From / Goes to or Revisit if, filterable by what happened.
- **C: Grouped by fate** — Specifics tagged RULE / LEANING / NOTE in one column; Deferred grouped by what happened (Handed on, Declined options, Passed over, Out of scope, Carried forward) in collapsible groups, each with a "Revisit if" line.

## Winner
**C: Grouped by fate** — build it. Specifics tagged RULE / LEANING / NOTE; Deferred grouped by what happened, each group collapsible with a one-line note, each item with its source decision or destination and a "Revisit if" line.

## What to Look For
- Does the P3 doc (10 deferred items, 8 of them declined) stay readable in each variant?
- Is splitting specifics into kinds (rule / leaning / note) worth it, or is bold-lead + full text enough?
- "Revisit if" and "→ Phase 3 · ADMIN-03" are the new information. Which placement makes them easiest to find?

## Data note
Item text is verbatim from studio-portal's 01/03-CONTEXT.md. The structured fields (kind,
what happened, from, destination, revisit trigger) are hand-annotated to show what a parser
would have to extract; `context-brief.ts` extracts none of them today. B and C need that
parser work; A needs it only for the what-happened tag and the destination.
