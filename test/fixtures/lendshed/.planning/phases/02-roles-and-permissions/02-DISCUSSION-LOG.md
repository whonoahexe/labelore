# Phase 2: Roles & Permissions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 2-roles-and-permissions
**Areas discussed:** Permission vocabulary, Shed visibility, Role lifecycle (→ became Member grants), Lockout guardrails + editor page

> **Note:** the first pass through Permission vocabulary was thrown away
> when Maya asked to be asked again from the top ("start over, I changed my
> mind"). The discarded answers were: a full 4×4 grid, symmetric transfers
> on both sheds, and an unanswered adjust-bit question. They stay here as
> audit trail only — none of them reached CONTEXT.md.

---

## Permission vocabulary

### Q1 — What shape should a member's permission set take?

| Option | Description | Selected |
|---|---|---|
| Full grid (4×4) | browse / lend / move / adjust for each shed | |
| Lend / Adjust per shed | two bits per shed, eight in all; lend implies browse | ✓ |
| Per-shed browse plus global actions | four shed bits and three global bits | |

**User's choice:** Lend / Adjust per shed
**Notes:** First pass picked the full grid; reversed on the restart.

### Q2 — A transfer touches two sheds. Which bits must a job hold?

| Option | Description | Selected |
|---|---|---|
| Directional (recommended) | lend on the source, adjust on the destination | ✓ |
| Adjust on both sheds | One symmetric rule, no per-action table | |
| Directional plus lend on destination | Source lend, destination lend and adjust | |

**User's choice:** Directional
**Notes:** First pass picked symmetric adjust-on-both under the grid model; reversed on the restart.

### Q3 — Is `steward` one bit, or does it split?

| Option | Description | Selected |
|---|---|---|
| One steward bit | Gates the grant editor and member management | ✓ |
| steward + log | Two bits, so a helper can read the loan log | |
| Three bits | manage_members / manage_grants / view_log | |

**User's choice:** One steward bit

### Q4 — Should the live loan queue be scoped by permission or stay shared?

| Option | Description | Selected |
|---|---|---|
| Scope by lend | A member sees only loans touching sheds they may lend from | |
| Everyone sees every loan | The flat v1.0 queue stays as it is | ✓ |
| Every loan, shelf names hidden | Rows visible, shelves masked where unpermitted | |

**User's choice:** Everyone sees every loan
**Notes:** Written into CONTEXT.md as an accepted leak (D-09) so no later agent mistakes it for a bug.

---

## Shed visibility

### Q1 — What does a member without `lend` on a shed see on the stock page?

| Option | Description | Selected |
|---|---|---|
| Card shown, not clickable | Fill and condition stay visible, link is dead | ✓ |
| Card hidden | Only permitted sheds render | |
| Locked card, no numbers | Presence acknowledged, figures withheld | |

**User's choice:** Card shown, not clickable
**Notes:** Side effect noted at the time: the live-status feed needs no per-connection filter.

### Q2 — How does the page learn a member's grants?

| Option | Description | Selected |
|---|---|---|
| Extend /api/whoami | Add role and grants to the existing reply | ✓ |
| Carry it through the route guard | The session check also returns grants | |
| Both | Guard for server render, whoami for the client | |

**User's choice:** Extend /api/whoami
**Notes:** Keeps the route guard a pure session gate.

### Q3 — What does a member see when they open a denied shed directly?

| Option | Description | Selected |
|---|---|---|
| In-page denied panel | Normal chrome with a short explanation | ✓ |
| Redirect home | A client bounce once whoami returns | |
| 404 as if absent | Treats the shed as nonexistent | |

**User's choice:** In-page denied panel

### Q4 — How do write controls behave when not permitted?

| Option | Description | Selected |
|---|---|---|
| Listed but disabled, with a reason | Every destination shown, unavailable ones explain themselves | |
| Hide unavailable actions | Only permitted destinations shown | |
| Disabled, no reason given | Everything renders; unavailable controls are just greyed | ✓ |

**User's choice:** Disabled, no reason given
**Notes:** Leaves a deliberate mismatch with Q3: a denied page explains itself, a denied control does not. Kept in CONTEXT.md (D-09) so nobody smooths it over.

---

## Role lifecycle → Member grants

### Q1 — Can a member hold more than one role?

| Option | Description | Selected |
|---|---|---|
| One role per member | Single role_id key, one join | ✓ (superseded) |
| Many roles, union of grants | A join table, composable | |

**User's choice:** One role per member — then **superseded** before the next question.

### Model change (user-initiated, free text)

Maya broke in with: *"hang on, no role sets. two roles only, steward and
member. grants belong to each member, not to a role. can we talk about how
badge systems work in an office building?"*

Claude explained door-badge access: people, groups and badges as separate
things, a rule as the unit of permission that can hang off any of them, doors
closed unless a rule opens them, and an explicit refusal always beating an
opening. It also named why such systems allow rules on single people but
discourage them: "who can open the storeroom" can only be answered by listing
every person, and two people hired for one job slowly drift apart.

Claude also pointed out that the idea rewrites ROLE-01 and ROLE-02 rather than
just choosing how to build them, and that once grants carry everything real,
a "viewer" role has nothing left to do.

**User's response:** *"yes, just members with two possible roles. steward and
member. steward gets everything. we should be able to give each member
different grants."*

Model locked: no roles table; `members.role` is a two-value enum; grants are
per member.

### Q2 — How does `steward` get "everything" at the check?

| Option | Description | Selected |
|---|---|---|
| Short-circuit in guard.check | Role is looked at first; a steward never reads grants | ✓ |
| Write out the grants | Promotion inserts all 8 rows | |
| Short-circuit plus a read-only grid | Enforcement skips, the page shows all ticked | |

**User's choice:** Short-circuit in guard.check

### Q3 — What happens to grants on promotion and demotion?

| Option | Description | Selected |
|---|---|---|
| Wipe on promote, empty on demote | Closed both ways, no dormant state | ✓ |
| Keep rows dormant | Fully reversible, nothing to re-grant | |
| Wipe on promote, preset on demote | No accidental zero, no accidental full set | |

**User's choice:** Wipe on promote, empty on demote

### Q4 — Should `shedkeys` get role and grant commands?

| Option | Description | Selected |
|---|---|---|
| Yes — promote and grant | promote / demote / grant / revoke | ✓ |
| Promote only | Smallest addition that closes the loop | |
| No — leave the CLI alone | Relies on the last-steward rule alone | |

**User's choice:** Yes — promote and grant

---

## Lockout guardrails + editor page

### Q1 — Can a steward demote themselves?

| Option | Description | Selected |
|---|---|---|
| Yes, if another steward remains | One count rule, enforced in the write | |
| Never — another steward must do it | Self-demotion always refused, plus the count rule | ✓ |
| Yes, with a typed confirmation | Count rule plus typing the handle | |

**User's choice:** Never — another steward must do it
**Notes:** `shedkeys demote` has no "self", so only the count rule guards it.

### Q2 — Where does the per-member grant editor live?

| Option | Description | Selected |
|---|---|---|
| A /desk shell that Phase 3 fills in | Member list plus a detail page with role and grid | ✓ |
| One small /desk page | A single table, a role toggle, eight ticks | |
| Skip the page — shedkeys only | Phase 2 stays server-side | |

**User's choice:** A /desk shell that Phase 3 fills in

### Q3 — Does the loan log become steward-only?

| Option | Description | Selected |
|---|---|---|
| Stay visible to members | Only member management sits behind steward | |
| Steward-only, as ROLE-05 says | /log leaves the member menu and refuses the API | ✓ |
| Own entries versus all | Members see theirs, stewards see everything | |

**User's choice:** Steward-only, as ROLE-05 says
**Notes:** The clash with v1.0 was raised before the choice: PROJECT.md lists "a loan log a member can review" as shipped. Retracting it is deliberate and sits in CONTEXT.md's amendments block.

### Q4 — How does a member's page catch up after a grant change?

| Option | Description | Selected |
|---|---|---|
| Refetch on navigation and focus | Settles within one route change | |
| Push over the live-status socket | A fourth event variant beside the three there | ✓ |
| Accept staleness until reload | Nothing refetches; the API still refuses | |

**User's choice:** Push over the live-status socket
**Notes:** Flagged then: this builds half of Phase 3's `SessionRevocationFeed` early, so the feed should take revocation as a second variant.

---

## Claude's Discretion

No area was handed over whole. Left to planning: the exact `member_grants` columns beyond `(member_id, grant)`; whether a grant is one string or a `(capability, shed)` pair; the remaining route-to-capability mappings with the defaults in CONTEXT.md D-05; the socket event payload; the `/desk` grid's look within the Lendshed tokens; the denied-panel wording; and how far to merge the two duplicate `parse_shed` helpers.

## Deferred Ideas

- Several grant sets or groups — the roles model itself, put off by D-01
- A "copy grants from…" button, the obvious cure for onboarding drift
- A permission-scoped loan queue, and the hidden-shelf middle option
- Explanatory text on disabled write controls
- Log rows for grant and role changes (Phase 3, ADMN-06)
- Splitting `steward` into finer bits, above all a log-only bit
- Applying the count rule to disable and delete (Phase 3)
- Shed switcher and multi-select behaviour on a read-only shed
