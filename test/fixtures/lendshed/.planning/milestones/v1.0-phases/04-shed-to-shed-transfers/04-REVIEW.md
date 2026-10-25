---
phase: 04-shed-to-shed-transfers
reviewed: 2026-03-16T20:30:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - docs/index.md
  - docs/design/transfer-state-machine.md
  - server/src/api/transfers.ts
  - server/src/jobs/executors/transfer.ts
  - server/src/transfers/confirm.ts
  - server/src/transfers/expiry.ts
  - server/src/transfers/ledger.ts
  - server/src/transfers/log-entry.ts
  - server/src/transfers/shed-pair.ts
  - server/src/transfers/state.ts
  - server/test/ledger-race.test.ts
  - server/test/log-entry.test.ts
  - server/test/transfer-confirm.test.ts
  - server/test/transfer-expiry.test.ts
  - server/test/transfer-state.test.ts
  - web/src/transfers/ConfirmReceiptDialog.tsx
  - web/src/transfers/StartTransferPanel.tsx
  - web/src/transfers/TransferPage.tsx
  - web/src/transfers/TransferTimeline.tsx
  - web/src/transfers/transfer-copy.ts
  - web/src/transfers/use-transfer.ts
findings:
  critical: 1
  warning: 11
  info: 6
  total: 18
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-03-16T20:30:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed the transfer slice: the executor and its job boundary, the four pure decision modules (`state`,
`shed-pair`, `expiry`, `log-entry`), the confirm flow that owns the lifecycle, the start panel and timeline,
and the ledger changes that carry transfer state.

Verified clean (do not re-investigate):

- **The state table is complete.** Every pair of (state, event) is either a listed transition or an
  explicit refusal; the exhaustiveness test fails when a state is added without a row.
- **Expiry is bounded.** `expireAt` only ever moves forward, and the sweep touches each row once per pass.
- **No member data in logs.** Every catch logs a fixed label; no log line carries a member id or a tool id.

What the review found: **one BLOCKER** — the loan-log entry is stamped with the receiving shed at confirm
time instead of the shed the tool left, which inverts the guard `log-entry.ts` documents as its main one. Plus
eleven warnings, concentrated in three places: the confirm flow's state machine has gaps a retry cannot
recover from, `shed-pair`'s check is weaker than its own comment, and two assertion gates in
`log-entry.test.ts` cannot fail against the defect they name.

## Critical Issues

### CR-01: The loan-log entry is stamped with the receiving shed, not the shed the tool left

**File:** `server/src/transfers/confirm.ts:521`, `:584-595`
(compare `:374`, `:408`, `:467`)

**Issue:** `confirmReceipt()` reads the transfer, waits for the receiving steward, and then builds the log
entry from `ctx.shedId`, which by that time is the shed the steward is signed in at. The shed the tool left
was captured at start and stored on the row, but the entry ignores it. Three of the four other readers use the
stored value, which is why the tests did not notice.

```ts
const entry = buildEntry({ toolId: row.toolId, shedId: ctx.shedId, at: now() });
```

**Fix:** stamp from the stored origin, the same value the start patch uses, and refuse the confirm when the
two disagree:

```ts
const entry = buildEntry({ toolId: row.toolId, shedId: row.fromShedId, at: now() });
```

## Warnings

### WR-01: Cancelling a pending transfer before validating it strands the tool in transit

**File:** `server/src/transfers/confirm.ts:367-385`

**Issue:** `startTransfer()` cancels the pending row first (lines 367-371) and validates the new request
afterwards. When validation fails, the early return leaves the tool marked in transit with no row to clear it.

**Fix:** validate before cancelling, and make every early exit restore the snapshot.

### WR-02: Any executor failure is reported as "receiving shed offline"

**File:** `server/src/jobs/executors/transfer.ts:508-512`, `:517`

**Issue:** The catch block always calls `fail('offline')`, which renders "The receiving shed cannot be
reached". A bad row or a full disk gets the same message.

**Fix:** record whether the first reply arrived and branch on it.

### WR-03: Switching transfers resets the ledger but not the page's own flags

**File:** `web/src/transfers/TransferPage.tsx:217-222`;
`web/src/transfers/StartTransferPanel.tsx:479-485`;
`web/src/transfers/use-transfer.ts:211-217`

**Issue:** A change of transfer id clears the ledger singleton, but `status`, `stage`, `startedAt` and
`cancelled` live in the hook and survive into the next transfer. Three are hidden by a ledger value that was
reset. `cancelled` is not, so a new transfer opens with the previous one's cancel notice.

**Fix:** give the hook a `resetSession()` and call it from the same place that resets the ledger.

### WR-04: `parseShedPair` accepts a bare string and the executor then shares the caller's array

**File:** `server/src/transfers/shed-pair.ts:105-112`;
`server/src/jobs/executors/transfer.ts:475-478`, `:621`

