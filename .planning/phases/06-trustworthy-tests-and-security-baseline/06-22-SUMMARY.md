---
phase: 06-trustworthy-tests-and-security-baseline
plan: 22
subsystem: testing
tags: [vitest, leak-guard, no-skips, fixtures, test-privacy, phase-gate]
status: complete
requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: source-scan helpers (06-03), growth-ratio helper (06-01), gate runner (06-02), Lendshed fixture tree (06-01 to 06-21)
provides:
  - test/fixture-leak.test.ts, a standing whole-word scan of fixtures, test sources and the app source over git's file list, with frozen exemption lists and planted controls
  - test/no-skips.test.ts, a standing scan for skip members, disguised skips, real-project paths and absolute millisecond budgets, with planted controls
  - six test files and seven app-source comments cleaned of private names
  - the Lendshed quirk ledger (one row per file) and a Lendshed entry in the fixtures ledger
  - the phase gate record, with the suite green three times in a row
affects: [verification, code review, security and UAT for phase 06; any later plan that adds a fixture or test file]
requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04]
actuals:
  tokens: 42000
  tasks: 3
  commits: 3
plan_head_before: 6cc2cb32281bde569d1ede2d7d0661d55191e337
plan_head_after: a0a84e591aed506d19f5d5b08379f85fb36021f9
tech-stack:
  added: []
  patterns:
    - "A scan is a function of a root folder and relative paths, so planted controls run the same code on a mkdtemp folder"
    - "Frozen exemption lists with exact-length and stale-entry assertions"
key-files:
  created:
    - test/fixture-leak.test.ts
    - test/no-skips.test.ts
  modified:
    - test/secret-mask.test.ts
    - test/handlers.test.ts
    - test/presentation/manual-checks.test.ts
    - test/presentation/roadmap.test.ts
    - test/remote-target.test.ts
    - test/web/document-title.test.ts
    - test/web/strip-markdown.test.ts
    - fixtures/README.md
    - test/fixtures/lendshed/README.md
    - src/planning-repo/handlers/project-research-lift.ts
    - src/planning-repo/handlers/review-report.ts
    - src/planning-repo/handlers/ui-review.ts
    - src/presentation/dashboard-head.ts
    - src/web/styles/globals.css
    - index.html
  deleted:
    - test/helpers/studio-portal.ts
key-decisions:
  - "The no-skips exemption list holds four entries, not the five the plan named: test/helpers/growth.ts has nothing to exempt and the stale-entry rule would fail it"
  - "bestOf( counts as a timing source for the absolute-budget scan, so the one growth-test budget on a bestOf result is found and exempted by name"
  - "The disguised-skip pattern matches a bare early return only; a helper that returns an empty list for a missing folder is not a skip"
duration: 12 min
completed: 2026-10-26
---

# Phase 6 Plan 22: Standing guards and phase gate Summary

Two standing scan tests (private-name leak guard over fixtures, tests and app source; no-skips and real-path guard), the last real-checkout helper deleted, thirteen private-name offenders reworded, and the whole suite green three runs in a row (3588 tests, 0 failed, 0 skipped, 0 todo), once under load and once with HOME swapped.

## Accomplishments

