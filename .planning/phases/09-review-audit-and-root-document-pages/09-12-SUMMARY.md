---
phase: 09-review-audit-and-root-document-pages
plan: 12
subsystem: presentation
tags: [review-ledger, review-fix, tabs, fix-sections, ledger-context, design-language]
requires:
  - phase: 09-03
    provides: suffixed review-fix files, review-fix-<suffix> routes, widened finding IDs, plural commits
provides:
  - buildLedgerContext, ledgerFixMembers, LedgerContext (the review-family member set by directory and kind)
  - ledgerContext on the /documents response for review, review-fix and review-disposition files
  - LedgerSwitch strip, LedgerHead and the Fix tab (FixTabView, composeReviewLedger, composeLedgerHead)
  - a review context that merges every fix file of the phase
affects: [09-13]
actuals:
  tokens: 25000
  tasks: 2
  commits: 2
plan_head_before: 2fd03cb24cce994d3ee0b8a08643daef0967f2ef
plan_head_after: 224b34141ff2f514a77419db39605831c0bb1e4f
tech-stack:
  added: []
  patterns:
    - "The member set is the primary representation: the review context's fix sibling is derived from the ledger's fix members; the name swap is gone"
    - "A strip and head first in the page through the existing switcher slot, drawn only once a second review-family file exists"
key-files:
  created:
    - src/presentation/review-ledger.ts
    - src/web/components/ledger-switch.tsx
    - src/web/views/review-ledger.ts
    - src/web/views/review-ledger-components.tsx
    - test/presentation/review-ledger.test.ts
    - test/web/review-ledger.test.ts
  modified:
    - src/presentation/review-context.ts
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/presentation/review-context.test.ts
    - test/web/review-view-contract.test.ts
    - test/web/review-threads-corpus.test.ts
key-decisions:
  - "Head classes are view-review-ledger-* (not view-review-head): .view-review-head already styles the review page's own head"
  - "LedgerContext also carries severityById so the web composer needs no runtime import of the handler's severity reader"
  - "A second REVIEW in one folder is not a member of the first's ledger and stays a lone review"
requirements-completed: [VIEW-09]
coverage:
  - id: D1
    description: "A phase's REVIEW and REVIEW-FIX files read as one ledger through a Review / Fix tab strip, each tab at its own URL, drawn only once a second file exists; a lone REVIEW is unchanged"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/presentation/review-ledger.test.ts#lists the same three members from each file"
        status: pass
      - kind: unit
        ref: "test/web/review-ledger.test.ts#returns null for a one-member context"
        status: pass
      - kind: e2e
        ref: "test/e2e/review-page.spec.ts (6 tests, run once on the repo's own project)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The shared head shows the findings total, a row per severity with fixed counts and a square bar, and '{n} fixed in the fix report' (open counts wait for the disposition)"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/web/review-ledger.test.ts#composeLedgerHead totals the findings"
        status: pass
    human_judgment: true
    rationale: "Visual fit of the head (spacing, bar density) is a design judgement; a screenshot of the repo's own review and fix pages was inspected, no sketch exists for the head"
  - id: D3
    description: "The Fix tab has one anchored section per fix file with counts, fixed-at date, Fixed/Skipped/Deferred groups, a 'Not in the review' group, the empty note and a clamped long suffix"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/web/review-ledger.test.ts#composeReviewLedger - Lendshed phase 3"
        status: pass
    human_judgment: false
  - id: D4
    description: "The review's per-finding fix outcomes join every fix file of the phase"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/presentation/review-context.test.ts#merges every shard fix report of Lendshed phase 3"
        status: pass
    human_judgment: false
  - id: D5
    description: "For every review-family file in every fixture project, the ledger built from any one member lists the same members"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/presentation/review-ledger.test.ts#the assumption-delta invariant (every ALL_FIXTURE_ROOTS root)"
        status: pass
    human_judgment: false
duration: 55min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 12: Review and fix as one ledger Summary

**A phase's REVIEW and shard REVIEW-FIX files now read as one ledger: a Review / Fix tab strip and a findings-by-severity head (only once a second file exists), a Fix tab with one anchored section per fix file, and a review whose per-finding outcomes join every fix file.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2
- **Files modified:** 16 (6 created, 10 modified)

## Accomplishments

- `buildLedgerContext` / `ledgerFixMembers` find a folder's review-family files by directory and kind (plain fix first, then by suffix, at most 12), build the tabs (Review count = findings, Fix count = distinct fix-entry ids), the head (review findings, else frontmatter `findings.total`, else fix-entry ids) and each fix file's frontmatter and report. The invariant holds in every fixture root: opening any member yields the same member set.
- The strip (`nav` "Review files", `data-ledger="true"`, the plan-pair look, pressed tab `aria-current="page"`, mono trailing count) and `LedgerHead` come first in the page through the existing switcher slot. A lone REVIEW draws nothing (`ledgerSwitcher` returns null for fewer than two members) and its page is unchanged.
- The Fix tab: sections `fix-<suffix>` titled by the title-cased suffix (clamped to 24 characters, full value in `title`) with the file name in mono, a lead of counts and fixed-at date, groups Fixed / Skipped / Deferred, a final quiet "Not in the review" group (Lendshed IN-09), the empty note "No fixes listed for this file." and arrival scroll to a suffixed file's own section.
- `buildReviewContext` takes its fix siblings from `ledgerFixMembers` and merges several files' entries, deferred bullets and sections into one report; the `-REVIEW.md` to `-REVIEW-FIX.md` name swap and both suffix constants are removed. Lendshed phase 3's review now reads "3 of 7 fixed" instead of "None fixed yet".

## Task Commits

