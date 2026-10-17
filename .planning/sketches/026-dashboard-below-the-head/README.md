---
sketch: 026
name: dashboard-below-the-head
question: "Below the project head, how should Decisions/Blockers, On deck (Next · Todos · Notes) and recent quick/fast tasks be laid out so each section has its own weight, and the logs are searchable, filterable and expandable?"
winner: "B + P1"
tags: [dashboard, decisions, blockers, todos, notes, quick-tasks, pace, layout]
---

# Sketch 026: Dashboard below the head

## Design Question
The project head (sketch 025) stays exactly as shipped. Everything under it gets reworked: Decisions
and Blockers become easier to read and interactive (filter by phase, search, expand a row, jump to
the source line), On deck gains pending todos and notes as tabs, and a new section shows recent
quick and fast tasks.

## How to View
open .planning/sketches/026-dashboard-below-the-head/index.html (`?v=p1|p2|p3|p4|a|b|c&doc=lab|sp|sb|syn|fx|sparse&theme=light&width=375`; opens on the winner, P1)

## Variants
- **A: One ledger** — one panel with a two-way toggle (Decisions 33 | Blockers 15, big numbers;
  the blockers side turns red when any are open). Phase chips or blocker-group chips, a search box,
  one-line rows that expand into Why / Logged / source links. On deck tabs and a compact Recent work
  list share a side column.
- **B: Blockers lead** — open blockers take a full-width red band: the count, a group legend that
  filters, the most urgent blocker as a large sentence, the rest as expandable rows. With none, the
  band collapses to one quiet "Nothing blocking" line. Decisions follow as a per-phase bar chart
  that filters, then entries grouped by phase on a rail. Bottom: On deck tabs beside Recent work
  with a three-week activity chart (quick over fast).
- **C: Two boards** — the two panels stay side by side but rebuilt: a decisions register (search,
  phase chips, expandable rows) and blocker cards grouped under STATE.md's own sub-headings,
  urgent ones tinted. Bottom: On deck tabs beside Recent work as a log grouped by day.

**Same in all three:** rows expand in place; STATE.md line, plan and phase links on every entry;
resolved blockers (struck through or marked RESOLVED/COMPLETE in STATE.md) hide behind a toggle;
On deck opens on the first non-empty tab; quick tasks link their PLAN and SUMMARY, fast tasks have
none.

## Data
`gen-data.mjs` reads, without rewriting anything:
- **Decisions:** STATE.md `### Decisions` bullets, newest first. `[Phase 05]: 05-03: text — why`
  becomes phase, plan, title and why; a bold lead is the title. Untagged entries take their phase
  from the plan id they name; tags that are really plan ids (`[Phase 01-01]`,
  `[Phase quick-260709-rk9]`) are split.
- **Blockers:** `Blockers/Concerns` (or `Blockers`) bullets with the `**Group**` line above them.
  Caps leads (ACTIVE, PENDING, TOOL ISSUE) become tags; `~~x~~ **RESOLVED …**` and COMPLETE
  entries count as resolved; ⚠️ or an expiry date marks one time-bound.
- **Todos:** `todos/pending/*.md` (title, area/theme, severity/priority, created, files) plus
  STATE.md's Pending Todos bullets; done = `todos/done` + `todos/completed`.
