---
phase: 04-bulk-loan-export
plan: 06
subsystem: frontend
tags: [react, typescript, websocket, accessibility, download]

status: awaiting-checkpoint

requires:
  - phase: 04-bulk-loan-export
    provides: "04-04's owner-checked download-ticket route, the finished-frame skipped-loan fields, and the detail route's total"
  - phase: 04-bulk-loan-export
    provides: "04-05's export-download.ts transport seam (postJson, navigateTo) and the DIRECT_DOWNLOAD_ERROR sentence"
provides:
  - "export-collect.ts: startExportCollection (the ONE ticket-and-navigate helper) plus the per-session hand-off record"
  - "useExportAutoCollect and useExportCollectionState: the React seam over that session record"
  - "ExportRow lifecycle rendering: summary, current-loan line, queued caption, Cancel Export, Retry, Download and the skipped-loan disclosure"
  - "ExportHistoryRow labels, a sibling Download and the log page's skipped-loan list"
  - "isDockedExport: the strip's finished-export carve-out to the active-only rule"
affects:
  - "a later plan that changes the strip's active-only rule must account for isDockedExport"
  - "any later caller of canActOnExport must keep the export branch in step with the server's owner check"

actuals:
  tokens: 38400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A module-level session record (guard set, per-export state, revision counter) read through useSyncExternalStore, so a remount never starts a second download"
    - "Auto-start gated on an observed TRANSITION (a previous status seen this session), not on a first sighting"
    - "Source-contract assertions inside the pure-lib test file for rendering rules the repo has no component harness to run"

key-files:
  created:
    - src/web/lib/export-collect.ts
    - src/web/lib/export-collect.test.ts
  modified:
    - src/web/lib/use-exports-socket.ts
    - src/web/lib/use-exports-list.ts
    - src/web/lib/permissions.ts
    - src/web/lib/permissions.test.ts
    - src/web/shell/socket-provider.tsx
    - src/web/pages/loan-log/export-row.tsx
    - src/web/pages/loan-log/export-history-row.tsx
    - src/web/pages/loan-log/export-strip.tsx
    - src/web/pages/exports.tsx

decisions:
  - "Auto-start needs a previously seen unfinished status for the same export in the same session; a first sighting of an already finished export never navigates anywhere."
  - "The once-per-export claim lives in a module-level record, not in component state, so a double effect under strict mode cannot start two downloads."
  - "An export that has been collected is never inferred; neither the list route nor the socket says so, so the row stays on Download until it is handed to the browser."
  - "A successful hand-off records started, not collected, because the server keeps the file after an early client drop."
  - "Truncation is derived when a disclosed loan list is shorter than the authoritative count, since the finished frame carries both."
  - "The skipped-loan COUNT rides the single polite region's finished sentence; the expanded list is a sibling outside that region."

requirements-completed: []
requirements-pending: [EXPT-02, EXPT-04, EXPT-06, EXPT-09]
---

# Phase 04 Plan 06: Export Row Presentation, Auto-Collection & Skipped-Loan Disclosure — Summary (PARTIAL)

**Status: awaiting-checkpoint.** Tasks 1 and 2 are built, verified and committed.
Task 3 is a `checkpoint:human-verify` and has **not** been run; its phone and
desktop protocol belongs to a person. This plan is NOT complete and its
requirements are NOT marked done.

A finished export now collects itself exactly once per export per session
through the same ticket-and-navigate helper the explicit Download uses, and
every export state renders its fixed wording, one contextual action and its
exact skipped-loan disclosure in both the strip and the log page.

## Tasks Completed

| Task | Name | Commit | Key files |
|------|------|--------|-----------|
| 1 | Collect a finished export exactly once | `a41c7e9` | `src/web/lib/export-collect.ts`, `src/web/lib/export-collect.test.ts`, `src/web/lib/use-exports-list.ts` |
| 2 | Render the export lifecycle and the exact skipped-loan list | `5d08b36` | `src/web/pages/loan-log/export-row.tsx`, `src/web/pages/loan-log/export-history-row.tsx`, `src/web/pages/loan-log/export-strip.tsx` |
| 3 | Check narrow-screen, focus, live-region and native-download behaviour | — | **PENDING HUMAN VERIFICATION** |

## What Was Built

### Task 1 — one helper, one navigation, one transition

`startExportCollection` is the only function that asks for a ticket and
navigates. The auto-collect hook and the explicit Download both call it, and a
guard set keyed on the export id stops a second call in the same session.

