// Pins the read-only raw-text route (Phase 12: SRC-02, D-01, D-06, D-08): GET /api/source?route=<a text
// artifact's readable URL> serves the file as written (frontmatter lines included), resolved through the route
// table of one bundle. config.json is served only from its handler's already-masked body and never read from
// disk; the frontmatter of a user-setup, seed or thread file passes through the same mask its handler uses.
// Real cases run over the committed Lendshed fixture; masking and refusal cases use in-memory projects with
// made-up values.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import type { PlanningFilesystem } from '../../src/planning-fs/types.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { VALUE_NOT_SHOWN_MARK } from '../../src/planning-repo/handlers/withhold-values.ts';
import { createApp } from '../../src/server/index.ts';
import { bodyStartOf, sourceTextOf, FRONTMATTER_MASK_BY_KIND } from '../../src/server/source-text.ts';
import type { SourceTextResponse } from '../../src/server/source-text.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { FX_ROOT, loadFixtureProject } from '../helpers/fixture-project.ts';

/** Wraps a filesystem and records every read() path, so a refusal can be shown to have read nothing. */
class ReadSpyFs implements PlanningFilesystem {
  readonly capabilities;
  readonly reads: string[] = [];
  constructor(private readonly inner: PlanningFilesystem) {
    this.capabilities = inner.capabilities;
  }
  list(relDir: string) {
    return this.inner.list(relDir);
  }
  read(relPath: string) {
    this.reads.push(relPath);
    return this.inner.read(relPath);
  }
  exists(relPath: string) {
    return this.inner.exists(relPath);
  }
  readHead(relPath: string, maxBytes: number) {
    return this.inner.readHead!(relPath, maxBytes);
  }
  readBytesWithin(baseRelDir: string, relPath: string) {
    return this.inner.readBytesWithin!(baseRelDir, relPath);
  }
}

type App = ReturnType<typeof createApp>;

