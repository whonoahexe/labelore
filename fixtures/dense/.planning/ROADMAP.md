# Roadmap: Dense Fixture Project

## Milestones

- ✅ **v1.0 Bootstrap** — Phase 1 (shipped 2025-11-01)
- ✅ **v2.0 Legacy Bridge** — Phases 1-2 (shipped 2026-03-15)
- 🚧 **v3.0 Live Read Surface** — Phases 1-2 (in progress)

## Phases

<details>
<summary>✅ v1.0 Bootstrap (v1.0 Phase 1) — SHIPPED 2025-11-01</summary>

### Phase 1: Bootstrap
**Goal**: Stand up the earliest scaffolding for the fixture project
**Plans**: 1 plan

Plans:
- [x] 01-01: Bootstrap scaffolding

Full detail: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
Audit: [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v2.0 Legacy Bridge (v2.0 Phases 1-2) — SHIPPED 2026-03-15</summary>

### Phase 1: Legacy Ingest
**Goal**: Pull legacy records into the new store
**Plans**: 1 plan

Plans:
- [x] 01-01: Legacy ingest pipeline

### Phase 2: Batch Export
**Goal**: Export ingested batches to the downstream consumer
**Plans**: 1 plan

Plans:
- [x] 02-01: Batch export job

Full detail: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
Audit: [milestones/v2.0-MILESTONE-AUDIT.md](milestones/v2.0-MILESTONE-AUDIT.md)

</details>

### 🚧 v3.0 Live Read Surface (current milestone)

**Milestone Goal:** Prove the read layer's domain model against a dense, adversarial project shape.

#### Phase 1: Identity Slice
**Goal**: Deliver the identity vertical slice, exercising every unfamiliar and invented artifact type
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: [IDENT-01, IDENT-02, IDENT-03]
**Success Criteria** (what must be TRUE):
  1. The identity slice's full artifact spread loads cleanly
  2. Every artifact type studio-portal has never produced is represented and renders
**Plans**: 2 plans

Plans:
- [ ] 01-01: Identity slice tracer
- [ ] 01-02: Identity slice hardening

#### Phase 2: Transport Layer
**Goal**: Wire the transport layer connecting identity to the rest of the system
**Depends on**: Phase 1
**Requirements**: XPORT-01, XPORT-02
**Success Criteria** (what must be TRUE):
  1. Transport requests round-trip through the identity slice
  2. A mid-flight phase (no summary yet) renders correctly
**Plans**: 1 plan

Plans:
- [ ] 02-01: Transport layer tracer

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Identity Slice | v3.0 | 2/2 | In progress | - |
| 2. Transport Layer | v3.0 | 0/1 | Not started | - |
