// Pins the read-only sketch file route (todo 001, quick-261023-4wn; PLAT-08, SEC-05): the project API
// serves .planning/sketches/ at /api/projects/<slug>/sketch-files/<folder>/ (and the test wrapper at
// /api/sketch-files/<folder>/) from .planning/sketches/ only, never lists directories, never writes,
// and answers every response with a sandbox Content-Security-Policy. Nothing answers at /sketches/*
// any more. Projects are built in temp directories, because committed fixtures must trace to a
// gsd-core template.
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PathEscapeError } from '../../src/planning-fs/types.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { createApp, routesToApp } from '../../src/server/index.ts';
import { ProjectRegistry, createSnapshotSource } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import {
  SKETCH_FILES_SEGMENT,
  SKETCH_TOOLS_STYLE,
  sketchContentType,
  sketchRequestPath,
  withSketchToolsStyle,
} from '../../src/server/sketch-files.ts';
import { guardedRequest, testPolicy } from '../helpers/guarded-request.ts';

const FIXTURES = resolve(import.meta.dirname, '../../fixtures');
const TOOLS_HTML = '<!doctype html><head><title>t</title></head><body><div id="sketch-tools">Width</div></body>';
const SHELL = '<!doctype html><html><body><div id="root">Labelore shell</div></body></html>';
const CSP = 'sandbox allow-scripts';
const WOFF2_BYTES = Uint8Array.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0xff, 0xfe, 0x01, 0x80]);

let root = '';
let outsideDir = '';
let staticRoot = '';
let repo: PlanningRepository;
let wrapper: ReturnType<typeof createApp>;
let registryApp: ReturnType<typeof createRegistryApp>;
let registry: ProjectRegistry;
let slug = '';

async function listTree(dir: string, base = dir): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    const rel = abs.slice(base.length);
    if (entry.isSymbolicLink()) {
      out[rel] = 'symlink';
    } else if (entry.isDirectory()) {
      out[rel] = 'dir';
      Object.assign(out, await listTree(abs, base));
    } else {
      out[rel] = (await readFile(abs)).toString('base64');
    }
  }
  return out;
}

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'labelore-sketches-')));
  outsideDir = await realpath(await mkdtemp(join(tmpdir(), 'labelore-sketches-outside-')));
  staticRoot = await mkdtemp(join(tmpdir(), 'labelore-sketches-static-'));
  await cp(join(FIXTURES, 'sparse-empty'), root, { recursive: true });

  const sketches = join(root, '.planning', 'sketches');
  const alpha = join(sketches, '001-alpha');
  await mkdir(join(sketches, 'themes', 'fonts'), { recursive: true });
  await mkdir(alpha, { recursive: true });
  await writeFile(join(alpha, 'index.html'), '<!doctype html><title>a</title><p>SKETCH-ALPHA-INDEX</p>');
  await writeFile(join(alpha, 'tools.html'), TOOLS_HTML);
  await writeFile(join(alpha, 'data.js'), 'window.DATA = 1;');
  await writeFile(join(alpha, 'data.json'), '{"a":1}');
  await writeFile(join(alpha, 'pic.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(join(alpha, 'pic.png'), Uint8Array.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(join(alpha, 'blob.xyz'), 'whatever');
  await writeFile(join(alpha, '.hidden'), 'HIDDEN');
  await writeFile(join(alpha, 'README.md'), '---\nsketch: 001\nname: alpha\n---\n# Alpha\n');
  await writeFile(join(sketches, 'themes', 'default.css'), 'body { color: red; }');
  await writeFile(join(sketches, 'themes', 'fonts', 'a.woff2'), WOFF2_BYTES);

  await writeFile(join(root, 'secret.txt'), 'ROOT-SECRET');
  await writeFile(join(outsideDir, 'outside-secret.txt'), 'OUTSIDE-SECRET');
  await symlink('../../STATE.md', join(alpha, 'leak-state.md'));
  await symlink('../../../secret.txt', join(alpha, 'leak-root.txt'));
  await symlink(join(outsideDir, 'outside-secret.txt'), join(alpha, 'leak-outside.txt'));
  await symlink('index.html', join(alpha, 'alias.html'));
  await writeFile(join(outsideDir, 'anything.txt'), 'OUTSIDE-SECRET');
  await symlink(outsideDir, join(sketches, 'linked'));

  await writeFile(join(staticRoot, 'index.html'), SHELL);

  repo = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
  await repo.load();
  wrapper = createApp(repo, true, staticRoot);

  registry = new ProjectRegistry({ createSource: (target) => createSnapshotSource(target) });
  const registered = await registry.register(root);
  if (!registered.ok) throw new Error('the temporary project did not register');
  slug = registered.slug;
  registryApp = createRegistryApp(registry, { policy: testPolicy(), production: true, staticRoot });
});

