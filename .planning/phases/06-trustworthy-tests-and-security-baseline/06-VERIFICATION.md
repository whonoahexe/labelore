---
phase: 06-trustworthy-tests-and-security-baseline
verified: 2026-10-26T08:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-01-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-01-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-02-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-02-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-03-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-03-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-04-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-04-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-05-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-05-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-06-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-06-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-07-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-07-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-08-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-08-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-09-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-09-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-10-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-10-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-11-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-11-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-12-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-12-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-13-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-13-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-14-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-14-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-15-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-15-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-16-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-16-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-17-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-17-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-18-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-18-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-19-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-19-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-20-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-20-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-21-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-21-SUMMARY.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-22-PLAN.md"
  - ".planning/phases/06-trustworthy-tests-and-security-baseline/06-22-SUMMARY.md"
  - "src/planning-repo/handlers/json-config.ts"
  - "src/planning-repo/secret-mask.ts"
  - "src/rendering/linkify.ts"
  - "src/web/views/manifest.ts"
  - "test/config-masking.test.ts"
  - "test/scanner-growth.test.ts"
covered_digest: "v3:sha256:83d78daed37d85176c7b37120f10b9fdd6c93f6481339514f9269148983b29a8"
behavior_unverified: 0
---

# Phase 6: Trustworthy Tests and Security Baseline Verification Report

**Phase Goal:** The test suite passes on every normal run and reads only made-up data committed in this public repository; the v1.1 threat-register security checks are in place; secrets in a project's settings file are masked at read time, before any page is built.
**Verified:** 2026-10-26
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Full unit suite: zero failures, zero skips, run after run; another project's `.planning/` changes no result (TEST-01, TEST-02) | VERIFIED | Ran `npm test` three times (plain, with `HOME` pointed at an empty folder, and through `npm run test:gate`): 187 files, 3596 passed, 0 failed. The gate printed `total=3596 passed=3596 failed=0 skipped=0 todo=0`. A grep for `.skip/.todo/.only/skipIf/runIf/xit/fixme` in `test/` and `src/` finds nothing. The empty-home run is the independence evidence: no test reached outside the repo. `test/no-skips.test.ts` and `test/helpers/vitest-gate.mjs` stand guard. |
| 2 | Every fixture is made up; browser tests run against an in-repo fixture and fail loudly if it is missing (TEST-03, TEST-04) | VERIFIED | `test/fixtures/lendshed` is the in-repo project. `playwright.config.ts` calls `resolveFixtureRoot`, which throws at config load when `.planning` is missing. Both webServers use `reuseExistingServer: false` and no home-directory path. `test/playwright-config.test.ts` pins this. `test/fixture-leak.test.ts` scans `fixtures/`, `test/`, `src/` for the deny list and passes. The remaining hits for "studio-portal" are three listed exemptions (`fixtures/dense/**`, `fixtures/README.md`, `test/__golden__/dense.json`), each with a recorded reason. I ran `test/e2e/security-page.spec.ts` (touches 4198): 3 of 3 passed. |
| 3 | Scanners stay linear on hostile input; link scanner fixed; timing tests compare growth, not millisecond budgets (SEC-01, TEST-01) | VERIFIED | `REFERENCE_TOKEN` in `src/rendering/linkify.ts` uses bounded quantifiers (`{1,31}`, `{1,16}`). `test/rendering/linkify-growth.test.ts` carries the pre-fix pattern as a positive control. `test/scanner-growth.test.ts` has about 11 hostile-shape cases. `measureGrowth` is used in 20 test files, and `no-skips.test.ts` fails any absolute-millisecond assertion. |
| 4 | Test fails on raw HTML outside the one allowed site; thousands of headings give a capped View outline (SEC-02, SEC-03) | VERIFIED | `test/web/raw-html-guard.test.ts`: exact one-entry allowlist, stale-entry failure, planted-sink controls. The only `dangerouslySetInnerHTML` in `src/web` is `artifact-page.tsx:245`. `capOutline` and `OUTLINE_ENTRY_CAP = 18` in `src/web/views/manifest.ts` are wired in `artifact-page.tsx:515` with an `omitted` count. `test/web/outline-cap.test.ts` covers a 3,000-heading case ("18 listed, 2982 counted"), a plain-text "+N more sections" row, and all blocks still rendering. |
| 5 | A `config.json` secret appears only masked in the raw file, file page, search and snippets; the full value never reaches the index (SEC-04) | VERIFIED | `JsonConfigHandler.parse` (`src/planning-repo/handlers/json-config.ts`) always runs `redactSecretText` on the raw body and `maskConfig` on the parsed object, so masking happens at the read boundary and the index inherits it. `test/config-masking.test.ts` drives the real repository through `createApp` and asserts the planted value and a fragment of it are absent from presentation, both artifact routes and search, and that on-disk bytes and mtime are untouched. It also covers the duplicate-key (CR-01) and unparseable-file cases. The two review defects (CR-01, WR-01) have failing-first tests and are fixed. |

**Score:** 5/5 truths verified (0 behavior-unverified)

### Required Artifacts / Key Links

