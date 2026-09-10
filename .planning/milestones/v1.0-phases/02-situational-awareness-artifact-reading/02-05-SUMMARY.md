---
phase: 02-situational-awareness-artifact-reading
plan: 05
subsystem: artifact-navigation
tags: [coverage-matrix, rehype, base-ui, popover, react, milestone-routing]

requires:
  - phase: 02-situational-awareness-artifact-reading
    plan: 02
    provides: 'Immutable ProjectPresentation DTO and milestone-qualified canonical route codec'
  - phase: 02-situational-awareness-artifact-reading
    plan: 04
    provides: 'Sanitized artifact renderer, snapshot-only document delivery, and sole DocumentView HTML mount'
provides:
  - 'Conservative exact-first, ambiguity-preserving truth-to-coverage matrix and stacked plan/summary reader'
  - 'Milestone-contextual requirement, phase, and plan reference registry with post-sanitize HAST enrichment'
  - 'Controlled Base UI preview-first interaction for pointer and keyboard activation with exact focus return'
affects: [02-06, browser-uat, artifact-reading, cross-linking, security-review]

actuals:
  tokens: 14363
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - 'Evidence pairing accepts only candidates that are the unique highest score for both rows; exact normalized pairs are removed first'
    - 'Sanitized HAST receives opaque reference keys only after milestone-contextual snapshot resolution'
    - 'Delegated inert-HTML activation opens one React-owned Base UI preview; only its explicit Open action navigates'

key-files:
  created:
    - src/presentation/coverage.ts
    - src/presentation/references.ts
    - src/rendering/linkify.ts
    - src/web/pages/plan-pair-page.tsx
    - src/web/pages/document-reference-activation.ts
    - src/web/components/reference-preview.tsx
    - test/presentation/coverage.test.ts
    - test/rendering/references.test.ts
  modified:
    - src/rendering/markdown.ts
    - src/server/index.ts
    - src/web/pages/artifact-page.tsx
    - src/web/app-router.tsx
    - src/web/styles/globals.css

key-decisions:
  - 'Inference follows the locked mutual-unique-best rule: lower-scoring eligible candidates do not hide a clear winner, while equal highest-score ties remain unmatched.'
  - 'Reference authority is represented by an opaque registry key emitted after sanitization; raw prose and route-shaped text never become destinations on their own.'
  - 'DocumentView remains the only sanitized HTML mount; a small DOM-free activation seam is re-exported from ArtifactPage so server-side tests can exercise the bridge without a second mount or DOM harness.'

patterns-established:
  - 'Coverage order: normalized exact one-to-one pairs -> threshold candidates -> mutual unique-highest inference -> visible unmatched rows'
  - 'Reference order: immutable presentation -> contextual registry -> sanitize -> resolved HAST controls -> delegated preview -> explicit canonical Open'
  - 'Popover lifetime: retain trigger state through close animation -> Base UI finalFocus returns to trigger -> clear controlled preview state'

requirements-completed: [READ-05, NAV-02, NAV-03, NAV-04]

coverage:
  - id: D1
    description: 'Truth and coverage rows pair only by exact normalized text or conservative textual evidence; shared IDs, order, ties, and competing candidates cannot fabricate evidence.'
    requirement: READ-05
    verification:
      - kind: unit
        ref: 'test/presentation/coverage.test.ts#buildCoverageMatrix'
        status: pass
    human_judgment: false
  - id: D2
    description: 'The plan reader places the complete count-preserving matrix before full stacked plan and summary documents with jump links and local overflow containment.'
    requirement: READ-05
    verification:
      - kind: integration
        ref: 'test/presentation/coverage.test.ts#renders the matrix before both complete documents in the plan pair page'
        status: pass
    human_judgment: false
  - id: D3
    description: 'Resolved requirement mentions become preview controls only after contextual resolution and open one React preview before any navigation for click, Enter, or Space.'
    requirement: NAV-02
    verification:
      - kind: integration
        ref: 'test/rendering/references.test.ts#sanitized metadata to controlled React preview bridge'
        status: pass
    human_judgment: false
  - id: D4
    description: 'Duplicate phase and plan IDs resolve inside the containing active or archived milestone, while root documents use the active milestone.'
    requirement: NAV-03
    verification:
      - kind: unit
        ref: 'test/rendering/references.test.ts#milestone-contextual presentation references'
        status: pass
    human_judgment: false
  - id: D5
    description: 'Empty, malformed, dangling, code, preformatted, authored-link, and Mermaid tokens remain inert text with adjacent Unicode preserved.'
    requirement: NAV-04
    verification:
      - kind: integration
        ref: 'test/rendering/references.test.ts#post-sanitize reference enrichment'
        status: pass
    human_judgment: false

