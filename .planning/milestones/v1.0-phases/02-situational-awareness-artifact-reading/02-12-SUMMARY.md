---
phase: 02-situational-awareness-artifact-reading
plan: 12
subsystem: ui
tags: [css, oklch, tailwind-v4, overflow, tables, badges, reference-triggers, gap-closure]

requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: the 02-UI-SPEC.md revision pass (G-03/G-05/G-07/G-08/G-10 normative clauses) and the artifact-page/plan-pair-page components applying document-overflow-boundary
provides:
  - A flattened nesting model for the artifact document (document-canvas and plan-section no longer boxed layers; the fenced code block is the sole surviving Layer-1 box)
  - An enforced zero-minimum-width overflow containment chain via the new .document-overflow-boundary utility, applied everywhere the class is already used in markup
  - A visible cross-browser scrollbar on fenced code blocks (WebKit pseudo-elements paired with the existing Firefox thin-scrollbar declaration)
  - Horizontally-ruled artifact tables with a first-column width floor and universally-applied zebra striping
  - Filled status chips in every tone, with active/complete reading more clearly "on"
  - A reference-trigger resting appearance (muted, dotted underline) visually distinct from an authored link
  - The one remaining E9 long-text wrap gap on the sticky outline column
  - Dense fixture content (unrecognised wrapper tags, a 220-character unbroken line, a real mermaid diagram) that makes the two UAT-unreached surfaces reachable at the next human gate
affects: [02-13]

actuals:
  tokens: 4496
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Structural nesting rule: a boxed layer is border + distinct background-color + box-shadow; a single border-top hairline does not count, which is how .plan-section stays flat while still visually separating sections"
    - "Ancestor-chain overflow containment: every ancestor between a scrolling pre/table/mermaid and the viewport shell must declare min-width: 0, named as .document-overflow-boundary and applied wherever a flex/grid child could otherwise force its parent to its content's intrinsic width"

key-files:
  created:
    - test/web/visual-contract.test.ts
  modified:
    - src/web/styles/globals.css
    - fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md
    - test/__golden__/dense.json

key-decisions:
  - "Kept border:0 / background:transparent on .document-reference's base rule (native <button> chrome reset) rather than deleting the properties outright — the contract's 'no border, no background' means no border/background is rendered, and an explicit zero-value declaration achieves that; deleting it would let default UA button chrome leak through."
  - "Left the pre-existing duplicate .plan-section / .artifact-document pre / .artifact-document :not(pre) > code rule-block pairs in the stylesheet as two separate blocks rather than consolidating them — task scope was 'apply these four retroactive changes,' not a general stylesheet dedup, and touching both existing blocks (rather than merging them) kept the diff auditable against the plan's line-numbered read_first pointers."
  - "Removed the now-vestigial 'box-shadow: none' override inside the @media (max-width: 42rem) .document-canvas block once the base rule stopped declaring a shadow at all — a Rule 1 dead-code cleanup, not a new behavior."

requirements-completed: [UI-01, UI-03, READ-01, READ-06, NAV-02, NAV-03]

coverage:
  - id: D1
    description: "Document canvas and plan-section shell no longer read as boxed layers; the fenced code block is the sole surviving Layer-1 box (G-08)"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#flattens the document canvas — no enclosing border, background fill, or shadow"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#flattens both plan-section shells to a single hairline top rule"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#drops the inline code border and keeps a subtle background tint"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#keeps exactly the fenced code block as the surviving Layer-1 box"
        status: pass
    human_judgment: true
    rationale: "Stylesheet-source assertions prove the four named selectors no longer declare box properties; they cannot walk a real DOM path and count computed-style changes, which is the contract's own checkable test. Authored in 02-12-PLAN.md as a backstop truth, abstaining to plan 02-13's gate."
  - id: D2
    description: "The zero-minimum-width overflow containment chain holds through document-overflow-boundary and both plan-section blocks; a fenced code block never wraps and shows a visible scrollbar (G-10)"
    requirement: UI-03
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#declares the overflow-boundary utility applied by the four bounding components"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#draws a visible cross-browser scrollbar on fenced code blocks"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#never wraps a fenced code line"
        status: pass
      - kind: integration
        ref: "test/web/shell-contract.test.ts#contains wide children locally without clipping the document body"
        status: pass
      - kind: integration
        ref: "test/presentation/coverage.test.ts#renders the matrix before both complete documents in the plan pair page"
        status: pass
    human_judgment: true
    rationale: "Whether the scrollbar thumb is actually perceivable against the code background in both themes, and whether a reader can reach the end of a 200-character unbroken line at desktop and 390px, are backstop truths per 02-12-PLAN.md — no headless browser exists in this stack (deliberate v1 decision) to check computed style/contrast."
  - id: D3
    description: "Artifact tables are horizontally ruled with a first-column min-width floor and universally-applied zebra striping (G-05)"
    requirement: READ-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#gives the first table column a floor without fixing the layout"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#rules artifact tables horizontally only, with one weight and one color token"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#applies zebra striping to every table inside the artifact document"
        status: pass
    human_judgment: false
  - id: D4
    description: "Status chips render as filled shapes in every tone, with active/complete carrying a stronger accent border (G-07)"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#fills every status chip as a shape, with active/complete reading more clearly on"
        status: pass
    human_judgment: false
  - id: D5
    description: "A resolved reference trigger's resting appearance (muted, dotted underline) is visually distinct from an authored link's resting appearance (accent, solid underline) (G-03)"
    requirement: NAV-02
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#gives a resolved reference trigger a resting appearance distinct from an authored link"
        status: pass
    human_judgment: true
    rationale: "Whether the trigger genuinely 'reads as prose that happens to be interactive' at rest is a perceptual judgment; authored as a backstop truth in 02-12-PLAN.md and handed to plan 02-13's human gate."
  - id: D6
    description: "Document outline entries wrap an unbroken long token rather than overflowing the sticky column (E9 long-text)"
    requirement: READ-06
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#wraps a long unbroken outline token instead of overflowing the sticky outline column"
        status: pass
    human_judgment: false
  - id: D7
    description: "The dense fixture now contains an unrecognised wrapper (read_first, execution_context), a genuinely unbreakable 220-character line, and a real flowchart TD mermaid diagram, closing UAT items 2 and 7 (NOT REACHED)"
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#keeps a genuinely unbreakable long line in the dense fixture so the overflow fix stays exercised"
        status: pass
      - kind: integration
        ref: "test/snapshot.golden.test.ts#snapshot golden — dense"
        status: pass
      - kind: integration
        ref: "test/degradation.test.ts (no new warning on any named path)"
        status: pass
      - kind: other
        ref: "npm run smoke -- fixtures/dense"
        status: pass
    human_judgment: true
    rationale: "Whether the unrecognised wrapper actually renders through the generic fallback (rather than leaking as literal tag text) depends on plan 02-10's segmentPlanBody widening, which lands in the same wave but is a different plan's commits. This plan supplies the content; whether it renders correctly is the next human gate's job once all wave-9 plans are merged."

