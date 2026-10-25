# Phase 4: Bulk Loan Export - Pattern Map

**Mapped:** 2026-04-02
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

## File Classification

The list below joins the explicit paths in `04-CONTEXT.md` and `04-RESEARCH.md` with the few extra test and helper files the locked behaviour implies. Names marked “suggested” belong to the planner, not to any earlier decision.

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/package.json` | config | build-time | existing dependency entries in the same file | exact |
| `server/migrations/0005_export_jobs.sql` (suggested) | migration | CRUD | `server/migrations/0004_roles_and_grants.sql` | exact |
| `server/src/config.ts` | config | transform | its `maxExportLoans` setting | exact |
| `server/src/jobs/index.ts` | model/store | CRUD | its `JobAction`, `Job`, `insertJob` | exact |
| `server/src/jobs/executors/export.ts` | service | file-I/O, event-driven | `server/src/jobs/executors/transfer.ts` | role-match |
| `server/src/jobs/worker.ts` | service | event-driven | existing transfer dispatch | exact |
| `server/src/loans/log.ts` | model/service | event-driven | existing `LogAction` + `record` | exact |
| `server/src/export/serve.ts` | controller/service | request-response, streaming | `serveFile` | exact |
| `server/src/api/desk.ts` | controller | request-response, CRUD | `createJob` and the job detail shape | exact |
| `server/test/export-cap.test.ts` (suggested) | test | request-response | `server/test/download-ticket.test.ts` | role-match |
| `server/test/export-serve.test.ts` (suggested) | test | request-response, streaming | `server/test/download-ticket.test.ts` | exact |
| `web/lib/export-request.ts` (suggested) | utility | request-response, transform | `web/src/pages/loan-log.tsx::postJob` | role-match |
| `web/lib/export-request.test.ts` (suggested) | test | transform | `web/lib/log-target.test.ts` | exact |
| `web/src/pages/loan-log.tsx` | component/page | request-response | its existing row actions | exact |

## Pattern Assignments

### Export schema and job model

**Files:** `server/migrations/0005_export_jobs.sql`, `server/src/jobs/index.ts`

Follow the earlier migration's header comment and closed `CHECK` list. The new job action is one more member of the existing union, not a second table family.

```sql
CREATE TABLE export_jobs (
  id INTEGER PRIMARY KEY,
  month TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed'))
);
```

### Export executor and worker dispatch

**Files:** `server/src/jobs/executors/export.ts`, `server/src/jobs/worker.ts`

The executor implements the same two-method interface the transfer executor does. The worker already dispatches on the job action, so export is one more branch.

### Cap and refusal

**Files:** `server/src/config.ts`, `server/src/api/desk.ts`

Count the month's loans before queuing anything. Over the cap, refuse with the backend's own wording and queue nothing.

```ts
const total = countLoans(db, month);
if (total > config.maxExportLoans) return refuse(`${total} loans is over the ${config.maxExportLoans} cap`);
```

### Serving the finished file

**Files:** `server/src/export/serve.ts`

Reuse `serveFile`'s ticket check and range handling. A finished export is owned by the steward who asked for it; a ticket minted for someone else is refused alike.

### Loan-log wiring and page actions

**Files:** `server/src/loans/log.ts`, `web/src/pages/loan-log.tsx`, `web/lib/export-request.ts`

Record `export_requested` after the job row commits. The page's request helper lives in a plain `web/lib` module with a node test beside it.

## Shared Patterns

### Authorization and ownership

**Sources:** `server/src/api/desk.ts`, `server/src/guard/index.ts`, `server/src/export/serve.ts`

Require the steward gate when an export is requested. Keep the requester on the job row and check it again when a download ticket is minted. Anything that is not the owner gets the refuse-alike answer.

### Errors and limits

Limits fail closed and return no partial file. The backend owns the wording and the numbers shown to a steward. Wire values are closed unions backed by SQL checks. Bound the month format, the row count and the request size.

### Testing

Integration tests copy the real-router, scratch-database setup from `download-ticket.test.ts`. Web logic belongs in framework-free `web/lib/*.ts` files with adjacent tests. Required cases: exactly at the cap, one over, a malformed month, an export asked for by one steward and fetched by another, and a restart in the middle of a run.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `server/src/jobs/executors/export.ts` (file-writing details only) | service | file-I/O | No in-process writer for a single-file archive exists. Use `04-RESEARCH.md`'s pinned example for row ordering and the final flush; the job lifecycle still follows the transfer executor. |

## Metadata

**Analog search scope:** `server/src`, `server/test`, `server/migrations`, `web/lib`, `web/src/pages`

**Files scanned:** 41 candidate source, test and migration files; the search stopped after three strong pattern families.

**Pattern extraction date:** 2026-04-02
