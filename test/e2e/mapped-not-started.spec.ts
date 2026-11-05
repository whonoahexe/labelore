// Phase 10 (10-23): a map-only project (the made-up Tidemark: a codebase map and nothing else) in a real
// browser. Every way of opening one lands on the "Mapped, not started" head with no Roadmap and no
// Traceability link in the header (D-09): started on its project folder, started on its .planning folder,
// added from the switcher by its .planning path, and found by a folder scan of a synthetic home. Then the
// copy command (D-06, RESEARCH C2): the button copies exactly the command text, reads "Copied", and the page
// issues no request while it is pressed. Every fixture is a copy in a mkdtemp folder, every server has a
// settings directory of its own, and the scan runs in a synthetic HOME, so nothing here reads or writes the
// user's settings, projects or home folder.
import { expect, test, type Page } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectUrl } from './app-url.ts';
import { SHAPES_FIXTURE_ROOT, TIDEMARK_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer, type ProjectsServer } from './projects-server.ts';

interface ListedProject {
  slug: string;
  name: string;
  target: string;
}

async function listProjects(base: string): Promise<ListedProject[]> {
  const response = await fetch(`${base}/api/projects`);
  const { projects } = (await response.json()) as { projects: ListedProject[] };
  return projects;
}

const SEVEN_PANELS = ['Stack', 'Architecture', 'Structure', 'Conventions', 'Testing', 'Integrations', 'Concerns'];

const scratch: string[] = [];

/** A fresh mkdtemp folder (real path) removed after the spec. */
function makeFolder(prefix: string): string {
  const folder = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  scratch.push(folder);
  return folder;
}

/** A copy of Tidemark in a mkdtemp folder of its own; returns the project folder. */
function copyTidemark(parent: string = makeFolder('mapped-not-started-')): string {
  const project = join(parent, 'tidemark');
  cpSync(TIDEMARK_FIXTURE_ROOT, project, { recursive: true });
  return project;
}

/** A copy of the Shapes project, the other project a map-only one is added beside. */
function copyShapes(): string {
  const project = join(makeFolder('mapped-not-started-shapes-'), 'shapes');
  cpSync(SHAPES_FIXTURE_ROOT, project, { recursive: true });
  return project;
}

test.afterAll(() => {
  for (const folder of scratch) rmSync(folder, { recursive: true, force: true });
});

/** The head, the facts line, the seven panel entries, and a header with a Dashboard link and no Roadmap or
 * Traceability link: what a map-only project opens on, whichever way it was opened. */
async function expectMappedNotStarted(page: Page): Promise<void> {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Codebase');
  await expect(page.locator('p.eyebrow').first()).toHaveText('Mapped, not started');
  const head = page.getByRole('region', { name: 'Mapped, not started' });
  await expect(head).toBeVisible();
  await expect(head.getByText('This project has a codebase map and no roadmap yet.')).toBeVisible();
  await expect(page.locator('.view-codebase-facts .status-chip').first()).toHaveText('Complete map');
  const list = page.getByRole('navigation', { name: 'Codebase map' });
  await expect(list.getByRole('listitem')).toHaveCount(7);
  for (const label of SEVEN_PANELS) await expect(list.getByText(label, { exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Roadmap' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Traceability' })).toHaveCount(0);
}

test.describe('started on the project folder', () => {
  test.describe.configure({ mode: 'serial' });
  let server: ProjectsServer;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    server = await startProjectsServer({ paths: [copyTidemark()] });
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test('lands on the head with no Roadmap or Traceability link', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/'));
    await expectMappedNotStarted(page);
  });

  test('Copy command copies exactly the shown command, reads Copied, and issues no request', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.base });
    const page = await context.newPage();
    try {
      await page.goto(await projectUrl(server.base, '/'));
      await expectMappedNotStarted(page);

      const row = page.locator('.view-codebase-head .copy-command');
      const command = row.locator('.copy-command-text');
      const button = row.getByRole('button', { name: /^Copy command/ });
      const shown = (await command.innerText()).trim();
      // A complete map with no decision or spec documents goes on to /gsd-new-project.
      expect(shown).toBe('/gsd-new-project');
      await expect(button).toHaveText('Copy command');
      // The command is text beside the button, never inside it, and it can be selected.
      await expect(button.locator('.copy-command-text')).toHaveCount(0);
      expect(await command.evaluate((element) => getComputedStyle(element).userSelect)).not.toBe('none');
      await command.dblclick();
      expect(await page.evaluate(() => window.getSelection()?.toString().trim())).toContain('gsd-new-project');
      await page.evaluate(() => window.getSelection()?.removeAllRanges());

      // Nothing may leave the page between just before the press and the moment the button reads Copied.
      const requests: string[] = [];
      page.on('request', (request) => requests.push(`${request.method()} ${request.url()}`));
      await button.click();
      await expect(button).toHaveText('Copied');
      await expect(button).toHaveAttribute('data-copied', 'true');
      expect(requests).toEqual([]);

      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toBe(shown);
      // The command is still the page's own text after the press, and the label goes back by itself.
      await expect(command).toHaveText(shown);
      await expect(button).toHaveText('Copy command');
    } finally {
      await context.close();
    }
  });
});

