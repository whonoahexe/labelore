# Phase 3: Account Administration & Session Control - Research

**Researched:** 2026-04-02
**Domain:** Member account lifecycle (create, reset, disable, remove) and live-session visibility and revocation on top of an already-shipped sign-in and roles server (Node/Hono/SQLite plus a React front end)
**Confidence:** HIGH — every claim below is either read directly from this repo's current source (tagged `[VERIFIED: path:lines]` with a short quote) or taken from the phase's own `03-CONTEXT.md`, which already settled almost every open design question. External claims (user-agent parsing convention, SQLite foreign-key default) are tagged `[CITED]` or `[ASSUMED]`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Account creation & password handoff**
- **D-01:** The steward types the initial password. No server-side generation. The create dialog collects handle, display name and password; reset collects a password. Validation reuses the sign-in phase's rule (`MIN_PASSWORD_LEN` and `MAX_PASSWORD_LEN` = 12 and 128) and `web/lib/password-rules.ts` — never a second rule.
- **D-02:** Creation lives in a dialog on `/admin`, opened from a button above the member list, refreshing the list in place. No new route.
- **D-03:** A password reset does NOT end the member's sessions. Reset writes the new hash and sets `must_change = 1`; that is all. Disable is the separate, explicit cutoff. **Planner must handle a copy consequence:** the "current password" the member types on `/change-password` is the temporary one the steward just gave them, so the screen must not read as "the password you have been using."
- **D-04:** Neither handle nor display name is editable after creation. A typo is fixed by remove-and-recreate.

**Disable & session revocation (ADMN-03)**
- **D-05:** Disable deletes every session row for that member (`DELETE FROM sessions WHERE member_id = ?`, no keep-one exception) in the same transaction as the `disabled_at` write.
- **D-06:** A disabled member's in-flight exports keep running — disable governs access, not work already under way.
- **D-07:** A disabled member is told plainly at sign-in — but only AFTER their password verifies. A wrong password against a disabled account returns the identical generic response as everything else. **Planning must include a test asserting the wrong-password-against-disabled path is byte-identical and timing-comparable to the other two.**
- **D-08:** Disable routes through the existing `DestructiveConfirmDialog`; re-enable does not.

**Remove (ADMN-04)**
- **D-09:** Hard `DELETE` of the `members` row. `sessions` and `member_permissions` rows go with it in the same transaction. `audit_log` is not touched — it stores `actor` as raw TEXT with no foreign key. **Accepted consequence:** a removed handle becomes free for reuse.
- **D-10:** Remove lives at the bottom of `/admin/members/{id}` and requires the member's handle to be typed to confirm. Extend `DestructiveConfirmDialog` with a typed-match variant, never a second dialog.

**Lockout guardrails**
- **D-11:** Self-demotion, self-disable and self-removal are ALL refused unconditionally, however many other stewards exist. `steward` remains the break-glass path.
- **D-12:** The last-steward invariant becomes ONE post-state predicate, checked in the same transaction, for every operation that reduces steward availability: **"After this write, at least one enabled steward must remain."** This REPLACES the current pre-state `COUNT(*) <= 1` form. It lives in exactly one place (grep-enforced). **Planning must include the test the earlier UAT could not run:** demote a *disabled* steward while exactly one enabled steward remains, and assert it succeeds.

**Live sessions (ADMN-05)**
- **D-13:** The live-session list is a section on `/admin/members/{id}`, below Role and Access — no global sessions page. **Consequence:** the "this is you" marker matches on the request's own session token, NOT on `member_id` alone.
- **D-14:** A session row shows parsed device, raw address and relative last-seen (for example *"Firefox on Linux · 203.0.113.44 · last active 4 minutes ago"*). `sessions.user_agent` and `client_ip` already exist as nullable columns; this phase starts writing them. User-agent parsing belongs in a pure `web/lib/*.ts` module with a matching test.

