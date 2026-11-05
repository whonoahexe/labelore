---
sketch: 049
name: user-setup-page
question: "How should the User setup page show how many setup steps are done and where you are, where each variable goes and where to get it (never its value), and the file's own Status line when it disagrees with its boxes, as a picture rather than a checklist of text?"
winner: null
tags: [user-setup, steps, env-vars, phase-10]
---

# Sketch 049: User setup page

## Design Question
Phase 10 D-14 and D-15; UI-SPEC section 4 User setup "must show", Tone mapping (User setup), section 9
(value hiding), the User setup copy rows. The reader's first question is **"how many setup steps are done, and
where am I?"**: the lead "{d} of {t} steps done" with the segmented `status-meter`, each step's status (done
`complete`, pending `in-flight`, a step the page cannot classify `quiet`), and every variable's name in mono with
"Goes in {file}", "Get it from {where}" and, where the file writes a value, the quiet "Value not shown" mark.
Step instructions are collapsed per step with the title and status always visible. When the file's own
`**Status:**` line disagrees with its boxes, both are shown side by side, never merged ("keep disagreeing signals
separate"), in a quiet tone: nothing on this page is `missing`.

## How 041 to 048's winners are framed (the frames this sketch must not reuse)
- **041 B (project page):** a masthead (identity left, core value in a framed card right), four count tiles, the
  decisions on a vertical spine, a sticky margin.
- **042 A with 043 to 046 (Codebase page):** a left rail of map facts and the seven-panel list beside one main
  column; 043 reuse (lane diagram, clean tree, swaps), 044 E risk piles, 045 C chips and lanes, 046 B rule piles
  and test tree, all drawn inside that column.
- **047 B (Spec page):** a strip of five column gauges across the page, then a requirements × evidence matrix,
  then a hard-ruled scope fence.
- **048 C (AI spec page):** a datasheet of four big field cells, then a lead over a section-square strip beside
  the large checklist meter, then a measurement × priority matrix with a dock, then bars.

049's three are a **sequence** picture (A: every step a station on one line), a **place** picture (B: the
dashboard paths as a tree beside the file the variables go in), and a **count** picture built from shipped and
already-chosen parts (C). None has a left rail, a spine, a masthead with a side card, a gauge strip or a matrix.
C borrows 048 C's datasheet as its head row but not 048 C's page: under it sit piles, name tags and bars, not a
section strip and a matrix.

