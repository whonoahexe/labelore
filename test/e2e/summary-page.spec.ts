// The SUMMARY page e2e (quick-261006-iz7, sketch 020 winner D): real corpus files, never a fixture
// mock. Fixtures resolve by path against the project's live presentation payload (the uat-page.spec.ts
// idiom) so an archival/rename fails loudly instead of silently skipping. The tests run against the in-repo made-up project on port 4198
// (playwright.config.ts, always started). This spec asserts the foundation sweep's key invariants
// itself (one h1, an eyebrow, squared corners, one chip signature, no 420px overflow), since the full
// sweep is too slow to run per change. Run once post-merge: npx playwright test test/e2e/summary-page.spec.ts -g "summary page"
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`summary-page.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`summary-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function openPage(page: Page, base: string, path: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(await artifactUrl(base, path));
  await page.locator('.view-summary-head').waitFor({ state: 'visible' });
}

async function openRequirements(page: Page): Promise<void> {
  await page.locator('.view-summary-triggers > button', { hasText: 'Requirements' }).click();
  await page.locator('.view-summary-modal').waitFor({ state: 'visible' });
}

test.describe('Summary page', () => {
  test('FX 01-01 summary page', async ({ page }) => {
    const path = await resolveFixturePath(FIXTURE_BASE_URL, 'phases/01-member-sign-in-sessions/01-01-SUMMARY.md');
    await openPage(page, FIXTURE_BASE_URL, path, 'light');

    await expect(page.locator('h1')).toHaveText('Member Password Sessions');
    // Five deviation margin cards: four under Task 1 and one under Task 3.
    const stops = page.locator('.view-summary-stop[data-kind="task"]');
    await expect(stops).toHaveCount(3);
    await expect(stops.nth(0).locator('.view-summary-fix')).toHaveCount(4);
    await expect(stops.nth(1).locator('.view-summary-fix')).toHaveCount(0);
    await expect(stops.nth(2).locator('.view-summary-fix')).toHaveCount(1);
    await expect(page.locator('.view-summary-added')).toContainText('New dependencies · 5');

    await openRequirements(page);
    await page.locator('.view-summary-req', { hasText: 'SIGN-01' }).hover();
    await expect(page.locator('.reference-preview')).toContainText('without the kiosk passcode');
    await expect(page.locator('.reference-preview')).toContainText('.planning/REQUIREMENTS.md');
  });

  test('FX 04-06 summary page', async ({ page }) => {
    const path = await resolveFixturePath(FIXTURE_BASE_URL, 'phases/04-bulk-loan-export/04-06-SUMMARY.md');
    await openPage(page, FIXTURE_BASE_URL, path, 'light');

    await expect(page.locator('.view-summary-metrics')).toContainText('Awaiting checkpoint');
    await expect(page.locator('.view-summary-outcome')).toHaveCount(0);
    await expect(page.locator('.view-summary-triggers > button', { hasText: 'Requirements' })).toContainText('+4 pending');
    const waits = page.locator('.view-summary-waits details');
    await expect(waits).toHaveCount(1);
    await expect(waits.first()).toContainText('Task 3 — Pending Human Verification');
    expect(await waits.first().evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
    await expect(page.locator('.view-summary-stop[data-kind="wait"]')).toHaveCount(1);
  });

});
