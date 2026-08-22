# Phase 1: Legacy Ingest - Context

**Gathered:** 2026-01-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Pull legacy records into the new store — the v2.0 "Phase 1", archived here under
`milestones/v2.0-phases/01-legacy-ingest/`, distinct from both v1.0's "Phase 1" (bootstrap) and v3.0's
"Phase 1" (identity slice) despite all three sharing the number `01`.

</domain>

<decisions>
## Implementation Decisions

### Scope
- **D-01:** Read-only ingest for v2.0 — no retry logic, deferred to backlog.

### Claude's Discretion
Everything else is open.

</decisions>

<specifics>
## Specific Ideas

No specific requirements.

</specifics>

<canonical_refs>
## Canonical References

### Fixture provenance
- `~/.claude/gsd-core/templates/context.md` — the six-tag section grammar this file follows

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None yet at v2.0's start.

### Established Patterns
None yet.

### Integration Points
None yet.

</code_context>

<deferred>
## Deferred Ideas

- Retry logic on network failure — deferred to backlog.

</deferred>

---

*Phase: 01-legacy-ingest*
*Context gathered: 2026-01-06*
