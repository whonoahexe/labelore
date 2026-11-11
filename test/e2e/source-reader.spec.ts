// The Source reader's selection and links in a real browser (Phase 12: SRC-02, D-05, D-06; sketch 062 E), on the
// made-up Lendshed project (port 4198, started by playwright.config.ts): click a line number, shift-click a second,
// keep the range in the URL fragment with no new history entry, reload and land on it, select a whole block,
// clear with Escape, and land an "In the source only" link on its heading's line. Pure rules (the reducer, the
// label, the link) are unit-tested in test/web/source-selection.test.ts; this proves them in the page.
// Run on its own: npx playwright test test/e2e/source-reader.spec.ts
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

const EN_DASH = '–';

async function pathOf(pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(FIXTURE_BASE_URL, '/presentation'));
  if (!response.ok) throw new Error(`source-reader.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as { artifacts: { path: string }[] };
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`source-reader.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

/** Opens a Lendshed file in Source (the file's one URL plus ?source=1, and an optional fragment). */
async function openSource(page: Page, pathIncludes: string, fragment = ''): Promise<void> {
  await page.goto(`${await artifactUrl(FIXTURE_BASE_URL, await pathOf(pathIncludes))}?source=1${fragment}`);
  await page.locator('.source-reader .source-row').first().waitFor({ state: 'visible' });
}

const PLAN_06 = 'phases/01-member-sign-in-sessions/01-06-PLAN.md';

/** True once the row's top edge is at or below the sticky bar's bottom edge and still in the window. */
async function rowBelowBar(page: Page, line: number): Promise<boolean> {
  const bar = await page.locator('.source-bar').boundingBox();
  const row = await page.locator(`#L${line}`).boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return bar !== null && row !== null && row.y >= bar.y + bar.height - 1 && row.y < height;
}

test.describe('Source reader selection on Lendshed', () => {
  test('click L12, shift-click L18, keep it in the fragment without history, reload onto it', async ({ page }) => {
    await openSource(page, PLAN_06);
    // The frontmatter starts folded (the numbers jump from 1 to 52); open it so lines 12 and 18 are rows.
    await page.getByRole('button', { name: /^Unfold frontmatter/ }).first().click();
    await expect(page.locator('#L12')).toBeVisible();
    const historyBefore = await page.evaluate(() => window.history.length);

    await page.locator('#L12 .source-line-number').click();
    await expect(page).toHaveURL(/\?source=1#L12$/);
    await expect(page.locator('.source-selection')).toContainText('L12');
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(1);

    await page.locator('#L18 .source-line-number').click({ modifiers: ['Shift'] });
    await expect(page).toHaveURL(/\?source=1#L12-L18$/);
    await expect(page.locator('.source-selection')).toContainText(`L12${EN_DASH}L18`);
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(7);
    // Neither click added a history entry: the link's default was prevented and only the fragment was replaced.
    expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);

    await page.reload();
    await page.locator('.source-reader .source-row').first().waitFor({ state: 'visible' });
    await expect(page).toHaveURL(/\?source=1#L12-L18$/);
    // The range sits inside the folded frontmatter, so landing opened it and selected rows 12 to 18.
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(7);
    for (const line of [12, 13, 14, 15, 16, 17, 18]) await expect(page.locator(`#L${line}`)).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('.source-selection')).toContainText(`L12${EN_DASH}L18`);
    // The first selected row is scrolled to just under the sticky bar, not hidden behind it.
    await expect.poll(() => rowBelowBar(page, 12)).toBe(true);
  });

  test('landing on #L3-L5 opens the folded frontmatter, selects the rows and flashes the first', async ({ page }) => {
    await openSource(page, PLAN_06, '#L3-L5');
    // Rows 2 to 51 are the frontmatter, folded at load; the fragment names rows inside it, so it opened.
    await expect(page.locator('#L2')).toBeVisible();
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(3);
    await expect(page.locator('#L3')).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('#L5')).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('#L3')).toHaveAttribute('data-source-hit', 'true');
    await expect(page.locator('.source-selection')).toContainText(`L3${EN_DASH}L5`);
    await expect.poll(() => rowBelowBar(page, 3)).toBe(true);
    // The flash ends on its own after 1.4 s; the selection stays.
    await expect(page.locator('#L3')).not.toHaveAttribute('data-source-hit', 'true', { timeout: 5000 });
    await expect(page.locator('#L3')).toHaveAttribute('data-selected', 'true');
  });

  test('a click on a task bracket selects the whole task, Copy link copies the absolute link, Escape clears', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openSource(page, PLAN_06);
    const historyBefore = await page.evaluate(() => window.history.length);

    // The first <task> block runs from its opening tag to its closing tag; a mid cell of its bracket is the rule.
    const bracket = page.locator('.source-gutter-cell[data-state="mid"][title^="<task>"]').first();
    const title = (await bracket.getAttribute('title')) ?? '';
    const match = /L(\d+)–L(\d+)$/.exec(title);
    if (match === null) throw new Error(`source-reader.spec: the task bracket's title carries no range: ${title}`);
    const [from, to] = [Number(match[1]), Number(match[2])];
    await bracket.click();
    await expect(page).toHaveURL(new RegExp(`\\?source=1#L${from}-L${to}$`));
    await expect(page.locator('.source-selection')).toContainText(`L${from}${EN_DASH}L${to}`);
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(to - from + 1);
    expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);

    // Copy link: the absolute address with ?source=1 and the range; the button says Copied, then goes back.
    const pathname = new URL(page.url()).pathname;
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${FIXTURE_BASE_URL}${pathname}?source=1#L${from}-L${to}`,
    );
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();

    // Escape (focus is inside the reader after the click) clears the selection and the fragment.
    await page.locator('.source-selection-link').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.source-selection')).toHaveCount(0);
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);
  });

  test('the chip clears with its button, and the one selected number clears when clicked again', async ({ page }) => {
    await openSource(page, PLAN_06, '#L60');
    await expect(page.locator('.source-selection')).toContainText('L60');
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(page.locator('.source-selection')).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe('');

    await page.locator('#L60 .source-line-number').click();
    await expect(page.locator('.source-selection')).toContainText('L60');
    await page.locator('#L60 .source-line-number').click();
    await expect(page.locator('.source-selection')).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the Here path follows the scroll, and a crumb jumps to its block with a flash', async ({ page }) => {
    await openSource(page, PLAN_06);
    await expect(page.locator('.source-here')).toHaveAttribute('aria-label', 'Position in file');
    await expect(page.locator('.source-here-line')).toHaveText('L1');
    await expect(page.locator('.source-here [aria-live]')).toHaveCount(0);

    // Scroll to the middle of the first task: the chain names <tasks> then <task>, the line is one near the top.
    await page.evaluate(() => window.document.getElementById('L100')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect.poll(async () => Number((await page.locator('.source-here-line').first().textContent())?.slice(1))).toBeGreaterThan(80);
    const crumbs = page.locator('.source-here-crumb');
    await expect.poll(() => crumbs.count()).toBeGreaterThanOrEqual(2);
    await expect(crumbs.first()).toContainText('<tasks>');
    await expect(page.locator('.source-here-crumb', { hasText: '<task>' })).toHaveCount(1);
    await expect(page.locator('.source-here-crumb[data-current="true"]')).toHaveCount(1);
    await expect(crumbs.last()).toHaveAttribute('data-current', 'true');
    // The crumbs stay on one line: the Here row is no taller than a single line of text with its padding.
    const here = await page.locator('.source-here').boundingBox();
    expect(here?.height ?? 999).toBeLessThan(40);

    // The outer crumb jumps to its block's first line and flashes it.
    await crumbs.first().click();
    const target = Number(/L(\d+)–/.exec((await crumbs.first().getAttribute('title')) ?? '')?.[1]);
    await expect(page.locator(`#L${target}`)).toHaveAttribute('data-source-hit', 'true');
    await expect.poll(() => rowBelowBar(page, target)).toBe(true);
    await expect.poll(async () => (await page.locator('.source-here-line').first().textContent()) ?? '').toBe(`L${target}`);
    await expect(page.locator('.source-selection')).toHaveCount(0);
  });

  test('an "In the source only" link lands on its heading line: flashed, not selected, no fragment', async ({ page }) => {
    const path = await pathOf('phases/04-bulk-loan-export/04-VERIFICATION.md');
    await page.goto(await artifactUrl(FIXTURE_BASE_URL, path));
    await page.locator('.view-verification-rail').waitFor({ state: 'visible' });
    const urlBefore = page.url();
    await page.locator('#verification-also').getByRole('button', { name: 'Required Artifacts', exact: true }).click();
    const hit = page.locator('[data-source-hit]');
    await expect(hit).toHaveCount(1);
    await expect(hit).toContainText('## Required Artifacts');
    await expect(page.locator('.source-row[data-selected="true"]')).toHaveCount(0);
    await expect(page.locator('.source-selection')).toHaveCount(0);
    expect(page.url()).toBe(urlBefore);
    const line = Number((await hit.getAttribute('id'))?.slice(1));
    await expect.poll(() => rowBelowBar(page, line)).toBe(true);
  });
});
