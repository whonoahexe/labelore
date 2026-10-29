---
phase: 07-recognised-files-and-readable-urls
plan: 05
subsystem: testing
tags: [playwright, e2e, url-helper, nav-09, source-scan, vitest]
status: complete

requires:
  - phase: 07-recognised-files-and-readable-urls
    provides: "07-03: withProjectSlug in src/web/project-path.ts and projectSlug on /api/presentation"
provides:
  - "test/e2e/app-url.ts: BASE_URL, projectSlugAt, projectUrl, artifactUrl (plus exactUrl and hrefOf for URL assertions)"
  - "test/e2e-app-url.test.ts: the helper composed against a real listening Lendshed server"
  - "test/e2e-url-contract.test.ts: standing scan keeping raw URLs, old fragments and file-named toHaveURL patterns out of test/e2e/*.spec.ts"
  - "Twenty-one browser specs that open every address through the helper and assert against DTO-key addresses"
affects: [07-06, 07-07, 07-10]

requirements-completed: [NAV-09]

actuals:
  tokens: 70000
  tasks: 2
  commits: 4
plan_head_before: 36d5451923d126b9f2c447198a65e5e45cdaf6f7
plan_head_after: 6d7f87ac2a020094f0a998f878dcd50862c008bd

key-files:
  created:
    - test/e2e/app-url.ts
    - test/e2e-app-url.test.ts
    - test/e2e-url-contract.test.ts
  modified:
    - test/e2e/pages.ts
    - test/e2e/artifact-header.spec.ts
    - test/e2e/context-brief.spec.ts
    - test/e2e/debug-page.spec.ts
    - test/e2e/document-layout.spec.ts
    - test/e2e/learnings-page.spec.ts
    - test/e2e/note-page.spec.ts
    - test/e2e/patterns-map.spec.ts
    - test/e2e/plan-page.spec.ts
    - test/e2e/planning-drawer.spec.ts
    - test/e2e/research-briefing.spec.ts
    - test/e2e/research-page.spec.ts
    - test/e2e/review-page.spec.ts
    - test/e2e/security-page.spec.ts
    - test/e2e/summary-page.spec.ts
    - test/e2e/todo-page.spec.ts
    - test/e2e/uat-page.spec.ts
    - test/e2e/ui-review-page.spec.ts
    - test/e2e/ui-spec-page.spec.ts
    - test/e2e/validation-page.spec.ts
    - test/e2e/verification-page.spec.ts

key-decisions:
  - "Specs resolve a fixture by path fragment, then call artifactUrl with the exact path, so no spec holds a URL and a grammar flip needs no spec edit"
  - "The contract scan accepts a goto argument that is an await projectUrl/artifactUrl call, or a variable assigned from one, or from a file-local top-level function whose body calls one"
  - "toHaveURL and href assertions compare with exactUrl/hrefOf of an artifactUrl computed beforehand, so no file name sits inside the toHaveURL call"

duration: 75 min
completed: 2026-10-27
---

# Phase 7 Plan 05: Browser specs made URL-agnostic Summary

