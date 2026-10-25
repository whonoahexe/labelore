---
phase: 2
slug: roles-and-permissions
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-30
---

# Phase 2 — Validation Strategy

> Validation contract for this phase: how feedback is sampled while it is built.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Server: `vitest` — unit files beside the source plus integration suites under `server/test/*.test.ts`, with `supertest` for HTTP and `ws` for the socket. Web: `vitest` scoped to `web/lib/*.test.ts` |
| **Config file** | `server/vitest.config.ts` and `web/vitest.config.ts` — each runner reads only its own package |
| **Quick run command** | `cd server && npx vitest run --project unit` · `cd web && npm test` |
| **Full suite command** | `cd server && npx vitest run && npx tsc --noEmit` · `cd web && npm test && npm run lint && npm run build` |
| **Estimated runtime** | ~60s server full (the password hashing dominates the sign-in-driving suites), ~4s server unit, ~3s web `npm test`, ~25s web build |

---

## Sampling Rate

- **After every task commit:** the server unit run (`cd server && npx vitest run --project unit`) for server work, `cd web && npm test` for web work
- **After each wave of plans:** the whole server suite with a type check (`cd server && npx vitest run && npx tsc --noEmit`) and the web trio (`cd web && npm test && npm run lint && npm run build`)
- **Before `/gsd-verify-work`:** both suites green, plus the route × capability matrix passing its set-equality check — the check that proves every route got a capability decision
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | ROLE-01 | — | N/A — `checkpoint:decision` that locks the irreversible table design | manual | none (blocking checkpoint) | n/a | ⬜ pending |
| 2-01-02 | 01 | 1 | ROLE-03, ROLE-06, ROLE-02, ROLE-05 | T-02-31…T-02-34, T-02-37 | Closed unless granted: no grant row means the shed listing answers 403; an unknown role or grant ends the session closed; an unknown shed name 404s ahead of the check | integration | `cd server && npx vitest run test/guard-enforcement.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | ROLE-06 | T-02-32, T-02-33, T-02-35 | Parsing accepts a closed list only; one unknown stored grant voids the whole session; a refusal is 403 and demonstrably never 409 | unit | `cd server && npx vitest run src/guard` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | ROLE-04, ROLE-05 | T-02-42, T-02-44, T-02-47 | Without `lend` a download ticket is turned down and nothing is minted; only a steward may read the loan log | unit | `cd server && npx vitest run src/api/tickets src/api/log` | ⚠️ modules exist, need new cases | ⬜ pending |
| 2-02-02 | 02 | 2 | ROLE-04 | T-02-39, T-02-41, T-02-43 | Transfers follow a direction; making a shelf is gated; cancel and retry work out their grant again from the job's saved sheds | unit | `cd server && npx vitest run src/api/jobs` | ⚠️ module exists, needs new cases | ⬜ pending |
| 2-02-03 | 02 | 2 | ROLE-04 | T-02-40, T-02-45 | Refusals on the source side and the destination side match byte for byte; a revoked grant bites on the very next request | integration | `cd server && npx vitest run test/guard-enforcement.test.ts` | ⚠️ created by 2-01-02 | ⬜ pending |
| 2-03-01 | 03 | 2 | ROLE-01, ROLE-06 | T-02-49, T-02-50, T-02-51 | A steward cannot demote themselves by construction; the steward count and the role change sit in one transaction; promoting wipes grants | unit | `cd server && npx vitest run src/guard/store` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | ROLE-05 | T-02-48, T-02-52 | Each of the four desk routes checks for a steward in its opening statement; an unknown grant string is rejected before anything is written | unit | `cd server && npx vitest run src/api/desk` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 3 | ROLE-03, ROLE-04 | T-02-55, T-02-58 | Each control's test stays closed while the payload is unresolved; the page copies the steward shortcut and the directional rule | unit | `cd web && npm test` | ❌ W0 | ⬜ pending |
| 2-04-02 | 04 | 3 | ROLE-02 | T-02-59 | The page fetches whoami itself, never retries, and never falls back to permissive | build | `cd web && npm run lint && npm run build` | ✅ | ⬜ pending |
| 2-05-01 | 05 | 3 | ROLE-02 | T-02-64, T-02-66 | The feed has a fixed capacity; sending with nobody listening does nothing; the event holds no grant data | unit | `cd server && npx vitest run src/ws/identity-feed` | ❌ W0 | ⬜ pending |
| 2-05-02 | 05 | 3 | ROLE-03 | T-02-80 | Cards begin unlinked and can only be upgraded; the only visible change is the missing link | build | `cd web && npm run lint && npm run build` | ✅ | ⬜ pending |
| 2-05-03 | 05 | 3 | ROLE-03, ROLE-05 | T-02-80 | Look and feel plus the pair of backstop failure-path checks | manual | none — see Manual-Only Verifications | n/a | ⬜ pending |
| 2-06-01 | 06 | 4 | ROLE-01, ROLE-06 | T-02-91, T-02-92 | Grant-cell text is exact; self-demotion is blocked up front; the count rule is left out of the page on purpose | unit | `cd web && npm test` | ❌ W0 | ⬜ pending |
| 2-06-02 | 06 | 4 | ROLE-01, ROLE-05, ROLE-06 | T-02-92, T-02-93 | How the grid behaves when saving fails, and both lockout refusals as they appear | manual | none — see Manual-Only Verifications | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Each ❌ in the map names a file that the owning task writes itself; none is scaffolding
prepared in advance, so there is no stand-alone Wave 0 pass. These are the files that have
to be present before the matching plan's `<verify>` step can run:

- [ ] `server/test/guard-enforcement.test.ts` — created by 2-01-02, extended by 2-01-03 and 2-02-03
- [ ] `server/src/guard/index.test.ts` — created by 2-01-03
- [ ] `server/src/guard/store.test.ts` — created by 2-03-01 (written first, TDD)
- [ ] `server/src/api/desk.test.ts` — created by 2-03-02
- [ ] `web/lib/permissions.test.ts` — created by 2-04-01 (written first, TDD)
- [ ] `server/src/ws/identity-feed.test.ts` — created by 2-05-01
- [ ] `web/lib/access-summary.test.ts` — created by 2-06-01 (written first, TDD)

Nothing needs installing on either side; both runners are already in place.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A shed card the member cannot open looks the same as any other except for the missing link: no dimming, padlock or badge, in either theme | ROLE-03 | Entirely visual, and the runner has no DOM, so there is nothing automatic to stand in | `02-05-PLAN.md` Task 3, steps 1–2 |
| Which menu items are missing and in what order, also at 390px and when whoami fails (**backstop**: a rejected fetch leaves the links at their member count and neither throws nor draws half an item) | ROLE-05 | Visual and failure-path; no DOM available to test in | `02-05-PLAN.md` Task 3, steps 3 and 6 |
| The first paint of a card stays closed (**backstop**: no timer or retry turns a card into a link without a successful whoami reply) | ROLE-03 | The paint order has to be watched in a real browser | `02-05-PLAN.md` Task 3, step 2 |
| Switching sheds causes no layout jump in the denied panel; being denied `/log` is not a redirect | ROLE-03, ROLE-05 | Layouts compared across navigations | `02-05-PLAN.md` Task 3, steps 4–5 |
| Keyboard order through the grid, every box's accessible name, and the focus ring in both themes | ROLE-01 | Accessibility behaviour; no DOM to test with | `02-06-PLAN.md` Task 2, step 4 |
| The last-steward refusal as it looks on screen, produced by racing the CLI against the browser | ROLE-06 | Needs a terminal and a browser together; only a race ever reaches the refusal | `02-06-PLAN.md` Task 2, step 8 |

**Background:** two human checks left over from earlier phases have still not been observed
(they are listed in `.planning/STATE.md`). Each manual row above blocks inside its own plan
and is no after-the-fact suggestion. Never tick one off because a build went green.

---

## Validation Sign-Off

- [x] Every task has an `<automated>` verify or a Wave 0 dependency, apart from the three
      blocking checkpoints (one `checkpoint:decision`, two `checkpoint:human-verify`) that are
      manual by their nature
- [x] Sampling continuity: never three tasks in a row without an automated verify
- [x] Wave 0 covers every `MISSING` reference — each one is written by the task that needs it
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — `/gsd-validate-phase` flips this to `validated` once the work is done.
