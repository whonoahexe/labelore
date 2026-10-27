---
phase: 07-recognised-files-and-readable-urls
plan: 07
subsystem: web
tags: [routing, readable-urls, dispatcher, splat-route, plan-pair, breadcrumbs, nav-09, nav-10, react-router, vitest]
status: complete

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-04: Route union, parseRoutePath, buildUrl; 07-06: payload keys, MilestoneDto.overviewUrl/roadmapUrl, routeAliases, table-backed /api/documents"
provides:
  - "resolveProjectRoute(path, search, presentation): the one pure dispatcher from a slug-stripped raw pathname to page, overview, phase, plan-pair, document, redirect or not-found"
  - "A two-entry router ('/' and '/:project/*'); ProjectRouteSwitch renders the dispatcher's outcome and no web code reads the splat parameter"
  - "PlanPairPage on two addresses (the plan and its /summary); the tabs are links between them and Back walks them (D-05)"
  - "documentCrumbsOf(presentation, artifactPath, title): the shared document trail, milestone crumb to /<v>/overview (D-04)"
  - "DocumentRoute: the one entry point for an artifact key (07-09 adds the image and file-details branches)"
  - "presentationRoutePatterns holds only the six page paths"
affects: [07-08, 07-09, 07-10]

requirements-completed: [NAV-09, NAV-10]

actuals:
  tokens: 8330
  tasks: 3
  commits: 3
plan_head_before: acae7ef900cc88fbbdb307c93f5716461f46d901
plan_head_after: f673785b6f5be2d7c824e046075a38a643a98064

tech-stack:
  added: []
  patterns:
    - "Dispatch from the payload: an address is parsed once by the grammar, then the payload alone decides whether the thing exists, so an internal file, a bare folder and an unknown address share one not-found outcome"
    - "Redirect targets are payload values only (roadmapUrl, routeAliases) and must start with a single '/'; the slug is prefixed through withProjectSlug's guard"
    - "The page table (PAGES) in app-router.tsx maps the dispatcher's page names to lazy pages"

key-files:
  created:
    - src/web/route-dispatch.ts
    - src/web/pages/document-route.tsx
    - src/web/pages/document-crumbs.ts
    - test/web/route-dispatch.test.ts
    - test/web/document-crumbs.test.ts
  modified:
    - src/web/app-router.tsx
    - src/web/pages/plan-pair-page.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/components/pair-switch.tsx
    - src/web/views/summary-run.ts
    - src/web/views/plan-context.ts
    - src/presentation/routes.ts
    - test/web/project-routes-match.test.ts
    - test/web/sketches-page-contract.test.ts
    - test/web/build-splitting.test.ts
    - test/web/plan-context.test.ts
    - test/web/summary-run.test.ts
    - test/rendering/references.test.ts

key-decisions:
  - "A phase or plan address with no matching DTO still opens as a document when an artifact carries that key (an orphan summary, a plan-shaped file), and is not-found otherwise; the plan said not-found, but every artifact key must open a page"
  - "A redirect keeps the location hash (a roadmap deep link with a heading survives the alias hop); the search is not carried because no current address reads one"
  - "DocumentRoute is not keyed by url, matching the previous behaviour where one route object served every artifact address"

patterns-established:
  - "Pure dispatcher plus thin renderer: all address logic is testable over the committed Shapes and Lendshed payloads with no DOM"
  - "Views take links from payload keys (artifact.key, plan.key); builders are for pages that are not files (phases, milestones)"

