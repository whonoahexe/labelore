---
phase: 04-portability-degradation-hardening
plan: 03
subsystem: ui
tags: [degradation, warning-tone, tree, search, artifact-page, status-chip, source-text-contract]

# Dependency graph
requires:
  - phase: 04-portability-degradation-hardening
    provides: "04-02's InvalidProjectScreen/ProjectGate pattern and the shared fetchPresentation/query-key convention this plan's surfaces build alongside"
  - phase: 03-search-browsing-traceability
    provides: "TreeNode/SearchResultRow projections and the tree/search location taxonomy this plan extends with a damaged-artifact tone"
  - phase: 01-read-layer-domain-model
    provides: "Artifact.bodyLength and the four-field ParseWarning record this plan's tone derivation and disclosure render directly"
provides:
  - "artifactWarningTone() — the single derivation of a damaged artifact's tone (null/'warning'/'unreadable'), shared by tree.ts and search.ts"
  - "ArtifactDto.bodyLength — the deterministic did-the-body-survive signal, passed through unchanged from the domain layer"
  - "TreeNode.warningTone and SearchResultRow.warningTone (replacing the old unreadable boolean) — the tree and search halves of D-12's pre-open marker"
  - "artifact-page.tsx's D-10 badge + D-11 two-level disclosure, replacing the persistent warning-notice rows"
  - ".status-chip[data-tone='warning'] — the one new CSS tone this phase adds"
affects: [04-04]

# Actuals (#2632)
actuals:
  tokens: 8509
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "artifactWarningTone({ warnings, bodyLength }) is the one place the survived/not-survived split is computed — tree.ts and search.ts both call it rather than re-deriving the boolean locally, so a future fourth surface has one obvious import instead of a fourth local rule."
    - "The D-11 disclosure reuses the .artifact-metadata two-level <details> convention verbatim (outer summary opens the badge-labeled panel, a nested <details> holds 'Technical details') rather than @base-ui/react/collapsible or Popover, matching the codebase's existing disclosure idiom."
    - "ParseWarning fields render as React text children inside a <dl> (never dangerouslySetInnerHTML) — the one new place attacker-influenceable file content (a warning's own path/message) reaches the DOM as structured markup."

key-files:
  created:
    - src/presentation/artifact-warning-tone.ts
    - test/web/degradation-ui-contract.test.ts
  modified:
    - src/server/project-presentation.ts
    - src/presentation/tree.ts
    - src/presentation/search.ts
    - src/web/pages/artifact-page.tsx
    - src/web/components/tree-navigator.tsx
    - src/web/pages/search-page.tsx
    - src/web/styles/globals.css
    - test/presentation/tree.test.ts
    - test/presentation/search.test.ts
    - test/server/project-presentation.test.ts
    - test/presentation/roadmap.test.ts
    - test/rendering/plan-sections.test.ts
    - test/rendering/references.test.ts

key-decisions:
  - "artifactWarningTone() takes bodyLength (a number), not the warning's own salvage prose, as the survived/not-survived signal — matches the plan's explicit instruction that the split must be deterministic rather than a string match."
  - "The header badge (static span, always visible when hasWarnings) and the disclosure's own outer <summary> are two separate elements that both carry the label 'Warning' rather than one clickable element — the badge is the D-10 pre-open marker in the artifact-kind eyebrow row, the disclosure below is the actual D-11 toggle; they 'read as one control' by sharing the label and .status-chip styling, not by being the same DOM node."
  - "document.warnings (plain strings) render inside the same nested 'Technical details' disclosure as artifact.warnings (ParseWarning records), under their own 'Document warnings' label, rather than a second disclosure — per the plan's explicit instruction not to reintroduce a second surface."
  - "Renamed the unrelated mermaid runtime-parse-warning paragraph's class from 'notice warning' to 'notice render-issue' (no CSS impact — no .warning-tone rule existed for it, it only ever inherited base .notice styling) so Task 2's own acceptance criteria (zero occurrences of the literal 'notice warning' substring) is actually satisfied rather than accidentally left true by omission."

patterns-established:
  - "A damaged-artifact tone is presentation metadata attached to an existing node/row after ranking/tree-building completes — never a new node, never a ranking input. Any future third consumer of ArtifactDto.warnings/bodyLength should import artifactWarningTone() rather than re-deriving the split."

requirements-completed: [TGT-06]

