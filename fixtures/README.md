# Fixture Traceability Ledger

This ledger makes D-01 a build rule rather than a review note. For every file in every fixture tree
under `fixtures/`, the table below names the specific `~/.claude/gsd-core/templates/` file or
`~/.claude/gsd-core/bin/lib/*.cjs` source line that justifies its shape. No row in this ledger cites a
real project — that is the entire point of these trees.

A reader of this file needs to know four things before touching anything under `fixtures/`:

1. **These trees are hand-authored synthetic, derived entirely from `gsd-core` templates and source —
   never from any real project.** Every "assume field/directory X exists" claim in the parser must be
   traceable to a named line in `~/.claude/gsd-core/templates/` or a named `gsd-core/bin/lib/*.cjs`
   source, recorded below. This is D-01, and it exists because a parser overfit to one real project's
   shape is the highest-severity risk this project's own research identified.

2. **`~/studio-portal` is a manual smoke target only.** Per CONTEXT.md decision D-04: *"`~/studio-portal`
   is a **manual smoke target only** — zero committed assertions against it. The machine-checked
   contract is entirely fixture-derived, so no assertion can quietly encode a studio-portal-ism. You
   point the harness at it by hand when you want to see real output."* No committed test in `test/` or
   `src/` may assert anything about `~/studio-portal` — its path is named here, explicitly, precisely so
   that a future contributor recognizes it on sight and does not accidentally wire an assertion to it.

3. **The dense tree's golden snapshot permanently contains warnings.** Per D-02, three deliberate
   corruptions live inside `fixtures/dense/`, among healthy files. Once they were introduced (Task 3 of
   plan `01-02`), a "zero warnings" assertion against the dense tree's `--stable` snapshot became, and
   will always be, wrong. Only `fixtures/sparse-empty/` and `fixtures/sparse-started/` may be asserted
   zero-warning; `fixtures/dense/` never can be again.

4. **`fixtures/sparse-started/.planning/ROADMAP.md` carries one deliberately dangling requirement
   reference (`SLICE-99`).** Per D-10, an unresolved cross-reference is normal-path data, not a defect
   — it resolves to `{ raw, resolved: null }` on the graph and never enters the warning channel. Do not
   "fix" it by adding a matching `SLICE-99` requirement to `REQUIREMENTS.md`; its absence is the point.

---

## `fixtures/sparse-empty/` — structure-free, history-free

Authored in plan `01-01`. Proves the parser survives a project with nothing to parse yet and a null
milestone.

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `.planning/PROJECT.md` | `templates/project.md` — `## What This Is` / `## Core Value` / `## Requirements` / `## Context` / `## Constraints` / `## Key Decisions` section grammar | A minimal but complete `PROJECT.md` parses with no frontmatter |
| `.planning/REQUIREMENTS.md` | `templates/requirements.md` — `## v1 Requirements` / `## Out of Scope` / `## Traceability` grammar | The earliest-shape `REQUIREMENTS.md`, one requirement, parses |
| `.planning/STATE.md` | `templates/state.md` — the three template-guaranteed frontmatter keys (`gsd_state_version`, `status`, `progress`) and the fixed body section order | The parser survives a `STATE.md` with only the guaranteed frontmatter keys, no optional ones |

---

## `fixtures/sparse-started/` — structure without history

