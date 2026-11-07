---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 32
subsystem: web
tags: [workstreams, scope-chip, drawer, e2e, sketch-056-c]

requires:
  - phase: 11-29
    provides: "ArtifactDto.realPath on scoped presentations; GET {project api}/workstreams (the inventory)"
  - phase: 11-30
    provides: "useProjectScope, UnscopedLink, projectKey(slug, scope, ...)"
  - phase: 11-31
    provides: "workstreamScopeUrl, toneOf and the index's '{n} workstreams' header count"
provides:
  - "ScopeChip and ScopeChipPanel (src/web/components/scope-chip.tsx): the header chip beside the project switcher inside a workstream, its popover of every workstream and 'All workstreams'"
  - "buildScopeChipModel, ScopeChipRow, SCOPE_ALL_LABEL (src/presentation/workstream-index.ts): every row and status line of the chip, pure"
  - "DrawerViewModel.scopeGroups {name, shared, own} (absent on a flat project) and buildDrawerViewModel(presentation, scope?)"
  - "The drawer's 'Shared · project' and 'ws: {name}' groups in planning-places.tsx; FileRow takes an unscoped flag"
  - "test/e2e/workstreams.spec.ts: the flat-unchanged and the Brinkwater workstream-flow browser checks"
affects: []

actuals:
  tokens: 52000
  tasks: 3
  commits: 3
plan_head_before: f1f4e92ed35a8b832585e68f17b0b70b4b5cbe40
plan_head_after: 886e55465e1aa5e974c1d075134587ea2754d8de

tech-stack:
  added: []
  patterns:
    - "The chip reads the project's own inventory from inside a scope under projectKey(slug, scope, 'workstreams'); the key carries the scope, the fetch does not (the inventory route answers flat inside a scope)"
    - "The drawer's groups are split on realPath, not on the URL: under .planning/workstreams/{name}/ is the workstream's own, any other root file or shared folder file is Shared"
    - "A flat project's model is protected by committed captures taken before the change (test/presentation/captures), compared with JSON deep-equality, plus 'scopeGroups' in model === false"

key-files:
  created:
    - src/web/components/scope-chip.tsx
    - test/web/scope-chip.test.ts
    - test/e2e/workstreams.spec.ts
    - test/helpers/drawer-capture.ts
    - test/presentation/captures/drawer-lendshed.json
    - test/presentation/captures/drawer-shapes.json
  modified:
    - src/presentation/workstream-index.ts
    - src/presentation/drawer.ts
    - src/server/project-api.ts
    - src/web/components/app-shell.tsx
    - src/web/components/planning-places.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/presentation/drawer.test.ts

key-decisions:
  - "The chip's model lives in workstream-index.ts beside the index's (it reuses toneOf and workstreamScopeUrl), and ScopeChipPanel is exported so a static render can show the popup (Base UI mounts a portal only on the client), the project switcher's own pattern"
  - "On a narrow screen (42rem and under) the chip drops under the project switcher inside the brand lockup instead of beside it: beside the controls there is room for the name or the chip, never both, and the project name is what the narrow header must keep"
  - "Shared rows are files, one per file (PROJECT.md, config.json, codebase/STACK.md, todos/...), not folder names; archived workstream folders under milestones/ are left out (the index's Completed bar lists them); the ws group lists one row per phase folder linking to that phase, not a bare 'phases/'"
  - "buildDrawerViewModel takes the scope name from the server (runtime.scope.name) and falls back to the artifacts' realPath, so a scope whose workstream folder holds no files still gets its groups"
  - "The chip's row name is set at --fs-4 (not --fs-3): the phase-11-workstreams block is pinned by 11-31's contract to five sizes, and the chip lives in that block as the plan says"

requirements-completed: [VIEW-20]
status: complete
---

# Phase 11 Plan 32: Scope chip, drawer and workstreams e2e Summary

**Inside a workstream the header now carries a "ws: {name}" chip that lists every workstream and switches between them or back to the index, the drawer shows "Shared · project" above "ws: {name}" split on each file's real path, and a real-browser spec proves both the Brinkwater flow and that a flat project is untouched.**

## Performance

- **Tasks:** 3 of 3 (Task 1 tracer: the chip; Task 2: the drawer groups; Task 3: the browser spec and the side-by-side)
- **Commits:** `564944c` (Task 1), `ae82d45` (Task 2), `886e554` (Task 3)
- **Gate:** full unit gate 7117 of 7117, 0 failed, 0 skipped, 0 todo; typecheck, lint, build clean; `test/e2e/workstreams.spec.ts` 2 passed (13s, the only spec run)

## Accomplishments

