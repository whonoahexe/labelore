---
phase: 04-shed-to-shed-transfers
fixed_at: 2026-03-17T22:12:00Z
review_path: .planning/phases/04-shed-to-shed-transfers/04-REVIEW.md
iteration: 1
fix_scope: warnings_only
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-03-17T22:12:00Z
**Source review:** `.planning/phases/04-shed-to-shed-transfers/04-REVIEW.md`
**Iteration:** 1
**Scope:** WR-01 through WR-11. CR-01 was fixed and committed earlier at `62f1a0e` and was left alone. IN-01
through IN-06 were out of scope; IN-06 turned out to matter and is recorded rather than fixed (see
"Discoveries" below).

**Summary:**

- Findings in scope: 11
- Fixed: 11
- Skipped: 0

Eight commits: one per finding, except WR-04 with WR-05 (one check, two defects) and WR-08 with WR-09 (one
test file, one kind of defect). WR-10 rode along with WR-01 because its race half is covered by the state
tests added there.

## Gates

| Gate | Result |
|---|---|
| `npm test -- server/test/transfer` | **61 passed / 6 files** (before: 49 / 5, nothing removed) |
| `npm test` (whole repo) | **3 failed / 412 passed (415)**, same 3 failures as before the run |
| `npx tsc --noEmit` | **zero** hits under `server/src/transfers` |
| `npx eslint server/src/transfers --max-warnings 0` | clean |

## Verification discipline

**Every assertion written or repaired in this pass was checked by breaking the code on purpose**: the defect
it names was put back, the suite was run and failed with the intended message, and the change was reverted.

Two of those runs show that the old checks could not fail:

- `catch (problem) { logger.error("…", problem); }` — the old scrub test looked for a variable called
  `failure`, so a different name made the loop body run zero times and the test passed.
- `` logger.error(`… ${other.memberId}`) `` — also missed, and it would have slipped past a comma-split check
  too, because the value sits inside the message string. The new check scans every `${…}`.

## Fixed Issues

### WR-01: Cancelling a pending transfer before validating it strands the tool in transit

**Files modified:** `server/src/transfers/confirm.ts`,
`server/test/transfer-confirm.test.ts`
**Commit:** `4be07a2`

Moved both validations above the cancel step. Both are plain returns that change nothing, so running them
after a cancel left the row at `in_transit` with no job alive to move it on: a timer that never stopped, a
confirm button that did nothing, and a tool nobody could check in. Order is the whole fix; reaching the
cancel now means the new transfer will start.

Also covers the rest of **WR-10**: five state tests (a refused start leaves the pending row alone; the same
for a bad pair; a startable request still replaces the pending one; a completion after cancel changes
nothing; teardown stops the clock).

*Checks:* putting the old order back failed the "pending row still pending" assertion, and failed the cancel
assertion on its own when the first was muted.

### WR-02: Any executor failure is reported as "receiving shed offline"

**Files modified:** `server/src/jobs/executors/transfer.ts`, `server/test/transfer-confirm.test.ts`
**Commit:** `a19c3d5`

Added `repliedRef`, set when the first reply from the receiving shed arrives. The catch block now picks
`fail(repliedRef.current ? "runtime" : "offline")`. The distinction is the only thing that tells a shed that
never answered from one that answered and then failed.

### WR-03: Switching transfers resets the ledger but not the page's own flags

**Files modified:** `web/src/transfers/use-transfer.ts`, `web/src/transfers/TransferPage.tsx`
**Commit:** `0f6e8b1`

`resetSession()` now clears `status`, `stage`, `startedAt` and `cancelled`, and the page calls it from the
same effect that resets the ledger. A new transfer no longer opens with the previous one's cancel notice.

### WR-04 / WR-05: `parseShedPair` admitted a bare string, and narrowed codes with an unchecked cast

**Files modified:** `server/src/transfers/shed-pair.ts`,
`server/test/transfer-state.test.ts`
**Commit:** `9d2c7e6`

`parseShedPair` now proves the input is an array and copies it before returning, and every code must be
exactly four characters or the pair is refused. The two defects shared one check, so one commit covers both.

### WR-06: A pair with a third shed is trimmed silently instead of refused

**Files modified:** `server/src/transfers/shed-pair.ts`, `server/test/transfer-state.test.ts`
**Commit:** `e8a41f3`

The producer now requires exactly two entries, matching the validator. A third entry is refused with
`pair_length`.

### WR-07: The confirm dialog starts a timer during render

**Files modified:** `web/src/transfers/ConfirmReceiptDialog.tsx`,
`web/src/transfers/TransferTimeline.tsx`
**Commit:** `35b9d0c`

The countdown is now derived from the transfer's `expireAt` and ticks from an effect with a cleanup. A
strict-mode double render arms one timer, not two.

### WR-08 / WR-09: Two test checks that could not fail against the defect they name

**Files modified:** `server/test/log-entry.test.ts`
**Commit:** `c7f26a8`

The scrub test now scans every log call and checks its arguments against an allow-list of fixed labels, so a
renamed variable no longer turns it off. The timeline test renders the component and counts rows instead of
searching for a word.

### WR-10: The module with the concurrency has no tests

**Commit:** `4be07a2` (folded into WR-01, as planned)

The remaining coverage is the five state tests listed under WR-01. The suite now covers every behaviour the
module's header calls load-bearing except the two-step yield, which every test exercises implicitly.

### WR-11: "You can keep using the page" shows while the page is frozen

**Files modified:** `web/src/transfers/StartTransferPanel.tsx`,
`web/src/transfers/StartTransferPanel.test.tsx` *(new)*
**Commit:** `7d03e9b`

The claim is scoped to the background stages. The two main-thread stages now say "Reading the shed list — the
page may pause briefly." instead of staying silent. A null stage reads as the first stage, exactly as the
stage label above it already does.

This is the feature's first component test.

## Skipped Issues

None.

## Discoveries recorded rather than fixed

**IN-06 matters, and there is a live leak behind it.** The prohibition greps scan five hand-listed files while
their messages read as statements about the whole feature. Widening the list to the directory would turn the
suite red on

```ts
// server/src/transfers/expiry.ts:87
logger.error("[expiry] sweep failed", failure);
```

— a raw caught object handed to a logger that is not gated to development, which is exactly the leak the new
scrub test is built to catch, sitting one file away from where it can see it. It is a phase 3 file and
outside this pass, so it was **recorded, not changed**, with the instruction to scrub it in the same change
that widens `SOURCES`.

**A stale branch from an interrupted earlier run was cleaned up.** `fix/04-leftover` still held two commits:
an earlier CR-01 attempt without tests, superseded by `62f1a0e`, and a half-done WR-01. It had diverged from
`main`, so it was not merged; the branch was removed and this pass started clean.

## Not touched (per the known-and-accepted list)

Blank dwell-time fields, the narrowed bounds assertion in `transfer-state.test.ts`, the 90-day expiry
constant, and the 3 repo-wide failures that predate this run.

---

_Fixed: 2026-03-17T22:12:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
