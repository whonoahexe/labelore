// Phase 8 (08-15): the built switcher, landing page and add dialog against the sketches the user chose.
// The winner of each sketch is read from its README (039 project-switcher, 040 projects-landing), and the
// layout-contract facts of that winner are asserted on the build with bounding boxes at 1280px and 390px,
// in light and dark. For every surface, width and theme the build and the winning sketch are screenshot
// side by side into test-results/phase-08/ (<surface>-<width>-<theme>.png and ...-sketch.png), the pairs a
// person looks at beside the numbers (UI-SPEC populated and long-text backstops). Names and slugs come
// from the running server's own list; the long-text project is a throwaway folder built here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectUrl } from './app-url.ts';
import { FIXTURE_ROOT, SHAPES_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer, type ProjectsServer } from './projects-server.ts';
import { openSketch, sketchWinner } from './sketch-file.ts';

const SHOTS = fileURLToPath(new URL('../../test-results/phase-08', import.meta.url));

interface ListedProject {
  slug: string;
  name: string;
  target: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function listProjects(base: string): Promise<ListedProject[]> {
  const response = await fetch(`${base}/api/projects`);
  const { projects } = (await response.json()) as { projects: ListedProject[] };
  return projects;
}

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error('projects-screenshots.spec: an element has no box');
  return found;
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

function triggerFor(page: Page, project: ListedProject): Locator {
  return page.getByRole('button', { name: `Switch project. Current project: ${project.name}` });
}

const SEEDED_AT = '2026-10-01T00:00:00.000Z';

/** A populated project list: Lendshed (loaded, current), a copy of Shapes retitled Portal, the ssh Kiln, a
 * remembered folder that is gone (also named portal, so its slug is portal-2) and Shapes, never opened; with
 * `fillers`, eight more saved projects (one with an 80-character folder name and a 120-character path), so
 * the list is long enough to scroll. Everything is made up and lives in mkdtemp folders. */
interface PopulatedServer {
  server: ProjectsServer;
  lendshed: ListedProject;
  portal: ListedProject;
  cleanup(): Promise<void>;
}

async function startPopulated(fillers: boolean): Promise<PopulatedServer> {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'projects-shots-')));
  const portalFolder = join(root, 'acme', 'portal');
  cpSync(SHAPES_FIXTURE_ROOT, portalFolder, { recursive: true });
  const projectFile = join(portalFolder, '.planning', 'PROJECT.md');
  writeFileSync(projectFile, readFileSync(projectFile, 'utf8').replace(/^# .*$/m, '# Portal'));

  const saved = [
    { target: portalFolder, slug: 'portal' },
    { target: 'ssh://build-box.invalid/srv/kiln', slug: 'kiln' },
    { target: join(root, 'beta', 'portal'), slug: 'portal-2' },
  ];
  if (fillers) {
    for (let index = 1; index <= 7; index += 1) {
      const folder = join(root, 'fill', `side-project-${index}`);
      mkdirSync(join(folder, '.planning'), { recursive: true });
      saved.push({ target: folder, slug: `filler-${index}` });
    }
    const longName = 'a-very-long-project-folder-name-'.padEnd(80, 'x');
    const longFolder = join(root, 'fill', 'nested-folder-'.repeat(4), longName);
    expect(longFolder.length).toBeGreaterThanOrEqual(120);
    mkdirSync(join(longFolder, '.planning'), { recursive: true });
    saved.push({ target: longFolder, slug: 'filler-long' });
  }
  const server = await startProjectsServer({
    paths: [FIXTURE_ROOT, SHAPES_FIXTURE_ROOT],
    settings: {
      version: 1,
      projects: saved.map((entry) => ({ ...entry, addedAt: SEEDED_AT, lastOpened: null })),
      lastActive: null,
    },
  });
  const projects = await listProjects(server.base);
  const find = (target: string): ListedProject => {
    const found = projects.find((entry) => entry.target === target);
    if (!found) throw new Error(`projects-screenshots.spec: ${target} is not in the project list`);
    return found;
  };
  return {
    server,
    lendshed: find(FIXTURE_ROOT),
    portal: find(portalFolder),
    cleanup: async () => {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

/** The list the page asks for, with one project shown as still opening (the server only reports that for
 * the instant a load is in flight, which a screenshot cannot wait for). */
async function showAsOpening(page: Page, slug: string): Promise<void> {
  await page.route('**/api/projects', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const body = (await response.json()) as { projects: { slug: string; state: string; reason: string | null }[] };
    body.projects = body.projects.map((entry) => (entry.slug === slug ? { ...entry, state: 'loading', reason: null } : entry));
    await route.fulfill({ response, json: body });
  });
}

async function openSwitcher(page: Page, current: ListedProject): Promise<Locator> {
  await triggerFor(page, current).click();
  const popup = page.locator('.project-switcher-popup');
  await expect(popup).toBeVisible();
  // The popover settles into place before it is measured or photographed.
  await expect.poll(async () => Math.round((await box(popup)).y)).toBeGreaterThan(0);
  return popup;
}

async function shoot(page: Page, name: string, fullPage = false): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  // Let the entrance animations and the font settle so both halves of a pair are at rest.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(SHOTS, name), fullPage, animations: 'disabled' });
}

// The layout-contract facts of each sketch's winner, from the README's "Layout contract" section. A winner
// with no entry here fails the spec loudly rather than passing without asserting anything.
type SwitcherAsserts = (page: Page, width: number, current: ListedProject, popup: Locator) => Promise<void>;
type LandingAsserts = (page: Page, width: number) => Promise<void>;

const SWITCHER_CONTRACTS: Record<string, SwitcherAsserts> = {
  // 039 A: popover under the name trigger.
  A: async (page, width, current, popup) => {
    const trigger = triggerFor(page, current);
    const triggerBox = await box(trigger);
    const headerBox = await box(page.locator('.shell-header'));
    const popupBox = await box(popup);
    const viewportHeight = page.viewportSize()!.height;
    if (width >= 1280) {
      // 1. Within 8px of the trigger's left edge; top at or below the header's bottom edge, never over the trigger.
      expect(Math.abs(popupBox.x - triggerBox.x)).toBeLessThanOrEqual(8);
      expect(popupBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
      expect(popupBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
      // 2. At most 448px wide and min(448px, 70vh) tall; the list scrolls inside, the head and footer stay.
      expect(popupBox.width).toBeLessThanOrEqual(448.5);
      expect(popupBox.height).toBeLessThanOrEqual(Math.min(448, 0.7 * viewportHeight) + 0.5);
      const list = popup.locator(':scope > div').first();
      const head = popup.locator(':scope > header');
      const footer = popup.locator('.project-switcher-footer');
      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      const headBefore = await box(head);
      const footerBefore = await box(footer);
      await list.evaluate((el) => {
        el.scrollTop = 200;
      });
      expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      expect((await box(head)).y).toBeCloseTo(headBefore.y, 0);
      expect((await box(footer)).y).toBeCloseTo(footerBefore.y, 0);
      await list.evaluate((el) => {
        el.scrollTop = 0;
      });
      // 5. The forget button is a 36px square, hidden until row hover or focus-within.
      const row = popup.locator('.project-row').first();
      const forget = row.getByRole('button', { name: /^Forget / });
      const forgetBox = await box(forget);
      expect([Math.round(forgetBox.width), Math.round(forgetBox.height)]).toEqual([36, 36]);
      await page.mouse.move(0, 0);
      await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
      await row.hover();
      await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      await page.mouse.move(0, 0);
      // 4. Inside a row the tab order is the project link, then the forget button; the footer entry is last.
      await row.getByRole('link').focus();
      await page.keyboard.press('Tab');
      await expect(forget).toBeFocused();
    } else {
      // 3. At 390px the popup spans the viewport (left 0, right 390) directly under the header, no side borders.
      expect(popupBox.x).toBe(0);
      expect(popupBox.x + popupBox.width).toBe(width);
      expect(popupBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
      const borders = await popup.evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.borderLeftWidth, style.borderRightWidth];
      });
      expect(borders).toEqual(['0px', '0px']);
      expect(popupBox.height).toBeLessThanOrEqual(Math.min(448, 0.7 * viewportHeight) + 0.5);
      // 5. Every forget button is visible and 40px square.
      const forget = popup.locator('.project-row').first().getByRole('button', { name: /^Forget / });
      await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      const forgetBox = await box(forget);
      expect([Math.round(forgetBox.width), Math.round(forgetBox.height)]).toEqual([40, 40]);
      // 6. The trigger is at least 40px tall, and its name truncates with an ellipsis.
      expect(triggerBox.height).toBeGreaterThanOrEqual(40);
      expect(await trigger.locator('.brand-project-name').evaluate((el) => getComputedStyle(el).textOverflow)).toBe(
        'ellipsis',
      );
      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    }
    // 4. 'Add or scan…' is the last focusable element in the popup, at either width.
    const last = await popup.evaluate((el) => {
      const controls = el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      return controls[controls.length - 1]?.textContent ?? '';
    });
    expect(last).toBe('Add or scan…');
  },
};

const LANDING_CONTRACTS: Record<string, LandingAsserts> = {
  // 040 B: the list on the left, the add and scan forms in a 448px side column.
  B: async (page, width) => {
    const list = await box(page.locator('.projects-page > section').first());
    const side = await box(page.locator('.projects-page > aside'));
    const addHeading = await box(page.getByRole('heading', { level: 2, name: 'Add a project' }));
    const scanHeading = await box(page.getByRole('heading', { level: 2, name: 'Scan a folder' }));
    const viewportHeight = page.viewportSize()!.height;
    if (width >= 1280) {
      // 1. The list starts at the page's left edge (51px) and is 678px wide; the side column is 448px wide and
      // ends at the page's right edge (1229px), with a 51px gap between them.
      expect(Math.abs(list.x - 51)).toBeLessThanOrEqual(2);
      expect(Math.abs(list.width - 678)).toBeLessThanOrEqual(2);
      expect(Math.abs(side.width - 448)).toBeLessThanOrEqual(1);
      expect(Math.abs(side.x + side.width - 1229)).toBeLessThanOrEqual(2);
      expect(Math.abs(side.x - (list.x + list.width) - 51)).toBeLessThanOrEqual(2);
      // 2. 'Add a project' sits above 'Scan a folder' in the side column, within 24px of the list's top, so
      // both forms are on screen without scrolling.
      expect(Math.abs(addHeading.y - list.y)).toBeLessThanOrEqual(24);
      expect(scanHeading.y).toBeGreaterThan(addHeading.y);
      expect(scanHeading.y + scanHeading.height).toBeLessThanOrEqual(viewportHeight);
      expect(scanHeading.x).toBeCloseTo(addHeading.x, 0);
      // 4. A row keeps its last-opened time on the path line, right of the path; the forget action shows on hover.
      const row = page.locator('.project-list .project-row').first();
      const rowBox = await box(row);
      const pathBox = await box(row.locator('.project-row-path'));
      const metaBox = await box(row.locator('.project-row-meta'));
      expect(metaBox.x).toBeGreaterThan(pathBox.x);
      expect(Math.abs(metaBox.y + metaBox.height / 2 - (pathBox.y + pathBox.height / 2))).toBeLessThanOrEqual(8);
      expect(metaBox.x + metaBox.width).toBeGreaterThan(rowBox.x + rowBox.width * 0.6);
      const forget = row.getByRole('button', { name: /^Forget / });
      await page.mouse.move(0, 0);
      await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
      await row.hover();
      await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      await page.mouse.move(0, 0);
    } else {
      // 3. The side column stacks under the list in A's order, on one left edge, with no sideways scroll.
      expect(side.y).toBeGreaterThanOrEqual(list.y + list.height - 1);
      expect(Math.abs(side.x - list.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(addHeading.x - list.x)).toBeLessThanOrEqual(1);
      expect(scanHeading.y).toBeGreaterThan(addHeading.y);
      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      // 4. At 390px the forget action is on every row, always shown.
      const forget = page.locator('.project-list .project-row').first().getByRole('button', { name: /^Forget / });
      await expect.poll(async () => await forget.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    }
  },
};

/** The contract of the sketch's winner, or a failure that names the winner nothing asserts. */
function contractOf<T>(sketch: string, contracts: Record<string, T>): T {
  const winner = sketchWinner(sketch);
  const found = contracts[winner];
  if (!found) throw new Error(`${sketch}: its README names winner ${winner}, but no layout facts are asserted for it`);
  return found;
}

test.describe('built pages against the chosen sketches', () => {
  let long: PopulatedServer;
  let plain: PopulatedServer;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    long = await startPopulated(true);
    plain = await startPopulated(false);
  });

  test.afterAll(async () => {
    await long?.cleanup();
    await plain?.cleanup();
  });

  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`the switcher, the landing page and the add dialog at ${width}px in ${theme}`, async ({ browser }) => {
        test.setTimeout(120_000);
        const context = await browser.newContext({ viewport: { width, height } });
        await context.addInitScript((value: string) => {
          window.localStorage.setItem('labelore-theme', value);
        }, theme);
        const page = await context.newPage();
        const sketch = await context.newPage();
        const label = (surface: string): string => `${surface}-${width}-${theme}`;
        const onTheme = async (): Promise<boolean> => page.evaluate(() => document.documentElement.classList.contains('dark'));

        try {
          // The switcher, open on Lendshed, over a list long enough to scroll with one project opening.
          await showAsOpening(page, long.portal.slug);
          await page.goto(await projectUrl(long.server.base, '/', long.lendshed.slug));
          await expect(page.locator('#project-name-heading')).toBeVisible();
          expect(await onTheme()).toBe(theme === 'dark');
          const popup = await openSwitcher(page, long.lendshed);
          await expect(popup.locator('.project-row', { hasText: long.portal.name }).getByText('Opening…')).toBeVisible();
          // Photographed first: the contract below hovers and focuses rows.
          await shoot(page, `${label('switcher')}.png`);
          await openSketch(sketch, '039-project-switcher', { theme, query: { state: 'popup', long: '1' } });
          await shoot(sketch, `${label('switcher')}-sketch.png`);
          await contractOf('039-project-switcher', SWITCHER_CONTRACTS)(page, width, long.lendshed, popup);
          // What the 390px header leaves the trigger beside the brand (08-11's observation), recorded with the run.
          const triggerButton = triggerFor(page, long.lendshed);
          const trigger = await box(triggerButton);
          const nameWidth = await triggerButton.locator('.brand-project-name').evaluate((el) => el.clientWidth);
          test.info().annotations.push({
            type: 'trigger',
            description: `${width}px: trigger ${Math.round(trigger.width)}x${Math.round(trigger.height)}, name visible ${nameWidth}px wide`,
          });

          // The landing page, populated, reached through the switcher's 'All projects' link.
          await page.goto(await projectUrl(plain.server.base, '/', plain.lendshed.slug));
          await expect(page.locator('#project-name-heading')).toBeVisible();
          const plainPopup = await openSwitcher(page, plain.lendshed);
          await plainPopup.getByRole('link', { name: 'All projects' }).click();
          await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
          const rows = page.locator('.project-list .project-row');
          await expect(rows).toHaveCount(5);
          await expect(rows.filter({ hasText: 'Unavailable' })).toHaveCount(1);
          await expect(rows.filter({ hasText: 'Opening…' })).toHaveCount(1);
          await expect(rows.filter({ hasText: 'ssh://' })).toHaveCount(1);
          await shoot(page, `${label('landing')}.png`, true);
          await openSketch(sketch, '040-projects-landing', { theme });
          await shoot(sketch, `${label('landing')}-sketch.png`, true);
          await contractOf('040-projects-landing', LANDING_CONTRACTS)(page, width);

          // The add dialog, opened from the switcher's footer.
          await page.goto(await projectUrl(plain.server.base, '/', plain.lendshed.slug));
          await expect(page.locator('#project-name-heading')).toBeVisible();
          const footerPopup = await openSwitcher(page, plain.lendshed);
          await footerPopup.getByRole('button', { name: 'Add or scan…' }).click();
          const dialog = page.getByRole('dialog', { name: 'Add a project' });
          await expect(dialog).toBeVisible();
          await expect(dialog.getByLabel('Project location')).toBeFocused();
          const dialogBox = await box(dialog);
          // Modal, 512px wide at most, and inside the viewport at either width.
          expect(dialogBox.width).toBeLessThanOrEqual(512.5);
          expect(dialogBox.x).toBeGreaterThanOrEqual(0);
          expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width + 0.5);
          expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
          await shoot(page, `${label('add-dialog')}.png`);
          await openSketch(sketch, '039-project-switcher', { theme, query: { state: 'add' } });
          await shoot(sketch, `${label('add-dialog')}-sketch.png`);
        } finally {
          await context.close();
        }
      });
    }
  }
});

