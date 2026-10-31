---
status: testing
phase: 08-several-projects-and-a-switcher
source: [08-VERIFICATION.md]
started: 2026-10-31T09:59:12Z
updated: 2026-10-31T09:59:12Z
---

## Current Test

number: 1
name: Compare the built switcher, landing page and add dialog with winning sketches 039 A and 040 B
expected: |
  At 1280px and 390px, in light and dark, the build reads as the chosen sketches. The differences listed in 08-15-SUMMARY are acceptable: the add-dialog title style, the scrim blur, the position of the current row's check, the landing header inset and wordmark at 390px, a larger gap between the h1 and the lede, and the last-opened column ending about 13px short of the right edge. To produce the 24 paired PNGs in test-results/phase-08, run `npx playwright test test/e2e/projects-screenshots.spec.ts`.
awaiting: user response

## Tests

### 1. Compare the built switcher, landing page and add dialog with winning sketches 039 A and 040 B (1280px and 390px, light and dark)
expected: The build reads as the chosen sketches, and each difference listed in 08-15-SUMMARY is accepted or rejected.
result: [pending]

### 2. Open the header at 390px wide with any project open
expected: You can tell which project is current. In the build, the trigger at this width shows only a chevron, a 40px square with no name (test-results/phase-08/switcher-390-light.png). Contract fact 6 is met literally. Decide whether to accept that or open a follow-up.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
