---
phase: 09-review-audit-and-root-document-pages
reviewed: 2026-11-03T16:10:00Z
depth: standard
files_reviewed: 110
files_reviewed_list:
  - docs/design-language.md
  - src/planning-repo/folders.ts
  - src/planning-repo/handlers/artifact-token.ts
  - src/planning-repo/handlers/coverage-body.ts
  - src/planning-repo/handlers/coverage.ts
  - src/planning-repo/handlers/index.ts
  - src/planning-repo/handlers/milestone-audit-body.ts
  - src/planning-repo/handlers/milestone-audit.ts
  - src/planning-repo/handlers/project.ts
  - src/planning-repo/handlers/review-disposition.ts
  - src/planning-repo/handlers/review-report.ts
  - src/planning-repo/handlers/review.ts
  - src/planning-repo/handlers/windows.ts
  - src/planning-repo/naming.ts
  - src/presentation/dashboard-head.ts
  - src/presentation/project-context.ts
  - src/presentation/review-context.ts
  - src/presentation/review-ledger.ts
  - src/presentation/roadmap.ts
  - src/presentation/root-redirects.ts
  - src/presentation/routes.ts
  - src/presentation/search.ts
  - src/presentation/state-session.ts
  - src/presentation/traceability.ts
  - src/server/project-api.ts
  - src/web/app-router.tsx
  - src/web/components/ledger-switch.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/traceability-filter.ts
  - src/web/pages/traceability-page.tsx
  - src/web/route-dispatch.ts
  - src/web/styles/globals.css
  - src/web/views/coverage-matrix-components.tsx
  - src/web/views/coverage-matrix.ts
  - src/web/views/kinds.ts
  - src/web/views/manifests.ts
  - src/web/views/manifest.ts
  - src/web/views/milestone-audit-components.tsx
  - src/web/views/milestone-audit.ts
  - src/web/views/project-page-components.tsx
  - src/web/views/project-page.ts
  - src/web/views/review-ledger-components.tsx
  - src/web/views/review-ledger.ts
  - src/web/views/review-threads-components.tsx
  - src/web/views/review-threads.ts
  - src/web/views/windows-ledger-components.tsx
  - src/web/views/windows-ledger.ts
  - test/coverage-handler.test.ts
  - test/e2e/deep-reload.spec.ts
  - test/e2e/phase-09-screenshots.spec.ts
  - test/e2e/project-page-screenshots.spec.ts
  - test/e2e/root-documents.spec.ts
  - test/e2e/sketch-file.ts
  - test/fixtures/lendshed/.planning/milestones/v1.0-MILESTONE-AUDIT.md
  - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-DISPOSITION.md
  - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-REVIEW-DISPOSITION.md
  - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-REVIEW-DISPOSITION.md
  - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/COVERAGE.md
  - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-REVIEW-FIX-backend.md
  - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-REVIEW-FIX-frontend.md
  - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/COVERAGE.md
  - test/fixtures/lendshed/.planning/REQUIREMENTS.md
  - test/fixtures/lendshed/.planning/STATE.md
  - test/fixtures/lendshed/.planning/WINDOWS.md
  - test/fixtures/shapes/.planning/PROJECT.md
  - test/fixtures/shapes/.planning/WINDOWS.md
  - test/__golden__/dense.json
  - test/__golden__/sparse-empty.json
  - test/__golden__/sparse-started.json
  - test/handlers.test.ts
  - test/milestone-audit-handler.test.ts
  - test/naming.test.ts
  - test/presentation/dashboard-head.test.ts
  - test/presentation/project-context.test.ts
  - test/presentation/review-context.test.ts
  - test/presentation/review-ledger.test.ts
  - test/presentation/roadmap.test.ts
  - test/presentation/root-redirects.test.ts
  - test/presentation/search.test.ts
  - test/presentation/state-session.test.ts
  - test/presentation/traceability.test.ts
  - test/presentation/url-grammar.test.ts
  - test/project-handler.test.ts
  - test/recognition-kinds.test.ts
  - test/review-disposition.test.ts
  - test/review-family.test.ts
  - test/review-handler-guard.test.ts
  - test/review-report.test.ts
  - test/web/coverage-matrix.test.ts
  - test/web/coverage-view-contract.test.ts
  - test/web/fallback.test.ts
  - test/web/milestone-audit.test.ts
  - test/web/milestone-audit-view-contract.test.ts
  - test/web/project-page.test.ts
  - test/web/project-view-contract.test.ts
  - test/web/review-ledger.test.ts
  - test/web/review-ledger-view-contract.test.ts
  - test/web/review-threads-corpus.test.ts
  - test/web/review-threads.test.ts
  - test/web/review-view-contract.test.ts
  - test/web/route-dispatch.test.ts
  - test/web/traceability-redesign-contract.test.ts
  - test/web/traceability-seed.test.ts
  - test/web/view-registry.test.ts
  - test/web/windows-ledger.test.ts
  - test/web/windows-view-contract.test.ts
  - test/windows-handler.test.ts
