// Quick 260916-o2o: source-text contract pinning that removed loading-state copy never returns,
// while every pending branch keeps a skeleton + polite status. Same house idiom as
// test/web/visual-contract.test.ts (`source()`/region-scoped rule extraction) and
// test/web/build-splitting.test.ts (readFile-by-URL source assertions). Grows across the plan's
// three tasks — task 1 covers the four already-skeletoned pages, task 2 adds artifact/plan-pair,
// task 3 adds the shell's route-transition loader.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Slices `src` down to its pending branch: starts at a factored-out `function *Loading()`
 * definition when one precedes the first `isPending` occurrence (dashboard-page.tsx's
 * `DashboardLoading()`), otherwise starts at `isPending` itself (every other page inlines its
 * pending JSX). Ends at the next `isError` occurrence, so assertions bind to the pending branch
 * only, not to the whole file. */
function pendingSlice(src: string): string {
  const pendingIndex = src.indexOf('isPending');
  if (pendingIndex === -1) throw new Error('expected an isPending branch in this source');
  const loadingFnMatch = src.match(/function \w*Loading\(\)/);
  const start =
    loadingFnMatch && loadingFnMatch.index !== undefined && loadingFnMatch.index < pendingIndex
      ? loadingFnMatch.index
      : pendingIndex;
  const errorIndex = src.indexOf('isError', pendingIndex);
  return errorIndex === -1 ? src.slice(start) : src.slice(start, errorIndex);
}

/** Blanks out `/* ... *\/` block comments while preserving line counts (mirrors
 * token-guard.test.ts's `stripCssComments`) — otherwise a comment sitting directly above a
 * selector (no intervening brace) gets swallowed into the selector-list match below. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Same idea for TS/TSX sources, covering both `/* *\/` (including the `{/* *\/}` JSX form) and
 * `//` line comments, so the identifier counts below bind to real code rather than to prose about
 * it. Load-bearing: the router's own explanatory comment contains the words `lazy()` and
 * `trackRouteChunk`, which inflated the raw match counts and made a correct implementation look
 * like an unwrapped route. The `[^:]` guard leaves `https://` inside string literals alone. */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + ' '.repeat(m.length - lead.length));
}

/** Extracts the body of every top-level rule whose comma-separated selector list (which may span
 * multiple lines, and which grows across tasks 1-3 as more classes join the shared skeleton rule
 * groups) contains every selector in `selectors` as an exact member — mirrors
 * visual-contract.test.ts's `ruleBlocks`, generalised so a compound selector growing from
 * `.dashboard-loading, .roadmap-loading {` to `.dashboard-loading, .roadmap-loading,
 * .artifact-loading, .plan-pair-loading {` still matches without pinning line counts. */
function ruleBlocksContaining(cssRaw: string, selectors: string[]): string[] {
  const css = stripCssComments(cssRaw);
  const blocks: string[] = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(css))) {
    const selectorList = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (selectors.every((needed) => selectorList.includes(needed))) {
      blocks.push(match[2]);
    }
  }
  return blocks;
}

// Headline/eyebrow literals removed by this plan. Grown across tasks 1-3; the negative gate below
// always asserts against the full array so a literal can never quietly creep back in once its
// task has landed. The search-page "Searching…" indexing headline stays here (it is the isPending
// branch's own headline); the distinct "Indexing…" empty-state headline is intentionally excluded
// per the plan's locked decisions.
const REMOVED_LOADING_LITERALS = [
  'Reading the current position',
  'Reading the roadmap',
  'Reading the traceability view',
  'Searching…',
  'Loading the document',
  'Loading plan review',
  'Opening view',
];

const NEGATIVE_GATE_FILES = [
  'src/web/pages/dashboard-page.tsx',
  'src/web/pages/roadmap-page.tsx',
  'src/web/pages/traceability-page.tsx',
  'src/web/pages/search-page.tsx',
  'src/web/pages/artifact-page.tsx',
  'src/web/pages/plan-pair-page.tsx',
  'src/web/components/app-shell.tsx',
];

const PENDING_PAGES: Array<{ path: string; skeletonClass: string }> = [
  { path: 'src/web/pages/dashboard-page.tsx', skeletonClass: 'dashboard-loading' },
  { path: 'src/web/pages/roadmap-page.tsx', skeletonClass: 'roadmap-loading' },
  { path: 'src/web/pages/traceability-page.tsx', skeletonClass: 'roadmap-loading' },
  { path: 'src/web/pages/search-page.tsx', skeletonClass: 'roadmap-loading' },
  { path: 'src/web/pages/artifact-page.tsx', skeletonClass: 'artifact-loading' },
  { path: 'src/web/pages/plan-pair-page.tsx', skeletonClass: 'plan-pair-loading' },
];

