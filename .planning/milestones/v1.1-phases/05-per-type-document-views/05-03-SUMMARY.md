---
phase: 05-per-type-document-views
plan: 03
subsystem: reading
tags: [mentions, references, regex, decision-registry, warning-registry, d-14, d-15]

# Dependency graph
requires:
  - phase: 05-per-type-document-views
    provides: "Plan 05-01's section-projection registry (SECTION_PROJECTIONS keyed on artifact.kind) and view-registry seam, which this plan extends with a second entry (review) rather than restructuring"
provides:
  - "A fifth ID scheme, `warning` (`WR-\\d+`), inserted before `requirement` in ID_PATTERNS/IdScheme — WR-01 now scans as warning, never requirement"
  - "parseDecisionEntries/extractReviewWarnings in section-projection.ts — CONTEXT artifacts carry structured.decisions, REVIEW artifacts carry structured.warnings (SECTION_PROJECTIONS.review)"
  - "decisionPreview/warningPreview reference builders plus artifactPhases/phaseResolutions/corpusResolutions on ReferenceRegistry — D-XX and WR-XX mentions resolve phase-local-first-then-corpus-unique (D-14), preview-first via the existing reference-preview.tsx (D-15), reused unmodified"
affects: [05-04-per-type-document-views, 05-05-per-type-document-views, 05-06-per-type-document-views]

actuals:
  tokens: 16209
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase-scoped-then-corpus-wide resolution: two parallel maps (phaseResolutions keyed phaseKey+type+ID, corpusResolutions keyed type+ID) built from the same addResolution null-on-duplicate ambiguity primitive already used for phase/plan/requirement — no second ambiguity rule was written for D-14's new two-tier fallback."
    - "Definition-site preview keys: decision/warning preview keys are `entry.id + '@' + dto.path`, not id alone — a D-05 defined in two different phases needs two distinct preview objects so per-scope ambiguity collapse (not a single global one) is what addResolution operates on."

key-files:
  created: []
  modified:
    - src/domain/model.ts
    - src/planning-repo/mentions.ts
    - src/planning-repo/handlers/section-projection.ts
    - src/planning-repo/handlers/context.ts
    - src/presentation/references.ts
    - src/rendering/linkify.ts
    - test/mentions.test.ts
    - test/section-projection.test.ts
    - test/handlers.test.ts
    - test/rendering/references.test.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-started.json

key-decisions:
  - "structured.decisions placed BEFORE sections in ContextHandler's returned object (`{ decisions, sections }`, not the plan's literal `{ sections, decisions }` example) — JSON.stringify's key order follows object-literal insertion order, and inserting decisions after sections would add a trailing comma to every existing `\"sections\": { ... }` closing brace across three fixture trees, turning a purely-additive golden regeneration into 18 changed (removed+added) lines — directly failing the task's own `GOLDEN-ADDITIVE` acceptance gate. Reordering the two fields produces byte-identical `sections` content with the new `decisions` array inserted as pure addition."
  - "Root-document ambiguous-vs-unique corpus fallback (D-14) is proven generically (a D-01 defined in two fixture phases stays plain text from a root document; a D-05 defined in exactly one fixture phase resolves) rather than reusing the real corpus's literal PROJECT.md/D-03 example named in the truth — the underlying mechanism (phaseKey+type+ID / type+ID map lookups) is identity-agnostic, and a hand-built two-phase fixture exercises the same code path with less fixture-maintenance risk than depending on the live corpus's exact decision count staying stable."

requirements-completed: [BACK-02]

