// Phase 11 (11-18, VIEW-19, D-04): the Indexes page's server-side join and its pure composer. The join reads only
// the bounded summaries (structured.index and the graph summary), orders the tiles as UI-SPEC section 4 does, opens
// the tile an address names and draws a ghost for a project with no graphs/ folder; the composer turns it into the
// grid with the Graph tile's counts and two status chips, so a stale graph whose last update failed reads as two
// facts (the last good counts, the chip), and into nothing when there is no context.
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
  buildIndexesContext,
  firstTileUrl,
  graphArtifactsOf,
  tileKeyOfPath,
} from '../../src/presentation/indexes-context.ts';
import type { IndexesContext } from '../../src/presentation/indexes-context.ts';
import type { GraphSummary } from '../../src/server/index-summary.ts';
import { composeIndexes } from '../../src/web/views/indexes-page.ts';
import type { ComposedIndexes, ComposedIndexesBody } from '../../src/web/views/indexes-page.ts';
import { IndexesView, indexesHeaderProps } from '../../src/web/views/indexes-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
import { writeIngestDocsProject } from '../helpers/index-fixtures.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const EMPTY_INPUT: ViewInput = { kind: 'graph', frontmatter: {}, structured: {}, groups: [], planSegments: [] };

function graphSummary(over: Partial<GraphSummary> = {}): GraphSummary {
  return {
    counts: { nodes: 41_280, links: 96_514, communities: 2_310 },
    countsFrom: 'report',
    countsRead: true,
    hubs: [],
    thinCommunities: null,
    importCycles: null,
    extraction: [],
    reportDate: null,
    reportLines: ['41,280 nodes · 96,514 edges'],
    status: { state: 'failed', exitCode: 1, durationMs: 8_231, headAtBuild: null, at: '2026-04-21T08:40:02Z' },
    builtAtCommit: '3f1e2a0c9d1b',
    commitsBehind: 12,
    unreadable: [],
    notSent: [],
    notSentTotal: 0,
    ...over,
  };
}

describe('tileKeyOfPath', () => {
  it('maps every graphs/ file to Graph, each intel file to its tile and the stamp and unknown files to none', () => {
    expect(tileKeyOfPath('.planning/graphs/graph.json')).toBe('graph');
    expect(tileKeyOfPath('.planning/graphs/GRAPH_REPORT.md')).toBe('graph');
    expect(tileKeyOfPath('.planning/intel/arch-decisions.json')).toBe('architecture');
    expect(tileKeyOfPath('.planning/intel/stack.json')).toBe('stack');
    expect(tileKeyOfPath('.planning/intel/file-roles.json')).toBe('file-roles');
    expect(tileKeyOfPath('.planning/intel/api-map.json')).toBe('api-map');
    expect(tileKeyOfPath('.planning/intel/dependency-graph.json')).toBe('dependencies');
    expect(tileKeyOfPath('.planning/intel/SYNTHESIS.md')).toBe('synthesis');
    expect(tileKeyOfPath('.planning/intel/decisions.md')).toBe('synthesis');
    expect(tileKeyOfPath('.planning/intel/.last-refresh.json')).toBeNull();
    expect(tileKeyOfPath('.planning/intel/other.json')).toBe('file:other.json');
    expect(tileKeyOfPath('.planning/intel/classifications/a.json')).toBeNull();
    expect(tileKeyOfPath('.planning/intel/diagram.png')).toBeNull();
    expect(tileKeyOfPath('.planning/PROJECT.md')).toBeNull();
  });
});

