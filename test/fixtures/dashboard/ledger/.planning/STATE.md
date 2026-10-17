---
milestone: v2.0
milestone_name: Gateway Corrections
current_phase: 3
status: executing
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 4
  completed_plans: 2
---

# Project State

## Accumulated Context

### Decisions

- [Phase 01]: 01-02: **Store the raw response beside the parsed one** — parse failures must stay recoverable.
- [Phase 01]: 01-CONTEXT: Reconcile on entry number plus line number.
- [Phase ?]: [Quick 260714-3tp]: Cache tariff lookups per session — the form refetched on every keystroke.
- [Phase 03-01]: Key filings by entry number — the gateway echoes it on every rejection.
- [Phase 02]: Corrections are new filings, never edits in place.
- Keep the retry queue in Postgres, not Redis.

### Pending Todos

- Add timing tests for the scanners (03-SECURITY notes 1–2)
- Decide whether reconciliation emails go to the broker or the importer

### Blockers/Concerns

**Phase 3 review** — full detail in `milestones/v1.0-MILESTONE-AUDIT.md`

- **ACTIVE PAUSE — Gateway retries stall:** backoff ignores the header (03-REVIEW WR-02), tracked in plan 03-02.
- WR-01 is still open: a retry storm on every 5xx.

**Operational**

- ⚠️ **The sandbox certificate expires 2026-10-30.** Renew it before the integration run; ACCESS-04 depends on it.
- ~~Flaky snapshot test~~ **RESOLVED 2026-06-30:** fixed in 260714-3tp.
- Vendor ticket WHAT-75 was opened on 10-14 and has no answer yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260714-3tp | Cache tariff lookups per session | 2026-07-14 | 4e1a9c2 | Verified | [260714-3tp-cache-tariff-lookups](./quick/260714-3tp-cache-tariff-lookups/) |
| 3 | Fix the date picker timezone | 2026-07-15 | 9b03d17 | — | — |
