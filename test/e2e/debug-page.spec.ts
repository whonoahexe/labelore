// The DEBUG page e2e (quick-261018-j5h, sketch 023 A). The spec starts a read-only server on a thin temp
// project (ports 5310-5319 only, see fixture-server.ts) holding the synthetic investigating session,
// labelore's own resolved session and knowledge base and the four made-up Lendshed sessions - every
// placement is an in-repo file, so every page below is asserted, never skipped - and resolves each page
// by path against its live `/api/presentation` payload.
// It asserts the foundation sweep's key invariants itself (one h1, squared corners, one chip signature,
// no 420px overflow) since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { startFixtureServer } from './fixture-server.ts';
import type { FixtureServer } from './fixture-server.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

const LENDSHED_DEBUG = 'test/fixtures/lendshed/.planning/debug';

let server: FixtureServer;

test.beforeAll(async () => {
  test.setTimeout(120_000);
  server = await startFixtureServer([
    { from: 'test/fixtures/debug/search-index-goes-stale.md', to: '.planning/debug/search-index-goes-stale.md' },
    { from: '.planning/debug/resolved/loading-state-regression.md', to: '.planning/debug/resolved/loading-state-regression.md' },
    { from: '.planning/debug/knowledge-base.md', to: '.planning/debug/knowledge-base.md' },
    { from: `${LENDSHED_DEBUG}/loan-history-picks-wrong-shed.md`, to: '.planning/debug/loan-history-picks-wrong-shed.md' },
    { from: `${LENDSHED_DEBUG}/receipt-email-never-sent.md`, to: '.planning/debug/receipt-email-never-sent.md' },
    { from: `${LENDSHED_DEBUG}/reservation-holds-lost-on-reconnect.md`, to: '.planning/debug/reservation-holds-lost-on-reconnect.md' },
    { from: `${LENDSHED_DEBUG}/resolved/door-sensor-stops-after-wifi-drop.md`, to: '.planning/debug/resolved/door-sensor-stops-after-wifi-drop.md' },
  ]);
});

test.afterAll(async () => {
  await server?.stop();
});

async function resolveKey(suffix: string): Promise<string> {
  const response = await fetch(`${server.base}/api/presentation`);
  if (!response.ok) throw new Error(`debug-page.spec: /api/presentation responded ${response.status}`);
  const artifact = ((await response.json()) as PresentationLite).artifacts.find((entry) => entry.path.endsWith(suffix));
  if (!artifact) throw new Error(`debug-page.spec: fixture artifact not found: ${suffix}`);
  return artifact.key;
}

const LB = 'debug/resolved/loading-state-regression.md';
const SYN = 'debug/search-index-goes-stale.md';
const KB = 'debug/knowledge-base.md';
const AWAITING = 'debug/loan-history-picks-wrong-shed.md';
const DIAGNOSED = 'debug/receipt-email-never-sent.md';
const FIVE_ROUNDS = 'debug/reservation-holds-lost-on-reconnect.md';
const ARCHIVED = 'debug/resolved/door-sensor-stops-after-wifi-drop.md';

