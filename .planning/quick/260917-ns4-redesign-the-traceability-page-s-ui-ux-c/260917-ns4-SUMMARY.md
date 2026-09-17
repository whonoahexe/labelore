---
phase: quick-260917-ns4
plan: 01
subsystem: ui
tags: [react, traceability, coverage-projection, accessibility, css-tokens]

requires:
  - phase: 03-search-browsing-traceability
    provides: buildTraceabilityViewModel, matchesTraceabilityFilter, the /traceability page and its /api/traceability endpoint
provides:
  - "TraceabilityCoverage partition (covered/mismatched/uncovered/coveragePercent) at whole-view and per-category scope, sourced from one shared coverageOf() helper"
  - "Redesigned /traceability page: at-a-glance summary strip (percentage, aggregate bar, stat tiles, filter controls in one bordered panel), per-category proportional bars, hierarchical row list replacing the ruled table"
  - "Deferred (non-active-tier) requirements grouped by tier and rendered inside roadmap-page.tsx's reused History disclosure treatment, gated by an off-by-default includeHistory filter toggle"
affects: [traceability, requirements, ui-redesign]

actuals:
  tokens: 13687
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Shared coverageOf() partition helper consumed by both whole-view and per-group coverage — the two figures can never structurally drift"
    - "Proportional bar as a labelled role=img container with aria-hidden segments, reused across aggregate and per-category scopes"
    - "Reuse-by-class-name for collapsible disclosure (.history-section/.history-milestone/.history-tree), no new collapsible CSS introduced"
    - "Disclosure auto-open effect driven by toggle state + match count (not a fire-once guard) — opens automatically, never force-closes"

key-files:
  created:
    - test/web/traceability-redesign-contract.test.ts
  modified:
    - src/presentation/traceability.ts
    - src/web/pages/traceability-filter.ts
    - src/web/pages/traceability-page.tsx
    - src/web/styles/globals.css
    - test/presentation/traceability.test.ts

key-decisions:
  - "History section groups deferred rows by tier string alone (not milestone) — the archived per-milestone REQUIREMENTS.md corpora never reach this projection, confirmed at plan time by tracing RequirementsHandler.match's root-only file acceptance"
  - "Per-category bar placed beneath the h2 rather than inline with it, using the heading's existing bottom margin as the gap"
  - "Stat tiles and both bar scopes always read unfiltered projection fields (view.coverage / group.coverage), never a filtered-row recount, so the proportion cue never shrinks as the user types"
  - "Disclosure effect only ever sets open=true, never open=false — a tier a user opened by hand stays open even after the history toggle switches back off"

requirements-completed: [NS4-01, NS4-02, NS4-03, NS4-04, NS4-05, NS4-06]

coverage:
  - id: D1
    description: "At-a-glance coverage summary strip (percentage, aggregate three-segment bar, total/uncovered/mismatch counts) hosting the search and status filter controls in one bordered panel"
    requirement: "NS4-01"
    verification:
      - kind: unit
        ref: "test/presentation/traceability.test.ts#TraceabilityCoverage (NS4 Task 1)"
        status: pass
      - kind: other
        ref: "test/web/traceability-redesign-contract.test.ts#traceability redesign — summary strip (NS4-01, NS4-04, D-02, Task 1)"
        status: pass
    human_judgment: true
    rationale: "Source-contract tests pin markup/ARIA shape and data source, but legibility and proportion-at-a-glance are perceptual claims only a human can confirm in a real browser, per Task 3's own <human-check> block covering the whole redesign."
  - id: D2
    description: "Per-category three-segment proportional bar sourced from that category's own unfiltered coverage, and a hierarchical row list (ID/text primary, status/covering-phase secondary) replacing the former ruled table"
    requirement: "NS4-02"
    verification:
      - kind: unit
        ref: "test/presentation/traceability.test.ts#TraceabilityGroup.coverage (NS4 Task 2)"
        status: pass
      - kind: other
        ref: "test/web/traceability-redesign-contract.test.ts#traceability redesign — per-category bars and hierarchical rows (NS4-02, NS4-05, D-01, Task 2)"
        status: pass
    human_judgment: true
    rationale: "Contract tests prove no tabular markup remains and the bar reads group.coverage, but whether a category 'looks' mostly-covered vs mostly-uncovered at a glance is a visual claim reserved for the plan's human-check gate."
  - id: D3
    description: "Deferred/non-active-tier requirements grouped by tier and rendered inside the reused History disclosure treatment, with an off-by-default includeHistory toggle governing both filtering and auto-open"
    requirement: "NS4-03"
    verification:
      - kind: unit
        ref: "test/presentation/traceability.test.ts#deferredTiers (NS4 Task 3), #includeHistory filter axis (NS4 Task 3)"
        status: pass
      - kind: other
        ref: "test/web/traceability-redesign-contract.test.ts#traceability redesign — deferred tiers under the reused History treatment (NS4-03, NS4-04, D-03, Task 3)"
        status: pass
    human_judgment: true
    rationale: "Unit and source-contract tests prove the grouping, filter-gating and disclosure-open logic, but the collapsed-by-default look-and-feel match to roadmap-page.tsx's archived-milestone treatment is a visual claim in Task 3's <human-check>, not yet run against a live browser."
  - id: D4
    description: "includeHistory toggle: off leaves deferred tiers unfiltered and closed; on extends the query/status filter to them and opens any tier holding a match"
    requirement: "NS4-04"
    verification:
      - kind: unit
        ref: "test/presentation/traceability.test.ts#includeHistory filter axis (NS4 Task 3) Test 3-5"
        status: pass
    human_judgment: false
  - id: D5
    description: "Requirement rows read as ID/text-primary, status/covering-phase-secondary hierarchy rather than a four-column ruled grid"
    requirement: "NS4-05"
    verification:
      - kind: other
        ref: "test/web/traceability-redesign-contract.test.ts#emits no tabular row markup anywhere in the page"
        status: pass
    human_judgment: true
    rationale: "The absence of table markup is proven mechanically; that the remaining markup genuinely reads as a visual hierarchy is the perceptual claim in the plan's human-check gate."
  - id: D6
    description: "Status chip treatments and the four pre-existing gate suites (token-guard, visual-contract, empty-state-contract, loading-state-contract) remain byte-identical/unedited and green"
    requirement: "NS4-06"
    verification:
      - kind: unit
        ref: "npx vitest run test/token-guard.test.ts test/web/visual-contract.test.ts test/web/empty-state-contract.test.ts test/web/loading-state-contract.test.ts"
        status: pass
      - kind: other
        ref: "git diff --stat on the four gate files (empty)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-17
