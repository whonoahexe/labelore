---
phase: 07-recognised-files-and-readable-urls
plan: 03
subsystem: routing
tags: [project-slug, react-router, nav, not-found, eslint, source-scan, vitest]

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-01: fileClass and sizeBytes on the payload; the Shapes fixture project"
provides:
  - "src/presentation/reserved.ts: SERVER_OWNED_PREFIXES, RESERVED_SLUGS and isServerOwnedUrl, shared by routesToApp and slugOf"
  - "src/presentation/project-slug.ts: slugOf(rootPath), and ProjectPresentation.projectSlug on every payload"
  - "src/web/project-path.ts: withProjectSlug, splitProjectPath, decodeAddress, projectGateOutcome"
  - "src/web/nav.tsx: the one slug-prefixing module (Link, NavLink, useProjectNavigate, useProjectLocation, useProjectPathname, useProjectHref, useProjectSlug, ProjectSlugProvider)"
  - "src/web/pages/not-found-page.tsx: the one not-found page, naming the address as typed"
  - "A /:project route tree (appRoutes) with a gate: / redirects to /<slug>, a wrong first segment shows the not-found page, today's encoded URLs open under the slug"
  - "ESLint no-restricted-imports on src/web and test/web/nav-contract.test.ts as the standing contract"
affects: [07-04, 07-05, 07-06, 07-07, 07-08, 07-09, 07-10]

actuals:
  tokens: 19300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "One module prefixes the slug: pages and components speak project-relative paths; nav.tsx adds the slug on the way out and strips it on the way in"
    - "Standing source scan with a planted positive control (imports, queryKey, bare href allowlist), alongside the ESLint rule"
    - "Server and router read one reserved-word constant, so a folder named like a server path cannot be served as one"

key-files:
  created:
    - src/presentation/reserved.ts
    - src/presentation/project-slug.ts
    - src/web/project-path.ts
    - src/web/nav.tsx
    - src/web/pages/not-found-page.tsx
    - test/presentation/project-slug.test.ts
    - test/web/project-path.test.ts
    - test/web/project-routes-match.test.ts
    - test/web/not-found-page.test.ts
    - test/web/nav-contract.test.ts
  modified:
    - src/server/index.ts
    - src/server/project-presentation.ts
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/components/{artifact-header,pair-switch,planning-places,search-field,reference-preview}.tsx
    - src/web/pages/{artifact-page,dashboard-deck,dashboard-ledger,dashboard-page,plan-pair-page,research-atoms,roadmap-page,search-page,sketches-page,traceability-page}.tsx
    - src/web/views/{note-page,plan-navigator,research-briefing,review-threads,summary-run,todo-lifecycle,ui-review,validation-strategy}-components.tsx
    - eslint.config.js
    - tsconfig.server.json
    - test/web/{navbar-contract,shell-contract,sketches-page-contract,build-splitting,roadmap-deep-link}.test.ts
    - test/rendering/references.test.ts
    - "7 test files whose ProjectPresentation literals gained projectSlug"

key-decisions:
  - "ProjectSlugProvider (a context in nav.tsx) overrides the :project route parameter, so on a wrong-project address the shell's tabs and the Return to the dashboard link lead into the open project, not the typed name"
  - "NotFoundPage wraps its own link in the provider with openSlug, so its link is /<openSlug> whatever router context renders it"
  - "String targets starting with ? or # pass through nav.tsx unprefixed (same-page); only withProjectSlug's own guard collapses malformed targets to the dashboard"
  - "test/web/project-routes-match.test.ts replaces createBrowserRouter with a stub, because the node test environment has no document; the route objects under test are the real ones"
  - "tsconfig.server.json gains DOM.Iterable: a test that imports app-router.tsx pulls the whole web layer into the server project, which uses NodeList iteration"

patterns-established:
  - "Web code never imports Link, NavLink, useNavigate or useLocation from react-router; it imports the same names from nav.tsx (type imports and useSearchParams stay on react-router)"
  - "Query keys and page logic read the slug-stripped project-relative path from useProjectPathname"
  - "A bare href={...} in src/web must be a hash link, a new-tab server or external URL, or a useProjectHref value; the allowlist is exact"

