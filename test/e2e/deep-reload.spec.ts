// NAV-10: every readable URL of the made-up Shapes project opens, and survives a hard reload, on its right
// page in a real browser. The same tests are registered once per server: the 4197 development server
// (Vite middleware) and the 4196 built app (npm run build, then npm start serving ./dist). The only thing
// that differs between the two legs is data in SERVERS; nothing decides whether a test runs. Each test
// proves which app it drove from the page's own script tags (the debug/loading-state-regression
// misconfiguration was a server believed to be built that was silently serving Vite), opens an address,
// reloads it hard, and asserts the same page and the same address both times with no page error and no
// failed script or stylesheet.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { artifactUrl, exactUrl } from './app-url.ts';
import { SHAPES_BASE_URL, SHAPES_BUILT_BASE_URL } from './fixture-root.ts';

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

for (const server of SERVERS) {
  test.describe(server.name, () => {
    test('a decimal-phase plan opens on the Plan tab and survives a hard reload', async ({ page }) => {
      const seen = watch(page);
      const target = await artifactUrl(server.baseUrl, '.planning/phases/02.1-glaze-hotfix/02.1-01-PLAN.md');

      await page.goto(target);
      await expectMode(page, server);
      await expect(page.locator('nav.plan-pair-switch [aria-current="page"]')).toHaveText('Plan');
      await expect(page.locator('h1').first()).toBeVisible();

      await page.reload();
      await expectMode(page, server);
      await expect(page.locator('nav.plan-pair-switch [aria-current="page"]')).toHaveText('Plan');
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page).toHaveURL(exactUrl(target));
      expectQuiet(seen);
    });
  });
}
