# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## door-sensor-stops-after-wifi-drop — shed controller stops sending door pings after one Wi-Fi failure; the desk reads the shed as closed

- **Date:** 2026-03-18
- **Error patterns:** name resolution failed, no door pings, shed shows closed, check-in tasks stuck pending, poller thread missing, OSError, RequestException, Wi-Fi drop, power cycle fixes it
- **Root cause(s):** CODE — the ping loop caught only `RequestException`, so an `OSError` from the pool's retry hook ended the poller thread with nothing to restart it; a 2.6.0 supervisor restarted only after a clean return, and a restarted poller reused an expired login token.
- **Fix:** Catch-all with capped backoff in the loop, the lookup failure wrapped in the client's own error type, the first fetch moved inside the guarded loop, and one re-login after a rejected token.
- **Files changed:** controller/desk_client.py, controller/poller.py, verify_poller.py (both firmware builds)
- **Why not caught:** The only gate, `verify_poller.py`, injected `RequestException` alone, so no other error class could reach it.
- **Recurrence guard:** `verify_poller.py` checks 5 to 8, red on the pristine tree and green on the patched one; nine of nine hand-made mutants fail a check.

### Transferable lessons

1. **A thread that dies quietly looks healthy.** The door-sensor and keypad threads kept running, so the controller read as alive while the one loop that mattered was gone. Give every long-lived loop a liveness signal of its own.

2. **A fault-injection check only covers the faults it injects.** One error class in the harness meant one error class in the guard; inject the class the library actually raises.

3. **Suspect an AND-gate when no single cause explains every symptom.** Three defects stacked here, and fixing the first alone left the other two in place.

---

## reservation-holds-lost-on-reconnect — a tablet that reopens the steward desk after a Wi-Fi blip shows no earlier holds

- **Date:** 2026-03-12
- **Error patterns:** holds missing on one tablet, counter reads 0, snapshot reply lost, cursor dropped on resubscribe, replay aborts on one bad hold, holds badge and waitlist badge identical, cancelled row never leaves
- **Root cause(s):** CODE — `resubscribe()` dropped the `since` cursor, the desk built its list from live events only and lost a snapshot that landed before its listener existed, and the replay loop had no per-item guard.
- **Fix:** Send the stored cursor with every subscribe, hydrate the list from the snapshot reply, guard each replayed item, split the two badges, and expire cancelled rows after five seconds.
- **Files changed:** feed-client resubscribe.ts and replay.ts, desk useHoldFeed.ts, DeskHeader.tsx, HoldList.tsx
- **Why not caught:** The feed tests drove one tablet from a clean start, so a reconnect and a late listener were never exercised.
- **Recurrence guard:** a reconnect test in the feed client that drops the socket mid-stream and compares both tablets' lists.

### Transferable lessons

1. **A fix that spans two packages needs its release steps written down.** The client change was not visible to the desk until the version was bumped and reinstalled.

2. **Late listeners lose early messages.** Register the listener before the call that can answer, or hand the first reply to the caller.

---
