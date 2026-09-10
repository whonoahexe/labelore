---
phase: 04-portability-degradation-hardening
plan: 04
subsystem: ui
tags: [portability, degradation, empty-state, adversarial-testing, source-text-contract]

# Dependency graph
requires:
  - phase: 04-portability-degradation-hardening
    provides: "04-01's refresh seam (SC5 live probe), 04-02's InvalidProjectScreen (SC4 live probe), 04-03's artifactWarningTone()/Warning-Unreadable vocabulary (SC3 live probe) — this plan proves all three, plus D-06..D-09, against the real assembled app"
  - phase: 01-read-layer-domain-model
    provides: "The three fixture trees (sparse-empty, sparse-started, dense) and the Deliberate Defect Register this plan's adversarial suite mounts and corrupts further"
  - phase: 03-search-browsing-traceability
    provides: "LOCATION_ORDER and buildTreeViewModel's always-emit-every-group behavior, which the group-set invariant test pins against a future regression"
provides:
  - "EmptyState / EMPTY_STATE_MESSAGE (src/web/components/empty-state.tsx) — the single generic 'Nothing here yet.' empty state (D-06 through D-09), replacing bespoke absence copy at 8 call sites across roadmap-page.tsx, traceability-page.tsx, and artifact-page.tsx"
  - "test/portability.test.ts — the phase's adversarial proof: all three fixture shapes, a stripped copy, unknown artifact types, and the read-only guarantee, all driven through the real Hono app"
  - "test/web/empty-state-contract.test.ts — source-text pin of the one-string empty-state contract and its scope boundary"
  - "TGT-03, TGT-04, and TGT-05 closed — Phase 4's three portability requirements"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6400
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EmptyState({ variant }) is the one component every 'this optional content is absent' call site renders — variant='inline' matches the pre-existing .empty-note single-paragraph treatment, variant='block' matches the pre-existing .empty-flow icon+message treatment, both driven from the same EMPTY_STATE_MESSAGE constant so no call site re-types the string."
    - "Adversarial fixture testing runs the real server (createApp + LocalFsPlanningFilesystem + PlanningRepository), never a synthetic ProjectSnapshot literal — every mutation happens on an mkdtemp copy produced by a single mountFixture() helper, so the committed fixture corpus is provably unmodified after the suite runs."

key-files:
  created:
    - src/web/components/empty-state.tsx
    - test/portability.test.ts
    - test/web/empty-state-contract.test.ts
  modified:
    - src/web/pages/roadmap-page.tsx
    - src/web/pages/traceability-page.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css

key-decisions:
  - "EmptyState's 'block' variant reuses .empty-flow with a new data-tone='quiet' attribute rather than a new class, so the phase's one CSS correction (.empty-flow svg color: var(--muted-foreground)) scopes to exactly the generic empty state and leaves every other .empty-flow use (e.g. a future genuinely-different message) on its original accent-colored treatment."
  - "The tree.ts/tree-navigator.tsx empty-group branch (already rendering the exact target string) was left untouched per the plan's own instruction — Task 3's contract test pins byte-identity between EMPTY_STATE_MESSAGE and that pre-existing string instead of refactoring the file plan 04-03 owns."

patterns-established:
  - "A generic absence state is a single shared component keyed by one message constant, never a re-typed literal — any future 'this optional thing is missing' surface should import EmptyState rather than authoring its own copy."

requirements-completed: [TGT-03, TGT-04, TGT-05]

