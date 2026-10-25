---
phase: "03"
depth: standard
status: issues
files_reviewed: 38
critical_count: 0
warning_count: 3
info_count: 4
reviewed_at: 2026-04-08T20:46:30Z
---

# Phase 3 Code Review: Account Admin & Session Control

## Summary

The steward-only rules this phase promised mostly hold. The last-steward rule is one check
(`stewardsLeft`, `server/src/members/guard.ts:210`) shared by demote, disable and delete, run inside the
same transaction as the write it protects, with a race test that starts two demotions at once. Refusing to
act on yourself happens before any transaction opens. Disable and delete remove sessions in the same
transaction, and the live-socket close and ticket purge run only after commit.

Three real gaps turned up, none in the core rules. A revoke signal can be dropped when the feed receiver
lags, so a disabled member's open socket survives longer than their API access. The member detail page tells
the steward nothing when a disable, enable or delete fails for any reason except the last-steward refusal.
And every account audit write is fire-and-forget, so a failed insert leaves no record at all.

## Warning Findings

### WR-01: A lagging feed receiver can drop a `session-revoked` close and leave a disabled member's socket open

**File:** `server/src/socket/index.ts:151-165`

**Issue:** `FeedBus` is one broadcast channel (buffer `FEED_BUFFER = 32`, `server/src/feed/bus.ts:54`)
shared by every live socket. It carries `grants-changed` and, new this phase, `session-revoked`. The
per-socket loop only notices lag when it next polls the feed arm. If the loop is busy sending a stock update
to a client that is slow to read, feed events pile up behind that receiver. Once more than 32 land, the next
read reports `lagged` and jumps ahead, and any `session-revoked` inside the skipped window is gone.

The `lagged` branch treats both event kinds the same: log and carry on. That is fine for `grants-changed`,
because the client refetches on its next navigation. It is wrong for `session-revoked`, where the event is
the only thing that ever closes the socket.

**Failure scenario:** A steward disables member A, whose socket is busy with a slow client. During that
stall, 32 other feed events fire (a bulk shed re-count would do it). A's close is skipped. A's API calls
are refused at once, but the socket stays open and keeps receiving stock updates until the client gives up.

**Suggested fix:** Give revokes their own delivery path that does not share the buffer, for example a map
from member id to open sockets that `disableMember` and `deleteMember` signal directly. Or treat `lagged` on
the feed arm as "re-check this member's session row before carrying on".

---

### WR-02: Disable, enable and delete on the member detail page say nothing when the request fails for any reason but the last-steward refusal

**File:** `web/src/pages/members/detail.tsx:184-191` (enable),
`195-210` (disable), `224-246` (delete)

**Issue:** All three actions branch on one refusal marker only:

```tsx
if (result.refusal === 'last-steward') {
  setNotice('You cannot remove the last steward.');
  return;
}
```

Any other failure (a 500, a dropped connection, an expired session) falls through with no message and the
button simply stops spinning. The steward cannot tell whether the member is now disabled.

**Failure scenario:** A steward responding to a lost-card report taps Disable during a flaky connection. The
request fails, nothing is shown, and they assume the card is blocked when it is not.

**Suggested fix:** Add a generic failure state to each of the three actions and show it beside the button,
with the same wording for all three.

---

### WR-03: Every account audit write is fire-and-forget, so a failed insert leaves no trace

**File:** `server/src/api/desk.ts:212, 259, 301, 344, 388, 431, 476`

**Issue:** Each new steward action (role change, grant change, disable, enable, create, passcode reset,
delete) writes its audit row with `void audit.write(...)` after the response is built. If the insert throws,
the rejection is swallowed.

**Failure scenario:** A steward deletes a departing volunteer's account while the database is briefly
read-only. The delete succeeds, the audit insert fails, and the log has no entry for who removed the member.

**Suggested fix:** At minimum log the discarded error with the action name and actor. Better, write the audit
row inside the same transaction as the change, so both succeed or neither does.

## Info Findings

### IN-01: No live race test for disable and delete holding the last-steward rule

**File:** `server/src/members/guard.ts`

**Issue:** `two_demotions_leave_exactly_one_steward` proves the rule for demotion under a real race. Disable
and delete call the same check but have no equivalent test.

**Suggested fix:** Add `two_disables_leave_exactly_one_steward` and a delete variant.

### IN-02: The delete path's socket-close and ticket-purge behaviour is not proven end to end

**File:** `server/test/desk-member-delete.test.ts`

**Issue:** `desk-session-revoke.test.ts` has a whole-path test for disable. The delete test checks only the
database rows.

**Suggested fix:** Copy the disable test's whole-path case for delete and assert the same close code and
ticket outcome.

### IN-03: `maxLength={64}` is a duplicated literal rather than the shared constant

**File:** `web/src/components/create-member-dialog.tsx:159,179`,
`web/src/components/reset-passcode-dialog.tsx:112,132`

**Issue:** `web/src/lib/passcode-rules.ts` exports `MAX_PASSCODE_LENGTH = 64` so the value has one home.
Both dialogs already import a validator from that file but write the literal `64` on their inputs. The
value is right today and drifts the day only one place changes.

**Suggested fix:** Import `MAX_PASSCODE_LENGTH` in both dialogs.

### IN-04: `HANDLE_MAX_LENGTH` in the create dialog repeats the server's `MAX_HANDLE_LEN`

**File:** `web/src/components/create-member-dialog.tsx:36`

**Issue:** `const HANDLE_MAX_LENGTH = 32;` is a local copy of a server constant with no comment tying them
together.

**Suggested fix:** Low priority while the value is static. Add a comment naming the server constant, or
serve the limit from the config route.

## Areas Reviewed Clean

- **Last-steward rule:** one post-state check (`stewardsLeft`) shared by demote, disable and delete, run
  inside the transaction it guards, with a race test for demotion (see IN-01 for the other two).
- **Self-action refusal:** `refuseSelf` runs before any transaction opens, for reset, disable and delete.
  The disabled buttons in the page are a convenience, never the source of truth.
- **Permission check first:** every `/api/desk/*` handler calls `requireSteward` as its first statement.
  The route coverage test fails the build when a new route has no stated capability.
- **Transaction scope:** session removal and the member row change share one transaction; the socket close
  and ticket purge happen after commit and never on a refusal path.
- **Sign-in enumeration:** unknown handle, wrong passcode and wrong passcode for a disabled member return
  identical status, headers and body, proven over real HTTP.
- **SQL:** every query in `members/guard.ts`, `api/desk.ts` and `jobs/audit.ts` binds its parameters.
- **Cookie flags:** `HttpOnly`, `Secure` and `SameSite=Lax` are unchanged by this phase.

---

_Reviewed: 2026-04-08T20:46:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
