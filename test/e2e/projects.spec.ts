// Phase 8 (08-15): the multi-project behaviour the roadmap promises, proved together in Chromium against
// the real server, the way a person meets it: switching without a flash of the project just left, a restart
// that keeps every slug and bookmark, remembered projects that are gone or unreachable, an unknown slug, two
// tabs that do not disturb each other, and (further down) a page from another website that cannot change
// anything. Every name, slug and target is read from the running server's own list, never written here.
// Fixtures are copies in mkdtemp folders and a seeded settings file, so nothing in the repository is ever
// a write path and no real home folder is read.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { cpSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { projectUrl } from './app-url.ts';
import { FIXTURE_ROOT, SHAPES_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer, type ProjectsServer } from './projects-server.ts';

interface ListedProject {
  slug: string;
  name: string;
  kind: string;
  target: string;
  state: string;
  reason: string | null;
  lastOpened: string | null;
}

async function listProjects(base: string): Promise<ListedProject[]> {
  const response = await fetch(`${base}/api/projects`);
  const { projects } = (await response.json()) as { projects: ListedProject[] };
  return projects;
}

function trigger(page: Page, project: ListedProject): Locator {
  return page.getByRole('button', { name: `Switch project. Current project: ${project.name}` });
}

function popupOf(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Projects' });
}

/** The row of the project whose full target is `target`: its path line carries the target in `title`. */
function rowByTarget(scope: Locator | Page, target: string): Locator {
  return scope.locator(`.project-row:has(.project-row-path[title="${target}"])`);
}

/** Opens the landing page the way a person does: from a project, through the switcher's 'All projects'
 * (the browser specs' URL contract has no address for `/`). */
