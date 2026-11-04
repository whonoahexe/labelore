// VIEW-13 (10-08): the Codebase page's server-side join. mapReadiness is GSD's map_readiness rule exactly; the
// context carries the seven panels in the page's order with an address only for a document the folder holds,
// the newest per-document stamp as "Mapped", and no freshness claim of any kind. Over the two committed map
// fixtures (Tidemark complete, Shapes three of seven) through the real repository.
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { CODEBASE_MAP_FILES } from '../../src/planning-repo/codebase-files.ts';
import { CODEBASE_PANELS, buildCodebaseContext, mapReadiness } from '../../src/presentation/codebase-map.ts';
import { loadProject } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const TIDEMARK_ROOT = fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');
const PATH = (name: string): string => `.planning/codebase/${name}`;

describe('mapReadiness (GSD map_readiness)', () => {
  it('is complete when all seven documents are present', () => {
    expect(mapReadiness([...CODEBASE_MAP_FILES])).toBe('complete');
  });

  it('is fast for the four core documents only, and for the four plus one more', () => {
    const core = ['STACK.md', 'INTEGRATIONS.md', 'ARCHITECTURE.md', 'STRUCTURE.md'];
    expect(mapReadiness(core)).toBe('fast');
    expect(mapReadiness([...core, 'TESTING.md'])).toBe('fast');
    expect(mapReadiness([...core, 'TESTING.md', 'CONVENTIONS.md'])).toBe('fast');
  });

  it('is none for anything short of the four core documents', () => {
    expect(mapReadiness(['STACK.md', 'INTEGRATIONS.md'])).toBe('none');
    expect(mapReadiness(['STACK.md', 'ARCHITECTURE.md', 'CONVENTIONS.md'])).toBe('none');
    expect(mapReadiness([])).toBe('none');
  });

  it('ignores a name that is not a map document', () => {
    expect(mapReadiness([...CODEBASE_MAP_FILES.slice(0, 6), 'NOTES.md'])).toBe('fast');
  });
});

describe('CODEBASE_PANELS', () => {
  it('names the seven panels in the page order, one document each', () => {
    expect(CODEBASE_PANELS.map((panel) => panel.label)).toEqual([
      'Stack',
      'Architecture',
      'Structure',
      'Conventions',
      'Testing',
      'Integrations',
      'Concerns',
    ]);
    expect(CODEBASE_PANELS.map((panel) => panel.file)).toEqual([
      'STACK.md',
      'ARCHITECTURE.md',
      'STRUCTURE.md',
      'CONVENTIONS.md',
      'TESTING.md',
      'INTEGRATIONS.md',
      'CONCERNS.md',
    ]);
  });
});

describe('buildCodebaseContext over Shapes (three of seven)', () => {
  it('lists three mapped panels with addresses and four unmapped with none', async () => {
    const { presentation } = await loadProject(SHAPES_ROOT);
    const context = buildCodebaseContext(presentation, PATH('STACK.md'));
    expect(context).not.toBeNull();
    expect(context?.panels.filter((panel) => panel.mapped).map((panel) => panel.key)).toEqual([
      'stack',
      'architecture',
      'conventions',
    ]);
    for (const panel of context?.panels ?? []) {
      if (panel.mapped) expect(panel.url, panel.key).toMatch(/^\/codebase\//);
      else expect(panel.url, panel.key).toBeNull();
    }
    expect(context?.panels).toHaveLength(7);
    expect(context?.mappedCount).toBe(3);
    expect(context?.readiness).toBe('none');
    expect(context?.activeKey).toBe('stack');
  });
});

describe('buildCodebaseContext over Tidemark (complete map)', () => {
  it("shows the newest stamp as mapped and that document's seven-character commit", async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const context = buildCodebaseContext(presentation, PATH('ARCHITECTURE.md'));
    expect(context?.mappedAt).toBe('2026-10-30');
    expect(context?.commit).toMatch(/^[0-9a-f]{7}$/);
    expect(context?.mappedCount).toBe(7);
    expect(context?.readiness).toBe('complete');
    expect(context?.activeKey).toBe('architecture');
    expect(context?.mapOnly).toBe(true);
  });

  it('keeps each document its own stamp in the panel list', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const context = buildCodebaseContext(presentation, PATH('STACK.md'));
    expect(context?.panels.find((panel) => panel.key === 'stack')?.mappedAt).toBe('2026-10-28');
    expect(context?.panels.find((panel) => panel.key === 'architecture')?.mappedAt).toBe('2026-10-30');
  });

  it('carries the key number the document lift set, and null where none is set yet', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const context = buildCodebaseContext(presentation, PATH('CONCERNS.md'));
    expect(context?.panels.find((panel) => panel.key === 'concerns')?.keyNumber).toBe(14);
    expect(context?.panels.find((panel) => panel.key === 'testing')?.keyNumber).toBeNull();
  });

  it('is null for a path that is not one of the seven map documents', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    expect(buildCodebaseContext(presentation, '.planning/PROJECT.md')).toBeNull();
    expect(buildCodebaseContext(presentation, PATH('NOTES.md'))).toBeNull();
  });

  it('makes no freshness claim: the context has no field comparing the map to anything', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const context = buildCodebaseContext(presentation, PATH('STACK.md'));
    expect(Object.keys(context ?? {}).sort()).toEqual(
      ['activeKey', 'commit', 'mapOnly', 'mappedAt', 'mappedCount', 'panels', 'readiness'].sort(),
    );
    for (const key of Object.keys(context ?? {})) expect(key).not.toMatch(/fresh|stale|current|behind|head/i);
  });
});
