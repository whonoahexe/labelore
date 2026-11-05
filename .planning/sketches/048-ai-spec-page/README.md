---
sketch: 048
name: ai-spec-page
question: "How should the AI spec page show the system type, framework, evaluation dimensions and checklist progress as a picture, and say plainly which sections are still template slots, so an all-slots spec looks clearly unfilled rather than broken?"
winner: null
tags: [ai-spec, template-slots, checklist, phase-10]
---

# Sketch 048: AI spec page

## Design Question
Phase 10 D-14 and D-15; UI-SPEC section 4 AI spec "must show", Tone mapping (AI spec), section 8 (the segmented
meter as one shared name, `status-meter`), the AI spec copy rows. The page must show **System type, Framework,
Evaluation dimensions** (untoned chips) and **checklist progress** ("{d} of {t} checklist items done" with a
segmented meter of status squares), the lead **"{n} of {m} sections are still template slots"** (omitted at
zero), and every unfilled section collapsed with its heading and a quiet "Template slot" chip, never rendered as
if it said something. The rest of the document is plain sections.

## Frames this sketch must not reuse
- 041 B (masthead, count tiles, vertical spine, sticky margin) and 042 A with 043 to 046 (left rail beside one
  column), as in 047's README.
- **047's three:** A a full-bleed instrument band over a centred reading column; B a strip of column gauges
  over a requirements matrix and a scope fence; C a two-up radar scorecard over a square strip, cards and piles.

048's three are a split board with a dock column beside it (A), the document's own numbered contents as the
page (B), and a datasheet of big field cells over a placed matrix (C).

## How to View
open .planning/sketches/048-ai-spec-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`).
- The State bar (`?state=04|02|full`):
  - **04 Half filled**: 04-AI-SPEC. Sections 4b, 6 and 7 are still the template's text, so "3 of 9 sections
    are still template slots"; 6 of 16 checklist items done.
  - **02 Every section a slot**: 02-AI-SPEC, the bare template. "9 of 9 sections are still template slots",
    0 of 16; System type, Framework and Evaluation dimensions each read "Template slot".
  - **Fully filled**: 04-AI-SPEC with 4b, 6 and 7 written in the sketch (made-up Lendshed words, nothing else
    changed) and every checklist box ticked, so there is no lead line. No fixture is fully filled; this state
    exists only to show the page without a lead.
- A written section opens on demand (A and C: its bar; B: its contents row); a slot section has no opener, only
  its heading, the "Template slot" chip and a Source link.

## How a section is judged a template slot
The sketch embeds GSD's own `templates/AI-SPEC.md` and uses it as the detection list (UI-SPEC: built from the
real template, not from the made-up file). A line is **template text** when it occurs verbatim in the template
(headings, `**Label:**` lines with their HTML-comment guidance, the blockquote notes, the empty table rows such as
`| | | Block / Escalate / Flag |`, fence placeholders such as `# Install command(s)`, and the `1.` stubs), or is an
HTML comment. A numbered section (`## 1.` to `## 7.`, `## 1b.`, `## 4b.`) is a **template slot** when every
non-blank line under it, sub-headings and rules aside, is template text. In a written section the HTML-comment
guidance and empty template rows are dropped from what renders.

## Shared across all three
- Header: ArtifactHeader as today (crumbs Lendshed / Phase N / AI spec, eyebrow "Phase N · AI spec", the phase
  name as the `h1`, copy path, View / Source).
- Labels and copy verbatim: "System type", "Framework", "Evaluation dimensions", "Checklist", "Template slot",
  "{n} of {m} sections are still template slots", "{d} of {t} checklist items done".
- The checklist meter is drawn once as `status-meter` (caption plus one square per item, done `complete`,
  not done `quiet` dashed; one accessible name, cells hidden) and used by all three.
- A slot is `quiet` everywhere (dashed square or chip, `--border` hatch); never `in-flight`, never `missing`.
  System type, framework, version and dimension chips are untoned.
- Below the picture: the nine numbered sections and the Checklist as closed bars (A, C) or contents rows (B).
- Accent: the eyebrow and done checklist squares only. No `destructive`, `warning` or `missing` tone; no colour
  literal in the file.

## Variants
- **A: Reuse.** 045 C's chips: a ribbon with System type, Framework (version in mono) and the Evaluation
  dimensions. Under it the lead at Heading size beside the checklist meter. Then a split board: 044 E's piles on
  the left, one column per numbered section, one segment per checklist item about that section (done `complete`,
  not done dashed). A slot section's foot is hatched and dashed with "Template slot" under its number. The dock
  sits in a column on the right and holds the selected item or section. 044 E's closed bars follow, slot sections
  as dashed rows with the chip.
- **B: Contents with fill bars.** The page is the document's own numbered contents. The head is one facts line
  (the three labels with their chips), the lead and the meter, ruled off. Each contents row has the section
  number at Heading size, its name, and a bar: **written lines** (solid) against **the template's lines still in
  place** (hatched), to a shared scale. Then that section's checklist squares and "{n} written", or the "Template
  slot" chip. A slot row is dashed, muted and has no opener; a written row opens in place. The Checklist is the
  last row.
