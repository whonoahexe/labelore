---
phase: 09-review-audit-and-root-document-pages
plan: 09
subsystem: ui
tags: [project-page, decisions-spine, key-decisions, sketch-041, screenshots, e2e]
status: complete

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "09-08 structured.project (milestone, constraints, outOfScope, lastUpdated), the goal cell, the margin and the marked project CSS region"
provides:
  - "structured.project.decisions: every Key Decisions row (at most 500) with tag, era, rationale, outcome, outcomeLabel and note"
  - "The decision spine: ol with a 1px rail, outcome status-squares, tag and outcome chips, era markers, a jump strip, a tally legend and a per-row Why / How it turned out reveal"
  - "test/e2e/project-page-screenshots.spec.ts: layout-contract assertions and paired build and sketch screenshots for three projects"
  - "Shapes fixture PROJECT.md carrying the sketch's nine made-up Kiln decisions"
affects: [09-10]

actuals:
  tokens: 60000
  tasks: 3
  commits: 3
plan_head_before: 6490e8a630a7f7a74836bfb312220c7a1458a0ce
plan_head_after: d32b9b8e2a59442e3f2b31b9792b7764f4bf4d54

tech-stack:
  added: []
  patterns:
    - "Tag and outcome classification by character scan (no pattern), capped rows and strings, inside the handler's own try/catch"
    - "A jump-to row is marked by React state (data-flash) cleared by a 1500 ms timer, with no CSS motion"

key-files:
  created:
    - test/e2e/project-page-screenshots.spec.ts
  modified:
    - src/planning-repo/handlers/project.ts
    - src/web/views/project-page.ts
    - src/web/views/project-page-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/fixtures/shapes/.planning/PROJECT.md
    - test/__golden__/dense.json
    - test/__golden__/sparse-empty.json
    - test/__golden__/sparse-started.json
    - test/project-handler.test.ts
    - test/web/project-page.test.ts
    - test/web/project-view-contract.test.ts
    - test/e2e/sketch-file.ts

key-decisions:
  - "extractProject takes the already-parsed Key Decisions rows as a third argument, so the table is parsed once; the view-contract test's try-block position checks were updated to match"
  - "An outcome the classifier does not recognise is 'other': a quiet square, no chip, its whole cell as the note; it is left out of the tally"
  - "The jump button's aria-label falls back to 'no outcome' when an unclassified row has no note, so it never ends in a bare colon"
  - "The row's note is hidden while the row is open (the reveal repeats it under How it turned out), as in the sketch"

patterns-established:
  - "Spine CSS lives inside the phase-09-project-page region; raw lengths inside calc() go through named custom properties to satisfy the token guard"

requirements-completed: [VIEW-07]

duration: 55min
completed: 2026-11-03
---

# Phase 9 Plan 09: Project page decision spine Summary

**The project page now lists every Key Decision in the author's order on a spine with outcome squares, tag and outcome chips, era markers, a jump strip and a tally, and the build was screenshot beside sketch 041 B on this repo, Lendshed, Shapes and one real short PROJECT.md.**

## Accomplishments

- `ProjectHandler` adds `structured.project.decisions`: tag (`vN`, `Phase N`, `D-N`, `quick...` as the trailing parenthetical, so `(roadmap vs disk, ...)` stays text), era (`v` + digit or `Phase ` only), outcome by the first word after leading symbols (so "✓ Good — revisit only if corpus size grows substantially" is Good), label and note. At most 500 rows, every string capped at 600, all by character scans.
- The composer turns rows into tones (`complete`, `in-flight`, `missing`, `quiet`), a chip flag (Revisit, Reversed, Pending only), a tally that drops zero counts and era markers where the era changes.
- The spine (`ProjectPageView`): heading with count and an `aria-pressed` "Show every reason" / "Hide every reason", the "Every decision in order" jump group (one named square button per decision), the tally legend and the `ol`. Each row is a button with `aria-expanded` revealing Why and How it turned out; the jump scrolls to the row, focuses it and sets `data-flash` for 1.5 s. The body renders for decisions alone as well as with a margin (`data-margin="false"` is a single column).
- Shapes' PROJECT.md carries the nine invented Kiln decisions, giving the build Good, Revisit, Reversed and Pending.
- `test/e2e/project-page-screenshots.spec.ts` (14 tests, all passing) asserts the layout contract at 1280 and 390, light and dark, on three projects and writes 12 build and 12 sketch shots to `test-results/phase-09/`. `sketchWinner` now accepts `winner: "B"`.

