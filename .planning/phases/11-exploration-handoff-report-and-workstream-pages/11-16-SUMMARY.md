---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 16
subsystem: web-views
tags: [spikes, sheet, dialog, focus-return, view-14]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 adoption of C1 and C4 and approval of X4; 11-10 shared RecordDisagreement; 11-12 SpikesContext (files list, pauseUrl); 11-15 the verdict board"
provides:
  - "The sheet model in composeSpikes (ComposedSpikes.sheet: spike, wrap-up and conventions kinds) and sizeWords"
  - "SpikesView with the shared Dialog docked right, and SheetBody (the panel content, exported for tests)"
  - "useProjectLocation now also returns the router state"
  - "Design-language rows: spikes uses in the four Tones rows, a Spikes page bullet and the listed-by-name-only bullet"
  - "test/e2e/spikes-sheet.spec.ts (three browser checks)"
affects: []

actuals:
  tokens: 25000
  tasks: 3
  commits: 3
plan_head_before: b350cbd37569efb2e126faa5532cb46c8aa96f68
plan_head_after: 4f25026234adac69b99d3ca04d75ec540623a03a

key-files:
  created:
    - test/e2e/spikes-sheet.spec.ts
  modified:
    - src/web/views/spikes-page.ts
    - src/web/views/spikes-page-components.tsx
    - src/web/styles/globals.css
    - src/web/nav.tsx
    - src/web/pages/artifact-page.tsx
    - docs/design-language.md
    - test/web/spikes-page.test.ts

key-decisions:
  - "The sheet is the open document's own address: a spike README, WRAP-UP-SUMMARY or CONVENTIONS opens the page with the sheet open (C1); the sheet reads the active file's lift and sections from the ViewInput and the tile, files list and pauseUrl from the 11-12 context"
  - "Closing navigates to the manifest address with a router-state key naming the opening tile's folder; SpikesView focuses that tile after the board remounts (the page does remount between addresses, so a ref would not survive). With no manifest the sheet hides in place and the tile is focused locally"
  - "A folder with no manifest row shows a dashed 'Not in the manifest' chip plus the line 'This folder has no row in MANIFEST.md. Its README says ...' (as sketch 053 A draws it)"
  - "File rows are text only (name, kind, size): no anchor, nothing read or requested; the by-name line sits in the components file"

requirements-completed: [VIEW-14]

status: complete
completed: 2026-11-07
---

# Phase 11 Plan 16: The Spikes sheet Summary

**Each spike README, CONVENTIONS and WRAP-UP-SUMMARY address now opens the Spikes board with its panel in a right-docked sheet: id, idea and type, the name, a big verdict chip, the shared disagreement record where the manifest and README part ways, Given / When / Then, Results, Related chips, the files listed by name only, tags and the remaining sections as closed bars; Esc or the scrim goes back to the manifest and the opening tile gets focus.**

## Accomplishments

- Task 1 (tracer): sheet model and view, CSS, unit tests; 003b's address shows both verdicts apart (MANIFEST.md VALIDATED, README.md PENDING (needs a recording)). Verify: gate green, 4 png, no FAIL.
- Task 2: full sheet content for spikes, wrap-up (processed chips, key findings, not processed) and conventions (sections as bars), vocabulary rows in docs/design-language.md, contract tests (shared RecordDisagreement, file rows with no link, by-name line once).
- Task 3: three browser tests on Lendshed pass in system Chrome (direct open, Esc to the manifest address, scrim close with focus returning to 001's tile); side-by-side screenshots taken.
- Full gate: `gate: total=6699 passed=6699 failed=0 skipped=0 todo=0`; typecheck, lint and build exit 0.

## Task Commits

1. Task 1 (tracer): `36659b2`
2. Task 2: `bcebc23`
3. Task 3: `4f25026`

## Side-by-side with sketch 053 A

Shot on Lendshed (manifest, 003b README, 001 README, wrap-up, conventions), Shapes (manifest), the generated letter family (manifest) and a hand-copied real spikes tree (manifest and 001a README, copied to a scratch folder, never committed), each at 1280 and 390, light and dark. No FAIL line (one h1, no sideways scroll at 390, no page errors). The sheet reads as the sketch's: address chip and close at the top, eyebrow, name, big chip with free text, dashed disagreement frame, G/W/T box, Results, Related chips, dashed files list with the by-name line. Differences left on purpose:

- No slide-in: the spikes CSS block forbids transitions and animation (11-15's contract), so the sheet appears at once.
- Results/section bodies are the shared document markup scaled down to the page's sizes (page-scoped `.view-spikes-md` rules, same approach as the pause page), so long real READMEs show their own list spacing.
- The disagreement block uses the shared `record-disagreement` ("Verdict · MANIFEST.md" beside "Verdict · README.md", values as written) plus the sketch's foot line, not the literal words "Manifest says / README says" (the shared component's labels are "{field} · {file}").
- The Conventions tile still shows no section list (carried over from 11-15).
- Typography (X4, approved at 11-01): column counts stay the one `--fs-display-1`; the sheet adds only `--fs-7` (title), `--fs-4` (body, big chip) and `--fs-2`, all within the contracted five sizes.

## Deviations from Plan

**1. [Rule 3 - Blocking] artifact-page.tsx and nav.tsx edited**
- The sheet needs `renderHtml` (the sanctioned sanitised section path) and a stable board across address changes, so `SpikesView` is now `key="spikes"` with `renderHtml` passed (11-15's own note). Focus return across the remount needs router state, so `useProjectLocation()` also returns `state`. The pinned test line for the old key was updated. Commit 36659b2.

**2. [Environment]** node_modules is a symlink to the main checkout's (untracked, removed before return). The labelore service serves the main checkout, so every `systemctl --user restart labelore` step was skipped: after merge the main checkout needs `npm run build` and `systemctl --user restart labelore`.

## Known Stubs

None.

## Threat Flags

None. T-11-26 mitigated and tested (file rows have no anchor, only name/kind/size are in the model, `fetch` is never called while rendering, listed bytes stay unread); T-11-56 mitigated (section bodies go through `renderHtml`, author text through ResearchInline, chips link only to payload addresses; the raw-HTML guard still allows one site).

## Self-Check: PASSED

- Created: test/e2e/spikes-sheet.spec.ts (3 tests, uses artifactUrl)
- Commits 36659b2, bcebc23 and 4f25026 are ancestors of HEAD
- Acceptance: `RecordDisagreement` in spikes-page-components.tsx (3), by-name line (1), `053 A` in docs/design-language.md (1)
