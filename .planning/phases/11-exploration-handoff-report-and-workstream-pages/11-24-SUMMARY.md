---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 24
subsystem: web-views
tags: [report, session-report, milestone-summary, view-18, time-ruler, sketch-059, view-kind]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-17 winner 059 A (Time ruler, one frame), 11-20 structured.report lift, 11-09 made-up Lendshed reports, 11-01 adopted C10 and X2, 11-22 and 11-23 view wiring pattern"
provides:
  - "The 'report' view kind (37th) and its manifest: every reports/ file opens the Time ruler page, session report and milestone summary in one frame"
  - "composeReport (pure), ReportView and reportHeaderProps, the phase-11-report CSS block, design-language tone rows and the report Language bullet"
affects: [11-27, 11-30]

tech-stack:
  added: []
  patterns:
    - "A headline value split at its closing parenthetical so main plus note is the file's own text again (verbatim, never computed)"
    - "Sections the page does not compose are claimed from input.groups by number prefix and drawn through the document's sanitised HTML as plain sections or closed bars"

key-files:
  created:
    - src/web/views/report-page.ts
    - src/web/views/report-page-components.tsx
    - test/web/report-page.test.ts
  modified:
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/view-registry.test.ts

key-decisions:
  - "One frame for both report kinds (the 11-17 answer): the ruler is a 24 hour clock for a session and a calendar for a milestone; the numerals are Duration, Commits, Plans or the five Stats."
  - "Headline numerals are shown as written: main text up to a closing parenthetical, the parenthetical beside it as meta (plan ids as chips when a short comma list). A line the report lacks draws no numeral and never a 0. A value longer than 16 characters falls to body size."
  - "A report with no blockers draws no blockers block and no 'None blocking' line (plan truth and UI-SPEC rule 4), which differs from the sketch's clear-state dashed note: the lift drops the writer's own 'None blocking.' bullet, so the page cannot tell it from an absent section."
  - "Requirement reading rule (the sketch-only 'not covered' state): the mark on the bullet decides. A check mark is Covered (complete), a cross mark is Not covered (quiet, dashed, all its ids), no mark is a quiet square with no word. Ranges like 'MEMB-01 ... MEMB-05' expand to id squares."
  - "The phase strip follows winner A (cells with 'Phase N', done and touched), reading 'N of the M ... phases' from the progress sentence; cells are labelled 'Phase N' only when the touched phases confirm 1-based numbering, otherwise by ordinal. More than 12 phases draws the shared StatusMeter instead."
  - "Phases delivered, Requirements coverage and Key decisions fall back to the document's own section when the lift holds no rows for them; an unknown heading becomes a closed bar, so nothing is lost."

patterns-established:
  - "Mark and edge labels on an axis that would collide or leave the card flip or drop (calendar end date shows once, clock stamps flip inside near either end)"

requirements-completed: [VIEW-18]

actuals:
  tokens: 70000
  tasks: 3
  commits: 3

duration: 75min
completed: 2026-11-07
status: complete
commits: 3
plan_head_before: e069f07ea1d1e2337461f5add4c45bca68dfb733
plan_head_after: cb90901b49a57a9e28dd53607c07c575048e1c34
---

# Phase 11 Plan 24: Report page Summary

**Every reports/ file opens the sketch 059 A Time ruler: a card of the report's own headline numerals (Duration, Commits, Plans, or the milestone's Stats) over a 24 hour clock or a delivery calendar, a phase strip and progress sentence, then Key outcomes, Phases touched, Decisions and an in-flight Blockers box over closed Files Changed and Resource Usage bars, or Phases delivered, Requirements coverage with marks and Key decisions.**

## Performance

- **Tasks:** 3 (Task 1 a tracer, verified end to end through the screenshot helper before expansion)
- **Files created:** 3, modified: 7

## Accomplishments

- Task 1 (tracer): the `report` kind (37), manifest with `reportPage: composeReport` and the promote fallback, the artifact-page wiring (one `useMemo`, header props, one render branch), the numerals and the `phase-11-report` CSS block. A real browser opened SESSION_REPORT.md before anything was expanded.
- Task 2: the full composer and components for both variants, design-language tone rows (complete, in-flight, quiet) and the report bullet, and 40 tests including the view contract.
- Task 3: side-by-side with the 059 winner; fixes below.

| State | File | What the page draws |
|-------|------|---------------------|
| session, blockers | SESSION_REPORT.md | numerals "~5 hours" (stamps as meta), "17", "3" (chips 01-04, 01-05, 01-06); clock bar 13:42 to 18:51; phase strip 1 done, 1 and 2 ringed; seven numbered outcomes; three in-flight blockers (two `Phase 1` chips); Files changed and Resource usage closed |
| session, none | 20260409-session-report.md | "Single session" kept on a dashed empty axis; no blockers block; Decisions as the file's sentence |
| milestone | MILESTONE_SUMMARY-v1.0.md | five Stats as written, calendar with marks 1 to 4, four delivered rows (complete), four Covered requirement rows with expanded ids and the audit verdict, per-phase decision bars over a closed 18-row table, Tech debt as a plain section, sections 1, 2 and 7 as closed bars, a chip index 1 to 7 then Stats |
| one not covered | planted copy in the test | a cross-marked MOVE-05 bullet reads Not covered, quiet and dashed |
| no headline numbers | planted | no numeral, no ruler, no 0, outcomes still shown |
| none of the headings | planted | `composeReport` null, promoted sections silently (X2) |

