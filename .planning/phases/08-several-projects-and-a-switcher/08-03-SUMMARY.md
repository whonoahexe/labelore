---
phase: 08-several-projects-and-a-switcher
plan: 03
subsystem: api
tags: [hono, request-guard, dns-rebinding, csrf, host-allowlist, sec-fetch-site, body-limit]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "createRegistryApp with the reserved first-registration slot (08-01)"
provides:
  - "createRequestGuard: a Host allowlist on every /api request, same-origin proof plus a JSON content type on every mutation"
  - "HostPolicy / createHostPolicy / parseAllowedHosts: loopback on the listening port plus the opt-in LABELORE_ALLOWED_HOSTS"
  - "A 4096-byte body limit on /api/* answering 413 with the too-large copy"
  - "RegistryAppOptions.policy (required); the guard and body limit are the first registrations on /api/*"
  - "test/helpers/guarded-request.ts: TEST_PORT, testPolicy, guardedHeaders, guardedRequest"
  - "A refusal test built from registryApp.routes, so a route added later is covered or fails the suite"
affects: [08-06, 08-07, 08-15, 08-16]

actuals:
  tokens: 9400
  tasks: 2
  commits: 2
plan_head_before: ac60b7cbbe07c08d3d02213c7c59f759280354b9
plan_head_after: ad7a845570850c252bef730f2cd3eb32d5d8117f

tech-stack:
  added: []
  patterns:
    - "Host check first, Origin compared only with a Host that already passed the allowlist, never with c.req.url"
    - "Sec-Fetch-Site, when present, decides alone; Origin host equality is the fallback only when it is absent"
    - "Refusal tests enumerate app.routes and assert every route ran every check"

key-files:
  created:
    - src/server/request-guard.ts
    - test/helpers/guarded-request.ts
    - test/server/request-guard.test.ts
  modified:
    - src/server/registry-api.ts
    - test/server/registry-api.test.ts
    - test/server/refresh.test.ts

key-decisions:
  - "createRegistryApp's options argument is now required because policy is; the legacy createApp wrapper stays guard-free"
  - "ALL routes on a concrete path (the images-only /files route) are real routes and are tested as GET and POST; only ALL routes on a wildcard path (middleware, the /api 404) are skipped"
  - "A present but non-same-origin Sec-Fetch-Site is refused even when Origin names the Host (the header is authoritative)"

patterns-established:
  - "Registry-app tests build requests with guardedRequest and a testPolicy() listening on TEST_PORT"
  - "A new route needs no test edit: the refusal table is derived from registryApp.routes and checks every entry"

requirements-completed: [SEC-05]

