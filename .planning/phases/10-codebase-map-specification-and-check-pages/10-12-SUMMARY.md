---
phase: 10-codebase-map-specification-and-check-pages
plan: 12
subsystem: codebase-page
tags: [architecture, structure, concerns, risk-piles, sketch-044-E, sketch-043-reuse, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-05 lifts, 10-08 Codebase page frame, 10-09 decisions (044 E, 043 reuse), 10-10 head and shared concern order
provides:
  - liftArchitecture and liftStructure (System Overview and Directory Layout fences, component and layer counts, Anti-Patterns entries, directory count)
  - concern items per section (label plus the concern's own lines) counted by the same pass as the counts
  - ArchitecturePanel (shipped lane-diagram figure + shipped swap rows), StructurePanel (shipped clean tree), ConcernsPanel (sketch 044 E)
  - linkMapMentions: a mention of a mapped map file links to its panel (address from the panel list only)
affects: [10-13 onward Codebase panels, 10-23 browser spec]

actuals:
  tokens: 120000
  tasks: 3
  commits: 5
plan_head_before: f38850516bb0915ae9b522d68d4797181de5c581
plan_head_after: d265dc8e4937898a57d0d9474832e226af298534
commits: 5

key-files:
  created: []
  modified:
    - src/planning-repo/handlers/codebase-lift.ts
    - src/presentation/codebase-map.ts
    - src/web/views/codebase-page.ts
    - src/web/views/codebase-components.tsx
    - src/web/pages/research-atoms.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/codebase-lift.test.ts
    - test/codebase-handler.test.ts
    - test/web/codebase-page.test.ts

key-decisions:
  - "043 is reuse, 044 is E: the panels are built from the user's decisions in 10-09-SUMMARY, not the plan's A/B/C wording"
  - "A lifted section is drawn only when the panel can hold all of it (a System Overview or Directory Layout with exactly one plain fence and nothing else; Anti-Patterns all entries with a 'do this instead'); otherwise it stays a plain section, so nothing is drawn twice or dropped"
  - "Concern items skip fenced code (as the count does); an item over its caps keeps the true count and the panel says how many it shows"
  - "Security zero is `complete` (filled) in the Concerns panel as sketch 044 and UI-SPEC draw it; the head's own zero rows (10-10) stay `quiet`"

requirements-completed: [VIEW-13]

duration: about 3h
completed: 2026-11-05
---

# Phase 10 Plan 12: Architecture, Structure and Concerns panels Summary

**Architecture shows the System Overview in the shipped lane-diagram figure and the Anti-Patterns as the shipped swap rows, Structure shows the Directory Layout in the shipped clean tree, and Concerns is sketch 044 E (nine risk piles, Security first, one segment per concern, Priority opacity, an accent ring on the most dangerous, a dock for the selected concern, sections as closed bars with Read more), all inside the 042 frame, checked beside the sketches at 1280 and 390 in both themes.**

## What was built

- **Lift (`codebase-lift.ts`).** `liftArchitecture` gives the System Overview's one fence (info string and text, over 20,000 characters or 2,000 lines it stays plain), the Component Responsibilities row count (the key number; layers when there is no table, with `keyUnit: 'layer'`), and the Anti-Patterns as `{ name, whatHappens, whyWrong, doInstead, more }` (all entries or none; an unknown labelled part goes to `more`, so it is still shown). `liftStructure` gives the Directory Layout fence and its directory count (the key number). Concerns: each section now carries `items: { label, lines }[]` (at most 500 per section, 60 lines of 2,000 characters per concern) from the same pass that counts, so items equal the count below the cap. A fence with a language tag other than the plain ones (`mermaid`, `ts`) is never lifted as a figure.
- **Presentation (`codebase-map.ts`).** `concernSections` returns the same Security-first order as `concernEntries` plus the items; `concernEntries` is now built on it, so the panel and the head cannot drift.
- **Composer (`codebase-page.ts`).** `ComposedArchitecture`, `ComposedStructure`, `ComposedConcerns` (sections, items with fields, gist and Priority, `top`, `omitted`, `fallbackHtml`, `intro`). The drawn sections are paired with their rendered groups by position (heading text when the counts differ) and left out of the plain list. `linkMapMentions` is a character scan for the seven exact file names (alone or after `.planning/codebase/`), linking only names the panel list holds.
- **Components.** `FenceFigure` (the shared detector's decision through `FigureFor`, else the author's text in the same frame), `ArchitecturePanel`, `StructurePanel` (title "Directory structure"), `ConcernsPanel` with `ConcernRow` and `ConcernBar`. `SwapRows` gained an optional `renderText` so a swap's text can link a mention.
- **CSS and docs.** Everything inside the `phase-10-codebase` block except one custom property read by the shipped swap CSS (`--research-swap-why-size`); design-language.md has the three tone rows and the panel bullet.

## Deviations from Plan (the user's decisions supersede the plan)

1. **[User decision 043] No new 043 design; reuse the shipped figures.** The plan's "winner A/B/C" precondition and acceptance greps predate round 2. Architecture uses `FigureFor`/`LaneDiagramFigure` (with its "Shown as drawn" fallback), `SwapRows` for Anti-Patterns (mapped into `SwapItem`; the type was imported, not moved), Structure uses `CleanTreeFigure`.
2. **[User decision 043] Component table, Pattern Overview, Entry Points, Directory Purposes and "Where to Add New Code" stay plain sections.** The plan's lift of component rows, pattern overview, entry points and the `whereToAdd` lookup was not built; `components` is a count only. As a consequence the plan's acceptance grep `git grep -c "Where to add new code" -- src/web/views` has no hit (the heading is document text), and the Task 2 behavior "three where-to-add groups with primary-code and tests entries" is replaced by a test that the section stays keyed and plain.
3. **[User decision 044] Winner E, not A/B/C.** No count strip, no "Most dangerous" pull line: the ring and the foot key are E's. The dock's "· most dangerous" tag is the sketch's own text. Zero sections show a dashed 0 box in the pile; the plan's "'{n} concerns' over a count per section" is the bar's `{n} CONCERNS` plus the count under each column.
4. **[Plan interpretation] Cross-links work where Labelore renders the text.** Plain sections are server-rendered HTML; a `see STRUCTURE.md` mention there stays text (the existing reference linkifier already links `.planning/...` paths). Links appear in the Anti-Patterns swap text. Not built: rewriting rendered HTML (a new raw-HTML site) or changing the global linkifier.
5. **[Rule 1] Existing tests updated for the new shapes:** `keeps the body out of the projection` (concern items now hold their own lines; it asserts the footer stays out), three `toEqual` cases that gained `items`, `lifts nothing for a panel with no designed form yet` (now Conventions), and the page test's section splitter is fence-aware (a diagram's `## label` line made a bogus group).
6. **[Rule 3] Shipped CSS touched once:** `.research-swap-why p` reads `var(--research-swap-why-size, var(--fs-3))` so the Codebase page can take it to Body (four sizes); the Research page is unchanged. The codebase CSS block may not name a `.research-` class (a contract test), so the override is the custom property set on `.view-codebase-swaps`.
7. **Not run, per dispatch:** `systemctl --user restart labelore` (the plan's Task 3 verify step; the orchestrator restarts after merge), the Playwright suite, and the two "other repositories" longest documents (no such repositories are in this worktree; labelore's own map is the hardest real case, the 40-in-Tech-Debt state stands in for the long Concerns section).

## Open item from 10-09: lanes on a codebase diagram

Checked on labelore's real ARCHITECTURE (7 boxes) and Tidemark's (3). Lanes by kind: Browser SPA lands in Client, HTTP server, Per-project read API and ProjectRuntime in Service, Filesystem adapter in External: sensible. **ProjectRegistry and "Parsing core" land in Data**, because the keyword lists were written for RESEARCH diagrams (a "registry" and a "parsing core" are not stores). On Tidemark the three route boxes in one drawn row merge into one node ("Berth routes | Office routes | Tide windo..."). Labels keep their backticks (`` `src/server/pro… ` ``), which is the shipped lifter's output. I left the lane diagram as the default: it was drawn as the user asked, it reads correctly for most boxes, and the author's layout is one chip away ("Shown as drawn"). If you want "Shown as drawn" as the default for codebase diagrams, that is a small prop on `LaneDiagramFigure`; I did not change the shared component unasked.

## Verification

- Full gate: `gate: total=5705 passed=5705 failed=0 skipped=0 todo=0` (base 5657). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- RED before GREEN: `5aaf0b9` (Structure, 11 failing) before `34183de`; `ce96d43` (Concerns, 18 failing) before `d265dc8`. Task 1 is the tracer (committed, then verified end to end with tests and screenshots before expanding).
- Plan verify screenshots: `shoot-pages` on labelore and Tidemark, three addresses each, 24 PNGs, no FAIL line (no page error, one h1, no sideways scroll at 390), under `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-12/verify/`.
- Measured in the rendered page (labelore, Tidemark, the 40-in-Tech-Debt and no-Security copies; 1280 and 390; light and dark): exactly four font sizes (11.2, 13.12, 20.8 and the h1), no sideways scroll, no page error. Geometry equals the sketch's contract: frame 838 px wide at 1280 (358 at 390), piles 804 x 161 for labelore's 30 concerns (324 x 142 at 390), segments 13 px, the 40-in-Tech-Debt tower 671 px.

## Side by side (sketch left, build right)

Concerns, sketch 044 tab E against `/codebase/concerns`: `.../build-10-12/concerns/{case}-{width}-{theme}-side-by-side.png` (cases `labelore`, `tidemark`, `nosec`, `debt`; labelore light also `-interactive-` with a mark selected, Security opened and one concern read in full). Architecture and Structure against the Research page's shipped figures: `.../build-10-12/reuse/side-1280-light.png` and `side-390-light.png`. Differences, fixed or left:

1. **Fixed: body text rendered at 16px** in the new markup (the page's four sizes), and the shipped figures' own 10.24px and 12.16px sizes. Body is set on the panel; figure text is taken to Label inside the frames; the swap arrow to Body.
2. **Fixed: the leading text** ("Analysis Date", scope paragraph) sat above the picture and pushed it down the first screen; the sketch's E has none. It now follows the bars, so the picture is the first screen and nothing is dropped.
3. **Left: page chrome** (header, rail, the "Mapped, not started" head above the panel on a map-only project): the 10-08 and 10-10 frame, not this plan's.
4. **Left: segment gap 2px** (token `--space-0-5`) against the sketch's 3px: the token guard forbids a raw pixel gap. Pile height is the sketch's to within a pixel (161 against 163 in the README).
5. **Left: pic bar ground** is `--code-veil` (muted 70%) where the sketch uses its own 55% veil: the guard forbids a second colour mix.
6. **Left: the sketch's dock note "This concern names no file..."** is the D variant's and is not built for E.
7. **Left: Tidemark** has 14 marks and two dashed zero boxes (Dependencies at Risk, Test Coverage Gaps) as the sketch's Tidemark state; its section labels follow the document's headings, short labels as in the sketch.
8. **Left: Architecture and Structure against Research:** the figure frame, Shown as drawn chip, swap rows and the clean tree are the same components; the Codebase page frames them under its own rail and four-size scale, so labels are smaller than on the Research page. The chosen Research page for the comparison is labelore's own `.planning/research/ARCHITECTURE.md` (its content differs, the components do not).
9. **Left: the plain list keeps a leading "Analysis Date" group** between the swaps and the first plain section on Architecture and Structure (10-08 behaviour for the text before the first heading).

## Known Stubs

None.

## Threat Flags

None new. T-10-21 mitigated: figures 20,000 characters and 2,000 lines (over the cap the section stays plain, so nothing is cut), 100 Anti-Patterns entries of 2,000 characters a part, 500 concerns a section of 60 lines of 2,000 characters; growth tests for the architecture shapes (200k fence, table rows, many entries) and a composer growth test. T-10-22 mitigated: all text through `ResearchInline`; no raw-HTML prop (contract tests pass); `linkMapMentions` takes addresses only from the composed panel list, matching seven fixed names by character scan.

## Self-Check: PASSED

- Commits 7e2610c, 5aaf0b9, 34183de, ce96d43, d265dc8 are ancestors of HEAD.
- `git grep -c liftArchitecture -- src/planning-repo/handlers/codebase-lift.ts` and `FigureFor` / `Read more` in `codebase-components.tsx`: found.
- STATE.md and ROADMAP.md untouched.
