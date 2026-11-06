---
phase: 10
review: 10-REVIEW.md
titles: json
findings:
  - id: CR-01
    severity: critical
    disposition: fixed
    title: "USER-SETUP `- NAME: value` field lines are stored unmasked and rendered in View"
  - id: CR-02
    severity: critical
    disposition: fixed
    title: "`withholdInText` (used for every Integrations line) leaves values in several common written forms"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`maskValues` / User setup sections leave values in table cells, multi-word values and bracketed values"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`readSeverity` in non-strict mode reads ordinary words as severity (\"High availability ...\", \"Medium-sized ...\")"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "SPEC requirement reader turns a nested numbered list into extra requirements"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "Overlap drawing clips marks when a region holds more than a few concerns, and drops absent lanes past three"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "`stripControlCharacters` leaves invisible characters, so \"what is copied is what is on screen\" is not guaranteed"
  - id: IN-01
    severity: info
    disposition: deferred
    title: "Testing run-command lift treats console output and `\\` continuation lines as commands"
  - id: IN-02
    severity: info
    disposition: deferred
    title: "AI spec strip and section ids collide when two sections share a number"
  - id: IN-03
    severity: info
    disposition: deferred
    title: "`nestedBullet` caps with the wrong bound"
open: 0
total: 10
recorded: 2026-11-05T21:59:12.364Z
---

# Phase 10: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | fixed | 10-REVIEW-FIX.md (453e16f) |
| CR-02 | critical | fixed | 10-REVIEW-FIX.md (34f7426) |
| WR-01 | warning | fixed | 10-REVIEW-FIX.md (34f7426 + 453e16f) |
| WR-02 | warning | fixed | 10-REVIEW-FIX.md (b840fa2) |
| WR-03 | warning | fixed | 10-REVIEW-FIX.md (9059134) |
| WR-04 | warning | fixed | 10-REVIEW-FIX.md (bda9728) |
| WR-05 | warning | fixed | 10-REVIEW-FIX.md (bab6fa5) |
| IN-01 | info | deferred | Info, outside the --fix scope (no --all); left for a later pass |
| IN-02 | info | deferred | Info, outside the --fix scope (no --all); left for a later pass |
| IN-03 | info | deferred | Info, outside the --fix scope (no --all); left for a later pass |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
