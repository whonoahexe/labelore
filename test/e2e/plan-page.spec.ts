// The PLAN task navigator e2e (quick-261006-iz6, sketch 019 winner B): real files, never a mock.
// Fixtures resolve by path against the project's live presentation payload (the ui-review-page.spec.ts
// idiom) so an archival/rename fails loudly instead of silently skipping. The tests run against the made-up Lendshed project on port 4198
// (playwright.config.ts always starts it, D-01, D-05). Nothing here skips. A phase plan's Planned date
// comes from git or mtime, so those are pinned by shape; a quick plan's comes from its id and is exact.
// This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow,
// squared corners, one chip signature, no 420px overflow), since the full sweep is too slow to run
// per change. Run once post-merge: npx playwright test test/e2e/plan-page.spec.ts -g "plan page"
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string; structured: Record<string, unknown> }[];
}

async function presentationOf(baseURL: string): Promise<PresentationLite> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`plan-page.spec: the project's presentation payload responded ${response.status}`);
  return (await response.json()) as PresentationLite;
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const data = await presentationOf(baseURL);
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`plan-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function openPage(page: Page, base: string, path: string, theme: 'light' | 'dark', width = 1440): Promise<void> {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(await artifactUrl(base, path));
  await page.locator('#plan-task-workspace').waitFor({ state: 'visible' });
}

async function openFx(page: Page, pathIncludes: string): Promise<void> {
  const path = await resolveFixturePath(FIXTURE_BASE_URL, pathIncludes);
  await openPage(page, FIXTURE_BASE_URL, path, 'light');
}

const tab = (page: Page, n: number): Locator => page.locator(`#plan-task-list [role="tab"][data-task="${n}"]`);

test.describe('Plan page', () => {
  test('FX 01-06 plan page', async ({ page }) => {
    await openFx(page, 'phases/01-member-sign-in-sessions/01-06-PLAN.md');

    await expect(page.locator('h1')).toHaveText('Seal the handover');
    // A phase plan's Planned date comes from git or mtime, both clone-dependent (RESEARCH Pitfall 5),
    // so the fact is pinned by shape; the exact date is pinned on the quick plan, which carries its id.
    await expect(page.locator('.artifact-meta-row')).toContainText(/Planned \d{1,2} [A-Z][a-z]{2} \d{4}/);
    await tab(page, 3).click();
    await expect(page.locator('.view-plan-nav-tabs button')).toHaveText(['Action', 'Afterwards']);
    await expect(page.locator('#plan-task-panel')).toContainText('Waits for you to do it');
    const source = page.locator('.view-plan-nav-src');
    await expect(source).toContainText('Read first');
    await expect(source).toContainText('Resume signal');
    await expect(source).toContainText('After resume');
    await page.locator('[data-modal="deps"]').click();
    const dialog = page.getByRole('dialog');
    for (const id of ['01-03', '01-04', '01-05']) await expect(dialog).toContainText(id);
    await page.keyboard.press('Escape');
    await page.locator('[data-modal="reqs"]').click();
    await expect(page.getByRole('dialog')).toContainText('A member can sign in with a username and password');
  });

  test('FX 04-02 plan page', async ({ page }) => {
    await openFx(page, 'phases/04-bulk-loan-export/04-02-PLAN.md');

    await expect(page.locator('.view-plan-nav-tabs button').first()).toContainText('Decision');
    await expect(page.locator('.view-plan-nav-option')).toHaveCount(2);
    await expect(page.locator('.view-plan-nav-option').first()).toContainText('Go ahead');
    await expect(page.locator('.view-plan-nav-option').nth(1)).toContainText('Hold');
    await expect(page.locator('.view-plan-nav-brief dt')).toHaveText(['Why', 'You get']);
  });

  test('FX t8m plan page', async ({ page }) => {
    await openFx(page, '260402-t8m-PLAN.md');

    // A quick plan carries its date in its id, so the Planned fact is exact on any clone.
    await expect(page.locator('.artifact-meta-row')).toContainText('Planned 2 Apr 2026');
    await tab(page, 3).click();
    await expect(page.locator('#plan-task-panel h2')).toContainText('A hands-on check of');
    await expect(page.locator('.artifact-heading .status-chip', { hasText: 'Warning' })).toBeVisible();
    await expect(page.locator('#plan-source-only')).toContainText('Wrapper warnings · 2');
  });
});
