---
phase: 08-several-projects-and-a-switcher
plan: 07
subsystem: api
tags: [folder-scan, hono, containment, symlinks, registry]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: "ProjectRegistry add path and home option (08-01, 08-16), the request guard and route-enumeration refusal test (08-03), the settings-backed list (08-04)"
provides:
  - "POST /api/projects/scan: GSD projects found under a folder inside $HOME, two levels down"
  - "POST /api/projects/add-many: remember up to 100 picked projects through the add path without loading them"
  - "listChildEntries (read-only directory listing) and the exported expandTilde"
  - "folder-scan.ts: resolveScanFolder, scanForProjects, SCAN_* limits and messages"
affects: [08-13 landing page scan checklist, UI-SPEC copy table]

actuals:
  tokens: 11800
  tasks: 2
  commits: 2
plan_head_before: e6124663c429b50487ff5b037bd9c4f7e7618175
plan_head_after: 01e2b0120d74bb9f8eccbc63089d685dcdfbe856

tech-stack:
  added: []
  patterns:
    - "Scan walks only through an injected listing function; folder-scan.ts imports no filesystem module"
    - "Containment checked twice: by text before any disk call, by real path after"
    - "Async growth-ratio measurement with the caps lifted (caps are not growth)"

key-files:
  created:
    - src/server/folder-scan.ts
    - test/server/folder-scan.test.ts
  modified:
    - src/planning-fs/local-fs.ts
    - src/cli/target-path.ts
    - src/server/project-registry.ts
    - src/server/registry-api.ts
    - test/portability.test.ts
    - test/target-path.test.ts

key-decisions:
  - "A hit is counted before the cap check, so capped is true only when a 101st project exists; exactly 100 projects is not capped (same for exactly 5,000 folders and the valve)"
  - "add-many reads up to 256 KB while every other /api route keeps the 4 KB guard limit"
  - "The portability read-side import check now covers node:fs/promises named imports too, with readdir allowed"

patterns-established:
  - "Per-path body limit: two pre-built bodyLimit middlewares picked by request path inside one app.use"

requirements-completed: [PLAT-05, SEC-05]

duration: 25min
completed: 2026-10-30
status: complete
---

# Phase 8 Plan 07: Folder Scan and Bulk Add Summary

**A guarded POST scan that lists GSD projects under a folder inside $HOME (depth 2, never through a symlink, 100 results / 5,000 folders) and a bulk add that remembers the picked ones unloaded.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2 (1 tracer, 1 auto)
- **Files:** 8 (2 created, 6 modified)

## Accomplishments

- `listChildEntries` in local-fs.ts: a read-only `readdir` with types from the Dirent, so a symlink is a symlink and never a directory; any error is null. `readdir` joins the read-side import allowlist.
- `expandTilde(raw, home = homedir())` exported from target-path.ts and reused by the scan (one tilde parser).
- `folder-scan.ts`: `resolveScanFolder` refuses a folder outside home by its text before any disk call, then re-checks the canonical path (symlink escape), then missing / file / unreadable / empty messages; `scanForProjects` is a breadth-first walk over an injected listing with the depth, skip, result-cap and valve rules.
- `registry.scan` and `registry.addMany`; `POST /api/projects/scan` (200 or 422, 400 for a non-string folder) and `POST /api/projects/add-many` (400 for more than 100 or non-string targets), both before the `:slug` mount. 08-03's route-enumeration test covers both without edits.
- Tracer proof over a synthetic home: four projects in path order, two added unloaded as `portal` and `portal-2`, `createSource` never called, second scan marks both `alreadyAdded`.

## Task Commits

1. **Task 1 (tracer): scan a synthetic home over the API** - `ab4fd0c`
2. **Task 2: containment, depth and caps** - `01e2b01`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] add-many could not carry 100 real paths through the 4 KB guard body limit**
- **Found during:** Task 2 (the 101-target test answered 413, not 400)
- **Issue:** the guard's `GUARD_BODY_LIMIT` is 4096 bytes; 100 project paths of ordinary length are about 6 KB, so the landing page's "add all picked" would have been refused with 413.
- **Fix:** registry-api.ts picks a per-path limiter: 256 KB for `/api/projects/add-many`, the guard limit for everything else. A test proves a 100-target body above 4 KB is read, a 300 KB body is 413, and scan keeps the 4 KB limit.
- **Files modified:** src/server/registry-api.ts, test/server/folder-scan.test.ts
- **Commit:** 01e2b01

**2. [Rule 3 - Blocking] test/no-skips.test.ts forbids the literal `~/Work` in tests**
- **Found during:** full-suite run before the Task 2 commit
- **Issue:** the plan's synthetic tree is named `Work` and addressed as `~/Work`; the no-skips real-path guard flags that string.
- **Fix:** the synthetic folder is named `Code` (`~/Code/...`) in test/server/folder-scan.test.ts and test/target-path.test.ts. No behaviour differs.
- **Commit:** 01e2b01

**3. [Rule 1 - Test fidelity] growth test uses 8n, not 4n, and an async local measurer**
- **Issue:** GROWTH_LIMIT = 24 is calibrated for an 8x step (linear 8, quadratic 64); a 4x step would read 16 for a quadratic walk and pass vacuously. `measureGrowth` takes a synchronous `run`, and the walk is async.
- **Fix:** a small async measurer in folder-scan.test.ts (same idiom: best of reps, lowest of up to three attempts, n and 8n) with the result cap and valve lifted, since caps are not growth. Shared helper files untouched.
- **Commit:** 01e2b01

**4. [Rule 3 - Blocking] portability read-side check only matched `from 'node:fs'`**
- **Fix:** the check collects named imports from `node:fs` and `node:fs/promises`, so `readdir` is held to the same allowlist.
- **Commit:** ab4fd0c

**Total deviations:** 4 auto-fixed (2 bug/fidelity, 2 blocking). **Impact:** none on scope; the body-limit fix was needed for the feature to work with real input.

## Issues Encountered

- The worktree has no node_modules, so `npm run test:gate` (which resolves vitest under the repo root) could not run; the same test files were run with the main checkout's `vitest run` directly (all pass, none skipped), plus `tsc` for both tsconfigs and `eslint .` (all clean).
- Full suite: 4 failures, all pre-existing and out of scope: the 3 corpus-guard tests for 08-PATTERNS.md / 08-UI-SPEC.md in test/web/pattern-map-corpus.test.ts and test/web/ui-spec-corpus.test.ts (4 assertions across them). test/no-skips.test.ts failed only on my first draft and passes now.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register: T-08-23 to T-08-26 are mitigated as planned (POST behind the guard, containment before and after real path, symlinks never followed, depth/cap/valve, 100 string targets with a 256 KB body bound).

## Next Phase Readiness

08-13 can call both routes. The new copy (missing, not a folder, unreadable, empty, "Choose up to 100 projects to add.") still needs recording in the UI-SPEC copy table by 08-13.

## Self-Check: PASSED

- src/server/folder-scan.ts, test/server/folder-scan.test.ts: FOUND
- ab4fd0c, 01e2b01: FOUND in HEAD history
- `git grep "export async function listChildEntries"`, `"export function expandTilde"`, `app.post('/api/projects/scan'`, `SCAN_DIRECTORY_VALVE = 5000`: each one line
