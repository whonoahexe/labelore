// Phase 9 (09-16): the four analog-built pages (windows ledger, review ledger, milestone audit, coverage)
// in a real browser. Each is opened on its made-up Lendshed or Shapes input, or on this repo's own
// planning files, at 1280px and 390px in light and dark, screenshot into test-results/phase-09/
// (<page>-<input>-<width>-<theme>.png) for the post-build review with the user (D-13), and checked
// against the UI-SPEC rules: exactly one h1, no sideways page scroll at 390px, no destructive or warning
// tone on document content, and at most four distinct rendered font sizes inside the page. The four-size
// count looks at visible elements inside main that hold text of their own, and leaves out the audit's
// folded narrative (the shared document body, accepted at force-approval) and the shipped review threads
// (outside this phase's cap per UI-SPEC Typography). Nothing about a private project is read here: a real
// project's long documents are only ever photographed by hand into a temporary folder.
import { expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, projectUrl } from './app-url.ts';
import { FIXTURE_BASE_URL, SHAPES_BASE_URL } from './fixture-root.ts';

const SHOTS = fileURLToPath(new URL('../../test-results/phase-09', import.meta.url));

/** The most distinct font sizes one of these pages may render (UI-SPEC Typography). */
const MAX_FONT_SIZES = 4;

interface Subject {
  /** The page family; the screenshot name starts with it. */
  page: 'windows' | 'review' | 'audit' | 'coverage';
  /** The input's short name, the middle of the screenshot name. */
  input: string;
  base: string;
  /** Project-relative address. */
  address: string;
  /** What this input must show on screen, beyond the checks every page gets. */
  expects: (page: Page) => Promise<void>;
}

async function leadChip(page: Page, text: string): Promise<void> {
  await expect(page.locator('.view-windows-lead .status-chip', { hasText: text })).toBeVisible();
}

const SUBJECTS: Subject[] = [
  {
    page: 'windows',
    input: 'lendshed',
    base: FIXTURE_BASE_URL,
    address: '/windows',
    expects: async (page) => {
      await leadChip(page, '2 open');
      await expect(page.locator('.view-windows-page')).toContainText('Waived');
    },
  },
  {
    page: 'windows',
    input: 'shapes',
    base: SHAPES_BASE_URL,
    address: '/windows',
    expects: async (page) => {
      await leadChip(page, '0 open');
      await expect(page.locator('.view-windows-page')).toContainText('Nothing open.');
    },
  },
  {
    page: 'windows',
    input: 'labelore',
    base: BASE_URL,
    address: '/windows',
    expects: async (page) => {
      await expect(page.locator('.view-windows-lead .status-chip')).toBeVisible();
      await expect(page.locator('.view-windows-page')).toContainText(/\d+ fixed/);
    },
  },
  {
    page: 'review',
    input: 'lendshed-p1-review',
    base: FIXTURE_BASE_URL,
    address: '/v1.1/phase-1/review',
    expects: async (page) => {
      await expect(page.locator('.view-review-ledger-head')).toContainText('of 6 findings');
      await expect(page.locator('.view-review-page')).toBeVisible();
    },
  },
  {
    page: 'review',
    input: 'lendshed-p1-disposition',
    base: FIXTURE_BASE_URL,
    address: '/v1.1/phase-1/review-disposition',
    expects: async (page) => {
      await expect(page.locator('.view-review-ledger-head')).toContainText('of 6 findings');
      await expect(page.locator('.view-review-ledger-page').getByText('disposition not updated')).toHaveCount(2);
    },
  },
  {
    page: 'review',
    input: 'lendshed-p1-fix',
    base: FIXTURE_BASE_URL,
    address: '/v1.1/phase-1/review-fix',
    expects: async (page) => {
      // The head counts every disposition open, and the two marked-fixed rows say so.
      const head = page.locator('.view-review-ledger-head');
      await expect(head).toContainText('6');
      await expect(head).toContainText('of 6 findings');
      await expect(page.locator('.view-review-ledger-page').getByText('disposition not updated')).toHaveCount(2);
    },
  },
  {
    page: 'review',
    input: 'lendshed-p3-fix-frontend',
    base: FIXTURE_BASE_URL,
    address: '/v1.1/phase-3/review-fix-frontend',
    expects: async (page) => {
      await expect(page.locator('#fix-backend')).toBeVisible();
      const frontend = page.locator('#fix-frontend');
      await expect(frontend).toBeVisible();
      await expect(frontend).toContainText('Not in the review');
      // The frontend section is the one asked for, so it is the one in view.
      await frontend.scrollIntoViewIfNeeded();
      await expect(frontend).toBeInViewport();
    },
  },
  {
    page: 'review',
    input: 'labelore-p8-disposition',
    base: BASE_URL,
    address: '/v2.1/phase-8/review-disposition',
    expects: async (page) => {
      await expect(page.locator('.view-review-ledger-head')).toContainText('of 32 findings');
    },
  },
  {
    page: 'audit',
    input: 'lendshed',
    base: FIXTURE_BASE_URL,
    address: '/v1.0/audit',
    expects: async (page) => {
      await expect(page.locator('.view-milestone-audit-verdict')).toHaveText(/Tech debt only/i);
    },
  },
  {
    page: 'audit',
    input: 'labelore',
    base: BASE_URL,
    address: '/v1.0/audit',
    expects: async (page) => {
      await expect(page.locator('.view-milestone-audit-verdict')).toHaveText(/Passed/i);
      await expect(page.locator('.view-milestone-audit-page')).toContainText('Scores');
    },
  },
  {
    page: 'audit',
    input: 'shapes',
    base: SHAPES_BASE_URL,
    address: '/v1.0/audit',
    expects: async (page) => {
      // Prose only: the narrative is open and nothing scaffolds an empty Scores section.
      await expect(page.locator('details.view-milestone-audit-narrative')).toHaveAttribute('open', '');
      await expect(page.locator('.view-milestone-audit-page').getByText('Scores', { exact: true })).toHaveCount(0);
    },
  },
  {
    page: 'coverage',
    input: 'lendshed-p2',
    base: FIXTURE_BASE_URL,
    address: '/v1.1/phase-2/coverage',
    expects: async (page) => {
      await expect(page.locator('.view-coverage-page')).toContainText('No external API in this phase');
    },
  },
  {
    page: 'coverage',
    input: 'lendshed-p4',
    base: FIXTURE_BASE_URL,
    address: '/v1.1/phase-4/coverage',
    expects: async (page) => {
      await expect(page.locator('.view-coverage-page')).toContainText('3 integrated, 2 opted out');
    },
  },
  {
    page: 'coverage',
    input: 'shapes-p2',
    base: SHAPES_BASE_URL,
    address: '/v1.1/phase-2/coverage',
    expects: async (page) => {
      // A table with no decision column stays on the generic view: no matrix, no coverage vocabulary.
      await expect(page.locator('.view-coverage-page')).toHaveCount(0);
      await expect(page.locator('main table')).toHaveCount(1);
      await expect(page.locator('main').getByText(/integrated/i)).toHaveCount(0);
    },
  },
];

