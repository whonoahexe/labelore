---
phase: 04-bulk-loan-export
verified: 2026-04-12T14:05:41Z
status: gaps_found
score: 8/21 must-haves verified
behavior_unverified: 2
overrides_applied: 0
gaps:
  - truth: "A running export can be cancelled without leaving a partial file behind."
    status: failed
    reason: "The cancel route answers Kind::Export with an error and never reaches the finished Builder::stop path; the HTTP cancellation is simply not wired."
    artifacts:
      - path: "server/routes/jobs.ts"
        issue: "Kind::Export maps to 'export cancellation is not wired' at lines 410-421."
    missing:
      - "Route Kind::Export cancellation to builder.stop(handle)."
      - "Add an end-to-end cancellation test proving a cancelled state and no final or partial file."
  - truth: "Every accepted month can actually be built into a file by an export job."
    status: failed
    reason: "Depot loans are listed and queued, but Builder rejects every counter-fed loan after the job is accepted."
    artifacts:
      - path: "server/routes/exports.ts"
        issue: "create_export accepts Depot months and inserts the job."
      - path: "server/export/builder.ts"
        issue: "Builder.start returns 'counter-fed export is not wired'."
    missing:
      - "Either read counter-fed loans end to end or refuse Depot months before inserting any job row."
      - "Add a Depot month test at the accepted-request-to-produced-file boundary."
  - truth: "A staged file is removed only after a complete fetch and stays resumable after an interrupted one."
    status: failed
    reason: "A byte range that stops at the final byte is counted as a whole fetch, so asking for the last byte alone can remove the entire file."
    artifacts:
      - path: "server/export/serve.ts"
        issue: "reaches_end is true whenever last equals size minus one, regardless of the first byte."
    missing:
      - "Require whole-file coverage before removing the file."
      - "Add last-byte range regression tests proving the file is kept."
  - truth: "The 5,000-loan cap and the stage-space limit bound the rows actually written despite loans changing mid-build."
    status: failed
    reason: "Builder rewrites each loan through its final line without comparing the current line count to the listed one or counting rows against the cap."
    artifacts:
      - path: "server/export/builder.ts"
        issue: "build_file sums listed rows for progress but write_rows reads each loan to the end with no cap check."
    missing:
      - "Recheck the line count when a loan is reopened and define what happens on growth or shrinkage."
      - "Enforce the row cap and the stage-space limit while writing."
      - "Add grow-and-shrink-after-listing tests."
  - truth: "Files beyond 4 GiB open and extract correctly in the two desktop archive tools."
    status: partial
    reason: "The mandatory desktop check was not performed; every result line is still PENDING."
    artifacts:
      - path: ".planning/phases/04-bulk-loan-export/04-ZIP64-EVIDENCE.md"
        issue: "No file was built, fetched or opened by either tool, and grep finds no Result: PASS line."
    missing:
      - "Open both threshold files in each desktop archive tool."
      - "Record four real PASS or FAIL results with row counts and sample hashes."
  - truth: "A staged export completes intact over the real public route, including two simultaneous fetches."
    status: failed
    reason: "The evidence used the test host and a placeholder blob through the generic ticket route, not a built export from the member host; it also says simultaneous fetches were not tried."
    artifacts:
      - path: ".planning/phases/04-bulk-loan-export/04-ROUTE-EVIDENCE.md"
        issue: "The transport proof is solid, yet it misses the literal roadmap host and the plan's simultaneous-fetch truth."
    missing:
      - "Run a large built export through the member route, including two simultaneous fetches, or amend the stale host wording with the steward lead's sign-off."
  - truth: "Finished export rows stay actionable on the queue page without a manual refresh."
    status: failed
    reason: "A job known only from the socket vanishes once it finishes, since the history row demands a stored record and nothing reloads."
    artifacts:
      - path: "web/queue/page.tsx"
        issue: "A miss in recordsById returns null at lines 61-72; the nearby comment says a reload will follow, but none is queued."
    missing:
      - "Keep finished live rows until the stored record arrives, or reload once on the transition."
      - "Test a job finishing after mount without a page reload."