# Metrics
duration: 18min
completed: 2026-08-30
status: complete
---

# Phase 02 Plan 12: Flatten boxed layers, enforce overflow containment, revise tables/badges/triggers Summary

**One stylesheet closing five UAT stylesheet findings (G-10 code overflow, G-08 nesting depth, G-05 tables, G-07 badges, G-03 reference-trigger resting appearance) plus real fixture content — an unrecognised wrapper, a 220-character unbroken line, and a flowchart TD mermaid diagram — that makes the two UAT-unreached surfaces reachable at the next gate.**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-08-30T16:05Z
- **Tasks:** 3
- **Files modified:** 4 (1 created: `test/web/visual-contract.test.ts`)

## Accomplishments

- Flattened `.document-canvas` and both `.plan-section` rule blocks to non-boxed layers (no border, no distinct background, no shadow — `.plan-section` keeps a single `border-top` hairline), leaving the fenced code block as the sole surviving Layer-1 box on the document-canvas → plan-section → code-block path.
- Added the previously-missing `.document-overflow-boundary` utility (`min-width: 0; max-width: 100%`) that the class was already applied by in four components with zero backing CSS, plus `min-width: 0` on both `.plan-section` blocks, closing the ancestor-chain gap that caused G-10's silent clipping.
- Drew a visible cross-browser scrollbar on `.artifact-document pre` via WebKit pseudo-elements (`::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, and its `:hover` variant), pairing the pre-existing Firefox-only `scrollbar-width: thin`.
- Rewrote `.document-reference`'s resting appearance to muted-foreground + dotted underline + no border/background, with hover/focus moving to accent + solid underline — deliberately divergent from `.artifact-document a`'s accent/weight-600/solid-underline treatment.
- Gave artifact tables a first-column `min-width: 8ch` floor, replaced the full enclosing cell border with `border-bottom` only (horizontally-ruled reading), and confirmed zebra striping is scoped to every table in the document.
- Filled every `.status-chip` tone with a neutral background, raised icon `stroke-width` to `2.25`, and raised the active/complete border accent mix from 58% to 65%.
- Closed the one E9 long-text gap the earlier wrap pass missed: `overflow-wrap: anywhere` on `.document-outline a`.
- Authored the two cross-plan fragments named by plan 02-11 (`.attention-action`, `.roadmap-phase { scroll-margin-top: 6rem }`), since this plan owns the stylesheet in wave 9.
- Added `read_first`/`execution_context` wrapper tags, a genuine 220-character unbroken line, and a `flowchart TD` mermaid diagram to the dense fixture's `01-01-PLAN.md`, regenerating `test/__golden__/dense.json` (confined to this one fixture file's `bodyLength`/`bodyHash` and one new self-referencing mention-index entry).
- Created `test/web/visual-contract.test.ts` (15 tests) pinning every mechanically-checkable clause from all three tasks via region-scoped stylesheet-source assertions, following the existing `source()` helper pattern from `test/web/shell-contract.test.ts`.

## Task Commits

1. **Task 1: Flatten the boxed layers and enforce the overflow containment chain** - `101eef9` (feat) — also included the Task 3 reference-trigger rewrite (see Deviations)
2. **Task 2: Supply the real content the gate needs to reach the surfaces it could not** - `65da62c` (test)
3. **Task 3: Tables, badges, reference triggers and the outline wrap gap** - `61328af` (feat)

## Files Created/Modified

- `src/web/styles/globals.css` — all stylesheet clauses across the three tasks
- `test/web/visual-contract.test.ts` — new suite, 15 tests, extended across all three task commits
- `fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md` — new fixture content (Task 2)
- `test/__golden__/dense.json` — regenerated golden, confined to the one edited fixture file

## Decisions Made

- Kept `border: 0` / `background: transparent` on `.document-reference`'s base rule (native `<button>` chrome reset) rather than deleting them — the contract's "no border, no background" means none is *rendered*, and an explicit zero-value declaration achieves exactly that; deleting the properties would let default UA button chrome leak through instead.
- Left the pre-existing duplicate `.plan-section` / `.artifact-document pre` / `.artifact-document :not(pre) > code` rule-block pairs as two separate blocks in the stylesheet rather than consolidating them into one — the task scope was "apply these four retroactive changes to the named selectors," not a general stylesheet dedup pass, so both existing blocks were edited independently to keep the diff auditable against the plan's line-numbered `read_first` pointers.
- Removed the now-vestigial `box-shadow: none` override inside the `@media (max-width: 42rem) { .document-canvas { ... } }` block once the base rule stopped declaring a shadow at all (Rule 1 dead-code cleanup, not new behavior).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Dead code] Removed vestigial `box-shadow: none` from the `.document-canvas` mobile media query**
- **Found during:** Task 1
- **Issue:** After deleting `.document-canvas`'s base `box-shadow` declaration entirely, the `@media (max-width: 42rem)` override `box-shadow: none;` became a no-op referencing a property the base rule no longer sets.
- **Fix:** Removed the vestigial line, leaving the media query's `padding: 1rem;` override intact.
- **Files modified:** `src/web/styles/globals.css`
- **Verification:** `npm test`, `npm run build` both pass; no selector or behavior change beyond removing dead CSS.
- **Committed in:** `101eef9` (Task 1 commit)

### Sequencing note (not a deviation, documented for traceability)

Task 3's reference-trigger rewrite (`.document-reference` resting appearance, hover/focus states) was implemented and committed as part of Task 1's commit (`101eef9`) rather than Task 3's (`61328af`) — while reading the full stylesheet region for Task 1's nesting work, the adjacent `.document-reference` block was edited ahead of schedule. The code itself is correct and matches Task 3's specification exactly; only the task-to-commit boundary shifted. Task 3's commit (`61328af`) adds that rule's remaining test coverage (the region-scoped assertion in `test/web/visual-contract.test.ts`) alongside the tables/badges/outline-wrap work actually scoped to Task 3. All three commits pass their respective task's full `<verify>` and `<acceptance_criteria>` when checked against the final state.

---

**Total deviations:** 1 auto-fixed (dead code), 1 sequencing note (no functional impact).
**Impact on plan:** No scope creep — the dead-code removal is a strict improvement with zero behavior change, and the task/commit sequencing note reflects code that was always in the plan's stated scope, just committed one task-boundary earlier than labeled.

## Known Stubs

None. All stylesheet clauses are live declarations; the dense fixture's mermaid diagram is a real, renderer-recognized `flowchart TD` (not a placeholder), and the fenced 220-character line is a genuine unbroken token, not a synthetic short-line stand-in.

## Issues Encountered

None — all three tasks' `<verify>` and `<acceptance_criteria>` commands passed on first attempt after implementation, aside from the expected golden-snapshot diff in Task 2 (confirmed confined to the one edited fixture file per the task's own instructions, then regenerated).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All eight of this plan's `<verify>` commands pass: the new suite alone, the two existing suites with assertions over this stylesheet, the fixture edit's blast radius (golden + degradation), `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke -- fixtures/dense`.
- What these commands cannot decide, per the plan's own `<verification>` section: whether the scrollbar thumb is actually perceivable against the code background in each theme, whether the boxed-layer count along a real DOM path is at most two, and whether the reference trigger reads as interactive prose at rest. All three are authored as `backstop` truths in the coverage block above and are handed to plan 02-13's human gate, alongside whether the dense fixture's new `read_first`/`execution_context` wrapper tags actually render through the generic fallback (that behavior lives in plan 02-10's `segmentPlanBody` widening, a sibling wave-9 plan not yet merged into this worktree).
- No blockers for plan 02-13.

## Self-Check: PASSED

- `test/web/visual-contract.test.ts` — FOUND
- `src/web/styles/globals.css` — FOUND
- `fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md` — FOUND
- `test/__golden__/dense.json` — FOUND
- Commit `101eef9` — FOUND in git log
- Commit `65da62c` — FOUND in git log
- Commit `61328af` — FOUND in git log
- All 8 plan-level `<verification>` commands re-ran clean at self-check time (`test/web/visual-contract.test.ts`, `test/web/shell-contract.test.ts` + `test/presentation/coverage.test.ts`, `test/snapshot.golden.test.ts` + `test/degradation.test.ts`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run smoke -- fixtures/dense`)

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-30*
