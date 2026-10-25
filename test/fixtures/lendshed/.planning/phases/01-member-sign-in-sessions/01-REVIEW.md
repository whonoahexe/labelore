---
phase: 01-member-sign-in-sessions
reviewed: 2026-03-26T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - server/migrations/0003_members_and_sessions.sql
  - server/package.json
  - server/src/api/desk.ts
  - server/src/api/loans.ts
  - server/src/api/respond.ts
  - server/src/api/stock.ts
  - server/src/app.ts
  - server/src/auth/kiosk-bypass.ts
  - server/src/auth/reader.ts
  - server/src/auth/session.ts
  - server/src/bin/shedkeys.ts
  - server/src/config.ts
  - server/src/guard/rate.ts
  - server/src/server.ts
  - server/test/kiosk-bypass.test.ts
  - server/test/session-durability.test.ts
  - server/test/sign-in-flow.test.ts
  - server/test/socket-ticket-flow.test.ts
  - web/src/nav-shell.tsx
  - web/src/pages/sign-in.tsx
  - web/src/stock/pass-dialog.tsx
  - web/src/sign-in-copy.ts
findings:
  critical: 1
  warning: 1
  info: 3
  total: 5
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-03-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the member sign-in slice: the session store and cookie signing, the reader that turns a cookie
into a member, the sign-in and sign-out routes, the shedkeys bootstrap tool and the sign-in page.

One critical gap and one warning stand out. Everything else is polish.

## Critical Issues

### CR-01: Cookie signing falls back to a built-in secret when `SESSION_SECRET` is unset

**File:** `server/src/auth/session.ts:58-72` (secret lookup), used by `server/src/config.ts:31-36`

**Issue:** `signingSecret()` returns `process.env.SESSION_SECRET ?? DEV_SECRET`, and `DEV_SECRET` is a
constant committed to the repository. A deployment that forgets the variable boots without complaint and
signs every session cookie with a value anyone can read.

```ts
export function signingSecret(): string {
  return process.env.SESSION_SECRET ?? DEV_SECRET;
}
```

`loadConfig` never checks that the value exists, so the server has no point at which it refuses to start.

**Fix:** Read the secret once at boot and throw when it is missing outside the test environment:

```ts
export function requireSigningSecret(env: NodeJS.ProcessEnv): string {
  const value = env.SESSION_SECRET?.trim();
  if (!value) throw new Error('SESSION_SECRET is required');
  return value;
}
```

## Warnings

### WR-01: Signing out leaves the session row valid until the nightly sweep

**File:** `server/src/auth/session.ts:140-158`; `web/src/nav-shell.tsx:96-110`

**Issue:** `signOutHandler` clears the cookie in the response but never deletes the row, so a copy of the
cookie taken before sign-out still resolves to a member until the sweep removes the row.

**Fix:** Delete the row by token inside the handler, before the response is built, and return the same
body whether or not a row existed.

## Info

### IN-01: Sign-in form does not return focus to the handle field after a failed attempt

**File:** `web/src/pages/sign-in.tsx:44-61`

**Issue:** After a refused attempt the passcode field is cleared but focus stays on the button.

**Fix:** Call `handleRef.current?.focus()` in the failure branch.

### IN-02: Sweep interval appears as a literal in two files

**File:** `server/src/auth/session.ts:12`, `server/src/server.ts:48`

**Issue:** `15 * 60 * 1000` is written out twice; changing one leaves the other behind.

**Fix:** Export `SWEEP_EVERY_MS` from `session.ts` and import it in `server.ts`.

### IN-03: Test helper `makeMember` shadows the exported fixture of the same name

**File:** `server/test/sign-in-flow.test.ts:19-27`

**Issue:** The local helper hides `makeMember` from `test/support.ts`, so a later edit to the shared helper
silently stops applying here.

**Fix:** Rename the local helper to `makeSteward`.

---

_Reviewed: 2026-03-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