behavior_unverified_items:
  - truth: "A real 60-second month-listing deadline fails closed and writes zero job rows."
    test: "Run the skipped a_listing_that_exceeds_the_deadline_fails_closed test."
    expected: "The request times out, returns no partial total, and the job table stays empty."
    why_human: "The only behavioural test is skipped on purpose because it outlasts the verifier's ten-second bound."
  - truth: "Export refusals keep the picked month, the scroll position and focus in a real browser."
    test: "Trigger the cap, space, timeout and generic refusals from the loan log with keyboard and pointer."
    expected: "Closing the refusal returns focus to the Export button and leaves month and scroll unchanged."
    why_human: "Only source-reading tests exist; nothing drives focus in a browser."
---

# Phase 4: Bulk Loan Export Verification Report

**Phase Goal:** A steward picks a month of loans and downloads them as a single file that survives the trip, staged as a durable job and never streamed while it is built.
**Verified:** 2026-04-12T14:05:41Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| R1 | A steward picks a month and starts Export beside Print list; the old menu entry is gone. | ✓ VERIFIED | `routeExportMonth` and `LogToolbar` are wired; the web suite passes 118/118 and a source-contract test shows the old entry is gone. |
| R2 | Progress is live; cancel leaves no partial; a finished file survives a restart and is fetched or swept correctly. | ✗ FAILED | Progress and restart tests pass, but `cancel_job` rejects `Kind::Export`, and a one-byte range can delete the file. |
| R3 | Over-5,000-loan and malformed requests fail before any work, with real totals. | ✗ FAILED | The cap tests pass, but rows added after listing are written with no running cap. |
| R4 | The desktop archive tools open files past both limits, and skipped loans are named exactly. | ? UNCERTAIN | Skipped-loan tests pass; all four desktop result blocks read `Result: PENDING`. |

### PLAN Must-Have Truths

| Plan | # | Truth | Status | Evidence |
|---:|---:|---|---|---|
| 04-01 | 1 | Re-issued tickets resume identical bytes under simultaneous fetches. | ✗ FAILED | The route evidence says both fetches ran one after the other. |
| 04-01 | 2 | A multi-GB staged blob crosses the public route intact and resumes with 206 and a matching hash. | ✓ VERIFIED | `04-ROUTE-EVIDENCE.md` records the exact byte count and equal hashes at both ends. |
| 04-02 | 1 | Cap edge, timeout and duplicate months have explicit outcomes. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | 14 listing tests pass; the only real deadline test stays skipped. |
| 04-02 | 2 | Simultaneous bad and good creates cannot bypass the shared check. | ✓ VERIFIED | `simultaneous_bad_and_good_creates_share_one_check` passed. |
| 04-02 | 3 | Refused months insert zero job rows. | ✓ VERIFIED | Refusal tests assert the row counts. |
| 04-03 | 1 | A cancel racing the finish never publishes a partial file. | ✗ FAILED | The builder-level test passes, but the route never calls it. |
| 04-03 | 2 | Missing, unreadable and renamed loans have fixed outcomes. | ✓ VERIFIED | `check_loan` names each outcome; the matching tests pass. |
| 04-03 | 3 | ZIP64 stays readable below and above the classic limits. | ? UNCERTAIN | The 65,536-row test ran and passed; the 4 GiB test and both desktop tools did not run. |
| 04-03 | 4 | A loan changing mid-build cannot turn a skip into an unintended write. | ✗ FAILED | Rename swaps are safe, but growth is written past the listed size and cap. |
| 04-04 | 1 | Fetch end, early drop and sweep have explicit lifetimes. | ✓ VERIFIED | The serve and restart suites pass. |
| 04-04 | 2 | Only the requesting steward can fetch; end of file removes it; early drop keeps it. | ✗ FAILED | Owner checks pass, but a range reaching the end counts as a full fetch. |
| 04-04 | 3 | Boot deletes partial files and keeps finished ones. | ✓ VERIFIED | The boot recovery tests pass. |
| 04-04 | 4 | Skipped-loan detail shows exact zero, one and many cases. | ✓ VERIFIED | Five skipped-loan tests pass. |
| 04-04 | 5 | Refusal dialog keeps the month and scroll position. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | State-changing handlers are absent, but no browser test shows focus afterwards. |
| 04-04 | 6 | The narrow-screen toolbar wraps without overflow. | ? UNCERTAIN (`insufficient_spec`) | Marked `verification: backstop`; wrap classes exist but geometry is unseen. |
| 04-04 | 7 | A 300-character loan name cannot overflow the queue row. | ? UNCERTAIN (`insufficient_spec`) | Backstop; the browser check was not run. |
| 04-04 | 8 | Finished and skipped-loan changes are announced once. | ? UNCERTAIN (`insufficient_spec`) | Screen-reader backstop; not run. |

