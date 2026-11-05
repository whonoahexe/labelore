---
phase: 10-codebase-map-specification-and-check-pages
plan: 18
subsystem: ai-spec-page
tags: [ai-spec, template-slots, status-meter, checklist, datasheet, eval-grid, sketch-048-C, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-04 made-up Lendshed AI-SPEC fixtures, 10-05 fence-aware scanner, 10-08 ai-spec manifest and frame, 10-13 sketch 048 winner C, 10-16 handler and page shape
provides:
  - AiSpecHandler, extractAiSpec and AiSpecBody (structured.aiSpec) with the unfilled-slot rule
  - StatusMeter, the shared status-meter (components/status-meter.tsx)
  - composeAiSpec and AiSpecView (datasheet, section strip, checklist meter, evaluation grid, bars and slot rows)
  - the phase-10-ai-spec and status-meter CSS blocks, design-language rows
affects: [10-23 browser spec, any later page that needs a progress meter]

requirements-completed: [VIEW-11]

key-files:
  created:
    - src/planning-repo/handlers/ai-spec.ts
    - src/web/components/status-meter.tsx
    - src/web/views/ai-spec-page.ts
    - src/web/views/ai-spec-page-components.tsx
    - test/ai-spec-handler.test.ts
    - test/web/ai-spec-page.test.ts
    - test/web/status-meter.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json

key-decisions:
  - "Sketch 048 C is built as the user chose it, not the plan's 'chips and a plain section list': a four-cell datasheet, a section strip beside the large status-meter, the evaluation dimensions in a Priority by Measurement grid, bars and slot rows below"
  - "The slot rule is the user's 'every line is the template's own' read as structure plus four verbatim template lines, not the plan's purely structural list, because the plan's rule cannot make section 6 of 04-AI-SPEC a slot"
  - "StatusMeter takes an optional per-item state list so a checklist ticked out of order draws its squares where the ticks are"

duration: one session
completed: 2026-11-05
actuals:
  tokens: 70000
  tasks: 2
  commits: 3
plan_head_before: b86723fc6bcf6f5d081640aa45dd1da793a2d1c6
plan_head_after: bce0c9ad328c70fc4daff129514f79892ec83cfd
---

# Phase 10 Plan 18: AI spec page Summary

**An AI-SPEC opens on sketch 048 winner C: a ruled datasheet of System type, Framework (with its version), Stakes level and Vendor lock-in (an unwritten cell hatched "Template slot"), the lead "{n} of {m} sections are still template slots" over a strip of one square per numbered section beside the shared status-meter ("{d} of {t} checklist items done"), the evaluation dimensions placed by Priority and Measurement, then every section as a closed bar or a dashed slot row.**

## What was built

- **`handlers/ai-spec.ts`.** `extractAiSpec` reads the five field lines (null while the value is the template's comment), the Section 5 Dimensions table (empty and template-option rows dropped), the Checklist as `{ done, total, items[] }`, and every numbered section (`1.` to `7.`, `1b.`, `4b.`) with `slot` and `written`. One scan per section tracks fences and HTML comments (an unterminated comment ends with its section). Caps: 250,000-character body, 100 dimensions, 200 checklist items, 60 sections, 2,000 characters a field. No regular expression. `AiSpecHandler` matches the `AI-SPEC` token, is guarded, and sits before the generic handler.
- **`components/status-meter.tsx`.** `StatusMeter({ filled, total, items?, tone, label, caption?, size })`: one `role="img"` with the label as its only name, squares `aria-hidden`, at most 40 squares (a bucket each past that), per-item state when the list is given. Promoted from the review ledger's square bar as the one shared meter; the ledger's own bar is left as it was (not in this plan's files).
- **`ai-spec-page.ts` / `ai-spec-page-components.tsx`.** Pure composer and the page. Cells, lead, strip, grid (a dimension the grid has no place for is listed under it, never dropped), dock opened by a chip, bars with line counts, slot rows with a Source button, header override (eyebrow "Phase N · AI spec", the phase name as the h1; "AI-SPEC —" is dropped from the title before `splitPhaseTitle`).
- **Wiring.** `aiSpecPage` on the ai-spec manifest (lead and promote fallback unchanged); `aiSpecPage` memo, header override and render branch in `artifact-page.tsx`.
- **CSS and docs.** A `status-meter` block and a `phase-10-ai-spec` block (tokens only, four font sizes); design-language rows for the four status-meter names, tone uses (done square complete; not done and every Template slot quiet) and a Language bullet.

## Unfilled-slot rule

A numbered section is a slot when no line under it is the author's. After HTML comments are removed, a line is scaffolding when it is: blank or a horizontal rule; a blockquote line; a heading of level three or deeper; a bold label with no value; only a list number and a dot, or a bare list marker; a table header row (the row a separator row follows), a separator row, or a row whose cells are all empty; or one of four verbatim lines of GSD's `templates/AI-SPEC.md` the shape rules cannot tell from text (the Dimensions option row `Code / LLM Judge / Human | Critical / High / Medium`, the guardrail row `Block / Escalate / Flag`, `project/` and the tree-comment line in the structure fence). Inside a fence a line is scaffolding when blank, a `#` or `//` comment, or one of those two fence lines. Everything else is written. The Checklist is not a numbered section, so it is progress, never a slot. Proven on both files: 02-AI-SPEC (the template body) is 9 of 9 slots, 04-AI-SPEC is exactly 4b, 6 and 7.

## Deviations from Plan

1. **[User decision 048 C] Layout.** The plan's task text (chips, a plain section list, each slot a disclosure with aria-expanded) was replaced by the winner as drawn. In particular a slot is a dashed row with its heading, the chip and a Source button, and nothing opens (as the sketch says), not a disclosure; its text is never carried to the page.
2. **[User decision / Rule 1] Slot rule is structure plus four verbatim template lines.** The plan's rule ("rows whose cells are all empty") makes the Online guardrails row `| | | Block / Escalate / Flag |` content, so 04-AI-SPEC section 6 would be filled and the plan's own truth (4b, 6, 7 are slots) could not hold. The user's "verbatim in the template" is applied to those four lines only, so GSD adding new placeholder prose elsewhere still reads by shape.
3. **Nine sections, not eight.** GSD's real template has nine numbered sections (1, 1b, 2, 3, 4, 4b, 5, 6, 7); UI-SPEC's example says 8. "{n} of {m}" counts nine.
4. **SpecBody wider than the plan's shape.** `stakes`, `vendorLockIn`, per-section `written` and per-item checklist state were added (the winner draws Stakes level and Vendor lock-in; the line count and the meter squares need the rest).
5. **[Rule 1] Meter squares by state, not by count.** The first build filled the first N squares; 04-AI-SPEC ticks items 1-4, 6 and 7 (sketch shows it), so the extractor keeps each item's state and `StatusMeter` accepts `items`. Golden regenerated a second time for that field.
6. **[Rule 3] Shared table style.** The global `table { display: block; width: max-content }` shrank the grid to half width; the page sets `display: table; width: 100%` on its own table.
7. **[Dispatch] Not run:** the Playwright suite, the service restart (`systemctl --user restart labelore`), and the plan's `--sketch` shoot option (times out). Shots came from `shoot-pages.ts` on isolated servers and a scratchpad script for the sketch. The shared `.status-square` selector is not written outside the project block (guard test); the page sizes squares with its own `view-ai-spec-sq-*` and `status-meter-sq` classes.
8. **Own bar, not 10-16's.** The sketch's bar carries a neutral square and a line count that 10-16's `Bar` does not, and a second view reusing a `view-spec-*` name is the drift signal the vocabulary test exists for, so the page has its own `view-ai-spec-bar` (the header split, the `ResearchInline` path and the plain-section sizing rules are the 10-16 ones).
9. **Preamble dropped.** Text before the first `##` (the title and the template's two-line blockquote) is not drawn on the page; Source mode shows it.

## TDD record

Task 1 (tracer): datasheet, strip, meter, grid and bars shipped with `slot: false` for every section; typecheck, build and four shots passed before expansion. Task 2: RED `d9932da` (12 handler tests and 7 page tests failing), GREEN `bce0c9a`.

## Golden

`test/__golden__/dense.json` regenerated with `npx vitest run test/snapshot.golden.test.ts -u` (twice). The diff touches only the five records at `.planning/phases/01-identity-slice/01-AI-SPEC.md`, each `"structured": {}` becoming `"structured": { "aiSpec": ... }` (system type Extraction, framework N/A, checklist 3 of 6, three written sections). `git diff -- fixtures/dense` is empty.

## Side by side (sketch left, build right)

Shots in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-18/`: `sketch/sketch-{04,02,full}-{1280,390}-{light,dark}.png`, `build/aispec-v1-1-phase-{4,2}-ai-spec-{1280,390}-{light,dark}.png` (04 half filled, 02 empty template), `dense/densea-v3-0-phase-1-ai-spec-{1280,390}-{light,dark}.png` (the only other AI-SPEC in the repo, `fixtures/dense`). Viewed side by side: 04 at 1280 light and dark and 390 light; 02 at 1280 light and 390 light; dense at 390 dark. Differences:

1. **Fixed: meter squares** were the first N, not the ticked items (deviation 5).
2. **Fixed: grid width** collapsed to half (deviation 6).
3. **Fixed: Source and Close links** carried a permanent underline; the sketch underlines on hover only.
4. **Fixed: legend** lacked the "·" between "written" and "Template slot".
5. **Left: chip typeface.** The app's shared `status-chip` is the heading sans, the sketch draws chips in mono. Same on the Spec page; a shared class is not edited here.
6. **Left: page chrome** (the sketch bar and shell against the app shell, the crumbs "Dashboard / Roadmap / v1.1 / Phase 04 / ..." and the header row order: the app puts the copy button and View/Source toggle on separate lines).
7. **Left: line counts** differ (04 section 3 reads 18 lines against the sketch's 20, 1b 11 against 13): the build counts the author's lines, the sketch counts template lines left in place and fence markers too.
8. **Left: Version code** has no `--veil` ground in the build (plain mono); the sketch tints it.
9. **Left: the sketch's Fully filled state** was not shot beside the build (no fixture is fully filled); the no-lead case is covered by a unit test.
10. **Left: dock** (a dimension chip's rubric dock) and a bar opened by a strip square were not photographed; both are covered by markup tests only, not by an interaction shot.

No sideways page scroll at 390 and no page error on any shot (`shoot-pages` printed no FAIL line). Four font sizes in the block (test-pinned).

## Verification

- `npm run test:gate -- test`: `gate: total=5966 passed=5966 failed=0 skipped=0 todo=0` (base 5885). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- Task 1 verify (gate on the named files, typecheck, build, four shots): passed. Task 2 verify's second command was run without `--sketch` and without the service restart (deviation 7).
- Acceptance: `AiSpecHandler` in `handlers/index.ts` (2 lines); `status-meter` in design-language.md; `aiSpecPage: composeAiSpec` on 1 line of `manifests.ts`; "Template slot" in `ai-spec-page.ts`; `git diff -- fixtures/dense` empty; golden changes only 01-AI-SPEC.md `structured`.
- Growth (T-10-31): the extractor stays linear in 5,000 sections, one 200,000-character comment, 10,000 table rows and thousands of comments on one line.

## Known Stubs

None.

## Threat Flags

None new. T-10-31 mitigated (caps, comment bounded by its section, single-pass scans, growth tests). T-10-32 mitigated (`ResearchInline`; a slot's text never rendered; the contract test forbids the raw-HTML prop and any href). No package installed.

## Self-Check: PASSED

- FOUND: `ai-spec.ts`, `status-meter.tsx`, `ai-spec-page.ts`, `ai-spec-page-components.tsx`, `test/ai-spec-handler.test.ts`, `test/web/ai-spec-page.test.ts`, `test/web/status-meter.test.ts`.
- FOUND commits 2f4cda2, d9932da, bce0c9a (ancestors of HEAD).
- STATE.md and ROADMAP.md untouched.
