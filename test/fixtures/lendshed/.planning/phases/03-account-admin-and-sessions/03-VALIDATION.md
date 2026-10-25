---
phase: 3
slug: account-admin-and-sessions
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 3 — Validation Strategy

> The agreed way to sample feedback while this phase is built.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (server)** | `vitest` with `supertest`; every test runs the migrations through `openStore` on a throwaway file or in-memory SQLite store |
| **Framework (web)** | `vitest` on `web/lib/*.test.ts`. There is no DOM, so each parser and codec added here sits in a plain `lib/*.ts` module |
| **Config file** | none — server tests live next to the code and in `server/test/*.test.ts`; web tests are found by glob |
| **Quick run command (server)** | `cd server && npx vitest run <file>` |
| **Quick run command (web)** | `(cd web && npx vitest run lib/<file>.test.ts)` |
| **Full suite command (server)** | `cd server && npx vitest run` |
| **Full suite command (web)** | `(cd web && npm run test)` |
| **Estimated runtime** | one server file ~3-10s; one web file under 2s; whole server suite ~40-70s; whole web suite ~4s |

---

## Sampling Rate

- **After every task commit:** whichever one-file command that task's `<verify>` block names
- **After each plan wave:** `cd server && npx vitest run` together with `(cd web && npm run test)`
- **Before `/gsd-verify-work`:** both whole suites pass, lint and build pass, and `route-capability` shows that each new `/api/desk/*` route has a stated capability
- **Max feedback latency:** 15 seconds per task check; 90 seconds at a wave gate

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | ADMN-03 | T-03-41/02/03 | Disabling cuts REST, socket and ticket access together; the last-steward test refuses only when no steward would remain | integration | `cd server && npx vitest run test/disable-revocation.test.ts` | ❌ created by this task | ⬜ pending |
| 3-01-02 | 01 | 1 | ADMN-06 | T-03-45 | Account, role and grant events all pass through one log-writing seam, with the actor filled in by the server | unit | `cd server && npx vitest run src/log/write` | ✅ extend existing | ⬜ pending |
| 3-01-03 | 01 | 1 | ADMN-03 | T-03-43 | The page offers no self-disable; the last-steward refusal appears in the Account block's own spot | unit + build | `(cd web && npm run test)` then `npm run build` | ✅ extend existing | ⬜ pending |
| 3-02-01 | 02 | 1 | ADMN-05 | T-03-50 | A single client-address resolver, closed when none is found, used by both the limiter and session issue | unit | `cd server && npx vitest run src/limiter` | ✅ extend existing | ⬜ pending |
| 3-02-02 | 02 | 2 | ADMN-03, ADMN-05 | T-03-48, T-03-49 | The disabled notice shows only after a genuine hash check; the three wrong-password routes remain byte-identical and similar in timing | integration | `cd server && npx vitest run test/sign-in-enumeration.test.ts` | ✅ extend existing | ⬜ pending |
| 3-03-01 | 03 | 2 | ADMN-01, ADMN-02 | T-03-53 | A password typed by a steward goes to the hasher and nowhere else; a reset leaves every session row alone | unit | `cd server && npx vitest run src/guard/store` | ✅ extend existing | ⬜ pending |
| 3-03-02 | 03 | 2 | ADMN-04, ADMN-05 | T-03-54, T-03-55 | Each of the three deletes is spelled out (no key enforcement would catch an omission); `is_current` is decided from the caller's raw token | unit | `cd server && npx vitest run src/guard/store` | ✅ extend existing | ⬜ pending |
| 3-03-03 | 03 | 2 | ADMN-01, ADMN-02, ADMN-04 | T-03-56, T-03-57 | A deleted member's log history stays readable with its actor unchanged; every new route states its capability | integration | `cd server && npx vitest run test/delete-keeps-log.test.ts test/route-capability.test.ts` | ❌ created by this task | ⬜ pending |
| 3-04-01 | 04 | 3 | ADMN-06 | T-03-61 | A target that cannot be decoded is shown as written rather than dropped | unit | `(cd web && npx vitest run lib/log-target.test.ts)` | ❌ created by this task | ⬜ pending |
| 3-04-02 | 04 | 3 | ADMN-06 | T-03-62, T-03-63 | The action union matches the server's list, so no account event can silently fail to render | unit + build | `(cd web && npm run test)` then `npm run build` | ✅ extend existing | ⬜ pending |
| 3-05-01 | 05 | 4 | ADMN-05 | T-03-76 | The raw agent string is never shown; each unknown case gets a clear label | unit | `(cd web && npx vitest run lib/device-label.test.ts)` | ❌ created by this task | ⬜ pending |
| 3-05-02 | 05 | 4 | ADMN-04 | T-03-78, T-03-79 | Typing the handle must match exactly, case included; the page offers no self-delete | unit | `(cd web && npx vitest run lib/desk-summary.test.ts)` | ✅ extend existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Nothing new is needed up front — **no stand-alone Wave 0 pass**, which is why
`wave_0_complete` is already true.

Both runners came in with Phases 1 and 2 and need no extra dependency. This phase adds
four test files, and each one is written by the task whose behaviour it checks, inside that
task's own commit:

- `server/test/disable-revocation.test.ts` — task 3-01-01
- `server/test/delete-keeps-log.test.ts` — task 3-03-03
- `web/lib/log-target.test.ts` — task 3-04-01
- `web/lib/device-label.test.ts` — task 3-05-01

Two files that already exist grow instead of being replaced:
`server/test/sign-in-enumeration.test.ts` (gains the disabled-account timing case, task
3-02-02) and `server/test/route-capability.test.ts` (gains a row for each new route, tasks
3-01-01 and 3-03-03).

No task is left with a `MISSING` automated verify.

---

## Manual-Only Verifications

Human checks run once at the end of the phase, so none of the plans holds a
`checkpoint:human-verify` task; each carries a `<human-check>` block, and the blocks are
collected below as the observation list for the end.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The Account block's badge, its state-labelled button, the confirmation dialog and the self-disable caption look right in both themes | ADMN-03 | With no DOM in the runner, nothing automatic can replace this and nothing should be invented | Plan 03-01 `<human-check>` |
| A disabled member's sign-in shows the plain notice and treats the fields correctly; a wrong password gets the generic reply instead | ADMN-03 | Needs a real browser talking to a live server | Plan 03-02 `<human-check>` |
| Account rows mix into `/log`, the Accounts filter narrows to them, and the Detail cell is cut short instead of stretching the table | ADMN-06 | Layout and truncation show up only in a rendered browser | Plan 03-04 `<human-check>` |
| The Sessions rows, the lone this-is-you badge among concurrent sessions, the empty state after a disable, and the typed-handle delete gate | ADMN-04, ADMN-05 | Needs a real browser and a member signed in on two devices; carries two viewport backstops | Plan 03-05 `<human-check>` |

Four `must_haves.truths` across the phase carry
`verification: backstop` (two in plan 03-05, one each in plans 03-01 and
03-04). When the verifier lacks clear evidence for a backstop truth it hands over to
`human_needed` instead of passing it quietly; each one matches a row in the list above.

Two `must_haves.prohibitions` (one in plan 03-01, one in plan 03-03) have no descriptor, so
they end up flagged-unverified — recorded intent sent on for review, not claimed as passing.

---

## Validation Sign-Off

- [x] Each task has an `<automated>` verify or a Wave 0 dependency
- [x] Sampling continuity: no run of 3 tasks without an automated verify
- [x] Wave 0 covers every MISSING reference — none carries a MISSING marker
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** written by `/gsd-plan-phase`; `status` remains `draft` until `/gsd-validate-phase 3` approves it.
