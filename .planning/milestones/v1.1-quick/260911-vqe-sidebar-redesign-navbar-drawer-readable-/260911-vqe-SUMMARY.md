---
phase: quick-260911-vqe
plan: 01
subsystem: ui
tags: [react, base-ui, react-query, css-tokens, playwright]

requires:
  - phase: quick-260910-jz8
    provides: centralized spacing/type/color design tokens and test/token-guard.test.ts
provides:
  - a navbar-triggered overlay drawer (@base-ui/react Dialog) that replaces the permanent
    18rem planning-tree sidebar, restoring full-width content at every viewport width
  - a pure tree-labels.ts module giving every tree node a readable label, a small badge
    (phase number / milestone version / quick-task date), and a lifecycle sort rank, on top
    of the existing naming.ts grammar parsers
  - a rewritten tree.ts projection with no exclusion node type — recorded exclusions are no
    longer rendered in the tree, though ProjectPresentation.exclusions is untouched
affects: [sidebar-drawer.tsx, tree-navigator.tsx, tree.ts, tree-labels.ts, globals.css]

actuals:
  tokens: 19312
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Pure label/rank derivation module (tree-labels.ts) sitting between a domain grammar
      parser module and a projection module, with type-only imports back into the projection
      to avoid a runtime cycle"
    - "useTreeQuery() exported from the component that owns a react-query queryKey, so a
      sibling component (AppShell) can gate rendering on query state without a second fetch"

key-files:
  created:
    - src/presentation/tree-labels.ts
    - src/web/components/sidebar-drawer.tsx
  modified:
    - src/presentation/tree.ts
    - src/web/components/tree-navigator.tsx
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css

key-decisions:
  - "D-01: overlay drawer at every width, opened from a menu icon at the far left of the navbar — content always gets the full width"
  - "D-02: readable names only in the tree; the raw on-disk path goes in the row's title tooltip"
  - "D-03: files sort in lifecycle order (context/spec/plan+summary/verification/...), not alphabetically"
  - "D-04: exclusions are removed from the tree UI entirely, reversing Phase-3 D-10's visible-stub rule for this surface only — ProjectPresentation.exclusions is untouched for other surfaces"

requirements-completed: [SB-01, SB-02, SB-03, SB-04, SB-05]

coverage:
  - id: D1
    description: "Exclusions removed from the tree: no exclusion node type, no research/.cache path, no 'Excluded' text anywhere in the drawer"
    requirement: "SB-01"
    verification:
      - kind: unit
        ref: "test/presentation/tree.test.ts#buildTreeViewModel — exclusions hidden (D-04, WR-01 inverted)"
        status: pass
      - kind: automated_ui
        ref: "/tmp/vqe-drawer-check.mjs step (d), all 4 width/theme combinations"
        status: pass
    human_judgment: false
  - id: D2
    description: "Readable labels with badges (phase number, milestone version, quick-task date); raw path lives only in the row's title tooltip; same-label siblings disambiguate with a suffix"
    requirement: "SB-02"
    verification:
      - kind: unit
        ref: "test/presentation/tree.test.ts#buildTreeViewModel — readable labels and badges (quick-260911-vqe D-02)"
        status: pass
      - kind: automated_ui
        ref: "/tmp/vqe-drawer-check.mjs steps (c) and (d), all 4 width/theme combinations"
        status: pass
    human_judgment: false
  - id: D3
    description: "Lifecycle ordering of files within a phase, root, research, milestone-root and quick directories"
    requirement: "SB-03"
    verification:
      - kind: unit
        ref: "test/presentation/tree.test.ts#buildTreeViewModel — lifecycle order (D-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Navbar-triggered overlay drawer: PanelLeft trigger at the far left of the header, opens a left-edge keepMounted Dialog over a scrim, closes via link click / Esc / backdrop / close button, active row scrolled into view on open, content spans full width at every viewport"
    requirement: "SB-04"
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#planning-files drawer (quick-260911-vqe D-01..D-04, SB-04/SB-05)"
        status: pass
      - kind: unit
        ref: "test/web/shell-contract.test.ts#mounts the planning-files drawer trigger in the header and keeps a single-column content region (quick-260911-vqe D-01)"
        status: pass
      - kind: automated_ui
        ref: "/tmp/vqe-drawer-check.mjs steps (a),(b),(f),(g),(h),(i),(j), all 4 width/theme combinations"
        status: pass
    human_judgment: true
    rationale: "The must_haves truths require a live visual read (menu icon placement, scrim, slide animation, row rhythm, dark/light legibility) beyond what a source-text or DOM-geometry assertion can fully confirm — screenshots are provided for end-of-phase human review."
  - id: D5
    description: "One row anatomy, one colour ramp and one rhythm, all on design tokens; new --drawer-width token; token-guard passes"
    requirement: "SB-05"
    verification:
      - kind: unit
        ref: "test/token-guard.test.ts#token guard — spacing + type + colour families (JZ8-01, JZ8-02, JZ8-03, JZ8-04)"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#planning-files drawer (quick-260911-vqe D-01..D-04, SB-04/SB-05)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-11
