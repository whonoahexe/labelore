---
phase: 4
reviewers: [claude, codex, opencode, qwen]
reviewed_at: 2026-04-09T10:42:17Z
plans_reviewed: [04-02, 04-03]
models:
  claude: "example-model-a (reasoning=high)"
  codex: "unknown"
  opencode: "example-model-b"
  qwen: "example-model-c"
model_sources:
  claude: "config"
  codex: "unknown"
  opencode: "banner"
  qwen: "config"
plan_coverage:
  codex:
    total: 2
    missing: ["04-03"]
made_up_example: true
derived_from: gsd-core/workflows/review.md
gsd_core_version: 1.19.0
---

# Cross-AI Plan Review — Phase 4

<!-- gsd:plan-revision-conflicts:begin -->
## Plan-Revision Conflicts
- [ ] REVISION_CONFLICT scope_reduction/04-02 — required_property: the month walk is bounded by a named deadline | conflicts with: D-13 (the pre-check never reads more than one month) | alternatives: keep the deadline and drop the second walk; or move the deadline into the request type
<!-- gsd:plan-revision-conflicts:end -->

## Claude Review

## 04-02

### Summary
Plan 04-02 turns the one-way ordered-list decision into a migration and a single-transaction pre-check. The shape is sound: count, order and duplicate checks all run before any row is written, so a refusal leaves nothing behind. The weak spots are the cap and the deadline, which are named in the plan but tested only at their defaults.

### Strengths
- Every refusal path is stated to write zero rows, and the behavior block names each path (cap, timeout, empty month, duplicate, unknown loan).
- The staging place is chosen by the server, so a member cannot point the export at a folder (`src/server/jobs/exports.ts`).
- Lend on the source shed is the only permission the request needs, which matches `src/server/loans/select.ts`.

### Concerns
- **MEDIUM:** `Config.maxExportLoans` is read once at startup, so changing `MAX_EXPORT_LOANS` needs a restart and the plan's regression test only proves the default of 5,000.
- **MEDIUM:** the named deadline on the month walk has no test that makes it fire, so the timeout refusal is claimed but never shown.
- **LOW:** `ExportListEntry` carries a display name that the export does not need.

### Suggestions
- Add a second cap setting to the pre-check test and assert the refusal total is the real count.
- Drive the deadline with an injected slow query and assert zero rows afterwards.

### Risk Assessment
LOW. The design closes the dangerous paths; the open items are test gaps, not design gaps.

### Verdict
approve

## 04-03

### Summary
Plan 04-03 builds the archive from the saved list. It reads the saved ids, never the live loan table, so a re-run produces the same file.

### Strengths
- Reads only the saved rows, which keeps resume exact.
- The skipped-loan table is written in the same transaction as the job.

### Concerns
- **LOW:** the archive file name embeds the month but not the shed.

### Suggestions
- Add the shed code to the file name.

### Risk Assessment
LOW.

### Verdict
approve

## Codex Review

## 04-02

Overall this plan is workable but under-specified on failure. I checked `src/server/routes/export-jobs.ts` and `src/server/loans/count.ts` against the plan text.

Strengths:
- The request type is closed, so a malformed clash value is refused before anything runs.
- Owner binding is explicit and tested.

Concerns:
- MEDIUM: the count and the list are read in two statements, so a loan added between them makes the stated total wrong by one. The plan does not say which one wins.
- MEDIUM: the cap is checked after the month walk, so the walk itself is unbounded in time for a very large shed.
- LOW: `OnClash` allows a value the migration has no column for.

Suggestions:
- Take the count and the list inside one read transaction.
- Check the cap while walking, not after.

Risk: MEDIUM. The unbounded walk is the one issue that could hurt a live shed.

---

## OpenCode Review

## 04-02

### Summary
The plan is careful about what gets written and careless about what gets read. Writing is one transaction; the reads before it are several separate queries that can disagree.

### Strengths
- Zero-write refusals are the right default and are stated for every path.
- The decision checkpoint in Task 1 keeps the one-way choice with the steward lead.

### Concerns
- **HIGH:** the timeout result is not defined: the plan says "a named deadline" without naming it or saying what the member sees, so the refusal can only be guessed at by the tests.
- **MEDIUM:** `Config.maxExportLoans` is read once at startup, so changing `MAX_EXPORT_LOANS` needs a restart and the regression test only proves the default of 5,000.
- **MEDIUM:** duplicate-loan handling is listed as a flagged assumption and never settled, so two tasks later will build on a guess.

### Suggestions
- Name the deadline in config and in the refusal text.
- Settle duplicate handling in the decision checkpoint, not in a test.

### Risk Assessment
HIGH. Three open definitions sit under a migration that cannot be reversed.

## 04-03

### Summary
The archive step trusts the saved list completely, which is right, but it never checks that the saved list still belongs to a shed the steward may read.

### Strengths
- Saved ids make resume exact.

### Concerns
- **HIGH:** a steward whose lend permission is removed between save and build still gets the archive.
- **MEDIUM:** the skipped-loan table has no index on the job id.

### Suggestions
- Re-check the permission when the archive is built.

### Risk Assessment
HIGH.

### Verdict
revise

## Qwen Review

qwen review failed or returned empty output. stderr:
error: request to http://127.0.0.1:11999/v1/chat/completions failed, reason: connect ECONNREFUSED 127.0.0.1:11999

Nothing was captured on stdout. Check the lane's configuration and run it again.

---

## Consensus Summary

Three of four lanes returned a review; Qwen failed and counts for nothing here. Codex did not reach plan 04-03.

### Agreed Strengths
- Every refusal path writes zero rows (Claude, Codex, OpenCode).
- The server chooses the staging place and the request type is closed (Claude, Codex).

### Agreed Concerns
- `MAX_EXPORT_LOANS` is read once at startup and the test only proves the default (Claude, OpenCode). Plan 04-02.
- The month walk's deadline is unnamed or untested, so the timeout refusal is claimed but not shown (Claude, Codex, OpenCode). Plan 04-02.

### Divergent Views
- Overall risk: Claude LOW, Codex MEDIUM, OpenCode HIGH. The gap is mostly about whether the open definitions (deadline, duplicate handling) are test gaps or design gaps.
- Plan 04-03: Claude approves; OpenCode calls for a revision because a removed permission is not re-checked at build time. Worth checking against `src/server/jobs/exports.ts` before 04-03 is executed.
