---
phase: 05-per-type-document-views
plan: 01
subsystem: ui
tags: [view-registry, section-projection, react, vitest, discussion-log]

requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: RenderedDocument, dropLeadingTitle, the ArtifactPage/ArtifactHeader/DocumentView reader shell this plan dispatches into
provides:
  - "extractDiscussionLog/projectSections/SECTION_PROJECTIONS, wired into GenericMarkdownHandler.parse — the first non-empty structured payload any artifact kind produces"
  - "The client-side view registry seam (VIEW_KINDS, ViewManifest/composeView/outlineEntriesOf, VIEW_MANIFESTS/resolveView, groupDocumentSections/splitRenderedDocument, BLOCK_COMPONENTS) every later Phase 5 plan extends rather than re-architects"
  - "The View/Source toggle (D-01/D-03) and the shared DocumentOutline(entries) component (D-11), both reused unmodified by every future view"
  - "A working discussion-log view: 15 questions across 6 topics render as questions-and-choices, with the two question-less topics collapsed into the D-02 remainder"
affects: [05-02-per-type-document-views, 05-03-per-type-document-views, 05-04-per-type-document-views, 05-05-per-type-document-views, 05-06-per-type-document-views]

actuals:
  tokens: 13118
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Section-projection registry: SECTION_PROJECTIONS keyed on the already-granular artifact.kind wire value, composed exclusively from markdown-sections.ts's line-scanning primitives (T-01-11) — the sibling pattern RESEARCH.md predicted to FRONTMATTER_PANEL_BUILDERS"
    - "View registry: ViewManifest.promote (an ordered list of section/data block declarations) -> composeView -> ComposedView{blocks, remainder} -> outlineEntriesOf — one composer every future manifest reuses unmodified"
    - "Locally-declared minimal DOM interfaces (not lib.dom types) let a browser-DOM-touching module (document-sections.ts's splitRenderedDocument) type-check under both tsconfig.web (real DOM lib) and tsconfig.server (no DOM lib, reached via a direct test import of the DOM-free groupDocumentSections export)"

key-files:
  created:
    - src/planning-repo/handlers/section-projection.ts
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/views/document-sections.ts
    - src/web/views/blocks.tsx
    - src/web/components/document-view-toggle.tsx
    - src/web/components/document-outline.tsx
    - test/section-projection.test.ts
    - test/web/view-compose.test.ts
    - test/web/document-sections.test.ts
    - test/web/view-page-contract.test.ts
  modified:
    - src/planning-repo/handlers/generic.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css

key-decisions:
  - "View is the page; Source is the escape hatch (D-01) — ArtifactPage's registry dispatch is now the primary render path, not a lead panel above the always-present document body."
  - "PromotedBlock['consumes'] only receives (group, selected) per the plan's own type contract, but the discussion-log manifest's consumption rule needs structured.topics (not the promoted questions array) — resolved by capturing the just-selected topics list in a closure variable local to that one promote entry, safe because select() and consumes() for the same entry always run back-to-back synchronously inside one composeView call."
  - "document-sections.ts's splitRenderedDocument declares its own minimal structural DOM interfaces (MinimalElement/MinimalParsedDocument, a locally-shadowed `declare const DOMParser`) rather than importing lib.dom types, so the file — and the DOM-free groupDocumentSections it shares a module with — type-checks under tsconfig.server (no DOM lib) when test/web/document-sections.test.ts imports it directly, exactly like the codebase's existing document-title.ts/scroll-settle.ts precedent for DOM-free web logic modules."
  - "Panels and warning disclosures were left exactly where they already sat in artifact-page.tsx (above both ArtifactReader and ViewReader) rather than duplicated into ViewReader's own return — they were already reachable in every mode since they render once, unconditionally, before the mode-dependent reader."

patterns-established:
  - "View-local BlockComponentKey union declared with all four eventual keys up front (only discussion-questions implemented; the rest map to a no-op component) so 05-05 only swaps components in, never widens the union a second time."

requirements-completed: [VIEW-01, VIEW-02, UI-06]

