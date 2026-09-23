---
sketch: 005
name: context-document
question: "Inside the B3 frame, how should a CONTEXT document show its boundary, 15–21 decisions, open questions, ideas and back matter without overwhelming?"
winner: "none"
tags: [documents, per-type-views, context, b3]
---

# Sketch 005: Context document

## Design Question
Sketch 004's B3 frame (cover sheet, chapter index, pinned chapter bar, folded chapters) applied to
CONTEXT.md. The frame itself isn't in question; what goes inside it is:

- The phase boundary: a short summary, what's in scope, and what's out, with the "do not drift into
  these" warning kept quiet.
- 15–21 decisions, each with three parts (tag, summary, detail) plus an optional reversibility line.
- Open questions for the researcher, which have the same three parts and often block a specific
  decision.
- Specific ideas and deferred ideas, which share a shape.
- Claude's discretion as endnotes, and references and code insights as back matter.

## How to View
https://cinedise.persian-elnath.ts.net/sketches/005-context-document/
(locally: http://127.0.0.1:4174/005-context-document/)

Toolbar: the document (studio-portal P1 / labelore P5), theme, width.

## Real content
The content is extracted mechanically from two files with different shapes, not rewritten:
- **studio-portal P1** has explicit **In scope:** / **Not in scope — do not drift into these:**
  lists, 19 decisions, 3 open questions (2 of them block a decision), 4 reversibility lines, and a
  one-paragraph Claude's-discretion list.
- **labelore P5** has a prose boundary ("This phase does not…"), 15 decisions, no open questions,
  and a bulleted discretion list.

In every variant, each decision is split into the tag (`D-04`), a summary (the first sentence, never
cut inside code, bold text or "e.g."), the detail (the rest), and reversibility.

## Variants
- **C1: Scope on the cover.** In/Out sits on the cover as a band between the title and the "at a
  glance" row. Decision rows show the tag and summary, with a + that opens the detail. Open
  questions get their own amber chapter, and each blocked decision carries a "blocked · OPEN-01"
  chip that jumps to it. Specific and deferred ideas sit side by side in one "Ideas" chapter. The
  page ends with endnotes (Claude's discretion) and a folded "More in this document" (references and
  code insights).
- **C2: Boundary chapter, open questions inline.** "00 Phase boundary" is the first chapter and is
  always open: the full summary, then In/Out. Decision rows add a two-line faded teaser of the
  detail. Each open question sits directly under the decision it blocks, as an amber inset. Open
  questions that block nothing go to a "Still open" chapter. Specific and deferred ideas are
  separate chapters. One endnotes sheet at the end holds Claude's discretion, references and code
  insights, the last two folded per group.
- **C3: Ledger.** The boundary shrinks to two toggles under the lede ("In scope 9", "Out of scope 4")
  that open a small panel. Each area's decisions are a dense table (tag · decision · undo), and a
  row expands in place. Open questions are a table with a "Blocks" column. Ideas are one chapter
  with a Specific/Deferred switch.

All three share:
- the cover, with the gathered date in the eyebrow and facts, "N decisions locked" with pills, and
  a glance cell for "N questions for the researcher" (or "costly to reverse" when nothing is open)
- a copy-path icon button in place of the printed path
- mention links (`D-09`, `OPEN-01`) that open and flash their target
- the endnotes sheet (small-caps headings, roman-numbered hanging items), which splits a
  one-paragraph "…left to planning judgment: a, b, and c." into items

## What to Look For
- **The boundary:** does C1's band make the cover too tall, especially on a phone and for labelore
  P5, whose "In scope" comes from prose? Is C2's chapter 00 or C3's toggles the better trade?
- **Density:** tag + summary (C1), plus a teaser (C2), or a table (C3). Which lets you scan 19
  decisions and still find the reasoning?
- **Open questions:** a separate chapter with back-chips (C1/C3), or inline under the blocked
  decision (C2)?
- **Quietness:** is "do not drift into these" quiet enough? Are the reversibility chips helpful or
  noise?
- **Endnotes vs "More in this document":** does back matter belong in the endnotes (C2) or its own
  fold (C1/C3)?

## Parsing notes for the build
- Splitting prose boundaries is the fragile part. The labelore P5 "does not…" sentence needed a hand
  correction in the sketch data. The real reader should split only on clear list punctuation and
  fall back to the summary paragraph.
- Some boundaries use a third shape: studio-portal P4's "Locked upstream — do not re-open" table.
  It isn't covered here.
- Quick-task CONTEXT files have no D-tags. They're plain bullets under `###` areas, and should
  render as untagged rows.

## Outcome
**No winner.** All three variants looked too much like the discussion log, because they used the same
B3 cover sheet and folded chapters. The user wants CONTEXT to stress what matters in a CONTEXT file
while keeping the site's style, not to copy another page's layout. The endnotes sheet was also
rejected. Reworked as sketch 006.
