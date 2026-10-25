# Phase 1: Member Sign-In & Sessions - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Members sign in to Lendshed with a username and password Lendshed itself
holds, and stay signed in across server restarts and power cuts. The shared
kiosk passcode stops gating anyone; the reverse proxy remains purely as
network transport. Covers SIGN-01 through SIGN-06.

**In scope:** `members` and `sessions` tables, scrypt hashing, sign-in/sign-out,
the `SessionReader` seam swap, forced first sign-in password change, sign-in
rate limiting, live-status socket and export-download authentication against
Lendshed sessions, the `shedkeys` account CLI, and removal of the kiosk passcode.

**Not in scope — do not drift into these:**
- Steward roles, permissions, or any per-shed gating → Phase 2
- Admin UI for accounts, session listing, live-session revocation → Phase 3
- `SessionRevocationFeed` and the third `select` branch → Phase 3 (ADMN-03)
- Bulk loan export, shed stock totals → Phase 4

</domain>

<decisions>
## Implementation Decisions

### Session lifetime & expiry

- **D-01:** Sessions use a **21-day sliding idle expiry** — every signed-in
  request pushes the deadline out. The reader already touches the sessions row
  per request, so `last_seen` is written in the same touch. This also gives
  Phase 3's ADMN-05 its data for free.

- **D-02:** **Multiple concurrent sessions per member** — one row per sign-in,
  so the desk laptop and a phone at the shed coexist. **Sign-out ends only the
  session that issued the request**, not the member's others.

- **D-03:** **A password change invalidates all of that member's other
  sessions**, keeping the one that performed the change
  (`DELETE FROM sessions WHERE member_id = ? AND id != ?`). Makes Phase 3's
  ADMN-02 reset correct by default.

- **D-04:** Sign-out's "at once" (SIGN-03) means **new connections only** in
  this phase. REST dies instantly because the reader queries the sessions table
  every request. The next ticket-mint is refused, so no new socket or download
  can start. **Server-side teardown of an already-open socket is Phase 3's
  `SessionRevocationFeed` — do not build it here.**
  — **Reversibility:** reversible — Phase 3 extends this rather than undoing it.

### Cutover & bootstrap

- **D-05:** The bootstrap path is a **CLI explicitly named `shedkeys`**
  (user-specified; do NOT name it `lendshed-admin` or `server`). Implemented as
  a second entry point in the existing `server` package, sharing the db and auth
  modules. Chosen over env vars and migration seeding so no credential ever
  lands in a config file or service unit.

- **D-06:** **`shedkeys` is not steward-only.** It can create, list, and reset
  *any* account, so the desk is fully operable the moment the passcode is gone
  and the CLI stays the break-glass path when someone is locked out.

- **D-07:** **The kiosk passcode is removed entirely at cutover.** The reverse
  proxy stays as transport only. Required by SIGN-01's success criterion, and it
  **dissolves the 2026-05-14 certificate renewal problem outright** — with no
  passcode gate nothing blocks the renewal challenge path.
  — **Reversibility:** costly — re-adding the passcode means reconfiguring the
  proxy and reintroducing the renewal gating.

- **D-08:** **`loan_log.actor` keeps its existing raw-`TEXT` shape** — the handle
  is snapshotted as a plain string at time of action. No FK, no migration.
  Existing v1.0 rows keep their kiosk labels and stay readable.
  — **Reversibility:** one-way — moving to a FK later requires migrating
  historical rows whose actor strings have no member record to point at.

### Sign-in & forced-change UX

- **D-09:** **A route guard gates the pages** — it checks the session cookie and
  redirects unsigned-in visitors to `/sign-in` before render, rather than
  letting the shell paint and redirecting on a 401.
  **See OPEN-01 below — the cache cost of this must be measured before
  planning locks it in.**

- **D-10:** **The guard validates the session against the store**, not just the
  presence of a cookie. **Accepted cost, stated and reaffirmed:** a blocking
  lookup in front of every page load. Planner should give it a short timeout.

- **D-11:** When the store is unreachable during that validation, the guard
  **fails closed and redirects to `/sign-in`**. **Accepted cost, stated and
  reaffirmed:** during power cuts every member is bounced to a form that cannot
  authenticate. **This is deliberate. Do not "fix" it downstream as a bug.**
  — **Reversibility:** reversible — the fallback branch is local to the guard.

- **D-12:** SIGN-02 is enforced by a **server-side `must_change_password` flag
  checked inside the `SessionReader`**, which refuses every endpoint except
  change-password and sign-out with a distinct status the page routes on.

