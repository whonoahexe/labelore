---
phase: 01
phase_name: "member-sign-in-sessions"
project: "Lendshed"
generated: "2026-03-14"
counts:
  decisions: 14
  lessons: 9
  patterns: 10
  surprises: 7
missing_artifacts: []
---

# Phase 01 Learnings: Member Sign-In & Sessions

## Decisions

### Every sign-in failure returns one identical 401 body
`UnknownMember`, `BadPasscode`, and `Suspended` produce the same body, not merely the same status code.

**Rationale:** The plan only required that an unknown handle and a wrong passcode look alike. Extending it to suspended members keeps the guard uniformly closed; a different `Suspended` body would reveal that an account exists.
**Source:** 01-01-SUMMARY.md

---

### 423 Locked — not 401 or 403 — for `SessionError::PasscodeExpired`
CONTEXT.md left the status open; 423 was picked on purpose.

**Rationale:** Phase 2's role denials will return 403 from the same `requireMember` seam. Keeping 423 for "set a new passcode first" means the two policy classes never share a status.
**Source:** 01-02-SUMMARY.md

---

### The expired-passcode gate lives inside `requireMember`, consulting one exported list
`EXPIRED_EXEMPT_ROUTES` is the single constant the guard checks and `route-guard-coverage.test.ts` audits — never a per-handler field check.

**Rationale:** One seam covers every present *and future* route. A per-handler check is a habit a new route can skip; a seam it cannot.
**Source:** 01-02-SUMMARY.md, 01-02-PLAN.md (RESEARCH Pattern 2 / Pitfall 4)

---

### `app.use`, not `app.all`, for scoping the throttle to the sign-in routes
The router's `all` also wraps its own not-found handler; `use` with a path prefix wraps matched routes only.

**Rationale:** With `all`, every unmatched request still ran through the address-keyed throttle on its way to a 404, turning an unrelated 404 into a 500 whenever no key resolved.
**Source:** 01-04-SUMMARY.md (deviation 1, confirmed against router 4.2 source)

---

### Hash helpers imported only through `hashkit`'s own re-export
Never through the standalone `kdf-core` 2.1 package, even though the phase added it.

**Rationale:** The dependency tree resolves two different versions of `kdf-core`. Mixing them fails to typecheck.
**Source:** 01-01-SUMMARY.md

---

### A suspended member's sign-in still runs a real hash check before failing
The `suspendedAt` test is combined with the check result afterward, never short-circuited before it.

**Rationale:** Short-circuiting would bring back the timing leak D-18 exists to close, just for another account state. Not in the plan's must-haves; adopted for consistency.
**Source:** 01-01-SUMMARY.md (deviation 4, Rule 2 security)

---

### The session purge on passcode change runs inside the same transaction as the hash write
Not a best-effort pair of queries.

**Rationale:** D-03 says a passcode change ends every *other* session. Two sequential queries leave a window where the hash is new but old sessions still work.
**Source:** 01-02-SUMMARY.md

---

### `shedctl` rejects passcode-carrying CLI flags rather than ignoring them
`parseArgs` scans every argument for a passcode-flag shape (`--passcode`, `-p`, `--pw`, any `=value` suffix) before dispatching a subcommand.

**Rationale:** Ignoring the flag would let the steward think a passcode was set; honouring it would put a secret in shell history. A distinct error points them at stdin.
**Source:** 01-03-SUMMARY.md

---

### `resetPasscode` treats an unnormalizable handle as `NotFound`, not a separate error
Normalization failure short-circuits into `NotFound` before the database is touched.

**Rationale:** To the caller both outcomes mean "no account has this handle". A separate `InvalidHandle` would be a distinction without a difference.
**Source:** 01-03-SUMMARY.md

---

### Deleted the whole kiosk proxy *route*, not just its allow-list
The route covering both `desk.lendshed.example` and `api.lendshed.example` was removed.

**Rationale:** A proxy route with an empty allow-list still intercepts every request and matches none. Dropping only the list would trade a banner for a hard outage.
**Source:** 01-06-SUMMARY.md

---

### Snapshotted the kiosk route and list to a 0600 file outside the repo before deleting
`~/lendshed-kiosk-rollback-20260312.json`.

