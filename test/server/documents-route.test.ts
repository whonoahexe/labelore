// NAV-09, NAV-10, T-07-13..16: GET /api/documents?route=<readable URL> is the only document endpoint. Every
// text artifact of the two committed fixture projects (Shapes, Lendshed) is served by the very URL
// /api/presentation reports as its key; an unknown address, a traversal spelling, an internal file's
// file/ address and a malformed percent sequence are all 404s with `found: false`.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { CommitLog } from '../../src/server/commit-times.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';

const NO_COMMITS: CommitLog = { load: async () => null, reset: () => undefined };

interface NotFoundBody {
  found: false;
  status: 'not-found';
  artifactPath: string;
}

interface FoundBody {
  found: true;
  status: 'found';
  artifact: { path: string; frontmatter: Record<string, unknown> };
}

type App = ReturnType<typeof createApp>;

async function appOver(root: string): Promise<App> {
  const { snapshot } = await loadProject(root);
  return createApp({ getSnapshot: () => snapshot }, true, '.', NO_COMMITS);
}

async function presentationOf(app: App): Promise<ProjectPresentation> {
  return (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
}

async function documentRequest(app: App, route: string): Promise<Response> {
  return app.request(`/api/documents?route=${encodeURIComponent(route)}`);
}

describe.each([
  ['Shapes', SHAPES_ROOT],
  ['Lendshed', FX_ROOT],
])('/api/documents over the %s fixture', (_name, root) => {
  it('serves every text artifact at the readable URL its presentation key names', async () => {
    const app = await appOver(root);
    const presentation = await presentationOf(app);
    const texts = presentation.artifacts.filter((artifact) => artifact.fileClass === 'text');
    expect(texts.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const artifact of texts) {
      const response = await documentRequest(app, artifact.key);
      const body = (await response.json()) as FoundBody | NotFoundBody;
      if (response.status !== 200 || !body.found || body.artifact.path !== artifact.path) {
        failures.push(`${artifact.key} -> ${response.status} ${JSON.stringify(body).slice(0, 120)}`);
      }
    }
    expect(failures).toEqual([]);
    // Each request asks git for the file's added date over the whole history (git log --follow), which
    // takes seconds for a project with many files once the repository is not a shallow clone.
  }, 60_000);

  it('gives every artifact a distinct key, none of them an opaque token', async () => {
    const presentation = await presentationOf(await appOver(root));
    const keys = presentation.artifacts.map((artifact) => artifact.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key.startsWith('/')).toBe(true);
      expect(key).not.toMatch(/^\/(?:artifacts|milestones)\/[am]~/);
    }
  });

  it('reports no URL conflicts and no alias gaps for a committed fixture', async () => {
    const presentation = await presentationOf(await appOver(root));
    expect(presentation.urlConflicts).toEqual([]);
    for (const [alias, target] of Object.entries(presentation.routeAliases)) {
      const served = await documentRequest(await appOver(root), alias);
      expect(served.status, alias).toBe(200);
      expect(presentation.artifacts.some((artifact) => artifact.key === target), target).toBe(true);
    }
  });

  it('gives every milestone its overview and roadmap addresses', async () => {
    const presentation = await presentationOf(await appOver(root));
    for (const milestone of presentation.milestones) {
      expect(milestone.overviewUrl.endsWith('/overview') || milestone.overviewUrl === '/overview').toBe(true);
      expect(milestone.roadmapUrl.startsWith('/')).toBe(true);
    }
  });

  it('keeps plan keys equal to the PLAN and SUMMARY file keys', async () => {
    const presentation = await presentationOf(await appOver(root));
    const keyOfPath = new Map(presentation.artifacts.map((artifact) => [artifact.path, artifact.key]));
    for (const milestone of presentation.milestones) {
      for (const phase of milestone.phases) {
        for (const plan of phase.plans) {
          expect(plan.key).toBe(keyOfPath.get(plan.path));
          if (plan.summary) expect(plan.summary.key).toBe(keyOfPath.get(plan.summary.path));
        }
      }
    }
  });

  it('answers a missing route, an unknown address and a bare page word with 404 and found false', async () => {
    const app = await appOver(root);
    for (const route of ['', '/v1.1/phase-99/context', '/no-such-document', '/search']) {
      const response = await documentRequest(app, route);
      expect(response.status, route).toBe(404);
      expect(((await response.json()) as NotFoundBody).found, route).toBe(false);
    }
  });
});

