# Phase 1: Kiln bookings - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Members book a one-hour kiln slot on a shared board and see who holds every other slot. Covers the
booking board only; recipes and the calendar come later.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** A slot is exactly one hour, starting on the hour.
- **D-02:** A member may hold at most three future slots at once.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — the charter and key decisions

</canonical_refs>

<code_context>
## Existing Code Insights

The studio's whiteboard is the only existing record; there is no code to reuse.

</code_context>

<specifics>
## Specific Ideas

- The board reads like the whiteboard: kilns across the top, hours down the side.

</specifics>

<deferred>
## Deferred Ideas

- Paying for a slot online — not needed for a studio of this size.

</deferred>
