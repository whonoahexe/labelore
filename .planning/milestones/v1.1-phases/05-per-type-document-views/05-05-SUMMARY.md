---
phase: 05-per-type-document-views
plan: 05
subsystem: ui
tags: [react, view-registry, verification, plan-view, fallback-view, class-vocabulary]

requires:
  - phase: 05-per-type-document-views
    provides: "05-01's client-side view registry (composeView/outlineEntriesOf/resolveView), 05-02's design-language doc and class-vocabulary test, 05-04's ViewReader/artifact-page.tsx layout the outline now shares"
provides:
  - "The `verification` manifest — human-verification checks lead a VERIFICATION report, everything else follows (VIEW-03)"
  - "The `plan` manifest — a task-structure index (ordinal, label, Gates chip) ahead of the plan body (VIEW-04)"
  - "`fallback.ts` — the VIEW-06 synthesized structural-read manifest for any artifact kind with no registered view, plus the `Unrecognized type` marker on the page"
  - "`resolveViewFor` — the single dispatch path `ArtifactPage` now calls, registered-or-fallback"
  - "`src/web/components/metadata-panel.tsx` — `ValueView`/`MetadataPanel` extracted so any future block can reuse them"
  - "`src/web/views/facts.ts` — the reusable `fact-list` block (`selectFacts`/`factsBlock`)"
affects: [05-06]