requirements-completed: [NAV-09]

coverage:
  - id: D1
    description: "slugOf turns a target folder into one lower-case ASCII segment (parent of .planning, ssh label tail, 'project' when empty, '<word>-project' for any reserved word) and the server answers it as projectSlug (NAV-09)"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/presentation/project-slug.test.ts#slugOf"
        status: pass
      - kind: integration
        ref: "test/presentation/project-slug.test.ts#/api/presentation carries the slug"
        status: pass
    human_judgment: false
  - id: D2
    description: "routesToApp and slugOf share one reserved-word constant, so a project named api or sketches is never served as the API or the sketch files (T-07-06)"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/presentation/project-slug.test.ts#routesToApp - the one reserved-word constant"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every page lives under /:project; an unmapped address under the slug reaches the * child; the gate separates loading, invalid, wrong-project and open"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/project-routes-match.test.ts#appRoutes"
        status: pass
      - kind: unit
        ref: "test/web/project-path.test.ts#projectGateOutcome"
        status: pass
    human_judgment: false
  - id: D4
    description: "withProjectSlug prefixes project-relative targets, keeps query and hash, and collapses '//', '/\\\\' and non-rooted targets to the dashboard (T-07-07)"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/project-path.test.ts#withProjectSlug"
        status: pass
    human_judgment: false
  - id: D5
    description: "One not-found page with one copy set names the decoded address as escaped text in a wrapping artifact-path paragraph, with the wrong-project body and a Return to the dashboard link to /<slug> (T-07-08)"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/not-found-page.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "No web file other than nav.tsx and app-router.tsx imports Link, NavLink, useNavigate or useLocation from react-router; no query key uses the raw location; bare hrefs sit on an exact allowlist"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/nav-contract.test.ts"
        status: pass
      - kind: other
        ref: "npm run lint (no-restricted-imports; planted src/web probe reported the restricted import)"
        status: pass
    human_judgment: false
  - id: D7
    description: "In a browser, / lands on /<slug>, the drawer, nav tabs and breadcrumbs keep the prefix, /someone-else/roadmap shows the wrong-project page, and today's encoded URLs open under the slug"
    requirement: NAV-09
    verification: []
    human_judgment: true
    rationale: "The router, redirect and link behaviour is proven at the unit and source level only; the plan records its browser walkthrough as a human-check for the end-of-phase batch. No Chromium run was made for this plan."

duration: 35min
completed: 2026-10-26
status: complete
commits: 3
plan_head_before: 0fc95b872ddfef34ee2da2de50d1aa237e387ef2
plan_head_after: 59a54e56f7f9e832b67fb43151212be77cd1d6a5
---

# Phase 7 Plan 03: Project Slug in Every Address Summary

**Every address now starts with the project's name: the server derives one slug per target (reserved words get a -project suffix), nav.tsx is the single place the web prefixes it, the router gates on it (/ redirects, a wrong name gets the one not-found page naming what was typed), and ESLint plus a standing source scan fail any new raw router link.**

## Performance

- **Duration:** about 35 min (start time not captured; estimated from the first command)
- **Completed:** 2026-10-26T20:38:00Z
- **Tasks:** 3 (tracer, component and page sweep, view sweep plus lint rule and standing contract)
- **Files modified:** 51 in the task commits (10 new, 41 edited)

## Accomplishments

