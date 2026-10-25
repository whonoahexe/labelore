# Phase 4: Shed-to-Shed Transfers - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns the read-only catalogue Phase 3 shipped into a **durable, observable, restart-safe way to move tools between sheds**. Tools picked in one shed become backend jobs that carry them to another shed, with a live in-transit list, a queue and history, and confirmation by the receiving steward.

Five parts:

1. **The jobs substrate** — the jobs schema that Phase 1's D-08 knowingly postponed. The `jobs` table doubles as the queue (ARCHITECTURE Pattern 1); a state machine drives it, and a pass at boot makes MOVE-04 hold.
2. **The transfer executor** — one executor for shed-to-shed moves, and a second for the Depot shed's counter-fed stock. Deliberately **not** unified behind the shed interface (ARCHITECTURE §Anti-Pattern 1): the two sources fail in incompatible ways.
3. **Live in-transit state on the existing bus** — the `Event` enum currently has exactly two variants, both stock. A third variant for transfers goes onto that same multiplexed socket.
4. **The destructive-action guardrails** — a pre-flight clash check, an explicit confirmation naming exactly what will leave a shed, and a loan log with a review surface.
5. **The transfer UI** — picking in the grid, a `Send to…` destination dialog, a docked in-transit tray, a queue page, and a log page.

**Requirements covered:** MOVE-01 (start a transfer), MOVE-02 (a transfer in transit stays findable), MOVE-03 (the receiving steward confirms), MOVE-04 (survives a restart), MOVE-05 (every transfer is logged).

**Not in this phase:** repair scheduling, per-member lending limits, courier tracking, role-based permissions — all deferred in PROJECT.md §Out of Scope. A standalone Remove-tool action was raised and rejected.

**This is the last phase of v1.0.** Everything shipped here completes the Active list.

---

### ⚠️ The basis of MOVE-04 is out of date — this phase corrects it

**ROADMAP.md Success Criterion 2 and MOVE-04 both read as: the Orchard shed uses a careful one-pass mode *because its counter is the unreliable one being replaced*.** Pitfall 7 is an entire entry built on that premise.

**That premise has been false since Phase 2.** Plan 02-01's real capture established that the Orchard counter is a new, working unit. The steward lead confirmed it directly during the Phase 2 checkpoint.

**The decision (D-08 below): drop the replacement story but keep one inexpensive, health-driven guard.** Changes needed elsewhere:

- **ROADMAP.md § Phase 4 Success Criterion 2** — delete the Orchard exception and write the health-driven rule in its place.
- **REQUIREMENTS.md MOVE-04** — restate without naming a shed or calling any counter unreliable.
- **`server/src/stock/shed.ts:37`** — the stale `ShedId.Orchard` doc comment.

Agents downstream: this section overrides the uncorrected ROADMAP.md and REQUIREMENTS.md wording.
</domain>

<decisions>
## Implementation Decisions

### Selection & destination

- **D-01: Checkboxes on the existing catalogue grid, and a `Send to…` dialog assembled from the same navigation pieces.** Checkboxes appear on each tool card; an action bar summarises the selection and offers the dialog.

  The endorsed shape:
  ```
  ┌─ Lendshed ────────────────── ● live ─┐
  ├────────────────────────────────────────┤
  │ [canal] [ridge] [orchard] [depot]      │
  │ canal / garden / spades                │
  │ ────────────────────────────────────── │
  │ ☑ ▣ border fork                        │
  │ ☐ ▣ hand trowel                        │
  │ ☑ ▢ edging iron      good      Mar 18  │
  │ ☐ ▢ wheel hoe        repair    Mar 12  │
  ├────────────────────────────────────────┤
  │ 2 picked · 14 kg     [Send to…] [Clear]│
  └────────────────────────────────────────┘
           ↓ opens
  ┌─ Send 2 tools to… ─────────────────────┐
  │ [canal] [ridge] [orchard] [depot]      │
  │ ridge / garden / spades                │
  │ ▣ long-handled                         │
  │ ▣ border                               │
  │              [Cancel]  [Send here]     │
  └────────────────────────────────────────┘
  ```

  The note under Phase 3's D-01 still holds: the card was built so that selection fits in. Add to it; leave the grid as it is.

- **D-02: A pick covers the grid on screen and clears on navigate.** Changing category or shed resets it, which keeps the action bar a true description of what is on screen.
- **D-03: One pick = one job, whatever the number of tools.** Three tools sent make one queue row, one progress bar and one history entry.
- **D-04: The `Send to…` dialog can name a new shelf.** A `New shelf` button, because "put these on a spring shelf at ridge" should not need a trip out of the flow.

