---
phase: 01-member-data-foundation
reviewed: 2026-01-26T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - package.json
  - server/migrations/0001_members.sql
  - server/src/api/card.ts
  - server/src/api/roster.ts
  - server/src/config.ts
  - server/src/db/open.ts
  - server/src/members/cache.ts
  - server/src/members/import.ts
  - server/src/members/store.ts
  - server/src/members/validate.ts
  - server/src/app.ts
  - server/src/server.ts
  - server/test/card-lookup.test.ts
  - server/test/db-durability.test.ts
  - server/test/roster-import.test.ts
  - server/test/store-contract.test.ts
  - web/src/pages/roster.tsx
  - web/src/members/member-row.tsx
  - web/src/members/use-roster.ts
  - web/src/main.tsx
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: partially_resolved
resolved:
  - id: CR-01
    commit: 7e3b0d4
    note: "validateHandle now compares the case-folded form, the same one the unique index stores, and the import runs inside one transaction so a rejected row leaves nothing behind. Checked against a roster that mixes Ana and ana."
  - id: WR-01
    commit: c92a5e1
    note: "MemberRow carries a scope (shed or household) and every read takes the scope it expects; a mismatch returns nothing, like a missing row. Closes the cross-read before household cards arrive."
open:
  - WR-02  # review scope omitted import.ts, a process gap; the file was reviewed anyway
  - WR-03  # sample roster with real-looking names inlined in the import test
  - WR-04  # roster page hard-codes the API origin
  - WR-05  # no cap on rows per import
  - IN-01
  - IN-02
  - IN-03
---

# Phase 01: Code Review Report

**Reviewed:** 2026-01-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20 (19 declared in scope + `server/src/members/import.ts`, see note below)
**Status:** issues_found

## Summary

Reviewed the member data foundation: the SQLite member table and migration, the store and its read cache,
the roster import and its validation, the card lookup and roster routes, and the roster page. The store
contract is sound: every query binds its parameters, the migration is idempotent, and the durability test
kills the process mid-write and reopens the file to prove nothing half-written survives.

This is not a clean bill of health. The handle check that guards the import is weaker than the index behind
it, and the store has no way to tell a shed card from a household card. Four smaller quality and process
issues follow, including that `import.ts` was missing from the declared scope although this phase changed it.

## Critical Issues

### CR-01: Handle uniqueness is checked case-sensitively but stored case-folded

> **RESOLVED 2026-01-27** — commit `7e3b0d4`. Fixed as suggested below: `validateHandle` folds case before it compares, and `importRoster` wraps the whole batch in one transaction. Covered by 4 new `validate` tests and a mixed-case roster run against the real database file.

**File:** `server/src/members/validate.ts:74-92`

**Issue:** `validateHandle` rejects a handle only when a stored handle equals it exactly, while the unique
index on the `members` table folds case. Importing `Ana` after `ana` passes validation and then fails inside
SQLite halfway through the batch, leaving the rows before it written and the rows after it missing.

```ts
const taken = existing.some((handle) => handle === candidate);
if (taken) return { ok: false, reason: 'handle_taken' };
```

**Fix:** Compare the folded form and run the batch in one transaction:

```ts
const folded = candidate.toLowerCase();
if (existing.some((handle) => handle.toLowerCase() === folded)) {
  return { ok: false, reason: 'handle_taken' };
}
```

## Warnings

### WR-01: Member store has no scope field, so shed cards and household cards can be read through each other

> **RESOLVED 2026-01-27** — commit `c92a5e1`. Fixed as suggested below: `MemberRow` gained a `scope` column set at every insert, and `readMember` takes the expected scope and treats a mismatch like a missing row. Covered by 3 new `store-contract` cases.

**File:** `server/src/members/store.ts:39-89`, `server/src/members/import.ts:18-32`, `server/src/api/roster.ts:41-47`, `server/src/api/card.ts:44-46`

**Issue:** `importRoster` and `lookupCard` read and write the same table, and `MemberRow` records only the
handle and the created time. Nothing says which kind of card a row was written for. A household id sent to the
shed card route resolves to a member today and nobody notices because both kinds carry the same rights.

That stops being harmless once household cards gain their own limits, and it is cheaper to add the column now
than to retrofit every caller later.

**Fix:** Add a `scope` field to `MemberRow`, set it at the two insert sites, and have `readMember` take the
scope it expects:

```ts
export function readMember(id: string, expected: Scope): MemberRow | null {
  const row = db.get(id);
  return row !== undefined && row.scope === expected ? row : null;
}
```

### WR-02: `server/src/members/import.ts` was changed this phase but left out of the declared review scope

**File:** `server/src/members/import.ts` (whole file); scope declared in the review request

**Issue:** `import.ts` is the only entry point that writes rows in bulk, and both plan summaries point at it.
Git history shows it was edited in this phase (`3f1d8aa`, plan 01 task 2), yet it is missing from the
19-file scope this review was handed. It was read and reviewed anyway and nothing beyond WR-01 and WR-05
turned up, but the omission is a process gap in how the scope list was built.

**Fix:** Rebuild the changed-file list from the correct base commit and confirm `import.ts` is in it.

### WR-03: Sample roster with real-looking names inlined in the import test

**File:** `server/test/roster-import.test.ts:34-62,67-95`

**Issue:** Two long inline rosters hold names and phone numbers that look real. They were invented for the
test, but a later reader cannot tell, and a scanner for personal data will keep flagging them.

**Fix:** Move the rosters to a `server/test/fixtures/` file with a header saying every row is made up, or build
them from a small generator inside the test.

### WR-04: Roster page hard-codes the API origin

**File:** `web/src/pages/roster.tsx:9`

**Issue:** `const API_ORIGIN = "http://localhost:4300";` is fixed at build time. Pointing the page at another
server means editing source.

**Fix:**
```ts
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:4300";
```

### WR-05: No cap on rows per import

**File:** `server/src/members/import.ts:18-32`, `server/src/members/store.ts:91-119`

**Issue:** `importRoster` reads the whole upload into memory and inserts every row it finds. A file with a
million rows holds the write lock for as long as it takes to insert them, and no other request can write.

**Fix:** Refuse an upload above a fixed row count before the first insert, and say so in the response.

## Info

### IN-01: `MemberCache.clear()` is never called

**File:** `server/src/members/cache.ts:37,145-151`

**Issue:** The cache exposes `clear()` for a future restart path. Nothing in `server.ts` or any test calls it,
so it advertises a lifecycle the server does not have.

**Fix:** Call it from a shutdown hook in `server.ts`, or delete it until one exists.

### IN-02: Roster route answers a non-numeric page query like a missing one

**File:** `server/src/api/roster.ts:27-39`

**Issue:** `?page=abc` falls through to page one without saying so. The client cannot tell it asked for
something that was ignored.

**Fix:** Return a 400 with the parameter name when `page` is present and not a positive integer.

### IN-03: Database path is built by string concatenation

**File:** `server/src/db/open.ts:36`

**Issue:** `` `file:${config.dbPath}?mode=rwc` `` breaks if the path holds `?` or `#`. The path is set by the
operator, so the risk is low, but the fix is one line.

**Fix:**
```ts
const db = new Database(config.dbPath, { fileMustExist: false });
```

---

_Reviewed: 2026-01-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
