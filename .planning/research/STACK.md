# Stack Research: v2.1 Wayfinding (additions to the shipped stack)

**Domain:** Read-only local dashboard for GSD `.planning/` directories (subsequent milestone)
**Researched:** 2026-10-25
**Confidence:** HIGH. The command palette, URL routing, SPA fallback and folder-scan findings were checked against the installed code, the installed `@base-ui/react@1.7.0` docs, and live probes of this repo's dev and production servers. The config location rests on the XDG Base Directory convention, which was not re-fetched this session.

## Verdict

**v2.1 needs zero new runtime dependencies and zero new dev dependencies.** Every capability is a composition of what is already installed, plus about 150 lines of hand-written Node code in three places (settings store, folder scanner, argv parsing).

The one real stack-level change is **architectural, not a package**. Labelore's rule that `node:fs` lives only in `local-fs.ts`, with no write capability, has to be relaxed in a controlled way. This is because persisting settings is the first write the app has ever made. See "Settings persistence" and "What NOT to do".

Do not bump versions as part of this milestone. The shipped pins work, and a bump is a separate, optional chore (see "Version notes").

## Recommended Stack

### Core Technologies (unchanged, with the new role each plays)

| Technology | Version (installed) | New role in v2.1 | Why no change is needed |
|------------|---------------------|------------------|-------------------------|
| `@base-ui/react` | 1.7.0 | Cmd-K palette (`Dialog` + `Autocomplete`), project switcher (`Popover`/`Menu`), add-project form (`Dialog` + `Field`/`Form`/`Input`), scan results (`CheckboxGroup`, `ScrollArea`) | Base UI ships an official **Command palette** recipe for `Autocomplete`, and every primitive the switcher needs. It also ships grouped lists (`Autocomplete.Group` / `GroupLabel` / `Collection`). |
| `react-router` | 8.3.0 | Project-slug-first URL tree, legacy-URL redirects | Static segments outrank dynamic ones (verified, see Routing), so `/:project/search` and `/:project/:milestone` coexist. `<Navigate replace>` covers old bookmarks. |
| `hono` + `@hono/node-server` | 4.13.4 / 2.1.1 | Per-project API sub-apps, settings and projects endpoints, CSRF and Host guards | `app.route('/api/p/:project', sub)`, plus built-in `hono/csrf`. No middleware package is needed. |
| `minisearch` | 7.2.0 (latest) | Faceted search (phase, file type, requirement), palette backend | Filtering is native: `search(q, { filter })` over stored fields. The existing custom tokenizer and `prefix: true` stay. |
| `@tanstack/react-query` | 5.102.3 | Per-project cache isolation | Put the slug in every query key (`['presentation', slug]`). Switching projects then needs no cache-clearing code. |
| Node built-ins (`node:fs`, `node:os`, `node:path`) | Node >=22.18 | Settings file, folder scan | See below. No `env-paths`, `write-file-atomic`, `fdir`, `tinyglobby` or `zod`. |

### Supporting Libraries

None added. The ones considered and rejected are in the next section.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest 4.1.11 (existing) | Settings store, scanner, slugger, legacy-URL translator tests | Tests point the store at a temp dir through an env override (`LABELORE_CONFIG_DIR`). They never touch the real `~/.config`. |
| Node `fs.cpSync` in a one-off script under `scripts/` | Copy corpus fixtures from live `.planning/` trees into `fixtures/` | The `node:fs` gate scans `src/` only, so a script outside it is legal. Redact paths, emails and secrets while copying. |

## Decision 1: Command palette. Build on Base UI `Autocomplete`, do NOT add `cmdk`

**Finding.** Base UI has no component named "Command", but its `Autocomplete` docs carry a first-party **"Command palette"** example. That example is `Dialog.Root` + `Dialog.Popup` + `Autocomplete.Root open inline items={groups} autoHighlight="always" keepHighlight`, with `Autocomplete.Group` / `GroupLabel` / `Collection` / `Item`, `Autocomplete.Empty`, and an optional `ScrollArea`. I read this in the installed docs at `node_modules/@base-ui/react/docs/react/components/autocomplete.md`. It runs unchanged on the installed 1.7.0. The shadcn `base-sera` `command` registry item does exist, but it **wraps `cmdk`**, which is not Base UI.

