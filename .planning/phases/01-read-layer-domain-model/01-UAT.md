---
status: testing
phase: 01-read-layer-domain-model
source: [01-VERIFICATION.md]
started: 2026-08-23T19:55:15Z
updated: 2026-08-23T19:55:15Z
---

## Current Test

number: 1
name: Manual smoke test of the snapshot harness against the real ~/studio-portal project
expected: |
  All of the following hold against the real, messy, non-fixture project — this is
  deliberately the only defense against a regression that manifests solely at
  real-world scale (D-04).
awaiting: user response

## Tests

### 1. Manual smoke test against `~/studio-portal`

expected: Run `npm run snapshot -- ~/studio-portal --stable > /tmp/sp.json` and confirm it exits 0; `loadStatus.status` is `ok`; the phase list contains both the live milestone's phases and the archived `v1.0` ones with the two "Phase 1" entries distinct; the warning list is short enough to read and every entry names a real problem rather than a routine unresolved identifier; the mention index shows a decision id appearing across several files with sensible excerpts. Then repeat with a relative path, a `~`-prefixed path, and a symlink to the same directory and confirm all four resolve to the same root.
result: [pending]

why_human: 01-04-PLAN.md's `<human-check>` block marks this smoke test as deliberately unautomated (D-04: no committed assertion may depend on `~/studio-portal`), and this project's `human_verify_mode` is `end-of-phase`. The verifier ran the automated half as a sanity check — exits 0, `loadStatus.status: "ok"`, 9 phases, 2 warnings — but the qualitative judgment ("is the warning list short enough to read", "are the excerpts sensible") needs a human.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
