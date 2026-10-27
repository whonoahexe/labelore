# Phase 8: Several Projects and a Switcher - Pattern Map

**Mapped:** 2026-10-27
**Files analyzed:** 36 (new or modified)
**Analogs found:** 33 / 36 (all analog paths are git-tracked; verified against `git ls-files`)

Phase 7 is still executing. `app-router.tsx`, `routes.ts`, `nav.tsx` and the DTO url shape may change before Phase 8 runs. Line numbers below are as of today.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/server/request-guard.ts` (new) | middleware | request-response | `src/server/sketch-files.ts` (Hono middleware) + the `sec-fetch-site` gate in `src/server/index.ts:307-314` | role-match |
| `src/server/settings-store.ts` (new) | service (storage) | file-I/O (atomic write) | `src/planning-fs/local-fs.ts:201-226` (guarded temp-dir primitives) | role-match |
| `src/server/project-registry.ts` (new) | service | CRUD, lazy load, lifecycle | `src/server/index.ts:394-444` (`createSnapshotSource`, `registerDisposal`) + `src/server/remote-source.ts` | role-match |
| `src/server/project-runtime.ts` (new) | service | request-response (derived bundle) | `src/server/index.ts:73-115, 117-202, 307-365` (the closure being extracted) | exact (extraction) |
| `src/server/project-api.ts` (new) | route | request-response | `src/server/index.ts:204-380` (handlers moved) | exact (extraction) |
| `src/server/registry-api.ts` (new) | route | CRUD | `src/server/index.ts:82-392` (`createApp` shape, `app.all('/api/*')`, production static block) | role-match |
| `src/server/folder-scan.ts` (new) | utility | file-I/O (pure walk over injected list) | `src/cli/target-path.ts` (never throws, discriminated results) | partial |
| `src/server/index.ts` (modify) | entrypoint | request-response | itself (`parseCli`, `startServer`, `createApp`) | exact |
| `src/server/sketch-files.ts` (modify) | middleware | request-response | itself | exact |
| `src/server/project-presentation.ts` (modify, lines ~581, ~731) | transform | transform | itself | exact |
| `src/planning-fs/local-fs.ts` (modify: add `listChildEntries`) | utility | file-I/O (read-only) | `canonicalizePath` / `statPathSync` in same file (lines 150-177) | exact |
| `src/cli/target-path.ts` (modify: export `expandTilde`) | utility | transform | itself line 36 | exact |
| `src/presentation/project-slug.ts` (modify: `allocateSlug`, `isValidSlug`) | utility | transform | `slugOf` (same file) | exact |
| `src/presentation/reserved.ts` (modify: drop `/sketches/`) | config | transform | itself | exact |
| `src/web/api.ts` (new) | utility | request-response | `fetchPresentation` in `src/web/components/app-shell.tsx:20-24` | role-match |
| `src/web/query-keys.ts` (new) | utility | transform | none in repo (inline `queryKey: [...]` literals) | no analog |
| `src/web/components/project-switcher.tsx` (new) | component | request-response | `src/web/components/document-outline.tsx` (Base UI Popover) | role-match |
| `src/web/components/project-row.tsx` (new) | component | CRUD (open, forget) | `document-outline.tsx` `OutlineList` + `invalid-project-screen.tsx` `CopyField` | partial |
| `src/web/components/add-project-form.tsx` (new) | component | request-response (mutation) | `src/web/components/snapshot-status.tsx` (POST mutation) | partial |
| `src/web/components/project-add-dialog.tsx` (new) | component | request-response | `src/web/components/ui/dialog.tsx` + `search-field.tsx` `SearchDialog` | role-match |
| `src/web/components/project-scan.tsx` (new) | component | request-response | none for checklist; Base UI Checkbox/Field | no analog |
| `src/web/pages/projects-page.tsx` (new) | component (page) | CRUD | `src/web/pages/not-found-page.tsx` + `app-router.tsx` `RouteError` (page-stack markup) | role-match |
| `src/web/pages/project-layout.tsx` (new, replaces `ProjectGate`) | component (layout) | request-response | `ProjectGate` in `src/web/app-router.tsx:118-142` | exact (replacement) |
| `src/web/pages/unknown-project-page.tsx` (new) | component (page) | request-response | `src/web/pages/not-found-page.tsx` | exact |
| `src/web/pages/invalid-project-screen.tsx` (modify: "Choose another project" link) | component | request-response | itself | exact |
| `src/web/components/app-shell.tsx` (modify: trigger, slug-aware fetch) | component | request-response | itself lines 20-74 | exact |
| `src/web/app-router.tsx` (modify) | config (routes) | request-response | itself | exact |
| `src/web/nav.tsx`, `src/web/project-path.ts` (modify) | utility | transform | themselves | exact |
| `src/web/pages/plan-pair-page.tsx`, `artifact-page.tsx`, `dashboard-page.tsx`, `roadmap-page.tsx`, `traceability-page.tsx`, `research-page.tsx`, `sketches-page.tsx`, `search-page.tsx`, `components/planning-places.tsx`, `search-field.tsx`, `snapshot-status.tsx` (modify: keys and URLs via factory) | component | request-response | the `queryKey:` sites listed in Shared Patterns | exact |
| `src/web/styles/globals.css`, `docs/design-language.md` (modify: 14 class names, `missing` tone clause) | config | n/a | existing rows in `docs/design-language.md` | exact |
| `vitest.config.ts` + new `test/helpers/config-dir-setup.ts` (setupFiles) | config | n/a | `vitest.config.ts`; `test/helpers/vitest-gate.mjs` | role-match |
| `playwright.config.ts`, `test/e2e/fixture-server.ts`, `test/playwright-config.test.ts` (modify) | config/test | n/a | themselves | exact |
| `test/portability.test.ts` (modify: one importer to two) | test | batch scan | itself lines 395-452 | exact |
| new tests: `test/server/request-guard.test.ts`, `settings-store.test.ts`, `project-registry.test.ts`, `folder-scan.test.ts`, `test/helpers/guarded-request.ts`, `test/web/query-keys.test.ts`, `test/e2e/projects.spec.ts` | test | request-response | `test/server/refresh.test.ts`, `test/server/sketch-files.test.ts`, `test/portability.test.ts`, `test/helpers/source-scan.ts` | role-match |

## Pattern Assignments

### `src/server/project-runtime.ts` + `src/server/project-api.ts` (extraction of `createApp`)

**Analog:** `src/server/index.ts` lines 73-392. Move the bodies, do not rewrite them.

**D-05 derived bundle** (lines 73-115) moves into `ProjectRuntime` unchanged, except `toProjectPresentation(snapshot, slug)` (Pitfall 10):
```typescript
interface DerivedViews {
  presentation: ReturnType<typeof toProjectPresentation>;
  artifactIndex: ReturnType<typeof buildArtifactIndex>;
  referenceRegistry: ReturnType<typeof buildReferenceRegistry>;
  searchIndexState: ReturnType<typeof createSearchIndexState>;
}
// buildDerivedViews(snapshot = source.getSnapshot()) builds all four from one snapshot (lines 97-107)
let derived = buildDerivedViews();                       // line 111, replaced in ONE assignment on refresh
const fileDates = createFileDates(derived.presentation.rootPath);
const commits = commitLog ?? createCommitLog(derived.presentation.rootPath);
let inFlight: Promise<ProjectSnapshot> | null = null;    // coalesced refresh, lines 332-336
```

**Handler capture rule** (lines 264-269): every handler captures the bundle as its first statement. Under the new shape the first statement becomes `const runtime = c.get('runtime'); const activeDerived = runtime.derived;`.
```typescript
app.get('/api/artifacts/*', async (c) => {
  const activeDerived = derived;
  const pathname = new URL(c.req.url).pathname;
  const rawToken = pathname.slice('/api/artifacts/'.length);   // prefix becomes per-slug: slice after '/artifacts/'
```
The `pathname.slice('/api/artifacts/'.length)` call must change, since the mount prefix is now `/api/projects/<slug>/artifacts/`. Use `c.req.path` relative to the mounted prefix, or `c.req.param('*')` if the spike supports it. Keep `parsePresentationUrl(`/artifacts/${rawToken}`)` as is.

**Resolver middleware** (RESEARCH Pattern 1, proposed, verified by spike):
```typescript
type Env = { Variables: { runtime: ProjectRuntime } };
export function createProjectApi(resolve: (c: Context) => Promise<ProjectRuntime | null>): Hono<Env> {
  const api = new Hono<Env>();
  api.use('*', async (c, next) => {
    const runtime = await resolve(c);
    if (!runtime) return c.json({ error: 'unknown project' }, 404);
    c.set('runtime', runtime);
    await next();
  });
  // ... handlers moved from createApp with relative paths: api.get('/presentation', ...)
```
Wrap `next()` in try/finally to count in-flight requests per runtime (Pitfall 9).

**Refresh handler** (lines 307-365): move as is. Replace the in-handler `sec-fetch-site` block (lines 308-314) with the shared guard. The `refreshed: false` / `500` / `inFlight` coalescing semantics stay.

**Legacy wrapper:** keep `export function createApp(source, production, staticRoot, commitLog)` with the same signature, mounting `createProjectApi(async () => fixedRuntime)` at `/api` and no guard. About ten server test files call it (Pitfall 4). `routesToApp` (line 61) keeps working through `isServerOwnedUrl`.

**Production static block** (lines 384-389) goes to `registry-api.ts` unchanged:
```typescript
if (production) {
  app.use('/assets/*', serveStatic({ root: staticRoot }));
  app.get('/assets/*', (c) => c.text('Static asset not found', 404));
  app.use('*', serveStatic({ root: staticRoot }));
  app.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));
}
```

---

### `src/server/request-guard.ts` (middleware, request-response)

**Analog:** the gate at `src/server/index.ts:307-314` (shape of the refusal), plus `createSketchFileMiddleware` in `src/server/sketch-files.ts` for the `MiddlewareHandler` idiom (`import type { MiddlewareHandler } from 'hono'`, line 14).

**Existing gate to tighten:**
```typescript
const fetchSite = c.req.header('sec-fetch-site');
if (fetchSite && fetchSite !== 'same-origin') {
  return c.json({ refreshed: false, reason: 'cross-site' as const }, 403);
}
```
D-18 changes the `&&` into a refusal of the absent header too, and adds Host and JSON checks. Use the RESEARCH "Request guard (proposed)" skeleton (`createHostPolicy`, `createRequestGuard`). `HostPolicy.setPort` is called after `listen()`. Add `LABELORE_ALLOWED_HOSTS` (D-20) as a comma-separated list parsed once at construction. Register with `app.use('/api/*', guard)` before any route and before the `ALL /api/*` 404 fallback. Do not use `hono/csrf` (form content types only). Apply in `createRegistryApp` only.

**Test analog:** `test/server/refresh.test.ts:271-292` (403 spy test: `expect(refresh).not.toHaveBeenCalled()`). Those two tests are re-pointed (the absent-header case now flips to refused). Add `test/helpers/guarded-request.ts` that sets `Host`, `Origin`/`Sec-Fetch-Site` and `Content-Type`. The route-enumeration refusal test iterates `registryApp.routes` (RESEARCH "Refusal test over every registered route") and asserts the covered set equals the route set.

---

### `src/server/settings-store.ts` (second `node:fs` importer, file-I/O)

**Analog:** `src/planning-fs/local-fs.ts` lines 201-226 for the "guarded primitive" idiom: validated name pattern, fixed location, never throws from the guard.
```typescript
const TEMP_PREFIX_PATTERN = /^[a-z0-9-]+$/;
export function createTempDirSync(prefix: string): string {
  if (!TEMP_PREFIX_PATTERN.test(prefix)) throw new Error(`Invalid temp dir prefix: ${prefix}`);
  return mkdtempSync(join(tmpdir(), prefix));
}
```
File header must follow `local-fs.ts:1-3`'s comment style, naming this as the SECOND permitted importer. Imports in the `local-fs.ts` style: named imports from `'node:fs'`, `.ts` specifiers, no `enum` or constructor parameter properties (declare fields, assign in the constructor, as `LocalFsPlanningFilesystem` does at lines 34-38).

Pattern: `interface SettingsStore { read(); mutate(fn) }` with `FileSettingsStore` (path fixed in the constructor, `writeFileSync` to `settings.json.<pid>.<rand>.tmp` in the same dir, then `renameSync`, mode 0700 dir / 0600 file) and `MemorySettingsStore` (for `--smoke` and tests). `defaultSettingsDir()` must throw when `process.env.VITEST` is set without `LABELORE_CONFIG_DIR` (Pitfall 6). `LABELORE_CONFIG_DIR` names the directory that directly contains `settings.json`; `XDG_CONFIG_HOME` is honoured only when absolute.

**Gate change:** `test/portability.test.ts` has `ALLOWED_FS_IMPORTER` (a single string; see `findFsImportViolations(SRC_DIR, ALLOWED_FS_IMPORTER)` around lines 395-400). Change it to a two-element allow-list and extend the existing positive-control block (lines 407-452) so the second importer is exempt and a third planted file is still caught.

---

### `src/server/project-registry.ts` (service, lazy load + lifecycle)

**Analog:** `src/server/index.ts:394-444`. Reuse `failedSource`, `createSnapshotSource` and `registerDisposal` logic per entry.

**Source construction to reuse** (lines 406-422; this is the one place `parseRemoteTarget` then `resolveTargetPath` run, D-17):
```typescript
async function createSnapshotSource(rawPath: string): Promise<SnapshotSource> {
  const remote = parseRemoteTarget(rawPath);
  if (remote.kind === 'invalid') return failedSource(remote.status);
  if (remote.kind === 'remote') {
    const source = new RemoteSnapshotSource(remote.target);
    await source.load();
    return source;
  }
  const resolved = resolveTargetPath(rawPath);
  if (!('rootPath' in resolved)) return failedSource(resolved);
  const planningFilesystem = new LocalFsPlanningFilesystem(resolved.rootPath);
  const repository = new PlanningRepository(planningFilesystem, resolved.rootPath);
  await repository.load();
  return repository;
}
```
Move it into the registry (export it or keep it private there). Do not write a second parser.

**Disposal** (lines 424-444): `disposeOnce` pattern plus `server.on('close')`, `process.once('exit'|'SIGINT'|'SIGTERM')`. The registry registers one disposer that disposes every loaded runtime. Disposal is idempotent; `RemoteSnapshotSource.dispose` releases the mirror via `removeTempDirSync`.

**Slug allocation:** `allocateSlug(base, taken)` in `project-slug.ts`, pure, using `slugOf` as `base`. Suffix `-2`, `-3`. Allocation runs inside `SettingsStore.mutate` so two instances cannot mint the same slug. Validate persisted slugs on read with `^[a-z0-9]+(?:-[a-z0-9]+)*$` and `RESERVED_SLUGS`; report bad entries, never throw (D-12).

**LRU:** cap 5, skip runtimes with in-flight count above zero, `dispose()` sets a flag so the pending `setImmediate` index build (`search-index.ts:252-253`) is a no-op.

---

### `src/server/registry-api.ts` (route, CRUD)

**Analog:** `createApp` structure (`src/server/index.ts:82-89, 380-392`): `new Hono()`, `app.get(...)`, trailing `app.all('/api/*', (c) => c.json({ error: 'API route not found' }, 404))`, then the production static block.
Mount: `app.route('/api/projects/:slug', createProjectApi((c) => registry.runtime(c.req.param('slug'))))`. Register `/api/projects/scan` and `/api/projects/add-many` before the `:slug` mount. Use `hono/body-limit` (about 4 KB) on POSTs. Open stamp is `POST /api/projects/:slug/open`, never a GET.

**`startServer` changes** (lines 464-500): accept `paths: string[]`; build the registry app and call `policy.setPort(address.port)` after `listen`. Keep the dev branch (Vite middleware, `routesToApp` split, lines 479-499) as is. `/sketches/` leaves `SERVER_OWNED_PREFIXES` since sketch files move under `/api/`.

**`parseCli`** (lines 510-538): `rawPath` becomes `rawPaths: string[]`. Replace `rawPath = arg;` (line 530) with `rawPaths.push(arg)`; default to `[process.cwd()]` when none. Keep `--port`, `--port=`, `--smoke`; no `--scan`. Update the smoke probe (lines 554-557): `/api/dashboard` no longer exists at the root, so probe `/api/projects` and the first slug. A CLI path that fails validation is listed for this run only and not persisted (D-22).

---

### `src/server/sketch-files.ts` (modify)

Prefix becomes per-request. `SKETCH_URL_PREFIX = '/sketches/'` (line 19) is baked into `sketchRequestPath` (lines 32-58: `pathname.startsWith(SKETCH_URL_PREFIX)`, `.slice(SKETCH_URL_PREFIX.length)`). Parameterise the prefix to `/api/projects/<slug>/sketch-files/`. Keep `SECURITY_HEADERS` (lines 21-25, `Content-Security-Policy: sandbox allow-scripts`) on every response including 308 and errors. Update `sketchViewUrl` (`src/presentation/sketches.ts:155`) to be project-relative. The existing wiring (`index.ts:382`) is `app.use('/sketches/*', createSketchFileMiddleware(() => source.planningFilesystem?.() ?? null))`; this moves into `project-api.ts` using `runtime.source.planningFilesystem?.()`. `test/server/sketch-files.test.ts` and `test/presentation/sketches.test.ts` need re-pointing.

---

### `src/planning-fs/local-fs.ts` (modify: `listChildEntries`)

**Analog:** the primitives at lines 150-177. Same shape: exported function, never throws, discriminated or null result, no new capability on the class (`capabilities: { watch: false, write: false }` stays).
```typescript
export function statPathSync(absPath: string): StatOutcome | null {
  try {
    const stat = statSync(absPath);
    return { isDirectory: stat.isDirectory() };
  } catch {
    return null;
  }
}
```
Add `listChildEntries(absDir): Promise<Array<{ name; isDirectory; isSymlink }>>` using `readdir(withFileTypes)`; `Dirent.isSymbolicLink()` supplies the flag. Add `readdir` to the import block (lines 4-17). `folder-scan.ts` takes this function as an injected parameter (no `node:fs` import there). Containment: lexical check against `homedir()` first, then `canonicalizePath` and re-check (Pitfall 8). Export `expandTilde` from `target-path.ts` (line 36, currently private).

---

### `src/presentation/project-slug.ts` (modify)

**Analog:** same file. Extend with `isValidSlug(slug)` and `allocateSlug(base, taken)` as pure functions with the same comment style (NAV-09 header, doc comment per function). Update the stale header comment that says "Phase 8 swaps the source of this value". `toProjectPresentation(snapshot, slug = slugOf(snapshot.rootPath))` in `project-presentation.ts` (sites near lines 581 and 731) takes the registry slug; the default keeps existing tests unchanged.

---

### `src/web/api.ts` + `src/web/query-keys.ts` (client data layer)

**Analog for fetchers:** `src/web/components/app-shell.tsx:20-24`:
```typescript
export async function fetchPresentation(): Promise<ProjectPresentation> {
  const response = await fetch('/api/presentation', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Presentation request failed (${response.status})`);
  return (await response.json()) as ProjectPresentation;
}
```
Every fetcher gains a `slug` parameter and builds its URL through `projectUrl(slug, '/presentation')`. Callers listed below. Mutations (`snapshot-status.tsx:14` posts `/api/refresh`) must send `Content-Type: application/json` and a body `{}`.

**No analog for `query-keys.ts`:** the repo uses inline literals today. Existing literals to replace (all verified by grep):
```
app-router.tsx:86,101,121          ['presentation']
app-shell.tsx:32                   ['presentation']
planning-places.tsx:30             ['drawer']
search-field.tsx:48                ['search','dropdown',trimmed]
sketches-page.tsx:123              ['sketches']
research-page.tsx:126              ['research']
artifact-page.tsx:630,637          ['artifact-document', route], ['presentation']
plan-pair-page.tsx:67 (and :48 setQueryData(['artifact-document', route], ...))   ['plan-pair', pathname]
dashboard-page.tsx:144             ['dashboard']
roadmap-page.tsx:389               ['roadmap']
traceability-page.tsx:300          ['traceability']
search-page.tsx:139                ['search','page',query]
```
Use RESEARCH "Query-key factory": `projectsKey = ['projects']`, `projectKey(slug, ...rest) = ['project', slug, ...rest]`. Collision hazard: `plan-pair-page.tsx:66-70` has `staleTime: Number.POSITIVE_INFINITY` on a project-relative key. Add a source-scan test using `test/helpers/source-scan.ts` (`blankComments`, `walkSource`) that fails on any `queryKey: [` or `setQueryData([` literal outside `query-keys.ts`, with a planted positive control (house idiom, see `test/portability.test.ts:417-452`). Also assert no `placeholderData`/`keepPreviousData` under `src/web`.

---

### `src/web/pages/project-layout.tsx` (replaces `ProjectGate`)

**Analog:** `ProjectGate` at `src/web/app-router.tsx:118-142`. Keep the structure (query, outcome, `InvalidProjectScreen` on non-ok, `AppShell` otherwise), swap the source of truth to the registry list (`GET /api/projects`), key the subtree by slug, and drop the `wrong-project` branch in favour of the unknown-slug page.
```typescript
function ProjectGate(): React.JSX.Element {
  const { project = '' } = useParams();
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  if (presentation.data && presentation.data.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={presentation.data.loadStatus} />;
  }
  ...
  return <AppShell />;
}
```
`<AppShell key={slug}>` (Pitfall 2) plus a contract test reading the file for `key={slug}`. Loading body: `quiet-state` "Opening {name}…" with `aria-busy` and `role="status"`. Update contract tests that pin the old markup (Pitfall 13): `invalid-project-contract.test.ts`, `project-routes-match.test.ts`, `project-path.test.ts` (`projectGateOutcome`), `navbar-contract.test.ts:285`, `build-splitting.test.ts`, `loading-state-contract.test.ts:237`, `refresh-contract.test.ts`, `nav-contract.test.ts`.

**Routes** (`app-router.tsx:148-169`): `/` becomes `<ProjectsPage />` (delete `RootRedirect`, lines 97-107; D-01). Keep `appRoutes.map(path) == ['/', '/:project']`. Page chunks stay `lazy(trackRouteChunk(() => import(...).then((m) => ({ default: m.X }))))` (lines 23-60) for `ProjectsPage`, but keep `InvalidProjectScreen` eager (it is today).

**`nav.tsx`:** `useProjectSlug()` (lines 31-35) keeps reading `params.project`; the `ProjectSlugProvider` override (lines 22-26) can be dropped once `wrong-project` goes. Landing and switcher links navigate to `/${slug}` (D-06). Add the slug helpers to `project-path.ts`; `withProjectSlug` (lines 10-17) already protects against `//host` open redirects, so reuse it for any slug built link.

---

### `src/web/components/project-switcher.tsx` (component, Base UI Popover)

**Analog:** `src/web/components/document-outline.tsx` lines 70-92 (copy the Positioner/Popup structure; UI-SPEC names this file explicitly).
```typescript
<Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger className="document-outline-trigger">
    <span>On this page · {currentLabel}</span>
    <ChevronDown aria-hidden="true" />
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner className="document-outline-positioner" sideOffset={8} align="start" positionMethod="fixed">
      <Popover.Popup className="document-outline" aria-label="On this page" initialFocus>
        <OutlineList ... onSelect={() => setOpen(false)} />
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>
```
Imports: `import { Popover } from '@base-ui/react/popover'` and `lucide-react` icons (`ChevronsUpDown`, `Plus`, `Check`, `Folder`, `Server`, `Loader`, `X`). Use the `onSelect={() => setOpen(false)}` close-on-choose idiom. Class names come from UI-SPEC section 9 (`project-switcher-trigger`, `project-switcher-popup`, `project-switcher-footer`).

**Integration point:** `app-shell.tsx:57-74`. The brand `NavLink` currently wraps the mark, wordmark, separator and `.brand-project` block. A button cannot sit inside a link, so split into two siblings in the `brand` grid area: the link keeps mark + wordmark; `.brand-project` becomes the switcher trigger. The name comes from the projects list entry for the URL slug, not `presentation.data` (PLAT-08). The existing `aria-label={`Labelore — ${displayName}`}` pinned by `navbar-contract.test.ts:285` changes.

---

### `src/web/components/project-row.tsx`, `project-add-dialog.tsx`, `add-project-form.tsx`, `project-scan.tsx`

- **Dialog:** `src/web/components/ui/dialog.tsx` (exports `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`). `search-field.tsx` `SearchDialog` is the in-repo consumer to copy composition from (not read in detail here; the planner should open it).
- **Buttons:** `ui/button.tsx` (`variant`, `size="icon-sm"`); `CopyField` in `invalid-project-screen.tsx:19-59` shows the Button + `aria-label` + icon-swap idiom and the silent-failure style.
- **Mutation:** `snapshot-status.tsx` (POSTs `/api/refresh` at line 14) is the in-repo mutation analog; copy its pending/disabled handling. Use `useMutation` from `@tanstack/react-query`, invalidating `projectsKey` after add/forget.
- **Error display:** `notice destructive` with `role="alert"` as in `RouteError` (`app-router.tsx:70-78`):
```typescript
<main className="page-stack">
  <p className="eyebrow">Route error</p>
  <h1>This view could not be opened.</h1>
  <section className="notice destructive" role="alert">
    <h2>Local route failed</h2>
```
- **Add error message source:** failed add shows the server's `FailedLoadStatus.message` and `pathChecked` verbatim (D-17); never re-word client-side. `InvalidProjectScreen` renders `loadStatus.message` from `LOAD_STATUS_MESSAGES` (`target-path.ts:29-34`).
- **Checkbox/Field/Input/Tooltip:** import directly from `@base-ui/react/checkbox`, `/field`, `/input`, `/tooltip` (all present in `node_modules`, per RESEARCH). No in-repo analog; follow the Popover import convention.
- All new class names must be added to `docs/design-language.md` before `test/web/class-vocabulary.test.ts` runs. Copy comes from the UI-SPEC Copywriting Contract verbatim.

---

### `src/web/pages/projects-page.tsx` and `unknown-project-page.tsx`

**Analog:** `src/web/pages/not-found-page.tsx` (not read; it is the exact analog for the unknown-slug page, receiving `address` and `openSlug` props today) and the `page-stack` / `page-intro` / `eyebrow` / `lede` / `section-heading` / `empty-flow` markup used in `RouteError`. Landing renders a bare header (mark + wordmark linking to `/`, theme toggle), not `AppShell`; `invalid-project-screen.tsx` is the precedent for a shell-less full page (it mounts `ThemeToggle` itself, line 77-79).

---

### Test and config files

- **`vitest.config.ts`** (7 lines, only `include`): add `setupFiles: ['test/helpers/config-dir-setup.ts']` that does `process.env.LABELORE_CONFIG_DIR = mkdtempSync(...)` and removes it on exit. `test/helpers/vitest-gate.mjs` is the neighbouring convention (the gate runs under a swapped HOME, so a HOME-relative default is unstable).
- **`playwright.config.ts`:** lines 36-37 and 44-45 `url: 'http://127.0.0.1:4199/api/dashboard'` and `:4198/api/dashboard` become `/api/projects`; add `env: { LABELORE_CONFIG_DIR: <distinct mkdtemp> }` to each `webServer`. `test/playwright-config.test.ts` pins `servers[1].url`, so update and extend it to assert the env. `test/e2e/fixture-server.ts` polls `${base}/api/dashboard` and spawns with a child env: change both (port range 5310-5319 stays; 4173/4174/4198/4199 are never used).
- **`test/portability.test.ts`:** also uses `createApp({ getSnapshot }, true, '.')` (line 53); the legacy wrapper keeps this working.
- **`test/config-masking.test.ts:163`:** `{ method: 'POST', headers: { 'sec-fetch-site': 'same-origin' } }` is against the legacy `createApp`, so it passes unchanged; only tests that go through the registry app need `guarded-request`.
- **Heap test:** `v8.setFlagsFromString('--expose_gc')` + `vm.runInNewContext('gc')`, assert growth ratio (not an absolute budget); `test/helpers/growth.ts` is the existing ratio helper to reuse.
- **Settings disjointness test:** build with `mkdtemp` + `cp` from `fixtures/` (the `mountFixture` idiom, `portability.test.ts:40-46`), then assert target bytes identical before and after (the `listTree` helper, lines 59-74).

## Shared Patterns

### Never throw, return a discriminated result
**Source:** `src/cli/target-path.ts:57-123` (`resolveTargetPath` returns `ResolvedTarget | FailedLoadStatus`), `canonicalizePath` (`local-fs.ts:145-159`).
**Apply to:** registry load, settings read, folder scan, add/scan endpoints. Bad settings entries and unavailable projects become data (`state: 'unavailable'`, `reason`), not exceptions.

### Single node:fs boundary
**Source:** `local-fs.ts:1-3` header comment, gate in `test/portability.test.ts`.
**Apply to:** `settings-store.ts` (second importer, header comment names it), everything else (`registry`, `folder-scan`, `project-runtime`) must go through `local-fs.ts` exports. `remote-source.ts` is the model: no `node:fs`, delegates through `local-fs.ts` (lines 10-16).

### TypeScript run by Node type stripping
**Source:** `package.json` scripts, RESEARCH Pitfall 12.
**Apply to:** all of `src/server`, `src/cli`, shared files: `.ts` import specifiers, `import type` for types, no `enum`, `namespace` or constructor parameter properties.

### Same-origin guard (replaces the in-handler check)
**Source:** `src/server/index.ts:307-314`. **Apply to:** every non-GET under `/api/*` through one middleware (see `request-guard.ts`).

### Project-relative DTO urls, slug applied at the edge
**Source:** `src/web/nav.tsx` header comment and `withProjectSlug` (`project-path.ts:10-17`).
**Apply to:** all new client links to a project; never stamp the slug into server DTO urls.

### Presentation of server messages
**Source:** `invalid-project-screen.tsx:83` (`{loadStatus.message}`) and the standing `test/web/raw-html-guard.test.ts`.
**Apply to:** reasons, paths and errors render as React text nodes only.

### Test conventions
Zero failures, zero skips; timing as growth ratios; made-up fixtures (public repo); temp dirs via `mkdtemp(join(tmpdir(), 'labelore-...'))` with `afterAll` cleanup (`portability.test.ts:34, 106-108`).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/web/query-keys.ts` | utility | transform | Keys are inline literals everywhere today; use RESEARCH factory snippet |
| `src/web/components/project-scan.tsx` | component | request-response | No checklist or fieldset exists; build from Base UI Checkbox and UI-SPEC section 6 |
| `src/server/folder-scan.ts` | utility | file-I/O | No directory walk exists in `src/server`; use RESEARCH "Folder scan core" (BFS over an injected listing function) |

## Metadata

**Analog search scope:** `src/server`, `src/planning-fs`, `src/cli`, `src/presentation`, `src/web` (app-router, nav, project-path, components, pages), `test/` (portability, server, helpers, e2e), `playwright.config.ts`, `vitest.config.ts`.
**Files read in full or in targeted ranges:** about 16. Not opened: `not-found-page.tsx`, `search-field.tsx`, `snapshot-status.tsx`, `ui/dialog.tsx`, `ui/button.tsx`; the planner or executor should open these before copying (they are named from UI-SPEC and grep evidence only).
**Pattern extraction date:** 2026-10-27
