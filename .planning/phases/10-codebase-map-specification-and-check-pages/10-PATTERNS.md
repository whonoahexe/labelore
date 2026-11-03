# Phase 10: Codebase Map, Specification and Check Pages - Pattern Map

**Mapped:** 2026-11-04
**Files analyzed:** 34 (new/modified groups; the six type families repeat one pattern)
**Analogs found:** 34 / 34 (the Codebase panel page and the marker test have role-match analogs only)

All analog paths below were confirmed git-tracked (`git ls-files` on spot checks; everything is under `src/`, `test/`, `docs/`).
No `.gsd/capabilities` mirror paths are used.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/planning-repo/handlers/codebase.ts` + `codebase-lift.ts` | handler | transform | `handlers/coverage.ts` + `coverage-body.ts` (guard shape); `handlers/project-research.ts` + `project-research-lift.ts` (multi-file lift) | exact (shape) |
| `handlers/spec.ts`, `ai-spec.ts`, `user-setup.ts`, `eval-review.ts`, `dom-verify.ts`, `reviews.ts` (+ `*-body.ts`) | handler | transform | `handlers/coverage.ts`; token match from `handlers/review.ts` | exact |
| `handlers/index.ts` (modify) | config/registry | n/a | itself (register before `GenericMarkdownHandler`) | exact |
| `src/planning-repo/folders.ts` (modify: export seven map names) | utility | n/a | `src/presentation/project-research-files.ts` (named-file list) | role-match |
| `src/presentation/codebase-map.ts` | presentation builder (leaf) | transform | `src/presentation/project-research.ts`, `review-ledger.ts` | role-match |
| `src/presentation/project-map-state.ts` | utility (leaf) | transform | `src/presentation/project-research-files.ts` (`projectHasResearch`) | exact |
| `src/server/project-api.ts` (modify: `codebaseContext` on `/documents`, `GET /codebase`) | route/controller | request-response | same file: `ledgerContext` IIFE (l.118) and `api.get('/research')` (l.322) | exact |
| `src/cli/target-path.ts` (modify `hasProjectMarker`) | utility | request-response | itself (l.50-52) | exact |
| `src/web/views/kinds.ts` (add 7 kinds + `viewKindOf`) | config | n/a | itself | exact |
| `src/web/views/manifest.ts` (add composer fields, `codebaseContext` on `ViewInput`) | config/types | n/a | itself (`coverageMatrix` l.151, `ledgerContext` l.244) | exact |
| `src/web/views/manifests.ts` (7 manifests, `resolveViewFor` uses `viewKindOf`) | config | n/a | `coverage` manifest l.269-281 | exact |
| `src/web/views/codebase-page.ts`, `spec-page.ts`, `ai-spec-page.ts`, `user-setup-page.ts`, `eval-review-page.ts`, `dom-verify-page.ts`, `reviews-page.ts` | service (pure composer) | transform | `src/web/views/coverage-matrix.ts` | exact |
| `src/web/views/*-components.tsx` for the same | component | request-response | `src/web/views/coverage-matrix-components.tsx` | exact |
| `src/web/pages/artifact-page.tsx` (modify: one `useMemo` + one render branch per field) | component | request-response | the `coverage` useMemo l.902-904, `coverageCover` l.1267, render l.1461 | exact |
| `src/web/pages/mapped-not-started-page.tsx` (lazy route) | component | request-response | `src/web/pages/research-page.tsx` (fetch + panel selection) | role-match |
| `src/web/components/copy-command.tsx` | component | event-driven | `src/web/components/copy-path-button.tsx` (`copyText`) | role-match |
| `src/web/components/app-shell.tsx` (modify: hide Roadmap/Traceability) | component | request-response | same file l.47-48 and l.94-100 (`showResearch` gate) | exact |
| `src/web/app-router.tsx` (modify: dashboard -> map-only page) | route | request-response | `PAGES` map + lazy `ResearchPage` l.53, l.76-82 | exact |
| `test/fixtures/lendshed/.planning/phases/*/NN-{SPEC,AI-SPEC,USER-SETUP,EVAL-REVIEW,DOM-VERIFY,REVIEWS}.md` | fixture | n/a | `test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/COVERAGE.md` | role-match |
| `test/fixtures/<map-only>/.planning/codebase/*.md` | fixture | n/a | `test/fixtures/shapes/.planning/codebase/{STACK,ARCHITECTURE,CONVENTIONS}.md` | exact |
| `test/helpers/fixture-roots.ts` (modify: add map-only root) | test helper | n/a | itself (`RELATIVE_ROOTS`) | exact |
| `test/fixtures/lendshed/README.md` (or `MADE-UP-EXAMPLES.md`) index | fixture doc | n/a | `test/fixtures/shapes/README.md` ledger, `fixtures/README.md` | role-match |
| `test/<type>-handler.test.ts`, `test/<type>-handler-guard.test.ts` | test | request-response | `test/coverage-handler.test.ts`, `test/review-handler-guard.test.ts` | exact |
| `test/scanner-growth.test.ts` (extend) | test | transform | itself (`Shape` + `measureGrowth`) | exact |
| `test/web/<type>.test.ts`, `test/web/<type>-view-contract.test.ts` | test | transform | `test/web/coverage-matrix.test.ts`, `test/web/coverage-view-contract.test.ts` | exact |
| `test/web/view-registry.test.ts` (modify: 24 -> 31) | test | n/a | itself l.21-26 | exact |
| `test/web/navbar-contract.test.ts` (rewrite gates, l.323-346) | test | n/a | itself | exact |
| `test/target-path.test.ts` (extend) | test | n/a | itself (l.82 `.planning` case) | exact |
| `test/made-up-examples.test.ts` (marker + index + planted control) | test | batch | `test/fixture-leak.test.ts`, `test/no-skips.test.ts` (planted-positive-control idiom) | role-match |
| `test/web/class-vocabulary.test.ts` / `docs/design-language.md` (new shared rows e.g. `status-meter`) | doc/test | n/a | existing rows in `docs/design-language.md` | exact |
| `test/e2e/pages.ts` (normalise through `viewKindOf`) | test helper | n/a | itself | exact |

## Pattern Assignments

### Handlers: `codebase.ts` and the six type handlers (handler, transform)

**Analog:** `src/planning-repo/handlers/coverage.ts` (whole file, 34 lines)

**Core pattern** (coverage.ts l.14-33). Never throws; a throw only omits the `structured` key:
```typescript
export const CoverageHandler: ArtifactHandler = {
  kind: 'coverage',
  match: (ref) => ref.kind === 'coverage',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let coverage: CoverageBody | undefined;
    try { coverage = extractCoverage(fm.body); } catch { coverage = undefined; }
    return { title, frontmatter: fm.data, body: fm.body, warning: fm.warning,
      structured: coverage === undefined ? {} : { coverage } };
  },
};
```
Imports (l.5-9): `ArtifactHandler, RawArtifact, ArtifactRef` from `../types.ts`; `tryParseFrontmatter` from `../frontmatter.ts`; `deriveTitle` from `./title.ts`; the extractor from `./<x>-body.ts`. Re-export extractor and caps from the handler file as coverage.ts does (l.11-12) so tests import from one place.

**Match by token (phase-scoped types)**: copy from `handlers/review.ts` l.30-33:
```typescript
match: (ref) => artifactTokenOf(ref) === 'REVIEW',
```
Use `'SPEC'`, `'AI-SPEC'`, `'USER-SETUP'`, `'EVAL-REVIEW'`, `'DOM-VERIFY'`, `'REVIEWS'` (whole-token compare, so `REVIEW` is not `REVIEWS`). Import from `./artifact-token.ts`. For the seven map documents use one handler with `ref.kind.startsWith('codebase-')` (kinds come from `folders.ts` `codebaseKind`; no content matching, DATA-02).

**Registry** (`handlers/index.ts` l.30-69): add `import { XHandler } from './x.ts';` and the array entry before `CoverageHandler`/`GenericMarkdownHandler`; `GenericMarkdownHandler` must stay last.

**Extractor rules** (from RESEARCH Pitfalls 1, 2, 12, 16): line scans only, caps, never a whole-document regex; add ONE fence-aware heading splitter in `codebase-lift.ts` (do not edit shared `markdown-sections.ts`); USER-SETUP and INTEGRATIONS store variable NAMES only in `structured`; use `Map` for author-keyed lookups.

**Handler test**: copy `test/coverage-handler.test.ts` l.1-40 (`ref()`/`raw()`/`parse()` helpers, "claims ahead of the generic handler" assertion `HANDLERS.find((h) => h.match(ref())) === Handler`, `HANDLERS[HANDLERS.length-1] === GenericMarkdownHandler`, `vi` spy to force a throw, `fxRead` from `test/helpers/fixture-project.ts`, `GROWTH_LIMIT`/`measureGrowth` from `test/helpers/growth.ts`). Guard test: copy `test/review-handler-guard.test.ts`.

---

### `src/presentation/project-map-state.ts` (utility leaf)

**Analog:** `src/presentation/project-research-files.ts` (whole file; the shell imports it into the entry chunk)

```typescript
export function projectHasResearch(artifacts: readonly { path: string }[]): boolean {
  return artifacts.some((artifact) => RESEARCH_FILES.some((file) => file.path === artifact.path));
}
```
Copy the shape: tiny, type-only imports, array of `{key,label,path}` specs if the panel list needs labels. `projectMapState(artifacts)` returns `{ present, mapOnly }` using `path` and `location` only (RESEARCH Pattern 4). Import the seven names from `folders.ts`; no builder imports (Pitfall 8, Phase 9 WR-03 cycle lesson).

---

### `src/presentation/codebase-map.ts` (presentation builder, transform)

**Analog:** `src/presentation/project-research.ts` (`buildResearchViewModel(presentation)`) and `src/presentation/review-ledger.ts` (`buildLedgerContext(presentation, registry, path)`).

Pure function over the cached `ProjectPresentation`; imports types only plus lift types. Exposes `buildCodebaseContext(presentation, path)` (for `/documents`) and a `buildCodebaseViewModel(presentation)` (for `GET /codebase`) over one shared core: "one builder, two doors". Readiness table from `onboard-projection.cjs` (RESEARCH Pattern 6): complete = all seven, fast = the four core and not seven, else none/"Partial map"; four command constants, never text from files.

---

### `src/server/project-api.ts` (route, request-response)

**Analog:** same file.

Context IIFE to copy (l.118-129):
```typescript
const ledgerContext = ((): LedgerContext | null => {
  try {
    const kind = lookup.artifact.kind;
    return kind === 'review' || kind === 'review-fix' || kind === 'review-disposition'
      ? buildLedgerContext(activeDerived.presentation, activeDerived.referenceRegistry, lookup.artifact.path)
      : null;
  } catch { return null; }
})();
```
Add `codebaseContext` the same way (guard on `kind.startsWith('codebase-')`), add it beside `ledgerContext` in the response (l.198), `ArtifactDocumentResponse`, `ViewInput`, and the `viewInput` `useMemo` in `artifact-page.tsx` (l.705, l.725).

Endpoint to copy (l.322-326):
```typescript
api.get('/research', (c) => {
  const runtime = c.get('runtime');
  const activeDerived = runtime.derived;
  return c.json(buildResearchViewModel(activeDerived.presentation));
});
```
Add `api.get('/codebase', ...)` returning the codebase view model.

---

### `src/cli/target-path.ts` (utility, request-response)

**Analog:** same file l.50-52, current gate:
```typescript
function hasProjectMarker(planningDirAbs: string): boolean {
  return pathExistsSync(join(planningDirAbs, 'PROJECT.md')) || pathExistsSync(join(planningDirAbs, 'STATE.md'));
}
```
Add `|| CODEBASE_MAP_FILES.some((name) => pathExistsSync(join(planningDirAbs, 'codebase', name)))` with names exported from `folders.ts`. Keep the "no `node:fs` import" rule (all disk touches through `../planning-fs/local-fs.ts`, import list at l.10-12). Empty `codebase/` or unrecognised file must not qualify. Test: extend `test/target-path.test.ts` near its l.82 "resolves a path pointing directly at .planning" case.

---

### View registration: `kinds.ts`, `manifest.ts`, `manifests.ts`

**Analog:** the `coverage` kind through all three files.

- `kinds.ts`: append to `VIEW_KINDS` (24 -> 31): `'codebase','spec','ai-spec','user-setup','eval-review','dom-verify','reviews'`. `VIEW_LOCAL_PREFIXES` then auto-allows `view-<kind>-*` class names. Add pure `viewKindOf(kind)` mapping `codebase-*` to `codebase` (RESEARCH C8).
- `manifest.ts` l.151 field style: `coverageMatrix?: (input: ViewInput) => ComposedCoverage | null;` preceded by a type-only import comment line (`import type { ComposedCoverage } from './coverage-matrix.ts';`). Add `codebasePage?`, `specPage?`, `aiSpecPage?`, `userSetupPage?`, `evalReview?`, `domVerify?`, `reviewsPage?`; add `codebaseContext?: CodebaseContext | null` next to `ledgerContext?` (l.244).
- `manifests.ts` l.269-281 manifest shape:
```typescript
coverage: {
  kind: 'coverage',
  lead: 'Which capabilities of an external API this phase integrates, and which it opts out of.',
  promote: [
    { type: 'section', heading: /coverage/i, all: true },
    { type: 'section', heading: /^decisions?/i },
  ],
  coverageMatrix: composeCoverage,
},
```
Each new manifest needs a one-sentence `lead` ending in a period and at least one `promote` entry (the promote list is the silent fallback). `resolveView(kind)` (l.413) is a plain lookup; make `resolveViewFor` call `viewKindOf` first.
- `test/web/view-registry.test.ts` l.21-26: change the pinned `24` to `31`; keys-equal-kinds check stays.

---

### Per-type composers: `codebase-page.ts`, `spec-page.ts`, etc. (pure composer, transform)

**Analog:** `src/web/views/coverage-matrix.ts`

Conventions to copy (file header l.1-18 and l.19-26): pure `ViewInput` -> `Composed*` model; no DOM, no filesystem import, no regular expression, no module-level state; returns `null` when the projection is missing or unshapeable so the promoted-section view takes over silently (Phase 9 behaviour; RESEARCH C1); exported copy constants (`COVERAGE_EYEBROW`, `NO_API_HEADING`, ...); a tone union per page; vocabulary maps as one small table (RESEARCH Pattern 7); `import type { ViewInput } from './manifest.ts';`. Do not import `tokenizeInline` into composers where components already render text; author text reaches the DOM only as React text.

---

### Per-type components: `*-components.tsx` (component, request-response)

**Analog:** `src/web/views/coverage-matrix-components.tsx`

```typescript
import { Unplug } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
...
export type CoverageHeaderProps = Partial<{ eyebrow: string; title: string; lead: React.ReactNode }>;
export function coverageHeaderProps(model: ComposedCoverage): CoverageHeaderProps {
  return { eyebrow: model.intro.eyebrow, title: model.intro.title, lead: null };
}
// section card pattern (l.38-52)
<section className="quiet-state view-coverage-card" data-tone="quiet" aria-label={card.heading}>
  <Unplug aria-hidden="true" />
  ...<p className="view-coverage-reason"><ResearchInline text={card.reason} /></p>
```
Rules: author text only via `ResearchInline` (`tokenizeInline`), never the raw-HTML prop; no href built from document text; tone only from the composed model; class names `view-<kind>-*`; lucide icons `aria-hidden`; never `destructive` for content.

**Contract test:** `test/web/coverage-view-contract.test.ts` (l.1-50): source-scan helpers (`stripSourceComments`, `usesRawHtmlProp`, `toneExpressions`, `writesForbiddenTone`), CSS region markers `/* phase-09-coverage:start */`/`:end`, allowed font sizes, positive controls on planted strings. Copy per page with `phase-10-<kind>` markers. Phase 10 pages may use `missing` / `in-flight` tones where UI-SPEC grants them; adjust the forbidden-tone list per page deliberately.

---

### `src/web/pages/artifact-page.tsx` (modify)

**Analog:** the coverage wiring (l.74-75 imports, l.902-904 `useMemo`, l.962 membership in the "has a designed body" test, l.1265-1275 header override, l.1358 header-suppression list, l.1461 render):
```typescript
const coverage = useMemo<ComposedCoverage | null>(() => {
  ...
  return manifest.coverageMatrix?.(viewInput) ?? null;
}, [...]);
...
const coverageCover = coverage && mode === 'view' ? coverage : null;
...
) : coverageCover ? (
  <CoverageView key={artifact.path} model={coverageCover} />
```
One field per view; NO `artifact.kind === '...'` branches (`view-page-contract.test.ts` caps that string). The Codebase page takes `codebaseContext` and the active doc from the route.

---

### `src/web/pages/mapped-not-started-page.tsx` + Codebase panels (component, request-response)

**Analog:** `src/web/pages/research-page.tsx` (fetch, panel selection, shell offset)

```typescript
function fetchResearch(slug: string): Promise<ResearchViewModel> {
  return apiFetch<ResearchViewModel>(projectUrl(slug, '/research'));
}
// query: useQuery({ queryKey: projectKey(slug, 'research'), queryFn: ... })  -> use projectKey(slug, 'codebase')
```
Imports (l.1-18): `useQuery`, `useProjectSlug` from `../nav.tsx`, `apiFetch, projectUrl` from `../api.ts`, `projectKey` from `../query-keys.ts`, `EmptyState`, atoms from `research-atoms.tsx`. Differences: panel selection here is by URL (real `Link` from `../nav.tsx`, `aria-current="page"`), not `?open=` (`resolveOpen` l.50-52 is the fallback idiom: unknown key opens first present file). Use `PairSwitch`/`LedgerSwitch` style nav-switch for the panel list. Reuse `FigureFor`, `CleanTreeFigure` (`src/web/components/fenced-figure.tsx`) for Architecture and Structure. Do not reuse `research-*` class names unchanged (vocabulary test); use `view-codebase-*`.

**Router wiring (`src/web/app-router.tsx`):** lazy chunk pattern (l.53-56):
```typescript
const ResearchPage = lazy(
  trackRouteChunk(() => import('./pages/research-page.tsx').then((m) => ({ default: m.ResearchPage }))),
);
```
`PAGES` (l.75-82) maps outcomes to pages; make the `dashboard` outcome render `MappedNotStartedPage` when `projectMapState(...).mapOnly`. Keep it a lazy chunk (`test/web/build-splitting.test.ts` pins the lazy list).

---

### `src/web/components/app-shell.tsx` (modify)

**Analog:** same file l.47-48 and l.94-100:
```typescript
const showResearch = projectHasResearch(presentation.data?.artifacts ?? []);
...
{showResearch ? (
  <NavLink className={navigationClass} to={presentationRoutePatterns.research}>
    <ChartLine aria-hidden="true" />
    Research
  </NavLink>
) : null}
```
Wrap the Roadmap (l.90) and Traceability (l.101) `NavLink`s in `{mapOnly ? null : (...)}` using `projectMapState`. `test/web/navbar-contract.test.ts` l.323-346 pins five `NavLink className={navigationClass}` matches, "three original tabs outside both gates" and tab order; rewrite deliberately in the same plan (RESEARCH Pitfall 7).

---

### `src/web/components/copy-command.tsx` (component, event-driven)

**Analog:** `src/web/components/copy-path-button.tsx` (`copyText`, l.1-30; icon swap `Check`, `Button` from `./ui/button.tsx`, 1.5 s timer, sr-only `role="status"`). Reuse `copyText()`; do not use the toast (it is always `data-tone="destructive"`, RESEARCH C2). Command is one of four constants chosen by readiness. Example row in RESEARCH "Copy command row".

---

### Fixtures (made-up examples) and index

**Analog (placement/style):** `test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/COVERAGE.md` (made-up phase artifact added without a ROADMAP edit); `test/fixtures/lendshed/README.md` (fiction, people, domain `lendshed.example`); `test/fixtures/shapes/.planning/codebase/*.md` + `test/fixtures/shapes/README.md` (ledger table, one row per file, rules R4 pin per file never a total, R7 git-check-ignore clean).

Marker (RESEARCH Pattern 8): frontmatter `made_up_example: true`, `derived_from: <gsd-core path>`, `gsd_core_version: 1.19.0` for DOM-VERIFY and REVIEWS; first-line `<!-- made-up example · derived from <path> · gsd-core 1.19.0 -->` for SPEC, AI-SPEC, USER-SETUP, EVAL-REVIEW and map documents. Content must avoid the deny list in `test/fixture-leak.test.ts` l.21-37 (`duet`, `ibis`, `cinedise`, ...). Do not touch `fixtures/dense/**` or `test/__golden__/dense.json`. New map-only root: add to `RELATIVE_ROOTS` in `test/helpers/fixture-roots.ts`.

---

### `test/made-up-examples.test.ts` (test, batch)

**Analogs:** `test/helpers/fixture-roots.ts` (iterate `ALL_FIXTURE_ROOTS`, exempt `fixtures/dense` and repo root), `test/helpers/fixture-project.ts` (load through the real repository), `test/fixture-leak.test.ts` and `test/no-skips.test.ts` (planted positive control on a `mkdtemp` folder). Skeleton in RESEARCH "Marker test skeleton". Fails on: missing marker, marked file absent from index, index row naming a nonexistent file.

---

## Shared Patterns

### Never-throw guarded extraction
**Source:** `src/planning-repo/handlers/coverage.ts` l.20-33
**Apply to:** every new handler. `try { extract } catch { undefined }`; `structured: x === undefined ? {} : { key: x }`.

### Composer returns null, page falls through silently
**Source:** `src/web/views/coverage-matrix.ts` header; `src/web/pages/artifact-page.tsx` l.902-904
**Apply to:** all seven composers. No new notice (RESEARCH C1).

### Server context via guarded IIFE on `/documents`
**Source:** `src/server/project-api.ts` l.118-129
**Apply to:** `codebaseContext` only.

### Author text only through the inline tokenizer
**Source:** `src/web/views/inline-markdown.ts` (`tokenizeInline`) via `ResearchInline` in `src/web/pages/research-atoms.tsx`
**Apply to:** every component. `raw-html-guard.test.ts` allows exactly one raw-HTML site.

### Pure leaf modules for anything the shell imports
**Source:** `src/presentation/project-research-files.ts`
**Apply to:** `project-map-state.ts`, the folders.ts name export.

### Growth tests on every scanner
**Source:** `test/scanner-growth.test.ts` (`Shape = [name, make(n)]`, `measureGrowth`, `GROWTH_LIMIT`, `TIMEOUT = 60_000`) and `test/helpers/growth.ts`
**Apply to:** all new handler extractors and the fence-aware splitter (table-row, heading-pair, one-long-line shapes).

### Class vocabulary
**Source:** `docs/design-language.md` + `test/web/class-vocabulary.test.ts`; `VIEW_LOCAL_PREFIXES` in `kinds.ts`
**Apply to:** CSS in `globals.css`. A new shared name (e.g. `status-meter`, `copy-command`) needs a table row in the doc BEFORE the test runs.

### Process rules binding every plan
Restart `systemctl --user restart labelore` after every change; narrowest e2e only; screenshot beside the sketch; sketch numbers start at 042; tests never read `~/codebases/*`; serial waves because every view build touches `handlers/index.ts`, `manifest.ts`, `manifests.ts`, `artifact-page.tsx`, `globals.css`, `docs/design-language.md`, `view-registry.test.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Fence-aware heading splitter (in `codebase-lift.ts`) | utility | transform | `markdown-sections.ts` `splitByHeadingLevel` (l.11-30) has no fence state; take fence open/close by run length from the Phase 9 `windows.ts` four-backtick fix, add a fixture with a fenced `## ` line |
| Fuzzy heading normaliser (`Map`-based) | utility | transform | Nothing fuzzy exists; build per RESEARCH "Codebase map family" |
| REVIEWS reviewer splitting / agreement | service | transform | No cross-document text-agreement code; follow RESEARCH Pitfall 13 |
| `status-meter` (segmented squares) | component | n/a | Two-segment bar in coverage components is the nearest; add the design-language row first |
| Redirect-only bare `/codebase` | route | request-response | Closest is the bare milestone redirect via `redirectTo` in `src/web/route-dispatch.ts`; optional (RESEARCH C7) |

## Metadata

**Analog search scope:** `src/planning-repo/handlers`, `src/presentation`, `src/web/{views,pages,components}`, `src/server/project-api.ts`, `src/cli/target-path.ts`, `test/`, `test/web/`, `test/fixtures/`
**Files read:** about 25 (research, context, handlers, manifests, composers, router, shell, tests)
**Pattern extraction date:** 2026-11-04
