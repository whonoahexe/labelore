# Phase 2: Shed Inventory Health - Pattern Map

**Mapped:** 2026-02-09
**Files analyzed:** 22 new/modified
**Analogs found:** 14 / 22 (8 with no analog)

> **Check note:** every claim 02-CONTEXT.md makes about the code that already exists was read against
> the files themselves. The three named precedents (`startPurger`, `FIRST_FRAME_WINDOW_MS`, the
> `app.ts` / `server.ts` split) all exist. One needs a caveat: `startPurger` runs on the event loop,
> and the shed readers must not (see the reader assignment and its **caveat**).
>
> **The server has no child-process code at all.** A search for `child_process` under `server/src`
> finds nothing, so the counter-feed bridge is the first one. The same search for `EventEmitter`
> finds nothing either: the feed bus starts from a blank page. Lean on 02-RESEARCH.md for both.

---

## File Classification

### Server — fresh modules

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/src/stock/shed.ts` | model | transform | `server/src/tickets/store.ts` (types + constants block, `index.ts` re-export shape) | role-match |
| `server/src/stock/reader.ts` | service | event-driven / polling | `server/src/tickets/store.ts::startPurger` | **partial — read the caveat** |
| `server/src/stock/counter-feed.ts` | service | child process / transform | **none** — first child process in the repo | no analog |
| `server/src/sheds/index.ts` | model / config | transform | `server/src/tickets/index.ts` + the `store.ts` type block | role-match |
| `server/src/feed/bus.ts` | provider | pub-sub | **none** — no `EventEmitter` fan-out anywhere in the tree | no analog |

### Server — edits

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/src/app.ts` | config / wiring | — | **itself** (extend in place; `createApp` already starts one background timer) | exact |
| `server/src/config.ts` | config | — | **itself** (`readConfig` environment-variable plus safe-default habit) | exact |
| `server/src/socket/index.ts` | route / handler | pub-sub | **itself** (swap the idle loop at lines 44–50 only) | exact |

### Server — specs & sample feeds

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/test/shed-isolation.test.ts` | test (integration) | event-driven | `server/test/socket-ticket-flow.test.ts` | role-match |
| `server/test/stock-socket-flow.test.ts` | test (integration) | request-response | `server/test/socket-ticket-flow.test.ts` | **exact** |
| unit tests in `stock/*.test.ts` / `sheds/*.test.ts` | test (unit) | transform | `server/src/tickets/store.test.ts` (lines 90–210) | exact |
| `server/fixtures/counter-{quiet,steady,over}.json` | fixture | — | `server/fixtures/spike-sample.txt` (path convention only) | partial |
| `server/fixtures/repair-flags.json` | fixture | — | same | partial |

### Web

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `web/src/pages/stock.tsx` (rewrite) | component (page) | streaming / event-driven | `web/src/pages/stock.tsx` (current — for the sign-in, ticket, connect flow **only**) | partial |
| `web/src/main.tsx` (modify) | component (root) | — | itself | exact |
| `web/src/ui/{card,badge,progress,alert,skeleton}.tsx` | component (primitive) | — | **none installed** — produced by the kit CLI, do not hand-write | no analog (generated) |
| `web/src/stock/shed-card.tsx` | component | — | **none** — first real component in the repo | no analog |
| `web/src/nav-shell.tsx` | component | — | **none** | no analog |
| `web/src/stock/use-stock-socket.ts` | hook | streaming | `web/src/pages/stock.tsx::openSocket` (lines 22–58) | role-match |
| `web/src/stock/use-age-label.ts` | hook | transform | **none** | no analog |

### Ops notes

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| systemd unit (server service) | config | — | **none in repo.** The mini PC runs `shedwatch.service`, a **counter-example** (it runs as root) | no analog |
| udev rule for the `counter` reader | config | — | **none in repo.** The only rule on the host is for the label printer | no analog |

---

## Pattern Assignments

### `server/src/stock/reader.ts` (service, event-driven)

**Analog:** `server/src/tickets/store.ts::startPurger` — **partial match, read the caveat.**

**The precedent** (lines 96–112), the "detached interval" 02-CONTEXT.md names, confirmed:

```ts
/** Start a timer that drops expired tickets so abandoned ones cannot pile up. */
export function startPurger(store: TicketStore, everyMs: number): NodeJS.Timeout {
  const timer = setInterval(() => store.purgeExpired(), everyMs);
  // Detached: the timer must never keep the process alive on its own.
  timer.unref();
  return timer;
}
```

> ### ⚠ CAVEAT — do not carry this analog's mechanism over
>
> `startPurger` runs on the **event loop**. 02-RESEARCH.md (finding F3) says each shed reader needs
> its **own worker thread**, because the purger only walks a `Map`, while a reader waits on a counter
> feed that can **hang for good**.
>
> **Copy from this analog:**
> - the shape: a named interval constant, a detached loop, tick, work, repeat
> - the `unref()` line and its comment
> - the comment density: what it does, which failure it stops, which decision ID
>
> **Do NOT copy:**
> - the timer living on the main event loop (give every shed a `Worker`)
> - `setInterval` inside the reader (the worker sleeps between reads itself)
> - returning the timer for cleanup (a hung worker is abandoned, per D-15)

**What the registry side may still copy as is.** The map of latest readings plus a staleness check is
only touches this process's own memory and never reaches a feed, which makes it a genuine
`startPurger` analog; it keeps the plain `setInterval`.

**Shared-state handle** (store.ts lines 48–58), the shape for the readings registry:

```ts
export class TicketStore {
  private readonly entries = new Map<string, TicketMeta>();
  get(id: string): TicketMeta | undefined {
    return this.entries.get(id);
  }
}
```

A class that owns one `Map` and hands out copies is how "shared map held by `createApp`" looks here.
The per-shed snapshot map (the on-connect snapshot, D-18) follows it exactly.

---

### `server/src/stock/shed.ts` (model, transform)

**Analog:** `server/src/tickets/store.ts` type block (lines 14–40) — role-match.

**Union plus metadata pattern** — the shape for `ShedState` (D-09) and `StockFrame`:

```ts
/** What a ticket may be redeemed for. */
export type TicketPurpose = 'socket' | 'download';

