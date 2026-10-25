---
phase: 06-trustworthy-tests-and-security-baseline
plan: 07
subsystem: testing
tags: [vitest, playwright, fixtures, lendshed, pattern-map, growth-timing, fail-loud]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "06-01 Lendshed tracer (fxPath, FIXTURE_BASE_URL, test:gate) and 06-02 measureGrowth/GROWTH_LIMIT"
provides:
  - "seven made-up PATTERNS files in test/fixtures/lendshed, one per reference file the old pattern-map tests pinned"
  - "test/pattern-map.test.ts, test/web/pattern-map.test.ts, test/web/pattern-map-corpus.test.ts and test/e2e/patterns-map.spec.ts reading only Lendshed or Labelore's own files, with no gate and no skip"
  - "PATTERNS corpus guard keyed LB: (five Labelore files, including phases/06-trustworthy-tests-and-security-baseline/06-PATTERNS.md, D-18) and FX: (seven Lendshed files), with minimum counts and a check that every pin was found"
  - "the two millisecond budgets (extractor on a hostile 1 MB body, glob matcher on adversarial input) turned into growth tests through measureGrowth"
affects: [06-09, 06-22]

actuals:
  tokens: 15500
  tasks: 2
  commits: 2
plan_head_before: 91dd5ae1c8eaeec05d205676f35ae0e1950eabfa
plan_head_after: 7987d60a80639a8bdb927323131efb5f6d5f1209

tech-stack:
  added: []
  patterns:
    - "A pinned PATTERNS case names its file as LB:<path> or FX:<path>; FX paths are walked from FX_PLANNING, so a missing fixture throws instead of skipping"
    - "A corpus walk asserts a minimum file count per corpus (5 Labelore, 7 Lendshed) and that every pinned key was found by the walk"
    - "A hostile-input timing test builds its input in make(size) scaled from the original shape, asserts measureGrowth ratio below GROWTH_LIMIT, and keeps the original oversized shape as a separate no-throw call"
    - "Pattern-map pins are recounted by awk over the last cell of each classification row and grep over the fence lines in the made-up file itself, then the extractor is consulted"

key-files:
  created:
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/02-shed-inventory-health/02-PATTERNS.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/03-catalogue-browsing/03-PATTERNS.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-PATTERNS.md
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-PATTERNS.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-PATTERNS.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-PATTERNS.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-PATTERNS.md
  modified:
    - test/pattern-map.test.ts
    - test/web/pattern-map.test.ts
    - test/web/pattern-map-corpus.test.ts
    - test/e2e/patterns-map.spec.ts
    - .planning/phases/06-trustworthy-tests-and-security-baseline/deferred-items.md

key-decisions:
  - "The richest map (v1.0 phase 02) keeps five doc groups, a partial row with a blockquoted caveat, a row with a brace-expanded file cell, a generated-primitive row with no table entry, a pathless 'unit tests in ...' row, bold pathless config rows, a mapper's note, a numbered notes section with sub-bullets and a Metadata block; it has fewer rows than the reference (22 against 26) and different quality counts so no pin is carried over"
  - "The corpus guard pins the partial row's qualifier ('read the caveat') and the refuse-alike rule's short name ('Refuse alike') as Lendshed wording, not the reference's"
  - "The Labelore v1.1/05 browser test stays on the repo's own server (4199) reading Labelore's own archived file; only the studio-portal test moved to Lendshed on 4198"
  - "Labelore's 06-PATTERNS.md is pinned under LB: with excerpts 12 and is recounted whenever planning changes it (D-18)"

patterns-established:
  - "Fixture prose is reworded until a word-6-gram scan against all reference PATTERNS files shows well under 15 percent shared (measured 2.3 to 5.1 percent, mostly table headers and mapper-template labels)"
  - "Each of the seven Lendshed maps keeps a different distinguishing shape so the PINNED rows keep their variety"

requirements-completed: [TEST-01, TEST-02, TEST-04]

