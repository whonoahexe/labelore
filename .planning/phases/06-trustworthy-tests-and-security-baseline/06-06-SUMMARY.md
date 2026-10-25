---
phase: 06-trustworthy-tests-and-security-baseline
plan: 06
subsystem: testing
tags: [vitest, playwright, fixtures, lendshed, discussion-log, validation-strategy, growth-timing, fail-loud]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "06-01 Lendshed tracer (fxPath, FIXTURE_BASE_URL, test:gate) and 06-02 measureGrowth/GROWTH_LIMIT"
provides:
  - "eight made-up DISCUSSION-LOG files and eight made-up VALIDATION files in test/fixtures/lendshed, one per reference file the old tests read"
  - "test/section-projection.test.ts (repro only), test/web/discussion-log-corpus.test.ts, test/validation-strategy.test.ts, test/web/validation-strategy.test.ts, test/web/validation-strategy-corpus.test.ts and test/e2e/validation-page.spec.ts reading only Lendshed, the in-repo dense fixture or Labelore's own archived files, with no gate and no skip"
  - "discussion-log corpus walk keyed LB: and FX:, minimum 6 and 8 files; validation corpus walk keyed LB:, DN: (dense fixture) and FX:, minimum 8 Lendshed files and every file pinned"
  - "the two validation timing tests asserting growth through measureGrowth instead of a 250 ms budget"
affects: [06-09, 06-22]

actuals:
  tokens: 57500
  tasks: 3
  commits: 4
plan_head_before: 8d3093f2a3eea3e3dff1ade6b60a32674749737b
plan_head_after: d0c764cbae10c08404a755dc0fe6d094bbfa774d

tech-stack:
  added: []
  patterns:
    - "A pinned corpus case names its file as LB:<path>, DN:<path> or FX:<path>; FX paths resolve through fxPath so a missing file throws"
    - "A corpus walk asserts a minimum file count per corpus and that every pinned case was found by the walk"
    - "A hostile-input timing test builds its input in make(size), asserts measureGrowth ratio below GROWTH_LIMIT, and keeps the original oversized shape as a separate no-throw call"
    - "Fixture prose is reworded until a word-6-gram scan against the reference, with GSD template text and the dense fixture subtracted, shows well under 15 percent shared"

key-files:
  created:
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-DISCUSSION-LOG.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-DISCUSSION-LOG.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-DISCUSSION-LOG.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-DISCUSSION-LOG.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/0{1,2,3,4}-*/0N-DISCUSSION-LOG.md
    - test/fixtures/lendshed/.planning/phases/0{1,2,3,4}-*/0N-VALIDATION.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/0{1,2,3,4}-*/0N-VALIDATION.md
  modified:
    - test/section-projection.test.ts
    - test/web/discussion-log-corpus.test.ts
    - test/validation-strategy.test.ts
    - test/web/validation-strategy.test.ts
    - test/web/validation-strategy-corpus.test.ts
    - test/e2e/validation-page.spec.ts

key-decisions:
  - "The discussion-log repro and phase 01 corpus entries read Lendshed phase 01, whose renamed CLI answer says shedkeys; the question is found by its first words, which were invented fresh"
  - "Lendshed has fewer VALIDATION map rows than the reference (15 instead of 33 for the draft-shape file, 9, 12 and 10 for the others) per the trim rule; every pin is a Lendshed count, including the 'dims the tiles' bound (10 of 15 tiles lack ROLE-06)"
  - "The in-repo dense fixture keeps its place in the validation corpus under a new DN: key, because FX: now means Lendshed"
  - "Labelore's own .planning holds no VALIDATION file today, so the LB: minimum is zero and the every-file-must-be-pinned rule is what guards it"
  - "Threat IDs and task numbering in the VALIDATION fixtures were shifted from the reference's so the numbers themselves are not carried over"

patterns-established:
  - "Overlap check with a baseline: subtract the GSD template and the dense fixture before judging how much of a made-up file echoes the reference"
  - "Free-form growth input is sized by one number and split inside make() (a fifth for one long cell, the rest as filler rows)"

requirements-completed: [TEST-01, TEST-02, TEST-04]

