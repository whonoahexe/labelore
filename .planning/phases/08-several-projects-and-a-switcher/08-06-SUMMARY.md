---
phase: 08-several-projects-and-a-switcher
plan: 06
subsystem: server-startup
tags: [startServer, parseCli, registry-app, request-guard, playwright, settings-dir, sec-05]
requires:
  - phase: 08-01
    provides: ProjectRegistry, createRegistryApp
  - phase: 08-03
    provides: createHostPolicy / HostPolicy.setPort, the request guard
  - phase: 08-04
    provides: FileSettingsStore, MemorySettingsStore, defaultSettingsDir
  - phase: 08-16
    provides: registerCliTargets, identityOfTarget
provides:
  - "startServer(rawPaths, options): every CLI path opened and remembered, the guarded registry app served on a real socket, Host policy port set after listen"
  - "parseCli(args) exported: ordered path list, --port/--port=/--smoke kept, any other option refused by name"
  - "A smoke run over /api/projects with MemorySettingsStore"
  - "playwright.config.ts, fixture-server.ts and deep-link-probe.mjs on /api/projects with a private LABELORE_CONFIG_DIR each"
  - "test/e2e/app-url.ts: projectApiUrl(base, path) and the /api/projects slug lookup"
  - "test/server/start-server.test.ts: real-socket proof of the served app"
affects: [08-07, 08-08, 08-10, 08-12, 08-14, 08-15]
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "startServer builds the registry, awaits registerCliTargets, then learns the real port from server.address() after listen"
    - "Process hooks registered by registerDisposal are removed again when the server closes"
    - "Every harness that starts a real server hands it a mkdtemp LABELORE_CONFIG_DIR"
key-files:
  created:
    - test/server/start-server.test.ts
  modified:
    - src/server/index.ts
    - src/server/project-api.ts
    - playwright.config.ts
    - test/playwright-config.test.ts
    - test/e2e/fixture-server.ts
    - test/e2e/app-url.ts
    - test/e2e-app-url.test.ts
    - test/server/deep-links.test.ts
    - test/helpers/deep-link-probe.mjs
    - test/e2e/debug-page.spec.ts
    - test/e2e/learnings-page.spec.ts
    - test/e2e/note-page.spec.ts
    - test/e2e/todo-page.spec.ts
key-decisions:
  - "registerDisposal takes anything with dispose() and now removes its exit/SIGINT/SIGTERM hooks when the server closes, so repeated starts in one process (tests) do not leak listeners"
  - "The Playwright config removes its settings directories only in the main process (TEST_WORKER_INDEX unset); a worker that merely loads the config leaves them alone"
  - "The CLI prints one 'Labelore is reading <slug>: <displayPath>' line per listed project, read back from /api/projects after listen"
requirements-completed: [PLAT-02, PLAT-06, SEC-05]
coverage:
  - id: D1
    description: "node src/server/index.ts <path> <path> opens every path: GET /api/projects lists each with its own slug and /api/projects/<slug>/... serves each project's API; one path lists one project; no path (programmatic []) lists none and parseCli supplies the working directory"
    requirement: PLAT-02
    verification:
      - kind: integration
        ref: "test/server/start-server.test.ts#lists every path and serves each project API, and refuses a foreign Host and an unproven POST"
        status: pass
      - kind: integration
        ref: "test/server/start-server.test.ts#the paths on the command line (PLAT-02)"
        status: pass
      - kind: unit
        ref: "test/server/start-server.test.ts#parseCli (D-16)"
        status: pass
    human_judgment: false
  - id: D2
    description: "startServer serves only createRegistryApp (region-scoped source scan) and, over a real socket, refuses Host evil.example, a POST with a foreign Origin and a POST with no proof, while 127.0.0.1:<port> succeeds; the Host policy learns the real port even after an auto-port move"
    requirement: SEC-05
    verification:
      - kind: integration
        ref: "test/server/start-server.test.ts#the served app is the guarded registry app (SEC-05)"
        status: pass
      - kind: integration
        ref: "test/server/refresh.test.ts#answers 403 and never calls refresh() on the registry app"
        status: pass
    human_judgment: false
  - id: D3
    description: "A normal start stores settings with FileSettingsStore at defaultSettingsDir(); a smoke run uses MemorySettingsStore; restarting on the same settings directory with no path lists the projects remembered before with the same slugs; every runtime is disposed once on close"
    requirement: PLAT-06
    verification:
      - kind: integration
        ref: "test/server/start-server.test.ts#what a restart remembers (PLAT-06, D-09, D-11)"
        status: pass
      - kind: command
        ref: "NODE_ENV=production node src/server/index.ts --smoke test/fixtures/shapes test/fixtures/lendshed"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every Playwright web server and the fixture server wait on /api/projects with a distinct temporary LABELORE_CONFIG_DIR; the e2e URL helper, the deep-link tests and the dev and built probes read the slug from /api/projects and the payload from /api/projects/<slug>/presentation"
    requirement: PLAT-06
    verification:
      - kind: unit
        ref: "test/playwright-config.test.ts#gives every server its own temporary settings directory"
        status: pass
      - kind: integration
        ref: "test/e2e-app-url.test.ts"
        status: pass
      - kind: command
        ref: "node test/helpers/deep-link-probe.mjs dev|built test/fixtures/shapes (failed=0, urls=72 each)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The four fixture-server specs read their presentation through projectApiUrl; they were type-checked and linted but not run in a browser (the phase gate 08-15 runs them once every page fetches through its slug)"
    requirement: PLAT-02
    verification: []
    human_judgment: true
    rationale: "Playwright specs are not run by this plan on purpose (scope note); no browser assertion covers the changed fetch yet."
