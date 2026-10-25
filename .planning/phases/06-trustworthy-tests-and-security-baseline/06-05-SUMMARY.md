---
phase: 06-trustworthy-tests-and-security-baseline
plan: 05
subsystem: testing
tags: [vitest, playwright, fixtures, lendshed, context-brief, growth-timing, fail-loud]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "06-01 Lendshed tracer (fxPath, FIXTURE_BASE_URL, test:gate) and 06-02 measureGrowth/GROWTH_LIMIT"
provides:
  - "eight more made-up CONTEXT files in test/fixtures/lendshed (phases 02-04, v1.0 phases 01-04, quick k2p), nine in all with 06-01's phase 01"
  - "test/context-brief.test.ts, test/web/context-brief-corpus.test.ts and test/e2e/context-brief.spec.ts reading only Lendshed or Labelore's own archived files, with no gate and no skip"
  - "a corpus walk over Labelore's .planning and the Lendshed .planning, keyed LB: and FX:, asserting at least 10 and at least 9 files"
  - "the two ReDoS timing tests asserting growth through measureGrowth instead of a millisecond budget"
affects: [06-06, 06-09, 06-22]

actuals:
  tokens: 30800
  tasks: 2
  commits: 2
plan_head_before: fb9c85b5f8424b3ab3b3402c61f1ddf5ff098666
plan_head_after: 56ea0347e2b72bb49e17bd799ad4778bc0da0eb0

tech-stack:
  added: []
  patterns:
    - "A pinned corpus case names its file as LB:<path> or FX:<path>; FX paths resolve through fxPath so a missing file throws"
    - "A corpus walk asserts a minimum file count per corpus and that every pinned case was found by the walk"
    - "A hostile-input timing test builds its input in make(size) and asserts measureGrowth ratio below GROWTH_LIMIT, with a separate no-throw call at the original 200,000-character size"

key-files:
  created:
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-CONTEXT.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-CONTEXT.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-CONTEXT.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/01-member-data-foundation/01-CONTEXT.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/02-shed-inventory-health/02-CONTEXT.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/03-catalogue-browsing/03-CONTEXT.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-CONTEXT.md
    - test/fixtures/lendshed/.planning/quick/260403-k2p-add-right-click-menu-to-catalogue-grid/260403-k2p-CONTEXT.md
  modified:
    - test/context-brief.test.ts
    - test/web/context-brief-corpus.test.ts
    - test/e2e/context-brief.spec.ts

key-decisions:
  - "Lendshed's four sheds are Canal, Ridge, Orchard and Depot in every v1.0 file; v1.1 files say only 'shed'"
  - "Pins are recounted per Lendshed file with grep/awk and then checked against the extractor, never copied from it; Lendshed has fewer decisions than the reference files because prose is trimmed (R3)"
  - "The corpus walk asserts minimums (10 LB, 9 FX) and that every pinned case is found; it does not assert that every walked file is pinned, so a sibling plan adding a file cannot break this guard (R6)"
  - "The phase 01 tests that read the reference's phase 01 now read the existing Lendshed phase 01 (not edited by this plan); their pins were recalculated rather than carried over"

patterns-established:
  - "Fixture sentences are reworded until a word-6-gram scan against the reference shows well under 15% shared (structure and GSD template phrases account for the rest)"
  - "Test inline strings that quote a reference's wording are rewritten in Lendshed terms so the deny-list grep over the test files is empty"

requirements-completed: [TEST-01, TEST-02, TEST-04]

coverage:
  - id: D1
    description: "The eight remaining CONTEXT files exist in Lendshed (nine in all) and no word from the deny-list appears under test/fixtures/lendshed or in the three test files"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "grep -rniwE 'cinedise|studio-portal|resoundant|pyedge|deid|sideby|duet|edgecan|ibis' test/fixtures/lendshed test/context-brief.test.ts test/web/context-brief-corpus.test.ts test/e2e/context-brief.spec.ts (no output); find test/fixtures/lendshed/.planning -name '*-CONTEXT.md' | wc -l prints 9"
        status: pass
    human_judgment: true
    rationale: "That the invented prose is genuinely unrelated to the reference project is a judgment a word-list grep cannot prove; a word-6-gram scan puts shared text at 5 to 14 percent per file, mostly structure; the standing leak test lands in 06-22"
  - id: D2
    description: "Every CONTEXT unit and corpus test reads a Lendshed file through fxPath or a Labelore archived file, with no existence gate, and its pins are recalculated on the Lendshed file"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npm run test:gate -- test/context-brief.test.ts test/web/context-brief-corpus.test.ts (gate: total=146 passed=146 failed=0 skipped=0 todo=0)"
        status: pass
      - kind: other
        ref: "git grep -nE 'runIf|skipIf|test\\.skip|it\\.skip|describe\\.skip|SP_PLANNING|STUDIO_PORTAL|homedir|helpers/studio-portal' over the three test files (no output; baseline 22 lines)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The CONTEXT corpus guard walks Labelore's .planning and the Lendshed .planning, keyed LB: and FX:, and asserts at least 10 and at least 9 files"
    requirement: TEST-04
    verification:
      - kind: unit
        ref: "test/web/context-brief-corpus.test.ts#CONTEXT brief corpus walk (LB: and FX:)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The CONTEXT browser spec runs every test against 4199 or the Lendshed server on 4198 with zero skipped tests"
    requirement: TEST-04
    verification:
      - kind: e2e
        ref: "npx playwright test test/e2e/context-brief.spec.ts (14 passed, 0 skipped)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The two ReDoS tests assert growth through measureGrowth instead of a 250 ms budget"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "test/context-brief.test.ts#T-lju-02: ReDoS growth guard (ratios 6.8 to 8.0 measured; a planted quadratic control reads 61.7)"
        status: pass
      - kind: other
        ref: "git grep -cE 'performance\\.now|Date\\.now' -- test/context-brief.test.ts (no output; baseline 4)"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-10-25
