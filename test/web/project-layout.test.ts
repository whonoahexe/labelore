// The project layout (PLAT-02, PLAT-08, D-06..D-08): a landing row leads to that project's dashboard
// through slug-scoped requests, slug-first query keys and a shell keyed by slug. Tracer proof, no
// browser: a real registry app answers in process through the fetch stand-in, and the layout is a
// static render over a QueryClient seeded through the key factory.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useRoutes } from 'react-router';
import type { RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import { ProjectRegistry } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { fetchPresentation, fetchProjects, openProject } from '../../src/web/api.ts';
import { projectKey, projectsKey } from '../../src/web/query-keys.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { TEST_PORT, testPolicy } from '../helpers/guarded-request.ts';
import { installRegistryFetch } from '../helpers/registry-fetch.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

// Importing the router module builds a browser router, which needs a document the node test
// environment lacks, so only that factory is replaced; the route objects are the real ones.
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  createBrowserRouter: vi.fn(() => ({})),
}));
const { appRoutes } = await import('../../src/web/app-router.tsx');
const { fetchDashboard } = await import('../../src/web/pages/dashboard-page.tsx');

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

async function installApp(): Promise<void> {
  // The registry's default settings store is the in-memory one, so the real settings file is untouched.
  const registry = new ProjectRegistry();
  await registry.register(FX_ROOT);
  await registry.register(SHAPES_ROOT);
  restores.push(installRegistryFetch(createRegistryApp(registry, { policy: testPolicy() }), TEST_PORT));
}

function Routed(): React.ReactElement | null {
  return useRoutes(appRoutes as RouteObject[]);
}

function renderAt(path: string, client: QueryClient): string {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, { initialEntries: [path] }, createElement(Routed)),
    ),
  );
}

const newClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('the registry-backed client calls', () => {
  it('lists both fixture projects, reads one project\'s presentation and dashboard, and stamps an open', async () => {
    await installApp();
    const list = await fetchProjects();
    expect(list.projects.map((entry) => entry.slug).sort()).toEqual(['lendshed', 'shapes']);

    const presentation = await fetchPresentation('shapes');
    expect(presentation.projectSlug).toBe('shapes');

    const dashboard = await fetchDashboard('lendshed');
    expect(dashboard.loadStatus.status).toBe('ok');

    await openProject('shapes');
    const after = await fetchProjects();
    expect(after.projects[0].slug).toBe('shapes');
    expect(typeof after.projects[0].lastOpened).toBe('string');
  });
});

describe('opening a project from its URL', () => {
  it('renders the shell for the listed project, named from the list entry, once its presentation is cached', async () => {
    await installApp();
    const list: ProjectListResponse = await fetchProjects();
    const entry = list.projects.find((candidate) => candidate.slug === 'shapes');
    if (!entry) throw new Error('the shapes fixture is not in the list');
    const client = newClient();
    client.setQueryData(projectsKey, list);
    client.setQueryData(projectKey('shapes', 'presentation'), await fetchPresentation('shapes'));

    const markup = renderAt('/shapes', client);

    expect(markup).toContain(entry.name);
    expect(markup).toContain(`title="${entry.target}"`);
    expect(markup).toContain(`aria-label="Labelore — ${entry.name}"`);
    expect(markup).not.toContain('Opening');
  });
});