coverage:
  - id: D1
    description: "Every /api request whose Host is not 127.0.0.1:<port>, localhost:<port> or an exact LABELORE_ALLOWED_HOSTS entry answers 403 before any route runs, GETs and HEADs included; every request is refused until the port is set"
    requirement: SEC-05
    verification:
      - kind: unit
        ref: "test/server/request-guard.test.ts#the Host allowlist"
        status: pass
      - kind: integration
        ref: "test/server/registry-api.test.ts#the request guard in front of the registry app"
        status: pass
    human_judgment: false
  - id: D2
    description: "A mutating /api request needs Sec-Fetch-Site same-origin or, when that header is absent, an Origin host equal to Host; absent proof, Origin null, same-site and cross-site are 403; a non-JSON content type is 415"
    requirement: SEC-05
    verification:
      - kind: unit
        ref: "test/server/request-guard.test.ts#a mutating request"
        status: pass
    human_judgment: false
  - id: D3
    description: "LABELORE_ALLOWED_HOSTS is exact, case-insensitive, empty by default, and drops entries with whitespace, slash, @ or *"
    requirement: SEC-05
    verification:
      - kind: unit
        ref: "test/server/request-guard.test.ts#LABELORE_ALLOWED_HOSTS"
        status: pass
    human_judgment: false
  - id: D4
    description: "A refused request changes nothing: no source is created, refresh is not called, the project list is unchanged; the refusal table covers every registered /api route"
    requirement: SEC-05
    verification:
      - kind: integration
        ref: "test/server/registry-api.test.ts#the refusal table over every registered /api route"
        status: pass
      - kind: integration
        ref: "test/server/refresh.test.ts#answers 403 and never calls refresh() on the registry app"
        status: pass
    human_judgment: false
  - id: D5
    description: "No /api/projects response carries Access-Control-Allow-Origin, and a body above 4096 bytes answers 413 with the too-large copy"
    requirement: SEC-05
    verification:
      - kind: integration
        ref: "test/server/registry-api.test.ts#the refusal table over every registered /api route"
        status: pass
      - kind: unit
        ref: "test/server/request-guard.test.ts#what a refusal and an answer carry"
        status: pass
    human_judgment: false
  - id: D6
    description: "Browsers send Sec-Fetch-Site to 127.0.0.1 and localhost (research A1)"
    requirement: SEC-05
    verification: []
    human_judgment: true
    rationale: "A browser behaviour no unit test asserts; the Origin-host fallback covers a browser that omits the header, and 08-15 proves the chosen path in Chromium."

duration: 14 min
completed: 2026-10-30
status: complete
---

# Phase 8 Plan 03: The request guard in front of every /api route Summary

**A Host allowlist on every /api request plus same-origin and JSON proof on every mutation now sits first in the registry app, with a refusal test generated from the registered routes so no later endpoint can ship unguarded.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-10-30T10:33:00Z (approximate)
- **Completed:** 2026-10-30T10:44:00Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `request-guard.ts`: `createHostPolicy` refuses everything until `setPort`, then allows exactly `127.0.0.1:<port>`, `localhost:<port>` and the opt-in `LABELORE_ALLOWED_HOSTS` entries; `createRequestGuard` checks Host on every method, then same-origin and `application/json` on every non-GET, non-HEAD request. No Access-Control header is ever set.
- `registry-api.ts` registers the guard and a 4096-byte `bodyLimit` as its first two registrations on `/api/*`, ahead of every route and the `/api` 404. A foreign Host answers 403 `{ error: 'refused', reason: 'host' }` and loads no project.
- The refusal table is built from `registryApp.routes`: for each route a foreign Host is 403, each mutation without proof, with Origin null, cross-site, or same-origin text/plain is refused, and afterwards no source was created, refresh never ran and the list is unchanged. A positive control proves the right headers reach every route.
- The refresh cross-site test moved to the registry app (and now also asserts the D-18 tightening: no proof at all is 403), so 08-06 can delete the in-handler check without touching `refresh.test.ts`.

## Task Commits

1. **Task 1: A foreign Host is refused before any route of the registry app runs** - `51a81ae` (feat, tracer)
2. **Task 2: The guard matrices and a refusal test over every registered route** - `ad7a845` (test)

The tracer gate ran after Task 1: the registry suite (10 tests), the whole `test/server` folder (430 tests), both typecheck configs and eslint were re-run end to end, passed, and expansion continued.

## Files Created/Modified

- `src/server/request-guard.ts` - HostPolicy, createHostPolicy, parseAllowedHosts, createRequestGuard, GUARD_BODY_LIMIT
- `src/server/registry-api.ts` - `policy` option; guard and body limit registered first on `/api/*`
- `test/helpers/guarded-request.ts` - TEST_PORT, testPolicy, guardedHeaders, guardedRequest
- `test/server/request-guard.test.ts` - Host, allowed-hosts, same-origin, content-type and body-limit matrices over a toy app
- `test/server/registry-api.test.ts` - existing requests moved to guardedRequest; route-enumeration refusal table
- `test/server/refresh.test.ts` - cross-site and no-proof refusal on the registry app; the legacy-wrapper test re-titled

