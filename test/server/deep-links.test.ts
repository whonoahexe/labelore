import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { buildArtifactUrl, buildPhaseUrl, buildPlanUrl } from '../../src/presentation/routes.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { createApp, startServer } from '../../src/server/index.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

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
  const shell = '<!doctype html><html><body><div id="root">Labelore shell</div></body></html>';

  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'labelore-deep-links-'));
    await mkdir(join(staticRoot, 'assets'));
    await writeFile(join(staticRoot, 'index.html'), shell);
    await writeFile(join(staticRoot, 'assets', 'app.js'), 'window.__LABELORE__ = true;');
  });

  afterAll(async () => {
    await rm(staticRoot, { recursive: true, force: true });
  });

  const source = { getSnapshot: () => snapshot };

  it.each([
    '/',
    '/roadmap',
    '/search',
    '/search?q=IDENT-02',
    '/traceability',
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
    expect(await asset.text()).toBe('window.__LABELORE__ = true;');

    const missingAsset = await app.request('/assets/missing.js');
    expect(missingAsset.status).toBe(404);
    expect(await missingAsset.text()).not.toContain('Labelore shell');
  });

  it('serves presentation, dashboard, roadmap, and history from the same snapshot identity', async () => {
    const app = createApp(source, true, staticRoot);
    const [presentation, dashboard, roadmap, history] = await Promise.all([
      app.request('/api/presentation'),
      app.request('/api/dashboard'),
      app.request('/api/roadmap'),
      app.request('/api/history'),
    ]);
    const payloads = (await Promise.all([
      presentation.json(),
      dashboard.json(),
      roadmap.json(),
      history.json(),
    ])) as Array<Record<string, unknown>>;

    expect(payloads.map((payload) => payload.readAt)).toEqual(Array(4).fill(snapshot.readAt));
    expect(payloads[1]).toMatchObject({
      loadStatus: { status: 'ok' },
      // quick-261018-4tb: decisions and blockers are plain lists built from the ledger.
      decisions: [],
      blockers: [],
    });
    expect(payloads[2]).toMatchObject({ active: null, history: [] });
    expect(payloads[3]).toMatchObject({ history: [] });
  });
});

const SHAPES_PLAN_PATH = '.planning/phases/02.1-glaze-hotfix/02.1-01-PLAN.md';

interface PresentationLite {
  projectSlug: string;
  artifacts: { key: string; path: string }[];
}

/** The address (slug included) of the decimal-phase plan, from a served /api/presentation payload. */
function shapesPlanAddress(presentation: PresentationLite): string {
  const artifact = presentation.artifacts.find((entry) => entry.path === SHAPES_PLAN_PATH);
  if (artifact === undefined) throw new Error(`Shapes payload has no ${SHAPES_PLAN_PATH}`);
  return `/${presentation.projectSlug}${artifact.key}`;
}

describe('Shapes: a dotted decimal-phase plan address in production', () => {
  let staticRoot = '';
  const shell = '<!doctype html><html><body><div id="root">Labelore shell</div></body></html>';

  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'labelore-deep-links-shapes-'));
    await writeFile(join(staticRoot, 'index.html'), shell);
  });

  afterAll(async () => {
    await rm(staticRoot, { recursive: true, force: true });
  });

  it('answers the shell, not an API route, for a direct GET', async () => {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(SHAPES_ROOT), SHAPES_ROOT);
    await repository.load();
    const app = createApp(repository, true, staticRoot);

    const presentation = (await (await app.request('/api/presentation')).json()) as PresentationLite;
    const address = shapesPlanAddress(presentation);
    expect(address).toContain('phase-2.1');

    const response = await app.request(address);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(shell);
  });
});

describe('Shapes: a dotted decimal-phase plan address on the development server', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  let base = '';

  beforeAll(async () => {
    server = await startServer(SHAPES_ROOT, { port: 0, production: false });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('answers the Vite-served shell for a direct GET with Accept text/html', async () => {
    const presentation = (await (await fetch(`${base}/api/presentation`)).json()) as PresentationLite;
    const response = await fetch(`${base}${shapesPlanAddress(presentation)}`, {
      headers: { Accept: 'text/html' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain('<div id="root">');
  });
});
