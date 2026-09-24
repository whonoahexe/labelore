// Source-text contract for the Phase 5 view-registry page dispatch, in the same readFile + regex
// idiom as css-source-order.test.ts and visual-contract.test.ts — no AST tooling, no React
// Testing Library (this codebase has neither dependency).
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Every file directly under `src/web/views/` (flat — no subdirectories exist there today),
 * as `path`-relative strings usable with `source()`. */
async function viewsFiles(): Promise<string[]> {
  const dirUrl = new URL('../../src/web/views/', import.meta.url);
  const entries = await readdir(fileURLToPath(dirUrl));
  return entries.map((entry) => `src/web/views/${entry}`);
}

describe('view-page contract (VIEW-01/D-11)', () => {
  it('imports the shared DocumentOutline component and no longer declares its own', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain(
      "import { DocumentOutline, type OutlineEntry } from '../components/document-outline.tsx';",
    );
    expect(page).not.toContain('function DocumentOutline');
  });

  it('sources the View-mode outline from outlineEntriesOf and mounts the View/Source toggle', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('outlineEntriesOf(');
    expect(page).toContain('<DocumentViewToggle');
  });

  it("the toggle exposes its pressed state via aria-pressed", async () => {
    const toggle = await source('src/web/components/document-view-toggle.tsx');
    expect(toggle).toContain('aria-pressed');
  });

  it('never rewrites the URL when toggling or reading (Phase 2 D-16)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect((page.match(/replaceState\(/g) ?? []).length).toBe(1); // the pre-existing copyHeadingUrl helper only
    expect(page).not.toContain('pushState');
    expect(page).not.toContain('useNavigate');
  });

  it('document-outline.tsx renders the shared "On this page" nav with an active-entry hook', async () => {
    const outline = await source('src/web/components/document-outline.tsx');
    expect(outline).toContain('aria-label="On this page"');
    expect(outline).toContain('data-active=');
  });

  it('manifest.ts never references the EmptyState component or its message (D-06 silent omission)', async () => {
    const manifest = await source('src/web/views/manifest.ts');
    expect(manifest).not.toContain('EmptyState');
    expect(manifest).not.toContain('Nothing here yet.');
  });

  it('dispatches through resolveViewFor and renders the VIEW-06 unrecognized marker with a quiet (never destructive/warning) chip', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('resolveViewFor(');
    expect(page).toContain('Unrecognized type');
    expect(page).toContain('data-tone="quiet"');
    expect(page).toContain('view-unrecognized-notice');
    expect(page).toContain('role="status"');

    // The quiet chip's literal text sits within 3 lines of its data-tone="quiet" attribute — a
    // self-contained span, never sharing a data-tone expression with the destructive/warning chip
    // rendered a few lines above it in the same chip fragment.
    const lines = page.split('\n');
    const quietToneLine = lines.findIndex((line) => line.includes('data-tone="quiet"'));
    expect(quietToneLine).toBeGreaterThanOrEqual(0);
    const nearby = lines.slice(quietToneLine, quietToneLine + 4).join('\n');
    expect(nearby).toContain('Unrecognized type');
    expect(nearby).not.toContain('destructive');
    expect(nearby).not.toMatch(/data-tone=\{/);
  });

  it('accent reservation: every data-tone="active" chip reads Chosen or Gates, and no view file uses the parse-degradation tones (UI-06)', async () => {
    const files = [...(await viewsFiles()).filter((f) => f.endsWith('.tsx')), 'src/web/pages/artifact-page.tsx'];
    for (const file of files) {
      const text = await source(file);
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if (!lines[i].includes('data-tone="active"')) continue;
        expect(lines[i]).toContain('status-chip');
        const nearby = lines.slice(i, Math.min(i + 3, lines.length)).join('\n');
        expect(nearby.includes('Chosen') || nearby.includes('Gates')).toBe(true);
      }
    }

    // Neither destructive/warning parse-degradation tone belongs to a view — those chips are the
    // page's own artifact-parse badge, never duplicated into per-type view chrome.
    for (const file of await viewsFiles()) {
      const text = await source(file);
      expect(text).not.toContain('data-tone="destructive"');
      expect(text).not.toContain('data-tone="warning"');
    }
  });

  it('copy contract: View/Source toggle labels, remainder copy, unrecognized-type chip text, and silent D-06 absence (empty-state message never appears in a view)', async () => {
    const toggle = await source('src/web/components/document-view-toggle.tsx');
    // Whitespace-tolerant: the Button children render on their own line (`>\n  View\n</Button>`),
    // not literally adjacent to the angle brackets.
    expect(toggle).toMatch(/>\s*View\s*</);
    expect(toggle).toMatch(/>\s*Source\s*</);

    const page = await source('src/web/pages/artifact-page.tsx');
    // View mode renders no "More in this document" remainder disclosure — leftover sections are
    // read in Source.
    expect(page).not.toContain('More in this document');
    const manifestModule = await source('src/web/views/manifest.ts');
    expect(manifestModule).not.toContain('More in this document');
    expect(page).toContain('Unrecognized type');

    for (const file of await viewsFiles()) {
      const text = await source(file);
      expect(text).not.toContain('Nothing here yet');
    }
  });

  it('single header: every document page renders through ArtifactHeader, and no view file forks its own header/breadcrumbs chrome', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('<ArtifactHeader');

    for (const file of await viewsFiles()) {
      const text = await source(file);
      expect(text).not.toContain('artifact-breadcrumbs');
      expect(text).not.toContain('<header className="artifact-heading"');
    }
  });

  it('registry-only dispatch: artifact-page.tsx branches on artifact.kind in at most two places (the plan-segments extraction and the unknown eyebrow/notice case) — every other per-kind behaviour lives in a manifest', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    const occurrences = (page.match(/artifact\.kind === '/g) ?? []).length;
    expect(occurrences).toBeLessThanOrEqual(2);
  });
});
