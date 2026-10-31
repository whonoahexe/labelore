---
phase: 08-several-projects-and-a-switcher
plan: 15
subsystem: testing
tags: [playwright, chromium, multi-project, switcher, sec-05, screenshots, phase-gate]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "08-05 landing, 08-08 project layout, 08-11 switcher, 08-13 scan, 08-17 add and forget, 08-14 spec moves"
provides:
  - "test/e2e/projects.spec.ts: no-flash switch, restart and bookmarks, unavailable and ssh rows, unknown slug, independent tabs, cross-origin refusal"
  - "test/e2e/projects-screenshots.spec.ts: 039 A and 040 B layout facts on the build, paired screenshots, long-text check"
  - "startProjectsServer configDir reuse; other-site.ts and sketch-file.ts helpers"
affects: [phase-08-verification]

actuals:
  tokens: 14800
  tasks: 2
  commits: 6

key-files:
  created:
    - test/e2e/projects.spec.ts
    - test/e2e/projects-screenshots.spec.ts
    - test/e2e/other-site.ts
    - test/e2e/sketch-file.ts
  modified:
    - test/e2e/projects-server.ts
    - src/web/nav.tsx
    - test/web/pattern-map-corpus.test.ts
    - src/web/components/project-switcher.tsx
    - test/e2e/deep-reload.spec.ts

key-decisions:
  - "Chromium sends Sec-Fetch-Site: cross-site on a request from another site to 127.0.0.1, for the form POST and for both kinds of fetch; the server's Sec-Fetch-Site branch decides, the Origin fallback is not reached (answers the 08-03 handoff)"
  - "AppLink and useAppNavigate navigate with flushSync: React Router's default transition left the old page on screen for 2 to 3 frames under the new address (found by the new no-flash spec)"

requirements-completed: [PLAT-02, PLAT-05, PLAT-06, PLAT-07, PLAT-08, SEC-05]

plan_head_before: 6eceaa15f15deea1e3d41a83273cd293762ce02c
plan_head_after: a77a8a4
commits: 6

duration: ~3h
completed: 2026-10-31
status: complete
---

# Phase 8 Plan 15: Phase gate Summary

Both tasks are built and committed. The phase gate halted on 2026-10-30 with 10 browser failures; it was resumed on 2026-10-31, the failures were fixed, and every gate is now green.

## Gate results (2026-10-31, head a77a8a4)

- Acceptance sweep `git grep` for the old root-level API paths in test/e2e, test/helpers, playwright.config.ts: no output, exit 1 (none left).
- Unit gate (`npm run test:gate`): `gate: total=4813 passed=4813 failed=0 skipped=0 todo=0`.
- `npm run typecheck`, `npm run lint`: exit 0, no output.
- `npm run build` then `node test/helpers/deep-link-probe.mjs built test/fixtures/shapes`: `deep-link-probe: mode=built urls=72 failed=0`.
- `npm run test:e2e` (full): `238 passed (19.7m)`, 0 failed, none skipped.

## Failures in the first full run, and how each was resolved

The first full run (2026-10-30) ended `10 failed ... 4 did not run, 224 passed (18.7m)`.

1. **switcher.spec.ts "switches from one project's dashboard to another's" (focus not in main): a regression from the nav.tsx flushSync change.** `AppLink` commits the new shell synchronously inside the link's own click handler, before the popup's bubbling `onClick` set `focusMainOnNextMount`, so the new switcher's mount effect never moved focus. **Fixed:** `src/web/components/project-switcher.tsx` now uses `onClickCapture={onPopupClick}`, so the flag is set before the link navigates. switcher.spec.ts: 26 passed.
2. **deep-reload.spec.ts, 6 tests (phase page, phase page with trailing slash, milestone overview; dev and built):** `locator('main')` was a strict-mode violation. On a hard load the shell shows "Opening Kilnrow…", then the lazy page suspends in the same boundary, so React hides the Opening `<main>` (display none) beside the empty `RouteFallback` `<main>`. Only one is exposed, so this is harmless to users. **Fixed in the spec:** it reads the region with `getByRole('main')`. deep-reload.spec.ts: 48 passed.
3. **plan-page.spec.ts, 2 tests (LB v1.1/05-01, LB 02-17):** expected "Planned 20 Sep 2026" and "31 Aug 2026", got "Planned 26 Oct 2026". **Cause: a shallow git clone, not code.** `src/server/file-dates.ts` takes a phase plan's Planned date from `git log --diff-filter=A --follow`; in a shallow clone that finds the truncated root commit. After `git fetch --unshallow` the dates are right and both tests pass. No code change. The specs already pin Lendshed's phase plans by shape for this reason; the two LB tests depend on full history.
4. **projects.spec.ts restart and bookmark test:** `page.goto` ERR_ABORTED at `/portal-2/roadmap` in the full run only. **Passed in the green full run after fix 1**, with no change of its own.

