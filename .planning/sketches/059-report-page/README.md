---
sketch: 059
name: report-page
question: "How does a report page put a session's headline numbers, outcomes and open blockers first, and can the milestone summary share that frame, as a picture?"
winner: null
tags: [report, session-report, milestone-summary, phase-11]
---

# Sketch 059: Report page

## Design Question
Phase 11 D-03, D-16 (VIEW-18; UI-SPEC open item 7). GSD writes two files into `.planning/reports/`: the session report
(`SESSION_REPORT.md`, later `{YYYYMMDD}-session-report.md`) and the milestone summary
(`MILESTONE_SUMMARY-v{V}.md`). The page leads with the report's own numbers and lists as a picture, with the prose
behind a fold or below. Three arrangements, three different pictures. Every variant carries **both** files, so the
sketch settles whether they share one frame (D-03: only if the sketch shows they fit).

Real shape (the D-14 scratch run, 11-02-SUMMARY "## Session report" and "## Milestone summary", read for shape only):
- **Session report:** no frontmatter; `# GSD Session Report`; bold labels Generated, Project, Milestone; `## Session
  Summary` with four bold-label lines (Duration, Phase Progress, Plans Executed, Commits Made) whose values are free
  text with parentheticals (Duration is `~{N} hours` plus first and last commit stamps, or just "Single session"; Phase
  Progress is one sentence holding several numbers; Plans Executed an integer plus a list of ids; Commits Made a bare
  integer); `## Work Performed` with Phases Touched, Key Outcomes, Decisions Made (a list, or prose when none were
  added); Files Changed (a counts sentence, then bullets that start with a backticked directory); Blockers & Open Items
  (bracketed `[Phase N]` prefixes on some); Estimated Resource Usage (a two-column table).
- **Milestone summary:** no frontmatter; `# Milestone v{V} — Project Summary`; seven numbered `##` sections plus an
  eighth, unnumbered `## Stats`; Phases Delivered as a four-column table (the date folded into the Status cell);
  Requirements Coverage as check-mark bullets (a bold category, an id range with an ellipsis or a list, a parenthetical
  phase); Key Decisions Log as a four-column table (ID, Phase, Decision, Rationale; the 66-row longest table in any
  writer output, with `D-NN` ids that repeat across phases); Stats as five bold-label bullets with mixed values.