status: complete
---

# Quick 260911-vqe: Sidebar redesign (navbar drawer, readable labels, lifecycle order, exclusions hidden) Summary

**Overlay drawer opened from a header PanelLeft trigger replaces the permanent 18rem tree sidebar; tree-labels.ts gives every row a readable name and badge in lifecycle order, and recorded exclusions no longer render in the tree.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 (tracer, expansion, verification)
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- Replaced the persistent 18rem planning-tree sidebar with a `@base-ui/react` Dialog-based
  drawer, triggered by a `PanelLeft` icon at the far left of the header at every viewport
  width. The reading column is now full width at 1440px and 400px alike, and the tree is
  reachable below the former 62rem breakpoint where it used to be `display: none`.
- Added `src/presentation/tree-labels.ts`, a pure module (no DOM, no React, no filesystem)
  deriving readable labels, small mono badges, and a lifecycle sort rank for every tree node
  from the existing `naming.ts` grammar parsers — no duplicated filename regex.
- Reworked `src/presentation/tree.ts`: `TreeNode` gains a `badge: string | null` field, the
  `'exclusion'` node type and `excludedReason` field are gone, and `sortChildren` now ranks
  siblings via `tree-labels.ts` instead of alphabetically, then disambiguates same-label
  siblings (`State` / `State (JSON)`).
- Rewrote the tree row markup: a chevron slot (rotating on open), a single-line ellipsis label
  with the raw path in a `title` tooltip, an optional mono badge, and the existing
  Warning/Unreadable indicator — one shared grid, colour ramp and rhythm across every row.
- Added the `--drawer-width: min(22rem, 88vw)` token and a full drawer/backdrop/header CSS
  block (slide transition, `prefers-reduced-motion` support, focus-visible ring); deleted the
  three `.tree-excluded*` CSS rules. `test/token-guard.test.ts` passes with zero violations.
