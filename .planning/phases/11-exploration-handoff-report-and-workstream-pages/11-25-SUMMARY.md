---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 25
subsystem: web-views
tags: [forensics, view-18, evidence-rail, heat-map, sketch-060, view-kind]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-17 winner 060 B (Evidence rail), 11-20 structured.forensics lift, 11-09 made-up Lendshed forensics reports, 11-01 adopted X2, 11-24 view wiring pattern"
provides:
  - "The 'forensics' view kind (38th) and its manifest: every forensics/report-*.md opens the Evidence rail page"
  - "composeForensics (pure), ForensicsView and forensicsHeaderProps, the phase-11-forensics CSS block, design-language tone rows and the forensics Language bullet"
affects: [11-26, 11-27, 11-30]

tech-stack:
  added: []
  patterns:
    - "A flat lift grid (phase by artifact cells) rebuilt into rows and columns by the first artifact name repeating, so two rows with the same phase text never merge"
    - "A claim made by the page (No anomalies were detected.) is drawn only where the report has the section that lists none"

key-files:
  created:
    - src/web/views/forensics-page.ts
    - src/web/views/forensics-page-components.tsx
    - test/web/forensics-page.test.ts
  modified:
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/view-registry.test.ts

key-decisions:
  - "Anomaly confidence is never toned: the chip is untoned and the card's left rule repeats it (heavy HIGH, medium MEDIUM, dashed LOW, dotted for any other word). A word outside the three is shown as written in a dashed chip after LOW; no confidence in the heading draws no chip."
  - "Artifact grid: a present cell is a complete square (its own note beside it, or a screen-reader-only Present), an absent cell a missing outlined square with the word Absent, a cell the lift could not classify a quiet square with the cell as written or Not stated. The missing tone is an expected file that did not appear, never destructive."
  - "'No anomalies were detected.' is drawn only when the report has an Anomalies Detected section (the lift's note, or the rendered section heading) that lists none; a hypothesis-only report draws no Anomalies block and makes no claim."
  - "The git span axis is drawn only when the Time span, Last commit and Generated days all read and span more than one day; a same-day report (the real writer shape for a fresh run) draws the two lists only."
  - "The anomaly cards are native details folds with the first open, as the sketch drew them."

patterns-established:
  - "A scroll container that holds screen-reader-only absolute spans must itself be positioned, or the spans widen the page"

requirements-completed: [VIEW-18]

actuals:
  tokens: 52000
  tasks: 3
  commits: 3

duration: 70min
completed: 2026-11-07
status: complete
commits: 3
plan_head_before: e415d53c85701fd700da0cb761159c360f4e0787
plan_head_after: 483eb52eca5a42b01a98dd32fee92ec19983ac2d
---

# Phase 11 Plan 25: Forensics page Summary

**Every forensics/report-*.md opens the sketch 060 B Evidence rail: the report's own root cause hypothesis (heavy left rule) and numbered recommended actions verbatim and first, then anomaly cards (HIGH first, untoned confidence chips, a rule weight that repeats the confidence) beside a sticky rail of the artifact grid as a heat map with the word Absent in every missing cell over a git span axis and the Git Activity and Planning State lists.**

## Performance

- **Tasks:** 3 (Task 1 a tracer, verified end to end in a real browser before expansion)
- **Files created:** 3, modified: 7

## Accomplishments

- Task 1 (tracer): the `forensics` kind (38), manifest with `forensicsPage: composeForensics` and the promote fallback, the artifact-page wiring (one `useMemo`, header props, one render branch), the Problem note, hypothesis and actions, and the first `phase-11-forensics` CSS. A real browser opened report-20260402-101500 before anything was expanded.
- Task 2: anomalies, the evidence lists, the git axis and the artifact heat map; design-language tone rows (complete, quiet, missing) and the forensics bullet; 26 tests including the view contract.
- Task 3: side-by-side with the 060 winner and the D-14 real-shape report; fixes below.

| State | File | What the page draws |
|-------|------|---------------------|
| anomalies at each confidence | report-20260402-101500.md | hypothesis and 3 numbered actions verbatim; cards HIGH, MEDIUM, LOW (file order was MEDIUM, HIGH, LOW) with the first open; heat map 4 phases by 5 artifacts, 11 of 20 absent; axis 03-28, 04-01, 04-02 |
| no anomalies | report-20260406-090000.md | "No anomalies were detected." in a dashed quiet note; 1 of 15 absent; axis 04-01, 04-05, 04-06 |
| a confidence outside the three | planted copy in the test | "Uncertain" in a dashed chip, sorted after LOW |
| hypothesis only | planted | no Anomalies block, no claim, no grid, no rail |
| one-day git span | planted (real shape) | no axis, the lists as written |
| none of the headings | planted | `composeForensics` null, promoted sections silently (X2) |
| markup in the text | planted | rendered as text, no element |

