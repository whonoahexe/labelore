---
phase: quick-260912-oae
plan: 01
subsystem: ui
tags: [dashboard, progress-panel, checkpoints, status-consolidation, plan-breakdown]

requires:
  - phase: quick-260912-lfi
    provides: dashboard item rendering and anchor navigation
provides:
  - checkpoint-aware PlanDto.complete and preserved blocking-human checkpoints in presentation.checkpoints
  - unified phase status consolidation ('Awaiting Checkpoint' | 'Complete' | 'In Progress') and plan count breakdown
  - revamped progress panel UI with unified status chip, breakdown pills, and active checkpoint callout linking to blocking plan
affects: [project-presentation.ts, dashboard.ts, dashboard-page.tsx, globals.css]

actuals:
  tokens: 15400
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Exclusion of awaiting-checkpoint summaries from plan completion to prevent false completion signals"
    - "Preservation of blocking-human checkpoints when plan summaries are in awaiting-checkpoint state"
    - "Consolidated phase status and plan breakdown replacing conflicting formal/observed badges"
    - "Design-token compliant plan-pill and checkpoint-callout styling with strict CSS token validation"

key-files:
  created: []
  modified:
    - src/server/project-presentation.ts
    - src/presentation/dashboard.ts
    - src/web/pages/dashboard-page.tsx
    - src/web/styles/globals.css
    - test/server/project-presentation.test.ts
    - test/presentation/dashboard.test.ts

key-decisions:
  - "D-01: Plans with SUMMARY.md containing status: awaiting-checkpoint are not complete: true, blocking downstream dependents until checkpoint approval"
  - "D-02: Pending blocking-human checkpoints are retained in presentation.checkpoints when a summary exists with status: awaiting-checkpoint"
  - "D-03: Dashboard completion provides a consolidated phaseStatus ('Awaiting Checkpoint' when any plan is paused for human review, else In Progress or Complete) and plan count breakdown"
  - "D-04: Progress panel eliminates confusing raw disk-vs-roadmap summary comparison and false discrepancy callouts, replacing them with a unified plan breakdown and active checkpoint callout banner"

requirements-completed: [OAE-01, OAE-02, OAE-03]

coverage:
  - id: D1
    description: "Checkpoint awareness in project-presentation and downstream dependency blocking"
    requirement: "OAE-01"
    verification:
      - kind: unit
        ref: "test/server/project-presentation.test.ts#keeps complete false and preserves blocking-human checkpoints when plan summary has status awaiting-checkpoint"
        status: pass
  - id: D2
    description: "Phase status consolidation, plan counts breakdown, and active checkpoint surfacing in dashboard view model"
    requirement: "OAE-02"
    verification:
      - kind: unit
        ref: "test/presentation/dashboard.test.ts#phase completion consolidation and plan counts"
        status: pass
  - id: D3
    description: "Revamped progress panel rendering unified status, plan counts, and blocking checkpoint callout"
    requirement: "OAE-03"
    verification:
      - kind: visual
        ref: "test/web/visual-contract.test.ts"
        status: pass
      - kind: token
        ref: "test/token-guard.test.ts"
        status: pass
---

# Quick 260912-oae: Revamp progress panel to show phase and checkpoints clearly - Summary

## Overview
Revamped `gsd-lore`'s progress panel and completion modeling to accurately reflect execution reality:
1. **Checkpoint Awareness in `project-presentation.ts`**: Plans whose `SUMMARY.md` has `status: awaiting-checkpoint` are no longer marked `complete: true`. Pending blocking-human checkpoints are preserved in `presentation.checkpoints`, ensuring downstream dependent plans remain blocked until the checkpoint is reviewed.
2. **Phase Status & Plan Breakdown Consolidation in `dashboard.ts`**: Consolidated dual contradictory badges (`incomplete` vs `in_progress`) into a single truthful `phaseStatus` (`Awaiting Checkpoint` when any plan is awaiting human verification; otherwise `In Progress`, `Complete`, or appropriate disk status). Derived clean `counts` (`completed`, `awaitingCheckpoint`, `remaining`, `total`) and surfaced `activeCheckpoint` pointing to the blocking plan.
3. **Revamped Progress Panel in `dashboard-page.tsx` & `globals.css`**: Rendered the consolidated status chip with valid semantic tone (`active` / `complete` / `quiet`), unified plan breakdown with breakdown pills, and an active checkpoint callout banner with direct link to the blocking plan. Eliminated the confusing raw disk-vs-roadmap summary count comparison and false discrepancy alert.

## Verification
- `test/server/project-presentation.test.ts`: passes (9/9).
- `test/presentation/dashboard.test.ts`: passes (32/32).
- `test/token-guard.test.ts`: passes (6/6) with zero violations.
- `test/web/visual-contract.test.ts`: passes (72/72).
- Full test suite: passes (688/688).
- `npm run typecheck`: passes with 0 errors.
- `npm run build`: built production assets in 582ms.
