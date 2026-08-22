# Phase 1: Identity Slice - Research

**Researched:** 2026-06-06
**Domain:** Fixture authoring against gsd-core's own artifact contract
**Confidence:** HIGH

<research_summary>
## Summary

This is a synthetic research document, authored to give the identity-slice phase a realistic
`01-RESEARCH.md` to parse. No real research was performed — this file exists to exercise the
"NN-RESEARCH.md" artifact type's frontmatter-free, fixed-section-tag grammar.

**Primary recommendation:** N/A — fixture-only document.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none) | - | This is a fixture, not a real research document | - |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
fixtures/dense/
├── .planning/       # the tree this research document lives inside
```
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fixture authoring | Ad-hoc example files | Templates in `~/.claude/gsd-core/templates/` | Traceability (D-01) |
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Overfitting to one real project
**What goes wrong:** A parser assumes shapes only `~/studio-portal` happens to have
**Why it happens:** It's the only real project on the machine
**How to avoid:** Derive shapes from `gsd-core` templates instead (D-01)
**Warning signs:** Code comments like "studio-portal always has..."
</common_pitfalls>

<code_examples>
## Code Examples

### N/A
This fixture document has no real code examples.
</code_examples>

<sources>
## Sources

### Primary (HIGH confidence)
- `~/.claude/gsd-core/templates/research.md` — the template this file follows
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: N/A (fixture)
- Ecosystem: N/A
- Patterns: N/A
- Pitfalls: N/A

**Confidence breakdown:**
- Standard stack: HIGH - this is a fixture, not a claim about real technology
- Architecture: HIGH - same reason
- Pitfalls: HIGH - same reason
- Code examples: HIGH - same reason

**Research date:** 2026-06-06
**Valid until:** N/A — fixture document, does not go stale
</metadata>

---

*Phase: 01-identity-slice*
*Research completed: 2026-06-06*
*Ready for planning: yes*