coverage:
  - id: D1
    description: "Section-projection extractor (extractDiscussionLog) composed from splitSections/splitSubsections/parseMarkdownTable, anchored on the ✓ table cell (D-06); wired into GenericMarkdownHandler so structured.questions/topics is populated for every discussion-log artifact"
    requirement: VIEW-02
    verification:
      - kind: unit
        ref: "test/section-projection.test.ts — real Phase 5 fixture (15 questions/6 topics), synthetic two-✓ and no-✓ tables, both User's-choice apostrophe spellings, projectSections('research', ...) returning {}"
        status: pass
      - kind: integration
        ref: "live API check — GET /api/documents?route=.../05-DISCUSSION-LOG.md on :4199 returns questions:15 topics:6, every question with exactly one chosen option"
        status: pass
    human_judgment: false
  - id: D2
    description: "Client-side view registry seam — VIEW_KINDS, ViewManifest/composeView/outlineEntriesOf (D-04 promotion order, D-02 remainder with the leading group relabelled Introduction), VIEW_MANIFESTS/resolveView, groupDocumentSections"
    requirement: VIEW-01
    verification:
      - kind: unit
        ref: "test/web/view-compose.test.ts — promotion order, empty-select skip, consumes-based group removal, remainder ordering/labelling, outlineEntriesOf's conditional remainder entry, resolveView hit/miss"
        status: pass
      - kind: unit
        ref: "test/web/document-sections.test.ts — groupDocumentSections leading/blank-preamble/h2/plan-section boundary handling"
        status: pass
    human_judgment: false
  - id: D3
    description: "The discussion-log document opens as questions and choices in the browser: one .section-heading.compact per question, option list in table-row order, exactly one Chosen chip per question, two question-less topics collapsed into the More in this document disclosure, and the View/Source toggle switches between this and the unchanged full document with no URL/hash rewrite"
    requirement: UI-06
    verification:
      - kind: manual_procedural
        ref: "Open /milestones/.../05-DISCUSSION-LOG.md, confirm View mode renders questions+chips, Source shows the full document, and the remainder disclosure holds the two undiscussed topics — in both light and dark themes"
        status: unknown
    human_judgment: true
    rationale: "This codebase has no RTL/Playwright/browser test harness (an established, deliberate convention — vitest source-text-scan contracts only); the acceptance grep and text-scan contracts (view-page-contract.test.ts, blocks.tsx markup assertions) prove the code exists in the right shape, but visual rendering, chip styling, and light/dark parity need a human to open the live page. Also the plan's own must_haves backstop truth names this exact check."

# Metrics
duration: 26min
completed: 2026-09-20
status: complete
plan_head_before: 7c38a88e9fc52d1c394e0f27906cae5ea9b69e51
---

# Phase 5 Plan 01: Discussion-log view, section-projection extractor, view registry Summary

**A DISCUSSION-LOG document now opens as 15 questions across 6 topics with one `Chosen` chip
each, powered by a new server-side section-projection extractor and a client-side view registry
(composeView/outlineEntriesOf/resolveView) that every later Phase 5 view reuses unmodified.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-20T20:34:57+05:30 (base commit `7c38a88`)
- **Completed:** 2026-09-20T21:00:34+05:30
- **Tasks:** 2 completed
- **Files modified:** 15 (12 created, 3 modified)

## Accomplishments

- `extractDiscussionLog`/`projectSections`/`SECTION_PROJECTIONS` extract `structured.questions`/`topics`
  for every discussion-log artifact, composed exclusively from `markdown-sections.ts`'s existing
  line-scanning primitives, anchored on the `✓` table cell (never the `**User's choice:**` prose
  line, which is tolerant enrichment only)
- The client-side view registry — `VIEW_KINDS`, `ViewManifest`/`composeView`/`outlineEntriesOf`,
  `VIEW_MANIFESTS`/`resolveView`, `groupDocumentSections`/`splitRenderedDocument`,
  `BLOCK_COMPONENTS` — exists as pure, unit-tested modules with only `discussion-log` registered;
  every later Phase 5 plan adds a manifest entry rather than touching the composer
- `ArtifactPage` now dispatches through the registry: a new `ViewReader` renders manifest-promoted
  blocks (D-04 order) plus the D-02 collapsed remainder when a manifest resolves for
  `artifact.kind`, with a `View`/`Source` toggle (D-01/D-03, no URL/hash rewrite) mounted in
  `ArtifactHeader`'s existing `children` slot; falls back to the unchanged source reader otherwise
