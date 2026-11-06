---
made_up_example: true
derived_from: gsd-core/workflows/plant-seed.md
gsd_core_version: 1.19.0
id: SEED-260411-m2x
status: active
planted: 2026-04-11
planted_during: v1.1 / Phase 4 (Bulk Loan Export)
scope: small
---

# SEED-260411-m2x: Remind borrowers a day before a tool is due back

## Why This Matters

Late returns are the most common reason a tool is missing from a shed when the next member arrives. A short
reminder the day before the due date costs almost nothing and would cut the number of chasing messages stewards send by hand.

## When to Surface

This seed will surface during `/gsd-new-milestone` when the milestone scope matches.

## Scope Estimate

**Small** — one scheduled job that reads the loans list and sends a message through the channel members already use. Under one phase.

## Breadcrumbs

- `.planning/PROJECT.md` — the core value this serves: a member can borrow without asking a steward
- `frontend/app/globals.css` — nothing to reuse here yet, listed only because the reminder text would need a colour

## Notes

_Captured via one-shot seed capture. Enrich with trigger, why, and scope at your convenience._