### Task 2 — the state table, in the existing row shape

| State | Line 1 / status | Action |
|-------|-----------------|--------|
| Queued | `Export of {Month} · {N} loans`, `Queued — waiting for a free slot` | `Cancel Export` (outline) |
| Running | `adding {loan}` plus the existing progress bar | `Cancel Export` (outline) |
| Interrupted | `Interrupted — retry to rebuild the file` | `Retry` (outline) |
| Failed | the server's reason, word for word | `Retry` (outline) |
| Cancelled | `Cancelled — partial file removed` | none |
| Finished | `Export ready` / `Export ready — {N} loan(s) skipped` | `Download` (accent) |
| Collected or expired | `Export no longer available` | `Retry` (outline) |

## Verification

All three gates ran against the final tree (commit `5d08b36`):

```
npm test
# tests 212 / pass 212 / fail 0

npm run lint
# 1 problem (0 errors, 1 warning)
#   the existing exhaustive-deps warning in loan-table.tsx, baseline, out of scope

npm run build
# build succeeded, 11 routes
```

Baseline before this plan was 171 tests, 0 errors, 1 warning. This plan added
41 tests and changed neither count of lint output.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `mergeExportFrames` keyed the same export twice**
- **Found during:** Task 1, while choosing the guard's key.
- **Issue:** the socket sends `export_id` as a number while the list route
  builds the id as a string, so the merge map held `12` and `"12"` as two slots
  and a finished export drew twice on the log page.
- **Fix:** every key now goes through one `exportKey()`, and the live frame's id
  is normalised before it is emitted.
- **Files:** `src/web/lib/use-exports-list.ts`, `src/web/lib/export-collect.ts`
- **Commit:** `a41c7e9`

**2. [Rule 1 — Bug] `canActOnExport` disagreed with the server for finished files**
- **Found during:** Task 2, wiring Cancel Export's disabled state.
- **Issue:** the server lets an export's owner act on it, but the client check
  also asked for the steward role, so an owner without it saw Cancel and Retry
  disabled on their own export.
- **Fix:** added the matching owner branch and a test that pins it.
- **Files:** `src/web/lib/permissions.ts`, `src/web/lib/permissions.test.ts`
- **Commit:** `5d08b36`

### Files changed beyond the plan's file list

Both are Rule 2 (missing critical functionality), not convenience:

**3. `src/web/shell/socket-provider.tsx`** — the auto-collect observer must be
mounted once for the whole app. Mounting it on the log page alone would make
collection depend on where the steward stood when the export finished.

**4. `src/web/pages/loan-log/export-strip.tsx`** — see the flagged conflict below.

### New copy missing from the UI-SPEC

**`EXPORT_NOT_OWNER` = "Only the steward who started this export can download
it."** The UI-SPEC has no 403 sentence, since it assumed only the owner ever
sees the row. The export list is deliberately unscoped, so another steward does
see a finished row, and its Download would otherwise fail without a word.
**RESOLVED (E2, 2026-04-15)** — accepted as written; hiding Download from
non-owners is not possible because the list data carries no owner field.

## Flagged Conflict — D-03 vs. D-09 — RESOLVED (E1, 2026-04-15)

The UI-SPEC says a finished export's row, in the strip and in the log page
history, always carries an explicit `Download`. But D-09 limits the strip to
active statuses, which leaves out `finished`. As written, the two cannot both
hold.

Left alone, a steward on the catalogue whose auto-start fails would see the row
leave the strip, with the retry sentence shown nowhere in view.

**What was built:** a narrow carve-out, `isDockedExport()`. A finished export
stays in the strip exactly as long as it is still asking for something, and
leaves once it has been handed to the browser or found gone. Finished copies of
other kinds still drop into history unchanged.

**Ruling: keep the carve-out.** No code changed; the ruling confirmed the
behaviour as built. The only item still open on this plan is Task 3.

## Known Stubs

None. No placeholder values and no unwired data.

## Task 3 — Pending Human Verification

Task 3's automated part ran so the person exercises a known-good build. Its
phone and desktop protocol has **not** been run and nothing committed claims it
passed.

Resume signal: `approved` with observations, or the failing check plus the
viewport.

## Self-Check: PASSED

- `src/web/lib/export-collect.ts` — FOUND
- `src/web/lib/export-collect.test.ts` — FOUND
- commit `a41c7e9` — FOUND
- commit `5d08b36` — FOUND
