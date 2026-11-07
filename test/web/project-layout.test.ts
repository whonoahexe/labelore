// The project layout (PLAT-02, PLAT-08, D-06..D-08): a landing row leads to that project's dashboard
// through slug-scoped requests, slug-first query keys and a shell keyed by slug. Tracer proof, no
// browser: a real registry app answers in process through the fetch stand-in, and the layout is a
// static render over a QueryClient seeded through the key factory.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useRoutes } from 'react-router';
import type { RouteObject } from 'react-router';
import { formatProjectMeta } from '../../src/presentation/shell-header.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { ProjectRegistry } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { fileURLToPath } from 'node:url';
import { flatInventory } from '../../src/server/workstreams.ts';
import { fetchPresentation, fetchProjects, fetchWorkstreams, openProject } from '../../src/web/api.ts';
import { projectLayoutOutcome } from '../../src/web/project-path.ts';
import type { QueryStatusName } from '../../src/web/project-path.ts';
import { projectKey, projectsKey } from '../../src/web/query-keys.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { TEST_PORT, testPolicy } from '../helpers/guarded-request.ts';
import { installRegistryFetch } from '../helpers/registry-fetch.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

// Importing the router module builds a browser router, which needs a document the node test
// environment lacks, so only that factory is replaced; the route objects are the real ones.
// A static render never runs effects, so a <Navigate> would show nothing; it is replaced by a marker
// that names where it would go.
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  createBrowserRouter: vi.fn(() => ({})),
  Navigate: ({ to }: { to: string }) => createElement('i', { 'data-redirect': to }),
}));
const { appRoutes } = await import('../../src/web/app-router.tsx');
const { fetchDashboard } = await import('../../src/web/pages/dashboard-page.tsx');
const { ProjectLayoutNotice } = await import('../../src/web/pages/project-layout.tsx');

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

const BRINKWATER_ROOT = fileURLToPath(new URL('../fixtures/brinkwater', import.meta.url)).replace(/[\\/]$/, '');

async function installApp(options: { brinkwater?: boolean } = {}): Promise<void> {
  // The registry's default settings store is the in-memory one, so the real settings file is untouched.
  const registry = new ProjectRegistry();
  await registry.register(FX_ROOT);
  await registry.register(SHAPES_ROOT);
  if (options.brinkwater) await registry.register(BRINKWATER_ROOT);
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

    const dashboard = await fetchDashboard('lendshed', null);
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
    client.setQueryData(projectKey('shapes', null, 'presentation'), await fetchPresentation('shapes'));
    // The project's own first screen also waits for its workstream inventory (11-31); a flat project's is empty.
    client.setQueryData(projectKey('shapes', null, 'workstreams'), flatInventory());

    const markup = renderAt('/shapes', client);

    expect(markup).toContain(entry.name);
    expect(markup).toContain(`title="${entry.target}"`);
    expect(markup).toContain(`aria-label="Labelore — ${entry.name}"`);
    expect(markup).not.toContain('Opening');
  });
});

async function seeded(options: { openSlugs: string[]; list?: ProjectListResponse }): Promise<{
  client: QueryClient;
  list: ProjectListResponse;
  payloads: Record<string, ProjectPresentation>;
}> {
  const list = options.list ?? (await fetchProjects());
  const client = newClient();
  client.setQueryData(projectsKey, list);
  const payloads: Record<string, ProjectPresentation> = {};
  for (const slug of options.openSlugs) {
    payloads[slug] = await fetchPresentation(slug);
    client.setQueryData(projectKey(slug, null, 'presentation'), payloads[slug]);
    // The first screen of every project waits for its inventory too (11-31), read from the same registry app.
    client.setQueryData(projectKey(slug, null, 'workstreams'), await fetchWorkstreams(slug));
  }
  return { client, list, payloads };
}

