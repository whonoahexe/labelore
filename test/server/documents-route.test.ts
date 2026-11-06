// NAV-09, NAV-10, T-07-13..16: GET /api/documents?route=<readable URL> is the only document endpoint. Every
// text artifact of the two committed fixture projects (Shapes, Lendshed) is served by the very URL
// /api/presentation reports as its key; an unknown address, a traversal spelling, an internal file's
// file/ address and a malformed percent sequence are all 404s with `found: false`.
import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { CommitLog } from '../../src/server/commit-times.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
import { writeLargeGraph } from '../helpers/index-fixtures.ts';
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

// Phase 10 (10-08): the Codebase page's seven-panel list rides the /documents response for a map document only.
describe('/api/documents carries the codebase context for a map document', () => {
  const TIDEMARK_ROOT = fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');

  interface ContextBody {
    found: true;
    codebaseContext: {
      panels: { key: string; label: string; url: string | null; mapped: boolean }[];
      mappedCount: number;
      readiness: string;
      mappedAt: string | null;
      commit: string | null;
      activeKey: string;
      mapOnly: boolean;
    } | null;
  }

  it("gives Tidemark's STACK.md seven panels, readiness complete and the stack panel active", async () => {
    const app = await appOver(TIDEMARK_ROOT);
    const response = await documentRequest(app, '/codebase/stack');
    expect(response.status).toBe(200);
    const { codebaseContext } = (await response.json()) as ContextBody;
    expect(codebaseContext).not.toBeNull();
    expect(codebaseContext?.panels.map((panel) => panel.key)).toEqual([
      'stack',
      'architecture',
      'structure',
      'conventions',
      'testing',
      'integrations',
      'concerns',
    ]);
    expect(codebaseContext?.panels.every((panel) => panel.mapped && panel.url !== null)).toBe(true);
    expect(codebaseContext?.panels[0]?.url).toBe('/codebase/stack');
    expect(codebaseContext?.mappedCount).toBe(7);
    expect(codebaseContext?.readiness).toBe('complete');
    expect(codebaseContext?.activeKey).toBe('stack');
    expect(codebaseContext?.mapOnly).toBe(true);
  });

  it('is null for a document that is not one of the seven map documents', async () => {
    const app = await appOver(FX_ROOT);
    const presentation = await presentationOf(app);
    const project = presentation.artifacts.find((artifact) => artifact.path === '.planning/PROJECT.md');
    expect(project).toBeDefined();
    const response = await documentRequest(app, project?.key ?? '');
    expect(response.status).toBe(200);
    const body = (await response.json()) as ContextBody;
    expect(body.codebaseContext).toBeNull();
  });

  it("marks the documents Shapes' codebase folder lacks as unmapped, with no address", async () => {
    const app = await appOver(SHAPES_ROOT);
    const presentation = await presentationOf(app);
    const stack = presentation.artifacts.find((artifact) => artifact.path === '.planning/codebase/STACK.md');
    expect(stack).toBeDefined();
    const body = (await (await documentRequest(app, stack?.key ?? '')).json()) as ContextBody;
    expect(body.codebaseContext?.mappedCount).toBe(3);
    expect(body.codebaseContext?.readiness).toBe('none');
    const testing = body.codebaseContext?.panels.find((panel) => panel.key === 'testing');
    expect(testing).toMatchObject({ mapped: false, url: null });
    expect(body.codebaseContext?.mapOnly).toBe(false);
  });
});

// Phase 11 (11-10): the pause page's pairing, date, stop, gates and disagreements ride the /documents response for
// HANDOFF.json and a .continue-here.md only.
describe('/api/documents carries the pause context for a pause file', () => {
  interface PauseBody {
    found: true;
    pauseContext: {
      active: 'handoff' | 'continue-here';
      readAt: string;
      contextLabel: string | null;
      stop: { task: number | string | null; totalTasks: number | string | null; status: string | null };
      files: { handoff: { path: string } | null; continueHere: { path: string } | null };
    } | null;
  }

  async function bodyOf(app: App, path: string): Promise<PauseBody> {
    const presentation = await presentationOf(app);
    const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
    expect(artifact, path).toBeDefined();
    const response = await documentRequest(app, artifact?.key ?? '');
    expect(response.status).toBe(200);
    return (await response.json()) as PauseBody;
  }

  it("gives Lendshed's HANDOFF.json task 3 of 6, its partner and the day the project was read", async () => {
    const app = await appOver(FX_ROOT);
    const { pauseContext } = await bodyOf(app, '.planning/HANDOFF.json');
    expect(pauseContext).not.toBeNull();
    expect(pauseContext?.active).toBe('handoff');
    expect(pauseContext?.stop).toMatchObject({ task: 3, totalTasks: 6, status: 'paused' });
    expect(pauseContext?.files.handoff?.path).toBe('.planning/HANDOFF.json');
    expect(pauseContext?.files.continueHere).not.toBeNull();
    expect(Number.isNaN(Date.parse(pauseContext?.readAt ?? ''))).toBe(false);
  });

  it("gives a .continue-here.md the same page's context, headed by its own file", async () => {
    const app = await appOver(FX_ROOT);
    const { pauseContext } = await bodyOf(app, '.planning/phases/03-account-admin-and-sessions/.continue-here.md');
    expect(pauseContext).not.toBeNull();
    expect(pauseContext?.active).toBe('continue-here');
  });

  it('is null for a document that is not a pause file', async () => {
    const app = await appOver(FX_ROOT);
    const { pauseContext } = await bodyOf(app, '.planning/PROJECT.md');
    expect(pauseContext).toBeNull();
  });

  it("reads Shapes' older HANDOFF layout (paused_at, no task lists) as task 2 of 5", async () => {
    const app = await appOver(SHAPES_ROOT);
    const { pauseContext } = await bodyOf(app, '.planning/HANDOFF.json');
    expect(pauseContext?.stop).toMatchObject({ task: 2, totalTasks: 5, status: 'paused' });
  });
});