| Artifact | Status | Details |
|----------|--------|---------|
| `src/planning-repo/secret-mask.ts` and `handlers/json-config.ts` | VERIFIED, WIRED | Handler imports and calls `maskConfig` and `redactSecretText`. Covered by `test/secret-mask.test.ts` (23 cases) and `test/config-masking.test.ts`. |
| `src/rendering/linkify.ts` | VERIFIED | Bounded `REFERENCE_TOKEN`. |
| `src/web/views/manifest.ts` `capOutline` | VERIFIED, WIRED | Used by `artifact-page.tsx`. |
| `test/fixtures/lendshed/**`, `test/helpers/fixture-project.ts`, `test/e2e/fixture-root.ts`, `fixture-server.ts` | VERIFIED | Throwing loader and fail-loud server wiring present. Copied sibling fixtures, the old fixture servers and the provenance tests are gone (`ls test/server` shows none). |
| `test/no-skips.test.ts`, `test/fixture-leak.test.ts`, `test/helpers/vitest-gate.mjs` | VERIFIED | Standing guards, run in the suite and passing. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full unit suite | `npm test` | 3596 passed, 0 failed | PASS |
| Suite without the real home dir | `HOME=<empty> npx vitest run` | 3596 passed | PASS |
| Zero-skip gate | `npm run test:gate` | skipped=0 todo=0 | PASS |
| Typecheck | `npm run typecheck` | exit 0 | PASS |
| One browser spec on the in-repo fixture | `npx playwright test test/e2e/security-page.spec.ts` | 3 passed | PASS |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| TEST-01 | 06-01, 02, 03-family, 22 and others | SATISFIED | Truths 1 and 3 |
| TEST-02 | 06-05 to 06-21 families | SATISFIED | Truth 1 (empty-home run); no sibling or home roots remain in `test/helpers` |
| TEST-03 | 06-05 to 06-19 | SATISFIED | Truth 2 (leak scan) |
| TEST-04 | 06-01, 06-17 and the e2e plans | SATISFIED | Truth 2 |
| SEC-01 | 06-02 | SATISFIED | Truth 3 |
| SEC-02 | 06-03 | SATISFIED | Truth 4 |
| SEC-03 | 06-03 | SATISFIED | Truth 4 |
| SEC-04 | 06-04 | SATISFIED | Truth 5 |

All 8 IDs in the ROADMAP phase header appear in at least one PLAN's `requirements:`. No orphaned requirements: REQUIREMENTS.md maps only these 8 to Phase 6 (SEC-05 belongs to Phase 8).

### Anti-Patterns and Open Review Findings

No `TBD/FIXME/XXX` debt markers were introduced in the files checked. None of the open review items falsify a truth.

| Item | Severity | Impact |
|------|----------|--------|
| WR-02: `blankComments` in `test/helpers/source-scan.ts` is not string-aware and can hide `it.skip` lines from the no-skips scan | Warning | Review reports no hidden skip exists today. The independent gate (`vitest-gate.mjs`, which checks the run's skipped count) still catches any skip. Worth fixing so the standing scan can be trusted by itself. |
| WR-03: register growth test is diluted by a fixed 200 KB prefix and has no positive control | Warning | The sweep is weaker than it looks; the scanner itself was shown linear elsewhere. |
| WR-04: 420px e2e test claims more than it checks | Warning | Test-honesty issue only. |
| WR-05: `startFixtureServer` silently overwrites duplicate targets and can leak its temp folder | Warning | Possible wrong-file test or leftover temp dir. |
| WR-06: unquoted webServer path and `URL.pathname` break on a checkout path with a space or non-ASCII | Warning | Does not affect this checkout; it matters if the repo is cloned elsewhere. |
| IN-01 to IN-03 | Info | IN-01: only `config.json` is masked, by decision D-09. |
| `test/server/remote-source.test.ts:280` asserts `< 3000` ms after a kill-on-timeout | Info | A hang guard rather than a perf budget (the child sleeps 5s). It is the one absolute-time assertion left, and the no-skips scan does not flag it. |
| `.mcp.json` names `/home/cinedise/...` | Info | Tooling config outside tests, outside TEST-03. Consider removing it before making the repo public. |

### Bookkeeping Discrepancy

`.planning/REQUIREMENTS.md` still shows TEST-01 to TEST-04 as unchecked (`[ ]`) and "Pending" in the traceability table, while SEC-01 to SEC-04 are marked Complete. The code evidence above shows TEST-01 to TEST-04 are met, so the orchestrator should update that file when it closes the phase. I did not edit it. `deferred-items.md` entries are still marked `open`, but the tests they cite (the research-lift, project-research, drawer, summary-run-corpus and ascii-graph tests) all pass in the full run.

### Human Verification Required

None. The one user-facing change, the "+N" outline row, was confirmed by the user in wave 1 and is covered by `outline-cap.test.ts`.

### Gaps Summary

No gaps. The phase goal is achieved: the suite passes cleanly and repeatably without touching the home directory, the fixtures are made up and guarded by standing scans, the three scanners are linear, the raw-HTML and outline-cap guards exist, and `config.json` secrets are masked at the read boundary. Open items are test-hygiene warnings for a follow-up.

---

_Verified: 2026-10-26_
_Verifier: Claude (gsd-verifier)_
