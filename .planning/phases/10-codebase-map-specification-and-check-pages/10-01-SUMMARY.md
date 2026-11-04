---
phase: 10-codebase-map-specification-and-check-pages
plan: 01
subsystem: navigation
tags: [target-path, route-dispatch, app-shell, playwright, screenshots, codebase-map]

requires:
  - phase: 08-multi-project
    provides: "resolveTargetPath as the one project resolver (no second parser), Unavailable chip and reason for an unreachable project"
  - phase: 07-navigation
    provides: "resolveProjectRoute and redirectTo, payload artifact keys as the only source of addresses"
provides:
  - "CODEBASE_MAP_FILES (seven names in page order) and FAST_MAP_FILES, a no-import leaf"
  - "hasProjectMarker admits a .planning holding at least one recognised map document"
  - "projectMapState(artifacts) -> { present, mapOnly }, a leaf for the shell and router"
  - "Dashboard address opens the first present map document for a map-only project"
  - "Bare /codebase redirect (first present document, dashboard address when map-only, not-found with no map)"
  - "Roadmap and Traceability tabs hidden for a map-only project"
  - "test/helpers/shoot-pages.ts, the screenshot helper every later build plan uses"
affects: [10-08, 10-10, 10-23, every Phase 10 view build that is screenshot-checked beside its sketch]

actuals:
  tokens: 9540
  tasks: 3
  commits: 3
plan_head_before: 64e575eb5be8997896d8289c51d2121e43d1ab50
plan_head_after: 31e78681fc4f898a784ad8cec30fb5beddfc86ac

tech-stack:
  added: []
  patterns:
    - "Derived project state (mapOnly) computed from the artifact list, never stored"
    - "A redirect or first-screen target is always a payload artifact key, passed through redirectTo"

key-files:
  created:
    - src/planning-repo/codebase-files.ts
    - src/presentation/project-map-state.ts
    - test/presentation/project-map-state.test.ts
    - test/helpers/shoot-pages.ts
  modified:
    - src/planning-repo/folders.ts
    - src/cli/target-path.ts
    - src/web/route-dispatch.ts
    - src/web/components/app-shell.tsx
    - test/target-path.test.ts
    - test/web/route-dispatch.test.ts
    - test/web/navbar-contract.test.ts

key-decisions:
  - "No second parser: the one resolver's marker set is widened (PROJECT.md, STATE.md or one recognised map document as a file) instead of adding a project kind"
  - "mapOnly is derived by projectMapState from the artifact list, so a project that gains a roadmap simply stops being map-only"
  - "The map-only first screen is the document outcome of the first present map document at the dashboard address; no GET /codebase endpoint and no lazy MappedNotStartedPage chunk"
  - "No Codebase header tab (C6); bare /codebase is a redirect-only address (C7)"
  - "The screenshot helper starts at port 4191, not 4190: 4190 is on the fetch standard's blocked-port list"

patterns-established:
  - "Screenshot check: node test/helpers/shoot-pages.ts --root <folder> --out <folder> --name <prefix> --address <addr> --sketch <index.html>"

requirements-completed: [TGT-09]

duration: 50min
completed: 2026-11-04
status: complete
---

# Phase 10 Plan 01: Map-only project tracer Summary

**A project holding only a codebase map now opens from its project or `.planning` path through the one resolver, hides the Roadmap and Traceability tabs, and lands on its first map document; a screenshot helper photographs pages and sketch winners for every later plan.**

## Performance

- **Duration:** about 50 min
- **Tasks:** 3 of 3
- **Files:** 4 created, 7 modified

## Accomplishments

- `resolveTargetPath` accepts a `.planning` path whose `codebase/` holds at least one of the seven recognised documents as a file. An empty `codebase/`, a lone `notes.md` and a directory named `STACK.md` all keep `not-a-gsd-project`. `target-path.ts` still imports no `node:fs`.
- `projectMapState` reports `present` (page order) and `mapOnly` (a map document, no `.planning/ROADMAP.md`, nothing at location phase or archived-phase; a PROJECT.md, a CHANGELOG-*.md or a ui-reviews/ file does not stop it).
- `route-dispatch.ts`: for a map-only project the dashboard address returns the document outcome of the first present map document (key from the payload, falling back to the dashboard page without a key). A bare `/codebase` redirects to the first present document in a normal project, to the dashboard address in a map-only project, and stays not-found with no map. Both go through `redirectTo`.
- `app-shell.tsx` wraps the Roadmap and Traceability NavLinks in a `mapOnly` gate; while the presentation loads `mapOnly` is false so a normal project's header does not flicker. The project layout already renders only after the payload resolves, so no router change was needed for the loading and error cases.
- `test/helpers/shoot-pages.ts` serves the built dist on an isolated settings directory, drives system Chrome (new headless) at 1280x800 and 390x844 in light and dark, and prints `FAIL ...` and exits 1 for an error status, a page error, other than one h1, or sideways scroll at 390px. It shoots sketch winners (README `winner:` matched against `data-variant` tabs, all tabs when none match).
- Verified in a real browser on a scratch map-only project: the dashboard address shows the Stack document, the header holds only Dashboard, no sideways scroll at 390px; 8 PNGs and no FAIL line.

