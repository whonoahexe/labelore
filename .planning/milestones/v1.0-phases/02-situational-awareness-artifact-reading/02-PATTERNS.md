# Phase 2: Situational Awareness & Artifact Reading - Pattern Map

**Mapped:** 2026-08-25
**Files analyzed:** 35 new/modified files or cohesive file groups
**Analogs found:** 23 / 35

## Scope Basis

The file set comes from `02-RESEARCH.md`'s recommended project structure plus the config, page,
component, and test files implied by its six-subsystem decomposition. Locked decisions D-01–D-17
require the dashboard, roadmap/history, artifact and plan/summary readers, canonical links, previews,
anchors, and visual shell. No Phase 3 tree browser/search files are included.

The repository has no React, Vite, Hono, unified, or browser-route implementation yet. For those
roles, this map distinguishes a genuine local analog from a research-specified new pattern. The only
external implementation treated as an analog is the explicitly authorized, read-only visual source
under `/home/cinedise/studio-portal/frontend/`; it is a copy/adaptation reference, never a runtime
dependency.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | build/runtime | `package.json` | exact |
| `package-lock.json` | config | build/runtime | `package-lock.json` | exact |
| `tsconfig.json` | config | transform | `tsconfig.json` | exact |
| `eslint.config.js` | config | transform | `eslint.config.js` | exact |
| `vitest.config.ts` | config | test-discovery | `vitest.config.ts` | exact |
| `vite.config.ts` | config | build/runtime | none | no analog |
| `components.json` | config | code-generation | `/home/cinedise/studio-portal/frontend/components.json` | exact external reference |
| `index.html` | config | request-response | none | no analog |
| `src/server/index.ts` | controller | request-response | `src/planning-repo/snapshot.ts` | data-flow match |
| `src/server/project-presentation.ts` | service | transform | `src/planning-repo/serialize.ts` | role match |
| `src/server/artifact-index.ts` | service | request-response | `src/planning-repo/snapshot.ts` | role match |
| `src/presentation/routes.ts` | utility | transform/request-response | `src/planning-repo/assemble.ts` | identity-pattern match |
| `src/presentation/references.ts` | service | transform | `src/planning-repo/crossref.ts` | exact role/data-flow |
| `src/presentation/dashboard.ts` | service | transform | `src/planning-repo/assemble.ts` | exact data-source match |
| `src/presentation/roadmap.ts` | service | transform | `src/planning-repo/assemble.ts` | exact data-source match |
| `src/presentation/coverage.ts` | utility | transform | `src/planning-repo/assemble.ts` | role match |
| `src/rendering/plan-segments.ts` | utility | transform | `src/planning-repo/handlers/plan.ts` | domain-boundary match |
| `src/rendering/markdown.ts` | service | transform | `src/planning-repo/registry.ts` | pipeline role match |
| `src/rendering/linkify.ts` | utility | transform | `src/planning-repo/crossref.ts` | resolution role match |
| `src/rendering/frontmatter-views.ts` | provider/registry | transform | `src/planning-repo/handlers/index.ts` | exact registry pattern |
| `src/web/main.tsx` | provider | event-driven | none | no analog |
| `src/web/app-router.tsx` | route | request-response | none | no analog |
| `src/web/pages/dashboard-page.tsx` | component | request-response | none | no analog |
| `src/web/pages/roadmap-page.tsx` | component | request-response | none | no analog |
| `src/web/pages/artifact-page.tsx` | component | request-response | none | no analog |
| `src/web/pages/plan-pair-page.tsx` | component | request-response | none | no analog |
| `src/web/components/app-shell.tsx` | component | event-driven | none | no analog |
| `src/web/components/theme-toggle.tsx` | component | event-driven | `/home/cinedise/studio-portal/frontend/components/theme-toggle.tsx` | exact external reference |
| `src/web/components/reference-preview.tsx` | component | event-driven/request-response | none | no analog |
| `src/web/components/document-view.tsx` | component | request-response | none | no analog |
| `src/web/components/ui/*` | component | event-driven | `/home/cinedise/studio-portal/frontend/components.json` | style/config match |
| `src/web/styles/globals.css` | config | transform/presentation | `/home/cinedise/studio-portal/frontend/app/globals.css` | exact external reference |
| `test/presentation/*.test.ts` | test | transform | `test/crossref.test.ts` | exact test pattern |
| `test/rendering/*.test.ts` | test | transform | `test/handlers.test.ts` | exact test pattern |
| `test/server/*.test.ts` | test | request-response | `test/serialize.test.ts` | role match |

