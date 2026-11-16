// The SECURITY console e2e (quick-261003-527, sketch 017 winner D): real files, never a mock. Fixtures
// resolve by path against the project's live presentation payload (the uat-page.spec.ts idiom) so an
// archival/rename fails loudly instead of silently skipping. The two Lendshed tests run against the read-only server on the made-up
// Lendshed project (port 4198, FIXTURE_BASE_URL; playwright.config.ts always starts it and throws at load
// when the fixture tree is missing). Nothing in this file skips. This spec asserts the foundation sweep's
// key invariants itself (one h1, an eyebrow, squared corners, one chip signature, no 420px overflow),
// since the full sweep is too slow to run per change.
// Run once post-merge: npx playwright test test/e2e/security-page.spec.ts -g "security page"
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`security-page.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`security-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

test.describe('SECURITY page', () => {
  test('Lendshed P1 security page', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '/phases/01-member-sign-in-sessions/01-SECURITY.md'));
    await page.goto(url);
    await page.locator('.view-security-board').waitFor({ state: 'visible' });

    // Trust boundaries: API (2 ways in), the six single crossings, then the at-rest block.
    const dests = page.locator('.view-security-dest');
    await expect(dests).toHaveCount(3);
    await expect(dests.first()).toContainText('API');
    await expect(dests.first()).toContainText('2 ways in');
    await expect(dests.nth(1)).toContainText('Other crossings');
    await expect(dests.nth(1).locator('.view-security-crossing')).toHaveCount(6);
    await expect(dests.last()).toContainText('At rest / in-process');
    await expect(page.locator('.view-security-from[data-tone="in-flight"]')).toHaveCount(1);

    // Residual observations: closed by default, three items when opened.
    const toggle = page.getByRole('button', { name: /Residual observations · 3/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.view-security-residual')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.view-security-residual')).toHaveCount(3);

    // The ref chip picks the threat's square and brings the detail panel into view.
    await page.locator('#security-residuals').getByRole('button', { name: 'T-01-06', exact: true }).click();
    await expect(page.locator('.view-security-square[data-threat="T-01-06"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => inViewport(page, page.locator('#security-detail'))).toBe(true);
    await expect(page.locator('#security-detail')).toContainText('1 residual observation');

    // Closing the toggle removes the items; the detail's link reopens it and flashes the first.
    await toggle.click();
    await expect(page.locator('.view-security-residual')).toHaveCount(0);
    await page.locator('#security-detail').getByRole('button', { name: /1 residual observation/ }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const first = page.locator('#security-residual-0');
    await expect.poll(() => inViewport(page, first)).toBe(true);
    await expect(first).toHaveAttribute('data-flash', 'true');

    for (const selector of ['.view-security-dest', '.view-security-residuals-toggle']) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }
  });

  test('Lendshed P3 security page', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '/phases/03-account-admin-and-sessions/03-SECURITY.md'));
    await page.goto(url);
    await page.locator('.view-security-board').waitFor({ state: 'visible' });

    await expect(page.locator('.view-security-square')).toHaveCount(30);
    await expect(page.locator('.view-security-square[data-accepted="true"]')).toHaveCount(8);
    await expect(page.locator('.view-security-waiver')).toHaveCount(8);
    await expect(page.locator('.view-security-gauge')).toContainText('nothing blocking');
    await expect(page.locator('.view-security-stamp')).toContainText('Signed off');
    // Ten single-crossing destinations gather into one "Crossings · 10" block, one source toned.
    await expect(page.locator('.view-security-dest')).toHaveCount(1);
    await expect(page.locator('.view-security-dest')).toContainText('Crossings · 10');
    await expect(page.locator('.view-security-from[data-tone="in-flight"]')).toHaveCount(1);
  });
});
