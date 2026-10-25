# Phase 1: Member Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-01-12
**Phase:** 1-Member Data Foundation
**Areas discussed:** Ticket design, Passcode check build, Persistence scope, Dev bypass + real-host proof

---

## Ticket design

| Option | Description | Selected |
|--------|-------------|----------|
| 45s, single-use, in memory | About 45s lifetime, one use, held in a map; a restart empties it (correct). Smallest replay window, no table to clean. | ✓ |
| Signed blob, about 45s | Nothing stored on the server; simpler to run but cannot enforce one use inside the window. | |
| 10 min, reusable, stored in SQLite | Longer-lived and saved; smoother reconnects, wider replay window, more state. | |

**User's choice:** 45s, single-use, in memory
**Notes:** Flagged for planning — a browser-native download request cannot use the socket's first-message pattern, and the ticket must stay out of the URL query. A one-time path segment versus a short-lived scoped cookie is left open for research (CONTEXT D-03).

---

## Passcode check build

| Option | Description | Selected |
|--------|-------------|----------|
| Small hand-written check | A constant-time compare around the standard library, about 40 lines, fully readable, fully ours to test. | ✓ |
| Middleware package | A maintained package with its own cookie handling; a younger dependency on the critical path. | |

**User's choice:** Small hand-written check
**Notes:** Accepted the upkeep for the control. Mitigation kept (CONTEXT D-05): hold the check behind one tested seam so it can be swapped for a package later without touching callers.

---

## Persistence scope

| Option | Description | Selected |
|--------|-------------|----------|
| Store + durability + loan_log | Connection, WAL, full sync, busy wait and a migration runner, shown end to end with the shared `loan_log` table. | ✓ |
| Store + durability only | Connection, settings and runner with no domain table; untested against a real table until Phase 2. | |
| Also draw the jobs schema | `loan_log` and jobs tables now; fewer later migrations but likely rework before Phase 4 research. | |

**User's choice:** Store + durability + loan_log
**Notes:** The jobs schema stays in Phase 4. The `loan_log` table is defined now; log writes and confirm-on-delete stay in Phase 4.

---

## Dev bypass + real-host proof

| Option | Description | Selected |
|--------|-------------|----------|
| Env dev bypass + spike first | A dev mode with a fake member, refused on any production config, and Phase 1's first plan is a walking-skeleton spike on the real host. | ✓ |
| Always through the proxy | No bypass; develop through the real proxy every time. Highest fidelity, slowest loop. | |
| Build-time dev flag | The bypass is compiled out of release builds; safest, but a rebuild to toggle. | |

**User's choice:** Env dev bypass + spike first
**Notes:** The bypass must abort if the server is bound to the public interface. The spike checks ticket, socket and passcode against the real host (not localhost) as the first executable step; the full guard is then built on the proven pattern.

---

## Claude's Discretion

- Guard ordering, the exact allowed-origin setting (the named front-end origin, never a wildcard), wiring, error-reply shaping, and the in-memory ticket map's data structure.
- Binding the server to the proxy interface alone (defence in depth) left to the deploy step of planning.

## Deferred Ideas

None — discussion stayed within phase scope.
