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
import type { ProjectListEntry, ProjectListResponse } from '../../src/presentation/project-list.ts';
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
import { AppLink, ProjectSlugProvider } from '../../src/web/nav.tsx';
import { formatOpenedAgo, openedTitle } from '../../src/web/opened-ago.ts';
import { ProjectsListSection, ProjectsPage } from '../../src/web/pages/projects-page.tsx';
import { UnknownProjectPage } from '../../src/web/pages/unknown-project-page.tsx';
import { projectRootPath } from '../../src/web/project-path.ts';
import { projectKey, projectsKey } from '../../src/web/query-keys.ts';
import { FX_ROOT, loadFixtureProject } from '../helpers/fixture-project.ts';
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

// ---------------------------------------------------------------------------------------------------
// The landing page in every state (Task 2). Made-up projects only; the clock is passed in.
// ---------------------------------------------------------------------------------------------------

const NOW = Date.parse('2026-10-30T12:00:00.000Z');
const ago = (seconds: number): string => new Date(NOW - seconds * 1000).toISOString();
const HOUR = 3600;
const DAY = 24 * HOUR;

function entry(slug: string, over: Partial<ProjectListEntry> = {}): ProjectListEntry {
  return {
    slug,
    name: slug,
    kind: 'local',
    target: `/home/you/Projects/${slug}`,
    displayPath: `~/Projects/${slug}`,
    state: 'ready',
    reason: null,
    pathChecked: null,
    lastOpened: null,
    sessionOnly: false,
    ...over,
  };
}

const PORTAL_REASON = 'No such path: ~/Projects/beta/portal (resolved: /home/you/Projects/beta/portal)';
const ROWS: ProjectListEntry[] = [
  entry('lendshed', { name: 'Lendshed', lastOpened: ago(3 * HOUR + 120) }),
  entry('portal', { name: 'Portal', state: 'loading', lastOpened: ago(DAY + 3600) }),
  entry('kiln', {
    name: 'Kiln',
    kind: 'ssh',
    target: 'ssh://build-box/srv/kiln',
    displayPath: 'ssh://build-box/srv/kiln',
    lastOpened: ago(3 * DAY),
  }),
  entry('portal-2', {
    name: 'portal',
    state: 'unavailable',
    reason: PORTAL_REASON,
    pathChecked: '/home/you/Projects/beta/portal',
    lastOpened: ago(8 * DAY),
  }),
  entry('shapes', { name: 'Shapes' }),
];

const inRouter = (node: React.ReactElement): string =>
  renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/'] }, node));

const sectionOf = (response: ProjectListResponse): string =>
  inRouter(createElement(ProjectsListSection, { state: { kind: 'ready', response, now: NOW } }));

/** The markup of each row, in order. */
const rowsOf = (markup: string): string[] => markup.split('<li ').slice(1);

