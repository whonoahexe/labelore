// D-04: every document-like page shares one breadcrumb trail. Over the Shapes payload a phase file climbs
// Dashboard, Roadmap, its milestone (to the milestone's /overview page), its phase, then its own title;
// a note and a root document stop after Roadmap. The labels are the ones the page showed before the URL
// change: only the addresses are new.
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { documentCrumbsOf } from '../../src/web/pages/document-crumbs.ts';
import { loadProject } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const shapes: ProjectPresentation = (await loadProject(SHAPES_ROOT)).presentation;

function crumbsOfKey(key: string) {
  const artifact = shapes.artifacts.find((candidate) => candidate.key === key);
  if (!artifact) throw new Error(`no artifact ${key}`);
  return documentCrumbsOf(shapes, artifact.path, artifact.title);
}

describe('documentCrumbsOf', () => {
  it('links a live phase file up through its milestone overview and its phase', () => {
    expect(crumbsOfKey('/v1.1/phase-2.1/context')).toEqual([
      { label: 'Dashboard', to: '/' },
      { label: 'Roadmap', to: '/roadmap' },
      { label: 'v1.1', to: '/v1.1/overview' },
      { label: 'Phase 02.1', to: '/v1.1/phase-2.1' },
      { label: 'Phase 2.1: Glaze hotfix - Context' },
    ]);
  });

  it('links an archived phase file to its archived milestone overview', () => {
    const crumbs = crumbsOfKey('/v1.0/phase-1/context');
    expect(crumbs.map((crumb) => crumb.to)).toEqual(['/', '/roadmap', '/v1.0/overview', '/v1.0/phase-1', undefined]);
    expect(crumbs[2].label).toBe('v1.0');
  });

  it('keeps a project-coded phase on its own address', () => {
    expect(crumbsOfKey('/v1.1/phase-kr-3/context').map((crumb) => crumb.to)).toEqual([
      '/',
      '/roadmap',
      '/v1.1/overview',
      '/v1.1/phase-kr-3',
      undefined,
    ]);
  });

  it('gives a note, a root document and a quick task Dashboard and Roadmap only', () => {
    for (const key of ['/notes/kiln-curve.dat', '/project', '/quick/261020-k4m']) {
      const crumbs = crumbsOfKey(key);
      expect(crumbs.map((crumb) => crumb.label).slice(0, 2), key).toEqual(['Dashboard', 'Roadmap']);
      expect(crumbs, key).toHaveLength(3);
    }
  });

  it('gives the short trail while the payload has not loaded or does not know the file', () => {
    expect(documentCrumbsOf(undefined, '.planning/PROJECT.md', 'Kilnrow')).toHaveLength(3);
    expect(documentCrumbsOf(shapes, '.planning/nothing.md', 'Nothing')).toHaveLength(3);
  });
});
