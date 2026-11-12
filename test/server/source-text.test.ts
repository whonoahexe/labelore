// Pins the read-only raw-text route (Phase 12: SRC-02, D-01, D-06, D-08): GET /api/source?route=<a text
// artifact's readable URL> serves the file as written (frontmatter lines included), resolved through the route
// table of one bundle. config.json is served only from its handler's already-masked body and never read from
// disk; the frontmatter of a user-setup, seed or thread file passes through the same mask its handler uses.
// Real cases run over the committed Lendshed fixture; masking and refusal cases use in-memory projects with
// made-up values.
import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PathEscapeError } from '../../src/planning-fs/types.ts';
import type { FileRead, PlanningFilesystem } from '../../src/planning-fs/types.ts';
import type { Artifact, Project } from '../../src/domain/model.ts';
import { MAX_TEXT_BYTES } from '../../src/planning-repo/file-class.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
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

const WORKSTREAM_SECRET = 'sk-madeup-workstream-1234567';
memoryFiles['.planning/workstreams/alpha/config.json'] = `{\n  "brave_search": "${WORKSTREAM_SECRET}"\n}\n`;
memoryFiles['.planning/codebase/config.json'] = `{\n  "firecrawl": "${WORKSTREAM_SECRET}"\n}\n`;

const memory = await appOver(new InMemoryPlanningFilesystem(memoryFiles), '/project');

describe('GET /api/source?route= over a made-up in-memory project', () => {
  it('never puts a planted settings secret in the response', async () => {
    const res = await memory.app.request(sourceUrl(await keyOf(memory.app, '.planning/config.json')));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(PLANTED_SEARCH_VALUE);
    expect((JSON.parse(text) as SourceTextResponse).masked).toBe(true);
  });

  it.each(['.planning/workstreams/alpha/config.json', '.planning/codebase/config.json'])(
    'masks a secret in a config.json that is not the root one (%s)',
    async (path) => {
      const res = await memory.app.request(sourceUrl(await keyOf(memory.app, path)));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).not.toContain(WORKSTREAM_SECRET);
      expect(text).toContain('****4567');
    },
  );

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

  it('masks the frontmatter of a file that starts with a byte-order mark', () => {
    const raw = `\uFEFF---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n---\nbody\n`;
    const out = sourceTextOf(
      { kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: 'body\n', frontmatter: handlerFrontmatter('user-setup', raw) },
      raw,
    );
    expect(out.text).not.toContain(PLANTED_PASSWORD);
    expect(out.text.startsWith('\uFEFF---\n')).toBe(true);
    expect(out.text.split('\n').length).toBe(raw.split('\n').length);
    expect(out.masked).toBe(true);
  });

  it('masks the frontmatter of a byte-order-marked file with carriage returns', () => {
    const raw = `\uFEFF---\r\nDB_PASSWORD: ${PLANTED_PASSWORD}\r\n---\r\nbody\r\n`;
    const out = sourceTextOf(
      { kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: 'body\r\n', frontmatter: handlerFrontmatter('user-setup', raw) },
      raw,
    );
    expect(out.text).not.toContain(PLANTED_PASSWORD);
    expect(out.text.split('\n')[1]?.endsWith('\r')).toBe(true);
    expect(out.masked).toBe(true);
  });

  it('fails closed when the handler found frontmatter that the fence scan did not', () => {
    const raw = `--- \nDB_PASSWORD: ${PLANTED_PASSWORD}\n---\nbody\n`;
    const out = sourceTextOf(
      { kind: 'user-setup', path: 'x/01-USER-SETUP.md', body: 'body\n', frontmatter: { DB_PASSWORD: VALUE_NOT_SHOWN_MARK } },
      raw,
    );
    expect(out.text).not.toContain(PLANTED_PASSWORD);
    expect(out.text.endsWith('body\n')).toBe(true);
    expect(out.text.split('\n').length).toBe(raw.split('\n').length);
    expect(out.masked).toBe(true);
  });

  it('names the three masking kinds', () => {
    expect([...FRONTMATTER_MASK_BY_KIND.keys()].sort()).toEqual(['seed', 'thread', 'user-setup']);
  });
});