coverage:
  - id: D1
    description: "Every artifact key and plan key in the Shapes and Lendshed payloads resolves to a document, a plan pair or (the live ROADMAP) the roadmap page; none is a miss"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#every address the Shapes payload emits opens a page: no artifact key and no plan key is a miss"
        status: pass
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#every address the Lendshed payload emits opens a page: no artifact key and no plan key is a miss"
        status: pass
    human_judgment: false
  - id: D2
    description: "The router has exactly two entries and the dispatcher reads the raw pathname; no web code reads the splat parameter"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/web/project-routes-match.test.ts#appRoutes has exactly two entries: the root redirect and one splat route under the project"
        status: pass
      - kind: unit
        ref: "git grep -nE \"useParams\\(\\)\\[|\\['\\*'\\]\" -- src/web prints nothing"
        status: pass
    human_judgment: false
  - id: D3
    description: "The plan pair opens on the Plan tab at the plan URL and the Summary tab at its /summary; the tabs are links and Back walks them"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#opens the plan pair on its two addresses (D-05)"
        status: pass
      - kind: e2e
        ref: "throwaway Playwright spec on the Lendshed server (click Summary, Back): Summary tab current at /v1.1/phase-1/plan-01/summary, Plan tab current after Back"
        status: pass
    human_judgment: false
  - id: D4
    description: "A bare milestone redirects to its roadmapUrl and a live alias to /roadmap, with history replace; every redirect target comes from the payload and starts with a single '/'"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#redirects a bare milestone to that milestone's roadmap (D-02)"
        status: pass
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#redirects the live milestone alias to the live roadmap (D-03)"
        status: pass
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#redirect targets that are not a project-relative path (T-07-17) turns %j into not-found"
        status: pass
    human_judgment: false
  - id: D5
    description: "An internal file, a bare folder, a missing phase or plan and a malformed address all render the same not-found page naming the address"
    requirement: NAV-10
    verification:
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#answers every miss with the one not-found outcome (D-11)"
        status: pass
      - kind: e2e
        ref: "throwaway Playwright spec: /file/state.json, /quick, /notes, /codebase, /v1.1/phase-99, /v1.1/phase-1/plan-77 each show the not-found heading and the typed address"
        status: pass
    human_judgment: false
  - id: D6
    description: "Document crumbs are Dashboard, Roadmap, the milestone (to its overview) and the phase when the file belongs to one, then the title; labels are unchanged"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/document-crumbs.test.ts#documentCrumbsOf"
        status: pass
    human_judgment: false
  - id: D7
    description: "Sibling links, plan dependency links and requirement previews read payload keys; presentationRoutePatterns holds only the six page paths"
    requirement: NAV-09
    verification:
      - kind: unit
        ref: "test/web/summary-run.test.ts#prefers the summary's own milestone file, then the root, then the archives newest first"
        status: pass
      - kind: unit
        ref: "test/web/plan-context.test.ts#resolves dependencies to titles, completion and in-app URLs"
        status: pass
      - kind: unit
        ref: "test/web/route-dispatch.test.ts#presentationRoutePatterns holds only the six page paths"
        status: pass
    human_judgment: false
  - id: D8
    description: "The address bar reads like the page and the back button skips redirected entries in a real browser on the repo's own project"
    requirement: NAV-09
    verification: []
    human_judgment: true
    rationale: "The plan's human-check (open the dev server on a Chromium machine and read the address bar by eye) is recorded for the end-of-phase walkthrough; the automated Playwright pass covers the same paths on the Lendshed fixture"

duration: 23min
completed: 2026-10-27
---

# Phase 7 Plan 07: Web on Readable URLs Summary

**One `/:project/*` route and one pure dispatcher (`resolveProjectRoute`) now decide every page from the raw pathname and the payload: the plan pair switches tabs by path, bare milestones and live aliases redirect silently, every miss (internal files included) is the same not-found page, and the last path-built web links read payload keys.**

## Performance

- **Duration:** about 23 min (06:19 to 06:42 UTC)
- **Tasks:** 3 (one tracer, two auto)
- **Files:** 18 changed across 3 commits (558 insertions, 131 deletions); 5 new files

## Accomplishments

- **Tracer (Task 1):** `route-dispatch.ts` parses the slug-stripped raw path with `parseRoutePath` and asks the payload: dashboard and the five pages; `/<v>/overview` as the milestone page; phase pages by `buildPhaseUrl(identity)`; the plan pair by `PlanDto.key` and `summary.key` (Plan or Summary tab); a bare milestone as a redirect to `roadmapUrl`; a live alias as a redirect to its target; a document only when an artifact carries that key. The router is now `/` and `/:project/*`; `ProjectGate` hands the open project's `ProjectRouteSwitch` to the shell, which renders the outcome from a `PAGES` table, `DocumentRoute`, a `<Navigate replace>` that prefixes the slug through `withProjectSlug` and keeps the hash, or `NotFoundPage` with the decoded typed address.
- **Plan pair (Task 2, moved forward):** `PlanPairPage({ planUrl, active })` loads by plan URL, its tabs are `planUrl` and the summary key, the `?doc=` logic and `useSearchParams` are gone.
- **Crumbs (Task 2):** `documentCrumbsOf` builds the trail from the payload (artifact -> `phaseKey` -> phase identity); `ArtifactPage` uses it with the same labels, and the milestone crumb now lands on `/<v>/overview`.
- **Keys (Task 3):** sibling artifact links, plan dependency links and requirement previews take `artifact.key` / `plan.key`; `buildArtifactUrl` has no caller left in `src/web`. `presentationRoutePatterns` shrank to the six page paths.

## Task Commits

1. **Task 1 (tracer): dispatch every readable address through one splat route** - `1d2604b`
2. **Task 2: share one document breadcrumb trail up to the milestone overview** - `ef16737`
3. **Task 3: read payload keys for the last path-built web links** - `f673785`

Tracer feedback gate: no `blocking-human` gate, auto mode off, `human_verify_mode` end-of-phase and the tracer's `<verify>` is automated only, so it was re-run end to end (56 passed, 0 skipped; typecheck clean) before expansion.

