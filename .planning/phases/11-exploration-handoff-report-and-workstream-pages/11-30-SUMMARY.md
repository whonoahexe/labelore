---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 30
subsystem: web
tags: [workstreams, scope, routing, query-keys, nav, copy-path]

requires:
  - phase: 11-28
    provides: "Scope decision: adapter; realPath shown for copy-path and file facts"
  - phase: 11-29
    provides: "/api/projects/{slug}/ws/{name} mount, ArtifactDto.realPath on scoped presentations"
provides:
  - "splitScope(rest) and withProjectScope(slug, scope, to) in project-path.ts"
  - "useProjectScope, ProjectScopeProvider, UnscopedLink and useUnscopedProjectHref in nav.tsx; Link, NavLink, useProjectNavigate, useProjectHref and useProjectLocation work inside a scope without call-site changes"
  - "projectUrl(slug, path, scope?), fetchPresentation(slug, scope), projectKey(slug, scope, ...rest) and projectWideKey(slug)"
  - "/{project}/workstreams/{name}/... resolves through the unchanged route grammar against the scoped presentation"
  - "CopyPathButton copies realPath (RealPathProvider, copyPathText, realPathMap)"
affects: [11-31, 11-32]

actuals:
  tokens: 30000
  tasks: 2
  commits: 2
plan_head_before: cd152fe8cff0dfc18760b1e9ccecbf5f15d71a60
plan_head_after: 05d3a4729d0a98844a5c415934de44a18393c7a2

tech-stack:
  added: []
  patterns:
    - "The scope is peeled once at ProjectRoute off the raw pathname and provided by context; every page reads it with useProjectScope and passes it to projectUrl and projectKey"
    - "projectKey takes the scope as a required second argument (null for a flat project), so a page cannot forget it; a source scan also fails on an omitted scope"

key-files:
  created: []
  modified:
    - src/web/project-path.ts
    - src/web/nav.tsx
    - src/web/api.ts
    - src/web/query-keys.ts
    - src/web/app-router.tsx
    - src/web/pages/project-layout.tsx
    - src/web/components/copy-path-button.tsx
    - test/web/nav-contract.test.ts
    - test/web/query-keys.test.ts
    - test/helpers/source-scan.ts

key-decisions:
  - "Scope reaches the hooks through a context provided at ProjectRoute (derived from the URL there), not read in every hook: components rendered outside a project route, in tests, stay flat"
  - "A scoped key is ['project', slug, 'ws', name, ...rest]; a flat key is unchanged. projectWideKey(slug) is the prefix that refresh and forget use to reach every scope of one project"
  - "An unknown workstream name (server 404 on the scoped presentation) renders the one not-found page under the plain header, not the shell's snapshot-metadata notice"
  - "Copy-path resolves realPath through a path-to-realPath map built from the scoped presentation and provided at ProjectRoute, so the ten view call sites need no change"

requirements-completed: [VIEW-20]
status: complete
---

# Phase 11 Plan 30: Workstream scope through the web app Summary

**`/{project}/workstreams/{name}/...` now opens that workstream's own dashboard, roadmap and pages at readable URLs: the scope is peeled once at the project route, carried by the one prefixing module, sent to `/ws/{name}` by every request and named in every cache key; flat projects are untouched.**

## Performance

- **Tasks:** 2 of 2 (Task 1 tracer, Task 2 contract tests and copy-path)
- **Commits:** `a396cfa` (Task 1), `05d3a47` (Task 2)
- **Gate:** full unit gate 7057 of 7057, 0 failed, 0 skipped, 0 todo; typecheck, lint, build clean

## Accomplishments

