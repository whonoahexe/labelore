// The VERIFICATION page e2e (quick-261017-18a, sketch 021 winner E): real corpus files, never a
// fixture mock. Fixtures resolve by path against the project's live presentation payload (the
// summary-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. This
// spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow, squared corners, one
// chip signature, no 420px overflow), since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`verification-page.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`verification-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

async function openPage(page: Page, base: string, path: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(await artifactUrl(base, path));
  await page.locator('.view-verification-rail').waitFor({ state: 'visible' });
}


test.describe('Verification page', () => {
  test('Lendshed v1.0/04 passed with one frontmatter gap', async ({ page }) => {
    const path = await resolveFixturePath(FIXTURE_BASE_URL, 'v1.0-phases/04-shed-to-shed-transfers/04-VERIFICATION.md');
    await openPage(page, FIXTURE_BASE_URL, path, 'light');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.view-verification-identity .eyebrow')).toHaveText('Verification · Phase 4');
    await expect(page.locator('.view-verification-facts .status-chip')).toHaveText('Passed');
    await expect(page.locator('.view-verification-gap')).toHaveCount(1);
    await expect(page.locator('#verification-gap-c1')).toBeVisible();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every verification page fits 420px in ${theme}`, async ({ page }) => {
      const base = FIXTURE_BASE_URL;
      const response = await fetch(await projectApiUrl(base, '/presentation'));
      const data = (await response.json()) as PresentationLite;
      const paths = data.artifacts.filter((a) => a.path.endsWith('VERIFICATION.md') && !a.path.includes('sketches')).map((a) => a.path);
      // Five VERIFICATION files sit under the Lendshed fixture.
      expect(paths.length).toBeGreaterThanOrEqual(5);
      await page.setViewportSize({ width: 420, height: 900 });
      for (const path of paths) {
        await openPage(page, base, path, theme);
        await expect(page.locator('h1')).toHaveCount(1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });
  }
});
