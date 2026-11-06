---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 19
subsystem: web-views
tags: [indexes, intel, graph, bounded-summary, grid, view-19]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 adoption of C5 and X3 and approval of X5; 11-13 bounded intel and graph summaries; 11-18 Indexes spine (grid, Graph tile, ghost, in-place open and close)"
provides:
  - "Every Indexes tile figure: layer stack, framework chips, big counts with split bars, method tags, production and development split, synthesis document count with the file's own conflict chips"
  - "Every open panel per UI-SPEC section 4 (Graph, Architecture, Stack, File roles, API surface, Dependencies, Synthesis, generic), every list as '{shown} of {n}'"
  - "Unreadable tiles (path plus the shared Unreadable chip) and generic tiles for unknown intel files (title from the name, key names only)"
  - "Graph summary additions: thin communities, import cycle count, extraction shares, report date; synthesis per-type classification split"
  - "design-language.md Indexes tone uses and the 055 A Language bullet; indexes view-contract tests"
affects: []

actuals:
  tokens: 62000
  tasks: 3
  commits: 3
plan_head_before: b9f7962caed9338636355638ab3ecc268226bd33
plan_head_after: 994f58edbecc19d4b4c53abb58c86af816e6ba3a

key-files:
  created:
    - test/presentation/indexes-context.test.ts
  modified:
    - src/presentation/indexes-context.ts
    - src/web/views/indexes-page.ts
    - src/web/views/indexes-page-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - src/server/index-summary.ts
    - src/planning-repo/handlers/index-intel-lift.ts
    - test/web/indexes-page.test.ts
    - test/server/index-summary.test.ts
    - test/index-intel-handler.test.ts

key-decisions:
  - "Tiles stay real buttons (aria-expanded, aria-controls, UI-SPEC section 10) that navigate to the file's address; a tile the address already names, collapsed in place, simply opens again (X3)"
  - "IndexTileKey gains `file:{name}` for generic tiles; only files directly in intel/ with a .json or .md extension get one, sub-folder files (classifications/) are never tiled"
  - "A synthesis bucket that holds none is quiet, never missing or in-flight (a zero blocker count must not read as a problem)"
  - "Last good build falls back to the report's title date when the last update failed, so a failed refresh still shows the date of the counts beside it"
  - "Freshness cells are not aria-hidden (they are content); only bar and split-bar cells are hidden, each bar carrying one accessible name"
  - "Report summary lines are shown in the Graph panel only when no counts were read (otherwise they repeat the big counts and the split)"

requirements-completed: [VIEW-19]

coverage:
  - id: D1
    description: "Grid of one tile per index file in UI-SPEC order with spans, each with title, path and key figure; ingest-docs order Synthesis then Graph; Not built ghost (data-ghost, no tabindex)"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/indexes-page.test.ts (figures, spans, ghost markup), test/presentation/indexes-context.test.ts (order, partial lists)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Unreadable file shows its path and the Unreadable chip while other tiles render; unknown intel file is a generic tile with key names only"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/presentation/indexes-context.test.ts, test/web/indexes-page.test.ts (SECRET-VALUE never in the markup)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Open tile spans the row with the shared panel and Close; Esc and Close collapse in place and keep the address; another tile navigates to its address"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/indexes-page.test.ts (Close label, aria-expanded and aria-controls markup, view contract)"
        status: pass
      - kind: other
        ref: "ad-hoc Playwright run on Lendshed in system Chrome (not committed): Close and Esc leave the URL unchanged and return focus to the tile; clicking Stack goes to /intel/stack.json with Stack open; clicking a collapsed tile the address names reopens it"
        status: pass
    human_judgment: false
  - id: D4
    description: "Counts read '1 commit behind' / '{n} commits behind', '{shown} of {n} entries', '{shown} of {n} routes'"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/web/indexes-page.test.ts (commit counts, '12 of 13 entries', '6 of 8 routes')"
        status: pass
    human_judgment: false
  - id: D5
    description: "Built beside sketch 055 A at 1280 and 390, light and dark, on Lendshed, a generated 20,000-node graph, a generated ingest-docs project and the real 22 MB graph"
    requirement: "VIEW-19"
    verification:
      - kind: other
        ref: "shoot-pages on all four projects, 28 PNGs, no FAIL line; side-by-side notes below"
        status: pass
    human_judgment: true

duration: 55min
completed: 2026-11-07
status: complete
commits: 3
---

# Phase 11 Plan 19: Indexes tiles and panels Summary

**Every Indexes tile now carries its key figure and every opened tile its bounded panel as sketch 055 A draws them: the Graph panel with four counts, three freshness cells, the extraction split, the most connected bars and the "Not sent to this page" line; Synthesis with the file's own conflict chips beside a hatched "Not built" graph; unreadable files and unknown intel files read honestly; and closing a tile collapses it in place and keeps the address.**

## Accomplishments

- **Task 1 (tracer): an ingest-docs project opens on Synthesis.** The Synthesis tile shows the document count and the file's own conflict words (blockers `missing`, competing variants `in-flight`, auto-resolved `quiet`), none when the conflicts line was unreadable, beside the Not built ghost. Shot in a real browser before expanding.
- **Task 2: every tile and panel.** `buildIndexesContext` adds generic tiles; `composeIndexes` builds a figure per kind and a typed panel body per kind; `IndexesView` draws them with phrasing-only atoms so the same pieces serve a tile button and an open panel. Split bars and big counts carry one accessible name each with decoration hidden. The Indexes CSS block grew to the split bar, tags, bars, layer stack, key rows, route and document rows, withheld line, with colours only from theme tokens and five font sizes (display-3 h1, display-1 counts X5, fs-7, fs-4, fs-2). design-language.md gained the Indexes tone uses and the 055 A Language bullet.
- **Task 3: the build beside sketch 055 A.** See below.
- Full unit gate: `gate: total=6760 passed=6760 failed=0 skipped=0 todo=0`; typecheck and lint exit 0; build ok.

