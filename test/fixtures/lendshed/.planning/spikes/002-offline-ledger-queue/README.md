---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
spike: 002
idea: kiosk-handover
name: offline-ledger-queue
type: standard
validates: "Given no network, when three loans are recorded, then all three replay in order on reconnect"
verdict: INVALIDATED
related: [001]
tags: [kiosk, offline]
---

# Spike 002: Offline Ledger Queue

## What This Validates

Given no network, when three loans are recorded, then all three replay in order on reconnect.

## Research

The kiosk keeps a small queue in browser storage. The question is whether replay keeps the order.

## How to Run

```bash
node queue_check.js
```

## What to Expect

Three loans printed in the order they were recorded.

## Investigation Trail

The check only ran against a simulated queue. Dropping the link on a real kiosk needs a second kiosk, and none was spare.

## Results

Invalidated for now: the simulated queue replays in order, but the real behaviour could not be shown without a spare test kiosk.
