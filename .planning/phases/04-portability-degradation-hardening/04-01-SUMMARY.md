---
phase: 04-portability-degradation-hardening
plan: 01
subsystem: api
tags: [refresh, hono, tanstack-query, base-ui-toast, tdd]

# Dependency graph
requires:
  - phase: 01-read-layer-domain-model
    provides: "PlanningRepository.refresh() - the single, never-throwing rebuild seam this plan wires into a route"
  - phase: 02-situational-awareness-artifact-reading
    provides: "app-shell.tsx's existing .snapshot-status timestamp slot, extended in place with the Refresh control"
  - phase: 03-search-browsing-traceability
    provides: "buildTreeViewModel / buildSearchGroups, now served from the same atomically-swapped derived-views bundle"
provides:
  - "POST /api/refresh - coalesced, same-origin-gated, never a 5xx on a failed-but-resolved snapshot"
  - "A single DerivedViews bundle (presentation, artifactIndex, referenceRegistry, searchIndexState) every read handler serves from, replaced atomically on refresh (D-05)"
  - "RefreshControl - the codebase's first useMutation, wired to unconditional query-cache invalidation and scroll-to-top"
  - "The codebase's first @base-ui/react/toast wrapper (ToastProvider/ToastList/useToastManager) for the D-04 failure toast"
affects: [04-02, 04-03, 04-04]

# Actuals (#2632)
actuals:
  tokens: 10123
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SnapshotSource.refresh?() is optional; buildDerivedViews() is a closure over source that always re-reads source.getSnapshot() rather than threading a returned snapshot by hand, matching PlanningRepository's own this.snapshot-before-return contract"
    - "Server-side in-flight-promise coalescing (let inFlight: Promise<ProjectSnapshot> | null) for a POST endpoint with no persisted queue"
    - "First TanStack Query useMutation in the codebase; onSuccess does one unfiltered queryClient.invalidateQueries() rather than a keyed invalidation"
    - "First @base-ui/react/toast usage; useToastManager re-exported from a thin wrapper because the package's top-level index only re-exports it as a type, not a value"

key-files:
  created:
    - src/web/components/refresh-control.tsx
    - src/web/components/ui/toast.tsx
    - test/server/refresh.test.ts
    - test/web/refresh-contract.test.ts
  modified:
    - src/server/index.ts
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - test/web/visual-contract.test.ts

key-decisions:
  - "buildDerivedViews() takes no snapshot argument and instead re-reads source.getSnapshot() on every call (startup and post-refresh), because PlanningRepository.refresh() assigns its own this.snapshot before resolving - this keeps exactly one toProjectPresentation(source.getSnapshot()) call site in the file, satisfying the plan's own drift-detection grep."
  - "Coalescing binds source.refresh via .bind(source) rather than extracting the method reference directly - an unbound extraction silently drops `this`, which is what caused the first live-probe run to 500."

patterns-established:
  - "Route handlers read from a single mutable `derived` bundle rather than recomputing per request; a refresh replaces the whole bundle in one assignment, never a field-by-field mutation."

requirements-completed: [TGT-08]

