---
phase: quick-260930-wfs
plan: 01
subsystem: per-type document views (PATTERNS)
tags: [patterns, pattern-map, sketch-013, view-registry, handler, composer]
requires:
  - quick-260929-3x3 (RESEARCH briefing seam: handler -> structured -> manifest hook -> artifact page)
provides:
  - PatternsHandler (kind patterns) adding structured.map
  - extractPatternMap and composePatternMap
  - PatternMapView / PatternIntroMeta behind manifest.patternMap
affects:
  - src/planning-repo/handlers, src/web/views, src/web/pages/artifact-page.tsx, globals.css, docs/design-language.md
tech-stack:
  added: []
  patterns: [tolerant fence-aware line scanner, pure composer, hand-written glob matcher (no RegExp from author text)]
key-files:
  created:
    - src/planning-repo/handlers/pattern-map.ts
    - src/planning-repo/handlers/patterns.ts
    - src/web/views/pattern-map.ts
    - src/web/views/pattern-map-components.tsx
    - test/pattern-map.test.ts
    - test/patterns-handler-guard.test.ts
    - test/web/pattern-map.test.ts
    - test/web/pattern-map-corpus.test.ts
    - test/web/patterns-view-contract.test.ts
    - test/e2e/patterns-map.spec.ts
    - .planning/quick/260930-wfs-build-sketch-013-b-by-location-panel-as-/capture-side-by-side.mjs
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json
    - test/e2e/measure.ts
decisions:
  - Nothing dropped silently: unmatched No Analog entries and unmatched assignments become rows in "Outside the file table"
  - refMatches ties a longer ref to a shorter row path by tail, not by a shared base name alone
  - First guidance = leading sub-heads plus the first real paragraph/list
status: complete
metrics:
  tasks: 3
  commits: 6
  plan_head_before: 836f39687ba9b2ad2b85c8723ecf23f3a3154d20
  plan_head_after: 20a73203c747ec3954f5d15816e7cf691e8f8442
actuals:
  tokens: 120000
  tasks: 3
  commits: 6
---

# Phase quick-260930-wfs Plan 01: Sketch 013 B (by location + panel) as the PATTERNS view