coverage:
  - id: D1
    description: "All three fixture shapes (sparse-empty, sparse-started, dense) render every route successfully with an ok load status (TGT-03 boundary)"
    requirement: "TGT-03"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#answers 200 with a parseable JSON body on every route for %s, with an ok load status (TGT-03 boundary)"
        status: pass
      - kind: other
        ref: "Live probe: curl against fixtures/dense on a production server — /, /api/presentation, /api/tree, /api/roadmap, /api/traceability, /api/search?q=phase all 200"
        status: pass
    human_judgment: false
  - id: D2
    description: "No served payload ever contains NaN or Infinity; every state.progress field is a finite number or null (TGT-03 precision)"
    requirement: "TGT-03"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#never serves NaN or Infinity, and every state.progress field is a finite number or null (TGT-03 precision)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Open-map config.json keys — including keys only one fixture declares — survive onto /api/presentation's config object unchanged (TGT-03 config toggles)"
    requirement: "TGT-03"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#carries every config.json key onto /api/presentation's config object unchanged, including a key only one fixture has (TGT-03 config toggles)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Unrecognized artifact types (a non-Markdown extension and an unrecognized Markdown filename) remain navigable in the tree and render through the generic document handler (TGT-05)"
    requirement: "TGT-05"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#keeps unrecognized artifact types navigable in the tree and readable through the generic handler (TGT-05)"
        status: pass
      - kind: other
        ref: "Live probe: GET /api/documents?route=... for .planning/v3.0-CAPACITY-PLAN.md returns 200 with a non-empty rendered document.html"
        status: pass
    human_judgment: false
  - id: D5
    description: "Removing quick/, milestones/, research/, UI-SPEC.md and SECURITY.md from a project still answers 200 on every route, keeps a group node per deleted location with zero children (D-06), never fabricates a placeholder file node for a deleted path (D-07), and leaves the phases that remain carrying their own artifacts (TGT-04)"
    requirement: "TGT-04"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#produces empty states, never an error page, when quick/, milestones/, research/, UI-SPEC.md and SECURITY.md are removed, leaving the rest untouched (TGT-04)"
        status: pass
      - kind: other
        ref: "Live probe against a stripped copy of fixtures/dense: all 7 routes 200; /api/tree groups report Archived Phases/Quick Tasks/Milestones/Research at 0 children, Phases still at 2"
        status: pass
    human_judgment: false
  - id: D6
    description: "/api/tree emits the exact LOCATION_ORDER group-key set exactly once each, whether or not a location has files, across every project shape (the accepted assumption-delta invariant)"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#emits the exact LOCATION_ORDER group-key set exactly once each, present or absent, across every shape (group-set invariant)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The committed fixture corpus is provably unmodified by the adversarial suite (safety prohibition, T-04-04-01)"
    verification:
      - kind: integration
        ref: "test/portability.test.ts#reads a fixture only through mountFixture, and leaves the committed dense fixture byte-identical on disk (read-only guarantee, T-04-04-01)"
        status: pass
      - kind: other
        ref: "git status --porcelain -- fixtures/ prints nothing after every test run in this plan, including the live-probe stripped copy built directly in the OS temp dir"
        status: pass
    human_judgment: false
  - id: D8
    description: "One shared EmptyState component and EMPTY_STATE_MESSAGE constant replace bespoke absence copy at every optional-content surface, without over-reaching into computed all-clear/filter-result states (D-06 through D-09)"
    verification:
      - kind: unit
        ref: "test/web/empty-state-contract.test.ts (8 cases) — byte-identity with tree-navigator.tsx's string, no re-typed literal at any of the three import sites, six former roadmap sentences gone, traceability's filter-result sentence intact, dashboard-page.tsx untouched, and the quiet-tone CSS rule scoped correctly"
        status: pass
    human_judgment: true
    rationale: "The source-text contract proves the component exists, is imported everywhere required, and that no bespoke copy or accent color reaches it — but the actual rendered appearance (no layout regression, genuinely quiet visual weight, correct spacing at each of the 8 call sites) is not asserted by a rendered-DOM or screenshot test in this v1 stack. This is exactly the UI-SPEC's own flagged backstop row (section-empty-state, overflow) — see the Human Verification section below."
  - id: D9
    description: "The end-of-phase human verification (roadmap SC1 through SC5) was walked with a per-item verdict, including an explicit verdict on the per-call-site backstop truth"
    verification: []
    human_judgment: true
    rationale: "This project runs human_verify_mode: end-of-phase, and this plan's Task 3 carries that check inline rather than as a separate checkpoint task. The executing agent has no browser/screenshot tool available in this session, so every item below was verified as far as HTTP/API/source-text evidence can reach (server responses, rendered document.html, tree/group shapes, refresh readAt advancement) but the genuinely visual claims — light/dark theme correctness, layout at each empty-state call site, mermaid rendering — are recorded as PENDING and require an actual human click-through before the phase closes. See Human Verification section for the full per-item breakdown."

