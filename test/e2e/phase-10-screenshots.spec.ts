// Phase 10 (10-23): every page the phase built, in a real browser. The Codebase page (Tidemark's dashboard
// address and its seven panels, three of Shapes' mapped documents, three panels of this repository's own map)
// and the six specification and check pages (Spec, AI spec, User setup, Eval review, Browser check and
// Cross-AI reviews) on every made-up Lendshed example. Each is opened at 1280px and 390px in light and dark,
// screenshot into test-results/phase-10/ ({page}-{input}-{width}-{theme}.png) for the user's review beside
// the sketch winners (042 to 052), and checked against the UI-SPEC rules: exactly one h1, no sideways page
// scroll at 390px, no destructive or warning tone inside main, and at most four distinct rendered font sizes
// (10-06 approved four for the Codebase page, no exception). The four-size count looks at visible elements
// inside main that hold text of their own. Nothing about a private project is read here: the two other
// repositories' Codebase pages are only ever photographed by hand into a temporary folder (T-10-46).
import { expect, test, type Page } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, projectUrl } from './app-url.ts';
import { FIXTURE_BASE_URL, SHAPES_BASE_URL, TIDEMARK_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer, type ProjectsServer } from './projects-server.ts';

const SHOTS = fileURLToPath(new URL('../../test-results/phase-10', import.meta.url));

/** The most distinct font sizes one of these pages may render (UI-SPEC Typography; 10-06: no exception). */
const MAX_FONT_SIZES = 4;

/** Which server a subject is opened on: the three the Playwright config starts, or Tidemark's own. */
type Where = 'lendshed' | 'shapes' | 'labelore' | 'tidemark';

interface Subject {
  /** The page family; the screenshot name starts with it. */
  page: 'codebase' | 'spec' | 'ai-spec' | 'user-setup' | 'eval-review' | 'dom-verify' | 'reviews';
  /** The input's short name, the middle of the screenshot name. */
  input: string;
  where: Where;
  /** Project-relative address. */
  address: string;
  /** What this input must show on screen, beyond the checks every page gets. */
  expects: (page: Page) => Promise<void>;
}

/** A Codebase panel: the page frame is up and the panel's own heading is the one asked for. */
function codebasePanel(label: string, mapOnly: boolean): (page: Page) => Promise<void> {
  return async (page) => {
    await expect(page.locator('main .view-codebase-page')).toBeVisible();
    await expect(page.locator('#view-codebase-panel-title')).toHaveText(label);
    await expect(page.getByRole('region', { name: 'Mapped, not started' })).toHaveCount(mapOnly ? 1 : 0);
  };
}

/** A type page: its view's own page class is on screen. */
function typePage(marker: string): (page: Page) => Promise<void> {
  return async (page) => {
    await expect(page.locator(`main .${marker}`).first()).toBeVisible();
  };
}

const PANELS: [string, string][] = [
  ['stack', 'Stack'],
  ['architecture', 'Architecture'],
  ['structure', 'Structure'],
  ['conventions', 'Conventions'],
  ['testing', 'Testing'],
  ['integrations', 'Integrations'],
  ['concerns', 'Concerns'],
];

const SUBJECTS: Subject[] = [
  // Tidemark: a map-only project, so every panel sits under the "Mapped, not started" head.
  {
    page: 'codebase',
    input: 'tidemark-dashboard',
    where: 'tidemark',
    address: '/',
    expects: codebasePanel('Stack', true),
  },
  ...PANELS.map(
    ([key, label]): Subject => ({
      page: 'codebase',
      input: `tidemark-${key}`,
      where: 'tidemark',
      address: `/codebase/${key}`,
      expects: codebasePanel(label, true),
    }),
  ),
  // Shapes: a map of three documents beside a roadmap, so no head.
  ...(
    [
      ['stack', 'Stack'],
      ['architecture', 'Architecture'],
      ['conventions', 'Conventions'],
    ] as const
  ).map(
    ([key, label]): Subject => ({
      page: 'codebase',
      input: `shapes-${key}`,
      where: 'shapes',
      address: `/codebase/${key}`,
      expects: codebasePanel(label, false),
    }),
  ),
  // This repository's own map, the hardest real one that is committed.
  ...(
    [
      ['stack', 'Stack'],
      ['structure', 'Structure'],
      ['concerns', 'Concerns'],
    ] as const
  ).map(
    ([key, label]): Subject => ({
      page: 'codebase',
      input: `labelore-${key}`,
      where: 'labelore',
      address: `/codebase/${key}`,
      expects: codebasePanel(label, false),
    }),
  ),
  // The six type pages on every made-up Lendshed example: three specs, two AI specs, two user setups, two
  // eval reviews, three browser checks, two reviews.
  ...[1, 2, 3].map(
    (phase): Subject => ({
      page: 'spec',
      input: `lendshed-p${phase}`,
      where: 'lendshed',
      address: `/v1.1/phase-${phase}/spec`,
      expects: typePage('view-spec-page'),
    }),
  ),
  ...[2, 4].map(
    (phase): Subject => ({
      page: 'ai-spec',
      input: `lendshed-p${phase}`,
      where: 'lendshed',
      address: `/v1.1/phase-${phase}/ai-spec`,
      expects: typePage('view-ai-spec-page'),
    }),
  ),
  ...[2, 4].map(
    (phase): Subject => ({
      page: 'user-setup',
      input: `lendshed-p${phase}`,
      where: 'lendshed',
      address: `/v1.1/phase-${phase}/user-setup`,
      expects: typePage('view-user-setup-page'),
    }),
  ),
  ...[3, 4].map(
    (phase): Subject => ({
      page: 'eval-review',
      input: `lendshed-p${phase}`,
      where: 'lendshed',
      address: `/v1.1/phase-${phase}/eval-review`,
      expects: typePage('view-eval-review-page'),
    }),
  ),
  ...[1, 2, 3].map(
    (phase): Subject => ({
      page: 'dom-verify',
      input: `lendshed-p${phase}`,
      where: 'lendshed',
      address: `/v1.1/phase-${phase}/dom-verify`,
      expects: typePage('view-dom-verify-page'),
    }),
  ),
  ...[1, 4].map(
    (phase): Subject => ({
      page: 'reviews',
      input: `lendshed-p${phase}`,
      where: 'lendshed',
      address: `/v1.1/phase-${phase}/reviews`,
      expects: typePage('view-reviews-page'),
    }),
  ),
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

test.describe('phase 10 pages', () => {
  let tidemark: ProjectsServer;
  let parent = '';

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    // Tidemark is served from a copy on a server of its own, with a settings directory of its own.
    parent = realpathSync(mkdtempSync(join(tmpdir(), 'phase-10-tidemark-')));
    const copy = join(parent, 'tidemark');
    cpSync(TIDEMARK_FIXTURE_ROOT, copy, { recursive: true });
    tidemark = await startProjectsServer({ paths: [copy] });
  });

  test.afterAll(async () => {
    await tidemark?.stop();
    if (parent !== '') rmSync(parent, { recursive: true, force: true });
  });

  function baseOf(where: Where): string {
    if (where === 'tidemark') return tidemark.base;
    if (where === 'lendshed') return FIXTURE_BASE_URL;
    if (where === 'shapes') return SHAPES_BASE_URL;
    return BASE_URL;
  }

  async function openSubject(page: Page, subject: Subject): Promise<void> {
    await page.goto(await projectUrl(baseOf(subject.where), subject.address));
    // A lazy route chunk shows a loading main first; the page is up once its h1 is.
    await expect(page.locator('h1')).toHaveCount(1);
    await subject.expects(page);
  }

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