- Tracer: `slugOf` and `projectSlug` on the payload, `reserved.ts` shared by `routesToApp`, `project-path.ts`, `nav.tsx`, `NotFoundPage`, and a `/:project` route tree with a gate. `/` replaces itself with `/<slug>`; a wrong first segment renders the shell around the not-found page; today's encoded URLs open as relative children under the slug.
- Sweep: 15 components and pages and 8 per-type views take `Link`, `NavLink`, `useNavigate` and `useLocation` from `nav.tsx`. `plan-pair-page`, `artifact-page`, `planning-places` and `roadmap-page` read the slug-stripped path, so their query keys, `loadPair`, drawer active row and deep-link resolution see exactly what they saw before the slug. The reference preview's Open anchor uses `useProjectHref`. Sketch files (server-owned, new tab) stay unprefixed.
- Enforcement: `no-restricted-imports` on `src/web/**` (off for `nav.tsx` and `app-router.tsx`), and `test/web/nav-contract.test.ts` (imports, raw-location query keys, exact bare-href allowlist, planted positive control). A probe file planted in `src/web` was reported by ESLint, then removed.
- Tracer feedback gate: `<verify>` is automated-only and `human_verify_mode` is end-of-phase, so it was re-run after the tracer commit (134 of 134 gate tests, typecheck clean): tracer verified end-to-end, expansion continued.

## Task Commits

1. **Task 1: tracer, one project-prefixed address opens end to end** - `8ede926` (feat)
2. **Task 2: components and pages through nav.tsx** - `8918442` (refactor)
3. **Task 3: views, lint rule and standing nav contract** - `59a54e5` (feat)

**Plan metadata:** the docs commits that follow this file (SUMMARY, then STATE/ROADMAP/REQUIREMENTS).

## Files Created/Modified

See `key-files` above. The authored code is `reserved.ts`, `project-slug.ts`, `project-path.ts`, `nav.tsx`, `not-found-page.tsx`, the router and shell edits and the ESLint block; the remaining src files change one import line, and in seven of them a hook or one href.

## Decisions Made

See `key-decisions`. In one line each: a slug context rather than only the route parameter, because a wrong-project page must link into the project that is open; same-page `?`/`#` targets pass through the wrappers because they cannot leave the page; the router test stubs only the browser-router factory; `DOM.Iterable` joins the server tsconfig because the router test now reaches the web layer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's wrong-project page would have linked and navigated into the wrong project**
- **Found during:** Task 1
- **Issue:** `useProjectSlug` reads the `:project` parameter, which on a wrong-project address is the typed name. The shell's tabs and the page's `Return to the dashboard` link would then have been `/<typed-name>/...`, and the plan's test (MemoryRouter at `/shapes/notes`, link href `/shapes`) has no `:project` parameter at all.
- **Fix:** `ProjectSlugProvider` in `nav.tsx` overrides the parameter. `ProjectGate` provides the payload's slug around the shell in the wrong-project case, and `NotFoundPage` wraps its own link with `openSlug`.
- **Files modified:** `src/web/nav.tsx`, `src/web/app-router.tsx`, `src/web/pages/not-found-page.tsx`
- **Verification:** `test/web/not-found-page.test.ts` (href `/shapes` for both bodies)
- **Committed in:** `8ede926`

**2. [Rule 3 - Blocking] Required `projectSlug` broke typecheck in seven test files**
- **Found during:** Task 1
- **Issue:** `ProjectPresentation` literals in `test/presentation/{dashboard,roadmap,search,traceability}`, `test/rendering/{plan-sections,references}` and `test/web/plan-context` no longer typechecked.
- **Fix:** Added `projectSlug: 'project'` beside `rootPath: '/project'` in each literal (scripted; typecheck is the proof).
- **Committed in:** `8ede926`

**3. [Rule 3 - Blocking] A test that imports the router pulled the web layer into the server tsconfig**
- **Found during:** Task 1
- **Issue:** `test/web/project-routes-match.test.ts` imports `app-router.tsx`, whose lazy imports bring `artifact-page.tsx` under `tsconfig.server.json` (lib `ES2022, DOM`), failing on `NodeListOf` iteration.
- **Fix:** Added `DOM.Iterable` to the server tsconfig lib (the web tsconfig already has it).
- **Files modified:** `tsconfig.server.json`
- **Committed in:** `8ede926`