status: complete
---

# Phase 6 Plan 05: CONTEXT Family on Lendshed Summary

**All nine Lendshed CONTEXT files now exist and the CONTEXT unit, corpus and browser tests read only them or Labelore's own archived files, with every gate and skip removed, every pin recounted, and the two timing tests asserting growth instead of 250 ms.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-10-25T18:01:40Z
- **Completed:** 2026-10-25T18:18:09Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Eight more made-up CONTEXT files (three current-milestone phases, four archived v1.0 phases, one quick task) keeping the structure each test pins and none of the reference words, names or paths.
- `test/context-brief.test.ts`, `test/web/context-brief-corpus.test.ts` and `test/e2e/context-brief.spec.ts` lost every `runIf`, `test.skip`, home-directory constant and real-checkout import; the old reference describe merged into the Lendshed describe.
- The corpus guard now has an `FX:`/`LB:` keyed case list (9 and 10 files), plus a walk over both `.planning` trees asserting at least 10 and at least 9 files and that every pinned case was found.
- The two 250 ms ReDoS tests became growth tests: a boundary line and an ideas section, each timed at n and 8n; measured ratios 6.8 to 8.0, and a planted quadratic control reads 61.7, so the harness would catch a regression.

## Task Commits

1. **Task 1: Lendshed phase 04 CONTEXT through the unit test, the corpus guard and the browser (tracer)** - `71830e6` (feat)
2. **Task 2: The remaining seven CONTEXT files, every gate removed, timing converted to growth** - `56ea034` (feat)

**Plan metadata:** added by the docs commit that follows this file

Tracer gate: end-of-phase mode with an automated-only verify, so the verify was re-run (unit gate and the two Lendshed browser tests, all green) and expansion continued.

## Files Created/Modified

- `test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-CONTEXT.md` - phase 02
- `test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-CONTEXT.md` - phase 03
- `test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-CONTEXT.md` - phase 04 (tracer, reworded in Task 2)
- `test/fixtures/lendshed/.planning/milestones/v1.0-phases/0{1,2,3,4}-*/0N-CONTEXT.md` - the four archived v1.0 phases
- `test/fixtures/lendshed/.planning/quick/260403-k2p-add-right-click-menu-to-catalogue-grid/260403-k2p-CONTEXT.md` - the quick task
- `test/context-brief.test.ts` - Lendshed reads, recounted pins, growth tests
- `test/web/context-brief-corpus.test.ts` - `LB_CASES`/`FX_CASES`, `walkContextFiles`, the walk describe
- `test/e2e/context-brief.spec.ts` - Lendshed describe holds phase 01, phase 04, quick k2p and the phase 01 + 03 ideas test

## Per-file quirk ledger (input for the 06-22 ledger)

Pins are per file (counted with grep/awk in the file, then confirmed against the extractor).

| Lendshed file | Quirks it keeps | Pins |
|---|---|---|
| `phases/01-member-sign-in-sessions` (06-01, not edited) | open-questions attention panel with blocks-D chips, colon-list discretion paragraph, arrowed out list with a "drift" label, rule/leaning specifics, handed/passed/passed deferred | 19 decisions, 3 open, 2 specifics, 3 deferred |
| `phases/02-roles-and-permissions` | `<blocking_amendments>` with an emoji "Requirement amendments" heading and a 6-row table; references with an untitled lead plus 5 groups; code insights with 4 groups; ts, sql and plain code fences and a nested numbered list inside decisions; reversibility lines; single colon-list discretion paragraph | 12 decisions, 1 amendments, 6 table rows |
| `phases/03-account-admin-and-sessions` | `<resolved_open_question>` (tag plus an "already answered" heading); `<blocking_amendments>` recognised by tag with a sql fence; discretion bullet list; 5 specifics leaning/note/rule/rule/rule; 10 deferred (8 declined with 5 revisit triggers, 1 out, 1 carried with a parenthetical lifted into the body) | 12 decisions, 1 amendments, 1 resolved, 5 specifics, 10 deferred |
| `phases/04-bulk-loan-export` | collapsed 9-row "Already decided" aside, 1 out item from "Not this phase:", no extras, `<blocking_amendments>` recognised and hidden, `<open_questions>` tag with 3 numbered items, "(Claude's discretion)" decision | 8 decisions, 3 open, 1 amendments |
| `milestones/v1.0-phases/01-member-data-foundation` | older style: contiguous bullets, closing tags with no blank line, an unmatched "(OPEN ...)" decision tag, numbered boundary list, "None raised" deferred paragraph | 8 decisions |
| `milestones/v1.0-phases/02-shed-inventory-health` | "Planning-time amendments" area opening with one note paragraph, a trailing `## Amendment` section after `</deferred>`, two box-drawing fences | 11 decisions, 1 note |
| `milestones/v1.0-phases/03-catalogue-browsing` | indented ASCII box inside a decision, "(chose against recommendation)" decision tags | 8 decisions |
| `milestones/v1.0-phases/04-shed-to-shed-transfers` | `**D-01: ...**` bold-colon-inside decisions (no tag), domain `---` plus a `###` extra, indented ASCII box in D-01, discretion bullets | 10 decisions, 1 extra |
| `quick/260403-k2p-...` | "Task Boundary" heading, untagged bullets, note paragraphs between and after bullet runs, bold-lead specifics, no canonical or code sections | 9 decisions, 10 notes |