**Audit coverage (ADMN-06)**
- **D-15:** Account events reuse `audit_log`'s existing columns, no schema change. `actor` is the acting steward's handle, `action` is a new closed variant, and `target` is a compound string carrying the member and a qualifier (for example `maya:read:catalogue`). The encode and decode pair must live in ONE place.
- **D-16:** `/audit` gains an All / Files / Accounts filter, one chronological table.

### Claude's Discretion

- The `SessionRevoked` event's close code and reason on the socket.
- Download-ticket revocation on disable: a purge-by-member sweep versus a check-at-consume alternative.
- How `steward` grows to match (new `disable`, `enable`, `remove` subcommands, all through the same D-12 predicate).
- How many audit variants cover account events.
- The create dialog's field layout and validation copy.

### Deferred Ideas (OUT OF SCOPE)

- Server-generated passwords (D-01's declined first option).
- Display-name editing (D-04's declined middle option).
- Cancelling a disabled member's in-flight exports (D-06).
- A global `/admin/sessions` page (D-13's declined second option).
- Per-session kill or standalone force-sign-out — revocation is account-wide, folded into disable.
- Email delivery of passwords or reset links — no mail infrastructure exists.
- Self-service registration.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-01 | Steward creates a member account with an initial password | D-01 and D-02; new `createMember` in `authz/store.ts`; `steward create` is the CLI precedent |
| ADMN-02 | Steward resets any member's password | D-03; new reset handler; `/change-password` copy fix |
| ADMN-03 | Disable and re-enable end sessions, live sockets and unused download tickets at once | D-05 to D-08; `SessionRevoked` as a second `IdentityEvent` variant; ticket purge-by-member |
| ADMN-04 | Remove an account; audit history stays readable | D-09 and D-10; `audit_log.actor` is raw TEXT with no foreign key |
| ADMN-05 | See who is signed in, from where, when they last acted | D-13 and D-14; new `listSessions` query; server-side "is this you" comparison |
| ADMN-06 | Audit log records account events; `/audit` filter | D-15 and D-16; new audit variants; one compound-target codec |

</phase_requirements>

## Summary

This phase has almost no external-library research surface. Every decision in `03-CONTEXT.md` is settled against this codebase, and the job is to fill in five server surfaces (`authz/store`, `api/admin`, `ws/identity-bus` with `ws/index`, `tickets/store`, `jobs/audit`) plus three front-end surfaces (the `/admin` dialog, the `/admin/members/{id}` sections, the `/audit` filter) on infrastructure the two earlier phases built for exactly this purpose. `IdentityBus` was built with a header comment naming `SessionRevoked` as its intended second variant, and `authz/store.setRole` already shows the transactional, bounded-retry pattern the new functions should copy. Nothing here needs a new package.

Two verified findings not stated in `03-CONTEXT.md` are load-bearing for planning. First, this server's SQLite connection never turns on `PRAGMA foreign_keys`, so the `REFERENCES members(id)` clauses on `sessions.member_id` and `member_permissions.member_id` are declarative only and a hard remove must delete all three tables explicitly. Second, the `Member` object every handler receives carries no session-token field, so the "this is you" marker cannot be computed by comparing `member_id`; the list handler needs the raw `lend_session` cookie to compare against each session row's `id` on the server.

**Primary recommendation:** Build `disableMember`, `enableMember` and `removeMember` as three functions in the existing `authz/store.ts`, each wrapping D-12's post-state predicate the way `setRole` wraps its pre-state one, and do not create a second lockout implementation. Wire `SessionRevoked { memberId }` as the bus's second variant and add one match case, not a new branch, to the socket handler's existing bus listener.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Account create, reset, disable, enable, remove | API / Server (`api/admin`, `authz/store`) | Database (`members`, `sessions`, `member_permissions`) | Every write is transactional and checked server-side; `steward` calls the same store functions |
| Last-steward invariant | API / Server (`authz/store`, one file) | — | Must be atomic with the write it guards; a UI check cannot be trusted |
| Revocation for REST | API / Server (`requireMember` guard) | Database | Free by construction: the guard re-queries `sessions` every request, with no cache |
| Revocation for live sockets | Server (`ws/identity-bus`, `ws/index`) | Browser (socket close handling) | A live connection never re-hits the guard; it must be pushed a signal |
| Download-ticket revocation | Server (`tickets/store`) | — | In-memory map, purged by member on disable |
| Live-session listing | API / Server (new query) | Browser (relative time and device text) | The server owns the comparison; the browser only formats |
| Audit recording | Server (`jobs/audit.record`, one seam) | — | `actor` is always server-sourced, never client input |

## Standard Stack

No new libraries or packages are required for this phase. Every capability (transactional SQLite writes, in-process fan-out, socket close frames, password hashing, cookie handling, rate limiting) is already a dependency and is exercised by code this phase extends.

**Existing dependencies this phase reuses (verified present in `server/package.json`):**

| Library | Version | Purpose | Why reused, not added |
|---------|---------|---------|------------------------|
| `argon2` | 0.6.2 `[VERIFIED: server/package.json:14]` | Hashing for ADMN-01 and ADMN-02 | `hashPassword` and `verifyPassword` already exist; create and reset call the same functions |
| `better-sqlite3` | 12.2.0 `[VERIFIED: server/package.json:16]` | Transactional writes for disable, enable, remove | `setRole` is the direct template |
| `node:events` | — | `SessionRevoked` fan-out | `IdentityBus` already uses it; a second variant, not a new bus |
| `ws` | 8.18.3 `[VERIFIED: server/package.json:20]` | Close frame on revocation | `reject()` already sends a close frame with code 1008 |

**Installation:** none.

**Version verification:** not applicable — no new packages recommended.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new packages, on the server or the web side. The legitimacy gate was reviewed and has nothing to check; the web `package.json` has no user-agent parsing library and no second dialog library `[VERIFIED: web/package.json:12-24]`, which confirms that D-14's pure `lib/*.ts` module and D-10's extension of the existing dialog are the only viable paths.

**Packages removed due to [SLOP] verdict:** none — no packages were proposed.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────┐
                     │   Admin: /admin/members/{id} │
                     │  Disable / Enable / Remove   │
                     └──────────────┬───────────────┘
                                    │ PUT/POST /api/admin/members/{id}/...
                                    ▼
                     ┌─────────────────────────────┐
                     │   api/admin handler          │
                     │   requireSteward(...)        │◄── 403 if not steward
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │  authz/store.disableMember   │
                     │  (ONE sqlite transaction)    │
                     │  1. self-action refused?     │◄── D-11 (before D-12)
                     │  2. D-12 post-state predicate│◄── "≥1 enabled steward after"
                     │  3. UPDATE disabled_at       │
                     │  4. DELETE FROM sessions     │◄── D-05 cascade
                     │  5. commit                   │
                     └──────────────┬───────────────┘
                                    │ (after commit — never before)
                    ┌───────────────┼────────────────────┐
                    ▼               ▼                    ▼
        ┌──────────────────┐ ┌──────────────┐  ┌─────────────────────┐
        │ identityBus.emit  │ │ tickets.     │  │ jobs/audit.record   │
        │ (SessionRevoked)  │ │ purgeByMember│  │ (AccountDisabled)   │
        └─────────┬─────────┘ └──────────────┘  └─────────────────────┘
                  │ (in-process emitter, every socket subscribed)
                  ▼
     ┌─────────────────────────────────────┐
     │ ws/index handleSocket (per connection)│
     │ identityBus.on('event', (event) => {  │
     │   switch (event.type) {               │
     │     case 'SessionRevoked':            │
     │       if (event.memberId===connId)    │
     │         => close(1008)                 │◄── NEW case, same
     │   }                                   │    listener as today
     │ })                                    │
     └─────────────────────────────────────┘

  Independently, on the member's NEXT REST request (any route):
     requireMember
       → SELECT ... FROM sessions WHERE id = ? AND expires_at > ?
       → row now absent (deleted by step 4 above) → 401, no cache to invalidate
```

### Recommended Project Structure

No new top-level modules. Every change lands inside existing files:

```
server/src/
├── authz/store.ts        # + disableMember, enableMember, removeMember, listSessions
├── api/admin.ts          # + create, reset, disable, enable, remove routes
├── ws/identity-bus.ts    # + SessionRevoked variant
└── tickets/store.ts      # + purgeByMember
```

### Pattern 1: Post-state invariant inside the same transaction as the write (D-12)

**What:** run the write first inside the transaction, then count enabled stewards; if none remain, roll back and refuse. The count and the write see the same snapshot.

**When to use:** demote, disable and remove, all through one shared helper.

### Pattern 2: Self-action refused before any invariant check (D-11)

**What:** compare the acting member's id to the target's id first and refuse before touching the count.

### Pattern 3: `SessionRevoked` as a second variant, not a second bus

**What:** the existing bus type becomes a union.

```ts
export type IdentityEvent =
  | { type: 'PermissionsChanged'; memberId: number }
  | { type: 'SessionRevoked'; memberId: number };
```

### Pattern 4: Ticket purge is a new method on the existing in-memory store

**What:** `purgeByMember(memberId)` walks the map and deletes matching entries. The store is a synchronous map, so a database query inside it is disfavoured.

### Pattern 5: "This is you" cannot be computed in the browser

**What:** the cookie is `HttpOnly`, so the browser cannot read it. The list handler reads the raw cookie and compares it with each row's `id` on the server.

### Anti-Patterns to Avoid

- **Adding a session cache in front of the `sessions` lookup.** The guard re-queries every request, and that is what makes REST revocation instant.
- **Checking the last-steward invariant before the write.** This is the bug the context's blocking amendment names; see Pitfall 1.
- **Reimplementing the enabled-steward `COUNT` at a second call site** such as inline in an admin route. It breaks the grep-enforced one-file property.
- **A new listener branch for `SessionRevoked`.** It is a new case inside the existing bus listener.
- **Trusting a `memberId` comparison alone for "this is you."** Several concurrent sessions per member exist.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing for create and reset | A second hashing wrapper | `hashPassword` and `verifyPassword` (existing) | Phase 1 already solved the parameter handling once |
| Client-address resolution for `client_ip` | A second proxy-header-aware extractor | The limiter's existing key resolver | Already tested on both header-present and header-absent paths |
| Revocation signalling | A polling route or a second socket | `IdentityBus` (existing emitter) | Already subscribed to by every open socket |
| Enabled-steward counting | A second COUNT outside `authz/store` | The one query the store already owns | Grep-enforced single seam |
| Typed remove confirmation | A brand-new dialog | `DestructiveConfirmDialog` with a new variant | D-10 requires extending it |

**Key insight:** every item above is a don't-duplicate-what-this-repo-already-built rule, not a library substitution. The biggest risk is planning as if the infrastructure does not exist.

## Common Pitfalls

### Pitfall 1: The pre-state last-steward count over-refuses once `disabled_at` becomes settable
**What goes wrong:** Demoting an already-disabled steward while exactly one *enabled* steward remains gets refused with `LastStewardRefused`, though nobody leaves the enabled population.
**Why it happens:** the current count runs BEFORE the write and only in the demotion branch. This phase is the first time `disabled_at` becomes non-NULL anywhere.
**How to avoid:** move to a post-state check, one shared helper, reused by demote, disable and remove.
**Warning signs:** a test that demotes a disabled steward and expects it to FAIL; that expectation is itself the bug.

### Pitfall 2: `foreign_keys` is never enabled on this server's SQLite connections
**What goes wrong:** a refactor that deletes `members` before `sessions` or `member_permissions` will NOT raise a violation, because SQLite leaves enforcement off by default and `openDb` never turns it on `[VERIFIED: server/src/db/index.ts:35-70]`.
**Why it happens:** the pragma must be set per connection `[CITED: docs.example.org/sqlite/foreignkeys]`.
**How to avoid:** the remove function explicitly deletes all three tables in one transaction; add a test asserting zero orphan rows afterwards.
**Warning signs:** session rows whose `member_id` matches nothing.

### Pitfall 3: The "this is you" marker cannot be derived in the browser
**What goes wrong:** comparing `member_id` marks every session of the viewed member as "you" when the viewer is that member.
**Why it happens:** the session cookie is `HttpOnly` and the `Member` object carries no token.
**How to avoid:** read the cookie in the list handler and compare it with each row's `id` on the server.
**Warning signs:** two sessions for one member both marked as current.

### Pitfall 4: The forced-change copy reads as false after a reset
**What goes wrong:** the change-password screen says "enter your current password" when the member holds only a temporary one.
**Why it happens:** the flag has no origin marker for first sign-in versus post-reset.
**How to avoid:** an origin-agnostic copy rewrite first; add a server signal only if testing shows confusion.

### Pitfall 5: Exhaustive matches on the event union break on the new variant
**What goes wrong:** every `switch` over `IdentityEvent` stops compiling when `SessionRevoked` joins.
**Why it happens:** the union was a single member until now.
**How to avoid:** budget for the ripple; add the case everywhere in one task.

## Code Examples

### `authz/store.disableMember` — mirrors `setRole`'s transaction and retry shape

```ts
export function disableMember(db: Db, targetId: number, actorId: number | null): void {
  runWithRetry(db, () => {
    if (actorId !== null && actorId === targetId) throw new StoreError('SelfActionRefused');
    db.prepare('UPDATE members SET disabled_at = ? WHERE id = ?').run(Date.now(), targetId);
    db.prepare('DELETE FROM sessions WHERE member_id = ?').run(targetId);
    assertEnabledStewardRemains(db);
  });
}
```

### `web/lib/user-agent.ts` — a hand-rolled parser, no library

```ts
export function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Firefox\//.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : 'Unknown browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : /Mac OS/.test(ua) ? 'macOS' : 'Unknown OS';
  return `${browser} on ${os}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Pre-state last-steward count (before the write, demotion only) | Post-state predicate (zero enabled after the write, for demote, disable and remove) | This phase (D-12) | The pre-state form was never wrong until `disabled_at` became settable; an in-repo evolution, not an ecosystem shift |
| `sessions.user_agent` and `client_ip` reserved but unwritten | Written at session issue | This phase (D-14) | ADMN-05 with zero migration |

No externally outdated approach is being replaced; this phase's state of the art is internal pattern maturation.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The user-agent regex-cascade convention (impersonating tokens before generic ones) is standard practice, drawn from several non-authoritative sources | Code Examples | Low — display text only; a wrong parse shows "Unknown browser", never a wrong authorization decision |
| A2 | Five to seven new audit variants matches what the planner will want | Pattern 3 | Low to medium — changes only the enum shape, not the architecture |
| A3 | One shared `SelfActionRefused` error for self-disable and self-remove is the right shape | Code Examples | Low — either shape works; separate variants may help distinguish front-end copy |

## Open Questions

1. **Does the sign-in response need to tell "first sign-in" from "post-reset" for Pitfall 4's copy fix?**
   - What we know: `must_change` is a single boolean with no origin marker.
   - What's unclear: whether static wording works for both cases.
   - Recommendation: try an origin-agnostic rewrite first; add a signal only if testing shows confusion.

2. **Exact audit variant set, and whether enable and disable share one variant.**
   - What we know: D-15 defers this to planning.
   - Recommendation: keep variants granular; the Accounts filter can OR across them at no cost.

3. **Whether `steward`'s new subcommands need a bypass of D-11's self-action refusal.**
   - What we know: the CLI passes no actor, which structurally skips the self-check.
   - Recommendation: no new flag; the shape already does what is intended.

## Environment Availability

Not applicable — this phase has no new external tool, service or runtime dependencies. Everything needed is already required by, and verified in, phases 1 and 2.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Server framework | `vitest` 4.1.11 against a real temp-file SQLite database |
| Web framework | `vitest` with no DOM environment (which is what drives D-14's pure `lib/*.ts` rule) |
| Quick run command | `npm test -- authz/store` or `npm test -- identity-bus` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMN-01 | Create writes a member row with the given password, no generation | unit | `npm test -- createMember` | ❌ Wave 0 |
| ADMN-02 | Reset writes a new hash and sets `must_change`, leaves sessions alone | unit | `npm test -- resetPassword` | ❌ Wave 0 |
| ADMN-03 | Disable deletes sessions, purges tickets, closes live sockets with 1008 | integration | `npm test -- admin-session-revocation` | ❌ Wave 0 |
| ADMN-04 | Remove clears members, sessions and permissions; audit rows survive | integration | `npm test -- admin-account-remove` | ❌ Wave 0 |
| ADMN-05 | Session list shows device, address and last-seen with the own session marked | unit | `npm test -- listSessions` | ❌ Wave 0 |
| D-12 | Demoting a disabled steward while one enabled steward remains succeeds | unit | `npm test -- authz/store` | ✅ extend existing |

### Sampling Rate
- **Per task commit:** the module-scoped test for whatever the task touched.
- **Per wave merge:** `npm test`.
- **Phase gate:** full suite green, plus route-coverage confirmed for every new `/api/admin/*` route.

### Wave 0 Gaps
- [ ] `server/test/admin-session-revocation.test.ts` — covers the disable chain end to end
- [ ] `server/test/admin-account-remove.test.ts` — covers the cascade and audit survival
- [ ] `web/lib/user-agent.test.ts` — covers device parsing
- [ ] Extend `server/test/sign-in-safety.test.ts` with the disabled-account timing case D-07 requires

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Yes | Argon2id via the existing wrapper; D-07's post-verify-only disclosure preserves enumeration safety |
| V3 Session Management | Yes | Server-side `sessions` table, no cache; D-05 extends the cascade delete to disable |
| V4 Access Control | Yes | `requireSteward` gates every new `/api/admin/*` route; D-11 and D-12 are the availability half |
| V5 Input Validation | Yes | Existing handle and password bounds; the typed remove confirmation is a UX safeguard, not a boundary |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Sessions outliving a disable | Elevation of Privilege | D-05's full session delete in the same transaction as `disabled_at` |
| Self-lockout via role, disable or remove edits | Denial of Service (self-inflicted) | D-11 and D-12, server-side and transactional |
| Account-existence enumeration through the disabled path | Information Disclosure | The pre-verify branch stays byte-identical; only a successful verify may disclose "disabled" |
| Orphaned session or permission rows after remove | Tampering (integrity) | Explicit three-table delete; a test for zero orphans |

## Sources

### Primary (HIGH confidence — read directly from this repository)
- `server/src/auth/guard.ts` — `requireMember`, `Member`, `AuthError`
- `server/src/auth/session.ts` — sign-in, change-password, session issue and delete
- `server/src/authz/store.ts` — `setRole` (the transaction, retry and invariant template)
- `server/src/ws/identity-bus.ts` — the bus and its header naming `SessionRevoked`
- `server/src/tickets/store.ts` — the in-memory ticket map
- `server/src/jobs/audit.ts` — the closed audit enum and the single write seam
- `server/src/db/index.ts` — `openDb` (confirms no `foreign_keys` pragma)
- `web/lib/password-rules.ts` — the length rule and change-password copy
- `.planning/phases/03-account-admin-and-sessions/03-CONTEXT.md` — the phase's settled decisions

### Secondary (MEDIUM confidence)
- [SQLite foreign key support](https://docs.example.org/sqlite/foreignkeys) — enforcement off by default, set per connection

### Tertiary (LOW confidence)
- User-agent regex-cascade convention — synthesized from several non-canonical pages; see Assumptions Log A1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; every reused primitive verified present
- Architecture: HIGH — every pattern is a direct extension of code that already anticipates this phase
- Pitfalls: HIGH for the five in-repo-verified pitfalls; MEDIUM for the two carried from milestone-level research

**Research date:** 2026-04-02
