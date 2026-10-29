// Pins the read-only image-bytes route (Phase 7: D-08, D-09, D-10, D-11): GET /api/files?route=<an
// image's readable URL> serves that image's exact bytes with hardened headers, resolved through the route
// table of one bundle. Images only: every other file, internal file or unknown address answers the same
// 404 before any read. Real cases run over the committed Shapes fixture; boundary, error and race cases
// use hand-made snapshots over an in-memory filesystem.
import { cp, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Artifact, Project } from '../../src/domain/model.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PathEscapeError } from '../../src/planning-fs/types.ts';
import type { FileBytes, PlanningFilesystem } from '../../src/planning-fs/types.ts';
import { MAX_IMAGE_BYTES, MAX_TEXT_BYTES } from '../../src/planning-repo/file-class.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { buildPhaseUrl } from '../../src/presentation/routes.ts';
import { createApp } from '../../src/server/index.ts';
import {
  IMAGE_CONTENT_TYPES,
  IMAGE_RESPONSE_HEADERS,
  imageContentType,
} from '../../src/server/file-bytes.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const CSP = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03]);

/** Wraps a filesystem, recording every readBytesWithin call and letting a test change what it does. */
class SpyFs implements PlanningFilesystem {
  readonly capabilities;
  readonly calls: string[] = [];
  hiddenPaths = new Set<string>();

  constructor(
    private readonly inner: PlanningFilesystem,
    private readonly onRead?: (read: () => Promise<FileBytes>) => Promise<FileBytes>,
  ) {
    this.capabilities = inner.capabilities;
  }

  async list(relDir: string) {
    const entries = await this.inner.list(relDir);
    return entries.filter((entry) => !this.hiddenPaths.has(`${relDir}/${entry.name}`));
  }
  read(relPath: string) {
    return this.inner.read(relPath);
  }
  exists(relPath: string) {
    return this.inner.exists(relPath);
  }
  readHead(relPath: string, maxBytes: number) {
    return this.inner.readHead!(relPath, maxBytes);
  }
  readBytesWithin(baseRelDir: string, relPath: string): Promise<FileBytes> {
    this.calls.push(relPath);
    const read = () => this.inner.readBytesWithin!(baseRelDir, relPath);
    return this.onRead ? this.onRead(read) : read();
  }
}

function makeArtifact(overrides: Partial<Artifact> & { path: string }): Artifact {
  return {
    id: overrides.path,
    kind: 'context',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'root',
    frontmatter: {},
    title: overrides.path,
    body: '',
    bodyLength: 0,
    bodyHash: 'x',
    mtimeMs: 0,
    warnings: [],
    structured: {},
    ...overrides,
  };
}

function makeSnapshot(readAt: string, artifacts: Artifact[]): ProjectSnapshot {
  const project: Project = {
    rootPath: '/fixture',
    name: 'Bytes Fixture',
    artifacts: Object.fromEntries(artifacts.map((artifact) => [artifact.path, artifact])),
    config: {},
    milestones: [],
    phases: [],
    quickTasks: [],
    requirements: [],
    mentions: { byId: {}, all: [] },
  };
  return { loadStatus: { status: 'ok' }, readAt, rootPath: '/fixture', project, warnings: [], exclusions: [] };
}

const PROJECT_MD = makeArtifact({ path: '.planning/PROJECT.md', body: 'Project' });
const imageAt = (path: string, sizeBytes: number): Artifact =>
  makeArtifact({ path, fileClass: 'image', sizeBytes, kind: 'other' });

type App = ReturnType<typeof createApp>;