status: complete
---

# Quick Task 260917-ns4: Redesign the traceability page's UI/UX Summary

**Traceability page redesign: an at-a-glance coverage summary strip with an aggregate three-segment
bar and stat tiles hosting the filter controls, per-category proportional bars, a hierarchical row
list replacing the ruled table, and deferred/future-tier requirements grouped by tier inside the
roadmap page's reused History disclosure — gated by an off-by-default includeHistory filter toggle.**

## Performance

- **Duration:** ~20 min (task commits span 17:27–17:38 local time; harness restarted once mid-run,
  work resumed from the last committed task with no rework)
- **Tasks:** 3/3 completed
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments

- `TraceabilityCoverage` — a disjoint covered/mismatched/uncovered partition with a whole-number
  `coveragePercent`, derived by one shared `coverageOf()` helper consumed at both whole-view and
  per-category scope, so the two can never structurally drift apart
- Redesigned `/traceability`: a bordered `trace-summary` panel holds the coverage percentage, an
  aggregate three-segment proportional bar (`role="img"`, aria-hidden segments), three stat tiles,
  and the (now-nested) search/status filter controls — replacing the previously detached filter bar
- Each category section carries its own proportional bar sourced from that category's own unfiltered
  coverage, placed beneath its heading
- The former four-column ruled table (`TraceabilityTable`/`TraceabilityRowCells`) is gone, replaced
  by `TraceabilityRowList` — a hierarchical `<ul>` where ID + requirement text form the primary line
  and status/covering-phase form a micro-labelled secondary block; collapses to one column under 42rem
- `TraceabilityDeferredTier` groups non-active-tier requirements by their raw tier string in
  first-appearance order; rendered inside `roadmap-page.tsx`'s reused `.history-section` /
  `.history-milestone` / `.history-tree` treatment (same class names, same ChevronRight/History
  glyphs, same ref-plus-effect disclosure idiom) with zero new collapsible CSS
- A new `includeHistory` filter axis (default `false`) governs both whether the query/status filter
  reaches the deferred tiers and whether a matching tier auto-opens; the underlying disclosure effect
  only ever opens a tier, never force-closes one a user opened by hand

## Task Commits

Each task was committed atomically:

1. **Task 1: Coverage summary strip, end to end** - `9a8b6e4` (feat)
2. **Task 2: Per-category proportion bars and a hierarchical row layout** - `c613ec9` (feat)
3. **Task 3: Deferred tiers under the history treatment, with the opt-in filter axis** - `a06e2b8` (feat)

_Plan metadata (SUMMARY.md, STATE.md) is committed separately by the orchestrator, not by this executor._

## Files Created/Modified

- `src/presentation/traceability.ts` - Added `TraceabilityCoverage`, `coverageOf()`, per-group
  `coverage`, and `TraceabilityDeferredTier`/`deferredTiers`
- `src/web/pages/traceability-filter.ts` - Added `includeHistory` to `TraceabilityFilterState` and
  the `matchesDeferredTraceabilityFilter` delegate predicate
- `src/web/pages/traceability-page.tsx` - Summary strip, `CoverageBar`, `TraceabilityRowList`,
  `DeferredTierDisclosure`, history-toggle wiring; removed the old table components
- `src/web/styles/globals.css` - New `.trace-summary`/`.trace-bar`/`.trace-stat-tiles`/`.trace-rows`/
  `.trace-row`/`.trace-category-bar` rule sets, all token-sourced; no new `.history-*` rule
