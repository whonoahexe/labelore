# Phase 1: Member Sign-In & Sessions - Pattern Map

**Mapped:** 2026-03-04
**Files analyzed:** 12
**Analogs found:** 9 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `server/src/auth/reader.ts` (swap body) | middleware (reader) | request-response | itself (existing `readMember` function) | exact — modify in place |
| `server/src/auth/session.ts` (NEW) | service | CRUD + request-response | `server/src/tickets/store.ts` (issue and redeem discipline) + `server/src/tickets/mint.ts` (handler idiom) | role-match |
| `server/src/auth/passcode.ts` | — | — | DELETE wholesale | n/a |
| `server/src/auth/kiosk-bypass.ts` (modify) | utility | request-response | itself | exact — modify identity shape |
| `server/src/bin/shedkeys.ts` (NEW) | CLI / utility | CRUD | none in-repo (first bin target) — model on `server.ts`'s config bootstrap + `session.ts`'s hashing functions | no analog |
| `server/src/guard/rate.ts` (NEW) | middleware | request-response | none in-repo (first rate limiter) — `tickets/store.ts`'s `Map` discipline for the per-name counter | partial |
| `server/migrations/0003_members_and_sessions.sql` (NEW) | migration | CRUD | `server/migrations/0002_loans_and_log.sql` | exact |
| `server/src/app.ts` (modify router + cookie settings) | route wiring | request-response | itself | exact — modify in place |
| `server/test/sign-in-flow.test.ts` (NEW) | test | request-response | `server/test/socket-ticket-flow.test.ts` shape + the helpers in `kiosk-bypass.test.ts` | role-match |
| `server/test/session-durability.test.ts` (NEW) | test | file-I/O | `server/test/db-durability.test.ts` | exact |
| `web/src/pages/sign-in.tsx` (NEW) | component (route) | request-response | `web/src/stock/pass-dialog.tsx` (form state, submit, error) | role-match |
| `web/src/nav-shell.tsx` (modify) | component | request-response | itself | exact — modify in place |

## Pattern Assignments

### `server/src/auth/reader.ts` (middleware/reader, request-response)

**Analog:** itself — the existing `readMember` function, swapped from "check the shared passcode" to "look up the session cookie".

**What stays:** the fail-closed return. An unreadable or unknown cookie is `{ kind: 'missing' }`, never a default member.

```ts
export function readMember(req: Request): Reading {
  const raw = req.headers.get('x-kiosk-pass');
  if (raw === null) return { kind: 'missing' };
  return passcodeMatches(raw) ? { kind: 'ok', member: 'kiosk' } : { kind: 'missing' };
}
```

**Apply to:** every reader in `auth/` — anything that cannot be checked counts as unchecked.

### `server/src/auth/session.ts` (NEW — service, CRUD + request-response)

**Analog:** `server/src/tickets/store.ts` for how an opaque token is issued and later redeemed once; `server/src/tickets/mint.ts` for the handler.

Token shape to reuse (not a new scheme): 32 random bytes, hex-encoded.

```ts
export function newToken(): string {
  return randomBytes(32).toString('hex');
}
```

Sessions differ from tickets in one way: they outlive a restart, so the row goes to SQLite and the in-memory map is only a cache. Hash the stored token; compare in constant time.

### `server/src/bin/shedkeys.ts` (NEW — CLI, no analog)

First command-line entry in this package. Reuse the configuration bootstrap from `server.ts` and the hashing helpers from `session.ts` directly instead of copying them.

### `server/src/guard/rate.ts` (NEW — middleware, request-response)

Partial analog only: the per-name attempt counter can follow the `Map` plus purge habit in `tickets/store.ts`. Nothing in the repo reads the forwarded client address, so that part is new ground and 01-RESEARCH.md supplies it.

### `server/migrations/0003_members_and_sessions.sql` (NEW — migration)

**Analog:** `0002_loans_and_log.sql` — a comment header naming the decisions, then closed `CHECK` lists.

```sql
-- 0003: members and sessions (D-01, D-03). Roles arrive in a later phase.
CREATE TABLE members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  must_change INTEGER NOT NULL CHECK (must_change IN (0, 1))
);
```

### `server/test/session-durability.test.ts` (NEW — test, file-I/O)

**Analog:** `db-durability.test.ts` — open a scratch database file, write, reopen, assert the row survived.

### `web/src/pages/sign-in.tsx` (NEW — component/route, request-response)

**Analog:** `web/src/stock/pass-dialog.tsx` — a trio of `name` / `submitting` / `error` state values and validation only on submit.

```tsx
const [name, setName] = useState('');
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

## Shared Patterns

### Fail-closed reading (every file under `auth/`)
**Source:** `server/src/auth/reader.ts:12-30` and `server/src/db/index.ts` (`openDatabase`'s throw on a bad path).
**Apply to:** `reader.ts`, `session.ts`, `rate.ts`, `bin/shedkeys.ts` — a state that cannot be verified is refused, never defaulted open.

### `{ "error": "..." }` response body
**Source:** `server/src/api/respond.ts:6-14` (`fail` helper).
**Apply to:** every new handler in `session.ts` (`signIn`, `signOut`, `changePassword`).

### Random token, hex-encoded
**Source:** `server/src/tickets/store.ts:20, 71-75`.
**Apply to:** `session.ts` session tokens (D-01), reusing the byte count and encoding as they are.

### Plain `useState` forms, no form library
**Source:** `web/src/stock/pass-dialog.tsx` (whole file).
**Apply to:** `sign-in.tsx` and the change-password page.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/src/bin/shedkeys.ts` | CLI | CRUD | First command-line target in this package — nothing to model on beyond the bootstrap and hashing reuse noted above |
| `server/src/guard/rate.ts`'s forwarded-address reader | middleware | request-response | No client-address code exists in this codebase; 01-RESEARCH.md Pattern 4 gives a complete, already-scoped sketch to start from |

## Metadata

**Analog search scope:** `server/src/auth/`, `server/src/tickets/`, `server/src/api/`, `server/src/db/`, `server/migrations/`, `server/src/app.ts`, `web/src/stock/`, `web/src/pages/`
**Files scanned:** `reader.ts`, `kiosk-bypass.ts`, `tickets/store.ts`, `respond.ts`, `db/index.ts`, `0002_loans_and_log.sql`, `server.ts`, `app.ts`, `nav-shell.tsx`, `pass-dialog.tsx`
**Pattern extraction date:** 2026-03-04
