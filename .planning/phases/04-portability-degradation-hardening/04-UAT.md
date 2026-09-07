---
status: testing
phase: 04-portability-degradation-hardening
source: [04-VERIFICATION.md]
started: 2026-09-07T20:42:29Z
updated: 2026-09-07T20:42:29Z
---

## Current Test

number: 1
name: Warning disclosure and empty-document coherence
expected: |
  The passages read as one coherent account and neither implies document text is visible.
awaiting: user response

## Tests

### 1. Warning disclosure and empty-document coherence

expected: Open a warned artifact with bodyLength 0. The warning disclosure and following empty-document notice read as one coherent account, and neither implies document text is visible.
result: [pending]

### 2. Combined portability and degradation browser flows

expected: Exercise sparse, dense, stripped-optional-content, malformed-artifact, invalid-target, and refresh flows in light and dark themes. All flows remain navigable and visually coherent, with honest empty/degraded states and a visible snapshot age.
result: [pending]

### 3. Failed-refresh timestamp retention

expected: Resolve the 04-01 judgment-tier prohibition by confirming the UI never presents a failed read attempt's time as the age of retained data.
result: [pending]

### 4. Damaged-artifact preservation

expected: Resolve the 04-03 judgment-tier prohibition by confirming damaged real files remain marked and navigable and absent files are not invented.
result: [pending]

### 5. Read-only target-project behavior

expected: Resolve the 04-04 judgment-tier prohibition by confirming the dashboard does not write, create, delete, or rename anything in the target project.
result: [pending]

### 6. Scope of the 04-05 survival-honesty prohibition

expected: Record whether tone includes disclosure prose and whether 04-06 satisfies the rule that a damaged artifact must not be presented in a way that overstates what survived.
result: [pending]

### 7. Preservation of shared-vocabulary and atomicity claims

expected: Resolve 04-05's judgment-tier prohibition by confirming the implementation fixes the original shared-vocabulary and atomicity claims rather than weakening their wording.
result: [pending]

### 8. Outcome-specific tone and description honesty

expected: Resolve 04-06's judgment-tier prohibition by confirming its outcome-specific summaries and badge labels do not overstate surviving content.
result: [pending]

### 9. Preservation of the original summary assertion

expected: Resolve 04-06's judgment-tier prohibition by confirming the replacement tests preserve or strengthen the original warning-summary contract rather than deleting or loosening it.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
