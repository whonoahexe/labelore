// Phase 11 (11-13, VIEW-19, D-04, RESEARCH Pattern 6): the graph summary. The scan counts and keeps degrees
// without building the object graph and equals JSON.parse on a generated 20,000-node graph; GRAPH_REPORT.md
// comes first and its over-long lines never enter; a file over the read cap is never read; a graph cut off
// mid-element reads "counts not read" with no text; the summary stays small and holds at most ten hubs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import type { FileBytes, FileRead, PlanningFilesystem } from '../../src/planning-fs/types.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { GRAPH_READ_CAP_BYTES, INDEX_BOUNDS } from '../../src/server/index-bounds.ts';
import { createIndexSummary, liftGraphReport, scanGraphElements } from '../../src/server/index-summary.ts';
import type { GraphArtifactRef } from '../../src/server/index-summary.ts';
import { ProjectRuntime } from '../../src/server/project-runtime.ts';
import { FX_PLANNING } from '../helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';
import { LARGE_GRAPH_COMMIT, largeGraphText } from '../helpers/index-fixtures.ts';

const encoder = new TextEncoder();
const GRAPHS = '.planning/graphs/';

/** A filesystem double whose files can change between reads and whose reads are counted per path. */
class CountingFs extends InMemoryPlanningFilesystem {
  readonly byteReads = new Map<string, number>();
  readonly textReads = new Map<string, number>();
  readonly overrides = new Map<string, string>();

  override async readBytesWithin(baseRelDir: string, relPath: string): Promise<FileBytes> {
    this.byteReads.set(relPath, (this.byteReads.get(relPath) ?? 0) + 1);
    const swapped = this.overrides.get(relPath);
    if (swapped !== undefined) {
      const bytes = encoder.encode(swapped);
      return { bytes, mtimeMs: 0, size: bytes.length };
    }
    return super.readBytesWithin(baseRelDir, relPath);
  }

  override async read(relPath: string): Promise<FileRead> {
    this.textReads.set(relPath, (this.textReads.get(relPath) ?? 0) + 1);
    return super.read(relPath);
  }
}

function ref(path: string, text: string, fileClass: GraphArtifactRef['fileClass'] = 'text'): GraphArtifactRef {
  return { path, sizeBytes: encoder.encode(text).length, fileClass };
}

/** The oracle: what JSON.parse of the whole file gives. */
function oracle(text: string, arrayKey: 'links' | 'edges' = 'links') {
  const graph = JSON.parse(text) as { nodes: unknown[]; built_at_commit: string } & Record<string, { source: string; target: string }[]>;
  const degree = new Map<string, number>();
  for (const link of graph[arrayKey]) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  }
  const hubs = [...degree.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 10)
    .map(([id, d]) => ({ id, degree: d }));
  return { nodes: graph.nodes.length, links: graph[arrayKey].length, hubs, builtAtCommit: graph.built_at_commit };
}

