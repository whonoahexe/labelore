// The UI-REVIEW scorecard e2e (quick-261003-528, sketch 018 winner B): real corpus files, never a
// fixture mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// uat-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. The
// labelore tests run on port 4199; the studio-portal test runs against the read-only server on port
// 4198 (playwright.config.ts, present only when ~/studio-portal/.planning exists) and skips itself
// otherwise. This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow,
// squared corners, one chip signature, no 420px overflow), since the full sweep is too slow to run
// per change. Run once post-merge: npx playwright test test/e2e/ui-review-page.spec.ts -g "ui-review page"
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
  if (!response.ok) throw new Error(`ui-review-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`ui-review-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

async function openPage(page: Page, url: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(url);
  await page.locator('#ui-review-inspector').waitFor({ state: 'visible' });
}

test.describe('UI review page', () => {
  test('LB v1.1/05 ui-review page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '05-per-type-document-views/05-UI-REVIEW.md');
    await openPage(page, url, 'light');

    // Header and page invariants.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Per type document views');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('UI Review · Phase 5');
    const facts = page.locator('.view-ui-review-facts');
    await expect(facts).toContainText('21 Sep 2026');
    await expect(facts).toContainText('3');

    // Radar, verdict, pins and method chips.
    await expect(page.locator('.view-ui-review-label')).toHaveCount(6);
    const side = page.locator('.view-ui-review-side');
    await expect(side).toContainText('2 points lost, in Color and Experience Design.');
    await expect(side).toContainText('3 fixes asked for.');
    await expect(page.locator('.view-ui-review-pin')).toHaveCount(3);
    await expect(side.locator('.status-chip', { hasText: 'Seen in a browser' })).toBeVisible();
    await expect(side.getByRole('link', { name: 'Against UI-SPEC.md' })).toBeVisible();

    // Tabs open on the worst pillar; the inspector shows its found card and fix card.
    await expect(page.locator('.view-ui-review-tab')).toHaveCount(6);
    await expect(page.locator('.view-ui-review-tab[aria-selected="true"]')).toContainText('Color');
    const inspector = page.locator('#ui-review-inspector');
    await expect(inspector.locator('h2')).toContainText('Color');
    await expect(inspector.locator('.view-ui-review-found-card')).toHaveCount(1);
    // Squared corners on the found card, checked here while Color (the only pillar with one) is open.
    expect(await inspector.locator('.view-ui-review-found-card').evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');
    await expect(inspector.locator('#ui-review-fix-1')).toBeVisible();

    // ← → step through the pillars.
    await page.locator('body').press('ArrowRight');
    await expect(inspector.locator('h2')).toContainText('Typography');
    await page.locator('body').press('ArrowLeft');
    await expect(inspector.locator('h2')).toContainText('Color');

    // A fix pin opens its pillar, brings the card into view and highlights it.
    await page.locator('.view-ui-review-pin[data-fixpin="3"]').click();
    await expect(inspector.locator('h2')).toContainText('Visuals');
    const card = page.locator('#ui-review-fix-3');
    await expect.poll(() => inViewport(page, card)).toBe(true);
    await expect(card).toHaveAttribute('data-highlight', 'true');
    const pin3 = page.locator('.view-ui-review-pin[data-fixpin="3"]');
    await expect(pin3).toHaveAttribute('aria-pressed', 'true');
    // Pressing the same pin again clears it.
    await pin3.click();
    await expect(pin3).toHaveAttribute('aria-pressed', 'false');
    await expect(card).not.toHaveAttribute('data-highlight', 'true');

    // Back matter: three folded sections.
    const back = page.locator('.view-ui-review-back details');
    await expect(back).toHaveCount(3);
    expect(await back.evaluateAll((els) => els.every((el) => !(el as HTMLDetailsElement).open))).toBe(true);

    // F-05: every status chip on the page measures the same (buttons, links and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(4);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome.
    for (const selector of [
      '.view-ui-review-tab',
      '.view-ui-review-pin',
      '.view-ui-review-fixcard',
      '#ui-review-source-only .status-chip',
    ]) {
      const radii = await page.locator(selector).evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // The source-only strip: three buttons; the scores table lands in Source mode at its heading.
    const strip = page.locator('#ui-review-source-only');
    await expect(strip.getByRole('button')).toHaveCount(3);
    await expect(strip.getByRole('button', { name: 'Frontmatter', exact: true })).toBeVisible();
    await expect(strip.getByRole('button', { name: 'Audit method notes', exact: true })).toBeVisible();
    await strip.getByRole('button', { name: 'Pillar Scores table', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-ui-review-tab')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Pillar Scores' });
    await expect.poll(() => inViewport(page, heading)).toBe(true);

    // Back to View restores the page.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-ui-review-tab')).toHaveCount(6);

    // 420px, dark: nothing overflows.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#ui-review-inspector').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  });

  test('LB v1.0/03 ui-review page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '03-search-browsing-traceability/03-UI-REVIEW.md');
    await openPage(page, url, 'light');

    const side = page.locator('.view-ui-review-side');
    await expect(side).toContainText('Full marks. Nothing to fix.');
    await expect(side.locator('.status-chip', { hasText: 'Code only · not seen in a browser' })).toBeVisible();
    await expect(side.locator('.status-chip', { hasText: 'Supersedes 2 reviews' })).toBeVisible();
    await expect(page.locator('.view-ui-review-bar')).toHaveCount(3);
    await expect(page.locator('.view-ui-review-tab[aria-selected="true"]')).toContainText('Copywriting');
    await expect(page.locator('#ui-review-inspector')).toContainText('Nothing found — every check held.');
  });

  test('SP 03 ui-review page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'phases/03-account-administration-session-control/03-UI-REVIEW.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('#ui-review-inspector').waitFor({ state: 'visible' });

    await expect(page.locator('h1')).toHaveText('Account administration session control');
    await expect(page.locator('.view-ui-review-pin')).toHaveCount(2);
    await expect(page.locator('.view-ui-review-side')).not.toContainText('No third fix');
    await expect(page.locator('.view-ui-review-tab[aria-selected="true"]')).toContainText('Typography');
    const inspector = page.locator('#ui-review-inspector');
    await expect(inspector.locator('.view-ui-review-found-card')).toHaveCount(1);
    await expect(inspector.locator('#ui-review-fix-1')).toBeVisible();
    await expect(inspector.locator('.view-ui-review-ref', { hasText: 'destructive-confirm-dialog.tsx:182' })).toBeVisible();
  });
});
