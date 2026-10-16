---
phase: 04-bulk-archive-downloads
verified: 2026-08-29T16:20:03Z
status: gaps_found
score: 19/39 must-haves verified
behavior_unverified: 3
overrides_applied: 0
gaps:
  - truth: "Archive preparation can be cancelled without leaving a partial file behind."
    status: failed
    reason: "The HTTP cancellation handler deliberately returns an error for Tool::Archive instead of invoking the implemented ArchiveExecutor::cancel path."
    artifacts:
      - path: "backend/src/api/jobs.rs"
        issue: "Tool::Archive maps to 'archive job cancellation is not yet implemented' at lines 1082-1093."
    missing:
      - "Route Tool::Archive cancellation to state.job_executors.archive.cancel(&handle)."
      - "Add an end-to-end API cancellation test proving cancelled state and no final or partial artifact."
  - truth: "Every accepted archive selection can actually be executed as a durable archive job."
    status: failed
    reason: "Cloud selections are walked and persisted, but ArchiveExecutor rejects every non-local source after the job is accepted."
    artifacts:
      - path: "backend/src/api/jobs.rs"
        issue: "create_archive accepts TierConfig::Cloud and inserts the job."
      - path: "backend/src/jobs/executors/archive.rs"
        issue: "ArchiveExecutor::start returns 'cloud-tier archive execution is not yet implemented'."
    missing:
      - "Either implement cloud entry reads end to end or reject cloud archive requests before inserting any job/manifest rows."
      - "Add a cloud archive behavior test at the accepted-request-to-produced-ZIP boundary."
  - truth: "A prepared archive is removed only after a complete collection and remains resumable after an interrupted pull."
    status: failed
    reason: "Any range ending at EOF is treated as complete collection; bytes=-1 can deliver one byte and delete the entire archive."
    artifacts:
      - path: "backend/src/download/mod.rs"
        issue: "reaches_eof is true whenever end == file_len - 1, regardless of start or prior coverage."
    missing:
      - "Require full-file coverage before unlinking, or track authenticated cumulative range coverage."
      - "Add suffix/end-only range regression tests proving the artifact is retained."
  - truth: "The configured 400 GiB and stage-capacity controls bound the bytes actually archived despite concurrent source mutation."
    status: failed
    reason: "The executor copies reopened files through EOF without comparing current length to expected_size or enforcing a cumulative byte ceiling."
    artifacts:
      - path: "backend/src/jobs/executors/archive.rs"
        issue: "build_archive sums expected_size for progress but copy_with_cancellation reads each source to EOF without a size/cap guard."
    missing:
      - "Revalidate source size at reopen and define deterministic grow/shrink handling."
      - "Enforce the configured/capacity byte ceiling while copying."
      - "Add grow/shrink-after-preflight tests."
  - truth: "Archives beyond 4 GiB and 65,535 entries open and extract correctly in Windows Explorer and macOS Archive Utility."
    status: partial
    reason: "The mandatory native-tool checkpoint is unperformed; all four evidence results remain PENDING."
    artifacts:
      - path: ".planning/phases/04-bulk-archive-downloads/04-DL06-INTEROP-EVIDENCE.md"
        issue: "No archive has been built/downloaded/opened by either native tool and grep finds zero Result: PASS lines."
    missing:
      - "Run both threshold archives through Windows Explorer and macOS Archive Utility."
      - "Record four real PASS/FAIL results with counts and representative hashes."
  - truth: "DL-09 is proven through the exact production member/archive route required by the roadmap, including the flagged concurrent-ticket assumption."
    status: failed
    reason: "Evidence used api.cinedise.com and a staged RAR through the generic ticket route, not a produced archive at studio.cinedise.com; the evidence also explicitly says concurrent tunnel attempts were not performed."
    artifacts:
      - path: ".planning/phases/04-bulk-archive-downloads/04-DL09-EVIDENCE.md"
        issue: "Strong transport evidence exists, but it does not satisfy the literal roadmap host/archive journey or the PLAN's concurrent-production truth."
    missing:
      - "Run the large produced-archive journey through the canonical production route, including concurrent ticket contention, or formally amend/override the stale host wording with developer acceptance."
  - truth: "Terminal archive rows remain actionable in /jobs without a manual refresh."
    status: failed
    reason: "A live-only job is dropped when it becomes terminal because the history renderer requires a pre-existing REST record and no terminal transition triggers refresh."
    artifacts:
      - path: "frontend/app/jobs/page.tsx"
        issue: "recordsById miss returns null at lines 294-305; the comment promises a future refresh that is never scheduled."
    missing:
      - "Retain terminal live records until REST catches up or trigger one debounced refresh on the transition."
      - "Test a post-mount job transitioning to completed/failed without page reload."