duration: 20min-active
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 5: Truthful Pairing and Preview-First References Summary

**Plan intent and recorded evidence now compare through an ambiguity-preserving matrix, while milestone-qualified prose references cross the sanitized HTML boundary only as opaque controls that open one accessible preview before canonical navigation.**

## Performance

- **Duration:** approximately 20 minutes of active executor time across an interrupted handoff
- **Started:** 2026-08-27T10:19:30Z (initial RED commit)
- **Resumed:** 2026-08-27T14:52:00Z
- **Completed:** 2026-08-27T15:04:50Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Added deterministic exact-first plan-truth to summary-coverage pairing that labels inferred evidence, rejects shared-ID-only matches, accepts only mutual unique-highest scores, preserves input-order independence, and keeps all unmatched rows visible.
- Added a matrix-first PlanPairPage with full stacked plan and summary documents, canonical navigation, jump links, and local wide-content containment.
- Added one snapshot-built reference registry that resolves requirement, phase, and plan identities within the containing artifact's milestone; root artifacts use only the active milestone.
- Installed a bounded reference HAST walker after sanitization. It skips links, code, pre, and Mermaid content, preserves Unicode and unresolved text, and emits only opaque application-owned keys.
- Connected renderer output to the sole DocumentView mount through delegated click/Enter/Space activation and one controlled Base UI preview with identity, title, status, location, one type-specific detail, explicit Open, Escape/outside dismissal, and exact trigger focus return.
- Passed 17 focused reference tests, all 228 project tests, typecheck, lint, production build, production smoke, formatting, and diff checks.

## Task Commits

1. **Task 1 RED: Coverage pairing contract** — `dd4b96c` (test)
2. **Task 1 GREEN: Conservative matrix and stacked plan review** — `05d810f` (feat)
3. **Task 2 RED: Contextual reference and safe linkifier contract** — `8ea1bbd` (test)
4. **Task 2 GREEN: Snapshot registry and post-sanitize enrichment** — `eab2d07` (feat)
5. **Task 3 RED: Delegated preview interaction contract** — `bc37fcd` (test)
6. **Task 3 GREEN: Controlled preview-first navigation** — `952d168` (feat)
7. **Review fix: Locked mutual unique-highest inference semantics** — `67ac84f` (fix)

## Files Created/Modified

- `src/presentation/coverage.ts` — conservative count-preserving truth/coverage matcher
- `src/presentation/references.ts` — milestone-contextual preview registry and resolver
- `src/rendering/linkify.ts` — bounded post-sanitize HAST text enrichment
- `src/rendering/markdown.ts` — installed safe reference plugin and per-document used-preview output
- `src/server/index.ts` — builds one registry for the immutable served presentation and supplies it to document rendering
- `src/web/pages/plan-pair-page.tsx` — matrix-first full plan/summary reader
- `src/web/pages/artifact-page.tsx` — sole sanitized mount plus delegated reference activation and controlled preview lifecycle
- `src/web/pages/document-reference-activation.ts` — DOM-free, typecheckable activation/focus seam re-exported by ArtifactPage
- `src/web/components/reference-preview.tsx` — controlled Base UI Popover with canonical Open action
- `src/web/app-router.tsx` — canonical plan routes now open paired review
- `src/web/styles/globals.css` — preset-preserving matrix, reference-control, and preview containment styles
- `test/presentation/coverage.test.ts` — exact/inferred/tie/competing/reorder/unmatched matrix suite
- `test/rendering/references.test.ts` — active/archive/null/Unicode/linkifier/delegation/focus suite

## Decisions Made

Inference uses the plan's mutual unique-highest rule, never greedy first-match or array position. A pair is accepted only when each row uniquely ranks the other highest; equal highest-score ties remain visible and unmatched. Reference links follow the same authority posture. The renderer emits only keys that the immutable snapshot registry already resolved in the artifact's milestone, and navigation remains impossible until the user selects the explicit canonical Open action in React-owned UI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored the locked mutual unique-highest matcher semantics**