1. **Task 1: Lendshed phase 3's review shows the Review / Fix strip and the shared head (tracer)** - `7fbd61b` (feat)
2. **Task 2: The Fix tab, 'Not in the review', and the merged review context** - `224b341` (feat)

**Plan metadata:** committed with this SUMMARY (docs).

## Tracer gate

Task 1's `<verify>` set (ledger tests, review threads, view-page contract, class vocabulary, raw-html guard, review-context and review-view contract) and typecheck were re-run end to end before expansion; both passed, so Task 2 proceeded.

## Files Created/Modified

- `src/presentation/review-ledger.ts` - the ledger's server join (members, tabs, head, fix files, `severityById`)
- `src/presentation/review-context.ts` - fix siblings from the ledger, merged multi-file report, name swap removed
- `src/server/project-api.ts` - `ledgerContext` on the document response
- `src/web/components/ledger-switch.tsx` - `LedgerSwitch`
- `src/web/views/review-ledger.ts`, `review-ledger-components.tsx` - head and Fix-tab composers and views, `ledgerSwitcher`, `fixHeaderProps`
- `src/web/views/manifest.ts`, `manifests.ts`, `src/web/pages/artifact-page.tsx` - `ViewInput.ledgerContext`, `ViewManifest.reviewLedger`, the `review-fix` opt-in, the switcher chain and the Fix-tab body/header override
- `src/web/styles/globals.css` - one `phase-09-review-ledger` block; `docs/design-language.md` - tone uses and the "one ledger" bullet
- Tests: `test/presentation/review-ledger.test.ts`, `test/web/review-ledger.test.ts`, additions to `review-context.test.ts`

## Decisions Made

- The shared head classes are `view-review-ledger-*` rather than the plan's `view-review-head`, which is the review page's own existing head class (reusing it would have restyled that page).
- `LedgerContext` carries `severityById` (token severity for every id a review or fix names) so the web composer needs no runtime import of the handler.
- A fix-only folder with two or more files shows the strip (Fix tab only) and a head counting the fix entries' distinct ids; a single fix file is one member, so no strip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing contract tests pinned the old shapes**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** `test/web/review-view-contract.test.ts` required every `.view-review-` rule to sit in the k44 CSS block and pinned `manualChecks, reviewContext, };` at the end of the document response; `test/token-guard.test.ts` rejected a literal `gap: 2px`; `test/web/review-threads-corpus.test.ts` pinned Lendshed 03's verdict as "7 findings. None fixed yet." (the very bug this plan fixes).
- **Fix:** the contract test now also guards the `phase-09-review-ledger` block (violations, single occurrence, the only other home of `.view-review-` rules); `ledgerContext` sits before `projectContext` in the response so the pinned tail is unchanged; the bar gap uses `var(--space-0-5)`; the corpus pin reads "3 of 7 fixed. 4 still in the code." with a comment.
- **Files modified:** `test/web/review-view-contract.test.ts`, `src/server/project-api.ts`, `src/web/styles/globals.css`, `test/web/review-threads-corpus.test.ts`
- **Commits:** `7fbd61b`, `224b341`

**2. [Rule 1 - Naming clash] `view-review-head` already exists**
- **Fix:** head classes renamed `view-review-ledger-head` / `-total` / `-number` / `-word` / `-severities` / `-note` (within the plan's `view-review-ledger-*` family).

**3. [Environment] Worktree has no node_modules**
- `npm run test:gate`, `npm run typecheck`, `eslint` and `vite build` were run through the main checkout's binaries from the worktree root (vitest, tsc, eslint, vite, playwright); the gate was applied by reading the vitest totals (full run: 235 files, 5217 tests, 0 failed, 0 skipped). `systemctl --user restart labelore` was not run (it serves the main checkout); the orchestrator restarts after merge. `vite build` succeeded.
- `test/e2e/review-page.spec.ts` ran once through a throwaway Playwright config pointing at `/usr/bin/google-chrome` (6 passed); the config and a temporary screenshot spec were deleted before committing.

**4. [Sequencing] The Fix-tab composer and view landed in the Task 1 commit**
- They are pure additions in files Task 1 owns; the `review-fix` manifest opt-in and the merged review context, which make them live, are in Task 2's commit.

**Total deviations:** 4 (2 auto-fixed tests/contract, 1 naming, 1 environment). **Impact:** none on behaviour beyond what the plan intended.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

None. `open` on the head and on each severity row is `null` by design until 09-13 supplies a disposition.

## Threat Flags

None. Membership is same-directory and kind-derived (T-09-23), fix files are capped at 12 (T-09-24), and all text renders as React text through `ResearchInline` with file paths as chips and the only links being resolved member routes (T-09-25).

## Next Phase Readiness

Ready for 09-13: `ledgerContext` is already built for `review-disposition` files (null until the Disposition member is added to `buildLedgerContext`, which needs no server change), `LedgerHead` already renders the open-of-total form when `open` is non-null, and `LedgerMember.tab` / `LedgerTab` need widening with `'disposition'`. Restart `labelore` after the wave merges.

## Self-Check: PASSED

- Created files exist (ledger, switch, composers, components, two tests); commits `7fbd61b` and `224b341` are ancestors of HEAD.
- Acceptance criteria re-run: `buildLedgerContext(` in project-api 1, `ledgerSwitcher(` in artifact-page 1, no `FIX_SUFFIX` in review-context (exit 1), `ledgerFixMembers(` in review-context 1, "Not in the review" present, `reviewLedger: composeReviewLedger` in manifests 1.
- Full unit run 5217 passed, 0 skipped; typecheck (server and web), eslint `.`, `vite build` exit 0; review-page e2e 6 passed.

---
*Phase: 09-review-audit-and-root-document-pages*
*Completed: 2026-11-03*
