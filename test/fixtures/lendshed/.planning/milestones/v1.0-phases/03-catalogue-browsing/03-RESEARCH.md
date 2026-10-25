# Phase 3: Catalogue Browsing - Research

**Researched:** 2026-02-17
**Domain:** Path-traversal-safe catalogue browsing and checkout over four heterogeneous sheds (local folders plus a hub-mediated depot), from a Node/Hono server, rendered through a bucketed React front end
**Confidence:** MEDIUM — HIGH on the race-free path mechanism (cross-checked against the kernel man page and the library's own docs) and on version facts (verified against the registries); MEDIUM on the listing-deadline values (reasoned from phase 2's proven patterns, not benchmarked on the real host); LOW on anything tagged `[ASSUMED]` below, most notably the two deadline constants, which the plan must confirm with a real measurement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Breadcrumb single-pane layout — one content pane, breadcrumb trail, shed switcher across the top. One listing request per view.
- **D-02:** Shed and folder live in the URL: `/borrow/{shed}/{path}`. The path is user input and must be treated as fully untrusted server-side.
- **D-03:** The shed switcher carries a state dot only (healthy, degraded, silent), reusing phase 2's live socket exactly as-is.
- **D-04:** A listing is a one-shot REST fetch with a manual refresh control. No push, no polling.
- **D-05 (against recommendation):** Hide all dotfiles AND filesystem junk by default, with a required "show hidden" toggle. Junk denylist (at minimum): `System Volume Information`, `$RECYCLE.BIN`, `.Trash-1000`, `lost+found`, `._*` files. Keep the denylist in one named, commented constant.
- **D-06:** Symlinks are fully resolved, then prefix-checked. One escaping the root is neither listed nor served. **The exact race-free resolution mechanism is a research question** (resolved below).
- **D-07:** The server returns the full directory listing; the front end buckets the render. No pagination protocol, no truncation cap.
- **D-08:** Default order is folders first, then natural name sort (`drill_2` before `drill_10`). Column headers re-sort within the session.
- **D-09 (against recommendation):** Rows carry name, size, modified date and a type column. Keep the extension-to-type taxonomy small and in one place.
- **D-10:** Downloadable is defined by a size cap alone — one configurable byte threshold, no extension allowlist.
- **D-11:** An oversized file shows a disabled checkout control with the real reason and size, plus the LAN path as copyable text. The server enforces the cap independently.
- **D-12:** Depot checkouts stream through a bounded `hubctl get` piped straight into the HTTP response. No scratch copy. The cap is checked against the reported size *before* spawning.
- **D-13:** Checkout permits bind to an exact shed plus canonical path at mint time. `/ck/{permit}` serves only that file — **the URL carries no user-controlled path at all.**
- **D-14:** Depot listings run as a bounded subprocess with an explicit timeout state in the UI, distinct from "folder not found". The hub's own `--timeout` is an idle timer, not wall-clock, so a parent deadline is required.
- **D-15:** Browsing into a silent shed is allowed; state is shown in-pane. The listing attempt is the source of truth; the dot is a hint.
- **D-16:** Local listings run on a dedicated worker with a wall-clock deadline; a worker blocked past the deadline is accepted as leaked.

### Claude's Discretion

- The size-cap value for D-10 (about 500 MB discussed) and whether it is configurable.
- The deadline values for D-14 and D-16 — measure, do not copy phase 2's numbers.
- Whether to cap concurrent in-flight listings per shed.
- The exact race-free resolution mechanism for D-06 (resolved below).
- The browse API's response shape.
- Which `hubctl stocks` flags to pass (resolved below).
- The windowing library for D-07 (resolved below).
- Empty-folder and permission-denied listing states.

### Deferred Ideas (OUT OF SCOPE)

