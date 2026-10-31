---
status: complete
phase: 08-several-projects-and-a-switcher
source: [08-VERIFICATION.md]
started: 2026-10-31T09:59:12Z
updated: 2026-10-31T10:54:34.505Z
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
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
