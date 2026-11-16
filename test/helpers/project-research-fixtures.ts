// Hand-written synthetic research files (quick-261024-k8u) for a made-up project, Lendshed (the tool
// library in test/fixtures/lendshed). The DRIFT_* files reproduce the shapes a project's
// `.planning/research/` drifts into; the TEMPLATE_* files hold the canonical template shape (a decision
// headline, layered tables, numbered pitfalls, a prose build order). Both are made up: every name,
// number and phrase in them is invented and no real research is read.

export const DRIFT_SUMMARY = `# Project Research Summary

**Project:** Lendshed, milestone v2.0 Vault Ingest
**Domain:** Loan ledger ingest and review
**Researched:** 2026-07-30
**Confidence:** MEDIUM-HIGH (several primary sources)

## Executive Summary

The vault ingest rebuild is a streaming pipeline: read once, tee to the hasher and the writer, then fsync before anything is acknowledged. Everything else hangs off that single rule.

A second paragraph about risk.

## Key Findings

### Recommended Stack

Rust with axum, because the existing portal already runs there.

### Architecture Approach

One executor owns every write to the vault.

## Implications for Roadmap

**Entry gate (before any phase writes to the vault): the vault is mounted read-write; a backup exists.**

A plain paragraph that explains the suggested order in one go.

### Phase 1: Foundations

**Rationale:** Nothing else can start without the schema.
**Delivers:** \`IngestExecutor\` (single read, tee, hash); manifest schema; the \`fsync\` barrier (data and directory)
**Avoids:** Pitfall 17.
**Research flags:** None required - standard patterns.

### Phase 2: Ingest (parallel with Phase 1)

**Rationale:** The executor only needs the schema's types.
**Delivers:**
- Streaming upload
- Resume tokens
- Duplicate detection (by hash)
**Gate:** a; b, plus c (not; this).
**Avoids:** Pitfalls #1, #3, #4 (path handling)

### Phase 3: Review

**Rationale:** Needs the manifest.
**Delivers:** Review queue
**Uses:** axum extractors
**Implements:** the review board
**Addresses:** REV-01
**Keeps:** the old export working
This phase can overlap Phase 2 once the queue exists.

### Ordering Rationale

- **Schema first:** every other phase reads it.
- The executor before the UI.

### Research Flags

Phases needing deeper research:
- **Phase 2:** the resume protocol needs a spike.

Phases with standard patterns (skip research):
- **Phase 1:** well documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Already in production |
| Features | MEDIUM | Needs a user pass |
| Architecture | MEDIUM-HIGH | One open question |
| Pitfalls | LOW-MEDIUM | Few sources |

**Overall confidence: MEDIUM-HIGH** - the unknowns are all in ingest.

### Gaps to Address

- **Resume protocol:** nothing in the wild matches our hash scheme.
- **Backup cadence:** unspecified by the operator.
`;

export const DRIFT_STACK = `# Stack Research

**Researched:** 2026-07-30
**Confidence:** HIGH

## Headline

**Rust and axum, kept as they are, over a rewrite in Go.**

The portal already runs there and the ingest path wants no garbage collector:

1. **Streaming without copies.** Rust lets the tee stay zero-copy.
2. **One toolchain.** The portal and the ingest share it.

## Recommended Stack

### Core (the runtime)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Rust | 1.90 | Language | Already used |
| axum | 0.8.9 | HTTP | Already used |

### Storage (what holds the bytes)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| rustix | 1.1.4 | statvfs | Maintained |

### Tooling

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| cargo-nextest | 0.9 | Tests | Always |

### Observability

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| tracing | 0.1 | Logs | Structured |

### Misc

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| serde | 1.0 | Wire format | Standard |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Runtime | Rust | Go | Garbage collector pauses in the tee |
| Runtime | Rust | Node | Copies every chunk |
| HTTP | axum | actix-web | Two frameworks in one portal |
`;

