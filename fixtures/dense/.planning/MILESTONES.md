# Project Milestones: Dense Fixture Project

[Entries in reverse chronological order - newest first]

## v3.0 Live Read Surface (In Progress)

**Delivering:** A dense, adversarial `.planning/` shape exercising every artifact type the parser must
tolerate.

**Phases in progress:** 1-2

---

## v2.0 Legacy Bridge (Shipped: 2026-03-15)

**Delivered:** Legacy record ingestion and downstream batch export.

**Phases completed:** 1-2 (2 plans total)

**Key accomplishments:**
- Legacy ingest pipeline reading the old store's export format
- Batch export job feeding the downstream consumer
- Archived phase-number collision with v1.0's own "Phase 1" — the exact case this fixture exists to
  exercise

**Stats:**
- 12 files created/modified
- 4 phases, 2 plans, 6 tasks (fixture-synthetic counts)
- 134 days from v1.0 to v2.0

**Git range:** `feat(01-01)` → `feat(02-01)`

**What's next:** v3.0 Live Read Surface

---

## v1.0 Bootstrap (Shipped: 2025-11-01)

**Delivered:** The earliest scaffolding for the fixture project.

**Phases completed:** 1 (1 plan total)

**Key accomplishments:**
- Bootstrap scaffolding proving the project's shape end to end

**Stats:**
- 5 files created
- 1 phase, 1 plan, 3 tasks (fixture-synthetic counts)
- 9 days from start to ship

**Git range:** `feat(01-01)` → `feat(01-01)`

**What's next:** v2.0 Legacy Bridge
