---
status: diagnosed
phase: 08-several-projects-and-a-switcher
source: [08-VERIFICATION.md]
started: 2026-10-31T09:59:12Z
updated: 2026-10-31T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Compare the built switcher, landing page and add dialog with winning sketches 039 A and 040 B (1280px and 390px, light and dark)
expected: The build reads as the chosen sketches, and each difference listed in 08-15-SUMMARY is accepted or rejected.
result: pass
note: "Run and judged by Claude on 2026-10-31 at the user's request (npx playwright test test/e2e/projects-screenshots.spec.ts: 5 passed; 12 build/sketch pairs compared). All three surfaces read as 039 A and 040 B in both themes at both widths. Every difference listed in 08-15-SUMMARY is present as described and judged acceptable. One unlisted difference: the add dialog's 'Scan a folder instead' link is uppercase sans in the build and mono Label style in the sketch. Cosmetic. The 390px chevron-only trigger is carried to test 2."


### 2. Open the header at 390px wide with any project open
expected: You can tell which project is current. In the build, the trigger at this width shows only a chevron, a 40px square with no name (test-results/phase-08/switcher-390-light.png). Contract fact 6 is met literally. Decide whether to accept that or open a follow-up.
result: issue
reported: "At 390px the header trigger is a bare 40px chevron with a 0px name; nothing in the header says which project is open, so you have to open the switcher to find out. The sketch shows the name and meta at this width by collapsing the snapshot pill to a dot. Judged by Claude on 2026-10-31 at the user's request from test-results/phase-08/switcher-390-{light,dark}.png."
severity: major


## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-08-2
  truth: "At 390px wide with a project open, the header shows which project is current"
  status: failed
  reason: "User reported: At 390px the header trigger is a bare 40px chevron with a 0px name; nothing in the header says which project is open, so you have to open the switcher to find out. The sketch shows the name and meta at this width by collapsing the snapshot pill to a dot. Judged by Claude on 2026-10-31 at the user's request from test-results/phase-08/switcher-390-{light,dark}.png."
  severity: major
  test: 2
  root_cause: "Sketch 039 A's 42rem header rules were never ported (snapshot label not hidden, controls/pill/search/lockup padding not tightened), so the 'auto' controls track in the narrow header grid (auto minmax(0,1fr) auto) takes 237.8px at 390px, leaving the brand column 100px; .brand-project is the only shrinkable child and collapses to 0px."
  artifacts:
    - path: "src/web/styles/globals.css"
      issue: "@media (max-width: 42rem) shell block (~3880-3922) lacks .snapshot-label hide and the --space-2 padding/margin tightening from the sketch; stale comment at ~3900-3905 describes a full-width controls row that no longer exists"
    - path: "test/e2e/projects-screenshots.spec.ts"
      issue: "contract A at 390 and the long-text test never assert the name's visible width (scrollWidth > clientWidth passes at clientWidth 0)"
    - path: "test/e2e/switcher.spec.ts"
      issue: "390 popup test and long-name test (329-344) do not assert .brand-project-name clientWidth > 0"
  missing:
    - "Port sketch 039 A 42rem rules: .snapshot-label {display:none}; .shell-controls padding-inline var(--space-2); .snapshot-pill, .search-trigger padding-inline var(--space-2); .brand-lockup margin-right var(--space-2)"
    - "Fix the stale comment in the 42rem block"
    - "Browser assertions at 390px: 'Lendshed' fully visible (clientWidth > 0, scrollWidth <= clientWidth); long-name tests also assert clientWidth >= ~40; cover pending/error pill labels"
    - "Planner decision (TGT-08): dot-only pill hides the visible read time at phone width; time stays in title/aria-describedby/live region, matching the chosen sketch"
  debug_session: ".planning/debug/switcher-name-hidden-390.md"
