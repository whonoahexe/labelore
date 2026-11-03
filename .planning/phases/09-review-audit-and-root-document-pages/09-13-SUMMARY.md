---
phase: 09-review-audit-and-root-document-pages
plan: 13
subsystem: presentation
tags: [review-ledger, review-disposition, stale-mark, disposition-first-head, design-language]
requires:
  - phase: 09-05
    provides: the review-disposition kind, its row model (DispositionRow) and the plain manifest
  - phase: 09-12
    provides: buildLedgerContext, LedgerSwitch, LedgerHead, the Fix tab and the view-review-ledger CSS block
provides:
  - the disposition as a ledger member and tab (Review, Disposition, Fix), each only when its file exists
  - DispositionTabView, composeReviewLedger's disposition variant and ledgerHeaderProps
  - disposition-first head totals (open of total from the rows) and the marked-fixed note
  - the quiet "Fixed in {commit}, disposition not updated" chip on review threads, Disposition Open rows and Fix rows
  - review-ledger-view-contract.test.ts over all three tab bodies
affects: []
actuals:
  tokens: 34000
  tasks: 2
  commits: 2
plan_head_before: 01a1285497f17c92e67cb45eead15d07dc175d1b
plan_head_after: 0c5236af3709c123647a1d9f32291325c6fa2274
tech-stack:
  added: []
  patterns:
    - "A discriminated tab model (tab: 'fix' | 'disposition') returned by one composer, rendered through one LedgerTabView, so the page has no per-kind branch"
    - "The stale mark is a presentation-side join (LedgerContext.marks) that every tab reads through one staleMarkOf helper; the mark never touches the counts"
key-files:
  created:
    - test/web/review-ledger-view-contract.test.ts
  modified:
    - src/presentation/review-ledger.ts
    - src/web/views/review-ledger.ts
    - src/web/views/review-ledger-components.tsx
    - src/web/views/review-threads.ts
    - src/web/views/review-threads-components.tsx
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/presentation/review-ledger.test.ts
    - test/web/review-ledger.test.ts
    - test/web/review-threads.test.ts
key-decisions:
  - "LedgerContext also carries fixedCommits (id to the first fixed entry's first commit) beside marks, so the Disposition composer takes a fixed row's commit from the same join the marks use"
  - "A deferral's or skip's reason, and a fixed row's source text, fall back to the text after the leading word of a two-column cell ('fixed (see 04-REVIEW-FIX.md)' gives '(see 04-REVIEW-FIX.md)') because that shape has no Note column"
  - "ComposedStaleMark carries tone 'quiet' so the review threads component writes no literal tone (the review view contract forbids one)"
  - "A lone disposition still shows the grouped Disposition tab (no strip, no head); a disposition with no rows falls back to the promoted table"
requirements-completed: [VIEW-09]
coverage:
  - id: D1
    description: "/phase-N/review-disposition opens the ledger on its Disposition tab; the strip reads Review, Disposition, Fix, each only when its file exists"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/presentation/review-ledger.test.ts#lists review, disposition and fix from %s, tabs in the order Review, Disposition, Fix"
        status: pass
      - kind: unit
        ref: "test/web/review-ledger.test.ts#the strip over a phase with a disposition reads Review, Disposition, Fix with the Disposition tab pressed"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Disposition tab groups Open, Deferred, Skipped, Fixed, Other (empty omitted) with full reasons clamped to 3 lines, the fix commit, else the file's own text, else 'Commit not recorded'"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/web/review-ledger.test.ts#composeReviewLedger - the Disposition tab"
        status: pass
    human_judgment: true
    rationale: "The spacing and the solid versus dashed quiet squares of the new groups were not screenshot-compared (no Chromium on this machine, and the service serves the main checkout); the structure and markup are pinned by tests"
  - id: D3
    description: "The head takes open and total from the disposition, per severity '{open} of {total} open'; this repo's phase 8 reads 31 of 32, never 31 of 5"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/presentation/review-ledger.test.ts#this repo's own phase 8: the head open and total equal the disposition rows, never the review five"
        status: pass
      - kind: unit
        ref: "test/web/review-ledger.test.ts#composeLedgerHead - the disposition decides what is open"
        status: pass
    human_judgment: false
  - id: D4
    description: "A finding open in the disposition but fixed in a fix file carries the quiet disagreement chip on the Review, Disposition and Fix tabs; the head counts it open and its note names the count"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/web/review-threads.test.ts#the stale-disposition mark"
        status: pass
      - kind: unit
        ref: "test/web/review-ledger.test.ts#the stale-disposition mark on the ledger tabs"
        status: pass
    human_judgment: false
  - id: D5
    description: "A lone REVIEW and a review with only fix files show no disagreement chip and an unchanged head"
    requirement: VIEW-09
    verification:
      - kind: unit
        ref: "test/web/review-ledger.test.ts#shows no mark and no chip anywhere without a disposition, or on a lone REVIEW (D-11)"
        status: pass
    human_judgment: false
duration: 70min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 13: The disposition joins the review ledger Summary

**The review ledger now reads GSD's disposition as the record of what is open: a Disposition tab groups every finding by what became of it (with reasons and commits), the shared head counts open-of-total from the disposition rows, and a finding the disposition leaves open while a fix file calls it fixed carries a quiet "Fixed in {commit}, disposition not updated" chip on all three tabs.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2
- **Files modified:** 13 (1 created, 12 modified)

## Accomplishments