export const DRIFT_FEATURES = `# Feature Research

**Researched:** 2026-07-30
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Things a vault must do.

#### Projects

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create a project | Everything lives in one | LOW | Trivial |
| Archive a project | Cleanup | MEDIUM-HIGH | Needs a tombstone |

#### Ingest

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Upload a file | It is the point | HIGH | Streaming |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Resume after a crash | Nobody else does | HIGH | Needs tokens |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-delete after sync | Saves space | Loses the only copy | Verify, then ask |

## Competitor Feature Analysis

| Feature | Lendhub (hosted review) | Syncbox (sync) | Peerlink (peer to peer) | Our approach |
|---------|--------------------------|----------------|------------------------|--------------|
| Review | Core | N/A | N/A | A queue |
| Resume | Partial | Yes | Yes | Tokens |

The matrix says the gap is verification, not transfer.
`;

export const DRIFT_ARCHITECTURE = `# Architecture Research

**Researched:** 2026-07-30
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

\`\`\`
+---------+     +----------+
| Browser | --> | Executor |
+---------+     +----------+
\`\`\`

## Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| Executor | Owns writes |
| Manifest | Records hashes |

## Recommended Project Structure

\`\`\`
src/
  ingest/
    executor.rs
\`\`\`

### Structure Rationale

Dropped from the page.

## Suggested Build Order

Dependency graph of the steps:

\`\`\`
S1 schema ──► I1 executor ──► R1 review
              I1 executor ──► R2 export
\`\`\`

| Step | Deliverable | Depends on | Notes |
|------|-------------|------------|-------|
| S1 | Schema: the manifest types | None | First |
| I1 | Executor: single read, tee | S1 | Core |
| R1 | Review queue: list and filter | I1, S1 | UI |
| R2 | Export | I1, spike X1 (needs an answer) | Last |

**Roadmap grouping suggestion:** S1 and I1 as one phase; R1 and R2 as the second.

## Anti-Patterns

### Anti-Pattern 1: Writing outside the executor

**Why wrong:** Two writers race on the manifest.
**Instead:** Route every write through the executor.

### Anti-Pattern 2: Hashing after the write

**What people do:** Re-read the file to hash it.
**Why it's wrong:** Doubles the I/O.
**Do this instead:** Hash in the tee.
`;

export const DRIFT_PITFALLS = `# Pitfalls Research

**Researched:** 2026-07-30
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

Ranked by how much they cost to fix late.

### Pitfall 1: Statvfs lies on absent mounts

**What goes wrong:**
The mount point degrades to an empty directory, so the probe reports the root filesystem's capacity. It looks healthy.

**Why it happens:**
\`nofail\` mounts.

**Confidence:** MEDIUM-HIGH - two independent sources

**How to avoid:**
- Check mountinfo first
- Then run a bounded canary

**Warning signs:** A tier shows full capacity while its drive is unplugged; the capacity equals the root disk; no mount event in the log.

**Phase to address:** Phase 1 (probe design) - before UI work

### Pitfall 2: Exit codes are a bitmask

**What goes wrong:**
diskcheck exits non-zero on a failing disk.

**How to avoid:**
Decode the bits.

**Warning signs:**
- A failing drive reported as an error

**Phase to address:** Phase 2

### Pitfall 3: A pitfall with no signs at all

**What goes wrong:**
Something.

**Why it happens:**
Reasons.

**Phase to address:** Phase 3

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Absent mounts | Phase 1 | Unplug a tier |
| 2. Exit bitmask | Phase 2 | Feed a failing disk |

## "Looks Done But Isn't" Checklist

- [ ] **Absent tiers:** often only tested plugged in - verify by unplugging each tier (Pitfall 1)
- [ ] **Exit codes:** verify the bitmask is decoded (Pitfall 2) (Pitfall 3)
`;

/** A numbered "Scaling Considerations" with a lead, a concerns × tiers matrix and two priorities,
 * one of which pins to a cell and one of which does not. */
export const DRIFT_SCALING = `# Architecture Research

## 11. Scaling Considerations

A small studio; scale means data volume on one machine, not users.

| Concern | Today | Per season (hundreds of GB) | Per year |
|---------|-------|----------------------------|----------|
| \`ingest_rows\` | n/a | thousands | tens of thousands |
| Write rate | low | per-file, far below limits | unchanged |
| Archive disk | adequate | the archive disk throttles dual-target ingest | keep ingest first |

### Scaling priorities

1. **First bottleneck:** the archive disk during dual-target ingest. Mitigation is policy, not code.
2. **Second:** render CPU against responsiveness. Mitigated by the lane design.

---

## 12. Anti-Patterns
`;

