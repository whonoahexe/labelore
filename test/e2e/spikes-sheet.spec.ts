// Phase 11 (11-16, VIEW-14, D-01): the Spikes page's sheet in a real browser, on the made-up Lendshed project (port
// 4198). A spike's README address opens the page with its sheet already open; Esc and the scrim close it and go to the
// manifest's address; the tile that opened a sheet gets focus back when it closes. Every address is built from the
// served project's own payload through app-url.ts, so no URL shape is pinned here.
import { expect, test } from '@playwright/test';
import { artifactUrl, exactUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

const MANIFEST = '.planning/spikes/MANIFEST.md';
const README_001 = '.planning/spikes/001-badge-reader-latency/README.md';
const README_003B = '.planning/spikes/003b-local-disk-staging/README.md';

test.describe('Spikes sheet (Lendshed)', () => {
  test("opening 003b's README address directly shows the board with its sheet open, both verdicts apart", async ({ page }) => {
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, README_003B));
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { level: 2, name: 'local-disk-staging' })).toBeVisible();
    await expect(sheet).toContainText('Verdict · MANIFEST.md');
    await expect(sheet).toContainText('PENDING (needs a recording)');
    await expect(sheet).toContainText('Listed by name only. Labelore never runs or opens these files.');
    // The board is still under the sheet.
    await expect(page.locator('h3.view-spikes-lane-title', { hasText: 'export-staging' })).toBeAttached();
    // No file row is a link.
    await expect(sheet.locator('.view-spikes-files a')).toHaveCount(0);
  });

  test('Esc closes the sheet and returns to the manifest address', async ({ page }) => {
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, README_003B));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(exactUrl(await artifactUrl(FIXTURE_BASE_URL, MANIFEST)));
  });

  test("clicking 001's tile opens its sheet, and closing by the scrim gives that tile focus back", async ({ page }) => {
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, MANIFEST));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const tile = page.locator('a.view-spikes-tile[aria-label^="001 "]');
    await tile.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(exactUrl(await artifactUrl(FIXTURE_BASE_URL, README_001)));
    await expect(sheet.getByRole('heading', { level: 2, name: 'badge-reader-latency' })).toBeVisible();
    await page.locator('.view-spikes-scrim').click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(exactUrl(await artifactUrl(FIXTURE_BASE_URL, MANIFEST)));
    await expect(tile).toBeFocused();
  });
});