**Why not `cmdk@1.1.1`:**
- It pulls in four `@radix-ui/*` packages (`react-dialog`, `react-id`, `react-primitive`, `react-compose-refs`). That is a second headless-primitive family next to `@base-ui/react`, the opposite of this project's "no ceremony, one primitive family" stance.
- Its value is built-in fuzzy filtering and group ranking. Labelore already has MiniSearch (server) and `Autocomplete.useFilter` (client), so that value is unused.
- Its last release was March 2025 (1.1.1). It would be the only unmaintained-looking dependency in the tree.

**What already exists.** `src/web/components/search-field.tsx` already implements a ⌘K Dialog with an inline `Combobox`, a debounced `/api/search`, an `AbortSignal` stale guard, and an index-building state. NAV-08 is therefore a **refactor of `SearchDialog`**, not a new build:
1. Swap `Combobox` for `Autocomplete`. The input text is a free query and the list is suggestions, which is `Autocomplete`'s documented semantic. `Combobox` models "choose a value", which is why the file currently needs `filter={null}`, `filteredItems`, and a `highlightedRef` workaround.
2. Feed it grouped items: `{ value: 'Jump to', items }`, then `{ value: 'Projects', items }`, then `{ value: 'Files', items }`. Use `autoHighlight="always"` and `keepHighlight` so Enter always opens the top hit.
3. Keep the existing `isSearchShortcut` / `isEditableTarget` / `shortcutHintFor` helpers and the single window `keydown` subscription. They are already tested.

**Two tiers of results.**
- Tier 1 is client-side and instant: a compact "jump list" (title, kind, milestone, phase, url, about 100 bytes per artifact) fetched once per project through TanStack Query and filtered with `Autocomplete.useFilter()`. It covers quick-jump by phase, plan or file name.
- Tier 2 is the existing debounced `/api/search`, giving full-text matches with the `filter` object applied.
- Do not ship the MiniSearch index to the browser (`toJSON` / `loadJSON`). It would duplicate the server tokenizer and the index is large. A jump list is enough for "quick jump".

**Styling.** The app has only three shadcn `ui/` files (`button`, `dialog`, `toast`); the rest is the class vocabulary enforced by `test/web/class-vocabulary.test.ts`. Keep the palette on the existing `search-dialog-*` classes. Do not `shadcn add command`: it would add `cmdk` and `input-group`, and `components.json` has `"rsc": false` already so the CLI would run, but the output is wrong for this project.

## Decision 2: Persisting Labelore's own settings. One JSON file in the XDG config dir, hand-written

**Location.** `${XDG_CONFIG_HOME:-$HOME/.config}/labelore/settings.json`. This is the Linux/XDG convention for per-user config. The XDG spec requires `XDG_CONFIG_HOME` to be an absolute path, so ignore it if it is relative. Resolve it with `os.homedir()`. Add one override for tests and unusual setups: `LABELORE_CONFIG_DIR`. Do not use `env-paths` (4.0.0): it would put the file under `~/Library/Preferences` on macOS, and this is a Linux-only personal tool. The same lookup is three lines.

**Why this and not the alternatives:**
- Not `localStorage`: `autoPort` means the origin changes (127.0.0.1:5173, :5174, ...), so browser storage fragments across instances. The server also needs the list at startup, before any browser connects.
- Not inside `.planning/` or the project root: forbidden by the read-only guarantee, and it would leak one project's list into another.
- Not SQLite or `better-sqlite3`: a native dependency for a list of about 20 paths.
- Not `conf` or `lowdb`: a dependency for one read and one write function.

