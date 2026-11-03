---
phase: 09-review-audit-and-root-document-pages
plan: 16
subsystem: testing
tags: [playwright, screenshots, typography-cap, deep-reload, phase-gate]
requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: the windows, review ledger, milestone audit and coverage pages (09-10 to 09-15), root-document redirects (09-06)
provides:
  - test/e2e/phase-09-screenshots.spec.ts, the layout, tone and typography checks and the 56-image screenshot set for the four analog pages
  - two deep-reload classes for a redirected root document and an archived requirements copy
  - the phase gate record
affects: [post-build screenshot review with the user]
actuals:
  tokens: 28000
  tasks: 2
  commits: 2
plan_head_before: 478785747d796a3e3ebd949e4fb76c05685c5ad3
plan_head_after: 73cd62e7de06998324f27fbd896f8e92d58183f5
commits: 2
key-files:
  created:
    - test/e2e/phase-09-screenshots.spec.ts
  modified:
    - test/e2e/deep-reload.spec.ts
key-decisions:
  - "The four-size check counts the computed font sizes of visible elements inside main that hold text of their own, so a container that merely inherits body size is not counted"
  - "The repo's own windows ledger is asserted structurally (a lead chip and an 'n fixed' line), not as 'nine fixed', so later ledger entries do not break the spec"
requirements-completed: [VIEW-07, VIEW-08, VIEW-09, VIEW-10]
duration: 45min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 16: Screenshot sweep, hard reloads and the phase gate Summary

**All four analog-built pages pass one-h1, no-sideways-scroll, no-warning-tone and four-font-size checks in a real browser at both widths and themes on Lendshed, Shapes and this repo, a 56-image set waits for the user's review, and the hard-reload spec now covers `/state` and an archived requirements copy in the dev and built servers. No CSS fix was needed.**

## Accomplishments

- `phase-09-screenshots.spec.ts`: a tracer (Lendshed `/windows`, light, 1280: the "2 open" chip, one h1, file written) and then 14 inputs x 2 widths x 2 themes = 56 tests. Inputs: windows on Lendshed, Shapes (0 open, "Nothing open.") and this repo; review on Lendshed phase 1 Review, Disposition and Fix tabs, phase 3 `review-fix-frontend` (both anchored sections, "Not in the review", frontend section in view) and this repo's phase 8 Disposition; audit on Lendshed ("Tech debt only"), this repo ("Passed") and Shapes (narrative open, no Scores); coverage on Lendshed phase 2 (no-API card), Lendshed phase 4 ("3 integrated, 2 opted out") and Shapes phase 2 (generic table, no coverage vocabulary).
- Every page: exactly one h1, sideways overflow at most 0 at 390, no `[data-tone="destructive"]` or `[data-tone="warning"]` in main, at most four distinct font sizes (the audit's narrative body and the shipped review threads excluded, per the plan).
- `deep-reload.spec.ts`: "a redirected root document lands on the dashboard" (STATE.md opens, lands on `/`, dashboard eyebrow and h1) and "an archived requirements copy opens traceability at its milestone" (stays on `/v1.0/requirements`, Traceability h1, one open `.history-milestone[data-target="true"]`), each in the development and the built server. Existing classes untouched.

## Task Commits

1. **Task 1: windows, review, audit and coverage through the screenshot sweep** - `af0900d` (test)
2. **Task 2: hard reloads of the new addresses** - `73cd62e` (test)

## Sweep result (no page code changed)

The sweep passed on the first run, so `globals.css` was not touched. Measured sizes: windows, review ledger head and tabs, audit and coverage render exactly 11.2, 13.12, 20.8 and 76.8px. The Shapes audit's 18.4px prose and the Shapes coverage fallback (18.4 and 14.4px) are the shared document body and generic table: the first is excluded as the plan states, and the second still totals four sizes. Note for the user's review: on the ledger pages the tab strip and shared head sit above the breadcrumbs and h1 (shipped in 09-12/09-13), which reads a little unusual at 390px.

## Real-corpus look (nothing committed, nothing named in a spec)

One GSD project on this machine holds both a long milestone audit (debt items well over 400 characters) and a 13-row windows ledger, so one server on port 4310 served both instead of two. Its two milestone audits and its windows page were photographed at 1280 and 390, light and dark (12 images) into a temporary scratchpad folder. Result: no sideways scroll on any (document overflow 0, no visible element past the viewport edge), one h1 each, long debt items clamp with Read more, groups and chips read correctly. No fix needed. Server stopped.

## Gate record (last line of each command)

Run with the main checkout's binaries (the worktree has no node_modules; a scratch copy of the gate script pointed at them).

- `test:gate -- test`: `gate: total=5385 passed=5385 failed=0 skipped=0 todo=0`
- `test:gate` on e2e-url-contract, fixture-leak, css-source-order, token-guard: `gate: total=21 passed=21 failed=0 skipped=0 todo=0`
- typecheck (both tsconfigs): exit 0
- `eslint .`: exit 0, no output
- `vite build`: `built in 926ms`
- `playwright test root-documents review-page deep-reload` (throwaway config on /usr/bin/google-chrome, deleted): `64 passed (2.0m)`
- `playwright test phase-09-screenshots`: `57 passed (1.9m)` (run twice; Playwright wipes test-results/ at each run, so the set was regenerated last and copied out)
- `systemctl --user restart labelore`: skipped per the worktree instructions (it serves the main checkout); the orchestrator restarts after merge.

project-page-screenshots was not re-run: no 09-10 to 09-15 SUMMARY records a `globals.css` change outside its own marked region or a shared-component change.

## Deviations from Plan

None - plan executed exactly as written (one real-corpus server instead of two, because one project satisfied both criteria).

## Screenshot handoff

Copied out of the worktree before return: `/tmp/claude-1000/-home-cinedise-codebases-labelore/2b87a71d-d2dd-431e-ad8c-0e248ebad74e/scratchpad/phase-09-screenshots/` (57 files, `<page>-<input>-<width>-<theme>.png` plus a tracer shot) and `/tmp/claude-1000/-home-cinedise-codebases-labelore/2b87a71d-d2dd-431e-ad8c-0e248ebad74e/scratchpad/phase-09-real-corpus/` (12 files, never committed). The `<human-check>` review is the orchestrator's after merge.

## Known Stubs

None.

## Threat Flags

None. T-09-32 held: the committed spec reads only Lendshed, Shapes and this repo; real-corpus shots went to a scratchpad folder; fixture-leak passes over the spec.

## Self-Check: PASSED

- test/e2e/phase-09-screenshots.spec.ts exists; commits af0900d and 73cd62e are ancestors of HEAD.
- Acceptance: 57 screenshots matching windows-, review-, audit-, coverage- (at least 48); both deep-reload class names appear once each.
