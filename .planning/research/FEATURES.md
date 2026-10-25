# Feature Research: v2.1 Wayfinding

**Domain:** read-only local dashboard for GSD `.planning/` directories (developer tool, one user, many projects)
**Researched:** 2026-10-25
**GSD installed:** gsd-core 1.18.0 (`~/.claude/gsd-core/VERSION`). Labelore's own name table was written against 1.11.
**Confidence:** HIGH for the file-type catalogue wherever a template or writer was read; MEDIUM for search, palette and source-viewer conventions (official docs for GitHub, VS Code, Linear and Raycast; nothing official found for docs-site search); LOW for project-switcher conventions (no standard exists; one recent pull request and three forum threads).

Path shorthand used below: `core/` is `~/.claude/gsd-core/`, `agents/` is `~/.claude/agents/`. Every "Source" cell names a file under one of those, or a real file on this machine.

---

## Headline findings

1. **62% of the files on this machine already open on a designed page.** Labelore's own discovery code was run over all 14 `.planning/` trees under `~/Work` (2,696 files). 1,676 open on a sketch-built page, 23 on a basic page (manifest that only lifts facts and sections), 60 are root documents covered by an app-level page (dashboard, roadmap, traceability) whose own file view says "no dedicated view", 372 are markdown that falls back to the structural read, and 565 are not markdown at all (108 PNG, 225 JSON, 76 HTML, plus scripts and logs).
2. **Three of the 14 trees are almost entirely unpaged.** The four codebase-only trees (rhub, resoundant-hub-ui, cman, pyeicon) hold nothing but the seven map documents (pyeicon adds one free-form changelog). deid-ui holds only `ui-reviews/`. Spikes and sketches account for another 520 files in two or three trees.
3. **The most common unpaged phase files are not on the milestone's list.** `COVERAGE.md` (20 files, 7 trees), `REVIEW-DISPOSITION` (20 files, 4 trees), and `deferred-items.md` (20 files, 5 trees) outnumber everything else. `deferred-items.md` is not named in the milestone at all. Add it to the review-extras family.
4. **There is a dead manifest.** `coverage` is a registered view kind, but every real `COVERAGE.md` is unprefixed, so discovery labels all 20 `unknown` and the manifest never fires. The manifest's lead text ("which edges and cases this phase's plan accounted for") also describes the wrong thing. GSD's `COVERAGE.md` is an API-coverage matrix (INTEGRATE / OPT-OUT per capability). Source: `core/references/api-coverage.md`.
5. **Fourteen of the types the milestone names have never been seen locally.** SPEC, AI-SPEC, EVAL-REVIEW, USER-SETUP, DOM-VERIFY, REVIEWS, PLAN-OUTLINE, threads, reports, intel, graphs, forensics, workstreams and onboarding have no real example on this machine. Their structure comes from templates and writer code. Build synthetic fixtures from the writer output before sketching them, and mark each page's fixture as synthetic.
6. **`config.json` can hold secrets today.** GSD's own settings workflow writes search-provider API keys as plaintext into `config.json` (`core/workflows/settings-integrations.md`; the secret set is `brave_search`, `firecrawl`, `exa_search` in `core/bin/lib/secrets.cjs`). On this machine those keys are all `false`, but Labelore already serves the raw file and tokenises it into the search index. Mask before building the settings view.
7. **Source mode is not a raw viewer.** The server returns one rendered-markdown `document` per artifact. "Source" shows the full rendered document, not the bytes. Line numbers, frontmatter folding and copy-raw need a new bounded raw-text payload. Binary files (108 PNGs on this machine) are currently read as UTF-8 text: a 260 KB screenshot becomes a 260 KB "body".
8. **A Cmd-K dialog already exists** (`src/web/components/search-field.tsx`, quick task 260911-243, 160 ms debounce, 8-hit preview). The palette is an evolution of it, not a second search surface.

---

# Part A. File-type catalogue

## A.1 Status vocabulary and measured baseline

| Status | Meaning in Labelore today |
|--------|---------------------------|
| Designed | View mode renders a page composed from a winning sketch (a `compose*` function plus components). |
| Basic | The kind has a manifest that only promotes frontmatter facts and headed sections. No composed page. |
| Page elsewhere | An app-level page draws on the file (dashboard, roadmap, traceability, sketches, research). The file itself still opens through Basic or Fallback. |
| Fallback | No manifest. The page shows a structural read behind the quiet "Unrecognized type" notice. |
| Raw | Not markdown. Read as text, no page. |

Baseline (2,696 files, 14 trees; one tree is Labelore itself, two are near-copies of one project, so read counts as indicative):

| Bucket | Files |
|--------|-------|
| Designed page | 1,676 |
| Basic page | 23 |
| Root document with an app-level page | 60 |
| Markdown on the structural fallback | 372 (310 are kind `unknown`) |
| Not markdown | 565 |

"Seen" in the tables below is `files / trees` out of 14 trees. Tree counts of 0 mean the file has never been seen here.

## A.2 Families, suggested requirement grain

The catalogue groups into 15 families. Suggested grain for requirements: one requirement per family, except where a family says otherwise. "Sketches" is a rough count of distinct page designs, because the build loop is one sketch then one build per page.

