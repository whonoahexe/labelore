---
phase: quick-260921-l4e
plan: 01
subsystem: web-ui-testing
tags: [playwright, e2e, design-system, consistency-sweep, ui-foundation]
status: complete
dependency-graph:
  requires: []
  provides:
    - "npm run test:e2e — repeatable Playwright chromium sweep (own server, port 4199)"
    - "test/helpers/design-vocabulary.ts — shared design-language vocabulary parser"
    - "test/e2e/known-per-type.json — per-type waiver mechanism"
  affects:
    - src/web/styles/globals.css
    - src/web/pages/plan-pair-page.tsx
key-files:
  created:
    - playwright.config.ts
    - test/e2e/pages.ts
    - test/e2e/measure.ts
    - test/e2e/results.ts
    - test/e2e/global-setup.ts
    - test/e2e/known-per-type.json
    - test/e2e/foundation-consistency.spec.ts
    - test/helpers/design-vocabulary.ts
    - .planning/quick/260921-l4e-automate-ui-ux-consistency-verification-/260921-l4e-FINDINGS.md
  modified:
    - package.json
    - package-lock.json
    - tsconfig.server.json
    - .gitignore
    - test/web/class-vocabulary.test.ts
    - test/presentation/coverage.test.ts
    - src/web/styles/globals.css
    - src/web/pages/plan-pair-page.tsx
decisions:
  - "Task 2 construction: results.json is written by a read-modify-write on every softCheck() call, reset once by a Playwright globalSetup hook — not accumulated in a module-scope array flushed by test.afterAll. Playwright restarts the worker process after any failing test, which resets module state; with sweep tests expected to fail mid-run, the array-based design silently discarded every entry from a discarded worker and only the last surviving worker's checks ever reached disk."
  - "Task 3 triage: D-10 applies literally — one shared-file line-height token drift (.artifact-heading h1), a systemic plan-pair duplicate-H1 (every GSD SUMMARY.md opens with its own title), and a CSS grid minmax(0,...) gap were fixed in shared files regardless of how many kinds tripped them; doc-requirements' two-H1 archival content and 3 checks the harness itself measured wrong (dashboard hero exemption, breadcrumb-driven h1 offset, toneless status chips, View/Source height comparison) were corrected in the test/waiver layer instead of the product."
metrics:
  duration: "~3h (across a session interruption)"
  completed: "2026-09-21"
actuals:
  tokens: 21890
  tasks: 3
  commits: 3
  plan_head_before: "df35b13"
---

# Quick Task 260921-l4e: Automate UI/UX Consistency Verification Summary

Built a repeatable Playwright sweep that screenshots and measures every document-page kind against
the dashboard/roadmap/traceability/search reference pages, then used it to find and fix three real
foundation-level layout defects in the Phase 5 document-page shared layer.

## What Was Built

- **`npm run test:e2e`** — a chromium-only Playwright harness that boots its own dev server on port
  4199 (the systemd instance on 4173 is never touched), reads this repo's own `.planning/` corpus
  via `/api/presentation`, and visits the 4 reference pages + one artifact per corpus `artifact.kind`
  (24 kinds found) + one plan-pair page, in light/dark at 1280px/420px.
- **15 checks (F-01..F-15)**, each a computed-style/bounding-box/attribute/DOM-structure assertion
  with a stable id: page-frame parity, heading typography, lede parity, section-heading parity,
  status-chip parity/tone, squared corners, view-local class namespace, outline behaviour (wide
  sticky column and narrow popover trigger, including scroll-to-active and click interactions),
  View/Source toggle stability, remainder disclosure, fallback marker for unregistered kinds,
  loading→loaded frame stability, no horizontal overflow at 420px, and dark-mode application.
- **`test/e2e/screenshots/{light,dark}-{1280,420}/*.png`** (116 PNGs, gitignored) plus a
  machine-readable `results.json` (1771 entries) recording every check outcome.
- **`test/helpers/design-vocabulary.ts`** — the design-language vocabulary parser extracted verbatim
  out of `test/web/class-vocabulary.test.ts` so both the vitest source-scan test and the Playwright
  sweep read the same allowlist/tone table.
- **`test/e2e/known-per-type.json`** — the one mechanism that turns a failing check non-fatal,
  currently holding one entry (`doc-requirements` / F-02, an archival-content quirk).

## Foundation Fixes (Committed in Task 3, commit `d3adb3d`)

1. **`.artifact-heading h1` line-height drift** (`src/web/styles/globals.css`) — was `--lh-none`
   (1.0) where every reference page's h1 uses `--lh-display` (0.9), despite sharing every other
   typography token. Affected all 24 document pages + plan-pair. Fixed per D-10 (document side
   moves to match the reference pages).
2. **Plan-pair duplicate `<h1>`** (`src/web/pages/plan-pair-page.tsx`) — every GSD `SUMMARY.md`
   opens with its own title heading, which rendered as a second, undropped `<h1>` next to
   `ArtifactHeader`'s own title. Applied the same `dropLeadingTitle` helper `ArtifactPage` already
   uses, to both halves of the pair. Updated `test/presentation/coverage.test.ts`'s source-text
   contract to match the new render expressions (an expected, deliberate test update — Rule 1).
3. **`.document-reader-layout` narrow-width grid overflow** (`src/web/styles/globals.css`) — a bare
   `grid-template-columns: 1fr` in the `@media (max-width: 58rem)` override resolves to
   `minmax(auto, 1fr)`, letting an unbreakable long inline element widen the whole layout past the
   viewport at 420px (traced live: 699px/541px scrollWidth vs. 420px viewport on the two affected
   pages). Changed to `minmax(0, 1fr)`, matching the two-column layout's own second track.

