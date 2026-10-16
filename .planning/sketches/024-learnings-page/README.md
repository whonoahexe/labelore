---
sketch: 024
name: learnings-page
question: "How should a LEARNINGS page serve finding a reusable takeaway, reading the phase as a retrospective, and seeing what has graduated into project docs?"
winner: "E"
tags: [documents, per-type-views, learnings, decisions, lessons, patterns, surprises, layout]
---

# Sketch 024: LEARNINGS page

## Design Question
A phase's LEARNINGS holds 30–40 items in four kinds: decisions, lessons, patterns, surprises. Which
of three jobs should its page be built around?

## How to View
open .planning/sketches/024-learnings-page/index.html (`?v=a|b|c&doc=sp01|syn|fx|fxp&theme=light`)

## Intake
The user asked to see all three approaches, then iterate on one:
- finding a reusable takeaway
- reading the phase as a retrospective
- deciding what has graduated into project docs

## Data
`gen-data.mjs` reads headed entries in the template shape:
- `### title`, then the body
- the detail field for its kind: **Rationale:** (decisions), **Context:** (lessons), **When to
  use:** (patterns) or **Impact:** (surprises)
- **Source:** (several artifacts, each with an optional "(note)")
- an optional **Graduated:** `target:date`

It also reads plain list items, which the fixtures use.

The files:
- **sp01:** studio-portal phase 1, the only substantial real file. 40 items from 10 artifacts.
- **syn:** a synthetic labelore-style phase 5 with 11 items, 3 of them graduated, and
  `missing_artifacts: [05-UAT.md]`. It's the only file that shows graduation.
- **fx / fxp:** the dense fixture's phase-level and project-level files, written as list items
  with no detail fields.

## Variants
- **A: Finder.** Four big count tiles act as kind filters: click one to see only that kind, click
  again to bring the rest back.
  - **Find box:** live search with the matching words highlighted, a "N of M" count, and "/" to
    focus it.
  - **"From" chips:** filter by source artifact.
  - **Results:** a grid of cards (kind, title, two-line body). A card opens across the full row to
    show the body, the detail field, its sources, any graduation, and a Copy button.
- **B: Retrospective.** A one-sentence lede ("40 learnings from this phase: 14 decisions…, drawn
  from 10 artifacts").
  - **Source trail:** a "where they came from" bar sized by artifact. Picking a segment highlights
    that artifact's learnings.
  - **Chapters:** What we decided / What we learned the hard way / What we'll reuse / What
    surprised us. Each entry is numbered, with the title and body on the left and the detail
    field and sources as a side note. The chapter nav sticks to the side.
- **C: Graduation shelf.** A verdict ("3 of 11 learnings graduated into project docs") with a
  graduated-out-of-total bar per kind, plus where the graduated items went (target file × count).
  - **The shelf:** one row per kind, one tile per item. Graduated tiles are filled and name their
    target; the rest are dashed and say "Only here". Filters: All / Only here / Graduated.
  - **Picking a tile** opens its full text under that row.
- **Shared:** a "missing artifacts" note under the title, the usual header, and the back-matter
  chip row.

## Round 2: three refinements of B
B was picked. Its source bar now **filters** instead of highlighting: picking an artifact shows
only its learnings, in every chapter, and hides the rest. Chapters with nothing from that artifact
drop out; the others show "N of M". A "Showing the N learnings from X · Show all" line sits under
the bar. The same filter works in D, E and F.
- **D: Source rail.** The source list moves into the sticky left rail ("All artifacts 40", then
  each artifact with its count), with the chapter jumps under it. The bar is gone and the chapters
  stack.
- **E: Chapter tabs.** The bar stays on top. Below it are tabs (01 What we decided 14 · 02 What we
  learned… 9 · …) showing one chapter at a time. Tabs left empty by the filter are disabled.
- **F: Folded entries.** B's chapters, but each entry is a one-line row (number, title, source).
  Clicking a row unfolds the full entry in place, with a fold control. "Unfold everything / Fold
  everything" sits in the chapter nav.

## Winner
**E: Chapter tabs**, built from B. The source bar's segments are always labelled with name and
count. They grow by count but are never narrower than their label, and wrap when out of room, so
single-learning artifacts (02-PLAN, REVIEW-FIX, REVIEW, VERIFICATION) are no longer empty boxes.
Picking a segment filters every chapter to that artifact.

## What to Look For
- **sp01 (40 items):** which layout gets you to the one item you need fastest (A), reads best end
  to end (B), or makes "is this captured anywhere else?" obvious (C)?
- **fx / fxp (sparse list items):** does each layout still hold up?
