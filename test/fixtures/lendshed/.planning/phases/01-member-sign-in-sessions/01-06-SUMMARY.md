---
phase: 01-member-sign-in-sessions
plan: 06
subsystem: auth
tags: [react, router, top-bar, session, kiosk-retirement, docs]

requires:
  - phase: 01-03
    provides: the `lendctl` account tool that creates the first steward account the cutover depends on
  - phase: 01-04
    provides: the two sign-in counters and the same-answer rule whose real behaviour this plan checks
  - phase: 01-05
    provides: `route-guard.ts`'s signed-in check and the bare frame the set-password screen reuses
provides:
  - A forced set-password screen a member with a temporary password can finish without being stuck
  - Display name and one-click sign-out in the signed-in top bar, still working with the server down
  - Removal of the shared passcode prompt, so the app is its own front door
  - A docs page that records how a steward is recovered when every account is locked
affects: [phase-02-roles-permissions, phase-03-account-admin, desk-runbook]

actuals:
  tokens: 22400
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Check-on-submit only: both rules run when Save is pressed, never while typing"
    - "Counter as an oracle: fill a known counter locally, then see whether a real request lands in it"

key-files:
  created:
    - src/web/pages/set-password.tsx
    - src/web/lib/password-check.ts
    - src/web/lib/password-check.test.ts
  modified:
    - src/web/route-guard.ts
    - src/web/shell/top-bar.tsx
    - src/web/shell/shell-frame.tsx
    - docs/kiosk-retirement.md

key-decisions:
  - "Removed the whole passcode prompt rather than only its check, since a prompt with no check still blocks every page."
  - "Saved the old prompt's route table to a dated file before deleting it, turning a hard-to-undo step into a one-command restore."
  - "Left the loopback fallback in place and wrote it down, rather than change security behaviour outside this plan."

patterns-established:
  - "A cutover step that names its own precondition is load-bearing: the first command is what showed the phase was not deployed"
  - "Verify a deploy by artifact, not by a green check: confirm the build id, the migration state and the process start time"

requirements-completed: [SIGN-01, SIGN-02, SIGN-03]

duration: 38min
completed: 2026-03-28
status: complete
---

# Phase 01 Plan 06: Set-password screen, top bar identity, passcode prompt removal — Summary

**The shared passcode prompt no longer guards Lendshed, and getting there showed that the whole phase had never reached the desk machine.**

## Performance

- **Duration:** ~38 min across two sessions (tasks 1 and 2 on 2026-03-28 morning; task 3 that afternoon)
- **Tasks:** 3 of 3
- **Files modified:** 7
- **Commits:** 6

## Accomplishments

- **A member with a temporary password can set their own and is not trapped.** The screen checks on submit only, so a half-typed confirm field never flashes a mismatch.
- **A signed-in member sees who they are and can leave in one click**, even with the server down, because the bar reads a name stored in the browser.
- **The passcode prompt is gone.** Opening the desk page now goes to `/sign-in`, and nothing asks for the shared code.
- **The recovery steps are written down**, closing the highest-risk gap in the runbook.

## Task Commits

1. **Task 1: set-password screen (TDD)** — `e17b4a0` (test) → `29c8d5f` (feat)
2. **Task 2: name and sign-out in the top bar** — `8d3f61b` (feat)
3. **Task 3: router change** — `4b7a9e2` (checkpoint state) → `f2c5d08` (fix: deploy ships lendctl) → `a06e913` (docs: recovery steps)

## Files Created/Modified

## Deviations from Plan

### 1. The phase had never been deployed — caught by Task 3's own precondition

**Found during:** Task 3, step 1 (`lendctl list`).

`lendctl: command not found` was not a path problem. The program on the desk machine was from before the phase began and held none of its tables.

Removing the prompt at that moment would have left Lendshed with no gate and no way to sign in.

**Fix:** pushed the build, ran the migration and checked the deploy by artifact, not by its green mark.

### 2. `lendctl` had no install path at all (unplanned ops fix)

Even after the push, `lendctl` would not have appeared: the deploy script built and installed only the server.

**Fix:** `f2c5d08` — install the tool by exact name so a missing binary fails the run, and smoke-test it.

### 3. Step 8 checked without a second network

The plan assumed two networks with different addresses. Instead the counter itself was used as an oracle: fill the bucket for a known address locally, then see whether a real request lands in it.

**Total deviations:** 3 (1 blocked precondition, 1 unplanned ops fix, 1 method substitution)

## Issues Encountered

The first deploy ran against a stale lockfile and installed an older build; the artifact check caught it and a second run replaced it.

## Verification

- `npm test` passes, 3 new tests in `password-check.test.ts`
- a signed-in request through the real front door returns the member, a request with no cookie returns 401

## Self-Check: PASSED
