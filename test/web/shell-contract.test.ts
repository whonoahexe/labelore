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
});
