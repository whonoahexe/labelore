# Phase 11: Exploration, Handoff, Report and Workstream Pages - Pattern Map

**Mapped:** 2026-11-06
**Files analyzed:** 40 new or modified (grouped by family below)
**Analogs found:** all families have a tracked analog; the workstream scope adapter and the bounded graph scanner have role-match only

All analog paths below were confirmed tracked (`git ls-files`) or sit in directories of tracked Phase 10 files.
The Phase 10 codebase pipeline is the precedent for every view: handler, lift, server context, compose function, manifest field, `viewKindOf` lookup.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/planning-repo/handlers/spikes.ts` + `spikes-lift.ts` | handler + lift | transform | `handlers/codebase.ts` + `codebase-lift.ts` | exact |
| `handlers/seed.ts`, `thread.ts`, `report.ts`, `forensics.ts`, `onboarding.ts` | handler | transform | `handlers/codebase.ts` (frontmatter + sections), `coverage.ts` | exact |
| `handlers/pause.ts` + `pause-lift.ts` (wraps JsonConfigHandler) | handler | transform | `handlers/json-config.ts` (HANDOFF.json today) + `codebase.ts` | role-match |
| `handlers/index-intel.ts` | handler | transform (bounded) | `handlers/codebase.ts` | role-match |
| `handlers/index.ts` (register before `GenericMarkdownHandler`) | config | registry | itself, lines 20-80 | exact |
| `src/planning-repo/folders.ts` (intel/graphs accept `.md`; spike-file position rule) | config | rule table | itself (`explorationKind`, `jsonKind`, lines 115-215) | exact |
| `src/planning-repo/file-class.ts` + `presentation/file-facts.ts` (`listed` class) | utility | classification | `file-class.ts` existing classes | role-match |
| `src/presentation/spikes-context.ts`, `pause-context.ts`, `indexes-context.ts`, `onboarding-context.ts` | presentation builder | request-response (pure) | `presentation/codebase-map.ts` `buildCodebaseContext` (line 412) | exact |
| `src/server/index-summary.ts` | service | file-I/O, bounded read | `server/file-bytes.ts`, `server/commit-times.ts` (git runner) | role-match |
| `src/server/project-api.ts` (one IIFE per context) | controller | request-response | `codebaseContext` IIFE, lines 175-185 | exact |
| `src/web/views/<kind>-page.ts` + `<kind>-components.tsx` (x8) | view composer + component | transform | `views/codebase-page.ts` + `codebase-components.tsx` | exact |
| `src/web/views/kinds.ts` (`VIEW_KINDS` 31 -> 39, table-driven `viewKindOf`) | config | lookup | itself, lines 17-74 | exact |
| `src/web/views/manifest.ts`, `manifests.ts` | config | registry | `codebase` entry, `manifests.ts` 416-423; `manifest.ts` 66-68, 168-171, 312-315 | exact |
| `src/web/pages/artifact-page.tsx` | component | request-response | `codebase` useMemo, lines 951-957; context pass-through line 773 | exact |
| `src/web/pages/document-route.tsx` (kind-owned view skips file-class card) | component | routing | itself, lines 12-37 | exact |
| `src/web/route-dispatch.ts` (bare `/spikes`, `/indexes` redirects) | route | redirect | `/codebase` branch, lines 178-186 | exact |
| `src/presentation/project-map-state.ts` (workstream condition) | utility | pure | itself, lines 23-33 | exact |
| `src/planning-fs/scoped-fs.ts` | adapter | file-I/O | `src/planning-fs/local-fs.ts` (port impl) | role-match |
| `src/server/workstreams.ts` | service | read + derive | `server/project-presentation.ts`, `folder-scan.ts` | role-match |
| `src/web/components/scope-chip.tsx` | component | popover | `web/components/project-switcher.tsx` | exact |
| `src/web/pages/workstream-index-page.tsx` | page | request-response | `web/pages/dashboard-page.tsx` + project head | role-match |
| `test/fixtures/lendshed/.planning/{spikes,seeds,threads,reports,forensics,onboarding,intel,graphs}` | fixture | static | `test/fixtures/tidemark/.planning/codebase/` (marked made-up files) | exact |
| `test/fixtures/<workstream-project>/` + `test/helpers/fixture-roots.ts` | fixture | static | `test/fixtures/tidemark/` (own root) | role-match |
| `test/helpers/made-up-examples.ts` (`MADE_UP_EXAMPLE_KINDS`, raw-JSON marker) + `test/fixtures/README.md` rows | test helper | validation | itself, lines 17-30, 212-218 | exact |
| `test/<kind>-handler.test.ts`, `<kind>-lift.test.ts` | test | - | `test/codebase-handler.test.ts` | exact |
| `test/web/view-registry.test.ts` (31 -> 39), `test/folders.test.ts` pins | test | - | themselves | exact |

## Pattern Assignments

### Handlers: spikes, seed, thread, report, forensics, onboarding (handler, transform)

**Analog:** `/home/cinedise/codebases/labelore/src/planning-repo/handlers/codebase.ts` (whole file, 37 lines). Copy the structure: header comment, `match` by ref only, guarded parse, extractor in its own try/catch, `structured` omitted on throw.

```typescript
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractCodebase } from './codebase-lift.ts';