async function sidewaysOverflow(page: Page): Promise<number> {
  return await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  // Let the font settle so every shot is at rest.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(SHOTS, name), fullPage: true, animations: 'disabled' });
}

/** The distinct computed font sizes of the visible text inside the page's main region. */
async function fontSizes(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const seen = new Set<string>();
    const mains = Array.from(document.querySelectorAll('main')).filter((node) => node.checkVisibility());
    for (const main of mains) {
      for (const element of Array.from(main.querySelectorAll('*'))) {
        if (!element.checkVisibility()) continue;
        if (element.closest('.view-review-page, .view-milestone-audit-narrative-body') !== null) continue;
        if (element.closest('svg') !== null) continue;
        const ownText = Array.from(element.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
        );
        if (!ownText) continue;
        seen.add(getComputedStyle(element).fontSize);
      }
    }
    return Array.from(seen).sort();
  });
}

/** The checks every one of these pages gets, whatever its input. */
async function expectRulesHold(page: Page, width: number): Promise<void> {
  await expect(page.locator('h1')).toHaveCount(1);
  if (width < 1000) expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  await expect(page.locator('main [data-tone="destructive"], main [data-tone="warning"]')).toHaveCount(0);
  const sizes = await fontSizes(page);
  expect(sizes, `font sizes on the page: ${sizes.join(', ')}`).not.toHaveLength(0);
  expect(sizes.length, `font sizes on the page: ${sizes.join(', ')}`).toBeLessThanOrEqual(MAX_FONT_SIZES);
}

async function openSubject(page: Page, subject: Subject): Promise<void> {
  await page.goto(await projectUrl(subject.base, subject.address));
  // A lazy route chunk shows a loading main first; the page is up once its h1 is.
  await expect(page.locator('h1')).toHaveCount(1);
  await subject.expects(page);
}

test.describe('phase 9 analog pages', () => {
  // The tracer: one page, one width, the whole path from the served project to a file on disk.
  test('tracer: the Lendshed windows ledger leads with 2 open and is photographed', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    const page = await context.newPage();
    try {
      await page.goto(await projectUrl(FIXTURE_BASE_URL, '/windows'));
      await leadChip(page, '2 open');
      await expect(page.locator('h1')).toHaveCount(1);
      await shoot(page, 'windows-lendshed-tracer.png');
      expect(existsSync(join(SHOTS, 'windows-lendshed-tracer.png'))).toBe(true);
    } finally {
      await context.close();
    }
  });

  for (const subject of SUBJECTS) {
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ] as const) {
      for (const theme of ['light', 'dark'] as const) {
        test(`${subject.page} ${subject.input} at ${width}px in ${theme}`, async ({ browser }) => {
          const context = await browser.newContext({ viewport: { width, height } });
          await context.addInitScript((value: string) => window.localStorage.setItem('labelore-theme', value), theme);
          const page = await context.newPage();
          try {
            await openSubject(page, subject);
            expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(theme === 'dark');
            await expectRulesHold(page, width);
            await shoot(page, `${subject.page}-${subject.input}-${width}-${theme}.png`);
          } finally {
            await context.close();
          }
        });
      }
    }
  }
});
