---
title: "Studio Media Workflow — next milestone brief"
date: "2026-10-23"
context: "/gsd-explore session; input for /gsd-new-milestone"
---

# Studio Media Workflow — milestone brief

Captured from an exploration session on 2026-10-23. Inputs from the studio team are included.

## Features

1. **Projects.** Created in the portal from a single template with optional folders (exact layout left to research/planning). No layout exists today. Existing projects need an adopt/import path. The tiers get cleaned up by hand before the milestone starts, so only real projects remain.
2. **Ingest.** SD cards come in through a card reader. The user mounts the card, then picks the source path in the portal and assigns it to a project + camera. No auto-detect. The portal writes **two verified copies** before it marks the card safe to wipe, because cards are reformatted after a shoot.
3. **Lifecycle.** Tiers are split by data weight, not project status:
   - **stage** (NVMe, 370 GB, may grow to ~1 TB): project files, proxies, graphics, exports
   - **vault** (SanDisk USB SSD): RAW originals from ingest day for the life of the project
   - **archive**: about 1 month after completion
   - **cloud**: about 3–4 months after completion
   RAW cannot live on stage: one C50 shoot runs to hundreds of GB.
4. **Grading locally, by vault check-out.** Decided: the vault drive moves physically. The portal marks it "checked out to grading", unmounts it safely, and later checks it back in. While checked out, the portal shows "with grading", not "offline". Ingest cannot rely on vault being present (open question: where the copies go while it's out). Network grading was rejected because 10GbE costs too much (see numbers below).
5. **Proxy generation.** Presets in the portal. Proxies scale every clip by a fixed fraction and keep aspect ratio, frame rate, timecode and filename, so Resolve relinks them. Use them for editing only; grade on the originals. **Blocked on feasibility:** ffmpeg cannot decode Canon Cinema RAW Light (see the CRM proxy decoding spike).
6. **UI.** Port the evolved UI from `../labelore` (which took its original inspiration from this portal): dashboards and pages. Strictly on shadcn preset b3Dqcuo4na.
7. **Bug fixes.** A mobile UI sweep (issues to be found during the milestone), plus the stale-mount bug (todo `portal-detect-vanished-tier-device`).

## Footage facts (measured 2026-10-23)

Camera: **Canon EOS C50**, Cinema RAW Light (`CRAW` codec in `.CRM`, firmware 02.10.00). From the recovered Yaad clips in `/mnt/stage/crm-recovery/`:

| Clip | Resolution | fps | Data rate |
|---|---|---|---|
| C142 | 6960×4640 (open gate, 3:2) | 23.976 | ~180 MB/s |
| C324 | 6960×3672 (~1.9:1) | 59.94 | ~232 MB/s |

- One shoot mixes aspect ratios. Proxies forced to 16:9 1920×1080 distort some clips, which matches the team's "resolution messed up in a few footages" report. ¼-scale proxies are 1740×1160 / 1740×918.
- `ffprobe` reports `codec_name=unknown` for CRAW, so ffmpeg cannot decode it.

## Network facts (measured 2026-10-23)

- The server NIC is a Killer E2600, **gigabit max**, so SMB tops out around 110 MB/s. That can't play even one 24p C50 stream in real time.
- `enp2s0` flapped 67 times in a week (89 link events on Oct 22) and renegotiated at 10M/100M/1G, with the kernel warning "Downshift … check cabling!". The server is currently serving SMB over Wi‑Fi. This is the likely cause of the studio-wide internet problems.
- The server has a Thunderbolt 4 controller, so 10GbE is possible, but it was rejected as too expensive. A 2.5GbE USB pair (~280 MB/s) was discussed only as a fallback.