**Score:** 8/21 truths verified (2 present and wired but behaviour-unverified; 5 human or insufficient-spec; 6 failed)

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `server/tests/export_ticket.rs` | Full, range and single-use ticket proof | ✓ VERIFIED | 9 of 9 tests passed. |
| `.planning/phases/04-bulk-loan-export/04-ROUTE-EVIDENCE.md` | Public route integrity record | ⚠️ PARTIAL | Real hashes, but the wrong host and no simultaneous fetches. |
| `server/export/builder.ts` | Deterministic ZIP64 builder | ⚠️ PARTIAL | Substantive and wired, but no counter-fed reader and no size check. |
| `.planning/phases/04-bulk-loan-export/04-ZIP64-EVIDENCE.md` | Four desktop results | ✗ STUB/PENDING | Steps are written, the results are blank. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `/export/{ticket}` | Public route consumer | `serve_local` ranged body | ⚠️ PARTIAL | Real multi-GB transport passed, not the exact built-file journey. |
| `POST /api/exports` | Job row | month listing, cap check, `insert_export_job` | ✓ WIRED | Real writes and zero-write refusals are tested. |
| Ticket | File lifetime | owner check, lease, ranged body, remove or keep | ✗ BROKEN | End of file is treated as a full fetch. |
| Live finished frame | Queue history row | live and stored merge, `HistoryRow` | ✗ BROKEN | The renderer returns `null` for a record that predates the job. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Loan log toolbar | picked month | log reader, `routeExportMonth` | Yes | ✓ FLOWING |
| Builder | CSV rows | stored listing, then local loan reader | Local only | ⚠️ HOLLOW FOR DEPOT |
| Queue page | progress and status | worker, socket and stored merge | Active rows yes; finished live rows dropped | ⚠️ PARTIAL |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Listing edges | `cargo test --test export_listing` | 14 passed, 1 skipped | ✓ PASS (deadline unverified) |
| Build and cancel engine | `cargo test --test export_builder` | 4 passed | ✓ PASS (route cancel not covered) |
| Owner, range and lease | `cargo test --test export_serve` | 6 passed | ✓ PASS (last-byte case absent) |
| Skipped-loan detail | `cargo test --test export_skips` | 5 passed | ✓ PASS |
| Restart and sweep | `cargo test --test restart_requeue` | 7 passed | ✓ PASS |
| 65,536-row threshold | the skipped test run with `--ignored` | 1 passed in 4.10s | ✓ PASS |
| Web suite | `npm test` | 118 passed, 0 failed | ✓ PASS |
| 4 GiB threshold | Not run | Too slow for a spot-check | ? SKIP |

## Probe Execution

No plan declares a probe and no conventional probe script exists. Step 7c: N/A.

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| EXPT-01 | 04-04 | Pick a month and export it as one file | ✗ BLOCKED | Local loans work, Depot months become jobs that cannot finish. |
| EXPT-02 | 04-04 | Button beside Print list | ✓ SATISFIED | Source and tests show the order and the wiring. |
| EXPT-03 | 04-02, 04-04 | Refuse over 5,000 loans before any work | ✗ BLOCKED | The static cap holds; written rows can pass it after growth. |
| EXPT-04 | 04-03, 04-04 | Background progress and safe cancel | ✗ BLOCKED | Progress works; the cancel route returns 500 for exports. |
| EXPT-05 | 04-03, 04-04 | A staged file survives a restart | ✓ SATISFIED | Recovery keeps finished files and removes partial ones. |
| EXPT-06 | 04-03, 04-04 | Name loans that vanish mid-export | ✓ SATISFIED WITH WARNING | Missing-loan flows pass; the skipped-loan insert result is ignored. |

**Coverage:** 3/6 satisfied, 3 blocked. Every requirement ID in the plan frontmatter is accounted for.

## Prohibitions

| Prohibition | Status | Evidence |
|---|---|---|
| Do not claim transport safety from localhost-only evidence. | ✓ VERIFIED | The multi-GB run crossed the public edge. |
| A member cannot choose the stage folder. | ✓ VERIFIED | The server computes the destination; tests pass. |
| Partial success cannot hide skipped loans. | ✓ VERIFIED WITH WARNING | Fields exist; insert failures can leave the stored detail short. |
| Another steward cannot fetch the file. | ✓ VERIFIED | Cross-owner tests pass. |

