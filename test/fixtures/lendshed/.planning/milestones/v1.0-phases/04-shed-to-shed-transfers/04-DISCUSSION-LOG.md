# Phase 4: Shed-to-Shed Transfers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-02-16
**Phase:** 4-shed-to-shed-transfers
**Areas discussed:** Selection & destination, Lend vs return + clashes, Shed caution mode, Depot verification, Queue surface & concurrency, Progress & ETA fidelity, Retry & crash recovery, Loan log review

All eight gray areas offered were selected for discussion.

---

## Selection & destination

**Q1: What is the route from choosing tools to naming their destination?**

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox + `Send to…` dialog | Tick boxes sit on each tool card, a bar appears once something is ticked, and a dialog borrows the shed tabs and category row to aim the job | ✓ |
| Two-pane view | Source on the left, target on the right, both browsable, an arrow button between | |
| Pick, then shed + shelf field | Tick boxes plus a shed dropdown and a typed shelf name | |

**Q2: If the steward changes category or shed, does the ticked set stay?**

| Option | Description | Selected |
|--------|-------------|----------|
| Cleared on navigate | The ticked set belongs to the grid on screen and empties when you leave it | ✓ |
| Persists across categories in one shed | Collect from many categories into one job; would need a basket to review | |
| Persists across sheds too | A cart that outlives every move; it would have to split into several jobs | |

**Q3: Three tools ticked, one press of Send: what lands in the queue?**

| Option | Description | Selected |
|--------|-------------|----------|
| One job | A single row with a single bar, cancel button and log line | ✓ |
| One job per tool | Each can be cancelled alone, but a big pick swamps the queue | |
| One job, per-tool rows in detail | Expandable per-tool progress; makes the output harder to read reliably | |

**Q4: May the destination dialog invent a shelf that does not exist yet?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, a `New shelf` button | Passes the same shed check and is logged like every other write | ✓ |
| No — existing shelves only | Making a shelf counts as another capability altogether | |
| Implicitly — the shelf is made on arrival | No button; the job makes whatever shelf name it receives | |

**Notes:** Every suggested answer was taken. Maya liked the ASCII sketch of the tick-then-dialog sequence.

---

## Lend vs return, clashes

**Q1: Should the first release include returns, or only lending out?**

| Option | Description | Selected |
|--------|-------------|----------|
| Lend-out + Return | A return runs record → verify → empty the source shelf, and never the reverse | ✓ |
| Lend-out only — v1 never clears | Lendshed can never destroy a record, though the stated Core Value shrinks | |
| Lend-out + Return + standalone Clear | A complete stock manager, with exactly the one-click wipe to be wary of | |

**Q2: The destination shelf already has that very tool. Now what?**

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-flight check, then you choose | A conflict list offering Skip / Replace / Cancel, shown before any record moves | ✓ |
| Always skip existing | Destination records are frozen, so a fixed record can never be sent again | |
| Replace only if the source is newer | A destructive choice made silently from a timestamp | |

**Q3: What should the final are-you-sure screen contain?**

| Option | Description | Selected |
|--------|-------------|----------|
| Full list of affected tools + totals | A scrolling list of tools with shed and shelf, topped by count and value | ✓ |
| Count + total summary only | Short, yet it cannot name *which* tools | |
| Full list, plus typed confirmation over a threshold | Friction where it counts, but nothing yet tells us where the line goes | |

**Notes:** Maya took each suggested answer.

---

## Shed caution mode

Context presented: MOVE-04 and the roadmap both treat Depot as the failing shed being cleared out, an idea the Phase 2 bench test refuted. A code comment in `server/src/sheds/index.ts` still repeats it.

**Q1: What should stand in for the outdated reasoning behind MOVE-04?**

| Option | Description | Selected |
|--------|-------------|----------|
| Drive caution from the health signal | Fires when a shed reports silent, degraded or failing, whatever its name | |
| Keep Depot hardcoded cautious | Same rule, honest reason | |
| Per-shed config flag, default off | A plain `cautious` setting for each shed | |
| Retire it — all sheds behave the same | Delete MOVE-04 and the roadmap carve-out | |

**User's choice (free text):** *"all the sheds are healthy now, we replaced the Depot counter that used to fail"*

**Follow-up — confirming how to record it:**

| Option | Description | Selected |
|--------|-------------|----------|
| Retire the premise, keep a cheap health guard | MOVE-04 no longer names Depot or labels a shed as failing; a single rule survives: a shed that reports degraded or failing gets no automatic retries | ✓ |
| Retire it completely — all sheds identical | The job engine never looks at shed health | |
| Keep Depot cautious anyway | On the grounds that its counter cannot be read through the adapter | |

**Q2: What does the guard concretely do?** — **User: "you decide"**
**Q3: Does the steward get to see it?** — **User: "you decide"**

