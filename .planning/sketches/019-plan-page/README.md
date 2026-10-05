---
sketch: 019
name: plan-page
question: "How should a PLAN page order header, objective, tasks (4 types + tracer), done-when and the executor-only material so a human isn't overwhelmed?"
winner: "B"
tags: [documents, per-type-views, plan, tasks, checkpoints, layout]
---

# Sketch 019: PLAN page

## Design Question
How should a PLAN page be ordered and laid out so a person sees where the plan sits, what it is
for and what each task does, without being buried by the executor-facing material?

## How to View
open .planning/sketches/019-plan-page/index.html (`?v=a|b|c&doc=0501|0x4|0106|0402|sya&theme=light`)

Data comes from `data.js`, which `gen-data.mjs` builds from five real plans: labelore 05-01 (a tracer
with 13 files and a ~1,600-word action), labelore 0x4 (7 tasks, 14 requirements), studio-portal 01-06
(auto+TDD and a human-action checkpoint), 04-02 (a decision checkpoint with one-line tags) and sya
(tracer, auto and a human-verify checkpoint with no `<name>`).

## Shared reading order (all variants)
1. **Header:** plan ID and title (the objective's first sentence). Chips for type, wave, autonomous
   or N checkpoints, and executed or not run. Modal triggers for Depends on, Files (grouped by folder,
   each file showing the T-chips of the tasks that touch it, which jump to the task) and
   Requirements (ID and text). Stats for tasks, confidence and estimated tokens.
2. **Objective:** the rest of the lead, Why (Purpose) and You get (Output).
3. **Tasks:** the body of the page. Each task type has its own glyph (A auto, T tracer, ? decision,
   V verify, H action). Checkpoints use the in-flight tone, with a "Waits for …" label.
4. **Done when:** Success criteria ("What's true afterwards") beside Verification ("Checks that
   must pass").
5. **For the executor:** a folded tray with tabs for must-haves, the threat model (per your
   choice), context files, execution context, unknown tags and output. Each task's read_first,
   resume-signal, pre-condition and unknown tags sit in its own "For the executor" fold.

## Variants
- **A: Run sheet.** A big plan ID, then a docket row (modal triggers on the left, stats on the
  right). The tasks form a vertical numbered track. Auto tasks are collapsed to name, chips, file
  count and the Done line, and expand in place into two columns (Files / Tests first / Do | Verify
  / Accept when / Done). Checkpoints are open by default as in-flight bands. Expand-all and
  collapse-all controls.
- **B: Task navigator.** A title bar with triggers and stats on the right, and the objective as a
  definition list (Objective / Why / You get). Below that is a workspace: a sticky task list on the
  left and the selected task on the right, with tabs (Do · Prove it · Done; checkpoints get
  their own pair). Prev and next buttons, and ← → keys. Done when and the tray sit side by side
  at the end.
- **C: Flow strip.** The objective is shown as from → to: the title and Why on the left, a You get
  box on the right, and the rest of the objective folded. Triggers and stats sit in one meta bar.
  The tasks form a horizontal strip, with squares for auto tasks and diamonds for checkpoints.
  Selecting one fills a spec card (side column: chips, Done, Files, prev/next; main column:
  Tests first, Do, Verify, Accept when).

## Winner: B — task navigator (round 2 additions)
Round 2 added three things to B, and they now apply to every variant:
- **Planned date** in the meta row next to the eyebrow ("Planned 3 Aug 2026"). PLAN frontmatter
  has no date field, so the sketch uses the commit that added the file (`git log --diff-filter=A`).
  The build needs its own source: the quick-ID prefix (`260910-…` → 10 Sep 2026) for quick plans,
  otherwise git add-date, otherwise file mtime.
- **View / Source toggle** with a copy-path icon at the right of the meta row, the same as 013–018.
  Source shows the raw file with line numbers.
- **"In the source only" strip** in place of the For-the-executor tray. It links to Must-haves,
  Threat model, Context files, Execution context, unknown tags, Output and Frontmatter, and each link
  opens Source with that block highlighted. Each task's read_first, pre-condition, resume-signal and
  unknown tags become a one-line "In the source only" row that jumps to that task's `<task>` line.

## What to Look For
- 05-01: does the ~1,600-word action stay readable (clamped, then "Read all")?
- 0x4: do 7 tasks scan well as a track, a list and a strip?
- 01-06 / 04-02 / sya: does each checkpoint read as "this stops for you", and is the human-action
  step list comfortable to follow?
- Do the modals carry enough (the file→task chips especially) to justify moving these lists off
  the page?
