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
| test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-SPEC.md | spec | gsd-core/templates/spec.md | 1.19.0 | locked, at or below the gate: score 0.14 against a 0.20 gate, five requirements each with Current, Target and Acceptance, all four ambiguity dimensions met |
| test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-SPEC.md | spec | gsd-core/templates/spec.md | 1.19.0 | above the gate, written anyway: score 0.31 with the gate in its ASCII form (`<= 0.20`), one ambiguity dimension marked below minimum, an unresolved edge and prohibition, the planner-must-treat-as-assumption line |
| test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-SPEC.md | spec | gsd-core/templates/spec.md | 1.19.0 | long: nine requirements, the sixth with no Acceptance line, two long statements, a score of 0.18 with no gate in the header, no Edge Coverage or Prohibitions sections |
| test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-AI-SPEC.md | ai-spec | gsd-core/templates/AI-SPEC.md | 1.19.0 | every numbered section still an unfilled template slot: HTML-comment slots, empty numbered items, an empty dimension row, comment-only fenced blocks, 0 of 16 checklist items ticked |
| test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-AI-SPEC.md | ai-spec | gsd-core/templates/AI-SPEC.md | 1.19.0 | half filled: System Type, Selected Framework and Version filled, Dimensions table with four rows, sections 4b, 6 and 7 left as template slots, 6 of 16 checklist items ticked |
| test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-USER-SETUP.md | user-setup | gsd-core/templates/user-setup.md | 1.19.0 | every step pending: two variables and one dashboard item, every box unticked, Status Incomplete |
| test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-USER-SETUP.md | user-setup | gsd-core/templates/user-setup.md | 1.19.0 | three of six steps done, a Status line (Complete) that disagrees with its boxes, a variable name with a planted placeholder value written beside it |
| test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-DOM-VERIFY.md | dom-verify | agents/gsd-dom-verifier.md | 1.19.0 | browser check that could not look: outcome `could_not_look`, reason `target_unreachable`, all four counts 0, a body stating what stopped it and what the operator would change |
| test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-DOM-VERIFY.md | dom-verify | agents/gsd-dom-verifier.md | 1.19.0 | browser check with nothing to report: outcome `nothing_to_report`, reason `no_criteria`, all four counts 0, a one-line body |
| test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-DOM-VERIFY.md | dom-verify | agents/gsd-dom-verifier.md | 1.19.0 | verified browser check: 7 checked, 4 passed, 2 failed, 1 needs_review, one body line per criterion with the verdict word plain, bold or in backticks and observed page text in inline code |
| test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md | eval-review | agents/gsd-eval-auditor.md | 1.19.0 | NOT IMPLEMENTED at 12/100: AI-SPEC Present No, four dimensions all MISSING, a Remediation Plan with steps only under Must fix, first-line comment marker |
| test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-EVAL-REVIEW.md | eval-review | agents/gsd-eval-auditor.md | 1.19.0 | NEEDS WORK at 64/100: five dimensions mixing COVERED, PARTIAL and MISSING with Code, LLM Judge and Human measurements, an Infrastructure Audit in the auditor's own status words, no Critical gaps, a three-group Remediation Plan |
| test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-REVIEWS.md | reviews | gsd-core/workflows/review.md | 1.19.0 | single reviewer: one lane (claude), one plan, an empty Plan-Revision Conflicts block, a Consensus Summary that says there is nothing to compare |
| test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-REVIEWS.md | reviews | gsd-core/workflows/review.md | 1.19.0 | disagreeing reviewers: four lanes, three substantive at overall risk LOW, MEDIUM and HIGH, one approve-versus-revise split on plan 04-03, qwen a failed-lane stub, a `models` value of `"unknown"`, a `plan_coverage` block, a Plan-Revision Conflicts entry between its markers, a `## 04-02` heading inside a reviewer's body, two concerns raised by more than one reviewer, the writer's Consensus Summary |

## For later phases

A new document type with no real example on this machine adds three things: its kind to `MADE_UP_EXAMPLE_KINDS` in
`test/helpers/made-up-examples.ts`, a marker in each made-up example, and a row in the table above. The test fails,
never skips, when any of the three is missing (D-13).
