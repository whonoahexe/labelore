---
phase: 01
phase_name: "portal-owned-identity-sessions"
project: "Cinedise Portal"
generated: "2026-08-08"
counts:
  decisions: 14
  lessons: 9
  patterns: 10
  surprises: 7
missing_artifacts: []
---

# Phase 01 Learnings: Portal-Owned Identity & Sessions

## Decisions

### All three AuthError variants render a byte-identical 401 body
`MissingCookie`, `InvalidSession`, and `Disabled` produce the same body, not merely the same status code.

**Rationale:** The plan's must-have only required that a missing cookie and an unknown token be indistinguishable. Generalizing it to the disabled-account case keeps the extractor's fail-closed discipline uniform rather than partially uniform — a distinguishable `Disabled` body would leak account existence to anyone holding a stale token.
**Source:** 01-01-SUMMARY.md

---

### 409 Conflict — not 401 or 403 — for `AuthError::MustChangePassword`
CONTEXT.md left the status code open; 409 was chosen deliberately.

**Rationale:** Phase 2's role-based authorization denials will return 403 on the same `VerifiedIdentity` seam. Reserving 409 for "you must change your password first" means the two policy classes can never collide on the same surface, and a client can tell them apart without parsing bodies.
**Source:** 01-02-SUMMARY.md

---

### The forced-change gate lives inside `VerifiedIdentity::from_request_parts`, consulting one exported list
`MUST_CHANGE_EXEMPT_PATHS` is the single constant the extractor checks and `route_auth_coverage.rs` audits against — never a per-handler field check.

**Rationale:** One seam covers every present *and future* route. A per-handler check is a convention that a new route silently opts out of; a seam is one a new route cannot escape.
**Source:** 01-02-SUMMARY.md, 01-02-PLAN.md (RESEARCH Pattern 2 / Pitfall 4)

---

### `route_layer`, not `layer`, for scoping `GovernorLayer` to the credential routes
axum's `Router::layer` applies to both `path_router` and `fallback_router`; `route_layer` applies only to `path_router`.

**Rationale:** A plain `.layer()` on the credential sub-router also wrapped that sub-router's own 404 fallback, so *any* request matching nothing anywhere in the merged outer router still passed through the address-axis key extractor on its way to a 404 — turning an unrelated 404 into a 500 whenever no key resolved.
**Source:** 01-04-SUMMARY.md (deviation 1, confirmed against axum 0.8.9 source)

---

### Argon2/password-hash types imported exclusively through argon2's own re-export
Never through the standalone `password-hash` 0.6.1 crate, even though the phase added it.

**Rationale:** The dependency graph resolves two *different* versions of `password-hash` (0.5.0 via argon2, 0.6.1 direct). Mixing them fails to typecheck.
**Source:** 01-01-SUMMARY.md

---

### A disabled account's login still runs a real Argon2id verify before failing
The `disabled_at` check is combined with the verify result afterward, never short-circuited before it.

**Rationale:** Short-circuiting on `disabled_at.is_some()` would reintroduce exactly the timing side-channel D-18 exists to close, just for a different account state. Not required by the plan's must-haves — adopted for consistency with the same discipline.
**Source:** 01-01-SUMMARY.md (deviation 4, Rule 2 security)

---

### The `sessions` cascade delete on password change runs inside the same sqlx transaction as the hash write
Not best-effort sequential queries.

**Rationale:** D-03 requires that changing a password invalidates every *other* session. A sequential pair can leave a window where the hash is new but the old sessions still authenticate.
**Source:** 01-02-SUMMARY.md

---

### `backstage` actively rejects password-carrying CLI flags rather than ignoring them
`parse_args` scans every argument for a password-flag shape (`--password`, `-p`, `--pw`, `--passwd`, any `=value` suffix) before dispatching to a subcommand.

**Rationale:** Silently ignoring the flag would leave the operator believing a password was set. Accommodating it would put a credential in shell history and the process table. Rejecting with a distinct error points them at stdin.
**Source:** 01-03-SUMMARY.md

---

### `reset_password` treats an unnormalizable handle as `NotFound`, not a separate error variant
Normalization failure short-circuits into `NotFound` before touching the database.

**Rationale:** From the caller's point of view the two outcomes are indistinguishable — "this handle has no account." A separate `InvalidHandle` variant would be a distinction without a difference.
**Source:** 01-03-SUMMARY.md

---

### Deleted the entire Cloudflare Access *application*, not just its policy
The application covering both `studio.cinedise.com` and `api.cinedise.com` was removed.

**Rationale:** An Access application with zero policies still intercepts every request and matches nothing. Removing only the policy would have traded an interstitial for a hard outage.
**Source:** 01-06-SUMMARY.md

---

### Snapshotted the Access app + policy to a 0600 file outside the repo before deleting
`~/cinedise-access-rollback-20260805.json`.

