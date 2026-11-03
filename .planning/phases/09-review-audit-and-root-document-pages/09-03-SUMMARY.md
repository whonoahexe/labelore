---
phase: 09-review-audit-and-root-document-pages
plan: 03
subsystem: planning-repo
tags: [review, review-fix, finding-ids, naming-grammar, recognition, routes]
requires:
  - phase: 08
    provides: ReviewHandler / ReviewFixHandler and the review-report extractors this plan widens
provides:
  - parseReviewFixName and ReviewFixNameResult in the one grammar module
  - kind review-fix, REVIEW-FIX token and review-fix-<suffix> address for suffixed fix files (phase and quick forms)
  - widened finding-ID scan (shard tags, phase segments), severityOfId and leadingFindingId exports
  - ReviewFixEntry.commits (every hash of a Commit or Commits field, at most 8)
  - made-up Lendshed 03-REVIEW-FIX-backend.md and 03-REVIEW-FIX-frontend.md fixtures
affects: [09-05, 09-12, 09-13]
actuals:
  tokens: 9350
  tasks: 2
  commits: 2
plan_head_before: f7bba6d9c719752ccd67721d018c28d2ec6dec05
plan_head_after: 3345597bdf8dd9fbe107f0a41a44fd95b1b3d98b
tech-stack:
  added: []
  patterns:
    - "Bounded character scan for IDs (no regex over text); tag read only as a second attempt after the plain reading"
key-files:
  created:
    - test/review-family.test.ts
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-REVIEW-FIX-backend.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-REVIEW-FIX-frontend.md
  modified:
    - src/planning-repo/naming.ts
    - src/planning-repo/folders.ts
    - src/planning-repo/handlers/artifact-token.ts
    - src/planning-repo/handlers/review-report.ts
    - src/presentation/routes.ts
    - test/naming.test.ts
    - test/recognition-kinds.test.ts
    - test/presentation/url-grammar.test.ts
    - test/review-report.test.ts
key-decisions:
  - "Shard files (NN-REVIEW-shard-*.md) stay kind unknown (research A4); pinned by a recognition test"
  - "A Commits field that is only a hash list leaves commitNote null; any other wording keeps today's note"
  - "A shard tag is taken only after the plain ID reading fails, so WR-P1-01 and FL-CR-01 are both unambiguous"
requirements-completed: [VIEW-09]
duration: 9min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 03: Suffixed fix files and widened finding IDs Summary

**Suffixed review-fix files (03-REVIEW-FIX-backend.md) open as review fix pages at /phase-N/review-fix-<suffix>, shard-tagged and phase-segment finding IDs are read with severity from the token, and plural Commits fields keep every hash.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-11-03T07:24:37Z
- **Completed:** 2026-11-03T07:33:47Z
- **Tasks:** 2
- **Files modified:** 12 (3 created, 9 modified)

## Accomplishments

- `parseReviewFixName` (quick form tried first, then phase form, suffix 1-40 letters/digits/hyphens) feeds three call sites: `grammarKindOf` (kind `review-fix`), `artifactTokenOf` (token `REVIEW-FIX`, so `ReviewFixHandler` claims the file unchanged) and `phaseFileAddress` / `quickAddress` (`<base>/review-fix-<suffix lower-cased>`; a foreign prefix still takes `file/`). Plain `NN-REVIEW-FIX.md` and every earlier address are unchanged, and `route-table.test.ts` passes unmodified.
- `idEndAt` reads `A-WR-01`, `C-CR-02`, `FL-CR-01`, `D-IN-03` and `WR-P1-01` by bounded character scan; `W-01`, `ABCDE-01`, `WR-01a`, `A-B-01`, `WR-P-01` are rejected. `severityOfId` and `leadingFindingId` are exported for the ledger and disposition readers.
- `ReviewFixEntry.commits` keeps up to 8 hashes in order with `commit` as the first; the singular field behaves as before.
- Two invented Lendshed fixtures cover the suffixed shape (plural Commits, an ID the review does not hold); growth tests cover 200k-character heading lines, capital/hyphen runs and long hash lists.