describe('buildIndexesContext over Lendshed', () => {
  it("orders Graph, Architecture, Stack, File roles, API surface and Dependencies and opens the address's tile", async () => {
    const { presentation } = await loadProject(FX_ROOT);
    const context = buildIndexesContext(presentation, '.planning/graphs/graph.json', null);
    expect(context?.tiles.map((tile) => tile.key)).toEqual([
      'graph',
      'architecture',
      'stack',
      'file-roles',
      'api-map',
      'dependencies',
    ]);
    expect(context?.openKey).toBe('graph');
    expect(context?.intelFiles).toBe(5);
    expect(context?.refreshed).toBe('2026-09-14T09:13:02.000Z');
    expect(context?.tiles.filter((tile) => tile.key !== 'graph').every((tile) => tile.state === 'ok')).toBe(true);
    // The stamp opens the page with no tile open.
    expect(buildIndexesContext(presentation, '.planning/intel/.last-refresh.json', null)?.openKey).toBeNull();
    expect(graphArtifactsOf(presentation).map((file) => file.path)).toEqual([
      '.planning/graphs/.last-build-status.json',
      '.planning/graphs/GRAPH_REPORT.md',
      '.planning/graphs/graph.json',
    ]);
  });

  it("leads the bare /indexes to the Graph tile's own file address", async () => {
    const { presentation } = await loadProject(FX_ROOT);
    expect(firstTileUrl(buildIndexesContext(presentation, null, null))).toBe('/graphs/graph.json');
  });

  it('is null for a project with no intel and no graphs', async () => {
    const { presentation } = await loadProject(SHAPES_ROOT);
    expect(buildIndexesContext(presentation, null, null)).toBeNull();
    expect(firstTileUrl(null)).toBeNull();
  });
});

