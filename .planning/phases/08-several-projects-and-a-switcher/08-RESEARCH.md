# Phase 8: Several Projects and a Switcher - Research

**Researched:** 2026-10-27
**Domain:** Multi-project registry over a Hono + Vite + React Router + TanStack Query local tool; first write path (settings file); request-origin guard for a localhost server
**Confidence:** HIGH on codebase facts and the Hono dispatch spike; MEDIUM on browser header behaviour and the tunnel deployment (see Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Switcher and landing page
- **D-01:** `/` is a **projects landing page**, even when only one project is loaded. It lists every
  project and holds the scan and add controls. A project URL (`/<slug>/…`) goes straight to that
  project. `/` never redirects to a project on its own. — **Reversibility:** reversible — a redirect
  rule could be added later without touching project URLs.
- **D-02:** Each project row, in the header switcher and on the landing page, shows **display name,
  a quiet path or `ssh://` target, and a load-state mark** (loading, or unavailable with its reason).
  Listing a project never loads it: the rows come from `GET /api/projects`'s cheap list. There is no
  milestone, phase or progress per row.
- **D-03:** The landing page uses the **same rows as the switcher**, full width, plus last-opened time
  and the scan and add controls. No project cards with status (deferred).
- **D-04:** Both lists are ordered **last opened first**. Unavailable projects keep their place in
  that order and are marked, not moved or hidden.
- **D-05:** The switcher sits in the header brand area (where `projectDisplayName` and `rootPath`
  show today). It is sketched first, built from the winning sketch and screenshot-checked against it
  (success criterion 1). The landing page goes through the same sketch loop.

#### What switching does
- **D-06:** Switching project **always lands on the target project's dashboard**. There is no
  equivalent-page matching and no last-page memory.
- **D-07:** While the target is loading, the **header switches to the new project at once and the
  body shows a loading state**. Nothing from the previous project is ever shown (PLAT-08). A load
  failure shows the existing invalid-target screen (`invalid-project-screen.tsx`) with the reason
  and the path checked.
- **D-08:** **Tabs are fully independent.** Each tab follows its own URL slug, and the server holds no
  "active project" state. Opening a project only updates that entry's `lastOpened` (and
  `lastActive`) in settings.

#### Remembered list lifecycle
- **D-09:** **Every project opened is remembered**: CLI paths, projects added from the switcher or
  landing page, and scan results the user picked. Test runs never touch the real settings file
  (`LABELORE_CONFIG_DIR` set in the vitest and Playwright setup).
- **D-10:** Each row (switcher and landing page) has a quiet **remove** action. It only edits
  Labelore's settings file and never touches the project. An unavailable project stays listed with
  its reason until the user removes it, and is never dropped silently. — **Reversibility:**
  reversible — it is a settings edit, and re-adding the path restores the entry (with the same slug
  only if the slug is still free).
