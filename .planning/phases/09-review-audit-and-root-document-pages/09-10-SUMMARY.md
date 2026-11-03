---
phase: 09-review-audit-and-root-document-pages
plan: 10
subsystem: ui
tags: [windows-ledger, handler, fence-scan, view-registry, vitest]

requires:
  - phase: 09-review-audit-and-root-document-pages
    provides: "project page and the shared status-square (09-07 to 09-09); root document redirects (09-01)"
provides:
  - "Length-aware fence scan in the WINDOWS handler and structured.windows { rows, source, stated, disagreement }"
  - "'windows' view kind, manifest and ViewManifest.windowsLedger"
  - "composeWindowsLedger (intro, lead, counts-disagree notice) and WindowsLedgerView / windowsHeaderProps"
  - "Lendshed made-up WINDOWS.md with open, waived (with and without reason) and fixed rows across phases"
affects: [09-11 windows lists and fixed history, 09-16 corpus guards]

actuals:
  tokens: 40000
  tasks: 2
  commits: 2
plan_head_before: f5e856859308123eab5b20498b06f6acbe9e513f
plan_head_after: db12c1ebd41955866065405c9abe6213529fc2ba
commits: 2

tech-stack:
  added: []
  patterns:
    - "Header override as one prop spread (validationHeader ?? windowsHeaderProps), no shared eyebrow/title chain grown"
    - "Normalised reading built in its own try/catch so the raw rows and rowSource keep their meaning"

key-files:
  created:
    - src/web/views/windows-ledger.ts
    - src/web/views/windows-ledger-components.tsx
    - test/windows-handler.test.ts
    - test/web/windows-ledger.test.ts
    - test/fixtures/lendshed/.planning/WINDOWS.md
  modified:
    - src/planning-repo/handlers/windows.ts
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - test/__golden__/dense.json
    - test/web/view-registry.test.ts
    - test/web/fallback.test.ts

key-decisions:
  - "The lead counts the listed rows; a stated open count that differs is carried as { stated, listed } and said in a plain notice, never merged"
  - "A ledger with no rows but frontmatter counts leads from the stated counts (open derived from total - waived - fixed when only open_count is missing); with no way to know the open count the composer returns null and the generic document view stays"
  - "Disagreement is only recorded when rows exist; a frontmatter-only ledger has nothing to disagree with"
  - "Last-fix date in the lead is the day only (formatStamp of the leading YYYY-MM-DD), matching the UI-SPEC {date} and the validation page precedent"

patterns-established:
  - "Fence scan by line: an opening run of N backticks closes only at a line made only of at least N backticks"

requirements-completed: [VIEW-07]

duration: 35min
completed: 2026-11-03
status: complete
---

# Phase 9 Plan 10: Windows ledger lead Summary

**/windows opens on the broken-windows ledger: it always leads with the open count read from the file's own rows (four-backtick fences included), and states both numbers plainly when the file's frontmatter counts disagree with its rows.**

## Performance

- **Duration:** about 35 min
- **Tasks:** 2
- **Files modified:** 14 (5 created, 9 modified)

## Accomplishments

- The handler's regex fence match is replaced by a linear line scan, so a description holding triple backticks inside a four-backtick fence survives; `structured.rows` and `rowSource` keep their meaning.
- `structured.windows` normalises rows (2000-row and 4000-character caps, blank and "-" as null, numeric phases as digits), records the source (json, table, frontmatter, none) and the stated counts, and is built in its own try/catch.
- The lead band comes first and keeps its place whether or not anything is open: the count in the lead number style, the word "open", a tone chip (`complete` at zero, `in-flight` otherwise) and the muted line. This repo's own WINDOWS.md (nine fixed, none open) leads with "0 open" in the complete tone.
- A disagreement between stated and listed open counts shows a plain notice above the lead with both numbers; the lead counts the rows.
- A made-up Lendshed ledger (2 open, 2 waived with and without reason, 2 fixed; phases 01, 03 and quick/260402-t8m; an unknown kind) exercises it, and the dense golden gains only the `windows` key.

## Task Commits

1. **Task 1: /windows leads with the open count from the file's rows** - `79a7452` (feat)
2. **Task 2: The counts-disagree notice, the table and frontmatter fallbacks, and hostile ledgers** - `db12c1e` (feat)