- **D-13:** A member has **a normalized handle *and* a separate display name**.
  The handle is letters, digits, underscore, hyphen; stored and compared
  lowercased, so `Maya` and `maya` cannot both exist.

- **D-14:** **The handle — not the display name — is what gets snapshotted into
  `loan_log.actor`** (see D-08). Unique, stable, unambiguous.

- **D-15:** Password rule is **minimum length 12, no composition requirements**,
  enforced server-side, with the page showing the same rule.

### Rate limiting & lockout

- **D-16:** A throttled sign-in returns a **time-boxed 429 with a visible
  "try again in Nm"**. **Account lockout requiring a steward was explicitly
  rejected** — it lets anyone who can reach the form lock out any member by name.

- **D-17:** The limiter keys on **both client address and submitted handle**, as
  two independent limits. **The per-handle limit must be time-boxed exactly like
  the address one — never a permanent lock.**

- **D-18:** Unknown handle and wrong password are **identical in message,
  status, and timing** — an unknown handle still runs a throwaway scrypt verify
  against a fixed dummy hash. **Unknown handles also accumulate against the
  per-handle limiter**, so a 429 does not leak account existence either.

- **D-19:** **Rate limiting applies to `/sign-in` and change-password only.** The
  session-validation path is keyed by an opaque 256-bit token and sits on the hot
  path for every page load, so a limiter there would throttle ordinary browsing.

### Open questions for the researcher

These are flagged, not decided. **The researcher must resolve them; the planner
must not assume an answer.**

- **OPEN-01 (blocks D-09):** Does adding the route guard actually cost the
  cached catalogue pages? Middleware runs at request time and does not by
  itself force a route dynamic. **Verify against a real build, checking the
  catalogue route still reports `static`.**

- **OPEN-02 (blocks D-17):** Which header does *this* deployment's proxy set for
  the real client address? Without a trustworthy header every member shares one
  address bucket.

- **OPEN-03:** Concrete throttle thresholds — how many attempts, over what
  window, and how long the block lasts, for both limiters. Researcher should
  propose defaults grounded in OWASP guidance.

### Claude's Discretion

No area was handed over wholesale. Within the decisions above, the following
are left to planning judgment: the exact session-token generation call, the
`sessions` table's column set beyond what D-01 and D-04 require, the timeout
value on D-10's validation call, the distinct status code chosen for D-12, and
`shedkeys`'s subcommand surface beyond create/list/reset.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level context
- `.planning/PROJECT.md` — § Constraints, § Key Decisions
- `.planning/REQUIREMENTS.md` — SIGN-01…SIGN-06 verbatim
- `.planning/ROADMAP.md` § Phase 1 — goal and success criteria
- `.planning/STATE.md` § Blockers/Concerns — the power-cut concern

### Code the phase modifies or depends on
- `server/src/auth/reader.ts` — `SessionReader`, the seam whose body is swapped
- `server/src/tickets/store.ts` — 60s single-use ticket TTL and sweep
- `server/migrations/0001_init.sql` — the `loan_log` table D-08 preserves

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`SessionReader` (`server/src/auth/reader.ts:43`)** — a request guard
  deliberately decoupled from the passcode check for exactly this swap.
- **`TicketStore` (`server/src/tickets/store.ts`)** — 60s TTL, single-use,
  purpose-scoped, with a 15s sweep. SIGN-04 reuses this wholesale.

### Established Patterns

- **Fail closed, never open.** The session lookup must behave the same way.
- **Migrations are additive and commented with the decision they encode.**

### Integration Points

- **`server/src/auth/reader.ts`** — the single seam.
- **`server/migrations/0003_*.sql`** — new `members` and `sessions` tables.

</code_context>

<specifics>
## Specific Ideas

- **The CLI must be called `shedkeys`.** The user rejected the proposed
  `lendshed-admin` name outright and specified `shedkeys`.
- The user consistently chose the tighter, more explicit option when a
  tradeoff was presented. Where a later ambiguity arises, lean that way.

</specifics>

<deferred>
## Deferred Ideas

- **Live-socket teardown on sign-out** — deliberately left to Phase 3's
  `SessionRevocationFeed` (ADMN-03), per D-04.
- **Sign-in page visual treatment and "remember me"** — offered and passed over.
- **What the `sessions` table stores for Phase 3's ADMN-05 to read** — offered and
  passed over; D-01 commits to `last_seen` only.

</deferred>

---

*Phase: 1-Member Sign-In & Sessions*
*Context gathered: 2026-03-24*
