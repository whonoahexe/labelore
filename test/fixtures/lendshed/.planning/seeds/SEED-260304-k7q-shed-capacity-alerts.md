---
made_up_example: true
derived_from: gsd-core/workflows/plant-seed.md
gsd_core_version: 1.19.0
id: SEED-260304-k7q
status: dormant
planted: 2026-03-04
planted_during: v1.0 / Phase 4 (Shed-to-Shed Transfers)
trigger_when: when stewards ask to be told before a shed runs out of a popular tool
scope: medium
audit_acknowledged:
  milestone: v1.0
  at: "2026-03-20"
  status: dormant
---

# SEED-260304-k7q: Alert a steward when a shed's stock of a popular tool runs low

## Why This Matters

Stewards learn a shed has run out of ladders or extension leads only when a member complains. A low-stock
alert would let them move spares between sheds before the shelf is empty, which is the point of the transfer
feature that shipped in v1.0.

## When to Surface

**Trigger:** when stewards ask to be told before a shed runs out of a popular tool

This seed will surface during `/gsd-new-milestone` when the milestone scope matches.

## Scope Estimate

**Medium** — a per-tool threshold setting, a nightly check against the inventory counts, and a place on the steward desk to show the alerts. Two to three phases.

## Breadcrumbs

- `.planning/ROADMAP.md` — the v1.0 transfer phase this idea grew out of
- `frontend/app/globals.css` — the alert badge would reuse the existing status colours
- `frontend/app/stock-alerts.tsx` — where the alert list was first sketched, never committed

## Notes

_Captured via one-shot seed capture. Enrich with trigger, why, and scope at your convenience._
