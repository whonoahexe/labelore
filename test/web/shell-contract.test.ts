import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { dashboardSources } from '../helpers/dashboard-sources.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('authorized Studio Portal shell contract', () => {
  it('keeps the locked base-sera, neutral, CSS-variable, and lucide configuration', async () => {
    const components = JSON.parse(await source('components.json')) as Record<string, unknown>;
    expect(components).toMatchObject({
      style: 'base-sera',
      rsc: false,
      tsx: true,
      tailwind: { baseColor: 'neutral', cssVariables: true },
      iconLibrary: 'lucide',
    });
  });

  it('ports the authorized light and dark OKLCH tokens under one root class', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain('preset b3Dqcuo4na (base-sera)');
    expect(css).toContain('@custom-variant dark (&:is(.dark *));');
    expect(css).toContain('--primary: oklch(0.553 0.195 38.402);');
    expect(css).toContain('--primary: oklch(0.47 0.157 37.304);');
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/\.dark\s*\{/);
    expect(css).not.toMatch(/(studio|cinedise)-portal\//);
  });

  it('uses the DOM dark class as the theme truth and keeps storage failure non-fatal', async () => {
    const toggle = await source('src/web/components/theme-toggle.tsx');
    const index = await source('index.html');
    expect(toggle).toContain("document.documentElement.classList.toggle('dark')");
    expect(toggle).toContain("localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')");
    expect(toggle).toMatch(/try\s*\{[\s\S]*localStorage\.setItem[\s\S]*\}\s*catch\s*\{/);
    expect(toggle).toContain('aria-label="Toggle light or dark theme"');
    expect(toggle.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(index).toContain("document.documentElement.classList.toggle('dark'");
  });

  it('contains wide children locally without clipping the document body', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain('.app-shell,');
    expect(css).toContain('.shell-content,');
    expect(css).toContain('min-width: 0;');
    expect(css).toMatch(/pre,\s*table,\s*\.mermaid\s*\{[\s\S]*overflow-x: auto;/);
    expect(css).not.toMatch(/(?:html|body)[^{]*\{[^}]*overflow-x:\s*(?:hidden|clip)/);
  });

  it('loads local theme CSS and canonical shell navigation without runtime portal imports', async () => {
    const files = await Promise.all([
      source('src/web/main.tsx'),
      source('src/web/components/app-shell.tsx'),
      source('src/web/components/ui/button.tsx'),
      source('src/web/styles/globals.css'),
    ]);
    expect(files[0]).toContain("import './styles/globals.css'");
    expect(files[1]).toContain("from '../nav.tsx'");
    expect(files[1]).toContain('presentationRoutePatterns.dashboard');
    expect(files[1]).toContain('presentationRoutePatterns.roadmap');
    expect(files[2]).toContain('rounded-none');
    expect(files.join('\n')).not.toContain('/home/cinedise/codebases/cinedise-portal');
  });

  it('uses local copies of the same Studio Portal font families', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain("font-family: 'Space Grotesk'");
    expect(css).toContain("url('/fonts/space-grotesk-latin.woff2')");
    expect(css).toContain("font-family: 'JetBrains Mono'");
    expect(css).toContain("url('/fonts/jetbrains-mono-latin.woff2')");
  });

  it('keeps provenance secondary and uses plain-language dashboard and roadmap labels', async () => {
    // The dashboard's sections live in dashboard-*.tsx modules (quick-261018-4tb): read together.
    const dashboard = dashboardSources();
    const roadmap = await source('src/web/pages/roadmap-page.tsx');

    expect(dashboard).toContain('Next up');
    expect(dashboard).toContain('attention-pagination');
    expect(dashboard).toContain('Previous page');
    expect(dashboard).not.toContain('Show more');
    expect(dashboard).not.toContain('Primary signal');
    expect(dashboard).not.toContain('Formal phase progress');
    expect(dashboard).not.toContain('What moves next');
    expect(roadmap).not.toContain('Roadmap ·');
    expect(roadmap).not.toContain('Disk ·');
    expect(roadmap).not.toContain('No goal authored');
    expect(roadmap).not.toContain('None authored');
  });

  it('lets open plans render without manufacturing a missing-summary error', async () => {
    const pair = await source('src/web/pages/plan-pair-page.tsx');
    expect(await source('src/web/components/pair-switch.tsx')).toContain('Outcome not recorded yet');
    expect(pair).toContain('if (!plan.summary) return { plan: planDocument, summary: null, meta };');
    expect(pair).not.toContain('does not have a paired summary yet');
  });

  it('mounts the planning-files drawer trigger in the header and keeps a single-column content region (quick-260911-vqe D-01)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain("import { SidebarDrawer } from './sidebar-drawer.tsx';");
    // debug/loading-state-regression: the trigger used to be gated on the shared ['tree'] query
    // succeeding, which delayed the icon ~500 ms past the rest of the header for no benefit —
    // PlanningPlaces already renders its own pending/error states inside the drawer.
    expect(shell).not.toContain('useTreeQuery');
    expect(shell).not.toContain('useDrawerQuery');

    const headerIndex = shell.indexOf('<header className="shell-header"');
    const brandIndex = shell.indexOf('className="brand"');
    const triggerIndex = shell.indexOf('<SidebarDrawer />');
    expect(headerIndex).toBeGreaterThanOrEqual(0);
    expect(brandIndex).toBeGreaterThan(headerIndex);
    expect(triggerIndex).toBeGreaterThan(headerIndex);
    expect(triggerIndex).toBeLessThan(brandIndex);

    expect(shell).toContain('<div className="shell-content">');
    expect(shell).toContain('<div className="shell-outlet" id="main-content">');
    expect(shell).toContain('href="#main-content"');

    expect(shell).not.toContain('data-sidebar');
    expect(shell).not.toContain('onAbsentChange');
    expect(shell).not.toContain('ResizeObserver');
    expect(shell).not.toContain('shell-header-height');

    const sidebarDrawer = await source('src/web/components/sidebar-drawer.tsx');
    expect(sidebarDrawer).toContain('<PlanningPlaces open={open} onNavigate={() => setOpen(false)} />');
    expect(sidebarDrawer).not.toContain('dangerouslySetInnerHTML');
  });

  // The drawer is two columns with nothing nesting, so it has no expand-all control, and its body
  // lands on the place holding the current page by deriving it from the route on every render.
  it('resets the drawer place from the route and has no expand-all control', async () => {
    const places = await source('src/web/components/planning-places.tsx');
    expect(places).toContain('placeKeyForPath(');
    expect(places).toContain('model.defaultPlaceKey');
    const drawer = await source('src/web/components/sidebar-drawer.tsx');
    expect(drawer).not.toContain('ChevronsUpDown');
    expect(drawer).not.toContain('ChevronsDownUp');
    expect(drawer).not.toMatch(/Expand all|Collapse all|toggleAll|allExpanded/);
  });
});

describe('shared artifact header', () => {
  it('ArtifactPage opens with ArtifactHeader instead of hand-written breadcrumb and heading markup', async () => {
    const artifact = await source('src/web/pages/artifact-page.tsx');
    expect(artifact).toContain('<ArtifactHeader');
    expect(artifact).not.toContain('className="artifact-breadcrumbs"');
    expect(artifact).not.toContain('className="artifact-heading"');
  });
});