## Task Commits

1. Task 1 (tracer): `65f5f8c`
2. Task 2: `ba27978`
3. Task 3 (post side-by-side fixes): `994f58e`

## Side-by-side with sketch 055 A

Shot Lendshed (`/graphs/graph.json`, `/intel/arch-decisions.json`, `/intel/api-map.json`) with `--sketch`, a generated 20,000-node graph project, a generated ingest-docs project and the real 22 MB graph (a copy from an earlier scratch session, `.../shapes/labelore-copy`, shot into a temporary folder, never committed), each at 1280 and 390, light and dark: 28 PNGs, no FAIL line (one h1, no sideways scroll at 390, no page errors). The grid, the Graph/File roles/Dependencies wide tiles, counts, status chips, freshness cells, split bars with their keys, hub bars, the withheld line and the hatched ghost read as the sketch. The real graph shows 19,525 nodes, 38,918 edges, 1,027 communities (203 thin), 3 import cycles, 87/13 extraction, the ten God Nodes and 21.2 MB / 21.2 MB / 1.1 MB on the withheld line with no overflow.

What changed after the side-by-side: at 390 a hub or dependency bar sat equally far from its own label and from the next row, so bars read as belonging to the next label; the narrow rule now keeps the bar close under its label and the rows apart. The interaction run also found that opening another tile briefly re-opened the old collapsed panel while the new address loaded; fixed (the collapsed state resets only when the address's tile changes). Otherwise "matches the layout contract".

Differences left on purpose: tile title is "Graph" (UI-SPEC copy) not the sketch's "Knowledge graph"; the tile head carries the full path (the contract's mono path with ellipsis, full value in `title`) where the sketch shows the short file name; Synthesis shows its conflict buckets as chips only, not repeated as big counts; the open Graph panel ends with the file's path, updated and size foot the sketch omits. The "Last auto-update ok" cell border uses the `complete` tone (the theme accent) per UI-SPEC; the sketch left an ok cell untoned.

**Typography (X5):** approved at 11-01, so the big counts (Graph, File roles, API surface, Dependencies, Synthesis) use `--fs-display-1`, the fifth size; the page renders exactly display-3, display-1, fs-7, fs-4 and fs-2, asserted by the CSS contract test (display-1 appears once).

## Deviations from Plan

**1. [Rule 2/3 - Missing data] The graph and synthesis lifts gained fields the panels need.** 11-18 listed this as an open gap. `liftGraphReport` (src/server/index-summary.ts) now also reads the Summary's "{n} thin omitted" count, the Extraction shares, the "Import Cycles" bullet count (counting an over-long cycle line without reading it) and the report title date; `GraphSummary` carries `thinCommunities`, `importCycles`, `extraction` and `reportDate`. `extractSynthesis` (src/planning-repo/handlers/index-intel-lift.ts) keeps the per-type counts as `classificationSplit`. Neither file was in `files_modified`; both changes are additive. Tests: test/server/index-summary.test.ts, test/index-intel-handler.test.ts. Commit ba27978.

**2. [Rule 1 - Bug] Old collapsed panel flashed on opening another tile** (found in the interaction check). Fixed in commit 994f58e.

**3. [Rule 3] Tiles remain buttons that call navigate, not `<Link>` elements.** The plan's behavior block says "a Link" while its truths and UI-SPEC section 10 say a button with aria-expanded and aria-controls; the button satisfies the accessibility contract, behaves the same (goes to the file's address) and the spec wins. Cmd-click to a new tab is not offered.

**4. Extra files.** test/presentation/indexes-context.test.ts is new (named in the plan); test/index-intel-handler.test.ts and test/server/index-summary.test.ts were updated for the lift changes. The 11-18 CSS block lost its two `border-radius: 0` lines (the shared reset already squares buttons; the contract test forbids the property) and its one `color-mix` hover (now `--state-hover`).

**5. [Environment]** `node_modules` was a symlink to the main checkout's (untracked, removed before return). The labelore service serves the main checkout, so the plan's `systemctl --user restart labelore` steps were skipped: after merge the main checkout needs `npm run build` and `systemctl --user restart labelore`. The interaction check used a throwaway Playwright script (deleted, not committed); the repo has no DOM test environment, so Esc and Close are covered by that run and by the static-markup contract, not by a committed test.

## Known Stubs

None. Every figure reads the bounded summary.

## Open gaps

- "Last good build" for a failed update comes from the report's title date, so a graph with no GRAPH_REPORT.md shows no such cell after a failed update (absence is silent).
- The synthesis panel's classification split shows only the types the file's "Doc counts by type" lines name; classification files in `intel/classifications/` are counted by the file's own line, never tiled or listed.

## Threat Flags

None beyond the plan's register. T-11-30 mitigated: every string is React text, no raw-HTML prop, raw-html-guard green, a planted `SECRET-VALUE` in an unknown intel file never reaches the markup.

## Self-Check: PASSED

- test/presentation/indexes-context.test.ts exists; commits 65f5f8c, ba27978 and 994f58e are ancestors of HEAD
- Acceptance: `grep -c "data-ghost"` in indexes-page-components.tsx is 1 (baseline 0), "Not sent to this page" 1, "055 A" in design-language.md 1 (baseline 0)
