---
phase: 01-read-layer-domain-model
plan: 03
subsystem: read-layer
tags: [typescript, vitest, gray-matter, parsing, domain-model, tdd]

requires:
  - phase: 01-read-layer-domain-model (plan 01)
    provides: "PlanningFilesystem boundary, PlanningRepository.load()/refresh(), the LoadStatus contract, the GSD-agnostic domain model skeleton, normalizeForGolden, the CLI+golden-suite harness, and the sparse-empty fixture — all extended, none rebuilt, by this plan"
provides:
  - "src/planning-repo/naming.ts — the full GSD filename/directory grammar (phase dirs, plan/summary files, phase artifacts, quick-task dirs and artifacts, milestone files/dirs, comparePhaseNumbers, isCanonicalRootFile), every regex cited to its gsd-core/bin/lib source symbol"
  - "Position-aware discovery: every ArtifactRef now carries location, phaseIdentity, milestoneVersion, and quickTaskId, derived from filename and directory position alone (DATA-02)"
  - "10 typed ArtifactHandlers (state, roadmap, requirements, project, plan, summary, context, frontmatter-only, json-config, windows) registered ahead of the still-unconditional GenericMarkdownHandler"
  - "assembleDomainModel now builds the whole milestone-qualified graph: Milestone/Phase/Plan/PlanSummary/Requirement/QuickTask entities, phase identity scoped by (milestoneVersion, projectCode, number) never number alone"
  - "roadmapComplete and diskStatus as two independently-populated Phase fields, documented to legitimately disagree"
affects: ["01-04", "phase-02", "phase-03", "phase-04"]

actuals:
  tokens: 30197
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "naming.ts is the single grammar module — every filename/directory regex lives there, cited to its gsd-core/bin/lib source symbol; discovery.ts and the handlers consume its parse functions, never declaring their own filename regexes"
    - "Handler dispatch is filename+location only (ArtifactRef.match never receives content) — enforced by an acceptance-criteria grep over the whole handlers/ directory"
    - "Line-scanning markdown structure helpers (splitByHeadingLevel, parseMarkdownTable, parseChecklistItems) shared across handlers instead of one big per-document regex — avoids catastrophic backtracking (T-01-11) and keeps each handler's structured-extraction independently testable"
    - "ArtifactHandler.parse() returns an optional `structured` bag alongside the universal frontmatter/body/title shape — carries handler-specific structured fields (roadmap phase blocks, requirements items, context's six tag sections) without widening the base Artifact contract for types that don't need it"
    - "Phase identity is always the compound (milestoneVersion, projectCode, number) — phaseGroupKey() and phaseNumbersEqual() are the only two places a phase is ever looked up or grouped, and neither uses raw phase-number string equality without going through comparePhaseNumbers"

key-files:
  created:
    - src/planning-repo/naming.ts
    - src/planning-repo/handlers/index.ts
    - src/planning-repo/handlers/state.ts
    - src/planning-repo/handlers/roadmap.ts
    - src/planning-repo/handlers/requirements.ts
    - src/planning-repo/handlers/project.ts
    - src/planning-repo/handlers/plan.ts
    - src/planning-repo/handlers/summary.ts
    - src/planning-repo/handlers/context.ts
    - src/planning-repo/handlers/frontmatter-only.ts
    - src/planning-repo/handlers/json-config.ts
    - src/planning-repo/handlers/windows.ts
    - src/planning-repo/handlers/markdown-sections.ts
    - src/planning-repo/handlers/artifact-token.ts
    - src/planning-repo/handlers/title.ts
    - test/naming.test.ts
    - test/discovery.test.ts
    - test/handlers.test.ts
    - test/assemble.test.ts
  modified:
    - src/planning-repo/discovery.ts (position-aware classification, exclusion path+reason, deterministic sort)
    - src/planning-repo/types.ts (ArtifactRef/DiscoveryExclusion/ParsedArtifact/ArtifactHandler extended)
    - src/planning-repo/registry.ts (simplified to parseWithRegistry; HANDLERS moved to handlers/index.ts; structured field carried through)
    - src/planning-repo/assemble.ts (full milestone-qualified graph assembly, replacing the root-document-only tracer slice)
    - src/domain/model.ts (Artifact.structured; Phase/Milestone/Plan/PlanSummary/Requirement/QuickTask reshaped)
    - test/__golden__/sparse-empty.json (regenerated — typed handler dispatch + populated requirements)

