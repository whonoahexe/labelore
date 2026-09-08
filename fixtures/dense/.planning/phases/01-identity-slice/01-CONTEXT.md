# Phase 1: Identity Slice - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the identity vertical slice and, along the way, exercise the full spread of artifact types
this fixture project needs — including types studio-portal has never produced.

</domain>

<decisions>
## Implementation Decisions

### Artifact spread
- **D-01:** Every unfamiliar artifact type (`SPEC.md`, `AI-SPEC.md`) is authored from its own
  `gsd-core` template, and one genuinely invented type (`01-COST-MODEL.md`) is added to prove the
  generic-markdown fallback.

### Corruption boundary
- **D-02:** No corruption is introduced in this phase's artifacts directly — the fixture's plan 01-02
  hardening task and plan 01-02 of the real Labelore project introduce corruption elsewhere.

### Claude's Discretion
Everything not named above is open — this is a fixture, not a real implementation target.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. This phase exists to prove the artifact-type
breadth claim, not to model realistic product decisions.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fixture provenance
- `~/.claude/gsd-core/templates/context.md` — the six-tag section grammar this file follows
- `~/.claude/gsd-core/bin/lib/artifacts.cjs` — `CANONICAL_EXACT`/`CANONICAL_PATTERNS`, the ground truth
  for which root files are canonical

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None — this is a synthetic fixture tree with no code.

### Established Patterns
- Registry-dispatched artifact handlers, generic handler unconditional and last (from plan `01-01`).

### Integration Points
None — the fixture has no downstream phase beyond Phase 2 within this same tree.

</code_context>

<deferred>
## Deferred Ideas

- Live reconciliation with a running session — tracked as v4.0 requirement IDENT-04.

</deferred>

---

*Phase: 01-identity-slice*
*Context gathered: 2026-06-05*
