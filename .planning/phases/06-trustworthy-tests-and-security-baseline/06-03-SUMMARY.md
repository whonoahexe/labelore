---
phase: 06-trustworthy-tests-and-security-baseline
plan: 03
subsystem: testing
tags: [outline, security, xss, source-scan, vitest, react]

requires:
  - phase: 06-trustworthy-tests-and-security-baseline
    provides: "plan 06-01 zero-skip test gate; plan 06-02 growth harness"
provides:
  - "src/web/views/manifest.ts: OUTLINE_ENTRY_CAP (18) and capOutline, returning the listed entries and the omitted count"
  - "src/web/components/document-outline.tsx: exported OutlineList, omitted prop, plain li[data-overflow] row reading +N more section(s)"
  - "test/helpers/source-scan.ts: blankComments and walkSource, shared by the class-vocabulary and raw-HTML scans"
  - "test/web/raw-html-guard.test.ts: standing scan of src/web for eight raw-HTML sink shapes, one-entry exact allowlist, planted positive controls"
affects: [06-04, 06-05, security-scans, outline]

actuals:
  tokens: 5000
  tasks: 2
  commits: 3
plan_head_before: 8c482421e6a03a422d5d8a5343b081d210e69981
plan_head_after: 94b1f4948aabb13f8ccba4e7a8eb0d693b0e9049

tech-stack:
  added: []
  patterns:
    - "Cap what is listed, never what exists: outlineEntriesOf stays pure and uncapped, capOutline shortens only the outline listing"
    - "A standing sink scan blanks comments first, counts per file and sink, and asserts equality with an exact allowlist so a stale entry fails too"
    - "Planted mkdtemp files are the positive control for every text scan; they are never written under src/"

key-files:
  created:
    - test/helpers/source-scan.ts
    - test/web/outline-cap.test.ts
    - test/web/raw-html-guard.test.ts
  modified:
    - src/web/views/manifest.ts
    - src/web/pages/artifact-page.tsx
    - src/web/components/document-outline.tsx
    - src/web/styles/globals.css
    - test/web/outline-contract.test.ts
    - test/web/class-vocabulary.test.ts

key-decisions:
  - "The +N more row reuses the existing .document-outline selector via li[data-overflow='true'], so no new class name and no design-language.md entry"
  - "The raw-HTML scan matches assignments only (innerHTML and outerHTML followed by = not followed by = or >), so the document-sections.ts reads of outerHTML and innerHTML are not findings"
  - "walkSource takes repo-relative roots only; the planted controls call the scanner on a file read from tmpdir instead of walking it"
  - "class-vocabulary.test.ts keeps its own walkTsxFiles; only blankComments moved, as the plan scoped"

patterns-established:
  - "Allowlist-equality guard: findings must equal ALLOWED exactly, and ALLOWED.length is itself asserted"

requirements-completed: [SEC-03, SEC-02]

coverage:
  - id: D1
    description: "A document with 3,000 headings keeps every View block while its View outline lists 18 entries and a plain +2982 more sections row"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "test/web/outline-cap.test.ts"
        status: pass
      - kind: e2e
        ref: "Playwright against the production build, Labelore's own .planning/research/GSD-DOMAIN.md (25 view sections): 18 entries then +7 more sections"
        status: pass
    human_judgment: false
  - id: D2
    description: "The +N more row is a non-interactive li in both the wide outline column and the narrow On this page popover, and Source mode shows no such row"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "test/web/outline-cap.test.ts; test/web/outline-contract.test.ts"
        status: pass
      - kind: e2e
        ref: "Playwright at 390px and desktop width, orchestrator-run tracer verification"
        status: pass
    human_judgment: false
  - id: D3
    description: "Raw-HTML injection anywhere under src/web other than the single artifact-page.tsx dangerouslySetInnerHTML site fails a standing test, and a stale allowlist entry fails it too"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "test/web/raw-html-guard.test.ts#finds raw-HTML sinks only at the allowlisted site"
        status: pass
      - kind: unit
        ref: "test/web/raw-html-guard.test.ts#reports all eight sinks in a planted file"
        status: pass
    human_judgment: false
  - id: D4
    description: "The comment-blanking helper is shared, with class-vocabulary.test.ts importing it instead of keeping a local copy"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "test/web/class-vocabulary.test.ts"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-25
status: complete
---

# Phase 6 Plan 03: Capped View outline and standing raw-HTML guard Summary

**View mode now lists at most 18 outline entries plus a plain, non-clickable "+N more sections" row with every section still rendered, and a standing test fails if any file under src/web injects raw HTML outside the one sanctioned site.**

## Performance

- **Duration:** about 25 min for the continuation (Task 2 plus close-out); Task 1 ran in the previous executor
- **Completed:** 2026-10-25
- **Tasks:** 2
- **Files modified:** 9 (src and test)

## Accomplishments