key-decisions:
  - "CK-02.1-urgent-fix's expected phase number is '02.1' (leading zero preserved, matching literal 'as written' input), not the plan behavior text's '2.1' — phase numbers are kept as strings throughout with no reformatting anywhere in naming.ts, and the plan's own general statement ('2.1 and 12A are legitimate') is a value example, not a leading-zero-stripping instruction. Resolved this way since I authored both the parser and its test, and both surrounding clauses ('kept exactly as written' / 'never reformatted') point the same direction."
  - "A symlink cycle cannot be genuinely reproduced through InMemoryPlanningFilesystem (a flat path→content map has no symlink semantics), so its covering test simulates the same failure mode discovery guards against via a runaway walk depth past MAX_WALK_DEPTH — the identical termination mechanism a real inside-tree symlink loop trips one layer below, via node:fs's own ELOOP."
  - "Discovery attempts phase-dir parsing in sequential mode only (never reads config.phase_naming) — config.json is itself an undiscovered artifact at discovery time (chicken-and-egg), and sequential is confirmed the default and only mode in both real projects GSD-DOMAIN.md sampled. parsePhaseDirName's own mode parameter and custom-mode test remain fully exercised in naming.test.ts independent of this pragmatic discovery-time default."
  - "ROADMAP.md phase headings are commonly written non-zero-padded ('### Phase 1: ...') while their matching directory is zero-padded ('phases/01-slug/') — phase-block-to-directory matching in assemble.ts goes through comparePhaseNumbers (dotted-numeric equality) rather than strict string equality, or every real project's directory-derived phase would silently fail to pick up its ROADMAP-derived goal/successCriteria/roadmapComplete fields. Caught by assemble.test.ts's roadmapComplete-vs-diskStatus disagreement test."
  - "normalizeForGolden's existing body-omission rule (strip any key literally named 'body', not just Artifact.body) also strips MarkdownSection.body inside a handler's structured bag by the same mechanism. Kept deliberately rather than renamed — it generalizes D-06's 'omit prose by default, restore under --with-bodies' intent to every nested prose blob, verified manually that --with-bodies restores it."
  - "requirements: [] in test/__golden__/sparse-empty.json is now correctly non-empty (2 items from the fixture's own FIX-01/FIX-02) — Task 3's acceptance criterion literally says the golden should show 'empty arrays... for milestones, phases, quick tasks, and requirements', but the fixture's REQUIREMENTS.md genuinely has two parseable requirement items, and both Task 2's RequirementsHandler and Task 3's own action text ('Assemble Requirement entities from the requirements handler's items') require extracting them. Populating requirements correctly is the objectively more complete and correct outcome per the phase's own success criteria; the criterion's specific mention of 'requirements' alongside the genuinely-empty collections is treated as imprecise phrasing rather than a literal instruction to suppress real, present data."

patterns-established:
  - "Grammar/dispatch/structure separation: naming.ts owns filename+directory grammar, handlers/*.ts own per-type structured extraction, assemble.ts owns cross-artifact resolution into the domain graph — no layer re-derives what an earlier layer already computed."
  - "phaseGroupKey()/phaseNumbersEqual() as the only two phase-identity comparison points in assemble.ts, both routed through comparePhaseNumbers rather than raw string equality."

requirements-completed: [DATA-02, DATA-03]

