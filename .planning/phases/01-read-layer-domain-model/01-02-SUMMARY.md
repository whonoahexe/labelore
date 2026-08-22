---
phase: 01-read-layer-domain-model
plan: 02
subsystem: fixtures
tags: [fixtures, test-data, gsd-domain, golden-snapshot]

requires:
  - phase: 01-read-layer-domain-model
    provides: "PlanningFilesystem boundary, PlanningRepository.load()/refresh(), sparse-empty fixture, npm run snapshot CLI + golden harness (plan 01-01)"
provides:
  - "sparse-started fixture — one phase, no history, zero warnings, one deliberate dangling requirement reference (D-10)"
  - "dense fixture — three milestones (v1.0/v2.0 archived, v3.0 active), an archived/live phase-01 collision spanning all three, full unfamiliar/invented artifact-type spread, open-map config.json, and three deliberately isolated corruptions (D-02)"
  - "fixtures/README.md — the D-01 traceability ledger and deliberate-defect register covering all three fixture trees"
affects: ["01-03", "01-04", "phase-04"]

actuals:
  tokens: 30651
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Fixture authorship traced line-by-line to gsd-core templates/bin-lib sources rather than to a real project (D-01), recorded in a dedicated traceability ledger"
    - "Deliberate corruption sits inside a healthy majority rather than isolated, so per-file isolation is meaningfully provable (D-02)"