coverage:
  - id: D1
    description: "Every view states its snapshot's read time via the global header, and Refresh re-reads through PlanningRepository.refresh() (TGT-08, D-01)"
    requirement: "TGT-08"
    verification:
      - kind: integration
        ref: "test/server/refresh.test.ts#answers 200 with refreshed: true and a later readAt, reflected by the next GET /api/presentation"
        status: pass
      - kind: other
        ref: "Task 1 live probe: curl POST /api/refresh against fixtures/dense, readAt strictly advances, GET /api/presentation reflects it"
        status: pass
    human_judgment: false
  - id: D2
    description: "A refresh replaces presentation, artifact index, reference registry and search index together in one assignment (D-05)"
    requirement: "TGT-08"
    verification:
      - kind: integration
        ref: "test/server/refresh.test.ts#replaces GET /api/tree with the post-refresh artifact set - the derived bundle, not just the presentation, was rebuilt"
        status: pass
    human_judgment: false
  - id: D3
    description: "While refreshing, the header status swaps to 'Refreshing...' in place with no layout shift, and the button is disabled/aria-disabled so a second refresh cannot race the first (D-02)"
    requirement: "TGT-08"
    verification:
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#sets disabled and aria-disabled from the pending flag, and carries the refresh aria-label (D-02)"
        status: pass
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#shares one status slot between \"Snapshot read\" and \"Refreshing...\" (D-02)"
        status: pass
    human_judgment: true
    rationale: "The no-layout-shift and no-dimming visual claim is a rendered-DOM property; the source-text contract proves the branch exists in the right slot but not its rendered appearance. A human should confirm the spin/label swap visually before this ships."
  - id: D4
    description: "A failed refresh retains the previous snapshot and its original readAt unchanged, and reports the failure only via a transient, fixed-copy toast (D-04)"
    requirement: "TGT-08"
    verification:
      - kind: integration
        ref: "test/server/refresh.test.ts#answers 500 with refreshed: false on a rejecting refresh(), and retains the pre-refresh readAt on the next GET (D-04)"
        status: pass
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#never interpolates a fetch/server error into the toast, only the fixed copy (D-04)"
        status: pass
      - kind: unit
        ref: "test/web/refresh-contract.test.ts#adds no persistent \"stale\" label anywhere in the shell (D-04)"
        status: pass
    human_judgment: true
    rationale: "The toast's visual placement/transience (bottom-right, auto-dismiss) is asserted only via CSS text and no automated screenshot exists in this v1 test stack; a human should confirm the toast actually appears and disappears correctly."
  - id: D5
    description: "Concurrent refreshes coalesce into one filesystem rebuild and same-millisecond completions still repaint (TGT-06 concurrency, TGT-08 adjacency)"
    requirement: "TGT-08"
    verification:
      - kind: integration
        ref: "test/server/refresh.test.ts#coalesces two concurrent calls into exactly one call into the source refresh(), with equal readAt responses (TGT-06)"
        status: pass
    human_judgment: false
  - id: D6
    description: "POST /api/refresh never 5xxs on a resolved-but-failed snapshot or a no-refresh source, and rejects cross-site requests before touching disk (T-04-01-01/02)"
    requirement: "TGT-08"
    verification:
      - kind: integration
        ref: "test/server/refresh.test.ts#carries a failed loadStatus verbatim, never a 5xx, when refresh() resolves to project: null"
        status: pass
      - kind: integration
        ref: "test/server/refresh.test.ts#answers 200 with refreshed: false and the unchanged readAt when the source exposes no refresh (TGT-08 empty)"
        status: pass
      - kind: integration
        ref: "test/server/refresh.test.ts#answers 403 and never calls refresh() when sec-fetch-site is present and not same-origin"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-03
status: complete
---

# Phase 4 Plan 1: Refresh Seam Summary

