---
phase: 01-identity-persistence-foundation
reviewed: 2026-07-17T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - backend/Cargo.lock
  - backend/Cargo.toml
  - backend/migrations/0001_init.sql
  - backend/src/auth/dev_bypass.rs
  - backend/src/auth/jwt.rs
  - backend/src/auth/mod.rs
  - backend/src/config.rs
  - backend/src/db/mod.rs
  - backend/src/download/mod.rs
  - backend/src/lib.rs
  - backend/src/main.rs
  - backend/src/tickets/mod.rs
  - backend/src/tickets/store.rs
  - backend/src/tickets/mint.rs
  - backend/src/ws/mod.rs
  - backend/tests/db_durability.rs
  - backend/tests/download_ticket.rs
  - backend/tests/jwt_verification.rs
  - backend/tests/ws_ticket_flow.rs
  - frontend/app/page.tsx
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: partially_resolved
resolved:
  - id: CR-01
    commit: 0a20ed2
    note: "assert_safe_startup now resolves bind_addr via to_socket_addrs and requires all resolved addresses to be loopback; unresolvable values fail closed. Fixes the localhost-prefix DNS bypass and the IPv6 [::1] false negative. Verified against the real binary."
  - id: WR-01
    commit: 3748536
    note: "TicketMeta carries a TicketPurpose (Ws|Download); consume takes the expected purpose and rejects a mismatch like any other miss. Cross-channel redemption closed before Phase 3 attaches path scope to download tickets."
open:
  - WR-02  # review scope omitted mint.rs — process gap, file was reviewed anyway
  - WR-03  # RSA test private keys inline in tests/jwt_verification.rs
  - WR-04  # frontend API_ORIGIN hardcoded, no NEXT_PUBLIC_API_ORIGIN override
  - WR-05  # no rate limit on ticket-minting endpoints
  - IN-01
  - IN-02
  - IN-03
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20 (19 declared in scope + `backend/src/tickets/mint.rs`, see note below)
**Status:** issues_found

## Summary

Reviewed the identity + persistence foundation: Cloudflare Access JWT verification (`auth/jwt.rs`, `auth/mod.rs`, `auth/dev_bypass.rs`), the in-memory single-use ticket store and its WS/download consumers (`tickets/*`, `ws/mod.rs`, `download/mod.rs`), the SQLite/WAL persistence substrate (`db/mod.rs`, migration), and the walking-skeleton frontend page. The core cryptographic verification path is sound: `Validation::new(Algorithm::RS256)` is pinned explicitly with mandatory `aud`/`iss`, the JWKS decoder fails closed (`Verifier::empty()`), tokens signed with a non-registered key or carrying `alg: none` are rejected (proven by real tests, not just asserted), and the ticket store's atomic check-and-delete `consume()` is proven race-free under real thread contention.

That said, this is not a clean bill of health. The one control this phase treats as the single hardest safety invariant — "`AUTH_MODE=dev` can never silently ship enabled" (D-10) — is implemented as a fragile string-prefix match rather than a real address check, and the ticket store shares one map with no purpose/scope discriminator between WS-authorization tickets and download-authorization tickets, which is a live cross-channel confusion (low practical impact today only because both ticket "kinds" currently carry identical privilege — that will not remain true once Phase 2/3 attach resource-specific authorization to a minted ticket). Several lower-severity quality/process issues are also recorded below, including that `backend/src/tickets/mint.rs` — the actual JWT-gated ticket-minting endpoints exercised by every mint-then-consume flow in this phase — was omitted from the declared 19-file review scope despite being modified in this phase; it was read and reviewed anyway and no additional defects were found in it beyond what's already covered by the mint-related findings below.

## Critical Issues

### CR-01: D-10 dev-bypass hard-gate uses string-prefix matching instead of real address classification

> **RESOLVED 2026-07-17** — commit `0a20ed2`. Fixed as recommended below: `is_loopback_bind` resolves `bind_addr` via `to_socket_addrs()` and requires every resolved address to be loopback, failing closed on unresolvable input. Both holes are closed — the `localhost.attacker.example` DNS bypass and the IPv6 `[::1]` false negative. Covered by 6 new `auth::bind_tests` unit tests and verified against the real binary (`127.0.0.1`/`[::1]` start; `0.0.0.0`/`localhost.attacker.example` panic).

**File:** `backend/src/auth/mod.rs:116-134`

