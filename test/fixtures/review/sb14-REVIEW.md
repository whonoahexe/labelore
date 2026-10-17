---
phase: 02-token-minting-contract-sfu-verification
reviewed: 2026-06-11T08:54:31Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - sfu.sideby.me/src/signaling/auth.ts
  - sfu.sideby.me/src/signaling/gateway.ts
  - sfu.sideby.me/src/signaling/handlers.ts
  - sfu.sideby.me/src/mediasoup/peer.ts
  - sfu.sideby.me/src/contract/schema.ts
  - sfu.sideby.me/src/config.ts
  - sfu.sideby.me/src/signaling/protocol.ts
  - sfu.sideby.me/dev/e2e-join.ts
  - sync.sideby.me/src/server/services/TokenMinter.ts
  - sync.sideby.me/src/server/http/media-token.ts
  - sync.sideby.me/src/server/socket/handlers/media-token.ts
  - sync.sideby.me/src/server/redis/handlers/media-room.ts
  - sync.sideby.me/src/server/redis/index.ts
  - sync.sideby.me/src/server/socket/index.ts
  - sync.sideby.me/src/index.ts
  - sync.sideby.me/src/types/schemas.ts
blockers_resolved: "CR-01 (sfu f6ad4d8), CR-02 (sync 812d8ba) — fixed 2026-06-11"
findings:
  critical: 0
  critical_original: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-06-11T08:54:31Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase implements HS256 admission-token minting (sync) and offline token verification (SFU). The cryptographic core is largely sound: `algorithms: ['HS256']` is correctly pinned on `jwtVerify` (alg-confusion prevented), `clockTolerance` is applied, the `mediaRoomId` binding is checked against the token claim, `canPublish` is derived server-side and enforced at produce time before any mediasoup call, and the `participantId` is an opaque HMAC that never exposes the userId. Tests cover the main behaviors.

However the adversarial pass surfaced two BLOCKER-class issues. First, `verifyJoin` never enforces a `participantId` binding between the token claim and the client-supplied join field, so a holder of a valid token can impersonate a *different* opaque participant within the same room, breaking the D-06 active-peer guard and the per-participant broadcast model. Second, there is a silent token-failure trap: `mintJoinToken`/`deriveParticipantId` use the non-null assertion `process.env.SFU_TOKEN_SECRET!` rather than reading from a validated config, so if the env var is unset the minter signs with the string `"undefined"` (or HMACs with it) instead of failing fast — producing tokens the SFU cannot verify, or worse, signing with a predictable secret. Several WARNING-class robustness gaps round out the report (missing claim-schema validation in `verifyJoin`, non-timing-safe secret comparison, swallowed HTTP route errors, missing `participantId` derivation cross-check, request-body schema mismatch).

## Critical Issues

### CR-01: verifyJoin does not bind the token's participantId — cross-participant impersonation

**File:** `sfu.sideby.me/src/signaling/auth.ts:63-97`
**Issue:** `verifyJoin` enforces the `mediaRoomId` binding (token claim must equal the join-message field) but performs **no equivalent check on `participantId`**. The join message carries a client-supplied `participantId` (protocol.ts:33), and the comment at protocol.ts:24 claims "the SFU trusts only the TOKEN's claim values." The function does correctly return `payload['participantId']` as truth — so far so good — but because there is no binding assertion, a single valid token is effectively a bearer credential for *whatever participant the token was minted for*, and there is no check that the message's `participantId` matches the token.

