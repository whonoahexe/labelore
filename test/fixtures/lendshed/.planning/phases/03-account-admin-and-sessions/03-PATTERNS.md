# Phase 3: Account Admin & Sessions - Pattern Map

**Mapped:** 2026-03-19
**Files analyzed:** 10 (files to be created or modified per CONTEXT.md and RESEARCH.md)
**Analogs found:** 8 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/src/guard/store.ts` (+createMember, +resetPassword, +disableMember, +deleteMember, +listSessions) | service/model | CRUD (transactional) | same file, `setRole` (self, extended) | exact |
| `server/src/api/desk.ts` (+handlers) | controller | request-response | same file, `setRoleHandler` (self, extended) | exact |
| `server/src/feed/identity-bus.ts` (+SessionRevoked variant) | event-driven / model | pub-sub | same file, `GrantsChanged` (self, extended) | exact |
| `server/src/socket/index.ts` (the bus subscription's message switch) | controller (socket) | streaming/event-driven | same file, the existing `GrantsChanged` case + the close code used by `refuse()` | exact |
| `server/src/loans/log.ts` (+`memberTarget` encoder) | model/utility | transform | same file, `LogAction` + `record` (self, extended) | exact |
| `server/src/auth/session.ts` (+listFor) | service | request-response | same file, `signOut` (self, extended) | exact |
| `web/src/desk/members-page.tsx` / `web/src/desk/member-page.tsx` | component/page | request-response | `web/src/desk/member-page.tsx` (self, extended) | exact |
| `web/src/desk/confirm-dialog.tsx` (NEW) | component | request-response | `web/src/stock/pass-dialog.tsx` (dialog shell) | role-match |
| `web/lib/log-target.ts` (new) | utility | transform | `web/lib/permissions.ts` (pure-module shape) | role-match |
| `web/lib/device-label.ts` (new) | utility | transform | `web/lib/permissions.ts` (pure-module shape) | role-match |

## Pattern Assignments

### `server/src/guard/store.ts` (service/model, CRUD)

**Analog:** same file, `setRole` and its attempt wrapper.

One transaction per change, retried a bounded number of times when the file is busy, with side effects only after the commit.

```ts
export function setRole(db: Db, id: number, role: Role): Outcome {
  return withRetry(db, () => {
    db.run('UPDATE members SET role = ? WHERE id = ?', [role, id]);
    return { ok: true };
  });
}
```

### `server/src/api/desk.ts` (controller, request-response)

**Analog:** same file, `setRoleHandler` and `updateGrantHandler`. The gate comes first: a non-steward is refused before any parsing happens.

### `server/src/feed/identity-bus.ts` (event-driven/model, pub-sub)

**Analog:** same file, the `GrantsChanged` variant. `SessionRevoked` joins the same tagged union, and a send happens only after the database write has committed.

```ts
export type IdentityEvent =
  | { type: 'grants-changed'; member: string }
  | { type: 'session-revoked'; member: string };
```

### `server/src/socket/index.ts` (controller/socket, streaming)

**Analog:** the existing `grants-changed` case in the same switch. A `session-revoked` event for the connected member closes the socket with the policy code that `refuse()` already uses.

### `server/src/loans/log.ts` (model/utility, transform)

**Analog:** same file. A new log action for each admin change, recorded by the existing `record` function after the commit.

### `server/src/auth/session.ts` (service, request-response)

**Analog:** same file, `signOut`. Listing a member's sessions reads the same table that `signOut` deletes from.

### `web/src/desk/confirm-dialog.tsx` (component, request-response)

**Analog:** `web/src/stock/pass-dialog.tsx` for the dialog shell only. The wording of a destructive confirmation is fixed (D-07) and is never composed at a call site.

## Shared Patterns

### Transactional write with a bounded retry when the file is busy

**Source:** `server/src/guard/store.ts:60-95` (`withRetry`).
**Apply to:** every new mutation in `store.ts`, with no second retry loop elsewhere.

### Post-commit-only side effects (bus send, session purge, log write)

**Source:** `server/src/guard/store.ts:97-120`.
**Apply to:** each admin handler — the effect fires once the transaction returns `ok`, never before.

### Steward gate first, parse second

**Source:** `server/src/api/desk.ts:22-40`.
**Apply to:** all new handlers in `desk.ts`.

```ts
const gate = requireSteward(member);
if (gate !== ALLOW) return refuse();
const body = parseBody(req);
```

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `web/lib/log-target.ts` (new) | utility | transform | Nothing encodes a combined string today — the closest is the pure-module shape of `permissions.ts`, not its content; the encode and decode round trip is new here. |
| `web/lib/device-label.ts` (new) | utility | transform | No browser-name parsing exists anywhere in this repo (and `web/package.json` carries no library for it); only the module shape (pure, tested) has prior art. |

## Metadata

**Analog search scope:** `server/src/guard/`, `server/src/api/`, `server/src/feed/`, `server/src/socket/`, `server/src/loans/`, `server/src/auth/`, `web/src/desk/`, `web/lib/`
**Files scanned:** ~12 read directly (full or targeted ranges); a few more named by CONTEXT.md and RESEARCH.md citations and checked against the phase requirements
**Pattern extraction date:** 2026-03-19