const AUDIT_PIN = '98765432';
const auditFiles: Record<string, string> = {
  '.planning/PROJECT.md': PROJECT,
  // A quick-named user-setup file under milestones/ but outside a vX.Y-quick folder: the user-setup handler parses
  // it while its wire kind is `unknown`.
  '.planning/milestones/260101-abc-USER-SETUP.md': `---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n---\n\n# User Setup\n`,
  '.planning/milestones/archive/260101-abd/260101-abd-USER-SETUP.md': `---\nDB_PASSWORD: ${PLANTED_PASSWORD}\n---\n\n# User Setup\n`,
  // CR-only line endings.
  '.planning/phases/01-first/01-USER-SETUP.md': `---\rDB_PASSWORD: ${PLANTED_PASSWORD}\r---\rbody\r`,
  // A number after a spaced colon, which the line mask does not read as an assignment.
  '.planning/phases/02-second/02-USER-SETUP.md': `---\nDB_PIN : ${AUDIT_PIN}\n---\n\n# User Setup\n`,
};
const audit = await appOver(new InMemoryPlanningFilesystem(auditFiles), '/project');

describe('GET /api/source?route= masks what the parsing handler masks (T-12-02, T-12-17 audit)', () => {
  it.each([
    '.planning/milestones/260101-abc-USER-SETUP.md',
    '.planning/milestones/archive/260101-abd/260101-abd-USER-SETUP.md',
    '.planning/phases/01-first/01-USER-SETUP.md',
  ])('serves no planted password for %s', async (path) => {
    const res = await audit.app.request(sourceUrl(await keyOf(audit.app, path)));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SourceTextResponse;
    expect(body.text).not.toContain(PLANTED_PASSWORD);
    expect(body.masked).toBe(true);
  });

  it('serves no withheld number after a spaced colon', async () => {
    const res = await audit.app.request(sourceUrl(await keyOf(audit.app, '.planning/phases/02-second/02-USER-SETUP.md')));
    const body = (await res.json()) as SourceTextResponse;
    expect(body.text).not.toContain(AUDIT_PIN);
    expect(body.masked).toBe(true);
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

  it('serves a list under a variable-name key, indented or at the key column, as the marker (WR-03)', () => {
    const raw = `---\nSTRIPE_KEYS:\n  - ${PLANTED.inline}\nOTHER_KEYS:\n- ${PLANTED.nextLine}\nservice: Made-up mail\n---\nbody\n`;
    const frontmatter = handlerFrontmatter('user-setup', raw);
    expect(JSON.stringify(frontmatter)).not.toContain(PLANTED.inline);
    expect(JSON.stringify(frontmatter)).not.toContain(PLANTED.nextLine);
    const out = sourceTextOf({ kind: 'user-setup', path: USER_SETUP_PATH, body: 'body\n', frontmatter }, raw);
    expect(out.text).not.toContain(PLANTED.inline);
    expect(out.text).not.toContain(PLANTED.nextLine);
    expect(out.text).toContain('service: Made-up mail');
    expect(out.text.split('\n').length).toBe(raw.split('\n').length);
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

// ---------------------------------------------------------------------------------------------------------------
// 12-06 Task 2 (T-12-18, T-12-19, T-12-20, T-12-21): parse errors by position only, the byte cap, one bundle per
// request, the uniform answers and the handler drift contract.
// ---------------------------------------------------------------------------------------------------------------

const REASONS = ['unexpected-end', 'unexpected-character', 'expected-value', 'not-valid'];
const PARSER_WORDING = /is not valid JSON|Unexpected token|Unexpected end of JSON|in JSON at position|Expected property name/;
const BRAVE_VALUE = 'BSA-madeup-0123456789abcdef';

async function configApp(config: string) {
  return appOver(new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': PROJECT, '.planning/config.json': config }), '/project');
}

/** The response with the served `text` taken out: nothing else may carry the file's content or a parser message. */
function withoutText(body: SourceTextResponse): string {
  return JSON.stringify({ ...body, text: '' });
}

describe('parseError: a .json file that does not parse is located by position only (T-12-18)', () => {
  it('gives a numeric line and column and a closed-set reason for {"mode": }, and no parser wording', async () => {
    const { app } = await configApp('{\n  "mode": }\n');
    const { body } = await sourceOf(app, '.planning/config.json');
    expect(body.parseError).not.toBeNull();
    expect(Object.keys(body.parseError!).sort()).toEqual(['column', 'line', 'reason']);
    expect(body.parseError).toEqual({ line: 2, column: 11, reason: expect.any(String) });
    expect(REASONS).toContain(body.parseError!.reason);
    expect(['unexpected-character', 'expected-value']).toContain(body.parseError!.reason);
    expect(withoutText(body)).not.toMatch(PARSER_WORDING);
    expect(withoutText(body)).not.toContain('"mode"');
  });

  it('uses the position the parser reports when it gives one', async () => {
    const { app } = await configApp('{\n  "a": 1\n  "b": 2\n}\n');
    const { body } = await sourceOf(app, '.planning/config.json');
    expect(body.parseError).toEqual({ line: 3, column: 3, reason: 'expected-value' });
    expect(withoutText(body)).not.toMatch(PARSER_WORDING);
  });

  it('reports a file that ends inside a value as unexpected-end', async () => {
    const { app } = await configApp('{\n  "a": [1, 2\n');
    const { body } = await sourceOf(app, '.planning/config.json');
    expect(body.parseError?.reason).toBe('unexpected-end');
    expect(body.parseError?.line).toEqual(expect.any(Number));
  });

  it('gives a parse error for single quotes and still serves the secret redacted', async () => {
    const { app } = await configApp(`{\n  'mode': 'interactive',\n  'brave_search': '${BRAVE_VALUE}'\n}\n`);
    const { raw, body } = await sourceOf(app, '.planning/config.json');
    expect(body.parseError).not.toBeNull();
    expect(REASONS).toContain(body.parseError!.reason);
    expect(raw).not.toContain(BRAVE_VALUE);
    expect(withoutText(body)).not.toMatch(PARSER_WORDING);
  });

  it('gives no parse error for a parsing .json file or for a markdown file', async () => {
    const { app } = await configApp(`{\n  "mode": "interactive",\n  "brave_search": "${BRAVE_VALUE}"\n}\n`);
    expect((await sourceOf(app, '.planning/config.json')).body.parseError).toBeNull();
    expect((await sourceOf(app, '.planning/PROJECT.md')).body.parseError).toBeNull();
  });

  it('counts columns in UTF-16 code units and lines between newline characters', async () => {
    const { app } = await configApp('{\n  "é😀": }\n');
    const { body } = await sourceOf(app, '.planning/config.json');
    // Nine UTF-16 units come before the brace: two spaces, the quoted name (five, the emoji counting two), a colon, a space.
    expect(body.parseError).toEqual({ line: 2, column: 10, reason: expect.any(String) });
  });
});

describe('a masked config.json keeps its layout as written in Source (D-01, T-12-34)', () => {
  it('serves the file with the same lines and the secret masked in place', async () => {
    const config = [
      '{',
      '    "mode": "interactive",',
      '    "granularity": "standard",',
      '    "commit_docs": true,',
      '    "parallelization": true,',
      '    "exa_search": false,',
      `    "brave_search": "${BRAVE_VALUE}",`,
      '    "workflow": { "research": true }',
      '}',
      '',
    ].join('\n');
    const { app } = await configApp(config);
    const { raw, body } = await sourceOf(app, '.planning/config.json');
    expect(raw).not.toContain(BRAVE_VALUE);
    expect(body.masked).toBe(true);
    expect(body.parseError).toBeNull();
    const lines = body.text.split('\n');
    expect(lines).toHaveLength(config.split('\n').length);
    expect(lines[6]).toBe('    "brave_search": "****cdef",');
    expect(lines[7]).toBe('    "workflow": { "research": true }');
  });

  it('serves the re-formatted masked JSON when the secret is nested and cannot be masked in place', async () => {
    const { app } = await configApp(`{"mode":"x","brave_search":{"token":"${BRAVE_VALUE}"}}`);
    const { raw, body } = await sourceOf(app, '.planning/config.json');
    expect(raw).not.toContain(BRAVE_VALUE);
    expect(body.text).toBe('{\n  "mode": "x",\n  "brave_search": {\n    "token": "****cdef"\n  }\n}\n');
  });
});

/** A hand-made project snapshot over one in-memory filesystem, for sizes, races and read errors. */
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
    name: 'Source Fixture',
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

/** An in-memory filesystem that records read() paths and lets a test hold or change a read. */
class ScriptFs implements PlanningFilesystem {
  readonly capabilities;
  readonly reads: string[] = [];
  constructor(
    private readonly inner: PlanningFilesystem,
    private readonly onRead?: (read: () => Promise<FileRead>) => Promise<FileRead>,
  ) {
    this.capabilities = inner.capabilities;
  }
  list(relDir: string) {
    return this.inner.list(relDir);
  }
  read(relPath: string): Promise<FileRead> {
    this.reads.push(relPath);
    const read = () => this.inner.read(relPath);
    return this.onRead ? this.onRead(read) : read();
  }
  exists(relPath: string) {
    return this.inner.exists(relPath);
  }
}

const NOTE_PATH = '.planning/notes/big.md';
const PROJECT_MD = makeArtifact({ path: '.planning/PROJECT.md', body: 'Project' });
const noteAt = (sizeBytes: number): Artifact => makeArtifact({ path: NOTE_PATH, kind: 'note', sizeBytes, body: 'x' });

function scriptedApp(artifacts: Artifact[], fs: ScriptFs | null) {
  const snapshot = makeSnapshot('2026-10-01T00:00:00.000Z', artifacts);
  return createApp({ getSnapshot: () => snapshot, ...(fs ? { planningFilesystem: () => fs } : {}) }, true, '.');
}

describe('the 1 MiB cap is measured in bytes (T-12-20)', () => {
  it('answers 413 for an indexed size above MAX_TEXT_BYTES before any read', async () => {
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: 'x' }));
    const app = scriptedApp([PROJECT_MD, noteAt(MAX_TEXT_BYTES + 1)], fs);
    const res = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    expect(res.status).toBe(413);
    expect(fs.reads).toEqual([]);
  });

  it('answers 413 for 600,000 two-byte characters although the string is shorter than the cap', async () => {
    const text = 'é'.repeat(600_000);
    expect(text.length).toBeLessThan(MAX_TEXT_BYTES);
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: text }));
    const app = scriptedApp([PROJECT_MD, noteAt(10)], fs);
    const res = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    expect(res.status).toBe(413);
    expect(fs.reads).toEqual([NOTE_PATH]);
  });

  it('serves a text of exactly MAX_TEXT_BYTES bytes', async () => {
    const text = 'a'.repeat(MAX_TEXT_BYTES);
    const app = scriptedApp([PROJECT_MD, noteAt(MAX_TEXT_BYTES)], new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: text })));
    const res = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    expect(res.status).toBe(200);
    expect(((await res.json()) as SourceTextResponse).text.length).toBe(MAX_TEXT_BYTES);
  });

  it('answers 413 when the file grew past the cap after indexing', async () => {
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: 'a'.repeat(MAX_TEXT_BYTES + 1) }));
    const app = scriptedApp([PROJECT_MD, noteAt(5)], fs);
    const res = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    expect(res.status).toBe(413);
  });
});

