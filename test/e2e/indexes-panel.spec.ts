// Phase 11 (11-36, VIEW-19, L2B-WR-04): where keyboard focus goes when an Indexes tile opens, on the made-up Lendshed
// project (port 4198). A user who opens a tile with the keyboard lands in its panel, so the next Tab continues inside
// it; a page loaded straight at a tile's address leaves focus where the load puts it. Every address is built from the
// served project's payload through app-url.ts.
import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { artifactUrl, exactUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

const GRAPH = '.planning/graphs/graph.json';
const STACK = '.planning/intel/stack.json';

/** True when the element holding focus is the section or something inside it. */
function focusIsIn(section: Locator): Promise<boolean> {
  return section.evaluate((node) => node === document.activeElement || node.contains(document.activeElement));
}

test.describe('Indexes panel focus', () => {
  test('Enter on the collapsed Graph tile puts focus in the reopened panel', async ({ page }) => {
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, GRAPH));
    const open = page.locator('section.view-indexes-tile[data-open="true"]');
    await expect(open).toBeVisible();
    await page.keyboard.press('Escape');
    const graphButton = page.locator('button.view-indexes-tile[data-tile-key="graph"]');
    await expect(graphButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(open).toBeVisible();
    await expect.poll(() => focusIsIn(open)).toBe(true);
  });

  test("Enter on another tile (a new address) puts focus in that tile's panel", async ({ page }) => {
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, GRAPH));
    await expect(page.locator('section.view-indexes-tile[data-open="true"]')).toBeVisible();
    await page.keyboard.press('Escape');
    const graphButton = page.locator('button.view-indexes-tile[data-tile-key="graph"]');
    await expect(graphButton).toBeFocused();
    // Tab through the collapsed tiles to the Stack tile, as a keyboard user would.
    const stackButton = page.locator('button.view-indexes-tile[data-tile-key="stack"]');
    for (let presses = 0; presses < 8; presses++) {
      await page.keyboard.press('Tab');
      if (await stackButton.evaluate((node) => node === document.activeElement)) break;
    }
    await expect(stackButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(exactUrl(await artifactUrl(FIXTURE_BASE_URL, STACK)));
    const open = page.locator('section.view-indexes-tile[data-open="true"]');
    await expect(open.getByRole('heading', { level: 2, name: 'Stack' })).toBeVisible();
    await expect.poll(() => focusIsIn(open)).toBe(true);
  });

  test('loading a tile address directly leaves focus out of the panel, and so does a reload after opening one', async ({
    page,
  }) => {
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, GRAPH));
    const open = page.locator('section.view-indexes-tile[data-open="true"]');
    await expect(open).toBeVisible();
    // Let any focus effect that was going to run, run.
    await page.waitForTimeout(500);
    expect(await focusIsIn(open)).toBe(false);

    // Open Stack with the keyboard, then reload: the request that moved focus must not survive in the history entry.
    await page.keyboard.press('Escape');
    const stackButton = page.locator('button.view-indexes-tile[data-tile-key="stack"]');
    await stackButton.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focusIsIn(open)).toBe(true);
    await page.reload();
    await expect(open).toBeVisible();
    await page.waitForTimeout(500);
    expect(await focusIsIn(open)).toBe(false);
  });
});