/** Metadata kept for every ticket that was handed out. */
export interface TicketMeta {
  /** The member the ticket was issued to. */
  issuedTo: string;
  purpose: TicketPurpose;
  /** Moment, in unix seconds, past which the ticket stops working. */
  expiresAt: number;
}
```

Each variant and each field gets its own doc comment; keep up that habit. `degraded` has to say it
means "reporting, with a repair flag set" and may never collapse into `silent`.

**Timestamps.** Existing wire times are **unix seconds as numbers** (`expiresAt`, `exp`). A frame's
`readAt` should match; no ISO strings, no date library for one field.

**Module re-export pattern** — `server/src/tickets/index.ts` in full:

```ts
// Tickets: store.ts owns the in-memory map, mint.ts the two endpoints.
export { TicketStore, startPurger } from './store.ts';
export type { TicketMeta, TicketPurpose } from './store.ts';
export { mintSocketTicket } from './mint.ts';
```

---

### `server/src/feed/bus.ts` (provider, pub-sub)

**Analog: NONE.** A search for `EventEmitter` or `subscribe(` under `server/src` finds one comment, in
`socket/index.ts` line 45, saying fan-out belongs to a later phase.

**Use instead:** 02-RESEARCH.md § Code Examples, "slow subscriber handling", which settles the
dropped-frame question with a cited rationale.

**Do borrow the tagged-union style from** `server/src/auth/reader.ts`, the repo's only discriminated
union:

```ts
export type Reading =
  | { kind: 'ok'; member: string }
  | { kind: 'missing' };
```

---

### `server/src/socket/index.ts` (route/handler, pub-sub) — MODIFY

**Analog:** itself. **The ticket check is finished — do not rebuild it.**

**The lines to replace** (44–50); everything above line 43 stays:

```ts
  // Authorized. Phase 1 only holds the socket open and echoes nothing;
  // live stock is a later phase's job.
  socket.on('message', () => {
    // intentionally empty
  });
```

Replace with: send the snapshot (D-18), subscribe, forward frames, and on a dropped frame send the
snapshot again, per the research example.

**Keep the named-constant habit** (lines 12–16):

```ts
/** A client that opens a socket and never sends its ticket is cut after this. */
const FIRST_FRAME_WINDOW_MS = 5_000;
```

Every new tunable (`SILENT_AFTER_MS`, `COUNT_POLL_MS`, `FLAG_POLL_MS`) is written the same way, with
a comment naming the **concrete failure** the number prevents.

**Keep the refuse-alike habit** (lines 32–38). A failed read maps to the opaque `silent` state and
detail goes to the server log only:

```ts
  if (!tickets.redeem(ticket, 'socket')) {
    // Unknown, expired, reused and download tickets all land here on purpose.
    refuse(socket, 'ticket not accepted');
    return;
  }
```

---

### `server/src/app.ts` (config/wiring) — MODIFY

**Analog:** itself. Extending it for Phase 2 is expected (02-CONTEXT.md § Canonical References).

**Wiring block** (lines 21–40), where readers start beside the purger:

```ts
export function createApp(config: Config) {
  const db = openDatabase(config);
  const tickets = new TicketStore();
  startPurger(tickets, PURGE_EVERY_MS);
  return { db, tickets, config };
}
```

Readers start here with the same shape: one `startReaders(...)` line and a comment citing the decision.

> **Test caution:** `createApp` is called by tests as well as `server.ts`. If readers start without
> being asked, every test that builds an app would open the counter feeds. Make it an option, or a
> separate `startReaders(app)` call that only `server.ts` makes.

---

### `server/src/config.ts` (config) — MODIFY

**Analog:** itself. Feed paths, poll intervals and the silence deadline land here.

```ts
export function readConfig(env = process.env): Config {
  // Never default to a public address: loopback unless told otherwise.
  const host = env.LENDSHED_HOST ?? '127.0.0.1';
  return { host, port: Number(env.LENDSHED_PORT ?? 4300) };
}
```

---

### `server/test/stock-socket-flow.test.ts` (test, integration)

**Analog:** `server/test/socket-ticket-flow.test.ts` — **exact match.** Same transport, same sign-in,
same helper that mints a ticket and opens the socket.

```ts
const { port, close } = await startTestServer();
const ws = await openSocket(port, await mintTicket(port));
const first = await nextFrame(ws);
expect(first.type).toBe('stock-snapshot');
```

---

### `server/test/shed-isolation.test.ts` (test, integration) — the highest-value test

**Analog:** `socket-ticket-flow.test.ts` for the harness — role-match. **No analog for the fault
injection**: a feed that never answers needs a fake feed directory with one reader pointed at a
named pipe nobody writes to.

---

### `server/fixtures/*.json` (fixture)

**Analog:** `server/fixtures/spike-sample.txt` — path convention only.

```json
{ "shed": "canal", "count": 41, "capacity": 60 }
```

---

### `web/src/pages/stock.tsx` (component, streaming) — REWRITE

**Analog:** its own current contents — **partial.** Only the sign-in, ticket, connect sequence is
proven; keep the call order and drop the rest.

```tsx
const ticket = await fetch('/api/socket-ticket', { method: 'POST', credentials: 'include' });
const ws = new WebSocket(`${origin}/socket`);
ws.onopen = () => ws.send(JSON.stringify({ ticket: (await ticket.json()).ticket }));
```

The sequence (mint, open, send the ticket as the first frame) is proven against the real server. The
React idioms around it are the spike's and are not worth keeping.

---

### `web/src/ui/*.tsx` (component, primitive)

**Analog: NONE — and none is wanted.** These are **generated**, so run the kit CLI and read what it
wrote before composing with it.

---

### `web/src/stock/shed-card.tsx` and `web/src/nav-shell.tsx` (component)

**Analog: NONE.** `web/src` holds one page and the entry file. These are the first components.

---

## Shared Patterns

### Constants named for the failure they prevent
**Source:** `server/src/socket/index.ts:12-16`, `server/src/tickets/store.ts:9-12`
**Apply to:** every new interval, deadline and cap — all of them get a comment saying what breaks without the number.

```ts
/** Without this cap a reused id could keep a ticket alive for good. */
export const TICKET_TTL_SECONDS = 30;
```

### Comments that cite the decision behind them
**Source:** `server/src/tickets/store.ts:1-8`, `server/src/auth/reader.ts:1-6`
**Apply to:** every new module in this phase.

A header comment says what the module owns, then names the D-number or pitfall it exists for.

### Detached timer loop
**Source:** `server/src/tickets/store.ts:96-112`
**Apply to:** `server/src/stock/reader.ts`, `server/src/feed/bus.ts`

A named interval, a detached loop, `unref()` so the loop never holds the process open.

```ts
timer.unref();
```

### Refuse alike — reveal nothing about why
**Source:** `server/src/socket/index.ts:32-38`
**Apply to:** `server/src/socket/index.ts`, `server/src/stock/*.ts`

A refused or failed read looks the same from outside whatever the cause; the cause goes to the log.

```ts
refuse(socket, 'ticket not accepted');
```

### `app.ts` plus a thin `server.ts`
**Source:** `server/src/server.ts:1-9`, `server/src/app.ts:1-10`
**Apply to:** all stock logic — it must be reachable from `vitest` without binding a port.

`server.ts` does four things: read config, build the app, listen, log. Reader start-up belongs in
`app.ts`, never in `server.ts`.

---

## No Analog Found

Files with no close match in the codebase. Planner: use RESEARCH.md and the design tokens, not
inference from existing code.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/src/stock/counter-feed.ts` | service | child process | **Zero child-process code in the repo.** Nothing starts, bounds, kills or collects a child. Use the RESEARCH example (read with a deadline, then terminate and wait). A misread count is the phase's first correctness trap and has no guard in existing code |
| `server/src/feed/bus.ts` | provider | pub-sub | No emitter or subscriber list anywhere in `server/src`. Use the RESEARCH slow-subscriber example plus ARCHITECTURE.md § Component Responsibilities |
| `web/src/stock/shed-card.tsx` | component | — | `web/src` has one page and no `components` folder. First real component. Use the design tokens and the phase's UI notes |
| `web/src/nav-shell.tsx` | component | — | No navigation or status dot exists yet |
| `web/src/stock/use-age-label.ts` | hook | transform | No hooks exist. The UI notes fix the wording thresholds; one shared hook keeps every card and the "last heard" stamp agreeing |
| **systemd unit** | config | — | **First of its kind here.** The mini PC's `shedwatch.service` is a **counter-example** (it runs as root); do not reuse it. Needs a dedicated user, an explicit stop timeout and an environment file for secrets |
| **udev rule** | config | — | **First of its kind here.** The one existing rule is for an unrelated device. The match keys come from the open question in RESEARCH, which a person has to answer on the real reader |

---

## Notes Spanning Several Files

1. **Adding a `Config` field touches four files.** `Config` is built as an object literal in
   `socket-ticket-flow.test.ts`, `download-ticket.test.ts`, `passcode-check.test.ts` and
   `config.ts`'s own test. Each fails to compile on a new field, which is the wanted behaviour, so plan
   time for it.

2. **`createApp` is called by tests.** Readers must be opt-in, or every test that builds an app opens
   the real feeds. The same seam is what `shed-isolation.test.ts` needs.

3. **Two habits clash with what the research found, and the research takes precedence:**
   - the purger's event-loop timer versus a worker thread per shed
   - "refuse alike" versus D-10's required reason line (a locked decision, scoped to `degraded` only)

   Say so **in code comments** where each one diverges, in the usual decision-citing style.

4. **Nothing on the web side is a proven pattern.** `web/README.md` warns that the bundler version
   differs from what most examples assume. Every web task starts by reading the installed docs.

---

## Metadata

**Analog search scope:** `server/src/**` (12 files), `server/test/**` (4 files), `web/src/**`,
`web/README.md`, plus searches for `child_process`, `Worker`, `EventEmitter` and `*.service`.
**Files scanned:** 22 read in full; 5 targeted searches.
**Pattern extraction date:** 2026-02-09
**Project instruction files:** no root `CLAUDE.md`; no `.claude/skills/`.
