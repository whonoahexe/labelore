---
title: Fix document-page chrome drift and the loading→loaded container reflow
date: 2026-09-20
priority: medium
status: done
completed: 2026-09-20
completed_by: quick task 260920-mzr (commits cc92a07, 4934254, 84c402d)
---

> **Closed 2026-09-20.** Execution found a fourth drift axis this note missed: a
> `@media (max-width: 42rem)` rule set `.artifact-page { padding-top: var(--space-6) }`, which
> would have kept defeating `.page-stack`'s `--space-10` at narrow widths — the drift would have
> moved rather than closed. Fixed in the same change. See
> `.planning/quick/260920-mzr-fix-document-page-chrome-drift-and-the-l/`.

# Document-page chrome drift

`ArtifactPage` and `PlanPairPage` maintain a second, parallel page-frame system instead of using
the one every other page uses. Two concrete problems.

## 1. The container changes mid-load (visible reflow)

Both pages render `<main className="page-stack">` while loading and on error, then switch to
`<main className="artifact-page">` once the document arrives:

- `src/web/pages/artifact-page.tsx:401` (loading), `:415` (error), `:454` (loaded)
- `src/web/pages/plan-pair-page.tsx:111` (loading), `:125` (error), `:158` (loaded)

Since the two classes carry different widths and paddings, the page physically jumps — wider and
higher — the moment data lands. Nothing else in the app does this.

## 2. The two frames have drifted on three axes

| | `.page-stack` (dashboard, roadmap, traceability, search) | `.artifact-page` |
|---|---|---|
| Width | `min(86rem, 100%)` (`globals.css:2509`) | `min(88rem, 100%)` (`globals.css:2717`) |
| Top padding | `--space-fluid-14` (`globals.css:826`) | `--space-fluid-11` (`globals.css:2720`) |
| Title scale | `--fs-display-3` (`globals.css:851`) | `--fs-display-2` (`globals.css:2743`) |
| Intro block | `.page-intro` + `.lede` | `.artifact-breadcrumbs` + `.artifact-heading` |
| Section rhythm | `.section-heading` | not used |

## Scope

Exactly two pages. `SearchPage` already conforms (`page-stack` + `page-intro` + `lede`), and
`RoadmapPage` / `DashboardPage` / `TraceabilityPage` use the `page-stack` + modifier pattern.

## Why it is its own task

Independently shippable, small, and a real defect rather than a design question — it does not
depend on the per-kind view work ([[per-kind-artifact-rendering]]). Doing it first means the
per-kind views inherit a correct frame instead of being built against a drifting one.

Note `ArtifactHeader` (`src/web/components/artifact-header.tsx`) already exists precisely so the
two pages cannot drift from *each other*; the drift being fixed here is between that shared header
and the rest of the app.
