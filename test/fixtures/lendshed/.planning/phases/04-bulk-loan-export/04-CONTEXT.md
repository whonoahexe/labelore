# Phase 4: Bulk Loan Export - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A steward picks a month in the loan log and exports its loans as **one** archive.
A durable job on the **existing** queue builds it, and the steward then fetches it
through the **existing** ticket → `/export/{ticket}` route.
Six requirements: EXPT-01 through EXPT-06.

**Already decided — do not re-open, do not re-research:**

| Decided | Source |
|---|---|
| Built by a durable job, never streamed while it is assembled | `REQUIREMENTS.md` § Out of Scope ("Streamed exports") |
| One export covers one calendar month; multi-month exports wait | `REQUIREMENTS.md` § Future Requirements |
| Flat 5,000-loan cap, not adjusted per shed | `PROJECT.md` § Constraints |
| CSV files inside a ZIP, not a spreadsheet file; ZIP64 forced on | `ROADMAP.md` § Phase 4 Notes; `research/STACK.md` |
| Export becomes a third `JobKind` in the **existing** `jobs` table; no second `export_jobs` mechanism | `research/ARCHITECTURE.md` § 4 |
| Progress shows in the current job tray; there is no exports page of its own | `REQUIREMENTS.md` § Future Requirements |
| The loan log is read through `LogReader`; tidying entry names is a different job from reading rows | `ROADMAP.md` § Phase 4 Notes |
| EXPT-05 is an **early spike** (a large file sent through the current download route before any builder exists) and blocks the phase from closing | `ROADMAP.md` § Phase 4 Notes |
| UI work follows the Lendshed design tokens, strictly | standing project rule, held across seven phases |

**Not this phase:** per-shed stock totals on the catalogue page (a later
milestone) — so this phase has **no stored totals to rely on** and counts for itself.

</domain>

<blocking_amendments>
## ⚠️ A research recommendation no longer applies — do not carry it forward

`research/STACK.md` § "Assembling a month file" advises building the archive in
memory and returning it as the HTTP response body — in other words **streaming it
as it is built**. That approach is **dropped**: `REQUIREMENTS.md` § Out of Scope
excludes streamed exports, and `research/ARCHITECTURE.md` § 4 puts the staged-job
approach in its place, which is what this phase builds.

**Still valid from STACK.md:** the choice of ZIP around CSV, the ZIP64 mandate
with its reasoning, and the advice to supply real file sizes up front.

**No longer valid:** assembling in memory, and the claim that the total size
cannot be known. A **staged** file sits whole on disk before serving begins, so
its size is exact — and that is what lets D-04 offer resume.

Whether the ZIP is built in-process or by a bounded subprocess stays **open** for
the researcher, with one constraint from D-08: either route must produce
**identical bytes** from the same manifest.

</blocking_amendments>

<decisions>
## Implementation Decisions

### Export action surface (EXPT-01, EXPT-02)

- **D-01:** The month picker goes above the loan log and the **Export** button next
  to "Print list". If the chosen month holds **a single loan**, the button
  shortcuts to the plain one-receipt download — no job, no ZIP, no staging write.
  The click handler has just one branch.

- **D-02:** When the job's completion frame reaches the page over the live socket,
  the page **starts the download by itself**: it mints the ticket and starts
  pulling without a click.

- **D-03:** D-02 is a convenience and never the only way. A finished job's row in the
  tray **and** in the job history always has its own **Download** action, and both
  triggers mint the same ticket through **one** code path.

### Export lifetime (EXPT-05)

- **D-04:** Single use is a property of the **ticket, not of the file**: the ticket is
  spent as serving starts, but the ZIP is deleted only after the response
  **finishes**, whether it succeeded or dropped, so a `Range` retry after a broken
  connection can resume instead of rebuilding.
  — **Reversibility:** costly — nothing signals the end of a response in the
  download route today, and adding it later touches both serve paths.

- **D-05:** An uncollected export is swept **three days after it completes**, not
  fourteen, because the mini PC's disk is small and no page lists forgotten files.

- **D-06:** A build interrupted by a power cut is marked `interrupted`, and boot
  reconciliation **deletes the partial ZIP**; the existing Retry rebuilds it. A
  partial ZIP is worthless, since its index is written last.

