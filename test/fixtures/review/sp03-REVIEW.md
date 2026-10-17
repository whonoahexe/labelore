---
phase: "03"
depth: standard
status: issues
files_reviewed: 38
critical_count: 0
warning_count: 3
info_count: 4
reviewed_at: 2026-08-18T20:46:30Z
---

# Phase 3 Code Review: Account Administration & Session Control

## Summary

This phase is unusually well-engineered for the properties it claims to hold. The
last-admin invariant (D-12) is a single post-state predicate (`enabled_admin_count`,
`backend/src/authz/store.rs:343`) shared by `set_role`, `disable_user`, and
`delete_user`, run inside the same transaction as the write it guards, with a live
concurrency test proving it holds under a genuine race (`concurrent_demotions_of_
the_last_two_admins_exactly_one_succeeds`). Self-action refusal (D-11) is checked
server-side, before any transaction opens, and is unconditional regardless of admin
count. The delete cascade (sessions → permissions → users) and disable's session
wipe are transactional and covered by both unit tests and full-HTTP end-to-end
tests, including one that proves REST, `/ws`, and an already-minted download
ticket are all cut in a single disable call. Login enumeration safety (D-07/D-18)
is proven over real HTTP with both byte-identical-response and wall-clock-timing
assertions, including the new disabled-account branch. SQL is parameterized
throughout; no injection surface was found. The typed-handle delete confirmation
is an exact, case-sensitive match with no `trim`/`toLowerCase`. The "this is you"
session marker is computed server-side from the `HttpOnly` cookie and rendered
verbatim by the client.

Three real gaps were found, none of them in the core invariants: a WS
`SessionRevoked` signal can be silently dropped under identity-bus lag, leaving a
disabled/deleted account's live socket open past the moment REST access is cut;
the account-detail page gives the operator zero feedback when a disable/enable/
delete call fails for any reason other than the last-admin refusal; and every
account-lifecycle audit write is fire-and-forget, so a failed `INSERT` leaves no
trace and no signal that it failed. None of these compromise the core security
invariants (last-admin, self-action, authorization-first, SQL safety), but the
first two both touch this phase's own headline promise — "cuts them off
immediately."

## Warning Findings

### WR-01: A lagged identity-bus receiver can silently drop a `SessionRevoked` close, leaving a disabled/deleted member's `/ws` connection open

**File:** `backend/src/ws/mod.rs:151-165`

**Issue:** `IdentityBus` is one `tokio::broadcast` channel (capacity
`IDENTITY_BUS_CAPACITY = 64`, `backend/src/ws/identity_bus.rs:54`) shared by every
live `/ws` connection, carrying both `PermissionsChanged` and (this phase's new)
`SessionRevoked`. `handle_socket`'s per-connection loop only detects a lag by
polling `identity_rx.recv()`, which is one arm of a `tokio::select!` alongside the
health-bus arm and the incoming-message arm. If this connection is not currently
polling (e.g. it is blocked awaiting `socket.send()` in the health-bus arm because
the client isn't draining its TCP receive buffer), broadcast events queue up
against this receiver specifically. Once more than 64 identity-bus events land
system-wide while this one connection isn't consuming, `rx.recv()` next returns
`Err(RecvError::Lagged(skipped))` and the receiver's cursor jumps straight to the
oldest still-buffered message — any `SessionRevoked` event that fell inside the
skipped window is gone, never delivered to this connection. The `Lagged` arm
(lines 151-165) treats this identically for both event kinds: log a warning and
continue the loop, with the comment reasoning "a missed signal costs this
connection one refetch it will pick up on its next navigation anyway." That
reasoning is sound for `PermissionsChanged` (the client re-derives via a future
fetch) but does not hold for `SessionRevoked` — a revoked WS connection has no
"next navigation" that re-derives closure; the close signal *is* the only
mechanism ADMIN-03/T-03-04 defines for ending the socket. Once the event is
skipped, nothing else in this loop will ever close that connection (short of the
30-day session sweep or the client disconnecting on its own).

**Failure scenario:** An admin disables member A, who is holding an open `/ws`
connection whose read/write loop happens to be stalled on `socket.send()` at that
exact moment (a slow or non-draining client is enough to cause this — no
adversarial timing is required, just an unlucky/slow client). If, during that
stall, 64 or more `PermissionsChanged`/`SessionRevoked` events fire for *other*
members (plausible during a bulk `backstage` script run, or simply a busy studio
session with several admins working the Role/Access grid concurrently), A's
`SessionRevoked` event is dropped by the lag jump and A's socket is never closed.
A's REST access is still cut immediately (the session row is deleted, and every
REST route re-queries `sessions` per request), and the socket by design (D-10)
carries no tier-scoped file data — but the "the live `/ws` connection... stops
working" half of the disable contract (03-UI-SPEC, `disable_user`'s own doc
comment at `authz/store.rs:413-420`) is not actually unconditional.

