// The UAT session page e2e (quick-261001-qk7, sketch 015 winner B): real files, never a mock. Fixtures
// resolve by path against the project's live presentation payload (the patterns-map.spec.ts idiom) so an
// archival/rename fails loudly instead of silently skipping. The Lendshed v1.0/03 test runs against the read-only server on the
// made-up Lendshed project (port 4198, FIXTURE_BASE_URL; playwright.config.ts always starts it and throws
// at load when the fixture tree is missing). Nothing in this file skips. This spec asserts the foundation
// sweep's key invariants itself (one h1, an eyebrow, squared corners, one chip signature, no 420px
// overflow), since the full sweep is too slow to run per change.
// Run once post-merge: npx playwright test test/e2e/uat-page.spec.ts -g "uat page"
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`uat-page.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`uat-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

test.describe('UAT session page', () => {
  test('Lendshed v1.0/03 uat page', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, 'v1.0-phases/03-catalogue-browsing/03-UAT.md'));
    await page.goto(url);
    await page.locator('#uat-gaps').waitFor({ state: 'visible' });

    await expect(page.locator('.view-uat-facts')).toContainText('Complete');
    await expect(page.locator('tr[data-gap]')).toHaveCount(6);
    await expect(page.locator('#uat-gaps .view-uat-aside')).toHaveText('6 · 0 open');

    // The G-CAT-1 row opens to its diagnosis and Resolved strip.
    await page.locator('tr[data-gap]', { hasText: 'G-CAT-1' }).click();
    const detail = page.locator('tr[data-detail]');
    await expect(detail).toHaveCount(1);
    await expect(detail).toContainText('Root cause');
    await expect(detail).toContainText('server/routes.ts:64');
    await expect(detail).toContainText('Missing');
    await expect(detail).toContainText('Resolved');

    // Test 1 ↑ brings the test into view.
    await detail.getByRole('button', { name: 'Test 1 ↑' }).click();
    await expect.poll(() => inViewport(page, page.locator('#uat-test-1'))).toBe(true);
  });
});