coverage:
  - id: D1
    description: "Seven PATTERNS files exist in Lendshed and no word from the deny-list, no reference path vocabulary (backend/, frontend/, .rs, tier, rclone, tokio and similar) appears in them or in the four test files"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "grep -rniwE 'cinedise|studio-portal|resoundant|pyedge|deid|sideby|duet|edgecan|ibis' over the four test files and test/fixtures/lendshed (no output); find test/fixtures/lendshed/.planning -name '*-PATTERNS.md' | wc -l prints 7"
        status: pass
    human_judgment: true
    rationale: "That the invented prose and excerpts are genuinely unrelated to the reference project is a judgment a word-list grep cannot prove; a word-6-gram scan against every reference PATTERNS file puts shared text at 2.3 to 5.1 percent per file, mostly structure; the standing leak test lands in 06-22"
  - id: D2
    description: "The unit extractor, composer/view and corpus tests read Lendshed (or Labelore) PATTERNS files through fxPath with no existence gate, keeping the five doc groups, the no-analog entries, a partial entry and the reject rule, with pins recalculated in the made-up file"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "npm run test:gate -- test/pattern-map.test.ts test/web/pattern-map.test.ts test/web/pattern-map-corpus.test.ts (gate: total=49 passed=49 failed=0 skipped=0 todo=0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The PATTERNS corpus guard pins all seven Lendshed files and all five Labelore files including 06-PATTERNS.md, asserts at least 7 Lendshed and 5 Labelore files, and asserts every pinned key was found"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "test/web/pattern-map-corpus.test.ts (14 tests; grep -c 'LB:phases/06-trustworthy-tests-and-security-baseline/06-PATTERNS.md' prints 1; the deferred-items live-drift failure is gone)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The patterns browser spec runs both tests (Labelore v1.1/05 on 4199, Lendshed v1.0/02 on 4198) with zero skipped tests"
    requirement: TEST-04
    verification:
      - kind: e2e
        ref: "npx playwright test test/e2e/patterns-map.spec.ts (2 passed, 0 skipped)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No absolute millisecond budget remains in test/pattern-map.test.ts or test/web/pattern-map.test.ts; the hostile-body and glob tests assert growth through measureGrowth"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "test/pattern-map.test.ts#the same hostile body grows no faster than linearly (ratio 6.4 measured); test/web/pattern-map.test.ts#pattern matching helpers (globMatch ratio 8.1 measured)"
        status: pass
      - kind: other
        ref: "git grep -cE 'performance\\.now|Date\\.now' -- test/pattern-map.test.ts test/web/pattern-map.test.ts (no output; baseline 2 and 2)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-10-26
status: complete
---

# Phase 6 Plan 07: Pattern-Map Family on Lendshed Summary

**Seven made-up Lendshed PATTERNS files now feed the pattern-map unit, view, corpus and browser tests with every gate and skip removed, every pin recounted in the file itself, Labelore's own phase 6 PATTERNS file re-pinned, and both millisecond budgets turned into growth tests.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-25T18:46:00Z
- **Completed:** 2026-10-25T18:59:00Z
- **Tasks:** 2
- **Files modified:** 11 (plus deferred-items.md)

## Accomplishments

- Lendshed v1.0 phase 02 PATTERNS carries the richest shape: five groups, partial row with a blockquoted caveat, house rules, seven no-analog entries, a notes section kept as back matter; the unit test, the corpus guard and the browser spec were proven on it first (tracer, Task 1).
- Six more PATTERNS files each keep a different shape (all-exact with topical assignment headings, `n/a` and "none close" qualities, long parenthetical qualifiers, `partial-match` with a dashed separator row, noted no-analog entries on non-none rows).
- The corpus guard walks `LB:` (five Labelore files) and `FX:` (seven Lendshed files), asserts minimum counts, pins every file and checks that every pin was found; the long-standing `06-PATTERNS.md` failure is gone.
- `test/pattern-map.test.ts` and `test/web/pattern-map.test.ts` lost both 250 ms budgets; the hostile 1 MB body keeps a no-throw sentinel call and a scaled growth test.
- The patterns browser spec runs 2 of 2 with nothing skipped; the whole unit suite shows 25 failures, all in the files named in `deferred-items.md` (the pattern-map one is no longer among them; `ascii-graph` timing failed in this run as it has before).

## Task Commits

1. **Task 1: Lendshed v1.0 phase 02 PATTERNS through the unit test, the corpus guard and the browser (tracer)** - `bf17c55` (feat)
2. **Task 2: The other six PATTERNS files, the Labelore phase 6 pin, every gate removed, growth timing** - `7987d60` (feat)

