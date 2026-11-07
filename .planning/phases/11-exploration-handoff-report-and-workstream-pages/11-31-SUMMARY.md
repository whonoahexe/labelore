---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 31
subsystem: web
tags: [workstreams, index, first-screen, tree, sketch-056-c]

requires:
  - phase: 11-01
    provides: "C7 and C12 adopted, X6 approved (the head lead at --fs-fluid-1)"
  - phase: 11-28
    provides: "Scope decision: adapter; the Brinkwater ledger, notices and archive"
  - phase: 11-29
    provides: "GET {project api}/workstreams: the inventory (mode, entries, active pointer, completed, midMigration)"
  - phase: 11-30
    provides: "the workstream scope through the web app (splitScope, ProjectScopeProvider, projectKey)"
provides:
  - "buildWorkstreamIndex(inventory, rootPresentation), WorkstreamIndexModel, workstreamCountText and sharedRootFiles in src/presentation/workstream-index.ts: every sentence the index shows, pure"
  - "WorkstreamIndexPage (sketch 056 C): head, pointer line, root node, one branch per workstream, closed Completed bar, mid-migration notice"
  - "fetchWorkstreams(slug) in api.ts; isWorkstreamIndexAddress in project-path.ts"
  - "ProjectLayout chooses the workstream index as the first screen (/ and /workstreams) once the inventory has loaded; AppShell takes workstreamIndex={{ countText }} and hides Roadmap and Traceability on the index only"
  - "CSS block phase-11-workstreams; the view-workstreams- class namespace; design-language tone uses and a Language bullet"
affects: [11-32]

actuals:
  tokens: 60000
  tasks: 3
  commits: 3
plan_head_before: 0c6c087a018976fa22542af305effcc7da17f6e5
plan_head_after: 09463fbca53980f61d0027533166f91a8d3b8d52

tech-stack:
  added: []
  patterns:
    - "The first screen is chosen from loaded facts: the inventory is asked for only at the project's own / or /workstreams, never inside a scope, and the opening body holds until it arrives; a failed inventory falls through to the ordinary first screen"
    - "The page draws a model that already holds every sentence; a pointer sentence is a list of plain/name/code segments so the page sets bold and code without parsing text"

key-files:
  created:
    - src/presentation/workstream-index.ts
    - src/web/pages/workstream-index-page.tsx
    - test/presentation/workstream-index.test.ts
  modified:
    - src/web/pages/project-layout.tsx
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/api.ts
    - src/web/project-path.ts
    - src/web/views/kinds.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/project-layout.test.ts
    - test/web/navbar-contract.test.ts

key-decisions:
  - "The shared-root chips are derived from the root presentation's artifacts (PROJECT.md, config.json, milestones/, research/, codebase/, todos/ when present); milestones/ counts only when it holds something other than ws-* archive folders, because the Completed bar already lists those. Brinkwater shows PROJECT.md, config.json, codebase/, todos/"
  - "A branch's file chips link into the scope at the clean address (ROADMAP.md /roadmap, STATE.md /state, REQUIREMENTS.md /requirements, config.json /settings) through addressOfPath; phases/ and unknown names are text. The workstream name stays the one link of the heading"
  - "The plans bar is the shared StatusMeter with the complete tone (as the plan says), not the sketch's plain bar; the caption reads '{done} of {total} plans'"
  - "The progress note is a dashed-left-rule note (056 C draws one sentence, not two values), so record-disagreement is not reused"
  - "'workstreams' is a reserved view-local prefix beside 'unrecognized', not a VIEW_KINDS member: the index is a project page, and a VIEW_KINDS entry would demand a registry manifest"
  - "Up to four branches per row, then further rows; the rail and stubs are drawn for the first row only on wide screens, and every branch gets a spine stub in the indented list under 52rem"

requirements-completed: [VIEW-20]
status: complete
---

# Phase 11 Plan 31: Workstream index Summary

**A workstream project now opens on sketch 056 C's tree: the project head and pointer line over a root node of shared files, one branch per workstream (phase ring, phase and status word, plans meter, progress note, own files), and a closed Completed bar; flat projects are untouched.**

## Performance

- **Tasks:** 3 of 3 (Task 1 tracer, Task 2 contract tests and docs, Task 3 side-by-side)
- **Commits:** `900cad7` (Task 1), `87d07fa` (Task 2), `09463fb` (Task 3 fix)
- **Gate:** full unit gate 7093 of 7093, 0 failed, 0 skipped, 0 todo; typecheck, lint and build clean

## Accomplishments

- `workstream-index.ts` (pure): head (eyebrow "Project · workstream mode", name, What This Is lead), the three pointer lines (present, absent, stale, as segments), the root node ("Shared by every workstream · .planning/", chips, "active-workstream → {name}" or "no active-workstream file"), branches (own link `/workstreams/{name}/`, Active only from the validated pointer, dashed "No roadmap yet" with no ring, the ring "{done}/{total}" labelled "{done} of {total} phases done", "Phase N" plus the ROADMAP name, the status word verbatim with tone in-flight, quiet or complete, the plans label, the progress note only when every plan is done and fewer phases are marked, file chips), the Completed rows ("1 phase archived") and the mid-migration sentence. "1 workstream" is singular.
- `ProjectLayout` asks for the inventory only at `/` and `/workstreams` outside a scope, shows the existing "Opening {name}…" body until it arrives (never a flat dashboard), renders the lazy `WorkstreamIndexPage` for workstream mode and the ordinary first screen for flat mode or a failed inventory. `AppShell` shows "{n} workstreams" beside the project switcher and hides Roadmap and Traceability on the index only; inside a scope all tabs show.
- CSS: one contiguous `phase-11-workstreams` block, page-scoped; the h1, the lead at `--fs-fluid-1` (X6 approved at 11-01), `--fs-7`, `--fs-4`, `--fs-2`. Accent spent only on the eyebrow, the ring's done arc and the plans meter's done squares; the Active mark and the active branch's heavy border are plain foreground.
- design-language.md: the workstream tone uses on the `complete`, `quiet` and `in-flight` rows, the reserved `workstreams` prefix, and the "056 C" Language bullet.

