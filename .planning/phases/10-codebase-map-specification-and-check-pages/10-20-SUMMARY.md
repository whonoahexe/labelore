---
phase: 10-codebase-map-specification-and-check-pages
plan: 20
subsystem: eval-review-page
tags: [eval-review, score, verdict, dimensions, remediation, wires, status-meter, sketch-050-B, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-07 made-up EVAL-REVIEW fixtures, 10-08 eval-review manifest, 10-15 sketch 050 winner B, 10-16/10-18/10-19 page shape, StatusMeter
provides:
  - EvalReviewHandler, extractEvalReview and EvalReviewBody (structured.evalReview)
  - composeEvalReview, ComposedEvalReview and the one Map-based word table EVAL_WORD_TABLE
  - the Eval review page (EvalReviewView) with ledger wires, and a `missing` item tone on the shared StatusMeter
affects: [10-23 browser spec]

requirements-completed: [VIEW-12]

key-files:
  created:
    - src/planning-repo/handlers/eval-review-body.ts
    - src/planning-repo/handlers/eval-review.ts
    - src/web/views/eval-review-page.ts
    - src/web/views/eval-review-page-components.tsx
    - test/eval-review-handler.test.ts
    - test/web/eval-review-page.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/components/status-meter.tsx
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/status-meter.test.ts

key-decisions:
  - "Built sketch 050 winner B as chosen: ruled head (score, verdict chip, tally beside the status-meter, the file's sub-scores), a ledger of what the audit found beside the remediation plan with SVG wires, closed bars below"
  - "A step is tied to a row only when it opens with the row's name and a colon (the 10-15 leading-name rule), not the plan's whole-word-anywhere match"
  - "The score is stored as {value, max|null} and shown as '{value} of {max}'; no arithmetic or comparison touches it (a contract test pins this)"

duration: one session
completed: 2026-11-05
actuals:
  tokens: 52000
  tasks: 2
  commits: 4
plan_head_before: 6a067cd508df2919de57ad7ac32eb74bf77d8d60
plan_head_after: edcff0896fd4d99be2827f5efeb77c3a309a8627
---

# Phase 10 Plan 20: Eval review page Summary

**An EVAL-REVIEW opens on sketch 050 B: "64 of 100" and the NEEDS WORK chip first, the tally "3 covered, 1 partial, 1 missing" beside the shared status-meter, the file's own sub-scores, then what the audit found (dimension rows, smaller infrastructure rows showing the file's own word) wired to the remediation step that opens with each row's name, and Critical Gaps and Files Found as closed bars. The score and verdict are shown as written and never recomputed.**

## What was built

- **`handlers/eval-review-body.ts`.** `extractEvalReview` reads the head lines (Audit Date, AI-SPEC Present, Overall Score, Verdict), the Dimension Coverage and Infrastructure Audit tables found by header text, the two score lines, the Remediation Plan as its `###` groups with their steps (indented lines fold into the step above), and the Critical Gaps lines. Caps: 250,000-character body, 100 rows a table, 100 steps, 100 gap lines, 2,000 characters a cell. No regular expression; one pass per section.
- **`handlers/eval-review.ts`.** `EvalReviewHandler` on the `EVAL-REVIEW` token before the generic handler; guarded, so a throw only omits `structured.evalReview`.
- **`eval-review-page.ts`.** The pure composer and `EVAL_WORD_TABLE` (verdict, dimension and infrastructure words as Maps). Rows are targets (dimensions then components); a step's target comes from a one-pass Map of base names (a trailing parenthetical is ignored). Bars are the unclaimed section groups; a section the page could not read stays a bar. Returns `null` when there is no score, no known verdict, no row and no step.
- **`eval-review-page-components.tsx`.** Header override, head, ledger (rows are buttons that open their finding in place; steps select; wires are a measured SVG overlay recomputed on selection and resize and skipped when CSS hides it), bars through the shared `renderHtml`. Author text goes through `ResearchInline`.
- **Shared parts.** `StatusMeter` items may now be `missing`; `phase-10-eval-review` CSS block; design-language tone rows (all four tones), page bullet and Language sentence "the file's own word is always shown beside its tone".

## Deviations from Plan

