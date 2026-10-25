# Phase 3: Account Admin & Sessions - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A steward looks after the whole life of a member account — set it up, reset the
password, switch it off and on, remove it — and can see who is signed in right
now and end their access immediately. Covers ADMN-01 through ADMN-06.

**In scope:** member creation (a dialog on `/desk`), steward-performed password
reset, disable and re-enable with real session teardown, hard delete, a live
session list on the member page, `SessionRevoked` as the feed's second event,
export-ticket revocation on disable, loan-log rows for account and permission
events, a filter on the log, and the last-steward rule extended to disable and
delete.

**Not in scope — do not drift into these:**
- Bulk loan export → Phase 4
- Changing a handle or display name after creation → decided out, D-02
- A standalone sign-everyone-out button → REQUIREMENTS.md § Out of Scope
- Mailing passwords or reset links → REQUIREMENTS.md § Out of Scope
- Self-service sign-up → REQUIREMENTS.md § Out of Scope

</domain>

<resolved_open_question>
## ⚠️ The STATE.md open question is already answered — no need to research it again

STATE.md § Blockers/Concerns says: *"Before Phase 3 planning, settle whether the
loan log stores the borrower as a plain string or a `members.id` foreign key."*

**Answered by reading the schema: plain `TEXT`, no FK.**

- `server/migrations/0001_init.sql:14` — `actor TEXT NOT NULL`, with no
  `REFERENCES members(id)`.
- `server/src/loans/log.ts` — `LogEntry.actor` is a string taken from the session,
  never from client input.

**Consequence:** ADMN-04's "delete a member, the history stays readable" needs
**no work** on the log side, since the log never held a reference to `members`.

</resolved_open_question>

<blocking_amendments>
## ⚠️ A recorded Phase 2 invariant is wrong once disable exists — fix it, don't inherit it

`02-UAT.md` § Gaps flagged this as a forward-looking risk, and it is real.

`server/src/guard/store.ts:118-127` reads the count **ahead of** the write:

```sql
SELECT COUNT(*) FROM members WHERE role = 'steward' AND disabled_at IS NULL
```

…and says no when that count is `<= 1` and the new role is anything but steward.
Nothing can set `disabled_at` yet, so the check does nothing today. **Once this
phase makes it settable, demoting a *disabled* steward while exactly one enabled
steward remains counts 1 and is refused** — a wrongful refusal that removes
nobody from the enabled population.

**D-09 below swaps the guard out; it is not an addition.**

</blocking_amendments>

<decisions>
## Implementation Decisions

### Account creation & password handoff

- **D-01:** **The steward types the first password.** The server generates nothing in
  this phase: the create dialog asks for handle, display name and password, and
  reset asks for a password. Validation is Phase 1's rule — at least 12
  characters, no composition rules — taken from the one shared module.
  **Accepted cost:** nothing stops a rushed steward typing a weak password.

- **D-02:** **Handle and display name are fixed once the account exists.** A typo is
  put right by deleting and recreating, which is cheap at this scale, and it
  means each log handle names one account for its whole life.

- **D-03:** **A steward's reset leaves the member's sessions alone.** It stores the new
  hash and raises `must_change_password`, and does only that. The gate from
  Phase 1 already refuses the member's live session on every other route from
  the next request.
  — **Reversibility:** reversible — a session cascade is one `DELETE` away.

### Disable & session revocation (ADMN-03)

- **D-04:** **A disabled member's open loans stay open.** A tool out in the world
  belongs to the library, not to the account. Disable governs access, not loans.

- **D-05:** **Disabling removes all of that member's session rows** inside the
  transaction that sets `disabled_at`, with no exception for a current session.
  Re-enabling means the member signs in again from scratch.

### Delete (ADMN-04)

- **D-06:** **The `members` row is hard-deleted**, and sessions and grants go in the
  same transaction. A soft tombstone would need a `deleted_at` filter in every
  query, which is exactly the forgotten-filter failure.
  **Accepted consequence:** the handle becomes free for reuse.
  — **Reversibility:** one-way per deletion — the row cannot be recovered.

- **D-07:** **Delete sits at the foot of the member page and asks for the handle to be
  typed**, a heavier ceremony than disable because it cannot be undone.

### Lockout guardrails

- **D-08:** **A steward may not demote, disable or delete their own account**, however
  many other stewards exist. `shedkeys` stays the break-glass path.

- **D-09:** **One post-write test replaces the old count**, evaluated in the writing
  transaction for every demote, disable and delete:

  > **Once the write lands, an enabled steward must still exist.**

  It lives in **exactly one place**, so `shedkeys` and every HTTP surface behave
  identically. The plan has to carry the case 02-UAT never reached: demoting a
  *disabled* steward when one enabled steward is left must **succeed**.
  — **Reversibility:** costly — going back would bring the wrongful refusal back.

### Live sessions (ADMN-05)

- **D-10:** **Live sessions get a section on the member page**, under Role and Access,
  rather than a page of their own. The acting steward's own session is marked by
  matching the request's token, **not** `member_id` alone.

### Audit coverage (ADMN-06)