duration: 45min
completed: 2026-09-04
status: complete
---

# Phase 4 Plan 4: Portability & Degradation Adversarial Proof Summary

**A single `EmptyState`/`EMPTY_STATE_MESSAGE` component replaces bespoke absence copy at 8 call sites (D-06 through D-09), and a new adversarial `test/portability.test.ts` drives the real Hono server against `sparse-empty`, `sparse-started`, `dense`, and a deliberately stripped copy of `dense` — closing TGT-03, TGT-04, and TGT-05 with 9 integration tests plus a live-probe walk of all five roadmap success criteria.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-04T04:35:00Z (approx.)
- **Completed:** 2026-09-04T05:15:00Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- `src/web/components/empty-state.tsx` — `EmptyState({ variant })` and `EMPTY_STATE_MESSAGE = 'Nothing here yet.'`, the D-08 single source of the generic-absence string. `variant="inline"` reuses `.empty-note`; `variant="block"` reuses `.empty-flow` under a new `data-tone="quiet"` attribute, scoping the D-09 neutral-icon correction to exactly this state.
- 8 call sites converted: 6 in `roadmap-page.tsx` (success criteria, requirements, plans, empty milestone, absent active milestone, empty history), 1 in `traceability-page.tsx` (no-requirements-in-snapshot, leaving the filter-result sentence untouched), 1 in `artifact-page.tsx` (the missing-metadata section, which previously rendered nothing at all).
- `globals.css` gained `.empty-flow[data-tone='quiet'] svg { color: var(--muted-foreground); }`, leaving the original `.quiet-state svg, .empty-flow svg { color: var(--primary); }` rule untouched for every other use.
- `test/portability.test.ts` (9 tests) — the phase's adversarial proof: `mountFixture()`/`serve()` drive the real `createApp()` against every ROUTES entry for all three fixtures plus a stripped `dense` copy, proving TGT-03's boundary and precision edges, TGT-03's open-map config pass-through, TGT-05's unknown-type navigability, TGT-04's honest-empty-state behavior (D-06/D-07), the `LOCATION_ORDER` group-set invariant, and the read-only guarantee (T-04-04-01) — all without ever mutating the committed fixture corpus.
- `test/web/empty-state-contract.test.ts` (8 tests) — pins the one-string contract: byte-identity with `tree-navigator.tsx`'s pre-existing string, import-not-retype at all three call sites, the six removed roadmap sentences, the intact traceability filter-result sentence, the untouched `dashboard-page.tsx`, and the scoped CSS.
- Live-probe walk of all five roadmap success criteria against a production build (`NODE_ENV=production node src/server/index.ts`), recorded in Human Verification below.

## Task Commits

Each task was committed atomically:

1. **Task 1: One generic empty state, everywhere absence is reported** - `291ee43` (feat)
2. **Task 2: Drive the real server adversarially against four project shapes** - `ae45d87` (test)
3. **Task 3: Pin the empty-state contract and close the phase** - `971d8c4` (test)

**Plan metadata:** commit to follow this SUMMARY.

## Files Created/Modified

