---
phase: 01
slug: member-sign-in-sessions
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-03-02
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Phase 01 dropped the edge sign-in shield and made Lendshed the only thing that checks who a member
is. Each threat below was written at plan time in the `<threat_model>` of the plan that opened the
surface; this file checks the dispositions against what shipped and does not invent the register
afterwards.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → API (via tunnel) | The only front door now that the edge no longer vets anyone | Credentials, session cookies |
| Edge → API (session check) | Cross-origin call with the cookie, made on every page load | Session cookie |
| anonymous caller → `POST /api/sign-in` | The one public route, and the only place passwords can be guessed | Handle + password |
| `MemberGuard` → every handler | The single identity checkpoint; whatever reaches a handler counts as signed in | Resolved member + must-reset flag |
| slip token (`/live`, `/slip/{token}`) → printer spool | A short-lived bearer token opens a connection with no cookie | 60s single-use tokens |
| browser → Web host (route gate) | A redirect choice made from an untrusted cookie; the API re-checks every call | Session cookie (opaque to the gate) |
| operator shell → `shedctl` process | A password is typed here and must not stay anywhere | First passwords |
| npm registry → Build | Third-party code enters the build | Package artifacts |
| SQLite `members.password_hash` at rest | Password material sitting on the host disk | Argon2id strings |
| throttle state (in-process) | Shared mutable counters keyed by address and by handle | Client addresses, submitted handles |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Spoofing | `POST /api/sign-in` | high | mitigate | Argon2id against a stored string (`auth/hash.ts:23,97`); a new session row on every success, never an upgraded pre-sign-in id | closed |
| T-01-02 | Information Disclosure | `signIn` handle lookup | high | mitigate | Fixed-cost dummy hash fallback (`auth/hash.ts:3`); byte-identical failures shown by `sign_in_enumeration.spec` including a clock comparison | closed |
| T-01-03 | Spoofing | session cookie | high | mitigate | 256-bit random token (`randomBytes(32)`, `hash.ts:233`); `HttpOnly`, `Secure`, `SameSite=Lax` (`hash.ts:274-276`) | closed |
| T-01-04 | Elevation of Privilege | `MemberGuard.resolve` | high | mitigate | Fails closed on every branch — no cookie, no row, `expires_at` passed, `paused_at` set (`auth/index.ts:129-140`) | closed |
| T-01-05 | Tampering | CSRF on state-changing endpoints | medium | mitigate | Cookie is `SameSite=Lax`; credentialed CORS is tied to a single named origin and never `*` (`server/app.ts` `buildRouter`) | closed |
| T-01-06 | Elevation of Privilege | dev-mode bypass reaching a routable bind | high | mitigate | Loopback-only start-up check kept (`auth/index.ts:197`) — see Residual Observations | closed |
| T-01-07 | Denial of Service | unbounded hashing work from long input | medium | mitigate | `MAX_PASSWORD_LEN` and `MAX_HANDLE_LEN` applied before hashing (`hash.ts:63,66,83,335`); the bound also covers `current_password` (`hash.ts:451`, commit `3be91d2`) | closed |
| T-01-08 | Repudiation | actor attribution in the ledger | low | accept | D-08 — the handle is copied as plain TEXT, no foreign key | closed |
| T-01-09 | Elevation of Privilege | forced-reset bypass through a direct API call | high | mitigate | The gate sits inside `resolve` (`auth/index.ts:151`), not in web routing; `forced_reset.spec` calls handlers directly | closed |
| T-01-10 | Elevation of Privilege | a later route skipping the guard | high | mitigate | `route_gate_coverage.spec` builds the path list from `buildRouter` and fails on a route with no verdict; `01-ROUTE-TABLE.md` read as a checklist (UAT test 3, passed) | closed |
| T-01-11 | Spoofing | a stolen session outliving a reset | high | mitigate | D-03 — all other sessions of the member are deleted in the same transaction as the hash write (`hash.ts:479,500`) | closed |
| T-01-12 | Spoofing | a slip token minted before sign-out used after it | medium | accept | D-04 — the 60s single-use window bounds it; asserted as a recorded contract. Tear-down of open sockets is Phase 3 ADMN-03 | closed |
| T-01-13 | Information Disclosure | reset-password validation messages | low | accept | The endpoint already needs a session; the generic-message rule covers the public sign-in route only | closed |
| T-01-14 | Denial of Service | unbounded sessions-table growth | low | mitigate | `sweepExpiredSessions` runs on a timer (`hash.ts:528`) | closed |
| T-01-15 | Information Disclosure | password passed as a command argument | high | mitigate | stdin only; `parseArgs` refuses any flag that carries a password (`shedctl.ts:121,163`) | closed |
| T-01-16 | Tampering | `shedctl` reachable over the network | low | accept | Second entry point with no listener, local only, never through the tunnel | closed |
| T-01-17 | Spoofing | throttle key forged through a forwarded header | high | mitigate | The extractor trusts only the edge client-address header (`throttle/index.ts:69`) and the socket address, and ignores any header a client supplies (unit-tested) | closed |
| T-01-18 | Denial of Service | locking a named member out on purpose | high | mitigate | Every block is time-limited and clears itself on both axes; the schema has no lockout column (grep-confirmed) | closed |
| T-01-19 | Elevation of Privilege | route gate treating an unreachable API as signed in | high | mitigate | Every thrown, aborted or non-ok result redirects to `/sign-in`; no retry, cache or grace path (`gate.ts:100,117,125`) | closed |
| T-01-20 | Information Disclosure | web reintroducing an enumeration channel | high | mitigate | One generic failure sentence in `SIGNIN_COPY`, no per-field variant (`auth-copy.ts:13-15`); both inputs flagged invalid together | closed |
| T-01-21 | Spoofing | session cookie readable by page scripts | medium | transfer | The API sets the cookie `HttpOnly` (01-01); the web code refers to its name only inside the gate's server-side read (`gate.ts:32,43`) and holds no token | closed |
| T-01-22 | Elevation of Privilege | the whole app once the edge shield is gone | critical | mitigate | Cut-over checklist run and recorded PASS 2026-03-02 in `01-VALIDATION.md`; no interstitial, and status and slip access checked afterwards | closed |
| T-01-23 | Repudiation | a sign-out that leaves a server session alive | low | accept | Deliberate — the client falls back to signed-out and the leftover session expires. Tear-down is Phase 3 ADMN-03 | closed |
| T-01-24 | Elevation of Privilege | edge-pass fallback surviving the cut-over | critical | mitigate | `edge-pass.ts` deleted outright (confirmed absent); a source-scanning test (`auth/index.ts:301`) fails if the assertion header name returns under `server/` | closed |
| T-01-25 | Information Disclosure | the `shed_profile` display cookie | low | accept | Holds handle and display name only, values the member already sees; never a token | closed |
| T-01-SC (01-01) | Tampering | `argon2`, `cookie`, `bottleneck` | high | mitigate | All three `OK` in RESEARCH.md § Package Legitimacy Audit, re-checked live against the npm registry; no `[ASSUMED]`/`[SUS]` package installed | closed |
| T-01-SC (01-03) | Tampering | package installs | low | mitigate | Nothing added — arguments are parsed by hand, so no unchecked package reaches the build | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01-01 | T-01-08 | Handles are stored as plain TEXT without a key, which means a handle reused after a Phase 3 delete looks like the same actor. It also gives ADMN-04 its readable history after a delete | Steward | 2026-03-02 |
| R-01-02 | T-01-12 | Sign-out is immediate only for new connections (D-04); the 60s single-use window bounds the gap. Closing an open socket is Phase 3 ADMN-03 | Steward | 2026-03-02 |
| R-01-03 | T-01-13 | Reset-password already needs a session, so a specific length message tells the caller nothing new | Steward | 2026-03-02 |
| R-01-04 | T-01-16 | `shedctl` has no listener and never runs behind the tunnel; nothing to add beyond not adding one | Steward | 2026-03-02 |
| R-01-05 | T-01-23 | The client falls back to signed-out and the leftover session expires by itself. Tear-down is Phase 3 ADMN-03 | Steward | 2026-03-02 |
| R-01-06 | T-01-25 | The `shed_profile` cookie carries a handle and display name the member already sees in their own top bar, and never a token | Steward | 2026-03-02 |

