---
phase: 02-situational-awareness-artifact-reading
plan: 10
subsystem: rendering
tags: [markdown, shiki, rehype, plan-segments, unicode, xss-hardening]

requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: the existing recognized-set-gated segmentPlanBody / renderPlanRange pipeline (plan 02-08) and the sanitize-before-trusted-plugin processor order
provides:
  - Unconditional PLAN wrapper segmentation — every syntactically well-formed wrapper becomes a labelled section regardless of tag-name recognition
  - isRecognizedPlanTag exported predicate — the rendering layer's sole authority for bespoke-vs-generic presentation branching
  - HTML_PASSTHROUGH_TAGS — keeps real HTML (void elements + common phrasing/structural tags) off the segmenter's stack
  - planSectionLabel — Title Case label derivation shared by recognized and unrecognized sections alike
  - data-plan-recognized test-only attribute with zero stylesheet consumers
  - maskInlineCode fix — inline single-backtick code spans no longer misparsed as real PLAN wrappers
  - Syntax highlighting locked to the vitesse-light / vitesse-dark theme pair
affects: [02-11, 02-12, 02-13]

actuals:
  tokens: 5370
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Segmentation-vs-presentation split: segmentPlanBody never consults a recognized-tag set; only the rendering layer (planSectionOpen via isRecognizedPlanTag) branches on recognition."
    - "Length-preserving inline-code masking: replace backtick-span characters with same-length whitespace before regex scanning, so absolute offsets into the original body stay valid for later body.slice() extraction."

key-files:
  created:
    - test/rendering/plan-sections.test.ts
  modified:
    - src/rendering/plan-segments.ts
    - src/rendering/markdown.ts

key-decisions:
  - "Kept HTML_PASSTHROUGH_TAGS as a planner-extension to the UI-SPEC's literal rule, exactly as directed by the plan: HTML's element set is closed and standardized, GSD's wrapper vocabulary is open, so excluding the closed set from the open/close stack is the inverse polarity of the G-01/G-11 defect, not a restatement of it."
  - "Fixed a defect the unconditional-segmentation change surfaced but that the plan did not anticipate: prose mentions of tag-like text inside single-backtick inline code spans (e.g. \"the `<decisions>` block\", `` `test/__golden__/<fixture>.json` `` in the real Phase 1 plan fixture) were previously invisible to the segmenter only because they weren't on the recognized list. Removing that gate meant they would now be misread as real wrapper syntax and produce spurious unclosed-tag warnings. Added maskInlineCode to blank backtick-delimited spans (same-length whitespace, preserving offsets) before tag scanning. This was required to keep the pre-existing regression-floor test (\"renders the real Phase 1 plan... warnings.toEqual([])\") green, per the plan's own instruction that this test must keep passing untouched."
  - "Locked the highlighter theme pair at both call sites (createHighlighter startup array and per-block codeToHast) to vitesse-light/vitesse-dark, leaving defaultColor: false and the --shiki-light/--shiki-dark CSS variable mechanism untouched — only the palette changed, matching the UI-SPEC's G-06 developer decision."

patterns-established:
  - "Recognition-as-presentation-only: any future PLAN wrapper tag GSD's grammar introduces automatically renders as a labelled section with correct markdown nesting; adding it to RECOGNIZED_TAGS only grants it bespoke presentation, never changes whether it segments."

requirements-completed: [READ-04, NAV-04]

