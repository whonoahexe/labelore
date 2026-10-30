---
phase: 08-several-projects-and-a-switcher
plan: 11
subsystem: ui
tags: [switcher, header, popover, base-ui, multi-project, playwright]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "08-02 sketch 039 winner A (popover under the name trigger); 08-05 ProjectList variant=switcher with the current-row marker; 08-06 registry-served app and LABELORE_CONFIG_DIR; 08-08 slug-keyed AppShell naming its project from the list entry"
provides:
  - "ProjectSwitcher: the header project-name trigger and its non-modal popover list, laid out as sketch 039 A"
  - "ProjectSwitcherPanel: the Projects head, All projects link, switcher rows or the empty note, and the empty footer region 08-17 fills"
  - "startProjectsServer: a Labelore server on several paths with its own seeded settings directory and optional HOME, ports 5320-5329"
  - "switcher.spec.ts: switching, Escape focus return, per-open re-read, the 039 A layout contract at 1280px and 390px, 80-character name truncation"
  - "projectUrl(base, path, slug?): addresses a named project on a server that lists several"
affects: [08-13, 08-15, 08-17]

actuals:
  tokens: 12500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Popover content split from its Portal: the list is a separate exported component so a static render can hold it (Base UI renders portals only on the client)"
    - "A one-shot module flag carries 'focus the main content' across the keyed remount of the shell on a project switch"

key-files:
  created:
    - src/web/components/project-switcher.tsx
    - test/e2e/projects-server.ts
    - test/e2e/switcher.spec.ts
    - test/web/project-switcher-contract.test.ts
  modified:
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/navbar-contract.test.ts
    - test/web/shell-contract.test.ts
    - test/e2e/app-url.ts
    - test/e2e-app-url.test.ts

key-decisions:
  - "The brand area is a brand-lockup wrapper holding the mark-and-wordmark link and the switcher trigger as siblings (a link may not contain a button); two siblings cannot share one grid area without overlapping"
  - "The popup is placed under the header's bottom edge, not just under the trigger: the side offset is measured at open time from the header and trigger rects, so below 42rem it clears the tabs row"
  - "The trigger has a fixed minimum height (the brand mark's 36px, 40px below 42rem) so the popup anchored to it does not drift when the project's meta line arrives"
  - "Focus after choosing a row: Base UI finalFocus returns the main content landmark (tabindex -1 set on demand, so the shell markup pins stay unchanged); a module flag makes the switcher that mounts in the new project's shell focus it once"

patterns-established:
  - "Element selectors scoped under the popup class (header, div) instead of new class names for the head and the scroll region"

requirements-completed: [PLAT-02, PLAT-08]

commits: 2
plan_head_before: 04451998f251fdad0caa8851c90613f6ed2df664
plan_head_after: fbfa417ea1b96152bbc5eca946d2f1e13a3eaa55

duration: 40min
completed: 2026-10-30
status: complete
---

# Phase 8 Plan 11: Header project switcher Summary

**The header's project name is now a Base UI popover trigger (sketch 039 A) that re-reads the project list every time it opens, marks the current project, lands on /{slug} when a row is chosen with focus moved to the main content, and holds the 039 layout contract at 1280px and 390px, proven in Chromium.**

## Performance

- **Duration:** about 40 min (2026-10-30)
- **Tasks:** 2 of 2 (tracer: switch from the header in Chromium; every state and the layout contract)
- **Files:** 4 created, 7 modified

## Accomplishments

- `ProjectSwitcher` renders a button with `aria-label` "Switch project. Current project: {name}", `aria-haspopup="dialog"`, `aria-expanded`, the full target as `title`, the name over the meta line and a 16px chevrons icon. It opens a non-modal popover labelled "Projects".
- The popup holds the "Projects" label with an "All projects" link to `/`, one `ProjectRow` (switcher variant) per project in the server's order with the current row marked (accent rule, check, sr-only "Current", `aria-current`), and an empty `project-switcher-footer` region for 08-17's "Add or scan…" entry. The list query (`fetchProjects`, `staleTime: 0`) lives in the panel, so it is observed and refetched only while the list is open and never loads a project.
- Choosing a row (or "All projects") closes the popup at once. Another project's row navigates to `/{slug}` and the switcher that mounts in that project's shell focuses the main content; Escape returns focus to the trigger.
- Empty list shows "No projects yet." above the footer; a one-project list shows one marked row.
- `app-shell.tsx` splits the brand: the link keeps mark, wordmark and separator (aria-label "Labelore — {name}" and title unchanged) and the switcher sits beside it inside `brand-lockup`.
- CSS: trigger (neutral, hover and expanded states), positioner layer, popup (448px or viewport less 32px wide, min(448px, 70vh) tall, list scrolls inside while head and footer stay), below 42rem the popup spans the viewport width with no side borders and the trigger is at least 40px tall, reduced-motion rule, both themes through tokens.
- `startProjectsServer` and `switcher.spec.ts` (6 tests). A static contract test (12 tests) holds the trigger, the empty, one and many lists, text-only rendering of hostile names, and the "not inside the brand link" source pin.

## Task Commits

1. **Task 1: Switch project from the header in Chromium (tracer)** - `65c8495` (feat)
2. **Task 2: Every switcher state and the 039 layout contract** - `fbfa417` (feat)

## Verification

