// The TODO page e2e (quick-261023-61k, sketch 027 C). The spec starts a read-only server on a thin temp
// project (ports 5310-5319 only, see todo-fixture-server.ts) holding the todos and notes of the committed
// fixture projects and the synthetic fixture, labelore's own promoted todo and the chrome-drift todo's
// closing quick task SUMMARY, and resolves each page by path against its live `/api/presentation` payload.
// The clock is fixed at the sketch's NOW (23 Oct 2026 12:00, Asia/Kolkata) so "Open N days" is stable. It
// asserts the foundation sweep's key invariants itself (one h1, squared corners, one chip signature, no
// 420px overflow) since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { startTodoFixtureServer } from './todo-fixture-server.ts';
import type { TodoFixtureServer } from './todo-fixture-server.ts';

interface PresentationLite {
  artifacts: { key: string; path: string; kind: string }[];
}

let server: TodoFixtureServer;

test.use({ timezoneId: 'Asia/Kolkata' });

test.beforeAll(async () => {
  test.setTimeout(120_000);
  server = await startTodoFixtureServer();
});

test.afterAll(async () => {
  await server?.stop();
});

async function presentation(): Promise<PresentationLite> {
  const response = await fetch(`${server.base}/api/presentation`);
  if (!response.ok) throw new Error(`todo-page.spec: /api/presentation responded ${response.status}`);
  return (await response.json()) as PresentationLite;
}

async function resolveKey(suffix: string): Promise<string> {
  const artifact = (await presentation()).artifacts.find((entry) => entry.path.endsWith(suffix));
  if (!artifact) throw new Error(`todo-page.spec: fixture artifact not found: ${suffix}`);
  return artifact.key;
}

const DCROP = 'todos/completed/2026-10-21-add-crop-and-round-profile-photos.md';
const SRETRY = 'todos/pending/2026-10-12-retry-queue-dead-letter.md';
const PCHECK = 'todos/pending/pre-milestone-hardware-and-tier-cleanup.md';
const LDRIFT = 'todos/done/artifact-chrome-drift.md';
const SPORT = 'todos/completed/2026-10-02-port-timezone-table.md';
const CROP_NOTE = 'notes/2026-10-21-crop-images-and-profile-photos.md';

