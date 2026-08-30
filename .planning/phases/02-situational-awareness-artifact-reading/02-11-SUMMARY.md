---
phase: 02-situational-awareness-artifact-reading
plan: 11
subsystem: ui
tags: [react-router, dashboard, roadmap, navigation, scroll]

requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: "02-07's buildPhaseUrl-based NextWorkItem.url fix (CR-01), and 02-08's DOM-free
      seam pattern (roadmap-deep-link.ts / document-reference-activation.ts)"
provides:
  - "AttentionItem.url replacing the dead-data AttentionItem.targetKey field, populated from the
    same route builders NextWorkItem already uses"
  - "A rendered, activatable Needs-attention row (react-router Link) when a destination resolves"
  - "scrollWhenSettled: a DOM-free settle loop used by both the roadmap deep-link effect and the
    artifact heading-anchor effect"
affects: [02-12, 02-13]

actuals:
  tokens: 4993
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Settle-loop scroll: measure a numeric layout signature every frame via an injected host,
      rescroll on any change, stop after N consecutive stable measurements or a frame budget —
      DOM-free and unit-testable without jsdom, same seam as roadmap-deep-link.ts."

key-files:
  created:
    - src/web/pages/scroll-settle.ts
    - test/web/scroll-settle.test.ts
  modified:
    - src/presentation/dashboard.ts
    - src/web/pages/dashboard-page.tsx
    - src/web/pages/roadmap-page.tsx
    - src/web/pages/artifact-page.tsx
    - test/presentation/dashboard.test.ts

key-decisions:
  - "AttentionItem.targetKey (dead data, zero consumers) removed outright rather than kept
    alongside a new url field — confirmed via repository-wide grep before editing."
  - "Discrepancy and authored-blocker rows now build their destination through
    buildPhaseUrl(currentPhase.identity), not the bare phaseKeyOf token that was the actual
    mechanism behind G-02's non-navigating blocker row."
  - "Dependency/checkpoint/coverage destinations are unchanged in value (already full plan
    routes from project-presentation.ts) and were only renamed from targetKey to url."
  - "Provenance SourceLink moved out to be a sibling of the row Link/div rather than nested
    inside it, since an anchor inside an anchor is invalid markup the browser will not honour."
  - "scroll-settle.ts and its test avoid the literal words document/window anywhere in the file
    (including comments) to satisfy the plan's strict grep-based DOM-free acceptance check."

requirements-completed: [DASH-04, ROAD-04]

coverage:
  - id: D1
    description: "Every Needs-attention row whose item has a resolvable destination renders as
      an activatable control that navigates there; the authored-blocker row reaches the scoped
      current phase (DASH-02, DASH-03; G-02)."
    requirement: DASH-02
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#authored-blocker attention destination equals buildPhaseUrl(currentPhase.identity) when a current phase resolves (G-02)"
        status: pass
    human_judgment: true
    rationale: "The unit suite proves the destination data is correct and round-trips through
      the route parser; that the row actually navigates when clicked in a browser is the
      behavioral half handed to plan 02-13's gate (this project has no browser/jsdom test
      runtime by deliberate v1 stack decision)."
  - id: D2
    description: "An attention destination is either built through buildPhaseUrl or is an
      already-built plan route, never a bare phase token, and round-trips through
      parsePresentationUrl to the same phase identity the row names (DASH-04 boundary; ROAD-04)."
    requirement: DASH-04
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#no attention destination is ever a bare phase token, and every non-null destination round-trips through parsePresentationUrl"
        status: pass
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#discrepancy attention destination is buildPhaseUrl(currentPhase.identity) and round-trips (DASH-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "When no current phase resolves, the blocker row's destination falls back to
      the roadmap route rather than a dead or malformed link (DASH-02)."
    requirement: DASH-02
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#authored-blocker attention destination falls back to /roadmap when no current phase resolves (G-02)"
        status: pass
    human_judgment: false
  - id: D4
    description: "An attention item with no resolvable destination renders as inert text rather
      than as a control that does nothing (DASH-03)."
    requirement: DASH-03
    verification: []
    human_judgment: true
    rationale: "The conditional Link/div render is proven by typecheck narrowing item.url to
      string inside the Link branch and by source inspection; no test runtime in this project
      can assert the rendered DOM element type without adding jsdom, which is out of scope."
  - id: D5
    description: "A deep-linked phase is scrolled into position only after the measured layout
      signature has stopped changing across consecutive animation frames, bounded by a frame
      budget, so the target holds position on a long phase body (NAV-06)."
    requirement: NAV-06
    verification:
      - kind: unit
        ref: "test/web/scroll-settle.test.ts#keeps scheduling and stops at the frame budget without throwing when the signature changes every frame"
        status: pass
      - kind: unit
        ref: "test/web/scroll-settle.test.ts#issues its final scroll only after the signature reaches its stabilised value, not before"
        status: pass
      - kind: unit
        ref: "test/web/scroll-settle.test.ts#cancels any outstanding scheduled frame via the disposer, and calling it twice is safe"
        status: pass
    human_judgment: true
    rationale: "The timing logic is fully proven by unit tests against a fake host; that the
      settled target visually clears the sticky header in a real browser is the backstop truth
      handed to plan 02-13's human gate."