**Plan metadata:** added by the docs commit that follows this file

Tracer gate: end-of-phase mode with an automated-only verify, so the verify was re-run (unit gate and browser spec green) and expansion continued.

## Files Created/Modified

- Seven `*-PATTERNS.md` files under `test/fixtures/lendshed/.planning/` (see the quirk ledger below).
- `test/pattern-map.test.ts` - Lendshed v1.0/02 describe, growth test for the hostile body
- `test/web/pattern-map.test.ts` - Lendshed v1.0/02 composer and markup tests with no `runIf`, glob growth test
- `test/web/pattern-map-corpus.test.ts` - `LB_FILES`/`FX_FILES`, thirteen pinned keys, minimum counts, every-pin-found test
- `test/e2e/patterns-map.spec.ts` - the second test reads Lendshed through `FIXTURE_BASE_URL`, no skip
- `.planning/phases/06-trustworthy-tests-and-security-baseline/deferred-items.md` - marks the pattern-map corpus failure as resolved

## Per-file quirk ledger (input for the 06-22 ledger)

Pins are per file: classification rows with the quality split (exact / role / partial / none), `###` groups, Shared Patterns entries, fenced excerpts and No Analog Found entries, each counted with awk over the last cell of each classification row and grep over fence lines.

| Lendshed file | Quirks it keeps | Pins |
|---|---|---|
| `milestones/v1.0-phases/02-shed-inventory-health` (Task 1) | blockquoted mapper's note with a bold lead; five `###` groups under File Classification; bold file cells and bold analog cells; a `**partial — read the caveat**` row whose assignment has a blockquoted `⚠` caveat with two labelled lists; brace-expanded file cells (`counter-{quiet,steady,over}.json`, `ui/{card,...}.tsx`); a pathless "unit tests in `…`" row; two pathless config rows; a generated-primitive row with no No Analog entry; `**Analog: NONE.**`; five shared rules (one with a ` — ` tail, two broad "every" rules, one glob); No Analog prose note plus table; "Notes Spanning Several Files" as a numbered list with sub-bullets and a trailing paragraph; Metadata block | 22 rows (6/4/4/8), 5 groups, 5 shared, 7 no-analog entries, 16 excerpts |
| `milestones/v1.0-phases/03-catalogue-browsing` | table with no preceding prose; long parenthetical qualifiers on exact and role rows; `(NEW hook)` style tags; three No Analog entries that match none-quality-free rows (one pathless, so an unplaced "new ground" row) | 9 rows (5/4/0/0), 0 groups, 4 shared, 3 no-analog entries, 2 excerpts |
| `milestones/v1.0-phases/04-shed-to-shed-transfers` | `~13` files-analyzed count, `partial-match` and `no analog` qualities, `exact (seam-shape)`, a wide dashed separator row, a No Analog entry that names a sub-part of an existing row | 13 rows (6/3/2/2), 0 groups, 4 shared, 3 no-analog entries, 2 excerpts |
| `phases/01-member-sign-in-sessions` | `exact — modify in place` qualifiers, a `DELETE wholesale` row with `n/a` quality and dashes in role and flow, a `none in-repo` partial row, inline-labelled shared patterns (no fences) | 12 rows (6/3/1/2), 0 groups, 4 shared, 2 no-analog entries, 4 excerpts |
| `phases/02-roles-and-permissions` | parenthetical files-analyzed breakdown, `role-match, structural`, a `none close` row, assignment headings combining two paths and mixing NEW/MODIFIED tags, a shared heading with code spans and a `throw` clause, a pure-module analog | 11 rows (8/2/0/1), 0 groups, 4 shared, 1 no-analog entry, 3 excerpts |
| `phases/03-account-admin-and-sessions` | `same file, …` analog cells, a file cell with a "+name" parenthetical list, two No Analog entries whose rows are role-match (so none count is 0), an assignment whose heading is a file with no fence | 10 rows (7/3/0/0), 0 groups, 3 shared, 2 no-analog entries, 3 excerpts |
| `phases/04-bulk-loan-export` | preface paragraph before the table, "(suggested)" tags, all rows exact or role-match, topical assignment headings with a `**Files:**` line (so they appear as unplaced guidance rows), shared patterns with a plural `**Sources:**` line, one No Analog entry with a "(…details only)" suffix | 14 rows (11/3/0/0), 0 groups, 3 shared, 1 no-analog entry, 2 excerpts |

