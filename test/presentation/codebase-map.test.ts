// VIEW-13 (10-08): the Codebase page's server-side join. mapReadiness is GSD's map_readiness rule exactly; the
// context carries the seven panels in the page's order with an address only for a document the folder holds,
// the newest per-document stamp as "Mapped", and no freshness claim of any kind. Over the two committed map
// fixtures (Tidemark complete, Shapes three of seven) through the real repository.
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { CODEBASE_MAP_FILES } from '../../src/planning-repo/codebase-files.ts';
import {
  CODEBASE_PANELS,
  NEXT_STEPS,
  buildCodebaseContext,
  concernEntries,
  hasPlanningDocCandidates,
  mapReadiness,
  nextStep,
} from '../../src/presentation/codebase-map.ts';
import type { MapReadiness } from '../../src/presentation/codebase-map.ts';
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
      ['activeKey', 'commit', 'head', 'mapOnly', 'mappedAt', 'mappedCount', 'panels', 'readiness'].sort(),
    );
    // `head` is the map-only head's content (10-10), not a git HEAD: it holds the Stack chips and the concern counts.
    for (const key of Object.keys(context ?? {})) expect(key).not.toMatch(/fresh|stale|current|behind/i);
  });
});

describe('the map-only head on the context (10-10, TGT-09)', () => {
  it('is set for a map-only project and carries the Stack chips and the Concerns counts, Security first', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const head = buildCodebaseContext(presentation, PATH('ARCHITECTURE.md'))?.head;
    expect(head).not.toBeNull();
    expect(head?.stack?.languages[0]).toMatchObject({ name: 'TypeScript', version: '5.6' });
    expect(head?.stack?.runtime.length).toBeGreaterThan(0);
    expect(head?.stack?.frameworks.length).toBeGreaterThan(0);
    expect(head?.concerns?.entries[0]).toMatchObject({ key: 'security-considerations', count: 2 });
    expect(head?.concerns?.total).toBe(14);
    expect(head?.concerns?.entries.map((entry) => entry.count)).toEqual([2, 3, 1, 2, 3, 2, 0, 1, 0]);
  });

  it('is the same head at every panel address of the project', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const heads = CODEBASE_PANELS.map((panel) => buildCodebaseContext(presentation, PATH(panel.file))?.head);
    for (const head of heads) expect(head).toEqual(heads[0]);
  });

  it('is null for a project that has a roadmap', async () => {
    const { presentation } = await loadProject(SHAPES_ROOT);
    const context = buildCodebaseContext(presentation, PATH('STACK.md'));
    expect(context?.mapOnly).toBe(false);
    expect(context?.head).toBeNull();
  });

  it('leaves out a lift the map does not hold, without throwing', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const odd = {
      ...presentation,
      artifacts: presentation.artifacts.map((artifact) =>
        artifact.path === PATH('STACK.md') || artifact.path === PATH('CONCERNS.md')
          ? { ...artifact, structured: { codebase: 'odd' } }
          : artifact,
      ),
    };
    const head = buildCodebaseContext(odd, PATH('STACK.md'))?.head;
    expect(head).toMatchObject({ stack: null, concerns: null });
    expect(head?.nextStep.command).toBe('/gsd-new-project');
  });
});

