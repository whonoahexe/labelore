---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 29
subsystem: server
tags: [workstreams, scope-adapter, planning-fs, api-mount, inventory, real-path]

requires:
  - phase: 11-28
    provides: "Scope decision: adapter; realPath shown for copy-path and file facts; Brinkwater ledger, notices and archive"
  - phase: 11-27
    provides: "test/fixtures/brinkwater with the intake workstream"
  - phase: 11-01
    provides: "C7 (active pointer is a validated hint) and C12 (Completed bar) adopted"
provides:
  - "ScopedPlanningFilesystem(parent, name): a read-only port adapter presenting .planning/workstreams/{name}/ as the scope's .planning/, with realPathOf"
  - "ProjectRuntime.workstreamRuntime(name) and workstreamInventory(): scoped runtimes created lazily for listed folders only, dropped and rebuilt on parent refresh, disposed with the parent"
  - "createProjectApi mounted at /api/projects/:slug/ws/:name and /api/ws/:name (404 for any name not in the listing)"
  - "GET {project api}/workstreams: the workstream inventory (mode, entries, active pointer, completed, midMigration)"
  - "ArtifactDto.realPath and /documents artifact.realPath, scoped runtimes only"
affects: [11-30, 11-31, 11-32]

actuals:
  tokens: 18000
  tasks: 3
  commits: 3
plan_head_before: 5f4ff2c048f8fe46af3927ecc2917f83a1fb8022
plan_head_after: 2426471dd4f7f6700aea0341842a8bd8bed1d93e

tech-stack:
  added: []
  patterns:
    - "A scope is a PlanningFilesystem wrapper: discovery, assembly, handlers, PhaseIdentity and goldens are unchanged"
    - "A name from a URL or a file is a path segment only after the grammar check AND an exact match against the listing"

key-files:
  created:
    - src/planning-fs/scoped-fs.ts
    - src/server/workstreams.ts
    - test/scoped-fs.test.ts
    - test/server/workstreams.test.ts
    - test/server/workstream-api.test.ts
  modified:
    - src/server/project-runtime.ts
    - src/server/project-api.ts
    - src/server/project-presentation.ts
    - src/server/registry-api.ts
    - src/server/index.ts
    - src/server/project-registry.ts

key-decisions:
  - "realPathOf is exact for any path the adapter has listed or read (it records where each came from) and otherwise follows the static rule (moved name -> workstream folder, else root); it is synchronous so the presentation builder stays synchronous"
  - "A workstream-scoped runtime's fileDates map to the real path, so a scoped document's Planned date comes from git for the file on disk"
  - "Eviction asks runtime.isBusy(), which also covers the runtime's workstream children, so a parent is never evicted under a scoped request"

requirements-completed: [VIEW-20]
status: complete
---

# Phase 11 Plan 29: Workstream scopes on the server Summary

**Each workstream of a workstream project is now served as its own scope: a read-only `ScopedPlanningFilesystem` under an unmodified repository and runtime, mounted a second time at `/ws/:name`, with an inventory endpoint and real paths for display; flat projects answer exactly what they did.**

## Performance

- **Tasks:** 3 of 3
- **Files:** 5 created, 6 modified (all under `src/server`, `src/planning-fs`, `test`)
- **Gate:** full unit gate 7036 of 7036, 0 failed, 0 skipped, 0 todo; typecheck, lint and build clean

## Accomplishments

- `src/planning-fs/scoped-fs.ts`: no Node import; moved names (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/) always come from the workstream folder, any other name prefers the workstream's copy (the ledger's config.json) and falls back to the root; `list` merges with the workstream winning and hides the root `workstreams/` and the root leftovers of the moved names. It has no write or watch member and every read delegates to the parent port, so the parent's containment and the byte-read base confinement apply unchanged. A `..`/`.` segment throws `PathEscapeError`; the constructor throws on an invalid name.
- `ProjectRuntime.workstreamRuntime(name)`: grammar check, exact match against a listed *folder*, then a `PlanningRepository` over the scoped port. Null results are not remembered, so an attacker cannot grow the cache with arbitrary names (T-11-45). A successful parent refresh disposes the scoped runtimes and the cached inventory; the next request rebuilds them from the new listing. Parent disposal releases them synchronously.
- Mounts: `/api/projects/:slug/ws/:name` (prefix cut at the name segment) before the project mount, and `/api/ws/:name` in the single-project wrapper; both sit behind the existing request guard. Unknown, file-named, malformed, case-different (`INTAKE`) and encoded-slash names answer 404.
- `src/server/workstreams.ts`: `isValidWorkstreamName` (GSD grammar, not `none`, no `..`) and `readWorkstreamInventory`. Brinkwater: mode `workstreams`; intake `executing`, phase 2 "Feed Alerts" from its ROADMAP; ledger phases 4/6 beside plans 22/22 as given; notices dashed "No roadmap yet" with status "Not started" from its bold line; active `intake`/`present`; one completed row `archive` (1 phase). The pointer is read once, capped at 256 bytes, trimmed, validated and matched only against listed folders (`stale` otherwise; `absent` for `../x`, `none`, 300 bytes, empty). Flat for Shapes, Lendshed, and a `workstreams/` with no subfolder. Order is by code point and does not depend on listing order; `roadmap` and `Roadmap` are two entries.
- `GET /workstreams` on the project API (flat inside a scope).
- `ArtifactDto.realPath` and `/documents` `artifact.realPath` exist only for scoped runtimes: intake's `.planning/ROADMAP.md` carries `.planning/workstreams/intake/ROADMAP.md`, its `.planning/PROJECT.md` carries itself. A flat presentation has no such key and equals `toProjectPresentation` without a mapper.

