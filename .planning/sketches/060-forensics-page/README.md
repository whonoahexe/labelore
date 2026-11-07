---
sketch: 060
name: forensics-page
question: "How does a forensics report lead with its root-cause hypothesis and recommended actions, then show the anomalies by confidence and what the artifact grid found, as a picture?"
winner: B
tags: [forensics, report, phase-11]
---

# Sketch 060: Forensics page

## Design Question
Phase 11 D-03, D-16 (VIEW-18). `/gsd-forensics` writes `.planning/forensics/report-{YYYYMMDD}-{HHMMSS}.md`. The page
leads, in this order, with the **Root Cause Hypothesis** and the **Recommended Actions** (verbatim, the actions
numbered), then the **Anomalies** (type, a confidence chip, Evidence, Interpretation; HIGH first), then the Evidence
Summary (Git Activity, Planning State) and the **Artifact Completeness** grid. A report with no anomalies says so in
specific words. Three arrangements, three different pictures of the same file.

Real shape (the D-14 scratch run, 11-02-SUMMARY "## Forensics", read for shape only):
- No frontmatter. `# Forensic Report`, bold `Generated` (UTC, with a trailing Z) and `Problem`.
- `## Evidence Summary` with three `###`: Git Activity (five bold-label bullets), Planning State (four), Artifact
  Completeness: a **six-column** table (Phase, PLAN, CONTEXT, RESEARCH, SUMMARY, VERIFICATION), the only table over five
  columns in any writer output. The first cell is a two-digit phase number and a name; the others are a check or cross
  mark, often with a parenthetical: a count `(6)`, a ratio `(4/5)` or `passed 4/4`.
- `## Anomalies Detected` with one `### {type} — Confidence: {X}` each, **written in no confidence order**, each with
  `**Evidence:**` and `**Interpretation:**` paragraphs (the longest line in the file is an Evidence paragraph over 500
  characters). In one real anomaly the confidence slot held a word **outside HIGH, MEDIUM and LOW**.
- `## Root Cause Hypothesis` keeps the writer's lead-in sentence, then one paragraph; `## Recommended Actions` is a
  numbered list with inline-code commands. The file-name stamp is local time and the Generated line is UTC; nothing
  compares them.
- Not observed for real, made up by 11-09: anomalies at HIGH, a report with no anomalies. The wording of the no-anomaly
  case is the page's: "No anomalies were detected."