coverage:
  - id: D1
    description: "GSD's real filename and directory grammar is transcribed into naming.ts, one module, every expression cited to a gsd-core source symbol; discovery classifies every file by position (root/phase/archived-phase/quick/milestone-root/research/other) as well as filename."
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "test/naming.test.ts (18 cases, all five parse functions + comparePhaseNumbers + isCanonicalRootFile)"
        status: pass
      - kind: unit
        ref: "test/discovery.test.ts (14 cases, position classification + exclusions + empty input + deterministic ordering)"
        status: pass
      - kind: other
        ref: "grep -c naming src/planning-repo/discovery.ts >= 1; ! grep -q 'new RegExp' src/planning-repo/discovery.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every discovered artifact — including an unrecognized filename token — survives as a base Artifact with kind:'unknown', never dropped, and dispatch never consults file content."
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "test/handlers.test.ts#matches a ref no typed handler recognizes with the unconditional GenericMarkdownHandler, registered last"
        status: pass
      - kind: unit
        ref: "test/handlers.test.ts#dispatch is unaffected by frontmatter presence or absence (DATA-02)"
        status: pass
      - kind: other
        ref: "! grep -rqE \"match *\\([^)]*(content|raw|body)\" src/planning-repo/handlers"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ten typed handlers (state, roadmap, requirements, project, plan, summary, context, frontmatter-only, json-config, windows) extract each artifact type's structured content — ROADMAP.md's per-phase blocks (goal/depends-on/requirements/success-criteria/plan-checklist) and milestone-grouped <details> form, REQUIREMENTS.md's items/out-of-scope/traceability, PLAN.md/SUMMARY.md's nested frontmatter with pseudo-XML body untouched, CONTEXT.md's six tag sections, WINDOWS.md's fenced-JSON-preferred rows."
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "test/handlers.test.ts (24 cases across all ten handlers plus registry-level dispatch/batch/same-token tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "config.json (and HANDOFF.json/estimation-calibration.json) is read as a fully open map — unknown keys at any nesting depth round-trip unchanged, a polymorphic field (parallelization) is preserved in whichever shape it arrives, and a prototype-named key never reaches an object prototype."
    requirement: "DATA-03"
    verification:
      - kind: unit
        ref: "test/handlers.test.ts#JsonConfigHandler (5 cases: nested-namespace round-trip, polymorphic parallelization, __proto__ stripping, empty object, HANDOFF.json trailing comma)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phase identity is the compound (milestoneVersion, projectCode, number) — a live phase and an archived phase sharing the same number remain two distinct Phase entries; roadmapComplete and diskStatus stay two independently-populated fields that can legitimately disagree."
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "test/assemble.test.ts#gives a live phase 01 and an archived phase 01 under a different milestone two entries whose identity.milestoneVersion differ"
        status: pass
      - kind: unit
        ref: "test/assemble.test.ts#carries both fields separately and lets them disagree"
        status: pass
      - kind: other
        ref: "! grep -rqE \"percentComplete|progressPercent|computeProgress|computedProgress\" src/planning-repo/assemble.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "assembleDomainModel produces the whole graph: a phase directory with no ROADMAP.md entry, a ROADMAP.md entry with no directory, an empty project, quick tasks cross-linked to STATE.md's authoritative table, and dual-channel warning identity are all correct — and it degrades to a well-formed Project (never null) when every input file failed to parse."
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "test/assemble.test.ts (12 cases total, covering milestone grouping, directory/roadmap mismatches, Plan/Summary pairing, quick tasks, warning identity, total-parse-failure survival, empty input, deterministic ordering)"
        status: pass
      - kind: e2e
        ref: "npm run snapshot -- fixtures/sparse-empty --stable"
        status: pass
    human_judgment: false
  - id: D7
    description: "Manual smoke test against the real ~/studio-portal reference project — exits 0, loadStatus ok, 2 milestones (v1.0/v2.0), 9 phases, 38 requirements, 5 quick tasks, and exactly 2 warnings (both genuine isolated YAML frontmatter parse failures in real SUMMARY.md files, correctly degraded rather than crashing the whole load)."
    verification: []
    human_judgment: true
    rationale: "D-04 scopes this as a manual smoke target with zero committed assertions — automation ran it this session and it produced a plausible, non-crashing, non-empty result against real-world scale and messiness, but the plan reserves final judgment for a human per its own design."

duration: ~40min
completed: 2026-08-22
status: complete
---

# Phase 1 Plan 3: The Real Domain Model — Typed Handlers and Milestone-Qualified Assembly Summary

**The tracer's single generic-handler pipeline is replaced by GSD's real domain model: a one-module naming grammar transcribed from gsd-core's own runtime code, position-aware discovery, ten typed artifact handlers dispatching on filename+location alone, and a milestone-qualified assembly pass where phase identity is always `(milestoneVersion, projectCode, number)` — verified against both a synthetic fixture and a real 234-file, two-milestone, 9-phase project.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-08-22T16:03Z (approx.)
- **Completed:** 2026-08-22T16:38Z
- **Tasks:** 3
- **Files modified:** 25 (19 created, 6 modified)

