---
phase: 08-several-projects-and-a-switcher
plan: 08
subsystem: ui
tags: [react, react-query, react-router, multi-project, project-layout, slug-scoped-keys]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "08-04/08-16 registry app with POST /api/projects/:slug/open and per-project routes; 08-05 api.ts apiFetch/projectUrl/fetchProjects, query-keys.ts, AppLink, UnknownProjectPage, PlainPage"
provides:
  - "ProjectLayout: the /:project route body, keyed by slug, replacing the single-project ProjectGate"
  - "api.ts: fetchPresentation(slug), openProject(slug), refreshProject(slug)"
  - "projectLayoutOutcome / ProjectLayoutOutcome: the pure decision table of the layout (projectGateOutcome removed)"
  - "AppShell({ project, busy, children }) named from the list entry, presentation read under projectKey(slug, 'presentation')"
  - "Slug-scoped dashboard, artifact and document-route presentation reads"
affects: [08-09, 08-10, 08-11, 08-12, 08-15]

tech-stack:
  added: []
  patterns:
    - "The layout owns lookup, open-stamp and outcome; every query key under a project comes from projectKey(slug, ...)"
    - "Shell-less layout screens (ProjectLayoutNotice) are plain values so each renders in a static test"
    - "An un-prefixed legacy address resolves against the first listed project (most recently opened)"

key-files:
  created:
    - src/web/pages/project-layout.tsx
    - test/web/project-layout.test.ts
  modified:
    - src/web/api.ts
    - src/web/project-path.ts
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/pages/dashboard-page.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/pages/document-route.tsx
    - src/web/styles/globals.css
    - test/web/invalid-project-contract.test.ts
    - test/web/project-routes-match.test.ts
    - test/web/project-path.test.ts
    - test/web/navbar-contract.test.ts
    - test/web/build-splitting.test.ts
    - test/web/file-pages.test.ts
    - test/web/shell-contract.test.ts
    - test/web/visual-contract.test.ts

key-decisions:
  - "The layout derives list status from data presence (a failed re-read of a list already in hand keeps showing it) and the presentation query is enabled only for a listed slug, so an unknown slug requests nothing"
  - "Un-prefixed legacy words are handled before the layout by a LegacyRoute that reads the first listed project; an errored list or an empty list sends it to /"
  - "The opening body spins via .shell-outlet[aria-busy='true'] .quiet-state svg, reusing project-row-spin and switched off under prefers-reduced-motion"

patterns-established:
  - "ProjectLayoutNotice({ kind, message, onRetry }) for the loading and list-error screens, because an errored query with no data re-fetches on mount and cannot be statically rendered"
  - "Static-render tests of the router use useRoutes(appRoutes) inside MemoryRouter with react-router's Navigate mocked to a data-redirect marker"

requirements-completed: [PLAT-02, PLAT-08]

coverage:
  - id: D1
    description: "A project URL /<slug> opens that project: header names it from the list at once, body shows 'Opening {name}...' (role status, aria-busy outlet) until its own presentation arrives, and nothing of a previously cached project renders"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/project-layout.test.ts#switching never shows the previous project (PLAT-08)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Project subtree keyed by slug; every layout, shell, dashboard and document-route presentation key built by projectKey(slug, ...); no previous-data option"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/project-layout.test.ts#the layout source"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exact slug comparison and the unknown-project page: /Lendshed and /nope show the page naming the slug with the rows and request nothing"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/project-layout.test.ts#projectLayoutOutcome over every input combination"
        status: pass
      - kind: unit
        ref: "test/web/project-layout.test.ts#names an unknown project as typed, lists the rows, and requests nothing for it"
        status: pass
    human_judgment: false
  - id: D4
    description: "A failed project load shows the invalid-target screen with the server message and path checked; list loading and list failure have their own screens"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/project-layout.test.ts#shows the invalid-target screen with the server message and the path checked when the load failed"
        status: pass
      - kind: unit
        ref: "test/web/project-layout.test.ts#the screens that stand in for a project"
        status: pass
    human_judgment: false
  - id: D5
    description: "The registry-backed client calls (list, presentation, dashboard, open) and the open stamped once per mounted slug for a listed slug only"
    requirement: PLAT-02
    verification:
      - kind: integration
        ref: "test/web/project-layout.test.ts#the registry-backed client calls"
        status: pass
    human_judgment: false
  - id: D6
    description: "Un-prefixed Phase 7 addresses resolve against the first listed project and go to / with no projects"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "test/web/project-layout.test.ts#an un-prefixed Phase 7 address"
        status: pass
    human_judgment: false
  - id: D7
    description: "The posted open actually fires once per mounted slug in a live browser, the re-read list reorders, and the opening spinner is visible and static under reduced motion"
    requirement: PLAT-08
    verification: []
    human_judgment: true
    rationale: "Effects (the open stamp and its list invalidation) and CSS animation do not run in a static render; the stamp is proven only at the api layer and by a source read. 08-15 holds the response in Chromium and checks the sequence."