**Shape (version it from day one):**
```json
{ "version": 1,
  "projects": [{ "target": "/home/noah/Work/Personal/labelore", "label": null, "lastOpenedAt": "…" }],
  "scanRoots": ["/home/noah/Work"] }
```
`target` is the exact string the user supplied after tilde-expansion: an absolute path or an `ssh://` / `sftp://` URL. It reuses `resolveTargetPath` and `parseRemoteTarget`, so there is no second parser. The slug is derived at load time, not stored (see Routing), so renaming a folder never strands saved state.

**Write protocol (about 25 lines, Node only):**
1. Re-read the file immediately before every mutation (read-modify-write per request). Several Labelore instances routinely run at once (a long-lived `sftp://` instance exists on this machine), so never hold the whole settings object in memory across requests.
2. Write `settings.json.<pid>.tmp` in the same directory with mode `0o600`, then `renameSync` over the target. Rename is atomic on one filesystem, so a crash or a concurrent reader never sees a half-written file. Do not add `write-file-atomic` (8.0.0): it solves the same problem plus fsync and ownership handling a personal config does not need.
3. `mkdirSync(dir, { recursive: true, mode: 0o700 })` on first write.
4. Last writer wins. Concurrent edits of a list this small are not worth a lock, so skip `proper-lockfile`.
5. A missing, unparsable or wrong-version file reads as the empty default and is never thrown on. When it is corrupt, copy it to `settings.json.corrupt-<timestamp>` before the next write, so a hand-edit is never silently destroyed.
6. Validate with plain type guards (about 15 lines). Do not add `zod`: one file, one schema.

**The read-only gate.** Today `test/portability.test.ts` allows exactly one importer of `node:fs`, `local-fs.ts`, and `PlanningFilesystem.capabilities` is `{ watch: false, write: false }`. Persisting settings is a write, so:
- Create **one new module, `src/settings/settings-store.ts`**, as the only code that writes. It owns only the resolved config directory. It imports `node:fs` itself rather than going through `local-fs.ts`, so that `local-fs.ts` stays provably write-free.
- Extend the portability gate from "one allowed importer" to **"two named importers with declared roles"**: `local-fs.ts` (read only) and `settings-store.ts` (write confined to the config dir). Add a test that `local-fs.ts` imports no write API (`writeFile*`, `rename*`, `mkdir*`, `rm*`, `cp*`). That check already half-exists through the temp-dir helpers, so exempt those by name.
- Add a runtime guard in the store that refuses to write when the resolved config dir lies inside any registered project root or any `.planning` directory (a containment check, the same shape as `resolveContained`). That makes "never inside a target `.planning`" a tested invariant, not a convention.
- The project-presentation layer must never see the store. The settings API exposes only the project list.

**Browser-only preferences** (theme, last palette filter) stay in `localStorage` as `theme-toggle.tsx` already does. Only data the server needs, or that must be shared across ports, goes in the file.

## Decision 3: Folder scan. A 40-line hand-written async walk, in `local-fs.ts`

**Why hand-written.** It must be read-only, bounded and symlink-safe. It also must live in `local-fs.ts` to keep that file the sole reader. `fdir` (6.5.0) and `tinyglobby` (0.2.17) are present in `node_modules` only as transitive dependencies of Vite, so importing them would be an undeclared dependency and a gate violation. Node's `fs.glob` is experimental on Node 22 and has no depth limit. A manual walk is simpler than configuring any of them.

