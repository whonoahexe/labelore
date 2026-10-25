---
phase: 02-roles-and-permissions
reviewed: 2026-03-31T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - server/migrations/0004_roles_and_grants.sql
  - docs/roles.md
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: partial
fixed:
  - CR-01
  - CR-02
  - CR-03
  - WR-01
skipped:
  - WR-02  # accepted risk: the audit rules ask for revoke history (see STATE.md)
  - WR-03  # pre-existing column from phase 1, out of scope for phase 2
  - WR-04  # needs a coordinated change to the stock query, out of scope for phase 2
---

# Phase 02: Code Review Report

**Reviewed:** 2026-03-31
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Two files were reviewed: `server/migrations/0004_roles_and_grants.sql` (the main deliverable of this phase) and `docs/roles.md` (the updated roles reference). The migration has three critical defects that let a grant outlive its member, stack duplicates, or turn an omitted column into an allow, and the checker that reads it has a case-folding slip.

---

## Critical Issues

### CR-01: Grant rows have no foreign key to members, so deleting a member leaves live grants behind

**File:** `server/migrations/0004_roles_and_grants.sql:1`

**Issue:** The `grants` table stores `member_id` as a plain integer. Deleting a member removes the member row and nothing else, so the grants stay. SQLite hands the freed id to the next member created, and that member inherits every grant the old one held.

The root cause is the missing constraint: the table should refuse a grant for a member that does not exist, and remove grants with the member.

**Fix:**
```sql
-- Option A: constrain the table
member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

-- Option B: never reuse ids
CREATE TABLE members (id INTEGER PRIMARY KEY AUTOINCREMENT, handle TEXT NOT NULL);
```

---

### CR-02: No unique constraint on member, shed and capability, so duplicate grants stack

**File:** `server/migrations/0004_roles_and_grants.sql:17`

**Issue:** Line 17 creates the table without a `UNIQUE (member_id, shed_id, capability)` clause. Two inserts for the same triple both succeed, and `revokeGrant` deletes only the first row it finds, so a revoke appears to work while a second row keeps the grant alive.

The steward's screen reads the first row only, so it shows the capability as removed.

**Fix:** Add the constraint to the table:
```sql
UNIQUE (member_id, shed_id, capability)
```

---

### CR-03: `DEFAULT 1` on `allowed` turns a row that omits the column into an allow

**File:** `server/migrations/0004_roles_and_grants.sql:13`

**Issue:** `allowed INTEGER NOT NULL DEFAULT 1` means a grant written by code that forgets the column is an allow. The checker treats any row as a decision, so a half-built insert path grants access instead of failing.

**Fix:** Remove the default so an insert without the column is rejected:
```sql
allowed INTEGER NOT NULL CHECK (allowed IN (0, 1)),
```

---

## Warnings

### WR-01: `mayDo` lowercases the stored capability but not the requested one

**File:** `server/src/grants/check.ts:76`

**Issue:** The comparison is `stored.toLowerCase() === requested`. A route that asks for `"Loans.Create"` never matches a stored `loans.create`, and the checker answers deny. That fails safe, but a steward sees a grant that appears to do nothing.

**Fix:**
```ts
return stored.toLowerCase() === requested.toLowerCase();
```

---

### WR-02: Revoke is a soft delete, so revoked rows pile up

**File:** `server/migrations/0004_roles_and_grants.sql:12`

**Issue:** `revoked_at` is set instead of the row being deleted, and nothing ever removes old rows. Over a year of changes the table grows with rows nobody reads.

**Fix:** Add a nightly job that deletes rows revoked more than a year ago, or move revoked rows to an archive table.

---

### WR-03: `granted_by` is nullable

**File:** `server/migrations/0004_roles_and_grants.sql:3`

**Issue:** A grant can be written with no recording of which steward made it, which undermines the audit trail the roles reference promises.

**Fix:**
```sql
granted_by INTEGER NOT NULL REFERENCES members(id),
```

---

### WR-04: No index on `shed_id`

**File:** `server/migrations/0004_roles_and_grants.sql:20`

**Issue:** The stock query filters grants by shed and scans the whole table to do it. Fine at today's size, slow at a few thousand members.

**Fix:**
```sql
CREATE INDEX grants_by_shed ON grants (shed_id);
```

---

## Info

### IN-01: `mayDo` swallows the unknown-capability error and logs it at debug level

**File:** `server/src/grants/check.ts:20-23`

**Issue:** The unknown-capability branch calls `logDebug` with a comment: "logError is not imported here — only the debug logger is". The level is a downgrade, not a decision.

**Fix:** Either drop `'unknown'` from the result type, or import and use `logError`:
```ts
import { logError } from '../log.ts';
logError('grants', 'unknown capability', { name });
```

---

### IN-02: `docs/roles.md` calls the grant levels both "three" and "four"

**File:** `docs/roles.md:71` and `docs/roles.md` summary table

**Issue:** Line 71 says "three grant levels" and lists none, view, loan and manage, which is four. The summary table further down says "four levels" in its caption and "three" in the footnote.

**Fix:** Standardise on "four levels" throughout and update the footnote and the memory notes that repeat it.

---

### IN-03: The migration repeats the capability list as a CHECK and again as a comment

**File:** `server/migrations/0004_roles_and_grants.sql:17-18`

**Issue:** Because the list is written twice and nothing links them, adding a capability to the CHECK without the comment leaves the comment wrong. The same list also lives in `check.ts`.

**Fix:**
```sql
-- capability: see CAPABILITIES in server/src/grants/check.ts
capability TEXT NOT NULL,
```

---

_Reviewed: 2026-03-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
