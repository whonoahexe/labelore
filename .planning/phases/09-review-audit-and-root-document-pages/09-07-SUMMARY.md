---
phase: 09-review-audit-and-root-document-pages
plan: 07
subsystem: ui
tags: [project-page, masthead, traceability, view-registry, status-square, sketch-041]
status: complete

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "09-02 requirementStateCounts, traceabilityStateUrl and the traceability state filter; 09-04 dashboard 'About this project' link; 09-06 archived copies"
provides:
  - "buildProjectContext(): the project page's server-side join (name, tagline, What This Is lead, core value, requirement-state counts, four tiles)"
  - "The 'project' view kind and manifest (23 view kinds); ViewManifest.projectPage and ViewInput.projectContext"
  - "composeProjectPage() and ProjectPageView: the sketch 041 B masthead and the four-tile strip"
  - "The shared status-square class (four tones) with its design-language row"
affects: [09-08, 09-09, 09-10]

actuals:
  tokens: 16000
  tasks: 2
  commits: 3
plan_head_before: 4d81410797e57443d91c9e317dfc664084a6fa18
plan_head_after: 135510f44cb4d9bb62dd67200680638e4e1d2f64

tech-stack:
  added: []
  patterns:
    - "A root document's page is a ViewManifest composer fed by a server-built context (projectContext), exactly like review, todo and note"
    - "Count tiles derive from one projection (requirementStateCounts) and one URL builder (traceabilityStateUrl), so a tile and the rows it opens cannot disagree"

key-files:
  created:
    - src/presentation/project-context.ts
    - src/web/views/project-page.ts
    - src/web/views/project-page-components.tsx
    - test/presentation/project-context.test.ts
    - test/web/project-page.test.ts
  modified:
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/view-registry.test.ts

key-decisions:
  - "The masthead is the page's own head (like REVIEW, TODO and NOTE), not ArtifactHeader's cover slot, and the deviation is recorded in docs/design-language.md (research Pitfall 14)"
  - "The shipped-before breakdown is sorted oldest first in project-context.ts, because requirementStateCounts returns it newest first"
  - "A shipped-before tile with no archive reads 'none yet' and a count of 0 is always the quiet tone"
  - "'project' sits between 'context' and 'review-fix' in VIEW_KINDS, and projectContext sits between noteContext and manualChecks in the response, because older source-text contract tests anchor on the tail positions"

patterns-established:
  - "status-square: one shared class with data-tone complete / in-flight / missing / quiet and a --status-square-size custom property"

requirements-completed: [VIEW-07]

duration: 25min
completed: 2026-11-03
---

# Phase 9 Plan 07: The project page masthead and count tiles Summary

**/project now opens a charter page: the project name, what it is, the core value in a framed card with a 3px accent rule, and four count tiles that link into traceability on exactly the rows they count.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-11-03
- **Tasks:** 2 (a tracer task and a TDD task)
- **Files modified:** 13

## Accomplishments

- `buildProjectContext` reads the name, tagline, What This Is lead and Core Value through the dashboard's own PROJECT.md readers, so every page that quotes PROJECT.md quotes it the same way. `/documents` carries it only for the root PROJECT.md.
- A `project` view kind and manifest register `projectPage: composeProjectPage`. `artifact-page.tsx` gets one memo, one `viewAvailable` entry and one render branch, with no new `artifact.kind` comparison (the count is still 2).
- `ProjectPageView` renders sketch 041 B's masthead on `--card-veil`: eyebrow, one h1, the lead, the warning chip, copy path and View/Source on the left; the core-value card on the right (omitted silently without a Core Value section); one column under 42rem.
- Four tiles (complete, pending, shipped before, out of scope) come only from `requirementStateCounts`, link through `traceabilityStateUrl`, show a `status-square`, the mono numeral, label and sub-line, and carry an accessible name. A zero count keeps its tile with a dashed quiet square. With no projection the strip is omitted.
- `status-square` is a documented shared class with four tones; `docs/design-language.md` also gains the masthead bullet (own head, accent top rule), the tone-row uses, and the dashboard/project link pair.
- A quick look at `/lendshed/project` on a Lendshed server at 1280 and 390 shows the masthead and 18 / 6 / 20 / 2 tiles as intended (full side-by-side with the sketch is 09-09).

## Task Commits

1. **Task 1: masthead, core value card, view kind and status-square** - `9c97df0` (feat)
2. **Task 2 RED: failing tile tests** - `7ca3092` (test)
3. **Task 2 GREEN: four count tiles and their CSS** - `135510f` (feat)

## TDD Gate Compliance

Task 2 followed RED then GREEN. RED: 10 of 23 tests failed on the planned assertions (tiles were null, so tile order, urls, sub-lines, row equality, the zero tone and the rendered strip all failed) before `project-context.ts` produced tiles; the other 13 passed. GREEN: all 23 pass. No REFACTOR commit.

## Decisions Made

See key-decisions above. The tracer gate (Task 1) was verified end to end by re-running the plan's gate and typecheck before expanding to Task 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Older source-text contract tests anchor on list tails**
- **Found during:** Task 1 verification (full test run)
- **Issue:** `debug-view-contract` and `note-view-contract` expect `'debug',\n] as const;` at the end of `VIEW_KINDS`, and `review-view-contract` expects `manualChecks,\n reviewContext,\n };` ending the response object. Appending `'project'` and `projectContext` there broke three tests.
- **Fix:** Placed `'project'` between `'context'` and `'review-fix'`, and `projectContext` between `noteContext` and `manualChecks`. No test was edited to accommodate.
- **Files modified:** src/web/views/kinds.ts, src/server/project-api.ts
- **Commit:** 9c97df0

The strip rendering code (tile links) landed in Task 1's component commit because `ProjectPageView` takes the strip from the composed model; it renders nothing until Task 2 supplies tiles. Its CSS and the tile builder are in Task 2.

## Known Stubs

None. `ComposedProjectStrip.goalLabel` / `goal`, `margin` and `decisions` are null by design until 09-08 and 09-09 (named in the plan scope note); nothing renders them.

## Threat Flags

None. No new endpoints or file access; the one added response field is built server-side from the already-loaded presentation, and tile urls come only from `traceabilityStateUrl`.

## Issues Encountered

- The worktree has no `node_modules`; tools ran from the main checkout's binaries. Vitest and Vite created a throwaway `node_modules/.vite` and `dist` in the worktree, both removed before returning.
- `npm run build` was run as `vite build` against the worktree to prove it builds; `systemctl --user restart labelore` was skipped (it serves the main checkout, the orchestrator restarts after merge).

## Next Phase Readiness

09-08 fills `strip.goal` (and sets `data-goal`, whose CSS grid already exists) and the margin; 09-09 fills the decision spine and does the screenshot comparison with the sketch. The strip's `:first-child` tile rules assume no goal cell and will need a small adjustment when the goal cell is added.

## Self-Check: PASSED

- Created files exist: project-context.ts, project-page.ts, project-page-components.tsx, project-context.test.ts, project-page.test.ts.
- Commits 9c97df0, 7ca3092 and 135510f are ancestors of HEAD.
- Full `vitest run test`: 228 files, 5004 tests passed; `tsc` (server and web) and `eslint .` clean; `vite build` succeeded.
