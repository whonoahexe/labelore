---
phase: 08-several-projects-and-a-switcher
plan: 02
subsystem: ui
tags: [sketch, design, switcher, landing, projects, multi-project]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: 08-UI-SPEC.md copy, tokens and states that bind both sketches
provides:
  - "Sketch 039, the header project switcher, in three variants (A popover, B wide panel, C left sheet) with a written layout contract each"
  - "Sketch 040, the projects landing page, in three variants (A stacked, B side column, C folded) with a written layout contract each"
  - "Recorded winners: 039 A, 040 B, in both READMEs, both index.html tabs and both MANIFEST rows"
affects: [08-05, 08-11, 08-13, 08-15, 08-17]

actuals:
  tokens: 25000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Sketch-first gate: layout winners are chosen by the user before any switcher or landing component is built"

key-files:
  created:
    - .planning/sketches/039-project-switcher/index.html
    - .planning/sketches/039-project-switcher/README.md
    - .planning/sketches/040-projects-landing/index.html
    - .planning/sketches/040-projects-landing/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "Header switcher (sketch 039): variant A, a popover under the name trigger"
  - "Projects landing page (sketch 040): variant B, list left with add and scan in a 448px side column"

patterns-established:
  - "Winner recording: winner letter in README frontmatter, '★ Selected' on the winning tab, MANIFEST Winner cell as 'letter — short name (build it)'"

requirements-completed: [PLAT-02, PLAT-05, PLAT-07, PLAT-08]

commits: 3
plan_head_before: 572906e5de71d4bed82f748eea7ca8450044affb
plan_head_after: eeb6747ccea8fd63f1643287d82128f3b8398e7c

duration: 1 session across a checkpoint
completed: 2026-10-30
status: complete
---

# Phase 8 Plan 02: Switcher and landing sketches Summary

**Sketches 039 (header project switcher) and 040 (projects landing page) drawn in three variants each against the 08-UI-SPEC copy and theme tokens; the user chose 039 A (popover under the name trigger) and 040 B (list left, add and scan in a side column).**

## Performance

- **Duration:** one session spanning the blocking-human decision checkpoint
- **Tasks:** 3 of 3 (tracer sketch 039, sketch 040 with MANIFEST rows, winner decision)
- **Files:** 4 created, 1 modified (all under `.planning/sketches/`)

## Accomplishments