- **D-11:** **Account and grant events go into the log's current columns**; the schema
  does not change. `actor` is the acting steward, `action` a new closed variant,
  and `target` a compound string such as `teo:lend:ridge`. The encode/decode pair
  lives in **one place**.
  — **Reversibility:** costly — a later `detail` column would need a migration and
  a rewrite of every old compound value.

- **D-12:** **The loan log gains an All / Loans / Accounts filter.** It stays one
  chronological table, but easier to search.

### Claude's Discretion

Nothing was handed over wholesale. Left to planning:

- **The `SessionRevoked` contract.** It joins the feed as a second variant, not a
  second bus; the close code and reason on the socket are open.
- **Export-ticket revocation on disable.** A purge-by-member sweep is the obvious
  shape, but the planner decides.
- **How `shedkeys` grows to match**, and whether it routes through D-09's test
  (it must).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level context
- `.planning/PROJECT.md` — § Constraints, § Key Decisions
- `.planning/REQUIREMENTS.md` — ADMN-01…ADMN-06 verbatim, and § Out of Scope
- `.planning/ROADMAP.md` § Phase 3 — goal, criteria and the Notes block

### Research that bears on this phase
- `.planning/research/ARCHITECTURE.md` § 3 — how session revocation spreads: why
  REST is covered by construction and a live socket is not
- `.planning/research/PITFALLS.md` — sessions that outlive the event that should
  end them

### Phase 1 output — read before touching sessions
- `.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md` — D-01 to D-04 on
  session life, D-08 on the raw-text actor, D-12 on the forced-change gate

### Phase 2 output — the shell this phase fills in
- `.planning/phases/02-roles-and-permissions/02-CONTEXT.md` — D-04, D-11 and D-12
- `.planning/phases/02-roles-and-permissions/02-UAT.md` § Gaps — the wrongful
  refusal that `<blocking_amendments>` acts on

### Code this phase modifies or depends on
- `server/src/guard/store.ts` — the count-before-write that D-09 replaces
- `server/src/api/desk.ts` — the member surface that gains create, reset, disable,
  enable, delete and sessions
- `server/src/auth/session.ts` — `issueSession`, which starts writing the client
  address and agent
- `web/src/desk/member-page.tsx` — the page gaining sessions, disable and delete

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`feed/identity-feed.ts`** — already in app state and wired into the socket
  loop; only the new variant and the close behaviour are new.
- **Phase 1's password-change cascade** — the `DELETE FROM sessions` pattern that
  D-05 needs, already proven inside a transaction.
- **`DestructiveConfirmDialog`** — carries the destructive ceremony; D-07 extends
  it once.

### Established Patterns

- **Closed enums over free strings**, backed by a SQL `CHECK`.
- **A single invariant lives in a single place that can be searched for.** The
  enabled-steward count query stays in exactly one file.

### Integration Points

- **`server/src/api/desk.ts`** — five or six new handlers on an existing prefix.
- **`/desk/log`** — one filter control and one query parameter.

### Constraints this design imposes

- **Never add a session cache.** The per-request lookup is what makes revocation instant.
- **Every new desk route needs a capability decision** or the matrix test fails.

</code_context>

<specifics>
## Specific Ideas

- **The steward lead leaned toward the lighter option every time, except where a lockout was possible.** This phase repeats Phase 2's recorded through-line: instead of generated passwords she wanted typed ones (D-01), then no renaming (D-02), open loans left alone (D-04) and no `detail` column (D-11). On the two questions about steward availability she took the tighter option, both times.
- **D-03 was reached by refinement, not reversal.** Maya first wanted a reset to end the member's sessions; once the cost of cutting someone off mid-task was named, she took the version that keeps the reset gentle and lets the forced-change gate do the containing.
- **`shedkeys` remains the CLI name, verbatim.** The alternatives were turned down outright in Phase 1.
- **UI work must use the Lendshed design tokens**, strictly. Standing project rule, held across the milestone without a slip.
- **The `/desk` shell belongs to Phase 2 and must keep its structure.** Everything new attaches to the list page or to the member page.

</specifics>

<deferred>
## Deferred Ideas

- **Generated first passwords** — D-01's first option, turned down. Worth revisiting if a weak steward-typed password ever causes a break-in.
- **Display-name editing** — D-02's middle option. Cheap to add, and the first thing to build if members keep asking to fix typos.
- **Recalling a disabled member's open loans** — the research notes recommend it; declined as D-04.
- **Warning the steward about open loans while disabling** — D-04's third option. The cheap middle ground if the silence in D-04 proves surprising.
- **Reserving removed handles against reuse** — D-06's third option. The fix if a departed member and a newcomer ever end up with the same handle.
- **A global sessions page** — D-10's second option. The same query could feed it later, and the per-member section would not need to change.
- **A dedicated `detail` column on the loan log** — D-11's second option, the tidier design. Worth another look if the compound `target` format keeps breaking the renderer; it would need a migration of old values.
- **A separate section for account events** — D-12's third option.
- **A standalone sign-everyone-out control** — already out of scope by REQUIREMENTS.md, restated here so nobody mistakes it for an oversight.
- **The `steward` bit split in two** (`edit_members` / `read_log`) — carried over from Phase 2's deferred list and still deferred. The log filter makes the `read_log` split slightly more attractive.

</deferred>

---

*Phase: 3-Account Admin & Sessions*
*Context gathered: 2026-04-03*