findings:
  critical: 0
  warning: 5
  info: 14
  total: 19
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-11-03T16:10:00Z
**Depth:** standard
**Files Reviewed:** 110
**Status:** issues_found

## Summary

Phase 9 adds the project page, the windows ledger, the review ledger (tabs, shared head, Fix and Disposition
bodies), the milestone audit page, the coverage page, and the root-document redirect table with its `?source=1`
escape. The read-only boundary holds: no new code writes to the target `.planning/`, every document-derived string
reaches the DOM as React text (no `dangerouslySetInnerHTML`, no href built from document text), the redirect
targets are values from a fixed table or the payload and pass `redirectTo`, and every extractor is a capped line
scan with its own try/catch. `npm run typecheck` and `eslint` over the Phase 9 sources are clean, and the 33 test
files I ran (presentation, handler, ledger, route-dispatch) pass: 1070 tests.

No blockers were found. The five warnings are: a head-count mismatch in the review ledger, a lead/list
contradiction on the windows page, an import cycle introduced by the root-redirect work, dev-only loss of the
settle-then-scroll under StrictMode, and tests pinned to this repository's own mutable planning files. The info
items are duplication, small accessibility and robustness gaps, and test-helper narrowness.

## Warnings

### WR-01: Review-ledger head counts disposition rows that no severity row contains

**File:** `src/presentation/review-ledger.ts:418-428` (and `:447-455`)
**Issue:** With a disposition that has rows, `total` is `dispositionRows.length` and `openTotal` counts every
open row, but each severity bucket is built with `dispositionRows.filter((row) => row.severity === severity)`.
`DispositionRow.severity` is `null` whenever the table has no Severity column and the id's token is not
CR/BL/WR/IN (`severityOf` in `review-disposition.ts:75-82` falls back to `severityOfId`, which returns null for
ids such as `SEC-03` or `FE-02`, both valid under `idTailAt`). Such rows count in "N of M findings" and in the
`Open` group, but appear in no per-severity row of the head, so the visible rows sum to less than the total. The
Disposition tab itself resolves these rows with `row.severity ?? context.severityById[row.id]`
(`web/views/review-ledger.ts:402`), so the head and the tab disagree about the same row's severity.
**Fix:**
```ts
// resolve once, use for both the bucket filter and the tab
const severityOfRow = (row: DispositionRow): ReviewSeverity =>
  row.severity ?? severityById[row.id] ?? 'info';
rows = (['critical', 'warning', 'info'] as const).map((severity) => {
  const ofSeverity = dispositionRows.filter((row) => severityOfRow(row) === severity);
  return {
    severity,
    ids: ofSeverity.map((row) => row.id),
    open: ofSeverity.filter((row) => row.disposition === 'open').length,
  };
});
```
(Add the same fallback in `composeDispositionTab` so the pip and the bucket cannot differ.)

### WR-02: Windows lead says "0 open" while the Open section lists rows

**File:** `src/web/views/windows-ledger.ts:222-226` and `:249-259`
**Issue:** `listsOf` puts every row whose status is `open` **or `other`** into the Open section
(`openRows = rows.filter(status === 'open' || status === 'other')`), but `leadOf` counts only `status === 'open'`.
A ledger whose rows carry an unrecognised status (`"Open "` is trimmed, but `"todo"`, `"blocked"`, `"wontfix"` are
not) therefore reads "0 open", the `complete` tone, and "Nothing open." in the lead, directly above an `Open  3`
section. `withDisagreement` in `handlers/windows.ts:175-179` has the same blind spot (`listed` ignores `other`),
so a file stating `open_count: 3` over three `blocked` rows raises a false "counts disagree" notice. The
"never alarming, never wrong" intent of the lead is defeated for exactly the rows the reader cannot classify.
**Fix:** Do not let the lead's tone claim completion while unclassified rows are listed. Either count `other` rows
in `leadOf` (`open + other`) or give them their own "Unrecognised status" list and leave `complete` only when
`open === 0 && other === 0`; apply the same count in `withDisagreement`.