## Accomplishments

- `src/planning-repo/naming.ts` — every GSD filename/directory regex (phase dirs, plan/summary files, phase artifacts, quick-task dirs and artifacts, milestone files/dirs) transcribed from `gsd-core/bin/lib/phase-id.cjs`, `init.cjs`, `artifacts.cjs`, and `core-utils.cjs`, each expression cited in a comment to its source symbol. `comparePhaseNumbers` implements dotted-numeric ordering with a letter-suffix tiebreak; `isCanonicalRootFile` transcribes `artifacts.cjs`'s exact-set-union-pattern check.
- Discovery is now position-aware: every `ArtifactRef` carries `location` (root/phase/archived-phase/quick/milestone-root/research/other), `phaseIdentity`, `milestoneVersion`, and `quickTaskId`, all derived from filename and directory position alone — never content. A runaway walk depth guards against a pathological/cyclic tree (the practical stand-in for a true symlink cycle, which the in-memory filesystem port has no way to genuinely model). Exclusions now carry a `{path, reason}` pair instead of a bare path string.
- Ten typed handlers — `state`, `roadmap`, `requirements`, `project`, `plan`, `summary`, `context`, `frontmatter-only` (VALIDATION/SECURITY/UI-SPEC/UAT/VERIFICATION/LEARNINGS), `json-config` (config.json/HANDOFF.json/estimation-calibration.json), `windows` — registered ahead of the still-unconditionally-matching `GenericMarkdownHandler`. Each `match()` inspects only `ArtifactRef` filename and location, confirmed by an acceptance-criteria grep across the whole `handlers/` directory that finds zero `match()` functions receiving document text.
- `RoadmapHandler` extracts per-phase blocks (`goal`, raw `dependsOn`, `requirementIds` — brackets optional — `successCriteria`, plan checklist with checked state) via a single linear line-scan (never a whole-document regex, guarding against T-01-11's catastrophic-backtracking risk), detects the milestone-grouped `<details>`/`<summary>` form, and keeps the ASCII dependency-shape block verbatim, never arrow-parsed.
- `assembleDomainModel` now builds the whole graph instead of the tracer's root-document slice: `Milestone`/`Phase`/`Plan`/`PlanSummary`/`Requirement`/`QuickTask` entities, phase identity always the compound `(milestoneVersion, projectCode, number)`, `roadmapComplete` and `diskStatus` kept as two independently-populated fields, a phase visible whether it exists only in `ROADMAP.md`, only as a directory, or both, and the dual warning channel (flat list + per-artifact) sharing object identity from one `WarningCollector`.
- Regenerated and reviewed `test/__golden__/sparse-empty.json`: `PROJECT.md`/`STATE.md`/`REQUIREMENTS.md` now dispatch to their typed handlers (structured sections, key decisions, quick-tasks table, requirement items) instead of the generic fallback, and `requirements: []` is correctly now populated with the fixture's two `FIX-*` items.
- Ran the plan's own manual smoke test against `~/studio-portal` (a real 234-file, two-milestone, 9-phase project): exits 0, `loadStatus.status: "ok"`, correctly resolved both milestones, all 9 phases, 38 requirements, 5 quick tasks, and exactly 2 warnings — both genuine, isolated YAML frontmatter failures in real `SUMMARY.md` files that degraded gracefully instead of crashing the load.

## Task Commits

Each task followed RED → GREEN discipline (test commit, then implementation commit):

1. **Task 1 RED: naming/discovery tests** — `0177c25` (test)
2. **Task 1 GREEN: naming.ts + position-aware discovery.ts** — `6d4ec07` (feat)
3. **Task 2 RED: handler registry tests** — `5080027` (test)
4. **Task 2 GREEN: ten typed handlers + registry.ts** — `e456eae` (feat)
5. **Task 3 RED: assemble.ts tests** — `e536e77` (test)
6. **Task 3 GREEN: milestone-qualified assembly + regenerated golden** — `a6a586f` (feat)
7. **Traceability doc fix (no behavior change)** — `08ca7f7` (docs)
8. **Additional must_haves coverage tests** — `d60403c` (test)

## Files Created/Modified

- `src/planning-repo/naming.ts` — the single grammar module; five parse functions, `comparePhaseNumbers`, `isCanonicalRootFile`, plus `parseMilestonePhasesDirName`/`parseQuickArtifactName`
- `src/planning-repo/discovery.ts` — position-aware `ArtifactRef` classification, `{path, reason}` exclusions, deterministic sort
- `src/planning-repo/types.ts` — `ArtifactRef`/`ArtifactLocation`/`DiscoveryExclusion`/`ParsedArtifact`/`HandlerParseResult`/`ArtifactHandler` extended for the richer contract
- `src/planning-repo/registry.ts` — simplified to `parseWithRegistry`; carries the new `structured` field through
- `src/planning-repo/handlers/{state,roadmap,requirements,project,plan,summary,context,frontmatter-only,json-config,windows}.ts` — the ten typed handlers
- `src/planning-repo/handlers/{index,markdown-sections,artifact-token,title}.ts` — the ordered registry and shared parsing helpers
- `src/planning-repo/assemble.ts` — full milestone-qualified graph assembly
- `src/domain/model.ts` — `Artifact.structured`; `Phase`/`Milestone`/`Plan`/`PlanSummary`/`Requirement`/`QuickTask` reshaped
- `test/naming.test.ts`, `test/discovery.test.ts`, `test/handlers.test.ts`, `test/assemble.test.ts` — 68 new test cases total
- `test/__golden__/sparse-empty.json` — regenerated

## Decisions Made

See `key-decisions` in frontmatter for full rationale on each. In brief: preserved the leading zero in `CK-02.1-urgent-fix`'s phase number per the "kept as strings, never reformatted" principle (a minor internal inconsistency in the plan's own behavior-block prose, resolved in favor of the more general, repeated instruction); simulated a symlink cycle via walk-depth truncation since `InMemoryPlanningFilesystem` cannot model real symlinks; matched ROADMAP.md phase numbers to directory names via `comparePhaseNumbers` rather than strict string equality, since real ROADMAP.md headings are commonly non-zero-padded while directories are zero-padded; populated `sparse-empty`'s `requirements` array correctly (non-empty) despite one acceptance criterion's imprecise wording, since two other explicit instructions in the same plan require it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `naming.ts` had no quick-task artifact filename grammar**
- **Found during:** Task 2 (writing `ContextHandler`/`FrontmatterOnlyHandler`, which must dispatch on quick-task-scoped `{quickId}-ARTIFACT.md` files without an inline regex of their own)
- **Issue:** Task 1's `naming.ts` covered phase-scoped `{phase}-ARTIFACT.md` but not the quick-task variant (`{quickId}-ARTIFACT.md`, e.g. `260726-unp-CONTEXT.md`) that GSD-DOMAIN.md's own research documents as using "the same grammar... but keyed on the full quickId". Without it, Task 2's handlers would have needed their own inline regex, violating "naming.ts is the single grammar module."
- **Fix:** Added `parseQuickArtifactName` to `naming.ts`, and wired `discovery.ts`'s `deriveKind` to use it for quick-scoped files.
- **Files modified:** `src/planning-repo/naming.ts`, `src/planning-repo/discovery.ts`
- **Verification:** `test/naming.test.ts` implicitly exercised via `handlers/artifact-token.ts`'s quick-location branch in `test/handlers.test.ts`; full suite green
- **Committed in:** `e456eae` (Task 2 GREEN commit, documented inline)

