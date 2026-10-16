---
phase: 06-live-file-watching
verified: 2026-10-14T15:42:00Z
status: gaps_found
score: 6/10 must-haves verified
behavior_unverified: 1
behavior_unverified_items:
  - truth: "Closing the browser tab releases the server-sent-events stream within one heartbeat"
    test: "Open the dashboard, then close the tab while the server log is tailing"
    expected: "The server logs the stream as closed within 15 seconds and the watcher's subscriber count drops to zero"
    why_human: "No test drives a real client disconnect; the cleanup path is present and wired but never exercised"
coincidental_reliance_items:
  - truth: "A renamed file shows under its new name without a manual refresh"
    reason: incidental-ordering
    harden: "Declare that unlink is processed before add for the same inode, or key the index update on inode rather than path"
human_verification:
  - test: "Open the dashboard in two windows, edit a PLAN.md in an editor, and save it three times quickly"
    expected: "Both windows show the new content within a second of the last save, with one update rather than three"
    why_human: "Debounce timing and cross-window delivery are perceptual; the unit tests use a fake clock"
  - test: "Close the tab while the server log is tailing"
    expected: "The stream is logged as closed within 15 seconds and the subscriber count drops to zero"
    why_human: "No test drives a real client disconnect"
---

# Phase 6: Live File Watching Verification Report

**Phase Goal:** Edits to the target project's planning files appear in the open dashboard within a second, without a manual refresh, and without the server ever writing to the target.
**Verified:** 2026-10-14T15:42:00Z
**Status:** gaps_found

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Saving a planning file updates the open dashboard within one second | ✓ VERIFIED | `watcher.test.ts` drives a real chokidar watcher against a temp dir; p95 delivery 240 ms across 50 saves |
| 2 | A burst of saves produces one update, not one per save | ✓ VERIFIED | Debounce of 120 ms in `src/planning-repo/watch.ts:41`; fake-clock test asserts one `invalidate` per burst |
| 3 | A renamed file shows under its new name without a manual refresh | ✓ VERIFIED (coincidental-reliance) | Works because chokidar emits `unlink` before `add` on Linux; nothing in the index update enforces that order |
| 4 | Deleting a file removes it from search results immediately | ✗ FAILED | `SearchIndex.remove()` is never called; the `unlink` handler only invalidates the tree query |
| 5 | Search results reflect edited file contents, not the startup snapshot | ✗ FAILED | `change` events invalidate the client cache, but the MiniSearch index is built once at startup and never updated |
| 6 | The server never writes to, locks, or creates files in the target `.planning/` | ✓ VERIFIED | Watcher opened with `persistent: true, ignoreInitial: true`; no write call reachable from `src/planning-repo/`; read-only test mounts the fixture `ro` |
| 7 | Closing the browser tab releases the server-sent-events stream within one heartbeat | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `stream.onAbort` unsubscribes in `src/server/events.ts:58`; no test drives a real client disconnect |
| 8 | A target on a network or ssh mirror still updates, by polling | ? UNCERTAIN | `usePolling` falls back when `fs.watch` throws, but no mirrored target was available in this environment |
| 9 | The header shows a quiet live indicator while the stream is connected, and a reconnect state when it drops | ✓ VERIFIED | `LiveDot` renders `data-state="live" | "reconnecting"`; `live-indicator.test.tsx` covers both |
| 10 | Unknown files appearing mid-session degrade like unknown files at startup | ✓ VERIFIED | `add` events run through the same `classify()` path; the fallback test now also feeds a file added after boot |

