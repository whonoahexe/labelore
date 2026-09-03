---
phase: 04-portability-degradation-hardening
plan: 02
subsystem: ui
tags: [react-router, react-query, invalid-project, clipboard, source-text-contract]

# Dependency graph
requires:
  - phase: 04-portability-degradation-hardening
    provides: "04-01's fetchPresentation export and ['presentation'] query key on app-shell.tsx, reused here as the single fetch ProjectGate dedupes against"
  - phase: 01-read-layer-domain-model
    provides: "src/cli/target-path.ts's LOAD_STATUS_MESSAGES and the FailedLoadStatus/LoadStatus union this screen renders verbatim"
provides:
  - "InvalidProjectScreen — the one whole-app failure screen for every non-ok LoadStatus (path-not-found, not-a-gsd-project, permission-denied)"
  - "ProjectGate — router-level gate in app-router.tsx that replaces the routed tree with InvalidProjectScreen before any child route/nav/search/tree renders"
  - "A copy-to-clipboard CopyField pattern (D-16/D-17) reusing artifact-page.tsx's copyHeadingUrl try/catch shape"
affects: [04-03, 04-04]

# Actuals (#2632)
actuals:
  tokens: 4319
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TypeScript narrowing via the `in` operator directly inside a JSX ternary condition ('rawPath' in loadStatus && ...) rather than hoisting to a boolean variable, which loses narrowing at the point of use — kept because it also means the component's source never has to name any of the four LoadStatus status-string literals itself, satisfying D-15's contract at the text level, not just at render time."
    - "Router-level presentation gate: ProjectGate runs the same ['presentation'] query key and imported fetchPresentation fetcher AppShell uses, so React Query dedupes the request; branching on loadStatus.status before rendering <AppShell /> makes hiding nav/search/tree structural (no <Outlet /> renders) rather than conditional styling."

key-files:
  created:
    - src/web/pages/invalid-project-screen.tsx
    - test/web/invalid-project-contract.test.ts
  modified:
    - src/web/app-router.tsx
    - src/web/pages/dashboard-page.tsx
    - src/web/styles/globals.css
    - test/target-path.test.ts

key-decisions:
  - "Used `npm run dev -- /path/to/your/project` for the D-17 restart command, correcting the UI-SPEC's placeholder `npx gsd-lore {path}` — package.json declares no `bin` field, so that invocation would not actually work; `dev` is the real script that accepts a path argument."
  - "Narrowed the rawPath-vs-pathChecked branch via `'rawPath' in loadStatus` directly in the JSX ternary condition rather than storing the boolean check in a named variable first — TypeScript only narrows the union at the exact point of the `in` check, so hoisting it would have required an unsafe cast; as a side effect this also means the component never needs to compare against a status-literal string like 'path-not-found', which the contract test in Task 3 asserts never appears in the file at all."

patterns-established:
  - "A router-level presentation gate (ProjectGate) sitting above AppShell that reuses the shell's own query key/fetcher rather than adding a second data-fetching path for the same endpoint — the template for any future top-level branch on load status."

requirements-completed: [TGT-07]

