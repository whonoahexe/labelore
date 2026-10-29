// SEC-04: a secret key in the target's config.json is masked at the one point Labelore reads it, so
// the presentation payload, the file page response, the search index and every snippet only ever
// see the masked form. Drives the real PlanningRepository over an in-memory project through
// createApp + app.request, the same idiom test/server/refresh.test.ts uses.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { createApp } from '../src/server/index.ts';
import type { CommitLog } from '../src/server/commit-times.ts';
import type { ProjectPresentation } from '../src/server/project-presentation.ts';

const SECRET = 'BSAplantedsecretvalue1234567890wxyz';
const FRAGMENT = 'plantedsecret';
const MASKED = '****wxyz';

const PROJECT_MD = '# Masking Fixture\n\nA made-up project for the secret-masking tests.\n';

const NO_COMMITS: CommitLog = { load: async () => null, reset: () => undefined };

function configText(): string {
  return `{\n  "model_profile": "adaptive",\n  "brave_search": "${SECRET}",\n  "firecrawl": true,\n  "exa_search": false\n}\n`;
}

async function appFor(files: Record<string, string>) {
  const repo = new PlanningRepository(
    new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': PROJECT_MD, ...files }),
    '/p',
    { loadTheme: null },
  );
  await repo.load();
  const app = createApp(repo, true, '.', NO_COMMITS);
  return { app, repo };
}

type App = Awaited<ReturnType<typeof appFor>>['app'];

async function textOf(app: App, url: string, init?: RequestInit): Promise<string> {
  const response = await app.request(url, init);
  return response.text();
}

async function keyFor(app: App, artifactPath: string): Promise<string> {
  const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
  const dto = presentation.artifacts.find((candidate) => candidate.path === artifactPath);
  if (!dto) throw new Error(`No artifact dto found for ${artifactPath}`);
  return dto.key;
}

