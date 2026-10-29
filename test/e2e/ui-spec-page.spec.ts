// The UI-SPEC contract-page e2e (quick-261001-qk6, sketch 014 winner): real files, never a mock.
// Fixtures resolve by path against the live `/api/presentation` payload (the patterns-map.spec.ts
// idiom) so an archival/rename fails loudly instead of silently skipping. The labelore test runs
// against the default server (port 4199); the Lendshed tests run against the read-only server on the
// made-up Lendshed project (port 4198, FIXTURE_BASE_URL; playwright.config.ts always starts it and
// throws at load when the fixture tree is missing). Nothing in this file skips. This spec asserts the
// foundation sweep's key invariants itself (one h1, an eyebrow, squared corners, one chip signature,
// no 420px overflow), since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import { BASE_URL, artifactUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) throw new Error(`ui-spec-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`ui-spec-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

test.describe('UI-SPEC page', () => {
  test('FX phase 01 UI-SPEC page', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, 'phases/01-member-sign-in-sessions/01-UI-SPEC.md'));
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#ui-spec-considerations').waitFor({ state: 'visible' });

    // The cover: one h1, the eyebrow, the sign-off chip, Created, and no Status (it is approved).
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Member sign in sessions');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('UI design contract · Phase 1');
    const facts = page.locator('.view-ui-spec-facts');
    const chip = facts.locator('.view-ui-spec-signoff');
    await expect(chip).toHaveText('Signed off 6/6');
    await expect(chip).toHaveAttribute('data-tone', 'complete');
    await expect(facts).toContainText('Created');
    await expect(facts).toContainText('2026-03-25');
    await expect(facts).not.toContainText('Status');
    await expect(page.locator('.artifact-metadata')).toHaveCount(0);

    // The sign-off dialog: six dimensions and the approval; Escape closes it.
    await chip.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.view-ui-spec-signoff-row')).toHaveCount(6);
    await expect(dialog.locator('.view-ui-spec-signoff-approval')).toContainText('APPROVED');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // Four choice cards; the preset button carries the code.
    await expect(page.locator('.view-ui-spec-choice')).toHaveCount(4);
    await expect(page.locator('.view-ui-spec-preset')).toContainText('k7Tmw2Qe9x');

    // The meter counts 16 / 1 / 1 / 4 and the matrix holds 3 elements.
    const keyCount = async (status: string): Promise<string | null> =>
      page.locator(`.view-ui-spec-meter-key [data-status="${status}"] b`).textContent();
    expect([
      await keyCount('covered'),
      await keyCount('backstop'),
      await keyCount('unresolved'),
      await keyCount('dismissed'),
    ]).toEqual(['16', '1', '1', '4']);
    await expect(page.locator('.view-ui-spec-matrix tbody tr')).toHaveCount(3);

    // A Needs-a-person chip opens its cell's resolutions; Escape clears them.
    await page.locator('.view-ui-spec-strip button').first().click();
    const detail = page.locator('.view-ui-spec-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Backstop');
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);

    // F-05: every status chip on the page measures the same (buttons and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(4);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome.
    for (const selector of ['.view-ui-spec-choice', '.view-ui-spec-role', '.view-ui-spec-reg', '.view-ui-spec-matrix-wrap']) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // The source-only strip: Copywriting Contract lands in Source mode at its heading; View restores.
    const strip = page.locator('#ui-spec-source-only');
    await strip.getByRole('button', { name: 'Copywriting Contract', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-ui-spec-matrix')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Copywriting Contract' });
    await expect
      .poll(async () => {
        const box = await heading.boundingBox();
        const height = page.viewportSize()?.height ?? 0;
        return box !== null && box.y >= 0 && box.y < height;
      })
      .toBe(true);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-ui-spec-matrix tbody tr')).toHaveCount(3);

    // 420px, dark: nothing overflows and the matrix scrolls inside its own wrapper.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#ui-spec-considerations').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => {
      const wrap = document.querySelector('.view-ui-spec-matrix-wrap') as HTMLElement;
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        wrapScrolls: wrap.scrollWidth > wrap.clientWidth,
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
    expect(layout.wrapScrolls).toBe(true);
  });

  test('FX v1.0/04 UI-SPEC page', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, 'v1.0-phases/04-shed-to-shed-transfers/04-UI-SPEC.md'));
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#ui-spec-considerations').waitFor({ state: 'visible' });

    await expect(page.locator('h1')).toHaveText('Shed to shed transfers');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('UI design contract · Phase 04');
    await expect(page.locator('.view-ui-spec-signoff')).toHaveText('Signed off 6/6');
    await expect(page.locator('.view-ui-spec-choice')).toHaveCount(4);

    // The meter counts 31 / 3 / 0 / 11 and the matrix holds 6 elements.
    const keyCount = async (status: string): Promise<string | null> =>
      page.locator(`.view-ui-spec-meter-key [data-status="${status}"] b`).textContent();
    expect([
      await keyCount('covered'),
      await keyCount('backstop'),
      await keyCount('unresolved'),
      await keyCount('dismissed'),
    ]).toEqual(['31', '3', '0', '11']);
    await expect(page.locator('.view-ui-spec-matrix tbody tr')).toHaveCount(6);

    // The phase-specific chapters list first, then Copywriting Contract.
    const labels = await page.locator('#ui-spec-source-only button').allTextContents();
    expect(labels.slice(0, 4)).toEqual([
      'Layout',
      'Motion & Reduced-Motion Contract',
      'Screen-Reader / Live-Region Contract',
      'Copywriting Contract',
    ]);
  });

  test('LB v1.0/02 UI-SPEC page', async ({ page, baseURL }) => {
    const base = baseURL ?? BASE_URL;
    const url = await artifactUrl(base, await resolveFixturePath(base, '02-situational-awareness-artifact-reading/02-UI-SPEC.md'));
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#ui-spec-considerations').waitFor({ state: 'visible' });

    await expect(page.locator('.view-ui-spec-signoff')).toHaveText('Signed off 6/6');
    await expect(page.locator('.view-ui-spec-matrix tbody tr')).toHaveCount(15);
    expect(await page.locator('.view-ui-spec-meter-key [data-status="unresolved"] b').textContent()).toBe('9');

    // The eight revision chapters list without "(Revision …)", then Copywriting Contract.
    const labels = await page.locator('#ui-spec-source-only button').allTextContents();
    expect(labels.slice(0, 8).some((label) => label.includes('(Revision'))).toBe(false);
    expect(labels[8]).toBe('Copywriting Contract');
  });
});
