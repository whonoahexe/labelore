---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 11
subsystem: web-views
tags: [pause, handoff, continue-here, moved-on, rest-of-handoff, roadmap-link, view-17]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-07 PauseContext (movedOn, contextLabel, restSections); 11-10 pause view; 11-12 movedOnForSpike"
provides:
  - "RoadmapPhaseRow.pausedHereUrl and the 'Paused work' link on a phase block (D-07)"
  - "The dashed 'Work has moved on since: {what} ({source}, {date})' note beside the pause date (D-08)"
  - "'The rest of the handoff': closed bars tagged with their file, counts on lists, ellipsised mono paths, continue-here sections through the sanitised section HTML"
affects: [11-13]

actuals:
  tokens: 36000
  tasks: 3
  commits: 2
plan_head_before: b784ee1ca7fce11a0fa88d26a0eadd3a55f58559
plan_head_after: 587f980fa984abde080bf8dcf54db2cdb34c5185

key-files:
  created: []
  modified:
    - src/presentation/roadmap.ts
    - src/web/pages/roadmap-page.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/views/pause-page.ts
    - src/web/views/pause-page-components.tsx
    - src/web/styles/globals.css
    - test/presentation/roadmap.test.ts
    - test/web/pause-page.test.ts

key-decisions:
  - "pausedHereUrl is the payload key of the .continue-here.md whose path is exactly the phase's dirPath plus the file name; never built from file text (T-11-55)"
  - "A list bar's count is its row count; prose bars (context notes, tag sections, other sections) carry no count"
  - "A continue-here section renders through the document's sanitised group HTML when the document holds a group under the same heading; later sections claim a heading first, so a '## Context' heading and a <context> tag each get their own body; otherwise the author's text is shown as paragraphs and bullet lists"

requirements-completed: [VIEW-17]

duration: 50min
completed: 2026-11-07
status: complete
commits: 2
---

# Phase 11 Plan 11: Pause page finish Summary

**The pause page now says when work has moved on (a dashed quiet note beside the date), folds the whole rest of the handoff into closed file-tagged bars (lists counted, uncommitted paths ellipsised with the full value in title, note sections through sanitised HTML), and the roadmap's phase block links to the `.continue-here.md` in its folder.**

## Accomplishments

- Task 1 (tracer): `RoadmapPhaseRow.pausedHereUrl` is found by folder from the payload's artifacts; the phase block shows a small "Paused work" text-link. Lendshed phase 3 carries the nested note's key (`/v1.1/phase-3/continue-here`), phase 1 carries null. The nested head ("Paused work · phase 4", "Paused in phase 4, ...", "Paused in spike SPIKE-006") already came out of 11-07/11-10; tests now pin it for the phase 3 folder note and the SPIKE-006 note, including "No HANDOFF.json" and no moved-on note.
- Task 2: `head.movedOnLine` and the `view-pause-moved` note drawn in the header lead beside the date line (outside the stop and gate fields); `ComposedPause.rest` and `RestOfHandoff` (HANDOFF.json bars in order Blockers, Decisions, Uncommitted files, Context notes, async jobs, Other keys by name, then every continue-here section). The copy-path buttons and the missing-partner words from 11-10 are covered by tests here (one file alone, both files, nested).
- Task 3: built, shot Lendshed `/handoff`, `/continue-here`, `/v1.1/phase-3/continue-here`, `/spikes/SPIKE-006/.continue-here` and Shapes `/handoff` (20 png, no FAIL line, no sideways scroll at 390), and compared to sketch 054 C.
- Verification: `gate: total=85 passed=85 failed=0` on the plan's gate files plus roadmap tests; `npm run typecheck`, `npm run lint` and `npm run build` exit 0.

## Task Commits

1. Task 1 (tracer): the roadmap block's link to the paused work - `f5fc038`
2. Task 2: moved-on note, rest of the handoff, tests (nested head tests ride here) - `587f980`
3. Task 3: screenshots only; no change needed, so no commit

## Side-by-side with sketch 054 C (Task 3)

Matches the layout contract: head with the dashed note beside the date, copy buttons and missing-partner words, rail with gates, side notes, boxed resume, closed bars at the foot with the file tag at the right; at 390 the rail keeps two columns and the note and tags wrap with no sideways scroll; dark and light both read as the winner. Differences left on purpose:

- A list bar's count is a separate mono chip ("Blockers  2"), the sketch prints it in the name as "(2)". The count is in the summary either way.
- File tags keep the file's case (`.continue-here.md`); the sketch uppercases them (same choice as 11-10's copy buttons).
- The sketch's nested-spike frame has a link back to the spike page; UI-SPEC section 3 puts the link on the phase or spike page toward the pause, not back, so it is not built.
- The shoot helper's age counts to the real clock ("214 days ago"), so shots differ from the sketch's made-up "today"; the tests pin the counts to a fixed read day.

## Deviations from Plan

**1. [Rule 1 - Bug] Plan counts disagree with the fixtures**
- Shapes `/handoff` has its root `.continue-here.md` beside it (11-07 pairs a frontmatter-less root note with the root HANDOFF), so its head shows two copy buttons, not one plus the missing-partner words. The one-file case is tested on a planted copy with the continue-here artifacts removed. Lendshed's moved-on source is STATE (11-07 deviation 1), not ROADMAP: "(STATE, 2026-04-14)". Lendshed's HANDOFF rest has an "Other keys" bar (`retention_window_days`), which the order in the plan names as "unknown keys by name".

**2. [Rule 3 - Blocking] `artifact-page.tsx` passes `renderHtml` to `PauseView`**
- Not in the plan's files. The continue-here sections need the document's sanitised HTML path, which only the page can supply; the one-line change is `<PauseView ... renderHtml={renderHtml} />`, and the existing source-contract test string was updated. 11-13 does not touch the file.

**3. [Environment]** node_modules was a symlink to the main checkout's (untracked, removed before return). The labelore service serves the main checkout, so `systemctl --user restart labelore` was skipped; the main checkout needs `npm run build` and a restart after merge. `test/helpers/shoot-pages.ts` takes a long time on sketch 054 (it ran to completion but slowly, no sketch png written); the sketch was photographed with a throwaway script outside the repository.

**4. Minor:** `stripLeadingHeading` needs a DOM, so the leading-heading strip of a section's HTML is untested in node; the bar's own body is asserted instead.

## Known Stubs

None.

## Threat Flags

None. T-11-55 mitigated and tested (the link is a payload key found by folder); T-11-14 accepted as written. No new endpoint or file access.

## Self-Check: PASSED

- Modified files exist; commits f5fc038 and 587f980 are ancestors of HEAD
- Acceptance: `pausedHereUrl` in roadmap.ts, `Paused work` in roadmap-page.tsx, `Work has moved on since` in pause-page.ts, `The rest of the handoff` in pause-page-components.tsx
