---
phase: 08-several-projects-and-a-switcher
plan: 09
subsystem: ui
tags: [react, react-router, react-query, navigation, cache-scoping]

requires:
  - phase: 08-05
    provides: AppLink, PlainHeader/PlainPage, projectKey/projectsKey, projectRootPath
  - phase: 08-08
    provides: refreshProject(slug) in api.ts, ProjectLayout, ProjectRoute, unknown-project page
provides:
  - Snapshot pill that refreshes only the project in the URL (refreshInvalidations helper)
  - "Choose another project" way back on the failed-load screen
  - NotFoundPage({ address, openSlug }) with a single form
  - useProjectSlug reading only the URL's :project parameter (slug override context removed)
affects: [08-10, 08-11, 08-12, 08-14, 08-15]

actuals:
  tokens: 5800
  tasks: 2
  commits: 2
plan_head_before: 04451998f251fdad0caa8851c90613f6ed2df664
plan_head_after: 5684bab39952c264e2606e368676c7157ebb1c25

tech-stack:
  added: []
  patterns:
    - "Slug comes only from the URL: no context can override useProjectSlug"
    - "A cache action exported as a small pure helper (refreshInvalidations) so a test calls exactly what the component calls"

key-files:
  created: []
  modified:
    - src/web/components/snapshot-status.tsx
    - src/web/pages/invalid-project-screen.tsx
    - src/web/pages/not-found-page.tsx
    - src/web/nav.tsx
    - src/web/app-router.tsx
    - test/web/refresh-contract.test.ts
    - test/web/invalid-project-contract.test.ts
    - test/web/not-found-page.test.ts
    - test/web/file-pages.test.ts
    - test/web/projects-page.test.ts

key-decisions:
  - "Un-prefixed legacy miss and its loading state render under PlainPage with no shell, because a shell's links follow the URL's first segment, which there is the legacy word"
  - "NotFoundPage's way back is AppLink to projectRootPath(openSlug), so an invalid slug collapses to /"

requirements-completed: [PLAT-08]

coverage:
  - id: D1
    description: "The snapshot pill posts to /api/projects/<slug>/refresh for the URL's slug and invalidates only projectKey(slug) and projectsKey; another project's cached entry stays valid"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#refreshing shapes marks shapes and the list invalid and leaves lendshed valid (T-08-35)"
        status: pass
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#posts through refreshProject and holds no /api/ literal of its own (PLAT-08)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A failed load shows exactly one 'Choose another project' AppLink to / above the restart field"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#offers a copyable restart command and one way back to the project list (D-07, D-17)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The not-found page has one form (no wrong-project variant) and leads back to the open project's dashboard through AppLink"
    verification:
      - kind: unit
        ref: "test/web/not-found-page.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "useProjectSlug reads only the URL; an un-prefixed legacy miss shows the not-found page under the plain header, a hit redirects with a lone Navigate"
    verification:
      - kind: unit
        ref: "test/web/legacy-isolation.test.ts#renders only a Navigate on the un-prefixed redirect branch of app-router.tsx"
        status: pass
    human_judgment: true
    rationale: "The shell-less miss and loading look of the legacy branch is a visual and routing behaviour no unit test renders; the browser specs in 08-14/08-15 are the check"

duration: 14min
completed: 2026-10-30
status: complete
---

# Phase 08 Plan 09: Switch states Summary

**Snapshot pill refreshes only the URL's project (invalidating projectKey(slug) and projectsKey), the failed-load screen links back to `/`, the not-found page loses its wrong-project variant, and the slug override context is deleted so links come only from the URL.**

## Performance

- **Duration:** 14 min
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- `SnapshotStatus` calls `refreshProject(slug)` (slug from `useProjectSlug()`), and on success runs the exported `refreshInvalidations(queryClient, slug)`: `invalidateQueries({ queryKey: projectKey(slug) })` then `invalidateQueries({ queryKey: projectsKey })`. The local `/api/refresh` fetcher and the unfiltered `invalidateQueries()` are gone. A behavioural test seeds two projects plus the list and proves a refresh of `shapes` leaves the `lendshed` entry valid (T-08-35).
- `InvalidProjectScreen` gains an `AppLink.text-link` "Choose another project" to `/` directly above the restart field (D-07); the contract test pins exactly one such link, to `/`, ahead of the restart field.
- `NotFoundPage({ address, openSlug })`: wrong-project prop, sentence and provider removed; the way back is `AppLink` to `projectRootPath(openSlug)` (an invalid slug collapses to `/`, T-08-36).
- `nav.tsx`: slug override context and `ProjectSlugProvider` deleted; `useProjectSlug` returns `params.project ?? null`; header comment rewritten.
- `app-router.tsx`: the un-prefixed legacy branch is a `outcome.kind === 'redirect' ? ( lone Navigate ) : ( PlainPage + NotFoundPage )` ternary; `legacy-isolation.test.ts` passes unmodified.