async function presentationOf(app: App): Promise<ProjectPresentation> {
  return (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
}
async function keyOf(app: App, path: string): Promise<string> {
  const artifact = (await presentationOf(app)).artifacts.find((candidate) => candidate.path === path);
  if (!artifact) throw new Error(`No artifact at ${path}`);
  return artifact.key;
}
const bytesUrl = (key: string): string => `/api/files?route=${encodeURIComponent(key)}`;

function expectSecurityHeaders(res: Response): void {
  for (const [name, value] of Object.entries(IMAGE_RESPONSE_HEADERS)) {
    expect(res.headers.get(name)).toBe(value);
  }
  expect(res.headers.get('content-security-policy')).toBe(CSP);
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  expect(res.headers.get('cache-control')).toBe('no-cache');
}

/** An app over one hand-made snapshot and an in-memory filesystem holding `files`, wrapped in a spy. */
function memoryApp(artifacts: Artifact[], files: Record<string, string | Uint8Array>, spy?: SpyFs) {
  const fs = spy ?? new SpyFs(new InMemoryPlanningFilesystem(files));
  const snapshot = makeSnapshot('2026-10-01T00:00:00.000Z', artifacts);
  const app = createApp({ getSnapshot: () => snapshot, planningFilesystem: () => fs }, true, '.');
  return { app, fs };
}

// The Shapes fixture, read through a spy so a refusal can be shown to have read nothing.
const shapesFs = new SpyFs(new LocalFsPlanningFilesystem(SHAPES_ROOT));
const shapesRepo = new PlanningRepository(shapesFs, SHAPES_ROOT);
await shapesRepo.load();
const shapesApp = createApp(shapesRepo, true, '.');
const shapes = await presentationOf(shapesApp);

describe('GET /api/files?route= over the Shapes fixture', () => {
  it('serves a PNG with its exact bytes, the image content type and the three security headers', async () => {
    const path = '.planning/ui-reviews/screenshots/glaze-panel.png';
    const res = await shapesApp.request(bytesUrl(await keyOf(shapesApp, path)));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expectSecurityHeaders(res);
    const expected = await readFile(`${SHAPES_ROOT}/${path}`);
    expect(Buffer.from(await res.arrayBuffer()).equals(expected)).toBe(true);
  });

  it('serves an SVG as image/svg+xml with the sandbox CSP', async () => {
    const res = await shapesApp.request(bytesUrl(await keyOf(shapesApp, '.planning/ui-reviews/kiln-map.svg')));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    expectSecurityHeaders(res);
  });

  it('answers HEAD with the same status and headers and no body', async () => {
    const url = bytesUrl(await keyOf(shapesApp, '.planning/ui-reviews/screenshots/glaze-panel.png'));
    const get = await shapesApp.request(url);
    const head = await shapesApp.request(url, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toBe(get.headers.get('content-type'));
    expectSecurityHeaders(head);
    expect((await head.arrayBuffer()).byteLength).toBe(0);
  });

  it('answers the same 404 before any read for everything that is not an image', async () => {
    const phase = shapes.milestones.flatMap((milestone) => milestone.phases)[0];
    const plan = shapes.artifacts.find((artifact) => artifact.kind === 'plan');
    const text = shapes.artifacts.find((artifact) => artifact.path === '.planning/PROJECT.md');
    expect(phase && plan && text).toBeTruthy();
    const routes: string[] = [
      await keyOf(shapesApp, '.planning/phases/01-kiln-bookings/firing-sheet.pdf'),
      await keyOf(shapesApp, '.planning/notes/kiln-curve.dat'),
      await keyOf(shapesApp, '.planning/notes/kiln-log'),
      text!.key,
      '/file/state.json',
      '/notes/no-such.png',
      '/roadmap',
      buildPhaseUrl(phase!.identity),
      plan!.key,
      '%E0%A4%A',
      '',
    ];
    shapesFs.calls.length = 0;
    const bodies = new Set<string>();
    for (const route of routes) {
      const res = await shapesApp.request(bytesUrl(route));
      expect(res.status, route).toBe(404);
      expectSecurityHeaders(res);
      bodies.add(await res.text());
    }
    const missing = await shapesApp.request('/api/files');
    expect(missing.status).toBe(404);
    bodies.add(await missing.text());
    const rawMalformed = await shapesApp.request('/api/files?route=%E0%A4%A');
    expect(rawMalformed.status).toBe(404);
    bodies.add(await rawMalformed.text());
    expect([...bodies]).toEqual(['Not found']);
    expect(shapesFs.calls).toEqual([]);
  });

  it('answers 404 for a large text file without reading it', async () => {
    const big = 'a'.repeat(MAX_TEXT_BYTES + 1);
    const { app, fs } = memoryApp(
      [PROJECT_MD, makeArtifact({ path: '.planning/research/dump.json', fileClass: 'large', sizeBytes: big.length })],
      { '.planning/research/dump.json': big },
    );
    const res = await app.request(bytesUrl(await keyOf(app, '.planning/research/dump.json')));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found');
    expect(fs.calls).toEqual([]);
  });
});

describe('image content types', () => {
  it('maps exactly the image extensions and nothing else', () => {
    expect(Object.keys(IMAGE_CONTENT_TYPES).sort()).toEqual(
      ['avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'webp'],
    );
    expect(imageContentType('A.JPG')).toBe('image/jpeg');
    expect(imageContentType('a.pdf')).toBeNull();
    expect(imageContentType('noext')).toBeNull();
  });
});

describe('the size cap', () => {
  const path = '.planning/ui-reviews/exact.png';

  it('serves an image of exactly MAX_IMAGE_BYTES', async () => {
    const bytes = new Uint8Array(MAX_IMAGE_BYTES);
    const { app } = memoryApp([PROJECT_MD, imageAt(path, MAX_IMAGE_BYTES)], { [path]: bytes });
    const res = await app.request(bytesUrl(await keyOf(app, path)));
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBe(MAX_IMAGE_BYTES);
  });

  it('answers 413 for an indexed size above MAX_IMAGE_BYTES without reading', async () => {
    const bytes = new Uint8Array(MAX_IMAGE_BYTES + 1);
    const { app, fs } = memoryApp([PROJECT_MD, imageAt(path, MAX_IMAGE_BYTES + 1)], { [path]: bytes });
    const res = await app.request(bytesUrl(await keyOf(app, path)));
    expect(res.status).toBe(413);
    expectSecurityHeaders(res);
    expect(fs.calls).toEqual([]);
  });

  it('answers 413 from the bytes actually read when the file grew after indexing', async () => {
    const grown = new Uint8Array(MAX_IMAGE_BYTES + 1);
    const { app, fs } = memoryApp([PROJECT_MD, imageAt(path, PNG_BYTES.length)], { [path]: grown });
    const res = await app.request(bytesUrl(await keyOf(app, path)));
    expect(res.status).toBe(413);
    expectSecurityHeaders(res);
    expect(fs.calls).toEqual([path]);
  });
});

describe('read errors', () => {
  const path = '.planning/ui-reviews/pic.png';

  function failingApp(error: unknown) {
    const spy = new SpyFs(new InMemoryPlanningFilesystem({ [path]: PNG_BYTES }), () => Promise.reject(error));
    return memoryApp([PROJECT_MD, imageAt(path, PNG_BYTES.length)], {}, spy).app;
  }
  const withCode = (code: string): Error => Object.assign(new Error(code), { code });

  it.each([
    ['ENOENT', withCode('ENOENT'), 404],
    ['ENOTDIR', withCode('ENOTDIR'), 404],
    ['ELOOP', withCode('ELOOP'), 404],
    ['EINVAL', withCode('EINVAL'), 404],
    ['EACCES', withCode('EACCES'), 403],
    ['EPERM', withCode('EPERM'), 403],
    ['PathEscapeError', new PathEscapeError(path, '/elsewhere'), 403],
    ['anything else', new Error('boom'), 500],
  ])('maps %s to %i with the security headers', async (_name, error, status) => {
    const app = failingApp(error);
    const res = await app.request(bytesUrl(await keyOf(app, path)));
    expect(res.status).toBe(status);
    expectSecurityHeaders(res);
    if (status === 500) expect(await res.text()).toBe('Read failed');
  });

  it('answers 404 when the source has no filesystem', async () => {
    const snapshot = makeSnapshot('2026-10-01T00:00:00.000Z', [PROJECT_MD, imageAt(path, PNG_BYTES.length)]);
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const res = await app.request(bytesUrl(await keyOf(app, path)));
    expect(res.status).toBe(404);
    expectSecurityHeaders(res);
  });
});

describe('methods', () => {
  it.each(['POST', 'PUT', 'DELETE'])('answers %s with 405, Allow: GET, HEAD and no read', async (method) => {
    const path = '.planning/ui-reviews/pic.png';
    const { app, fs } = memoryApp([PROJECT_MD, imageAt(path, PNG_BYTES.length)], { [path]: PNG_BYTES });
    const res = await app.request(bytesUrl(await keyOf(app, path)), { method });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
    expectSecurityHeaders(res);
    expect(fs.calls).toEqual([]);
  });
});

describe('a symlink that leaves .planning', () => {
  const cleanup: string[] = [];
  afterAll(async () => {
    for (const dir of cleanup) await rm(dir, { recursive: true, force: true });
  });

  it('answers 403 and no bytes', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'labelore-bytes-')));
    const outside = await realpath(await mkdtemp(join(tmpdir(), 'labelore-bytes-outside-')));
    cleanup.push(root, outside);
    await cp(resolve(import.meta.dirname, '../../fixtures/sparse-empty'), root, { recursive: true });
    await writeFile(join(outside, 'secret.png'), 'OUTSIDE-SECRET');
    await symlink(join(outside, 'secret.png'), join(root, '.planning', 'leak.png'));
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    await repo.load();
    const app = createApp(repo, true, '.');
    const res = await app.request(bytesUrl(await keyOf(app, '.planning/leak.png')));
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('OUTSIDE-SECRET');
    expectSecurityHeaders(res);
  });
});