- `ScopeChip`: a Base UI Popover modelled on the project switcher. The trigger is a button named "Workstream: {name}" with `aria-haspopup` and `aria-expanded`, reading "ws: {name}" with a chevron, ruled with `--foreground` (never accent). The popup lists each workstream as a real link (status square in the index's tones, name, the outlined Active mark only when the pointer names it, "Phase {N} · {status}" or "Not started · no roadmap"), a rule, then "All workstreams"; the open workstream is `aria-current="page"`; Escape returns focus to the trigger. Rows go through `UnscopedLink` so a row never double-prefixes the scope.
- `AppShell` renders the chip beside the project switcher only when a scope is open; the index keeps its "{n} workstreams" count (11-31) and has no chip; a flat project has neither.
- `scopeGroups` on the drawer model: Shared (PROJECT.md, config.json, codebase/, research/, todos/, non-archive milestones/ files, linked at project-level addresses through `UnscopedLink`) above the workstream's own (ROADMAP.md, STATE.md, REQUIREMENTS.md, one row per phase folder, then its own config.json). The Shared rows are never marked active (they leave the scope).
- Flat projects: the Lendshed and Shapes drawer models deep-equal captures committed from the code before this change, and have no `scopeGroups` key at all.
- design-language.md: twelve `scope-chip*` rows in "Shell and navigation".

## Side-by-side with sketch 056 C (Task 3)

Shot Brinkwater `/workstreams/intake/` and `/workstreams/notices/` with the chip open, and the drawer open on intake, at 1280 and 390, light and dark (16 images from an ad-hoc isolated server, plus the 12-image `shoot-pages --sketch` run with no FAIL line), viewed beside the 056 C inside screen.

- **Matches the layout contract:** the chip beside the project switcher as a second level (mono Label-size, foreground rule, muted "ws:"), the popover (head, status square, name, Active mark, status line, rule, All workstreams), the drawer's Shared group above the workstream's own with a dashed rule between, file names in mono.
- **What changed after the side-by-side:** at 390px the first build put the chip beside the project switcher and squeezed the project name out of the header (then pushed the chip over the controls). The chip now drops under the project switcher at 42rem and under, keeping the name and a full 40px chip (`.brand-lockup:has(.scope-chip)`). The chip's row name was also moved from `--fs-3` to `--fs-4` when the full gate showed 11-31's five-size pin on the shared CSS block (below).
- **Differences from the sketch that stay on purpose:** the sketch's drawer lists folder names (milestones/, research/, phases/ (5)); the build lists the files and one row per phase folder, because the plan says shared files link to their project addresses. The sketch popover did not open under automation (its own toggle), so the popover was compared by its code and README description; the real popover was checked at both widths and both themes.
- The `systemctl --user restart labelore` step was NOT run in any task: the service serves the main checkout, not this worktree. The orchestrator should rebuild and restart after merging.

## Task Commits

1. **Task 1 (tracer): the scope chip switches between workstreams and the index** - `564944c`
2. **Task 2: the drawer's Shared group above the workstream's own files** - `ae82d45`
3. **Task 3: workstreams and a flat project in a real browser** - `886e554`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The chip squeezed the project name out of the 390px header**
- **Found during:** Task 1 screenshots
- **Fix:** below 42rem the chip sits under the project switcher in the brand lockup (CSS only). **Commit:** `564944c`

**2. [Rule 3 - Blocking] 11-31's five-size pin covers the whole phase-11-workstreams block**
- **Found during:** Task 2 full gate (the Task 1 gate list did not include `test/web/project-layout.test.ts`)
- **Issue:** the chip's row name used `--fs-3`; the index's view contract allows only five sizes in the block the plan told me to put the CSS in.
- **Fix:** the row name is `--fs-4`; the block comment names Label and Body. **Commit:** `ae82d45`

**3. [Rule 1 - Plan wording] "the five header links" on Shapes**
- **Issue:** Shapes' header has three links (Dashboard, Roadmap, Traceability); Research and Sketches appear only for a project with research files or sketches, which Shapes has not. Five is the maximum, not Shapes' count.
- **Fix:** the flat test pins Shapes' actual three, in order. **Commit:** `886e554`

**4. Files beyond the plan's list:** `src/presentation/workstream-index.ts` (the chip model), `src/server/project-api.ts` (passes `runtime.scope?.name` to the drawer builder), `test/helpers/drawer-capture.ts` and `test/presentation/captures/*.json` (the pre-change captures the plan's flat-drawer prohibition needs).

## Known Stubs

None.

## Known Limitations

- The chip fetches the inventory on every scoped page (one small request, cached under the scope-keyed key); a failed request leaves the chip with its name and only "All workstreams" in the list.
- The drawer's Shared group lists every file of the shared folders (all todos, all research notes); a project with many would get a long group. The index's chips stay folder-level.
- A workstream name is uppercased in the drawer's group label by the shared label style ("WS: INTAKE"); the text itself, and the chip, keep the name's case.

## Threat Flags

None beyond the plan's register: T-11-49 (names, statuses and phase words are React text only; tested with a hostile name through the trigger and the panel), T-11-50 (shared rows link to payload keys through `UnscopedLink`; no URL is built from file text; the test pins that no Shared address contains `/workstreams/`), T-11-SC (no package installed).

## Self-Check: PASSED

- Commits `564944c`, `ae82d45` and `886e554` are ancestors of HEAD.
- Created files exist: scope-chip.tsx, scope-chip.test.ts, workstreams.spec.ts, drawer-capture.ts and the two captures.
- Acceptance greps: `scope-chip` in design-language.md >= 1; `aria-haspopup` in scope-chip.tsx >= 1; `ScopeChip` in app-shell.tsx >= 1; `Shared · project` in planning-places.tsx >= 1; `realPath` in drawer.ts >= 1; workstreams.spec.ts has exactly two tests and imports from app-url.ts.
