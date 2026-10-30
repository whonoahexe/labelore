// Phase 8 (08-11): the header project switcher in Chromium, against the real server on two made-up
// projects (Lendshed and Shapes). Names, targets and slugs come from GET /api/projects, never from
// literals, so the spec follows whatever the fixtures hold. 08-17 adds the add and forget cases and
// 08-13 the scan cases to this file.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

// The 039 winner's layout contract (A, popover under the name trigger), facts 1, 2, 3 and 6 of its
// README. Facts 4 and 5 (the footer's tab order and the forget button) belong to the controls 08-17
// hangs on the list. The server holds the two fixtures plus fourteen saved projects, so the list is
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
