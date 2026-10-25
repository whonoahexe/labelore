---
phase: 01-member-sign-in-sessions
fixed_at: 2026-03-26T17:40:12Z
review_path: .planning/phases/01-member-sign-in-sessions/01-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 3
status: partial
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-03-26T17:40:12Z
**Source review:** .planning/phases/01-member-sign-in-sessions/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (fix_scope = critical_warning): 2 (CR-01, WR-01)
- Fixed: 2
- Skipped: 3 (IN-01, IN-02, IN-03 — out of scope for this run)

Both fixes were checked with the server unit tests and a manual sign-in and sign-out round trip.

## Fixed Issues

### CR-01: Cookie signing falls back to a built-in secret when `SESSION_SECRET` is unset

**Files modified:** `server/src/auth/session.ts`, `server/src/config.ts`
**Commit:** `c41e9d7`
**Applied fix:** `requireSigningSecret` now runs inside `loadConfig`, so the server refuses to start without
the variable. The committed development constant is gone; tests pass their own secret through the config.

### WR-01: Signing out leaves the session row valid until the nightly sweep

**Files modified:** `server/src/auth/session.ts`, `web/src/nav-shell.tsx`
**Commit:** `5ab20f3`
**Applied fix:** `signOutHandler` deletes the session row by token before it builds the response, and the
nav shell waits for that response before it clears local state.

## Skipped Issues

### IN-01: Sign-in form does not return focus to the handle field after a failed attempt

**File:** `web/src/pages/sign-in.tsx:44-61`
**Reason:** Out of scope — `fix_scope` for this run is `critical_warning`, which includes only CR-* and WR-*
findings. IN-01 is an Info-severity finding and was not attempted.
**Original issue:** After a refused attempt the passcode field is cleared but focus stays on the button.

### IN-02: Sweep interval appears as a literal in two files

**File:** `server/src/auth/session.ts:12`, `server/src/server.ts:48`
**Reason:** Out of scope — `fix_scope` for this run is `critical_warning`, which includes only CR-* and WR-*
findings. IN-02 is an Info-severity finding and was not attempted.
**Original issue:** The same interval literal is written out in two files.

### IN-03: Test helper `makeMember` shadows the exported fixture of the same name

**File:** `server/test/sign-in-flow.test.ts:19-27`
**Reason:** Out of scope — `fix_scope` for this run is `critical_warning`, which includes only CR-* and WR-*
findings. IN-03 is an Info-severity finding and was not attempted.
**Original issue:** The local helper hides the shared helper of the same name.

---

_Fixed: 2026-03-26T17:40:12Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