## Task Commits

1. **Task 1 (tracer): a workstream scope end to end** - `9b5abcb`
2. **Task 2: the inventory tests (names, state, progress, pointer, completed, mid-migration, name validation)** - `e37cdef`
3. **Task 3: flat projects provably unchanged (presentation and documents carry no realPath)** - `2426471`

## Verification

- `npm run test:gate`: total=7036 passed=7036 failed=0 skipped=0 todo=0 (the dense golden, `serialize.test.ts` and `fixtures/dense` are untouched: empty `git diff --stat`).
- `npm run typecheck`, `npm run lint`, `npm run build` exit 0.
- Acceptance greps: `from 'node:` in scoped-fs.ts = 0; `/ws/:name` in registry-api.ts = 1; `new ScopedPlanningFilesystem(` in project-runtime.ts = 1; `realPath` in project-presentation.ts = 2; `export function isValidWorkstreamName` = 1; `active-workstream` in workstreams.ts >= 1.
- The `systemctl --user restart labelore` step of Task 3 was NOT run: the service serves the main checkout, not this worktree. The orchestrator should rebuild and restart after merging.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 carried the inventory, the realPath plumbing and the `/workstreams` route**
- **Found during:** Task 1
- **Issue:** `workstreamRuntime` needs the listing of folders, and the scoped runtime needs the path mapper, so the Task 2 and Task 3 production code could not be left out of the tracer commit without writing a throwaway listing.
- **Fix:** Wrote them once, in the tracer commit (`9b5abcb`). Tasks 2 and 3 are then the behaviour-block tests and the flat-unchanged proofs, which passed on first run apart from two test-authoring mistakes (below).
- **Files modified:** src/server/workstreams.ts, project-presentation.ts, project-api.ts

**2. [Rule 2 - Missing critical] Eviction must not drop a parent under a scoped request**
- **Issue:** the scoped runtime holds the in-flight count, not its parent, so the registry could evict the parent mid-request.
- **Fix:** `ProjectRuntime.isBusy()` (own count or any workstream child's); `evictOverCap` calls it. `test/server/project-registry.test.ts` still passes unchanged.
- **Files modified:** src/server/project-runtime.ts, src/server/project-registry.ts

**3. [Rule 1 - Bug] A scoped document's Planned date would have asked git about the virtual path**
- **Fix:** the scoped runtime's `fileDates.addedAt` maps through `realPathOf` first.

**4. Inventory entry shape: two additive choices**
- Each entry carries `kind: 'folder' | 'file'` (a file entry is dashed and has no scope; the runtime needs the difference). `ownFiles` is every entry name of the workstream folder in code-point order (the index picks the chips from it). Dot-names (`.gitkeep`, `.DS_Store`) in `workstreams/` are ignored as filesystem noise.

**5. Test-authoring fixes (no production change):** `%2e%2e` in a URL is collapsed to `..` by the URL parser before routing (the request reaches the project's own presentation), so the 404 list uses `..%2Fx` and the name grammar test covers `%2e%2e`; code-point order puts `ws-archive-2026-05-01` before `ws-archive-2026-05-01-1`.

## Known Limitations

- A scoped runtime's Pace times read the whole repository's commit log, and plan ids (`01-01`) repeat across workstreams, so a scoped Pace figure can include another workstream's commits. Not fixed here (out of this plan's files); worth a look when 11-30 to 11-32 surface Pace inside a scope.
- Phase 13 search must key on scope plus path (recorded at 11-28): the virtual path recurs in every scope.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register: T-11-42 (name grammar plus exact listing membership before any runtime or path; tests with `..`, encoded slash, `none`, case), T-11-43 (pointer read once, 256-byte cap, validated, never a path), T-11-44 (no write or watch member; reads delegate to the parent port; base confinement kept; test asserts no write member), T-11-45 (lazy, cached for listed names only, disposed with the parent) are all mitigated and tested.

## Self-Check: PASSED

- Created files exist: scoped-fs.ts, workstreams.ts, scoped-fs.test.ts, workstreams.test.ts, workstream-api.test.ts.
- Commits `9b5abcb`, `e37cdef`, `2426471` are ancestors of HEAD.