export const TEMPLATE_SUMMARY = `# Project Research Summary

**Project:** Lendshed
**Domain:** Neighbourhood tool library: loan ledger, member sign-in and shed kiosks
**Researched:** 2026-05-14  
**Confidence:** HIGH (the shed workflow is observed first-hand at three sheds; the stack and the pitfalls are checked against the vendor docs and the loan ledger itself)

## Executive Summary

Lendshed is a loan ledger with a kiosk front end for volunteer-run tool sheds. The core finding is that **a loan is a record before it is an event**: the ledger entry exists first, and the kiosk, the desk and the reminder mail are three views of it.

The recommended approach is a **Rust API with a React kiosk app**, chosen because the sheds run on small, offline-first machines and the existing desk portal already ships a Rust service. A heavier stack would add a runtime to every shed laptop for no gain.

The two forward boundaries are already named: (1) a second shed network sharing one ledger, and (2) live sync between the kiosk and the desk. Both stay outside the first release.

**Key risk: building the ledger around the busiest shed's habits.** One shed lends most of the tools, and its shortcuts (a paper sign-out sheet, a shared login) are tempting to bake in.

---

## Key Findings

### Recommended Stack

**Decision: Rust API with a React kiosk app, over a Rails monolith.**

The decision is grounded in two concrete pressures: (1) the shed laptops are offline for hours at a time, and (2) the desk portal is already a Rust service.

**Core technologies:**
- **Rust 1.90:** API language, matches the desk portal.
- **axum 0.8.9:** HTTP server, already used by the desk portal.
- **React 19.2:** Kiosk UI library.
- **sqlx 0.8.6:** Typed queries against the ledger database.

**High confidence because:** the stack matches what the desk already runs.

### Expected Features

**Must have (table stakes):**
1. Member sign-in at the kiosk
2. Check a tool out and back in
3. Overdue reminders by mail
4. A per-shed tool catalogue
5. A steward view of open loans

**Should have (competitive differentiators):**
1. Works offline for a whole shift
2. One ledger across sheds
3. Damage notes on return

**Anti-features to NOT build:**
- Online payments
- A public member directory
- Auto-banning late returners
- Tool reservations weeks ahead

### Architecture Approach

System built as two clean layers separated by a boundary that admits a second network and a sync channel without restructuring.

**Layer A: Ledger store.** A narrow contract for reading and appending loan records.

**Layer B: Kiosk and desk views.** Thin views over the ledger contract.

**Key patterns:**
- **Append-only ledger:** every change is a new entry.
- **Views over records:** kiosk and desk never keep their own copy.

**Proposed 4-phase build order:**
1. **Phase A:** Ledger store
2. **Phase B:** Kiosk check-out flow
3. **Phase C:** Desk and reminders
4. **Phase D:** Offline hardening

### Critical Pitfalls

**1. Building the ledger around the busiest shed's habits.**
One shed is the only real example, which creates pressure to special-case what is visible rather than what every shed needs.

**2. Trusting the kiosk clock.**
Offline laptops drift, and a drifting clock makes loans look overdue.

---

## Implications for Roadmap

### Phase 1: Loan Ledger and Member Model

**Rationale:** Everything downstream depends on a clean, tested ledger. Pitfall #1 is architectural and must be settled before any screen exists.

**Delivers:**
- Ledger store contract and the SQLite implementation
- Member and tool records
- Append-only loan entries
- Idempotent check-out and check-in commands
- A command-line harness that replays a day of loans

**Avoids:** Pitfalls #1, #2, #4

**Research flags:** None required - this is direct application of standard patterns.

### Phase 2: Kiosk Check-out Flow

**Rationale:** Phase 1 exits with a tested ledger. This phase builds the volunteer-facing flow on top of it.

**Delivers:**
- Member sign-in screen
- Check-out and check-in screens
- Receipt mail

**Avoids:** Pitfalls #2, #3

**Research flags:** Needs deeper research on offline queueing.

### Phase 3: Desk, Reminders and Offline Hardening

**Rationale:** Phases 1-2 deliver the daily flow. This phase proves it works on a bad connection.

**Delivers:**
- Steward desk view
- Overdue reminders
- Offline replay tests

**Avoids:** Pitfalls #3, #4

### Phase Ordering Rationale

1. **Strict dependency chain (1 -> 2 -> 3).** The kiosk and the desk both read the ledger.

2. **Pitfall mitigation forces order.** The busiest-shed habit is caught in phase 1, the clock drift in phase 3.

3. **Seams proven early.** Phase 1 proves the ledger contract, phase 2 proves the views never bypass it.

4. **Small phases.** Three phases at one to two plans each fit the shed volunteers' review time.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Matches the desk portal. Versions checked on 2026-05-14. |
| **Features** | HIGH | Observed at three sheds and compared with two hosted tool libraries. |
| **Architecture** | HIGH | Derived from the offline constraint and the ledger contract. |
| **Pitfalls** | HIGH | Each pitfall was seen at a real shed. |

**Overall confidence: HIGH**

### Gaps to Address

1. **Offline queue limits.** How many queued loans a kiosk may hold before it refuses new ones. *Recommendation:* decide in phase 2 planning.

2. **Cross-shed lending rules.** Whether a member may borrow at a shed they never joined.

---

## Sources

### Primary (HIGH confidence)
- The three shed observation notes
- The desk portal service source

---

*Research completed: 2026-05-14*
*Ready for roadmap: yes*
`;

