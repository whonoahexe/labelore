---
phase: 08-several-projects-and-a-switcher
plan: 05
subsystem: ui
tags: [react, react-query, react-router, landing-page, project-list, multi-project]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "08-01 ProjectListEntry/ProjectListResponse, isValidSlug and the registry; 08-02 winners 039 A and 040 B; 08-03 the guarded registry app at GET /api/projects"
provides:
  - "api.ts: apiFetch, ApiError, REFUSED_COPY, UNREACHABLE_COPY, projectUrl, fetchProjects"
  - "query-keys.ts: projectsKey and the slug-first projectKey"
  - "AppLink, useAppNavigate and projectRootPath: the one way to link to / or another project"
  - "ProjectRow and ProjectList shared by the landing page, the unknown-project page and (08-11) the switcher"
  - "ProjectsPage at / in every state (loading, error with retry, empty, notices, populated), never a redirect"
  - "UnknownProjectPage({ slug, projects }) for 08-08 to mount"
  - "PlainHeader and PlainPage for shell-less pages; formatOpenedAgo and openedTitle"
affects: [08-06, 08-08, 08-09, 08-11, 08-12, 08-13, 08-15, 08-17]

actuals:
  tokens: 12400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Every API call goes through apiFetch; every query key comes from query-keys.ts"
    - "A page's states are a plain value (ProjectsListState) so each can be rendered without a request"
    - "Landing layout follows sketch 040 B: a CSS grid that turns two-column from 62rem when a direct-child aside exists"

key-files:
  created:
    - src/web/api.ts
    - src/web/query-keys.ts
    - src/web/opened-ago.ts
    - src/web/components/plain-header.tsx
    - src/web/components/project-row.tsx
    - src/web/pages/projects-page.tsx
    - src/web/pages/unknown-project-page.tsx
    - test/helpers/registry-fetch.ts
    - test/web/projects-page.test.ts
  modified:
    - src/web/app-router.tsx
    - src/web/nav.tsx
    - src/web/project-path.ts
    - src/web/styles/globals.css
    - docs/design-language.md

key-decisions:
  - "Landing layout is sketch 040 B: the grid lives on .projects-page and switches to list-left, 448px side column from 62rem only when an <aside> child exists, so 08-17 adds the forms without touching the list CSS and the unknown-project page stays one column"
  - "The whole row is the link: the name anchor is stretched over the row with ::after, so a forget button (08-17, 08-11) must sit above it with its own positioning"
  - "Empty-state copy keeps the plan's word 'above'; 08-17 changes it to 'beside' as recorded in 08-02-SUMMARY"
  - "ProjectRow takes a discriminated variant: the landing variant requires the page's clock (now), so no render calls Date.now()"

patterns-established:
  - "Pure presentational list section (ProjectsListSection) separate from the query-owning page, so error and loading render in static tests"
  - "AppLink re-checks its target: '/' or '/' plus a valid slug, else '/' (T-08-21)"

requirements-completed: [PLAT-02, PLAT-08]

coverage:
  - id: D1
    description: "/ is the projects landing page for any number of projects, including one, and never redirects"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/web/projects-page.test.ts#the router mounts the landing page on / and never redirects it"
        status: pass
      - kind: unit
        ref: "test/web/projects-page.test.ts#the landing page states still renders the list for exactly one project, never a redirect (D-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The landing list is read from GET /api/projects of the guarded registry app through api.ts, one row per entry in server order, each linking to /<slug>"
    requirement: PLAT-02
    verification:
      - kind: integration
        ref: "test/web/projects-page.test.ts#the landing list reaches the page through api.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rows show name, path or ssh target with icon, load marks only when loading or unavailable, last-opened time; an unavailable project keeps its place with its reason and a followable link; no milestone, phase or progress"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/web/projects-page.test.ts#the landing rows"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty, loading, error-with-retry and settings-notice states"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/web/projects-page.test.ts#the landing page states"
        status: pass
    human_judgment: false
  - id: D5
    description: "formatOpenedAgo unit table, truncation, future-as-now and the null case"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/web/projects-page.test.ts#formatOpenedAgo"
        status: pass
    human_judgment: false
  - id: D6
    description: "apiFetch error mapping (refused, unreachable, http) and JSON content type on every write; slug-first query keys; AppLink and projectRootPath never leave the app"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/projects-page.test.ts#apiFetch / query keys and links / AppLink"
        status: pass
    human_judgment: false
  - id: D7
    description: "UnknownProjectPage names the slug as typed, lists the rows, links to /, fetches nothing"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/web/projects-page.test.ts#UnknownProjectPage"
        status: pass
    human_judgment: false
  - id: D8
    description: "The landing page reads as sketch 040 B in a browser (list left, side column from 62rem, row arrangement at 1280px and 390px, both themes)"
    requirement: PLAT-02
    verification: []
    human_judgment: true
    rationale: "CSS layout and theme parity were checked only by the vite build and the token, source-order and vocabulary guards; no browser run happened because the running dev server answers / with the list error until 08-06. 08-15 asserts the layout contract against the built page."

