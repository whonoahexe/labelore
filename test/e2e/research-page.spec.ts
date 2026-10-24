// The project Research page (quick-261024-k8u, sketches 031-035), against this repo's own
// `.planning/research/` on the 4199 server. This is the page's only browser spec.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openResearch(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
  await page.goto(`/research${query}`);
  await page.locator('.research-spines').waitFor({ state: 'visible' });
}

test.describe('Research page: the frame', () => {
  test('the Research link sits between Roadmap and Traceability and opens /research', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.locator('a')).toContainText(['Dashboard', 'Roadmap', 'Research', 'Traceability', 'Sketches']);
    await nav.getByRole('link', { name: 'Research' }).click();
    await expect(page).toHaveURL(/\/research$/);
    await expect(page.locator('.research-spines')).toBeVisible();
  });

  test('one h1 and a bar that counts the files', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Labelore');
    await expect(page.locator('.research-bar')).toContainText('5 research files');
    await expect(page.locator('.research-bar')).toContainText('Researched 21 Aug 2026');
  });

  test('five spines 00 to 04 with Summary open and its numbers', async ({ page }) => {
    await openResearch(page);
    const closed = page.locator('.research-spine');
    await expect(closed).toHaveCount(4);
    await expect(closed.locator('.research-spine-number')).toHaveText(['01', '02', '03', '04']);
    const leaf = page.locator('.research-leaf');
    await expect(leaf).toHaveAttribute('aria-label', 'Summary');
    await expect(leaf.locator('h2')).toHaveText('Summary');
    await expect(leaf.locator('.research-leaf-number')).toHaveText('00');
    await expect(leaf.locator('.research-nums')).toContainText('4phases');
    await expect(leaf.locator('.research-nums')).toContainText('4gaps');
    await expect(page.getByRole('button', { name: 'Stack: 25 stack entries' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pitfalls: 10 critical pitfalls' })).toBeVisible();
  });

  test('the verdict is the first sentence and the toggle reveals the rest', async ({ page }) => {
    await openResearch(page);
    const verdict = page.locator('.research-verdict');
    await expect(verdict).toHaveText(/^Labelore is a read-only web viewer over structured markdown planning directories produced by the GSD orchestration tool\.$/);
    await expect(page.locator('.research-more')).toHaveCount(0);
    const toggle = page.getByRole('button', { name: 'Read the full summary' });
    await toggle.click();
    await expect(page.locator('.research-more p').first()).toBeVisible();
    const show = page.getByRole('button', { name: 'Show less' });
    await expect(show).toHaveAttribute('aria-expanded', 'true');
    await show.click();
    await expect(page.locator('.research-more')).toHaveCount(0);
  });

  test('arrow keys move between spines and the URL remembers', async ({ page }) => {
    await openResearch(page);
    await page.locator('.research-leaf').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/open=stack/);
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Stack');
    await expect(page.locator('.research-leaf')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('?open= restores a spine and an unknown key opens the first', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Pitfalls');
    await page.goto('/research?open=nonsense');
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('a closed spine opens on click', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: /^Architecture:/ }).click();
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Architecture');
    await expect(page).toHaveURL(/open=architecture/);
  });

  test('the page links to none of the source files', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('.research-page a[href*="/artifacts/"]')).toHaveCount(0);
    await expect(page.locator('.artifact-path-copy')).toHaveCount(0);
    await expect(page.locator('.research-page a')).toHaveCount(0);
  });

  test('at 390px the spines stack as bars without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openResearch(page);
    const direction = await page.locator('.research-spines').evaluate((el) => getComputedStyle(el).flexDirection);
    expect(direction).toBe('column');
    const widths = await page.locator('.research-spine').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    for (const width of widths) expect(width).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  });
});