duration: ~40 min
completed: 2026-10-30
status: complete
commits: 3
plan_head_before: e6124663c429b50487ff5b037bd9c4f7e7618175
plan_head_after: 76d843ba6b1dfca3e17be5db898f5f073dcf767c
---

# Phase 8 Plan 06: One server, several projects Summary

The running program is now the multi-project one: `startServer(rawPaths, options)` opens and remembers every command-line path, serves only the guarded registry app over a real socket and teaches the Host policy its port after listen, while every harness, probe and e2e helper follows `/api/projects` on a private settings directory.

## Performance

- **Duration:** ~40 min
- **Tasks:** 3 of 3
- **Files:** 1 created, 13 modified

## Accomplishments

- `startServer` builds `new FileSettingsStore(defaultSettingsDir(), identityOfTarget)` (or `options.settings`), a `ProjectRegistry` over it, awaits `registerCliTargets(rawPaths)`, builds the Host policy (`LABELORE_ALLOWED_HOSTS` unless `allowedHosts` is given) and serves `createRegistryApp` in both the production and the Vite-middleware branch; `policy.setPort(server.address().port)` runs after `listen`, so an auto-port move is covered.
- `parseCli` is exported, keeps every positional path in order, defaults to the working directory, keeps `--port`, `--port=` and `--smoke`, and throws `Unknown option: <arg> (supported: --port, --smoke)` for anything else (D-16, no `--scan`).
- `--smoke` runs on a `MemorySettingsStore`, reads `/api/projects`, then the first slug's dashboard and `/`. A normal start prints one `Labelore is reading <slug>: <path>` line per listed project, the ssh line, the mode line, the moved-port line and `Open http://...` (the probe's wait line).
- The refresh handler's in-handler `Sec-Fetch-Site` block is gone; `request-guard.ts` is the only same-origin gate (an absent proof is a 403 over the socket).
- `test/server/start-server.test.ts` (15 tests) proves it on a real socket: list and per-project API, foreign Host, foreign Origin and absent proof refused, same-origin accepted, region-scoped source scan, auto-port, restart persistence with `FileSettingsStore` and with `LABELORE_CONFIG_DIR`, a smoke-style `MemorySettingsStore` writing nothing, and disposal of both loaded runtimes exactly once on close.
- `playwright.config.ts` waits on `/api/projects` and gives each of its four servers an `env.LABELORE_CONFIG_DIR` from its own `mkdtemp`; `fixture-server.ts` and `deep-link-probe.mjs` do the same and remove the directory; `app-url.ts` reads the slug from `/api/projects` (exactly one project, else `Expected exactly one project at ... found N`) and exports `projectApiUrl(base, path)`.
- The four fixture-server specs fetch their presentation through `projectApiUrl`; no `/api/presentation` literal remains in them.

## Task Commits

1. **Task 1 (tracer): Two CLI paths, one server** - `1ebe1b3` (feat)
2. **Task 2: Every harness and probe follows /api/projects** - `1b25594` (test)
3. **Task 3: The four fixture-server specs and the unit gate** - `76d843b` (test)

The tracer gate ran after Task 1: `start-server`, `refresh` and `deep-links` suites (220 tests), both typecheck configs and eslint were green before expansion.

## Verification