describe('the landing rows', () => {
  const markup = sectionOf({ projects: ROWS, notices: [] });
  const rows = rowsOf(markup);

  it('lists one row per entry in the order the server sent, each name linking to /<slug>', () => {
    expect(rows).toHaveLength(5);
    const hrefs = rows.map((row) => /href="([^"]*)"/.exec(row)?.[1]);
    expect(hrefs).toEqual(['/lendshed', '/portal', '/kiln', '/portal-2', '/shapes']);
  });

  it('shows the last-opened time with its absolute date as the title, or Not opened yet', () => {
    expect(rows[0]).toContain('Opened 3 hours ago');
    expect(rows[0]).toContain(`title="${openedTitle(ROWS[0].lastOpened)}"`);
    expect(rows[1]).toContain('Opened yesterday');
    expect(rows[2]).toContain('Opened 3 days ago');
    expect(rows[3]).toContain('Opened last week');
    expect(rows[4]).toContain('Not opened yet');
    expect(rows[4]).not.toMatch(/project-row-meta"[^>]*title=/);
  });

  it('marks a loading project quietly and an unavailable one in the missing tone with its reason', () => {
    expect(rows[1]).toContain('data-tone="quiet"');
    expect(rows[1]).toContain('Opening…');
    expect(rows[3]).toContain('data-tone="missing"');
    expect(rows[3]).toContain('>Unavailable<');
    expect(rows[3]).toContain(`<p class="source-note">${PORTAL_REASON}</p>`);
    // The unavailable row keeps its place (fourth) and its link is still followable.
    expect(rows[3]).toContain('href="/portal-2"');
    for (const index of [0, 2, 4]) {
      expect(rows[index]).not.toContain('status-chip');
      expect(rows[index]).not.toContain('source-note');
    }
  });

  it('shows a local path with the Folder icon and an ssh target verbatim with the Server icon, full value in title', () => {
    expect(rows[0]).toContain('lucide-folder');
    expect(rows[0]).toContain('title="/home/you/Projects/lendshed"');
    expect(rows[0]).toContain('<span>~/Projects/lendshed</span>');
    expect(rows[2]).toContain('lucide-server');
    expect(rows[2]).toContain('title="ssh://build-box/srv/kiln"');
    expect(rows[2]).toContain('<span>ssh://build-box/srv/kiln</span>');
  });

  it('renders names, paths and reasons as text, never as markup (T-08-22)', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = sectionOf({
      projects: [entry('evil', { name: hostile, displayPath: hostile, state: 'unavailable', reason: hostile })],
      notices: [hostile],
    });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('shows no milestone, phase or progress, even with a presentation cached for the project (D-02)', async () => {
    const { presentation } = await loadFixtureProject();
    const state = presentation.state;
    expect(state?.milestoneName).toBeTruthy();
    expect(state?.phaseName).toBeTruthy();
    const client = new QueryClient();
    client.setQueryData(projectsKey, { projects: [entry('lendshed', { name: 'Lendshed' })], notices: [] });
    client.setQueryData(projectKey('lendshed', 'presentation'), presentation);
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ProjectsPage)),
      ),
    );
    expect(html).toContain('Lendshed');
    for (const text of [state?.milestoneName, state?.phaseName, state?.milestone]) {
      if (text) expect(html).not.toContain(text);
    }
    expect(html).not.toMatch(/progress|percent/i);
  });
});

describe('the landing page states', () => {
  it('still renders the list for exactly one project, never a redirect (D-01)', () => {
    const html = renderPage({ projects: [entry('shapes', { name: 'Shapes' })], notices: [] });
    expect(html).toContain('<h1>Projects</h1>');
    expect(html).toContain('href="/shapes"');
    expect(html.match(/class="project-row"/g)).toHaveLength(1);
    expect(html).not.toContain('No projects yet.');
  });

  it('replaces the list with the empty flow when there are no projects', () => {
    const html = renderPage({ projects: [], notices: [] });
    expect(html).toContain('No projects yet.');
    // The copy names the example folder; it is joined here so no tilde path into a real folder is written.
    expect(html).toContain(
      `Add a folder or an ssh:// target above, or scan a folder such as ${['~', 'Work'].join('/')} to find GSD projects.`,
    );
    expect(html).not.toContain('project-list');
  });

  it('shows the settings notices above the list, each with role status', () => {
    const notices = [
      "Labelore's settings could not be read, so the list started empty. The old file was kept as settings.json.bak.",
      'A saved project was skipped: its slug "API" is not a valid project name.',
    ];
    const html = renderPage({ projects: ROWS, notices });
    for (const notice of notices) {
      expect(html).toContain(notice.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'));
    }
    expect(html.match(/<div class="notice" role="status">/g)).toHaveLength(2);
    expect(html.indexOf('class="notice"')).toBeLessThan(html.indexOf('class="project-list"'));
  });

  it('shows Loading projects… with role status while the list is in flight', () => {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ProjectsPage)),
      ),
    );
    expect(html).toContain('<div class="quiet-state" role="status">');
    expect(html).toContain('Loading projects…');
    expect(html).not.toContain('project-list');
  });

  it('shows the error copy with role alert and a Retry loading projects button when the list fails', () => {
    for (const message of [UNREACHABLE_COPY, REFUSED_COPY]) {
      const html = inRouter(
        createElement(ProjectsListSection, { state: { kind: 'error', message, onRetry: () => undefined } }),
      );
      expect(html).toContain('<div class="notice destructive" role="alert">');
      expect(html).toContain(message);
      expect(html).toContain('Retry loading projects');
    }
  });

  it('renders the plain header: mark and wordmark to /, the theme toggle, no shell tabs or search', () => {
    const html = renderPage({ projects: ROWS, notices: [] });
    expect(html).toContain('<header class="shell-header">');
    expect(html).toContain('aria-label="Labelore — all projects"');
    expect(html).toContain('href="/"');
    expect(html).toContain('Toggle light or dark theme');
    expect(html).not.toContain('shell-nav');
    expect(html).not.toContain('sidebar-trigger');
    expect(html).not.toContain('Search');
  });
});