## Findings from the screenshots (test-results/phase-08, gitignored)

24 paired pngs plus long-text-390-light.png were written (3 surfaces, 1280 and 390, light and dark, build and `-sketch`). All asserted layout facts pass (039 A facts 1 to 6, 040 B facts 1 to 4 with the sketch's 51/678/448/1229 numbers). Differences a person should look at:

- **390px header: the switcher trigger is 40x40 and shows only its chevron, the name is 0px wide.** The sketch shows about 140px of name and meta because it collapses the snapshot pill to a dot at 390px; the build keeps the "Read just now" label. Contract fact 6 (40px tall, ellipsis) is met literally, but the name is not visible. Not restyled (outside this plan's files). At 1280px the trigger is 200x36 with a 160px name.
- Add dialog title is "ADD A PROJECT" in Label style (mono, uppercase); the sketch uses "Add a project" at Heading size. The build's scrim blurs the page; the sketch's is a flat grey.
- Current-row check sits at the right of the row; the sketch puts it after the name.
- Landing header: the mark tile is flush to the left edge and the bar is 36px (52px at 390) with no wordmark at 390; the sketch has a 16px inset, a taller bar and the wordmark. The gap between the "Projects" h1 and the lede is about 20px larger than in the sketch.
- Last-opened time and the Opening and Unavailable chips end about 13px further from the right edge than the sketch (room reserved for the forget button).

## Deviations from Plan

- **[Rule 1 - Bug] Flash of the old page under the new address.** The no-flash spec failed on 2 to 3 frames with the old project on screen under the new URL. Fix: `AppLink` and `useAppNavigate` navigate with `flushSync` (commit 7c5971f, src/web/nav.tsx, outside the plan's file list). It caused failure 1 above, fixed by moving the switcher's handler to the capture phase.
- **[Rule 3] Added helpers:** `other-site.ts` and `sketch-file.ts` (a `page.goto` outside projectUrl in a spec fails test/e2e-url-contract.test.ts).
- **[Rule 3] PATTERNS pin:** added the 08-PATTERNS.md entry to test/web/pattern-map-corpus.test.ts (34 rows: 19 exact, 10 role, 3 partial, 2 none; 7 shared; 13 excerpts), counts confirmed with awk and grep.
- **[Rule 3] `npm run test:gate` could not be run verbatim** (needs the worktree's own node_modules); run through a copy of the gate script pointing at the main checkout's vitest, same report logic.
- After no path argument the CLI opens its working directory, so the restart test expects the repository root to join the list.

## Task Commits

1. Task 1 (tracer): `7c5971f` several projects in Chromium plus the flushSync navigation fix
2. Task 2: `b61d3b6` refusal from another website and the screenshot spec; `8b41838` PATTERNS pin; `b408485` other-site helper
3. Gate fixes: `b321e86` switcher focus flag in the capture phase; `a77a8a4` deep-reload main region by role

## Known Stubs

None.

## Self-Check: PASSED

Every gate is green (see Gate results). Files and commits exist: test/e2e/projects.spec.ts, projects-screenshots.spec.ts, other-site.ts, sketch-file.ts; commits 7c5971f, b61d3b6, 8b41838, b408485, plus the gate fixes listed under Task Commits.
