---
phase: 10-codebase-map-specification-and-check-pages
plan: 03
subsystem: codebase-map
tags: [codebase-map, shape-findings, concern-counting, fresh-maps, read-only-scan]
status: complete

requires:
  - phase: 07-file-shapes
    provides: the Shapes fixture project and its three codebase map documents (templates-only shapes)
provides:
  - fresh real codebase maps for labelore (committed) and the two other D-03 repositories (outside this repository)
  - the concern-counting rule decision for 10-05 (RESEARCH C3, A1)
  - heading variant, stamp and other-shape findings for 10-05 (lifts), 10-08, 10-12 and 10-14 (screenshots)
affects: [10-05 codebase lifts, 10-08 codebase page, 10-12, 10-14, 10-15 corpus tests]

actuals:
  tokens: 27300
  tasks: 2
  commits: 1
plan_head_before: 717c8d7db3d75717948b08690df3a087fc01684d
plan_head_after: 3ad82645f46529e3a59ee7393e9d36cb42d43d7d
commits: 1

tech-stack:
  added: []
  patterns: [read-only shape scan with throwaway scripts in the scratchpad, nothing committed besides the map and this summary]

key-files:
  created:
    - .planning/codebase/STACK.md
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/CONVENTIONS.md
    - .planning/codebase/TESTING.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/codebase/CONCERNS.md
    - .planning/phases/10-codebase-map-specification-and-check-pages/10-03-SUMMARY.md
  modified: []

key-decisions:
  - "Concern-counting rule adjusted, not confirmed as is: bold-label groups need ONE or more (not two or more), and a group whose first field value is None, Not detected or Not applicable counts 0"
  - "Unmatched ## sections inside CONCERNS are counted by the same rule and join the total, shown after the known ones in document order"
  - "A repeated known heading (Test Types Summary after Test Types) takes no second slot; it falls through as a plain section"
  - "Known heading keys stay the full template texts; no short aliases (a short Naming alias would wrongly capture a project's added Naming section)"

requirements-completed: [VIEW-13]

duration: 40min
completed: 2026-11-04
---

# Phase 10 Plan 03: Fresh codebase maps and the concern-counting rule Summary

**Three fresh full maps from the installed GSD exist, labelore's is committed, and reading them for shape shows the template headings are matched exactly in all 21 documents, the concern-counting order needs one fix (bold-label groups count from one, not two) plus a None-group zero rule, and no fenced block holds a line starting with two hashes.**

## Performance

