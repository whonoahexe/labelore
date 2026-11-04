---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
<!-- refreshed: 2026-11-04 -->
# Architecture

**Analysis Date:** 2026-11-04

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser SPA (React 19 + react-router + TanStack Query)                  │
│  `src/web/main.tsx` → `src/web/app-router.tsx` → lazy route pages        │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ fetch /api/projects[/:slug]/…  (apiFetch in `src/web/api.ts`)
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  HTTP server (Hono on @hono/node-server)                                 │
│  `src/server/index.ts` (startServer)  →  `src/server/registry-api.ts`     │
│  request guard `src/server/request-guard.ts`  (Host + JSON content type) │
│  Dev: Vite middleware mounted for non-API URLs; Prod: serveStatic ./dist │
└───────┬─────────────────────────────┬────────────────────────────────────┘
        │ /api/projects…              │ /api/projects/:slug/*
        ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────────────┐
│ ProjectRegistry          │   │ Per-project read API                     │
│ `project-registry.ts`    │──▶│ `src/server/project-api.ts`              │
│ settings + slug + scan   │   │ resolves ProjectRuntime per request      │
└──────────┬───────────────┘   └───────────────┬──────────────────────────┘
           │ one ProjectRuntime per slug       │ reads DerivedViews
           ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  ProjectRuntime `src/server/project-runtime.ts`                          │
│  DerivedViews: routeTable · presentation · artifactIndex ·               │
│  referenceRegistry · searchIndexState  (swapped as one bundle)           │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ SnapshotSource.getSnapshot()/refresh()
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Parsing core `src/planning-repo/` (PlanningRepository in snapshot.ts)   │
│  discover → parseWithRegistry (HANDLERS) → assembleDomainModel          │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ PlanningFilesystem port (`src/planning-fs/types.ts`)
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Filesystem adapter `src/planning-fs/local-fs.ts` (only node:fs user)    │
│  or ssh mirror: `src/server/remote-source.ts` copies .planning to tmp    │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI / server entry | Parses argv (`--port`, `--smoke`, positional paths), starts the Hono server, prints startup lines | `src/server/index.ts` |
| Target path resolution | Turns a CLI argument into a local folder or remote target, checks for `.planning/` | `src/cli/target-path.ts`, `src/cli/remote-target.ts` |
| Project registry | Keeps the remembered project list, allocates slugs, builds runtimes lazily, handles add/forget/scan | `src/server/project-registry.ts` |
| Settings store | Persists Labelore's own project list outside any target project (file or memory) | `src/server/settings-store.ts` |
| Registry HTTP app | Mounts the guard, body-size limits, project list routes and `/api/projects/:slug` | `src/server/registry-api.ts` |
| Request guard | Host allow-list and JSON content-type check on `/api/*` | `src/server/request-guard.ts` |
| Project runtime | Owns one project's `DerivedViews`, coalesces refreshes, disposes sources | `src/server/project-runtime.ts` |
| Per-project API | Read-only JSON endpoints (dashboard, roadmap, tree, search, documents, sketches, refresh) | `src/server/project-api.ts` |
| Snapshot source (local / remote) | Builds a `SnapshotSource` for a folder, or mirrors a remote `.planning/` into a temp dir | `src/server/project-registry.ts` (`createSnapshotSource`), `src/server/remote-source.ts` |
| Filesystem port | Interface every layer above depends on; all paths are project-relative | `src/planning-fs/types.ts` |
| Local filesystem adapter | Node-backed, containment-checked reads (`PathEscapeError`) | `src/planning-fs/local-fs.ts` |
| Discovery | Finds artifacts by filename and directory position only | `src/planning-repo/discovery.ts` |
| Handler registry | Ordered list of typed parsers; generic markdown is the final fallback | `src/planning-repo/handlers/index.ts` |
| Assembly | Builds the milestone-qualified domain graph (`Project`) and resolves cross-references | `src/planning-repo/assemble.ts`, `src/planning-repo/crossref.ts` |
| Snapshot (load/refresh seam) | Returns a new immutable `ProjectSnapshot`; never throws | `src/planning-repo/snapshot.ts` |
| Domain model | Shared entity types (`Project`, `Phase`, `Plan`, `Artifact`, …) with no parsing imports | `src/domain/model.ts` |
| Presentation builders | Pure functions turning the domain model into view models per page | `src/presentation/*.ts` |
| Route table & URL grammar | One clean address per file, `file/` fallback for collisions, alias redirects | `src/presentation/route-table.ts`, `src/presentation/routes.ts` |
| Rendering | Unified/remark/rehype markdown pipeline, shiki highlighting, ASCII diagram lifting | `src/rendering/markdown.ts` and siblings |
| Search | MiniSearch index built per derived bundle, scheduled off the request path | `src/server/search-index.ts`, `src/presentation/search.ts` |
| Web shell & routing | Root render, router, project layout, route dispatch to pages | `src/web/main.tsx`, `src/web/app-router.tsx`, `src/web/route-dispatch.ts` |
| Client API | `apiFetch`, typed fetchers, error kinds (refused / unreachable / http) | `src/web/api.ts` |
| Pages | Route-level React components (lazy-loaded) | `src/web/pages/*.tsx` |
| Views | Pure view composition (`*.ts`) paired with presentational React (`*-components.tsx`) | `src/web/views/*.ts`, `src/web/views/*-components.tsx` |

## Pattern Overview

**Overall:** Layered read-only pipeline with a filesystem port, a pure parse-and-assemble core, derived immutable view bundles per project, and a thin Hono JSON API consumed by a React SPA.

**Key Characteristics:**
- Strictly read-only: no write paths exist. `PlanningFilesystem.write?` and `watch?` are declared as optional hooks for future use (`src/planning-fs/types.ts`); `src/server/project-registry.ts` never writes inside a target project (SEC-05).
- One `PlanningFilesystem` interface is the only seam between disk and the rest of the code. `src/planning-fs/local-fs.ts` is the only file that imports `node:fs` (the boundary is also enforced by grep in its header comment). `src/server/remote-source.ts` mirrors remote `.planning/` into a local temp directory and then reuses the same local adapter.
- Derived views are replaced atomically: `ProjectRuntime.derived` is assigned once per refresh, built from a single snapshot (`src/server/project-runtime.ts`, D-05).
- Multi-project from the start: every request resolves its own `ProjectRuntime` by slug; there is no server-wide "active project" (`src/server/project-api.ts`, D-08).
- Parsing is driven by filename and directory position, never by frontmatter presence (DATA-02, `src/planning-repo/discovery.ts`), so unknown GSD artifacts fall through to `GenericMarkdownHandler` and degrade rather than break.
- Failures are values, not exceptions: `PlanningRepository.refresh()` resolves with a `LoadStatus` (D-12); `parseWithRegistry` converts handler throws into warnings (`src/planning-repo/registry.ts`).

## Layers

**Filesystem port and adapters (Layer A):**
- Purpose: Read files under a project root, enforce containment, never write.
- Location: `src/planning-fs/`
- Contains: `types.ts` (interface, `PathEscapeError`), `local-fs.ts` (Node adapter, temp-dir helpers), `in-memory-fs.ts` (test double).
- Depends on: Node built-ins (`local-fs.ts` only).
- Used by: `src/planning-repo/*`, `src/server/project-registry.ts`, `src/server/remote-source.ts`, `src/server/sketch-files.ts`.

**Domain model:**
- Purpose: Shared vocabulary of entities and identities.
- Location: `src/domain/model.ts`
- Contains: `Project`, `Milestone`, `Phase`, `Plan`, `Artifact`, `Requirement`, `QuickTask`, `PhaseIdentity`, `ArtifactLocation`. Status fields are open strings.
- Depends on: nothing (its header states zero imports from `planning-fs/` or `planning-repo/`).
- Used by: nearly every layer above.

**Parsing core (`planning-repo`):**
- Purpose: Turn a `.planning/` tree into a `ProjectSnapshot`.
- Location: `src/planning-repo/`
- Contains: `snapshot.ts` (`PlanningRepository`), `discovery.ts`, `registry.ts` (`parseWithRegistry`), `handlers/` (54 files; one handler per artifact family), `assemble.ts`, `crossref.ts`, `mentions.ts`, `warnings.ts`, `theme-tokens.ts`, `naming.ts`, `folders.ts`, `file-class.ts`.
- Depends on: `planning-fs/types.ts`, `domain/model.ts`.
- Used by: `src/server/*`, `src/presentation/*` (via `ProjectSnapshot` and `Project` types).

**Presentation (view-model builders, server-side, pure):**
- Purpose: Build JSON-ready view models and the URL grammar for every page.
- Location: `src/presentation/`
- Contains: `route-table.ts` (one address per file), `routes.ts` (`parseRoutePath`, `buildUrl`), `dashboard.ts`, `roadmap.ts`, `traceability.ts`, `search.ts`, `tree.ts`, `drawer.ts`, `reserved.ts`, `legacy-routes.ts`, `*-context.ts` and `*-page` builders, `references.ts`.
- Depends on: `planning-repo` types and naming helpers; some modules import types and helpers from `src/server/project-presentation.ts` and `src/server/dashboard-ledger.ts`, so this layer is not fully isolated from `server/`.
- Used by: `src/server/project-runtime.ts` (`buildRouteTable`, `toProjectPresentation`), `src/server/project-api.ts`, and the web route dispatcher (`src/web/route-dispatch.ts`).

**Rendering (server-side markdown):**
- Purpose: Convert artifact markdown to HTML once and cache by consumer.
- Location: `src/rendering/`
- Contains: `markdown.ts` (`createArtifactRenderer`: unified → remark-parse → remark-gfm → remark-rehype → rehype-raw → rehype-sanitize → rehype-slug → shiki/linkify), `linkify.ts` (`rehypeResolvedReferences`), `ascii-lift.ts`, `ascii-tree.ts`, `ascii-graph.ts`, `lane-layout.ts`, `build-order-layout.ts`, `plan-segments.ts`, `figure-detect.ts`, `slug.ts`.
- Depends on: unified ecosystem, `hast-util-sanitize`, shiki, its own `slug.ts`/`plan-segments.ts`, and type-only `ReferenceRegistry` from `src/presentation/references.ts`.
- Used by: `src/server/project-api.ts` (artifact renderer instance created per API factory).

**Server (project and registry):**
- Purpose: HTTP, project lifecycle, caching of per-project state, search state, commit times and file dates.
- Location: `src/server/`
- Contains: `index.ts` (entry), `registry-api.ts`, `project-api.ts`, `project-registry.ts`, `project-runtime.ts`, `project-presentation.ts`, `search-index.ts`, `commit-times.ts` (git history reads), `file-dates.ts`, `file-bytes.ts`, `sketch-files.ts`, `artifact-index.ts`, `dashboard-ledger.ts`, `folder-scan.ts`, `request-guard.ts`, `settings-store.ts`, `settings-model.ts`, `remote-source.ts`, `project-title.ts`, `document-sources.ts`.
- Depends on: all layers below plus `hono`, `@hono/node-server`, `vite` (dev only; dynamically imported in `src/server/index.ts`).
- Used by: the CLI entry and the browser.

**Web client:**
- Purpose: Render every page from the JSON API, with client routing and cache.
- Location: `src/web/`
- Contains: `main.tsx` (root render), `app-router.tsx` (`createBrowserRouter`, lazy page routes, `ProjectRoute`), `route-dispatch.ts` (pure address → outcome), `api.ts`, `query-keys.ts` (`projectKey`, `projectsKey`), `components/` (shell, sidebar, switcher, add-project dialog, `ui/` primitives), `pages/` (37 route pages), `views/` (59 files: pure composers plus `-components.tsx`), `styles/globals.css`.
- Depends on: `src/presentation/*` and `src/server/project-presentation.ts` as **type-only** imports (e.g. `src/web/app-router.tsx`), plus `react`, `react-router`, `@tanstack/react-query`, `mermaid` (dynamic).
- Used by: the browser via `index.html` → `src/web/main.tsx`.

## Data Flow

### Primary Request Path (page load of a project)

1. Browser requests `/<slug>/…`; `src/web/app-router.tsx` matches `/:project/*` and renders `ProjectRoute` → `ProjectLayout` (`src/web/pages/project-layout.tsx`).
2. `fetchPresentation(slug)` calls `GET /api/projects/:slug/presentation` through `apiFetch` (`src/web/api.ts`).
3. `createRegistryApp` applies `createRequestGuard` to `/api/*` (`src/server/registry-api.ts`, `src/server/request-guard.ts`), then `app.route('/api/projects/:slug', projectApi)`.
4. `createProjectApi`'s first middleware resolves the `ProjectRuntime` for the slug via `ProjectRegistry` (`src/server/project-registry.ts`), which lazily builds it on first use. The runtime's in-flight count is held for the request (Pitfall 9 comment in `project-api.ts`).
5. The `/presentation` handler returns `runtime.derived.presentation` (`src/server/project-api.ts`, around line 205).
6. The client runs `resolveProjectRoute` (`src/web/route-dispatch.ts`) against the payload, then mounts the page lazily.

### Load / Refresh Path (server side)

1. `ProjectRegistry` builds a `SnapshotSource` via `createSnapshotSource` (`src/server/project-registry.ts`): a `LocalFsPlanningFilesystem` for a folder, or a mirror from `src/server/remote-source.ts` for `sftp://`, `ssh://`, or scp-style targets.
2. `new PlanningRepository(fs, rootPath).refresh()` (`src/planning-repo/snapshot.ts`):
   - `checkTargetIsGsdProject()` checks `.planning/` exists; otherwise returns a failed `LoadStatus` with `project: null`.
   - `discover(fs)` walks `.planning/` and returns `refs` plus `exclusions` (`src/planning-repo/discovery.ts`).
   - `parseWithRegistry` per ref (`src/planning-repo/registry.ts`) picks the first `HANDLERS` entry whose `match(ref)` is true, falling back to `GenericMarkdownHandler`. Only `fileClass === 'text'` is read.
   - `withUiSpecTheme` attaches project theme tokens to UI-spec artifacts (`src/planning-repo/theme-tokens.ts`).
   - `assembleDomainModel` (`src/planning-repo/assemble.ts`) groups by milestone-qualified phase identity, builds plans and summaries, then runs `resolveCrossReferences` (`src/planning-repo/crossref.ts`).
   - `scanMentions` sets `project.mentions` (`src/planning-repo/mentions.ts`).
3. `ProjectRuntime.refresh()` (`src/server/project-runtime.ts`) coalesces concurrent calls, rejects non-`ok` load status without touching `derived`, then swaps `derived` in one assignment via `buildDerivedViews` (route table → presentation → artifact index → reference registry → search state).
4. The search index is built asynchronously off this path by `createSearchIndexState().buildFrom` (`src/server/search-index.ts`); requests never wait on it.

### Secondary Flow: Sketch and image files

1. Client requests a file-backed route; project API mounts `createSketchFileMiddleware` and `createFileBytesHandler` (`src/server/sketch-files.ts`, `src/server/file-bytes.ts`).
2. Handlers read through `runtime.planningFilesystem()` → `readBytesWithin`, which enforces containment (`src/planning-fs/local-fs.ts`). Sources without a filesystem answer 404.

### Add-project flow

1. `POST /api/projects` or `POST /api/projects/scan` (`src/server/registry-api.ts`) → `ProjectRegistry.register` / `scanForProjects` (`src/server/folder-scan.ts`).
2. Registry records the target through `SettingsStore.mutate`, which re-reads the settings file first (`src/server/settings-store.ts`), so two Labelore instances do not mint the same slug.

**State Management:**
- Server: per-project state lives only in `ProjectRuntime` instances keyed by slug inside `ProjectRegistry`; the list of remembered projects lives in `settings.json` (`defaultSettingsDir()`) or memory for smoke runs and tests.
- Client: server state is cached through TanStack Query with keys from `src/web/query-keys.ts`; UI state uses React built-ins. Nav state lives in `src/web/nav.tsx` and `src/presentation/project-map-state.ts`.

## Key Abstractions

**`PlanningFilesystem`:**
- Purpose: Read-only, project-relative file access with containment.
- Examples: `src/planning-fs/types.ts`, `src/planning-fs/local-fs.ts`, `src/planning-fs/in-memory-fs.ts`
- Pattern: Port/adapter. Optional members (`watch?`, `write?`, `readBytesWithin?`, `readHead?`) reserve future capabilities without signature changes.

**`ArtifactHandler`:**
- Purpose: Typed parser for one GSD artifact family.
- Examples: `src/planning-repo/handlers/plan.ts`, `src/planning-repo/handlers/roadmap.ts`, `src/planning-repo/handlers/generic.ts`
- Pattern: Registry array (`HANDLERS` in `src/planning-repo/handlers/index.ts`). First match wins; `GenericMarkdownHandler` must remain last (see the load-bearing comment in its file).

**`SnapshotSource` and `ProjectRuntime`:**
- Purpose: Uniform source of a project's snapshot plus the derived view bundle served from it.
- Examples: `src/server/project-runtime.ts`, `src/server/project-registry.ts` (`failedSource`, `createSnapshotSource`)
- Pattern: Runtime holds `derived: DerivedViews`; replacement is whole-bundle (D-05).

**`RouteTable` and address grammar:**
- Purpose: Guarantee each file exactly one readable URL.
- Examples: `src/presentation/route-table.ts`, `src/presentation/routes.ts`, `src/web/route-dispatch.ts`
- Pattern: Clean address per file where unique; collisions get `file/` addresses; aliases redirect (e.g. live-milestone roadmap). Client resolution is pure: `resolveProjectRoute(rest, search, presentation)`.

**View composition (web):**
- Purpose: Separate testable layout logic from React rendering.
- Examples: `src/web/views/manifest.ts` (`composeView`), `src/web/views/layout.ts`, `src/web/views/review-ledger.ts` with `src/web/views/review-ledger-components.tsx`
- Pattern: Each view has a pure `.ts` composer and a `-components.tsx` presenter. `.ts` files use type-only imports to avoid runtime cycles (stated in `manifest.ts`).

**`ProjectRegistry` and `SettingsStore`:**
- Purpose: Multi-project list, slug allocation, identity de-duplication, scan.
- Examples: `src/server/project-registry.ts`, `src/server/settings-store.ts`, `src/server/settings-model.ts`
- Pattern: Lazy runtime construction with coalesced loads; list is memory-only until a runtime is needed.

## Entry Points

**Server / CLI:**
- Location: `src/server/index.ts` (`package.json` scripts `dev`, `start`, `smoke`; `snapshot` uses `src/cli/snapshot.ts`)
- Triggers: `node src/server/index.ts [paths…] [--port N]`; `npm start` runs with `NODE_ENV=production` against `./dist`.
- Responsibilities: parse argv, register CLI targets, create the guarded registry app, start listening on `127.0.0.1` (auto-port from 4173 unless `--port` is given), attach Vite middleware in dev.

**Snapshot CLI:**
- Location: `src/cli/snapshot.ts`
- Triggers: `npm run snapshot`
- Responsibilities: one-off read of a target to a snapshot.

**Browser:**
- Location: `index.html` → `src/web/main.tsx` → `createRoot(...).render(...)` with `appRouter` from `src/web/app-router.tsx`.
- Triggers: navigation to any URL the server does not own (`isServerOwnedUrl` in `src/presentation/reserved.ts` decides the split).
- Responsibilities: shell rendering, lazy page loading (`trackRouteChunk`), project switching.

**Tests / e2e:**
- Location: `test/**/*.test.ts` (vitest, `vitest.config.ts`), `test/e2e/*.spec.ts` (Playwright, `playwright.config.ts`), `test/helpers/` for shared fixtures.

## Architectural Constraints

- **Threading:** Single Node event loop. Heavy work is async (`Promise.all` over handler parses in `src/planning-repo/snapshot.ts`); the MiniSearch build is scheduled off the request path (`src/server/search-index.ts`). The ssh mirror spawns `ssh`/`tar` through `node:child_process` in `src/server/remote-source.ts`; commit times are read from the target's git history via `src/server/commit-times.ts`.
- **Global state:** Module-level `HANDLERS` array (`src/planning-repo/handlers/index.ts`), module-level `LOCATION_ORDER` (`src/planning-repo/discovery.ts`), and the `searchIndex` export imported by `src/server/project-api.ts` from `src/server/search-index.ts`. Per-project state is otherwise held in `ProjectRuntime` instances, not in module scope.
- **Circular imports:** The web view layer avoids runtime cycles by using type-only imports (`src/web/views/manifest.ts` header comment). The presentation layer imports types from `src/server/project-presentation.ts`, which in turn imports from `src/planning-repo/*`; no runtime cycle was verified beyond what those comments state.
- **Dev/prod split:** `src/server/index.ts` dynamically imports `vite` only in dev mode; production serves `./dist` through `serveStatic`. The browser bundle is split per route (`vite.config.ts`, `chunkSizeWarningLimit: 680`) so mermaid loads only when needed.
- **Layering boundary:** `src/domain/model.ts` has no parsing imports. `src/planning-fs/local-fs.ts` is the only file under `src/` that imports `node:fs` for reads; `discovery.ts` mentions `node:fs` only in a comment. `src/web/` must not import Node modules (none found by grep).

## Anti-Patterns

### Reading a project through a server-wide "active" pointer

**What happens:** Shared state keyed to "the current project" would let one request observe another project.
**Why it's wrong:** The registry supports several projects at once (D-08, PLAT-02). A global pointer would race across requests.
**Do this instead:** Resolve the runtime per request from the slug (`createProjectApi`'s `resolve` argument in `src/server/project-api.ts`) and read only `runtime.derived`.

### Mutating a derived bundle field by field

**What happens:** Updating only `presentation` or `artifactIndex` after a refresh.
**Why it's wrong:** A route table built from one snapshot could resolve against another snapshot's index, so URLs would point at the wrong files (D-05, `src/server/project-runtime.ts`).
**Do this instead:** Build a whole new `DerivedViews` with `buildDerivedViews(snapshot)` and assign `this.derived` once.

### Calling `gray-matter` or handler parsers without a guard

**What happens:** A handler that throws escapes the parse.
**Why it's wrong:** A single malformed file would fail the whole refresh.
**Do this instead:** Let the handler throw; `parseWithRegistry` (`src/planning-repo/registry.ts`) converts it to a warning and an empty artifact. Frontmatter problems are handled in `src/planning-repo/frontmatter.ts`.

### Importing `node:fs` outside the adapter

**What happens:** Code under `src/planning-repo/` or `src/presentation/` reads disk directly.
**Why it's wrong:** It bypasses containment checks and breaks the port, which the remote mirror and the test doubles depend on.
**Do this instead:** Accept a `PlanningFilesystem` argument. The Node disk and process imports outside the adapter are confined to `src/server/file-dates.ts`, `src/server/settings-store.ts` (settings file) and `src/server/remote-source.ts` (ssh mirror, `node:child_process`); new disk access should follow the same placement.

## Error Handling

**Strategy:** Results and status values over thrown exceptions at the core; HTTP errors as JSON at the edge.

**Patterns:**
- `PlanningRepository.refresh()` resolves a `LoadStatus` (`ok`, `not-a-gsd-project`, `permission-denied`, …) and never throws (`src/planning-repo/snapshot.ts`).
- `ProjectRuntime.refresh()` returns a `RefreshOutcome` (`unsupported` | `refreshed` | `failed`) and keeps the previous bundle on failure (`src/server/project-runtime.ts`).
- Path escapes raise `PathEscapeError` (`src/planning-fs/types.ts`) and are caught as warnings during parsing.
- API responds `{ error: 'API route not found' }` with 404 for unknown `/api/*` routes (`src/server/registry-api.ts`); `src/web/api.ts` maps failures to `ApiError` kinds `refused`, `unreachable`, `http`.

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` in `src/server/index.ts` for startup lines only; no logging framework detected.
**Validation:** Path validation in `src/planning-fs/local-fs.ts` and `src/cli/remote-target.ts`; request validation in `src/server/request-guard.ts` (Host allow-list, JSON content type, body limit `GUARD_BODY_LIMIT = 4096`).
**Authentication:** None. The server binds to `127.0.0.1` (`HOSTNAME` in `src/server/index.ts`) and relies on the Host guard against DNS rebinding; extra hosts come from `LABELORE_ALLOWED_HOSTS`.

---

*Architecture analysis: 2026-11-04*
