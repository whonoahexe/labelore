---
phase: quick-260922-3us
plan: 01
subsystem: web-ui
tags: [document-layout, sketch-004, b3, folded-chapters, e2e]
status: complete
requirements: [B3-01, B3-02, B3-03, B3-04]
dependency-graph:
  requires: []
  provides:
    - "src/web/views/layout.ts + layout-components.tsx — shared sketch-004 B3 layout (cover sheet, chapter index, pinned chapter bar, folded chapters, Also chapter)"
    - "layout-discussion-log.ts, layout-plan.ts, layout-verification.ts — the three first adopters, data-only"
  affects:
    - src/web/pages/artifact-page.tsx
    - src/web/components/artifact-header.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
key-files:
  created:
    - src/web/views/layout.ts
    - src/web/views/layout-components.tsx
    - src/web/views/layout-discussion-log.ts
    - src/web/views/layout-plan.ts
    - src/web/views/layout-verification.ts
    - test/web/document-layout.test.ts
    - test/web/document-layout-types.test.ts
    - test/e2e/document-layout.spec.ts
  modified:
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/views/document-sections.ts
    - src/web/components/artifact-header.tsx
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/e2e/foundation-consistency.spec.ts
    - test/e2e/measure.ts
    - test/section-projection.test.ts
decisions:
  - "Task 3 sweep defect fixed in the shared layout, not waived: below 42rem `.document-item-head` stacks (chips beneath the title) — plan 01-01's `checkpoint:human-verify` gate chip overflowed the 420px viewport by 10px when every chapter was expanded. Same breakpoint the fold head already restacks at."
  - "F-02/F-10/F-11/F-12 were updated for the cover layout, not weakened, and each change carries a comment naming the sketch and this task. known-per-type.json gains nothing."
metrics:
  commits: [b51fca1, 596b417, ed62ee0]
  completed: 2026-09-22
---

# Quick 260922-3us: sketch-004 B3 folded-chapters document layout

DISCUSSION-LOG, PLAN and VERIFICATION documents now use the sketch-004 B3 layout in View mode. Each opens on a
cover sheet (eyebrow, smaller title, lede, facts, status chip and View/Source toggle), then shows the headline
number, a glance cell when real data supports one, and a clickable chapter index. Chapters are folded rows with
roll-up chips and Expand all / Collapse all. A pinned chapter bar appears once the cover scrolls out of view.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Shared B3 layout end-to-end, discussion log as first adopter | b51fca1 |
| 2 | PLAN and VERIFICATION adopt the layout through manifest data only | 596b417 |
| 3 | Full e2e coverage, foundation checks updated, all gates green, build | ed62ee0 |

## Deviations

- **[Rule 1 – bug] Item chips overflowed at 420px.** The e2e run showed plan 01-01 overflowing to 430px
  when fully expanded. The cause was the `checkpoint:human-verify` gate chip in a task row's
  `.document-item-chips`, which kept its full width beside the title. Fixed with a `max-width: 42rem` rule
  that stacks `.document-item-head`.
- **[Rule 3 – blocking] Stale fixture paths.** Four `section-projection.test.ts` tests read Phase 5
  fixtures from `.planning/phases/`, but the v1.1 milestone archive had moved them to
  `.planning/milestones/v1.1-phases/`. That archive move caused the failure, not this task. The paths now
  point at the archive.

## Verification

- `npm test`: 66 files, 1121 tests passed
- `npm run typecheck` and `npm run lint`: clean
- `npm run test:e2e`: 24/24 passed (document-layout spec across 4 discussion logs, 2 plans and
  3 verifications; F-01..F-15 sweep in light and dark at 1280 and 420)
- `npm run build`: succeeded with no chunk-size warning, and `dist/` is rebuilt. The systemd instance on
  4173 was not touched.
- Prettier reports style drift in `foundation-consistency.spec.ts` and `section-projection.test.ts` that was
  already present at HEAD. It is not one of the plan's gates, so it was left alone.

## Human check (pending)

Open https://cinedise.persian-elnath.ts.net/ on a discussion log (v1.0 phase 03), plan 01-01 and
verification 05, in light and dark, at desktop and phone width. Check that the cover reads like
sketch 004 B3, that folds expand, that the pinned bar appears after scrolling, and that nothing
overflows.
