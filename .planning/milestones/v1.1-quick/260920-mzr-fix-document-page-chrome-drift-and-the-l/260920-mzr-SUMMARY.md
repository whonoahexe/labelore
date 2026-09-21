---
phase: quick-260920-mzr
plan: 01
subsystem: ui
tags: [css, react, artifact-page, plan-pair-page, page-stack, design-tokens]

requires: []
provides:
  - "ArtifactPage and PlanPairPage loaded-state main elements carry page-stack, giving both document pages the same container geometry as every other page in every render state (loading/error/loaded)"
  - ".artifact-page reduced to a layout-only modifier (display/gap/min-width); .page-stack is the sole container (width/margin/padding) for document pages"
  - ".artifact-heading h1 harmonized to --fs-display-3, matching the rest of the app; --fs-display-2 token removed as orphaned"
  - "Duplicate horizontal rule above the document body removed (.artifact-breadcrumbs no longer draws its own bottom border)"
affects: []

actuals:
  tokens: 575
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Container/layout split: page components append both a layout class (e.g. artifact-page) and page-stack to their loaded-state root, mirroring the existing dashboard-page/roadmap-page/traceability-page convention. No page-specific class should redeclare width/margin/padding — those belong to .page-stack alone."

key-files:
  created: []
  modified:
    - src/web/pages/artifact-page.tsx
    - src/web/pages/plan-pair-page.tsx
    - src/web/styles/globals.css

key-decisions:
  - "Deleted the narrow-viewport .artifact-page padding-top override (globals.css, inside @media max-width:42rem) in Task 1, in addition to the plan's named deletions — a fourth drift axis identified at planning time (Finding 1) where the document-only padding-top: --space-6 would have kept winning over .page-stack's --space-10 at equal specificity even after the main container split."
  - "Removed the --fs-display-2 token definition in the same commit as retargeting its sole consumer, per token-guard.test.ts:679's live consumption-check assertion (Finding 2) — the guard was not weakened."

requirements-completed: [MZR-01, MZR-02, MZR-03, MZR-04]

coverage:
  - id: D1
    description: "ArtifactPage and PlanPairPage render identical container geometry across loading/error/loaded states — no reflow when the document arrives"
    requirement: "MZR-01"
    verification:
      - kind: unit
        ref: "test/web/loading-state-contract.test.ts (pending-branch className assertions, unmodified, still pass)"
        status: pass
      - kind: other
        ref: "grep -q 'artifact-page page-stack' src/web/pages/artifact-page.tsx && grep -q 'plan-pair-page page-stack' src/web/pages/plan-pair-page.tsx"
        status: pass
    human_judgment: true
    rationale: "No headless browser tooling (Playwright/Puppeteer) is installed in this repo, so the actual absence of visual reflow on data arrival cannot be asserted programmatically here — it was verified structurally (identical page-stack class across all three states, computed cascade confirmed via source inspection) but a human should confirm the visual absence of a jump in a real browser."
  - id: D2
    description: "Document pages are min(86rem, 100%) wide with --space-fluid-14 top padding (desktop) and --space-10 top padding (<=42rem), all inherited from .page-stack rather than declared on .artifact-page"
    requirement: "MZR-02"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 843 tests, includes css-source-order.test.ts and visual-contract.test.ts:627)"
        status: pass
      - kind: other
        ref: "awk-scoped assertion: .artifact-page rule body contains no width/margin/padding/padding-top declarations; .page-stack rule body contains var(--space-fluid-14)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The document title renders at --fs-display-3, matching .page-stack > h1 / .page-intro h1; the orphaned --fs-display-2 token is removed"
    requirement: "MZR-03"
    verification:
      - kind: unit
        ref: "test/token-guard.test.ts:679 (fs-* consumption check) — passes with --fs-display-2 removed"
        status: pass
      - kind: other
        ref: "awk-scoped assertion: .artifact-heading h1 rule body contains font-size: var(--fs-display-3); grep confirms zero remaining --fs-display-2 definitions"
        status: pass
    human_judgment: false
  - id: D4
    description: "Exactly one horizontal rule sits between the page chrome and the document body"
    requirement: "MZR-04"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 843 tests) + npm run lint (clean)"
        status: pass
      - kind: other
        ref: "awk-scoped assertion: .artifact-breadcrumbs rule body has zero *-bottom declarations; .artifact-heading rule body retains border-bottom"
        status: pass
    human_judgment: true
    rationale: "The plan's own verify block for Task 3 specifies a <human-check> — visually confirming a single rule renders above the document body in a real browser, at both normal and narrow window widths. No headless browser tool is available in this environment to substitute for that visual check."