- `test/fixture-leak.test.ts`: whole-word, case-insensitive scan of every file git would commit (`git ls-files -z --cached --others --exclude-standard`), in three scopes. Scope A (fixtures, `test/fixtures`, `test/__golden__`, `test/rendering/fixtures`, `test/helpers`) and scope B (every other file under `test/`, plus `playwright.config.ts`) apply the ten deny words, the two host tells and the four tool tells. Scope C (every other tracked file, `src/` and `index.html` included) applies deny words and host tells but not tool tells, so the working word in the external-node classifier of `src/rendering/ascii-graph.ts` stays untouched. A hyphen in a deny word also matches a run of whitespace, so the two-word form of the reference project's name is caught. A file-name rule rejects a deny word in any path segment and an `sp`, `dd` or `sb` prefix followed by a digit or hyphen. Anchors per scope keep an empty file list from passing. Exemptions are frozen: 3 fixture entries (word `studio-portal` only), 3 source files, 3 D-19 out-of-scope locations; the test fails if a list grows or an entry goes stale. Planted controls (mkdtemp) cover every deny word, the spaced forms, a host, a tool tell, a private file name, a `nodeId` identifier that must not match, a deny word and a host under `src/`, and a tool tell that is reported under `test/` but not under `src/`.
- `test/no-skips.test.ts`: on comment-blanked text, finds any `it`/`test`/`describe` member chain ending in skip, todo, only, fixme, skipIf or runIf (all 21 named members have a planted control, called and uncalled), a bare early return guarded by a negated `existsSync`, and an absolute millisecond budget (`toBeLessThan` or `toBeLessThanOrEqual` with a numeric literal on a `performance.now`, `Date.now` or `bestOf` result, inline or through a variable). On raw text it finds a home-directory call, `/home/<user>/Work` or `/codebases` paths, `~/Work`, `Work/Ibis|Cinedise|Sideby` and the old real-checkout constant names. Planted controls cover each, plus negative controls (comments, `commit.only`, a relative budget, a non-numeric limit, `return []`).
- Deleted `test/helpers/studio-portal.ts` (nothing imported it any more).
- Cleaned `test/handlers.test.ts`, `test/presentation/manual-checks.test.ts`, `test/presentation/roadmap.test.ts`, `test/remote-target.test.ts` (made-up `box.lendshed.example` host and `/srv/lendshed-template` path), `test/web/document-title.test.ts` (made-up "Lendshed App" title) and `test/web/strip-markdown.test.ts` (`app.lendshed.example`).
- Reworded the seven app-source comments comment-only, each on its own line (1 added, 1 deleted per file; 2 and 2 for the stylesheet); the `preset b3Dqcuo4na (base-sera)` substring that `shell-contract.test.ts` pins survives.
- Lendshed README: "Quirk ledger" with one row for each of the 108 files in the tree and four rows for the made-up files outside it. `fixtures/README.md`: a Lendshed entry that points at the ledger and states that the manual-smoke-only rule is now enforced by the two standing tests (its six `studio-portal` lines are unchanged).

## Phase gate record

| Run | Command | Gate line |
|---|---|---|
| 1 | `npm run test:gate` | `gate: total=3588 passed=3588 failed=0 skipped=0 todo=0` |
| 2 | `npm run test:gate` | `gate: total=3588 passed=3588 failed=0 skipped=0 todo=0` |
| 3, under 16 busy processes | `npm run test:gate` (16 `node -e` endless loops, all killed afterwards, none left) | `gate: total=3588 passed=3588 failed=0 skipped=0 todo=0` |
| HOME swapped to an empty mktemp folder | `HOME=... node test/helpers/vitest-gate.mjs` | `gate: total=3588 passed=3588 failed=0 skipped=0 todo=0` (equal to the normal run) |
| After the final import fix | `npm run test:gate` | `gate: total=3588 passed=3588 failed=0 skipped=0 todo=0` |

`npm run typecheck` and `npm run lint` exit 0. Only the Playwright specs named by the plan were not run in the browser: the plan's gate is the unit suite, and no full `test:e2e` run was made.

## Task Commits

1. **Task 1: Standing leak and no-skips scans, offenders fixed, helper deleted** - `470a8a9` (test, tracer)
2. **Task 2: Leak test extended to the app source, comments reworded, ledgers completed** - `b380e36` (test)
3. **Task 3: Phase gate** - no production change; one fix commit `a0a84e5` (the new test imported `source-scan` without a `.ts` extension, which typecheck rejected)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Absolute millisecond budget left in test/secret-mask.test.ts**
- **Found during:** Task 1 (first no-skips run)
- **Issue:** "runs in linear time on a long unterminated string" asserted `performance.now() - started < 2000`, which the new scan rightly reports.
- **Fix:** Converted to `measureGrowth` with `GROWTH_LIMIT`, building the unterminated string at size n and 8n outside the timed region. Three repeat runs of the file were green.
- **Files modified:** test/secret-mask.test.ts
- **Commit:** 470a8a9