## How to View
open .planning/sketches/060-forensics-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`); the state bar (`?state=anomalies|none|odd`):
  - **Anomalies at each confidence** (`anomalies`, `report-20260402-101500.md`, 11-09): three anomalies written out of
    order (MEDIUM, HIGH, LOW), shown HIGH first; a four-phase grid with eleven of twenty artifacts absent.
  - **No anomalies** (`none`, `report-20260406-090000.md`): "No anomalies were detected." (the hypothesis reads "No issue
    was found"), a three-phase grid with one absent artifact.
  - **A confidence outside the three** (`odd`): **made up for this sketch only**, the first report with the LOW anomaly's
    word replaced by "Uncertain". The chip shows the word as written in a dashed chip and the anomaly sorts last.

## Frames not reused
How the locked frames, the latest winners and the outcome-first page lay out their pages (a forensics page must not
copy any):
- **053 A** verdict board (columns of verdict groups with counts); **054 C** gate path; **055 A** instrument grid;
  **056 C** shared root.
- **057 C** seed packet; **058 A** status dial; **059** (the report page, this plan's other sketch): a time ruler, a
  scorecard rail, phase lanes.
- **051 A** browser window (the outcome-first frame CONTEXT names as nearest): a window chrome with the outcome and
  counts at the top and criteria listed under it.
The three forensics frames: **A** a ruler Low to High with a numbered mark per anomaly (a strip plot) between a hero
band and the evidence; **B** a two-column page with a sticky evidence rail whose lead figure is the artifact grid as a
heat map; **C** a fork diagram from the hypothesis to its actions, then a case table with a three-square confidence
meter on every anomaly, and the artifact grid as one meter a phase.

## Shared across all three
- Header: crumbs "Lendshed / Forensics / {file}", eyebrow "Forensics", h1 "Forensic Report", the Generated line as
  written, View / Source and Copy path, then the Problem sentence as a quiet note.
- The reading order is the document's and the spec's, in every variant: "Root cause hypothesis" (the lead-in sentence,
  then the paragraph) and "Recommended actions" (numbered, verbatim, inline code kept), then "Anomalies", then the
  "Evidence summary" and "Artifact completeness". B puts the grid's picture beside the hypothesis on a wide screen,
  but it comes last in the document and stacks last on a phone.
- Anomalies: sorted HIGH first, then MEDIUM, LOW, then any other word; ties keep the file's order. Each carries its
  type, an **untoned** `status-chip` with "High confidence", "Medium confidence" or "Low confidence" (a word outside the
  three is shown as written in a dashed plain chip), Evidence and Interpretation.
- Artifact completeness: a present artifact is a `complete` square, an absent one a `missing` outlined square with the
  word "Absent" beside it (a square is never the only carrier of meaning); the grid's parentheticals ("(6)", "(4/5)",
  "passed 4/4") are shown as written. "{n} of {m} artifacts absent" is counted by Labelore, not the file.
- Tones: hypothesis, actions and confidence untoned (confidence has no good or bad polarity); the grid is the only toned
  figure. A HIGH anomaly and an absent artifact are document content, so no error tone is used anywhere.
- No anomalies: one quiet dashed note, "No anomalies were detected.", in the place the anomalies would be.
- Computed by Labelore from the file's own fields only: the anomaly order and counts, the absent count, the git span
  axis (the Time span, the last commit date and the Generated date). Every picture falls back to the plain list or table
  when a line does not read.

## Variants
- **A: Confidence ruler.** Hypothesis boxed beside the numbered actions. Under "Anomalies", one ruler of equal zones
  Low, Medium, High (and "Other" when a word is outside the three) with a big count per zone and a numbered square mark
  for every anomaly in its zone; a mark opens that anomaly's row below (type and chip; Evidence and Interpretation
  fold open, the highest-confidence one open). "Least sure / Most sure" under the ruler. Evidence summary as two
  label lists, the artifact grid as a plain table of squares and words. An empty ruler with hatched zones when there
  are none. Computable from the confidence words and the grid.
- **B: Evidence rail.** The left column reads in document order, hypothesis (a heavy left rule), actions, anomaly cards
  whose rule weight repeats the confidence (heavy, medium, dashed); the sticky right rail leads with the artifact
  grid drawn as a heat map (artifacts down, phases across, a square and the note or "Absent" in each cell, a phase
  legend under it), then the git span as a small axis (first day, the last commit, Generated) over the Git Activity and
  Planning State lists. The grid is the first thing beside the hypothesis. Computable from the grid and the span dates.
- **C: Fork.** The hypothesis box forks by wires into the numbered actions, with a small tally of the anomalies it will
  be read against (a count per confidence). Anomalies as a case table: a three-square meter (filled squares for 3, 2,
  1; three dashed for a word outside the three) and the chip, the type and Evidence in the middle, Interpretation
  beside it; nothing folded. The artifact grid as one row per phase with a five-square **shipped status-meter** (the
  reuse option: present `complete`, absent `missing`) and the absent artifacts named under it. Evidence summary beside
  it. Computable from the same fields.

## Honest notes for the chooser
- A is the most direct picture of "how sure", but the ruler carries little beyond counts; B is the strongest picture
  of the grid, which is the file's only wide table, and keeps rule weight as a second carrier of confidence without
  colour; C puts the hypothesis-to-action path first, the part the page promises first, at the cost of the longest page.
- The hypothesis is not linked to any anomaly: the file gives no such link, so no variant draws one.
- Fonts used: `--fs-display-3` (the h1), `--fs-7` (headings and the hypothesis sentence), `--fs-4` (body and meta),
  `--fs-2` (labels, chips, mono ids and the grid cells). Four sizes.

## Winner
**B: Evidence rail**, chosen by the user: "060 B". No synthesis.

Build B as drawn in its tab (marked "★ Selected"):
- **The picture:** the left column reads in document order: the hypothesis (a heavy left rule), the numbered actions,
  then anomaly cards whose rule weight repeats the confidence (heavy, medium, dashed). The sticky right rail leads with
  the artifact grid as a heat map (artifacts down, phases across, a square and the note or "Absent" in each cell, a
  phase legend under it), then the git span as a small axis (first day, last commit, Generated) over the Git Activity
  and Planning State lists.
- **Order:** the grid comes last in the document and stacks last on a phone; only on a wide screen does it sit beside
  the hypothesis.
- **No anomalies:** one quiet dashed note, "No anomalies were detected."
- **Sketch-only state carried to 11-24 / 11-25:** a confidence word outside HIGH, MEDIUM and LOW (`odd`, "Uncertain")
  exists in the sketch only. The build tests cover it with a planted test copy of the report, not by changing a fixture
  that would shift pinned counts.