**Algorithm: `scanForProjects(root, { maxDepth = 3, maxEntries = 20000, signal })`:**
1. Use `fs.promises.readdir(dir, { withFileTypes: true })`, asynchronous, so a scan of a large `~/Work` never blocks the event loop that is serving the UI. The rest of `local-fs.ts` uses sync calls, which is fine for a single project's `.planning/` but not for an unbounded tree.
2. For each directory, check for a **`.planning` child directory**. That is the whole marker test. Do not require `PROJECT.md` or `STATE.md`, because codebase-only projects (`/gsd-map-codebase` output, v2.1 feature 3) contain only `.planning/codebase/`, which the current `hasProjectMarker` would reject when the path ends in `.planning`. Reuse `resolveTargetPath` only to confirm the hit.
3. **Stop descending at the first hit.** A GSD project's own subdirectories are not separate projects, and this avoids walking `node_modules` inside a match.
4. **Depth limit 3** below the scan root, which is `~/Work` → `Personal` → `labelore` → `.planning`. Make it a setting, not a constant.
5. **Skip list** (exact names): `node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.nuxt`, `.cache`, `.turbo`, `target`, `vendor`, `venv`, `.venv`, `__pycache__`, `.pnpm-store`, `.npm`, `.cargo`, `.rustup`. **Skip every dot-directory** except the `.planning` probe itself, which also keeps the scan out of `.config`, `.local` and `.cache` if someone scans `$HOME`.
6. **Never follow symlinks.** `Dirent.isSymbolicLink()` entries are skipped, which removes cycles and escapes without a visited-set. A symlinked project is still addable by explicit path, since `resolveTargetPath` canonicalizes it.
7. **Budgets:** a hard `maxEntries` counter plus an `AbortSignal.timeout(5000)`. On budget exhaustion return the partial list with `truncated: true` and say so in the UI. It is never an error.
8. Swallow `EACCES` / `EPERM` / `ENOENT` per directory and continue. A scan reports what it could read, and a locked folder is not a failure.
9. Return `{ path, hasProjectDocs: boolean }[]`, where `hasProjectDocs` is a cheap `PROJECT.md` / `STATE.md` existence check, so the switcher can label codebase-only projects honestly.

The scan runs only on an explicit user action or an explicit `--scan <dir>` CLI flag. It never runs implicitly at startup against a remembered root, so a slow mount never delays boot. Remote (`ssh://`) scanning is out of scope.

**CLI.** Extend the hand-rolled `parseCli` (still no `commander`): collect all non-flag arguments into `paths[]` (today the last one wins), and accept a repeatable `--scan <dir>`. With no arguments, open the remembered projects, then fall back to `process.cwd()` as today. Load remembered projects **lazily**, one repository per project on first request. An `ssh://` mirror is expensive and must not be pulled at boot just because it is remembered. Dispose each source on process exit, which `registerDisposal` already does for one source.

## Decision 4: URL migration in react-router 8. No new package; four rules

**Verified behaviour** (ran `matchRoutes` from the installed 8.3.0 against the proposed tree, and probed both servers):
- `/labelore/v1.1/phase-5/plan-03` → `plan`; `/labelore/quick/261024-qhq/summary` → `quick-doc`; `/labelore/codebase/architecture` → `codebase`; `/labelore/search` → `search` (not `:milestone`); `/my%20proj/v1.1/phase-5` → `phase` with `project: "my proj"`. **Static segments outrank `:param` segments regardless of declaration order**, so `search`, `roadmap`, `settings`, `quick`, `codebase` and `files/*` can sit beside `:milestone` without conflict.
- **Dots in URLs are safe on both servers.** With `Accept: text/html`, the Vite dev middleware (`appType: 'spa'`) and the production Hono `serveStatic` + `index.html` fallback both return `200 text/html` for `v1.1`, `STACK.md`, `config.json`, `.continue-here.md`, `.jsonl`, `.ts`, `.css` and `.svg` deep paths. No server change is needed for `v1.1` or for file-name URLs.

