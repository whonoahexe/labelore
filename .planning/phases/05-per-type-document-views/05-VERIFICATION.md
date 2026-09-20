---
phase: 05-per-type-document-views
verified: 2026-09-20T20:46:15Z
status: human_needed
score: 5/7 truths verified
covered_files: [".claude/CLAUDE.md", ".planning/REQUIREMENTS.md", ".planning/phases/05-per-type-document-views/05-01-PLAN.md", ".planning/phases/05-per-type-document-views/05-01-SUMMARY.md", ".planning/phases/05-per-type-document-views/05-02-PLAN.md", ".planning/phases/05-per-type-document-views/05-02-SUMMARY.md", ".planning/phases/05-per-type-document-views/05-03-PLAN.md", ".planning/phases/05-per-type-document-views/05-03-SUMMARY.md", ".planning/phases/05-per-type-document-views/05-04-PLAN.md", ".planning/phases/05-per-type-document-views/05-04-SUMMARY.md", ".planning/phases/05-per-type-document-views/05-05-PLAN.md", ".planning/phases/05-per-type-document-views/05-05-SUMMARY.md", ".planning/phases/05-per-type-document-views/05-06-PLAN.md", ".planning/phases/05-per-type-document-views/05-06-SUMMARY.md", ".planning/phases/05-per-type-document-views/05-REVIEW.md", "docs/design-language.md", "src/domain/model.ts", "src/planning-repo/handlers/context.ts", "src/planning-repo/handlers/generic.ts", "src/planning-repo/handlers/section-projection.ts", "src/planning-repo/mentions.ts", "src/presentation/references.ts", "src/rendering/frontmatter-views.ts", "src/rendering/linkify.ts", "src/web/components/document-outline.tsx", "src/web/components/document-view-toggle.tsx", "src/web/components/metadata-panel.tsx", "src/web/components/use-active-section.ts", "src/web/pages/artifact-page.tsx", "src/web/styles/globals.css", "src/web/views/active-section.ts", "src/web/views/blocks.tsx", "src/web/views/document-sections.ts", "src/web/views/facts.ts", "src/web/views/fallback.ts", "src/web/views/kinds.ts", "src/web/views/manifest.ts", "src/web/views/manifests.ts", "src/web/views/plan-task-index.ts"]
covered_digest: "v1:sha256:13a4e93eef0619db4bc322fa8778cec29006d77eccac2803a6824a56e83af2b7"
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "UI-06 — moving between a document view and the dashboard, roadmap, traceability and search reads as one application in both light and dark (same section headings, status chips, empty states, page intros)"
    test: "Open the dashboard, roadmap, traceability, search pages and at least six real artifacts of different kinds (DISCUSSION-LOG, VERIFICATION with checks, VERIFICATION without checks, PLAN, an unrecognized-kind file, one more of REVIEW/CONTEXT/SECURITY/FINDINGS) in both light and dark themes"
    expected: "Eyebrows, section headings, status chips (including the quiet Unrecognized-type chip), empty states, notices and page intros read as one visual system — no view looks like a foreign surface, the Unrecognized-type chip reads as neutral rather than an error"
    why_human: "This is a pixel/perceptual judgment; the class-vocabulary allowlist test only proves class names and tone values are in the documented vocabulary, not that the resulting rendering actually looks coherent in a real browser in both themes. No Playwright/e2e harness exists in this repo (deliberate, documented convention)."
  - truth: "READ-07 — the table of contents stays legible at every viewport width and tracks where the reader is as they scroll"
    test: "Scroll a real long document (e.g. RESEARCH.md) at a wide viewport (~1200px) and confirm the active outline entry changes as section boundaries are crossed; resize to a narrow viewport (~600px) and confirm the sticky trigger stays pinned under the header, its label updates with scroll position, the popover opens/closes correctly, and Escape/Tab/Enter work with keyboard only"
    expected: "Exactly one outline entry is active at a time and tracks scroll position at 1200px; below 58rem the trigger is pinned, its label matches the current section, and the popover is fully keyboard-operable"
    why_human: "pickActiveEntry (the pure selection logic) is unit-tested, and the presence of IntersectionObserver/Popover wiring is confirmed by text-scan contracts, but no test drives a real or mocked IntersectionObserver through actual scroll events, and keyboard-only popover operability is inherently an interaction/perceptual claim. The plan's own must_haves mark this a `verification: backstop` truth."