- `project-path.ts`: `splitScope` (`/workstreams/intake/` gives scope `intake`, rest `/`; `/workstreams/roadmap/phase-1` gives scope `roadmap`; `/workstreams` and `/workstreams/` alone give no scope; the name is decoded once, a malformed one kept raw) and `withProjectScope`, which builds `/{slug}/workstreams/{encoded name}{to}` with the same single-slash rule as `withProjectSlug` (a crafted target collapses to the scope's root) and is `withProjectSlug` without a scope.
- `nav.tsx`: `ProjectScopeProvider` and `useProjectScope`; `Link`, `NavLink`, `useProjectNavigate`, `useProjectHref` prefix the scope, and `useProjectLocation` strips slug and scope so pages see the same project-relative path as a flat project. `UnscopedLink` and `useUnscopedProjectHref` are the explicit way out for the drawer's Shared group and the chip's All workstreams (11-32).
- `api.ts` and `query-keys.ts`: `projectUrl` inserts `/ws/{encoded name}`; `fetchPresentation(slug, scope)`; `projectKey(slug, scope, ...)`; `projectWideKey(slug)` for refresh (`snapshot-status.tsx`) and forget (`project-row.tsx`), which must reach every scope of one project.
- `app-router.tsx`: `ProjectRoute` peels the scope from the raw pathname and provides it; `ProjectRouteSwitch` resolves the rest unchanged through `resolveProjectRoute` (the Route union and resolver are not touched); redirects stay inside the scope. `project-layout.tsx` and `app-shell.tsx` fetch the scoped presentation.
- Every page and component that built a request or key (dashboard, roadmap, traceability, research, sketches, search page and dropdown, drawer, artifact, document route, image, plan pair) takes `useProjectScope()` and passes it on.
- Copy-path: `CopyPathButton` copies the artifact's `realPath` when the scoped presentation carries one, else `path`; `RealPathProvider` wraps the page switch.
- Verified in a real browser (shoot-pages, system Chrome, 1280 and 390 wide, light and dark): `/brinkwater/workstreams/intake/` shows intake's own dashboard ("Feed Alerts", phase 2), `/workstreams/intake/roadmap` its own roadmap, `/workstreams/ledger/`, `/workstreams/intake/state` and the flat `/roadmap` also shoot with no FAIL line. An unknown name (`/workstreams/nope/`) shows the not-found page naming the address.

## Task Commits

1. **Task 1 (tracer): `/{project}/workstreams/intake/` opens intake's own dashboard through the scoped API** - `a396cfa`
2. **Task 2: every link, request and cache key carries the scope; copy-path names the real file** - `05d3a47`

## Verification

- `npm run test:gate`: total=7057 passed=7057 failed=0 skipped=0 todo=0.
- Plan acceptance greps: `export function splitScope` in project-path.ts = 1; `useProjectScope` in nav.tsx >= 1; `/ws/` in api.ts >= 1; `realPath` in copy-path-button.tsx >= 1; `splitScope` in nav-contract.test.ts and query-keys.test.ts.
- The `systemctl --user restart labelore` step was NOT run in either task: the service serves the main checkout, not this worktree. The orchestrator should rebuild and restart after merging.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `projectKey` and `fetchDocument` signature changes forced test updates outside the plan's file list**
- **Found during:** Task 1
- **Issue:** `projectKey(slug, scope, ...)` made every old `projectKey(slug, 'x')` call in tests silently read `'x'` as the scope, and `fetchDocument` and `loadPair` gained a scope argument. Several contract tests also pin source text (`projectKey(slug, 'presentation')`, `projectUrl(slug, '/drawer')`, the sketch anchors, `fetchPresentation(slug: string)`, the AppShell `NavLink` import).
- **Fix:** moved those calls and pinned strings to the scope-aware form (`projectKey(..., null, ...)` for flat seeds; `projectWideKey` where the test meant the project prefix). Files: `test/web/{file-pages,plan-pair-cache,project-layout,projects-page,refresh-contract,sketches-page-contract,invalid-project-contract,navbar-contract,visual-contract}.test.ts`. No behaviour assertion was weakened.
- **Commits:** `a396cfa`, `05d3a47`

**2. [Rule 2 - Missing critical] An unknown workstream name needed an answer**
- **Issue:** the server answers 404 for an unknown scope, which would have left the project layout in "presentation-error" with the shell's "could not refresh its snapshot metadata" notice.
- **Fix:** `project-layout.tsx` renders the one not-found page when a scoped presentation answers 404.
- **Commit:** `a396cfa`

**3. Test helper added:** `callArguments` in `test/helpers/source-scan.ts` (top-level arguments of every call to a named function) backs the two scope scans.

## Known Stubs

None.

## Known Limitations

- Every scoped query inherits the server-side Pace caveat recorded in 11-29 (a scoped Pace can include another workstream's commits).
- The not-found address is rebuilt from the project-relative path (`/{slug}/workstreams/{name}{path}`), so it names the address decoded and normalised, not byte-for-byte as typed.
- The workstream index as the first screen, the drawer's Shared group and the chip are 11-31 and 11-32; the `/workstreams` address alone is still the ordinary not-found page.

## Threat Flags

None beyond the plan's register: T-11-46 (the scope is one `encodeURIComponent` segment in links and requests; `withProjectScope` keeps the single-slash rule; tested with `a/b?c#d` and crafted targets; the server validates the name, 11-29), T-11-48 (the scope is in every query key; `query-keys.test.ts` scans every `projectKey` call and the nav-contract scan every `projectUrl` and `fetchPresentation` call), T-11-SC (no package installed).

## Self-Check: PASSED

- Commits `a396cfa` and `05d3a47` are ancestors of HEAD.
- Modified files exist: project-path.ts, nav.tsx, api.ts, query-keys.ts, app-router.tsx, project-layout.tsx, copy-path-button.tsx, nav-contract.test.ts, query-keys.test.ts, source-scan.ts.