- Sketch 039 draws the switcher three ways (A popover, B wide panel, C left sheet in sketch 038's two-column pattern), with every row state, the forget confirm, the add dialog (empty and error) and the switch-loading body, in light and dark.
- Sketch 040 draws the landing page three ways (A stacked, B side column, C folded) with populated, empty, loading, list-error, settings-notice, add (idle, adding, error, duplicate) and scan (idle, scanning, results, capped, none, refused, done) states.
- Each variant has a measurable layout contract (three to six facts at 1280px and 390px) that 08-05, 08-11, 08-13 and 08-17 build to and 08-15 asserts against the built pages.
- The user's choice is recorded everywhere the plan requires.

## Winners

**Reply, verbatim: "039 A, 040 B".** No synthesis note.

- **039: A, popover under the name trigger.** 08-11 builds the switcher to the A layout contract: a popup at most 448px wide and min(448px, 70vh) tall, left-aligned within 8px of the trigger, non-modal, full viewport width at 390px; "Add or scan…" last in the tab order; forget button 36px on a fine pointer (shown on hover or focus-within) and 40px, always visible, at 390px.
- **040: B, side column.** 08-05, 08-17 and 08-13 build the landing page to the B layout contract: from 62rem the list is on the left (678px at 1280px) and a 448px side column on the right holds "Add a project" over "Scan a folder", with a 51px gap; below 62rem the column stacks under the list in A's order.
- **Consequence for 08-17:** because 040 B won, the empty-state body copy "Add a folder or an ssh:// target above" changes the word "above" to "beside" (the forms sit beside the empty box in B). 08-13 updates the matching UI-SPEC row. The scan-none copy ("add a project by its location above") stays correct, since the add form still precedes the scan form.

Recorded in: `winner:` in both README frontmatters (and their "Winner" sections), the "★ Selected" tab label in each `index.html` (`A: Popover`, `B: Side column`), and both MANIFEST rows ("A — popover under the name trigger (build it)", "B — side column: list left, add and scan beside it (build it)").

## Task Commits

1. **Task 1: Sketch 039, the header switcher (tracer)** - `2a60fbb` (docs)
2. **Task 2: Sketch 040, the projects landing page, plus MANIFEST rows 039 and 040** - `bd1082e` (docs)
3. **Task 3: Winners recorded after the checkpoint** - `eeb6747` (docs)

The plan metadata commit (this SUMMARY) follows. `commits: 3` counts this plan's own task commits up to `plan_head_after`. The raw range `plan_head_before..plan_head_after` holds 9 commits because plan 08-01's commits and merges landed in the same base between the sketches; those are not this plan's work.

## Files Created/Modified

- `.planning/sketches/039-project-switcher/index.html` - three switcher variants, state bar, themes
- `.planning/sketches/039-project-switcher/README.md` - design question, variants, layout contracts, winner A
- `.planning/sketches/040-projects-landing/index.html` - three landing variants, three state groups, themes
- `.planning/sketches/040-projects-landing/README.md` - design question, variants, layout contracts, winner B
- `.planning/sketches/MANIFEST.md` - rows 039 and 040 with winners and "(build it)"

## Decisions Made

- 039 A and 040 B, as chosen by the user. The winner fixes layout and arrangement only; copy, tokens, states and accessibility in 08-UI-SPEC.md bind the winners.

## Deviations from Plan

None - the plan executed as written. The UI-SPEC deviations below are sketch-time observations recorded in the READMEs' "Notes for the build" for the build plans to honor; they are not plan deviations.

### Notes for the build (carried from the READMEs)

Sketch 039:
- **UI-SPEC sizes override the shipped ones.** `.brand-meta`, `.status-chip` and `.source-note` ship at `--fs-1` (10.24px) in `globals.css`; the UI-SPEC uses `--fs-2` for the meta line and chips (Label) and `--fs-3` for `.source-note` reasons (Meta). The build sets those sizes for the new uses.
- **Quiet-state icon.** The shipped `.quiet-state svg` is accent-tinted, which the UI-SPEC accent list excludes; the build overrides it neutral for the "Opening {name}…" row.
- **Links stay neutral.** The build keeps whatever the shipped `.text-link` does.
- **Notice heading.** The shipped `.notice h2` is `--fs-6`, outside the four sizes; the sketch sets the heading line at Body size, semibold.
- **Tooltip.** The sketch's "Forget this project" tooltip is CSS-only; the build uses Base UI Tooltip with the `aria-label` as the accessible name.

Sketch 040:
- **"Above" in the empty copy** becomes "beside" for the winning B (see Winners).
- **Select controls.** "Select all projects" / "Clear selection" are two text-link controls shown together, each disabled when it would change nothing.
- **Sizes and icon tint** follow the UI-SPEC (Label, Meta, Body, Heading), not the shipped `.status-chip`, `.source-note` and `.quiet-state` values.
- **Settings notices** stack above the list; the "settings could not be read" notice uses the destructive left rule, the skipped-entry notice does not.
- **Capped scan** draws 100 generated items to show the length; the cap notice sits above the list.

## Issues Encountered

None.

## Verification

- `grep -E '^winner: "?(A|B|C|synthesis)'` prints one line in each README (`winner: A`, `winner: B`).
- `grep -nE '^\| (039|040) \|.*\(build it\)' .planning/sketches/MANIFEST.md` prints two lines (54 and 55).
- `test/fixture-leak.test.ts`, `test/presentation/sketches.test.ts` and `test/server/sketch-files.test.ts` pass (3 files, 66 tests), run with the main checkout's vitest binary.

## Known Stubs

None. The sketches are throwaway HTML mockups by design; no application source was changed.

## Threat Flags

None. No application code, endpoints or file access were added; only `.planning/sketches/` content with made-up names, paths and hosts.

## Self-Check: PASSED

- Files present: both sketch `index.html` and `README.md` files, `MANIFEST.md`.
- Commits present in HEAD ancestry: `2a60fbb`, `bd1082e`, `eeb6747`.
