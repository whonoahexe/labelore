// NAV-09: the route table puts every page under /:project, and the gate decides what the first
// segment means. Importing the router module builds a browser router, which needs a document the
// node test environment lacks, so only that factory is replaced; the route objects are the real ones.
import type { RouteObject } from 'react-router';
import { matchRoutes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  createBrowserRouter: vi.fn(() => ({})),
}));

const { appRoutes } = await import('../../src/web/app-router.tsx');
const { presentationRoutePatterns } = await import('../../src/presentation/routes.ts');
const { projectGateOutcome } = await import('../../src/web/project-path.ts');

function leafOf(pathname: string): RouteObject | undefined {
  return matchRoutes(appRoutes, pathname)?.at(-1)?.route;
}

describe('appRoutes', () => {
  it('has a root redirect route and one /:project route', () => {
    expect(appRoutes.map((route) => route.path)).toEqual(['/', '/:project']);
  });

  it('maps the project root to the index child', () => {
    expect(leafOf('/lendshed')?.index).toBe(true);
    expect(leafOf('/lendshed/')?.index).toBe(true);
  });

  it('maps each page path to its own child', () => {
    for (const key of ['roadmap', 'search', 'traceability', 'sketches', 'research'] as const) {
      expect(leafOf(`/lendshed/${key}`)?.path).toBe(key);
    }
  });

  it('maps the encoded milestone, phase and artifact urls under the slug', () => {
    expect(leafOf('/lendshed/milestones/m~v1.1/phases/x')?.path).toBe(
      presentationRoutePatterns.phase.slice(1),
    );
    expect(leafOf('/lendshed/milestones/m~v1.1')?.path).toBe(
      presentationRoutePatterns.milestone.slice(1),
    );
    expect(leafOf('/lendshed/artifacts/a~x')?.path).toBe(
      presentationRoutePatterns.artifact.slice(1),
    );
  });

  it('hands the slug to the route as the project parameter', () => {
    const matches = matchRoutes(appRoutes, '/lendshed/roadmap');
    expect(matches?.[0].params.project).toBe('lendshed');
  });

  it('sends an unmapped address under the slug to the * child', () => {
    expect(leafOf('/lendshed/no/such')?.path).toBe('*');
  });

  it('answers a bare un-prefixed page address as a project named after it', () => {
    // /roadmap alone reads as the project "roadmap"; the gate then finds it is not the open project.
    const matches = matchRoutes(appRoutes, '/roadmap');
    expect(matches?.[0].params.project).toBe('roadmap');
    expect(leafOf('/roadmap')?.index).toBe(true);
  });

  it('mounts / on its own route', () => {
    expect(matchRoutes(appRoutes, '/')?.at(-1)?.route.path).toBe('/');
  });
});

describe('projectGateOutcome on the routed first segment', () => {
  const open = { projectSlug: 'lendshed', loadStatus: { status: 'ok' } };

  it.each([
    ['lendshed', undefined, 'loading'],
    ['lendshed', open, 'open'],
    ['someone-else', open, 'wrong-project'],
    ['roadmap', open, 'wrong-project'],
    ['lendshed', { projectSlug: 'lendshed', loadStatus: { status: 'path-not-found' } }, 'invalid'],
  ] as const)('%s with %j is %s', (first, presentation, outcome) => {
    expect(projectGateOutcome(first, presentation)).toBe(outcome);
  });
});
