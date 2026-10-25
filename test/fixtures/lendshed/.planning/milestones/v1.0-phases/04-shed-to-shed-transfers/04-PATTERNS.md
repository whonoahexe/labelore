# Phase 4: Shed-to-Shed Transfers - Pattern Map

**Mapped:** 2026-02-26
**Files analyzed:** ~13 (new + modified)
**Analogs found:** 11 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `server/migrations/0002_loans_and_log.sql` | migration | CRUD | `server/migrations/0001_init.sql` | exact |
| `server/src/jobs/index.ts` (Job/JobStatus/JobAction + repo queries) | model | CRUD | `server/src/sheds/index.ts` (closed unions, `ShedConfigs`, comment density) | role-match |
| `server/src/jobs/worker.ts` (poll-claim-dispatch, `ShedLocks`) | service | event-driven | `server/src/stock/reader.ts` (`startReaders`, the polling loop) — not read line by line, same family; `server/src/stock/deadline.ts` for the wait | partial-match |
| `server/src/jobs/recovery.ts` (boot reconciliation) | service | batch | `server/src/db/index.ts::openDatabase` (boot-time checkpoint, "runs once before anything else touches the file") | role-match |
| `server/src/jobs/executors/index.ts` (the `JobExecutor` interface) | utility | transform | `server/src/sheds/index.ts` (`ShedReader` interface) | exact (seam-shape) |
| `server/src/jobs/executors/transfer.ts` | service | streaming | `server/src/stock/counter-feed.ts` (bounded child process) | partial-match |
| `server/src/api/jobs.ts` and `server/src/api/log.ts` | controllers | request-response | `server/src/api/stock.ts` | exact |
| `server/src/feed/bus.ts` (extend — new `Frame` variant) | provider | pub-sub | itself | exact |
| `server/src/db/index.ts` (no new file — reused as is) | config | — | itself | exact |
| `web/src/catalogue/tool-card.tsx` (extend — add a checkbox) | component | event-driven | itself | exact |
| `web/src/stock/use-transfers-socket.ts` (hook, streaming) | hook | streaming | `web/src/stock/use-stock-socket.ts` | role-match |
| `web/src/catalogue/clash-dialog.tsx` | component | request-response | none | no analog |
| `web/src/transfers/transfer-tray.tsx` | component | streaming | none | no analog |

## Pattern Assignments

### `server/migrations/0002_loans_and_log.sql` (migration, CRUD)

**Analog:** `0001_init.sql` — comment header, then closed `CHECK` lists. A transfer row keeps its state in one column and never deletes itself.

```sql
-- 0002: loans, transfers and the loan log (D-03, D-08).
CREATE TABLE transfers (
  id INTEGER PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('queued', 'moving', 'arrived', 'lost'))
);
```

### `server/src/jobs/worker.ts` (service, event-driven)

**Analog:** `server/src/stock/reader.ts` for the polling shape, with one change: the worker claims a row inside a transaction before it acts, so two workers can never take the same transfer.

### `server/src/jobs/executors/transfer.ts` (service, streaming)

**Analog:** `counter-feed.ts` — the bounded child process. The transfer executor reports progress frames through the bus and ends every run with a terminal frame, whatever happened.

```ts
child.on('exit', () => bus.send({ type: 'transfer-ended', id }));
```

### `web/src/stock/use-transfers-socket.ts` (hook, streaming)

**Analog:** `use-stock-socket.ts`. Same ticket flow; the hook merges a terminal frame into its list instead of appending it.

## Shared Patterns

### Shed safety through `catalogue/boundary.ts`

**Source:** `server/src/catalogue/boundary.ts` (`shedOf`).
**Apply to:** every handler and executor that is handed a shed id.

### Refuse-alike error collapsing

**Source:** `server/src/socket/index.ts:32-38`, `server/src/api/stock.ts`.
**Apply to:** `api/jobs.ts` and `api/log.ts` — an unknown transfer and a forbidden one read the same.

### Terminate and wait for every child, never trust exit alone

**Source:** `server/src/stock/counter-feed.ts`.
**Apply to:** `transfer.ts`, and any other executor added later.

The executor ends a stuck child, then waits for it to be collected, then reports.

### Closed unions over free strings at state boundaries

**Source:** `server/src/sheds/index.ts`.
**Apply to:** `JobStatus` and `JobAction`; the database column and the type list the same values.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `web/src/catalogue/clash-dialog.tsx` | component | request-response | No dialog piece is installed yet in this codebase (current set: Alert, Badge, Card, Progress, Skeleton per CONTEXT.md's notes). The moved-tool clash wording is new UI and has no precedent. |
| `web/src/transfers/transfer-tray.tsx` | component | streaming | No docked or global tray exists anywhere in the web code (the nav shell is static). Build fresh, respecting the layout's fixed-height rule (D-14). |
| `server/src/jobs/executors/transfer.ts`'s start-once supervision | service | process-lifecycle | No code in this package starts and supervises a long-lived helper process for the whole server lifetime; every existing child is short and bounded. |

## Metadata

**Analog search scope:** `server/src/{stock,sheds,api,feed,db}`, `server/migrations`, `web/src/{catalogue,stock}`
**Files scanned:** `sheds/index.ts`, `api/stock.ts`, `feed/bus.ts`, `db/index.ts`, `counter-feed.ts` (partial), `0001_init.sql`, `tool-card.tsx`, `use-stock-socket.ts`
**Pattern extraction date:** 2026-02-26