human_verification:
  - test: "Open /milestones/m~v1.1/.../05-DISCUSSION-LOG.md and a real REVIEW.md, toggle View/Source, in both light and dark themes"
    expected: "View mode renders questions+chips as one application with the dashboard; Source shows the full document; toggling never changes the URL"
    why_human: "Plan 05-01's must_haves backstop truth — visual/cross-theme rendering with no browser test harness available"
  - test: "At ~1200px and ~600px, in both light and dark, scroll a real RESEARCH.md and operate the narrow trigger/popover with keyboard only (Tab to focus, Enter to open, Escape to close and return focus)"
    expected: "Active entry tracks scroll at wide width; trigger stays pinned and its label updates at narrow width; popover is fully keyboard-operable"
    why_human: "Plan 05-04's must_haves backstop truth, harvested from its `<human-check>` block — perceptual/interaction claim no unit test can assert"
  - test: "Open a real VERIFICATION with checks (v1.0 phase 04), a real PLAN, and a real unrecognized-kind artifact (v1.0 phase 04 COVERAGE.md) in both light and dark"
    expected: "All three read as one coherent application with the dashboard; the Unrecognized-type chip reads as neutral, never as an error"
    why_human: "Plan 05-05's must_haves backstop truth — visual neutrality is a judgment call"
  - test: "Walk the full end-of-phase checklist from 05-06-PLAN.md's `<human-check>` block: DISCUSSION-LOG, VERIFICATION (both shapes), a PLAN via the tree, COVERAGE.md and WINDOWS.md fallbacks, RESEARCH.md outline at both widths, cross-page navigation (dashboard/roadmap/traceability/search), and WR-01/D-01 reference previews — all in both light and dark, at least six artifact kinds"
    expected: "Every surface reads as the same application; wide tables/code/Mermaid inside promoted sections still render correctly"
    why_human: "Plan 05-06's must_haves backstop truth — this agent's execution already proved the data path structurally (live API replay against 16 real corpus documents) but had no browser tool to confirm actual pixel rendering"
---

# Phase 5: Per-Type Document Views Verification Report

**Phase Goal:** Opening any planning document shows what that document is actually for — a
discussion log reads as questions and choices, a verification as what still needs a human, a plan
as a plan — and every one of them reads as the same application as the dashboard.

**Verified:** 2026-09-20T20:46:15Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | VIEW-02: a discussion log shows, per question, every offered option and the one chosen | ✓ VERIFIED | Live API check against the real `05-DISCUSSION-LOG.md`: `questions: 15`, `topics: 6`, every question has exactly 1 `chosen` option out of its full option list. `test/section-projection.test.ts`, `test/web/view-compose.test.ts` pass. |
| 2 | VIEW-03: a verification report leads with checks still awaiting a human (Check/Expected/Why) | ✓ VERIFIED | `verification` manifest in `src/web/views/manifests.ts:69-86` promotes `humanVerificationBlock()` first, before `Verdict`/`Gaps Summary`/`Goal Achievement`. Live check: `01-VERIFICATION.md` (`human_verification: "resolved"`, a string) omits the section; `04-VERIFICATION.md` (`human_verification`: real 9-item array) carries it. `test/web/facts.test.ts`, `test/web/view-page-contract.test.ts` pass. |
| 3 | VIEW-01/04/05/06: all 16 known types (+`review-fix`/`findings`, 18 total) open into a type-built view; an unregistered kind opens with inferred structure, visibly marked unrecognized | ✓ VERIFIED | `VIEW_KINDS` has 18 entries (`src/web/views/kinds.ts`); `VIEW_MANIFESTS` registers exactly those 18 keys (`src/web/views/manifests.ts`); `test/web/view-registry.test.ts` (132 tests) enforces bidirectional completeness and passes. Live check: `COVERAGE.md` resolves `kind: 'unknown'` and hits `resolveViewFor`'s fallback path (`src/web/views/fallback.ts`), rendering `data-tone="quiet"` `Unrecognized type` chip (`artifact-page.tsx:560`). `plan` manifest promotes a `plan-task-index` block ahead of the body. |
| 4a | UI-04/UI-05: the shared design language is written down and enforced by a test that fails on drift | ✓ VERIFIED | `docs/design-language.md` (406 lines: 40+ shared classes, 7-row Tones table, families, D-09 namespace rule, 6 non-name conventions, 212-name surface appendix). `test/web/class-vocabulary.test.ts` derives its allowlist by parsing the doc (no test-side array) and has a planted mkdtemp positive control proving it actually fails on an invented class (`totally-invented`/`loud`). The four reference pages (`dashboard-page.tsx`, `roadmap-page.tsx`, `traceability-page.tsx`, `search-page.tsx`) have zero diff across the whole phase. |
| 4b | UI-06: moving between a document view and the dashboard/roadmap/traceability/search reads as one application in both light and dark | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | The *enforcement machinery* is verified (class-vocabulary test + 4 new conformance cases in `test/web/view-page-contract.test.ts` — accent reservation, copy contract, single-header, registry-only dispatch — all passing). The actual cross-theme visual *read* is a pixel/perceptual claim no test in this repo exercises (no Playwright/e2e harness). Routed to human verification. |
| 5a | BACK-02: a `D-XX`/`WR-XX` mention in prose is clickable and lands on its source | ✓ VERIFIED | Live check against real `01-REVIEW-FIX.md`: response contains 10 `document-reference` buttons and a resolved `WR-01` mention. `test/rendering/references.test.ts` (BACK-02 describe block, 7 cases), `test/mentions.test.ts` pass. `ID_PATTERNS` has 5 schemes with `warning` before `requirement`. |
| 5b | READ-07: the table of contents stays legible at every viewport width and tracks where the reader is | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `pickActiveEntry` (pure selection logic) is unit-tested (`test/web/active-section.test.ts`, adjacency/empty/ordering cases). CSS/markup presence is confirmed by text-scan contracts (`test/web/outline-contract.test.ts`) — the old in-flow `@media` rule is gone, a `document-outline-trigger` + `@base-ui/react` Popover exist. No test drives a real/mocked `IntersectionObserver` through actual scroll events, and keyboard-only popover operability is untested. The plan's own must_haves name this a `verification: backstop` truth. Routed to human verification. |

