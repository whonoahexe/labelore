---
sketch: 055
name: indexes-page
question: "How should the one Indexes page show a panel per intel file and a graph panel (node and edge counts, build status and age, a short top list) as a picture of a bounded summary, never the raw JSON, however large the file?"
winner: "A"
tags: [indexes, intel, graph, bounded-summary, phase-11]
---

# Sketch 055: Indexes page

## Design Question
Phase 11 D-04 (VIEW-20, success criterion 3). One page: a panel per intel file (`stack`, `file-roles`, `api-map`,
`dependency-graph`, `arch-decisions`, and `SYNTHESIS` where ingest-docs wrote it) plus the graph panel. The server
builds and sends a **bounded summary only**: counts, at most a short top list, file sizes. The raw JSON is never
sent, however large.

Real shape (a real `gsd-intel-updater` run and `graphify update .` + the auto-update hook on a scratch copy of
labelore, read for shape only):
- Intel JSON family: each file is `{_meta:{updated_at, version}, entries:{…}}` (stack.json is flat lists instead);
  file-roles entries carry `type` module | entry-point | type-def | config with exports and imports; api-map
  `method, path, params, file, description`; dependency-graph `version, type production | development, used_by[]`;
  arch-decisions keyed entries (`overview.pattern` reads "A -> B -> C"). `.last-refresh.json` holds hashes and a
  timestamp. Sizes were 1 to 8.5 KB.
- Graph: `graph.json` 22 MB (18,661 nodes, 38,020 links, 1,062 communities), `.last-build-snapshot.json` 22 to 27
  MB (its shape depends on the writer), `graph.html` 1.1 MB, `GRAPH_REPORT.md` 250 KB (God Nodes, Import Cycles,
  Knowledge Gaps; one "question" line is over 5 KB). `.last-build-status.json` exists only when the auto-update
  hook ran: `{ts, status ok | running | failed, exit_code, duration_ms, head_at_build}`. `graphify status` gives
  `built_at_commit`, `current_commit`, `commits_behind`, `age_hours`.
- Ingest-docs family (inferred from GSD's workflow, not run): `SYNTHESIS.md`, `decisions.md`, `requirements.md`,
  `constraints.md`, `context.md` and `classifications/*.json` in the same `intel/` folder.

## How to View
open .planning/sketches/055-indexes-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`); Esc closes an open panel.
- State bar (`?state=json|ingest`), all made up:
  - **Intel JSON + a large stale graph, last build failed:** five intel files; a 41,280-node graph built 12
    commits behind HEAD, whose last auto-update failed (exit 1), so the counts are from the build before it; 47 MB
    graph.json and 59 MB snapshot listed as "Not sent to this page".
  - **Ingest-docs intel, no graph (inferred):** a synthesis over 14 documents with 3 auto-resolved, 2 competing
    and 1 unresolved conflict; four per-type documents; no `graphs/` folder.

## Shared across all three (the panels)
- Graph: four big counts (nodes, edges, communities with thin, import cycles); three freshness cells (Built from
  {commit}, N commits behind `in-flight`; Last good build {date}, age; Last auto-update ok | running | failed, exit
  code, duration, `missing` on failed); the extraction split (EXTRACTED / INFERRED / AMBIGUOUS); "Most connected
  (top 10 of N)" as bars; a dashed "Not sent to this page" line with each big file's size.
- Architecture: the overview pattern drawn as numbered layers, quoted as written; every other key as a row.
- Stack: chips per list, plus build, tests and package manager.
- File roles: a type split bar, then up to 12 paths grouped by folder with their type; "{shown} of {n} entries".
- API surface: method counts, then up to 6 routes (method, path, description, file); "{shown} of {n} routes".
- Dependencies: a production / development split and the most used, by `used_by` count.
- Synthesis: documents, the conflict buckets as tone chips (auto-resolved `quiet`, competing `in-flight`,
  unresolved `missing`), the classification split, the four documents, and the classifications count only.
- Each panel's foot: path, `_meta` updated date and version, size.

## Variants
- **A: Instrument grid.** A tile per file with its key figure (graph counts and two status chips, the layer
  stack, the framework chips, big counts with split bars); a tile opens to full width in place. The graph and
  synthesis tiles are wide; a missing graph is a hatched, dashed tile.
- **B: Reuse — rail + chips and lanes.** 042 A's rail + column, grouped Graph and Intel with a count per entry;
  the column shows one panel. The API panel uses the shipped lanes (one lane per method); the stack, the shipped
  chips.
- **C: System figure.** One drawing from the indexes together: the graph's counts and status in the frame bar; the
  arch-decisions layers as bands; file-roles paths placed in the band whose folder they sit in; api-map routes in
  the band of their file; files no layer names in an "Outside the pattern" band; dependencies and the stack along
  the bottom. Any part opens its file's panel under the figure. With ingest-docs intel only, there is nothing to
  draw and the synthesis opens.

## What to Look For
- Does the page read as a summary of indexes, not as the indexes themselves? Is "Not sent to this page" clear?
- Does a stale graph with a failed last update read as two facts (old counts, failed refresh), not as broken?
- C ties the files together but leans on the arch pattern naming folders. Is that worth it, given how the real
  pattern is often written?
- With an ingest-docs-only project, which variant still feels finished?

## Open points for the build
- Bound per panel: up to 10 hubs, 12 paths, 6 routes, 8 dependencies, every arch key (they are few). The server
  streams graph.json for counts and hubs without holding it whole, or reads them from GRAPH_REPORT's Summary and
  God Nodes when present. The snapshot file is never read, only stat'ed.
- C's layers come from splitting `overview.pattern` on "->"; a layer's folder is matched from the data-flow text's
  paths. When nothing matches, C falls back to B's column (no example yet).
- The ingest-docs family is inferred; D-14's real run did not include ingest-docs.
- Sketch words, not UI-SPEC copy: "Indexes", "Not sent to this page", "Most connected", "How the edges were found",
  "Built from", "Last good build", "Last auto-update", "Outside the pattern", "Underneath".

All text is made up. The repository is public.

## Winner
**A: Instrument grid**, chosen by the user: "A seems alright". No synthesis.

Build A as drawn in its tab (marked "★ Selected"):
- **Grid:** three columns (two under 56rem, one under 34rem), one tile per index file, in the order Graph,
  Architecture, Stack, File roles, API surface, Dependencies (ingest-docs projects: Synthesis, Graph).
- **Wide tiles:** Graph, Synthesis, File roles and Dependencies span two columns, so every row fills.
- **Each tile:** the title, the file path and its key figure:
  - Graph: node and edge counts, a "{n} commits behind" `in-flight` chip and a "Last update failed" `missing` chip
    when they apply.
  - Architecture: the layer stack.
  - Stack: the framework chips.
  - File roles, API surface and Dependencies: a big count with a split bar or method chips.
  - Synthesis: the document count and conflict chips.
- **Graph not built:** a hatched, dashed tile reading "Not built".
- **Opening a tile:** it spans the full row in place and shows the shared panel (above), with a close button; Esc
  closes it. Each open tile has its own URL (`/<project>/indexes/<file>`).
- **Bounded summary:** the panel content listed under "Shared across all three", unchanged.