**Rationale:** The plan rated reversibility `costly` because a rebuild would be from scratch. The snapshot turns that into a five-minute dashboard job. Kept outside the repo because it names an individual's email address.
**Source:** 01-06-SUMMARY.md

---

### `backstage` installs *before* the service swap in the deploy workflow
Not after.

**Rationale:** A deployed backend applies its migrations on start. Failing the CLI install afterward would leave a `users` table with nothing in it and no CLI to seed it — an unauthenticated portal with no way to create the first account.
**Source:** 01-06-SUMMARY.md

---

### `retry_after` rides in the JSON body only, not a CORS expose-headers entry
The plan offered this as an explicit either/or.

**Rationale:** The simpler of the two, and the one the frontend plan was already written against.
**Source:** 01-04-SUMMARY.md

---

### `proxy.ts` forwards the session cookie via an explicitly reconstructed `Cookie` header
Not `credentials: "include"` alone.

**Rationale:** A server-side fetch has no browser cookie jar to include. `credentials: "include"` is retained only because it is this codebase's established fetch convention and the plan names it — the actual auth signal is the manually-forwarded header.
**Source:** 01-05-SUMMARY.md

---

## Lessons

### Cutover preconditions are load-bearing, not ceremony
Task 3's step-1 `backstage list` — a routine precondition check — is what revealed that the entire phase had never been deployed. The live binary was from 2026-08-02, predating every Phase 1 backend commit; it carried zero references to `portal_session` and 138 to Cloudflare Access; the live database had no `users` or `sessions` tables; **42 commits were unpushed** because the path-filtered deploy workflow had never fired.

**Context:** Removing Access at that moment would have exposed an unauthenticated portal with no replacement authenticator and no way to create an account. The check that caught it cost seconds.
**Source:** 01-06-SUMMARY.md (deviation 1)

---

### A documented break-glass path is not a real one until something creates it
`ops/README.md` documented `backstage` at `/opt/cinedise-portal/bin/backstage`. The deploy workflow built and installed only `backend`, and the sudoers grant named its install source literally — so it *could not* have installed a second binary even by accident.

**Context:** The runbook had been correct-looking and non-functional since 01-03 landed. Only an operator actually reaching for the tool exposed it.
**Source:** 01-06-SUMMARY.md (deviation 2)

---

### Verify a deploy by artifact, not by its green check
A 30-second successful workflow run was confirmed only afterward via binary `strings`, migration state visible in the WAL, and process start time.

**Context:** The workflow had been "passing" by never running at all. A green check answers "did the job exit 0", not "is the thing I built now the thing that is running."
**Source:** 01-06-SUMMARY.md

---

### A rate limiter can silently corrupt an unrelated test's measurements
`login_enumeration_safety.rs`'s timing assertion first produced a ~940x gap in the *wrong* direction (unknown handle slow, wrong-password suspiciously fast). The 18 total login calls across both timing loops shared one peer address, exceeded `IP_BURST`=10 partway through the second loop, and later "wrong password" samples were refused with a cheap 429 in microseconds instead of running the real Argon2id verify.

**Context:** The failure looked like a security regression in the code under test. It was an artifact of the test harness sharing a rate-limit bucket. Every `/api/login`-driving test now attaches a distinct synthetic `cf-connecting-ip`.
**Source:** 01-04-SUMMARY.md (deviation 4)

---

### A test-only refill window must be longer than the time it takes to exhaust the burst
A 1-second refill window was shorter than the ~1.5–2s needed to make 5 real Argon2id-verifying login attempts in an unoptimized debug build. The limiter began refilling *while* the test was still exhausting the initial burst, so the expected 429 boundary saw a 401.

**Context:** Raised to 5 seconds (sleep 5.2s), still well inside the 30s suite budget. The general shape: any self-heal test needs its window to exceed the cost of the work that fills the bucket.
**Source:** 01-04-SUMMARY.md (deviation 5)

---

### A plan's own literal grep acceptance-checks can be tripped by the code written to satisfy them
Three separate instances: 01-01's Cloudflare Access source-scan test necessarily discusses the forbidden header name; 01-03's test doc comment contained `:memory:`; 01-05's `auth-copy.ts` doc used the lowercase word "react" in prose and `layout.tsx` named `HealthSocketProvider` literally.

**Context:** Each was fixed by rewording or splitting the literal (`"Cf-Acce" + "ss-Jwt-Assertion"`), not by weakening the check. Worth anticipating when writing a grep-based acceptance criterion for a guard that must name the thing it guards against.
**Source:** 01-01-SUMMARY.md, 01-03-SUMMARY.md, 01-05-SUMMARY.md

---

