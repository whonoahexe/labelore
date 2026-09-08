# Phase 4: Portability & Degradation Hardening - Pattern Map

**Mapped:** 2026-09-03
**Files analyzed:** 12 (5 new web components/screens, 2 modified server/CSS, 1 modified web component, 4+ new/extended test files)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/web/components/app-shell.tsx` (modify — Refresh control + toast wiring) | component | request-response | itself — existing `.snapshot-status`/`ThemeToggle` slot | exact (same file) |
| `src/web/components/refresh-control.tsx` (new) | component | request-response (mutation) | `src/web/components/theme-toggle.tsx` | exact — icon `Button` wrapper pattern |
| `src/web/components/ui/toast.tsx` (new) | component | event-driven | `src/web/components/reference-preview.tsx` (only existing `@base-ui/react` wrapped-primitive component) | role-match — first `@base-ui/react` primitive wrap in this codebase for a viewport-fixed overlay |
| `src/web/pages/artifact-page.tsx` (modify — warning badge/disclosure) | component/page | request-response | itself — existing `artifact.warnings.map(...)` notice rows | exact (same file) |
| `src/web/components/tree-navigator.tsx` (modify — warning/unreadable indicator) | component | request-response | itself — existing `.empty-note`/`TreeBranch` node rendering | exact (same file) |
| `src/web/pages/search-page.tsx` (modify — retone `row.unreadable` chip) | component/page | request-response | itself — existing `row.unreadable` `.status-chip` | exact (same file) |
| `src/web/components/empty-state.tsx` (new, optional shared component) | component | transform (presentational) | `src/web/pages/dashboard-page.tsx`'s `quiet-state`/`.empty-note` inline blocks | role-match — extracts an already-repeated inline pattern |
| `src/web/pages/invalid-project-screen.tsx` (new) | component/page | request-response | `src/web/pages/dashboard-page.tsx`'s `view.loadStatus.status !== 'ok'` branch, and `src/web/app-router.tsx`'s `RouteError`/`NotFound` full-screen patterns | role-match — full-screen status branch outside the routed shell |
| `src/web/app-router.tsx` (modify — mount invalid-project screen above `AppShell`) | route | request-response | itself — existing router tree construction | exact (same file) |
| `src/server/index.ts` (modify — refresh endpoint) | route/controller | request-response | itself — existing `app.get('/api/tree', ...)`/`/api/search` handlers, `source.getSnapshot()`/`createSnapshotSource` wiring | exact (same file) |
| `src/planning-repo/snapshot.ts` (no change — reused seam) | service | CRUD (rebuild) | itself — `PlanningRepository.refresh()` already implements D-05's atomic swap | exact (same file, zero-change reuse) |
| `test/degradation.test.ts` (extend) | test | — | itself — existing suite | exact |
| `test/discovery.test.ts` (extend for empty-group/exclusion cases) | test | — | itself — existing `InMemoryPlanningFilesystem` fixture pattern | exact |
| `test/snapshot.golden.test.ts` (extend for refresh-timestamp/staleness) | test | — | itself — existing suite | exact |
| `test/server/index.test.ts` or `test/server/refresh.test.ts` (new) | test | — | `test/server/search-index.test.ts` / `test/server/deep-links.test.ts` (Hono `app.request(...)` pattern) | role-match |
| `test/web/*.test.tsx` (new, if component-level tests are added) | test | — | none found — no existing React Testing Library tests in `test/` | no analog |

## Pattern Assignments

### `src/web/components/refresh-control.tsx` (new)

**Analog:** `src/web/components/theme-toggle.tsx` (full file, 26 lines — read this session).

**Imports pattern:**
```typescript
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button.tsx';
```

**Core pattern** — icon-only `Button` with `size="icon-sm"`/`variant="ghost"`, `aria-label`, and an `sr-only` span, exactly like `ThemeToggle`:
```typescript
<Button
  aria-label="Refresh the project snapshot"
  className="refresh-control"
  onClick={handleClick}
  size="icon-sm"
  type="button"
  variant="ghost"
  disabled={isRefreshing}
  aria-disabled={isRefreshing}
>
  <RefreshCw aria-hidden="true" className={isRefreshing ? 'refresh-icon spinning' : 'refresh-icon'} />
  <span className="sr-only">Refresh the project snapshot</span>
</Button>
```
Per D-02, wire this through a TanStack Query `useMutation` (not yet used anywhere in the codebase — every other data flow here is `useQuery`) that `POST`s the new refresh endpoint, then on success runs `queryClient.invalidateQueries()` with no key filter — this is D-05's "single coherent replacement," and per RESEARCH.md's CONTEXT.md citation is explicitly named as "the entire client-side reaction" the query-client wiring was chosen to make trivial. Reuse the exact `fetch(...).ok` / `throw new Error(...)` shape from `fetchPresentation` (`app-shell.tsx` lines 11-15) for the POST call.

**Placement (D-01):** inside `app-shell.tsx`'s `.snapshot-status` block (lines 88-99), directly beside the existing `<ThemeToggle />` sibling — copy the existing conditional-render shape (`presentation.isPending ? ... : presentation.isError ? ... : ...`) and add a fourth in-place swap for the `Refreshing…` string per D-02's copy contract, in the same `<span>`/`<time>` slot, no new DOM node.

---

### `src/web/components/ui/toast.tsx` (new)

**Analog:** `src/web/components/reference-preview.tsx` — the only existing hand-wrapped `@base-ui/react` component in the codebase; read for the wrapping convention (props pass-through, `positionMethod`, no new state duplicated from the primitive).

**Core pattern** — per UI-SPEC's Component Inventory, `Toast.Provider` mounts once as a sibling to `AppShell`'s root `<div className="app-shell">`, not per-page:
```typescript
import { Toast } from '@base-ui/react/toast';
```
`Toast.Root`/`Toast.Title`/`Toast.Close` render the D-04 failure message. Viewport is fixed bottom-right, `1.5rem` inset (UI-SPEC Spacing Scale — no existing CSS precedent, this is a net-new placement). Toast content is the exact fixed string from the Copywriting Contract: `Refresh failed. Showing the last successful read from {original time}.` — never an interpolated raw error, unlike every existing `.notice.destructive` block in this codebase (`dashboard-page.tsx`, `roadmap-page.tsx`, `search-page.tsx`, `artifact-page.tsx` all interpolate `{error.message}`; this is the one deliberate exception).

**Error accent color to reuse verbatim:** `.notice.destructive`'s `border-left: 3px solid var(--destructive)` (`src/web/styles/globals.css` line 1362 area) — apply the same left-border treatment to the toast's error variant, per UI-SPEC Color section.

---

### `src/web/pages/artifact-page.tsx` (modify — D-10/D-11 warning badge)

**Analog:** itself — read in full this session. Current persistent-banner treatment to replace (lines ~338-345):
```typescript
{artifact.warnings.map(String).map((warning, index) => (
  <p className="notice warning" role="status" key={`artifact-${index}`}>
    {warning}
  </p>
))}
{document.warnings.map((warning, index) => (
  <p className="notice warning" role="status" key={`document-${index}`}>
    {warning}
  </p>
))}
```
Replace with a compact `.status-chip[data-tone='warning']` beside the existing `<p className="eyebrow">{artifact.kind}</p>` in `artifact-heading` (lines ~305-309), opening a two-level `<details>` disclosure (never `@base-ui/react/collapsible` or `Popover` — UI-SPEC is explicit) that follows the exact nesting convention already used by the metadata panel a few lines below it:
```typescript
<details className="artifact-metadata">
  <summary>
    Document metadata <span>{panels.length} sections</span>
  </summary>
  <div className="metadata-panels" aria-label="Structured artifact metadata">
    {panels.map((panel) => (
      <MetadataPanel key={panel.key} panel={panel} />
    ))}
  </div>
</details>
```
D-11's inner "Technical details" toggle nests a second `<summary>` inside the outer disclosure — same two-level pattern. Render `path`, `stage`, `message` from `ParseWarning` (`src/planning-repo/types.ts`) as a `<dl>`, monospace, using the existing `.artifact-path`/`.source-note` code-style class (`artifact-page.tsx` line ~308: `<p className="artifact-path">{artifact.path}</p>`) for the raw fields — never a new code-font class.

**New CSS tone to add** (per UI-SPEC Color): `.status-chip[data-tone='warning']`, copied verbatim from the existing `.status-chip[data-tone='destructive']` rule (`src/web/styles/globals.css` lines 2864-2868, read this session) under a semantically distinct selector:
```css
.status-chip[data-tone='destructive'] {
  border-color: color-mix(in oklch, var(--destructive) 55%, var(--border));
  background: color-mix(in oklch, var(--destructive) 8%, transparent);
  color: var(--destructive);
}
```

---

### `src/web/components/tree-navigator.tsx` (modify — D-12 warning/unreadable indicator)

**Analog:** itself — read in full this session. The existing leaf-node rendering branch (lines ~78-90) has no indicator slot today:
```typescript
return (
  <li className="tree-node" data-node-type={node.nodeType}>
    {node.url ? (
      <Link to={node.url} className="tree-node-row" data-active={isActive ? 'true' : undefined}>
        {node.label}
      </Link>
    ) : (
      <span className="tree-node-row">{node.label}</span>
    )}
  </li>
);
```
Add a `.status-chip` sibling inside the `<Link>`/`<span>` row when `node.warningTone` (a new field `presentation/tree.ts`'s `TreeNode` must carry, sourced from `ProjectSnapshot.warnings` keyed by `artifact.path`, exactly how `search.ts`'s `row.unreadable` is sourced today per 03-PATTERNS.md) is `'warning'` or `'unreadable'` — same `Warning`/`Unreadable` chip vocabulary and tone rules as the artifact-page badge and the search-page chip (one vocabulary across all three surfaces, per D-12/Copywriting Contract).

**Existing empty-group treatment already satisfies D-06/D-08** (lines ~67-73) — no change needed, just confirm the string matches the phase-wide contract exactly:
```typescript
if (node.nodeType === 'group') {
  return (
    <li className="tree-node" data-node-type="group">
      <p className="tree-group-label">{node.label}</p>
      <p className="empty-note">Nothing here yet.</p>
    </li>
  );
}
```

---

### `src/web/pages/search-page.tsx` (modify — D-12 retone)

**Analog:** itself — read in full this session. The exact gap (lines ~63-67):
```typescript
{row.unreadable ? (
  <span className="status-chip" data-tone="quiet">
    Unreadable
  </span>
) : null}
```
Change `data-tone="quiet"` to `data-tone="destructive"` — no wording change (UI-SPEC Copywriting Contract: "not reworded"), reuses the same `.status-chip[data-tone='destructive']` rule cited above (already defined in `globals.css`, already used by Phase 3's traceability mismatch flag) rather than inventing a new tone.

---

### `src/web/components/empty-state.tsx` (new, optional extraction)

**Analog:** `src/web/pages/dashboard-page.tsx`'s repeated inline pattern (read this session, two occurrences, lines ~140-145 and ~230-236):
```typescript
<div className="quiet-state">
  <CheckCircle2 aria-hidden="true" />
  <p>No dependency-ready work is reported in the active milestone.</p>
</div>
```
and `.empty-flow`/`.empty-note` (`tree-navigator.tsx`'s `<p className="empty-note">Nothing here yet.</p>`). D-08/D-09 require exactly one generic message reused everywhere — planner may choose to extract a small shared `<EmptyState />` component (`icon`, fixed `Nothing here yet.` text) or leave each call site inline; either way, every new call site must reuse the existing `.quiet-state`/`.empty-flow` class family, never a new empty-state class. **CSS correction required per UI-SPEC:** `.empty-flow svg` is currently `color: var(--primary)` (`globals.css`, `.quiet-state svg, .empty-flow svg` rule near line 955) — this must change to `var(--muted-foreground)` wherever the new generic empty state renders, since D-09 requires a neutral (non-accent) treatment; existing unrelated `.empty-flow` uses are unaffected unless they adopt the shared component.

---

### `src/web/pages/invalid-project-screen.tsx` (new)

**Analog 1 (status message source):** `src/cli/target-path.ts`'s `LOAD_STATUS_MESSAGES` (read in full this session) — the exact per-status message strings this screen renders verbatim, no new copy:
```typescript
export const LOAD_STATUS_MESSAGES: Readonly<Record<LoadStatus['status'], (ctx: MessageContext) => string>> = {
  ok: () => '',
  'path-not-found': ({ rawPath, pathChecked }) => `No such path: ${rawPath} (resolved: ${pathChecked})`,
  'not-a-gsd-project': ({ pathChecked }) => `${pathChecked} exists but contains no .planning/ directory`,
  'permission-denied': ({ pathChecked }) => `Cannot read ${pathChecked}: permission denied`,
};
```
This screen consumes `ProjectPresentation.loadStatus` (already carries `status`, `pathChecked`, `message`, and `rawPath` when present — confirmed via `src/planning-repo/types.ts`'s `LoadStatus`/`FailedLoadStatus` and `snapshot.ts`'s `checkTargetIsGsdProject()`), never re-deriving the message client-side.

**Analog 2 (full-screen branch shape):** `src/web/pages/dashboard-page.tsx`'s existing `view.loadStatus.status !== 'ok'` branch (lines ~104-112) — reuse its structure (`eyebrow` / `h1` / `.notice.destructive` with `h2`+`p`) as the starting point, but per D-14 this new screen must NOT sit inside `AppShell`/`.shell-content` — it hides nav, search, and tree entirely:
```typescript
if (view.loadStatus.status !== 'ok') {
  return (
    <main className="page-stack">
      <p className="eyebrow">{view.loadStatus.status.replaceAll('-', ' ')}</p>
      <h1>Labelore could not read this project.</h1>
      <section className="notice destructive" role="alert">
        <h2>Local project load failed</h2>
        <p>{view.loadStatus.message}</p>
      </section>
    </main>
  );
}
```
Per D-14 this dashboard-level branch becomes redundant once the router-level screen exists above `AppShell` — the planner should decide whether to leave `dashboard-page.tsx`'s branch as defense-in-depth or remove it now that the router never reaches `AppShell` on a failed load (see `app-router.tsx` below); either choice must not duplicate the visual design (D-15: one generic treatment for every failure kind).

**Analog 3 (full-screen-outside-shell precedent):** `src/web/app-router.tsx`'s `RouteError`/`NotFound` — both already render outside the app shell's data flow (they're `errorElement`s at the router root), confirming the precedent for a `<main className="page-stack">`-shaped screen with no `AppShell` wrapper. This new screen instead needs its own `min-height: 100vh; display: grid; place-items: center` wrapper per UI-SPEC (no existing CSS class for this — net new).

**Copy-to-clipboard pattern to reuse exactly:** `artifact-page.tsx`'s `copyHeadingUrl` (lines ~104-112, read this session):
```typescript
async function copyHeadingUrl(id: string): Promise<void> {
  const url = new URL(window.location.href);
  url.hash = encodeURIComponent(id);
  window.history.replaceState(window.history.state, '', url);
  try {
    await navigator.clipboard.writeText(url.href);
  } catch {
    // The canonical address still updates when clipboard permission is unavailable.
  }
}
```
Copy-to-clipboard for the checked-path field and the restart command follows the identical `try { await navigator.clipboard.writeText(...) } catch { /* silent */ }` shape — no new failure toast on denied permission (per Copywriting Contract, this reuses the pattern exactly).

**How this screen is reached:** the presentation-layer `loadStatus` is already available from `/api/presentation` (`ProjectPresentation.loadStatus`, confirmed in `app-shell.tsx`'s `presentation.data?.projectName`/`presentation.data.readAt` usage) — the router should gate on this at the `AppShell`-wrapping level (see `app-router.tsx` below) rather than each page re-deriving it.

---

### `src/web/app-router.tsx` (modify — mount invalid-project screen)

**Analog:** itself — read in full this session, current top-level route tree:
```typescript
export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [ /* ... */ { path: '*', element: <NotFound /> } ],
  },
]);
```
D-14 requires the invalid-project screen to replace the entire routed tree (hide nav, search, tree) — the simplest change consistent with this file's existing shape is a loader or a wrapper component that queries `/api/presentation` once at the router root and branches between `<InvalidProjectScreen />` and `<AppShell />` before any child route renders, rather than adding a new sibling route (a sibling route would still need the user to navigate away from a normal-looking shell). Keep `RouteError`/`NotFound`'s existing `.notice`/`.notice.destructive` conventions untouched — those remain the client-side-route-failure surfaces, distinct from D-14's server-reported invalid target.

---

### `src/server/index.ts` (modify — refresh endpoint)

**Analog:** itself — read in full this session. Existing route-handler shape to copy exactly (`/api/tree`, lines ~85-88):
```typescript
app.get('/api/tree', (c) => {
  const presentation = toProjectPresentation(source.getSnapshot());
  return c.json(buildTreeViewModel(presentation));
});
```
Add `app.post('/api/refresh', async (c) => { ... })` that calls the existing `PlanningRepository.refresh()` seam (`src/planning-repo/snapshot.ts`, zero changes needed there — D-05's atomic swap is already implemented) and returns the new `readAt`/`loadStatus`, following the same never-cache-across-requests convention every other handler already uses. Note `createSnapshotSource`'s `SnapshotSource` interface only exposes `getSnapshot()` today (lines ~192-211) — the refresh endpoint needs the underlying `PlanningRepository` instance (which has `.refresh()`), so either widen `SnapshotSource` to optionally expose `refresh()` or have `createSnapshotSource` return the `PlanningRepository` object directly (it already structurally satisfies `SnapshotSource` via its own `getSnapshot()` method — see `snapshot.ts` class shape) instead of wrapping it in an anonymous object literal only for the failed-load branch. The failed-load branch (`!('rootPath' in resolved)`) currently returns a plain object literal with no `refresh()` — this must be reconciled (e.g., by making that literal's `refresh()` a no-op returning the same failed snapshot) since Phase 4 does not add a project-switcher and a failed initial load has nothing to refresh into.

**Error handling / never-throw convention to preserve:** the existing `createSnapshotSource` failed-load path already builds a `ProjectSnapshot` with `loadStatus: resolved` and `project: null` rather than throwing — the new `/api/refresh` handler must follow the same rule and never let `repository.refresh()` reject past the route handler (it already can't, per `snapshot.ts`'s own header comment: "load()/refresh() never throw").

---

### `test/server/index.test.ts` or `test/server/refresh.test.ts` (new)

**Analog:** `test/server/search-index.test.ts` / `test/server/deep-links.test.ts` (role-match, not read line-by-line this session but confirmed present via 03-PATTERNS.md's own file classification — same Hono `app.request(...)`-style server-route test idiom already established in Phase 3). Cover: successful refresh returns a fresh `readAt`, a refresh against a since-changed fixture directory reassembles the snapshot, and a `POST /api/refresh` on a failed-load source returns the same failed status rather than throwing a 500.

---

## Shared Patterns

### Single-refresh-seam reuse — no new repository logic
**Source:** `src/planning-repo/snapshot.ts` (`PlanningRepository.refresh()`), already proven by `test/degradation.test.ts`'s "refresh seam" describe block (read in full this session — covers new-object-identity, byte-stable double-refresh, and concurrent-refresh convergence).
**Apply to:** `src/server/index.ts`'s new `/api/refresh` route, `refresh-control.tsx`'s mutation.
D-05 ("all snapshot-derived data replaces together") is already guaranteed at the repository layer — Phase 4 adds zero new assembly logic, only a route that calls the existing seam and a client mutation that invalidates the query cache in one shot.

### Never-throw / typed-status degradation convention
**Source:** `src/planning-repo/snapshot.ts` header comment ("load()/refresh() never throw"), `src/cli/target-path.ts`'s `ResolvedTarget | FailedLoadStatus` return type, `src/server/artifact-index.ts`'s typed `not-found` results (per 03-PATTERNS.md).
**Apply to:** `/api/refresh` handler, `invalid-project-screen.tsx`'s consumption of `loadStatus`.
Every new failure path returns a typed status object, never an unhandled rejection or an uncaught 500.

### `.status-chip[data-tone=...]` — reuse, never invent a new chip component
**Source:** `src/web/styles/globals.css` (`.status-chip`, `.status-chip[data-tone='destructive']`, `.status-chip[data-tone='quiet']` — all read this session).
**Apply to:** artifact-page warning badge, tree-navigator warning/unreadable indicator, search-page retoned chip.
Exactly one new tone (`warning`) is added this phase; `destructive` is reused, not redefined, for the "nothing salvageable" case.

### Native `<details>`/`<summary>` disclosure — never `@base-ui/react/collapsible`
**Source:** `src/web/pages/artifact-page.tsx`'s existing `.artifact-metadata` disclosure (read this session), reconfirmed by 03-PATTERNS.md as an established convention.
**Apply to:** the D-11 warning-badge disclosure's outer/inner `<details>` nesting.

### Fetch-wrapper + `useQuery`/`useMutation` pair
**Source:** `src/web/components/app-shell.tsx`'s `fetchPresentation`, extended this phase with the first `useMutation` in the codebase for `refresh-control.tsx`.
**Apply to:** `refresh-control.tsx`, `invalid-project-screen.tsx` (if it needs its own fetch rather than reusing the shell's `presentation` query).
```typescript
async function fetch<X>(): Promise<X> {
  const response = await fetch('/api/<endpoint>', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`<Noun> request failed (${response.status})`);
  return (await response.json()) as X;
}
```

### `.notice.destructive` reserved for interpolated errors; toast reserved for fixed copy
**Source:** every existing page-level error branch (`dashboard-page.tsx`, `roadmap-page.tsx`, `search-page.tsx`, `artifact-page.tsx`, `app-router.tsx`'s `RouteError`) all interpolate `{error.message}`.
**Apply to:** `refresh-control.tsx`'s toast, which is the one deliberate exception per D-04's Copywriting Contract (fixed string, no interpolated error).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/web/components/ui/toast.tsx` | component | event-driven | No toast/snackbar mechanism exists anywhere in the codebase yet (confirmed by UI-SPEC's own Component Inventory: "not yet used anywhere"). `reference-preview.tsx` is the only precedent for wrapping a `@base-ui/react` primitive, but its popover-anchor pattern doesn't transfer to a viewport-fixed queue — build from `@base-ui/react/toast`'s own docs/exports, following this codebase's wrapping *style* (thin, typed props, no new global state) rather than a specific existing toast implementation. |
| `test/web/*.test.tsx` (if any component-level tests are planned) | test | — | No React Testing Library / component-level test exists in `test/` today — every existing test targets `src/planning-repo/`, `src/presentation/`, or `src/server/` pure functions and route handlers. If the planner wants direct component tests for `refresh-control.tsx`/`invalid-project-screen.tsx`, there is no in-repo idiom to copy; RESEARCH.md's explicit "skip Playwright/e2e for v1" stance and the project's existing vitest-only setup suggest testing these through the server-route/presentation-layer boundary instead (as `test/server/*.test.ts` already does), not adding a new component-test harness. |

## Metadata

**Analog search scope:** `src/web/components/`, `src/web/pages/`, `src/web/app-router.tsx`, `src/server/`, `src/planning-repo/`, `src/cli/`, `src/web/styles/globals.css`, `test/`
**Files read directly this session:** `src/web/components/app-shell.tsx` (full), `src/web/pages/artifact-page.tsx` (full), `src/cli/target-path.ts` (full), `src/server/index.ts` (full), `src/web/components/tree-navigator.tsx` (full), `src/web/pages/search-page.tsx` (full), `src/web/components/theme-toggle.tsx` (full), `src/web/main.tsx`, `src/web/pages/dashboard-page.tsx` (full), `src/planning-repo/snapshot.ts` (full), `test/degradation.test.ts` (full), `src/server/project-presentation.ts` (partial), `src/web/app-router.tsx` (full), `src/web/styles/globals.css` (targeted grep + two ranges: `.status-chip`/`.notice` block, `.status-chip[data-tone='destructive']` block), `fixtures/` directory listing
**Pattern extraction date:** 2026-09-03