plan_head_before: e6124663c429b50487ff5b037bd9c4f7e7618175
plan_head_after: 49cfce28c87431fd8fd1427b9e916a78b29e973f
commits: 2
actuals:
  tokens: 21000
  tasks: 2
  commits: 2

duration: 40 min
completed: 2026-10-30
status: complete
---

# Phase 8 Plan 08: Project layout keyed by slug Summary

**`/:project/*` now renders `ProjectLayout`: it names the project from the registry list at once, shows "Opening {name}..." until that slug's own presentation arrives, stamps the open once per mounted slug, and renders the unknown-project page, the invalid-target screen or the page as the outcome table says, with every request and query key slug-scoped and the shell keyed by slug.**

## Performance

- **Duration:** about 40 min
- **Tasks:** 2 of 2 (tracer: a listed slug reaches its shell through slug-scoped requests; auto: every outcome and the contract pins)
- **Files:** 2 created, 16 modified

## Accomplishments

- `api.ts` gains `fetchPresentation(slug)`, `openProject(slug)` and `refreshProject(slug)`, all through `apiFetch` and `projectUrl`; the old root-route `fetchPresentation` left `app-shell.tsx`.
- `ProjectLayout` replaces `ProjectGate`. It reads the slug with `useParams`, queries the list and (only for a listed slug) the presentation, posts `openProject` once per mounted slug and invalidates the list, and renders by `projectLayoutOutcome`: loading-list, list-error (destructive alert with "Retry loading projects"), unknown (the 08-05 page, no request), opening, presentation-error, invalid (`InvalidProjectScreen`) or open (the route switch as the render-prop child). Every `AppShell` is `key={slug}`; no previous-data option anywhere.
- `AppShell({ project, busy })`: the brand name comes from the list entry, the title is `project.target`, the aria-label is `Labelore - {name}`, the meta line and tabs come only from `projectKey(slug, 'presentation')`, and the outlet carries `aria-busy` while the project opens.
- `projectLayoutOutcome` compares the first segment with the listed slugs by exact string equality, so `/Lendshed` is unknown and never opens `lendshed`. `projectGateOutcome` is deleted.
- Dashboard, artifact page and document route read their own slug: `fetchDashboard(slug)` through `apiFetch`, keys `projectKey(slug, 'dashboard' | 'presentation')`.
- Un-prefixed Phase 7 addresses (`/roadmap`, `/search?q=...`) resolve against the first listed project and redirect as 07-08 did; with no projects (or a failed list) they go to `/`. The redirect ternary keeps the exact shape `legacy-isolation.test.ts` extracts.
- `project-layout.test.ts` (16 tests) covers the registry-backed calls, every outcome combination, and static renders: opening with another project's data cached shows none of its name, root, dashboard heading or meta line.

## Task Commits

1. **Task 1: Landing row to that project's dashboard through slug-scoped requests, keys and a keyed shell (tracer)** - `41689fa` (feat)
2. **Task 2: Every layout outcome, the exact-slug unknown page, and the contract pins** - `49cfce2` (feat)

The tracer's `<verify>` is automated-only, so under the default `end-of-phase` mode it was re-run end to end (project-layout test, both typechecks, eslint) before Task 2 began; it passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Three tests outside the plan's file list pinned code this plan changed**
- **Found during:** Task 1 web-suite run
- **Issue:** `file-pages.test.ts` seeded the old `['presentation']` key for `DocumentRoute`; `shell-contract.test.ts` and `visual-contract.test.ts` pinned the literal `<div className="shell-outlet" id="main-content">`, which now also carries `aria-busy`.
- **Fix:** `file-pages.test.ts` seeds `projectKey('shapes', 'presentation')` under a `ProjectSlugProvider`; the two source pins match the opening tag without its closing `>`.
- **Files modified:** test/web/file-pages.test.ts, test/web/shell-contract.test.ts, test/web/visual-contract.test.ts
- **Commit:** 41689fa

