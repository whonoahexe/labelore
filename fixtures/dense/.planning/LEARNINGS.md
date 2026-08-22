---
generated: 2026-08-22
project: Dense Fixture Project
counts:
  decisions: 3
  lessons: 2
  patterns: 2
  surprises: 1
missing_artifacts: []
---

# Learnings: Dense Fixture Project

## Decisions

- Three milestones, not two — multi-milestone identity logic must not be validated only at N=2.
- Corruption lives inside the healthy tree, isolated to exactly two files (D-02).
- Every fixture shape traces to a `gsd-core` template or source line (D-01).

## Lessons

1. A phase number alone is never a stable identity key once `phase_numbering: restarts-per-milestone`
   is in effect — always pair it with the milestone.
2. An unfamiliar artifact type (`01-COST-MODEL.md`) must still render as generic markdown rather than
   disappear from the tree.

## Patterns

- Archived phase trees under `milestones/vX.Y-phases/` are byte-identical in internal shape to a live
  `phases/NN-slug/` directory.
- `SUMMARY.md`'s `coverage[].id` values (`D1`, `D2`, ...) visually collide with `CONTEXT.md`'s `D-NN`
  decision IDs but occupy a separate namespace.

## Surprises

- The dense fixture's golden snapshot permanently carries warnings once corruption is introduced —
  "zero warnings" can never be asserted against it again (D-02).