describe('uniform answers, methods and read errors', () => {
  const withCode = (code: string): Error => Object.assign(new Error(code), { code });

  it('answers a file removed after indexing with the same plain 404 as any other miss', async () => {
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({}));
    const app = scriptedApp([PROJECT_MD, noteAt(5)], fs);
    const removed = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    const unknown = await app.request(sourceUrl('/notes/no-such.md'));
    expect(removed.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await removed.text()).toBe(await unknown.text());
  });

  it('answers HEAD with 200 and no body for a text file, and POST, PUT and DELETE with 405 and Allow, reading nothing', async () => {
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: 'hello\n' }));
    const app = scriptedApp([PROJECT_MD, noteAt(6)], fs);
    const url = sourceUrl(await keyOf(app, NOTE_PATH));
    const head = await app.request(url, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    fs.reads.length = 0;
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = await app.request(url, { method });
      expect(res.status, method).toBe(405);
      expect(res.headers.get('allow')).toBe('GET, HEAD');
    }
    expect(fs.reads).toEqual([]);
  });

  it.each([
    ['ENOENT', withCode('ENOENT'), 404],
    ['EACCES', withCode('EACCES'), 403],
    ['PathEscapeError', new PathEscapeError(NOTE_PATH, '/elsewhere'), 403],
    ['anything else', new Error('boom'), 500],
  ])('maps a read rejected with %s to its status', async (_name, error, status) => {
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: 'x' }), () => Promise.reject(error));
    const app = scriptedApp([PROJECT_MD, noteAt(1)], fs);
    const res = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    expect(res.status).toBe(status);
    expect(await res.text()).not.toContain('boom');
  });

  it('answers 404 when the source has no filesystem', async () => {
    const app = scriptedApp([PROJECT_MD, noteAt(1)], null);
    const res = await app.request(sourceUrl(await keyOf(app, NOTE_PATH)));
    expect(res.status).toBe(404);
  });
});

