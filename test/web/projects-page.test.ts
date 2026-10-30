// The projects landing page (PLAT-02, PLAT-08, D-01..D-04): the registry's cheap list reaches the
// landing rows through api.ts and the key factory. Tracer proof, no browser: a real registry app answers
// in process, the client's fetch is the stand-in from registry-fetch.ts, and the page is a static render
// over a seeded QueryClient.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import { ProjectRegistry } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import {
  ApiError,
  REFUSED_COPY,
  UNREACHABLE_COPY,
  apiFetch,
  fetchProjects,
  projectUrl,
} from '../../src/web/api.ts';
import { ProjectsPage } from '../../src/web/pages/projects-page.tsx';
import { projectRootPath } from '../../src/web/project-path.ts';
import { projectKey, projectsKey } from '../../src/web/query-keys.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { TEST_PORT, testPolicy } from '../helpers/guarded-request.ts';
import { installRegistryFetch } from '../helpers/registry-fetch.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

async function makeApp() {
  const registry = new ProjectRegistry();
  await registry.register(FX_ROOT);
  await registry.register(SHAPES_ROOT);
  return createRegistryApp(registry, { policy: testPolicy() });
}

function renderPage(list: ProjectListResponse): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(projectsKey, list);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ProjectsPage)),
    ),
  );
}

describe('the landing list reaches the page through api.ts', () => {
  it('lists both fixture projects from the registry app, one row each, linking to /<slug>', async () => {
    restores.push(installRegistryFetch(await makeApp(), TEST_PORT));
    const list = await fetchProjects();
    const slugs = list.projects.map((entry) => entry.slug);
    expect(slugs).toEqual(expect.arrayContaining(['lendshed', 'shapes']));
    expect(slugs).toHaveLength(2);

    const markup = renderPage(list);
    expect(markup).toContain('<h1>Projects</h1>');
    for (const entry of list.projects) expect(markup).toContain(entry.name);
    expect(markup).toContain('href="/lendshed"');
    expect(markup).toContain('href="/shapes"');
    expect(markup.match(/class="project-row"/g)).toHaveLength(2);
    // Server order is kept: the page does not sort.
    const order = slugs.map((slug) => markup.indexOf(`href="/${slug}"`));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('apiFetch', () => {
  it('maps a request the guard refuses (no Host header) to the refused copy', async () => {
    const app = await makeApp();
    // app.request sends no Host header of its own, so the request guard refuses it with a 403.
    const original = globalThis.fetch;
    globalThis.fetch = ((url: string) => Promise.resolve(app.request(url))) as typeof fetch;
    restores.push(() => {
      globalThis.fetch = original;
    });
    const failure = await fetchProjects().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe('refused');
    expect((failure as ApiError).message).toBe(REFUSED_COPY);
    expect((failure as ApiError).status).toBe(403);
  });

  it('maps a network failure to the unreachable copy', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new TypeError('fetch failed'))) as typeof fetch;
    restores.push(() => {
      globalThis.fetch = original;
    });
    const failure = await fetchProjects().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe('unreachable');
    expect((failure as ApiError).message).toBe(UNREACHABLE_COPY);
    expect((failure as ApiError).status).toBeNull();
  });

  it('turns another failing status into an http error carrying the server text, else a generic line', async () => {
    const original = globalThis.fetch;
    restores.push(() => {
      globalThis.fetch = original;
    });
    globalThis.fetch = (() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'No such path' }), { status: 400 }))) as typeof fetch;
    const withText = await apiFetch('/api/projects').catch((error: unknown) => error);
    expect((withText as ApiError).kind).toBe('http');
    expect((withText as ApiError).message).toBe('No such path');
    globalThis.fetch = (() => Promise.resolve(new Response('nope', { status: 500 }))) as typeof fetch;
    const without = await apiFetch('/api/projects').catch((error: unknown) => error);
    expect((without as ApiError).message).toBe('Request failed (500)');
  });

  it('sends Accept on a read and Content-Type application/json with a JSON body on every write', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = ((url: string, init: RequestInit) => {
      seen.push({ url, init });
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;
    restores.push(() => {
      globalThis.fetch = original;
    });
    await apiFetch('/api/projects');
    await apiFetch('/api/projects', { method: 'POST' });
    await apiFetch('/api/projects/x', { method: 'DELETE', body: { reason: 'gone' } });
    const [read, post, del] = seen;
    expect(new Headers(read.init.headers).get('accept')).toBe('application/json');
    expect(read.init.body).toBeUndefined();
    expect(new Headers(post.init.headers).get('content-type')).toBe('application/json');
    expect(post.init.body).toBe('{}');
    expect(new Headers(del.init.headers).get('content-type')).toBe('application/json');
    expect(del.init.body).toBe('{"reason":"gone"}');
  });

  it('builds a project url from an encoded slug and refuses a path without a leading slash', () => {
    expect(projectUrl('lendshed', '/presentation')).toBe('/api/projects/lendshed/presentation');
    expect(projectUrl('a b', '/x')).toBe('/api/projects/a%20b/x');
    expect(() => projectUrl('lendshed', 'presentation')).toThrow();
  });
});

describe('query keys and links', () => {
  it('builds the list key and a slug-first project key', () => {
    expect(projectsKey).toEqual(['projects']);
    expect(projectKey('lendshed', 'presentation')).toEqual(['project', 'lendshed', 'presentation']);
    expect(projectKey('lendshed')).toEqual(['project', 'lendshed']);
  });

  it('projectRootPath names a valid slug and collapses everything else to /', () => {
    expect(projectRootPath('lendshed')).toBe('/lendshed');
    expect(projectRootPath('portal-2')).toBe('/portal-2');
    for (const bad of ['API', '//evil', '', 'api', 'a/b', '-x']) expect(projectRootPath(bad), bad).toBe('/');
  });
});

describe('the router', () => {
  const router = readFileSync(new URL('../../src/web/app-router.tsx', import.meta.url), 'utf8');

  it('mounts the landing page on / and never redirects it', () => {
    expect(router).toMatch(/path: '\/',\s*element: <ProjectsRoute \/>/);
    const route = router.slice(router.indexOf('function ProjectsRoute'), router.indexOf('const UNPREFIXED_WORDS'));
    expect(route).toContain('<ProjectsPage />');
    expect(route).not.toContain('<Navigate');
    expect(router).not.toContain('RootRedirect');
  });
});