### The address axis's guarantee is thinner than its own doc comment claims
`CfConnectingIpExtractor` reads `cf-connecting-ip`, then falls back to `ConnectInfo<SocketAddr>`, erroring only when *neither* resolves. Behind a tunnel the peer address is always `127.0.0.1` — so a future loss of the header collapses every caller on the internet into one shared 10-request bucket, silently, with no error and no log line.

**Context:** The doc comment describes the fail-closed branch as preventing exactly that collapse. Latent today (the header demonstrably arrives). Left in place and documented rather than changed, because altering security behaviour was outside 01-06's scope. Recorded in `ops/README.md` § Connecting-IP finding.
**Source:** 01-06-SUMMARY.md (Issues Encountered), 01-04-SUMMARY.md

---

### A same-URL self-redirect is the redirect loop the browser actually catches
`proxy.ts`'s literal 6-step algorithm redirected to `/login` on both an invalid session and a fail-closed validation failure, with no exception for a request already *for* `/login`. A stale-but-present cookie hitting `/login` would validate, fail, and redirect back to `/login`.

**Context:** Guarded by degrading to `NextResponse.next()` when `pathname === "/login"` on both branches. This does not weaken the fail-closed guarantee — nothing is authenticated by the guard; it only stops a hang on the one page that needs no further gating from itself.
**Source:** 01-05-SUMMARY.md (deviation 1)

---

### An unverifiable claim is worth recording as a positive tested contract, not leaving silent
A ticket minted while a session was live stays redeemable for the remainder of its 60s single-use TTL after that session logs out. This is a real gap (D-04), and it now has a test asserting the gap exists.

**Context:** Writing the test turns an accepted limitation into something a future change cannot quietly alter without a failing build. Phase 3's `SessionRevocationBus` (ADMIN-03) is the named work that closes it.
**Source:** 01-02-SUMMARY.md (coverage D3)

---

## Patterns

### Source-scanning regression test as a guard against re-introduction
A `#[cfg(test)]` test that greps the crate's own source files for a forbidden string (the Cloudflare Access assertion header) and fails the build if it reappears.

**When to use:** When the thing you must prevent is invisible to the type system — a deleted code path that could be re-added, a header name that must never be read again. Used twice in this phase.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md

---

### Source-parsed route inventory (`route_auth_coverage.rs`)
The test derives the registered path set by parsing `build_router`'s `.route(...)` string literals out of `lib.rs` at test time, then asserts set-equality against a reviewable markdown table. A route added without a matching row fails the build.

**When to use:** Any time a hand-maintained inventory must stay in sync with code and the framework exposes no enumeration API — axum 0.8's `Router` offers only `has_routes() -> bool`.
**Source:** 01-02-SUMMARY.md

---

### `route_layer`, never `layer`, for middleware scoped to specific routes in a merged router
**When to use:** Any axum middleware intended for a handful of registered routes inside a larger merged router. `layer` also wraps that sub-router's own 404 fallback; `route_layer` applies only to requests that match a registered route.
**Source:** 01-04-SUMMARY.md

---

### Parallel test-only constructor for any rate-limiter/governor config
`with_burst_and_refill` / `governor_config_with` alongside the production `new()` / `login_governor_config()`.

**When to use:** Whenever throttle self-heal needs proving. Lets an integration test demonstrate refill with a short real sleep instead of a real 30-or-60-second wait.
**Source:** 01-04-SUMMARY.md

---

### Distinct synthetic `cf-connecting-ip` per login call in any test driving `/api/login` repeatedly
**When to use:** Mandatory for any test in this crate making more than a handful of login calls. The production address axis has a fixed `IP_BURST` (unlike the injectable handle limiter), so shared-peer-address tests silently interfere with each other.
**Source:** 01-04-SUMMARY.md

---

### `verify_password(stored_hash: Option<&str>, password)` always runs a real Argon2 verify
Against a fixed dummy hash when `stored_hash` is `None`.

**When to use:** Every password-check call site in this codebase must reuse this shape, not reimplement it. It is the single place D-18's timing-consistency property lives.
**Source:** 01-01-SUMMARY.md

---

### One shared cookie-attribute builder (`session_cookie()`)
`build_session_cookie` and `clear_session_cookie` both construct through it.

**When to use:** Whenever a cookie and its clearing counterpart must carry identical attributes. Browsers ignore a clear whose attributes don't match — a drift here is a silent logout failure.
**Source:** 01-02-SUMMARY.md

---

### A cross-cutting policy gate belongs in the auth extractor, consulting one exported constant
Never scattered per-handler.

**When to use:** Any policy that must hold for every authenticated route, present and future. This phase's `MUST_CHANGE_EXEMPT_PATHS` is the template; Phase 2's role checks should land on the same seam.
**Source:** 01-02-SUMMARY.md

---

