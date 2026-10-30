---
phase: 08-several-projects-and-a-switcher
plan: 12
subsystem: server, web
tags: [sketch-files, csp-sandbox, project-api, query-keys, source-scan]
requires:
  - phase: 08-01
    provides: createProjectApi with the mountPrefix variable
  - phase: 08-06
    provides: startServer serving only the guarded registry app
  - phase: 08-09
    provides: slug-scoped pages rendered under /:project
  - phase: 08-10
    provides: projectKey / projectUrl / apiFetch on the web side
provides:
  - "Sketch files at /api/projects/<slug>/sketch-files/<folder>/ behind the Host guard, sandbox CSP on every response"
  - "Project-relative sketchViewUrl and imageBytesUrl; SERVER_OWNED_PREFIXES = ['/api/']"
  - "Slug-scoped sketches page and image page"
  - "test/web/query-keys.test.ts: three standing scans over src/web with planted positive controls"
affects: [08-13, phase-verification]
tech-stack:
  added: []
  patterns:
    - "A middleware that needs the request's project reads runtime and mountPrefix from the context the project API's first middleware set"
    - "Source scan with an exempt file, proved by a planted tree run through the same scanner"
key-files:
  created:
    - test/web/query-keys.test.ts
  modified:
    - src/server/sketch-files.ts
    - src/server/project-api.ts
    - src/server/index.ts
    - src/presentation/sketches.ts
    - src/presentation/reserved.ts
    - src/presentation/file-facts.ts
    - src/web/pages/sketches-page.tsx
    - src/web/pages/image-page.tsx
    - test/server/sketch-files.test.ts
    - test/presentation/sketches.test.ts
    - test/presentation/file-facts.test.ts
    - test/presentation/project-slug.test.ts
    - test/web/sketches-page-contract.test.ts
    - test/web/file-pages.test.ts
key-decisions:
  - "Sketch files are mounted inside createProjectApi, so they share the registry's request guard and the per-slug runtime; the createApp wrapper's old app-root registration is gone"
  - "The sketch middleware's redirect prefix comes from the raw mountPrefix, so a 308 names exactly the slug segment the client sent"
  - "The previous-data scan forbids the option and helper identifiers outright, not only the helper's use"
status: complete
commits: 2
plan_head_before: 2d2d1ffae6035f17c17d7945eab383b62b87552b
plan_head_after: d348ce50979f880ee4f9fbbddd0e0ec03ac8739c
actuals:
  tokens: 60000
  tasks: 2
  commits: 2
metrics:
  completed: 2026-10-30
---

# Phase 8 Plan 12: Sketch files and image bytes under the project API, and the scoping scans

Sketch files now come from each project's own guarded API with the sandbox header on every response, the sketches and image pages build their URLs from the page's slug, and a standing test fails the suite if an unscoped key, a hand-built `/api/` literal or a previous-data option ever returns to `src/web`.

## What was done

**Task 1 (tracer), commit 1fb0b56.** `createSketchFileMiddleware(getFilesystem(c), prefixOf(c))` reads the filesystem and the prefix per request; `sketchRequestPath(pathname, prefix)` keeps every old rule (decode once, refuse dot, empty, slash, backslash and NUL segments, `index.html` for a directory) and answers 404 outside the given prefix. `project-api.ts` registers `/sketch-files/*` after the resolver middleware, using `runtime` and `mountPrefix` from the context. `index.ts` drops the wrapper's app-root registration, `SERVER_OWNED_PREFIXES` is `['/api/']`, and `sketchViewUrl` returns `/sketch-files/<folder>/`. The sketches page fetches `projectUrl(slug, '/sketches')` under `projectKey(slug, 'sketches')`, and its frame and both open-in-new-tab links use `projectUrl(slug, viewUrl)`. The tracer was re-verified end to end (server directory, presentation and page-contract tests) before Task 2.

**Task 2, commit d348ce5.** `imageBytesUrl` returns `/files?route=...`; the image page prepends the project API base. `test/web/query-keys.test.ts` holds the three scans (array-literal query/mutation keys and cache calls outside `query-keys.ts`; `/api/` string or template literals outside `api.ts`; the previous-data option and helper, built from parts), each with a planted positive control over a temporary tree, plus a control showing only the two named files are exempt. The scans reported nothing in the real tree, so no further `src/web` file needed moving.

## Verification

- Full unit suite: 4806 passed, 3 failed. The three failures are the known pre-existing corpus guards for `08-PATTERNS.md` / `08-UI-SPEC.md` (pattern-map-corpus, ui-spec-corpus), not touched here.
- `tsc --noEmit` on `tsconfig.server.json` and `tsconfig.web.json`, and `eslint .`: clean.
- `npm run test:gate` could not start in the worktree (the gate resolves `node_modules/.bin/vitest` inside the worktree, which has no `node_modules` by design), so the same files were run with the main checkout's `vitest` directly. The gate's skipped/todo counters were therefore not read; the vitest output showed no skipped or todo tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `test/presentation/project-slug.test.ts` pinned the old prefix list**
- **Found during:** Task 1
- **Issue:** Its `routesToApp('/sketches/a')` expectation was `true`, which the required `SERVER_OWNED_PREFIXES = ['/api/']` change inverts. The file is not in the plan's `files_modified`.
- **Fix:** The case now expects `/sketches/a` and `/lendshed/sketches/` to stay with Vite and `/api/projects/lendshed/sketch-files/a/` to go to the app.
- **Files modified:** test/presentation/project-slug.test.ts
- **Commit:** 1fb0b56

**2. [Rule 2 - Missing critical] The sketch route test now covers the registry app's guard and slug handling**
- **Found during:** Task 1
- **Issue:** The plan asks for guarded registry coverage; additionally a 308 built from a decoded slug could name a different segment than the client sent.
- **Fix:** Added registry-only cases: a foreign Host answers 403 before the middleware, an unknown slug answers 404 with no sketch bytes, and the 308 `Location` is the raw `/api/projects/<slug>/sketch-files/<folder>/` same-origin path. Each response in both apps also asserts nosniff and no-cache on the 308.
- **Files modified:** test/server/sketch-files.test.ts
- **Commit:** 1fb0b56

No other deviations. Plan note: the planned "Shapes sketches" could not supply a 200 because the committed Shapes fixture has no sketch `index.html`; the test builds its sketch tree in a temporary directory (as it did before) and registers it in a real `ProjectRegistry`, which also keeps committed fixtures tied to gsd-core templates.

## Known Stubs

None.

## Threat Flags

None. The sketch-file surface moved inside the guarded API, which is the T-08-17 mitigation; no new endpoint was added.

## Notes for later plans

- An unknown-project request to `/api/projects/<bad>/sketch-files/...` answers the resolver's JSON 404 without the sandbox header; it carries no sketch bytes. All responses from the sketch middleware itself carry the header.
- `RESERVED_SLUGS` still lists `sketches`: it remains a project page word.

## Self-Check: PASSED

- test/web/query-keys.test.ts and 08-12-SUMMARY.md exist; commits 1fb0b56 and d348ce5 are ancestors of HEAD.
- `git grep` acceptance lines: `SERVER_OWNED_PREFIXES = ['/api/'] as const` (reserved.ts), `SKETCH_FILES_SEGMENT` (sketch-files.ts, project-api.ts), `projectUrl(slug, sketch.viewUrl)` (sketches-page.tsx), `projectUrl(slug, imageBytesUrl(` (image-page.tsx) all present.