---

## Residual Observations

Not open threats — every register row has a closed status. Kept here so none of these is mistaken
for a new finding later.

**Dev-mode guard scope** (relates to T-01-06). The start-up check (`server/auth/index.ts:197`)
refuses dev-bypass auth only when `BIND_ADDR` is not loopback. This host binds `127.0.0.1:9120`
and is reached from outside through a tunnel that connects over loopback, so `SHED_MODE=open` in
`shed.env` would start without a word and satisfy every gated route by injected identity. The
mitigation is present as planned; what changed is that "loopback bind" stopped meaning "cannot be
reached from outside" once the tunnel landed in 01-03. Live behaviour is unaffected: an anonymous
`GET /api/me` returns 401, which the bypass would not give.

**Client-address header and the tunnel** (relates to T-01-17). OPEN-02 is settled — the header
does reach the origin through the tunnel (throttle-as-oracle, 2026-03-02). The leftover risk: with
no header the extractor uses the socket address, always `127.0.0.1` behind a tunnel, so losing the
header would put all callers in one bucket without any error.

**Unwatched fault cases (no threat ref).** Three UAT items were put off rather than failed, and
they are catalogued in `01-UAT.md` § Notes: the SIGN-06 power-cut case, the gate's fail-closed path under a
*valid* cookie, and the top bar's fall-back when `/api/me` goes quiet. None contradicts a
mitigation here; each is something nobody has yet seen.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-03-02 | 27 | 27 | 0 | /gsd-secure-phase (L1 short-circuit — register authored at plan time, ASVS 1) |

Breakdown: 20 `mitigate` checked against the code, 6 `accept` listed in the Accepted Risks Log, 1
`transfer` (T-01-21) recorded.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-03-02