## How to View
open .planning/sketches/049-user-setup-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`).
- The State bar (`?state=04|02|none`):
  - **04 Three of six**: 04-USER-SETUP. Three variables (two ticked), one account step (ticked), two dashboard
    steps (open): "3 of 6 steps done". Its Status line says **Complete** while three boxes are open, so the
    disagreement shows. `LOANNOTE_MODEL_KEY` is written with a value in the file; the page shows its name and
    "Value not shown".
  - **02 All pending**: 02-USER-SETUP, "0 of 3 steps done", Status Incomplete (agrees with the boxes, so it is
    shown as a plain "Status line" chip and no disagreement block).
  - **No steps**: 02-USER-SETUP with its Status column and checkbox removed (a sketch-made state; no fixture has
    it). No lead: the quiet chip "Steps not stated"; the variables are still listed (name, Goes in, Get it from),
    each with a dashed `quiet` square.
- Every picture opens a step in a dock on selection (A a station, B a tree leaf or a file line, C a pile segment
  or a name tag). It opens on the first open step.

## Shared across all three
- Header: ArtifactHeader as today (crumbs Lendshed / Phase N / User setup, eyebrow "Phase N · User setup", the
  title after "Phase N:" as the `h1`, copy path, View / Source), with "Generated {date}" and the file's
  `**Phase:**` slug in the meta row.
- Copy verbatim: "{d} of {t} steps done", "Goes in {file}", "Get it from {where}", "Value not shown".
- The meter is 048's `status-meter`, drawn once (one square per step, done `complete`, pending `in-flight`, not
  stated `quiet` dashed; one accessible name, cells hidden).
- **Value hiding.** A variable cell that reads `NAME=...` gives the page a name and the fact that a value is
  written; the value is dropped in the reader, before anything renders, and never reaches a `title`, an
  `aria-label` or a copy button. In this file the 04 value was replaced by an ellipsis when the fixture was
  embedded, so the planted string is not in the sketch at all (the plan's copy check fails if it is).
- **The disagreement** is a dashed, untinted block: "The Status line says Complete" ≠ "The boxes say 3 of 6
  ticked", and one quiet line under it ("These disagree: the file is marked Complete with 3 boxes still open.
  Both are shown as written."). No `in-flight`, `missing`, `destructive` or `warning` tone on it.
- Below the picture: "Steps" as closed bars grouped by the file's sections (square, title, status word, the
  "Value not shown" chip on a variable that has one); a bar opens to the step's fields as written. Local
  Development and Verification are plain bars; their fenced commands use the shipped copy-command row (10-10).
  The intro paragraph and the "Once all items complete" footer are in "In the source only".
- Accent: the eyebrow and the done squares only. No colour literal in the file (tokens and `color-mix` of tokens).

## Variants
- **A: Step track.** The lead (Heading) and the meter beside the disagreement block. Then the track: one bordered
  band per section (Environment Variables, Account Setup, Dashboard Configuration), widths in proportion to their
  step counts, each with "{d}/{t}" in its head; every step is a station on one line (a 24px toned square, the
  title under it, the status word, the "Value not shown" tag under a valued variable). The first open step
  carries a "First open" flag. The selected station's dock sits under the track; then the bars. At 390 the
  bands stack and each becomes a vertical runbook (squares on a vertical line, title beside).
- **B: Where everything goes.** A ruled head (the lead and meter, the disagreement). Then a map: "Get it from" on
  the left is a clean tree of every dashboard path the file names (`Association model host` → Settings →
  Access keys …), each step a leaf with its square, the path's last segment muted and the step's title (a
  variable leaf adds "→ .env.local"); a folder with one sub-folder and nothing of its own is joined to it
  ("Models → Small"). "Goes in" on the right is a card per file (`.env.local`, "2 of 3 set") with one numbered
  line per variable (square, name, "Value not shown"). The dock sits under the file card. Then the bars.
- **C: Reuse — datasheet, piles, tags.** 048 C's datasheet as a four-cell head row: Steps done ("3 of 6", mono),
  Status line ("Complete", with the quiet chip "Disagrees with the boxes"; both cells get a dashed inner outline
  when they disagree), Variables (count, "Goes in .env.local"), Generated. Then 044 E's piles: one column per
  section, one segment per step stacked from the baseline, "{d}/{t}" under each column, the meter in the board
  bar; a segment opens the dock. Then 045 C's variable name tags (square, name, "Value not shown", Goes in, Get
  it from). Then the bars.

### Where each mark comes from
| Mark | Source in the USER-SETUP file |
|------|-------------------------------|
| Lead, meter, A's stations, C's segments and per-column counts | every Environment Variables row with a Status box (`[x]` / `[ ]`) and every `- [x]` / `- [ ]` item under any `##` section; a box that is neither is "Not stated" (`quiet`) |
| Step title | the backticked variable name, or the item's bold text |
| Step fields in the dock and bars | a variable's Source and Add to cells; an item's indented `- URL:`, `- Location:`, `- Set to:`, `- Notes:`, `- Skip if:` lines, verbatim |
| "Value not shown" | a Variable cell written `NAME=...` (the value is dropped by the reader) |
| The disagreement block | the head's `**Status:**` line against the box count: "Complete" with any box open, or "Incomplete" with every box ticked |
| B's tree | a variable's Source path and an item's Location path, split at " → "; an item with only a URL joins the place whose other steps share that URL's host (04's account step); anything else waits under "No place stated" |
| B's file cards, C's Variables cell | the Add to cell, grouped |
| Plain bars | Local Development, Verification and any other `##` section with no table or boxes; fenced commands as copy-command rows, `#` comment lines as notes |

## Layout contract
Measured in headless Chrome from the file, state 04, light theme; the page column is 1178px at 1280 (x=51)
and 358px at 390 (x=16).

**A: Step track**
- 1280px: the head row is 1178 by 128px (lead and meter left, the 573px disagreement block right at x=656). The
  track is 1178 by 217px, three bands at 3fr / 1fr / 2fr; a station is about 191px wide and 140px tall with a
  24px square. The dock is full width (186px tall); bars are 41px.
- 390px: the head stacks (238px; the disagreement 153px); the track stacks to 518px, a station is a 56px row
  (square, title, status word; the flag at the row's right); no sideways scroll.

**B: Where everything goes**
- 1280px: the head is 1178 by 146px over a 2px rule. The map is 1178 by 430px: the tree 664px wide (rows 32px,
  each level indented by 20px with a hairline guide), a 40px arrow gutter, then the 474px file column at x=755
  (lines 40px) with the dock under it.
- 390px: the head stacks (248px); the map stacks to 1068px (tree 536px, then the file card, then the dock), no
  arrow; a file line is 55px with its marks under the name.

**C: Reuse — datasheet, piles, tags**
- 1280px: the sheet is 1178 by 118px, four 293px cells; the piles board is 1178 by 304px with columns capped at
  160px (segments 24px tall); name tags are 445px wide, wrapping.
- 390px: the sheet is two by two (257px); pile columns are 103px (segments 16px); the tags stack at 358px.

## Font sizes
Measured at 1280 and 390 in both themes and all three states, text of the page only (the app shell and the
sketch bar are outside the page): exactly four sizes in every variant; at 390 the display size falls to 44.8px.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px | the `h1` only |
| Heading | `--fs-7` | 20.8px | the lead line, section `h2`, the disagreement's two values, C's cell values and pile counts |
| Body | `--fs-4` | 13.12px | step titles, field values, tree rows, file lines, bar titles, prose |
| Label | `--fs-2` | 11.2px | eyebrow, crumbs, meta, chips, micro-labels, station titles and status words (A), keys, links |

## What to Look For
- 04: which picture says "3 of 6, and the key and the two dashboard steps are what's left" fastest: a track of
  stations (A), the places you have to visit (B), or piles per section (C)?
- The disagreement: does "Complete" ≠ "3 of 6 ticked" read as a note worth seeing rather than an error?
- B: is the dashboard tree worth the height, or would the destinations alone (the file card) be enough?
- No steps: does each variant read as "this file lists variables but no steps" rather than as broken?

## Open points for the build
- The `h1` is "User Setup Required" (the title after "Phase N:"); the build may prefer the phase's name.
- "First open", "Done" / "Pending" / "Not stated", "Steps not stated", "The Status line says" / "The boxes say",
  "These disagree: …", "Disagrees with the boxes", "Select a step to read what it asks for.", "No place stated",
  "{d} of {t} set" and "Status line" are sketch words, not UI-SPEC copy.
- B's host match for a URL-only step is a heuristic; the build may leave such a step at the top of the tree.
- Source mode, search snippets and the index still hold the raw file, so a written value reaches them (Phase 6
  masks only `config.json`). The UI-SPEC asks the plan to record that as an open item, not to fix it here.

All text is the made-up Lendshed USER-SETUP files (test/fixtures/lendshed, 10-04), verbatim, except the one
value written beside `LOANNOTE_MODEL_KEY`, replaced before embedding, and the sketch-made No steps state. The
repository is public.

## Winner
Pending the user's choice at the 10-15 checkpoint.
