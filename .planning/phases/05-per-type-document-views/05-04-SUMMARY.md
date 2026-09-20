---
phase: 05-per-type-document-views
plan: 04
subsystem: ui
tags: [intersection-observer, popover, base-ui, document-outline, react]

requires:
  - phase: 05-per-type-document-views
    provides: "05-01's DocumentOutline(entries, activeId) component and its already-accepted (but previously unused) activeId prop"
provides:
  - "pickActiveEntry — a pure (order, visible, previous) -> active-id picker, tested independently of the DOM"
  - "useActiveSection(ids) — a single-IntersectionObserver hook one caller uses for both Source-mode heading ids and View-mode view-block/view-remainder ids (D-11)"
  - "A single active outline entry (data-active='true') that tracks reading position in both ArtifactReader and ViewReader, with no URL/history side effects (Phase 2 D-16)"
  - "A narrow-width (<=58rem) sticky document-outline-trigger disclosure — On this page · {section} — opening a @base-ui/react Popover over the same <ol> the wide column renders (D-12), replacing the old in-flow @media rule (RESEARCH Pitfall 5)"
affects: [05-05-per-type-document-views, 05-06-per-type-document-views]

actuals:
  tokens: 5309
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Pure DOM-free picker + thin React hook seam (active-section.ts / use-active-section.ts) mirrors the existing scroll-settle.ts pattern: injected/observed state lives in the hook, the decision logic is a pure, independently-testable function"
    - "OutlineList extraction: one internal <ol> component rendered by both the wide sticky column and the narrow Popover popup, so the two presentations cannot drift apart"
    - "IntersectionObserver ids joined by '\\u0000' as the effect dependency key, since callers pass a freshly-mapped array every render — avoids re-creating the observer every render while still reacting to genuine id-list changes"

key-files:
  created:
    - src/web/views/active-section.ts
    - src/web/components/use-active-section.ts
    - test/web/active-section.test.ts
    - test/web/outline-contract.test.ts
  modified:
    - src/web/components/document-outline.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md

key-decisions:
  - "Active-band thresholds (root margin -10% 0px -70% 0px, threshold 0) are planner discretion per D-13 — a section counts as being read once any part of it crosses a band 10%-30% down the viewport; the generous negative bottom margin keeps a long section active until the next one actually enters the band."
  - "The squared active-entry bar uses --space-0-5 (2px), matching the plan's must_haves and the actual token value; UI-SPEC's own prose cites --space-1 but that token is 4px, not 2px — the plan's must_haves and the real token were treated as authoritative over the UI-SPEC prose."
  - "document-outline-positioner added to docs/design-language.md's Shared vocabulary table alongside the already-documented document-outline-trigger, so both new class names have a doc entry before test/web/class-vocabulary.test.ts runs against them."

patterns-established:
  - "One shared <ol> (OutlineList) feeding both a sticky column and a Popover popup, rather than two markup copies, is the established shape for any future dual wide/narrow presentation."

requirements-completed: [READ-07]

coverage:
  - id: D1
    description: "A single outline entry tracks reading position via IntersectionObserver, in both View and Source modes, with no URL rewrite"
    requirement: READ-07
    verification:
      - kind: unit
        ref: "test/web/active-section.test.ts#pickActiveEntry (adjacency, empty, fallback, purity)"
        status: pass
      - kind: unit
        ref: "test/web/outline-contract.test.ts#use-active-section.ts tracks intersection only, with no URL side effects"
        status: pass
    human_judgment: true
    rationale: "Real scroll-driven activation across a live document at real viewport heights is a perceptual/timing claim no unit test asserts — the plan's own must_haves list it as a `backstop` truth for the human-check gate."
  - id: D2
    description: "Below 58rem the sticky column is replaced by a document-outline-trigger disclosure opening a Popover over the same list, with no rule dropping the outline into normal flow"
    requirement: READ-07
    verification:
      - kind: unit
        ref: "test/web/outline-contract.test.ts#outline narrow-width CSS contract (Pitfall 5 fixed)"
        status: pass
      - kind: unit
        ref: "test/web/css-source-order.test.ts#reports zero findings against the live stylesheet"
        status: pass
    human_judgment: true
    rationale: "Trigger pinning, popover overlay behaviour, and keyboard focus return at real narrow viewports and both themes are visual/interaction claims the plan defers to a human-check step, per workflow.human_verify_mode: end-of-phase."

duration: 20min
completed: 2026-09-20
status: complete
---

# Phase 5 Plan 04: Reading-Position Outline + Narrow-Width Disclosure Summary

**A single `IntersectionObserver` now drives one active outline entry across both View and Source
modes, and below 58rem the sticky column is replaced by a `@base-ui/react` Popover-backed sticky
trigger — never the old in-flow `@media` rule RESEARCH.md's Pitfall 5 warned against.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files:** 8 touched (4 created, 4 modified)

## Accomplishments

- `pickActiveEntry` — a pure, DOM-free picker tested for READ-07's adjacency, empty, and
  ordering rules (first-visible-in-order wins; empty visibility keeps the previous entry or falls
  to the first; the outline order itself is never re-sorted by visibility).
- `useActiveSection` — one `IntersectionObserver` hook shared by `ArtifactReader` (Source-mode
  heading ids) and `ViewReader` (View-mode `view-block-N` / `view-remainder` ids), with zero
  `history`/`location`/hash writes (Phase 2 D-16 stays intact).
- `DocumentOutline` now renders both presentations from one `OutlineList`: the existing wide
  sticky column unchanged, plus a `document-outline-trigger` button ("On this page · {section}")
  that opens a `Popover.Positioner`/`Popup` over the identical `<ol>` markup.