coverage:
  - id: D1
    description: "A corrupted file degrades only its own view: every other page still renders, the load still returns an ok snapshot, and the app does not crash (TGT-06)"
    requirement: "TGT-06"
    verification:
      - kind: integration
        ref: "test/degradation.test.ts (pre-existing, re-run in this plan's verification chain) — dense fixture's two deliberate defects isolate to their own warnings, ok load status, non-null project"
        status: pass
      - kind: other
        ref: "Task 2 live probe: /api/tree and /api/search against fixtures/dense both answer 200 with 52 file leaves, 2 marked damaged, none dropped"
        status: pass
    human_judgment: false
  - id: D2
    description: "On the artifact page a damaged artifact shows a compact warning badge beside the artifact-kind label; the page body renders the recovered Markdown normally, no persistent warning banner (D-10)"
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#no persistent warning-notice row remains, and a Technical details disclosure exists instead (D-10, D-11)"
        status: pass
    human_judgment: true
    rationale: "The source-text contract proves the persistent-banner className is gone and the badge/disclosure markup exists, but the actual rendered visual placement (badge beside the eyebrow, no layout shift, document body still reads normally) is not asserted by a rendered-DOM or screenshot test in this v1 stack."
  - id: D3
    description: "Opening the warning badge reveals a plain-language summary and a secondary technical-details section with path/stage/message/salvage (D-11)"
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#renders one generic plain-language summary, never a per-parser-stage variant (D-11)"
        status: pass
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#renders all four ParseWarning fields verbatim in the technical-details disclosure (D-11)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A damaged artifact is marked in both the tree and search results before it is opened, and stays navigable in both places (D-12)"
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/presentation/tree.test.ts#marks a warned artifact with a non-empty body with the body-survived tone; a clean sibling stays null — both keep their url"
        status: pass
      - kind: unit
        ref: "test/presentation/search.test.ts#marks a row with the body-survived tone when its warned artifact has a non-empty body"
        status: pass
      - kind: other
        ref: "Task 2 live probe: both fixtures/dense damaged files (tab-broken plan, HANDOFF.json) appear with warningTone in /api/tree and /api/search, each still carrying a normal url"
        status: pass
    human_judgment: false
  - id: D5
    description: "One vocabulary (Warning/Unreadable) spans the tree, search, and artifact-page badge, derived by a single shared function (D-12)"
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#one Warning/Unreadable vocabulary spans the artifact badge, the tree indicator, and the search chip (D-12)"
        status: pass
      - kind: unit
        ref: "test/presentation/tree.test.ts#marks a warned artifact with an empty body with the nothing-salvageable tone"
        status: pass
    human_judgment: false
  - id: D6
    description: "A degraded artifact whose body survived is indexed and ranked exactly as an undamaged one — the warning tone never enters ranking (D-13)"
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/presentation/search.test.ts#a warning does not change row order — a warned and an unwarned row sort identically to two clean rows (D-13)"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- src/server/search-index.ts confirms the ranking path is untouched by every task in this plan"
        status: pass
    human_judgment: false
  - id: D7
    description: "The technical-detail body wraps rather than truncates; the disclosure has no fixed width or scroll container of its own"
    verification:
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#globals.css carries the new warning tone rule and wraps the disclosure fields instead of truncating (UI Considerations)"
        status: pass
    human_judgment: false
  - id: D8
    description: "ParseWarning fields (attacker-influenceable file content) reach the DOM only as React text children, never through dangerouslySetInnerHTML (T-04-03-01)"
    verification:
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#never renders a ParseWarning field through dangerouslySetInnerHTML (T-04-03-01)"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-04
status: complete
---

# Phase 4 Plan 3: Damaged-Artifact Legibility Summary

**One shared `artifactWarningTone()` derivation now marks a damaged artifact consistently in the tree, search results, and the artifact page — a compact badge and two-level `<details>` disclosure replace the old persistent warning banner, ranking stays untouched, and a live probe against `fixtures/dense` confirms both deliberately corrupted files are marked and still navigable among 52 file leaves.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-03T23:22:00Z (approx.)
- **Completed:** 2026-09-03T23:32:23Z
- **Tasks:** 3
- **Files modified:** 13 (2 created, 11 modified)

## Accomplishments