**Issue:** `assert_safe_startup` is the single control responsible for guaranteeing `AUTH_MODE=dev` (which makes `VerifiedIdentity::from_request_parts` return a fixed fake identity for every request with zero verification, see `backend/src/auth/mod.rs:77-79`) can never boot on a non-loopback bind. The check is:

```rust
let is_loopback =
    config.bind_addr.starts_with("127.0.0.1") || config.bind_addr.starts_with("localhost");
```

This is a textual prefix match on `config.bind_addr`, not a parsed/resolved address check. `main.rs:20` passes this same string straight to `tokio::net::TcpListener::bind(&bind_addr)`, which accepts hostnames (via `ToSocketAddrs`) and resolves them via DNS — it is not restricted to literal IPs. Consequences:

1. **False "safe" classification (the actual bypass path):** a `BIND_ADDR` value such as `localhost.attacker.example:8787` passes `starts_with("localhost")` and is treated as loopback, but `TcpListener::bind` will resolve `localhost.attacker.example` via DNS and may bind to whatever address that hostname resolves to — which could be a non-loopback, externally reachable interface. `AUTH_MODE=dev` would then boot successfully on a reachable bind, silently defeating the exact invariant this function's doc comment promises ("it can never silently ship enabled"). This requires either operator misconfiguration or a malicious value in `BIND_ADDR`, but the entire point of a hard-gate is to catch exactly that class of mistake — and this implementation of the gate has a logic hole matching its own threat model.
2. **False "unsafe" classification (fail-safe, but a correctness bug):** IPv6 loopback (`[::1]:8787`) is not matched by either prefix and would incorrectly panic as "not loopback," even though it is. Lower severity (fails closed) but still a defect in the same check.

**Fix:** Parse/resolve `bind_addr` to a concrete address and classify it structurally instead of matching prefixes:

```rust
fn is_loopback_bind(bind_addr: &str) -> bool {
    use std::net::ToSocketAddrs;
    match bind_addr.to_socket_addrs() {
        Ok(addrs) => {
            let mut addrs = addrs.peekable();
            addrs.peek().is_some() && addrs.into_iter().all(|a| a.ip().is_loopback())
        }
        // Anything that fails to resolve to a real socket address cannot be
        // proven loopback — fail closed (not loopback).
        Err(_) => false,
    }
}
```
and call `is_loopback_bind(&config.bind_addr)` in place of the current `starts_with` chain. This also fixes the IPv6-loopback false negative for free.

## Warnings

### WR-01: Ticket store has no purpose/scope discriminator — WS tickets and download tickets are cross-redeemable

> **RESOLVED 2026-07-17** — commit `3748536`. Fixed as recommended below: `TicketPurpose { Ws, Download }` added to `TicketMeta`, set at both `mint.rs` call sites, and `consume(id, expected)` rejects a purpose mismatch identically to expiry/absence. Wrong-channel redemption still burns the ticket (documented on `consume` — the presenter already holds the ticket, so burning grants them nothing and keeps check-and-delete atomic). Covered by 3 new `tickets::store::tests` cases.

**File:** `backend/src/tickets/store.rs:39-89`, `backend/src/tickets/mint.rs:18-32`, `backend/src/ws/mod.rs:41-47`, `backend/src/download/mod.rs:44-46`

**Issue:** `mint_ws_ticket` and `mint_dl_ticket` (`tickets/mint.rs`) both call the exact same `TicketStore::mint(&claims.sub)` into the exact same map; `TicketMeta` (`store.rs:40-46`) records only `issued_to` and `expires_at` — nothing identifying which channel (WS vs. download) the ticket was minted for. `ws::handle_socket`'s `state.tickets.consume(&ticket)` (`ws/mod.rs:41`) and `download::download_handler`'s `state.tickets.consume(&ticket)` (`download/mod.rs:44`) both accept any ticket that is present and unexpired, with no check that the ticket was actually minted for *that* channel. Concretely: a ticket obtained from `POST /api/dl-ticket` can be sent as the first WS message at `/ws` and will open a live socket; a ticket obtained from `POST /api/ws-ticket` can be used as the `/dl/{ticket}/...` path segment and will serve a download. `store.rs`'s own module doc even documents this as "same map... only the delivery channel differs," so it's a known-shared design, not an oversight of the sharing itself — but the cross-channel *redemption* implication doesn't appear to have been evaluated.

