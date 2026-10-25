# Roadmap: Lendshed

## Milestones

- ✅ **v1.0 Shed Basics** — v1.0 Phases 1-4 (shipped 2026-03-20)
- 🚧 **v1.1 Steward Desk** — v1.1 Phases 1-4 (planned 2026-03-24)

> **Phase numbering restarts at 1 in each milestone.** v1.0's phases are archived under
> `milestones/v1.0-phases/` and are always written with a `v1.0` prefix in this file.
> An unqualified "Phase N" always means the **current milestone (v1.1)**.

## Phases

<details>
<summary>✅ v1.0 Shed Basics (v1.0 Phases 1-4) — SHIPPED 2026-03-20</summary>

- [x] v1.0 Phase 1: Member Data Foundation (3/3 plans) — completed 2026-01-30
- [x] v1.0 Phase 2: Shed Inventory Health (5/5 plans) — completed 2026-02-14
- [x] v1.0 Phase 3: Catalogue Browsing (4/4 plans) — completed 2026-03-03
- [x] v1.0 Phase 4: Shed-to-Shed Transfers (6/6 plans) — completed 2026-03-20

Full detail: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### 🚧 v1.1 Steward Desk (current milestone — numbering restarts at 1)

- [x] **Phase 1: Member Sign-In & Sessions** - Members sign in with credentials Lendshed itself holds; the kiosk passcode stops gating anyone (completed 2026-03-28)
- [x] **Phase 2: Roles & Permissions** - Stewards set what each member may do per shed, and the server refuses anything else (completed 2026-04-02)
- [x] **Phase 3: Account Admin & Sessions** - Stewards run the member lifecycle end to end and can cut off live sessions (completed 2026-04-09)
- [ ] **Phase 4: Bulk Loan Export** - Stewards export a month of loans as one staged file, up to 5,000 loans

## Phase Details

### Phase 1: Member Sign-In & Sessions

**Goal**: Members sign in to Lendshed with a username and password it holds itself, and stay signed in across restarts.
**Depends on**: Nothing (first phase of v1.1; builds on shipped v1.0)
**Requirements**: SIGN-01, SIGN-02, SIGN-03, SIGN-04, SIGN-05, SIGN-06
**Success Criteria** (what must be TRUE):

  1. A member reaches the app, is shown a sign-in form, and signs in with a username and password (SIGN-01)
  2. A member holding a temporary password is sent to a change-password screen and cannot reach any other page until they set a new one (SIGN-02)
  3. After signing in, the live-status socket connects and an export download starts; after signing out, both are refused (SIGN-03, SIGN-04)
  4. Repeated wrong-password attempts are throttled, and a wrong username is indistinguishable from a wrong password (SIGN-05)

**Plans**: 6/6 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer: one member signs in end to end (credential table, hashing, cookie, request check) and the kiosk passcode check is retired

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Session lifecycle: sign-out, the forced new-password gate, socket tickets, route list
- [x] 01-03-PLAN.md — The `lendctl` account tool (create, list, reset) and its first-steward proof

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Sign-in throttling on two self-clearing counters, and the same-answer-for-wrong-name proof
- [x] 01-05-PLAN.md — Router guard, bare frame and the `/sign-in` screen

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — `/set-password`, top bar name and sign-out, and the router change

### Phase 2: Roles & Permissions

**Goal**: A steward sets what each individual member may do per shed, and the API refuses anything not granted.
**Depends on**: Phase 1 (needs a real session identity to check permissions against)
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06
**Success Criteria** (what must be TRUE):

  1. A steward ticks `lend` and `adjust` per shed in an editable grid and the member's access changes on their next action (ROLE-01, ROLE-02)
  2. A member sees and can browse only the sheds they hold `lend` on (ROLE-03)
  3. Borrow, adjust and transfer are refused with a 403 where the member lacks the matching permission (ROLE-04)

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: one permission check end to end (migration, `access` gate, session gains role and grants, shed listing) behind a one-way schema decision gate

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Shed-scoped enforcement across the remaining handlers and the transfer direction rule
- [x] 02-03-PLAN.md — Steward API: member list, role switch, grant and revoke, and the last-steward guard

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Page foundations: pure affordance rules and the client who-am-I provider
- [x] 02-05-PLAN.md — The `/stewards` shell with the member list, role switch and permission grid

### Phase 3: Account Admin & Sessions

**Goal**: A steward runs member accounts end to end and can see who is signed in and cut them off immediately.
**Depends on**: Phase 2 (steward surfaces gated by the permission check from day one)
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06
**Success Criteria** (what must be TRUE):

  1. A steward creates a member with an initial password and can reset any member's password (ADMN-01, ADMN-02)
  2. A steward disables an account and that member's open page and live socket stop working at once (ADMN-03)
  3. A deleted member's earlier loans are still readable and still attributed in the loan log (ADMN-04)
  4. A steward sees which members are signed in, from where, and when they last acted (ADMN-05)

**Plans**: 4/4 plans executed

### Phase 4: Bulk Loan Export

**Goal**: A steward exports a month of loans as a single file that survives the trip, staged as a durable job.
**Depends on**: Phase 2 (export endpoints gated from the start)
**Requirements**: EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05, EXPT-06
**Success Criteria** (what must be TRUE):

  1. A steward picks a month in the loan log and starts an export from a button beside "Print list" (EXPT-01, EXPT-02)
  2. Export preparation shows progress, can be cancelled without a partial file, and is still downloadable after a restart (EXPT-04, EXPT-05)
  3. A selection of more than 5,000 loans is refused before any work starts, with the real total shown (EXPT-03)
  4. A loan that vanishes mid-export is reported by name rather than leaving a silently short file (EXPT-06)

**Plans**: 2/5 plans executed

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Prove a large download survives the tunnel and resumes after a drop.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — Save and pre-check bounded, owner-scoped export lists.

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 04-03-PLAN.md — Build the single export file with cancel and exact skip reporting.
- [ ] 04-04-PLAN.md — Deliver, recover and expire finished exports for their owner.
- [ ] 04-05-PLAN.md — Add the loan log button, progress strip and failure notice.