- **Found during:** Orchestrator independent plan review
- **Issue:** The resumed GREEN implementation required each row to have only one threshold-qualified candidate. The plan instead requires the selected pair to be the unique highest score for both rows, so a weaker eligible distractor must not hide a clear mutual winner.
- **Fix:** Rank eligible candidates per row, accept only a single highest scorer on both sides, keep equal highest-score ties unmatched, and add a weaker-distractor regression.
- **Files modified:** `src/presentation/coverage.ts`, `test/presentation/coverage.test.ts`
- **Verification:** Focused eight-test coverage suite, all 228 tests, typecheck, lint, build, and formatting pass.
- **Committed in:** `67ac84f`

**2. [Rule 2 - Missing Critical] Wired the reference registry into actual document delivery**

- **Found during:** Task 2 renderer integration
- **Issue:** The planned renderer and registry files alone could pass direct tests but the served document endpoint would never supply milestone context, leaving production documents unlinked.
- **Fix:** Build one registry beside the immutable presentation/index in `createApp` and pass it into every finalized document render.
- **Files modified:** `src/server/index.ts`
- **Verification:** Renderer/API tests, full suite, typecheck, lint, build, and production smoke pass.
- **Committed in:** `eab2d07`

**3. [Rule 2 - Missing Critical] Added local matrix and preview interaction styling**

- **Found during:** Tasks 1 and 3 browser-surface integration
- **Issue:** The plan's declared file list omitted the shared stylesheet, but the new wide matrix, focusable inline controls, and collision-bounded popover required visible focus, local overflow, and preset-compatible presentation.
- **Fix:** Added only component-local rules using the existing Studio Portal `b3Dqcuo4na` tokens; the shell palette and theme boundary remain unchanged.
- **Files modified:** `src/web/styles/globals.css`
- **Verification:** Build, smoke, formatting, and existing shell/theme tests pass.
- **Committed in:** `05d810f`, `952d168`

**4. [Rule 3 - Blocking] Split the pure activation seam from TSX while preserving the required ArtifactPage export**

- **Found during:** Task 3 typecheck
- **Issue:** The server-side test tsconfig deliberately has no JSX transform, so importing `artifact-page.tsx` directly into the integration suite failed even though Vitest execution passed.
- **Fix:** Moved the pure metadata-to-state function to a DOM-free `.ts` module, imported and re-exported it from `artifact-page.tsx`, and kept all React ownership in DocumentView.
- **Files modified:** `src/web/pages/document-reference-activation.ts`, `src/web/pages/artifact-page.tsx`, `test/rendering/references.test.ts`
- **Verification:** The integration test drives real renderer metadata through the handler; both TypeScript projects and all quality gates pass.
- **Committed in:** `952d168`

---

**Total deviations:** 4 auto-fixed (1 matcher bug, 2 missing-critical integration gaps, 1 blocking test seam).
**Impact on plan:** All changes stay within the declared evidence, sanitized enrichment, and DocumentView interaction boundaries. No second route builder, Markdown rewriter, HTML mount, theme, or navigation authority was introduced.

## Issues Encountered

The prior executor left a valid RED commit and a mostly complete uncommitted GREEN draft, but no repository-local crash log or failure record. The first resumed focused run exposed one unfinished conservative-matching case; typecheck and build otherwise passed. This indicates an abrupt external executor interruption rather than a recorded application or build crash, but the exact external cause is not recoverable from the worktree.

## User Setup Required

None.

## Next Phase Readiness

- Plan 02-06 can exercise truthful pairing, active/archive contextual references, preview-first pointer/keyboard behavior, focus restoration, themes, and narrow-width containment through the browser UAT tunnel.
- The sole sanitized DocumentView boundary and exact Studio Portal `b3Dqcuo4na` preset remain intact.
- No known stubs, skipped tests, unrun verifications, or unmodeled threat surfaces remain.

## Self-Check: PASSED

All eight declared output artifacts exist, all seven TDD/production/review commits resolve, the complete 228-test suite and every static/build/smoke/format gate pass, and all five coverage deliverables are backed by passing automated evidence.

---

_Phase: 02-situational-awareness-artifact-reading_
_Completed: 2026-08-27_
