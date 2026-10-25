# Phase 2: Roles & Permissions - Pattern Map

**Mapped:** 2026-03-11
**Files analyzed:** 11 (server: 8 new/modified, migration: 1 new; web: 2 new/modified)
**Analogs found:** 10 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/src/guard/index.ts` (NEW) | middleware/utility (chokepoint) | request-response | `server/src/catalogue/boundary.ts` (refuse-alike boundary function) | role-match, structural |
| `server/src/auth/reader.ts` (MODIFIED — `Member`, `readMember`) | middleware | request-response | itself (extend the existing reader) | exact |
| `server/src/sheds/index.ts` (pattern source only, not modified) | model/utility | transform | — (closed-union template for `Role` and `Grant`) | exact |
| `server/migrations/0004_roles_and_grants.sql` (NEW) | migration | batch | `server/migrations/0002_loans_and_log.sql`, `0003_members_and_sessions.sql` | exact |
| `server/src/api/stock.ts` (MODIFIED — call `guard.require`, drop the inline shed parse) | controller | request-response | itself | exact |
| `server/src/api/loans.ts` (MODIFIED — separate checks for lend and adjust) | controller | request-response | itself | exact |
| `server/src/feed/bus.ts` + `server/src/socket/index.ts` (MODIFIED — `GrantsChanged`) | provider | pub-sub | itself | exact |
| `server/src/bin/shedkeys.ts` (MODIFIED — `promote`, `demote`, `grant`, `revoke`) | CLI | CRUD | itself | exact |
| `server/test/route-capability.test.ts` (MODIFIED — coverage extension) | test | request-response | itself | exact |
| `web/src/desk/member-page.tsx` (NEW) | component | CRUD | none close | none close |
| `web/lib/permissions.ts` (NEW, pure) | utility | transform | `web/lib/sign-in-copy.ts` (pure module shape) | role-match |

## Pattern Assignments

### `server/src/guard/index.ts` (NEW — chokepoint, request-response)

**Analog:** `server/src/catalogue/boundary.ts` — one function every handler calls, one refusal shape for every miss.

```ts
export function require(member: Member, grant: Grant, shed: ShedId): Verdict {
  if (member.role === 'steward') return ALLOW;
  return member.grants.has(`${grant}:${shed}`) ? ALLOW : REFUSE;
}
```

**Apply to:** every route that touches a shed. A missing shed id and a forbidden one return the same refusal so the answer never tells a member which sheds exist.

### `server/migrations/0004_roles_and_grants.sql` (NEW — migration, batch)

**Analog:** the two earlier migrations — a header that names every D-number the schema encodes, plus closed `CHECK` lists.

```sql
-- 0004: roles and grants (D-02, D-05). Two fixed roles, no custom ones.
ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('steward', 'member'));
```

### `server/src/api/stock.ts` (MODIFIED — insert `guard.require`)

**Analog:** itself. The handler currently parses the shed id on its own; that parse moves into the guard.

### `server/src/api/loans.ts` (MODIFIED — separate checks)

**Analog:** itself. A lend needs the `lend` grant on the source shed and an adjust needs `adjust`; the two must not share one check.

### `server/src/feed/bus.ts` + `server/src/socket/index.ts` (MODIFIED — `GrantsChanged`)

**Analog:** itself. The bus already carries `stock` frames; a `GrantsChanged` variant joins the same tagged union and the socket handler re-reads the member when one arrives.

```ts
export type Frame =
  | { type: 'stock'; shed: string; count: number }
  | { type: 'grants-changed'; member: string };
```

### `server/src/bin/shedkeys.ts` (MODIFIED)

**Analog:** itself — add four verbs next to the existing ones, each calling the same guard-side functions the HTTP routes use.

### `web/src/desk/member-page.tsx` (NEW — component, CRUD)

No close analog: nothing in `web/src` is a per-member page with an editable grid. See No Analog Found.

### `web/lib/permissions.ts` / `web/lib/access-summary.ts` (NEW, pure)

**Analog:** `web/lib/sign-in-copy.ts` — a pure module with a sibling test file and no React import.

## Shared Patterns

### Closed string union, one parse function, matching SQL `CHECK`

**Source:** `server/src/sheds/index.ts` (`ShedId`, `parseShed`).
**Apply to:** `Role` and `Grant` in `guard/index.ts`.

A value that arrives as free text is parsed once at the edge; nothing downstream compares raw strings.

### Refuse-alike single-variant boundary result

**Source:** `server/src/catalogue/boundary.ts`.
**Apply to:** `guard/index.ts` — a miss is one `REFUSE` value with no reason attached.

### `const found = lookup(); if (!found) return refuse()` call-site idiom, never `throw` on a response

**Source:** `server/src/api/stock.ts:30-44`.
**Apply to:** every handler that now calls `guard.require`.

### One seam, one exported constant — never scattered per handler

**Source:** `server/src/guard/index.ts` (new) and `PURGE_EVERY_MS` in `app.ts`.
**Apply to:** the list of roles and grants; a handler never spells them out.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `web/src/desk/member-page.tsx` | component | CRUD | No member-management page exists in `web`. The nearest cousin is the stock grid, but that shows tool counts, not an editable per-member grant grid. Build fresh against the design tokens |

## Metadata

**Analog search scope:** `server/src/{guard,auth,api,sheds,feed,socket,bin}`, `server/migrations/`, `server/test/`, `web/{src,lib}`
**Files scanned:** ~14 read directly (`boundary.ts`, `reader.ts`, `stock.ts`, `loans.ts`, `bus.ts`, `socket/index.ts`, `shedkeys.ts`, migrations 0002-0003, `route-capability.test.ts`)
**Pattern extraction date:** 2026-03-11
