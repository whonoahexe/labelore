---
phase: 06-trustworthy-tests-and-security-baseline
plan: 02
subsystem: testing
tags: [vitest, redos, growth-ratio, linkify, security, scanners]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "plan 06-01 fail-loud fixture and zero-skip test gate"
provides:
  - "test/helpers/growth.ts: GROWTH_LIMIT (24), bestOf, measureGrowth; best-of-5 time at n and 8n, with retry, noise floor and cache-aware size cap"
  - "src/rendering/linkify.ts: exported REFERENCE_TOKEN with bounded quantifiers, linear on capital and digit runs"
  - "test/rendering/linkify-growth.test.ts: legacy regex kept as a positive control, eight hostile shapes, behaviour pins"
  - "test/scanner-growth.test.ts: growth tests for the section, register and mention scanners (54 tests)"
  - "section-projection and security-register timing tests asserting growth instead of a millisecond budget"
affects: [06-05, 06-06, 06-07, 06-08, 06-09, 06-10, 06-11, 06-12, 06-13, 06-14, 06-15, 06-16, 06-17, 06-18, 06-19, 06-20, 06-21, 06-22]

actuals:
  tokens: 7600
  tasks: 2
  commits: 3
plan_head_before: 3336bb7378d1a1a049060f21cd48fab3f544b73a
plan_head_after: fd57059624572eabc15c6725db955db85d0d55f6

tech-stack:
  added: []
  patterns:
    - "Growth-ratio timing: ratio of best-of-5 times at n and 8n, limit 24, planted quadratic and linear controls prove the harness"
    - "A pre-fix pattern kept as a literal in the test is the positive control for its own fix"
    - "Inputs built in make(n) outside the timed region; n counts characters so every shape reaches the same size"

key-files:
  created:
    - test/helpers/growth.ts
    - test/helpers/growth.test.ts
    - test/rendering/linkify-growth.test.ts
    - test/scanner-growth.test.ts
  modified:
    - src/rendering/linkify.ts
    - src/planning-repo/mentions.ts
    - test/section-projection.test.ts
    - test/security-register.test.ts

key-decisions:
  - "Bounded quantifiers (31 further characters on the capital prefix, 16 digits per numeric part) rather than a lookbehind guard, which changed six results across the repo corpus"
  - "The growth harness reports ratio 1 when the big run takes under 1 ms (floorMs); a test whose size cap is so low that even a quadratic would be fast passes floorMs 0"
  - "Default size cap lowered from the plan's 4M to 256 KB so memory-bound scans stay in the private L2 cache"
  - "A reading at or above 24 is re-measured up to three times and the lowest kept; planted quadratics pass attempts 1"

patterns-established:
  - "Caps are not growth: shapes stay below the size caps the scanner enforces (register rows capped at 3000, kept under 1500)"
  - "Count regex matches in a loop in timing tests; collecting them into an array adds allocation that itself reads super-linear"

requirements-completed: [SEC-01, TEST-01]

coverage:
  - id: D1
    description: "A growth harness reads a planted nested loop above 24 and a planted single loop below 24"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "test/helpers/growth.test.ts#reads a planted nested loop above the limit"
        status: pass
      - kind: unit
        ref: "test/helpers/growth.test.ts#reads a planted single loop below the limit"
        status: pass
    human_judgment: false
  - id: D2
    description: "The pre-fix link-scanner regex is flagged as super-linear by the harness on a long run of capitals"
    requirement: SEC-01
    verification:
      - kind: unit
        ref: "test/rendering/linkify-growth.test.ts#is flagged as super-linear by the harness on a long run of capitals"
        status: pass
    human_judgment: false
  - id: D3
    description: "REFERENCE_TOKEN stays linear on capitals, digits, A1, AB-, 1., .planning/ plus dots, Phase plus spaces and repeated Phase, and through the whole rehype plugin"
    requirement: SEC-01
    verification:
      - kind: unit
        ref: "test/rendering/linkify-growth.test.ts#REFERENCE_TOKEN growth (eight shapes) and #shows linear growth through the whole plugin on a long run of capitals"
        status: pass
    human_judgment: false
  - id: D4
    description: "WR-03, 05-02 and D-12 still link after the fix; a 40-capital prefix does not, even when registered"
    requirement: SEC-01
    verification:
      - kind: unit
        ref: "test/rendering/linkify-growth.test.ts#still links WR-03, 05-02 and D-12 in ordinary prose"
        status: pass
      - kind: unit
        ref: "test/rendering/linkify-growth.test.ts#does not link a 40-capital prefix even when that exact identifier is registered"
        status: pass
      - kind: unit
        ref: "test/rendering/references.test.ts and test/rendering/markdown.test.ts (unchanged, 0 edits)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Section scanners, register extractor and mention scanner show growth under 24 on table rows, heading pairs, long lines and capital or digit runs"
    requirement: SEC-01
    verification:
      - kind: unit
        ref: "test/scanner-growth.test.ts (54 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No absolute millisecond budget remains in test/section-projection.test.ts or test/security-register.test.ts"
    requirement: TEST-01
    verification:
      - kind: other
        ref: "git grep -cE 'performance\\.now|Date\\.now' -- test/section-projection.test.ts test/security-register.test.ts (no match)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-10-25
