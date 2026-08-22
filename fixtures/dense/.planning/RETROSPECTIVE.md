# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Legacy Bridge

**Shipped:** 2026-03-15
**Phases:** 2 | **Plans:** 2 | **Sessions:** 4

### What Was Built
- Legacy ingest pipeline
- Batch export job

### What Worked
- Archiving `phases/` under `milestones/v2.0-phases/` kept the live tree small

### What Was Inefficient
- No retry logic in the ingest pipeline — deferred to backlog

### Patterns Established
- Every archived milestone carries its own `vX.Y-ROADMAP.md` and `vX.Y-REQUIREMENTS.md` snapshot

### Key Lessons
1. Phase numbers reset at 1 per milestone — always scope by (milestone, phase number)

### Cost Observations
- Model mix: 40% opus, 60% sonnet
- Sessions: 4
- Notable: fixture-synthetic — not real cost data

---

## Milestone: v1.0 — Bootstrap

**Shipped:** 2025-11-01
**Phases:** 1 | **Plans:** 1 | **Sessions:** 2

### What Was Built
- Bootstrap scaffolding

### What Worked
- Kept the milestone tiny — one phase, one plan

### What Was Inefficient
- N/A — first milestone, no baseline to compare against

### Patterns Established
- N/A

### Key Lessons
1. Start small, prove the mechanism end to end

### Cost Observations
- Model mix: 100% sonnet
- Sessions: 2
- Notable: fixture-synthetic — not real cost data

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 2 | 1 | Bootstrap only |
| v2.0 | 4 | 2 | Introduced archived phase trees |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|---------------------|
| v1.0 | 0 | 0% | 0 |
| v2.0 | 0 | 0% | 0 |

### Top Lessons (Verified Across Milestones)

1. Phase number alone is never a valid identity key — always pair with milestone
