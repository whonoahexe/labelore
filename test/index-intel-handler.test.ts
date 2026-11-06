// Phase 11 (11-13, VIEW-19, D-04, RESEARCH C14): the intel and graph handler. A small intel or graph file lifts to
// a bounded summary (structured.index); its body is a digest of labels under 2 KB; its frontmatter holds only
// _meta and the marker keys; the raw object reaches no frontmatter, body, rendered document or search hit.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { IndexIntelHandler } from '../src/planning-repo/handlers/index-intel.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import type { IntelSummary, StackSummary } from '../src/planning-repo/handlers/index-intel-lift.ts';
import { INDEX_BOUNDS } from '../src/server/index-bounds.ts';
import { createApp } from '../src/server/index.ts';
import type { CommitLog } from '../src/server/commit-times.ts';
import type { ProjectPresentation } from '../src/server/project-presentation.ts';
import { FX_PLANNING } from './helpers/fixture-project.ts';
import { writeIngestDocsProject } from './helpers/index-fixtures.ts';

const NO_COMMITS: CommitLog = { load: async () => null, reset: () => undefined };
const MARKER = 'ZQXMARKERDEEPVALUE';

function refOf(path: string, kind: 'intel' | 'graph' = 'intel', fileClass: ArtifactRef['fileClass'] = 'text'): ArtifactRef {
  return { path, kind, location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass, sizeBytes: 0 };
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

const INTEL = '.planning/intel/';
const lendshed = (relative: string): string => readFileSync(join(FX_PLANNING, relative), 'utf8');

function indexOf(result: { structured?: Record<string, unknown> }): IntelSummary | undefined {
  return result.structured?.index as IntelSummary | undefined;
}

describe('IndexIntelHandler registration', () => {
  it('is registered before the generic fallback and claims intel and graph text files only', () => {
    expect(HANDLERS.indexOf(IndexIntelHandler)).toBeGreaterThanOrEqual(0);
    expect(HANDLERS.indexOf(IndexIntelHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
    expect(HANDLERS.find((h) => h.match(refOf(`${INTEL}stack.json`)))).toBe(IndexIntelHandler);
    expect(HANDLERS.find((h) => h.match(refOf('.planning/graphs/graph.json', 'graph')))).toBe(IndexIntelHandler);
    expect(IndexIntelHandler.match(refOf(`${INTEL}stack.json`, 'intel', 'large'))).toBe(false);
    expect(IndexIntelHandler.match({ ...refOf('.planning/notes/a.md'), kind: 'note' })).toBe(false);
  });
});

describe('stack.json', () => {
  it('lifts Lendshed stack.json to framework chips, a label digest and a bounded frontmatter', () => {
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}stack.json`, lendshed('intel/stack.json')), refOf(`${INTEL}stack.json`));
    const summary = indexOf(result) as StackSummary;
    expect(summary.kind).toBe('stack');
    expect(summary.frameworks).toEqual({ items: ['Fastify', 'React'], total: 2 });
    expect(summary.languages.items).toEqual(['TypeScript', 'SQL']);
    expect(summary.buildSystem).toBe('npm scripts');
    expect(summary.testFramework).toBe('Vitest');
    expect(result.body.length).toBeLessThanOrEqual(INDEX_BOUNDS.digestBytes);
    expect(result.body.trim().startsWith('{')).toBe(false);
    expect(result.body).toContain('Frameworks: Fastify, React');
    // Only _meta (scalars) and the marker keys survive in frontmatter.
    expect(Object.keys(result.frontmatter).sort()).toEqual(['_meta', 'derived_from', 'gsd_core_version', 'made_up_example']);
    expect(result.frontmatter.made_up_example).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('caps a stack list at the list bound and keeps its total', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Tool${i}`);
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}stack.json`, JSON.stringify({ tools: many })), refOf(`${INTEL}stack.json`));
    const summary = indexOf(result) as StackSummary;
    expect(summary.tools.items).toHaveLength(INDEX_BOUNDS.listItems);
    expect(summary.tools.total).toBe(30);
    expect(result.body).not.toContain('Tool29');
  });
});

describe('the raw object never leaves the handler', () => {
  const entries: Record<string, unknown> = {};
  for (let i = 0; i < 400; i += 1) entries[`src/module${i}.ts`] = { type: 'module', exports: [], imports: [], note: i === 321 ? MARKER : 'plain' };
  const planted = JSON.stringify({ _meta: { updated_at: '2026-09-14T09:12:40.000Z', version: 3, hidden: { nested: MARKER } }, entries, secret: MARKER });
  const FILES: Record<string, string> = {
    '.planning/PROJECT.md': '# Host\n\n## What This Is\nA host project.\n',
    '.planning/intel/file-roles.json': planted,
  };

  it('keeps a marker planted deep in the entries out of frontmatter, body and structured', () => {
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}file-roles.json`, planted), refOf(`${INTEL}file-roles.json`));
    expect(JSON.stringify(result.frontmatter)).not.toContain(MARKER);
    expect(result.body).not.toContain(MARKER);
    expect(JSON.stringify(result.structured)).not.toContain(MARKER);
    expect(result.body.length).toBeLessThanOrEqual(INDEX_BOUNDS.digestBytes);
    // The summary names 12 of the 400 entries.
    const summary = indexOf(result);
    expect(summary?.kind).toBe('file-roles');
    if (summary?.kind === 'file-roles') {
      expect(summary.shown).toBe(INDEX_BOUNDS.paths);
      expect(summary.total).toBe(400);
    }
  });

  it('keeps it out of the served /documents HTML and the search index', async () => {
    const repository = new PlanningRepository(new InMemoryPlanningFilesystem(FILES), '/host');
    await repository.load();
    const app = createApp(repository, true, '.', NO_COMMITS);
    await new Promise((resolve) => setImmediate(resolve));
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const intel = presentation.artifacts.find((artifact) => artifact.path === '.planning/intel/file-roles.json');
    expect(intel).toBeDefined();
    expect(JSON.stringify(presentation)).not.toContain(MARKER);

    const served = await app.request(`/api/documents?route=${encodeURIComponent(intel?.key ?? '')}`);
    expect(served.status).toBe(200);
    expect(await served.text()).not.toContain(MARKER);

    const search = await app.request(`/api/search?q=${MARKER}`);
    const hits = (await search.json()) as { status: string; total: number; results: unknown[] };
    expect(hits.status).toBe('ready');
    expect(hits.total).toBe(0);
    expect(hits.results).toEqual([]);
    // Control: the digest of labels is indexed, so a path the summary names is found.
    const control = (await (await app.request('/api/search?q=module0')).json()) as { total: number };
    expect(control.total).toBeGreaterThan(0);
  });
});

