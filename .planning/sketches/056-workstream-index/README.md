---
sketch: 056
name: workstream-index
question: "In workstream mode, how should the project's first screen show the project head over one entry per workstream (current phase, status, progress, the active one marked when knowable, completed ones collapsed), and how does the header scope chip switch workstreams beside the project switcher, with Shared files above the workstream's own in the drawer?"
winner: "C"
tags: [workstreams, scope, index, switcher, drawer, phase-11]
---

# Sketch 056: Workstream index and scope chip

## Design Question
Phase 11 D-09..D-13 (VIEW-19). In workstream mode the project's first screen is a workstream index: the project
head (name, what it is) over one entry per workstream with its current phase, status and progress from that
workstream's STATE/ROADMAP, the active one marked (D-10). Inside a workstream, a header scope chip beside the project
name ("ws: payments ▾") lists the workstreams plus "All workstreams" (D-11); the drawer shows the shared files in a
"Shared" group above the workstream's own (D-12); completed workstreams show only on the index, collapsed (D-13).

Real shape (`gsd-tools workstream create --migrate-name`, `create`, `set`, `complete` on a scratch copy, read for
shape only):
- Migration moved ROADMAP.md, STATE.md, REQUIREMENTS.md and phases/ into `workstreams/<name>/`. A new workstream
  has only `STATE.md` (frontmatter `workstream, created`; "Status: Not started", "Current Phase: None") and an
  empty `phases/`, with no ROADMAP or REQUIREMENTS.
- `complete` archived to `milestones/ws-<name>-<date>/` with STATE.md and phases/ only.
- **The active pointer is per session.** Under Claude Code `workstream set` writes to
  `$TMPDIR/gsd-workstream-sessions/<project>/<session>`; `.planning/active-workstream` exists only when set with
  no session in the environment. Labelore can mark "active" only when that file exists, and it can be stale.
- **Progress counts disagree.** The migrated workstream's STATE frontmatter says `completed_phases 4 /
  total_phases 8`, `completed_plans 90 / total_plans 90`, while `gsd-tools workstream progress` reported phases
  `0/8`. The page reads the files (STATE), shows phases and plans as separate counts, and derives neither from the
  other.

## How to View
open .planning/sketches/056-workstream-index/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`).
- State bar (`?state=pointer|nopointer|inside`), all made up (Lendshed in workstream mode):
  - **Index, active pointer on disk:** four workstreams (payments executing 2/5 phases 9/14 plans, active;
    check-in verifying 4/6 phases 22/22 plans with a quiet note; reminders planning; exports-v2 new, no roadmap),
    two completed.
  - **Index, no pointer file:** the same without a mark, and a quiet line saying why.
  - **Inside a workstream:** the header with the scope chip open, the drawer (Shared · project above ws: payments)
    and the scoped head; the same for every tab (the inside screen is shared, the index frame differs). A card,
    lane or branch also opens it.

## Shared across all three
- Header: the 039 A project switcher ("Lendshed ▾"), then on the index "4 workstreams"; inside, the scope chip
  "ws: {name} ▾". Its popover lists each workstream (status square, name, Active mark, "Phase N · status" or "Not
  started · no roadmap"), a rule, then "All workstreams" (the index).
- Project head: crumbs, eyebrow "Project · workstream mode", h1, What This Is, and the pointer line: "Active
  workstream payments, from .planning/active-workstream" or "No active workstream on disk: GSD keeps the active one
  per agent session, which Labelore cannot see."
- Tones: unfinished status `in-flight` with the status word as written (executing, verifying, planning); no
  roadmap `quiet` and dashed; done phases `complete` fill. The Active mark is an outlined label, not a tone.
- Completed: a closed bar, one row per archived workstream (name, folder, phases archived).
- Inside: drawer "Shared · project" (PROJECT.md, config.json, milestones/, research/, codebase/, todos/) above
  "ws: {name}" (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/), then the scoped head at
  `/lendshed/workstreams/{name}/` and the normal dashboard below.

## Variants
- **A: Cards.** D-10 literally: one card per workstream (name, Active, phase N of M and its name, status chip,
  updated date, a phase-cell meter and a plans bar, any note, its URL); the active card has a heavy border, a
  no-roadmap card is dashed.
- **B: Phase lanes.** One lane per workstream: name and status, then its roadmap's phases as cells (complete by
  STATE's count, current ◆, ahead dashed), then phases, plans and updated; no roadmap is a hatched lane.
- **C: Shared root.** A tree: the project root node with the shared files, branches to each workstream with a
  phase ring, current phase, status chip, plans bar and its own files. It pictures D-12's shared-versus-own split.

## What to Look For
- Which first screen answers "how does each workstream stand?" fastest: cards (A), lanes (B) or the tree (C)?
- Is the "no pointer file" line honest without being alarming? Does losing the Active mark hurt?
- Check-in's phases 4/6 next to plans 22/22: does showing both, plus the note, read as a fact?
- Inside: does the scope chip read as a second level under the project switcher, not a second project switcher?

## Open points for the build
- Progress: phases and plans come from each workstream's STATE frontmatter `progress`; the current phase from
  STATE; phase names from that workstream's ROADMAP. A missing ROADMAP shows "No roadmap yet".
- Active: only from `.planning/active-workstream`; nothing is inferred from mtimes or STATE.
- Completed: folders matching `milestones/ws-<name>-<date>/`; phase count from their `phases/`.
- A project mid-migration (root ROADMAP/STATE plus `workstreams/`): planner's call (CONTEXT discretion).
- Sketch words, not UI-SPEC copy: "workstream mode", "No roadmap yet", "STATE.md only", "Active", "All
  workstreams", "Shared · project", "No active workstream on disk…".

All text is made up. The repository is public.

## Winner
**C: Shared root**, chosen by the user: "C seems nice". No synthesis.

Build C as drawn in its tab (marked "★ Selected"), under the shared project head and pointer line:
- **Root node:** "Shared by every workstream · .planning/", the project name, and the shared files present at the
  root as chips; on the right, "active-workstream → {name}" or "no active-workstream file".
- **Branches:** one per workstream, joined to the root by a connector (one row of branches; a vertical indented
  tree under 52rem). Each branch shows:
  - the name and the Active mark;
  - a phase ring labelled "{done}/{total}" from STATE `progress`;
  - "Phase N", the phase name from its ROADMAP and the status chip (`in-flight`, the status word as written);
  - the plans bar and any note;
  - the workstream's own files as chips (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/ with a count, its own
    config.json when present).

  The active branch has a heavy border. A workstream with no roadmap is dashed, with "No roadmap yet" and no ring.
- **Opening:** a branch opens that workstream's dashboard at `/<project>/workstreams/<name>/`.
- **Below the tree:** "Completed", a closed bar.
- **The inside screen** (scope chip, popover, Shared-above-own drawer, scoped head), as described under "Shared
  across all three".