**Suggested fix:** Give `SessionRevoked` its own smaller, targeted delivery path
that does not share fate with a possibly-lagged broadcast receiver — for example,
track live connections by `user_id` in a side map (`Arc<Mutex<HashMap<i64, Vec<...>>>>`
of cancellation handles/senders) that `disable_user`/`delete_user`'s HTTP handlers
signal directly, independent of `IdentityBus`'s buffer depth. Alternatively, treat
a `Lagged` result on the identity-bus arm as "must re-verify," not "safe to
ignore": on `Lagged`, re-check this connection's own session/`disabled_at` state
directly (a cheap point lookup) before continuing the loop, so a skipped
`SessionRevoked` is caught by a fallback check rather than lost entirely.

---

### WR-02: Disable/Enable/Delete on `/admin/users/{id}` give the operator no feedback when the request fails for any reason other than the last-admin refusal

**File:** `frontend/app/admin/users/[id]/page.tsx:184-191` (enable),
`195-210` (disable), `224-246` (delete)

**Issue:** All three mutations only branch on one specific refusal marker:

```tsx
// submitDisableAccount, lines 201-206
const outcome = await setAccountDisabled(true);
setAccountPending(false);
if (!outcome.ok && outcome.refusal === "last_admin_refused") {
  setDisableLastAdminAlert(true);
}
// self_action_refused is structurally unreachable... — no separate handling

// submitDeleteAccount, lines 229-242 (delete's dialog stays open through the
// request per its own doc, but still only checks one marker)
const outcome = await deleteMember();
setDeletePending(false);
if (outcome.ok) { router.push("/admin"); return; }
setDeleteConfirmOpen(false);
if (outcome.refusal === "last_admin_refused") {
  setDeleteLastAdminAlert(true);
}

// handleEnableAccount, lines 184-191 — no refusal handling of any kind
await setAccountDisabled(false);
setAccountPending(false);
```