behavior_unverified_items:
  - truth: "A real 60-second archive-walk deadline fails closed and writes zero job/manifest rows."
    test: "Run the ignored a_walk_that_exceeds_the_deadline_fails_closed_and_inserts_zero_rows test."
    expected: "The request times out, returns no partial total, and both row counts remain zero."
    why_human: "The only behavioral test is ignored and intentionally exceeds the verifier's under-10-second spot-check bound."
  - truth: "A single entry beyond 4 GiB produces independently readable ZIP64 output."
    test: "Run the ignored >4 GiB archive_zip64 test in an environment with sufficient scratch space."
    expected: "The fresh reader reaches EOF with the exact >4 GiB entry size and valid CRC."
    why_human: "The test writes and rereads several GiB and was not executed in this verification; presence of large_file(true) alone cannot prove the threshold behavior."
  - truth: "Archive refusals preserve selection, folder/scroll position, and focus in a real browser."
    test: "Trigger cap, capacity, timeout, and generic refusals from /browse using keyboard and pointer input."
    expected: "Dismissal returns focus to Download and leaves selection, folder, and scroll unchanged."
    why_human: "The repository has source-contract tests but no DOM/browser harness exercising the interaction state transition."
---

# Phase 4: Bulk Archive Downloads Verification Report

**Phase Goal:** A member selects many files and folders at once and pulls them down as a single archive that survives the trip — staged as a durable job, never streamed on the fly.
**Verified:** 2026-08-29T16:20:03Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|---|---|---|
| R1 | A member multi-selects files/folders and starts Download beside Send to…; the old card is gone. | ✓ VERIFIED | `routeDownloadSelection`, `SelectionBar`, and `browse-view` are wired; frontend suite passes 250/250 and source-contract tests prove the old card/state are gone. |
| R2 | Progress is live; cancel leaves no partial; completed archives survive restart and are collected/swept correctly. | ✗ FAILED | Worker progress/recovery tests pass, but `cancel_job_handler` rejects `Tool::Archive`, and an isolated suffix range can delete the archive after one byte. |
| R3 | Over-400-GiB and malformed requests fail before work with real totals. | ✗ FAILED | Boundary/HARDEN tests pass, but post-preflight file growth is copied through EOF with no cumulative cap/capacity enforcement. |
| R4 | Native Windows/macOS ZIP64 interop succeeds at both thresholds and omissions are exact. | ? UNCERTAIN | Omission tests pass; all four native-tool evidence blocks remain `Result: PENDING`. |
| R5 | A large archive completes intact over the exact production tunnel journey. | ✗ FAILED | A 3.90-GiB staged RAR crossed `api.cinedise.com`, but no produced archive was exercised, the roadmap names `studio.cinedise.com`, and concurrent production attempts were not run. |

### PLAN Must-Have Truths

