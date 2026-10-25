---
phase: quick/260327-h4w
verified: 2026-03-27T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 1
overrides_applied: 0
gaps_resolved:
  - truth: "Every comment that says each page owns its own socket now states that the app shell owns it"
    status: resolved
    resolved_by: "b71e3c4"
    resolution: "The one-line reword the verifier named was applied. The offline banner comment in top-bar.tsx now says the reconnect loop runs in the shell-level StatusProvider. Comment only; the type check was re-run clean. The verifier's original finding is kept below as written."
gaps_original:
  - truth: "Every comment that says each page owns its own socket now states that the app shell owns it"
    status: partial
    reason: "The plan's diagnosis named four comment sites and all four were rewritten. A fifth comment in the same file as one of them (components/top-bar.tsx:88-93, inside the offline banner) still says the reconnect loop runs in whichever page owns the socket. After the move that is false."
    artifacts:
      - path: "web/components/top-bar.tsx"
        issue: "Line 91 reads 'whichever page owns the socket', a stale per-page claim; it predates this task and was not among the four sites."
    missing:
      - "Reword top-bar.tsx:88-93 to say the reconnect loop runs in the shell-owned StatusProvider."
human_verification:
  - test: "The plan's human check: load the home page cold, then go home to loans to log to catalogue to home using in-app links only, with the browser's network panel on the WS filter and Preserve Log on."
    expected: "One ticket request and one socket entry for the whole session; the top-bar dot stays Live on every hop; the in-transit tray stays filled during an active transfer; stopping the server turns the dot to reconnecting and then offline, the shed cards keep their last values, and it returns to Live by itself."
    why_human: "Only a real browser against a running server shows that one socket survives navigation, and this repo's test runner has no DOM."
---

# Quick Task 260327-h4w: Move the live-status socket into a provider Verification Report

**Phase Goal:** Move the live-status socket into a `StatusProvider` mounted in the app shell so it survives page changes; fix the stale-flag race that leaves an orphan socket; update the comments that say each page owns its socket.
**Verified:** 2026-03-27
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Exactly one non-comment call of `useStatusSocket()` exists, inside `StatusProvider` | ✓ VERIFIED | A comment-filtered grep over `web` returns two lines: the definition and the one call in `status-provider.tsx`. |
| 2 | `StatusProvider` is mounted in the shell above `{children}` and renders no element | ✓ VERIFIED | `app-shell.tsx:61-66` nests the top bar, the children and the tray in one provider; the provider returns only its context. |
| 3 | The stop flag is per effect run, not a hook-lifetime ref | ✓ VERIFIED | `use-status-socket.ts:188` declares `let stopped = false` as the effect's first line; three guards and the cleanup share it; `grep -c stoppedRef` is 0. |
| 4 | Frames are not cleared on disconnect, and reconnect with backoff still runs | ✓ VERIFIED | The disconnect path only schedules a retry; no new frame-clearing call exists. |
| 5 | The old publish-up contexts are removed, and readers use `useStatusState()` | ✓ VERIFIED | A grep for the old names across `web` returns nothing. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/components/status-provider.tsx` | Two exports: `StatusProvider`, `useStatusState` | ✓ VERIFIED | Created, exports exactly those two names. |
| `web/components/app-shell.tsx` | Mounts the provider above the children | ✓ VERIFIED | Lines 61-66. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type check | `npx tsc --noEmit` | Clean | ✓ PASS |
| Unit tests | `npm test` | 22/22 passing | ✓ PASS |
| Production build | `npm run build` | Succeeds | ✓ PASS |

### Human Verification Required

### 1. One socket survives in-app navigation

**Test:** Load the home page cold with the network panel on the WS filter and Preserve Log on. Then go home to loans to log to catalogue to home using in-app links only. Repeat once with a transfer running, then stop the server and start it again.
**Expected:** One ticket request and one socket entry for the whole session. The top-bar dot stays Live on every hop. The tray stays filled during a transfer. On server stop the dot goes reconnecting then offline, shed cards keep their last values, and it recovers on its own.
**Why human:** Only a real browser against a running server can show this; the repo's runner has no DOM.

### Gaps Summary

One real gap, comments only: `top-bar.tsx:88-93` still says the reconnect loop runs in whichever page owns the socket. It is a one-line reword with no effect on behaviour.

---

_Verified: 2026-03-27_
_Verifier: Claude (gsd-verifier)_
