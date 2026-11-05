---
sketch: 050
name: eval-review-page
question: "How should the Eval review page put the score and GSD's verdict first, then the dimension coverage (Covered, Partial, Missing) with how each is measured, the infrastructure audit, and the remediation plan in the author's order, as a picture rather than three tables?"
winner: "B"
tags: [eval-review, score, dimensions, remediation, phase-10]
---

# Sketch 050: Eval review page

## Design Question
Phase 10 D-14 and D-15; UI-SPEC section 5 Eval review "must show", Tone mapping (Eval review), the Eval copy
rows; RESEARCH C4 and Pattern 7. The reader's first question is **"what did it score, and what is the
verdict?"**: the overall score ("64 of 100", mono, Heading) and GSD's verdict verbatim as a chip
(PRODUCTION READY `complete`, NEEDS WORK `in-flight`, SIGNIFICANT GAPS and NOT IMPLEMENTED `missing`; any other
or none: quiet "Verdict not stated"). Then **Dimension coverage**: one entry per dimension with its state
(COVERED `complete` "Covered", PARTIAL `in-flight` "Partial", MISSING `missing` "Missing"), how it is measured
(Code, LLM Judge, Human) and the finding, with a tally and the segmented meter. The **Infrastructure audit** is a
second, smaller group showing the file's own word (Installed, Present, Implemented, Partial, Not found, Not
configured) beside the tone it maps to. The **Remediation plan** is shown in the author's order as its three
groups, each step tied to the dimension or component it names. Numbers and verdicts are shown as written and never
recomputed.

## Frames this sketch must not reuse
- **018 B (UI-REVIEW page):** a scorecard hero (hexagon radar left; verdict sentence, fix pins and method chips
  right), a pillar tab bar, an inspector with Found / Held up columns.
- **041 B, 042 A with 043 to 046, 047 B, 048 C:** as listed in 049's README (masthead, spine and sticky margin; a
  left rail beside one column; a column-gauge strip over a matrix and a scope fence; a datasheet over a section
  strip and a measurement × priority matrix).
- **049's three:** a station track (A), a dashboard tree beside a file card (B), a datasheet over piles and name
  tags (C).

