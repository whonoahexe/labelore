// quick-261024-vty: the two-column planning-files drawer (sketch 038 C). Every target, count and
// label is resolved from `/api/drawer`, never hardcoded, so the spec follows whatever this repo's
// own `.planning/` holds.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DrawerPhasePlace, DrawerQuickTask, DrawerViewModel } from '../../src/presentation/drawer.ts';
import { SCREENSHOT_ROOT } from './pages.ts';

const SHOTS = join(SCREENSHOT_ROOT, 'vty');

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('labelore-theme', t);
  }, theme);
}

async function fetchDrawer(baseURL: string): Promise<DrawerViewModel> {
  const response = await fetch(`${baseURL}/api/drawer`);
  if (!response.ok) throw new Error(`planning-drawer.spec: /api/drawer responded ${response.status}`);
  return (await response.json()) as DrawerViewModel;
}

async function openDrawer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open planning files' }).click();
  await expect(page.locator('.sidebar-drawer')).toBeVisible();
  await expect(page.locator('.places-navigator')).not.toHaveAttribute('data-state', 'loading');
  // The drawer slides in; wait for it to rest at the left edge before measuring or shooting it.
  await expect.poll(async () => (await page.locator('.sidebar-drawer').boundingBox())?.x).toBe(0);
}

function firstShippedPhaseWithPlans(model: DrawerViewModel): {
  version: string;
  milestoneKey: string;
  phase: DrawerPhasePlace;
} {
  for (const milestone of model.shipped) {
    const phase = milestone.phases.find((candidate) => candidate.plans.length > 0);
    if (phase) return { version: milestone.version, milestoneKey: milestone.key, phase };
  }
  throw new Error('planning-drawer.spec: no shipped phase with plans in this corpus');
}