**2. [Rule 1 - Bug] `StateHandler` never found the Quick Tasks Completed table**
- **Found during:** Task 3's `assemble.test.ts` quick-tasks test (RED phase — the table came back empty even with a matching row present)
- **Issue:** GSD-DOMAIN.md confirms `### Quick Tasks Completed` is nested one level inside `## Accumulated Context`, but `splitSections` only splits at the `##` level — the table was silently unreachable.
- **Fix:** Added `splitSubsections`/`splitByHeadingLevel` to `markdown-sections.ts`; `StateHandler` now searches one level deeper when the top-level section doesn't itself match.
- **Files modified:** `src/planning-repo/handlers/state.ts`, `src/planning-repo/handlers/markdown-sections.ts`
- **Verification:** `test/assemble.test.ts#assembles quick tasks from quick/ directories and attaches their STATE.md table row when present` passes
- **Committed in:** `a6a586f` (Task 3 GREEN commit)

**3. [Rule 1 - Bug] ROADMAP.md phase blocks never matched their directory when number formats differed**
- **Found during:** Task 3's `assemble.test.ts` roadmapComplete-vs-diskStatus test (RED phase — `roadmapComplete` came back `null` instead of `false`)
- **Issue:** `assemble.ts` matched a directory-derived `PhaseIdentity.number` ("01", zero-padded) against a `RoadmapPhaseBlock.number` ("1", as literally written in "### Phase 1: ...") via strict string equality — every real project whose ROADMAP.md doesn't zero-pad its phase headings would silently lose all roadmap-derived fields (goal, successCriteria, roadmapComplete) for every directory-backed phase.
- **Fix:** Added `phaseNumbersEqual()` (wraps `comparePhaseNumbers`) and used it for both the live and archived phase-block-to-group matching.
- **Files modified:** `src/planning-repo/assemble.ts`
- **Verification:** `test/assemble.test.ts#carries both fields separately and lets them disagree` passes; confirmed against the real `~/studio-portal` smoke test (phases correctly picked up their goals/success criteria)
- **Committed in:** `a6a586f` (Task 3 GREEN commit)

