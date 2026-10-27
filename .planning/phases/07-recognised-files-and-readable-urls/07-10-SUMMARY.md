---
phase: 07-recognised-files-and-readable-urls
plan: 10
subsystem: tests-and-dev-server
tags: [deep-links, hard-reload, playwright, chromium, vite, built-app, probe, nav-10]
status: complete

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-01: the Shapes fixture; 07-05: projectUrl/artifactUrl and the e2e URL contract; 07-07: the dispatcher, redirects and not-found page; 07-08: legacy redirects and legacy-urls.ts; 07-09: image page, File details card and the bytes route"
provides:
  - "test/e2e/deep-reload.spec.ts: 24 tests per server, each opened and hard-reloaded in Chromium on the 4197 development server and the 4196 built app"
  - "playwright.config.ts: the fail-loud 4197 Shapes development server and the 4196 server that runs npm run build and then npm start"
  - "test/server/deep-links.test.ts: every Shapes URL class answers the shell from the production app and the development server, plus the /api/* guard in both modes"
  - "test/helpers/deep-link-probe.mjs: the same checks against the real CLI as a child process, built or dev"
  - "A dev server whose Vite WebSocket shares the server's own HTTP server, so several dev servers can run side by side"
affects: []

requirements-completed: [NAV-10]

actuals:
  tokens: 9266
  tasks: 3
  commits: 4
plan_head_before: 01401855df34a9520d46c15e64a311fd306c1df2
plan_head_after: 9542dca8afe0f3194e048136b4e7b1b35a5768d1

tech-stack:
  added: []
  patterns:
    - "One test list registered once per server from data (SERVERS), with the per-server difference held only in script-src prefixes; nothing decides whether a test runs"
    - "Each browser leg proves the app it drove from the page's own script tags (built: /assets/ entry and nothing from /src/ or /@vite/; development: /src/ entry and nothing from /assets/)"
    - "The 4196 webServer command builds first, so the built leg can never drive a stale bundle"

key-files:
  created:
    - test/e2e/deep-reload.spec.ts
    - test/helpers/deep-link-probe.mjs
  modified:
    - playwright.config.ts
    - test/playwright-config.test.ts
    - test/e2e/fixture-root.ts
    - test/e2e/app-url.ts
    - test/e2e/fixture-server.ts
    - test/server/deep-links.test.ts
    - test/server/documents-route.test.ts
    - src/server/index.ts

key-decisions:
  - "Vite's WebSocket in the development server is attached to the server's own HTTP server (server.ws.server) instead of relying on server.hmr: false, which Vite 8 ignores"
  - "The 4197 and 4196 servers are unconditional (no optional server, no skipped spec), matching the 4198 fail-loud rule"
  - "The cached /api/presentation of a base URL is forgotten when a fixture server starts and stops, because every spec's fixture server reuses port 5310"

patterns-established:
  - "A browser spec that reloads watches pageerror and every script and stylesheet response of 400 or above, and asserts both lists are empty after the reload"

coverage:
  - id: E1
    description: "Every URL the Shapes payload emits, plus the awkward hand-written classes, answers 200 and the exact shell from the production app and 200 text/html with the root div from the development server; no URL is answered by an API route"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/server/deep-links.test.ts#Shapes: every URL in production / #Shapes: every URL on the development server"
        status: pass
    human_judgment: false
  - id: E2
    description: "The URL set holds every class (v1.1, phase-2.1, file/, %2F, %25, %23, %C3%BC, .png, .svg, .pdf, a trailing slash, a legacy link) and at least as many URLs as the payload has artifacts"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/server/deep-links.test.ts#the Shapes URL set holds every URL class and at least as many URLs as the payload has artifacts"
        status: pass
    human_judgment: false
  - id: E3
    description: "/api/* never falls through to the shell in either mode, and the PNG bytes route answers image/png for GET and HEAD"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/server/deep-links.test.ts#the /api/* guard (both modes)"
        status: pass
    human_judgment: false
  - id: E4
    description: "The built CLI serves the exact dist/index.html for all 72 URLs, loads every referenced /assets/ file, and answers a missing asset 404 without the shell"
    requirement: NAV-10
    verification:
      - kind: other
        ref: "node test/helpers/deep-link-probe.mjs built test/fixtures/shapes: deep-link-probe: mode=built urls=72 failed=0"
        status: pass
      - kind: other
        ref: "node test/helpers/deep-link-probe.mjs dev test/fixtures/shapes: deep-link-probe: mode=dev urls=72 failed=0"
        status: pass
    human_judgment: false
  - id: E5
    description: "In Chromium, on the 4197 development server and the 4196 built app, every URL class opens and hard-reloads onto the same right page and address; redirects land once and stay; misses name the address decoded once; the SVG script never runs; no page error and no failed script or stylesheet; each leg proves its mode"
    requirement: NAV-10
    verification:
      - kind: e2e
        ref: "test/e2e/deep-reload.spec.ts (48 tests, 24 per server)"
        status: pass
    human_judgment: false
  - id: E6
    description: "The Playwright config pins four servers on 4199, 4198, 4197 and 4196 in that order, none reusing a server, with the 4196 command building before it serves"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/playwright-config.test.ts#playwright.config.ts webServer shape"
        status: pass
    human_judgment: false
  - id: E7
    description: "The phase's visual and by-eye checks (address bar reading like the page, Back skipping redirected entries, old bookmarks opening silently, image page and card screenshots in light, dark and 390px) have been done by a person"
    requirement: NAV-10
    verification: []
    human_judgment: true
    rationale: "Recorded by 07-03, 07-07, 07-08 and 07-09 for the end-of-phase walkthrough; listed below. This plan's automated Chromium run covers the same addresses but cannot judge how they look."

