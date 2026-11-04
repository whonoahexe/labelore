<!-- made-up example · derived from gsd-core/templates/spec.md · gsd-core 1.19.0 -->
# Phase 2: Roles & Permissions — Specification

**Created:** 2026-03-27
**Ambiguity score:** 0.31 (gate: <= 0.20)
**Requirements:** 4 locked

## Goal

A steward decides what each member may do in each shed, and the server answers 403 to anything not granted.

## Background

After Phase 1 every signed-in member can do everything: borrow from any shed, edit stock, move tools between sheds and read the loan log. The `members` table has a `role` column that holds only `member` today. There is no grant storage, no gatekeeper function and no screen where a steward could change anything.

## Requirements

1. **Per-shed grants**: A steward can grant a member the right to lend from, or adjust stock in, each shed separately.
   - Current: No grant storage exists; every member may act in every shed
   - Target: A `member_grants` table keyed by member and grant name, one row per granted right, no row meaning no
   - Acceptance: A member with only `lend:canal` can borrow from the canal shed and is refused at the ridge shed

2. **Single gatekeeper**: Every handler asks one function before doing anything for a shed.
   - Current: Handlers check nothing beyond the session
   - Target: A `guard.check(identity, action, shed)` call at the top of each shed handler; a refusal answers 403
   - Acceptance: A route table test lists every shed handler and fails when one does not call the gatekeeper first

3. **Steward role**: A steward passes every check without owning grant rows.
   - Current: The `role` column never holds `steward`
   - Target: Role `steward` skips the lookup; a member promoted to steward has their grant rows removed
   - Acceptance: A steward with an empty `member_grants` table can lend and adjust in all four sheds

4. **Grants take effect while signed in**: A changed grant applies without the member signing out and in again.
   - Current: Nothing changes while a session lives
   - Target: The next request after a grant change sees the new grants
   - Acceptance: Remove `lend:canal` from a signed-in member; their very next borrow at the canal shed answers 403

## Boundaries

**In scope:**
- The `member_grants` table and the gatekeeper function
- A steward-only grant grid on the member page
- Promotion to and demotion from steward

**Out of scope:**
- Creating, disabling or deleting accounts — that is Phase 3
- A live notice to an open page when its grants change — left to discussion, may land later
- Per-tool permissions — not asked for by any steward

## Constraints

Not settled. Stewards disagree on whether a member may be allowed to browse a shed without being allowed to borrow from it, and nobody has said how many stewards the desk must always keep. Working guess, to be read as one: at least one enabled steward at all times.

## Acceptance Criteria

- [ ] A member with only `lend:canal` can borrow at the canal shed and gets 403 at the ridge shed
- [ ] A route table test fails when a shed handler skips the gatekeeper
- [ ] A steward with no grant rows can lend and adjust in every shed
- [ ] A grant removed from a signed-in member takes effect on their next request

## Edge Coverage

**Coverage:** 2/3 applicable edges resolved · 1 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| member with no role | R1 | ✅ covered | Acceptance Criteria 1: no row means no |
| last steward demotes themself | R3 | ⚠ UNRESOLVED | ⚠ Edge unresolved — planner must treat as assumption |
| grant for a shed that is later closed | R1 | ⛔ dismissed | Sheds are never closed in this product; closure is not a supported event |
| steward promoted while holding grants | R3 | 🧪 backstop | Backstop test: promotion leaves zero rows for that member |

## Prohibitions (must-NOT)

**Coverage:** 1/2 applicable prohibitions resolved · 1 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT reveal which shed caused a refusal on a transfer | R2 | resolved | verification: test (both refusals return an identical body) |
| MUST NOT let any route skip the gatekeeper | R2 | ⚠ UNRESOLVED | ⚠ Prohibition unresolved — planner must treat as assumption |

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.80  | 0.75 | ✓      |                                    |
| Boundary Clarity   | 0.72  | 0.70 | ✓      | Phase 3 items named out            |
| Constraint Clarity | 0.46  | 0.65 | ⚠      | Below minimum — planner must treat as assumption |
| Acceptance Criteria| 0.71  | 0.70 | ✓      | Four criteria, none for demotion   |
| **Ambiguity**      | 0.31  | ≤0.20| ⚠      | Written anyway after six rounds    |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

Written anyway: six interview rounds ended with one dimension still below its minimum, and the steward lead chose "Write SPEC.md anyway — flag gaps". The planner must treat the flagged rows as assumptions, not locked requirements.

## Interview Log

| Round | Perspective    | Question summary                   | Decision locked                              |
|-------|----------------|------------------------------------|----------------------------------------------|
| 1     | Researcher     | Who may do what today?             | Everyone may do everything                   |
| 2     | Simplifier     | Smallest set of rights?            | Lend and adjust, per shed, plus steward      |
| 3     | Boundary Keeper| What stays out of this phase?      | Account admin and per-tool rights            |
| 4     | Failure Analyst| What if the last steward steps down? | Open — no answer reached                   |
| 5     | Researcher     | Browse without borrow?             | Open — stewards disagree                     |
| 6     | Simplifier     | How many stewards must remain?     | Open — working guess of one                  |

---

*Phase: 02-roles-and-permissions*
*Spec created: 2026-03-27*
*Next step: /gsd-discuss-phase 2 — implementation decisions (grant names, the guard seam, the grid)*
