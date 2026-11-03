---
phase: "03"
fixed_at: 2026-04-09T10:03:19Z
review_path: .planning/phases/03-account-admin-and-sessions/03-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
fix_scope: all
---

# Phase 3: Code Review Fix Report (frontend)

**Fixed at:** 2026-04-09T10:03:19Z
**Source review:** .planning/phases/03-account-admin-and-sessions/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (fix_scope = all, web side): 3 (WR-02, IN-03, IN-09)
- Fixed: 2
- Skipped: 1 (IN-03)

## Fixed Issues

### WR-02: Disable, enable and delete on the member detail page say nothing when the request fails for any reason but the last-steward refusal

**Files modified:** `web/src/pages/members/detail.tsx`, `web/src/components/action-notice.tsx`
**Commit:** `2c8b4f0`
**Applied fix:** Each of the three actions now shows one shared failure notice beside its button, using the
same wording, whenever the request fails for a reason other than the last-steward refusal.

### IN-09: Member list keeps the previous page's scroll position after a filter change

**File:** `web/src/pages/members/list.tsx:61`
**Commit:** `90be1d7`
**Applied fix:** The list resets its scroll offset when the filter value changes.

## Skipped Issues

### IN-03: `maxLength={64}` is a duplicated literal rather than the shared constant

**File:** `web/src/components/create-member-dialog.tsx:159,179`
**Reason:** Skipped — the passcode rules module is being reworked in the next phase, and the import would
move with it.
**Original issue:** Both dialogs write the literal `64` on their inputs instead of importing the shared
constant.

---

_Fixed: 2026-04-09T10:03:19Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
