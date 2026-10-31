---
status: diagnosed
trigger: "UAT gap G-08-2: At 390px the header switcher trigger is a bare 40px chevron with a 0px name; nothing in the header says which project is open."
created: 2026-10-31T11:00:00Z
updated: 2026-10-31T11:40:00Z
goal: find_root_cause_only
---

## Current Focus

bug_class: Bohrbug (deterministic CSS layout; reproduces on every render at or below about 400px)
hypothesis: CONFIRMED (H1). See Resolution.
next_action: none. Diagnose-only; handed to plan-phase --gaps.

reasoning_checkpoint:
  hypothesis: "At <=42rem the header grid is 'menu brand controls' / `auto minmax(0,1fr) auto`. Grid gives the auto `controls` track its full max-content before the 1fr `brand` track gets the leftover. The build keeps `.snapshot-label` ('Read just now', 79.8px) inside that auto track, while sketch 039 hides it at 42rem. So controls take 237.8px, brand gets 100.2px, and `.brand-project` (min-width 0, overflow-hidden children, so 0 min-content contribution) collapses to 0px inside an 86px lockup (36 mark + 10 gap + 40 trigger chrome)."
  confirming_evidence:
    - "Measured at 390x844 on the built app: grid columns 52 / 100.17 / 237.83; pill 117.8 (label 79.8); trigger 40x40; .brand-project-name clientWidth 0 (scrollWidth 62)."
    - "Same page with only `.snapshot-label{display:none}` injected at 42rem: columns 52 / 188 / 150; trigger 118; name clientWidth 78 (full 'Lendshed', meta truncated). The name width moved by about the label's width, as predicted."
    - "All four of the sketch's 42rem header rules injected: name 103px at 390, 72px at 360, 32px (truncated) at 320; no sideways overflow. The trigger is 143px at 390, which matches the sketch screenshot."
    - "Sketch 039 index.html line 112 hides `.snapshot-label` (plus .search-label/.search-kbd) at 42rem. The build's 42rem block (globals.css 3880-3922) hides only .brand-wordmark, .brand-separator and .search-trigger-kbd."
  falsification_test: "If hiding .snapshot-label left the name at 0px, or the controls column were not sized to its max-content, H1 would be false. Tested: the name went from 0 to 78px."
  fix_rationale: "N/A (diagnose-only). Direction: shrink the controls' max-content at <=42rem as the sketch does, or stop the brand column from being pure leftover."
  blind_spots: "Only Chromium was measured. Real projects with long meta lines change the meta width but not the 0px collapse. The 'pending'/'error' pill states ('Reading snapshot…', 'Metadata unavailable') are wider than 'Read just now', so they squeeze the name further today."
  candidate_causes:
    - "code (CSS): the sketch's `.snapshot-label { display: none }` at 42rem was not ported, so the controls auto track holds the full label."
    - "code (CSS grid structure): `auto minmax(0,1fr) auto`. The auto tracks reach max-content before the fr track gets any space, so the brand column is pure leftover and `.brand-project` has a 0 min-content contribution. This dates from 962e8c7 (quick-260911-vqe), which moved controls back into row 1; the comment at globals.css 3900-3905 still describes the old full-width controls row."
    - "config/spec (process): 08-UI-SPEC line 164 declares 'snapshot status ... unchanged'. Contract fact 6 asks only for height >= 40 and ellipsis, with no visible width. 08-11-SUMMARY line 136 logged it as 'observation, not fixed' because the pill is 08-09's file."
    - "test gate: no test asserts a visible name width. text-overflow:ellipsis is a declared style, and `scrollWidth > clientWidth` is trivially true at clientWidth 0."
  and_gate: "yes: the 0px name needs both (a) the label in the controls auto track and (b) auto-before-fr track sizing that leaves the brand column as the remainder. Removing either one restores the name. The spec and test gaps are why it shipped, not why it renders."

## Symptoms

expected: At 390px wide with a project open, the header shows which project is current (Phase 08 contract fact 6 from sketch 039 A: switcher trigger at least 40px tall, name cut with an ellipsis).
actual: At 390px the header trigger is a bare 40x40 chevron with a 0px-wide name; nothing in the header says which project is open. The sketch shows name and meta at this width by collapsing the snapshot pill to a dot; the build keeps the "Read just now" label. At 1280px the trigger is 200x36 with a 160px name.
errors: None reported
reproduction: UAT test 2. `npx playwright test test/e2e/projects-screenshots.spec.ts` -> test-results/phase-08/switcher-390-light.png (build) vs switcher-390-light-sketch.png (sketch). The spec passes; it does not assert name width > 0.
started: Discovered during Phase 08 UAT (2026-10-31); noted earlier in 08-15-SUMMARY.md

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

- timestamp: 2026-10-31T11:22:00Z
  checked: Playwright measurement (scratchpad measure-header.mjs) of the real server on test/fixtures/lendshed, Chromium, 390/360/320/672/1280 wide
  found: |
    390 baseline: grid cols "52px 100.172px 237.828px"; lockup 86 (overflows its 100px track by ~10 with margins 8+16);
      trigger 40x40; brand-project 0; name clientWidth 0 / scrollWidth 62; controls 237.8 (pill 117.8, label 79.8, search 36, theme 36, padding 16+16).
    390 + `.snapshot-label{display:none}`: cols "52px 188px 150px"; trigger 118; name clientWidth 78; meta clientWidth 78 (truncated from 160).
    360 baseline name 0 -> 48 with label hidden; 320 baseline name 0 -> 8 with label hidden.
    672 (still <=42rem): name 160 either way (enough leftover). 1280: name 160, trigger 200x36 (matches symptom).
  implication: H1 confirmed. The controls auto track's max-content directly sets the brand column, and the label is the deciding ~88px at 390.

