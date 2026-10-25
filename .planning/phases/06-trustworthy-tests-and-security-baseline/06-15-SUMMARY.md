---
phase: 06-trustworthy-tests-and-security-baseline
plan: 15
subsystem: testing
tags: [fixtures, lendshed, debug-session, vitest, playwright, measureGrowth]
requires: [06-01, 06-02]
provides:
  - Four made-up Lendshed debug sessions (three live, one under resolved/) and a Lendshed debug/knowledge-base.md
  - Debug session, case view and corpus unit tests plus the debug page browser spec that read only in-repo files, with no skip
affects: [06-22]
tech-stack:
  added: []
  patterns: [fxPath for fixture reads, corpus walk with a minimum count, measureGrowth instead of a fixed ms budget, startFixtureServer with in-repo placements]
key-files:
  created:
    - test/fixtures/lendshed/.planning/debug/loan-history-picks-wrong-shed.md
    - test/fixtures/lendshed/.planning/debug/receipt-email-never-sent.md
    - test/fixtures/lendshed/.planning/debug/reservation-holds-lost-on-reconnect.md
    - test/fixtures/lendshed/.planning/debug/resolved/door-sensor-stops-after-wifi-drop.md
    - test/fixtures/lendshed/.planning/debug/knowledge-base.md
  modified:
    - test/debug-session.test.ts
    - test/web/debug-case.test.ts
    - test/web/debug-case-corpus.test.ts
    - test/e2e/debug-page.spec.ts
  deleted:
    - test/helpers/debug-corpus.ts
    - test/e2e/debug-fixture-server.ts
key-decisions:
  - "Every pin was recounted on the made-up file (evidence entries and tags by script over the file text, trigger lengths, round starts); the extractor's output was only compared afterwards"
  - "The corpus walk now covers exactly two roots, Labelore and the Lendshed project; the candidate list and sibling roots are gone, and the walk asserts at least six sessions and at least four Lendshed ones"
  - "The two fixed-budget tests became a plain 1 MB no-throw test plus measureGrowth linear-growth tests; the 8x input stays under the helper's 256 KB cap and the helper reports ratio 1 when the big input finishes in under a millisecond, as designed"
status: complete
commits: 4
plan_head_before: fb03dbcb0f941158406f2d199ec8d1eafb76ad5d
plan_head_after: bdbb8c800c372f8f59e97bb8be9536e13786ed24
actuals:
  tokens: 70000
  tasks: 2
  commits: 4
---

# Phase 6 Plan 15: Debug-session family on Lendshed Summary

The debug family no longer reaches any other project: the sibling-session helper and the per-family server are deleted, four made-up Lendshed sessions carry the four shapes the tests were built on, and all 70 debug unit tests and all 9 debug browser tests run with zero skips.

## What was done

- Task 1 (tracer, commit d4895f1, from the interrupted run): the awaiting-a-check session `loan-history-picks-wrong-shed.md` and the tests gated on it, retargeted through `fxPath`.
- Task 2 (this run, commit bdbb8c8, on top of the reviewed wip commit 8eb93c7 and the merge 96749a3): wrote `receipt-email-never-sent.md` and the Lendshed `knowledge-base.md`; kept the wip `reservation-holds-lost-on-reconnect.md` and `door-sensor-stops-after-wifi-drop.md` after checking them whole (complete, no leftovers, no scratch files, nothing from another project); retargeted every remaining sibling-keyed test; deleted `test/helpers/debug-corpus.ts` and `test/e2e/debug-fixture-server.ts`; moved the browser spec to `startFixtureServer` with seven in-repo placements; converted the two fixed-budget tests to `measureGrowth`.
- Verified: `npm run test:gate` on the three unit files prints `gate: total=70 passed=70 failed=0 skipped=0 todo=0`; `npx playwright test test/e2e/debug-page.spec.ts` passes 9 of 9 with none skipped; `npm run typecheck` is clean; the four acceptance greps print nothing (and the performance/Date.now count is 0); the debug folder holds 5 markdown files; a deny-list grep over the Lendshed debug folder (including `sfu`, `heartbeat`, `dwi`, home paths) prints nothing. A full unit run fails only in the files other plans own (project-research-lift, presentation/project-research, presentation/drawer) plus `test/server/deep-links.test.ts`, which passes alone and is load-sensitive.

