// Phase 11 (11-19, VIEW-19, D-04): the Indexes page's server-side join over files Lendshed does not hold. A planted
// invalid stack.json is an 'unreadable' tile that still names its path while the other tiles stay ok; a planted
// intel/notes.json is a generic tile titled from its name and carrying key names, never values; files in a sub-folder
// (classifications/) are never tiled; `.last-refresh.json` opens the page with no tile open.
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildIndexesContext, tileKeyOfPath } from '../../src/presentation/indexes-context.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
import { writeIngestDocsProject } from '../helpers/index-fixtures.ts';

const made: string[] = [];

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function lendshedCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), 'labelore-indexes-'));
  made.push(dir);
  cpSync(FX_ROOT, dir, { recursive: true });
  return dir;
}

function plant(dir: string, relative: string, text: string): void {
  const target = join(dir, '.planning', relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text, 'utf8');
}

describe('buildIndexesContext: files that are not what the page expected', () => {
  it('shows an invalid stack.json as an unreadable tile with its path while every other tile stays ok', async () => {
    const dir = lendshedCopy();
    plant(dir, 'intel/stack.json', '{ "frameworks": [ not json');
    const { presentation } = await loadProject(dir);
    const context = buildIndexesContext(presentation, '.planning/intel/stack.json', null);
    const stack = context?.tiles.find((tile) => tile.key === 'stack');
    expect(stack).toMatchObject({ state: 'unreadable', path: '.planning/intel/stack.json', summary: null });
    expect(stack?.url).toBe('/intel/stack.json');
    expect(context?.openKey).toBe('stack');
    const others = context?.tiles.filter((tile) => tile.key !== 'stack' && tile.key !== 'graph') ?? [];
    expect(others.length).toBe(4);
    expect(others.every((tile) => tile.state === 'ok')).toBe(true);
  });

  it('draws a generic tile for an intel file the page does not know: its name, key names, never its values', async () => {
    const dir = lendshedCopy();
    plant(dir, 'intel/notes.json', JSON.stringify({ _meta: { updated_at: '2026-05-01' }, alpha: { secret: 'VALUE-NOT-FOR-THE-PAGE' }, beta: [1, 2] }));
    plant(dir, 'intel/dead_links-2.json', '{ broken');
    const { presentation } = await loadProject(dir);
    const context = buildIndexesContext(presentation, '.planning/intel/notes.json', null);
    expect(context?.tiles.map((tile) => tile.key)).toEqual([
      'graph',
      'architecture',
      'stack',
      'file-roles',
      'api-map',
      'dependencies',
      'file:dead_links-2.json',
      'file:notes.json',
    ]);
    const notes = context?.tiles.find((tile) => tile.key === 'file:notes.json');
    expect(notes).toMatchObject({ title: 'Notes', state: 'ok', span: 1, path: '.planning/intel/notes.json' });
    expect(notes?.meta.updated).toBe('2026-05-01');
    expect(notes?.summary).toMatchObject({ kind: 'unknown' });
    expect(JSON.stringify(context)).not.toContain('VALUE-NOT-FOR-THE-PAGE');
    expect(context?.openKey).toBe('file:notes.json');
    // A generic file that is not JSON is unreadable, and still titled from its name.
    expect(context?.tiles.find((tile) => tile.key === 'file:dead_links-2.json')).toMatchObject({
      title: 'Dead links 2',
      state: 'unreadable',
    });
    expect(context?.intelFiles).toBe(7);
  });

  it('never tiles a file in an intel sub-folder, and keeps the stamp as no tile', async () => {
    const dir = lendshedCopy();
    plant(dir, 'intel/classifications/a.json', '{"type":"ADR"}');
    const { presentation } = await loadProject(dir);
    const context = buildIndexesContext(presentation, '.planning/intel/.last-refresh.json', null);
    expect(context?.tiles.some((tile) => tile.key.startsWith('file:'))).toBe(false);
    expect(context?.openKey).toBeNull();
    expect(tileKeyOfPath('.planning/intel/classifications/a.json')).toBeNull();
  });

  it('keeps a generic tile beside the Synthesis and the Graph ghost of an ingest-docs project', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    made.push(dir);
    writeIngestDocsProject(dir);
    plant(dir, 'intel/notes.json', '{"a":1}');
    const { presentation } = await loadProject(dir);
    const context = buildIndexesContext(presentation, '.planning/intel/SYNTHESIS.md', null);
    expect(context?.tiles.map((tile) => `${tile.key}:${tile.state}`)).toEqual([
      'synthesis:ok',
      'graph:not-built',
      'file:notes.json:ok',
    ]);
  });

  it('keeps the Graph ghost when the only intel file is one the page does not know', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-notes-'));
    made.push(dir);
    plant(dir, 'PROJECT.md', '# Made up\n');
    plant(dir, 'intel/notes.json', '{"a":1}');
    const { presentation } = await loadProject(dir);
    const context = buildIndexesContext(presentation, null, null);
    expect(context?.tiles.map((tile) => `${tile.key}:${tile.state}`)).toEqual(['graph:not-built', 'file:notes.json:ok']);
  });
});