## Pattern Assignments

### `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`

**Analogs:** same-named repository files.

Preserve the current ESM/strict/version-pinning conventions. Add web dependencies and scripts; do not
silently upgrade TypeScript, Vitest, or `gray-matter`. The package legitimacy checkpoint from
`02-RESEARCH.md` must precede installing its twelve `SUS`-flagged packages.

**Package/config pattern** (`package.json:5-12`, `tsconfig.json:3-14`):

```json
{
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  }
}
```

```json
{
  "strict": true,
  "allowImportingTsExtensions": true,
  "verbatimModuleSyntax": true
}
```

Extend, rather than replace, the existing Node configuration. Browser globals/TSX should be scoped to
web files (or a web-specific config referenced by the root config) so server code does not acquire an
implicit DOM environment.

### `vite.config.ts`

**Analog:** none in this repository.

Use the Vite React and Tailwind plugins specified in `02-RESEARCH.md`; keep aliases aligned with
`components.json`. Do not copy a Next.js config from studio-portal. The config must build the React
client independently of the Hono server and must not create any filesystem-reading client plugin.

### `components.json`

**Analog:** `/home/cinedise/studio-portal/frontend/components.json:1-24`.

**Copy/adapt:**

```json
{
  "style": "base-sera",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/web/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide"
}
```

The source has `rsc: true` and a Next path; those two values must be adapted for Vite. Preserve the
base-sera, CSS-variable, neutral-base, lucide, and alias conventions.

### `index.html`

**Analog:** none in this repository.

Follow the research contract: include `#root` and load `src/web/main.tsx`; run the compile-time-constant
theme initialization in `<head>` before first paint. No target-project value or artifact content may
be interpolated into the theme script.

### `src/server/index.ts` (controller, request-response)

**Analog:** `src/planning-repo/snapshot.ts`.

**Imports/layering pattern** (`snapshot.ts:5-11`):

```typescript
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { LoadStatus, ProjectSnapshot } from './types.ts';
import { discover } from './discovery.ts';
import { parseWithRegistry } from './registry.ts';
import { assembleDomainModel } from './assemble.ts';
```

Server startup owns one `PlanningRepository`. API handlers call its `load()`/`getSnapshot()` seam and
presentation helpers; they do not import `node:fs`, parsing handlers, or `LocalFsPlanningFilesystem`
for route-local reads.

**Single snapshot seam** (`snapshot.ts:57-90`):

```typescript
async refresh(): Promise<ProjectSnapshot> {
  const loadStatus = await this.checkTargetIsGsdProject();
  const readAt = new Date().toISOString();
  // ...one full rebuild...
  this.snapshot = { loadStatus, readAt, rootPath: this.rootPath, project, warnings, exclusions };
  return this.snapshot;
}
```

Route ordering is new: `/api/*` first, static assets second, final non-API `index.html` fallback last.
Test a pasted milestone-qualified deep link, not only in-app navigation.

### `src/server/project-presentation.ts` (service, transform)

**Analog:** `src/planning-repo/serialize.ts`.

The analog proves why recursive domain serialization is unsafe, but the new DTO must not call
`normalizeForGolden()` and must not emit `$circularRef` stubs. Project resolved references to canonical
keys or `null`.

**Pure recursive-transform shape** (`serialize.ts:48-62`):

```typescript
function breakCycles(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) return value.map((v) => breakCycles(v, nextAncestors));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = breakCycles(v, nextAncestors);
  }
  return out;
}
```

Copy the pure-input/pure-output discipline, not its golden-specific cycle stubs. DTO tests must prove
`JSON.stringify()` succeeds and active/archive Phase 1 identities remain distinct.

### `src/server/artifact-index.ts` (service, request-response)

**Analog:** `src/planning-repo/snapshot.ts:73-90` and `src/planning-repo/assemble.ts:157-177`.

Build the artifact lookup once from the just-loaded snapshot, using artifact path/canonical token as
the key. Return a typed not-found result for an invalid key. Never decode a request parameter into a
filesystem path. Preserve `readAt`, warning, body, and open `kind`/frontmatter fields.

### `src/presentation/routes.ts` (utility, transform/request-response)

**Analog:** compound identity in `src/planning-repo/assemble.ts:41-44`.