coverage:
  - id: D1
    description: "Five-scheme mention scanner (warning added before requirement) plus decision/warning definition extractors: parseDecisionEntries line-scans a phase CONTEXT.md's <decisions> tag into {id, text} entries (continuation lines folded); extractReviewWarnings line-scans a REVIEW.md's ## Warnings section into {id, title} entries; both wired into structured output (ContextHandler / SECTION_PROJECTIONS.review) and proven against the real Phase 5 CONTEXT.md (15 D-NN entries) and the real 01-REVIEW.md (4 WR-NN entries); goldens regenerated additively only"
    requirement: BACK-02
    verification:
      - kind: unit
        ref: "test/mentions.test.ts — five-key ID_PATTERNS, warning-before-requirement ordering, WR-01-as-warning, WRX-01-still-requirement, WR-NN code-stripping"
        status: pass
      - kind: unit
        ref: "test/section-projection.test.ts — parseDecisionEntries over the real 05-CONTEXT.md (15 entries D-01..D-15, D-01 folds Reversibility continuation, D-06 starts 'A manifest that promotes'), synthetic null/empty/non-decision-bullet-between/continuation-folding cases; extractReviewWarnings over the real 01-REVIEW.md (4 entries, WR-04 starts the gray-matter finding title), synthetic no-Warnings-section/empty cases; projectSections('review', ...) parity"
        status: pass
      - kind: unit
        ref: "test/handlers.test.ts — ContextHandler populates structured.decisions from a two-bullet <decisions> tag body"
        status: pass
      - kind: integration
        ref: "npx vitest run test/mentions.test.ts test/section-projection.test.ts test/handlers.test.ts test/snapshot.golden.test.ts (all pass) + git diff -- test/__golden__ additive-only (0 removed lines, 36 decisions-array occurrences added)"
        status: pass
    human_judgment: false
  - id: D2
    description: "decisionPreview/warningPreview reference builders and phase-local-then-corpus-unique resolution (D-14), reusing reference-preview.tsx unmodified (D-15): D-XX/WR-XX mentions become preview-first controls that resolve against the containing artifact's own phase first, fall back to a corpus-wide match only when exactly one definition exists elsewhere, and render plain text on absence or ambiguity"
    requirement: BACK-02
    verification:
      - kind: unit
        ref: "test/rendering/references.test.ts BACK-02 describe block (7 cases) — phase-1-vs-phase-2 differing D-01 resolution, root-document ambiguous D-01 (plain text) vs unique D-05 (resolves), phase-1 WR-02 resolution with WR-09 staying text, duplicate-WR-02-within-one-REVIEW collapsing to plain text (addResolution null-on-duplicate, documented choice), unregistered-artifact-path falling straight to corpus resolution"
        status: pass
      - kind: integration
        ref: "npx vitest run test/rendering/references.test.ts test/rendering/markdown.test.ts (55/55), npm test (898/898), npm run typecheck, npm run lint — all pass"
        status: pass
      - kind: integration
        ref: "live API check — GET /api/documents on :4199 against the real 01-REVIEW-FIX.md returns warning refs WR-01,WR-02,WR-03,WR-04, all resolved"
        status: pass
    human_judgment: false

# Metrics
duration: 14min
completed: 2026-09-20
status: complete
plan_head_before: 660958f75c6c6c755a547891f46e6a84318b891c
---

# Phase 5 Plan 03: Decision and warning mentions Summary

**`D-XX` decision and `WR-XX` warning mentions are now clickable, preview-first, and resolve phase-local-first-then-corpus-unique — a new `warning` ID scheme, per-phase decision/warning definition extractors, and a two-tier reference-resolution map, wired into the existing linkify pipeline and `reference-preview.tsx` with zero changes to either.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-20T15:49:00Z (approx., continuing directly from 05-02's completion)
- **Completed:** 2026-09-20T16:03:29Z
- **Tasks:** 2 completed
- **Files modified:** 12 (0 created, 12 modified — 10 source/test files, 2 regenerated goldens)

## Accomplishments

- `IdScheme`/`ID_PATTERNS` grew a fifth scheme, `warning` (`/\bWR-\d+\b/g`), inserted before
  `requirement` so `WR-01` scans as warning rather than being caught by requirement's
  two-or-more-uppercase-prefix shape; `WRX-01` still correctly scans as requirement
- `parseDecisionEntries`/`extractReviewWarnings` (section-projection.ts) line-scan a phase
  CONTEXT.md's `<decisions>` tag into `{id, text}` entries (indented continuation lines, including
  `— **Reversibility:**` sub-lines, folded into the owning entry) and a REVIEW.md's `## Warnings`
  section into `{id, title}` entries — both proven against the real Phase 5 CONTEXT.md (15 entries)
  and the real Phase 1 `01-REVIEW.md` (4 entries)
- `ContextHandler` now returns `structured.decisions`; `SECTION_PROJECTIONS.review` wires
  `extractReviewWarnings` into the same registry Plan 05-01 built for `discussion-log`
- `decisionPreview`/`warningPreview` mirror `requirementPreview`'s shape; `ReferenceRegistry` grew
  `artifactPhases`/`phaseResolutions`/`corpusResolutions` implementing D-14's phase-local-then-
  corpus-unique resolution on top of the existing `addResolution` null-on-duplicate ambiguity
  primitive — no second ambiguity rule was written
