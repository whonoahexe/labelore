---
phase: quick-260912-oae
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/server/project-presentation.ts
  - src/presentation/dashboard.ts
  - src/web/pages/dashboard-page.tsx
  - src/web/styles/globals.css
  - test/server/project-presentation.test.ts
  - test/presentation/dashboard.test.ts
autonomous: true
requirements: [OAE-01, OAE-02, OAE-03]

must_haves:
  truths:
    - "Plans whose SUMMARY.md has status: awaiting-checkpoint are not marked as complete: true in project-presentation (OAE-01)"
    - "Pending blocking-human checkpoints are preserved in presentation.checkpoints even when a SUMMARY.md exists on disk if its status is awaiting-checkpoint (OAE-01)"
    - "Downstream plans depending on an awaiting-checkpoint plan remain blocked and are not promoted to ready next work (OAE-01)"
    - "Dashboard completion replaces dual conflicting badges ('incomplete' vs 'in_progress') with a single truthful phaseStatus (e.g. 'Awaiting Checkpoint', 'In Progress', 'Complete') (OAE-02)"
    - "Dashboard completion provides a clean, unified plan breakdown (completed, awaitingCheckpoint, remaining, total) replacing raw roadmap-vs-disk count disagreements (OAE-02)"
    - "Dashboard page renders the revamped progress panel with unified status chip, breakdown pills, and an active checkpoint callout linking to the blocking plan when human review is pending (OAE-03)"
    - "All CSS updates strictly use design tokens (--space-*, --fs-*, --fw-*, --lh-*, --ls-*, color tokens) with zero violations in test/token-guard.test.ts (OAE-03)"
    - "Full test suite, typecheck, and production build succeed (npm run build)"
  artifacts:
    - path: "src/server/project-presentation.ts"
      provides: "Checkpoint-aware PlanDto.complete and preserved blocking-human checkpoints in presentation.checkpoints"
    - path: "src/presentation/dashboard.ts"
      provides: "Phase status consolidation, unified plan breakdown counts, and active checkpoint surfacing in DashboardViewModel"
      exports: ["buildDashboardViewModel", "DashboardViewModel", "PhasePlanCounts", "PhaseProgressCheckpoint"]
    - path: "src/web/pages/dashboard-page.tsx"
      provides: "Revamped progress panel rendering unified status, plan counts, and blocking checkpoint callout"
    - path: "src/web/styles/globals.css"
      provides: "Token-compliant responsive styles for revamped progress panel, breakdown pills, and checkpoint callouts"
  key_links:
    - from: "src/presentation/dashboard.ts"
      to: "src/server/project-presentation.ts"
      via: "Consumes PlanDto.complete and presentation.checkpoints to determine phase status, plan counts, and active checkpoints"
      pattern: "presentation\\.checkpoints|plan\\.complete"
    - from: "src/web/pages/dashboard-page.tsx"
      to: "src/presentation/dashboard.ts"
      via: "Renders view.completion.phaseStatus, view.completion.counts, and view.completion.activeCheckpoint"
      pattern: "view\\.completion\\.phaseStatus|view\\.completion\\.counts|view\\.completion\\.activeCheckpoint"
---

# Quick 260912-oae: Revamp progress panel to show phase and checkpoints clearly

<objective>
Revamp the progress panel in `gsd-lore` to present a single truthful phase status, surface active human checkpoints, eliminate contradictory badges ('incomplete' vs 'in_progress'), and replace confusing roadmap-vs-disk count comparisons with a clean, unified plan breakdown.

Locked user decisions:
- Plans whose `SUMMARY.md` has `status: awaiting-checkpoint` must NOT be marked as `complete: true`.
- In `src/server/project-presentation.ts`, pending human checkpoints must be preserved and included in `presentation.checkpoints` even if a summary file exists on disk, as long as the summary status is `awaiting-checkpoint`.
- Downstream plans depending on a plan awaiting a checkpoint must remain blocked and not be marked as ready in `nextWork`.
- Replace dual conflicting badges (`formal.status: incomplete` and `observed.status: in_progress`) in the progress-panel with a single coherent phase status (`Awaiting Checkpoint` when any plan has a pending human checkpoint or `status: awaiting-checkpoint`; otherwise `In Progress`, `Complete`, or appropriate disk status).
- Replace raw roadmap-vs-disk comparison ('5 of 16 plans' vs 'Files on disk · 7 of 16 summaries present' and the generic discrepancy callout) with a clean, unified plan breakdown (e.g., 5 Completed, 2 Awaiting Review, 9 Remaining / 16 total).
- Render an active callout linking directly to the blocking plan when a human checkpoint is pending in the phase.
- All styles must strictly adhere to design tokens (`test/token-guard.test.ts`), and production assets must be rebuilt with `npm run build`.

