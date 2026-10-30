import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import {
  buildArtifactUrl,
  buildPhaseUrl,
  buildPlanUrl,
  milestoneSegmentOf,
} from '../../src/presentation/routes.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { createApp, startServer } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { MemorySettingsStore } from '../../src/server/settings-store.ts';
import { legacyArtifactUrl, legacyPlanUrl } from '../helpers/legacy-urls.ts';
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
const SHAPES_PNG_PATH = '.planning/ui-reviews/screenshots/glaze-panel.png';
const SHELL_ROOT_DIV = '<div id="root">';

/** Every address the Shapes payload emits plus the hand-written awkward classes, slug-prefixed (NAV-10). */
function shapesUrlSet(presentation: ProjectPresentation): string[] {
  const slug = `/${presentation.projectSlug}`;
  const emitted: string[] = [];
  for (const artifact of presentation.artifacts) emitted.push(artifact.key);
  for (const milestone of presentation.milestones) {
    emitted.push(milestone.overviewUrl, milestone.roadmapUrl);
    if (milestone.version !== null) emitted.push(`/${milestoneSegmentOf(milestone.version)}`);
    for (const phase of milestone.phases) {
      const phaseUrl = buildPhaseUrl(phase.identity);
      emitted.push(phaseUrl, `${phaseUrl}/`);
      for (const plan of phase.plans) {
        emitted.push(plan.key, `${plan.key}/`);
        if (plan.summary !== null) emitted.push(plan.summary.key);
      }
    }
  }
  emitted.push(...Object.keys(presentation.routeAliases));

  const glazeHotfix = presentation.milestones
    .flatMap((milestone) => milestone.phases)
    .find((phase) => phase.identity.number === '02.1');
  if (glazeHotfix === undefined) throw new Error('Shapes payload has no phase 02.1');
  const handWritten = [
    '/notes/kiln%2Fcurve',
    '/file/state.json',
    '/quick',
    '/notes',
    '/codebase',
    '/no/such/page',
    legacyArtifactUrl('.planning/STATE.md'),
    legacyPlanUrl(glazeHotfix.identity, '02.1-01'),
  ];
  return [...new Set([slug, ...[...emitted, ...handWritten].map((url) => `${slug}${url}`), '/roadmap'])];
}

/** The classes a set must hold: a shrunken fixture or an empty list fails instead of passing. */
const REQUIRED_CLASSES: [string, (url: string) => boolean][] = [
  ['v1.1', (url) => url.includes('v1.1')],
  ['phase-2.1', (url) => url.includes('phase-2.1')],
  ['file/', (url) => url.includes('/file/')],
  ['encoded slash', (url) => url.includes('%2F')],
  ['encoded percent', (url) => url.includes('%25')],
  ['encoded hash', (url) => url.includes('%23')],
  ['unicode', (url) => url.includes('%C3%BC')],
  ['.png', (url) => url.includes('.png')],
  ['.svg', (url) => url.includes('.svg')],
  ['.pdf', (url) => url.includes('.pdf')],
  ['trailing slash', (url) => url.endsWith('/')],
  ['legacy link', (url) => /^\/[^/]+\/(?:artifacts|milestones)\//.test(url)],
];

const shapesRepository = new PlanningRepository(new LocalFsPlanningFilesystem(SHAPES_ROOT), SHAPES_ROOT);
await shapesRepository.load();
const shapesPresentation = (await (
  await createApp(shapesRepository, true, SHAPES_ROOT).request('/api/presentation')
).json()) as ProjectPresentation;
const SHAPES_URLS = shapesUrlSet(shapesPresentation);
const PNG_KEY = shapesPresentation.artifacts.find((artifact) => artifact.path === SHAPES_PNG_PATH)?.key ?? '';
const PLAN_KEY = shapesPresentation.artifacts.find((artifact) => artifact.path === SHAPES_PLAN_PATH)?.key ?? '';

describe('the Shapes URL set', () => {
  it('holds every URL class and at least as many URLs as the payload has artifacts', () => {
    for (const [name, has] of REQUIRED_CLASSES) {
      expect(SHAPES_URLS.some(has), `no ${name} URL in the set`).toBe(true);
    }
    expect(SHAPES_URLS.length).toBeGreaterThanOrEqual(shapesPresentation.artifacts.length);
    expect(PNG_KEY).not.toBe('');
    expect(PLAN_KEY).toContain('phase-2.1');
  });
});

/** The /api/* guard, run against either app through one fetch function. `projectApi` is where the
 * project's own routes live: /api on the test-only wrapper, /api/projects/shapes on the served registry app. */
function apiGuardTests(
  fetchPath: (path: string, init?: RequestInit) => Promise<Response>,
  projectApi: string,
): void {
  it('answers 404 JSON for an unknown API route, with and without Accept text/html', async () => {
    for (const headers of [undefined, { Accept: 'text/html' }]) {
      const response = await fetchPath('/api/not-real', { headers });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'API route not found' });
    }
  });

  it('answers the files route with no route 404 Not found, never the shell', async () => {
    const response = await fetchPath(`${projectApi}/files`, { headers: { Accept: 'text/html' } });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not found');
  });

  it('answers the PNG bytes route with image/png for GET and HEAD', async () => {
    const path = `${projectApi}/files?route=${encodeURIComponent(PNG_KEY)}`;
    for (const method of ['GET', 'HEAD']) {
      const response = await fetchPath(path, { method });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
    }
  });

  it('answers the presentation route as JSON carrying the slug', async () => {
    const response = await fetchPath(`${projectApi}/presentation`, { headers: { Accept: 'text/html' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(((await response.json()) as { projectSlug: string }).projectSlug).toBe('shapes');
  });
}

describe('Shapes: every URL in production', () => {
  let staticRoot = '';
  let app: ReturnType<typeof createApp>;
  const shell = '<!doctype html><html><body><div id="root">Labelore shell</div></body></html>';

  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'labelore-deep-links-shapes-'));
    await writeFile(join(staticRoot, 'index.html'), shell);
    app = createApp(shapesRepository, true, staticRoot);
  });

  afterAll(async () => {
    await rm(staticRoot, { recursive: true, force: true });
  });

  it.each(SHAPES_URLS)('answers 200 and the exact shell for direct GET %s', async (url) => {
    const response = await app.request(url, { headers: { Accept: 'text/html' } });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(shell);
  });

  describe('the /api/* guard', () => {
    apiGuardTests((path, init) => Promise.resolve(app.request(path, init)), '/api');
  });
});

describe('Shapes: every URL on the development server', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  let base = '';

  beforeAll(async () => {
    server = await startServer([SHAPES_ROOT], { port: 0, production: false, settings: new MemorySettingsStore() });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it.each(SHAPES_URLS)('answers 200 text/html and the root div for direct GET %s', async (url) => {
    const response = await fetch(`${base}${url}`, { headers: { Accept: 'text/html' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain(SHELL_ROOT_DIV);
  });

  describe('the /api/* guard', () => {
    // 127.0.0.1:<port> is the Host fetch sends, which the request guard allows once the server is listening.
    apiGuardTests((path, init) => fetch(`${base}${path}`, init), '/api/projects/shapes');
  });
});