**POST /api/refresh coalesces concurrent rebuilds through the existing `PlanningRepository.refresh()` seam, atomically swaps a single server-side derived-views bundle, and drives a header Refresh control (the codebase's first `useMutation`) plus a `@base-ui/react/toast` failure toast (the codebase's first toast primitive) — proven by 17 new tests.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-09-03T21:27:00Z (approx.)
- **Completed:** 2026-09-03T22:06:24Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `POST /api/refresh` — same-origin gated, coalesces concurrent calls into one in-flight rebuild via `let inFlight`, and answers HTTP 200 (never 5xx) on both a no-refresh source and a resolved-but-failed `loadStatus`, only a genuine `refresh()` rejection produces a 500.
- Every read handler (`/api/presentation`, `/api/dashboard`, `/api/roadmap`, `/api/history`, `/api/tree`, `/api/traceability`, `/api/search`, `/api/artifacts/*`, `/api/documents`) now serves from one mutable `derived: DerivedViews` bundle, replaced in a single assignment on refresh — never recomputed per request, never mutated field by field.
- `RefreshControl` — a header icon button beside the existing "Snapshot read" timestamp, wired through TanStack Query's first `useMutation` in this codebase: on success it runs one unfiltered `queryClient.invalidateQueries()` and `window.scrollTo({ top: 0 })`; on failure it adds a fixed-copy toast that never interpolates the raw error.
- `AppShell`'s `.snapshot-status` slot gained a fourth in-place branch — `Refreshing…` swaps in for the timestamp span with no new DOM node and no layout shift — and now mounts a single `ToastProvider` around the shell root.
- `src/web/components/ui/toast.tsx` — the first `@base-ui/react/toast` wrapper in the codebase, re-exporting `useToastManager` off the `Toast` namespace since the package's top-level index only re-exports that hook as a type.
- 17 new automated assertions across `test/server/refresh.test.ts` (9 cases against `createApp()` + `app.request(...)`) and `test/web/refresh-contract.test.ts` (8 source-text contract cases), plus a package.json dependency-set pin proving this plan installed nothing.

## Task Commits

Each task was committed atomically:

1. **Task 1: One refresh, end to end — repository seam to header timestamp** - `b342e33` (feat)
2. **Task 2: The failure path and the in-progress contract** - `b46577c` (feat)
3. **Task 3: Pin the refresh contract with automated proof** - `cdac07b` (test)

**Plan metadata:** commit to follow this SUMMARY.

## Files Created/Modified

- `src/server/index.ts` — `SnapshotSource.refresh?()`, `DerivedViews`, `buildDerivedViews()`, `let derived`/`let inFlight`, and the new `POST /api/refresh` route
- `src/web/components/refresh-control.tsx` — new: the header Refresh button, `useMutation`, `postRefresh()` fetcher, D-04 toast wiring
- `src/web/components/ui/toast.tsx` — new: `ToastProvider`, `ToastList`, re-exported `useToastManager`
- `src/web/components/app-shell.tsx` — exports `fetchPresentation`/`formatReadAt`, renders `RefreshControl` and the fourth `Refreshing…` status branch, mounts `ToastProvider`
- `src/web/styles/globals.css` — `.refresh-control`/`.refresh-icon`/`.refresh-icon.spinning` (with a `prefers-reduced-motion` override), `.toast-viewport`/`.toast`
- `test/server/refresh.test.ts` — new: 9 server-route cases
- `test/web/refresh-contract.test.ts` — new: 8 source-text contract cases
- `test/web/visual-contract.test.ts` — mechanical `no-regex-spaces` lint fix (see Deviations)

## Decisions Made

- `buildDerivedViews()` is a zero-argument closure over `source` rather than a function taking a snapshot parameter, so it always reads the current `source.getSnapshot()` — this keeps the plan's required single `toProjectPresentation(source.getSnapshot())` call site intact and matches `PlanningRepository`'s actual contract (its `refresh()` assigns `this.snapshot` before resolving).
- `source.refresh` is captured via `.bind(source)`, not a bare method-reference extraction, after the bare extraction silently dropped `this` and turned every refresh into a 500 during the Task 1 live-probe run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unbound `source.refresh` extraction dropped `this`, 500ing every refresh**
- **Found during:** Task 1 (live-probe verification against `fixtures/dense`)
- **Issue:** `const refreshFn = source.refresh; inFlight = refreshFn();` invoked `PlanningRepository.prototype.refresh` with no receiver, so `this.fs`/`this.rootPath` inside it were `undefined` and every refresh threw, caught by the route's own boundary and returned as a 500.
- **Fix:** Bind once — `const refresh = source.refresh.bind(source);` — before the coalescing branch.
- **Files modified:** `src/server/index.ts`
- **Verification:** Task 1's live probe (`curl -X POST /api/refresh` against a running server on `fixtures/dense`) now returns `refreshed: true` with a strictly later `readAt`.
- **Committed in:** `b342e33` (Task 1 commit)