describe('/api/documents resolves only through the route table', () => {
  async function internalFileApp(): Promise<App> {
    const repository = new PlanningRepository(
      new InMemoryPlanningFilesystem({
        '.planning/PROJECT.md': '# Internal files\n',
        '.planning/STATE.md': '# State\n',
        '.planning/config.json': '{\n  "model_profile": "adaptive",\n  "brave_search": "BSAsecretvalue1234567890wxyz"\n}\n',
        '.planning/state.json': '{"internal": true}\n',
      }),
      '/p',
      { loadTheme: null },
    );
    await repository.load();
    return createApp(repository, true, '.', NO_COMMITS);
  }

  it('serves config.json at /settings with its secrets masked', async () => {
    const app = await internalFileApp();
    const response = await documentRequest(app, '/settings');
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain('BSAsecretvalue1234567890wxyz');
    expect(text).toContain('****wxyz');
    const body = JSON.parse(text) as FoundBody;
    expect(body.artifact.path).toBe('.planning/config.json');
  });

  it('answers 404 for an internal file, traversal spellings and malformed percent sequences', async () => {
    const app = await internalFileApp();
    const hostile = [
      '/file/state.json',
      '/file/../../etc/passwd',
      '/file/%2e%2e/STATE.md',
      '/file/%2E%2E/%2E%2E/etc/passwd',
      '/file/..%2F..%2Fetc%2Fpasswd',
      '/v1.1/phase-99/context',
      '/file/%E0%A4%A',
      '/file/%',
    ];
    for (const route of hostile) {
      const response = await documentRequest(app, route);
      expect(response.status, route).toBe(404);
      const body = (await response.json()) as NotFoundBody;
      expect(body.found, route).toBe(false);
      expect(body.status, route).toBe('not-found');
    }
  });

  it('answers a raw malformed percent sequence in the query itself with 404', async () => {
    const app = await internalFileApp();
    const response = await app.request('/api/documents?route=/file/%E0%A4%A');
    expect(response.status).toBe(404);
    expect(((await response.json()) as NotFoundBody).found).toBe(false);
  });

  it('has no token-path artifact endpoint any more', async () => {
    const app = await internalFileApp();
    const response = await app.request('/api/artifacts/a~anything');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found' });
  });

  it('captures the derived bundle as the documents handler first statement (source pin, T-07-15)', async () => {
    // The handler moved from createApp into the shared project API (08-01); the pin follows it.
    const source = await readFile(new URL('../../src/server/project-api.ts', import.meta.url), 'utf8');
    const start = source.indexOf("api.get('/documents'");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("api.post('/refresh'", start);
    const handler = source.slice(start, end);
    const body = handler.slice(handler.indexOf('{', handler.indexOf('async (c) =>')) + 1);
    const statements = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('//'));
    // The runtime comes from this request's own context, then its bundle is captured at once.
    expect(statements.slice(0, 2)).toEqual(["const runtime = c.get('runtime');", 'const activeDerived = runtime.derived;']);
    expect(handler).toContain('parseRoutePath(');
  });
});

describe('the route audit on the payload', () => {
  const STATE = '---\nmilestone: v1.1\n---\n# State\n';

  async function presentationFor(files: Record<string, string>): Promise<ProjectPresentation> {
    const repository = new PlanningRepository(
      new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': '# P\n', '.planning/STATE.md': STATE, ...files }),
      '/p',
      { loadTheme: null },
    );
    await repository.load();
    return presentationOf(createApp(repository, true, '.', NO_COMMITS));
  }

  const CLASHES = {
    '.planning/ROADMAP.md': '# Roadmap\n',
    '.planning/phases/01-a/01-CONTEXT.md': '# Context\n',
    '.planning/research/Foo.md': '# Upper\n',
    '.planning/research/foo.md': '# Lower\n',
    '.planning/milestones/v1.1-ROADMAP.md': '# Stray copy\n',
  };

  it('lists conflicts sorted by URL with the paths inside each sorted, and the live aliases', async () => {
    const presentation = await presentationFor(CLASHES);
    expect(presentation.urlConflicts).toEqual([
      { url: '/research/foo', paths: ['.planning/research/Foo.md', '.planning/research/foo.md'] },
      { url: '/v1.1/roadmap', paths: ['.planning/milestones/v1.1-ROADMAP.md'] },
    ]);
    expect(presentation.routeAliases).toEqual({ '/v1.1/roadmap': '/roadmap' });
  });

  it('is identical on every load, whatever order the files arrive in', async () => {
    const first = await presentationFor(CLASHES);
    const second = await presentationFor(Object.fromEntries(Object.entries(CLASHES).reverse()));
    expect(second.urlConflicts).toEqual(first.urlConflicts);
    expect(second.routeAliases).toEqual(first.routeAliases);
  });

  it('serves a loser at its file/ address and answers the alias through the table', async () => {
    const repository = new PlanningRepository(
      new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': '# P\n', '.planning/STATE.md': STATE, ...CLASHES }),
      '/p',
      { loadTheme: null },
    );
    await repository.load();
    const app = createApp(repository, true, '.', NO_COMMITS);
    const lower = await documentRequest(app, '/file/research/foo.md');
    expect(lower.status).toBe(200);
    expect(((await lower.json()) as FoundBody).artifact.path).toBe('.planning/research/foo.md');
    const viaAlias = await documentRequest(app, '/v1.1/roadmap');
    expect(viaAlias.status).toBe(200);
    expect(((await viaAlias.json()) as FoundBody).artifact.path).toBe('.planning/ROADMAP.md');
  });

  it('links a collision loser from search at its own file/ address, never the winner\'s', async () => {
    const repository = new PlanningRepository(
      new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': '# P\n', '.planning/STATE.md': STATE, ...CLASHES }),
      '/p',
      { loadTheme: null },
    );
    await repository.load();
    const app = createApp(repository, true, '.', NO_COMMITS);
    await new Promise((resolve) => setImmediate(resolve));
    const presentation = await presentationOf(app);
    const keyOf = (path: string): string | undefined =>
      presentation.artifacts.find((artifact) => artifact.path === path)?.key;
    const body = (await (await app.request('/api/search?q=Lower')).json()) as {
      status: string;
      results: { path: string; url: string }[];
    };
    expect(body.status).toBe('ready');
    const hit = body.results.find((result) => result.path === '.planning/research/foo.md');
    expect(hit?.url).toBe('/file/research/foo.md');
    expect(hit?.url).toBe(keyOf('.planning/research/foo.md'));
    expect(keyOf('.planning/research/Foo.md')).toBe('/research/foo');
  });
});
