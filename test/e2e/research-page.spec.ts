// The project Research page (quick-261024-k8u, sketches 031-035), against the made-up dense project's
// `.planning/research/` (SUMMARY, STACK and PITFALLS) on the 4199 server. This is the page's only browser
// spec. The file and spine counts come from that folder; no heading text of the dense project is pinned,
// since its wording is free to change. The lift of each research shape (phase list, stack decision,
// competitor matrix, overview diagram, build order) is covered by the lift tests in
// test/project-research-lift.test.ts, which read made-up template research.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BASE_URL, exactUrl, projectUrl } from './app-url.ts';

async function openResearch(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
  await page.goto(await projectUrl(BASE_URL, `/research${query}`));
  await page.locator('.research-spines').waitFor({ state: 'visible' });
}

test.describe('Research page: the frame', () => {
  test('the Research link sits between Roadmap and Traceability and opens /research', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(await projectUrl(BASE_URL, '/'));
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.locator('a')).toContainText(['Dashboard', 'Roadmap', 'Research', 'Traceability']);
    await nav.getByRole('link', { name: 'Research' }).click();
    await expect(page).toHaveURL(exactUrl(await projectUrl(BASE_URL, '/research')));
    await expect(page.locator('.research-spines')).toBeVisible();
  });

  test('one h1 and a bar that counts the files', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.research-bar')).toContainText('3 research files');
    await expect(page.locator('.research-bar')).toContainText('Researched 20 May 2026');
  });

  test('arrow keys move between spines and the URL remembers', async ({ page }) => {
    await openResearch(page);
    await page.locator('.research-leaf').focus();
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
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
    await page.goto(await projectUrl(BASE_URL, '/research?open=nonsense'));
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('a closed spine opens on click', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: /^Pitfalls:/ }).click();
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Pitfalls');
    await expect(page).toHaveURL(/open=pitfalls/);
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

test.describe('Research page: every spine at 390px and in the dark theme', () => {
  for (const key of ['summary', 'stack', 'pitfalls']) {
    test(`${key} has no horizontal overflow at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await openResearch(page, `?open=${key}`);
      await expect(page.locator('.research-leaf')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    });

    test(`${key} loads in the dark theme without console errors`, async ({ page }) => {
      const errors: string[] = [];
      // The dev server's HMR socket is unrelated to the page.
      const unrelated = /WebSocket|vite/i;
      page.on('pageerror', (error) => {
        if (!unrelated.test(error.message)) errors.push(error.message);
      });
      page.on('console', (message) => {
        if (message.type() === 'error' && !unrelated.test(message.text())) errors.push(message.text());
      });
      await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
      await page.goto(await projectUrl(BASE_URL, `/research?open=${key}`));
      await page.locator('.research-leaf').waitFor({ state: 'visible' });
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
      expect(errors).toEqual([]);
    });
  }
});
