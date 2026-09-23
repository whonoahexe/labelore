// quick-260923-jxp Task 3 (JXP-09): the copy-path icon button on every artifact page — no raw
// path caption, one working `.artifact-path-copy` button per page, on a cover-layout page
// (discussion log, PLAN), a plain-header page (SUMMARY) and a plan-pair page. Fixtures resolved
// from `/api/presentation`, never hardcoded URLs — same discipline as document-layout.spec.ts.
import { expect, test, type Page } from '@playwright/test';
import { buildPageMatrix } from './pages.ts';

interface ArtifactDtoLite {
  key: string;
  path: string;
  kind: string;
}

interface PresentationLite {
  artifacts: ArtifactDtoLite[];
}

async function resolveArtifact(
  baseURL: string,
  pathIncludes: string,
): Promise<{ url: string; path: string }> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) {
    throw new Error(`artifact-header.spec: /api/presentation responded ${response.status}`);
  }
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) {
    throw new Error(`artifact-header.spec: no artifact found with path including "${pathIncludes}"`);
  }
  return { url: artifact.key, path: artifact.path };
}

async function findFirstSummaryArtifact(baseURL: string): Promise<{ url: string; path: string }> {
  const response = await fetch(`${baseURL}/api/presentation`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.kind === 'summary');
  if (!artifact) {
    throw new Error('artifact-header.spec: no summary artifact found in this corpus');
  }
  return { url: artifact.key, path: artifact.path };
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('labelore-theme', t);
  }, theme);
}

/** The full copy-path contract, run against one already-navigated page whose artifact path is
 * `path`. Grants clipboard permissions once per test via the fixture context.
 *
 * The "no raw path caption" check targets the removed `.artifact-path` caption element
 * specifically — not the h1 title's own text, which can legitimately equal the artifact's path
 * when a PLAN/artifact has no distinct title (a pre-existing title-fallback, unrelated to the
 * copy-path change). */
async function assertCopyPathContract(page: Page, path: string): Promise<void> {
  const headingCaption = page.locator('.artifact-heading .artifact-path');
  expect(await headingCaption.count()).toBe(0);
  // No non-h1 element inside the heading prints the path (a lede/caption-style paragraph).
  const strayCaptionCount = await page
    .locator('.artifact-heading > p, .artifact-heading .document-cover-copy > p')
    .filter({ hasText: path })
    .count();
  expect(strayCaptionCount).toBe(0);

  const button = page.locator('.artifact-path-copy');
  await expect(button).toHaveCount(1);
  await expect(button).toHaveAttribute('aria-label', 'Copy file path');
  await expect(button).toHaveAttribute('title', path);

  await button.click();
  await expect(button).toHaveAttribute('data-copied', 'true');
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe(path);
  await expect(button.locator('svg.lucide-check')).toHaveCount(1);

  // Reverts within 3s.
  await expect(button).toHaveAttribute('data-copied', 'false', { timeout: 3000 });
}

test.describe('artifact-header copy-path button (quick-260923-jxp)', () => {
  test.use({
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('cover-layout discussion log: copy button present, no raw path caption', async ({ page, baseURL }) => {
    const { url, path } = await resolveArtifact(
      baseURL ?? 'http://127.0.0.1:4199',
      '01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    );
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url);
    await page.locator('.document-cover').first().waitFor({ state: 'visible' });
    await assertCopyPathContract(page, path);
  });

  test('cover-layout PLAN: copy button present, no raw path caption', async ({ page, baseURL }) => {
    const { url, path } = await resolveArtifact(
      baseURL ?? 'http://127.0.0.1:4199',
      '01-read-layer-domain-model/01-01-PLAN.md',
    );
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url);
    await page.locator('.document-cover').first().waitFor({ state: 'visible' });
    await assertCopyPathContract(page, path);
  });

  test('plain-header SUMMARY: copy button present, no raw path caption', async ({ page, baseURL }) => {
    const { url, path } = await findFirstSummaryArtifact(baseURL ?? 'http://127.0.0.1:4199');
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url);
    await page.locator('.artifact-heading').first().waitFor({ state: 'visible' });
    await assertCopyPathContract(page, path);
  });

  test('plan-pair page: copy button present on both header cards, no raw path caption', async ({
    page,
    baseURL,
  }) => {
    const matrix = await buildPageMatrix(baseURL ?? 'http://127.0.0.1:4199');
    const planPair = matrix.pages.find((p) => p.family === 'plan-pair');
    expect(planPair, 'expected a plan-pair fixture in this corpus').toBeDefined();
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(planPair!.url);
    await page.locator('.plan-pair-page').first().waitFor({ state: 'visible' });

    const captions = page.locator('.artifact-path');
    expect(await captions.count()).toBe(0);
    const buttons = page.locator('.artifact-path-copy');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toHaveAttribute('aria-label', 'Copy file path');
    }
  });

  test('renders without throwing when clipboard permissions are not granted', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const { url } = await resolveArtifact(
      baseURL ?? 'http://127.0.0.1:4199',
      '01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    );
    await setTheme(page, 'light');
    await page.goto(url);
    await page.locator('.document-cover').first().waitFor({ state: 'visible' });
    const button = page.locator('.artifact-path-copy');
    await expect(button).toHaveCount(1);
    // A denied/absent clipboard must not throw — the button stays inert.
    await button.click();
    await expect(button).toBeVisible();
    await context.close();
  });

  test('420px, light and dark: no horizontal overflow with the copy button present', async ({
    page,
    baseURL,
  }) => {
    const { url } = await resolveArtifact(
      baseURL ?? 'http://127.0.0.1:4199',
      '01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    );
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.setViewportSize({ width: 420, height: 900 });
      await page.goto(url);
      await page.locator('.document-cover').first().waitFor({ state: 'visible' });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${theme}@420: horizontal overflow (${overflow.scrollWidth} > ${overflow.innerWidth})`,
      ).toBeLessThanOrEqual(overflow.innerWidth + 1);
    }
  });
});