duration: 20min
completed: 2026-09-20
status: complete
---

# Quick Task 260920-mzr: Fix Document Page Chrome Drift and Loading Reflow Summary

**Collapsed ArtifactPage/PlanPairPage's parallel container system into `.page-stack` (the same container every other page already uses), fixing the loading→loaded reflow and a three-axis (width/desktop-padding/narrow-padding) chrome drift as one structural change, plus harmonized the document title's type scale and removed a duplicated horizontal rule.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3 completed
- **Files modified:** 3 (`src/web/pages/artifact-page.tsx`, `src/web/pages/plan-pair-page.tsx`, `src/web/styles/globals.css`)
- **Commits:** 3

## Accomplishments

- Both document pages' loaded-state `<main>` elements now carry `page-stack` alongside their existing layout class, so the container geometry (width, margin, padding) is identical across loading, error, and loaded states — no more reflow when the document arrives.
- `.artifact-page` is now purely a layout modifier (`display: grid; gap: var(--space-6); min-width: 0`); the old container block declaring `width: min(88rem, 100%)`, `margin: 0 auto`, and `padding: var(--space-fluid-11) var(--space-fluid-8) var(--space-28)` is gone, along with its narrow-viewport `padding-top: var(--space-6)` override.
- Document pages now inherit `width: min(86rem, 100%)`, `padding: var(--space-fluid-14) var(--space-fluid-8) var(--space-28)` (desktop), and `padding-top: var(--space-10)` (<=42rem) entirely from `.page-stack` — all three values arrived free from the cascade with no hand-typed values on `.artifact-page`.
- `.artifact-heading h1` now renders at `--fs-display-3` (was `--fs-display-2`), matching `.page-stack > h1` / `.page-intro h1` used everywhere else. The now-orphaned `--fs-display-2` token definition was deleted.
- The duplicate horizontal rule above the document heading is gone: `.artifact-breadcrumbs` no longer draws its own `border-bottom`/`padding-bottom`; `.artifact-heading`'s rule is the single surviving one.

## Task Commits

1. **Task 1: Split container from layout — one page container for every document-page state** - `cc92a07` (refactor)
2. **Task 2: Harmonize the document title scale and retire the token it orphans** - `4934254` (refactor)
3. **Task 3: Drop the duplicated horizontal rule above the document heading** - `84c402d` (refactor)

## Files Created/Modified

- `src/web/pages/artifact-page.tsx` - loaded-state `<main>` className changed from `"artifact-page"` to `"artifact-page page-stack"`
- `src/web/pages/plan-pair-page.tsx` - loaded-state `<main>` className changed from `"artifact-page plan-pair-page"` to `"artifact-page plan-pair-page page-stack"`
- `src/web/styles/globals.css` - deleted the `.artifact-page` container block (width/margin/padding) at the old `:2717`; deleted the `@media (max-width: 42rem) { .artifact-page { padding-top: ... } }` override at the old `:3152`; changed `.artifact-heading h1`'s `font-size` to `var(--fs-display-3)`; deleted the `--fs-display-2` token definition; removed `padding-bottom`/`border-bottom` from `.artifact-breadcrumbs`

## Decisions Made

