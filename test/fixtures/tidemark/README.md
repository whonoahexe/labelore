# Tidemark: the made-up map-only fixture project

Every file under this folder is made up. Tidemark is not a real product, and none of its words, names,
paths, IDs, dates, hosts or people were copied from any real project. Real codebase maps were looked at only
to learn their structure (headings, label lines, table shapes, frontmatter keys, footers); the words were
invented fresh. Tests read this folder and nothing else on the machine.

## The fiction

Tidemark is a web app for a small harbour's berth board. Boat owners request a berth for a stay, the harbour
office confirms it, and the tide windows decide when a given berth can be used at all. Domain:
`tidemark.example` only.

People:

- Odile Brandt, harbourmaster
- Kofi Mensah, developer

## What this project is for

Tidemark's `.planning/` holds only a codebase map and one stray changelog. That is what `/gsd-map-codebase`
leaves behind in a project before `/gsd-new-project` has run: no `ROADMAP.md`, no `STATE.md`, no `phases/`.
Labelore's codebase pages and its opening paths are built and tested against this shape.

## Hard shapes it carries

- Stamped frontmatter on six of the seven map documents, with two different `last_mapped_at` dates
  (2026-10-28 and 2026-10-30) and one 40-character `last_mapped_commit` that contains letters.
- One older-style document (CONVENTIONS) with no frontmatter, only `**Analysis Date:**` and a
  `*Last updated:*` footer.
- A `Languages & Runtimes` heading in STACK and an `API Architecture` heading in ARCHITECTURE that no lift
  knows.
- A fenced diagram line that starts with two hashes and a space (ARCHITECTURE), and fenced shell comments
  that start with one hash (TESTING).
- A CONCERNS document with all nine sections of unequal length, one for each counting shape.
- An environment variable written with a placeholder value beside it (INTEGRATIONS).

## Authoring rules

- **R1** Keep every heading, label line and footer a test relies on.
- **R2** Every word, name, path, date and person is invented.
- **R3** Pin values per file, never a total over the whole project.
- **R4** Every file below has a row in the ledger: its path, why it exists, and the plan that added it.
- **R5** Nothing here is ignored by git: check with `git check-ignore` before committing a new file.

## Ledger

| Path | Why it exists | Added by |
|---|---|---|
| `README.md` | this ledger | 10-24 |
| `.planning/codebase/STACK.md` | stamped, 2026-10-28; `Languages & Runtimes` heading in place of Languages and Runtime; older `*Stack analysis:*` footer | 10-24 |
| `.planning/codebase/ARCHITECTURE.md` | stamped, 2026-10-30 (the newest date); refreshed comment line after the frontmatter; a `##` line inside the fenced diagram; an added `API Architecture` heading | 10-24 |
| `.planning/codebase/STRUCTURE.md` | stamped, 2026-10-30; a fenced tree four levels deep; three `New ...:` groups under Where to Add New Code | 10-24 |
| `.planning/codebase/INTEGRATIONS.md` | stamped, 2026-10-28; `TIDEMARK_TIDE_FEED_KEY=PLACEHOLDER-NOT-A-REAL-KEY` in the Required env vars list, a value the Integrations panel must withhold | 10-24 |
| `.planning/codebase/CONVENTIONS.md` | the older map form: no frontmatter, first line a made-up comment marker, `**Analysis Date:**` 2026-10-27 and a `*Last updated: 2026-10-27*` footer | 10-24 |
| `.planning/codebase/TESTING.md` | stamped, 2026-10-28; `Run Commands` in a bash fence with a one-hash comment line before each of three commands | 10-24 |
| `.planning/codebase/CONCERNS.md` | stamped, 2026-10-30; nine sections, expected counts below | 10-24 |
| `.planning/CHANGELOG-2026-10.md` | a stray extra with three lines: it must not stop the project being map-only; not a rule kind, so no index row | 10-24 |

## Expected concern counts, per file

Counted by hand in `CONCERNS.md` under the adjusted rule recorded in plan 10-03 (the shapes tried in order:
`###` subsections, bold-label lines counted from one, top-level bullets without a field label, table rows; a
section holding only None, Not detected or Not applicable counts 0). Per file, never a project total (R3).

| Section | Shape | Count |
|---|---|---|
| Tech Debt | three bold-label groups of Issue, Files, Impact and Fix approach | 3 |
| Known Bugs | one bold-label group | 1 |
| Security Considerations | two bold-label groups of Risk, Files, Current mitigation and Recommendations | 2 |
| Performance Bottlenecks | two `###` subsections | 2 |
| Fragile Areas | three plain top-level bullets with no field label | 3 |
| Scaling Limits | a table with two data rows | 2 |
| Dependencies at Risk | the text "None identified." only | 0 |
| Missing Critical Features | one bold-label group | 1 |
| Test Coverage Gaps | the text "Not detected." only | 0 |

The nine counts sum to 14. The file also has a one-paragraph preamble before the first `##` heading.
