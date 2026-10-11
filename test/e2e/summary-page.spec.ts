// The SUMMARY page e2e (quick-261006-iz7, sketch 020 winner D): real corpus files, never a fixture
// mock. Fixtures resolve by path against the live `/api/presentation` payload (the uat-page.spec.ts
// idiom) so an archival/rename fails loudly instead of silently skipping. The labelore tests run on
// port 4199; the studio-portal tests run against the read-only server on port 4198
// (playwright.config.ts, present only when ~/studio-portal/.planning exists) and skip themselves
// otherwise. This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow,
// squared corners, one chip signature, no 420px overflow), since the full sweep is too slow to run
// per change. Run once post-merge: npx playwright test test/e2e/summary-page.spec.ts -g "summary page"
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
  if (!response.ok) throw new Error(`summary-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`summary-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

async function openPage(page: Page, base: string, url: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${base}${url}`);
  await page.locator('.view-summary-head').waitFor({ state: 'visible' });
}

async function openRequirements(page: Page): Promise<void> {
  await page.locator('.view-summary-triggers > button', { hasText: 'Requirements' }).click();
  await page.locator('.view-summary-modal').waitFor({ state: 'visible' });
}

test.describe('Summary page', () => {
  test('LB v1.1/05-01 summary page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '05-per-type-document-views/05-01-SUMMARY.md');
    await openPage(page, base, url, 'light');

    // Header.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Discussion-log view, section-projection extractor, view registry');
    await expect(page.locator('.view-summary-meta .eyebrow')).toHaveText('Summary · Phase 5 · Per type document views');
    await expect(page.locator('.view-summary-date')).toContainText('Completed 20 Sep 2026');
    const metrics = page.locator('.view-summary-metrics');
    await expect(metrics).toContainText('Complete');
    await expect(metrics).toContainText('26min');
    await expect(metrics).toContainText('20:34');
    await expect(metrics.locator('.status-chip', { hasText: 'Type: UI' })).toBeVisible();
    await expect(metrics.locator('.status-chip', { hasText: 'Self-check passed' })).toBeVisible();
    const triggers = page.locator('.view-summary-trigger');
    await expect(triggers.nth(0)).toContainText('Tasks 2');
    await expect(triggers.nth(1)).toContainText('Files 15');
    await expect(triggers.nth(2)).toContainText('Requirements 3');

    // Outcome: five rows, the count line, and a pill that jumps to its Proof row.
    await expect(page.locator('.view-summary-row')).toHaveCount(5);
    const count = page.locator('.view-summary-count');
    await expect(count).toContainText('5');
    await expect(count).toContainText('things shipped');
    await expect(count).toContainText('3 deliverables proven');
    await expect(count).toContainText('1 need a human');
    await page.locator('.view-summary-row').nth(2).locator('.view-summary-pill', { hasText: 'D3' }).click();
    await expect.poll(() => inViewport(page, page.locator('#summary-proof-D3'))).toBe(true);

    // Timeline and Proof.
    await expect(page.locator('.view-summary-stop')).toHaveCount(4);
    await expect(page.locator('.view-summary-went')).toContainText('Went to plan.');
    await expect(page.locator('.view-summary-proof-frame tbody tr')).toHaveCount(3);

    // The Requirements modal: hover an ID for its preview, Escape closes the preview, keyboard focus opens one.
    await openRequirements(page);
    await page.locator('.view-summary-req', { hasText: 'VIEW-01' }).hover();
    const preview = page.locator('.reference-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('undifferentiated reader');
    await expect(preview).toContainText('.planning/milestones/v1.1-REQUIREMENTS.md');
    await expect(preview).toContainText('Phase 5');
    await expect(preview.getByRole('link', { name: 'Open' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(preview).toHaveCount(0);
    await page.locator('.view-summary-req', { hasText: 'UI-06' }).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('.view-summary-req', { hasText: 'UI-06' })).toBeFocused();
    await expect(page.locator('.reference-preview h2')).toHaveText('UI-06');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.locator('.view-summary-modal')).toHaveCount(0);

    // "In the source only": Performance lands in Source mode with its heading in view; View restores.
    const strip = page.locator('#summary-source-only');
    await strip.getByRole('button', { name: 'Performance', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-summary-head')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Performance' });
    await expect.poll(() => inViewport(page, heading)).toBe(true);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-summary-row')).toHaveCount(5);

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
      '.view-summary-trigger',
      '.view-summary-metrics',
      '.view-summary-pill',
      '.view-summary-proof-frame',
      '.view-summary-detail-box',
      '#summary-source-only .status-chip',
    ]) {
      const radii = await page.locator(selector).evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // 420px, dark: nothing overflows.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('.view-summary-head').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  });

  test('SP 01-01 summary page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'phases/01-portal-owned-identity-sessions/01-01-SUMMARY.md');
    await openPage(page, SP_BASE_URL, url, 'light');

    await expect(page.locator('h1')).toHaveText('Portal-Owned Password Sessions');
    // Five deviation margin cards: four under Task 1 and one under Task 3.
    const stops = page.locator('.view-summary-stop[data-kind="task"]');
    await expect(stops).toHaveCount(3);
    await expect(stops.nth(0).locator('.view-summary-fix')).toHaveCount(4);
    await expect(stops.nth(1).locator('.view-summary-fix')).toHaveCount(0);
    await expect(stops.nth(2).locator('.view-summary-fix')).toHaveCount(1);
    await expect(page.locator('.view-summary-added')).toContainText('New dependencies · 6');

    await openRequirements(page);
    await page.locator('.view-summary-req', { hasText: 'AUTH-01' }).hover();
    await expect(page.locator('.reference-preview')).toContainText('Phase 1 — Portal-Owned Identity & Sessions');
  });

  test('SP 04-06 summary page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'phases/04-bulk-archive-downloads/04-06-SUMMARY.md');
    await openPage(page, SP_BASE_URL, url, 'light');

    await expect(page.locator('.view-summary-metrics')).toContainText('Awaiting checkpoint');
    await expect(page.locator('.view-summary-outcome')).toHaveCount(0);
    await expect(page.locator('.view-summary-triggers > button', { hasText: 'Requirements' })).toContainText('+4 pending');
    const waits = page.locator('.view-summary-waits details');
    await expect(waits).toHaveCount(1);
    await expect(waits.first()).toContainText('Task 3 — Pending Human Verification');
    expect(await waits.first().evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
    await expect(page.locator('.view-summary-stop[data-kind="wait"]')).toHaveCount(1);
  });

  test('LB quick 3us summary page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '260922-3us-SUMMARY.md');
    await openPage(page, base, url, 'light');

    await expect(page.locator('.view-summary-meta .eyebrow')).toHaveText('Quick summary · 260922-3us');
    await expect(page.locator('.view-summary-trigger').nth(0)).toContainText('Tasks 3');
    await page.locator('.view-summary-trigger').nth(0).click();
    await expect(page.locator('.view-summary-modal .view-summary-modal-row')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await openRequirements(page);
    await page.locator('.view-summary-req', { hasText: 'B3-01' }).hover();
    await expect(page.locator('.reference-preview')).toContainText("Not in this project's requirements files.");
    await expect(page.locator('.reference-preview')).toContainText('Complete in this summary');
    await expect(page.locator('.reference-preview').getByRole('link', { name: 'Open' })).toHaveCount(0);
  });
});