**2. [Rule 3 - Blocking] `fetchDashboard` exported, `ProjectLayoutNotice` extracted**
- **Found during:** Task 1 and 2
- **Issue:** The plan asks the test to call `fetchDashboard('lendshed')`, which was module-private; and an errored query with no data re-fetches on mount, so the list-error screen could not be statically rendered through the layout.
- **Fix:** `fetchDashboard` is exported; the loading and list-error screens are a pure `ProjectLayoutNotice` rendered by the layout and by the test.
- **Files modified:** src/web/pages/dashboard-page.tsx, src/web/pages/project-layout.tsx
- **Commit:** 41689fa, 49cfce2

**3. [Rule 3 - Blocking] The brand name in the plan's test text is the list entry's name**
- **Found during:** Task 1 test
- **Issue:** The plan says the markup holds 'Shapes'; the shapes fixture's PROJECT.md title is "Kilnrow", so the list entry name is "Kilnrow".
- **Fix:** Tests assert `entry.name` read from the list rather than a literal.
- **Files modified:** test/web/project-layout.test.ts
- **Commit:** 41689fa

**4. [Rule 3 - Blocking] The spinner needed a rule outside the landing page**
- **Found during:** Task 1
- **Issue:** The existing spin was scoped to `.projects-page .quiet-state svg`; the opening body sits in the shell.
- **Fix:** One rule `.shell-outlet[aria-busy='true'] .quiet-state svg` reusing `project-row-spin`, added to the reduced-motion block. No new class name.
- **Files modified:** src/web/styles/globals.css
- **Commit:** 41689fa

**Total deviations:** 4 auto-fixed (all Rule 3). **Impact:** none on the contract.

## Verification

- `vitest run` (whole suite, main checkout's binary): 4686 pass; the 3 known pre-existing corpus-guard failures only (`pattern-map-corpus` for 08-PATTERNS.md, `ui-spec-corpus` twice for 08-UI-SPEC.md). `test/web` alone: 1982 pass, the same 3 fail. Zero skipped or todo.
- `tsc --noEmit` for both tsconfigs and `eslint .`: no output.
- `vite build` (to a scratch outDir) succeeds.
- Acceptance: `git grep "function ProjectGate"` and `git grep projectGateOutcome` in src/web and test/web print nothing; `export async function fetchPresentation` appears once, in api.ts; `key={slug}` is on every `AppShell` element in project-layout.tsx.
- `npm run test:gate` was not used (the worktree has no node_modules, so the gate resolves its binary from the worktree root); vitest was run directly with the same files.

## Known Stubs

None.

## Notes for later plans

- **08-09:** the snapshot pill still posts the root `/api/refresh` and calls `invalidateQueries()` with no filter; `refreshProject(slug)` is ready in api.ts. `InvalidProjectScreen` has no "Choose another project" link yet.
- **08-10 / 08-12:** these keys are still not slug-first and are shared across projects in one QueryClient: `['artifact-document', route]` (staleTime infinity), `['drawer']`, `['search', ...]`, `['roadmap']`, `['traceability']`, `['sketches']`, `['research']`, `['plan-pair', planUrl]`; their fetchers still call the root routes. Until 08-10/08-12 move them, a switch can show a cached page body of the previous project once the new project is open (the layout and shell are clean; those pages are not). The standing scan in 08-12 should cover them.
- **08-11:** `.brand-project` in app-shell.tsx is the switcher trigger site; the layout passes the list entry, so the trigger needs only `useQuery(projectsKey)`.
- **08-15:** assert in Chromium that the open is posted once per slug, the list reorders after it, and the opening spinner is still under reduced motion (coverage item D7).

## Issues Encountered

None beyond the deviations above.

## Threat Flags

None. No new endpoint or file access; the slug reaches `projectUrl` (encoded) only after an exact match against the listed slugs, and every project name and path renders as a React text node.

## Self-Check: PASSED

- Files present: src/web/pages/project-layout.tsx, test/web/project-layout.test.ts, and this SUMMARY.
- Commits in HEAD ancestry: `41689fa`, `49cfce2`.
