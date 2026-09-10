---
phase: 04-portability-degradation-hardening
reviewed: 2026-09-07T20:28:50Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - src/presentation/artifact-warning-summary.ts
  - src/presentation/artifact-warning-tone.ts
  - src/presentation/search.ts
  - src/presentation/tree.ts
  - src/server/index.ts
  - src/server/project-presentation.ts
  - src/web/app-router.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/empty-state.tsx
  - src/web/components/refresh-control.tsx
  - src/web/components/tree-navigator.tsx
  - src/web/components/ui/toast.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/invalid-project-screen.tsx
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/traceability-page.tsx
  - src/web/styles/globals.css
  - test/portability.test.ts
  - test/presentation/artifact-warning-summary.test.ts
  - test/presentation/roadmap.test.ts
  - test/presentation/search.test.ts
  - test/presentation/tree.test.ts
  - test/rendering/plan-sections.test.ts
  - test/rendering/references.test.ts
  - test/server/artifact-response.test.ts
  - test/server/derived-snapshot-isolation.test.ts
  - test/server/project-presentation.test.ts
  - test/server/refresh.test.ts
  - test/target-path.test.ts
  - test/web/degradation-ui-contract.test.ts
  - test/web/empty-state-contract.test.ts
  - test/web/invalid-project-contract.test.ts
  - test/web/refresh-contract.test.ts
  - test/web/visual-contract.test.ts
findings:
  critical: 2
  warning: 3
  info: 0
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-09-07T20:28:50Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

The phase still has two release-blocking correctness defects. A failed real filesystem refresh is
reported as successful and replaces the last usable snapshot, contrary to D-04. Separately, the new
Refresh action is nested inside a header region that CSS hides below 62rem, so it is unavailable on
narrow screens. Search snippet extraction also has two reproducible window/highlight defects, and
the derived-view builder does not actually capture the single snapshot its atomicity comment claims.

The focused regression suites pass (34 tests across the search, refresh, and warning-summary test
files), but their current cases do not exercise these boundaries; one refresh test actually codifies
the failed-refresh behavior as success.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: A failed real refresh discards the last successful presentation

**File:** `src/server/index.ts:232-240`

**Issue:** The handler treats every resolved `source.refresh()` result as success, rebuilds all
derived views, and returns `refreshed: true` without checking `snapshot.loadStatus`. The production
source is `PlanningRepository`, whose `refresh()` deliberately never throws: target failures such as
permission loss or removal of `.planning/` resolve to a snapshot with a non-`ok` load status and
`project: null`. Therefore the catch at lines 241-244 is not the normal failure path. A transient
filesystem failure after a valid load replaces `derived` with an empty presentation; client
invalidation then switches the whole app to `InvalidProjectScreen`. This violates D-04's explicit
requirement to retain the previous snapshot and timestamp on refresh failure. The test at
`test/server/refresh.test.ts:165-176` currently locks in the incorrect behavior by expecting a
project-null snapshot to be reported as a successful refresh.

**Fix:** Treat a non-`ok` returned snapshot as a failed refresh before assigning `derived`, and return
a non-2xx response so `RefreshControl.onError` shows the retention toast. Keep the existing derived
bundle untouched:

```ts
const snapshot = await inFlight;
if (snapshot.loadStatus.status !== 'ok') {
  return c.json({ refreshed: false as const, error: snapshot.loadStatus.message }, 500);
}
derived = buildDerivedViews(snapshot);
return c.json({ refreshed: true as const, readAt: snapshot.readAt, loadStatus: snapshot.loadStatus });
```

Update the failed-load-status test to assert `refreshed: false`, a failure HTTP status, and that the
next `/api/presentation` response still has the pre-refresh `readAt` and data.

### CR-02: The Refresh action is completely unavailable below 62rem

**File:** `src/web/styles/globals.css:1471-1478`

**Issue:** `RefreshControl` is rendered inside `.snapshot-status` (`app-shell.tsx:103-128`), but the
existing narrow breakpoint sets that entire container to `display: none`. Consequently users at any
viewport at or below 62rem—including the supported 320px layout—cannot invoke the new project-wide
Refresh action at all. The source-contract test only verifies that the control is nested in
`.snapshot-status`; it does not inspect the breakpoint, so it passes while guaranteeing the control
will be hidden there.

**Fix:** Keep the control in a visible header container at narrow widths and hide only the timestamp
text, or move `RefreshControl` beside `ThemeToggle` outside `.snapshot-status`. Add a responsive
contract or browser test that asserts the refresh button remains displayed and keyboard reachable at
the 62rem boundary and below.

## Warnings

### WR-01: Unicode lowercasing corrupts snippet highlight offsets

**File:** `src/presentation/search.ts:368-371`

**Issue:** Occurrence indices are calculated in `body.toLowerCase()` and then applied directly to the
original body. Unicode lowercasing is not length-preserving. For example, `İMATCH end` lowercases to
`i̇match end` (the first character expands to two UTF-16 code units). The real function currently
returns highlight `{ start: 2, end: 7 }` for the term `match`, so the UI marks `ATCH ` rather than
`MATCH`. Any length-changing case mapping before a match shifts every subsequent range and can also
shift snippet boundaries.

**Fix:** Search with an offset-preserving case-fold strategy, or maintain an explicit mapping from
indices in the normalized string back to UTF-16 offsets in the original body. Add a regression case
using `İMATCH` and assert the highlighted original slice is exactly `MATCH`.

### WR-02: Independently seeded snippets can overlap and expose truncated match fragments

**File:** `src/presentation/search.ts:385-407`

**Issue:** The inner loop consumes an occurrence only when the entire occurrence lies within the
current window. Two occurrences separated by more than half the window but less than the full window
therefore become separate seeds even though their resulting text windows overlap. The row renders
duplicated body text, and each window can cut through the other match as unhighlighted partial text.
This contradicts the function's documented promise to avoid near-duplicate windows. Existing tests
cover multiple occurrences inside one window, not overlapping independently seeded windows.

**Fix:** Merge accepted windows when their `[start, end)` ranges overlap, recomputing relative
highlight ranges, or clip adjacent windows at a safe midpoint/word boundary. Add a case with two
matches spaced in the `(windowChars / 2, windowChars)` interval.

### WR-03: `buildDerivedViews` reads the source three times instead of capturing one snapshot

**File:** `src/server/index.ts:60-68`

**Issue:** The function's contract says all views are built from one read, but it independently calls
`source.getSnapshot()` for the presentation, artifact index, and search index. The production getter
is currently stable during this synchronous function, but the `SnapshotSource` interface does not
guarantee referential stability or purity. A future source implementation can therefore produce a
bundle whose fields came from different snapshots, defeating the atomic-bundle invariant at its
construction seam.

**Fix:** Capture once and pass the same object to every builder:

```ts
function buildDerivedViews(snapshot = source.getSnapshot()): DerivedViews {
  const presentation = toProjectPresentation(snapshot);
  const artifactIndex = buildArtifactIndex(snapshot);
  const referenceRegistry = buildReferenceRegistry(presentation);
  const searchIndexState = createSearchIndexState();
  searchIndexState.buildFrom(snapshot);
  return { presentation, artifactIndex, referenceRegistry, searchIndexState };
}
```

---

_Reviewed: 2026-09-07T20:28:50Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
