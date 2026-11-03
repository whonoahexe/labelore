---
phase: 09-review-audit-and-root-document-pages
plan: 11
subsystem: ui
tags: [windows-ledger, composer, history-disclosure, fixtures, view-contract, vitest]

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "09-10: structured.windows, composeWindowsLedger (intro, lead, notice), WindowsLedgerView and the view-windows CSS block"
provides:
  - "ComposedWindowsLedger.open, .waived (grouped lists with empty-note text) and .fixed (grouped history or null)"
  - "Open and Waived sections with rows, the waiver reason note and the folded Fixed history"
  - "Made-up Shapes WINDOWS.md (zero open, two fixed)"
  - "test/web/windows-view-contract.test.ts and the design-language windows rows"
affects: [09-16 corpus guards and screenshot review]

actuals:
  tokens: 40000
  tasks: 2
  commits: 2
plan_head_before: d456493206970751ae9885edfc3f7bf12c47be7e
plan_head_after: 08e8c4584a1961e54d73e7ea512504c59355eff6
commits: 2

tech-stack:
  added: []
  patterns:
    - "Groups keyed by the verbatim phase string in first-appearance order, one grouping function for open, waived and fixed"
    - "The Fixed history reuses the history-* family and restyles it only through view-windows-* names (the history-selector line count is guarded elsewhere)"

key-files:
  created:
    - test/fixtures/shapes/.planning/WINDOWS.md
    - test/web/windows-view-contract.test.ts
  modified:
    - src/web/views/windows-ledger.ts
    - src/web/views/windows-ledger-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/windows-ledger.test.ts

key-decisions:
  - "A row whose status is neither open, waived nor fixed is listed with the open rows, tone quiet, its raw status as the chip text ('No status' when blank); the lead still counts only status open"
  - "A file with stated counts and no rows says 'The file states this count but lists no rows.' in an empty group whose stated count is above zero, rather than 'Nothing open.' beside a lead that says otherwise"
  - "A description longer than 160 characters, or holding a line break, gets the 3-line clamp and its Read more"
  - "Fixed rows show both 'Recorded {date}' and 'Fixed {date}' when both exist"

patterns-established:
  - "Page-scoped rule for inline code inside document text (Label size), keeping the page at four font sizes"

requirements-completed: [VIEW-07]

duration: 25min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 11: Windows ledger lists and fixed history Summary

**/windows now lists open and waived windows by verbatim phase string, each waiver with its "Waived because" reason (or a dashed "No reason recorded"), and folds the fixed history into one collapsed details per phase, with the same shape whether nothing or several are open.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- The composer fills `open`, `waived` and `fixed`: groups `{ phase, rows }` in first-appearance order, `No phase` for a blank phase, `03-04` and `quick/260727-3mo` as separate groups, unknown kinds verbatim, unknown statuses listed with the open rows under their raw status.
- Rows draw an aria-hidden status-square, the mono `#id`, a quiet kind chip, the description through `ResearchInline` clamped to 3 lines with an in-place Read more / Read less (`aria-expanded`), and the mono `file:line` (end-ellipsis, full value in `title`, never a link) beside the recorded date.
- A waived row adds a left-ruled note labelled "Waived because", or the dashed quiet "No reason recorded" line.
- Empty groups read "Nothing open." / "Nothing waived." as one `empty-note` line; the Fixed history is one collapsed `details` per phase in the `history-*` family ("{phase} · {n} fixed") and is omitted when there are none.
- Made-up Shapes WINDOWS.md (zero open, two fixed): lead "Nothing open. 2 fixed, last on 22 Oct 2026.", complete tone. This repo's own WINDOWS.md composes its nine fixed rows into the history.
- `windows-view-contract.test.ts` pins: no raw-HTML prop, no link or href, only complete / in-flight / quiet tones, never destructive or warning, no regex or fs import in the composer, one contiguous CSS block with no forbidden construct and no `.history-` selector.
- design-language: windows uses added to the complete, in-flight and quiet tone rows, plus the "The WINDOWS page always leads with the open count" bullet.

## Task Commits

1. **Task 1: Open and waived windows by phase, each waiver with its reason** - `4f6c3a1` (feat)
2. **Task 2: The folded fixed history, the zero-open ledger and the windows view contract** - `08e8c45` (feat)

## Decisions Made

See key-decisions above. The composer's fixed grouping landed in Task 1's commit alongside open and waived, because all three share one grouping function; Task 2 added the history markup, tests, fixture, docs and contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first Fixed-history CSS used `.history-*` selectors**
- **Found during:** Task 2 (full suite)
- **Issue:** `.view-windows-history .history-list` and `.history-milestone > summary` rules raised the history selector-line count, failing two traceability contract tests (22 expected, 25 found).
- **Fix:** Gave the elements own names (`view-windows-history-list`, `view-windows-summary`) and restyled through those; added a contract assertion that the block has no `.history-` selector.
- **Files modified:** src/web/styles/globals.css, src/web/views/windows-ledger-components.tsx
- **Committed in:** 08e8c45

**2. [Plan wording] Lendshed's Open groups are '01' and 'quick/260402-t8m', Waived is '03'**
- The plan's behavior block says Open groups '01' and '03'; the fixture's open rows are phase 01 and quick/260402-t8m, and phase 03 holds the two waived rows. Tests follow the fixture.

**3. [Rule 2 - Missing critical] Frontmatter-only ledger empty line**
- A file with stated counts and no rows would have shown "Nothing open." under a lead saying "2 open". It now says "The file states this count but lists no rows." for a group with a stated count above zero.

---

**Total deviations:** 1 auto-fixed bug, 1 missing-critical addition, 1 plan-wording note
**Impact on plan:** None on scope.

## Issues Encountered

- The worktree has no node_modules; tools ran from the main checkout's binaries. `npm run test:gate` was replaced by `vitest run` of the same files and then of the whole suite (233 files, 5171 tests, none skipped or todo); typecheck (both configs), `eslint .` and `vite build` pass.
- `systemctl --user restart labelore` was skipped per the parallel-execution note; the orchestrator restarts after merge.
- Headless Chrome screenshots of Lendshed (1280 and 390) and Shapes (1280) on scratch ports showed the lead, Open and Waived groups, the reason note, the dashed no-reason line and the folded history; no horizontal scroll at 390. The user's screenshot review is collected in 09-16.

## Known Stubs

None.

## Threat Flags

None. T-09-22 is implemented and tested: descriptions, reasons and paths render as React text (a hostile description and path are escaped in a test), the contract forbids the raw-HTML prop and any link.

## Next Phase Readiness

The windows page is complete. The waived path is proven on the made-up Lendshed fixture only (no real ledger on this machine has a waived row).

## Self-Check: PASSED

- Files exist: Shapes WINDOWS.md, windows-view-contract.test.ts, windows-ledger.ts, windows-ledger-components.tsx.
- Commits `4f6c3a1` and `08e8c45` are ancestors of HEAD.
- Acceptance greps: "Waived because" in the components (1), "No reason recorded" (1 in the components), "Nothing waived." (1 in the composer), "The WINDOWS page always leads with the open count" in design-language (1).
- Full unit suite, `tsc` (both), `eslint .` and `vite build` pass.

---
*Phase: 09-review-audit-and-root-document-pages*
*Completed: 2026-11-03*