describe('projectLayoutOutcome over every input combination', () => {
  const listed = [{ slug: 'portal' }, { slug: 'lendshed' }];
  const statuses: QueryStatusName[] = ['pending', 'error', 'success'];
  const presentations = [undefined, { loadStatus: { status: 'ok' } }, { loadStatus: { status: 'path-not-found' } }];

  it('keeps its invariants for a listed slug, a differently cased one, an unlisted one and an empty list', () => {
    for (const slug of ['portal', 'Portal', 'nope', '']) {
      for (const list of [undefined, [], listed]) {
        for (const listStatus of statuses) {
          for (const presentationStatus of statuses) {
            for (const presentation of presentations) {
              const outcome = projectLayoutOutcome({ slug, listStatus, projects: list, presentationStatus, presentation });
              const here = `${slug} / ${listStatus} / ${JSON.stringify(list)} / ${presentationStatus} / ${JSON.stringify(presentation)}`;
              const isListed = list?.some((entry) => entry.slug === slug) ?? false;
              if (listStatus === 'error') expect(outcome, here).toBe('list-error');
              else if (listStatus === 'pending' || list === undefined) expect(outcome, here).toBe('loading-list');
              else if (!isListed) expect(outcome, here).toBe('unknown');
              else {
                expect(['opening', 'presentation-error', 'invalid', 'open'], here).toContain(outcome);
                if (outcome === 'open') expect(presentation?.loadStatus.status, here).toBe('ok');
              }
            }
          }
        }
      }
    }
  });

  it('compares the slug exactly: Portal is not portal, and a padded slug is not the listed one', () => {
    const input = { listStatus: 'success', projects: listed, presentationStatus: 'pending', presentation: undefined } as const;
    expect(projectLayoutOutcome({ ...input, slug: 'Portal' })).toBe('unknown');
    expect(projectLayoutOutcome({ ...input, slug: 'portal ' })).toBe('unknown');
    expect(projectLayoutOutcome({ ...input, slug: 'portal' })).toBe('opening');
    expect(projectLayoutOutcome({ ...input, slug: 'portal', projects: [] })).toBe('unknown');
  });
});

describe('switching never shows the previous project (PLAT-08)', () => {
  it("names the new project and opens it with a loading body, though another project's data is cached", async () => {
    await installApp();
    const { client, list, payloads } = await seeded({ openSlugs: ['lendshed'] });
    const lendshed = list.projects.find((entry) => entry.slug === 'lendshed');
    const shapes = list.projects.find((entry) => entry.slug === 'shapes');
    if (!lendshed || !shapes) throw new Error('the fixture projects are not in the list');
    const dashboard = await fetchDashboard('lendshed', null);
    client.setQueryData(projectKey('lendshed', null, 'dashboard'), dashboard);

    const markup = renderAt('/shapes', client);

    expect(markup).toContain(`Opening ${shapes.name}…`);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain(`aria-label="Labelore — ${shapes.name}"`);
    expect(markup).toContain(`title="${shapes.target}"`);
    // Nothing of the cached project: not its name, its root, its dashboard heading or its meta line.
    expect(markup).not.toContain(lendshed.name);
    expect(markup).not.toContain(payloads.lendshed.rootPath);
    expect(markup).not.toContain(dashboard.head.name);
    const lendshedMeta = formatProjectMeta(payloads.lendshed.state);
    if (lendshedMeta) expect(markup).not.toContain(lendshedMeta);
    expect(markup).not.toContain('brand-meta');
  });

  it('names an unknown project as typed, lists the rows, and requests nothing for it', async () => {
    await installApp();
    const { client, list } = await seeded({ openSlugs: [] });
    const fetchSpy = vi.fn(globalThis.fetch);
    globalThis.fetch = fetchSpy as typeof fetch;

    const markup = renderAt('/nope', client);

    expect(markup).toContain('No project called “nope”.');
    for (const entry of list.projects) {
      expect(markup).toContain(entry.name);
      expect(markup).toContain(`href="/${entry.slug}"`);
    }
    expect(markup).not.toContain('Opening');
    expect(fetchSpy).not.toHaveBeenCalled();
    const asked = client.getQueryState(projectKey('nope', null, 'presentation'));
    expect(asked?.data).toBeUndefined();
    expect(asked?.fetchStatus ?? 'idle').toBe('idle');
  });

  it('does not open lendshed for /Lendshed: the slug is compared exactly', async () => {
    await installApp();
    const { client } = await seeded({ openSlugs: ['lendshed'] });
    const markup = renderAt('/Lendshed', client);
    expect(markup).toContain('No project called “Lendshed”.');
    expect(markup).not.toContain('Opening');
  });

  it('shows the invalid-target screen with the server message and the path checked when the load failed', async () => {
    await installApp();
    const { client, payloads } = await seeded({ openSlugs: ['shapes'] });
    client.setQueryData(projectKey('shapes', null, 'presentation'), {
      ...payloads.shapes,
      loadStatus: {
        status: 'path-not-found',
        pathChecked: '/made/up/checked/path',
        rawPath: '/made/up/checked/path',
        message: 'Nothing was found at the made-up path.',
      },
    } satisfies ProjectPresentation);

    const markup = renderAt('/shapes', client);

    expect(markup).toContain('Project could not be loaded.');
    expect(markup).toContain('Nothing was found at the made-up path.');
    expect(markup).toContain('/made/up/checked/path');
    expect(markup).not.toContain('Opening');
  });

  it("shows the shell with the project's own meta line once its presentation is cached", async () => {
    await installApp();
    const { client, list, payloads } = await seeded({ openSlugs: ['shapes'] });
    const meta = formatProjectMeta(payloads.shapes.state);
    const entry = list.projects.find((candidate) => candidate.slug === 'shapes');
    const markup = renderAt('/shapes', client);
    expect(markup).toContain(entry?.name ?? 'missing');
    if (meta === null) throw new Error('the shapes fixture has no state to show a meta line for');
    expect(markup).toContain(meta);
    // The outlet is not marked busy (the page inside may be, while its own data loads).
    expect(markup).toContain('<div class="shell-outlet" id="main-content">');
    expect(markup).not.toContain('Opening');
  });
});