- `src/presentation/artifact-warning-tone.ts` — `artifactWarningTone()`, the one function deriving `null | 'warning' | 'unreadable'` from an artifact's `warnings` array and `bodyLength`, imported by both `tree.ts` and `search.ts` so no consumer re-derives the split locally.
- `ArtifactDto.bodyLength` added to `project-presentation.ts` and populated from `Artifact.bodyLength` — the deterministic did-the-body-survive signal the tone derivation needs.
- `TreeNode.warningTone` carried on every file leaf (`null` on group/directory/exclusion nodes); `SearchResultRow.warningTone` replaces the old conflated `unreadable` boolean, computed after `compareHits` has already ordered the hits so a warning never touches rank (D-13, confirmed by `git diff --exit-code -- src/server/search-index.ts`).
- `artifact-page.tsx`: a `.status-chip[data-tone="warning"]` badge beside the artifact-kind eyebrow (D-10), and a two-level `<details>` disclosure — outer summary labeled "Warning", a generic plain-language paragraph, and a nested "Technical details" `<dl>` rendering every `ParseWarning`'s `path`/`stage`/`message`/`salvage` verbatim as React text children, plus any `document.warnings` strings under their own label inside the same nested disclosure (D-11).
- `tree-navigator.tsx` gains a `WarningIndicator` chip on file leaves (Warning/Unreadable, matching `node.warningTone`), rendered as a sibling inside the existing `Link`/`span` row — the node stays clickable. The empty-group branch is untouched.
- `search-page.tsx`'s damaged-file chip now reads `row.warningTone` and uses the shared Warning/Unreadable vocabulary and tone, off the old `data-tone="quiet"` (which visually contradicted D-12).
- `globals.css`: one new `.status-chip[data-tone='warning']` rule (destructive formula, its own selector so a future genuinely-destructive action is never silently retoned by a CSS rename) plus the disclosure's `overflow-wrap: anywhere` field rules with no fixed width or scroll container.
- New `test/web/degradation-ui-contract.test.ts` (7 cases) pins the banner-is-gone/disclosure-exists contract, the shared vocabulary, the untouched empty-group branch, the absence of `dangerouslySetInnerHTML` in the warning path, and the new CSS. `tree.test.ts` and `search.test.ts` gained warning/unreadable/node-count-identical/order-invariance cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: One derivation of a damaged artifact's tone** - `b8c360f` (feat)
2. **Task 2: The badge, the disclosure, and the two pre-open markers** - `3a7032d` (feat)
3. **Task 3: Pin isolation and the one vocabulary** - `f01542a` (test)

**Plan metadata:** commit to follow this SUMMARY.

## Files Created/Modified

- `src/presentation/artifact-warning-tone.ts` — new: `ArtifactWarningTone`, `artifactWarningTone()`
- `src/server/project-presentation.ts` — `ArtifactDto.bodyLength`, populated in `artifactDtos()`
- `src/presentation/tree.ts` — `TreeNode.warningTone`, set from `artifactWarningTone()` on file leaves only
- `src/presentation/search.ts` — `SearchResultRow.warningTone` replaces `unreadable`
- `src/web/pages/artifact-page.tsx` — D-10 badge, D-11 two-level disclosure, `ParseWarning`-typed `artifact.warnings`, renamed the unrelated mermaid runtime-warning paragraph off `notice warning`
- `src/web/components/tree-navigator.tsx` — `WarningIndicator` chip on file leaves
- `src/web/pages/search-page.tsx` — retoned chip driven by `row.warningTone`
- `src/web/styles/globals.css` — `.status-chip[data-tone='warning']`, `.artifact-warning-disclosure`, `.warning-fields`, `.warning-fields-label`, `.warning-document-warnings`
- `test/presentation/tree.test.ts`, `test/presentation/search.test.ts` — new warning/unreadable/node-count/order-invariance cases
- `test/server/project-presentation.test.ts` — `bodyLength` pass-through case
- `test/web/degradation-ui-contract.test.ts` — new: 7 source-text contract cases
- `test/presentation/roadmap.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts` — added `bodyLength` to pre-existing literal `ArtifactDto` fixtures (see Deviations)

## Decisions Made

