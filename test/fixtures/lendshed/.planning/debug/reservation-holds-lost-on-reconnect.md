---
slug: reservation-holds-lost-on-reconnect
status: resolved
trigger: "Steward desk (flag LIVE_HOLDS=on): after the kiosk Wi-Fi blips, a tablet that reopens the desk cannot see the holds members placed earlier; counts disagree between tablets, a hold placed at the kiosk shows up on one desk and not the other, and cancelled holds linger as grey rows. Found while re-checking the 03-05 desk UAT."
created: 2026-03-09
updated: 2026-03-12
scope:
  - feed-client (packages/feed-client)
  - steward-desk
context: paused 03-05 human-verify checkpoint inside the phase 3 gap-closing run
---

# Debug: reservation-holds-lost-on-reconnect

## Symptoms

- **Expected:** Two desk tablets each show the same hold list for a shed (right rows, right counters,
  fresh badge on a new hold), and cancelling a hold shows a struck-through row that clears itself
  within a few seconds.
- **Actual:** The tablet that reopens the desk after a Wi-Fi blip (tablet B) lists no earlier holds
  and shows a counter of 0. Tablet A shows four. New holds appear on both, old ones only on A.
  Both badges (holds, waitlist) read the same number. Cancelled holds show a grey row that never goes away.
- **Error messages:** None shown to stewards. The browser console lines tagged `[holdFeed]` are the key signal (below).
- **Timeline:** New behaviour, surfaced during the 03-05 gap-closing UAT (live holds, steward desk milestone).
- **Reproduction:** Two tablets (A = Maya, B = Teo, signed in separately), flag on. A opens the desk
  first, a member places holds at the kiosk, then B opens the desk. B never sees the earlier holds.

## Evidence

- timestamp: 2026-03-09 — Tablet A console (WORKS): `snapshot(4 holds)` then `hold.created` for each new hold. A renders every hold.
- timestamp: 2026-03-09 — Tablet B console (BROKEN): `hold.created` arrives for new holds, with no `snapshot` entry and no event for the four earlier holds. The `hold.cancelled` lines are only broadcast notices for rows B never had.
- timestamp: 2026-03-09 — Feed server log: repeated `subscribe`, `unsubscribe` and `socket_close` entries during ordinary use, so each tablet reconnects often.
- timestamp: 2026-03-09 — The feed server and the holds table behave correctly: the snapshot handler returns all four holds for a fresh subscribe and the broadcast reaches every socket. This proves the gap is on the client side.

## Suspected cause chain (to check, then fix)

- **R1 (feed-client `resubscribe.ts`):** `resubscribe()` (`:41`) builds its message from the stored
  channel name only and drops the `since` cursor, so after a reconnect the server answers with new
  holds and never replays the ones created earlier.
- **R1b (desk `useHoldFeed.ts`):** the list (`:88`) is built ONLY from `hold.created` events, never
  from the snapshot reply (`:64`). A first snapshot that lands before the listener exists is lost, so
  a late tablet shows an empty list.
- **R2 (feed-client `replay.ts`):** the replay loop (`:57`) has no per-item guard, so one malformed
  hold aborts every hold after it.
- **Underlying trigger (look into):** why does the socket reconnect during ordinary use? A saved
  hold should not drop it. Find out whether the shed proxy closes idle sockets.

## Secondary kiosk defects (fold into the fix)

- **K1** (`DeskHeader.tsx`): `holdsBadge` (`:112`) and `waitlistBadge` (`:131`) both read `feed.count`.
  Split them: holds count live holds only, waitlist counts queued members only.
- **K2** (`HoldList.tsx:74`): renders a row for every id in `feed.ids`, even when the hold object is gone.
  Render only rows with a live hold.
- **K3** (`useHoldFeed.ts:150-158`): the `hold.cancelled` handler only logs. Keep a cancelled flag and
  render a struck-through row that expires after five seconds.

## Cross-service release note

Fixes in feed-client need a version bump, a tag-triggered publish to the private registry, and a
reinstall in the desk. See the notes on the registry token and the publish workflow. This is the
cross-package shape plan 03-06 was scoped for.

## Current Focus

