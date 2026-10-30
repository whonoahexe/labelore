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
  commits: 4

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

key-decisions:
  - "Chromium sends Sec-Fetch-Site: cross-site on a request from another site to 127.0.0.1, for the form POST and for both kinds of fetch; the server's Sec-Fetch-Site branch decides, the Origin fallback is not reached (answers the 08-03 handoff)"
  - "AppLink and useAppNavigate navigate with flushSync: React Router's default transition left the old page on screen for 2 to 3 frames under the new address (found by the new no-flash spec)"

requirements-completed: [PLAT-02, PLAT-05, PLAT-06, PLAT-07, PLAT-08, SEC-05]

plan_head_before: 6eceaa15f15deea1e3d41a83273cd293762ce02c
plan_head_after: b408485
commits: 4

duration: ~3h
completed: 2026-10-30
status: halted
---

# Phase 8 Plan 15: Phase gate Summary

**STATUS: HALTED, the phase gate is not green.** Both tasks are built and committed and their own specs pass (6 + 1 in projects.spec.ts, 5 in projects-screenshots.spec.ts), the unit gate, typecheck, lint, build and deep-link probe pass, but the full `npm run test:e2e` run ended with 10 failed, 224 passed, 4 did not run. The work stopped there on a usage limit; the failures are listed with causes below.

## Gate results

- Acceptance sweep `git grep` for the old root-level API paths in test/e2e, test/helpers, playwright.config.ts: no output, exit 1 (none left).
- Unit gate (`node test/helpers/vitest-gate.mjs` with the main checkout's vitest, the worktree has no node_modules by design): `gate: total=4813 passed=4813 failed=0 skipped=0 todo=0`.
- `npm run typecheck`, `npm run lint`: exit 0, no output.
- `npm run build` then `node test/helpers/deep-link-probe.mjs built test/fixtures/shapes`: `deep-link-probe: mode=built urls=72 failed=0`.
- `npm run test:e2e` (full): `10 failed ... 4 did not run, 224 passed (18.7m)`. **Not green.**

## Failures in the full run (not fixed)

1. **switcher.spec.ts "switches from one project's dashboard to another's" (focus not in main): a regression from my nav.tsx change.** `AppLink` now commits the new shell synchronously inside the link's own click handler, before the popup's bubbling `onClick` sets `focusMainOnNextMount`, so the new switcher's mount effect never moves focus. Proposed fix, not applied: in `src/web/components/project-switcher.tsx` change `onClick={onPopupClick}` to `onClickCapture={onPopupClick}` (the flag is then set before the link navigates), then re-run switcher.spec.ts. I did not re-run switcher.spec.ts after the nav.tsx change before the full run.
2. **deep-reload.spec.ts, 6 tests (phase page, phase page with trailing slash, milestone overview, dev and built):** `locator('main')` is a strict-mode violation. On a hard load the shell shows "Opening Kilnrow…", then the lazy page suspends in the same boundary, so React hides the Opening `<main>` (display none) and shows the empty `RouteFallback` `<main>`: two `<main>` elements briefly. A hidden duplicate landmark, harmless to users; the spec's selector needs `main:visible` or the Opening state must not be a second `<main>`. Not changed.
3. **plan-page.spec.ts, 2 tests (LB v1.1/05-01, LB 02-17):** expected "Planned 20 Sep 2026" and "31 Aug 2026", the page shows "Planned 26 Oct 2026". Looks like the planned date falls back to checkout file times in a fresh worktree (not confirmed, not phase-8 code as far as I could see).
4. **projects.spec.ts restart test:** `page.goto` ERR_ABORTED at `/portal-2/roadmap` in the full run; it passed alone three times. Unconfirmed, possibly load-related or possibly the same flushSync change; re-run after fix 1.

## Findings from the screenshots (test-results/phase-08, gitignored)

24 paired pngs plus long-text-390-light.png were written (3 surfaces, 1280 and 390, light and dark, build and `-sketch`). All asserted layout facts pass (039 A facts 1 to 6, 040 B facts 1 to 4 with the sketch's 51/678/448/1229 numbers). Differences a person should look at:

- **390px header: the switcher trigger is 40x40 and shows only its chevron, the name is 0px wide.** The sketch shows about 140px of name and meta because it collapses the snapshot pill to a dot at 390px; the build keeps the "Read just now" label. Contract fact 6 (40px tall, ellipsis) is met literally, but the name is not visible. Not restyled (outside this plan's files). At 1280px the trigger is 200x36 with a 160px name.
- Add dialog title is "ADD A PROJECT" in Label style (mono, uppercase); the sketch uses "Add a project" at Heading size. The build's scrim blurs the page; the sketch's is a flat grey.
- Current-row check sits at the right of the row; the sketch puts it after the name.
- Landing header: the mark tile is flush to the left edge and the bar is 36px (52px at 390) with no wordmark at 390; the sketch has a 16px inset, a taller bar and the wordmark. The gap between the "Projects" h1 and the lede is about 20px larger than in the sketch.
- Last-opened time and the Opening and Unavailable chips end about 13px further from the right edge than the sketch (room reserved for the forget button).

## Deviations from Plan

- **[Rule 1 - Bug] Flash of the old page under the new address.** The no-flash spec failed on 2 to 3 frames with the old project on screen under the new URL. Fix: `AppLink` and `useAppNavigate` navigate with `flushSync` (commit 7c5971f, src/web/nav.tsx, outside the plan's file list). It caused failure 1 above.
- **[Rule 3] Added helpers:** `other-site.ts` and `sketch-file.ts` (a `page.goto` outside projectUrl in a spec fails test/e2e-url-contract.test.ts).
- **[Rule 3] PATTERNS pin:** added the 08-PATTERNS.md entry to test/web/pattern-map-corpus.test.ts (34 rows: 19 exact, 10 role, 3 partial, 2 none; 7 shared; 13 excerpts), counts confirmed with awk and grep.
- **[Rule 3] `npm run test:gate` could not be run verbatim** (needs the worktree's own node_modules); run through a copy of the gate script pointing at the main checkout's vitest, same report logic.
- After no path argument the CLI opens its working directory, so the restart test expects the repository root to join the list.

## Task Commits

1. Task 1 (tracer): `7c5971f` several projects in Chromium plus the flushSync navigation fix
2. Task 2: `b61d3b6` refusal from another website and the screenshot spec; `8b41838` PATTERNS pin; `b408485` other-site helper

## Known Stubs

None.

## Self-Check: FAILED

The phase gate is not green: 10 failures in the full browser run (see above). Files and commits exist: test/e2e/projects.spec.ts, projects-screenshots.spec.ts, other-site.ts, sketch-file.ts; commits 7c5971f, b61d3b6, 8b41838, b408485.
