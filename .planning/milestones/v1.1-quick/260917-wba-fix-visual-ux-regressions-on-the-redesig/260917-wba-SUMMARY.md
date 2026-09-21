---
phase: quick-260917-wba
plan: 01
subsystem: ui
tags: [react, traceability, coverage-projection, css-tokens, accessibility]

requires:
  - phase: quick-260917-ns4
    provides: the redesigned /traceability page (summary strip, per-category bars, hierarchical row list, deferred-tier disclosure) this plan patches
provides:
  - "A traced-fill colour recipe (--traced-fill) so .trace-bar-covered reads as a muted-down measurement tone, never the raw accent colour"
  - "A permanently framed .trace-bar track (var(--muted) fill + padding gutter) so a fully-traced scope still shows an inset fill, never a full-bleed block"
  - "A width-bound, readout-paired per-category bar (covered/total, read from group.coverage)"
  - "Tracing-language hero label plus a non-completion caption, and an aria-label naming a covering phase"
  - "Filter input restyled to the site's own control pattern (var(--background)/var(--border)) with height parity against the adjacent buttons"
  - "A track-and-thumb switch for the deferred-tier toggle, replacing the plain filter-button look"
  - "Four-sided .history-tree padding (top padding restored) shared with roadmap-page.tsx"
  - "A deferred variant of TraceabilityRowList: no Requirement-status block, a quiet-toned 'Not yet scheduled' chip instead of the destructive 'Uncovered' one"
  - "Hairline-separated .trace-row cards (no four-sided border) with inverted type hierarchy: requirement text (fs-5) over a demoted, micro-labelled ID"
affects: [traceability, ui-redesign]

actuals:
  tokens: 5879
  tasks: 3
  commits: 3
  plan_head_before: 8990f28

tech-stack:
  added: []
  patterns:
    - "Named colour recipes for repeated tones live once in the :root token block (--traced-fill joins --card-veil/--destructive-tint/--primary-tint), never re-spelled at a usage site"
    - "Component variant prop (TraceabilityRowList's `variant?: 'default' | 'deferred'`) to diverge presentation for a data shape that structurally can never carry certain fields, instead of branching inside a single fixed markup tree"
    - "Row separation via `.selector + .selector { border-top }` adjacent-sibling hairline instead of a per-item four-sided border, with the list's own gap collapsed to 0"

key-files:
  created: []
  modified:
    - src/web/pages/traceability-page.tsx
    - src/web/styles/globals.css
    - test/web/traceability-redesign-contract.test.ts

key-decisions:
  - "--traced-fill: color-mix(in oklch, var(--primary) 40%, var(--muted)) — one recipe, adapts per theme automatically, no .dark override needed"
  - "Category bar's max-width lives on a scoped `.trace-category-bar .trace-bar` rule, not on .trace-bar itself, so the aggregate hero bar keeps its full flex width while only the per-category bars are width-bound"
  - "Per-category numeric readout formatted as `{covered}/{total} traced`, read straight off group.coverage — never recounted from the filtered row subset"
  - "Deferred variant omits the whole Requirement-status block rather than rendering a neutralized version — every deferred row's requirementStatus is null by construction, so the block would only ever show noise"
  - "Toggle's track/thumb sizing (--space-7 track, --space-3 thumb, --space-0-5 inset) makes the pressed-state translateX(--space-3) land exactly at the track's end with no raw pixel math"

patterns-established:
  - "Deferred/history-shaped row presentation branches on an explicit variant prop rather than inferring presentation from data shape inline"

requirements-completed: [WBA-01, WBA-02, WBA-03, WBA-04, WBA-05, WBA-06, WBA-07]