1. **[User decision 050 B + 10-15 open item] Leading-name tag rule.** The plan says a step names a dimension when it appears "as a whole-word, case-insensitive run" anywhere. The user's decision and the sketch say a step is tied only when it opens with the name and a colon (bold or not, any case, parenthetical ignored). Built the latter; "Configure a tracing tool" gets no tag.
2. **[Plan defect] 04's tally.** The plan's test line says "2 covered, 2 partial, 1 missing"; the fixture has three COVERED, one PARTIAL and one MISSING rows, so the page and tests say "3 covered, 1 partial, 1 missing" (as the sketch README states).
3. **[Plan defect] 04's infrastructure words.** The plan lists "Installed, Configured, Not found and Partial"; the fixture's words are Installed, Partial, Present, Implemented and Not found. Tests pin the fixture's words; the word table (and a test) still covers Configured.
4. **`max` may be null; group may be `other`.** The plan types `score` as `{value, max}` and groups as three keys. A file with "Overall Score: 64" and no "/100" keeps the number and shows "64" only; a `###` heading that is none of the three, or steps under no heading, keep their own heading under group `other` rather than being dropped. The extractor also keeps each group's heading verbatim.
5. **[Dispatch] Not run:** the Playwright suite, `systemctl --user restart labelore` (the plan's last verify clause) and `--sketch` on `shoot-pages`. Sketch shots came from a scratchpad script (`shoot-050.mjs`, tab `#b`, `?state=04|03`); build shots from `shoot-pages` on an isolated server. The service is therefore not restarted; do that after merge.
6. **CSS guards.** The block uses no colour recipe, so `--border-faint`, `--card-veil`, `--missing-fill` and `--in-flight-fill` come from the shared tokens, and it sets no `.status-square` selector (the page sizes squares through its own `view-eval-review-sq`).
7. **Extra copy.** "No finding stated." (a row with an empty finding opened) and the bar counts "None" / "1 gap" on Critical Gaps are the build's words, not the sketch's.
8. **node_modules** in the worktree is a git-ignored directory of symlinks to the main checkout's (nothing installed).

## Tracer and TDD record

Task 1 (tracer): handler, extractor, composer, page, CSS and wiring shipped together (`7d98f09`); checked end to end (gate on the named files: 336 passed, typecheck, build, four screenshots) before expansion. Task 2: RED `da2534b` (2 failing: the composer was quadratic in rows and steps, 57x for 32x the input; design-language.md had no Eval review use), GREEN `5209210` (one Map for target lookup, the docs). Sketch-check fix `edcff08`.

## Side by side (sketch left, build right)

Shots in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-20/`: `sketch/sketch-{04,03}-{1280,390}-{light,dark}.png` and `build/eval-v1-1-phase-{4,3}-eval-review-{1280,390}-{light,dark}.png`. Viewed side by side: 04 at 1280 light, 04 at 390 light, 03 at 1280 dark, 03 at 390 dark (the other four of each set were shot, not looked at; the no-score state has no fixture and is markup-tested only). Differences:

1. **Fixed: head meter size.** Squares were the small default; now `size="large"` as the sketch.
2. **Fixed: Infrastructure audit heading** now reads "Infrastructure audit · 70/100" as the sketch.
3. **Left: page chrome** (app shell, crumbs with the full title, header row: the app puts the copy button and View / Source on their own right-aligned line).
4. **Left: verdict chip typeface.** The sketch sets chips in mono; the shared app `status-chip` is condensed sans, as on every other page.
5. **Left: bar counts** ("None", "1 gap") the sketch does not draw.
6. **Left: interactions** (a row opening its finding, a step selected with its wire forward) are markup-tested only, not photographed; wire geometry was viewed only at rest.

No sideways page scroll at 390 and no page error (`shoot-pages` printed no FAIL line). Four font sizes in the block (test-pinned).

## Verification

- `npm run test:gate -- test`: `gate: total=6107 passed=6107 failed=0 skipped=0 todo=0` (base 6044). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- Acceptance: `EvalReviewHandler` in `handlers/index.ts`; `evalReviewPage: composeEvalReview` once in `manifests.ts`; `Verdict not stated` in `eval-review-page.ts`.
- Growth (T-10-36): the extractor stays linear on rows and on a many-pipe cell; the composer composes 10,000 rows and steps in linear time.
- The dense golden did not change.

## Known Stubs

None.

## Threat Flags

None new. T-10-36 mitigated (caps, single-pass scans, growth tests). T-10-37 mitigated (finding and step text through `ResearchInline`; the contract test forbids the raw-HTML prop and any link). T-10-38 mitigated (a planted review with 64, NEEDS WORK and every dimension COVERED still shows 64 and NEEDS WORK; the contract test forbids arithmetic, comparison or rounding on the score in the composer and components). Bars render the document's own sanitized HTML through the existing `renderHtml`, as the AI spec page does. No package installed.

## Self-Check: PASSED

- FOUND: `eval-review-body.ts`, `eval-review.ts`, `eval-review-page.ts`, `eval-review-page-components.tsx`, `test/eval-review-handler.test.ts`, `test/web/eval-review-page.test.ts`.
- FOUND commits 7d98f09, da2534b, 5209210, edcff08 (ancestors of HEAD).
- STATE.md and ROADMAP.md untouched.