## Task Commits

1. **Task 1 (tracer): the spine** - `83ef0b2` (feat)
2. **Task 2: Shapes carries the Kiln decisions** - `0bac384` (test)
3. **Task 3: build beside the sketch** - `d32b9b8` (test)

## Verification

- Full unit suite: 230 files, 5084 tests passed, none skipped. `tsc` for server and web and `eslint .` are clean.
- `npx playwright test test/e2e/project-page-screenshots.spec.ts`: 14 passed (run with the system Chrome, see Issues).
- Screenshots were looked at beside the sketch. Shapes at 1280 light read as sketch B: masthead, strip, jump squares, tally, spine with rail, era ticks, Reversed, Revisit and Pending chips, notes under rows and the margin to the right. Differences seen: the plan's tag chip appears on tagged rows where the sketch shows only the era marker; Kilnrow's own masthead text and counts differ from Kiln's (as flagged in the plan); the dashed Pending square reads slightly more bracket-like on the rail. This repo's 27+ decisions at 390 dark has no horizontal scroll and matches the sketch's structure.
- Real short PROJECT.md: one real GSD project on this machine (12 decisions, one Reversed) was served from a temporary config directory and photographed at 1280 and 390 into a temporary folder, looked at, and deleted. Nothing differed from the fixtures: spine, era marker, chips, clamped notes and margin lists read correctly, no sideways scroll.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Token guard rejected raw lengths inside calc()**
- **Found during:** Task 1
- **Fix:** `0.5px` and `0.3rem` became custom properties (`--view-project-rail-x`, `--view-project-era-drop`).
- **Commit:** 83ef0b2

**2. [Rule 3 - Blocking] View-contract test pinned the old call shape**
- **Issue:** It required `extractProject(fm.body, sections)` and `const keyDecisionsSection` before the try; the table is now parsed once before the try and passed in, and the tone check allowed only `{tile.tone}`.
- **Fix:** Updated the strings to `extractProject(fm.body, sections, keyDecisions)` / `const keyDecisions =` and allowed `{row.tone}` and `{entry.tone}`.
- **Commit:** 83ef0b2

**3. [Rule 2 - Missing critical] Aria-label fallback**
- A jump button for an unclassified row with no note would have read "07 title: "; it reads "no outcome". Commit 83ef0b2.

Also: the sparse goldens changed as well as the dense one (each holds a PROJECT.md); each diff is only the added `decisions`.

## Issues Encountered

- No Playwright browser is installed on this machine (`chromium_headless_shell-1243` is missing), so the plan's precondition did not hold as stated. I ran the unchanged spec through a throwaway config (not committed, removed) that points Playwright at `/usr/bin/google-chrome`; the committed config is untouched. The browser download was not attempted.
- The worktree has no `node_modules`; tools ran from the main checkout's binaries. The `dist`, `node_modules/.vite` and `test-results` the tools made in the worktree were removed, so the 24 screenshots no longer exist on disk (they are gitignored); re-run the spec after merge to regenerate them. `npm run build` and `systemctl --user restart labelore` were not run here (the service serves the main checkout): the orchestrator must build and restart after merge. `vite build` itself ran as part of the Playwright server start and succeeded.

## Known Stubs

None.

## Threat Flags

None. No new endpoints; author text renders only through `LeadText` as React text (asserted by a markup-escape test and the view contract). T-09-18 mitigated (500 rows, 600-character strings, growth test on a 100,000-row table); T-09-19 mitigated (the real-project shots went to a temporary folder and were deleted, the spec names no private path, `fixture-leak.test.ts` passes).

## Self-Check: PASSED

- Created: test/e2e/project-page-screenshots.spec.ts, this SUMMARY.
- Commits 83ef0b2, 0bac384 and d32b9b8 are ancestors of HEAD.