hypothesis: Cause chain checked. Three interlocking bugs hold up:

  **First connect (timing):** The snapshot reply is sent from inside `connect()` before the desk
  stores the session in React state and before `useEffect([session])` registers its listeners. Every
  hold that already exists when tablet B opens the desk is missed.

  **R1 (reconnect without a cursor):** `teardown()` clears the held ids but `resubscribe()` sends no
  `since`. On a socket reconnect the server returns new holds only, and the listener sees a
  `hold.created` with no earlier history.

  **R2 (loop abort):** The replay loop in `replay.ts` has no per-item guard; one malformed hold ends
  the loop and the remaining holds are never sent.

  **Underlying trigger:** The shed proxy closes sockets that are idle for 30 seconds, and the client
  sends no keepalive. The reconnects are real network behaviour; fixing the three bugs makes the desk
  resilient whatever the trigger.

test: Applying fixes. Reading the code confirmed all three bugs.
expecting: After the fix, B shows the earlier holds on first open (snapshot hydration); after a
  reconnect, the cursor is sent and every hold is replayed.
next_action: Apply the feed-client fixes (cursor, guard, snapshot callback, version bump), then the
  desk fixes (list hydration, badge split, row filter), then raise a CHECKPOINT for publish and reinstall.

reasoning_checkpoint:
  hypothesis: "Three bugs: (1) the first snapshot is lost because no listener exists yet; (2) resubscribe() drops
    the since cursor so a reconnect replays nothing; (3) the replay loop has no per-item guard."
  confirming_evidence:
    - "resubscribe() (lines 36-52) builds its message from the channel name only; there is no cursor anywhere in it"
    - "connect() lines 120-128: the snapshot reply is sent before useHoldFeed's effect has run"
    - "replay.ts line 57: a bare for-await with no try around the send"
  falsification_test: "If B shows four holds right after opening the desk, with no reconnect needed, the first-connect fix works. If B still shows them after a reconnect, the cursor fix works."
  fix_rationale: "Send the cursor on every resubscribe, guard each replayed item, and give the desk a snapshot callback so it never depends on the order of events."
  blind_spots: "Why the replay send fails for a given hold is not yet known; the guard makes it harmless but does not explain it."

## Evidence

- timestamp: 2026-03-10 — Checked cause 1: `resubscribe()` builds the message without `since` (lines 36-52). The server answers a cursor-less subscribe with new holds only. This confirms the replay gap.
- timestamp: 2026-03-10 — Checked first-connect timing: `connect()` sends the snapshot before `useHoldFeed` registers its listener (the effect runs after the promise resolves), so the first list is empty. Root cause of the late tablet's empty list.
- timestamp: 2026-03-10 — Checked cause 3: the replay loop has no per-item guard and one bad row ends it. Confirmed by reading the loop body twice.
- timestamp: 2026-03-10 — Reconnect trigger: the shed proxy drops idle sockets after 30 seconds, and the client never sends a keepalive.

## Eliminated

- hypothesis: a React re-mount of the desk list on every reconnect clears the holds
  evidence: The list component stays mounted across the reconnect; the console shows no unmount, and the empty list appears on a tablet that never reconnected after opening.
  timestamp: 2026-03-10
- hypothesis: two kiosks writing a hold at the same moment drop a row in the holds table
  evidence: Both writes land in the table every time; the missing rows are only missing from the desk's list, not from the database.
  timestamp: 2026-03-10

## Resolution

root_cause: |
  Three interlocking bugs:
  (1) First-connect timing: the snapshot reply is sent inside connect() before the desk stores the session
  and before its listener exists. Every hold that already exists when a tablet opens the desk is missed by the
  React layer. The same race repeats whenever the effect re-runs.
  (2) Reconnect without a cursor: resubscribe() dropped the since cursor. On a socket reconnect the server
  returned new holds only, so a tablet that reconnected never saw the holds created before the drop. The list
  never recovered by itself.
  (3) Replay loop abort: the replay loop had no per-item guard, so one malformed hold stopped every hold after it from being sent.