describe('a request is answered from the one bundle it captured (T-12-21)', () => {
  it('a read held open across a refresh that drops the file still answers 200; the next request answers 404', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => (release = done));
    let entered!: () => void;
    const hasEntered = new Promise<void>((done) => (entered = done));
    const fs = new ScriptFs(new InMemoryPlanningFilesystem({ [NOTE_PATH]: 'held text\n' }), async (read) => {
      entered();
      await gate;
      return read();
    });
    let current = makeSnapshot('2026-10-01T00:00:00.000Z', [PROJECT_MD, noteAt(10)]);
    const after = makeSnapshot('2026-10-02T00:00:00.000Z', [PROJECT_MD]);
    const app = createApp(
      { getSnapshot: () => current, refresh: async () => (current = after), planningFilesystem: () => fs },
      true,
      '.',
    );
    const url = sourceUrl(await keyOf(app, NOTE_PATH));

    const pending = app.request(url);
    await hasEntered;
    const refreshed = await app.request('/api/refresh', { method: 'POST' });
    expect(refreshed.status).toBe(200);
    release();
    const res = await pending;
    expect(res.status).toBe(200);
    expect(((await res.json()) as SourceTextResponse).text).toBe('held text\n');

    expect((await app.request(url)).status).toBe(404);
    expect(fs.reads).toEqual([NOTE_PATH]);
  });

  it("the handler's first statement captures the bundle", async () => {
    const source = await readFile(new URL('../../src/server/source-text.ts', import.meta.url), 'utf8');
    const start = source.indexOf('return async (c) => {');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start + 'return async (c) => {'.length);
    expect(body).toMatch(/^(\s*\/\/[^\n]*\n)*\s*const activeDerived = getBundle\(\);/);
  });
});