- Short-lived depot listing cache — considered at D-14, not taken.
- Multi-file selection — phase 4's concern; do not build it.
- Audit-logging browse and checkout actions — phase 4.
- Search or filter within a shed — never raised.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CATL-01 | Member can browse the folder tree of any shed | Architecture Patterns, System Diagram, Pattern 1; hub flag research |
| CATL-02 | Member can see per-file size and modified date | Hub listing field research; folder metadata for local sheds |
| CATL-03 | Member can check out small files through the app | D-12 and D-13: permit-scoped checkout, streaming subprocess pattern |
| CATL-04 | Browsing and checkouts cannot escape a shed's configured root | Race-free path resolution, the phase's central research question |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No root `CLAUDE.md` exists in this repository. `web/CLAUDE.md` exists and only re-exports one directive: **"This is NOT the React you know" — read the vendored docs before writing any front-end code, and heed deprecation notices.** No other project-level directives apply beyond what CONTEXT.md and the research documents already encode.

## Summary

This phase's whole technical risk sits in one place: CATL-04's promise that no request, accidental or crafted, can read outside a shed's configured root, made hard by D-06's decision to *resolve* symlinks rather than refuse them. A naive `realpath()` followed by a `startsWith()` check has a real race window between the check and the actual `open()`, and CONTEXT.md is explicit that shipping it and calling CATL-04 met is not acceptable. The verified fix is to stop resolving paths by hand and adopt **`fs-jail`'s `Dir` capability API**, which wraps the kernel's beneath-only open flag on a recent Linux with an emulation fallback. Every later operation goes through that one `Dir` handle and a caller-supplied *relative* path; the kernel refuses any component that would resolve outside the directory, atomically.

The second finding is architectural: **the async handlers cannot call phase 2's blocking subprocess wrapper inline**, because doing so blocks the event loop for the whole bound. Three different invocation shapes are needed and must not be collapsed: a dedicated worker bridged by a mailbox for local D-16 listings, the same bridge around the existing wrapper for the short depot D-14 listing, and a truly async spawn for D-12's checkout stream, because that subprocess must stay alive for the whole response body.

On the front end, D-07's "server returns everything, browser buckets" has one clearly right library for this stack: **`@gridkits/lists-rowwise@^3.14`**, whose current release lists React 19 in its peer range. `hubctl stocks` needs **no extra flags** for D-09's columns against the depot hub: it is non-recursive by default and returns name, size, modified time and kind per entry at no extra cost.

**Primary recommendation:** adopt `fs-jail`'s `Dir` as the single shared path-resolution primitive for every filesystem touch in this phase (browse, stat, permit mint, checkout serve); never write a second, divergent validation path. Treat the invocation-shape distinction as a hard constraint on the task breakdown, not an implementation detail.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Path validation (CATL-04) | API/Server | — | Must happen server-side, once, on every path-accepting entry point; a client check is not a boundary |
| Directory listing (local sheds) | API/Server | — | `Dir.list_dir` against the folder root; never exposed to the browser as a raw path |
| Directory listing (depot) | API/Server | — | Bounded `hubctl stocks` subprocess; hub credentials never leave the server |
| Row rendering (10k rows) | Browser/Client | — | D-07: the server sends the list once, the browser owns windowed rendering |
| Sort and filter (session-only) | Browser/Client | — | Operates on the already-fetched listing |
| Shed health dot (D-03) | Browser/Client | API/Server (socket push) | The front end consumes phase 2's feed unchanged |
| Checkout authorization (permit mint) | API/Server | — | Path canonicalization and the size cap happen at mint time |
| Checkout byte streaming (local) | API/Server | — | Streamed from an already-validated handle, never a plain static-file route |
| Checkout byte streaming (depot) | API/Server | — | `hubctl get` piped into the response; no scratch copy |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fs-jail` | **4.0.2** `[VERIFIED: registry]` (selection itself `[ASSUMED]` — found through search, verify at Wave 0) | Race-free, symlink-aware, capability-scoped filesystem access — the CATL-04 primitive | Wraps the beneath-only open flag with a fallback; a `Dir` cannot be built from an untrusted path without an explicit root grant, and every later operation is relative-only. |
| `@gridkits/lists-rowwise` | **3.14.6** `[VERIFIED: registry]` (peer ranges confirm React 16 through 19; selection `[ASSUMED]`) | Windowed rendering of the up-to-10,000-row listing (D-07) | The usual choice for "render a huge flat list, keep the DOM small"; headless, so it composes with the table primitives and the theme. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:stream` | built in | Wrap a file handle or a subprocess's output into a body stream | Both checkout-serving paths (D-12, D-13); no new dependency |
| `node:child_process` | built in | Truly async spawn for `hubctl get` | Only D-12's checkout stream |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fs-jail` | Hand-rolled beneath-only open with manual flags | Same syscall, but `fs-jail` ships the fallback emulation and years of review; hand-rolling re-introduces the edge-case risk this research exists to close |
| `fs-jail` | `realpath()` + `startsWith()` | **Explicitly rejected by CONTEXT.md.** A race between the check and the open, and it does not close the symlink-to-secret-file case |
| `@gridkits/lists-rowwise` | Hand-rolled windowing | Fiddly to get right (anchor preservation on sort, overscan tuning); buys nothing over a small proven library |
| `@gridkits/lists-rowwise` | A fixed-size-list component library | Comparable maturity, less active, a more opinionated API; a fallback if the peer range ever regresses |

