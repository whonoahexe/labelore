---
sketch: 004
name: sheet-refined
question: "How should A2's cover sheet and numbered chapters handle phones, long documents and a third document type?"
winner: "B3"
tags: [documents, layout, per-type-views, refinement, navigation]
---

# Sketch 004: Cover sheet, refined

## Design Question
Sketch 003 picked A2: a cover sheet (title, big number, "worth knowing" box, facts) and numbered
chapters. Three open problems: the cover gets tall on phones, long documents have no way to jump
between chapters, and it had only been tried on two document types. This round keeps A2 and tries
three answers. A **verification report** is added as a third real document (studio-portal
`04-VERIFICATION.md`: 19/39 verified, 7 gaps, 3 checks that need a human) to test the layout on a
type it wasn't designed around.

## How to View
https://cinedise.persian-elnath.ts.net/sketches/004-sheet-refined/
(locally: http://127.0.0.1:4174/004-sheet-refined/)

Toolbar: Discussion log / Plan / Verification, theme, width.

## Variants
- **A2 from 003** — reference.
- **B1: Compact cover** — the cover's three cells are shorter (smaller number, tighter padding); on
  phones the facts fold into a "Facts" disclosure so the cover is about half as tall.
- **B2: Chapter index** — the facts become one line under the title; their cell becomes a clickable
  "In this document" chapter list with counts. Once the cover scrolls away, a slim bar pins to the
  top showing the chapter you're in ("02 · Gaps to close") and the View/Source switch.
- **B3: Folded chapters** — B2's index and bar, plus each chapter collapses to one row with a
  summary ("1 verified · 3 failed · 1 uncertain", "4 chosen · 1 by Claude"). Expand one or all.

Every chapter heading now carries that summary line in all three variants.

## What to Look For
- Verification: do the failed items and the three human checks stand out from the first screen?
- Long documents: B2's index + pinned bar vs B3's folding.
- Phone: how tall is the cover before the first chapter starts?

## Trade-offs
| | Phone cover | Long documents | Build cost | Catch |
|---|---|---|---|---|
| B1 | Shortest | Same as A2 | Low | No navigation help |
| B2 | Medium | Good: index + "where am I" bar | Medium: scroll tracking | Replaces today's outline rail — a real change |
| B3 | Medium | Best: fold what you don't need | Medium+ | Find-on-page misses folded chapters; one click more to read |

## Outcome
**Winner: B3 (Folded chapters).** The document-page pattern going forward:

1. **Cover sheet** — one bordered box: eyebrow (kind · context), smaller title, one-line lede, a
   one-line facts row, status chip + View/Source; below it three cells: big number with count pills,
   the accent-topped "worth knowing" box with a jump link, and a clickable chapter index with counts.
2. **Pinned chapter bar** — appears once the cover scrolls away; shows the current chapter number and
   name, the document title, and View/Source.
3. **Folded chapters** — each chapter is a bordered row: big muted number, title, roll-up chips
   summarising its items by state, chevron. Expand one, or all. Jumping (index, glance link) opens
   the target chapter.
4. **Items** — ref, title, state chip (plus the chosen answer for discussion logs), and a detail
   link whose wording fits the type ("2 other options", "Why it failed · what to fix", "How to run it").
5. **Last chapter** is always "Also in this document" (the side lists as small panels).
