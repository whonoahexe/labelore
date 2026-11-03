// Phase 9 (09-09): the built project page beside sketch 041 B. The winner is read from the sketch's README,
// the layout-contract facts of B (masthead, strip, spine, margin) are asserted on the build with bounding
// boxes at 1280px and 390px in light and dark, and for each of this repo's own PROJECT.md, the made-up
// Lendshed and the made-up Shapes (which carries the sketch's Kiln decisions) the build and the sketch are
// screenshot into test-results/phase-09/ (project-<name>-<width>-<theme>.png and ...-sketch.png), the pairs a
// person looks at beside the numbers (UI-SPEC populated backstop). Nothing about a private project is named
// here: a real PROJECT.md is only ever photographed into a temporary folder by hand.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, artifactUrl } from './app-url.ts';
import { FIXTURE_BASE_URL, SHAPES_BASE_URL } from './fixture-root.ts';
import { openSketch, sketchWinner } from './sketch-file.ts';

const SHOTS = fileURLToPath(new URL('../../test-results/phase-09', import.meta.url));
const SKETCH = '041-project-page';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Subject {
  name: string;
  base: string;
  /** The sketch's own project for this one (its `?p=`). */
  sketchProject: string;
  /** Rows the page must show at least. */
  minRows: number;
}

const SUBJECTS: Subject[] = [
  { name: 'labelore', base: BASE_URL, sketchProject: 'labelore', minRows: 27 },
  { name: 'lendshed', base: FIXTURE_BASE_URL, sketchProject: 'lendshed', minRows: 4 },
  { name: 'shapes', base: SHAPES_BASE_URL, sketchProject: 'kiln', minRows: 9 },
];

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error('project-page-screenshots.spec: an element has no box');
  return found;
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  // Let the font settle so both halves of a pair are at rest.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(SHOTS, name), fullPage: true, animations: 'disabled' });
}

const SLACK = 2;

test.describe('project page against sketch 041', () => {
  test('the sketch names B as its winner', () => {
    expect(sketchWinner(SKETCH)).toBe('B');
  });

  for (const subject of SUBJECTS) {
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ] as const) {
      for (const theme of ['light', 'dark'] as const) {
        test(`${subject.name} at ${width}px in ${theme}`, async ({ browser }) => {
          test.setTimeout(120_000);
          const context = await browser.newContext({ viewport: { width, height } });
          await context.addInitScript((value: string) => {
            window.localStorage.setItem('labelore-theme', value);
          }, theme);
          const page = await context.newPage();
          const sketch = await context.newPage();
          const label = `project-${subject.name}-${width}-${theme}`;

          try {
            const url = await artifactUrl(subject.base, '.planning/PROJECT.md');
            await page.goto(url);
            const root = page.locator('.view-project-page');
            await expect(root).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(theme === 'dark');
            await shoot(page, `${label}.png`);
            await openSketch(sketch, SKETCH, { theme, query: { p: subject.sketchProject } });
            await shoot(sketch, `${label}-sketch.png`);

            // One h1, the project's name.
            await expect(page.locator('h1')).toHaveCount(1);

            const identity = await box(root.locator('.view-project-id'));
            const core = await box(root.locator('.view-project-core'));
            const spine = await box(root.locator('.view-project-spine'));
            const margin = await box(root.locator('.view-project-margin'));
            const tiles = root.locator('.view-project-tile');
            const tileCount = await tiles.count();
            expect(tileCount).toBe(4);
            const tileBoxes: Box[] = [];
            for (let index = 0; index < tileCount; index += 1) tileBoxes.push(await box(tiles.nth(index)));
            const goal = await box(root.locator('.view-project-goal'));

            if (width >= 1000) {
              // The core card sits right of the identity column.
              expect(core.x).toBeGreaterThanOrEqual(identity.x + identity.width - SLACK);
              // The four tiles share one row with the goal cell.
              for (const tile of tileBoxes) expect(Math.abs(tile.y - goal.y)).toBeLessThanOrEqual(SLACK);
              // The margin sits right of the spine.
              expect(margin.x).toBeGreaterThanOrEqual(spine.x + spine.width - SLACK);
            } else {
              // The card sits below the identity.
              expect(core.y).toBeGreaterThanOrEqual(identity.y + identity.height - SLACK);
              // The tiles are two rows of two, under the goal cell.
              const rows = [...new Set(tileBoxes.map((tile) => Math.round(tile.y)))];
              expect(rows).toHaveLength(2);
              expect(Math.abs(tileBoxes[0].y - tileBoxes[1].y)).toBeLessThanOrEqual(SLACK);
              expect(Math.abs(tileBoxes[2].y - tileBoxes[3].y)).toBeLessThanOrEqual(SLACK);
              expect(tileBoxes[0].y).toBeGreaterThanOrEqual(goal.y + goal.height - SLACK);
              // The margin follows the spine.
              expect(margin.y).toBeGreaterThanOrEqual(spine.y + spine.height - SLACK);
              // No horizontal scroll.
              expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
            }

            // The jump strip holds one square per spine row, and the spine shows every row.
            const rows = await root.locator('.view-project-node').count();
            expect(rows).toBeGreaterThanOrEqual(subject.minRows);
            await expect(root.locator('.view-project-jump-sq')).toHaveCount(rows);

            // No outcome chip on a Good row: its square is complete and its only chip is the quiet tag.
            const goodRows = root.locator('.view-project-node').filter({ has: page.locator(".view-project-node-square[data-tone='complete']") });
            const goodCount = await goodRows.count();
            expect(goodCount).toBeGreaterThan(0);
            for (let index = 0; index < goodCount; index += 1) {
              const chips = goodRows.nth(index).locator('.status-chip');
              const chipCount = await chips.count();
              for (let chip = 0; chip < chipCount; chip += 1) {
                expect(await chips.nth(chip).getAttribute('data-tone')).toBe('quiet');
                expect((await chips.nth(chip).innerText()).trim().toLowerCase()).not.toBe('good');
              }
            }
          } finally {
            await context.close();
          }
        });
      }
    }
  }

  test('a jump square scrolls to its row and marks it; a row opens with its reason', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(await artifactUrl(SHAPES_BASE_URL, '.planning/PROJECT.md'));
      const root = page.locator('.view-project-page');
      await expect(root).toBeVisible();
      const squares = root.locator('.view-project-jump-sq');
      await expect(squares).toHaveCount(9);
      await squares.nth(7).click();
      const row = root.locator('#view-project-decision-8');
      await expect(row).toHaveAttribute('data-flash', 'true');
      await expect(row).toBeInViewport();
      // The mark clears by itself.
      await expect(row).not.toHaveAttribute('data-flash', 'true', { timeout: 5_000 });

      const first = root.locator('.view-project-node-btn').first();
      await expect(first).toHaveAttribute('aria-expanded', 'false');
      await first.press('Enter');
      await expect(first).toHaveAttribute('aria-expanded', 'true');
      await expect(root.getByText('How it turned out').first()).toBeVisible();
      await first.press('Space');
      await expect(first).toHaveAttribute('aria-expanded', 'false');

      const all = root.getByRole('button', { name: 'Show every reason' });
      await all.click();
      await expect(root.getByRole('button', { name: 'Hide every reason' })).toHaveAttribute('aria-pressed', 'true');
      await expect(root.locator('.view-project-node-btn[aria-expanded="true"]')).toHaveCount(9);
    } finally {
      await context.close();
    }
  });
});