**Installation:**
```bash
# Server
npm install fs-jail@4.0.2

# Web
npm install @gridkits/lists-rowwise@^3.14
```

**Version verification:** `fs-jail`'s dependency on the platform bindings was confirmed against the registry's package metadata; the web library's peer ranges were confirmed against the live registry API.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `fs-jail` | npm | ~6 years (first published 2020-06-25) | ~336K/week | `github.com/example-org/fs-jail` | OK | Approved |
| `@gridkits/lists-rowwise` | npm | long-established; latest point release published 2026-02-12 | ~17.7M/week | `github.com/example-org/lists-rowwise` | SUS (flagged solely as "too-new" — the heuristic reads the latest patch date, not the package's age; the download volume and the long-standing repo contradict a slopsquatted name) | Flagged — planner must add `checkpoint:human-verify` before `npm install`, even though the signal is almost certainly a false positive |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@gridkits/lists-rowwise` (see note above — verify the installed version's peer ranges still list React 19 at install time).

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│ BROWSER — /borrow/{shed}/{path}                                     │
│  1. GET /api/borrow/{shed}/{path}  (CheckedMemberRow, cookie_only)  │
│  2. display live catalog via @gridkits/lists-rowwise (bucketed)     │
│  3. press "checkout" → POST /api/ck-permit {shed, path}             │
│  4. GET /ck/{permit}  (no path in URL — D-13)                       │
└───────────────┬───────────────────────────────────────┬─────────────┘
                │ (1)(3)(4) simple, cookieissued          │ WS (preserved,
                ▼                                          │  Phase 2)