status: complete
---

# Phase 6 Plan 02: Growth Harness and Linear Link Scanner Summary

**A best-of-5 growth-ratio harness proven on planted quadratic and linear controls, the quadratic link-scanner pattern in `linkify.ts` replaced with bounded quantifiers behind a failing-first test, and every section, register and mention scanner given a hostile-input growth test.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-10-25T13:19:00Z
- **Completed:** 2026-10-25T13:44:00Z
- **Tasks:** 2
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- `measureGrowth` times a function at n and 8n (best of 5 after a warm-up, inputs built outside the timed region) and reports the ratio; a linear scan reads about 8, a quadratic one about 64, the limit is 24.
- `REFERENCE_TOKEN` is exported and bounded, so a long run of capitals or digits no longer makes link scanning quadratic (SEC-01). The pre-fix pattern is kept in the test as `LEGACY_REFERENCE_TOKEN`, and the harness reads it at 63.7 on capitals.
- 54 growth tests cover `extractDiscussionLog`, `extractReviewWarnings`, `parseDecisionEntries`, `splitSections`, `splitSubsections`, `parseMarkdownTable`, `parseChecklistItems`, `extractSecurityRegister` and `scanMentions`, closing 05-SECURITY closing note 1.
- The two scanner timing files assert growth ratios; no `performance.now` or `Date.now` is left in either.

## Failing run before the source change (acceptance criterion)

`test/rendering/linkify-growth.test.ts` was written first. With `REFERENCE_TOKEN` exported but still the unbounded pre-fix pattern (an export-only edit, no behaviour change), the run read:

| Case | Result |
| --- | --- |
| stays linear on a run of capitals | failed, ratio 64.0 |
| stays linear on a run of digits | failed, ratio 63.7 |
| stays linear on an A1 run | failed, ratio 63.5 |
| does not link a 40-capital prefix (registered) | failed, 1 control produced instead of 0 |
| linear growth through the whole plugin on capitals | failed, ratio 63.8 |
| finishes a 200,000-capital text node | failed, 27.9 s against a 5 s test limit |
| the other five exported-token shapes, legacy control, behaviour pins | passed |

Result of the 6 failed, 7 passed run. After the bounded pattern: 13 of 13 pass, and the 200,000-capital node finishes instantly.

## Task Commits

1. **Task 1: Growth harness proven on planted controls, then the link scanner made linear behind a failing-first test** - `cb53139` (fix, tracer)
2. **Task 2: Growth tests for the section and mention scanners, and the two scanner timing files converted** - `337f0f6` (test)
3. **Harness hardening found while running the whole suite** - `fd57059` (fix)

Tracer gate: the Task 1 verify command was automated-only and passed end to end before Task 2 started.

## Files Created/Modified

- `test/helpers/growth.ts` - GROWTH_LIMIT, bestOf, Growth, measureGrowth (with attempts, floorMs and a per-sample call multiplier)
- `test/helpers/growth.test.ts` - planted nested-loop and single-loop controls, floor and bestOf behaviour
- `src/rendering/linkify.ts` - `export const REFERENCE_TOKEN` with `{1,31}` and `{1,16}` bounds, comment records the lookbehind rejection
- `test/rendering/linkify-growth.test.ts` - legacy control, eight hostile shapes, three behaviour pins, whole-plugin growth
- `test/scanner-growth.test.ts` - growth tests per scanner family
- `src/planning-repo/mentions.ts` - push mentions in a loop instead of spreading
- `test/section-projection.test.ts`, `test/security-register.test.ts` - the three fixed-budget tests converted

## Decisions Made