- The outline is now sourced from the view's own sections in View mode (D-11), via a newly
  extracted, shared `DocumentOutline` component both modes use identically
- Live API check against the real Phase 5 discussion log confirms `questions: 15 topics: 6`, every
  question with exactly one chosen option

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "discussion log reads as questions and choices"** — `807003d` (feat)
2. **Task 2: Outline sourced from the view's sections, page-contract test, golden regeneration** — `e4f57d1` (feat)

## Files Created/Modified

- `src/planning-repo/handlers/section-projection.ts` — `extractDiscussionLog`, `projectSections`, `SECTION_PROJECTIONS`
- `src/planning-repo/handlers/generic.ts` — now returns `structured: projectSections(ref.kind, fm.body)`
- `src/web/views/kinds.ts` — `VIEW_KINDS` (18 kinds), `ViewKind`, `VIEW_LOCAL_PREFIXES`, `humanizeKind`
- `src/web/views/manifest.ts` — `composeView`, `outlineEntriesOf`, block/manifest/view-input types
- `src/web/views/manifests.ts` — `VIEW_MANIFESTS` (discussion-log entry), `resolveView`
- `src/web/views/document-sections.ts` — `groupDocumentSections`, `splitRenderedDocument`, `PlanSegmentAttributes`
- `src/web/views/blocks.tsx` — `BLOCK_COMPONENTS`, `DiscussionQuestions`
- `src/web/components/document-view-toggle.tsx` — `DocumentViewToggle`
- `src/web/components/document-outline.tsx` — extracted, shared `DocumentOutline`/`OutlineEntry`
- `src/web/pages/artifact-page.tsx` — `ViewReader`, View/Source mode state, registry dispatch
- `src/web/styles/globals.css` — `.document-view-toggle`, `.view-block`(+sibling gap), `.view-discussion-log-options`, `.view-discussion-log-option`
- `test/section-projection.test.ts`, `test/web/view-compose.test.ts`, `test/web/document-sections.test.ts`, `test/web/view-page-contract.test.ts` — new unit/contract suites

## Decisions Made

See `key-decisions` in frontmatter — four decisions: keeping View as the primary render path
(D-01), the closure-capture resolution for `PromotedBlock['consumes']`'s narrower-than-needed
signature, the locally-declared minimal DOM interfaces that let `document-sections.ts` type-check
under both `tsconfig.web` and `tsconfig.server`, and leaving the panels/warning disclosures in
their existing position rather than duplicating them into `ViewReader`.

## Deviations from Plan

None — plan executed exactly as written. The `PromotedBlock['consumes']` closure-capture pattern
and the locally-declared minimal DOM interfaces were both implementation choices within the plan's
own type contracts (the plan specified the exact `consumes` signature and the exact DOMParser-guard
behavior), not deviations from what was planned.

## Known Stubs

- `src/web/views/blocks.tsx` — `BLOCK_COMPONENTS['verification-checks']`, `['plan-task-index']`,
  and `['fact-list']` all map to a `NotYetImplemented` component that renders `null`. This is
  intentional and explicitly scoped by the plan itself ("others map to a component returning null
  — replaced in 05-05"): the `BlockComponentKey` union and the `BLOCK_COMPONENTS` table shape are
  declared now so Plan 05-05 only has to swap components in, never widen the union a second time.
  No manifest in this plan promotes a block using any of these three keys, so the stub is
  unreachable from any currently-registered view. Resolved by Plan 05-05.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The view-registry seam (`composeView`/`outlineEntriesOf`/`resolveView`/`BLOCK_COMPONENTS`) and the
shared UI primitives (`DocumentViewToggle`, `DocumentOutline`) are proven end to end on the
highest-value case (VIEW-02) and ready for Plan 05-02 onward to extend with new manifests and
block components — no changes to the composer, the page dispatch, or the outline component are
expected to be needed. Ready for 05-02.

---
*Phase: 05-per-type-document-views*
*Completed: 2026-09-20*

## Self-Check: PASSED

All 12 created source/test files verified present on disk; both task commits (`807003d`, `e4f57d1`)
verified present in `git log`.
