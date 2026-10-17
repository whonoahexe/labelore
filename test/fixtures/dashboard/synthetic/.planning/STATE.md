---
gsd_state_version: '1.0'
status: planning
milestone: v2.0
milestone_name: Gateway Corrections
current_phase: 3
current_phase_name: Correction Reconciliation
last_activity: 2026-10-14
last_activity_desc: Phase 3 context gathered — five decisions locked, two left open
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 11
  completed_plans: 7
  percent: 64
---

# Project State

**Current focus:** Phase 3 — Correction Reconciliation

## Accumulated Context

### Decisions

- [Phase 01]: 01-01: Filings are keyed by the broker's entry number, not our own UUID — the gateway echoes entry numbers on every rejection, so a join on our ID would need a lookup table we would have to keep in sync.
- [Phase 01]: 01-02: **Store the raw ACE response beside the parsed one** — parse failures on new rejection codes must stay recoverable without re-filing.
- [Phase 01]: 01-03: Timestamps are stored in UTC and rendered in the broker's port timezone; the port, not the user, owns the clock.
- [Phase 02]: 02-01: Corrections are new filings that reference the original, never edits in place — customs treats an amended entry as a separate legal record.
- [Phase 02]: 02-02: The retry queue is a Postgres table with SKIP LOCKED, not Redis — one less service for a two-person team, and the queue depth never exceeds a few hundred.
- [Phase 02]: 02-03: HS-code validation runs client-side against a cached tariff snapshot and again server-side — the client check is for speed, the server check is the authority.
- [Phase 02]: 02-04: Rejection reasons are shown verbatim from the gateway with our plain-language gloss underneath, never instead of it.
- [Phase 03]: 03-CONTEXT: Reconciliation matches on entry number plus line number; a correction that changes the line count is flagged for a human rather than guessed.
- [Phase 03]: 03-CONTEXT: Duty differences under ₹500 auto-reconcile; anything above waits for a broker's sign-off.

### Pending Todos

- Swap the tariff snapshot loader to stream instead of reading the whole file (memory spikes on the 2026 schedule)
- Decide whether reconciliation emails go to the broker or the importer of record

### Blockers/Concerns

**Gateway**

- ⚠️ **The ACE sandbox certificate expires 2026-10-30.** Every Phase 3 integration test runs against it; request the renewal from the customs IT desk before then.
- The sandbox returns HTTP 200 with an empty body on roughly 1 in 40 correction submissions; production behaviour is unknown.

**Process**

- No one has signed off the ₹500 auto-reconcile threshold — it came from a call, not a written decision from the compliance lead.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 261009-m3d | Cache HS-code lookups for the session so the filing form stops refetching the tariff on every keystroke | 2026-10-09 | 4e1a9c2 | Verified | [261009-m3d-hs-code-lookup-cache](./quick/261009-m3d-hs-code-lookup-cache/) |
| 7 | Fix the date picker defaulting to the server's timezone | 2026-10-10 | 9b03d17 | — | — |
| 261011-a7q | Broker CSV export of a day's filings with rejection reasons, one row per line item | 2026-10-11 | c51e0aa | Needs Review | [261011-a7q-broker-csv-export](./quick/261011-a7q-broker-csv-export/) |
| 9 | Rename "Resubmit" to "File correction" across the filing screens | 2026-10-11 | 1d7e2f0 | — | — |
| 10 | Bump pg to 8.16.3 | 2026-10-13 | 77aa310 | — | — |
| 261014-k2p | Rewrite the retry banner copy so it says what will happen next, not what went wrong | 2026-10-14 | e90b4d1 | | [261014-k2p-retry-banner-copy](./quick/261014-k2p-retry-banner-copy/) |
| 12 | Stop logging full entry payloads at info level | 2026-10-16 | 3fa8b52 | — | — |