duration: 78min
completed: 2026-10-27
---

# Phase 7 Plan 10: Deep reloads on the development server and the built app Summary

**Every readable URL of the made-up Shapes project, including dotted milestones, decimal phases, file/ URLs, encoded slash, percent and hash, unicode, trailing slashes, image and binary URLs, redirects and old encoded links, now has a standing test at three levels (in-process HTTP, the real CLI built and in dev, and Chromium open-and-hard-reload on both servers), and `/api/*` is proven never to fall through to the shell.**

## Accomplishments

1. **Task 1 (tracer): one dotted plan address reloaded end to end** - `ec84d5d`. The Playwright config gained the 4197 development server and the 4196 server (`npm run build && npm start -- <root> --port 4196`) on the Shapes fixture, the config test pins exactly four entries in order, and `deep-reload.spec.ts` opens `/shapes/v1.1/phase-2.1/plan-01`, asserts the Plan tab, hard-reloads, and asserts the same page and address with no page error. The tracer exposed a real bug (see Deviations).
2. **Task 2: every URL class over HTTP in both modes, the guard and the probe** - `7535482`. `deep-links.test.ts` builds the slug-prefixed URL set from the served payload (artifact keys, plan and summary keys, phase pages with and without a trailing slash, overview and roadmap URLs, bare milestones, route aliases, the hand-written classes, a legacy artifact and plan link, and the un-prefixed `/roadmap`), asserts the required classes and the size floor, and runs it through production (exact shell) and the in-process development server (text/html and the root div). The `/api/*` guard runs in both modes. `deep-link-probe.mjs` does the same against the real CLI (72 URLs), checks each `/assets/` file the shell references, a missing asset (404, not the shell), and `/api/not-real`.
3. **Task 3: every URL class in Chromium on both servers, and the full phase gate** - `211f24e`. 23 URL-class tests plus the SVG-script test per server (48 in all). Classes: decimal-phase plan (Plan tab) and its summary (Summary tab), project-coded phase file, archived v1.0 phase file, quick-task summary, a file/ URL, the percent, hash and unicode notes, a codebase document, /settings, phase page with and without a trailing slash, the milestone overview, the PNG and the SVG on the image page with a decoded image, the PDF on the File details card, the four redirects (`/v1.0`, `/v1.1`, `/v1.1/roadmap`, an old encoded link) asserted before and after the reload, and the two misses (`/notes/kiln%2Fcurve`, `/file/state.json`) naming the address decoded once. The SVG's inline-script window property (read from the fixture file) is undefined after load and after reload.
4. **Gate fixes found by the phase gate** - `9542dca` (see Deviations).

## Phase gate results

| Command | Result |
|---|---|
| `npm run test:gate` | `gate: total=4462 passed=4462 failed=0 skipped=0 todo=0` |
| `npm run typecheck` / `npm run lint` | exit 0 / exit 0 |
| `npm run build && node test/helpers/deep-link-probe.mjs built test/fixtures/shapes` | `deep-link-probe: mode=built urls=72 failed=0` |
| `node test/helpers/deep-link-probe.mjs dev test/fixtures/shapes` | `deep-link-probe: mode=dev urls=72 failed=0` |
| `git diff --exit-code -- test/__golden__` | exit 0 (unchanged) |
| `npx playwright test test/e2e/deep-reload.spec.ts` | final list-reporter line: `48 passed (1.3m)` |
| `npx playwright test` (four servers: 4199, 4198, 4197 development, 4196 built) | final list-reporter line: `200 passed (10.6m)` |

Chromium (`/opt/pw-browsers/chromium-1243`) launched for real in every run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vite 8 ignores `server.hmr: false`, so a second development server broke its own pages**
- **Found during:** Task 1 (the tracer, on the 4197 leg)
- **Issue:** `startServer` created Vite with `server: { middlewareMode: true, hmr: false }`. Vite 8 deprecated `server.hmr` in favour of `server.ws` and, in middleware mode, still opens its own WebSocket on the fixed port 24678 and points every page's `@vite/client` at it. With three development servers running (4199, 4198, 4197) the later two cannot bind 24678, their pages connect to the first server's socket with the wrong token, and the browser raises an uncaught `WebSocket closed without opened.` on every load. That violates this plan's "no uncaught page error on either server" truth.
- **Fix:** create the HTTP server first and give Vite `server: { middlewareMode: true, ws: { server } }`, so each instance's socket lives on its own port. Comment in `src/server/index.ts` explains why.
- **Files modified:** src/server/index.ts
- **Verification:** the tracer then passed on both servers; the in-process development-server tests and the dev probe pass; `npm run typecheck` exit 0.
- **Commit:** ec84d5d