## Decisions Made

- Row counts and quality splits differ from the reference on purpose (22 / 6-4-4-8 against 26 / 7-3-5-11 for the richest map) so no pinned number is carried over (D-06); every pin was counted by awk and grep in the Lendshed file and the extractor then agreed on the first run for all seven files.
- Labelore's `06-PATTERNS.md` is pinned as 28 rows (18 / 7 / 1 / 2), 5 shared, 12 excerpts; D-18 says it is re-pinned whenever planning changes it, and the guard's header comment says so.
- The corpus walk guards minimums and found-ness rather than a total, in line with R6 and R8; only this plan writes PATTERNS files, so the every-file-must-be-pinned rule stays on.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The corpus-guard rewrite and the Labelore 06 pin moved into Task 1's commit**
- **Found during:** Task 1
- **Issue:** Task 1's verify runs the corpus guard and requires a clean gate, but the guard already failed on the missing `06-PATTERNS.md` pin (a deferred item); the plan assigns that pin to Task 2.
- **Fix:** rewrote the guard's walk and keys and added the `LB:` 06 entry in Task 1, then Task 2 added the six remaining Lendshed entries and raised the Lendshed minimum from 1 to 7.
- **Files modified:** `test/web/pattern-map-corpus.test.ts`
- **Verification:** `npm run test:gate` on the Task 1 files gave failed 0 skipped 0
- **Committed in:** bf17c55 and 7987d60

**2. [Rule 2 - Missing critical] Reworded fixture prose after a similarity scan (T-06-15)**
- **Found during:** Task 1, then checked on all seven files
- **Issue:** the first draft of the richest map shared about 4.2 percent of its word 6-grams with the reference, including a few prose runs ("do not copy this analog's mechanism", "an anti-precedent (User=root)", "just budget the task for it").
- **Fix:** reworded those runs; shared text fell to 3.5 percent and the other six files read 2.3 to 5.1 percent, mostly table headers and mapper-template labels.
- **Files modified:** the seven Lendshed PATTERNS files
- **Verification:** scan plus deny-list grep plus a vocabulary grep (backend/, frontend/, `.rs`, tier, rclone, tokio, cargo) all clean
- **Committed in:** bf17c55 and 7987d60

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** both needed to keep Task 1's own gate green and the plan's threat model satisfied; no scope creep.

## Issues Encountered

- 25 unit tests in the files listed in `deferred-items.md` still fail in a full run (`project-research` 14 and 7, `drawer` 1, `summary-run-corpus` 2, and `ascii-graph` timing 1 in this run); none is in this plan's scope.
- Playwright prints the Vite HMR port 24678 conflict at startup because two dev servers share it (pre-existing); the run passes.
- The extractor clips every line to 8,000 characters, so the long line in the hostile body stops growing once it passes that; the growth test keeps the other two thirds of the body linear and says so in its comment (measured ratio 6.4).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The pattern-map family is done on Lendshed; the quirk ledger above feeds 06-22.
- 06-22's standing leak test should treat the mapper-template labels shared with the reference (table headers, "Analog search scope") as structural.
- Whoever next edits `.planning/phases/06-trustworthy-tests-and-security-baseline/06-PATTERNS.md` must update its `LB:` pin in `test/web/pattern-map-corpus.test.ts`.

## Known Stubs

None.

## Self-Check: PASSED

- All 11 created or modified files exist; commits `bf17c55` and `7987d60` are on `master`.
- Acceptance greps: gate/skip grep empty (baseline 14 lines), deny-list grep empty (baseline 8), timing grep empty (baseline 2 and 2), `LB:phases/06-…/06-PATTERNS.md` count 1, seven `*-PATTERNS.md` files, Task 1 `FX:` grep count 1.
- Plan verification: `npm run test:gate` over the three unit files exits 0 with `skipped=0 todo=0` (49 tests); the patterns browser spec passes 2 of 2 with none skipped; `npm run lint` and `npm run typecheck` exit 0.

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-26*