describe('scanGraphElements', () => {
  it('equals JSON.parse on a generated 20,000-node graph: counts, top-10 hubs and built_at_commit', () => {
    const text = largeGraphText(20_000);
    const scan = scanGraphElements(encoder.encode(text));
    const expected = oracle(text);
    expect(scan.countsRead).toBe(true);
    expect(scan.nodes).toBe(20_000);
    expect(scan.nodes).toBe(expected.nodes);
    expect(scan.links).toBe(expected.links);
    expect(scan.hubs.map((hub) => ({ id: hub.id, degree: hub.degree }))).toEqual(expected.hubs);
    expect(scan.hubs).toHaveLength(INDEX_BOUNDS.hubs);
    expect(scan.builtAtCommit).toBe(LARGE_GRAPH_COMMIT);
    expect(scan.builtAtCommit).toBe(expected.builtAtCommit);
  });

  it('grows linearly from 2,500 to 20,000 nodes', () => {
    const growth = measureGrowth({
      make: (n) => encoder.encode(largeGraphText(n)),
      run: (bytes) => {
        scanGraphElements(bytes);
      },
      startSize: 2_500,
      factor: 8,
      reps: 3,
      minBaseMs: 0,
      maxSize: 1 << 20,
      floorMs: 0,
    });
    expect(growth.n).toBe(2_500);
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  }, 60_000);

  it('counts a graph whose array key is edges, as graphify prefers it', () => {
    const text = largeGraphText(1_000, { arrayKey: 'edges' });
    const scan = scanGraphElements(encoder.encode(text));
    const expected = oracle(text, 'edges');
    expect(scan.links).toBe(expected.links);
    expect(scan.hubs.map((hub) => ({ id: hub.id, degree: hub.degree }))).toEqual(expected.hubs);
  });

  it('handles braces, brackets, escaped quotes and non-ASCII text inside strings', () => {
    const text = JSON.stringify({
      built_at_commit: 'abcdef1234567',
      nodes: [
        { id: 'a', label: 'has } and { and ] and [' },
        { id: 'b', label: 'quote " and backslash \\ and 日本語 and é' },
        { id: 'c', label: '"nodes": [' },
      ],
      links: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'a', target: 'c' },
      ],
    });
    const scan = scanGraphElements(encoder.encode(text));
    expect(scan).toMatchObject({ nodes: 3, links: 3, countsRead: true, builtAtCommit: 'abcdef1234567' });
    expect(scan.hubs.map((hub) => [hub.id, hub.degree])).toEqual([['a', 2], ['b', 2], ['c', 2]]);
  });

  it('is not fooled by built_at_commit or nodes appearing inside a nested object or a string', () => {
    const text = JSON.stringify({
      graph: { built_at_commit: 'deadbeefdead', nodes: [1, 2, 3] },
      note: '"built_at_commit": "feedfacefeed"',
      nodes: [{ id: 'x' }],
      links: [],
    });
    const scan = scanGraphElements(encoder.encode(text));
    expect(scan.nodes).toBe(1);
    expect(scan.builtAtCommit).toBeNull();
  });

  it('reads counts not read, and no node text, for a graph cut off in the middle of a node', () => {
    const text = largeGraphText(5_000);
    const cutAt = text.indexOf('"label":"Node 2500"') + 10;
    expect(cutAt).toBeGreaterThan(10);
    const scan = scanGraphElements(encoder.encode(text.slice(0, cutAt)));
    expect(scan).toEqual({ nodes: 0, links: 0, hubs: [], builtAtCommit: null, countsRead: false });
    expect(JSON.stringify(scan)).not.toContain('Node');
  });

  it('reads counts not read for an element that is not JSON, a non-graph object and random bytes', () => {
    expect(scanGraphElements(encoder.encode('{"nodes":[{"id":"a",}],"links":[]}')).countsRead).toBe(false);
    expect(scanGraphElements(encoder.encode('{"something":"else"}')).countsRead).toBe(false);
    expect(scanGraphElements(new Uint8Array([0, 1, 2, 255, 254])).countsRead).toBe(false);
    expect(scanGraphElements(new Uint8Array(0)).countsRead).toBe(false);
  });

  it('with elements off, finds only built_at_commit and parses no element', () => {
    const scan = scanGraphElements(encoder.encode(largeGraphText(200)), { elements: false });
    expect(scan.builtAtCommit).toBe(LARGE_GRAPH_COMMIT);
    expect(scan.hubs).toEqual([]);
    expect(scan.countsRead).toBe(false);
  });

  it('survives a hostile node id like __proto__ without polluting anything', () => {
    const text = '{"nodes":[{"id":"__proto__"},{"id":"constructor"}],"links":[{"source":"__proto__","target":"constructor"}]}';
    const scan = scanGraphElements(encoder.encode(text));
    expect(scan.links).toBe(1);
    expect(scan.hubs.map((hub) => hub.id)).toEqual(['__proto__', 'constructor']);
    expect(({} as Record<string, unknown>).degree).toBeUndefined();
  });
});

describe('liftGraphReport', () => {
  it('reads the Summary counts and the God Nodes of the Lendshed report and drops its over-long line', () => {
    const text = readFileSync(join(FX_PLANNING, 'graphs/GRAPH_REPORT.md'), 'utf8');
    const lifted = liftGraphReport(text);
    expect(lifted.counts).toEqual({ nodes: 40, edges: 60, communities: 6 });
    expect(lifted.godNodes.total).toBe(6);
    expect(lifted.godNodes.items[0]).toEqual({ label: 'MemberDirectory', edges: 8 });
    expect(JSON.stringify(lifted)).not.toContain('Which of the loan routes');
  });

  it('never lets a line over the cap into the counts', () => {
    const long = `- 99 nodes ${'x'.repeat(INDEX_BOUNDS.reportLineChars + 50)}`;
    const lifted = liftGraphReport(`## Summary\n${long}\n- 7 nodes · 9 edges\n`);
    expect(lifted.counts?.nodes).toBe(7);
    expect(lifted.summaryLines).toEqual(['7 nodes · 9 edges']);
  });

  it('gives no counts and no throw for a report with no Summary', () => {
    expect(liftGraphReport('# Graph Report\n\nnothing here\n').counts).toBeNull();
    expect(liftGraphReport('').godNodes.items).toEqual([]);
  });
});

