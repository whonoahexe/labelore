---
phase: 03-search-browsing-traceability
plan: 04
subsystem: navigation
tags: [requirements-traceability, dual-status, react-router, tsconfig-project-split]

# Dependency graph
requires:
  - phase: 03-search-browsing-traceability
    provides: "03-01's ArtifactDto.location/LOCATION_ORDER and RequirementDto.coveringPhases shape; 03-03's buildTreeViewModel and the persistent sidebar's REQUIREMENTS.md leaf node"
provides:
  - "src/presentation/traceability.ts — buildTraceabilityViewModel(presentation), the requirement-to-covering-phase dual-status projection (never a merged verdict), category-grouped with a checkbox-bearing/deferred tier split"
  - "GET /api/traceability"
  - "presentationRoutePatterns.traceability ('/traceability') and the 'traceability' PresentationRoute member"
  - "src/web/pages/traceability-page.tsx — TraceabilityPage: category tables, two labelled status columns, Uncovered/Status mismatch/Unresolved markers, ID/text + status filters"
  - "src/web/pages/traceability-filter.ts — matchesTraceabilityFilter, the DOM-free filter predicate, its own testable seam"
  - "The root REQUIREMENTS.md sidebar leaf now resolves to /traceability instead of its generic artifact route"
  - "The third primary nav link (Dashboard, Roadmap, Traceability)"
affects: []