### Rate limiter as an oracle for header propagation
Poison a known limiter key locally (exhaust the address-axis bucket for this host's public IP via direct `127.0.0.1` requests carrying an explicit `cf-connecting-ip`), then observe whether a real through-the-tunnel request lands in that same bucket.

**When to use:** Proving a header survives a proxy or tunnel when you have no echo route and no second network. Only a key resolving to that same address lands in that bucket. Used distinct throwaway handles throughout to keep the handle axis from confounding the result.
**Source:** 01-06-SUMMARY.md

---

### Pure, framework-free `lib/*.ts` module with a matching `lib/*.test.ts` under `node:test`
`auth-copy.ts` and `password-rules.ts` both follow `lib/theme.ts`'s existing precedent, exercised by `npm run test`'s `lib/*.test.ts` glob.

**When to use:** Any user-facing copy, formatting, or validation logic. It gets real unit coverage (a full 1–600-second boundary sweep, in `formatRetryDuration`'s case) with no DOM environment required — which matters because this repo's test runner has none.
**Source:** 01-05-SUMMARY.md, 01-06-SUMMARY.md

---

## Surprises

### The entire phase had never been deployed — discovered at the cutover, not before
42 unpushed commits; the path-filtered deploy workflow had never fired; the live binary predated every Phase 1 backend commit.

**Impact:** Near-miss of the highest order. Deleting Cloudflare Access one step later would have left an unauthenticated portal with no replacement authenticator and no way to create an account. Turned a 3-step cutover task into a deploy-repair, a sudoers change, and an artifact-level verification pass.
**Source:** 01-06-SUMMARY.md

---

### `.layer()` on a sub-router also wraps that sub-router's own 404 fallback
Caught empirically — `download_ticket_scope.rs`'s `the_serving_url_carries_no_filename_segment` turned from 404 to 500 — not by inspection or code review.

**Impact:** A genuine axum-semantics discovery that a review-only pass would very plausibly have missed, since the failing route had nothing to do with the routes the middleware was meant to cover.
**Source:** 01-04-SUMMARY.md

---

### `rand_core`'s `OsRng` was feature-gated out of the build
`argon2`'s `rand` feature turns on `password-hash`'s `rand_core` *dependency* but not its `getrandom` *feature*, which is what gates `OsRng` itself.

**Impact:** A first-build failure with a confusing "cannot resolve" shape. Fixed by adding `rand_core = { version = "0.6", features = ["getrandom"] }` as a direct dependency so Cargo's feature unification applies it to the single shared resolution.
**Source:** 01-01-SUMMARY.md (deviation 1)

---

### No `[[bin]]` Cargo.toml entry was needed for `backstage`
RESEARCH flagged this as Assumption A4, expecting a Cargo.toml change.

**Impact:** `cargo build --bin backstage` succeeded on the first attempt via Cargo's default `src/bin/*.rs` auto-discovery. The assumption resolved itself at zero cost — worth noting as a case where flagged risk evaporated on contact.
**Source:** 01-03-SUMMARY.md

---

### `Option::unwrap_or_else` forced a `'static` lifetime on a shorter-lived borrow
`stored_hash.unwrap_or_else(dummy_hash_str)` made the compiler infer the whole expression's lifetime as `'static` (matching `dummy_hash_str`'s return), which the real borrow could not satisfy — "borrowed data escapes outside of function."

**Impact:** Replaced with a plain `match`, whose arms shorten each lifetime independently via ordinary covariance rather than generic invariant unification. A non-obvious failure mode of an idiom that reads as obviously equivalent.
**Source:** 01-01-SUMMARY.md (deviation 2)

---

### Next 16 required a Suspense boundary around `useSearchParams()`
`next build` failed prerendering `/login` — a mechanical build requirement the plan's action text did not anticipate.

**Impact:** Split into an outer `LoginPage` (Suspense wrapper) and inner `LoginForm`. `fallback={null}` rather than a skeleton, because `proxy.ts` resolves the auth decision server-side before the page is ever reached — there is nothing session-related to show.
**Source:** 01-05-SUMMARY.md (deviation 2)

---

### Two review findings survived to the verification pass and had to be re-confirmed present
CR-01 (rate-limiter fallback key unbounded pre-auth) and WR-01 (`current_password` unbounded before Argon2 verify) were surfaced by `01-REVIEW.md`, still present at verification time at the exact cited lines, and only fixed afterward in `b4b10c8` and `dc24d45`.

**Impact:** CR-01 in particular sat on `POST /api/login` — the studio's literal front door now that Access is gone, and the one subsystem that used to have Access sitting in front of it. The verification pass explicitly refused to let it carry forward silently, forcing an accept-or-fix decision. Both were fixed before phase close.
**Source:** 01-REVIEW.md, 01-VERIFICATION.md, 01-REVIEW-FIX.md