**Score:** 6/10 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/planning-repo/watch.ts` | Watcher seam behind the repository boundary | ✓ EXISTS + SUBSTANTIVE | 132 lines; exports `watchPlanning`, debounced, read-only options |
| `src/server/events.ts` | SSE route via Hono `streamSSE` | ✓ EXISTS + SUBSTANTIVE | Heartbeat every 15 s, abort cleanup |
| `src/search/index.ts` | `add` / `update` / `remove` on the search seam | ✗ STUB | `update` and `remove` throw `not implemented` |
| `src/web/live/use-live-updates.ts` | Client subscription calling `invalidateQueries()` | ✓ EXISTS + SUBSTANTIVE | Reconnects with backoff |

**Artifacts:** 3/4 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| watch.ts | events.ts | in-process emitter | ✓ WIRED | `emitter.on('change', broadcast)` |
| events.ts | use-live-updates.ts | `EventSource('/api/events')` | ✓ WIRED | Line 22 |
| watch.ts | SearchIndex | `index.update()` / `index.remove()` | ✗ NOT WIRED | No call from the watcher to the index |

**Wiring:** 2/3 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| PLAT-01: Live file-watching with push updates | ✗ BLOCKED | Search index never updated after startup |
| PLAT-02: Watching never writes to the target | ✓ SATISFIED | - |
| PLAT-03: Mirrored targets update by polling | ? NEEDS HUMAN | No mirrored target available to the verifier |
| DASH-06: Live indicator in the header | ✓ SATISFIED | - |
| FIND-07: Search stays current while the dashboard is open | ✗ BLOCKED | `SearchIndex.update` / `remove` are stubs |

**Coverage:** 2/5 requirements satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/search/index.ts | 88 | `throw new Error('not implemented')` in `update()` | 🛑 Blocker | Edited files never re-indexed |
| src/search/index.ts | 94 | `throw new Error('not implemented')` in `remove()` | 🛑 Blocker | Deleted files stay searchable |
| src/planning-repo/watch.ts | 63 | `// TODO: handle rename as one event` | ⚠️ Warning | Rename relies on event order |
| src/web/live/use-live-updates.ts | 30 | `console.log('sse open')` left in | ℹ️ Info | Noise in the browser console |

**Anti-patterns:** 4 found (2 blockers, 1 warning, 1 info)

## Human Verification Required

### 1. Burst saves across two windows
**Test:** Open the dashboard in two windows, edit a PLAN.md in an editor, and save it three times quickly.
**Expected:** Both windows show the new content within a second of the last save, with one update rather than three.
**Why human:** Debounce timing and cross-window delivery are perceptual; the unit tests use a fake clock.

### 2. Stream released on tab close
**Test:** Close the tab while the server log is tailing.
**Expected:** The stream is logged as closed within 15 seconds and the subscriber count drops to zero.
**Why human:** No test drives a real client disconnect.

## Gaps Summary

### Critical Gaps (Block Progress)

1. **Search index is a startup snapshot**
   - Missing: Calls from the watcher's `change` handler to `SearchIndex.update()`, and a real `update()` implementation
   - Impact: Search returns stale text for any file edited after boot, so the goal's "appear within a second" holds for pages but not for search
   - Fix: Implement `update()` with MiniSearch `discard` + `add`, and call it from the watcher's `change` handler

2. **Deleted files stay searchable**
   - Missing: A real `SearchIndex.remove()` and a call to it from the `unlink` handler
   - Impact: A deleted plan still appears in search and opens to a "file not found" page
   - Fix: Implement `remove()` with MiniSearch `discard`, and call it on `unlink`

### Non-Critical Gaps (Can Defer)

1. **Rename depends on event order**
   - Issue: A rename is handled as `unlink` then `add`, which only works because chokidar happens to emit them in that order on Linux
   - Impact: Limited — on macOS the order can flip for a single tick, briefly showing both names
   - Recommendation: Fix now while the watcher is open; key the index update on inode

2. **Debug logging left in the client**
   - Issue: `console.log('sse open')` in `use-live-updates.ts`
   - Impact: Console noise only
   - Recommendation: Remove in the next plan that touches the file

## Recommended Fix Plans

### 06-04-PLAN.md: Keep search current

**Objective:** Wire the watcher to the search index so edits and deletes reach search

**Tasks:**
1. Implement `SearchIndex.update()` with MiniSearch `discard` + `add` and call it from the watcher's `change` handler
2. Implement `SearchIndex.remove()` with MiniSearch `discard` and call it from the `unlink` handler
3. Verify: edit and delete a fixture file mid-session; search reflects both within a second

**Estimated scope:** Small

---

### 06-05-PLAN.md: Harden rename handling

**Objective:** Make rename independent of event order and tidy the client

**Tasks:**
1. Key the index update on inode so an `add` for a known inode is treated as a rename, regardless of `unlink` order
2. Remove the `console.log('sse open')` debug logging from the client
3. Verify: a rename test that emits `add` before `unlink` shows one entry under the new name

**Estimated scope:** Small

---

## Verification Metadata

**Verification approach:** Goal-backward (derived from phase goal)
**Must-haves source:** 06-01-PLAN.md, 06-02-PLAN.md, 06-03-PLAN.md frontmatter
**Automated checks:** 14 passed, 2 failed
**Human checks required:** 2
**Total verification time:** 6 min

---
*Verified: 2026-10-14T15:42:00Z*
*Verifier: Claude (subagent)*
