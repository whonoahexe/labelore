# Phase 3: Search, Browsing & Traceability - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 13 (5 new backend/presentation, 3 new web components/pages, 2 modified existing, 3+ new test files)
**Analogs found:** 13 / 13

## File Classification

| New/Modified File                                                             | Role              | Data Flow                          | Closest Analog                                                                                                       | Match Quality                                                                                   |
| ----------------------------------------------------------------------------- | ----------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/planning-repo/assemble.ts` (modify)                                      | service/transform | CRUD (in-memory assembly)          | itself — extend existing function                                                                                    | exact (same file)                                                                               |
| `src/domain/model.ts` (modify `QuickTask`)                                    | model             | transform                          | itself — extend existing interface                                                                                   | exact (same file)                                                                               |
| `src/server/search-index.ts` (new)                                            | service           | batch + request-response           | `src/server/artifact-index.ts`                                                                                       | exact — same "build once at server start, freeze, expose lookup/search fn" shape                |
| `src/presentation/search.ts` (new)                                            | service/transform | transform                          | `src/presentation/roadmap.ts` (`buildRoadmapViewModel`) and `src/presentation/coverage.ts` (`buildCoverageMatrix`)   | role-match — pure projection fn over already-assembled data, returns DTOs                       |
| `src/presentation/tree.ts` (new)                                              | service/transform | transform                          | `src/server/project-presentation.ts`'s `artifactDtos()`                                                              | role-match — projects `Project` + `snapshot.exclusions` into a view model, no I/O               |
| `src/presentation/traceability.ts` (new, or extend `project-presentation.ts`) | service/transform | transform                          | `src/server/project-presentation.ts`'s `projectRequirement()`                                                        | exact — same DTO-shaping pattern, needs a phase-status join added                               |
| `src/server/index.ts` (modify — add routes)                                   | route/controller  | request-response                   | itself — existing `app.get('/api/roadmap', ...)` / `/api/history` handlers                                           | exact (same file, same pattern)                                                                 |
| `src/presentation/routes.ts` (modify — add `search`/`traceability` patterns)  | route             | request-response                   | itself — existing `presentationRoutePatterns` map + `PresentationRoute` union                                        | exact (same file)                                                                               |
| `src/web/components/app-shell.tsx` (modify — sidebar)                         | component         | request-response                   | itself — existing header/nav/`shell-content` structure                                                               | exact (same file)                                                                               |
| `src/web/components/search-field.tsx` (new)                                   | component         | request-response (debounced fetch) | `src/web/components/reference-preview.tsx` (Popover positioning) + `app-shell.tsx`'s `useQuery`/fetch pattern        | role-match                                                                                      |
| `src/web/components/tree-navigator.tsx` (new)                                 | component         | request-response                   | `src/web/pages/roadmap-page.tsx`'s `PhaseFlow` (native `<details>` disclosure, `NavLink`/`Link` routing, `useQuery`) | role-match                                                                                      |
| `src/web/pages/search-page.tsx` (new)                                         | component/page    | request-response                   | `src/web/pages/roadmap-page.tsx` (fetch fn + `useQuery` + `.notice.destructive` error pattern)                       | exact — page-level fetch/query/error/loading shape                                              |
| `src/web/pages/traceability-page.tsx` (new)                                   | component/page    | request-response                   | `src/web/pages/roadmap-page.tsx`                                                                                     | exact — same fetch/query/error/loading shape, table body swapped for `.coverage-table-boundary` |
| `test/assemble.test.ts` (extend)                                              | test              | —                                  | itself — existing test file, same suite                                                                              | exact                                                                                           |
| `test/presentation/search.test.ts` (new)                                      | test              | —                                  | `test/presentation/coverage.test.ts`                                                                                 | exact — pure-function unit test over hand-built fixture rows, no fs/fixtures dir needed         |
| `test/presentation/tree.test.ts` (new)                                        | test              | —                                  | `test/discovery.test.ts` (`InMemoryPlanningFilesystem` fixture pattern)                                              | role-match                                                                                      |
| `test/presentation/traceability.test.ts` (new)                                | test              | —                                  | `test/presentation/coverage.test.ts`                                                                                 | exact                                                                                           |
| `test/server/search-index.test.ts` (new)                                      | test              | —                                  | `test/server/project-presentation.test.ts` / `test/server/deep-links.test.ts`                                        | role-match                                                                                      |

## Pattern Assignments

### `src/planning-repo/assemble.ts` (modify — D-11 fix)

**Analog:** itself, `assembleDomainModel()` — read directly this session.

**The exact gap** (lines 157-162, root-only filter):

```typescript
export function assembleDomainModel(parsed: ParsedArtifact[], _warnings: ParseWarning[], rootPath: string): Project {
  const rootArtifacts = parsed.filter((p) => p.ref.location === 'root');
  const artifacts: Record<string, Artifact> = {};
  for (const p of rootArtifacts) {
    artifacts[p.ref.path] = toDomainArtifact(p);
  }
```

**Fix shape** — widen the filter (per RESEARCH.md Pattern 5) to also catch `research`, `milestone-root`, `other`:

```typescript
const looseArtifacts = parsed.filter(
  (p) =>
    p.ref.location === 'root' ||
    p.ref.location === 'research' ||
    p.ref.location === 'milestone-root' ||
    p.ref.location === 'other',
);
```

**QuickTask fix** — the existing quick-grouping loop (lines 283-296) discards each `ParsedArtifact`, keeping only a directory-path string:

```typescript
const quickGroups = new Map<string, string>(); // quickTaskId -> directory path
for (const p of parsed) {
  if (p.ref.location === 'quick' && p.ref.quickTaskId) {
    if (!quickGroups.has(p.ref.quickTaskId)) {
      quickGroups.set(p.ref.quickTaskId, dirname(p.ref.path));
    }
  }
}
const quickTasks: QuickTask[] = [...quickGroups.entries()]
  .map(([id, path]) => ({
    id,
    path,
    stateRow:
      quickTasksCompleted.find((row) => Object.values(row).some((v) => v.includes(id))) ?? null,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));
```

Change `Map<string, string>` to `Map<string, ParsedArtifact[]>`, push every matching `p` instead of only computing `dirname`, then map each collected `ParsedArtifact` through the existing `toDomainArtifact()` helper (lines 24-35) into a `Record<string, Artifact>` — exactly how `buildPhaseFromGroup` (used for `Phase.artifacts`, referenced at lines 184/190) already turns a `ParsedArtifact[]` into an artifacts map. Do not invent a second helper.

**Error handling / degradation convention:** none of this module throws on missing data — every collection defaults to `[]`/`{}` (see file header comment, lines 1-5: "Every collection that can be empty is an empty array, never null"). New code must follow this — an artifact with no matching location is simply absent from `artifacts`, never an error.

---

### `src/domain/model.ts` (modify — `QuickTask.artifacts`)

**Analog:** itself, current `QuickTask` (lines 174-179):

```typescript
export interface QuickTask {
  id: string;
  path: string;
  /** The matching row from STATE.md's "Quick Tasks Completed" table — the authoritative status index for quick/ — when one exists. */
  stateRow: Record<string, unknown> | null;
}
```

Add `artifacts: Record<string, Artifact>;` — mirrors `Phase.artifacts: Record<string, Artifact>` (same file, used by `assemble.ts` `buildPhaseFromGroup`) so both "artifact-bearing" model types share the exact same shape and consumers (`artifact-index.ts`, tree projection) can treat them uniformly.

---

### `src/server/search-index.ts` (new)

**Analog:** `src/server/artifact-index.ts` — read in full this session (58 lines). Copy its shape exactly: a `build*(snapshot)` factory that builds a `Map`/index once, returns a small frozen object exposing lookup/query methods, never re-touches `node:fs`.

**Imports pattern:**

```typescript
import type { Artifact, PhaseIdentity } from '../domain/model.ts';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { buildPlanUrl, type PresentationRoute } from '../presentation/routes.ts';
```

**Core pattern** (freeze-and-expose, from `artifact-index.ts` lines 20-51):

```typescript
export interface ArtifactIndex {
  readonly size: number;
  lookup(artifactPath: string): ArtifactLookupResult;
  lookupRoute(route: PresentationRoute): ArtifactLookupResult;
}

export function buildArtifactIndex(snapshot: ProjectSnapshot): ArtifactIndex {
  const entries = new Map<string, IndexedArtifact>();
  // ... populate synchronously from snapshot.project ...
  return Object.freeze({
    size: entries.size,
    lookup(artifactPath) {
      /* ... */
    },
    lookupRoute(route) {
      /* ... */
    },
  });
}
```

`search-index.ts` follows the identical "freeze + expose read methods" shape but wraps the **async-scheduling** state machine from RESEARCH.md Pattern 4 (`createSearchIndexState()` returning `{ state, buildFrom }`, `setImmediate`-scheduled `MiniSearch` construction) — this is new logic (no existing analog builds an index off the critical path), but the freeze/expose convention and "never re-touch node:fs, only read the passed-in `ProjectSnapshot`" rule both carry over directly from `artifact-index.ts`.

**Tokenizer regex safety convention to copy** — `src/planning-repo/mentions.ts` lines 26-36:

```typescript
// T-01-11 (DoS): every pattern below is anchored on a word boundary with bounded quantifiers and no
// nested unbounded groups, so none of them can exhibit catastrophic backtracking regardless of input
// size or shape.
export const ID_PATTERNS: Record<IdScheme, RegExp> = {
  requirement: /\b[A-Z][A-Z0-9]+-\d{2,}\b/g,
  decision: /\bD-\d+\b/g,
  ...
};
```

Any new `ID_OR_PATH_SHAPE` regex in `search-index.ts`'s `tokenize`/`processTerm` (RESEARCH.md Pattern 1) must carry the same style of comment and satisfy the same anchored/bounded-quantifier/no-nested-unbounded-group rule — this is a named, repo-established convention, not a suggestion.

**Error handling:** `artifact-index.ts`'s `missing()` helper returns a typed `not-found` result object rather than throwing — `/api/search` must follow the same never-throw, always-return-a-typed-status convention (`{ status: 'building' | 'ready' | 'error', ... }` per RESEARCH.md Pattern 4).

---

### `src/presentation/search.ts` (new)

**Analog:** `src/presentation/coverage.ts` (`buildCoverageMatrix`) for "pure function returning matches/DTOs from two input arrays" shape, and `src/presentation/roadmap.ts` for "projects server DTOs (`ProjectPresentation`/`ProjectDto`) into UI-shaped rows/bands ready to `c.json()`."

**Core pattern** (`roadmap.ts` lines 1-30 — projection interfaces, no I/O, imports only from `presentation/routes.ts` and `server/project-presentation.ts`):

```typescript
import { comparePhaseNumbers } from '../planning-repo/naming.ts';
import type {
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../server/project-presentation.ts';
import { buildMilestoneUrl, buildPhaseUrl, buildPlanUrl } from './routes.ts';

export interface RoadmapPlanRow {
  key: string;
  url: string;
  id: string; /* ... */
}
```

`search.ts` should mirror this exactly: input is the `MiniSearch` results array (or the raw index) plus the already-assembled `presentation`/`Project`, output is grouped DTOs (`SearchResultGroup[]`) with `url` fields built via the same `presentation/routes.ts` builders — never a hand-built href.

**Test analog:** `test/presentation/coverage.test.ts` (lines 1-30) — hand-built row fixtures via a small local `row()` helper, `describe`/`it` per behavior, `expect(...).toEqual([...])` on shaped output. No fixture files needed for pure-function unit tests of this kind:

```typescript
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildCoverageMatrix, type CoverageStatement } from '../../src/presentation/coverage.ts';

function row(key: string, text: string, requirementIds: string[] = []): CoverageStatement {
  return { key, text, requirementIds };
}
```

---

### `src/presentation/tree.ts` (new)

**Analog:** `src/server/project-presentation.ts`'s `artifactDtos()` (read lines 360-402) for "walk `Project.phases` + all-artifacts, build an owner-context map, project into a flat sorted DTO array."

**Core pattern:**

```typescript
function artifactDtos(project: Project): ArtifactDto[] {
  const context = new Map<string, { identity: PhaseIdentity; phaseKey: string }>();
  for (const phase of project.phases) {
    for (const artifact of Object.values(phase.artifacts)) {
      context.set(artifact.path, {
        identity: phase.identity,
        phaseKey: phaseKeyOf(phase.identity),
      });
    }
  }
  return allArtifacts(project)
    .map((artifact) => {
      const owner = context.get(artifact.path) ?? null;
      return {
        key: buildArtifactUrl(owner?.identity ?? null, artifact.path),
        path: artifact.path,
        /* ... */
        milestoneKey: owner ? milestoneKeyOf(owner.identity.milestoneVersion) : null,
        phaseKey: owner?.phaseKey ?? null,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}
```

`tree.ts` builds the same shape of owner-context map, but reconstructs the disk hierarchy by splitting `Artifact.path` on `/` rather than emitting a flat sorted list — group ordering must follow `discovery.ts`'s own `LOCATION_ORDER` constant (below), not a new invented order.

**Ordering constant to reuse** — `src/planning-repo/discovery.ts` (read lines 90-198, `LOCATION_ORDER` embedded in `discover()`):

```typescript
const LOCATION_ORDER: Record<ArtifactLocation, number> = {
  root: 0,
  phase: 1,
  'archived-phase': 2,
  quick: 3,
  'milestone-root': 4,
  research: 5,
  other: 6,
};
```

This constant is currently private to `discovery.ts`'s `discover()` function — either export it from `discovery.ts` for reuse, or duplicate the exact same literal object with a comment pointing back to `discovery.ts` as the source of truth. Do not invent a different ordering.

**Exclusions rendering:** `snapshot.exclusions: DiscoveryExclusion[]` — each `{ path, reason }` (confirmed in `discovery.ts`'s `walk()`, e.g. `exclusions.push({ path: relDir, reason: 'Matches the research/.cache/ exclusion rule' })` and the `MAX_WALK_DEPTH` case) — project these directly into stub tree nodes keyed by path prefix; do not re-derive exclusion reasons.

**Route resolution:** every tree node must resolve via `buildArtifactUrl`/`buildPlanUrl`/`buildPhaseUrl` from `src/presentation/routes.ts`, using the same `owner ?? null` lookup shown above — never a hand-built href.

---

### `src/presentation/traceability.ts` (new, or extend `project-presentation.ts`)

**Analog:** `src/server/project-presentation.ts`'s `projectRequirement()` (read lines 365-377):

```typescript
function projectRequirement(requirement: Requirement): RequirementDto {
  return {
    id: requirement.id,
    category: requirement.category,
    text: requirement.text,
    tier: requirement.tier,
    checked: requirement.checked,
    coveringPhases: requirement.coveringPhaseRefs.map((reference) => ({
      raw: reference.raw,
      targetPhaseKey: reference.resolved ? phaseKeyOf(reference.resolved.identity) : null,
    })),
  };
}
```

This DTO already carries everything D-13/D-15 need except the covering phase's _own_ status (`diskStatus`/`roadmapComplete`). Per RESEARCH.md's Open Question 1 recommendation, add a dedicated `/api/traceability` endpoint (new `src/presentation/traceability.ts` module) that does the phase-status join server-side: for each `coveringPhases[i].targetPhaseKey`, look up the phase in `presentation.milestones[].phases[]` by `phaseKey` (already computed via `phaseKeyOf`) and attach its `diskStatus`/`roadmapComplete` alongside the requirement's own `checked` field, as two explicitly separate fields — never merged (D-13). A `targetPhaseKey: null` with non-empty `raw` is already, by construction, D-15's "dangling reference" case — no new resolution logic needed, only a rendering-time null check.

**Grouping:** by `RequirementDto.category` (the literal REQUIREMENTS.md subsection heading text, confirmed sourced from `RequirementItem.category` in `src/planning-repo/handlers/requirements.ts` line ~35's `splitSubsections`) — do not re-derive or normalize category text.

**Tier split:** filter on `tier !== 'v1'` for the "own clearly-labeled section" D-15 requires — no new parsing needed, `tier` is already `'v1' | 'v2' | 'future'` (or open string) on `RequirementDto`.

**Test analog:** `test/presentation/coverage.test.ts` — same pure-function-over-hand-built-fixtures shape.

---

### `src/server/index.ts` (modify — add `/api/search`, `/api/search/status`?, `/api/tree`, `/api/traceability`)

**Analog:** itself — existing route handlers in the same file (read lines 1-80):

```typescript
app.get('/api/presentation', (c) => c.json(presentation));
app.get('/api/dashboard', (c) => {
  const presentation = toProjectPresentation(source.getSnapshot());
  return c.json({ ...buildDashboardViewModel(presentation), loadStatus: presentation.loadStatus });
});
app.get('/api/roadmap', (c) => {
  const presentation = toProjectPresentation(source.getSnapshot());
  return c.json(buildRoadmapViewModel(presentation));
});
```

New routes follow this exact shape: re-derive `presentation` from `source.getSnapshot()` per request (existing convention — presentation is cheap to recompute, never cached across requests), call the new pure projection function, `c.json(...)` the result. `/api/search` additionally reads `searchIndexState.state()` first per RESEARCH.md's Code Examples section — copy that block verbatim as the wiring template:

```typescript
const searchIndexState = createSearchIndexState();
searchIndexState.buildFrom(source.getSnapshot()); // scheduled via setImmediate internally

app.get('/api/search', (c) => {
  const q = c.req.query('q') ?? '';
  const state = searchIndexState.state();
  if (state.status !== 'ready') return c.json({ status: state.status, groups: [] });
  return c.json({ status: 'ready' as const, ...runSearch(state.index, presentation, q) });
});
```

**Import convention:** all new presentation-layer imports (`buildRoadmapViewModel`, `buildDashboardViewModel`, `buildArtifactIndex`) are named-imported at the top of the file, one per module — follow exactly, no default exports, no barrel re-exports.

---

### `src/presentation/routes.ts` (modify — add `search`/`traceability` route kinds)

**Analog:** itself — existing `presentationRoutePatterns` const and `PresentationRoute` union (read lines 1-40):

```typescript
export const presentationRoutePatterns = {
  dashboard: '/',
  roadmap: '/roadmap',
  milestone: '/milestones/:milestoneKey',
  phase: '/milestones/:milestoneKey/phases/:phaseKey',
  plan: '/milestones/:milestoneKey/phases/:phaseKey/plans/:planId',
  phaseArtifact: '/milestones/:milestoneKey/phases/:phaseKey/artifacts/:artifactToken',
  artifact: '/artifacts/:artifactToken',
} as const;

export type PresentationRoute =
  | { kind: 'dashboard' }
  | { kind: 'roadmap' }
  | ...
```

Add `search: '/search'` and `traceability: '/traceability'` as new top-level string patterns (matching `dashboard`/`roadmap`'s flat-string shape — no path params needed, since `/search` carries its query via `?q=` per D-03, not a route param), and add `{ kind: 'search' }` / `{ kind: 'traceability' }` to the `PresentationRoute` union. Both are simple additions with no new encode/decode helpers required (unlike `phaseKeyOf`/`milestoneKeyOf`, which exist only because those routes carry compound identity in the path).

---

### `src/web/components/app-shell.tsx` (modify — sidebar restructuring, search field)

**Analog:** itself — full file read (84 lines). Current structure: header → optional `.shell-notice` → `.shell-content` wrapping `<Outlet />`.

```typescript
import { useQuery } from '@tanstack/react-query';
import { BookOpenText, LayoutDashboard, Map, Radio } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { ThemeToggle } from './theme-toggle.tsx';

async function fetchPresentation(): Promise<ProjectPresentation> {
  const response = await fetch('/api/presentation', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Presentation request failed (${response.status})`);
  return (await response.json()) as ProjectPresentation;
}
```

```typescript
<nav className="shell-nav" aria-label="Primary navigation">
  <NavLink className={navigationClass} end to={presentationRoutePatterns.dashboard}>
    <LayoutDashboard aria-hidden="true" /> Dashboard
  </NavLink>
  <NavLink className={navigationClass} to={presentationRoutePatterns.roadmap}>
    <Map aria-hidden="true" /> Roadmap
  </NavLink>
</nav>
```

D-16 requires a third `NavLink` for `/traceability` here, following the identical `navigationClass`/icon/`presentationRoutePatterns.<x>` pattern. D-09's sidebar requires restructuring the DOM below the header from `.shell-content > <Outlet/>` into `.shell-content` containing a new `<TreeNavigator>` sidebar plus the existing `<Outlet/>`, per UI-SPEC's grid-column guidance — `presentation` is already fetched here via `useQuery(['presentation'], ...)`, and `TreeNavigator` should consume that same query result (already in the `AppShell` component's scope) rather than re-fetching.

**Error/degradation convention to copy exactly** (lines ~73-78):

```typescript
{presentation.isError ? (
  <div className="shell-notice" role="alert">
    The shell could not refresh its snapshot metadata. Page-level data may also be unavailable.
  </div>
) : null}
```

Per UI-SPEC's "tree-navigator error" resolution, the tree sidebar has **no separate error state** — it degrades silently when `presentation.isError`, relying on this existing shell-level notice. Do not add a second error banner.

---

### `src/web/components/search-field.tsx` (new)

**Analog:** `src/web/components/reference-preview.tsx` for `@base-ui/react/popover` positioning conventions (`sideOffset={8}`, `positionMethod="fixed"`, virtual-anchor `getBoundingClientRect`), and `app-shell.tsx`'s `fetchPresentation`/`useQuery` pair for the fetch-wrapper shape. Use `@base-ui/react/combobox` per UI-SPEC (not a hand-rolled `Popover`+`<input>`).

**Core pattern (debounce + stale-response guard)** — copy from RESEARCH.md's Code Examples verbatim, which is itself built from this project's established `useQuery`/fetch conventions:

```typescript
async function fetchSearch(query: string, signal: AbortSignal): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) throw new Error(`Search request failed (${response.status})`);
  return (await response.json()) as SearchResponse;
}

const [query, setQuery] = useState('');
const [debounced, setDebounced] = useState('');
useEffect(() => {
  const id = setTimeout(() => setDebounced(query), 160); // D-02: 120–200ms band
  return () => clearTimeout(id);
}, [query]);

const search = useQuery({
  queryKey: ['search', 'dropdown', debounced],
  queryFn: ({ signal }) => fetchSearch(debounced, signal),
  enabled: debounced.length > 0,
  refetchInterval: (q) => (q.state.data?.status === 'building' ? 500 : false),
});
```

Note the `fetch(url, { headers: { Accept: 'application/json' } })` convention from `fetchPresentation`/`fetchRoadmap` — include the same `Accept` header for consistency, and the same `if (!response.ok) throw new Error(...)` shape (message format: `` `${Noun} request failed (${status})` ``).

**Error copy convention:** per UI-SPEC, a fetch failure renders `Search is unavailable.` inside a reduced-scale `.notice.destructive` row inside the dropdown — reuse the `.notice.destructive` class already used by `app-shell.tsx`'s `.shell-notice` sibling pattern and by `roadmap-page.tsx` (below), not a new error-styling class.

---

### `src/web/components/tree-navigator.tsx` (new)

**Analog:** `src/web/pages/roadmap-page.tsx`'s `PhaseFlow` component (read lines 1-100) for native `<details>` disclosure + `Link`/`NavLink` routing + icon-from-lucide conventions.

```typescript
import { Check, ChevronRight, Circle, ExternalLink, History, Link2, Waypoints } from 'lucide-react';
import { Link, useLocation } from 'react-router';
```

```typescript
<h3><Link to={phase.url}>{phase.name}</Link></h3>
```

Per UI-SPEC, tree disclosure MUST use native `<details>`/`<summary>` (established convention — three existing uses across `globals.css`/`roadmap-page.tsx`/`artifact-page.tsx`), NOT `@base-ui/react/collapsible`. D-12's "auto-expand + highlight current route branch" behavior follows `PhaseFlow`'s existing `targeted`/`openedRef`/`detailsRef` pattern (lines 30-50) almost exactly — `useLocation()` from `react-router` supplies the current path to compare against each node's own URL, and the same `detailsRef.current.open = true` imperative-open-on-mount technique applies.

---

### `src/web/pages/search-page.tsx` and `src/web/pages/traceability-page.tsx` (new)

**Analog:** `src/web/pages/roadmap-page.tsx` in full — the canonical Phase 2 page shape: `fetch*` async function → `useQuery` → loading/error/populated branches → `.notice.destructive` for errors.

```typescript
async function fetchRoadmap(): Promise<RoadmapViewModel> {
  const response = await fetch('/api/roadmap', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Roadmap request failed (${response.status})`);
  return (await response.json()) as RoadmapViewModel;
}
```

Copy this exact function shape for `fetchSearchResults(query)` (targeting `/api/search?q=`) and `fetchTraceability()` (targeting `/api/traceability`). Per UI-SPEC's Copywriting Contract, the error block must mirror `roadmap-page.tsx`'s existing:

```
Heading: "The roadmap could not be loaded." / body: "{roadmap.error.message}"
```

→ `search-page.tsx`: `"Search could not be loaded."` / `{error.message}`
→ `traceability-page.tsx`: `"The traceability view could not be loaded."` / `{error.message}`
— both inside the same `.notice.destructive` wrapper class, no new error-presentation component.

`search-page.tsx`'s query source: read `?q=` from the URL via `react-router`'s `useSearchParams` (D-03 — query lives in the URL, bookmarkable, no history entries added by the header field's local typing state).

`traceability-page.tsx`'s table: reuse the existing `.coverage-table-boundary` `overflow-x-auto` wrapper class from Phase 2 (named directly in UI-SPEC's overflow resolution) rather than inventing a new scroll container.

---

## Shared Patterns

### Server-side view-model boundary

**Source:** `src/server/project-presentation.ts` (`projectRequirement`, `artifactDtos`) and `src/presentation/roadmap.ts` (`buildRoadmapViewModel`)
**Apply to:** `search.ts`, `tree.ts`, `traceability.ts`
All three new presentation modules must shape their output fully server-side (URLs pre-built via `routes.ts`, statuses pre-joined, no domain objects crossing the HTTP boundary) — "no domain logic on the client," an explicit ARCHITECTURE.md convention already followed by every existing `presentation/*.ts` module.

### Route builders — never hand-built hrefs

**Source:** `src/presentation/routes.ts` (`buildPlanUrl`, `buildPhaseUrl`, `buildMilestoneUrl`, `buildArtifactUrl`, `phaseKeyOf`, `milestoneKeyOf`)
**Apply to:** `search.ts`, `tree.ts`, `traceability.ts`, and every new web component that renders a link
Every result row, tree node, and traceability row link must resolve through these existing builders.

### Fetch-wrapper + useQuery pair

**Source:** `src/web/components/app-shell.tsx` (`fetchPresentation`), `src/web/pages/roadmap-page.tsx` (`fetchRoadmap`)
**Apply to:** `search-field.tsx`, `search-page.tsx`, `traceability-page.tsx`

```typescript
async function fetch<X>(): Promise<X> {
  const response = await fetch('/api/<endpoint>', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`<Noun> request failed (${response.status})`);
  return (await response.json()) as X;
}
```

### Error/degradation copy — `.notice.destructive`

**Source:** `src/web/pages/roadmap-page.tsx` error branch, `src/web/components/app-shell.tsx`'s `.shell-notice`
**Apply to:** `search-page.tsx`, `traceability-page.tsx`, `search-field.tsx`'s dropdown error row
Consistent heading + `{error.message}` body inside `.notice.destructive`; never a bespoke error component per surface.

### Disclosure — native `<details>`/`<summary>`, never `@base-ui/react/collapsible`

**Source:** `src/web/pages/roadmap-page.tsx`'s `PhaseFlow` (`<details ref={detailsRef}>`)
**Apply to:** `tree-navigator.tsx`, any collapsible traceability category group
Established Phase 2 convention, reconfirmed explicitly by UI-SPEC's Component Inventory.

### ReDoS-safe regex convention

**Source:** `src/planning-repo/mentions.ts` lines 26-36 (`ID_PATTERNS`, anchored/bounded-quantifier/no-nested-unbounded-group comment)
**Apply to:** `search-index.ts`'s `ID_OR_PATH_SHAPE` tokenizer regex
Any new regex must carry the same style of justifying comment and satisfy the same safety property — named explicitly in RESEARCH.md's Security Domain section as a required review standard, not optional.

### One-way dependency direction — no new `node:fs`/`node:path` reads

**Source:** ARCHITECTURE.md (cited in RESEARCH.md and CONTEXT.md D-11), enforced today by every `presentation/*.ts` and `server/*.ts` module never importing `node:fs`
**Apply to:** `tree.ts`, `search-index.ts`, `traceability.ts`
All three read only the already-assembled `ProjectSnapshot`/`Project`/`presentation` — never call `discover()` or `PlanningFilesystem` a second time.

## No Analog Found

None — every new file in this phase has at least a role-match analog already in the codebase (see table above). The genuinely novel logic (MiniSearch `tokenize`/`processTerm` pair, snippet extraction, non-blocking index-build scheduling) has no existing in-repo analog by definition — RESEARCH.md's Patterns 1, 3, and 4 (with verified `node_modules/minisearch` source excerpts) are the correct reference for those three pieces; there is nothing pre-existing in this codebase for the planner to copy for the tokenizer/snippet-extraction/readiness-state logic specifically, only for the surrounding module/route/component wiring shape.

## Metadata

**Analog search scope:** `src/planning-repo/`, `src/domain/`, `src/server/`, `src/presentation/`, `src/web/components/`, `src/web/pages/`, `test/`
**Files read directly this session:** `src/planning-repo/assemble.ts`, `src/server/artifact-index.ts`, `src/server/index.ts` (partial), `src/presentation/routes.ts` (partial), `src/planning-repo/mentions.ts` (partial), `src/web/components/app-shell.tsx` (full), `src/web/pages/roadmap-page.tsx` (partial), `src/planning-repo/discovery.ts` (partial), `src/server/project-presentation.ts` (partial), `test/presentation/coverage.test.ts`, `test/discovery.test.ts`, `src/presentation/roadmap.ts` (partial), `src/domain/model.ts`/`assemble.ts` grep for `QuickTask`
**Pattern extraction date:** 2026-09-02
