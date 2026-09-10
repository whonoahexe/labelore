---
phase: 03-search-browsing-traceability
plan: 03
subsystem: navigation
tags: [react-router, tree-navigator, sidebar, oklch, native-details]

# Dependency graph
requires:
  - phase: 03-search-browsing-traceability
    provides: "03-01's ArtifactDto.location / D-11 reachable-equals-discovered fix and LOCATION_ORDER export; 03-02's ArtifactDto.warnings precedent for extending a DTO without a second data path"
provides:
  - "src/presentation/tree.ts — buildTreeViewModel(presentation), a pure projection producing the disk-mirroring TreeNode tree (group/directory/file/exclusion nodes) grouped by discovery's own LOCATION_ORDER"
  - "ProjectPresentation.exclusions — every recorded discovery exclusion (research/.cache/, a depth-terminated walk), populated on both the normal and empty presentation paths"
  - "GET /api/tree"
  - "src/web/components/tree-navigator.tsx — TreeNavigator, the persistent left sidebar consuming --sidebar/--sidebar-border/--sidebar-accent/--sidebar-primary for the first time"
  - "app-shell.tsx restructured from header-over-content into header-over-sidebar-plus-content, with --shell-header-height measured at runtime via ResizeObserver"
affects: [03-04]

# Actuals (#2632)
actuals:
  tokens: 10468
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tree-node reconstruction: split each artifact's own path on '/' after a location-specific prefix (never a second classify() copy of discovery.ts), nesting directory nodes only for the real intermediate segments; exclusions inserted through the identical path so group/directory sorting stays uniform."
    - "Ref-based imperative open-once-on-reveal for native <details> (roadmap-page.tsx's PhaseFlow idiom), reused for tree disclosure: only ever forces open, never fights a user's own manual close."
    - "Runtime-measured CSS custom property (--shell-header-height, ResizeObserver) instead of a guessed sticky offset, because the header's height is responsive/padded rather than a fixed rem value."

key-files:
  created:
    - src/presentation/tree.ts
    - src/web/components/tree-navigator.tsx
    - test/presentation/tree.test.ts
  modified:
    - src/server/project-presentation.ts
    - src/server/index.ts
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - test/presentation/dashboard.test.ts
    - test/presentation/roadmap.test.ts
    - test/presentation/search.test.ts
    - test/rendering/plan-sections.test.ts
    - test/rendering/references.test.ts
    - test/server/project-presentation.test.ts
    - test/web/attention-row-contract.test.ts
    - test/web/shell-contract.test.ts
    - test/web/visual-contract.test.ts

key-decisions:
  - "Group nodes (root/phase/archived-phase/quick/milestone-root/research/other) are a synthetic partition matching discovery's own LOCATION_ORDER, not literal top-level disk directories — archived-phase and milestone-root both live under milestones/ on disk but are two separate groups, exactly mirroring how discovery itself already classifies them, so the tree never disagrees with search about which bucket a file belongs to."
  - "Directory-node reconstruction strips only the location-defining path prefix (e.g. '.planning/milestones/' for archived-phase, keeping the literal vX.Y-phases/ wrapper directory), never re-deriving location from the path — location always comes from the artifact's own authoritative field."
  - "Phase directory nodes resolve their url by matching PhaseDto.dirPath against the accumulated cumulative path, not by re-parsing the directory name — avoids a second phase-identity derivation living in tree.ts."
  - "TreeNavigator owns its own /api/tree query rather than reusing AppShell's /api/presentation query, per the plan's explicit action text; the tree still has no separate visible error state — a query failure returns null and app-shell's own existing snapshot-error notice remains the only surface, coordinated via an onAbsentChange callback that drives the shell-content single-column collapse."
  - "Sidebar disclosure is the ref-based imperative open-once-on-reveal technique already established by roadmap-page.tsx's PhaseFlow, not a fully React-controlled `open` prop — matches the codebase's own precedent exactly and avoids fighting a user's manual close after the branch has been programmatically revealed once."

