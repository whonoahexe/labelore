# Phase 1: Member Sign-In & Sessions - Research

**Researched:** 2026-03-24
**Domain:** Member-owned sign-in (Node/Hono + SQLite) swapped into an existing gateway-shaped seam, on a React front end with a route gate
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sessions use a **14-day sliding idle expiry** — every signed-in request pushes the deadline out. The guard already touches the sessions row per request, so `last_seen` is written in the same touch.
- **D-02:** **Several concurrent sessions per member** — one row per sign-in, so a shed tablet and a phone at home coexist. **Sign-out ends only the session that issued the request.**
- **D-03:** **A password change ends all of that member's other sessions**, keeping the one that made the change (`DELETE FROM sessions WHERE member_id = ? AND id != ?`).
- **D-04:** Sign-out's "immediately" means **new connections only** in this phase. REST dies at once because the guard queries the sessions table every request. **Closing an already-open socket is a later phase's job — do not build it here.** — **Reversibility:** reversible — a later phase extends this rather than undoing it.
- **D-05:** The bootstrap path is a **CLI named `steward`** (user-specified). It is a second entry point in the server package, sharing the db and auth modules. No credential ever lands in a config file.
- **D-06:** **`steward` is not admin-only.** It can create, list, and reset *any* account, and stays as the permanent break-glass path.
- **D-07:** **The gateway allow-list is removed entirely at cutover.** The proxy stays as transport only. — **Reversibility:** costly.
- **D-08:** **`audit_log.actor` keeps its existing raw-`TEXT` shape** — the handle is snapshotted as a plain string. Old rows keep their gateway addresses and stay readable. — **Reversibility:** one-way.
- **D-09:** **A route gate in the web app redirects** signed-out visitors to `/sign-in` before render, rather than letting the shell paint and redirecting on a 401.
- **D-10:** **The route gate validates the session against the server**, not just the presence of a cookie. **Accepted cost, stated and reaffirmed:** a blocking round trip in front of every page load.
- **D-11:** When the server is unreachable during that check, the gate **fails closed and redirects to `/sign-in`**. **This is deliberate. Do not "fix" it downstream as a bug.** — **Reversibility:** reversible.
- **D-12:** The forced password change is enforced by a **server-side `must_change` flag checked inside the guard**, which refuses every endpoint except change-password and sign-out.
- **D-13:** A member has **a normalized handle *and* a separate display name**. The handle is letters, digits, underscore, hyphen, stored lowercased, so `Maya` and `maya` cannot both exist.
- **D-14:** **The handle — not the display name — is what gets snapshotted into `audit_log.actor`.**
- **D-15:** Password rule is **minimum length 12, no composition requirements**.
- **D-16:** A throttled sign-in returns a **time-boxed 429 with a visible "try again in Nm"**. **Account lockout requiring a steward was explicitly rejected.**
- **D-17:** The limiter keys on **both client address and submitted handle**, as two independent limits, each time-boxed.
- **D-18:** Unknown handle and wrong password are **identical in message, status, and timing**.
- **D-19:** **Rate limiting applies to `/sign-in` and change-password only.**

### Claude's Discretion

No area was handed over wholesale. Left to planning judgment: the exact token-generation call, the `sessions` columns beyond what D-01 and D-04 need, the timeout on D-10's check, and the `steward` subcommand surface beyond create/list/reset.

### Deferred Ideas (OUT OF SCOPE)

- **Live-socket teardown on sign-out** — left to a later phase (ADMN-03).
- **Sign-in page visual treatment and "remember me"** — offered and passed over.
- **What the `sessions` table stores for the device list** — D-01 commits to `last_seen`; the rest is a later phase's to specify.
- **Throttle events writing an `audit_log` row** — raised as a question, not pursued.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIGN-01 | Member signs in with handle and password, no gateway header anywhere in the flow | Guard swap (§Architecture Patterns, Pattern 1), allow-list removal (Runtime State Inventory) |
| SIGN-02 | A temporary-password holder is blocked from every route until they change it | `must_change` check inside the guard (D-12, Pattern 2, Pitfall 4) — never a front-end-only gate |
| SIGN-03 / SIGN-04 | Socket and download authorize against the session; sign-out kills new connections | Ticket-mint pattern retained unchanged (Pattern 3) |
| SIGN-05 | Throttled, enumeration-safe sign-in | Two-key limiter (§Standard Stack), dummy-hash verify (Pitfall 3) |
| SIGN-06 | Session survives a server restart or power cut | SQLite WAL substrate already proven (§Validation Architecture) |