**Issue:** The check that the pair is a list is `typeof pair.length === "number"`, which a string also
satisfies. A string is then spread into characters, and the copy handed to the executor aliases the array the
caller still owns.

**Fix:** prove it is an array with `Array.isArray`, and copy before handing it on.

### WR-05: An unchecked cast to `ShedCode` rewrites codes of the wrong length

**File:** `server/src/transfers/shed-pair.ts:112`;
`server/src/transfers/ledger.ts:61`

**Issue:** `parseShedPair` accepts any string and casts it to the four-character `ShedCode`. A longer code is
cut to four characters by the ledger column, and two different sheds can end up with the same stored code.

**Fix:** refuse a code that is not exactly four characters.

### WR-06: A pair with a third shed is trimmed silently instead of refused

**File:** `server/src/transfers/shed-pair.ts:59`, `:84`

**Issue:** The guard is `pair.length < 2`, and the payload is built from the first two entries. A third entry
is dropped without a word.

**Fix:** require exactly two entries at the producer, matching the validator.

### WR-07: The confirm dialog starts a timer during render

**File:** `web/src/transfers/ConfirmReceiptDialog.tsx:217-222`

**Issue:** The dialog calls `startCountdown()` in its render body when the transfer changes. That call sets
state and arms an interval, so a strict-mode double render arms two.

**Fix:** derive the countdown from the transfer's `expireAt` instead of starting it, or start it in an effect.

### WR-08: The log-entry scrub test only looks at a variable called `failure`, so renaming it turns the check off

**File:** `server/test/log-entry.test.ts:304-317` (line 307)

**Issue:**
The test searches the source for `logger.error(..., failure)` and then asserts nothing sensitive is passed.
If the catch variable is renamed, the search matches nothing, the loop body never runs, and the test passes.

```ts
const hits = source.match(/logger\.error\([^)]*\bfailure\b/g) ?? [];
for (const hit of hits) expect(hit).not.toContain('memberId');
```

**Fix:** invert the trigger. Assert on every log call that its arguments come from a fixed allow-list.

### WR-09: "adds no extra timeline row" never counts rows

**File:** `server/test/log-entry.test.ts:406-417`

**Issue:** The test named "adds no extra timeline row and no trimming stage" greps the component for the word
`row` and passes whenever the file mentions it.

**Fix:** render the timeline and count its rows.

### WR-10: The module with the concurrency has no tests, though its test hook exists only for tests

**File:** `server/src/transfers/confirm.ts:105-116` (no test file for it)

**Issue:** `createClock` is documented as an injection point for tests and production never overrides it.
The only module with a race in it has no test that uses the hook.

**Fix:** add `confirm.test.ts` with a fake clock covering the stuck-in-transit path, cancel and complete in
both orders, and teardown.

### WR-11: "You can keep using the page" shows while the page is frozen

**File:** `web/src/transfers/StartTransferPanel.tsx:458-460`

**Issue:** The line "Working in the background — you can keep using the page." is shown for every stage,
including the two that run on the main thread and block it.

**Fix:** scope the claim to the stages where it is true.

## Info

### IN-01: `legCount` is computed and never read

**File:** `server/src/transfers/state.ts:88-89`, `:278`, `:293`;
`server/src/jobs/executors/transfer.ts:211-228`

**Issue:** The field is documented as the number of hops, but the executor's result type never carries it and
no row of the timeline shows it, so the counting at line 278 is dead work.
**Fix:** either surface it or delete it and its test assertion.

### IN-02: Three values returned from `useTransfer` have no consumer

**File:** `web/src/transfers/use-transfer.ts:647-659`

**Issue:** `status`, `stage` and `getRow` are returned and nothing destructures them.

### IN-03: Timeline rebuilds into plain arrays against the module's own rule

**File:** `web/src/transfers/TransferTimeline.tsx:253-275`, `:283-284`

**Issue:** The header says rows are kept in a fixed-size buffer to avoid reallocation, and the rebuild
creates a new array each pass.

### IN-04: Two small gaps in the start panel

**File:** `web/src/transfers/StartTransferPanel.tsx:152`, `:203`, `:465`

**Issue:** (a) the alert repeats the role the primitive already sets; (b) the refusal body has no heading when
the reason is null.

**Fix:** render a generic heading when the reason is null, or fold the two cases together.

### IN-05: The timeline's polite announcement may not hold inside a status region

**File:** `web/src/transfers/TransferTimeline.tsx:416`, `:232`

**Issue:** The header explains the elapsed time is silenced so that ticks do not interrupt a reader, but the
parent region announces every change anyway.

### IN-06: The prohibition greps cover five files, not the feature

**File:** `server/test/log-entry.test.ts:200-224`

**Issue:** `SOURCES` lists the executor, confirm, state, panel and timeline by hand. The new `expiry.ts` is
not on it.

**Fix:** enumerate the directory instead of hand-listing it.

---

_Reviewed: 2026-03-16T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
