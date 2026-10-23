---
title: "Portal should detect when a tier's device has vanished under its mount"
date: "2026-10-23"
priority: medium
---

On 2026-10-22 the vault SSD was unplugged while still mounted. `/dev/sda` disappeared from `lsblk`, but `/mnt/vault` stayed mounted (exFAT on `/dev/sda2`) and every access returned EIO (os error 5). Check what the vault card on the status dashboard and `/browse` showed. The portal should report something clear, such as "device disconnected", rather than a generic error or stale capacity.

This also lays groundwork for the planned vault check-out feature (the brief in notes/2026-10-23-studio-media-workflow-milestone-brief.md). There, an expected absence ("checked out to grading") has to look different from an unexpected one ("device vanished").
