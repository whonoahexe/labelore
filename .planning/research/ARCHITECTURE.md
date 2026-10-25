# Architecture Research: v2.1 Wayfinding Integration

**Domain:** Read-only local dashboard over GSD `.planning/` trees (subsequent milestone, integration research)
**Researched:** 2026-10-25
**Confidence:** HIGH on the existing-code integration points (read directly from `src/`), MEDIUM on workstream layout (read from gsd-core source, no real example on this machine), MEDIUM on Hono sub-app dispatch details (verify in a spike)

This file is about how six v2.1 features attach to the architecture that exists. It is not a greenfield design. Every statement about current behaviour was checked against the file named next to it.

## What the existing architecture gives us (and where it fights us)

```
 CLI argv ──> cli/target-path.ts | cli/remote-target.ts      one path, resolved once
                    │
                    v
 planning-fs/   PlanningFilesystem port  (local-fs.ts is the ONLY src/ importer of node:fs)
                    │
                    v
 planning-repo/ discovery.ts  ──> registry.ts (HANDLERS, first match wins, Generic last)
                    │                 └─> handlers/*  ──> ParsedArtifact{kind, frontmatter, body, structured}
                    v
                assemble.ts ──> Project{artifacts, config, milestones, phases, quickTasks, requirements, mentions}
                    │            snapshot.ts: PlanningRepository.refresh() -> immutable ProjectSnapshot
                    v
 server/        index.ts createApp(source): closure state { derived, fileDates, commits, inFlight }
                    │   DerivedViews = { presentation, artifactIndex, referenceRegistry, searchIndexState }
                    │   one bundle captured per request, swapped atomically on refresh
                    v
 presentation/  pure builders over ProjectPresentation DTOs; every builder stamps `url` strings
                    via routes.ts (buildPhaseUrl, buildPlanUrl, buildArtifactUrl, buildMilestoneUrl)
                    v
 web/           react-router createBrowserRouter, 11 route patterns that mirror routes.ts,
                TanStack Query keys like ['presentation'], ['drawer'], ['search','dropdown',q],
                views/ registry: VIEW_KINDS (kinds.ts) + VIEW_MANIFESTS (manifests.ts)
```

Four structural facts drive every decision below.

1. **URLs are generated server-side, by stateless pure functions, and stored in DTOs as strings.** `project-presentation.ts` (lines ~550, 603, 679), `search-index.ts` (line 304, plus at query time in `searchIndex()`), `drawer.ts`, `roadmap.ts`, `dashboard.ts`, `references.ts`, `traceability.ts`, `tree.ts`, `dashboard-ledger.ts` all call `routes.ts`. 26 files under `src/web` import from `react-router`. `routes.ts` is simultaneously the URL grammar, the parser, and (via `presentationRoutePatterns`) the client route table. That coupling is the thing to untangle once, centrally.
2. **There is exactly one project, held in closure variables inside `createApp`.** `derived`, `fileDates`, `commits`, `inFlight`, and the markdown `renderer` are all locals of one function. Multi-project is therefore an extraction (`ProjectRuntime`), not a flag.
3. **Kinds are open strings assigned by position or filename in `discovery.ts`, and the view registry is a three-way sync** between `VIEW_KINDS` (`web/views/kinds.ts`), `VIEW_MANIFESTS` (`web/views/manifests.ts`) and the CSS vocabulary list (`VIEW_LOCAL_PREFIXES`, enforced by `test/web/class-vocabulary.test.ts`). `ViewManifest` (`web/views/manifest.ts`) grows one optional composer field per designed page (`brief`, `securityConsole`, `uatSession`, `learningsRetro`, `debugCase`, ...), and `artifact-page.tsx` (1353 lines) grows one `useMemo` and one render branch per field. Adding 25 more pages this way is the single biggest scaling risk in the milestone.
4. **A new `ArtifactLocation` value is dangerous.** `assemble.ts` keeps only `root | research | milestone-root | other` as "loose" artifacts. A file classified under any new location string that is not added to that filter is parsed and then silently dropped from the project, the index and search. Prefer keeping `other`.

## Recommended Architecture for v2.1

```
 CLI: labelore [path|ssh://...]... [--scan <dir>] [--port]
        │
        v
 src/registry/                          NEW. Labelore's own state, the only thing it ever writes
   project-registry.ts   entries {slug, rawTarget, state: unloaded|loading|ready|failed, runtime?}
   settings-store.ts     reads/writes <config-dir>/labelore/settings.json  (NOT through PlanningFilesystem)
   folder-scan.ts        finds dirs that contain .planning/ (depth <= 2), via a local-fs.ts read helper
        │ lazy: runtime built on first request for a slug
        v
 src/server/project-runtime.ts          NEW. Today's createApp closure, extracted.
   { source, derived, fileDates, commits, inFlight, refresh(), dispose() }
 src/server/project-api.ts              NEW. Today's route handlers, relative paths (/presentation, /dashboard, ...)
 src/server/index.ts                    MODIFIED. createApp(source) kept as a one-project wrapper for tests;
                                        createRegistryApp(registry) adds /api/projects and /api/projects/:slug/*
        │
        v   (planning-repo and below: unchanged shape, extended kinds)
 src/planning-repo/folders.ts           NEW. One table: folder -> kind rule, label, URL segment, order, scope
 src/planning-repo/discovery.ts         MODIFIED. consumes folders.ts, adds `workstream` to refs
        │
        v
 src/presentation/routes.ts             REWRITTEN IN PLACE. Route union + project-relative clean URLs
   (same export names kept: buildPhaseUrl, buildPlanUrl, buildArtifactUrl, buildMilestoneUrl, parsePresentationUrl)
        │
        v
 src/web/                               MODIFIED.
   nav.tsx               NEW. ProjectLink / ProjectNavLink / useProjectNavigate / useProjectPathname (only place that adds the slug)
   query-keys.ts         NEW. ['projects'] and ['project', slug, resource, ...params]
   app-router.tsx        MODIFIED. "/" -> projects landing, "/:project/*" -> ProjectLayout -> RoutedPage (one splat route)
   components/project-switcher.tsx, command-palette.tsx   NEW
   pages/projects-page.tsx, settings-page.tsx, codebase-overview.tsx, workstreams-page.tsx   NEW
```

