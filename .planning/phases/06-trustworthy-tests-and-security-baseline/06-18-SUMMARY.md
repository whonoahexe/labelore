---
phase: 06-trustworthy-tests-and-security-baseline
plan: 18
subsystem: testing
tags: [fixtures, notes, lendshed, playwright, vitest, growth-measurement]
requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "Shared fixture server (06-01/06-02), Lendshed notes and todos (06-16), todo family finish (06-17)"
provides:
  - "Lendshed heartbeat note: the sibling-only note shape now runs on a made-up file"
  - "test/helpers/note-corpus.ts with no sibling root and no home-directory path"
  - "Note unit, corpus, context and guard tests, and the note browser spec, all reading Lendshed, synthetic or Labelore notes"
affects: [06-22]
tech-stack:
  added: []
  patterns: ["measureGrowth ratio checks in place of fixed millisecond budgets", "per-root minimum counts in a corpus walk"]
key-files:
  created:
    - test/fixtures/lendshed/.planning/notes/2026-03-25-kiosk-version-heartbeat-on-start.md
  modified:
    - test/helpers/note-corpus.ts
    - test/note-lift.test.ts
    - test/web/note-page.test.ts
    - test/web/note-page-corpus.test.ts
    - test/presentation/note-context.test.ts
    - test/e2e/note-page.spec.ts
  deleted:
    - test/e2e/note-fixture-server.ts
    - test/fixtures/notes (12 copied files)
key-decisions:
  - "NOTE_ROOTS is [LB_ROOT, SYNTHETIC_ROOT, FX_ROOT]; NOTE_FILES gains a heartbeat key and HEARTBEAT_NOTE is exported through fxPath"
  - "The corpus walk asserts per-root minimums (Labelore 3, synthetic 2, Lendshed 9) and 14 in all"
  - "The note browser spec builds its placements from the notes/ and todos/ files of Lendshed, the synthetic fixture and Labelore's own .planning, every source required"
requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04]
duration: 40 min
completed: 2026-10-26
status: complete
actuals:
  tokens: 60000
  tasks: 2
  commits: 2
plan_head_before: 90651741654e4886e843ac6f8660256a6911bfc1
plan_head_after: 00e567bcd01e6ccecb989ad32c1118218b524d95
---

# Phase 6 Plan 18: Move the note family onto Lendshed Summary

**The note helper, five note unit test files and the note browser spec now read only Lendshed, the synthetic fixture and Labelore's own notes; the sibling roots, the home-directory path, the twelve copied private files and the old note server are gone, and nothing in the family skips.**

## Performance

- **Tasks:** 2 of 2
- **Files:** 1 created, 6 modified, 13 deleted (twelve copies plus the old server)

## Accomplishments

- Authored `notes/2026-03-25-kiosk-version-heartbeat-on-start.md` (a kiosk reporting its app version on every start) from the structure of the sibling heartbeat note, with every word made up. The sibling file was read for structure only.
- Rewrote `test/helpers/note-corpus.ts`: no `homedir`, no sibling roots, no sibling list, no sibling note path. `NOTE_FILES` and `NOTE_HOME` map every duet and portal key to its Lendshed note, plus a new `heartbeat` key. `HEARTBEAT_NOTE` is exported through `fxPath`.
- The heartbeat describe in `note-lift.test.ts` is now unconditional: title, labels `Constraint / Today / Open check`, and five mentions with `poller.py` counted twice.
- Recounted every pin on the Lendshed files (words by `wc -w`, dates and day counts by hand, counts by reading): for example Crop tool photos has 5 rows, 254 words, 1 mention; the brief has 14 points, 1 table, 40 lines, 4 figures, 1 flag.
- The four fixed 250 ms budgets in `note-lift.test.ts` are now `measureGrowth` ratio checks against `GROWTH_LIMIT`.
- `note-page-corpus.test.ts` asserts a minimum per root and 14 in all, and pins the heartbeat note's labels, file-name title and mentions.
- `note-page.spec.ts` uses `startFixtureServer(PLACEMENTS)`; the old server and `test/fixtures/notes/**` are removed.

## Task Commits

1. **Task 1 (tracer): note helper on Lendshed, heartbeat note, every unit test unconditional** - `af47415`
2. **Task 2: browser spec on the shared server, copied notes and old server deleted** - `00e567b`

## Heartbeat note quirks (input for the 06-22 ledger)

- Frontmatter has only `date` and `promoted: false`; no title, so the lift treats it as a quick note and the title is the first sentence.
- The first sentence holds a parenthesis with a semicolon and slash-separated names, and must not split there.
- The whole body is one long paragraph with three labelled clauses: `Constraint:`, `Today ...` (an opener sentence, not a label), and `Open check:`. Phrases like `Plan (kiosk only):`, `Call sites (all five):` and `Side finding for Ana (...):` must not become labels.
- Five mentions in order: `logs/access.log`, `src/kiosk/poller.py`, `src/kiosk/relay_client.py`, the bare `poller.py` counted twice, `src/kiosk/report_sender.py`. A `.toml` file name in the text is not a mention.
- Contains em dashes, backtick spans with `<version>` placeholders, a quoted `"No --header"` comment, a `?v=<version>` query string and a `/sync/pulse` route that must not be read as files.

## Deviations from Plan

### Judgement calls

**1. The sketches-note spec test re-pinned to Shipped / Done.** Found during: Task 2. The Labelore sketches note's own todo is now completed, so the spec's old `Todo open` / `Pending` pins were stale and failed before any fixture change mattered. Re-pinned to match the unit test, which already said Shipped. Commit `00e567b`.

**2. Test names and counts adjusted with the pins.** `six rows` became `five rows`, `three flags and two figure chips` became `one flag and no figure chips`, and so on, because the Lendshed notes are shaped differently (for example the crop note has five rows, the brief has one flag).

**3. Age pins are large numbers.** The sketch clock (23 Oct 2026) is far from the Lendshed dates (March 2026), so ages read `213 days` and `214 days`. The clock was left alone so the synthetic and Labelore notes keep their pins.

No auto-fixes were needed beyond the above.

## Verification

- `npm run test:gate -- test/note-lift.test.ts test/web/note-page.test.ts test/web/note-page-corpus.test.ts test/presentation/note-context.test.ts test/note-handler-guard.test.ts`: total=143 passed=143 failed=0 skipped=0 todo=0.
- `npx playwright test test/e2e/note-page.spec.ts`: 12 passed, 0 skipped.
- `npm run typecheck`: exit 0.
- Acceptance greps: the home-directory/sibling/runIf grep prints nothing; no `performance.now` or `Date.now` in `note-lift.test.ts`; the deny-list grep over the note files and `test/fixtures/lendshed` prints nothing; `git ls-files test/fixtures/notes` is empty; `test/e2e/note-fixture-server.ts` is gone.
- Full unit suite: 3532 of 3534 pass; the two failures are the known load-sensitive 250 ms tests in `test/rendering/ascii-graph.test.ts`, which pass alone (30 of 30) and are outside this plan.

## Known Stubs

None.

## Threat Flags

None. T-06-24 is mitigated: the sibling roots, the copied private notes and the old server are removed and the made-up heartbeat note replaces the sibling file.

## Self-Check: PASSED

- Commits `af47415` and `00e567b` are on master; `commits: 2` measured from the plan ledger.
- The heartbeat note and the rewritten helper exist; `test/e2e/note-fixture-server.ts` and `test/fixtures/notes` are absent.
