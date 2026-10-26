# Phase 7: Recognised Files and Readable URLs - Pattern Map

**Mapped:** 2026-10-26
**Files analyzed:** 27 (13 new, 14 modified)
**Analogs found:** 25 / 27 (all analog paths verified git-tracked)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/planning-repo/folders.ts` (new) | utility (pure table + classifier) | transform | `src/planning-repo/discovery.ts` (`isNotePath`, `positionKind`, `classify`) + `naming.ts` | role-match |
| `src/planning-repo/file-class.ts` (new, or in folders.ts) | utility | transform | `src/planning-repo/discovery.ts` `SKIPPED_DIRS` + exclusions | partial |
| `src/planning-repo/discovery.ts` (mod) | service | file-I/O walk | itself | exact |
| `src/planning-repo/registry.ts` (mod) | service | file-I/O | itself (pre-read branch before `fs.read`) | exact |
| `src/planning-repo/assemble.ts` (mod) | service | transform | itself (null-identity phase files to `other`) | exact |
| `src/planning-fs/types.ts`, `local-fs.ts`, `in-memory-fs.ts` (mod) | port / adapter | file-I/O | `readBytesWithin` in same files | exact |
| `src/presentation/routes.ts` (rewrite in place) | utility | transform | itself | exact |
| `src/presentation/identity-keys.ts` (new) | utility | transform | `routes.ts` lines 69-142 (`phaseKeyOf`, `milestoneKeyOf`) | exact (move) |
| `src/presentation/legacy-routes.ts` (new) | utility (temporary decoder) | transform | `routes.ts` `parsePresentationUrl` lines 218-340 | exact (move) |
| `src/presentation/reserved.ts` (new) | config constant | n/a | `routesToApp` in `src/server/index.ts:60` | partial |
| `src/presentation/project-slug.ts` (new) | utility | transform | `routes.ts` `encodePart`/`assertNonEmpty` style | partial |
| `src/presentation/route-table.ts` (new) | utility | transform | `src/server/artifact-index.ts` `buildArtifactIndex` | role-match |
| `src/server/artifact-index.ts` (mod) | service | request-response lookup | itself | exact |
| `src/server/file-bytes.ts` (new) | middleware/route | request-response (bytes) | `src/server/sketch-files.ts` | exact |
| `src/server/index.ts` (mod) | controller | request-response | `/api/documents` handler lines 287-305 | exact |
| `src/presentation/drawer.ts` (mod) | service | transform | itself (`phasePlaceOf`, `matchUrls`, `after`) | exact |
| `src/web/nav.tsx` (new) | component/hook wrapper | request-response | no wrapper exists; see No Analog | none |
| `src/web/app-router.tsx` (mod) | route config | request-response | itself | exact |
| `src/web/pages/plan-pair-page.tsx` (mod) | component | request-response | itself | exact |
| `src/web/pages/image-page.tsx`, `binary-card.tsx` (new) | component | request-response | `src/web/pages/artifact-page.tsx` + `figure-frame.tsx` + `metadata-panel.tsx` + `artifact-header.tsx` | role-match |
| `src/web/components/figure-frame.tsx` (mod) | component | event-driven (state) | itself (`defaultFit` seeds `useState(false)`) | exact |
| `test/presentation/routes.test.ts` + new route-table/property tests | test | transform | `test/presentation/routes.test.ts` | exact |
| `test/server/deep-links.test.ts` (extend) + dev-mode case | test | request-response | itself | exact |
| `test/server/file-bytes.test.ts` (new) | test | request-response | `test/server/sketch-files.test.ts` | exact |
| `test/fixtures/shapes/` (new fixture project) | fixture | n/a | Lendshed fixture, `test/fixtures/dashboard/ledger/.planning/` | role-match |
| `eslint.config.js` (mod) | config | n/a | existing flat config blocks | role-match |
| `docs/design-language.md` (mod) | doc | n/a | itself | exact |

## Pattern Assignments

### `src/planning-repo/folders.ts` (utility, transform)

**Analog:** `src/planning-repo/discovery.ts`

**Position-predicate pattern** (lines 114-127): copy this shape for every folder row. First segment is the test, never the basename.
```typescript
export function isNotePath(relPathUnderPlanning: string): boolean {
  const segments = relPathUnderPlanning.split('/');
  if (segments.length < 2 || segments[0] !== 'notes') return false;
  return segments[segments.length - 1].toLowerCase().endsWith('.md');
}
export function positionKind(relPathUnderPlanning: string): string | null {
  if (isTodoPath(relPathUnderPlanning)) return 'todo';
  if (isNotePath(relPathUnderPlanning)) return 'note';
  return null;
}
```
Replace the `.md`-only predicates and `deriveKind` (lines 60-79, basename-at-any-depth) with a table-driven `classifyPath(rel) -> { location, kind, fileClass, internal }`. Gate each `naming.ts` grammar by location per RESEARCH Pattern 2. Keep `location: 'other'` for new folders (`assemble.ts:215-221` drops other locations that lack identity). Cite the GSD source per row, as `naming.ts` does for regexes. Keep exported names `isTodoPath`, `isNotePath`, `isDebugSessionPath`, `positionKind`, `LOCATION_ORDER` if other files import them.

**`classify()` fix** (lines 137-183): `top === 'phases'` and `milestones/vX-phases` return the phase location even when `phaseIdentity` is null; change to `other` so the file keeps a model entry. In the `quick` branch (lines 151-156) only treat `rest[0]` as a task when `parseQuickDirName(rest[0]).matched`; today `quick/README.md` yields `quickTaskId: 'README.md'`.

**Exclusion pattern** (lines 195-197, 211-214): one `DiscoveryExclusion` per internal root, never a silent skip. Keep the reason string `'Matches the research/.cache/ exclusion rule'` byte-identical to avoid dense golden churn.
```typescript
if (SKIPPED_DIRS.has(childRelUnderPlanning)) {
  exclusions.push({ path: childRel, reason: 'Matches the research/.cache/ exclusion rule' });
  continue;
}
```
Extend `SKIPPED_DIRS` (line 21) into the internal-rule set (`tmp`, `async-jobs`, `logs`, root-only `state.json` etc., `*.lock`, `*.tmp`). Position matters: `sketches/NNN/state.json` stays visible.

---

### `src/planning-repo/registry.ts` (service, file-I/O)

**Analog:** itself, lines 12-30. Add a branch on `ref.fileClass` before `fs.read` so non-text is never read:
```typescript
let raw;
try {
  raw = await fs.read(ref.path);
} catch (err) {
  const message = err instanceof Error ? err.message : 'File could not be read';
  warnings.add(ref.path, 'read', message, 'nothing readable');
  return { ref, title: ref.path, frontmatter: {}, body: '', bodyLength: 0,
    bodyHash: bodyHashOf(''), mtimeMs: 0, warnings: warnings.forPath(ref.path), structured: {} };
}
```
Reuse the empty-body return literal for `fileClass !== 'text'` (title = file name, `body: ''`, `bodyLength: 0`, carry `sizeBytes`). Search index and mention scanner skip non-text by `fileClass`.

---

### `src/planning-fs/types.ts`, `local-fs.ts`, `in-memory-fs.ts` (port, file-I/O)

**Analog:** the existing optional port method (types.ts lines 47-55) and its implementation (local-fs.ts lines 79-93).

Add `size?: number` to `DirEntry` (types.ts:5-8; `statSync` per file entry in `list()`, local-fs.ts:60-66) and an optional bounded `readHead?(relPath, maxBytes)`. Reuse the containment guard:
```typescript
async list(relDir: string): Promise<DirEntry[]> {
  const abs = this.resolveContained(relDir);
  return readdirSync(abs, { withFileTypes: true }).map((d) => ({ name: d.name, isDirectory: d.isDirectory() }));
}
```
`readHead` must call `this.resolveContained(relPath)` (line 42-58). Keep the new methods optional ("so test doubles keep compiling", types.ts:53). No `node:fs` import outside `local-fs.ts`. `InMemoryPlanningFilesystem` contents become `string | Uint8Array`; `test/helpers/from-directory.ts` must read non-text extensions as bytes.

---

### `src/presentation/routes.ts` (rewrite in place, utility, transform)

**Analog:** itself. Keep export names (`buildMilestoneUrl`, `buildPhaseUrl`, `buildPlanUrl`, `buildArtifactUrl`, `parsePresentationUrl`, `presentationRoutePatterns` only if still imported; `withHeading`/`parseHeading` unchanged).

**Keep verbatim** (lines 69-80, 93-95, 155-160, 189-209):
```typescript
function encodePart(value: string): string {
  return encodeURIComponent(value).replaceAll('~', '%7E');
}
function decodePart(token: string): string | null {
  if (token.length === 0) return null;
  try { return decodeURIComponent(token); } catch { return null; }
}
function assertNonEmpty(value: string, label: string): void {
  if (value.length === 0) throw new TypeError(`${label} must not be empty`);
}
function withHeading(path: string, heading?: string): string {
  if (heading === undefined) return path;
  const clean = heading.replace(/^#+/, '');
  assertNonEmpty(clean, 'Heading');
  return `${path}#${encodePart(clean)}`;
}
```
**Result shape to keep:** `{ ok: true; route } | { ok: false; error: { code, message, token? } }` (lines 54-67) with the `failure()` helper. `parseRoutePath` should be total and return the same discriminated result.

**Move out:** `milestoneKeyOf`, `phaseKeyOf`, `artifactTokenOf` (lines 97-153) go to `identity-keys.ts` and are re-exported from `routes.ts`, because `artifact.phaseKey`, `phase.key`, `references.ts` and `search.ts` use them as join keys, not navigation. The decoders (`milestoneVersionOf`, `phaseIdentityOf`, `artifactPathOf`, `parsePresentationUrl` lines 103-340) go to `legacy-routes.ts`.

**Do not copy** the router splat param: react-router 8.3.0 double-decodes `*`. `parseRoutePath` takes the raw `location.pathname` minus the slug, splits on `/`, decodes each segment once (RESEARCH "Parsing the raw pathname").

---

### `src/presentation/route-table.ts` (utility, transform)

**Analog:** `src/server/artifact-index.ts` `buildArtifactIndex` (lines 31-84): one pass over `project.artifacts`, `project.phases[*].artifacts`, `project.quickTasks[*].artifacts`, owner identity per artifact.
```typescript
for (const artifact of Object.values(project.artifacts)) entries.set(artifact.path, { artifact, phaseIdentity: null });
for (const phase of project.phases) {
  for (const artifact of Object.values(phase.artifacts)) entries.set(artifact.path, { artifact, phaseIdentity: phase.identity });
}
for (const quickTask of project.quickTasks) {
  for (const artifact of Object.values(quickTask.artifacts)) entries.set(artifact.path, { artifact, phaseIdentity: null });
}
```
Build it from the same walk, then follow the `RouteTable` sketch in RESEARCH "Code Examples" (winner keeps clean URL, losers get `file/`, `conflicts[]`). Build once inside `buildDerivedViews()` (`src/server/index.ts:96-106`) so refresh swaps it atomically (D-05).

---

### `src/presentation/legacy-routes.ts` (utility, temporary, transform)

**Analog:** `routes.ts` lines 103-153 and 218-340 (moved wholesale). Decoder-only; returns structured identity, never a URL built from request text. Header comment: "Deleted at v2.1 close (D-14)". Imported only by the `LegacyRedirect` component. Precedent for refusing open redirects: `plan-navigator.ts` `routeOf` (`//host`, `/\host`), referenced at RESEARCH Pattern 9.

---

### `src/server/artifact-index.ts` (service, lookup)

**Analog:** itself. Invariant to preserve (lines 27-30): request text selects an already-indexed path and never reaches the filesystem. Replace the `planRoutes` Map keyed by `buildPlanUrl(...)` (lines 33, 45-48, 75-80) with `pathByUrl` from the `RouteTable`. Keep the `ArtifactLookupResult` union and the `missing()` helper:
```typescript
lookupRoute(route: PresentationRoute): ArtifactLookupResult {
  if (route.kind === 'artifact') return this.lookup(route.artifactPath);
  ...
  return missing(route.kind);
}
```
Internal files are absent, so they fall into `missing()`.

---

### `src/server/file-bytes.ts` (route, request-response bytes)

**Analog:** `src/server/sketch-files.ts` (the exact precedent).

**Security headers** (lines 21-25):
```typescript
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': 'sandbox allow-scripts',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-cache',
};
```
Change CSP to `"sandbox; default-src 'none'; style-src 'unsafe-inline'"` (no `allow-scripts`, A8 in RESEARCH).

**Content-type allowlist** (lines 60-87): reuse the lookup by lowercase extension, but restrict to the image set; anything else is 404, never `application/octet-stream` (D-09, no raw serve).

**Handler skeleton and error mapping** (lines 129-174): GET/HEAD only (405 with `Allow`), `getFilesystem()` null or missing `readBytesWithin` returns 404, `PathEscapeError` 403, `ENOENT|ENOTDIR|ELOOP|EINVAL` 404, `EACCES|EPERM` 403, else 500. Differences: the input is `?route=`, resolved through `derived.artifactIndex` first, then `fs.readBytesWithin('.planning', artifact.path)`. Never decode a path from the request. No node imports; a plain-text `plain()` helper (lines 118-123).

---

### `src/server/index.ts` (controller, request-response)

**Analog:** `/api/documents` handler (lines 287-305) and `routesToApp` (lines 60-62).

**Single-bundle capture pattern** (lines 289-304), copy for the `route=` form and the image route:
```typescript
const activeDerived = derived;   // first statement, before parsing and any await (D-05)
const routeInput = c.req.query('route') ?? '';
const route = parsePresentationUrl(routeInput);
if (!route.ok || ...) {
  return c.json({ found: false, status: 'not-found' as const, artifactPath: '', warning: ... }, 404);
}
const lookup = activeDerived.artifactIndex.lookupRoute(route.route);
return lookup.found ? c.json(await artifactResponse(lookup, activeDerived)) : c.json(lookup, 404);
```
Delete `/api/artifacts/*` (lines 263-286; the web does not call it). `routesToApp` hard-codes `/api/` and `/sketches/`; source those from `reserved.ts`. Static serving block (lines 384-387) already returns the shell for dotted/odd segments; do not change, test it.

---

### `src/presentation/drawer.ts` (service, transform)

**Analog:** itself. In `phasePlaceOf` (lines 172-237) files that match neither pre- nor post-plan order land in `other` (not listed). Per UI-SPEC section 3, recognised unprefixed files (`COVERAGE.md`, `deferred-items.md`, `SKELETON.md`, `.continue-here.md`) then binaries go to `after`, after the known `POST_PLAN_ARTIFACT_ORDER` ranks, each group alphabetical:
```typescript
const postIndex = POST_PLAN_ARTIFACT_ORDER.indexOf(parsed.artifact);
if (postIndex !== -1) { after.push({ row, rank: postIndex }); continue; }
...
other.push(row);
```
Use `byRank` (line 229) with ranks offset past `POST_PLAN_ARTIFACT_ORDER.length`. `matchUrls` (lines 182-185) takes `[planArtifact?.key, summaryArtifact?.key]`; with D-05 these become `/plan-03` and `/plan-03/summary`, so both still mark the plan row active. Row badge: `<span className="places-badge">` (see `planning-places.tsx:102`) as `{EXT} · {size}` with the sr-only twin; add `data-file-class`. Use the one shared size formatter from UI-SPEC.

---

### `src/web/app-router.tsx` (route config)

**Analog:** itself.

**Lazy page pattern** (lines 12-49), reuse for `ImagePage`/`BinaryCard`:
```typescript
const ArtifactPage = lazy(
  trackRouteChunk(() => import('./pages/artifact-page.tsx').then((m) => ({ default: m.ArtifactPage }))),
);
```
**Gate** (lines 94-100): `ProjectGate` gains the slug-mismatch check. **Route table** (lines 102-121): replace the 11 `presentationRoutePatterns` entries with `{ path: '/:project/*', element: <ProjectRouteSwitch /> }` that dispatches on `parseRoutePath` from raw pathname; keep `errorElement: <RouteError />` and a final NotFound. `NotFound` (lines 71-83) gets the decoded address line (`<p className="artifact-path">`) and copy from UI-SPEC. `Link` imports move to `web/nav.tsx`.

---

### `src/web/pages/plan-pair-page.tsx` (component)

**Analog:** itself. Line 62-66 and 97-103 are the two edit points:
```typescript
queryKey: ['plan-pair', location.pathname],            // use slug-stripped project-relative path
const active = searchParams.get('doc') === 'summary' && pair.summaryRoute ? 'summary' : 'plan';
summaryTo={pair.summaryRoute ? { search: '?doc=summary' } : null}
```
Replace with a path-based tab: active = route ends in `/summary`; `planTo`/`summaryTo` are the two project-relative paths. A `?doc=summary` URL is redirected by the legacy module to `/summary`.

---

### `src/web/pages/image-page.tsx` and `binary-card.tsx` (components)

**Analog:** `src/web/pages/artifact-page.tsx` (page shell and `ArtifactHeader` use), `src/web/components/figure-frame.tsx` (frame with render prop `(fit) => ReactNode`, line 20), `src/web/components/metadata-panel.tsx` (info card), `src/web/components/artifact-header.tsx`.

FigureFrame change (lines 12-27): add `defaultFit?: boolean` and seed `useState(defaultFit)` in place of `useState(false)`. Image child: `<img data-fit={fit ? 'true' : undefined} src={`/api/files?route=${encodeURIComponent(route)}`} alt={name} onLoad onError />`; never inline SVG, `<object>`, or `dangerouslySetInnerHTML`. Info card: `div.metadata-panels > MetadataPanel` with `Name/Type/Size/Folder`. Exact copy and classes from 07-UI-SPEC "Copywriting Contract" and "Surfaces" (no new class names; class-vocabulary test must pass unchanged).

---

### Tests

- **`test/presentation/routes.test.ts`** (analog for new grammar and route-table/property tests): imports builders from `src/presentation/routes.ts`, uses `PhaseIdentity` fixtures with hostile characters (`'01.2 / β'`, `'LORE / 日本語'`), `describe/it/expect` from vitest, asserts `parsePresentationUrl(build...(x))` returns `{ ok: true, route: {...} }`. Update expectations, keep shape; route URL strings through one helper (Pitfall 9).
- **`test/server/deep-links.test.ts`** lines 26-58: `createApp(source, true, staticRoot).request(url)` over an `it.each` URL list with a temp `staticRoot` shell. Extend the list with dotted (`v1.1`), decimal, `file/`, `%2F`, unicode cases, and add a dev-mode case via `startServer(path, { port: 0, production: false })`.
- **`test/server/file-bytes.test.ts`**: copy structure from `test/server/sketch-files.test.ts` (headers, 403/404 mapping, caps).
- **Fixture**: a new committed made-up project `test/fixtures/shapes/` per RESEARCH "Test Seams and Fixtures"; follow the Lendshed README and `fixtures/README.md` ledger, keep `test/fixture-leak.test.ts` passing.

## Shared Patterns

### Read-only seam
**Source:** `src/planning-fs/types.ts` lines 42-60, `local-fs.ts` lines 42-58.
**Apply to:** every new read (size, head sniff, image bytes). Only `local-fs.ts` imports `node:fs`.

### Never open a path from request text
**Source:** `src/server/artifact-index.ts` lines 27-30, 58-72.
**Apply to:** `/api/documents`, image route, any legacy lookup. Resolve `route` to an indexed artifact first, then `readBytesWithin('.planning', artifact.path)`.

### Not-found shape
**Source:** `src/server/index.ts` lines 292-301 `{ found: false, status: 'not-found', artifactPath: '', warning }` with HTTP 404; web equivalent `NotFound` in `app-router.tsx:71-83`.
**Apply to:** internal files, bare folders, unknown routes (one page, no tell, D-11/D-13).

### Segment encode/decode exactly once
**Source:** `routes.ts` `encodePart`/`decodePart` (lines 69-80).
**Apply to:** `buildUrl`, `parseRoutePath`, `file/` fallback. Per-segment `encodeURIComponent`; never use react-router's `*` param.

### Hardened byte responses
**Source:** `sketch-files.ts` `SECURITY_HEADERS` and `plain()` (lines 21-25, 118-123).
**Apply to:** `file-bytes.ts`.

### Lazy-routed pages
**Source:** `app-router.tsx` lines 12-49 (`lazy(trackRouteChunk(...))`).
**Apply to:** every new page component.

### Design vocabulary
**Source:** `docs/design-language.md`, `test/web/class-vocabulary.test.ts`.
**Apply to:** drawer badge, image page, info card. No new class names; add one bullet to the doc.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/web/nav.tsx` | wrapper hooks/components | request-response | No slug-prefixing wrapper exists; pages import `Link`/`useLocation`/`useNavigate` from `react-router` directly (26 files under `src/web`, e.g. `plan-pair-page.tsx:2`). Use RESEARCH Pattern 8 and the `no-restricted-imports` block in "Lint rule". |
| `src/presentation/reserved.ts` | constant | n/a | Only the inline `routesToApp` check (`server/index.ts:60-62`) exists; build per RESEARCH Pitfall 7. |
| `src/presentation/project-slug.ts` | utility | transform | No slug logic exists; kebab-case basename, NFC, never empty, reserved suffix `-project`. |

## Metadata

**Analog search scope:** `src/planning-repo`, `src/planning-fs`, `src/presentation`, `src/server`, `src/web` (router, pages, components), `test/presentation`, `test/server`.
**Files read:** routes.ts, artifact-index.ts, discovery.ts, planning-fs/types.ts, local-fs.ts (lines 38-110), sketch-files.ts, server/index.ts (258-318), app-router.tsx, registry.ts (head), drawer.ts (170-240), plan-pair-page.tsx (55-110), figure-frame.tsx (head), routes.test.ts and deep-links.test.ts (heads).
**Pattern extraction date:** 2026-10-26