coverage:
  - id: D1
    description: "Eight DISCUSSION-LOG and eight VALIDATION files exist in Lendshed and no word from the deny-list appears under test/fixtures/lendshed or in the six test files"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "grep -rniwE 'cinedise|studio-portal|resoundant|pyedge|deid|sideby|duet|edgecan|ibis' over the six test files and test/fixtures/lendshed (no output); find ... -name '*-DISCUSSION-LOG.md' | wc -l prints 8; find ... -name '*-VALIDATION.md' | wc -l prints 8"
        status: pass
    human_judgment: true
    rationale: "That the invented prose is genuinely unrelated to the reference project is a judgment a word-list grep cannot prove; a word-6-gram scan with template text subtracted puts shared text at about 5 to 12 percent per file (discussion logs 3 to 15 percent without the subtraction), mostly structure; the standing leak test lands in 06-22"
  - id: D2
    description: "The discussion-log repro, corpus and cover tests read Lendshed (or Labelore archived) files through fxPath with no existence gate, keeping the renamed-question repro (chosenIndex 1, qualifier renamed, answer containing shedkeys)"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npm run test:gate -- test/section-projection.test.ts test/web/discussion-log-corpus.test.ts (gate: total=81 passed=81 failed=0 skipped=0 todo=0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every validation-strategy unit, web and corpus test reads a Lendshed VALIDATION file (including the off-template and template-only ones) with its pins recounted in the file, and the corpus walk asserts at least 8 Lendshed files and pins every file"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "npm run test:gate -- test/validation-strategy.test.ts test/web/validation-strategy.test.ts test/web/validation-strategy-corpus.test.ts (gate: total=55 passed=55 failed=0 skipped=0 todo=0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The validation browser spec runs both tests against the Lendshed server on 4198 with zero skipped tests"
    requirement: TEST-04
    verification:
      - kind: e2e
        ref: "npx playwright test test/e2e/validation-page.spec.ts (2 passed, 0 skipped)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No absolute millisecond budget remains in test/validation-strategy.test.ts; the two hostile-input tests assert growth through measureGrowth"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "test/validation-strategy.test.ts#extractValidationStrategy — degenerate input (long-line ratio 3.4 to 3.9 measured; unclosed-opener shape reads 1.0 because the 8x input costs under a millisecond; a planted quadratic control reads 57)"
        status: pass
      - kind: other
        ref: "git grep -cE 'performance\\.now|Date\\.now' -- test/validation-strategy.test.ts (no output; baseline 4)"
        status: pass
    human_judgment: false

duration: 23min
completed: 2026-10-25
status: complete
---

# Phase 6 Plan 06: Discussion-Log and Validation Families on Lendshed Summary

**All sixteen Lendshed files now exist and the discussion-log, validation unit, corpus and browser tests read only them (plus Labelore's own archived logs and the in-repo dense fixture), with every gate and skip removed, every pin recounted in the file, and the two 250 ms budgets turned into growth tests.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-10-25T18:20:30Z
- **Completed:** 2026-10-25T18:44:00Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments

- Lendshed phase 01 DISCUSSION-LOG carries the renamed-question repro (chosen, chosenIndex 1, qualifier renamed, the user's own words naming `shedkeys`); the preamble test in `test/section-projection.test.ts` now names a made-up "shed sync tool" instead of a public one (tracer, Task 1).
- Seven more DISCUSSION-LOG files keep each reference shape (question headings with em dash or colon, bold Q lines, free-text answers, execution-time sections, a table-only layout); the corpus guard is keyed LB: and FX: with a walk asserting at least 6 Labelore and 8 Lendshed logs.
- Eight VALIDATION files cover the observed, draft, off-template, template-only and mixed (waves 0 / TBD / 5) shapes; all four test files plus the browser spec were retargeted, with each pin recounted by grep/awk before the extractor was consulted (all matched on the first run).
- `test/validation-strategy.test.ts` lost both 250 ms budgets: the long-line shape and the unclosed-opener shape are timed at n and 8n through `measureGrowth`, with the original 1 MB shape kept as a no-throw call.
- The validation browser spec runs 2 of 2 with nothing skipped; the whole unit suite shows the same 25 known failures as at phase start and no others.

## Task Commits

1. **Task 1: Lendshed phase 01 DISCUSSION-LOG carries the renamed-question repro (tracer)** - `90804ad` (feat)
2. **Task 2: The seven other DISCUSSION-LOG files and the full corpus on Lendshed** - `0031cd2` (feat)
3. **Task 3: The validation-strategy family on Lendshed, browser spec without skips, growth timing** - `083e8ac` (feat)
4. **Follow-up: phase 03 log keeps its offered-areas sentence readable** - `d0c764c` (fix)

**Plan metadata:** added by the docs commit that follows this file

Tracer gate: end-of-phase mode with an automated-only verify, so the verify was re-run (unit gate green) and expansion continued.

## Files Created/Modified

- Sixteen Lendshed files (eight `*-DISCUSSION-LOG.md`, eight `*-VALIDATION.md`) under `phases/` and `milestones/v1.0-phases/`.
- `test/section-projection.test.ts` - repro reads Lendshed phase 01; inline preamble string reworded
- `test/web/discussion-log-corpus.test.ts` - `LB_CASES`/`FX_CASES`, `walkLogFiles`, walk describe, cover cases keyed by file
- `test/validation-strategy.test.ts` - Lendshed reads, recounted pins, growth tests
- `test/web/validation-strategy.test.ts` - Lendshed phase 2 describe (15 tiles) and the other Lendshed documents
- `test/web/validation-strategy-corpus.test.ts` - `PINNED` over `DN:` and `FX:`, minimum counts, unpinned rule
- `test/e2e/validation-page.spec.ts` - Lendshed phase 2, phase 1 and template-only pages, no skips

## Per-file quirk ledger (input for the 06-22 ledger)

Discussion logs. Pins are question counts, counted with grep on question headings or bold Q lines in each file.

| Lendshed file | Quirks it keeps | Pins |
|---|---|---|
| `phases/01-member-sign-in-sessions` (Task 1) | `###` question headings with option tables, `✓ (renamed)` cell with quoted free-text answer naming shedkeys, "selected all four ... offered gray areas" sentence, discretion and deferred sections | 19 questions, cover 4 of 4, repro chosenIndex 1 |
| `phases/02-roles-and-permissions` | blockquote Note in the header (discarded first pass), arrow in an areas-discussed name, `### Q1 —` em-dash headings, `✓ (superseded)` cell, a non-question `### Model change` heading with italic quoted user words | 16 questions |
| `phases/03-account-admin-and-sessions` | em-dash headings with a `### Q3b —` refinement, "All four gray areas that were offered got selected" sentence, trailing `## Notes on scope` | 17 questions |
| `phases/04-bulk-loan-export` | `✓ (Claude's call)` cell on a "you decide" answer, `## Open Questions Carried Forward` with the three-offered-areas sentence, a rule then `## Execution-Time Decisions` with `### E1` and `### E2` questions | 18 questions, cover 4 of 7 |
| `milestones/v1.0-phases/01-member-data-foundation` | four topics, each a table straight under the `##` heading with no question heading | 4 questions |
| `milestones/v1.0-phases/02-shed-inventory-health` | `### Q1:` colon headings, `(Recommended)` tags, against-the-recommendation answers, ASCII-preview notes, em-dash topic headings, a trailing noted-in-passing paragraph | 16 questions |
| `milestones/v1.0-phases/03-catalogue-browsing` | colon headings, `(Recommended)` tags, `—` empty notes, against-the-recommendation answers | 16 questions |
| `milestones/v1.0-phases/04-shed-to-shed-transfers` | bold `**Q1:` lines, `*(recommended)*` tags, "Context presented:" preamble paragraphs, a four-option table with nothing selected plus free text plus follow-up and clarification tables, inline `— **User: "you decide"**`, "All eight gray areas offered were selected" sentence | 25 questions, cover 8 of 8 |

Validation files. Pins are per file: map rows (status counts), waves (lanes), files to create, Wave 0 summary, manual rows and sign-off ticks.

| Lendshed file | Quirks it keeps | Pins |
|---|---|---|
| `phases/01-member-sign-in-sessions` | observed shape: green rows, last row with nine cells so its status is blank, Observed and Outcome columns, suite-state paragraphs after the map, an infra tail paragraph, `updated` date, unticked sign-off | 9 rows (8 green, 1 none), 4 lanes, 7 of 7 Wave 0, 4 manual (3 observed), 0 of 7 |
| `phases/02-roles-and-permissions` | draft shape: YAML comment lines, a manual first row, `❌ W0` / `⚠️` / `n/a` file cells, requirement lists of four, a threat range, two `(**backstop**` manual rows, two-command Quick and Full cells, a 60-second latency | 15 rows pending, 4 lanes, 6 plan groups, 7 to create, 0 of 7 Wave 0, 6 manual, 6 of 6 |
| `phases/03-account-admin-and-sessions` | four qualified Quick/Full rows, three spec rows, `unit + build` test type, plain-bullet Wave 0 with lead, human-check lead and backstop paragraphs | 12 rows pending, 4 lanes, 4 to create, "4 notes", 4 manual, 6 of 6 |
| `phases/04-bulk-loan-export` | off-template: `Final Per-Task Verification Map`, no Plan or Status column, right-aligned Wave, Prerequisite column, a pipe inside a backtick span, unlabeled sampling bullets, `Wave 0 Reconciliation` with lead and tail, `Gate` manual table, no preamble, `reconciled` date, status ready | 10 rows none, 5 lanes, last row `04-06-01` plan 06 wave 3, 3 manual kinds, "6 notes", 3 manual, 6 of 6 |
| `milestones/v1.0-phases/01-member-data-foundation` | slash requirement lists, one `N/A` file cell, `planner-approved (pending execution)` approval, install line after Wave 0 | 8 rows pending, 3 lanes, 7 to create, 0 of 6, 2 manual, 6 of 6 |
| `milestones/v1.0-phases/02-shed-inventory-health` | blockquote preface before the map, `TBD` plan and wave cells, waves 0 / TBD / 5, mixed green and pending, Wave 0 with ticked and unticked boxes | 8 rows (4 green, 4 pending), 3 lanes, 4 to create, 2 of 5, 3 manual, 0 of 6 |
| `milestones/v1.0-phases/03-catalogue-browsing` | template-only map row with brace tokens, filled infra rows, italic if-none lines | 1 row, template, 0 of 3, 1 manual, 0 of 6 |
| `milestones/v1.0-phases/04-shed-to-shed-transfers` | wholly GSD template text with brace placeholders | 1 row, template, 0 of 3, 1 manual, 0 of 6 |

## Decisions Made

- Every pin in the six tests is a Lendshed count made by grep/awk in the file; the extractor then agreed on the first run for all eight validation files and all discussion logs.
- The `DN:` key keeps the in-repo dense fixture pinned without clashing with `FX:` (now Lendshed).
- Labelore's discussion-log walk asserts at least 6 files (the five archived ones plus this phase's own), today's count.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Reworded the fixture prose after a similarity scan (T-06-14)**
- **Found during:** Tasks 2 and 3
- **Issue:** the first drafts of the discussion logs for phase 03, v1.0/03 and v1.0/04 shared 19 to 29 percent of their word 6-grams with the matching reference files, and the VALIDATION drafts 23 to 41 percent (17 to 34 percent once the GSD template and dense fixture were subtracted). The deny-list grep passes either way, but T-06-14 and D-06 are about carried-over text.
- **Fix:** rewrote the flagged sentences and shifted threat IDs; shared text fell to 3 to 15 percent (logs) and 5 to 12 percent (validation, template text subtracted). The two template-only validation files stay close to the GSD template by nature.
- **Files modified:** the sixteen Lendshed files; `test/validation-strategy.test.ts` threat pin updated to match
- **Verification:** unit gate, browser spec and deny-list grep re-run green
- **Committed in:** 0031cd2 and 083e8ac

**2. [Rule 1 - Bug] Rewording dropped the "offered" word from the phase 03 log's areas sentence**
- **Found during:** SUMMARY quirk review
- **Issue:** the cover could no longer read "4 of 4 offered areas" for that file (no test pins it, but R1 says keep the shape)
- **Fix:** reworded to "All four gray areas that were offered got selected for discussion."
- **Files modified:** `phases/03-account-admin-and-sessions/03-DISCUSSION-LOG.md`
- **Verification:** extractor reads offered count 4 and 17 questions; corpus gate green
- **Committed in:** d0c764c

### Plan observations

- **Row counts:** the draft-shape phase 02 file has 15 map rows (reference: 33), as the plan allows ("large enough that the describe keeps its intent"); the "dims the tiles" bound became 10 of 15 for ROLE-06.
- **Corpus walk wording:** as in 06-05, the pinned cases stay explicit and the discussion-log walk guards minimums plus found-ness; the validation walk additionally keeps the every-file-must-be-pinned rule because only this plan writes VALIDATION files.
- **Unclosed-opener timing:** the ratio reads 1.0 because even the 8x input costs under a millisecond (the helper reports 1 below its floor); the sentinel call at 350,000 characters and the long-line ratio (3.4 to 3.9) still guard it, and a planted quadratic control reads 57.

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** both needed for the plan's own threat model and shape rules; no scope creep.

## Issues Encountered

- 25 unit tests in five files still fail exactly as at phase start (listed in `deferred-items.md`); `test/rendering/ascii-graph.test.ts` passed in the last full run and failed once in an earlier one, as already recorded.
- Playwright prints the Vite HMR port 24678 conflict at startup because two dev servers share it (pre-existing); the run passes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The discussion-log and validation families are done on Lendshed; the quirk ledger above feeds 06-22.
- 06-22's standing leak test should treat the template-text overlap in the two template-only VALIDATION files as structural; the reference files stay unmodified.

## Known Stubs

None.

## Self-Check: PASSED

- All 22 created or modified files exist; commits `90804ad`, `0031cd2`, `083e8ac` and `d0c764c` are on `master`.
- Acceptance greps: gate/skip grep empty (baseline 39), deny-list grep empty (baseline 23), timing grep empty (baseline 4), eight `*-DISCUSSION-LOG.md` and eight `*-VALIDATION.md`.
- Plan verification: `npm run test:gate` over the five unit files exits 0 with `skipped=0 todo=0` (136 tests); the validation browser spec passes 2 of 2 with none skipped; `npm run lint` and `npm run typecheck` exit 0.

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-25*
