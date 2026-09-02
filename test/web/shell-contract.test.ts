import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

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
    expect(css).not.toMatch(/studio-portal\//);
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
    expect(files[1]).toContain('presentationRoutePatterns.dashboard');
    expect(files[1]).toContain('presentationRoutePatterns.roadmap');
    expect(files[2]).toContain('rounded-none');
    expect(files.join('\n')).not.toContain('/home/cinedise/studio-portal');
  });

  it('uses local copies of the same Studio Portal font families', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toContain("font-family: 'Space Grotesk'");
    expect(css).toContain("url('/fonts/space-grotesk-latin.woff2')");
    expect(css).toContain("font-family: 'JetBrains Mono'");
    expect(css).toContain("url('/fonts/jetbrains-mono-latin.woff2')");
  });

  it('keeps provenance secondary and uses plain-language dashboard and roadmap labels', async () => {
    const dashboard = await source('src/web/pages/dashboard-page.tsx');
    const roadmap = await source('src/web/pages/roadmap-page.tsx');

    expect(dashboard).toContain('Next up');
    expect(dashboard).toContain('Plan completion');
    expect(dashboard).toContain('Show more');
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
    expect(pair).toContain('Outcome not recorded yet');
    expect(pair).toContain('if (!plan.summary) return { plan: planDocument, summary: null }');
    expect(pair).not.toContain('does not have a paired summary yet');
  });

  it('restructures the shell content region into a persistent sidebar plus outlet (03-03 D-09)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain("import { TreeNavigator } from './tree-navigator.tsx';");
    expect(shell).toMatch(
      /<div className="shell-content" data-sidebar={sidebarAbsent \? 'absent' : 'present'}>/,
    );
    expect(shell).toContain('<TreeNavigator onAbsentChange={setSidebarAbsent} />');
    expect(shell).toContain('<div className="shell-outlet" id="main-content">');
    expect(shell).toContain('href="#main-content"');
  });

  // IN-01: top-level groups are meant to start open. Applying `open` only from the effect left
  // them closed for the first paint, so the sidebar visibly snapped open after mount. The
  // declarative attribute makes the first paint already correct; the effect stays for the
  // route-reveal case, which must react to navigation and must keep its open-once semantics so
  // a user's own manual close is never fought.
  it('opens top-level tree groups declaratively on first paint, not only from the effect', async () => {
    const navigator = await source('src/web/components/tree-navigator.tsx');
    expect(navigator).toMatch(/<details[^>]*\sopen=\{node\.nodeType === 'group'\}/);
    expect(navigator).toContain('if (detailsRef.current) detailsRef.current.open = true;');
  });
});
