---
phase: 09-review-audit-and-root-document-pages
plan: 05
subsystem: planning-repo handlers, view registry
tags: [review-disposition, handler, manifest, fixtures, sec-01]
requires:
  - phase: 09-03
    provides: leadingFindingId and severityOfId (review-report.ts)
provides:
  - extractReviewDisposition: one row model for all three real REVIEW-DISPOSITION shapes
  - ReviewDispositionHandler (structured.disposition) registered after ReviewFixHandler
  - the review-disposition view kind and manifest (22 registry members)
  - three invented Lendshed disposition fixtures, one per shape
affects: [09-13 review ledger Disposition tab]
tech-stack:
  added: []
  patterns: [per-handler tolerant extractor with own try/catch, linear line-scanned table reader]
key-files:
  created:
    - src/planning-repo/handlers/review-disposition.ts
    - test/review-disposition.test.ts
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-REVIEW-DISPOSITION.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-REVIEW-DISPOSITION.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-DISPOSITION.md
  modified:
    - src/planning-repo/handlers/review.ts
    - src/planning-repo/handlers/index.ts
    - src/web/views/kinds.ts
    - src/web/views/manifests.ts
    - test/review-handler-guard.test.ts
    - test/review-family.test.ts
    - test/web/view-registry.test.ts
key-decisions:
  - "A stale disposition is kept exactly as written; the reader never consults the fix file."
  - "A table row whose id cell has no readable finding ID is dropped, never shown under an invented id."
  - "Bold markers and backticks are dropped from table cell text (titles, notes, raw dispositions)."
requirements-completed: [VIEW-09]
status: complete
duration: 20min
completed: 2026-11-03
actuals:
  tokens: 45000
  tasks: 2
  commits: 2
plan_head_before: f72c19ec2e41e7a89da0b48b2058af882f2fb112
plan_head_after: f1c2cdd19d33e61bc178c38354a5efde829184c8
commits: 2
---

# Phase 9 Plan 05: REVIEW-DISPOSITION reader and recognised page Summary

**A tolerant REVIEW-DISPOSITION reader (frontmatter findings, five-column hand-written table, two-column table) feeding a new `review-disposition` handler, kind and manifest, with stale-open rows kept exactly as written.**

## What was built

- `extractReviewDisposition(frontmatter, body)` returns `{ source: 'frontmatter' | 'table' | 'none', rows, stated }`. Frontmatter `findings` become rows in order, with notes joined from the table's Note or Source cell by id (a dash or blank is no note). Without findings, the first table whose header names a Finding or ID column and a Disposition column supplies the rows. The class is the first word of the disposition lower-cased (open, fixed, skipped, deferred; anything else is `other` with `dispositionRaw` kept). Severity comes from the field (`blocker` is critical) else `severityOfId`.
- `ReviewDispositionHandler` claims `REVIEW-DISPOSITION` in every phase location, with the extraction in its own try/catch (a throw leaves title, body and frontmatter and omits `structured.disposition`).
- The `review-disposition` kind and manifest (lead "What became of each review finding, and why."; promotes a facts block for `open` and `total`, then any section naming dispositions or findings). A file with neither composes to zero blocks and shows the full document, which is the table itself. View registry is 22 members.
- Fixtures (invented text): Lendshed 01 (tool shape, all six rows open, stale against its fix file), Lendshed 02 (hand-written, Fixed/Deferred/Skipped/Accepted/Wont-fix/Open), archived v1.0 phase 04 (two columns, no frontmatter, seven rows).
- SEC-01: body capped at 1,000,000 characters, one pass over lines clipped to 8,000 characters, at most 500 rows, 24 cells per line, strings capped at 400. Growth tests cover thousands of table rows, header-like noise lines, 5,000 rows against the row cap, and a 200k-character cell.

## Verification

- Full unit suite in the worktree: 225 files, 4942 tests, all passing, none skipped.
- `tsc` for server and web, eslint on touched directories, and `vite build` all clean.
- The plan's `npm run test:gate` could not run in the worktree (no `node_modules`); the equivalent `vitest run` from the main checkout's binary was used for the targeted files and the whole suite.
- `systemctl --user restart labelore` was skipped per the orchestrator's worktree note; the orchestrator restarts after merge.

## Deviations from Plan

None to the plan's behaviour. One structural note: Task 1's extractor already implemented the table-driven shapes, so Task 2's commit adds only fixtures and tests (the RED-before-GREEN split did not apply because the behaviour tests passed on first run against the complete reader).

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths or raw-HTML sites.

## Self-Check: PASSED

- src/planning-repo/handlers/review-disposition.ts, the three fixtures and test/review-disposition.test.ts exist.
- Task commits f583a2c and f1c2cdd are ancestors of HEAD.
