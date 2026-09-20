---
title: Per-kind artifact rendering — parsing, design language, and categorization
date: 2026-09-20
context: /gsd-explore session on how planning artifacts render and why document pages read worse than dashboard/roadmap/traceability
---

# Per-kind artifact rendering

Dashboard, Roadmap and Traceability are considered visually correct and internally consistent.
The two document pages (`ArtifactPage`, `PlanPairPage`) are not — but the gap is **not** a restyle.
It is three separate problems, and fixing any one alone leaves the surface broken.

## Axis 1 — Parsing: 11 of 16 types have no structured representation

`.planning/` in this project holds **163 markdown files across 16 distinct types**: PLAN, SUMMARY,
VERIFICATION, UAT, SECURITY, REVIEW, DISCUSSION-LOG, CONTEXT, UI-SPEC, RESEARCH, PATTERNS,
COVERAGE, UI-REVIEW, ROADMAP, REQUIREMENTS, MILESTONE-AUDIT. Closed set, not a long tail.

What the read layer actually extracts (`src/planning-repo/handlers/index.ts`):

| Types | Handler | `kind` | Structure extracted |
|---|---|---|---|
| PLAN | `PlanHandler` | `plan` | Yes — task segments, gates, tdd attributes |
| SUMMARY, ROADMAP, REQUIREMENTS, CONTEXT, PROJECT, STATE | own handlers | own | Yes — real typed fields |
| VALIDATION, SECURITY, UI-SPEC, UAT, VERIFICATION, LEARNINGS | `FrontmatterOnlyHandler` | `frontmatter-only` | **No** — six types in one bucket; frontmatter lifted as an open map, body untouched, zero type-specific parsing (by design, see its header comment) |
| DISCUSSION-LOG, REVIEW, COVERAGE, RESEARCH, PATTERNS, UI-REVIEW | `GenericMarkdownHandler` | `unknown` | **No** — nothing |

Consequence: "when I open a discussion log I want to see the questions, the options I was given,
and what I chose" is not reachable by styling. Nothing parses a DISCUSSION-LOG into questions,
options and choices. Per-type work is therefore **two layers** — a handler that extracts, and a
view that renders — not one.

### Structure that IS extracted is discarded at the client boundary

- The renderer has exactly **one** per-kind branch in the whole codebase:
  `src/rendering/markdown.ts:388`, `input.kind === 'plan'` → `renderPlanRange`. Everything else
  falls through to the same generic markdown chunk.
- `artifact.structured` is serialized by the server (`src/server/index.ts:97`) and declared in the
  client DTO (`src/web/pages/artifact-page.tsx:43`) — and **never read by anything**. The
  "Document metadata" disclosure is built from `frontmatter`, not `structured`
  (`artifact-page.tsx:395`). Every handler's extraction work is dropped at the boundary.

So the seam for per-kind rendering half-exists already: `HANDLERS` is a working registry keyed by
kind on the read side, with no counterpart on the display side.

## Axis 2 — Design language: it exists, it is real, it is undocumented

The three good pages share a genuine vocabulary, already cross-referenced between them — this is
not three pages that happen to look similar:

- `history-section` / `history-list` / `history-milestone` / `history-tree` — roadmap **and** traceability
- `roadmap-loading` — roadmap, traceability **and** search
- `search-group-label` — search **and** traceability
- `status-chip[data-tone]`, `section-heading` (+ `.compact`), `empty-note`, `quiet-state`,
  `notice` / `notice destructive`, `source-note`, `source-link`, `eyebrow`, `lede`, `page-intro`

`.claude/CLAUDE.md` still reads "Conventions not yet established." So the language is emergent and
consistent but unwritten — a sixteenth view has nothing to conform to except reading three pages
and inferring. Naming it must come **before** multiplying surfaces against it, or each new view
re-invents it slightly differently.

`SearchPage` already conforms (`page-stack` + `page-intro` + `lede`). The divergence is exactly
two pages, not five.

## Axis 3 — Categorization: unresolved

Two orthogonal schemes exist and neither answers "what is this document *for*":

- `location` — 6 sidebar groups (`Project`, `Phases`, `Archived phases`, `Quick tasks`,
  `Milestones`, `Research`): where the file lives on disk.
- `kind` — 11 handler kinds, but 11 of 16 types collapse into 2 catch-alls, so it is not usable as
  a presentation axis today.

A purpose-based axis (decision record / verification evidence / specification / research /
narrative) would drive both sidebar grouping and which view template a type receives. Open
question — see `.planning/research/questions.md`. It should be settled before views are designed,
since it determines how many templates there are.

## Delivery shape

One phase to build the ground, then a long list of quick tasks — not one or the other.

The first type must **not** be a quick task: it would add a bespoke branch to `artifact-page.tsx`
plus bespoke CSS, the second would add another, and by the sixth there are six one-off code paths
with no shared contract. That is the same failure already visible between `.page-stack` and
`.artifact-page` (see `.planning/todos/pending/artifact-chrome-drift.md`), multiplied sixteen-fold.

Once a per-kind **view registry** (mirroring `HANDLERS`) and a documented design language exist,
each remaining type genuinely is a small independent task: add a handler, add a view entry.

**Sequence DISCUSSION-LOG first** — highest stated value, zero parsing today, so it exercises both
layers end to end. If the seam can carry questions/options/choices it can carry anything else.

## Related

- [[artifact-chrome-drift]] — the container/reflow defect, independently shippable
