---
phase: 02-roles-and-permissions
fixed_at: 2026-04-01T00:00:00Z
review_path: .planning/phases/02-roles-and-permissions/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 4
skipped: 3
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-01
**Source review:** `.planning/phases/02-roles-and-permissions/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04)
- Fixed: 4 (CR-03, CR-02, CR-01, WR-01)
- Skipped: 3 (WR-02, WR-03, WR-04) — intentionally left per project decisions

## Fixed Issues

### CR-03: `DEFAULT 1` on `allowed` turns an omitted column into an allow

**Files modified:** `server/migrations/0004_roles_and_grants.sql`
**Commit:** b81e4c2
**Applied fix:** Removed the default from `allowed` and added `CHECK (allowed IN (0, 1))` on line 13. An insert that leaves the column out is now rejected by the database instead of becoming an allow, so no half-built insert path can grant access by accident.

---

### CR-02: No unique constraint on member, shed and capability

**Files modified:** `server/migrations/0004_roles_and_grants.sql`
**Commit:** 3c9a7d0
**Applied fix:** Added `UNIQUE (member_id, shed_id, capability)` to the table. A second insert for the same triple now fails, and `revokeGrant` deletes the only row there is. The existing duplicate check in the import script was left as it was.

---

### CR-01: Grant rows have no foreign key to members

**Files modified:** `server/migrations/0004_roles_and_grants.sql`
**Commit:** e57f1b9
**Applied fix:** Changed `member_id` to `INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE` and turned on `PRAGMA foreign_keys` in `openDb`. Deleting a member now removes their grants in the same statement. Checked against a delete followed by a new member, which no longer inherits anything.

---

### WR-01: `mayDo` lowercases the stored capability but not the requested one

**Files modified:** `server/src/grants/check.ts`
**Commit:** 24d6f08
**Applied fix:** Both sides of the comparison now go through the same `foldCapability` helper. A request for `"Loans.Create"` matches a stored `loans.create`, and one new test pins it.

---

## Skipped Issues

### WR-02: Revoke is a soft delete, so revoked rows pile up

**File:** `server/migrations/0004_roles_and_grants.sql:12`
**Reason:** Intentionally skipped — accepted project risk. The audit rules in STATE.md say revoke history must be kept for a year, so deleting old rows would break them. A purge job belongs with the retention work, not this phase.
**Original issue:** Rows set `revoked_at` and are never removed, so the table grows with rows nobody reads.

---

### WR-03: `granted_by` is nullable

**File:** `server/migrations/0004_roles_and_grants.sql:3`
**Reason:** Pre-existing from phase 1. This phase only added the `grants` table around it; the column was written by the member import. Making it required means backfilling every old row, which is a separate change.
**Original issue:** A grant can be written with no record of which steward made it.

---

### WR-04: No index on `shed_id`

**File:** `server/migrations/0004_roles_and_grants.sql:20`
**Reason:** Out of scope for phase 2. Adding the index is easy, but the stock query that needs it is rewritten in phase 3, and the right index depends on how that query ends up filtering.
**Original issue:** The stock query scans the whole grants table to filter by shed.

---

_Fixed: 2026-04-01_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