actuals:
  tokens: 12474
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Fallback manifest pattern: an unregistered `artifact.kind` still gets a real `ViewManifest` (VIEW-06's structural read), never a null dispatch branch — `ArtifactPage` has exactly one render path for recognized and unrecognized kinds alike"
    - "Reusable fact-list block (`factsBlock`/`selectFacts`): any manifest can promote a fixed, ordered subset of frontmatter keys as a labeled dt/dd list with per-key D-06 omission, without a bespoke block component"

key-files:
  created:
    - src/web/components/metadata-panel.tsx
    - src/web/views/facts.ts
    - src/web/views/plan-task-index.ts
    - src/web/views/fallback.ts
    - test/web/facts.test.ts
    - test/web/plan-task-index.test.ts
    - test/web/fallback.test.ts
  modified:
    - src/rendering/frontmatter-views.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/blocks.tsx
    - src/web/views/document-sections.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - test/web/view-compose.test.ts
    - test/web/view-page-contract.test.ts
    - test/web/degradation-ui-contract.test.ts

key-decisions:
  - "VIEW-04's task index keeps depth<=2 plan segments plus any gated segment at any depth — a task's own name/files/action children (depth 3) would swamp the index, but a gated checkpoint buried at depth 3 must still surface for gating completeness (UI-SPEC §5)"
  - "resolveView(kind) stays registry-only (returns {manifest, recognized}, manifest null when unregistered) for the 05-06 completeness test; resolveViewFor(kind, input) is the one function pages actually call, folding in fallback.ts's synthesized manifest so there is exactly one dispatch path"
  - "VIEW-06's fallback lead sentence and the below-header notice both carry the same case-(a)/case-(b) copy, but independently: the manifest's `lead` renders as the header's one-sentence blurb (kind pre-substituted into plain text), while `unrecognizedNotice()` keeps a literal `{kind}` placeholder so the page can embed it inside a real `<strong>` in the neutral notice aside"
  - "test/web/degradation-ui-contract.test.ts's blanket 'no static data-tone attribute' assertion was scoped to the destructive/warning tones it actually protects (the computed artifactWarningTone() mapping) — the new quiet Unrecognized-type chip is a genuine constant unrelated to that derivation and has nothing to compute"

requirements-completed: [VIEW-03, VIEW-04, VIEW-06]

coverage:
  - id: D1
    description: "A VERIFICATION report leads with a 'Needs human verification' Check/Expected/Why-a-person list, silently omitting the section when human_verification is absent, empty, or a non-array value; the fact-list block it introduces is reusable by any later manifest"
    requirement: VIEW-03
    verification:
      - kind: unit
        ref: "test/web/facts.test.ts"
        status: pass
      - kind: unit
        ref: "test/web/class-vocabulary.test.ts"
        status: pass
      - kind: unit
        ref: "test/web/empty-state-contract.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A PLAN opened through the artifact route shows a task-structure index (ordinal, title, Gates chip only on gated rows) ahead of a collapsed plan body, never capped and never truncating"
    requirement: VIEW-04
    verification:
      - kind: unit
        ref: "test/web/plan-task-index.test.ts"
        status: pass
      - kind: unit
        ref: "test/web/document-sections.test.ts"
        status: pass
      - kind: unit
        ref: "test/token-guard.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Any artifact with no registered view opens with structure inferred from its shape (nested frontmatter, then headed sections, then the full document with no toggle), a quiet 'Unrecognized type' chip, and honest case-(a)/case-(b) notice copy — never presented as understood, never presented as broken"
    requirement: VIEW-06
    verification:
      - kind: unit
        ref: "test/web/fallback.test.ts"
        status: pass
      - kind: unit
        ref: "test/web/view-page-contract.test.ts"
        status: pass
      - kind: integration
        ref: "live API check against a running server: 04-portability-degradation-hardening/COVERAGE.md resolves kind 'unknown', .planning/WINDOWS.md resolves kind 'windows'"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real VERIFICATION with checks, a real PLAN, and a real phase COVERAGE.md read as one coherent application in light and dark; the Unrecognized type chip reads as neutral, never as an error (must_haves backstop statement)"
    verification: []
    human_judgment: true
    rationale: "Perceived visual neutrality and cross-theme coherence are judgment calls no automated test asserts; this is the backstop UAT check named in the plan's must_haves."

duration: 235min
completed: 2026-09-21
status: complete
---

# Phase 5 Plan 05: Per-Type Document Views — VERIFICATION, PLAN, and Unrecognized-Type Fallback Summary

VERIFICATION reports now lead with what a human still has to check; PLAN documents show their
task structure with a Gates chip only where a section actually gates; and any artifact kind with
no registered view still opens with structure inferred from its own shape, honestly marked
unrecognized rather than silently treated as understood.

## Performance

- **Duration:** 235 min (3h 55m) — this figure spans a provider rate-limit interruption after
  Task 1; see "Issues Encountered" below for the actual work breakdown.
- **Started:** 2026-09-20T16:17:03Z
- **Completed:** 2026-09-20T20:12:41Z
- **Tasks:** 3 completed
- **Files modified:** 16

## Accomplishments

- VIEW-03: the `verification` manifest promotes `human_verification[]` as a leading Check /
  Expected / Why-a-person list, then a Verdict fact-list, then the existing prose sections —
  field-level and whole-section D-06 omission both verified against the repo's own two real
  shapes (`resolved` string vs. a real array).
- VIEW-04: the `plan` manifest promotes a task-structure index built by walking the rendered
  plan's `data-plan-ordinal` DOM out-of-band (`extractPlanSegments`), then `selectPlanIndexRows`
  keeps depth<=2 rows plus any gated row at any depth — a `Gates` chip appears only where a
  section actually gates, and the index is never capped.
- VIEW-06: an artifact kind with no registered manifest (`fallback.ts`'s `fallbackManifest`) still
  gets a real structural read — nested frontmatter promoted through the existing fact-list block,
  then every headed `##` section, or the full document with no toggle when neither exists — behind
  a single `resolveViewFor` dispatch path and a quiet, never-alarming `Unrecognized type` chip.

## Task Commits

Each task was committed atomically:

1. **Task 1: VERIFICATION view — human checks first (VIEW-03), plus the reusable fact-list block** — `f5cd965` (feat)
2. **Task 2: PLAN view — task-structure index with gating (VIEW-04)** — `79b5947` (feat)
3. **Task 3: VIEW-06 — speculative structural fallback, visibly marked unrecognized** — `e63bd69` (feat)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `src/web/components/metadata-panel.tsx` — `ValueView`/`MetadataPanel`, moved out of artifact-page.tsx so any block can reuse them
- `src/rendering/frontmatter-views.ts` — exports `toFrontmatterValueView` (the former private `recursiveValue`) and `humanizeKey`
- `src/web/views/facts.ts` — `selectFacts`/`factsBlock`, the reusable dt/dd fact-list block
- `src/web/views/plan-task-index.ts` — `selectPlanIndexRows`/`planTaskIndexBlock` for VIEW-04
- `src/web/views/document-sections.ts` — `extractPlanSegments`, the DOM adapter reading `data-plan-*` attributes off rendered plan HTML
- `src/web/views/fallback.ts` — `fallbackManifest`/`unrecognizedNotice`/`hasNestedFrontmatter`/`UNRECOGNIZED_KIND` for VIEW-06
- `src/web/views/manifests.ts` — `verification` and `plan` manifests; `resolveView` now returns `{ manifest, recognized }`; new `resolveViewFor`
- `src/web/views/blocks.tsx` — `FactList`, `VerificationChecks`, `PlanTaskIndex` block components
- `src/web/pages/artifact-page.tsx` — builds one `ViewInput`, dispatches through `resolveViewFor`, renders the quiet Unrecognized-type chip and notice, populates `planSegments`
- `src/web/styles/globals.css` — `.view-verification-check`, `.view-plan-task-index*`, `.view-unrecognized-notice`
- `test/web/facts.test.ts`, `test/web/plan-task-index.test.ts`, `test/web/fallback.test.ts` — new pure-module unit tests
- `test/web/view-compose.test.ts`, `test/web/view-page-contract.test.ts` — extended for the new `resolveView`/`resolveViewFor` shape and the VIEW-06 marker contract
- `test/web/degradation-ui-contract.test.ts` — scoped its static-data-tone invariant to the tones it actually protects (see Deviations)

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `test/web/degradation-ui-contract.test.ts`'s blanket "no static data-tone" assertion conflicted with the plan's own literal `data-tone="quiet"` requirement**
- **Found during:** Task 3
- **Issue:** A pre-existing D-12 contract test asserted `artifact-page.tsx` never contains a statically-quoted `data-tone="..."` attribute anywhere in the file, and pinned the count of expression-valued `data-tone={...}` occurrences at exactly 2. VIEW-06's acceptance criteria explicitly requires the literal substring `data-tone="quiet"` on the new Unrecognized-type chip. The two requirements are in direct tension: `npm test` fails if the chip is static; the acceptance grep fails if it is expression-valued.
- **Fix:** Kept the chip's tone as the plain, always-constant literal `"quiet"` (matching the acceptance criteria and UI-SPEC §8 verbatim) and narrowed the pre-existing test's regex from `/data-tone="[^"]*"/` to `/data-tone="(?:destructive|warning)"/`. The invariant this test protects — that the *computed* Warning/Unreadable tone is never hardcoded, bypassing `artifactWarningTone()` — is fully preserved; the new quiet chip is unrelated to that derivation and has nothing to compute.
- **Files modified:** `test/web/degradation-ui-contract.test.ts`
- **Verification:** `npm test` — all 63 test files, 935 tests pass, including both the narrowed D-12 test and the VIEW-06 acceptance grep for `data-tone="quiet"`.
- **Committed in:** `e63bd69` (part of Task 3's commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 — pre-existing test invariant narrowed to accommodate new, legitimate, unrelated functionality).
**Impact on plan:** None on delivered behavior; the fix is confined to test scope and preserves the original test's actual protection.

## Issues Encountered

Execution of this plan was interrupted by a provider rate limit (HTTP 429) after Task 1 completed
and committed (`f5cd965`). A continuation executor resumed from the uncommitted Task 2 working-tree
state left behind (`src/web/views/plan-task-index.ts` and four other partially-edited files),
reviewed it against the plan's Task 2 action and acceptance criteria, found it substantively
correct and complete except for `artifact-page.tsx`'s `planSegments` wiring and the missing CSS/test
file, finished those, then executed Task 3 from scratch. The 235-minute duration figure spans the
gap while the interrupted session was down; the actual executor work across both sessions was
comfortably within the plan's `estimate.tasks: 3` scope.

## User Setup Required

None - no external service configuration required (no `user_setup` in this plan's frontmatter).

## Next Phase Readiness

All three named-view/fallback deliverables for this phase (VIEW-03, VIEW-04, VIEW-06) are complete
and committed. `resolveView`'s registry-only shape is preserved specifically for 05-06's registry
completeness test. Ready for 05-06.

---
*Phase: 05-per-type-document-views*
*Completed: 2026-09-21*

## Self-Check: PASSED

All key created files verified present on disk (metadata-panel.tsx, facts.ts, plan-task-index.ts,
fallback.ts, and their tests, plus this SUMMARY.md); all three task commits (`f5cd965`, `79b5947`,
`e63bd69`) verified present in git history.