coverage:
  - id: D1
    description: "Every invalid startup target (missing path, unreadable path, directory with no .planning/) shows a screen naming the problem and the exact path checked (TGT-07)"
    requirement: "TGT-07"
    verification:
      - kind: e2e
        ref: "Task 2 live probe: a directory with no .planning/ answers not-a-gsd-project naming its own path; an absent path answers path-not-found carrying rawPath unchanged, both via /api/presentation against a running server"
        status: pass
      - kind: integration
        ref: "test/target-path.test.ts#resolves an empty path argument relative to process.cwd() (TGT-07 empty)"
        status: pass
      - kind: integration
        ref: "test/target-path.test.ts#preserves rawPath byte-identical for a nonexistent non-ASCII path (TGT-07 encoding)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The invalid-project screen replaces the whole routed tree — no navigation, search field, or tree renders — while branding (theme toggle) survives (D-14)"
    requirement: "TGT-07"
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#is mounted by app-router.tsx above AppShell, reusing the shared fetchPresentation fetcher (D-14)"
        status: pass
    human_judgment: true
    rationale: "The source-text contract proves ProjectGate renders no <Outlet/> on a failed load, which is structurally sufficient for D-14, but the actual absence of nav/search/tree in the rendered DOM and the ThemeToggle's visible placement are not asserted by a rendered-DOM or screenshot test in this v1 stack."
  - id: D3
    description: "One generic heading and visual treatment for every LoadStatus failure kind; the status-specific detail line is the server's own message, rendered verbatim (D-15)"
    requirement: "TGT-07"
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#renders exactly one generic heading for every failure kind, never a per-status heading (D-15)"
        status: pass
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#renders the server's own loadStatus.message verbatim, never re-deriving or re-wording it (D-15)"
        status: pass
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#reaches the failure state only through InvalidProjectScreen from dashboard-page.tsx (D-15)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The checked path renders in a copyable monospace field; when rawPath differs from pathChecked both values show under distinct labels (D-16)"
    requirement: "TGT-07"
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#shows the checked path in a copyable field, with distinct As typed / Resolved to labels when they differ (D-16)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A copyable example restart command is present; no in-app project picker, switcher, or retry control is added (D-17)"
    requirement: "TGT-07"
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#offers a copyable restart command and no in-app project switcher (D-17)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Copy-to-clipboard buttons swap to a checkmark on success and no-op silently on denied permission, mirroring copyHeadingUrl, on a screen with no React Query cache underneath it"
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#copies to the clipboard via a silent try/catch mirroring copyHeadingUrl, and raises no toast"
        status: pass
    human_judgment: true
    rationale: "The source-text contract proves the try/catch shape and the ~1.5s setTimeout icon-swap logic exist, but the actual visible checkmark swap and silent no-op on a denied clipboard permission are rendered-DOM/runtime behavior not covered by an automated screenshot or React Testing Library test in this v1 stack — this is the UI-SPEC's own flagged backstop row (loading/invalid-project-screen)."
    verification_ref: backstop
  - id: D7
    description: "No dangerouslySetInnerHTML is used anywhere in invalid-project-screen.tsx, so a crafted path can only ever render as literal text (T-04-02-01)"
    verification:
      - kind: unit
        ref: "test/web/invalid-project-contract.test.ts#never renders attacker-influenced path text through dangerouslySetInnerHTML (T-04-02-01)"
        status: pass
    human_judgment: false

duration: 76min
completed: 2026-09-04
status: complete
---

# Phase 4 Plan 2: Invalid-Project Screen Summary

**A single `InvalidProjectScreen` (D-14/D-15) with copyable `Path checked`/`As typed`/`Resolved to` fields and a restart command (D-16/D-17), gated in at the router level above `AppShell` so a failed `LoadStatus` structurally hides navigation, search, and the tree — proven by a 9-case source-text contract, two new `resolveTargetPath` edge cases, a dual live probe, and the full 503-test suite.**

## Performance