**Score:** 5/7 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/design-language.md` | Written design language, UI-04 | ✓ VERIFIED | 406 lines, all required sections present |
| `test/web/class-vocabulary.test.ts` | Allowlist test, UI-05 | ✓ VERIFIED | 404 lines, doc-derived allowlist, positive control |
| `src/web/views/kinds.ts` | `VIEW_KINDS` registry key space | ✓ VERIFIED | 18 kinds, `humanizeKind`, `VIEW_LOCAL_PREFIXES` |
| `src/web/views/manifest.ts` | `composeView`/`outlineEntriesOf` composer | ✓ VERIFIED | 150 lines, used by every manifest |
| `src/web/views/manifests.ts` | `VIEW_MANIFESTS`, `resolveView`/`resolveViewFor` | ✓ VERIFIED | 307 lines, 18 manifests, dispatch confirmed live |
| `src/web/views/document-sections.ts` | Section grouping / plan-segment DOM adapter | ✓ VERIFIED | 189 lines, wired from `extractPlanSegments` |
| `src/web/views/blocks.tsx` | Block components incl. `VerificationChecks`, `PlanTaskIndex` | ✓ VERIFIED | 179 lines, `data-tone="active"` chips confirmed |
| `src/web/components/document-view-toggle.tsx` | View/Source toggle | ✓ VERIFIED | 35 lines |
| `src/web/components/document-outline.tsx` | Shared outline + narrow trigger + Popover | ✓ VERIFIED | 79 lines, `Popover.Root/Trigger/Portal/Positioner/Popup` present |
| `src/web/views/facts.ts` | Reusable fact-list block | ✓ VERIFIED | 47 lines |
| `src/web/views/plan-task-index.ts` | VIEW-04 task index selector | ✓ VERIFIED | 50 lines |
| `src/web/views/fallback.ts` | VIEW-06 synthesized fallback manifest | ✓ VERIFIED (with a noted defect — see Anti-Patterns) | 71 lines |
| `src/web/views/active-section.ts` | Pure `pickActiveEntry` + constants | ✓ VERIFIED | 32 lines |
| `src/web/components/use-active-section.ts` | `IntersectionObserver` hook | ✓ VERIFIED | 54 lines |
| `src/planning-repo/handlers/section-projection.ts` | Section-projection extractors (discussion log, decisions, warnings) | ✓ VERIFIED | 190 lines |
| `test/web/view-registry.test.ts` | Registry completeness test, VIEW-05 | ✓ VERIFIED | 99 lines, 132 tests passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `generic.ts` handler | `section-projection.ts` | `projectSections(ref.kind, fm.body)` | ✓ WIRED | Confirmed in source and via live discussion-log check |
| `artifact-page.tsx` | `manifests.ts` | `resolveViewFor(viewInput.kind, viewInput)` | ✓ WIRED | Single dispatch path confirmed (`test/web/view-page-contract.test.ts`'s "registry-only dispatch" case) |
| `manifests.ts` (verification manifest) | `human_verification[]` on the wire | Data-block select guards `Array.isArray && length > 0` | ✓ WIRED | Live check: string value omits section, real array populates it |
| `document-sections.ts` `extractPlanSegments` | `plan-task-index.ts` `selectPlanIndexRows` | DOM read of `data-plan-ordinal`/`data-plan-gate` | ✓ WIRED | `test/web/plan-task-index.test.ts` passes |
| `manifests.ts` `resolveView` | `fallback.ts` `fallbackManifest` | Unregistered kind → synthesized manifest | ✓ WIRED | Live check: `COVERAGE.md` (`kind: 'unknown'`) resolves through the fallback path |
| `linkify.ts` `REFERENCE_TOKEN` | `presentation/references.ts` `resolvePresentationReference` | `D-\d+`/`WR-\d+` token capture + phase-local-then-corpus resolution | ✓ WIRED | Live check against `01-REVIEW-FIX.md`: `WR-01` resolves to a `document-reference` button |
| `use-active-section.ts` | `document-outline.tsx` | `activeId` prop drives `data-active` | ✓ WIRED | Confirmed in source; runtime behavior unverified (see truth 5b) |
| `test/web/class-vocabulary.test.ts` | `docs/design-language.md` | Regex-parsed table rows, no test-side array | ✓ WIRED | Positive-control case proves enforcement is real, not decorative |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Discussion-log view composes 15 questions/6 topics, 1 chosen each | Live `GET /api/artifacts/...05-DISCUSSION-LOG.md` on `:4199` | `questions:15 topics:6`, chosen counts `1,1,1,...,1` | ✓ PASS |
| Verification manifest omits section for non-array `human_verification` | Live `GET` on `01-VERIFICATION.md` | `human_verification: "resolved"` (string) | ✓ PASS |
| Verification manifest carries real checks | Live `GET` on `04-VERIFICATION.md` | Array of 9 real check objects | ✓ PASS |
| Unregistered kind falls to VIEW-06 fallback | Live `GET` on v1.0 phase 01 `COVERAGE.md` | `kind: 'unknown'`, tree marks `unknownKind: true` | ✓ PASS |
| `WR-01`/`D-01` mentions resolve live | Live `GET` on `01-REVIEW-FIX.md` | 10 `document-reference` occurrences, `WR-01` present | ✓ PASS |
| All 18 manifests registered, bidirectionally complete | `npx vitest run test/web/view-registry.test.ts` | 132/132 passed | ✓ PASS |
| Class-vocabulary enforcement is real (not decorative) | `npx vitest run test/web/class-vocabulary.test.ts` | Passed, incl. planted-fixture positive control | ✓ PASS |
| Full workspace test suite | `npm test` | 1071/1071 passed, 64 files | ✓ PASS |
| Production build | `npm run build` | Clean build, no errors | ✓ PASS |
| Reference pages unmodified across the phase | `git diff --stat` (whole-phase range) on the 4 reference pages | No output — zero diff | ✓ PASS |
| Reading-position/keyboard behavior in a real browser | — | No test drives real/mocked `IntersectionObserver` scroll events or keyboard-only popover use | ? SKIP (routed to human) |
| Cross-theme visual coherence | — | No Playwright/e2e harness in this repo | ? SKIP (routed to human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| VIEW-01 | 05-01 | Each artifact type renders through a type-selected view | ✓ SATISFIED | Registry dispatch, `resolveViewFor` |
| VIEW-02 | 05-01 | Discussion log shows options + chosen per question | ✓ SATISFIED | Live check, truth 1 |
| VIEW-03 | 05-05 | Verification leads with human-needed checks | ✓ SATISFIED | Live check, truth 2 |
| VIEW-04 | 05-05 | Plan shows task structure + gating | ✓ SATISFIED | `plan-task-index.ts`, tests pass |
| VIEW-05 | 05-06 | All 16 known types have a registered view | ✓ SATISFIED | 18/18 manifests, registry test |
| VIEW-06 | 05-05 | Unregistered type renders structurally, marked unrecognized | ✓ SATISFIED | Live check, `fallback.ts` |
| READ-07 | 05-04 | TOC tracks position, legible at every width | ? NEEDS HUMAN | Mechanics unit-tested; perceptual claim unverified (truth 5b) |
| BACK-02 | 05-03 | `D-XX`/`WR-XX` mentions clickable, resolve to source | ✓ SATISFIED | Live check, truth 5a |
| UI-04 | 05-02 | Design language written down | ✓ SATISFIED | `docs/design-language.md` |
| UI-05 | 05-02 | Convention enforced by a test | ✓ SATISFIED | `class-vocabulary.test.ts` + positive control |
| UI-06 | 05-02/05-06 | Every view uses the language; drift fails a check | ✓ SATISFIED (mechanism) / ? NEEDS HUMAN (visual read) | Conformance sweep passes; cross-theme "one application" read unverified (truth 4b) |

No orphaned requirements — all 11 IDs from `.planning/REQUIREMENTS.md` §Phase 5 are claimed by exactly one plan's frontmatter and accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/web/views/fallback.ts` | 56 | `CASE_B_NOTICE.replace('{kind}', kind)` — plain-string `.replace()` treats `$$`/`$&`/`` $` ``/`$'` in `kind` as live substitution patterns, silently corrupting the VIEW-06 fallback lead sentence if a `kind` string ever contains one of those sequences | ⚠️ Warning (from `05-REVIEW.md` WR-01) | Reachable via `MILESTONE_FILE_RE`'s unconstrained `(.+)` document-name capture for an oddly-named `vX.Y-*.md` file — a narrow, non-adversarial-input edge case. Does not affect the sibling `unrecognizedNotice()` (used for the below-header notice), which interpolates safely via `.split()`. No must-have in this phase pins correctness under such input, so this does not block any of the 5 ROADMAP success criteria, but it is a real, reproducible defect worth fixing (one-line: use a replacer function). |
| `src/planning-repo/handlers/context.ts` | 20-21 | Doc-comment says "the six tag names with no underscore" but lists four names, and only four of six tags actually qualify | ℹ️ Info (from `05-REVIEW.md` IN-01) | Documentation-only inaccuracy; code behavior unaffected |
| `src/web/pages/artifact-page.tsx` | 320-334 | `outlineHeadings(shown)` computed twice per render | ℹ️ Info (from `05-REVIEW.md` IN-02) | No correctness bug; minor duplicate work / future-desync risk |