The deeper problem: the SFU keys all room state (`room.peers`, broadcast exclusion in gateway.ts:56, the D-06 guard at auth.ts:75) on the token's `participantId`. Since `deriveParticipantId` is a deterministic HMAC of `(mediaRoomId:userId)`, two distinct users in the same room get distinct tokens with distinct participantIds — that is fine. But there is no defense against a malicious client who obtains *any* valid token (e.g. their own) and replays it: the D-06 guard (auth.ts:75) is the only thing preventing a duplicate join, and it relies entirely on an already-active peer existing. A token replayed *after* the original peer's WS closes (the SFU-08 teardown deletes the peer, auth.ts comment lines 71-73) sails through — the admission TTL is 120s, so a captured token is replayable for up to 2 minutes against the same opaque participant slot. Combined with the absent message↔token participantId binding, the contract comment's stated invariant ("SFU uses token's claim as truth, not these client-supplied fields") is only half-implemented: it ignores the client field for *authorization* but never *validates* it, so the binding check the protocol documents does not exist.

**Fix:** Add the symmetric participantId binding immediately after the mediaRoomId check:
```ts
// 3b. participantId binding — mirror the mediaRoomId check (protocol.ts:33 documents
// the client sends participantId for "binding check only"). Reject token/field skew.
if (payload['participantId'] !== message.payload.participantId) {
  return { ok: false, reason: 'participantId_mismatch' };
}
```
Separately, document/track the 120s replay window as an accepted risk or add a one-time-use jti nonce (Redis SETNX) if replay within the admission TTL is in scope.

### CR-02: Token minter signs with `process.env.SFU_TOKEN_SECRET!` — silent failure / predictable-secret signing

**File:** `sync.sideby.me/src/server/services/TokenMinter.ts:29,64`
**Issue:** Both `getSignKey()` (line 29) and `deriveParticipantId()` (line 64) read the secret directly via the TypeScript non-null assertion `process.env.SFU_TOKEN_SECRET!`. The `!` only silences the compiler — it provides **zero runtime guarantee**. If `SFU_TOKEN_SECRET` is unset or empty at runtime (mis-deployed droplet, forgotten env var), `new TextEncoder().encode(undefined as unknown as string)` encodes the literal — and `createHmac('sha256', secret)` with `secret = undefined` throws, but the participant path falls back to `process.env.SFU_TOKEN_SECRET!` (line 64) which can also be `undefined`. The sync side has **no `requireEnv` guard** equivalent to the SFU's `config.ts:12-20` (which correctly throws on missing `SFU_TOKEN_SECRET`). This means:

1. sync can boot and mint tokens with a degenerate/empty key while the SFU has hard-failed to boot (or booted with a real key) → every token is unverifiable, a silent total outage of the media join path.
2. Worse, an asymmetry where sync uses a default-ish empty key is a predictable-secret signing risk.

The SFU enforces this invariant (`requireEnv('SFU_TOKEN_SECRET')`); the minting side must enforce the identical invariant or the two halves can drift undetected.

**Fix:** Read the secret once through a fail-fast accessor, mirroring SFU `config.ts`:
```ts
function requireSecret(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
function getSignKey(): { key: Uint8Array; alg: string } {
  return { key: new TextEncoder().encode(requireSecret('SFU_TOKEN_SECRET')), alg: 'HS256' };
}
// deriveParticipantId:
const secret = process.env.SFU_PARTICIPANT_SECRET?.trim() || requireSecret('SFU_TOKEN_SECRET');
```

## Warnings

### WR-01: verifyJoin never validates claims against MediaTokenClaimsSchema — unchecked type casts

**File:** `sfu.sideby.me/src/signaling/auth.ts:74-95`
**Issue:** The SFU carries `MediaTokenClaimsSchema` (contract/schema.ts) specifically to validate the five custom claims, but `verifyJoin` never calls it. Instead it reaches into the raw `JWTPayload` with unchecked casts: `payload['participantId'] as string` (line 75), `payload['canPublish'] as boolean` (line 94), `payload['protocolVersion']` (the gate at line 82 actually reads `message.payload.protocolVersion`, NOT the token claim — see WR-02). A token signed with the correct secret but missing `canPublish` yields `undefined as boolean` → falsy → silently downgrades the peer to subscriber-only with no rejection. A token with `canPublish: "true"` (string) casts to a truthy non-boolean. The drift-catch test exists but only runs the *sample* vector through the schema, not the live verification path — so a malformed-but-signed token bypasses the schema entirely at runtime.

