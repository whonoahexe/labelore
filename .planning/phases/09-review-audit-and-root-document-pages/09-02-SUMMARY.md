---
phase: 09-review-audit-and-root-document-pages
plan: 02
subsystem: ui
tags: [react, traceability, requirements, url-state, vitest]

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "09-01 check that REQUIREMENTS.md out-of-scope rows were listed by no page"
provides:
  - "Traceability opens on any of four requirement states from ?state= and ?milestone="
  - "requirementStateCounts: the one function the project page tiles (09-07) call"
  - "Out-of-scope rows listed under their state"
  - "Each previous milestone carries its ship date as shipped (for 09-06's Shipped mark)"
affects: [09-06, 09-07]

plan_head_before: f7bba6d9c719752ccd67721d018c28d2ec6dec05
plan_head_after: b31bb6077e40ae22bf1272aead58b78361fd080c

actuals:
  tokens: 40000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A page seeds its filter once from location.search and holds the user's choice beside the address it was made under; it never writes the address"
    - "State counts and the state axis share one predicate (requirementStateOf)"

key-files:
  created:
    - test/web/traceability-seed.test.ts
  modified:
    - src/presentation/traceability.ts
    - src/web/pages/traceability-filter.ts
    - src/web/pages/traceability-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/fixtures/lendshed/.planning/REQUIREMENTS.md
    - test/presentation/traceability.test.ts
    - test/web/traceability-redesign-contract.test.ts

key-decisions:
  - "Seeded filter: a complete or pending state paired with any milestone other than the current one, or with a rejected milestone, opens unfiltered; validated keeps its state and drops a rejected milestone; out-of-scope ignores the milestone"
  - "The user's choice is stored with the search string it was made under, so following an in-app link to another ?state= re-seeds instead of being shadowed by an earlier click"
  - "The archived disclosure's closed-by-default guard in the redesign contract test was rewritten to allow the single open={open} prop that defaults to false"

patterns-established:
  - "projectedArchiveVersion is the single predicate for 'this artifact is a projected archive'; archivedMilestoneOf and the counts both use it"

requirements-completed: [VIEW-07]

duration: 25min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 02: Traceability requirement states Summary

**/traceability opens on complete, pending, shipped-before or out-of-scope requirements from its address, with counts from one function (requirementStateCounts), a new out-of-scope list, and ship dates on previous milestones.**

## Accomplishments
- `?state=complete|pending|validated|out-of-scope` and `?milestone=` are read once on arrival through `seedTraceabilityFilter`; unrecognised values are ignored silently and the page opens unfiltered. The page never writes the address.
- A "Filter by state" button group (All, Complete, Pending, Shipped before, Out of scope) beside the existing status group; each button is disabled when its count is 0.
- `requirementStateCounts(presentation)` gives complete/pending from the active tier's own checkboxes, validated from projected archives (with per-milestone breakdown), out of scope from the root REQUIREMENTS.md table. Lendshed: 18 complete, 6 pending, 20 validated (v1.0), 2 out of scope, milestone v1.1. A test plants PROJECT.md Validated/Active/Out of Scope bullets and asserts nothing changes.
- The Shipped before state opens the previous-milestone disclosures (all, or only the one `?milestone=` names); Out of scope renders a hairline-ruled `trace-out-of-scope` list (feature, then reason through `LeadText`).
- `TraceabilityArchivedMilestone.shipped` carries MILESTONES.md's label ('20 Mar 2026' for Lendshed v1.0).

## Task Commits
1. **Task 1: /traceability?state=pending opens on the pending requirements** - `6dc7691` (feat)
2. **Task 2 RED: state counts, out-of-scope rows, ship dates tests + Lendshed Out of Scope table** - `3b68e11` (test)
3. **Task 2 GREEN: counts, out-of-scope list, archive ship dates, CSS and design-language row** - `b31bb60` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Out-of-scope view-model field added in Task 1, not Task 2**
- **Found during:** Task 1 (state buttons disable on a 0 count)
- **Issue:** the Out of scope button needs `view.outOfScope.length`, which the plan introduced only in Task 2.
- **Fix:** `outOfScope` and `TraceabilityOutOfScopeRow` landed with Task 1's view-model changes; Task 2's tests cover them.
- **Committed in:** 6dc7691

**2. [Rule 1 - Bug] Redesign contract test forbade any `open` on the archived `<details>`**
- **Found during:** Task 2 (full gate run)
- **Issue:** the "starts closed" guard in `test/web/traceability-redesign-contract.test.ts` matched the required `open={open}` prop.
- **Fix:** the guard now asserts the prop defaults to `false` and that `open={open}` is the only open attribute.
- **Files modified:** test/web/traceability-redesign-contract.test.ts
- **Committed in:** b31bb60

**3. [Rule 3 - Blocking] Existing test helper `filterState`** in test/presentation/traceability.test.ts built a literal state without the new fields; it now spreads `DEFAULT_TRACEABILITY_FILTER` (committed in 6dc7691).

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking). No scope creep.

## Issues Encountered
- The worktree had no `node_modules`; a symlink to the main checkout's was used for runs. Because the symlink is an untracked entry, `test/fixture-leak.test.ts` fails with EISDIR in this worktree only (it lists untracked files); this is an environment artifact, and my fixture and test text contain no deny-list word. It was not committed.
- `systemctl --user restart labelore` restarts the service that serves the main checkout, so it does not load this worktree's build; the orchestrator should rebuild and restart after merging.

## Deferred Issues (out of scope, not caused by this plan)
- `test/web/ui-spec-corpus.test.ts` (2 failures) and `test/web/pattern-map-corpus.test.ts` (1 failure): the new Phase 9 planning docs (`09-UI-SPEC.md`, `09-PATTERNS.md`) have no pinned entries in those corpus guards. Phase-level planning artifacts, untouched by this plan.

## Known Stubs
None.

## Threat Flags
None. T-09-03 (address values accepted only by exact match against the fixed state list and the payload's own versions, nothing rendered or written back) and T-09-04 (out-of-scope text rendered as React text through `LeadText`/`stripEmoji`) are mitigated as planned.

## Next Phase Readiness
- 09-07 can call `requirementStateCounts` and link tiles with `traceabilityStateUrl(state, milestone)`.
- 09-06 can read `archive.shipped` and `projectedArchiveVersion`.

## Self-Check: PASSED
- Files exist: test/web/traceability-seed.test.ts, 09-02-SUMMARY.md
- Commits 6dc7691, 3b68e11, b31bb60 are ancestors of HEAD
- Gate (traceability, class-vocabulary, css-source-order, token-guard, redesign contract): all green; typecheck and lint exit 0; build ok; service active.