function graphRefs(files: Record<string, string>): GraphArtifactRef[] {
  return Object.entries(files)
    .filter(([path]) => path.startsWith(GRAPHS))
    .map(([path, text]) => ref(path, text));
}

describe('createIndexSummary over the Lendshed graph', () => {
  const lendshedFiles = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const name of ['graph.json', 'GRAPH_REPORT.md', '.last-build-status.json']) {
      out[`${GRAPHS}${name}`] = readFileSync(join(FX_PLANNING, 'graphs', name), 'utf8');
    }
    return out;
  };

  it('takes counts and God Nodes from the report, status from the build file and the commit from graph.json', async () => {
    const files = lendshedFiles();
    const git = vi.fn(async () => '12\n');
    const summary = createIndexSummary({ fs: new CountingFs(files), git, root: '/lendshed' });
    const graph = await summary.graph(graphRefs(files), 'T1');
    expect(graph.countsFrom).toBe('report');
    expect(graph.counts).toEqual({ nodes: 40, links: 60, communities: 6 });
    expect(graph.countsRead).toBe(true);
    expect(graph.hubs[0]).toEqual({ id: 'MemberDirectory', label: null, degree: 8 });
    expect(graph.hubs.length).toBeLessThanOrEqual(INDEX_BOUNDS.hubs);
    expect(graph.status).toMatchObject({ state: 'failed', exitCode: 1, durationMs: 4180 });
    expect(graph.status?.headAtBuild).toBe('b50e1d8c3a7f9246e01d5c8a73b94f2e60a1d7c3');
    expect(graph.builtAtCommit).toBe('7c2e9a41d05f83b6e1a4c970f2d86b35a01e4c9d');
    expect(graph.commitsBehind).toBe(12);
    expect(JSON.stringify(graph)).not.toContain('Which of the loan routes');
    expect(graph.unreadable).toEqual([]);
    // The git call carries the validated commit and nothing else from the file.
    expect(git).toHaveBeenCalledTimes(1);
    const args = (git.mock.calls[0] as unknown as [string[], { cwd: string }])[0];
    expect(args).toContain('7c2e9a41d05f83b6e1a4c970f2d86b35a01e4c9d..HEAD');
  });

  it('keeps a failed build status as its own fact beside the last good counts', async () => {
    const files = lendshedFiles();
    const graph = await createIndexSummary({ fs: new CountingFs(files), git: null, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(graph.status?.state).toBe('failed');
    expect(graph.counts?.nodes).toBe(40);
    expect(graph.commitsBehind).toBeNull();
  });

  it('answers commitsBehind null when git throws or prints something that is not a number', async () => {
    const files = lendshedFiles();
    const refs = graphRefs(files);
    const throwing = createIndexSummary({ fs: new CountingFs(files), git: async () => { throw new Error('no git'); }, root: '/x' });
    expect((await throwing.graph(refs, 'T1')).commitsBehind).toBeNull();
    const garbage = createIndexSummary({ fs: new CountingFs(files), git: async () => 'fatal: bad object', root: '/x' });
    expect((await garbage.graph(refs, 'T1')).commitsBehind).toBeNull();
  });

  it('never gives git a built_at_commit that is not a hex commit id', async () => {
    const hostile = JSON.stringify({ built_at_commit: '--upload-pack=touch /tmp/pwned', nodes: [{ id: 'a' }], links: [] });
    const files = { [`${GRAPHS}graph.json`]: hostile };
    const git = vi.fn(async () => '3');
    const graph = await createIndexSummary({ fs: new CountingFs(files), git, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(git).not.toHaveBeenCalled();
    expect(graph.builtAtCommit).toBeNull();
    expect(graph.commitsBehind).toBeNull();
  });

  it('only names and sizes .last-build-snapshot.json and graph.html: they are never read', async () => {
    const files = {
      ...lendshedFiles(),
      [`${GRAPHS}.last-build-snapshot.json`]: '{"nodes":[{"id":"SECRETSNAPSHOT"}]}',
      [`${GRAPHS}graph.html`]: '<html>SECRETHTML</html>',
    };
    const fs = new CountingFs(files);
    const graph = await createIndexSummary({ fs, git: null, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(fs.byteReads.get(`${GRAPHS}.last-build-snapshot.json`)).toBeUndefined();
    expect(fs.byteReads.get(`${GRAPHS}graph.html`)).toBeUndefined();
    expect(graph.notSent.map((entry) => entry.path).sort()).toEqual([`${GRAPHS}.last-build-snapshot.json`, `${GRAPHS}graph.html`]);
    expect(graph.notSent.find((entry) => entry.path.endsWith('graph.html'))?.sizeBytes).toBe(encoder.encode(files[`${GRAPHS}graph.html`]).length);
    expect(JSON.stringify(graph)).not.toContain('SECRET');
  });
});

describe('createIndexSummary scanning graph.json', () => {
  it('scans a 20,000-node graph with no report: counts, at most ten hubs, a few kilobytes', async () => {
    const text = largeGraphText(20_000);
    const files = { [`${GRAPHS}graph.json`]: text };
    const summary = createIndexSummary({ fs: new CountingFs(files), git: async () => '4', root: '/x' });
    const graph = await summary.graph(graphRefs(files), 'T1');
    const expected = oracle(text);
    expect(graph.countsFrom).toBe('scan');
    expect(graph.counts).toEqual({ nodes: expected.nodes, links: expected.links, communities: null });
    expect(graph.hubs.map((hub) => hub.degree)).toEqual(expected.hubs.map((hub) => hub.degree));
    expect(graph.hubs).toHaveLength(INDEX_BOUNDS.hubs);
    expect(graph.commitsBehind).toBe(4);
    const served = JSON.stringify(graph);
    expect(served.length).toBeLessThan(16 * 1024);
    // No node list beyond the ten hubs: a node that is not a hub never appears.
    const hubIds = new Set(graph.hubs.map((hub) => hub.id));
    const nodeIds = [...served.matchAll(/"id":"(n\d+)"/g)].map((match) => match[1]);
    expect(nodeIds.every((id) => hubIds.has(id))).toBe(true);
    expect(served).not.toContain('"source_file"');
  });

  it('never reads a file over the cap: counts not read, zero read calls', async () => {
    const files = { [`${GRAPHS}graph.json`]: largeGraphText(10) };
    const fs = new CountingFs(files);
    const huge: GraphArtifactRef = { path: `${GRAPHS}graph.json`, sizeBytes: GRAPH_READ_CAP_BYTES + 1, fileClass: 'large' };
    const graph = await createIndexSummary({ fs, git: async () => '1', root: '/x' }).graph([huge], 'T1');
    expect(fs.byteReads.size).toBe(0);
    expect(fs.textReads.size).toBe(0);
    expect(graph.counts).toBeNull();
    expect(graph.countsRead).toBe(false);
    expect(graph.hubs).toEqual([]);
    expect(graph.unreadable).toEqual([{ path: `${GRAPHS}graph.json`, reason: 'too-large' }]);
  });

  it('reads a class large graph that is under the cap', async () => {
    const text = largeGraphText(300);
    const files = { [`${GRAPHS}graph.json`]: text };
    const large: GraphArtifactRef = { path: `${GRAPHS}graph.json`, sizeBytes: 2 * 1024 * 1024, fileClass: 'large' };
    const graph = await createIndexSummary({ fs: new CountingFs(files), git: null, root: '/x' }).graph([large], 'T1');
    expect(graph.counts?.nodes).toBe(300);
  });

  it('reads counts not read for a graph cut off mid-element, then reads again after the next refresh', async () => {
    const text = largeGraphText(400);
    const cut = text.slice(0, text.indexOf('"label":"Node 200"') + 12);
    const files = { [`${GRAPHS}graph.json`]: text };
    const fs = new CountingFs(files);
    fs.overrides.set(`${GRAPHS}graph.json`, cut);
    const summary = createIndexSummary({ fs, git: null, root: '/x' });
    const refs = [ref(`${GRAPHS}graph.json`, text)];
    const first = await summary.graph(refs, 'T1');
    expect(first.countsRead).toBe(false);
    expect(first.counts).toBeNull();
    expect(first.hubs).toEqual([]);
    expect(first.unreadable).toEqual([{ path: `${GRAPHS}graph.json`, reason: 'invalid' }]);
    expect(JSON.stringify(first)).not.toContain('Node');
    // The same snapshot read time answers from the cache; no new read.
    await summary.graph(refs, 'T1');
    expect(fs.byteReads.get(`${GRAPHS}graph.json`)).toBe(1);
    // The next refresh (a new read time) reads the file again, now whole.
    fs.overrides.delete(`${GRAPHS}graph.json`);
    const second = await summary.graph(refs, 'T2');
    expect(fs.byteReads.get(`${GRAPHS}graph.json`)).toBe(2);
    expect(second.counts?.nodes).toBe(400);
  });

  it('keys the cache by size too: a file that changed size is read again under the same read time', async () => {
    const small = largeGraphText(50);
    const bigger = largeGraphText(80);
    const fs = new CountingFs({ [`${GRAPHS}graph.json`]: small });
    const summary = createIndexSummary({ fs, git: null, root: '/x' });
    expect((await summary.graph([ref(`${GRAPHS}graph.json`, small)], 'T1')).counts?.nodes).toBe(50);
    fs.overrides.set(`${GRAPHS}graph.json`, bigger);
    expect((await summary.graph([ref(`${GRAPHS}graph.json`, bigger)], 'T1')).counts?.nodes).toBe(80);
  });

  it('gives an unreadable tile, never a throw, for a missing port method, a missing file and a bad status file', async () => {
    const files = { [`${GRAPHS}.last-build-status.json`]: '{ not json', [`${GRAPHS}graph.json`]: 'x' };
    const bare: PlanningFilesystem = {
      capabilities: { watch: false, write: false },
      list: async () => [],
      read: async () => ({ content: '', mtimeMs: 0, size: 0 }),
      exists: async () => false,
    };
    const noMethod = await createIndexSummary({ fs: bare, git: null, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(noMethod.unreadable.map((entry) => entry.path).sort()).toEqual([`${GRAPHS}.last-build-status.json`, `${GRAPHS}graph.json`]);
    const withFile = await createIndexSummary({ fs: new CountingFs(files), git: null, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(withFile.unreadable).toContainEqual({ path: `${GRAPHS}.last-build-status.json`, reason: 'invalid' });
    expect(withFile.status).toBeNull();
    const absent = await createIndexSummary({ fs: new CountingFs({}), git: null, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(absent.unreadable).toHaveLength(2);
    const nothing = await createIndexSummary({ fs: null, git: null, root: '/x' }).graph(graphRefs(files), 'T1');
    expect(nothing.counts).toBeNull();
  });

  it('answers an empty summary for a folder with no graph files', async () => {
    const graph = await createIndexSummary({ fs: new CountingFs({}), git: null, root: '/x' }).graph([], 'T1');
    expect(graph).toMatchObject({ counts: null, hubs: [], status: null, builtAtCommit: null, commitsBehind: null, notSentTotal: 0 });
  });
});

describe('the runtime holds one IndexSummary per derived bundle', () => {
  it('builds it with the bundle, drops it on refresh and reads through the live filesystem', async () => {
    const text = largeGraphText(120);
    const fs = new CountingFs({ '.planning/PROJECT.md': '# Host\n', [`${GRAPHS}graph.json`]: text });
    const repository = new PlanningRepository(fs, '/host');
    await repository.load();
    const git = vi.fn(async () => '5');
    const runtime = new ProjectRuntime(repository, 'host', undefined, git);
    const before = runtime.derived.indexSummary;
    expect(before).toBeDefined();
    const artifacts = Object.values(repository.getSnapshot().project?.artifacts ?? {}).filter((a) => a.path.startsWith(GRAPHS));
    expect(artifacts).toHaveLength(1);
    const graph = await before.graph(artifacts, repository.getSnapshot().readAt);
    expect(graph.counts?.nodes).toBe(120);
    expect(graph.commitsBehind).toBe(5);
    expect(await runtime.refresh()).toMatchObject({ kind: 'refreshed' });
    expect(runtime.derived.indexSummary).not.toBe(before);
    runtime.dispose();
  });
});