- **Notes:** `notes/*.md` (title or first line, date, `promoted`); promoted notes sit last, dimmed.
- **Next:** unfinished plans from the current phase on (the head's own next plan skipped), then
  unchecked roadmap phases.
- **Recent work:** STATE.md's Quick Tasks Completed table, newest first. An id like `261017-wlg`
  is a quick task (folder with PLAN/SUMMARY); a number is a fast task.

labelore, studio-portal, sideby.me and the dense fixture, plus a synthetic project
(`synthetic-planning/`) with todos, notes and grouped blockers, and one with nothing at all.

## What to Look For
- With 15 blockers (studio-portal) and with none (labelore), does the blockers treatment feel right?
- Is a one-line row plus expand the right density for 33–110 decisions?
- Do Todos and Notes earn their place inside On deck, or do they want their own section?
- Which Recent work treatment tells you most at a glance: list, activity chart, or day log?

## Round 2 — B, section by section: Blocking
Feedback: B is the direction. In the blocking band, picking a group with one blocker showed nothing;
use arrow pagination instead of Show all; and since there will be no STATE.md page, show where each
blocker is mentioned elsewhere and call the rest untagged. Never mention STATE.md in this section.

- **Filter fix:** the large sentence is the most urgent blocker in the current filter (group,
  Untagged, search, resolved); the pages hold the rest. Picking Operational shows its one blocker.
- **Pagination:** 5 rows a page, ‹ 1 / 3 › with "Showing 1–5 of 14". Changing a filter or the search
  goes back to page 1; paging closes any open row.
- **Sources:** each blocker links to the documents it names: a review finding (`01-REVIEW WR-05`, or
  a bare `WR-01` under a group heading that names its phase), a plan (`03-07`), a quick task
  (`260714-3tp`), a requirement (`ACCESS-04`), or a `.md` path, including one named on the group line
  ("full detail in `milestones/v1.0-MILESTONE-AUDIT.md`"). Only ids that resolve to a real file count,
  so dates and outside tickets (`WHAT-75`) drop out. The collapsed row shows the first source
  (`WR-05`, `Plan 04-09 +1`); the expanded row shows each as a card with the finding heading or
  plan objective, then "Also mentioned in": other files citing the same review finding, quick task
  or requirement (plan ids are skipped there, since sibling plans cite each other as dependencies).
- **Untagged:** a blocker that names no source gets a dashed Untagged marker, its own entry in the
  group list, and a note that its text is the whole record, with Copy text. studio-portal: 4 of 15
  untagged; sideby.me: 1 of 9.
- **No STATE.md:** the band, the rows and the "Nothing blocking" line no longer name it or link to it.

## Round 2 — B: Decisions
Feedback: same rules as the blocking band. No STATE.md, and arrow pagination.

- **Pagination:** 8 decisions a page, newest first, grouped by phase within the page, ‹ 1 / 5 ›.
  Picking a phase bar or typing a search goes back to page 1; paging closes any open row.
- **Sources:** an opened decision shows the document it was logged from as a card: its plan (with
  the plan's objective), its quick task (`[Quick 260718-c9v]:`, also when nested under `[Phase ?]:`),
  or the phase's CONTEXT/RESEARCH, resolved live phases first, then the newest archived milestone.
  A Phase link stays when the entry has a phase. One with neither is Untagged, with Copy text.
  labelore 6 of 7 have a source; studio-portal 30 of 33; sideby.me 96 of 110 (14 untagged).
- **No STATE.md:** the line link is gone, and the empty state no longer names it.
- The no-phase group on the rail is labelled "No phase", so "Untagged" only means "names no source".

## Round 2 — B: On deck and Recent work
Feedback: too much gap between On deck and Recent work, the two panels should be the same height,
and the todo rows need work.

- **Layout:** the two panels sit 24px apart and stretch to the taller one; each panel's pager (and
  On deck's "N todos done" line) is pinned to the bottom so the footers line up.
- **Pagination:** On deck (each tab keeps its own page) and Recent work use the same ‹ 1 / 3 ›
  arrows as Blocking and Decisions, 5 a page. This also fixes the Next tab hiding its sixth plan.
- **Todo rows:** a severity gutter (High / Medium / Low / Unrated) normalises however a project
  spells it (`severity: major`, `priority: P2`, `medium`), sorted highest first, newest first within
  a level. Title, a two-line detail, then one quiet line: area · Added … · the first file (basename,
  full path on hover, "+N" for the rest). Only todos with their own file link out and get the arrow.
- **STATE.md's Pending Todos** no longer say "Listed in STATE.md": like blockers they link to what
  they name. The resolver now also recognises phase documents (`05-UAT`, `05-SECURITY`,
  `05-UI-REVIEW`), so labelore's four link to the phase 5 UAT, security and UI-review documents.
  One that names nothing is Untagged.
- **Recent work dates (from C):** each page of tasks is grouped by day under C's date gutter (large
  day number, month · weekday), replacing the per-row date. The chart, count and pager are unchanged.

## Round 3 — Pace, on B
Feedback: STATE.md's Performance Metrics has the right ideas (plans completed, average duration,
total execution time, trend) but is inconsistent: sideby.me's table has duplicate and garbled rows,
and labelore's says 0.0 hours. Drop the by-phase table, compute the stats ourselves, and show them
creatively. The section sits between Decisions and the On deck / Recent work row.

**Data:** every phase plan's own SUMMARY.md, live and archived: `duration` and `completed` (top
level or under `metrics:`), tasks counted from the PLAN's `<task>` tags. "~35min (this
continuation…)" → 35, approximate; "1h" → 60; "7h 7m elapsed" is wall-clock and "recovered" says
nothing, so those plans count as untimed. labelore: 36 plans, 32 timed, about 16h; studio-portal: 76,
69 timed, about 41h; sideby.me: 98, 83 timed.

**Stats:** plans completed (with untimed count), total execution time, average and median per plan,
minutes per task. **Trend** compares the median minutes per task of the last 8 plans (fewer when
there are fewer) with the 8 before: within ±15% is "Holding steady", lower is "Getting faster",
higher is "Slowing down". It needs 4+ plans on each side, otherwise "Not enough plans yet". Milestone
chips scope everything; the default is the current milestone when it has 4+ timed plans.

- **P1: Rail + timeline** — the 017-style rail: total time as the hero, then plans, average (with
  median) and per task. Right: the trend chip and its sentence, then every plan as a dot in finish
  order (hollow = approximate) over shaded phase bands, with a running median of 5; plans above the
  cap sit at the top with a caret. Hover a dot for the plan.
- **P2: Tiles + skyline** — four tiles (plans, time, average, trend with a running per-task
  sparkline), then one column per plan grouped under its phase, the longest labelled. Hover a column.
- **P3: Sentence + phases** — the verdict as one large sentence ("30 plans done in 16h 22m of
  execution — about 38 min each, and slowing down."), the trend line under it, then one card per
  phase, newest first, each with its plans as mini bars on a shared scale, plans / time / average,
  and "Most time" on the phase that took longest.
- **P4: P1 + P3's sentence** (requested synthesis) — P1's rail and timeline, with P3's sentence in
  place of the trend chip as the verdict above the chart, and the trend detail as a quiet line under it.

**Winner: B + P1.** B as refined in round 2 (blocking band and decisions with sources and arrow
pagination, no STATE.md anywhere; On deck tabs with the redesigned todo rows; Recent work with the
date gutter; equal-height bottom row), with P1's Pace section between Decisions and the bottom row:
the total execution time as the rail's hero, plans / average (median) / per task under it, the
trend chip and sentence, and the per-plan dot timeline with a running median. P4 (P3's sentence as
the verdict) was tried and not taken.