- timestamp: 2026-10-31T11:30:00Z
  checked: all four sketch-039 42rem header rules injected (.snapshot-label hidden; .shell-controls padding-inline space-2; .snapshot-pill/.search-trigger padding-inline space-2; .brand-lockup margin-right space-2)
  found: 390 -> name 103px, trigger 143px (sketch screenshot ~140px); 360 -> 72px; 320 -> 32px (truncates); no sideways overflow at any width.
  implication: Porting the sketch's whole 42rem block, not only the label rule, matches the sketch and keeps a readable name down to 360. At 320 the name is clipped but not 0.

- timestamp: 2026-10-31T11:32:00Z
  checked: git history (git log -S) for the controls row and the pre-Phase-8 brand CSS (c44966f^)
  found: d615c9d (quick-260909-ogb, CR-02) once put controls on a full-width row below 62rem/42rem. 962e8c7 (quick-260911-vqe) moved them back into row 1 ('menu brand controls'). The 42rem comment at globals.css 3900-3905 still describes the full-width row, so it is stale. Before Phase 8 the name sat inside the .brand link under the same grid and the same controls, so the leftover-column squeeze predates the switcher.
  implication: This is an older structural squeeze. Sketch 039 solved it for 390px, and 08-11 did not carry that solution over.

- timestamp: 2026-10-31T11:34:00Z
  checked: 08-11-SUMMARY.md:136, 08-15-SUMMARY.md:74, 08-UI-SPEC.md:164,237, docs/design-language.md, test/web/navbar-contract.test.ts:516, v1.0 TGT-08
  found: |
    08-11 logged "Narrow header (observation, not fixed) ... A follow-up could drop the pill label below 42rem."
    UI-SPEC:164 says "snapshot status ... unchanged"; UI-SPEC:237 says "the trigger truncates name and meta with ellipsis".
    design-language.md already lists snapshot-label/-pill/-status/-dot and project-switcher-trigger, so no new class is needed.
    navbar-contract.test.ts:516 already pins `.search-trigger-kbd { display: none }` in the 42rem block (same pattern).
    TGT-08 (v1.0): "Every view shows when its data was read from disk". CR-02 (d615c9d) deliberately kept the age visible below 62rem.
  implication: The sketch's dot-only pill hides the visible read time at <=42rem. The time stays in the pill's title, its aria-describedby (a hidden node that is directly referenced still counts) and the sr-only live region. The planner must accept that TGT-08 trade at phone width, or choose a layout that keeps both.

- timestamp: 2026-10-31T11:36:00Z
  checked: test/e2e/switcher.spec.ts:231-239 and 329-344
  found: The 390 popup test checks trigger height only. 'a long project name' at 390 asserts textOverflow 'ellipsis' and `scrollWidth > clientWidth`, which is true when clientWidth is 0.
  implication: Three browser tests in total pass on the broken layout: projects-screenshots contract A at 390, its long-text test, and switcher.spec's long-name test.

## Eliminated

- hypothesis: H0a - a 42rem rule hides or zero-widths the name (display:none / width:0 / visibility on .brand-project or .brand-project-name)
  evidence: grep finds no such rule. With the label hidden the same element gets 78px, so nothing pins it to 0.
  timestamp: 2026-10-31T11:22:00Z
- hypothesis: H0b - the trigger itself is fixed at 40px wide at 42rem
  evidence: the 42rem rule sets only min-height var(--space-10). The trigger grows to 118 and then 143px once the controls shrink.
  timestamp: 2026-10-31T11:22:00Z

## Resolution

root_cause: |
  AND-gate, two layout conditions that must both hold:
  (1) src/web/styles/globals.css @media (max-width: 42rem) (lines ~3880-3922) does not collapse the snapshot
      pill to its dot. Sketch 039 A hides `.snapshot-label` (plus .search-label/.search-kbd) and tightens
      `.shell-controls`/pill/search padding and `.brand-area` margin-right at 42rem. 08-11 ported only the trigger
      and popup rules, so the "Read just now" label (79.8px) stays in the header's first row.
  (2) The narrow header grid (globals.css 3727-3731) is `auto minmax(0,1fr) auto` with areas 'menu brand controls'.
      Grid gives the auto `controls` track its full max-content (237.8px at 390) before the 1fr `brand` track
      gets the rest (100.2px). `.brand-project` has min-width 0 and overflow-hidden children, so it is the one
      shrinkable item in the brand lockup and drops to 0px. The trigger keeps only its padding, gap and chevron
      (40px).
  Why it shipped: 08-UI-SPEC:164 scoped the snapshot status as "unchanged", contract fact 6 asks only for
  height and ellipsis, and no test asserts a visible name width. The existing `scrollWidth > clientWidth`
  truncation checks pass when clientWidth is 0.
fix: (not applied - goal: find_root_cause_only)
verification: |
  Diagnostic only. In-page CSS injection at 390x844: name 0px -> 78px (label rule alone) -> 103px (all four sketch rules).
  Measurement script: /tmp/claude-0/-home-user-labelore/6a822f45-b5cf-53a7-96e8-f4be8bbf6c97/scratchpad/measure-header.mjs
files_changed: []
