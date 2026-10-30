// Source-text contracts for the Sketches page (todo 001, quick-261023-4wn): the sandbox value, plain
// anchors for server sketch URLs, no raw HTML, the router entry and the gated nav tab.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('sketches page contract', () => {
  it('has exactly one iframe and every sandbox value is exactly allow-scripts', async () => {
    const page = await source('src/web/pages/sketches-page.tsx');
    expect(page.match(/<iframe/g) ?? []).toHaveLength(1);
    const values = [...page.matchAll(/sandbox=(?:"([^"]*)"|\{([^}]*)\})/g)].map((m) => m[1] ?? m[2]);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) expect(value).toBe('allow-scripts');
  });

  it('points the iframe at the sketch view URL under the page project', async () => {
    const page = await source('src/web/pages/sketches-page.tsx');
    const iframe = page.slice(page.indexOf('<iframe'), page.indexOf('/>', page.indexOf('<iframe')));
    expect(iframe).toMatch(/src=\{projectUrl\(slug, viewUrl\)\}/);
  });

  it('builds every sketch link from the project API base and holds no /api/ literal', async () => {
    const page = await source('src/web/pages/sketches-page.tsx');
    const anchors = [...page.matchAll(/<a\s[^>]*>/g)].map((m) => m[0]);
    const sketchAnchors = anchors.filter((a) => /href=\{[^}]*viewUrl/.test(a));
    expect(sketchAnchors.length).toBeGreaterThan(0);
    for (const anchor of sketchAnchors) expect(anchor).toMatch(/href=\{projectUrl\(slug, (?:sketch\.)?viewUrl\)\}/);
    expect(page).toContain("projectUrl(slug, '/sketches')");
    expect(page).toContain("projectKey(slug, 'sketches')");
    expect(page).not.toMatch(/['"`]\/api\//);
  });

  it('opens server sketch URLs with plain anchors, never router Links', async () => {
    const page = await source('src/web/pages/sketches-page.tsx');
    expect(page).not.toMatch(/to=\{[^}]*viewUrl/);
    const anchors = [...page.matchAll(/<a\s[^>]*>/g)].map((m) => m[0]);
    const sketchAnchors = anchors.filter((a) => /href=\{[^}]*viewUrl/.test(a));
    expect(sketchAnchors.length).toBeGreaterThan(0);
    for (const anchor of sketchAnchors) {
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener noreferrer"');
    }
  });

  it('never renders raw HTML', async () => {
    expect(await source('src/web/pages/sketches-page.tsx')).not.toContain('dangerouslySetInnerHTML');
  });

  it('routes /sketches to the page and gates the nav tab', async () => {
    const router = await source('src/web/app-router.tsx');
    // NAV-10: the dispatcher names the page and the router's page table renders it.
    expect(router).toMatch(/sketches:\s*SketchesPage,/);
    const dispatch = await source('src/web/route-dispatch.ts');
    expect(dispatch).toContain("case 'page':");
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toMatch(/\{showSketches \? \(\s*<NavLink[^>]*presentationRoutePatterns\.sketches/);
  });

  it('hides the tab icons at phone width only when the fourth tab is present', async () => {
    const css = await source('src/web/styles/globals.css');
    const at = css.indexOf('.shell-nav:has(> :nth-child(4)) .shell-nav-link svg');
    expect(at).toBeGreaterThan(0);
    expect(css.slice(at, css.indexOf('}', at))).toContain('display: none');
  });
});