/** The file page's payload, from the one endpoint that serves a single artifact. */
async function pagePayload(app: App, key: string): Promise<string> {
  return textOf(app, `/api/documents?route=${encodeURIComponent(key)}`);
}

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** What search answers for a query: its hits and groups, without the echoed query (which is the
 * caller's own text and would hold a searched-for fragment by construction). */
async function search(app: App, query: string): Promise<string> {
  await settled();
  const body = JSON.parse(await textOf(app, `/api/search?q=${encodeURIComponent(query)}`)) as {
    status: string;
    results: unknown;
    groups: unknown;
  };
  expect(body.status).toBe('ready');
  return JSON.stringify({ results: body.results, groups: body.groups });
}

describe('config.json secret masking, end to end (SEC-04)', () => {
  it('never lets the planted value reach presentation, the file page or search, and shows the last four', async () => {
    const { app } = await appFor({ '.planning/config.json': configText() });

    const presentation = await textOf(app, '/api/presentation');
    expect(presentation).not.toContain(SECRET);
    expect(presentation).toContain(MASKED);

    const key = await keyFor(app, '.planning/config.json');
    const page = await pagePayload(app, key);
    expect(page).not.toContain(SECRET);
    expect(page).toContain(MASKED);
    const pageJson = JSON.parse(await textOf(app, `/api/documents?route=${encodeURIComponent(key)}`)) as { artifact: { frontmatter: Record<string, unknown> } };
    expect(pageJson.artifact.frontmatter.brave_search).toBe(MASKED);
    expect(pageJson.artifact.frontmatter.firecrawl).toBe(true);
    expect(pageJson.artifact.frontmatter.exa_search).toBe(false);

    for (const query of ['brave_search', FRAGMENT, 'BSAplanted', SECRET]) {
      const found = await search(app, query);
      expect(found).not.toContain(SECRET);
      expect(found).not.toContain(FRAGMENT);
    }
    // The config file itself is still found, with the masked form in its snippet.
    const byKey = await search(app, 'brave_search');
    expect(byKey).toContain('.planning/config.json');
    expect(byKey).toContain(MASKED);
  });
});

describe('config.json masking edge cases (SEC-04)', () => {
  it('keeps the parse warning on a config.json that fails to parse and still ships no planted value', async () => {
    const broken = `{\n  "brave_search": "${SECRET}",\n  "firecrawl": true,\n}\n`;
    const { app } = await appFor({ '.planning/config.json': broken });

    const key = await keyFor(app, '.planning/config.json');
    const page = await pagePayload(app, key);
    expect(page).not.toContain(SECRET);
    expect(page).not.toContain(FRAGMENT);
    expect(page).toContain(MASKED);
    expect(page).toContain('JSON failed to parse');

    expect(await textOf(app, '/api/presentation')).not.toContain(SECRET);
    for (const query of ['brave_search', FRAGMENT]) {
      const found = await search(app, query);
      expect(found).not.toContain(SECRET);
      expect(found).not.toContain(FRAGMENT);
    }
  });

  it('masks a secret that a later duplicate key shadows in a config.json that parses (CR-01)', async () => {
    const shadowed = `{"brave_search": "${SECRET}", "brave_search": true}\n`;
    const { app } = await appFor({ '.planning/config.json': shadowed });

    const key = await keyFor(app, '.planning/config.json');
    const page = await pagePayload(app, key);
    expect(page).not.toContain(SECRET);
    expect(page).not.toContain(FRAGMENT);
    expect(await textOf(app, '/api/presentation')).not.toContain(SECRET);
    for (const query of ['brave_search', FRAGMENT]) {
      const found = await search(app, query);
      expect(found).not.toContain(SECRET);
      expect(found).not.toContain(FRAGMENT);
    }
  });

  it('returns HANDOFF.json exactly as before (D-09 scopes masking to config.json) and keeps the GSD-internal estimation-calibration.json out of the index (D-11)', async () => {
    const handoff = `{"brave_search": "${SECRET}", "note": "handoff"}\n`;
    const calibration = `{"firecrawl": "${SECRET}"}\n`;
    const { repo } = await appFor({
      '.planning/config.json': configText(),
      '.planning/HANDOFF.json': handoff,
      '.planning/estimation-calibration.json': calibration,
    });
    const snapshot = repo.getSnapshot();
    const project = snapshot.project;
    expect(project?.artifacts['.planning/HANDOFF.json'].body).toBe(handoff);
    expect(project?.artifacts['.planning/HANDOFF.json'].frontmatter.brave_search).toBe(SECRET);
    // Internal files never become artifacts, so their content is never read, indexed or shown.
    expect(project?.artifacts['.planning/estimation-calibration.json']).toBeUndefined();
    expect(snapshot.exclusions.map((exclusion) => exclusion.path)).toContain('.planning/estimation-calibration.json');
    // The config.json beside them is still masked.
    expect(project?.artifacts['.planning/config.json'].frontmatter.brave_search).toBe(MASKED);
  });

  it('stays masked in every response before and after POST /api/refresh, which re-reads config.json', async () => {
    const { app } = await appFor({ '.planning/config.json': configText() });
    const sameOrigin = { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' } };

    expect(await textOf(app, '/api/presentation')).not.toContain(SECRET);
    const refresh = await app.request('/api/refresh', sameOrigin);
    expect(refresh.status).toBe(200);
    const refreshText = await refresh.text();
    expect(refreshText).not.toContain(SECRET);

    const presentation = await textOf(app, '/api/presentation');
    expect(presentation).not.toContain(SECRET);
    expect(presentation).toContain(MASKED);
    const key = await keyFor(app, '.planning/config.json');
    expect(await pagePayload(app, key)).not.toContain(SECRET);
    for (const query of ['brave_search', FRAGMENT]) {
      const found = await search(app, query);
      expect(found).not.toContain(SECRET);
      expect(found).not.toContain(FRAGMENT);
    }
  });
});

describe('loading a project never writes to its config.json (SEC-04, read-only)', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('leaves the on-disk content and mtime identical across a load and a refresh', async () => {
    const root = mkdtempSync(join(tmpdir(), 'labelore-mask-'));
    dirs.push(root);
    mkdirSync(join(root, '.planning'), { recursive: true });
    const config = join(root, '.planning/config.json');
    writeFileSync(join(root, '.planning/PROJECT.md'), PROJECT_MD);
    writeFileSync(config, configText());
    const before = { text: readFileSync(config, 'utf8'), mtimeMs: statSync(config).mtimeMs };

    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(root), root, { loadTheme: null });
    const snapshot = await repo.load();
    await repo.refresh();

    expect(snapshot.project?.artifacts['.planning/config.json'].frontmatter.brave_search).toBe(MASKED);
    expect(readFileSync(config, 'utf8')).toBe(before.text);
    expect(readFileSync(config, 'utf8')).toContain(SECRET);
    expect(statSync(config).mtimeMs).toBe(before.mtimeMs);
  });
});