**2. [Rule 3 - Blocking] Pre-existing `no-regex-spaces` lint failures blocked the plan's own `npm run lint` gate**
- **Found during:** Task 1 (initial `npm run lint` run)
- **Issue:** `test/web/visual-contract.test.ts` (untouched by this plan) already failed `eslint` at HEAD with two `no-regex-spaces` violations (`/:root \{\n  --table-zebra:/` — two literal spaces read as "hard to count"). Every task in this plan verifies via `npm run lint`, which runs project-wide, so this pre-existing failure would block every task's own verification gate regardless of this plan's changes.
- **Fix:** `npx eslint --fix test/web/visual-contract.test.ts` — mechanically rewrote the two regexes to use `{2}` quantifiers (`/\n {2}--table-zebra:/`), semantically identical.
- **Files modified:** `test/web/visual-contract.test.ts`
- **Verification:** `npm run lint` exits 0 project-wide; the file's own test (`code scrollbar and table striping`) still passes.
- **Committed in:** `b342e33` (Task 1 commit)

**3. [Rule 1 - Bug] A JSDoc comment literally containing `error.message` tripped the plan's own no-interpolated-error acceptance check**
- **Found during:** Task 3 (writing `test/web/refresh-contract.test.ts`'s `not.toContain('error.message')` assertion)
- **Issue:** A code comment in `refresh-control.tsx`'s `onError` handler explained the toast's fixed-copy design by referencing `` `{error.message}` `` — a correct comment, but its literal text matched the same substring the acceptance check (and the new automated test) forbid in the file, unlike the plan's own `grep -v '^[[:space:]]*//'`-filtered acceptance criterion which strips comment lines first.
- **Fix:** Reworded the comment to describe the same thing ("the caught error's own message text") without using the literal substring.
- **Files modified:** `src/web/components/refresh-control.tsx`
- **Verification:** `test/web/refresh-contract.test.ts`'s `.not.toContain('error.message')` assertion passes.
- **Committed in:** `cdac07b` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 1 blocking, 1 bug)
**Impact on plan:** All three were necessary for correctness (the `this`-binding fix is the one substantive behavioral bug) or for the plan's own verification gates to pass at all. No scope creep — no functionality was added beyond what Tasks 1–3 specify.

## Issues Encountered

- Task 2 carries `tdd="true"` and a `<behavior>` block but assigns no test file of its own (`test/server/refresh.test.ts` and `test/web/refresh-contract.test.ts` are both Task 3 files) and its own `<verify>` never runs a test — the plan's own test ownership is split so that Task 3 owns all automated pinning for Tasks 1 and 2 together. Implemented Task 2 as a single `feat` commit against its `<action>`/`<behavior>` spec rather than a literal RED→GREEN→REFACTOR commit sequence, since writing a premature test in Task 2 that Task 3 would then have to reconcile or duplicate would work against the plan's own structure. Task 3's suite (17 cases) is what actually pins Task 2's behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The refresh seam, the atomic derived-views bundle, and the toast primitive are all in place for plans 04-02 through 04-04 to build on — `fetchPresentation` and the toast wrapper are both already exported/reusable.
- D3 and D4's visual claims (no layout shift during refresh, toast placement/transience) are pinned at the source-text level but not by a rendered screenshot; recommend a human click through Refresh once against a live `npm run dev` session before the phase closes.

---
*Phase: 04-portability-degradation-hardening*
*Completed: 2026-09-03*

## Self-Check: PASSED

All key files (`src/web/components/refresh-control.tsx`, `src/web/components/ui/toast.tsx`,
`test/server/refresh.test.ts`, `test/web/refresh-contract.test.ts`, `src/server/index.ts`,
`src/web/components/app-shell.tsx`, `src/web/styles/globals.css`) confirmed present on disk.
All three task commits (`b342e33`, `b46577c`, `cdac07b`) confirmed present in `git log`.
