---
sketch: 047
name: spec-page
question: "How should the Spec page put the ambiguity score against the gate first (is this spec locked enough to plan?), with the dimension scores, the goal, every requirement's Current, Target and Acceptance, and the boundaries, as a picture rather than a wall of text?"
winner: null
tags: [spec, specification, ambiguity, requirements, phase-10]
---

# Sketch 047: Spec page

## Design Question
Phase 10 D-14 and D-15; UI-SPEC section 4 Spec "must show", Tone mapping (Spec), the Spec copy rows. The
reader's first question is **"is this spec locked enough to plan?"**: the ambiguity score against the gate
(GSD's gate is score ≤ 0.20), the four dimension scores against their minimums, and which requirements have
an Acceptance line. Then the goal, each requirement numbered with its label and Current, Target and
Acceptance as labelled fields, In scope and Out of scope (with their reasons), and every other section as a
plain closed bar or in the "In the source only" strip. Nothing is dropped.

## Frames this sketch must not reuse
- **041 B (project page):** a masthead (identity left, core value in a framed card right), four count tiles,
  the decisions on a vertical spine, a sticky margin for constraints.
- **042 A (Codebase page) and 043 to 046 (its panels):** a left rail (map facts and the seven-panel list)
  beside one main column; the panels draw inside that column.
- **Nearest earlier document frames:** 014 (UI-SPEC: design-system cards, a considerations matrix, a sign-off
  in a dialog) and 021 (VERIFICATION: a 017-style console rail with the big number, then ledgers and boards).

None of the three variants below has a left rail, a vertical spine, a masthead with a side card, or a
sticky margin. Each is its own page structure and each opens on a different kind of picture.

## How to View
open .planning/sketches/047-spec-page/index.html

- Tabs `#a`, `#b`, `#c` pick the variant. Light and Dark switch theme (`?theme=dark` works too).
- The State bar (`?state=01|02|03|none`):
  - **01 Locked**: 01-SPEC, 0.14 against a gate of 0.20, five requirements, all four dimensions met.
  - **02 Not locked**: 02-SPEC, 0.31 against a gate of 0.20, Constraint Clarity 0.46 below its 0.65 minimum,
    one edge and one must-not unresolved, the "Written anyway" note.
  - **03 Nine requirements**: 03-SPEC, nine requirements, requirement 6 with no Acceptance line, the score
    line states 0.18 and no gate, so the gate is GSD's 0.20 (said in a quiet line beside the numbers); no Edge
    Coverage or Prohibitions table.
  - **No score**: 01-SPEC with its score line set back to the template's own `[score]` placeholder and its
    Ambiguity Report removed (a sketch-made state; no fixture has it). No verdict but the quiet "Ambiguity not
    stated"; the requirements still render.
- A requirement opens on demand (A: a tile; B: a matrix row; C: a strip square or a card bar) and shows its
  statement, then Current, Target and Acceptance as labelled fields; a missing Acceptance is the quiet dashed
  "No acceptance stated" chip.
- A 390px window shows the phone layout; none of the three scrolls sideways at 390 in any state or theme.

## Shared across all three
- Header: ArtifactHeader as today (crumbs Lendshed / Phase N / Spec, eyebrow "Phase N · Spec", the phase
  name as the `h1`, copy path, View / Source), with "Created {date}" and "{n} requirements locked" (the file's
  `Requirements: N locked`) in the meta row.
- Verdict copy verbatim: "Locked enough to plan" (`complete`), "Not locked yet" (`in-flight`, never
  destructive or warning), "Ambiguity not stated" (`quiet`, dashed); numbers line "{score} against a gate of
  {gate}".
- Dimension rows: "Met minimum" with a `complete` square, "Below minimum" with an `in-flight` square (the
  file's ✓ and ⚠ words: "✓ = met minimum, ⚠ = below minimum"); the dimension's Notes cell is its `title`.
- Requirement fields are not toned: a stated field is a neutral square, a missing one a dashed `quiet`
  square; Acceptance missing shows "No acceptance stated".
- Boundaries: In scope with a `complete` square, Out of scope with a `quiet` square, each out item keeping
  its "— reason" muted.
- Background, Constraints, Acceptance Criteria, Edge Coverage and Prohibitions (when present) are closed bars
  in document order, holding the section as plain text and tables. Interview Log is in the "In the source
  only" strip. The footer lines after the last rule are left to Source.
- Accent is spent on the eyebrow and `complete` marks only (the locked verdict, met-minimum squares, In
  scope squares, C's locked radar shape). No `destructive`, `warning` or `missing` tone anywhere; no colour
  literal in the file (tokens and `color-mix` of tokens; the hatch is `--border`).

## Variants
- **A: Gate gauge.** A full-bleed instrument band under the header is the first screen: the verdict at
  Heading size with the numbers line, then one horizontal scale (0.00 to 0.50) with the hatched gate zone
  ending in a hard line at the gate, the score as a filled bar ending in a toned square; under it the four
  dimensions as bullet bars (score fill, a black tick at the minimum, the status word). "Read why it was
  written anyway" opens the report's note in place (02). Below the band, one centred reading column: the goal
  set large, the requirements as a ladder of numbered tiles (label, three C/T/A field squares, the quiet chip
  when Acceptance is missing) whose dock opens under the ladder, the boundaries as two lists, then the bars.
- **B: Lock matrix.** A score strip of five column gauges across the page: the ambiguity column (lower is
  better, it must stay under the gate line) beside the verdict, then one column per dimension with its
  minimum as a line. Then a requirements × evidence matrix: Current, Target, Acceptance (field squares) and,
  when the spec has them, Edges and Must-not (one square per Edge Coverage or Prohibitions row naming that
  requirement, toned covered/backstop/resolved `complete`, unresolved `in-flight`, dismissed `quiet`). A row
  opens in place. The boundaries are a fence: In scope items as tiles inside a hard-ruled box, Out of scope
  items outside it with their reasons.
- **C: Reuse.** Built from shipped figures: the 018 B hexagon radar (`ui-review-components.tsx`) drawn with the
  four dimensions, the minimums as a dashed shape and the score shape toned by the verdict, the ambiguity score
  in the centre; beside it the verdict, the goal and the 041 B count tiles (requirements locked, with
  acceptance, no acceptance stated, in scope, out of scope). Requirements as the 015 B square strip (one square
  per requirement, dashed when Acceptance is missing) over closed cards that open to 015 B-style pairs
  (Current → Target, Acceptance under). "What the spec pins down" is 044 E's piles: one column per list (In
  scope, Out of scope, Constraints, Acceptance criteria, Edges, Must-not), one segment per item in the file's
  order, the item verbatim in a dock on selection.

### Where each mark comes from
| Mark | Source in the SPEC file |
|------|-------------------------|
| Verdict, numbers line, gauge, ambiguity column, radar centre | `**Ambiguity score:** {score} (gate: ≤ {gate})` in the head lines; gate 0.20 when a score has no gate; no verdict when the score is not a number |
| Dimension bars, columns, radar spokes and dashed shape | the Ambiguity Report table: Dimension, Score, Min, Status (✓ / ⚠), Notes; the bold Ambiguity row is the total and is not a dimension |
| "Read why it was written anyway" (A) | the Ambiguity Report's paragraphs other than the "Status:" key line |
| Requirement tiles, rows, strip squares, cards | `N. **Label**: statement` with `- Current:`, `- Target:`, `- Acceptance:` lines under it |
| "{n} requirements locked" | `**Requirements:** N locked`, else the count of numbered requirements |
| B Edges and Must-not squares, C Edges and Must-not piles | the Edge Coverage and Prohibitions tables: the `R{n}` in the Requirement column and the Status words (covered, backstop, resolved / UNRESOLVED / dismissed), emoji stripped |
| In scope, Out of scope (and the reason) | the `**In scope:**` and `**Out of scope:**` bullets under Boundaries, split at " — " |
| C Constraints and Acceptance criteria piles | Constraints bullets (a paragraph counts as one item when there are none, as in 02) and the Acceptance Criteria checkboxes |

## Layout contract
Measured in headless Chrome from the file, state 03, light theme; widths are CSS pixels of the box. The page
column is 1178px at 1280 (x=51) and 358px at 390 (x=16).

**A: Gate gauge**
- 1280px: the band is full bleed, 1280 by 315px (verdict line, the 1178px scale 80px tall, four dimension rows
  93px); the reading column is 768px wide, centred at x=256; ladder tiles are 147 by 96px, five to a row (two
  rows for nine requirements); the page is about 1790px tall.
- 390px: the band is 530px tall (each dimension row stacks: name and value, then the bar, then the status);
  the ladder is two columns of 175px tiles (486px for nine); about 2530px tall.

**B: Lock matrix**
- 1280px: the score strip is 1178 by 224px: the verdict cell 392px (with a 48px ambiguity column at its
  right), four 196px dimension cells; matrix rows are 49px; the fence is 692px (In scope) beside 461px (Out of
  scope).
- 390px: the verdict cell takes the strip's first row (163px), the four dimension cells share the second
  (89px each, the status word hidden, the square kept); a matrix row is 83px (number and label, then the three
  fields, then Edges and Must-not with their labels); the fence stacks.

**C: Reuse**
- 1280px: the head is 1178 by 461px: the radar 457px wide (SVG with a 320 unit body) left, the verdict, goal and
  tiles 639px right; strip squares 24px; card bars 57px; the piles frame is 341px tall with 112px columns.
- 390px: the head stacks to 962px (radar 320px wide, then the side); pile columns are 75px, their labels give
  way to numbers with a numbered name list under the piles.

## Font sizes
Measured at 1280 and 390 in both themes and all four states, text of the page only (the app shell and the
sketch bar are outside the page): exactly four sizes in every variant. At 390 the display size falls to 44.8px.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | section `h2`, the verdict chip (large form), the numbers line, the goal (A, B), requirement numbers, dimension values (B), tile and pile counts, the radar centre |
| Body | `--fs-4` | 13.12px | requirement labels and text, field values, boundary items, bar titles, prose |
| Label | `--fs-2` | 11.2px | eyebrow, crumbs, meta, chips, micro-labels, scale ticks, field names, radar labels, links |

## What to Look For
- Which first screen answers "is it locked?" fastest: one scale with the gate (A), five columns with lines
  (B), or a radar with the minimums as a dashed shape (C)?
- 02: does "Not locked yet" read as waiting, not failed, and is the below-minimum dimension obvious in each?
- 03: is requirement 6's missing Acceptance easy to spot among nine (A's tiles, B's matrix, C's strip)?
- B and C draw the Edge Coverage and Prohibitions rows as marks per requirement; is that worth parsing, or
  should those two sections stay plain bars (as in A)?
- No score: the page without a verdict. Is it clear the file gives no score rather than that something broke?

## Open points for the build
- The `h1` is the phase name from `splitPhaseTitle` with " — Specification" dropped (the kind label would need
  to be "Specification" for the suffix rule; 10-16 confirms).
- "Gate not stated in the file; GSD's 0.20", "Read why it was written anyway", "Met minimum" / "Below minimum",
  "Select a segment to read that item." and the matrix key are sketch words, not UI-SPEC copy.
- The B and C coverage marks read the Edge Coverage and Prohibitions tables; neither is in the UI-SPEC "must
  show" list, so the build may keep them as plain bars without breaking the contract.
- C tones the shipped radar's shape by the verdict (`complete` locked, `in-flight` not locked); the shipped
  UI-REVIEW radar always uses `--primary`.

All text is the made-up Lendshed specs (test/fixtures/lendshed, 10-04), verbatim; the No score state is
01-SPEC with the template's own placeholder. The repository is public.