patterns-established:
  - "keyof typeof <exported const> to recover a domain union type without a fifth cross-module import, when a projection module's import list is deliberately restricted."

requirements-completed: [NAV-01]

coverage:
  - id: D1
    description: "The tree's file nodes reproduce the exact 52-path reachable set fixtures/dense already proved for search (03-01), with unrecognized-kind files as ordinary nodes and every recorded exclusion (research/.cache/) as a visible, reason-carrying stub — nothing found or deliberately skipped is ever silently absent."
    requirement: "NAV-01"
    verification:
      - kind: unit
        ref: "test/presentation/tree.test.ts — 9 tests covering leaf-set equality, LOCATION_ORDER group sequence, phase/quick-task/archived-phase directory reconstruction, unknown-kind leaves, the single research/.cache exclusion node, DTO-key-identical leaf urls, phase-url resolution, sparse-fixture no-throw, and dotted-numeric phase-directory ordering"
        status: pass
      - kind: integration
        ref: "manual verification — node src/server/index.ts fixtures/dense --port 4313, GET /api/tree returns HTTP 200 with 52 walked file nodes"
        status: pass
    human_judgment: false
  - id: D2
    description: "ProjectPresentation.exclusions is populated on both the normal load path and the empty/failed-load path, never an absent key."
    verification:
      - kind: unit
        ref: "test/server/project-presentation.test.ts — exclusions equal snapshot.exclusions on fixtures/dense, and exclusions survive the empty-presentation path when snapshot.project is null"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every route now carries a persistent left sidebar that mirrors the project's real directory tree — sticky, its own bounded scroll, consuming the previously-dormant --sidebar token family (background, border, hover accent, active-node primary) — restructured from header-over-content into header-over-sidebar-plus-content without regressing Phase 2's reading widths, and collapsing out of the layout entirely below the existing 62rem breakpoint."
    requirement: "NAV-01"
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts — 8 new tests: two-column grid + single-column collapse, --sidebar/--sidebar-border/--sidebar-accent consumption, sticky/bounded-height/overflow-y, --sidebar-primary active-node highlight, overflow-wrap:anywhere on long labels, document-reader-layout/page-stack width rules unregressed, narrow-viewport sidebar removal, no headless-collapsible/no-storage source checks"
        status: pass
      - kind: unit
        ref: "test/web/shell-contract.test.ts — TreeNavigator rendered inside the shell content region, skip-link target moved to .shell-outlet's #main-content"
        status: pass
      - kind: integration
        ref: "npm run build && npm test -- --run (446/446) && npm run typecheck && npm run lint (clean except the pre-existing, out-of-scope no-regex-spaces pair)"
        status: pass
    human_judgment: true
    rationale: "Reading-width preservation at three real viewport widths, independent sidebar scroll behavior, deep-link auto-expansion/highlight, a hand-opened branch staying open across navigation, the exclusion stub and unrecognized-file affordances, and light/dark legibility of the tree all need a human's eyes on the rendered app — no automated test asserts perceived layout, scroll isolation, or visual priority. This is the plan's own Task 2 `<human-check>` block, deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase (03-UI-SPEC.md's Dimension 2 FLAG names exactly this focal-point question as unresolved by the contract)."

duration: 18min
completed: 2026-09-02
status: complete
---

# Phase 3 Plan 3: Directory Tree Sidebar Summary

**A disk-mirroring tree projection (`buildTreeViewModel`) served at `GET /api/tree` and rendered as a persistent, sticky left sidebar that activates Phase 2's dormant `--sidebar` oklch token family for the first time.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-02T10:43:00Z
- **Completed:** 2026-09-02T11:01:00Z
- **Tasks:** 2
- **Files modified:** 16 (3 created, 13 modified)

## Accomplishments

