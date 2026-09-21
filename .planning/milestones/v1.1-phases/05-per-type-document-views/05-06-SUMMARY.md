---
phase: 05-per-type-document-views
plan: 06
subsystem: ui
tags: [react, view-registry, vitest, class-vocabulary, context-handler, markdown-rendering]

requires:
  - phase: 05-per-type-document-views
    provides: "05-01's registry seam (composeView/outlineEntriesOf/resolveView, VIEW_KINDS), 05-02's design-language doc and class-vocabulary test, 05-03's decision/warning mention resolution, 05-05's fact-list/plan-task-index blocks and resolveViewFor/fallback.ts"
provides:
  - "The remaining 15 view manifests (summary, review, milestone-audit, research, patterns, ui-spec, uat, validation, security, ui-review, coverage, learnings, context, review-fix, findings) — all 18 VIEW_KINDS now registered"
  - "test/web/view-registry.test.ts — bidirectional VIEW_KINDS <-> VIEW_MANIFESTS completeness, per-kind shape assertions, resolveView().recognized checks, verbatim lead-copy pins"
  - "The UI-06 conformance sweep: accent reservation, copy contract, single-header, and registry-only-dispatch assertions in test/web/view-page-contract.test.ts"
  - "A fix to src/planning-repo/handlers/context.ts closing a real CONTEXT.md rendering bug this plan's own must-have truth surfaced (see Deviations)"
affects: []

actuals:
  tokens: 10001
  tasks: 2
  commits: 2
  plan_head_before: 6c1762ef3f77876618b9c0c2a925c1a8de54dea5

tech-stack:
  added: []
  patterns:
    - "Registry-completeness-by-construction: VIEW_MANIFESTS keys and VIEW_KINDS are asserted equal, both directions, via a single sorted-keys toEqual — a kind added to either list without the matching manifest/registration fails the suite immediately, closing VIEW-05's completeness gap for good."
    - "Text-scan conformance idiom extended to per-view accent/copy/dispatch invariants: readFile + regex over src/web/views/*.tsx and artifact-page.tsx, no AST tooling, matching the existing class-vocabulary/outline-contract/degradation-ui-contract style."

key-files:
  created:
    - test/web/view-registry.test.ts
  modified:
    - src/web/views/manifests.ts
    - test/web/view-page-contract.test.ts
    - src/planning-repo/handlers/context.ts
    - test/__golden__/dense.json
    - test/__golden__/sparse-started.json

key-decisions:
  - "Section-heading regex matchers are anchored, case-insensitive RegExps copied from the plan's own corpus-measured heading list (e.g. /^summary$/i, /^don.t hand-roll/i) rather than loosely matching substrings — this keeps a manifest from accidentally promoting an unrelated section that happens to share a word."
  - "The `coverage` manifest is registered per VIEW-05's completeness requirement even though no handler in this codebase currently emits artifact.kind === 'coverage' (RESEARCH.md's own survey calls COVERAGE.md structurally degenerate; the one real COVERAGE.md in this corpus has no phase-number filename prefix and resolves to kind 'unknown', hitting the VIEW-06 fallback instead, exactly as this plan's own human-check script (E8) expects) — the manifest exists so the registry is complete against VIEW_KINDS regardless of whether the wire currently produces that kind for any file in this corpus."
  - "Fixed context.ts's body construction (see Deviations) rather than reworking the context manifest's heading matchers — the matchers were already correct against the plan's own corpus-measured heading list; the real defect was that four of CONTEXT.md's six `## ` headings never became real `<h2>` DOM nodes for splitRenderedDocument to find, because the four tag names with no underscore (domain/decisions/specifics/deferred) are valid CommonMark HTML tag names and swallow an immediately-following heading line into an HTML block with no blank line to close it."

requirements-completed: [VIEW-05, UI-06]