### WR-03: Import cycle between dashboard-head, state-session, root-redirects and traceability

**File:** `src/presentation/state-session.ts:8-9`, `src/presentation/dashboard-head.ts:12`,
`src/presentation/root-redirects.ts:15`, `src/presentation/traceability.ts:16`
**Issue:** Phase 9 introduced two cycles: `dashboard-head.ts` -> `state-session.ts` -> `dashboard-head.ts`
(direct; `state-session` needs `activityDateLabel`), and `state-session.ts` -> `root-redirects.ts` ->
`traceability.ts` -> `dashboard-head.ts` (`traceability` needs `projectSectionLead`, `root-redirects` needs
`projectedArchiveVersion`). It works today only because every cross-module use is inside a function body (hoisted
function declarations); the first top-level use of an import in any of these four modules would see `undefined`
at load time, and the failure would depend on which module the bundler enters first. `root-redirects.ts` also
advertises itself as a leaf ("Pure: no Node imports, no React") yet now drags the whole traceability view-model
builder into every importer, including the eagerly loaded `route-dispatch.ts`.
**Fix:** Move the leaf helpers (`activityDateLabel`, `sectionLead`/`projectSectionLead`, `splitProjectTitle`) into a
module with no presentation imports, and move `projectedArchiveVersion` (and `archiveItemsOf`) out of
`traceability.ts` into one that `root-redirects.ts` and `traceability.ts` both import.

### WR-04: Settle-then-scroll is silently cancelled under StrictMode (dev)