afterAll(async () => {
  registry.dispose();
  for (const dir of [root, outsideDir, staticRoot]) await rm(dir, { recursive: true, force: true });
});

const MARKERS = ['SKETCH-ALPHA-INDEX', 'ROOT-SECRET', 'OUTSIDE-SECRET', 'HIDDEN'];

interface Served {
  name: string;
  /** The raw sketch-files prefix of this app, without a trailing slash. */
  base: () => string;
  request: (path: string, init?: RequestInit) => Promise<Response>;
}

// The very same handlers answer in both: the registry app at /api/projects/<slug>, behind the request
// guard, and the guard-free wrapper at /api.
const SERVED: Served[] = [
  {
    name: 'registry app',
    base: () => `/api/projects/${slug}/sketch-files`,
    request: (path, init) => guardedRequest(registryApp, path, init),
  },
  {
    name: 'test wrapper',
    base: () => '/api/sketch-files',
    request: async (path, init) => await wrapper.request(path, init),
  },
];

describe.each(SERVED)('GET sketch files through the $name', ({ base, request }) => {
  it('serves a folder index with the security headers and no CORS grant', async () => {
    const res = await request(`${base()}/001-alpha/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('SKETCH-ALPHA-INDEX');
    expect(res.headers.get('content-security-policy')).toBe(CSP);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('ignores a ?v= query string', async () => {
    const res = await request(`${base()}/001-alpha/index.html?v=3`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('SKETCH-ALPHA-INDEX');
  });

  it('redirects a folder without the trailing slash, keeping the sandbox header', async () => {
    const res = await request(`${base()}/001-alpha?v=2`, { redirect: 'manual' });
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(`${base()}/001-alpha/?v=2`);
    expect(res.headers.get('content-security-policy')).toBe(CSP);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it.each([
    ['/001-alpha/data.js', 'text/javascript; charset=utf-8'],
    ['/001-alpha/data.json', 'application/json; charset=utf-8'],
    ['/001-alpha/pic.svg', 'image/svg+xml'],
    ['/001-alpha/pic.png', 'image/png'],
    ['/themes/default.css', 'text/css; charset=utf-8'],
    ['/001-alpha/blob.xyz', 'application/octet-stream'],
  ])('serves %s as %s', async (rest, type) => {
    const res = await request(`${base()}${rest}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe(type);
    expect(res.headers.get('content-security-policy')).toBe(CSP);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('serves a font byte-for-byte, and only a font gets the CORS grant', async () => {
    const res = await request(`${base()}/themes/fonts/a.woff2`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('font/woff2');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const served = new Uint8Array(await res.arrayBuffer());
    const onDisk = new Uint8Array(await readFile(join(root, '.planning/sketches/themes/fonts/a.woff2')));
    expect(Array.from(served)).toEqual(Array.from(onDisk));
  });

  it('serves a symlink that stays inside sketches/', async () => {
    const res = await request(`${base()}/001-alpha/alias.html`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('SKETCH-ALPHA-INDEX');
  });

  it.each([
    '/001-alpha/leak-state.md',
    '/001-alpha/leak-root.txt',
    '/001-alpha/leak-outside.txt',
    '/linked/anything.txt',
    '/001-alpha/..%2F..%2FSTATE.md',
    '/..%2F..%2Fsecret.txt',
    '/001-alpha/%2e%2e%2f%2e%2e%2fSTATE.md',
    '/001-alpha/..%5C..%5Csecret.txt',
    '/001-alpha/index.html%00.css',
    '//etc/passwd',
    '/%2Fetc%2Fpasswd',
    '/001-alpha/.hidden',
    '/001-alpha/%E0%A4%A',
  ])('refuses %s with 403 and no bytes', async (rest) => {
    const res = await request(`${base()}${rest}`);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-security-policy')).toBe(CSP);
    const body = await res.text();
    for (const marker of [...MARKERS, 'STATE']) expect(body).not.toContain(marker);
  });

  it.each(['/../../secret.txt', '/%2e%2e/%2e%2e/secret.txt'])('never returns the root secret for %s', async (rest) => {
    const res = await request(`${base()}${rest}`);
    expect(await res.text()).not.toContain('ROOT-SECRET');
  });

  it.each(['/', '/themes/', '/001-alpha/missing.js'])('answers 404 for %s', async (rest) => {
    const res = await request(`${base()}${rest}`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-security-policy')).toBe(CSP);
    const body = await res.text();
    expect(body).not.toContain('default.css');
    expect(body).not.toContain('themes');
  });

  it('answers 404 with the sandbox header for the bare sketch-files address', async () => {
    const res = await request(base());
    expect(res.status).toBe(404);
    expect(res.headers.get('content-security-policy')).toBe(CSP);
  });

  it('answers HEAD with the headers and an empty body', async () => {
    const res = await request(`${base()}/001-alpha/`, { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('content-security-policy')).toBe(CSP);
    expect(await res.text()).toBe('');
  });

  it('answers no sketch file at the old /sketches/ address', async () => {
    for (const url of ['/sketches/001-alpha/', '/sketches/001-alpha/index.html', '/sketches', '/sketches?view=001-alpha']) {
      const res = await request(url);
      const body = await res.text();
      expect(body).not.toContain('SKETCH-ALPHA-INDEX');
      expect(res.headers.get('content-security-policy')).toBeNull();
    }
  });
});

describe('sketch files in the registry app only', () => {
  it('refuses a foreign Host with 403 before the sketch middleware runs', async () => {
    const res = await registryApp.request(`/api/projects/${slug}/sketch-files/001-alpha/`, {
      headers: { Host: 'evil.example' },
    });
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('SKETCH-ALPHA-INDEX');
  });

  it('serves a sketch only under the project whose slug is in the URL', async () => {
    const res = await guardedRequest(registryApp, '/api/projects/no-such-project/sketch-files/001-alpha/');
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('SKETCH-ALPHA-INDEX');
  });

  it('redirects to the raw slug segment the client sent, as a same-origin path', async () => {
    const res = await guardedRequest(registryApp, `/api/projects/${slug}/sketch-files/001-alpha`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(308);
    const location = res.headers.get('location') ?? '';
    expect(location).toBe(`/api/projects/${slug}/sketch-files/001-alpha/`);
    expect(location.startsWith('//')).toBe(false);
  });
});

describe.each(SERVED)('write methods on sketch files through the $name', ({ base, request }) => {
  it('answers 405 with Allow and leaves the tree byte-for-byte unchanged', async () => {
    const sketches = join(root, '.planning', 'sketches');
    const before = await listTree(sketches);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const res = await request(`${base()}/001-alpha/index.html`, {
        method,
        body: method === 'DELETE' || method === 'OPTIONS' ? undefined : 'x',
      });
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('GET, HEAD');
      expect(res.headers.get('content-security-policy')).toBe(CSP);
    }
    expect(await listTree(sketches)).toEqual(before);
  });
});

describe.each(SERVED)('the sketch tools panel through the $name', ({ base, request }) => {
  it('folds the panel in served HTML and leaves the file on disk unchanged', async () => {
    const res = await request(`${base()}/001-alpha/tools.html`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(withSketchToolsStyle(TOOLS_HTML));
    const onDisk = await readFile(join(root, '.planning', 'sketches', '001-alpha', 'tools.html'), 'utf8');
    expect(onDisk).toBe(TOOLS_HTML);
  });
});

describe('withSketchToolsStyle', () => {
  it('puts the style before </head>, or first when there is no head, and skips HTML without the panel', () => {
    expect(withSketchToolsStyle(TOOLS_HTML)).toBe(TOOLS_HTML.replace('</head>', `${SKETCH_TOOLS_STYLE}</head>`));
    expect(withSketchToolsStyle('<div id="sketch-tools"></div>')).toBe(`${SKETCH_TOOLS_STYLE}<div id="sketch-tools"></div>`);
    expect(withSketchToolsStyle('<p>plain</p>')).toBe('<p>plain</p>');
  });
});

describe('routesToApp', () => {
  it('sends /api/ URLs to the app and nothing else, sketch addresses included', () => {
    expect(routesToApp('/api/x')).toBe(true);
    expect(routesToApp(`/api/projects/shapes${SKETCH_FILES_SEGMENT}001-alpha/?v=1`)).toBe(true);
    for (const url of ['/', '/sketches', '/sketches/', '/sketches/001-alpha/', '/shapes/sketches', '/sketches?view=a', '/sketchesx']) {
      expect(routesToApp(url)).toBe(false);
    }
    expect(routesToApp(undefined)).toBe(false);
  });
});

const PREFIX = `/api/projects/shapes${SKETCH_FILES_SEGMENT}`;

describe('sketchRequestPath / sketchContentType', () => {
  it('maps a directory URL to its index.html', () => {
    expect(sketchRequestPath(`${PREFIX}001-alpha/`, PREFIX)).toEqual({
      ok: true,
      relPath: '.planning/sketches/001-alpha/index.html',
      directoryRequest: true,
    });
    expect(sketchRequestPath(`${PREFIX}001-alpha/a%20b.css`, PREFIX)).toEqual({
      ok: true,
      relPath: '.planning/sketches/001-alpha/a b.css',
      directoryRequest: false,
    });
  });

  it('refuses unsafe segments', () => {
    expect(sketchRequestPath(`${PREFIX}a/..%2Fb`, PREFIX)).toMatchObject({ ok: false, status: 403 });
    expect(sketchRequestPath(`${PREFIX}a/.x`, PREFIX)).toMatchObject({ ok: false, status: 403 });
    expect(sketchRequestPath(`${PREFIX}a//b`, PREFIX)).toMatchObject({ ok: false, status: 403 });
  });

  it('is a 404 for a pathname outside the given prefix', () => {
    expect(sketchRequestPath('/sketches/001-alpha/', PREFIX)).toEqual({ ok: false, status: 404 });
    expect(sketchRequestPath('/api/projects/other/sketch-files/001-alpha/', PREFIX)).toEqual({ ok: false, status: 404 });
  });

  it('knows the extension map and falls back to octet-stream', () => {
    expect(sketchContentType('A.HTML')).toBe('text/html; charset=utf-8');
    expect(sketchContentType('x.woff')).toBe('font/woff');
    expect(sketchContentType('x')).toBe('application/octet-stream');
  });
});

describe('readBytesWithin', () => {
  it('local: rejects with PathEscapeError for each leak symlink', async () => {
    const fs = new LocalFsPlanningFilesystem(root);
    for (const leak of ['leak-state.md', 'leak-root.txt', 'leak-outside.txt']) {
      await expect(
        fs.readBytesWithin('.planning/sketches', `.planning/sketches/001-alpha/${leak}`),
      ).rejects.toBeInstanceOf(PathEscapeError);
    }
  });

  it('local: EISDIR for a directory and ENOENT for a missing file', async () => {
    const fs = new LocalFsPlanningFilesystem(root);
    await expect(fs.readBytesWithin('.planning/sketches', '.planning/sketches/001-alpha')).rejects.toMatchObject({
      code: 'EISDIR',
    });
    await expect(fs.readBytesWithin('.planning/sketches', '.planning/sketches/nope.txt')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('local: reads the raw bytes of an inside file', async () => {
    const fs = new LocalFsPlanningFilesystem(root);
    const read = await fs.readBytesWithin('.planning/sketches', '.planning/sketches/themes/fonts/a.woff2');
    expect(Array.from(read.bytes)).toEqual(Array.from(WOFF2_BYTES));
    expect(read.size).toBe(WOFF2_BYTES.length);
  });

  it('local: rejects when the base itself is a symlink pointing outside the root', async () => {
    const otherRoot = await realpath(await mkdtemp(join(tmpdir(), 'labelore-sketches-base-')));
    try {
      await mkdir(join(otherRoot, '.planning'), { recursive: true });
      await symlink(outsideDir, join(otherRoot, '.planning', 'sketches'));
      const fs = new LocalFsPlanningFilesystem(otherRoot);
      await expect(
        fs.readBytesWithin('.planning/sketches', '.planning/sketches/anything.txt'),
      ).rejects.toBeInstanceOf(PathEscapeError);
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });

  it('in-memory: UTF-8 bytes inside, PathEscapeError outside, EISDIR for a prefix', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/sketches/001-a/index.html': 'héllo',
      '.planning/STATE.md': 'state',
    });
    const read = await fs.readBytesWithin('.planning/sketches', '.planning/sketches/001-a/index.html');
    expect(Buffer.from(read.bytes).toString('utf8')).toBe('héllo');
    await expect(fs.readBytesWithin('.planning/sketches', '.planning/STATE.md')).rejects.toBeInstanceOf(
      PathEscapeError,
    );
    await expect(
      fs.readBytesWithin('.planning/sketches', '.planning/sketches/001-a/../../STATE.md'),
    ).rejects.toBeInstanceOf(PathEscapeError);
    await expect(fs.readBytesWithin('.planning/sketches', '.planning/sketches/001-a')).rejects.toMatchObject({
      code: 'EISDIR',
    });
    await expect(fs.readBytesWithin('.planning/sketches', '.planning/sketches/001-a/x.js')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});

describe('GET /api/sketches', () => {
  it('lists the manifest rows and folders, and every view URL is served', async () => {
    const manifest = [
      '# Sketch Manifest',
      '',
      '## Sketches',
      '',
      '| # | Name | Design Question | Winner | Tags |',
      '|---|------|-----------------|--------|------|',
      '| 001 | alpha | Which alpha? | A — first | one, two |',
      '| 009 | ghost | No folder here | | |',
      '',
    ].join('\n');
    await writeFile(join(root, '.planning', 'sketches', 'MANIFEST.md'), manifest);
    const fresh = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    await fresh.load();
    const freshApp = createApp(fresh, true, staticRoot);

    const res = await freshApp.request('/api/sketches');
    expect(res.status).toBe(200);
    const model = (await res.json()) as {
      available: boolean;
      sketches: { number: string; viewUrl: string | null; readmeUrl: string | null; tags: string[] }[];
    };
    expect(model.available).toBe(true);
    expect(model.sketches.map((s) => s.number)).toEqual(['009', '001']);
    expect(model.sketches[1].tags).toEqual(['one', 'two']);
    expect(model.sketches[0].viewUrl).toBeNull();

    for (const sketch of model.sketches) {
      if (!sketch.viewUrl) continue;
      // The view URL is project-relative: the web prefixes the project's API base.
      expect(sketch.viewUrl.startsWith('/sketch-files/')).toBe(true);
      expect((await freshApp.request(`/api${sketch.viewUrl}`)).status).toBe(200);
    }

    const readmeUrl = model.sketches[1].readmeUrl ?? '';
    const doc = await freshApp.request(`/api/documents?route=${encodeURIComponent(readmeUrl)}`);
    expect(doc.status).toBe(200);
    const body = (await doc.json()) as { found: boolean; artifact: { title: string } };
    expect(body.found).toBe(true);
    expect(body.artifact.title.length).toBeGreaterThan(0);
  });

  it('answers available:false for a project without sketches', async () => {
    const dense = new PlanningRepository(new LocalFsPlanningFilesystem(join(FIXTURES, 'dense')), join(FIXTURES, 'dense'));
    await dense.load();
    const res = await createApp(dense, true, staticRoot).request('/api/sketches');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ available: false, sketches: [] });
  });
});