async function goToLanding(page: Page, base: string, from: ListedProject): Promise<void> {
  await page.goto(await projectUrl(base, '/', from.slug));
  await trigger(page, from).click();
  await popupOf(page).getByRole('link', { name: 'All projects' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
}

interface Sample {
  path: string;
  text: string;
  trigger: string | null;
  /** performance.now() of the frame, in milliseconds. */
  at: number;
}

const SEEDED_AT = '2026-10-01T00:00:00.000Z';

test.describe('several projects in one browser', () => {
  // The cases share one story: the first server opens projects, the second is the same settings after a
  // restart, and the later cases read what that restart kept.
  test.describe.configure({ mode: 'serial' });

  const parents: string[] = [];
  let settingsDir = '';
  let server: ProjectsServer;
  let lendshed: ListedProject;
  let portal: ListedProject;
  let portalTwo: ListedProject;
  let portalPath = '';
  let portalTwoPath = '';
  let goneTarget = '';

  async function listed(): Promise<ListedProject[]> {
    return await listProjects(server.base);
  }

  function byTarget(projects: ListedProject[], target: string): ListedProject {
    const found = projects.find((entry) => entry.target === target);
    if (!found) throw new Error(`projects.spec: ${target} is not in the project list`);
    return found;
  }

  function bySlug(projects: ListedProject[], slug: string): ListedProject {
    const found = projects.find((entry) => entry.slug === slug);
    if (!found) throw new Error(`projects.spec: no project has the slug ${slug}`);
    return found;
  }

  test.beforeAll(async () => {
    // A cold development server compiles on first request; the helper waits up to a minute for it.
    test.setTimeout(120_000);
    // Two folders both named portal, in two different parents: the second gets the slug portal-2 (D-11).
    parents.push(realpathSync(mkdtempSync(join(tmpdir(), 'projects-spec-parent-'))));
    parents.push(realpathSync(mkdtempSync(join(tmpdir(), 'projects-spec-parent-'))));
    portalPath = join(parents[0]!, 'portal');
    portalTwoPath = join(parents[1]!, 'portal');
    cpSync(SHAPES_FIXTURE_ROOT, portalPath, { recursive: true });
    cpSync(SHAPES_FIXTURE_ROOT, portalTwoPath, { recursive: true });
    goneTarget = join(parents[0]!, 'folder-that-is-gone');

    settingsDir = mkdtempSync(join(tmpdir(), 'projects-spec-settings-'));
    mkdirSync(settingsDir, { recursive: true });
    writeFileSync(
      join(settingsDir, 'settings.json'),
      JSON.stringify({
        version: 1,
        projects: [
          { target: 'ssh://build-box.invalid/srv/kiln', slug: 'kiln', addedAt: SEEDED_AT, lastOpened: null },
          { target: goneTarget, slug: 'gone', addedAt: SEEDED_AT, lastOpened: null },
        ],
        lastActive: null,
      }),
    );

    server = await startProjectsServer({ paths: [FIXTURE_ROOT, portalPath, portalTwoPath], configDir: settingsDir });
    const projects = await listed();
    lendshed = byTarget(projects, FIXTURE_ROOT);
    portal = byTarget(projects, portalPath);
    portalTwo = byTarget(projects, portalTwoPath);
    expect(portal.slug).toBe('portal');
    expect(portalTwo.slug).toBe('portal-2');
  });

  test.afterAll(async () => {
    await server?.stop();
    if (settingsDir !== '') rmSync(settingsDir, { recursive: true, force: true });
    for (const parent of parents) rmSync(parent, { recursive: true, force: true });
  });

  test("switching while the new project's data is held never shows the old project, and the header names the new one at once", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    const lendshedHeading = page.locator('#project-name-heading');
    await expect(lendshedHeading).toBeVisible();
    const lendshedHeadingText = (await lendshedHeading.innerText()).trim();
    expect(lendshedHeadingText).not.toBe('');
    // Nothing of the old project may be read in the new one: its listed name and its dashboard heading.
    // The two portal copies are told apart from it by their text, so a name shared with them is no proof.
    expect(portal.name).not.toBe(lendshed.name);
    const forbidden = [...new Set([lendshed.name, lendshedHeadingText])];
    for (const text of forbidden) expect(text).not.toContain(portal.name);

    // Hold the new project's presentation for 1.5 seconds: the window in which a flash would show.
    await page.route(`**/api/projects/${portal.slug}/presentation`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    // One sample per animation frame: the address, the page's own text (the open list popup excluded, it
    // is the switcher itself and shows every project by design) and the trigger's accessible name.
    await page.evaluate(() => {
      const w = window as unknown as { __samples: Sample[]; __sampling: boolean };
      w.__samples = [];
      w.__sampling = true;
      const read = (): void => {
        const parts: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          const holder = node.parentElement;
          if (!holder || holder.closest('.project-switcher-positioner, script, style')) continue;
          parts.push(node.textContent ?? '');
        }
        w.__samples.push({
          path: location.pathname,
          text: parts.join(' '),
          trigger: document.querySelector('.project-switcher-trigger')?.getAttribute('aria-label') ?? null,
          at: performance.now(),
        });
        if (w.__sampling) requestAnimationFrame(read);
      };
      requestAnimationFrame(read);
    });

    await trigger(page, lendshed).click();
    const popup = popupOf(page);
    await expect(popup).toBeVisible();
    await rowByTarget(popup, portalPath).locator('.project-row-name').click();

    // The address names the new project at once, and the header with it, while the body is still waiting.
    await expect(page).toHaveURL(new RegExp(`/${portal.slug}$`));
    await expect(trigger(page, portal)).toBeVisible();
    await expect(page.getByText(`Opening ${portal.name}…`)).toBeVisible();
    await expect(page.locator('#project-name-heading')).toHaveText(portal.name);
    await page.evaluate(() => {
      (window as unknown as { __sampling: boolean }).__sampling = false;
    });

    const samples = await page.evaluate(() => (window as unknown as { __samples: Sample[] }).__samples);
    const inPortal = samples.filter((sample) => new RegExp(`^/${portal.slug}(?:/|$)`).test(sample.path));
    expect(inPortal.length).toBeGreaterThan(10);
    const leaked = inPortal.filter(
      (sample) => forbidden.some((text) => sample.text.includes(text)) || (sample.trigger ?? '').includes(lendshed.name),
    );
    expect(
      leaked.map((sample) => `${Math.round(sample.at - inPortal[0]!.at)}ms: ${sample.path} ${sample.text.slice(0, 80)}`),
      `frames of ${inPortal.length} that showed the old project under the new address`,
    ).toEqual([]);
    const opening = inPortal.filter((sample) => sample.text.includes(`Opening ${portal.name}`));
    expect(opening.length).toBeGreaterThan(0);
    for (const sample of opening) expect(sample.trigger).toBe(`Switch project. Current project: ${portal.name}`);
  });

  test('a restart on the same settings keeps every slug, lists projects last opened first, and a bookmark opens the same folder', async ({
    page,
  }) => {
    // Opening a project stamps it once the page has mounted; wait for both stamps before stopping.
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    await expect(page.locator('#project-name-heading')).toBeVisible();
    await expect.poll(async () => bySlug(await listed(), lendshed.slug).lastOpened).not.toBeNull();
    await page.goto(await projectUrl(server.base, '/', portal.slug));
    await expect(page.locator('#project-name-heading')).toBeVisible();
    await expect.poll(async () => bySlug(await listed(), portal.slug).lastOpened).not.toBeNull();
    const before = await listed();
    const slugsBefore = new Map(before.map((entry) => [entry.target, entry.slug]));

    // Restart: no paths on the command line; the settings directory is the only thing that survives. With no
    // path the CLI opens the folder it was started in (the repository), which joins the remembered list.
    await server.stop();
    server = await startProjectsServer({ paths: [], configDir: settingsDir });
    const after = await listed();

    const afterBySlug = new Map(after.map((entry) => [entry.target, entry.slug]));
    for (const [target, slug] of slugsBefore) expect(afterBySlug.get(target), `the slug of ${target}`).toBe(slug);
    const added = after.filter((entry) => !slugsBefore.has(entry.target));
    expect(added.map((entry) => entry.target)).toEqual([resolve(FIXTURE_ROOT, '..', '..', '..')]);
    expect(bySlug(after, 'portal').target).toBe(portalPath);
    expect(bySlug(after, 'portal-2').target).toBe(portalTwoPath);
    // Last opened first: portal was opened after lendshed; the never-opened ones keep their order after them.
    const order = after.map((entry) => entry.slug);
    expect(order.slice(0, 2)).toEqual([portal.slug, lendshed.slug]);
    expect(order.indexOf(portalTwo.slug)).toBeGreaterThan(1);

    // The second portal's own API reports the second folder, the one it opened before the restart.
    const response = await fetch(`${server.base}/api/projects/${portalTwo.slug}/presentation`);
    const presented = (await response.json()) as { rootPath: string };
    expect(presented.rootPath).toBe(portalTwoPath);

    // A bookmark made before the restart still opens a page of the same project.
    await page.goto(await projectUrl(server.base, '/roadmap', portalTwo.slug));
    await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
    await expect(trigger(page, bySlug(after, portalTwo.slug))).toBeVisible();
  });

  test("a remembered folder that is gone is listed in its place, and following it names the path checked and leads back", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const projects = await listed();
    const gone = bySlug(projects, 'gone');
    expect(gone.state).toBe('unavailable');
    expect(gone.reason ?? '').not.toBe('');
    await goToLanding(page, server.base, lendshed);

    const rows = page.locator('.project-list .project-row');
    await expect(rows).toHaveCount(projects.length);
    // The row keeps its place in last-opened order, never opened, and carries the server's own words.
    const position = (await listed()).findIndex((entry) => entry.slug === gone.slug);
    const row = rows.nth(position);
    await expect(row.locator('.project-row-path')).toHaveAttribute('title', goneTarget);
    await expect(row.getByText('Unavailable', { exact: true })).toBeVisible();
    await expect(row.locator('.source-note')).toHaveText(gone.reason ?? '');
    await expect(row.getByText('Not opened yet')).toBeVisible();

    await row.locator('.project-row-name').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Project could not be loaded.' })).toBeVisible();
    await expect(page.getByText('Path checked', { exact: true })).toBeVisible();
    await expect(page.locator('.copy-field-value').first()).toHaveText(goneTarget);
    await page.getByRole('link', { name: 'Choose another project' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  });

  test('an ssh project that cannot be reached ends on the invalid-target screen and is listed Unavailable with the same reason', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const projects = await listed();
    const kiln = bySlug(projects, 'kiln');
    expect(kiln.kind).toBe('ssh');

    // Whatever the machine has (no ssh client, or one that cannot resolve the .invalid host), the screen
    // carries the server's non-empty message verbatim.
    await page.goto(await projectUrl(server.base, '/', kiln.slug));
    await expect(page.getByRole('heading', { level: 1, name: 'Project could not be loaded.' })).toBeVisible();
    const detail = page.locator('.invalid-project-detail');
    await expect(detail).not.toHaveText('');
    const message = (await detail.innerText()).trim();
    expect(message.length).toBeGreaterThan(0);
    await expect(page.getByText('Path checked', { exact: true })).toBeVisible();

    // Afterwards the landing page lists it as unavailable, with that reason, in its own place.
    await page.getByRole('link', { name: 'Choose another project' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    const row = rowByTarget(page, kiln.target);
    await expect(row.getByText('Unavailable', { exact: true })).toBeVisible();
    await expect(row.locator('.source-note')).toHaveText(message);
    const listedKiln = bySlug(await listed(), kiln.slug);
    expect(listedKiln.state).toBe('unavailable');
    expect(listedKiln.reason).toBe(message);
  });

  test('an unknown slug names what was typed, lists the known projects, and loads nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/projects/no-such-project')) asked.push(request.url());
    });
    await page.goto(await projectUrl(server.base, '/roadmap', 'no-such-project'));

    await expect(page.getByRole('heading', { level: 1, name: 'No project called “no-such-project”.' })).toBeVisible();
    const projects = await listed();
    const known = page.getByRole('region', { name: 'Known projects' });
    await expect(known.locator('.project-row')).toHaveCount(projects.length);
    await expect(known.getByRole('link', { name: 'See all projects' })).toHaveAttribute('href', '/');
    // The page asked for the list and nothing else: no request names the unknown project.
    await page.waitForLoadState('networkidle');
    expect(asked).toEqual([]);
    // The page shows no project's roadmap.
    await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toHaveCount(0);
  });

  test("two tabs are independent: refreshing one project in tab B asks nothing of tab A's project and changes nothing in tab A", async ({
    context,
  }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();
    for (const tab of [tabA, tabB]) await tab.setViewportSize({ width: 1280, height: 800 });
    const aProject = lendshed;
    const bProject = portal;

    await tabA.goto(await projectUrl(server.base, '/', aProject.slug));
    await expect(tabA.locator('#project-name-heading')).toBeVisible();
    await tabB.goto(await projectUrl(server.base, '/', bProject.slug));
    await expect(tabB.locator('#project-name-heading')).toBeVisible();
    await tabA.waitForLoadState('networkidle');
    await tabB.waitForLoadState('networkidle');

    const aUrl = tabA.url();
    const aTrigger = await trigger(tabA, aProject).getAttribute('aria-label');
    const aRequests: string[] = [];
    tabA.on('request', (request) => {
      if (request.url().includes(`/api/projects/${aProject.slug}/`)) aRequests.push(`${request.method()} ${request.url()}`);
    });
    const bRefresh = tabB.waitForResponse(
      (response) => response.url().endsWith(`/api/projects/${bProject.slug}/refresh`) && response.request().method() === 'POST',
    );

    await tabB.getByRole('button', { name: 'Refresh the project snapshot' }).click();
    expect((await bRefresh).ok()).toBe(true);
    await expect(tabB.getByRole('button', { name: 'Refresh the project snapshot' })).toBeEnabled();
    // A quiet window after the refresh: a request tab A would make in reaction to it has time to appear.
    await tabB.waitForTimeout(1000);

    expect(aRequests).toEqual([]);
    expect(tabA.url()).toBe(aUrl);
    expect(await trigger(tabA, aProject).getAttribute('aria-label')).toBe(aTrigger);
    await expect(tabA.locator('#project-name-heading')).toBeVisible();
    await tabA.close();
    await tabB.close();
  });
});