**File:** `src/web/pages/roadmap-page.tsx:47-69` (`useSettledScrollIntoView`), `src/web/pages/traceability-page.tsx:276-297`
**Issue:** Both effects guard with `scrolledRef.current` and set it to `true` *before* starting
`scrollWhenSettled`. `main.tsx` mounts under `<StrictMode>`, so in development React runs the effect, runs its
cleanup (which disposes the settle loop), and runs the effect again; the second run sees `scrolledRef.current ===
true` and returns without scheduling anything. Only the first synchronous `tick()` scroll survives, so a layout that
is still moving (lazy chunks, fonts, the details opening) leaves the History block, the archived milestone or
`#history` at the wrong offset on `/v1.0/roadmap`, `/v1.0/requirements` and `/milestones`. `artifact-page.tsx:902-907`
and `research-briefing-components.tsx:467` document and avoid this exact trap ("cleared only when the frame callback
fires, so a re-run of the effect (StrictMode) still lands on it"); the new hook does the opposite. Production builds
are unaffected, which is why the production-served e2e spec passes.
**Fix:** Mark the ref done only when the scroll has actually completed, or reset it in the cleanup:
```ts
useEffect(() => {
  if (!enabled || scrolledRef.current) return;
  const dispose = scrollWhenSettled({ /* ... */ });
  scrolledRef.current = true;
  return () => { dispose(); scrolledRef.current = false; };
}, [enabled, ref]);
```
(or key the guard on the target id, as the artifact page does with `pendingSourceId`).

### WR-05: Tests pinned to this repository's own mutable planning files

**File:** `test/project-handler.test.ts:51-57`, `test/e2e/phase-09-screenshots.spec.ts:119-125`,
`test/e2e/project-page-screenshots.spec.ts:36`
**Issue:** The suite reads the live `.planning/` of the repo under test. `project-handler.test.ts` asserts that
this repository's PROJECT.md has `Current Milestone: v2.1 Wayfinding` with a goal starting `Every file GSD can
write opens into a designed page`; the first milestone transition (the very next `/gsd-new-milestone` or
`/gsd-complete-milestone`) turns the suite red with no code change. The e2e spec hard-codes
`/v2.1/phase-8/review-disposition` and `of 32 findings`, and `minRows: 27` for the repo's own decisions table.
These are data coupling, not behaviour: a project's own planning edits break unrelated CI, and the failure message
points at the code, not the planning file. The frozen archived files (`v1.0-MILESTONE-AUDIT.md`) are fine; the live
ones are not.
**Fix:** Pin to a fixture copy (`test/fixtures/labelore-snapshot/`) or assert only shape on the live file
(milestone label non-empty, version matches `/^v\d+\.\d+/`, decisions count equals `tableRowCount`, which the
suite already does for the row count). For e2e, take the phase and finding count from the served payload instead
of literals.

## Info

### IN-01: `StaleMark` is defined twice

**File:** `src/web/views/review-ledger-components.tsx:112-124` and `src/web/views/review-threads-components.tsx:44-52`
**Issue:** Two byte-for-byte copies of the same component (the second added in this phase alongside the first), with
the same comment, className and strings. They will drift.
**Fix:** Export one from `review-threads-components.tsx` (or a small shared file) and import it in the ledger.

### IN-02: `fileNameOf` re-implemented in six places

**File:** `src/presentation/root-redirects.ts:55`, `src/presentation/review-ledger.ts:142`, `src/web/pages/dashboard-page.tsx:24`,
`src/web/pages/search-page.tsx:56` (also `manual-checks.ts:80`); `src/presentation/file-facts.ts:8` already exports one
**Issue:** Phase 9 added four more copies of a helper that `presentation/file-facts.ts` already exports, with subtly
different edge behaviour (`dashboard-page` falls back to the whole path when the name is empty; the others return
`''`).
**Fix:** Import `fileNameOf` from `file-facts.ts`.

### IN-03: Plain-object lookups by author-controlled id use `in` / bracket access

**File:** `src/presentation/review-ledger.ts:392,406,460`; `src/web/views/review-ledger.ts:241,402`
**Issue:** `severityById`, `fixedCommits` and `marks` are `{}` literals and are probed with `id in obj` or
`obj[id]`. Fix-report ids are limited by `idTailAt`, so those are safe, but `DispositionRow.id` comes from
frontmatter (`rowsFromFrontmatter` accepts any string up to 80 characters, e.g. `constructor`), and
`web/views/review-ledger.ts:402` (`context.severityById[row.id]`) would then return `Object`'s constructor function
as a "severity". `web/views/review-threads.ts:staleMarkOf` already uses `Object.hasOwn`; the server side and the
ledger composer do not.
**Fix:** Use `Object.create(null)` / `Map`, or `Object.hasOwn` before reading.

### IN-04: The ledger cap can drop the file that was opened

**File:** `src/presentation/review-ledger.ts:187-193`
**Issue:** `ledgerFixMembers` sorts and then `slice(0, MAX_FIX_MEMBERS)`. Opening the 13th shard's own URL builds a
context without it: `active` is `fix`, `activeSuffix` falls back to the file name, but no section exists for it, so
the page shows twelve other files and `scrollTo` stays null. T-09-24's bound is right; the opened member should be
exempt from it.
**Fix:** After slicing, append the opened path's member if it is a fix file and was cut.

### IN-05: `aria-pressed` on buttons whose label also flips

**File:** `src/web/views/project-page-components.tsx:87-94` and `:174-181`
**Issue:** "Read in full" / "Shorten lists" and "Show every reason" / "Hide every reason" set `aria-pressed` *and*
change their text. A toggle button must keep one name and expose state with `aria-pressed`, or change its name
and carry no pressed state; screen readers announce "Hide every reason, pressed" (state inverted).
**Fix:** Drop `aria-pressed` (the label already states the action) or keep a fixed label.

### IN-06: WINDOWS table fallback reads lower-case keys only; fence scan tracks only json fences

**File:** `src/planning-repo/handlers/windows.ts:123-137` and `:75-92`
**Issue:** `normaliseRow` reads `record.id`, `record.status`, `record.recorded_at` etc. GSD writes the table with
those exact lower-case headers, but a table with `ID | Status | Recorded at` normalises every row to `status: ''`
(class `other`, chip "No status"); and any cell containing a `|` shifts every later column because
`parseMarkdownTable` splits on all pipes. `extractFencedJson` tracks only json-opening fences, so a ```` ```json ````
line quoted inside another fenced block (a ```` ````markdown ```` example) is taken as the data block.
**Fix:** Look keys up case-insensitively with `_`/space folding; track any opening fence run and look for `json`
only at the top level.

### IN-07: Empty-state line shown for the `validated` and `out-of-scope` states

**File:** `src/web/pages/traceability-page.tsx:595-597`
**Issue:** With `?state=validated` or `?state=out-of-scope`, `matchesTraceabilityFilter` rejects every active-tier
row by construction (the filter file says they "hold no active-tier row at all"), so the page prints "No
active-tier requirements match the current filter." above the section the state exists to show.
**Fix:** Skip that line when `filter.state` is `validated` or `out-of-scope`.

### IN-08: `designedElsewhereLead` keys on kind alone

**File:** `src/presentation/root-redirects.ts:139-143`, `src/web/views/manifests.ts:433-436`
**Issue:** The file header promises the redirect is chosen by location `root` plus exact file name, "never by kind
alone (the T-07-04 precedent)", but the escape-page lead is chosen by kind. `phases/01-x/01-STATE.md` (kind `state`
through `parsePhaseArtifactName`) opened with `?source=1` is told "The file behind the dashboard, as written."
**Fix:** Pass the artifact (or its location) to `resolveViewFor` and call `designedElsewhereLead` only when
`rootRowOf` or `archivedCopyTarget` matches.

