---
sketch: 052
name: cross-ai-reviews-page
question: "How should the Cross-AI reviews page show each reviewer (name, model, overall risk, run status), the concerns two or more reviewers agreed on first, then where they disagreed side by side, never merged into one verdict, with each review's full text on demand, as a picture?"
winner: "A"
tags: [reviews, cross-ai, agreement, disagreement, phase-10]
---

# Sketch 052: Cross-AI reviews page

## Design Question
Phase 10 D-14 and D-15; UI-SPEC section 5 Cross-AI reviews "must show", Tone mapping (Cross-AI reviews), the
Reviews copy rows, the generic fallback row for one reviewer; PROJECT.md "keep disagreeing signals separate". The
reader's first question is **"what did the reviewers agree is wrong, and where do they part ways?"** The focal point
is the **Agreed** group, then the **Disagreements**. The reviewers are the unit, not the file's headings:

- **Each reviewer:** name, model verbatim (Codex's is `unknown`), "Overall risk: LOW | MEDIUM | HIGH" when stated,
  the run status when the file states one (Qwen: "Review failed"), and plan coverage (Codex did not reach 04-03,
  from `plan_coverage`).
- **Agreed:** a concern two or more reviewers raised, the reviewers named, the highest severity among them. A failed
  lane is never counted.
- **Disagreements:** a stance one reviewer states and another contradicts (the overall risk spread; approve versus
  revise on 04-03), each reviewer's stance side by side in a quiet dashed block with the in-flight "Reviewers
  disagree" chip. Never a merged verdict.
- Then each review's full text, collapsed, and the file's own consensus labelled "Consensus summary, as the file
  wrote it".

## Frames this sketch must not reuse
- **022 C (code REVIEW):** review threads: a verdict, an outcome tally and a reviewer pull quote; findings grouped by
  file worst-first with a line gutter and an outcome reply.
- **041 B, 042 A with 043 to 046, 047 B, 048 C, 049 B, 050 B:** as listed in 051's README (masthead and spine; a
  left rail beside one column; column gauges over a matrix; a datasheet over a section strip and a matrix; a tree
  beside a file card; a ruled head over a wired findings-to-plan ledger).
- **051's three:** a browser window (A), a chip, meter and piles board (B), a route map (C).