describe('buildIndexesContext over an ingest-docs project', () => {
  it('orders Synthesis, Graph, draws the Graph ghost and lists the ingest documents', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    try {
      writeIngestDocsProject(dir);
      const { presentation } = await loadProject(dir);
      const context = buildIndexesContext(presentation, '.planning/intel/decisions.md', null);
      expect(context?.tiles.map((tile) => `${tile.key}:${tile.state}`)).toEqual(['synthesis:ok', 'graph:not-built']);
      expect(context?.openKey).toBe('synthesis');
      expect(context?.tiles[0].documents.map((document) => document.name)).toEqual([
        'constraints.md',
        'context.md',
        'decisions.md',
        'requirements.md',
      ]);
      expect(firstTileUrl(context)).toBe('/intel/SYNTHESIS.md');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('composeIndexes', () => {
  async function lendshedContext(graph: GraphSummary | null, activePath = '.planning/graphs/graph.json'): Promise<IndexesContext> {
    const { presentation } = await loadProject(FX_ROOT);
    const context = buildIndexesContext(presentation, activePath, graph);
    if (context === null) throw new Error('Lendshed holds index files');
    return context;
  }

  it('composes nothing without a context, so the promoted sections render with no notice', () => {
    expect(composeIndexes(EMPTY_INPUT)).toBeNull();
    expect(composeIndexes({ ...EMPTY_INPUT, indexesContext: null })).toBeNull();
  });

  it('reads a stale graph whose last update failed as two facts: the last good counts and two chips', async () => {
    const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: await lendshedContext(graphSummary(), '.planning/intel/stack.json') });
    const graph = model?.tiles.find((tile) => tile.key === 'graph');
    expect(graph?.figure).toMatchObject({
      kind: 'graph',
      counts: [
        { value: '41,280', word: 'nodes' },
        { value: '96,514', word: 'edges' },
      ],
      countsLabel: null,
      chips: [
        { label: '12 commits behind', tone: 'in-flight' },
        { label: 'Last update failed', tone: 'missing' },
      ],
    });
    expect(graph?.open).toBe(false);
    expect(graph?.panel).toBeNull();
    expect(model?.tiles.find((tile) => tile.key === 'stack')?.open).toBe(true);
  });

  it('says "1 commit behind" for one, no commits chip for none and no failed chip for an ok build', async () => {
    const one = composeIndexes({ ...EMPTY_INPUT, indexesContext: await lendshedContext(graphSummary({ commitsBehind: 1 })) });
    expect(one?.tiles[0].figure).toMatchObject({ chips: [{ label: '1 commit behind' }, { label: 'Last update failed' }] });
    const ok = composeIndexes({
      ...EMPTY_INPUT,
      indexesContext: await lendshedContext(
        graphSummary({
          commitsBehind: 0,
          status: { state: 'ok', exitCode: 0, durationMs: 1_000, headAtBuild: null, at: '2026-04-21T08:40:02Z' },
        }),
      ),
    });
    expect(ok?.tiles[0].figure).toMatchObject({ chips: [] });
  });

  it('shows "Counts not read" when the summary holds no counts and when there is no summary at all', async () => {
    const none = composeIndexes({
      ...EMPTY_INPUT,
      indexesContext: await lendshedContext(
        graphSummary({ counts: null, countsFrom: null, countsRead: false, status: null, commitsBehind: null }),
      ),
    });
    expect(none?.tiles[0].figure).toMatchObject({ kind: 'graph', counts: [], countsLabel: 'Counts not read', chips: [] });
    const missing = composeIndexes({ ...EMPTY_INPUT, indexesContext: await lendshedContext(null) });
    expect(missing?.tiles[0].figure).toMatchObject({ kind: 'graph', countsLabel: 'Counts not read' });
  });

  it('opens the Graph panel with the three counts, the freshness cells and the report lines', async () => {
    const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: await lendshedContext(graphSummary()) });
    const panel = model?.tiles[0].panel;
    const body = panel?.body;
    if (body?.kind !== 'graph') throw new Error('the Graph tile opens the graph panel');
    expect(model?.openKey).toBe('graph');
    expect(body.counts.map((count) => count.word)).toEqual(['nodes', 'edges', 'communities']);
    expect(body.cells.map((cell) => [cell.key, cell.tone])).toEqual([
      ['built', 'in-flight'],
      ['update', 'missing'],
    ]);
    expect(body.cells[0]).toMatchObject({ label: 'Built from', value: '3f1e2a0', note: '12 commits behind' });
    expect(body.cells[1]).toMatchObject({ label: 'Last auto-update', value: 'failed · exit 1' });
    expect(body.reportLines).toEqual(['41,280 nodes · 96,514 edges']);
    expect(panel?.foot).toMatchObject({ path: '.planning/graphs/graph.json' });
  });

  it("counts a good build's age to the day the project was read", async () => {
    const context = await lendshedContext(
      graphSummary({ status: { state: 'ok', exitCode: 0, durationMs: 2_000, headAtBuild: null, at: '2026-04-21T08:40:02Z' } }),
    );
    const read = { ...context, readAt: '2026-04-23T20:40:02Z' };
    const body = composeIndexes({ ...EMPTY_INPUT, indexesContext: read })?.tiles[0].panel?.body;
    const cells = body?.kind === 'graph' ? body.cells : [];
    expect(cells.find((cell) => cell.key === 'good')).toMatchObject({ value: '2026-04-21', note: '2 days ago' });
    expect(cells.find((cell) => cell.key === 'update')).toMatchObject({ tone: 'complete', value: 'ok · exit 0' });
  });

  it('draws the Not built ghost with no address and states the facts line', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    try {
      writeIngestDocsProject(dir);
      const { presentation } = await loadProject(dir);
      const context = buildIndexesContext(presentation, '.planning/intel/SYNTHESIS.md', null);
      const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: context });
      const ghost = model?.tiles.find((tile) => tile.key === 'graph');
      expect(ghost).toMatchObject({ ghost: true, to: null, path: null, open: false, figure: { kind: 'ghost', text: 'Not built' } });
      expect(model?.head).toMatchObject({ eyebrow: 'Exploration · Indexes', title: 'Indexes' });
      expect(model?.head.facts).toEqual(['1 intel file', 'No graph']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("opens an ingest-docs project on Synthesis with the file's own conflict words beside the Not built graph", async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    try {
      writeIngestDocsProject(dir);
      const { presentation } = await loadProject(dir);
      const context = buildIndexesContext(presentation, '.planning/intel/SYNTHESIS.md', null);
      const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: context });
      expect(model?.tiles.map((tile) => `${tile.key}${tile.ghost ? ':ghost' : ''}`)).toEqual(['synthesis', 'graph:ghost']);
      expect(model?.openKey).toBe('synthesis');
      expect(model?.tiles[0].figure).toEqual({
        kind: 'count',
        count: { value: '5', word: 'documents' },
        split: null,
        tags: [],
        chips: [
          { label: '1 blocker', tone: 'missing' },
          { label: '2 competing variants', tone: 'in-flight' },
          { label: '3 auto-resolved', tone: 'quiet' },
        ],
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes the Lendshed facts line: five intel files, one graph and the refresh date', async () => {
    const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: await lendshedContext(null) });
    expect(model?.head.facts).toEqual(['5 intel files', '1 graph', 'Intel refreshed 2026-09-14']);
  });
});

