// Phase 8 (08-11): the header project switcher in Chromium, against the real server on two made-up
// projects (Lendshed and Shapes). Names, targets and slugs come from GET /api/projects, never from
// literals, so the spec follows whatever the fixtures hold. 08-17 adds the add and forget cases and
// 08-13 the scan cases to this file.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { FIXTURE_ROOT, SHAPES_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer, type ProjectsServer } from './projects-server.ts';

interface ListedProject {
  slug: string;
  name: string;
  target: string;
}

let server: ProjectsServer;
let lendshed: ListedProject;
let shapes: ListedProject;

test.beforeAll(async () => {
  // A cold development server compiles on first request; the helper waits up to a minute for it.
  test.setTimeout(120_000);
  server = await startProjectsServer({ paths: [FIXTURE_ROOT, SHAPES_FIXTURE_ROOT] });
  const response = await fetch(`${server.base}/api/projects`);
  const { projects } = (await response.json()) as { projects: ListedProject[] };
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

test.describe('header project switcher', () => {
  test('switches from one project\'s dashboard to another\'s, and Escape returns focus to the trigger', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${server.base}/${lendshed.slug}`);

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
});
