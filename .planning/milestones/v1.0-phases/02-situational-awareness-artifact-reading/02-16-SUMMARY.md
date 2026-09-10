---
phase: 02-situational-awareness-artifact-reading
plan: 16
subsystem: ui
tags: [react, css, accessibility, dashboard, coverage-matrix, gap-closure, tdd]

# Dependency graph
requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: "02-13's diagnosed gap table (G2-07..G2-10) and 02-14/02-15's presentation-layer corrections this plan builds on"
provides:
  - "A deterministic G2-07 attention-row destination matrix proving all six producer branches are correct, with an accessible-naming fix for the row's primary link"
  - "A visual-line-clamp policy bounding Next descriptions without truncating the underlying string"
  - "A single, conflict-free .plan-section-label muted-token contract and a corrected inferred-match status-chip tone"
affects: [02-17 UAT re-gate, dashboard, roadmap, plan-pair page]

# Actuals (#2632)
actuals:
  tokens: 6205
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Pure, side-effect-free provenance/destination functions (provenanceLabel, sourceDestination) live in the presentation module, not the page component, so contract tests can assert on them without importing JSX"
    - "Multi-line CSS clamp (-webkit-line-clamp + -webkit-box + overflow: hidden) bounds visual presentation while leaving the full string in the DOM/component"

key-files:
  created:
    - test/web/attention-row-contract.test.ts
  modified:
    - src/presentation/dashboard.ts
    - src/web/pages/dashboard-page.tsx
    - src/web/pages/plan-pair-page.tsx
    - src/web/styles/globals.css
    - test/web/visual-contract.test.ts

key-decisions:
  - "G2-07 was NOT reproduced as a routing/producer bug: the deterministic matrix proves all six attention branches (discrepancy, resolvable blocker, fallback blocker, dependency, checkpoint, coverage) already resolve the correct primary destination, and only blocker rows ever expose a second navigable link (provenance -> STATE.md). The implicated root was accessible labelling, not routing, so only an aria-label was added — no destination logic changed."
  - "Moved provenanceLabel/sourceDestination from dashboard-page.tsx into src/presentation/dashboard.ts as plain, JSX-free exports. This was required by the project's own test convention (no test imports a .tsx page component directly — tsconfig.server.json has no --jsx flag) and is a better home for pure presentation logic regardless."
  - "G2-09's fix is a subtractive one-line change: removed the later, conflicting .plan-section-label { color: var(--primary); } declaration rather than merging or reordering the two rule blocks, so the earlier var(--muted-foreground) declaration is the only color contributor for that property at any specificity tier."
  - "G2-10's fix reclassifies inferred coverage matches from the 'active' status-chip tone to 'quiet' — exact matches keep 'complete' (primary treatment); inferred matches are lower-confidence, not equally active, per the plan's explicit tone-assignment rule."

patterns-established:
  - "Attention/next-work provenance helpers (provenanceLabel, sourceDestination) are pure functions co-located with their DTOs in src/presentation/, exported for both the rendering page and direct unit tests."

requirements-completed: [DASH-01, DASH-02, DASH-03, UI-01, UI-02]