describe('a file that cannot be read', () => {
  it('gives invalid JSON no structured.index, an empty body, empty frontmatter and a warning, never a throw', () => {
    const text = `{ "entries": { "${MARKER}": `;
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}stack.json`, text), refOf(`${INTEL}stack.json`));
    expect(indexOf(result)).toBeUndefined();
    expect(result.body).toBe('');
    expect(result.frontmatter).toEqual({});
    expect(result.warning?.stage).toBe('structured-extraction');
  });

  it('survives a top-level array and a scalar', () => {
    for (const text of ['[1,2,3]', '42', 'null', '"text"']) {
      const result = IndexIntelHandler.parse(rawOf(`${INTEL}stack.json`, text), refOf(`${INTEL}stack.json`));
      expect(result.body.length).toBeLessThanOrEqual(INDEX_BOUNDS.digestBytes);
    }
  });

  it('ignores prototype keys an intel file plants', () => {
    const text = '{"__proto__":{"polluted":true},"frameworks":["Fastify"],"constructor":{"x":1}}';
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}stack.json`, text), refOf(`${INTEL}stack.json`));
    expect((indexOf(result) as StackSummary).frameworks.items).toEqual(['Fastify']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------
// Task 3: every other intel kind, the ingest-docs markdown family and unknown files
// ---------------------------------------------------------------------------------------------------------

function parseLendshed(name: string): { summary: IntelSummary; body: string; frontmatter: Record<string, unknown> } {
  const path = `${INTEL}${name}`;
  const result = IndexIntelHandler.parse(rawOf(path, lendshed(`intel/${name}`)), refOf(path));
  return { summary: indexOf(result) as IntelSummary, body: result.body, frontmatter: result.frontmatter };
}

function summaryOf<K extends IntelSummary['kind']>(summary: IntelSummary, kind: K): Extract<IntelSummary, { kind: K }> {
  expect(summary.kind).toBe(kind);
  return summary as Extract<IntelSummary, { kind: K }>;
}

describe('file-roles.json', () => {
  it('gives the type split and at most 12 paths grouped by folder with the total kept', () => {
    const { summary, body } = parseLendshed('file-roles.json');
    const roles = summaryOf(summary, 'file-roles');
    const entries = (JSON.parse(lendshed('intel/file-roles.json')) as { entries: Record<string, unknown> }).entries;
    expect(roles.total).toBe(Object.keys(entries).length);
    expect(roles.shown).toBe(INDEX_BOUNDS.paths);
    expect(roles.groups.reduce((n, g) => n + g.files.length, 0)).toBe(INDEX_BOUNDS.paths);
    expect(roles.groups.map((g) => g.folder)).toContain('src/server/routes');
    expect(roles.types.items.reduce((n, row) => n + row.count, 0)).toBe(roles.total);
    expect(roles.types.items.find((row) => row.label === 'module')?.count).toBeGreaterThan(1);
    expect(body).toContain(`${INDEX_BOUNDS.paths} of ${roles.total} entries`);
  });
});

describe('api-map.json', () => {
  it('gives method counts and at most 6 routes with the total kept', () => {
    const { summary, body } = parseLendshed('api-map.json');
    const api = summaryOf(summary, 'api-map');
    expect(api.total).toBe(8);
    expect(api.shown).toBe(INDEX_BOUNDS.routes);
    expect(api.routes).toHaveLength(6);
    expect(api.routes[0]).toEqual({
      method: 'GET',
      path: '/api/sheds',
      description: 'List every shed with its live stock count',
      file: 'src/server/routes/sheds.ts',
    });
    expect(Object.fromEntries(api.methods.items.map((row) => [row.label, row.count]))).toEqual({ POST: 4, GET: 3, DELETE: 1 });
    expect(body).toContain('6 of 8 routes');
  });

  it('reads a route whose entry is missing its method and path from its key', () => {
    const text = JSON.stringify({ entries: { 'PATCH /api/x': { description: 'edit x' } } });
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}api-map.json`, text), refOf(`${INTEL}api-map.json`));
    const api = summaryOf(indexOf(result) as IntelSummary, 'api-map');
    expect(api.routes[0]).toMatchObject({ method: 'PATCH', path: '/api/x', file: null });
  });
});

describe('dependency-graph.json', () => {
  it('splits production from development and orders the dependencies by used_by length, then name', () => {
    const { summary } = parseLendshed('dependency-graph.json');
    const deps = summaryOf(summary, 'dependency-graph');
    expect(deps).toMatchObject({ total: 8, production: 4, development: 4, other: 0, shown: 8 });
    expect(deps.dependencies.map((d) => d.name)).toEqual([
      'fastify',
      'typescript',
      'better-sqlite3',
      'eslint',
      'react',
      'react-router',
      'vite',
      'vitest',
    ]);
    expect(deps.dependencies[0]).toEqual({ name: 'fastify', version: '^5.1.0', type: 'production', usedBy: 2 });
  });

  it('keeps 8 of many', () => {
    const entries: Record<string, unknown> = {};
    for (let i = 0; i < 50; i += 1) entries[`pkg${i}`] = { type: i % 2 ? 'production' : 'development', used_by: Array(i % 5).fill('x') };
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}dependency-graph.json`, JSON.stringify({ entries })), refOf(`${INTEL}dependency-graph.json`));
    const deps = summaryOf(indexOf(result) as IntelSummary, 'dependency-graph');
    expect(deps.dependencies).toHaveLength(INDEX_BOUNDS.dependencies);
    expect(deps.total).toBe(50);
    expect(deps.production + deps.development).toBe(50);
  });
});

