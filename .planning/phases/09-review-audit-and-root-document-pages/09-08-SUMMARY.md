---
phase: 09-review-audit-and-root-document-pages
plan: 08
subsystem: ui
tags: [project-page, project-handler, margin, milestone-goal, sketch-041, view-contract]
status: complete

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "09-07 buildProjectContext (dashboardUrl, tiles), composeProjectPage and ProjectPageView with the masthead and strip, the project CSS block"
provides:
  - "structured.project { milestone { label, version, goal }, constraints, outOfScope, lastUpdated } on the PROJECT.md handler, extracted in its own try/catch"
  - "The strip's goal cell ('Now building {milestone}' and the goal, clamped to 3 lines) and the two-column body with a sticky 22rem margin"
  - "The margin: 'Bound by - n', 'Will not do - n', a Read in full / Shorten lists toggle, 'Last updated' and 'Where the work is now'"
  - "test/web/project-view-contract.test.ts: the project page's source-text contract"
affects: [09-09, 09-10]

actuals:
  tokens: 40000
  tasks: 2
  commits: 3
plan_head_before: 4c0651d5102929b979b0cb1fa2700943b81e5354
plan_head_after: a21274d5e9c45800be7ab86502523df98dd7a71e

tech-stack:
  added: []
  patterns:
    - "A handler projection is built by indexOf line walks with line, bullet and string caps (no whole-text split or regex over document text), so hostile PROJECT.md files cost the same as small ones"
    - "The composer reads structured.project tolerantly (type-guarded) so an older server payload or a throwing extraction degrades to the 09-07 page"

key-files:
  created:
    - test/project-handler.test.ts
    - test/web/project-view-contract.test.ts
  modified:
    - src/planning-repo/handlers/project.ts
    - src/web/views/project-page.ts
    - src/web/views/project-page-components.tsx
    - src/web/styles/globals.css
    - test/web/project-page.test.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-empty.json
    - test/__golden__/sparse-started.json

key-decisions:
  - "The goal cell is the strip's first grid child (single grid, 2fr + four 1fr), as in sketch 041 B; no tile is :first-child while it is present, so the desktop tile rules needed no change and only the under-42rem odd/even rules gained a goal-present variant"
  - "A milestone heading with no ': label' gives label '' and the cell reads 'Now building' when a goal exists, rather than dropping the goal"
  - "The whole project CSS block (09-07 + 09-08) is wrapped in /* phase-09-project-page:start */ ... :end so the contract test can assert it is one contiguous region"
  - "A constraint or exclusion with no bold name renders its text in the dt position (no dd), keeping the bullet rather than dropping it"
  - "Out of Scope is found as a top-level '## Out of Scope' section first, else as a '### Out of Scope' subsection of any section (Lendshed and this repo use the latter, under Requirements)"

patterns-established:
  - "Page CSS region markers (phase-09-project-page:start/end) checked by a view-contract test"

requirements-completed: [VIEW-07]

duration: 35min
completed: 2026-11-03
---

# Phase 9 Plan 08: Project page goal cell and margin Summary

**The project page strip now opens on "Now building {milestone}" with the milestone goal, and a sticky margin lists what the project is bound by, what it will not do, when it was last updated and the way back to the dashboard, all read from PROJECT.md by capped line scans.**

## Performance

- **Duration:** about 35 min
- **Completed:** 2026-11-03
- **Tasks:** 2 (a tracer task and a TDD task)
- **Files modified:** 10

## Accomplishments