**Notes:** The most important factual fix of the whole session. Three later documents and one code comment need amending; the list lives in CONTEXT.md `<domain>`.

---

## Depot verification

Context presented: the shed sync tool already validates each record on arrival, which makes MOVE-03's check a second, separate pass.

**Q1: Should 'verifying' appear as its own status on a job?**

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct `Verifying…` state *(recommended)* | running → verifying → completed, shown in the queue | |
| Silent step, result as a badge | `Completed ✓ verified` shown at the finish; fewer statuses | ✓ |
| A separate follow-up job row | A verify job tied to the transfer; two rows each time | |

**Q2: A check turns up a mismatch. What happens next?**

| Option | Description | Selected |
|--------|-------------|----------|
| Fail the job, keep both copies, list the tools *(recommended)* | Nothing is destroyed on a doubtful result; a person decides | |
| Retry the mismatched tools once, then fail | Soaks up a genuine one-off; blurs the log a little | ✓ |
| Fail and delete the bad target record | A tidy rule, but the app deletes unprompted | |

**Q3: A Return empties the source shelf. What has to be checked before that?**

| Option | Description | Selected |
|--------|-------------|----------|
| Every return verifies before clearing, all shed pairs | Depot through a check pass, shed-to-shed through a compare pass; lend-outs get the Depot check only | ✓ |
| Depot only — exactly what MOVE-03 says | Local returns empty the shelf on the exit code by itself | |
| Verify everything, lend-outs included | Even-handed, but reads everything twice | |

**Notes:** Maya chose against the advice on Q1 and Q2. The side effect of Q1 (a job sitting at 100% through a long quiet check must look neither finished nor stuck) is marked in CONTEXT.md D-09 as something later work has to solve, not inherit.

---

## Queue surface & concurrency

**Q1: Where in the interface should running jobs be visible?**

| Option | Description | Selected |
|--------|-------------|----------|
| A `/queue` page with a badge in the nav bar *(recommended)* | Its own page and nav entry, nothing overlaying the content | |
| Tray fixed along the bottom edge | A slim strip on every page that opens to the active list | ✓ |
| Panel inside the catalogue | Needs no navigation; takes height from every grid | |

**Q2: How many transfers may run in parallel?**

| Option | Description | Selected |
|--------|-------------|----------|
| Per-shed locks, global cap 2 | Each job holds its source and target shed; two at most overall; nothing to tune | ✓ |
| Fully serial — one at a time | Obviously safe; one slow Depot read stalls a quick local job | |
| Global cap 2–3, no per-shed rule | Just a counter; two jobs can still pile onto one shed | |

**Q3: What goes on the queue page, and for how long does history stay?**

| Option | Description | Selected |
|--------|-------------|----------|
| Active and waiting jobs first, complete history beneath, never trimmed | Nothing to prune, no retention policy guessed without numbers | ✓ |
| Keep a rolling window (last 100 jobs, or 90 days) | A table with a ceiling; code deleting rows to fix a problem nobody has | |
| Only live jobs, history on its own tab | The clearest "what is running"; another screen to build | |

**Notes:** Maya went against the advice on Q1. The constraint written into CONTEXT.md: the layout's `h-full` is what the grid's windowing stands on, so a docked tray must leave it intact.

---

## Progress & ETA fidelity

**Q1: What does a job row show while it runs?**

| Option | Description | Selected |
|--------|-------------|----------|
| Percent, speed, ETA and tool count *(recommended)* | Exactly what MOVE-02 wants, nothing extra | |
| Plus the name of the tool in progress | Comforting on long jobs; more parsing and a risk from unusual characters | ✓ |
| Bar and count alone | Least to parse; the ETA is lost | |

**Q2: The progress output is unreadable. What does the row display?**

| Option | Description | Selected |
|--------|-------------|----------|
| Endless bar and a 'progress unknown' line *(recommended)* | The safe choice, with words to explain it | |
| Freeze at the last known percentage | Indistinguishable from a real stall | |
| Count it as a failed job | Ends healthy jobs over a display issue | |

**User's choice (free text):** *"Just the bar"*

**Clarification asked:**

| Option | Description | Selected |
|--------|-------------|----------|
| Endless moving bar, no text | The motion says it all; the "progress unavailable" wording goes | ✓ |
| The ordinary bar, held at its last value | Looks calm, but is the classic sign of a stall | |

**Q3: How frequently should progress be sent to the page?**

| Option | Description | Selected |
|--------|-------------|----------|
| Limited to roughly one update per second per job | Caps the traffic; suits how fast people read | ✓ |
| Each update as the tool produces it | The smoothest bar, with a flood of frames | |
| Only when something notable changes (1% or 5s) | On a large job 1% is a lot — the ETA grows stale | |

