# Made-up examples

Every document type with no real example on this machine is built and tested against a made-up example. The
example is derived from GSD's own template or from the writer that produces the type, labelled as made up in
the file itself, and listed in the table below. The rule is a test (`test/made-up-examples.test.ts`): it loads
every fixture root through the real repository and fails when a file of a rule kind has no marker, when a
marked file has no row here, or when a row names a file that does not exist. The UI never reads the marker.
The rule binds every later type with no real example on this machine, Phase 11's included.

Two marker forms, both carrying the same three facts (it is made up, the GSD source it was derived from, the
gsd-core version it was derived at):

- A file with frontmatter carries the keys `made_up_example: true`, `derived_from: <path under ~/.claude>`
  and `gsd_core_version: <version>`.
- A file with no frontmatter carries, as its first line, an HTML comment:
  `<!-- made-up example · derived from <path under ~/.claude> · gsd-core <version> -->`.

Two roots are exempt by name, each with a reason: `fixtures/dense` (a frozen golden, `test/__golden__/dense.json`,
whose own ledger is `fixtures/README.md`) and this repository's own `.planning` (real planning files).

## Index

| Path | Type | Derived from | gsd-core | Hard shape covered |
|---|---|---|---|---|
| test/fixtures/shapes/.planning/codebase/STACK.md | codebase-stack | gsd-core/templates/codebase/stack.md | 1.19.0 | partial map: three of the seven documents present, no frontmatter |
| test/fixtures/shapes/.planning/codebase/ARCHITECTURE.md | codebase-architecture | gsd-core/templates/codebase/architecture.md | 1.19.0 | partial map: a document whose title is the first heading below a comment line |
| test/fixtures/shapes/.planning/codebase/CONVENTIONS.md | codebase-conventions | agents/gsd-codebase-mapper.md | 1.19.0 | partial map: a document name shared with the spikes folder's CONVENTIONS.md |
| test/fixtures/tidemark/.planning/codebase/STACK.md | codebase-stack | gsd-core/templates/codebase/stack.md | 1.19.0 | map-only project: stamped frontmatter (2026-10-28), a `Languages & Runtimes` heading, the older `*Stack analysis:*` footer |
| test/fixtures/tidemark/.planning/codebase/ARCHITECTURE.md | codebase-architecture | gsd-core/templates/codebase/architecture.md | 1.19.0 | map-only project: stamped (2026-10-30, the newest date), refreshed comment, a fenced diagram line starting with two hashes, an added `API Architecture` heading |
| test/fixtures/tidemark/.planning/codebase/STRUCTURE.md | codebase-structure | agents/gsd-codebase-mapper.md | 1.19.0 | map-only project: stamped (2026-10-30), a fenced tree four levels deep, three `New ...:` groups |
| test/fixtures/tidemark/.planning/codebase/INTEGRATIONS.md | codebase-integrations | agents/gsd-codebase-mapper.md | 1.19.0 | map-only project: stamped (2026-10-28), a variable name with a planted placeholder value beside it |
| test/fixtures/tidemark/.planning/codebase/CONVENTIONS.md | codebase-conventions | agents/gsd-codebase-mapper.md | 1.19.0 | map-only project: the older form with no frontmatter, only `**Analysis Date:**` and a `*Last updated:*` footer, marker as a first-line comment |
| test/fixtures/tidemark/.planning/codebase/TESTING.md | codebase-testing | agents/gsd-codebase-mapper.md | 1.19.0 | map-only project: stamped (2026-10-28), a bash-fenced Run Commands block with a hash comment line before each command |
| test/fixtures/tidemark/.planning/codebase/CONCERNS.md | codebase-concerns | agents/gsd-codebase-mapper.md | 1.19.0 | map-only project: stamped (2026-10-30), nine sections of unequal length in every counting shape, a None identified section and a Not detected section |

## For later phases

A new document type with no real example on this machine adds three things: its kind to `MADE_UP_EXAMPLE_KINDS` in
`test/helpers/made-up-examples.ts`, a marker in each made-up example, and a row in the table above. The test fails,
never skips, when any of the three is missing (D-13).
