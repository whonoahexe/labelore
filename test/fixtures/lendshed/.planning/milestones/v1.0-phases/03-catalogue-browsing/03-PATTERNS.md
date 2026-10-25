# Phase 3: Catalogue Browsing - Pattern Map

**Mapped:** 2026-02-17
**Files analyzed:** 9 (7 new, 2 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/src/catalogue/boundary.ts` (NEW) | utility/shed-boundary | transform | `server/src/stock/shed.ts` (`shedOf`, `readWithDeadline`) | role-match (new primitive, no direct analog for lookups that never take a path — closest is the shed-first defensive check) |
| `server/src/catalogue/index.ts` (NEW) | service (interface) | CRUD (read) | `server/src/sheds/index.ts` (the `ShedReader` interface + `defaultReaders`) | exact (same "interface plus one implementation per shed" shape) |
| `server/src/catalogue/by-shed.ts` (NEW) | service | CRUD (read), file-I/O | `server/src/stock/reader.ts` (`ShedReader`/`readShed`) | exact (own worker plus a bounded-deadline read against one shed feed) |
| `server/src/api/catalogue.ts` (NEW) | controller | request-response | `server/src/api/stock.ts` | exact (the same member check, reused unchanged) |
| `server/src/tickets/store.ts` (`TicketPurpose`, MODIFIED) | model | transform | itself | exact (same file, different implementation) |
| `web/lib/use-catalogue.ts` (NEW hook) | hook | request-response | `web/src/stock/use-stock-socket.ts` | role-match (this hook is a one-shot fetch, not a socket, but the origin, credentials and error-shape habits carry over directly) |
| `web/src/catalogue/tool-card.tsx` (NEW) | component | transform | `web/src/stock/shed-card.tsx` | role-match (per-item card with state-driven styling, careful about labels) |
| `web/src/catalogue/catalogue-view.tsx` (NEW page) | component | request-response | `web/src/pages/stock.tsx` | role-match (client page that consumes a hook and renders in a fixed order) |
| `web/src/nav-shell.tsx` (MODIFIED — add the `/catalogue` link) | component | — | itself | exact (reuses the shell's link list unchanged apart from one entry) |

## Pattern Assignments

### `server/src/catalogue/boundary.ts` (utility/shed boundary, transform)

**Analog:** `server/src/stock/shed.ts` — the `shedOf` helper that turns free text into a known shed or nothing.

Every catalogue read starts from a shed id that has already been parsed; the function never accepts a path-like string.

```ts
export function shedOf(raw: string): ShedId | null {
  return SHEDS.includes(raw as ShedId) ? (raw as ShedId) : null;
}
```

### `server/src/catalogue/by-shed.ts` (service, read)

**Analog:** `server/src/stock/reader.ts` — one worker per shed and a bounded wait. The catalogue read adds paging; the deadline wrapper is reused as it stands.

### `web/lib/use-catalogue.ts` (NEW hook, request-response)

**Analog:** `web/src/stock/use-stock-socket.ts` for the origin constant and error shape only.

```ts
const response = await fetch(`${API_ORIGIN}/api/catalogue/${shed}`, { credentials: 'include' });
if (!response.ok) throw new Error('catalogue request failed');
```

## Shared Patterns

### Shed-first lookup, never a free path

**Source:** `server/src/stock/shed.ts:30-41`.
**Apply to:** `boundary.ts`, `by-shed.ts`, `catalogue.ts` — a request names a shed, and nothing else is ever joined into a file path.

### Refuse alike, never reveal existence

**Source:** `server/src/socket/index.ts:32-38`.
**Apply to:** `api/catalogue.ts` — a shed the member may not read looks the same as a shed that does not exist.

### Named constant with a comment on the failure it prevents

**Source:** `server/src/socket/index.ts:12-16`.
**Apply to:** the page size and the read deadline in `by-shed.ts`.

### Never invent a reading on failure

**Source:** `server/src/stock/reader.ts:55-70`.
**Apply to:** a catalogue read that times out returns an empty marked-stale page, never a guess.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `server/src/catalogue/boundary.ts`'s shed-first lookup core | utility | transform | Nothing in this repo parses a member-supplied shed id into a data location; 03-RESEARCH.md's first sketch is the only reference shape for the exact check. |
| `web` windowed grid for long catalogues | component | transform | No windowed rendering exists anywhere in `web` today (phase 2 installed only the card, badge, progress, alert and skeleton pieces); follow the research notes. |
| `server/src/catalogue/by-shed.ts`'s paged read of a long feed | service | streaming | Every existing read is a single short call; the stock reader and the flag reader both finish in one pass, so nothing here pages. |

## Metadata

**Analog search scope:** `server/src/{api,auth,socket,stock,tickets,sheds}/`, `server/src/app.ts`, `web/{src,lib}/`
**Files scanned:** 14 (server: app.ts, api/stock.ts, tickets/store.ts, sheds/index.ts, stock/shed.ts, stock/reader.ts, feed/bus.ts; web: nav-shell.tsx, use-stock-socket.ts, shed-card.tsx, stock.tsx)
**Pattern extraction date:** 2026-02-17