- `ProjectHandler` adds `structured.project`: the Current Milestone label, leading version token and wrapped `**Goal:**` line; the Constraints and Out of Scope bullets (name and text, wrapped lines joined, at most 40, a nameless bullet keeps its text); and the `*Last updated: ...*` footer. Every scan walks lines with `indexOf`, caps lines read and strings at 600 characters, and runs in its own try/catch so a throw omits only `project`.
- The composer's strip gained `goalLabel`/`goal` and nullable `tiles`; `margin` is `{ constraints, outOfScope, lastUpdated, dashboardUrl }` and null when both lists are empty and there is no last-updated line. The null rule counts `structured.project`, so a PROJECT.md whose only recognised content is the milestone or the margin still composes.
- `ProjectPageView` renders the goal cell first in the strip (label plus the goal clamped to 3 lines), the two-column body (main column left for 09-09, 22rem sticky margin right, one column under 42rem), the margin's two `dl` lists (names in dt, the exclusions struck through, text clamped to 2 lines), one `aria-pressed` Read in full / Shorten lists toggle, the Last updated note and a "Where the work is now" link with an arrow to the dashboard, closing the pair 09-04 opened.
- `test/project-handler.test.ts` (Lendshed, this repo's own PROJECT.md with bullet counts taken by an independent line walk, a nameless bullet, both separators, caps, 100,000-line growth runs through `measureGrowth`, a throwing `splitSubsections` keeping `sections` and `keyDecisions`), strip and margin cases in `test/web/project-page.test.ts`, and the new `test/web/project-view-contract.test.ts` (no raw-HTML prop, Link targets only `tile.url` / `margin.dashboardUrl`, documented tones only, no regex or fs import in the composer and join, the project CSS one marked region).

## Task Commits

1. **Task 1: strip goal cell and structured.project.milestone** - `715af6b` (feat)
2. **Task 2 RED: failing tests for constraints, exclusions and last-updated** - `b1264b3` (test)
3. **Task 2 GREEN: margin, body, view contract** - `a21274d` (feat)

## TDD Gate Compliance

Task 2: RED commit `b1264b3` had 7 of 16 handler tests failing on the planned assertions (constraints, exclusions, lastUpdated, caps, growth, throw guard); GREEN `a21274d` passes all. The composer, component and view-contract tests were written after the implementation in the same GREEN commit (they passed on first run), so RED covers the handler half of the task only. No REFACTOR commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sparse goldens also changed**
- **Found during:** Task 1 (golden regeneration)
- **Issue:** The plan says only the dense golden holds a PROJECT.md; `sparse-empty.json` and `sparse-started.json` hold one too, so `snapshot.golden.test.ts` failed for them until regenerated.
- **Fix:** Regenerated all three with `-u` and read each diff: only the added `project` key (milestone null for all three; dense also gains its constraints, one nameless exclusion and the footer in Task 2).
- **Files modified:** test/__golden__/sparse-empty.json, test/__golden__/sparse-started.json
- **Commit:** 715af6b, a21274d

**2. [Rule 3 - Blocking] The throw-guard test moved to Task 2**
- **Found during:** Task 1
- **Issue:** Task 1's extraction (milestone only) calls nothing mockable, so a throwing-extractor test could not be made to throw without contorting the handler. Task 2's Out of Scope lookup goes through `splitSubsections`, which the test mocks.
- **Fix:** The throw test lives in Task 2's RED commit.
- **Commit:** b1264b3

**3. [Rule 2 - Missing critical] Strip landmark label and a tiles-less layout**
- **Issue:** The strip is now a `nav` holding a goal cell as well as links, and tiles can be absent.
- **Fix:** The nav is labelled "Milestone goal and requirements by state", and a `data-tiles` attribute lets a goal-only strip span the full width (also under 42rem).
- **Commit:** 715af6b

## Issues Encountered

- The worktree has no `node_modules`; vitest, tsc, eslint and vite ran from the main checkout's binaries, so `npm run test:gate` (which resolves vitest from the repo root) was replaced by `vitest run`. Result: 230 files, 5054 tests passed, 0 skipped; `tsc` (server and web) and `eslint .` clean; `vite build` succeeded. `systemctl --user restart labelore` was skipped (it serves the main checkout), so the orchestrator must restart after merge. The throwaway `dist` and `node_modules/.vite` the tools created in the worktree were removed.
- I did not screenshot the page beside sketch 041 B; the plan assigns that comparison to 09-09.

## Known Stubs

None. `decisions` stays null and the body's main column is intentionally empty until 09-09 adds the decision spine.

## Threat Flags

None. No new endpoints or file access. Author text reaches the DOM only through `LeadText` as React text; the only new link target is the context's fixed `dashboardUrl` (T-09-16, T-09-17 mitigated and asserted by the handler growth tests and the view contract).

## Next Phase Readiness

09-09 fills `decisions` and the main column; `view-project-body` already carries `data-margin` and has a single-column rule for a body without a margin. The shared project CSS region is bracketed by `phase-09-project-page:start/end`, and 09-09's CSS should be appended inside it (before the end marker) to keep the contract test green.

## Self-Check: PASSED

- Created files exist: test/project-handler.test.ts, test/web/project-view-contract.test.ts.
- Commits 715af6b, b1264b3 and a21274d are ancestors of HEAD.