</phase_requirements>

## Summary

This phase swaps the *authenticator* underneath a guard that was built to be swapped: `requireMember` in `server/src/auth/guard.ts` says so in its own header comment. The gateway-header reader is deleted, and the guard starts reading a session cookie and looking a token up in a new `sessions` table. Every handler downstream needs zero changes, which is the biggest confidence-booster in this research.

The stack is small and already pinned against the server's `hono` 4.13.3: `argon2` 0.6.2 for hashing, `hono/cookie` for the session cookie, and `hono-rate-limiter` 0.5.1 for the throttle on `/sign-in`. All three were re-verified against the registry during this research and passed the legitimacy gate. No session framework, no signed-token library, no cache.

Three things change what the planner should write compared with what CONTEXT.md assumed. First, **the web app's router has renamed its `guard` hook to `gate`**, confirmed by reading the vendored docs and by a real build; D-09 through D-11 hold entirely and only the filename changes. Second, **the route gate does not slow the static catalogue pages**, measured before and after. Third, **the rate limiter needs a custom key function**, because the built-in one reads a header the proxy does not set.

**Primary recommendation:** Swap `requireMember`'s body in place (cookie plus table lookup, same contract), rate-limit `/sign-in` with a custom key reading the proxy's client-address header plus the submitted handle, gate every route through the one guard, and route-gate the front end with a `gate.ts` that validates the cookie against the server on every request, failing closed per D-11.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Password verification, session issue, lookup and revocation | API / Server | Database / Storage | `requireMember` and the new `sessions` table are the source of truth |
| Route-gate redirect (signed-out to `/sign-in`) | Front-end server | API / Server (session check) | The redirect is decided before render, but is not authoritative: the server re-checks every call |
| Session cookie storage | Browser | — | `HttpOnly`, `Secure`, `SameSite=Lax`, invisible to scripts |
| Sign-in throttling | API / Server | — | Stateful in-process limiter scoped to `/sign-in` and change-password (D-19) |
| Forced password change | API / Server | — | Server-side flag in the shared guard (D-12) |
| Account bootstrap (`steward` CLI) | API / Server | — | A second entry point, never network-facing |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `argon2` | 0.6.2 | Password hashing (Argon2id) | Memory-hard and the first recommendation of the usual guidance [VERIFIED: registry — latest 0.6.2] |
| `hono-rate-limiter` | 0.5.1 | Two-key throttle on `/sign-in` | Works with the pinned `hono` 4.13.3 [VERIFIED: registry dependency data] |
| `hono` | 4.13.3 | Cookie helper and middleware | Already in the tree [VERIFIED: package-lock.json] |

### Supporting (no new dependency)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `node:crypto` | Session-token randomness | Reuse the ticket store's 32-byte discipline, hex-encoded |
| `better-sqlite3` | `members` and `sessions` tables | New migration follows the rationale-header convention of the earlier ones |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Opaque table sessions | Self-issued signed token | Rejected: a signed token cannot be withdrawn without a revocation list, which rebuilds the table anyway |
| Hand-rolled guard swap | A full session framework | Rejected: a second competing abstraction beside the guard and the ticket store |
| Built-in key function | A custom client-address key | The built-in reads headers the proxy never sets; see Pitfalls |
| `argon2` | `bcrypt` or `scrypt` | Rejected: smaller work factor, or an older runner-up |

**Installation:**
```bash
# Server additions
cd server && npm install argon2@0.6.2 hono-rate-limiter@0.5.1

# Web: no new packages — the gate uses the router already vendored.
```

**Version verification:** both versions were read from the registry on the research date; they match the earlier stack research exactly.

## Package Legitimacy Audit

Checked with the package-legitimacy gate against the registry directly.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `argon2` | npm | first published 2016-03-02 (~10 yrs) | 910,000/wk | `github.com/example-org/node-argon2` | OK | Approved |
| `hono-rate-limiter` | npm | first published 2023-07-11 (~2 yrs) | 88,000/wk | `github.com/example-org/hono-rate-limiter` | OK | Approved |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

Neither package name was found through search or recall alone; both were checked against the live registry in addition to matching the earlier stack research.

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │  1. GET /sheds  (lend_session cookie attached automatically)
  ▼
