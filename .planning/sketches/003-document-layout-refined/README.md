---
sketch: 003
name: document-layout-refined
question: "Keeping sketch 002 A's building blocks, which layout reads as a document page rather than a copy of the dashboard?"
winner: null
tags: [documents, layout, per-type-views, refinement]
---

# Sketch 003: Document layout, refined from A

## Design Question
Sketch 002 picked A: the dashboard's building blocks (accent "worth knowing" card, big numbers,
boxed panels, eyebrows, chips) in the five-slot pattern. But A copied the dashboard's layout too, so
a document page was hard to tell apart from the dashboard. These three keep every part and change
only the arrangement. All three drop the giant hero title for a smaller one.

Same real content as 002 (studio-portal phase 04 discussion log and plan 04-06).

## How to View
https://cinedise.persian-elnath.ts.net/sketches/003-document-layout-refined/
(locally: http://127.0.0.1:4174/003-document-layout-refined/)

Tabs include "Today" and "A from 002" for comparison. Toolbar: document, theme, width.

## Variants
- **A1: Rail** — short masthead, then a left column holding the "worth knowing" card, the big
  number with a count list under it, and the side lists; the right column is one boxed panel per
  topic/section. Reads like a document with a summary sidebar.
- **A2: Sheet** — the header, big number, "worth knowing" card and a facts list all sit in one
  bordered cover sheet split into three cells; below, sections are numbered 01, 02, 03 in a left
  margin, like chapters. Most "document"-like.
- **A3: Tabs** — title on the left with a stacked column of numbers on the right, a full-width
  "worth knowing" strip, then one tab per topic/section; only the chosen section shows, with the
  side lists beside it. Shortest page for long documents.

## What to Look For
- Does it still feel like Labelore, but clearly not the dashboard?
- Long documents: A1 and A2 put everything on one scrolling page; A3 hides all but one section.
- Plan: can you find what's blocking and which tasks are done without scrolling?
- Phone: A1 moves the rail above the content; A2 stacks the sheet cells; A3's tabs scroll sideways.

## Trade-offs
| | Distinct from dashboard | Long documents | Build cost | Catch |
|---|---|---|---|---|
| A1 | Clear (sidebar layout) | Good | Low: reuses panel CSS | Rail content is out of view once you scroll down |
| A2 | Strongest (cover sheet + chapters) | Good | Medium: new sheet + numbered sections | Cover sheet is tall on phones |
| A3 | Clear (tabs) | Best (one section at a time) | Medium: tab state per document | Search-on-page (Ctrl+F) can't see hidden tabs |