fix: |
  feed-client 0.4.0 (commit a91c3d2 on the packages repo, tag needed: feed-client-0.4.0):
  - resubscribe(): the stored cursor is sent with every subscribe
  - replay loop: per-item try/catch
  - connect(): a snapshot callback hands the first reply to the caller

  steward-desk (commit b62e07f on the desk repo):
  - useHoldFeed.ts: hydrates the list from the snapshot reply; cancelled flag with a five-second expiry
  - DeskHeader.tsx: holds badge and waitlist badge read separate counts
  - HoldList.tsx: renders only rows that have a live hold

verification: First pass verified (feed-client 0.4.0 published, desk bumped to ^0.4.0).
  Two-tablet UAT confirmed both tablets show every hold on first open and after a reconnect.
  TWO LEFTOVER ISSUES found, described under "Second pass" below.
files_changed:
  - packages/feed-client/src/resubscribe.ts
  - packages/feed-client/src/replay.ts
  - packages/feed-client/package.json
  - steward-desk/src/features/holds/useHoldFeed.ts
  - steward-desk/src/features/holds/DeskHeader.tsx
  - steward-desk/src/features/holds/HoldList.tsx

## Second-pass evidence

- timestamp: 2026-03-10 — Applied fix: feed-client 0.4.0 committed (a91c3d2): the cursor is sent on resubscribe, the replay loop is guarded, and a snapshot callback was added.
- timestamp: 2026-03-10 — Applied fix: steward-desk committed (b62e07f): the list hydrates from the snapshot, the badges are split, and cancelled rows expire.
- timestamp: 2026-03-11 — Two-tablet UAT: both tablets list all four holds on first open and after a forced reconnect. Two leftovers noted below.

## Second pass — leftover issues (2026-03-10)

The first-pass fix works. Two separate bugs remain, both traced to code:

### Evidence (second-pass UAT)
- A cancels one hold at the kiosk: B's row turns grey but the badge still counts it (EXPECTED to drop).
- A closes the desk tab entirely: B keeps showing A as an active steward for minutes.
- No "new hold" flash on any tablet in any scenario.

### Issue 1 — a cancelled hold is not removed from the live count
- **feed-client `cancel.ts:60`:** the cancel path updates the row but never emits the count change.
- **The feed server has no `hold.removed` event:** it only broadcasts cancel notices, so the count has nothing to react to.

### Issue 2 — the new-hold flash never fires: seconds against milliseconds
- The server stamps `createdAt` in seconds; the desk compares it with `Date.now()` in milliseconds, so every hold looks decades old.

## Current Focus

- hypothesis: ALL FIRST-PASS AND SECOND-PASS FIXES CONFIRMED IN CODE. All packages typecheck clean.
- test: COMPLETE — checked: the published client is installed in the desk, the typechecks pass, and each code path was re-read.
- expecting: Two-tablet UAT should show: holds on first open, the count dropping on cancel, the flash on a new hold.
- next_action: CHECKPOINT (awaiting_human_verify) — deploy the feed server and push the desk, then run the two-tablet UAT.

## Second-pass deployment state (2026-03-11)

- feed-client 0.4.1: tag pushed, package published to the private registry
- steward-desk: node_modules holds 0.4.1, but the branch is 9 commits ahead of origin (not deployed)
- feed server: branch is 7 commits ahead of origin (not deployed)

## Third pass — UAT evidence (2026-03-11, same laptop, A = browser profile one, B = profile two)

The second-pass fixes are CONFIRMED WORKING (cancels now drop the count). UAT then surfaced a different cluster.

### What now works (regressions cleared)
- Placing and cancelling holds on both tablets keeps the lists identical.
- A struck-through row clears itself after five seconds.
- The pre-open count shows 4 on tablet B while A has four holds.

### Open bugs (third pass)

- **B-01 — Pre-open waitlist badge stuck at 0:** A joins the waitlist, B has NOT opened the desk. B's waitlist badge reads
  0; it should read 1 like the holds badge does. The two badge counts are derived differently.
- **B-02 — A steward who closes the tab keeps counting as active:** the presence list never drops a closed tab until a reload.
- **B-03 — Both badges read 0 after a full close and reopen:** after reopening, the desk has no roster until the
  first event arrives. The counts should come from a source that survives the local session.

### Design direction from the steward (load-bearing)
"The holds list and the waitlist should be completely separate. The badges have to be right every time." The two
counts should be independent and presence-driven, not tied to whether this tablet holds a local list of each kind.