describe('loading-state contract (quick-260916-o2o)', () => {
  it('keeps skeleton geometry and drops the eyebrow/headline copy from every pending branch', async () => {
    for (const page of PENDING_PAGES) {
      const slice = pendingSlice(await source(page.path));
      expect(slice, `${page.path} pending slice`).toContain(page.skeletonClass);
      expect(slice, `${page.path} pending slice`).not.toContain('eyebrow');
      expect(slice, `${page.path} pending slice`).not.toMatch(/<h1>/);
    }
  });

  it('keeps a polite screen-reader status and aria-busy on every pending branch', async () => {
    for (const page of PENDING_PAGES) {
      const slice = pendingSlice(await source(page.path));
      expect(slice, `${page.path} pending slice`).toContain('aria-busy="true"');
      expect(slice, `${page.path} pending slice`).toContain('sr-only');
      expect(slice, `${page.path} pending slice`).toContain('role="status"');
      expect(slice, `${page.path} pending slice`).toContain('aria-live="polite"');
    }
  });

  it('never lets a removed loading headline/eyebrow literal creep back into any routed page or the shell', async () => {
    for (const file of NEGATIVE_GATE_FILES) {
      const text = await source(file);
      for (const literal of REMOVED_LOADING_LITERALS) {
        expect(text, `${file} should not contain "${literal}"`).not.toContain(literal);
      }
    }
  });

  it('drops the skeleton top offset and the now-orphaned --space-12 token together', async () => {
    const css = await source('src/web/styles/globals.css');
    const blocks = ruleBlocksContaining(css, ['.dashboard-loading', '.roadmap-loading']);
    expect(blocks.length, '.dashboard-loading, .roadmap-loading rule block').toBeGreaterThanOrEqual(1);
    for (const block of blocks) expect(block).not.toMatch(/margin-top/);
    expect(css).not.toContain('--space-12');
  });

  it('gives artifact and plan-pair pages skeletons built from the shared skeleton rule groups', async () => {
    const css = await source('src/web/styles/globals.css');
    const gridBlocks = ruleBlocksContaining(css, [
      '.dashboard-loading',
      '.roadmap-loading',
      '.artifact-loading',
      '.plan-pair-loading',
    ]);
    expect(gridBlocks.length, 'shared display:grid skeleton group').toBeGreaterThanOrEqual(1);
    for (const block of gridBlocks) {
      expect(block).toContain('display: grid');
      expect(block).toContain('gap: var(--space-4)');
    }

    const pulseBlocks = ruleBlocksContaining(css, [
      '.dashboard-loading span',
      '.roadmap-loading',
      '.artifact-loading span',
      '.plan-pair-loading span',
    ]);
    expect(pulseBlocks.length, 'shared pulsing skeleton group').toBeGreaterThanOrEqual(1);
    for (const block of pulseBlocks) {
      expect(block).toContain('background: var(--muted)');
      expect(block).toContain('animation: loading-pulse');
    }
  });

  it('debounces, portals and cleans up the route-transition top bar loader', async () => {
    const component = await source('src/web/components/route-progress.tsx');
    expect(component).toContain('createPortal');
    expect(component).toContain('document.body');
    expect(component).toContain('ROUTE_PROGRESS_DELAY_MS = 150');
    expect(component).toContain('clearTimeout');
    expect(component).toContain('aria-hidden');
    expect(component).toContain('sr-only');
    expect(component).toContain('role="status"');
    expect(component).toContain('aria-live="polite"');
  });

  // debug/loading-state-regression. The bar was originally wired as app-shell.tsx's
  // `<Suspense fallback>`. React only renders a fallback when the boundary MOUNTS, and react-router
  // v8 navigates inside `startTransition` — during which React keeps an already-mounted boundary's
  // children on screen instead of swapping in the fallback. Measured: with a route chunk held for
  // 2500 ms, a hard load painted the bar at t=432 ms while a client-side navigation to the same URL
  // never painted it, in both the dev and production builds. These three tests pin each half of the
  // replacement wiring so that shape cannot come back.
  it('drives the top bar from chunks in flight, not from a Suspense boundary mounting', async () => {
    const component = await source('src/web/components/route-progress.tsx');
    expect(component, 'subscribes to an external store rather than mounting as a fallback').toContain(
      'useSyncExternalStore',
    );

    // The signal itself lives in a plain .ts module so it carries no JSX/DOM types — that is what
    // lets test/web/route-chunk-store.test.ts import and DRIVE it under tsconfig.server.json.
    // Behaviour is asserted there; these only pin the shape that makes it reachable.
    const store = await source('src/web/components/route-chunk-store.ts');
    expect(store, 'exports the lazy-factory wrapper the router feeds it').toContain(
      'export function trackRouteChunk',
    );
    expect(store, 'exports the subscribe/getSnapshot pair the component reads').toContain(
      'export const routeChunkStore',
    );
    expect(store, 'increments an in-flight counter before awaiting the chunk').toMatch(
      /chunksInFlight \+= 1/,
    );
    expect(store, 'decrements it in a finally, so a failed chunk cannot strand the bar').toMatch(
      /finally\s*\{[\s\S]*chunksInFlight -= 1/,
    );
    expect(
      store,
      'defers notification past the render pass that invoked the lazy factory',
    ).toContain('queueMicrotask');
  });

  it('renders the top bar outside the Suspense boundary and never as its fallback', async () => {
    // Comment-stripped: the shell's own explanatory JSX comment mentions `<RouteProgress />`, so a
    // raw indexOf could bind to prose instead of to the element that actually renders.
    const shell = stripJsComments(await source('src/web/components/app-shell.tsx'));
    expect(shell, 'RouteProgress is no longer the Suspense fallback').not.toContain(
      'fallback={<RouteProgress',
    );
    expect(shell, 'the boundary keeps only a layout placeholder').toContain(
      'fallback={<RouteFallback />}',
    );
    const barIndex = shell.indexOf('<RouteProgress />');
    const suspenseIndex = shell.indexOf('<Suspense');
    expect(barIndex, 'RouteProgress is rendered by the shell').toBeGreaterThan(-1);
    expect(
      barIndex,
      'RouteProgress sits above the Suspense boundary, so it stays committed while the boundary suspends',
    ).toBeLessThan(suspenseIndex);
  });

  it('routes every lazy page through trackRouteChunk', async () => {
    const router = await source('src/web/app-router.tsx');
    // Anchored on `= lazy(` so prose like "lazy()-loaded" in the surrounding comments cannot
    // inflate either count.
    const declared = (router.match(/=\s*lazy\(/g) ?? []).length;
    const tracked = (router.match(/=\s*lazy\(\s*trackRouteChunk\(/g) ?? []).length;
    expect(declared, 'the router still lazy-loads its pages').toBeGreaterThan(0);
    expect(
      tracked,
      'every lazy() factory is wrapped — an untracked one is a route with no loading feedback',
    ).toBe(declared);
  });

  // debug/loading-state-regression, third cause: the trigger was gated on the shared ['tree'] query
  // succeeding, so the icon popped in ~500 ms after the rest of the header (120 KB /api/tree
  // payload) — for nothing, since TreeNavigator already renders its own pending/error states.
  it('renders the sidebar trigger without waiting on the tree query', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell, 'the drawer trigger is unconditional').toContain('<SidebarDrawer />');
    expect(shell, 'no tree-query gate around the trigger').not.toMatch(
      /tree\.isSuccess\s*\?\s*<SidebarDrawer/,
    );
    expect(shell, 'the shell no longer reads the tree query at all').not.toContain('useTreeQuery');

    const navigator = await source('src/web/components/tree-navigator.tsx');
    expect(navigator, 'because the drawer contents own the pending state').toContain(
      'query.isPending',
    );
    expect(navigator, 'and the error state').toContain('query.isError');
  });

  it('names the serve mode at startup so a dev-mode serve is never silent', async () => {
    const server = await source('src/server/index.ts');
    expect(server).toContain('Mode: production');
    expect(server).toContain('Mode: DEVELOPMENT');
    expect(server, 'the dev banner is a warning, not an easily-missed log line').toMatch(
      /console\.warn\(\s*\n?\s*'Mode: DEVELOPMENT/,
    );
  });

  it('layers the route-progress bar above the header and neutralizes it under reduced motion', async () => {
    const css = await source('src/web/styles/globals.css');
    const [progressBlock] = ruleBlocksContaining(css, ['.route-progress']);
    expect(progressBlock, '.route-progress rule block').toBeDefined();
    expect(progressBlock).toContain('position: fixed');
    const zIndexMatch = progressBlock?.match(/z-index:\s*(\d+)/);
    expect(zIndexMatch, '.route-progress declares a numeric z-index').not.toBeNull();
    expect(Number(zIndexMatch?.[1])).toBeGreaterThan(20);

    const barBlocks = ruleBlocksContaining(css, ['.route-progress-bar']);
    expect(barBlocks.length, '.route-progress-bar rule blocks (base + reduced-motion)').toBeGreaterThanOrEqual(2);
    expect(barBlocks.some((block) => block.includes('animation: none'))).toBe(true);
  });
});