describe('a request is answered from the one bundle it captured (DATA-08 concurrency edge)', () => {
  const path = '.planning/ui-reviews/pic.png';

  it('a read held open across a refresh that drops the image still answers 200; the next request answers 404', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => (release = done));
    let entered!: () => void;
    const hasEntered = new Promise<void>((done) => (entered = done));
    const spy = new SpyFs(new InMemoryPlanningFilesystem({ [path]: PNG_BYTES }), async (read) => {
      entered();
      await gate;
      return read();
    });
    let current = makeSnapshot('2026-10-01T00:00:00.000Z', [PROJECT_MD, imageAt(path, PNG_BYTES.length)]);
    const after = makeSnapshot('2026-10-02T00:00:00.000Z', [PROJECT_MD]);
    const app = createApp(
      {
        getSnapshot: () => current,
        refresh: async () => (current = after),
        planningFilesystem: () => spy,
      },
      true,
      '.',
    );
    const url = bytesUrl(await keyOf(app, path));

    const pending = app.request(url);
    await hasEntered;
    const refreshed = await app.request('/api/refresh', { method: 'POST' });
    expect(refreshed.status).toBe(200);
    release();
    const res = await pending;
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(PNG_BYTES))).toBe(true);

    const next = await app.request(url);
    expect(next.status).toBe(404);
    expect(spy.calls).toEqual([path]);
  });

  it("the handler's first statement captures the bundle", async () => {
    const source = await readFile(new URL('../../src/server/file-bytes.ts', import.meta.url), 'utf8');
    const start = source.indexOf('return async (c) => {');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start + 'return async (c) => {'.length);
    expect(body).toMatch(/^(\s*\/\/[^\n]*\n)*\s*const activeDerived = getBundle\(\);/);
  });
});