## Decisions Made

- Lendshed has fewer decisions per file than the reference (trimmed under R3), so every pin is a Lendshed count, not a carried number.
- Task 1's tests moved the phase 04 reads first; Task 2 finished the other families. Both tasks left the repo green.
- The phase 01 reference tests retargeted to the existing Lendshed phase 01, whose specifics (2) and deferred items (3) differ from the reference's (3 and 5); pins and their comments say so.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Reworded the fixture prose after a similarity scan (T-06-13)**
- **Found during:** Task 2
- **Issue:** the first draft of the nine files shared 13 to 33 percent of their word 6-grams with the matching reference files, including near-verbatim planner sentences; the deny-list grep passes either way but the threat register item T-06-13 and prohibition D-06 are about carried-over text
- **Fix:** rewrote every flagged sentence in the files authored here (and the phase 04 file already committed by Task 1); structure, tags, headings and table/list shapes stayed. Shared 6-grams fell to 5 to 14 percent per file (structure and GSD template phrases)
- **Files modified:** the eight Lendshed files and `04-bulk-loan-export/04-CONTEXT.md`; the phase 03 deferred pins and the e2e `D-01's first option` text were updated to match
- **Verification:** unit gate, browser spec and deny-list grep re-run green
- **Committed in:** 56ea034

**2. [Rule 3 - Blocking] Inline strings in `splitIdeaLead`/`classifySpecific`/`classifyDeferred` tests quoted reference wording**
- **Found during:** Task 2 acceptance grep
- **Issue:** the deny-list grep over the three test files printed two lines because unit-test inputs used the reference project's CLI name, an old package name and a theme preset
- **Fix:** rewrote those inputs in Lendshed terms (`shedkeys`, `lendshed-admin`, the `lendshed` token set, ADMN-NN) keeping the same shapes
- **Files modified:** test/context-brief.test.ts
- **Verification:** the deny-list grep prints nothing
- **Committed in:** 56ea034

### Plan observations

- **Corpus walk wording:** the plan says to "walk" both `.planning` trees and key entries `LB:` and `FX:`. The pinned case list stays explicit (pins are per file, R6) and the walk is a guard over it: minimum counts, plus every pinned case found by the walk. It does not require every walked file to be pinned, so a sibling plan adding a Lendshed file cannot break it.
- **Duplicate browser test dropped:** the reference's phase 01 attention-panel test duplicated the Lendshed phase 01 test 06-01 had already added, so it was removed rather than copied.
- **Quick-task path:** the plan lists `260403-k2p-CONTEXT.md` under `.planning/quick/`, matching the README map.

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** both needed for the plan's own acceptance and threat model; no scope creep.

## Issues Encountered

- 25 unit tests in five files still fail exactly as at phase start and are listed in `deferred-items.md`; the whole unit suite shows the same 25 and no others.
- Playwright prints the Vite HMR port 24678 conflict at startup because two dev servers share it (pre-existing, noted in 06-01); the run passes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The CONTEXT family is done on Lendshed; the quirk ledger above feeds 06-22.
- 06-22's standing leak test should treat the 9 to 14 percent word-6-gram overlap as structural; the reference files stay unmodified.

## Known Stubs

None.

## Self-Check: PASSED

- All 11 created or modified files exist; commits `71830e6` and `56ea034` are on `master`; `gsd_run check evaluation-scope --plan 06-05 --commits-only` resolves to 2 commits.
- Acceptance greps: gate/skip grep empty (baseline 22), deny-list grep empty (baseline 11), timing grep empty (baseline 4), nine `*-CONTEXT.md` files.
- Plan verification: `npm run test:gate` on both unit files exits 0 with `skipped=0 todo=0`; the full Playwright spec passes 14 of 14 with none skipped; `npm run lint` and `npm run typecheck` exit 0.

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-25*