### Component boundaries

| Component | Responsibility | Talks to | New or modified |
|-----------|---------------|----------|-----------------|
| `planning-repo/folders.ts` | Single table of folder-to-kind rules (codebase, spikes, seeds, threads, reports, intel, graphs, forensics, onboarding, workstreams, plus the existing todos/notes/debug). Pure, no `node:*`, safe to import from the client bundle | `discovery.ts`, `presentation/routes.ts`, `presentation/drawer.ts` | New |
| `planning-repo/discovery.ts` | Classify by position, assign kind via `folders.ts`, tag `workstream` | `naming.ts`, `folders.ts` | Modified |
| `planning-repo/assemble.ts` | Assemble one scope; called once for the root scope and once per workstream | `crossref.ts`, handlers' `structured` | Modified |
| `planning-repo/handlers/*` | Only add a handler where structure cannot come from frontmatter plus the generic section projection (JSON docs, spike manifests, graph summaries) | `registry.ts` | New, few |
| `presentation/routes.ts` | The one URL grammar: Route union, builders, parser, legacy redirect parser | everything that stamps a `url` | Rewritten |
| `server/artifact-index.ts` | Resolve a parsed Route to an artifact; audit that built URLs are injective | `routes.ts` | Modified |
| `server/project-runtime.ts` | Per-project snapshot source, derived bundle, refresh coalescing, commit log, file dates | `planning-repo/snapshot.ts`, `remote-source.ts` | New (extracted) |
| `registry/project-registry.ts` | Slug assignment, lazy runtime creation, add at runtime, disposal | `project-runtime.ts`, `settings-store.ts`, `cli/*` | New |
| `registry/settings-store.ts` | The only write path. Writes one fixed file in Labelore's own config dir | `node:fs` (second sanctioned importer) | New |
| `server/search-index.ts` | Add per-document metadata (kind, milestone, phase, requirement ids, area) so filters and facets are post-filters over one hit list | `presentation/search.ts` | Modified |
| `web/nav.tsx` | Prefix the project slug on every in-app link and navigate | `react-router` | New |
| `web/views/*` | Replace per-kind manifest fields with one generic composed-page mechanism before adding the 25 pages | `artifact-page.tsx`, `manifests.ts` | Modified (refactor) |

## Feature 1: Designed pages for ~25 more file types

### How a new kind flows (current pipeline, with the touch points marked)

```
1 naming.ts          filename grammar, if the name is structured (e.g. SEED-001-slug.md). Add here only.
2 folders.ts (NEW)   position rule: "<top-folder>/..." -> kind. Replaces the growing chain of isXxxPath() in discovery.ts
3 discovery.ts       deriveKind() / positionKind() consult folders.ts; location stays 'other' (see below)
4 registry.ts        HANDLERS: add a handler ONLY if frontmatter + sections are not enough. Order matters: before FrontmatterOnly/Generic
5 Generic handler    projectSections(ref.kind, body) in section-projection.ts runs for any kind with a projection; others get {}
6 serialize/DTO      artifact.kind, frontmatter, structured pass through jsonRecord() unchanged
7 web/views/kinds.ts add the kind to VIEW_KINDS, then manifests.ts entry, then a composer + component pair
8 drawer.ts          folder places listed from folders.ts (not hardcoded)
9 search-index.ts    kind is indexed automatically (SearchDocument.kind); add it to the file-type facet label table
```

Findings that matter for the plan:

