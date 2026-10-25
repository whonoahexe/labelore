# Phase 1: Member Sign-In & Sessions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 1-Member Sign-In & Sessions
**Areas discussed:** Session lifetime & expiry, Cutover & bootstrap, Sign-in & forced-change UX, Rate limiting & lockout

Maya selected all four of the gray areas that were offered.

---

## Session lifetime & expiry

### How long does a signed-in session last?

| Option | Description | Selected |
|--------|-------------|----------|
| 21-day sliding idle | Each request moves the deadline; `last_seen` rides along in the same write | ✓ |
| 5-day sliding idle | Same idea, shorter window, more sign-in prompts | |
| Fixed lifetime from sign-in | Ends after N days even if in use; can cut off a loan mid-checkout | |
| Lasts until sign-out | Only sign-out or a steward ends it; a stolen tablet stays valid | |

**User's choice:** 21-day sliding idle

### May a member be signed in on several devices, and what does sign-out end?

| Option | Description | Selected |
|--------|-------------|----------|
| Several sessions, sign-out ends one | A row per sign-in; sign-out closes just the calling session | ✓ |
| Several sessions, sign-out ends all | Many devices allowed but sign-out is global | |
| One session per member | A new sign-in replaces the old one | |

**User's choice:** Several sessions, sign-out ends one

### After a password change, what happens to the member's other sessions?

| Option | Description | Selected |
|--------|-------------|----------|
| End every other session, keep this one | Deletes rows for the member except the current id | ✓ |
| End all sessions, this one too | Clear-cut, but a new member lands on the sign-in page again | |
| Leave the other sessions | Simplest; an old leaked password keeps a live session | |

**User's choice:** End every other session, keep this one

### How much of "at once" does sign-out cover for a socket that is already open?

| Option | Description | Selected |
|--------|-------------|----------|
| New connections only | REST stops right away, no new ticket is issued, the page closes its own socket; teardown on the server waits for Phase 3 | ✓ |
| Close the open socket now | Tighter, but drags Phase 3's feed work forward | |
| Re-check the socket on a timer | Bounded staleness, redundant once Phase 3 lands | |

**User's choice:** New connections only
**Notes:** Matches how the success criterion is worded and where the roadmap parks the revocation feed. Known gap: signing out on one device leaves the other device's socket streaming.

---

## Cutover & bootstrap

### What brings the first sign-in account into being?

| Option | Description | Selected |
|--------|-------------|----------|
| Account CLI in the server package | No secrets in config or service units; works as a way back in | ✓ (renamed) |
| Env vars read on boot | No new tooling, but a real password sits on the box for good | |
| Migration plants a default | No operator step, but a known credential is live | |

**User's choice:** "yes a cli, but not lendshed-admin, call the cli `shedkeys`"
**Notes:** The CLI idea was accepted and the proposed name was not. `shedkeys` is the name, everywhere. It becomes a second entry point inside the existing `server` package, sharing the db and auth modules.

### What becomes of the kiosk passcode that fronts the proxy?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it at cutover | Meets SIGN-01's no-extra-gate wording; ends the certificate renewal snag | ✓ |
| Keep it, exempt the renewal path | Belt and braces, though an old passcode cookie could hide a sign-in bug | |
| Keep it for a while, drop it later | A rollback path, but pushes closing the phase past the code | |

**User's choice:** Drop it at cutover
**Notes:** Settles the most urgent open operations item as a side effect. The price is the loss of that outer layer.

### What does the app record as `loan_log.actor`?

| Option | Description | Selected |
|--------|-------------|----------|
| Handle text, as typed | Plain TEXT, no FK, no migration; ADMN-04 needs nothing more | ✓ |
| A `member_id` next to it | Survives renames, but leaves a nullable key to manage on delete | |
| An opaque member token | Rename-proof, but dangling after an account is deleted | |

**User's choice:** Handle text, as typed
**Notes:** Checked the schema: `loan_log.actor` is already `TEXT NOT NULL`, not a key. Old v1.0 rows keep their kiosk labels, so the log view must show two actor shapes.

### How do the other members get accounts before Phase 3's admin screen exists?

| Option | Description | Selected |
|--------|-------------|----------|
| `shedkeys` makes any account | The desk works from cutover; a permanent way back in | ✓ |
| `shedkeys` makes only the first steward | Smallest surface, but nobody else can sign in for two phases | |
| `shedkeys` makes a steward plus a one-time import | A throwaway path with no lasting recovery use | |

**User's choice:** `shedkeys` makes any account

---

## Sign-in & forced-change UX

### What does a visitor who is not signed in see when opening `/catalogue`, `/loans`, or `/audit`?

| Option | Description | Selected |
|--------|-------------|----------|
| Page paints, then bounces on a 401 | Pages stay prerendered; a short flash of the empty shell | |
| A route guard reads the cookie | No flash; the cookie spans the subdomain so the guard can see it | ✓ |
| Sign-in renders in place | Keeps the destination, but every gated page needs a second mode | |

**User's choice:** A route guard reads the cookie
**Notes:** The option text first claimed this would undo the quick task's prerender fix, then corrected itself before the next question: a guard runs per request and does not by itself force a page dynamic, while reading cookies inside a page does. Left open as OPEN-01 for the researcher to confirm on a real build.

### And when someone arrives holding an old cookie?

