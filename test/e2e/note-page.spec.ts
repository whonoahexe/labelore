// The NOTE page e2e (quick-261023-61l, sketch 028 A; quick-261023-u13, sketch 029 A: gist console). The spec starts a read-only server on a thin temp
// project (ports 5310-5319 only, see note-fixture-server.ts) holding the notes and todos of the committed
// fixture project, the synthetic fixture and this repo's own `.planning/`, and resolves each page by path
// against its live `/api/presentation` payload. It asserts the foundation sweep's key invariants itself
// (one h1, squared corners, one chip signature, no 420px overflow) since the full sweep is too slow to run
// per change. The browser context is granted clipboard access so copying a file reference can be read back.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { startNoteFixtureServer } from './note-fixture-server.ts';
import type { NoteFixtureServer } from './note-fixture-server.ts';

interface PresentationLite {
  artifacts: { key: string; path: string; kind: string }[];
}

let server: NoteFixtureServer;

test.use({ timezoneId: 'Asia/Kolkata', permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeAll(async () => {
  test.setTimeout(120_000);
  server = await startNoteFixtureServer();
});

test.afterAll(async () => {
  await server?.stop();
});

async function presentation(): Promise<PresentationLite> {
  const response = await fetch(`${server.base}/api/presentation`);
  if (!response.ok) throw new Error(`note-page.spec: /api/presentation responded ${response.status}`);
  return (await response.json()) as PresentationLite;
}

async function resolveKey(suffix: string): Promise<string> {
  const artifact = (await presentation()).artifacts.find((entry) => entry.path.endsWith(suffix));
  if (!artifact) throw new Error(`note-page.spec: fixture artifact not found: ${suffix}`);
  return artifact.key;
}

const DCROP = 'notes/2026-10-21-crop-images-and-profile-photos.md';
const PCAP = 'notes/2026-10-21-raise-single-file-download-cap.md';
const STAR = 'notes/2026-10-16-tariff-note-tooltips.md';
const SUNDO = 'notes/2026-10-08-brokers-want-undo.md';
const LSK = 'notes/2026-10-23-sketches-page-in-labelore.md';
const LPERKIND = 'notes/per-kind-artifact-rendering.md';
const LSURVEY = 'notes/artifact-structure-survey.md';
const PBRIEF = 'notes/2026-10-23-studio-media-workflow-milestone-brief.md';

async function openPage(page: Page, suffix: string, theme: 'light' | 'dark'): Promise<void> {
  const key = await resolveKey(suffix);
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${server.base}${key}`);
  await page.locator('.view-note-rail').waitFor({ state: 'visible' });
}

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
        '.view-note-stage, .view-note-big, .view-note-row, .view-note-part, .view-note-label, .view-note-figure, .view-note-todo, .view-note-toggle, .view-note-toggle button, .view-note-ref, .view-note-weight, .view-note-weight i, .view-note-verbatim, .view-note-whole, .view-note-read, .view-note-mention, main .status-chip',
      ),
    ).map((el) => getComputedStyle(el).borderTopLeftRadius),
  );
  expect(radii.length).toBeGreaterThan(0);
  expect(radii.every((r) => r === '0px')).toBe(true);
}

async function statRows(page: Page): Promise<string[][]> {
  return page.locator('.view-note-stats > div').evaluateAll((rows) =>
    rows.map((row) => [row.querySelector('dt')?.textContent ?? '', row.querySelector('dd')?.textContent ?? '']),
  );
}

test.describe('Note page', () => {
  test('a dense quick note with a todo it became, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, DCROP, 'light');
    await expect(page.locator('main h1')).toHaveText('Crop images and profile photos');
    await expect(page.locator('.view-note-rail h1')).toHaveCount(1);
    await expect(page.locator('.view-note-rail .eyebrow')).toHaveText('Note');
    const stage = page.locator('.view-note-stage');
    await expect(stage).toHaveText('Shipped');
    await expect(stage).toHaveAttribute('data-stage', 'done');
    await expect(page.locator('.view-note-big b')).toHaveText('6');
    await expect(page.locator('.view-note-big-label')).toHaveText('things it says, after the gist');
    await expect(page.locator('.view-note-big-sub')).toHaveText('1 decided · 1 ask · 1 problem · 3 limits');
    const stats = await statRows(page);
    expect(stats.filter(([label]) => label !== 'Age')).toEqual([
      ['Noted', '21 Oct 2026 · 15:58'],
      ['Promoted', 'Yes'],
      ['Todo', 'Done'],
      ['Note → shipped', '2 days'],
      ['Mentions', '1'],
      ['Words', '228'],
    ]);
    expect(stats.find(([label]) => label === 'Age')?.[1]).toMatch(/^(\d+ days?|less than a day)$/);
    await expect(page.locator('.view-note-stats dd', { hasText: 'Done' })).toHaveAttribute('data-tone', 'complete');
    await expect(page.locator('.view-note-say')).toContainText('Crop for images before sending');
    await expect(page.locator('.view-note-line')).toHaveText('Became a todo and shipped 22 Oct 2026.');
    await expect(page.locator('.view-note-toggle button[aria-pressed="true"]')).toHaveText('Lifted');
    await expect(page.locator('.view-note-ledger-head h2')).toHaveText('What it says');
    await expect(page.locator('.view-note-row')).toHaveCount(6);
    await expect(page.locator('.view-note-index')).toHaveText(['01', '02', '03', '04', '05', '06']);
    await expect(page.locator('.view-note-gutter')).toHaveText(['Today', 'Decided · 21 Oct 2026', 'How', 'Preset constraint', 'Estimated', 'Batch']);
    await expect(page.locator('.view-note-label', { hasText: 'Decided' })).toHaveAttribute('data-tone', 'complete');
    await expect(page.locator('.view-note-row').first()).toHaveAttribute('data-tone', 'in-flight');

    // The card sits in the rail.
    const card = page.locator('.view-note-rail .view-note-todo');
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('data-status', 'done');
    await expect(card.locator('.view-note-kicker').first()).toHaveText('Became a todo');
    await expect(card.locator('.status-chip').first()).toHaveText('Done');
    await expect(card.locator('.view-note-weight')).toHaveText('Minor');
    await expect(card.locator('.view-note-weight')).toHaveAttribute('data-level', 'low');
    await expect(card.locator('.status-chip').nth(1)).toHaveText('media');
    await expect(card.locator('.view-note-todo-title')).toHaveText('Add crop and round profile photos');
    await expect(card.locator('.view-note-via')).toHaveText('Names this note in notes:');
    await expect(card.locator('.view-note-resolution')).toContainText('Done in quick task 261022-m25');
    await expect(card.locator('.view-note-sibling')).toHaveCount(1);
    await expect(card.getByRole('link', { name: 'Open todo ↗' })).toHaveAttribute('href', /add-crop-and-round-profile-photos\.md/);

    // Mentions: a click copies the path, presses the row and the in-text reference, and says Copied.
    await expect(page.locator('.view-note-mentions .view-note-kicker')).toHaveText('Mentions · 1');
    const mention = page.locator('.view-note-mention');
    const inText = page.locator('.view-note-text .view-note-ref');
    await mention.click();
    await expect(mention).toHaveAttribute('aria-pressed', 'true');
    await expect(inText).toHaveAttribute('aria-pressed', 'true');
    await expect(mention.locator('.view-note-copied')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('server/src/media/image.ts');
    await expect(mention.locator('.view-note-copied')).toHaveText('', { timeout: 4000 });
    await inText.click();
    await expect(mention).toHaveAttribute('aria-pressed', 'false');

    // As written: one paragraph and no rows; Lifted brings the rows back.
    await page.getByRole('button', { name: 'As written', exact: true }).click();
    await expect(page.locator('.view-note-verbatim')).toHaveCount(1);
    await expect(page.locator('.view-note-row')).toHaveCount(0);
    await page.getByRole('button', { name: 'Lifted', exact: true }).click();
    await expect(page.locator('.view-note-row')).toHaveCount(6);

    // A batched row opens the round note; Back returns.
    const noteUrl = page.url();
    await card.locator('.view-note-sibling').click();
    await expect(page.locator('main h1')).toHaveText('Round profile photos');
    await page.goBack();
    await expect(page).toHaveURL(noteUrl);
    await page.locator('.view-note-rail').waitFor({ state: 'visible' });

    // Frontmatter opens the file in Source; View returns to the rail.
    await expect(page.locator('.view-note-also .status-chip')).toHaveText(['Frontmatter']);
    await page.getByRole('button', { name: 'Frontmatter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-note-rail')).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-note-rail')).toBeVisible();
    await checkInvariants(page);
  });

  test('an untraced note, dark', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, PCAP, 'dark');
    await expect(page.locator('.view-note-stage')).toHaveText('Untraced');
    await expect(page.locator('.view-note-stage')).toHaveAttribute('data-stage', 'untraced');
    await expect(page.locator('.view-note-big b')).toHaveText('3');
    await expect(page.locator('.view-note-gutter')).toHaveText(['Today', 'Wanted', 'Known gap']);
    await expect(page.locator('.view-note-mentions .view-note-kicker')).toHaveText('Mentions · 2');
    await expect(page.locator('.view-note-ident')).toHaveCount(5);
    const card = page.locator('.view-note-todo');
    await expect(card).toHaveAttribute('data-status', 'none');
    await expect(card.locator('.view-note-kicker')).toHaveText('Promoted, but untraced');
    await checkInvariants(page);
  });

  test('a one-line note that became a todo by its text, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, STAR, 'light');
    await expect(page.locator('.view-note-rail h1')).toHaveText('Tariff note tooltips');
    await expect(page.locator('.view-note-stage')).toHaveText('Todo open');
    await expect(page.locator('.view-note-big b')).toHaveText('1');
    await expect(page.locator('.view-note-big-label')).toHaveText('line, nothing else to lift');
    await expect(page.locator('.view-note-big-sub')).toHaveText('11 words · Became a todo, still open.');
    await expect(page.locator('.view-note-whole')).toHaveText('That’s the whole note: one line.');
    await expect(page.locator('.view-note-toggle')).toHaveCount(0);
    await expect(page.locator('.view-note-mentions')).toHaveCount(0);
    await expect(page.locator('.view-note-rail .view-note-todo')).toHaveCount(0);
    await expect(page.locator('.view-note-ledger-head h2')).toHaveText('Where it went');
    const card = page.locator('.view-note-ledger .view-note-todo');
    await expect(card.locator('.view-note-kicker').first()).toHaveText('Became a todo');
    await expect(card.locator('.status-chip').first()).toHaveText('Pending');
    await expect(card.locator('.view-note-weight')).toHaveText('P2');
    await expect(card.locator('.view-note-weight')).toHaveAttribute('data-level', 'medium');
    await expect(card.locator('.view-note-via')).toHaveText('Promoted from this note word for word');
    await checkInvariants(page);
  });

  test('a one-line note that was not promoted', async ({ page }) => {
    await openPage(page, SUNDO, 'light');
    await expect(page.locator('.view-note-stage')).toHaveText('Still a note');
    await expect(page.locator('.view-note-stage')).toHaveAttribute('data-stage', 'note');
    await expect(page.locator('.view-note-stats dd', { hasText: /^No$/ })).toHaveAttribute('data-tone', 'missing');
    await expect(page.locator('.view-note-whole')).toHaveText('That’s the whole note: one line. It hasn’t been promoted to a todo.');
    const card = page.locator('.view-note-todo');
    await expect(card.locator('.view-note-kicker')).toHaveText('Still a note');
    await expect(card.locator('.view-note-none')).toHaveText('Not promoted to a todo.');
  });

  test("labelore's own sketches note: a Then row first and two Open questions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, LSK, 'light');
    await expect(page.locator('.view-note-rail h1')).toHaveText('Sketches page in labelore');
    await expect(page.locator('.view-note-say')).toHaveText('Show sketches inside Labelore instead of a separate file server.');
    await expect(page.locator('.view-note-stage')).toHaveText('Todo open');
    await expect(page.locator('.view-note-big b')).toHaveText('6');
    await expect(page.locator('.view-note-big-sub')).toHaveText('1 ask · 1 problem · 2 open questions · 2 other');
    await expect(page.locator('.view-note-gutter')).toHaveText(['Then', 'Want', 'Open question', 'Open question', 'Today', 'Suggested interim']);
    await expect(page.locator('.view-note-label[data-tone="missing"]')).toHaveCount(2);
    const card = page.locator('.view-note-rail .view-note-todo');
    await expect(card.locator('.view-note-kicker').first()).toHaveText('Became a todo');
    await expect(card.locator('.status-chip').first()).toHaveText('Pending');
    await expect(card.locator('.view-note-weight')).toHaveText('P2');
    await expect(page.locator('.view-note-mentions .view-note-kicker')).toHaveText('Mentions · 3');
  });

  test('an explore note opens on its gist and reads section by section, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, LPERKIND, 'light');
    await expect(page.locator('main h1')).toHaveText('Per-kind artifact rendering — parsing, design language, and categorization');
    await expect(page.locator('.view-note-rail .eyebrow')).toHaveText('Explore note');
    await expect(page.locator('.view-note-context')).toContainText('/gsd-explore session');
    await expect(page.locator('.view-note-stage')).toHaveText('5 sections');
    await expect(page.locator('.view-note-big b')).toHaveText('3');
    await expect(page.locator('.view-note-big-label')).toHaveText('measured figures');
    await expect(page.locator('.view-note-big-sub')).toHaveText('27 points across 5 sections · 2 calls flagged');
    await expect(page.locator('.view-note-say')).toHaveAttribute('data-long', 'true');
    await expect(page.locator('.view-note-line')).toContainText('Five sections:');
    await expect(page.locator('.view-note-ledger-head h2')).toHaveText('Section by section');
    const parts = page.locator('.view-note-part');
    await expect(parts).toHaveCount(5);
    await expect(parts.nth(0).locator('.view-note-label')).toHaveText('Corrected');
    await expect(parts.nth(0).locator('.view-note-label')).toHaveAttribute('data-tone', 'in-flight');
    await expect(parts.nth(2).locator('.view-note-label')).toHaveText('Resolved');
    await expect(parts.nth(2).locator('.view-note-label')).toHaveAttribute('data-tone', 'complete');
    await expect(page.locator('.view-note-todo')).toHaveCount(1);
    await expect(page.locator('.view-note-todo .view-note-kicker').first()).toHaveText('Related todo');

    // Read + opens the section as the app renders it, in place, and Fold - closes it.
    const read = parts.nth(0).locator('.view-note-read');
    await expect(read).toHaveText('Read +');
    await read.click();
    await expect(read).toHaveText('Fold –');
    await expect(read).toHaveAttribute('aria-expanded', 'true');
    await expect(parts.nth(0).locator('.view-note-full table')).toHaveCount(1);
    await expect(parts.nth(0).locator('.view-note-items')).toHaveCount(0);
    await expect(parts.nth(1).locator('.view-note-full')).toHaveCount(0);
    expect(page.url()).not.toContain('#');
    await read.click();
    await expect(read).toHaveText('Read +');
    await expect(parts.nth(0).locator('.view-note-full')).toHaveCount(0);

    // As written shows the whole document as the app renders it; Lifted returns.
    await page.getByRole('button', { name: 'As written', exact: true }).click();
    await expect(page.locator('.view-note-doc h2', { hasText: 'Delivery shape' })).toBeVisible();
    await expect(page.locator('.view-note-part')).toHaveCount(0);
    await page.getByRole('button', { name: 'Lifted', exact: true }).click();
    await expect(page.locator('.view-note-part')).toHaveCount(5);
    await checkInvariants(page);
  });

  test('a milestone brief: figures, items, flags and two related todos, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, PBRIEF, 'light');
    await expect(page.locator('.view-note-big b')).toHaveText('7');
    await expect(page.locator('.view-note-big-sub')).toHaveText('15 points across 3 sections · 5 calls flagged');
    await expect(page.locator('.view-note-big')).toHaveAttribute('data-stage', 'untraced');
    await expect(page.locator('.view-note-say')).toHaveText('Three sections: 7 features, footage facts and 3 network facts.');
    await expect(page.locator('.view-note-line')).toContainText('Captured from an exploration session');
    const first = page.locator('.view-note-part').first();
    await expect(first.locator('.view-note-items li:not(.view-note-more)')).toHaveCount(4);
    await expect(first.locator('.view-note-more')).toHaveText('+3 more');
    await expect(first.locator('.view-note-flags .view-note-label')).toHaveText(['Open question', 'Rejected', 'Blocked']);
    await expect(first.locator('.view-note-figure')).toHaveCount(2);
    await expect(page.locator('.view-note-todo .view-note-kicker:first-child')).toHaveText(['Related todo', 'Related todo']);
    await expect(page.locator('.view-note-todo-title')).toHaveText([
      "Portal should detect when a tier's device has vanished under its mount",
      'Pre-milestone: fix server Ethernet, fsck vault, clean up tiers',
    ]);
  });

  test('the survey: six sections, eight figures and no todo points here', async ({ page }) => {
    await openPage(page, LSURVEY, 'light');
    await expect(page.locator('.view-note-big b')).toHaveText('8');
    await expect(page.locator('.view-note-part')).toHaveCount(6);
    await expect(page.locator('.view-note-todo')).toHaveCount(1);
    await expect(page.locator('.view-note-todo .view-note-kicker')).toHaveText('No todo points here');
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 420] as const) {
      test(`every note page fits ${width}px in ${theme}, with one h1 and squared corners`, async ({ page }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({ width, height: 900 });
        const notes = (await presentation()).artifacts.filter((entry) => entry.kind === 'note');
        expect(notes.length).toBeGreaterThanOrEqual(12);
        for (const note of notes) {
          await openPage(page, note.path, theme);
          await checkInvariants(page);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, note.path).toBeLessThanOrEqual(0);
        }
      });
    }
  }
});
