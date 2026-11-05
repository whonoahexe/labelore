---
sketch: 051
name: browser-check-page
question: "How should the Browser check page put the outcome first, with Verified, Nothing to report and Could not look plainly different in shape and words (not colour alone), then the passed, failed and needs-review counts and every criterion with what was observed, failed first, as a picture?"
winner: "A"
tags: [dom-verify, browser-check, outcome, criteria, phase-10]
---

# Sketch 051: Browser check page

## Design Question
Phase 10 D-14 and D-15; UI-SPEC section 5 Browser check "must show", Tone mapping (Browser check), Accessibility
(could not look vs nothing to report), the Browser check copy rows; RESEARCH C5 (the target and time are shown only
when the body states them; never a file date). The reader's first question is **"did the browser look, and what did
it find?"** The outcome comes first, and its three values must read as three different things:

- **Verified**: `complete`, a check-circle icon, a solid tinted chip.
- **Nothing to report**: `quiet`, a minus-circle icon, a dashed chip, its reason as a sentence ("Nothing to report:
  this wave had no UI acceptance criteria.") and `reason: no_criteria` in mono. It is a clean result with nothing to
  check, not a pass.
- **Could not look**: `in-flight`, an eye-off icon, a 2px solid chip, its reason as a sentence ("Could not look:
  nothing was serving the target. Start it, then rerun the browser check.") and `reason: target_unreachable` in mono.
  It is waiting on a person, not a failure.

Neither of the last two carries a `complete` tone or an accent mark anywhere, in any variant. Then come the Passed,
Failed and Needs review counts as Heading numerals with squares (a zero is "0" on a dashed square), or "No criteria
were checked." for the two non-pass outcomes. Then each criterion, grouped failed first, then needs review, then
passed, with what was observed (failed ones quote what was seen).

## Frames this sketch must not reuse
How 041 to 050's winners are framed:
- **041 B (Project):** a masthead (identity left, core value in a framed card), count tiles, a decision spine with a
  sticky margin.
- **042 A with 043 to 046 (Codebase):** a left rail of panels beside one column; inside it, the shipped lane
  diagram and clean tree (043), risk piles (044 E), chips and lanes (045 C), rule piles and a test tree (046 B).
- **047 B (Spec):** a strip of column gauges over a requirement × field matrix and a scope fence.
- **048 C (AI spec):** a datasheet over a section strip and a measurement × priority matrix.
- **049 B (User setup):** a ruled head over a map: a dashboard tree ("Get it from") beside a file card ("Goes in").
- **050 B (Eval review):** a ruled head over a two-sided ledger, findings left wired to plan steps right.
- **016 A (Validation, the nearest frame):** cover cells, how it's tested, wave lanes with an inspector, human-check
  cards, a sign-off.

051's three are a **place** picture (A: the window the check looked through), a **quantity** picture built from
shipped and chosen parts (B: the outcome chip, the `status-meter`, 044 E's piles), and a **path** picture (C: the
route the check took through GSD's two questions to its outcome). None has a rail, a masthead, a datasheet, a
matrix, a ledger with wires, cover cells or wave lanes.

## How to View
open .planning/sketches/051-browser-check-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`).
- The State bar (`?state=03|01|02|pair|none|raw`):
  - **03 Verified**: 03-DOM-VERIFY, wave 2. 7 checked: 4 passed, 2 failed, 1 needs review; the targets `/desk`
    and `/stewards/{id}` from the body.
  - **01 Could not look**: 01-DOM-VERIFY, wave 2, `target_unreachable`; the target
    `http://localhost:4871/sign-in` from the body.
  - **02 Nothing to report**: 02-DOM-VERIFY, wave 1, `no_criteria`; no target in the body.
  - **01 beside 02**: the two on one screen (the Sketch Gate's hardest pair), each drawn as its own page would
    draw it. Sketch-only framing; the app never shows two files on one page.
  - **No outcome**: 03 with its `outcome` and `reason` lines removed (sketch-made). The quiet "Outcome not stated";
    the counts and criteria still render.
  - **Other reason**: 01 with `reason: profile_locked` and its body removed (sketch-made; `profile_locked` is one of
    GSD's own reasons, with no sentence in the copy table). Only the raw value shows, in mono.
- A criterion opens what was observed on demand: A, a tile opens a dock under the window; B, a pile segment opens
  a dock under the board; C, a row opens in place.

## Shared across all three
- Header: ArtifactHeader as today (crumbs Lendshed / Phase N / Browser check, eyebrow "Phase N · Browser check",
  the phase name from the roadmap as the `h1`, copy path, View / Source), with "Wave {n}" and, when the body names
  one, the target as mono text. No time: the files state none, and a file date is never used.
- Copy verbatim: "Verified", "Nothing to report", "Could not look", the two reason sentences, "Passed", "Failed",
  "Needs review", "No criteria were checked.", "Outcome not stated".
- The outcome chip's accessible name carries the reason ("Outcome: Could not look: target unreachable").
- Counts are the file's `passed`, `failed` and `needs_review`, never recomputed; on Could not look and Nothing to
  report with no criteria in the body they give way to "No criteria were checked."
- Tones: passed `complete`, failed `missing` (a 2px `--missing-fill` outline), needs review `in-flight`; a zero is a
  dashed `quiet` square. Never `destructive` or `warning`. Could not look's shut view uses `--in-flight-fill` for its
  icon only.
- Below the picture: "What the check wrote" (the body's paragraphs) as a closed bar.
- Accent: the eyebrow and `complete` marks only (the Verified chip, passed squares, tiles and segments). No colour
  literal in the file.

## Variants
- **A: Browser window.** The check drawn as the window it looked through. The window's bar holds the outcome chip
  (large) and the address field with the target(s) from the body (an empty dashed field when there is none). Inside,
  on Verified: the criteria as tiles grouped Failed, Needs review, Passed, each showing what was seen as a boxed mono
  "element" (`Remove member`) and, when the line quotes the contract, "Contract “Delete member”"; a line with no
  quoted value shows its first two lines. On Could not look the view is **shut** (hatched, the eye-off icon, the
  reason sentence and raw value on a card); on Nothing to report it is **blank** (a dashed inner frame, the
  minus-circle icon, the reason). The counts sit in the window's status bar with "{n} checked". At 390 the tiles
  stack in one column and the status bar wraps.
- **B: Reuse — chip, meter, piles.** A two-part head: "Outcome" with the large chip, the reason sentence and raw value
  on the left; the `status-meter` (one square per criterion, failed first, "7 criteria checked") over the three
  counts on the right. Then 044 E's piles on a board: Failed, Needs review, Passed, one segment per criterion, the
  count under each column; a segment opens the criterion in a dock. On the two non-pass outcomes the board is shut
  (hatched, eye-off) or blank (dashed frame, minus-circle) over "No criteria were checked.". At 390 the head stacks.
- **C: Route map.** "Outcome" with the large chip, then a route through GSD's two questions: the wave (with its
  target) → "UI criteria to check?" → "Could the browser look?" → Verified, with "No" branches dropping to Nothing to
  report and Could not look. The path the file records is drawn solid and its end is framed and filled in (the
  counts on Verified; the reason and "No criteria were checked." on the other two); the other ends stay as dashed,
  untoned words. 01 beside 02 shows the two ends on different branches. Then "Criteria" as a receipt, failed first:
  number, what was seen, the contract quote; a row opens the full observation in place. Under 44rem of its own width
  the route folds to two columns (questions down the left, "No" ends to the right).

### Where each mark comes from
| Mark | Source in the DOM-VERIFY file |
|------|-------------------------------|
| Outcome chip | frontmatter `outcome` (`verified`, `nothing_to_report`, `could_not_look`); absent: "Outcome not stated"; any other value: shown raw in mono on a quiet chip |
| Reason sentence and mono value | frontmatter `reason`: `target_unreachable` and `no_criteria` take the copy table's sentence; any other value shows raw only; `ok` shows nothing |
| Counts, "{n} checked" | frontmatter `passed`, `failed`, `needs_review`, `checked`, as written |
| Criteria tiles, segments, rows | each `- ` list item that opens with its result (`passed:`, `**failed**:`, `` `needs_review` ``:), in file order inside its group |
| Boxed "element" (what was seen) | the item's backticked values |
| "Contract “…”" | the item's first double-quoted value |
| Target (header, A's address field, C's first node) | backticked values in the body's paragraphs that start with `/` or `http` |
| Wave, Phase | frontmatter `wave`; the `# DOM verification: Phase N, wave W` title |
| What the check wrote | the body's paragraphs, verbatim |

## Layout contract
Measured in headless Chrome from the file, light theme; the page column is 1178px at 1280 (x=51) and 358px at 390
(x=16).

**A: Browser window**
- 1280px, 03: the window is 1178 by 470px (bar 64px, view 354px, status bar 50px); tiles are 278 by 80px on an
  auto-fill grid. 01: the window is 337px (the shut view 224px).
- 390px, 03: the window is 358 by 827px (bar 104px with the address field on its own line, tiles 332px wide in one
  column, status bar 108px). 01: 345px.

**B: Reuse — chip, meter, piles**
- 1280px, 03: the head is 1178 by 84px, the meter-and-counts half 573px at x=656 behind a 1px rule; the board is
  292px with 192px pile columns and 24px segments. 01 and 02: the board is 163px.
- 390px, 03: the head stacks (208px); pile columns are 103px with 20px segments; the board is 260px.

**C: Route map**
- 1280px, 03: the outcome line is 43px; the route is 1178 by 281px, four 252px node columns in two rows; receipt
  rows are 43px. 01: the route is 336px (the lit end 176px tall).
- 390px, 03: the route folds to two 146px columns (542px tall); receipt rows are 65px. 01: 621px.

No variant scrolls sideways at 390 in any state or theme; mono paths end-ellipsise with the full value in `title`.

## Font sizes
Measured at 1280 and 390 in both themes and all six states, text of the page only (the app shell and the sketch bar
are outside the page): exactly four sizes in every variant; at 390 the display size falls to 44.8px. The 01 beside
02 state has no `h1` (each side's name is a Heading), so it uses three.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | the large outcome chip, the count numerals, "Criteria", the pair state's names |
| Body | `--fs-4` | 13.12px | reason sentences, what was seen, observations, route questions, bar titles |
| Label | `--fs-2` | 11.2px | eyebrow, crumbs, meta, small chips, raw reason values, micro-labels, "Contract “…”", route Yes/No |

## What to Look For
- 01 beside 02: which variant makes "it could not look" and "there was nothing to look at" read as two different
  things fastest: the shut versus blank window (A), the shut versus blank board (B), or the two different branches
  (C)?
- 03: is "2 failed, and here is what the page actually said" the first thing you take in?
- Does Could not look read as waiting on you (start the server, rerun), not as a failure, in every variant?
- C: is the route worth its height, or does it say more than the chip and the reason already do?

## Open points for the build
- The `h1` is the phase name from the roadmap; the file's own title ("DOM verification: Phase N, wave W") gives only
  the phase and wave. 10-21 confirms the title source.
- The target is read from backticked paths and URLs in the body; a body that names its target in plain text shows
  none. No time is shown: the files state none.
- "What was seen" (backticked values) and "Contract “…”" (the first double-quoted value) are best-effort reads of one
  sentence; a line with neither shows its text.
- Sketch words, not UI-SPEC copy: "{n} checked", "{n} criteria checked", "Criterion {n} of {t}", "Contract “…”",
  "What the check wrote", "One segment per criterion, failed first", "No criteria in the file.", the route's "UI
  criteria to check?" and "Could the browser look?".
- A DOM-VERIFY file is per wave; a phase with several waves has several files. Which one a Phase page links to is
  10-21's call.

All text is the made-up Lendshed DOM-VERIFY files (test/fixtures/lendshed, 10-07), verbatim; the No outcome and
Other reason states are sketch-made edits of 03 and 01. The repository is public.

## Winner
**A: Browser window**, chosen by the user at the 10-17 checkpoint: "A looks good for both". No synthesis.

Build A as drawn in its tab (marked "★ Selected"; the sketch opens on it):
- **The window:** one framed figure (1px `--foreground` border). Its bar holds three decorative squares, the
  outcome chip at Heading size (icon, word; the accessible name carries the reason) and an address field with the
  target(s) the body names as mono paths that end-ellipsise (an empty dashed field when the body names none).
- **Inside, Verified (or any file with criteria):** the criteria as tiles grouped Failed, Needs review, Passed, each
  group headed by its square, word and count. A tile shows what was seen as boxed mono values and, when the line
  quotes the contract, "Contract “…”"; a line with neither shows its first two lines. A tile's top edge carries its
  tone (failed a double `--missing-fill` rule on a `--missing-border` frame). A tile opens the full observation in
  a dock under the window.
- **Inside, Could not look:** the view is shut: `--hatch`, the eye-off icon in `--in-flight-fill`, and a card with
  the reason sentence and `reason: {value}` in mono (raw value only for a reason with no sentence).
- **Inside, Nothing to report:** the view is blank: a dashed inner frame, the minus-circle icon in the muted
  foreground, the same reason card.
- **The status bar:** the three counts (square, Heading numeral, word; a zero on a dashed square) with
  "{n} checked", or "No criteria were checked." on the two non-pass outcomes.
- **No outcome:** the bar's chip is the quiet "Outcome not stated"; the tiles and counts still render.
- **Below:** "What the check wrote" (the body's paragraphs) as a closed bar.
- **At 390px:** the address field wraps under the chip, tiles stack one per row, the status bar wraps.