**Rationale:** The plan rated reversibility `costly` since a rebuild starts from scratch. The snapshot makes it a five-minute dashboard job. Kept outside the repo because it names one person's address.
**Source:** 01-06-SUMMARY.md

---

### `shedctl` installs *before* the service swap in the deploy script
Not after.

**Rationale:** A deployed service runs its migrations on start. A CLI install that fails afterward leaves a `members` table with nobody in it and no tool to seed the first account.
**Source:** 01-06-SUMMARY.md

---

### `retryAfter` rides in the JSON body only, not in a CORS expose-headers entry
The plan offered this as an explicit either/or.

**Rationale:** The simpler of the two, and the one the frontend plan was already written against.
**Source:** 01-04-SUMMARY.md

---

### `gate.ts` forwards the session cookie through an explicitly rebuilt `Cookie` header
Not `credentials: "include"` alone.

**Rationale:** A server-side fetch has no cookie jar to include. `credentials: "include"` stays only because it is this codebase's fetch convention; the real signal is the hand-forwarded header.
**Source:** 01-05-SUMMARY.md

---

## Lessons

### Cutover preconditions are load-bearing, not ceremony
Task 3's step-1 `shedctl list` — a routine check — showed the phase had never been deployed. The live build was from 2026-03-02, older than every Phase 1 server commit; it held no `session_cookie` references at all; the live database had no `members` or `sessions` tables; **31 commits were unpushed** because the path-filtered deploy job had never run.

**Context:** Removing the kiosk route then would have exposed an unguarded app with no replacement sign-in and no way to create an account. The check cost seconds.
**Source:** 01-06-SUMMARY.md (deviation 1)

---

### A documented break-glass path is not real until something creates it
`ops/README.md` placed `shedctl` at `/opt/lendshed/bin/shedctl`. The deploy job built and installed only `server`, and the sudoers grant named its install source literally — so it *could not* have installed a second binary.

**Context:** The runbook had looked right and done nothing since 01-03 landed. Only an operator reaching for the tool exposed it.
**Source:** 01-06-SUMMARY.md (deviation 2)

---

### Verify a deploy by artifact, not by its green check
A 20-second successful job was confirmed afterward by reading the binary's strings, the migration state, and the process start time.

**Context:** The job had been "passing" by never running. A green check says the job exited 0, not that what you built is what is running.
**Source:** 01-06-SUMMARY.md

---

### A throttle can quietly corrupt an unrelated test's timings
`sign-in-timing.test.ts` first showed a ~900x gap in the *wrong* direction (unknown handle slow, wrong passcode suspiciously quick). Twelve sign-in calls across two loops shared one peer address, passed `IP_BURST`=8 mid-way through the second, and later samples were refused with a cheap 429 instead of running the real hash check.

**Context:** It looked like a security regression. It was the harness sharing a throttle bucket. Every test that drives `/api/sign-in` now sends a distinct synthetic `x-client-ip`.
**Source:** 01-04-SUMMARY.md (deviation 4)

---

### A test-only refill window must outlast the time needed to drain the burst
A 1-second refill was shorter than the ~1.5–2s needed for 5 real hash-checking attempts in an unoptimized build. The bucket refilled *during* the drain, so the expected 429 boundary saw a 401.

**Context:** Raised to 4 seconds (sleep 4.2s), still inside the 30s suite budget. Any self-heal test needs a window longer than the work that fills the bucket.
**Source:** 01-04-SUMMARY.md (deviation 5)

---

### A plan's literal grep checks can be tripped by the code written to satisfy them
Three cases: 01-01's source-scan test must mention the forbidden header; 01-03's test comment contained `:memory:`; 01-05's `copy.ts` doc used the lowercase word "next" and `layout.tsx` named `LiveStatusProvider` literally.

**Context:** Each was fixed by rewording or splitting the literal (`"X-Edge-" + "Member-Id"`), never by weakening the check. Expect this whenever a guard has to name the thing it forbids.
**Source:** 01-01-SUMMARY.md, 01-03-SUMMARY.md, 01-05-SUMMARY.md

---

