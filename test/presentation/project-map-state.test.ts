// TGT-09, D-04, D-08: projectMapState reads the artifact list and says which of the seven map documents a
// project holds and whether that map is all it holds. Pure: no filesystem, no payload.
import { describe, expect, it } from 'vitest';
import { CODEBASE_MAP_FILES } from '../../src/planning-repo/codebase-files.ts';
import { projectMapState } from '../../src/presentation/project-map-state.ts';

const at = (path: string, location = 'root') => ({ path, location });
const map = (name: string) => at(`.planning/codebase/${name}`, 'codebase');

describe('projectMapState', () => {
  it('is map-only for a project holding one map document', () => {
    expect(projectMapState([map('STACK.md')])).toEqual({ present: ['STACK.md'], mapOnly: true });
  });

  it('is not map-only once the project has a ROADMAP.md', () => {
    const artifacts = [...CODEBASE_MAP_FILES.map(map), at('.planning/ROADMAP.md')];
    const state = projectMapState(artifacts);
    expect(state.mapOnly).toBe(false);
    expect(state.present).toEqual([...CODEBASE_MAP_FILES]);
  });

  it('is not map-only when any artifact sits in a live or archived phase folder', () => {
    expect(projectMapState([map('STACK.md'), at('.planning/phases/01-a/01-CONTEXT.md', 'phase')]).mapOnly).toBe(false);
    expect(
      projectMapState([map('STACK.md'), at('.planning/milestones/v1.0-phases/01-a/01-CONTEXT.md', 'archived-phase')])
        .mapOnly,
    ).toBe(false);
  });

  it('is not map-only once a live workstream folder holds a file (RESEARCH C8)', () => {
    const state = projectMapState([map('STACK.md'), at('.planning/workstreams/alpha/STATE.md', 'other')]);
    expect(state).toEqual({ present: ['STACK.md'], mapOnly: false });
    expect(
      projectMapState([map('STACK.md'), at('.planning/workstreams/alpha/phases/01-a/01-CONTEXT.md', 'other')]).mapOnly,
    ).toBe(false);
  });

  it('stays map-only beside a lone file directly in workstreams/ (no workstream folder)', () => {
    expect(projectMapState([map('STACK.md'), at('.planning/workstreams/README.md', 'other')]).mapOnly).toBe(true);
  });

  it('stays map-only beside a PROJECT.md, a stray changelog and a ui-reviews folder', () => {
    const state = projectMapState([
      map('STACK.md'),
      at('.planning/PROJECT.md'),
      at('.planning/CHANGELOG-2026-10.md'),
      at('.planning/ui-reviews/home.md', 'ui-reviews'),
    ]);
    expect(state.mapOnly).toBe(true);
  });

  it('counts nothing for an unrecognised file in codebase/ or an empty folder (D-08)', () => {
    expect(projectMapState([map('notes.md')])).toEqual({ present: [], mapOnly: false });
    expect(projectMapState([])).toEqual({ present: [], mapOnly: false });
    expect(projectMapState([at('.planning/PROJECT.md')])).toEqual({ present: [], mapOnly: false });
  });

  it('lists the documents in page order whatever order the artifacts arrive in', () => {
    const shuffled = ['CONCERNS.md', 'STACK.md', 'TESTING.md', 'ARCHITECTURE.md'].map(map);
    expect(projectMapState(shuffled).present).toEqual(['STACK.md', 'ARCHITECTURE.md', 'TESTING.md', 'CONCERNS.md']);
  });

  it('ignores a map document name that sits anywhere but .planning/codebase/', () => {
    expect(projectMapState([at('.planning/research/STACK.md', 'research')]).present).toEqual([]);
  });
});