describe('handler drift contract (T-12-19)', () => {
  it('every handler that sets its frontmatter through maskData has its kind in FRONTMATTER_MASK_BY_KIND with the same mode', async () => {
    const dir = new URL('../../src/planning-repo/handlers/', import.meta.url);
    const found: string[] = [];
    for (const name of (await readdir(dir)).filter((entry) => entry.endsWith('.ts'))) {
      const source = await readFile(new URL(name, dir), 'utf8');
      const call = /frontmatter:\s*maskData\(([^)]*)\)/.exec(source);
      if (call === null) continue;
      const prose = (call[1] ?? '').includes('PROSE_MASK');
      const kinds = [...source.matchAll(/\bkind:\s*'([a-z-]+)'/g)].map((match) => match[1] ?? '');
      expect(kinds.length, `${name} declares no kind`).toBeGreaterThan(0);
      for (const kind of kinds) {
        const options = FRONTMATTER_MASK_BY_KIND.get(kind);
        expect(options, `${name}: kind ${kind} is missing from FRONTMATTER_MASK_BY_KIND`).toBeDefined();
        expect(options?.prose === true, `${name}: kind ${kind} lists the other mask mode`).toBe(prose);
        found.push(kind);
      }
    }
    expect(found.sort()).toEqual([...FRONTMATTER_MASK_BY_KIND.keys()].sort());
  });
});
