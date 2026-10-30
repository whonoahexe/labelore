// Phase 8 (08-11): the header project switcher in Chromium, against the real server on two made-up
// projects (Lendshed and Shapes). Names, targets and slugs come from GET /api/projects, never from
// literals, so the spec follows whatever the fixtures hold. 08-17 adds the add and forget cases and
// 08-13 the scan cases to this file.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectUrl } from './app-url.ts';
import { FIXTURE_ROOT, SHAPES_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer, type ProjectsServer } from './projects-server.ts';

interface ListedProject {
  slug: string;
  name: string;
  target: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function listProjects(base: string): Promise<ListedProject[]> {
  const response = await fetch(`${base}/api/projects`);
  const { projects } = (await response.json()) as { projects: ListedProject[] };
  return projects;
}

function triggerFor(page: Page, project: ListedProject): Locator {
  return page.getByRole('button', { name: `Switch project. Current project: ${project.name}` });
}

function projectsDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Projects' });
}

async function openSwitcher(page: Page, project: ListedProject): Promise<Locator> {
  await triggerFor(page, project).click();
  const dialog = projectsDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function focusIsInMain(page: Page): Promise<boolean> {
  return await page.evaluate(() => document.activeElement?.closest('#main-content') != null);
}

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error('switcher.spec: an element has no box');
  return found;
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Opens the landing page the way a person does: from a project, through the switcher's 'All projects'. */
async function goToLanding(page: Page, base: string, from: ListedProject): Promise<void> {
  await page.goto(await projectUrl(base, '/', from.slug));
  const popup = await openSwitcher(page, from);
  await popup.getByRole('link', { name: 'All projects' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
}

test.describe('header project switcher', () => {
  let server: ProjectsServer;
  let lendshed: ListedProject;
  let shapes: ListedProject;

  test.beforeAll(async () => {
    // A cold development server compiles on first request; the helper waits up to a minute for it.
    test.setTimeout(120_000);
    server = await startProjectsServer({ paths: [FIXTURE_ROOT, SHAPES_FIXTURE_ROOT] });
    const projects = await listProjects(server.base);
    const byTarget = (root: string): ListedProject => {
      const found = projects.find((entry) => entry.target === root);
      if (!found) throw new Error(`switcher.spec: ${root} is not in the project list`);
      return found;
    };
    lendshed = byTarget(FIXTURE_ROOT);
    shapes = byTarget(SHAPES_FIXTURE_ROOT);
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test("switches from one project's dashboard to another's, and Escape returns focus to the trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));

    const trigger = triggerFor(page, lendshed);
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('title', lendshed.target);

    const dialog = await openSwitcher(page, lendshed);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.getByText('Projects', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/');
    await expect(dialog.locator('.project-row')).toHaveCount(2);
    const lendshedRow = dialog.locator('.project-row', { hasText: lendshed.name });
    const shapesRow = dialog.locator('.project-row', { hasText: shapes.name });
    await expect(lendshedRow).toHaveAttribute('aria-current', 'true');
    await expect(lendshedRow.getByText('Current')).toBeAttached();
    await expect(shapesRow).not.toHaveAttribute('aria-current', 'true');

    await dialog.getByRole('link', { name: shapes.name }).click();

    await expect(page).toHaveURL(new RegExp(`/${shapes.slug}$`));
    await expect(dialog).toBeHidden();
    await expect(triggerFor(page, shapes)).toBeVisible();
    await expect(page.locator('#project-name-heading')).toBeVisible();
    await expect.poll(() => focusIsInMain(page)).toBe(true);

    await openSwitcher(page, shapes);
    await page.keyboard.press('Escape');
    await expect(projectsDialog(page)).toBeHidden();
    await expect(triggerFor(page, shapes)).toBeFocused();
  });

  test('reads the list again every time it opens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    await expect(triggerFor(page, lendshed)).toBeVisible();

    let reads = 0;
    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'GET') reads += 1;
      await route.continue();
    });
    for (let opened = 1; opened <= 2; opened += 1) {
      await openSwitcher(page, lendshed);
      await expect.poll(() => reads).toBeGreaterThanOrEqual(opened);
      await page.keyboard.press('Escape');
      await expect(projectsDialog(page)).toBeHidden();
    }
    expect(reads).toBeGreaterThanOrEqual(2);
  });
});

// The 039 winner's layout contract (A, popover under the name trigger), facts 1 to 6 of its README;
// facts 4 and 5 (the footer's tab order and the forget button) come with the controls 08-17 hangs on the
// list. The server holds the two fixtures plus fourteen saved projects, so the list is
// long enough to scroll; one saved project has an 80-character folder name and a 120-character path.
test.describe('layout contract (sketch 039 A)', () => {
  let long: ProjectsServer;
  let first: ListedProject;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const longFolder = 'a-very-long-project-folder-name-'.padEnd(80, 'x');
    const longTarget = `/nonexistent/${'nested-folder-'.repeat(6)}${longFolder}`.slice(0, 120);
    const saved = Array.from({ length: 14 }, (_, index) => ({
      target: index === 0 ? longTarget : `/nonexistent/saved-project-${index}`,
      slug: `saved-${index}`,
      addedAt: '2026-10-01T00:00:00.000Z',
      lastOpened: null,
    }));
    long = await startProjectsServer({
      paths: [FIXTURE_ROOT, SHAPES_FIXTURE_ROOT],
      settings: { version: 1, projects: saved, lastActive: null },
    });
    const projects = await listProjects(long.base);
    expect(projects.length).toBeGreaterThanOrEqual(16);
    const found = projects.find((entry) => entry.target === FIXTURE_ROOT);
    if (!found) throw new Error('switcher.spec: the Lendshed fixture is not in the list');
    first = found;
  });

  test.afterAll(async () => {
    await long?.stop();
  });

  test('at 1280px the popup hangs under the header, left-aligned with the trigger, capped at 448px, scrolling inside', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(long.base, '/', first.slug));
    const trigger = triggerFor(page, first);
    await expect(trigger).toBeVisible();
    await openSwitcher(page, first);
    const popup = page.locator('.project-switcher-popup');
    await expect(popup).toBeVisible();
    // The popover settles into place before it is measured.
    await expect.poll(async () => Math.round((await box(popup)).y)).toBeGreaterThan(0);

    const triggerBox = await box(trigger);
    const headerBox = await box(page.locator('.shell-header'));
    const popupBox = await box(popup);
    // 1. Within 8px of the trigger's left edge; its top at or below the header's bottom edge.
    expect(Math.abs(popupBox.x - triggerBox.x)).toBeLessThanOrEqual(8);
    expect(popupBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
    expect(popupBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
    // 2. At most 448px wide and min(448px, 70vh) tall.
    expect(popupBox.width).toBeLessThanOrEqual(448.5);
    expect(popupBox.height).toBeLessThanOrEqual(Math.min(448, 0.7 * 800) + 0.5);

    // The list scrolls inside while the head stays where it is.
    const list = popup.locator(':scope > div').first();
    const head = popup.locator(':scope > header');
    await expect(head.getByText('Projects', { exact: true })).toBeVisible();
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const headBefore = await box(head);
    await list.evaluate((el) => {
      el.scrollTop = 200;
    });
    expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const headAfter = await box(head);
    expect(headAfter.y).toBeCloseTo(headBefore.y, 0);
    expect(await box(popup)).toEqual(popupBox);
  });

  test('at 390px the popup spans the viewport directly under the header with no side borders, and the page does not scroll sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(await projectUrl(long.base, '/', first.slug));
    const trigger = triggerFor(page, first);
    await expect(trigger).toBeVisible();
    // 6. The trigger is at least 40px tall at 390px.
    expect((await box(trigger)).height).toBeGreaterThanOrEqual(40);

    await openSwitcher(page, first);
    const popup = page.locator('.project-switcher-popup');
    await expect.poll(async () => Math.round((await box(popup)).y)).toBeGreaterThan(0);
    const headerBox = await box(page.locator('.shell-header'));
    const popupBox = await box(popup);
    // 3. Left 0, right at the viewport's right edge, directly under the header, no side borders.
    expect(popupBox.x).toBe(0);
    expect(popupBox.x + popupBox.width).toBe(390);
    expect(popupBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
    const borders = await popup.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.borderLeftWidth, style.borderRightWidth];
    });
    expect(borders).toEqual(['0px', '0px']);
    expect(popupBox.height).toBeLessThanOrEqual(448.5);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('at 1280px the forget button is a 36px square hidden until row hover or focus, and Add or scan… is the last control (facts 4 and 5)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(long.base, '/', first.slug));
    const popup = await openSwitcher(page, first);
    const row = popup.locator('.project-row').first();
    const forget = row.getByRole('button', { name: /^Forget / });
    const opacity = async (): Promise<string> => await forget.evaluate((el) => getComputedStyle(el).opacity);

    // 5. 36px square; hidden at rest, shown on row hover.
    const size = await box(forget);
    expect([Math.round(size.width), Math.round(size.height)]).toEqual([36, 36]);
    await expect.poll(opacity).toBe('0');
    await row.hover();
    await expect.poll(opacity).toBe('1');
    // ... and shown when the row holds focus.
    await page.mouse.move(0, 0);
    await expect.poll(opacity).toBe('0');
    await row.getByRole('link').focus();
    await expect.poll(opacity).toBe('1');

    // 4. Inside a row the tab order is the project link, then the forget button.
    await page.keyboard.press('Tab');
    await expect(forget).toBeFocused();
    // 4. "Add or scan…" is the last focusable element in the popup.
    const last = await popup.evaluate((el) => {
      const controls = el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      return controls[controls.length - 1]?.textContent ?? '';
    });
    expect(last).toBe('Add or scan…');
  });

  test('at 390px every forget button is shown and a 40px square', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(await projectUrl(long.base, '/', first.slug));
    const popup = await openSwitcher(page, first);
    const forget = popup.locator('.project-row').first().getByRole('button', { name: /^Forget / });
    await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    const size = await box(forget);
    expect([Math.round(size.width), Math.round(size.height)]).toEqual([40, 40]);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  });
});