export const CodebaseHandler: ArtifactHandler = {
  kind: 'codebase',
  match: (ref) => ref.kind.startsWith(PREFIX),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let codebase: CodebaseBody | undefined;
    try { codebase = extractCodebase(ref.kind.slice(PREFIX.length), fm.data, fm.body); }
    catch { codebase = undefined; }
    return {
      title, frontmatter: fm.data, body: fm.body, warning: fm.warning,
      structured: codebase === undefined ? {} : { codebase },
    };
  },
};
```

Adapt: one `match` per wire kind (`spikes-manifest`, `spike`, `spikes-wrap-up`, `spikes-conventions`, `seed`, `thread`, `report`, `forensics`, `onboarding`), the lift in a separate module (`codebase-lift.ts` pattern; sections via `splitFencedSections`, tables via `parseMarkdownTable`). Register in `handlers/index.ts` before `GenericMarkdownHandler` (it must stay last; list at lines 41-80). Phase-11-specific traps (RESEARCH C6, Pitfall 3): take spike id/name from the folder name, never `spike:` frontmatter (gray-matter coerces `010` to 8); dates are `Date` objects, use `toISOString().slice(0,10)`; use `Map`/`Object.hasOwn` for author-controlled keys (Pitfall 11).

### Handler: pause (HANDOFF.json + .continue-here.md)

**Analog:** `/home/cinedise/codebases/labelore/src/planning-repo/handlers/json-config.ts` (lines 1-40). Keep its `frontmatter` and `body` for HANDOFF.json unchanged (pinned by `test/config-masking.test.ts` ~140-151). Add `PauseHandler` earlier in `HANDLERS`, which calls `JsonConfigHandler.parse`, then adds `structured.pause`:

```typescript
const JSON_ARTIFACT_NAMES = new Set(['config.json', 'HANDOFF.json', 'estimation-calibration.json']);
export const JsonConfigHandler: ArtifactHandler = {
  kind: 'json-config',
  match: (ref) => ref.location === 'root' && JSON_ARTIFACT_NAMES.has(basename(ref.path)),
  parse(raw, ref) { const result = tryParseJson(raw.content); /* masks config.json only */ ... }
```

Guard with `tryParseJson` (strips `__proto__`) and a try/catch around the lift as in `codebase.ts`. For `.continue-here.md`, mirror `codebase.ts` and strip the tag-only lines (`<current_state>`) from the copy handed to the renderer (RESEARCH Pitfall 4; see `handlers/context.ts` for the documented HTML-block trap).

### Handler: intel / graph (bounded)

**Analog:** `codebase.ts` for the guarded shape; the difference is `body` is a bounded digest (at most ~2 KB) and `frontmatter` holds only `_meta` and marker keys, never the raw object (RESEARCH C14, D-04). Graph is async and server-side, see `index-summary.ts`.

### `src/planning-repo/folders.ts` (config, rule table)

**Analog:** itself. Rows to change: `intel` (line 196, `jsonKind('intel')`), `graphs` (line 200, `jsonKind('graph')`) to accept `.md` and `.json`; `workstreams` (line 212, `unknownKind`) stays unknown. Spike file position rule extends `explorationKind` (lines 115-125, already returns `spikes-conventions`):

```typescript
function explorationKind(prefix: 'spikes' | 'sketches', single: string) {
  ...
  if (prefix === 'spikes' && name === 'CONVENTIONS.md') return 'spikes-conventions';
```

Each row cites its GSD source in `source:` (keep that convention). Update pins in `test/folders.test.ts` deliberately (`intel/SYNTHESIS.md`, `graphs/notes.md` currently `unknown`).

### Presentation contexts (pure, request-response)

**Analog:** `/home/cinedise/codebases/labelore/src/presentation/codebase-map.ts` `buildCodebaseContext` (line 412). Pure over `ProjectPresentation` plus the active path, returns `null` on any failure, never throws:

```typescript
export function buildCodebaseContext(presentation: ProjectPresentation, activePath: string): CodebaseContext | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const active = CODEBASE_PANELS.find((panel) => `${MAP_DIR}${panel.file}` === activePath);
    if (active === undefined) return null;
    const panels = CODEBASE_PANELS.map((definition) => {
      const artifact = artifacts.find((c) => c.path === `${MAP_DIR}${definition.file}`);
      if (artifact === undefined) return { ...definition, url: null, mapped: false, ... };  // ghost entry, never hidden
      ...
```

Use for `buildSpikesContext` (manifest + READMEs + file lists, synchronous), `buildPauseContext` (pairing, age, moved-on), `buildOnboardingContext` (reuse `nextStep`/`mapReadiness` from this same file; show both blocks when they differ), `buildIndexesContext` (the only one with an awaited graph summary).

### `src/server/project-api.ts` (controller, request-response)

**Analog:** lines 175-185, the `codebaseContext` IIFE, then added to the returned object (line 213) and to `ArtifactDocumentResponse`:

```typescript
const codebaseContext = ((): CodebaseContext | null => {
  try {
    return lookup.artifact.kind.startsWith('codebase-')
      ? buildCodebaseContext(activeDerived.presentation, lookup.artifact.path)
      : null;
  } catch { return null; }
})();
```

One IIFE per context, keyed on `lookup.artifact.kind`. The graph tile context is the one awaited builder: wrap in try/catch the same way and cache in the runtime by `(path, mtimeMs, sizeBytes)`.

### Web views: compose + components (x8)

**Analog:** `/home/cinedise/codebases/labelore/src/web/views/codebase-page.ts` (pure `ViewInput -> Composed*`, returns `null` when context or lift is missing so the promoted-section fallback renders with no notice) and `codebase-components.tsx` (exports `<X>View` and `<x>HeaderProps`). Header comment style, no DOM/fs/regex-at-module-state, frozen constants. Spikes and Indexes use the Codebase frame plus panels (one document per panel URL, ghost entries for missing ones). Pause/thread: `debug-case.ts`, `todo-lifecycle.ts` as status-first frames. Pause date and age: `opened-ago.ts` style, computed from a server-supplied date.

### Registration: kinds, manifest, manifests, artifact-page

**kinds.ts** (lines 17-74): append the 8 kinds to `VIEW_KINDS`, and replace the prefix-only `viewKindOf` with a lookup:

```typescript
const CODEBASE_KIND_PREFIX = 'codebase-';
export function viewKindOf(kind: string): string {
  return kind.startsWith(CODEBASE_KIND_PREFIX) ? 'codebase' : kind;
}
```
New mapping: `spikes-manifest|spike|spikes-wrap-up|spikes-conventions -> spikes`; `handoff|continue-here -> pause`; `intel|graph -> indexes`; `codebase-* -> codebase`. Update `expect(VIEW_KINDS.length).toBe(31)` in `test/web/view-registry.test.ts`; `resolveViewFor` already calls `viewKindOf` (`manifests.ts` ~500).

**manifests.ts** (lines 416-423), the entry to copy per kind (needs a `lead` ending in a period and a `promote` fallback):

```typescript
codebase: {
  kind: 'codebase',
  lead: 'The seven codebase-map documents on one page, a panel each, with what the map says first.',
  promote: [{ type: 'section', heading: /\S/, all: true }],
  codebasePage: composeCodebase,
},
```

**manifest.ts**: add per view an optional composer (`codebasePage?: (input: ViewInput) => ComposedCodebase | null;` line 171) and a context field on `ViewInput` (`codebaseContext?: CodebaseContext | null;` line 315), with type-only imports (lines 66-68).

**artifact-page.tsx**: do not add `artifact.kind ===` branches (capped by `view-page-contract.test.ts`). Copy the memo (lines 954-957), the pass-through (line 773), the cover render (lines 1374, 1404, 1498, 1610):

```typescript
const codebase = useMemo<ComposedCodebase | null>(() => {
  if (!manifest || !viewInput) return null;
  return manifest.codebasePage?.(viewInput) ?? null;
}, [manifest, viewInput]);
```

### `src/web/pages/document-route.tsx` (kind-owned views, RESEARCH C2/Pitfall 2)

**Analog:** itself, lines 21-31. Today `filePageKindOf(artifact.fileClass, artifact.sizeBytes)` sends `large` to `FileDetailsPage` before any `/documents` call. Add a small exported set of view-owning kinds next to `viewKindOf` (graph, intel, spike files) and skip the card for them:

```typescript
const kind = filePageKindOf(artifact.fileClass, artifact.sizeBytes);
if (kind === 'image-over-cap' || kind === 'binary' || kind === 'large') {
  return <FileDetailsPage artifact={artifact} presentation={presentation} variant={kind} />;
}
```

### `src/web/route-dispatch.ts` (bare `/spikes`, `/indexes`)

**Analog:** lines 178-186, the `/codebase` branch (redirect to first present document, `NOT_FOUND` otherwise, targets are payload keys only):

```typescript
if (route.url === '/codebase') {
  if (projectMapState(presentation.artifacts).mapOnly) return redirectTo('/');
  const key = firstMapDocumentKey(presentation);
  return key === null ? NOT_FOUND : redirectTo(key);
}
```
Do not add `spikes` to `PROJECT_PAGES`; no header tab (two-row bar at 390 px).

### `src/presentation/project-map-state.ts` (RESEARCH C8)

**Analog:** itself, lines 23-33. Add the workstream condition so a workstream-mode project with a codebase map is not `mapOnly`:

```typescript
const hasRoadmap = paths.has(ROADMAP_PATH);
const hasPhaseArtifact = artifacts.some((a) => a.location === 'phase' || a.location === 'archived-phase');
return { present: [...present], mapOnly: present.length > 0 && !hasRoadmap && !hasPhaseArtifact };
```

### Scope chip (D-11) and workstream index

**Analog:** `/home/cinedise/codebases/labelore/src/web/components/project-switcher.tsx`: `Popover` from `@base-ui/react/popover`, trigger as a button beside the wordmark link, list re-read on open, rows through `AppLink`, names as React text nodes only (T-08-40), Escape returns focus to the trigger.

```typescript
import { Popover } from '@base-ui/react/popover';
import { AppLink } from '../nav.tsx';
import { projectsKey } from '../query-keys.ts';
```
Scope prefix lives in `nav.tsx` (`useProjectSlug`, `withProjectSlug`); add `useProjectScope()` there; `test/web/nav-contract.test.ts` and `query-keys.test.ts` should fail on any omitted prefix. Index head: copy sketch 025's dashboard project head from `dashboard-page.tsx`/`dashboard-head.ts`.

### Scope adapter and inventory (workstream wave, cuttable)

**Analog (role-match):** `src/planning-fs/local-fs.ts` is the one `node:fs` site and the `PlanningFilesystem` port implementation; `ScopedPlanningFilesystem` wraps a parent port and never writes. `createProjectApi` (mounted again at `/api/projects/:slug/ws/:name` with a `resolve` returning the scoped runtime or 404) is reused unchanged. Inventory reads: STATE frontmatter then `**Status:**`/`**Current Phase:**` bold lines. Read `.planning/active-workstream` directly (it is in `ROOT_INTERNAL_FILES`), validate against `^[a-zA-Z0-9][a-zA-Z0-9._-]*$` and listed folder names only. Nothing in layers A-D may import these (D-17 cut line).

### Fixtures and the made-up marker rule

**Analog:** `test/fixtures/tidemark/.planning/codebase/` (labelled files) and `test/helpers/made-up-examples.ts`:

```typescript
export const MADE_UP_EXAMPLE_KINDS: ReadonlySet<string> = new Set([
  'spec', 'ai-spec', ..., 'codebase-stack', ...
```
Append each new wire kind; each file needs a marker (frontmatter keys or a first-line `<!-- made-up example · derived from {writer} · gsd-core 1.19.0 -->`; for JSON, extend `readMadeUpMarker(frontmatter, rawText)` to read top-level keys or `_meta`, RESEARCH C13) and a row in `test/fixtures/README.md` (first table whose header starts with `Path`). The check (line 212-218) loads every root through the real repository: a marked kind with no marker is `missing-marker`, no row is `not-indexed`. The `shapes` small copies need markers too. The workstream fixture root must be added to `RELATIVE_ROOTS` in `test/helpers/fixture-roots.ts`. The 20,000-node graph is generated in a test via `mkdtemp` (like `test/helpers/research-fixtures.ts`), never committed. Fixture text must pass `test/fixture-leak.test.ts` (no real project names, whole-word). Do not touch `fixtures/dense/**` or `test/__golden__/dense.json`.

### Handler tests

**Analog:** `/home/cinedise/codebases/labelore/test/codebase-handler.test.ts`: build a minimal `ArtifactRef` per kind, run the handler against a fixture file, assert `structured` on a throw is `{}`, assert `HANDLERS` order (generic last), and the growth proofs (`GROWTH_LIMIT`, `measureGrowth` from `test/helpers/growth.ts`).

## Shared Patterns

### Guarded extraction (every handler)
**Source:** `handlers/codebase.ts` lines 18-36. `tryParseFrontmatter`/`tryParseJson` only (never raw `matter()`/`JSON.parse`); extractor in try/catch; a throw omits `structured.*` and the page falls back to the plain document.

### Server-built context, pure composer, null-on-failure
**Source:** `project-api.ts` 175-185; `codebase-map.ts` 412-437; `codebase-page.ts` header. Pages never read files; a missing context or lift returns `null` and the promoted-section fallback renders silently.

### Disagreeing records stay separate
**Source:** project rule (PROJECT.md Key Decisions), RESEARCH anti-patterns. HANDOFF vs continue-here, manifest vs README, phases vs plans: one dashed `quiet` block showing both values, one shared class name.

### Wiring files are shared, serialize view builds
**Source:** RESEARCH Pitfall 9. Every view build edits `handlers/index.ts`, `manifest.ts`, `manifests.ts`, `kinds.ts`, `artifact-page.tsx`, `globals.css`, `docs/design-language.md`, `view-registry.test.ts`. Pure pieces (lifts, contexts, fixtures) can run in parallel. New shared class names need a `docs/design-language.md` row before `test/web/class-vocabulary.test.ts` runs; `view-<kind>-*` is auto-allowed via `VIEW_LOCAL_PREFIXES`.

### Read-only and bounded
**Source:** `local-fs.ts` is the only planning `node:fs` site. Copy buttons write to the clipboard only (`web/components/copy-command.tsx`, `copy-path-button.tsx`; `status-meter.tsx` for meters). Git count via `createGitRunner` (`server/file-dates.ts`), `null` on any failure.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/server/index-summary.ts` graph scanner | service | streaming/bounded scan | No bounded scan of a multi-MB JSON exists; `file-bytes.ts` (`readBytesWithin`) gives the safe read, the element-counting scan is new (RESEARCH Pattern 6, cap 96 MB, test against a generated 20,000-node graph) |
| `ScopedPlanningFilesystem` | adapter | file-I/O | Only `local-fs.ts` implements the port; no existing wrapper or overlay. Design per RESEARCH Pattern 7 |
| `listed` file class | utility | classification | Widening `FileClass` is new; touches `file-class.ts`, `file-facts.ts`, `drawer.ts`, `planning-places.tsx` and tests. Fallback is reusing `large` |

## Metadata

**Analog search scope:** `src/planning-repo/handlers`, `src/presentation`, `src/server`, `src/web/{views,pages,components}`, `test/`, `test/fixtures`, `test/helpers`
**Files scanned:** about 25 read or excerpted; RESEARCH.md lines 373-517 (open questions, validation architecture) were not read by the mapper, so the planner should read them directly.
**Pattern extraction date:** 2026-11-06
