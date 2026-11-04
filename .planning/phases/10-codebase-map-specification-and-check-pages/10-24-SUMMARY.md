---
phase: 10-codebase-map-specification-and-check-pages
plan: 24
subsystem: testing
tags: [fixtures, tidemark, codebase-map, made-up-examples]
status: complete

requires:
  - phase: 10-02
    provides: the made-up example marker rule and the index at test/fixtures/README.md
  - phase: 10-03
    provides: the concern-counting rule and the heading, stamp and fence findings
provides:
  - Tidemark, a made-up map-only fixture project (seven labelled map documents, a stray changelog, a README ledger)
  - Tidemark in RELATIVE_ROOTS, so every ALL_FIXTURE_ROOTS sweep covers a map-only root
  - per-section expected concern counts written in the Tidemark README for 10-05 to pin
affects: [10-05 codebase lifts, 10-08 codebase page, opening paths, browser specs]

actuals:
  tokens: 14500
  tasks: 2
  commits: 2
plan_head_before: 05ac39ca30ef28737d292e99b52c614c746cce1f
plan_head_after: 6ece753697b97ae843e169c2742dfb7d987f1d30
commits: 2

tech-stack:
  added: []
  patterns: [map-only fixture root, expected counts recorded per file in the fixture README]

key-files:
  created:
    - test/fixtures/tidemark/README.md
    - test/fixtures/tidemark/.planning/CHANGELOG-2026-10.md
    - test/fixtures/tidemark/.planning/codebase/STACK.md
    - test/fixtures/tidemark/.planning/codebase/ARCHITECTURE.md
    - test/fixtures/tidemark/.planning/codebase/STRUCTURE.md
    - test/fixtures/tidemark/.planning/codebase/INTEGRATIONS.md
    - test/fixtures/tidemark/.planning/codebase/CONVENTIONS.md
    - test/fixtures/tidemark/.planning/codebase/TESTING.md
    - test/fixtures/tidemark/.planning/codebase/CONCERNS.md
  modified:
    - test/helpers/fixture-roots.ts
    - test/fixtures/README.md

key-decisions:
  - "Expected CONCERNS counts follow the adjusted rule 10-03 recorded (bold-label groups count from one; a None or Not detected section counts 0), not the RESEARCH wording that needs two or more"
  - "No pin edits were needed: the three ALL_FIXTURE_ROOTS tests pass unchanged with Tidemark and labelore's fresh map"

requirements-completed: [VIEW-21, TGT-09, VIEW-13]

duration: 25min
completed: 2026-11-04
---

# Phase 10 Plan 24: Tidemark map-only fixture Summary

**Tidemark exists: a made-up harbour berth board whose `.planning/` holds only a seven-document codebase map and a stray changelog, with every hard map shape planted, labelled under the 10-02 rule, indexed, and covered by the fixture-root sweeps.**

## Accomplishments

- Seven map documents derived from the mapper templates. Six are stamped (the same 40-character commit `c4e91ab7...7d69`, containing letters) with two `last_mapped_at` dates, 2026-10-28 (STACK, INTEGRATIONS, TESTING) and 2026-10-30 (ARCHITECTURE, STRUCTURE, CONCERNS). CONVENTIONS is the older form: no frontmatter, a first-line comment marker, `**Analysis Date:**` and a `*Last updated:*` footer.
- Hard shapes: `Languages & Runtimes` heading (STACK), added `API Architecture` heading and a fenced diagram line starting `## ` (ARCHITECTURE), a four-level fenced tree and three `New ...:` groups (STRUCTURE), `TIDEMARK_TIDE_FEED_KEY=PLACEHOLDER-NOT-A-REAL-KEY` among three required variables (INTEGRATIONS), a bash fence with a one-hash comment before each of three commands (TESTING).
- CONCERNS has all nine sections of unequal length. Expected counts, written in the Tidemark README: Tech Debt 3, Known Bugs 1, Security 2, Performance 2 (`###` subsections), Fragile Areas 3 (plain bullets), Scaling Limits 2 (table rows), Dependencies at Risk 0 (None identified), Missing Critical Features 1, Test Coverage Gaps 0 (Not detected); sum 14.
- `test/fixtures/tidemark` added to `RELATIVE_ROOTS`; seven rows added to `test/fixtures/README.md`; the stray `CHANGELOG-2026-10.md` is not a rule kind and has no row.
- The Tidemark snapshot loads with status ok, seven codebase kinds and no ROADMAP.

## Gate results

- Task 1: `npm run test:gate -- test/made-up-examples.test.ts test/fixture-leak.test.ts test/recognition-kinds.test.ts test/presentation/route-table.test.ts` gave total=81 passed=81 failed=0 skipped=0 todo=0.
- Task 2: `npm run test:gate -- test` gave total=5431 passed=5431 failed=0 skipped=0 todo=0 (5428 at base plus three per-root cases). This was the first run that saw Tidemark and labelore's fresh map together.

## Pin edits

None. `test/recognition-kinds.test.ts`, `test/presentation/route-table.test.ts` and `test/presentation/review-ledger.test.ts` iterate `ALL_FIXTURE_ROOTS` and passed unchanged; no value changed because a root or files were added.

## Deviations from Plan

None - plan executed as written. Environment note: the worktree had no `node_modules`, so a git-ignored directory of per-entry symlinks to the main checkout's packages was created; nothing was installed. The `git check-ignore` acceptance check was replaced by `git status --short`, which lists `CHANGELOG-2026-10.md` as untracked (so not ignored), because the sandbox refused that git form.

## Deferred Issues

None.

## Known Stubs

None.

## Threat Flags

None. T-10-04 (made-up words only; deny-list leak test passes over the new root) and T-10-05 (obvious placeholder value) are mitigated as planned.

## Self-Check: PASSED

- All nine Tidemark files, `test/helpers/fixture-roots.ts` and `test/fixtures/README.md` present
- Commits 3e4af2e and 6ece753 are on the branch; `git rev-list --count` from the plan base prints 2