Task-local requirement IDs:
- OAE-01: Checkpoint awareness in `project-presentation.ts` (awaiting-checkpoint completion exclusion, checkpoint preservation, downstream dependency blocking).
- OAE-02: Status consolidation and unified plan breakdown in `dashboard.ts` (truthful phase status, count breakdown, active checkpoint resolution).
- OAE-03: Revamped progress panel in `dashboard-page.tsx` and token-compliant styling in `globals.css` with active checkpoint callout.
</objective>

<context>
- `src/server/project-presentation.ts`:
  - Line 488: Currently checks `if (plan.summary === null)` before pushing blocking-human checkpoints to `allCheckpoints`. If a summary exists with `status: awaiting-checkpoint`, the checkpoint is erroneously dropped.
  - Line 524: Sets `complete: plan.summary !== null`. If a plan is awaiting a human checkpoint, it is incorrectly marked complete.
- `src/presentation/dashboard.ts`:
  - `completionOf`: Produces `formal` and `observed` completion signals which lead to conflicting statuses ('incomplete' vs 'in_progress') and false discrepancies when summaries are awaiting checkpoints.
  - `dependencyBlockers`: Checks `target?.complete`. Correcting `complete` on awaiting-checkpoint plans naturally keeps downstream dependencies blocked.
  - `checkpointWork`: Finds pending checkpoints in `presentation.checkpoints` for the current phase to recommend human verification in `next.immediate`.
- `src/web/pages/dashboard-page.tsx`:
  - `.progress-panel`: Currently renders formal progress, observed summaries, and a `<div className="discrepancy-callout">` when roadmap and disk counts differ.
  - Needs to render unified status chip (`data-tone="active"` | `"complete"` | `"quiet"`), clear plan breakdown, and an active checkpoint callout.
- `src/web/styles/globals.css`:
  - Contains `.progress-panel`, `.formal-progress-value`, `.observed-progress`, `.discrepancy-callout`.
  - Must update styles using design tokens (`var(--space-*)`, `var(--fs-*)`, `var(--primary)`, etc.) enforced by `test/token-guard.test.ts`.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Implement checkpoint awareness in project-presentation and verify downstream blocking</name>
  <files>src/server/project-presentation.ts, test/server/project-presentation.test.ts</files>
  <precondition>Test suite baseline verified passing.</precondition>
  <read_first>src/server/project-presentation.ts, test/server/project-presentation.test.ts</read_first>
  <behavior>
    - When a plan has a summary on disk whose frontmatter contains `status: awaiting-checkpoint`, `PlanDto.complete` is `false`.
    - When a plan has a summary with `status: awaiting-checkpoint`, any blocking-human checkpoints defined in the plan body are preserved in `presentation.checkpoints` (and marked pending unless passing evidence exists).
    - When a summary has any other status or no status specified, `PlanDto.complete` remains `true` (standard completion).
    - Downstream plans depending on an awaiting-checkpoint plan evaluate as dependency-blocked because `targetPlan.complete` is `false`.
  </behavior>
  <action>
    1. RED: In `test/server/project-presentation.test.ts`, add test cases:
       - Plan with `SUMMARY.md` containing `status: awaiting-checkpoint` has `complete: false` and its blocking-human checkpoint is included in `presentation.checkpoints` with `status: 'pending'`.
       - Normal plan with `SUMMARY.md` (no awaiting status) has `complete: true` and its checkpoints are not pushed to `presentation.checkpoints`.
       - Dependent plan with `depends_on: ["01-01"]` where `01-01` is awaiting checkpoint has `targetPlanKey` resolved, but dependency remains unsatisfied.
       Run vitest to confirm failure.
    2. GREEN: In `src/server/project-presentation.ts`:
       - In `toProjectPresentation`:
         - Determine whether the plan is awaiting checkpoint:
           `const isAwaitingCheckpoint = asString(plan.summary?.frontmatter.status) === 'awaiting-checkpoint';`
         - Update checkpoint collection condition:
           `if (plan.summary === null || isAwaitingCheckpoint) { allCheckpoints.push(...checkpoints.filter((checkpoint) => checkpoint.gate === 'blocking-human')); }`
         - Update plan completion flag:
           `complete: plan.summary !== null && !isAwaitingCheckpoint,`
    3. Run `npx vitest run test/server/project-presentation.test.ts` to confirm tests pass.
  </action>
  <verify>
    - `npx vitest run test/server/project-presentation.test.ts` passes.
  </verify>
  <acceptance_criteria>
    - `test/server/project-presentation.test.ts` contains assertions that a plan with `status: awaiting-checkpoint` in its summary has `complete === false`.
    - `presentation.checkpoints` includes blocking-human checkpoints for plans whose summary status is `awaiting-checkpoint`.
  </acceptance_criteria>
