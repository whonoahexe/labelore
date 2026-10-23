---
sketch: 030
name: milestone-retro-dialog
question: "How should a History milestone on the roadmap page open its retrospective's four sections (What worked, What was inefficient, Patterns established, Key lessons) as tabs in a dialog?"
winner: "B"
tags: [roadmap, history, milestones, retrospective, dialog, tabs]
---

# Sketch 030: Milestone retrospective dialog

## Design Question
Each History milestone on the roadmap page gets a small Retrospective button. It opens a dialog
with that milestone's four RETROSPECTIVE.md sections as tabs, showing the points verbatim. The
user chose a dialog over an inline panel. The variants differ in the dialog's shape.

The four sections live in `.planning/RETROSPECTIVE.md` (one `## Milestone: vX.Y — Name` block per
milestone), not in the MILESTONE-AUDIT. `data.js` is generated from the real file by
`gen-data.mjs`, so every point and source line number is real.

## How to View
open .planning/sketches/030-milestone-retro-dialog/index.html

## Variants
- **A: Tabbed list** — 46rem dialog; underlined tabs with counts; each point as a bold lead over muted body; lessons numbered.
- **B: Side rail** — 62rem dialog; left rail of the four sections (icon, label, count), right pane with the section as a big heading and numbered points as prose (lead inline in bold). On phones the rail becomes a scrolling tab row.
- **C: Count strip** — 56rem dialog with a large title; four cells as tabs, each a big count; the open section as a numbered ledger (lead large, body under it). Cells go 2×2 on phones.

Shared to all: Retrospective button at the summary's right (icon only on phones; it doesn't toggle
the card), ←/→ moves between tabs, a footer chip that opens RETROSPECTIVE.md at the section's line,
and Older/Newer buttons that walk milestones while keeping the current tab. A milestone with no
retrospective entry shows no button; a missing section is a disabled tab with a 0 count.

## What to Look For
- Which shape makes the points easiest to read: separate lead + body (A, C) or lead inline in prose (B)?
- Do the counts earn the large size in C, or are four similar numbers noise?
- Phone width: A's tab row scrolls, B's rail turns into tabs, C's strip goes 2×2.
- Toolbar Data toggles: "v1.1 has no retro" (button disappears), "v1.0 missing a section" (disabled tab).