Web app route gate (gate.ts)
  │  reads lend_session cookie
  │  2. validates the cookie against the server ─────┐
  │     (short timeout; fail closed to /sign-in)      │
  ▼                                                    ▼
(cookie valid)                                Server session check
  │                                            │  SELECT ... FROM sessions
  │ renders page                               │  WHERE id=? AND ended_at IS NULL
  ▼                                            │  AND expires_at > now()
Page (client component)                        │
  │  3. fetch(`${API}/api/sheds`)               │
  ▼                                             ▼
Server router (createApp)
  │  4. requireMember
  │     - reads the Cookie header
  │     - session lookup (same query shape)
  │     - checks must_change (D-12)
  ▼
Handler  (unchanged: takes the member, never knows how it was made)

Sign-in path (separate, rate-limited):
Browser → POST /sign-in {handle, password}
  ▼
Rate limiter (scoped to /sign-in only, D-19)
  │  keyed on (client address, submitted handle)
  │  429 + Retry-After if either limit is exceeded
  ▼
Sign-in handler
  │  lookup member by lowercased handle
  │  found     → verify against the real hash
  │  NOT found → verify against a fixed dummy hash anyway (D-18)
  ▼
(success) → INSERT INTO sessions (...) → Set-Cookie: lend_session=...
```

### Recommended Project Structure

```
server/src/
├── auth/
│   ├── guard.ts          # requireMember — swapped in place, same contract
│   ├── session.ts        # NEW: hashing, sign-in and sign-out, session CRUD
│   └── legacy-header.ts  # DELETED wholesale
└── steward/
    └── cli.ts            # NEW: create, list, reset
```

### Pattern 1: Swap the guard body, not its contract

**What:** `requireMember` keeps its signature and return type; only the lookup changes. Handlers keep taking a `Member` and never learn how it was produced.

**When to use:** whenever the authenticator changes under a stable seam.

### Pattern 2: The must-change gate lives in the seam, not in routing

**What:** the guard refuses every endpoint except change-password and sign-out while `must_change` is set. The front end only routes on the distinct status.

### Pattern 3: The ticket-mint pattern is retained unchanged

**What:** only the identity feeding `mintSocketTicket` and `mintDownloadTicket` changes. The tickets themselves are untouched.

### Anti-Patterns to Avoid

- **Dual-mode auth surviving cutover:** any "fall back to the old gateway header" path is Pitfall 2's exact failure mode. Delete the legacy reader wholesale; do not leave it "disabled but present."
- **Trusting a forwarded-for header through the proxy:** reports document it being set wrongly for the origin; read the proxy's own client-address header instead.
- **A session cache in front of the lookup:** it would bring back the propagation delay revocation exists to close.
- **The old `guard.ts` hook name in the web app:** deprecated in the current router; write `gate.ts` directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom salted SHA comparison | `argon2`, Argon2id, standard parameters | Not memory-hard; fast to crack at scale |
| Session revocation | A signed token plus client-side expiry | An opaque session row with `ended_at` | A signed token cannot be withdrawn without rebuilding this table |
| Rate limiting | A token bucket in the sessions table | `hono-rate-limiter` | Temporary, self-healing, already version-matched |
| Client address behind the proxy | Trusting the raw peer address | A custom key function reading the proxy header first | The default reads the wrong headers for this deployment |
| Constant-time sign-in response | Ad-hoc `sleep()` padding | Always run a real verify, against a dummy hash for unknown handles | Padding does not hide compute-time variance |

**Key insight:** every piece here has a shipped analogue in the codebase (the ticket store's token discipline, the WAL durability substrate, the dev-bypass startup panic). The work is substitution, not invention.

## Runtime State Inventory

This phase retires the gateway allow-list as the authenticator — an external system, not a rename, but with the same "what still points at the old thing" shape.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `members` and `sessions` are brand-new tables. `audit_log` keeps its historical gateway addresses verbatim (D-08). | None — verified against the first migration's `actor TEXT NOT NULL` shape. |
| Live service config | The allow-list for `lendshed.example` lives in the proxy dashboard, not in this repository. D-07 requires it be removed at cutover. | **Manual operator action:** remove the allow-list entry in the dashboard as part of the cutover deploy. |
| OS-registered state | The service unit's environment file still carries two gateway variables that become dead config. | Code edit: replace the startup check that panics on them; optional cleanup of the two variables at deploy time. |
| Secrets/env vars | No new secret: an opaque random token needs no signing key. `steward` exists so no bootstrap credential lands in the environment file. | None beyond the cleanup above. |
| Build artifacts | `package.json` declares no `bin` entries yet, so `steward` needs one pointing at `dist/steward/cli.js`. | Code edit during execution. |

## Common Pitfalls

### Pitfall 1: The auth swap leaves a side door open

**What goes wrong:** socket upgrade, download-serve and future admin routes each need their own session check; it is easy to migrate the obvious REST routes and miss one.
**Why it happens:** a route added straight to the router without taking the guard would silently bypass it.
**How to avoid:** produce a route inventory (every entry in `createApp`, twelve today) marked per row "gated by `requireMember`: yes/no, intentionally public." Treat a blank cell as a build blocker.
**Warning signs:** a route reachable with `curl` and no cookie after cutover.
**Phase to address:** This phase — the inventory is its done-ness criterion.

### Pitfall 2: Fail-open on cutover

**What goes wrong:** a dual-mode "no cookie, so check the old header" escape hatch left in past cutover is forgeable once the allow-list stops authenticating at the edge.
**Why it happens:** dual-mode auth is genuinely useful mid-migration.
**How to avoid:** delete the legacy reader wholesale, not behind a flag.
**Warning signs:** any lookup failure treated as a pass.
**Phase to address:** This phase, closing task.

### Pitfall 3: Sign-in leaks account existence

**What goes wrong:** a handler that returns early on "no such handle" before hashing is measurably faster than the wrong-password path.
**Why it happens:** the natural implementation returns early when there is nothing to hash against.
**How to avoid:** D-18 — always run a real verify, against a fixed dummy hash when the handle does not exist, and return byte-identical responses.
**Warning signs:** an early return on handle-not-found before any hashing.
**Phase to address:** This phase — write both as explicit tests.

### Pitfall 4: Session fixation and forced-change bypass

**What goes wrong:** a pre-sign-in session id reused after sign-in; a password change that leaves other sessions valid; the forced change enforced only by a front-end redirect.
**Why it happens:** revocation-on-event and the forced-change gate are easy second passes, and UI routing is quick to demo.
**How to avoid:** issue a brand-new session on every sign-in; end other sessions in the same transaction as a password change; keep the flag in the guard.
**Warning signs:** the must-change check exists only in a route guard with no server twin.
**Phase to address:** This phase.

## Code Examples

### Argon2id hash and verify with a dummy-hash fallback (D-18)

```ts
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0$ZHVtbXloYXNo';

