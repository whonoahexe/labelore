---
phase: 09-review-audit-and-root-document-pages
plan: 04
subsystem: ui
tags: [dashboard, presentation, state-md, react, vitest]

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "09-01 sourceUrlOf and the STATE.md redirect to the dashboard"
provides:
  - "buildStateSession(): STATE.md's Session Continuity, Deferred Items and Operator Next Steps as one capped, never-throwing projection"
  - "DashboardHead.session and DashboardHead.projectUrl"
  - "Stopped, Resume, Then and Deferred lines on the Next up card; the About this project link in the dashboard head"
affects: [09-07 project page (closes the dashboard/charter pair), 09-06 design-language sentence]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2
plan_head_before: f72c19ec2e41e7a89da0b48b2058af882f2fb112
plan_head_after: d34977bcb7cea5fd80b7192d51dee3486f269e48

tech-stack:
  added: []
  patterns:
    - "Single-pass bounded line scans over a 20,000-character-capped section body; every href is an artifact key or sourceUrlOf plus a stableSlug anchor"

key-files:
  created:
    - src/presentation/state-session.ts
    - test/presentation/state-session.test.ts
  modified:
    - src/presentation/dashboard-head.ts
    - src/web/pages/dashboard-page.tsx
    - test/fixtures/lendshed/.planning/STATE.md
    - test/presentation/dashboard-head.test.ts

key-decisions:
  - "The scanner counts Deferred Items rows in its own single pass instead of calling parseMarkdownTable, so blank rows are skipped without building row objects"
  - "A zero deferred count renders no Deferred line (an empty table is the same as an absent section)"
  - "state-session.ts imports activityDateLabel from dashboard-head.ts while dashboard-head.ts imports buildStateSession; the cycle is runtime-safe because each is only used inside functions"

patterns-established:
  - "Session lines reuse project-next-last / project-next-label / text-link, so the dashboard gains no class name and no CSS"

requirements-completed: [VIEW-07]

coverage:
  - id: D1
    description: "The Next up card shows Stopped, Resume, Then (+N more) and Deferred lines from STATE.md, each omitted when its section is absent, every link an artifact key or a source anchor"
    requirement: VIEW-07
    verification:
      - kind: unit
        ref: "test/presentation/state-session.test.ts"
        status: pass
      - kind: unit
        ref: "test/presentation/dashboard-head.test.ts#dashboard head session lines"
        status: pass
    human_judgment: true
    rationale: "How the four lines read inside the Next up card (spacing, uppercase text-link in a paragraph) is a visual judgment no unit test asserts; the orchestrator should look at the dashboard after the merge restart"
  - id: D2
    description: "A 200k-character Session Continuity line and a 10,000-row Deferred Items table finish without throwing, every field capped"
    requirement: VIEW-07
    verification:
      - kind: unit
        ref: "test/presentation/state-session.test.ts#finishes a 200k-character Session Continuity line and a 10,000-row table, every field capped"
        status: pass
    human_judgment: false
  - id: D3
    description: "The dashboard head shows one 'About this project' text-link with an arrow, to the root PROJECT.md address; none when the root PROJECT.md is absent or only nested"
    requirement: VIEW-07
    verification:
      - kind: unit
        ref: "test/presentation/dashboard-head.test.ts#dashboard head project link"
        status: pass
    human_judgment: true
    rationale: "The link's placement under the lead is visual; the address logic is unit-tested"

duration: 12min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 04: Dashboard session lines and project link Summary

**The dashboard's Next up card now says where the last session stopped, which file to resume, the next operator step and how many items are deferred, all read from STATE.md through a capped never-throwing projection, and the head links to the project page.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-11-03T07:32Z
- **Completed:** 2026-11-03T07:45Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `buildStateSession()` projects Session Continuity (Stopped at, Last session, Resume file), Deferred Items (non-blank data-row count) and Operator Next Steps (up to 20 top-level bullets, 400 characters each); null when STATE.md has none of the three sections.
- The Resume link resolves only when the path equals an artifact's path (a leading `./` dropped, `.planning/` prefixed when missing); otherwise the file name shows as plain text. `+N more` and `Deferred` link to `/state?source=1#<stableSlug of the heading>`.
- `DashboardHead.projectUrl` is the key of the root PROJECT.md (`/project` for Lendshed); a research or phase-folder PROJECT.md never sets it. The About this project link sits after the lead.
- Lendshed STATE.md gained invented Deferred Items (3 rows), Session Continuity and Operator Next Steps sections; the full suite (225 files, 4924 tests, zero skipped) stayed green.

## Task Commits

1. **Task 1: The dashboard shows STATE.md's session, next steps and deferred items** - `c465ac6` (feat)
2. **Task 2: The dashboard links to the project page** - `d34977b` (feat)

**Plan metadata:** committed after this file (docs: complete plan)

## Files Created/Modified

- `src/presentation/state-session.ts` - StateSession and buildStateSession
- `src/presentation/dashboard-head.ts` - DashboardHead.session and .projectUrl
- `src/web/pages/dashboard-page.tsx` - SessionLines in the Next up card; the About this project link
- `test/fixtures/lendshed/.planning/STATE.md` - made-up session, deferred and next-step sections
- `test/presentation/state-session.test.ts` - behavior, link-safety, malformed-input and growth tests
- `test/presentation/dashboard-head.test.ts` - session and projectUrl assertions; the bare-PROJECT.md equality now lists the two new fields

## Decisions Made

See key-decisions above. Followed the plan otherwise.

## Deviations from Plan

None - plan executed exactly as written. Two notes that are not rule deviations:

- The plan's finish step `systemctl --user restart labelore` was skipped by the parallel-executor instruction (the service serves the main checkout); the orchestrator restarts after merge. `vite build` was run in the worktree and succeeds.
- Tests, typecheck and lint were run through the main checkout's binaries (`vitest`, `tsc`, `eslint`, `vite`) from the worktree root, since the worktree has no node_modules; `npm run test:gate` was replaced by plain `vitest run` (225 files passed, nothing skipped or todo).

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file access or write path; the only new href sources are artifact keys and `sourceUrlOf` plus a `stableSlug` anchor (T-09-09), and section bodies are capped before scanning (T-09-08).

## Next Phase Readiness

The dashboard half of the dashboard/charter pair is in place; 09-07's project page can close it with "Where the work is now", and 09-07 writes the design-language sentence naming the About link.

## Self-Check: PASSED

- `src/presentation/state-session.ts` and `test/presentation/state-session.test.ts` exist.
- Commits `c465ac6` and `d34977b` are ancestors of HEAD.
- `buildStateSession(` appears once in dashboard-head.ts, `Session Continuity` once in the Lendshed STATE.md, `About this project` once in dashboard-page.tsx.

---
*Phase: 09-review-audit-and-root-document-pages*
*Completed: 2026-11-03*