### IN-09: `/roadmap#history` does not scroll when the roadmap is already open

**File:** `src/web/pages/roadmap-page.tsx:449-451`
**Issue:** `landOnHistory` is read once in a `useState` initialiser. A link to `/roadmap#history` followed from the
roadmap page itself (same component instance) changes the hash but not the state, and React Router does not scroll
to hashes by itself, so nothing moves. The cross-page cases (search result, redirected `/milestones`) work.
**Fix:** Derive it from `hash` and re-run the settle when `hash === '#history'` changes, or use an effect keyed on `hash`.

### IN-10: Duplicate React keys in a fix row

**File:** `src/web/views/review-ledger-components.tsx:130-134,152-156`
**Issue:** Rows key their id chips by `entry.id` and commit spans by `commit.full`. `hexTokensIn` returns every
hash token in order, so "`abc1234` ... amended as `abc1234`" or an id repeated in a combined heading produces two
children with one key (a React warning and, on update, a dropped node).
**Fix:** Include the index: `` key={`${commit.full}-${index}`} ``.

### IN-11: Source mode survives a ledger tab change

**File:** `src/web/pages/artifact-page.tsx:669`, `src/web/pages/document-route.tsx:30`
**Issue:** `ArtifactPage` is not keyed, so the `mode` state carries over when the tab strip navigates from the Review
to the Fix or Disposition file (the ledger made in-place navigation between documents a first-class path). A reader
who was in Source on the review lands in Source on the fix file, with the tab strip above it.
**Fix:** Render `<ArtifactPage key={url} route={url} />` in `DocumentRoute` if the mode should reset per document.

### IN-12: Disposition rows are not de-duplicated

**File:** `src/planning-repo/handlers/review-disposition.ts:277-296`
**Issue:** `reviewOf` (presentation) de-duplicates finding ids, but `rowsFromFrontmatter` and `rowsFromTable` do
not. A disposition that lists an id twice (a rewritten row) inflates `head.total`, `openTotal` and the group
counts.
**Fix:** Keep the first row per id, as `reviewOf` does.

### IN-13: `sketchWinner` only knows A, B and C

**File:** `test/e2e/sketch-file.ts:14-22`
**Issue:** The README winners in this repo include `D`, `E`, `D1`, `R3b` and so on. The helper accepts `[A-C]` only
and throws for any other sketch, although it is named and typed as the general reader; it works today only
because 039-041 happen to have single-letter A-C winners.
**Fix:** Widen to `[A-Z]\w*` and the return type to `string`, or rename the helper to say it is for the project
sketches.

### IN-14: Hard-coded layout constant and ordering assumption in the root-document e2e

**File:** `test/e2e/root-documents.spec.ts:13,49`
**Issue:** `HEADER_HEIGHT = 56` duplicates the sticky shell header height (a CSS value) and the "first
`.history-milestone` is v1.0" check depends on History order.
**Fix:** Read the header's bounding box at run time and select the block by its Shipped chip text.

---

_Reviewed: 2026-11-03T16:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