// UI-SPEC long text: a project whose folder path is at least 120 characters and whose PROJECT.md title is 80
// characters. At 390px its dashboard does not scroll sideways, the switcher trigger stays a 40px target, and
// the name is cut with an ellipsis rather than pushing the header wider.
test.describe('long text in the header', () => {
  const title = 'Lendshed '.repeat(9).trim().slice(0, 80);
  let root = '';
  let folder = '';
  let server: ProjectsServer;
  let listed: ListedProject;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    root = realpathSync(mkdtempSync(join(tmpdir(), 'projects-shots-long-')));
    folder = join(root, 'nested-folder-'.repeat(6), 'a-project-folder-with-a-long-name');
    expect(folder.length).toBeGreaterThanOrEqual(120);
    mkdirSync(join(folder, '..'), { recursive: true });
    cpSync(FIXTURE_ROOT, folder, { recursive: true });
    const projectFile = join(folder, '.planning', 'PROJECT.md');
    writeFileSync(projectFile, readFileSync(projectFile, 'utf8').replace(/^# .*$/m, `# ${title}`));
    server = await startProjectsServer({ paths: [folder] });
    const found = (await listProjects(server.base)).find((entry) => entry.target === folder);
    if (!found) throw new Error('projects-screenshots.spec: the long-text project is not in the list');
    listed = found;
  });

  test.afterAll(async () => {
    await server?.stop();
    if (root !== '') rmSync(root, { recursive: true, force: true });
  });

  test('at 390px the header holds: no sideways scroll, a trigger of at least 40px, the name cut with an ellipsis', async ({
    page,
  }) => {
    expect(title).toHaveLength(80);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(await projectUrl(server.base, '/', listed.slug));
    const trigger = triggerFor(page, listed);
    await expect(trigger).toBeVisible();
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    expect((await box(trigger)).height).toBeGreaterThanOrEqual(40);
    const name = trigger.locator('.brand-project-name');
    await expect(name).toHaveText(title);
    expect(await name.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
    expect(await name.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, 'long-text-390-light.png') });
  });
});