```typescript
function phaseGroupKey(identity: PhaseIdentity): string {
  return `${identity.milestoneVersion ?? ''}::${identity.projectCode ?? ''}::${identity.number}`;
}
```

Copy the invariant—milestone version + project code + phase number, never number alone—into a public,
reversible codec. Centralize builders and parsers for milestone, phase, plan, artifact, and heading
URLs. Slugs/display names may decorate a URL but must not be the only stable identity. Every breadcrumb,
preview Open action, linkifier, copy-heading action, server lookup, and future search destination uses
this module.

### `src/presentation/references.ts` (service, transform)

**Analog:** `src/planning-repo/crossref.ts`.

**Context-scoped lookup** (`crossref.ts:68-78`, `crossref.ts:98-112`):

```typescript
const requirementsById = new Map(project.requirements.map((r) => [r.id, r]));
for (const phase of project.phases) {
  phase.requirementRefs = phase.requirementIds.map((raw) => ({
    raw,
    resolved: requirementsById.get(raw) ?? null,
  }));
}

for (const phase of project.phases) {
  for (const plan of phase.plans) {
    plan.dependsOnRefs = dependsOnRaw.map((raw) => ({
      raw,
      resolved: phase.plans.find((sibling) => sibling.id === raw) ?? null,
    }));
  }
}
```

Build lookup maps once per presentation. Resolve phase/plan prose relative to the containing artifact's
milestone; project-root docs use the active milestone. Preserve `{ raw, resolved: null }` as ordinary
data. A null target produces plain text—no anchor, preview trigger, warning, or fake destination.

### `src/presentation/dashboard.ts` (service, transform)

**Analog:** `src/planning-repo/assemble.ts:112-135`, which already keeps formal and observed status
separate.

```typescript
let diskStatus: string;
if (plans.length === 0) diskStatus = Object.keys(artifacts).length > 0 ? 'researched' : 'no_directory';
else if (plans.every((p) => p.summary !== null)) diskStatus = 'complete';
else diskStatus = 'in_progress';

return {
  roadmapComplete: roadmapBlock?.roadmapComplete ?? null,
  diskStatus,
  // ...
};
```

Return one `DashboardViewModel` with current position, immediate next item plus two previews, one
prioritized attention list with explicit types, formal progress, and secondary observed progress.
Current position is projected from STATE frontmatter; never recount rendered Markdown in React.
Preserve `null` formal status instead of coercing it to `false`.

### `src/presentation/roadmap.ts` (service, transform)

**Analog:** `src/planning-repo/assemble.ts:198-265`.

```typescript
for (const block of liveRoadmapPhases) {
  if (matchedLiveNumbers.has(block.number)) continue;
  const identity: PhaseIdentity = {
    milestoneVersion: activeMilestoneVersion,
    number: block.number,
    projectCode: null,
    slug: '',
  };
  livePhases.push(buildPhaseFromRoadmapOnly(identity, block, false));
}

const phases: Phase[] = milestones.flatMap((m) => m.phases);
```

Project active and archived milestone trees without merging duplicate numbers. Group plan rows by the
open `frontmatter.wave` value, sort deterministically, and label blocking from `dependsOnRefs`. Render
an ordered vertical spine and show `dependsOnRaw` verbatim; do not manufacture graph edges from it.

### `src/presentation/coverage.ts` (utility, transform)

**Analog:** pairing logic in `src/planning-repo/assemble.ts:69-108`.

```typescript
const summaryArtifact = summariesByPlanNumber.get(parsedName.plan) ?? null;
const summary: PlanSummary | null = summaryArtifact
  ? { path: summaryArtifact.ref.path, frontmatter: summaryArtifact.frontmatter }
  : null;
```

Copy deterministic pairing/fallback behavior, but use the full artifacts addressed by `Plan.path` and
`Plan.summary.path`. Match truth-to-coverage conservatively: exact normalized text, then one-to-one
requirement/token similarity over an explicit threshold. Return exact/inferred/unmatched states and
all unmatched rows. Never zip arrays by index.

### `src/rendering/plan-segments.ts` (utility, transform)

**Analog:** `src/planning-repo/handlers/plan.ts:10-26` defines the handoff boundary.

```typescript
export const PlanHandler: ArtifactHandler = {
  kind: 'plan',
  // ...
  parse(raw, ref) {
    const fm = tryParseFrontmatter(raw.content);
    return { title, frontmatter: fm.data, body: fm.body, warning: fm.warning, structured: {} };
  },
};
```

