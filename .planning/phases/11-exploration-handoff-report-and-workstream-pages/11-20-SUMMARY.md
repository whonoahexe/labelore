---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 20
subsystem: planning-repo
tags: [seed, thread, session-report, milestone-summary, forensics, onboarding, handlers, lifts]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-02 real writer shapes, 11-08 and 11-09 made-up Lendshed examples, 11-13 bounded-lift patterns, 11-01 adopted C10 and C11"
provides:
  - "structured.seed, structured.thread, structured.report (variant session or milestone), structured.forensics and structured.onboarding on the five artifact kinds"
  - "buildOnboardingContext: the summary's command and the map-only head's computed command, carried apart with a differs flag"
affects: [11-21, 11-22, 11-23, 11-24, 11-25, 11-26]

tech-stack:
  added: []
  patterns:
    - "Lift modules share small bounded readers exported from seed-thread-lift.ts (boldLabelLine, listItems, firstH1, findSection)"
    - "Tables read by a local cell splitter that keeps header order and never keys an object by author text"

key-files:
  created:
    - src/planning-repo/handlers/seed-thread-lift.ts
    - src/planning-repo/handlers/seed-thread.ts
    - src/planning-repo/handlers/reports-lift.ts
    - src/planning-repo/handlers/reports.ts
    - src/planning-repo/handlers/onboarding.ts
    - src/presentation/onboarding-context.ts
    - test/seed-thread-handler.test.ts
    - test/reports-handler.test.ts
    - test/onboarding-handler.test.ts
    - test/presentation/onboarding-context.test.ts
  modified:
    - src/planning-repo/handlers/index.ts

key-decisions:
  - "triggerWhen reads the frontmatter trigger_when, else the first **Trigger:** line anywhere in the body, else null; 'when relevant' stays verbatim and no field says a trigger is met"
  - "A lift returns null (no structured key) for a report, forensics or onboarding body with none of its known headings; seeds and threads always lift because they always have an id or a title from the file"
  - "Blockers bullets that only say there are none ('None blocking.') read as no blocker; a real blocker that merely starts with None is kept"
  - "differs is true only when both commands exist and are not the same text; a summary with no command has nothing to differ from"
  - "Milestone requirements are lifted from the check-mark bullets 11-02 recorded, not a table (the plan's wording said tables; the real shape is bullets)"

patterns-established:
  - "Shared lift readers in seed-thread-lift.ts, imported by reports-lift.ts and onboarding.ts"

requirements-completed: [VIEW-15, VIEW-16, VIEW-18]

actuals:
  tokens: 28800
  tasks: 3
  commits: 3

duration: 25min
completed: 2026-11-07
status: complete
commits: 3
plan_head_before: 9d55661f84bd879c54be3c49c3eaaa28cd022c23
plan_head_after: 005b22ce48cd7b5233557e819d81b9f545de425a
---

# Phase 11 Plan 20: Seed, thread, report, forensics and onboarding lifts Summary

**Five handlers in three modules lift seeds, threads, session reports, milestone summaries, forensics reports and onboarding summaries into the facts their pages lead with, verbatim and in the author's order, plus an onboarding context that carries the summary's command and the map-only head's computed command side by side.**

## Performance

- **Duration:** 25 min
- **Tasks:** 3 (Task 1 a tracer, verified end to end through the snapshot CLI before expansion)
- **Files created:** 10, modified: 1

## Accomplishments