# Actuals (#2632)
actuals:
  tokens: 12044
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Web-logic extraction seam (roadmap-deep-link.ts precedent, now traceability-filter.ts): any pure function a .ts presentation test needs to import directly must live in a plain .ts sibling module, never inline in the consuming .tsx page — tsconfig.server.json (which typechecks test/**/*.ts) excludes src/web/** and sets no --jsx option, so importing a .tsx file's export fails TS6142."
    - "Tier split by parser signal, not literal tier string: 'actionable vs. deferred' is decided by requirement.checked !== null (the RequirementItem parser's own checkbox-presence signal), never by comparing REQUIREMENTS.md's tier heading text against a literal 'v1' — that heading is an open string across GSD projects (fixtures/dense's live tier is literally 'v3.0 Requirements')."

key-files:
  created:
    - src/presentation/traceability.ts
    - src/web/pages/traceability-page.tsx
    - src/web/pages/traceability-filter.ts
    - test/presentation/traceability.test.ts
  modified:
    - src/presentation/routes.ts
    - src/presentation/tree.ts
    - src/server/index.ts
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - test/presentation/routes.test.ts
    - test/presentation/tree.test.ts
    - test/server/deep-links.test.ts
    - test/web/visual-contract.test.ts

key-decisions:
  - "Both status signals (the requirement's own checkbox, the covering phase's own diskStatus/roadmapComplete) travel end to end as separate TraceabilityRow fields; statusDisagreement is a derived boolean used only to make a row findable by the filter, never a substitute value — a source grep for combinedStatus/mergedStatus/derivedStatus/effectiveStatus returns 0 lines, and this is the ASVS threat register's own T-03-04-04 mitigation."
  - "Disagreement is symmetric: a covering phase's own disk status (complete vs. not) is XOR'd against the requirement's own checked boolean, so both 'checked but phase incomplete' and 'unchecked but phase complete' surface — not only the single direction the plan's prose example names."
  - "Deviation (Rule 1 - bug): the actionable/deferred split uses requirement.checked !== null, not requirement.tier === 'v1' as the plan's prose literally states — REQUIREMENTS.md's tier heading is an open string (domain/model.ts's own comment), and fixtures/dense's live tier is 'v3.0 Requirements'. A literal 'v1' comparison would have silently emptied the main table on any project past its first milestone, directly violating TGT-03 ('renders a GSD project correctly regardless of ... milestone count'). Caught by this plan's own fixtures/dense partition test during Task 1's RED→GREEN cycle."
  - "Deviation (Rule 3 - blocking): extracted matchesTraceabilityFilter/TraceabilityFilterState/DEFAULT_TRACEABILITY_FILTER out of traceability-page.tsx into a new plain-.ts sibling (traceability-filter.ts), mirroring roadmap-deep-link.ts's established precedent. Importing them directly from the .tsx page inside test/presentation/traceability.test.ts (typechecked under tsconfig.server.json, which excludes src/web/** and sets no --jsx) failed with TS6142. The page still re-exports both names, so 'exported from the page' holds at the API-surface level exactly as the plan's acceptance criterion names."
  - "A covering phase's link href is built via buildPhaseUrl(phase.identity) — the same route builder every other presentation view uses — never a hand-assembled string from the raw Traceability-table text (T-03-04-02)."

patterns-established:
  - "Symmetric disagreement check as a same-shape boolean XOR, rather than a one-directional 'checked but not complete' special case — keeps the future reverse-direction case (phase says complete, requirement unchecked) covered by construction rather than as an afterthought."

requirements-completed: [NAV-05]

coverage:
  - id: D1
    description: "Every v1/actionable requirement is joined to the state of the phase(s) covering it, with the requirement's own claimed status and each covering phase's own diskStatus/roadmapComplete carried as separate fields — a disagreement between them is flagged (statusDisagreement) but never merged into one verdict."
    requirement: "NAV-05"
    verification:
      - kind: unit
        ref: "test/presentation/traceability.test.ts — buildTraceabilityViewModel Tests 1-8 (dual-status + disagreement flag, uncovered rows present in-group not omitted, dangling-reference marking, two-covering-phase independence, first-appearance category order, checkbox-presence tier split, empty-input no-throw, a fixtures/dense partition proof over the real requirement set)"
        status: pass
      - kind: integration
        ref: "GET /api/traceability against fixtures/dense (node src/server/index.ts fixtures/dense --port 4314) returns HTTP 200 with a non-empty groups array and a deferredRows array"
        status: pass
    human_judgment: false
  - id: D2
    description: "The root REQUIREMENTS.md node in the sidebar tree lands on /traceability; every other root document (including the archived milestone's own REQUIREMENTS.md) keeps its ordinary artifact route."
    requirement: "NAV-05"
    verification:
      - kind: unit
        ref: "test/presentation/tree.test.ts — Task 2 Test 1 (root override + archived-file exemption + every other root doc unaffected), Task 2 Test 2 (no-REQUIREMENTS.md project throws nothing), and the updated Test 6 exemption"
        status: pass
    human_judgment: false
  - id: D3
    description: "The traceability view is reachable from its own nav item (Dashboard, Roadmap, Traceability) and renders one category table per REQUIREMENTS.md subsection, in source order, with a filterable ID/text search plus Uncovered and Status mismatch status filters whose counts come from the projection, never a component recount."
    requirement: "NAV-05"
    verification:
      - kind: unit
        ref: "test/presentation/traceability.test.ts — matchesTraceabilityFilter Tests 1-5 (ID/text match, uncovered isolation, disagreement isolation without mutating either status value, fully-filtered-category exclusion, projection-sourced counts)"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts — destructive status-chip tone references --destructive not a literal colour; filter-button resting vs. active[data-active='true'] treatment; .trace-filters/.trace-status-filters declared; no ?filter=/searchParams; exact Uncovered/Status mismatch/Unresolved chip labels"
        status: pass
      - kind: integration
        ref: "npm run build && npm run typecheck && npm run lint (clean except the pre-existing, out-of-scope no-regex-spaces pair) && npx vitest run (470/470)"
        status: pass
    human_judgment: true
    rationale: "Whether the two status columns read as unambiguous at a glance, whether the table's horizontal scroll keeps them visually adjacent on a narrow window, whether the Uncovered/Status mismatch/Unresolved markers are legible in both themes, and whether the no-REQUIREMENTS.md/sparse-category empty state reads acceptably are all perceptual judgments no automated test can assert. This is Task 2's own <human-check> block plus the traceability-view empty-state backstop truth (03-UI-SPEC.md's Phase 4/TGT-04 boundary), deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase."

duration: 15min
completed: 2026-09-02
status: complete
---

# Phase 3 Plan 4: Requirements Traceability View Summary

**A server-side dual-status projection (`buildTraceabilityViewModel`) joining every requirement to its covering phase's own state — never merged into one verdict — served at `GET /api/traceability` and rendered as a filterable, category-grouped `/traceability` route.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 14 (4 created, 10 modified)

## Accomplishments

- `src/presentation/traceability.ts`: `buildTraceabilityViewModel(presentation)` — joins each
  requirement to `presentation.milestones[].phases[]` via `RequirementDto.coveringPhases[].targetPhaseKey`,
  producing `TraceabilityRow.requirementStatus` (the checkbox) and, per covering phase,
  `phaseDiskStatus`/`phaseRoadmapComplete` (the phase's own state) as permanently separate fields.
  `statusDisagreement` is a symmetric XOR between the requirement's own claim and any resolved
  covering phase's disk-complete state — findable by the filter, never a replacement value. A
  dangling reference (`targetPhaseKey: null`, non-empty `raw`) is marked `resolved: false` with no
  `url`, never a link. Groups by `REQUIREMENTS.md`'s verbatim category text in first-appearance
  order; splits actionable (checkbox-bearing) vs. deferred requirements by `checked !== null` rather
  than a literal `tier === 'v1'` comparison (see Deviations).
- `GET /api/traceability` — mirrors the existing `/api/roadmap` handler shape; verified end-to-end
  against `fixtures/dense`: HTTP 200, non-empty `groups`, present `deferredRows`.
- `presentationRoutePatterns.traceability` (`/traceability`) and the `'traceability'`
  `PresentationRoute` member, round-tripped through `parsePresentationUrl` and the production
  deep-link matrix.
- `src/web/pages/traceability-page.tsx`: `TraceabilityPage` — one table per category (reusing the
  existing `.coverage-table-boundary` scroll wrapper, never a new one), two explicitly-headed status
  columns, a resolved covering phase rendered as a `Link` while an unresolved one renders as raw
  text beside an `Unresolved` marker, deferred requirements in their own labelled section below the
  grouped tables, and an ID/text filter plus `Uncovered`/`Status mismatch` status filters whose
  counts read from the projection's own `counts` object.
- `src/web/pages/traceability-filter.ts`: `matchesTraceabilityFilter` extracted to a DOM-free
  sibling module (see Deviations) so it stays unit-testable without pulling React/JSX into the
  server-side test project.
- `src/presentation/tree.ts`: the root `.planning/REQUIREMENTS.md` sidebar leaf now resolves to
  `presentationRoutePatterns.traceability`; the archived milestone's own `REQUIREMENTS.md` and every
  other root document are unaffected.
- `src/web/components/app-shell.tsx` / `app-router.tsx`: the third primary nav link (Dashboard,
  Roadmap, Traceability) and the page's route registration.

## Task Commits

Each task followed the RED → GREEN TDD cycle:

1. **Task 1: The dual-status traceability projection**
   - `d66e4ec` (test) — failing tests for `buildTraceabilityViewModel`, the route round-trip, and
     the deep-link matrix entry
   - `9e0a074` (feat) — the projection, the route, `GET /api/traceability`
2. **Task 2: The traceability route, its nav item, and its sidebar entry point**
   - `ee473c6` (test) — failing tests pinning the root `REQUIREMENTS.md` override
   - `294fe10` (feat) — `TraceabilityPage`, the sidebar override, the nav link, the route
     registration, and the CSS these surfaces need
3. **Task 3: Filters and the disagreement signal**
   - `25474fa` (test) — failing tests importing the not-yet-existing `traceability-filter.ts`
     module, plus the marker/filter `ruleBlocks` CSS assertions
   - `ccfaa3b` (feat) — the `traceability-filter.ts` extraction that makes the import (and the
     server-side typecheck project) resolve

**Plan metadata:** this commit — `docs(03-04): complete requirements traceability view plan`

_Note on TDD sequencing: Task 3's filter UI and disagreement markers were implemented ahead of
schedule inside Task 2's commit (`294fe10`) — the page component was built as one coherent unit.
Rather than fabricate a RED state by deleting working code, Task 3's RED commit targets the one
piece of work genuinely not yet done at that point: extracting the predicate into a DOM-free module
so `test/presentation/traceability.test.ts` (typechecked under `tsconfig.server.json`, which has no
`--jsx` option) can import it. That extraction is Task 3's real GREEN — verified as a true failing
→ passing pair (`Cannot find module` → clean typecheck), not a re-verification of pre-existing
behavior. Full detail in the "TDD Gate Compliance" section below._

## Files Created/Modified

- `src/presentation/traceability.ts` - `TraceabilityCoveringPhase`, `TraceabilityRow`,
  `TraceabilityGroup`, `TraceabilityCounts`, `TraceabilityViewModel`, `buildTraceabilityViewModel`
- `src/web/pages/traceability-page.tsx` - `TraceabilityPage`
- `src/web/pages/traceability-filter.ts` - `matchesTraceabilityFilter`, `TraceabilityFilterState`,
  `TraceabilityStatusFilter`, `DEFAULT_TRACEABILITY_FILTER`
- `test/presentation/traceability.test.ts` - New file: projection tests (8) + filter predicate
  tests (5)
- `src/presentation/routes.ts` - `presentationRoutePatterns.traceability`, `'traceability'`
  `PresentationRoute` member, `parsePresentationUrl` branch
- `src/presentation/tree.ts` - Root `REQUIREMENTS.md` leaf override to the traceability route
- `src/server/index.ts` - `GET /api/traceability`
- `src/web/app-router.tsx` - Route registration
- `src/web/components/app-shell.tsx` - Third primary nav link
- `src/web/styles/globals.css` - Filter row, status-filter buttons, category/deferred section
  spacing, `.status-chip[data-tone='destructive']`, covering-phase list/entry, dangling-text rules
- `test/presentation/routes.test.ts` - `/traceability` round-trip test
- `test/presentation/tree.test.ts` - Root override tests, exemption on the pre-existing "every leaf
  url is the artifact DTO key" test
- `test/server/deep-links.test.ts` - `/traceability` added to the production deep-link URL matrix
- `test/web/visual-contract.test.ts` - Marker/filter `ruleBlocks` CSS assertions

## Decisions Made

See `key-decisions` in frontmatter — symmetric disagreement XOR, the checkbox-presence tier split
(a Rule 1 fix over the plan's literal `tier === 'v1'` prose), the `traceability-filter.ts`
extraction (a Rule 3 fix over the plan's literal "exported from `traceability-page.tsx`" prose,
satisfied at the re-export boundary), and the route-builder-only link-target rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tier split changed from literal `tier === 'v1'` to `checked !== null`**
- **Found during:** Task 1, my own fixtures/dense partition test (`GET /api/traceability` returning
  an empty `groups` array against a real project)
- **Issue:** The plan's prose says "anything whose tier is not v1 goes to deferredRows." Implemented
  literally, this hard-codes the string `'v1'`. `REQUIREMENTS.md`'s tier heading is an open string
  across GSD projects — `domain/model.ts`'s own comment on `Requirement.tier` says so explicitly —
  and `fixtures/dense`'s live/actionable tier heading is literally `"v3.0 Requirements"` (its
  deferred tier is `"v4.0 Requirements"`). A literal `'v1'` comparison silently emptied the entire
  main table against that fixture, which would reproduce on any real GSD project past its first
  milestone — a direct TGT-03 regression ("Dashboard renders a GSD project correctly regardless of
  ... milestone count").
- **Fix:** Split on `requirement.checked === null` instead — the same signal
  `handlers/requirements.ts`'s own parser already uses to distinguish an actionable (checkbox-
  bearing) item from a v2/future (checkbox-less) one, and the reason the plan's "no permanently
  blank rows" goal exists in the first place.
- **Files modified:** `src/presentation/traceability.ts`, `test/presentation/traceability.test.ts`
- **Verification:** `test/presentation/traceability.test.ts` Test 8 (fixtures/dense partition proof)
  and the live server smoke check both confirm every requirement lands in exactly one bucket.
- **Committed in:** `9e0a074` (Task 1 GREEN commit)

**2. [Rule 3 - Blocking] Extracted the filter predicate to a DOM-free sibling module**
- **Found during:** Task 3, `npm run typecheck`
- **Issue:** `matchesTraceabilityFilter` was originally defined inline in
  `traceability-page.tsx`. `test/presentation/traceability.test.ts` (which the plan's own acceptance
  criteria requires import it directly) is typechecked under `tsconfig.server.json`, which excludes
  `src/web/**` and sets no `--jsx` compiler option. Importing any symbol from a `.tsx` file — even a
  pure re-export — still requires TypeScript to parse that file as JSX, so the import failed with
  `TS6142: ... but '--jsx' is not set`.
- **Fix:** Extracted `matchesTraceabilityFilter`, `TraceabilityFilterState`,
  `TraceabilityStatusFilter`, and `DEFAULT_TRACEABILITY_FILTER` into a new plain-`.ts` module
  (`src/web/pages/traceability-filter.ts`), mirroring the codebase's own established precedent
  (`roadmap-deep-link.ts`, used identically by `roadmap-page.tsx` and
  `test/web/roadmap-deep-link.test.ts`). `traceability-page.tsx` imports and re-exports the same
  names, so they remain reachable directly from the page module as the plan's acceptance criterion
  names, while the test imports from the DOM-free module.
- **Files modified:** `src/web/pages/traceability-filter.ts` (new),
  `src/web/pages/traceability-page.tsx`, `test/presentation/traceability.test.ts`
- **Verification:** `npm run typecheck` clean across both `tsconfig.server.json` and
  `tsconfig.web.json`; full suite 470/470.
- **Committed in:** `ccfaa3b` (Task 3 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking). **Impact on plan:** Both were necessary for
correctness (Rule 1 fix prevents a cross-project regression the plan's own dense fixture would have
otherwise silently hidden) and for the plan's own stated gate (`npm run typecheck` clean, Rule 3
fix). No scope creep — no production behavior beyond what the plan specifies.

## TDD Gate Compliance

All three tasks carry a `test(03-04): ...` commit immediately followed by a `feat(03-04): ...`
commit (`git log --oneline` confirms the RED→GREEN pairing for each). Task 3 is the one worth
calling out explicitly: because its filter/marker implementation was already built inside Task 2's
commit, its own RED commit (`25474fa`) could not exercise genuinely new *behavior* — instead it
pinned a genuinely-failing *module resolution* (`test/presentation/traceability.test.ts` importing
a not-yet-existing `src/web/pages/traceability-filter.ts`), confirmed failing via both
`npm run typecheck` (`TS2307: Cannot find module`) and `npx vitest run`
(`Error: Cannot find module ... imported from ...`) before the GREEN commit (`ccfaa3b`) created that
module. This is a real, verified fail→pass transition, not a restated pass. No gate was skipped or
faked.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `buildTraceabilityViewModel`, `GET /api/traceability`, `presentationRoutePatterns.traceability`,
  and the `traceability-filter.ts` DOM-free-module extraction pattern are all available for any
  later phase that needs requirement-to-phase joins or another testable web-logic seam.
- Full suite green at **470/470** (up from the 446/446 baseline — 24 new tests: 15 projection/filter
  unit tests, 2 root-override tree tests, 1 route round-trip, 1 deep-link matrix entry, 5 visual
  ruleBlocks assertions); `npm run build` succeeds; `npm run typecheck` clean across both
  `tsconfig.server.json` and `tsconfig.web.json`; `npm run lint` clean except the pre-existing,
  out-of-scope `test/web/visual-contract.test.ts` `no-regex-spaces` pair already logged in
  `deferred-items.md`/`WINDOWS.md` by plan 03-01 (untouched by this plan).
- One human-judgment item remains for end-of-phase UAT (coverage `D3`, Task 2's own `<human-check>`
  block plus the traceability-view empty-state backstop truth): the two status columns'
  at-a-glance legibility, the horizontal-scroll/column-adjacency behavior on a narrow window, the
  Uncovered/Status mismatch/Unresolved markers' legibility in both light and dark themes, and
  whether a no-`REQUIREMENTS.md`/sparse-category project's empty state reads acceptably — none of
  which an automated test can assert perceptually.
- This is the last plan in Phase 3 (Wave 4 of 4) — with `9e0a074`'s partition-test catch of the
  tier-split bug, the phase now has a working, cross-project-portable requirements traceability
  view backing NAV-05.

---
*Phase: 03-search-browsing-traceability*
*Completed: 2026-09-02*

## Self-Check: PASSED