- `src/presentation/tree.ts`: `buildTreeViewModel(presentation)` — a pure, I/O-free projection that
  reconstructs `.planning/`'s real directory hierarchy from the already-assembled
  `ProjectPresentation`, grouped by discovery's own `LOCATION_ORDER` (root, phase, archived-phase,
  quick, milestone-root, research, other), with every leaf's `url` reused verbatim from the
  artifact DTO's own `key` field — never a hand-built href.
- `ProjectPresentation.exclusions: DiscoveryExclusion[]` — every recorded discovery exclusion,
  passed through from `snapshot.exclusions` on both the normal and the empty presentation paths,
  so a deliberate skip (`research/.cache/`, a depth-terminated walk) is never silently invisible.
- `GET /api/tree` — verified end-to-end against `fixtures/dense`: HTTP 200, 52 walked file nodes,
  matching the exact reachable-artifact set plan 03-01 already proved for search.
- `src/web/components/tree-navigator.tsx`: `TreeNavigator`, a persistent sidebar built from native
  `<details>`/`<summary>` disclosure (never the headless collapsible primitive), top-level groups
  starting open, the current route's branch auto-expanding and highlighting via the exact
  ref-based imperative technique `roadmap-page.tsx`'s `PhaseFlow` already established, exclusion
  stubs rendered with a visible marker and their reason as an accessible description, and nothing
  ever written to storage.
- `src/web/components/app-shell.tsx`: restructured from header-over-content into
  header-over-sidebar-plus-content — a `ResizeObserver` measures the sticky header's own rendered
  height into `--shell-header-height` (never a guessed constant, since the header's height is
  responsive/padded rather than fixed), and a `data-sidebar` attribute collapses the grid to a
  single column when the tree has no error surface of its own to fall back on. The skip link now
  targets `.shell-outlet`'s `#main-content`, never the sidebar.
- `src/web/styles/globals.css`: the sidebar track — sticky, its own bounded height and
  `overflow-y`, the first real consumer of `--sidebar`/`--sidebar-border`/`--sidebar-accent`/
  `--sidebar-primary` — plus a narrow-viewport rule that removes the sidebar from the layout
  entirely below the existing 62rem breakpoint rather than squeezing the reading column.

## Task Commits

Each task was committed atomically:

1. **Task 1: The disk-mirroring tree projection** - `f3389ca` (feat)
2. **Task 2: The persistent sidebar and the restructured shell** - `bd28891` (feat)

## Files Created/Modified

- `src/presentation/tree.ts` - `TreeNode`, `buildTreeViewModel`
- `src/web/components/tree-navigator.tsx` - `TreeNavigator`
- `test/presentation/tree.test.ts` - New file: 9 structure/ordering/reconstruction/exclusion/url tests
- `src/server/project-presentation.ts` - `ProjectPresentation.exclusions` field
- `src/server/index.ts` - `GET /api/tree` route
- `src/web/components/app-shell.tsx` - Sidebar restructure, header-height measurement, skip-link retarget
- `src/web/styles/globals.css` - Sidebar track, disclosure/node/exclusion rules, narrow-viewport collapse
- `test/server/project-presentation.test.ts` - `exclusions` field assertions (normal + empty paths)
- `test/web/visual-contract.test.ts`, `test/web/shell-contract.test.ts` - Region-scoped sidebar assertions
- `test/presentation/dashboard.test.ts`, `test/presentation/roadmap.test.ts`, `test/presentation/search.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts`, `test/web/attention-row-contract.test.ts` - `exclusions: []` added to pre-existing `ProjectPresentation` fixtures that predate the new required field

## Decisions Made