describe('concernEntries (one rule for the panel and the head)', () => {
  it('puts Security first, keeps document order after it and adds a missing known section as 0', () => {
    const found = concernEntries({
      sections: [
        { key: 'tech-debt', heading: 'Tech Debt', count: 2 },
        { key: 'security-considerations', heading: 'Security Considerations', count: 1 },
        { key: null, heading: 'Repository Hygiene', count: 3 },
      ],
      total: 6,
      missing: ['known-bugs', 'tech-debt', 'not-a-section'],
    });
    expect(found?.entries.map((entry) => [entry.heading, entry.count])).toEqual([
      ['Security Considerations', 1],
      ['Tech Debt', 2],
      ['Repository Hygiene', 3],
      ['Known Bugs', 0],
    ]);
    expect(found?.total).toBe(6);
  });

  it('is null for anything that is not a lift with a section, and sums when the total is absent', () => {
    expect(concernEntries(null)).toBeNull();
    expect(concernEntries({ sections: 'no' })).toBeNull();
    const sections = [{ heading: 'Tech Debt', key: 'tech-debt', count: 2 }, null, { heading: '', count: 1 }];
    expect(concernEntries({ sections })?.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The next step (D-06; UI-SPEC section 3), following onboard-projection's rules as narrowed there.
// ---------------------------------------------------------------------------------------------------------
const FAST_REASON = 'Finish the map. A fast map is enough to look around, but project setup needs the complete one.';
const PARTIAL_REASON =
  'This map is partial. Some of the seven documents are missing, so map the codebase before setting the project up.';
const INGEST_REASON = 'Existing decision or spec documents were found. Import them before setting the project up.';
const NEW_PROJECT_REASON = 'The map is complete. Next, set the project up.';

describe('nextStep', () => {
  it('sends a fast map to /gsd-map-codebase with its own reason, whether or not documents are visible', () => {
    for (const docs of [false, true]) {
      expect(nextStep('fast', docs)).toEqual({ command: '/gsd-map-codebase', reason: FAST_REASON });
    }
  });

  it('sends a partial map (readiness none) to /gsd-map-codebase with the partial reason', () => {
    for (const docs of [false, true]) {
      expect(nextStep('none', docs)).toEqual({ command: '/gsd-map-codebase', reason: PARTIAL_REASON });
    }
  });

  it('sends a complete map with visible documents to /gsd-ingest-docs', () => {
    expect(nextStep('complete', true)).toEqual({ command: '/gsd-ingest-docs', reason: INGEST_REASON });
  });

  it('sends a complete map with none to /gsd-new-project: "The map is complete" appears only there', () => {
    expect(nextStep('complete', false)).toEqual({ command: '/gsd-new-project', reason: NEW_PROJECT_REASON });
    for (const readiness of ['fast', 'none'] as MapReadiness[]) {
      for (const docs of [false, true]) expect(nextStep(readiness, docs).reason).not.toContain('The map is complete');
    }
  });

  it('only ever returns one of the four constant steps, and never a --fast form', () => {
    expect(NEXT_STEPS).toHaveLength(4);
    for (const readiness of ['complete', 'fast', 'none'] as MapReadiness[]) {
      for (const docs of [false, true]) {
        const step = nextStep(readiness, docs);
        expect(NEXT_STEPS).toContain(step);
        expect(step.command).toMatch(/^\/gsd-(map-codebase|ingest-docs|new-project)$/);
        expect(step.command).not.toContain('--');
      }
    }
  });

  it('an unknown readiness falls to the partial step rather than throwing', () => {
    expect(nextStep('weird' as MapReadiness, false).command).toBe('/gsd-map-codebase');
  });
});

describe('hasPlanningDocCandidates (UI-SPEC open item 2: name and segment rules over .planning/ outside codebase/)', () => {
  const has = (...paths: string[]): boolean => hasPlanningDocCandidates(paths.map((path) => ({ path })));

  it('finds an ADR, PRD, SPEC or RFC by directory segment or whole-token name', () => {
    expect(has('.planning/adr/0001-store.md')).toBe(true);
    expect(has('.planning/docs/PRD-loans.md')).toBe(true);
    expect(has('.planning/rfcs/stores.md')).toBe(true);
    expect(has('.planning/notes/api_spec.md')).toBe(true);
    expect(has('.planning/RFC 12 tides.md')).toBe(true);
  });

  it('finds a document whose name starts with four digits and a separator', () => {
    expect(has('.planning/2026-10-decision.md')).toBe(true);
    expect(has('.planning/0007_tide-window.md')).toBe(true);
  });

  it('does not count REQUIREMENTS.md, a map document, a phase-scoped NN-SPEC.md or a look-alike word', () => {
    expect(has('.planning/REQUIREMENTS.md')).toBe(false);
    expect(has('.planning/codebase/SPECIAL.md')).toBe(false);
    expect(has('.planning/codebase/adr/0001-x.md')).toBe(false);
    expect(has('.planning/phases/01-x/01-SPEC.md')).toBe(false);
    expect(has('.planning/notes/spectrum.md')).toBe(false);
    expect(has('.planning/notes/prdigy.md')).toBe(false);
    expect(has('.planning/CHANGELOG-2026-10.md')).toBe(false);
    expect(has('.planning/202-notes.md')).toBe(false);
  });

  it('counts only markdown, and ignores a path outside .planning/', () => {
    expect(has('.planning/adr/0001-store.txt')).toBe(false);
    expect(has('docs/adr/0001-store.md')).toBe(false);
  });

  it('is false for no artifacts and for a Tidemark with its CHANGELOG only', async () => {
    expect(hasPlanningDocCandidates([])).toBe(false);
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    expect(hasPlanningDocCandidates(presentation.artifacts)).toBe(false);
  });
});

describe('the head carries the next step (10-10)', () => {
  it('gives Tidemark (complete, no documents) /gsd-new-project', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const head = buildCodebaseContext(presentation, PATH('STACK.md'))?.head;
    expect(head?.nextStep).toEqual({ command: '/gsd-new-project', reason: NEW_PROJECT_REASON });
  });

  it('gives a complete map with a visible ADR /gsd-ingest-docs', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const adr = { ...presentation.artifacts[0], path: '.planning/adr/0001-store.md', location: 'root' as const };
    const withAdr = { ...presentation, artifacts: [...presentation.artifacts, adr] };
    expect(buildCodebaseContext(withAdr, PATH('STACK.md'))?.head?.nextStep.command).toBe('/gsd-ingest-docs');
  });

  it('gives a fast copy (three documents removed) /gsd-map-codebase with the fast reason', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const gone = new Set([PATH('CONVENTIONS.md'), PATH('TESTING.md'), PATH('CONCERNS.md')]);
    const fast = { ...presentation, artifacts: presentation.artifacts.filter((artifact) => !gone.has(artifact.path)) };
    expect(buildCodebaseContext(fast, PATH('STACK.md'))?.head?.nextStep).toEqual({
      command: '/gsd-map-codebase',
      reason: FAST_REASON,
    });
  });
});