export const TEMPLATE_STACK = `# Stack Research

**Domain:** Offline-first tool-library software for volunteer-run sheds (kiosk, desk, ledger)
**Researched:** 2026-05-14
**Confidence:** HIGH (framework decision, ledger store); MEDIUM (kiosk packaging)

## The Decision, Stated Once

**Rust API with a React kiosk app, over a Rails monolith.**

Not because Rust is faster as a reflex — because two of this tool's actual named pressures point the same direction:

1. **The shed laptops are offline for hours at a time.** A Rails app wants a database server and a job runner on every laptop. The Rust binary ships with an embedded store and needs nothing else running.

2. **The desk portal is already a Rust service.** Sharing its ledger types means one definition of a loan, not two that drift apart.

3. **Kiosk screens are interactive and small.** A single-page React app with a service worker keeps the check-out flow working with the network cable pulled.

The one thing Rails would have made easier is the admin screens. That is not worth a second runtime on every shed laptop. **Confidence: HIGH** — this reasoning is about this tool's specific shape, not a general verdict.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Rust | 1.90 | API language | Matches the desk portal; one toolchain. |
| axum | 0.8.9 | HTTP server | Already used by the desk portal. |
| React | 19.2.1 | Kiosk UI library | Large pool of volunteers who know it. |
| sqlx | 0.8.6 | Typed ledger queries | Compile-time checked SQL against the real schema. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| \`serde\` | 1.0.219 | Wire format | Always; every ledger entry crosses a boundary. |
| \`tracing\` | 0.1.41 | Structured logs | Always; the steward reads these after a bad shift. |
| \`lettre\` | 0.11.12 | Reminder mail | When the shed has an outgoing mail relay. |
| \`tower-http\` | 0.6.4 | Static files and compression | When the kiosk bundle is served by the API. |
| \`time\` | 0.3.41 | Dates without a clock crate | Wherever a due date is computed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| \`cargo-nextest\` | 0.9.99 | Faster test runs | Use it in CI and on the desk laptop. |
| Playwright | 1.52.0 | Kiosk smoke tests | Cover sign-in and check-out only. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Rust and axum | Rails 8 | If the sheds ever get a hosted server and a volunteer who maintains it. |
| Rust and axum | Go with chi | If nobody on the team is willing to learn Rust. |
| sqlx | Diesel | If you want a query DSL over raw SQL strings. |
| SQLite | Postgres | If one ledger must serve many sheds at once. |
| React | Svelte | If the kiosk bundle size becomes a measured problem. |
| \`lettre\` | A hosted mail API | If the shed has no outgoing relay at all. |
`;