- Verified live against `fixtures/dense` on port 4211 (never touching the user's 4210
  instance): a Node tracer script hitting `/api/tree` directly (Task 1), and a
  `playwright-core` script driving the built app through every open/close path, at 1440px and
  400px, in both light and dark themes (111 assertions, all passing).

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): readable, lifecycle-ordered, exclusion-free tree, end to end** - `a73e5c3` (feat)
2. **Task 2: overlay drawer behind a navbar menu trigger, plus one row anatomy, colour ramp and rhythm in tokens** - `962e8c7` (feat)
3. **Task 3: full gate plus live drawer verification at 1440px and 400px, light and dark, closed and open** - `a6e6532` (fix — a one-line CSS deviation found during Task 3's own live check; see Deviations below). Task 3 is otherwise verification-only per the plan's `<files>none; verification only.</files>`.

**Plan metadata:** committed separately by the orchestrator (this quick task does not commit `.planning/` docs itself, per its constraints).

## Files Created/Modified

- `src/presentation/tree-labels.ts` - new: `sentenceCase`, `labelOf`, `rankOf`, `formatSuffix`, `GROUP_LABELS`
- `src/presentation/tree.ts` - `TreeNode.badge`, no `'exclusion'` node type, lifecycle-ranked `sortChildren`
- `src/web/components/sidebar-drawer.tsx` - new: `SidebarDrawer`, a `@base-ui/react/dialog`-based left drawer
- `src/web/components/tree-navigator.tsx` - `useTreeQuery` export, `{open, onNavigate}` props, chevron/badge/ellipsis row markup, scroll-into-view-on-open effect
- `src/web/components/app-shell.tsx` - drops header-measurement/absent-sidebar state, renders `SidebarDrawer` as the header's first child once the tree query succeeds
- `src/web/styles/globals.css` - `--drawer-width` token, drawer/backdrop/header rules, one row grid/colour ramp/rhythm, exclusion CSS deleted
- `test/presentation/tree.test.ts` - readable-label, lifecycle-order and exclusions-hidden test coverage
- `test/web/visual-contract.test.ts` - retargeted from the persistent-sidebar pins to the drawer contract
- `test/web/shell-contract.test.ts` - retargeted the D-09 sidebar test to the drawer-trigger contract

## Decisions Made

- Locked user decisions D-01 through D-04 (from `/home/cinedise/.claude/plans/fancy-humming-mango.md`) were followed as written; no revisiting.
- `v3.0-CAPACITY-PLAN.md` reads "Capacity plan" (not "V3.0 capacity plan") — the plan's own noted point of Claude's discretion for the root/milestone-root milestone-file label rule, recorded as intended.
- Removed `align-self: center` from `.sidebar-trigger` (a deviation from the plan's literal CSS text in step 5, which named `align-self: center`) — see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dropped `.sidebar-trigger`'s `align-self: center`, which misaligned the trigger against the brand mark at 400px**
- **Found during:** Task 3, live playwright check step (a) — "trigger and brand tops align" assertion measured a 12px offset (`triggerTop: 12, brandTop: 0`) at the 400px viewport
- **Issue:** The plan's literal CSS text specified `align-self: center` on `.sidebar-trigger`. At 400px, `.shell-controls` (in the same header row) grows taller than the fixed-height trigger button, so a centered trigger sits visibly below the brand mark's own top edge — failing the plan's own must-have truth ("the current route's row is scrolled into view" is unrelated, but the drawer's UI-Considerations section and Task 3's own live assertion require the trigger and brand tops to align within 4px at 400px)
- **Fix:** Removed the `align-self: center` declaration. With the trigger's own fixed height (from `buttonVariants({ size: 'sm' })`) and no override, the CSS Box Alignment spec's stretch-with-a-definite-size fallback places the item at the start of its grid row — top-aligned with `.brand`, whose own box top is likewise the row's start regardless of its internal flex centering.
- **Files modified:** `src/web/styles/globals.css`
- **Verification:** Task 3's live playwright assertion "(a) trigger and brand tops align" now passes at 400px in both light and dark (previously failing by 12px)
- **Committed in:** `a6e6532` (a dedicated fix commit, made during Task 3's own verification pass)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** A one-line CSS correction to satisfy the plan's own live verification step; no scope creep, no architectural change.

## Issues Encountered

- The Task 3 live-verification script initially measured the drawer's slide-in transition
  mid-flight (drawer rect `left: -352` instead of `0`) and mid-flight on close-after-link-click
  (still visible) — both were script timing issues, not product bugs. Fixed by waiting for the
  `.sidebar-drawer`'s `visible`/`hidden` state (and a short settle delay after opening) before
  measuring geometry, rather than checking immediately after the triggering click.
- The first click target for the "click the UI spec link" step (`a[title="..."]`) never
  matched, because the raw-path `title` attribute lives on the inner `.tree-node-label` span
  for leaf rows, not the wrapping `<a>` — corrected the selector to target the span (the click
  still bubbles to the anchor's own navigation handler).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The drawer, readable labels, lifecycle order and exclusion-hiding are fully wired end to end
  and verified live on `fixtures/dense` at 1440px/400px in both themes.
- Explicitly out of scope per the plan (unchanged): a filter box or counts, phase status dots,
  hiding empty groups, merging each plan with its summary, a current-phase highlight, a
  Ctrl/Cmd+B shortcut, an expand/collapse-all control, and any change to the search page's own
  group labels.
- No blockers. `npm test`/`typecheck`/`lint`/`build` are green (one pre-existing, unrelated
  failure in `test/rendering/markdown.test.ts` persists — it reads a file at
  `.planning/phases/01-read-layer-domain-model/01-04-PLAN.md` that no longer exists in this
  repo's own `.planning/` after milestone archiving; confirmed present before this task's
  changes via `git stash`, out of this task's scope).

## Rendered Verification (Task 1 + Task 3)

**Task 1 — live `/api/tree` tracer** (`/tmp/vqe-api-check.mjs`, against `fixtures/dense` on port 4211):

```json
{
  "firstGroupIsProject": true,
  "identitySliceLabel": "Identity Slice",
  "identitySliceBadge": "01",
  "identitySliceOk": true,
  "noExclusionNodeType": true,
  "noCachePath": true
}
```

**Task 3 — live drawer check** (`/tmp/vqe-drawer-check.mjs`, playwright-core + cached Chromium
1234, against the built `dist/` served on port 4211): **111 assertions, 0 failures**, covering
steps (a) through (j) at 1440px and 400px, in light and dark, plus an optional read-only shot
against `~/studio-portal` (present on this machine) confirming no "Excluded" text there either.

Screenshots (under `/tmp/vqe-shots/`, outside the repo, not committed):
- `1440-light-closed.png`, `1440-light-open.png`
- `1440-dark-closed.png`, `1440-dark-open.png`
- `400-light-closed.png`, `400-light-open.png`
- `400-dark-closed.png`, `400-dark-open.png`
- `studio-portal-1440-light-open.png` (optional real-project shot)

Visual review of the above: the menu icon sits at the far left of the header at every width;
content spans the full width with the drawer closed; the drawer slides in from the left over a
scrim with square corners; rows share one height/rhythm with aligned chevrons and
leaf-text-under-folder-text indentation; labels read as a table of contents ("Plan 01", "UI
spec", "State", "Identity Slice" with a mono "01" badge) with no raw filenames and no
"Excluded" stub visible; the active "Plan 01" row is highlighted and scrolled into view; both
themes stay legible.

Ports used: 4211 only for this task's own server (started and stopped by this task); the
user's existing instance on port 4210 was never touched, confirmed by curl before and after.

---
*Phase: quick-260911-vqe*
*Completed: 2026-09-11*

## Self-Check: PASSED

All 9 created/modified source and test files confirmed present on disk; all three commits
(`a73e5c3`, `962e8c7`, `a6e6532`) confirmed present in `git log --oneline --all`. Working tree
clean of code changes (`git status --short` shows only the untracked `.gsd/` and this task's own
`.planning/quick/` directory, neither committed by this task per its constraints). No missing
items.