### The address key's guarantee is thinner than its own comment claims
`clientIpKey` reads `x-client-ip`, then falls back to the socket address, and errors only when *neither* resolves. Behind a tunnel the socket address is always `127.0.0.1` — so losing the header would put every caller into one shared 8-request bucket, silently.

**Context:** The comment says the fail-closed branch prevents exactly that. Latent today, since the header does arrive. Documented rather than changed, as altering security behaviour was outside 01-06's scope. Noted in `ops/README.md`.
**Source:** 01-06-SUMMARY.md (Issues Encountered), 01-04-SUMMARY.md

---

### A self-redirect to the same URL is the loop the browser actually catches
`gate.ts` redirected to `/sign-in` on both an invalid session and a failed validation, with no exception for a request already *for* `/sign-in`. A stale cookie hitting that page would validate, fail, and bounce back to itself.

**Context:** Guarded by passing the request through when `pathname === "/sign-in"` on both branches. Fail-closed is intact: the guard authenticates nothing there.
**Source:** 01-05-SUMMARY.md (deviation 1)

---

### An unverifiable claim is worth recording as a tested contract, not left silent
A ticket minted while a session was live stays redeemable for the rest of its 45s single-use TTL after that session signs out. That is a real gap (D-04), and a test now asserts it exists.

**Context:** The test makes an accepted limitation impossible to change quietly. Phase 3's `SessionRevocationBus` (ADMN-03) is the work that closes it.
**Source:** 01-02-SUMMARY.md (coverage D3)

---

## Patterns

### Source-scanning regression test as a guard against re-introduction
A test that greps the project's own source for a forbidden string (the edge-proxy identity header) and fails the build if it returns.

**When to use:** When what you must prevent is invisible to the type system — a deleted code path that could come back, a header that must never be read again. Used twice here.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md

---

### Source-parsed route inventory (`route-guard-coverage.test.ts`)
The test reads the registered path set out of `buildRouter`'s `.route(...)` string literals at test time, then asserts set-equality with a reviewable markdown table. A route added without a row fails the build.

**When to use:** Whenever a hand-kept inventory must match code and the framework exposes no way to list routes — the router offers only `hasRoutes()`.
**Source:** 01-02-SUMMARY.md

---

### `use`, never `all`, for middleware scoped to specific routes in a merged router
**When to use:** Any middleware meant for a handful of routes inside a larger merged router. `all` also wraps that sub-router's own not-found handler; a prefixed `use` reaches only matched routes.
**Source:** 01-04-SUMMARY.md

---

### Parallel test-only constructor for any throttle config
`withBurstAndRefill` / `throttleConfigWith` beside the production `new()` / `signInThrottleConfig()`.

**When to use:** Whenever throttle self-heal needs proving. Lets an integration test show a refill with a short real sleep rather than a 30-second wait.
**Source:** 01-04-SUMMARY.md

---

### Distinct synthetic `x-client-ip` per sign-in call in any test driving `/api/sign-in` repeatedly
**When to use:** Mandatory for any test here making more than a handful of sign-in calls. The production address key has a fixed `IP_BURST`, unlike the injectable handle limiter, so tests sharing a peer address interfere.
**Source:** 01-04-SUMMARY.md

---

### `checkPasscode(storedHash: string | null, passcode)` always runs a real hash check
Against a fixed dummy hash when `storedHash` is `null`.

**When to use:** Every passcode-check call site must reuse this shape, not reimplement it. It is the one place D-18's timing property lives.
**Source:** 01-01-SUMMARY.md

---

### One shared cookie-attribute builder (`sessionCookie()`)
`buildSessionCookie` and `clearSessionCookie` both build through it.

**When to use:** Whenever a cookie and its clearing twin must carry identical attributes. Browsers ignore a clear whose attributes differ — drift is a silent sign-out failure.
**Source:** 01-02-SUMMARY.md

---

### A cross-cutting policy gate belongs in the auth guard, consulting one exported constant
Never scattered per handler.

**When to use:** Any policy that must hold for every signed-in route, now and later. `EXPIRED_EXEMPT_ROUTES` is the template; Phase 2's role checks should land on the same seam.
**Source:** 01-02-SUMMARY.md

---