## Current Focus

- hypothesis: Second-pass fix works. Three open bugs, likely two causes:
    (RC-A, B-01 and B-03) both badge counts come from the local list, not from a room-wide presence source.
    (RC-B, B-02) the presence list is never pruned when a socket closes.
- test: (check by reading) compare the two badge derivations; trace how a closed socket leaves the presence list.
- expecting: confirm RC-A and RC-B, then propose fixes (desk and feed server, no client bump).
- next_action: validate RC-A and RC-B against the code, then apply.

## Third pass — checking the code (2026-03-11)

### Evidence (third-pass check)
- timestamp: 2026-03-11 — RC-A REVISED. `DeskHeader.tsx:250-255` derives BOTH badge counts the
  same way: the connected flag decides, then the live ids are counted. The earlier claim (that waitlist
  uses a different path) is FALSE, since both read the local list. This confirms the real cause is shared: both gate on
  the connected flag and both read the local list.
- timestamp: 2026-03-11 — The legacy polling path DID have a room-wide count (the hourly digest job emits
  `holds-count` to every desk). The live path has no equivalent, so the badges cannot be presence-driven today.
- timestamp: 2026-03-11 — The earlier idea that a keepalive alone would fix the badges is REFUTED: a keepalive keeps the
  socket open but leaves the local-list derivation untouched, so the counts still read 0 before the first event.
- timestamp: 2026-03-11 — RC-B confirmed by the logs: the presence list is keyed by socket id and the close handler
  at `presence.ts:73` removes the entry only for the owning room, so a closed tab in another room lingers until reload.

### Fix plan (third pass)
- B-01 and B-03: add a small presence channel on the feed server and drive both badges from it.
- B-02: prune the presence entry in the close handler for every room the socket joined.

## Third pass — fixes applied (2026-03-12)

All three fixes are in. No feed-client change was needed (no bump). Two packages touched.

### Evidence (fixes)
- timestamp: 2026-03-12 — feed server commit 6cda77b: new `presence.ts` registered in the router; the close
  handler prunes every room; a count broadcast goes to each desk. The typecheck passes.
- timestamp: 2026-03-12 — Applied fix: desk commit 4d72326 reads both badges from the presence counts and drops the local-list derivation. The build passes.
- timestamp: 2026-03-12 — A lint rule caught an unused prop after the badge change; the prop and its two call sites were removed.

### Known blind spot carried forward
- After a socket reconnect (distinct from a page reload) the first presence emit may race the room rejoin.

## Third pass deployment state (2026-03-12) — PUSHED

An independent check agent confirmed all three fixes match the plan and found no stray edits. Both repos pushed.

- feed server: `main` = remote `6cda77b`, pushed.
- steward-desk: `main` = remote `4d72326`, pushed, replacing an earlier push that failed the build.
- feed-client: untouched this round (0.4.1 already published).

## Fourth pass — polish (2026-03-12) — PUSHED

Third-pass UAT PASSED. Two polish items reported, fixed and deployed:

- **P-01 (desk, layout):** an empty gap showed between the hold list and the member panel when only the waitlist was on.
- **P-02 (feed server, snappier flash):** the new-hold flash waited on a 800 ms server interval; lowered to 200 ms.

### Evidence + rollout
- timestamp: 2026-03-12 — gates: feed server typecheck and 42 tests pass; desk typecheck and build pass.
- timestamp: 2026-03-12 — pushed: desk 3687b5c, feed server b266718. The feed-client and presence code are unchanged.

## Current Focus

- hypothesis: ALL THIRD-PASS FIXES APPLIED AND COMMITTED. No client bump.
- test: COMPLETE in code — the feed server typecheck and the desk typecheck both pass clean.
- expecting: Two-tablet UAT confirms the three badge and presence bugs are fixed with no regression.
- next_action: CHECKPOINT (awaiting_human_verify) — deploy and run the two-tablet UAT once more.

## Fourth pass UAT — PASSED (2026-03-12) → RESOLVED

The two-tablet UAT of the fourth-pass deploy passed. B-01 to B-03 are fixed and the earlier behaviour holds (holds on
first open, counts on cancel, the flash). Both polish items are confirmed. Closing this session.
