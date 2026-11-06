---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 15
subsystem: web-views
tags: [spikes, verdict-board, view-kind, route-redirect, view-14]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 adoption of C1 and X2 and approval of X4; 11-10 viewKindOf table and pause wiring pattern; 11-12 SpikesContext (lanes, tiles, notInManifest, wrapUp)"
provides:
  - "The 'spikes' view kind (33rd) and four viewKindOf rows: spikes-manifest, spike, spikes-wrap-up, spikes-conventions"
  - "/documents spikesContext for the four spike kinds; ViewInput.spikesContext; ViewManifest.spikesPage"
  - "composeSpikes (pure) and ComposedSpikes; SpikesView (board) and spikesHeaderProps"
  - "Bare /spikes redirect: manifest key, else first spike README by id order, else not-found"
  - "CSS block phase-11-spikes (view-spikes-* names), column counts at --fs-display-1 (X4 approved)"
affects: [11-16]

actuals:
  tokens: 52000
  tasks: 2
  commits: 2
plan_head_before: 9d55661f84bd879c54be3c49c3eaaa28cd022c23
plan_head_after: 4728d12b31f27277f4c17152308b3474b22afbb5

tech-stack:
  added: []
  patterns:
    - "One composer plus one components file per page, wired through a guarded /documents context IIFE and one manifest slot (the pause shape)"
    - "Static-markup tests for a Link-bearing view inside a MemoryRouter"

key-files:
  created:
    - src/web/views/spikes-page.ts
    - src/web/views/spikes-page-components.tsx
    - test/web/spikes-page.test.ts
  modified:
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/route-dispatch.ts
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - test/web/view-registry.test.ts
    - test/web/route-dispatch.test.ts
    - test/server/documents-route.test.ts

key-decisions:
  - "X4 was approved at 11-01, so the column counts are drawn at --fs-display-1 (the page's fifth size, the one use, pinned by test)"
  - "The wrap-up line shows whenever WRAP-UP-SUMMARY.md is absent and names only what is missing; a present CONVENTIONS.md keeps its tile (Shapes)"
  - "A folder with no README is a non-link tile reading 'No README'; a manifest that is missing or unreadable gives facts '{n} spikes' plus 'No manifest' or 'Manifest unreadable' and no counts or lead"
  - "An unknown keyword or empty cell is an untoned dashed tile in Pending showing the cell as written; the README-says flag and Wrapped up are plain foot text as in sketch 053 A"

requirements-completed: [VIEW-14]

status: complete
duration: 40min
completed: 2026-11-07
---

# Phase 11 Plan 15: Spikes verdict board Summary

**/{project}/spikes/manifest (and each spike README, CONVENTIONS and WRAP-UP-SUMMARY address) now opens one Spikes page built from sketch 053 A: a verdict board with one lane per idea across Validated, Partial, Invalidated and Pending, each column with its total at --fs-display-1, link tiles that keep the free text and flag a README that disagrees, then "Not in the manifest" and "Wrap-up" below; the bare /spikes redirects to the manifest.**

## Accomplishments

- Task 1 (tracer): kinds table, manifest slot, /documents `spikesContext`, artifact-page pass-through, `composeSpikes`/`SpikesView`, CSS block, tests; `/spikes/manifest` photographed on Lendshed (4 png, no FAIL line) beside sketch 053 A in light and dark at 1280 and 390. The tracer's automated verify passed, so no checkpoint.
- Task 2: every board state (empty cell as a dashed hairline with no count, unknown keyword, folder with no README, missing and unreadable manifest, singular "1 requirement"), the below-board sections, narrow stacks with the chip key, and the bare /spikes redirect; Shapes' `/spikes` photographed and lands on its manifest page.
- Full gate: `gate: total=6614 passed=6614 failed=0 skipped=0 todo=0`; typecheck, lint and build exit 0.

## Task Commits

1. Task 1 (tracer): the spikes manifest opens a verdict board grouped by idea - `f720acd`
2. Task 2: board states, wrap-up line and the bare /spikes redirect - `4728d12`

## Side-by-side with sketch 053 A

Matches the board: head (eyebrow, h1, lead with mono counts, facts), column counts over their chips, lanes with description (3-line clamp, full text in title) and requirements toggle, tone-bordered tiles, dashed flag, below-board strips; at 390 the board becomes one stack per idea with the chip key and column labels, empty columns skipped, no sideways scroll. Differences left on purpose:

- The sketch's 3% wash on the Validated column cells is omitted (UI-SPEC colour rules and the page's no-color-mix contract; the recipe is not a theme token).
- Sketch chrome (address line, "copy manifest path" label) is the app's own header: the facts sit in the meta row and the shared copy button carries the manifest path.
- "Wrapped up" is plain foot text and the README flag is a dashed box, as drawn; UI-SPEC's "quiet chip" wording was read as that drawing.
- The Conventions tile shows no section list: the 11-12 context carries only its address, so the sketch's "Stack · Structure ..." line is not claimed.

## Deviations from Plan

**1. [Rule 1 - Bug] Plan said Shapes has no wrap-up files**
- Shapes holds a CONVENTIONS.md with no WRAP-UP-SUMMARY.md, so "one quiet line instead of tiles" would hide a real file. The Conventions tile stays and the line reads "Not wrapped up yet: no WRAP-UP-SUMMARY.md in .planning/spikes/."; with neither file the line names both, as in the sketch. Commit 4728d12.

**2. [Environment]** node_modules is a symlink to the main checkout's (untracked, removed before return). The labelore service serves the main checkout, so the plan's `systemctl --user restart labelore` steps were skipped: after merge the main checkout needs `npm run build` and `systemctl --user restart labelore`. The per-plan commit ledger was not written; `plan_head_before` is the dispatch base and the commits were counted by `git rev-list`.

## Notes for 11-16

- Tiles already take `aria-current="page"` from `activeKey` (folder segment of the tile's address, case-insensitive); the sheet itself, the files list, "Manifest says / README says" block and docs vocabulary rows are untouched.
- `SpikesView` is keyed by `artifact.path` in artifact-page.tsx; switch it to a stable key if the sheet must open without remounting the board.
- The design-language doc has no `view-spikes-*` row (view-local names need none) and no language bullet yet.

## Known Stubs

None.

## Threat Flags

None. T-11-24 mitigated and tested (author text through ResearchInline, hostile name and verdict escaped, no raw-HTML prop); T-11-25 mitigated and tested (the /spikes target is a payload key through redirectTo); no new endpoint or file access.

## Self-Check: PASSED

- Created files exist: spikes-page.ts, spikes-page-components.tsx, spikes-page.test.ts
- Commits f720acd and 4728d12 are ancestors of HEAD
- Acceptance: `'spikes'` in kinds.ts (5), `toBe(33)` 1, `buildSpikesContext(` in project-api.ts 1, `'/spikes'` in route-dispatch.ts 1, `Not in the manifest` in spikes-page.ts 3, `view contract` in spikes-page.test.ts 3