- **Duration:** 76 min
- **Started:** 2026-09-03T22:05:00Z (approx.)
- **Completed:** 2026-09-03T23:21:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- `InvalidProjectScreen` (`src/web/pages/invalid-project-screen.tsx`) — the one screen rendered for every non-ok `LoadStatus`, showing a single generic heading (`Project could not be loaded.`), the server's own `loadStatus.message` rendered verbatim, and no per-status literal anywhere in the file — the `path-not-found`-only `rawPath` field is read via a structural `'rawPath' in loadStatus` narrow instead of a status-string comparison.
- `CopyField` sub-component — D-16/D-17's copyable monospace fields (`Path checked` or `As typed`/`Resolved to`, plus `Restart with a corrected path` carrying `npm run dev -- /path/to/your/project`), reusing `copyHeadingUrl`'s exact `try { await navigator.clipboard.writeText(...) } catch { /* silent */ }` shape with a ~1.5s `Copy` → `Check` icon swap.
- `ProjectGate` in `app-router.tsx` — mounted as the router's root element in place of `<AppShell />`; runs `AppShell`'s own `['presentation']` query and imported `fetchPresentation` fetcher (no second request), and returns `InvalidProjectScreen` instead of `AppShell` on a failed load, so no `<Outlet />` renders and hiding nav/search/tree is structural.
- `dashboard-page.tsx`'s own `loadStatus` branch now defers to the same `InvalidProjectScreen`, so the state has exactly one visual design reached from either the router gate or a direct hit on the dashboard route.
- New `.invalid-project-screen`/`.invalid-project-panel`/`.copy-field*` CSS in `globals.css` — full-viewport centering with no shell chrome, a `--destructive`-accented panel, and `overflow-wrap: anywhere` on the copy-field value so a long path wraps instead of truncating.
- 9 new source-text contract cases in `test/web/invalid-project-contract.test.ts` plus 2 new `resolveTargetPath` edge cases (empty argument, non-ASCII `rawPath` byte-identity) in `test/target-path.test.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: The one failure screen, for all four statuses** - `3873ae9` (feat)
2. **Task 2: Gate the routed tree on a valid project** - `f5bb0dc` (feat)
3. **Task 3: Pin the failure surface and the two path edges** - `3613898` (test)

**Plan metadata:** commit to follow this SUMMARY.

## Files Created/Modified

- `src/web/pages/invalid-project-screen.tsx` — new: `InvalidProjectScreen`, `CopyField`, `RESTART_COMMAND`
- `src/web/app-router.tsx` — new `ProjectGate` component mounted as the root route element
- `src/web/pages/dashboard-page.tsx` — its `loadStatus` branch now returns `InvalidProjectScreen`
- `src/web/styles/globals.css` — `.invalid-project-screen`, `.invalid-project-panel`, `.invalid-project-theme-slot`, `.invalid-project-icon`, `.invalid-project-detail`, `.copy-field`/`.copy-field-label`/`.copy-field-row`/`.copy-field-value`/`.copy-field-button`
- `test/web/invalid-project-contract.test.ts` — new: 9 source-text contract cases
- `test/target-path.test.ts` — 2 new cases: empty-argument and non-ASCII `rawPath` edges

## Decisions Made

- Restart command corrected to `npm run dev -- /path/to/your/project`, not the UI-SPEC's placeholder `npx gsd-lore {path}` — confirmed `package.json` has no `bin` field, so `dev` is the only real invocation.
- The `rawPath`-differs-from-`pathChecked` branch narrows via `'rawPath' in loadStatus` inline in the JSX condition, not through a pre-computed boolean, both for correct TypeScript narrowing and so the component's source text never has to name a `LoadStatus` status-string literal (verified in Task 3's contract test).

## Deviations from Plan

None - plan executed exactly as written. The read_first-flagged `package.json` "confirm exact binary/entry name" correction was already anticipated in the plan's own Task 1 action text and applied as written, not as an unplanned deviation.

## Issues Encountered

- Writing the non-ASCII edge case for `test/target-path.test.ts` required building the composed (NFC) and decomposed (NFD) accented-character forms from explicit `\u` escape sequences rather than typing the raw multi-byte characters directly — several attempts at editing the file with literal Unicode glyphs produced editor/tool-level string-matching failures, which is itself a small illustration of the exact normalization hazard the test pins. Resolved by writing both forms from `é` / `é` code points and asserting `composed !== decomposed` before exercising `resolveTargetPath`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `InvalidProjectScreen` and the `CopyField` pattern are available for reuse if a future plan needs another copyable-field affordance.
- D2 and D6's rendered-DOM claims (nav/search/tree actually absent in the browser, the checkmark swap actually visible) are pinned at the source-text level but not by a screenshot; recommend a human click through both a missing-.planning/ directory and an absent path against a live `npm run dev` session before the phase closes, alongside 04-01's own recommended Refresh click-through.

---
*Phase: 04-portability-degradation-hardening*
*Completed: 2026-09-04*

## Self-Check: PASSED

All key files (`src/web/pages/invalid-project-screen.tsx`, `test/web/invalid-project-contract.test.ts`,
`src/web/app-router.tsx`, `src/web/pages/dashboard-page.tsx`, `src/web/styles/globals.css`,
`test/target-path.test.ts`) confirmed present on disk. All three task commits (`3873ae9`, `f5bb0dc`,
`3613898`) confirmed present in `git log`.
