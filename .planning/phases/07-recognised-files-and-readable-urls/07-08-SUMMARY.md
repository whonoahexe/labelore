---
phase: 07-recognised-files-and-readable-urls
plan: 08
subsystem: web
tags: [routing, legacy-redirects, readable-urls, nav-10, nav-11, d-12, d-13, d-14, react-router, vitest]
status: complete

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-07: resolveProjectRoute with a reserved search parameter and a redirect outcome; 07-06: payload keys, overviewUrl, roadmapUrl"
provides:
  - "resolveLegacyTarget(route, search, presentation): an old m~/p~/a~ route to the readable URL of the payload item it names, or null"
  - "legacyQueryRedirect(route, search, presentation): a new-form plan address carrying ?doc=summary to its /summary path"
  - "resolveUnprefixedAddress / resolveUnprefixedRoute: /roadmap, /search?q=..., /traceability, /research, /sketches and the old encoded shapes typed without the project slug"
  - "ProjectGate sends an un-prefixed old page word or legacy first segment to the redirect instead of the wrong-project page"
  - "test/helpers/legacy-urls.ts and a standing isolation scan (one importer, no moved-link copy, redirect branches render only Navigate)"
affects: [07-09, 07-10]

requirements-completed: [NAV-11, NAV-10]

actuals:
  tokens: 14500
  tasks: 3
  commits: 3
plan_head_before: 4fc6d962e5f48f45d89246a98c3584410c06e7f5
plan_head_after: ce5bb805e04ea25f5fed5ce09d083bd399df9b2b

tech-stack:
  added: []
  patterns:
    - "Every redirect target passes safeTarget: one leading '/', never '//' or '/\\', and it must parse as a non-legacy route, so no open redirect and no loop"
    - "Legacy resolution reads only payload data (artifact keys, plan keys, phase identities, milestone overview URLs); a miss is null and the caller shows the normal not-found page"
    - "The legacy module is the only file that knows the encoded shapes; route-dispatch.ts is its only importer"

key-files:
  created:
    - test/helpers/legacy-urls.ts
    - test/web/legacy-isolation.test.ts
  modified:
    - src/presentation/legacy-routes.ts
    - src/web/route-dispatch.ts
    - src/web/app-router.tsx
    - src/presentation/identity-keys.ts
    - src/presentation/routes.ts
    - test/presentation/legacy-routes.test.ts
    - test/web/route-dispatch.test.ts

key-decisions:
  - "A legacy milestone/phase key with a null version (`current`, `p~n~...`) resolves against the live milestone: the one with no version, else the first not archived"
  - "A new-form plan address with ?doc=summary but no summary is left alone (the plan page opens); only a plan with a summary redirects"
  - "Redirects build one string target (slug prefix, own query kept, old #heading appended when the target has none) instead of a pathname/hash object, so an un-prefixed /search?q=kiln keeps its query"

patterns-established:
  - "Deleting the legacy module at v2.1 close removes legacy-routes.ts, its test, test/helpers/legacy-urls.ts, the isolation test, and two branches in route-dispatch.ts plus UnprefixedLegacy in app-router.tsx"

coverage:
  - id: D1
    description: "For every artifact (both old forms), milestone, phase and plan (with and without doc=summary) of the Shapes and Lendshed payloads, the old URL redirects to exactly that item's current URL"
    requirement: NAV-11
    verification:
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#every legacy shape and query (NAV-11, D-12, D-13) over the Shapes payload / Lendshed payload"
        status: pass
    human_judgment: false
  - id: D2
    description: "An old link that resolves to no file, phase or plan is not-found, never a parent page; no redirect target is legacy or redirects again"
    requirement: NAV-11
    verification:
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#answers an old link to nothing with not-found, never a parent page"
        status: pass
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#never redirects to a legacy address or to another redirect"
        status: pass
    human_judgment: false
  - id: D3
    description: "Un-prefixed old pages keep their query and old encoded shapes resolve as their slug-prefixed forms do"
    requirement: NAV-11
    verification:
      - kind: unit
        ref: "test/presentation/legacy-routes.test.ts#resolveUnprefixedAddress (NAV-11)"
        status: pass
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#resolveUnprefixedRoute (NAV-11)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Redirect targets are single-slash, non-legacy paths from the payload (T-07-20)"
    requirement: NAV-11
    verification:
      - kind: unit
        ref: "test/presentation/legacy-routes.test.ts#refuses a target that is not a single-slash, non-legacy path (T-07-20)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The legacy module has one importer and the redirect renders no notice, banner or toast"
    requirement: NAV-11
    verification:
      - kind: unit
        ref: "test/web/legacy-isolation.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "An old bookmark opens in a real browser, the address bar switches to the readable URL with no notice, and Back does not return to the old address"
    requirement: NAV-11
    verification: []
    human_judgment: true
    rationale: "The plan's human-check needs a Chromium-capable machine; it is recorded for the end-of-phase walkthrough. history-replace is the existing Navigate replace used by the 07-07 redirects."

duration: 25min
completed: 2026-10-27
---