**2. [Rule 1 - Bug] Plan's exemption list inconsistent with its own stale-entry rule**
- **Found during:** Task 1
- **Issue:** The plan froze five no-skips exemptions including `test/helpers/growth.ts`, but that file contains no budget, skip or real path, so the "every exemption still has a hit" rule fails it. `test/helpers/growth.test.ts` has a real absolute budget (`expect(best).toBeLessThan(2)` on a `bestOf` result) that the scan only sees once `bestOf(` counts as a timing source.
- **Fix:** Added `bestOf(` as a timing source and dropped `growth.ts` from the list: four entries (`no-skips.test.ts`, `shell-contract.test.ts`, `remote-source.test.ts`, `growth.test.ts`), asserted at exactly four. The list only narrowed, never widened.
- **Files modified:** test/no-skips.test.ts
- **Commit:** 470a8a9

**3. [Rule 1 - Bug] Disguised-skip heuristic false positives**
- **Found during:** Task 1
- **Issue:** Eight corpus tests have a directory-walk helper `if (!existsSync(dir)) return [];`, which returns a value and is not a skipped test; the first pattern reported them.
- **Fix:** The pattern now matches only a bare early return (`return;` or `return }`), with a planted negative control for `return []`. Recorded as the scan-heuristic change the plan allows.
- **Files modified:** test/no-skips.test.ts
- **Commit:** 470a8a9

**4. [Rule 3 - Blocking] Typecheck rejected an extensionless import**
- **Found during:** Task 3
- **Fix:** `./helpers/source-scan.ts`, matching the rest of the suite.
- **Files modified:** test/no-skips.test.ts
- **Commit:** a0a84e5

**Total deviations:** 4 auto-fixed (3 bug, 1 blocking). **Impact:** none on behaviour; the guards are slightly stricter than first drafted on budgets and slightly narrower on early returns. The plan listed `playwright.config.ts` as an offender at HEAD; it no longer held a deny word (earlier plans cleaned it), so no edit was needed there.

## Follow-ups

### D-19: private names that remain in the three out-of-scope locations

Fresh `git grep -liwE` with the ten deny words, the two-word form and the two host tells over `.planning .claude .mcp.json` finds 327 files, grouped by first two path segments. Nothing is changed here (D-19).

| Group | Files |
|---|---|
| `.claude/CLAUDE.md` | 1 (names the reference project throughout, as well as holding the home paths) |
| `.mcp.json` | 1 |
| `.planning/MILESTONES.md` | 1 |
| `.planning/PROJECT.md` | 1 |
| `.planning/REQUIREMENTS.md` | 1 |
| `.planning/RETROSPECTIVE.md` | 1 |
| `.planning/debug` | 1 |
| `.planning/milestones` | 169 |
| `.planning/notes` | 2 |
| `.planning/phases` | 33 (22 at plan time; phase 06's own summaries and plans since then name what they removed) |
| `.planning/quick-batches` | 1 |
| `.planning/research` | 6 |
| `.planning/sketches` | 108 |
| `.planning/todos` | 1 |

Git history still holds the files deleted in this phase (the old real-checkout helper, the golden and fixture files that were replaced). The same search over the whole repository outside those three locations, `test/` and `fixtures/` prints nothing. New private project names would need adding to `DENY_WORDS` in `test/fixture-leak.test.ts`.

## Known Stubs

None.

## Threat Flags

None. The plan adds only test files and comment edits; the planted controls live in mkdtemp folders and nothing new appears under `src/`.

## Self-Check: PASSED

- test/fixture-leak.test.ts, test/no-skips.test.ts found; test/helpers/studio-portal.ts absent
- Commits 470a8a9, b380e36, a0a84e5 are ancestors of HEAD
- Deny-list search outside `.planning`, `.claude`, `.mcp.json`, `test` and `fixtures` prints nothing; `preset b3Dqcuo4na (base-sera)` count is 1; `studio-portal` lines in fixtures/README.md still 6
