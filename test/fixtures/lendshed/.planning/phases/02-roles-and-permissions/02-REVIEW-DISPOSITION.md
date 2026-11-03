# Phase 2: Review Disposition

Worked through by hand after the fix pass. Anything not marked Fixed was a decision, and the Note says whose.

| ID | Severity | Finding | Disposition | Note |
|----|----------|---------|-------------|------|
| CR-01 | Critical | Grant rows have no foreign key to members, so deleting a member leaves live grants behind | Fixed | Migration 0007 adds the key with cascade |
| CR-02 | Critical | No unique constraint on member, shed and capability, so duplicate grants stack | Open | needs human check |
| WR-01 | Warning | `mayDo` lowercases the stored capability but not the requested one | Deferred | Waits for the capability list to move into code (phase 3) |
| WR-02 | Warning | Revoke is a soft delete, so revoked rows pile up | Skipped | Revoked rows are the audit trail; the stewards asked to keep them |
| WR-03 | Warning | `granted_by` is nullable | Accepted | Seed grants have no granting member |
| IN-01 | Info | `mayDo` swallows the unknown-capability error and logs it at debug level | Wont-fix | - |