- **The 86rem / `--space-fluid-14` / `--space-10` values arrived free, with no diagnosis needed.** After deleting the two `.artifact-page` rules in Task 1, `.page-stack` (which already carried `width: min(86rem, 100%)` at the top-level rule, `padding: var(--space-fluid-14) ...` in its main rule, and `padding-top: var(--space-10)` in the `<=42rem` media query) supplied all three automatically once both document pages' loaded-state `main` carried the `page-stack` class. This was confirmed structurally via the plan's own awk-scoped grep assertions (all passed on the first attempt) and by re-reading the cascade at planning-confirmed line numbers before editing — no runtime debugging or trial-and-error was required.
- **`--fs-display-2` was removed because `token-guard.test.ts` demands it, not by choice.** Retargeting `.artifact-heading h1`'s `font-size` from `--fs-display-2` to `--fs-display-3` would otherwise leave `--fs-display-2` with zero consumers in the repo, which `test/token-guard.test.ts:679` treats as a hard failure ("defined but never consumed"). Deleted the token definition in the same commit as the retarget (Task 2). No test file was modified — the guard is the source of truth and stayed untouched.
- **`--space-fluid-11`, orphaned by Task 1's deletion, was deliberately left in place.** `token-guard.test.ts:643` explicitly excludes the `--space-fluid-*` family from its consumption check, which is the project's own standing decision to keep the fluid ramp whole regardless of per-token usage. No action was taken on it, per the plan's explicit instruction.

## Deviations from Plan

None - plan executed exactly as written, including both findings the plan itself called out in advance (the narrow-viewport `.artifact-page` deletion in Task 1, and the paired `--fs-display-2` token removal in Task 2). No test file was changed; both foreseeable red-test risks named in the plan's `<verification>` section did not materialize because the paired deletions were made in the same task/commit as instructed.

## Issues Encountered

None. All three tasks' automated verify blocks passed on the first attempt: `npx vitest run` stayed at 53 files / 843 tests passing after every task, `npm run typecheck` and `npm run lint` were clean, and every awk/grep structural assertion in each task's `<verify>` block matched exactly.

**One item not fully automatable:** Task 3's `<verify>` block includes a `<human-check>` — start the dev server, open an artifact page and a plan-pair page, hard-refresh each, and visually confirm no width/height jump, matching width/padding to the dashboard/roadmap pages, and exactly one horizontal rule, including at a narrow window width. This repo has no headless-browser tooling installed (no Playwright/Puppeteer in `node_modules/.bin`), so this specific visual confirmation could not be executed programmatically in this session. As a partial substitute: the dev server was started locally (`node src/server/index.ts /home/cinedise/labelore --port 4199`), confirmed to boot cleanly and serve `200` on `/` with no runtime errors introduced by these changes, then stopped. The structural claims underlying the visual check (single `.page-stack` container source, single surviving `border-bottom`, `.plan-pair-page`'s `gap: var(--space-8)` still outranking `.artifact-page`'s `gap: var(--space-6)` because `.plan-pair-page` sits later in source order at line 3106 vs. `.artifact-page` at line 2148) were all verified by direct source inspection and are recorded above as `coverage` entries `D1` and `D4` with `human_judgment: true` — a human should do the actual browser pass before considering this fully closed.

## User Setup Required

None - no external service configuration required. Note: this repo also runs as a separate systemd-hosted production instance (`labelore.service`, serving prebuilt `./dist` pointed at `/home/cinedise/studio-portal`, per project memory) — that instance was not touched or rebuilt by this task, since it serves a different target project and production mode requires an explicit `npm run build` + service restart that is out of scope for this quick fix.

## Next Phase Readiness

- All structural/automated verification is green: 53 files / 843 tests, typecheck, and lint.
- One human visual pass remains open (see Issues Encountered / coverage D1, D4 `rationale`) before this can be considered fully verified end-to-end.

---
*Phase: quick-260920-mzr*
*Completed: 2026-09-20*

## Self-Check: PASSED

All 3 modified source files exist on disk; all 3 task commit hashes (`cc92a07`, `4934254`, `84c402d`) are present in git history.