Authored in plan `01-02` Task 1. Proves the parser survives a project with a roadmap and one planned
phase but no execution history: no `milestones/`, no `quick/`, no `research/`, and no `SUMMARY.md`.

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `.planning/PROJECT.md` | `templates/project.md` | A `PROJECT.md` one step past `sparse-empty`'s parses cleanly |
| `.planning/REQUIREMENTS.md` | `templates/requirements.md` — requirement ID grammar `[A-Z][A-Z0-9]*-\d{2,}` per `GSD-DOMAIN.md` § "Naming Conventions and Parsing Rules" | Three requirement IDs (`SLICE-01..03`) parse; `SLICE-99` is deliberately absent (see preamble point 4) |
| `.planning/ROADMAP.md` | `templates/roadmap.md` — the single-milestone (non-milestone-grouped) form: `## Overview`, `## Phases` checkbox list, `## Phase Details`, `## Progress` | The non-milestone-grouped `ROADMAP.md` shape parses; the ASCII dependency-shape block (`templates/roadmap.md`'s "Dependency shape" convention, per `GSD-DOMAIN.md` § "ROADMAP.md") is carried through as opaque text |
| `.planning/STATE.md` | `templates/state.md` guaranteed keys, plus the conventional-but-not-guaranteed `milestone`/`current_phase`/`current_phase_name`/`last_activity` keys documented in `GSD-DOMAIN.md` § "Structured Data Schemas" | A `STATE.md` one stage past `sparse-empty`'s, with no `phase_numbering` key, exercises the parser's default branch for that field |
| `.planning/config.json` | `references/planning-config.md` "Complete Field Reference" (`mode`, `granularity`, `workflow.*`) per `GSD-DOMAIN.md` § "config.json — key inventory" | A minimal, valid, well-formed `config.json` parses |
| `.planning/phases/01-first-slice/01-CONTEXT.md` | `templates/context.md` — the six-tag section grammar (`<domain>`, `<decisions>`, `<specifics>`, `<canonical_refs>`, `<code_context>`, `<deferred>`), no YAML frontmatter | A `CONTEXT.md` with no frontmatter is dispatched by filename, not frontmatter shape |
| `.planning/phases/01-first-slice/01-01-PLAN.md` | `templates/phase-prompt.md` — `phase`/`plan`/`type`/`wave`/`depends_on`/`files_modified`/`autonomous`/`requirements`/`must_haves` frontmatter, per `GSD-DOMAIN.md` § "Per-phase-artifact YAML frontmatter" | A planned-but-unexecuted phase (no matching `SUMMARY.md`) proves `roadmapComplete` and observed disk state can legitimately disagree |

---

## `fixtures/dense/` — three milestones, unfamiliar artifact types, open-map config, deliberate corruption

Authored in plan `01-02` Tasks 2 and 3. The adversarial substrate Phase 4's degradation claims are
proven against (per CONTEXT.md D-01, "reversibility: costly").

### Root documents

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `.planning/PROJECT.md` | `templates/project.md` | A dense root `PROJECT.md` with a populated Key Decisions table parses |
| `.planning/ROADMAP.md` | `templates/roadmap.md` — the milestone-grouped form: `## Milestones`, `<details>`-wrapped archived blocks, `## Phase Details`, `## Progress` with a Milestone column | Milestone-grouped `ROADMAP.md` parses; one phase uses the bracketed `**Requirements**` form and one does not (template comment: "brackets optional, parser handles both formats"); Phase 1's plan checkboxes stay unchecked despite both plans having committed summaries — the `roadmapComplete` vs. disk-status disagreement `GSD-DOMAIN.md` documents as a real, observed case |
| `.planning/REQUIREMENTS.md` | `templates/requirements.md` — the milestone-scoped form with `**Milestone:**`/`**Supersedes:**` fields | A `REQUIREMENTS.md` that supersedes an archived milestone's requirements doc parses |
| `.planning/STATE.md` | `templates/state.md` guaranteed keys plus `milestone_name`, `phase_numbering: restarts-per-milestone`, `state_head`, and the observed-only `## Milestone Plan (vX.Y)` / `## Milestone History` body sections, per `GSD-DOMAIN.md` § "Structured Data Schemas" | The compound-identity branch (`phase_numbering: restarts-per-milestone`) is exercised; the `### Quick Tasks Completed` table matches `GSD-DOMAIN.md`'s documented columns |
| `.planning/MILESTONES.md` | `templates/milestone.md` — the `## v[X.Y] [Name] (Shipped: YYYY-MM-DD)` entry grammar | Three milestone entries (one in-progress, two shipped) parse |
| `.planning/RETROSPECTIVE.md` | `templates/retrospective.md` | A retrospective with two milestone sections plus a Cross-Milestone Trends section parses |
| `.planning/BACKLOG.md` | `templates/README.md` row: `BACKLOG.md` produced by `/gsd-add-backlog`, shape *(inline)* — no dedicated template, authored as prose per `GSD-DOMAIN.md`'s confirmation that this file has no structured contract | An optional, prose-only root file parses without a frontmatter contract |
| `.planning/LEARNINGS.md` | `GSD-DOMAIN.md` § "Structured Data Schemas" — the project-root aggregate `LEARNINGS.md` frontmatter shape (`generated`, `project`, `counts`, `missing_artifacts`) | A `LEARNINGS.md` with YAML frontmatter parses |
| `.planning/WINDOWS.md` | `GSD-DOMAIN.md` § "WINDOWS.md — the broken-windows ledger" — triple-encoded: YAML frontmatter (`schema_version`, `open_count`, `waived_count`, `fixed_count`, `total_count`, `last_updated`), markdown table (`id, phase, kind, file, line, description, status, reason, recorded_at, resolved_at`), fenced JSON array | All three encodings present with two rows each; confirms `bin/lib/artifacts.cjs`'s `CANONICAL_EXACT` includes `WINDOWS.md` (with its `#3224` comment) even though `templates/README.md`'s registry table omits it |
| `.planning/config.json` | `references/planning-config.md` namespaces (`workflow`, `git`, `features`, `hooks`, `learnings`, `intel`, `planning`) plus `GSD-DOMAIN.md`'s note that `parallelization` is polymorphic (boolean or object) | Exercises DATA-03 hard: `parallelization` in object form, plus `vibe_check`, `experimental_widget_pipeline`, and `telemetry.sampling.rate` (nested two levels inside an unknown namespace) — three-plus keys no reference document knows, which must survive the round trip unchanged |
| `.planning/estimation-calibration.json` | `GSD-DOMAIN.md` § "estimation-calibration.json" — `{schema_version, samples: [{estimateTokens, actualTokens}]}` | The documented calibration-sample shape parses |
| `.planning/HANDOFF.json` | `GSD-DOMAIN.md` § "HANDOFF.json" — the full paused-phase field set (`version`, `timestamp`, `phase`, `phase_name`, `phase_dir`, `plan`, `task`, `total_tasks`, `status`, `completed_tasks`, `remaining_tasks`, `blockers`, `async_jobs`, `human_actions_pending`, `decisions`, `uncommitted_files`, `next_action`, `context_notes`) | **Deliberate corruption (D-02, defect 2):** a trailing comma after the final property makes this file fail `JSON.parse` while remaining otherwise plausible — see "Deliberate Defect Register" below |
| `.planning/v3.0-CAPACITY-PLAN.md` | `bin/lib/artifacts.cjs` `CANONICAL_PATTERNS` — `/^v\d+\.\d+(?:\.\d+)?-.*\.md$/i` | A version-stamped document matching `CANONICAL_PATTERNS` but no exact-name entry in `CANONICAL_EXACT` — pattern-matched canonical detection is exercised separately from exact matching |

### `phases/01-identity-slice/` — full artifact spread, unfamiliar and invented types

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `01-CONTEXT.md` | `templates/context.md` | Six-tag context grammar, no frontmatter |
| `01-RESEARCH.md` | `templates/research.md` — the seven `<...>`-tagged sections | Frontmatter-free, fixed-section-tag research document parses |
| `01-SECURITY.md` | `templates/SECURITY.md` — `phase`/`slug`/`status`/`threats_open`/`asvs_level`/`created` frontmatter, Trust Boundaries / Threat Register / Accepted Risks Log / Security Audit Trail / Sign-Off sections | An artifact type studio-portal has never produced (per PITFALLS.md's own confirmation) parses; `fixture_only` is an extra frontmatter key exercising pass-through on a typed artifact |
| `01-UI-SPEC.md` | `templates/UI-SPEC.md` — `shadcn_initialized`/`preset` frontmatter, Design System / Spacing Scale / Typography / Color / Copywriting Contract / UI Considerations / Registry Safety / Checker Sign-Off sections | Same class of unfamiliar type; `fixture_extra_field` exercises unknown-frontmatter-key pass-through |
| `01-VALIDATION.md` | `templates/VALIDATION.md` — `nyquist_compliant`/`wave_0_complete` frontmatter, Test Infrastructure / Sampling Rate / Per-Task Verification Map sections | Same class |
| `01-UAT.md` | `templates/UAT.md` — `status`/`phase`/`source`/`started`/`updated` frontmatter, Current Test / Tests / Summary / Gaps sections | A completed UAT session (2/2 pass, no gaps) parses |
| `01-VERIFICATION.md` | `GSD-DOMAIN.md` § "Per-phase-artifact YAML frontmatter" — `phase`/`verified`/`status`/`score`/`behavior_unverified` | **Deliberate corruption (D-02, defect 3):** complete, valid frontmatter followed by no body at all — see "Deliberate Defect Register" below |
| `01-LEARNINGS.md` | `GSD-DOMAIN.md` § "Structured Data Schemas" — the per-phase `NN-LEARNINGS.md` shape (`phase`, `phase_name`, `project`, `generated`, `counts`, `missing_artifacts`) | Per-phase learnings frontmatter parses |
| `01-PATTERNS.md` | `templates/README.md` row: `NN-PATTERNS.md`, produced by the pattern-mapper agent, shape *(inline)* | An optional, frontmatter-free phase artifact parses |
| `01-SPEC.md` | `templates/spec.md` — Goal / Background / Requirements / Boundaries / Constraints / Acceptance Criteria / Ambiguity Report / Interview Log sections | An artifact type studio-portal has never produced (D-01) parses |
| `01-AI-SPEC.md` | `templates/AI-SPEC.md` — numbered `##`/`###` sections, **no YAML frontmatter** | Proves frontmatter presence cannot be the dispatch signal — this file has none and must still dispatch by filename |
| `01-COST-MODEL.md` | No template, no reference document — genuinely invented (D-01) | The invented-future-doc-type case: the only correct handling is the generic markdown fallback, `kind: "unknown"` |
| `01-01-PLAN.md` | `templates/phase-prompt.md` — full pseudo-XML task grammar (`<objective>`, `<context>`, `<decision>`, `<tasks>` with typed `<task type="...">` blocks including a `checkpoint:human-verify` variant, `<verification>`, `<success_criteria>`, `<output>`) | A realistic plan specimen with nested markdown (a list, a fenced code block) inside pseudo-XML tags, per `GSD-DOMAIN.md` § "PLAN.md task structure"; `fixture_extra_field` in frontmatter exercises pass-through on a typed artifact |
| `01-01-SUMMARY.md` | `templates/summary.md` — full frontmatter including the `coverage` array shape | `coverage[].id` values `D1`/`D2` deliberately collide visually with `CONTEXT.md`'s `D-NN` decision IDs — the namespace collision `GSD-DOMAIN.md` § "Cross-Reference and ID Conventions" warns about, which the mention scanner (plan `01-04`) must keep separate |
| `01-02-PLAN.md` | `templates/phase-prompt.md` | A second, dependent plan (`depends_on: ["01-01"]`) parses |
| `01-02-SUMMARY.md` | `templates/summary.md` | A second summary with its own `coverage[].id` values (`D1`, `D2`) reinforces the same-namespace-collision proof across multiple files |

### `phases/02-transport-layer/` — deliberately thin, mid-flight phase

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `02-CONTEXT.md` | `templates/context.md` | A thinner phase (only `CONTEXT.md` + one `PLAN.md`, no research/security/UI-spec) is a legitimate, non-error shape per `GSD-DOMAIN.md`'s "nothing is unconditionally mandatory" finding |
| `02-01-PLAN.md` | `templates/phase-prompt.md` | **Deliberate corruption (D-02, defect 1):** one nested frontmatter key (`truths:` under `must_haves:`) is indented with a literal tab instead of spaces — see "Deliberate Defect Register" below. No matching `SUMMARY.md` exists — this phase is mid-flight |

### `milestones/` — archived roadmaps, requirements, audits, and phase trees

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `v1.0-ROADMAP.md` | `GSD-DOMAIN.md` § "milestones/" — `vX.Y-ROADMAP.md` is a full independent document, same grammar as root `ROADMAP.md` | An archived roadmap snapshot parses |
| `v1.0-REQUIREMENTS.md` | `GSD-DOMAIN.md` § "milestones/" — `vX.Y-REQUIREMENTS.md` | An archived requirements snapshot parses |
| `v1.0-MILESTONE-AUDIT.md` | `bin/lib/artifacts.cjs` `CANONICAL_PATTERNS` — `/^v\d+\.\d+(?:\.\d+)?-MILESTONE-AUDIT\.md$/i` | A milestone audit archived under `milestones/` (moved here by `/gsd-complete-milestone`) parses |
| `v1.0-phases/01-bootstrap/01-CONTEXT.md` | `templates/context.md`, per `GSD-DOMAIN.md`'s confirmation that archived phase trees are "byte-identical in internal shape" to live ones | Archived-phase-directory internal shape matches a live phase directory |
| `v1.0-phases/01-bootstrap/01-01-PLAN.md` | `templates/phase-prompt.md` | Same |
| `v1.0-phases/01-bootstrap/01-01-SUMMARY.md` | `templates/summary.md` | Same; also the first of three directories carrying phase number `01` (with `phases/01-identity-slice/` and `v2.0-phases/01-legacy-ingest/`) — the phase-number collision this fixture exists to exercise |
| `v2.0-ROADMAP.md` | `GSD-DOMAIN.md` § "milestones/" | Second archived roadmap snapshot — proves multi-milestone archival is exercised at N>1 |
| `v2.0-REQUIREMENTS.md` | `GSD-DOMAIN.md` § "milestones/" | Second archived requirements snapshot |
| `v2.0-MILESTONE-AUDIT.md` | `bin/lib/artifacts.cjs` `CANONICAL_PATTERNS` | Second archived audit |
| `v2.0-phases/01-legacy-ingest/01-CONTEXT.md` | `templates/context.md` | Second directory carrying phase number `01` (v2.0's own "Phase 1", distinct from both v1.0's and v3.0's) |
| `v2.0-phases/01-legacy-ingest/01-01-PLAN.md` | `templates/phase-prompt.md` | Same |
| `v2.0-phases/01-legacy-ingest/01-01-SUMMARY.md` | `templates/summary.md` | Same |
| `v2.0-phases/02-batch-export/02-01-PLAN.md` | `templates/phase-prompt.md` | v2.0's "Phase 2" — `depends_on: ["01-01"]` referencing the sibling archived phase |
| `v2.0-phases/02-batch-export/02-01-SUMMARY.md` | `templates/summary.md` | Same |

### `quick/` — timestamp-slug directories, variable artifact sets

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `260615-1a2-add-transport-adapter/260615-1a2-PLAN.md` | `bin/lib/init.cjs` `cmdInitQuick` — the literal `YYMMDD-{base36 time}-{slug}` generation code, per `GSD-DOMAIN.md` § "`quick/<timestamp-slug>/` naming" | A quick-task directory with both `PLAN.md` and `SUMMARY.md` parses |
| `260615-1a2-add-transport-adapter/260615-1a2-SUMMARY.md` | `templates/summary.md` | Same |
| `260701-3xz-fix-quick-typo/260701-3xz-PLAN.md` | `bin/lib/init.cjs` `cmdInitQuick` | A quick-task directory with only a `PLAN.md` (no `SUMMARY.md` yet) — matches `GSD-DOMAIN.md`'s confirmation that quick tasks carry a "variable subset" of artifacts, and that `STATE.md`'s Quick Tasks Completed table (not the directory listing) is the authoritative status index |

### `research/` — project-level research, with a visible cache exclusion

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `research/SUMMARY.md` | `GSD-DOMAIN.md` § "`research/` (project-level, not phase-level)" — fixed file set `research/SUMMARY.md`, `research/STACK.md`, `research/PITFALLS.md` | Project-level research summary parses |
| `research/STACK.md` | Same | Project-level stack document parses |
| `research/PITFALLS.md` | Same | Project-level pitfalls document parses |
| `research/.cache/deadbeef.json` | `GSD-DOMAIN.md`'s confirmation that `research/.cache/<sha256>.json` is "pure cache — explicitly out of scope for rendering" | Proves the discovery walk's exclusion (`SKIPPED_DIRS` in `src/planning-repo/discovery.ts`, plan `01-01`) is recorded and visible via `snapshot.exclusions[]` rather than silent |

### `ui-reviews/` — present-on-disk, gitignored content

| file | shape traced to | what it proves |
|------|------------------|------------------|
| `ui-reviews/.gitignore` | `GSD-DOMAIN.md` § "`ui-reviews/`" — confirmed from `studio-portal`'s own `ui-reviews/` containing only a `.gitignore` in the sampled project | A directory whose only committed content is a gitignore — "present on a live filesystem but not in a git checkout" is a real condition the parser must not choke on |

---

## Deliberate Defect Register (D-02)

Three deliberate corruptions sit inside `fixtures/dense/`, among healthy files, so isolation is
meaningfully proven against a healthy majority. No future reader should "fix" any of these — each is
load-bearing for Phase 4's degradation claims.

| # | File | Exact nature | Expected warning stage |
|---|------|---------------|--------------------------|
| 1 | `.planning/phases/02-transport-layer/02-01-PLAN.md` | The `truths:` key nested under `must_haves:` in the YAML frontmatter block is indented with a literal tab character instead of spaces. YAML forbids tabs as indentation, so the parse throws. The full body (task blocks intact) is unaffected. | `frontmatter` |
| 2 | `.planning/HANDOFF.json` | A trailing comma follows the final property (`context_notes`), otherwise a complete, plausible paused-phase JSON document. | `structured-extraction` |
| 3 | `.planning/phases/01-identity-slice/01-VERIFICATION.md` | Complete, valid frontmatter (`phase`, `verified`, `status`, `score`, `behavior_unverified`) followed by nothing at all — no heading, no prose. This is the inverse of defect 1: the structured half survives and the prose half is empty. | **None** — an empty body is a legitimate document state, not a parse failure |

**A note on defects 1 and 2's warning stage, as of plan `01-02`'s own execution:** defect 1's
`frontmatter` warning is confirmed live today — `src/planning-repo/handlers/generic.ts`'s
`tryParseFrontmatter` call already guards every markdown file regardless of its directory, and
warnings are collected globally (`src/planning-repo/snapshot.ts`'s `refresh()` parses every discovered
ref, not only root-level ones). Defect 2's `structured-extraction` warning requires the typed
`json-config.ts` handler that plan `01-03` (concurrent, same wave) adds for `config.json`,
`HANDOFF.json`, and `estimation-calibration.json` — `01-03-PLAN.md` names this exact fixture file
directly in its own acceptance criteria ("A `HANDOFF.json` with a trailing comma yields a warning at
stage `structured-extraction`"). Until `01-03` merges, `HANDOFF.json` is parsed only as an
undifferentiated generic file with no JSON validation attempted, so no warning is produced for it yet
— this is a cross-plan sequencing property of the wave-2 split, not a defect in this fixture's
authoring. The same `01-03` merge also extends `assembleDomainModel` beyond its current root-only
tracer scope (`src/planning-repo/assemble.ts`) to include `phases/`, `milestones/`, and `quick/`
artifacts in `project.artifacts` — until then, non-root files (including every file in the two tables
above) are fully discovered, parsed, and contribute to `snapshot.warnings[]`, but do not yet appear as
entries in `snapshot.project.artifacts`.