coverage:
  - id: D1
    description: "All 18 VIEW_KINDS members (the 16 UI-SPEC kinds plus review-fix and findings) have a registered VIEW_MANIFESTS entry with a UI-SPEC-verbatim lead and a non-empty promote list; a registry-completeness test enumerates VIEW_KINDS bidirectionally so a kind added to either list without the other fails the suite"
    requirement: VIEW-05
    verification:
      - kind: unit
        ref: "test/web/view-registry.test.ts"
        status: pass
      - kind: unit
        ref: "test/web/view-compose.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "The conformance sweep: no data-tone=\"active\" chip outside Chosen/Gates, no destructive/warning tone in any view file, View/Source + remainder + Unrecognized-type copy present at their real source sites, every document page renders through the single ArtifactHeader with no forked breadcrumbs/heading chrome in a view, and artifact.kind branching in artifact-page.tsx stays at or below 2 occurrences (registry-only dispatch)"
    requirement: UI-06
    verification:
      - kind: unit
        ref: "test/web/view-page-contract.test.ts"
        status: pass
      - kind: unit
        ref: "test/web/class-vocabulary.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every manifest composes real promoted blocks (not an empty promote-miss) against real corpus documents of its kind — proven by replaying resolveViewFor/composeView against live /api/documents responses for 05-RESEARCH.md, 05-CONTEXT.md, 05-DISCUSSION-LOG.md, 05-02-SUMMARY.md, 01-VERIFICATION.md, 04-VERIFICATION.md, 01-01-PLAN.md, 01-REVIEW.md, 01-REVIEW-FIX.md, 01-SECURITY.md, 05-PATTERNS.md, 04-UI-SPEC.md, 04-UAT.md, 04-UI-REVIEW.md, v1.0-MILESTONE-AUDIT.md and 260901-ten-FINDINGS.md, plus confirming COVERAGE.md/WINDOWS.md correctly fall through to the VIEW-06 fallback and that WR-01/D-01 reference previews resolve (BACK-02)"
    requirement: VIEW-05
    verification:
      - kind: integration
        ref: "ad-hoc script against a live dev server on :4199, replaying resolveViewFor+composeView over 16 real corpus documents fetched through /api/documents (see Human verification below)"
        status: pass
    human_judgment: true
    rationale: "This agent has no browser/screenshot tool available in its toolset, so the integration check above proves the data path structurally (real heading text reaches the real regex matchers and produces the expected composed blocks) but does not confirm actual pixel rendering. A human should do a quick visual pass per the checklist below before treating the phase's UAT as closed."
  - id: D4
    description: "Moving between a document view and the dashboard, roadmap, traceability and search in light and dark reads as one application — same section headings, status chips, empty states and page intros — checked on at least six real artifacts of different kinds (must_haves backstop statement)"
    verification: []
    human_judgment: true
    rationale: "Explicit backstop UAT check named in the plan's must_haves — cross-theme visual coherence is a judgment call no automated test asserts, and no browser tool was available to this agent to substitute a screenshot-based check."

duration: 20min
completed: 2026-09-20
status: complete
---

# Phase 5 Plan 06: Registry Completeness, Conformance Sweep, and a CONTEXT.md Rendering Fix Summary

All 18 known artifact kinds now resolve to a manifest with a completeness test pinning that
permanently, the phase's design-language conventions are re-asserted end to end by four new
conformance cases, and a real CommonMark HTML-block bug that silently starved the `context`
manifest of its own headings on this repo's actual CONTEXT.md files is fixed at the source.

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-20T20:14:38Z
- **Completed:** 2026-09-20T20:30:47Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- VIEW-05: the 15 remaining manifests (`summary`, `review`, `milestone-audit`, `research`,
  `patterns`, `ui-spec`, `uat`, `validation`, `security`, `ui-review`, `coverage`, `learnings`,
  `context`, `review-fix`, `findings`) are registered in `VIEW_MANIFESTS`, completing all 18
  `VIEW_KINDS`; `test/web/view-registry.test.ts` pins bidirectional completeness so a kind added
  to either list without the matching entry fails the suite immediately.
- UI-06: `test/web/view-page-contract.test.ts` gained four new conformance cases (accent
  reservation, copy contract, single-header, registry-only dispatch) re-asserting the phase's own
  design-language conventions across the completed registry.
- Found and fixed a real rendering bug in `src/planning-repo/handlers/context.ts`: the four
  pseudo-XML tag names with no underscore (`<domain>`, `<decisions>`, `<specifics>`, `<deferred>`)
  are valid CommonMark HTML tag names, so a standalone opening-tag line immediately followed by a
  `## Heading` line (no blank line between them) opens an HTML block that swallows the heading as
  literal unparsed text — confirmed directly against this repo's own real `05-CONTEXT.md`, where
  `Implementation Decisions`, `Phase Boundary`, `Specific Ideas` and `Deferred Ideas` never became
  real `<h2>` elements before this fix, leaving the `context` manifest with almost nothing to
  promote despite being written correctly against the plan's own corpus-measured heading list.

## Task Commits

Each task was committed atomically:

