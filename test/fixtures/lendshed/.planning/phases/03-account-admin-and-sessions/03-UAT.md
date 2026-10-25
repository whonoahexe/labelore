---
status: complete
phase: 03-account-admin-and-sessions
source: [03-VERIFICATION.md]
started: 2026-03-16T20:52:00Z
updated: 2026-03-19T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Member detail page: Pause/Resume toggle and the greyed-out self-pause (03-01)
expected: Open /desk/members/{id} for someone else. A status pill reads Active or Paused; the Pause button opens a dialog that names the member and lists three consequences; confirming flips the pill and the button text. On your own page the Pause button is disabled and says why. Check light and dark. A disabled self-pause must be visible up front, never an error after pressing.
result: pass

### 2. Sign-in messages for a paused account versus a bad password (03-02)
expected: At /sign-in, enter a paused member's correct password, then a wrong one for that same handle. The correct password shows a plain "account paused" message; the wrong one shows the shared generic credential message. The password box empties, the handle stays, focus comes back. Light and dark.
result: pass

### 3. /ledger rows: Accounts filter, readable Detail text, mixed ordering, long values (03-04)
expected: Do one add, one pause, one role edit and one permission edit. All four appear in the same table as loan rows, the Accounts filter keeps only those four, every Detail cell reads as a full sentence, loan rows show a dash there, and an overlong value is cut off inside its cell without stretching the table. Light and dark.
result: pass

### 4. New-member and password-reset dialogs: inline errors and the list updating itself (03-06)
expected: From /desk press New member. A too-short password and an already-used handle each produce a caption inside the dialog, not a banner on the page. A valid add closes the dialog and the person shows up in the list with no reload. On /desk/members/{id} press Reset password: the text says the member stays signed in, and success closes the dialog without fuss.
result: pass
reverified: 2026-03-19 — repeated after the G-ADM-2 fix (7c1e9ab); fresh open and first submit both behaved
prior_result: issue
prior_reported: "pass - small thing: the short-password warning is already on screen before I click anywhere"
prior_severity: minor

### 5. Sessions list and Danger Zone: row content, you-badge rule, exact-handle delete lock (03-07)
expected: With a member signed in on two devices, Sessions shows two rows (device, address, relative time). On your own page only one row wears the you-badge even though you hold two sessions. After pausing the member and reloading the list reads "Not signed in anywhere." The Danger zone heading is destructively coloured, and Delete only unlocks when the handle is typed exactly, capitals included. Narrowest viewport still fits. Light and dark.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-ADM-2
  truth: "The password-length warning in the new-member dialog appears once the user has touched the field, never on a fresh form"
  status: resolved
  resolved_by: "7c1e9ab fix(03-06): show the password rule after submit, not on an untouched dialog"
  resolved_at: 2026-03-19
  reverified_at: 2026-03-19
  reverify: "Test 4 — open New member again and check that nothing red is showing on first paint (confirmed pass)"
  reason: "User reported: pass - small thing: the short-password warning is already on screen before I click anywhere"
  severity: minor
  test: 4
  root_cause: "add-member-dialog.tsx computes `ruleFailure` during render (line 58) rather than in the submit handler. A fresh dialog has an empty password, so the length check answers too-short at once and the red caption plus aria-invalid=true appear before anyone interacts. A code comment (lines 54-57) claims the check 'runs on submit only' and points at /reset-password, yet that page runs its check inside handleSubmit and stores it in state. The dialog's button is also disabled by `ruleFailure !== undefined`, whereas the model page disables on an empty field; the two differences are linked."
  artifacts:
    - path: "web/components/add-member-dialog.tsx"
      issue: "ruleFailure derived at line 58 in render; read eagerly at lines 163/166 and 183/185; line 59 disables the button on it"
    - path: "web/pages/reset-password.tsx"
      issue: "the model to copy: check in handleSubmit (line 66), button disabled by emptiness (lines 55-56)"
  missing:
    - "Keep the rule failure in state and compute it in handleSubmit only"
    - "Disable the button on empty fields instead of on ruleFailure"
    - "Reset the stored failure whenever either password field is edited"
    - "Feed both captions and both aria-invalid flags from the stored value"
  debug_session: "worked out inline while verifying -- single-file cause, no debug agent"
