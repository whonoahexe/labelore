---
phase: 02-situational-awareness-artifact-reading
plan: 14
subsystem: ui
tags: [react, css, base-ui, mermaid, responsive-layout, tdd]

requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: "02-13 measured G2-01, G2-02, G2-04, G2-05, and G2-06 against the post-wave-9 UI"
provides:
  - "Non-recursive PLAN section chrome, horizontally ruled striped table families, and content-column attention provenance"
  - "A fixed Base UI Positioner that owns reference-preview geometry and stacking above the sticky shell"
  - "Token-themed, proportionally bounded Mermaid output with a committed browser-parse fallback fixture"
affects: [02-17 UAT re-gate, artifact reader, dashboard, reference navigation]

actuals:
  tokens: 3749
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Geometry owner owns stacking: Base UI Positioner carries the z-index while Popup carries visual chrome only"
    - "Rendered Mermaid SVG follows root CSS variables so light/dark changes need no second renderer instance"

key-files:
  created:
    - .planning/phases/02-situational-awareness-artifact-reading/02-14-SUMMARY.md
  modified:
    - src/web/styles/globals.css
    - src/web/components/reference-preview.tsx
    - src/web/pages/artifact-page.tsx
    - test/web/visual-contract.test.ts
    - test/rendering/references.test.ts
    - fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md
    - test/__golden__/dense.json

key-decisions:
  - "Preserved the functional code/table overflow boundary while removing only recursive PLAN-section separators and horizontal inset."
  - "Kept one Mermaid initialization and used token-backed CSS overrides for subsequent theme changes."
  - "Used a renderer-recognized `flowchart TD` with an unterminated node as the committed browser-parse rejection branch."

patterns-established:
  - "Top-level plan sections own one separator; nested plan sections explicitly reset the separator and inline padding."
  - "Coverage and artifact tables share bottom-only cell rules and the same even-row muted token."

requirements-completed: [UI-01, READ-01, READ-06, NAV-02, NAV-03, DASH-02, DASH-03]

coverage:
  - id: D1
    description: "Nested PLAN sections no longer repeat enclosing separators or horizontal inset; coverage/artifact tables share horizontal rules and zebra rows; attention provenance occupies grid column 2."
    requirement: UI-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts (nested section, coverage table, and attention provenance contracts)"
        status: pass
      - kind: integration
        ref: "npx vitest run test/web/visual-contract.test.ts test/web/shell-contract.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reference previews use the live trigger as a fixed Base UI Positioner anchor, with stacking above the sticky header and exact final-focus return."
    requirement: NAV-02
    verification:
      - kind: integration
        ref: "test/rendering/references.test.ts#renders one Base UI preview with the locked fields, explicit Open, and exact focus return"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Source and type contracts prove geometry ownership and collision configuration; the 02-17 browser gate still judges actual placement at desktop and 390px."
  - id: D3
    description: "Mermaid uses strict base-theme initialization from app tokens, live semantic SVG overrides, proportional viewport bounds, and a reachable browser-parse fallback fixture."
    requirement: READ-06
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts (Mermaid initialization, SVG theme/bounds, and fixture branch contracts)"
        status: pass
      - kind: integration
        ref: "npx vitest run test/rendering/markdown.test.ts test/snapshot.golden.test.ts test/degradation.test.ts"
        status: pass
      - kind: other
        ref: "npm run build && npm run smoke -- fixtures/dense"
        status: pass
    human_judgment: true
    rationale: "Automated contracts prove the theme and fallback seams; the 02-17 browser gate judges the rendered aspect ratio, theme appearance, and readable fallback at both viewports."

duration: 5min
completed: 2026-08-31
status: complete
---

# Phase 02 Plan 14: Presentation Root-Cause Corrections Summary

**Flattened recursive document chrome, collision-aware reference previews, and semantic token-themed Mermaid diagrams with a reachable browser rejection fallback.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-30T19:26:25Z
- **Completed:** 2026-08-30T19:31:59Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Closed G2-01, G2-04, and G2-06 at their measured selectors: nested PLAN sections reset their separator/inset, coverage cells use bottom-only rules with zebra striping, and attention source notes occupy the content column.
- Closed G2-02 at the geometry owner: `Popover.Positioner` keeps the live trigger anchor, fixed collision-aware placement, and z-index 60 while Popup remains viewport-bounded visual chrome.
- Closed G2-05 at initialization, CSS, and fixture seams: strict Mermaid rendering uses the app font/tokens, SVG dimensions remain proportional under a 70vh/36rem ceiling, and the dense corpus reaches browser-parse fallback.

## Task Commits

Each TDD task was committed as RED then GREEN:

1. **Task 1 RED: presentation regression contracts** - `0776da1` (test)
2. **Task 1 GREEN: nested sections, table chrome, and provenance** - `781ddd4` (fix)
3. **Task 2 RED: preview positioning contract** - `0829549` (test)
4. **Task 2 GREEN: Base UI Positioner geometry and stacking** - `518aa66` (fix)
5. **Task 3 RED: Mermaid theme and fallback contracts** - `40afed2` (test)
6. **Task 3 GREEN: token theme, proportional bounds, and fixture fallback** - `250a18a` (fix)

## Files Created/Modified

- `src/web/styles/globals.css` - Nested section resets, shared table treatment, provenance placement, Positioner stack ownership, and semantic Mermaid SVG rules.
- `src/web/components/reference-preview.tsx` - Named fixed Positioner with live anchor and collision inputs.
- `src/web/pages/artifact-page.tsx` - Strict base-theme Mermaid initialization from computed root tokens.
- `test/web/visual-contract.test.ts` - TDD contracts for presentation and Mermaid behavior.
- `test/rendering/references.test.ts` - Positioner, stacking, width-bound, and focus-return source contract.
- `fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md` - Valid and browser-invalid Mermaid branches.
- `test/__golden__/dense.json` - Confined body length/hash update for the edited fixture artifact.

## Decisions Made

- Retained code-block borders and local horizontal overflow; only recursive section decoration was removed.
- Assigned z-index to the positioned ancestor rather than the statically positioned popup.
- Read Mermaid's initial palette from computed root properties, then let CSS variables keep rendered SVGs synchronized with light/dark state.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Issues Encountered

- Context7 was unavailable in this environment; the Base UI 1.7 and Mermaid 11.17 API shapes were verified against the installed versioned type declarations before implementation.
- The expected dense golden mismatch was confined to repeated `bodyLength`/`bodyHash` fields for the edited `01-01-PLAN.md`; the snapshot was then regenerated and passed.

## Verification

- Targeted task suites: 29/29, 17/17, and 49/49 passed.
- Full suite: 304/304 tests passed across 24 files.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke -- fixtures/dense` passed.
- Production build completed successfully; Vite emitted only its existing advisory about chunks above 500 kB.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G2-01, G2-02, G2-04, G2-05, and G2-06 have focused regression coverage and root-cause fixes ready for plan 02-17's desktop/390px, light/dark browser re-gate.
- No dependency, route shape, filesystem access path, or new unplanned threat surface was introduced.

## Self-Check: PASSED

- All seven modified implementation/test/fixture files exist.
- All six RED/GREEN task commits exist in git history.
- All task acceptance criteria and the complete plan verification passed on the final tree.
- Stub and skipped-test scans found no open items.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-31*