**Notes:** Maya rejected the advice on Q1 and Q2; her free-form reply to Q2 was clarified before it was written down.

---

## Retry & crash recovery

**Q1: How should automatic retries work?**

| Option | Description | Selected |
|--------|-------------|----------|
| A single retry, for temporary faults only *(recommended)* | Faults that look permanent stop immediately | |
| Up to 3 tries with longer pauses between | Copes better with a shaky link and feed rate limits | ✓ |
| No automatic retry — manual only | Shrinks what MOVE-04 says | |

**Q2: Does a retry reuse the job row or create another?**

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the row and count attempts | The queue lists intentions; attempts sit in the detail view | ✓ |
| A fresh row pointing back at the first | The neatest log; rows multiply on unreliable jobs | |

**Q3: After a power cut and restart, what becomes of jobs that were mid-run?**

| Option | Description | Selected |
|--------|-------------|----------|
| Carry on with lend-outs; ask before anything destructive | Returns and approved replaces hold back; lend-outs go back in the queue | ✓ |
| Carry on with all of it | A shelf could be emptied unattended on a stale approval | |
| Ask about every job | A queue of paused jobs after each power cut | |

**Notes:** Maya went against the advice on Q1. CONTEXT.md D-10 holds the knock-on decision: clearly permanent faults still skip the ladder, because trying "permission denied" three times only adds noise.

---

## Loan log review

Context presented: the Phase 1 table `loan_log(id, actor, action, target, ts)` is already there, and STATE.md lists an unresolved worry that nothing traces individual requests.

**Q1: Which events are recorded?**

| Option | Description | Selected |
|--------|-------------|----------|
| Writes + downloads, not browsing | Transfers, returns, replaces, clears, new shelves and downloads | ✓ |
| Everything, browsing included | The word-for-word MOVE-05 reading; hides what matters | |
| Destructive actions only | "Who moved the ladders last Tuesday?" could never be answered | |

**Q2: Where would a steward read the record?**

| Option | Description | Selected |
|--------|-------------|----------|
| A dedicated `/log` route | A table with filters and a third nav entry | ✓ |
| A tab on the `/queue` page | One less route; the framing is wrong for non-job events | |
| Per-job detail only | Nothing that spans all jobs | |

**Q3: Do the four existing columns suffice?**

| Option | Description | Selected |
|--------|-------------|----------|
| Extend it with a migration | Source and target shed and shelf, `job_id`, count and outcome as proper columns | ✓ |
| Keep 4 columns, JSON in `target` | Cannot be indexed or filtered in SQL | |
| Keep 4 columns, a row for every tool | One return turns into many rows that are awkward to piece back together | |

**Notes:** Every suggested answer was accepted.

---

## Claude's Discretion

Handed over explicitly by Maya:

- **What "caution mode" concretely does** ("you decide") → recorded as CONTEXT.md D-09: suspends auto-retry only; per-shed serialization is a general concurrency rule, not part of the guard.
- **Whether caution mode is visible** ("you decide") → recorded as CONTEXT.md D-10: visible with the reason on the job, manual Retry still available.

Never raised and so left to Claude by default (the whole list is in CONTEXT.md `<decisions>` under Claude's Discretion):

- The `jobs` table schema, status values, and claim mechanism
- Cancellation mechanics (polite stop, forced stop, reap) and what a cancelled job leaves on the target shelf
- Boot-time detection of orphaned processes
- A control-channel API versus parsing stdout (the roadmap's standing research flag, unchanged)
- Wait timings and the permanent-versus-transient failure split
- Whether jobs into a silent shed are blocked or allowed to fail
- A completion notice when the steward is elsewhere
- Whether the loan log is append-only, and whether denied attempts are logged
- Per-request tracing (a STATE.md blocker since Phase 1)
- Which component-kit pieces to add (Checkbox and Dialog at minimum) — the Lendshed token set is a hard standing directive

## Deferred Ideas

- A Clear action on its own, without any transfer — turned down as outside MOVE-01; a phase of its own if ever wanted
- Read-once, log-and-skip transfers — went away together with the failing-Depot idea
- A concurrency dial per job in the interface — listed Out of Scope in REQUIREMENTS.md; v1.x at the earliest
- Retaining and archiving job history — D-10 keeps all of it; look again once real volumes exist
- A trash bin with a grace period for clears — raised in the pitfalls notes, mainly for Depot
- Telling the steward a job finished while they are on another page or device
- A brief Depot listing cache — carried over from Phase 3, held back until there was "a write event to invalidate on"; that now exists
- Searching and filtering inside a shed — carried over from Phase 3, still a new capability
- Ticking tools across categories — D-02 limited a pick to one grid
- Permissions by role — REQUIREMENTS.md v2; the loan log is a stopgap, not a replacement