key-files:
  created:
    - fixtures/sparse-started/.planning/PROJECT.md
    - fixtures/sparse-started/.planning/REQUIREMENTS.md
    - fixtures/sparse-started/.planning/ROADMAP.md
    - fixtures/sparse-started/.planning/STATE.md
    - fixtures/sparse-started/.planning/config.json
    - fixtures/sparse-started/.planning/phases/01-first-slice/01-CONTEXT.md
    - fixtures/sparse-started/.planning/phases/01-first-slice/01-01-PLAN.md
    - fixtures/dense/.planning/PROJECT.md
    - fixtures/dense/.planning/ROADMAP.md
    - fixtures/dense/.planning/REQUIREMENTS.md
    - fixtures/dense/.planning/STATE.md
    - fixtures/dense/.planning/MILESTONES.md
    - fixtures/dense/.planning/RETROSPECTIVE.md
    - fixtures/dense/.planning/BACKLOG.md
    - fixtures/dense/.planning/LEARNINGS.md
    - fixtures/dense/.planning/WINDOWS.md
    - fixtures/dense/.planning/config.json
    - fixtures/dense/.planning/estimation-calibration.json
    - fixtures/dense/.planning/v3.0-CAPACITY-PLAN.md
    - fixtures/dense/.planning/HANDOFF.json
    - fixtures/dense/.planning/phases/01-identity-slice/**
    - fixtures/dense/.planning/phases/02-transport-layer/**
    - fixtures/dense/.planning/milestones/**
    - fixtures/dense/.planning/quick/**
    - fixtures/dense/.planning/research/**
    - fixtures/dense/.planning/ui-reviews/.gitignore
    - fixtures/README.md
  modified: []

key-decisions:
  - "ROADMAP.md's per-phase plan checkboxes for dense's Phase 1 (identity-slice) stay unchecked even though both 01-01-SUMMARY.md and 01-02-SUMMARY.md exist — the deliberate roadmapComplete-vs-disk-status disagreement GSD-DOMAIN.md documents as a real, observed phenomenon in studio-portal"
  - "sparse-started's ROADMAP.md **Requirements** line lists SLICE-01, SLICE-02 (both real) plus SLICE-99 (deliberately absent from REQUIREMENTS.md) to satisfy both 'two requirement IDs that exist' and 'exactly one dangling reference' in the same line"
  - "config.json's open-map stress case (three-plus unknown keys, one nested two levels deep via telemetry.sampling.rate, parallelization in object form) lives entirely in the dense fixture per the plan's own instruction to keep sparse-started's config.json minimal"
  - "Recorded two entries in the project's own .planning/WINDOWS.md broken-windows ledger (ids 1-2, kind unrun-verify) for the cross-plan verification gap described below, but did not commit .planning/WINDOWS.md from this worktree — it is a shared, cross-phase artifact outside this plan's files_modified scope and outside git_commit_metadata's worktree-mode include list (alongside STATE.md/ROADMAP.md), and committing it risked a spurious merge conflict against the concurrently-running sibling plan 01-03's own worktree. The ledger entries are fully reproduced in prose below and in fixtures/README.md's Deliberate Defect Register."

patterns-established:
  - "Traceability ledger as a build rule (fixtures/README.md): every fixture file's shape cites a specific templates/ or bin/lib/ source, never a real project"

requirements-completed: [DATA-06, DATA-03]

coverage:
  - id: D1
    description: "sparse-started fixture: one phase, a ROADMAP.md, no milestones/quick/research, no SUMMARY.md, zero warnings, one deliberate dangling requirement reference"
    requirement: "DATA-06"
    verification:
      - kind: e2e
        ref: "npm run snapshot -- fixtures/sparse-started --stable (loadStatus.status: ok, warnings: [])"
        status: pass
      - kind: other
        ref: "test ! -d milestones && test ! -d quick && test ! -d research && test -f ROADMAP.md && test ! -f 01-01-SUMMARY.md"
        status: pass
      - kind: other
        ref: "grep -c '^### Phase 1:' ROADMAP.md == 1; grep -Ec '^\\*\\*(Goal|Depends on|Requirements|Success Criteria|Plans)\\*\\*' ROADMAP.md >= 5"
        status: pass
    human_judgment: false
  - id: D2
    description: "dense fixture healthy tree: three milestones with an archived/live phase-01 collision across all three, full identity-slice artifact spread (SPEC.md, AI-SPEC.md, invented 01-COST-MODEL.md), open-map config.json, quick/, research/ with .cache exclusion, ui-reviews/.gitignore — zero warnings before corruption"
    requirement: "DATA-03"
    verification:
      - kind: e2e
        ref: "npm run snapshot -- fixtures/dense --stable, end of Task 2 (loadStatus.status: ok, warnings: [])"
        status: pass
      - kind: other
        ref: "ls milestones | grep -c 'phases$' == 2; ls phases | wc -l == 2; three phase-01 directories all exist"
        status: pass
      - kind: other
        ref: "grep -c 'phase_numbering: restarts-per-milestone' STATE.md == 1"
        status: pass
      - kind: other
        ref: "python3 -c \"assert isinstance(config['parallelization'], dict)\"; config.telemetry.sampling.rate survives in snapshot.project.config unchanged"
        status: pass
      - kind: other
        ref: "test -f 01-SPEC.md 01-AI-SPEC.md 01-COST-MODEL.md v3.0-CAPACITY-PLAN.md; head -1 01-AI-SPEC.md is not '---'; test -f research/.cache/deadbeef.json; ls quick matches quick-id grammar (2 dirs)"
        status: pass
      - kind: unit
        ref: "grep -Ec '^\\s+- id: D[0-9]' 01-01-SUMMARY.md >= 2 (D1/D2 coverage ids colliding visually with D-NN decision ids)"
        status: pass
      - kind: e2e
        ref: "snapshot JSON contains the substrings 01-COST-MODEL.md / 01-AI-SPEC.md / 01-SPEC.md / v3.0-CAPACITY-PLAN.md, per the task's own automated <verify>"
        status: fail
    human_judgment: true
    rationale: "The task's automated <verify> checks the snapshot's raw JSON string for four filenames. v3.0-CAPACITY-PLAN.md (root-level) passes today. The three phase-nested filenames (01-SPEC.md, 01-AI-SPEC.md, 01-COST-MODEL.md) do not appear anywhere in the JSON today because src/planning-repo/assemble.ts's assembleDomainModel still scopes project.artifacts to root-level files only (plan 01-01's documented tracer scope) — the files are correctly authored on disk (confirmed by the passing file-existence checks above) but the domain-model assembly step that would surface them in the snapshot is explicitly plan 01-03's job (01-03-PLAN.md's own acceptance criteria and read_first list name src/planning-repo/assemble.ts and its 'whole graph' extension directly). 01-03 runs concurrently in a sibling worktree in the same wave and is out of this plan's files_modified scope. This is a documented, expected cross-plan sequencing gap (see fixtures/README.md's Deliberate Defect Register closing note), not a fixture defect — it resolves automatically once 01-03 merges, with no further changes needed to this fixture."
  - id: D3
    description: "dense fixture corruption: three deliberate defects isolated inside the healthy tree (tab-broken YAML, trailing-comma JSON, frontmatter-with-no-body), plus fixtures/README.md's full traceability ledger and defect register"
    requirement: "DATA-06"
    verification:
      - kind: e2e
        ref: "npm run snapshot -- fixtures/dense --stable after Task 3 (loadStatus.status: ok — corruption degrades, does not fail the load)"
        status: pass
      - kind: unit
        ref: "warnings[] contains exactly one entry: {path: '.../02-01-PLAN.md', stage: 'frontmatter', salvage: 'body intact, frontmatter unavailable'}; no warning names 01-VERIFICATION.md; no warning names any file other than 02-01-PLAN.md/HANDOFF.json"
        status: pass
      - kind: other
        ref: "grep -Pc '^\\t' 02-01-PLAN.md >= 1; python3 -c \"json.load(open('HANDOFF.json'))\" exits nonzero"
        status: pass
      - kind: other
        ref: "fixtures/README.md >= 60 lines (188), one row per file across all three trees, every 'shape traced to' cell names a templates/ or bin/lib/ source; ! grep -rq studio-portal test/ src/"
        status: pass
      - kind: e2e
        ref: "dense snapshot reports a stage:structured-extraction warning naming HANDOFF.json, and --with-bodies shows a non-empty body for 02-01-PLAN.md"
        status: fail
    human_judgment: true
    rationale: "The trailing-comma corruption in HANDOFF.json is real and confirmed (json.load exits nonzero on it), but no warning is produced for it today because no JSON-validating handler exists yet for HANDOFF.json outside config.json's own hand-rolled path in assemble.ts (which itself has no warning hook). The stage:structured-extraction warning this task calls for is exactly what plan 01-03's json-config.ts handler adds — 01-03-PLAN.md's own acceptance criteria name this exact fixture file ('A HANDOFF.json with a trailing comma yields a warning at stage structured-extraction'). Likewise --with-bodies cannot show a body for 02-01-PLAN.md because it is not root-level (see D2's rationale — same assembleDomainModel scope gap). Both are documented, expected cross-plan gaps that resolve once 01-03 merges; two entries were recorded in the project's own .planning/WINDOWS.md ledger (ids 1-2, kind unrun-verify) to keep them visible, though that file was not committed from this worktree (see key-decisions)."

duration: 18min (per commit timestamps; actual working time across research and authorship was substantially longer)
completed: 2026-08-22
status: complete
---

# Phase 1 Plan 2: Fixture Corpus — Sparse-Started & Dense Summary

**Three-milestone adversarial `.planning/` tree with a colliding phase-01 across all three milestones, unfamiliar and invented artifact types, an open-map `config.json`, and three deliberately isolated corruptions — plus a one-phase no-history sparse variant and a 188-line traceability ledger tracing every fixture file to a `gsd-core` template or source line.**

## Performance

- **Duration:** ~18 min per commit timestamps (see `actuals.tokens` for a size-based effort proxy; the file count and cross-referencing work substantially exceeded a normal 18-minute plan)
- **Started:** 2026-08-22T16:10:25Z (approx.)
- **Completed:** 2026-08-22T16:28:20Z
- **Tasks:** 3
- **Files modified:** 61 fixture files + `fixtures/README.md` (62 total)

## Accomplishments

- Authored `fixtures/sparse-started/` — a project with a roadmap and one planned phase but no execution
  history: no `milestones/`, no `quick/`, no `research/`, no `SUMMARY.md`. Loads with `loadStatus.status:
  ok` and zero warnings. Carries one deliberate dangling requirement reference (`SLICE-99`) per D-10 —
  normal-path data, never a warning.
- Authored the healthy majority of `fixtures/dense/` — three milestones (`v1.0`, `v2.0` archived; `v3.0`
  active), an archived/live phase-number collision at `01` spanning all three milestones
  (`phases/01-identity-slice/`, `milestones/v2.0-phases/01-legacy-ingest/`,
  `milestones/v1.0-phases/01-bootstrap/`), a full artifact spread for `phases/01-identity-slice/`
  including `01-SPEC.md`, `01-AI-SPEC.md` (no frontmatter), and the genuinely invented
  `01-COST-MODEL.md`, an open-map `config.json` exercising DATA-03 hard (object-form
  `parallelization`, three-plus unknown keys including `telemetry.sampling.rate` nested two levels deep
  inside an unknown namespace — confirmed to survive the round trip unchanged), a two-quick-task
  `quick/` tree, a `research/` tree with a visible `.cache/` exclusion, and `ui-reviews/.gitignore`.
  Confirmed `loadStatus.status: ok` with zero warnings at the end of this task.
- Introduced the three D-02 corruptions inside the dense tree: a tab-indented YAML key in
  `02-01-PLAN.md` (confirmed live: produces exactly one `stage: frontmatter` warning naming the file,
  body intact), a trailing comma in `HANDOFF.json` (confirmed: `json.load` exits nonzero), and
  `01-VERIFICATION.md` rewritten to carry valid frontmatter with no body at all (confirmed: produces
  zero warnings — an empty body is correctly not mistaken for a parse failure).
- Wrote `fixtures/README.md` — a 188-line traceability ledger with a preamble stating the four things a
  reader needs and cannot infer (D-01 provenance, D-04's `~/studio-portal` smoke-only scope quoted
  verbatim, D-02's permanent dense-tree warning, D-10's dangling reference), a per-tree table (one row
  per file across all three trees, every "shape traced to" cell naming a `templates/` or `bin/lib/`
  source), and a closing Deliberate Defect Register naming each corruption's exact nature and expected
  warning stage — including an explicit note on the cross-plan dependency documented below.

## Task Commits

Each task was committed atomically:

1. **Task 1: `sparse-started` fixture — structure without history** - `4b9f2a5` (feat)
2. **Task 2: `dense` fixture — three milestones, unfamiliar artifact types, open-map config** - `8afb04d` (feat)
3. **Task 3: Deliberate corruption inside the dense tree, and the traceability ledger** - `1a41298` (feat)

**Plan metadata:** committed in this SUMMARY's own commit (worktree mode — STATE.md/ROADMAP.md excluded, orchestrator syncs centrally after merge).

## Files Created/Modified

- `fixtures/sparse-started/.planning/` (7 files) - One-phase, no-history fixture tree
- `fixtures/dense/.planning/` (54 files across root, `phases/`, `milestones/`, `quick/`, `research/`, `ui-reviews/`) - Three-milestone adversarial fixture tree
- `fixtures/README.md` - The D-01 traceability ledger and D-02 deliberate-defect register

## Decisions Made

See `key-decisions` in frontmatter. Summary: the dense ROADMAP's Phase 1 plan checkboxes were
deliberately left unchecked despite both plans having summaries (the `roadmapComplete`-vs-disk-status
disagreement); the sparse-started `**Requirements**` line packs both the "two real IDs" and "one
dangling ID" instructions into a single three-ID line; the config.json open-map stress case was
concentrated entirely in the dense fixture per the plan's own instruction to keep sparse-started's
config minimal; and two `.planning/WINDOWS.md` ledger entries were recorded but not committed from
this worktree (shared cross-phase artifact, out of scope, risk of merge conflict with the concurrent
sibling plan).

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing-critical-functionality, or blocking issues were found or fixed during this
plan's own execution. Every file this plan produces matches the plan's `<action>` instructions exactly.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None. The plan was executed exactly as written; see "Issues Encountered" below for
a documented (not auto-fixed) cross-plan verification gap that is out of this plan's scope to resolve.

## Issues Encountered

**Cross-plan verification gap (not a fixture defect, not fixed here — out of scope).** A subset of
Task 2's and Task 3's acceptance criteria assert facts about `snapshot.project.artifacts` for
phase-nested files (e.g. "the snapshot JSON contains an artifact entry for `01-COST-MODEL.md` with
`kind: 'unknown'`") and about a `stage: structured-extraction` warning for `HANDOFF.json`'s trailing
comma. Both currently read as **fail** against this worktree's HEAD, because:

1. `src/planning-repo/assemble.ts`'s `assembleDomainModel` still scopes `project.artifacts` to
   root-level files only — plan `01-01`'s documented, intentional tracer scope ("this task populates
   only the root-document slice"). Extending it to the full graph (`phases/`, `milestones/`, `quick/`)
   is explicitly plan `01-03`'s job — its own `PLAN.md` names `src/planning-repo/assemble.ts` in its
   `<files>` list and states "Fill in `assembleDomainModel` so it produces the whole graph rather than
   the tracer's root-document slice."
2. No typed JSON handler exists yet for `HANDOFF.json` outside `config.json`'s own hand-rolled,
   warning-free path in `assemble.ts`. Plan `01-03` adds exactly this handler
   (`src/planning-repo/handlers/json-config.ts`) and its own acceptance criteria literally reference
   this fixture's `HANDOFF.json` corruption: *"A `HANDOFF.json` with a trailing comma yields a warning
   at stage `structured-extraction`."*

Plan `01-03` runs concurrently in a sibling worktree in the same wave (wave 2), depends on the same
`01-01` base this plan does, and is out of this plan's `files_modified` scope (`fixtures/` only) —
modifying `src/planning-repo/assemble.ts` or adding a JSON handler here would duplicate or conflict
with that concurrently-running work. This fixture's own files are verified correct against every
acceptance criterion checkable without those two upstream extensions (confirmed by direct file-system
checks, YAML/JSON parse probes, and every warning-generation check that does not require
`assembleDomainModel`'s scope or a JSON handler). Plan `01-04` (wave 3) depends on both `01-02` and
`01-03` and is the natural point where the full phase-level `<verification>` claims resolve together.
Two entries were recorded in the project's own `.planning/WINDOWS.md` ledger (ids 1-2, kind
`unrun-verify`) to keep this visible across sessions; see `fixtures/README.md`'s closing note for the
same information committed alongside the fixture itself.

No other issues encountered.

## Known Stubs

None. Every file in both fixture trees is complete, intentional content per the plan's `<action>`
instructions — nothing here is a stand-in for later work. The one asterisk is the cross-plan
verification gap documented above, which is not a stub in the fixture (the fixture files are complete
and correct) but a downstream consumer (`assembleDomainModel`, a JSON handler) that has not yet landed
in this worktree.

## Threat Flags

None. This plan's `<threat_model>` names four threats (T-01-08 symlink escape, T-01-02 DoS via the
deliberate corruptions, T-01-09 credential/path leakage, T-01-10 config prototype-pollution surface),
all already mitigated by plan `01-01`'s guarded parsing and by this plan's own construction (no
symlinks: confirmed by `find fixtures -type l` returning nothing; no `__proto__`/`constructor`/
`prototype` key names introduced into `config.json`; no real credential or path copied from
`~/studio-portal`, confirmed by `! grep -rq studio-portal test/ src/`). No new security-relevant
surface was introduced beyond what the plan's own threat model already accounts for.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Three fixture trees (`sparse-empty` from `01-01`, `sparse-started` and `dense` from this plan) are
  now available for plan `01-03`'s typed-handler test suite and plan `01-04`'s decision-mention scanner,
  and for Phase 4's degradation claims downstream.
- `fixtures/README.md` is the single source of truth for "does this fixture shape trace to a real GSD
  contract" — future fixture additions should extend this ledger rather than skip it.
- **Blocker for full phase-level `<verification>` closure (not a blocker for `01-03` or `01-04` to
  proceed):** the phase-nested-artifact and structured-extraction-warning claims in this plan's own
  `<verification>` section will only fully pass once plan `01-03` merges (`assembleDomainModel`'s
  full-graph extension and the `json-config.ts` handler). This is expected, tracked in
  `.planning/WINDOWS.md` (ids 1-2) and in `fixtures/README.md`'s Deliberate Defect Register, and
  requires no further action from this plan.

---
*Phase: 01-read-layer-domain-model*
*Completed: 2026-08-22*

## Self-Check: PASSED

All key files verified present on disk (`fixtures/sparse-started/.planning/**`,
`fixtures/dense/.planning/**`, `fixtures/README.md`). All three task commits (`4b9f2a5`, `8afb04d`,
`1a41298`) verified present in `git log --oneline`. `npm run snapshot -- fixtures/sparse-empty --stable`,
`npm run snapshot -- fixtures/sparse-started --stable`, and `npm run snapshot -- fixtures/dense --stable`
all re-run and confirmed `loadStatus.status: ok` (zero warnings for the first two, one `stage:
frontmatter` warning naming `02-01-PLAN.md` for the dense tree). `npm test` re-run: 12/12 passing
(unaffected by this plan's fixtures-only changes). `find fixtures -type l` and
`grep -rq "studio-portal" test/ src/` both confirmed empty/no-match.