### Throttle as an oracle for header propagation
Fill a known throttle key locally (drain the address bucket for this host's public IP through direct `127.0.0.1` requests carrying an explicit `x-client-ip`), then see whether a real through-the-tunnel request lands in that same bucket.

**When to use:** Proving a header survives a proxy when you have no echo route and no second network. Only a key resolving to that address lands in that bucket. Distinct throwaway handles kept the handle axis from confounding the result.
**Source:** 01-06-SUMMARY.md

---

### Pure, framework-free `lib/*.ts` module with a matching `lib/*.test.ts`
`copy.ts` and `passcode-rules.ts` both follow `lib/theme.ts`, and run under the `lib/*.test.ts` glob.

**When to use:** Any user-facing copy, formatting, or validation logic. It gets real unit coverage (a full 1–300-second boundary sweep for `formatRetryDuration`) with no DOM, which matters because this repo's runner has none.
**Source:** 01-05-SUMMARY.md, 01-06-SUMMARY.md

---

## Surprises

### The whole phase had never been deployed — found at the cutover, not before
31 unpushed commits; the path-filtered deploy job had never run; the live build predated every Phase 1 server commit.

**Impact:** A near miss. Deleting the kiosk route one step later would have left an unguarded app with no sign-in and no way to make an account. A 3-step cutover became a deploy repair, a sudoers change, and an artifact-level check.
**Source:** 01-06-SUMMARY.md

---

### `app.all()` on a sub-router also wraps that sub-router's own not-found handler
Caught by running it — `download-ticket-scope.test.ts`'s `the serving url carries no filename segment` went from 404 to 500 — not by inspection or review.

**Impact:** A real router-semantics find a review-only pass would likely have missed, since the failing route had nothing to do with those the middleware was meant to cover.
**Source:** 01-04-SUMMARY.md

---

### `kdf-core`'s `randomBytes` was feature-gated out of the build
`hashkit`'s `rand` feature turns on `kdf-core`'s `entropy` *dependency* but not its `osrng` *feature*, which is what gates `randomBytes` itself.

**Impact:** A first-build failure with a confusing "cannot resolve" shape. Fixed by naming `entropy-src` with its `osrng` feature as a direct dependency, so feature unification applies it to the one shared resolution.
**Source:** 01-01-SUMMARY.md (deviation 1)

---

### No `bin` entry was needed for `shedctl`
RESEARCH flagged this as Assumption A4, expecting a manifest change.

**Impact:** `build --bin shedctl` worked first time through default `src/bin/*` discovery. The flagged risk vanished on contact.
**Source:** 01-03-SUMMARY.md

---

### `Option.orElse` forced a `static` lifetime on a shorter-lived borrow
`storedHash.orElse(dummyHashRef)` made the compiler infer the whole expression's lifetime as `static` (matching `dummyHashRef`), which the real borrow could not satisfy — "borrowed data escapes outside of function."

**Impact:** Replaced with a plain `match`, whose arms shorten each lifetime separately. A non-obvious failure from an idiom that reads as equivalent.
**Source:** 01-01-SUMMARY.md (deviation 2)

---

### The framework required a Suspense boundary around `useSearchParams()`
The production build failed prerendering `/sign-in` — a mechanical requirement the plan's action text did not foresee.

**Impact:** Split into an outer `SignInPage` (Suspense wrapper) and inner `SignInForm`. `fallback={null}` rather than a skeleton, because `gate.ts` settles the auth decision server-side before the page is reached.
**Source:** 01-05-SUMMARY.md (deviation 2)

---

### Two review findings were still open at the verification pass and had to be re-checked
CR-01 (the throttle's fallback key was unbounded before auth) and WR-01 (`currentPasscode` was unbounded before the hash check) came from `01-REVIEW.md`, were still present at the cited lines at verification, and were only fixed afterward in `c41e9a7` and `7d02b6f`.

**Impact:** CR-01 sat on `POST /api/sign-in`, the app's literal front door now that the kiosk route is gone. The verification pass refused to carry it forward silently and forced an accept-or-fix call. Both were fixed before phase close.
**Source:** 01-REVIEW.md, 01-VERIFICATION.md, 01-REVIEW-FIX.md
