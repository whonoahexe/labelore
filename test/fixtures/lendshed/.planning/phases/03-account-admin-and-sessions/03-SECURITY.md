---
phase: 03
slug: account-admin-and-sessions
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-03-19
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: **written at plan time**. All five `03-0N-PLAN.md` files held a parseable
`<threat_model>` block; this file gathers them and records a check of each mitigation against the
code. No SUMMARY raised a `## Threat Flags` entry, so nothing was escalated while building.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| member browser → `/api/desk/*` | A signed-in session arrives; the acting member is resolved on the server while the target id is untrusted client input | Member ids, handles, roles, typed passwords |
| anonymous browser → `POST /api/sign-in` | Fully untrusted input; the shape of the reply is itself a disclosure channel | Handle, typed password |
| in-process event bus → open live socket | A revocation signal reaches every open connection; each one filters on its own kept `socket_member_id` | Identity events (`SessionRevoked`, `GrantsChanged`) |
| held slip link → `SlipStore` | An already-issued capability token stays good until purged or expired and skips the per-request session lookup | Print-slip capability tokens |
| tunnel → API | The forwarded-address header can be forged if the tunnel is bypassed | Client address (display-only provenance) |
| stored `sessions` row → `/desk/members/{id}` sessions section | Device text supplied by a stranger at sign-in, shown later to a steward | Device string, client address |
| stored `ledger.detail` → `/ledger` Detail cell | An arbitrary stored string shown to a steward, including the verbatim fallback path | Handles, roles, grants, sheds |
| `sessions` cookie → `GET /api/desk/members/{id}/sessions` | The caller's cookie is compared with each stored row to mark the one that is theirs | Raw session token, `is_current` flag |
| operator shell → `shedctl` | The operator is already near root; what is defended is operator *slips*, not operator malice | Subcommands, handles, prompted passwords |
| `shedctl` → SQLite file | Reads and writes the file directly, so no HTTP layer or permission check stands in front | Whole member table |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Elevation of Privilege | `pauseMember` / a paused member's live session | high | mitigate | `DELETE FROM sessions WHERE member_id = ?` runs in the same transaction as the `paused_at` write (`members/store.ts:464`); `MemberGuard` re-reads `sessions` on every request and refuses `paused_at` set (`auth/index.ts:151`) | closed |
| T-03-02 | Elevation of Privilege | slip links already issued to a paused member | high | mitigate | `SlipStore.purgeByMember` (`slips/store.ts:251`) is called after commit from the pause handler (`api/desk.ts:397`) | closed |
| T-03-03 | Denial of Service (self-inflicted lockout) | `setRole` / `pauseMember` against the last active steward | high | mitigate | `activeStewardCount` post-state check inside the transaction, with rollback and `LastStewardRefused`; `refuseSelfAction` runs before the transaction opens | closed |
| T-03-04 | Elevation of Privilege | a revoked member's open live socket | high | mitigate | The `SessionRevoked` branch of `handleSocket` is guarded on `socketMemberId` and closes with code `POLICY` (`live/index.ts:140-144`) | closed |
| T-03-05 | Repudiation | pause or resume done with no record | medium | mitigate | Both handlers call `ledger.recordAccountEvent` with an actor taken from the server, never from client input | closed |
| T-03-06 | Tampering | a bus send, slip purge or ledger write fired before the commit | medium | mitigate | Every side effect runs only in the `ok` branch after the store call (which owns `tx.commit()`) has returned (`api/desk.ts:389-405`) | closed |
| T-03-07 | Information Disclosure | a steward listing members through the pause route's error shapes | low | accept | AR-01 | closed |
| T-03-08 | Information Disclosure | `signIn`'s new paused-account branch | high | mitigate | Branch sits strictly after `verifyPassword` returns true (`auth/hash.ts:396` → `:411`); every earlier failure still returns `genericCredentialReply()`; asserted byte-identical by `sign_in_enumeration.spec` | closed |
| T-03-09 | Information Disclosure | timing side channel on the paused path | medium | mitigate | No early return added; a real Argon2 check always runs first; `unknown_handle_and_wrong_password_cost_alike` times both paths | closed |
| T-03-10 | Spoofing | a made-up forwarded-address header written into `sessions.client_ip` | medium | accept | AR-02 | closed |
| T-03-11 | Tampering (stored XSS) | device text from a stranger, listed on the steward's sessions page | high | mitigate | `parseDevice` returns one of a short fixed list of names (`lib/device.ts:41-60`) and the result is rendered as plain React text; the single `dangerouslySetInnerHTML` left in the tree takes the build-time `THEME_BOOT` constant and nothing a user typed | closed |
| T-03-12 | Repudiation | a session row that records no origin | low | accept | AR-03 | closed |
| T-03-13 | Information Disclosure | a steward-typed password leaking into a ledger row, log line or error body | high | mitigate | The password reaches only `store.addMember` / `store.resetPassword` and is hashed at once; ledger details carry only a handle and a qualifier (`encodeAccountDetail`); error text names the length rule without echoing the input | closed |
| T-03-14 | Tampering (data integrity) | orphaned `sessions` / `member_grants` rows after a delete | high | mitigate | All three deletes are explicit inside one transaction (`members/store.ts:835-850`) — foreign keys are off on this connection, so nothing cascades by itself; `desk_member_delete.spec` asserts zero child rows | closed |
| T-03-15 | Denial of Service (self-inflicted lockout) | removing or resetting the final active steward, or yourself | high | mitigate | `refuseSelfAction` is checked first; after that the common `activeStewardCount` check undoes all three deletes as a unit | closed |
| T-03-16 | Repudiation | a departed member's history losing its author | high | mitigate | `ledger.actor` is plain text with no key to `members`; `deleting_a_member_clears_three_tables_and_leaves_the_ledger_attributed` shows an older row keeps its actor | closed |
| T-03-17 | Elevation of Privilege | a deleted member's open socket or unused slip link | high | mitigate | The delete handler fires `SessionRevoked` and `purgeByMember` after commit (`api/desk.ts:573`), the same as the pause handler | closed |
| T-03-18 | Spoofing | someone who is not a steward calling one of the four new routes | high | mitigate | Each handler begins with `authz.requireSteward` (10 call sites); `route_gate_coverage` lists all 11 registered routes and breaks the build for any route lacking a capability ruling | closed |
| T-03-19 | Information Disclosure | member enumeration through the `handle_taken` refusal | low | accept | AR-04 | closed |
| T-03-20 | Tampering | a client dodging the typed-delete step by posting to the route itself | low | accept | AR-05 | closed |
| T-03-21 | Tampering (stored XSS) | raw `detail` text shown by the Detail cell when nothing can decode it | high | mitigate | When decoding fails, `decodeLedgerDetail` hands back the string as React text (`lib/ledger-detail.ts:127`) — no `dangerouslySetInnerHTML`, no attribute that runs; `normalizeHandle` on the server narrows handles before they land in a detail string | closed |
| T-03-22 | Information Disclosure | a non-steward reading the ledger | high | mitigate | `/api/ledger` is gated by `authz.requireSteward` (`api/ledger.ts:119`) with a `route_gate_coverage` row; this phase adds no new fetch path | closed |
| T-03-23 | Repudiation | an account event that never appears because the web side has no name for its action id | medium | mitigate | `LedgerActionId` copies the server's list; `CoveredAction` with a `const exhaustive: never` line (`lib/ledger-detail.ts:151`) turns any id left unhandled into a type error | closed |
| T-03-24 | Information Disclosure | the Detail column revealing more than its action needs | low | accept | AR-06 | closed |
| T-03-25 | Denial of Service (self-inflicted lockout) | a command-line pause or delete leaving the shed with no active steward | high | mitigate | `shedctl` calls the same `members.store.pauseMember` / `deleteMember` (`bin/shedctl.ts:599`, `:634`), so the D-12 check runs in the same transaction; asserted by `shedctl_account_lifecycle` | closed |
| T-03-26 | Elevation of Privilege | the command line avoiding the session cascade | high | mitigate | The cascade is part of `store.pauseMember` itself rather than the HTTP handler, so no entry point can leave it out | closed |
| T-03-27 | Repudiation | a command-line account change with no operator attribution | low | accept | AR-07 | closed |
| T-03-28 | Information Disclosure | a typed password ending up in an address bar, history entry or console line | high | mitigate | The two dialogs post a request body and never build a query string; the four password inputs are all `type="password"`; nothing on an error path repeats the value | closed |
| T-03-29 | Elevation of Privilege | a client skipping dialog validation and posting a weak password | high | mitigate | The client check is only a convenience (`submitLocked = !ruleOk \|\| busy`); `addMember` / `resetPassword` re-check `MIN_PASSWORD_LEN` / `MAX_PASSWORD_LEN` on the server (`members/store.ts:673`, `:756`) and refuse on their own | closed |
| T-03-SC | Tampering | package-manager installs | low | accept | AR-08 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-03-07 | The pause route already sits behind `authz.requireSteward`; a caller who gets there is a steward who can already list every member through `/api/desk/members`. Nothing new is disclosed. | plan-time decision (03-01-PLAN) | 2026-03-19 |
| AR-02 | T-03-10 | The saved client address is shown for context only (D-14) and nothing decides on it. The throttle uses the same resolver and its fail-closed none-branch is untouched, so trust in the header is where it was. | plan-time decision (03-02-PLAN) | 2026-03-19 |
| AR-03 | T-03-12 | Provenance columns are nullable on purpose; a sign-in with no resolvable address and no device text still succeeds, because access must not hinge on cosmetic metadata. | plan-time decision (03-02-PLAN) | 2026-03-19 |
| AR-04 | T-03-19 | The route is behind `requireSteward`; whoever reaches it can already list every member. A distinguishable refusal is needed for usable add-form validation. | plan-time decision (03-03-PLAN) | 2026-03-19 |
| AR-05 | T-03-20 | Typing the handle protects against a stray click; it is no security line. The server applies the self-action refusal and the last-steward check regardless of the client, and the caller is a steward anyway. | plan-time decision (03-03-PLAN) | 2026-03-19 |
| AR-06 | T-03-24 | The decoded sentence carries only what the server already stored — a handle, a role, a grant, a shed — all of which a steward can already read on `/desk`. | plan-time decision (03-04-PLAN) | 2026-03-19 |
| AR-07 | T-03-27 | The command line carries no acting identity on purpose (it is the break-glass route); shell history and host logs are the trail for whoever is on the machine, and a made-up actor name would falsely point at a signed-in member. | plan-time decision (03-05-PLAN) | 2026-03-19 |
| AR-08 | T-03-SC | Nothing new is installed in this phase (03-RESEARCH § Package Legitimacy Audit: not applicable, compared with `package.json`), so no install step needs a gate. All UI parts used are already vendored in `web/components/ui/`. | plan-time decision (all 5 plans) | 2026-03-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-03-19 | 30 | 30 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep-depth check) |

Breakdown: 22 `mitigate` threats found in the code, 8 `accept` threats listed in the Accepted Risks
Log above. `T-03-SC` is merged — it appeared identically in all five plan registers.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-03-19
