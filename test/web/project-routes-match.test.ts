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
const { projectGateOutcome } = await import('../../src/web/project-path.ts');

function leafOf(pathname: string): RouteObject | undefined {
  return matchRoutes(appRoutes, pathname)?.at(-1)?.route;
}

describe('appRoutes', () => {
  it('has exactly two entries: the root redirect and one splat route under the project', () => {
    expect(appRoutes.map((route) => route.path)).toEqual(['/', '/:project/*']);
    expect(appRoutes.every((route) => route.children === undefined)).toBe(true);
  });

  it('sends every address under the slug to the one splat route', () => {
    for (const path of [
      '/lendshed',
      '/lendshed/',
      '/lendshed/roadmap',
      '/lendshed/v1.1/overview',
      '/lendshed/v1.1/phase-2.1/plan-01/summary',
      '/lendshed/quick/261024-qhq/summary',
      '/lendshed/file/state.json',
      '/lendshed/no/such',
    ]) {
      expect(leafOf(path)?.path, path).toBe('/:project/*');
    }
  });

  it('hands the slug to the route as the project parameter', () => {
    const matches = matchRoutes(appRoutes, '/lendshed/roadmap');
    expect(matches?.[0].params.project).toBe('lendshed');
  });

  it('answers a bare un-prefixed page address as a project named after it', () => {
    // /roadmap alone reads as the project "roadmap"; the gate then finds it is not the open project.
    const matches = matchRoutes(appRoutes, '/roadmap');
    expect(matches?.[0].params.project).toBe('roadmap');
    expect(leafOf('/roadmap')?.path).toBe('/:project/*');
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