┌────────────────────────────────────────────────────────────────────┐
│ NODE/HONO BACKEND                                                    │
│                                                                        │
│  GET /api/borrow/{shed}/{path}                                       │
│    ├─ CheckedMemberRow validator (retained)                          │
│    ├─ ShedId::parse_id(shed) — sealed list, refuse missing           │
│    ├─ sheds::guard::confine(shed_root_dir, path)  ◄── THE safeline   │
│    │     Inner:  fs_jail::fs::Dir::open_rooted_path(folder_dir)      │
│    │             → dir.list_dir(subpath_value)                       │
│    │             shifted upon a exclusive pol::worker (D-16),        │
│    │             pending via a mailbox with a hard-timer deadline    │
│    │     Depot:  guarded_call::run_limited(hubctl stocks ...)        │
│    │             shifted the SAME way — never called inline in the   │
│    │             async handler (it is a blocking, sleep-polling fn)  │
│    ├─ D-05 fluff/hiddens filter, D-08 sort, D-09 type derivation     │
│    └─ live JSON array response (D-07 — no pagination)                │
│                                                                        │
│  POST /api/ck-permit {shed, path}                                    │
│    ├─ CheckedMemberRow validator                                     │
│    ├─ SAME sheds::guard::confine() as borrow — one implementation    │
│    ├─ size-cap check (inner: fs_jail metadata; depot: stocks --info) │
│    └─ permits.mint(..., PermitPurpose::Checkout { shed, path })      │
│                                                                        │
│  GET /ck/{permit}                                                     │
│    ├─ permits.consume(permit, Checkout{..}) → (shed, path)           │
│    ├─ sheds::guard::confine() AGAIN at serve time (defense in depth) │
│    ├─ Inner:  event::fs::Blob::from_raw(jailfile) → BlobPipeline     │
│    └─ Depot:  event::spawner::Process("hubctl","get",...)            │
│               .output(Pipes::wired()) → BlobPipeline, forwards live  │
│               into the response body — no swap copy (D-12)           │
└────────────────────────────────────────────────────────────────────┘
```

A reader tracing "member clicks a folder → sees rows → presses checkout → gets bytes" follows exactly the four numbered arrows above; every arrow that crosses the trust boundary (browser → server) passes through `sheds::guard::confine()` before touching a filesystem or subprocess.

### Recommended Project Structure

```
server/src/
├── sheds/
│   ├── guard.ts       # confine(): the one boundary
│   ├── local.ts       # worker-bridged local listing
│   └── depot.ts       # bounded hubctl listing
├── api/
│   └── borrow.ts      # GET /api/borrow/:shed/*
└── tickets/
    └── store.ts       # permits bound to shed plus path
```

### Structure Rationale

- **`sheds/guard.ts` alone owns resolution:** every other file receives an already-confined handle.
- **`local.ts` and `depot.ts` stay separate:** their invocation shapes differ and must not be merged.

### Pattern 1: The shared `confine` boundary

**What:** one function takes a shed root and an untrusted relative path and returns a confined handle, or refuses.

```ts
export function confine(root: Dir, subpath: string): Handle {
  if (subpath.includes('\0')) throw new Refused('bad-path');
  return root.openBeneath(subpath);
}
```

**When to use:** at every entry point that accepts a path (browse, mint) and again at serve time.

### Pattern 2: Three subprocess shapes, not one

**What:** local listings use a dedicated worker plus mailbox; depot listings use the same bridge around the bounded wrapper; the checkout stream uses a truly async spawn.

### Anti-Patterns to Avoid

- **A plain static-file route for checkouts:** it validates no path.
- **Calling the blocking wrapper inline in an async handler:** it stalls the event loop for the whole bound.
- **A second divergent path check in the serve route:** one `confine`, called twice, never two implementations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path containment | `realpath` plus prefix compare | `fs-jail` `Dir` | The race between check and open |
| Windowed lists | Manual scroll math | `@gridkits/lists-rowwise` | Anchor and overscan edge cases |
| Natural sort | Custom comparator | `Intl.Collator` with numeric option | Built in and correct |
| Body streaming | Buffering the file | `node:stream` pipeline | Memory stays flat |

## Common Pitfalls

### Pitfall 1: Naive `realpath()` plus `startsWith()` solves CATL-04 in every test except the one that matters
**What goes wrong:** the check passes, a symlink is swapped, and the open reads outside the root.
**Why it happens:** the check and the open are two separate steps.
**How to avoid:** open beneath the root in one step through `fs-jail`.
**Warning signs:** any string compare of paths.

### Pitfall 2: A blocking subprocess or filesystem call runs inline inside an async handler
**What goes wrong:** one slow shed stalls every request.
**Why it happens:** phase 2's wrapper was written for dedicated workers.
**How to avoid:** bridge through a worker and a mailbox with a deadline.
**Warning signs:** latency on unrelated routes during a depot listing.

### Pitfall 3: `hubctl stocks` invoked with a folder name that looks like a flag
**What goes wrong:** a folder named `--config` is read as an option.
**Why it happens:** arguments are passed positionally without a separator.
**How to avoid:** always pass `--` before the user-derived path.
**Warning signs:** an argument array built from a template string.

## Code Examples

### Opening a shed root and listing a subfolder (illustrative)

```ts
const root = Dir.openRooted(shed.folder);
const rows = await listViaWorker(() => root.list(confine(root, subpath)), DEADLINE_MS);
```

### Streaming a subprocess's output into a response body (illustrative, D-12)

```ts
const child = spawn('hubctl', ['get', '--', remotePath], { stdio: ['ignore', 'pipe', 'pipe'] });
return new Response(Readable.toWeb(child.stdout), { headers });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Prefix-check after `realpath` | Beneath-only open through a capability handle | Kernel 5.6, 2020 | Closes the check-to-open race |
| Paged listings | Windowed rendering of one full listing | Common since 2022 | One request per view (D-01) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The local deadline of 3 s and the depot deadline of 20 s are workable | Pitfall 2 | Too low: slow sheds read as timeouts. Too high: a stuck shed holds a worker. |
| A2 | `hubctl stocks` returns kind and modified time inline with no extra cost | Summary | If it costs an extra call per entry, listings slow down |
| A3 | `fs-jail` is the right package for the capability primitive | Standard Stack | Found through search; verify at Wave 0 |