**Fix:** After `jwtVerify`, validate: `const claims = MediaTokenClaimsSchema.safeParse(payload); if (!claims.success) return { ok: false, reason: 'claims_invalid' };` then use `claims.data.*` for the typed values instead of `as` casts.

### WR-02: protocolVersion gate checks the client field, not the token claim

**File:** `sfu.sideby.me/src/signaling/auth.ts:81`
**Issue:** The D-08 major-version gate reads `message.payload.protocolVersion` (the untrusted client-supplied field) rather than the verified token claim `payload['protocolVersion']`. The token *carries* a `protocolVersion` claim (it is one of the five signed claims, schema.ts:33), but the gate ignores it. A client can therefore send any `protocolVersion` in the join message independent of what was signed. This is not directly exploitable for privilege escalation, but it contradicts the file's own HARD INVARIANT ("use token claims, NOT message.payload") and means the signed protocolVersion is never actually enforced.

**Fix:** Gate on the token claim: `const tokenVersion = (payload['protocolVersion'] as number) ?? 0;` and compare `Math.floor(tokenVersion)` against `config.protocolVersion`. Optionally also assert the client field matches the claim.

### WR-03: S2S secret comparison is not timing-safe

**File:** `sync.sideby.me/src/server/http/media-token.ts:59`
**Issue:** The `X-Sync-Secret` gate uses `req.headers['x-sync-secret'] === process.env.SYNC_ADMIN_SECRET` — a short-circuiting string `===` that leaks length and per-character timing. The same pattern exists in the SFU `admin.ts` `isAuthorized`. For a server-to-server secret this is low-likelihood (attacker needs network position and many samples), but it is a real timing side-channel on a credential check and the codebase has `node:crypto` available. The phase brief explicitly calls out "timing-safe compare" as a focus area.

**Fix:** Use a constant-time compare:
```ts
import { timingSafeEqual } from 'node:crypto';
function safeEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
```

### WR-04: HTTP route error handlers swallow errors and never log

**File:** `sync.sideby.me/src/index.ts:34-54`
**Issue:** The three route `.catch(err => { res.statusCode = 500; res.end('internal error'); })` blocks (lines 35-37, 42-44, 49-51) discard `err` entirely — no `logEvent`, no stack. The `err` parameter is bound but unused. A 500 from `/api/media/token` (e.g. a Redis outage in `ensureMediaRoomId`) produces a blank "internal error" with no server-side trace, making the token-mint path effectively undebuggable in production. (The handler's own try/catch logs, but any throw that escapes it — or a synchronous throw before the handler's try — is lost here.)

**Fix:** Log before responding: `.catch(err => { logEvent({ level: 'error', domain: 'media', event: 'route_error', message: String(err), meta: { url: req.url } }); if (!res.headersSent) { res.statusCode = 500; res.end('internal error'); } });`

### WR-05: Socket and HTTP mint paths derive participantId/canPublish independently — drift risk

**File:** `sync.sideby.me/src/server/socket/handlers/media-token.ts:40-56` and `sync.sideby.me/src/server/http/media-token.ts:104-122`
**Issue:** The two mint entry points each independently compute `canPublish` and assemble the claim set. The socket handler computes `canPublish = socket.data.isHost || !(room?.settings?.isChatLocked ?? false)` (line 40-41); the HTTP handler computes `canPublish = isHost || !isChatLocked` (line 113). These are logically equivalent *today* but are duplicated business logic with no shared helper — a future change to the publish-gate rule (e.g. TOKEN-06 evolution) must be made in two places or the two mint paths will silently disagree, issuing tokens with different capabilities for the same user/room depending on which path was used. The claim assembly (`mintJoinToken({...})`) is likewise duplicated.

**Fix:** Extract a single `buildMediaTokenClaims({ isHost, isChatLocked, mediaRoomId, userId })` helper used by both handlers so the canPublish derivation and claim shape live in one place.