async function presentationOf(app: App): Promise<ProjectPresentation> {
  return (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
}
async function keyOf(app: App, path: string): Promise<string> {
  const artifact = (await presentationOf(app)).artifacts.find((candidate) => candidate.path === path);
  if (!artifact) throw new Error(`No artifact at ${path}`);
  return artifact.key;
}
const sourceUrl = (key: string): string => `/api/source?route=${encodeURIComponent(key)}`;

async function appOver(fs: PlanningFilesystem, root: string): Promise<{ app: App; spy: ReadSpyFs }> {
  const spy = new ReadSpyFs(fs);
  const repo = new PlanningRepository(spy, root);
  await repo.load();
  spy.reads.length = 0;
  return { app: createApp(repo, true, '.'), spy };
}

const lendshed = await appOver(new LocalFsPlanningFilesystem(FX_ROOT), FX_ROOT);
const lendshedProject = await loadFixtureProject();

describe('GET /api/source?route= over the Lendshed fixture', () => {
  it('serves a plan file byte for byte, with the body offset and nothing masked', async () => {
    const path = '.planning/phases/01-member-sign-in-sessions/01-06-PLAN.md';
    const res = await lendshed.app.request(sourceUrl(await keyOf(lendshed.app, path)));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SourceTextResponse;
    const onDisk = await readFile(`${FX_ROOT}/${path}`, 'utf8');
    expect(body.text).toBe(onDisk);
    expect(body.masked).toBe(false);
    const artifactBody = lendshedProject.bodyOf(path);
    expect(artifactBody).toBeTruthy();
    expect(body.bodyStart).toBeGreaterThan(0);
    expect(body.text.slice(body.bodyStart)).toBe(artifactBody);
  });

  it('serves the settings file from its handler body without reading it from disk', async () => {
    lendshed.spy.reads.length = 0;
    const res = await lendshed.app.request(sourceUrl(await keyOf(lendshed.app, '.planning/config.json')));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SourceTextResponse;
    expect(body.text).toBe(lendshedProject.bodyOf('.planning/config.json'));
    expect(body.masked).toBe(true);
    expect(lendshed.spy.reads.filter((path) => path.endsWith('config.json'))).toEqual([]);
  });

  it('serves the settings page by its /settings address too', async () => {
    const res = await lendshed.app.request(sourceUrl('/settings'));
    expect(res.status).toBe(200);
    expect(((await res.json()) as SourceTextResponse).text).toBe(lendshedProject.bodyOf('.planning/config.json'));
  });

  it('answers HEAD with 200 and no body, and any other method with 405', async () => {
    const url = sourceUrl(await keyOf(lendshed.app, '.planning/PROJECT.md'));
    const head = await lendshed.app.request(url, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    const post = await lendshed.app.request(url, { method: 'POST' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
  });
});

const PROJECT = '# Project\n\nA made-up project.\n';
const PLANTED_SEARCH_VALUE = 'BSA-madeup-0123456789abcdef';
const PLANTED_PASSWORD = 'madeup-hunter2-value';

const memoryFiles: Record<string, string | Uint8Array> = {
  '.planning/PROJECT.md': PROJECT,
  '.planning/config.json': `{\n  "mode": "interactive",\n  "brave_search": "${PLANTED_SEARCH_VALUE}"\n}\n`,
  '.planning/phases/01-first/01-USER-SETUP.md': `---\nphase: 01-first\nDB_PASSWORD: ${PLANTED_PASSWORD}\nservice: Made-up mail\n---\n\n# Phase 1: User Setup Required\n\n**Status:** Incomplete\n`,
  '.planning/phases/01-first/01-01-PLAN.md': '---\nphase: 01-first\nplan: 01\n---\n\n# Plan\n',
  '.planning/notes/blob.bin': Uint8Array.from([0, 1, 2, 3, 0, 0, 255, 254, 0, 1]),
};

const memory = await appOver(new InMemoryPlanningFilesystem(memoryFiles), '/project');

describe('GET /api/source?route= over a made-up in-memory project', () => {
  it('never puts a planted settings secret in the response', async () => {
    const res = await memory.app.request(sourceUrl(await keyOf(memory.app, '.planning/config.json')));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(PLANTED_SEARCH_VALUE);
    expect((JSON.parse(text) as SourceTextResponse).masked).toBe(true);
  });

  it('masks a user-setup frontmatter value and keeps the line count', async () => {
    const path = '.planning/phases/01-first/01-USER-SETUP.md';
    const res = await memory.app.request(sourceUrl(await keyOf(memory.app, path)));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SourceTextResponse;
    const raw = String(memoryFiles[path]);
    expect(body.text).not.toContain(PLANTED_PASSWORD);
    expect(body.text).toContain(VALUE_NOT_SHOWN_MARK);
    expect(body.masked).toBe(true);
    expect(body.text.split('\n').length).toBe(raw.split('\n').length);
    expect(body.text).toContain('phase: 01-first');
  });

  it('answers the same plain 404 for a binary, an internal file and a missing address, reading nothing', async () => {
    memory.spy.reads.length = 0;
    const routes = [
      await keyOf(memory.app, '.planning/notes/blob.bin'),
      '/file/state.json',
      '/notes/no-such.md',
      '/roadmap',
      '%E0%A4%A',
      '',
    ];
    const bodies = new Set<string>();
    for (const route of routes) {
      const res = await memory.app.request(sourceUrl(route));
      expect(res.status, route).toBe(404);
      bodies.add(await res.text());
    }
    const missing = await memory.app.request('/api/source');
    expect(missing.status).toBe(404);
    bodies.add(await missing.text());
    expect([...bodies]).toEqual(['Not found']);
    expect(memory.spy.reads).toEqual([]);
  });
});

describe('sourceTextOf', () => {
  it('returns config.json from its body and ignores the raw text', () => {
    const out = sourceTextOf({ kind: 'config', path: '.planning/config.json', body: '{"a":"****cdef"}\n' }, 'RAW SECRET');
    expect(out).toEqual({ text: '{"a":"****cdef"}\n', masked: true });
  });

  it('returns a plain file unchanged', () => {
    const raw = '---\nphase: 1\n---\nbody\n';
    expect(sourceTextOf({ kind: 'plan', path: '.planning/phases/01/01-01-PLAN.md', body: 'body\n' }, raw)).toEqual({
      text: raw,
      masked: false,
    });
  });

  it('masks only the frontmatter lines of a masking kind and leaves the body as written', () => {
    const raw = `---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n`;
    const out = sourceTextOf({ kind: 'user-setup', path: '.planning/phases/01/01-USER-SETUP.md', body: '' }, raw);
    const lines = out.text.split('\n');
    expect(lines[1]).not.toContain(PLANTED_PASSWORD);
    expect(lines[3]).toContain(PLANTED_PASSWORD);
    expect(lines.length).toBe(raw.split('\n').length);
    expect(out.masked).toBe(true);
  });

  it('reads a text with no opening fence as having no frontmatter', () => {
    const raw = `DB_PASSWORD: ${PLANTED_PASSWORD}\n`;
    expect(sourceTextOf({ kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: raw }, raw)).toEqual({
      text: raw,
      masked: false,
    });
  });

  it('keeps carriage returns on the lines it masks', () => {
    const raw = `---\r\nDB_PASSWORD: ${PLANTED_PASSWORD}\r\n---\r\nbody\r\n`;
    const out = sourceTextOf({ kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: 'body\r\n' }, raw);
    expect(out.text.split('\n')[1]?.endsWith('\r')).toBe(true);
    expect(out.text).not.toContain(PLANTED_PASSWORD);
  });

  it('names the three masking kinds', () => {
    expect([...FRONTMATTER_MASK_BY_KIND.keys()].sort()).toEqual(['seed', 'thread', 'user-setup']);
  });
});

describe('bodyStartOf', () => {
  it('finds the body at the tail, else the first match, else 0', () => {
    expect(bodyStartOf('---\na: 1\n---\nbody\n', 'body\n')).toBe(13);
    expect(bodyStartOf('xx body yy', 'body')).toBe(3);
    expect(bodyStartOf('abc', 'zzz')).toBe(0);
    expect(bodyStartOf('abc', '')).toBe(3);
  });
});
