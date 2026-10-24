// The project Research page (quick-261024-k8u, sketches 031-035), against this repo's own
// `.planning/research/` on the 4199 server. This is the page's only browser spec.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openResearch(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
  await page.goto(`/research${query}`);
  await page.locator('.research-spines').waitFor({ state: 'visible' });
}

test.describe('Research page: the frame', () => {
  test('the Research link sits between Roadmap and Traceability and opens /research', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.locator('a')).toContainText(['Dashboard', 'Roadmap', 'Research', 'Traceability', 'Sketches']);
    await nav.getByRole('link', { name: 'Research' }).click();
    await expect(page).toHaveURL(/\/research$/);
    await expect(page.locator('.research-spines')).toBeVisible();
  });

  test('one h1 and a bar that counts the files', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Labelore');
    await expect(page.locator('.research-bar')).toContainText('5 research files');
    await expect(page.locator('.research-bar')).toContainText('Researched 21 Aug 2026');
  });

  test('five spines 00 to 04 with Summary open and its numbers', async ({ page }) => {
    await openResearch(page);
    const closed = page.locator('.research-spine');
    await expect(closed).toHaveCount(4);
    await expect(closed.locator('.research-spine-number')).toHaveText(['01', '02', '03', '04']);
    const leaf = page.locator('.research-leaf');
    await expect(leaf).toHaveAttribute('aria-label', 'Summary');
    await expect(leaf.locator('h2')).toHaveText('Summary');
    await expect(leaf.locator('.research-leaf-number')).toHaveText('00');
    await expect(leaf.locator('.research-nums')).toContainText('4phases');
    await expect(leaf.locator('.research-nums')).toContainText('4gaps');
    await expect(page.getByRole('button', { name: 'Stack: 25 stack entries' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pitfalls: 10 critical pitfalls' })).toBeVisible();
  });

  test('the verdict is the first sentence and the toggle reveals the rest', async ({ page }) => {
    await openResearch(page);
    const verdict = page.locator('.research-verdict');
    await expect(verdict).toHaveText(/^Labelore is a read-only web viewer over structured markdown planning directories produced by the GSD orchestration tool\.$/);
    await expect(page.locator('.research-more')).toHaveCount(0);
    const toggle = page.getByRole('button', { name: 'Read the full summary' });
    await toggle.click();
    await expect(page.locator('.research-more p').first()).toBeVisible();
    const show = page.getByRole('button', { name: 'Show less' });
    await expect(show).toHaveAttribute('aria-expanded', 'true');
    await show.click();
    await expect(page.locator('.research-more')).toHaveCount(0);
  });

  test('arrow keys move between spines and the URL remembers', async ({ page }) => {
    await openResearch(page);
    await page.locator('.research-leaf').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/open=stack/);
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Stack');
    await expect(page.locator('.research-leaf')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('?open= restores a spine and an unknown key opens the first', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Pitfalls');
    await page.goto('/research?open=nonsense');
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('a closed spine opens on click', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: /^Architecture:/ }).click();
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Architecture');
    await expect(page).toHaveURL(/open=architecture/);
  });

  test('the page links to none of the source files', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('.research-page a[href*="/artifacts/"]')).toHaveCount(0);
    await expect(page.locator('.artifact-path-copy')).toHaveCount(0);
    await expect(page.locator('.research-page a')).toHaveCount(0);
  });

  test('at 390px the spines stack as bars without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openResearch(page);
    const direction = await page.locator('.research-spines').evaluate((el) => getComputedStyle(el).flexDirection);
    expect(direction).toBe('column');
    const widths = await page.locator('.research-spine').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    for (const width of widths) expect(width).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  });
});