describe('arch-decisions.json', () => {
  it('names every key and quotes the overview pattern as layers, as written', () => {
    const { summary } = parseLendshed('arch-decisions.json');
    const arch = summaryOf(summary, 'arch-decisions');
    expect(arch.keys.total).toBe(7);
    expect(arch.keys.items).toEqual(['overview', 'data-flow', 'conventions', 'component:SessionStore', 'component:LoanLedger', 'component:Catalogue', 'security']);
    expect(arch.layers).toEqual(['Browser', 'Fastify API', 'SQLite']);
  });
});

describe('.last-refresh.json', () => {
  it('is a stamp and keeps its date only', () => {
    const { summary, body, frontmatter } = parseLendshed('.last-refresh.json');
    expect(summaryOf(summary, 'stamp').date).toBe('2026-09-14T09:13:02.000Z');
    expect(body).not.toContain('3f1c9a7b');
    expect(JSON.stringify(frontmatter)).not.toContain('3f1c9a7b');
  });
});

describe('an intel file the writer did not define', () => {
  it('shows its top-level key names and never a value', () => {
    const text = JSON.stringify({ alpha: 'VALUE-ONE-SECRET', beta: { inner: 'VALUE-TWO-SECRET' }, gamma: ['VALUE-THREE-SECRET'] });
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}notes.json`, text), refOf(`${INTEL}notes.json`));
    const summary = summaryOf(indexOf(result) as IntelSummary, 'unknown');
    expect(summary.keys).toEqual({ items: ['alpha', 'beta', 'gamma'], total: 3 });
    for (const surface of [result.body, JSON.stringify(result.structured), JSON.stringify(result.frontmatter)]) {
      expect(surface).not.toContain('VALUE-');
      expect(surface).not.toContain('inner');
    }
    expect(result.body).toContain('alpha, beta, gamma');
  });

  it('shows a graph file by key names too, and a markdown report by heading names', () => {
    const graph = IndexIntelHandler.parse(
      rawOf('.planning/graphs/graph.json', '{"nodes":[{"id":"SECRETNODE"}],"links":[]}'),
      refOf('.planning/graphs/graph.json', 'graph'),
    );
    expect(summaryOf(indexOf(graph) as IntelSummary, 'unknown').keys.items).toEqual(['nodes', 'links']);
    expect(graph.body).not.toContain('SECRETNODE');
    const report = IndexIntelHandler.parse(
      rawOf('.planning/graphs/GRAPH_REPORT.md', lendshed('graphs/GRAPH_REPORT.md')),
      refOf('.planning/graphs/GRAPH_REPORT.md', 'graph'),
    );
    const names = summaryOf(indexOf(report) as IntelSummary, 'unknown').keys.items;
    expect(names).toContain('Summary');
    expect(names.some((name) => name.startsWith('God Nodes'))).toBe(true);
    expect(report.body).not.toContain('Which of the loan routes');
    expect(report.body.length).toBeLessThanOrEqual(INDEX_BOUNDS.digestBytes);
  });
});

describe('the ingest-docs markdown family', () => {
  interface Loaded {
    structured: Record<string, unknown>;
    body: string;
  }

  async function loaded(): Promise<Record<string, Loaded>> {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    try {
      writeIngestDocsProject(dir);
      const snapshot = await new PlanningRepository(new LocalFsPlanningFilesystem(dir), dir).load();
      return (snapshot.project?.artifacts ?? {}) as unknown as Record<string, Loaded>;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('lifts SYNTHESIS.md to a document count, classifications and the three conflict buckets', async () => {
    const artifacts = await loaded();
    const synthesis = summaryOf(artifacts['.planning/intel/SYNTHESIS.md'].structured.index as IntelSummary, 'synthesis');
    expect(synthesis).toEqual({ kind: 'synthesis', documents: 5, classifications: 3, conflicts: { blockers: 1, competing: 2, autoResolved: 3 } });
    expect(artifacts['.planning/intel/SYNTHESIS.md'].body).toContain('1 blockers, 2 competing variants, 3 auto-resolved');
  });

  it('reads the return-message wording (variants) as competing', () => {
    const text = 'Docs synthesized: 4\nConflicts: 0 blockers, 6 variants, 1 auto-resolved\n';
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}SYNTHESIS.md`, text), refOf(`${INTEL}SYNTHESIS.md`));
    expect(summaryOf(indexOf(result) as IntelSummary, 'synthesis').conflicts).toEqual({ blockers: 0, competing: 6, autoResolved: 1 });
  });

  it('gives no buckets and no throw for a conflicts line it cannot read', () => {
    for (const text of ['Conflicts: several, mostly fine\n', 'Conflicts:\n', '# Synthesis\nno summary line at all\n', '']) {
      const result = IndexIntelHandler.parse(rawOf(`${INTEL}SYNTHESIS.md`, text), refOf(`${INTEL}SYNTHESIS.md`));
      const synthesis = summaryOf(indexOf(result) as IntelSummary, 'synthesis');
      expect(synthesis.conflicts).toBeNull();
      expect(result.warning).toBeUndefined();
    }
  });

  it('lifts decisions, requirements, constraints and context to a heading count and status counts only', async () => {
    const artifacts = await loaded();
    const index = (name: string): IntelSummary => artifacts[`.planning/intel/${name}`].structured.index as IntelSummary;
    expect(summaryOf(index('decisions.md'), 'ingest-doc')).toEqual({ kind: 'ingest-doc', entries: 3, locked: 2, proposed: 1 });
    expect(summaryOf(index('requirements.md'), 'ingest-doc')).toMatchObject({ entries: 2, locked: 0, proposed: 0 });
    expect(summaryOf(index('constraints.md'), 'ingest-doc').entries).toBe(1);
    expect(summaryOf(index('context.md'), 'ingest-doc').entries).toBe(1);
    for (const path of Object.keys(artifacts)) {
      if (!path.startsWith('.planning/intel/')) continue;
      expect(artifacts[path].body).not.toContain('docs/adr/');
      expect(artifacts[path].body.length).toBeLessThanOrEqual(INDEX_BOUNDS.digestBytes);
    }
  });
});

