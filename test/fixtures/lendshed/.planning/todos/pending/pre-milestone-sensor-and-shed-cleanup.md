---
title: "Pre-milestone: swap shed Ethernet, re-seat sensors, tidy the shelves"
date: "2026-03-26"
priority: high
---

Do these before the Steward Desk milestone (see notes/2026-03-26-steward-desk-milestone-brief.md):

- [ ] **Replace the desk hub's Ethernet cable (Cat5e) and try another switch port.** `eth1` (a USB adapter, r8152) keeps dropping and renegotiating at 10M/100M/1G, and the kernel says "check cabling!". Then move the tablet back off Wi‑Fi. Check: `cat /sys/class/net/eth1/carrier_changes` stays flat, and the link shows 1Gbps/Full.
- [ ] **Re-seat the north shed's door sensor.** It was pulled while docked on 2026-03-25 14:12:09 and the kernel logged "usb 1-2: reset" on ttyUSB0 (CP210x). Run a short read test (or swap the lead) and spot-check the loans logged around then. Then redock it; the kiosk is currently showing a stale tile for a missing `/dev/ttyUSB0`.
- [ ] **The hub has two IPv4 addresses** (10.0.4.31 and .77). The firewall is dropping established TLS and NTP replies to .77. Tidy this up, or let it go once wired is back.
- [ ] **Tidy the canal, north and depot shelves** by hand so only real stock remains (cardboard, loose bolts, `lost-and-found` bags, duplicate `ladder-3m`, etc.).
