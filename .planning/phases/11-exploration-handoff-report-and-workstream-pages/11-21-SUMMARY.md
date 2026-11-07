---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 21
subsystem: sketches
tags: [sketch, onboarding, onboarding-summary, view-18, design-choice]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-02 recorded onboarding summary shape; 11-09 made-up Lendshed and Tidemark summaries; 11-20 buildOnboardingContext (firstScreen, differs)"
provides:
  - "Sketch 061, the onboarding page in three pictures (A Desk, B Meter ledger (reuse), C Floors); winner A"
  - "MANIFEST row 061 with the winner recorded"
affects: [11-26]

actuals:
  tokens: 45000
  tasks: 2
  commits: 2
plan_head_before: e069f07ea1d1e2337461f5add4c45bca68dfb733
plan_head_after: 4652dc6e070ef3c5989eaf0a22d6087230b6ff59

tech-stack:
  added: []
  patterns:
    - "Three variants per page, each a different kind of picture rather than a reordering of sections"

key-files:
  created:
    - .planning/sketches/061-onboarding-page/index.html
    - .planning/sketches/061-onboarding-page/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "Onboarding page builds variant A, the Desk, with the second block to the right of the command in the differing case (user choice, 061)"

patterns-established:
  - "Winner recorded in the README winner field, the Selected tab and the MANIFEST Winner cell"

requirements-completed: []

duration: n/a (spans a user checkpoint)
completed: 2026-11-07
status: complete
---

# Phase 11 Plan 21: Onboarding page sketch Summary

**One sketch (061 onboarding page), three pictures (A Desk, B Meter ledger (reuse), C Floors), with the user's winner recorded: the Desk, the project drawn as a folder of four file slots, a folder of seven map documents and a pile of candidate documents on one table.**

## Winner

The user replied: "61A".

- **061 (onboarding page): A, Desk.** Opens on a picture of the project as three objects on one table: a folder with
  four sheet slots (the four planning files, present sheets tinted, missing ones dashed), a smaller folder of seven mini
  documents (the codebase map and its readiness), and a pile of candidate documents. The recommended command leads in
  the shared copy-command row. Beside the Phase 10 map-only first screen, the second block ("The first screen suggests",
  with its own "Copy command") sits to the right of the command in the differing case, so the "summary says / first
  screen says" pair is the first thing read; the desk never repeats the Phase 10 head's stack and concern counts.
- **Synthesis:** none. The user named A alone.
- **Open choices, not objected to, so they stay as drawn in A:** the quiet "From the onboarding summary" line stays in
  the differing case; the never-runs sentence ("Labelore does not run commands. Paste it in your terminal.") appears
  once, under the summary's command.

Recorded in the README (`winner:` field and `## Winner` section), the winning tab (marked "★ Selected") and the MANIFEST
row (`A Desk (build it)`). Reference for the build: 11-26 builds the onboarding view.

## Accomplishments

- 061 drawn as three variants with a state bar of five states (`present`, `partial`, `maponly`, `same`, `missing`),
  both themes, a layout contract and a four-size font list; no colour literal, tones and tokens only.
- The choice taken from the user at the checkpoint and written into the sketch folder and the MANIFEST.

## Task Commits

1. Task 1, sketch 061: `1f31f35`
2. Task 2, winner recorded: `4652dc6`

## For 11-26 (sketch-only states)

Three states exist **in the sketch only**, not in the Lendshed and Tidemark fixtures from 11-09. Cover them with planted
test copies (a temp copy of a fixture with the lines changed, made inside the test), not by editing the fixtures, which
would shift pinned counts elsewhere:

- **`partial`: part-way, fast map.** Two of four files present, a fast map of 4 documents, 1 candidate,
  `/gsd-new-project`. Made up for the sketch.
- **`same`: map-only, both commands the same** (`/gsd-new-project`). `differs` is false, so no second block is drawn.
  Made up for the sketch.
- **`missing`: all four files missing, no map**, 0 candidates, `/gsd-map-codebase`. Not map-only, so one command. 11-09
  notes the writer does not produce a no-file state with a map; this one has no map either. Made up for the sketch.

The `present` (Lendshed) and `maponly` (Tidemark) states are real fixture cases and need no planting. The 11-02 / 11-09
note stands: a map-only project with four missing files is not what the writer produces, so `maponly` is a fixture case;
the page handles it either way.

## Deviations from Plan

None. The plan paused at the Task 2 checkpoint as designed and resumed on the user's reply. STATE.md and ROADMAP.md were
not touched, as instructed by the caller. Commits were counted by hand (two), not by rev-list from the plan base, because
plan 11-25 ran in a separate worktree at the same time.

## Known Stubs

None. The sketches are throwaway HTML by design and contain made-up text only.

## Self-Check: PASSED

- Commits `1f31f35` and `4652dc6` are ancestors of HEAD.
- The 061 README carries `winner: A`, the winning tab reads "★ Selected", MANIFEST row 061 names "A Desk (build it)".
