// The REVIEW page e2e (quick-261017-k44, sketch 022 winner C): made-up Lendshed files, never a
// mock. Fixtures resolve by path against the project's live presentation payload (the
// verification-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping.
// This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow, squared corners,
// one chip signature, no 420px overflow), since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { artifactUrl, exactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';
import { expectLandedOn, watchSourceHits } from './source-landing.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`review-page.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`review-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

async function openPage(page: Page, base: string, path: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(await artifactUrl(base, path));
  await page.locator('.view-review-page').waitFor({ state: 'visible' });
}

const FX01 = 'phases/01-member-sign-in-sessions/01-REVIEW.md';
const FX01_FIX = 'phases/01-member-sign-in-sessions/01-REVIEW-FIX.md';
const FX_CATALOGUE = 'milestones/v1.0-phases/03-catalogue-browsing/03-REVIEW.md';

test.describe('Review page', () => {
  test('Lendshed phase 1: the partly fixed review with its fix report', async ({ page }) => {
    const base = FIXTURE_BASE_URL;
    const path = await resolveFixturePath(base, FX01);
    await openPage(page, base, path, 'light');

    // Head and hero.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Member Sign-In & Sessions');
    await expect(page.locator('.view-review-meta-left .eyebrow')).toHaveText('Code review · Phase 1');
    await expect(page.locator('.view-review-date')).toContainText('26 Mar 2026');
    await expect(page.locator('.view-review-verdict')).toHaveText('2 of 5 fixed. 3 still in the code.');
    const tally = page.locator('.view-review-tally > div');
    await expect(tally).toHaveText([/Open\s*0/, /Fixed\s*2/, /Skipped\s*3/, /Not attempted\s*0/]);

    // Threads: the two fixed findings fold, the three skipped ones stay open.
    await expect(page.locator('.view-review-resolved')).toHaveCount(2);
    await expect(page.locator('.view-review-thread')).toHaveCount(3);

    // A row unfolds its thread; Fold - puts it back.
    await page.locator('.view-review-resolved', { hasText: 'CR-01' }).click();
    const cr01 = page.locator('#review-finding-cr-01');
    await expect(cr01).toContainText('Fixed in');
    await cr01.getByRole('button', { name: 'Fold −' }).click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(2);

    // The toggle: every fixed thread open, a single one can fold, switching resets.
    const toggle = page.locator('.view-review-toggle');
    await expect(toggle).toHaveText('Show fixed threads (2)');
    await toggle.click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(0);
    await expect(page.locator('.view-review-thread')).toHaveCount(5);
    await page.locator('#review-finding-wr-01').getByRole('button', { name: 'Fold −' }).click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(1);
    await toggle.click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(2);
    await toggle.click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(0);

    // The files list opens and Escape closes it.
    await page.locator('.view-review-also').getByRole('button', { name: /^Files reviewed · \d+$/ }).click();
    const modal = page.locator('.view-review-modal');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);

    // Full summary opens the raw Source reader at the Summary heading's row; View returns.
    await watchSourceHits(page);
    await page.getByRole('button', { name: 'Full summary ↗' }).click();
    await expect(page.locator('.view-review-page')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Source of 01-REVIEW.md' })).toBeVisible();
    await expectLandedOn(page, '## Summary');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-review-page')).toBeVisible();

    // F-05: every status chip on the page measures the same.
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(3);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the file blocks, tally, quote, stamps and resolved rows.
    const radii = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '.view-review-file, .view-review-tally, .view-review-quote, .view-review-stamp, .view-review-resolved, .view-review-thread',
        ),
      ).map((el) => getComputedStyle(el).borderTopLeftRadius),
    );
    expect(radii.length).toBeGreaterThan(5);
    expect(radii.every((r) => r === '0px')).toBe(true);
  });

  test('Lendshed phase 1: the fix report chip opens the REVIEW-FIX page', async ({ page }) => {
    const base = FIXTURE_BASE_URL;
    const path = await resolveFixturePath(base, FX01);
    await openPage(page, base, path, 'light');
    const fixUrl = await artifactUrl(base, await resolveFixturePath(base, FX01_FIX));
    await page.locator('.view-review-also').getByRole('link', { name: 'Fix report · Partial' }).click();
    await expect(page).toHaveURL(exactUrl(fixUrl));
  });

  test('Lendshed v1.0/03: the large review with no fix report, criticals first', async ({ page }) => {
    const base = FIXTURE_BASE_URL;
    const path = await resolveFixturePath(base, FX_CATALOGUE);
    await openPage(page, base, path, 'dark');
    await expect(page.locator('.view-review-verdict')).toHaveText('26 findings, 4 critical. None fixed yet.');
    await expect(page.locator('.view-review-tally > div')).toHaveText([/Critical\s*4/, /Warning\s*15/, /Info\s*7/, /Total\s*26/]);
    await expect(page.locator('.view-review-file')).toHaveCount(12);
    await expect(page.locator('.view-review-toggle')).toHaveCount(0);
    await expect(page.locator('.view-review-file').first().locator('code').first()).toHaveText(/boundary\.ts$/);
    await expect(page.locator('.view-review-also')).not.toContainText('Narrative Findings');

    // Source mode is the plain page; View returns.
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    await expect(page.locator('.view-review-page')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-review-page')).toBeVisible();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every review page fits 420px in ${theme}`, async ({ page }) => {
      const base = FIXTURE_BASE_URL;
      const response = await fetch(await projectApiUrl(base, '/presentation'));
      const data = (await response.json()) as PresentationLite;
      const paths = data.artifacts
        .filter((a) => a.path.endsWith('-REVIEW.md') && !a.path.endsWith('-UI-REVIEW.md') && !a.path.includes('sketches'))
        .map((a) => a.path);
      // At least seven REVIEW files sit under the Lendshed fixture.
      expect(paths.length).toBeGreaterThanOrEqual(7);
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