- `buildLedgerContext` now answers for `review-disposition`: the disposition is a member (tab order Review, Disposition, Fix), `LedgerContext.disposition` carries the rows, `fixedCommits` the commit of every id a fix entry fixed, and `marks` the open-versus-fixed disagreements. A second disposition in one folder stays a lone page, as a second REVIEW does.
- The head takes `total` and `open` from the disposition rows when it has any (D-08, the user's resolution of research A1): Lendshed phase 1 reads 6 of 6 (not the review's 5), and this repo's own phase 8 reads 31 of 32. Per severity it shows "{open} of {total} open". A row with no severity counts in the total and in no severity row.
- The Disposition tab (`DispositionTabView`, via one `LedgerTabView` so `artifact-page.tsx` has no kind branch): groups Open (in-flight), Deferred (quiet, solid square), Skipped (quiet, dashed square), Fixed (complete), Other (value verbatim in a quiet chip); reasons clamped to 3 lines with an in-place Read more; a fixed row shows the fix file's mono commit, else the disposition's own text, else "Commit not recorded".
- The disagreement chip is a `quiet` chip on the review thread header and folded row, the Disposition Open rows and the Fix rows. The head still counts those findings open; its note reads "{n} open here are marked fixed in the fix report" (T-09-26: the two signals are never merged).
- `test/web/review-ledger-view-contract.test.ts` pins all three tab bodies and their composers: no raw HTML, link targets only from the strip's url feed, documented tones only, no regular expression or filesystem import in the composers, and the contiguous guarded CSS block.

## Task Commits

1. **Task 1: A disposition opens on the Disposition tab, grouped by disposition (tracer)** - `a6feed8` (feat)
2. **Task 2: Disposition-first totals' note and the stale-disposition mark on every tab** - `0c5236a` (feat)

**Plan metadata:** committed with this SUMMARY (docs).

## Tracer gate

Task 1's `<verify>` set (ledger tests, view registry, view-page contract, new view contract test) plus class vocabulary, review view contract, token guard and typecheck passed before Task 2 proceeded.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing contracts constrained the new markup and CSS**
- **Found during:** Task 2 full run
- **Issue:** `test/web/review-view-contract.test.ts` forbids a literal `data-tone` in `review-threads-components.tsx`, and `test/web/project-view-contract.test.ts` forbids any `.status-square` selector outside the project block, which my first Deferred-square rule (`.view-review-group[data-group='deferred'] .status-square`) used.
- **Fix:** `ComposedStaleMark` carries `tone: 'quiet'` so the component writes `data-tone={mark.tone}`; the group square takes its own class `view-review-group-square` with `data-dashed` and the rule `.view-review-group-square[data-dashed='false']`. Other joined Skipped as a dashed square (`dashed: true`).
- **Files modified:** `src/web/views/review-threads.ts`, `src/web/views/review-threads-components.tsx`, `src/web/views/review-ledger-components.tsx`, `src/web/views/review-ledger.ts`, `src/web/styles/globals.css`
- **Commit:** `0c5236a`

**2. [Rule 1 - Missing source for a field] Two-column dispositions have no Note column**
- **Found during:** Task 1
- **Issue:** the 09-05 reader leaves `note` null for the two-column shape, so archived phase 4's "fixed (see 04-REVIEW-FIX.md)" and "deferred: harmless until..." would show no source text or reason.
- **Fix:** the composer falls back to the text after the leading word of `dispositionRaw`, verbatim (no regex).
- **Commit:** `a6feed8`

**3. [Sequencing] The disposition-first head and the marks landed in Task 1's commit**
- The `review-ledger.ts` join was written once; its head precedence, `marks`, `fixedCommits` and `markedFixed` are therefore in `a6feed8`. Task 2's commit holds the head note's wording-adjacent composer, the chip, the review-thread mark, CSS, docs and their tests.

**4. [Environment] Worktree has no node_modules**
- Vitest (full run: 236 files, 5266 tests, 0 failed, 0 skipped), tsc (server and web), eslint `.` and `vite build` were run through the main checkout's binaries from the worktree root; the gate was applied by reading the vitest totals. `systemctl --user restart labelore` was not run (it serves the main checkout); the orchestrator restarts after merge. No e2e spec was run and no screenshot was taken.

**Total deviations:** 4 (1 contract adaptation, 1 missing-field fallback, 1 sequencing, 1 environment). **Impact:** none on the plan's behaviour.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

None.

## Threat Flags

None. All disposition, review and fix text renders as React text through `ResearchInline` (T-09-27); the views have no link built from text, and counts come only from disposition rows with the fix signal held apart as a mark and a note (T-09-26).

## Next Phase Readiness

The ledger is complete: Review, Disposition and Fix tabs, disposition-first head, marks. Restart `labelore` after the wave merges and give the Disposition tab and the chip a visual pass in both themes on a project whose dispositions are all open while a fix file marks them fixed (the UI-SPEC backstop row).

## Self-Check: PASSED

- Created and modified files exist (`test/web/review-ledger-view-contract.test.ts` and the twelve modified); commits `a6feed8` and `0c5236a` are ancestors of HEAD.
- Acceptance greps: `reviewLedger: composeReviewLedger` in manifests 2, `disposition not updated` in both component files, `staleMark` in review-threads.ts, `Commit not recorded` and `ledgerHeaderProps(` present.
- Full unit run 5266 passed, 0 skipped; typecheck (server and web), eslint `.` and `vite build` exit 0.

---
*Phase: 09-review-audit-and-root-document-pages*
*Completed: 2026-11-03*