</task>

<task type="primary" tdd="true">
  <name>Task 2: Consolidate phase status, calculate unified plan breakdown, and surface active checkpoints in dashboard view model</name>
  <files>src/presentation/dashboard.ts, test/presentation/dashboard.test.ts</files>
  <precondition>Task 1 complete.</precondition>
  <read_first>src/presentation/dashboard.ts, test/presentation/dashboard.test.ts</read_first>
  <behavior>
    - `DashboardViewModel.completion` exports:
      - `phaseStatus`: string representing truthful phase status:
        - `'Awaiting Checkpoint'` when any plan in the active phase has `status: awaiting-checkpoint` or a pending blocking-human checkpoint.
        - `'Complete'` when all plans in the phase are complete (`total > 0 && completed === total`).
        - `'In Progress'` when some plans are complete or underway.
        - Appropriate fallback disk status (e.g. `'Researched'`, `'Planned'`) when 0 plans are complete.
      - `counts`: `PhasePlanCounts` with `{ completed: number, awaitingCheckpoint: number, remaining: number, total: number }`.
      - `activeCheckpoint`: `PhaseProgressCheckpoint | null` pointing to the first pending blocking checkpoint in the current phase (with `key`, `planKey`, `planId`, `name`, `type`).
      - Preserves `formal`, `observed`, and `currentPhaseKey` for backwards compatibility.
    - Downstream plans depending on an awaiting-checkpoint plan are excluded from `ready` plans and reported in `attention` as dependency-blocked.
  </behavior>
  <action>
    1. RED: In `test/presentation/dashboard.test.ts`, add test cases:
       - When a plan in the active phase is awaiting checkpoint:
         - `view.completion.phaseStatus` is `'Awaiting Checkpoint'`.
         - `view.completion.counts` reports correct completed, awaitingCheckpoint, remaining, and total counts.
         - `view.completion.activeCheckpoint` contains the pending checkpoint details and plan link.
         - Downstream plan depending on this plan is not in `next.immediate` and is flagged in `view.attention` as a dependency blocker.
       - When all plans are complete:
         - `view.completion.phaseStatus` is `'Complete'`.
         - `counts.completed === counts.total` and `counts.awaitingCheckpoint === 0`.
       - When some plans are done and others remain without checkpoints:
         - `view.completion.phaseStatus` is `'In Progress'`.
       Run vitest to confirm failure.
    2. GREEN: In `src/presentation/dashboard.ts`:
       - Define interfaces:
         ```ts
         export interface PhasePlanCounts {
           completed: number;
           awaitingCheckpoint: number;
           remaining: number;
           total: number;
         }

         export interface PhaseProgressCheckpoint {
           key: string;
           planKey: string;
           planId: string;
           name: string;
           type: string;
         }
         ```
       - Extend `DashboardViewModel.completion` with `phaseStatus: string | null`, `counts: PhasePlanCounts`, `activeCheckpoint: PhaseProgressCheckpoint | null`.
       - Implement helper to calculate phase counts and consolidated status:
         - `completed`: count of plans in `currentPhase.plans` where `plan.complete === true`.
         - `awaitingCheckpoint`: count of plans in `currentPhase.plans` where `!plan.complete` and either `asString(plan.summary?.frontmatter?.status) === 'awaiting-checkpoint'` or `plan.checkpoints.some(cp => cp.gate === 'blocking-human' && cp.status === 'pending')`.
         - `total`: `Math.max(currentPhase.plans.length, currentPhase.formalPlanProgress?.total ?? 0)`.
         - `remaining`: `Math.max(0, total - completed - awaitingCheckpoint)`.
         - `phaseStatus`:
           - If `awaitingCheckpoint > 0`: `'Awaiting Checkpoint'`
           - Else if `total > 0 && completed === total`: `'Complete'`
           - Else if `completed > 0`: `'In Progress'`
           - Else if `total > 0`: `currentPhase.diskStatus === 'researched' ? 'Researched' : currentPhase.diskStatus === 'in_progress' ? 'In Progress' : 'Planned'`
           - Else if `currentPhase.plans.length === 0`: `currentPhase.roadmapComplete ? 'Complete' : currentPhase.diskStatus === 'researched' ? 'Researched' : currentPhase.diskStatus === 'complete' ? 'Complete' : 'Planned'`
           - If no current phase: `null`.
         - `activeCheckpoint`: find first pending blocking-human checkpoint in `presentation.checkpoints` matching `currentPhase.key`.
       - Wire `counts`, `phaseStatus`, and `activeCheckpoint` into `buildDashboardViewModel`.
    3. Run `npx vitest run test/presentation/dashboard.test.ts` to confirm all tests pass.
  </action>
  <verify>
    - `npx vitest run test/presentation/dashboard.test.ts` passes.
  </verify>
  <acceptance_criteria>
    - `test/presentation/dashboard.test.ts` asserts `view.completion.phaseStatus === 'Awaiting Checkpoint'` when a plan has `status: awaiting-checkpoint`.
    - `view.completion.counts` accurately reflects completed, awaitingCheckpoint, and remaining counts.
    - `view.completion.activeCheckpoint` links to the plan awaiting human review.
  </acceptance_criteria>
