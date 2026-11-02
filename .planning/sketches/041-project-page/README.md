---
sketch: 041
name: project-page
question: "What page shape gives PROJECT.md a charter feel (identity and core value said large, the milestone goal, requirement counts linking into traceability, constraints, out of scope, and every key decision in the author's order) with little prose?"
winner: "B"
tags: [project, charter, root-documents, decisions, phase-9]
---

# Sketch 041: The project page (PROJECT.md)

## Design Question
Phase 9 D-04: PROJECT.md gets a designed page, the charter (the dashboard stays "now"). It shows what
the project is, its core value, the current milestone's goal, requirement counts by state (from
the traceability projection, each linking into traceability filtered to that state, D-05),
constraints and key decisions with their outcomes. Intake (2026-11-02): it should feel like a charter or
founding document, keep the decisions in the author's order, and show as little prose as possible
(Current State, Context and the requirement bullets stay behind Source).

## How to View
open .planning/sketches/041-project-page/index.html

- Tabs: `#a`, `#b`, `#c`. Project: **Labelore** (this repo's own PROJECT.md, 27 decisions, one
  Revisit), **Lendshed** (the made-up fixture, 4 decisions, one Pending), **Kiln** (made up here, 9
  decisions with Reversed, Revisit and Pending). `?p=kiln&theme=dark` work too.
- Width: Full / 768 / 390 (container queries, so the narrow layouts show without resizing).
- Click any decision to open its Why and How it turned out. "Show every reason" opens all. Count
  links and footer links toast the route they would open.

## Shared across all three
- Outcome tones only: Good → `complete`, Revisit → `in-flight`, Reversed → `missing`, Pending →
  `quiet`. In A and C, Good is drawn quiet (a square and a muted word) and only the other outcomes
  get a chip, so the exceptions stand out without reordering the list.
- Requirement counts: complete and pending in the current milestone, shipped before (per-milestone
  breakdown on hover), out of scope.
- The decision's own trailing tag (`(Phase 6)`, `(v2.0)`, `(D-01)`) is lifted out as a quiet tag.
- The out-of-scope names are struck through ("Will not do"). The footer gives the Last updated
  line, "Where the work is now →" to the dashboard, and Source.

## Variants
- **A: Charter.** One centred reading column. The name is said large, then what it is, then the
  core value as a pull quote between rules. Next comes "Now building" with the goal and an inline
  line of counts, then numbered articles: Bound by (I, II, III…), Will not do, and Decisions as a
  numbered log with outcomes at the right.
- **B: Masthead + spine.** A full-width masthead: identity on the left, the core value in a framed
  card on the right, and under it a strip with the milestone goal and four count tiles. Below,
  the decisions run on a vertical spine with outcome squares and era markers where the author's
  tag changes, plus a strip of every decision as a square (click to jump). The outcome note shows
  under each row, and Good rows carry no chip. Constraints and Will not do sit in a sticky margin,
  clamped to two lines until "Read in full".
- **C: Spread.** An open book. The left page is the charter (sticky): name, core value with an accent
  rule, what it is, now building, the counts as linked rows, then Bound by and Will not do cut to
  their first clause. The right page is the decision log as a ledger (#, Decision, Outcome). An
  opened row shows Why and How it turned out side by side.

## Round 2 — refinements of B (not chosen)
The user liked B's direction (2026-11-02) and asked for it to look better. All three keep B's frame
(masthead → decision spine → margin) and share these fixes:
- the decision number moves to a left gutter, with node squares aligned to the first line
- era markers only for milestone and phase tags (`v2.0`, `Phase 6`); other tags such as `D-01` stay inline
- each count tile has a label plus a mono sub-line (`in v2.1`, `v1.0 45 · v1.1 11`, `by choice`)
- an opened reason is a two-column reading block with an accent rule
- the margin rules are numbered (I, II…) under a heavy top rule, charter style

- **B1: Refined.** B, tightened. The core value sits beside the identity with an accent left
  rule (no box), followed by the goal and four count tiles. The decision overview (squares and
  legend) is one row, the spine has the number gutter, and Bound by and Will not do sit in the
  sticky margin.
- **B2: Stacked.** The masthead reads top-down. The name and what it is sit side by side, then the
  core value runs across the page at display size in accent quotes, then Now building with the goal
  and a complete/pending meter for the current milestone. Shipped before and out of scope are links
  under the meter. The body is the same as B1.
- **B3: Reader.** B1's masthead, then Bound by and Will not do as a two-column band under it. The
  margin becomes a sticky decision reader (big number, the decision, Why, How it turned out,
  ← Earlier / Later →, and the arrow keys work). Spine rows stay one line plus the note. Opens on the
  latest decision.

## What to Look For
- Which one reads as a charter, not as another dashboard (025) or the research spines (031)?
- With 27 decisions, does the list stay calm, and do the Revisit/Reversed rows still find you?
- Are the counts prominent enough (B's tiles) or too loud for a charter (A's inline line)?
- Constraints: full text (A), clamped in a margin (B), or first clause only (C)?
- At 390px, does each still read top-down without crowding?

All non-Labelore content is made up. The repository is public.

## Winner
**B: Masthead + spine** (round 1), chosen by the user on 2026-11-02. This is the canonical reference
for the Phase 9 project-page plan (D-12). The masthead holds identity on the left and the core value
in a framed card with an accent top rule on the right. Under it, a strip has the milestone goal and
four count tiles (complete and pending in the current milestone, shipped before, out of scope),
each linking into traceability. The decisions run on a vertical spine in the author's order, with
outcome squares, era markers where the author's tag changes, a jump-to strip of one square per
decision, and the outcome note under each row. Good rows carry no chip. Constraints and Will not do
sit in a sticky margin, clamped to two lines until "Read in full", with the footer below them.

Round 2 (B1 Refined, B2 Stacked, B3 Reader) was built as polish on B. The user preferred the
original: "honestly B was better". Build B as drawn, not the round-2 changes. The round-2 tabs stay
in the file for the record.