1. **Task 1: The remaining 15 manifests and the registry completeness test (VIEW-05)** — `cc67e2c` (feat)
2. **Task 2: Conformance sweep and the end-of-phase human check (UI-06)** — `c9a9cb2` (feat)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `src/web/views/manifests.ts` — 15 new manifests, verbatim UI-SPEC lead copy, D-04 promotion order per the plan's own corpus-measured heading tables
- `test/web/view-registry.test.ts` — new: bidirectional `VIEW_KINDS`/`VIEW_MANIFESTS` completeness, per-kind shape assertions, `resolveView().recognized` checks, three verbatim lead-copy pins
- `test/web/view-page-contract.test.ts` — four new conformance cases (accent reservation, copy contract, single header, registry-only dispatch)
- `src/planning-repo/handlers/context.ts` — `stripContextTagLines` blanks the six CONTEXT tag-only lines in the body handed to the markdown renderer (never in the body `extractTag`/`structured.sections` reads)
- `test/__golden__/dense.json`, `test/__golden__/sparse-started.json` — regenerated: `bodyLength`/`bodyHash`/mention `offset` fields for CONTEXT fixtures shift by the removed tag-line characters; no added or removed entries (confirmed via diff)

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CONTEXT.md's `<domain>`/`<decisions>`/`<specifics>`/`<deferred>` wrapper tags swallowed the very next markdown heading**
- **Found during:** Task 2, while performing the end-of-phase human check against this repo's real `05-CONTEXT.md` — the `context` manifest (Task 1) resolved but composed zero blocks against real content, which contradicted must_haves' own explicit CONTEXT.md truth.
- **Issue:** `ContextHandler.parse` (`src/planning-repo/handlers/context.ts`, an earlier-phase file) returns `body: fm.body` — the raw markdown body, tags and all — as the text handed to the markdown-to-HTML render pipeline. CommonMark recognizes a standalone `<tagname>` line as HTML block type 7 whenever `tagname` is a valid HTML tag name (letters/digits/hyphens only). Four of the six CONTEXT tags (`domain`, `decisions`, `specifics`, `deferred`) qualify; the other two (`canonical_refs`, `code_context`) don't, because CommonMark tag names don't allow underscores. An HTML block of type 7 continues, swallowing every line as literal unparsed text, until the next blank line — and this repo's real `05-CONTEXT.md` puts its `## Heading` line on the line immediately after the opening tag with no blank line between them, so the heading itself gets swallowed and never becomes a real `<h2>` DOM node. Verified empirically: fetching the real document through a running dev server and inspecting the rendered HTML showed only 2 of 6 `## ` headings (`Canonical References`, `Existing Code Insights` — both preceded by an underscore-bearing tag or already past a blank line) survived as actual `<h2>` elements; `Implementation Decisions`, `Phase Boundary`, `Specific Ideas` and `Deferred Ideas` appeared as bare literal text.
- **Fix:** Added `stripContextTagLines`, which blanks (replaces with an empty line, never removes the line entirely) any line that is exactly one of the six CONTEXT tag open/close markers, applied only to the `body` returned for rendering — `structured.sections`'s own `extractTag` calls still run against the untouched `fm.body` beforehand, so tag-content extraction is unaffected.
- **Files modified:** `src/planning-repo/handlers/context.ts`, `test/__golden__/dense.json`, `test/__golden__/sparse-started.json` (offset/length regeneration only — see verification below)
- **Verification:** Re-fetched `05-CONTEXT.md` through the running dev server after the fix — all 6 headings now render as real `<h2>` elements, and replaying `resolveViewFor`/`composeView` against the live response now composes `Implementation Decisions`, `Phase Boundary`, `Specific Ideas`, `Deferred Ideas` and `Existing Code Insights` in that order, matching the manifest's declared D-04 promotion order and the must-have truth naming `Implementation Decisions` first. `npm test` (1071 tests, 64 files), `npm run typecheck`, `npm run lint` all pass; golden-file diff confirmed to contain only `bodyLength`/`bodyHash`/mention-`offset` value shifts on CONTEXT-kind fixtures, no added or removed entries.
- **Committed in:** `c9a9cb2` (part of Task 2's commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 — a pre-existing rendering bug in an earlier-phase file, surfaced by this plan's own must-have corpus proof, fixed at the source rather than worked around in the manifest).
**Impact on plan:** Positive — without this fix, the `context` manifest (written correctly against the plan's own heading spec) would have silently failed VIEW-05's CONTEXT.md truth against the real corpus. No other CONTEXT.md consumer's behavior changes except that the rendered document body view now shows real, addressable section headings where it previously showed the same text unstructured.

## Issues Encountered

None beyond the CONTEXT.md rendering bug documented above.

## Human verification

**Important caveat:** this execution agent has no browser or screenshot tool in its toolset. Every
row below marked "verified (structural)" was proven by replaying the real client-side compose
pipeline (`resolveViewFor` → `composeView` → `outlineEntriesOf`) against live `/api/documents`
responses fetched from a dev server on `:4199` (`node src/server/index.ts . --port 4199`, stopped
afterward — `dist`/`systemctl --user is-active labelore` both confirmed unchanged before and
after), for 16 real documents spanning 13 of the 15 newly-registered kinds plus the three
previously-registered ones. This proves the data path end to end — real heading text reaches the
manifest's real regex matchers and produces the expected composed blocks in the expected order —
but it is **not** a substitute for a human looking at the rendered page in an actual browser in
both themes. The rows below are marked accordingly; a human should still walk this list visually
before treating the phase's UAT as fully closed.

| Surface | What was checked | Light | Dark |
|---|---|---|---|
| E3 — Phase 5 DISCUSSION-LOG | `resolveViewFor` composes one `data:Questions and choices` block against the real `05-DISCUSSION-LOG.md` (15 questions, 6 topics) | verified (structural) — not visually inspected | not visually inspected |
| E4 — v1.0 phase 04 / phase 01 VERIFICATION | 04-VERIFICATION composes `Needs human verification` + `Verdict` + `Goal Achievement`; 01-VERIFICATION (no `human_verification[]`) composes `Verdict` + `Goal Achievement` + `Human Verification` with no empty-state artifact | verified (structural) — not visually inspected | not visually inspected |
| E5 — v1.0 phase 01 plan 01-01 | `plan` manifest composes `Plan facts`; task-structure index behavior (Gates chip placement) is unchanged from Plan 05-05, re-asserted by the existing `plan-task-index.test.ts` | verified (structural, existing test) | not visually inspected |
| E8 — COVERAGE.md / WINDOWS.md unrecognized fallback | Both resolve `recognized: false` through `resolveViewFor`; `04-portability.../COVERAGE.md` resolves `kind: 'unknown'` (case-a copy, filename has no phase-number prefix); `.planning/WINDOWS.md` resolves `kind: 'windows'` (case-b copy naming `windows`) | verified (structural) — not visually inspected | not visually inspected |
| E6/E7 — Phase 5 RESEARCH.md outline at wide/narrow widths | `research` manifest composes 6 blocks (`Summary`, `Standard Stack`, `Architecture Patterns`, `Don't Hand-Roll`, `Common Pitfalls`, `Open Questions (RESOLVED)`) against the real file's real headings; outline/popover CSS behavior is unchanged from Plan 05-04, re-asserted by the existing `outline-contract.test.ts` | verified (structural + existing test) | not visually inspected |
| UI-06 — cross-page "one application" read | `class-vocabulary.test.ts` (153 assertions incl. this plan's 4 new cases) passes over the complete 18-manifest registry with zero new class/tone additions needed; the four reference pages have no diff against the phase's starting commit | verified (automated test) | verified (automated test) |
| BACK-02 — WR-01 / D-01 reference previews | Fetched `01-REVIEW-FIX.md` and confirmed a `warning` reference resolves for `WR-01` (title: "An interior markdown heading inside a ROADMAP.md phase block silently truncates that phase's parsed fields"); fetched `05-01-SUMMARY.md` and confirmed a `decision` reference resolves for `D-01` | verified (structural) — not visually inspected | not visually inspected |
| Spot-check: one REVIEW.md, one CONTEXT.md, one SECURITY.md, one FINDINGS.md | `01-REVIEW.md` composes `Summary`/`Critical Issues`/`Warnings`/`Info`/`Review facts`; `05-CONTEXT.md` composes all 5 targeted sections (post-fix, see Deviations); `01-SECURITY.md` composes `Status`/`Threat Register`/`Trust Boundaries`/`Accepted Risks Log`/`Sign-Off`; `260901-ten-FINDINGS.md` composes `F1`–`F9` + `Regression floor` (a second real FINDINGS.md using a debug-session `A`/`B`/`C` heading convention correctly falls to the D-02 remainder instead, which is the designed degrade path, not a bug) | verified (structural) — not visually inspected | not visually inspected |

## Next Phase Readiness

Phase 5 (Per-Type Document Views) is complete: every one of the 16 known artifact types plus
`review-fix` and `findings` opens into a registered, tested view; the design-language conformance
sweep passes over the complete registry with zero new class/tone additions; and the one rendering
defect this plan's own corpus proof surfaced (CONTEXT.md's swallowed headings) is fixed at the
source rather than worked around. Recommended before closing the phase's UAT: a human visual pass
over the checklist above in both themes, since this execution agent had no browser tool available
to perform that part itself.

---
*Phase: 05-per-type-document-views*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: src/web/views/manifests.ts
- FOUND: test/web/view-registry.test.ts
- FOUND: test/web/view-page-contract.test.ts
- FOUND: src/planning-repo/handlers/context.ts
- FOUND: .planning/phases/05-per-type-document-views/05-06-SUMMARY.md
- FOUND commit: cc67e2c
- FOUND commit: c9a9cb2