### Cap enforcement (EXPT-03)

- **D-07:** The count for the chosen month runs **synchronously inside the
  create-export request**. The request ends one of two ways: refused with the true
  total, or accepted with a new job row. The count has a **named deadline
  constant**, and when it trips the request **fails closed**: no row, no partial
  number.

- **D-08:** *(Claude's discretion — see below.)* The count's list of
  `(loan_id, line)` pairs is **stored as the job's manifest**, and the builder
  writes exactly that list in that order. A loan that has meanwhile vanished
  becomes a named EXPT-06 omission.
  — **Reversibility:** one-way — the manifest underpins both the omission report
  and the repeatable layout that D-04 relies on.

### Claude's Discretion

- **D-08 (manifest as contract):** the steward lead answered *"you decide"*. Only
  this option lets EXPT-06 name what is missing.
- **The ZIP mechanism** (in-process or a bounded subprocess) stays open, per
  `<blocking_amendments>`.

</decisions>

<open_questions>
## Named, deliberately unresolved — settle during planning, do not re-ask

1. **Where EXPT-06's omission report reaches the steward.** A count alone does not
   satisfy the requirement; the candidates are the job's event rows, a job detail
   section, or a note file inside the ZIP.
2. **Whether one steward can collect another steward's finished export.** D-03
   gates creation; nothing yet gates collection.
3. **Whether the month-parameter check and the cap check share one seam.**
   The create request currently types its month as a bare string.

</open_questions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level context
- `.planning/PROJECT.md` — § Constraints (the 5,000-loan cap), § Context (the mini
  PC and its power cuts)
- `.planning/REQUIREMENTS.md` — EXPT-01…EXPT-06 verbatim; § Out of Scope
- `.planning/ROADMAP.md` § Phase 4 — goal, criteria and the Notes block

### Research that bears on this phase
- `.planning/research/ARCHITECTURE.md` § 4 — the staged-job data flow
- `.planning/research/PITFALLS.md` — the sections on partial files and stale
  snapshots

### Code this phase modifies or depends on
- `server/src/jobs/mod.rs` — `JobKind`, which gains `Export` as its third variant
- `server/src/export/serve.ts` — the download route that gains `Range` support
- `server/src/loanlog/reader.ts` — `LogReader`, reused for the month count
- `web/src/pages/loan-log.tsx` — where the Export button lands

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **The whole job engine.** Queue, worker pool, boot reconciliation and the
  progress broadcast all apply to an export job unmodified.
- **`jobs.source_ids` is already a JSON array**, so a month export needs no new
  column for its selection.

### Established Patterns

- **Closed enums over free strings on the wire**, backed by a SQL `CHECK`.
- **Each call site gets its own named deadline constant**, even if the values match.

### Integration Points

- **`server/src/jobs/executors/export.ts`** — the one new module.
- **`web/src/pages/loan-log.tsx`** — one button, one handler.

### Constraints this design imposes

- **No parallel job mechanism**; everything uses the existing `jobs` table.
- **Repeatability is load-bearing**: a given manifest must yield identical bytes.

</code_context>

<specifics>
## Specific Ideas

- **The steward lead takes the lighter option — until a build could be lost.**
  Fewer parts won on D-01, D-02 and D-03, but where hours of work were at stake
  she took the tighter option every time: D-04, D-06 and D-07.
- **D-04 was reached by refinement, not reversal.** She first chose literal
  single-use semantics, then took the version that keeps the simple ticket and gains
  resume by separating the ticket's life from the file's.
- **The export file must carry the month in its name**, exactly as the picker shows it.

</specifics>

<deferred>
## Deferred Ideas

- **Volume-splitting large exports** (`.zip.001`, `.zip.002`) — offered as D-04's
  third option and passed over in favour of `Range` resume.
- **A fourteen-day retention window** — D-05's second option; the obvious revisit
  if three days proves too tight.
- **Resuming an interrupted build from its partial** — D-06's second option.
- **A page for clearing staged exports** — never asked for and not built.

</deferred>

---

*Phase: 4-Bulk Loan Export*
*Context gathered: 2026-04-10*