test.describe('Research page: Summary', () => {
  test('four phase cards; the inspector follows the selection and arrows walk the track', async ({ page }) => {
    await openResearch(page);
    const cards = page.locator('.research-stn');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('.research-inspect')).toContainText('Phase 01 of 4');
    await cards.nth(1).click();
    await expect(page.locator('.research-inspect')).toContainText('Phase 02 of 4');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.research-inspect')).toContainText('Phase 03 of 4');
    await expect(page).not.toHaveURL(/open=/);
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('phase 01 delivers six tiles and avoids pitfalls 01, 03, 04 and 09', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('.research-dv')).toHaveCount(6);
    await expect(page.locator('.research-inspect .research-pf-chip')).toHaveText(['01', '03', '04', '09']);
    await expect(page.getByRole('button', { name: /^Pitfall 03: / })).toBeVisible();
  });

  test('a pitfall chip lands on the Pitfalls spine and Back returns to the Summary', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: /^Pitfall 03: / }).click();
    await expect(page).toHaveURL(/open=pitfalls&pitfall=3/);
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Pitfalls');
    await page.goBack();
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('"Why this order" opens four items and the gaps ledger has four rows', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: 'Why this order · 4' }).click();
    await expect(page.locator('.research-why-list li')).toHaveCount(4);
    await expect(page.locator('.research-gap')).toHaveCount(4);
  });
});

test.describe('Research page: Stack', () => {
  test('the verdict leads, the three reasons open, the layer switch counts and a row opens its why', async ({ page }) => {
    await openResearch(page, '?open=stack');
    await expect(page.locator('.research-verdict')).toHaveText(/^Vite 8 \+ React 19 SPA/);
    const reasons = page.locator('.research-reason');
    await expect(reasons).toHaveCount(3);
    await reasons.first().locator('button').click();
    await expect(reasons.first().locator('.research-reason-body')).toBeVisible();
    await expect(page.locator('.research-chip')).toHaveText(['Core Technologies6', 'Supporting Libraries13', 'Development Tools6']);
    await page.locator('.research-prow').first().locator('button').click();
    await expect(page.locator('.research-prow').first().locator('.research-label')).toHaveText('Why');
    await page.getByRole('button', { name: /^Supporting Libraries/ }).click();
    await expect(page.locator('.research-prow')).toHaveCount(13);
  });

  test('the spine foot reads 25 and ten alternatives read "over"', async ({ page }) => {
    await openResearch(page);
    await expect(page.getByRole('button', { name: 'Stack: 25 stack entries' }).locator('.research-spine-foot b')).toHaveText('25');
    await page.getByRole('button', { name: /^Stack:/ }).click();
    const alts = page.locator('.research-alt');
    await expect(alts).toHaveCount(10);
    await expect(alts.locator('.research-alt-over')).toHaveText(Array(10).fill('over'));
    await alts.first().locator('button').click();
    await expect(alts.first().locator('.research-row-more .research-label')).toHaveText('Use it instead when');
  });
});

test.describe('Research page: Features', () => {
  test('the kind switch reads 11, 7 and 9 with no group chips, and Not to build shows nine swaps', async ({ page }) => {
    await openResearch(page, '?open=features');
    await expect(page.locator('.research-kind b')).toHaveText(['11', '7', '9']);
    await expect(page.locator('.research-chips')).toHaveCount(0);
    await expect(page.locator('.research-frow')).toHaveCount(11);
    await page.locator('.research-kind').nth(2).click();
    await expect(page.locator('.research-swap')).toHaveCount(9);
    const decoration = await page.locator('.research-swap-bad').first().evaluate((el) => getComputedStyle(el).textDecorationLine);
    expect(decoration).toBe('line-through');
    await page.locator('.research-swap-button').first().click();
    await expect(page.locator('.research-swap-why .research-label')).toHaveText(['Why it gets asked for', "Why it's a problem"]);
  });

  test('the matrix has two rivals and our column headed Labelore, and a click unclamps a row', async ({ page }) => {
    await openResearch(page, '?open=features');
    const head = page.locator('.research-matrix-row[data-head="true"]');
    await expect(head.locator('b')).toHaveCount(3);
    await expect(head.locator('.research-matrix-us b')).toHaveText('Labelore');
    const row = page.locator('.research-matrix-row:not([data-head="true"])').first();
    await expect(row).toHaveAttribute('data-open', 'false');
    await row.click();
    await expect(row).toHaveAttribute('data-open', 'true');
  });
});

