# Sparse Started Fixture

## What This Is

A GSD project one step further along than `sparse-empty`: it has a roadmap and exactly one planned
phase, but no execution history yet — the shape of any real project in its first weeks.

## Core Value

Prove the parser survives a project that has structure (a roadmap, one phase) but no history
(no milestones, no summaries).

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Fixture requirement one
- [ ] Fixture requirement two
- [ ] Fixture requirement three

### Out of Scope

- Everything beyond the first slice — this fixture exists to prove one narrow code path.

## Context

This is a synthetic fixture authored against `~/.claude/gsd-core/templates/project.md`, not a real
project. It is deliberately one step past `sparse-empty` (plan `01-01`): it has a `ROADMAP.md` and a
planned phase, but no `milestones/`, no `quick/`, no `research/`, and no shipped work.

## Constraints

- **Fixture**: Deliberately minimal — one phase, no history, no milestones/.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep this fixture at "structure but no history" | Proves `roadmapComplete` and observed disk state can legitimately disagree even when there is no milestone at all | — Pending |

---
*Last updated: 2026-08-22 after initialization*
