---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 01
subsystem: planning
tags: [deviations, user-confirmation, contract-fidelity, decision-record]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-RESEARCH 'Contract conflicts to resolve' (C1 to C14), the six plan-review items (X1 to X6), 11-CONTEXT D-01 to D-17, 11-UI-SPEC"
provides:
  - "The user's recorded answer for each of the fourteen research deviations and six plan-review items"
  - "A re-plan list (none), so wave 2 starts without /gsd-plan-phase 11"
  - "The confirmation appended inside the decisions block of 11-CONTEXT.md"
affects: [11-03, 11-04, 11-05, 11-06, 11-07, 11-09, 11-10, 11-11, 11-12, 11-13, 11-15, 11-16, 11-17, 11-18, 11-19, 11-20, 11-21, 11-22, 11-23, 11-24, 11-25, 11-26, 11-27, 11-28, 11-29, 11-31]

actuals:
  tokens: 1500
  tasks: 2
  commits: 1
plan_head_before: 92ce026838db65736cc4c6b4c4c18e3a166ed2f6
plan_head_after: 71e915d4c55ece17a1ce21f8e233866b91e32bba

tech-stack:
  added: []
  patterns:
    - "Deviation confirmations are appended to CONTEXT as a subsection, never written over locked decisions"

key-files:
  created:
    - .planning/phases/11-exploration-handoff-report-and-workstream-pages/11-01-SUMMARY.md
  modified:
    - .planning/phases/11-exploration-handoff-report-and-workstream-pages/11-CONTEXT.md

key-decisions:
  - "All of C1 to C14 and X1 to X3 are adopted as the plans build them; no plan is re-planned"
  - "X4, X5 and X6 approve the fifth type size (--fs-display-1 for the spike and big tile counts, --fs-fluid-1 for the workstream head lead)"
  - "C1 reads D-01's spike address as the Phase 7 key plus a redirect, and C12 shows the Completed bar only while one live workstream remains"

requirements-completed: [VIEW-14, VIEW-17, VIEW-18, VIEW-19, VIEW-20]

coverage:
  - id: D1
    description: "The user's answer for each of C1 to C14 and X1 to X6 is recorded in the Deviation answers table"
    requirement: "VIEW-20"
    verification:
      - kind: other
        ref: "grep -c '^| C' and grep -c '^| X' on 11-01-SUMMARY.md print 14 and 6"
        status: pass
    human_judgment: false
  - id: D2
    description: "The confirmation sits beside the locked decisions in 11-CONTEXT.md and no existing line was removed"
    requirement: "VIEW-20"
    verification:
      - kind: other
        ref: "git diff --numstat on 11-CONTEXT.md reports 0 deleted lines; grep -c 'Confirmed research deviations (11-01)' prints 1"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-07
status: complete
---

# Phase 11 Plan 01: Research deviation confirmation Summary

**The user adopted all fourteen research deviations (C1 to C14) and the three plan-review items X1 to X3, approved the fifth type size on X4 to X6, and the answers now sit in this file and beside the locked decisions in 11-CONTEXT.md.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-11-07
- **Completed:** 2026-11-07
- **Tasks:** 2 (Task 1 a blocking decision checkpoint answered by the user, Task 2 the record)
- **Files modified:** 2

## Accomplishments

- Task 1 put the C1 to X6 table to the user; the reply was "approve all": every C and X1 to X3 item adopted as the plans build it, and X4 to X6 each approve the fifth size.
- The answers are recorded below as twenty table rows, plus a Re-plan required section that reads `none`, so wave 2 may start once 11-02 (already complete) is merged.
- 11-CONTEXT.md gained "### Confirmed research deviations (11-01)" as the last subsection of the decisions block, one line per item with its answer, the date and the plans. No line of D-01 to D-17, Claude's Discretion or the Deferred Ideas changed.

## Deviation answers

The user's reply to Task 1 was "approve all" (2026-11-07). The orchestrator presented the options "adopt all; X4 approve; X5 approve; X6 approve", so every C item and X1 to X3 is adopted, and X4 to X6 approve the fifth size.