- Full `vitest run`: 4678 passed, 4 failed in the last run, and the failures are not stable. Three are the known corpus guards (`pattern-map-corpus` for 08-PATTERNS.md, `ui-spec-corpus` for 08-UI-SPEC.md). The fourth differed between full runs (`test/server/registry-api.test.ts` "answers every parameterless GET route ..." once, `test/helpers/growth.test.ts` "reads a planted nested loop" once, none in the first run) and both pass in isolation, so they are load-sensitive timing flakes, not caused by this plan.
- `tsc --noEmit` for `tsconfig.server.json` and `tsconfig.web.json`, and `eslint .`: clean.
- `node test/helpers/deep-link-probe.mjs dev|built test/fixtures/shapes`: `urls=72 failed=0` for both (built after `vite build`).
- Acceptance greps: `createRegistryApp(` in `index.ts`, one `Unknown option`, no `header('sec-fetch-site')` in `project-api.ts`, no `/api/presentation|dashboard|files` literal in `app-url.ts`, `fixture-server.ts`, the probe or `playwright.config.ts`, none in the four specs, `projectApiUrl` count 2 in each.

## Deviations from Plan

**1. [Rule 3 - Tooling] `npm run test:gate`, `npm run typecheck`, `npm run lint` and `npm run build` cannot run in this worktree**
- **Found during:** Task 1
- **Issue:** the worktree has no `node_modules` (a symlink would break `fixture-leak.test.ts`), so the npm scripts cannot resolve their binaries.
- **Fix:** ran `/home/user/labelore/node_modules/.bin/{vitest,tsc,eslint,vite}` directly with the same arguments. The gate's `skipped`/`todo` counters were not printed; vitest reported no skipped or todo tests.
- **Files modified:** none

**2. [Interpretation] "in argument order before any remembered project" holds only for the paths of one start**
- **Found during:** Task 1
- **Issue:** a project remembered from an earlier run that was never opened keeps its earlier `addedOrder` and sorts ahead of a new CLI path, and an opened one sorts by `lastOpened` (D-04, 08-01's `orderProjects`, 08-16's `registerCliTargets`, none of which stamp CLI paths as opened). Making CLI paths always lead would need a change in `project-registry.ts`, outside this plan's files.
- **Fix:** the test asserts what holds: several fresh paths list in argument order, and a remembered project plus a new path list together, each once, across restarts. Position of remembered versus CLI projects is not asserted. Flagged for a follow-up in the registry if the strict reading is wanted.
- **Files modified:** test/server/start-server.test.ts

**3. [Rule 3 - Blocking] deep-links.test.ts changed in Task 1, not Task 2**
- **Issue:** Task 1's required `npm run typecheck` fails while `deep-links.test.ts` still calls `startServer(SHAPES_ROOT, ...)`, so its development-describe edit (and the `apiGuardTests(fetch, projectApi)` prefix parameter) is in the Task 1 commit. Its production describe keeps the `createApp` wrapper as the plan says.

**4. [Rule 1 - Bug] no-skips guard flagged a literal in the new test**
- **Issue:** `parseCli(['--scan', '~/Work'])` tripped the real-path guard in `test/no-skips.test.ts`. Fixed in Task 3's commit by using `some-folder`.

**5. [Rule 2 - Hygiene] registerDisposal removes its process hooks on close**
- **Issue:** six or more `startServer` calls in one test process raised `MaxListenersExceededWarning` for exit, SIGINT and SIGTERM. The hooks are now removed when the server closes.

**Total deviations:** 5 (2 tooling or ordering interpretation, 1 ordering of edits, 1 test fix, 1 hygiene). **Impact:** none on behavior beyond item 2.

## Authentication Gates

None.

## Issues Encountered

- The strict "CLI paths before remembered projects" reading is not met by the registry (deviation 2).
- `playwright.config.ts` creates its `mkdtemp` directories at every load. Only the main Playwright process removes them on exit; a crash (SIGKILL) leaves tiny settings directories in the OS temp folder.
- The Playwright specs were not run: the plan defers that to the phase gate (08-15), and between this plan and 08-12 the sketch viewer has no file route.

## Known Stubs

None.

## Threat Flags

None. The listening surface is unchanged (still 127.0.0.1) and now always behind the request guard; T-08-16, T-08-18 and T-08-19 of the plan's register are mitigated as planned.

## Next Phase Readiness

- The served app is the registry app: the web plans (08-08 to 08-13, 08-17) meet the real routes. Specs still reading `/api/presentation` or `/api/drawer` move to `projectApiUrl` in 08-10 and 08-14.
- `startServer` accepts `settings`, `allowedHosts`, `createSource` and `remoteRunner` for tests.

## Self-Check: PASSED

- test/server/start-server.test.ts: found; all modified files committed (`git status` clean apart from this summary)
- commits 1ebe1b3, 1b25594, 76d843b: ancestors of HEAD, `git rev-list --count e612466..HEAD` = 3
- `tsc` (both configs) and `eslint .` exit 0; deep-link probe dev and built `failed=0`
