// D-15, D-17, VIEW-20: the made-up workstream project (test/fixtures/brinkwater) loaded today, before any
// workstream code exists. This is the BASELINE the last waves change: the project opens without a throw, is
// not map-only (RESEARCH C8, as 11-03 built it), its workstream files are reachable as plain documents at
// location `other`, and GSD's `active-workstream` pointer is internal bookkeeping, never an artifact.
// "Projects without workstreams look and behave exactly as before" (D-13) is checked on Shapes, not here.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { projectMapState } from '../src/presentation/project-map-state.ts';
import { ALL_FIXTURE_ROOTS } from './helpers/fixture-roots.ts';
import { loadProject } from './helpers/fixture-project.ts';
import type { LoadedProject } from './helpers/fixture-project.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const BRINKWATER = join(REPO_ROOT, 'test/fixtures/brinkwater');
const WORKSTREAM_DIR = '.planning/workstreams/intake/';

function artifactsOf(loaded: LoadedProject): { path: string; location: string; kind: string }[] {
  const project = loaded.snapshot.project;
  if (!project) throw new Error('Brinkwater did not load into a project');
  return Object.values(project.artifacts).map((artifact) => ({
    path: artifact.path,
    location: artifact.location,
    kind: artifact.kind,
  }));
}

describe('the Brinkwater workstream fixture, before any workstream code (D-15)', () => {
  it('is one of the fixture roots every all-roots test walks', () => {
    expect(ALL_FIXTURE_ROOTS).toContain(BRINKWATER);
  });

  it('loads through the real repository without a throw and holds a project', async () => {
    const loaded = await loadProject(BRINKWATER);
    expect(loaded.snapshot.project).not.toBeNull();
    expect(loaded.snapshot.loadStatus).not.toBe('failed');
  });

  it('holds the root files GSD writes at the top of a workstream project', async () => {
    const paths = artifactsOf(await loadProject(BRINKWATER)).map((artifact) => artifact.path);
    expect(paths).toContain('.planning/PROJECT.md');
    expect(paths).toContain('.planning/config.json');
    expect(paths).toContain('.planning/codebase/STACK.md');
    expect(paths).not.toContain('.planning/ROADMAP.md');
    expect(paths).not.toContain('.planning/STATE.md');
  });

  it('is not map-only although it holds a codebase map (RESEARCH C8)', async () => {
    const state = projectMapState(artifactsOf(await loadProject(BRINKWATER)));
    expect(state.present).toEqual(['STACK.md']);
    expect(state.mapOnly).toBe(false);
  });

  it('reaches the intake workstream files as plain documents at location other', async () => {
    const inWorkstream = artifactsOf(await loadProject(BRINKWATER)).filter((artifact) =>
      artifact.path.startsWith(WORKSTREAM_DIR),
    );
    const names = inWorkstream.map((artifact) => artifact.path.slice(WORKSTREAM_DIR.length));
    for (const name of ['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md']) expect(names).toContain(name);
    for (const artifact of inWorkstream) expect(artifact.location).toBe('other');
  });

  it("reaches intake's phase files as artifacts at location other, not as phases of the project", async () => {
    const loaded = await loadProject(BRINKWATER);
    const phaseFiles = artifactsOf(loaded).filter((artifact) => artifact.path.startsWith(`${WORKSTREAM_DIR}phases/`));
    expect(phaseFiles.map((artifact) => artifact.path.slice(WORKSTREAM_DIR.length)).sort()).toEqual([
      'phases/01-sensor-feed/01-01-PLAN.md',
      'phases/01-sensor-feed/01-01-SUMMARY.md',
      'phases/02-feed-alerts/02-01-PLAN.md',
    ]);
    for (const artifact of phaseFiles) expect(artifact.location).toBe('other');
    expect(loaded.snapshot.project?.phases).toEqual([]);
  });

  it('holds the root todo beside the workstream, outside it', async () => {
    const paths = artifactsOf(await loadProject(BRINKWATER)).map((artifact) => artifact.path);
    expect(paths).toContain('.planning/todos/pending/2026-05-02-gauge-calibration.md');
  });

  it('keeps active-workstream out of the artifacts: root internal bookkeeping (UI-SPEC section 8 rule 6)', async () => {
    const loaded = await loadProject(BRINKWATER);
    const paths = artifactsOf(loaded).map((artifact) => artifact.path);
    expect(paths).not.toContain('.planning/active-workstream');
    expect(loaded.snapshot.exclusions.map((exclusion) => exclusion.path)).toContain('.planning/active-workstream');
  });

  it('writes the pointer as GSD does: only the workstream name and a newline', () => {
    expect(readFileSync(join(BRINKWATER, '.planning/active-workstream'), 'utf8')).toBe('intake\n');
  });
});