The new segmenter receives that verbatim body only for `kind === 'plan'`. Implement a bounded linear
scanner over recognized wrappers, ignoring fenced code. Preserve inner Markdown; expose allowlisted
attributes (`type`, `gate`, `tdd`) as text badges. Unknown tags enter normal sanitized Markdown. A
mismatched recognized tag becomes escaped literal text plus a local render warning, not a thrown error.

### `src/rendering/markdown.ts` (service, transform)

**Analog:** `src/planning-repo/registry.ts:39-76` for one ordered pipeline with local degradation.

```typescript
const handler = HANDLERS.find((h) => h.match(ref)) ?? GenericMarkdownHandler;
try {
  const parsed = handler.parse(rawArtifact, ref);
  return { /* parsed result plus warnings */ };
} catch (err) {
  warnings.add(ref.path, 'structured-extraction', /* ... */);
  return { /* safe empty fallback */ };
}
```

Use one initialized unified processor/highlighter lifecycle. Plugin order is load-bearing:

```typescript
remarkParse
  -> remarkGfm
  -> remarkRehype({ allowDangerousHtml: true })
  -> rehypeRaw
  -> rehypeSanitize
  -> rehypeSlug
  -> trusted reference/highlight/heading-control enrichment
  -> rehypeStringify
```

Only finalized sanitized HTML may reach `dangerouslySetInnerHTML`. Shiki is a singleton with dual-theme
output. Mermaid remains a strict, browser-only mount stage and fails locally without blanking the
artifact page.

### `src/rendering/linkify.ts` (utility, transform)

**Analog:** null-preserving resolution in `src/planning-repo/crossref.ts:73-95`.

Walk parsed/sanitized HAST text nodes; skip `a`, `code`, `pre`, and Mermaid nodes. Call
`presentation/references.ts`, and create a trusted preview control only when resolution succeeds.
Generate its URL exclusively through `presentation/routes.ts`. Do not regex-rewrite the raw Markdown
string because that corrupts code spans, fences, and authored links.

### `src/rendering/frontmatter-views.ts` (provider/registry, transform)

**Analog:** specialized-first, unconditional-fallback-last registry in
`src/planning-repo/handlers/index.ts:18-30` and `handlers/generic.ts:12-26`.

```typescript
export const HANDLERS: ArtifactHandler[] = [
  PlanHandler,
  SummaryHandler,
  RoadmapHandler,
  // ...specific handlers...
  GenericMarkdownHandler,
];

export const GenericMarkdownHandler: ArtifactHandler = {
  kind: 'unknown',
  match: () => true,
  // ...
};
```

Implement known field views for `must_haves`, `coverage`, `key_links`, and `progress`, recording handled
keys. Render every unhandled or wrong-shaped value through a safe recursive key/value fallback. The
fallback is unconditional and last; invalid specialized data must remain visible rather than throw or
disappear.

### `src/web/main.tsx`, `src/web/app-router.tsx`

**Analog:** none in this repository.

Use the stack/route shapes in `02-RESEARCH.md`. `main.tsx` owns provider composition (React Query,
router, strict mode as appropriate). `app-router.tsx` declares the canonical milestone-qualified route
tree and delegates URL construction/parsing to `presentation/routes.ts`; it must not duplicate route
strings in components. Include a local not-found/error surface and preserve the document shell on
artifact render failure.

### `src/web/pages/dashboard-page.tsx`

**Analog:** none in this repository.

Consume `DashboardViewModel` only. The component assigns hierarchy but derives no facts: current
position first, one primary progress display, compact sourced disk signal, conditional discrepancy,
one immediate next item and two subdued previews, then the typed Needs attention list.

### `src/web/pages/roadmap-page.tsx`

**Analog:** none in this repository.

Consume the roadmap view model. Render ordered phases compact by default; expand success criteria,
requirements, and wave bands in place. Keep archive history visually subdued and separately labeled.
Use accessible disclosure state; keep raw dependency labels visible and never display source ASCII art
as the primary flow.

### `src/web/pages/artifact-page.tsx`, `src/web/components/document-view.tsx`

**Analog:** none in this repository.

Document-first structure: breadcrumbs, title/type, compact structured frontmatter, then full-width
document. Heading copy controls appear on pointer hover or keyboard focus and copy/update the stable
fragment URL only when activated. Tables, `pre`, and Mermaid containers scroll locally.