- `src/web/components/empty-state.tsx` — new: `EmptyState`, `EMPTY_STATE_MESSAGE`
- `src/web/pages/roadmap-page.tsx` — 6 absence sites converted to `<EmptyState />`, `Waypoints` import removed (no longer used)
- `src/web/pages/traceability-page.tsx` — no-requirements branch converted, filter-result branch untouched
- `src/web/pages/artifact-page.tsx` — missing-metadata section now renders `<EmptyState />` instead of `null`
- `src/web/styles/globals.css` — new `.empty-flow[data-tone='quiet'] svg` rule
- `test/portability.test.ts` — new: 9 adversarial integration cases
- `test/web/empty-state-contract.test.ts` — new: 8 source-text contract cases

## Decisions Made

- `EmptyState`'s block variant reuses `.empty-flow` with a new `data-tone="quiet"` attribute rather than inventing a new class, keeping the D-09 neutral-icon correction scoped to exactly the generic empty state.
- `tree-navigator.tsx`'s own empty-group branch was left untouched (plan 04-03 owns that file); Task 3's contract test pins byte-identity between `EMPTY_STATE_MESSAGE` and that pre-existing string instead of refactoring it into a shared import.

## Deviations from Plan

None - plan executed exactly as written. (One test assertion in Task 2's config-toggle case was rewritten during authoring — the original "each fixture has a key the other lacks" phrasing didn't hold for `sparse-started`, whose config keys are a strict subset of `dense`'s — before ever being committed; not a deviation, just normal test-writing before the commit landed.)

## Issues Encountered

None. The executing agent has no browser/screenshot tool available in this session; the human-check portion of Task 3's verify was walked as far as HTTP/API/source-text evidence reaches and the remaining visual items are recorded as PENDING below rather than asserted without evidence.

## Human Verification

Task 3's `<verify>` carries a `<human-check>` walking the phase's five roadmap success criteria, ridden here per this project's `human_verify_mode: end-of-phase` rather than as a separate checkpoint task. Verified via a production build (`npm run build && NODE_ENV=production node src/server/index.ts <target> --port <N>`) plus `curl` against the API, since this session has no browser tool:

1. **Sparse and dense render as a complete, navigable dashboard; unrecognized artifact type opens and reads as plain markdown (roadmap SC1).**
   - **PASS (API-verified):** All 7 API routes return 200 with well-formed bodies for `sparse-started` and `dense` (both live-probed and covered by `test/portability.test.ts`'s boundary case). `.planning/v3.0-CAPACITY-PLAN.md` (unrecognized type) is present in `/api/tree` with a non-null `url`, and `GET /api/documents?route=...` returns 200 with non-empty rendered `document.html`.
   - **PENDING (visual):** Actual in-browser navigation and rendering was not confirmed by this agent.

2. **Stripped copy (quick/, milestones/, research/ removed) still shows each group with the generic empty state in the tree, every other view unchanged, no error page — including the per-call-site check across roadmap phase sections, roadmap history, traceability list, artifact-page metadata, and tree groups (roadmap SC2, D-06 through D-09, the backstop truth).**
   - **PASS (API-verified):** Live probe against a stripped copy of `dense` (quick/, milestones/, research/ deleted, all `*UI-SPEC.md`/`*SECURITY.md` deleted) returns 200 on all 7 routes; `/api/tree` shows `Archived Phases: 0`, `Quick Tasks: 0`, `Milestones: 0`, `Research: 0`, while `Phases: 2` (untouched) — confirmed by both the live probe and `test/portability.test.ts`'s TGT-04 case.
   - **PASS (source-text):** `test/web/empty-state-contract.test.ts` confirms all 8 call sites (6 roadmap, 1 traceability, 1 artifact-page) render `<EmptyState />` and no bespoke copy remains.
   - **PENDING (backstop truth, visual):** The plan's own `verification: backstop` truth requires confirming the message reads correctly *at each call site individually* in a rendered browser (no per-site layout regression) — this is explicitly not covered by a rendered-DOM test in this v1 stack and was not visually confirmed by this agent. **This is the one item in this plan most in need of an actual human pass before the phase closes.**

3. **Dense fixture's deliberately corrupted files show their warning badge/disclosure and recovered body; every other page renders normally (roadmap SC3).**
   - **PASS (API-verified):** `.planning/phases/02-transport-layer/02-01-PLAN.md` (tab-broken frontmatter) and `.planning/HANDOFF.json` both report `warningTone: "warning"` in `/api/tree`; `GET /api/documents?route=...` for the broken plan returns 200 with the `warnings[]` array populated (`stage: "frontmatter"`, `salvage: "body intact, frontmatter unavailable"`) and a recovered, non-empty `document.html`.
   - **PENDING (visual):** The actual badge/disclosure rendering (D-10/D-11, established in plan 04-03) was not re-confirmed visually by this agent — 04-03's own SUMMARY already flagged this as pending human click-through.

4. **Nonexistent path and directory-with-no-`.planning/` each show the failure screen naming the problem and the exact path checked, both copyable (roadmap SC4).**
   - **PASS (API-verified):** A directory with no `.planning/` returns `loadStatus.status: "not-a-gsd-project"` naming its own `pathChecked`. A nonexistent path returns `loadStatus.status: "path-not-found"` carrying both `rawPath` and `pathChecked` (identical here) and the exact `LOAD_STATUS_MESSAGES` string `InvalidProjectScreen` renders verbatim (established in plan 04-02).
   - **PENDING (visual):** The copy-to-clipboard affordance and screen layout were not re-confirmed visually — 04-02's own SUMMARY already flagged this as pending human click-through.

5. **Every view states when its data was read; Refresh updates that timestamp in place while the page stays readable (roadmap SC5).**
   - **PASS (API-verified):** `POST /api/refresh` against a running `dense` server returns `refreshed: true` with a strictly later `readAt` (`2026-09-03T23:43:57.414Z` → `2026-09-03T23:43:59.873Z`), and the next `GET /api/presentation` reflects the new value — matching plan 04-01's own refresh-seam proof.
   - **PENDING (visual):** The in-place status swap and "page stays readable" claim were not re-confirmed visually — 04-01's own SUMMARY already flagged this as pending human click-through.

**Net verdict:** every mechanically verifiable claim in all 5 success criteria passes (API responses, tree/group shapes, warning metadata, refresh timestamps, and the 17-test automated suite this plan adds). The genuinely visual claims — carried forward as pending from 04-01, 04-02, and 04-03, plus this plan's own item 2 backstop truth — are **not** independently confirmed by this agent, which has no browser tool in this session, and should be walked by a human in one pass (`npm run dev -- fixtures/dense`, then a directory with no `.planning/`) before the phase is considered fully closed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TGT-03, TGT-04, and TGT-05 are closed; combined with 04-01's TGT-08, 04-02's TGT-07, and 04-03's TGT-06, all six of Phase 4's mapped requirements now have automated coverage.
- The one outstanding action across the whole phase is a single human click-through session covering: refresh in place (04-01), the invalid-project screen for both failure kinds (04-02), a damaged-artifact badge/disclosure (04-03), and the stripped-copy empty-state backstop truth at all 5 call sites (this plan) — all in light and dark themes, per roadmap SC1 through SC5.
- No architectural changes or new infrastructure were introduced; Phase 4's own scope (hardening, not redesign) held throughout.

---
*Phase: 04-portability-degradation-hardening*
*Completed: 2026-09-04*

## Self-Check: PASSED

All key files (`src/web/components/empty-state.tsx`, `test/portability.test.ts`,
`test/web/empty-state-contract.test.ts`, `src/web/pages/roadmap-page.tsx`,
`src/web/pages/traceability-page.tsx`, `src/web/pages/artifact-page.tsx`,
`src/web/styles/globals.css`) confirmed present on disk. All three task commits (`291ee43`,
`ae45d87`, `971d8c4`) confirmed present in `git log`. Full suite re-run: 36 test files, 533 tests,
all passing. `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run build && npm run
smoke` all re-verified passing. `git status --porcelain -- fixtures/` confirmed empty after every
adversarial run in this plan, including the live-probe stripped copy built in the OS temp
directory.
