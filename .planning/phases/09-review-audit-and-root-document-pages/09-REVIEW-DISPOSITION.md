---
phase: 09
review: 09-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Review-ledger head counts disposition rows that no severity row contains"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Windows lead says \"0 open\" while the Open section lists rows"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Import cycle between dashboard-head, state-session, root-redirects and traceability"
  - id: WR-04
    severity: warning
    disposition: open
    title: "Settle-then-scroll is silently cancelled under StrictMode (dev)"
  - id: WR-05
    severity: warning
    disposition: open
    title: "Tests pinned to this repository's own mutable planning files"
  - id: IN-01
    severity: info
    disposition: open
    title: "`StaleMark` is defined twice"
  - id: IN-02
    severity: info
    disposition: open
    title: "`fileNameOf` re-implemented in six places"
  - id: IN-03
    severity: info
    disposition: open
    title: "Plain-object lookups by author-controlled id use `in` / bracket access"
  - id: IN-04
    severity: info
    disposition: open
    title: "The ledger cap can drop the file that was opened"
  - id: IN-05
    severity: info
    disposition: open
    title: "`aria-pressed` on buttons whose label also flips"
  - id: IN-06
    severity: info
    disposition: open
    title: "WINDOWS table fallback reads lower-case keys only; fence scan tracks only json fences"
  - id: IN-07
    severity: info
    disposition: open
    title: "Empty-state line shown for the `validated` and `out-of-scope` states"
  - id: IN-08
    severity: info
    disposition: open
    title: "`designedElsewhereLead` keys on kind alone"
  - id: IN-09
    severity: info
    disposition: open
    title: "`/roadmap#history` does not scroll when the roadmap is already open"
  - id: IN-10
    severity: info
    disposition: open
    title: "Duplicate React keys in a fix row"
  - id: IN-11
    severity: info
    disposition: open
    title: "Source mode survives a ledger tab change"
  - id: IN-12
    severity: info
    disposition: open
    title: "Disposition rows are not de-duplicated"
  - id: IN-13
    severity: info
    disposition: open
    title: "`sketchWinner` only knows A, B and C"
  - id: IN-14
    severity: info
    disposition: open
    title: "Hard-coded layout constant and ordering assumption in the root-document e2e"
open: 19
total: 19
recorded: 2026-11-03T10:38:53.466Z
---

# Phase 09: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | open | - |
| WR-05 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| IN-06 | info | open | - |
| IN-07 | info | open | - |
| IN-08 | info | open | - |
| IN-09 | info | open | - |
| IN-10 | info | open | - |
| IN-11 | info | open | - |
| IN-12 | info | open | - |
| IN-13 | info | open | - |
| IN-14 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