- **Duration:** about 40 min for Task 2 (Task 1 was run by the orchestrator at the user's request)
- **Tasks:** 2 of 2 (Task 1 completed by the orchestrator, Task 2 by this executor)
- **Files modified:** this summary only (the seven map documents came from Task 1)

## Task 1 record (completed by the orchestrator)

Task 1 is the `checkpoint:human-action`. The user answered "maps done", and the orchestrator ran the full `/gsd-map-codebase` (four mapper agents per repository, stamped, secret-scanned) in all three repositories at the user's request:

| Repository | Commit | Result |
|------------|--------|--------|
| labelore | 3ad8264 "docs: map existing codebase" | seven documents committed here |
| second D-03 repository (the one named after the portal) | 44cf03a | seven documents, committed in that repository |
| third D-03 repository | e55f760 | seven documents, committed in that repository |

Verified at resume: `ls .planning/codebase/*.md | wc -l` prints 7 here; the other two folders each hold seven .md files; `git log -1 -- .planning/codebase` in this repository prints `3ad82645f46529e3a59ee7393e9d36cb42d43d7d`.

In the sections below, "map 1" is labelore, "map 2" and "map 3" are the second and third repositories in the order CONTEXT D-03 names them. Nothing from maps 2 and 3 is copied here: only generic template heading texts, counts and yes/no facts (threat T-10-06). Headings that exist only in map 2 or map 3 appear as `[project-specific heading]`. Map 1's own extra headings are named because that map is public and committed.

## Heading variants

Method: every `##` heading outside a fence, normalised as the UI-SPEC Lifts table says (drop leading emoji, digits and punctuation, lower-case, ampersand to "and", collapse spaces, drop a trailing plural s, then equal, prefix or whole-word containment) against the template headings of that document type.

Result: **every template heading in all 21 documents equals its known key after normalisation.** The real maps do not exercise the fuzzy tolerance (emoji, numbering, plural, added word); they only exercise "extra sections the template does not have" and "a known section missing". The variant fixtures in 10-05 therefore have to be made up (they cannot be lifted from these maps).

| Document type | Template H2 texts found (equal after normalisation) | Extra H2s (fall through to plain sections) | Known H2 absent |
|---------------|------------------------------------------------------|--------------------------------------------|-----------------|
| STACK | Languages, Runtime, Frameworks, Key Dependencies, Configuration, Platform Requirements (6 of 6 in all three maps) | none in any map | none |
| ARCHITECTURE | System Overview, Component Responsibilities, Pattern Overview, Layers, Data Flow, Key Abstractions, Entry Points, Architectural Constraints, Anti-Patterns, Error Handling, Cross-Cutting Concerns (11 of 11 in maps 1 and 3) | none | map 2 has no Component Responsibilities (10 of 11) |
| STRUCTURE | Directory Layout, Directory Purposes, Key File Locations, Naming Conventions, Where to Add New Code, Special Directories (6 of 6 in all three) | none | none |
| CONVENTIONS | Naming Patterns, Code Style, Import Organization, Error Handling, Logging, Comments, Function Design, Module Design (8 of 8 in all three) | map 1: Web (React) Conventions, Server (Hono) Conventions, Naming of Presentation Concepts, Where to Follow These Rules; map 2: one `[project-specific heading]` ("conventions to follow when adding code" in kind); map 3: none | none |
| TESTING | Test Framework, Test File Organization, Test Structure, Mocking, Fixtures and Factories, Coverage, Test Types, Common Patterns (8 of 8 in all three) | map 1: Forbidden Test Constructs, Adding a Test: Checklist, and **Test Types Summary** (a second heading that prefix-matches Test Types); map 2: one `[project-specific heading]` ("adding tests" in kind); map 3: none | none |
| INTEGRATIONS | APIs & External Services, Data Storage, Authentication & Identity, Monitoring & Observability, CI/CD & Deployment, Environment Configuration, Webhooks & Callbacks (7 of 7 in all three) | map 1: File Watching; maps 2 and 3: none | none |
| CONCERNS | Tech Debt, Known Bugs, Security Considerations, Performance Bottlenecks, Fragile Areas, Scaling Limits, Dependencies at Risk, Missing Critical Features, Test Coverage Gaps (9 of 9 in maps 1 and 3) | map 2: two `[project-specific heading]` sections (one about destructive operations, one about repository hygiene, in kind) | map 2 has no Missing Critical Features (8 of 9) |

Findings for 10-05:

1. **A repeated known heading.** Map 1's TESTING holds both "Test Types" and "Test Types Summary"; the second prefix-matches the first's key. The rule: the first heading to claim a key takes the slot, a later heading matching the same key falls through as a plain section (do not merge them, do not drop either).
2. **Do not add short aliases.** If the Conventions key set held a short "naming", map 1's "Naming of Presentation Concepts" would match it by prefix and wrongly become a lifted Naming section. Keys stay the full template texts ("naming patterns"); fuzziness comes from the normalisation, not from shortening keys.
3. **Order varies.** Map 2's CONCERNS puts Security first and moves Dependencies at Risk after Test Coverage Gaps; map 1's TESTING puts Test Types before Mocking. Lifts must key by heading text, never by position.
4. **The same heading text appears in two document types** (Error Handling in ARCHITECTURE and CONVENTIONS), so key sets are per document type.
5. **Preamble before the first H2.** CONCERNS in all three maps has a short scope, overview or priority-key paragraph before its first H2 (map 2's is a priority key); map 1's INTEGRATIONS has an introductory paragraph; map 2's CONVENTIONS has a paragraph plus a short bullet list. Everything between the H1 and the first H2 (after the Analysis Date line) must render as a plain intro, not be lost.
6. **A footer italic line** (`*Concerns audit: DATE*` and its siblings) sits at the end of the last section's body in every document. It is single-star italic, so it never matches a bold-label or bullet rule, but a plain section remainder will include it.

STACK bullet shape (matters for the Languages and Frameworks chips): the spec says `Name Version - purpose`. In the real maps only part of the bullets follow it.

| Map | Languages: spaced dash / bullets | Languages: version as last token left of the dash | Frameworks: spaced dash / bullets | Key Dependencies: spaced dash / bullets |
|-----|------|------|------|------|
| 1 | 5 / 6 | 0 of 6 (the version is followed by a parenthetical qualifier or absent) | 15 / 16 | 8 / 11 |
| 2 | 6 / 6 | 0 of 6 | 11 / 21 | 20 / 20 |
| 3 | 4 / 4 | 0 of 4 | 7 / 14 | 6 / 8 |

So 10-05's bullet splitter must: split on the first spaced dash only when present; find the version as the first digit-led token (optionally prefixed `v`, `^` or `~`, optionally inside parentheses or backticks) in the left part, not only a trailing one; and show the plain bullet text when no version is found (for example "edition 2024" style text). Languages almost never end in a version token.

## Stamps

All 21 documents carry **frontmatter with exactly two keys, `last_mapped_commit` then `last_mapped_at`**, as the first lines of the file (before the H1 and before the ARCHITECTURE refreshed comment).

| Fact | Map 1 | Map 2 | Map 3 |
|------|-------|-------|-------|
| `last_mapped_at` present in documents | 7 of 7 | 7 of 7 | 7 of 7 |
| `last_mapped_commit` present in documents | 7 of 7 | 7 of 7 | 7 of 7 |
| Commit length / form | 40 hex characters, contains letters | 40 hex, contains letters | 40 hex, contains letters |
| Would any commit parse as a YAML number | no | no | no |
| `last_mapped_at` form | `YYYY-MM-DD`, unquoted (parses to a `Date` in Labelore's parser, RESEARCH Pitfall 3) | same | same |
| `**Analysis Date:**` under the H1 | 7 of 7 | 7 of 7 | 7 of 7 |
| `*Last updated:*` | 0 | 0 | 0 |
| `<!-- refreshed: DATE -->` comment | ARCHITECTURE only | ARCHITECTURE, CONVENTIONS, TESTING | ARCHITECTURE only |
| Footer italic line | 7 of 7 (`Stack analysis`, `Architecture analysis`, `Structure analysis`, `Convention analysis`, `Testing analysis`, `Integration audit`, `Concerns audit`) | 7 of 7 | 7 of 7 |
| Dates differ between documents of one map | no, all one day | no | no |
| Commit differs between documents of one map | no, one commit | no | no |

Notes for 10-05:

- The stamp commit is the repository HEAD at mapping time (for map 1 the parent of the map commit), not the map commit itself; the page shows it as text only, as the UI-SPEC says.
- The `refreshed` comment appears in some documents and not others of the same map, so it is only a fallback date source; frontmatter `last_mapped_at` was present everywhere and wins.
- Because all dates in one map agree today, the "newest date wins, each panel keeps its own" rule (RESEARCH A3) is untested by real data and needs a made-up fixture where they differ.

## Concerns

Each CONCERNS document has `##` sections whose bodies are, in every case that has content, **bold-label groups**: a line that is only `**Label:**` (the label sometimes carries a parenthetical priority such as "(Low)"), followed by field bullets. No section in any map uses `###` subsections, a bare bullet list without bold labels, or a table.

Candidate rules compared. "Bullets" is the naive top-level bullet count (the original UI-SPEC wording). "As written" is the RESEARCH Pitfall 1 order (`###`, then bold-label lines only when two or more, then bullets that do not begin with a known field label, then table rows). "Adjusted" is the order recorded under "Concern-counting rule" below. Cells read `shape: bullets / as written / adjusted`.

| Section | Map 1 | Map 2 | Map 3 |
|---------|-------|-------|-------|
| Tech Debt | bold groups: 24 / 6 / 6 | bold groups: 19 / 6 / 6 | bold groups: 16 / 4 / 4 |
| Known Bugs | bold groups: 7 / 2 / **1** | bold groups: 16 / 4 / 4 | prose only, no list: 0 / 0 / 0 |
| Security Considerations | bold groups: 24 / 6 / 6 | bold groups: 32 / 9 / 9 | bold groups: 23 / 6 / 6 |
| Performance Bottlenecks | bold groups: 12 / 3 / 3 | bold groups: 7 / 2 / 2 | bold groups: 8 / 2 / 2 |
| Fragile Areas | bold groups: 14 / 4 / 4 | bold groups: 13 / 4 / 4 | bold groups: 13 / 4 / 4 |
| Scaling Limits | bold groups: 6 / 2 / 2 | bold groups: 6 / 2 / 2 | bold groups: 9 / 3 / 3 |
| Dependencies at Risk | bold groups: 6 / 2 / 2 | bold groups: 5 / 2 / 2 | bold groups: 3 / **0** / **1** (a single group) |
| Missing Critical Features | bold groups: 4 / 2 / 2 | section absent | bold groups: 3 / 2 / 2 |
| Test Coverage Gaps | bold groups: 16 / 4 / 4 | bold groups: 11 / 3 / 3 | bold groups: 12 / 3 / 3 |
| Extra sections (not among the nine) | none | `[project-specific heading]` (destructive operations): 8 / 2 / 2; `[project-specific heading]` (repository hygiene): 4 / 2 / 2 | none |
| Total, the nine named sections | 113 / 31 / **30** | 109 / 32 / 32 | 87 / 24 / **25** |
| Total including extra sections | 113 / 31 / 30 | 121 / 36 / 36 | 87 / 24 / 25 |

What the table shows:

- **Counting top-level bullets is wrong everywhere**: the totals 113, 109 and 87 are three to four times the real count (every concern has three to five field bullets). This confirms RESEARCH Pitfall 1 and rejects the UI-SPEC wording.
- Every non-empty section of every map reaches shape (2), bold-label groups. No real section reaches shape (3) or (4); those branches stay specified and fixture-tested only.
- **Two defects in the as-written order** show up in real data:
  1. Map 3's Dependencies at Risk has exactly one bold-label group. "Two or more" sends it to the bullet rule, where all three bullets are field bullets, so the section counts 0 instead of 1.
  2. Map 1's Known Bugs has a group whose label says no defects are open and whose first field reads "Symptoms: None recorded." The as-written rule counts it as a bug; the section really holds one.
- Field-label lists are brittle: the real maps use field labels beyond the list in Pitfall 1 (Fix, Mitigation, Recommendation in the singular, Current behaviour, Concern, Note, "What's not tested" with a parenthetical or "in CI" suffix, and project-specific ones like a labelled path list). This only matters for shape (3), which no real section reaches, but the list has to grow.
- Map 3's Known Bugs is one sentence of prose saying nothing was found and pointing at a debug folder. Every shape gives 0, so no special case is needed; prose must simply never be counted.
- Map 2's CONCERNS has two sections outside the nine, holding 4 of its 36 concerns (about 11 percent). Dropping them would under-state the total.

### Concern-counting rule

Decision: **adjusted, not confirmed as is.** Rule for 10-05 to implement verbatim, applied identically to every map. Take the body of a `##` section found by a fence-aware scan (fence markers may be indented, and a fence is closed by a marker of the same character and at least the same length). Try the shapes in this order and use the first that yields one or more units: (1) `###` subsections; (2) bold-label lines, meaning a line that is only `**...**` (the label may end with a colon inside or outside the bold and may contain a parenthetical), counting **one or more** (not two or more) and counting each line as one concern; (3) top-level bullets that do not begin with a field label, where a field label is the text before the first colon, matched case-insensitively against Issue, Files, Impact, Fix approach, Fix, Symptoms, Trigger, Workaround, Risk, Current mitigation, Mitigation, Recommendations, Recommendation, Current behaviour, Concern, Note, Problem, Cause, Improvement path, Why fragile, Safe modification, Test coverage, Current capacity, Limit, Scaling path, Migration plan, Blocks, Priority, and any label that starts with "What's not tested"; (4) table rows, excluding the header and separator rows. After choosing a shape, a unit counts 0 when its first field value (the text after the colon of its first bullet) begins with None, Not detected or Not applicable, which is how "No open defects" groups drop out. A section with no units counts 0 whatever prose it holds, and a section whose only text is None, Not detected or Not applicable counts 0. The single-star footer line is never a unit. The nine named sections are looked up by normalised heading, Security Considerations first and the rest in document order; any other `##` section inside CONCERNS is counted by the same rule, shown after the known ones in document order under its own heading text, and included in the total (a CONCERNS document is by definition a list of concern categories). A known section that is absent shows 0 (dashed square), as the UI-SPEC says. The corpus test over labelore's own map should assert invariants only (every count a non-negative integer, the named headings found or absent, the sum equals the shown total) plus one fixture per shape, one for a single bold group, one for a None group, one for a prose-only section and one for an extra section.

With this rule the adjusted totals are 30 for map 1, 32 (36 with extras) for map 2 and 25 for map 3.

## Other shapes

- **Fenced block with a line starting with two hashes: no, in all 21 documents** (checked fence-aware, indented markers included). The hazard in Pitfall 2 is real in principle but not hit by these maps. Single-hash lines inside fences do occur: TESTING in map 2 has three (shell comments in a command block). Tree lines in STRUCTURE carry trailing `# comment` text on most lines (36, 29 and 16 of 37, 34 and 19 lines), but none starts with a hash, so they cannot be mistaken for headings. The fence-aware scanner and its fixture are still required (the next map may hold a `##` shell comment), and the scanner must accept **indented fence markers**: map 3's CONVENTIONS has both its fences indented inside list items.
- **Variable name with a value beside it: yes in all three maps, never in the Environment Configuration section.** Each map has a few inline mentions of a run-mode switch written as `NAME=value` in prose (STACK, ARCHITECTURE, CONCERNS, TESTING or the Authentication section of INTEGRATIONS, depending on the map). They are mode selectors (a production switch, a dev-auth switch, a build switch), not credentials. The Environment Configuration sections themselves list names only: bullets of a backticked name, sometimes a ` - purpose`, under bold labels that vary (a "Required env vars" label, a "Required backend env vars (names only)" label, an "Optional env vars" label, "Secrets location"), and in map 1 a bullet stating that nothing is required. The "Value not shown" row rule therefore fires in the lifted Environment Configuration list on no real input; it stays tested on a made-up fixture. The orchestrator's secret scan found nothing, and this scan found no credential-like value beside a name in any of the 21 documents. The inline `NAME=value` mentions are in the plain-section remainder and Source mode, which the UI-SPEC leaves unmasked.
- **Architecture diagram fence language: `text`, in all three maps**, the only fence in each ARCHITECTURE, preceded by one line of prose under System Overview and drawn with box-drawing characters (not `+--` ASCII). Map 1 has 38 diagram lines, map 2 has 29, map 3 has 22.
- **Structure tree: fence with no language**, box-drawing prefixes, maximum depth 4 (map 1, 37 lines), 3 (map 2, 34 lines) and 2 (map 3, 19 lines), counting the root as depth 0. Most lines carry a trailing `# comment`.
- **ARCHITECTURE `###` use**: 8, 8 and 6 `###` headings, all under Data Flow and Anti-Patterns. Anti-Patterns uses the three bold labels (What happens, Why it's wrong, Do this instead) in 4, 4 and 3 subsections in maps 1, 2 and 3 (map 3's third subsection carries only "Do this instead", so the swap view must tolerate missing labels). Map 2 has no Component Responsibilities, so its table lift never fires there; maps 1 and 3 have it as a pipe table.
- Private names in labelore's map, per document (grep -ciE over the deny words, host tells, tool tells and home paths from `test/fixture-leak.test.ts`):
  - Private names in labelore's map, STACK: no
  - Private names in labelore's map, ARCHITECTURE: no
  - Private names in labelore's map, STRUCTURE: no
  - Private names in labelore's map, CONVENTIONS: no
  - Private names in labelore's map, TESTING: no (two generic placeholder paths such as a home directory with a placeholder user, nothing real)
  - Private names in labelore's map, INTEGRATIONS: **yes**, one line in the CI/CD & Deployment section (the MCP server registration) names the machine's real user account inside a home path (a deny word plus a home path)
  - Private names in labelore's map, CONCERNS: no

  Sketches drawn from labelore's map must leave that INTEGRATIONS line out; this plan records it and changes nothing (the mapper repeated what labelore's own CLAUDE.md or `.mcp.json` states).

## Screenshot inputs

The three longest documents per repository (`wc -l`), the "hardest real docs" for 10-08, 10-12 and 10-14. Maps 2 and 3 live outside this repository, so they are named by document type only.

| Map | 1st | 2nd | 3rd |
|-----|-----|-----|-----|
| Map 1 (labelore, `.planning/codebase/`) | TESTING 302 lines | ARCHITECTURE 287 lines | STRUCTURE 238 lines |
| Map 2 (second D-03 repository) | ARCHITECTURE 275 lines | TESTING 256 lines | STRUCTURE 253 lines |
| Map 3 (third D-03 repository) | TESTING 176 lines | ARCHITECTURE 175 lines | CONCERNS 170 lines |

Why these are the hard ones: TESTING carries the most fences (9, 6 and 8) and run-command blocks; ARCHITECTURE carries the diagram, the `###` anti-pattern subsections and (maps 1 and 3) the component table; STRUCTURE carries the deepest tree (map 1). Map 2's CONCERNS (228 lines, outside the top three) is the one with extra sections and the largest count (36), and map 1's CONCERNS (206 lines) is the one with the None group; both are better CONCERNS panel inputs than the longer documents above.

## labelore map committed

`git log -1 --format=%H -- .planning/codebase` prints `3ad82645f46529e3a59ee7393e9d36cb42d43d7d` ("docs: map existing codebase"), and the folder holds seven documents. The tests that walk this repository's own `.planning` (recognition-kinds, route-table, the LB corpus tests) will see the seven new files first in 10-05's full gate, which fixes any pin they break; this plan edits no test.

## Deviations from Plan

None - plan executed as written. Task 1 ran as the orchestrator's delegated checkpoint response rather than inside this executor, as the resume instructions said.

## Known Stubs

None. This plan builds nothing.

## Threat Flags

None. No new endpoint, auth path or file access was introduced. Threat T-10-06 (information disclosure from the two other maps) is mitigated: this summary holds counts, generic template heading texts and yes/no facts, with `[project-specific heading]` and kind descriptions where a heading belonged to a repository other than labelore; no value, path or repository-specific name from maps 2 and 3 was written to any file in this repository.

## Self-Check: PASSED

- 7 documents under `.planning/codebase/`: found
- Commit `3ad82645f46529e3a59ee7393e9d36cb42d43d7d` touches `.planning/codebase`: found
- This summary holds the `## Heading variants` section, the `Concern-counting rule` decision and a private-names line per document.