duration: 11min
completed: 2026-08-30
status: complete
---

# Phase 02 Plan 11: Attention-row navigation and frame-settled deep-link scroll Summary

**Attention rows now carry a routable `url` built through the same `buildPhaseUrl`/`buildPlanUrl`
builders as next-work items, rendered as a real `Link` when it resolves; the roadmap deep-link and
artifact heading-anchor scrolls now wait for layout to stabilize via a new DOM-free
`scrollWhenSettled` loop instead of firing one animation frame after mount.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-30T15:52:00Z
- **Completed:** 2026-08-30T16:03:21Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `AttentionItem.targetKey` (dead data, no consumers) replaced with `AttentionItem.url`,
  populated per producer from `buildPhaseUrl`/existing plan-route keys — closing G-02's actual
  root cause, the bare `p~…` phase token the discrepancy and blocker rows previously carried.
- The Needs-attention list's second grid child renders as a react-router `Link`
  (`className="attention-action"`) when `item.url` resolves, and stays a plain `div` otherwise —
  so an item with no destination reads as inert text, never a dead-end control (DASH-03).
- New `src/web/pages/scroll-settle.ts` exports `scrollWhenSettled(host, options)`: a DOM-free
  settle loop that measures a host-supplied layout signature every frame, rescrolls on any
  change, and stops once the signature holds for `stableFrames` (default 2) consecutive
  measurements or `maxFrames` (default 30) is reached.