- Seed lift: id (frontmatter, else the heading confirmed by the file name, else the file name's prefix), idea, status, planted (UTC day), plantedDuring, triggerWhen verbatim, scope (Small, Medium, Large or null), auditAcknowledged, and the five sections with the writer's placeholder text read as not stated.
- Thread lift: frontmatter fields or the older `# Thread:` and `## Status: OPEN` shape; next steps and references in the author's order with the placeholder bullets dropped.
- Report lift: variant by file name only. Session variant reads the bold-label head lines as written text (null when absent, never 0), outcomes, decisions (or the prose note), blockers and the resource table. Milestone variant reads the title version, the numbered sections in order, the stats strip, the phases table, the requirement bullets with the audit verdict and the decisions table (ids repeat across phases, so each row keeps its phase).
- Forensics lift: problem, hypothesis (the writer's lead-in sentence dropped), numbered actions verbatim, anomalies ordered HIGH, MEDIUM, LOW then others (stable), evidence subsections, and the artifact grid as phase by artifact cells with `present` true, false or null plus the cell as written.
- Onboarding lift and context: four project file rows, codebase facts, docs count, the command verbatim; `buildOnboardingContext` adds `firstScreen` (the Phase 10 head's `nextStep(mapReadiness(...))`) only for a map-only project, and `differs`.

## Task Commits

1. **Task 1: Seeds and threads lift** - `96cbec9` (feat)
2. **Task 2: Session reports, milestone summaries and forensics reports** - `43834a2` (feat)
3. **Task 3: Onboarding summary and its relation to the map-only head** - `005b22c` (feat)

**Plan metadata:** the commit that adds this SUMMARY.

## Verification

- Full gate (`npm run test:gate`): total=6641 passed=6641 failed=0 skipped=0 todo=0; typecheck, lint and `npm run build` clean.
- Tracer check: the Lendshed snapshot shows SEED-260411-m2x with `triggerWhen === null` and offline-mode with an open thread status.
- Handler registration order: the five new handlers sit after IndexIntelHandler and before ContinueHereHandler, so the pins in test/pause-handler.test.ts (ContinueHereHandler second to last, GenericMarkdownHandler last) hold.
- Not done: `systemctl --user restart labelore`. The service serves the main checkout, not this worktree; the orchestrator restarts it after the merge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Files Changed sentence read as a list item**
- **Found during:** Task 2 (before the first test run)
- **Issue:** the prose filter treated any line starting with a digit as a list item, so "18 files changed, ..." was dropped.
- **Fix:** the filter uses the same list-marker reader as the lift (`listItemText`).
- **Files modified:** src/planning-repo/handlers/reports-lift.ts
- **Commit:** 43834a2 (fixed before the commit)

**2. [Rule 3 - Blocking] Type error in the onboarding context**
- **Found during:** Task 3 typecheck
- **Issue:** the lifted `codebase` fallback `{}` had no readable properties.
- **Fix:** typed it as `Record<string, unknown>`.
- **Commit:** 005b22c

### Plan wording versus the real shape

- The plan says the milestone variant reads "the phases and requirements tables". The real milestone summary 11-02 recorded (and the Lendshed example copies) writes requirements as check-mark bullets, not a table, so requirements are lifted from those bullets. The decisions table (section 5) is also lifted, because 11-24 needs it and ids repeat across phases.
- `onboarding.ts` also holds the `OnboardingLift` types, not only `extractOnboarding` and the handler, so the context module imports its types from the handler module.

**Total deviations:** 2 auto-fixed (both caught before commit), 2 notes. **Impact:** none on scope.

## Flagged assumptions

Edge probes carried from the plan as unresolved (category unclassified, never auto-resolved). Each has a test-backed truth on the real artifact; the open questions and owners below are unchanged.

- **VIEW-15 (seeds), owner 11-22.** Open: two seed files carrying one id (plant-seed's residual same-day collision across workstreams), and Breadcrumbs or Notes past the 200-item bound (lists are capped at 200 here; the page has not decided what to show for the rest). Answered by 11-22's human screenshot review on every Lendshed seed and the D-14 real-shape seed.
- **VIEW-16 (threads), owner 11-23.** Open: a thread with neither a frontmatter status nor a `## Status:` line (the lift gives `status: null`; no source says what the page shows), and Next Steps past the 200-item bound. Answered by 11-23's human screenshot review on every Lendshed thread and the D-14 real-shape thread.
- **VIEW-18 (reports, forensics, onboarding), owners 11-24, 11-25, 11-26.** Open: how the report page shows a session report with no headline numbers (the lift gives null fields; 11-24 tests the no-blockers case, not this one), and a milestone summary missing some of its seven numbered sections (the lift lists only the sections present, never inventing a missing one). Answered by the human screenshot reviews on the Lendshed and D-14 real-shape files.
- **RESEARCH A1:** shapes follow 11-02's real run where it ran; a type it did not observe (the older `## Status:` thread, an `unknown` seed scope, an all-missing onboarding summary) follows the writer template.
- **Seed trigger fallback:** when the frontmatter has no `trigger_when`, a `**Trigger:**` line anywhere in the body is used (the Shapes seed has one outside any section). A seed with neither has `triggerWhen: null`.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path or file access was added; the onboarding command is carried as text and nothing runs it (T-11-33).

## Self-Check: PASSED

- Created files exist: all ten FOUND.
- Commits `96cbec9`, `43834a2` and `005b22c` are ancestors of HEAD.
- `grep -c` checks: SeedHandler 2, ThreadHandler 2, ForensicsHandler 2, OnboardingHandler 2 in index.ts; "edge probe VIEW-15" 3 and "edge probe VIEW-16" 3 in the seed and thread test; "edge probe VIEW-18" 4 in the reports test and 5 across the onboarding tests; `nextStep(` 1 in onboarding-context.ts; MILESTONE_SUMMARY 3 in reports-lift.ts.