export const TEMPLATE_FEATURES = `# Feature Research

**Domain:** Tool-library lending software for volunteer-run neighbourhood sheds
**Researched:** 2026-05-14
**Confidence:** HIGH (observed at three sheds, cross-checked against two hosted tool-library products)

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Member sign-in | Nobody lends a drill to a stranger | LOW | Card or code |
| Check out and check in | It is the whole point of a tool library | MEDIUM | Must work offline |
| Overdue reminders | Volunteers hate chasing returns | MEDIUM | Mail first, SMS later |
| Per-shed catalogue | Members ask what is on the shelf | LOW | Photos optional |
| Steward loan view | Stewards close the shed and need the open list | HIGH | Filters by shed |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Offline for a whole shift | Sheds have flaky Wi-Fi | HIGH | Queue and replay |
| One ledger across sheds | A member can return anywhere | HIGH | Needs a shed id on every entry |
| Damage notes on return | Repairs get scheduled early | LOW | Free-text plus photo |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Online payments | Late fees feel fair | Needs card handling and refunds | A donation jar and a ledger note |
| Public member directory | Members want to find each other | Leaks names and addresses | Shed-only member lookup |
| Auto-banning late returners | Stewards are tired of chasing | One bad week locks out a family | A steward-reviewed reminder list |
| Tool reservations weeks ahead | Popular tools are always out | Reservations rot and block the shelf | A short hold at check-in |

## Competitor Feature Analysis

| Feature | Hosted Tool Library (subscription app) | Shed Spreadsheet (shared sheet) | Lendshed's approach |
|---------|-----------------------------------------|----------------------------------|---------------------|
| Check-out | Web form per member | One row per loan | Kiosk flow with a receipt |
| Offline use | Not supported | Works if the file is local | Queue and replay |
| Reminders | Mail on a schedule | Manual | Mail from the ledger |

The matrix says the gap is working offline, not lending itself.
`;

