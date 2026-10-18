---
phase: quick-261018-hbd
plan: 01
status: complete
subsystem: dashboard
tags: [dashboard, pace, git]
key-files:
  created:
    - src/server/commit-times.ts
    - test/server/commit-times.test.ts
  modified:
    - src/server/file-dates.ts
    - src/server/dashboard-ledger.ts
    - src/server/index.ts
    - src/presentation/dashboard-pace.ts
    - src/web/pages/dashboard-pace.tsx
    - test/presentation/dashboard-pace.test.ts
completed: 2026-10-18
---

# Quick 261018-hbd: Pace timing from commits, with the summary as fallback

Pace no longer trusts the `duration` an agent typed into each plan's summary, which could mean active
time, hours of wall-clock time across a usage-limit pause, only the last session, or a guess. It now
reads the target repository's commit history once (read-only, same hardened git call as the plan
page's dates) and times each plan from its own commits: every commit scoped to the plan adds the gap
since the plan's previous commit (the first one, since the commit just before it), each gap capped at
30 minutes so a pause counts as a break. Plans with fewer than two commits, or projects with no
history, keep their summary number and show as hollow "from its summary" dots.

## What changed
- New commit log module: one `git log`, cached, reset on refresh, null on any failure.
- Plan numbers that repeat across milestones (studio-portal reuses 01-01 and so on) give each commit
  to the plan finished nearest to it; if one of them has no finish date, those plans keep their
  summaries.
- The dashboard response swaps the commit times into Pace; the chart's tooltip says "N commits" or
  "from its summary", and the key reads "One plan, active time from its commits" and
  "From its summary (~)".

## Effect on real projects
- labelore: all 36 plans timed from commits, 6 to 77 minutes each (median 28.5), 19.6h in total.
- studio-portal: 68 of 76 timed from commits, 3 to 72 minutes; total drops from 40.9h to 30.5h.
- sideby.me: only 1 plan timed from commits; its planning repository holds few plan commits, so it
  stays on the summaries.

## Verification
- New tests for the gap rule, the cap, interleaved plans, the fallback, repeated plan numbers, the
  cache and failure path, a real temporary repository, and the dashboard response.
- Typecheck and lint pass. Full test run: the same two failures as before this change (the older
  stylesheet rules check and the plan-pair coverage test).

## Choices
- 30-minute gap cap and a two-commit minimum. A single long step before one commit is undercounted.
- A summary-timed plan is always drawn approximate now, whatever its text said.