describe('the workstream first screen (11-31, D-10; RESEARCH Pitfall 10)', () => {
  // Every routed page is lazy: a first static render starts the chunk, the second finds it loaded and draws the page.
  async function renderIndexAt(path: string, client: QueryClient): Promise<string> {
    renderAt(path, client);
    await import('../../src/web/pages/workstream-index-page.tsx');
    await new Promise((done) => setTimeout(done, 0));
    return renderAt(path, client);
  }

  it('opens a workstream project on its workstream index at / and at /workstreams', async () => {
    await installApp({ brinkwater: true });
    const { client } = await seeded({ openSlugs: ['brinkwater'] });
    for (const address of ['/brinkwater', '/brinkwater/', '/brinkwater/workstreams', '/brinkwater/workstreams/']) {
      const markup = await renderIndexAt(address, client);
      expect(markup, address).toContain('view-workstreams-page');
      expect(markup, address).toContain('Project · workstream mode');
      expect(markup, address).toContain('Shared by every workstream · .planning/');
      for (const name of ['intake', 'ledger', 'notices']) expect(markup, `${address} ${name}`).toContain(`href="/brinkwater/workstreams/${name}/"`);
      expect(markup, address).not.toContain('Opening');
    }
  });

  it('shows the workstream count beside the switcher and no Roadmap or Traceability tab on the index', async () => {
    await installApp({ brinkwater: true });
    const { client } = await seeded({ openSlugs: ['brinkwater'] });
    const markup = await renderIndexAt('/brinkwater', client);
    expect(markup).toContain('3 workstreams');
    expect(markup).toContain('href="/brinkwater"');
    expect(markup).not.toContain('href="/brinkwater/roadmap"');
    expect(markup).not.toContain('href="/brinkwater/traceability"');
  });

  it('shows the opening body, never a flat dashboard, until the inventory has loaded', async () => {
    await installApp({ brinkwater: true });
    const list = await fetchProjects();
    const client = newClient();
    client.setQueryData(projectsKey, list);
    client.setQueryData(projectKey('brinkwater', null, 'presentation'), await fetchPresentation('brinkwater'));
    const markup = renderAt('/brinkwater', client);
    expect(markup).toContain('Opening Brinkwater…');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain('view-workstreams-page');
    expect(markup).not.toContain('dashboard-page');
  });

  it('keeps a flat project exactly as it was: its dashboard, its tabs and its URLs', async () => {
    await installApp({ brinkwater: true });
    const { client } = await seeded({ openSlugs: ['shapes', 'lendshed'] });
    for (const slug of ['shapes', 'lendshed']) {
      const markup = await renderIndexAt(`/${slug}`, client);
      expect(markup, slug).not.toContain('view-workstreams-page');
      expect(markup, slug).not.toContain('workstream mode');
      expect(markup, slug).toContain(`href="/${slug}/roadmap"`);
      expect(markup, slug).toContain(`href="/${slug}/traceability"`);
      expect(markup, slug).not.toContain('Opening');
    }
  });

  it('keeps a flat project with archived workstream folders flat: the dashboard, no index', async () => {
    await installApp({ brinkwater: true });
    const { client } = await seeded({ openSlugs: ['shapes'] });
    client.setQueryData(projectKey('shapes', null, 'workstreams'), {
      ...flatInventory(),
      completed: [{ name: 'old', folder: 'milestones/ws-old-2026-01-01/', phasesArchived: 2 }],
    });
    const markup = await renderIndexAt('/shapes', client);
    expect(markup).not.toContain('view-workstreams-page');
    expect(markup).toContain('href="/shapes/roadmap"');
  });

  it('shows every tab inside a workstream and no index there', async () => {
    await installApp({ brinkwater: true });
    const { client } = await seeded({ openSlugs: ['brinkwater'] });
    client.setQueryData(projectKey('brinkwater', 'intake', 'presentation'), await fetchPresentation('brinkwater', 'intake'));
    const markup = await renderIndexAt('/brinkwater/workstreams/intake/', client);
    expect(markup).not.toContain('view-workstreams-page');
    expect(markup).toContain('href="/brinkwater/workstreams/intake"');
    expect(markup).toContain('href="/brinkwater/workstreams/intake/roadmap"');
    expect(markup).toContain('href="/brinkwater/workstreams/intake/traceability"');
  });
});

