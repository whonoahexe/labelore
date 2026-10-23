---
title: "Pre-milestone: fix server Ethernet, fsck vault, clean up tiers"
date: "2026-10-23"
priority: high
---

Do these before the Studio Media Workflow milestone (see notes/2026-10-23-studio-media-workflow-milestone-brief.md):

- [ ] **Replace the server's Ethernet cable (Cat6) and try another switch/router port.** `enp2s0` (Killer E2600, r8169) keeps flapping and renegotiating at 10M/100M/1G, and the kernel says "check cabling!". Then move SMB back off Wi‑Fi. Check: `cat /sys/class/net/enp2s0/carrier_changes` stays flat, and the link shows 1Gbps/Full.
- [ ] **fsck the vault SSD.** It was pulled while mounted on 2026-10-22 02:59:58 and the kernel logged "lost async page write" on sda2 (exFAT). Run `fsck.exfat` (or Windows "Scan and fix") and spot-check files written around then. Then remount on the server; `/mnt/vault` is currently a stale mount of a missing `/dev/sda2`.
- [ ] **Wi‑Fi has two IPv4 addresses** (192.168.0.243 and .132). UFW is dropping established HTTPS/NTP replies to .132. Tidy this up, or let it go once wired is back.
- [ ] **Clean up stage/vault/archive** by hand so only real projects remain (installers, PNGs, `$RECYCLE.BIN`, loose MP4s, duplicate `nimhans`, etc.).
