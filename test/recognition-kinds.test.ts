// Phase 7, plan 02: files are recognised by where they live as well as by what they are called (DATA-07).
// The Shapes project is the made-up fixture (test/fixtures/shapes); nothing here reads another project.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDrawerViewModel } from '../src/presentation/drawer.ts';
import type { LoadedProject } from './helpers/fixture-project.ts';
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
