---
phase: 04-portability-degradation-hardening
plan: 06
subsystem: ui
tags: [gap-closure, degradation, warning-summary, react, tdd]

# Dependency graph
requires:
  - phase: 04-portability-degradation-hardening
    provides: "04-03's shared artifactWarningTone outcome vocabulary and 04-05's artifact-page tone wiring"
provides:
  - "One pure artifactWarningSummary derivation for metadata, unreadable, and rendering-only outcomes"
  - "Artifact-page disclosure copy derived once from the same response-local warningTone binding as its badge"
  - "D-11 contract coverage proving unreadable artifacts never claim that document text survived"
affects: [phase-04-verification, degradation-ui, artifact-page]

# Actuals (#2632)
actuals:
  tokens: 3197
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentation copy with outcome-dependent truth lives in a pure src/presentation selector, while the page only renders the selected value."

key-files:
  created:
    - src/presentation/artifact-warning-summary.ts
    - test/presentation/artifact-warning-summary.test.ts
  modified:
    - src/web/pages/artifact-page.tsx
    - test/web/degradation-ui-contract.test.ts
    - .planning/phases/04-portability-degradation-hardening/04-UI-SPEC.md

key-decisions:
  - "Unreadable tone takes precedence over warning-source counts, so every warned zero-length body gets the no-body summary regardless of whether warnings are structural, rendering-only, or both."
  - "Structural warnings outrank rendering warnings when both exist; the technical disclosure still lists every warning record."
  - "Inconsistent non-null tone with no warnings returns null rather than inventing an explanation."

patterns-established:
  - "Derive a badge tone and its explanatory prose from one response payload in one render pass, using pure functions and one shared tone binding."

requirements-completed: [TGT-06]

coverage:
  - id: D1
    description: "The warning disclosure selects truthful copy for body-survived, unreadable, and rendering-only outcomes without branching on parser stage."
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/presentation/artifact-warning-summary.test.ts — six outcome and composition cases"
        status: pass
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts — D-11 shared-module wiring contract"
        status: pass
    human_judgment: false
  - id: D2
    description: "The unreadable disclosure and empty-document notice read as one coherent account to a person."
    requirement: "TGT-06"
    verification: []
    human_judgment: true
    rationale: "Prose coherence between two UI regions is a content judgment and is routed to the end-of-phase human review."
  - id: D3
    description: "Determine whether 04-05's prohibition on a tone that overstates survival includes disclosure prose as well as the badge label."
    requirement: "TGT-06"
    verification: []
    human_judgment: true
    rationale: "The originating plan explicitly classifies this prohibition as judgment-tier and requires an authoritative human interpretation."

# Metrics
duration: 4min
completed: 2026-09-08
status: complete
---

# Phase 4 Plan 6: Outcome-Aware Warning Disclosure Summary

**Outcome-aware artifact warning copy now tells readers exactly what survived, while preserving the verified Warning sentence byte-for-byte and keeping parser details in the existing nested disclosure.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-07T20:13:38Z
- **Completed:** 2026-09-07T20:17:23Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- Added `ARTIFACT_WARNING_SUMMARIES` and the pure `artifactWarningSummary()` selector with separate metadata, unreadable, and rendering-only branches.
- Proved through a TDD composition case that any warned artifact with `bodyLength === 0` selects the unreadable sentence and can never select recovered-body copy.
- Wired `ArtifactPage` to compute the summary once from its existing `warningTone` and warning counts, leaving the technical fields, layout, and D-12 badge vocabulary unchanged.
- Replaced the stale single-sentence UI copy contract with the exact three outcome-keyed strings.
- Passed the whole-phase gate at 39 files / 546 tests, plus typecheck, lint, production build, and smoke.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing warning-summary contract** - `c40c0cc` (test)
2. **Task 1 GREEN: Derive honest artifact warning summaries** - `25be879` (feat)
3. **Task 2: Wire the page, contract test, and UI copy contract** - `bbe3135` (fix)
4. **Task 3: Whole-phase regression gate** - `7ca5147` (test, empty verification commit)

**Plan metadata:** commit to follow this SUMMARY.

## Files Created/Modified

- `src/presentation/artifact-warning-summary.ts` - Owns the three exact disclosure strings and pure outcome selector.
- `test/presentation/artifact-warning-summary.test.ts` - Six cases pin all branches, composition with `artifactWarningTone`, and byte-identical Warning copy.
- `src/web/pages/artifact-page.tsx` - Calls the selector once from the same response-local tone used by the badge and conditionally renders its result.
- `test/web/degradation-ui-contract.test.ts` - Pins shared-module wiring and proves no summary prose remains hardcoded in the page.
- `.planning/phases/04-portability-degradation-hardening/04-UI-SPEC.md` - Records the three outcome-keyed D-11 strings.

## Decisions Made

- Tone is evaluated before warning-source counts. This makes the zero-length-body outcome authoritative and prevents either warning source from overstating survival.
- Structural damage wins when structural and rendering warnings coexist; rendering warnings remain visible verbatim under Technical details.
- The selector returns `null` for an inconsistent warning tone with zero warning counts, preferring honest silence over fabricated prose.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Human Verification

Both judgment-tier checks remain `human_needed` for the end-of-phase review; the executor did not self-approve them:

1. Open an artifact with `bodyLength: 0` and at least one warning. Read the warning disclosure followed by the empty-document notice. Confirm they read as one coherent explanation and that neither implies document text is on screen.
2. Decide whether 04-05's prohibition, “MUST NOT present a damaged artifact under a tone that overstates what survived,” was intended to cover disclosure prose as well as badge/label tone. Record whether Phase 4 was held for this fix or permitted to ship with the issue tracked. This implementation closes the known prose defect before that decision, but does not substitute an executor interpretation for the required human answer.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The sole failed automated must-have in `04-VERIFICATION.md` is implemented and covered by tests.
- Phase 4 is ready for re-verification and the two end-of-phase human judgments above.
- WR-01 (`extractSnippets` overlap/truncation) and IN-01 (duplicate chip-tone CSS bodies) remain explicitly out of scope and untouched.

---
*Phase: 04-portability-degradation-hardening*
*Completed: 2026-09-08*

## Self-Check: PASSED

All five implementation/contract files exist. Task commits `c40c0cc`, `25be879`, `bbe3135`, and
`7ca5147` are present in git history. The final gate passed with 546 tests across 39 files, clean
typecheck and lint, a successful production build, and a passing smoke probe.
