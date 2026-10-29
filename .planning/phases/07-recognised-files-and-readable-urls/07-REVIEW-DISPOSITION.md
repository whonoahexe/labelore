---
phase: 07
review: 07-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Roadmap plan rows still build their URL with the stateless builder instead of the route-table key"
  - id: WR-02
    severity: warning
    disposition: open
    title: "The \"first by code-unit order keeps the clean address\" policy lets a stray file steal a canonical document's URL, and `sourceDestination` relies on the opposite being impossible"
  - id: WR-03
    severity: warning
    disposition: open
    title: "Discovery hangs the whole server on a named pipe (FIFO) in `.planning/`"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "The test suite is red at the phase HEAD: two corpus tests do not know the phase's own artifacts"
  - id: WR-05
    severity: warning
    disposition: open
    title: "The image size cap in `/api/files` is enforced after the whole file is already in memory"
  - id: IN-01
    severity: info
    disposition: open
    title: "A dispatcher comment promises a legacy redirect that does not exist"
  - id: IN-02
    severity: info
    disposition: open
    title: "The drawer's active-row match is an exact string compare against the raw pathname"
  - id: IN-03
    severity: info
    disposition: open
    title: "The `where: 'root'` rows of `EXACT_NAME_KINDS` have no effect on URLs"
  - id: IN-04
    severity: info
    disposition: open
    title: "A plan's Summary tab can lead out of the plan pair when the summary lost a collision"
open: 8
total: 9
recorded: 2026-10-27T11:23:59.767Z
---

# Phase 07: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| WR-03 | warning | open | - |
| WR-04 | warning | fixed | Pinned 07-SECURITY.md and 07-UI-REVIEW.md in their corpus guards (counts recounted by awk, cross-checked with the extractor); test:gate 4464/0/0 |
| WR-05 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