050's three are a **quantity** picture (A: the score as 100 cells, the dimensions and components as ribbons of
toned tiles, the plan as three lanes), a **connection** picture (B: what the audit found wired to the step that
fixes it), and a **placement** picture built from already-chosen parts (C: 048 C's datasheet and matrix shape,
044 E's piles). None has a radar, a pillar tab bar or an inspector.

## How to View
open .planning/sketches/050-eval-review-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`).
- The State bar (`?state=04|03|none`):
  - **04 Needs work**: 04-EVAL-REVIEW. 64/100, NEEDS WORK; five dimensions (3 covered, 1 partial, 1 missing);
    five components (Installed, Partial, Present, Implemented, Not found); Coverage Score 3/5 (60%),
    Infrastructure Score 70/100; a plan of 2 + 3 + 2 steps, four of which name a dimension or component.
  - **03 Not implemented**: 03-EVAL-REVIEW. 12/100, NOT IMPLEMENTED, AI-SPEC Present: No; four dimensions, all
    MISSING; components Not found, Partial ×3, Not configured; a plan of 3 + 0 + 0 steps (empty groups show a
    dashed "0").
  - **No score**: 04 with its Overall Score and Verdict lines removed (a sketch-made state; no fixture has it).
    No score numeral, the quiet "Verdict not stated"; the dimensions, components and plan still render.
- A dimension or component opens its finding on demand (A: a tile; B: its row opens in place; C: a matrix chip or
  a component chip); a plan step opens in C's dock.

## Shared across all three
- Header: ArtifactHeader as today (crumbs Lendshed / Phase N / Eval review, eyebrow "Phase N · Eval review", the
  phase name after "EVAL-REVIEW — Phase N:" as the `h1`, copy path, View / Source), with "Audited {date}".
- Copy verbatim: "Score", "Verdict" (the file's word), "Dimension coverage", "Remediation plan", "Covered",
  "Partial", "Missing", "Verdict not stated"; the Coverage Score, Infrastructure Score and AI-SPEC Present values
  as written.
- The tally "{c} covered, {p} partial, {m} missing" counts the Dimension Coverage rows; it is not a score. The
  meter is 048's `status-meter` (one square per dimension).
- **Missing** is the `missing` tone (a 2px `--missing-fill` outline), never `destructive` or `warning`; Partial
  is `in-flight`; score numerals are untoned. The infrastructure word table (RESEARCH Pattern 7): Installed,
  Configured, Present, Implemented `complete`; Partial `in-flight`; Missing, Not found, Not configured `missing`;
  any other word `quiet`. The word is always shown beside its square.
- A step **names** a dimension or component when it opens with that name and a colon (`**Usable as sent:**`,
  `Output correctness:`; a component's parenthetical is ignored, so "Reference dataset" matches "Reference
  dataset"); the step then carries a small tag with the target's square and name.
- Below the picture: Critical Gaps and Files Found as closed bars (C adds the plan as a bar too).
- Accent: the eyebrow and `complete` marks only. No colour literal in the file.

## Variants
- **A: Score waffle.** A hero band: the score as a 10 × 10 waffle (64 cells filled neutral, the rest hairline),
  beside "Score 64 of 100", "Verdict" with the large chip, and the file's sub-scores. Then Dimension coverage:
  the tally at Heading size beside the meter, then a ribbon of equal tiles, one per dimension, each with a thick
  toned band on top (Missing hollow), the name, the measurement and the state; a tile opens its finding in a dock
  under the ribbon. Then the Infrastructure audit as a thinner ribbon with the file's words. Then the
  Remediation plan as three lanes side by side (count at Heading size, steps numbered, target tags). At 390 the
  waffle fills the width, ribbons become lists with the band as a left edge, and the lanes stack.
- **B: Gap → fix ledger.** One ruled head line: Score, the verdict chip, the tally and meter, the sub-scores.
  Then a two-sided ledger: "What the audit found" on the left (dimension rows, then smaller component rows, each
  with its square, word, measurement and "Fix: Must 1"), "Remediation plan" on the right in the author's order
  (group heads, numbered steps, target tags); an SVG wire runs from each named row to its step, coloured by the
  target's tone, and selecting either end brings its wires forward. A row opens its finding in place. At 390 the
  wires go and the two sides stack; the tags and "Fix:" references carry the link.
- **C: Reuse — datasheet, matrix, piles.** 048 C's datasheet as four cells: Score, Verdict (chip), Coverage
  Score, Infrastructure Score (a missing one is hatched). Then "Dimension coverage" with the tally beside the
  large meter. Then 048 C's matrix shape with the dimensions placed by Measurement rows (Code, LLM Judge, Human)
  × state columns (Covered, Partial, Missing), each a toned chip that opens a dock. Then the components as a
  strip of chips (square, name, the file's word). Then 044 E's piles: three columns (Must fix, Should fix, Nice
  to have), one segment per step in the author's order, toned by the state of what it names (neutral when it
  names nothing), an empty group a dashed box over "0"; a segment opens the step in a dock. Then the bars, with
  the plan as a numbered bar.

### Where each mark comes from
| Mark | Source in the EVAL-REVIEW file |
|------|--------------------------------|
| Score numeral, A's waffle | `**Overall Score:** {n}/{of}` (the waffle only when `of` is 100); absent: no numeral |
| Verdict chip | `**Verdict:**`, verbatim, toned by GSD's four words; absent or other: "Verdict not stated" |
| Sub-scores, AI-SPEC present, Audited | `**Coverage Score:**`, `**Infrastructure Score:**`, `**AI-SPEC Present:**`, `**Audit Date:**`, verbatim |
| Dimension tiles, rows, matrix chips, tally, meter | the Dimension Coverage table: Dimension, Status, Measurement, Finding |
| Component tiles, rows, chips | the Infrastructure Audit table: Component, Status (the file's word), Finding |
| Plan lanes, ledger right side, C's piles | the Remediation Plan's `###` groups and their `N.` items, in order |
| Target tags, B's wires, C's segment tones | a step that opens with a dimension's or component's name and a colon |
| Closed bars | Critical Gaps, Files Found and any other `##` section the page does not claim |

## Layout contract
Measured in headless Chrome from the file, state 04, light theme; the page column is 1178px at 1280 (x=51)
and 358px at 390 (x=16).

**A: Score waffle**
- 1280px: the hero is 1178 by 286px (the 236px waffle of 20px cells at x=76, the side beside it); the dimension
  ribbon is 1178 by 105px, five 235px tiles; the infrastructure ribbon 82px; the runbook three 382px lanes (280px).
- 390px: the hero stacks (550px; the waffle 288px square); ribbons become lists (dimension rows 60px, with the
  band as an 8px left edge); the lanes stack (817px).

**B: Gap → fix ledger**
- 1280px: the head is 1178 by 150px over a 2px rule; the ledger is 1178 by 692px: the findings column 451px
  (dimension rows 60px, component rows 38px), a 96px wire gutter, the plan column 631px at x=598.
- 390px: the head is 262px; the ledger stacks to 1522px, no wires; a plan step is about 143px.

**C: Reuse — datasheet, matrix, piles**
- 1280px: the sheet is 1178 by 85px, four 293px cells; the matrix 1178 by 231px (a 96px label column, three
  state columns); the component strip wraps on one 60px line; the piles board 260px with 192px columns.
- 390px: the sheet is two by two (183px); the matrix keeps four columns (350px, chips wrap); the strip wraps to
  195px; pile columns are 103px.

## Font sizes
Measured at 1280 and 390 in both themes and all three states, text of the page only (the app shell and the
sketch bar are outside the page): exactly four sizes in every variant; at 390 the display size falls to 44.8px.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | the score numeral, the large verdict chip, the tally, section `h2`, lane and pile counts, C's sub-score values |
| Body | `--fs-4` | 13.12px | dimension and component names, findings, plan steps, bar titles |
| Label | `--fs-2` | 11.2px | eyebrow, crumbs, meta, chips, state words, measurement, micro-labels, target tags, keys |

## What to Look For
- 04: which first screen says "64, needs work, and Usable as sent is the gap" fastest: the waffle and ribbons
  (A), the wired ledger (B), or the datasheet and matrix (C)?
- 03: every dimension Missing and NOT IMPLEMENTED: does each read as "nothing was planned" rather than as a page
  in alarm (no destructive red anywhere)?
- B: are the wires worth it, or do the tags on each step say enough?
- No score: is it clear the file states no score, rather than that something broke?

## Open points for the build
- The `h1` is the phase name after "EVAL-REVIEW — Phase N:"; 10-20 confirms against `splitPhaseTitle`.
- "{c} covered, {p} partial, {m} missing" follows the UI-SPEC example's shape; "{c} of {t} dimensions covered"
  (the meter caption), "Measured by {x}", "Measured", "Fix: Must 1", "In the plan", "What the audit found",
  the piles' key and "Not stated" in C's hatched cells are sketch words, not UI-SPEC copy.
- The step-to-target match is a leading-name rule; a step that names its target elsewhere in the sentence shows
  no tag.
- GSD calls PARTIAL "WARNING" and MISSING "BLOCKER" in its own scoring; the page uses the file's words.

All text is the made-up Lendshed EVAL-REVIEW files (test/fixtures/lendshed, 10-07), verbatim; the No score
state is 04 with two head lines removed. The repository is public.

## Winner
**B: Gap → fix ledger**, chosen by the user at the 10-15 checkpoint: "B for both". No synthesis.

Build B as drawn in its tab (marked "★ Selected"; the sketch now opens on it):
- **The ruled head:** "Score" with "{n} of {of}" (mono, Heading) and "Verdict" with the large verdict chip;
  with no score only the quiet "Verdict not stated" chip. Under it the tally "{c} covered, {p} partial,
  {m} missing" beside the `status-meter`, then the file's Coverage Score, Infrastructure Score and AI-SPEC
  Present as written.
- **The ledger:** left, "Dimension coverage" rows (square, name, the state word, the measurement, "Fix: {group}
  {n}") and then smaller "Infrastructure audit" rows (square, name, the file's own word); a row opens its finding
  in place. Right, the "Remediation plan" in the author's order: group heads with counts (an empty group a dashed
  "0"), numbered steps verbatim, a target tag (square + name) on a step that opens with a dimension's or
  component's name. An SVG wire runs from each named row to its step, stroked in the target's tone; selecting
  either end brings its wires forward.
- **Below:** Critical Gaps, Files Found and anything unclaimed as closed bars.
- **At 390px (under 52rem):** no wires; the two sides stack and the tags and "Fix:" references carry the link.