test.describe('planning files drawer', () => {
  test('opens on a shipped plan page with that phase selected and the plan row active', async ({
    page,
    baseURL,
  }) => {
    const model = await fetchDrawer(baseURL!);
    const { version, phase } = firstShippedPhaseWithPlans(model);
    const plan = phase.plans[0];

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(plan.url);
    await openDrawer(page);

    await expect(page.locator('.places-where')).toHaveText(`${version} · Phase ${phase.number}`);
    await expect(page.locator('.places-files-title')).toHaveText(phase.name);

    const active = page.locator('.places-file-row[data-active="true"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(active.locator('.places-label')).toHaveText(plan.label);

    const selected = page.locator('.places-row[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveAttribute('data-depth', '1');
    await expect(selected.locator('.places-label')).toHaveText(phase.name);

    await expect(page.locator('.places-group-label')).toHaveText([
      /^Current(v\d+(\.\d+)*)?$/,
      'Shipped',
    ]);
    await expect(page.locator('.sidebar-drawer-header button')).toHaveCount(1);
    await expect(page.locator('.sidebar-drawer-header button')).toHaveAccessibleName('Close planning files');

    const box = await page.locator('.sidebar-drawer').boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(560);
  });

  test('lists current quick tasks by month, each row opening its plan with a Plan / Summary switch', async ({ page, baseURL }) => {
    const model = await fetchDrawer(baseURL!);
    const quick = model.current.quick;
    test.skip(quick.count === 0, 'this corpus has no current quick tasks');

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await openDrawer(page);
    await page
      .locator('.places-group')
      .first()
      .locator('.places-row', { hasText: 'Quick tasks' })
      .click();

    await expect(page.locator('.places-files-title')).toHaveText(`Quick tasks · ${quick.count}`);
    await expect(page.locator('.places-files .places-stage')).toHaveCount(quick.months.length);
    await expect(page.locator('.places-quick-task')).toHaveCount(quick.count);
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, 'desktop-quick.png') });

    const task = quick.months.flatMap((month) => month.tasks).find(
      (candidate) =>
        candidate.files.some((file) => file.label === 'Plan') &&
        candidate.files.some((file) => file.label === 'Summary'),
    );
    test.skip(task === undefined, 'no current quick task has both a plan and a summary');
    const planFile = task!.files.find((file) => file.label === 'Plan')!;
    const summaryFile = task!.files.find((file) => file.label === 'Summary')!;
    await page.locator('.places-quick-task').filter({ has: page.locator(`[title="${task!.key}"]`) }).click();

    await expect(page).toHaveURL(new RegExp(`${planFile.url}$`));
    const pairSwitch = page.locator('.plan-pair-switch');
    await expect(pairSwitch.locator('a[aria-current="page"]')).toHaveText('Plan');
    await pairSwitch.locator('a', { hasText: 'Summary' }).click();
    await expect(page).toHaveURL(new RegExp(`${summaryFile.url}$`));
    await expect(page.locator('.plan-pair-switch a[aria-current="page"]')).toHaveText('Summary');
  });

  test("a quick task's plan page opens the drawer on that task with its row active", async ({
    page,
    baseURL,
  }) => {
    const model = await fetchDrawer(baseURL!);
    const tasks: DrawerQuickTask[] = model.current.quick.months.flatMap((month) => month.tasks);
    const task = tasks.find((candidate) => candidate.files.some((file) => file.label === 'Plan'));
    test.skip(task === undefined, 'no current quick task has a plan file');

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(task!.url);
    await openDrawer(page);

    const selected = page.locator('.places-row[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected.locator('.places-label')).toHaveText('Quick tasks');
    const row = page.locator('.places-quick-task[data-active="true"]');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.places-label')).toHaveText(task!.label);
    await expect(row).toHaveAttribute('aria-current', 'page');
  });

  test('a shipped milestone links to all of its quick tasks', async ({ page, baseURL }) => {
    const model = await fetchDrawer(baseURL!);
    const milestone = model.shipped.find((candidate) => candidate.quick.count > 0);
    test.skip(milestone === undefined, 'no shipped milestone has quick tasks');

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await openDrawer(page);
    await page.locator('.places-list .places-row', { hasText: milestone!.version }).first().click();
    await page.locator('.places-files .places-row', { hasText: `All ${milestone!.quick.count} quick tasks` }).click();

    await expect(page.locator('.places-where')).toHaveText(milestone!.version);
    await expect(page.locator('.places-files-title')).toHaveText(`Quick tasks · ${milestone!.quick.count}`);
    await expect(page.locator('.places-quick-task')).toHaveCount(milestone!.quick.count);
    // The milestone stays unfolded while its quick tasks are showing.
    await expect(page.locator('.places-row[data-selected="true"]')).toHaveAttribute('data-depth', '1');
  });

  test('on a phone the drawer drills from places into files and back with an All places link', async ({
    page,
    baseURL,
  }) => {
    const model = await fetchDrawer(baseURL!);
    const { version, phase } = firstShippedPhaseWithPlans(model);

    mkdirSync(SHOTS, { recursive: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(phase.plans[0].url);
    await openDrawer(page);

    const list = page.locator('.places-list');
    const files = page.locator('.places-files');
    const back = page.getByRole('button', { name: 'All places' });
    await expect(list).toBeVisible();
    await expect(files).toBeHidden();
    const columns = await page.locator('.places-navigator').evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(columns).toBe(1);
    await page.screenshot({ path: join(SHOTS, 'phone-places.png') });

    // Tapping the selected phase drills into its files.
    await page.locator('.places-row[data-selected="true"]').click();
    await expect(files).toBeVisible();
    await expect(list).toBeHidden();
    await expect(back).toBeVisible();
    await expect(page.locator('.places-where')).toHaveText(`${version} · Phase ${phase.number}`);
    await page.screenshot({ path: join(SHOTS, 'phone-files.png') });

    // Back returns to the places with the same place still selected.
    await back.click();
    await expect(list).toBeVisible();
    await expect(files).toBeHidden();
    const selected = page.locator('.places-row[data-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected.locator('.places-label')).toHaveText(phase.name);

    // Choosing a phase from a milestone place keeps the files showing.
    await page.locator('.places-list .places-row', { hasText: version }).first().click();
    await expect(files).toBeVisible();
    await expect(page.locator('.places-files-title')).toContainText(version);
    await page.locator('.places-files .places-row', { hasText: phase.name }).first().click();
    await expect(files).toBeVisible();
    await expect(page.locator('.places-files-title')).toHaveText(phase.name);
  });

  test('at desktop width both columns show and the All places control stays hidden', async ({
    page,
    baseURL,
  }) => {
    const model = await fetchDrawer(baseURL!);
    const { phase } = firstShippedPhaseWithPlans(model);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(phase.plans[0].url);
    await openDrawer(page);
    await expect(page.locator('.places-list')).toBeVisible();
    await expect(page.locator('.places-files')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All places' })).toBeHidden();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`screenshot: the drawer on a shipped plan page, desktop ${theme}`, async ({ page, baseURL }) => {
      const model = await fetchDrawer(baseURL!);
      const { phase } = firstShippedPhaseWithPlans(model);
      mkdirSync(SHOTS, { recursive: true });
      await setTheme(page, theme);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(phase.plans[0].url);
      await openDrawer(page);
      await page.screenshot({ path: join(SHOTS, `desktop-${theme}.png`) });
    });
  }
});
