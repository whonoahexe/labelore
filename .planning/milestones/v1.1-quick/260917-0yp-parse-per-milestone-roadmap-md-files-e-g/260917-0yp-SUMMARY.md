---
phase: quick-260917-0yp
plan: 01
subsystem: planning-repo
tags: [roadmap, milestone-archive, gsd-parsing, presentation]

# Dependency graph
requires: []
provides:
  - RoadmapHandler now also claims milestone-root vX.Y-ROADMAP.md snapshots, parsing them into flat structured.phases
  - assemble.ts merges per-milestone phase blocks into archived phases with field-level fallback to the root <details> group
  - project-presentation.ts's roadmapPhaseRecord() sources plan descriptions/formalPlanProgress from whichever roadmap source actually carries plan entries, per-milestone preferred, root looked up by canonical path
affects: [presentation/roadmap.ts, any future work reading archived-phase fields or plan descriptions]

# Actuals (#2632)
actuals:
  tokens: 9350
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promote-with-field-level-fallback merge (mergeRoadmapPhaseBlocks): a second, preferred-when-present data source wins per field only where it supplies a value, never whole-block replace"
    - "Ordered candidate-source list + first-source-with-actual-data selection (roadmapSources / roadmapPhaseRecord), reusable wherever a field can legitimately come from more than one artifact"

key-files:
  created: []
  modified:
    - src/planning-repo/handlers/roadmap.ts
    - src/planning-repo/assemble.ts
    - src/server/project-presentation.ts
    - test/handlers.test.ts
    - test/assemble.test.ts
    - test/server/project-presentation.test.ts
    - test/__golden__/dense.json

key-decisions:
  - "Field-level promote-with-fallback (not whole-block replace, not add-alongside): per-milestone block wins per field when it supplies a value, root <details> block fills what it leaves empty, and stays sole source when no per-milestone file exists — the only option that keeps a project with no per-milestone file byte-identical to today."
  - "plans and roadmapComplete are taken together as a pair from whichever block supplies a non-empty plans array (preferring the per-milestone file) — never merged field-by-field, since roadmapComplete is a derived summary of exactly the array it describes."
  - "Root roadmap now looked up by canonical .planning/ROADMAP.md path instead of first-artifact-with-kind-roadmap, since a per-milestone snapshot also carries kind: 'roadmap' and now carries structured phases too."

patterns-established:
  - "naming.ts stays the single grammar module for milestone filenames (parseMilestoneFileName) — both the handler dispatch check and the presentation-layer per-milestone artifact lookup import it rather than writing a second regex."

requirements-completed: [0YP-01, 0YP-02, 0YP-03, 0YP-04]

coverage:
  - id: D1
    description: "A per-milestone milestones/vX.Y-ROADMAP.md file parses through RoadmapHandler into flat structured.phases, not milestoneGroups"
    requirement: "0YP-01"
    verification:
      - kind: unit
        ref: "test/handlers.test.ts#claims a milestone-root vX.Y-ROADMAP.md ref and yields flat phases with empty milestoneGroups"
        status: pass
      - kind: unit
        ref: "test/handlers.test.ts#does not claim milestone-root REQUIREMENTS or MILESTONE-AUDIT files"
        status: pass
    human_judgment: false
  - id: D2
    description: "Archived phases source goal/depends-on/requirements/success-criteria from the per-milestone file with field-level fallback to the root block, including a phase number present only in the per-milestone file"
    requirement: "0YP-02"
    verification:
      - kind: unit
        ref: "test/assemble.test.ts#assembleDomainModel — per-milestone ROADMAP.md promotion (0YP)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Archived plan descriptions and formalPlanProgress source from whichever roadmap actually carries plan entries, per-milestone preferred; root roadmap looked up by canonical path; live phases unaffected"
    requirement: "0YP-03"
    verification:
      - kind: unit
        ref: "test/server/project-presentation.test.ts#sources archived plan descriptions and formalPlanProgress from the per-milestone file when the root checklist line is compacted and unparseable (0YP-03)"
        status: pass
      - kind: unit
        ref: "test/server/project-presentation.test.ts#falls back to the root file when only it supplies plan entries and the per-milestone file has none (0YP-03)"
        status: pass
      - kind: unit
        ref: "test/server/project-presentation.test.ts#resolves a live phase only against the root file, even when a per-milestone file exists for another version sharing the phase number (0YP-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Absent, empty, or malformed per-milestone files degrade to today's root-only behavior without throwing; full regression gate green with the dense golden regenerated"
    requirement: "0YP-04"
    verification:
      - kind: unit
        ref: "test/assemble.test.ts#degrades to the root-derived phase without throwing when the per-milestone file is %s (4 cases)"
        status: pass
      - kind: unit
        ref: "test/server/project-presentation.test.ts#presents without throwing when the root .planning/ROADMAP.md is absent entirely (0YP-03)"
        status: pass
      - kind: other
        ref: "npm test && npm run typecheck && npm run lint"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-17
status: complete
---

# Quick 260917-0yp: Parse per-milestone ROADMAP.md files for archived phases Summary

**Archived phases now source goal, depends-on, requirement IDs, success criteria, plan descriptions, and formal plan progress from `.planning/milestones/vX.Y-ROADMAP.md` snapshots, with field-level fallback to the root ROADMAP.md's compacted `<details>` block.**

