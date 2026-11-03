---
phase: "03"
fixed_at: 2026-04-09T09:12:44Z
review_path: .planning/phases/03-account-admin-and-sessions/03-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
fix_scope: critical_warning
---

# Phase 3: Code Review Fix Report (backend)

**Fixed at:** 2026-04-09T09:12:44Z
**Source review:** .planning/phases/03-account-admin-and-sessions/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (fix_scope = critical_warning, server side): 2 (WR-01, WR-03)
- Fixed: 2
- Skipped: 0

The web-side warning (WR-02) is handled in the frontend fix report. Both server fixes were checked with the
server unit tests and the desk route coverage test.

## Fixed Issues

### WR-01: A lagging feed receiver can drop a `session-revoked` close and leave a disabled member's socket open

**Files modified:** `server/src/socket/index.ts`, `server/src/feed/bus.ts`
**Commit:** `7d3e9a1`
**Applied fix:** A `lagged` read on the feed arm now re-checks the member's session row before the loop
carries on, and closes the socket with the revoked code when the row is gone.

### WR-03: Every account audit write is fire-and-forget, so a failed insert leaves no trace

**Files modified:** `server/src/api/desk.ts`, `server/src/jobs/audit.ts`
**Commits:** a1b2c3d, e4f5a6b
**Applied fix:** The seven desk actions now write their audit row inside the same transaction as the change,
so both succeed or neither does. The shared `writeAudit` helper takes the open transaction as an argument.

---

_Fixed: 2026-04-09T09:12:44Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