test.describe('started on the .planning folder', () => {
  let server: ProjectsServer;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    server = await startProjectsServer({ paths: [join(copyTidemark(), '.planning')] });
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test('lands on the head with no Roadmap or Traceability link', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/'));
    await expectMappedNotStarted(page);
  });
});

test.describe('added from the switcher by its .planning path', () => {
  let server: ProjectsServer;
  let shapes: ListedProject;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const shapesCopy = copyShapes();
    server = await startProjectsServer({ paths: [shapesCopy] });
    const found = (await listProjects(server.base)).find((entry) => entry.target === shapesCopy);
    if (!found) throw new Error('mapped-not-started.spec: the Shapes copy is not in the project list');
    shapes = found;
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test('is added from the add dialog and then chosen in the switcher', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', shapes.slug));
    // Shapes has a roadmap, so its header has the links a map-only project must not.
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.getByRole('link', { name: 'Roadmap' })).toBeVisible();

    const planning = join(copyTidemark(), '.planning');
    await page.getByRole('button', { name: `Switch project. Current project: ${shapes.name}` }).click();
    await page.getByRole('dialog', { name: 'Projects' }).getByRole('button', { name: 'Add or scan…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a project' });
    await dialog.getByLabel('Project location').fill(planning);
    await dialog.getByRole('button', { name: 'Add project' }).click();
    await expect(dialog).toBeHidden();

    // The added project opens on its head.
    const added = (await listProjects(server.base)).find((entry) => entry.slug !== shapes.slug);
    if (!added) throw new Error('mapped-not-started.spec: the added project is not in the list');
    await expect(page).toHaveURL(new RegExp(`/${added.slug}$`));
    await expectMappedNotStarted(page);

    // Back on Shapes, then chosen in the switcher: it lands on the head again.
    await page.goto(await projectUrl(server.base, '/', shapes.slug));
    await expect(nav.getByRole('link', { name: 'Roadmap' })).toBeVisible();
    await page.getByRole('button', { name: `Switch project. Current project: ${shapes.name}` }).click();
    await page.getByRole('dialog', { name: 'Projects' }).getByRole('link', { name: added.name }).click();
    await expect(page).toHaveURL(new RegExp(`/${added.slug}$`));
    await expectMappedNotStarted(page);
  });
});

test.describe('found by a folder scan of a synthetic home', () => {
  let server: ProjectsServer;
  let home = '';
  let shapes: ListedProject;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    // The copy sits two levels below the folder that is scanned: Work/harbour/tidemark.
    home = makeFolder('mapped-not-started-home-');
    const parent = join(home, 'Work', 'harbour');
    mkdirSync(parent, { recursive: true });
    copyTidemark(parent);
    const shapesCopy = copyShapes();
    server = await startProjectsServer({ paths: [shapesCopy], env: { HOME: home } });
    const found = (await listProjects(server.base)).find((entry) => entry.target === shapesCopy);
    if (!found) throw new Error('mapped-not-started.spec: the Shapes copy is not in the project list');
    shapes = found;
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test('is listed by the scan, added from the checklist, and opens on its head', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', shapes.slug));
    await page.getByRole('button', { name: `Switch project. Current project: ${shapes.name}` }).click();
    await page.getByRole('dialog', { name: 'Projects' }).getByRole('link', { name: 'All projects' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();

    const section = page.getByRole('region', { name: 'Scan a folder' });
    // Joined so no home-folder path is written out literally in a spec.
    await section.getByLabel('Folder to scan').fill(['~', 'Work'].join('/'));
    await section.getByRole('button', { name: 'Scan folder' }).click();
    const results = section.getByRole('group', { name: /^Found 1 project in / });
    await expect(results).toBeVisible();
    await results.getByRole('button', { name: 'Add 1 project' }).click();
    await expect(section.locator('.project-scan-results > p')).toContainText('Added 1 project');

    const target = join(home, 'Work', 'harbour', 'tidemark');
    const added = (await listProjects(server.base)).find((entry) => entry.target === target);
    if (!added) throw new Error('mapped-not-started.spec: the scanned project is not in the list');
    const row = page.locator('.project-list .project-row', { hasText: added.name });
    await row.getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/${added.slug}$`));
    await expectMappedNotStarted(page);
  });
});
