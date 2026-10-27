// The project Research page (quick-261024-k8u, sketches 031-035), against this repo's own
// `.planning/research/` on the 4199 server. This is the page's only browser spec.
//
// The pins are today's v2.1 research (D-18), which is a different shape from the v1.0 research the
// page was built on: no phase list, no stack decision, no competitor matrix, no overview diagram,
// project tree or build order, and no how-likely line on a pitfall. Where the page used to draw one
// of those, the spec now asserts the page draws nothing for it. The v1.0 shapes stay covered by the
// lift tests in test/project-research-lift.test.ts, which read the archived v1.0 research.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BASE_URL, exactUrl, projectUrl } from './app-url.ts';

async function openResearch(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
  await page.goto(await projectUrl(BASE_URL, `/research${query}`));
  await page.locator('.research-spines').waitFor({ state: 'visible' });
}

test.describe('Research page: the frame', () => {
  test('the Research link sits between Roadmap and Traceability and opens /research', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(await projectUrl(BASE_URL, '/'));
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.locator('a')).toContainText(['Dashboard', 'Roadmap', 'Research', 'Traceability', 'Sketches']);
    await nav.getByRole('link', { name: 'Research' }).click();
    await expect(page).toHaveURL(exactUrl(await projectUrl(BASE_URL, '/research')));
    await expect(page.locator('.research-spines')).toBeVisible();
  });

  test('one h1 and a bar that counts the files', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Labelore');
    await expect(page.locator('.research-bar')).toContainText('5 research files');
    await expect(page.locator('.research-bar')).toContainText('Researched 25 Oct 2026');
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
    await expect(leaf.locator('.research-nums')).toContainText('0phases');
    await expect(leaf.locator('.research-nums')).toContainText('9gaps');
    await expect(page.getByRole('button', { name: 'Stack: 8 stack entries' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pitfalls: 33 critical pitfalls' })).toBeVisible();
  });

  test('the verdict is the first sentence and the toggle reveals the rest', async ({ page }) => {
    await openResearch(page);
    const verdict = page.locator('.research-verdict');
    await expect(verdict).toHaveText(/^v2\.1 is an integration milestone\.$/);
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
    await page.goto(await projectUrl(BASE_URL, '/research?open=nonsense'));
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
  test('a summary that names no phases draws no phase track and no inspector', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('.research-stn')).toHaveCount(0);
    await expect(page.locator('.research-inspect')).toHaveCount(0);
    await expect(page.locator('.research-dv')).toHaveCount(0);
    await expect(page.locator('.research-leaf')).toContainText('This summary names no phases.');
  });

  test('a closed spine lands on its panel and the Summary spine returns to the Summary', async ({ page }) => {
    await openResearch(page);
    await page.getByRole('button', { name: /^Pitfalls:/ }).click();
    await expect(page).toHaveURL(/open=pitfalls/);
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Pitfalls');
    await page.getByRole('button', { name: /^Summary/ }).click();
    await expect(page.locator('.research-leaf')).toHaveAttribute('aria-label', 'Summary');
  });

  test('the gaps ledger has nine rows, the first about the never-seen types', async ({ page }) => {
    await openResearch(page);
    await expect(page.locator('.research-why-list li')).toHaveCount(0);
    await expect(page.locator('.research-gap')).toHaveCount(9);
    await expect(page.locator('.research-gap').first()).toContainText('About 14 never-seen types');
  });
});

test.describe('Research page: Stack', () => {
  test('no verdict leads, the layer switch counts 6 and 2 and a row opens its why', async ({ page }) => {
    await openResearch(page, '?open=stack');
    await expect(page.locator('.research-verdict')).toHaveCount(0);
    await expect(page.locator('.research-reason')).toHaveCount(0);
    await expect(page.locator('.research-chip')).toHaveText(['Core Technologies6', 'Development Tools2']);
    await expect(page.locator('.research-prow')).toHaveCount(6);
    await page.locator('.research-prow').first().locator('button').click();
    await expect(page.locator('.research-prow').first().locator('.research-label')).toHaveText('Why');
    await page.getByRole('button', { name: /^Development Tools/ }).click();
    await expect(page.locator('.research-prow')).toHaveCount(2);
  });

  test('the spine foot reads 8 and nine alternatives read "over"', async ({ page }) => {
    await openResearch(page);
    await expect(page.getByRole('button', { name: 'Stack: 8 stack entries' }).locator('.research-spine-foot b')).toHaveText('8');
    await page.getByRole('button', { name: /^Stack:/ }).click();
    const alts = page.locator('.research-alt');
    await expect(alts).toHaveCount(9);
    await expect(alts.locator('.research-alt-over')).toHaveText(Array(9).fill('over'));
    await alts.first().locator('button').click();
    await expect(alts.first().locator('.research-row-more .research-label')).toHaveText('Use it instead when');
  });
});