**4. [Rule 1 - Bug] Five source pins outside the plan's list moved with the code**
- **Found during:** Tasks 1 and 2
- **Issue:** `build-splitting.test.ts` pinned `<Suspense ...><Outlet /></Suspense>` (now `{children ?? <Outlet />}`); `references.test.ts` pinned `presentationRoutePatterns.plan, element:` and `href={preview.url}`; `roadmap-deep-link.test.ts` pinned the text `useLocation`; the sketches pin was listed but the other four were not.
- **Fix:** Each pin keeps its intent against the new text (`relative(...)`, `useProjectHref(`/`href={href}`, `useProjectPathname`). `navbar-contract` and `shell-contract` kept passing unchanged, so each gained one pin that the shell imports `NavLink` from `nav.tsx`.
- **Committed in:** `8ede926`, `8918442`

**5. [Rule 3 - Blocking] The router module cannot be imported in the node test environment**
- **Found during:** Task 1
- **Issue:** `appRouter = createBrowserRouter(...)` needs `document`; vitest runs in node, and the plan has the route test import `appRoutes`.
- **Fix:** The test stubs only `createBrowserRouter` with `vi.mock`; `appRoutes` is the real export.
- **Committed in:** `8ede926`

---

**Total deviations:** 5 auto-fixed (2 bugs, 3 blocking). **Impact on plan:** all necessary for correctness; no scope creep. Files outside the plan's `files_modified`: `tsconfig.server.json`, `test/web/build-splitting.test.ts`, `test/web/roadmap-deep-link.test.ts`, `test/rendering/references.test.ts` and seven test literals.

## Issues Encountered

- `npm run test:gate` reports `total=3860 passed=3857 failed=3 skipped=0`. The three failures are the pre-existing baseline (`test/web/pattern-map-corpus.test.ts` one, `test/web/ui-spec-corpus.test.ts` two), which want pinned entries for this phase's own `07-PATTERNS.md` and `07-UI-SPEC.md`. Lint, typecheck and `npm run build` exit 0.
- The Playwright specs under `test/e2e` still visit un-prefixed paths and will land on the wrong-project page until 07-05 (the e2e URL helper) and 07-08 (legacy redirector); they were not run here.

## Known Stubs

None.

## Threat Flags

None. T-07-06 (slug equal to a server-owned word): one shared constant, tested for every member. T-07-07 (open redirect): `withProjectSlug` collapses `//`, `/\` and non-rooted targets, and the root redirect uses the payload's slug only. T-07-08 (markup in the typed address): rendered as React text; a test asserts the escaped form.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 07-04 to 07-07 can change URL shapes by editing `routes.ts` and the relative children in `appRoutes`; no link sweep is needed because every link already goes through `nav.tsx`.
- Interim state, as planned: un-prefixed bookmarks (`/roadmap`, `/milestones/...`) show the wrong-project not-found page until 07-08.
- The end-of-phase human check (open `/` and confirm it lands on `/labelore`, drawer, tabs and breadcrumbs keep the prefix, `/someone-else/roadmap` shows the wrong-project page) is still to be done in a browser.

## Self-Check: PASSED

- Created files exist on disk (reserved.ts, project-slug.ts, project-path.ts, nav.tsx, not-found-page.tsx, five test files).
- Commits 8ede926, 8918442 and 59a54e5 are ancestors of HEAD; measured count 3 from the persisted ledger.
- Acceptance criteria re-run: `isServerOwnedUrl` 2 matches in `server/index.ts`, `projectSlug: slugOf(` 2 in `project-presentation.ts`, `path: '/:project'` 1 in `app-router.tsx`; the restricted-import grep over `src/web` (outside the two owners) prints nothing; `useProjectHref` is in `reference-preview.tsx`; `no-restricted-imports` is in `eslint.config.js`; no `location.pathname` in `plan-pair-page.tsx` or `artifact-page.tsx`.
- Plan-level verification: lint, typecheck and build exit 0; full gate shows only the three baseline failures.

---
*Phase: 07-recognised-files-and-readable-urls*
*Completed: 2026-10-26*