- Replaced the `@media (max-width: 58rem)` rule that previously set `.document-outline { position:
  static }` (RESEARCH Pitfall 5) with `nav.document-outline { display: none }` +
  `.document-outline-trigger { display: flex }` — the outline is never flowed into normal
  document order at any width.
- `document-outline-positioner` documented in `docs/design-language.md`'s Shared vocabulary table.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reading-position tracking — pure picker, IntersectionObserver hook, active entry
   styling** - `ea1c7f7` (feat)
2. **Task 2: Narrow-width sticky disclosure — trigger, Popover, replaced ≤58rem CSS, outline
   contract test** - `4be64d8` (feat)

## Files Created/Modified

- `src/web/views/active-section.ts` — `pickActiveEntry`, `ACTIVE_SECTION_ROOT_MARGIN`,
  `ACTIVE_SECTION_THRESHOLD` (pure, no React/DOM imports)
- `src/web/components/use-active-section.ts` — `useActiveSection(ids)`, one
  `IntersectionObserver`, disposed on unmount
- `src/web/components/document-outline.tsx` — `OutlineList` extracted; wide column unchanged;
  narrow `document-outline-trigger` + `Popover` disclosure added
- `src/web/pages/artifact-page.tsx` — `useActiveSection` wired into `ArtifactReader` and
  `ViewReader`, `activeId` passed to `DocumentOutline`
- `src/web/styles/globals.css` — `data-active` link colour + squared left-gutter bar; the
  `.document-outline-trigger`/`.document-outline-positioner` rules; replaced ≤58rem media block
- `docs/design-language.md` — `document-outline-positioner` row added to Shared vocabulary
- `test/web/active-section.test.ts` — 7 tests covering `pickActiveEntry` and the exported
  constants
- `test/web/outline-contract.test.ts` — CSS/component text-scan contract pins (Pitfall 5 fixed,
  trigger sticky offset, ellipsis label, no URL side effects)

## Decisions Made

- Active-band thresholds are planner discretion (D-13): root margin `-10% 0px -70% 0px`,
  threshold `0`.
- The squared active-entry bar uses `--space-0-5` (2px) per the plan's `must_haves`, resolving a
  discrepancy with UI-SPEC's prose (which cites `--space-1`, actually 4px, not 2px).
- `document-outline-positioner` added to `docs/design-language.md` alongside the
  already-documented `document-outline-trigger`, satisfying `test/web/class-vocabulary.test.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stray unused `eslint-disable` directive on the hook's `useEffect` open line**
- **Found during:** Task 1
- **Issue:** An initial `eslint-disable-next-line react-hooks/exhaustive-deps` comment was placed
  above `useEffect(() => {` (the hook-open line) rather than above the dependency-array line
  where the rule actually needed suppressing; ESLint flagged it as an unused disable directive.
- **Fix:** Removed the stray comment; kept the single, necessary disable directly above the
  `[ids.join('\u0000')]` dependency array, with an explanatory comment on why reference-identity
  deps are wrong here (callers pass a freshly-mapped array every render).
- **Files modified:** `src/web/components/use-active-section.ts`
- **Verification:** `npx eslint src/web/components/use-active-section.ts` — clean, 0 problems.
- **Commit:** `ea1c7f7`

**2. [Rule 3 - Blocking] Stale plan-commit ledger sentinel from a prior, differently-shaped attempt at this plan**
- **Found during:** SUMMARY authoring (post-Task-2)
- **Issue:** The per-plan commit ledger file (`.git/gsd-plan-head-before-05-04`) already existed
  on disk before this execution began, holding a stale commit hash (`b58a888e…`, subject "docs
  (05-03): complete truthful presentation seams plan") from an apparent earlier/abandoned attempt
  whose history no longer matches the current `master` line. `git rev-list --count
  ${stale}..HEAD` returned 147 — far more than this plan's 2 real commits.
- **Fix:** Overwrote the ledger with the correct pre-Task-1 HEAD (`9c2de50…`, the actual parent of
  `ea1c7f7`), re-measured: `git rev-list --count 9c2de50..HEAD` → 2, matching the two task
  commits made in this execution.
- **Files modified:** `.git/gsd-plan-head-before-05-04` (not a tracked repository file)
- **Verification:** `git log --oneline 9c2de50..HEAD` shows exactly `ea1c7f7` and `4be64d8`.
- **Commit:** N/A (ledger file is outside the tracked working tree)

---

**Total deviations:** 2 auto-fixed (2 Rule 3 — blocking issues preventing accurate lint/reporting output)
**Impact on plan:** None on shipped functionality — both were tooling/measurement corrections, not
code-behaviour changes.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Human Verification Deferred

Per `workflow.human_verify_mode: end-of-phase`, Task 2's `<human-check>` (start a dev server on
`--port 4199`, scroll a real RESEARCH.md at ~1200px and ~600px in both themes, confirm active-entry
tracking, trigger pinning, popover overlay behaviour, and keyboard access) was not run inline
during this execution — it is deferred to the end-of-phase UAT pass, consistent with how prior
Phase 5 plans (05-01 through 05-03) handled their own human-check items.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

`useActiveSection`/`pickActiveEntry` and the extended `DocumentOutline` are drop-in for any
remaining per-type view plans that render an outline (05-05, 05-06) — no further wiring needed
beyond passing `entries`. Ready for 05-05.

---
*Phase: 05-per-type-document-views*
*Completed: 2026-09-20*

## Self-Check: PASSED

All created files verified present on disk; both task commits (`ea1c7f7`, `4be64d8`) verified
present in git history.