- Both the roadmap deep-link effect and the artifact heading-anchor effect now use
  `scrollWhenSettled` in place of a single `requestAnimationFrame` + `scrollIntoView`, returning
  the disposer so React cancels the loop on unmount (G-04, plus the same fix opportunistically
  applied to the artifact page's identical one-shot defect).

## Task Commits

Each task was committed atomically, with the two `tdd="true"` tasks following the RED/GREEN gate:

1. **Task 1: Give every attention item a destination that round-trips through the route parser**
   - `0aa4ba2` — `test(02-11): add failing tests for attention item routable destinations` (RED)
   - `7d6e84f` — `feat(02-11): replace AttentionItem.targetKey with a routable url field` (GREEN)
2. **Task 2: Render the attention row as an activatable control**
   - `9247af7` — `feat(02-11): render the attention row as an activatable control`
3. **Task 3: Defer the deep-link scroll until the layout stops moving**
   - `0e44194` — `test(02-11): add failing tests for the frame-settle scroll loop` (RED)
   - `e2808ae` — `feat(02-11): defer deep-link and heading-anchor scroll until layout settles` (GREEN)

## Files Created/Modified

- `src/presentation/dashboard.ts` — `AttentionItem.url` replaces `targetKey`; all five
  `attentionItems` producers populate it through route builders or existing plan-route keys.
- `src/web/pages/dashboard-page.tsx` — attention row renders as `Link`/`div` conditionally on
  `item.url`; provenance `SourceLink` moved to a sibling position outside the row control.
- `src/web/pages/scroll-settle.ts` — new file. `ScrollSettleHost` interface (`measure`, `scroll`,
  `schedule`, `cancel`) and `scrollWhenSettled(host, options?)`.
- `src/web/pages/roadmap-page.tsx` — deep-link effect wired to `scrollWhenSettled`, returns the
  disposer.
- `src/web/pages/artifact-page.tsx` — heading-anchor scroll wired to `scrollWhenSettled`,
  disposer pushed into the effect's existing `cleanups` array.
- `test/presentation/dashboard.test.ts` — 6 new tests covering the round-trip and fallback
  behaviors for every attention producer.
- `test/web/scroll-settle.test.ts` — new file, 6 tests (5 named behaviors + a module-purity
  check) driving a synchronous fake host manually.

## Decisions Made

- Removed `AttentionItem.targetKey` entirely instead of deprecating it alongside `url`, after
  confirming via repository-wide grep it had zero consumers outside `dashboard.ts` itself.
- Kept the `PhaseDto.key`/`PlanDto.key` asymmetry untouched, per the plan's explicit scope
  boundary — unifying them was named as a genuine follow-up, not this run's job.
- Rewrote `scroll-settle.ts`'s own doc comments to avoid the literal words "document"/"window"
  anywhere in the file (not just in import statements), after the first test run caught that the
  plan's acceptance grep (`\b(document|window)\b`) is a whole-file word-boundary check, not a
  usage-pattern check — the initial draft's prose comments (which *described* the DOM-free
  property using those words) tripped their own check.

## Deviations from Plan

None — plan executed exactly as written. The one implementation adjustment (rewording the
scroll-settle.ts comments to avoid "document"/"window" as literal substrings) was required to
satisfy the plan's own stated acceptance criterion, not a deviation from it.

## Issues Encountered

- The comprehensive round-trip test for Task 1 (dependency/checkpoint/coverage items) initially
  failed against this test file's existing `plan()`/`checkpoint()`/`coverageWait()` fixture
  helpers, which use an opaque `plan:01-02`-style literal key for identity-comparison tests
  elsewhere in the same file rather than a real `buildPlanUrl` route. Resolved by building a
  realistic plan key via `buildPlanUrl(LIVE_IDENTITY, '01-02')` specifically for that one test,
  leaving the pre-existing fixture helpers and their other consumers unchanged.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The destination data for every Needs-attention row is proven correct and round-trips through
  the route parser; the settle-loop timing is proven by unit tests against a fake host. Both
  gaps' behavioral halves — that the row actually navigates in a browser, and that the settled
  scroll lands the target below the sticky header — are handed to plan 02-13's human gate as UAT
  items 10 and 11, per this plan's own `<verification>` section.
- `DASH-02`, `DASH-03`, `ROAD-01`, and `NAV-06` are shared with sibling plans still executing in
  this wave (`requirements.ready-ids` reported them blocked); only `DASH-04` and `ROAD-04` were
  marked complete in `REQUIREMENTS.md` by this plan. The remaining four will mark complete once
  every plan declaring them has produced a SUMMARY.

## Self-Check: PASSED

- `[ -f src/web/pages/scroll-settle.ts ]` → FOUND
- `[ -f test/web/scroll-settle.test.ts ]` → FOUND
- `git log --oneline --all --grep="02-11"` → 5 commits found (2 test, 3 feat)
- All plan-level `<verification>` commands re-run and passing: targeted vitest (46 passed), full
  `npm test` (267 passed), `npm run typecheck` (exit 0), `npm run lint` (exit 0), `npm run build`
  (exit 0), `npm run smoke -- fixtures/dense` (passed).
- All task-level `<acceptance_criteria>` re-verified via the grep/sed commands each task specifies.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-30*
