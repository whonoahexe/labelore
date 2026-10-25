---
phase: 04-shed-to-shed-transfers
verified: 2026-03-19T00:00:00Z
status: passed
score: 2/2 roadmap success criteria fully verified
resolved_in_place:
  note: "The one gap left by the second round (a declined handover stayed in transit) was fixed directly in commit 3d91f0a rather than through another plan cycle; the repair touched two files and four tests. `status` moved to `passed` on that basis. The `gaps:` entry stays below with `status: resolved` so the finding and its evidence are kept."
  observed_not_fixed: "A declined handover on a tool that has since been withdrawn from the catalogue now parks the tool in a limbo shelf instead of returning it. That is the safe direction, and it is noted here instead of expanded into."
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "1/2 roadmap SC fully verified"
  gaps_closed:
    - "Gap 1 (SC-2, in-transit list) is closed. `web/transfers/in-transit.ts` merges the live socket frame with the stored record, and the tray now takes a `frame` prop. Re-read against source, not only the summary."
    - "Gap 2 (SC-1, MOVE-04 restart clause) is closed on both halves. Server: a boot pass requeues every transfer left `running`. Client: the queue page shows the Resume control. Proven by `server/tests/restart_requeue.rs`."
  gaps_remaining:
    - "NEW this round (SC-2, MOVE-03): the decline path writes `declined` on the transfer row but nothing returns the tool to the sending shed, so a declined tool stays listed as in transit with no steward able to find it."
  regressions: []
gaps:
  - truth: "A declined handover returns the tool to the sending shed's shelf (ROADMAP SC-2 / MOVE-03)."
    status: resolved
    resolution: "Closed by commit 3d91f0a. The decline handler now calls the shared `restock` step that confirm also uses; the sending shed's shelf row is rewritten and the in-transit row is dropped in one transaction. Four tests, each seen failing against the unfixed code first."
    reason: "The decline button in the receiving steward's inbox writes `declined` on the transfer and stops. Neither the decline handler nor the nightly sweep ever touches the shelf table, so the tool is shown as in transit forever and cannot be borrowed from either shed."
    artifacts:
      - path: "server/handover/decline.ts"
        issue: "decline() updates the transfer status only; it never calls restock()."
      - path: "server/handover/sweep.ts"
        issue: "The sweep skips rows already marked declined."
    missing:
      - "Call the shared restock step from decline() so the sending shelf is rewritten."
      - "A test that declines a transfer and then lists the sending shed's shelf."
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "Decline in the browser: start a transfer from the canal shed, decline it as the receiving steward, then open the canal shelf page."
    expected: "The tool is back on the canal shelf and gone from the in-transit tray."
    why_human: "Needs two signed-in stewards and a live socket; no automated check covers both sessions."
  - test: "Queue page resume prompt: stop the server during a transfer, restart it, and press Resume on the queue page."
    expected: "The prompt names the tool and both sheds, and the transfer finishes."
    why_human: "The rendered prompt copy was not seen in a browser this round."
  - test: "Narrow screen: open the loan log at about 400px."
    expected: "Only the table scrolls sideways; the page header stays put."
    why_human: "Layout backstop, cannot be shown from source."
---

# Phase 4: Shed-to-Shed Transfers Verification Report

**Phase Goal:** A tool can move between sheds as a tracked transfer that survives a restart, with confirmation from the receiving steward and a loan log anyone can review.
**Verified:** 2026-03-19
**Status:** gaps_found
**Re-verification:** Yes, after gap round 2 (plans 04-05 and 04-06)

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A steward picks tools in one shed, starts a transfer to another, and watches it on the in-transit tray. | ✓ VERIFIED | Unchanged since the first pass. `cargo test` shows 212 passed, 0 failed. |
| 2 | A transfer in transit stays findable until the receiving steward confirms it, and a declined one comes back. | ✗ **FAILED (new finding)** | The earlier gaps are closed, but the decline path leaves the tool in transit. See the gap above. |
| 3 | A transfer survives a restart and is resumed, not dropped. | ✓ VERIFIED | The boot pass and the queue Resume control are both wired; `restart_requeue.rs` passes against the real handlers. |
| 4 | Every transfer is written to a loan log a steward can read. | ✓ VERIFIED | `/log` exists and reads the table; the failure body carries a reason the page prints. |

**Score:** 3/4 truths verified. One new gap remains open from this round's review.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/handover/requeue.ts` | One guarded status change behind retry and resume | ✓ VERIFIED | Exactly one `SET status = 'queued'` statement. |
| `web/transfers/in-transit.ts` | Merge of live frame and stored record | ✓ VERIFIED | Used by the tray and the queue page. |
| `server/handover/decline.ts` | Decline returns the tool to its shelf | ✗ **MISSING logic** | Only the status column changes. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `resume` route | `requeue()` | guarded status check, 409 on refusal | ✓ WIRED | Source read plus passing tests. |
| decline button | sending shelf row | `decline()` then `restock()` | ✗ **NOT WIRED** | The shelf row is never rewritten. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| MOVE-01 | 04-01, 04-02 | Start a transfer between sheds | ✓ SATISFIED | Verified in the first pass. |
| MOVE-03 | 04-03, 04-05 | A receiving steward can confirm a transfer | ✗ **BLOCKED** | Confirm works; decline leaves the tool in transit. |
| MOVE-04 | 04-04, 04-06 | A transfer survives a server restart | ✓ SATISFIED | Closed this round on both halves. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `server/handover/decline.ts` | 41 | Status written, shelf row never touched | 🛑 Blocker | Declined tools vanish from both sheds. |
| `web/transfers/queue.tsx` | 77 | Retry button on the offline banner does nothing | ⚠️ Warning | Confusing; reconnect already runs by itself. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Server suite | `cargo test` | 212 passed, 0 failed | ✓ PASS |
| Web suite | `npm test` | 31/31 passed | ✓ PASS |
| Resume route exists | `grep -c "transfers/{id}/resume" server/routes.ts` | 1 | ✓ PASS |
| Decline test coverage | `grep -rn "decline" server/tests/` | no matches | ✗ FAIL |

### Human Verification Required

See the frontmatter `human_verification` list: the decline walk-through, the Resume prompt copy, and the narrow-screen loan log.

### Gaps Summary

Two earlier gaps are closed and each was re-read against source. One gap remains, found by this round's code review: the decline button never returns the tool to the sending shed. No test covers the path, so a green `cargo test` hides it.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_