async function openPage(page: Page, suffix: string, theme: 'light' | 'dark'): Promise<void> {
  const key = await resolveKey(suffix);
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${server.base}${key}`);
  await page.locator('.view-debug-head').waitFor({ state: 'visible' });
}

const filter = (page: Page, label: string): Locator => page.locator('.view-debug-filter', { hasText: label });
const numbers = async (page: Page): Promise<string[]> =>
  (await page.locator('.view-debug-ts').allTextContents()).map((text) => text.split(' · ')[0]);

async function checkInvariants(page: Page): Promise<void> {
  await expect(page.locator('main h1')).toHaveCount(1);
  const signatures = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
      const c = getComputedStyle(el);
      return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
    }),
  );
  expect(new Set(signatures).size).toBeLessThanOrEqual(1);
  const radii = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.view-debug-status, .view-debug-lead, .view-debug-reported, .view-debug-suspect, .view-debug-ev, .view-debug-filter, .view-debug-vchip, .view-debug-file, .view-debug-next',
      ),
    ).map((el) => getComputedStyle(el).borderTopLeftRadius),
  );
  expect(radii.length).toBeGreaterThan(5);
  expect(radii.every((r) => r === '0px')).toBe(true);
}

/** Every clamped line shows its More button when the clamp cuts, and the open lead's lines show it only then. */
async function checkClamps(page: Page, onlyWhenCut: boolean): Promise<void> {
  const rows = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-clamp]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({
        cut: el.scrollHeight > el.clientHeight + 2,
        more: el.nextElementSibling?.classList.contains('view-debug-more') === true,
      })),
  );
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    if (row.cut) expect(row.more).toBe(true);
    else if (onlyWhenCut) expect(row.more).toBe(false);
  }
}

test.describe('Debug page', () => {
  test('labelore resolved session, light', async ({ page }) => {
    await openPage(page, LB, 'light');

    await expect(page.locator('main h1')).toHaveText('Loading state regression');
    await expect(page.locator('.view-debug-meta-left .eyebrow')).toHaveText('Debug session');
    await expect(page.locator('.view-debug-meta-left')).toContainText('Opened 16 Sep 2026');
    await expect(page.locator('.view-debug-meta-left')).toContainText('Updated 18:55');
    await expect(page.locator('.view-debug-meta-left .status-chip', { hasText: 'Archived' })).toHaveCount(1);
    await expect(page.locator('.view-debug-status')).toHaveText('Resolved');
    await expect(page.locator('.view-debug-status')).toHaveAttribute('data-tone', 'complete');
    await expect(page.locator('.view-debug-by')).toContainText('What was reported');
    await expect(page.locator('.view-debug-facts')).toContainText('Bug class');
    await expect(page.locator('.view-debug-facts')).toContainText('Bohrbug');

    const lead = page.locator('.view-debug-lead');
    await expect(lead).toContainText('Root cause · 3');
    await expect(lead.locator('.view-debug-cause-label')).toHaveText(['ENVIRONMENT', 'CODE', 'STRUCTURAL / PRE-EXISTING']);
    await expect(lead).toContainText('Verified · accepted');
    await expect(lead.locator('.view-debug-vchip')).toHaveCount(6);
    await expect(lead).toContainText('Files changed · 9');
    await expect(lead.locator('.view-debug-file')).toHaveCount(9);
    await checkClamps(page, false);

    // The CODE cause's More opens that cause in a dialog; Escape closes it.
    await lead.locator('.view-debug-causes li', { hasText: 'CODE' }).locator('.view-debug-more').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2, [data-slot="dialog-title"]').first()).toHaveText('Root cause · CODE');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // The full resolution: nine file rows, then Open in source switches to Source mode.
    await page.getByRole('button', { name: 'The full root cause, fix and verification ↗' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-slot="dialog-title"]').first()).toHaveText('Resolution in full');
    await expect(dialog.locator('.view-debug-modal-file')).toHaveCount(9);
    await dialog.getByRole('button', { name: 'Open in source ↗' }).click();
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-debug-head')).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-debug-head')).toBeVisible();

    // Expected vs actual.
    await expect(page.locator('.view-debug-expected')).toContainText('Should happen');
    await expect(page.locator('.view-debug-actual')).toContainText('What happens');
    await expect(page.locator('.view-debug-symptoms > div')).toHaveCount(4);

    // Suspects 4 / 2 / 0.
    await expect(page.locator('.view-debug-column')).toHaveCount(3);
    await expect(page.locator('.view-debug-column[data-column="confirmed"] .view-debug-suspect')).toHaveCount(4);
    await expect(page.locator('.view-debug-column[data-column="ruled"] .view-debug-suspect')).toHaveCount(2);
    await expect(page.locator('.view-debug-column[data-column="considered"] .view-debug-none')).toHaveText('None.');

    // Evidence log filters.
    await expect(page.locator('.view-debug-filter')).toHaveText(['Confirms 2', 'Rules out 2', 'Finding 8', 'All 12']);
    await expect(filter(page, 'Confirms')).toHaveAttribute('aria-pressed', 'true');
    expect(await numbers(page)).toEqual(['#4', '#6']);
    await filter(page, 'Rules out').click();
    expect(await numbers(page)).toEqual(['#2', '#9']);
    await filter(page, 'All').click();
    await expect(page.locator('.view-debug-ev')).toHaveCount(12);

    // Also in this session.
    await expect(page.locator('.view-debug-also .status-chip')).toHaveText(['Postmortem', 'Reasoning checkpoint', 'Frontmatter']);
    await page.getByRole('button', { name: 'Frontmatter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'View', exact: true }).click();
    await checkInvariants(page);
  });

  test('synthetic investigating session, dark', async ({ page }) => {
    await openPage(page, SYN, 'dark');
    await expect(page.locator('.view-debug-status')).toHaveText('Investigating');
    await expect(page.locator('.view-debug-status')).toHaveAttribute('data-tone', 'in-flight');
    const lead = page.locator('.view-debug-lead');
    await expect(lead).toContainText('Where it stands');
    await expect(lead).toContainText("The watcher's change handler invalidates the client cache");
    await expect(lead).toContainText('Testing it by');
    await expect(lead).toContainText('What the result means');
    await expect(lead.locator('.view-debug-next')).toContainText('Next action');
    await expect(page.getByRole('button', { name: 'The full root cause, fix and verification ↗' })).toHaveCount(0);
    await checkClamps(page, true);

    await expect(page.locator('.view-debug-column[data-column="confirmed"] .view-debug-none')).toHaveText('None.');
    await expect(page.locator('.view-debug-column[data-column="ruled"] .view-debug-suspect')).toHaveCount(1);
    await expect(page.locator('.view-debug-column[data-column="considered"] .view-debug-kind')).toHaveText('testing now');
    await expect(filter(page, 'All')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-debug-ev')).toHaveCount(3);
    await checkInvariants(page);
  });

  test('loan history session waiting on a check', async ({ page }) => {
    await openPage(page, AWAITING, 'light');
    await expect(page.locator('.view-debug-status')).toHaveText('Waiting on you');
    await expect(page.locator('.view-debug-lead')).toContainText('Fixed, waiting on your check');
    await expect(page.locator('.view-debug-lead > *').nth(1)).toContainText('What you need to check');
    await expect(page.locator('.view-debug-facts')).toContainText('Rounds');
    await filter(page, 'All').click();
    await expect(page.locator('.view-debug-round')).toHaveCount(2);
    await checkInvariants(page);
  });

  test('receipt email diagnosed session', async ({ page }) => {
    await openPage(page, DIAGNOSED, 'light');
    await expect(page.locator('.view-debug-status')).toHaveText('Diagnosed · not fixed');
    await expect(page.locator('.view-debug-lead')).toContainText('Root cause found · not fixed yet');
    await expect(page.locator('.view-debug-lead')).toContainText('Suggested fix · not applied');
    await expect(page.locator('.view-debug-meta-left')).not.toContainText('Updated');
    await checkInvariants(page);
  });

  test('reservation holds session over five rounds', async ({ page }) => {
    await openPage(page, FIVE_ROUNDS, 'light');
    await expect(page.locator('.view-debug-status')).toHaveText('Resolved');
    await expect(page.locator('.view-debug-meta-left .status-chip', { hasText: 'Archived' })).toHaveCount(0);
    await expect(page.locator('.view-debug-facts')).toContainText('Rounds');
    await filter(page, 'All').click();
    await expect(page.locator('.view-debug-ev')).toHaveCount(20);
    await expect(page.locator('.view-debug-round')).toHaveCount(5);
    await checkInvariants(page);
  });

  test('door sensor session under resolved is archived', async ({ page }) => {
    await openPage(page, ARCHIVED, 'dark');
    await expect(page.locator('.view-debug-status')).toHaveText('Resolved');
    await expect(page.locator('.view-debug-meta-left .status-chip', { hasText: 'Archived' })).toHaveCount(1);
    await expect(page.locator('.view-debug-lead .view-debug-file')).toHaveCount(8);
    await expect(page.locator('.view-debug-lead .view-debug-vchip')).toHaveCount(5);
    await checkInvariants(page);
  });

  test('the knowledge base is not a debug page', async ({ page }) => {
    const key = await resolveKey(KB);
    await page.goto(`${server.base}${key}`);
    await page.locator('main h1').first().waitFor({ state: 'visible' });
    await expect(page.locator('.view-debug-head')).toHaveCount(0);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every debug page fits 420px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 420, height: 900 });
      for (const suffix of [LB, SYN, AWAITING, DIAGNOSED, FIVE_ROUNDS, ARCHIVED]) {
        await openPage(page, suffix, theme);
        await expect(page.locator('main h1')).toHaveCount(1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, suffix).toBeLessThanOrEqual(0);
      }
    });
  }
});