PATTERNS pages now open on the sketch-013 cover (facts as written, a match-quality meter, a quiet Searched line, the mapper's note) over one file map grouped by area with a sticky side panel and a House rules strip. Code excerpts, line citations and data-flow labels stay in Source mode, one click away.

## What was built

- **Extractor** `src/planning-repo/handlers/pattern-map.ts`: fence-aware and line-bounded; reuses `splitWithPreamble`/`splitFenceAware` and `parseBlocks`. Has its own linear table row splitter, so a row with no trailing pipe (labelore v1.1/05) keeps its Match Quality cell. It does not use or change `parseMarkdownTable`.
- **Handler** `patterns.ts`: registered after ResearchHandler. The extractor sits in a try/catch; a throw only omits `map`.
- **Composer** `src/web/views/pattern-map.ts`: one row per file (quality, tone, analog shorthand, assignment, no-analog reason, rules, area), rules with hits, unplaced rows, back matter, source-only targets. Returns `null` with no classification rows, so the dense fixture keeps today's view.
- **View** `pattern-map-components.tsx` plus the `quick-260930-wfs` CSS block: cover, meter, Searched toggle, mapper's note, rule strip (pick explains and dims, Escape clears), grouped rows, sticky panel (stacked under 62rem), collapsed back matter, "In the source only" strip.
- **Docs and gates**: `## Tones` records the PATTERNS usages; `patterns-view-contract.test.ts` guards raw-HTML prop, non-content tones, RegExp from author text and the CSS block.

## Tasks and commits

| Task | Commit | What |
|------|--------|------|
| 1 (tracer) | 995f79e | extractor, handler, composer, view and CSS wired through the seam; unit, corpus and handler-guard tests; dense golden |
| 2 | ce9b592 | tones doc, view contract, `view-patterns-text` (kept out of the research namespace) |
| 3 | d050f4f | narrow e2e spec and CORNER_SELECTORS |
| fix | 8e340f5 | back-matter numbered lists keep one numbering; sub-bullets fold into their item |
| fix | 20ad176 | blockquoted warnings keep prose and labelled lists in panel guidance |
| fix | 20a7320 | panel guidance opens on the sub-head plus its first paragraph |

Note on task boundaries: the side panel, rule strip, back matter, source-only strip and most CSS were written with the tracer in one components file and one CSS block, so they landed in commit 995f79e. Task 2's commit carries the docs and contract.

## Verification

- `npm test`: 87 files, 1639 tests pass. `npm run typecheck` is clean. eslint is clean on every file this plan touched.
- `npx playwright test test/e2e/patterns-map.spec.ts -g "pattern map"`: 2 passed, run twice (once after the tracer, once after the guidance fixes); no other spec was run.
- dist/ rebuilt, `labelore.service` restarted (target /home/cinedise/studio-portal, confirmed with `systemctl --user cat labelore`) and active. http://100.97.55.101:4173 serves the new `index-*.js` bundle, which contains the pattern map; the CSS bundle holds `view-patterns`. The scratch server on 5193 was stopped by PID; the 4174 sketch server was not touched.
- Colour grep of the wfs CSS block and both view sources for `oklch(`, hex and `destructive`/`warning`: no hits (one comment in the composer names the tones it never uses).

## Per corpus doc (WFS-09, pinned counts match the awk-confirmed table)

| Doc | Rows | Areas | Unplaced (no-analog/assignment) | Rules | File rows with no guidance |
|---|---|---|---|---|---|
| sp v1.0/02 storage health | 26 (7/3/5/11) | 5 (doc groups) | 0/0 | 2 with hits, 4 broad | 10 |
| sp v1.0/03 file browsing | 16 (10/6/0/0) | 4 (3 + unplaced) | 2/0 | 2 with hits, 5 broad | 6 |
| sp v1.0/04 transfers | 26 (12/9/3/2) | 3 | 0/1 | 8 with hits, 1 broad | 13 |
| sp phases/01 identity | 16 (7/4/1/4) | 3 | 0/0 | 6 with hits, 1 broad | 6 |
| sp phases/02 roles | 22 (16/4/0/2) | 3 | 0/0 | 3 with hits, 6 broad | 7 |
| sp phases/03 account admin | 24 (19/5/0/0) | 3 | 0/0 | 1 with hits, 6 broad | 10 |
| sp phases/04 bulk archive | 30 (25/5/0/0) | 3 | 0/0 | 0 with hits, 4 broad | 6 |
| lb v1.0/02 situational awareness | 35 (14/10/0/11) | 6 | 0/0 | 0 with hits, 7 broad | 0 |
| lb v1.0/03 search | 18 (12/6/0/0) | 6 | 0/0 | 7 with hits, 0 broad | 5 |
| lb v1.0/04 portability | 16 (11/4/0/1) | 4 | 0/0 | 4 with hits, 2 broad | 7 |
| lb v1.1/05 per-type views | 17 (8/8/0/1) | 6 | 0/0 | 1 with hits, 6 broad | 5 |

The dense fixture's `01-PATTERNS.md` has no File Classification: it composes to null and keeps the existing view. `dense.json` changed only by the new `structured.map` on that file, in its five snapshot copies.

## Side-by-side evidence (WFS-10)

All in `/home/cinedise/labelore/test/e2e/screenshots/wfs/` (gitignored; sketch 013 B left, build right, 1440px):

- Light pairs, sketch docs: `sp-v1-02-light.png`, `sp-04-light.png`, `sp-01-light.png`, `lb-05-light.png`
- Dark pairs: `sp-v1-02-dark.png`, `sp-04-dark.png`, `lb-05-dark.png`
- `sp-v1-02-selected-light.png` (collector.rs clicked in both), `sp-v1-02-rule-light.png` ("Reject/fail identically" picked in both), `sp-v1-02-phone-light.png` (390px)
- Build-only, light: `lb-v1-02-light.png`, `lb-v1-03-light.png`, `lb-v1-04-light.png`, `sp-v1-03-light.png`, `sp-v1-04-light.png`, `sp-02-light.png`, `sp-03-light.png`
- Metrics (rows, areas, unplaced rows, horizontal overflow, per doc): `report.json`. No doc overflows horizontally. Script: `.planning/quick/260930-wfs-build-sketch-013-b-by-location-panel-as-/capture-side-by-side.mjs`.

I read the pairs for sp v1.0/02 (light, selected, rule, phone), sp phases/04 (light), lb v1.1/05 (dark) and the sp v1.0/03 build capture (the unplaced area). I did not open every remaining PNG (sp-01, the other dark pairs, the other five build-only captures); their metrics in `report.json` are clean.

### Divergences the side-by-side found, and fixes (old -> new)

1. Numbered "Cross-Cutting Notes" back matter rendered as five separate lists, each restarting at 1, with sub-bullets as numbered items. It now folds sub-bullets into their item and merges adjacent numbered lists (count 7 -> 5, matching the sketch). Commit 8e340f5.
2. The collector.rs divergence warning rendered as one paragraph of raw `> > ###` markers. Quote markers are now stripped, the headline becomes a bold sub-head, and its lists stay lists. A lone bold label is dropped only when it captioned a removed excerpt, so "Copy from this analog:" and "Do NOT copy:" survive. Commit 20ad176.
3. After fix 2 the panel showed only the warning headline above "More guidance". The panel now opens on any leading sub-heads plus the first real paragraph or list. Commit 20a7320.

## Judgement calls (planner_notes as built) and deviations

- **Nothing dropped silently**: as planned. Unplaced rows appear only on sp v1.0/03 (2 no-analog: react-virtual, Cloud-rclone cat streaming) and sp v1.0/04 (1 assignment: `backend/src/db/mod.rs`, an analog and not a new file). The No Analog Found intro paragraph goes to a collapsed "No Analog Found" back-matter entry.
- **Brace-expanded assignment headings**: done (the sketch only expanded rule refs).
- **Glob refs**: a hand-written iterative wildcard matcher. No RegExp is built from author text; the contract test asserts it.
- **Rule-matching deviation from the plan text**: the plan and sketch let a ref with a `/` match any path whose basename equals the ref's last segment. That made `backend/src/health/mod.rs` match `backend/src/tiers/mod.rs` (several `mod.rs` files) and attach the wrong guidance. `refMatches` now matches a longer ref to a shorter row path by tail (`ref.endsWith('/' + path)`). A bare basename ref (`mod.rs`) still matches by basename, as planned. Covered by a unit test.
- **Breakpoints**: 62rem and 42rem media queries in place of the sketch's 900px and 640px container queries.
- **Meter role segment and reason box** use `--muted-foreground` and `--missing-border`/`--missing-fill`/`--card-veil` rather than the sketch's inline colour-mix recipes.
- **Ref-note line** (project, file, lines) omitted; ArtifactHeader already carries the path with copy.
- **Patterns manifest lead** stays verbatim and is hidden behind the cover in View mode (still shown in Source mode).
- **Area fallback**: a file directly under `src/` groups as `src` (the sketch would have made the file name its own area); files with no directory group as `Other` (lb v1.0/02 has 8).
- **Source-only entries**: "Line citations" appears only when the doc has assignments, "Metadata" only when it has a Metadata section; "N code excerpts" and "Data-flow labels" follow the plan. Both anchor docs show exactly the four buttons the plan expects.
- **Guidance lead**: the panel opens on sub-heads plus the first real block, slightly less than the sketch's first two paragraphs.

### Winner deviations left in place

- The "01" section number beside "File map" is omitted (the plan names only "File map").
- Rule chips and source-only buttons are `.status-chip`, so they measure a little taller than the sketch's slim chips. The e2e F-05 invariant (one chip signature on the page) requires this.
- The role meter segment is a slightly darker grey than the sketch's.
- The page title is the app's own h1 type, not the sketch's display face.
- The sketch shows two guidance paragraphs by default; the build shows the lead block only, with "More guidance".

## e2e counts

All counts match the plan: 17 rows, meter 8/8/0/1, four source-only buttons on lb v1.1/05; five doc groups, meter 7/3/5/11, collector.rs panel on sp v1.0/02. No difference from the plan.

## Follow-up candidates

- The patterns manifest lead ("Decisions, lessons and surprises…") is UI-SPEC copy that does not describe PATTERNS; it still shows in Source mode.
- Docs with many rows and no guidance after matching: sp v1.0/04 (13 of 26), sp v1.0/02 (10 of 26), sp phases/03 (10 of 24). Assignments written per concern rather than per file leave rows without a panel paragraph.
- Only the first matching assignment shows per row; a second assignment that matches the same row is not shown on it.

## Deferred / out of scope

- `npm run lint` reports about 58 errors, all in `.playwright-mcp/` (gitignored scratch scripts that predate this plan). Every file this plan touched lints clean.

## Known Stubs

None.

## Threat Flags

None. The threat model's mitigations are in: bounded line-scanned extractor with a 1 MB / 200k-character-line test under 250 ms, no raw-HTML prop, no RegExp from author text, extractor try/catch. No new endpoints.

## Self-Check: PASSED

- Files exist: the four source files, the five tests plus the e2e spec, the capture script, the 17 PNGs listed above (10 side-by-side pairs, 7 build-only) and `report.json`.
- Commits exist: 995f79e, ce9b592, d050f4f, 8e340f5, 20ad176, 20a7320 (6 commits, measured from 836f396 to 20a7320).