coverage:
  - id: D1
    description: "G2-07 attention-row destination matrix: every producer branch (discrepancy, resolvable blocker, fallback blocker, dependency, checkpoint, coverage) has an independently asserted primary destination; provenance destinations are only ever navigable for state/roadmap provenance (blocker rows) and never conflated with the primary route; the row's primary-action link now carries a distinct aria-label."
    requirement: DASH-02
    verification:
      - kind: unit
        ref: "test/web/attention-row-contract.test.ts (12 tests: destination matrix, provenance independence, round-trip, accessible naming)"
        status: pass
      - kind: unit
        ref: "test/presentation/dashboard.test.ts"
        status: pass
    human_judgment: true
    rationale: "The deterministic matrix proves routing is already correct and the aria-label change is source-verified, but whether the intermittent-destination perception is fully resolved for a real user still needs the 02-17 browser gate — this plan bounds and diagnoses the report, it does not claim final human sign-off."
  - id: D2
    description: "G2-08: primary Next descriptions clamp at three visual lines, preview descriptions at two, via -webkit-line-clamp with vertical box orientation and overflow containment; the complete authored description string is never truncated in the component."
    requirement: DASH-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts (G2-08 bounded Next descriptions — 3 tests)"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "CSS-source assertions prove the clamp declarations exist and the string is unmodified; actual rendered line count and readability at real viewport widths still need the 02-17 browser gate."
  - id: D3
    description: "G2-09: .plan-section-label resolves to one shared muted-foreground token at both nesting levels; removed the conflicting later color: var(--primary) declaration."
    requirement: UI-02
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts (G2-09 section-label token contract — 2 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "G2-10: status chips derive color from a documented semantic tone matrix — active/current and complete/exact keep the primary treatment, inferred coverage matches move to the quiet/muted treatment (previously shared 'active' with exact matches), and no call site uses an unrecognized or raw color tone."
    requirement: UI-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts (G2-10 status-chip semantic tone contract — 4 tests)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-01
status: complete
---

# Phase 02 Plan 16: G2-07..G2-10 Diagnosis and Root-Cause Corrections Summary

**G2-07 diagnosed as not-reproduced-by-matrix (accessible-naming fix only); G2-08 bounded with a visual line clamp; G2-09/G2-10 closed by removing a conflicting CSS cascade and reclassifying inferred-match chip tone.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-01T11:29:00Z (approx.)
- **Completed:** 2026-09-01T11:44:30Z
- **Tasks:** 3
- **Files modified:** 6 (1 test file created, 5 modified)

## Accomplishments

- Built a deterministic attention-row destination matrix (`test/web/attention-row-contract.test.ts`) naming all six producer branches (discrepancy, resolvable blocker, fallback blocker, dependency, checkpoint, coverage). The matrix reproduces GREEN — every primary destination is already correct — so G2-07 is recorded as "not reproduced by deterministic matrix," and the implicated root was accessible link-role labelling, not routing.
- Gave the attention row's primary-action link an explicit `aria-label` ("Open {type}: {title}") so it is unambiguous and distinct from the provenance SourceLink's "View {source} source" label, and moved `provenanceLabel`/`sourceDestination` into `src/presentation/dashboard.ts` as pure, JSX-free exports so both the page and the contract test share one implementation.
- Bounded G2-08's Next descriptions with a 3-line clamp on `.next-primary p` and a 2-line clamp on `.next-preview p` (`-webkit-line-clamp` + `-webkit-box` + `overflow: hidden`), verified the full description string is never truncated in the component.
- Closed G2-09 by removing the later, conflicting `.plan-section-label { color: var(--primary); }` declaration so both top-level and nested section labels resolve to the single `var(--muted-foreground)` token.
- Closed G2-10 by reclassifying inferred coverage matches from the `active` status-chip tone to `quiet` in `plan-pair-page.tsx` — exact matches keep the primary/`complete` treatment; inferred matches now read as lower-confidence.

## Task Commits

Each task was committed as RED then GREEN:

1. **Task 1 RED: G2-07 attention-row destination matrix** - `c7bfa35` (test)
2. **Task 1 GREEN: accessible naming for the primary attention link** - `d16a1e7` (fix)
3. **Task 2 RED: bounded Next description line clamp** - `c9f8cea` (test)
4. **Task 2 GREEN: Next description multi-line clamp** - `e6564c1` (fix)
5. **Task 3 RED: section-label/status-chip token diagnosis** - `5d27776` (test)
6. **Task 3 GREEN: normalized section-label and status-chip tokens** - `d588670` (fix)

## Files Created/Modified

- `test/web/attention-row-contract.test.ts` - Deterministic G2-07 destination matrix, provenance-independence, round-trip, and accessible-naming contracts.
- `src/presentation/dashboard.ts` - Exported pure `provenanceLabel`/`sourceDestination` functions (moved from the page component).
- `src/web/pages/dashboard-page.tsx` - Imports the moved functions; adds `aria-label` to the attention row's primary-action link.
- `src/web/pages/plan-pair-page.tsx` - Inferred coverage matches now use the `quiet` status-chip tone instead of `active`.
- `src/web/styles/globals.css` - `.next-primary p` / `.next-preview p` line-clamp policy; removed the conflicting later `.plan-section-label` color declaration.
- `test/web/visual-contract.test.ts` - G2-08 clamp contracts; G2-09 section-label diagnosis; G2-10 status-chip tone contracts.

## Decisions Made

See `key-decisions` in frontmatter.

## Deviations from Plan

None - plan executed exactly as written. The plan explicitly anticipated a "not reproduced by deterministic matrix" outcome for G2-07 as a valid result, and that is what the matrix found.

## Known Stubs

None.

## Issues Encountered

- Initial `test/web/attention-row-contract.test.ts` imported `provenanceLabel`/`sourceDestination` directly from `dashboard-page.tsx`. `npm run typecheck` failed (`TS6142: --jsx is not set`) because `tsconfig.server.json` (which covers `test/`) has no JSX config and no existing test in this codebase imports a `.tsx` page component directly — every other web-layer contract test reads source as text instead. Resolved by moving both functions into the JSX-free `src/presentation/dashboard.ts`, which is also a better architectural home for pure presentation logic and was already in this task's allowed file list.

## Verification

- Targeted suites: `test/presentation/dashboard.test.ts` + `test/web/attention-row-contract.test.ts` — 39/39 passed. `test/web/visual-contract.test.ts` — 30/30 passed.
- Full suite: 340/340 tests passed across 25 files.
- `npm run typecheck` and `npm run lint`: both clean.
- `npm run build`: succeeded (only the pre-existing advisory about chunks above 500 kB, unrelated to this change).
- All `<read_first>` paths across all three tasks confirmed tracked via `git ls-files --error-unmatch` before implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G2-07 is bounded: the destination matrix is deterministic and green for all six branches; the accessible-naming fix is ready for the 02-17 human browser gate to confirm the intermittent-destination perception is resolved.
- G2-08 has an accessible, testable clamp policy ready for the 02-17 gate to confirm the visual line count and readability at real viewport widths.
- G2-09 and G2-10 are closed by source-verified, theme-aware token contracts with no remaining conflicting cascade or raw color override.
- No ASVS L1 high-severity threat from this plan's threat register remains open: T-02-16-01 (tampering) and T-02-16-02 (spoofing) are addressed by the destination matrix and accessible-naming fix; T-02-16-03 (denial of service) is addressed by the visual clamp with complete semantic content retained; T-02-16-04 (information disclosure) was accepted per the plan's own disposition (synthetic fixtures only).
- Ready for the 02-17 UAT re-gate.

## Self-Check: PASSED

- All five modified/created implementation and test files exist on disk.
- All six RED/GREEN task commits exist in git history.
- All task acceptance criteria and the plan-level `<verification>` commands passed on the final tree (39/39 and 30/30 targeted, 340/340 full suite, typecheck/lint/build clean).
- Stub and skipped-test scans found no open items.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-09-01*