- `test/presentation/traceability.test.ts` - Unit coverage for the partition, per-group coverage,
  deferred-tier grouping and the `includeHistory` filter axis (29 tests total in this describe set)
- `test/web/traceability-redesign-contract.test.ts` (new) - Source-level contract pinning the
  redesign's markup/ARIA shape and CSS invariants across all three tasks

## Decisions Made

- History section groups deferred rows by tier string alone, per the plan's own discretion
  resolution — confirmed at plan time that the archived per-milestone `REQUIREMENTS.md` corpora never
  reach this projection (`RequirementsHandler.match` accepts only root-located files)
- Category bars and stat tiles always read the projection's own unfiltered fields, never a filtered
  recount — consistent with the pre-existing status-filter-button count behaviour
- The disclosure auto-open effect is asymmetric by design: it sets `open = true` when the toggle is
  on and a tier has matches, and never sets `open = false` — a user-opened tier stays open regardless
  of later toggle/query changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, incidental] Reverted two unrelated `prettier --write` reformats in globals.css**
- **Found during:** Task 3, running `npx prettier --check` per the plan's own verify command
- **Issue:** Running `prettier --write` on the whole `globals.css` file (to format this plan's own
  new rules) also reformatted two pre-existing, unrelated blocks: the QQK scrollbar `:is(...)`
  selector (wrapped from one line to eleven) and an `.attention-pagination button` transition
  property. The scrollbar selector's single-line form is exactly what
  `test/web/visual-contract.test.ts`'s `ruleBlocks()` helper matches by exact selector-line text —
  wrapping it broke two hard-gate assertions (`gives the 11 bounded containers a small constant
  Firefox bar` / `...4px WebKit scrollbar track`).
- **Fix:** Manually reverted the `:is(...)` selector back to its original single-line form (the
  `.attention-pagination` transition rewrap was harmless — no test pins its exact line-wrapping — and
  was left as prettier produced it).
- **Files modified:** `src/web/styles/globals.css`
- **Verification:** Full suite re-run green (788/788); `git diff` on the four gate files stayed empty.
- **Committed in:** `a06e2b8` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, incidental formatting regression caught and reverted
before commit)
**Impact on plan:** No scope creep — the fix only restored pre-existing formatting the plan's own
`prettier --write` invocation had incidentally disturbed.

## Pre-existing gap surfaced (not fixed, out of scope)

`npx prettier --check src/web/styles/globals.css` fails and **will continue to fail** independent of
this plan. Confirmed against the base commit (`0172a7c`, before any NS4 change) that this file was
already not prettier-clean: Prettier's CSS printer normalizes string/attribute-selector quotes to
double quotes regardless of the project's `singleQuote: true` config (a documented Prettier
limitation — `singleQuote` only applies to JS/TS/JSX, not CSS), while
`test/web/visual-contract.test.ts` and other gate suites pin dozens of pre-existing selectors in
single-quoted form (e.g. `.status-chip[data-tone='destructive']`,
`.trace-filter-button[data-active='true']`) via exact selector-line matching. Converting the whole
file to double quotes would break those hard-gate tests; leaving it single-quoted means the file can
never pass a bare `prettier --check`. This is a structural, pre-existing tension between the
project's CSS-source-pinning test idiom and Prettier's CSS defaults — unrelated to this plan's
changes. All of this plan's own new CSS rules are individually prettier-clean (verified: none appear
in the diff between the current file and a full `prettier --write` pass).

## Issues Encountered

The harness restarted once mid-run, after Task 1 was committed and while Task 2's `traceability.ts`
edit was in progress (the `TraceabilityGroup` interface had been temporarily removed pending
re-insertion with the new `coverage` field). On resume: verified via `git status`/`git log` that
Task 1's commit (`9a8b6e4`) had landed cleanly and no `SUMMARY.md` existed yet, then continued the
in-progress edit from where it left off rather than redoing Task 1. No rework was needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The redesigned `/traceability` page is feature-complete against all six `must_haves.truths` and the
  plan's `<success_criteria>`; automated verification (unit tests, source contracts, typecheck, lint,
  the four pre-existing gate suites) is fully green.
- **Outstanding:** Task 3's `<human-check>` block (and, more broadly, the perceptual claims underlying
  coverage items D1/D2/D3/D5 above) has not yet been run against a live browser in both light and dark
  themes. No `type="checkpoint:*"` task existed in this plan to force a stop for it, so it was not
  blocking — but a human should start the dev server against this repo's own `.planning` and confirm
  the five items Task 3's `<human-check>` names (summary-strip legibility, bar segment
  distinguishability, row hierarchy, deferred-tier collapsed-by-default look, and the toggle's
  filter/open behavior) before considering this redesign fully signed off.

---
*Phase: quick-260917-ns4*
*Completed: 2026-09-17*

## Self-Check: PASSED

All claimed files found on disk; all three claimed task commits (`9a8b6e4`, `c613ec9`, `a06e2b8`)
found in `git log --oneline --all`.