export const TEMPLATE_ARCHITECTURE = `# Architecture Research

**Domain:** Offline-first loan ledger with kiosk and desk views for volunteer-run tool sheds
**Researched:** 2026-05-14
**Confidence:** HIGH (derived from the offline constraint and first-hand observation of three sheds)

## System Overview

\`\`\`
+------------------------------------------------------------+
|  SHED LAPTOP: kiosk app (React) and local ledger file       |
+----------------------------+-------------------------------+
                             | LedgerEntry { shed, tool, member, at }
                             v
+------------------------------------------------------------+
|  LAYER A - Ledger store (the narrow contract)               |
|  append(entry) . read(shed, day) . replay(queue)            |
|                                                              |
|  v1 impl:    SqliteLedger(path)                              |
|  future:     SyncedLedger - adds a sync channel              |
+----------------------------+-------------------------------+
                             |
                             v
+------------------------------------------------------------+
|  LAYER B - Views: kiosk check-out, steward desk, reminders   |
+------------------------------------------------------------+
\`\`\`

The single most important structural decision is the **Layer A / Layer B split**: the views know nothing about where entries are stored.

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| \`LedgerStore\` | Append and read loan entries | Trait plus the SQLite implementation |
| \`LoanService\` | Validate a check-out or check-in | Pure functions over the store |
| \`ReminderJob\` | Find overdue loans and mail the member | Nightly job on the desk |
| \`KioskApp\` | The volunteer-facing flow | Single-page React app |
| \`DeskApp\` | Open loans, returns, tool notes | Server-rendered pages |

## Recommended Project Structure

\`\`\`
src/
├── ledger/                  # Layer A - the store contract
│   ├── store.rs             # LedgerStore trait, LedgerEntry
│   └── sqlite.rs            # SqliteLedger (v1's only implementation)
├── loans/                   # check-out and check-in rules
├── reminders/               # overdue detection and mail
└── web/
    ├── kiosk/               # React kiosk bundle
    └── desk/                # steward desk pages
\`\`\`

### Structure Rationale

- **\`ledger/\` is deliberately tiny.** It is the only place that changes when a second network arrives.
- **\`loans/\` has no imports from \`web/\`.** The rules are testable without a browser.
- **\`reminders/\` reads the ledger like any other view.** It never keeps its own copy of a loan.

## Architectural Patterns

### Pattern 1: Append-only ledger

**What:** Every change is a new entry; nothing is edited in place.

**When to use:** Any record a steward may need to audit later.

### Pattern 2: Views over records

**What:** Kiosk and desk read the same entries and never cache their own.

**When to use:** Whenever two screens must agree on what is lent out.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| Lendshed reference scale (~12 sheds, 3,400 loans a year) | One SQLite file per shed; no adjustments needed |
| A much larger single network (hundreds of sheds, tens of thousands of loans) | Full ledger rebuild on every sync becomes the first cost worth revisiting |
| Multi-region federation (future direction) | Each region gets its own ledger and a routing table keyed by shed id |

### Scaling Priorities

1. **First real bottleneck, if any:** full ledger rebuild latency, only relevant once a sync channel exists and a network is large — mitigated by incremental re-sync of changed sheds.
2. **Not a bottleneck at this project's actual scale:** disk use on a shed laptop — a few hundred kilobytes per year of loans.

## Anti-Patterns

### Anti-Pattern 1: Letting a view write to the store directly

**What people do:** A kiosk handler appends a ledger entry without going through \`LoanService\`.
**Why it's wrong:** It re-couples the views to the store and skips the overdue and duplicate checks.
**Do this instead:** Views only call \`LoanService\`, and only \`LoanService\` calls the store.

### Anti-Pattern 2: Special-casing the busiest shed

**What people do:** Add \`if shed == "mill-lane"\` branches for its paper sign-out sheet.
**Why it's wrong:** Every new shed then needs its own branch, and the next one breaks the rest.
**Do this instead:** Model the difference as shed settings read from the ledger.

### Anti-Pattern 3: A per-screen cache of loans

**What people do:** Cache "open loans" in the kiosk and again on the desk.
**Why it's wrong:** The two copies disagree after a replay, and a steward sees a tool as out when it is back.
**Do this instead:** One read path through the store; measure before adding any cache.

## Recommended Build Order (coarse granularity)

Given the dependency shape above (store -> rules -> views -> hardening), and the project's own coarse-phase convention (3-5 broad phases, 1-3 plans each):

### Phase A — Ledger store and loan rules
Build \`LedgerStore\` with the SQLite implementation and the \`LoanService\` rules, exercised through a command-line harness that replays a day of loans. This phase alone proves the data boundary. **~1–2 plans:** store and entries; rules and harness.

### Phase B — Kiosk check-out flow
The sign-in, check-out and check-in screens reading from Phase A's store contract, plus the receipt mail. Depends entirely on Phase A's contract being stable. **~2–3 plans:** shell and sign-in; check-out; check-in.

### Phase C — Desk and reminders
The steward desk pages and the nightly reminder job. Depends on Phase A (entries) and Phase B (the kiosk's loan conventions). **~2 plans:** desk pages; reminders.

### Phase D — Offline hardening
Queue and replay tests for every failure in the table above, run against deliberately broken connections. Belongs last because meaningful hardening needs the finished flows.

**Why this order, restated:** A is the plain-data foundation nothing else can run without. B and C both read A's entries, but B sets the loan conventions C's desk pages reuse, so B-before-C is the safer order. D is deliberately last, not first.
`;

