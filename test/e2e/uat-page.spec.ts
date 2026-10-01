// The UAT session page e2e (quick-261001-qk7, sketch 015 winner B): real corpus files, never a
// fixture mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// patterns-map.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. The
// labelore v1.0/01 test always runs; the studio-portal test runs against the read-only server on
// port 4198 (playwright.config.ts, present only when ~/studio-portal/.planning exists) and skips
// itself otherwise. This spec asserts the foundation sweep's key invariants itself (one h1, an
// eyebrow, squared corners, one chip signature, no 420px overflow), since the full sweep is too
// slow to run per change. Run once post-merge: npx playwright test test/e2e/uat-page.spec.ts -g "uat page"
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const STUDIO_PORTAL_AVAILABLE = existsSync(join(homedir(), 'studio-portal', '.planning'));
const SP_BASE_URL = 'http://127.0.0.1:4198';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) throw new Error(`uat-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`uat-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

test.describe('UAT session page', () => {
  test('LB v1.0/01 uat page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '01-read-layer-domain-model/01-UAT.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#uat-tests').waitFor({ state: 'visible' });

    // Cover and page invariants.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Read layer domain model');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('User acceptance test · Phase 1');
    const facts = page.locator('.view-uat-facts');
    await expect(facts).toContainText('Complete');
    await expect(facts).toContainText('9 Sep 2026 · 13:50');
    await expect(facts).toContainText('9 Sep 2026 · 14:25');
    await expect(facts).toContainText('35 min later');
    await expect(page.locator('.view-uat-scope')).toContainText('Tested from');

    // Done line, squares and pairs.
    const done = page.locator('.view-uat-done');
    await expect(done).toContainText('Testing complete');
    await expect(done).toContainText('23 of 23 passed');
    await expect(page.locator('.view-uat-square[data-result="pass"]')).toHaveCount(23);
    await expect(page.locator('.view-uat-pair')).toHaveCount(23);
    await expect(page.locator('#uat-gaps .view-uat-aside')).toHaveText('none');

    // A square jumps to its test and flashes it.
    await page.locator('.view-uat-square', { hasText: /^17$/ }).click();
    const target = page.locator('#uat-test-17');
    await expect.poll(() => inViewport(page, target)).toBe(true);
    await expect(target).toHaveAttribute('data-flash', 'true');

    // F-05: every status chip on the page measures the same (buttons and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(10);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome.
    for (const selector of ['.view-uat-pair', '.view-uat-square', '.view-uat-source-only']) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // The source-only strip: two buttons; Summary block lands in Source mode at its heading.
    const strip = page.locator('#uat-source-only');
    await expect(strip.getByRole('button')).toHaveCount(2);
    await expect(strip.getByRole('button', { name: 'Frontmatter', exact: true })).toBeVisible();
    await strip.getByRole('button', { name: 'Summary block', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-uat-pair')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Summary' });
    await expect.poll(() => inViewport(page, heading)).toBe(true);

    // Back to View restores the page.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-uat-pair')).toHaveCount(23);

    // 420px, dark: nothing overflows.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#uat-tests').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  });

  test('SP v1.0/03 uat page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'v1.0-phases/03-file-browsing/03-UAT.md');
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('#uat-gaps').waitFor({ state: 'visible' });

    await expect(page.locator('.view-uat-facts')).toContainText('Complete');
    await expect(page.locator('tr[data-gap]')).toHaveCount(6);
    await expect(page.locator('#uat-gaps .view-uat-aside')).toHaveText('6 · 0 open');

    // The G-03-1 row opens to its diagnosis and Resolved strip.
    await page.locator('tr[data-gap]', { hasText: 'G-03-1' }).click();
    const detail = page.locator('tr[data-detail]');
    await expect(detail).toHaveCount(1);
    await expect(detail).toContainText('Root cause');
    await expect(detail).toContainText('backend/src/lib.rs:82');
    await expect(detail).toContainText('Missing');
    await expect(detail).toContainText('Resolved');

    // Test 1 ↑ brings the test into view.
    await detail.getByRole('button', { name: 'Test 1 ↑' }).click();
    await expect.poll(() => inViewport(page, page.locator('#uat-test-1'))).toBe(true);
  });
});