coverage:
  - id: D1
    description: "Coverage bars carry a permanent framed track (var(--muted) fill, padding gutter) with the covered segment resolving to a new muted-down --traced-fill recipe rather than the raw accent token"
    requirement: "WBA-01"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#quick-260917-wba, Task 1 — .trace-bar always paints a track background and a padding gutter, .trace-bar-covered references the new traced-fill recipe token, declares --traced-fill once in the :root token block"
        status: pass
      - kind: unit
        ref: "test/token-guard.test.ts (colour family — zero violations after the change)"
        status: pass
    human_judgment: true
    rationale: "Whether a fully-traced bar now visibly reads as an inset fill inside a frame — rather than a full-bleed block indistinguishable from a rule — is a perceptual claim; the tests prove the CSS shape and token usage, not the rendered look."
  - id: D2
    description: "Hero number relabelled with tracing language plus a non-completion caption; aria-label names a covering phase; coverageOf()/TraceabilityCoverage left byte-identical"
    requirement: "WBA-02"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#Task 1 — the hero label reads as tracing language with a non-completion caption beneath it, the aggregate bar's aria-label sentence describes a covering phase"
        status: pass
      - kind: other
        ref: "git diff --stat src/presentation/traceability.ts (empty)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Filter input matches the site's control family (var(--background)/var(--border), no frosted var(--input) usage site remaining) and shares a min-height with the adjacent filter buttons"
    requirement: "WBA-03"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#Task 2 — .trace-filter-input references neither the frosted input token nor a raw colour literal and declares a min-height; .trace-filter-button declares the same min-height token"
        status: pass
      - kind: other
        ref: "grep -n 'var(--input)' src/web/styles/globals.css (only the @theme inline mapping line remains)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Deferred-tier control renders a track-and-thumb switch, visibly distinct from the three filter buttons, with data-active/aria-pressed kept adjacent and unchanged"
    requirement: "WBA-04"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#Task 2 — the deferred-tier toggle renders track and thumb elements, and the pressed-state rule declares a transform"
        status: pass
      - kind: unit
        ref: "test/web/visual-contract.test.ts#the history toggle reuses the existing filter-button class and carries aria-pressed, reflecting includeHistory (unedited, still green)"
        status: pass
    human_judgment: true
    rationale: "The test proves the track/thumb markup exists and the pressed-state rule declares a transform, but whether the thumb visibly moves between off and on in a real browser is a perceptual claim reserved for human confirmation."
  - id: D5
    description: "The first row inside an open deferred tier clears the disclosure summary by the same --space-5 token used on the tree's other three sides"
    requirement: "WBA-05"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#Task 3 — .history-tree pads all four sides from one token, and the history selector-line count is unchanged"
        status: pass
    human_judgment: false
  - id: D6
    description: "A deferred-tier row renders no Requirement-status block and no destructive chip; an unscheduled row shows one quiet-toned chip instead"
    requirement: "WBA-06"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#Task 3 — TraceabilityRowList accepts a variant prop...; the deferred branch renders a quiet-toned 'not yet scheduled' chip and never the destructive tone"
        status: pass
    human_judgment: false
  - id: D7
    description: "Requirement rows read with real hierarchy (requirement text outranking its ID) and no four-sided border per row, while the two-column grid and narrow-viewport override stay intact"
    requirement: "WBA-07"
    verification:
      - kind: unit
        ref: "test/web/traceability-redesign-contract.test.ts#Task 3 — .trace-row declares no border shorthand while an adjacent-sibling rule declares a top hairline; row-text steps up to fs-5, row-id demotes to the micro-label treatment"
        status: pass
    human_judgment: true
    rationale: "Token-level size/colour swaps are mechanically proven, but whether the row now genuinely 'reads with hierarchy' at a glance is a perceptual claim reserved for human confirmation."
  - id: D8
    description: "The four pre-existing gate suites (token-guard, visual-contract, empty-state-contract, loading-state-contract) and npm run typecheck remain unmodified and green; no new dependency"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 802/802 passing) and npm run typecheck"
        status: pass
      - kind: other
        ref: "git diff --stat on the four gate files and package.json (both empty)"
        status: pass
    human_judgment: false

duration: ~7min
completed: 2026-09-18
status: complete
---

# Quick Task 260917-wba: Fix visual/UX regressions on the redesigned traceability page Summary

**Seven audit findings on the redesigned traceability page fixed presentationally: framed
measurement-style coverage bars with a new muted-primary recipe, an honest tracing headline, a
site-pattern filter input with height parity, a real track-and-thumb toggle, restored top padding
on deferred tiers, quiet-toned unscheduled chips replacing alarming destructive ones, and lighter
hairline-separated row cards with inverted type hierarchy.**

## Performance

- **Duration:** ~7 min (task commits span 18:44–18:48 local time)
- **Tasks:** 3/3 completed
- **Files modified:** 3 (traceability-page.tsx, globals.css, traceability-redesign-contract.test.ts)

## Accomplishments

- New `--traced-fill` token (`color-mix(in oklch, var(--primary) 40%, var(--muted))`) declared once
  in the `:root` recipe block; `.trace-bar` now always paints a `var(--muted)` track behind a padding
  gutter, so a fully-traced scope still shows a framed, inset fill instead of a full-bleed block
- Per-category bar is width-bound (`.trace-category-bar .trace-bar { max-width: 24rem }`) and paired
  with a `{covered}/{total} traced` numeric readout sourced straight from `group.coverage`
- Hero label reads "Traced" with a caption denying the completion reading; the aggregate bar's
  aria-label now names a covering phase instead of raw "covered" language
- `.trace-filter-input` moved onto the site's own control surface (`var(--background)`/`var(--border)`)
  — the frosted `var(--input)` token has no remaining usage site — and both the input and
  `.trace-filter-button` now share a `var(--space-8)` min-height
- The deferred-tier toggle renders an `aria-hidden` track-and-thumb switch (`.trace-toggle-track` /
  `.trace-toggle-thumb`), tinting and translating under `[aria-pressed='true']`, while keeping its
  `data-active`/`aria-pressed` pair exactly as pinned
