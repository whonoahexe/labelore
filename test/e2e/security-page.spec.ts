// The SECURITY console e2e (quick-261003-527, sketch 017 winner D): real corpus files, never a
// fixture mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// uat-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. The
// labelore v1.1/05 test always runs; the studio-portal test runs against the read-only server on
// port 4198 (playwright.config.ts, present only when ~/studio-portal/.planning exists) and skips
// itself otherwise. This spec asserts the foundation sweep's key invariants itself (one h1, an
// eyebrow, squared corners, one chip signature, no 420px overflow), since the full sweep is too
// slow to run per change. Run once post-merge: npx playwright test test/e2e/security-page.spec.ts -g "security page"
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
  if (!response.ok) throw new Error(`security-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`security-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

test.describe('SECURITY page', () => {
  test('LB v1.1/05 security page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, 'v1.1-phases/05-per-type-document-views/05-SECURITY.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('.view-security-board').waitFor({ state: 'visible' });

    // Rail: identity, facts and gauge.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Per type document views');
    await expect(page.locator('.view-security-identity .eyebrow')).toHaveText('Security · Phase 5');
    const facts = page.locator('.view-security-facts');
    await expect(facts).toContainText('Verified');
    await expect(facts).toContainText('21 Sep 2026');
    await expect(facts).toContainText('Level 1');
    await expect(facts).toContainText('high+');
    const gauge = page.locator('.view-security-gauge');
    await expect(gauge.locator('.view-security-gauge-n')).toHaveText('0');
    await expect(gauge).toContainText('1 below high, non-blocking');
    await expect(gauge).toContainText('18 of 19 closed');

    // Board: one square per threat, exactly one non-blocking open.
    await expect(page.locator('.view-security-square')).toHaveCount(19);
    const openSquare = page.locator('.view-security-square[data-tone="in-flight"]');
    await expect(openSquare).toHaveCount(1);
    await expect(page.locator('#security-detail')).toContainText('Pick a square');
    await openSquare.click();
    await expect(page.locator('#security-detail')).toContainText('T-05-11');

    // Waiver ledger: the ref picks its square and brings the panel into view; the panel's risk
    // button brings the waiver row into view and flashes it.
    await page.locator('#security-waivers').getByRole('button', { name: 'T-05-03', exact: true }).click();
    await expect(page.locator('.view-security-square[data-threat="T-05-03"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => inViewport(page, page.locator('#security-detail'))).toBe(true);
    await page.locator('#security-detail').getByRole('button', { name: /R-05-01/ }).click();
    const waiver = page.locator('#security-risk-R-05-01');
    await expect.poll(() => inViewport(page, waiver)).toBe(true);
    await expect(waiver).toHaveAttribute('data-flash', 'true');

    // Trust boundaries: eight single-crossing destinations gather into one list block, none toned.
    await expect(page.locator('.view-security-dest')).toHaveCount(1);
    await expect(page.locator('.view-security-dest')).toContainText('Crossings');
    await expect(page.locator('.view-security-crossing')).toHaveCount(8);
    await expect(page.locator('.view-security-from[data-tone="in-flight"]')).toHaveCount(0);

    // Audit trail: absent until the switch is on, then one run and its note.
    await expect(page.locator('#security-audit')).toHaveCount(0);
    await page.getByRole('switch').click();
    await expect(page.locator('#security-audit')).toBeVisible();
    await expect(page.locator('.view-security-run')).toHaveCount(1);
    await expect(page.locator('#security-audit')).toContainText('Audit notes');

    // F-05: every status chip on the page measures the same (buttons and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(2);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome.
    for (const selector of [
      '.view-security-rail',
      '.view-security-gauge',
      '.view-security-square',
      '.view-security-detail',
      '.view-security-waiver',
      '.view-security-dest',
      '.view-security-source-only',
    ]) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // The source-only strip: Frontmatter lands in Source mode; View restores the console.
    const strip = page.locator('#security-source-only');
    await expect(strip.getByRole('button', { name: 'Frontmatter', exact: true })).toBeVisible();
    await strip.getByRole('button', { name: 'Frontmatter', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.artifact-heading h1')).toHaveCount(1);
    await expect(page.locator('.view-security-console')).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-security-square')).toHaveCount(19);

    // 420px, dark: the rail sits above the board and nothing overflows.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('.view-security-board').waitFor({ state: 'visible' });
    const rail = await page.locator('.view-security-rail').boundingBox();
    const board = await page.locator('.view-security-board-wrap').boundingBox();
    expect(rail).not.toBeNull();
    expect(board).not.toBeNull();
    expect((rail?.y ?? 0) + (rail?.height ?? 0)).toBeLessThanOrEqual((board?.y ?? 0) + 1);
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      mainScroll: (document.querySelector('main') as HTMLElement).scrollWidth,
      mainClient: (document.querySelector('main') as HTMLElement).clientWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
    expect(layout.mainScroll).toBeLessThanOrEqual(layout.mainClient + 1);
  });

  test('SP P1 security page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, '/phases/01-portal-owned-identity-sessions/01-SECURITY.md');
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('.view-security-board').waitFor({ state: 'visible' });

    // Trust boundaries: Backend (2 ways in), the six single crossings, then the at-rest block.
    const dests = page.locator('.view-security-dest');
    await expect(dests).toHaveCount(3);
    await expect(dests.first()).toContainText('Backend');
    await expect(dests.first()).toContainText('2 ways in');
    await expect(dests.nth(1)).toContainText('Other crossings');
    await expect(dests.nth(1).locator('.view-security-crossing')).toHaveCount(6);
    await expect(dests.last()).toContainText('At rest / in-process');
    await expect(page.locator('.view-security-from[data-tone="in-flight"]')).toHaveCount(1);

    // Residual observations: closed by default, three items when opened.
    const toggle = page.getByRole('button', { name: /Residual observations · 3/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.view-security-residual')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.view-security-residual')).toHaveCount(3);

    // The ref chip picks the threat's square and brings the detail panel into view.
    await page.locator('#security-residuals').getByRole('button', { name: 'T-01-07', exact: true }).click();
    await expect(page.locator('.view-security-square[data-threat="T-01-07"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => inViewport(page, page.locator('#security-detail'))).toBe(true);
    await expect(page.locator('#security-detail')).toContainText('1 residual observation');

    // Closing the toggle removes the items; the detail's link reopens it and flashes the first.
    await toggle.click();
    await expect(page.locator('.view-security-residual')).toHaveCount(0);
    await page.locator('#security-detail').getByRole('button', { name: /1 residual observation/ }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const first = page.locator('#security-residual-0');
    await expect.poll(() => inViewport(page, first)).toBe(true);
    await expect(first).toHaveAttribute('data-flash', 'true');

    for (const selector of ['.view-security-dest', '.view-security-residuals-toggle']) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }
  });

  test('SP P3 security page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, '/phases/03-account-administration-session-control/03-SECURITY.md');
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('.view-security-board').waitFor({ state: 'visible' });

    await expect(page.locator('.view-security-square')).toHaveCount(42);
    await expect(page.locator('.view-security-square[data-accepted="true"]')).toHaveCount(11);
    await expect(page.locator('.view-security-waiver')).toHaveCount(11);
    await expect(page.locator('.view-security-gauge')).toContainText('nothing blocking');
    await expect(page.locator('.view-security-stamp')).toContainText('Signed off');
    // Ten single-crossing destinations gather into one "Crossings · 10" block, one source toned.
    await expect(page.locator('.view-security-dest')).toHaveCount(1);
    await expect(page.locator('.view-security-dest')).toContainText('Crossings · 10');
    await expect(page.locator('.view-security-from[data-tone="in-flight"]')).toHaveCount(1);
  });
});