- `tokenIdentity` and `linkify.ts`'s `REFERENCE_TOKEN` now recognize `WR-\d+`/`D-\d+`;
  `reference-preview.tsx` renders both new types with zero changes (its eyebrow already prints
  `preview.type` generically) — proven both in unit tests and against the real, running server
  (`warning refs: WR-01,WR-02,WR-03,WR-04` from `01-REVIEW-FIX.md`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Warning mention scheme and the decision/warning definition extractors** — `40724a2` (feat)
2. **Task 2: Decision and warning previews with phase-local-then-corpus resolution, wired into linkify** — `2aeb803` (feat)

## Files Created/Modified

- `src/domain/model.ts` — `IdScheme` gains `'warning'` (five schemes)
- `src/planning-repo/mentions.ts` — `ID_PATTERNS.warning` inserted before `requirement`
- `src/planning-repo/handlers/section-projection.ts` — `DecisionEntry`, `ReviewWarning`,
  `parseDecisionEntries`, `extractReviewWarnings`; `SECTION_PROJECTIONS.review`
- `src/planning-repo/handlers/context.ts` — `structured.decisions`
- `src/presentation/references.ts` — `ReferencePreviewType` gains `'decision' | 'warning'`;
  `ReferenceRegistry.artifactPhases`/`phaseResolutions`/`corpusResolutions`; `decisionPreview`,
  `warningPreview`; `tokenIdentity` and `resolvePresentationReference` branches
- `src/rendering/linkify.ts` — `REFERENCE_TOKEN` gains a `D-\d+` alternative
- `test/mentions.test.ts`, `test/section-projection.test.ts`, `test/handlers.test.ts`,
  `test/rendering/references.test.ts` — new five-scheme, extractor, and resolution test coverage
- `test/__golden__/dense.json`, `test/__golden__/sparse-started.json` — regenerated, additive-only
  (`decisions` arrays on `context` artifacts' `structured`)

## Decisions Made

See `key-decisions` in frontmatter — two decisions: reordering `ContextHandler`'s returned
`structured` object (`decisions` before `sections`) so the golden regeneration stayed purely
additive rather than rewriting every existing `sections` closing brace, and proving D-14's
ambiguous-vs-unique corpus fallback against a hand-built two-phase fixture rather than the live
corpus's literal PROJECT.md/D-03 example.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `structured` key order reversed to keep the golden diff additive-only**
- **Found during:** Task 1, verification step (golden regeneration)
- **Issue:** The plan's action text illustrated `structured: { sections, decisions: parseDecisionEntries(sections.decisions) }`. Implementing it literally regenerates every fixture CONTEXT artifact's `structured` object with `decisions` appended after `sections`, which requires adding a trailing comma to the existing `"sections": { ... }` closing brace — a genuine line modification, not a pure addition. `git diff -- test/__golden__` showed 18 removed lines, failing the task's own `GOLDEN-ADDITIVE` gate (`grep -c '^-[^-]' ... -eq 0`).
- **Fix:** Reordered to `{ decisions: parseDecisionEntries(sections.decisions), sections }` — `decisions` now serializes first, so `sections` and its full nested content stay byte-identical and unmoved; only new lines are inserted above them.
- **Files modified:** `src/planning-repo/handlers/context.ts`
- **Verification:** `git diff -- test/__golden__` shows 0 removed lines across `dense.json`/`sparse-started.json`; `grep -c "decisions: parseDecisionEntries(sections.decisions)"` still matches the required acceptance-criteria substring.
- **Committed in:** `40724a2` (part of Task 1's single commit — caught before commit, not a separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/gate-preserving reorder).
**Impact on plan:** None on behavior or scope; purely an implementation-detail reorder to satisfy the plan's own explicitly-stated acceptance gate.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

`D-XX`/`WR-XX` mentions resolve end to end (phase-local-first, corpus-unique fallback, preview-first,
plain text on ambiguity/absence) with zero changes to `reference-preview.tsx`. Plans 05-04 through
05-06 build the remaining per-type view manifests on top of the same `SECTION_PROJECTIONS` and view
registry seam Plan 05-01 established; this plan added a sibling `SECTION_PROJECTIONS.review` entry
without touching the composer, so no restructuring is expected to be needed downstream. Ready for
05-04.

---
*Phase: 05-per-type-document-views*
*Completed: 2026-09-20*

## Self-Check: PASSED

All modified files verified present with expected content on disk; both task commits (`40724a2`,
`2aeb803`) verified present in `git log`.
