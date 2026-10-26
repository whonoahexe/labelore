// Phase 7, plan 02: files are recognised by where they live as well as by what they are called (DATA-07).
// The Shapes project is the made-up fixture (test/fixtures/shapes); nothing here reads another project.
import { beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { discover } from '../src/planning-repo/discovery.ts';
import { buildDrawerViewModel } from '../src/presentation/drawer.ts';
import { loadProject } from './helpers/fixture-project.ts';
import type { LoadedProject } from './helpers/fixture-project.ts';
import { ALL_FIXTURE_ROOTS } from './helpers/fixture-roots.ts';
import { loadShapesProject } from './helpers/shapes-project.ts';

let shapes: LoadedProject;

beforeAll(async () => {
  shapes = await loadShapesProject();
});

function artifactAt(path: string) {
  const found = shapes.presentation.artifacts.find((artifact) => artifact.path === `.planning/${path}`);
  if (!found) throw new Error(`Shapes presentation has no artifact at .planning/${path}`);
  return found;
}

describe('recognition by position - tracer (Shapes)', () => {
  it('gives COVERAGE.md in a phase folder the coverage kind and HANDOFF.json at the root the handoff kind', () => {
    expect(artifactAt('phases/02-glaze-recipes/COVERAGE.md')).toMatchObject({ kind: 'coverage', location: 'phase' });
    expect(artifactAt('HANDOFF.json')).toMatchObject({ kind: 'handoff', location: 'root' });
  });

  it('demotes a ROADMAP.md one folder deeper to unknown while the root ROADMAP.md keeps roadmap', () => {
    expect(artifactAt('sketches/001-shelf-board/synthetic-planning/ROADMAP.md').kind).toBe('unknown');
    expect(artifactAt('ROADMAP.md').kind).toBe('roadmap');
  });

  it("lists COVERAGE.md in phase 02's After stage, labelled Coverage, whose url is the artifact's key", () => {
    const drawer = buildDrawerViewModel(shapes.presentation);
    const phase = drawer.current.phases.find((place) => place.number === '02');
    if (!phase) throw new Error('Shapes drawer has no phase 02');
    const coverage = artifactAt('phases/02-glaze-recipes/COVERAGE.md');
    const row = phase.after.find((candidate) => candidate.label === 'Coverage');
    expect(row?.url).toBe(coverage.key);
  });
});

describe('recognition by position - every Shapes fixture file', () => {
  const KINDS: [path: string, kind: string, location: string][] = [
    ['.continue-here.md', 'continue-here', 'root'],
    ['PATTERNS.md', 'graduated-patterns', 'root'],
    ['phases/02-glaze-recipes/02-CONTEXT.md', 'context', 'phase'],
    ['phases/02-glaze-recipes/deferred-items.md', 'deferred-items', 'phase'],
    ['phases/02-glaze-recipes/SKELETON.md', 'skeleton', 'phase'],
    ['phases/02-glaze-recipes/.continue-here.md', 'continue-here', 'phase'],
    ['codebase/ARCHITECTURE.md', 'codebase-architecture', 'other'],
    ['codebase/STACK.md', 'codebase-stack', 'other'],
    ['codebase/CONVENTIONS.md', 'codebase-conventions', 'other'],
    ['spikes/MANIFEST.md', 'spikes-manifest', 'other'],
    ['spikes/CONVENTIONS.md', 'spikes-conventions', 'other'],
    ['spikes/001-kiln-sensor/README.md', 'spike', 'other'],
    ['seeds/SEED-001-glaze-library.md', 'seed', 'other'],
    ['threads/kiln-vendor-call.md', 'thread', 'other'],
    ['sketches/001-shelf-board/synthetic-planning/STATE.md', 'unknown', 'other'],
    ['phases/README.md', 'unknown', 'other'],
    ['quick/README.md', 'unknown', 'other'],
  ];

  it.each(KINDS)('%s has kind %s at location %s', (path, kind, location) => {
    expect(artifactAt(path)).toMatchObject({ kind, location });
  });

  it('keeps the folder notes in the model without a phase or a quick task', () => {
    expect(artifactAt('phases/README.md')).toMatchObject({ phaseKey: null });
    const refs = shapes.snapshot.project?.artifacts['.planning/quick/README.md'];
    expect(refs).toBeDefined();
  });

  it('never reads spikes/CONVENTIONS.md as the codebase conventions document', () => {
    expect(artifactAt('spikes/CONVENTIONS.md').kind).not.toBe(artifactAt('codebase/CONVENTIONS.md').kind);
  });

  it('keeps the sketch STATE.md out of the state lookup', () => {
    const states = shapes.presentation.artifacts.filter((artifact) => artifact.kind === 'state');
    expect(states.map((artifact) => artifact.path)).toEqual(['.planning/STATE.md']);
  });
});

describe.each(ALL_FIXTURE_ROOTS.map((root) => [root]))('the walk and the model agree - %s', (root) => {
  it('lists every discovered file path in presentation.artifacts', async () => {
    const { refs } = await discover(new LocalFsPlanningFilesystem(root));
    const { presentation } = await loadProject(root);
    const walked = refs.map((ref) => ref.path).sort();
    const modelled = presentation.artifacts.map((artifact) => artifact.path).sort();
    expect(modelled).toEqual(walked);
  });
});