test.describe('Research page: Features', () => {
  test('the kind switch reads 10, 6 and 7 with no group chips, and Not to build shows seven swaps', async ({ page }) => {
    await openResearch(page, '?open=features');
    await expect(page.locator('.research-kind b')).toHaveText(['10', '6', '7']);
    await expect(page.locator('.research-chips')).toHaveCount(0);
    await expect(page.locator('.research-frow')).toHaveCount(10);
    await page.locator('.research-kind').nth(2).click();
    await expect(page.locator('.research-swap')).toHaveCount(7);
    const decoration = await page.locator('.research-swap-bad').first().evaluate((el) => getComputedStyle(el).textDecorationLine);
    expect(decoration).toBe('line-through');
    await page.locator('.research-swap-button').first().click();
    await expect(page.locator('.research-swap-why .research-label')).toHaveText(['Why it gets asked for', "Why it's a problem"]);
  });

  test('a features file with no competitor table draws no matrix', async ({ page }) => {
    await openResearch(page, '?open=features');
    await expect(page.locator('.research-frow').first()).toBeVisible();
    await expect(page.locator('.research-matrix-row')).toHaveCount(0);
  });
});

test.describe('Research page: Architecture', () => {
  test('no overview diagram and no project tree: the lead sentence stands in for them', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    await expect(page.locator('.research-leaf')).toContainText('Current pipeline: CLI argument');
    await expect(page.locator('.lane-diagram-node')).toHaveCount(0);
    await expect(page.locator('.lifted-diagram-text')).toHaveCount(0);
    await expect(page.locator('.clean-tree-count')).toHaveCount(0);
  });

  test('scaling is a grid of five concerns over three scales, with no bottleneck call-out', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    const heads = page.locator('.research-arch .research-section-head h3');
    await expect(heads).toHaveText(['Scaling considerations', 'Anti-patterns']);
    const scale = page.locator('.research-scale');
    await expect(scale.locator('.research-section-head')).toContainText('3 scales · 5 concerns');
    await expect(scale.locator('.research-bn')).toHaveCount(0);
    await expect(scale.locator('.research-scale-tier')).toHaveCount(3);
    await expect(scale.locator('.research-scale-cell')).toHaveCount(15);
    await expect(scale.locator('.research-scale-tier').first()).toContainText('1 project');
    await expect(scale).toContainText('Add LRU eviction of idle runtimes');
  });

  test('six swaps open to "Why it\'s wrong" alone, since the file gives only an instead', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    await expect(page.locator('.research-swap')).toHaveCount(6);
    await page.locator('.research-swap-button').first().click();
    await expect(page.locator('.research-swap-why .research-label')).toHaveText(["Why it's wrong"]);
  });

  test('no build order, so no DAG is drawn', async ({ page }) => {
    await openResearch(page, '?open=architecture');
    await expect(page.locator('.research-swap').first()).toBeVisible();
    await expect(page.locator('.research-bo-node')).toHaveCount(0);
    await expect(page.locator('.research-bo-hint')).toHaveCount(0);
  });
});

test.describe('Research page: Pitfalls', () => {
  test('33 rows; row 01 names its short name and first sign, and none carries a likelihood', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    const rows = page.locator('.research-wl-row');
    await expect(rows).toHaveCount(33);
    const first = rows.first();
    await expect(first.locator('.research-wl-name b')).toHaveText('URL is identity');
    await expect(first.locator('.research-wl-watch .research-label')).toHaveText('Watch for');
    await expect(first.locator('.research-wl-sign em')).toHaveText(/^\+\d+ more$/);
    await expect(page.locator('.research-likely')).toHaveCount(0);
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

  test('the ledger has 13 checks and a row opens from its head', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    await expect(page.locator('.research-ledger li')).toHaveCount(13);
    await page.locator('.research-wl-row[data-pitfall="2"] .research-wl-head').click();
    await expect(page.locator('.research-wl-row[data-pitfall="2"]')).toHaveAttribute('data-open', 'true');
  });

  test('performance, security and UX sit between the pitfalls and the checklist as a kind switch over swaps', async ({ page }) => {
    await openResearch(page, '?open=pitfalls');
    const heads = page.locator('.research-pitfalls .research-section-head h3');
    await expect(heads).toHaveText(['Critical pitfalls', 'Performance, security and UX', "Looks done but isn't"]);
    const kinds = page.locator('.research-pitfalls .research-kind');
    await expect(kinds.locator('b')).toHaveText(['07', '08', '09']);
    await expect(kinds.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.research-pitfalls .research-swap-key')).toContainText('Prevention');
    await expect(page.locator('.research-pitfalls .research-swap')).toHaveCount(7);
    await kinds.nth(1).click();
    await expect(page.locator('.research-pitfalls .research-sec-note')).toHaveCount(0);
    await expect(page.locator('.research-pitfalls .research-swap')).toHaveCount(8);
    await page.locator('.research-pitfalls .research-swap-button').first().click();
    await expect(page.locator('.research-pitfalls .research-swap-why .research-label')).toHaveText(['Risk']);
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
      await page.goto(await projectUrl(BASE_URL, `/research?open=${key}`));
      await page.locator('.research-leaf').waitFor({ state: 'visible' });
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
      expect(errors).toEqual([]);
    });
  }
});
