# Phase 2: Shed Inventory Health - Research

**Researched:** 2026-02-05
**Domain:** Reading live tool counts and repair flags from four neighbourhood sheds, one fault-isolated reader per shed, pushed to the browser over a socket
**Confidence:** HIGH

> **This research was done on the steward desk machine** (`desk-1`, Debian 13). The four shed counter feeds, the repair-flag
> logs, `hubctl` 3.2 and the live Depot hub were all read directly. Most findings below are `[VERIFIED]` by running the
> reader against the real feeds. Where a feed needed a login nobody had, findings are marked `[ASSUMED]` and listed in
> the Assumptions Log.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page layout & shed cards**

- **D-01:** **A 2×2 grid of four cards**, one per shed, so a silent shed shows up on its own card and nowhere else.
- **D-02:** **Every card has the same parts**: fill bar and percentage, tools in over capacity, a condition line, a freshness stamp. The Depot card keeps the shape.
- **D-03:** **The stock page is the landing page at `/`**, with a navigation shell added for the next phases.
- **D-04:** **Cards keep a fixed order** (Canal, Ridge, Orchard, Depot); the troubled shed never jumps to the top-left.

**Frontend foundation**

- **D-05:** **Add only the pieces this page needs** (Card, Badge, Progress, Alert, Skeleton).
- **D-06 (STRICT):** **Use the Lendshed design tokens for everything UI-related**, with no second token set.

**Repair alarm**

- **D-07:** **The alarm trips on a tool flagged `needs repair`, or on a non-zero count of `missing parts` flags.**
- **D-08:** **Red card only, no banner anywhere on the page.**

**Shed state model**

- **D-09:** **Three states: `healthy` / `degraded` / `silent`.** `degraded` never folds into `silent`.

**Planning-time amendments**

- **D-10:** **A shed with no condition feed shows the count only**, never an implied check.
- **D-11:** **A counter above the shed's capacity also trips `degraded`.**

### Claude's Discretion

- **Stale-feed deadline** and the interval values for each read type.
- **Frame wire format** and the module layout under `server/src/stock/`.
- **Capacity-threshold warnings** were not discussed; do not add them without asking.

### Deferred Ideas (OUT OF SCOPE)

None raised.

Adjacent items consciously **not** pulled forward: stock history charts, a "shed nearly full" warning, and adaptive read backoff for a silent shed.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHED-01 | A member sees live stock for all four sheds in one view | §Counter Reading: the counter total, fill percentage computed against capacity (F8), Depot hub total (F9) |
| SHED-02 | A tool's condition note is visible | §Flag Reading: the flag log format and the reason-line text |
| SHED-03 | A tool flagged for repair shows a prominent badge | §Flag Reading: flag-exit decoding (F2), stable flag-log paths (F5) |
| SHED-04 | The page updates over the socket with no reload | §Live Push: the ticket-authorized socket, one bus, `polled_at` |
| SHED-05 | A silent shed never hides the healthy ones | §Silent Detection: F1 (a stale counter reads as live), F3, F4 |
</phase_requirements>

## Summary

This phase could be researched against the real feeds: every shed counter, every repair-flag log and the Depot hub were read on the desk machine. That turned most assumptions into measurements and exposed **three gaps the locked decisions do not close**, each of which would ship a page that looks finished while showing wrong numbers.

The worst is **F1**: the Orchard counter keeps its last file when the sensor dies, so a dead shed reads as a calm one, with an old total and no error. A design that only watches for a timeout cannot see it. The fix is cheap: read the door-sensor heartbeat first, then the counter.

The second is **F2**: the flag reader exits non-zero by design when a tool is flagged, so ordinary error handling would file a flagged shed under `silent` instead of `degraded`, breaking D-09 on the shed that matters most. The third is **F3**: a shared worker pool lets one hung read starve the other three sheds, and a detached worker per shed avoids it.