| Plan | # | Truth | Status | Evidence |
|---|---:|---|---|---|
| 04-01 | 1 | Re-minted scoped tickets resume identical bytes under concurrent production attempts. | ✗ FAILED | DL09 evidence explicitly says legs were sequential and production concurrency is not closed. |
| 04-01 | 2 | A multi-GB staged file crosses the production tunnel intact and resumes with 206 + matching SHA-256. | ✓ VERIFIED | `04-DL09-EVIDENCE.md` records exact 4,189,049,332-byte size and identical source/full/reconstructed hashes through `api.cinedise.com`. |
| 04-02 | 1 | Cap boundary, timeout, normalized duplicates, and capacity snapshot semantics are explicit. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | 18 active preflight tests pass; the only real deadline test remains ignored/unrun. |
| 04-02 | 2 | Concurrent malformed and valid creates cannot bypass closed validation. | ✓ VERIFIED | `concurrent_malformed_and_valid_job_creates_cannot_bypass_the_shared_validation_seam` passed. |
| 04-02 | 3 | Refused selections insert zero job and manifest rows. | ✓ VERIFIED | Active preflight refusal tests pass with row-count assertions. |
| 04-03 | 1 | Cancel racing finish never publishes a partial or leaves an orphan. | ✗ FAILED | Direct executor cancellation test passes, but the production HTTP handler never calls it. |
| 04-03 | 2 | Vanished, unreadable, symlink, and normalization conflicts have deterministic outcomes. | ✓ VERIFIED | `check_entry` has explicit outcomes; vanish/symlink and duplicate-normalized behaviors are exercised by passing tests. |
| 04-03 | 3 | Forced ZIP64 remains interoperable below and above classic limits. | ? UNCERTAIN | 65,536-entry test was explicitly run and passed; >4-GiB structural test and both native consumers remain unexecuted. |
| 04-03 | 4 | Concurrent mutation cannot turn an omission into an unintended file read. | ✗ FAILED | Symlink swaps are safe, but growth is read beyond the persisted manifest size and cap. |
| 04-03 | 5 | Progress counts source bytes/omissions and output opens past both limits. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Progress/omission and 65,536-entry behavior pass; the >4-GiB behavioral test was not run. |
| 04-04 | 1 | EOF, early drop, sweep, and process loss have explicit lifetimes. | ✓ VERIFIED | Focused download and crash-recovery suites pass. |
| 04-04 | 2 | Owner-only collection; EOF deletes; early drop retains; sweep respects leases. | ✗ FAILED | Owner/lease tests pass, but any suffix/end-reaching range is misclassified as complete collection. |
| 04-04 | 3 | Boot deletes partials, marks interrupted, and preserves completed finals. | ✓ VERIFIED | All archive recovery tests passed. |
| 04-04 | 4 | Owner-authorized REST/WS omission detail exposes exact zero/one/many outcomes. | ✓ VERIFIED | Seven omission integration tests pass; ignored persistence errors are separately recorded as a warning. |
| 04-05 | 1 | Pending direct/archive submission blocks repeats and preserves the snapshot. | ✓ VERIFIED | `beginDownload` and frozen-snapshot tests pass; `pendingRef` is the synchronous authority. |
| 04-05 | 2 | Row/context direct downloads share one in-flight-safe helper. | ✓ VERIFIED | Both row controls feed one callback; `browse-view` routes through `startDirectDownload`. |
| 04-05 | 3 | Selection bar unmount/order/summary contract holds. | ✓ VERIFIED | Source-contract and value tests pass. |
| 04-05 | 4 | One file downloads directly; folder/many creates an archive. | ✓ VERIFIED | Cardinality routing tests pass. |
| 04-05 | 5 | Pending measurement keeps summary, disables Download, and announces measuring. | ✓ VERIFIED | Pure and source-contract tests pass. |
| 04-05 | 6 | Refusals preserve selection/folder/scroll. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | State-mutating handlers are absent, but no browser test exercises focus/scroll/selection after dismissal. |
| 04-05 | 7 | Retired card/header/dismiss/downloadEntry no longer exist. | ✓ VERIFIED | Source-contract test passes and grep confirms absence. |
| 04-05 | 8 | 390px selection bar wraps without overflow. | ? UNCERTAIN (`insufficient_spec`) | Explicit `verification: backstop`; source has wrap classes but rendered geometry is unobserved. |
| 04-05 | 9 | Short-viewport refusal dialog remains reachable. | ? UNCERTAIN (`insufficient_spec`) | Explicit `verification: backstop`; browser checkpoint unperformed. |
| 04-06 | 1 | Completion/reconnect/refetch/navigation races auto-start once per job/session. | ✓ VERIFIED | Transition-guard tests pass and observer consumes live socket frames only. |
| 04-06 | 2 | Archive rows show queued/running summary, progress, path, and Cancel Archive. | ✓ VERIFIED | Rendering source is substantive/wired and frontend tests pass; the Cancel API failure is counted under the cancellation truth. |
| 04-06 | 3 | Failed/interrupted/expired states expose the correct action. | ✗ FAILED | A live-only terminal job is dropped from `/jobs` until an unrelated/manual refresh, hiding Retry/Download. |
| 04-06 | 4 | A newly observed completion auto-starts once; explicit Download uses the same helper; errors remain retryable. | ✓ VERIFIED | Shared-helper/transition/failure tests pass. |
| 04-06 | 5 | Omission disclosure preserves authoritative counts, exact paths, Download, and error state. | ✓ VERIFIED | Backend DTO-to-hook-to-row flow is wired and tests pass. |
| 04-06 | 6 | Disclosure loading reserves space and partial detail preserves known data. | ✓ VERIFIED | Merge/state derivation tests and source contracts pass. |
| 04-06 | 7 | 390px/300-character archive row geometry is safe. | ? UNCERTAIN (`insufficient_spec`) | Explicit browser backstop; checkpoint unperformed. |
| 04-06 | 8 | 300-character omission paths cannot overflow and retain accessible value. | ? UNCERTAIN (`insufficient_spec`) | Explicit browser backstop; checkpoint unperformed. |
| 04-06 | 9 | Completion/omission transitions announce exactly once. | ? UNCERTAIN (`insufficient_spec`) | Explicit screen-reader backstop; checkpoint unperformed. |
| 04-07 | 1 | Both native tools open/extract both threshold archives. | ? UNCERTAIN | Requires Windows and macOS; no run has occurred. |
| 04-07 | 2 | Native evidence records counts and representative hashes for four combinations. | ✗ FAILED | Evidence scaffold has blank fields and four `Result: PENDING` entries. |

