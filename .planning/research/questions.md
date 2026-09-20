# Open Research Questions

Questions raised during planning that need deeper investigation before they can be decided.
Resolved questions are kept, marked, and dated — the reasoning is the point, not the entry.

---

## ~~How should the 16 artifact types be categorized for presentation?~~ — RESOLVED 2026-09-20

**Raised:** 2026-09-20 (`/gsd-explore` — planning artifact rendering)
**Resolved:** 2026-09-20 (`/gsd-explore` — artifact categorization)
**Was blocking:** per-kind artifact views (ROADMAP.md backlog)

### The decision

**No purpose taxonomy.** Extraction is keyed on **where a type's structure lives**, not on what
the document is for. `kind` becomes the single presentation axis and goes granular; the sidebar
stays grouped by `location`.

The question was framed as a fork between ~5 purpose-category templates and ~16 per-type
templates — a 3× scope swing. **Neither is the answer.** The real shape is 3 extraction
strategies (2 of which already exist) plus 16 small per-type manifests declaring which fields or
sections to promote. A manifest is a handful of lines, not a template.

### Why purpose lost

Purpose does not predict extraction strategy, so keying templates on it buys nothing. VERIFICATION
and UAT serve nearly the same purpose but store their structure in completely different places —
VERIFICATION's in nested YAML frontmatter, UAT's in `##` sections. A purpose-keyed template would
have to implement both paths anyway, which is the per-type manifest with extra indirection.

Purpose *would* still describe which fields to promote — but that is exactly what a manifest says,
directly, without a second taxonomy to keep in sync.

Evidence: `.planning/notes/artifact-structure-survey.md` (survey of 425 planning files across this
project and studio-portal).

### The five sub-questions, answered

1. **What are the purpose categories, and do the 16 types partition cleanly?**
   Moot — no purpose categories. The types partition by structure-location instead, and that
   partition *is* clean: frontmatter-projection (5 types), section-projection (12), tag-projection
   (PLAN body, already built), degenerate/near-empty (COVERAGE, DEFERRED-ITEMS).

2. **Is purpose a third field, or does it replace `kind`'s presentation role?**
   Neither — there is no purpose field. `kind` becomes the single presentation axis.

3. **Does one category map to one template, or do types need individual views?**
   Neither framing survives. Types share *extractors* and differ by *manifest*. Expect 3 extractors
   and 16 manifests, not N templates.

4. **Should the sidebar regroup by purpose, keep location, or offer both?**
   Keep `location`. With no purpose field there is nothing to regroup by, and location already
   answers "where does this live", which is what the tree is for.

5. **How does an unrecognized type degrade?**
   **Speculative structural read.** Because extraction keys on structure rather than filename, an
   unrecognized *name* can still be structurally recognized: nested frontmatter gets the
   frontmatter projection, stable `##` sections get the section projection with a navigable
   outline, neither gets plain markdown. The existing unknown-kind badge marks it. An unmanifested
   type therefore reads *better* than today, and writing its manifest later is a refinement rather
   than a rescue.

### Consequence to carry forward

`kind` must go granular. Today 11 of the 16 real types collapse into two catch-alls —
`frontmatter-only` (VALIDATION, SECURITY, UI-SPEC, UAT, VERIFICATION, LEARNINGS) and `unknown`
(DISCUSSION-LOG, REVIEW, COVERAGE, RESEARCH, PATTERNS, UI-REVIEW). With purpose dropped, `kind` is
the only presentation axis, so those catch-alls have to split into real kinds. Note this is a
*presentation* requirement; `FrontmatterOnlyHandler` remains a legitimate shared *parse* path for
types whose structure genuinely is just frontmatter.
