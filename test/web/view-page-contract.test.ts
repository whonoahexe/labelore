// Source-text contract for the Phase 5 view-registry page dispatch, in the same readFile + regex
// idiom as css-source-order.test.ts and visual-contract.test.ts — no AST tooling, no React
// Testing Library (this codebase has neither dependency).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
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
});
