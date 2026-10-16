---
sketch: 022
name: review-page
question: "How should a code REVIEW page put what's still in the code first — by severity, by file, with each finding's outcome from REVIEW-FIX — while keeping the full record of problems and suggested fixes readable?"
winner: "C"
tags: [documents, per-type-views, review, code-review, findings, review-fix, layout]
---

# Sketch 022: REVIEW page

## Design Question
How does a code-review page show triage first (what is still in the code, how bad, where), fold in
each finding's outcome, and keep every finding's problem and suggested fix readable?

## How to View
open .planning/sketches/022-review-page/index.html (`?v=a|b|c&doc=sp01|sb02|lb01|dd01|lb05|clean&theme=light`)

## Intake (user's answers)
- **Main job:** triage first (what's open, how bad, where), with the full record underneath.
- **Fix outcomes:** fold them in. When the phase has a REVIEW-FIX.md, each finding shows fixed
  with its commit, or skipped with the reason. REVIEW-FIX keeps its own page.

## Data
`gen-data.mjs` reads five real reviews and one synthetic clean review:
- **sp01:** studio-portal v1.0 phase 1. 9 findings. Outcomes come from the review's own
  `resolved:` / `open:` frontmatter and inline "> **RESOLVED** — commit" notes.
- **sb02:** sideby phase 2, with REVIEW-FIX `partial`: 4 fixed, 3 skipped with reasons, and
  3 info findings not attempted. One finding names a file outside the declared review list.
- **lb01:** labelore phase 1, with REVIEW-FIX `all_fixed`. Its 2 info findings sit under
  "Deferred / Out of Scope".
- **dd01:** deid phase 1. 26 findings, 4 critical, none fixed. Several have multi-range refs
  (`file.tsx:79-96, 195-202`).
- **lb05:** labelore phase 5. Small: 1 warning and 2 info.
- **clean:** synthetic `status: clean` review with no findings.

## Mapping calls
- **Outcome per finding:** checked in this order: the sibling REVIEW-FIX (fixed + commit + applied
  fix, skipped + reason, deferred), then frontmatter `resolved:`, then an inline RESOLVED note.
  When a fix report exists but doesn't mention a finding, warnings and criticals count as open
  and info counts as not attempted.
- **The verdict counts what's still in the code:** everything not fixed (open + skipped + not
  attempted). On sb02 it reads "4 of 10 fixed. 6 still in the code", not "all in-scope fixed".
- **Severity** comes from the ID prefix (CR/BL → critical, WR → warning, IN → info), falling back
  to the section.
- **Files:** `files_reviewed_list`, plus any file a finding names that isn't in the list (shown as
  "outside the declared scope").
- **Back matter:** one "Also in this report" chip row: the fix report, the files-reviewed list as a
  modal, other `##` sections, and the frontmatter.

## Variants
- **A: Code map.** A display title, then the verdict and the reviewer's first paragraph beside a
  **treemap of every reviewed file**:
  - Tiles are grouped by folder and sized by findings.
  - Colour is the worst finding still unfixed: critical, warning or info. A file whose findings
    are all fixed is outlined; a file with no findings is quiet; a file outside the declared scope
    is hatched.
  - Picking a tile opens that file's panel: a line ruler of where its findings sit, then its
    finding cards.
  - Below the map, every finding is grouped by severity. Each card opens to the problem and the
    suggested fix side by side, then the outcome.
- **B: Triage desk.** The title and verdict sit beside a "Still in the code" count with a
  severity strip, one square per finding: filled when open, outlined when fixed, dashed when
  skipped.
  - Below is a two-pane desk. On the left, a queue with tabs: Open, Fixed, Skipped, Not
    attempted, All.
  - On the right, a reader: the outcome first, then the problem and the fix. Prev/Next buttons
    and the J/K keys move through the queue.
- **C: Review threads.** A PR-review metaphor.
  - **Top:** the verdict, a tally (open, fixed, skipped, not attempted), and the reviewer's
    summary as a pull quote.
  - **Threads:** grouped by file, worst first. Each file header has a line ruler, and each finding
    has a line-number gutter, the comment, a "Suggested change" block, and a reply showing the
    outcome. Fixed threads fold away like resolved conversations, with a toggle to show them.
  - **Files with no findings:** listed as quiet chips.

## Winner
**C: Review threads.** Round-2 change: a fixed thread you open now has a "Fold −" control.
Folding works whether or not "Show fixed threads" is on. With it on, a single thread can still be
folded; turning the toggle off or on resets each thread to the default.

## What to Look For
- **dd01 (26 open):** which layout makes the 4 criticals impossible to miss and the rest workable?
- **sb02 (fixed, skipped, not attempted):** does each outcome read clearly, and is the "still in
  the code" count honest?
- **lb01 (all fixed):** does the page feel finished rather than alarming?
- **clean:** does the empty state still feel like a real page?
