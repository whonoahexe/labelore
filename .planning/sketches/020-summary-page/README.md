---
sketch: 020
name: summary-page
question: "How should a SUMMARY page show date, status and metrics up top, the accomplishments as the main event, and decisions, deviations, patterns, coverage and lineage without repeating itself or overwhelming?"
winner: "D"
tags: [documents, per-type-views, summary, accomplishments, coverage, deviations, layout]
---

# Sketch 020: SUMMARY page

## Design Question
What should a SUMMARY page show, and how, so that what shipped is the main event and the file's
repeated parts appear once?

## How to View
open .planning/sketches/020-summary-page/index.html (`?v=a|b|c&doc=0501|0406|0101|0x4|3us&theme=light`)

`gen-data.mjs` builds `data.js` from five real summaries:
- **05-01:** the canonical one, with 5 accomplishments, 3 coverage deliverables and one that needs
  a human.
- **04-06:** `awaiting-checkpoint`, two Rule-1 auto-fixes, a `decisions:` key, requirements-pending
  and free-form sections.
- **01-01:** 6 dependencies added and 5 Rule-tagged self-corrections.
- **0x4:** 16 commits with no per-task list, 7 deliverables and no Accomplishments, just an
  outcome table.
- **3us:** the quick format, with `dependency-graph`/`metrics` keys and a Tasks table.

## Redundancy calls (agreed before building)
- **Performance** and `duration`/`completed` → the header only (status, duration, start time,
  files).
- **key-files** and **Files Created/Modified** → one Files modal (Created/Modified, with each
  file's one-line note from the body).
- **key-decisions** and **Decisions Made** → one Decisions list. The body is used only when it adds
  something.
- **tech-stack.patterns** and **patterns-established** → one Patterns list: Approach chips, plus
  Convention chips for the established ones. New dependencies show only when `added` is non-empty.
- **requires/affects** → a lineage strip (Built on → this plan → Unblocks).
- **In the source only:** provides, tags, actuals, the Performance section, Self-check (shown as a
  chip) and the frontmatter.

## Shared header
The meta row holds the eyebrow, the completed date and View/Source. Below it come the title, the
bold one-liner as the lead, and chips for status, subsystem and self-check. The modal triggers are
Tasks (each commit hash per task), Files and Requirements (completed plus pending). Stats: duration,
start time, files. A User setup callout appears only when one is needed.

## Variants
- **A: Release notes.** One reading column. **What shipped** is a numbered list, each item a bold
  headline (the accomplishment's first clause) with its detail clamped to two lines, click to read
  all. Coverage is **merged in**: each deliverable's proof pills (unit, integration, manual, with
  their status) sit under the accomplishment they match best, and unmatched deliverables appear
  under "Also verified". Then come Waiting on a human, Along the way (Decisions | Deviations side by
  side), Patterns, Also in this summary, Where it sits, and Next.
- **B: Deliverables board.** The title and lead sit beside a metrics box. **Deliverables** is a grid
  of coverage cards (ID, requirement, proof pills, and the reason when it needs a human). A sticky
  side rail holds a "What shipped" checklist and a vertical lineage. Below, tabs: Decisions ·
  Deviations · Patterns · Still open.
- **C: Run timeline.** The title sits beside a status/clock column. **Outcome** is a tile grid of
  accomplishment headlines. **How the run went** is a timeline from Started, through each task with
  its commit, to Completed. Deviations hang off the task they were found during, a human wait is
  its own stop, and the full deviation cards follow. **Proof** is a separate coverage table. Then
  Decisions | Patterns and lineage.

- **D: B head + C body (round 2 synthesis).** B's page head, with the subsystem chip labelled
  **Type:**, Files dropped from the metrics box (the Files modal already has it), and Requirements IDs
  in the modal as reference triggers. Hovering or focusing an ID opens a preview like the app's
  `reference-preview` (eyebrow, ID, the requirement's text, Status / Location / Phase, Open ↗).
  Below that is C's body, with a reworked **Outcome**: a count line (things shipped · deliverables
  proven · need a human · fixed on the way), then one row per accomplishment: number | bold
  headline | detail (3 lines, + More) | D-pills that jump to the matching Proof row. **Round 3:**
  Outcome shows the Accomplishments list only. When a summary has none, the section is left out
  with no fallback, and sections like "What Was Built" stay under "Also in this summary".

## What to Look For
- Does each variant make what shipped the obvious main event on 05-01 and 01-01?
- Is the coverage "proof" better attached to the accomplishments (A) or as cards on its own (B, C)?
- 04-06 and 0x4: does the page still read well with no Accomplishments, awaiting a checkpoint, or
  with many deviations?