## Files Created/Modified

- `src/planning-repo/handlers/windows.ts` - fence scan, normalised rows, stated counts, disagreement
- `src/web/views/windows-ledger.ts` - composeWindowsLedger (intro, lead, notice)
- `src/web/views/windows-ledger-components.tsx` - WindowsLedgerView, windowsHeaderProps
- `src/web/views/kinds.ts`, `manifest.ts`, `manifests.ts` - the windows kind, `windowsLedger` field and manifest (registry now 24)
- `src/web/pages/artifact-page.tsx` - windowsLedger memo, headerOverride spread, disclosure hidden in View mode, body chain
- `src/web/styles/globals.css` - `view-windows-*` rules and the page-scoped four-size cap
- `test/fixtures/lendshed/.planning/WINDOWS.md`, `test/__golden__/dense.json`, `test/windows-handler.test.ts`, `test/web/windows-ledger.test.ts`, `test/web/view-registry.test.ts`, `test/web/fallback.test.ts`

## Decisions Made

See key-decisions above. The Open, Waived and Fixed-history lists are typed `null` on the composed model; 09-11 fills them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] test/web/fallback.test.ts used 'windows' as its unregistered kind**
- **Found during:** Task 1 (full suite run)
- **Issue:** "falls back to the unrecognized manifest for an unregistered kind" resolved `'windows'`, which is now registered, so the assertion failed.
- **Fix:** The test resolves `'not-a-real-kind'` instead (the same sample view-registry.test.ts uses). The `unrecognizedNotice('windows')` string cases are pure functions of the string and were left alone.
- **Files modified:** test/web/fallback.test.ts
- **Verification:** Full suite green (232 files, 5133 tests)
- **Committed in:** 79a7452

**2. [Plan wording] `windowsHeaderProps` returns eyebrow, title and lead only**
- The plan says "crumbs kept", so `hideCrumbs` is not set; the manifest lead is dropped by `lead: null`.

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** None on scope; the fallback test only needed a kind that is still unregistered.

## Issues Encountered

- The worktree has no node_modules; tools ran from the main checkout's binaries (Node resolves the parent `node_modules`). `npm run test:gate` was replaced by `vitest run` of the same files and then of the whole suite (no skipped or todo tests reported).
- `systemctl --user restart labelore` was skipped per the parallel-execution note (it serves the main checkout); the orchestrator restarts after merge. `vite build` ran in the worktree and succeeded.
- A headless Chrome screenshot of `/lendshed/windows` (Lendshed on a scratch port) showed the eyebrow, h1, source-note line and the lead band ("2 open", in-flight chip, "2 fixed, last on 18 Jun 2026 · 2 waived · 6 in total"). The UI-SPEC says the windows ledger gets a screenshot review with the user after the build.

## Known Stubs

- `ComposedWindowsLedger.open`, `.waived` and `.fixed` are `null` by design: the Open and Waived lists and the Fixed history are 09-11's scope (named in the plan objective). Not a defect against this plan's goal (the lead).

## Threat Flags

None. The plan's threat model (T-09-20 linear fence scan with row and character caps and growth tests; T-09-21 disagreement shown with both numbers, never merged) is implemented and tested.

## Next Phase Readiness

09-11 can add the Open, Waived and Fixed-history lists, the zero-open Shapes fixture and the design-language rows on top of `composeWindowsLedger` and the `view-windows-*` CSS block (`phase-09-windows-ledger` markers).

## Self-Check: PASSED

- Files: windows.ts, windows-ledger.ts, windows-ledger-components.tsx, the four test files and the Lendshed fixture exist.
- Commits `79a7452` and `db12c1e` are ancestors of HEAD.
- Acceptance greps: `'windows',` in kinds.ts (1), `windowsHeaderProps(` in artifact-page.tsx (1), no `/```json` in windows.ts, `disagreement` in windows.ts (4), "counts disagree with its rows" in windows-ledger.ts (1), "windows fence and table growth" in the handler test (1).
- `tsc` (server and web), `eslint .`, `vite build` and the full `vitest run` all pass.

---
*Phase: 09-review-audit-and-root-document-pages*
*Completed: 2026-11-03*
