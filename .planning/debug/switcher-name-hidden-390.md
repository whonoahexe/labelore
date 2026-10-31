---
status: investigating
trigger: "UAT gap G-08-2: At 390px the header switcher trigger is a bare 40px chevron with a 0px name; nothing in the header says which project is open."
created: 2026-10-31T11:00:00Z
updated: 2026-10-31T11:00:00Z
goal: find_root_cause_only
---

## Current Focus

bug_class: Bohrbug (deterministic CSS layout; reproduces on every 390px render)
hypothesis: |
  H1: At <=42rem the header grid is still 'menu brand controls' with columns `auto minmax(0,1fr) auto`.
  CSS grid sizes the two `auto` tracks to their max-content (Maximize Tracks) BEFORE the 1fr track gets
  the leftover. `.shell-controls` keeps the full "Read just now" `.snapshot-label` (the sketch hides
  `.snapshot-label` at 42rem), so the controls column eats ~200px+ and the brand column is left only
  enough for mark (36) + gap + trigger chrome (40) -> `.brand-project` shrinks to 0 (min-width:0).
test: Playwright at 390x844 against the built app on the fixture project: measure grid track widths,
  controls width, trigger width, .brand-project-name clientWidth; then inject `.snapshot-label{display:none}`
  (the sketch's rule) and re-measure.
expecting: Baseline name clientWidth = 0; with the label hidden, name clientWidth > 0 by roughly the
  label's width (~80px). If the name stays 0 with the label hidden, H1 is refuted.
next_action: Find how e2e starts the server (test/e2e/projects-server.ts, playwright.config.ts), then
  write a scratchpad Playwright script that measures the header at 390px with and without the sketch rule.

## Symptoms

expected: At 390px wide with a project open, the header shows which project is current (Phase 08 contract fact 6 from sketch 039 A: switcher trigger at least 40px tall, name cut with an ellipsis).
actual: At 390px the header trigger is a bare 40x40 chevron with a 0px-wide name; nothing in the header says which project is open. The sketch shows name and meta at this width by collapsing the snapshot pill to a dot; the build keeps the "Read just now" label. At 1280px the trigger is 200x36 with a 160px name.
errors: None reported
reproduction: UAT test 2. `npx playwright test test/e2e/projects-screenshots.spec.ts` -> test-results/phase-08/switcher-390-light.png (build) vs switcher-390-light-sketch.png (sketch). The spec passes; it does not assert name width > 0.
started: Discovered during Phase 08 UAT (2026-10-31); noted earlier in 08-15-SUMMARY.md

## Eliminated

## Evidence

- timestamp: 2026-10-31T11:05:00Z
  checked: .planning/debug/knowledge-base.md (Phase 0)
  found: Only entry is loading-state-regression (Suspense/route progress). No layout/flex/grid match.
  implication: No known-pattern candidate; investigate fresh.

- timestamp: 2026-10-31T11:08:00Z
  checked: src/web/components/app-shell.tsx, project-switcher.tsx, snapshot-status.tsx
  found: Header = SidebarDrawer | .brand-lockup (NavLink.brand + ProjectSwitcher trigger) | nav.shell-nav | .shell-controls (SnapshotStatus pill with .snapshot-dot + .snapshot-label "Read just now", SearchDialog, ThemeToggle). Trigger = .project-switcher-trigger > span.brand-project > (.brand-project-name, small.brand-meta) + ChevronsUpDown svg.
  implication: Name and the snapshot label compete for the same header row.

- timestamp: 2026-10-31T11:10:00Z
  checked: src/web/styles/globals.css lines 444-476, 483-549, 589-660, 3727-3772, 3880-3922, 25540-25659
  found: |
    Base: .shell-header grid 'menu brand nav controls' / auto minmax(0,1fr) auto minmax(0,1fr).
    @62rem: 'menu brand controls' 'nav nav nav' / auto minmax(0,1fr) auto  -> controls is an AUTO track.
    @42rem: only hides .brand-wordmark/.brand-separator and .search-trigger-kbd; .shell-controls gets
    flex-wrap + padding var(--space-2) var(--space-4); NO rule touches .snapshot-label. The comment at
    3900-3905 claims the controls were "relaid out to flow as a normal, full-width row below the nav",
    but no grid-template-areas override exists at 42rem (grep: only lines 449 and 3729 set the header's
    areas) - the comment is stale; controls are still in row 1 beside the brand.
    .snapshot-label: overflow hidden, min-width 0, nowrap (shrinkable in principle, but it sits in an
    `auto` grid track that is sized to max-content first).
    .brand-lockup: justify-self start, min-width 0, no max-width. .brand-project: grid, min-width 0.
    .project-switcher-trigger @42rem: min-height var(--space-10) only.
  implication: Nothing at 42rem shrinks the controls; the brand column gets only what the auto tracks leave.

- timestamp: 2026-10-31T11:12:00Z
  checked: .planning/sketches/039-project-switcher/index.html lines 105-125 and README layout contract
  found: |
    Sketch @42rem: `.brand-wordmark, .brand-separator, .snapshot-label, .search-label, .search-kbd,
    .shell-nav a svg { display: none; }`; `.snapshot-pill, .search-trigger { padding-inline: var(--space-2) }`;
    `.shell-controls { padding-inline: var(--space-2) }`; `.brand-area { margin-right: var(--space-2) }`
    and base `.brand-area { max-width: 100% }`. The pill collapses to its dot.
    Contract fact 6: "The trigger is at least 40px tall at 390px, and its name and meta truncate with an ellipsis."
  implication: The sketch frees the controls column by hiding the snapshot label; the build omitted that one selector.

- timestamp: 2026-10-31T11:14:00Z
  checked: test-results/phase-08/switcher-390-light.png vs switcher-390-light-sketch.png
  found: Build controls row = [■ Read just now] [search] [theme]; trigger is an empty chevron square beside the mark. Sketch controls row = [■] [search] [theme]; trigger shows "Lendshed / V2.1 · PHASE …" with chevron.
  implication: Visual difference localizes to the snapshot pill's label width.

- timestamp: 2026-10-31T11:15:00Z
  checked: test/e2e/projects-screenshots.spec.ts
  found: |
    Contract-A 390 branch checks only triggerBox.height >= 40 and computed text-overflow === 'ellipsis'
    (a style declaration, true even at 0px width). Name width is only pushed to test.info().annotations,
    never asserted. The 'long text in the header' test asserts `scrollWidth > clientWidth` on the name,
    which is trivially TRUE when clientWidth is 0 - so it passes on the broken layout.
  implication: Implicit/style-only oracle; no gate asserts the name is actually visible.

## Resolution

root_cause:
fix: (not applied - goal: find_root_cause_only)
verification:
files_changed: []
