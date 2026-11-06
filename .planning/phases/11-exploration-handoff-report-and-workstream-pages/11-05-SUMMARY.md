---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 05
subsystem: testing
tags: [fixtures, spikes, made-up-examples, lendshed, listed-files]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-03 listed file class; 11-04 markerFromFenceLines and JSON markers; 11-01 adopted C6"
provides:
  - "Lendshed spikes tree: manifest, conventions, wrap-up, five READMEs, three scripts and two outputs"
  - "Every D-15 hard verdict shape: out-of-order rows, free-text verdicts, manifest/README disagreement, unparseable frontmatter, DEFERRED with no row"
  - "Index rows and a listed-by-name sentence in test/fixtures/README.md"
affects: [11-06, 11-12, 11-15, 11-16]

actuals:
  tokens: 7000
  tasks: 2
  commits: 2
plan_head_before: 90ff766cf9ce3e9686dda7fb10aaa12f0a58cb0f
plan_head_after: 5bfae7f

key-files:
  created:
    - test/fixtures/lendshed/.planning/spikes/MANIFEST.md
    - test/fixtures/lendshed/.planning/spikes/CONVENTIONS.md
    - test/fixtures/lendshed/.planning/spikes/WRAP-UP-SUMMARY.md
    - test/fixtures/lendshed/.planning/spikes/001-badge-reader-latency/README.md
    - test/fixtures/lendshed/.planning/spikes/002-offline-ledger-queue/README.md
    - test/fixtures/lendshed/.planning/spikes/003b-local-disk-staging/README.md
    - test/fixtures/lendshed/.planning/spikes/004-object-store-staging/README.md
    - test/fixtures/lendshed/.planning/spikes/005-pdf-receipts/README.md
  modified:
    - test/fixtures/README.md
    - .gitignore
    - test/web/summary-run-corpus.test.ts

key-decisions:
  - "Fixture .log outputs are un-ignored (!test/fixtures/**/*.log) rather than force-added"
  - "The summary corpus test excludes spikes/ exactly as it already excludes sketches/"

requirements-completed: [VIEW-14]

status: complete
duration: 15min
completed: 2026-11-07
---

# Phase 11 Plan 05: Lendshed spikes fixtures Summary

**Lendshed now holds a labelled, indexed made-up spikes tree covering every verdict shape the Spikes board must survive, with scripts and outputs that load as class `listed` and are never read.**

## Accomplishments

- Task 1 (tracer): MANIFEST.md (two ideas, `## Spikes` rows in order 003b, 001, 004, 002, no row for 005) and spike 003b (README frontmatter `verdict: PENDING (needs a recording)` against a manifest `VALIDATED`, `make_bundle.sh`, `out/bundle.log`). The verify command printed `kinds: spikes-manifest spike class: listed`.
- Task 2: READMEs 001 (Given/when/then validates, leading-zero id), 002 (INVALIDATED, reason in the manifest row), 004 (`verdict: PARTIAL: resume untested` and `spike: 004`; one frontmatter warning; marker keys on their own lines inside the fence on line one), 005 (DEFERRED, no manifest row); CONVENTIONS.md; WRAP-UP-SUMMARY.md processing 001 and 002; probe.sh, latency.csv, queue_check.js.
- test/fixtures/README.md: eight index rows (one per markdown spike file with its hard shape) and one sentence naming the five scripts and outputs "listed by name".
- Full gate: `gate: total=6345 passed=6345 failed=0 skipped=0 todo=0`; fixture-leak passes.

## Task Commits

1. Task 1 (tracer): manifest and spike 003b with script and output - `e2ae598`
2. Task 2: rest of the spikes tree, index rows, corpus-pin fix - `5bfae7f`

## Deviations from Plan

**1. [Rule 3 - Blocking] `*.log` in .gitignore blocked committing out/bundle.log**
- **Found during:** Task 1 commit
- **Fix:** added `!test/fixtures/**/*.log` under `*.log` in .gitignore so the fixture output is tracked without `git add -f`.
- **Files:** .gitignore
- **Commit:** e2ae598

**2. [Rule 1 - Pin that Lendshed's growth broke] summary-run-corpus counted WRAP-UP-SUMMARY.md as a plan summary**
- **Found during:** Task 2 full gate (1 failure: "Lendshed: structured.summary on every file")
- **Fix:** `walk` and `isSummary` in test/web/summary-run-corpus.test.ts now skip `spikes/`, exactly as they already skip `sketches/`. The pins were not loosened.
- **Commit:** 5bfae7f

**3. Environment note:** the per-plan commit ledger file could not be written (git-dir write refused by the worktree guard), so `plan_head_before` is the dispatch base `90ff766` given in the prompt; commits measured by hand (2). The labelore systemd service serves the main checkout, so no restart was done.

## Known Stubs

None. The 003b README's pending verdict and 005's deferred verdict are intended fixture shapes, not stubs.

## Threat Flags

None. Content is invented; test/fixture-leak.test.ts passes in the full gate (T-11-06).

## Self-Check: PASSED

- All 15 files in the plan exist; commits e2ae598 and 5bfae7f are ancestors of HEAD
- Acceptance: 5 spike READMEs, `^spike: 004` 1, `^verdict: DEFERRED` 1, `^| 003b` 1 and precedes 001, `spikes/MANIFEST.md` in fixtures README 1; no unmarked or unindexed markdown spike file