- Bounded quantifiers over a lookbehind: the lookbehind is faster but changed six results in the repo corpus, so the bounded form is the exact-parity fix.
- A 40-capital prefix now fails to match at all instead of matching and resolving to nothing; the test registers that exact identifier so the pin is meaningful.
- Size cap, retry, floor and call multiplier added to the harness (see Deviations 2); the limit itself stays 24.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `scanMentions` threw a stack overflow on a document with about 100k or more mentions**
- **Found during:** Task 2 (scanMentions growth on repeated mentions and many short lines)
- **Issue:** `all.push(...scanArtifact(artifact))` passes every mention as a call argument, so one huge document made `scanMentions` throw `RangeError: Maximum call stack size exceeded`. Not a timing problem, but a crash on the very hostile input this plan covers (T-06-05).
- **Fix:** push in a loop. Behaviour and ordering are unchanged (the list is sorted afterwards).
- **Files modified:** src/planning-repo/mentions.ts; regression test `returns every mention instead of overflowing the stack` (200,000 mentions) added to test/scanner-growth.test.ts
- **Verification:** the two failing growth tests pass; test/mentions.test.ts unchanged and green
- **Committed in:** 337f0f6

**2. [Rule 1 - Bug] The growth harness flaked on linear code under a full parallel run**
- **Found during:** plan-level verification (full `vitest run`, three runs)
- **Issue:** as specified, linear scanners read 24 to 66 on some shapes. Two causes were measured, neither algorithmic: collecting regex matches into an array in the link test (ratio 20 against 7 for a counting loop), and memory-bound scans that leave the L1 or L2 cache between n and 8n (ratio 25 to 30 in isolation, 40 to 60 with sixteen workers sharing the L3 cache). The defect would have made 20+ later conversions flaky.
- **Fix:** default `maxSize` lowered from 4M to 256 KB; `attempts` (re-measure a reading at or above 24, keep the lowest; a quadratic reads 63 to 64 every time); `floorMs` (a big run under 1 ms reports ratio 1; 0 turns it off); a per-sample call multiplier for runs below the noise floor; scanner shapes sized in characters; the link test counts matches in a loop. The 24 limit is unchanged and the planted nested loop, the legacy regex and the unbounded legacy pattern at default settings still read above 63.
- **Files modified:** test/helpers/growth.ts, test/helpers/growth.test.ts, test/rendering/linkify-growth.test.ts, test/scanner-growth.test.ts, test/security-register.test.ts
- **Verification:** the plan's eight-file verify run 5 times and the whole unit suite 3 times: only the 25 known failures, none from this plan
- **Committed in:** fd57059

**3. [Rule 2 - Missing critical] The exported-token cases passed vacuously before the export existed**
- **Found during:** Task 1, first failing-first run
- **Issue:** `text.matchAll(undefined)` becomes the pattern `/(?:)/g`, which is linear, so three cases passed with the token missing, which would have hidden a broken or removed export.
- **Fix:** the test's `scan` helper throws unless it receives a global `RegExp`.
- **Files modified:** test/rendering/linkify-growth.test.ts
- **Verification:** with the export-only edit the exported-token cases fail for the right reason (table above)
- **Committed in:** cb53139

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** deviation 1 adds one source file to the plan's file list (`mentions.ts`, a four-line change); deviation 2 changes the harness defaults the plan listed (cap 4M, no retry, no floor). Both are needed for the tests to be trustworthy; no scope creep.

## Issues Encountered

- 25 unit tests in five files still fail on this plan's starting commit (listed in `deferred-items.md`); a full run shows the same 25 and nothing else.
- `test/rendering/ascii-graph.test.ts` failed once in a full parallel run on an absolute 250 ms budget ("expected 274 to be less than 250") and passes alone. Out of scope (not a file of this plan); added to `deferred-items.md` for the family plan that converts the figure timing tests.
- The pre-hook branch check reports `master` as protected; `git.allow_default_branch_commits` is true in `.planning/config.json`, which the guard honours.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or trust-boundary surface; T-06-04 and T-06-05 are mitigated as planned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 06-05 onward can convert their own timing tests with `measureGrowth`; the rules for callers (inputs from `make(n)`, shapes below size caps, count matches in a loop, `floorMs: 0` when the cap is very low) are in the header of `test/helpers/growth.ts`.
- `test/rendering/ascii-graph.test.ts` is the next known absolute-budget flake.

## Self-Check: PASSED

- Created files exist: test/helpers/growth.ts, test/helpers/growth.test.ts, test/rendering/linkify-growth.test.ts, test/scanner-growth.test.ts
- Commits `cb53139`, `337f0f6`, `fd57059` are ancestors of HEAD
- Plan verification: eight-file vitest run passes with no skips, `npm run typecheck` and `npx eslint test src` exit 0

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-25*