Practical impact today is low, because neither ticket type currently carries differentiated authorization (any authenticated member can mint either ticket type directly via the corresponding endpoint anyway, and the download handler ignores the requested filename entirely, always serving the same fixture — see `download/mod.rs:33-39`). But this foundation is explicitly the substrate later phases build resource-scoped authorization on top of (e.g., a download ticket scoped to one specific file/tier path). Once that lands, cross-redemption stops being a no-op and becomes a real privilege/scope-bypass vector, and it will be considerably more expensive to retrofit a purpose tag onto every already-shipped consumer than to add it now.

**Fix:** Add a `purpose: TicketPurpose` (e.g., `enum TicketPurpose { Ws, Download }`) field to `TicketMeta`, set it at `mint()` call sites (`mint_ws_ticket` mints `Ws`, `mint_dl_ticket` mints `Download`), and have `consume()` take an expected purpose and reject a mismatch the same way it rejects expiry/absence (no distinguishing error — still a generic reject):

```rust
pub fn consume(&self, id: &str, expected: TicketPurpose) -> bool {
    let mut guard = self.inner.lock().expect("ticket store mutex poisoned");
    match guard.remove(id) {
        Some(meta) => meta.expires_at > now_secs() && meta.purpose == expected,
        None => false,
    }
}
```

### WR-02: `backend/src/tickets/mint.rs` was modified this phase but excluded from the declared review scope

**File:** `backend/src/tickets/mint.rs` (whole file); scope declared in the review request

**Issue:** `mint.rs` defines `mint_ws_ticket`/`mint_dl_ticket` — the two JWT-gated endpoints that are the sole entry point into the ticket store, and are directly referenced by both `01-01-SUMMARY.md`'s and `01-03-SUMMARY.md`'s own coverage claims (e.g. "`grep -rn 'VerifiedIdentity' backend/src/tickets/mint.rs`"). Git history confirms it was touched in this phase (`5ed84cd`, part of Plan 01 Task 2), yet it is absent from the 19-file scope list this review was given. It was read and reviewed regardless (see WR-01, which spans it), and no defects beyond WR-01 were found inside it — but the omission itself is a process gap: a security-critical, phase-modified file should not fall outside an identity/persistence-foundation review's declared scope. Recommend correcting the file-discovery step that produced the 19-file list for this phase before relying on it for downstream automation (e.g., `--auto` re-review).

**Fix:** Regenerate the phase's changed-file list (e.g. re-run the `git diff --name-only` scoping against the correct base commit range) and confirm `backend/src/tickets/mint.rs` is included; re-run/extend this review if other files are found to be similarly missing.

### WR-03: Hardcoded RSA private test keys committed as plaintext PEM in test source

**File:** `backend/tests/jwt_verification.rs:34-62,67-95`

**Issue:** Two full RSA private keys (`KEY_1_PEM`, `KEY_2_PEM`) are hardcoded as `-----BEGIN PRIVATE KEY-----` PEM blocks directly in test source. The summary documents these as throwaway keys generated once solely to sign test fixtures and never used anywhere else — accepted as a reasonable engineering tradeoff to avoid adding an RSA-keygen dependency. However, committing raw PEM private-key blocks to a repository is exactly the byte pattern automated secret scanners (GitHub secret scanning/push protection, TruffleHog, gitleaks, etc.) are built to flag; every future scan or push-protection check on this repo will alert on these two blocks, requiring manual allow-listing, and normalizes "there's a private key in this diff, that's fine" as a reviewer reflex — which is the exact reflex you don't want when a *real* credential leaks into a future commit.

**Fix:** Move the PEM/JWK constants into a `tests/fixtures/` file (or generate the keypairs at test-run time via `rsa`/`ring` in a `dev-dependencies`-only helper) so the literal `BEGIN PRIVATE KEY` marker either doesn't appear in versioned source at all, or appears in a location clearly labeled and isolated as a non-production fixture directory that scanners/reviewers can permanently allow-list once rather than re-triaging inline.

### WR-04: Frontend `API_ORIGIN` is hardcoded with no environment-variable override

**File:** `frontend/app/page.tsx:9`

**Issue:** `const API_ORIGIN = "https://api.cinedise.com";` is a compile-time constant; the file's own comment acknowledges "the origin below must be swapped for the real deployed backend origin." There is no `process.env.NEXT_PUBLIC_API_ORIGIN` (or equivalent) fallback, so pointing this page at a staging/preview backend, a local dev backend, or any future second environment requires editing source and redeploying rather than setting a Vercel environment variable — a maintenance/config-management gap that will resurface as soon as this project has more than one deployed environment.

