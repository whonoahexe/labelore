---
sketch: 036
name: research-scaling
question: "On the Architecture panel (032 A, shipped), how should Scaling considerations show the scale tiers, what each concern needs at each size, and what breaks first?"
winner: "A"
tags: [research, architecture, scaling, bottlenecks, matrix]
---

# Sketch 036: Scaling considerations

## Design Question
The Architecture panel gains a Scaling considerations section, placed where the file puts it:
after Project structure, before Anti-patterns. What should it lead with: what breaks first, or what
changes as the project grows? And can one view tie the two together?

## How to View
open .planning/sketches/036-research-scaling/index.html

It opens on the Architecture spine. Scroll past the project structure. In the sketch toolbar,
**Project** switches between Cinedise Portal and Labelore. **Scaling** swaps in Protocol-to-rules,
whose file has no Scaling Priorities list.

## Data
`scale-data.js` comes from `gen-data.mjs`, which reads three real ARCHITECTURE.md files:
- **Labelore:** a two-column table (Scale | Adjustments): 3 tiers, one adjustment each. The priorities
  are "First real bottleneck, if any" and "Not a bottleneck at this project's actual scale".
- **Cinedise:** a lead sentence, then 5 concerns × 3 tiers (Today, Per shoot, Per year), and two
  bottlenecks.
- **Protocol-to-rules:** a lead sentence, 5 concerns × 3 document sizes, and no priorities.

Tier names are split from their parentheses ("Per shoot (hundreds of GB)" → name + quiet second
line). A cell reads quiet when it only says nothing changes ("Low", "Unchanged", "no adjustments
needed"), and "n/a" reads as "Doesn't apply". Each bottleneck is split into problem and fix at
"— mitigated" or ". Mitigation". It is pinned on the cell that shares at least two word stems with
it. Cinedise's second bottleneck ("proxy CPU versus responsiveness") matches no cell, so it stays
unpinned. `arch-data.js` is 032's data, unchanged.

## Variants
- **A: Breaks first.** The ranked bottlenecks lead, one row each: a big number, "First to break · at
  Per shoot · Concurrent device I/O", the problem said large, and Fix below. "Not a bottleneck" sits
  in a dashed box. A plain matrix follows ("At each scale"), with the pinned cell marked.
- **B: Growth ruler.** The tiers form a staircase, small to large: each step is taller, shows "Breaks
  here" where a bottleneck bites, and counts "4 of 5 change" against the step below. Picking a step
  opens that tier's concerns, one row each, with Holds / Same as before chips. The bottleneck and its
  fix appear inline on the row where it bites. ← → walk the tiers.
- **C: Pressure map.** The matrix as tiles. Columns are underlined more heavily as scale grows, cells
  that hold go quiet, and "Doesn't apply" cells are dashed. Bottlenecks are numbered chips above,
  pinned to their tile. Clicking a chip or tile opens the cell in full, with its bottleneck and fix.
  On a phone, the matrix becomes a tier chip row.

## What to Look For
- Which should come first: what breaks (A), the growth itself (B), or both on one map (C)?
- Labelore's one-concern table: does each variant still read well with a single row?
- Protocol-to-rules has no bottleneck list. A falls back to the matrix alone. Is that enough?

## Winner
**A: Breaks first.** Build it. User: "A seems right".
- The file's lead sentence, said large, when there is one.
- The ranked bottlenecks lead, one row each: a big number (the first in primary), a mono label
  ("First to break · at {tier} · {concern}" when it's pinned to a cell), the problem said large, and
  a Fix line below.
- "Not a bottleneck" items sit in a dashed box beneath them.
- "At each scale": a plain grid of concerns × scale tiers, with tier names split from their
  parentheses into a quiet second line. Cells that only say nothing changes are muted, "n/a" reads as
  "Doesn't apply", and a pinned bottleneck's cell gets a primary edge and its number. A two-column
  file (Scale | Adjustments) drops the concern column. On phones the grid stacks by concern, with
  the tier named on each cell.
- A file with no priorities list shows the lead and the grid alone.
