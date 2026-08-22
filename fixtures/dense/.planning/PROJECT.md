# Dense Fixture Project

## What This Is

A synthetic, hand-authored GSD project three milestones deep, carrying every artifact type
`gsd-core`'s templates define plus several it does not — the adversarial substrate Phase 4's
degradation claims are proven against.

## Core Value

Prove the parser survives the full breadth of GSD's evolving artifact surface: unfamiliar document
types, an open-map config, colliding phase numbers across milestones, and files that are deliberately
broken.

## Requirements

### Validated

- ✓ Read-only parsing of a multi-milestone project tree — v1.0, v2.0

### Active

- [ ] IDENT-01: Identity slice loads through the parser
- [ ] IDENT-02: Unfamiliar artifact types survive the round trip
- [ ] IDENT-03: Open-map config keys survive the round trip
- [ ] XPORT-01: Transport layer artifacts survive an in-progress phase shape
- [ ] XPORT-02: Corrupted files degrade in isolation

### Out of Scope

- Anything that requires a real backend — this fixture never runs code, it only exists to be parsed.

## Context

This is a synthetic fixture authored against `~/.claude/gsd-core/templates/` and
`~/.claude/gsd-core/bin/lib/*.cjs`, never against `~/studio-portal` (D-01, D-04). It deliberately spans
three milestones (`v1.0`, `v2.0` archived; `v3.0` active) with an archived/live phase-number collision
at phase `01`, so multi-milestone identity logic is exercised at N greater than 2.

## Constraints

- **Fixture**: Every structural claim traces to a `gsd-core` template line or a `bin/lib/*.cjs` source,
  recorded in `fixtures/README.md` — never to a real project.
- **Fixture**: Deliberate corruption (a tab-broken YAML block, a trailing-comma JSON file) sits among
  healthy files, isolated per D-02.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three milestones, not two | Multi-milestone logic (`phase_numbering: restarts-per-milestone`) must not be validated only at N=2 | — Pending |
| Corruption lives inside the healthy tree, not beside it | Isolation is only meaningfully proven when a healthy majority surrounds the broken file | — Pending |
| Unfamiliar artifact types (`SPEC.md`, `AI-SPEC.md`, `01-COST-MODEL.md`) are included | The highest-severity project risk is overfitting to `~/studio-portal`'s shape | — Pending |

---
*Last updated: 2026-08-22 after initialization*