- **C: Datasheet + eval matrix.** A hard-ruled sheet of four big field cells: System type, Framework (with
  Version), Stakes level, Vendor lock-in (its first word, the reason under it). A slot cell is hatched with the
  chip. Then the lead over a strip of nine section squares (written neutral, slot dashed; a square opens that
  section's bar) beside the large checklist meter. Then the Evaluation dimensions placed in a matrix: Priority
  rows (Critical, High, Medium) by Measurement columns (Code, LLM Judge, Human). A chip opens its Rubric,
  Measurement and Priority in a dock. In the all-slots state the matrix is one hatched box with the chip. Then
  the bars.

### Where each mark comes from
| Mark | Source in the AI-SPEC file |
|------|----------------------------|
| System type, Framework, Version, Stakes level, Vendor lock-in | the `**System Type:**`, `**Selected Framework:**`, `**Version:**`, `**Stakes Level:**`, `**Vendor Lock-In Accepted:**` lines; a value that is only the template's comment is a slot |
| Evaluation dimensions, C's matrix placement, its dock | the `### Dimensions` table in section 5: Dimension, Rubric, Measurement Approach, Priority (rows that are the template's empty row are dropped) |
| Lead line, slot chips, hatched feet, dashed rows, C's section strip | the template-slot test above, per numbered section |
| Checklist meter, A's segments, B's per-row squares | the `## Checklist` `- [x]` / `- [ ]` items; each item's section is read from the template's fixed checklist order (system type and failure modes: 1; domain, regulatory, expert roles: 1b; framework, alternatives: 2; quick reference: 3; best practices: 4b; the five evaluation items: 5; guardrails: 6; monitoring: 7). Section 4 has no item |
| B's fill bar | per section, the count of written lines against the count of template lines still under the heading |

## Layout contract
Measured in headless Chrome from the file, state 04, light theme; the page column is 1178px at 1280 (x=51)
and 358px at 390 (x=16).

**A: Reuse (chips, piles, bars)**
- 1280px: the ribbon is 1178 by 127px (labels in a 185px column, chips beside). The board is 673px wide and
  324px tall, nine 64px columns with 20px segments; the dock column is 481px at x=748. Bars below are 1178px wide.
- 390px: the ribbon stacks (230px); the board is 358px, columns 32px with 12px segments; numbers stay, the
  names move to a list under the piles; the dock moves under the board.

**B: Contents with fill bars**
- 1280px: the head is 178px; a contents row is 56px: number 56px, name up to 240px, the fill bar 658px at
  x=387 (16px tall), the end column 160px.
- 390px: a row is 90px: number in a 40px gutter, then name, bar (286px) and end stacked to the right of it.

**C: Datasheet + eval matrix**
- 1280px: the sheet is 1178 by 133px, four 293px cells; the lead and strip sit beside the checklist meter
  (138px); the matrix is 1178 by 210px (a 96px Priority column, three 360px measurement columns).
- 390px: the sheet is two by two (281px); the strip squares shrink to 24px so all nine fit on one line; the
  matrix keeps its four columns (95px measurement cells, chips wrap).

## Font sizes
Measured at 1280 and 390 in both themes and all three states, text of the page only: exactly four sizes in every
variant (display 44.8px at 390).

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | the lead line, section `h2`, section numbers (A, B), C's field values |
| Body | `--fs-4` | 13.12px | section names, section text, dock text |
| Label | `--fs-2` | 11.2px | eyebrow, crumbs, chips, micro-labels, meter caption, pile names, keys, links |

## What to Look For
- 02: does every variant read as "nothing has been written yet" at once, rather than as a broken page?
- 04: which picture says where the work is missing best: checklist piles by section (A), written-versus-template
  bars (B), or a datasheet with a section strip (C)?
- A and B put the checklist beside the sections and show where they disagree: 04's section 3 is written but its
  checklist item is not ticked; section 1b is written and one of its three items is not ticked.
- C's measurement × priority matrix: is placing the dimensions worth it, or are plain chips enough?

## Open points for the build
- The `h1` drops "AI-SPEC — Phase N:" from the document title (the title does not open with `Phase N:`, so
  `splitPhaseTitle` would leave it whole); 10-18 confirms.
- The checklist-to-section map is read from the template's fixed order. A checklist the author re-ordered or
  edited would need a word match instead; the build decides.
- "Select a segment to read that checklist item, or a section number to see the section.", "{n} written",
  "{n} written lines · {n} template lines left in place", "Read the section", "Done" / "Not done" and the short
  section names in A are sketch words, not UI-SPEC copy.
- The m in "{n} of {m}" counts the nine numbered sections. The UI-SPEC example says "3 of 8"; the real template
  has nine.

All text is the made-up Lendshed AI specs (test/fixtures/lendshed, 10-04) and GSD's own template, verbatim. The
only exception is the Fully filled state's sections 4b, 6 and 7, which are made-up Lendshed words written for the
sketch. The repository is public.
