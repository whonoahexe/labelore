<!-- made-up example · derived from gsd-core/templates/spec.md · gsd-core 1.19.0 -->
# Phase 1: Member Sign-In & Sessions — Specification

**Created:** 2026-03-22
**Ambiguity score:** 0.14 (gate: ≤ 0.20)
**Requirements:** 5 locked

## Goal

A member signs in to Lendshed with a username and password Lendshed itself holds, and stays signed in across a server restart; the shared kiosk passcode stops gating anyone.

## Background

Today the reverse proxy asks for one shared kiosk passcode and the server trusts whatever name the proxy forwards. There is no `members` table, no `sessions` table and no sign-out. Every steward and member shares one door, so the loan log cannot say who borrowed a drill. This phase puts accounts and sessions inside Lendshed and leaves the proxy as plain network transport.

## Requirements

1. **Account sign-in**: A member with a username and password signs in and receives a session.
   - Current: No member accounts exist; the kiosk passcode is the only gate
   - Target: `POST /api/sign-in` checks a scrypt-hashed password and sets a session cookie; a wrong password answers 401 with the same body as an unknown username
   - Acceptance: A seeded member signs in with the right password and gets a cookie; a wrong password and an unknown username return byte-identical 401 bodies

2. **Session survives a restart**: A signed-in member stays signed in across a server restart or power cut.
   - Current: There is no session, so nothing survives anything
   - Target: Sessions are rows in a `sessions` table with a 21-day sliding idle expiry, read on every request
   - Acceptance: Sign in, restart the server process, call `/api/whoami` with the same cookie and get the same member back

3. **Sign-out**: A member can end their own session at once.
   - Current: No sign-out exists
   - Target: `POST /api/sign-out` deletes only the session that sent the request; the member's other sessions stay
   - Acceptance: With two sessions open, signing out of one leaves `/api/whoami` working for the other and refusing the first

4. **Forced first password change**: A member created with a temporary password must choose their own before doing anything else.
   - Current: No temporary passwords exist
   - Target: A member flagged `must_change_password` gets 409 from every route except the password-change route and sign-out
   - Acceptance: A flagged member calling the loan list gets 409; after the change the same call returns 200

5. **Sign-in rate limiting**: Repeated failed sign-ins from one source are slowed down.
   - Current: Nothing limits attempts
   - Target: Five failed sign-ins in ten minutes from one address and username pair answers 429 for the next ten minutes
   - Acceptance: Six failed attempts in a minute return 429 on the sixth; a correct attempt after the window has passed returns 200

## Boundaries

**In scope:**
- `members` and `sessions` tables with scrypt hashing
- Sign-in, sign-out and the forced first password change
- Swapping the `SessionReader` seam to read Lendshed sessions
- Sign-in rate limiting
- Removing the kiosk passcode check from the proxy configuration

**Out of scope:**
- Steward roles and per-shed permissions — that is Phase 2
- An admin screen for accounts and live-session revocation — that is Phase 3
- Mailing passwords or reset links — decided out for the whole milestone
- Self-service sign-up — stewards create accounts by hand

## Constraints

- Passwords are hashed with scrypt from the standard library; no new hashing dependency
- The live-status socket and the export download route must accept Lendshed sessions in place of the passcode
- No credential may land in a config file or service unit

## Acceptance Criteria

- [ ] A seeded member signs in with the right password and receives a session cookie
- [ ] A wrong password and an unknown username return identical 401 bodies
- [ ] A session cookie still works after the server process restarts
- [ ] Signing out ends only the session that sent the request
- [ ] A member flagged `must_change_password` gets 409 everywhere but the password-change route and sign-out
- [ ] The sixth failed sign-in inside ten minutes returns 429
- [ ] The kiosk passcode no longer gates any route

## Edge Coverage

**Coverage:** 3/3 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| unknown username | R1 | ✅ covered | Acceptance Criteria 2: identical 401 bodies |
| expired session | R2 | ✅ covered | Acceptance Criteria 3: cookie works after a restart; idle expiry is a unit test on the reader |
| clock set backwards after a power cut | R2 | 🧪 backstop | Backstop test: a `last_seen` in the future is treated as just seen |
| two members sharing one address | R5 | ⛔ dismissed | The limiter keys on address and username together, so a shared kiosk address cannot lock out other members |

## Prohibitions (must-NOT)

**Coverage:** 2/2 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT store or log a plain-text password at any point | R1 | resolved | verification: test (log capture during a sign-in contains no password) |
| MUST NOT tell a caller whether a username exists | R1 | resolved | verification: test (identical 401 bodies and timing band) |
| MUST NOT keep the kiosk passcode as a fallback gate | R1 | dismissed | Covered by the removal item in Boundaries and Acceptance Criteria 7 |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      |                                    |
| Boundary Clarity   | 0.88  | 0.70 | ✓      | Phase 2 and 3 items named out      |
| Constraint Clarity | 0.78  | 0.65 | ✓      | Hashing and socket rules stated    |
| Acceptance Criteria| 0.84  | 0.70 | ✓      | Seven pass/fail criteria           |
| **Ambiguity**      | 0.14  | ≤0.20| ✓      |                                    |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective    | Question summary                | Decision locked                          |
|-------|----------------|---------------------------------|------------------------------------------|
| 1     | Researcher     | What gates the app today?       | One shared kiosk passcode at the proxy   |
| 2     | Simplifier     | Smallest useful account model?  | Username and password, no email          |
| 3     | Boundary Keeper| What waits for later phases?    | Roles to Phase 2, admin screens to Phase 3 |
| 4     | Failure Analyst| What breaks on a power cut?     | Sessions live in the database, not memory |

---

*Phase: 01-member-sign-in-sessions*
*Spec created: 2026-03-22*
*Next step: /gsd-discuss-phase 1 — implementation decisions (cookie flags, hash cost, the reader seam)*
