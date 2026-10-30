---
phase: 08-several-projects-and-a-switcher
plan: 10
subsystem: ui
tags: [react, react-query, multi-project, slug-scoped-keys, plan-pair, search, drawer]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "08-05 api.ts (apiFetch, projectUrl) and query-keys.ts (projectKey); 08-06 test/e2e/app-url.ts (projectApiUrl); 08-08 slug-scoped presentation read and useProjectSlug"
provides:
  - "fetchDocument(slug, route) exported from artifact-page.tsx, shared by the artifact page and the plan pair"
  - "loadPair(slug, planUrl, queryClient) exported from plan-pair-page.tsx"
  - "Slug-scoped keys projectKey(slug, 'drawer' | 'search' | 'research' | 'roadmap' | 'traceability' | 'document' | 'plan-pair', ...)"
  - "apiFetch accepts an optional AbortSignal"
  - "test/web/plan-pair-cache.test.ts: two projects, one plan URL, separate cache entries"
affects: [08-12, 08-15]

tech-stack:
  added: []
  patterns:
    - "Every page fetch is apiFetch(projectUrl(slug, path)) and every key is projectKey(slug, ...), with slug from useProjectSlug() ?? ''"

key-files:
  created:
    - test/web/plan-pair-cache.test.ts
  modified:
    - src/web/api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/pages/plan-pair-page.tsx
    - src/web/components/planning-places.tsx
    - src/web/components/search-field.tsx
    - src/web/pages/search-page.tsx
    - src/web/pages/research-page.tsx
    - src/web/pages/roadmap-page.tsx
    - src/web/pages/traceability-page.tsx
    - test/web/visual-contract.test.ts
    - test/e2e/plan-page.spec.ts
    - test/e2e/planning-drawer.spec.ts
    - test/e2e/research-briefing.spec.ts
    - test/e2e/document-layout.spec.ts

key-decisions:
  - "The document cache key is projectKey(slug, 'document', route), replacing ['artifact-document', route]; the plan pair seeds the same key the artifact page reads, so a pair tab opens without a second request."
  - "apiFetch gained an optional signal so search keeps TanStack Query's AbortSignal stale-response guard (D-02), which test/web/navbar-contract.test.ts pins."

patterns-established:
  - "A 404 from /documents keeps its own warning text as the thrown message (fetchDocument unwraps ApiError.body.warning)."

requirements-completed: [PLAT-08, PLAT-02]

duration: 15 min
completed: 2026-10-30
status: complete
commits: 3
plan_head_before: 04451998f251fdad0caa8851c90613f6ed2df664
plan_head_after: dc65dd07a418c479307587b3eddaa2add4d999b9
actuals:
  tokens: 8700
  tasks: 3
  commits: 3
---

# Phase 8 Plan 10: Plan pair, drawer, search and reading pages on their project's API Summary

**The plan pair, document, drawer, search (dropdown and page), research, roadmap and traceability pages now fetch through `apiFetch(projectUrl(slug, ...))` and cache under `projectKey(slug, ...)`, closing the infinite-stale-time plan-pair collision between projects.**

## Performance

- **Duration:** 15 min
- **Tasks:** 3
- **Files modified:** 15 (1 created)

## Accomplishments

- Opening the same project-relative plan URL in two projects shows each project's own plan: the pair entry and its two seeded document entries are keyed by slug, and the regression test proves it with two copies of the lendshed fixture (slugs `lendshed` and `lendshed-2`) and one `QueryClient`.
- The drawer, both search surfaces and the research, roadmap and traceability pages no longer name a root `/api/` route.
- The plan, drawer, research and document-layout browser specs read their payloads through `projectApiUrl`; none names a root project route (comments included).

## Task Commits

1. Task 1 (tracer): plan pair and document caches keyed by project - `d84080d`
2. Task 2: drawer, search, research, roadmap, traceability on the project API - `50a6649`
3. Task 3: four browser specs on `projectApiUrl` - `dc65dd0`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Optional `signal` added to `apiFetch` (src/web/api.ts)**
- **Found during:** Task 2
- **Issue:** The search fetchers passed TanStack Query's `AbortSignal`, which `apiFetch` could not carry; dropping it failed `test/web/navbar-contract.test.ts` ("keeps the existing query machinery unchanged", which pins `queryFn: ({ signal })`) and lost the D-02 abort guard. The plan said this plan never edits api.ts.
- **Fix:** Added an optional `signal?: AbortSignal` to `ApiInit`, forwarded to `fetch` only when set. Purely additive; no other plan in the wave touches the file.
- **Files modified:** src/web/api.ts, src/web/components/search-field.tsx, src/web/pages/search-page.tsx
- **Commit:** `50a6649`

**2. [Rule 1 - Bug in plan assumption] Test fixture has no `# ` heading to change**
- **Found during:** Task 1
- **Issue:** The plan says to change the first `# ` heading of a shared plan file; the lendshed plan files have no H1.
- **Fix:** The test inserts an H1 right after the frontmatter of 01-01-PLAN.md in the second copy, so title and document differ.
- **Commit:** `d84080d`

**3. [Rule 1 - Lint] `preserve-caught-error`** on the rethrown 404 warning in `fetchDocument`; fixed with `{ cause: error }`. Commit `d84080d`.

**Total deviations:** 3 auto-fixed. **Impact:** none on scope; one additive line group in api.ts.

## Issues Encountered

- Error text for a failed drawer, roadmap, research, traceability or search request is now apiFetch's (`Request failed (N)` or the server's own `error`) instead of the per-page strings. No test pinned the old strings.
- Full `vitest run`: 4733 passed, 3 failed; the 3 are the known pre-existing corpus-guard failures for 08-PATTERNS.md and 08-UI-SPEC.md. `tsc` (both projects) and `eslint` are clean. The four e2e specs were type-checked only, per the plan; they run in the phase gate (08-15).

## Known Stubs

None.

## Threat Flags

None. T-08-27 is mitigated: slug-first keys plus the two-project regression test.

## Next Phase Readiness

08-12 owns the remaining root-route users (sketches page, image, snapshot-status's `/api/refresh` is 08-09's) and the standing scan against array-literal keys.

## Self-Check: PASSED

- test/web/plan-pair-cache.test.ts exists; commits d84080d, 50a6649, dc65dd0 are in HEAD history.