plan_head_before: 8b8228ecc90b77e5d125f981ac7f751ef638e93f
plan_head_after: b12a7c184690b5470e323bbefefeda048b229f11
commits: 2

duration: 25 min
completed: 2026-10-30
status: complete
---

# Phase 8 Plan 05: Projects landing page Summary

**The projects landing page at `/` (sketch 040 B arrangement) reads the registry's cheap `GET /api/projects` through a new `apiFetch` module and a slug-first query-key factory, with shared project rows, last-opened times, a plain header, `AppLink` for cross-project links and an `UnknownProjectPage` ready for 08-08.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2 of 2 (tracer: list reaches rows; auto: states, times, unknown page, docs)
- **Files:** 9 created, 5 modified

## Accomplishments

- `/` no longer redirects: the root redirect component and its comment are deleted, `appRoutes` still has exactly two entries, and `/` renders a lazy, tracked `ProjectsPage` inside a small route component that brings the Suspense boundary and route progress bar the shell used to provide.
- `api.ts` is the fetch module later plans extend: network failure maps to the unreachable copy, a 403 to the refused copy, other failures to the server's error text; every non-GET sends `Content-Type: application/json` and a JSON body. `query-keys.ts` is the only place a key is built.
- `ProjectRow` and `ProjectList` render name, path (Folder or Server icon, end ellipsis, full value in `title`), a load mark only when loading or unavailable, the unavailable reason on its own line, and on the landing variant "Opened 3 hours ago" / "Not opened yet" with the absolute date as the title. No row ever shows a milestone, phase or progress.
- `ProjectsPage` covers every state the UI contract names: quiet "Loading projects…", destructive alert with "Retry loading projects", the "No projects yet." empty flow, and settings notices (role status) above the list.
- `formatOpenedAgo` picks the largest unit of year (365 d), month (30 d), week, day, hour, minute, second with magnitude of at least one, truncates, and formats with `Intl.RelativeTimeFormat('en', { numeric: 'auto' })`; the future reads as now.
- `AppLink` and `useAppNavigate` pass only `/` or `/` plus a valid slug and never take the current project's slug (T-08-21).

## Task Commits

1. **Task 1: Project list reaches the landing rows through api.ts and the key factory (tracer)** - `ad9f61a` (feat)
2. **Task 2: Landing page states, last-opened times, unknown-project page, documented class names** - `b12a7c1` (feat)

The tracer's `<verify>` is automated-only, so under the default `end-of-phase` mode it was re-run end to end after Task 1 and again with the full web suite after Task 2; both passed before expansion continued.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Class-name docs and CSS landed with Task 1, not Task 2**
- **Found during:** Task 1
- **Issue:** Task 1 introduces `projects-page`, `project-list`, `project-row`, `project-row-name` and `project-row-path`; the class-vocabulary test would have failed on the Task 1 commit, and `docs/design-language.md` says a new name and its CSS rule land in the same commit.
- **Fix:** The five names, their `### Projects` rows and the matching CSS block went in with Task 1; `project-row-meta`, the Tones `missing` clause, the load-mark and state CSS followed in Task 2. Final content equals what the plan asked for.
- **Files modified:** docs/design-language.md, src/web/styles/globals.css
- **Commit:** ad9f61a, b12a7c1

