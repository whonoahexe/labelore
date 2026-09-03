// Source-text contract suite in the exact style of test/web/shell-contract.test.ts — readFile
// through the source() helper, never import a .tsx module directly (tsconfig.server.json includes
// test/**/*.ts while excluding src/web/**, so a real import would not typecheck under the server
// project). Pins D-01 through D-05 and the UI Considerations rows this plan's must_haves.truths
// claim as mechanically checkable.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

// The complete dependency key set as of the end of Phase 3 — this plan's threat model (T-04-01-SC)
// requires it install no package, so the parsed dependencies object must never gain a key absent
// from this set.
const PHASE_3_DEPENDENCY_KEYS = new Set([
  '@base-ui/react',
  '@hono/node-server',
  '@tanstack/react-query',
  'class-variance-authority',
  'clsx',
  'gray-matter',
  'hast-util-sanitize',
  'hono',
  'lucide-react',
  'mermaid',
  'minisearch',
  'react',
  'react-dom',
  'react-router',
  'rehype-raw',
  'rehype-sanitize',
  'rehype-slug',
  'rehype-stringify',
  'remark-gfm',
  'remark-parse',
  'remark-rehype',
  'shiki',
  'tailwind-merge',
  'tw-animate-css',
  'unified',
]);

describe('refresh contract — D-01 through D-05 in the shell and control', () => {
  it('renders RefreshControl inside snapshot-status and mounts exactly one ToastProvider (D-01)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    const snapshotStatusBlock = shell.slice(
      shell.indexOf('<div className="snapshot-status"'),
      shell.indexOf('</div>', shell.indexOf('<div className="snapshot-status"')) + '</div>'.length,
    );
    expect(snapshotStatusBlock).toContain('<RefreshControl');
    expect(shell.match(/<ToastProvider>/g)).toHaveLength(1);
  });

  it('shares one status slot between "Snapshot read" and "Refreshing..." (D-02)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell).toContain('Refreshing…');
    expect(shell).toContain('Snapshot read');
  });

  it('sets disabled and aria-disabled from the pending flag, and carries the refresh aria-label (D-02)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    expect(control).toContain('disabled={isRefreshing}');
    expect(control).toContain('aria-disabled={isRefreshing}');
    expect(control).toContain('aria-label="Refresh the project snapshot"');
  });

  it('invalidates the query cache unconditionally and scrolls to top on success (D-03, D-05)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    expect(control).toContain('invalidateQueries()');
    expect(control).toMatch(/window\.scrollTo\(\{\s*top:\s*0\s*\}\)/);
  });

  it('never interpolates a fetch/server error into the toast, only the fixed copy (D-04)', async () => {
    const control = await source('src/web/components/refresh-control.tsx');
    expect(control).not.toContain('error.message');
    expect(control).toContain('Showing the last successful read from');
  });

  it('adds no persistent "stale" label anywhere in the shell (D-04)', async () => {
    const shell = await source('src/web/components/app-shell.tsx');
    expect(shell.toLowerCase()).not.toContain('stale');
  });

  it('fixes the toast viewport to the bottom-right corner of the viewport', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/\.toast-viewport\s*\{[^}]*position:\s*fixed;/);
  });

  it('installs no dependency beyond the Phase 3 set (threat T-04-01-SC)', async () => {
    const packageJson = JSON.parse(await source('package.json')) as {
      dependencies: Record<string, string>;
    };
    const currentKeys = Object.keys(packageJson.dependencies);
    const unauthorized = currentKeys.filter((key) => !PHASE_3_DEPENDENCY_KEYS.has(key));
    expect(unauthorized).toEqual([]);
  });
});
