---
phase: 06-trustworthy-tests-and-security-baseline
plan: 09
subsystem: testing
tags: [fixtures, lendshed, plan-page, plan-navigator, plan-sections, playwright, vitest]
requires:
  - phase: 06-01
    provides: Lendshed fixture scaffold, fxPath / FIXTURE_BASE_URL, README rules R1-R9
  - phase: 06-02
    provides: growth helper (measureGrowth, GROWTH_LIMIT) and the gate runner
provides:
  - Five made-up Lendshed PLAN files (phases 01, 02, 04 and quick 260402-t8m) plus the quick task's SUMMARY
  - Plan lists in the Lendshed ROADMAP for phases 01, 02 and 04
  - plan-sections, plan-navigator corpus and plan-page browser tests reading only Lendshed and Labelore files
  - Labelore quick 261003-528 row pointed at its archive path and run unconditionally
status: complete
actuals:
  tokens: 60000
  tasks: 2
  commits: 2
plan_head_before: 3ddd91079034ac0944116277f693b2742751b023
plan_head_after: 9477a932c209df9bb0360a523176620628076c6f
---

# Phase 6 Plan 09: Plan family on Lendshed Summary

**The plan page's navigator, section splitter and browser spec now run on five made-up Lendshed PLAN files, with every pinned value recalculated, no skips, and the Labelore 528 row fixed against its archived path.**

## What was built

- Lendshed PLAN files: `01-01`, `01-06` (carries the Action checkpoint task, Read first, Resume signal and After resume blocks, and a top-level verification block), `02-01` (decision checkpoint then tracer then TDD task), `04-02` (inline options that render as two option cards, no Objective row), and quick `260402-t8m` (human-verify task whose name derives from what-built, plus the wrapper warnings that read "Wrapper warnings · 2").
- Quick `260402-t8m-SUMMARY.md` beside its plan (06-10 reads this).
- Lendshed ROADMAP plan lists for phases 01 (01-01 to 01-06), 02 and 04.
- `test/web/plan-navigator-corpus.test.ts`: ROWS entries `0106`, `0402`, `t8m` (renamed from `sya`), dedicated tests and the 02-01 test moved to FX_PLANNING with no existence gate; the `q528` Labelore row now points at `milestones/v2.0-quick/261003-528-.../261003-528-PLAN.md`, re-pinned, and runs unconditionally. The general corpus walk covers Labelore, fixtures/dense and FX_PLANNING.
- `test/rendering/plan-sections.test.ts`: reads through `fxPath`; the fixed-millisecond budget test is now `measureGrowth` with ratio below `GROWTH_LIMIT` (no `performance.now` / `Date.now` remain).
- `test/e2e/plan-page.spec.ts`: `openSp` became `openFx` against `FIXTURE_BASE_URL`; the three SP tests became FX 01-06, FX 04-02, FX t8m with no skip.

## Verification

- `npm run test:gate -- test/rendering/plan-sections.test.ts test/web/plan-navigator-corpus.test.ts`: total=37 passed=37 failed=0 skipped=0 todo=0.
- `npx playwright test test/e2e/plan-page.spec.ts`: 6 passed, 0 skipped.
- Acceptance greps: no `runIf|skipIf|test.skip|SP_PLANNING|STUDIO_PORTAL|homedir` in the three test files; no deny-listed reference-project words in the tests or fixture; 5 PLAN files under the fixture; `milestones/v2.0-quick/261003-528` appears in the corpus test.

## Deviations from Plan

**1. [Rule 3 - Blocking, plan-intent mismatch] Phase plan Planned date pinned by shape, not by exact value**
- The plan asked for the 01-06 Planned date to come from a frontmatter date. The page does not read a frontmatter date; `src/server/file-dates.ts` uses the git add-date, then mtime, and the quick plan's date comes from its ID. Changing the app was out of scope.
- Fix: the FX 01-06 test pins the shape `Planned D Mon YYYY` (the fact is present and well-formed), and the exact date `Planned 2 Apr 2026` is pinned on the quick plan `260402-t8m`, which carries it in its ID. The pin is not removed or skipped, only clone-independent.

**2. [Rule 3 - Blocking] Worktree has no node_modules**
- A symlink `node_modules` to the main checkout's was created to run the gates. It is untracked and was never staged.

**3. Interrupted-run handling**
- Fast-forwarded to the earlier run's branch (one task commit and one wip salvage commit). Reviewed the wip content: no scratch or probe files were present, all gates passed unchanged, so no further commits were needed beyond this summary.

## Deferred issues (out of scope, pre-existing live drift on Labelore's own files)

The full `npm run test:gate` shows 24 failures, none touching files from this plan: `test/presentation/project-research.test.ts` (14), `test/project-research-lift.test.ts` (7), `test/web/summary-run-corpus.test.ts` (2, `.planning/milestones/v1.0-research/SUMMARY.md` does not extract or compose), `test/presentation/drawer.test.ts` (1, the repo's own corpus "newest shipped milestone" pin). They pin the repo's own research files and milestone state and have drifted (for example a date `2026-10-25` against a pinned `2026-08-21`). They belong to the summary and research plans later in the phase (06-10 and following). They do not read Lendshed.

## Lendshed file quirks (input for the 06-22 ledger)

| File | Quirks it keeps |
|------|-----------------|
| `phases/01-member-sign-in-sessions/01-01-PLAN.md` | wave 1, empty depends_on, tracer task with tdd, three requirements, threat model, verification and success criteria blocks |
| `phases/01-member-sign-in-sessions/01-06-PLAN.md` | `autonomous: false`, three-item depends_on, checkpoint:human-action task (Action and Afterwards tabs) with Read first / Resume signal / After resume, top-level verification block read as Done-when, requirements resolved against Lendshed REQUIREMENTS.md |
| `phases/02-roles-and-permissions/02-01-PLAN.md` | checkpoint:decision first, then tracer, then tdd auto task; the shape its dedicated navigator test pins |
| `phases/04-bulk-loan-export/04-02-PLAN.md` | inline options rendering as two option cards (Go ahead / Hold), no Objective row, single-line verification and success_criteria, "Artifacts this phase produces" section |
| `quick/260402-t8m-.../260402-t8m-PLAN.md` | quick plan with date in the ID, human-verify task named from what-built, wrapper warnings (2), `QUICK-` requirement ID |
| `quick/260402-t8m-.../260402-t8m-SUMMARY.md` | checkpoint "NOT YET OBSERVED" status, Known Stubs, Threat Flags and Self-Check sections |
| `ROADMAP.md` | plan lists for phases 01, 02, 04 (this plan is the only editor, README R9) |

## Self-Check: PASSED

All six fixture files exist, commits 4793ab3 and 9477a93 are ancestors of HEAD, and the gate and Playwright runs above passed.