## Side-by-side with the 059 winner (Task 3)

Shots in a temporary scratchpad folder outside the repository (never committed): Lendshed's three reports through `shoot-pages.ts` with `--sketch` (16 PNGs, no FAIL line, the exact verify command exits 0), a milestone sketch copy (default state changed in a scratch copy) beside the milestone page, and by hand the D-14 scratch copy's SESSION_REPORT.md and MILESTONE_SUMMARY-v1.0.md at 1280 and 390, light and dark, with no FAIL line and no sideways scroll (the real milestone has a 66-row decisions table, closed in a scroll box, and 9 requirement rows with odd id lists that degrade to chips of the written text).

Matches the layout contract (numerals card over ruler and phase strip, two columns at 1280 and one at 390, folds closed, Blockers box in-flight). What changed after the side-by-side:

1. **Clock stamps flip inside the axis** near either end of the day (the real report's last commit at 23:41 left the card).
2. **The calendar's last mark no longer collides with the end date**: an edge mark draws no MM-DD under it (the end label already names the day); under 42rem the MM-DD labels are hidden (the delivered rows list the dates).
3. **The "Single session" chip sits above the axis** so it no longer covers the 12:00 label.
4. **Sections from the document get list markers and paragraph spacing** (Tech debt and the closed bars), which the shared document styles drop in this context.
5. **Long numerals fall to body size** (Timeline "2026-01-12 → 2026-03-20" wrapped mid-date at heading size).

Differences kept on purpose: the header is the app's own (crumbs "Dashboard / Roadmap / {file}", Copy path icon, View/Source on the right); the Timeline numeral shows the file's dates with "68 days" as meta (as written) where the sketch computed "68 days" as the numeral and Files changed shows the file's whole sentence where the sketch showed "212"; the architecture bar has no "6 DECISIONS" count (no lift of section 2); the clear-state "None blocking." note is not drawn (see decisions).

## Task Commits

1. **Task 1: A session report opens with its three headline numbers** - `70d6460` (feat)
2. **Task 2: The full session report and the milestone summary** - `03fa3e5` (feat)
3. **Task 3: The report page after the side-by-side** - `cb90901` (fix)

**Plan metadata:** the commit that adds this SUMMARY.

## Verification

- Full gate (`npm run test:gate`): total=6901 passed=6901 failed=0 skipped=0 todo=0; typecheck, lint and `npm run build` clean.
- Task 1, 2 and 3 targeted gates and the screenshot commands pass.
- Not done: `systemctl --user restart labelore` (named in all three tasks). The service serves the main checkout, not this worktree; after the merge the main checkout needs `npm run build` and a restart.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `letter-spacing: normal` failed the token guard**
- **Found during:** Task 1 verify
- **Fix:** `var(--ls-normal)`.
- **Commit:** 70d6460

**2. [Rule 1 - Bug] Two collisions found by the side-by-side** (calendar end label over the last mark, "Single session" chip over the 12:00 label) and a clock stamp leaving the card on the real report; fixed as listed above.
- **Commit:** cb90901

### Plan wording versus the build

- Task 2 says phase progress "through the shared StatusMeter". The user chose winner A, which draws a phase strip with labelled cells, so the strip is built as drawn; the shared StatusMeter draws the progress only when the report names more than 12 phases (or counts that do not fit the strip).
- The sketch's clear-state "None blocking." note is not drawn (plan truth: no blockers block).
- The Files Changed fold does not show the writer's fixed "Token and cost estimates require API-level instrumentation" note: the lift does not carry it and the lift is outside this plan's files. Source mode shows it.

**Total deviations:** 2 auto-fixed, 3 notes. **Impact:** none on scope.

## Flagged assumptions

- **VIEW-18 edge probe (11-20), answered.** A session report with no headline numbers draws no numeral, no ruler and no 0 and still shows its outcomes (tested); a milestone missing sections lists only the numbered sections the file has (tested).
- **Not-covered mark.** The writer's own mark for an uncovered requirement was never observed; the page reads a cross mark as Not covered, a check mark as Covered and no mark as a quiet square with no word.
- **Phase strip numbering.** Cells read "Phase N" only when the touched phases fit 1..total; the real milestone 2.1 report (phase 11 of 13, 4 of 8 milestone phases) therefore labels its cells 1 to 8 by ordinal, which is the honest reading.
- **Plans chips** appear only for a short space-free comma list; the real "10-17, 10-21, 10-22, 10-23 and quick task 261106-joz" shows as written text.
- **Raw sections** (Tech debt, closed bars) depend on `input.groups`; where it is empty (a non-browser render) those sections draw nothing and no chip is listed for them.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-11-38: every string reaches the DOM as React text through ResearchInline, the contract test forbids the raw-HTML prop and any request, and the one place document HTML is drawn goes through the existing sanitised `renderHtml` with its leading heading stripped.

## Self-Check: PASSED

- Created files exist: report-page.ts, report-page-components.tsx, report-page.test.ts all FOUND.
- Commits `70d6460`, `03fa3e5` and `cb90901` are ancestors of HEAD.
- Acceptance checks: `'report'` in kinds.ts 1, `toBe(37)` in view-registry.test.ts 1, `reportPage: composeReport` in manifests.ts 1, "Blockers and open items" and "Phases delivered" in report-page.ts at least 1, `phase-11-report:start` in globals.css 1.