# Phase 7 Plan 08: Legacy Redirects Summary

**Old `/milestones/m~...`, `/artifacts/a~...` links, `?doc=summary` and un-prefixed pages like `/roadmap` and `/search?q=...` now land silently, with history replace, on their readable URL through one deletable module; anything that resolves to nothing gets the normal not-found page naming the old address.**

## Accomplishments

- **Tracer (Task 1):** `resolveLegacyTarget` maps a decoded artifact path to the payload artifact's key through `safeTarget`; the dispatcher turns a legacy route into a redirect or not-found. Redirects build one string target and keep the old `#heading`. Re-run end to end before expansion (42 passed, typecheck clean).
- **All shapes (Task 2):** milestone to `overviewUrl` (`current` to the live milestone), phase to `buildPhaseUrl` of the matching payload phase (project code, `comparePhaseNumbers` 0, slug), plan to its `PlanDto.key` or summary key with `doc=summary`, artifact (phase-scoped or not) to its key. `legacyQueryRedirect` handles the new-form `?doc=summary`. `resolveUnprefixedAddress`/`resolveUnprefixedRoute` plus `ProjectGate`'s `UnprefixedLegacy` handle address typed without a slug; while the payload loads the shell shows Reading snapshot, on a failed payload only the shell notice shows.
- **Property test (Task 2):** over Shapes and Lendshed, every artifact (both forms), milestone, phase and plan (with and without `doc=summary`) redirects to its current URL, and no target is legacy or redirects again.
- **Isolation scan (Task 3):** exact importer allowlist (`route-dispatch.ts`), no moved-link wording under `src/web`, redirect branches of `app-router.tsx` render only a `Navigate`; planted controls in a mkdtemp folder.

## Task Commits

1. **Task 1 (tracer): redirect an old artifact link to its readable URL** - `39bf760`
2. **Task 2: redirect every legacy shape, doc=summary and un-prefixed page** - `356619a`
3. **Task 3: scan that the legacy module has one importer and no moved-link copy** - `ce5bb80`

Tracer feedback gate: no `blocking-human` gate and the tracer's `<verify>` is automated only, so it was re-run end to end before expansion.

## Verification

- `npm run typecheck` exit 0; `npm run lint` exit 0
- `git grep -ln "legacy-routes" -- src` lists only `src/web/route-dispatch.ts`
- `npm run test:gate`: total=4165, 4164 passed, 1 failed on every full run: `test/server/documents-route.test.ts` "serves every text artifact ... Lendshed" times out at the 5000ms default (3.8s alone, with the machine's load average near 8 from the parallel 07-09 executor). That file passes 21/21 alone and touches no code from this plan. One earlier full run also failed two timing tests in `test/server/remote-source.test.ts`, which did not recur. Skipped=0, todo=0.
- Playwright was not run (test policy: gate, typecheck and lint at the end).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Comments in two src files named `legacy-routes`**
- **Found during:** Task 3
- **Issue:** The acceptance check `git grep -ln "legacy-routes" -- src` must list only `route-dispatch.ts`, but comments in `identity-keys.ts` and `routes.ts` named the file.
- **Fix:** Reworded the three comments to say "the legacy module". Comment-only change.
- **Files modified:** src/presentation/identity-keys.ts, src/presentation/routes.ts
- **Commit:** ce5bb80

**2. [Rule 1 - Bug] The "moved to" scan matched unrelated todo wording**
- **Found during:** Task 3
- **Issue:** `src/web/views/todo-lifecycle.ts` says "Moved to todos/completed/" about a todo file filed away, not a link, so the plan's phrase list tripped on it.
- **Fix:** An exact reviewed allowlist (file and phrase) in the isolation test, so a new moved-link phrase or a stale entry still fails.
- **Commit:** ce5bb80

**3. [Rule 3 - Blocking, environment] Fixture-leak test read the node_modules symlink**
- **Issue:** The worktree's `node_modules` symlink is untracked and not matched by the dir-only ignore pattern, so `test/fixture-leak.test.ts` tried to read it as a file (EISDIR).
- **Fix:** Replaced the symlink with a real `node_modules` directory of per-package symlinks (ignored by the dir pattern). Nothing committed.

**Total deviations:** 3. **Impact:** none on behaviour; two comment/test-allowlist adjustments and one worktree-environment fix.

## Known Stubs

None.

## Threat Flags

None. T-07-20 (open redirect: `safeTarget`, payload-only targets, slug through `withProjectSlug`), T-07-21 (loop: a target never parses as legacy and never redirects again, property-tested) and T-07-22 (an internal file has no payload artifact, so its old token is not-found) are mitigated and tested.

## Known Interim State

- The plan's human-check (open an old bookmark in Chromium, confirm no notice and that Back skips the old address) is left for the end-of-phase walkthrough.

## Self-Check: PASSED

- Created files exist: test/helpers/legacy-urls.ts, test/web/legacy-isolation.test.ts; modified legacy-routes.ts, route-dispatch.ts, app-router.tsx.
- Commits 39bf760, 356619a and ce5bb80 are ancestors of HEAD.