Full before/after measurements, the harness corrections (4 checks the sweep itself measured wrong,
not the product — see FINDINGS.md for the concrete numbers), and the per-type backlog are in
[`260921-l4e-FINDINGS.md`](./260921-l4e-FINDINGS.md).

## Verification

- `npm run test:e2e` — **exits 0** (8/8 tests pass; 1771 `results.json` entries, 0 non-waived
  failures, every check id F-01..F-15 represented across all 4 theme/width combinations).
- `npm test` — 1067 passed / 4 failed. The 4 failures (`test/section-projection.test.ts`) are
  **pre-existing and unrelated**: stale fixture paths under
  `.planning/phases/05-per-type-document-views/` that no longer exist after the v1.1 milestone
  archival (commit `7866290`). Confirmed pre-existing by running the same test file against this
  task's own prior commit (`d1aaa33`, before any Task 3 changes) — identical failure. Out of scope
  per the scope-boundary rule; documented in FINDINGS.md, not fixed.
- `npm run typecheck` — clean (both `tsconfig.server.json` and `tsconfig.web.json`).
- `npm run lint` — clean.
- The four reference pages (`dashboard-page.tsx`, `roadmap-page.tsx`, `traceability-page.tsx`,
  `search-page.tsx`) are byte-identical to commit `28c7958` (verified via `git diff --quiet`) — none
  were edited to make a check pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tsconfig.server.json` needed the DOM lib for Playwright's `page.evaluate` callbacks**
- **Found during:** Task 1
- **Issue:** `tsconfig.server.json` targets Node-only code (`lib: ["ES2022"]`), but Playwright spec
  files' `page.evaluate()` callback bodies reference DOM globals (`document`, `window`,
  `HTMLElement`, `getComputedStyle`), which the Node-only lib doesn't declare.
- **Fix:** Added `"DOM"` to the `lib` array — additive type declarations only, no runtime change,
  no conflicts with the existing `@types/node` types.
- **Commit:** `c8bb9df`

**2. [Rule 1 - Bug] Three of my own harness bugs surfaced by the first full sweep run**
- **Found during:** Task 2, first full `npm run test:e2e` execution
- **Issues:** (a) `.status-chip`/`.artifact-metadata > summary`/`Button` all render
  `text-transform: uppercase`, so case-sensitive text comparisons in F-10/F-11/F-12 failed on
  visually-rendered casing; (b) an unscoped `getByRole('button', { name: 'View' })` substring-matched
  "Preview D-01" reference buttons (accessible name contains "vie" from "preView"); (c)
  `element.className` on SVG icon elements is an `SVGAnimatedString` with no `.split`, crashing
  `viewClasses()`.
- **Fix:** case-insensitive comparisons; scoped the toggle button locators to `.document-view-toggle`;
  switched to `element.getAttribute('class')`.
- **Commit:** `d1aaa33`

**3. [Rule 1 - Bug] `results.json` silently lost entries across worker restarts**
- **Found during:** Task 2, after the harness bug fixes, when the sweep tests began failing on real
  findings (expected at that stage) instead of crashing
- **Issue:** Playwright restarts the worker process after any failing test — a documented isolation
  guarantee — which resets all module-scope state. The original design accumulated results in a
  module-scope array and wrote it once via a single top-level `test.afterAll`; every worker
  discarded after a failure lost its own accumulated entries entirely, since the array reset to `[]`
  in the fresh worker and only the *final* surviving worker's entries ever reached disk.
- **Fix:** `record()` now reads-modifies-writes `results.json` on every call (durable regardless of
  worker restarts); `test/e2e/global-setup.ts` resets the file exactly once per `npm run test:e2e`
  invocation via Playwright's `globalSetup` hook (which, unlike `test.beforeAll`, never re-runs per
  worker).
- **Commit:** `d1aaa33`

### Harness Corrections (Task 3, not deviations from the plan's own design intent — see FINDINGS.md "Harness corrections")

Four checks (F-02 dashboard-hero exemption, F-02 offset envelope→sanity-ceiling, F-05 toneless-chip
allowance, F-10 height-dropped-from-stability) were corrected after live measurement showed the
*check* was wrong, not the product being measured. Each is documented with concrete before/after
numbers in `260921-l4e-FINDINGS.md`'s "Harness corrections" section, per the plan's own instruction
for handling this exact situation.

### Auth Gates

None — this task required no external service authentication.

## Known Stubs

None. Every check id (F-01..F-15) is wired to a real assertion against the live rendered DOM; no
placeholder/mock data paths were introduced.

## Self-Check: PASSED

- `playwright.config.ts`, `test/e2e/pages.ts`, `test/e2e/measure.ts`, `test/e2e/results.ts`,
  `test/e2e/global-setup.ts`, `test/e2e/known-per-type.json`,
  `test/e2e/foundation-consistency.spec.ts`, `test/helpers/design-vocabulary.ts`,
  `260921-l4e-FINDINGS.md` — all FOUND on disk.
- Commits `c8bb9df`, `d1aaa33`, `d3adb3d` — all FOUND in `git log`.
- `npm run test:e2e` re-run clean (0 non-waived failures) immediately before this summary was written.

## How to Re-run

```
npm install && npx playwright install chromium   # one-time
npm run test:e2e                                 # full sweep, ~5 minutes
npm run test:e2e -- --grep "sweep light 1280"    # single matrix cell, faster
```

Screenshots land in `test/e2e/screenshots/{light,dark}-{1280,420}/*.png`; the full result set is in
`test/e2e/screenshots/results.json`. Port 4173 (systemd) is never referenced or restarted by any
part of this suite.
