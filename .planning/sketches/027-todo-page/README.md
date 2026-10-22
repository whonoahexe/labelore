---
sketch: 027
name: todo-page
question: "How should a TODO page show what's wrong and what to do, its weight, the files it touches, the notes it came from and, once done, how it was closed — across GSD's three todo shapes?"
winner: "C"
tags: [documents, per-type-views, todo, notes, lifecycle, layout]
---

# Sketch 027: TODO page

## Design Question
GSD writes todos in three shapes, and one page has to read all of them:
- **add-todo** (`created · title · area · severity · files[] · notes[] · order`; `## Problem` /
  `## Solution`, plus `## Resolution` once it's closed)
- **note promote** (`title · status · priority P2 · source · theme`; `## Goal` / `## Context` /
  `## Acceptance Criteria`)
- **hand-written / explore** (`title · date · priority`, sometimes `status · completed ·
  completed_by`; free prose, `- [ ]` checklists, tables, a closing callout)

Status comes from the folder: `todos/pending/`, or `todos/completed/` / `todos/done/` once it's done.

## How to View
open .planning/sketches/027-todo-page/index.html (`?v=a|b|c&doc=dcrop|dsfx|dcall|sretry|srec|star|sport|pcheck|pdev|lfig|ldrift&theme=light`)

## Intake (user's answers)
- **What leads:** show both directions as variants (always the problem, or a different lead per status).
- **Relatives:** preview them inline (a todo's source notes, folded).

## Winner
**C: Lifecycle**: a Noted → Captured → Closed / Now strip over one numbered spine (source notes → the todo, problem beside solution, files, other sections folded → resolution or a dashed "still open N days"). Build it.

## Variants
- **A: Ticket** — the problem always leads. Main column: Problem/Goal → Solution/To do (checklist
  with a done count) → other sections → Resolution as a closing block. Side sheet: status, written
  severity/priority as a pip, area, order, created/closed, quick task, files, and the source notes
  folded. On phone the sheet drops under the title.
- **B: Status lead** — pending: a big problem card, then what to do (checklist rows), file cards
  (with a line-range bar), source notes, then other sections folded. Done: closed-by facts (quick
  task, date, days open, commits), then **what was planned** beside **what shipped**, with "why it
  was opened" folded underneath.
- **C: Lifecycle** — a three-step strip (Noted → Captured → Closed / Now) over one numbered spine:
  the source notes, the todo itself (problem beside solution, files, other sections folded), then
  the resolution, or a dashed "still open N days".

**Same in all three:** files from `files:` (`path:lines` split into path + range); note references
in the text (`[[slug]]`, `notes/…md`) become buttons that open the note; a frontmatter-only todo
says the title is the whole todo; done with no resolution says so; View/Source with the
frontmatter chip.

## Data
`gen-data.mjs` reads 11 real todos (duet, cinedise-portal, labelore, plus the dashboard's synthetic
fixture) and resolves their notes from `notes:`, `[[slug]]` links, `notes/…md` mentions, or a note
promoted word for word. It also writes 028's data.

## What to Look For
- duet `dsfx`: in B, the planned/shipped pair shows the dropped Sounds toggle.
- `ldrift` (closing callout + completed_by + four extra sections) and `sport` (frontmatter only).
- `pcheck`: a checklist as the plan; `star`: a promoted one-line note.
- Severity tones: high → missing, medium → in-flight, low → quiet, unrated → dashed. The shipped
  dashboard's On deck rows use `--destructive` / `--primary` for high/medium, so one of the two
  has to change to match.
