# Phase 3: Account Admin & Sessions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 3-Account Admin & Sessions
**Areas discussed:** Password handoff, Disable blast radius, Delete & lockout guards, Sessions view & log rows

Each of the four gray areas put forward was chosen for discussion.

---

## Password handoff

### Q1 — Who or what supplies a new member's opening password?

| Option | Description | Selected |
|---|---|---|
| The server makes it | A strong random password shown once | |
| The steward types it | A password field in the create form | ✓ |
| Generated, steward may override | Pre-filled and editable | |

**User's choice:** The steward types it
**Notes:** Cost accepted when decided: nothing stops a weak or reused password from being chosen.

### Q2 — What happens to a member's live sessions on a steward's password reset?

| Option | Description | Selected |
|---|---|---|
| Sign out everywhere | Remove all of the member's session rows in that same write | |
| Leave sessions untouched | Only the stored hash and the flag differ | |
| Sign out only when disabling too | A bare reset is harmless; disabling is what clears sessions | ✓ |

**User's choice:** Sign out only when disabling too
**Notes:** Checked in the code afterward: the change-password handler verifies the current password, so the "current password" the member types is the temporary one.

### Q3 — On the `/desk` shell, where is the "create member" control?

| Option | Description | Selected |
|---|---|---|
| Popup on /desk | A "New member" button over the list | ✓ |
| Separate page /desk/members/new | A proper page next to the detail one | |
| Row inside the list | A blank row pinned to the top | |

**User's choice:** Popup on /desk
**Notes:** Keeps Phase 2's rule: fill the shell in, do not rebuild it.

### Q4 — After a member exists, can either name be edited?

| Option | Description | Selected |
|---|---|---|
| Neither | Locked at creation; a typo needs a new account | ✓ |
| Display name only | Handle stays put so the log keeps its meaning | |
| Both | Cost: renaming cuts the log's history in two | |

**User's choice:** Neither

---

## Disable blast radius

### Q1 — When a member is disabled, what becomes of their session rows?

| Option | Description | Selected |
|---|---|---|
| Delete every row | A single delete aimed at the member | ✓ |
| Keep the rows, refuse because of disabled_at | The reader refuses anyway, though stale rows remain | |
| Delete them and refuse | Both, for extra safety | |

**User's choice:** Delete every row
**Notes:** Consistent with why the migration has no `revoked_at` column. A re-enabled member signs in again from scratch.

### Q2 — Someone is disabled while holding tools on loan. What about those loans?

| Option | Description | Selected |
|---|---|---|
| Leave them open | A loan is the library's business, not just the person's | ✓ |
| Close all their loans | The architecture note's recommendation | |
| Leave open, warn the steward | Loans carry on; the dialog names them | |

**User's choice:** Leave them open
**Notes:** Turns down the architecture note's plain advice, using the Phase 2 reasoning behind D-09 on how long a loan lives.

### Q3 — Should a disabled member be told on the sign-in page why entry fails?

| Option | Description | Selected |
|---|---|---|
| Nothing special — an ordinary rejection | Preserves Phase 1's identical-401 behaviour | |
| Explained on exit, not on entry | The socket's close reason says so; sign-in stays generic | |
| State it outright at sign-in | "This account has been disabled." | ✓ |

**User's choice:** State it outright at sign-in
**Notes:** The price came up straight afterwards: it would reverse something Phase 1 built and tested. A refinement question came next.

### Q3b — Under what condition may the page announce "this account is disabled"?

| Option | Description | Selected |
|---|---|---|
| Solely after the right password | A wrong password still gets the generic answer | ✓ |
| Always, for any failed try | The simplest branch; knowingly gives the property up | |

**User's choice:** Solely after the right password
**Notes:** Holds on to the clear message and the property alike. CONTEXT.md lists it as a position arrived at by refining, not as giving way.

### Q4 — How much ceremony should disabling involve?

| Option | Description | Selected |
|---|---|---|
| Confirm dialog | Reuses the destructive-action dialog | ✓ |
| Plain switch, as with role | Same as how role changes behave | |
| Confirm only when sessions are live | Ceremony just where it counts | |

**User's choice:** Confirm dialog
**Notes:** Knowingly departs from the UI contract's "reversible means no dialog" rule. It is the immediacy that justifies the dialog, not how lasting it is.

---

## Delete & lockout guards

### Q1 — On delete, is the members row actually removed?

| Option | Description | Selected |
|---|---|---|
| Hard DELETE of the row | Sessions and grants go with it | ✓ |
| Soft tombstone | A `deleted_at` column that every query has to filter on | |
| Hard DELETE, reserve the handle | A `held_handles` table blocks reuse | |