## Task Commits

1. **Task 1 (tracer): Brinkwater opens on its workstream index with one branch per workstream** - `900cad7`
2. **Task 2: pointer states, the Completed bar, the header gate, the index view contract, design-language rows** - `87d07fa`
3. **Task 3: the notice at body size, found in the side-by-side** - `09463fb`

## Side-by-side with sketch 056 C (Task 3)

Shot on Brinkwater, Brinkwater without active-workstream, with it naming `gone`, and a copy with root ROADMAP.md and STATE.md added, at 1280 and 390, light and dark (20 images, no FAIL line), viewed beside the 056 C sketch shot of the same width and theme.

- **Matches the layout contract** for the root node, rail and stubs, branches with rings, the active heavy border, the dashed "No roadmap yet" branch, the closed Completed bar, the pointer line in all three states, and the vertical indented list with a spine at 390px.
- **What changed after the side-by-side:** the mid-migration notice took the shared `.notice` paragraph size and padding (a size outside the page's five); it is now `--fs-4` with the page's own padding (`09463fb`). The pointer line was first a flex row that put a gap before the comma; it is inline text now (folded into Task 1 before its commit).
- **Differences from the sketch that stay on purpose:** the plans bar is the shared StatusMeter (squares with a "{done} of {total} plans" caption) instead of the sketch's plain bar, as the plan specifies; at 390px the root node stacks its name under its label where the sketch squeezed it.
- **Typography outcome:** X6 was approved at 11-01, so the lead is drawn at `--fs-fluid-1`, a fifth size, and the contract test pins the page's font sizes to exactly the five.
- The `systemctl --user restart labelore` step was NOT run in any task: the service serves the main checkout, not this worktree. The orchestrator should rebuild and restart after merging.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AppShell and the navbar pin moved into Task 1**
- **Issue:** `ProjectLayout` passes `workstreamIndex` to `AppShell`, so Task 1 could not compile or pass the full gate without it.
- **Fix:** the AppShell prop, the `hideRoadmapTabs` gate and the navbar-contract re-pin went into the Task 1 commit; Task 2 holds the remaining tests and docs.

**2. [Rule 3 - Blocking] Existing first-screen tests needed the inventory seeded**
- **Issue:** a project's first screen now waits for its inventory, so `test/web/project-layout.test.ts` renders of `/shapes` showed the opening body.
- **Fix:** the `seeded` helper and the opening test seed the inventory (the real one from the registry app, or `flatInventory()`); no behaviour assertion was weakened.

**3. [Rule 3 - Blocking] 'workstreams' joined VIEW_LOCAL_PREFIXES, not VIEW_KINDS**
- **Issue:** the plan says to add the kind through `VIEW_KINDS`, but `test/web/view-registry.test.ts` requires a registry manifest for every member and pins 39 members.
- **Fix:** `VIEW_LOCAL_PREFIXES = [...VIEW_KINDS, 'unrecognized', 'workstreams']`, the `unrecognized` precedent.

**4. [Rule 3 - Blocking] The inventory key uses `scope`, not a literal null**
- **Issue:** `query-keys.test.ts` allows a literal `null` only in app-router.tsx. The query is enabled only when the scope is null, so `projectKey(slug, scope, 'workstreams')` is the same key.

**5. [Rule 1 - Bug] The mid-migration notice size** (see Task 3 above, `09463fb`).

### Plan wording that was read, not followed literally

- The page is lazy-loaded through `app-router.tsx` (`WorkstreamIndexPage` there) and `ProjectLayout` takes a `workstreamIndex` render prop, matching how every routed page loads; the plan named both files for the first-screen choice.

## Known Stubs

None.

## Known Limitations

- With more than four workstreams, the wide layout wraps them to further rows but draws the rail and stubs for the first row only; rows below sit under the root without a connector. The indented list under 52rem draws a stub for every branch.
- A first screen at `/` waits for one extra small request (the inventory) for every project, flat ones included; it is made in parallel with the presentation and a failure falls through to the ordinary dashboard.
- The Playwright e2e backstop rows (UI-SPEC "populated, nav") were not run, per the project rule to run e2e only when necessary; the unit gate and the real-browser screenshots cover the index.

## Threat Flags

None beyond the plan's register: T-11-47 (names, statuses and phase names are React text only; the view contract fails on any raw-HTML prop, and the model test builds a branch named `<img src=x onerror=alert(1)>` and checks it stays text with an encoded address), T-11-SC (no package installed).

## Self-Check: PASSED

- Commits `900cad7`, `87d07fa` and `09463fb` are ancestors of HEAD.
- Created files exist: src/presentation/workstream-index.ts, src/web/pages/workstream-index-page.tsx, test/presentation/workstream-index.test.ts.
- Acceptance greps: "Shared by every workstream" in workstream-index.ts >= 1; `phase-11-workstreams:start` in globals.css = 1; `WorkstreamIndexPage` in app-router.tsx >= 1; "Every plan is done" in workstream-index.ts >= 1; "056 C" in design-language.md >= 1.