| # | Family | Files | Today | Seen | Suggested grain | Sketches |
|---|--------|-------|-------|------|-----------------|----------|
| 1 | Root project documents | PROJECT, ROADMAP, REQUIREMENTS, STATE, MILESTONES, RETROSPECTIVE, WINDOWS | Page elsewhere | 6 to 9 trees each | One requirement per document (seven distinct shapes) | 7, but 4 reuse existing app pages |
| 2 | Root extras | BACKLOG, root LEARNINGS, root PATTERNS, THREADS, STATE-ARCHIVE, METHODOLOGY, DECISIONS-INDEX, INGEST-CONFLICTS, INBOX-TRIAGE, free-form changelogs | Fallback | 2 files | One "root note" requirement; only STATE-ARCHIVE and INGEST-CONFLICTS earn a layout | 1 to 2 |
| 3 | Pause and resume | `.continue-here.md`, HANDOFF.json | Fallback / Raw | 4 + 1 | One requirement for both (they are two halves of one pause) | 1 |
| 4 | Machine state | state.json, estimation-calibration.json, milestone.lock, skill-manifest.json | Raw | 7 + 1 + 1 | One small requirement: lift `next`, lock claim, calibration; no full pages | 0 to 1 |
| 5 | Milestone archive | vX.Y-MILESTONE-AUDIT, vX.Y-ROADMAP, vX.Y-REQUIREMENTS, vX.Y-quick/README, vX.Y-research | Basic / Page elsewhere | 4, 15, 14, 4, 5 | Audit gets a page; the rest reuse the live roadmap and requirements pages | 1 |
| 6 | Phase specification and setup | SPEC, AI-SPEC, USER-SETUP, SKELETON, COVERAGE, PLAN-OUTLINE | Fallback (COVERAGE dead-Basic) | 0, 0, 0, 4, 20, 0 | One requirement each for SPEC, AI-SPEC, COVERAGE; USER-SETUP and SKELETON together | 4 |
| 7 | Review and verification extras | REVIEW-DISPOSITION, REVIEW-FIX, REVIEWS, EVAL-REVIEW, DOM-VERIFY, deferred-items, HUMAN-UAT (keep) | Fallback / Basic | 20, 16, 0, 0, 0, 20, 2 | One requirement each for DISPOSITION+FIX (one ledger), REVIEWS, EVAL-REVIEW+DOM-VERIFY, deferred-items | 4 |
| 8 | Codebase map | seven documents, plus partial maps from `/gsd-scan` | Fallback | 56 / 8 trees | One document page family (shared composer) plus the codebase-only overview | 2 |
| 9 | Experiments and ideas | spikes (MANIFEST, README, CONVENTIONS, WRAP-UP-SUMMARY), seeds, threads | Fallback | 10 + 2 + 0 | Spikes one requirement (board plus detail), seeds one, threads one | 3 |
| 10 | Reports, forensics, onboarding | SESSION_REPORT, MILESTONE_SUMMARY, forensics report, onboarding SUMMARY | Fallback | 0 | One requirement for reports, one for forensics, one for onboarding | 3 |
| 11 | Machine indexes | intel/*, graphs/* | Raw | 0 | One requirement; bounded summaries only, no full JSON | 1 to 2 |
| 12 | Workstreams | `workstreams/<name>/...` | Not discovered as a scope | 0 | One requirement; a scope, not a page | 1 index page |
| 13 | Quick batches | `quick-batches/<id>/BATCH.json` | Raw | 6 / 2 trees | One requirement | 1 |
| 14 | Debug extras | `debug/knowledge-base.md` | Fallback | 2 | One requirement | 1 |
| 15 | Visual-review output | `ui-reviews/<phase>-<ts>/` screenshots, hand-written `REPORT-*.md` | Raw / Fallback | 13 / 6 trees | One requirement; images need the file-kind policy | 1 |

Everything the milestone lists is in families 1 and 3 to 15. The only additions are `deferred-items.md`, `state.json` (the machine-readable "what next"), `quick-batches/`, `debug/knowledge-base.md`, `ui-reviews/`, `research/questions.md` and the root extras. Add them or consciously drop them.

---

## A.3 Family 1: Root project documents

| File | Written by | Structure | A reader needs at a glance | Today | Seen | Source |
|------|-----------|-----------|----------------------------|-------|------|--------|
| `PROJECT.md` | `/gsd-new-project`; edited by `/gsd-new-milestone` and milestone close; graduation appends `## Validated Decisions` and `## Invariants` | No frontmatter. `## What This Is`, `## Core Value`, optional `## Business Context`, `## Requirements` (Validated / Active / Out of Scope), `## Context`, `## Constraints`, `## Key Decisions` table (Decision, Rationale, Outcome), `## Evolution` | What it is and the core value in two sentences; the current milestone's goal; requirement counts by state; decisions with their outcome marks; constraints as a short list | Page elsewhere (dashboard head already lifts What This Is and Core Value). The file view says "no dedicated view". | 9 / 14 | `core/templates/project.md`, `core/workflows/graduation.md` |
| `ROADMAP.md` | `/gsd-new-project`, `/gsd-new-milestone`, `/gsd-phase`; ticked by execute and transition | `## Milestones` list with status emoji, `## Phases` (checklist, or milestone-grouped with `<details>` per shipped milestone), `### Phase N: Name` blocks with `**Goal**`, `**Depends on**`, `**Requirements**`, `**Success Criteria**`, `**Plans**` and a plan checklist, optional dependency ASCII block, `## Progress` table, `999.x` backlog phases | Which phase is current, goal and criteria, plan checklist progress, backlog items | Page elsewhere (roadmap page, designed). File view: notice. | 9 / 14 | `core/templates/roadmap.md`, `core/workflows/add-backlog.md` |
| `REQUIREMENTS.md` | `/gsd-new-milestone` | `## v1 Requirements` by category with `- [ ] **AUTH-01**: text`, `## v2 Requirements`, `## Out of Scope` table (Feature, Reason), `## Traceability` table (Requirement, Phase, Status) | Done and open counts by category; the traceability table per requirement | Page elsewhere (traceability page, designed). | 4 / 14 | `core/templates/requirements.md` |
| `STATE.md` | `/gsd-new-project`; updated by nearly every command | YAML frontmatter (`gsd_state_version`, `status`, `progress{total_phases, completed_phases, total_plans, completed_plans, percent}`, plus observed `milestone`, `current_phase`, `stopped_at`, `last_activity`, `phase_numbering`); body `## Current Position`, `## Accumulated Context` (decisions, blockers, quick tasks table), `## Deferred Items` table, `## Session Continuity` | Position, status, blockers, last activity, next step | Page elsewhere (dashboard, designed). | 9 / 14 | `core/templates/state.md` |
| `MILESTONES.md` | `/gsd-complete-milestone` | Entries `## vX.Y Name (Shipped: date)` with Delivered, Phases completed, Key accomplishments, Stats, Git range, What's next | Newest entry first; accomplishments per milestone; ship dates as a timeline | Page elsewhere (roadmap history). | 7 / 14 | `core/templates/milestone.md` |
| `RETROSPECTIVE.md` | `/gsd-complete-milestone` | Per milestone: What Was Built, What Worked, What Was Inefficient, Patterns Established, Key Lessons, Cost Observations; then `## Cross-Milestone Trends` tables | Lessons by milestone; trend tables | Page elsewhere (retro dialog, designed). | 7 / 14 | `core/templates/retrospective.md` |
| `WINDOWS.md` | Broken-windows ledger (`/gsd-ship` gate, `workflow.windows_enforce`) | Frontmatter counts (`open_count`, `waived_count`, `fixed_count`, `total_count`); table (`id, phase, kind, file, line, description, status, reason, recorded_at, resolved_at`); a fenced `json` block repeating the rows | Open count first; rows by phase and kind; waived ones with their reason | Basic handler, no manifest (fallback notice). The handler already prefers the JSON block. | 6 / 14 | `core/bin/lib/broken-windows.cjs`, real file `Cinedise/studio-portal/.planning/WINDOWS.md` |

At-a-glance rule for family 1: four of the seven already have an app-level page. The v2.1 job for those is the file view only: open the file and land on the same designed content (or a link to the page), instead of a "no dedicated view" notice. Genuinely new designs are PROJECT (full document), WINDOWS (ledger) and perhaps the archived `vX.Y-` copies. Do not duplicate the dashboard or roadmap.

## A.4 Family 2: Root extras

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `BACKLOG.md` | Legacy; `/gsd-capture --backlog` now writes `999.x` phases into ROADMAP.md | Free list | Ideas as a list | Fallback | 0 | `core/workflows/add-backlog.md` |
| `LEARNINGS.md` (root) | `/gsd-extract-learnings`, `/gsd-execute-phase` when `features.global_learnings` | Same frontmatter as the per-phase file (`counts`, `missing_artifacts`) | Already covered by the learnings page | Designed (kind `learnings`) | 0 | `core/templates/README.md` |
| `PATTERNS.md` (root) | Graduation, `patterns` target | Category sections, graduated items carry `**Graduated:** file:date` | Patterns by category | Fallback (name missing from Labelore's 1.11 name table) | 0 | `core/workflows/graduation.md` |
| `THREADS.md` | Legacy index for `/gsd-thread` | Free list | Link list | Fallback | 0 | `core/templates/README.md` |
| `STATE-ARCHIVE.md` | `state prune` (`workflow.auto_prune_state`) | `# STATE Archive`, then `## Pruned DATE (phases 1-N, kept recent K)` with `### section` blocks | Which phases were pruned; browse old decisions | Fallback | 0 | `core/bin/lib/state.cjs` (cmdStatePrune) |
| `METHODOLOGY.md` | Hand-written standing reference | One `## Lens` per entry: Diagnoses, Recommends, Apply when | Lenses as cards | Fallback | 0 | `core/references/artifact-types.md` |
| `DECISIONS-INDEX.md` | Optional rolling summary read by discuss-phase | Free | Decision list | Fallback | 0 | `core/workflows/discuss-phase.md` |
| `INGEST-CONFLICTS.md` | `/gsd-ingest-docs` (gsd-doc-synthesizer) | `## Conflict Detection Report`, `### BLOCKERS (N)`, `### WARNINGS (N)`, `### INFO (N)`; each entry `[BLOCKER] title`, `Found:`, `Expected:` or `Impact:` or `Note:`, `→` fix | Blocker count first; each blocker with the fix line | Fallback | 0 | `core/references/doc-conflict-engine.md` |
| `INBOX-TRIAGE.md` | `/gsd-inbox` | Report of triaged GitHub issues and PRs | List with verdicts | Fallback | 0 | `core/workflows/inbox.md` |
| `CHANGELOG-*.md`, `contract/CONTRACT.md` and similar | Hand-written, project-specific | Free | Generic document | Fallback | 3 | pyeicon, pyedge, plan.sideby.me |

Verdict: one "root note" treatment (clean generic document with outline) covers all of these. Only STATE-ARCHIVE and INGEST-CONFLICTS have enough structure to deserve a layout, and neither has been seen here. Defer both.

## A.5 Family 3: Pause and resume

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `.continue-here.md` | `/gsd-pause-work`; also `.planning/phases/NN/`, `spikes/NNN/`, `sketches/`, `deliberations/`; deleted on resume | Frontmatter (`context: phase|spike|sketch|deliberation|research|default`, `phase`, `task`, `total_tasks`, `status: in_progress|blocked|almost_done`, `last_updated`); optional `# BLOCKING CONSTRAINTS` checklist; `## Critical Anti-Patterns` table (Pattern, Description, Severity blocking|advisory, Prevention); XML-tagged sections `<current_state>`, `<completed_work>`, `<remaining_work>`, `<decisions_made>`, `<blockers>`, `<context>`, `<next_action>`; `## Required Reading` | Where it stopped (task N of M), the single next action, blocking constraints, what is left | Fallback. File name starts with a dot, so kind is `unknown`. | 4 / 2 trees (all archived) | `core/templates/continue-here.md`, `core/workflows/pause-work.md`, real file in protocol2rules `milestones/v1.1-phases/01-.../` |
| `HANDOFF.json` | `/gsd-pause-work` | `version`, `timestamp`, `phase`, `phase_name`, `phase_dir`, `plan`, `task`, `total_tasks`, `status: paused`, `completed_tasks[]`, `remaining_tasks[]`, `blockers[]`, `async_jobs[]`, `human_actions_pending[]{action, context, blocking}`, `decisions[]`, `uncommitted_files[]`, `next_action`, `context_notes` | Next action, human actions pending (blocking first), uncommitted file count, task progress bar | Raw (open-map JSON handler, kind `unknown`) | 1 / 1 tree | `core/workflows/pause-work.md`, real file `Cinedise/studio-portal/.planning/HANDOFF.json` |

Both files describe the same pause. One page: "Paused" headline, next action large, then the pending human actions, then progress, then the long context notes folded. Surface a quiet "Paused" chip on the dashboard when `HANDOFF.json` exists (that is a small addition to an existing page, not a new page).

## A.6 Family 4: Machine state

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `state.json` | `state-contract` at step boundaries | `contract`, `flavor`, `milestone`, `phases[{number, name, status}]`, `next{command, label, reason}`, `updated_at` | GSD's own "what next" sentence, ready made | Raw | 7 / 14 | `core/bin/lib/state-contract.cjs`, real file `.planning/state.json` in this repo |
| `estimation-calibration.json` | Executor | `{schema_version, samples[{estimateTokens, actualTokens}]}` | Estimate accuracy; curiosity only | Raw (open-map handler) | 1 | `core/workflows/extract-learnings.md` |
| `milestone.lock` | Milestone claim | `{phase, session, pid, updated_at}`; advisory; live while younger than a TTL | "Claimed by a session on phase N, last heartbeat M minutes ago" | Raw | 1 | `core/bin/lib/milestone-lock.cjs` |
| `skill-manifest.json` | `init skill-manifest --write` | Project skill list | Not interesting | Raw | 0 | `core/templates/README.md` |

Recommendation: no standalone pages. Lift three facts into existing screens: `state.json.next` as a "GSD suggests" line on the dashboard (it is the authoritative next-step string, so Labelore need not reinvent routing), the milestone lock as a banner when live, and nothing else. Treat the files as Internal in the drawer.

## A.7 Family 5: Milestone archive

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `vX.Y-MILESTONE-AUDIT.md` (root until archived, then `milestones/`) | `/gsd-audit-milestone` | Frontmatter `milestone`, `audited`, `status: passed|gaps_found|tech_debt`, `scores{requirements, phases, integration, flows}` as `N/M`, `gaps{requirements[{id, status, phase, claimed_by_plans, completed_by_plans, verification_status, evidence}], integration[], flows[]}`, `tech_debt[{phase, items[]}]`; body: requirements coverage table (3-source cross reference), phase and integration tables, tech debt | Verdict, four score fractions, each gap with its evidence, tech debt grouped by phase | Basic. The manifest hunts `Verdict`, `Findings`, `Scope check`, `Requirements coverage`, `Tech debt`; the first three come from Labelore's synthetic fixture, and only the last two occur in real audits | 4 / 3 trees | `core/workflows/audit-milestone.md`, real file `Sideby/plan.sideby.me/.planning/milestones/v1.3-MILESTONE-AUDIT.md` |
| `milestones/vX.Y-ROADMAP.md`, `vX.Y-REQUIREMENTS.md` | `/gsd-complete-milestone` | Same grammar as the live files plus an archive header | Same as live | Roadmap handler runs; page elsewhere | 15, 14 | `core/templates/milestone-archive.md` |
| `milestones/vX.Y-quick/README.md` | `/gsd-complete-milestone --archive-quick` | `# Archived Quick Tasks` and one link per task directory | Count and dates; list | Fallback | 4 / 2 trees | `core/workflows/complete-milestone.md` |
| `milestones/vX.Y-research/` | Archived project research | Same five files as `research/` | Research page for an old milestone | Fallback | 5 / 1 tree | observed |

The four real audits on this machine (studio-portal, two in plan.sideby.me, labelore) share these headings: a title line, then `Definition of Done` or `Verdict` (sometimes `Verdict in one line` / `Bottom line`), `Requirements Coverage (3-source cross-reference)`, `Phase Verification Summary` (or `Roll-Up`), `Cross-Phase Integration`, `Nyquist` (compliance or coverage), `Tech Debt Summary`; some add `Independent Test Execution`, `Tree Health` or `End-to-End Flows`. Build the audit page on frontmatter first (scores, gaps and tech debt are all structured) and match these headings fuzzily for the body. Do not build against `fixtures/dense`'s `Scope Check / Findings / Sign-Off` shape: no real audit looks like it.

## A.8 Family 6: Phase specification and setup

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `NN-SPEC.md` | `/gsd-spec-phase` | No frontmatter. Bold header lines (`**Created:**`, `**Ambiguity score:** 0.12 (gate: <= 0.20)`, `**Requirements:** N locked`); `## Goal`, `## Background`, `## Requirements` (numbered; each with Current, Target, Acceptance), `## Boundaries` (In scope, Out of scope), `## Constraints`, `## Acceptance Criteria` (checkboxes), `## Edge Coverage` (table with covered/dismissed/backstop/UNRESOLVED), `## Prohibitions (must-NOT)` (same table shape), `## Ambiguity Report` (four dimensions with minimums), `## Interview Log` (round, perspective, decision) | Is it locked enough to plan: ambiguity score against the gate; the requirement list as Current to Target to Acceptance; unresolved edge and prohibition counts | Fallback | 0 (synthetic copy in `fixtures/dense`) | `core/templates/spec.md`, `core/workflows/spec-phase.md` |
| `NN-AI-SPEC.md` | `/gsd-ai-integration-phase` | No frontmatter. Numbered sections `1. System Classification`, `1b. Domain Context`, `2. Framework Decision`, `3. Framework Quick Reference`, `4. Implementation Guidance`, `4b. AI Systems Best Practices`, `5. Evaluation Strategy` (dimensions table: dimension, rubric, measurement Code/LLM Judge/Human, priority), `6. Guardrails`, `7. Production Monitoring`, `## Checklist`. HTML comments are unfilled template slots | System type, stakes level, 3 to 5 critical failure modes, framework and pinned version, the eval dimension table, checklist progress; an honest "not filled in" state when slots are still comments | Fallback | 0 (synthetic copy in `fixtures/dense`) | `core/templates/AI-SPEC.md` |
| `NN-USER-SETUP.md` | Execute, when a plan's `user_setup` frontmatter has items | Bold header (Generated, Phase, Status Incomplete|Complete); `## Environment Variables` table (Status `[ ]`, Variable, Source, Add to); `## Account Setup` and `## Dashboard Configuration` checklists; `## Verification` | N of M done; what blocks the integration; where each variable goes. Never show values. | Fallback | 0 | `core/templates/user-setup.md` |
| `NN-SKELETON.md` and `SKELETON.md` | Planner, only for a Phase 1 walking skeleton (`--mvp`, new project) | `# Walking Skeleton`; `## Capability Proven End-to-End`, `## Architectural Decisions` table (Decision, Choice, Rationale), `## Stack Touched in Phase 1` checklist, `## Out of Scope`, `## Subsequent Slice Plan` | The one-sentence capability; the decision table; slice plan as a short ladder | Fallback | 4 / 4 trees | `core/references/skeleton-template.md` |
| `COVERAGE.md` (unprefixed; also in `quick/<id>/`) | Planner at plan time when `workflow.api_coverage_gate` finds an external-API phase | `# API Coverage: <service>`; table (`capability | decision INTEGRATE|OPT-OUT | reason`); real files add columns (`#`, method, plan). Alternative body: `No external API integration: <reason>` | INTEGRATE against OPT-OUT counts; every opt-out with its reason; which plan owns each row | Fallback (kind `unknown`; the registered manifest is dead and mislabelled) | 20 / 7 trees | `core/references/api-coverage.md`, real files in studio-portal, duet, protocol-to-rules |
| `NN-PLAN-OUTLINE.md` | `/gsd-plan-phase` chunked mode | Table of Plan ID, Objective, Wave, Depends On, Requirements | Transient; skip | Fallback | 0 | `core/references/planner-chunked.md` |
| `NN-DISCUSS-CHECKPOINT.json`, `NN-QUESTIONS.json` | discuss-phase (default and power mode) | Checkpoint JSON, deleted after CONTEXT is written | Transient; Internal | Raw | 0 | `core/workflows/discuss-phase/modes/default.md` |

SPEC and AI-SPEC are the two documents a human reviews and signs off before a phase starts, so they merit full designs. COVERAGE is the most frequently seen new type; its design is small (a two-colour decision table with reasons) and it should ship in the first batch alongside the fix to discovery.

## A.9 Family 7: Review and verification extras

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `NN-REVIEW-DISPOSITION.md` | The code-review gate (`execute-phase`, `code-review-fix`) | Current frontmatter: `phase`, `review`, `titles: json`, `findings[{id, severity, disposition: open|fixed|skipped|deferred, title}]`, `open`, `total`, optional `unparsed`, `recorded`; body table (Finding, Severity, Disposition, Source). Older shape: two-column table, dispositions like `fixed (see 03-REVIEW-FIX.md)`, no frontmatter | Open of total; by severity; deferred ones with their reason; the id links to the finding in REVIEW | Fallback (kind `review-disposition`) | 20 / 4 trees | `core/workflows/execute-phase/steps/code-review-disposition.md`, real file `Personal/duet/.../03-REVIEW-DISPOSITION.md` |
| `NN-REVIEW-FIX.md` | `/gsd-code-review --fix` (gsd-code-fixer) | Frontmatter `phase`, `fixed_at`, `review_path`, `iteration`, `findings_in_scope`, `fixed`, `skipped`, `status: all_fixed|partial|...`; `## Fixed Issues` (per finding: files modified, commit, applied fix); `## Skipped Issues` (file:line, reason, original issue) | Fixed against skipped; per finding the commit and the reason | Basic manifest; REVIEW page already shows outcomes per finding | 16 / 7 trees | `agents/gsd-code-fixer.md`, real files in duet, plan.sideby.me |
| `NN-REVIEWS.md` (cross-AI plan review) | `/gsd-review` | Frontmatter `phase`, `reviewers[]`, `reviewed_at`, `plans_reviewed[]`, `models{}`, `model_sources{}`, optional `trimmed_reviewers{}`, `plan_coverage{}`; `## Plan-Revision Conflicts` between `gsd:plan-revision-conflicts` markers; one `## <Adapter> Review` per reviewer; `## Consensus Summary` with Agreed Strengths, Agreed Concerns, Divergent Views | Reviewer chips with model; agreed concerns first; where reviewers diverged; any lane that covered fewer plans than exist | Fallback (`reviews` kind, distinct from `review`) | 0 | `core/workflows/review.md` |
| `NN-EVAL-REVIEW.md` | `/gsd-eval-review` (gsd-eval-auditor) | Bold header (Audit Date, AI-SPEC Present, Overall Score /100, Verdict PRODUCTION READY|NEEDS WORK|SIGNIFICANT GAPS|NOT IMPLEMENTED); Dimension Coverage table (COVERED|PARTIAL|MISSING); Infrastructure Audit table; Critical Gaps; Remediation Plan (must fix, should fix, nice to have); Files Found | Score and verdict; coverage tally; ordered remediation | Fallback | 0 | `agents/gsd-eval-auditor.md` |
| `NN-DOM-VERIFY.md` | `gsd-dom-verifier` when `workflow.live_dom_uat` is on | Frontmatter `schema_version`, `wave`, `outcome: verified|nothing_to_report|could_not_look`, `reason`, `checked`, `passed`, `failed`, `needs_review`; body one line per criterion with the observation | The outcome, with "could not look" visibly different from "nothing to report"; pass, fail and needs-review counts | Fallback | 0 | `agents/gsd-dom-verifier.md` |
| `deferred-items.md` (phase and quick directories) | Executor, for out-of-scope discoveries | `# Phase N: Deferred Items`; a `## NN-MM` heading per plan; bullet items with file:line and why | Items by plan; link back to the plan that found it | Fallback | 20 / 5 trees | `agents/gsd-executor.md`, real files in studio-portal, labelore |
| `NN-HUMAN-UAT.md` | verify-work when items need a human | Frontmatter like UAT (`status`, `phase`, `source`, `started`, `updated`, `resolution`), `## Current Test`, `## Tests` with expected / result / note | Keep current page, per the milestone | Fallback | 2 / 1 tree | `core/bin/lib/uat.cjs` |

Design note: DISPOSITION and FIX are two halves of one ledger of "what happened to each review finding", and the review page already composes a per-finding outcome from FIX. Do not build a third copy. Give DISPOSITION a ledger page and link each row to the finding thread in REVIEW; make FIX a page that leads with the fixed/skipped tally and the commit per finding. Both must read the old two-column disposition shape, not only the 1.18 frontmatter.

## A.10 Family 8: Codebase map (seven documents)

All seven are written by `/gsd-map-codebase` through four parallel mappers (`agents/gsd-codebase-mapper.md`: tech writes STACK and INTEGRATIONS, arch writes ARCHITECTURE and STRUCTURE, quality writes CONVENTIONS and TESTING, concerns writes CONCERNS). `/gsd-scan --focus tech|arch|quality|concerns|tech+arch` writes a subset. Since 1.18 each file also carries frontmatter `last_mapped_commit` and `last_mapped_at` (stamped by `stamp-codebase-map`, `core/workflows/map-codebase.md`). Older files use `**Analysis Date:**` or `*Last updated:*` plus `*Focus:*` and `*Codebase: /abs/path*` footers. ARCHITECTURE can open with `<!-- refreshed: DATE -->`.

| Document | Sections | A reader (and the overview) needs | Seen |
|----------|----------|-----------------------------------|------|
| `STACK.md` | Languages (Primary, Secondary), Runtime, Frameworks (Core, Testing, Build/Dev), Key Dependencies (Critical, Infrastructure), Configuration, Platform Requirements | Languages and frameworks as chips with versions; runtime; build tool | 8 |
| `INTEGRATIONS.md` | APIs and External Services, Data Storage (databases, file storage, caching), Authentication, Monitoring, CI/CD, Environment Configuration, Webhooks (incoming, outgoing) | The outside world: services, stores, auth provider; required env var names (not values) | 8 |
| `ARCHITECTURE.md` | System Overview (an ASCII layer diagram), Component Responsibilities table, Pattern Overview, Layers, Data Flow, Key Abstractions, Entry Points, Architectural Constraints, Anti-Patterns (What happens, Why it's wrong, Do this instead), Error Handling, Cross-Cutting | The diagram first (shared lifted-diagram figure), component table, entry points, anti-patterns as swaps | 8 |
| `STRUCTURE.md` | Directory Layout (a tree), Directory Purposes, Key File Locations, Naming Conventions, Where to Add New Code, Special Directories | The directory tree (shared clean-tree figure); "where do I add X" as a lookup | 8 |
| `CONVENTIONS.md` | Naming, Code Style, Import Organization, Error Handling, Logging, Comments, Function Design, Module Design | Short rules list; this is reference, low urgency | 8 |
| `TESTING.md` | Test Framework (runner, run commands), File Organization, Structure, Mocking, Fixtures, Coverage, Test Types | Framework and the run command copyable; gaps | 8 |
| `CONCERNS.md` | Tech Debt, Known Bugs, Security Considerations, Performance Bottlenecks, Fragile Areas, Scaling Limits, Dependencies at Risk, Missing Critical Features, Test Coverage Gaps | Count per section; security items first; the single most dangerous item | 8 |

Real examples on this machine: `Ibis/resoundant/rhub/.planning/codebase/` (7 documents, 1,084 lines, a Rust and Go workspace), `resoundant-hub-ui`, `pyedge/cman` (Go; uses the older `*Last updated*` footer), `pyeicon`, `pyedge`, plus `Sideby/plan.sideby.me`. rhub's documents run 52 to 310 lines each and the other trees' run longer (cman's CONCERNS is about 15 KB); heading names vary a little between projects (rhub's STACK uses "Languages & Runtimes", its ARCHITECTURE adds "API Architecture" and "Database Schema Overview"), so lift by fuzzy heading match with a generic fallback, never by exact name.

A partial map (`/gsd-scan`) and a full map are different states. GSD calls them `fast`/`partial` against `complete` (`core/bin/lib/onboard-projection.cjs`, `map_readiness`). The overview should say which.

## A.11 Family 9: Experiments and ideas

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `spikes/MANIFEST.md` | `/gsd-spike` | `## Ideas` with one `### idea-key` per idea (paragraph, then **Requirements:** bullets); `## Spikes` table (`# | Idea | Name | Type | Validates | Verdict | Tags`) | Verdict board grouped by idea: validated, invalidated, partial, pending; each idea's requirements | Fallback | 2 / 2 trees | `core/workflows/spike.md`, real file in protocol-to-rules |
| `spikes/NNN-name/README.md` | `/gsd-spike` | Frontmatter `spike`, `idea`, `name`, `type: standard|comparison`, `validates` (a Given / When / Then sentence), `verdict` (keyword plus free text), `related[]`, `tags[]`; body: What This Validates (Given, When, Then), Research, How to Run (shell blocks), Results | Verdict chip with its sentence; the Given/When/Then; how to run it copyable; related spikes as links | Fallback | 10 / 2 trees | same |
| `spikes/CONVENTIONS.md` | `/gsd-spike-wrap-up` | Stack, Structure, Patterns bullets | Reference list | Fallback | 2 | `core/workflows/spike-wrap-up.md` |
| `spikes/WRAP-UP-SUMMARY.md`, `sketches/WRAP-UP-SUMMARY.md` | wrap-up commands | Date, processed count, feature areas, Processed Spikes table, Key Findings | Included against excluded | Fallback (sketches version: Page elsewhere) | 2 | same |
| `spikes/NNN-name/` scripts and `out/` | Spike author | `.py`, `.mjs`, `.json` data, `__pycache__`; `out/` is gitignored by convention | Names only; never render | Raw | 228 in `out/` alone | observed |
| `seeds/SEED-YYMMDD-xxx-slug.md` | `/gsd-capture --seed` (plant-seed) | Frontmatter `id`, `status: dormant|active|triggered`, `planted`, `planted_during`, `trigger_when`, `scope: Small|Medium|Large|unknown`, optional `audit_acknowledged{milestone, at, status}`; body Why This Matters, When to Surface, Scope Estimate, Breadcrumbs, Notes | Status, the trigger sentence, scope, planted when; breadcrumbs as links | Fallback | 2 / 2 trees | `core/workflows/plant-seed.md`, real file in protocol-to-rules |
| `threads/<slug>.md` | `/gsd-thread` | Frontmatter `slug`, `title`, `status: open|in_progress|resolved`, `created`, `updated`; body Goal, Context, References, Next Steps. Older threads use `## Status: OPEN` and a `# Thread:` heading | List by status; the next steps first | Fallback | 0 | `core/workflows/thread.md` |
| `research/questions.md` | `/gsd-explore` (append) | Open questions; resolved ones struck through and dated | Open against resolved | Fallback | 1 | `core/workflows/explore.md` |

`sketches/` already has the Sketches page. Todos and notes already have pages.

## A.12 Family 10: Reports, forensics, onboarding

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `reports/SESSION_REPORT.md` or `YYYYMMDD-session-report.md` | `/gsd-session-report` | Header (Generated, Project, Milestone); Session Summary (duration, phase progress, plans executed, commits); Work Performed (phases touched, key outcomes, decisions); Files Changed; Blockers and Open Items; Estimated Resource Usage table | Duration, commits and plans as numbers; outcomes; blockers | Fallback | 0 | `core/workflows/session-report.md` |
| `reports/MILESTONE_SUMMARY-vX.Y.md` | `/gsd-milestone-summary` | Seven numbered sections (Project Overview, Architecture and Technical Decisions, Phases Delivered table, Requirements Coverage, Key Decisions Log, Tech Debt and Deferred, Getting Started) plus Stats | Phases table; requirement coverage marks; stats strip | Fallback | 0 | `core/workflows/milestone-summary.md` |
| `forensics/report-YYYYMMDD-HHMMSS.md` | `/gsd-forensics` | Evidence Summary (Git Activity, Planning State, Artifact Completeness table with check and cross per phase and artifact); Anomalies Detected (type plus Confidence HIGH|MEDIUM|LOW, Evidence, Interpretation); Root Cause Hypothesis; Recommended Actions | Hypothesis and recommended actions first; anomalies with confidence chips; the completeness grid | Fallback | 0 | `core/workflows/forensics.md` |
| `onboarding/SUMMARY.md` | `/gsd-onboard` | Project State (four files present or missing), Codebase Context (brownfield, map readiness, fast map), Docs Context (ADR/PRD candidate count), Recommended Next Step (a command) | The next-step command, copyable; four present/missing pills | Fallback | 0 | `core/workflows/onboard.md` |

## A.13 Family 11: Machine indexes (`intel/`, `graphs/`)

| File | Written by | Structure | At a glance | Today | Seen | Source |
|------|-----------|-----------|-------------|-------|------|--------|
| `intel/stack.json`, `file-roles.json`, `api-map.json`, `dependency-graph.json`, `arch-decisions.json` | `/gsd-map-codebase --query` (gsd-intel-updater), gated by `intel.enabled` | Each `{ _meta{updated_at, version}, entries{...} }`. stack: languages, frameworks, tools, build_system, test_framework, package_manager. file-roles: path to exports, imports, type. api-map: route to method, params, file. dependency-graph: name to version, type, used_by. arch-decisions: overview, data-flow, `component:Name` | Summary counts and a searchable list; never the raw JSON | Raw | 0 | `agents/gsd-intel-updater.md` |
| `intel/decisions.md`, `requirements.md`, `constraints.md`, `context.md`, `SYNTHESIS.md`, `classifications/*.json` | `/gsd-ingest-docs` (gsd-doc-synthesizer) | Per-type markdown synthesised from imported ADR, PRD, SPEC, doc files; SYNTHESIS is the entry point (counts, conflict totals) | SYNTHESIS first | Fallback | 0 | `agents/gsd-doc-synthesizer.md` |
| `graphs/graph.json`, `graphs/.last-build-status.json` | `/gsd-graphify build` | Graph with `nodes[{id, label}]` and `edges` (or `links`) carrying a confidence tier EXTRACTED, INFERRED or AMBIGUOUS. Status: `ts`, `status: running|ok|failed`, `exit_code`, `duration_ms`, `head_at_build`, `graphify_version` | Node and edge counts, last build status and age; at most a top-N list | Raw | 0 | `core/bin/lib/graphify.cjs`, `core/references/planner-graphify-auto-update.md` |

Hard constraint from the existing code: `JsonConfigHandler` copies the whole parsed object into `frontmatter` and the whole text into `body`. A graph can be megabytes. Index and serve a bounded summary only.

## A.14 Families 12 to 15

| Family | Files and structure | At a glance | Today | Seen | Source |
|--------|--------------------|-------------|-------|------|--------|
| 12 Workstreams | `.planning/workstreams/<name>/` holds that workstream's own `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `phases/` and optionally `config.json`. Shared files (PROJECT, config, milestones, research, codebase, todos) stay at the root. `.planning/active-workstream` names the current one. Workstream STATE has frontmatter `workstream`, `created`. | One card per workstream (current phase, progress); then the normal pages scoped to it | Not understood: files fall to location `other`, so phases are invisible to the dashboard | 0 | `core/bin/lib/workstream.cjs`, `core/references/workstream-flag.md` |
| 13 Quick batches | `quick-batches/<id>/BATCH.json`: `schema_version`, `batch_id`, `created_at`, `options`, `base_revision`, `items[{quick_id, description, status pending|dispatched|complete|failed|blocked, depends_on[], planned_files[], wave, commit, failure_reason}]` | Batch as a wave board: items by wave with status and the commit | Raw | 6 / 2 trees | `core/bin/lib/quick-batch.cjs` |
| 14 Debug extras | `debug/knowledge-base.md`: `# GSD Debug Knowledge Base`; one `## slug (resolved DATE)` entry each with Symptom or Error patterns, Root cause, Fix, Why not caught, Recurrence guard, Session link; labelore's own adds `### Transferable lessons` | Entries as a searchable list; guard and why-not-caught are the useful fields | Fallback (deliberately excluded from the debug kind) | 2 | `agents/gsd-debugger.md` |
| 15 Visual-review output | `ui-reviews/<padded-phase>-<timestamp>/*.png` screenshots, a `.gitignore`, and hand-written `REPORT-roundN.md` or a self-contained `.html` | Screenshot grid grouped by run; report as a document | Raw (PNG read as text) | 13 / 6 trees | `core/workflows/ui-review.md` |

## A.15 Files that need no page (Internal)

GSD writes these for itself. List them under a quiet "Internal" group in the drawer, exclude them from search, and never design for them. Source for each: grep of `core/workflows`, `core/bin/lib`, `agents/`.

`.planning/tmp/*.json`, `async-jobs/*.json` (external-job manifests, referenced from HANDOFF), `agent-history.json`, `current-agent-id.txt`, `active-workstream`, `.gsd-ws-arg`, `.gsd-outgoing-milestone`, `.gsd-allow-shrink`, `.active-skill`, `WAITING.json`, `STATE.md.lock`, `STATE.md.bak`, `logs/`, `memory/`, `milestone.lock` (except the banner), `skill-manifest.json`, `research/.cache/` (already skipped), `NN-DISCUSS-CHECKPOINT.json`, `NN-QUESTIONS.json`, `NN-PLAN-OUTLINE.md`, `.tdd/*-red.json`, `.edge-coverage-fallback.json`, `*.patch` and `*.diff`, `__pycache__/`, build output.

User-authored one-offs in phase directories (`ROUTE-INVENTORY`, `RUNBOOK`, `STAGING-RESULT`, `EVIDENCE`, `MIGRATION-PLAN`, `ENV-AUDIT`, `UAT-round1`, `v3.0-CAPACITY-PLAN.md`) already take the generic fallback and should keep it. The fallback is the right design for them.

## A.16 Complete status index (every type, one row)

| Type | Family | Status today | Needs in v2.1 |
|------|--------|--------------|---------------|
| CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW, PLAN, SUMMARY, VERIFICATION, REVIEW, per-phase LEARNINGS, debug sessions, todos, notes, DISCUSSION-LOG | existing | Designed | Nothing (discussion log and human UAT keep their pages) |
| Dashboard (PROJECT, STATE), roadmap (ROADMAP, MILESTONES, RETROSPECTIVE), traceability (REQUIREMENTS), sketches, project research (five files) | 1 | Page elsewhere | File view that matches the app page |
| WINDOWS.md | 1 | Basic handler, fallback view | Page |
| config.json | settings | Basic handler, fallback view | Settings view, not a document |
| milestone audit, REVIEW-FIX | 5, 7 | Basic | Page |
| COVERAGE | 6 | Dead manifest, fallback | Discovery fix, then page |
| SPEC, AI-SPEC, USER-SETUP, SKELETON | 6 | Fallback | Page |
| REVIEW-DISPOSITION, REVIEWS, EVAL-REVIEW, DOM-VERIFY, deferred-items | 7 | Fallback | Page |
| `.continue-here.md`, HANDOFF.json | 3 | Fallback / Raw | Page |
| Seven codebase documents | 8 | Fallback | Page family plus overview |
| spikes, seeds, threads, research/questions | 9 | Fallback | Page |
| reports, forensics, onboarding | 10 | Fallback | Page |
| intel, graphs | 11 | Raw / Fallback | Bounded summary |
| workstreams | 12 | Not understood | Scope plus index page |
| quick-batches | 13 | Raw | Page |
| debug knowledge base | 14 | Fallback | Page |
| ui-reviews | 15 | Raw | Page (image-aware) |
| state.json, calibration, milestone.lock | 4 | Raw | Lift facts only |
| STATE-ARCHIVE, METHODOLOGY, BACKLOG, root notes | 2 | Fallback | One generic root-note treatment |
| Internal and ephemeral files (A.15) | 15 | Mixed | Hide, do not index |

## A.17 Catalogue caveats

- **Structure is HIGH confidence only where a template or writer was read.** For SPEC, AI-SPEC, USER-SETUP, REVIEWS, EVAL-REVIEW, DOM-VERIFY, threads, reports, forensics, onboarding, intel, graphs and workstreams, no real file exists here. Pitfall: a design built from the template alone fails on the first real file (see PITFALLS.md, per-type pages built from one example or none). Create fixtures by running GSD's own writers or by hand-filling the templates, and label them synthetic.
- **Shapes drift between GSD versions.** REVIEW-DISPOSITION has two shapes on this machine. Codebase documents have three header styles. THREADS had a heading-based status before the frontmatter one. `COVERAGE.md` rows gain columns per project. Every page must degrade to the generic read without a warning when a key is missing.
- **Labelore's name table is stale against 1.18.** `src/planning-repo/naming.ts` `CANONICAL_EXACT` lacks `state.json`, `skill-manifest.json` and root `PATTERNS.md`. Do not edit the transcription; add a Labelore-side map (see ARCHITECTURE.md).
- **Counts are of this machine, not of GSD.** 14 trees, one of them Labelore, two near-duplicates.

---

# Part B. Feature landscape for the v2.1 features

Complexity key: Low (a day or less, one file or one component), Medium (a few days, touches two or three layers), High (a week or more, new layer or shared contract).

House direction recorded in earlier sketch rounds (carry it into every new page): a bold first screen that says one thing, no added motion, and back matter as one chip row.

## B.1 Designed pages for every remaining file type

### Table stakes

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| The page answers one question on its first screen (see the "at a glance" column per type) | Every v2.0 page does; a new type that opens as a wall of text feels broken | Low per page | The question per family is in A.3 to A.14 |
| Status and counts as a facts strip: verdict, N of M, dates | Matches dashboard and every v2.0 page | Low | Lift from frontmatter first, headed sections second, prose last |
| Source stays one click away (View and Source toggle) | The existing escape hatch (D-01) | Low | Already in the shared header |
| Graceful degradation per page: missing key, empty section, old shape, unfilled template | The project's standing rule is unknown shapes degrade, not break | Medium | REVIEW-DISPOSITION old shape, AI-SPEC with comment-only slots, codebase header styles |
| An honest empty state per page ("not recorded yet"), never a blank | Existing rule, tested by v1.0 | Low | Spikes without a verdict, threads without next steps |
| Reachable from the drawer and from search with the right file-type label | A page nobody can find is not a page | Medium | Needs the folder-to-kind table and the search file-type label table |
| Cross-references clickable (`D-XX`, `WR-XX`, REQ ids, plan ids, phase numbers) | v1.1 promise | Low | The reference registry already resolves them |
| A synthetic fixture and one end-to-end spec per new page | Test-health goal of v2.1 | Medium | Run only the touched spec, never the whole suite |
| No document ever shows a secret | A new class of file can carry one (USER-SETUP variable values, env var lists, config) | Low | Show variable names and where they go, never values |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Two-document joins: DISPOSITION with REVIEW and FIX; AUDIT scores linked to the requirement and phase pages; USER-SETUP checklist linked to its plan | Answers "what happened to X" without hunting | Medium | Review threads already compute the REVIEW-FIX join; reuse it |
| Config toggles explain absent files (see B.2): "No SECURITY file because `security_enforcement` is off" | Turns an unexplained gap into an answer; unique to this tool | Medium | Needs the toggle-to-artifact map |
| "GSD suggests" line from `state.json` `next` | Authoritative next step, no routing logic of our own | Low | Quiet, one line |
| Lifting figures from shared components (diagram, tree) in ARCHITECTURE and STRUCTURE | Reuses v2.0 figure work for free | Low | Both documents already contain an ASCII diagram and tree |
| Verdict board for spikes grouped by idea | One screen replaces reading ten READMEs | Medium to High | Needs MANIFEST parse plus README frontmatter |
| Wave board for quick batches | Shows dependency and failure at a glance | Medium | Items have `wave`, `depends_on`, `status` |

### Anti-features

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| One page per internal file (state.json, async-jobs, tmp) | "Every file GSD writes" | They change on every command and carry nothing a person decides on | Internal group in the drawer; lift two or three facts only |
| Rendering whole `graph.json` or `intel/*.json` | Looks impressive | Megabytes into the browser and the search index | Bounded summary on the server |
| Editing a thread, ticking a USER-SETUP box, setting a disposition | The files are checklists | The tool is read-only by design; PLAT-03 would revisit deliberately | Show the state; show the exact command to run, copyable |
| A purpose taxonomy ("review files", "spec files") driving templates | Tidy | Rejected in v1.1: structure lives in different places in files with the same purpose | Per-kind manifests, shared composers behind a kind-to-composer table |
| Designing for each user-authored one-off (RUNBOOK, ENV-AUDIT) | They appear in real projects | Unbounded and unrepeatable | Generic fallback with outline |
| Pages for files this machine has never produced, before a fixture exists | Completeness | A page designed from a template fails on the first real file | Synthetic fixture first, flag LOW confidence in the page's requirement |

## B.2 config.json as read-only project settings

What the file holds. Real key sets on this machine differ project to project (Sideby has `graphify`, `intel`, `planning`; Resoundant has `resolve_model_ids`; Labelore has nested `ship.pr_body_sections`). Seen in real configs but absent from the 1.18 field reference: `tavily_search`, `ref_search`, `perplexity`, `jina`, `claude_md_path`, `workflow.pattern_mapper`, `workflow.human_verify_mode`, `workflow.plan_bounce*`, `plan_review.*`, `git.allow_default_branch_commits`, `workflow.tdd_mode`, `workflow.ui_review`, `workflow.compact_content`, `telemetry.*`, `graphify.*`, `vibe_check`, `experimental_widget_pipeline`. So the view must walk the object, and decorate only keys it knows.

Groups that mirror GSD's own `/gsd-settings` sections, with the files each toggle gates (Source: `core/references/planning-config.md` Complete Field Reference, `core/workflows/settings.md`):

| Group | Keys a person cares about | Artifact effect worth showing |
|-------|---------------------------|-------------------------------|
| Pipeline and model | `mode` (interactive or yolo), `granularity`, `model_profile`, `workflow.auto_advance`, `workflow.discuss_mode`, `workflow.skip_discuss`, `workflow.human_verify_mode`, `parallelization`, `context_window`, `response_language` | `skip_discuss` explains a phase with no CONTEXT |
| Planning gates | `workflow.research`, `plan_check`, `pattern_mapper`, `nyquist_validation`, `ui_phase`, `ui_safety_gate`, `ai_integration_phase`, `api_coverage_gate`, `post_planning_gaps` | RESEARCH, PATTERNS, VALIDATION, UI-SPEC, AI-SPEC, COVERAGE |
| Execution and verification | `workflow.verifier`, `code_review`, `code_review_depth`, `security_enforcement`, `security_asvs_level`, `security_block_on`, `tdd_mode`, `use_worktrees`, `test_command`, `build_command`, `windows_enforce`, `live_dom_uat` | VERIFICATION, REVIEW and REVIEW-FIX, SECURITY, WINDOWS, DOM-VERIFY |
| Git and shipping | `commit_docs`, `git.branching_strategy`, `base_branch`, branch templates, `create_tag`, `ship.pr_body_sections`, `sub_repos` | Branch names to expect; whether `.planning/` is committed |
| Naming | `phase_naming`, `project_code`, `claude_md_path` | Explains phase directory names |
| Integrations | `brave_search`, `firecrawl`, `exa_search` (may be secret strings), `tavily_search`, `ref_search`, `perplexity`, `jina`, `review.models.*`, `agent_skills`, `model_overrides` | Which research providers a research run could use |
| Features and knowledge | `features.*`, `learnings.max_inject`, `intel.enabled`, `graphify.enabled`, `hooks.*`, `telemetry.*` | `intel/` and `graphs/` appear only when on |
| Internal | any key beginning `_` (for example `_auto_chain_active`) | None; fold away |

### Table stakes

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Reachable from anywhere in the app (header control and a search/palette entry), not buried in a drawer | The milestone says so; settings pages are expected one click away | Low | A route, so deep-linkable |
| Grouped like `/gsd-settings`, with plain-language labels for known keys | A flat dump of 60 keys is unreadable | Medium | Label table only decorates; unknown keys go to "Other" with the raw value |
| Values shown as set or "not set", never invented defaults | Claiming a default GSD may have changed is wrong | Low | Show a default only if read from gsd-core source and labelled as GSD's default |
| Secrets masked server-side everywhere the file can leak: settings view, Source view, `/api/artifacts`, search snippets | GSD documents plaintext keys in this file; its own convention is `****` plus the last four characters, under 8 characters `****` | Low to Medium | Mask by the three known names and by a heuristic over key names (key, token, secret, password). Values must never reach the index |
| Says which file it is showing and flags a parse failure with the raw text | Workstreams can have their own config; a broken JSON must not blank the page | Low | A workstream's config shows as a second labelled group |
| Works with a missing file and for codebase-only projects | `config.json` is absent in 5 of 14 trees | Low | Empty state: "No GSD settings file in this project" |
| Raw file still readable in Source mode | Escape hatch | Low | Same redaction applies |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| "What this changes" per toggle: the artifact it gates, linked to examples in this project | No other tool can do this; answers "why is there no X" | Medium | Toggle-to-artifact map above; count files of that kind in this project |
| Highlight keys that differ from GSD's defaults | Quick audit of how a project is configured | Medium | Only where defaults are sourced from `planning-config.md`; skip otherwise |
| Compare against another opened project's config | Useful once multi-project exists | High | Defer |
| Effective values when a workstream config overrides the root | Prevents reading the wrong file | Medium | Only meaningful once workstreams are understood |

### Anti-features

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Toggling a setting from the UI | The view looks like a form | Writes to `.planning/`; violates the access constraint | Show the `/gsd-config` command, copyable |
| Showing `commit_docs` or branch templates as live facts about git | They read like git state | They are config, not repo state | Label as configured, not observed |
| A closed schema that errors on unknown keys | Tidy typing | GSD adds keys every minor release | Open map with decoration |
| Putting config.json in the drawer's document list and in search results as a plain document | It is a file | Two canonical homes for one thing | Drawer and search point at the settings view; Source stays reachable by URL |

Dependencies: redaction must land before the view (and before any fixture is copied from live trees). Needs the header (`app-shell.tsx`), the existing `presentation.config`, and the folder/kind table to remove `config` from the document list.

## B.3 Codebase-only projects ("mapped, not started")

### What the target projects look like

Four trees on this machine hold only `codebase/` (rhub 7 documents, resoundant-hub-ui 7, cman 7, pyeicon 7 plus `CHANGELOG-ctoh-arbitrary-file-read.md`). One more (deid-ui) holds only `ui-reviews/`. Labelore already loads all of them as valid projects (the loader accepts any target with a `.planning/` directory), with zero phases, so today they open on an empty dashboard and show Roadmap and Traceability tabs with nothing in them. One path restriction exists: pointing the CLI at the `.planning` directory itself requires `PROJECT.md` or `STATE.md` (see ARCHITECTURE.md, Feature 3).

GSD's own states for this shape (`core/bin/lib/onboard-projection.cjs`): map readiness is `none`, `fast` (a partial `/gsd-scan`), or `complete` (all seven documents). The next step GSD recommends for a mapped project with no `PROJECT.md` is `/gsd-new-project`; if ADR, PRD or SPEC documents exist it is `/gsd-ingest-docs`; a fast map still needs a complete map before project setup. `onboarding/SUMMARY.md` may already hold the recommendation.

### Table stakes

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| First screen says plainly "mapped, not started": what was mapped, when, and that there is no roadmap yet | The milestone's own wording; an empty dashboard reads as broken | Low | Replace the dashboard body for this shape; hide Roadmap and Traceability |
| The project's identity in one glance from STACK: languages, runtime, frameworks, build tool | What anyone wants first about unfamiliar code | Medium | Lift from headings by fuzzy match; fall back to the first lines |
| The seven documents as an entry grid with line counts and the analysis date | Wayfinding into the map | Low | Show "missing" honestly for a partial map; say fast or complete |
| Architecture lifted: the system diagram and the entry points | Second thing anyone wants | Medium | Reuse the lifted-diagram figure |
| Concerns lifted: counts per section, security items first | The point of mapping brownfield code | Medium | Section counts from CONCERNS headings |
| Freshness: analysis date and, since 1.18, the commit the map was taken at (as text) | A stale map misleads | Low | Read-only filesystem cannot compare against HEAD; show the stamp only |
| Next-step hint with the exact command, copyable | Tells the user what GSD wants next | Low | Commands as text; Labelore never runs them |
| Every document reachable with clean URLs (`/<project>/codebase/architecture`) | Milestone | Low | Folder rule |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Testing facts in the overview: framework, the run command, listed gaps | Answers "can I trust a change here" | Low | From TESTING |
| "Where to add new code" lookup from STRUCTURE on the overview | The most practical sentence in the map | Medium | Variable shape; degrade to the heading link |
| Map health: which of the four mapper focus areas are present (tech, arch, quality, concerns) | Explains a partial map | Low | Derived from which files exist |
| A single "most dangerous concern" pull quote | Gives the first screen a point of view | Medium | First item under security or tech debt; risk of picking wrong; make it quiet and labelled |
| Per-document pages share one composer family but keep granular kinds | Search file-type filter and drawer labels want fine kinds | Medium | Kind to composer table, see ARCHITECTURE.md |

### Anti-features

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Offering to run `/gsd-new-project` | Natural next click | Labelore is read-only and does not drive GSD (PLAT-03 is later) | Copyable command and a one-line reason |
| Re-scanning the repo or running the mapper | "Refresh the map" | Same | Say which command refreshes it |
| Computing staleness against the real git HEAD | Honest freshness | Needs git access outside `.planning/` and fails over ssh mirrors | Show the stamp and date |
| A fake progress bar or empty roadmap skeleton | Looks like the other projects | Pretends there is state | Say "no roadmap yet" once and quietly |

## B.4 Search: grouping by milestone then phase, filters, Cmd-K palette

What exists. A header dialog with a Cmd-K or Ctrl-K hint (`SearchDialog`) previews 8 hits; `/search` shows MiniSearch results grouped by location then type with snippets and a warning chip. The index is rebuilt on start; tokenisation is exact-token by decision. Hit URLs come from the route layer.

### What good tools do (evidence)

| Tool | Behaviour worth borrowing | Source confidence |
|------|--------------------------|-------------------|
| GitHub command palette | One shortcut; current scope shown top-left and narrowable with Tab, removable with Backspace; prefixes `>` commands, `#` issues, `@` people, `/` files; Enter jumps, Ctrl/Cmd+Enter new tab, Ctrl/Cmd+C copies the highlighted URL; suggestions follow context and recently used resources | HIGH (docs.github.com) |
| GitHub code search | Qualifiers `repo:`, `path:`, `language:`, `symbol:`, `content:`, `is:` combine with implicit AND, plus `OR` and `NOT` | HIGH |
| Linear | `/` searches the whole workspace, Ctrl/Cmd+F only the current view; `@`-mention teams, people and statuses to filter; recents shown first; sort by relevance, updated or created; type prefixes focus results | HIGH (linear.app/docs) |
| VS Code | Search results grouped by file, expandable to hits; include and exclude glob boxes; a toggle for ignore files | HIGH (code.visualstudio.com) |
| Raycast | Aliases that put a command at the very top; favourites pinned; recents toggle; every item has an action panel on Cmd+K | HIGH (manual.raycast.com) |
| Generic palette guidance | Global Cmd or Ctrl K plus a visible trigger; arrows, Enter, Esc; recents near the top; stable ids not labels; fuzzy matching; clear the input on close | MEDIUM (tutorial sources, no vendor primary) |
| WAI-ARIA combobox pattern | Input `role=combobox` with `aria-expanded`; popup `role=listbox`; `aria-activedescendant` for the highlighted item; a modal dialog palette moves focus into the dialog instead | HIGH (w3.org APG) |
| Docs-site search (Algolia DocSearch style) | Results grouped under page hierarchy | LOW (page fetched did not confirm; general knowledge) |

### Table stakes

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Results grouped milestone, then phase, then file type, with quick tasks and project areas as their own groups | The milestone's stated grouping; mirrors how the roadmap is read | Medium | `buildSearchGroups()` has milestone and phase lookups; `folders` table orders the other areas |
| Filters for phase, file type and requirement, each with a count | The milestone's stated filters; counts stop dead-end clicks | Medium | Compute facet counts over the whole hit list, then filter. Do not use per-query filtering that makes the unselected counts wrong |
| Filters persist in the URL and survive refresh | Search is a view; shared and reloaded | Low | Query string; part of clean-URL work |
| Cmd-K or Ctrl-K opens from anywhere; Esc closes; arrows and Enter | Everyone expects it; already half built | Low | Keep the shortcut where it is |
| Empty query shows useful things: recent files, jump targets (Dashboard, Roadmap, phases) | Linear, Raycast and GitHub do | Medium | Recents are client-side; navigation targets come from cached drawer and presentation queries |
| Typed query shows the top hits with type and phase, and a "see all results" row to the full page | Existing behaviour; palette and page share one index | Low | One search surface, two densities |
| Keyboard accessible with correct roles and an announced result count | Accessibility baseline | Medium | Base UI Autocomplete per STACK.md |
| Highlighted matches in snippets; the result opens at the matching heading | Already shipped; keep | Low | Heading anchors survive the URL change |
| Honest empty and error states with the query echoed | Existing rule | Low | |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Palette modes with at most three prefixes: none (files and pages), `#` for requirement or decision ids, `>` for show-in-app actions (switch project, open settings, toggle theme) | Matches GitHub and Linear habits without their sprawl | Medium | Single user; resist more prefixes |
| Jump by id: typing `WR-03`, `D-12`, `REQ-04`, `05-02` or `261024-qhq` goes straight to its definition | The reference registry already resolves these; no general tool can | Medium | The strongest tool-specific feature |
| Switch project from the palette | Ties search to multi-project | Medium | Needs the registry |
| Scope chip in the palette (this project, this phase) | GitHub's scope idea, cheap here | Medium | Phase scope = facet preselected |
| Facet "area" (phases, quick tasks, codebase, research, notes, todos, debug) | Good for non-phase content that now has pages | Low | From the folder table |
| Preview pane in the palette for the highlighted result | Raycast-like | High | Defer |

### Anti-features

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| A second search UI (a separate palette index) | "Palette is a different thing" | Two sources of truth; two behaviours to keep in sync | One query and one index; palette is a denser view |
| Query language with `AND` / `OR` / `NOT`, regex | GitHub has it | Over-engineering for one user over a few hundred files; breaks exact-token decision | Filters in the UI cover the same ground |
| Fuzzy typo correction across the whole body | Feels forgiving | Ranking noise on a corpus full of identifiers (`WR-03`); contradicts exact-token decision | Prefix matching on titles and ids only in the palette |
| Saved searches, search history sync | Productivity | Storage and a write path for little value | Recent items only, client-side |
| Searching inside `.cache`, binary files, or whole JSON documents | "Complete" | Pollutes results (108 PNGs would be indexed as text today) | Exclude by file-kind policy |
| Palette actions that run GSD commands | Looks like Raycast | Out of scope (PLAT-03) | Copy the command |
| Infinite scroll | Familiar | Loses place on back navigation | Paginate or show more per group |

Dependencies: clean URLs first (hit URLs); the file-kind policy (what is indexed); index metadata for milestone, phase, area and requirement ids; the project registry for the project-switch actions.

## B.5 Clean URLs and multi-project switching

### URL behaviours expected

The desired shape is `/<project>/v1.1/phase-5/plan-03`, `/<project>/quick/261024-qhq/summary`, `/<project>/codebase/architecture`. Today's URLs use encoded tokens (`m~`, `p~`, `a~`).

| Behaviour | Table stake? | Complexity | Notes |
|-----------|--------------|------------|-------|
| Deep-link refresh works for every shape, in dev and in the built server | Yes | Medium | Pitfall 4 in PITFALLS.md: dev server and static server both need the fallback |
| Back, forward, and bookmarks behave; trailing slash and case differences resolve to one page | Yes | Low | Redirect to the canonical form |
| Old encoded URLs redirect to the new ones | Yes | Low | One translator file; delete when bookmarks stop mattering |
| Unknown project slug: a page that names the slug, lists known projects, offers the switcher; never a silent redirect | Yes | Low | Evidence is weak but consistent: validate, fall back with a visible notice, do not switch silently (MCPJam PR, Nintex and TYPO3 threads) |
| Unknown milestone, phase, plan or file inside a known project: a not-found page inside the project shell naming what was asked and offering the nearest valid sibling or the search | Yes | Medium | Keeps navigation chrome |
| Every artifact has a URL, even ad-hoc names | Yes | Medium | `file/<relative path>` fallback form |
| Heading fragments preserved (`#heading`) | Yes | Low | Existing |
| The URL is the only source of "current project" | Yes | Low | No parallel context state (STACK.md) |
| Ids in URLs are readable (`phase-5`, `plan-03`, `v1.1`); same phase number across milestones is disambiguated by the milestone segment | Yes | Medium | Decimal and lettered phases, project codes |

### Multi-project switching behaviours expected

| Behaviour | Table stake? | Complexity | Notes |
|-----------|--------------|------------|-------|
| A switcher in the shell showing the current project and the list; opens from the palette too | Yes | Medium | Popover in the header |
| Several paths at start; `--scan <folder>` finds `.planning/` directories | Yes (milestone) | Medium | Skip symlinks; scan only on explicit request |
| Remembered projects across restarts, stored in Labelore's own settings file, not under any `.planning/` | Yes | Medium | The first write path in the app; keep it separate from the read-only filesystem seam |
| Switching keeps you on the equivalent page when it exists (settings stays settings, search stays search with the query, roadmap stays roadmap, a deep file path does not carry over), otherwise the dashboard | Yes | Medium | Equivalence by page type, not by path; say once, quietly, when it falls back to the dashboard |
| Add a path or `ssh://` target from the switcher, with a named error for a bad path | Yes (milestone) | Medium | Reuse the invalid-target screen's wording; the exact path checked |
| A remembered project that no longer exists shows as unavailable, with the reason, and can be removed; never silently dropped | Yes | Low | Remote projects may simply be offline |
| Each project loads lazily, not all at start | Yes | Medium | A slow ssh mirror must not delay the others |
| A stable, readable slug per project, deterministic across restarts and arrival order; duplicates disambiguated | Yes | Medium | Two checkouts both called "portal" exist in practice |
| Recent first: last opened project on top | Differentiator | Low | Cheap; ordering by last opened |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Project cards on a landing page (name, current milestone and phase, progress, "needs attention" flags) | Answers "where do I have work" across projects; this is the core value stretched across projects | Medium to High | Needs each project's presentation loaded; keep to a lightweight summary |
| Cross-project search | One index across all projects | High | Defer; per-project cache isolation first |
| Open the same artifact in another project | Compare two projects | Medium | Rarely wanted |
| Pinning favourite projects | Raycast-like | Low | Cheap once the settings file exists |
| Last-opened page remembered per project | Return where you were | Low | Client-side storage, per project slug |

### Anti-features

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Absolute paths in URLs | Simple to build | Leaks the home directory into history; breaks on rename | Derived slug plus server-side registry |
| Auto-scanning a remembered root at startup | "Keep it fresh" | A slow or unmounted path delays boot | Scan on request only |
| A global "active project" server state | Simple server | Two tabs on two projects fight | Slug in every request path |
| Switcher that also writes planning files | None | Violates access constraint | None |
| Following symlinks while scanning | Finds more | Cycles and escapes | Skip them |
| Merging several projects into one view | "One dashboard for everything" | Phase numbers and milestones collide; breaks the core question "where does this work stand" | One project per view; landing page links across |

Dependencies: per-project derived bundles and per-project query keys (ARCHITECTURE.md Feature 5); the folder table for URL segments; the settings store; invalid-target screen; ssh mirror (remote projects).

## B.6 Redesigned Source mode for raw files

What exists. Source toggles to the full rendered document (all sections, not the bytes); there is a copy-path button component, heading anchors, a source-hit marker used by "in the source only" links, and a stored Shiki highlighter for code blocks. There is no raw-text endpoint, no line numbers, no frontmatter folding, and no file-kind policy.

### What good raw viewers do (evidence)

| Capability | Where seen | Confidence |
|------------|-----------|------------|
| Raw view with a copy button and a download button | GitHub | HIGH |
| Markdown files toggle between Preview (rendered) and Code (source) | GitHub | HIGH |
| Click a line number, shift-click to extend a selection | GitHub | HIGH |
| Copy a permanent link to the exact line range | Sourcegraph | HIGH |
| Line wrap toggle | Sourcegraph | HIGH |
| Gutter fold icons; syntax-aware folding for Markdown, JSON, HTML | VS Code | HIGH |
| Frontmatter-aware folding | No official viewer found; Obsidian and editors fold properties from general knowledge | LOW |
| Copy path | Ubiquitous; GitHub copies path and URL | MEDIUM |

### Table stakes

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Line numbers in a gutter, not copied with the text | Every source viewer | Medium | Needs raw text from the server |
| Raw text exactly as on disk, monospace, with syntax colour for markdown, JSON, YAML and code | A "source" view that shows rendered content is not source | Medium | Existing Shiki on the server; cap file size and degrade to plain text above it |
| Frontmatter foldable and folded by default for documents that lead with it | The milestone names it; frontmatter is 10 to 40 noisy lines on every GSD file | Low to Medium | Fold the first `---` block; show a one-line summary of its keys |
| Copy path (project-relative, and absolute for local targets) and copy raw | The milestone names copy path | Low | Existing copy-path component |
| Deep-link to a line or range (`#L12-L20`) and back from a search hit | GitHub, Sourcegraph, VS Code all do | Medium | Fold-aware; line anchors must not collide with heading anchors |
| Soft wrap toggle, default on | Long markdown lines are unreadable otherwise | Low | |
| A binary and image policy: images shown, other binary files named with size and a "not shown" note | 108 PNGs are read as text today | Medium | Part of the shared file-kind policy |
| Secret masking in the source view | config.json is a plaintext secret holder | Low | Same server-side redaction as B.2 |
| Stays read-only; large files do not freeze the page | Project constraint; existing graph.json risk | Medium | Cap bytes; virtualise or truncate with a visible notice |
| Switching View to Source keeps your place (the heading in view becomes the line in view) | The page already scrolls to a heading on "in the source only" | Medium | |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| JSON documents pretty-printed with fold per object | HANDOFF, calibration, BATCH, graph summaries | Medium | Only where redaction and size caps hold |
| Jump between structure and source: a heading outline that scrolls the source | Source mode today loses the page's outline | Low | Outline already exists |
| Highlight PLAN wrapper tags and fenced blocks in source | GSD-specific | Low | Cosmetic |
| Show the document's Planned and Updated dates and size next to the path | Context | Low | |
| "Find in file" with matches highlighted | Browsers already do it | Low | Do not virtualise if it breaks browser Find |

### Anti-features

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Editing in the source view | It looks like an editor | Violates read-only | Copy path, so the user opens it in their editor |
| Blame and history | GitHub has it | Needs git; fails over ssh mirrors | None |
| Download button | GitHub has it | Not harmful, but not needed; copy raw covers it | Copy raw |
| Rendering HTML or running scripts from `spikes/` and `sketches/` | "Show the sketch" | Executes untrusted markup in the app origin | The Sketches page already serves sketch HTML separately; keep that route |
| Whole-file syntax highlighting for megabyte files | Pretty | Freezes the page | Cap and fall back to plain text |

Dependencies: a bounded raw-text payload (new, or a second field on the document response), the file-kind policy, the redaction layer, existing copy-path component, Shiki on the server, `document-view-toggle`, the outline and the "in the source only" jump.

---

## Feature dependencies

```
File-kind policy (text / image / binary) ──────────┬──> Source mode (images, binary notes, size caps)
                                                   ├──> Search index exclusions (no PNG text)
                                                   └──> ui-reviews and spikes pages

Secret redaction (config.json values) ─────────────┬──> Settings view
                                                   ├──> Source mode
                                                   ├──> Search index and snippets
                                                   └──> Fixtures copied from live trees (must be redacted)

Folder-to-kind table (position rules) ─────────────┬──> Discovery of COVERAGE, .continue-here, HANDOFF, codebase, spikes, ...
                                                   ├──> Drawer places and labels
                                                   ├──> URL segments (clean URLs)
                                                   └──> Search "area" and file-type facets

Clean URLs ──requires──> Folder-to-kind table
Project switcher ──requires──> Clean URLs (slug first) ──requires──> Per-project derived bundles
Search regroup, filters ──requires──> Clean URLs (hit URLs) and index metadata (milestone, phase, requirement)
Cmd-K palette ──enhances──> Search ──requires──> Project registry (project switch action)
Codebase overview ──requires──> Codebase page family (seven documents) ──requires──> Folder-to-kind table
Workstreams ──requires──> Scoped assembly (a workstream is a scope) ──requires──> Folder-to-kind table
Settings view ──requires──> Redaction; ──enhances──> every "why is X missing" empty state

New file pages ──each requires──> synthetic fixture + sketch + spec
DISPOSITION and FIX pages ──enhance──> existing review threads page (shared join)
Root-document file views ──reuse──> dashboard, roadmap, traceability content
```

### Dependency notes

- **File-kind policy comes first.** Source mode, search exclusions and image pages all need it. It also removes the surprise that PNG bytes are indexed.
- **Redaction comes before anything that shows `config.json`.** It must also come before any fixture is copied from a live tree.
- **The folder table comes before URLs, drawer and pages.** The existing chain of one-off path tests (debug, todo, note) does not scale to fifteen families.
- **Clean URLs come before search and project switching.** Hit URLs and per-project routes both build on them.
- **Workstreams are the one family that is architecture, not a page.** Without scope-aware assembly, a project that uses them shows no phases at all, whatever pages exist. No fixture exists: build one from `workstream create` output before design.
- **Codebase overview depends on the seven-document family** being reachable, so the family ships before or with the overview.
- **Conflict:** a standalone "settings" document page conflicts with the settings view (two homes for one file). Settings wins; the document route stays reachable only through the file URL.
- **Conflict:** a second palette index conflicts with the single search index.

---

## MVP definition (what v2.1 launches with)

Ordering follows the user's own rollout principle from the earlier per-type plan: most-opened first, a few related types per batch, one sketch and one build per type.

### Launch with (foundations, first)

- [ ] File-kind policy: text, image, binary, with size caps and exclusion from search (unblocks Source mode, ui-reviews and spikes)
- [ ] Secret masking for `config.json` in every output path, plus a regression test
- [ ] Folder-to-kind table, including unprefixed phase files (`COVERAGE.md`, `deferred-items.md`, `SKELETON.md`, `.continue-here.md`), `HANDOFF.json`, and every new folder
- [ ] Clean URLs with a redirect from the old tokens
- [ ] Project switcher: several paths at start, remembered projects, add path or ssh target, scan on request
- [ ] Settings view with grouping, masking and "what this changes"
- [ ] Source mode: line numbers, folded frontmatter, copy path and raw, line deep links, binary policy
- [ ] Search: milestone to phase grouping, phase, file type and requirement filters, Cmd-K palette with recents and jump by id

### Pages, batches (most-opened and most-seen first)

- [ ] Batch 1, review and verification ledger: COVERAGE, REVIEW-DISPOSITION and REVIEW-FIX, deferred-items, milestone audit (20, 20, 16, 20 files seen)
- [ ] Batch 2, codebase map and the "mapped, not started" overview (seen in 8 trees, and the only way four trees get a meaningful first screen)
- [ ] Batch 3, phase specification: SPEC, AI-SPEC, USER-SETUP, SKELETON (the documents signed off before work; need synthetic fixtures)
- [ ] Batch 4, root document file views and archive copies (match the dashboard, roadmap and traceability content; PROJECT and WINDOWS get full pages)
- [ ] Batch 5, experiments and ideas: spikes, seeds, threads, research questions
- [ ] Batch 6, pause and resume: `.continue-here.md` with HANDOFF.json; the state.json "GSD suggests" line
- [ ] Batch 7, reports, forensics, onboarding (never seen; build only with synthetic fixtures)
- [ ] Batch 8, REVIEWS, EVAL-REVIEW, DOM-VERIFY (never seen; AI-phase and opt-in gates)
- [ ] Batch 9, quick batches, debug knowledge base, ui-reviews

### Add after validation (v2.1.x)

- [ ] Workstream scope and index page, once a fixture from real workstream output exists (build trigger: the user starts using workstreams)
- [ ] intel and graph summaries (build trigger: `intel.enabled` or `graphify.enabled` appears in a project the user opens)
- [ ] STATE-ARCHIVE, INGEST-CONFLICTS layouts (build trigger: first real file)
- [ ] Project landing page with cross-project cards

### Future consideration

- [ ] Cross-project search and config comparison (needs per-project isolation proven first)
- [ ] Palette preview pane
- [ ] Backlinks, plan-versus-outcome pairing, recent-activity strip, file watching, driving GSD (already listed as later candidates)

---

## Feature prioritization matrix

| Feature | User value | Cost | Priority |
|---------|------------|------|----------|
| File-kind policy | HIGH (blocks four others) | MEDIUM | P1 |
| Secret masking | HIGH (safety) | LOW | P1 |
| Folder-to-kind table and discovery fixes | HIGH | MEDIUM | P1 |
| Clean URLs plus redirect | HIGH | MEDIUM | P1 |
| Project switcher | HIGH | MEDIUM | P1 |
| Search grouping, filters, palette | HIGH | MEDIUM | P1 |
| Settings view | MEDIUM | LOW to MEDIUM | P1 |
| Source mode redesign | MEDIUM | MEDIUM | P1 |
| COVERAGE, DISPOSITION, FIX, deferred-items pages | HIGH (most frequent) | LOW to MEDIUM | P1 |
| Codebase pages and overview | HIGH (four trees have nothing else) | MEDIUM to HIGH | P1 |
| SPEC, AI-SPEC, USER-SETUP, SKELETON | MEDIUM | MEDIUM | P2 |
| Root-document file views | MEDIUM | LOW | P2 |
| Spikes, seeds, threads | MEDIUM | MEDIUM to HIGH | P2 |
| Pause and resume pages | MEDIUM | MEDIUM | P2 |
| Reports, forensics, onboarding | LOW (never seen here) | LOW to MEDIUM | P3 |
| REVIEWS, EVAL-REVIEW, DOM-VERIFY | LOW to MEDIUM (opt-in features, never seen) | LOW to MEDIUM | P3 |
| Quick batches, debug knowledge base, ui-reviews | LOW to MEDIUM | LOW to MEDIUM | P3 |
| Workstreams | HIGH when used, ZERO today | HIGH | P3 (trigger-based) |
| intel and graphs | LOW | MEDIUM to HIGH | P3 |

Priority key: P1 must ship in v2.1; P2 should ship; P3 build when a real file or a trigger exists.

---

## Reference product analysis

| Feature | VS Code | Linear | GitHub | Raycast | Our approach |
|---------|---------|--------|--------|---------|--------------|
| One global shortcut | Cmd/Ctrl+P (quick open), Cmd/Ctrl+Shift+P (commands) | `/` search; palette on Cmd/Ctrl+K | Cmd/Ctrl+K | Hotkey, Cmd+K for actions | One shortcut, already shipped |
| Scope | Open folder | Workspace or current view | Shown chip, narrowable | Root search | Project, plus phase scope as a facet |
| Prefix modes | `@` symbol, `:` line, `>` commands | `i p u t l f d` type prefixes | `>` `#` `!` `@` `/` | Aliases | At most three: none, `#` ids, `>` actions |
| Recents first | Recently opened files | Recent searches and issues | Recently used resources | Recents and favourites | Client-side recent files |
| Facets and filters | include/exclude globs | `@` filters, filter menu | qualifiers | Not applicable | Phase, file type, requirement with counts |
| Result grouping | By file with hits | Relevance, updated, created | By type | By command group | Milestone, phase, type |
| Copy the thing | Copy path | Copy link | Copy URL with Ctrl/Cmd+C | Copy deeplink | Copy path and raw in source; copy URL from palette |
| Source view | Editor with gutter, folding | n/a | Raw, copy, download, blame, line select | n/a | Gutter, folded frontmatter, copy, line deep links; no blame |

---

## Sources

Local, primary (HIGH):
- `~/.claude/gsd-core/` (version 1.18.0): `references/artifact-types.md`, `templates/README.md`, `templates/{spec,AI-SPEC,user-setup,continue-here,milestone,retrospective,project,requirements,state,roadmap}.md`, `references/{api-coverage,skeleton-template,planning-config,doc-conflict-engine,planner-chunked,planner-graphify-auto-update,workstream-flag}.md`, `workflows/{review,spec-phase,pause-work,thread,plant-seed,spike,spike-wrap-up,session-report,milestone-summary,forensics,onboard,map-codebase,scan,audit-milestone,complete-milestone,settings,settings-integrations,explore,add-backlog,graduation,ui-review,quick-batch}.md`, `workflows/execute-phase/steps/code-review-disposition.md`, `bin/lib/{artifacts,secrets,state-contract,milestone-lock,workstream,onboard-projection,graphify,quick-batch,state}.cjs`.
- `~/.claude/agents/`: `gsd-codebase-mapper`, `gsd-code-fixer`, `gsd-eval-auditor`, `gsd-dom-verifier`, `gsd-intel-updater`, `gsd-doc-synthesizer`, `gsd-debugger`, `gsd-executor`.
- Labelore source: `src/web/views/{kinds,manifests,fallback}.ts`, `src/planning-repo/{discovery,naming,registry}.ts` and `handlers/`, `src/server/index.ts`, `src/web/components/search-field.tsx`. Discovery was executed against all 14 `.planning/` trees under `~/Work` (excluding `node_modules`, Labelore's `fixtures/` and `test/`) to produce the counts and statuses.
- Real files: `Ibis/resoundant/rhub/.planning/codebase/`, `Cinedise/studio-portal/.planning/{HANDOFF.json,WINDOWS.md}`, `Personal/duet/.planning/milestones/v1.0-phases/03-voice-video-calls/`, `Sideby/plan.sideby.me/.planning/milestones/v1.3-MILESTONE-AUDIT.md`, `Ibis/deid/qc-research/protocol-to-rules/.planning/{spikes,seeds}/`.
- Sibling research in this directory: STACK.md, ARCHITECTURE.md (Feature 1 to 6), PITFALLS.md (Pitfalls 4, 6 to 9, 15, 20, 31), GSD-DOMAIN.md.
- The user's earlier per-type rollout note (`obsidian-sync/Personal/Labelore/2026-09-21 Dashboard-style rollout plan.md`), used for batch ordering.

Web (confidence as marked in the tables):
- GitHub command palette: https://docs.github.com/en/get-started/accessibility/github-command-palette (HIGH)
- GitHub code search syntax: https://docs.github.com/en/search-github/github-code-search/understanding-github-code-search-syntax (HIGH)
- GitHub file viewing: https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files (HIGH)
- Linear search: https://linear.app/docs/search (HIGH)
- VS Code basics (search across files, folding): https://code.visualstudio.com/docs/editor/codebasics (HIGH)
- Raycast manual (search bar, action panel, aliases and hotkeys): https://manual.raycast.com/ (HIGH)
- WAI-ARIA combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ (HIGH)
- Sourcegraph code navigation (permalink, line wrap): https://5.11.sourcegraph.com/code-search/code-navigation/features (HIGH)
- cmdk library: https://github.com/pacocoursey/cmdk (MEDIUM; page did not state maintenance status; STACK.md already decided against it)
- Palette tutorials (activation, recents, fuzzy): playbooks.com and techinterview.org search results (MEDIUM, secondary)
- Project switcher: MCPJam inspector PR 3643, Nintex community thread, TYPO3 issue 11117, Drupal MR 6605 (LOW; no standard)
- Docs-site search grouping: not confirmed from a primary page (LOW)

Cached digests for five of the searches were stored through the research-store seam (confidence tiers from `classify-confidence`).

---
*Feature research for: Labelore v2.1 Wayfinding*
*Researched: 2026-10-25*