- `.history-tree` pads all four sides from `--space-5` (was missing its top edge) — a fix shared with
  `roadmap-page.tsx`'s archived-milestone disclosures, with zero new `.history-*` selector added
- `TraceabilityRowList` gained an optional `variant?: 'default' | 'deferred'` prop; the deferred
  branch drops the Requirement-status block entirely and swaps the destructive "Uncovered" chip for
  a quiet-toned "Not yet scheduled" one when a deferred row has no covering phase
- `.trace-row` dropped its four-sided border for a `.trace-row + .trace-row` hairline (with
  `.trace-rows`' gap collapsed to 0), gained a hover background, and inverted its typographic
  hierarchy: `.trace-row-text` steps up to `fs-5` while `.trace-row-id` demotes to the shared
  micro-label treatment

## Task Commits

Each task was committed atomically:

1. **Task 1: Coverage bars read as data, and the headline stops claiming completion** - `162768f` (feat)
2. **Task 2: Filter row — site-pattern input, height parity, and a real toggle switch** - `107aa66` (feat)
3. **Task 3: Deferred-tier breathing room and chips, and lighter row cards** - `33ca751` (feat)

_Plan metadata (SUMMARY.md, STATE.md) is committed separately by the orchestrator, not by this executor._

## Files Created/Modified

- `src/web/pages/traceability-page.tsx` - Aria-label copy, hero caption, per-category readout,
  toggle track/thumb markup, `TraceabilityRowList` variant prop and deferred branch
- `src/web/styles/globals.css` - `--traced-fill` token; `.trace-bar`/`.trace-bar-covered`/
  `.trace-bar-uncovered`/`.trace-category-bar`/`.trace-coverage-percent-note` rework;
  `.trace-filter-input`/`.trace-filter-button` height parity and input restyle; new
  `.trace-toggle`/`.trace-toggle-track`/`.trace-toggle-thumb` rules; `.history-tree` four-sided
  padding; `.trace-rows`/`.trace-row`/`.trace-row-id`/`.trace-row-text`/`.trace-row-secondary` rework
- `test/web/traceability-redesign-contract.test.ts` - Three new describe blocks (one per task) pinning
  all seven fixes, reusing the file's existing `ruleBlocks()`/`source()` idiom

## Decisions Made

- `--traced-fill` blends `var(--primary)` toward `var(--muted)` at 40% strength — a single
  theme-adapting recipe, no `.dark` override needed, matching the existing recipe-block convention
- Width-bounded the category bar via a scoped `.trace-category-bar .trace-bar` selector rather than
  giving `.trace-bar` itself a `max-width`, so the aggregate hero bar keeps its full flex-1 width
- Deferred variant omits the entire Requirement-status block (not just its content) — every deferred
  row's `requirementStatus` is `null` by construction, so rendering it would only ever show the
  guaranteed-true em-dash chip the audit flagged as noise
- Toggle geometry (`--space-7` track, `--space-3` thumb, `--space-0-5` inset on each side) makes the
  pressed-state `translateX(var(--space-3))` land exactly at the track's end with no raw pixel value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

While writing the Task 3 contract test for `.history-tree`'s four-sided padding, `ruleBlocks()`
initially picked up the wrong block: an earlier, unrelated selector-group rule
(`.roadmap-phase-body, ..., .history-tree { min-width: 0; max-width: 100%; }`) also ends its
selector list in the exact line `.history-tree {`, which `ruleBlocks()` matches by literal line
text. Fixed by indexing the second match (`ruleBlocks(css, '.history-tree {')[1]`) with an inline
comment explaining the collision, rather than changing the shared helper or the source CSS. Full
suite re-run green (802/802) after the fix; no source code was affected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All seven audit findings are closed and mechanically verified: `npm test` (802/802, including the
  four pre-existing gate suites unmodified) and `npm run typecheck` both pass; `git diff --stat` on
  `src/presentation/traceability.ts` and `package.json` are both empty.
- **Outstanding:** This plan carried no `type="checkpoint:*"` task, so the perceptual claims flagged
  `human_judgment: true` above (D1, D4, D7 — whether the bar now visibly reads as framed/inset,
  whether the toggle thumb visibly moves, and whether the row list now genuinely reads with
  hierarchy) have not been confirmed against a live browser in both light and dark themes. A human
  should load `/traceability` against this repo's own `.planning` before considering the redesign's
  regressions fully signed off.

---
*Phase: quick-260917-wba*
*Completed: 2026-09-18*

## Self-Check: PASSED

All claimed files found on disk (`src/web/pages/traceability-page.tsx`, `src/web/styles/globals.css`,
`test/web/traceability-redesign-contract.test.ts`); all three claimed task commits (`162768f`,
`107aa66`, `33ca751`) found in `git log --oneline --all`.