No `TBD`/`FIXME`/`XXX` debt markers found in phase-modified files. No blockers.

### Human Verification Required

4 items — all are the phase's own explicitly-declared `verification: backstop` must-haves (one per plan wave that introduced a visual/perceptual claim), routed here because this repo deliberately has no Playwright/e2e harness. See `human_verification` in the frontmatter for full detail; summarized:

1. **Discussion-log + REVIEW.md View/Source toggle, light and dark** — visual "one application" read (Plan 05-01 backstop)
2. **RESEARCH.md scroll tracking + narrow trigger/popover, 1200px and 600px, keyboard-only, both themes** — perceptual/interaction claim (Plan 05-04 backstop)
3. **VERIFICATION/PLAN/COVERAGE.md fallback reading as one application, both themes, Unrecognized chip reads neutral** — visual judgment (Plan 05-05 backstop)
4. **Full end-of-phase checklist across ≥6 artifact kinds, cross-page navigation, both themes** — visual judgment (Plan 05-06 backstop)

### Gaps Summary

No blocking gaps. All artifacts exist, are substantive, and are wired; all 11 requirement IDs are
satisfied by live, reproducible evidence (registry completeness test, class-vocabulary allowlist
test with a working positive control, and direct API checks against real corpus documents for
VIEW-02, VIEW-03, VIEW-06, and BACK-02). The full test suite (1071/1071, 64 files) and production
build both pass clean, matching the SUMMARY claims.

The phase goal's machinery is real and correctly wired end to end. What remains unverified is
exactly the set of claims the phase's own plans already flagged as visual/perceptual and deferred
to a human pass (`verification: backstop` in must_haves, `human_judgment: true` in every SUMMARY):
cross-theme "reads as one application" and real-browser scroll-position tracking with keyboard-only
popover use. This routes the phase to `human_needed`, not `gaps_found` — nothing failed, four
things were never claimed to be machine-verifiable in the first place.

One code-review warning (`WR-01`, `fallback.ts:56`) is carried forward as a known, narrow, non-blocking
defect — worth a follow-up one-line fix but not gating this phase, since no must-have in this phase's
scope asserts correctness under adversarial `kind` strings.

---

_Verified: 2026-09-20T20:46:15Z_
_Verifier: Claude (gsd-verifier)_