## Side-by-side with the 060 winner (Task 3)

Shots in a scratchpad folder outside the repository (never committed): Lendshed's two forensics reports with `--sketch` (12 PNGs, no FAIL line, the exact verify command exits 0), and by hand the D-14 scratch copy's forensics report (copied to a temporary root, six phases, six anomalies, one "none found") at 1280 and 390, light and dark, no FAIL line and no sideways page scroll.

Matches the layout contract (hypothesis with heavy left rule, numbered actions, anomaly cards with weight-coded left rules, sticky right rail leading with the heat map then the evidence summary, one column at 390 with the rail last). What changed after the side-by-side:

1. **A scroll box of the heat map widened the whole page** on the real report (six phases, 1800px document at 1280): its screen-reader-only spans were absolutely positioned against the page. The scroller is now positioned.
2. **Grid columns fit their own notes** rather than equal shares, so "passed 4/4" and "(6/6)" no longer break mid-word at 390; the heat map scrolls inside its card when the phases do not fit (the sketch squeezed them).
3. **A cell note keeps its inline code** (the real file has "(`human_needed`, 4/5)").
4. **Chip padding** matches the sketch.

Differences kept on purpose: the header is the app's own (crumbs "Dashboard / Roadmap / {file}", Copy path icon, View/Source on the right) and the Problem note sits under it in the page body; the sketch's muted lead-in line above the hypothesis ("Based on the evidence above, the most likely explanation is:") is not drawn (see deviations).

## Task Commits

1. **Task 1: A forensics report opens with its hypothesis and recommended actions** - `b4653db` (feat)
2. **Task 2: Anomalies, the evidence and the artifact grid** - `7dcb7f7` (feat)
3. **Task 3: The forensics page after the side-by-side** - `483eb52` (fix)

**Plan metadata:** the commit that adds this SUMMARY.

## Verification

- Full gate (`npm run test:gate`): total=6934 passed=6934 failed=0 skipped=0 todo=0; typecheck, lint and `npm run build` clean.
- Task 1, 2 and 3 targeted gates and the screenshot commands pass.
- Not done: `systemctl --user restart labelore` (named in all three tasks). The service serves the main checkout, not this worktree; after the merge the main checkout needs `npm run build` and a restart.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Heat-map scroller let absolutely positioned words widen the page**
- **Found during:** Task 3 (the hand-shot real report reported "the page scrolls sideways" at 390px, and the 1280 shot was 1800px wide)
- **Fix:** `position: relative` on the scroller; columns sized to their notes.
- **Commit:** 483eb52

### Plan wording versus the build

- The 060 sketch draws the writer's lead-in sentence above the hypothesis. 11-20's lift drops that sentence by design and the lift is outside this plan's files, so the page draws the paragraph only; the sentence is visible in Source mode.
- The page's "Absent" cell may carry a note when the writer's cross mark had one (`❌ (0/32)`), shown after the word.
- The anomaly cards are drawn with the lift's own order re-applied in the composer (stable sort), so an input that arrives unordered still reads HIGH first.

**Total deviations:** 1 auto-fixed, 3 notes. **Impact:** none on scope.

## Flagged assumptions

- **VIEW-18 edge probe (11-20), answered for forensics.** A forensics file with no Anomalies section draws no anomalies block and no "none" claim (tested); a file with none of the known headings falls through (tested).
- **Same-day git span.** The real writer's span is often one day, so the axis is not drawn for it (nothing to place); the lists carry the full timestamps as written.
- **Confidence missing from a heading** draws the card with no chip (no invented word).
- **Phase numbers** in the heat header are the grid's own leading number; a phase text not starting with a number falls back to its ordinal and the full text in the legend.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-11-40: every string reaches the DOM as React text through ResearchInline (planted markup is tested to render as text), the contract test forbids the raw-HTML prop, any request and any storage.

## Self-Check: PASSED

- Created files exist: forensics-page.ts, forensics-page-components.tsx, forensics-page.test.ts all FOUND.
- Commits `b4653db`, `7dcb7f7` and `483eb52` are ancestors of HEAD.
- Acceptance checks: `'forensics'` in kinds.ts 1, `toBe(38)` in view-registry.test.ts 1, "Root cause hypothesis" in forensics-page.ts at least 1, "No anomalies were detected." in forensics-page.ts at least 1, "view contract" in forensics-page.test.ts at least 1.
