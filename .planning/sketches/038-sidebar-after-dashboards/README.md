---
sketch: 038
name: sidebar-after-dashboards
question: "With Project and Research gone from the planning-files drawer (their dashboards cover them), how should phases, quick tasks and shipped milestones be organized?"
winner: "C"
tags: [sidebar, drawer, navigation, phases, quick-tasks, milestones]
---

# Sketch 038: The sidebar after the dashboards

## Design Question
Every root file and every research file now has its own page (dashboard, roadmap, traceability,
research), so the drawer's Project and Research groups go. What's left today sits in four groups:
Phases, Archived phases, Quick tasks and Milestones. A shipped milestone is split in two: its
phases under Archived phases, and its roadmap, requirements, audit and quick tasks under
Milestones. A phase lists up to 25 files in one flat run, with every plan and summary on its own
row. How should the rest be organized?

## How to View
open .planning/sketches/038-sidebar-after-dashboards/index.html

The drawer opens over a dimmed page, with Plan 04 of phase 01 as the current page. History
switches between the screenshot project (2 phases, 3 quick tasks, 2 shipped milestones) and a long
one (40 quick tasks, 6 shipped milestones).

## Shared across all three
- **A phase's files are in three stages:** Before plans (Context, Discussion log, UI spec,
  Research, Patterns, Validation), Plans, and After (Review, Review fix, Verification, Security,
  UAT, Learnings). These use the existing lifecycle order.
- **Each plan is one row.** The plan page already pairs PLAN with SUMMARY. A square fills once the
  summary exists, so a 6-plan phase shows 6 rows instead of 12.
- **A quick task opens to one chip row of its files** (Plan · Summary · …), not a nested folder.

## Variants
- **A: By milestone.** Still a tree. "Current milestone v3.0" holds its phases and its quick tasks.
  "Shipped" holds one folder per milestone (version, name, ship date). Each folder contains the
  milestone's documents, then Phases, then Quick tasks. One milestone, one place. Expand-all
  stays.
- **B: Three tabs.** A switch with big counts: Phases · Quick tasks · Shipped. Phases are cards
  (big number, status chip, one bar segment per plan), and the current phase is open. Quick tasks
  have a filter and are grouped by month. Shipped shows a block per milestone: its documents as
  chips, then Phases and Quick tasks folders.
- **C: Two columns.** The drawer widens to about 38rem. On the left are places: current phases,
  Quick tasks and shipped milestones (a milestone unfolds to its phases). On the right are the
  chosen place's files. The tree is never more than two levels deep. On a phone it drills down,
  with a back link.

## What to Look For
- A keeps the drawer's narrow width and tree. Is merging each milestone into one folder enough on
  its own?
- B opens straight onto the current phase. Do tabs hide too much? (The long history's 40 quick
  tasks live in their own tab.)
- C's two columns end deep nesting, but the drawer covers more of the page. Is that worth it?
- Is the Before plans / Plans / After grouping, with one row per plan, right?

## Winner
**C: Two columns.** Build it. User: "C seems perfect".
- The drawer widens to about 38rem. On the left are places, under "Current v3.0" and "Shipped".
  - Current: the milestone's phases (number, name, done/total plans), then Quick tasks with a count.
  - Shipped: one row per milestone (version, name, ship date). Choosing one unfolds its phases and
    its Quick tasks underneath, indented.
- On the right are the chosen place's files, under a header with where it is (`v3.0 · Phase 01`),
  the name and the status chip:
  - **A phase:** Before plans · Plans (one row per plan, with a square that fills once the summary
    exists, and "4 of 6 done") · After.
  - **Quick tasks:** grouped by month. Each task opens to one chip row of its files.
  - **A shipped milestone:** its documents (Roadmap, Requirements, Milestone audit), its phases
    (each one opens that phase) and a link to all its quick tasks.
- The current page's row has the active bar, and the drawer opens on the place that holds it.
- On a phone it's one column: places first. Choosing one drills into its files, with an
  "All places" back link.
- Project and Research groups are removed. The expand-all control goes, since nothing nests.