`useAdminMemberDetail`'s `setAccountDisabled`/`deleteMember` (`frontend/lib/
use-admin-users.ts:496-531`, `597-617`) return `refusal: null` for every failure
that is not the one named marker — a network error, a 500, a 404 (the target was
deleted by a second admin between page load and click), or a transient DB error
all collapse to `{ ok: false, refusal: null }`. None of the three handlers above
render anything for that case. Contrast this with `create-member-dialog.tsx` and
`reset-password-dialog.tsx`, which both define and render an explicit
`genericFailure` `Alert` ("Couldn't create the account. Try again." /
"Couldn't reset the password. Try again.") for exactly this catch-all case — the
account-detail page's three account-lifecycle actions never got the equivalent
treatment. `admin-summary.ts` defines `LAST_ADMIN_REFUSAL_MESSAGE`,
`DISABLE_LAST_ADMIN_REFUSAL_MESSAGE`, and `DELETE_LAST_ADMIN_REFUSAL_MESSAGE`, but
no generic-failure string for any of the three actions.

**Failure scenario:** An admin, responding to a compromised-account incident,
clicks "Disable account" on `/admin/users/{id}`. The request hits a transient
error (SQLite busy, a dropped connection, a 500). `submitDisableAccount` already
closed the confirmation dialog before the request fired (by design, per this
variant's own doc comment), the pending spinner clears, and the page renders
exactly as it did before the click — `Active` badge, `Disable account` button,
no alert anywhere. The admin has no signal the action failed and may reasonably
believe the account is now disabled when it is not. The same applies to Delete
(dialog closes, no navigation, no alert — the member is still on the page,
indistinguishable from a cancel) and Enable (silently does nothing observable).

**Suggested fix:** Add a `genericFailure`-style state to each of the three
handlers, mirroring `create-member-dialog.tsx`'s existing pattern: render a
neutral `Alert` ("Couldn't disable this account. Try again." / "Couldn't enable
this account. Try again." / "Couldn't delete this account. Try again.") whenever
`outcome.ok` is false and `outcome.refusal` is not the named last-admin/self-action
marker. For delete specifically, keep the confirmation dialog open (or reopen it)
on a generic failure rather than silently closing it, so the admin's typed
confirmation is not lost on a transient error.

---

### WR-03: Every account-lifecycle audit write is fire-and-forget — a failed `INSERT` leaves no record and no operator-visible signal

**File:** `backend/src/api/admin.rs:297, 356, 406, 441, 485, 528, 575`

**Issue:** Every new admin action added this phase — role change, permission
change, disable, enable, create, password reset, delete — writes its audit row
with `let _ = audit::record_account_event(...).await;`, discarding the
`Result` unconditionally. If the `INSERT INTO audit_log` fails (SQLite busy/locked
under contention, disk full, a corrupted index), the admin's mutation has already
committed and the HTTP response is still `200`/`201` — the caller has no way to
know the action succeeded without also being recorded. There is no retry, no
`tracing::error!`, and no distinguishable response for "committed but unaudited."
This is a pre-existing idiom in this codebase (`api/jobs.rs:369,541,754` and
`jobs/worker.rs:757,1789,1827,1872` use the identical `let _ = audit::record(...)`
pattern for file-transfer events), so this phase did not invent the pattern —
but it did extend it, unmodified, to exactly the class of event ADMIN-06 exists
to guarantee gets logged (account disable/enable/create/delete, role and
permission changes), which is a higher-stakes audience for a silent drop than a
file move.

**Failure scenario:** An admin deletes a departing contractor's account during a
brief period of SQLite contention (e.g. a large transfer job is mid-write). The
`DELETE` transaction in `authz::store::delete_user` commits cleanly (it has its
own retry-on-busy loop), but the subsequent, separate `record_account_event` call
in `api::admin::delete_user`'s post-commit block hits `SQLITE_BUSY` one more time
with no retry of its own and returns `Err`, which is discarded. The account is
gone, REST/WS/tickets are cut, the HTTP caller sees `200 OK` — but `audit_log`
has no `account_deleted` row naming who deleted whom or when. A later compliance
review of "who deleted this account" finds nothing.

**Suggested fix:** At minimum, log the discarded error (`tracing::error!` with the
action and target) so an operator scanning logs can notice a dropped audit write,
even if the admin action itself is not rolled back. If audit completeness is a
hard requirement for this class of event specifically, consider writing the audit
row inside the *same* transaction as the mutation (a schema/architecture change
beyond this phase's scope, but worth flagging given `record_account_event`
already goes through the same connection pool) rather than as a detached
post-commit step.

## Info Findings

### IN-01: No live concurrency test proves `disable_user`/`delete_user` hold the last-admin invariant under a genuine race

**File:** `backend/src/authz/store.rs`

**Issue:** `concurrent_demotions_of_the_last_two_admins_exactly_one_succeeds`
(line 1162) proves `set_role`'s post-state predicate holds under two genuinely
concurrent transactions via `tokio::join!`. `disable_user` and `delete_user`
share the exact same `enabled_admin_count` helper and the same bounded-retry-on-
busy structure, so the mechanism is structurally identical and very likely sound
— but there is no equivalent `tokio::join!` test exercising two concurrent
disables (or a concurrent disable-and-delete pair) against the last two enabled
admins. This is a coverage gap, not a demonstrated bug.

**Suggested fix:** Add `concurrent_disables_of_the_last_two_admins_exactly_one_
succeeds` and the delete equivalent, mirroring the existing `set_role` test, for
the same "prove the transaction, not merely SQLite's serialization, is what holds
this" reason the existing comment gives.

### IN-02: The delete path's WS-close/ticket-purge behavior is not proven by a live end-to-end test, unlike disable's

**File:** `backend/tests/admin_account_delete.rs`

**Issue:** `admin_session_revocation.rs` has a full-stack test
(`disabling_a_member_cuts_rest_ws_and_download_tickets_and_writes_one_audit_row`)
that opens a real `/ws` connection and a real download ticket, disables the
member, and asserts the socket receives a 1008 close and the ticket 404s.
`admin_account_delete.rs` has no equivalent test for `delete_user_handler`, even
though `api::admin::delete_user`'s post-commit block (`admin.rs:566-573`) is
byte-identical in structure to `disable_user`'s (same `IdentityEvent::
SessionRevoked` send, same `tickets.purge_by_user` call). The code path is almost
certainly correct by inspection, but it is asserted only by unit-level coverage
plus the three-table-cleared HTTP test, not by a live socket/ticket proof the way
disable's is.

**Suggested fix:** Add a delete variant of the disable suite's whole-path test —
open a `/ws` connection and mint a download ticket for the target, delete the
account, assert the same 1008 close and 404 ticket outcomes.

### IN-03: `maxLength={128}` is a duplicated magic number rather than an import of the shared constant

**File:** `frontend/components/create-member-dialog.tsx:159,179`,
`frontend/components/reset-password-dialog.tsx:112,132`

**Issue:** `frontend/lib/password-rules.ts` exports `MAX_PASSWORD_LENGTH = 128`
specifically so this value has one source of truth (its own doc comment: "mirrors
the server's own `MAX_PASSWORD_LEN`... also bounds the per-attempt Argon2 work a
caller can force"). Both dialogs already import `validateNewPassword` from that
module but hardcode the literal `128` on their password `<Input maxLength={...}>`
props instead of importing `MAX_PASSWORD_LENGTH`. The value is currently correct,
so this is not a live bug, but it is exactly the kind of duplicated constant that
silently drifts if `MAX_PASSWORD_LENGTH` (or the server's `MAX_PASSWORD_LEN`)
is ever changed in only one place.

**Suggested fix:** Import and use `MAX_PASSWORD_LENGTH` from `lib/password-rules.ts`
in both dialogs' `maxLength` props instead of the literal `128`.

### IN-04: `create-member-dialog.tsx`'s `HANDLE_MAX_LENGTH` duplicates `backend::auth::session::MAX_HANDLE_LEN` as a local literal

**File:** `frontend/components/create-member-dialog.tsx:36`

**Issue:** `const HANDLE_MAX_LENGTH = 64;` is a local, undocumented duplicate of
the server's `MAX_HANDLE_LEN = 64` (`backend/src/auth/session.rs:66`). Currently
correct, but there is no shared frontend constant (unlike the password-length
case, `lib/password-rules.ts` has no handle-length export) and no comment linking
the two, so a future change to the server constant has nothing on the frontend
side to point back at it.

**Suggested fix:** Low priority given the value is static and unlikely to change,
but consider exporting a `MAX_HANDLE_LENGTH` constant from a shared `lib/` module
(mirroring `password-rules.ts`'s precedent) if handle-length ever becomes
configurable.

## Areas Reviewed Clean

- **Last-admin invariant (D-12):** single post-state predicate
  (`authz::store::enabled_admin_count`), shared by `set_role`/`disable_user`/
  `delete_user`, run inside the transaction it guards, proven under a real
  concurrent race for `set_role` (concurrency test present; see IN-01 for the
  gap on the other two call sites).
- **Self-action guards (D-11):** `refuse_self_action` runs server-side before any
  transaction opens, unconditionally, for reset/disable/delete; frontend
  preemptive disabling (`admin-summary.ts`) is a UX convenience layered on top,
  never the source of truth.
- **Authorization-first ordering:** every `/api/admin/*` handler calls
  `authz::require_admin` as its first statement before any side effect; the
  02-06 route-coverage test enforces every new route has a stated capability
  decision and fails the build otherwise.
- **Transactional integrity of disable/delete:** session cascade, permission
  cascade, and the `users` row mutation all happen inside one `sqlx` transaction;
  WS revocation and ticket purge happen strictly post-commit, never inside the
  transaction or on a refusal path; proven end-to-end for disable
  (`admin_session_revocation.rs`).
- **Login enumeration safety (D-07/D-18):** unknown-handle, wrong-password, and
  wrong-password-against-disabled all return byte-identical status/headers/body
  and comparable wall-clock timing, proven over real HTTP with both shape and
  timing assertions; the disabled-account message only renders post-verify.
- **Rate limiting / client-address resolution:** `resolve_client_ip_from` trusts
  `cf-connecting-ip` only, with a documented, tested rationale (this deployment
  sits behind a Cloudflare Tunnel) and a fail-closed `None` when neither the
  header nor `ConnectInfo` resolves; a client-settable `X-Forwarded-For`-style
  header is explicitly proven ignored.
- **SQL construction:** every query in `authz/store.rs`, `api/admin.rs`, and
  `jobs/audit.rs` uses bound parameters; no string interpolation of user input
  into SQL was found anywhere in the reviewed files.
- **Audit actor integrity:** `actor` is always sourced from `VerifiedIdentity`'s
  own handle, never from client-supplied input, on every new audit call site.
- **Frontend delete confirmation:** exact, case-sensitive typed-handle match
  (`destructive-confirm-dialog.tsx`), no `trim`/`toLowerCase` on either operand.
- **"This is you" session marker:** computed server-side
  (`authz::store::list_sessions`, matched against the caller's own `HttpOnly`
  cookie value) and rendered verbatim by the client — no client-side session-
  token comparison exists or could exist.
- **XSS surface:** no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in any
  reviewed frontend file; user-agent parsing (`user-agent.ts`) returns only a
  fixed closed set of labels and never echoes the raw string; audit target
  decoding (`audit-target.ts`) renders plain strings through JSX text nodes only.
- **Rust panics/unwraps:** no `unwrap()`/`expect()`/`panic!` reachable from a
  request-handling path in the reviewed backend files; all such calls are in
  `#[cfg(test)]` modules or in `backstage.rs`'s interactive CLI stdin read
  (not a server request path).
- **Cookie flags:** `HttpOnly`/`Secure`/`SameSite=Lax` unchanged by this phase
  (pre-existing, verified still in place).

---

_Reviewed: 2026-08-18T20:46:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