coverage:
  - id: D1
    description: "Unrecognised PLAN wrappers (execution_context, read_first, scope_note) render as labelled sections with markdown (lists) intact, matching the UI-SPEC's unconditional-segmentation contract"
    requirement: READ-03
    verification:
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#renders wrappers the recognised set has never registered as labelled sections with markdown intact"
        status: pass
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#renders the exact real GSD PLAN the UAT flagged with no literal wrapper text"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recognition (isRecognizedPlanTag) decides bespoke-vs-generic presentation only; segmentPlanBody itself never consults a recognized-tag set"
    requirement: READ-03
    verification:
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#keeps the segmenter free of any recognised-set consultation"
        status: pass
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#has the rendering layer branch on isRecognizedPlanTag"
        status: pass
    human_judgment: false
  - id: D3
    description: "HTML void elements and common phrasing/structural elements pass through to rehype-raw/rehype-sanitize untouched by the segmenter, producing zero spurious unclosed warnings"
    verification:
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#produces zero renderer warnings mentioning \"unclosed\" for bare HTML void elements"
        status: pass
    human_judgment: false
  - id: D4
    description: "E15 state-coverage rows (empty, error, populated, partial, zero-one-many) and the edge-probe rows this plan owns (adjacency, ordering, encoding — including the NAV-04 identifier-edge case) are each pinned by a committed assertion"
    requirement: NAV-04
    verification:
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts (E15 state coverage + identifier-edge detection describe blocks, 10 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No stylesheet rule targets data-plan-recognized — the generic and bespoke section paths remain visually indistinguishable"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#partial: recognised and unrecognised sections carry no attribute or class any stylesheet rule targets to distinguish them"
        status: pass
    human_judgment: false
  - id: D6
    description: "Highlighted code is produced from the locked vitesse-light/vitesse-dark theme pair in both light and dark output"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "test/rendering/plan-sections.test.ts#loads and emits the vitesse-light / vitesse-dark theme pair, never the rejected github pair"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-30
status: complete
---

# Phase 2 Plan 10: Unconditional PLAN Segmentation and Locked Syntax Theme Summary

**Unrecognised PLAN wrappers now render as labelled sections with intact markdown instead of leaking as literal tag text, and code highlighting is locked to the vitesse-light/vitesse-dark theme pair.**

## Performance

- **Duration:** 40 min
- **Tasks:** 3 completed
- **Files modified:** 2 source files, 1 new test file

## Accomplishments

- `segmentPlanBody` no longer gates on a recognized-tag whitelist — every syntactically well-formed wrapper outside fenced code becomes a segment, closing UAT gaps G-01 (literal tag-text leakage) and G-11 (markdown list destruction inside unrecognised wrappers) at the root cause rather than by whitelist extension.
- `isRecognizedPlanTag` is now the rendering layer's sole authority for bespoke-vs-generic presentation branching; `planSectionLabel` derives a Title Case label (`execution_context` → "Execution Context") shared identically by recognized and unrecognized sections, with a test-only `data-plan-recognized` attribute that no stylesheet rule may ever target.
- `HTML_PASSTHROUGH_TAGS` keeps real HTML (void elements plus common phrasing/structural tags GSD prose authors) off the segmenter's open/close stack, so a bare `<br>` or `<img>` never produces a spurious "unclosed" warning — the deliberate inverse-polarity extension to the UI-SPEC's literal rule that the plan calls for.
- Fixed a real defect the unconditional-segmentation change surfaced: inline single-backtick code spans (e.g. "the `` `<decisions>` `` block") were previously invisible to the segmenter only by accident of not being on the recognized list. `maskInlineCode` blanks backtick-delimited spans with same-length whitespace before tag scanning, preserving absolute offsets, so this prose is never misread as a real wrapper.
- Syntax highlighting theme locked to `vitesse-light`/`vitesse-dark` at both the `createHighlighter` startup call and the per-block `codeToHast` call, superseding the rejected `github-light`/`github-dark` pair (G-06). Dual-theme CSS-variable output mechanism unchanged.
- `test/rendering/plan-sections.test.ts` (16 tests) covers the tracer assertion, the corpus-guarded acceptance test against the real UAT-flagged PLAN.md, the eight E15 state-coverage rows, the edge-probe rows this plan owns (adjacency, ordering, encoding, NAV-04 identifier-edge), and the theme lock.

## Task Commits

1. **Task 1: End-to-end "an unrecognised PLAN wrapper renders as a labelled section" — one path only** - `98e72ae` (feat)
2. **Task 2: E15 state coverage and edge-probe assertions for the generic section shell** - `6e04739` (test)
3. **Task 3: Lock the syntax theme to the pair the contract names** - `7ad3f90` (feat)

**Plan metadata:** committed with this SUMMARY.

## Files Created/Modified

- `src/rendering/plan-segments.ts` — Removed the `RECOGNIZED_TAGS` early-continue gate from `segmentPlanBody`; exported `RECOGNIZED_TAGS` and the new `isRecognizedPlanTag` predicate; added `HTML_PASSTHROUGH_TAGS` and the `maskInlineCode` inline-code-span fix.
- `src/rendering/markdown.ts` — Added exported `planSectionLabel`; `planSectionOpen` now emits `data-plan-recognized` and calls `planSectionLabel` for every segment; locked both Shiki theme call sites to `vitesse-light`/`vitesse-dark`.
- `test/rendering/plan-sections.test.ts` — New file: the Task 1 tracer + corpus-guarded assertions, the Task 2 E15/edge-probe suite, and the Task 3 theme-lock assertion (16 tests total).
- `.planning/REQUIREMENTS.md` — Marked READ-04 and NAV-04 complete (the two requirement IDs from this plan's set not shared with a still-in-progress sibling plan in this wave; READ-01, READ-03, NAV-02, UI-01 remain pending per the shared-ID gate until every declaring plan in the wave finishes).

## Decisions Made

- Kept `HTML_PASSTHROUGH_TAGS` as the planner-specified extension to the UI-SPEC's literal rule (HTML's closed element set denied vs. GSD's open wrapper vocabulary accepted — the inverse polarity of the defect, not a restatement of it).
- Fixed the inline-code-span false-positive defect the change surfaced (Rule 1 — bug), required to keep the pre-existing "renders the real Phase 1 plan... warnings.toEqual([])" regression test green, exactly as the plan's read_first instructed.
- Locked the theme pair at both sites atomically so the highlighter is never asked to load a theme it wasn't given at startup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline single-backtick code spans were misread as real PLAN wrapper tags once the recognized-tag gate was removed**
- **Found during:** Task 1 (running the full verification suite against `test/rendering/markdown.test.ts`)
- **Issue:** The real Phase 1 plan fixture (`01-04-PLAN.md`) contains prose like "D-10 in the `<decisions>` block" and `` `test/__golden__/<fixture>.json` `` inside single backticks. Before this plan, these tag-like substrings were silently skipped because `decisions`/`fixture` weren't on `RECOGNIZED_TAGS`. Removing that gate made the segmenter treat them as real wrapper syntax, producing spurious `<decisions> was not closed before </read_first>` and `<fixture> was not closed before </action>` malformed-segment warnings and breaking the existing zero-warnings assertion.
- **Fix:** Added `maskInlineCode`, which blanks backtick-delimited spans (any matching run length) with same-length whitespace before the tag-scanning regex runs on each line, so absolute character offsets into the unmasked `body` remain correct for all downstream content extraction.
- **Files modified:** `src/rendering/plan-segments.ts`
- **Verification:** `test/rendering/markdown.test.ts` "renders the real Phase 1 plan as ordered semantic sections with nested Markdown" (asserts `warnings` is `[]`) passes; full suite green.
- **Committed in:** `98e72ae` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correctness — without this fix, unconditional segmentation would have introduced a new class of false-positive malformed-wrapper warnings on any real GSD artifact that mentions tag-like syntax in inline code, which is common prose usage. No scope creep: the fix is scoped entirely to `segmentPlanBody`'s tag-scanning pass, the same function and files this plan already modifies.

## Known Stubs

None — no stubs, no placeholder data, no unwired UI introduced by this plan.

## Issues Encountered

None beyond the deviation documented above, which was resolved within Task 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `segmentPlanBody`/`renderPlanRange` now handle arbitrary GSD PLAN wrapper vocabulary generically; sibling plans 02-11 (dashboard/presentation) and 02-12 (stylesheet, including the dense fixture that exercises unrecognised wrappers for the human UAT gate) can build on this without further segmenter changes.
- `src/web/styles/globals.css` was read but not modified by this plan (verified via `git diff --name-only`), leaving it available for plan 02-12 as planned.
- Four requirement IDs from this plan's set (READ-01, READ-03, NAV-02, UI-01) are shared with still-in-progress sibling plans in wave 9 and remain `Pending` in `REQUIREMENTS.md` per the shared-ID gate; they will flip to `Complete` automatically once every plan declaring them has produced a SUMMARY.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-30*

## Self-Check: PASSED

- `test/rendering/plan-sections.test.ts` exists on disk: confirmed.
- `src/rendering/plan-segments.ts` and `src/rendering/markdown.ts` modifications exist on disk: confirmed.
- Commits `98e72ae`, `6e04739`, `7ad3f90` exist in `git log --oneline`: confirmed.
- Full suite (`npm test`): 271/271 passed.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run build`: succeeded.
- `npx vitest run test/presentation`: 51/51 passed, no checkpoint name regressed.
- `git diff --name-only` confirms `src/web/styles/globals.css` untouched by this plan.
