---
sketch: 037
name: research-pitfall-tables
question: "On the Pitfalls panel (035 A, shipped), how should the Performance traps, Security mistakes and UX pitfalls tables show, between the critical pitfalls and the checklist?"
winner: "B"
tags: [research, pitfalls, performance, security, ux]
---

# Sketch 037: Performance, security and UX on the Pitfalls panel

## Design Question
The Pitfalls panel shows the critical pitfalls and the "Looks done but isn't" checklist. The user
wants the Performance Traps, Security Mistakes and UX Pitfalls tables too. They are placed where
the file puts them, after the critical pitfalls and before the checklist. Should each table keep its
own shape, or should the three read as one section?

## How to View
open .planning/sketches/037-research-pitfall-tables/index.html

It opens on the Pitfalls spine. Scroll past the critical pitfalls. Project switches between
Cinedise Portal (7 traps, 8 mistakes, 8 UX pitfalls) and Labelore (3, 3 and 5, plus a lead
paragraph on Security).

## Data
`traps-data.js` comes from `gen-data.mjs`, which reads each PITFALLS.md: the lead paragraph, the
table header and its rows. Each column's role comes from its header:
- **The consequence:** Symptoms / Risk / User impact.
- **The fix:** Prevention / Better approach.
- **When it breaks:** performance only.

Cells show as written, so tool names like "ffmpeg" stay lower-case. `pit-data.js` is 035's data,
unchanged. Both projects use the template's headers exactly. A table with other headers still
works: an unrecognised column shows as a labelled field when a row opens.

## Variants
- **A: Three ledgers.** Three sections, each shaped by what its table is about:
  - **Performance:** the trap and its symptom, beside "When it breaks" behind a primary edge.
    Prevention appears on click.
  - **Security:** the mistake beside its risk. Prevention appears on click.
  - **UX:** swaps (the pitfall struck through → the better approach). User impact appears on click.
- **B: Kind switch + swaps.** One "Performance, security and UX" section with a three-way switch
  showing big counts (as in Features). Every kind reads the same way: the mistake struck through →
  its fix. Everything else appears on click.
- **C: Board + inspector.** The three tables side by side as columns of cards, each card the name
  plus its consequence. A card opens an inspector below with every field, the fix labelled in
  primary. On a phone, a chip row picks the column.

## What to Look For
- Three sections (A) or one (B, C)? The panel already has two big sections.
- Is it right that each kind leads with something different in A (when / risk / fix), or should
  every kind lead with the fix, as in B?
- Cinedise's 23 rows: does C's board make that easy to scan, or is it busy?

## Winner
**B: Kind switch + swaps.** Build it. User: "B seems right".
- One "Performance, security and UX" section between the critical pitfalls and the checklist.
  Its tally reads "23 more to avoid".
- A three-way switch with big counts (07 Performance traps · 08 Security mistakes · 08 UX pitfalls).
  The chosen kind is tinted, with its number in primary. A kind with no table is left out.
- The chosen table's lead paragraph sits under the switch when it has one.
- A key row of mono column labels (the table's first header, e.g. Mistake, and its fix header,
  Prevention or Better approach) heads uniform swap rows: number, the item struck through, →, the fix.
- Clicking a row opens its other fields under mono labels: Symptoms and When it breaks, Risk, or
  User impact.
- Cells show as written. On phones the key row and arrow drop, the fix sits under the item, and the
  counts shrink.