## Task Commits

1. **Task 1: Refreshing one project leaves every other project's cache alone** - `53da81d` (feat, tracer)
2. **Task 2: A way back from a failed load, one not-found page, and no slug override** - `5684bab` (feat)

The tracer gate: Task 1's `<verify>` (refresh-contract test, typecheck) was re-run end to end and passed before Task 2 began.

## Files Created/Modified

- `src/web/components/snapshot-status.tsx` - slug-scoped refresh mutation and `refreshInvalidations`
- `src/web/pages/invalid-project-screen.tsx` - "Choose another project" link
- `src/web/pages/not-found-page.tsx` - single-form not-found page
- `src/web/nav.tsx` - URL-only `useProjectSlug`, override removed
- `src/web/app-router.tsx` - shell-less legacy miss, lone-Navigate redirect
- `test/web/refresh-contract.test.ts`, `invalid-project-contract.test.ts`, `not-found-page.test.ts` - updated pins and cases
- `test/web/file-pages.test.ts`, `test/web/projects-page.test.ts` - provider replaced by a `/:project/*` route

## Decisions Made

- Followed the plan's flagged assumption: an un-prefixed legacy address that resolves nowhere is shown under the plain header with no shell. One branch in `app-router.tsx`; reversible when the legacy addresses are removed at v2.1 close.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two other test files imported the deleted ProjectSlugProvider**
- **Found during:** Task 2 (grep for `ProjectSlugProvider` before deleting it)
- **Issue:** `test/web/file-pages.test.ts` (DocumentRoute render) and `test/web/projects-page.test.ts` (AppLink render) wrapped components in `ProjectSlugProvider`; the plan's file list omitted them, though they would fail typecheck and test once the export went. The plan's scope note says nothing in the wave imports the override, which held for src but not for these two tests.
- **Fix:** Render the same components under `<Routes><Route path="/:project/*" ...>` inside the existing `MemoryRouter` entry, so `useProjectSlug` resolves from the URL exactly as in the app.
- **Files modified:** test/web/file-pages.test.ts, test/web/projects-page.test.ts
- **Verification:** `vitest run test/web` green apart from the 3 known corpus-guard failures; both files typecheck.
- **Committed in:** 5684bab

**2. [Rule 1 - Bug] Legacy loading state still rendered a shell whose links followed the legacy word**
- **Found during:** Task 2 (app-router.tsx)
- **Issue:** With the override gone, `LegacyRoute`'s pending branch `<AppShell project={first} busy />` would build its tab and brand links from the URL's first segment, the legacy word (for example `/roadmap/roadmap`). The plan only named the miss branch.
- **Fix:** The pending branch renders `PlainPage` around `RouteFallback`, the same shell-less treatment as the miss; the unused `AppShell` and `ProjectListEntry` imports and the unused `project` prop of `UnprefixedLegacy` are dropped.
- **Files modified:** src/web/app-router.tsx
- **Verification:** typecheck, lint, `legacy-isolation.test.ts` unmodified and green.
- **Committed in:** 5684bab

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both are direct consequences of deleting the override; no scope creep beyond the plan's intent.

## Issues Encountered

- `npm run test:gate` resolves `node_modules/.bin/vitest` under the repo root, which the worktree lacks, so vitest, tsc and eslint were run through the main checkout's binaries (`vitest run test/web`: 1985 passed, 3 failed). The 3 failures are the known pre-existing corpus-guard tests for 08-PATTERNS.md / 08-UI-SPEC.md (see deferred-items.md). `tsc` on both projects and `eslint .` exit 0. The gate's skipped/todo counts were not read through the gate script itself; the vitest summary shows no skipped or todo tests.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or file access; the refresh request now targets the existing per-project route.

## Next Phase Readiness

- 08-11 (switcher) and 08-10 can rely on `useProjectSlug` reading only the URL; no override export remains.
- The shell-less legacy miss and loading look should be checked in the browser specs (08-14/08-15).

## Self-Check: PASSED

- Files exist: all 10 modified files present; no `ProjectSlugProvider` or `wrongProject` remains under src/web or test/web.
- Commits present: `53da81d`, `5684bab`.
