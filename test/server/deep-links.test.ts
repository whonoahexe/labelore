import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { buildArtifactUrl, buildPhaseUrl, buildPlanUrl } from '../../src/presentation/routes.ts';
import { createApp } from '../../src/server/index.ts';

const snapshot: ProjectSnapshot = {
  loadStatus: { status: 'ok' },
  readAt: '2026-08-27T00:00:00.000Z',
  rootPath: '/fixture',
  project: null,
  warnings: [],
  exclusions: [],
};

const phase: PhaseIdentity = {
  milestoneVersion: 'v1.0 / 旧',
  number: '02.1',
  projectCode: 'LORE',
  slug: 'nested / route',
};

describe('production SPA deep-link delivery', () => {
  let staticRoot = '';
  const shell = '<!doctype html><html><body><div id="root">GSD Lore shell</div></body></html>';

  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'gsd-lore-deep-links-'));
    await mkdir(join(staticRoot, 'assets'));
    await writeFile(join(staticRoot, 'index.html'), shell);
    await writeFile(join(staticRoot, 'assets', 'app.js'), 'window.__GSD_LORE__ = true;');
  });

  afterAll(async () => {
    await rm(staticRoot, { recursive: true, force: true });
  });

  const source = { getSnapshot: () => snapshot };

  it.each([
    '/',
    '/roadmap',
    buildPhaseUrl(phase),
    buildPlanUrl(phase, '02-02 / 計画'),
    buildArtifactUrl(phase, '.planning/phase / RESEARCH.md'),
    buildArtifactUrl(phase, '.planning/phase / RESEARCH.md', 'Heading / Δ'),
  ])('returns the SPA entry document for direct GET %s', async (url) => {
    const response = await createApp(source, true, staticRoot).request(url);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(shell);
  });

  it('does not let unknown API routes or real static assets fall through to the shell', async () => {
    const app = createApp(source, true, staticRoot);

    const api = await app.request('/api/not-real');
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual({ error: 'API route not found' });

    const asset = await app.request('/assets/app.js');
    expect(asset.status).toBe(200);
    expect(await asset.text()).toBe('window.__GSD_LORE__ = true;');

    const missingAsset = await app.request('/assets/missing.js');
    expect(missingAsset.status).toBe(404);
    expect(await missingAsset.text()).not.toContain('GSD Lore shell');
  });
});
