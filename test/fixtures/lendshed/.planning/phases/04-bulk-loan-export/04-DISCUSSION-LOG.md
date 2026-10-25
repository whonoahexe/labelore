# Phase 4: Bulk Loan Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 4-Bulk Loan Export
**Areas discussed:** Export action surface, Export lifetime, Cap + the count, Permission + scratch cost

---

## Export action surface

### Q1 — With the old export card gone, what does the Export button do when pressed?

| Option | Description | Selected |
|---|---|---|
| Starts the job at once | Month picked, press, job queued | ✓ |
| Opens a small dialog | A confirm step that restates the month | |
| Needs a second Build step | Pick, build, then collect | |

**User's choice:** Starts the job at once
**Notes:** → CONTEXT D-01. The per-row Export link and the menu entry both rewire to this.

### Q2 — What if the chosen month holds exactly one loan?

| Option | Description | Selected |
|---|---|---|
| Always builds a ZIP | One rule for any count | |
| One loan goes out as a plain CSV | A single entry short-circuits the ZIP | ✓ |
| The label tells you | Same routing, but the button text changes | |

**User's choice:** One loan goes out as a plain CSV
**Notes:** → CONTEXT D-01. The label variant was declined, so the button keeps one name.

### Q3 — The export job finishes. How does the steward collect it?

| Option | Description | Selected |
|---|---|---|
| Button on the queue row | The finished row grows a Download button | |
| Starts on its own | On the completion frame over the live socket | ✓ |
| Starts on its own, only if watching | Auto-starts for the steward who queued it | |

**User's choice:** Starts on its own
**Notes:** → CONTEXT D-02.

### Q4 — The job finishes while the page is closed, so nothing starts. Then what?

| Option | Description | Selected |
|---|---|---|
| The queue row keeps a button | Auto-start is a convenience on top | ✓ |
| Starts on the next visit | The download fires when the page opens | |
| Collected or gone | Only the live frame can trigger it | |

**User's choice:** The queue row keeps a button
**Notes:** → CONTEXT D-03.

---

## Export lifetime

### Q1 — A download dies at 90%. Is the built file still there?

| Option | Description | Selected |
|---|---|---|
| Deleted only on success | Removed once the last byte went out | |
| Deleted when serving starts | One shot, like the ticket | ✓ |
| Never deleted by a download | Only the sweep removes it | |

**User's choice:** Deleted when serving starts
**Notes:** Claude named the consequence: resumability is a design property for a month of loans pulled over a flaky link. Refined in the next question.

### Q2 — Given one-shot semantics, when exactly does the file leave scratch?

| Option | Description | Selected |
|---|---|---|
| Ticket one-shot, file outlives the reply | The ticket is spent at serve start; the file stays | ✓ |
| File goes at serve start | Literal one-shot | |
| Split the file instead | Chunk into numbered parts | |

**User's choice:** Ticket one-shot, file outlives the reply
**Notes:** → CONTEXT D-04. Kept as a refined position: simple ticket rules and a resumable download, by separating the ticket's life from the file's.

### Q3 — How long does an uncollected export sit in scratch?

| Option | Description | Selected |
|---|---|---|
| 3 days from completion | Short enough to keep scratch tidy | ✓ |
| 10 days from completion | Queue Friday, pull the week after | |
| Only when scratch is tight | No clock, sweep the oldest on pressure | |

**User's choice:** 3 days from completion
**Notes:** → CONTEXT D-05.

### Q4 — A build the power cut killed: an `interrupted` job and a half-written file.

| Option | Description | Selected |
|---|---|---|
| Boot cleanup deletes it | The boot pass removes the partial | ✓ |
| Keep it, resume the build | Picks up where it stopped | |
| Keep it, let the sweep take it | Treat the partial as uncollected | |

**User's choice:** Boot cleanup deletes it
**Notes:** → CONTEXT D-06. The same cleanup a cancel needs; one mechanism, two triggers.

---

## Cap + the count

### Q1 — Where does the count that gives the real total happen?

| Option | Description | Selected |
|---|---|---|
| Synchronously on the POST | The create request counts, sums and decides | ✓ |
| As the job's first step | A row is made at once and counts later | |
| Short pre-flight, then the job | A bounded count first, fall back to async | |

**User's choice:** Synchronously on the POST
**Notes:** → CONTEXT D-07 (first half).

### Q2 — The pre-flight count hits its deadline. What does the steward get?

| Option | Description | Selected |
|---|---|---|
| Refused, told to pick fewer days | Closed: no row, no partial total | ✓ |
| Refused, with the count so far | The same refusal plus a partial figure | |
| Let it run longer for small months | Per-month deadlines | |

**User's choice:** Refused, told to pick fewer days
**Notes:** → CONTEXT D-07 (second half). The deadline sits well under the proxy's timeout.

### Q3 — Does the pre-flight count's list become the job's saved manifest?