async function openPage(page: Page, suffix: string, theme: 'light' | 'dark'): Promise<void> {
  const key = await resolveKey(suffix);
  await page.clock.setFixedTime(new Date('2026-10-23T12:00:00+05:30'));
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${server.base}${key}`);
  await page.locator('.view-todo-head').waitFor({ state: 'visible' });
}

const step = (page: Page, index: number): Locator => page.locator('.view-todo-steps > *').nth(index);
const stepTexts = async (page: Page, index: number): Promise<string[]> =>
  (await step(page, index).locator('span, b').allTextContents()).map((text) => text.trim());

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
        '.view-todo-step, .view-todo-stage, .view-todo-node, .view-todo-note, .view-todo-pair, .view-todo-part, .view-todo-files, .view-todo-fold, .view-todo-close, .view-todo-wait, .view-todo-pip, .view-todo-pip i, .view-todo-commit, main .status-chip',
      ),
    ).map((el) => getComputedStyle(el).borderTopLeftRadius),
  );
  expect(radii.length).toBeGreaterThan(6);
  expect(radii.every((r) => r === '0px')).toBe(true);
}

test.describe('Todo page', () => {
  test('a closed todo with a resolution and two notes, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, DCROP, 'light');

    await expect(page.locator('main h1')).toHaveText('Add crop and round profile photos');
    await expect(page.locator('.view-todo-meta-left .eyebrow')).toHaveText('Todo');
    await expect(page.locator('.view-todo-meta-left')).toContainText('Created 21 Oct 2026');
    const chips = page.locator('.view-todo-chips');
    await expect(chips.locator('.status-chip').first()).toHaveText('Done');
    await expect(chips.locator('.status-chip').first()).toHaveAttribute('data-tone', 'complete');
    await expect(chips.locator('.view-todo-pip')).toHaveText('Minor · priority low');
    await expect(chips.locator('.view-todo-pip')).toHaveAttribute('data-severity', 'low');
    await expect(chips.locator('.status-chip').nth(1)).toHaveText('media');

    expect(await stepTexts(page, 0)).toEqual(['Noted', '21 Oct 15:58', '2 notes · last 21 Oct 15:58']);
    expect(await stepTexts(page, 1)).toEqual(['Captured', '21 Oct 16:01', 'minor · media']);
    expect(await stepTexts(page, 2)).toEqual(['Closed', 'quick 261022-m25', '22 Oct 2026']);

    // A step jumps to its stage: the Captured stage lands in the top quarter of the viewport.
    await step(page, 1).click();
    await expect
      .poll(async () => (await page.locator('#todo-captured').boundingBox())?.y ?? Number.NaN)
      .toBeLessThan(225);
    expect((await page.locator('#todo-captured').boundingBox())!.y).toBeGreaterThanOrEqual(0);

    // Two source notes, both folded; unfolding grows the first.
    const cards = page.locator('.view-todo-note');
    await expect(cards).toHaveCount(2);
    await expect(cards.locator('.view-todo-link', { hasText: 'Unfold ↓' })).toHaveCount(2);
    const text = cards.first().locator('.view-todo-note-text');
    const before = (await text.boundingBox())!.height;
    await cards.first().getByRole('button', { name: 'Unfold ↓' }).click();
    await expect(cards.first().getByRole('button', { name: 'Fold ↑' })).toBeVisible();
    expect((await text.boundingBox())!.height).toBeGreaterThan(before);

    // Problem beside Solution at 1440.
    const parts = page.locator('.view-todo-part');
    await expect(parts.nth(0).locator('.view-todo-kicker').first()).toHaveText('Problem');
    await expect(parts.nth(1).locator('.view-todo-kicker').first()).toHaveText('Solution');
    const a = (await parts.nth(0).boundingBox())!;
    const b = (await parts.nth(1).boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x + a.width - 2);
    await expect(page.locator('.view-todo-files .view-todo-kicker')).toHaveText('Files · 5');
    await expect(page.locator('.view-todo-close')).toContainText('Done in quick task 261022-m25');
    await expect(page.locator('#todo-closed .view-todo-stage-head')).toContainText('quick 261022-m25 · 22 Oct 2026');

    // The first note's link opens that note's page; back returns to the todo.
    const todoUrl = page.url();
    await cards.first().getByRole('link', { name: 'Open note ↗' }).click();
    await expect(page).toHaveURL(new RegExp(encodeURIComponent('notes/2026-10-21-crop-images-and-profile-photos.md').replace(/\./g, '\\.')));
    await expect(page.locator('.view-todo-head')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(todoUrl);
    await page.locator('.view-todo-head').waitFor({ state: 'visible' });

    // Frontmatter opens the file in Source; View returns.
    await page.getByRole('button', { name: 'Frontmatter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-todo-head')).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-todo-head')).toBeVisible();
    await checkInvariants(page);

    // Problem and Solution stack at 820.
    await page.setViewportSize({ width: 820, height: 900 });
    const c = (await parts.nth(0).boundingBox())!;
    const d = (await parts.nth(1).boundingBox())!;
    expect(d.y).toBeGreaterThan(c.y + c.height - 2);
  });

  test('an open todo with no note, dark', async ({ page }) => {
    await openPage(page, SRETRY, 'dark');
    await expect(page.locator('.view-todo-chips .status-chip').first()).toHaveText('Pending');
    await expect(page.locator('.view-todo-chips .status-chip').first()).toHaveAttribute('data-tone', 'in-flight');
    const noted = step(page, 0);
    expect(await noted.evaluate((el) => el.tagName)).toBe('DIV');
    await expect(noted).toContainText('No note');
    await expect(page.locator('#todo-noted')).toHaveCount(0);
    await expect(step(page, 2)).toContainText('Open 11 days');
    await expect(page.locator('.view-todo-files .view-todo-kicker')).toHaveText('Files · 2');
    await expect(page.locator('.view-todo-file-range')).toHaveText('L88–140');
    await expect(page.locator('.view-todo-wait')).toContainText('Open 11 days. Nothing has closed it yet.');
    await checkInvariants(page);
  });

  test('a checklist todo whose text links a note, light', async ({ page }) => {
    await openPage(page, PCHECK, 'light');
    await expect(page.locator('.view-todo-part').nth(1).locator('.view-todo-kicker').first()).toHaveText('To do · 0 of 4');
    await expect(page.locator('.view-todo-check[data-done="false"]')).toHaveCount(4);
    await expect(page.locator('.view-todo-wait')).toContainText('— 0 of 4 items checked.');
    const link = page.locator('.view-todo-part').first().locator('a.view-todo-ref');
    await expect(link).toHaveText('notes/2026-10-23-studio-media-workflow-milestone-brief.md');
    await link.click();
    await expect(page).toHaveURL(/studio-media-workflow-milestone-brief\.md/);
    await expect(page.locator('.view-todo-head')).toHaveCount(0);
  });

  test('a todo closed by a callout with commits, light', async ({ page }) => {
    await openPage(page, LDRIFT, 'light');
    await expect(page.locator('.view-todo-note .view-todo-kicker').nth(1)).toHaveText('Linked in the text');
    await expect(page.locator('.view-todo-fold')).toHaveCount(4);
    await page.locator('.view-todo-fold').last().locator('summary').click();
    await expect(page.locator('.view-todo-fold').last().locator('a.view-todo-ref')).toHaveText('per-kind-artifact-rendering');
    await expect(page.locator('.view-todo-commit')).toHaveCount(3);
    await expect(page.locator('.view-todo-close')).toContainText('Closed 2026-09-20.');
    const quick = page.locator('#todo-closed .view-todo-stage-head a', { hasText: 'quick 260920-mzr' });
    await expect(quick).toHaveCount(1);
    await expect(quick).toHaveAttribute('href', /260920-mzr-SUMMARY\.md/);
    await quick.click();
    await expect(page).toHaveURL(/260920-mzr-SUMMARY\.md/);
    await expect(page.locator('.view-todo-head')).toHaveCount(0);
  });

  test('a todo with nothing below the frontmatter, light', async ({ page }) => {
    await openPage(page, SPORT, 'light');
    await expect(page.locator('.view-todo-empty')).toHaveText('Nothing below the frontmatter — the title is the whole todo.');
    await expect(page.locator('.view-todo-wait')).toHaveText('Moved to todos/completed/ with no resolution written.');
  });

  test('a note is not a todo page', async ({ page }) => {
    const key = await resolveKey(CROP_NOTE);
    await page.goto(`${server.base}${key}`);
    await page.locator('main h1').first().waitFor({ state: 'visible' });
    await expect(page.locator('.view-todo-head')).toHaveCount(0);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every todo page fits 420px in ${theme}, with one h1 and squared corners`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: 420, height: 900 });
      const todos = (await presentation()).artifacts.filter((entry) => entry.kind === 'todo');
      expect(todos.length).toBeGreaterThanOrEqual(11);
      for (const todo of todos) {
        await openPage(page, todo.path, theme);
        await checkInvariants(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, todo.path).toBeLessThanOrEqual(0);
      }
    });
  }
});
