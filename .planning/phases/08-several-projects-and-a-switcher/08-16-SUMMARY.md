---
phase: 08-several-projects-and-a-switcher
plan: 16
subsystem: server-registry
tags: [registry, settings-store, hono, slugs, project-title, sec-05]
requires:
  - phase: 08-01
    provides: ProjectRegistry, allocateSlug, slugOf, orderProjects
  - phase: 08-03
    provides: request guard and body limit registered first in the registry app, guardedRequest
  - phase: 08-04
    provides: SettingsStore (FileSettingsStore, MemorySettingsStore), settings-model updates and notice copy
provides:
  - "ProjectRegistry over a SettingsStore: add, forget, open, registerCliTargets, identityOfTarget, settings-inside refusal"
  - "list() with PROJECT.md titles, last-opened order and store/save-failure notices"
  - "POST /api/projects, DELETE /api/projects/:slug, POST /api/projects/:slug/open"
  - "readProjectTitle(): cheap PROJECT.md title read through readHead"
  - "settings-disjoint.test.ts: the settings file never lands in a target, targets stay byte-identical"
affects: [08-06, 08-05]
actuals:
  tokens: 17000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "slug allocated inside store.mutate against the latest file plus every slug in use"
    - "no await between the duplicate check and entry creation, so concurrent adds of one target fold to one entry"
    - "an entry that must never load carries a blocked flag and gets a failedSource instead of createSource"
key-files:
  created:
    - src/server/project-title.ts
    - test/server/settings-disjoint.test.ts
  modified:
    - src/server/project-registry.ts
    - src/server/registry-api.ts
    - test/server/project-registry.test.ts
    - test/server/registry-api.test.ts
key-decisions:
  - "identityOfTarget is exported and used for addEntry's duplicate check; 08-06 should construct FileSettingsStore with it so the file is also de-duplicated by ssh identity on read"
  - "A settings-inside entry reuses FailedLoadStatus status 'not-a-gsd-project' with the settings-inside message, so no new status union member ripples into the web"
  - "register() entries (08-01) are memory only (persisted false); forget/open on them skip the store"
  - "A re-added project gets its old slug back from an in-memory forgotten map (this run only); it is not persisted across restarts"
  - "Name hints are persisted for every saved entry on a successful load (spec wording), used for ssh rows only"
requirements-completed: [PLAT-06, PLAT-07, PLAT-08, SEC-05]
coverage:
  - id: D1
    description: "A project added with POST /api/projects or on the command line is listed again, with the same slug, by a new registry over the same settings directory"
    requirement: PLAT-06
    verification:
      - kind: unit
        ref: "test/server/project-registry.test.ts#(h) a project added through the registry is remembered"
        status: pass
      - kind: integration
        ref: "test/server/registry-api.test.ts#POST /api/projects"
        status: pass
    human_judgment: false
  - id: D2
    description: "POST /api/projects validates once: 422 with the server message and path checked, 201 new, 200 duplicate, ssh syntax only, password refused with settings.json unchanged, concurrent posts fold to one entry"
    requirement: PLAT-07
    verification:
      - kind: integration
        ref: "test/server/registry-api.test.ts#POST /api/projects"
        status: pass
    human_judgment: false
  - id: D3
    description: "Forget edits settings.json only; open stamps one entry; CLI paths that fail are session-only; order is last opened first with unavailable entries kept in place; rows named from PROJECT.md"
    requirement: PLAT-08
    verification:
      - kind: unit
        ref: "test/server/project-registry.test.ts#(i), (j), (k)"
        status: pass
      - kind: integration
        ref: "test/server/registry-api.test.ts#DELETE /api/projects/:slug, POST /api/projects/:slug/open"
        status: pass
    human_judgment: false
  - id: D4
    description: "The settings file can never be written inside a target; a full add, load, refresh, open and forget cycle leaves the target byte-identical"
    requirement: SEC-05
    verification:
      - kind: unit
        ref: "test/server/settings-disjoint.test.ts"
        status: pass
    human_judgment: false
duration: ~35 min
completed: 2026-10-30
status: complete
commits: 3
plan_head_before: 8b8228ecc90b77e5d125f981ac7f751ef638e93f
plan_head_after: 7311fd38dce4f7c4935ee6c63e89c9b014931f77
---

# Phase 8 Plan 16: Remembered project list Summary