| Option | Description | Selected |
|---|---|---|
| The manifest is the contract | The `(loan_id, size)` list is saved and used | ✓ (Claude's call) |
| The executor counts again | Pre-flight is only a cap check | |
| Save it, refresh on resume | Contract for the build, refreshed after a restart | |

**User's choice:** *"you decide"* — Claude selected **The manifest is the contract**
**Notes:** → CONTEXT D-08, listed under Claude's Discretion. Reason given: it is the only option that lets omissions be named, since a list is needed to compare against.

### Q4 — The count comes back over the cap. Where does that refusal show?

| Option | Description | Selected |
|---|---|---|
| Dialog with the numbers | States total and cap, one dismiss | ✓ |
| Inline in the picker row | The summary swaps to the over-cap text | |
| Alert above the table | Reuses the transfer flow's alert | |

**User's choice:** Dialog with the numbers
**Notes:** → CONTEXT D-07. The same dialog carries the not-enough-room refusal: one surface, two reasons.

---

## Permission + scratch cost

### Q1 — Which grant does a bulk export need?

| Option | Description | Selected |
|---|---|---|
| Steward only, no extra grant | Scratch is plumbing owned by the system | ✓ |
| Steward plus a scratch grant | Deny-by-default taken literally | |
| Steward, configurable | Settles the argument with a setting | |

**User's choice:** Steward only, no extra grant
**Notes:** → CONTEXT D-04.

### Q2 — Keep the existing job lock for export jobs?

| Option | Description | Selected |
|---|---|---|
| Keep the existing lock | Export jobs lock the (source, scratch) pair | ✓ |
| Source lock only | An export reads the source and writes scratch | |
| Own lane | A separate permit pool for exports | |

**User's choice:** Keep the existing lock
**Notes:** → CONTEXT D-05. The cost of waiting was stated and accepted; both other options sit in Deferred.

### Q3 — The count is under the cap but scratch lacks free room.

| Option | Description | Selected |
|---|---|---|
| Refused at the POST, numbers shown | The same pre-flight checks scratch too | ✓ |
| Queued until there is room | The job waits like any other | |
| Let it try | Start the build and fail on a full disk | |

**User's choice:** Refused at the POST, numbers shown
**Notes:** → CONTEXT D-07.

### Q4 — What name does the browser save, and is `_exports/` visible in the catalogue?

| Option | Description | Selected |
|---|---|---|
| Named for the month, folder hidden | On disk `_exports/{job_id}.zip`, saved as `loans-2026-03.zip` | ✓ |
| Job id everywhere, folder hidden | Saves `export-42.zip` | |
| Named for the month, folder visible | Same name, but the folder shows | |

**User's choice:** Named for the month, folder hidden
**Notes:** → CONTEXT D-01.

---

## Claude's Discretion

- **The manifest as the job's contract** (Cap + the count, Q3) — Maya answered *"you decide"*. Recorded as CONTEXT D-08 with a `one-way` reversibility rating.
- **The archiver mechanism** — an in-process ZIP library versus a bounded `zip` subprocess was never put to Maya; the stack note and the architecture note disagree and both arguments stand. Left to the researcher.

## Deferred Ideas

No scope creep was raised during this discussion — every idea listed as deferred is a *declined option* from a question asked, not a new capability proposed. The full list sits in CONTEXT's Deferred Ideas. The ones worth naming:

- **Volume-splitting into numbered parts** — declined in favour of Range resume, but it is the stated contingency if a spike finds long single streams unreliable.
- **A source-only lock / a dedicated export lane** — the two declined D-05 alternatives, to reach for when a long build visibly blocks the desk.
- **10-day retention** and **space-pressure sweeping** — the two declined D-05 alternatives.
- **Deleting only on a confirmed-complete transfer** — a declined D-04 option; strictly better than one-shot ticketing if a completion signal is ever added for another reason.

## Open Questions Carried Forward

Three gray areas were offered at the end and Maya chose to go on to context rather than discuss them. They are recorded in CONTEXT's `<open_questions>` to be **decided during planning, not rediscovered in execution**: where the month picker sits on a narrow screen, what an empty month produces, and whether one steward may collect another's export.

---

## Execution-Time Decisions (Plan 04-05 checkpoint, 2026-04-15)

Two conflicts surfaced by the 04-05 executor that it could not settle from the
plan alone. Both were put to Maya and both ratified the built behaviour,
so no code changed.

### E1 — D-03 vs the queue rules: does a finished export stay in the docked tray?

D-03 wants an explicit Download on the finished export row "in the docked
tray **and** in `/log` history". The queue rules limit the tray to *active*
statuses, which leaves out `completed`. Both cannot hold.

| Option | Description | Selected |
|---|---|---|
| Export carve-out (`isDockedExport`) | A finished **export only** stays in the tray until collected | ✓ |
| Follow the queue rules strictly | Tray rule untouched; Download lives in history alone | |

**User's choice:** Keep the export carve-out.
**Rationale:** without it, a steward on the catalogue whose auto-start fails sees
the row vanish and the fixed error sentence (`Automatic download didn't start — use
Download to try again.`) shown nowhere, so the failure stays invisible until
they open `/log` unprompted.

### E2 — Collecting someone else's export: closes a carried-forward open question

This settles the open question in CONTEXT — *"whether one steward can collect
another steward's finished export."* **They cannot.** The jobs route allows
collection only when `job.created_by == Some(identity.member_id)` (T-04-07),
while D-07 keeps the list route flat and unscoped — so a non-creator still
*sees* the finished row and its Download answers 403. The page cannot hide it
ahead of time: `created_by` is deliberately withheld from the list reply under T-04-07.

| Option | Description | Selected |
|---|---|---|
| Accept new wording | `EXPORT_NOT_OWNER` = "Only the steward who built this export can download it." | ✓ |
| Reword | Same place, a sentence of Maya's choosing | |
| Expose the creator, hide Download | Add `created_by` / `is_creator` to the list reply | |

**User's choice:** Accept as written.
**Notes:** the sentence is new wording not present in the UI contract; it is authoritative
from here. Check it verbatim at the 04-05 Task 3 checkpoint.