## Decisions Made

See `key-decisions`. The test helper also exports `testPolicy()` (not in the plan's export list) so each suite builds a listening policy in one call; the plan's required exports are all present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] The plan's route filter would skip a reachable route**
- **Found during:** Task 2
- **Issue:** The plan filters `app.routes` to `method !== 'ALL'` on the premise that only middleware and the 404 fallback register as ALL. The images-only `/api/projects/:slug/files` route is registered with `api.all('/files', ...)`, so it shows as `ALL /api/projects/:slug/files` and would have been excluded from the refusal table, leaving a real route unproven.
- **Fix:** The table skips only ALL routes on a wildcard path (middleware, the 404 fallback) and tests an ALL route on a concrete path as both a GET and a POST. A test asserts the table includes the known routes so an over-eager filter cannot pass an empty table.
- **Files modified:** test/server/registry-api.test.ts
- **Verification:** `test/server/registry-api.test.ts` passes (15 tests)
- **Committed in:** ad7a845

**2. [Rule 3 - Blocking] The gate command cannot run in this worktree**
- **Found during:** Task 1
- **Issue:** `npm run test:gate` spawns `<repo>/node_modules/.bin/vitest`, and the worktree has no node_modules (and a symlink must not be left behind: it breaks `fixture-leak.test.ts`).
- **Fix:** Ran `/home/user/labelore/node_modules/.bin/{vitest,tsc,eslint}` directly, as instructed for this phase. Results: `test/server` 462 passed / 0 failed, full suite 4544 passed with only the three known corpus-guard failures, `tsc` for both configs and `eslint .` exit 0. The gate's skipped and todo counts were not printed by that path; vitest reported no skipped or todo tests.
- **Files modified:** none
- **Committed in:** n/a

---

**Total deviations:** 2 (1 missing-critical test coverage, 1 blocking environment)
**Impact on plan:** None on scope. The first closes a gap in the plan's own enumeration rule.

## Issues Encountered

- Three tests fail with and without this plan (`test/web/pattern-map-corpus.test.ts`, `test/web/ui-spec-corpus.test.ts`: no pinned entry for 08-PATTERNS.md / 08-UI-SPEC.md). Already logged by 08-01; untouched here.

## Known Stubs

None.

## Threat Flags

None. The guard adds no endpoint; `LABELORE_ALLOWED_HOSTS` is the one new environment input and is already in the plan's threat model (T-08-08).

## User Setup Required

None. `LABELORE_ALLOWED_HOSTS` is optional and empty by default.

## Next Phase Readiness

- 08-06 must call `policy.setPort(port)` after `listen()` when it switches `startServer` to `createRegistryApp(registry, { policy: createHostPolicy() })`; until the port is set every `/api` request is refused. It may then delete the in-handler Sec-Fetch-Site check in `project-api.ts`: `refresh.test.ts` no longer depends on it except the legacy-wrapper absent-header test, which passes either way.
- 08-16 and 08-07 add routes with no test edits: the refusal table picks them up from `registryApp.routes`. A new route with an unusual parameter name is turned into a URL by a generic `:name` -> `x` replacement.
- 08-15 should prove in Chromium whether Sec-Fetch-Site or the Origin fallback decides (research A1).

## Self-Check: PASSED

All created files exist on disk (`request-guard.ts`, `guarded-request.ts`, `request-guard.test.ts`), both task commits (`51a81ae`, `ad7a845`) are ancestors of HEAD, acceptance greps hold (`app.use('/api/*', createRequestGuard` count 1, `hono/csrf` absent from `src`, `LABELORE_ALLOWED_HOSTS` present in `request-guard.ts`), `tsc` for both configs and `eslint .` exit 0, and the full suite shows only the three pre-existing corpus-guard failures.

---
*Phase: 08-several-projects-and-a-switcher*
*Completed: 2026-10-30*