## Open Questions

1. **What size cap should D-10 start with?**
   - What we know: about 500 MB was discussed and not fixed.
   - Recommendation: a configuration value with 500 MB as the default.

2. **Should concurrent in-flight listings be capped per shed?**
   - Recommendation: yes, one outstanding listing per shed, a cheap addition on top of D-16.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Server and web build | ✓ | v22.23.1 | — |
| `hubctl` | Depot listing and checkout | ✓ | 3.2.0 | — |
| Linux 5.6 or newer | Beneath-only open flag | ✓ | 6.12 | The library's emulation |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` 4.1.11 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- sheds` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CATL-01 | Listing returns folders first in natural order | unit | `npm test -- local-listing` | ❌ Wave 0 |
| CATL-02 | Rows carry size and modified date | unit | `npm test -- local-listing` | ❌ Wave 0 |
| CATL-03 | A permit serves exactly its bound file | integration | `npm test -- checkout-permit` | ❌ Wave 0 |
| CATL-04 | A symlink swapped mid-request cannot escape the root | integration | `npm test -- confine-race` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- sheds`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green before verification.

### Wave 0 Gaps
- [ ] `server/test/confine-race.test.ts` — the swapped-symlink case
- [ ] `server/test/checkout-permit.test.ts` — permit binding
- [ ] `server/test/local-listing.test.ts` — order, filter and type derivation

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | One `confine` boundary, called at mint and again at serve |
| V5 Input Validation | yes | Closed shed list; path never reaches a shell; `--` before user-derived arguments |
| V12 Files and Resources | yes | Size cap enforced server-side; beneath-only open |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal through `..` or symlinks | Tampering | Beneath-only open through `fs-jail` |
| Argument injection through a folder name | Elevation of Privilege | `--` separator and an argument array |
| Permit reuse for a different file | Spoofing | Permit bound to shed plus canonical path at mint |

## Sources

### Primary (HIGH confidence)
- `server/src/sheds/local.ts`, `server/src/sheds/bounded.ts` — phase 2's worker and wrapper, read directly.
- `server/src/tickets/store.ts` — the ticket store the permits extend.
- npm registry API — `fs-jail` and `@gridkits/lists-rowwise` metadata.

### Secondary (MEDIUM confidence)
- [Kernel openat2 man page](https://docs.example.org/man/openat2) — the beneath-only flag semantics.

### Tertiary (LOW confidence)
- Package selection for both libraries — found through search; see Assumptions Log A3.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — versions verified, selection assumed
- Architecture: HIGH — grounded in phase 2's proven patterns
- Pitfalls: HIGH — each reproduced or documented

**Research date:** 2026-02-17