## Performance

- **Duration:** ~12 min (three task commits between 01:06 and 01:10 local time)
- **Tasks:** 3/3 completed
- **Files modified:** 7

## Accomplishments

- `RoadmapHandler` now claims per-milestone `vX.Y-ROADMAP.md` files (in addition to the root `ROADMAP.md`), parsing them through the same line-scan into flat `structured.phases` — no `<details>` wrapper needed since a per-milestone snapshot has none.
- `assemble.ts` merges each archived phase's per-milestone block with the root `<details>` block via a new `mergeRoadmapPhaseBlocks()` implementing promote-with-field-level-fallback: the per-milestone file wins per field when it supplies a value, the root block fills whatever is left empty, and `plans`/`roadmapComplete` are taken together from whichever block supplies a non-empty checklist.
- The archived-phase loop and its roadmap-only pass now iterate the union of both sources' phase numbers, so a phase present only in a per-milestone file (with no directory and no root `<details>` entry) still produces a Phase.
- `project-presentation.ts`'s `roadmapPhaseRecord()` walks an ordered source list (per-milestone file, then root `<details>` group) and returns whichever actually supplies plan entries — fixing the real GSD shape where the root checklist is compacted to `- [x] v1.0 Phase 1: Bootstrap (4/4 plans) — completed ...`, which the plan-entry grammar never matched.
- The root roadmap artifact is now looked up by its canonical `.planning/ROADMAP.md` path rather than first-artifact-with-kind-roadmap, since per-milestone snapshots also carry `kind: 'roadmap'` and now carry structured phases too.
- `test/__golden__/dense.json` regenerated: the fixture's v1.0/v2.0 archived phases gain `dependsOnRaw`, `requirementIds`, and `successCriteria` (with unresolved `requirementRefs`, since those IDs live only in the per-milestone REQUIREMENTS snapshots); nothing else in the golden changed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Archived phases read their fields from the per-milestone ROADMAP.md, end to end** - `90e3941` (feat, tracer/tdd)
2. **Task 2: Archived plan descriptions and formal progress read from the per-milestone file** - `b704e14` (feat, tdd)
3. **Task 3: Regenerate the dense golden and clear the full regression gate** - `1076f46` (test)

## Files Created/Modified

- `src/planning-repo/handlers/roadmap.ts` - `RoadmapHandler.match` widened to also claim milestone-root `vX.Y-ROADMAP.md` files via `parseMilestoneFileName`; `parse()` unchanged
- `src/planning-repo/assemble.ts` - `mergeRoadmapPhaseBlocks()` added; per-milestone phase-block map built from `parsed`; archived loop and roadmap-only pass rewired to merge per-milestone + root sources
- `src/server/project-presentation.ts` - `roadmapPhaseRecord()` rewritten around an ordered `RoadmapSource[]` list (`roadmapSources()` + `findPhaseRecord()`); root roadmap looked up by canonical `ROOT_ROADMAP_PATH` constant
- `test/handlers.test.ts` - dispatch coverage for milestone-root `ROADMAP.md` claiming and `REQUIREMENTS`/`MILESTONE-AUDIT` non-claiming
- `test/assemble.test.ts` - promotion, field-level fallback, per-milestone-only phase number, directory-backed sourcing, no-per-milestone-file baseline, and four malformed/empty degradation cases
- `test/server/project-presentation.test.ts` - compacted-root-checklist promotion, root-only fallback, neither-source case, live-phase isolation, and absent-root-file safety
- `test/__golden__/dense.json` - regenerated; diff confined to the four expected kinds (structured maps populated, archived fields gained, unresolved requirementRefs added, nothing else)

## Decisions Made

- Promote-with-field-level-fallback over whole-block replace or add-alongside — recorded in the plan's `<assumption_delta_decision>` and implemented exactly as written (see `mergeRoadmapPhaseBlocks` in `src/planning-repo/assemble.ts`).
- `plans`/`roadmapComplete` are always taken as a pair from one source, never field-merged independently, since `roadmapComplete` only means something relative to the `plans` array it was derived from.
- Root roadmap lookup anchored to its canonical path (`.planning/ROADMAP.md`) rather than kind-based first-match, closing the "recorded consequence to watch" the plan flagged: per-milestone files now also carry structured phases, so a first-match-by-kind lookup would have become order-dependent.

## Deviations from Plan

None - plan executed exactly as written. One reasonable additive extension beyond the literal task text: `archivedVersions` in `assemble.ts` now also picks up milestone versions that exist solely via a per-milestone roadmap file (no directory, no root `<details>` group) — a natural completion of the "additive, never removes data" contract, purely additive and covered by the existing degradation tests showing no behavior change when such a file is absent.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Archived-phase rendering (`src/presentation/roadmap.ts`'s formal-vs-observed disagreement flag and any UI reading `PhaseDto`/`PlanDto`) now sees richer, more accurate archived-phase data with no interface change — no follow-up wiring required. Any future milestone-archive-adjacent work can rely on `naming.ts`'s `parseMilestoneFileName` as the single source for milestone-filename parsing, as this task did.

---
*Phase: quick-260917-0yp*
*Completed: 2026-09-17*

## Self-Check: PASSED

All 7 modified/created files verified present on disk; all 3 task commits (90e3941, b704e14, 1076f46) verified present in `git log --oneline --all`.
