// The browser check of every root-document address on the made-up Lendshed project (09 D-01, D-02):
// an archived roadmap or requirements copy opens on its live page at its milestone's block, open,
// highlighted, in view and marked Shipped; STATE.md redirects to the dashboard without leaving a Back
// trap; ?source=1 opens the file with no unrecognised-type notice; MILESTONES.md lands on the History.
// Addresses are built by projectUrl from what the served project reports, never hard-coded.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { exactUrl, projectUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

const SHIPPED_CHIP = 'Shipped v1.0 · 20 Mar 2026';
/** The sticky shell header's height, below which a scrolled-to block is readable. */
const HEADER_HEIGHT = 56;

/** The three facts every archived arrival shows on its block: highlighted, open, marked Shipped, in view. */
async function expectArrivalBlock(page: Page): Promise<Locator> {
  const block = page.locator('.history-milestone[data-target="true"]');
  await expect(block).toHaveCount(1);
  await expect(block).toHaveAttribute('open', '');
  await expect(block.locator('> summary .status-chip', { hasText: SHIPPED_CHIP })).toHaveCount(1);
  await expect(block.locator('> summary')).toBeInViewport();
  // The scroll clears the sticky header: the title and the chip are visible, not hidden behind it.
  await expect
    .poll(async () => (await block.locator('> summary').boundingBox())?.y ?? -1)
    .toBeGreaterThanOrEqual(HEADER_HEIGHT);
  return block;
}

test.describe('Root document addresses on Lendshed', () => {
  test('/v1.0/roadmap opens the roadmap at v1.0, highlighted and marked Shipped', async ({ page }) => {
    await page.goto(await projectUrl(FIXTURE_BASE_URL, '/v1.0/roadmap'));
    await expect(page.locator('.roadmap-page')).toBeVisible();
    await expectArrivalBlock(page);
    // The address stays the archived copy's own: no second page, no rewrite.
    await expect(page).toHaveURL(exactUrl(await projectUrl(FIXTURE_BASE_URL, '/v1.0/roadmap')));
  });

  test('/v1.0/requirements opens traceability at v1.0, highlighted and marked Shipped', async ({ page }) => {
    await page.goto(await projectUrl(FIXTURE_BASE_URL, '/v1.0/requirements'));
    await expect(page.locator('.traceability-page')).toBeVisible();
    await expectArrivalBlock(page);
  });

  test('the Shipped chip is on the block without the archived address, the highlight is not', async ({
    page,
  }) => {
    await page.goto(await projectUrl(FIXTURE_BASE_URL, '/roadmap'));
    await expect(page.locator('.roadmap-page')).toBeVisible();
    const block = page.locator('.history-milestone').first();
    await expect(block.locator('> summary .status-chip', { hasText: SHIPPED_CHIP })).toHaveCount(1);
    await expect(page.locator('.history-milestone[data-target="true"]')).toHaveCount(0);
  });

  test('/state lands on the dashboard and Back skips it', async ({ page }) => {
    const before = await projectUrl(FIXTURE_BASE_URL, '/roadmap');
    await page.goto(before);
    await expect(page.locator('.roadmap-page')).toBeVisible();

    await page.goto(await projectUrl(FIXTURE_BASE_URL, '/state'));
    await expect(page).toHaveURL(exactUrl(await projectUrl(FIXTURE_BASE_URL, '/')));
    await expect(page.locator('.roadmap-page')).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(exactUrl(before));
    await expect(page).not.toHaveURL(/\/state/);
  });

  test('/state?source=1 opens the file with no unrecognised-type notice', async ({ page }) => {
    const source = await projectUrl(FIXTURE_BASE_URL, '/state?source=1');
    await page.goto(source);
    await expect(page.locator('.artifact-page')).toBeVisible();
    await expect(page.locator('.view-unrecognized-notice')).toHaveCount(0);
    await expect(page.getByText('dedicated view')).toHaveCount(0);
  });

  test('/milestones lands on the roadmap with the History in view', async ({ page }) => {
    await page.goto(await projectUrl(FIXTURE_BASE_URL, '/milestones'));
    await expect(page.locator('.roadmap-page')).toBeVisible();
    await expect(page).toHaveURL(/#history$/);
    await expect(page.locator('#history')).toBeInViewport({ ratio: 0.1 });
    await expect(page.locator('#history h2')).toBeInViewport();
    await expect
      .poll(async () => (await page.locator('#history h2').boundingBox())?.y ?? -1)
      .toBeGreaterThanOrEqual(HEADER_HEIGHT);
  });
});
