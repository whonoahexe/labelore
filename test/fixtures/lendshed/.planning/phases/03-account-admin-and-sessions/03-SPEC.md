<!-- made-up example · derived from gsd-core/templates/spec.md · gsd-core 1.19.0 -->
# Phase 3: Account Admin & Sessions — Specification

**Created:** 2026-03-31
**Ambiguity score:** 0.18
**Requirements:** 9 locked

## Goal

A steward looks after the whole life of a member account from one place, sees who is signed in right now, and can end anyone's access at once.

## Background

Phase 1 gave members accounts and Phase 2 gave stewards grants, but accounts can only be created with the `shedkeys` command line tool on the server. A steward who needs a password reset or a disabled account must ask the developer to run a command. The sessions table holds every live sign-in, with a `last_seen` stamp, yet nothing displays it. The loan log records borrowing and nothing about accounts.

## Requirements

1. **Create a member**: A steward creates an account from a dialog on the desk page.
   - Current: Accounts exist only through `shedkeys create` on the server
   - Target: A "New member" dialog on `/desk` takes a handle and a display name, generates a temporary password shown once, and flags the account `must_change_password`
   - Acceptance: A created member signs in with the shown password and is sent to the password-change route first

2. **Reset a password**: A steward resets a member's password and the old sessions end.
   - Current: Only `shedkeys reset` can do this, and it leaves old sessions alive
   - Target: A "Reset password" action on the member page issues a new temporary password shown once, flags the account, and deletes every session of that member
   - Acceptance: After a reset, the member's old cookie answers 401 and the new temporary password signs in

3. **Disable a member**: A steward switches an account off without deleting it, and its sessions and export tickets stop at once.
   - Current: No disabled state exists; the only way to stop a member is to delete the row, which destroys the loan history that points at it, and a member who has been signed in for weeks keeps working until the idle expiry, because nothing looks at the account row again after sign-in, and a download ticket minted a minute earlier is still honoured by the export route
   - Target: A `disabled_at` stamp; disabling deletes the member's sessions, revokes their unused export tickets and makes sign-in answer the same 401 as a wrong password
   - Acceptance: With a live session and an unused ticket, disabling the member makes the next `/api/whoami` answer 401 and the ticket's download answer 410

4. **Re-enable a member**: A steward switches a disabled account back on.
   - Current: No disabled state exists
   - Target: Clearing `disabled_at` lets the member sign in again with their old password; no old session returns
   - Acceptance: After re-enabling, the member signs in with the old password and gets a new session id

5. **Delete a member**: A steward removes an account for good.
   - Current: Deleting means a database edit by hand
   - Target: A confirmed "Delete member" action removes the account and its sessions; loan-log rows keep the handle as plain text
   - Acceptance: After a delete, the handle is free to reuse and old loan-log rows still show the old handle

6. **Live session list**: A steward sees every signed-in session of a member, with where it was last seen and how long ago, and the list stays correct while the page is open, because a steward who is about to disable an account needs to know whether anyone is on it right now, and a stale list is worse than none, since it says an account is quiet when somebody is using it.
   - Current: The sessions table holds the data and nothing shows it
   - Target: A "Signed in now" list on the member page, one row per session, newest first, refreshed whenever a session starts or ends

7. **End one session**: A steward ends a single session from that list.
   - Current: Only the member can sign out, and only the session they are using
   - Target: An "End session" button per row deletes that session and closes its open socket
   - Acceptance: Ending a row makes that cookie answer 401 within one second and leaves the member's other sessions alone

8. **Account events in the loan log**: Account and permission changes appear in the log a steward already reads.
   - Current: The loan log records loans only
   - Target: Creation, reset, disable, re-enable, delete and grant changes each add a log row naming the acting steward and the member
   - Acceptance: Each of the six actions adds exactly one row, and the log filter "Account events" shows only those rows

9. **Last-steward rule**: The desk always keeps one enabled steward.
   - Current: Phase 2 stops a steward demoting themself, but disable and delete are unguarded
   - Target: Disable and delete are refused with 409 when they would leave no enabled steward, checked inside the same transaction as the write
   - Acceptance: With one enabled steward, disabling or deleting that steward answers 409 and changes nothing

## Boundaries

**In scope:**
- Member create, reset, disable, re-enable and delete from the desk
- The live session list and per-session end
- Log rows and a log filter for account events
- The last-steward rule for disable and delete

**Out of scope:**
- Bulk loan export — that is Phase 4
- Renaming a handle or display name after creation — decided out, a handle is permanent
- A sign-everyone-out button — decided out for the milestone
- Mailing passwords or reset links — decided out for the milestone

## Constraints

- Temporary passwords are shown once on screen and never stored in readable form or written to the log
- Ending a session must close that session's open live-status socket, not only refuse its next request

## Acceptance Criteria

- [ ] A created member is forced through the password-change route on first sign-in
- [ ] A reset password ends every session of that member
- [ ] A disabled member's session answers 401 and their unused ticket answers 410
- [ ] A re-enabled member signs in again and gets a new session
- [ ] A deleted handle can be reused while old log rows still show it
- [ ] Ending a listed session closes it within one second
- [ ] Six account actions each add one log row
- [ ] The last enabled steward cannot be disabled or deleted

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.88  | 0.75 | ✓      |                                    |
| Boundary Clarity   | 0.84  | 0.70 | ✓      | Decided-out items named            |
| Constraint Clarity | 0.74  | 0.65 | ✓      |                                    |
| Acceptance Criteria| 0.78  | 0.70 | ✓      | Requirement 6 has no check         |
| **Ambiguity**      | 0.18  | ≤0.20| ✓      |                                    |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective    | Question summary                    | Decision locked                           |
|-------|----------------|-------------------------------------|-------------------------------------------|
| 1     | Researcher     | What does a steward do by hand now? | Ask the developer to run `shedkeys`       |
| 2     | Simplifier     | Is disable enough, without delete?  | No — delete stays, loan history keeps the handle |
| 3     | Boundary Keeper| What waits for the export phase?   | Everything about exports                  |
| 4     | Failure Analyst| What if the only steward disables themself? | Refuse in the same transaction    |

---

*Phase: 03-account-admin-and-sessions*
*Spec created: 2026-03-31*
*Next step: /gsd-discuss-phase 3 — implementation decisions (dialog layout, socket teardown, log filter)*