</task>

<task type="primary" tdd="true">
  <name>Task 3: Revamp progress panel UI in dashboard-page.tsx, style token-compliantly in globals.css, and rebuild</name>
  <files>src/web/pages/dashboard-page.tsx, src/web/styles/globals.css, test/token-guard.test.ts, test/web/visual-contract.test.ts, test/web/shell-contract.test.ts</files>
  <precondition>Tasks 1 and 2 complete.</precondition>
  <read_first>src/web/pages/dashboard-page.tsx, src/web/styles/globals.css, test/web/visual-contract.test.ts, test/web/shell-contract.test.ts, test/token-guard.test.ts</read_first>
  <behavior>
    - `.progress-panel` in `dashboard-page.tsx`:
      - Displays header with eyebrow "Current phase", heading "Plan completion", and single consolidated status chip (`<span className="status-chip" data-tone={...}>`).
      - `data-tone` is strictly one of `'complete'`, `'active'`, or `'quiet'` (compliant with `test/web/visual-contract.test.ts`).
      - Renders clean plan breakdown:
        - Primary headline: `{counts.completed} of {counts.total} plans completed` (or clean empty state if 0 plans).
        - Pill/segment badges: `{counts.completed} Completed`, `{counts.awaitingCheckpoint} Awaiting Review` (styled prominently when > 0), and `{counts.remaining} Remaining`.
      - Renders an active checkpoint callout banner when `view.completion.activeCheckpoint` is present:
        - Icon, warning tone, checkpoint name, and direct navigation link to open the blocking plan (`<Link to={activeCheckpoint.planKey} ...>`).
      - Eliminates confusing raw disk-vs-roadmap summary comparison and the generic discrepancy callout from the progress panel.
      - Retains `<SourceLink provenance={view.completion.formal.provenance}>Open roadmap</SourceLink>`.
    - All new CSS rules in `src/web/styles/globals.css` use strict design tokens (`var(--space-*)`, `var(--fs-*)`, `var(--fw-*)`, `var(--lh-*)`, `var(--ls-*)`, color tokens), with responsive grid adaptations at `@media (max-width: 60rem)` and `@media (max-width: 42rem)`.
    - `test/token-guard.test.ts` passes with zero violations.
    - `npm run build` succeeds and updates production assets.
  </behavior>
  <action>
    1. In `src/web/pages/dashboard-page.tsx`:
       - Revamp `.progress-panel`:
         - Determine status tone: `view.completion.phaseStatus === 'Complete' ? 'complete' : (view.completion.phaseStatus === 'Awaiting Checkpoint' || view.completion.phaseStatus === 'In Progress') ? 'active' : 'quiet'`.
         - Render header with unified status chip.
         - Render unified plan breakdown with primary count and breakdown badges:
           - `.plan-progress-summary` with strong completed count and total.
           - `.plan-breakdown-pills` showing Completed, Awaiting Review (if > 0), and Remaining.
         - When `view.completion.activeCheckpoint` exists:
           - Render `.checkpoint-callout` with `<AlertTriangle aria-hidden="true" />`, checkpoint name, explanation that human review is required before completion, and `<Link to={activeCheckpoint.planKey} className="checkpoint-link">Open plan <ArrowRight aria-hidden="true" /></Link>`.
         - Keep `<SourceLink provenance={view.completion.formal.provenance}>Open roadmap</SourceLink>`.
         - Remove obsolete raw observed summaries text and `<div className="discrepancy-callout">` from the progress panel.
    2. In `src/web/styles/globals.css`:
       - Update styles for `.progress-panel`:
         - Clean modern card layout using tokens: `gap: var(--space-6)`, `padding: var(--space-fluid-3)`.
         - Style `.plan-progress-summary` with `font-size: var(--fs-display-3)`, `font-weight: var(--fw-medium)`, `font-family: var(--font-heading)`.
         - Style `.plan-breakdown-pills` with `display: flex`, `gap: var(--space-2)`.
         - Style `.plan-pill` with `border: 1px solid var(--border)`, `padding: var(--space-1) var(--space-2-5)`, `border-radius: var(--radius-sm)`, `font-family: var(--font-heading)`, `font-size: var(--fs-2)`.
         - Style `.plan-pill[data-state='awaiting']` with `border-color: color-mix(in oklch, var(--primary) 65%, var(--border))`, `background: var(--primary-tint)`, `color: var(--primary)`.
         - Style `.checkpoint-callout`:
           - Border: `1px solid color-mix(in oklch, var(--primary) 50%, var(--border))`
           - Background: `var(--primary-tint)`
           - Padding: `var(--space-4)`
           - Gap: `var(--space-3)`
           - Color: `var(--foreground)`
         - Style `.checkpoint-link` with `color: var(--primary)`, `display: inline-flex`, `align-items: center`, `gap: var(--space-1-5)`.
         - Update responsive layouts under `@media (max-width: 60rem)` and `@media (max-width: 42rem)` ensuring token compliance and single-column collapse.
    3. Run tests and typecheck:
       - `npx vitest run test/token-guard.test.ts`
       - `npx vitest run test/web/visual-contract.test.ts test/web/shell-contract.test.ts test/presentation/dashboard.test.ts`
       - `npm run typecheck`
       - `npm run build`
  </action>
  <verify>
    - `npx vitest run test/token-guard.test.ts` passes with 0 violations.
    - `npx vitest run test/web/visual-contract.test.ts` passes.
    - `npx vitest run test/web/shell-contract.test.ts` passes.
    - `npm run typecheck` passes.
    - `npm run build` exits 0.
  </verify>
  <acceptance_criteria>
    - `.progress-panel` in `src/web/pages/dashboard-page.tsx` renders consolidated status chip, unified plan counts, and active checkpoint callout when pending.
    - `src/web/styles/globals.css` passes `test/token-guard.test.ts` with zero raw literal violations.
    - `npm run build` succeeds.
  </acceptance_criteria>
</task>

</tasks>
