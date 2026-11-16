// Source-text contract suite in the exact style of test/web/shell-contract.test.ts — readFile
// through the source() helper, never import a .tsx module directly (tsconfig.server.json includes
// test/**/*.ts while excluding src/web/**, so a real import would not typecheck under the server
// project). Pins D-01 through D-05 and the UI Considerations rows this plan's must_haves.truths
// claim as mechanically checkable.
//
// quick-260911-243 merged RefreshControl into SnapshotStatus (NAV-05): every guarantee below now
// reads src/web/components/snapshot-status.tsx in place of the deleted refresh-control.tsx.
import { readFile } from 'node:fs/promises';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshInvalidations } from '../../src/web/components/snapshot-status.tsx';
import { projectKey, projectsKey } from '../../src/web/query-keys.ts';

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
  it('refreshing shapes marks shapes and the list invalid and leaves lendshed valid (T-08-35)', async () => {
    const client = new QueryClient();
    const lendshed = projectKey('lendshed', null, 'dashboard');
    const shapes = projectKey('shapes', null, 'dashboard');
    client.setQueryData(lendshed, { project: 'lendshed' });
    client.setQueryData(shapes, { project: 'shapes' });
    client.setQueryData(projectsKey, { projects: [] });

    await refreshInvalidations(client, 'shapes');

    expect(client.getQueryState(shapes)?.isInvalidated).toBe(true);
    expect(client.getQueryState(projectsKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(lendshed)?.isInvalidated).toBe(false);
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

