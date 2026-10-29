// NAV-10: every readable URL of the made-up Shapes project opens, and survives a hard reload, on its right
// page in a real browser. The same tests are registered once per server: the 4197 development server
// (Vite middleware) and the 4196 built app (npm run build, then npm start serving ./dist). The only thing
// that differs between the two legs is data in SERVERS; nothing decides whether a test runs. Each test
// proves which app it drove from the page's own script tags (the debug/loading-state-regression
// misconfiguration was a server believed to be built that was silently serving Vite), opens an address,
// reloads it hard, and asserts the same page and the same address both times with no page error and no
// failed script or stylesheet. Every address is built from what the served project reports (projectUrl and
// artifactUrl), so the spec follows the server's URL grammar instead of pinning one.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { legacyArtifactUrl } from '../helpers/legacy-urls.ts';
import { artifactUrl, exactUrl, projectUrl } from './app-url.ts';
import { SHAPES_BASE_URL, SHAPES_BUILT_BASE_URL, SHAPES_FIXTURE_ROOT } from './fixture-root.ts';

interface ServerMode {
  name: string;
  baseUrl: string;
  /** Every app script's src starts with this prefix in this mode. */
  entryPrefix: string;
  /** No script's src starts with any of these in this mode. */
  neverPrefixes: string[];
}

const SERVERS: ServerMode[] = [
  { name: 'development server', baseUrl: SHAPES_BASE_URL, entryPrefix: '/src/', neverPrefixes: ['/assets/'] },
  {
    name: 'built server',
    baseUrl: SHAPES_BUILT_BASE_URL,
    entryPrefix: '/assets/',
    neverPrefixes: ['/src/', '/@vite/'],
  },
];

/** What a page raised while it loaded: uncaught errors and script or stylesheet responses of 400 or above. */
interface Watch {
  errors: string[];
  failedAssets: string[];
}

function watch(page: Page): Watch {
  const seen: Watch = { errors: [], failedAssets: [] };
  page.on('pageerror', (error) => seen.errors.push(error.message));
  page.on('response', (response) => {
    const type = response.request().resourceType();
    if ((type === 'script' || type === 'stylesheet') && response.status() >= 400) {
      seen.failedAssets.push(`${response.status()} ${response.url()}`);
    }
  });
  return seen;
}

/** Asserts the page was served by the mode's app: its module entry loads from the mode's prefix and no
 * script loads from a prefix the mode must never use. */
async function expectMode(page: Page, server: ServerMode): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          Array.from(document.querySelectorAll('script[type="module"][src]'), (node) => node.getAttribute('src') ?? ''),
        ),
      { message: `a module script from ${server.entryPrefix} on the ${server.name}` },
    )
    .toContainEqual(expect.stringMatching(new RegExp(`^${server.entryPrefix}`)));
  const sources = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]'), (node) => node.getAttribute('src') ?? ''),
  );
  for (const never of server.neverPrefixes) {
    expect(sources.filter((src) => src.startsWith(never))).toEqual([]);
  }
}

function expectQuiet(seen: Watch): void {
  expect(seen.errors).toEqual([]);
  expect(seen.failedAssets).toEqual([]);
}

interface PresentationLite {
  artifacts: { path: string; title: string }[];
  milestones: { name: string; phases: { name: string }[] }[];
}

const presentations = new Map<string, Promise<PresentationLite>>();

function presentationOf(base: string): Promise<PresentationLite> {
  let cached = presentations.get(base);
  if (cached === undefined) {
    cached = fetch(`${base}/api/presentation`).then(async (response) => {
      if (!response.ok) throw new Error(`deep-reload.spec: ${base}/api/presentation responded ${response.status}`);
      return (await response.json()) as PresentationLite;
    });
    presentations.set(base, cached);
  }
  return cached;
}

async function artifactOf(base: string, path: string): Promise<{ path: string; title: string }> {
  const artifact = (await presentationOf(base)).artifacts.find((entry) => entry.path === path);
  if (artifact === undefined) throw new Error(`deep-reload.spec: no artifact ${path} at ${base}`);
  return artifact;
}

/** What the page's h1 shows of an artifact title: GSD's `Phase N Plan NN:` lead-in and the trailing kind
 * word are carried by the eyebrow and the tabs instead. */
function headingOf(title: string): string {
  return title
    .replace(/^Phase [\w.]+(?: Plan [\w.]+)?: /, '')
    .replace(/ - Context$/, '')
    .replace(/ Summary$/, '');
}

