// quick-260910-0x4 item 10: pins the source-level structure behind the warning-free build, since
// running a real `vite build` inside every `npm test` invocation would be slow and belongs to the
// plan's own <verify> block instead. These are region-scoped source assertions — the same pattern
// test/web/visual-contract.test.ts and test/web/shell-contract.test.ts already use — proving the
// lazy-loading and threshold-comment structure exists, not re-measuring the build itself.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('route-level code splitting (entry chunk fix)', () => {
  it('lazy()-loads every routed page component rather than importing it eagerly', async () => {
    const router = await source('src/web/app-router.tsx');
    const lazyPages = [
      'dashboard-page.tsx',
      'roadmap-page.tsx',
      'search-page.tsx',
      'traceability-page.tsx',
      'artifact-page.tsx',
      'plan-pair-page.tsx',
    ];
    for (const page of lazyPages) {
      expect(router, `expected a lazy() import of ${page}`).toMatch(
        new RegExp(`lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(['"]\\./pages/${page.replace('.', '\\.')}['"]\\)`),
      );
    }
    // InvalidProjectScreen deliberately stays eager: ProjectGate renders it directly (not through
    // the lazy-loaded Outlet), and it's the fallback screen for an invalid target project — it
    // must be available without waiting on a chunk fetch.
    expect(router).toMatch(/^import \{ InvalidProjectScreen \} from '\.\/pages\/invalid-project-screen\.tsx';$/m);
  });

  it('wraps the routed Outlet in a Suspense boundary with a real fallback element', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toMatch(/import \{[^}]*\bSuspense\b[^}]*\} from 'react';/);
    expect(shell).toMatch(/<Suspense fallback=\{<PageLoadingFallback \/>\}>\s*<Outlet \/>\s*<\/Suspense>/);
    expect(shell).toContain('function PageLoadingFallback():');
  });
});

describe('chunk-size threshold (mermaid shared-internals chunk, not project-controlled)', () => {
  it('raises chunkSizeWarningLimit with a measured, dated justification comment rather than suppressing build output', async () => {
    const config = await source('vite.config.ts');
    expect(config).toMatch(/chunkSizeWarningLimit:\s*\d+/);
    // The justification names the two original chunks and the date, so a future reader can verify
    // the number is still accurate rather than inheriting an unexplained magic value.
    expect(config).toContain('571.58 kB');
    expect(config).toContain('662.12 kB');
    expect(config).toMatch(/measured 2026-09-10/);
    // Forbidden per the plan: no output-suppression flag or setting anywhere in this file.
    expect(config).not.toMatch(/logLevel|--silent|--quiet/);
  });

  it('sets the threshold just above the measured 662.12 kB chunk, not a round number far above it', async () => {
    const config = await source('vite.config.ts');
    const match = config.match(/chunkSizeWarningLimit:\s*(\d+)/);
    expect(match, 'expected a numeric chunkSizeWarningLimit').not.toBeNull();
    const limit = Number(match?.[1]);
    expect(limit).toBeGreaterThan(662.12);
    // Real headroom against a real future regression, but not so much that a chunk doubling in
    // size would go unnoticed.
    expect(limit).toBeLessThan(662.12 * 1.1);
  });
});
