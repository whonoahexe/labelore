// Phase 11 (11-18, VIEW-19, D-04): the Indexes page's server-side join and its pure composer. The join reads only
// the bounded summaries (structured.index and the graph summary), orders the tiles as UI-SPEC section 4 does, opens
// the tile an address names and draws a ghost for a project with no graphs/ folder; the composer turns it into the
// grid with the Graph tile's counts and two status chips, so a stale graph whose last update failed reads as two
// facts (the last good counts, the chip), and into nothing when there is no context.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    expect(tileKeyOfPath('.planning/intel/other.json')).toBeNull();
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
    expect(model?.openKey).toBe('graph');
    expect(panel?.graph?.counts.map((count) => count.word)).toEqual(['nodes', 'edges', 'communities']);
    expect(panel?.graph?.cells.map((cell) => [cell.key, cell.tone])).toEqual([
      ['built', 'in-flight'],
      ['update', 'missing'],
    ]);
    expect(panel?.graph?.cells[0]).toMatchObject({ label: 'Built from', value: '3f1e2a0', note: '12 commits behind' });
    expect(panel?.graph?.cells[1]).toMatchObject({ label: 'Last auto-update', value: 'failed · exit 1' });
    expect(panel?.graph?.reportLines).toEqual(['41,280 nodes · 96,514 edges']);
    expect(panel?.foot).toMatchObject({ path: '.planning/graphs/graph.json' });
  });

  it("counts a good build's age to the day the project was read", async () => {
    const context = await lendshedContext(
      graphSummary({ status: { state: 'ok', exitCode: 0, durationMs: 2_000, headAtBuild: null, at: '2026-04-21T08:40:02Z' } }),
    );
    const read = { ...context, readAt: '2026-04-23T20:40:02Z' };
    const cells = composeIndexes({ ...EMPTY_INPUT, indexesContext: read })?.tiles[0].panel?.graph?.cells ?? [];
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

  it('writes the Lendshed facts line: five intel files, one graph and the refresh date', async () => {
    const model = composeIndexes({ ...EMPTY_INPUT, indexesContext: await lendshedContext(null) });
    expect(model?.head.facts).toEqual(['5 intel files', '1 graph', 'Intel refreshed 2026-09-14']);
  });
});