describe('/api/documents carries the spikes context for a spike file', () => {
  interface SpikesBody {
    found: true;
    spikesContext: {
      activeKey: string | null;
      lanes: Array<{ key: string; count: number }>;
      counts: { validated: number; partial: number; invalidated: number; pending: number };
      notInManifest: Array<{ folder: string }>;
      manifest: { path: string; readable: boolean } | null;
    } | null;
  }

  async function bodyOf(app: App, path: string): Promise<SpikesBody> {
    const presentation = await presentationOf(app);
    const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
    expect(artifact, path).toBeDefined();
    const response = await documentRequest(app, artifact?.key ?? '');
    expect(response.status).toBe(200);
    return (await response.json()) as SpikesBody;
  }

  it("gives Lendshed's MANIFEST.md two lanes, the column totals and the folders the manifest does not list", async () => {
    const app = await appOver(FX_ROOT);
    const { spikesContext } = await bodyOf(app, '.planning/spikes/MANIFEST.md');
    expect(spikesContext).not.toBeNull();
    expect(spikesContext?.lanes.map((lane) => lane.key)).toEqual(['kiosk-handover', 'export-staging']);
    expect(spikesContext?.counts).toEqual({ validated: 2, partial: 1, invalidated: 1, pending: 0 });
    expect(spikesContext?.notInManifest.map((entry) => entry.folder)).toEqual(['005-pdf-receipts', 'SPIKE-006']);
    expect(spikesContext?.manifest).toMatchObject({ path: '.planning/spikes/MANIFEST.md', readable: true });
    expect(spikesContext?.activeKey).toBeNull();
  });

  it('gives a spike README, the wrap-up and the conventions the same page, each naming its own panel', async () => {
    const app = await appOver(FX_ROOT);
    const readme = await bodyOf(app, '.planning/spikes/003b-local-disk-staging/README.md');
    expect(readme.spikesContext?.activeKey).toBe('003b-local-disk-staging');
    const wrap = await bodyOf(app, '.planning/spikes/WRAP-UP-SUMMARY.md');
    expect(wrap.spikesContext?.activeKey).toBe('wrap-up-summary');
    const conventions = await bodyOf(app, '.planning/spikes/CONVENTIONS.md');
    expect(conventions.spikesContext?.activeKey).toBe('conventions');
  });

  it('is null for a document that is not a spike file', async () => {
    const app = await appOver(FX_ROOT);
    const { spikesContext } = await bodyOf(app, '.planning/PROJECT.md');
    expect(spikesContext).toBeNull();
  });
});

