// The LEARNINGS page e2e (quick-261017-k45, sketch 024 winner E). Labelore's own `.planning` holds no
// LEARNINGS file, so the spec starts the shared fixture server (ports 5310-5319 only, see
// fixture-server.ts) on a thin temp project holding the synthetic phase 5 file, the Lendshed phase 1 file
// and the dense project-root file, all in-repo placements, and resolves each page by path against its live
// `/api/presentation` payload. It asserts the foundation sweep's key invariants itself (one h1, an
// eyebrow, squared corners, one chip signature, no 420px overflow) since the full sweep is too slow to
// run per change.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { startFixtureServer } from './fixture-server.ts';
import type { FixtureServer } from './fixture-server.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

let server: FixtureServer;

test.beforeAll(async () => {
  test.setTimeout(120_000);
  server = await startFixtureServer([
    {
      from: 'test/fixtures/learnings/synthetic-LEARNINGS.md',
      to: '.planning/phases/05-per-type-document-views/05-LEARNINGS.md',
    },
    {
      from: 'test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-LEARNINGS.md',
      to: '.planning/phases/01-member-sign-in-sessions/01-LEARNINGS.md',
    },
    { from: 'fixtures/dense/.planning/LEARNINGS.md', to: '.planning/LEARNINGS.md' },
  ]);
});

test.afterAll(async () => {
  await server?.stop();
});

async function artifactKeys(): Promise<PresentationLite['artifacts']> {
  const response = await fetch(`${server.base}/api/presentation`);
  if (!response.ok) throw new Error(`learnings-page.spec: /api/presentation responded ${response.status}`);
  return ((await response.json()) as PresentationLite).artifacts;
}

async function resolveKey(match: (path: string) => boolean): Promise<string> {
  const artifact = (await artifactKeys()).find((entry) => match(entry.path));
  if (!artifact) throw new Error('learnings-page.spec: fixture artifact not found');
  return artifact.key;
}

const LX01 = (path: string): boolean => path.endsWith('01-member-sign-in-sessions/01-LEARNINGS.md');
const SYN = (path: string): boolean => path.endsWith('05-per-type-document-views/05-LEARNINGS.md');
const ROOT = (path: string): boolean => path.endsWith('.planning/LEARNINGS.md');