- `vitest run test/web`: all pass except the 3 known pre-existing corpus-guard failures (08-PATTERNS.md and 08-UI-SPEC.md pins). The full `vitest run` additionally showed `growth.test.ts` failing once under load; it passes alone (known load-sensitive flake).
- `npm run test:e2e -- test/e2e/switcher.spec.ts`: 6 passed (the official config, all four servers started).
- `npm run typecheck` and `npm run lint`: exit 0.
- `npm run test:gate` could not be used verbatim in the worktree (the gate spawns `<worktree>/node_modules/.bin/vitest`, and the worktree has no node_modules by design); `vitest run` was run directly from the main checkout's binary instead, which is what the gate wraps.
- Class vocabulary: `test/web/class-vocabulary.test.ts` passes with the five new rows in docs/design-language.md.

## Decisions Made

See key-decisions. Plan wording the build departed from, with reason:

- The plan lists the popup as having "padding --space-4". The 039 winner has no padding on the popup itself: the head, the rows and the empty note carry the 16px inline padding so rows run edge to edge and the current row's 2px rule sits on the popup's left edge. The 16px is applied there.
- The empty-note is rendered as a `div.empty-note` as the plan states; loading and unreachable states reuse `empty-note` with the UI-SPEC server-unreachable copy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The browser-spec URL contract rejects several-project addresses**
- **Found during:** Task 2 (full `vitest run`)
- **Issue:** `test/e2e-url-contract.test.ts` requires every `page.goto` argument to be an `await projectUrl(...)`/`artifactUrl(...)`, but `projectUrl` resolves the slug by asking the server for its single listed project and throws for a server with several, which is exactly what the switcher spec needs.
- **Fix:** `projectUrl(base, projectRelative, slug?)` takes an optional slug that skips the single-project lookup (additive, existing callers unchanged); `switcher.spec.ts` navigates through `await projectUrl(base, '/', slug)`; one new case in `test/e2e-app-url.test.ts`. The scan itself was not touched or weakened.
- **Files modified:** test/e2e/app-url.ts, test/e2e-app-url.test.ts, test/e2e/switcher.spec.ts
- **Commit:** fbfa417

**2. [Rule 1 - Bug] Popup moved 8px after opening**
- **Found during:** Task 2 (layout-contract spec)
- **Issue:** The trigger was 20px tall until the project's meta line arrived, then 36px; the popup, anchored to the trigger with a side offset measured at open time, drifted down by the difference.
- **Fix:** a minimum height on the trigger (the brand mark's 36px) so its box does not change when the meta line lands.
- **Files modified:** src/web/styles/globals.css
- **Commit:** fbfa417

**3. [Rule 3 - Blocking] Real-path guard flagged made-up paths**
- **Found during:** Task 2 (`test/no-skips.test.ts`)
- **Issue:** the contract test's fake entries used `/home/you/Work/...` and `~/Work/...`, which the guard treats as real paths.
- **Fix:** entries use `/srv/made-up/{slug}`.
- **Files modified:** test/web/project-switcher-contract.test.ts
- **Commit:** fbfa417

**4. [Rule 2 - Missing] Fourth and fifth documented names**
- The plan named three classes. The split brand needs a wrapper (`brand-lockup`) and the Base UI positioner needs a layer class (`project-switcher-positioner`); both are documented in docs/design-language.md, as the plan allows ("No new wrapper class unless it is documented"). The popup head and scroll region use element selectors under `.project-switcher-popup` instead of new classes.

**Total deviations:** 4 (2 blocking, 1 bug, 1 missing-critical). **Impact:** none on scope; the `projectUrl` change is the only edit outside the plan's file list and is additive.

## Issues Encountered

- **Narrow header (observation, not fixed):** at 390px the existing header row (drawer trigger, brand, snapshot pill, search, theme toggle) leaves the brand column about 40px, so the trigger shows little more than its chevron; the name is still reachable through the trigger's accessible name, its title and the popup. The row-one controls belong to the shell header and the snapshot pill is 08-09's file; 08-15's paired screenshots will show it. A follow-up could drop the pill label below 42rem.
- Playwright's `npm run test:e2e` builds `./dist` in the worktree (gitignored) and leaves `test-results/` (gitignored); neither is committed.

## Known Stubs

- `div.project-switcher-footer` is intentionally empty (hidden by `:empty`) until 08-17 places "Add or scan…" in it. Not a stub for this plan's goal: the plan names the footer region as the hook.

## Threat Flags

None. No new endpoint, auth path or file access: the switcher reads `GET /api/projects` through the existing `fetchProjects`, and every value is a React text node or prop (T-08-40); links go through `AppLink` (T-08-41).

## Next Phase Readiness

- 08-17 can add its "Add or scan…" button inside `.project-switcher-footer` (the popup closes only on link clicks, so a button there keeps it open) and its forget button inside `.project-row` with `position: relative` and a z-index above the stretched name link.
- 08-13 and 08-17 extend `switcher.spec.ts` and reuse `startProjectsServer` (settings seeding and HOME override are in place); several-project addresses go through `projectUrl(base, path, slug)`.
- 08-15 can assert the visual pairs against the built switcher; layout-contract facts 1 to 3 and 6 are already asserted here, facts 4 and 5 wait for 08-17's controls.

## Self-Check: PASSED

- FOUND: src/web/components/project-switcher.tsx, test/e2e/projects-server.ts, test/e2e/switcher.spec.ts, test/web/project-switcher-contract.test.ts
- FOUND: commit 65c8495 and fbfa417 reachable from HEAD
- `git grep -n "<ProjectSwitcher" -- src/web/components/app-shell.tsx` prints one line; `grep '^| `project-switcher-popup` |' docs/design-language.md` prints one line; `git grep -n "No projects yet." -- src/web/components/project-switcher.tsx` prints one line; `git grep -n -F "calc(var(--space-28) * 4), 70vh" -- src/web/styles/globals.css` prints the max-height rule