- `capOutline` and `OUTLINE_ENTRY_CAP` (18) in `src/web/views/manifest.ts`; Source mode now shares the constant instead of a literal 18 and still shows no overflow row.
- `OutlineList` renders one `li[data-overflow="true"]` after the entries, with no anchor, class name or icon, in both the wide column and the popover. Singular "section" when N is 1.
- A 3,000-heading document composes to 3,000 View blocks, so capping hides nothing from the page (closes T-05-11 and the hidden-content repudiation risk).
- `test/web/raw-html-guard.test.ts` scans `src/web` (.ts and .tsx, comments blanked) for eight sink shapes and asserts the findings equal a one-entry allowlist exactly. Planted mkdtemp files prove all eight are reported, that comment-only mentions and reads or comparisons are not, and that a repeat of one sink counts twice.
- `blankComments` and `walkSource` extracted to `test/helpers/source-scan.ts` for the class-vocabulary and raw-HTML scans (and the leak and no-skips scans that follow).

## Tracer verification evidence (Task 1)

The tracer feedback gate was approved by the user, who asked the orchestrator to verify in the browser. The orchestrator ran Playwright against the production build, reading Labelore's own `.planning/research/GSD-DOMAIN.md` (25 View sections). All five checks passed:

1. The View outline lists 18 entries, then a muted "+7 more sections" row (25 - 18 = 7).
2. The row is an `li` with no link, button or svg; cursor is auto and its colour does not change on hover.
3. All 25 sections render in the canvas, and the last omitted section is visible when scrolled to.
4. Source mode shows no overflow row.
5. At 390px width the "On this page" popover shows the same "+7 more sections" row.

## Task Commits

1. **Task 1: capped View outline with +N more row (tracer)** - `1166b0f` (feat)
2. **Task 2: standing raw-HTML guard (TDD)**
   - RED: `8a3cd80` (test) — guard test added while `test/helpers/source-scan.ts` was absent; fails at import
   - GREEN: `94b1f49` (feat) — shared helper created, `class-vocabulary.test.ts` switched to it

**Plan metadata:** recorded in the docs(06-03) commit that follows this file.

## Files Created/Modified

- `src/web/views/manifest.ts` - OUTLINE_ENTRY_CAP and capOutline
- `src/web/pages/artifact-page.tsx` - ViewReader caps the outline; Source mode uses the shared constant
- `src/web/components/document-outline.tsx` - exported OutlineList, omitted prop, overflow row
- `src/web/styles/globals.css` - muted overflow row rule beside the outline link rules
- `test/web/outline-cap.test.ts` - cap, boundary (17, 18, 19), singular and plural, 3,000-heading block count
- `test/web/outline-contract.test.ts` - text pins for data-overflow, capOutline( and OUTLINE_ENTRY_CAP
- `test/helpers/source-scan.ts` - blankComments, walkSource
- `test/web/raw-html-guard.test.ts` - SINKS table, ALLOWED, planted controls
- `test/web/class-vocabulary.test.ts` - imports blankComments from the helper

## Decisions Made

See key-decisions above. In short: no new CSS class, assignment-only matching for innerHTML and outerHTML, repo-relative roots for `walkSource`, and a minimal change to the class-vocabulary test.

## Deviations from Plan

None - plan executed exactly as written.

The RED step of Task 2 was committed as its own `test(06-03)` commit, which is why the plan carries three commits for two tasks.

## Issues Encountered

- `npx prettier --check` reports `test/web/class-vocabulary.test.ts` as unformatted. That file was already unformatted at the starting commit (verified on a copy of HEAD), so it is left as is; the new files are formatted.
- The full unit run shows 26 failures: the 25 listed in `deferred-items.md` (project-research, drawer, pattern-map and summary-run corpus tests) plus `test/rendering/ascii-graph.test.ts`, also listed there as a timing-budget test. None touch this plan's files.
- `blankComments` blanks everything after `//` on a line, so a sink placed on the same line after a string containing `//` (such as a URL) would be missed. This is the moved helper's existing behaviour, kept verbatim as the plan required.

## Threat Flags

None - no new network endpoints, auth paths or file access were introduced.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `walkSource` and `blankComments` are ready for the leak and no-skips scans in later plans.
- The SEC-02 flagged assumption stays open: the eight listed sinks are taken as the complete set of raw-HTML shapes (bracket-notation assignment and `parseHTMLUnsafe` are not covered).

## Self-Check: PASSED

- FOUND: test/helpers/source-scan.ts, test/web/raw-html-guard.test.ts, test/web/outline-cap.test.ts
- FOUND commits: 1166b0f, 8a3cd80, 94b1f49 (all ancestors of HEAD)
- Plan verification: outline-cap, outline-contract, raw-html-guard, class-vocabulary and css-source-order tests pass (37 tests, none skipped); typecheck and lint exit 0

---
*Phase: 06-trustworthy-tests-and-security-baseline*
*Completed: 2026-10-25*
