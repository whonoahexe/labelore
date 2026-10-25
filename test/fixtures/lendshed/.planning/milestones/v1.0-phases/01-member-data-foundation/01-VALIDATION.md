---
phase: 01
slug: member-data-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-01-12
---

# Phase 01 — Validation Strategy

> How feedback is sampled while this phase is executed.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` over the server package, with `supertest` for handler-level checks and a real `net` listener plus `ws` for socket protocol tests |
| **Config file** | none — Plan 01 creates the package and every feature plan then writes tests first |
| **Quick run command** | `cd server && npx vitest run --project unit` |
| **Full suite command** | `cd server && npx vitest run` |
| **Estimated runtime** | ~20–40 seconds (the listener tests dominate) |

---

## Sampling Rate

- **After a task commit:** `cd server && npx vitest run --project unit`
- **After a plan wave:** `cd server && npx vitest run`
- **Before `/gsd-verify-work`:** the suite is green, AND the manual spike checklist (Plan 01 Task 3) has been signed off on the live host
- **Max feedback latency:** ~40 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | MEMB-01/02 | T-01-SC | Package and module skeleton compiles; allowed origin is explicit; bind is loopback-only | unit | `cd server && npm run build && npx vitest run --project unit` | ❌ create | ⬜ pending |
| 01-01-02 | 01 | 1 | MEMB-02 | T-01-42 | Spike-quality ticket mint and consume, one use only; socket first message; download path segment | integration | `cd server && npx vitest run test/spike-ticket-flow.test.ts` | ❌ create | ⬜ pending |
| 01-01-03 | 01 | 1 | MEMB-01/02 | T-01-41/02/03 | Spike: live mint→socket→download; forged header→401; proxy-only | manual | — (see Manual-Only) | N/A | ⬜ pending |
| 01-02-01 | 02 | 2 | MEMB-01 | T-01-44/05/06 | A missing, forged or wrong passcode is refused; the right one passes; the check sits behind one seam | integration | `cd server && npx vitest run test/passcode-check.test.ts` | ❌ create | ⬜ pending |
| 01-02-02 | 02 | 2 | MEMB-01 | T-01-47 | `DEV_MODE=1` aborts on a public-shaped bind; the dev member exists only on loopback | unit | `cd server && npx vitest run src/auth/dev-bypass` | ❌ create | ⬜ pending |
| 01-03-01 | 03 | 3 | MEMB-02 | T-01-49/10 | Random 45s ticket, one use; atomic consume; expiry sweep; mint behind the passcode | unit | `cd server && npx vitest run src/tickets` | ❌ create | ⬜ pending |
| 01-03-02 | 03 | 3 | MEMB-02 | T-01-49 | Socket accepts a valid ticket; missing, bogus, expired or reused → close 1008 | integration | `cd server && npx vitest run test/socket-ticket-flow.test.ts` | ❌ create | ⬜ pending |
| 01-04-01 | 04 | 2 | MEMB-01/02 (D-06/07) | T-01-54/16 | WAL and full sync checked; checkpoint at boot; `loan_log` round trip; one table only | unit | `cd server && npx vitest run src/db` | ❌ create | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Every test file is new and is written first inside the plan that owns the behaviour (a stand-alone Wave 0 plan cannot exist, since the package is only created by Plan 01). Files created:

- [ ] `server/test/spike-ticket-flow.test.ts` (Plan 01 — spike-grade ticket, socket and download)
- [ ] `server/test/passcode-check.test.ts` (Plan 02 — MEMB-01: missing, forged, valid, wrong-length, rotation)
- [ ] `server/src/auth/dev-bypass.test.ts` (Plan 02 — D-04 hard-gate abort)
- [ ] `server/src/tickets/store.test.ts` (Plan 03 — single-use, expiry, atomic, sweep)
- [ ] `server/test/socket-ticket-flow.test.ts` (Plan 03 — MEMB-02 socket accept, reject, reuse, real listener)
- [ ] `server/src/db/index.test.ts` (Plan 04 — settings and `loan_log` round-trip)

Install step: `npm i -D supertest ws` — nothing besides `vitest` itself in the way of a test framework.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spike: mint a ticket → open the socket → download, cross-origin, against the live desk address | MEMB-01, MEMB-02 | Needs real DNS, the real proxy and the real passcode gate — no test harness can stand in | Run the spike script against the live address and record each hop's status in the Plan 01 notes |
| Confirm the live passcode header name the proxy forwards (Open Question 1) | MEMB-01 | The header only exists once the proxy rule is configured | Request any gated route through the proxy and record which header carries the passcode; Plan 02 pins the name |

---

## Validation Sign-Off

- [x] Each task has an `<automated>` verify or is the deliberately manual spike
- [x] Sampling continuity: no 3 tasks in a row without an automated verify (the one spike checkpoint is manual, with reason)
- [x] Wave 0 covered — every test file is written first inside the plan that owns it
- [x] No watch-mode flags
- [x] Feedback latency < 40s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved (pending execution)