---

**Total deviations:** 3 auto-fixed (1 missing-critical-functionality, 2 real bugs caught by the plan's own RED-phase tests before reaching the golden/smoke-test checks).
**Impact on plan:** All three were necessary for correctness — without them, quick tasks would never link to their STATE.md status, and every real GSD project would silently lose roadmap-derived phase data. No scope creep beyond what the plan's own behavior/acceptance criteria already required.

## Issues Encountered

None beyond the deviations documented above.

## Known Stubs

None. `serialize.ts` was listed in `files_modified` but genuinely required no changes — `assembleDomainModel` already sorts every collection it returns (phases, milestones, plans) before returning, and none of the new fields (`phaseIdentity`, boolean flags, string arrays) are machine-varying, so `normalizeForGolden`'s existing path/mtimeMs/readAt/body handling covers everything without extension. This is a documented no-op, not an omission.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan `01-04` inherits a genuinely complete, milestone-qualified snapshot: `Requirement` entities, `RoadmapHandler`'s per-phase `requirementIds`, and `RequirementsHandler`'s traceability table are all present and ready for the cross-reference resolution `01-04` is scoped to do (this plan deliberately does not resolve `traceability` rows against phases — that is `01-04`'s task, per Task 3's own action text).
- The `structured` bag on `Artifact` (roadmap phase blocks, requirements items/out-of-scope/traceability, context's six tag sections, project's sections+key-decisions, state's sections+quick-tasks-table) is a stable, tested contract Phase 2's renderer and `01-04`'s ID-mention scanner can both build on directly.
- `parseWithRegistry`'s and `assembleDomainModel`'s path-keying discipline (never keying by derived `kind`/token) is proven by a dedicated test, which matters directly for `01-04`'s decision-mention index (NAV-07), which must key mentions by artifact path, not by kind.
- The real `~/studio-portal` smoke test succeeded end-to-end (2 milestones, 9 phases, 38 requirements, 5 quick tasks, 2 genuine and gracefully-degraded warnings) — a strong signal the parser generalizes beyond the synthetic fixtures, though per D-04 this remains a manual, non-committed check a human should still glance at.
- No blockers. `fixtures/sparse-started/` and `fixtures/dense/` (built by the sibling plan `01-02`, not yet merged into this worktree) will give this plan's typed handlers and milestone assembly their first adversarial exercise once plan `01-04` runs against them.

---
*Phase: 01-read-layer-domain-model*
*Completed: 2026-08-22*

## Self-Check: PASSED

All key files verified present on disk; all 8 commits (`0177c25`, `6d4ec07`, `5080027`, `e456eae`, `e536e77`, `a6a586f`, `08ca7f7`, `d60403c`) verified in git log; `npx tsc --noEmit`, `npx eslint .`, `npm test` (80/80), and `npm run snapshot -- fixtures/sparse-empty --stable` (exit 0, zero warnings) all re-verified passing after the final commit.