**A slug-aware helper (projectUrl/artifactUrl, reading the served project's slug and artifact keys from /api/presentation) now builds every address the Playwright specs open, guarded by a standing vitest scan, so the specs stay valid across the grammar flip in 07-06 and 07-07.**

## Accomplishments

- `test/e2e/app-url.ts` fetches `/api/presentation` once per base, throws "No projectSlug at ..." or "No artifact ... at ..." instead of guessing, and prefixes the slug with the web's own `withProjectSlug`.
- `test/e2e-app-url.test.ts` boots `createApp` over the Lendshed fixture on a real port and shows `projectUrl(base, '/roadmap')` and an artifact address both return 200 with the SPA shell, and that an unknown path rejects.
- All 21 specs (context-brief first, as the tracer, then the other 20) go through the helper: 0 raw `page.goto` strings or templates remain, 0 `toHaveURL` patterns name a `.md`/`.json` file (baselines were 31 and 4).
- `test/e2e-url-contract.test.ts` scans every spec with comments blanked for raw gotos, old `a~`/`m~`/`p~`/`?doc=summary` fragments and file-named `toHaveURL` patterns, with a planted spec in a mkdtemp folder proving each rule fires.
- Playwright (Chromium is available on this machine) was run against the swept specs: context-brief, planning-drawer and research-page passed; the full run gave 148 passed and 4 failed (see Issues).

## Task Commits

1. Task 1 (tracer): `2ab8968` feat(07-05): slug-aware url helper for the browser specs, proven against a live server
2. Task 2: `6ba1326` feat(07-05): sweep every browser spec through the url helper and add the standing url contract

`commits: 4` is the measured `plan_head_before..HEAD` range; it includes two orchestrator commits made during the run (`b8f1651`, `6d7f87a`). This plan's own code commits are the two above.

## Deviations from Plan

**1. [Rule 2 - Missing critical] Two extra exports in app-url.ts**
- **Issue:** URL assertions needed an anchored pattern builder and an href matcher; hand-rolled escaping per spec would have repeated an escaping routine in four files.
- **Fix:** added `exactUrl(url)` (whole address, optional trailing query/hash) and `hrefOf(url)` (path without origin) beside the four planned exports.
- **Commit:** 2ab8968

**2. [Scope] Contract scan accepts file-local wrappers and destructured assignments**
- The plan's wording allows `await projectUrl/artifactUrl(` or a variable assigned from one. Specs such as artifact-header destructure `{ url, path }` from a local `resolveArtifact` that calls `artifactUrl`; the scan follows one hop into top-level functions whose body calls a helper. The scan still rejects any identifier not assigned from an accepted call.

**3. href assertions swept as well**
- `note-page` and `todo-page` asserted `href` against file names (`/add-crop-and-round-member-avatars\.md/`, `/260920-mzr-SUMMARY\.md/`). These pin the old shape too, so they now use `hrefOf(await artifactUrl(...))`. Not in the plan's list but needed for the specs to survive the flip.

**Process note:** the full Playwright suite was run once mid-task before the instruction to run only affected tests arrived; afterwards only affected specs and the single full `npm run typecheck` / `npm run test:gate` run at the end were used.

**Total deviations:** 3 (1 auto-added, 2 scope clarifications). **Impact:** none on the plan's outcomes.

## Issues Encountered

Four Playwright failures in the full run; none involve a URL:
- `plan-page` "LB v1.1/05-01" and "LB 02-17": expected `Planned 20 Sep 2026` / `31 Aug 2026`, page shows `26 Oct 2026` (file dates in this fresh clone; environmental, content not address).
- `document-layout` "rendered figures: project research ARCHITECTURE.md": the repo's current research file holds no directory tree figure (the research-page spec records that the v2.1 research has no project tree). The page opens correctly.
- `note-page` "a dense quick note with a todo it became": failed only in the full run and passed when run alone (timing flake).

These specs are not blocked by this plan; 07-10's human check owns the browser gate.

## Known Stubs

None.

## Threat Flags

None. T-07-12 is mitigated: the helper throws on a missing slug or artifact and the contract scan fails on raw URLs and pinned shapes.

## Verification

- `npm run typecheck` exits 0.
- `npm run test:gate`: total=4076 passed=4076 failed=0 skipped=0 todo=0 (the pattern-map and ui-spec corpus pins were fixed by the orchestrator).
- `git grep -nE "goto\(('|\"|\`)" -- test/e2e` and `git grep -nE "toHaveURL\(.*\.(md|json)" -- test/e2e` print nothing.

## Self-Check: PASSED

- test/e2e/app-url.ts, test/e2e-app-url.test.ts and test/e2e-url-contract.test.ts exist.
- Commits 2ab8968 and 6ba1326 are ancestors of HEAD.