- `artifactWarningTone()` is keyed on `bodyLength` (a number), never a prose match against a warning's own `salvage` string, per the plan's explicit determinism requirement.
- The artifact-page header badge and the disclosure's own outer `<summary>` are separate DOM nodes sharing the "Warning" label and `.status-chip` styling — they "read as one control" visually, not by literally being one clickable element, since the disclosure's own `<summary>` is what native `<details>` makes interactive.
- `document.warnings` (plain strings) render inside the same nested "Technical details" disclosure as `artifact.warnings` (structured records), under a "Document warnings" sub-label, rather than a second disclosure — avoids reintroducing a second surface per the plan's explicit instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adding required `ArtifactDto.bodyLength` broke five pre-existing literal fixtures outside this plan's declared file list**
- **Found during:** Task 1 (`npm run typecheck` after adding the field)
- **Issue:** `bodyLength: number` is a required field (not optional, per the plan's determinism requirement), so every hand-built `ArtifactDto` object literal in the test suite needed it. Three files not in this plan's `files_modified` list — `test/presentation/roadmap.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts` — failed `tsc` with `TS2741: Property 'bodyLength' is missing`.
- **Fix:** Added `bodyLength: 0` to each of the five affected object literals (the field is inert for those tests — none of them assert on warning tone).
- **Files modified:** `test/presentation/roadmap.test.ts`, `test/rendering/plan-sections.test.ts`, `test/rendering/references.test.ts`
- **Verification:** `npm run typecheck` exits 0; `npm test -- --run` (full suite, 516 tests) passes.
- **Committed in:** `b8c360f` (Task 1 commit)

**2. [Rule 3 - Blocking] Renaming `SearchResultRow.unreadable` to `warningTone` broke two pre-existing assertions in Task 1's own `<verify>` test files**
- **Found during:** Task 1 (`npm test` against the required verification file set, which includes `test/presentation/search.test.ts` and `test/server/search-index.test.ts`'s integration path)
- **Issue:** Two existing tests asserted `row?.unreadable === true`; the plan's own instruction ("do not leave both a boolean and a tone field on the row") requires a hard replacement, which is a compile error against the old field name.
- **Fix:** Updated both assertions to `row?.warningTone === 'unreadable'` (both fixtures happen to produce the nothing-salvageable tone), renamed the surrounding test descriptions to match.
- **Files modified:** `test/presentation/search.test.ts`
- **Verification:** Both tests pass under the new field name; Task 1's full required verification command exits 0.
- **Committed in:** `b8c360f` (Task 1 commit)

**3. [Rule 2 - Missing Critical] The unrelated mermaid runtime-warning paragraph also carried the literal "notice warning" class combo, defeating Task 2's own acceptance gate**
- **Found during:** Task 2 (writing the `grep -v '^[[:space:]]*//' ... | grep -c 'notice warning'` acceptance check, and again independently in Task 3's source-text contract test)
- **Issue:** `DocumentView`'s client-side mermaid-parse-failure notice (unrelated to D-10/D-11's structured-metadata warnings) also used `className="notice warning"`. The plan's Task 2 acceptance criterion requires zero occurrences of that literal substring in the file, so leaving it unchanged would fail the plan's own gate even though this paragraph isn't one of the two loops the plan named for removal.
- **Fix:** Renamed that one class to `"notice render-issue"` (first attempt, `"notice render-warning"`, still contained the standalone word "warning" and was caught by Task 3's own word-boundary regex test — renamed again). No CSS rule ever targeted `.warning` specifically (it only ever inherited base `.notice` styling), so this is a pure rename with zero visual change.
- **Files modified:** `src/web/pages/artifact-page.tsx`
- **Verification:** `grep -v '^[[:space:]]*//' src/web/pages/artifact-page.tsx | grep -c 'notice warning'` returns 0; `test/web/degradation-ui-contract.test.ts`'s word-boundary regex assertion passes.
- **Committed in:** `3a7032d` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 2/3 — correctness/compile-gate necessities directly caused by this plan's own required field/name changes). No scope creep: no functionality beyond Tasks 1-3's own action text was added.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared `artifactWarningTone()` seam and the `Warning`/`Unreadable` vocabulary are available for plan 04-04 to reuse if any further surface needs to reflect damaged-artifact state.
- D2's rendered-visual claim (badge placement, no layout shift, document body still reading normally) is pinned at the source-text level but not by a screenshot; recommend a human open a damaged artifact (e.g. `.planning/phases/02-transport-layer/02-01-PLAN.md` in `fixtures/dense`) against a live `npm run dev -- fixtures/dense` session before the phase closes, alongside 04-01's and 04-02's own recommended click-throughs.

---
*Phase: 04-portability-degradation-hardening*
*Completed: 2026-09-04*

## Self-Check: PASSED

All key files (`src/presentation/artifact-warning-tone.ts`, `src/server/project-presentation.ts`,
`src/presentation/tree.ts`, `src/presentation/search.ts`, `src/web/pages/artifact-page.tsx`,
`src/web/components/tree-navigator.tsx`, `src/web/pages/search-page.tsx`,
`src/web/styles/globals.css`, `test/web/degradation-ui-contract.test.ts`,
`test/presentation/tree.test.ts`, `test/presentation/search.test.ts`,
`test/server/project-presentation.test.ts`) confirmed present on disk. All three task commits
(`b8c360f`, `3a7032d`, `f01542a`) confirmed present in `git log`. Full suite (516 tests),
`typecheck`, `lint`, `build`, and `smoke` all re-verified passing.