## How to View
open .planning/sketches/059-report-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`); the state bar (`?state=blockers|clear|milestone|gap`), all
  Lendshed's made-up files (11-09):
  - **Session report, with blockers** (`blockers`, `SESSION_REPORT.md`): "~5 hours" with first and last commit stamps,
    17 commits, 3 plans (01-04 to 01-06), seven outcomes, two decisions, three blockers (two `[Phase 1]`, one bare).
  - **Session report, no blockers** (`clear`, `20260409-session-report.md`): Duration "Single session" kept as written
    (no stamps), 9 commits, 2 plans, five outcomes, Decisions Made as prose, one "None blocking." bullet.
  - **Milestone summary** (`milestone`, `MILESTONE_SUMMARY-v1.0.md`): four delivered phases, four requirement
    categories (id ranges expanded), 18 decision rows, five Stats bullets, the seven numbered sections plus Stats.
  - **Milestone, one not covered** (`gap`): **made up for this sketch only**, the same file with `MOVE-05` not covered, so
    the quiet "not covered" mark shows. The writer's own mark for a not-covered requirement was not observed.
- Section index chips on the milestone summary scroll to each section in order (1 to 7, then Stats); sections drawn
  as plain sections scroll there, the others are closed bars that open.

## Frames not reused
How the locked frames and the earlier per-type winners lay out their pages (a report must not copy any):
- **053 A** verdict board (columns of verdict groups); **054 C** gate path (a vertical spine ending in a boxed next
  action); **055 A** instrument grid (tiles with key figures); **056 C** shared root (a root node with branch cards).
- **057 C** seed packet (one narrow envelope column with a margin); **058 A** status dial (a dial card beside the
  steps, the reading band below). **027 C** the lifecycle strip; **023 A** the case file.
The three report frames: **A** a full-width ruler card (numerals, a time ruler, a phase strip) over a two-column band;
**B** a sticky scorecard rail of headline numbers beside a streaming body; **C** a strip of numerals over a table of
phase lanes (one row per phase) with the reading band below.

## Shared across all three
- Header: crumbs "Lendshed / Reports / {file}", eyebrow "Session report" or "Milestone summary", the h1 as the file
  states it, the Generated line, the View / Source toggle and a Copy path button.
- Labels (the Copywriting Contract, verbatim): "Duration", "Commits", "Plans" (three Heading numerals), "Key
  outcomes", "Blockers and open items", and for the milestone "Phases delivered" and "Requirements coverage". The
  numerals are shown **as written**: "~5 hours" (the stamps beside it as meta) and "Single session" are both kept. A page
  never turns free text into a number it cannot read. Computed by Labelore, from the file's own numbers only: the
  phase squares (first N of the total, read from the progress sentence, the way the shipped status-meter draws them),
  the clock span (read from the Duration stamps), the plan chips (the ids in the parenthetical), the insertions and
  deletions bar (read from the counts sentence), the calendar marks (the date folded into each Phases Delivered
  Status cell), the decisions per phase (counted from the Key Decisions Log), the requirement squares (id ranges
  expanded). Every picture falls back to the sentence or the table when the line does not read.
- Tones: headline numerals untoned; blockers and open items `in-flight` (waiting on someone), "None blocking." a
  quiet dashed note; a delivered phase and a covered requirement `complete` with the word "Complete" or "Covered"
  beside the square; not covered `quiet` and dashed with the words "Not covered". No error tones anywhere.
- Decisions Made: a list when the file has one, the file's own sentence when it is prose.
- Files Changed and Estimated Resource Usage are closed bars (the counts sentence, the insertions and deletions bar and
  the directory list; the metrics table and the template's fixed note).
- The Key Decisions Log is a closed bar of 18 rows (a scroll box, ids and phase in mono) under a per-phase count of
  bars, because the ids repeat across phases and the Phase column is the disambiguator.

## Variants
- **A: Time ruler.** Three numerals, then a ruler: for a session report a 24 hour axis with a bar from the first to the
  last commit (the Duration stamps); for "Single session" a dashed empty axis carrying that phrase. Under it a phase
  strip, one cell per phase of the milestone, done cells tinted, touched cells ringed, the progress sentence under it.
  Two columns below: Key outcomes, Phases touched and Decisions; then Blockers and open items over the two folds.
  The milestone summary swaps the clock for a calendar (start to end, a numbered mark where each phase was delivered)
  and the numerals for the five Stats; Phases delivered and Requirements coverage in two columns below.
  **Milestone summary: one frame** (the ruler becomes a calendar; the rest is the same bands).
- **B: Scorecard rail.** A narrow sticky rail of headline numbers, each over its own small picture: Duration over a
  one-day clock, Commits over a tally of squares (one a commit, a gap every five), Plans over the plan chips and the
  **shipped status-meter** (one square a plan), Phase progress over the status-meter at large size (the reuse option).
  The body streams beside it: Blockers and open items first (the `in-flight` box), then Key outcomes numbered, Phases
  touched, the progress sentence, Decisions and the folds. The milestone summary's rail holds the Stats (the phases
  meter, an insertions and deletions bar) and the body Phases delivered, Requirements coverage, Key decisions and Tech
  debt and deferred. **Milestone summary: one frame** (the rail is the Stats strip). On a phone the rail stacks first.
- **C: Phase lanes.** A strip of the three numerals over a table with one lane per phase of the milestone: the plans
  executed (ringed chips) and the Phases Touched sentence in the lane, the blockers tagged `[Phase N]` planted in their
  phase's lane, an extra "Whole project" lane for a blocker with no tag, untouched phases as quiet ghost lanes. Key
  outcomes and Decisions below. The milestone summary's lanes are the delivered phases: the date it shipped, its
  one-liner, its decision count, and its requirement squares with their ids, over the Stats strip.
  **Milestone summary: one frame** (lanes by phase fit it best, because that file is keyed by phase). The strain is
  the session report: a report that touches one phase leaves three ghost lanes, so if C wins and that looks thin, the
  session report would be better served by its own frame.

## Honest notes for the chooser
- A and B read the session report best (a time and a count picture); C reads the milestone summary best (every datum
  there already has a phase). Whether one frame is enough depends on which of those the page should favour.
- Nothing is drawn that the file does not hold: no commit ticks inside the time span (only the first and last stamps
  are written), no per-phase plan counts for phases the report did not touch, no claim about which phases are done
  beyond the count and the one the progress sentence names.
- Fonts used: `--fs-display-3` (the h1), `--fs-7` (headings and the numerals), `--fs-4` (body and meta), `--fs-2`
  (labels, chips, mono ids). Four sizes.
