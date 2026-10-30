// The VERIFICATION page e2e (quick-261017-18a, sketch 021 winner E): real corpus files, never a
// fixture mock. Fixtures resolve by path against the project's live presentation payload (the
// summary-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. This
// spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow, squared corners, one
// chip signature, no 420px overflow), since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { BASE_URL, artifactUrl, projectApiUrl } from './app-url.ts';
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

async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

async function openPage(page: Page, base: string, path: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(await artifactUrl(base, path));
  await page.locator('.view-verification-rail').waitFor({ state: 'visible' });
}

const stat = (page: Page, label: string): Locator =>
  page.locator('.view-verification-stat', { hasText: label }).first();

test.describe('Verification page', () => {
  test('LB v1.1/05 verification page', async ({ page, baseURL }) => {
    const base = baseURL ?? BASE_URL;
    const path = await resolveFixturePath(base, 'v1.1-phases/05-per-type-document-views/05-VERIFICATION.md');
    await openPage(page, base, path, 'light');

    // Rail.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Per-Type Document Views');
    await expect(page.locator('.view-verification-identity .eyebrow')).toHaveText('Verification · Phase 5');
    await expect(page.locator('.view-verification-facts .status-chip')).toHaveText('Passed');
    await expect(page.locator('.view-verification-facts')).toContainText('20 Sep 2026 · 20:46');
    await expect(page.locator('.view-verification-big-number')).toHaveText('5/7');
    await expect(page.locator('.view-verification-big-sub')).toHaveText('4 human checks recorded');
    await expect(stat(page, 'Truths')).toContainText('5/7');
    await expect(stat(page, 'Requirements')).toContainText('10/11');
    await expect(stat(page, 'Anti-patterns')).toContainText('0 blocking · 3');
    await expect(stat(page, 'Spot-checks')).toContainText('10 ✓ · 0 ✗ · 2 skip');
    await expect(stat(page, 'Approach')).toContainText('Initial verification');

    // The calm ledger.
    await expect(page.locator('#verification-gaps .view-verification-empty')).toHaveText('No blocking gaps.');

    // The Spot-checks stat opens a 12-row dialog; Escape closes it.
    await stat(page, 'Spot-checks').click();
    const modal = page.locator('.view-verification-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.view-verification-spot')).toHaveCount(12);
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);

    // The first slip scrolls step 1 into view.
    await page.locator('.view-verification-slip').first().click();
    await expect.poll(() => inViewport(page, page.locator('#verification-check-1'))).toBe(true);
    await expect(page.locator('.view-verification-step')).toHaveCount(4);
    await expect(page.locator('#verification-human h2')).toHaveText('Needs a person first');

    // A truth square opens its inspector.
    await page.locator('.view-verification-square', { hasText: /^4b$/ }).click();
    const inspector = page.locator('#verification-truths .view-verification-inspector');
    await expect(inspector).toContainText('Built, behaviour unchecked');
    await expect(inspector).toContainText('To check it');
    await inspector.getByRole('button', { name: 'Close ×' }).click();
    await expect(inspector).toHaveCount(0);

    // A requirement square opens its description.
    await page.locator('.view-verification-square', { hasText: /^READ-07$/ }).click();
    await expect(page.locator('#verification-requirements .view-verification-inspector')).toContainText(
      'TOC tracks position, legible at every width',
    );

    // Also in this report: a chip opens its heading in Source mode; View returns to the rail.
    await page.locator('#verification-also').getByRole('button', { name: 'Required Artifacts', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-verification-rail')).toHaveCount(0);
    await expect(page.locator('.document-cover')).toHaveCount(0);
    await expect(page.locator('main h1')).toHaveCount(1);
    const hit = page.locator('[data-source-hit]');
    await expect(hit).toHaveCount(1);
    await expect(hit).toContainText('Required Artifacts');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-verification-rail')).toBeVisible();

    // F-05: every status chip on the page measures the same.
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the rail, frame, squares and boards.
    const radii = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '.view-verification-rail, .view-verification-big, .view-verification-square, .view-verification-board, .view-verification-step, .view-verification-slip',
        ),
      ).map((el) => getComputedStyle(el).borderTopLeftRadius),
    );
    expect(radii.length).toBeGreaterThan(5);
    expect(radii.every((r) => r === '0px')).toBe(true);
  });

  test('Lendshed v1.0/04 passed with one frontmatter gap', async ({ page }) => {
    const path = await resolveFixturePath(FIXTURE_BASE_URL, 'v1.0-phases/04-shed-to-shed-transfers/04-VERIFICATION.md');
    await openPage(page, FIXTURE_BASE_URL, path, 'light');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.view-verification-identity .eyebrow')).toHaveText('Verification · Phase 4');
    await expect(page.locator('.view-verification-facts .status-chip')).toHaveText('Passed');
    await expect(page.locator('.view-verification-gap')).toHaveCount(1);
    await expect(page.locator('#verification-gap-c1')).toBeVisible();
  });

  test('LB v1.0/01 resolved checks', async ({ page, baseURL }) => {
    const base = baseURL ?? BASE_URL;
    const path = await resolveFixturePath(base, 'v1.0-phases/01-read-layer-domain-model/01-VERIFICATION.md');
    await openPage(page, base, path, 'light');
    await expect(page.locator('#verification-human h2')).toHaveText('Checked by a person');
    await expect(page.locator('.view-verification-resolved')).toContainText('Resolved · 01-UAT.md (23/23 pass, 0 issues)');
    await expect(page.locator('.view-verification-slip')).toHaveCount(0);
  });

  test('LB quick 260923-lju verification page', async ({ page, baseURL }) => {
    const base = baseURL ?? BASE_URL;
    const path = await resolveFixturePath(base, '260923-lju-VERIFICATION.md');
    await openPage(page, base, path, 'light');
    await expect(page.locator('.view-verification-identity .eyebrow')).toHaveText('Quick verification · 260923-lju');
    await expect(page.locator('.view-verification-big-number')).toHaveText('2');
    await expect(page.locator('.view-verification-big-label')).toHaveText('checks left for a person');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every verification page fits 420px in ${theme}`, async ({ page, baseURL }) => {
      const base = baseURL ?? BASE_URL;
      const response = await fetch(await projectApiUrl(base, '/presentation'));
      const data = (await response.json()) as PresentationLite;
      const paths = data.artifacts.filter((a) => a.path.endsWith('VERIFICATION.md') && !a.path.includes('sketches')).map((a) => a.path);
      expect(paths.length).toBeGreaterThanOrEqual(12);
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
