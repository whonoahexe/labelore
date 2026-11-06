---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
spike: 001
idea: kiosk-handover
name: badge-reader-latency
type: standard
validates: "Given a badge on the reader, when the kiosk looks the member up, then the name shows within a second"
verdict: VALIDATED
related: [002]
tags: [kiosk, latency]
---

# Spike 001: Badge Reader Latency

## What This Validates

Given a badge on the reader, when the kiosk looks the member up, then the name shows within a second.

## Research

The reader sends the badge number as a plain HTTP call to the kiosk's local service. No driver is involved.

## How to Run

```bash
bash probe.sh 20
```

## What to Expect

Twenty timings in `out/latency.csv`, none above 1000 ms.

## Investigation Trail

Cold lookups were the slow ones, so the probe was run twice: once cold, once warm. The warm run held under 200 ms.

## Results

Validated. The slowest cold lookup took 840 ms; every warm lookup took under 200 ms.
