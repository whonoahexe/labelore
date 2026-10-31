---
status: testing
phase: 08-several-projects-and-a-switcher
source: [08-VERIFICATION.md]
started: 2026-10-31T09:59:12Z
updated: 2026-10-31T12:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Open the header at 390px wide with any project open
expected: |
  You can tell which project is current. In the build, the trigger at this width shows only a chevron, a 40px square with no name (test-results/phase-08/switcher-390-light.png). Contract fact 6 is met literally. Decide whether to accept that or open a follow-up.
awaiting: user response

## Tests

### 1. Compare the built switcher, landing page and add dialog with winning sketches 039 A and 040 B (1280px and 390px, light and dark)
expected: The build reads as the chosen sketches, and each difference listed in 08-15-SUMMARY is accepted or rejected.
result: pass
note: "Run and judged by Claude on 2026-10-31 at the user's request (npx playwright test test/e2e/projects-screenshots.spec.ts: 5 passed; 12 build/sketch pairs compared). All three surfaces read as 039 A and 040 B in both themes at both widths. Every difference listed in 08-15-SUMMARY is present as described and judged acceptable. One unlisted difference: the add dialog's 'Scan a folder instead' link is uppercase sans in the build and mono Label style in the sketch. Cosmetic. The 390px chevron-only trigger is carried to test 2."


### 2. Open the header at 390px wide with any project open
expected: You can tell which project is current. In the build, the trigger at this width shows only a chevron, a 40px square with no name (test-results/phase-08/switcher-390-light.png). Contract fact 6 is met literally. Decide whether to accept that or open a follow-up.
result: [pending]

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