| Item | Answer | Plans |
|------|--------|-------|
| C1 | adopted | 11-15, 11-16, 11-18 |
| C2 | adopted | 11-18 |
| C3 | adopted | 11-03, 11-13 |
| C4 | adopted | 11-03, 11-16 |
| C5 | adopted | 11-13, 11-19 |
| C6 | adopted | 11-05, 11-12 |
| C7 | adopted | 11-29, 11-31 |
| C8 | adopted | 11-03, 11-27 |
| C9 | adopted | 11-06, 11-07, 11-10 |
| C10 | adopted | 11-09, 11-17, 11-20, 11-24 |
| C11 | adopted | 11-09, 11-20, 11-21, 11-26 |
| C12 | adopted | 11-28, 11-29, 11-31 |
| C13 | adopted | 11-04, 11-06 |
| C14 | adopted | 11-07, 11-13 |
| X1 | adopted | 11-10, 11-11 |
| X2 | adopted | 11-10, 11-15, 11-18, 11-22, 11-23, 11-24, 11-25, 11-26 |
| X3 | adopted | 11-19 |
| X4 | approve (the fifth size, spike column counts at --fs-display-1) | 11-15, 11-16 |
| X5 | approve (the fifth size, big tile counts at --fs-display-1) | 11-18, 11-19 |
| X6 | approve (the fifth size, head lead at --fs-fluid-1) | 11-31 |

What adoption means in practice:

- C1: Phase 7 addresses stay the keys; bare /spikes redirects to the manifest (else the first spike), bare /indexes to the first tile; no alias.
- C2 to C4: the document route lets intel and graph skip the File details card; intel/ and graphs/ accept .md and .json (the pins change on purpose); a new file class `listed` is decided before any read.
- C5, C6: synthesis chips use the file's own words; spike id and name come from the folder, verdict recovered by one line scan when YAML fails.
- C7, C8, C12: the Active mark reads `.planning/active-workstream` once, validated against listed names; a live workstream folder keeps a project from reading as map-only; the index and its Completed bar exist only while one live workstream remains.
- C9, C10, C11: both pause task shapes are read; session report numbers are lifted as written; the onboarding command is verbatim, with a quiet "The first screen suggests" block when a map-only project's differs.
- C13, C14, X1 to X3: the marker is read from raw JSON and the frontmatter fence lines; a new index handler keeps body to a bounded digest; all pause addresses open the pause page; unshapeable files fall through silently to the promoted sections; closing an Indexes tile collapses it in place.

## Re-plan required

none

## Task Commits

1. **Task 1: The user confirms the research deviations and the plan-review items** - no commit (blocking-human decision checkpoint; answered "approve all")
2. **Task 2: Record the answers in the summary and beside the decisions** - `71e915d` (docs; the CONTEXT subsection, 24 lines added, 0 deleted)

**Plan metadata:** the commit that adds this SUMMARY (docs: complete plan)

## Files Created/Modified

- `.planning/phases/11-exploration-handoff-report-and-workstream-pages/11-01-SUMMARY.md` - the Deviation answers table and the Re-plan required list
- `.planning/phases/11-exploration-handoff-report-and-workstream-pages/11-CONTEXT.md` - "### Confirmed research deviations (11-01)" appended inside the decisions block

## Decisions Made

- Every research deviation and plan-review item is adopted as the plans build it, so no plan is revised before wave 2.
- The fifth type size is approved for the spike column counts (X4), the big Indexes tile counts (X5) and the workstream head lead (X6); the plans that branch on those sizes take the approve branch.
- C1 and C12 change the wording of D-01 and D-13 in effect; they are recorded as the user answered them and the decisions themselves stay unedited.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Re-plan required is `none`: wave 2 plans may start their first-task precondition check against "## Deviation answers" and find every row adopted or approved.
- No blockers.

---
*Phase: 11-exploration-handoff-report-and-workstream-pages*
*Completed: 2026-11-07*

## Self-Check: PASSED

- 11-01-SUMMARY.md and 11-CONTEXT.md exist on disk
- Commit 71e915d is an ancestor of HEAD
- Plan verify command passed: 14 C rows, 6 X rows, one Confirmed research deviations subsection, 17 D-NN lines, 0 deleted lines in 11-CONTEXT.md
