// The UI-SPEC contract-page e2e (quick-261001-qk6, sketch 014 winner): real corpus files, never a
// fixture mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// patterns-map.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. The
// labelore test runs against the default server (port 4199); the studio-portal test runs against the
// read-only server on port 4198 (playwright.config.ts, present only when ~/studio-portal/.planning
// exists) and skips itself otherwise. This spec asserts the foundation sweep's key invariants itself
// (one h1, an eyebrow, squared corners, one chip signature, no 420px overflow), since the full sweep
// is too slow to run per change. Written in the quick-261001-qk6 worktree and left to run once on
// master after the merge (the Playwright ports collide across concurrent worktrees).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const STUDIO_PORTAL_AVAILABLE = existsSync(join(homedir(), 'studio-portal', '.planning'));
const SP_BASE_URL = 'http://127.0.0.1:4198';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) throw new Error(`ui-spec-page.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`ui-spec-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

test.describe('UI-SPEC page', () => {
  test('SP v1.0/04 UI-SPEC page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('#ui-spec-considerations').waitFor({ state: 'visible' });

    // The cover: one h1, the eyebrow, the sign-off chip, Created, and no Status (it is approved).
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Tier to tier transfers');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('UI design contract · Phase 04');
    const facts = page.locator('.view-ui-spec-facts');
    const chip = facts.locator('.view-ui-spec-signoff');
    await expect(chip).toHaveText('Signed off 6/6');
    await expect(chip).toHaveAttribute('data-tone', 'complete');
    await expect(facts).toContainText('Created');
    await expect(facts).toContainText('2026-07-24');
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
    await expect(page.locator('.view-ui-spec-preset')).toContainText('b3Dqcuo4na');

    // The meter counts 57 / 6 / 0 / 15 and the matrix holds 10 elements.
    const keyCount = async (status: string): Promise<string | null> =>
      page.locator(`.view-ui-spec-meter-key [data-status="${status}"] b`).textContent();
    expect([
      await keyCount('covered'),
      await keyCount('backstop'),
      await keyCount('unresolved'),
      await keyCount('dismissed'),
    ]).toEqual(['57', '6', '0', '15']);
    await expect(page.locator('.view-ui-spec-matrix tbody tr')).toHaveCount(10);

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
    expect(signatures.length).toBeGreaterThan(8);
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
    await expect(page.locator('.view-ui-spec-matrix tbody tr')).toHaveCount(10);

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

  test('LB v1.0/02 UI-SPEC page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '02-situational-awareness-artifact-reading/02-UI-SPEC.md');
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