- **Most of the 25 need no new handler.** A file whose structure is frontmatter plus headed sections already flows through `GenericMarkdownHandler`. The work is kind derivation (steps 2-3) plus the view composer (step 7). Reserve handlers for: `intel/*.json`, `graphs/graph.json`, `HANDOFF.json`, `.continue-here.md` parsing if it carries structured state, and the spikes MANIFEST.
- **Root documents already have handlers and kinds** (`project`, `roadmap`, `requirements`, `state`, `milestones`, `retrospective`, `windows`), but none is in `VIEW_KINDS` and the dashboard/roadmap/traceability pages cover them. Their "designed page" is a manifest plus composer over data the handlers already put in `structured`. Low discovery risk.
- **Known gap in `deriveKind()`:** `HANDOFF.json` and `estimation-calibration.json` are matched by `JsonConfigHandler` by file name, but `deriveKind()` returns `'unknown'` for them because `CANONICAL_EXACT` (transcribed from gsd-core's `artifacts.cjs`) does not list them. A handoff page needs `kind: 'handoff'`. Do not edit the gsd-core transcription in `naming.ts`; add a Labelore-side exact-name map next to it in `folders.ts` and consult it first in `deriveKind()`. `.continue-here.md` (a dotfile, phase-dir or root) is the same: a filename rule.
- **Kind granularity.** Keep granular kinds (`codebase-stack`, `codebase-architecture`, `spike`, `seed`, `thread`, `report`, `intel-*`, `forensics-report`, ...). The search file-type filter and the drawer labels want fine kinds. Share composers across kinds (the seven codebase documents share one composer family) through a `kind -> composerKey` table, not by coarsening the wire kind.
- **JSON documents need server-side bounding.** `JsonConfigHandler` puts the whole parsed JSON in `frontmatter` and the raw text in `body`, and both flow to the browser and into the search index. A `graphs/graph.json` can be megabytes. New JSON handlers must emit a bounded `structured` summary (counts, top-N nodes) and cap what reaches `body` and the search document. Also redact: `config.json` is indexed and served verbatim today; see Feature 2.

### What changes in discovery's location model for new folders

Keep `location: 'other'` for every flat folder (codebase, spikes, seeds, threads, reports, intel, graphs, forensics, onboarding). This is the same decision the todo and note work made (`positionKind()` in `discovery.ts`: "the tree, search grouping and goldens do not move"), and it avoids the silent-drop hazard in fact 4. The new axis is carried by `folders.ts`, which becomes the single place that answers "what area is this path in":

```typescript
// planning-repo/folders.ts  (pure; imported by discovery, routes, drawer; no node:*)
export interface FolderRule {
  folder: string;                 // first segment under .planning/, e.g. 'codebase'
  label: string;                  // drawer place + search "area" facet
  urlSegment: string;             // first URL segment after the project slug
  order: number;                  // drawer/search ordering (replaces ad-hoc LOCATION_ORDER growth)
  kindOf(relUnderFolder: string[], fileName: string): string | null;
}
export const FOLDER_RULES: readonly FolderRule[] = [ /* codebase, spikes, seeds, threads, ... */ ];
export function folderRuleOf(relPathUnderPlanning: string): FolderRule | null;
```

`isDebugSessionPath`, `isTodoPath`, `isNotePath` fold into this table over time (leave them working; migrate when touched). The URL layer reads `urlSegment`; the drawer reads `label` and `order`. No consumer string-matches a path prefix, which preserves the D-11 rule already stated in `domain/model.ts`.

Two folders need more than a kind:

- **`intel/`, `graphs/`**: JSON and markdown mixed; the rule keys on extension as well as folder.
- **`workstreams/`**: structural, below.

### workstreams/ is a scope, not a folder of files

Source of truth (gsd-core `bin/lib/workstream.cjs`, confidence MEDIUM, no real example found on this machine): workstream mode moves `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md` and `phases/` into `.planning/workstreams/<name>/`; `PROJECT.md`, `config.json`, `milestones/`, `research/`, `codebase/`, `todos/` stay at the root; a workstream may also carry its own `config.json`. When `workstreams/` is absent GSD is in "flat mode" (everything today).

Model it as a nested scope that reuses every existing builder:

1. **Discovery** tags each ref with `workstream: string | null` and classifies the remainder of the path as if the workstream directory were `.planning/` (recursive call on the stripped path). `workstreams/ws1/phases/01-x/01-01-PLAN.md` becomes `location: 'phase'`, `workstream: 'ws1'`. Add `workstream` to `ArtifactRef` (`planning-repo/types.ts`) and to the serialized artifact; refresh `test/__golden__` and `serialize.test.ts`.
2. **Assembly**: split `assembleDomainModel` into `assembleScope(parsed, scopeRoot)` and call it for the root scope and once per workstream. `Project` gains `workstreams: Record<string, ScopedProject>` where `ScopedProject` is the existing shape minus `workstreams`.
3. **Do not widen `PhaseIdentity` with a workstream.** Two workstreams may each have a phase 1, but `PhaseIdentity` is the key in `phaseGroupKey`, the reference registry's phase-local-first resolution, and `search-index` `owners`. Widening it touches every consumer. Per-scope assembly keeps identities unique inside their own scope.
4. **Presentation**: `toProjectPresentation(snapshot, scope?)` builds one `ProjectPresentation` per scope; the derived bundle holds `presentations: { root, workstreams: {name: ...} }`. Dashboard, roadmap, traceability, drawer, and the artifact index all run unchanged against a workstream's presentation.
5. **URLs**: `/<slug>/workstreams` is the index page (new designed page: one card per workstream from its STATE). `/<slug>/workstreams/<name>/...` re-enters the normal grammar (`parse(rest)` with a `scope` field on the Route). API: `/api/projects/:slug/ws/:name/<resource>`.
6. **Search** indexes all scopes in one MiniSearch (paths are globally unique); the workstream is a facet value.

Flag for the phase plan: needs a fixture built from gsd-core's actual `workstream` command output before design, because the layout above is inferred from source, not observed.

## Feature 2: config.json as project settings

Already half there: `Project.config` and `ProjectPresentation.config` carry the parsed map, `JsonConfigHandler` reads it, and `['presentation']` is the app-wide query that every shell component already holds. So:

- **No new endpoint.** The settings page reads `presentation.config` from the existing query.
- **Route:** `/<slug>/settings` (reserved word). Header gear control in `app-shell.tsx` using `ProjectNavLink`. A route rather than a modal so it is deep-linkable and works from any page.
- **Not a document page:** `buildArtifactUrl()` for `kind: 'config'` returns the settings URL; the drawer's "documents" lists skip it. The generic `/file/config.json` URL still opens Source for the raw text.
- **Schema table:** a small `presentation/config-schema.ts` mapping known keys (workflow toggles, git branching templates, model profile, search provider flags) to label and description; unknown keys degrade to a generic key/value row. Do not hardcode a closed key set (the v1.0 "open map" rule).
- **Redaction (security, do now).** `config.json` can carry provider keys. Today its raw text is served in `/api/artifacts` and tokenised into the MiniSearch index. Redact values whose key matches `/key|token|secret|password|credential/i` in `JsonConfigHandler.parse` (both `frontmatter` and `body`), so neither the settings page, Source mode, nor search can leak them. Add a regression test.
- **Workstreams:** a workstream's own `config.json` shows as a second, labelled settings group, not a second page.

## Feature 3: Codebase-only projects

Validity today: `PlanningRepository.checkTargetIsGsdProject()` accepts any target whose `.planning/` exists, so a root path with only `.planning/codebase/` already loads with `loadStatus: ok`, `project.name = basename(rootPath)`, no state, no milestones. What breaks is the experience (empty-state dashboard, Roadmap and Traceability tabs that have nothing) and one validation edge:

- `cli/target-path.ts` `resolveTargetPath()`: when the argument is the `.planning` directory itself, `hasProjectMarker()` requires `PROJECT.md` or `STATE.md`. A codebase-only `.planning` path is therefore rejected as `not-a-gsd-project`. Widen the marker set to `PROJECT.md | STATE.md | config.json | codebase | phases`. Same helper serves the folder scan.
- Add one pure classifier, `classifyProjectShape(project): 'full' | 'codebase-only' | 'empty'`, in `planning-repo/` (codebase-only = at least one `codebase/` artifact and none of STATE, ROADMAP, PROJECT, phases, quick, milestones). Expose it on `ProjectPresentation.shape`. Do not add a new `LoadStatus` variant: D-12's four states are a load-bearing contract and codebase-only is a valid, loaded project.
- **Dashboard:** `dashboard-page.tsx` switches on `presentation.shape`: `'codebase-only'` renders `codebase-overview.tsx` ("mapped, not started": the seven documents as an entry grid, with stack and concerns lifted into the first screen, plus a quiet "no roadmap yet" line). `/api/dashboard` stays the same route; `buildDashboardViewModel` returns a `codebase` section for that shape so the page never reads a file.
- **Navigation:** `app-shell.tsx` hides Roadmap and Traceability for `'codebase-only'` (it already conditionally shows Research and Sketches from `presentation.artifacts`; same mechanism, driven by shape).
- Real fixtures exist on this machine to copy into `test/fixtures` (`Ibis/resoundant/.planning/codebase`, `Sideby/plan.sideby.me/.planning/codebase`); the first has a full `.planning` around it, so strip it down.

## Feature 4: Clean URLs

### Design

URLs are generated from structured identity, not from tokens. The grammar is project-relative (no slug) so `DerivedViews` stay slug-agnostic; the web layer is the single place that prepends `/<slug>` (see `web/nav.tsx`).

```
/                                   projects landing (registry) -- not in routes.ts' project grammar
/<slug>                             dashboard
/<slug>/roadmap | search | traceability | sketches | research | settings | workstreams
/<slug>/v1.1                        milestone page
/<slug>/v1.1/roadmap | requirements | audit        archived milestone documents
/<slug>/v1.1/phase-5                phase page
/<slug>/v1.1/phase-5/plan-03        PLAN + SUMMARY pair page
/<slug>/v1.1/phase-5/plan-03/summary   the SUMMARY artifact itself (verify against plan-pair-page.tsx's matchUrls)
/<slug>/v1.1/phase-5/context        phase artifact by lowercased token (research, verification, uat, ...)
/<slug>/v1.1/phase-5.1/plan-01      decimal phase: dots are legal in a segment
/<slug>/quick                       quick task list
/<slug>/quick/261024-qhq            quick task page (PLAN/SUMMARY pair)
/<slug>/quick/261024-qhq/summary    quick artifact by token
/<slug>/codebase/architecture       folder rule: <urlSegment>/<relpath minus .md>
/<slug>/notes/<name>                folder rule, nested dirs keep their slashes
/<slug>/todos/pending/<name>        folder rule
/<slug>/debug/resolved/<slug>       folder rule
/<slug>/workstreams/<name>[/...]    scope prefix, then the normal grammar
/<slug>/file/<rel path under .planning>   lossless fallback for anything else
```

Rules, each testable:

- **The `file/` form is the bijection's safety net.** Any artifact whose path does not fit a clean rule maps to `file/<relative path>`, which is trivially injective and still readable. Unknown kinds, ad-hoc names, files in unexpected subdirectories, and everything that today uses `a~<encoded path>` land here. The server never opens the path from request text; it only looks it up in the artifact index (existing invariant in `artifact-index.ts`).
- **Milestone segment** is the slugified version (`v1.1`). The live milestone with a null version uses `current`. Segments equal to a reserved word (`roadmap`, `quick`, ...) get a `milestone-` prefix. Any first segment that is not reserved is read as a milestone; the server resolves it against the milestone list and 404s otherwise.
- **Phase segment** is `phase-<number>` with the number normalised the way `phaseNumbersEqual` already treats it (`05` equals `5`; `02.1` becomes `2.1`; a letter suffix lowercases, `12A` becomes `12a`). A project code renders as `phase-abc-5`. Resolution is by `comparePhaseNumbers === 0`, case-insensitive, within (milestone, projectCode). The directory slug is not in the URL.
- **Same phase number across milestones** is disambiguated by the milestone segment (the whole point of putting `v1.1` first). Archived and live phases both carry a `milestoneVersion` after assembly.
- **Plan segment** is `plan-<NN>` using the file's own zero-padded plan number (`parsePlanFileName`), unique within a phase.
- **Artifact token** is the lowercased filename token (`05-CONTEXT.md` becomes `context`, `ROUTE-INVENTORY` becomes `route-inventory`). Clean form applies only when the file's numeric prefix equals its directory's own number string. Otherwise `file/`.
- **Free-form names keep their case** (notes, todos, debug slugs) and strip only a trailing `.md`; `foo.json` keeps its extension, so `foo.md` and `foo.json` cannot collide. A case-only collision, or a name that collides with a reserved segment inside a folder, takes the `file/` form.
- **Heading fragments** keep today's `#heading` handling (`withHeading`, `parseHeading`), unchanged.
- **Old URLs:** keep a small `parseLegacyUrl()` (the current `m~`, `p~`, `a~` grammar) that only produces a Route, and have the router redirect to the new URL. Delete it whenever bookmarks stop mattering; it costs one file.

### Where it lives, and why stateless builders are enough

`src/presentation/routes.ts` stays the single module, keeps its export names (`buildMilestoneUrl`, `buildPhaseUrl`, `buildPlanUrl`, `buildArtifactUrl(identity, path, heading?)`, `parsePresentationUrl`) so its ~50 importers and `test/presentation/routes.test.ts` change in expectations, not in shape. Internally it becomes:

```typescript
export type Route =
  | { kind: 'dashboard' } | { kind: 'page'; page: PageName }
  | { kind: 'milestone'; milestone: string | null }
  | { kind: 'phase'; milestone: string | null; phase: PhaseAddress; heading?: string }
  | { kind: 'plan'; milestone: string | null; phase: PhaseAddress; planNumber: string; heading: string | null }
  | { kind: 'document'; address: DocumentAddress; heading: string | null }   // phase|quick|milestone|root|folder|file
  | { kind: 'workstream'; name: string; inner: Route };
export function buildUrl(route: Route): string;          // single URL generator
export function parseRoutePath(pathname: string): RouteParseResult;   // single parser, replaces presentationRoutePatterns
export function addressOfPath(identity, relPath): DocumentAddress;    // path -> address, stateless
```

`buildArtifactUrl(identity, path)` can stay stateless because the address is a pure function of the relative path plus the phase identity (the milestone for a live phase comes from `identity`). That is what keeps the ~10 DTO builders unchanged.

**Collisions that no stateless rule can see** (two phase directories with the same normalised number in one milestone, as a branch-merge accident could create) are handled by an audit, not by threading a route table through every builder: `buildArtifactIndex()` builds `urlByPath` and `pathByUrl` once per bundle and, on a duplicate URL, adds an `assembly` ParseWarning naming both paths, with the first (sorted) winning the clean URL. If this ever fires in a real corpus, the fallback is a `RouteTable` held on `ProjectPresentation` and read by the builders; do not pay for it now.

**Client route table.** Replace the 11 `presentationRoutePatterns` entries in `app-router.tsx` with one `/:project/*` route whose element calls `parseRoutePath(splat)` and switches on `route.kind` to pick the lazy page. The pattern list and the parser can then never drift. `presentationRoutePatterns.dashboard` and friends become `buildUrl({ kind: 'dashboard' })` calls through `nav.tsx`.

**Lookup:** `artifact-index.ts` `lookupRoute(route)` resolves a Route (phase/plan/document/file) to an artifact. `/api/documents?route=` now carries a project-relative path (`?route=/v1.1/phase-5/plan-03`). `/api/artifacts/*` is replaced by the same `route=` form; `file/` covers the old token use.

**Property test (required):** for every artifact in every fixture, `lookupRoute(parseRoutePath(buildArtifactUrl(...)))` returns that same artifact, and no two artifacts share a URL. This test is the definition of "bijective enough".

## Feature 5: Multi-project

### Project slug

`slug = kebab(basename(rootPath))` (for ssh targets, the target's `label`). Not `PROJECT.md`'s title: titles contain spaces and punctuation and change. On collision between registry entries, suffix `-2`, `-3`. The slug is persisted with the entry the first time it is assigned, so URLs and bookmarks stay stable. Reserved slugs that cannot be used: `api`, `assets`, `projects`, `sketches`. (Slugs are always the first path segment, so they cannot collide with `roadmap` or `quick`; the reserved set exists for server routing only.)

### Registry

```typescript
interface RegistryEntry {
  slug: string;
  rawTarget: string;            // as typed: "~/Work/x" or "ssh://host/path". Resolved at load, never persisted resolved
  source: 'cli' | 'scan' | 'remembered' | 'added';
  state: 'unloaded' | 'loading' | 'ready' | 'failed';
  loadStatus?: LoadStatus;      // failures keep the existing named-path screen (InvalidProjectScreen)
  runtime?: ProjectRuntime;
  lastOpened?: string;
}
```

- **Startup sources, merged in this order:** positional CLI paths (any number, each also remembered), `--scan <dir>` results, then the remembered list from `settings.json`. No arguments and no remembered entries: current working directory, as today. With arguments, the first CLI path is the "active" one for the `/` redirect.
- **Folder scan** (`folder-scan.ts`): directories containing `.planning/` to depth 2 (this machine nests `~/Work/<group>/<project>`), skipping dot-directories and `node_modules`, capped (for example 200 hits). It needs directory listing, so the read helper goes in `planning-fs/local-fs.ts`, which stays the only read-side `node:fs` importer. A codebase-only `.planning/` qualifies.
- **Lazy loading:** an entry is `unloaded` until its first API request, then `loading` (ssh targets take seconds), then `ready` or `failed`. `GET /api/projects` returns the cheap list (slug, name, path, state, lastOpened) without forcing a load. One failed project never affects another or the server. Keep every loaded runtime in memory for the session; a project is a few hundred files and one MiniSearch index, so an eviction policy is not warranted for a personal tool. Add LRU only if more than about ten large projects are routinely open.
- **Add at runtime:** `POST /api/projects { target }` (same same-origin gate `/api/refresh` already applies) validates through `parseRemoteTarget` / `resolveTargetPath`, assigns a slug, persists, and returns immediately with `state: 'loading'`; the switcher polls `['projects']` while any entry is loading. An ssh add reuses `RemoteSnapshotSource`; the registry owns disposal for all of them (generalise `registerDisposal` to `registry.dispose()`).
- **Settings store.** `<XDG config dir>/labelore/settings.json`: `{ version, projects: [{rawTarget, slug, lastOpened}], lastActive }`. Atomic write (temp file plus rename inside Labelore's own directory). This is the only write in the program. It must not live in `local-fs.ts`, whose read-only character is the proof of the target guarantee. Instead: `settings-store.ts` is a second, explicitly allow-listed `node:fs` importer whose path is fixed at construction and refuses anything outside Labelore's config dir; update the `portability.test.ts` gate from "exactly one importer" to "exactly these two files", and add assertions that `local-fs.ts` exports no write function and `settings-store.ts` imports neither `PlanningFilesystem` nor any target path. `PlanningFilesystem.capabilities.write` stays false everywhere.

### Server

Extract, do not rewrite:

- `server/project-runtime.ts`: the locals of today's `createApp` (`derived`, `buildDerivedViews`, `fileDates`, `commits`, `inFlight`, the refresh coalescing and atomic swap) become one class. The D-05 single-bundle-per-request discipline is unchanged because it was always about one runtime's `derived`.
- `server/project-api.ts`: today's handlers, bound to a runtime, with relative paths (`/presentation`, `/dashboard`, `/roadmap`, `/drawer`, `/search`, `/documents`, `/refresh`, ...).
- `createApp(source)` stays as a thin wrapper that mounts one runtime at `/api/*`, so the existing server tests (`derived-snapshot-isolation`, `refresh`, `artifact-response`, `deep-links`, `search-index`, ...) keep working unmodified while new tests target the registry app.
- `createRegistryApp(registry)` adds `GET /api/projects`, `POST /api/projects`, and `/api/projects/:slug/*`. Dispatch by resolving the runtime from `:slug` and delegating to that runtime's own Hono instance with the prefix stripped (a rewritten `Request`). That is certain to work; the alternative (`app.route('/api/projects/:slug', sub)` with a path parameter in the base) probably works in Hono 4 but verify before relying on it.
- `/api/refresh` becomes per project (`POST /api/projects/:slug/refresh`).
- **Sketch files:** the raw-file route `/sketches/*` collides conceptually with the client page `/<slug>/sketches`, and it serves from one filesystem. Move it to `/api/projects/:slug/sketch-files/*` (and update `routesToApp()`, `sketch-files.ts`'s `SKETCH_URL_PREFIX`, and the iframe URLs in `sketches-page.tsx`). Keep the per-response header hardening it already has.
- Smoke mode (`--smoke`) probes `/api/projects` then the first project's `/dashboard`.

### Client and TanStack Query

- **One key factory** (`web/query-keys.ts`): `['projects']` for the registry, `['project', slug, resource, ...params]` for everything else (`presentation`, `dashboard`, `roadmap`, `drawer`, `traceability`, `research`, `sketches`, `search`, `document`, `plan-pair`). There are currently about a dozen ad-hoc literals (`['presentation']`, `['search','dropdown',q]`, `['plan-pair', location.pathname]`, `['artifact-document', route]`); replace them all, with a lint-level test that no `queryKey: ['` literal remains outside the factory.
- **Refresh** (`snapshot-status.tsx` calls `queryClient.invalidateQueries()` for everything today) becomes `invalidateQueries({ queryKey: ['project', slug] })` so refreshing one project does not refetch the others.
- **Switching projects** costs nothing and keeps each project's cache warm for `gcTime`, because keys differ by slug.
- **`/:project` layout** replaces `ProjectGate`: reads `useParams().project`, runs the `presentation` query for that slug, shows `InvalidProjectScreen` for a failed project (already exists) and a "no such project" screen with the switcher for an unknown slug. `AppShell` gains the project switcher in the brand area (the brand currently shows `projectDisplayName` and `rootPath`).
- **`web/nav.tsx`** exports `ProjectLink`, `ProjectNavLink`, `useProjectNavigate`, `useProjectHref`, `useProjectPathname`. Everything that gets a `url` from a DTO passes it through these. Add an ESLint `no-restricted-imports` rule banning `Link`, `NavLink`, `useNavigate` and `useLocation` from `react-router` outside `nav.tsx`. This touches the 26 router-importing files mechanically, but it is the only way the slug rule stays enforced. `drawer-route.ts`'s `holdsFile(url === pathname)` keeps working because the client passes the slug-stripped pathname (`useProjectPathname`).
- **`/`** renders the projects landing page (registry list, scan, add form); with `lastActive` set and a CLI path given it redirects to that project.

## Feature 6: Search grouping, filters, and the Cmd-K palette

Current shape (`server/search-index.ts`, `presentation/search.ts`, `web/components/search-field.tsx`, `web/pages/search-page.tsx`): one MiniSearch per bundle, `searchIndex(state, q)` returns ranked `SearchHit[]` with a `url` computed at query time, `buildSearchGroups()` groups by location then type, snippets are extracted from the indexed raw body, and `SearchDialog` is the header dropdown.

Plan:

- **Metadata at index build.** Extend `SearchDocument` with `milestone`, `phase` (number), `area` (from `folders.ts`), `requirements: string[]`. Requirement ids come from `project.mentions.byId` (inverted to path -> ids once at build) plus a plan/summary's `requirements` frontmatter. These are not MiniSearch fields (not tokenised); they live in the `documents` map beside `body`.
- **Filters and facets are post-filters over one hit list.** Run `searchIndex()` once; compute facet counts (phase, file type, requirement) over the full list; then apply the selected filters. Do not use MiniSearch's `filter` option: counts for the unselected values would be wrong. At a few hundred documents this costs nothing. New API params: `?q=&phase=&kind=&req=`; the response gains `facets`.
- **Grouping** changes from location-first to milestone, then phase, then file type: rewrite `buildSearchGroups()` (it already has the milestone and phase lookups). Quick tasks, codebase, and the folder areas become their own groups ordered by `folders.ts`.
- **Hit URLs** continue to come from `routes.ts`, so palette and results automatically get clean URLs; this is why the URL work precedes search work.
- **Palette** is the evolution of `SearchDialog`, not a second search UI: same `['project', slug, 'search', 'jump', q]` query, `mode=jump` returning at most 8 compact hits (`title`, `kind`, `url`, `phase`). Client-side it merges three sources without extra round trips: navigation targets (page names, phases and plans from the cached `drawer` and `presentation` queries), search hits for the typed text, and the projects list from `['projects']` for a "Switch project" group. Cmd-K / Ctrl-K binding lives in `AppShell`. Because it is project-scoped by key, switching projects changes what it searches with no extra work.
- **Workstreams:** the workstream is a facet, not a separate index.

## Data flow changes

```
Before:  browser -> /api/<resource> -> createApp closure -> derived (one bundle) -> JSON with absolute-ish urls
After :  browser -> /api/projects/:slug/<resource>
                     -> registry.get(slug) (lazy create runtime) -> runtime.derived (one bundle, captured first)
                     -> JSON with PROJECT-RELATIVE clean urls
         web nav.tsx prefixes /<slug>; queries keyed ['project', slug, ...]
Refresh: POST /api/projects/:slug/refresh -> coalesced refresh -> atomic swap of that runtime's bundle only
Add    : POST /api/projects {target} -> registry.add -> settings-store.write (Labelore's file only) -> state 'loading'
Target access (unchanged): only PlanningFilesystem / RemoteSnapshotSource ever touch a target; both read-only
```

## Patterns to Follow

### Pattern 1: One table, many readers
`folders.ts` (folder rules) and `routes.ts` (URL grammar) are each the only definition of their concern; discovery, drawer, search, and the router read them. This is the same "single grammar module" rule `naming.ts` already enforces for filenames.

### Pattern 2: Generic composed pages instead of per-kind manifest fields
Before adding the first of the 25, replace the per-kind optional fields on `ViewManifest` (and the matching `useMemo` and `if (x && mode === 'view')` branches in `artifact-page.tsx`) with one mechanism:

```typescript
// manifest.ts
compose?: (input: ViewInput) => { key: ComposedKey; model: unknown } | null;
// composed-pages.ts   key -> lazy React component (one registry, one render branch in artifact-page.tsx)
export const COMPOSED_PAGES: Record<ComposedKey, ComponentType<{ model: any; ... }>> = { ... };
```

Existing kinds migrate lazily (leave them on their current fields until touched). New kinds use `compose` only. `kinds.ts`, `manifests.ts` and the CSS prefix list can be generated from one declaration so `VIEW_KINDS`, `VIEW_MANIFESTS` and `VIEW_LOCAL_PREFIXES` cannot drift. This is the highest-leverage change for keeping the 25-page batch cheap.

### Pattern 3: Per-project runtime behind a keyed registry
State that was module-level or closure-level moves into `ProjectRuntime`, constructed by the registry and addressed by slug. Nothing outside the runtime holds a snapshot.

### Pattern 4: Project-relative DTO urls, slug applied at the edge
Server output is a pure function of one snapshot. The slug is a client routing concern.

## Anti-Patterns to Avoid

### Anti-Pattern 1: New `ArtifactLocation` values for new folders
**Why bad:** `assemble.ts` drops any location outside its loose-artifact filter; files vanish from the index and search with no warning.
**Instead:** keep `other`, carry the area in `folders.ts`; add a location only for `workstream` scoping, and handle that through the scope split, not the loose-artifact filter.

### Anti-Pattern 2: Putting the settings write behind `PlanningFilesystem`
**Why bad:** it turns the read-only guarantee for targets from "no write method exists" into "we promise not to call it".
**Instead:** a separate store with a fixed path; gate test lists both `node:fs` importers.

### Anti-Pattern 3: Stamping the project slug into server-built DTOs
**Why bad:** every builder needs a context argument; tests and goldens change twice; a slug rename invalidates cached bundles.
**Instead:** `nav.tsx` is the single prefixing point, enforced by lint.

### Anti-Pattern 4: Widening `PhaseIdentity` for workstreams
**Why bad:** it is the key of phase grouping, reference resolution, search owners, and old route keys; every consumer changes.
**Instead:** per-scope assembly and per-scope presentation.

### Anti-Pattern 5: Indexing and serving whole JSON documents
**Why bad:** `graph.json` and `intel/*.json` can be large; they inflate responses and index memory and make every query slower.
**Instead:** handlers emit bounded summaries; cap the indexed body for JSON kinds.

### Anti-Pattern 6: A parallel route table in the router
**Why bad:** `app-router.tsx` patterns and `routes.ts` already duplicate each other; clean URLs have more shapes, so drift gets worse.
**Instead:** one splat route and `parseRoutePath`.

## Scalability Considerations

| Concern | 1 project (today) | ~5-10 projects, several hundred files each | Many large or remote projects |
|---------|-------------------|-------------------------------------------|-------------------------------|
| Memory | one bundle plus one MiniSearch | lazy runtimes, all kept for the session | add LRU eviction of idle runtimes; rebuild on next hit |
| Startup | eager load of the one target | only the active project loads; others `unloaded` | ssh mirrors load on first open, not at startup |
| Search | one index, built off the request path | one index per loaded project, built async | unchanged; per-project indexes stay small |
| Folder scan | n/a | depth-2 walk, capped | raise depth only on request; keep the cap |
| Refresh | coalesced per process | coalesced per runtime, scoped invalidation | unchanged; file-watching (PLAT-01) plugs into the runtime, one watcher per loaded project |

## Build Order

Dependencies drive this; items inside a step can run in parallel as quick tasks.

1. **Test health first** (fixtures copied into `test/fixtures`, corpus tests stop reading live trees). Everything below rewrites URLs and kinds, which move goldens and corpus expectations; if the corpus tests still read other projects' live trees, every change looks like a regression.
2. **Kinds and folders foundation**: `folders.ts`, `deriveKind()` changes (including `HANDOFF.json` and `.continue-here.md`), `classifyProjectShape`, `resolveTargetPath` marker widening, JSON redaction for `config.json`, the secret regression test, and the composed-page refactor of `ViewManifest` (Pattern 2). Additive: no URL, no API, no UI change. Unblocks pages, codebase-only, and search facets.
3. **URL grammar** in `routes.ts` (project-relative), `addressOfPath`, `lookupRoute`, the injectivity audit and property test, the legacy redirect parser, the single splat route, and `web/nav.tsx` with the lint rule (slug still absent: `useProjectHref` is identity). Doing the Link wrapper here makes step 4 purely additive. Reserve the `workstreams/<name>/` scope in the grammar now even though the scope model lands later.
4. **Registry and multi-project**: `ProjectRuntime` extraction, `createApp` wrapper, `/api/projects/:slug/*`, `settings-store.ts` and the gate-test change, CLI multi-path and `--scan`, `/:project` layout, query-key factory, switcher and landing page, sketch-file route move, per-project refresh. The slug appears in URLs here.
5. **In parallel after 4:** (a) the settings page, (b) the codebase-only overview, (c) the batch of designed pages, ordered root documents, milestone audit and review family, spec and eval family, codebase documents, ideation folders (spikes, seeds, threads), operational folders (reports, intel, graphs, forensics, onboarding, handoff, continue-here), and last the workstreams scope model with its index page. Pages are the long pole; each is a sketch then a build then a screenshot, as in v2.0.
6. **Search and palette last**: metadata and facets, regrouping, redesigned results page, then Cmd-K reusing the same endpoint. It needs final URLs (step 3), per-project keys and endpoint (step 4), and the full kind and folder vocabulary for the file-type facet (steps 2 and 5).

Deliberate sequencing choices: URL grammar before the registry because the grammar is project-relative and can be proven on one project; the registry before search because the search endpoint and its query keys move; workstreams last because it needs an observed fixture and touches assembly.

## Research flags for the roadmap

- **Workstreams scope model:** needs a real fixture and deeper research (layout inferred from gsd-core source only).
- **Hono sub-app dispatch with a path parameter:** verify in a short spike; the rewritten-Request dispatcher is the fallback.
- **Existing-kind migration to `compose`:** optional; decide per type, do not block the batch on it.
- **Plan-pair URL for summaries:** confirm against `plan-pair-page.tsx` and `drawer.ts` `matchUrls` before fixing `/plan-03/summary`.
- **Everything else:** standard patterns over code that already exists; unlikely to need phase research.

## Sources

- Code read for this research (all under `/home/noah/Work/Personal/labelore/`): `src/presentation/routes.ts`, `src/planning-repo/discovery.ts`, `naming.ts`, `assemble.ts`, `snapshot.ts`, `registry.ts`, `handlers/index.ts`, `handlers/json-config.ts`, `handlers/generic.ts`, `src/server/index.ts`, `artifact-index.ts`, `search-index.ts`, `remote-source.ts`, `sketch-files.ts`, `src/cli/target-path.ts`, `src/presentation/search.ts`, `drawer.ts`, `drawer-route.ts`, `src/web/app-router.tsx`, `main.tsx`, `components/app-shell.tsx`, `views/kinds.ts`, `views/manifest.ts`, `views/manifests.ts`, `pages/artifact-page.tsx`, `.planning/PROJECT.md`. Confidence HIGH.
- gsd-core workstream contract: `~/.claude/gsd-core/bin/lib/workstream.cjs` and `workstream-inventory.cjs` header comments. Confidence MEDIUM (source comments, no observed output).
- Codebase-only examples on this machine: `~/Work/Ibis/resoundant/.planning/codebase`, `~/Work/Sideby/plan.sideby.me/.planning/codebase`. No `.planning/workstreams`, `spikes`, `seeds`, `threads`, `intel` or `reports` directory exists under `~` to observe; page designs for those need gsd-core's templates or generated samples.