**Score:** 19/39 truths verified (3 present and wired but behavior-unverified; 8 human/insufficient-spec; 9 failed)

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/tests/download_ticket.rs` | Full/range/atomic ticket proof | ✓ VERIFIED | 545 lines; 11/11 tests passed. |
| `.planning/phases/04-bulk-archive-downloads/04-DL09-EVIDENCE.md` | Production integrity/resume record | ⚠️ PARTIAL | Substantive real hashes/headers, but wrong literal roadmap host/journey and concurrency explicitly open. |
| `backend/migrations/0005_archive_jobs.sql` | Durable owner/manifest/omission schema | ✓ VERIFIED | 137 lines; normalized child tables and constraints are consumed by repository queries. |
| `backend/src/config.rs` | 400-GiB default + override | ✓ VERIFIED | Default/override code and tests exist; preflight consumes `max_archive_bytes`. |
| `backend/tests/archive_preflight.rs` | Bounded zero-write preflight proof | ⚠️ PARTIAL | 18 passed, one real-timeout test ignored; cloud acceptance conflicts with executor capability. |
| `backend/src/jobs/executors/archive.rs` | Deterministic atomic ZIP64 executor | ⚠️ PARTIAL | 886 substantive lines and worker wiring, but no cloud reader or current-size/cumulative-cap enforcement. |
| `backend/tests/archive_executor.rs` | Build/cancel/omission behavior | ✓ VERIFIED (limited seam) | 4/4 passed; cancellation is tested directly, not through the broken HTTP route. |
| `backend/tests/archive_zip64.rs` | Both ZIP64 threshold proofs | ⚠️ PARTIAL | Both tests are ignored by default; 65,536-entry test explicitly passed, >4-GiB test not run. |
| `backend/tests/archive_download.rs` | Owner/range/EOF/lease lifecycle | ⚠️ PARTIAL | 6/6 passed but lacks isolated suffix/end-only range coverage. |
| `backend/tests/archive_omissions.rs` | REST/WS owner disclosure | ✓ VERIFIED | 7/7 passed with real DB/socket paths. |
| `backend/tests/job_crash_recovery.rs` | Restart/sweep/retry lifecycle | ⚠️ PARTIAL | 8/8 passed but no unlink-failure audit test. |
| `frontend/lib/archive-download.ts` | Direct-or-archive routing/refusals | ✓ VERIFIED | 478 substantive lines; imported and used by browse view. |
| `frontend/components/archive-refusal-dialog.tsx` | One refusal shell | ✓ VERIFIED | 100 substantive lines; rendered by browse view with real typed outcomes. |
| `frontend/lib/archive-job-download.ts` | Shared collection + once guard | ✓ VERIFIED | 651 substantive lines; wired into socket provider and both row surfaces. |
| `.planning/phases/04-bulk-archive-downloads/04-DL06-INTEROP-EVIDENCE.md` | Four native extraction results | ✗ STUB/PENDING | Protocol/fixtures are substantive, but the artifact's required result payload is entirely unfilled. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `/dl/{ticket}` | Production tunnel consumer | `serve_local` ranged body | ⚠️ PARTIAL | Real multi-GB transport passed, but not the roadmap's exact archive/host/concurrency journey. |
| `POST /api/archive-jobs` | Manifest transaction | bounded walk → cap/capacity → `insert_archive_job` | ✓ WIRED | Real repository writes and zero-write refusals are tested. |
| Worker archive dispatch | Final ZIP | manifest → reopen → `.partial` → fsync/rename | ⚠️ PARTIAL | Local flow works; cloud is accepted then rejected and mutation size is not enforced. |
| Archive ticket | Artifact lifetime | owner check → lease → ranged body → unlink/retain | ✗ BROKEN | Owner/lease wiring exists; end-at-EOF is incorrectly equated with full collection. |
| Omission rows | REST/WS/frontend | repository → DTO → hooks → rows | ⚠️ PARTIAL | Normal flow works; insert errors are ignored, so durable REST detail can diverge from WS. |
| Selection bar/row | Download operation | shared helper → native `/dl` navigation or archive POST | ✓ WIRED | Imports, callbacks, and response handling are all present. |
| WS completion | Native archive collection | once guard → shared ticket helper | ✓ WIRED | Transition-only guard is mounted once at the socket owner. |
| Live terminal frame | `/jobs` actionable history | live/REST merge → `JobHistoryRow` | ✗ BROKEN | Renderer returns `null` when the REST snapshot predates the job; no terminal refresh occurs. |
| ZIP64 fixtures | Windows/macOS native tools | extract → count/hash evidence | ✗ NOT WIRED/UNPERFORMED | No archive or native extraction result exists. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Browse download UI | frozen selected entries | live browse entries → `routeDownloadSelection` | Yes | ✓ FLOWING |
| Archive preflight/API | ordered manifest rows | local `TierRoot` / cloud `rclone lsjson -R` → SQLite transaction | Yes | ✓ FLOWING |
| Archive executor | ZIP entry bytes | persisted manifest → local `TierRoot::open_file` | Local only | ⚠️ HOLLOW FOR CLOUD |
| Job tray/history | progress/status | worker → WebSocket + REST merge | Active rows yes; live-only terminal rows dropped | ⚠️ PARTIAL |
| Omission disclosure | count/path list | executor → DB/WS → REST/hooks/rows | Yes on successful inserts | ⚠️ PARTIAL |
| Archive download | response bytes/lifetime | final stage file → owner ticket → ranged stream | Bytes flow; deletion coverage is unsound | ✗ UNSAFE |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Preflight boundaries and HARDEN-01 | `cargo test --test archive_preflight -- --nocapture` | 18 passed, 1 ignored | ✓ PASS (deadline unverified) |
| Atomic build/cancel engine seam | `cargo test --test archive_executor -- --nocapture` | 4 passed | ✓ PASS (does not exercise HTTP cancel) |
| Owner/range/lease lifecycle | `cargo test --test archive_download -- --nocapture` | 6 passed | ✓ PASS (suffix regression absent) |
| Omission REST/WS | `cargo test --test archive_omissions -- --nocapture` | 7 passed | ✓ PASS |
| Restart/sweep/retry | `cargo test --test job_crash_recovery -- --nocapture` | 8 passed | ✓ PASS |
| Generic ticket/range | `cargo test --test download_ticket -- --nocapture` | 11 passed | ✓ PASS |
| 65,536-entry ZIP64 threshold | exact ignored test with `--ignored` | 1 passed in 5.88s | ✓ PASS |
| Frontend decision/state/source contracts | `npm test` | 250 passed, 0 failed/skipped | ✓ PASS |
| >4-GiB ZIP64 threshold | Not run | Exceeds cheap spot-check bounds | ? SKIP |

## Probe Execution

No PLAN/SUMMARY declares a probe and no conventional `scripts/**/tests/probe-*.sh` exists. Step 7c: N/A.

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| DL-01 | 04-05 | Multi-select files/folders and download one archive | ✗ BLOCKED | Local selection path works, but cloud selections are accepted into guaranteed-failure jobs. |
| DL-02 | 04-05 | Button beside Send to… replaces card | ✓ SATISFIED | Source and tests prove order/wiring and card removal. |
| DL-03 | 04-02, 04-05 | Refuse over 400 GB before work and show total | ✗ BLOCKED | Static boundary works; actual bytes can exceed the cap/capacity after source growth. |
| DL-04 | 04-03, 04-05, 04-06 | Background progress and safe cancellation | ✗ BLOCKED | Progress works; production cancel endpoint returns 500 for archives. |
| DL-05 | 04-03, 04-04 | Completed archive survives restart/power cut | ✓ SATISFIED | Recovery preserves completed final and removes interrupted partials in passing tests. |
| DL-06 | 04-03, 04-07 | Native Windows/macOS interop beyond both limits | ? NEEDS HUMAN / BLOCKING CHECKPOINT | Four required native results are pending. |
| DL-07 | 04-04, 04-06 | Remove after collection; sweep uncollected | ✗ BLOCKED | One-byte suffix range can consume/delete the artifact; sweeper also reports success on unlink failure. |
| DL-08 | 04-03, 04-04, 04-06 | Disclose files omitted mid-build | ✓ SATISFIED WITH WARNING | Vanish/symlink and DTO/UI flows pass; omission DB insert errors are ignored. |
| DL-09 | 04-01, 04-04, 04-06 | Large archive completes over production tunnel | ✗ BLOCKED | Strong generic staged-file transport proof exists, but no produced archive/exact roadmap route/concurrent attempt evidence. |
| HARDEN-01 | 04-02 | Reject malformed `on_collision` | ✓ SATISFIED | Closed enum plus malformed/null/concurrent tests pass. |

**Coverage:** 4/10 satisfied, 5 blocked, 1 awaiting mandatory human evidence. All requirement IDs declared in PLAN frontmatter are accounted for; no Phase 4 requirements are orphaned from plans.

## Prohibitions

| Prohibition | Status | Evidence |
|---|---|---|
| Do not claim transport safety from localhost-only evidence. | ✓ VERIFIED | Multi-GB run traversed the public Cloudflare edge at `api.cinedise.com`. |
| Member cannot choose Stage destination or browse `_archives`. | ✓ VERIFIED | Server computes destination; `_archives` preflight/listing/generic-mint tests pass. |
| Partial success cannot hide omissions. | ✓ VERIFIED WITH WARNING | Completed WS/REST/UI fields exist; omission insert failures can make durable detail incomplete. |
| Another member cannot collect the archive. | ✓ VERIFIED | Owner-mint and cross-owner REST/WS tests pass. |
| Member copy does not expose ZIP64/manifest/ticket/Range/Cloudflare jargon. | ✓ VERIFIED | Copy regression test passes. |
| Auto-collection cannot retrigger on refetch/reconnect/navigation. | ✓ VERIFIED | Transition-only session-guard tests pass. |

## Test Quality Audit

| Test File | Linked Req | Active | Skipped/ignored | Circular | Strongest Assertion | Verdict |
|---|---|---:|---:|---|---|---|
| `archive_preflight.rs` | DL-03, HARDEN-01 | 18 | 1 | No — writes are input fixtures | Behavioral + DB row values | ⚠️ Deadline behavior not executed |
| `archive_executor.rs` | DL-04, DL-05, DL-08 | 4 | 0 | No | Behavioral filesystem/DB | ⚠️ Direct seam only; misses HTTP cancel and growth |
| `archive_zip64.rs` | DL-06 | 0 default / 1 explicitly run | 2 default-ignored | No | Value + independent reader | 🛑 >4-GiB proof unrun; native consumers absent |
| `archive_download.rs` | DL-05, DL-07, DL-09 | 6 | 0 | No | Behavioral HTTP/filesystem | 🛑 Missing suffix/end-only collection case |
| `archive_omissions.rs` | DL-08 | 7 | 0 | No | Behavioral DB/REST/WS | ⚠️ Missing injected persistence failure |
| `job_crash_recovery.rs` | DL-05, DL-07 | 8 | 0 | No | Behavioral DB/filesystem | ⚠️ Missing unlink failure/unavailable stage case |
| `archive-download.test.ts` | DL-01…DL-04 | 43 | 0 | No | Value + source contract | ⚠️ No DOM geometry/focus execution |
| `archive-job-download.test.ts` | DL-04, DL-07…DL-09 | 57 | 0 | No | Value + source contract | ⚠️ Missing same-turn explicit double-click and terminal live-only history |

**Disabled tests on requirements:** 3 default-ignored. One (65,536 entries) was explicitly run and passed here; the real timeout and >4-GiB tests were not run.  
**Circular patterns detected:** 0 — filesystem writes create independent input fixtures, not expected outputs generated by the system under test.  
**Assertion strength:** strong where tests exist; the four confirmed critical paths are absent from the suites.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `backend/src/api/jobs.rs` | 1091 | Production branch returns “archive job cancellation is not yet implemented” | 🛑 Blocker | Exposed Cancel Archive cannot work. |
| `backend/src/jobs/executors/archive.rs` | 180 | Accepted cloud capability ends at “not yet implemented” | 🛑 Blocker | API persists jobs guaranteed to fail. |
| `frontend/app/jobs/page.tsx` | 304 | `if (!record) return null` with no promised refresh | 🛑 Blocker | Terminal live-only jobs and actions disappear. |
| `04-DL06-INTEROP-EVIDENCE.md` | 1-332 | Result payload remains scaffold/PENDING | 🛑 Blocker | Native interoperability is not proven. |
| `backend/src/jobs/recovery.rs` | 285-299 | Unlink result discarded before success audit | ⚠️ Warning | False/duplicate sweep records while file remains. |
| `backend/src/jobs/worker.rs` | 1187-1191 | Omission insert result discarded | ⚠️ Warning | WS and durable REST omission detail can diverge. |
| `frontend/components/job-row.tsx` | 557-562 | Render-state-only explicit collection guard | ⚠️ Warning | Same-turn clicks can mint duplicate tickets. |

No unreferenced `TBD`, `FIXME`, or `XXX` debt markers were found in Phase 4 implementation files.

## Decision Coverage

All 14 trackable `04-CONTEXT.md` decisions are recognized by the automated decision-coverage gate. This is advisory and does not offset the implementation gaps above.

## Human Verification Required

These checks remain required after code blockers are closed; because `gaps_found` has precedence, they do not change the overall status to `human_needed` yet.

### 1. Native ZIP64 interoperability

**Test:** Complete `04-DL06-INTEROP-EVIDENCE.md` using Windows Explorer and macOS Archive Utility against both >4-GiB and 65,536-entry archives.  
**Expected:** Four real PASS results with exact entry counts and representative hashes.  
**Why human:** The required native clients are unavailable in this environment.

### 2. Responsive, focus, live-region, and native-download browser protocol

**Test:** Perform Plan 04-06 Task 3 at desktop, 390px, short viewport, long paths, keyboard-only, reduced motion, and a screen reader.  
**Expected:** No overflow/focus loss/repeated announcement; Download stays native and never buffers in JavaScript.  
**Why human:** The project has no DOM/browser/accessibility harness; this checkpoint is explicitly still awaiting approval.

### 3. Real deadline failure

**Test:** Run the named ignored 60-second preflight timeout test once.  
**Expected:** Timeout fails closed with zero job and manifest rows.  
**Why human:** It intentionally exceeds the verifier's cheap spot-check bound.

## Gaps Summary

The phase goal is not achieved. The main local staged-archive path is substantial and many focused tests pass, but production wiring and data-safety invariants still fail: users cannot cancel archives through the API; cloud jobs are accepted though unexecutable; a one-byte suffix request can delete the archive; source growth bypasses the cap/capacity contract; terminal live jobs can lose their actions; and the exact DL-09 journey plus mandatory native ZIP64 evidence are absent. Phase 5 covers folder sizes only, so none of these gaps is deferred to a later milestone phase.

### Recommended Gap-Closure Shape

1. **Backend lifecycle/data-safety plan:** wire HTTP cancellation; fix full-coverage deletion; enforce reopen/cumulative sizes; make sweep/omission persistence failures explicit; add the missing regression tests.
2. **Capability-honesty plan:** implement cloud archive reads or fail closed before insertion, with an end-to-end cloud test.
3. **Frontend/evidence closure plan:** retain/refresh live terminal jobs, add atomic explicit-collection gating, run the browser checkpoint, execute the exact production archive journey, and complete four native interop results.

## Next Action

**Canonical routing:** Gaps found. Plan the fixes, then re-run execute-phase before shipping.  
**Next command:** `/gsd-plan-phase 04 --gaps`

Do not advance to Phase 5 on this report.

---

_Verified: 2026-08-29T16:20:03Z_  
_Verifier: the agent (gsd-verifier)_