/** An address as the specs name it: a file by its path, or a page by its project-relative path. */
type Address = { artifact: string } | { page: string };

async function addressOf(server: ServerMode, address: Address): Promise<string> {
  return 'artifact' in address
    ? artifactUrl(server.baseUrl, address.artifact)
    : projectUrl(server.baseUrl, address.page);
}

interface Check {
  page: Page;
  server: ServerMode;
}

interface UrlClass {
  name: string;
  /** What is typed into the address bar. */
  open: Address;
  /** Where it lands when it redirects; absent when the typed address is the landed address. */
  lands?: Address;
  /** What must be on screen, before and after the reload. */
  check: (context: Check) => Promise<void>;
}

const PLAN = '.planning/phases/02.1-glaze-hotfix/02.1-01-PLAN.md';
const SUMMARY = '.planning/phases/02.1-glaze-hotfix/02.1-01-SUMMARY.md';
const SVG = '.planning/ui-reviews/kiln-map.svg';
const PNG = '.planning/ui-reviews/screenshots/glaze-panel.png';
const PDF = '.planning/phases/01-kiln-bookings/firing-sheet.pdf';
const OLD_LINK_TARGET = '.planning/phases/02-glaze-recipes/02-CONTEXT.md';

/** A document page: its h1 carries the artifact's title as the payload reports it. */
function documentClass(name: string, path: string): UrlClass {
  return {
    name,
    open: { artifact: path },
    check: async ({ page, server }) => {
      const { title } = await artifactOf(server.baseUrl, path);
      await expect(page.locator('h1').first()).toContainText(headingOf(title));
    },
  };
}

function pairClass(name: string, path: string, tab: 'Plan' | 'Summary', eyebrow: string): UrlClass {
  return {
    name,
    open: { artifact: path },
    check: async ({ page }) => {
      await expect(page.locator('nav.plan-pair-switch [aria-current="page"]')).toHaveText(tab);
      await expect(page.locator('p.eyebrow').first()).toContainText(eyebrow);
      await expect(page.locator('h1').first()).toBeVisible();
    },
  };
}

function imageClass(name: string, path: string): UrlClass {
  return {
    name,
    open: { artifact: path },
    check: async ({ page }) => {
      await expect(page.locator('p.eyebrow').first()).toHaveText('Image');
      await expect(page.locator('h1').first()).toHaveText(path.slice(path.lastIndexOf('/') + 1));
      const image = page.locator('.figure-frame-body img');
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    },
  };
}

function redirectClass(name: string, open: Address, lands: Address, heading: string): UrlClass {
  return {
    name,
    open,
    lands,
    check: async ({ page }) => {
      await expect(page.locator('h1').first()).toContainText(heading);
    },
  };
}

/** A miss: the not-found page naming the address decoded once. */
function missClass(name: string, page: string): UrlClass {
  return {
    name,
    open: { page },
    check: async ({ page: browserPage, server }) => {
      const typed = await projectUrl(server.baseUrl, page);
      await expect(browserPage.locator('p.eyebrow').first()).toHaveText('Not found');
      await expect(browserPage.locator('p.artifact-path')).toHaveText(decodeURIComponent(new URL(typed).pathname));
    },
  };
}

/** The name a page shows from the payload, anywhere in its main region (D-04). */
function namedPageClass(name: string, page: string, nameOf: (data: PresentationLite) => string): UrlClass {
  return {
    name,
    open: { page },
    check: async ({ page: browserPage, server }) => {
      await expect(browserPage.locator('main')).toContainText(nameOf(await presentationOf(server.baseUrl)));
    },
  };
}

const phaseNamed = (data: PresentationLite): string => {
  const phase = data.milestones.flatMap((milestone) => milestone.phases).find((entry) => entry.name.startsWith('Glaze hotfix'));
  if (phase === undefined) throw new Error('deep-reload.spec: no Glaze hotfix phase in the payload');
  return phase.name.replace(/ \(.*\)$/, '');
};

const milestoneNamed = (data: PresentationLite): string => {
  const milestone = data.milestones.find((entry) => entry.name === 'Firing Board');
  if (milestone === undefined) throw new Error('deep-reload.spec: no Firing Board milestone in the payload');
  return milestone.name;
};

/** The window property the SVG's inline script would set, read from the fixture file itself (D-08). */
const SVG_SCRIPT_FLAG: string = (() => {
  const source = readFileSync(join(SHAPES_FIXTURE_ROOT, SVG), 'utf8');
  const match = /window\.([A-Za-z_$][\w$]*)\s*=/.exec(source);
  if (match === null) throw new Error('deep-reload.spec: the fixture SVG sets no window property');
  return match[1]!;
})();

