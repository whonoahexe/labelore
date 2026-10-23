// The NOTE page e2e (quick-261023-61l, sketch 028 A). The spec starts a read-only server on a thin temp
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
const PBRIEF = 'notes/2026-10-23-studio-media-workflow-milestone-brief.md';

async function openPage(page: Page, suffix: string, theme: 'light' | 'dark'): Promise<void> {
  const key = await resolveKey(suffix);
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${server.base}${key}`);
  await page.locator('.view-note-head').waitFor({ state: 'visible' });
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
        '.view-note-todo, .view-note-label, .view-note-ref, .view-note-toggle, .view-note-toggle button, .view-note-weight, .view-note-weight i, .view-note-verbatim, .view-note-whole, main .status-chip',
      ),
    ).map((el) => getComputedStyle(el).borderTopLeftRadius),
  );
  expect(radii.length).toBeGreaterThan(0);
  expect(radii.every((r) => r === '0px')).toBe(true);
}

test.describe('Note page', () => {
  test('a quick note with a todo it became, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, DCROP, 'light');

    await expect(page.locator('main h1')).toHaveText('Crop for images before sending and for profile photos (she asked for it).');
    await expect(page.locator('.view-note-meta-left .eyebrow')).toHaveText('Note');
    await expect(page.locator('.view-note-date')).toHaveText('Noted 21 Oct 2026 · 15:58');
    await expect(page.locator('.view-note-meta-left .status-chip').first()).toHaveText('Now a todo');
    await expect(page.locator('.view-note-meta-left .status-chip').first()).toHaveAttribute('data-tone', 'complete');
    await expect(page.locator('.view-note-toggle button[aria-pressed="true"]')).toHaveText('Lifted');
    await expect(page.locator('.view-note-clause')).toHaveCount(6);
    await expect(page.locator('.view-note-gutter')).toHaveText(['Today', 'Decided · 21 Oct 2026', 'How', 'Preset constraint', 'Estimated', 'Batch']);
    await expect(page.locator('.view-note-label', { hasText: 'Decided' })).toHaveAttribute('data-tone', 'complete');

    // The card.
    const card = page.locator('.view-note-todo');
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
    const todoLink = card.getByRole('link', { name: 'Open todo ↗' });
    await expect(todoLink).toHaveAttribute('href', /add-crop-and-round-profile-photos\.md/);

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
    await expect(page.locator('.view-note-clause')).toHaveCount(0);
    await page.getByRole('button', { name: 'Lifted', exact: true }).click();
    await expect(page.locator('.view-note-clause')).toHaveCount(6);

    // A batched row opens the round note; Back returns.
    const noteUrl = page.url();
    await card.locator('.view-note-sibling').click();
    await expect(page.locator('main h1')).toHaveText('Round profile photos everywhere, including the notification icon.');
    await page.goBack();
    await expect(page).toHaveURL(noteUrl);
    await page.locator('.view-note-head').waitFor({ state: 'visible' });

    // Frontmatter opens the file in Source; View returns.
    await expect(page.locator('.view-note-also .status-chip')).toHaveText(['Frontmatter']);
    await page.getByRole('button', { name: 'Frontmatter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-note-head')).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-note-head')).toBeVisible();
    await checkInvariants(page);
  });

  test('a promoted note with no todo, dark', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, PCAP, 'dark');
    await expect(page.locator('.view-note-gutter')).toHaveText(['Today', 'Wanted', 'Known gap']);
    await expect(page.locator('.view-note-mentions .view-note-kicker')).toHaveText('Mentions · 2');
    await expect(page.locator('.view-note-ident')).toHaveCount(5);
    await expect(page.locator('.view-note-meta-left .status-chip').first()).toHaveText('Promoted');
    const card = page.locator('.view-note-todo');
    await expect(card).toHaveAttribute('data-status', 'none');
    await expect(card.locator('.view-note-kicker')).toHaveText('Promoted, but untraced');
    await checkInvariants(page);
  });

  test('a one-line note that became a todo by its text, light', async ({ page }) => {
    await openPage(page, STAR, 'light');
    await expect(page.locator('.view-note-title')).toHaveAttribute('data-short', 'true');
    await expect(page.locator('.view-note-whole')).toHaveText('That’s the whole note — one line.');
    await expect(page.locator('.view-note-toggle')).toHaveCount(0);
    await expect(page.locator('.view-note-mentions')).toHaveCount(0);
    const card = page.locator('.view-note-todo');
    await expect(card.locator('.view-note-kicker').first()).toHaveText('Became a todo');
    await expect(card.locator('.status-chip').first()).toHaveText('Pending');
    await expect(card.locator('.view-note-weight')).toHaveText('P2');
    await expect(card.locator('.view-note-weight')).toHaveAttribute('data-level', 'medium');
    await expect(card.locator('.view-note-via')).toHaveText('Promoted from this note word for word');
  });

  test('a note that was not promoted', async ({ page }) => {
    await openPage(page, SUNDO, 'light');
    await expect(page.locator('.view-note-meta-left .status-chip').first()).toHaveText('Not promoted');
    const card = page.locator('.view-note-todo');
    await expect(card.locator('.view-note-kicker')).toHaveText('Still a note');
    await expect(card.locator('.view-note-none')).toHaveText('Not promoted to a todo.');
  });

  test("labelore's own sketches note: a Then row first", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, LSK, 'light');
    await expect(page.locator('main h1')).toHaveText('Show sketches inside Labelore instead of a separate file server.');
    await expect(page.locator('.view-note-gutter').first()).toHaveText('Then');
    await expect(page.locator('.view-note-gutter')).toHaveText(['Then', 'Want', 'Open question', 'Open question', 'Today', 'Suggested interim']);
    const card = page.locator('.view-note-todo');
    await expect(card.locator('.view-note-kicker').first()).toHaveText('Became a todo');
    await expect(card.locator('.status-chip').first()).toHaveText('Pending');
    await expect(card.locator('.view-note-weight')).toHaveText('P2');
    await expect(page.locator('.view-note-mentions .view-note-kicker')).toHaveText('Mentions · 3');
  });

  test('an explore note reads as a document with contents, light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPage(page, LPERKIND, 'light');
    await expect(page.locator('main h1')).toHaveText('Per-kind artifact rendering — parsing, design language, and categorization');
    await expect(page.locator('.view-note-lede')).toContainText('/gsd-explore session');
    await expect(page.locator('.view-note-toggle')).toHaveCount(0);
    await expect(page.locator('.view-note-mentions')).toHaveCount(0);
    await expect(page.locator('.view-note-contents .view-note-kicker')).toHaveText('In this note · 6');
    await expect(page.locator('.view-note-contents button')).toHaveCount(6);
    const card = page.locator('.view-note-todo');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.view-note-kicker').first()).toHaveText('Related todo');
    await expect(card.locator('.view-note-via')).toHaveText('Links this note in its text');

    // Jumping to a heading brings its top into the viewport, with no animation.
    await page.locator('.view-note-contents button', { hasText: 'Delivery shape' }).click();
    const top = await page.locator('.view-note-doc h2', { hasText: 'Delivery shape' }).evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(450);
  });

  test('a milestone brief with two related todos, light', async ({ page }) => {
    await openPage(page, PBRIEF, 'light');
    await expect(page.locator('.view-note-todo .view-note-kicker:first-child')).toHaveText(['Related todo', 'Related todo']);
    await expect(page.locator('.view-note-todo-title')).toHaveText([
      "Portal should detect when a tier's device has vanished under its mount",
      'Pre-milestone: fix server Ethernet, fsck vault, clean up tiers',
    ]);
    await expect(page.locator('.view-note-contents button')).toHaveCount(3);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every note page fits 420px in ${theme}, with one h1 and squared corners`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: 420, height: 900 });
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
});
