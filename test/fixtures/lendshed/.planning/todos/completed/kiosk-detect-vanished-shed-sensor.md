---
title: "Kiosk should detect when a shed's door sensor has vanished from its dock"
date: "2026-03-26"
priority: medium
---

On 2026-03-25 the north shed's door sensor was unplugged while still docked. `/dev/ttyUSB0` disappeared from `ls /dev`, but the sensor tile on the kiosk stayed green (CP210x adapter, 115200 baud) and every read returned an error (errno 5). Check what the shed card on the steward dashboard and `/inventory` showed. The kiosk should report something clear, such as "sensor disconnected", rather than a generic error or a stale count.

This also lays groundwork for the planned shed lock-down feature (the brief in notes/2026-03-26-steward-desk-milestone-brief.md). There, an expected absence ("closed for stocktake") has to look different from an unexpected one ("sensor vanished").
