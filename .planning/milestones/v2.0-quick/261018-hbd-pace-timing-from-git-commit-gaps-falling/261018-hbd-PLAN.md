---
phase: quick-261018-hbd
plan: 01
type: execute
autonomous: true
files_modified:
  - src/server/file-dates.ts
  - src/server/commit-times.ts
  - src/server/dashboard-ledger.ts
  - src/server/index.ts
  - src/presentation/dashboard-pace.ts
  - src/web/pages/dashboard-pace.tsx
  - test/server/commit-times.test.ts
---

# Quick 261018-hbd: Pace timing from git commit gaps, falling back to SUMMARY duration

<objective>
A plan's SUMMARY `duration` is typed by an agent and means different things from plan to plan: active
time, wall-clock time across a usage-limit pause, only the last session, or a guess. Pace now times a
plan from the target repository's commits instead: each of the plan's commits (`feat(02-06): …`) adds
the gap since the commit before it, each gap capped at 30 minutes, so a pause counts as a break and
not as work. A plan with fewer than two commits, or a project with no git history, falls back to the
SUMMARY duration, drawn as approximate.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Commit timings behind a read-only git call, overlaid on Pace</name>
  <files>src/server/file-dates.ts, src/server/commit-times.ts, src/server/dashboard-ledger.ts, src/server/index.ts, src/presentation/dashboard-pace.ts, src/web/pages/dashboard-pace.tsx, test/server/commit-times.test.ts</files>
  <action>
- file-dates.ts: export a `createGitRunner(timeoutMs, maxBuffer)` so the commit log can use a larger
  buffer; the existing default runner is built from it unchanged.
- commit-times.ts: `createCommitLog(rootPath, run)` runs `git log --format=%at%x09%s` once (same
  hardened flags as file-dates: no fsmonitor, no optional locks, no prompt, no pager), cached until
  `reset()`, null on any failure. Pure `applyCommitTimes(plans, commits)`: commits sorted by time;
  a commit whose scope is a plan id (`type(02-06)`, leading zeros ignored) adds min(gap, 30 min), the
  gap measured from the plan's own previous commit, or from the commit just before for its first.
  Plan ids that recur across milestones take each commit by the nearest `completed` date; when one of
  them has no date the id stays on its summaries. Two or more commits give `timing: 'commits'`
  (exact); otherwise a summary-timed plan becomes `timing: 'summary'`, approximate.
- dashboard-ledger.ts: PacePlanDto gains `timing` and `commits`.
- index.ts: /api/dashboard awaits the commit log and builds the view model from a presentation whose
  pace plans carry the overlay; /api/refresh resets the cache.
- dashboard-pace: the tooltip says "from N commits" or "from its summary"; the key reads "Active time,
  from commits" and "From the plan's summary".
  </action>
  <verify><automated>npx vitest run test/server/commit-times.test.ts test/presentation/dashboard-pace.test.ts test/server/dashboard-ledger.test.ts && npm run typecheck && npm run lint</automated></verify>
  <done>Pace times plans from commits where the history has them, and from summaries otherwise.</done>
</task>

</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| T-hbd-01: git writes to or runs hooks in the target repository | Same hardening as file-dates: execFile with an argument array, `core.fsmonitor=false`, `GIT_OPTIONAL_LOCKS=0`, no prompt, no pager; `log` only. |
| T-hbd-02: a huge history stalls the server | `--max-count`, a timeout and a buffer cap; failure gives null and the summaries are used. |
| T-hbd-03: commit subjects are untrusted text | Only a numeric timestamp and an id matched by a bounded regex are read; nothing is rendered. |
</threat_model>