**2. [Rule 3 - Blocking] ProjectList takes entries, not rows; extra exports PlainPage and ProjectsListSection**
- **Found during:** Task 1 and 2
- **Issue:** The switcher (08-11) needs a `current` row, and a TanStack query in the error state renders as pending in a static render (an errored query with no data re-fetches on mount), so the plan's "an errored list shows Retry loading projects" could not be tested through `ProjectsPage`.
- **Fix:** `ProjectList({ entries, variant, currentSlug, now })` builds the rows; the list section is a pure `ProjectsListSection({ state })` rendered by `ProjectsPage`, so the error and loading states are tested directly. `PlainPage` (the plain header over a `<main>` on the shell's surface) is exported from plain-header.tsx next to `PlainHeader`.
- **Files modified:** src/web/components/project-row.tsx, src/web/pages/projects-page.tsx, src/web/components/plain-header.tsx
- **Commit:** ad9f61a, b12a7c1

**3. [Rule 3 - Blocking] Test copy avoids real-looking Work paths**
- **Found during:** Task 2 full-suite run
- **Issue:** `test/no-skips.test.ts` forbids `~/Work` and `/home/<x>/Work` strings in tests; the empty-state copy itself names `~/Work`.
- **Fix:** Made-up paths use `Projects`; the copy assertion joins `['~', 'Work']` so no literal tilde path is written.
- **Files modified:** test/web/projects-page.test.ts
- **Commit:** b12a7c1

**Total deviations:** 3 auto-fixed (all Rule 3). **Impact:** none on the contract; names, copy and behaviour match the plan.

## Verification

- `vitest run test/web/projects-page.test.ts`: 29 tests pass (run with the main checkout's vitest binary, because the worktree has no node_modules and `npm run test:gate` resolves its binary from the worktree root; the gate's zero-skip rule was checked by reading the reporter output: no skipped or todo tests).
- `vitest run test/web` and then the whole suite: everything passes except the 3 known pre-existing corpus-guard failures (`pattern-map-corpus` for 08-PATTERNS.md, `ui-spec-corpus` twice for 08-UI-SPEC.md), which are not this plan's.
- `tsc --noEmit` for both tsconfigs and `eslint .`: no output.
- `vite build` succeeds.
- Acceptance greps: `RootRedirect` absent from src/web; `export const AppLink`, `export function projectRootPath`, `### Projects` and the `project-row` table row each print one line.

## Known Stubs

None. The empty-state body says "above" before the add form exists; that is deliberate and listed under Notes for later plans.

## Notes for later plans

- **08-17 (add and scan):** put the forms in one `<aside>` that is a direct child of `main.projects-page`. From 62rem the CSS already makes the page list-left with a 448px side column (`--projects-side-width`), a `var(--space-fluid-9)` column gap and the aside in row 2, column 2; below 62rem it stacks in A's order. Change "above" in the empty-state body to "beside" (08-02 winner consequence). A forget button inside a row needs `position: relative` and a z-index above the stretched name link.
- **08-11 (switcher):** `ProjectList variant="switcher" currentSlug=...` marks the current row (`data-current`, `aria-current`, Check icon, sr-only "Current"); the 2px primary rule and name padding are in the CSS already. The switcher still needs its own forget slot and tooltip.
- **08-08:** `projectUrl(slug, path)` and `apiFetch` are ready; `app-shell.tsx` still has its own `/api/presentation` fetch and `['presentation']` keys, and `ProjectGate` is unchanged. `UnknownProjectPage({ slug, projects })` takes the list from the caller.
- **08-06:** until `startServer` serves the registry app, the running dev server answers `/` with the list error (its legacy wrapper has no `/api/projects`), as the plan expected.
- **08-12:** `projectKey(slug, ...rest)` returns `readonly unknown[]`; the standing scan can pattern-match `['project', slug, ...]`.

## Issues Encountered

None beyond the deviations above.

## Threat Flags

None. No new endpoint, auth path or file access; names, paths, reasons and notices render as React text nodes only (T-08-22, tested with a hostile string), and link targets are re-validated (T-08-21, tested with `API`, `//evil` and `''`).

## Self-Check: PASSED

- Files present: src/web/api.ts, src/web/query-keys.ts, src/web/opened-ago.ts, src/web/components/plain-header.tsx, src/web/components/project-row.tsx, src/web/pages/projects-page.tsx, src/web/pages/unknown-project-page.tsx, test/helpers/registry-fetch.ts, test/web/projects-page.test.ts.
- Commits in HEAD ancestry: `ad9f61a`, `b12a7c1`.