describe('the workstream index view contract (11-31, sketch 056 C)', () => {
  const read = (path: string): string => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const page = read('src/web/pages/workstream-index-page.tsx');
  const css = read('src/web/styles/globals.css');
  const start = '/* phase-11-workstreams:start */';
  const end = '/* phase-11-workstreams:end */';
  const block = css.slice(css.indexOf(start), css.indexOf(end) + end.length);
  const rules = (source: string): { selector: string; body: string }[] =>
    [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((match) => ({
      selector: match[1].replace(/\s+/g, ' ').trim(),
      body: match[2],
    }));

  it('puts every rule in one contiguous block, once', () => {
    expect(css.split(start)).toHaveLength(2);
    expect(css.split(end)).toHaveLength(2);
    expect(css.indexOf(start)).toBeLessThan(css.indexOf(end));
    expect(css.slice(css.indexOf(end) + end.length)).not.toContain('.view-workstreams-');
    expect(css.slice(0, css.indexOf(start))).not.toContain('.view-workstreams-');
  });

  it('draws names, statuses and phase names as React text: no raw-HTML prop anywhere on the page', () => {
    expect(page).not.toMatch(/dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML/);
  });

  it('uses only documented tones and never destructive or warning', () => {
    const tones = [...page.matchAll(/data-tone=(?:"([a-z-]+)"|\{([^}]*)\})/g)];
    expect(tones.length).toBeGreaterThan(0);
    // A literal tone is a documented one; the one computed tone is the model's, typed 'complete' | 'in-flight' | 'quiet'.
    for (const tone of tones) expect(['complete', 'quiet', 'in-flight', 'missing', 'active', 'status.tone']).toContain(tone[1] ?? tone[2]);
    expect(page).not.toMatch(/destructive|warning/);
    expect(block).not.toMatch(/--destructive|--warning|\[data-tone='(destructive|warning)'\]/);
  });

  it('keeps the accent off the Active mark and the active branch: --primary is the done arc of a ring and nothing else', () => {
    const accented = rules(block).filter((rule) => rule.body.includes('--primary'));
    expect(accented.map((rule) => rule.selector)).toEqual(['.view-workstreams-ring-done']);
    for (const rule of rules(block)) {
      if (/active/.test(rule.selector)) expect(rule.body, rule.selector).not.toMatch(/--primary|--in-flight|--missing/);
    }
    const active = rules(block).find((rule) => rule.selector === ".view-workstreams-branch[data-active='true']");
    expect(active?.body).toContain('2px solid var(--foreground)');
  });

  it('sets text in the four sizes plus the approved fifth, the head lead at --fs-fluid-1 (X6)', () => {
    const sizes = new Set([...block.matchAll(/font-size:\s*([^;]+);/g)].map((match) => match[1].trim()));
    for (const size of sizes) {
      expect(['var(--fs-display-3)', 'var(--fs-fluid-1)', 'var(--fs-7)', 'var(--fs-4)', 'var(--fs-2)', 'inherit']).toContain(size);
    }
    const lead = rules(block).find((rule) => rule.selector === '.view-workstreams-lead');
    expect(lead?.body).toContain('font-size: var(--fs-fluid-1);');
    expect(block).not.toMatch(/--fw-bold/);
  });

  it('draws the plans with the shared status-meter and the ring as one labelled image', () => {
    expect(page).toContain("import { StatusMeter } from '../components/status-meter.tsx';");
    expect(page).toContain('<StatusMeter');
    expect(page).toContain('role="img" aria-label={ring.label}');
    expect(page).toContain('aria-hidden="true" focusable="false"');
    expect(page).not.toMatch(/record-disagreement|RecordDisagreement/);
  });

  it('turns the tree into an indented list under 52rem and lets branches wrap', () => {
    expect(block).toContain('@media (max-width: 52rem)');
    expect(block).toContain('grid-template-columns: repeat(var(--view-workstreams-cols), minmax(0, 1fr));');
    expect(page).toContain('const MAX_COLUMNS = 4;');
  });

  it('gives a branch name one link and no nested interactive element in a branch heading', () => {
    expect(page).toMatch(/<h3 className="view-workstreams-name"[^>]*>\s*\{branch\.url === null \? <span>\{branch\.name\}<\/span> : <Link to=\{branch\.url\}>\{branch\.name\}<\/Link>\}\s*<\/h3>/);
    expect(page).not.toMatch(/<button/);
  });
});