**User's choice:** Hard DELETE of the row
**Notes:** Known result, accepted at the time: the handle is free again, and a newer account picks up the older one's log entries.

### Q2 — Is self-demotion's ban stretched to cover disabling and deleting oneself?

| Option | Description | Selected |
|---|---|---|
| Refuse all three when aimed at oneself | A single rule across the account's life | ✓ |
| Refuse deleting oneself, allow disabling oneself | The irreversible one barred, the reversible one allowed | |
| Permit it while another steward is enabled | Gives up the unconditional version | |

**User's choice:** Refuse all three when aimed at oneself

### Q3 — In what form should the last-steward rule now be expressed?

| Option | Description | Selected |
|---|---|---|
| One test on the resulting state | "Once this write lands, at least one enabled steward remains" | ✓ |
| A guard for each operation | The smallest edit to code already proven | |
| Resulting state, with proof | The same test plus one covering the edge case | |

**User's choice:** One test on the resulting state
**Notes:** The over-refusal was reproduced against the guard store ahead of the question. CONTEXT.md adds the third option's test to D-09 either way.

### Q4 — Where on the page should the delete control sit?

| Option | Description | Selected |
|---|---|---|
| Detail page, typed confirmation | The member's handle has to be typed out | ✓ |
| Detail page, simple confirm | Uses the dialog unchanged | |
| Through shedkeys alone | Command line only; ADMN-04 stays half finished | |

**User's choice:** Detail page, typed confirmation

---

## Sessions view & log rows

### Q1 — Which screen holds the list of live sessions?

| Option | Description | Selected |
|---|---|---|
| A block on the member page | Below Role and Access on the same screen | ✓ |
| A site-wide /desk/sessions page | Fits the wording of ADMN-05 literally | |
| Both | Two screens and two empty states | |

**User's choice:** A block on the member page
**Notes:** "Own session distinguishable" turns into a "this is you" tag keyed on the session token rather than on `member_id`, because Phase 1 permits several sessions at once.

### Q2 — What information does each session row carry?

| Option | Description | Selected |
|---|---|---|
| Readable device plus the plain address | "Firefox on Linux · 198.51.100.7" | ✓ |
| Raw agent string plus raw address | Nothing interpreted; hard to read | |
| Device alone, no address | Less data kept on a shared machine | |

**User's choice:** Readable device plus the plain address
**Notes:** The address resolver already exists from Phase 1. Reuse it, do not rewrite it.

### Q3 — Where does "granted lend:orchard to maya" go in a log built around sheds and shelves?

| Option | Description | Selected |
|---|---|---|
| Reuse target, add no column | `target = 'maya:lend:orchard'` | ✓ |
| A new detail column | One optional `detail TEXT` | |
| Borrow the shed columns | `source_shed` would carry two meanings | |

**User's choice:** Reuse target, add no column
**Notes:** Price accepted: `target` now holds two formats and the renderer has to tell them apart. CONTEXT.md adds that the encoder and decoder sit together in one tested spot.

### Q4 — Should /log change, now that it shows two kinds of entry?

| Option | Description | Selected |
|---|---|---|
| A single list, unfiltered | Account events fall in by timestamp | |
| A single list with filters | An All / Loans / Accounts switch | ✓ |
| An account section of its own | Two views over one table | |

**User's choice:** A single list with filters

---

## Claude's Discretion

Nothing was passed over in full. Open for the researcher and planner, each bounded by CONTEXT.md: the `SessionRevoked` event's close code and reason; how download tickets are revoked on disable; how `shedkeys` grows to match, routed through the same after-state test; the granularity of the log's action names for account events; the create dialog's field layout; and the typed-confirmation variant of the destructive dialog.

## Deferred Ideas

- Passwords generated by the server (the first option D-01 turned down)
- Editing the display name (D-02's rejected middle option)
- Closing a disabled member's open loans (the architecture note's advice, declined as D-04)
- Warning the steward about open loans at disable time
- Holding deleted handles against reuse (D-06's third option)
- A global `/desk/sessions` page (D-10's second option)
- A dedicated `detail` column on the loan log (D-11's second option)
- A separate account-events table or section (D-12's third option)
- Ending one session on its own — already out of scope in REQUIREMENTS.md, restated so it is not rediscovered as a gap
- Splitting `steward` into finer bits — carried from Phase 2's deferred list

## Notes on scope

Scope held steady. Two questions tested the edge and each was settled within it: renaming accounts (decided out, and listed as out of scope in the domain block), and whether delete should also remove loan history (decided no).