The project registry now remembers its list in Labelore's own settings.json through the 08-04 store (slugs allocated inside `store.mutate`), with add, forget, open stamps, CLI remembering, PROJECT.md row titles and last-opened order behind three guarded write routes, plus a refusal and a byte-identical-tree proof that the settings file can never land inside a target project.

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 of 3
- **Files:** 2 created, 4 modified

## Accomplishments

- `ProjectRegistry` takes `store` (default `MemorySettingsStore`) and `settingsDir` (default the folder of `store.location()`); the constructor restores one unloaded entry per saved project, using slugs as written and carrying the store's read notices. `list()` returns those plus this run's save-failure notices.
- `add()` validates input, parses once (`parseRemoteTarget`, then `resolveTargetPath`), refuses a target holding the settings folder, then allocates the slug in `store.mutate`; a failed write keeps the entry and adds `saveFailedNotice`. There is no await between the duplicate check and entry creation, so simultaneous adds fold.
- `registerCliTargets`, `forget` (disposes the runtime, entry stays on a failed write), `open` (stamps lastOpened and lastActive for one entry, starts the load unawaited, retries a failed one).
- `list()` names local rows from `readProjectTitle` (16384-byte `readHead`, memoised with the 10 s window), ssh rows from the saved hint; name hints are saved after a successful load.
- Routes `POST /api/projects`, `DELETE /api/projects/:slug`, `POST /api/projects/:slug/open` are registered before the `:slug` mount; 08-03's route-enumeration refusal test covers them without edits.

## Task Commits

1. **Task 1 (tracer): A project added over the API survives a restart with the same slug** - `364ec42` (feat)
2. **Task 2: CLI paths, forget, open stamps, order and PROJECT.md titles** - `50b15a9` (test)
3. **Task 3: settings can never land in a project; byte-identical targets** - `7311fd3` (test)

## Decisions Made

See key-decisions above. Notable: `identityOfTarget` must be handed to `FileSettingsStore` by the startup wiring (08-06) so reads de-duplicate by ssh identity; if it is not, the registry still folds a differently spelled duplicate and adds a "repeats another saved project" notice.

## Deviations from Plan

**1. [Task boundary] Task 1's commit carries the source for Tasks 2 and 3**
- **Found during:** Task 1
- **Issue:** `registry`, `registry-api` and `project-title` were written as one coherent unit (the registry imports `project-title.ts`; forget/open/CLI/blocked-entry share the same entry model), so the typecheck-clean Task 1 commit already contains the Task 2 and Task 3 source. Tasks 2 and 3 are test commits that prove those paths.
- **Impact:** None on behavior; commit history is coarser than the plan's per-task source split.
- **Commits:** 364ec42, 50b15a9, 7311fd3

**2. [Interpretation] "a store outside T" in Task 3 case (1)**
- The plan's case (1) says a hand-written settings.json "in a store outside T" lists T unavailable. A store outside T has a settings folder outside T, so nothing would be inside. The test hand-writes the file in a store whose folder is inside T, and separately proves the `settingsDir` option against an outside store.

**3. [Rule 3 - Tooling] `npm run test:gate` could not be run as written**
- The worktree has no node_modules, so the gate binary cannot resolve vitest. The same files were run with `/home/user/labelore/node_modules/.bin/vitest run` (no skipped, todo or failed tests), `tsc --noEmit` for both tsconfigs, and `eslint .`: all clean. Full `vitest run`: 4631 passed, 3 failed (the known pre-existing corpus guards for 08-PATTERNS.md and 08-UI-SPEC.md).

**Total deviations:** 3 (1 history granularity, 1 interpretation, 1 tooling). **Impact:** none on behavior.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The new endpoints and the settings write are exactly T-08-10, T-08-13 and T-08-14 of the plan's register.

## Next Phase Readiness

- 08-06 should build `new FileSettingsStore(defaultSettingsDir(), identityOfTarget)`, pass it as `store` to `ProjectRegistry`, and call `registerCliTargets` with the CLI arguments.
- A forgotten project gets its old slug back only within one server run; across a restart the slug is allocated afresh.

## Self-Check: PASSED

- src/server/project-title.ts, test/server/settings-disjoint.test.ts: found
- src/server/project-registry.ts, src/server/registry-api.ts: modified and committed
- commits 364ec42, 50b15a9, 7311fd3: found in history
