---
phase: 04
slug: bulk-loan-export
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
reconciled: 2026-04-09
---

# Phase 04 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | `vitest` in both the server and the web client |
| Config | `server/vitest.config.ts`; `web/vitest.config.ts` |
| Quick | `cd server && npx vitest run -t 'export|download'`; `cd web && npm test -- -t 'export|download'` |
| Full | `cd server && npx vitest run`; `cd web && npm test && npm run lint && npm run build` |

## Sampling Rate

- After each task commit, run that task's own command.
- When a wave that touches them finishes, run both whole suites.
- To close the phase, run both whole suites and the slow ZIP64 threshold suite, and collect PASS evidence from the two blocking manual plans (EXPT-05 and EXPT-06).
- The long threshold, desktop-tool, live-proxy and browser probes are blocking gates in their own right; everyday task feedback targets under 20 seconds.

## Final Per-Task Verification Map

| Task ID | Wave | Requirement | Verification | Prerequisite creation before consumption |
|---|---:|---|---|---|
| 04-01-01 | 1 | EXPT-05 | `cd server && npx vitest run export-ticket` | This TDD task first extends the existing ticket fixture, then touches the handler. |
| 04-01-02 | 1 | EXPT-05 | Evidence-file PASS gate for the live proxy | 04-01-01 builds and tests Range-capable delivery beforehand. |
| 04-02-01 | 2 | EXPT-03 | Existing migration presence gate; blocking decision | The schema exists already; the checkpoint precedes the migration that cannot be undone. |
| 04-02-02 | 2 | EXPT-03 | `cd server && npx vitest run export-preflight` | This task writes the test file, the month fixtures, the cap default and override cases, and the migration, tests first. |
| 04-03-01 | 3 | EXPT-02, EXPT-04 | `cd server && npx vitest run export-executor` | The executor test file goes in red ahead of the export code; the Plan 02 manifest is already there. |
| 04-03-02 | 3 | EXPT-06 | `cd server && npx vitest run export-zip64 --slow` | This task builds the sparse over-4-GiB and 65,536-entry fixtures before asserting anything about the writer. |
| 04-04-01 | 4 | EXPT-01 | `cd server && npx vitest run export-download` | This task writes the finish-versus-early-drop harness first; the Plan 01 Range seam is in place. |
| 04-04-02 | 4 | EXPT-02 | `cd server && npx vitest run job-crash-recovery` | The existing recovery fixture gains partial and final cases before any recovery code. |
| 04-05-01 | 5 | EXPT-01, EXPT-04 | Targeted web tests, lint, build, then the blocking browser protocol | The automated gate yields the production build ahead of any browser or accessibility check. |
| 04-06-01 | 3 | EXPT-06 | Evidence file holds exactly four `Result: PASS` records | Plan 03 builds both threshold exports and parses them on its own before the native tools get them. |

## Wave 0 Reconciliation

There is no separate Wave 0 plan. Each harness that was missing gets written, tests first, by the task that uses it or by something earlier in the chain:

- Forced-ZIP64 writer and its dependency: 04-03-01; threshold fixtures: 04-03-02.
- Month fixtures and cap-config cases: 04-02-02.
- Finish-versus-early-drop body harness: 04-04-01.
- Restart partial and final fixture: 04-04-02.
- Web routing, refusal and auto-start fixtures: 04-05-01.
- Live proxy evidence: blocking 04-01-02 after the local Range tests.

`wave_0_complete` is therefore true at planning level: no test command refers to a harness that is absent, unless that same TDD task or an earlier plan makes it.

## Manual-Only Verifications

| Gate | Requirement | Instructions and evidence |
|---|---|---|
| Live proxy integrity and resume (04-01-02, BLOCKING) | EXPT-05 | Go through the live desk address, fetch a really large finished export, break the transfer, request a new ticket, resume with Range, reassemble the file and compare SHA-256; note headers, settings and timings in `04-EXPT05-EVIDENCE.md`. |
| Native ZIP64 interoperability (04-06-01, BLOCKING) | EXPT-06 | Produce an export above 4 GiB and one above 65,535 entries; open and unpack each in the two desktop archive tools; write the four tool-and-threshold results, counts and hashes into `04-EXPT06-INTEROP-EVIDENCE.md`. |
| Browser and accessibility protocol (04-05-01, BLOCKING) | EXPT-01, EXPT-04 | Work through each UI-contract backstop on the production build: desktop width, 390px, a short window, long names, keyboard only, and reduced motion. |

## Validation Sign-Off

- [x] All settled task IDs and waves appear in the map.
- [x] Each task has an automated gate; claims that only a person can check have blocking checkpoints and evidence-file gates.
- [x] No stretch of three implementation tasks goes without automated feedback.
- [x] Every absent fixture is written first by the task that needs it, or by an earlier dependency.
- [x] Watch-mode flags are not used.
- [x] The EXPT-05 and EXPT-06 evidence waits for execution and blocks completion of the phase; this file makes no claim that those checks passed.

**Approval:** planning-level validation is reconciled; execution evidence is still owed at the blocking checkpoints named above.