### WR-06: ensureMediaRoomId non-atomic read-before-write under reverse-mapping failure

**File:** `sync.sideby.me/src/server/redis/handlers/media-room.ts:32-47`
**Issue:** The race-safe lazy create uses `SET NX` correctly for the forward mapping, but the reverse mapping (`media:rev:{mediaRoomId}`, line 46) is written in a *separate, non-atomic* `SET` only by the race winner. If the process crashes between the forward `SET NX` (line 39) and the reverse `SET` (line 46), the forward mapping exists with a 24h TTL but the reverse mapping is permanently absent — and because the forward key now exists, no future call will ever re-run the reverse write (the early-return at line 34 / the NX no-op short-circuits it). Phase 4 CUT-02 depends on the reverse mapping; this leaves a silently-broken reverse lookup with no self-heal. Also: the non-null assertion at line 42 `(await redis.get(...))!` assumes the winner's value is readable, but a TTL expiry or eviction between the NX-loss and the re-read returns `null`, and `!` would mask it into a `null` mediaRoomId flowing into token claims.

**Fix:** Write both keys atomically via a MULTI/pipeline (or a Lua script), and on the NX-loss re-read guard against null: `const won = await redis.get(...); if (!won) throw new Error('media-room race re-read returned null');`

## Info

### IN-01: Dead/misleading Math.floor on protocolVersion

**File:** `sfu.sideby.me/src/signaling/auth.ts:80-82`
**Issue:** The comment says "Math.floor handles minor/patch semver sub-versions (e.g. 1.2 → 1)" but the protocol schema constrains `protocolVersion: z.number().int().min(1)` (protocol.ts:31) — fractional versions can never reach this code, so the `Math.floor` is dead defensive code with a comment implying a capability the schema forbids. Harmless, but misleading.
**Fix:** Drop the `Math.floor` or the comment; if semver-minor is genuinely intended, relax the schema to allow non-integers.

### IN-02: Defence-in-depth verifyJoin runs twice per join

**File:** `sfu.sideby.me/src/signaling/handlers.ts:75` (and gateway.ts:90)
**Issue:** `verifyJoin` is invoked at the gateway (gateway.ts:90) and then **again** inside `handleJoin` (handlers.ts:75), performing a second full HS256 verification + Redis-less room lookup on every successful join. The comment frames this as defence-in-depth, which is reasonable, but it doubles the crypto work per join and the two calls can disagree (the D-06 guard's `getRoom().peers.has()` is checked in verifyJoin *before* `ensureRoom`, then re-checked after). Acceptable for v1.4 but worth a note.
**Fix:** Pass the gateway's `JoinDecision` into `handleJoin` instead of re-verifying, or document the double-verify cost explicitly.

### IN-03: e2e harness PATH B treats any error as a pass

**File:** `sfu.sideby.me/dev/e2e-join.ts:298-301`
**Issue:** In the canPublish=false produce-guard test, the `else` branch (line 300) records a PASS for *any* error message, not just `produce_forbidden`. So a produce that fails for an unrelated reason (e.g. "unknown transport" because `transportId: 'does-not-exist'`) is counted as proof the canPublish guard fired — which it may not have. The guard *does* fire first in the real handler (handlers.ts:191), but the harness assertion does not actually distinguish the two failure modes, weakening the test's value.
**Fix:** Make the `else` branch a `fail` (or at least a soft warning) unless the message contains `produce_forbidden`.

### IN-04: Unused dead promise scaffolding in e2e harness

**File:** `sfu.sideby.me/dev/e2e-join.ts:346-351`
**Issue:** `closedPromise` is created, immediately resolved, `void`-ed, and never used (`closeCode` is also declared at 346 but the real wait uses `closePromise` at 362). Dead scaffolding left from an earlier iteration.
**Fix:** Remove lines 346-351 and the unused `closeCode` declaration at 346.

---

_Reviewed: 2026-06-11T08:54:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
