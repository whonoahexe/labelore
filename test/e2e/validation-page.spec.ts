// The VALIDATION strategy page e2e (quick-261003-526, sketch 016 winner A): real corpus files, never
// a fixture mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// uat-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. Every
// test runs against the read-only studio-portal server on port 4198 (playwright.config.ts, present
// only when ~/studio-portal/.planning exists) and skips itself otherwise. This spec asserts the
// foundation sweep's key invariants itself (one h1, an eyebrow, one chip signature, squared corners,
// no 420px overflow) — it does not extend measure.ts — since the full sweep is too slow to run per
// change. It was written in a parallel batch worktree where ports 4199/4198 collide, so it was only
// typechecked there: run it once post-merge on master:
//   npx playwright test test/e2e/validation-page.spec.ts -g "validation page"
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
  if (!response.ok) throw new Error(`validation-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`validation-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

test.describe('VALIDATION strategy page', () => {
  test('SP P2 validation page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'phases/02-roles-permission-enforcement/02-VALIDATION.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('#validation-map').waitFor({ state: 'visible' });

    // Cover: no breadcrumb row, one h1, the eyebrow, the facts and the quiet dims.
    await expect(page.locator('.artifact-breadcrumbs')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Roles permission enforcement');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('Validation strategy · Phase 2');
    const facts = page.locator('.view-validation-facts');
    await expect(facts).toContainText('Draft');
    await expect(facts).toContainText('8 Aug 2026');
    const dims = page.locator('.view-validation-dims');
    await expect(dims).toContainText('Nyquist compliant');
    await expect(dims).toContainText('Wave 0 not complete');

    // The three verdict cells; Show checks expands the checklist in place.
    await expect(page.locator('.view-validation-cell .view-validation-square')).toHaveCount(33);
    const cells = page.locator('.view-validation-cells');
    await expect(cells).toContainText('of 33 green');
    await expect(cells).toContainText('not yet observed');
    await expect(cells).toContainText('of 6 checks');
    await page.getByRole('button', { name: /Show checks/ }).click();
    await expect(page.locator('.view-validation-cover-checks li')).toHaveCount(6);
    await page.getByRole('button', { name: /Hide checks/ }).click();

    // The map: four lanes, 33 tiles, the file strip, and a requirement filter that dims some tiles.
    await expect(page.locator('.view-validation-lane')).toHaveCount(4);
    await expect(page.locator('.view-validation-tile')).toHaveCount(33);
    await expect(page.locator('#validation-map')).toContainText('11 need a file created');
    await page.locator('.view-validation-filter[data-filter="ref"]', { hasText: 'ROLE-07' }).click();
    const dimmed = page.locator('.view-validation-tile[data-dim="true"]');
    expect(await dimmed.count()).toBeGreaterThan(0);
    expect(await dimmed.count()).toBeLessThan(33);
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.locator('.view-validation-tile[data-dim="true"]')).toHaveCount(0);

    // The inspector: a tile shows its command with a copy button; a HUMAN tile jumps to the checks.
    await page.locator('#validation-task-1').click();
    const inspector = page.locator('.view-validation-inspector');
    await expect(inspector).toContainText('cargo test --test authz_enforcement');
    await expect(inspector.getByRole('button', { name: 'Copy command' })).toBeVisible();
    await page.locator('#validation-task-0').click();
    await inspector.getByRole('button', { name: 'See the human checks ↓' }).click();
    await expect.poll(() => inViewport(page, page.locator('#validation-manual'))).toBe(true);

    // Wave 0 is folded and opens to nine items; eleven human cards await a human; the stamp is Pending.
    const wave0 = page.locator('#validation-wave0 .view-validation-wave0-toggle');
    await expect(wave0).toHaveAttribute('aria-expanded', 'false');
    await wave0.click();
    await expect(page.locator('.view-validation-wave0-list li')).toHaveCount(9);
    await expect(page.locator('.view-validation-card')).toHaveCount(11);
    await expect(page.locator('.view-validation-outcome', { hasText: 'Awaiting a human' })).toHaveCount(11);
    await expect(page.locator('.view-validation-stamp')).toContainText('Pending');

    // Source-only: Status legend lands in Source mode at the map heading; View restores the page.
    const strip = page.locator('#validation-source-only');
    await strip.getByRole('button', { name: 'Status legend', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-validation-tile')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Per-Task Verification Map' });
    await expect.poll(() => inViewport(page, heading)).toBe(true);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-validation-tile')).toHaveCount(33);

    // F-05: every status chip on the page measures the same (buttons and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(10);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome (the spec asserts this itself; measure.ts is untouched).
    for (const selector of [
      '.view-validation-tile',
      '.view-validation-inspector',
      '.view-validation-cells',
      '.view-validation-card',
      '.view-validation-stamp',
      '.view-validation-source-only',
    ]) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // 420px, dark: nothing overflows.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#validation-map').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  });

  test('SP P1 and template-only validation pages', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const p1 = await resolveFixtureUrl(SP_BASE_URL, 'phases/01-portal-owned-identity-sessions/01-VALIDATION.md');
    await page.goto(`${SP_BASE_URL}${p1}`);
    await page.locator('#validation-map').waitFor({ state: 'visible' });
    const p1Cells = page.locator('.view-validation-cells');
    await expect(p1Cells).toContainText('12');
    await expect(p1Cells).toContainText('of 13 green');
    await expect(p1Cells).toContainText('3 observed');
    await expect(page.locator('.view-validation-outcome', { hasText: 'Observed · pass' })).toHaveCount(3);
    await expect(page.locator('.view-validation-outcome', { hasText: 'Not observed' })).toHaveCount(1);

    const v103 = await resolveFixtureUrl(SP_BASE_URL, 'v1.0-phases/03-file-browsing/03-VALIDATION.md');
    await page.goto(`${SP_BASE_URL}${v103}`);
    await page.locator('#validation-map').waitFor({ state: 'visible' });
    await expect(page.locator('#validation-map')).toContainText('The map was never filled in.');
    await expect(page.locator('.view-validation-tile')).toHaveCount(0);
    await expect(page.locator('.view-validation-cells')).toContainText('map never filled in');
  });
});
