---
phase: 06
review: 06-REVIEW.md
titles: json
findings:
  - id: CR-01
    severity: critical
    disposition: fixed
    title: "A shadowed (duplicate-key) secret in a valid config.json is shown unmasked"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`redactSecretText` can be evaded on the unparseable-config path"
  - id: WR-02
    severity: warning
    disposition: open
    title: "The no-skips guard's comment blanker hides real test code (verified)"
  - id: WR-03
    severity: warning
    disposition: open
    title: "The register growth test is diluted by a fixed 200 KB prefix and has no positive control"
  - id: WR-04
    severity: warning
    disposition: open
    title: "The 420px e2e test claims more than it checks"
  - id: WR-05
    severity: warning
    disposition: open
    title: "`startFixtureServer` silently overwrites duplicate targets and can leak its temp folder"
  - id: WR-06
    severity: warning
    disposition: open
    title: "Path handling breaks on a project path containing a space or non-ASCII character"
  - id: IN-01
    severity: info
    disposition: open
    title: "HANDOFF.json and estimation-calibration.json are deliberately left unmasked"
  - id: IN-02
    severity: info
    disposition: open
    title: "A planted-quadratic harness test has no explicit timeout"
  - id: IN-03
    severity: info
    disposition: open
    title: "`vitest-gate.mjs` can crash and leave its scratch folder behind"
open: 8
total: 10
recorded: 2026-10-26T02:23:13.956Z
---

# Phase 06: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | fixed | 06-REVIEW-FIX.md |
| WR-01 | warning | fixed | 06-REVIEW-FIX.md |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| WR-05 | warning | open | - |
| WR-06 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