| Option | Description | Selected |
|--------|-------------|----------|
| Let it pass, API refuses, page redirects | The guard stays a cheap filter; the API is the real gate | |
| The guard checks the store | Right in every case; a blocking lookup on each page load | ✓ |
| Cookie carries an expiry hint | No lookup, but a second cookie to keep in step and blind to early revocation | |

**User's choice:** The guard checks the store
**Notes:** The cost of the lookup and the store-down case were both in the option text before it was picked.

### What if the store cannot be reached during that check?

| Option | Description | Selected |
|--------|-------------|----------|
| Render anyway, API shows the outage | Matches how things behave today; data calls are still gated | |
| Redirect to sign-in | Fully fail-closed; in a power cut everyone lands on a form that cannot work | ✓ |
| Show a dedicated "desk offline" page | Most honest, but a new route in an identity phase | |

**User's choice:** Redirect to sign-in
**Notes:** The power-cut cost was spelled out and still picked. Recorded as D-11 with a "do not fix this later" note so a reviewer does not read it as a defect.

### How is the forced password change of SIGN-02 enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| Full session plus a `must_change_password` flag | One check inside the `SessionReader` covers every route | ✓ |
| A limited session until changed | Strongest, but two session kinds muddy Phase 3's list | |
| The page routes on the sign-in reply | Leans on the client; the criterion tests going around the page | |

**User's choice:** Full session plus a `must_change_password` flag

### What does a member's handle look like, and is sign-in case-sensitive?

| Option | Description | Selected |
|--------|-------------|----------|
| Lowercased handle alone | One field, readable in the log with no display name | |
| Handle plus a display name | Nicer on screen; a second field to keep in step | ✓ |
| Email as the handle | Familiar, but suggests mail the desk cannot send | |

**User's choice:** Handle plus a display name
**Notes:** This reopened the `loan_log.actor` choice, which the next question closes again.

### With a handle and a display name, which one lands in `loan_log.actor`?

| Option | Description | Selected |
|--------|-------------|----------|
| Handle | Unique and stable; shows a display name while the account lives | ✓ |
| Display name | Reads well, but editable and not unique | |
| Both, as "Name (handle)" | Self-contained, but bakes layout into stored data | |

**User's choice:** Handle

### Which password rules does the change page enforce?

| Option | Description | Selected |
|--------|-------------|----------|
| Length 12 or more, nothing else | Current NIST and OWASP advice; composition rules breed `Password1!` | ✓ |
| Length plus a blocklist | Better against likely guesses; a word list to carry | |
| Length plus composition rules | Looks rigorous; the pattern both bodies now advise against | |

**User's choice:** Length 12 or more, nothing else

---

## Rate limiting & lockout

### What does someone who trips the throttle experience?

| Option | Description | Selected |
|--------|-------------|----------|
| Timed block with a visible wait | A self-healing 429, no steward needed | ✓ |
| Quiet growing delay | Hidden from a prober, but feels broken to a real member | |
| Lock until a steward resets | Hardest stop, but anyone can lock anyone out by name | |

**User's choice:** Timed block with a visible wait
**Notes:** Lockout lost mainly because the desk has no mail-based recovery; `shedkeys` would be the one way back.

### What does the limiter key on?

| Option | Description | Selected |
|--------|-------------|----------|
| Client address and handle, both | The address limit stops one machine spraying; the handle limit survives a missing header | ✓ |
| Client address only | What the stack notes call for; weak if the proxy header is untrustworthy | |
| Handle only | Ignores the header question, but one machine can try many handles | |

**User's choice:** Client address and handle, both
**Notes:** Which header the proxy sets for the real address is still unknown, carried as OPEN-02.

### How far does "unknown handle looks like wrong password" go?

| Option | Description | Selected |
|--------|-------------|----------|
| Identical everywhere, throwaway verify on unknown | Same message, status and timing; unknown handles also count against the limiter | ✓ |
| Same reply, no timing work | Simpler, though the criterion names timing | |
| Identical, and the throttle state hidden too | Most opaque, but a member cannot tell why retrying fails | |

**User's choice:** Identical everywhere, throwaway verify on unknown
**Notes:** Counting unknown handles is what keeps the throttle from turning into a way to test which accounts exist.

### Is the session-check path rate limited?

| Option | Description | Selected |
|--------|-------------|----------|
| No limit there, sign-in only | A 256-bit opaque token cannot be guessed, and the path is hot | ✓ |
| A roomy limit on the check | Blunts a redirect-loop flood; one more limiter to size | |
| Share the sign-in limiter | One layer, but ordinary browsing would trip it at once | |

**User's choice:** No limit there, sign-in only
**Notes:** This question only exists because of the route guard choice earlier; it was not in the first framing of the area.

---

## Claude's Discretion

No area was handed over whole. Left to planning, as written in CONTEXT.md: how session tokens are generated, the extra `sessions` columns, the timeout on the guard's lookup, the status code for the must-change signal, and any `shedkeys` subcommands beyond create, list and reset.

## Deferred Ideas

- Closing an open socket on sign-out → Phase 3 (`SessionRevocationFeed`, ADMN-03)
- Sign-in page look, sign-out placement in the top bar, "remember me" — offered, passed over
- Which fields `sessions` keeps for Phase 3's ADMN-05 — offered, passed over
- Showing that SIGN-06's power-cut survival holds — offered, passed over
- Writing throttle events to `loan_log` — raised, not pursued; a candidate for ADMN-06

Nothing wandered outside the phase boundary, and no idea had to be pushed out of scope.