## Task Commits

1. **Task 1: Suffixed fix file opens as a review fix (tracer)** - `57cfdcd` (feat)
2. **Task 2: Shard-tagged IDs, severity by token, plural commits** - `3345597` (feat)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `src/planning-repo/naming.ts` - `parseReviewFixName`, two anchored regexes cited in place
- `src/planning-repo/folders.ts`, `src/planning-repo/handlers/artifact-token.ts`, `src/presentation/routes.ts` - the three call sites
- `src/planning-repo/handlers/review-report.ts` - widened ID scan, `severityOfId`, `leadingFindingId`, `commits`
- `test/review-family.test.ts` - Lendshed suffixed files are `review-fix` with the expected keys and non-empty entries
- `test/fixtures/lendshed/.../03-REVIEW-FIX-{backend,frontend}.md` - made-up fix reports

## Decisions Made

- Shard review files stay unknown (research A4, user-confirmed).
- A pure hash list in a Commits field yields `commitNote: null` rather than a stray `", e4f5a6b"`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verification run without a local node_modules**
- **Found during:** Task 1 verify
- **Issue:** the worktree has no `node_modules`, so `npm run test:gate` could not start vitest.
- **Fix:** temporarily symlinked the main checkout's `node_modules` for the first gate run, then removed it (an untracked symlink broke `fixture-leak.test.ts`'s `git ls-files` walk with EISDIR). Later runs invoked the main checkout's `vitest`, `tsc`, `eslint` and `vite` binaries directly from the worktree root.
- **Files modified:** none committed

**2. [Plan step skipped - environment] `systemctl --user restart labelore` not run**
- **Found during:** Task 2 finish
- **Issue:** the service's `WorkingDirectory` is the main checkout, so restarting it from this worktree would load none of these changes and could disturb a shared service while other agents run.
- **Fix:** ran `vite build` in the worktree (succeeded) and left the restart to the orchestrator after merge.

**Total deviations:** 2 (1 blocking-environment, 1 skipped environment step). **Impact:** none on code.

## Issues Encountered

- Three failures in the full unit run are not caused by this plan (see Deferred Issues).

## Deferred Issues

`test/web/pattern-map-corpus.test.ts` (09-PATTERNS.md) and `test/web/ui-spec-corpus.test.ts` (09-UI-SPEC.md, two tests) fail on `LB:phases/09-review-audit-and-root-document-pages/...` with "needs a pinned entry": labelore's own phase-9 planning documents are walked by the corpus guards but not yet pinned. They fail identically without this plan's changes (files unchanged here) and belong to whichever plan pins the phase-9 corpus. Full run otherwise: 4845 passed, 0 skipped, 0 todo.

## Known Stubs

None.

## Threat Flags

None. The suffix grammar admits only letters, digits and hyphens up to 40 characters and is encoded once (T-09-06); a foreign phase prefix takes `file/` (T-09-07); all new scans are bounded character loops over clipped lines, with growth tests (T-09-05).

## Next Phase Readiness

Ready for 09-05 (disposition reader uses `leadingFindingId`) and 09-12/09-13 (ledger pages have suffixed fix files, widened IDs and `commits[]` to read). Restart `labelore` after the wave merges.

## Self-Check: PASSED

- Created files exist (naming grammar, fixtures, `test/review-family.test.ts`); commits `57cfdcd` and `3345597` are ancestors of HEAD.
- Acceptance criteria re-run: `parseReviewFixName` export count 1, call sites in folders/routes/artifact-token present, fixture present, `severityOfId` 1, `leadingFindingId` 1, `commits` 6 occurrences.
- Typecheck (server and web), eslint on `src test`, and `vite build` exit 0; Task 1 gate set: 363 passed, 0 skipped.

---
*Phase: 09-review-audit-and-root-document-pages*
*Completed: 2026-11-03*