### `src/web/pages/plan-pair-page.tsx`

**Analog:** none in this repository.

Place the truth-to-coverage matrix first, then full plan and full summary in stacked sections with
jump links. Do not use permanent side-by-side panes or narrow the reading canvas.

### `src/web/components/app-shell.tsx`

**Analog:** none in this repository.

Keep the shell minimal and document-width-friendly. Apply `min-width: 0` at every flex/grid content
boundary and expose `readAt` from the loaded snapshot. Navigation must use canonical route builders.

### `src/web/components/theme-toggle.tsx`

**Analog:** `/home/cinedise/studio-portal/frontend/components/theme-toggle.tsx:24-40`.

```tsx
export function ThemeToggle() {
  function handleClick() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // Theme still applies for this page view.
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick}>
      <Moon aria-hidden="true" className="block dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
      <span className="sr-only">Toggle light or dark theme</span>
    </Button>
  );
}
```

Adapt import aliases/storage key for this Vite app. Preserve DOM `.dark` as the source of truth,
storage-failure degradation, lucide icons, and the accessible label.

### `src/web/components/reference-preview.tsx`

**Analog:** none in this repository.

Use Base UI Popover per research rather than custom focus/positioning. The trigger exists only for a
resolved reference; the popup shows identity, title, status, location, one type-specific detail, and an
explicit Open action. Pointer and keyboard activation/dismissal must be equivalent.

### `src/web/components/ui/*`

**Analog:** `/home/cinedise/studio-portal/frontend/components.json:3-23` for generation conventions.

Generate only the base-sera primitives actually required (button/badge/disclosure/popover support).
Commit generated source locally; never import studio-portal code at runtime. Keep square geometry and
the configured aliases rather than creating a parallel component style.

### `src/web/styles/globals.css`

**Analog:** `/home/cinedise/studio-portal/frontend/app/globals.css:1-125`.

Copy the Tailwind/shadcn imports, `.dark` custom variant, `@theme inline` mappings, and the light/dark
OKLCH token blocks. Keep the source's palette and base-sera language, but add Phase 2's containment
contract:

```css
html,
body,
#root {
  max-width: 100%;
}

table,
pre,
.mermaid-scroll {
  max-width: 100%;
  overflow-x: auto;
}
```

Use `min-width: 0` on actual layout columns as well; global `overflow-x: hidden` is not a substitute.
Shiki dual-theme selectors must use the same root `.dark` class.

### `test/presentation/*.test.ts`

**Analog:** `test/crossref.test.ts:12-18`, `test/crossref.test.ts:64-87`.

```typescript
async function assembleTree(files: Record<string, string>) {
  const fs = new InMemoryPlanningFilesystem(files);
  const warnings = new WarningCollector();
  const { refs } = await discover(fs);
  const parsed = await Promise.all(refs.map((r) => parseWithRegistry(fs, r, warnings)));
  const project = assembleDomainModel(parsed, warnings.all(), ROOT);
  return { project, warnings };
}
```

Use synthetic in-memory corpora for route codec round trips, duplicate active/archive Phase 1,
dashboard priority/discrepancy states, wave/dependency projections, conservative coverage matching,
and dangling references. Assert both value and provenance; assert null remains null.

### `test/rendering/*.test.ts`

**Analog:** `test/handlers.test.ts:165-173`, `test/handlers.test.ts:289-331`.

```typescript
it('lifts nested must_haves frontmatter and keeps the body verbatim with pseudo-XML tags untouched', () => {
  // Realistic multi-line source
  expect(result.body).toContain('<task type="auto">');
});

it('matches an unknown kind with the unconditional generic fallback, registered last', () => {
  expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
});
```

Cover multiline/inline/nested/fenced/malformed PLAN wrappers; scripts, event handlers, unsafe schemes,
SVG/MathML payloads; GFM/table/task/blockquote/code output; duplicate heading IDs; unresolved reference
text; known and unknown frontmatter; Shiki dual-theme output. Include at least one real multi-task plan
fixture, not only toy strings.

### `test/server/*.test.ts`

**Analog:** `test/serialize.test.ts:13-37` plus repository load tests in
`test/crossref.test.ts:152-160`.