export async function checkPassword(row: MemberRow | undefined, given: string): Promise<boolean> {
  const hash = row?.password_hash ?? DUMMY_HASH;
  const ok = await argon2.verify(hash, given).catch(() => false);
  return row !== undefined && ok;
}
```

### Session cookie shape (D-09 through D-11's target)

`lend_session=<64 hex>; HttpOnly; Secure; SameSite=Lax; Path=/`. No `Max-Age`: the server-side `expires_at` is the authority, and the gate re-validates against the server on every navigation anyway.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Router `guard.ts` hook | `gate.ts` hook, `export function gate(...)` | Router 6.0 | The old name still builds with a deprecation warning; D-09 to D-11 are unaffected in substance. |
| Proxy allow-list identity | Member-owned sessions, table-backed | This phase (2026-03 milestone start) | The box loses its edge shield, so the limiter and the fail-closed guard become the sole front door. |

**Deprecated/outdated:**
- `guard.ts`: still functional but deprecated; write `gate.ts` directly.
- The proxy allow-list as authenticator: retired by D-07.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Proposed thresholds — address: burst 10 / refill 1 per 30s; handle: burst 5 / refill 1 per 60s | §Code Examples, OPEN-03 | Too loose: brute force succeeds first. Too strict: the whole steward desk, sharing one address, is throttled in normal use. |
| A2 | The limiter's key function is address-shaped, so the handle axis likely needs a small hand-rolled counter | §Code Examples | If the library supports a body-derived key cleanly, the counter is extra code. |
| A3 | The client-address header is present on every request reaching the origin through this proxy | Pattern 3, OPEN-02 | If it is stripped, every request looks like loopback and all members share one bucket. |
| A4 | An explicit `bin` entry is required for `steward` to build | Runtime State Inventory | Harmless but unnecessary if auto-discovery covers it. |

## Open Questions

1. **OPEN-01 — RESOLVED.** Adding the route gate does not slow the static catalogue pages. A build was run three times (baseline, old hook name, new hook name) and the page stayed static each time.

2. **OPEN-02 — Narrowed, not fully closed.** The proxy's client-address header is the documented edge-set value, and the forwarded-for header has a reported bug through this proxy. What is still unclear is whether this proxy's ingress rule forwards the header unmodified. Recommendation: acceptance should include a real request confirming the logged address matches the client's.

3. **OPEN-03 — Proposed, not tested.** No authoritative numeric thresholds exist; the defaults in A1 are a starting point to confirm with the user.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `argon2` (npm) | Password hashing | ✓ | 0.6.2 | — |
| `hono-rate-limiter` (npm) | Sign-in throttle | ✓ | 0.5.1 | — |
| Node.js / `npm` | Server and web build | ✓ | Node v22.23.1, npm 10.9.8 | — |
| Proxy dashboard access | D-07 cutover | Not verifiable from this session | — | None — a required manual operator step |

**Missing dependencies with no fallback:** none blocking code work. The allow-list removal (D-07) is an operational step the rollout plan must account for.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest` 4.1.11 for server and web |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- server/src/auth` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIGN-01 | Sign-in succeeds with valid credentials, no gateway header | integration | `npm test -- session-flow` | ❌ Wave 0 |
| SIGN-02 | A `must_change` session is refused everywhere except change-password and sign-out | integration | `npm test -- forced-change` | ❌ Wave 0 |
| SIGN-03 / SIGN-04 | Sign-out refuses the next ticket mint | integration | `npm test -- ticket-flow` | ✅ existing — extend |
| SIGN-05 | Unknown-handle and wrong-password parity; throttled 429 is time-boxed | integration | `npm test -- sign-in-safety` | ❌ Wave 0 |
| SIGN-06 | A session row survives an ungraceful close and reopen | integration | `npm test -- session-durability` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- server/src/auth`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green, plus the route-inventory table reviewed as a checklist.

