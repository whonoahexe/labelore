# Phase 2: Roles & Permissions - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

A steward decides what each individual member may do in each shed, and the
server turns away whatever was not granted, through a single gatekeeper that
answers no unless told otherwise. Covers ROLE-01 through ROLE-06.

**In scope:** the `guard.check` gatekeeper and where it is called, a two-value
`members.role` column, a `member_grants` table, the per-member grant grid at
`/desk`, steward-only access to the loan log, the last-steward rule, `shedkeys`
role and grant subcommands, a grants field on `/api/whoami`, and a
`GrantsChanged` event on the live-status socket.

**Not in scope — do not drift into these:**
- Creating, resetting, disabling or deleting accounts, listing live sessions → Phase 3
- `SessionRevocationFeed` and session teardown on disable → Phase 3 (ADMN-03)
- Loan-log rows for account lifecycle events → Phase 3 (ADMN-06)
- Bulk loan export → Phase 4

</domain>

<blocking_amendments>
## ⚠️ Requirement amendments this discussion forces

**Plans must not be written against the present wording of these.** Partway
through the talk the design shifted: from named permission sets that stewards
create, to two fixed roles with grants made person by person. Four documents
still describe the old design.

| Document | Current wording | Required change |
|---|---|---|
| `.planning/REQUIREMENTS.md` — **ROLE-01** | "A steward can create a named permission set and edit what it holds" | Out of step with what is built, because there are no sets. Restate as: a steward can edit which permissions a member holds, per shed. |
| `.planning/REQUIREMENTS.md` — **ROLE-02** | "A steward can assign a set to a member, and it applies without a new sign-in" | Reword around grants. The "no new sign-in" half stands and is met by D-08. |
| `.planning/REQUIREMENTS.md` — **ROLE-05** | "Only a member whose set grants steward access can reach member management" | Holds in substance (see D-10); "whose set grants" becomes "whose role is `steward`". |
| `.planning/PROJECT.md` § Current Milestone | "stewards manage members, **custom sets**, and grants in-app" | Custom sets leave the milestone. |
| `.planning/PROJECT.md` § Validated | "✓ Every loan recorded in a log **a member can read** — v1.0" | **Knowingly withdrawn** by D-10; note the withdrawal and its reason instead of erasing the line. |
| `.planning/ROADMAP.md` § Phase 2 | Criterion 1 describes creating a set and an editable matrix | Redraft criterion 1 around per-member grants. |

Fix these with a direct edit **before** planning Phase 2.

</blocking_amendments>

<decisions>
## Implementation Decisions

### Permission model

- **D-01:** **There is no `sets` table and no `set_grants` table.** `members.role` is
  a **closed enum with two values, `steward` | `member`**, guarded by a SQL `CHECK`
  in the same style as `ShedId` and `JobStatus`. Grants attach to individual
  members rather than to roles.
  — **Reversibility:** one-way — reviving sets would need a migration that makes up
  groupings from whichever grants exist at that point.

- **D-02:** **Permissions are `lend` and `adjust` for each shed** — eight bits across
  four sheds — plus `steward`. `lend` covers browsing and borrowing; `adjust`
  covers stock edits and transfers. **Accepted consequence:** a member cannot be
  allowed to browse a shed but not borrow from it. That is not a gap to fix.

- **D-03:** Grants live as rows in `member_grants`, keyed `(member_id, grant)`, where
  `grant` is a closed string enum such as `lend:canal`. **No row means no**, so
  ROLE-06's case of a member with no role is covered by construction instead of
  by a guard clause.

- **D-04:** **`steward` skips the lookup entirely inside `guard.check`.** A steward
  owns **no rows** in `member_grants` and never sees a grant grid, so a steward
  with every box unticked cannot exist.

  ```ts
  function check(identity, action, shed): Result {
    if (identity.role === 'steward') return ok();
    return lookup(identity.memberId, action, shed);
  }
  ```

### Enforcement placement

- **D-05:** The check sits in a **new `server/src/guard/index.ts`**, next to the session
  seam, and each handler calls it **first** — straight after `SessionReader`
  extraction and shed parsing, **ahead of** `shedPath.resolve`. `shedPath` keeps
  knowing nothing about identity. Blanket middleware will not work, because the
  shed is only known once a handler has parsed the path parameter.

- **D-06:** **A refused action answers 403.** The 409 status stays reserved for the
  must-change-password state that Phase 1 picked so the two policy classes can
  never be confused.