**Fix:**
```ts
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://api.cinedise.com";
```
with `NEXT_PUBLIC_API_ORIGIN` set per Vercel environment (production/preview/development).

### WR-05: No rate limit on ticket-minting endpoints

**File:** `backend/src/tickets/mint.rs:18-32`, `backend/src/tickets/store.rs:91-119`

**Issue:** `POST /api/ws-ticket` and `POST /api/dl-ticket` mint a fresh ticket on every call with no per-identity or per-IP rate limit. An authenticated member (or anyone in possession of a valid, still-live Access session/JWT) can call either endpoint in a tight loop; each call inserts a new 256-bit-keyed entry into the shared in-memory map. The background sweeper (`spawn_sweeper`, 15s interval) bounds growth from *abandoned* tickets over time, but does nothing to bound the mint *rate* within a single sweep window — an attacker minting as fast as the network allows for even a few seconds can grow the map by however many requests fit in that window before the next sweep. This is explicitly called out in project docs as an accepted risk (T-01-13) for the sweeper's design, but the mint-rate half of the risk (as opposed to the abandoned-ticket half) has no code-level mitigation at all.

**Fix:** Add a simple per-identity or per-IP token-bucket/rate limiter (e.g. `tower_governor`, or a small counter map keyed by `claims.sub` with its own short TTL) in front of both mint handlers. Low urgency given the authenticated-only exposure, but cheap to add now versus after an incident.

## Info

### IN-01: `Verifier::shutdown()` is dead code

**File:** `backend/src/auth/jwt.rs:37,145-151`

**Issue:** `Verifier` carries a `shutdown: Option<CancellationToken>` and a public `shutdown()` method explicitly intended for "a future graceful-shutdown path" (per its own comment). Nothing in `main.rs`, `lib.rs`, or anywhere else in the codebase calls it — there is no `SIGTERM`/graceful-shutdown handler at all. This isn't a correctness bug (the background JWKS-refresh task simply dies with the process on exit, which is harmless), but it's unused public API purporting to support a lifecycle the rest of the binary doesn't implement.

**Fix:** Either wire a real shutdown signal handler in `main.rs` (e.g. `tokio::signal::ctrl_c()` → `state.verifier.shutdown()` before `axum::serve`'s graceful shutdown), or remove the field/method and its comment until such a handler exists, to avoid the API implying a capability the binary doesn't use.

### IN-02: WS first-message handling rejects any non-`Text` frame identically to a missing/invalid ticket

**File:** `backend/src/ws/mod.rs:27-39`

**Issue:** `handle_socket`'s `match first { Ok(Some(Ok(Message::Text(text)))) => ..., _ => reject(...) }` treats a `Ping`, `Pong`, `Binary`, or `Close` frame arriving before the ticket identically to "missing ticket" and closes with 1008. This matches the documented design (first message must be the ticket) and is exercised by `rejects_non_text_first_message` in `ws_ticket_flow.rs`, but in production, some proxies/load balancers or WS client libraries may transparently send a `Ping` immediately after the upgrade (for keepalive) before any application data — such a client would be rejected even though it fully intends to send the ticket next. Worth a deliberate decision (accept-and-continue-waiting on `Ping`/`Pong` specifically, vs. reject) rather than an implicit one, once this runs behind real production infrastructure.

**Fix:** Consider looping past (and ignoring) `Ping`/`Pong` frames specifically while still enforcing the grace-window timeout and rejecting `Binary`/`Close`/anything else, if this becomes an observed interoperability issue.

### IN-03: SQLite connection string built via unescaped `format!`

**File:** `backend/src/db/mod.rs:36`

**Issue:** `SqliteConnectOptions::from_str(&format!("sqlite://{}", config.database_path))` builds a URI by naive string interpolation. If `DATABASE_PATH` ever contains URI-special characters (`?`, `#`, `%`), `from_str`'s URI parser would reinterpret part of the path as query parameters or a fragment rather than as literal path characters. `config.database_path` is operator-controlled (an env var), not attacker input, so the practical risk is low — but it's an easy foot-gun to avoid entirely.

**Fix:** Use the non-URL builder instead, which takes the path literally:
```rust
let opts = SqliteConnectOptions::new()
    .filename(&config.database_path)
    .create_if_missing(true)
    .journal_mode(SqliteJournalMode::Wal)
    .synchronous(SqliteSynchronous::Full)
    .busy_timeout(Duration::from_secs(5));
```

---

_Reviewed: 2026-07-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