describe('UnknownProjectPage', () => {
  it('names the slug as typed, lists the rows and links to /, fetching nothing', () => {
    // No QueryClientProvider around it: a page that used react-query would throw here.
    const html = inRouter(createElement(UnknownProjectPage, { slug: 'Portal', projects: ROWS }));
    expect(html).toContain('<h1>No project called “Portal”.</h1>');
    expect(html).toContain(
      'Labelore does not know a project by this name. It may have been forgotten, or the link came from another run.',
    );
    expect(rowsOf(html)).toHaveLength(5);
    expect(html).toMatch(/<a class="text-link" href="\/"[^>]*>See all projects<\/a>/);
    expect(html).not.toContain('aria-current');
    expect(html).toContain('<header class="shell-header">');
  });

  it('renders a slug that holds markup as text', () => {
    const html = inRouter(createElement(UnknownProjectPage, { slug: '<b>x</b>', projects: [] }));
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('See all projects');
  });
});

describe('AppLink', () => {
  const link = (to: string): string =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/lendshed/roadmap'] },
        createElement(ProjectSlugProvider, { value: 'lendshed' }, createElement(AppLink, { to }, 'x')),
      ),
    );

  it('goes to / or another project root and is never prefixed with the current slug (T-08-21)', () => {
    expect(link('/')).toContain('href="/"');
    expect(link('/shapes')).toContain('href="/shapes"');
    expect(link('/lendshed')).toContain('href="/lendshed"');
  });

  it('collapses anything else to /', () => {
    for (const bad of ['', 'shapes', '//evil', '/API', '/shapes/roadmap', '/shapes?x=1', '/\\evil', 'https://evil.example']) {
      expect(link(bad), bad).toContain('href="/"');
    }
  });
});

describe('formatOpenedAgo', () => {
  const at = (seconds: number): string => formatOpenedAgo(ago(seconds), NOW);

  it('reads null as Not opened yet', () => {
    expect(formatOpenedAgo(null, NOW)).toBe('Not opened yet');
    expect(formatOpenedAgo('not a time', NOW)).toBe('Not opened yet');
  });

  it('picks the largest unit with a magnitude of at least one and truncates toward zero', () => {
    expect(at(0)).toBe('Opened now');
    expect(at(59)).toBe('Opened 59 seconds ago');
    expect(at(60)).toBe('Opened 1 minute ago');
    expect(at(3 * HOUR + 59 * 60)).toBe('Opened 3 hours ago');
    expect(at(DAY)).toBe('Opened yesterday');
    expect(at(2 * DAY)).toBe('Opened 2 days ago');
    expect(at(6 * DAY)).toBe('Opened 6 days ago');
    expect(at(7 * DAY)).toBe('Opened last week');
    expect(at(29 * DAY)).toBe('Opened 4 weeks ago');
    expect(at(30 * DAY)).toBe('Opened last month');
    expect(at(364 * DAY)).toBe('Opened 12 months ago');
    expect(at(365 * DAY)).toBe('Opened last year');
  });

  it('reads a time in the future as now', () => {
    expect(at(-HOUR)).toBe('Opened now');
  });

  it('gives the absolute date as the title, empty for a project never opened', () => {
    const iso = ago(DAY);
    expect(openedTitle(iso)).toBe(new Date(iso).toLocaleString());
    expect(openedTitle(null)).toBe('');
  });
});
