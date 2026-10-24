// quick-261024-vty: the two-column planning-files drawer (sketch 038 C). Every target, count and
// label is resolved from `/api/drawer`, never hardcoded, so the spec follows whatever this repo's
// own `.planning/` holds.
import { expect, test, type Page } from '@playwright/test';
import type { DrawerPhasePlace, DrawerViewModel } from '../../src/presentation/drawer.ts';

async function fetchDrawer(baseURL: string): Promise<DrawerViewModel> {
  const response = await fetch(`${baseURL}/api/drawer`);
  if (!response.ok) throw new Error(`planning-drawer.spec: /api/drawer responded ${response.status}`);
  return (await response.json()) as DrawerViewModel;
}

async function openDrawer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open planning files' }).click();
  await expect(page.locator('.sidebar-drawer')).toBeVisible();
  await expect(page.locator('.places-navigator')).not.toHaveAttribute('data-state', 'loading');
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
});
