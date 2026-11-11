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
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import { VALUE_NOT_SHOWN_MARK, maskData } from '../../src/planning-repo/handlers/withhold-values.ts';
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

/** The frontmatter a masking handler would carry for `raw`: parsed, then masked with the kind's own options. */
function handlerFrontmatter(kind: string, raw: string): Record<string, unknown> {
  const options = FRONTMATTER_MASK_BY_KIND.get(kind) ?? {};
  return maskData(tryParseFrontmatter(raw).data, 0, options) as Record<string, unknown>;
}

describe('sourceTextOf', () => {
  it('returns config.json from its body and ignores the raw text', () => {
    const out = sourceTextOf({ kind: 'config', path: '.planning/config.json', body: '{"a":"****cdef"}\n', frontmatter: {} }, 'RAW SECRET');
    expect(out).toEqual({ text: '{"a":"****cdef"}\n', masked: true });
  });

  it('returns a plain file unchanged', () => {
    const raw = '---\nphase: 1\n---\nbody\n';
    expect(sourceTextOf({ kind: 'plan', path: '.planning/phases/01/01-01-PLAN.md', body: 'body\n', frontmatter: {} }, raw)).toEqual({
      text: raw,
      masked: false,
    });
  });

  it('masks only the frontmatter lines of a masking kind and leaves the body as written', () => {
    const raw = `---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n`;
    const out = sourceTextOf(
      { kind: 'user-setup', path: '.planning/phases/01/01-USER-SETUP.md', body: '', frontmatter: handlerFrontmatter('user-setup', raw) },
      raw,
    );
    const lines = out.text.split('\n');
    expect(lines[1]).not.toContain(PLANTED_PASSWORD);
    expect(lines[3]).toContain(PLANTED_PASSWORD);
    expect(lines.length).toBe(raw.split('\n').length);
    expect(out.masked).toBe(true);
  });

  it('reads a text with no opening fence as having no frontmatter', () => {
    const raw = `DB_PASSWORD: ${PLANTED_PASSWORD}\n`;
    expect(sourceTextOf({ kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: raw, frontmatter: {} }, raw)).toEqual({
      text: raw,
      masked: false,
    });
  });

  it('keeps carriage returns on the lines it masks', () => {
    const raw = `---\r\nDB_PASSWORD: ${PLANTED_PASSWORD}\r\n---\r\nbody\r\n`;
    const out = sourceTextOf(
      { kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: 'body\r\n', frontmatter: handlerFrontmatter('user-setup', raw) },
      raw,
    );
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

// ---------------------------------------------------------------------------------------------------------------
// 12-06 (T-12-17): every frontmatter shape a masking handler withholds stays out of /source.
// ---------------------------------------------------------------------------------------------------------------

const PLANTED = {
  inline: 'madeup-inline-pw-1111',
  nextLine: 'madeup-nextline-tok-2222',
  literal: 'madeup-block-literal-3333',
  literalSecond: 'madeup-block-second-4444',
  folded: 'madeup-block-folded-5555',
  foldedList: 'madeup-folded-in-list-6666',
};

const USER_SETUP_PATH = '.planning/phases/01-first/01-USER-SETUP.md';
const SEED_PATH = '.planning/seeds/SEED-001-cache.md';
const THREAD_PATH = '.planning/threads/cache-thread.md';

const shapeFiles: Record<string, string> = {
  '.planning/PROJECT.md': PROJECT,
  [USER_SETUP_PATH]: [
    '---',
    'phase: 01-first',
    `DB_PASSWORD: ${PLANTED.inline}`,
    'API_TOKEN:',
    `  ${PLANTED.nextLine}`,
    'SMTP_PASS: |',
    `  ${PLANTED.literal}`,
    `  ${PLANTED.literalSecond}`,
    'WEBHOOK_SECRET: >-',
    `  ${PLANTED.folded}`,
    'service: Made-up mail',
    '---',
    '',
    '# Phase 1: User Setup Required',
    '',
  ].join('\n'),
  [SEED_PATH]: [
    '---',
    'title: Cache the lookups',
    'NOTE: revisit the cache later',
    `STRIPE_KEY: ${PLANTED.inline}`,
    'API_TOKEN:',
    `  ${PLANTED.nextLine}`,
    'DB_PASS: |',
    `  ${PLANTED.literal}`,
    '---',
    '',
    '# Seed',
    '',
  ].join('\n'),
  [THREAD_PATH]: [
    '---',
    'title: Cache thread',
    'status: open',
    `AUTH_TOKEN: ${PLANTED.inline}`,
    'CLIENT_SECRET: >',
    `  ${PLANTED.folded}`,
    '---',
    '',
    '# Thread',
    '',
  ].join('\n'),
};

const shapes = await appOver(new InMemoryPlanningFilesystem(shapeFiles), '/project');

async function sourceOf(app: App, path: string): Promise<{ raw: string; body: SourceTextResponse }> {
  const res = await app.request(sourceUrl(await keyOf(app, path)));
  expect(res.status).toBe(200);
  const raw = await res.text();
  return { raw, body: JSON.parse(raw) as SourceTextResponse };
}

describe('GET /api/source?route= never serves a frontmatter value a masking handler withholds (T-12-17)', () => {
  it('a user-setup file with an inline, next-line, literal and folded value serves none of them', async () => {
    const { raw, body } = await sourceOf(shapes.app, USER_SETUP_PATH);
    for (const value of Object.values(PLANTED)) expect(raw, value).not.toContain(value);
    expect(body.masked).toBe(true);
    expect(body.text.split('\n').length).toBe(shapeFiles[USER_SETUP_PATH]!.split('\n').length);
    expect(body.text).toContain('service: Made-up mail');
    expect(body.text).toContain('phase: 01-first');
    expect(body.text).toContain('# Phase 1: User Setup Required');
  });

  it('a seed keeps its NOTE: line and loses every secret-named value', async () => {
    const { raw, body } = await sourceOf(shapes.app, SEED_PATH);
    for (const value of Object.values(PLANTED)) expect(raw, value).not.toContain(value);
    expect(body.text).toContain('NOTE: revisit the cache later');
    expect(body.text.split('\n').length).toBe(shapeFiles[SEED_PATH]!.split('\n').length);
  });

  it('a thread loses an inline and a folded secret and keeps its status line', async () => {
    const { raw, body } = await sourceOf(shapes.app, THREAD_PATH);
    for (const value of Object.values(PLANTED)) expect(raw, value).not.toContain(value);
    expect(body.text).toContain('status: open');
  });

  it('serves the frontmatter lines as indentation plus the marker when a withheld value survives the line mask', () => {
    const raw = [
      '---',
      'phase: 01-first',
      'notes:',
      '  - >-',
      '    remember DB_PASSWORD',
      `    = ${PLANTED.foldedList}`,
      '---',
      'body line',
      '',
    ].join('\n');
    const frontmatter = handlerFrontmatter('user-setup', raw);
    // The folded string reads "remember DB_PASSWORD = <value>": the handler masks it, the line mask cannot see it.
    expect(JSON.stringify(frontmatter)).not.toContain(PLANTED.foldedList);
    const out = sourceTextOf({ kind: 'user-setup', path: USER_SETUP_PATH, body: 'body line\n', frontmatter }, raw);
    expect(out.text).not.toContain(PLANTED.foldedList);
    expect(out.masked).toBe(true);
    const lines = out.text.split('\n');
    expect(lines.length).toBe(raw.split('\n').length);
    expect(lines.slice(1, 6)).toEqual([
      VALUE_NOT_SHOWN_MARK,
      VALUE_NOT_SHOWN_MARK,
      `  ${VALUE_NOT_SHOWN_MARK}`,
      `    ${VALUE_NOT_SHOWN_MARK}`,
      `    ${VALUE_NOT_SHOWN_MARK}`,
    ]);
    expect(lines[0]).toBe('---');
    expect(lines[6]).toBe('---');
    expect(lines[7]).toBe('body line');
  });

  it('does not fail closed for a file whose frontmatter the line mask covers', () => {
    const raw = `---\nDB_PASSWORD: ${PLANTED.inline}\nservice: Made-up mail\n---\nbody\n`;
    const out = sourceTextOf(
      { kind: 'user-setup', path: USER_SETUP_PATH, body: 'body\n', frontmatter: handlerFrontmatter('user-setup', raw) },
      raw,
    );
    expect(out.text).toContain('service: Made-up mail');
  });
});