- **D-11:** Slug collisions take a **numeric suffix** (`portal`, `portal-2`). The slug is assigned once
  from the kebab-cased basename (Phase 7's rule and reserved words), **persisted** with the entry, and
  never reassigned, so bookmarks keep working across runs. Identity for de-duplication is the
  canonical path (realpath) or the normalised ssh target, not the typed string. —
  **Reversibility:** costly — persisted slugs live in users' bookmarks and the settings file, so
  changing the scheme later breaks existing links.
- **D-12:** **No rename in the UI.** A user who wants another slug edits `settings.json` by hand.
  Labelore validates each entry on read (reserved words, uniqueness, format) and reports a bad entry
  rather than throwing.

#### Scanning and adding
- **D-13:** The **full scan and add form lives on the landing page**. The header switcher holds the
  list plus an "Add or scan…" entry, which opens a small add dialog (local path or `ssh://` target)
  and links to the landing page for scanning.
- **D-14:** A scan shows its results as a **checklist**: each found project with its path and a
  checkbox. Projects already in the list are marked and disabled. "Add N" remembers the picked ones
  **without loading them**.
- **D-15:** Scans are restricted to folders **inside `$HOME`**, depth 2 (`~/Work/<group>/<project>`),
  skipping dot-directories, `node_modules` and symlinks, with a capped number of results. A folder
  outside `$HOME` is refused with a named reason. A codebase-only `.planning/` counts as a project.
- **D-16:** **Scanning is UI-only.** The CLI takes several positional paths but has no `--scan` flag,
  and nothing is scanned at startup.
- **D-17:** A path or ssh target added at runtime goes through the existing `resolveTargetPath` /
  `parseRemoteTarget` exactly once, with no second parser. A bad add shows a named error that reuses
  the invalid-target wording and the exact path checked.

#### Security (SEC-05, as the research specifies; restated so the plan carries it)
- **D-18:** A Host-header allowlist (`127.0.0.1`/`localhost` with the server's port) runs on `/api/*`.
  Every endpoint that accepts a path, an ssh target, a scan folder or a settings change (add, remove,
  scan, refresh) requires same-origin (`Origin` or `sec-fetch-site`, with an absent header refused,
  unlike today's `/api/refresh` gate) and a JSON content type. A test proves a foreign Origin or Host
  is refused on each one.
- **D-19:** `settings.json` lives at `$XDG_CONFIG_HOME/labelore/settings.json` (fallback
  `~/.config/labelore/`). It is written atomically (temp file plus rename), is versioned, and is
  re-read before each change. It is written by a second, explicitly allow-listed `node:fs` importer
  whose path is fixed at construction. A test proves it can never resolve inside a target root.
  `local-fs.ts` stays read-only.

### Claude's Discretion
- **Memory policy for loaded projects:** keep every loaded runtime for the run, or an LRU of the few
  most recent (disposing their indexes and ssh mirrors). The research is split (ARCHITECTURE says
  keep all, PITFALLS 17 says LRU of 2–3). Either way, a test asserts heap stays bounded across
  repeated switches.
- The scan result cap, the exact wording of the unavailable reasons, and how the loading body looks,
  all within `docs/design-language.md`.
- What a corrupt `settings.json` does at startup (research: keep it as `.bak`, start empty, say so,
  never throw).
- The unknown-slug screen: it names the slug and lists known projects with the switcher (research
  table stake). The planner shapes it.
- Hono sub-app dispatch under `/api/projects/:slug/*` (path-parameter mount or a rewritten request),
  decided by a spike.

### Deferred Ideas (OUT OF SCOPE)
- **Project cards with milestone, phase and progress on the landing page**: considered and declined
  for now (D-03). They need every project loaded or peeked at. A candidate after v2.1.
- **Equivalent-page switching or last-page memory per project**: declined (D-06). Revisit if
  always-dashboard proves annoying.
- **Renaming a slug from the UI**, with a redirect from the old slug: declined (D-12).
- **A `--scan <dir>` startup flag**: declined (D-16).
- Switching project from the Cmd-K palette belongs to Phase 13. Cross-project search and pinned
  favourites are out of this milestone.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAT-02 | Starting Labelore with several paths opens all of them, with a switcher to move between them | `parseCli` becomes a path list; `ProjectRegistry` registers every path (lazy load); `GET /api/projects`; header switcher is a Base UI Popover; sketch 039 gate before build |
| PLAT-05 | The user can scan a folder such as `~/Work` and pick from the GSD projects found inside it | `POST /api/projects/scan` (POST, not GET, so the guard applies); `folder-scan.ts` over one new read-only listing primitive in `local-fs.ts`; `$HOME` containment checked lexically then by realpath; depth 2; result cap |
| PLAT-06 | Projects the user has opened are remembered between runs in Labelore's own settings file, never inside a project | `settings-store.ts` (second `node:fs` importer), atomic temp+rename, versioned, re-read-merge-write, `LABELORE_CONFIG_DIR` override, path-disjointness test and a byte-identical-target test |
| PLAT-07 | The user can add a local path or an `ssh://` target from the switcher | `POST /api/projects {target}`: `parseRemoteTarget` then `resolveTargetPath` once; local failures answer 422 with the `FailedLoadStatus`; ssh adds validate syntax only and connect lazily on first open |
| PLAT-08 | Switching project never shows the previous project's data, each project keeps the same URL name across runs, and a project that can no longer be opened is listed with the reason | Slug-first query-key factory with no cross-slug `placeholderData`; layout subtree keyed by slug; persisted slugs; `unavailable` state with the server's reason; the `plan-pair` and `artifact-document` caches are the concrete collision hazard (Pitfall 1) |
| SEC-05 | Endpoints that accept a path, an `ssh://` target or a settings change refuse requests from other websites, and the settings file can never be written inside a target project | `request-guard.ts` middleware (Host allowlist on all `/api/*`; same-origin + JSON on every non-GET), enumerate-the-routes refusal test, settings-path disjointness test |
</phase_requirements>

## Summary

Phase 8 is an extraction-and-wrapping phase, not a green-field one. Today `createApp(source)` closes over one snapshot source, one `derived` bundle, one commit log, one `fileDates`, one in-flight refresh promise and one sketch filesystem (`src/server/index.ts:82-392`), and `startServer` builds exactly one source. The phase splits that closure into a `ProjectRuntime`, puts a keyed `ProjectRegistry` in front of it, and mounts the existing handlers once at `/api/projects/:slug/*`. A Hono spike run in this session shows that a path-parameter mount works in the installed Hono 4.13.4, so no rewritten-request dispatcher is needed: one project API instance resolves its runtime from `c.req.param('slug')` in a first middleware, and the legacy `createApp(source)` wrapper reuses the same instance with a fixed resolver so the existing server tests keep running unmodified.

The first write path in the program is the settings file. It goes in a second, allow-listed `node:fs` importer (`src/server/settings-store.ts`) behind a `SettingsStore` interface; `local-fs.ts` gains only a read-only directory-listing primitive for the scan. Every mutation re-reads the file, applies a pure function (slug allocation happens inside it, so two Labelore instances cannot mint the same slug), and writes atomically. The security work (SEC-05) must land first in the build order: a `request-guard.ts` middleware that checks the Host header on every `/api/*` request and requires same-origin plus a JSON content type on every non-GET. Two facts from this session change how the planner should treat it: Hono's built-in `csrf()` only guards form content types and so cannot be used as the gate, and the user's own deployment (`labelore.brkn.me` behind a Cloudflare tunnel) will be refused by the locked Host allowlist unless an opt-in escape hatch exists (Open Question 1).

On the client, PLAT-08 is won by three mechanical rules: every query key starts with the slug through one factory, the `/:project` layout subtree is keyed by slug so component state resets, and nothing uses `placeholderData`. The concrete trap is that two queries today key on project-relative strings with infinite stale time (`['plan-pair', pathname]` with `staleTime: Number.POSITIVE_INFINITY`, and `['artifact-document', route]`); with two projects those keys collide and project A's plan would render under project B's URL. The UI contract (08-UI-SPEC.md) is approved and binds copy, tokens and states; the layout of the switcher and the landing page is provisional until sketches 039 and 040 are drawn and a winner is chosen by the user, which is a human checkpoint the plan must contain before any switcher component is built.

**Primary recommendation:** Build in this order: (1) request guard, (2) settings store and test isolation, (3) registry + runtime extraction + registry API, (4) slug-aware client data layer and `/:project` layout, (5) sketches 039/040 and the user's choice (can start in parallel with 1-3), (6) switcher, landing page, add dialog, scan checklist built from the winners, (7) phase gate with a multi-project Playwright spec. Phase 7 is still executing (plan 5 of 10), so tasks touching `app-router.tsx`, `routes.ts` and DTO urls must be written against Phase 7's final shape.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Which projects exist, their slugs, lazy load, eviction | API / Backend (`ProjectRegistry`) | — | The server owns filesystem identity (realpath) and ssh mirrors; the client only sees the cheap list |
| Persisting the project list | Database / Storage (Labelore's own `settings.json`) | API / Backend (`SettingsStore`) | The only write in the program; must be fixed-path and disjoint from targets |
| Request-origin refusal (Host, Origin, content type) | API / Backend (Hono middleware) | — | Browsers enforce same-origin only for reads; the server must refuse the request itself |
| Folder scan | API / Backend (`folder-scan.ts`) | Database / Storage (`local-fs.ts` listing primitive) | Directory listing is a filesystem read; the client cannot do it and must not guess `$HOME` |
| "Current project" | Browser / Client (URL slug) | — | D-08: no server-side active project; tabs independent |
| Query cache partitioning, loading state on switch | Browser / Client (TanStack Query keys, layout) | — | Cache keys and component keys are client concerns |
| Switcher, landing page, add dialog, scan checklist | Browser / Client | API / Backend (list, add, scan, forget DTOs) | Pure presentation of server DTOs; server supplies display path and reasons verbatim |
| Home-shortened path display (`~/Work/x`) | API / Backend | — | UI-SPEC: "the client never guesses the home directory" |
| Sketch file serving | API / Backend (moved under `/api/projects/:slug/sketch-files/*`) | Browser / Client (iframe URL) | Keeps `Content-Security-Policy: sandbox allow-scripts`; now also behind the Host guard |

## Standard Stack

No new dependencies. Everything below is already in `package.json` and installed. [VERIFIED: /home/user/labelore/package.json, node_modules/*/package.json]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | 4.13.4 | Registry app, project API, guard middleware | Already the server; path-parameter sub-app mount verified by spike |
| @hono/node-server | 2.1.1 | Node adapter (`createAdaptorServer`, `getRequestListener`) | Already used; builds `c.req.url` from the incoming Host header (spike) |
| @tanstack/react-query | 5.102.3 | Slug-first query keys, mutations | Already used; new key means a fresh pending query unless `placeholderData` is set [CITED: tanstack.com/query/latest/docs/framework/react/guides/paginated-queries] |
| react-router | 8.3.0 | `/` landing route, `/:project` layout | Already used; Phase 7 owns `nav.tsx` |
| @base-ui/react | 1.7.0 | Popover (switcher), Dialog (add), Checkbox, Field, Input, Tooltip | Already used; `popover checkbox input field tooltip collapsible dialog` all exist in `node_modules/@base-ui/react/` [VERIFIED: ls this session] |
| vitest | 4.1.11 | Unit and contract tests | Already used; `include: ['test/**/*.test.ts']` |
| @playwright/test | 1.63.0 | Multi-project browser spec, screenshot checks | Already used; Chromium present at `/opt/pw-browsers` |

### Supporting (Node built-ins and Hono middleware already installed)
| Module | Purpose | When to Use |
|--------|---------|-------------|
| `hono/body-limit` | Cap JSON bodies on add, scan | Every POST in the registry API (small cap, a few KB) |
| `node:fs` (in `settings-store.ts` only) | Atomic write: `writeFileSync` to temp, `renameSync` | Only in the second allow-listed importer |
| `node:os` `homedir()` | `$HOME` for scan containment and `~` display | Not covered by the `node:fs` gate |
| `node:v8` + `node:vm` | `setFlagsFromString('--expose_gc')` then `vm.runInNewContext('gc')` | Heap-bounded test without a vitest flag; works in Node 22.22 [VERIFIED: spike3 in this session] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `request-guard.ts` | `hono/csrf` | `csrf()` only inspects requests whose content type is `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain` (or absent); a JSON POST from another site is not blocked by it, and it does no Host check [VERIFIED: node_modules/hono/dist/middleware/csrf/index.js, `isRequestedByFormElementRe`] |
| Path-parameter mount | Rewritten-`Request` dispatcher | Both work (spike); the mount is smaller and keeps one Hono instance |
| LRU of loaded runtimes | Keep every runtime | LRU bounds memory; keep-all re-mirrors nothing. STATE.md already names "a bounded cache starting at five projects" |

**Installation:** none. **Version verification:** the versions above were read from the installed `node_modules/*/package.json` this session; no registry install is performed in this phase.

## Package Legitimacy Audit

No external packages are installed by this phase. The Package Legitimacy Gate (`gsd-tools query package-legitimacy check`) was therefore not run. `hono/body-limit` and `hono/csrf` ship inside the already-installed `hono` package. If a plan task proposes adding any dependency (for example a schema validator for the JSON bodies), it must go through the gate first; this research recommends hand validation of two or three string fields instead.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Browser tab (URL = only source of "current project", D-08)
   |
   |  GET /                -> landing page (list + add + scan)        (client route, never redirects, D-01)
   |  GET /<slug>/...      -> <ProjectLayout key={slug}>              (client route; slug unknown -> unknown-slug screen)
   |
   |  fetch /api/projects ...                  fetch /api/projects/<slug>/... (all existing endpoints)
   v                                               v
+----------------------------------------------------------------------------------+
| Node http server (127.0.0.1, port known only after listen)                       |
|  Hono registry app                                                               |
|   1. request-guard  (all /api/*)  Host allowlist -> else 403                     |
|                      non-GET: same-origin + JSON content type -> else 403/415    |
|   2. body-limit on POST                                                          |
|   3. routes                                                                      |
|        GET    /api/projects                  -> registry.list()  (cheap, no load)|
|        POST   /api/projects        {target}  -> registry.add()   (resolveTargetPath / parseRemoteTarget once)
|        POST   /api/projects/scan   {folder}  -> folder-scan (inside $HOME, depth 2, capped)
|        DELETE /api/projects/:slug            -> registry.forget() (settings only)
|        POST   /api/projects/:slug/open       -> stamp lastOpened/lastActive, kick lazy load
|        *      /api/projects/:slug/*          -> project API (mounted once; middleware resolves runtime)
|        ALL    /api/*                         -> 404 JSON
|   4. production: serveStatic dist + SPA index.html fallback                      |
+--------------+-------------------------------------------+-----------------------+
               |                                           |
               v                                           v
      ProjectRegistry                               SettingsStore (2nd node:fs importer)
       entries: slug, identity, target, kind,        read -> merge(fresh) -> atomic write
       lastOpened, state, runtime?                   $LABELORE_CONFIG_DIR | $XDG_CONFIG_HOME/labelore | ~/.config/labelore
       LRU of loaded runtimes (cap 5)                path fixed at construction, disjoint from every target
               |
               v   lazy, coalesced, one failure never touches another
       ProjectRuntime (one per loaded project)
        derived bundle (D-05), commit log, fileDates, in-flight refresh, sketch filesystem
        source = PlanningRepository(LocalFsPlanningFilesystem)  |  RemoteSnapshotSource (ssh mirror)
        dispose(): releases index + mirror
```

### Recommended Project Structure
```
src/
├── cli/
│   └── target-path.ts        # export expandTilde (scan reuses it; no second parser)
├── planning-fs/
│   └── local-fs.ts           # + listChildEntries(absDir): read-only, Dirent flags; nothing else new
├── presentation/
│   ├── project-slug.ts       # + isValidSlug, allocateSlug(base, taken) (pure)
│   └── reserved.ts           # SERVER_OWNED_PREFIXES drops '/sketches/'
├── server/
│   ├── request-guard.ts      # NEW  Host allowlist + same-origin + JSON gate (Hono middleware)
│   ├── settings-store.ts     # NEW  2nd node:fs importer; FileSettingsStore + MemorySettingsStore
│   ├── project-registry.ts   # NEW  entries, identity, slug allocation, lazy runtime, LRU, dispose
│   ├── project-runtime.ts    # NEW  extracted closure of today's createApp
│   ├── project-api.ts        # NEW  today's handlers bound to a resolved runtime, relative paths
│   ├── registry-api.ts       # NEW  createRegistryApp: guard + /api/projects routes + mount
│   ├── folder-scan.ts        # NEW  pure walk over an injected listing function
│   ├── sketch-files.ts       # prefix becomes per-request (/api/projects/<slug>/sketch-files/)
│   └── index.ts              # createApp(source) wrapper kept; parseCli -> list; startServer(paths)
└── web/
    ├── api.ts                # NEW  projectUrl(slug, path), apiFetch (handles 403 -> refused copy)
    ├── query-keys.ts         # NEW  projectsKey, projectKey(slug, ...rest)
    ├── components/
    │   ├── project-switcher.tsx, project-row.tsx, add-project-form.tsx, project-add-dialog.tsx,
    │   └── project-scan.tsx
    └── pages/
        ├── projects-page.tsx           # landing
        ├── project-layout.tsx          # replaces ProjectGate
        └── unknown-project-page.tsx
```

### Pattern 1: One project API, resolved per request (Hono spike)
**What:** `createProjectApi(resolve)` returns one `Hono` whose first middleware runs `resolve(c)` and stores the runtime on the context; every handler reads it. The registry app mounts it with `app.route('/api/projects/:slug', projectApi)`; the legacy wrapper `createApp(source)` mounts the same factory at `/api` with a resolver that ignores the slug.
**When to use:** all existing `/api/*` read handlers and refresh.
**Evidence:** spike in this session against Hono 4.13.4: `app.route('/api/projects/:slug', sub)` exposes `c.req.param('slug')` in the sub-app's handlers and in `sub.use('*', ...)`; an unknown slug can be answered 404 from the middleware; the pre-registered `ALL /api/*` fallback still answers 404 JSON for everything else; `app.routes` lists the merged routes (used by the refusal test). The alternative (a rewritten `Request` per slug) also works but is unnecessary. [VERIFIED: spike.mjs, spike2.mjs, spike3.mjs run in this session's scratchpad]
**Example (proposed skeleton, new code):**
```typescript
// Source: spike2.mjs result, adapted. Proposed, not yet in the repo.
type Env = { Variables: { runtime: ProjectRuntime } };
export function createProjectApi(resolve: (c: Context) => Promise<ProjectRuntime | null>): Hono<Env> {
  const api = new Hono<Env>();
  api.use('*', async (c, next) => {
    const runtime = await resolve(c);
    if (!runtime) return c.json({ error: 'unknown project' }, 404);
    c.set('runtime', runtime); // D-05 carries over: handlers capture runtime.derived as their first statement
    await next();
  });
  api.get('/presentation', (c) => c.json(c.get('runtime').derived.presentation));
  // ... the other handlers moved from createApp, unchanged
  return api;
}
// registry app:  app.route('/api/projects/:slug', createProjectApi((c) => registry.runtime(c.req.param('slug'))))
// legacy wrapper: app.route('/api', createProjectApi(async () => fixedRuntime))
```

### Pattern 2: Settings mutation = read, pure update, atomic write
**What:** `SettingsStore.mutate(fn)` re-reads the file, runs `fn(state) -> state` (slug allocation happens inside `fn`), writes `<dir>/settings.json.<pid>.<rand>.tmp` then `renameSync` over `settings.json`, and returns the new state. Unknown fields on the top level and on entries are preserved. A file whose `version` is newer than the code's is never rewritten (reported instead).
**When to use:** add, forget, open (stamp), scan-add.
**Why:** two instances (a systemd service, a dev run, the Playwright servers) cannot erase each other's entries, and cannot both mint `portal` (PITFALLS 20).
**Schema (proposed):**
```json
{ "version": 1,
  "projects": [ { "target": "/home/u/Work/portal", "slug": "portal", "addedAt": "2026-10-27T10:00:00.000Z", "lastOpened": null } ],
  "lastActive": null }
```
`target` for a local project is the canonical root (realpath); for an ssh project it is `RemoteTarget.rawPath` (passwords are rejected by the parser, so none can be stored). [VERIFIED: src/cli/remote-target.ts:123 `if (url.password !== '') return invalid(rawPath, 'passwords in the address are not supported; use ssh keys');`]

### Pattern 3: Slug allocation (pure, persisted once)
**What:** `candidate = slugOf(target)` (Phase 7), then while `taken.has(candidate)` use `${base}-2`, `${base}-3`, …. `taken` is every slug currently in the list, including unavailable entries; forgotten slugs are free again (D-10). The first project registered keeps exactly its Phase 7 slug, so bookmarks made before Phase 8 stay valid. A persisted slug is validated on read: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, not in `RESERVED_SLUGS`, unique; a bad entry is reported (`A saved project was skipped: {reason}.`) and skipped, never thrown on (D-12).
**Reserved words (verbatim):**
```typescript
// src/presentation/reserved.ts:18-38
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'api', 'assets', 'sketches', 'fonts', 'src', 'public', 'docs', 'test', 'fixtures', 'dist',
  'projects', 'milestones', 'artifacts', 'phases', 'roadmap', 'search', 'traceability',
  'research', 'settings',
]);
```
(one word per line in the source; collapsed here). [VERIFIED: src/presentation/reserved.ts:18-38]
**Identity (de-duplication):** local = realpath of the root; ssh = `ssh:${user ?? ''}@${host.toLowerCase()}:${port ?? 22}:${remoteRoot}` (scheme excluded so `sftp://` and `ssh://` to the same place are one project). This ssh normalisation is a recommendation ([ASSUMED] A3).

### Pattern 4: Registry state machine and LRU
**States in the list DTO:** `unloaded | loading | ready | unavailable`. `unavailable` carries the server's message verbatim (`FailedLoadStatus.message`) and `pathChecked`.
- `registry.runtime(slug)` is lazy, coalesced (one in-flight load per slug) and never throws.
- A failed entry is retried on every `open` (a remounted drive or a reachable ssh host recovers without a restart).
- Local, unloaded entries are re-validated with `resolveTargetPath` when the list is built, memoised for about 10 s, so a deleted folder shows `Unavailable` without a load. ssh entries are never probed by a list call.
- **Memory policy (discretion, decided):** LRU of 5 loaded runtimes. On loading a sixth, dispose the least recently used runtime that has no in-flight request and is not loading; its entry returns to `unloaded`. `dispose()` releases the ssh mirror and sets a flag so the already-scheduled `setImmediate` index build (`createSearchIndexState.buildFrom`, src/server/search-index.ts:252-253) does nothing for a disposed runtime. Rationale: STATE.md already names "a bounded cache starting at five projects" [CITED: .planning/STATE.md Blockers/Concerns]; an ssh project evicted and reopened costs a re-mirror (seconds), which is the accepted price.
- The shiki renderer is already a process-wide singleton, so per-runtime renderers are not a cost. [VERIFIED: src/rendering/markdown.ts:481-487 `let sharedRenderer: Promise<ArtifactRenderer> | null = null;` / `sharedRenderer ??= buildRenderer();`]

### Pattern 5: HTTP surface
| Method | Path | Guard | Notes |
|--------|------|-------|-------|
| GET | `/api/projects` | Host | `{ projects: [{slug, name, displayPath, kind, state, reason, pathChecked, lastOpened}], notices: [...] }`; ordered last-opened first, never-opened in added order |
| POST | `/api/projects` | Host + same-origin + JSON | body `{target}`; 201 new, 200 duplicate (`{duplicate:true, slug}`), 422 `{error, status: FailedLoadStatus}` |
| POST | `/api/projects/scan` | same | body `{folder}`; returns found list with `alreadyAdded`, `capped`, `cap`; refusal outside `$HOME` is a named 422 |
| POST | `/api/projects/add-many` (or the add route taking an array) | same | "Add N" from the checklist; registers without loading |
| DELETE | `/api/projects/:slug` | same | forget; settings only |
| POST | `/api/projects/:slug/open` | same | stamps `lastOpened`/`lastActive` (D-08) and starts the lazy load; idempotent |
| GET/POST | `/api/projects/:slug/{presentation,dashboard,roadmap,history,tree,drawer,traceability,search,artifacts/*,documents,research,sketches,refresh}` | Host (+ same-origin + JSON on POST) | existing handlers, unchanged bodies |
| GET | `/api/projects/:slug/sketch-files/*` | Host | moved from `/sketches/*`; CSP sandbox header kept |

The open stamp is a POST on purpose: a GET that writes the settings file could be triggered by a cross-site `<img>`.

### Anti-Patterns to Avoid
- **Passing `placeholderData` / `keepPreviousData` anywhere under the project layout.** Today none exists in `src/web` [VERIFIED: grep this session returned no match]; keep it that way with a standing test.
- **Stamping the slug into server DTO urls.** Phase 7 made DTO urls project-relative; the slug is applied at the edge in `nav.tsx` (ARCHITECTURE Anti-Pattern 3).
- **A `GET` that mutates or accepts a path** (scan as GET would be a directory-listing oracle for any page that can make the request).
- **Putting the settings write behind `PlanningFilesystem`.** The seam's `write: false` is the read-only proof for targets (`capabilities: FsCapabilities = { watch: false, write: false }`, local-fs.ts:33).
- **Reading `Origin` and comparing to `new URL(c.req.url).origin`.** `c.req.url` is built from the Host header, so under DNS rebinding both sides are attacker-chosen (spike: Host `evil.example:PORT` produced `url: "http://evil.example:PORT/h"`). The Host allowlist must run first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Target validation for runtime adds | A second path or ssh parser | `parseRemoteTarget` then `resolveTargetPath` (D-17) | Already handle leading `-`, host and user patterns, `shell: false`, tilde, symlinks, permission-denied |
| Slug derivation | A new kebab function | `slugOf` + reserved words + `allocateSlug` suffixing | Must reproduce Phase 7 slugs so existing bookmarks survive |
| Load-failure screen and wording | New error UI | `InvalidProjectScreen` + `LOAD_STATUS_MESSAGES` | UI-SPEC: server messages shown verbatim; the screen only gains a "Choose another project" link |
| ssh mirror lifecycle | New process code | `RemoteSnapshotSource` (`load`, `refresh`, `dispose`, `planningFilesystem`) | The registry owns disposal; no second spawn path |
| Tilde expansion for the scan folder | `folder.replace('~', ...)` | Export `expandTilde` from `target-path.ts` | Same behaviour as the CLI argument; `~` only at start |
| Query key strings | Inline arrays | `query-keys.ts` factory + a standing source-scan test | A missed key is a cross-project data leak |
| Popover, dialog, checkbox, field | Custom widgets | Base UI primitives (`document-outline.tsx` is the Popover pattern) | Focus handling and aria are already solved |
| Heap measurement | `--expose-gc` runner flags | `v8.setFlagsFromString('--expose_gc')` + `vm.runInNewContext('gc')` | Works inside a vitest worker (verified) |
| CSRF protection | `hono/csrf` as the only gate | `request-guard.ts` | `csrf()` ignores JSON content types |

**Key insight:** every security-relevant primitive this phase needs (target parsing, containment, tmp-dir mirror lifecycle, sandbox CSP) already exists and is tested; the phase's risk is in the seams between them (which request reaches which, where the one write lives, which cache key a response lands in), not in new algorithms.

## Common Pitfalls

### Pitfall 1: Project-relative cache keys collide across projects (PLAT-08)
**What goes wrong:** Phase 7 made DTO urls project-relative, so `/v1.1/phase-5/plan-03` exists in every project. `plan-pair-page.tsx` keys on that string with infinite stale time and pre-seeds a second cache entry:
```typescript
// src/web/pages/plan-pair-page.tsx:66-70 and 48
const query = useQuery({
  queryKey: ['plan-pair', pathname],
  queryFn: () => loadPair(pathname, queryClient),
  staleTime: Number.POSITIVE_INFINITY,
});
queryClient.setQueryData(['artifact-document', route], planDocument);
```
With two projects, opening the same relative path in project B returns project A's plan from cache forever. `['artifact-document', route]` (artifact-page.tsx:630) has the same shape. [VERIFIED: plan-pair-page.tsx:48, 66-70; artifact-page.tsx:630]
**How to avoid:** the key factory is the only way to build keys; `setQueryData` calls take their key from the same factory; add a source-scan test (house idiom: `test/helpers/source-scan.ts` `blankComments`/`walkSource`) that fails on any `queryKey: [` or `setQueryData([` literal outside `query-keys.ts`, with a planted positive control.
**Warning signs:** the header shows project B while a plan page shows A's title.

### Pitfall 2: Component state survives a slug change
**What goes wrong:** React Router reuses the same element when `/a` becomes `/b` (both are the `DashboardPage` index child), so `useState` (pagination, filters, open sections) carries over.
**How to avoid:** key the project subtree by slug (`<AppShell key={slug}>` / `<Outlet key={slug} />`) in `ProjectLayout`. Add a contract test that reads `project-layout.tsx` for the `key={slug}`.

### Pitfall 3: The locked Host allowlist refuses the user's own tunnel
**What goes wrong:** the notes record that the real deployment is `labelore.brkn.me` through a Cloudflare tunnel to the local server [CITED: .planning/notes/2026-10-23-sketches-page-in-labelore.md; .planning/debug/resolved/loading-state-regression.md:20]. cloudflared forwards the public hostname as the Host header unless the ingress sets `httpHostHeader` ([ASSUMED] A2). D-18's allowlist is `127.0.0.1`/`localhost` with the server's port, so every `/api/*` call through the tunnel would answer 403 and the app would render blank.
**How to avoid:** do not silently weaken D-18. Ship the guard with an opt-in `LABELORE_ALLOWED_HOSTS` (comma-separated extra `host` or `host:port` values; default empty), and compare an Origin by `new URL(origin).host === hostHeader` (so `https` behind a tunnel works without assuming a scheme). The user must confirm (Open Question 1) before the plan hard-codes either behaviour.

### Pitfall 4: `app.request()` sends no Host, so every existing server test would 403
**What goes wrong:** with Hono's test helper there is no Host header (`{"host":null,"origin":null,"url":"http://localhost/h"}` in the spike). If the guard sits inside `createApp`, the roughly ten server test files that call `createApp(...)` + `app.request('/api/...')` all fail.
**How to avoid:** apply the guard in `createRegistryApp` only; `startServer` always builds the registry app; the legacy wrapper stays guard-free and is documented as test-only. Add a real-socket test (start the server, send `http.request` with `host: 'evil.example:PORT'`; the spike shows this reaches the app with the evil host) so a future change that bypasses the guard in `startServer` fails. For registry-app tests add `test/helpers/guarded-request.ts` that sets `Host`, `Origin` or `Sec-Fetch-Site`, and `Content-Type`. Tests that pin the old in-handler behaviour must be re-pointed: `test/server/refresh.test.ts:271-292` (403 on cross-site; allowed when the header is absent), `test/config-masking.test.ts:163` (`{ method: 'POST', headers: { 'sec-fetch-site': 'same-origin' } }`).

### Pitfall 5: Playwright and fixture-server readiness probes point at a route that moves
**What goes wrong:** `playwright.config.ts` waits on `url: 'http://127.0.0.1:4199/api/dashboard'` and `url: 'http://127.0.0.1:4198/api/dashboard'` (lines 37, 45); `test/playwright-config.test.ts` pins the second one (`expect(servers[1].url).toBe('http://127.0.0.1:4198/api/dashboard')`); `test/e2e/fixture-server.ts` polls `${base}/api/dashboard`. Under the registry app `/api/dashboard` is 404, so the servers never become ready. [VERIFIED: playwright.config.ts:37,45; playwright-config.test.ts; fixture-server.ts]
**How to avoid:** change all three to `/api/projects` in the same task as the route change. Also set `LABELORE_CONFIG_DIR` in each `webServer.env` (distinct mkdtemp dir per server) and in the `spawn` env of `startFixtureServer`; extend `playwright-config.test.ts` to assert it.

### Pitfall 6: Tests and smoke runs write the real settings file
**What goes wrong:** the first test that calls `startServer`/the registry writes `~/.config/labelore/settings.json`. `test:gate` also runs under a swapped HOME (`test/helpers/vitest-gate.mjs` comment), so a HOME-relative default is not stable.
**How to avoid:** (a) a vitest `setupFiles` entry creates a mkdtemp dir and sets `process.env.LABELORE_CONFIG_DIR`; (b) `defaultSettingsDir()` throws when `process.env.VITEST` is set and no override exists, so the convention is mechanically enforced; (c) `--smoke` uses `MemorySettingsStore`; (d) Playwright env as in Pitfall 5. `LABELORE_CONFIG_DIR` is taken to be the directory that directly contains `settings.json` (an override replaces the whole `…/labelore` segment) [ASSUMED] A8. `XDG_CONFIG_HOME` is honoured only when absolute; the spec says relative values should be ignored and an empty value means `$HOME/.config` [CITED: specifications.freedesktop.org/basedir/latest].

### Pitfall 7: A bad CLI path pollutes the remembered list forever
**What goes wrong:** D-09 says every project opened is remembered; a typo (`~/Wrok/x`) would persist as "Unavailable" until forgotten.
**How to avoid ([ASSUMED] A5, confirm):** persist a CLI path only when it validates (local: `resolveTargetPath` ok; ssh: `parseRemoteTarget` ok). A CLI path that fails validation appears for this run as a session-only `unavailable` row with the reason and is not written. Remembered entries that later stop validating stay listed (D-10).

### Pitfall 8: The scan is a directory-listing oracle and a sync-IO stall
**What goes wrong:** a scan folder outside `$HOME`, or a symlink inside it pointing outside, reveals existence. Lexical checks alone miss symlinks; realpath alone leaks existence of non-existent outside paths through a different error.
**How to avoid:** expand `~`, `path.resolve`, check lexical containment in `homedir()` first (refuse with the named reason without touching disk), then `canonicalizePath` the folder and re-check containment against `canonicalizePath(homedir())`. Walk with an async `readdir(withFileTypes)` primitive from `local-fs.ts`, skip `Dirent.isSymbolicLink()`, never follow, skip dot-directories and `node_modules`, keep descending below a match up to the depth cap (nested projects), stop at the result cap and report `capped`. Take `home` as a parameter so tests do not depend on the real `$HOME`. The sync `resolveTargetPath` re-validation of unloaded entries blocks the loop only for stat-class calls; memoise it.

### Pitfall 9: Evicting a runtime under an in-flight request
**What goes wrong:** the LRU disposes an ssh mirror directory while a sketch-file or document request is reading from it.
**How to avoid:** count in-flight requests per runtime in the resolve middleware (increment on resolve, decrement in a `finally` after `next()`); the LRU skips runtimes with a non-zero count. A request for an evicted entry waits on the coalesced reload.

### Pitfall 10: The presentation's slug is derived, the registry's is persisted
**What goes wrong:** `toProjectPresentation` stamps `projectSlug: slugOf(snapshot.rootPath)` in two places (`emptyPresentation` ~line 581 and the main return ~line 731 of `src/server/project-presentation.ts`). For `portal-2` the payload would claim `portal`, and the client's slug-vs-response check (or the "wrong project" logic) breaks. [VERIFIED: grep this session, project-presentation.ts lines 581 and 731]
**How to avoid:** `toProjectPresentation(snapshot, slug = slugOf(snapshot.rootPath))`; `ProjectRuntime` passes the registry slug. The default keeps the existing tests unchanged.

### Pitfall 11: Sandboxed sketches can reach the new endpoints
**What goes wrong:** sketch scripts run in an opaque origin but can still send requests to the app; a mutating endpoint without a strict origin check would accept them.
**How to avoid:** the guard refuses `Origin: null` and `Sec-Fetch-Site: cross-site` on non-GET; add that case to the refusal table. Keep `Content-Security-Policy: sandbox allow-scripts` on every response of the moved route (including 308 and errors) as the existing middleware does (`SECURITY_HEADERS`, sketch-files.ts). `sketchViewUrl` (presentation/sketches.ts:155) returns `/sketches/<folder>/`; the DTO must become project-relative and the client builds `/api/projects/${slug}/sketch-files/<folder>/`. The 308 `Location` stays built from the validated raw pathname.

### Pitfall 12: Node runs the server as TypeScript with type stripping
`package.json` scripts run `node src/server/index.ts` and `engines` is `>=22.18.0`; only erasable TypeScript runs. Do not use `enum`, `namespace` or constructor parameter properties in any `src/server`, `src/cli` or shared file (declare fields and assign in the constructor, as `RemoteSnapshotSource` does). Use `.ts` import specifiers (`allowImportingTsExtensions` is on).

### Pitfall 13: Existing contract tests pin the markup this phase changes
Expect to update, not delete: `test/web/invalid-project-contract.test.ts` (pins `element: <ProjectGate />`, the `fetchPresentation` import line and absence of `element: <AppShell />`), `test/web/project-routes-match.test.ts` (pins `appRoutes.map(path) == ['/', '/:project']`; still true if the landing stays at `/`), `test/web/project-path.test.ts` (`projectGateOutcome`), `test/web/navbar-contract.test.ts:285` (brand `title` from `rootPath`, aria-label starting with `Labelore`), `test/web/build-splitting.test.ts` (mentions ProjectGate and the eager `InvalidProjectScreen`), `test/web/loading-state-contract.test.ts:237` (reads the router), `test/web/refresh-contract.test.ts` (reads `snapshot-status.tsx`), `test/web/nav-contract.test.ts` (extend with the key-literal and `fetch('/api/` rules), `test/presentation/project-slug.test.ts`, `test/server/sketch-files.test.ts` and `test/presentation/sketches.test.ts` (`routesToApp`, `/sketches/` prefix). [VERIFIED: grep -l across test/ this session]

## Code Examples

All skeletons below are proposed new code, shown to fix the shape; identifiers that already exist are quoted in the sections above.

### Request guard (proposed)
```typescript
// src/server/request-guard.ts
import type { MiddlewareHandler } from 'hono';

export interface HostPolicy {
  setPort(port: number): void;            // called after listen(); until then every request is refused
  allows(hostHeader: string | undefined): boolean;
}

export function createHostPolicy(extraHosts: readonly string[] = []): HostPolicy {
  let port: number | null = null;
  return {
    setPort(next) { port = next; },
    allows(host) {
      if (!host || port === null) return false;
      const value = host.toLowerCase();
      if (value === `127.0.0.1:${port}` || value === `localhost:${port}`) return true;
      return extraHosts.includes(value);   // opt-in LABELORE_ALLOWED_HOSTS, default empty
    },
  };
}

const isMutating = (method: string): boolean => method !== 'GET' && method !== 'HEAD';

export function createRequestGuard(policy: HostPolicy): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header('host');
    if (!policy.allows(host)) return c.json({ error: 'refused', reason: 'host' }, 403);
    if (isMutating(c.req.method)) {
      const site = c.req.header('sec-fetch-site');
      const origin = c.req.header('origin');
      // sec-fetch-site, when present, is authoritative; otherwise Origin must name the Host it was sent to.
      const sameOrigin = site !== undefined ? site === 'same-origin' : origin !== undefined && originHost(origin) === host?.toLowerCase();
      if (!sameOrigin) return c.json({ error: 'refused', reason: 'cross-site' }, 403);
      if (!/^application\/json\b/i.test(c.req.header('content-type') ?? '')) {
        return c.json({ error: 'refused', reason: 'content-type' }, 415);
      }
    }
    await next();
  };
}
function originHost(origin: string): string | null {
  try { return new URL(origin).host.toLowerCase(); } catch { return null; }   // 'null' -> null -> refused
}
```
Register it with `app.use('/api/*', guard)` before any route, and before the `ALL /api/*` 404 fallback.

### Refusal test over every registered route (proposed)
```typescript
// Hono lists merged routes; the spike printed e.g. 'POST /api/projects/:slug/refresh'.
const routes = registryApp.routes.filter((r) => r.path.startsWith('/api/') && r.method !== 'ALL');
for (const r of routes) {
  const url = r.path.replace(':slug', 'lendshed').replace('*', 'x');
  // 1) foreign Host -> 403 on every route, and no side effect (settings file bytes, list, refresh spy unchanged)
  // 2) non-GET: foreign Origin + cross-site; Origin 'null'; neither header; same-origin but text/plain -> refused
  // 3) positive control: correct Host + same-origin + JSON passes the guard
}
```
Assert that the set of routes the loop covered equals `registryApp.routes` minus the 404 fallback, so a newly added route that the table does not know about fails the test.

### Query-key factory and slug-aware fetch (proposed)
```typescript
// src/web/query-keys.ts
export const projectsKey = ['projects'] as const;
export const projectKey = (slug: string, ...rest: readonly unknown[]) => ['project', slug, ...rest] as const;
// src/web/api.ts
export const projectUrl = (slug: string, path: string) => `/api/projects/${encodeURIComponent(slug)}${path}`;
```
The list query uses `staleTime: 0` (UI-SPEC: re-read each time the popup opens). Mutations send `Content-Type: application/json` and a body (`{}` when empty). A 403 from the guard maps to the "Request refused" copy; a network failure maps to "Labelore could not be reached".

### Folder scan core (proposed)
```typescript
// src/server/folder-scan.ts : pure, takes the listing function so it is testable and fs-free
export async function scanForProjects(opts: {
  root: string; list: (abs: string) => Promise<Array<{ name: string; isDirectory: boolean; isSymlink: boolean }>>;
  maxDepth: number; cap: number;
}): Promise<{ found: string[]; capped: boolean }> { /* BFS; skip symlinks, dot-dirs, node_modules; a dir containing '.planning' is a hit; keep descending */ }
```

### Heap-bounded test shape (proposed)
```typescript
import v8 from 'node:v8'; import vm from 'node:vm';
v8.setFlagsFromString('--expose_gc'); const gc = vm.runInNewContext('gc') as () => void;
// register 8 made-up projects, cap 5. Cycle through all 8 for 3 rounds, gc(), record heapUsed per round.
// Assert: loadedCount() <= 5 after every switch; dispose spy called for each eviction; ssh mirror dir removed;
// and heap after round 3 <= heap after round 1 * 1.25 (a growth ratio, not an absolute budget: TEST-01).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One `createApp` closure per process | `ProjectRuntime` per project behind a keyed registry | This phase | Nothing outside a runtime may hold a snapshot |
| `POST /api/refresh` passes an absent `sec-fetch-site` | Shared guard: absent proof of same-origin is refused | This phase | curl and the old tests need explicit headers |
| `/sketches/*` served at the app root | `/api/projects/:slug/sketch-files/*` | This phase | Removes `/sketches/` from `SERVER_OWNED_PREFIXES`; iframe URL is built with the slug |
| `queryClient.invalidateQueries()` for everything on refresh | `invalidateQueries({ queryKey: projectKey(slug) })` plus `projectsKey` | This phase | Refreshing one project never refetches another |

**Deprecated/outdated:**
- `projectGateOutcome` / the "wrong-project" page: replaced by the registry-backed unknown-slug screen.
- `RootRedirect`: `/` is the landing page and never redirects (D-01).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Browsers send `Sec-Fetch-Site` for `http://127.0.0.1` and `http://localhost` (potentially trustworthy URLs). MDN states the header is only sent to potentially trustworthy URLs but the fetched page did not spell out localhost | Pitfalls / guard | If not sent, the guard falls back to the `Origin` comparison, which works for POST/DELETE in all current browsers; a Playwright test against real Chromium proves the chosen path |
| A2 | cloudflared forwards the public hostname as the Host header unless `originRequest.httpHostHeader` is set | Pitfall 3 | If it already rewrites to the local address, D-18 works through the tunnel unchanged and `LABELORE_ALLOWED_HOSTS` is unnecessary |
| A3 | ssh identity ignores scheme and treats a missing port as 22 | Pattern 3 | `sftp://h/p` and `ssh://h/p` would list twice (harmless duplicate) |
| A4 | An LRU cap of 5 is enough and the right default | Pattern 4 | Re-mirroring an ssh project on switch-back is slow if the user works across more than 5 projects |
| A5 | A CLI path that fails validation is shown for the run but not persisted | Pitfall 7 | If the user expects typos to stay listed, the entry would vanish after restart |
| A6 | Row and trigger display name is the folder basename (`projectDisplayName(null, rootPath)`), stable and independent of load state | Open Question 2 | Header changes from the PROJECT.md title (today) to the folder name for projects whose title differs |
| A7 | The scan includes the scanned folder itself (depth 0) and prunes `dist build target vendor fixtures __fixtures__ test tests reference` in addition to D-15's three | Pitfall 8 | Surprising hits (Labelore's own `fixtures/*`) or surprising omissions |
| A8 | `LABELORE_CONFIG_DIR` names the directory that directly contains `settings.json` | Pitfall 6 | Test setups written against the other reading point at the wrong path |
| A9 | Settings directory mode 0700 and file mode 0600 are acceptable | Pattern 2 | None practical; paths are personal data |
| A10 | JSON bodies for add and scan are tiny; cap at about 4 KB with `hono/body-limit` | Pattern 5 | A pathological but valid ssh target above the cap is refused |
| A11 | Vitest `setupFiles` can set `LABELORE_CONFIG_DIR` before any test module reads it | Pitfall 6 | A module that reads the env at import time before setup would see it unset; the `VITEST` throw makes that fail loudly rather than silently |

## Open Questions (RESOLVED)

All five questions are answered. Each item below keeps its original text and ends with a
**RESOLVED** line naming the decision or plan that settles it.

1. **Host allowlist versus the Cloudflare tunnel (needs the user).**
   - What we know: D-18 is locked as "127.0.0.1/localhost with the server's port"; the user's own notes describe `labelore.brkn.me` through a Cloudflare tunnel; code comments in `src/server/index.ts` record that the tunnel origin runs the server.
   - What's unclear: whether that tunnel is still in use and whether it rewrites the Host header.
   - Recommendation: implement D-18 as written, plus an opt-in `LABELORE_ALLOWED_HOSTS` (default empty) and the Origin-host comparison in the guard sketch. Ask the user in the plan checkpoint whether to keep the escape hatch or drop it.
   - **RESOLVED:** the user kept the escape hatch as D-20 (opt-in `LABELORE_ALLOWED_HOSTS`, empty by default, Origin compared by `new URL(origin).host` against the validated Host). Plan 08-03 builds it in `src/server/request-guard.ts` (`createHostPolicy`, `parseAllowedHosts`).
2. **Display name in the switcher: folder name or PROJECT.md title?**
   - What we know: UI-SPEC takes the trigger name from `GET /api/projects`, not from the presentation query; D-02 says listing never loads; today's header uses the PROJECT.md title.
   - What's unclear: whether the name may change after the project loads.
   - Recommendation: folder basename for every row (stable, no flip, no load needed). If the title is wanted later, persist a `name` hint in the settings entry (the schema tolerates added fields).
   - **RESOLVED:** the user chose the PROJECT.md title with a folder-basename fallback (D-21), read cheaply without loading the project; the slug still comes from the basename (D-11). Plan 08-16 builds `readProjectTitle` in `src/server/project-title.ts` and persists an ssh name hint through `setNameHint`. Assumption A6 is superseded.
3. **Scan copy gaps.** UI-SPEC has no copy for a scan that stops early (visited-directory valve) or for a scan folder that does not exist inside `$HOME`. Recommendation: reuse "{folder} is outside your home folder…" for outside, and add one row for a missing folder; use only the result cap (no time budget) at depth 2, with a silent visited-directory valve mapped to the existing cap notice. The planner should add the missing copy rows to the Copywriting contract.
   - **RESOLVED:** plan 08-07 defines `SCAN_MESSAGES` in `src/server/folder-scan.ts` (outside home, missing folder, not a folder, unreadable, empty field), with a result cap of 100 and a silent visited-folder valve of 5,000 that shows the existing capped notice; plan 08-13 records the new rows in the 08-UI-SPEC.md Copywriting Contract.
4. **Add-from-settings-inside-project refusal copy.** If a target's `.planning` contains the settings directory the add must be refused; no copy exists. Recommendation: one named message, shown in the add error region.
   - **RESOLVED:** plan 08-16 adds the settings-inside message to the registry's add path ("Labelore keeps its own settings inside this project ({settings dir}), so it will not add it. Set LABELORE_CONFIG_DIR to a folder outside the project and restart."), shown in the add error region; plan 08-13 records it in the 08-UI-SPEC.md Copywriting Contract together with the other plan-time rows. The related startup case, a CLI path that fails validation, is D-22 (listed for the run only, never persisted), also built in 08-16.
5. **Phase 7 completion.** STATE.md says Phase 7 plan 5 of 10; plans 05-10 are unexecuted. Phase 8 tasks that edit `app-router.tsx`, `routes.ts`, `plan-pair-page.tsx`, `artifact-page.tsx` and the DTO urls should cite Phase 7's plan outputs, and Phase 8 execution must wait for Phase 7 to finish.
   - **RESOLVED:** Phase 7 is complete (07-10-SUMMARY.md and 07-VERIFICATION.md exist). Plans 08-01, 08-05, 08-06 and 08-08 each carry a runnable precondition, `test -f .planning/phases/07-recognised-files-and-readable-urls/07-10-SUMMARY.md`, on their first task, and their read_first lists name the files as Phase 7 left them.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Server, tests (type stripping) | yes | v22.22.0 (`engines >=22.18.0`) | — |
| npm | Scripts | yes | bundled with Node 22 | — |
| git | commit log, file dates (existing) | yes | /usr/bin/git | — |
| tar | ssh mirror extraction (existing) | yes | /usr/bin/tar | — |
| ssh client | Real ssh adds | no (not on PATH here) | — | Tests inject a `MirrorRunner` (`RemoteSnapshotSource` accepts `runner`); real-ssh checks stay manual |
| Playwright Chromium | Sketch screenshot checks, multi-project spec | yes | `/opt/pw-browsers/chromium-1243`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, @playwright/test 1.63.0 | — |
| `~/Work` tree | Real-tree scan timing | no (`/root/Work` absent; `HOME=/root`) | — | Build a synthetic tree in a mkdtemp directory and pass `home` into the scan |
| `XDG_CONFIG_HOME` | Settings path | unset here | — | Falls back to `$HOME/.config/labelore` |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** ssh client (injected runner), `~/Work` (synthetic tree).

## Validation Architecture

Skipped: `workflow.nyquist_validation` is `false` in `.planning/config.json`. The standing tests this phase must add or change are listed under Pitfalls 1, 4, 5, 6, 9, 13 and the Code Examples (refusal table over `app.routes`, settings disjointness and byte-identical-target test, `portability.test.ts` importer gate from one file to exactly two, `local-fs.ts` import pin, key-literal scan, heap-growth ratio, multi-project Playwright spec at 1280px and 390px, light and dark, with a loaded, a loading, an unavailable and an `ssh://` row).

## Security Domain

`security_enforcement` is enabled (ASVS level 1, block on high).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local single-user tool; no accounts |
| V3 Session Management | no | No sessions; D-08 forbids a server-side active project |
| V4 Access Control | yes | `request-guard.ts`: Host allowlist on `/api/*`; same-origin required on every non-GET |
| V5 Input Validation | yes | Hand validation of `{target}` and `{folder}` (string, length, no NUL); targets only through `parseRemoteTarget` then `resolveTargetPath`; slug format and reserved words on read |
| V6 Cryptography | no | None stored; ssh passwords are rejected by the parser, so none can reach `settings.json` |
| V12 Files and Resources | yes | Scan confined to `$HOME` (lexical then realpath), symlinks skipped; settings path fixed and disjoint from targets; sketch files keep sandbox CSP |
| V13 API | yes | JSON content type required on every non-GET (forces a CORS preflight a cross-site page cannot pass); body size cap |
| V14 Configuration | yes | Settings dir 0700 / file 0600; no CORS headers added on `/api/*` (the sketch route's font `Access-Control-Allow-Origin: *` is existing and font-only) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DNS rebinding to read every project through `/api/*` GETs | Information disclosure | Host allowlist on all `/api/*` including GETs; spike shows a bogus Host reaches the app unchecked without it |
| Cross-site form or `fetch` POST to add, scan, forget, refresh | Tampering | Same-origin proof (`Sec-Fetch-Site: same-origin`, else Origin host equals Host) plus JSON content type; absent proof refused |
| Scan as a directory-listing oracle | Information disclosure | POST only, same-origin, confined to `$HOME`, returns only directories holding `.planning` |
| ssh add spawning a process against a hostile host | Elevation / Tampering | `parseRemoteTarget` (host and user patterns, leading `-` rejected, `shell: false`, `BatchMode=yes`); syntax-only validation at add, connect lazily with the existing 120 s timeout |
| Settings file written inside a target | Tampering | Fixed path at construction, realpath at startup, disjointness check against every registered `.planning`, byte-identical-target test |
| Torn or concurrent settings write | Denial of service / Tampering | Temp file in the same directory plus rename; re-read-merge-write; corrupt file kept as `settings.json.bak`, start empty, notice, never throw |
| Sketch script posting to the API from its opaque origin | Tampering | Guard refuses `Origin: null` and `cross-site`; CSP sandbox on every sketch response |
| Path or error text injected into UI | Tampering | Server messages rendered as React text nodes; the standing raw-HTML guard (`test/web/raw-html-guard.test.ts`) stays at exactly one site |

## Project Constraints (from CLAUDE.md)

- **Read-only access to targets:** the tool must be incapable of damaging planning state it does not own. The settings write is the single sanctioned exception and lives only in `settings-store.ts`; `local-fs.ts` stays read-only (`capabilities: { watch: false, write: false }`).
- **Compatibility:** unknown files and unknown settings fields must degrade, not break (preserve unknown fields; report bad entries).
- **Design:** oklch tokens, shadcn `base-sera`, `@base-ui/react`, lucide, squared corners, light and dark; conventions in `docs/design-language.md`, enforced by `test/web/class-vocabulary.test.ts`. The 14 new class names in 08-UI-SPEC.md section 9 must be added to the design-language tables before the vocabulary test runs, and the `missing` tone row gains the unavailable-project clause.
- **No dependency on studio-portal.**
- **Forward compatibility:** the reader sits behind a boundary that admits multi-project targeting, a file watcher and write-back; the registry and the `PlanningFilesystem` seam keep that boundary (no watcher or write-back ships).
- **Tech stack:** Vite + React + Hono, TypeScript run through Node type stripping; manual `process.argv` parsing (no `commander`), so `parseCli` stays hand-written and gains a path list.
- **GSD workflow enforcement:** repo edits go through a GSD command; this phase is executed via `/gsd-execute-phase`.
- **Test conventions:** zero failures, zero skips (`npm run test:gate`); timing assertions are growth ratios, not millisecond budgets; fixtures are made up (the repository is public).

## Sources

### Primary (HIGH confidence)
- Source read this session: `src/server/index.ts`, `src/server/remote-source.ts`, `src/server/sketch-files.ts`, `src/planning-fs/local-fs.ts`, `src/planning-fs/types.ts`, `src/cli/target-path.ts`, `src/cli/remote-target.ts`, `src/presentation/reserved.ts`, `src/presentation/project-slug.ts`, `src/web/app-router.tsx`, `src/web/nav.tsx`, `src/web/project-path.ts`, `src/web/components/app-shell.tsx`, `src/web/components/snapshot-status.tsx`, `src/web/pages/invalid-project-screen.tsx`, `src/web/pages/plan-pair-page.tsx`, `playwright.config.ts`, `vitest.config.ts`, `eslint.config.js`, `test/portability.test.ts`, `test/e2e/fixture-server.ts`, `test/playwright-config.test.ts`, `test/server/refresh.test.ts`.
- `.planning/research/ARCHITECTURE.md` (Feature 5, Patterns 3 and 4, Build Order), `PITFALLS.md` (16-22), `FEATURES.md` (B.5), `.planning/STATE.md`, `08-CONTEXT.md`, `08-UI-SPEC.md`.
- Spikes run in this session (scratchpad `spike/spike.mjs`, `spike2.mjs`, `spike3.mjs`) against installed Hono 4.13.4 and @hono/node-server 2.1.1: path-parameter mount, rewritten-request dispatch, fixed-prefix mounts, `app.routes` enumeration, Host/Origin behaviour of `app.request()` and a real socket, `v8`+`vm` gc.
- `node_modules/hono/dist/middleware/csrf/index.js` (form-content-type-only behaviour).

### Secondary (MEDIUM confidence)
- MDN, `Sec-Fetch-Site` (values; forbidden header; "only included in requests to potentially trustworthy URLs"): developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
- freedesktop.org basedir spec (`XDG_CONFIG_HOME` default and relative-path rule): specifications.freedesktop.org/basedir/latest
- TanStack Query v5 docs (new key is a new pending query; `keepPreviousData` is opt-in): tanstack.com/query/latest/docs/framework/react/guides/paginated-queries

### Tertiary (LOW confidence)
- cloudflared Host-header forwarding default (training knowledge, A2); localhost counted as potentially trustworthy (A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependencies; versions read from installed packages.
- Architecture: HIGH for the runtime/registry/API split (extends ARCHITECTURE.md and is backed by the dispatch spike); MEDIUM for LRU specifics and the display-name policy (discretionary).
- Pitfalls: HIGH for items verified in code (cache-key collision, test pins, readiness probes, presentation slug sites); MEDIUM for browser-header and tunnel behaviour.

**Research date:** 2026-10-27
**Valid until:** 2026-11-26 (stable stack; revisit if Phase 7 changes `routes.ts`, `nav.tsx` or the DTO url shape before Phase 8 planning)
