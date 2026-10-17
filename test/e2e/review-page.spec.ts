// The REVIEW page e2e (quick-261017-k44, sketch 022 winner C): real corpus files, never a fixture
// mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// verification-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping.
// This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow, squared corners,
// one chip signature, no 420px overflow), since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) throw new Error(`review-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`review-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

async function openPage(page: Page, base: string, url: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${base}${url}`);
  await page.locator('.view-review-page').waitFor({ state: 'visible' });
}

const LB01 = 'v1.0-phases/01-read-layer-domain-model/01-REVIEW.md';
const LB04 = 'v1.0-phases/04-portability-degradation-hardening/04-REVIEW.md';
const LB05 = 'v1.1-phases/05-per-type-document-views/05-REVIEW.md';

test.describe('Review page', () => {
  test('LB v1.0/01: the fixed review with its fix report', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, LB01);
    await openPage(page, base, url, 'light');

    // Head and hero.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Read Layer & Domain Model');
    await expect(page.locator('.view-review-meta-left .eyebrow')).toHaveText('Code review · Phase 1');
    await expect(page.locator('.view-review-date')).toContainText('24 Aug 2026 · 01:10');
    await expect(page.locator('.view-review-verdict')).toHaveText('5 of 7 fixed. 2 still in the code.');
    await expect(page.locator('.view-review-sub')).toHaveText('2 not attempted. Reviewed 45 files at standard depth.');
    await expect(page.locator('.view-review-facts')).toContainText('Fix run23 Aug 2026 · iteration 1');
    const tally = page.locator('.view-review-tally > div');
    await expect(tally).toHaveText([/Open\s*0/, /Fixed\s*5/, /Skipped\s*0/, /Not attempted\s*2/]);

    // Threads: six file blocks, five folded rows, two open threads.
    await expect(page.locator('.view-review-file')).toHaveCount(6);
    await expect(page.locator('.view-review-resolved')).toHaveCount(5);
    await expect(page.locator('.view-review-thread')).toHaveCount(2);
    await expect(page.locator('#review-finding-in-01 .view-review-reply')).toContainText('Not attempted');

    // A row unfolds its thread; Fold - puts it back.
    await page.locator('.view-review-resolved', { hasText: 'CR-01' }).click();
    const cr01 = page.locator('#review-finding-cr-01');
    await expect(cr01).toContainText('Fixed in 6efec5a');
    await expect(cr01).toContainText('Suggested change');
    await cr01.getByRole('button', { name: 'Fold −' }).click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(5);

    // The toggle: every fixed thread open, a single one can fold, switching resets.
    const toggle = page.locator('.view-review-toggle');
    await expect(toggle).toHaveText('Show fixed threads (5)');
    await toggle.click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(0);
    await expect(page.locator('.view-review-thread')).toHaveCount(7);
    await page.locator('#review-finding-wr-01').getByRole('button', { name: 'Fold −' }).click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(1);
    await toggle.click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(5);
    await toggle.click();
    await expect(page.locator('.view-review-resolved')).toHaveCount(0);

    // The files list: 46 rows, Escape closes it.
    await page.locator('.view-review-also').getByRole('button', { name: 'Files reviewed · 45' }).click();
    const modal = page.locator('.view-review-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.view-review-modal-row')).toHaveCount(46);
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);

    // Full summary opens Source at the Summary heading; View returns.
    await page.getByRole('button', { name: 'Full summary ↗' }).click();
    await expect(page.locator('.view-review-page')).toHaveCount(0);
    const hit = page.locator('[data-source-hit="true"]');
    await expect(hit).toHaveCount(1);
    await expect(hit).toContainText('Summary');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-review-page')).toBeVisible();

    // F-05: every status chip on the page measures the same.
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(5);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the file blocks, tally, quote, stamps and resolved rows.
    const radii = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '.view-review-file, .view-review-tally, .view-review-quote, .view-review-stamp, .view-review-resolved, .view-review-thread',
        ),
      ).map((el) => getComputedStyle(el).borderTopLeftRadius),
    );
    expect(radii.length).toBeGreaterThan(10);
    expect(radii.every((r) => r === '0px')).toBe(true);
  });

  test('LB v1.0/01: the fix report chip opens the REVIEW-FIX page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, LB01);
    await openPage(page, base, url, 'light');
    await page.locator('.view-review-also').getByRole('link', { name: 'Fix report · All fixed' }).click();
    await expect(page).toHaveURL(/01-REVIEW-FIX\.md/);
  });

  test('LB v1.1/05: the small review with no fix report', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, LB05);
    await openPage(page, base, url, 'dark');
    await expect(page.locator('h1')).toHaveText('Per-Type Document Views');
    await expect(page.locator('.view-review-verdict')).toHaveText('3 findings. None fixed yet.');
    await expect(page.locator('.view-review-tally > div')).toHaveText([/Critical\s*0/, /Warning\s*1/, /Info\s*2/, /Total\s*3/]);
    await expect(page.locator('.view-review-file')).toHaveCount(3);
    await expect(page.locator('.view-review-toggle')).toHaveCount(0);
    const wr01 = page.locator('#review-finding-wr-01');
    await expect(wr01.locator('.view-review-gutter')).toHaveText('L56');
    await expect(wr01.locator('.view-review-reply')).toContainText('No reply yet');

    // The quiet files expand from 14 to all 39.
    await expect(page.locator('.view-review-quiet-files code')).toHaveCount(14);
    await page.getByRole('button', { name: '+25 more' }).click();
    await expect(page.locator('.view-review-quiet-files code')).toHaveCount(39);

    // Source mode is the plain page; View returns.
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    await expect(page.locator('.view-review-page')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-review-page')).toBeVisible();
  });

  test('LB v1.0/04: criticals lead and the empty narrative container adds no chip', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, LB04);
    await openPage(page, base, url, 'light');
    await expect(page.locator('h1')).toHaveText('Portability & Degradation Hardening');
    await expect(page.locator('.view-review-verdict')).toHaveText('5 findings, 2 critical. None fixed yet.');
    await expect(page.locator('.view-review-also')).not.toContainText('Narrative Findings');
    await expect(page.locator('.view-review-file').first().locator('code').first()).toHaveText('src/server/index.ts');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every review page fits 420px in ${theme}`, async ({ page, baseURL }) => {
      const base = baseURL ?? 'http://127.0.0.1:4199';
      const response = await fetch(`${base}/api/presentation`);
      const data = (await response.json()) as PresentationLite;
      const keys = data.artifacts
        .filter((a) => a.path.endsWith('-REVIEW.md') && !a.path.endsWith('-UI-REVIEW.md') && !a.path.includes('sketches'))
        .map((a) => a.key);
      expect(keys.length).toBeGreaterThanOrEqual(5);
      await page.setViewportSize({ width: 420, height: 900 });
      for (const key of keys) {
        await openPage(page, base, key, theme);
        await expect(page.locator('h1')).toHaveCount(1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, key).toBeLessThanOrEqual(0);
      }
    });
  }
});
