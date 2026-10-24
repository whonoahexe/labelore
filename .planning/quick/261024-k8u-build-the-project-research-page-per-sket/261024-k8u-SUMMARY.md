---
phase: quick-261024-k8u
plan: 01
subsystem: research-page
tags: [research, dashboard, handler, view-model, sketches-031-035]
status: complete
requirements-completed: [QK8U-01, QK8U-02, QK8U-03, QK8U-04, QK8U-05, QK8U-06, QK8U-07, QK8U-08]
key-files:
  created:
    - src/planning-repo/handlers/project-research-lift.ts
    - src/planning-repo/handlers/project-research.ts
    - src/presentation/project-research-files.ts
    - src/presentation/project-research.ts
    - src/presentation/project-research-panels.ts
    - src/rendering/build-order-layout.ts
    - src/web/pages/research-page.tsx
    - src/web/pages/research-atoms.tsx
    - src/web/pages/research-summary-panel.tsx
    - src/web/pages/research-stack-panel.tsx
    - src/web/pages/research-features-panel.tsx
    - src/web/pages/research-architecture-panel.tsx
    - src/web/pages/research-pitfalls-panel.tsx
    - test/e2e/research-page.spec.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/presentation/routes.ts
    - src/server/index.ts
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json
commits: 3
plan_head_before: b1ea0e4ba29fe331d93503d9163be83500972bae
plan_head_after: 0cce2ea
actuals:
  tokens: 0
  tasks: 3
  commits: 3
---

# Quick 261024-k8u: the project Research page (sketches 031-035)

`/research` shows the five files in `.planning/research/` as five full-height spines (031 E round 4), with the Summary, Stack, Features, Architecture and Pitfalls panels of sketches 031, 034 A, 033 D1, 032 A and 035 A inside the open one. The page links to none of the source files.

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 (tracer) | 68cf5be | Role-based five-file reader behind the handler boundary, `/api/research`, gated Research tab, the frame with each file's one-sentence finding, golden, e2e frame spec |
| 2 | 06e7c6a | Summary (track, inspector, gate blocks, tiles, gaps), Stack, Features panels |
| 3 | 0cce2ea | Architecture and Pitfalls panels, `layoutBuildOrder`, completed spec |

## Baseline (before the first change)

`npm test` already had 2 failures, unchanged by this work and left alone:
- `test/token-guard.test.ts`: three pre-existing violations (`.view-plan-nav-body code`, `.view-plan-nav-checks li::before`, `.view-ui-review-found-card ... code`). The new CSS adds none.
- `test/presentation/coverage.test.ts`: the plan-pair-page ordering assertion.

Two timing tests (`security-register` 1 MB line, `ascii-graph` grid) fail intermittently only when the suite runs while a dev server is up; both pass in isolation.

## Planning-time facts re-confirmed by grep/awk (not copied from the extractor)

SUMMARY has 4 `### Phase N:` sections; STACK layers 6, 13 and 6, with 10 alternative rows; FEATURES 11, 7 and 9; ARCHITECTURE 3 anti-patterns, 4 `### Phase A-D`, 7 component rows; PITFALLS 10 pitfalls and 10 checklist items; `**Project:** Labelore`, `**Researched:** 2026-08-21`. All match the plan.

## Deviations from Plan

None of Rules 1-4 were triggered. Choices worth knowing:

- **[Rule 1 - Bug] Development Tools table shape.** Labelore's table has a 3-cell header but 4-cell rows (name, version, purpose, notes). The lift reads a row wider than its header positionally, so the layer reads 6 entries with versions instead of shifting every column.
- **System overview and Project structure have no section head.** Their figure frames already carry the same title, so a head above them said it twice.
- **`sentenceCase` exists in both the composer and the atoms.** It is four lines, and importing the composer module from the client would have pulled the lift into the page chunk.
- **Hairlines are borders, not `gap: 1px`.** The token guard forbids raw px in `gap`, so the Delivers tiles use borders.
- **Pitfall chip "navigable"** means the pitfall exists in PITFALLS, not just that the file exists.
- **Tests that quote Labelore's prose** (which mentions `SUMMARY.md` and `.planning/` as subjects) check the no-source-links rule on the drift fixtures strictly and on Labelore only for `.planning/research` and `/artifacts/`.
- The Cinedise files are not on this host; drift is covered by synthetic fixtures (`test/helpers/project-research-fixtures.ts`) shaped like the sketches' `data.js`.

## Human check (screens compared with the sketches)

Looked at Summary, Stack, Features (dark), Architecture and Pitfalls at 1440px and the Summary at 390px, light and dark, against the winning sketch of each. Visible deviations:
- Fixed: Architecture's two figure frames repeated their title in a section head (removed).
- Fixed: a `research-empty` class was added with no CSS (removed).
- Explained: the lane diagram lays out 6 nodes plus the shipped extractor's own layout, as the plan accepted (it loses the search index).
- Explained: sketch hover tints and all `transition`s are dropped (no added motion).
- Explained: `--ink-soft` maps to `--muted-foreground`, so body copy under rows is slightly lighter than in the sketches.
- Not done: a pixel comparison with the sketch pages open side by side; the sketches' own pages were read for CSS and behaviour, not re-rendered.

## Verification

- `npx vitest run`: 3272 passed, the same 2 baseline failures.
- `npm run typecheck` and `npm run lint`: clean.
- `npx playwright test test/e2e/research-page.spec.ts`: 35 passed (the only browser spec run).
- Golden: only `dense.json` changed, only inside the three `.planning/research/*.md` entries' `structured`.
- `git status --porcelain .planning/research`: empty.
- `grep -c ProjectResearchHandler src/planning-repo/handlers/index.ts`: 2.

## Known Stubs

None.

## Threat Flags

None. The only new route is `GET /api/research`; nothing writes to the target project.

## Self-Check: PASSED

All created files exist and commits 68cf5be, 06e7c6a and 0cce2ea are on `master`.
