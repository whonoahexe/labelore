---
status: passed
phase: 02-roles-and-permissions
source: [02-VERIFICATION.md]
started: 2026-03-09T15:28:12Z
updated: 2026-03-09T15:46:15Z
---

## Current Test

none — all items resolved 2026-03-09T15:46:15Z

## Resolution

number: 1 (resolved)
name: 02-05 Task 4 steps 1-4 — the read-only surfaces, as `ana`
expected: |
  Signed in as `ana` holding `view:north` ONLY:
  1. On `/`, all four shed cards show stock and status, but only North is
     clickable. The other three are indistinguishable from North in every way but
     ignoring clicks — no dimming, no padlock, no badge, no cursor change. Light and dark.
  2. Reload `/` and watch the first frames: a card must never begin as a link and
     then turn inert. Starting inert and upgrading to a link is acceptable; the opposite is a bug.
  3. The menu shows exactly Tools and Loans. No gap, no greyed Ledger, no Desk item.
     Check 390px wide as well.
  4. Type `/tools/east` directly: the denied panel sits inside the normal tool
     chrome, the shed picker stays usable, and switching `/tools/north` <-> `/tools/east`
     makes no layout jump.
awaiting: none — Maya approved 2026-03-09

## Tests

### 1. 02-05 Task 4 steps 1-4 — read-only surfaces, as `ana`
expected: The four renders above, seen in a browser as a `view:north`-only member.
result: passed (steward-approved; partly corroborated)
note: |
  RESOLVED 2026-03-09 by Maya's approval. Support: an `ana` session was live at 15:44:27,
  roughly two minutes ahead of the approval, which fits the sign-in the steps call for.
  CAVEAT: `ana` had NO permissions either side of this window. Steps 1-2 separate a LINKED North
  card from three inert ones, and that needs `view:north`. Someone could have granted it, run the
  test and revoked it again with nothing recorded, since permission edits never reach `ledger`
  (the hole this phase left to ADMN-06). What `ana` held during the test cannot be recovered from
  any record. Steps 3-4 pass with no permissions at all and are not touched by this.
  ACTIONABLE: re-run in about five minutes; grant `view:north` (and nothing else) first.

### 2. ROLE-06 last-steward refusal — the web ALERT RENDER
expected: The button re-enables and the alert `Can't demote — no other steward would remain.` shows above the Role section.
result: closed — structurally unprovable through the live API by design (Maya's call, 2026-03-09)
note: |
  CANNOT BE REACHED over the HTTP API by demoting one person after another. members.ts sets
  is_demotion ahead of the guards; the caller must be an active steward, rule 1 makes the target a
  different person, and is_demotion makes that person a steward too — so enabled_steward_count is
  at least 2 whenever rule 2 runs. Only a genuine race can trip it.
  ENFORCEMENT is proven: 11 demotion-guard tests pass, including
  members::demoting_the_only_steward_is_refused_and_the_row_is_unchanged and
  api::set_role_refuses_the_last_steward_with_the_marker.
  The one unseen piece is the RENDER. To close it, mount the component in a web test against a
  faked 409 `last_steward_refused` answer; a browser session will not do.

### 3. 02-07 Task 4 step 2 — dash fallback for a missing display name
expected: A member row lacking a display name renders a dash: no empty cell, no echo of the handle.
result: closed on unit-level proof — Maya's call, 2026-03-09: "unit tests are enough"
note: |
  NOT CHECKABLE against current data — both accounts have display names and the `stewardctl add`
  command requires `--name`. Unit proof exists (member-summary.ts's nameCell has dash cases,
  covered by the 64/64 web suite). Recommend accepting it.

## Summary

total: 3
passed: 1
accepted: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

resolution: |
  Item 1 approved by Maya with partial session support (see its note for the limit). Items 2 and 3
  taken on automated proof instead of observation. A browser session cannot close either one, and
  each leaves a follow-up listed below.

## Gaps

Still open and carried forward, accepted without being proven:

- **No path leads to the ROLE-06 last-steward alert, and that is deliberate.** Maya's reading,
  confirmed: rule 1 (no self-demotion — "You can't remove your own steward access — ask another
  steward.") is exactly what makes rule 2 unreachable. The last steward can only be demoted by
  someone else, who must also be an enabled steward, so the count is at least 2 whenever rule 2 counts.
  Closed as impossible to show live rather than left open. LOOKING AHEAD to Phase 3: the
  count is `role='steward' AND paused_at IS NULL`. Nothing sets `paused_at` today, so this is inert.
  Once Phase 3 adds pausing, demoting a PAUSED steward while one active steward remains gives
  count=1 and trips the refusal for an operation that would not lower the active count. Re-check
  this guard when pausing lands.
- **The dash fallback for a blank name is closed on unit proof** (Maya's call), via `member-summary.ts`'s
  `nameCell` cases, covered by the 64/64 web suite.
- **Item 1, steps 1-2 stand on a permission state nobody can recover** (see its note). Should the
  read-only denial screens ever be questioned, run them again after granting and confirming `view:north`.
- Outside this phase yet worth remembering: edits to roles and permissions leave nothing in `ledger`.
  Judged not a Phase 2 gap (ADMN-06 owns it, scheduled for Phase 3), but until then no record
  shows who altered whose access.