// ---------------------------------------------------------------------------------------------------------
// 11-19: every tile and panel, the unreadable and generic tiles, the words
// ---------------------------------------------------------------------------------------------------------

async function lendshedModel(activePath: string, graph: GraphSummary | null = null): Promise<ComposedIndexes> {
  const { presentation } = await loadProject(FX_ROOT);
  const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: buildIndexesContext(presentation, activePath, graph) });
  if (model === null) throw new Error('Lendshed holds index files');
  return model;
}

function openBody(model: ComposedIndexes): ComposedIndexesBody {
  const body = model.tiles.find((tile) => tile.open)?.panel?.body;
  if (body === undefined) throw new Error('a tile is open');
  return body;
}

const render = (node: React.ReactElement): string => renderToStaticMarkup(createElement(MemoryRouter, null, node));
const textOf = (markup: string): string => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('composeIndexes: the key figure of every Lendshed tile', () => {
  it('draws the layer stack, the framework chips and a big count with a split bar, method tags or a production split', async () => {
    const model = await lendshedModel('.planning/graphs/graph.json');
    const figure = (key: string) => model.tiles.find((tile) => tile.key === key)?.figure;
    expect(figure('architecture')).toEqual({ kind: 'layers', layers: ['Browser', 'Fastify API', 'SQLite'] });
    expect(figure('stack')).toEqual({ kind: 'tags', tags: { items: ['Fastify', 'React'], more: 0 } });
    expect(figure('file-roles')).toMatchObject({
      kind: 'count',
      count: { value: '13', word: 'entries' },
      split: { parts: expect.arrayContaining([expect.objectContaining({ label: 'module', value: 6 })]) },
    });
    expect(figure('api-map')).toMatchObject({ kind: 'count', count: { value: '8', word: 'routes' }, tags: ['POST 4', 'GET 3', 'DELETE 1'] });
    expect(figure('dependencies')).toMatchObject({
      kind: 'count',
      count: { value: '8', word: 'dependencies' },
      split: { name: '4 production, 4 development' },
    });
    // The grid spans: Graph, File roles and Dependencies are two columns wide.
    expect(model.tiles.map((tile) => `${tile.key}:${tile.span}`)).toEqual([
      'graph:2',
      'architecture:1',
      'stack:1',
      'file-roles:2',
      'api-map:1',
      'dependencies:2',
    ]);
  });

  it('never gives a split bar a part with no count, and gives each bar one accessible name', async () => {
    const model = await lendshedModel('.planning/intel/file-roles.json');
    const body = openBody(model);
    if (body.kind !== 'file-roles' || body.split === null) throw new Error('file roles open with a split');
    expect(body.split.parts.every((part) => part.value > 0)).toBe(true);
    expect(body.split.name).toBe('6 module, 2 entry-point, 1 config, 1 script, 1 style, 1 test, 1 type-def');
    const total = body.split.parts.reduce((sum, part) => sum + part.share, 0);
    expect(Math.round(total)).toBe(100);
  });
});