export const TEMPLATE_PITFALLS = `# Pitfalls Research

**Domain:** Offline-first tool-library software for volunteer-run neighbourhood sheds
**Researched:** 2026-05-14
**Confidence:** HIGH (each pitfall was seen at a real shed; MEDIUM on the reminder-mail items)

## Critical Pitfalls

### Pitfall 1: Building the ledger around the busiest shed's habits

**What goes wrong:**
The team has exactly one busy shed to watch while building, and it is a mature one:
- It uses a paper sign-out sheet that every other shed lacks.
- It lends from a locked cage, so every loan has a steward present.
- Its members all have a card; most other sheds sign people in by name.

**Why it happens:**
There is only one convenient example, and the code is fastest to write when it matches what is in front of you.

**How likely for this project:** Very high. It is guaranteed to happen at least partially, because no second shed is observed daily.

**How to avoid:**
- Do not derive the ledger from one shed. Derive it from the loan record every shed needs.
- Check in two synthetic shed fixtures: a tiny unattended shed and a busy staffed one.
- Treat unknown shed settings as data to keep, never as an error.

**Warning signs:** A code comment like "the Mill Lane shed always has..."; a test whose only input is the busy shed's export; a setting named after a person.

**Phase to address:** Architectural — the ledger layer, before any screen is built on top of it.

---

### Pitfall 2: Trusting the kiosk clock

**What goes wrong:**
Offline laptops drift by minutes a week. A loan stamped by a drifting clock looks overdue on the desk, and a reminder mail goes to a member who is on time.

**Why it happens:**
The clock is the cheapest source of a timestamp, and nobody checks it while the network is down.

**How likely for this project:** High. Every shed laptop is offline for hours at a time.

**How to avoid:**
- Stamp each entry with the kiosk clock and the last server time seen.
- Compute overdue from the server time when known.

**Warning signs:** Reminder mails for loans due tomorrow; two entries for one tool in the wrong order; a laptop that was dead for a week.

**Phase to address:** Phase 2 (kiosk flow) — before reminders exist.

---

### Pitfall 3: Replaying a queued check-out twice

**What goes wrong:**
A kiosk that reconnects mid-replay sends the same check-out again, and the ledger shows two loans for one tool.

**Why it happens:**
Retries are added for reliability and nobody gives the command an idempotency key.

**How likely for this project:** Medium. It needs a connection that drops during a replay.

**How to avoid:**
- Give every command a key and ignore a repeated key.

**Warning signs:** A tool listed as lent twice; a member with two identical open loans.

**Phase to address:** Phase 1 (ledger commands)

---

### Pitfall 4: Showing a stale open-loan list

**What goes wrong:**
The desk shows a tool as out after it came back, because the view cached the list.

**Why it happens:**
Caching the list is the easy fix for a slow page.

**How likely for this project:** Medium. The desk page is the slowest one.

**How to avoid:**
- Read the open loans from the store on every request.

**Warning signs:** A steward refreshes the page to see a return; counts that differ between kiosk and desk.

**Phase to address:** Phase 3 (desk)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode the busiest shed's settings | Faster first demo | Every new shed needs a code change | Never |
| Cache the open-loan list | Faster desk page | Stale loans on screen | Never |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rebuilding the whole ledger on every sync | Slow sync on large networks | Incremental re-sync of changed sheds | Past a few hundred sheds |
| Loading every loan for the desk page | Slow desk page | Page by shed and day | Past ten thousand open loans |

## Security Mistakes

Even for a one-shed pilot, a few domain-specific issues matter because the kiosk handles member names and a shared shed login.

| Mistake | Risk | Prevention |
|---------|------|------------|
| A shared steward login on the desk | Nobody can tell who closed a loan | One login per steward |
| Member names in the kiosk URL | Names land in browser history and logs | Use opaque member ids in URLs |
| Reminder mail with the full loan list | A wrong address leaks what a member borrowed | Name one tool per mail |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Small touch targets on the kiosk | Volunteers mis-tap with gloves on | Large buttons and a confirm step |
| No receipt after check-out | Members cannot prove a return date | Print or mail a receipt |
| Overdue shown in red only | Colour-blind stewards miss it | Add a label beside the colour |
| A tool with no photo | Members cannot find it on the shelf | Show shelf and bay in text |

## "Looks Done But Isn't" Checklist

- [ ] **Works at a tiny shed:** Verify against a shed with no paper sheet and no cage, not just the busiest one (Pitfall 1) — this is easy to miss because the busy shed is always at hand.
- [ ] **Survives a clock jump:** Verify by moving the kiosk clock forward a day and checking nothing turns overdue (Pitfall 2).
- [ ] **Replay is safe:** Verify a replayed check-out leaves one loan (Pitfall 3).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Ledger shaped by one shed (Pitfall 1) | HIGH | Add the second fixture and fix each failure it shows |
| Duplicate loans from a replay (Pitfall 3) | MEDIUM | Add the idempotency key and merge the duplicates |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Overfit to the busiest shed | Ledger layer (architectural, earliest phase) | Two-fixture suite passes; no code names a shed |
| 2. Trusting the kiosk clock | Kiosk flow | Clock-jump test leaves no loan overdue |
| 3. Double replay | Ledger commands | Replayed check-out leaves one loan |
| 4. Stale open-loan list | Desk | Desk and kiosk counts agree after a return |

## Sources

- The three shed observation notes
- The desk portal service source

---
*Pitfalls research for: offline-first tool-library software (Lendshed)*
*Researched: 2026-05-14*
`;