**2. [Rule 3 - Blocking, pre-existing] The Playwright helper cached `/api/presentation` per base URL for the whole worker, so a spec whose fixture server reused port 5310 read the previous spec's project**
- **Found during:** Task 3 (full `npx playwright test`)
- **Issue:** `learnings-page`, `note-page` and `todo-page` each failed their first test with `No artifact <path> at http://127.0.0.1:5310`. Reproduced at the baseline commit 0140185 (`debug-page` then `learnings-page` in a fresh worktree fails the same way), so it is not caused by this plan; it blocks the plan's required green full run. Each failure restarts the worker, which is why only the first test of a spec failed.
- **Fix:** `app-url.ts` exports `forgetPresentation(base)`, and `fixture-server.ts` calls it when a server starts and when it stops.
- **Files modified:** test/e2e/app-url.ts, test/e2e/fixture-server.ts
- **Verification:** the three specs pass in the full run.
- **Commit:** 9542dca

**3. [Rule 3 - Blocking, pre-existing] `documents-route` "serves every text artifact" timed out at the default 5 s**
- **Found during:** Task 3 (`npm run test:gate`)
- **Issue:** the Lendshed case asks git for each file's added date (`git log --diff-filter=A --follow`) over the whole history. The orchestrator unshallowed the clone (1117 commits), so it now exceeds 5 s; it fails the same way at 0140185 and passes with a longer timeout.
- **Fix:** a 60 s timeout on that one test, with a comment on why (the same precedent as `dashboard-ledger.test.ts` and the development-server hook in `deep-links.test.ts`).
- **Files modified:** test/server/documents-route.test.ts
- **Verification:** `gate: total=4462 passed=4462 failed=0 skipped=0 todo=0`.
- **Commit:** 9542dca

**Total deviations:** 3 auto-fixed (1 bug in product code, 2 blocking issues in existing test infrastructure that predate this plan). **Impact:** the product change is limited to where the development server's HMR socket lives; no URL, route or page behaviour changed. One flake was seen and not fixed: the `todo-page` "closed todo with a resolution and two notes, light" test failed once in a full run on a layout measurement (`892.5` against `> 906.5`), passed alone, and passed in the next full run (`200 passed`). It is a timing-dependent assertion in a spec this plan does not touch.

## Human checks recorded for the end-of-phase walkthrough

None are blocking; each is a by-eye check an automated run cannot make.

- **07-03:** open `/` and confirm it lands on `/labelore`; the drawer, nav tabs and breadcrumbs keep the project prefix; `/someone-else/roadmap` shows the wrong-project page.
- **07-07:** open the development server on the repo's own project and read the address bar by eye; confirm it reads like the page and that Back skips redirected entries.
- **07-08:** open an old encoded bookmark; confirm the address bar switches to the readable URL with no notice, and that Back does not return to the old address.
- **07-09:** screenshots in light, dark and 390px of the image page, the File details cards (binary and large) and the drawer with a PNG, a PDF and text rows.

## Carry-forward

- **D-14:** `src/presentation/legacy-routes.ts` is to be deleted at v2.1 close. Deleting it removes the module, `test/presentation/legacy-routes.test.ts`, `test/helpers/legacy-urls.ts`, the isolation test, two branches in `route-dispatch.ts` and `UnprefixedLegacy` in `app-router.tsx`. Note that `test/e2e/deep-reload.spec.ts` and `test/server/deep-links.test.ts` now import `test/helpers/legacy-urls.ts`, so the old-link class (one test per server, and two URLs in the HTTP set) must be dropped with it.
- Every Playwright run now rebuilds `./dist` (the 4196 command), which adds a few seconds up front. A server started with `npm start` from this checkout serves the new bundle afterwards; a tab it opened before needs one reload.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: dev-websocket | src/server/index.ts | In development mode Vite's HMR WebSocket now upgrades on the dev server's own 127.0.0.1 HTTP server instead of a second listener on port 24678. Development mode only; production serves ./dist with no WebSocket. |

## Self-Check: PASSED

- Created files present: `test/e2e/deep-reload.spec.ts`, `test/helpers/deep-link-probe.mjs`.
- Commits present on this branch: ec84d5d, 7535482, 211f24e, 9542dca (`git rev-list --count 01401855..HEAD` is 4).
- Acceptance greps from the plan, the gate commands, both probe commands, `npm run typecheck`, `npm run lint`, the unchanged golden directory and both Playwright commands all exit 0 with the lines quoted above.