### Wave 0 Gaps

- [ ] `server/test/session-flow.test.ts` — covers SIGN-01
- [ ] `server/test/forced-change.test.ts` — covers SIGN-02
- [ ] `server/test/sign-in-safety.test.ts` — covers SIGN-05
- [ ] `server/test/session-durability.test.ts` — covers SIGN-06
- [ ] `server/migrations/0003_members_and_sessions.sql` — schema needed first

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Argon2id with standard parameters; dummy-hash verify for unknown handles (D-18) |
| V3 Session Management | yes | Opaque 256-bit tokens, `HttpOnly`/`Secure`/`SameSite=Lax`, sliding 14-day idle expiry (D-01), fresh id on sign-in |
| V4 Access Control | partial | This phase only enforces "valid, non-must-change session"; roles belong to the next phase |
| V5 Input Validation | yes | Handle normalization and the 12-character rule validated server-side |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Handle enumeration via timing or response | Information Disclosure | Dummy-hash verify plus identical responses (D-18, Pitfall 3) |
| Session fixation | Spoofing | Fresh session row on every sign-in |
| Credential stuffing | Spoofing | Two-key self-healing limiter, never permanent (D-16, D-17) |
| Forced-change bypass via direct API | Elevation of Privilege | Server-side flag in the shared guard (D-12) |

## Sources

### Primary (HIGH confidence)
- `server/src/auth/guard.ts`, `server/src/auth/dev-bypass.ts` — read directly; current guard contract.
- `server/src/tickets/store.ts` — ticket-mint pattern, confirmed zero-change carry-forward.
- `server/migrations/0001_init.sql` — `audit_log.actor` raw-TEXT shape confirmed (D-08).
- npm registry API — live-queried for `argon2` and `hono-rate-limiter`.
- Three real builds of the web app (baseline, old hook name, new hook name) — empirical resolution of OPEN-01.

### Secondary (MEDIUM confidence)
- [hono-rate-limiter docs](https://docs.example.org/hono-rate-limiter) — key function signature.
- [Proxy header reference](https://docs.example.org/proxy/headers) — client-address header guidance.

### Tertiary (LOW confidence)
- Proposed numeric thresholds (OPEN-03/A1) — no authoritative source; a proposal for the user to confirm.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version re-verified live against the registry.
- Architecture: HIGH — the swap is grounded in a direct read of the file being modified.
- Pitfalls: HIGH — narrowed to the four items relevant to this phase.
- OPEN-02: Narrowed but not closed — MEDIUM confidence.

**Research date:** 2026-03-24