describe('composeIndexes: every open panel', () => {
  it('Architecture lists every key as a row; Stack lists each list then build, tests and packages', async () => {
    const arch = openBody(await lendshedModel('.planning/intel/arch-decisions.json'));
    expect(arch).toMatchObject({ kind: 'architecture', layers: ['Browser', 'Fastify API', 'SQLite'], keysLabel: '7 of 7 keys' });
    const stack = openBody(await lendshedModel('.planning/intel/stack.json'));
    if (stack.kind !== 'stack') throw new Error('stack panel');
    expect(stack.groups.map((group) => group.label)).toEqual(['Languages', 'Frameworks', 'Tools', 'Content formats']);
    expect(stack.facts).toEqual([
      { label: 'Build', value: 'npm scripts' },
      { label: 'Tests', value: 'Vitest' },
      { label: 'Packages', value: 'npm' },
    ]);
  });

  it('File roles and API surface say "{shown} of {n} entries" and "{shown} of {n} routes"', async () => {
    const roles = openBody(await lendshedModel('.planning/intel/file-roles.json'));
    if (roles.kind !== 'file-roles') throw new Error('file roles panel');
    expect(roles.shownLabel).toBe('12 of 13 entries');
    expect(roles.folders[0]).toMatchObject({ folder: 'src/server' });
    const api = openBody(await lendshedModel('.planning/intel/api-map.json'));
    if (api.kind !== 'api-map') throw new Error('api panel');
    expect(api.shownLabel).toBe('6 of 8 routes');
    expect(api.routes).toHaveLength(6);
    expect(api.routes[0]).toMatchObject({ method: 'GET', path: '/api/sheds', file: 'src/server/routes/sheds.ts' });
  });

  it('Dependencies draw the production and development split, then the most used with bars scaled to the longest', async () => {
    const deps = openBody(await lendshedModel('.planning/intel/dependency-graph.json'));
    if (deps.kind !== 'dependencies') throw new Error('dependency panel');
    expect(deps.split?.name).toBe('4 production, 4 development');
    expect(deps.rows[0]).toMatchObject({ label: 'fastify ^5.1.0', value: '2', share: 100 });
    expect(deps.rows[2]).toMatchObject({ share: 50 });
    expect(deps.shownLabel).toBe('8 of 8 dependencies');
  });

  it('the Graph panel shows four counts, three freshness cells, how the edges were found, the hubs and what is not sent', async () => {
    const graph = graphSummary({
      thinCommunities: 412,
      importCycles: 2,
      extraction: [
        { label: 'EXTRACTED', percent: 84 },
        { label: 'INFERRED', percent: 15 },
        { label: 'AMBIGUOUS', percent: 1 },
      ],
      reportDate: '2026-04-18',
      hubs: [
        { id: 'LoanService', label: null, degree: 612 },
        { id: 'db()', label: 'db', degree: 306 },
      ],
      notSent: [
        { path: '.planning/graphs/.last-build-snapshot.json', sizeBytes: 58_900_000 },
        { path: '.planning/graphs/graph.html', sizeBytes: 1_900_000 },
      ],
      notSentTotal: 3,
    });
    const body = openBody(await lendshedModel('.planning/graphs/graph.json', graph));
    if (body.kind !== 'graph') throw new Error('graph panel');
    expect(body.counts.map((count) => `${count.value} ${count.word}`)).toEqual([
      '41,280 nodes',
      '96,514 edges',
      '2,310 communities (412 thin)',
      '2 import cycles',
    ]);
    expect(body.cells.map((cell) => cell.label)).toEqual(['Built from', 'Last good build', 'Last auto-update']);
    expect(body.cells[1]).toMatchObject({ value: '2026-04-18' });
    expect(body.extraction).toMatchObject({ name: '84% EXTRACTED, 15% INFERRED, 1% AMBIGUOUS', suffix: '%' });
    expect(body.hubs?.title).toBe('Most connected (top 2 of 41,280)');
    expect(body.hubs?.bars).toEqual([
      { label: 'LoanService', value: '612', share: 100 },
      { label: 'db', value: '306', share: 50 },
    ]);
    expect(body.notSent?.files.map((file) => file.name)).toEqual(['graph.json', '.last-build-snapshot.json', 'graph.html']);
    expect(body.notSent?.more).toBe(1);
  });

  it('says "1 import cycle" for one and omits the cycle count when the report has no such section', async () => {
    const one = openBody(await lendshedModel('.planning/graphs/graph.json', graphSummary({ importCycles: 1 })));
    if (one.kind !== 'graph') throw new Error('graph panel');
    expect(one.counts.at(-1)).toEqual({ value: '1', word: 'import cycle' });
    const none = openBody(await lendshedModel('.planning/graphs/graph.json', graphSummary()));
    if (none.kind !== 'graph') throw new Error('graph panel');
    expect(none.counts.map((count) => count.word)).toEqual(['nodes', 'edges', 'communities']);
  });
});

