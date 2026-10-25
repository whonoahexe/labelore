# Phase 1: Member Data Foundation - Context

**Gathered:** 2026-01-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the trust base that every later feature leans on — nothing in Lendshed reads or stores a member's data without passing through it:

1. **The kiosk passcode check** — the server itself checks the shared passcode on every request, instead of assuming the reverse proxy in front of it already did. The proxy is network transport; the server *decides*.
2. **Ticket-based socket and download auth** — because the passcode cookie does not reliably reach a socket upgrade or a file download across the proxy, the server hands out short-lived tickets (after checking the passcode once over HTTPS) that authorize the live-status socket and receipt downloads.
3. **The SQLite/WAL store** — the durable database base (connection, durability settings, migration runner) that every later phase builds on, demonstrated end to end on one real table.

**Requirements covered:** MEMB-01 (a member record survives a restart), MEMB-02 (a request without the kiosk passcode is refused).

**Not in this phase:** live stock (Phase 2), catalogue browsing and its shed boundary (Phase 3), transfers and the loan log's write path (Phase 4). Phase 1 only defines the `loan_log` table so the store gets exercised.
</domain>

<decisions>
## Implementation Decisions

### Ticket design (socket + download auth)
- **D-01:** Tickets are **brief (about 45s), single-use and held in memory.** A passcode-checked `POST /api/socket-ticket` mints one; the socket's first message presents it; the in-memory map drops it on use. A restart empties the map and cuts every socket anyway, so tickets deliberately do **not** survive a restart — that is intended, not a gap.
- **D-02:** Alternatives turned down: a stateless signed ticket cannot enforce single use within its window, and a longer-lived stored ticket stretches the replay window for something that is short by nature.
- **D-03 (OPEN — for research/planning):** How a one-shot ticket reaches a **browser-native download request** is unsettled. A download cannot use the socket's first-message pattern, and the ticket must **not** travel in the query string. Pick either a single-use path segment (e.g. `/dl/<ticket>/...`) or a brief, tightly scoped cookie planted by an earlier checked request. Resolve before building downloads.

### Passcode check
- **D-04:** Compare the passcode in **constant time** against a value read from the service unit's environment, never from a file in the repository. Accepted trade-off: one shared secret means no per-member attribution yet; the loan log's `actor` column is where that gap gets recorded.
- **D-05:** The check is **one seam, thoroughly tested**, including a test that a forged request lacking the passcode is turned away, so the seam can be swapped out without callers noticing.

### Persistence scope (Phase 1)
- **D-06:** Phase 1 ships the **connection, durability settings and migration runner**, shown working on one real table: `loan_log` (actor, action, target, timestamp). The log cuts across every phase, so defining it now means no cross-cutting migration afterwards.
- **D-07:** Durability settings are a **correctness requirement, not tuning** (this mini PC loses power twice a month): `journal_mode=WAL`, `synchronous=FULL`, a `busy_timeout` of 5000 or more, and a boot-time checkpoint to replay a previous unclean shutdown's log. The database file lives on the internal disk.
- **D-08:** The jobs schema waits for **Phase 4**, because drawing it up earlier would likely mean redoing it.

### Claude's Discretion
- Middleware ordering, the exact response shapes for refusals, and the ticket map's concrete data structure are left to planning.
- Keeping the server reachable only through the proxy (no public port) is assumed and left to the deploy step.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 1: Member Data Foundation" — goal and success criteria.
- `.planning/REQUIREMENTS.md` — MEMB-01, MEMB-02.

### Auth & persistence pitfalls
- `.planning/research/PITFALLS.md` §Pitfall 1 — check the passcode in the server, never trust the proxy header.
- `.planning/research/PITFALLS.md` §Pitfall 2 — sockets that authenticate in the page but not across the proxy.
- `.planning/research/PITFALLS.md` §Pitfall 3 — SQLite durability under power loss.

### Stack & architecture
- `.planning/research/STACK.md` — pinned package versions.
- `.planning/research/ARCHITECTURE.md` — the three trust paths and the live-status channel.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Nothing yet** — this is a new repository with no source code. Phase 1 writes the first code and fixes the project layout.

### Established Patterns
- No patterns inside the repo yet; borrow from `.planning/research/`.

### Integration Points
- Browser ↔ server directly for the socket and downloads, ticket-authorized.
- Server ↔ SQLite file on the internal disk.
</code_context>

<specifics>
## Specific Ideas

- Ticket flow the steward lead endorsed:
  ```
  POST /api/socket-ticket (checked)  ->  { ticket, exp: now+45s }
  Socket: first message = ticket       ->  map lookup, deleted on use
  Download: one-shot ticket (D-03; NOT query string)
  Restart -> map emptied -> every ticket void (as intended)
  ```
- Target for proving the store: migration `0001_init.sql` creates `loan_log(id, actor, action, target, ts)`; acceptance is one row written and read back end to end.
</specifics>

<deferred>
## Deferred Ideas

None came up — the discussion stayed inside the phase. (Live stock, the shed boundary, the transfer job engine and the log's write path already sit on Phases 2–4.)
</deferred>

---

*Phase: 1-Member Data Foundation*
*Context gathered: 2026-01-12*