See `key-decisions` in frontmatter — group taxonomy vs. literal disk directories, prefix-stripping
for directory reconstruction, phase-url resolution via `dirPath` matching, TreeNavigator's own
independent query with no separate error surface, and the ref-based imperative disclosure
technique reused from `PhaseFlow`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Six pre-existing `ProjectPresentation` test fixtures broke under the new required `exclusions` field**
- **Found during:** Task 1, `npm run typecheck` after adding `ProjectPresentation.exclusions`
- **Issue:** `test/presentation/dashboard.test.ts`, `roadmap.test.ts`, `search.test.ts`,
  `test/rendering/plan-sections.test.ts`, `references.test.ts`, and
  `test/web/attention-row-contract.test.ts` each hand-build a `ProjectPresentation`-shaped object
  literal; none carried the newly-required `exclusions` field, so `tsc` failed with "Property
  'exclusions' is missing" / "Type 'DiscoveryExclusion[] | undefined' is not assignable".
- **Fix:** Added `exclusions: []` to each fixture. One collateral slip during the batch edit added
  `exclusions: []` to `test/presentation/search.test.ts`'s `makeProject()` helper (which returns a
  domain `Project`, not `ProjectPresentation`, and has no such field) — caught immediately by the
  same typecheck pass and reverted before proceeding.
- **Files modified:** `test/presentation/dashboard.test.ts`, `test/presentation/roadmap.test.ts`,
  `test/presentation/search.test.ts`, `test/rendering/plan-sections.test.ts`,
  `test/rendering/references.test.ts`, `test/web/attention-row-contract.test.ts`
- **Verification:** `npm run typecheck` clean; full suite 436/436 after Task 1, 446/446 after Task 2.
- **Committed in:** `f3389ca` (Task 1 commit)

**2. [Rule 1 - Bug] My own comment text tripped Task 1's own acceptance-criteria grep**
- **Found during:** Task 1, running the plan's own acceptance-criteria command
  (`grep -n "node:fs\|node:path\|discover(" src/presentation/tree.ts`)
- **Issue:** A prose comment at the top of `tree.ts` explaining the prohibition ("no second call to
  discover(), no node:fs/node:path import") contained the literal substrings the grep was checking
  for, so the blind textual acceptance check failed against my own explanatory comment even though
  no actual import or call existed.
- **Fix:** Reworded the comment to describe the same constraint without the literal flagged
  substrings ("no filesystem I/O, no second walk of the planning tree, no low-level filesystem-path
  module import").
- **Files modified:** `src/presentation/tree.ts`
- **Verification:** `grep -n "node:fs\|node:path\|discover(" src/presentation/tree.ts` now returns
  no lines.
- **Committed in:** `f3389ca` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking type-compat fix across six fixtures plus one
self-caught collateral revert, 1 self-inflicted acceptance-grep wording fix). **Impact on plan:**
Both were necessary for the plan's own stated gates (typecheck cleanliness, the literal grep
acceptance criterion) and involved no scope creep — no production behavior changed as a result of
either fix.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `buildTreeViewModel`, `GET /api/tree`, and `ProjectPresentation.exclusions` are available for
  03-04 (traceability) to reuse if it needs the same disk-position or exclusion-ledger data,
  without re-deriving either.
- Full suite green at 446/446; `npm run build` succeeds; `npm run typecheck` clean; `npm run lint`
  clean except the pre-existing, out-of-scope `test/web/visual-contract.test.ts` `no-regex-spaces`
  pair already logged in `deferred-items.md`/`WINDOWS.md` by plan 03-01 (untouched by this plan).
- One human-judgment item remains for end-of-phase UAT (coverage `D3`, Task 2's own
  `<human-check>` block): reading-width preservation at three real viewport widths, independent
  sidebar scroll, deep-link auto-expand/highlight, hand-opened-branch persistence, the exclusion
  stub and unrecognized-file affordances on a real rendered project, and light/dark legibility of
  the tree — none of which an automated test can assert perceptually. This is also where
  03-UI-SPEC.md's Dimension 2 FLAG (what anchors visual focus in a deeply-nested tree) gets its
  actual answer against the real rendered surface.

---
*Phase: 03-search-browsing-traceability*
*Completed: 2026-09-02*

## Self-Check: PASSED