test.describe('Research page: Architecture', () => {
  test('the overview is the shipped lane diagram, with the author layout one chip away', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    const nodes = page.locator('.lane-diagram-node');
    await expect(nodes.first()).toBeVisible();
    expect(await nodes.count()).toBeGreaterThanOrEqual(3);
    await page.getByRole('button', { name: 'Shown as drawn' }).first().click();
    await expect(page.locator('.lifted-diagram-text').first()).toBeVisible();
    await expect(page.locator('.lane-diagram-node')).toHaveCount(0);
  });

  test('the project structure is the clean tree with its count', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    await expect(page.locator('.clean-tree-count')).toHaveText('12 files · 10 folders');
  });

  test('three swaps open to "What people do" and "Why it\'s wrong"', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    await expect(page.locator('.research-swap')).toHaveCount(3);
    await page.locator('.research-swap-button').first().click();
    await expect(page.locator('.research-swap-why .research-label')).toHaveText(['What people do', "Why it's wrong"]);
  });

  test('the build order is a DAG of four steps; a click lights wires and Escape clears', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    const nodes = page.locator('.research-bo-node');
    await expect(nodes).toHaveCount(4);
    await expect(page.locator('.research-bo-hint')).toBeVisible();
    await nodes.nth(1).click();
    const detail = page.locator('.research-bo-detail');
    await expect(detail).toContainText('Waits for');
    await expect(detail.locator('.research-step-chip').first()).toContainText('A');
    await expect(detail).toContainText('Unlocks');
    await expect(page.locator('.research-bo-wire[data-hot="true"]')).not.toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);
    await expect(page.locator('.research-bo-hint')).toBeVisible();
  });
});

test.describe('Research page: Pitfalls', () => {
  test('ten rows; row 01 names its short name, first sign and likelihood', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    const rows = page.locator('.research-wl-row');
    await expect(rows).toHaveCount(10);
    const first = rows.first();
    await expect(first.locator('.research-wl-name b')).toHaveText('Overfit to studio-portal');
    await expect(first.locator('.research-wl-watch .research-label')).toHaveText('Watch for');
    await expect(first.locator('.research-wl-sign em')).toHaveText(/^\+\d+ more$/);
    await expect(first.locator('.research-likely')).toContainText('Very high');
  });

  test('opening a row shows signs first, with no icon, and a verify block without a tick', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    await page.locator('.research-wl-head').first().click();
    const tabs = page.locator('.research-wl-row').first().getByRole('tab');
    await expect(tabs.first()).toContainText('Warning signs');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.research-signs svg')).toHaveCount(0);
    const squares = await page.locator('.research-signs li').first().evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
    expect(squares).not.toBe('rgba(0, 0, 0, 0)');
    await tabs.filter({ hasText: 'How to verify' }).click();
    await expect(page.locator('.research-verify .research-label')).toHaveText("Proves it's prevented");
    await expect(page.locator('.research-verify svg')).toHaveCount(0);
  });

  test('the ledger has ten rows and its 02 chip opens pitfall 02', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    await expect(page.locator('.research-ledger li')).toHaveCount(10);
    await page.locator('.research-ledger .research-pf-chip', { hasText: /^02 /i }).first().click();
    await expect(page).toHaveURL(/pitfall=2/);
    await expect(page.locator('.research-wl-row[data-pitfall="2"]')).toHaveAttribute('data-open', 'true');
  });

  test('?pitfall=3 opens row 03', async ({ page }) => {
    await openResearch(page, '?open=pitfalls&pitfall=3');
    await expect(page.locator('.research-wl-row[data-pitfall="3"]')).toHaveAttribute('data-open', 'true');
    await expect(page.locator('.research-wl-row[data-open="true"]')).toHaveCount(1);
  });
});

test.describe('Research page: every spine at 390px and in the dark theme', () => {
  for (const key of ['summary', 'stack', 'features', 'architecture', 'pitfalls']) {
    test(`${key} has no horizontal overflow at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await openResearch(page, `?open=${key}`);
      await expect(page.locator('.research-leaf')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    });

    test(`${key} loads in the dark theme without console errors`, async ({ page }) => {
      const errors: string[] = [];
      // The dev server's HMR socket is unrelated to the page.
      const unrelated = /WebSocket|vite/i;
      page.on('pageerror', (error) => {
        if (!unrelated.test(error.message)) errors.push(error.message);
      });
      page.on('console', (message) => {
        if (message.type() === 'error' && !unrelated.test(message.text())) errors.push(message.text());
      });
      await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
      await page.goto(`/research?open=${key}`);
      await page.locator('.research-leaf').waitFor({ state: 'visible' });
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
      expect(errors).toEqual([]);
    });
  }
});