describe('/api/documents carries the bounded indexes context for an intel or graph file', () => {
  interface IndexesBody {
    found: true;
    document: { html: string };
    indexesContext: {
      openKey: string | null;
      intelFiles: number;
      tiles: Array<{
        key: string;
        state: string;
        url: string | null;
        path: string | null;
        graph: {
          counts: { nodes: number; links: number | null; communities: number | null } | null;
          hubs: Array<{ id: string }>;
          status: { state: string | null; exitCode: number | null } | null;
        } | null;
        summary: { kind: string } | null;
      }>;
    } | null;
  }

  /** An app over a repository on the real filesystem, so the graph summary can read graph.json through it. */
  async function liveAppOver(root: string): Promise<App> {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root, { loadTheme: null });
    await repository.load();
    return createApp(repository, true, '.', NO_COMMITS);
  }

  async function rawBodyOf(app: App, path: string): Promise<{ text: string; body: IndexesBody }> {
    const presentation = await presentationOf(app);
    const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
    expect(artifact, path).toBeDefined();
    const response = await documentRequest(app, artifact?.key ?? '');
    expect(response.status).toBe(200);
    const text = await response.text();
    return { text, body: JSON.parse(text) as IndexesBody };
  }

  it("opens Lendshed's graph.json on the Graph tile with the last good counts, the failed status and a small response", async () => {
    const app = await liveAppOver(FX_ROOT);
    const { text, body } = await rawBodyOf(app, '.planning/graphs/graph.json');
    const context = body.indexesContext;
    expect(context).not.toBeNull();
    expect(context?.openKey).toBe('graph');
    expect(context?.tiles.map((tile) => tile.key)).toEqual([
      'graph',
      'architecture',
      'stack',
      'file-roles',
      'api-map',
      'dependencies',
    ]);
    const graph = context?.tiles[0].graph;
    expect(graph?.counts).toMatchObject({ nodes: 40, links: 60, communities: 6 });
    expect(graph?.status).toMatchObject({ state: 'failed', exitCode: 1 });
    expect(text.length).toBeLessThan(32 * 1024);

    // No node id beyond the hubs reaches the response: the page names at most ten.
    const raw = JSON.parse(await readFile(join(FX_ROOT, '.planning/graphs/graph.json'), 'utf8')) as { nodes: Array<{ id: string }> };
    const hubIds = new Set((graph?.hubs ?? []).map((hub) => hub.id));
    expect(hubIds.size).toBeLessThanOrEqual(10);
    const others = raw.nodes.map((node) => node.id).filter((id) => !hubIds.has(id));
    expect(others.length).toBeGreaterThan(10);
    for (const id of others) expect(text, id).not.toContain(`"${id}"`);
  });

  it('gives every other intel or graph file of the project the same page with its own tile open, and the stamp none', async () => {
    const app = await liveAppOver(FX_ROOT);
    const expected: Array<[string, string | null]> = [
      ['.planning/graphs/GRAPH_REPORT.md', 'graph'],
      ['.planning/graphs/.last-build-status.json', 'graph'],
      ['.planning/intel/stack.json', 'stack'],
      ['.planning/intel/arch-decisions.json', 'architecture'],
      ['.planning/intel/dependency-graph.json', 'dependencies'],
      ['.planning/intel/.last-refresh.json', null],
    ];
    for (const [path, openKey] of expected) {
      const { body } = await rawBodyOf(app, path);
      expect(body.indexesContext?.openKey, path).toBe(openKey);
    }
  });

  it("sends no raw key of Lendshed's stack.json, only the bounded lift", async () => {
    const app = await liveAppOver(FX_ROOT);
    const { text, body } = await rawBodyOf(app, '.planning/intel/stack.json');
    const stack = body.indexesContext?.tiles.find((tile) => tile.key === 'stack');
    expect(stack?.summary?.kind).toBe('stack');
    const raw = JSON.parse(await readFile(join(FX_ROOT, '.planning/intel/stack.json'), 'utf8')) as Record<string, unknown>;
    const rawKeys = Object.keys(raw).filter((key) => key.includes('_') && !['_meta', 'made_up_example', 'derived_from', 'gsd_core_version'].includes(key));
    expect(rawKeys.length).toBeGreaterThan(0);
    for (const key of rawKeys) expect(text, key).not.toContain(key);
    expect(body.document.html).not.toContain('{');
  });

  it('is null for a document that is not an intel or graph file', async () => {
    const app = await liveAppOver(FX_ROOT);
    const { body } = await rawBodyOf(app, '.planning/PROJECT.md');
    expect(body.indexesContext).toBeNull();
  });

  it('opens a graph.json above the text cap on the Graph tile, summarised, with the response far below the file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-indexes-'));
    try {
      writeLargeGraph(dir, 12_000);
      const app = await liveAppOver(dir);
      const presentation = await presentationOf(app);
      const artifact = presentation.artifacts.find((candidate) => candidate.path === '.planning/graphs/graph.json');
      expect(artifact?.fileClass).toBe('large');
      expect(artifact?.sizeBytes).toBeGreaterThan(1_048_576);
      const { text, body } = await rawBodyOf(app, '.planning/graphs/graph.json');
      const graph = body.indexesContext?.tiles.find((tile) => tile.key === 'graph');
      expect(body.indexesContext?.openKey).toBe('graph');
      expect(graph?.state).toBe('ok');
      expect(graph?.graph?.counts?.nodes).toBe(12_000);
      expect(graph?.graph?.hubs.length).toBeLessThanOrEqual(10);
      expect(text.length).toBeLessThan(32 * 1024);
      expect(text).not.toContain('"n11999"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