## Verification

- `npm run test:gate`: total=4131 passed=4131 failed=0 skipped=0 todo=0
- `npm run typecheck` exit 0; `npm run lint` exit 0
- `test/e2e-url-contract.test.ts`, `test/web/nav-contract.test.ts` and the ESLint nav rule stay green
- Acceptance greps: `src/web/route-dispatch.ts` exists; `path: '/:project/*'` appears once in `app-router.tsx`; no `useParams()[` or `['*']` in `src/web`; no `useSearchParams` in `plan-pair-page.tsx`; `documentCrumbsOf(` used in `artifact-page.tsx`; no `buildArtifactUrl(` in `src/web`
- Full Playwright suite: 148 passed, 4 failed, all four the known environment failures (two plan-page date assertions, the document-layout ARCHITECTURE.md assertion, the note-page flake). `summary-page` failed once on a two-popover race and passed on re-run (a timing flake, not URL related)
- A throwaway Playwright spec (deleted after the run) on the Lendshed server confirmed in a real browser: `/v1.0` lands on `/v1.0/roadmap`, `/v1.1/roadmap` and `/v1.1` land on `/roadmap`, `/v1.1/overview` and a phase page open, the plan pair tabs navigate between `/plan-01` and `/plan-01/summary` with Back walking them, a document crumb to the milestone lands on `/v1.1/overview`, and six miss addresses show the one not-found page naming the typed address

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PlanPairPage rewritten in Task 1, not Task 2**
- **Found during:** Task 1
- **Issue:** `ProjectRouteSwitch` passes `planUrl` and `active`, so `PlanPairPage` had to take them for Task 1's typecheck to pass.
- **Fix:** The whole path-tabbed rewrite (props, query key, tab links, `useSearchParams` removed) landed with Task 1, along with the `pair-switch.tsx` doc comment. Task 2 then held the crumbs.
- **Files modified:** src/web/pages/plan-pair-page.tsx, src/web/components/pair-switch.tsx
- **Commit:** 1d2604b

**2. [Rule 3 - Blocking] presentationRoutePatterns reduced in Task 1, not Task 3**
- **Found during:** Task 1
- **Issue:** `app-router.tsx` no longer used the five encoded patterns and `project-routes-match.test.ts` had to be rewritten for the two-entry router in the same task, so the reduction was done there; Task 3's pattern assertion (in `route-dispatch.test.ts`) already holds from Task 1 on.
- **Files modified:** src/presentation/routes.ts
- **Commit:** 1d2604b

**3. [Rule 3 - Blocking] test/rendering/references.test.ts pinned the old router text**
- **Found during:** Task 1
- **Issue:** It asserted `relative(presentationRoutePatterns.plan), element: <PlanPairPage />` and the artifact equivalent in `app-router.tsx`; the plan did not list the file.
- **Fix:** Expectation-level edit to the new `PlanPairPage` and `DocumentRoute` lines.
- **Commit:** 1d2604b

**4. [Rule 1 - Bug] A plan-shaped address with no matching plan was not-found even when a file carried it**
- **Found during:** Task 1, writing the every-key test
- **Issue:** The plan's rule ("plan -> else not-found") would reject an orphan summary or a plan-shaped file, contradicting the requirement that every artifact key opens a page.
- **Fix:** A phase or plan address with no DTO falls back to a document when an artifact carries that exact key; otherwise not-found.
- **Commit:** 1d2604b

**Total deviations:** 4 (3 blocking ordering or test-pin moves, 1 bug-rule adjustment). **Impact:** none on behaviour beyond the plan; the only addition outside the file list is one expectation edit in `references.test.ts`.

## Known Interim State

- Legacy encoded URLs (`/milestones/m~...`, `/artifacts/a~...`) and old `?doc=summary` links resolve to not-found for now; 07-08 adds their redirects (the dispatcher's `_search` parameter is reserved for that).
- `DocumentRoute` renders only `ArtifactPage`; 07-09 adds the image and file-details branches.
- The plan's human-check (dev server by eye on a Chromium machine) is left for the end-of-phase walkthrough; automated browser coverage is recorded above.

## Known Stubs

None.

## Threat Flags

None. T-07-17 (open redirect), T-07-18 (internal files answer the common not-found) and T-07-19 (raw-pathname parsing, no splat read) are mitigated and covered in `test/web/route-dispatch.test.ts`.

## Next Phase Readiness

Ready for 07-08 (legacy redirects): the dispatcher already returns not-found for `legacy` routes, with the extension point and reserved `_search` parameter in place.

## Self-Check: PASSED

- Created files exist: route-dispatch.ts, document-route.tsx, document-crumbs.ts, route-dispatch.test.ts, document-crumbs.test.ts.
- Commits 1d2604b, ef16737 and f673785 are ancestors of HEAD.
