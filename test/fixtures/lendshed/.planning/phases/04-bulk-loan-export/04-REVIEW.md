---
phase: 04-bulk-loan-export
reviewed: 2026-04-14T08:54:31Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - server/src/export/serve.ts
  - server/src/export/build.ts
  - server/src/export/cap.ts
  - server/src/export/stage.ts
  - server/src/jobs/executors/export.ts
  - server/src/jobs/worker.ts
  - server/src/api/export.ts
  - server/src/app.ts
  - server/migrations/0005_export_jobs.sql
  - server/test/export-cap.test.ts
  - server/test/export-serve.test.ts
  - server/test/export-stage.test.ts
  - web/src/export/ExportPage.tsx
  - web/src/export/use-export-job.ts
  - web/src/export/ExportRow.tsx
  - web/src/lib/download.ts
blockers_resolved: "CR-01 (server a3d90e5), CR-02 (web 5f21c7b) — fixed 2026-04-15"
findings:
  critical: 0
  critical_original: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-14T08:54:31Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase stages a month of loans as one file and serves it back through a signed link. The core of the build is sound: the 5,000-loan cap is checked before the first row is read, the file is written to a temporary name and renamed only when complete, and a link that has expired is refused before any file access.

A second look at the failure paths found two issues that should stop the phase from shipping. `serveExport` never checks that the member asking for the file is the member who requested it, so anyone holding a link can fetch a steward's export. And link signing reads its secret in a way that hides a missing variable until the first link is signed.

## Critical Issues

### CR-01: serveExport does not bind the link to the requesting member, so any holder can download

**File:** `server/src/export/serve.ts:63-97`
**Issue:** `serveExport` checks the signature and the expiry but performs **no check on the member**. The link carries the requesting member's id, yet the handler never compares it with the signed-in member, so a link pasted into a chat works for whoever opens it.

The deeper problem: the export holds every loan in the month with member handles, and the link is the only control. Because links are valid for fifteen minutes and are not single use, a leaked link is a leaked roster.

**Fix:** Compare the member in the link with the member in the session right after the signature check:
```ts
if (claims.memberId !== session.memberId) {
  return { ok: false, reason: 'member_mismatch' };
}
```
Separately, record the fifteen-minute window as an accepted risk or make links single use with a stored nonce.

### CR-02: Link signing reads `process.env.EXPORT_SECRET!`, hiding a missing secret until the first export

**File:** `server/src/export/cap.ts:29,64`
**Issue:** Both `signKey()` (line 29) and `linkNonce()` (line 64) read the secret through a non-null assertion. The `!` only silences the type checker, so with the variable unset the code signs with the string `"undefined"`.

1. The server boots fine and every link is signed with a guessable key, so any link anyone forges is accepted.
2. The verifying side reads the same variable, so nothing disagrees and nothing fails.

Every other module reads its secrets through `requireEnv`, and this one has to follow suit.

**Fix:** Read the secret once, at startup, through a helper that throws:
```ts
function secretFrom(env: NodeJS.ProcessEnv, name: string): Uint8Array {
  const raw = (env[name] ?? '').trim();
  if (raw === '') throw new Error(`${name} must be set before the server starts`);
  return new TextEncoder().encode(raw);
}
const key = secretFrom(process.env, 'EXPORT_SECRET');
```

## Warnings

### WR-01: serveExport never validates the link claims against ExportClaimsSchema

**File:** `server/src/export/serve.ts:74-95`
**Issue:** The schema exists in `export/cap.ts` for exactly this, but `serveExport` reads fields off the raw payload with casts, so a link carrying a string where a number belongs reaches the file lookup.

**Fix:** Run the payload through the schema and read fields from its result, refusing the request with `claims_invalid` when parsing fails.

### WR-02: The expiry gate compares the request's clock, not the link's claim

**File:** `server/src/export/serve.ts:81`
**Issue:** The expiry check reads `req.query.until`, the client-supplied copy, rather than the signed `exp` claim, so a client can extend a link by editing the query string.

**Fix:** Compare the signed claim: `const until = Number(payload['exp'] ?? 0);` and refuse when `now() >= until`.

### WR-03: The worker callback secret is compared in variable time

**File:** `server/src/api/export.ts:59`
**Issue:** The worker callback is checked with `req.headers['x-stage-secret'] === process.env.STAGE_SECRET`, a comparison that stops at the first differing character and so reveals how many matched.

**Fix:** Use `timingSafeEqual` on equal-length buffers and refuse unequal lengths first.

### WR-04: The three route handlers discard their errors without a log line

**File:** `server/src/app.ts:34-54`
**Issue:** Each route ends in a `.catch` that sets status 500 and writes a fixed body, and none of them reads the error. A failing export leaves no trace in the logs.

**Fix:** Log the error message and the route name before answering.

### WR-05: Worker and HTTP paths build the staged file's metadata independently

**File:** `server/src/jobs/executors/export.ts:40-56` and `server/src/api/export.ts:104-122`
**Issue:** Each path works out the file name, the row count and the expiry on its own. The worker rounds the expiry to the minute and the HTTP path does not, so the same export can report two different expiry times.

**Fix:** Extract one `buildStagedMeta({ month, memberId, rows })` helper used by both.

### WR-06: Staging is not atomic when the rename fails after the manifest write

**File:** `server/src/export/stage.ts:32-47`
**Issue:** The manifest row is written first and the rename second. If the rename fails (a full disk), the manifest points at a file that does not exist and the member is told the export is ready.

**Fix:** Rename first, then write the manifest inside a transaction, and on failure remove the temporary file.

## Info

### IN-01: Dead Math.round on the row count

**File:** `server/src/export/serve.ts:80-82`
**Issue:** The comment says rounding handles fractional counts, but the schema constrains `rows` to an integer, so the rounding does nothing.
**Fix:** Drop the rounding or the comment.

### IN-02: Defence-in-depth check runs twice per download

**File:** `server/src/jobs/worker.ts:75` (and `server/src/export/serve.ts:90`)
**Issue:** The signature is verified in the route and again in the worker, doing the same work twice per request.
**Fix:** Pass the first decision to the worker or document the extra cost.

### IN-03: Expired-link test passes on any thrown error

**File:** `server/test/export-serve.test.ts:298-301`
**Issue:** In the expired-link case the final branch counts every thrown message as success, whatever it says.
**Fix:** Make that branch fail unless the message names `link_expired`.

### IN-04: Unused promise scaffolding in the same test

**File:** `server/test/export-serve.test.ts:346-351`
**Issue:** `settled` is created, resolved straight away and never awaited, and `closeCode` is declared beside it and never read.
**Fix:** Remove lines 346-351.

---

_Reviewed: 2026-04-14T08:54:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