### Move, return and clashes

- **D-05: v1.0 offers both Lend-out and Return. A Return is record → verify → clear the source shelf, in that order — never clear-then-record.** So a failure mid-way leaves the tool still on the source shelf.
- **D-06: Clashes are detected pre-flight and resolved by the steward before anything moves.** Before the job starts, the destination shelf is checked for a tool of the same tag.
- **D-07: Confirming a destructive step lists every affected tool and the totals; a bare "are you sure?" is not acceptable.**

### Shed caution (replaces MOVE-04)

- **D-08: The replacement story is gone; a single health-driven guard stays.** All four sheds are working and are treated identically; the guard reacts to a shed's *current* state.
- **D-09 (Claude's discretion — steward lead said "you decide"): the guard pauses automatic retry and nothing else — concurrency and background reads carry on.**
- **D-10 (Claude's discretion — steward lead said "you decide"): the guard is shown to the user, and manual retry remains possible when it triggers.** The tray row says so.

### Claude's Discretion

Everything below was not discussed and is delegated to research and planning. Where a pitfall or earlier phase constrains the answer, that constraint is named and binding.

- **The `jobs` schema:** which columns, which status variants, how a worker claims a row.
- **Cancellation mechanics.** Not discussed; Pitfall 4 is the authority.
- **Orphan detection on boot.** Pitfalls 4 and 8 both require it.
- **Backoff timings** for any retry ladder.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 4: Shed-to-Shed Transfers" — goal, success criteria, research flag.
- `.planning/REQUIREMENTS.md` — MOVE-01 to MOVE-05.

### Transfer & job-engine pitfalls — authoritative for this phase
- `.planning/research/PITFALLS.md` §Pitfall 4 — cancelling a running job without orphans.
- `.planning/research/PITFALLS.md` §Pitfall 8 — rows stuck in `running` after a restart.

### Architecture
- `.planning/research/ARCHITECTURE.md` §Pattern 1 — the table as the queue.
- `.planning/research/ARCHITECTURE.md` §Anti-Pattern 1 — do not unify transfer behind the shed interface.

### Prior-phase context this phase depends on
- `.planning/milestones/v1.0-phases/03-catalogue-browsing/03-CONTEXT.md` — D-01, D-02 and D-05.

### Code this phase extends
- `server/src/catalogue/boundary.ts` — the shed-boundary check, now called for a destination too.
- `web/src/catalogue/tool-card.tsx` — gains the checkbox.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`server/src/catalogue/boundary.ts`** — the closed-list shed parse makes an out-of-shed move structurally impossible.
- **`server/src/stock/reader.ts`** — the bounded read and its deadline discipline.
- **`server/src/feed/bus.ts`** — a working push channel with a tagged event enum.

### Established Patterns
- **Tunables get named constants whose comments say what failure they guard against.**
- **Closed enums over free strings at boundaries.**

### Integration Points
- **`buildRouter`** — new job routes (create, list, cancel, retry) and the log read route.
- **`web/src/nav-shell.tsx`** — two more links; the docked tray sits beside the shell.

### Notable Gaps
- **There is no job engine at all** — `server/src/jobs/` is absent.
- **No write path to any shed exists.** Every operation shipped so far is a read.
</code_context>

<specifics>
## Specific Ideas

- **The transfer screen shape the steward lead endorsed** — reproduced in D-01: checkboxes on existing cards, an action bar reading `2 picked · 14 kg  [Send to…] [Clear]`, and a dialog that is a reduced copy of the catalogue.
- **She likes to keep working while a job runs**: she preferred a docked tray over a separate page, contrary to the advice, so progress stays in view while browsing.
- **The acceptance checks that matter** — (1) cancel a running transfer and check that nothing keeps running; (2) kill the server mid-transfer, restart, and check that the job is reconciled.
</specifics>

<deferred>
## Deferred Ideas

- **Standalone Remove-tool (retire a tool with no transfer involved)** — raised and rejected. MOVE-01 scopes this phase to moving between sheds.
- **Tunable per-job concurrency in the UI** — premature; revisit only if the fixed default proves a real limit.
- **Job history retention** — D-03 keeps everything. Revisit only with real volume data.
- **Notification when a job completes elsewhere** — raised, not adopted; the tray might make it redundant.
- **Multi-tool pick across categories** — D-02 scoped a pick to one grid. Cross-category gathering is the natural next ask.
- **Role-based permissions** — deferred to v1.1. The loan log is the interim mitigation, explicitly *not* a substitute.
</deferred>

---

*Phase: 4-Shed-to-Shed Transfers*
*Context gathered: 2026-03-05*