- **D-07:** **Transfers have a direction.** A transfer needs `lend` on the shed it
  leaves and `adjust` on the shed it reaches; handing a tool back to its source
  also needs `adjust` there.

  ```
  Borrow  canal → ridge    lend:canal
  Move    canal → ridge    lend:canal + adjust:ridge + adjust:canal
  ```

  A refusal on either side returns the identical 403 and never hints which shed
  caused it.

### What members see

- **D-08:** A grant change **travels over the live-status socket** as a fourth event
  variant. The client reloads `/api/whoami` when it arrives and the toolbar
  updates untouched, so ROLE-02 holds for the page as well as for the API.

- **D-09:** **Write controls stay where they are, greyed out, with no tooltip or
  explanation.** A denied *page* explains itself while a denied *action* stays
  silent; the asymmetry is intentional, so nobody should smooth it over.

- **D-10:** **The loan log is moved behind `steward`.** It disappears from the member
  menu and answers 403 to a direct visit.
  **This knowingly withdraws a shipped capability** from v1.0.
  — **Reversibility:** reversible — removing the check brings the old behaviour back.

### Lockout guardrails

- **D-11:** **Two separate rules.**
  1. **A steward can never demote themself**, whatever the number of stewards.
  2. **A count rule** blocks any demotion that would leave no enabled steward,
     evaluated **in the transaction that does the write**.

  ```sql
  SELECT COUNT(*) FROM members WHERE role = 'steward' AND disabled_at IS NULL
  ```

- **D-12:** **A promotion wipes the member's grant rows; a demotion leaves them at
  zero** until a steward grants something. Closed in both directions.

### Claude's Discretion

Nothing was handed over wholesale. These are left to planning judgment: the exact `member_grants` columns beyond the key; whether `grant` is one string or an `(action, shed)` pair; the live event's payload shape; the wording of the denied-page panel.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level context
- `.planning/PROJECT.md` — § Constraints, § Validated (the loan-log line that D-10
  withdraws)
- `.planning/REQUIREMENTS.md` — ROLE-01…ROLE-06 verbatim; start with
  `<blocking_amendments>`

### Research that bears on this phase
- `.planning/research/ARCHITECTURE.md` § 2 — where the permission check belongs
- `.planning/research/PITFALLS.md` — the entries on scattered checks and on
  checks that pass for a missing role

### Phase 1 output — read before touching the sign-in seam
- `.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md` — D-05 and D-06 for
  `shedkeys`, D-12 for the forced-change gate
- `.planning/phases/01-member-sign-in-sessions/01-LEARNINGS.md` — the 409
  reservation and the seam-not-per-handler pattern

### Code this phase modifies or depends on
- `server/src/auth/reader.ts` — `SessionReader`; its identity gains role and grants
- `server/src/api/catalogue.ts` — `browseHandler` and its shed parsing
- `server/src/api/loans.ts` — `startTransferHandler` and its siblings
- `server/migrations/0004_roles.sql` — the table that gains a column

### v1.0 precedent worth reading before deciding shape
- `.planning/milestones/v1.0-ROADMAP.md` — the tech-debt list this phase must not
  lengthen

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`SessionReader`** — already the one identity seam; `guard.check` stands beside
  it rather than replacing it.
- **`feed/bus.ts`** — the in-process fan-out that the new grants event copies.

### Established Patterns

- **Closed enums over free strings**, backed by a SQL `CHECK`.
- **Fail closed, never open.** The guard has to behave that way too.

### Integration Points

- **`server/src/guard/index.ts`** — the new gatekeeper.
- **`web/src/desk/`** — the new routes for the grant grid.

### Constraints this design imposes

- The shed value exists only inside the handler, so the guard is a call rather than a layer.
- The session lookup is queried on every request and never cached — leave it that way.

</code_context>

<specifics>
## Specific Ideas

- **The design shifted partway through, on the steward lead's own suggestion.** She
  started down the sets road, then said it flatly: two roles, grants per person.
  Her reason was that a set is more machinery than a library of five stewards needs.
- **`shedkeys` keeps its name** in the binary, the invocation and the docs.

</specifics>

<deferred>
## Deferred Ideas

- **Reusable permission sets** — the design itself, set aside by D-01; it returns as
  a real migration if per-member grants stop being manageable.
- **A "copy grants from…" button** on the member page — the natural cure for
  onboarding drift; cheap to add later.
- **Redacted loan paths in the tray** — passed over; still the cheapest partial fix
  if the flat tray leaks too much.
- **Loan-log rows for grant and role changes** — ADMN-06 owns this in Phase 3.
- **A steward bit split in two** — offered and declined in favour of one bit.

</deferred>

---

*Phase: 2-Roles & Permissions*
*Context gathered: 2026-03-29*
