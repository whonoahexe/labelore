# Requirements: Dense Fixture Project — v3.0 Live Read Surface

**Milestone:** v3.0
**Defined:** 2026-06-01
**Core Value:** Prove the parser survives the full breadth of GSD's evolving artifact surface.
**Supersedes:** [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)

## v3.0 Requirements

### Identity

- [ ] **IDENT-01**: Identity slice loads through the parser end to end
- [ ] **IDENT-02**: Unfamiliar artifact types survive the round trip as generic markdown
- [ ] **IDENT-03**: Open-map config keys survive the round trip unchanged

### Transport

- [ ] **XPORT-01**: Transport layer artifacts survive an in-progress (no-summary) phase shape
- [ ] **XPORT-02**: Corrupted files degrade to raw content in isolation, without a whole-load failure

## v4.0 Requirements

### Identity

- **IDENT-04**: Identity slice supports live reconciliation with a running session

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real backend execution | This fixture exists only to be parsed, never run |
| Writing back to `.planning/` | v1 of the real tool this fixture supports is read-only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IDENT-01 | Phase 1 | In Progress |
| IDENT-02 | Phase 1 | In Progress |
| IDENT-03 | Phase 1 | In Progress |
| XPORT-01 | Phase 2 | Pending |
| XPORT-02 | Phase 2 | Pending |

**Coverage:**
- v3.0 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-06-01*
*Last updated: 2026-08-22 after phase 1 hardening*
