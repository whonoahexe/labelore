---
phase: quick-261022-ms1
plan: 01
subsystem: traceability
tags: [traceability, milestones, presentation, react]
requires: []
provides:
  - TraceabilityViewModel.archivedMilestones (newest first, rows resolved against each archive's own phases)
  - Previous milestones section on the traceability page
  - Between-milestones state (note instead of 0% summary, newest archive opened)
affects: [/api/traceability, traceability page]
key-files:
  modified:
    - src/planning-repo/crossref.ts
    - src/presentation/roadmap.ts
    - src/presentation/traceability.ts
    - src/web/pages/traceability-page.tsx
    - src/web/styles/globals.css
    - test/presentation/traceability.test.ts
    - test/web/traceability-redesign-contract.test.ts
decisions:
  - Archived rows resolve only against the archived milestone with the same version; a live milestone is never used.
status: complete
metrics:
  completed: 2026-10-22
actuals:
  tasks: 2
  commits: 2
plan_head_before: 1e24f6b955f68de4721e901ec01dbe3ff22b3a2e
plan_head_after: e43791a01c3a77f4ec9c5cf48702bd1ff0f5cfdd
---

# Quick 261022-ms1: Previous milestones on the traceability page Summary

The traceability page now lists each archived milestone's requirements under "Previous milestones", and when a project has no current requirements it swaps the empty 0% summary for a note and opens the newest archive.

## What changed

- `buildTraceabilityViewModel` gains `archivedMilestones`. It reads only the presentation DTO (the `milestone-root` requirements artifacts and the archived milestones), guards every shape, and sorts newest version first. Titles come from MILESTONES.md, then the archived milestone's name, then the bare version.
- Each "Phase N" cell is read with the same `phaseNumberFromTraceabilityText` rule as the live path (now exported) and resolved against that archive's own phases.
- The page adds a collapsed disclosure per archive below the deferred section. When `groups` is empty and archives exist, the summary and filters are hidden, an `empty-note` explains, and the newest disclosure opens once (the effect only assigns `open = true`).
- CSS: `.trace-category > h3` shares the heading gap, and `.trace-category:first-child` has `margin-top: 0`. No history selector was added.

## Verification

- Pre-existing view-model fields are deep-equal with and without the archives (fixtures/dense). A temp copy of dense with root REQUIREMENTS.md removed gives empty groups, two archives, and the same data over GET /api/traceability.
- Typecheck, `npm run lint` and eslint on touched files pass.
- Scratch smoke on labelore's own `.planning/` (port 5311, stopped): `groups` length 0, archives v1.1 (v1.1 Legible Documents, 11) then v1.0 (v1.0 MVP, 45), v1.1 covering phases resolve to the archived v1.1 phase 05.
- The manual visual check from the plan (light and dark, link targets, refetch-keeps-closed) was not run; it needs the restarted service.

## Test results (full suite)

Before (base): 4 failed. `coverage.test` "renders the matrix before both complete documents", `ascii-graph` "┌─ grid" timing, `security-register` 1 MB timing, `token-guard` "zero violations outside the token blocks".

After: 5 failed. The same four, plus `ascii-graph` "┌┐ over ││ rows" timing bound. That one is a timing flake and the plan's baseline lists ascii-graph and ascii-lift timing bounds among the five known failures. No new non-timing failure. The token-guard failure lists the same three declarations (`.view-plan-nav-body :not(pre) > code`, `.view-plan-nav-checks li::before`, `.view-ui-review-found-card .view-ui-review-item-text code`); only line numbers moved.

## Deviations from Plan

None. The between-milestones sentence is on one line in the JSX so the contract test can match it exactly.

## Known Stubs

None.

## Self-Check: PASSED

Commits b897b58 and e43791a exist; touched files present.
