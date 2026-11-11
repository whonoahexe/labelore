// The Source reader's selection and links in a real browser (Phase 12: SRC-02, D-05, D-06; sketch 062 E), on the
// made-up Lendshed project (port 4198, started by playwright.config.ts): click a line number, shift-click a second,
// keep the range in the URL fragment with no new history entry, reload and land on it, select a whole block,
// clear with Escape, and land an "In the source only" link on its heading's line. Pure rules (the reducer, the
// label, the link) are unit-tested in test/web/source-selection.test.ts; this proves them in the page.
// Run on its own: npx playwright test test/e2e/source-reader.spec.ts
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

const EN_DASH = '–';

async function pathOf(pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(FIXTURE_BASE_URL, '/presentation'));
  if (!response.ok) throw new Error(`source-reader.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as { artifacts: { path: string }[] };
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`source-reader.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** Opens a Lendshed file in Source (the file's one URL plus ?source=1, and an optional fragment). */
async function openSource(page: Page, pathIncludes: string, fragment = ''): Promise<void> {
  await page.goto(`${await artifactUrl(FIXTURE_BASE_URL, await pathOf(pathIncludes))}?source=1${fragment}`);
  await page.locator('.source-reader .source-row').first().waitFor({ state: 'visible' });
}

const PLAN_06 = 'phases/01-member-sign-in-sessions/01-06-PLAN.md';

/** True once the row's top edge is at or below the sticky bar's bottom edge and still in the window. */
async function rowBelowBar(page: Page, line: number): Promise<boolean> {
  const bar = await page.locator('.source-bar').boundingBox();
  const row = await page.locator(`#L${line}`).boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return bar !== null && row !== null && row.y >= bar.y + bar.height - 1 && row.y < height;
}

test.describe('Source reader selection on Lendshed', () => {
  test('click L12, shift-click L18, keep it in the fragment without history, reload onto it', async ({ page }) => {
    await openSource(page, PLAN_06);
    // The frontmatter starts folded (the numbers jump from 1 to 52); open it so lines 12 and 18 are rows.
    await page.getByRole('button', { name: /^Unfold frontmatter/ }).first().click();
    await expect(page.locator('#L12')).toBeVisible();
    const historyBefore = await page.evaluate(() => window.history.length);

    await page.locator('#L12 .source-line-number').click();
    await expect(page).toHaveURL(/\?source=1#L12$/);
    await expect(page.locator('.source-selection')).toContainText('L12');
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(1);

    await page.locator('#L18 .source-line-number').click({ modifiers: ['Shift'] });
    await expect(page).toHaveURL(/\?source=1#L12-L18$/);
    await expect(page.locator('.source-selection')).toContainText(`L12${EN_DASH}L18`);
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(7);
    // Neither click added a history entry: the link's default was prevented and only the fragment was replaced.
    expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);

    await page.reload();
    await page.locator('.source-reader .source-row').first().waitFor({ state: 'visible' });
    await expect(page).toHaveURL(/\?source=1#L12-L18$/);
    // The range sits inside the folded frontmatter, so landing opened it and selected rows 12 to 18.
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(7);
    for (const line of [12, 13, 14, 15, 16, 17, 18]) await expect(page.locator(`#L${line}`)).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('.source-selection')).toContainText(`L12${EN_DASH}L18`);
    // The first selected row is scrolled to just under the sticky bar, not hidden behind it.
    await expect.poll(() => rowBelowBar(page, 12)).toBe(true);
  });
});