## Task Commits

1. **Task 1: map-only project opens through the one resolver** - `53fc6f7` (feat)
2. **Task 2: map-only first screen, tabs hidden, /codebase redirect** - `891b9cd` (feat)
3. **Task 3: screenshot helper** - `31e7868` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Screenshot helper port range excludes 4190**
- **Found during:** Task 3
- **Issue:** The plan names ports 4190-4194. Port 4190 is on the fetch standard's blocked-port list (ManageSieve), so Node's `fetch` (the server's own startup check and the helper's readiness poll) fails with "fetch failed" and Chrome would refuse it with ERR_UNSAFE_PORT. The helper never saw the server become ready.
- **Fix:** The range is 4191-4194, with a comment saying why.
- **Files modified:** test/helpers/shoot-pages.ts
- **Commit:** 31e7868

**2. [Rule 3 - Blocking] Existing test pinned `/codebase` as not-found**
- **Found during:** Task 2
- **Issue:** `route-dispatch.test.ts` listed `/codebase` among not-found misses over the Shapes payload; C7 deliberately turns it into a redirect there.
- **Fix:** Removed it from the miss list; the new `/codebase` cases assert the redirect, the map-only redirect and the no-map not-found.
- **Commit:** 891b9cd

### Instruction conflicts resolved in favour of the orchestrator

- The plan's `npm run build && systemctl --user restart labelore` steps were not run for the service: the dispatch prompt forbids restarting the labelore service from a worktree. `npm run build` ran and passed in the worktree. The orchestrator should restart the service after merge.
- STATE.md and ROADMAP.md were not touched (orchestrator-owned in worktree mode).

### Environment

- The worktree had no `node_modules`; a directory of symlinks to the main checkout's `node_modules` was created (a symlinked directory itself shows as untracked to `test/fixture-leak.test.ts`). No package was installed; it is gitignored and uncommitted.

## Deferred Issues

Pre-existing, outside this plan's files, not fixed. A full `npm run test:gate` run shows 4 failures in 3 corpus-guard files that walk the planning documents:

- `test/web/pattern-map-corpus.test.ts` and `test/web/ui-spec-corpus.test.ts` need pinned entries for the new Phase 10 `10-PATTERNS.md` and `10-UI-SPEC.md` (and `ui-spec-corpus` "pins every file it walks").
- `test/web/uat-session-corpus.test.ts` fails on `09-UAT.md`'s pinned counts.

These guard planning documents that this plan did not change. The Phase 10 pins most likely belong to a plan that owns those corpora; flagging for the orchestrator.

Also noticed, not in scope: the document page's breadcrumb for a map document reads "Dashboard / Roadmap / Stack". The designed Codebase page (10-08) should replace it.

## Known Stubs

None.

## Threat Flags

None. The new filesystem touch is `statPathSync` on seven fixed names under the canonicalised `.planning` folder (T-10-01); no write path was added (T-10-03). The helper binds only 127.0.0.1 ports 4191-4194 and always stops its server (T-10-15). One side effect worth knowing: the user's `tailnet-expose` watcher mirrors any loopback listener in 3000-9999 onto the Tailscale IP, so a helper run briefly exposes its server on the tailnet until the watcher notices it is gone.

## Issues Encountered

None beyond the deviations above.

## Verification

- `npm run test:gate -- test/target-path.test.ts test/portability.test.ts test/recognition-kinds.test.ts`: 72 passed, 0 skipped
- `node src/cli/snapshot.ts <scratch>/.planning`: `status: ok` (baseline `not-a-gsd-project`)
- `npm run test:gate -- test/presentation/project-map-state.test.ts test/web/route-dispatch.test.ts test/web/navbar-contract.test.ts test/web/build-splitting.test.ts test/web/fallback.test.ts`: 145 passed, 0 skipped
- `npm run typecheck`, `npm run lint`, `npm run build`: exit 0
- `npm run test:gate -- test/no-skips.test.ts test/fixture-leak.test.ts`: 46 passed
- `node test/helpers/shoot-pages.ts ... --address / --address /codebase`: 8 PNGs, exit 0; sketch mode also checked on sketch 003 (variant A2 selected from its README winner)
- Full suite: 5410 of 5414 pass; the 4 failures are the deferred corpus guards above

## Self-Check: PASSED

All 4 created files exist; commits 53fc6f7, 891b9cd and 31e7868 are ancestors of HEAD.