async function openPage(page: Page, key: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${server.base}${key}`);
  await page.locator('.view-learnings-head').waitFor({ state: 'visible' });
}

const tab = (page: Page, kind: string): Locator => page.locator(`.view-learnings-tab[data-kind="${kind}"]`);
const entry = (page: Page, no: number): Locator =>
  page.locator('.view-learnings-entry').filter({ has: page.locator('.view-learnings-no', { hasText: new RegExp(`^${no}$`) }) });

async function checkInvariants(page: Page): Promise<void> {
  await expect(page.locator('main h1')).toHaveCount(1);
  const signatures = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
      const c = getComputedStyle(el);
      return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
    }),
  );
  expect(new Set(signatures).size).toBe(1);
  const radii = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.view-learnings-segment, .view-learnings-tab, .view-learnings-graduated, .view-learnings-missing, .view-learnings-entry',
      ),
    ).map((el) => getComputedStyle(el).borderTopLeftRadius),
  );
  expect(radii.length).toBeGreaterThan(5);
  expect(radii.every((r) => r === '0px')).toBe(true);
}

test.describe('Learnings page', () => {
  test('Lendshed phase 1', async ({ page }) => {
    await openPage(page, await resolveKey(LX01), 'light');

    await expect(page.locator('h1')).toHaveText('Member Sign-In & Sessions');
    await expect(page.locator('.view-learnings-meta-left .eyebrow')).toHaveText('Learnings · Phase 1');
    await expect(page.locator('.view-learnings-meta-left')).toContainText('Extracted 14 Mar 2026');
    await expect(page.locator('.view-learnings-lede')).toHaveText(
      '40 learnings from this phase: 14 decisions, 9 lessons, 10 patterns and 7 surprises, drawn from 10 artifacts.',
    );
    await expect(page.locator('.view-learnings-segment')).toHaveCount(10);
    await expect(page.locator('.view-learnings-tab')).toHaveCount(4);
    await expect(page.locator('.view-learnings-tab b')).toHaveText(['14', '9', '10', '7']);
    await expect(tab(page, 'decision')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.view-learnings-entry')).toHaveCount(14);
    await expect(entry(page, 1)).toContainText('Every sign-in failure returns one identical 401 body');

    // Arrow keys move between tabs.
    await tab(page, 'decision').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'lesson')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.view-learnings-entry')).toHaveCount(9);
    await expect(page.locator('.view-learnings-no').first()).toHaveText('15');
    await expect(page.locator('.view-learnings-no').last()).toHaveText('23');
    await page.keyboard.press('End');
    await expect(tab(page, 'surprise')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tab(page, 'decision')).toHaveAttribute('aria-selected', 'true');

    // Picking REVIEW narrows every chapter to that source.
    await page.locator('.view-learnings-segment[title^="01-REVIEW.md"]').click();
    await expect(page.locator('.view-learnings-filterline')).toContainText('Showing the 1 learning from 01-REVIEW.md');
    await expect(page.locator('.view-learnings-tab:disabled')).toHaveCount(3);
    await expect(tab(page, 'surprise')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.view-learnings-count')).toHaveText('1 of 7');
    await expect(page.locator('.view-learnings-entry')).toHaveCount(1);
    await expect(entry(page, 40)).toContainText('Two review findings were still open at the verification pass');
    await page.getByRole('button', { name: 'Show all' }).click();
    await expect(page.locator('.view-learnings-tab:disabled')).toHaveCount(0);
    await expect(page.locator('.view-learnings-filterline')).toHaveCount(0);

    // Entries that go straight to a field have a title and a side note, but no body.
    await tab(page, 'pattern').click();
    for (const no of [26, 28]) {
      await expect(entry(page, no).locator('.view-learnings-main h3')).toHaveCount(1);
      await expect(entry(page, no).locator('.view-learnings-main p')).toHaveCount(0);
      await expect(entry(page, no).locator('.view-learnings-side')).toContainText('When to use');
    }

    await checkInvariants(page);

    // The Frontmatter chip opens Source mode; View returns to the head.
    await page.getByRole('button', { name: 'Frontmatter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-learnings-head')).toHaveCount(0);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-learnings-head')).toBeVisible();
  });

  test('synthetic phase 5, dark', async ({ page }) => {
    await openPage(page, await resolveKey(SYN), 'dark');
    await expect(page.locator('.view-learnings-meta-left .eyebrow')).toHaveText('Learnings · Phase 5');
    await expect(page.locator('.view-learnings-missing')).toHaveText(
      'Extracted without 05-UAT.md — learnings from it are not here.',
    );
    await expect(page.locator('.view-learnings-graduated')).toHaveCount(1);
    await expect(page.locator('.view-learnings-graduated')).toHaveText('Graduated to docs/design-language.md');
    await expect(page.locator('.view-learnings-segment')).toHaveCount(8);
    await checkInvariants(page);
  });

  test('project-root file', async ({ page }) => {
    await openPage(page, await resolveKey(ROOT), 'light');
    await expect(page.locator('.view-learnings-meta-left .eyebrow')).toHaveText('Learnings · Project');
    await expect(page.locator('h1')).toHaveText('Dense Fixture Project');
    await expect(page.locator('.view-learnings-segment')).toHaveCount(2);
    await expect(page.locator('.view-learnings-segment').first()).toContainText('D-01');
    await expect(page.locator('.view-learnings-segment').last()).toContainText('D-02');
    await expect(entry(page, 2)).toContainText('Corruption lives inside the healthy tree, isolated to exactly two files');
    await expect(entry(page, 2)).not.toContainText('(D-02)');
    await checkInvariants(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every learnings page fits 420px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 420, height: 900 });
      for (const match of [LX01, SYN, ROOT]) {
        const key = await resolveKey(match);
        await openPage(page, key, theme);
        await expect(page.locator('h1')).toHaveCount(1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, key).toBeLessThanOrEqual(0);
      }
    });
  }
});