describe('the screens that stand in for a project', () => {
  it('shows a quiet "Loading projects…" with role status while the list loads', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(ProjectLayoutNotice, { kind: 'loading' })),
    );
    expect(markup).toContain('Loading projects…');
    expect(markup).toContain('role="status"');
  });

  it('shows a destructive notice with role alert and an outline Retry button when the list fails', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ProjectLayoutNotice, {
          kind: 'error',
          message: 'Labelore could not be reached.',
          onRetry: () => undefined,
        }),
      ),
    );
    expect(markup).toContain('notice destructive');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Labelore could not be reached.');
    expect(markup).toContain('Retry loading projects');
  });
});

describe('an un-prefixed Phase 7 address', () => {
  it('goes to the landing page when no project is remembered', async () => {
    await installApp();
    const client = newClient();
    client.setQueryData(projectsKey, { projects: [], notices: [] } satisfies ProjectListResponse);
    expect(renderAt('/roadmap', client)).toContain('data-redirect="/"');
  });

  it('redirects under the most recently opened project, the first listed', async () => {
    await installApp();
    await openProject('shapes');
    const list = await fetchProjects();
    const first = list.projects[0].slug;
    expect(first).toBe('shapes');
    const { client } = await seeded({ openSlugs: [first], list });
    expect(renderAt('/roadmap', client)).toContain(`data-redirect="/${first}/roadmap"`);
  });
});

describe('the layout source', () => {
  const layout = readFileSync(new URL('../../src/web/pages/project-layout.tsx', import.meta.url), 'utf8');
  const code = layout
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');

  it('keys every AppShell by slug', () => {
    const shells = code.match(/<AppShell\b[^>]*>/g) ?? [];
    expect(shells.length).toBeGreaterThanOrEqual(3);
    for (const shell of shells) expect(shell).toContain('key={slug}');
  });

  it('keeps no previous data across a switch and builds its presentation key through the factory', () => {
    expect(code).not.toMatch(/placeholderData|keepPreviousData/);
    expect(code).toContain("projectKey(slug, scope, 'presentation')");
    expect(code).toContain("projectKey(slug, scope, 'workstreams')");
    expect(code).toContain('queryKey: projectsKey');
  });

  it('holds the opening body only while the inventory is pending, asks for it only on the first screen, and lets a failed one fall through', () => {
    expect(code).toContain('const firstScreen = workstreamIndex !== undefined && scope === null && isWorkstreamIndexAddress(pathname);');
    expect(code).toContain('enabled: listed && firstScreen,');
    expect(code).toContain("const inventoryPending = firstScreen && inventory.status === 'pending';");
    expect(code).toContain("outcome === 'open' && inventoryPending");
    expect(code).toContain("workstreams.mode === 'workstreams'");
  });

  it('posts the open once per mounted slug, only for a listed one', () => {
    expect(code).toContain('stamped.current === slug');
    expect(code).toContain('openProject(slug)');
    expect(code).toMatch(/enabled: listed/);
  });
});