## Test Quality Audit

| Test File | Linked Req | Active | Skipped/ignored | Circular | Strongest Assertion | Verdict |
|---|---|---:|---:|---|---|---|
| `export_listing.rs` | EXPT-03 | 14 | 1 | No | Behavioural plus row values | ⚠️ Deadline not run |
| `export_builder.rs` | EXPT-04, EXPT-05 | 4 | 0 | No | Behavioural filesystem and table | ⚠️ Builder only; misses route cancel |
| `export_serve.rs` | EXPT-05 | 6 | 0 | No | Behavioural HTTP and filesystem | 🛑 Missing last-byte case |

**Skipped tests on requirements:** 2 skipped by default. One (65,536 rows) was run here and passed; the deadline and 4 GiB tests were not.
**Circular patterns detected:** 0.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `server/routes/jobs.ts` | 421 | Production branch returns "export cancellation is not wired" | 🛑 Blocker | The Cancel button cannot work. |
| `server/export/builder.ts` | 180 | Accepted Depot capability ends at "not wired" | 🛑 Blocker | The API stores jobs that are certain to fail. |
| `web/queue/page.tsx` | 304 | `if (!record) return null` with no promised reload | 🛑 Blocker | Finished live jobs and their actions disappear. |
| `04-ZIP64-EVIDENCE.md` | 1-120 | Result block is scaffold and PENDING | 🛑 Blocker | Desktop readability is unproven. |
| `server/export/sweep.ts` | 285 | Remove result discarded before the success note | ⚠️ Warning | False sweep records while the file stays. |
| `server/export/worker.ts` | 1187 | Skipped-loan insert result discarded | ⚠️ Warning | Socket and stored detail can differ. |
| `web/queue/row.tsx` | 557 | Render-state-only fetch guard | ⚠️ Warning | Quick double clicks can issue two tickets. |

No unreferenced `TBD`, `FIXME` or `XXX` markers were found in phase 4 implementation files.

## Decision Coverage

All 9 trackable `04-CONTEXT.md` decisions are recognised by the decision-coverage gate. This is advisory and does not offset the gaps above.

## Human Verification Required

These checks stay required after the code blockers close; because `gaps_found` ranks first, they do not move the status to `human_needed` yet.

### 1. Desktop archive readability

**Test:** Complete `04-ZIP64-EVIDENCE.md` with both desktop archive tools against the 4 GiB and 65,536-row files.  
**Expected:** Four real PASS results with exact row counts and sample hashes.  
**Why human:** The desktop tools are not available in this environment.

### 2. Responsive, focus and announcement protocol

**Test:** Run Plan 04-04 Task 3 at desktop width, 390px, a short window, long names, keyboard only and a screen reader.  
**Expected:** No overflow, focus loss or repeated announcement; the fetch stays a plain navigation.  
**Why human:** The project has no browser or accessibility harness; the checkpoint still awaits approval.

### 3. Real deadline failure

**Test:** Run the named skipped 60-second listing test once.  
**Expected:** The timeout fails closed with zero job rows.  
**Why human:** It outlasts the verifier's cheap spot-check bound.

## Gaps Summary

The goal of this phase is not met. The local staged-file path is solid and many tests pass, yet several lifecycle and data-safety rules still break: stewards cannot cancel an export through the API; Depot months are accepted though they cannot be built; a one-byte range can delete the file; growth after listing skips the cap; finished live jobs can lose their actions; and the real public journey and the desktop evidence are absent. No later phase covers these gaps.

### Recommended Gap-Closure Shape

1. **Server lifecycle plan:** wire HTTP cancellation; fix whole-file removal; enforce row counts when rewriting; make sweep and skipped-loan write failures explicit; add the missing regression tests.
2. **Capability-honesty plan:** read counter-fed loans or refuse before any job row, with an end-to-end Depot test.
3. **Web and evidence plan:** keep finished live jobs, gate explicit fetches atomically, run the browser check, run the built-export journey over the member route, and complete four desktop archive results.

## Next Action

**Canonical routing:** Gaps found. Plan the fixes, then run execute-phase again before shipping.  
**Next command:** `/gsd-plan-phase 04 --gaps`

Do not move on from this report.

---

_Verified: 2026-04-12T14:05:41Z_  
_Verifier: the agent (gsd-verifier)_