## Lendshed sessions: the shape each stands for and the quirks it keeps (input for the 06-22 ledger)

- `loan-history-picks-wrong-shed.md` (awaiting a human check): status awaiting_human_verify, two evidence rounds with a divider (round starts at entries 1 and 4), 13 evidence entries tagged 3/0/1/9 (confirms at 3, 6, 12; fix at 11), two eliminated hypotheses, a reasoning checkpoint with four candidates, two causes (CODE, DATA/ENVIRONMENT), six verification chips with verdict accepted, five files, one "Constraints" other section; suspects 2 / 4 / 0; composer lead "Waiting on you" with a "What you need to check" block.
- `receipt-email-never-sent.md` (short diagnosed, find-root-cause-only): status diagnosed, four evidence entries tagged 1/1/0/2, two eliminated, causes PRIMARY and SECONDARY, a `(not applied ...)` fix with a `Direction:` list so the fix reads "Suggested fix · not applied", verification `(not applied ...)` so it is null, `files_changed: []`, no other sections; `updated` equals `created` so the page shows no Updated stamp; 153-character trigger (not folded); suspects 1 / 2 / 0.
- `reservation-holds-lost-on-reconnect.md` (resolved over five rounds, not archived): status resolved, 20 evidence entries tagged 6/1/3/10 spread over five rounds (dividers at entries 1, 9, 12, 16, 19), evidence written as inline `- timestamp: date — text` lines, three causes with the first two cut (over 260 characters) and the third not, a fix in two paragraphs and two lists, a verification sentence with no chips, six files, eleven other sections whose long headings get short names ("Second pass", "Third pass — fixes applied", ...), a 324-character trigger that folds, a slug and scope frontmatter; suspects 1 / 2 / 0.
- `resolved/door-sensor-stops-after-wifi-drop.md` (resolved, archived by its path): 15 evidence entries tagged 2/2/2/9 in one round (confirms 6 and 14, eliminates 7 and 9, fix 12 and 15), three eliminated hypotheses, a reasoning checkpoint, three causes marked `(1, primary, ...)`, `(2, ...)`, `(3, ...)` with only the first cut, a fix that opens with `APPLIED`, five verification chips with verdict accepted (including a nested-map chip and a multi-line scenario block that must not become a chip), eight files, four other sections (Context, Answers to open questions, Follow-up hook points, Field diagnostics), a 387-character trigger that folds and a timestamp with an offset (`updated` shows "18 Mar 2026 · 22:10"); Mandelbug bug class; suspects 3 / 3 / 0.
- `knowledge-base.md`: two entries (door sensor, reservation holds) in Labelore's knowledge-base shape; the corpus test pins it as an unrecognised kind, and the browser spec checks it is not a debug page.

## Deviations from Plan

### Judgment calls

**1. [Judgment] Evidence counts are smaller than the originals.** The made-up resolved sessions hold 15 and 20 evidence entries where the originals held 24 and 25. The plan allows trimming (D-17) and asks to keep the round count and shape: the five rounds, the 6/1/3/10 mix of tags, eleven other sections and the eight-file, three-cause shape all survive. All pins are recounted.

**2. [Judgment] Browser coverage widened.** The spec gained two tests (the five-round session and the archived door-sensor session) so every placed session is opened and asserted, not only the two the old spec asserted; the 420px suffix loop covers all six debug pages unconditionally.

**3. [Judgment] Growth ratio reads 1 on the hostile body.** The 256 KB cap in `measureGrowth` keeps the big input at about 0.7 ms, under its trust floor, so the ratio is reported as 1. That is the helper's designed behaviour for work this cheap; the 1 MB no-throw test and the comment-opener test sit alongside it.

None of these touched a pinned behaviour or loosened a test; no pin was deleted or skipped (D-02).

## Auth gates

None.

## Known Stubs

None.

## Threat Flags

None. T-06-22 mitigated: both sibling-reading helpers are deleted, the sessions are made up under R1-R4, the deny-list grep prints nothing, and nothing in the debug tests reads outside the repository.

## Self-Check: PASSED

- All five Lendshed debug files exist; `test/helpers/debug-corpus.ts` and `test/e2e/debug-fixture-server.ts` are gone.
- Commits d4895f1, 8eb93c7, 96749a3 and bdbb8c8 are on master.
