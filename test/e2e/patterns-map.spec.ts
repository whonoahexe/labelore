// The PATTERNS pattern-map e2e (quick-260930-wfs, sketch 013 B): real corpus files, never a fixture
// mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// research-briefing.spec.ts idiom) so an archival/rename fails loudly instead of silently
// skipping. The labelore v1.1/05 test always runs; the studio-portal test runs against the
// read-only server on port 4198 (playwright.config.ts, present only when ~/studio-portal/.planning
// exists) and skips itself otherwise. This spec asserts the foundation sweep's key invariants
// itself (one h1, an eyebrow, squared corners, one chip signature, no 420px overflow), since the
// full sweep is too slow to run per change.
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
  if (!response.ok) throw new Error(`patterns-map.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`patterns-map.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

test.describe('PATTERNS pattern map', () => {
  test('LB v1.1/05 pattern map', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '05-per-type-document-views/05-PATTERNS.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#pattern-file-map').waitFor({ state: 'visible' });

    // Cover and page invariants.
    await expect(page.locator('.document-cover')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Per-Type Document Views');
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('Pattern map · Phase 5');
    const facts = page.locator('.view-patterns-facts');
    await expect(facts).toContainText('2026-09-20');
    await expect(facts).toContainText('17 / 17');

    // The meter: 8 / 8 / 0 / 1 from the classification.
    const keyCount = async (quality: string): Promise<string | null> =>
      page.locator(`.view-patterns-meter-key [data-quality="${quality}"] b`).textContent();
    expect([await keyCount('exact'), await keyCount('role'), await keyCount('partial'), await keyCount('none')]).toEqual([
      '8',
      '8',
      '0',
      '1',
    ]);

    // 17 rows; the panel opens on the one new-ground file.
    await expect(page.locator('.view-patterns-row')).toHaveCount(17);
    const panel = page.locator('.view-patterns-panel');
    await expect(panel).toContainText('design-language.md');
    await expect(panel).toContainText('Why nothing matches');

    // Clicking a row selects it.
    await page.locator('.view-patterns-row', { hasText: 'registry.ts' }).first().click();
    await expect(panel).toContainText('Copy from');
    await expect(panel).not.toContainText('Why nothing matches');

    // House rule: pick explains and dims; Escape clears.
    const chip = page.locator('.view-patterns-strip button', { hasText: 'Error handling' });
    const hits = Number(((await chip.textContent()) ?? '').split('·')[1]);
    expect(hits).toBeGreaterThan(0);
    await chip.click();
    await expect(page.locator('.view-patterns-rule-note')).toBeVisible();
    await expect(page.locator('.view-patterns-row[data-dim="true"]')).toHaveCount(17 - hits);
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('.view-patterns-rule-note')).toHaveCount(0);
    await expect(page.locator('.view-patterns-row[data-dim="true"]')).toHaveCount(0);

    // F-05: every status chip on the page measures the same (buttons and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(10);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome.
    for (const selector of ['.view-patterns-panel', '.view-patterns-row', '.view-patterns-note']) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // The source-only strip: four buttons; Metadata lands in Source mode at its heading.
    const strip = page.locator('#pattern-source-only');
    await expect(strip.getByRole('button')).toHaveCount(4);
    await strip.getByRole('button', { name: 'Metadata', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-patterns-row')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Metadata' });
    await expect
      .poll(async () => {
        const box = await heading.boundingBox();
        const height = page.viewportSize()?.height ?? 0;
        return box !== null && box.y >= 0 && box.y < height;
      })
      .toBe(true);

    // Back to View restores the map.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-patterns-row')).toHaveCount(17);

    // 420px, dark: nothing overflows and the panel stacks below the map.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#pattern-file-map').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => {
      const rows = document.querySelectorAll('.view-patterns-row');
      const lastRow = rows[rows.length - 1].getBoundingClientRect();
      const panelBox = (document.querySelector('.view-patterns-panel') as HTMLElement).getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        panelTop: panelBox.top,
        lastRowTop: lastRow.top,
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
    expect(layout.panelTop).toBeGreaterThan(layout.lastRowTop);
  });

  test('SP v1.0/02 pattern map', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    const url = await resolveFixtureUrl(SP_BASE_URL, 'v1.0-phases/02-storage-health-status/02-PATTERNS.md');
    await page.goto(`${SP_BASE_URL}${url}`);
    await page.locator('#pattern-file-map').waitFor({ state: 'visible' });

    // The doc's own five groups, in order.
    await expect(page.locator('.view-patterns-label')).toHaveText([
      /^Backend — new modules \(greenfield\)\s*7$/,
      /^Backend — modified\s*4$/,
      /^Backend — tests & fixtures\s*5$/,
      /^Frontend\s*8$/,
      /^Ops artifacts\s*2$/,
    ]);

    // Meter 7 / 3 / 5 / 11.
    const counts = await page
      .locator('.view-patterns-meter-key b')
      .evaluateAll((els) => els.map((el) => el.textContent));
    expect(counts).toEqual(['7', '3', '5', '11']);

    // The mapper's note is visible.
    await expect(page.locator('.view-patterns-note')).toBeVisible();
    await expect(page.locator('.view-patterns-note')).toContainText('Verification note');

    // collector.rs: partial, see divergence, with its copy-from.
    await page.locator('.view-patterns-row', { hasText: 'collector.rs' }).click();
    const panel = page.locator('.view-patterns-panel');
    await expect(panel).toContainText('Partial');
    await expect(panel).toContainText('see divergence');
    await expect(panel).toContainText('Copy from');

    // Planner notes sit collapsed in back matter.
    const notes = page.locator('.view-patterns-back details', { hasText: 'Cross-Cutting Notes for the Planner' });
    await expect(notes).toHaveCount(1);
    await expect(notes).not.toHaveAttribute('open', '');
  });
});