// A project with an 80-character display name: the trigger truncates it with an ellipsis, stays a
// 40px target at 390px, and the page never scrolls sideways (UI-SPEC overflow and long-text).
test.describe('a long project name', () => {
  const title = 'Lendshed '.repeat(9).trim().slice(0, 80);
  let named: ProjectsServer;
  let copy = '';
  let listed: ListedProject;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    copy = mkdtempSync(join(tmpdir(), 'switcher-long-name-'));
    cpSync(FIXTURE_ROOT, copy, { recursive: true });
    const projectFile = join(copy, '.planning', 'PROJECT.md');
    writeFileSync(projectFile, readFileSync(projectFile, 'utf8').replace(/^# .*$/m, `# ${title}`));
    named = await startProjectsServer({ paths: [copy, SHAPES_FIXTURE_ROOT] });
    const found = (await listProjects(named.base)).find((entry) => entry.name === title);
    if (!found) throw new Error('switcher.spec: the long-named project is not in the list');
    listed = found;
  });

  test.afterAll(async () => {
    await named?.stop();
    if (copy !== '') rmSync(copy, { recursive: true, force: true });
  });

  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ] as const) {
    test(`truncates in the trigger at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(await projectUrl(named.base, '/', listed.slug));
      const trigger = triggerFor(page, listed);
      await expect(trigger).toBeVisible();
      const name = trigger.locator('.brand-project-name');
      await expect(name).toHaveText(title);
      expect(await name.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
      expect(await name.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      expect((await box(trigger)).height).toBeGreaterThanOrEqual(width === 390 ? 40 : 30);
      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

// Phase 8 (08-17): adding and forgetting projects from the switcher and the landing page. The server
// starts on Lendshed alone with a settings directory of its own; folders added here are copies of the
// Shapes fixture in throwaway directories, so the repository's fixtures are never part of a write path.
// The tests share the server and run in order: each one starts from the list the one before left.
test.describe('adding a project', () => {
  test.describe.configure({ mode: 'serial' });

  let server: ProjectsServer;
  let lendshed: ListedProject;
  const copies: string[] = [];

  function copyShapes(): string {
    const copy = mkdtempSync(join(tmpdir(), 'switcher-add-'));
    cpSync(SHAPES_FIXTURE_ROOT, copy, { recursive: true });
    copies.push(copy);
    return realpathSync(copy);
  }

  /** The slugs in the list: the list's last-opened times move whenever a page is opened. */
  async function listSlugs(): Promise<string[]> {
    return (await listProjects(server.base)).map((entry) => entry.slug);
  }

  function savedTargets(): string[] {
    const saved = JSON.parse(readFileSync(join(server.configDir, 'settings.json'), 'utf8')) as {
      projects: { target: string }[];
    };
    return saved.projects.map((entry) => entry.target);
  }

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    server = await startProjectsServer({ paths: [FIXTURE_ROOT] });
    const found = (await listProjects(server.base)).find((entry) => entry.target === FIXTURE_ROOT);
    if (!found) throw new Error('switcher.spec: the Lendshed fixture is not in the list');
    lendshed = found;
  });

  test.afterAll(async () => {
    await server?.stop();
    for (const copy of copies) rmSync(copy, { recursive: true, force: true });
  });

  test("adds a folder from the switcher's 'Add or scan…' dialog and lands on its dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    const folder = copyShapes();

    const popup = await openSwitcher(page, lendshed);
    await popup.getByRole('button', { name: 'Add or scan…' }).click();

    // The list closes and the modal dialog opens with focus in the field.
    await expect(projectsDialog(page)).toBeHidden();
    const dialog = page.getByRole('dialog', { name: 'Add a project' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Enter a folder on this machine or an ssh:// target.')).toBeVisible();
    const field = dialog.getByLabel('Project location');
    await expect(field).toBeFocused();
    // Joined so no home-folder path is written out literally in a spec.
    await expect(field).toHaveAttribute('placeholder', `${['/home', 'you', 'Work'].join('/')}/portal or ssh://host/path`);
    await expect(dialog.getByRole('button', { name: 'Close without adding' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Scan a folder instead' })).toHaveAttribute('href', '/');

    await field.fill(folder);
    await dialog.getByRole('button', { name: 'Add project' }).click();

    // The app opens the new project: its slug is the URL, its dashboard shows, and it is remembered.
    await expect(dialog).toBeHidden();
    const added = (await listProjects(server.base)).find((entry) => entry.target === folder);
    if (!added) throw new Error('switcher.spec: the added folder is not in the project list');
    await expect(page).toHaveURL(new RegExp(`/${added.slug}$`));
    await expect(page.locator('#project-name-heading')).toBeVisible();
    await expect(triggerFor(page, added)).toBeVisible();
    expect(savedTargets()).toContain(folder);
  });

  test('a path that is not there keeps the dialog open with the typed text and the server\'s words', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    const before = savedTargets();
    const missing = join(tmpdir(), 'switcher-add-no-such-folder');

    const popup = await openSwitcher(page, lendshed);
    await popup.getByRole('button', { name: 'Add or scan…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a project' });
    const field = dialog.getByLabel('Project location');
    await field.fill(missing);
    await dialog.getByRole('button', { name: 'Add project' }).click();

    // The notice is an alert: the heading, the server's message, then the path it checked.
    const notice = dialog.getByRole('alert');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Could not add this project.');
    await expect(notice).toContainText('No such path:');
    await expect(notice).toContainText('Path checked:');
    await expect(dialog).toBeVisible();
    await expect(field).toHaveValue(missing);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAttribute('aria-describedby', (await notice.getAttribute('id')) ?? '');
    await expect(dialog.getByRole('button', { name: 'Add project' })).toBeEnabled();
    expect(savedTargets()).toEqual(before);

    // Typing again takes the stale notice away.
    await field.fill(`${missing}-2`);
    await expect(notice).toBeHidden();
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('an empty submit shows the server\'s message and adds nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    const before = savedTargets();

    const popup = await openSwitcher(page, lendshed);
    await popup.getByRole('button', { name: 'Add or scan…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a project' });
    await dialog.getByRole('button', { name: 'Add project' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Enter a folder path or an ssh:// target.');
    await expect(dialog.getByLabel('Project location')).toHaveAttribute('aria-invalid', 'true');
    expect(savedTargets()).toEqual(before);
  });

  test('a project already in the list is named with a link to it, and nothing is created', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    const before = savedTargets();
    const listed = await listSlugs();

    const popup = await openSwitcher(page, lendshed);
    await popup.getByRole('button', { name: 'Add or scan…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a project' });
    await dialog.getByLabel('Project location').fill(FIXTURE_ROOT);
    await dialog.getByRole('button', { name: 'Add project' }).click();

    await expect(dialog.getByText(`${lendshed.name} is already in your list.`)).toBeVisible();
    const open = dialog.getByRole('link', { name: `Open ${lendshed.name}` });
    await expect(open).toHaveAttribute('href', `/${lendshed.slug}`);
    expect(await listSlugs()).toEqual(listed);
    expect(savedTargets()).toEqual(before);

    // Following the link leaves the dialog behind.
    await open.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/${lendshed.slug}$`));
  });

  test('a refused request (403) shows the refusal copy and changes nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(await projectUrl(server.base, '/', lendshed.slug));
    const before = savedTargets();
    const listed = await listSlugs();
    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'no' }) });
        return;
      }
      await route.continue();
    });

    const popup = await openSwitcher(page, lendshed);
    await popup.getByRole('button', { name: 'Add or scan…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a project' });
    const field = dialog.getByLabel('Project location');
    await field.fill(copyShapes());
    await dialog.getByRole('button', { name: 'Add project' }).click();

    await expect(dialog.getByRole('alert')).toHaveText(
      'Labelore refused this request because it did not come from its own page. Reload the page and try again.',
    );
    // The refusal is about the request, not the text: the field is not marked invalid.
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    expect(await listSlugs()).toEqual(listed);
    expect(savedTargets()).toEqual(before);
  });

  test('the landing page holds the same form beside the list and adds a second copy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await goToLanding(page, server.base, lendshed);
    const section = page.getByRole('region', { name: 'Add a project' });
    await expect(section).toBeVisible();
    await expect(section.getByLabel('Project location')).toBeVisible();
    // Beside the list at 1280px (sketch 040 B): the side column starts to the right of the list column.
    const listBox = await box(page.locator('.projects-page > section').first());
    const sideBox = await box(page.locator('.projects-page > aside'));
    expect(sideBox.x).toBeGreaterThan(listBox.x + listBox.width);

    const folder = copyShapes();
    await section.getByLabel('Project location').fill(folder);
    await section.getByRole('button', { name: 'Add project' }).click();

    const added = (await listProjects(server.base)).find((entry) => entry.target === folder);
    if (!added) throw new Error('switcher.spec: the second copy is not in the project list');
    await expect(page).toHaveURL(new RegExp(`/${added.slug}$`));
    await expect(page.locator('#project-name-heading')).toBeVisible();
    expect(savedTargets()).toContain(folder);
  });
});

// Forgetting a project (D-10): the quiet action on every row and its inline confirm. Every folder here is
// a copy of the Shapes fixture in a throwaway directory, seeded into the server's settings, so a forget
// can never touch a repository fixture and "the files are not touched" can be checked byte for byte.
// Each case forgets a copy of its own; the cases share the server and run in order.
test.describe('forgetting a project', () => {
  test.describe.configure({ mode: 'serial' });

  const names = ['landing', 'held', 'failing', 'escape', 'current'] as const;
  type Name = (typeof names)[number];

  let server: ProjectsServer;
  let lendshed: ListedProject;
  const folders = {} as Record<Name, string>;
  const listed = {} as Record<Name, ListedProject>;
  const roots: string[] = [];

  /** Every file under `dir` with its bytes: the folder's whole content, to compare before and after. */
  function snapshot(dir: string): Record<string, string> {
    const files: Record<string, string> = {};
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const path = join(entry.parentPath, entry.name);
      files[path.slice(dir.length)] = readFileSync(path).toString('base64');
    }
    return files;
  }

  function savedTargets(): string[] {
    const saved = JSON.parse(readFileSync(join(server.configDir, 'settings.json'), 'utf8')) as {
      projects: { target: string }[];
    };
    return saved.projects.map((entry) => entry.target);
  }

  async function listSlugs(): Promise<string[]> {
    return (await listProjects(server.base)).map((entry) => entry.slug);
  }

  /** The row of the copy in `scope`, found by the target its path line carries in `title`. */
  function rowOf(scope: Locator | Page, name: Name): Locator {
    return scope.locator(`.project-row:has(.project-row-path[title="${folders[name]}"])`);
  }

  async function landing(page: Page): Promise<void> {
    await goToLanding(page, server.base, lendshed);
    await expect(page.locator('.project-row').first()).toBeVisible();
  }

  const QUESTION = "Labelore only removes it from this list. The project's files are not touched.";

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const saved = names.map((name) => {
      const copy = mkdtempSync(join(tmpdir(), `switcher-forget-${name}-`));
      cpSync(SHAPES_FIXTURE_ROOT, copy, { recursive: true });
      roots.push(copy);
      folders[name] = realpathSync(copy);
      return { target: folders[name], slug: `forget-${name}`, addedAt: '2026-10-01T00:00:00.000Z', lastOpened: null };
    });
    server = await startProjectsServer({
      paths: [FIXTURE_ROOT],
      settings: { version: 1, projects: saved, lastActive: null },
    });
    const projects = await listProjects(server.base);
    const found = projects.find((entry) => entry.target === FIXTURE_ROOT);
    if (!found) throw new Error('switcher.spec: the Lendshed fixture is not in the list');
    lendshed = found;
    for (const name of names) {
      const entry = projects.find((candidate) => candidate.target === folders[name]);
      if (!entry) throw new Error(`switcher.spec: the ${name} copy is not in the list`);
      listed[name] = entry;
    }
  });

  test.afterAll(async () => {
    await server?.stop();
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  test('a landing row asks first, Keep and Escape take the question back, and Forget removes it from the list only', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const confirming = page.locator(".project-row[data-confirming='true']");
    await landing(page);
    const before = snapshot(folders.landing);
    const row = rowOf(page, 'landing');
    const forget = row.getByRole('button', { name: `Forget ${listed.landing.name}` });

    // Quiet until wanted: hidden at rest, shown on row hover, a 36px square, with its tooltip.
    await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await row.hover();
    await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    const size = await box(forget);
    expect([Math.round(size.width), Math.round(size.height)]).toEqual([36, 36]);
    await forget.hover();
    await expect(page.locator('.project-row-tip')).toHaveText('Forget this project');

    // The question replaces the row in place; Keep project is the focused, safe default.
    await forget.click();
    const question = `Forget ${listed.landing.name}? ${QUESTION}`;
    await expect(confirming.getByText(question)).toBeVisible();
    await expect(confirming.getByRole('button', { name: 'Keep project' })).toBeFocused();
    await expect(confirming.getByRole('button', { name: 'Forget project' })).toBeEnabled();
    expect(await listSlugs()).toContain(listed.landing.slug);

    // Keep project restores the row and gives focus back to the forget button.
    await confirming.getByRole('button', { name: 'Keep project' }).click();
    await expect(confirming.getByText(question)).toBeHidden();
    await expect(forget).toBeFocused();

    // Escape does the same.
    await forget.click();
    await expect(confirming.getByText(question)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirming.getByText(question)).toBeHidden();
    await expect(forget).toBeFocused();
    expect(savedTargets()).toContain(folders.landing);

    // Forget project removes it from the list and from the settings file; the folder is untouched.
    await forget.click();
    await confirming.getByRole('button', { name: 'Forget project' }).click();
    await expect(rowOf(page, 'landing')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'was removed from this list.' })).toHaveText(
      `${listed.landing.name} was removed from this list.`,
    );
    expect(await listSlugs()).not.toContain(listed.landing.slug);
    expect(savedTargets()).not.toContain(folders.landing);
    expect(existsSync(folders.landing)).toBe(true);
    expect(snapshot(folders.landing)).toEqual(before);
  });

  test('at 390px the forget button is always shown and 40px square, and the confirm wraps inside its row', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const confirming = page.locator(".project-row[data-confirming='true']");
    await landing(page);
    const row = rowOf(page, 'held');
    const forget = row.getByRole('button', { name: `Forget ${listed.held.name}` });
    await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    const size = await box(forget);
    expect([Math.round(size.width), Math.round(size.height)]).toEqual([40, 40]);

    await forget.click();
    const confirm = confirming.locator('.project-row-confirm');
    await expect(confirm).toBeVisible();
    // The question wraps freely: it never makes the page scroll sideways and stays inside its row.
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    const rowBox = await box(confirming);
    const confirmBox = await box(confirm);
    expect(confirmBox.x).toBeGreaterThanOrEqual(rowBox.x);
    expect(confirmBox.x + confirmBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 0.5);
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();
  });

  test('while the request is held the row stays and Forget project is disabled; nothing leaves the list early', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const confirming = page.locator(".project-row[data-confirming='true']");
    await landing(page);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let held = 0;
    await page.route('**/api/projects/*', async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }
      held += 1;
      await gate;
      await route.continue();
    });

    const row = rowOf(page, 'held');
    await row.getByRole('button', { name: `Forget ${listed.held.name}` }).click();
    await confirming.getByRole('button', { name: 'Forget project' }).click();

    await expect.poll(() => held).toBe(1);
    await expect(confirming.getByRole('button', { name: 'Forget project' })).toBeDisabled();
    await expect(confirming.getByText(`Forget ${listed.held.name}? ${QUESTION}`)).toBeVisible();
    // Nothing was forgotten yet, on the server or in the list.
    expect(await listSlugs()).toContain(listed.held.slug);
    expect(savedTargets()).toContain(folders.held);

    release();
    await expect(rowOf(page, 'held')).toHaveCount(0);
    expect(savedTargets()).not.toContain(folders.held);
    expect(existsSync(folders.held)).toBe(true);
  });

  test('a settings write failure or a refusal keeps the row, returns focus to Forget project and says why', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const confirming = page.locator(".project-row[data-confirming='true']");
    await landing(page);
    const saveFailure =
      'Could not save the project list: the settings folder is read-only. The change lasts only until Labelore restarts.';
    let answer: { status: number; body: unknown } = { status: 500, body: { error: saveFailure } };
    await page.route('**/api/projects/*', async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: answer.status,
        contentType: 'application/json',
        body: JSON.stringify(answer.body),
      });
    });

    const row = rowOf(page, 'failing');
    await row.getByRole('button', { name: `Forget ${listed.failing.name}` }).click();
    await confirming.getByRole('button', { name: 'Forget project' }).click();

    await expect(confirming.getByRole('alert')).toHaveText(saveFailure);
    await expect(confirming.getByRole('button', { name: 'Forget project' })).toBeFocused();
    await expect(confirming.getByRole('button', { name: 'Forget project' })).toBeEnabled();
    expect(await listSlugs()).toContain(listed.failing.slug);
    expect(savedTargets()).toContain(folders.failing);

    // Try again and be refused (403): the refusal copy, still the same row, still nothing changed.
    answer = { status: 403, body: { error: 'no' } };
    await confirming.getByRole('button', { name: 'Forget project' }).click();
    await expect(confirming.getByRole('alert')).toHaveText(
      'Labelore refused this request because it did not come from its own page. Reload the page and try again.',
    );
    await expect(confirming.getByRole('button', { name: 'Forget project' })).toBeFocused();
    expect(savedTargets()).toContain(folders.failing);
  });

  test('in the switcher, Escape takes the question back and leaves the list open; forgetting the open project lands on /', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const confirming = page.locator(".project-row[data-confirming='true']");
    await page.goto(await projectUrl(server.base, '/', listed.escape.slug));
    const popup = await openSwitcher(page, listed.escape);
    const row = rowOf(popup, 'escape');
    await row.hover();
    await row.getByRole('button', { name: `Forget ${listed.escape.name}` }).click();
    await expect(confirming.getByText(`Forget ${listed.escape.name}? ${QUESTION}`)).toBeVisible();
    await expect(confirming.getByRole('button', { name: 'Keep project' })).toBeFocused();

    await page.keyboard.press('Escape');
    // The question went; the list is still open and the row is back with its forget button focused.
    await expect(confirming.getByText(`Forget ${listed.escape.name}? ${QUESTION}`)).toBeHidden();
    await expect(projectsDialog(page)).toBeVisible();
    await expect(row.getByRole('button', { name: `Forget ${listed.escape.name}` })).toBeFocused();
    // Escape closes the list as before (the forget button's tooltip, open on the focus that came back to
    // it, takes the first press when it is showing).
    await expect(async () => {
      if (await projectsDialog(page).isVisible()) await page.keyboard.press('Escape');
      await expect(projectsDialog(page)).toBeHidden({ timeout: 1000 });
    }).toPass();

    // Forgetting the project that is open leaves its pages for the landing page.
    await page.goto(await projectUrl(server.base, '/', listed.current.slug));
    const current = await openSwitcher(page, listed.current);
    const currentRow = rowOf(current, 'current');
    await expect(currentRow).toHaveAttribute('aria-current', 'true');
    await currentRow.hover();
    await currentRow.getByRole('button', { name: `Forget ${listed.current.name}` }).click();
    await confirming.getByRole('button', { name: 'Forget project' }).click();

    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    await expect(rowOf(page, 'current')).toHaveCount(0);
    expect(savedTargets()).not.toContain(folders.current);
    expect(existsSync(folders.current)).toBe(true);
  });
});
