---
title: Where planning-artifact structure actually lives — survey of 425 files
date: 2026-09-20
context: /gsd-explore session settling the artifact categorization question; empirical basis for the per-kind views scope
---

# Artifact structure survey

Measured across **425 markdown files** — 163 in this project's `.planning/` and 262 in
studio-portal's — asking one question per type: *where does its machine-readable structure live?*

The answer decided the categorization question
(`.planning/research/questions.md`, resolved 2026-09-20): extraction keys on **structure-location**,
not on document purpose.

## The partition

| Strategy | Types | Evidence from the survey |
|---|---|---|
| **Frontmatter projection** | PLAN, SUMMARY, VERIFICATION, REVIEW, MILESTONE-AUDIT | Nested YAML. PLAN: 138/139 instances nested, 22 distinct keys. SUMMARY: 126/131 nested, 39 keys, median 96 frontmatter lines. VERIFICATION: 13/13, 18 keys. MILESTONE-AUDIT: median 149 frontmatter lines. |
| **Section projection** | CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW, ROADMAP, REQUIREMENTS, REVIEW-FIX, DISCUSSION-LOG | Stable `##` sets recurring in ≥60% of instances. RESEARCH: 18 recurring headings. UI-SPEC: 8. CONTEXT: 6. VALIDATION: 6. PATTERNS, SECURITY, UI-REVIEW: 5 each. |
| **Tag projection** | PLAN body | `<objective>`, `<execution_context>`, `<context>`, `<task>` — already implemented by `renderPlanRange` in `src/rendering/markdown.ts`. |
| **Degenerate** | COVERAGE, DEFERRED-ITEMS | Median body length 2 and 11 lines respectively. Nothing to project. |

**Purpose does not predict strategy.** VERIFICATION and UAT serve nearly the same purpose and sit
in different rows — which is why a purpose-keyed template buys nothing over a per-type manifest.

## The primitives already exist

`src/planning-repo/handlers/markdown-sections.ts` already exports, tested and in use by typed
handlers:

- `splitSections(body)` — split at `##`
- `splitSubsections(sectionBody)` — split at `###`
- `parseMarkdownTable(sectionBody)` — GFM pipe table → row objects keyed by header cell
- `parseChecklistItems(text)` — GFM `- [ ]` / `- [x]`

Section projection is largely **composition of functions that already ship**, not new parsing.
The types in that row fall through to `GenericMarkdownHandler` today because no handler claims
them — not because the capability is missing.

## DISCUSSION-LOG: the flagship case, fully machine-readable today

Shape, verified across all 12 discussion logs in both projects:

```
## Topic
### Question
| Option | Description | Selected |
|--------|-------------|----------|
| …      | …           | ✓        |
**User's choice:** …
**Notes:** …
```

Convention audit — option-table count vs `✓` count, per file:

| Files | Result |
|---|---|
| 12 of 12 | table count == ✓ count |
| 11 of 12 | `**User's choice:**` present once per table |
| 1 of 12 | uses the variant `**User's choice (free text):**` |

**Therefore: anchor on the table, treat the prose choice line as tolerant enrichment.** The table
is 100% reliable; the prose marker has at least two spellings and will grow more. This is a
degradation rule derived from observed drift, not a guess.

## VERIFICATION: the answer is already on the wire

`human_verification[]` in VERIFICATION frontmatter is already an array of
`{ test, expected, why_human }` triples — the literal answer to "what am I supposed to verify."
It is parsed by `gray-matter`, carried on `artifact.frontmatter`, serialized to the client, and
rendered as one collapsed `<details>` labelled "Document metadata."

For this row of the table, **no handler work is needed at all** — only a view that promotes the
field instead of burying it.

## Scope consequence

The categorization question was framed as ~5 category templates vs ~16 type templates, a 3× swing.
Neither. The real shape:

- **1 new extractor** (section projection), composed from existing primitives
- **2 existing extractors** (frontmatter via gray-matter, tags via `renderPlanRange`)
- **16 small manifests** declaring which fields/sections each type promotes

## Related

- [[per-kind-artifact-rendering]] — the three-axis diagnosis this survey corrects
