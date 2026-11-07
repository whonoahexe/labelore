---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 14
subsystem: sketches
tags: [sketch, seed, thread, view-15, view-16, design-choice]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-02 recorded seed and thread shapes; 11-08 made-up Lendshed seeds and threads"
provides:
  - "Sketch 057, the seed page in three pictures (A Dormant to surface, B Fan of references, C Seed packet); winner C"
  - "Sketch 058, the thread page in three pictures (A Status dial, B Route, C Day grid); winner A"
  - "MANIFEST rows 057 and 058 with winners recorded"
affects: [11-22, 11-23]

actuals:
  tokens: 70000
  tasks: 3
  commits: 3
plan_head_before: 4d18a99f81826c3961fadc90b73ae63f542ef869
plan_head_after: 75291aeaab2aa2870a9637cd526443c031b7f4ad

tech-stack:
  added: []
  patterns:
    - "Three variants per page, each a different kind of picture rather than a reordering of sections"

key-files:
  created:
    - .planning/sketches/057-seed-page/index.html
    - .planning/sketches/057-seed-page/README.md
    - .planning/sketches/058-thread-page/index.html
    - .planning/sketches/058-thread-page/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "Seed page builds variant C, the Seed packet (user choice, 057)"
  - "Thread page builds variant A, the Status dial (user choice, 058)"

patterns-established:
  - "Winner recorded in the README winner field, the Selected tab and the MANIFEST Winner cell"

requirements-completed: []

duration: n/a (spans a user checkpoint)
completed: 2026-11-07
status: complete
---

# Phase 11 Plan 14: Seed and thread page sketches Summary

**Two sketches (057 seed page, 058 thread page), three pictures each, with the user's winners recorded: the Seed packet envelope for seeds and the Status dial for threads.**

## Winners

The user replied: "C seems interesting for 57 and A seems good for 58".

- **057 (seed page): C, Seed packet.** The picture is an envelope: a square postmark ("Planted" and the date), a dashed
  stamp carrying the scope letter, the "Surface when" sentence as the address, the status as a seal, and
  `audit_acknowledged` as a dashed postscript line. Why, Breadcrumbs and the closed bars follow as folded sheets in one
  narrow column (at most 48rem). No synthesis note.
- **058 (thread page): A, Status dial.** The picture is a half-dial of Open, In progress, Resolved with the needle on
  the thread's own status, the status chip beneath it with Created, Updated and the age of the last update. Beside it
  "Next steps" (first one boxed) over "Goal"; Context and References in two columns below. An unrecognised status leaves
  every arc grey and the needle at rest. No synthesis note.

Recorded in each README (`winner:` field and `## Winner` section), the winning tab (marked "★ Selected") and the
MANIFEST rows (`C Seed packet (build it)`, `A Status dial (build it)`). Reference for the builds: 11-22 builds the seed
page, 11-23 builds the thread page.

## Accomplishments

- 057 and 058 drawn as three variants each, with a state bar for the four hard seeds and four hard threads, both themes,
  1280 and 390 widths, a layout contract and a four-size font list.
- The choice taken from the user at the checkpoint and written into the sketch folders and the MANIFEST.

## Task Commits

1. Task 1, sketch 057: `18efd40`
2. Task 2, sketch 058: `599351d`
3. Task 3, winners recorded: `75291ae`

## For 11-22 and 11-23 (fixtures)

Two examples exist **in the sketches only**, not in the Lendshed fixtures from 11-08:

- **057: SEED-260402-w9d** (triggered, large scope, breadcrumbs that do not resolve). If the Seed packet frame needs
  the unresolved-breadcrumb state to be seen or tested, 11-22 adds a matching seed to the fixtures.
- **058: steward-rota-view** (current shape, empty next steps). If the Status dial frame needs the empty-steps state,
  11-23 adds a matching thread to the fixtures.

Other open points carried forward: both h1s can be long (the header caps or wraps, decided in the build); the older
thread shape (`## Status:` section, no frontmatter) takes its status word from the body; a free-text thread reference is
never a link; C draws no "No breadcrumbs" word (only B did), so 11-22 decides whether the absence is worth a word.

## Deviations from Plan

None. The plan paused at the Task 3 checkpoint as designed and resumed on the user's reply. STATE.md and ROADMAP.md were
not touched, as instructed by the caller.

## Known Stubs

None. The sketches are throwaway HTML by design and contain made-up text only.

## Self-Check: PASSED

- Commits `18efd40`, `599351d`, `75291ae` are ancestors of HEAD.
- Both READMEs carry `winner:` set, both winning tabs read "★ Selected", MANIFEST rows 057 and 058 name the winners.