const URL_CLASSES: UrlClass[] = [
  pairClass('a decimal-phase plan opens on the Plan tab', PLAN, 'Plan', 'Plan 02.1-01'),
  pairClass('its summary opens on the Summary tab', SUMMARY, 'Summary', 'Summary'),
  documentClass('a project-coded phase file', '.planning/phases/KR-03-firing-calendar/03-CONTEXT.md'),
  documentClass('an archived v1.0 phase file', '.planning/milestones/v1.0-phases/01-studio-accounts/01-01-SUMMARY.md'),
  documentClass('a quick-task summary', '.planning/quick/261020-k4m-shelf-tags/261020-k4m-SUMMARY.md'),
  documentClass('a file/ URL', '.planning/phases/02-glaze-recipes/03-RESEARCH.md'),
  documentClass('a note with a percent sign', '.planning/notes/kiln % notes.md'),
  documentClass('a note with a hash sign', '.planning/notes/glaze #2.md'),
  documentClass('a note with unicode', '.planning/notes/über-glaze.md'),
  documentClass('a codebase document', '.planning/codebase/ARCHITECTURE.md'),
  documentClass('the settings page', '.planning/config.json'),
  namedPageClass('a phase page', '/v1.1/phase-2.1', phaseNamed),
  namedPageClass('a phase page with a trailing slash', '/v1.1/phase-2.1/', phaseNamed),
  namedPageClass('a milestone overview', '/v1.1/overview', milestoneNamed),
  imageClass('a PNG on the image page', PNG),
  imageClass('an SVG on the image page', SVG),
  {
    name: 'a PDF on the File details card',
    open: { artifact: PDF },
    check: async ({ page }) => {
      await expect(page.locator('p.eyebrow').first()).toHaveText('Binary file');
      await expect(page.getByRole('heading', { name: 'File details' })).toBeVisible();
    },
  },
  redirectClass('the archived milestone redirects to its roadmap', { page: '/v1.0' }, { artifact: '.planning/milestones/v1.0-ROADMAP.md' }, 'Roadmap'),
  redirectClass('the live milestone redirects to the roadmap', { page: '/v1.1' }, { page: '/roadmap' }, 'Roadmap'),
  redirectClass('the live milestone roadmap redirects to the roadmap', { page: '/v1.1/roadmap' }, { page: '/roadmap' }, 'Roadmap'),
  {
    name: 'an old encoded link redirects to the file readable URL',
    open: { page: legacyArtifactUrl(OLD_LINK_TARGET) },
    lands: { artifact: OLD_LINK_TARGET },
    check: async ({ page, server }) => {
      const { title } = await artifactOf(server.baseUrl, OLD_LINK_TARGET);
      await expect(page.locator('h1').first()).toContainText(headingOf(title));
    },
  },
  missClass('an encoded slash is not found', '/notes/kiln%2Fcurve'),
  missClass('an internal file is not found', '/file/state.json'),
];

for (const server of SERVERS) {
  test.describe(server.name, () => {
    for (const urlClass of URL_CLASSES) {
      test(urlClass.name, async ({ page }) => {
        const seen = watch(page);
        const target = await addressOf(server, urlClass.open);
        const landed = urlClass.lands === undefined ? target : await addressOf(server, urlClass.lands);

        await page.goto(target);
        await expectMode(page, server);
        await expect(page).toHaveURL(exactUrl(landed));
        await urlClass.check({ page, server });

        await page.reload();
        await expectMode(page, server);
        await expect(page).toHaveURL(exactUrl(landed));
        await urlClass.check({ page, server });

        expectQuiet(seen);
      });
    }

    test('the SVG inline script never runs', async ({ page }) => {
      const seen = watch(page);
      const target = await artifactUrl(server.baseUrl, SVG);

      await page.goto(target);
      await expectMode(page, server);
      const image = page.locator('.figure-frame-body img');
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await page.evaluate((name) => (window as unknown as Record<string, unknown>)[name], SVG_SCRIPT_FLAG)).toBeUndefined();

      await page.reload();
      await expectMode(page, server);
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await page.evaluate((name) => (window as unknown as Record<string, unknown>)[name], SVG_SCRIPT_FLAG)).toBeUndefined();
      await expect(page).toHaveURL(exactUrl(target));
      expectQuiet(seen);
    });
  });
}