describe('composeIndexes: files that are not what the page expected', () => {
  function copy(): string {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-indexes-page-'));
    cpSync(FX_ROOT, dir, { recursive: true });
    return dir;
  }
  function plant(dir: string, relative: string, text: string): void {
    const target = join(dir, '.planning', relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
  }

  it('shows an unreadable stack tile with the Unreadable chip and its path while the other tiles render', async () => {
    const dir = copy();
    try {
      plant(dir, 'intel/stack.json', '{ not json');
      plant(dir, 'intel/notes.json', '{"alpha":{"v":"SECRET-VALUE"},"beta":1}');
      const { presentation } = await loadProject(dir);
      const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: buildIndexesContext(presentation, '.planning/intel/stack.json', null) });
      const stack = model?.tiles.find((tile) => tile.key === 'stack');
      expect(stack).toMatchObject({ path: '.planning/intel/stack.json', figure: { kind: 'unreadable' }, open: true });
      expect(stack?.panel?.body).toEqual({ kind: 'unreadable' });
      expect(model?.tiles.find((tile) => tile.key === 'architecture')?.figure).toMatchObject({ kind: 'layers' });
      const notes = model?.tiles.find((tile) => tile.key === 'file:notes.json');
      expect(notes?.figure).toEqual({ kind: 'line', text: '2 keys' });
      const markup = render(createElement(IndexesView, { model: model! }));
      expect(markup).toContain('Unreadable');
      expect(markup).toContain('.planning/intel/stack.json');
      expect(markup).not.toContain('SECRET-VALUE');
      // The generic tile opens to its key names only.
      const opened = composeIndexes({ ...EMPTY_INPUT, indexesContext: buildIndexesContext(presentation, '.planning/intel/notes.json', null) });
      const body = opened?.tiles.find((tile) => tile.open)?.panel?.body;
      expect(body).toEqual({ kind: 'generic', keys: { items: ['alpha', 'beta'], more: 0 }, keysLabel: '2 of 2 keys' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('shows the Unreadable chip on a Graph tile whose own file could not be read and has no counts', async () => {
    const model = await lendshedModel(
      '.planning/intel/stack.json',
      graphSummary({
        counts: null,
        countsFrom: null,
        countsRead: false,
        status: null,
        commitsBehind: null,
        unreadable: [{ path: '.planning/graphs/graph.json', reason: 'invalid' }],
      }),
    );
    expect(model.tiles[0].figure).toEqual({ kind: 'unreadable' });
  });
});

describe('IndexesView markup', () => {
  it('draws each closed tile as a button with aria-expanded and aria-controls, one Close for the open one, and a non-focusable ghost', async () => {
    const model = await lendshedModel('.planning/graphs/graph.json', graphSummary());
    const markup = render(createElement(IndexesView, { model }));
    expect((markup.match(/<button[^>]*aria-expanded="false"[^>]*aria-controls="/g) ?? []).length).toBe(5);
    expect(markup).toContain('aria-label="Close Graph"');
    expect((markup.match(/aria-label="Close /g) ?? []).length).toBe(1);
    expect(markup).toContain('role="img" aria-label="41,280 nodes, 96,514 edges, 2,310 communities"');
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    try {
      writeIngestDocsProject(dir);
      const { presentation } = await loadProject(dir);
      const ingest = composeIndexes({ ...EMPTY_INPUT, indexesContext: buildIndexesContext(presentation, '.planning/intel/SYNTHESIS.md', null) });
      const html = render(createElement(IndexesView, { model: ingest! }));
      expect(html).toContain('data-ghost="true"');
      const ghost = html.slice(html.indexOf('data-ghost="true"') - 60, html.indexOf('Not built') + 12);
      expect(ghost).not.toContain('<button');
      expect(ghost).not.toContain('tabindex');
      expect(textOf(html)).toContain('Not built');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes "Not sent to this page" with each big file and its size, and the header eyebrow', async () => {
    const model = await lendshedModel(
      '.planning/graphs/graph.json',
      graphSummary({ notSent: [{ path: '.planning/graphs/graph.html', sizeBytes: 1_900_000 }], notSentTotal: 1 }),
    );
    const text = textOf(render(createElement(IndexesView, { model })));
    expect(text).toContain('Not sent to this page graph.json');
    expect(text).toContain('graph.html 1.8 MB');
    expect(indexesHeaderProps(model).eyebrow).toBe('Exploration · Indexes');
  });
});

// ---------------------------------------------------------------------------------------------------------
// The view contract: source-text checks in the spikes-page idiom (no AST tooling). Comments are stripped before
// every negative check.
// ---------------------------------------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-11-indexes:start */';
const END = '/* phase-11-indexes:end */';
const COMPOSER = 'src/web/views/indexes-page.ts';
const COMPONENTS = 'src/web/views/indexes-page-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-1)', 'inherit'];

function stripSourceComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) ||
    /data-tone="(destructive|warning)"/.test(text) ||
    /'(destructive|warning)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning)'/.test(text)
  );
}

function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  if (/@keyframes/.test(block)) found.push('keyframes');
  if (/\banimation\b/.test(block)) found.push('animation');
  if (/\btransition\b/.test(block)) found.push('transition');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1]!.trim());
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('indexes view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });
});

describe('indexes view contract - the real sources', () => {
  it('the components render no raw HTML, write no destructive or warning tone and hide their decoration', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('aria-hidden="true"');
    expect(code).toContain('Not sent to this page');
    expect(code).toContain('aria-expanded={false}');
    expect(code).toContain('aria-controls={panelId}');
    expect(code).toContain('data-ghost="true"');
    expect(code).not.toMatch(/\bfetch\(|localStorage|sessionStorage/);
  });

  it('the composer builds no regular expression, imports no filesystem module and holds no mutable module state', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).not.toMatch(/new\s+RegExp\s*\(|\bRegExp\s*\(/);
    expect(code).not.toMatch(/\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//);
    expect(code).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    expect(code).not.toMatch(/^(export\s+)?(let|var)\s/m);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
    expect(writesForbiddenTone(code)).toBe(false);
  });

  it('reuses the existing Unreadable chip and writes the contracted words', async () => {
    const components = stripSourceComments(await source(COMPONENTS));
    expect(components).toContain("from '../components/warning-chip.tsx'");
    expect(components).toContain('<WarningChip tone="unreadable" />');
    const composer = stripSourceComments(await source(COMPOSER));
    for (const words of ['Exploration · Indexes', 'Not built', 'Counts not read', 'Last update failed', 'Most connected', 'commit behind', 'auto-resolved']) {
      expect(composer, words).toContain(words);
    }
    expect(components).toContain('How the edges were found');
    expect(components).toContain('aria-label={`Close ${tile.title}`}');
  });

  it('the CSS holds one contiguous phase-11-indexes block with no colour recipe and only the contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(count(css, START)).toBe(1);
    expect(count(css, END)).toBe(1);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-indexes-/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(8);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    // X5 (approved at 11-01): the big counts are the one place --fs-display-1 appears.
    expect(sizes.filter((size) => size === 'var(--fs-display-1)')).toHaveLength(1);
    for (const selector of ['.view-indexes-root', '.view-indexes-grid', '.view-indexes-tile', "[data-ghost='true']", '@media (max-width: 56rem)', '@media (max-width: 34rem)']) {
      expect(block, selector).toContain(selector);
    }
  });

  it('reuses no view-spikes-*, view-pause-*, research-* or view-codebase-* class', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).not.toMatch(/className=["'{][^>]*\b(view-spikes-|view-pause-|research-|view-codebase-)/);
    const css = await source('src/web/styles/globals.css');
    const inside = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    expect(inside).not.toMatch(/\.view-spikes-|\.view-pause-|\.view-codebase-|\.research-/);
  });
});