describe('every summary stays small for a planted 5,000-entry file', () => {
  const keyed = (make: (i: number) => unknown): string => {
    const entries: Record<string, unknown> = {};
    for (let i = 0; i < 5_000; i += 1) entries[`entry-${i}-${'k'.repeat(60)}`] = make(i);
    return JSON.stringify({ _meta: { version: 1 }, entries });
  };
  const longList = Array.from({ length: 5_000 }, (_, i) => `Item ${i} ${'w'.repeat(200)}`);
  const CASES: [string, string][] = [
    ['stack.json', JSON.stringify({ languages: longList, frameworks: longList, tools: longList, content_formats: longList, build_system: 'b'.repeat(900) })],
    ['file-roles.json', keyed((i) => ({ type: `type-${i}`, exports: [], imports: [] }))],
    ['api-map.json', keyed((i) => ({ method: 'GET', path: `/api/${i}/${'p'.repeat(300)}`, description: 'd'.repeat(600), file: 'f'.repeat(300) }))],
    ['dependency-graph.json', keyed((i) => ({ version: '1.0.0', type: i % 2 ? 'production' : 'development', used_by: ['a', 'b'] }))],
    ['arch-decisions.json', keyed(() => ({ description: 'x' }))],
    ['notes.json', JSON.stringify(Object.fromEntries(longList.map((item) => [item, 1])))],
  ];

  it.each(CASES)('%s', (name, text) => {
    const result = IndexIntelHandler.parse(rawOf(`${INTEL}${name}`, text), refOf(`${INTEL}${name}`));
    expect(indexOf(result)).toBeDefined();
    expect(JSON.stringify(result.structured).length).toBeLessThan(4 * 1024);
    expect(result.body.length).toBeLessThanOrEqual(INDEX_BOUNDS.digestBytes);
    expect(result.body).not.toContain('Item 4999');
  });
});