**The four rules:**
1. **One parent route `/:project`, then children.** `ProjectGate` (today's gate, now reading `useParams().project`) resolves the slug against `/api/projects`. An unknown slug renders a "no such project" screen with the switcher, not the generic `NotFound`. `/` is a loader-free redirect (`<Navigate replace>`) to the most recently opened project's dashboard, or a project chooser when none is remembered.
2. **Reserved first-segment slugs.** Because the project slug is the first segment, a project directory named like something the servers own would be hijacked. Verified owners: `api`, `sketches` (Hono `/sketches/*`) and `assets`, `fonts`, `favicon.svg` (the `dist/` root). In dev, Vite also owns `src`, `node_modules` and anything starting with `@`. Reserve all of them, plus app-level routes (`settings`, `projects`), in **one shared constant** imported by the server slugger and the router. A test asserts a collision gets a suffix, never a reserved word. The slug derives from the directory basename (kebab-cased); on collision append the parent directory name, then a numeric suffix. For `ssh://` targets, use host plus basename.
3. **Keep the old parser as the legacy redirector.** `parsePresentationUrl` and the `m~` / `p~` / `a~` token functions in `src/presentation/routes.ts` already decode every old URL shape. Keep them as a **read-only translator**: a `*` catch-all route runs them, builds the new URL with the new builders, and returns `<Navigate replace>`. Old bookmarks and any saved links keep working with no new dependency. Remove them only after a deliberate decision.
4. **Replace the artifact token with a readable splat.** `/:project/files/*` carries the real relative path (`phases/05-x/05-01-PLAN.md`), replacing `a~<encoded-path>`. The server already contains every path (`resolveContained`), so a readable path adds no traversal surface. Still reject `..` segments and absolute paths at the URL parser. The designed routes (`quick/:taskId/:doc`, `codebase/:doc`, `:milestone/:phase/:plan`) are sugar over the same artifact lookup. The URL builders in `routes.ts` stay the single source of truth, and the existing tests that round-trip them extend naturally. Keep `Link` targets generated by builders, never hand-concatenated.

**Query keys.** Every `useQuery` key gains the slug (`['presentation', slug]`, `['search', slug, …]`), and the API moves to `/api/p/:project/...` through a Hono sub-app. That is a mechanical change with no library, and switching projects then gets isolated caches for free.

**Do not adopt** react-router 8's framework mode, data-router `loader`s, or `route.lazy`. TanStack Query owns data and `React.lazy` + `trackRouteChunk` owns code splitting. Mixing a second data layer would split the loading states.

## Decision 5: Search filters and grouping. MiniSearch is enough as it stands

- **Filters (phase, file type, requirement):** pass `filter: (result) => …` to `MiniSearch.search`. The predicate looks up each hit in the existing `state.documents` map or in `presentation`, which `buildSearchGroups` already consults. Requirement filtering needs a per-document `requirements: string[]` field, extracted once at index build from frontmatter and `REQ-ID` mentions that the mention scanner already produces. No re-tokenizing, and `storeFields` is not required if the lookup goes through the documents map.
- **Grouping by milestone, then phase:** extend `buildSearchGroups` from one grouping level to two. This is presentation code, not a library.
- **Facet counts** (the "Phase 5 (12)" chip numbers): compute server-side by running the query once without the filter and tallying. At a few hundred documents this costs milliseconds. Do not add a faceting library.
- **Do not switch engines.** `minisearch@7.2.0` is still the latest release. The prior research reasons against FlexSearch, Lunr, Fuse and SQLite hold, and nothing in v2.1 changes the corpus scale.

## Decision 6: Multi-project server and new endpoints (the new attack surface)

Today the API is read-only and local. v2.1 adds the first **write endpoints** (`POST` a project, `DELETE` a project, `POST` a scan) and lets the browser name arbitrary paths and `ssh://` hosts. The server binds `127.0.0.1`, but a web page open in the same browser can still send requests to it.

- Add Hono's built-in **`hono/csrf`** middleware on all non-`GET` routes. It rejects cross-origin form-type POSTs by `Origin`.
- Require `Content-Type: application/json` on those routes. A cross-origin JSON POST triggers a CORS preflight, which the server never answers, so it is blocked.
- Add a tiny **Host-header allowlist** middleware (`127.0.0.1:<port>`, `localhost:<port>`) on `/api/*`. This blocks DNS-rebinding, where an attacker's domain resolves to 127.0.0.1 and reads folder-scan results. It is about 8 lines and needs no package.
- `ssh://` input from the UI goes through the existing `parseRemoteTarget`, which already validates host and user patterns, rejects control characters and passwords, and passes `--` before the host. Add a regression test that the UI endpoint calls it and never builds an ssh command itself.
- The scan endpoint takes a root path from the UI and must canonicalize it through `canonicalizePath`, apply the depth and entry limits, and return paths only, never file contents.

These are the new security regression tests v2.1 should carry, next to the three promised from v1.1.

## Installation

```bash
# Nothing to install. v2.1 adds no dependencies.
# (Do NOT run: npm install cmdk   /   npx shadcn add command)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Base UI `Dialog` + `Autocomplete` (palette) | `cmdk` 1.1.1 via shadcn `command` | If Base UI's `Autocomplete` ever lacks a needed capability (e.g. a virtualized list with thousands of rows, where Base UI's own virtualized example is still the first thing to try). Not at this corpus size. |
| `Autocomplete` | Keep `Combobox` (current) | Only if you want zero churn. It works, but it needs `filter={null}` plus a highlight ref to mimic what `Autocomplete` does natively. |
| Hand-written XDG JSON store | `env-paths` 4.0.0 | Only if the tool ever targets macOS or Windows users. |
| Atomic temp-file + `rename` | `write-file-atomic` 8.0.0 | Only if settings grow past a small file or need fsync durability guarantees. |
| Hand-written async walk | `fdir` 6.5.0 / `tinyglobby` 0.2.17 | If the scan needs glob patterns or runs over very large trees (100k+ directories) where `fdir`'s speed matters. Declare it as a real dependency then. |
| Plain type guards | `zod` 4.6.7 | If settings grow into several versioned documents. |
| Last-writer-wins | `proper-lockfile` 4.1.2 | If the registry ever holds data a lost write would hurt. A list of project paths does not. |
| Server-side settings file | `localStorage` | Never for the project list: `autoPort` fragments origins, and the server needs the list at boot. Fine for theme and view preferences. |
| Jump list fetched once + server full-text | Ship the MiniSearch index to the client | If the corpus became large enough that per-keystroke server round-trips felt slow over an `ssh` tunnel. Then reconsider; today a 160 ms debounce is fine. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `cmdk` / `shadcn add command` | Adds four `@radix-ui/*` packages beside `@base-ui/react`. Its filtering duplicates MiniSearch. Last release March 2025. | Base UI `Autocomplete` command-palette recipe (already documented in the installed package). |
| `commander` / `yargs` for multi-path CLI | Still a handful of `process.argv` lines (`paths[]`, `--scan`, `--port`). | Extend `parseCli`. |
| `chokidar` | File watching is PLAT-01, not v2.1. Remembered-project settings do not need it either. | Defer. |
| `zustand` / Redux for "current project" | The slug is in the URL, which is the state. TanStack Query keys hold the rest. | `useParams()` plus query keys. |
| A `projectId` in React context set from a registry | Two sources of truth for the active project (URL and context) drift apart on back/forward and deep links. | The URL slug is the only source. |
| Writing the settings file through `local-fs.ts` or the `PlanningFilesystem` interface | It would turn the read-only seam into a write seam and invalidate `capabilities.write: false`. | A separate `settings-store.ts` with its own gate and containment check. |
| Storing absolute project paths in URLs | Leaks the home directory into history and bookmarks, and breaks on a rename. | A derived slug plus the server-side registry. |
| Scanning at startup from a remembered root | A slow or unmounted path delays boot. | Scan only on an explicit user action or `--scan`. |
| Following symlinks in the folder scan | Cycles and escapes. | Skip `isSymbolicLink()` entries. |
| `fs.glob` (Node 22) for the scan | Experimental on the engine floor, no depth control. | The manual walk. |
| Copying live `.planning/` trees into `fixtures/` without redaction | Fixtures are committed; project trees carry emails, paths and tokens. | A `scripts/` copy step that strips them, with a test that scans fixtures for obvious secrets. |

## Stack Patterns by Variant

**If the user later wants a palette that also runs commands (theme toggle, refresh, open settings):**
- Add a third group `Actions` to the same `Autocomplete`. Items carry an `onSelect` instead of a `url`.
- Because the group list is plain data, no library change is needed.

**If remembered projects reach dozens and the switcher gets long:**
- Reuse the same `Autocomplete` in the switcher `Popover` with `useFilter().contains`. Do not build a second search.

**If PLAT-01 (file watching) lands in a later milestone:**
- The per-project `source` object created lazily for multi-project is exactly the unit a watcher attaches to. The `/api/p/:project` sub-app boundary and the slug-keyed query keys make `invalidateQueries({ queryKey: ['presentation', slug] })` the whole client reaction.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@base-ui/react@1.7.0` | `Autocomplete`, `Dialog`, `Popover`, `Menu`, `Field`, `Form`, `Input`, `ScrollArea`, `CheckboxGroup` | All present in the installed package. The Autocomplete command-palette example is in the shipped docs. 1.9.0 is the latest on npm and is optional. |
| `react-router@8.3.0` | `react@19.2.8` | Ranking verified by running `matchRoutes`. 8.5.0 exists and requires Node >=22.22.0 and React >=19.2.7, both satisfied here, but no v2.1 feature needs it. |
| Node `>=22.18.0` | `fs.promises.readdir({ withFileTypes })`, `AbortSignal.timeout`, `renameSync`, native TS stripping | All stable on the declared floor. |
| `hono@4.13.4` | `hono/csrf`, `app.route()` with path params, `c.req.param()` | Built in. 4.13.14 exists, so bump only if a bug demands it. |
| TypeScript 5.9.3 | unchanged | Still pinned: TS 7.0.2 is `latest` on npm but outside `typescript-eslint@8.67.0`'s peer range. |

## Version notes (optional, not part of v2.1)

Latest on npm as of 2026-10-25, against what is pinned: `@base-ui/react` 1.9.0 (pinned 1.7.0), `react-router` 8.5.0 (8.3.0), `hono` 4.13.14 (4.13.4), `@hono/node-server` 2.1.5 (2.1.1), `@tanstack/react-query` 5.104.5 (5.102.3), `vite` 8.3.5 (8.2.2), `vitest` 5.0.5 (4.1.11), `@playwright/test` 1.64.1 (1.63.0), `minisearch` 7.2.0 (same). `vitest` 5 is a major bump, so keep it out of a milestone whose goal includes making the suite reliable. A chore commit after v2.1 can take the rest.

## Test-health note (stack-relevant)

The one failing test is a timing assertion (a 250 ms ceiling missed by milliseconds), which is flaky by construction. Prefer asserting complexity (a ratio of timings at 1x and 4x input size) or a generous multiple of a measured baseline over an absolute millisecond limit. That needs no library. Corpus fixtures copied into `fixtures/` should be mounted into temp dirs by the existing `mountFixture` mechanism in `test/portability.test.ts`, so tests keep reading copies and never the checked-in originals.

## Sources

- `/home/noah/Work/Personal/labelore/node_modules/@base-ui/react/docs/react/components/autocomplete.md` (installed 1.7.0): "Command palette", "Grouped", "Async search", `useFilter`, `autoHighlight`, `keepHighlight` and `mode` props. HIGH.
- `https://ui.shadcn.com/r/styles/base-sera/command.json`: confirms the `base-sera` `command` item depends on `cmdk` and `dialog`. HIGH.
- `npm view cmdk@1.1.1`: four `@radix-ui/*` dependencies, last modified 2025-08-27, last release 2025-03-14. HIGH.
- `npm view <pkg> version` for every version quoted (2026-10-25). HIGH.
- Live probes of this repo: `matchRoutes` against `react-router@8.3.0` (ranking), and curl against the dev server (`appType: 'spa'`) and the production server (dotted and file-extension deep links). HIGH.
- `src/web/components/search-field.tsx`, `src/server/search-index.ts`, `src/presentation/routes.ts`, `src/planning-fs/local-fs.ts`, `src/cli/target-path.ts`, `src/cli/remote-target.ts`, `src/server/index.ts`, `test/portability.test.ts`: the integration points and the `node:fs` gate. HIGH.
- XDG Base Directory convention (`XDG_CONFIG_HOME`, default `~/.config`, absolute paths only): from background knowledge, not re-fetched this session. MEDIUM.

---
*Stack research for: Labelore v2.1 Wayfinding*
*Researched: 2026-10-25*
