# Phase 9: Review, Audit and Root Document Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-02
**Phase:** 09-review-audit-and-root-document-pages
**Areas discussed:** Root docs with pages, Review ledger shape, Sketch scope, Thin and odd inputs

---

## Root docs with pages

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to the page | File URL leads to the existing designed page | ✓ |
| Thin file page + link | Short page of its own with a link out | |
| Embed the same component | Existing component inside the file frame | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, scrolled to it | Archived copy opens the live page at that milestone's block, marked shipped | ✓ |
| Same page, filtered to it | Only that milestone, with a banner | |
| File page per archived copy | Designed page reading the archived file | |

| Option | Description | Selected |
|--------|-------------|----------|
| New project page | Own page for PROJECT.md; dashboard head links to it | ✓ |
| Expand the dashboard | Add constraints and decisions to the dashboard | |

| Option | Description | Selected |
|--------|-------------|----------|
| Traceability data | Counts from the traceability projection, linked | ✓ |
| PROJECT.md's own lists | Count PROJECT.md's bullets | |
| Both, shown apart | Show both when they disagree | |

**User's choice:** All recommended options.

---

## Review ledger shape

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs on one page | Pair-page style; each file keeps its URL; shared head | ✓ |
| One merged ledger | One row per finding joined by ID | |
| Separate pages, linked | Three pages with a link strip | |

| Option | Description | Selected |
|--------|-------------|----------|
| Disposition, fix shown apart | Count from disposition; stale rows marked quietly | ✓ |
| Merge to the latest | Fixed if either file says so | |
| Disposition only | No comparison | |

| Option | Description | Selected |
|--------|-------------|----------|
| One Fix tab, one section each | Labelled, anchored part per fix file | ✓ |
| A tab per fix file | Separate tabs | |
| You decide | Planner picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Findings grouped by disposition | Open, then deferred/skipped, then fixed | ✓ |
| Findings by severity | Same grouping as the Review tab | |
| A flat table | Sortable table | |

**User's choice:** All recommended options.

---

## Sketch scope

| Option | Description | Selected |
|--------|-------------|----------|
| Project page | Full sketch loop | ✓ |
| Windows ledger | Full sketch loop | |
| Review ledger | Full sketch loop | |
| Audit + coverage | Full sketch loop | |

| Option | Description | Selected |
|--------|-------------|----------|
| Built from close analogs | Extend nearest designed page; screenshot review after | ✓ |
| UI-SPEC first | /gsd-ui-phase 9 before planning | |
| Sketch later if needed | Analogs now, follow-up sketches if wrong | |

| Option | Description | Selected |
|--------|-------------|----------|
| Before planning | /gsd-sketch before /gsd-plan-phase 9 | ✓ |
| As the first plan task | Checkpoint task inside the phase | |

| Option | Description | Selected |
|--------|-------------|----------|
| Labelore + portal + duet | Prove against three real PROJECT.md files | |
| Labelore only | Hardest one only | |
| You decide | Sketch picks its inputs | ✓ |

---

## Thin and odd inputs

| Option | Description | Selected |
|--------|-------------|----------|
| A quiet 'no external API' card | Designed one-line state; matrix only when a table exists | ✓ |
| Generic document | Render as prose | |
| Fold into the phase page | Show on the phase page | |

| Option | Description | Selected |
|--------|-------------|----------|
| '0 open' + fixed history | Lead with open count; fixed collapsed by phase | ✓ |
| Hide fixed entirely | Only open and waived | |
| Show all, open first | Everything expanded | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs only for files that exist | Lone REVIEW unchanged | ✓ |
| Always show all three tabs | Missing ones show a quiet state | |

| Option | Description | Selected |
|--------|-------------|----------|
| Frontmatter first, prose fallback | Verdict/scores/gaps/debt from frontmatter | |
| Prose first | Headed sections first | |
| You decide | Planner reads both shapes and picks | ✓ |

---

## Claude's Discretion

- Milestone audit source precedence (recommendation recorded: frontmatter first, prose fallback).
- Which real PROJECT.md files the project sketch is proven against.
- WINDOWS.md source of truth (frontmatter, table or JSON block).
- Detailed look of the shipped mark, tab strip and coverage matrix.

## Deferred Ideas

- Sketching the analog-built pages if they look wrong after the build.
