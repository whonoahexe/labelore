# Phase 4: Bulk Loan Export - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A steward picks a month in the loan log and exports its loans as **one** archive.
The server builds that archive as a durable job in the **existing** job queue, and
the steward collects it through the **existing** ticket → `/export/{ticket}` route.
Six requirements: EXPT-01 through EXPT-06.

**Already decided — do not re-open, do not re-research:**

| Decided | Source |
|---|---|
| Built as a durable job, never streamed while it is assembled | `REQUIREMENTS.md` § Out of Scope ("Streamed exports") |
| One export covers one calendar month; multi-month exports wait | `REQUIREMENTS.md` § Future Requirements |
| Flat 5,000-loan cap, not adjusted per shed | `PROJECT.md` § Constraints |
| CSV files inside a ZIP, not a spreadsheet file; ZIP64 forced on | `ROADMAP.md` § Phase 4 Notes; `research/STACK.md` |
| A third `JobKind::Export` on the **existing** `jobs` table, never a parallel `export_jobs` mechanism | `research/ARCHITECTURE.md` § 4 |
| Progress lives in the existing job tray; no separate exports page | `REQUIREMENTS.md` § Future Requirements |
| Reading the loan log reuses `LogReader`; cleaning entry names is a separate concern from reading rows | `ROADMAP.md` § Phase 4 Notes |
| EXPT-05 runs as an **early spike** (a big file through the existing download route, before the builder exists) and gates the phase from closing | `ROADMAP.md` § Phase 4 Notes |
| UI work follows the Lendshed design tokens, strictly | standing project rule, held across seven phases |

**Not this phase:** per-shed stock totals on the catalogue page (a later
milestone) — this phase therefore has **no totals cache to lean on** and must do
its own counting.

</domain>

<blocking_amendments>
## ⚠️ One research recommendation is superseded — do not inherit it

`research/STACK.md` § "Assembling a month file" recommends building the archive
in memory and returning it as the HTTP response body — i.e. **streaming it while
it is built**. That shape is **retired**: `REQUIREMENTS.md` § Out of Scope rules
out streamed exports, and `research/ARCHITECTURE.md` § 4 replaces it with the
staged-job approach this phase implements.

**What survives from STACK.md:** the ZIP-over-single-CSV choice, the ZIP64
mandate and its reasoning, and the note about supplying real file sizes up front.

**What does not survive:** assembling in memory, and the claim that the total size
is unknowable. A **staged** file is complete on disk before a byte is served, so
its exact size **is** known — which is what makes D-04's resume support possible.

Whether to build the ZIP in-process or by a bounded subprocess is **not** locked
either way. It is an open choice for the researcher, constrained by D-08: either
route must give a **deterministic byte layout** for a given manifest.

</blocking_amendments>

<decisions>
## Implementation Decisions

### Export action surface (EXPT-01, EXPT-02)

- **D-01:** The month picker sits above the loan log; the **Export** button sits
  beside "Print list". When the picked month holds **exactly one loan** the
  button short-circuits to the plain single-receipt download — no job, no ZIP,
  no staging write. One branch in the click handler.

- **D-02:** When the job's completion frame arrives over the live socket, the
  page **auto-starts** the download — it mints the ticket and begins the pull
  with no click.

- **D-03:** D-02 is a convenience, never the only route. A finished job's row in
  the tray **and** in the job history always carries an explicit **Download**
  action, and both triggers mint the same ticket through **one** code path.

### Export lifetime (EXPT-05)

- **D-04:** One-shot applies to the **ticket, not the file**. The ticket is
  consumed when serving starts, but the ZIP is removed only once the response
  **ends**, success or drop, so a `Range` retry after a cut connection can
  resume instead of rebuilding.
  — **Reversibility:** costly — the end-of-response signal does not exist in the
  download route today, and adding it later touches both serve paths.

- **D-05:** An uncollected export is swept **three days after completion**, not
  fourteen, because the mini PC's disk is small and no page lists abandoned files.

- **D-06:** A build killed by a power cut comes back as `interrupted`, and boot
  reconciliation **removes the partial ZIP**; the job is rebuilt through the
  existing Retry. A partial ZIP has no salvage value, since its index is written
  last.

### Cap enforcement (EXPT-03)

- **D-07:** The count of the picked month runs **synchronously on the
  create-export request**. It either refuses with the real total or inserts the
  job row, in the same request. It gets a **named deadline constant**, and on a
  trip it **fails closed**: no row, no partial number.

- **D-08:** *(Claude's discretion — see below.)* The count's list of
  `(loan_id, line)` pairs is **persisted as the job's manifest**, and the
  builder writes exactly that list in that order. A loan that has since vanished
  becomes a named EXPT-06 omission.
  — **Reversibility:** one-way — the manifest is both the basis for the omission
  report and the source of the deterministic layout that D-04 depends on.

### Claude's Discretion

- **D-08 (manifest as contract):** the steward lead answered *"you decide"*. It is
  the only option that lets EXPT-06 name what is missing.
- **The ZIP mechanism** (in-process versus a bounded subprocess) is left open, per
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
- **Named deadline constants per call site**, even when two values coincide.

### Integration Points

- **`server/src/jobs/executors/export.ts`** — the one new module.
- **`web/src/pages/loan-log.tsx`** — one button, one handler.

### Constraints this design imposes

- **No parallel job mechanism**; everything uses the existing `jobs` table.
- **Determinism is load-bearing**: a given manifest must yield identical bytes.

</code_context>

<specifics>
## Specific Ideas

- **The steward lead takes the lighter option — until a build could be lost.**
  Fewer parts won on D-01, D-02 and D-03, but where hours of work were at stake
  she took the tighter option every time: D-04, D-06 and D-07.
- **D-04 was reached by refinement, not reversal.** She first chose literal
  one-shot semantics, then took the version that keeps the simple ticket and gains
  resume by separating the ticket's life from the file's.
- **The export file must carry the month in its name**, exactly as the picker shows it.

</specifics>

<deferred>
## Deferred Ideas

- **Volume-splitting large exports** (`.zip.001`, `.zip.002`) — offered as D-04's
  third option and declined in favour of `Range` resume.
- **A fourteen-day retention window** — D-05's second option; the obvious revisit
  if three days proves too tight.
- **Resuming an interrupted build from its partial** — D-06's second option.
- **An admin surface for clearing staged exports** — implied by the hidden folder;
  not requested, not built.

</deferred>

---

*Phase: 4-Bulk Loan Export*
*Context gathered: 2026-04-10*