Use `InMemoryPlanningFilesystem` and a real `PlanningRepository`. Prove presentation JSON has no cycle
stubs, artifact lookup cannot traverse outside indexed keys, warnings/load status survive, and a
milestone-qualified production deep link receives the SPA shell instead of 404. API tests should fail
if server route modules import `node:fs` or parser handlers directly.

## Shared Patterns

### Dependency Direction

**Source:** `src/domain/model.ts:1-5`, `src/planning-repo/snapshot.ts:5-11`  
**Apply to:** all server, presentation, rendering, and web files.

The dependency remains one-way: `planning-fs -> planning-repo -> zero-I/O domain`, with new
presentation/rendering/web layers above it. Client modules consume DTOs and canonical codecs. They do
not import `planning-fs`, Node APIs, or parser handlers.

### Open Values and Generic Fallback

**Source:** `src/domain/model.ts:4-26`, `src/planning-repo/handlers/index.ts:18-30`  
**Apply to:** DTOs, selectors, roadmap badges, artifact views, frontmatter panels.

Status/kind/config/frontmatter values are open strings/maps. Known values may receive specialized
presentation; unknown values are displayed generically. A future value must not cause an exhaustive
switch to throw.

### Dangling References Are Ordinary Data

**Source:** `src/domain/model.ts:29-39`, `src/planning-repo/crossref.ts:73-112`  
**Apply to:** routes, references, linkifier, previews, dashboard/roadmap dependency labels.

```typescript
export interface Reference<T> {
  raw: string;
  resolved: T | null;
}
```

Only `resolved !== null` authorizes a link/preview. Null is plain text and does not add a warning.

### Local Degradation, Not Page Failure

**Source:** `src/planning-repo/registry.ts:17-36`, `src/planning-repo/registry.ts:42-76`  
**Apply to:** artifact index, PLAN segmenter, Markdown rendering, Mermaid mount, server responses.

Catch at the smallest artifact/render boundary; return usable fallback content plus a scoped warning.
One malformed artifact must not blank the dashboard, roadmap, or another document.

### Deterministic Keys and Ordering

**Source:** `src/planning-repo/assemble.ts:41-44`, `src/planning-repo/assemble.ts:211-265`  
**Apply to:** DTO maps, route codec, milestone/phase lists, wave bands, previews, coverage matrices.

Use compound milestone-qualified keys and explicit stable sorts. Never key a phase by number alone or
rely on object/array encounter order for user-visible semantics.

### Theme and Overflow

**Source:** `/home/cinedise/studio-portal/frontend/app/globals.css:5-117`,
`/home/cinedise/studio-portal/frontend/components/theme-toggle.tsx:24-40`  
**Apply to:** shell, every page, rendered Markdown, code, table, Mermaid, popup.

One root `.dark` class controls tokens, toggle state, and Shiki output. Wide document children scroll
inside bounded wrappers; the page body never becomes the horizontal scroller.

### Authentication

No authentication pattern applies. The product is explicitly local, single-user, and read-only; Phase
2 must not add accounts, sessions, guards, or access-control UI. The project-boundary control is
snapshot-indexed artifact lookup rather than an auth layer.

## No Analog Found

These files introduce the project's first browser/Hono implementation. The planner should use the
concrete contracts in `02-RESEARCH.md` and the assignments above rather than pretend a local code analog
exists.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `vite.config.ts` | config | build/runtime | No Vite configuration exists |
| `index.html` | config | request-response | No browser entry document exists |
| `src/web/main.tsx` | provider | event-driven | No React root/provider composition exists |
| `src/web/app-router.tsx` | route | request-response | No client router exists |
| `src/web/pages/*.tsx` | component | request-response | No React pages exist |
| `src/web/components/app-shell.tsx` | component | event-driven | No browser shell exists |
| `src/web/components/reference-preview.tsx` | component | event-driven/request-response | No popover/preview interaction exists |
| `src/web/components/document-view.tsx` | component | request-response | No sanitized-document mounting component exists |
| `src/web/components/ui/*` | component | event-driven | Must be generated from the configured Vite/base-sera setup |

## Metadata

**Analog search scope:** `src/`, `test/`, repository root configs, and the four explicitly authorized
studio-portal visual references  
**Repository source/test files scanned:** 46  
**Repository files enumerated:** 52  
**Strong local analogs stopped at:** 5 (`snapshot.ts`, `serialize.ts`, `crossref.ts`, `registry.ts`,
`assemble.ts`) plus their directly corresponding tests  
**Pattern extraction date:** 2026-08-25

