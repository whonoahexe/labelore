---
sketch: 053
name: spikes-page
question: "How should the one Spikes page lead with the manifest's verdict board grouped by idea (validated, partial, invalidated, pending, keeping the free text after the keyword), open each spike README, CONVENTIONS and WRAP-UP as a panel with its own URL, and list scripts and outputs by name only, as a picture?"
winner: "A"
tags: [spikes, exploration, verdicts, panels, phase-11]
---

# Sketch 053: Spikes page

## Design Question
Phase 11 D-01 (VIEW-14). One page in the frame + panel model of Research and Codebase: the manifest's verdict board,
grouped by idea, leads; each spike README, `CONVENTIONS.md` and `WRAP-UP-SUMMARY.md` is a panel at its own URL
(`/<project>/spikes/<NNN-name>`). Spike scripts and outputs are listed by name only, never run or rendered.

Real shape (read for shape only, from the one real spikes tree on this machine, which is private work and is not
copied): the manifest has `## Ideas` (a paragraph and a Requirements list per idea) and a `## Spikes` table with
`# | Idea | Name | Type | Validates | Verdict | Tags`, where Verdict reads `KEYWORD (free text)`. Ids carry
letter families for comparisons (`001a`, `001b`, `001c`) and can be out of order in the table. Each README has
frontmatter `spike, idea, name, type, validates (Given…, when…, then…), verdict, related, tags` and sections
What This Validates, Research, Investigation Trail, Results, How to Run, Signals for the Build. Scripts
(`make_proxy.sh`) sit beside the README. `/gsd-spike --wrap-up` adds `WRAP-UP-SUMMARY.md` (Processed Spikes, Key
Findings) and `CONVENTIONS.md` (Stack, Structure, Patterns, Tools & Libraries).

## How to View
open .planning/sketches/053-spikes-page/index.html

- Tabs `#a`, `#b`, `#c`; a panel opens at `#a/003b` and so on (the page's address line shows
  `/lendshed/spikes/003b-local-disk-staging`). Light and Dark (`?theme=dark`). Esc closes a panel.
- State bar (`?state=lendshed|single`):
  - **Three ideas, wrapped up, one orphan, one disagreement** (made-up Lendshed): 9 spikes across
    `loan-export-archive`, `overdue-reminders` and `barcode-check-in`; two letter families (003a/b, 006a/b); 003b's
    manifest row says VALIDATED while its README frontmatter still says PENDING; folder `008-label-printer-driver`
    has no manifest row; the wrap-up processed 001 to 003b.
  - **One idea, letter family, no wrap-up** (made-up, in the real tree's shape): `receipt-printing` with
    001a/001b/001c and 002, table out of id order, no validated spike, no wrap-up files.

## Shared across all three
- Header: crumbs Lendshed / Spikes, eyebrow "Exploration · Spikes", h1 "Spikes", counts (ideas, spikes, not in the
  manifest), "Wrapped up {date}" or "Not wrapped up", the panel's address, copy manifest path, and a lead line
  "3 validated · 2 partial · 3 invalidated · 1 pending".
- Verdict tones: VALIDATED `complete`, PARTIAL `in-flight`, INVALIDATED `missing`, PENDING `quiet`, no row
  `neutral` dashed. Never `destructive`. The keyword groups; the text after it is shown as written.
- The spike panel: id · idea · type, name, big verdict chip and its free text; a dashed "Manifest says ≠ README
  says" block when the two differ (never merged); What this validates split into Given / When / Then; Results as
  written; Related as chips that open their panel; "Files in {NNN-name}/" (name, kind notes|script|output, size)
  with "Listed by name only. Labelore never runs or opens these files."; tags; the remaining sections as closed bars.
- Wrap-up panel: processed spikes as chips, key findings, the skill it packaged into, and which spikes were not
  processed. Conventions panel: its four sections.

## Variants
- **A: Verdict board.** Ideas are lanes, the four verdicts are columns with a big count over each. Each spike is a
  tile (id, type, name, free text, file count, "README says …" flag, "wrapped up"). An idea's requirements open
  under its lane. Below: "Not in the manifest" and "Wrap-up" tiles. A tile opens its panel in a sheet from the
  right; under 48rem the board becomes one stack per idea with verdict labels, skipping empty columns.
- **B: Idea map.** One figure per idea: the idea node (requirements open on click), its spikes in id order with a
  letter family boxed as "one question, N answers", `related` drawn as dashed wires above the spikes (a bracket
  inside a family), and the processed spikes feeding a bus line into a Wrap-up node (Conventions beside it). A node
  opens its panel in place under that figure. Under 52rem it becomes an indented tree with no wires.
- **C: Reuse — rail + piles.** 042 A's rail + column: the rail lists Board, then each idea's spikes, then Not in
  the manifest and Wrap-up. The Board panel is 044 E's piles: one pile per verdict, a segment per spike (ringed when
  its README disagrees), the count on the base; idea cards with their requirements below. Selecting a rail entry
  or a segment swaps the column. Under 48rem the rail becomes a row of buttons.

## What to Look For
- Which first screen answers "what did we try, and what came out of it?" fastest: the grid (A), the shape of each
  idea's exploration (B), or the pile heights (C)?
- Does the free text after the keyword (`no bucket in the shed’s plan`) read as part of the verdict?
- Do letter families read as alternatives to one question? Only B draws them; A and C show the id and type.
- Does 003b's disagreement read as a fact about the files, not an error?
- With no wrap-up and no validated spike (single state), does the page still feel finished?
- Sheet (A), in place (B) or swap the column (C): which way of opening a spike keeps the board in mind?

## Open points for the build
- The verdict keyword is the manifest cell's first word; free text is anything in the parentheses that follow. A
  README frontmatter verdict that differs is shown beside it, never merged.
- A folder under `spikes/` with no manifest row is listed as "Not in the manifest", with its README's own verdict.
- "Processed" comes from WRAP-UP-SUMMARY.md's Processed Spikes list.
- File kinds: README.md and other `.md` are notes; files under `out/` (or with output-like extensions) are outputs;
  the rest are scripts. Sizes come from stat only; contents are never read.
- Sketch words, not UI-SPEC copy: "Not in the manifest", "one question, N answers", "Listed by name only…",
  "Manifest says", "README says", "Not wrapped up", "wrapped up".

All text is made up. The repository is public.

## Winner
**A: Verdict board**, chosen by the user: "A seems good". No synthesis.

Build A as drawn in its tab (marked "★ Selected"; the sketch opens on it):
- **Board:** one lane per idea (key, description, "{n} requirements +" opening the manifest's list under the lane)
  across four verdict columns (Validated, Partial, Invalidated, Pending), each with a big count over its chip.
- **Tile:** tone square, id, type, name, the free text after the keyword, file count, a dashed "README says {verdict}"
  flag when the frontmatter differs, and "wrapped up" when WRAP-UP-SUMMARY lists it.
- **Below the board:** "Not in the manifest" tiles for folders with no row, then "Wrap-up" tiles for
  WRAP-UP-SUMMARY.md and CONVENTIONS.md, or one quiet "Not wrapped up yet" line.
- **Panel:** a tile opens its panel in a sheet from the right at the spike's own URL (`/<project>/spikes/<NNN-name>`);
  Esc or the scrim closes it, and opening the URL directly opens the page with that sheet open. The panel content is
  the shared one described above.
- **Under 48rem:** one stack per idea, each verdict as a label over its tiles, empty columns skipped; a chip key
  replaces the column heads; the sheet goes full width.
