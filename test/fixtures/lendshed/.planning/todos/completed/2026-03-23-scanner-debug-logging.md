---
created: 2026-03-23T07:48:20.116Z
title: Add scanner debug logging (camera + serial, no personal data)
area: kiosk
severity: major
order: 2
files:
  - api/src/scan/session-registry.ts
  - web/lib/scan/store.ts
  - web/lib/scan/reader.ts
notes:
  - .planning/notes/2026-03-23-scanner-debug-logging-for-checkout-kiosk.md
---

## Problem

On 2026-03-22 17:40–17:51 four scans in 11 minutes each ended in "no match" followed by an immediate rescan, and the north-shed handheld's link dropped (1001 mid-scan 1, 1006 after scan 3). Server logs only record lookups (scan_open/accept/close with reason and duration), so we can't tell which reader gave up, whether the code came from the camera or the serial port, or when the decoder stalled. Everything client-side (link state, input type, frame stats) is invisible.

## Solution

See the note for the full list. Server: log which reader sent each scan frame and who closed the session; timing of each lookup step; token lifetime and mint latency; each reader's link state during the session. Client, batched to a server endpoint: decoder, camera and link state changes; chosen input type (camera/serial/wedge) and its baud or resolution; frame stats every few seconds (decode time, miss rate, brightness, fps); torch and focus toggles, reader switches, visibility changes; camera permission errors; browser and OS version. Off limits: member names or card numbers (member ids only), raw frames, barcode payloads beyond the item id, session tokens. All entries share the sessionId so one grep shows a whole checkout.