052's three are a **set** picture (A: overlapping circles, a concern sits in the overlap of the reviewers who raised
it), a **position** picture (B: each reviewer placed on a LOW / MEDIUM / HIGH board, per plan), and a **connection**
picture built from a chosen part (C: 050 B's wire ledger, reviewers wired to every concern they raised). None has
threads, a line gutter, a rail, a datasheet or a matrix of fields.

## How to View
open .planning/sketches/052-cross-ai-reviews-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`).
- The State bar (`?state=04|01`):
  - **04 Three disagree, one failed**: 04-REVIEWS. Claude (LOW, approve on both plans), Codex (model `unknown`,
    MEDIUM, 04-02 only, no verdict), OpenCode (HIGH, revise on 04-03); Qwen's lane failed (connection refused) and is
    shown with its status, never in Agreed. Two agreed concerns: A1 the month walk's deadline (Claude, Codex,
    OpenCode; HIGH) and A2 `MAX_EXPORT_LOANS` read once at startup (Claude, OpenCode; MEDIUM). Seven concerns raised
    by one reviewer. Two disagreements: Overall risk (LOW / MEDIUM / HIGH, Qwen failed) and Verdict on 04-03
    (approve / revise; Codex not reviewed, Qwen failed). The Plan-Revision Conflicts section stays as a closed bar.
  - **01 One reviewer**: 01-REVIEWS. One card (Claude, LOW); no Agreed and no Disagreements group (a group needs
    two reviewers); the two concerns listed under the reviewer; the file's consensus ("None: a single reviewer.")
    as written in its bar.
- A concern opens on demand: A, a square in the circles or an Agreed row; B, an Agreed row or a single-reviewer
  square; C, a concern row (a reviewer card brings its wires forward). An agreed concern's dock sets each reviewer's
  own words side by side and says how the match was made.

## Shared across all three
- Header: ArtifactHeader as today (crumbs Lendshed / Phase N / Cross-AI reviews, eyebrow "Phase N · Cross-AI
  reviews", the phase name from the roadmap as the `h1`, copy path, View / Source), with "Reviewed {date}" from
  `reviewed_at`, "Plans …" from `plans_reviewed` and the reviewer count.
- Copy verbatim: "Reviewers", "Agreed", "Disagreements", "Reviewers disagree", "Consensus summary, as the file wrote
  it", "Overall risk: {LOW|MEDIUM|HIGH}"; models, verdicts (`approve`, `revise`) and concern text as written.
- Severity: HIGH `missing`, MEDIUM `in-flight`, LOW `quiet` (chips, squares, wires). Reviewer cards are untoned; a
  failed lane is a dashed card. A disagreement is a dashed `quiet` block with the `in-flight` chip; a reviewer who
  did not state the stance sits in a hatched cell with the reason ("Not reviewed", "Review failed"). Never
  `destructive` or `warning`.
- In the dark theme `--missing-fill` and `--in-flight-fill` sit close in hue; HIGH and MEDIUM stay apart by shape
  (an outline square versus a filled one; a heavier solid wire versus a thinner one) and always by their word.
- Below the picture: each review as written (one closed bar per reviewer, the plans inside), any other section the
  page does not claim (Plan-Revision Conflicts), and the consensus bar.
- Accent: the eyebrow only (no `complete` tone exists on this page). No colour literal in the file.

## Variants
- **A: Overlap.** A figure of overlapping circles, one per substantive reviewer (named on the drawing), faintly
  filled so overlaps darken. Every concern is a square in the region of the reviewers who raised it: the agreed ones
  large and numbered in the overlaps (A1 in the middle of all three, A2 where Claude and OpenCode meet), the
  single-reviewer ones small at each circle's edge. The failed lane is a small empty dashed circle off to the side.
  The figure's key is the reviewer roster (four cards). Beside it, "Agreed" lists A1 and A2 with the severity chip,
  the reviewers and the plan. Then the Disagreements. With one reviewer: one circle, and "Concerns" in place of
  Agreed. The drawing is laid out at its real width after layout, so its labels stay at the page's sizes at 390.
- **B: Where each stands.** A position board: columns Not placed, LOW, MEDIUM, HIGH. The first lane, "Overall risk",
  places each reviewer card in its column (Qwen in Not placed). Then one lane per plan with each reviewer's tag in
  that plan's risk column and its verdict when stated (Codex sits in Not placed on 04-03, "Not reviewed"). The
  spread across the columns is the disagreement, visible before any words. Then "Agreed": each row has the severity
  chip and text, and one slot per reviewer, filled with that reviewer's own severity where it raised the concern
  and dashed where it did not. Then "Raised by one reviewer" as rows of severity squares per reviewer. Then the
  Disagreements. Under 48rem of its own width the board turns each lane into rows by column, skipping empty ones.
- **C: Reuse — wire ledger.** 050 B's ledger: "Reviewers" on the left (the full cards), concerns on the right with
  Agreed first (severity, number, plan, the reviewers as tags), then "Raised by one reviewer" by plan. An SVG wire
  runs from each reviewer to every concern it raised, stroked by severity (HIGH heavier solid `--missing-fill`,
  MEDIUM solid `--in-flight-fill`, LOW dashed muted), so an agreed concern visibly takes two or three wires.
  Selecting a reviewer or a concern brings its wires forward. Then the Disagreements. Under 52rem: no wires, every
  row shows its reviewer tag.

### Where each mark comes from
| Mark | Source in the REVIEWS file |
|------|----------------------------|
| Reviewer card, circle, board card, ledger card | each `## {Name} Review` section; the name is the heading's |
| Model | frontmatter `models.{key}`, verbatim |
| "Overall risk: …" | each plan's `### Risk Assessment` (or `Risk:`) first word; shown when the plans agree, else the highest |
| "Review failed" | a review section with no plan and "failed or returned empty output" in its text |
| Coverage, "Not reviewed" | frontmatter `plans_reviewed`, the reviewer's `## {plan}` sections, `plan_coverage.{key}.missing` |
| Concerns (squares, rows, slots) | each plan's Concerns list items that open with HIGH, MEDIUM or LOW (bold or not) |
| Agreed | concerns from different reviewers on the same plan whose first clause matches; or a consensus "Agreed Concerns" line naming two or more reviewers and a plan, matched to each named reviewer's concern on that plan that shares two or more key words with it |
| Agreed severity | the highest of the matched concerns' own severities |
| Disagreements | the reviewers' overall risks when they differ; each plan's `### Verdict` when two reviewers state different words |
| Each review as written, other bars | the review sections verbatim; any other `##` section with content; `## Consensus Summary` |

## Layout contract
Measured in headless Chrome from the file, state 04, light theme; the page column is 1178px at 1280 (x=51) and
358px at 390 (x=16).

**A: Overlap**
- 1280px: the figure and Agreed row is 1178 by 890px: the figure 668px (drawing 557px, key 296px with the four
  cards on a 3 + 1 grid), the Agreed column 477px at x=751 (rows 100px). Disagreement blocks are 169px.
- 390px: the row stacks (1085px): the drawing 309px, the key 335px (two by two), Agreed rows 142px. Disagreement
  blocks are 266px, their cells two by two.

**B: Where each stands**
- 1280px: the board is 1178 by 365px: a 112px lane-label column and four 266px columns, three 145px lanes. Agreed
  rows are 77px with three 80px slots at the right; the single-reviewer rows 115px in all.
- 390px: the board is 1176px tall, each lane a stack of its non-empty columns (122px each with a card); Agreed rows
  are 180px with the slots on their own line.

**C: Reuse — wire ledger**
- 1280px: the ledger is 1178 by 925px: the reviewers column 361px (cards 125px), a 96px wire gutter, the concerns
  column 721px at x=508 (rows about 99px).
- 390px: the ledger stacks to 1832px with no wires; rows are 120px with their reviewer tags.

No variant scrolls sideways at 390 in either state or theme.

## Font sizes
Measured at 1280 and 390 in both themes and both states, text of the page only (the app shell and the sketch bar
are outside the page): four sizes in every variant at state 04; at 390 the display size falls to 44.8px. At state
01 B and C use three (no group heading exists with one reviewer); A uses four ("Concerns").

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | "Agreed", "Disagreements", "Concerns", the stance chips in a disagreement |
| Body | `--fs-4` | 13.12px | reviewer names, concern text, circle names, disagreement titles, review text, bar titles |
| Label | `--fs-2` | 11.2px | eyebrow, crumbs, meta, models, chips, coverage, micro-labels, A1 / A2, slot names, keys |

## What to Look For
- 04: which first screen says "they agree the deadline is a problem, and they split on 04-03" fastest: the overlaps
  (A), the spread across the board (B), or the converging wires (C)?
- Does Qwen read as "this lane did not run", not as a reviewer who found nothing?
- Does Codex's `unknown` model and its missing 04-03 read as stated facts, not as errors?
- A1 is matched through the file's own consensus (the three reviewers word it differently); the dock says so. Is
  that labelling enough, or should a consensus-only match look different from a same-words match (A2)?
- 01: with one reviewer and no groups, does the page still feel finished?

## Open points for the build
- The `h1` is the phase name from the roadmap; the file's title gives only "Cross-AI Plan Review — Phase N". 10-22
  confirms the title source.
- The agreement match is best-effort: same first clause on the same plan, or a consensus "Agreed Concerns" line that
  names the reviewers and the plan, matched by shared key words (two or more). Text the page cannot match stays
  under its reviewer. A wrong consensus line could pull in the wrong concern; the dock shows every reviewer's own
  words so a reader can check.
- Overall risk is per plan in the file; the card shows one word when the plans agree and the highest otherwise
  (no fixture has a reviewer whose plans differ).
- A draws up to three substantive reviewers as circles; four or more would need another drawing (B and C have no
  such limit).
- Sketch words, not UI-SPEC copy: "Review failed", "Not reviewed", "{id} not reviewed", "Not placed", "Raised by one
  reviewer", "Each review as written", "Matched: …", "Verdict on {plan}", "the file’s own", "one square per concern",
  "Plans …", "{n} reviewers".

All text is the made-up Lendshed REVIEWS files (test/fixtures/lendshed, 10-07), verbatim; model ids are the made-up
file's. The repository is public.

## Winner
**A: Overlap**, chosen by the user at the 10-17 checkpoint: "A looks good for both". No synthesis.

Build A as drawn in its tab (marked "★ Selected"; the sketch opens on it):
- **The figure and Agreed row** (two columns 7fr / 5fr; stacked under 52rem):
  - The drawing: one circle per substantive reviewer (up to three), named on the drawing, `--muted-foreground` fill
    at low opacity so overlaps darken, `--foreground` stroke. Each concern is a square in the region of the reviewers
    who raised it: agreed concerns large and numbered (A1, A2) in the overlaps, single-reviewer concerns small at
    each circle's own edge; fill and stroke by severity (HIGH outline `--missing-fill`, MEDIUM filled
    `--in-flight-fill`, LOW dashed muted). A failed run is a small empty dashed circle off to the side. Geometry is
    laid out at the figure's real width after layout so the labels keep the page's sizes at 390.
  - The key under the drawing is the reviewer roster: one untoned card per reviewer (name, model verbatim in mono,
    "Overall risk: {word}" chip, a dashed card with "Review failed" for a failed run, and plan coverage with
    "{plan} not reviewed").
  - Beside it, "Agreed" with its count: one row per agreed concern (number, text, highest-severity chip, reviewers,
    plan), and a line counting the concerns raised by one reviewer.
  - A square or an Agreed row opens a dock under the row: an agreed concern sets each reviewer's own words side by
    side and says how it was matched.
- **Disagreements:** one dashed `quiet` block per stance (Overall risk; Verdict on {plan}) with its title and the
  `in-flight` "Reviewers disagree" chip, the stated stances side by side at Heading size, and hatched cells for
  reviewers who did not state it ("Not reviewed", "Review failed"). Never merged.
- **Below:** "Each review as written": one closed bar per reviewer, then any other section the page does not claim
  (Plan-Revision Conflicts), then "Consensus summary, as the file wrote it".
- **One reviewer:** one circle with its concerns, "Concerns" in place of Agreed, no Disagreements.
- **Four or more substantive reviewers** (open item for 10-22): the overlap drawing only covers one to three
  circles. With four or more, the build must not attempt a circle drawing; it shows the roster cards and the Agreed
  list (each row naming its reviewers) without the drawing, and says so in one quiet line. The exact fallback
  layout is 10-22's to state, not designed here.
