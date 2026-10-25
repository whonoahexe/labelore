---
phase: 1
slug: member-sign-in-sessions
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-24
updated: 2026-03-27
---

# Phase 1 — Validation Strategy

> How feedback is sampled while this phase is executed.
> Drafted by `/gsd-plan-phase 1` out of the Validation Architecture notes.
> Task IDs get filled in after the PLAN.md files are written.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` for the server and the web client |
| **Config file** | `server/vitest.config.ts` — one project per package, nothing else |
| **Quick run command** | `cd server && npx vitest run --project unit` |
| **Full suite command** | `cd server && npx vitest run` && `cd web && npm run test` |
| **Estimated runtime** | ~20 seconds (quick) / ~90 seconds (full) |

The server is an app factory with a slim `main.ts`, which lets quick in-process tests
cover the wiring without opening a port — so the quick run can gate every commit for real
and is no mere smoke check.

---

## Sampling Rate

- **After each task commit:** `cd server && npx vitest run --project unit`
- **After each plan wave:** the whole server suite plus `cd web && npm run build && npm run test`
- **Before `/gsd-verify-work`:** everything green, **and** a person has walked the route
  inventory table as a checklist instead of trusting a green run
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01 T1 | 01-01 | 1 | SIGN-01 | T-01-41, T-01-46 | Sign-in succeeds with valid credentials; the kiosk passcode is consulted nowhere | integration | `cd server && npx vitest run test/sign-in-flow.test.ts` | ✅ created (replaced `passcode-check.test.ts`) | ✅ green |
| 01-02 T2 | 01-02 | 2 | SIGN-02 | T-01-50 | A `must_change_password` session is turned away everywhere except the three exempt routes, including direct calls | integration | `cd server && npx vitest run test/forced-password-change.test.ts` | ✅ created | ✅ green |
| 01-02 T1 | 01-02 | 2 | SIGN-03 | T-01-53 | A socket ticket is verified against a live session and refused once signed out | integration | `cd server && npx vitest run test/socket-ticket-flow.test.ts` | ✅ extended | ✅ green |
| 01-02 T1 | 01-02 | 2 | SIGN-04 | T-01-53 | A download ticket is verified against a live session and refused once signed out | integration | `cd server && npx vitest run test/download-ticket.test.ts` | ✅ extended | ✅ green |
| 01-04 T3 | 01-04 | 3 | SIGN-05 | T-01-62 | An unknown handle and a wrong password are indistinguishable in the reply *and* in timing | integration | `cd server && npx vitest run test/sign-in-enumeration.test.ts` | ✅ created | ✅ green |
| 01-04 T3 | 01-04 | 3 | SIGN-05 | T-01-61, T-01-65 | Repeat failures get a time-boxed 429 on the address axis and on the handle axis | integration | `cd server && npx vitest run test/sign-in-rate-limit.test.ts` | ✅ created | ✅ green |
| 01-01 T2 | 01-01 | 1 | SIGN-06 | — | A session row survives a hard process kill and a reopen of the store | integration | `cd server && npx vitest run test/session-durability.test.ts` | ✅ created | ✅ green |
| 01-05 T1 | 01-05 | 3 | SIGN-05 | T-01-70 | The wait-time text rounds upward and never shows zero, at any boundary | unit | `cd web && npm run test` | ✅ created (`lib/sign-in-copy.test.ts`) | ✅ green |
| 01-06 T3 | 01-06 | 4 | SIGN-01, SIGN-05 | T-01-74, T-01-78 | The passcode gate is removed; the app alone authenticates and the renewal path is open | manual | — (see Manual-Only Verifications) | ✅ green |

**Where the suite stood when the phase closed (2026-03-27):** server `npx vitest run` → **212 passed, 0 failed**
in 19 files; web `npm run test` → **31/31**; `npm run lint` → 0 errors (a single older
`react-hooks` warning in the catalogue list, not from this phase); `npm run build` → clean,
and `/catalogue/[shed]/[[...category]]` is still listed as static, so the prerender gain from
the earlier quick task survives.

Two `socket/reconnect` cases will not run on this machine, because a long-running feed process
already owns the fixed test port (see `ops/NOTES.md`). That predates this phase and is no regression.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `server/migrations/0003_members_and_sessions.sql` — the schema every test below needs
- [x] `server/test/sign-in-flow.test.ts` — stubs for SIGN-01
- [x] `server/test/forced-password-change.test.ts` — stubs for SIGN-02
- [x] `server/test/sign-in-enumeration.test.ts` — SIGN-05 (reply and timing parity) — Plan 01-04 T3
- [x] `server/test/sign-in-rate-limit.test.ts` — SIGN-05 (429 and backoff, address + handle axes) — Plan 01-04 T3
- [x] `server/test/session-durability.test.ts` — stubs for SIGN-06, modelled on the store test that closes without a flush
- [x] `web/lib/sign-in-copy.test.ts` — wait-time boundary and rounding contract (plan 01-05 T1)

No framework to install: `vitest` already runs on both sides. The files
`server/test/socket-ticket-flow.test.ts` and `server/test/download-ticket.test.ts` are already there and
get **extended, not replaced**.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Observed | Outcome |
|----------|-------------|------------|-------------------|----------|---------|
| The kiosk passcode prompt shows up nowhere during sign-in | SIGN-01 | Depends on the live proxy and its real zone settings; nothing local matches it | Open the live desk address in a fresh browser profile, sign in, and check that the member form is the only prompt shown | ✅ 2026-03-27 | **PASS.** The member form is the only screen shown. |
| The client-address header genuinely arrives at the server through this proxy | SIGN-05 | The repo holds no proxy config, so forwarding cannot be tried from the dev machine (OPEN-02) | Call an echo route through the live proxy and confirm the header carries the true client address | ✅ 2026-03-27 | **PASS.** Header present and correct. |
| The renewal challenge path stays reachable and open after cutover | SIGN-01 | Depends on the live proxy zone; no local equivalent | Request the challenge path on the live hostname and check that the origin replies rather than a prompt | ✅ 2026-03-27 | **PASS.** The origin answers 404, not a prompt. |
| A session outlives a real power cut (not just a reopened store) | SIGN-06 | A hard process kill is scriptable; a true power interruption is not | Sign in, cycle the host's power, reload the page, and check that no new sign-in is requested | ⬜ not observed | **Open.** Deliberately postponed — cutting power on a shared host needs a quiet hour. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] Route inventory checklist reviewed
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