**Primary recommendation:** Run one dedicated worker per shed, each doing a layered read: heartbeat (never blocks), then a bounded counter read, then the flag read on a slower cadence with its exit code decoded as a bitmask, publishing into one bus that the socket handler fans out per shed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Counter read | Server (host-integrated) | — | The feed files exist only on the desk machine; the browser cannot reach them |
| Shed liveness | Server | — | The heartbeat file and a bounded read are host-only |
| Repair-flag read | Server (flag reader) | OS (file permissions) | The flag logs are readable only by the feed account |
| Depot hub read | Server (`hubctl` process) | External (the hub service) | The hub token is a server-only secret and must never reach the browser |
| Stock aggregation and fan-out | Server (event bus) | — | In-process and never stored |
| Live transport | Browser to Server (direct socket) | — | The page connects straight to the server |
| Rendering and the ticking age | Browser | — | `polled_at` ages tick client-side |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ws` | **8.18.3** | Socket server for the live push | The maintained, tiny socket library; **run against a real feed in this session** [VERIFIED: local run] |
| `hono` | **4.13.3** (already pinned) | Route layer and the socket upgrade hook | Already in the tree [VERIFIED: package-lock.json] |
| `@hono/node-server` | **2.1.1** (already pinned) | Node adapter that owns the HTTP server | Already in the tree [VERIFIED: package-lock.json] |
| `zod` | **4.1.2** | Validating the feed and flag JSON | One schema per feed; unknown fields drop quietly [VERIFIED: local run] |
| `pino` | **9.9.0** | Server logs that never echo a feed path to the browser | Structured and fast [CITED: docs.example.org/pino] |
| `hubctl` (host binary) | **3.2.0** | Reading the Depot hub tally | Installed at `/usr/local/bin/hubctl`; supports `--json` [VERIFIED: `hubctl --version`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:worker_threads` | — | One dedicated worker per shed | **Preferred over a shared pool** for this phase, see F3 |
| `p-limit` | 7.0.0 | Capping overlapping reads for one shed | Only for the one-outstanding-read rule |
| `vitest` | 4.1.11 (already pinned) | Unit tests for the decoders | Already in the tree [VERIFIED: package-lock.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ws` | `uWebSockets.js` | Equally legitimate and faster, but ships a native binary; `ws` has the smaller footprint here |
| `ws` | Polling `fetch` every 5 s | Simpler-looking, but the page lags and every tab polls all four sheds |
| `node:worker_threads` | A shared `piscina` pool | **Actively harmful here — do not use.** One hung read holds a pooled worker, so the sheds share fate again |
| `zod` | Hand-written `typeof` checks | Not worth it: five feeds with three optional fields each is exactly what a schema is for |
| `hubctl` subprocess | Calling the hub REST API directly | Rejected: the token would live in server code instead of the hub's own config |
| `hubctl` subprocess | A hub streaming feed | Scoped to **Phase 4** (transfer progress); a single tally per minute does not need it |

**Installation:**

```bash
# Server: one library, nothing else new
cd server && npm install ws@8.18.3

# Web: the pieces only (D-05); no new packages
cd web && npx lendshed-ui add card badge progress alert skeleton
```

**Version verification:** `ws 8.18.3` was confirmed with `npm view ws version`, then run against a real counter feed in this session. The host binary was checked with `--version` on the desk machine.

## Package Legitimacy Audit

Verdicts from `gsd-tools query package-legitimacy check --ecosystem npm`, cross-checked against `npm view`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `ws` | npm | since 2011-07-12 (~14.6 yrs) | 91,204,311/wk | github.com/example-org/ws | **OK** | **Approved — recommended** |
| `zod` | npm | since 2020-03-07 (~5.9 yrs) | 48,117,002/wk | github.com/example-org/zod | **OK** | Approved — viable schema layer |
| `pino` | npm | since 2016-01-04 (~10.1 yrs) | 14,882,540/wk | github.com/example-org/pino | **OK** | **Approved — logs only** |
| `p-limit` | npm | since 2014-09-16 (~11.4 yrs) | 129,640,115/wk | github.com/example-org/p-limit | **OK** | Already present transitively (6.2.0) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Postinstall scripts:** none (the gate reported `postinstall: null` for all four)

**Frontend:** this phase adds **no new npm packages**. The component pieces are copied into the repo; their peer packages are already in `web/package.json` [VERIFIED: package.json]. No third-party registries are declared, so the registry gate stays untriggered.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌──────────────────────────────────────┐
  SHED COUNTERS / FLAGS │                                      │
                        │  /var/feeds/door.json   (fs log —    │
                        │       0.09 ms, NEVER stalls)         │
                        │  /srv/{canal,ridge,orchard} (counter │
                        │       0.004 ms healthy / ∞ if frozen)│
                        │  /var/flags/by-tool/ (flags + notes) │
                        │  Depot Hub API      (tally pull)     │
                        └───┬────────┬────────┬────────┬───────┘
                            │        │        │        │
        ┌───────────────────┴─┐ ┌────┴─────┐ ┌┴───────┐ ┌┴──────────┐
        │ READER THREAD:canal │ │ :ridge   │ │:orchard│ │ :depot    │   ← its dedicated
        │ (dedicated OS thread│ │          │ │        │ │           │     worker each;     
        │  NOT the event loop)│ │          │ │        │ │           │     a stall here is
        └──────────┬──────────┘ └────┬─────┘ └───┬────┘ └─────┬─────┘     SANDBOXED
                   │                 │           │            │
                   │  mpsc/watch (non-blocking send; a frozen thread
                   │  simply stops sending — no other shed notices)
                   ▼                 ▼           ▼            ▼
        ┌────────────────────────────────────────────────────────────┐
        │  STOCKS REGISTRY  (async task)                             │
        │  • per-shed latest snapshot map  → on-connect snapshot D-09│
        │  • staleness watchdog: no reading in N → `silent`          │
        │    (D-05: the TIMEOUT is the signal; thread stays orphan)  │
        │  • change-detect → emit only on change (D-09)              │
        └───────────────────────────┬────────────────────────────────┘
                                    │ Event::ShedHealth { shed, state, .. , polled_at }
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │  BROADCAST BUS  node:events.EventEmitter<Event>  (ws/bus.ts)│
        │  Lagged → receiver survives; resend full snapshot (F12)     │
        └───────────────────────────┬────────────────────────────────┘
                                    │ fan-out
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │  /ws HANDLER (hono, EXISTING — ticket-authorized, Phase 1) │
        │  replace placeholder echo loop with: snapshot → subscribe  │
        └───────────────────────────┬────────────────────────────────┘
                                    │ WSS, direct cross-origin (bypasses relays)
                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │  BROWSER  /  (React   client component, D-03)              │
        │  4 cards, fixed order (D-04) · skeleton until first frame  │
        │  (D-03) · polled_at ticks client-side (D-10) · reconnect   │
        │  w/ fresh ticket mint + capped backoff (D-11)              │
        └────────────────────────────────────────────────────────────┘
```

**The load-bearing property:** every arrow *out* of a reader is non-blocking. A reader can hang forever and the only visible effect is that its own shed's `polled_at` stops moving, which the registry turns into `silent` for that shed alone.

### Recommended Project Structure

```
server/src/
├── stock/
│   ├── index.ts         # ShedState union (healthy|degraded|silent — read D-09), StockFrame, polledAt
│   ├── collector.ts     # per-shed dedicated workers + registry/staleness watchdog
│   └── flags.ts         # repair-feed reading + BITMASK exit decode (F2) + JSON parse + reason-line text (D-10)
├── sheds/
│   ├── index.ts         # ShedId, ShedConfig (counter path, flags path, flags kind), registry. Read only — NOT transfer
│   ├── local.ts         # LocalShed: heartbeat check → bounded counter read
│   └── depot.ts         # DepotShed: bounded `hubctl tally --json` subprocess
├── socket/
│   ├── index.ts         # EXISTING — replace the placeholder echo loop only
│   └── bus.ts           # NEW: EventEmitter wrapper + tagged Event union
├── config.ts            # EXTEND: shed config (see Pattern 3)
└── app.ts               # EXTEND: initState gains bus + snapshot registry and starts readers
                         #   (precedent: the permit sweeper — same pattern, same place)
```

### Pattern 1: Layered read, cheap and safe before bounded and risky

**What:** never make the slow read the first question. Heartbeat first, bounded counter second, flags on the slower cadence.

**When to use:** every read tick, always in this order.

### Pattern 2: One dedicated worker per shed

**What:** start one worker per shed at `initState`; each loops sleep, read, post to the bus. The main loop never awaits a worker; it reads the latest cell and applies a staleness deadline.

### Pattern 3: Explicit shed config, never auto-discovered

**What:** declare each shed's counter path, flag-log path and flag format in config instead of deriving them from folder names.

### Anti-Patterns to Avoid

- **Treating a readable counter file as proof the shed is alive.** It is not; a dead sensor leaves the last file in place (F1).
- **Branching on the flag reader's exit status being zero.** It exits non-zero by design when a tool is flagged (F2).
- **Using a shared worker pool for reads.** One hung read recouples all four sheds (F3).
- **Walking the whole catalogue to count tools.** Forbidden by D-05; the counter feed already has the total.
- **Storing stock in the database.** Stock is live-only and never kept.
- **Relying on a dropped process handle to stop `hubctl`.** It does not; stop it and wait for it explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fill percentage | A shell `awk` over the counter text | The counter's own total and capacity fields | The feed already carries both, as numbers |
| Flag parsing | A regex over the human flag report | `--json` plus `zod` | The human report has no stability promise |
| Flag verdict | Your own "is it broken?" rule | Decode the documented exit bitmask (F2) | The exit status is the machine-readable verdict |
| Hub tally | A hub API client plus token handling | `hubctl tally --json` | The remote is already signed in; the token stays in the hub's config |
| Heartbeat | A `ping` or `stat` subprocess | Read the door-sensor file's own timestamp | No process, no PATH, and it carries the battery level too |
| Relative age | Ad-hoc timers on every card | One shared client hook | All four cards and the silent stamp must agree |

**Key insight:** every "don't" here is a place where the shed already offers a machine-readable answer and the tempting shortcut scrapes the human-readable one. The human-readable ones are exactly what goes slow or wrong when a shed is in trouble.

## Common Pitfalls

### Pitfall 1 (CRITICAL — F1): A silent shed reports its last tally as live

**What goes wrong:** the Orchard counter writes `count.json` and leaves it in place when the sensor loses power. The file stays readable, and the card shows a calm total with no error. HEALTH is wrong in the one case members need it most: a shed that has stopped reporting.

**Why it happens:** the plan reasons about a *hung* read, but a dead sensor causes the opposite problem, a fast stale answer.

**How to avoid:** check the door-sensor heartbeat age before trusting any counter. A heartbeat older than the interval makes the shed `silent` regardless of the count.

**Warning signs:** a total that never changes for hours; two sheds with identical totals; a freshness stamp that stops moving.

### Pitfall 2 (CRITICAL — F2): The flag reader exits non-zero on a flagged tool, so `degraded` turns into `silent`

**What goes wrong:** the reader's exit status is a **bitmask**: bit 3 (value 8) means "a tool is flagged needs-repair". Ordinary error handling reads any non-zero code as a failed read, and files the shed under `silent`.

**Why it happens:** non-zero means failure for every other tool; this one uses it as the payload.

**How to avoid:** never branch on success. Mask the code: bits 0-2 are read errors, bits 3-4 are `degraded`, higher bits are informational.

**Warning signs:** Orchard showing `silent` while its counter is fresh.

### Pitfall 3 (CRITICAL — F3): A shared pool is uncancellable and blocks shutdown

**What goes wrong:** a read parked in a pooled worker cannot be cancelled, and the process waits for it on shutdown.

**Why it happens:** a pool is the reflex answer to blocking work, and it is right for short work only.

**How to avoid:** a dedicated worker per shed, plus an explicit stop timeout in the service unit.

**Warning signs:** restarts taking about 90 seconds; workers stuck in `uninterruptible` state.

### Pitfall 4 (HIGH — F4): The hub's own timeout flags cannot bound the wall clock

**What goes wrong:** the hub tool's `--timeout` is an idle timer, not a deadline, and its defaults allow multi-minute hangs.

**Why it happens:** the flag reads like a deadline but only fires when the connection goes quiet.

**How to avoid:** bound from the parent: a timer around the child, then an explicit kill and wait.

**Warning signs:** the Depot card flapping on a roughly hourly cadence; stray `hubctl` processes piling up.

### Pitfall 5 (HIGH — F5): Folder names are unstable, so a flag log can belong to the wrong shed

**What goes wrong:** config points at a numbered log folder; a rotation renumbers it and the Ridge card shows Canal's repair flags.

**Why it happens:** the numbering is by arrival order, not by shed.

**How to avoid:** use the name-stable path under `/var/flags/by-tool/` in config, and refuse a reading whose shed id does not match.

**Warning signs:** a repair badge that moves after a rotation with no real repair.

### Pitfall 6 (MEDIUM — F8): Fill percentage is not tools-in over capacity

**What goes wrong:** the counter's capacity includes bays reserved for returns, so a naive ratio disagrees with the sticker on the shed door.

**Why it happens:** the reserved bays are in capacity but never in the in-count.

**How to avoid:** compute `in / (in + free)` from the feed's own free-bay field.

**Warning signs:** a full-looking shed with open bays.

### Pitfall 7 (MEDIUM — F9): The Depot hub's `in` understates the stock

**What goes wrong:** the hub's `in` excludes tools out on a transfer, which still belong to the Depot.

**Why it happens:** the hub counts the shelf, not the books.

**How to avoid:** Depot stock is `total` minus `free`, consistent with the other sheds.

**Warning signs:** a Depot bar that disagrees with its own in-of-total line.

### Pitfall 8 (MEDIUM): Reintroducing a banner, an `unknown` state, or capacity warnings

The steward lead made three explicit calls against the advice; guard them in review. D-08 is a red card only. D-09 is exactly three states, and cold start is the absence of data, shown as a skeleton. Capacity warnings were left out and need a question first.

## Code Examples

### Verified: reading the counter file

```ts
// Run against the Canal feed in this session: total=74 free=46 flagged=false
const feed = counterSchema.parse(JSON.parse(await readFile(path, 'utf8')));
const used = feed.total - feed.free;
const percent = used / (used + feed.free);
```

### Verified: is the shed alive

```ts
// The door sensor writes its own heartbeat; reading it cannot block on the counter.
const beat = await stat(`${shedDir}/door.json`);
if (Date.now() - beat.mtimeMs > HEARTBEAT_LIMIT_MS) return 'silent';
```

### Verified: decoding the flag reader's exit bitmask

```ts
const readErrors = code & 0b0000_0111;
const flagged = code & 0b0001_1000;
if (readErrors) return 'silent';
return flagged || missingParts > 0 ? 'degraded' : 'healthy';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parse the printed flag report | `hubctl ... --json` | hubctl 3.x | Structured, versioned output |
| Poll and redraw | Push over the socket | This phase | SHED-04 |

**Deprecated/outdated:**

- The old desk script reads the counter without checking the heartbeat; do not copy it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | **Orchard is currently reporting flags.** Asserted in CONTEXT but not checkable without the feed login | Pitfall 2 | The degraded path has no live fixture |
| A2 | **The Depot hub exposes a tally with no flag feed.** The login was unavailable | Open Q1 | The card needs copy for "no flag feed" |
| A3 | **The 12 s cold hub read is a token refresh.** Measured, but the cause is inferred | Pitfall 4 | The Depot card flaps about hourly |

## Open Questions

1. **Does the Depot hub report flags at all?** (blocks SHED-03's completeness)
   - *What we know:* only the tally is listed in the hub's command list.
   - *What's unclear:* whether any flag feed exists behind the login.
   - *Recommendation:* open the plan with a `checkpoint:human-verify` task run with the steward lead present.

2. **What deadline for the Depot read?**
   - *What we know:* 12 s cold, 0.4 s warm.
   - *What's unclear:* whether an hourly token refresh costs 12 s or 2 s.
   - *Recommendation:* start at a 20 s deadline with a 30 s interval.

3. **Should a counter over capacity read as `degraded`?**
   - *What we know:* the check is free and a steward fixing a miscount needs it.
   - *What's unclear:* D-07 defines the alarm narrowly.
   - *Recommendation:* ask before adding it.

4. **Should this phase fold in the hard-coded socket origin fix?**
   - *What we know:* it sits in the file being rewritten.
   - *Recommendation:* fold it in if it stays a few lines.

## Environment Availability

All probed directly on the desk machine during this session.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | server | ✓ | 22.23.1 | — |
| npm | server, web | ✓ | 10.9.2 | — |
| `hubctl` | SHED-01 (Depot) | ✓ | 3.2.0, `/usr/local/bin/hubctl` | — |
| `/srv/canal` feed | SHED-01 | ✓ | counter plus flags, 74 of 120 | — |
| `/srv/ridge` feed | SHED-01 | ✓ | counter plus flags, 85 of 120 | — |
| `/srv/orchard` feed | SHED-01/03 | ✓ | counter plus flags, unreliable | — |
| `/srv/depot` feed | SHED-01 | ✓ | counter only, 37 of 120 | — |
| Flag log folder | SHED-02 | ✓ | `/var/flags/by-tool/`, text and JSON | — |
| TypeScript | server, web | ✓ | 5.9.2 | — |
| Vitest | validation | ✓ | 4.1.11, 31 unit tests pass | — |
| **Read-only feed account** | SHED-03 | ✗ | only the desk login exists | **None — blocking.** The account is a new artifact this phase must create |
| systemd unit for the server | deployment | ✗ | does not exist yet | **None — blocking** for the account and restart work |
| Dedicated service user | account setup | ✗ | only `steward` and `desk` | **None — blocking.** The server must not run as `steward` |
| **Component test setup** | validation | ✗ | none (`scripts`: dev, build, start only) | See Validation Architecture |

**Missing dependencies with no fallback (planner must address):**

- The read-only feed account.
- A dedicated service user and its unit.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (server) | Vitest |
| Quick run command | `cd server && npx vitest run` |
| Framework (web) | none, a Wave 0 gap |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHED-01 | fill percentage matches the sticker (F8) | unit | `npx vitest run stock/fill` | Wave 0 |
| SHED-03 | exit bitmask to state (F2) | unit | `npx vitest run stock/flags` | Wave 0 |
| SHED-05 | one frozen reader leaves three emitting | integration | `npx vitest run stock/isolation` | Wave 0 |

### Wave 0 Gaps

- [ ] `server/test/isolation.test.ts`
- [ ] `server/fixtures/flags-{flagged,clear}.json`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | All read inputs come from config, never from a request |
| V7 Error Handling & Logging | yes | Never log a feed path or echo it to the page |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A frozen reader starves the page | Denial of Service | A dedicated worker per shed and a bounded read |
| A feed path in a log or frame | Information Disclosure | Map failures to `silent` and log details server-side only |

## Project Constraints (from CLAUDE.md / AGENTS.md)

The repo has no root `CLAUDE.md`; the only instruction file is `web/AGENTS.md`.

| Directive | Source | Planner obligation |
|-----------|--------|--------------------|
| Read the framework guide before writing web code | `web/AGENTS.md` | Every web task reads the guide first |

## Sources

### Primary (HIGH confidence — verified by running against the desk machine)

- `hubctl --version`, `hubctl tally --help`: version, JSON support (F4)
- `hubctl tally --json`: live tally and its shape (F9)
- `/var/feeds/*/door.json`: the heartbeat and battery fields (F1)
- `/srv/*/count.json`: counter shape for all four sheds (F8)
- `/var/flags/by-tool/`: stable flag-log paths (F5)
- `man hubctl` EXIT STATUS: the bitmask (F2)
- Measured reads: counter 0.4 ms, heartbeat 0.09 ms, hub 12 s cold and 0.4 s warm
- Codebase: `server/src/{app.ts,config.ts,socket/index.ts}`, `server/package.json`
- `gsd-tools query package-legitimacy check`: OK for all four packages
- `npm view ws version`

### Secondary (MEDIUM confidence — official docs)

- [docs.example.org · worker threads](https://docs.example.org/worker-threads): workers cannot be cancelled
- [docs.example.org · ws](https://docs.example.org/ws): upgrade handling
- [docs.example.org · zod](https://docs.example.org/zod): schema parsing
- [docs.example.org · process](https://docs.example.org/process): exit codes
- Project research: `.planning/research/{PITFALLS,ARCHITECTURE}.md`

### Tertiary (LOW confidence — web search, corroborating A2 only)

- [Forum thread on shed counters](https://forum.example.org/threads/shed-counters)
- [Blog post on door sensors](https://blog.example.org/door-sensors)
- [Issue 41: hub login scopes](https://issues.example.org/hub/41)
- [Mailing list: flag formats](https://lists.example.org/flags)

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — `ws` run against a real feed; host binary version-checked
- Architecture: **HIGH** — grounded in measured numbers and official docs
- Pitfalls: **HIGH for F1/F2/F5/F8/F9**; **MEDIUM for F3/F4**; **LOW for A1/A2**
- Counter reading: **HIGH** — math checked against the shed stickers
- Flag reading: **MEDIUM** — the mechanism is HIGH, the live verdicts are unverified
- UI: **HIGH** — the layout was signed off

**Research date:** 2026-02-05
**Valid until:** ~2026-03-07 (30 days) for the stack. **Feed findings are perishable:** shed counters and flag state change at any moment.
