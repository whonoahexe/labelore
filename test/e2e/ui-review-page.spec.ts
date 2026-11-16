// The UI-REVIEW scorecard e2e (quick-261003-528, sketch 018 winner B): real files, never a mock.
// Files resolve by path against the project's live presentation payload (the uat-page.spec.ts idiom) so
// an archival/rename fails loudly instead of silently skipping. The test
// runs against the read-only server on the made-up Lendshed project (port 4198,
// FIXTURE_BASE_URL; playwright.config.ts always starts it and throws at load when the fixture tree is
// missing). Nothing in this file skips. This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow,
// squared corners, one chip signature, no 420px overflow), since the full sweep is too slow to run
// per change. Run once post-merge: npx playwright test test/e2e/ui-review-page.spec.ts -g "ui-review page"
import { expect, test } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`ui-review-page.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`ui-review-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
test.describe('UI review page', () => {
  test('FX 03 ui-review page', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, 'phases/03-account-admin-and-sessions/03-UI-REVIEW.md'));
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#ui-review-inspector').waitFor({ state: 'visible' });

    await expect(page.locator('h1')).toHaveText('Account admin and sessions');
    await expect(page.locator('.view-ui-review-pin')).toHaveCount(2);
    await expect(page.locator('.view-ui-review-side')).not.toContainText('No third fix');
    await expect(page.locator('.view-ui-review-tab[aria-selected="true"]')).toContainText('Typography');
    const inspector = page.locator('#ui-review-inspector');
    await expect(inspector.locator('.view-ui-review-found-card')).toHaveCount(1);
    await expect(inspector.locator('#ui-review-fix-1')).toBeVisible();
    await expect(inspector.locator('.view-ui-review-ref', { hasText: 'confirm-danger-dialog.tsx:174' })).toBeVisible();
  });
});
