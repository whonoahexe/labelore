# Quick Task 260912-oae: revamp progress panel to show phase and checkpoints clearly - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning

<domain>
## Task Boundary

Revamp the progress-panel in `gsd-lore` to present a single truthful phase status, surface active human checkpoints, eliminate contradictory badges ('incomplete' vs 'in_progress'), and replace confusing roadmap-vs-disk count comparisons with a unified plan breakdown.

</domain>

<decisions>
## Implementation Decisions

### Checkpoint Awareness
- Plans whose `SUMMARY.md` has `status: awaiting-checkpoint` must be treated as awaiting-checkpoint (not complete).
- In `src/server/project-presentation.ts`, pending human checkpoints must be preserved and included in `presentation.checkpoints` even if a summary file exists on disk, as long as the summary status is `awaiting-checkpoint`.
- Downstream plans depending on a plan awaiting a checkpoint must remain blocked and not be marked as ready in `nextWork`.

### Status Consolidation
- Replace dual conflicting badges (`formal.status: incomplete` and `observed.status: in_progress`) in the progress-panel with a single coherent phase status.
- When any plan in the active phase is paused for human verification or has `status: awaiting-checkpoint`, the phase status displays `Awaiting Checkpoint` (or `Waiting on Checkpoint`).
- Otherwise, display `In Progress`, `Complete`, or appropriate disk status.

### Plan Breakdown & Discrepancy Elimination
- Eliminate the confusing raw comparison ("5 of 16 plans" vs "Files on disk · 7 of 16 summaries present" and the scary "Roadmap and observed completion disagree" callout).
- Present a single unified plan breakdown (e.g. 5 Done, 2 In Review, 9 Remaining / 16 total).
- Retain phase identification in position-copy as already provided; leave exact visual layout, styling, and typography to the planner's discretion.

</decisions>

<specifics>
## Specific Ideas
- `src/server/project-presentation.ts`:
  - `complete`: A plan is complete only if `summary !== null` AND `summary.frontmatter?.status !== 'awaiting-checkpoint'`.
  - `checkpoints`: Do not suppress checkpoints when `plan.summary !== null` if the summary is in `awaiting-checkpoint` state.
- `src/presentation/dashboard.ts`:
  - Consolidate phase status logic in `buildDashboardViewModel` so the completion signals provide a clear unified status.
  - Expose plan counts: completed, awaiting-checkpoint, and remaining.
  - Surface active checkpoints so `checkpointWork` can recommend human verification when a plan is paused at a checkpoint.
- `src/web/pages/dashboard-page.tsx`:
  - Revamp `.progress-panel` to render the unified status badge, clear segmented progress / plan counts, and direct action/link to any active checkpoint.

</specifics>

<canonical_refs>
## Canonical References
- `src/presentation/dashboard.ts`
- `src/web/pages/dashboard-page.tsx`
- `src/server/project-presentation.ts`
- `src/planning-repo/assemble.ts`
</canonical_refs>
