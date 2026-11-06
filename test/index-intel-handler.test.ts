// Phase 11 (11-13, VIEW-19, D-04, RESEARCH C14): the intel and graph handler. A small intel or graph file lifts to
// a bounded summary (structured.index); its body is a digest of labels under 2 KB; its frontmatter holds only
// _meta and the marker keys; the raw object reaches no frontmatter, body, rendered document or search hit.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
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
