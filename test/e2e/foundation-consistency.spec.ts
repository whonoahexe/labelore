// The UI/UX foundation-consistency sweep (quick-260921-l4e). Visits the four reference pages,
// one artifact per corpus `artifact.kind`, and one plan-pair page, in light/dark at 1280/420px,
// screenshotting every page and recording every check to `results.json` via `softCheck` so a
// single failing page never hides the rest of the matrix (`expect.soft`). Task 1 lands the
// harness plus frame parity (F-01) and dark-mode application (F-15); Task 2 adds the remaining
// checks (F-02..F-14).
import { test, type Page } from '@playwright/test';
import { buildPageMatrix, SCREENSHOT_ROOT, type PageMatrix, type PageSpec } from './pages.ts';
import { frameSignature, themeSignature } from './measure.ts';
import { softCheck, writeResults } from './results.ts';

let matrix: PageMatrix;

/** F-15's light-mode reference value, captured during the light run and compared against during
 * the dark run — proves the theme toggle produces a genuinely different paint, not just a class
 * flip with no visual effect. */
let lightRefDashboardBackground: string | null = null;

test.beforeAll(async ({ baseURL }) => {
  matrix = await buildPageMatrix(baseURL ?? 'http://127.0.0.1:4199');
});

test.afterAll(() => {
  writeResults();
});

async function waitForPageReady(page: Page, spec: PageSpec): Promise<void> {
  await page.locator('main:not([aria-busy="true"])').first().waitFor({ state: 'visible' });
  if (spec.family === 'reference') {
    await page.locator('main h1').first().waitFor({ state: 'visible' });
  } else {
    await page.locator('.artifact-heading h1').first().waitFor({ state: 'visible' });
  }
}

function runSweep(theme: 'light' | 'dark', width: number): void {
  test(`sweep ${theme} ${width}`, async ({ page }) => {
    await page.addInitScript((t: string) => {
      window.localStorage.setItem('labelore-theme', t);
    }, theme);
    await page.setViewportSize({ width, height: 900 });

    const frameSignatures = new Map<string, Awaited<ReturnType<typeof frameSignature>>>();

    for (const spec of matrix.pages) {
      await test.step(spec.id, async () => {
        await page.goto(spec.url);
        await waitForPageReady(page, spec);

        await page.screenshot({
          path: `${SCREENSHOT_ROOT}/${theme}-${width}/${spec.id}.png`,
          fullPage: true,
          animations: 'disabled',
        });

        const frame = await frameSignature(page);
        frameSignatures.set(spec.id, frame);
        softCheck(
          'F-01',
          spec.id,
          theme,
          width,
          frame.mainCount === 1 && frame.mainClasses.split(/\s+/).includes('page-stack'),
          `mainCount=${frame.mainCount} mainClasses="${frame.mainClasses}"`,
        );

        const themeSig = await themeSignature(page);
        const isDarkExpected = theme === 'dark';
        softCheck(
          'F-15',
          spec.id,
          theme,
          width,
          themeSig.isDark === isDarkExpected,
          `isDark=${themeSig.isDark} expected=${isDarkExpected}`,
        );

        if (spec.id === 'ref-dashboard') {
          if (theme === 'light') {
            lightRefDashboardBackground = themeSig.bodyBackground;
          } else if (lightRefDashboardBackground !== null) {
            softCheck(
              'F-15',
              'ref-dashboard-theme-differs',
              theme,
              width,
              themeSig.bodyBackground !== lightRefDashboardBackground,
              `light=${lightRefDashboardBackground} dark=${themeSig.bodyBackground}`,
            );
          }
        }
      });
    }

    const reference = frameSignatures.get('ref-dashboard');
    if (reference) {
      for (const [pageId, frame] of frameSignatures) {
        if (pageId === 'ref-dashboard') continue;
        const xOk = Math.abs(frame.x - reference.x) <= 1;
        const widthOk = Math.abs(frame.width - reference.width) <= 1;
        const paddingOk =
          frame.paddingTop === reference.paddingTop &&
          frame.paddingLeft === reference.paddingLeft &&
          frame.paddingRight === reference.paddingRight;
        softCheck(
          'F-01',
          pageId,
          theme,
          width,
          xOk && widthOk && paddingOk,
          `x=${frame.x} (ref ${reference.x}) width=${frame.width} (ref ${reference.width}) ` +
            `padding=${frame.paddingTop}/${frame.paddingLeft}/${frame.paddingRight} ` +
            `(ref ${reference.paddingTop}/${reference.paddingLeft}/${reference.paddingRight})`,
        );
      }
    }
  });
}

runSweep('light', 1280);
runSweep('light', 420);
runSweep('dark', 1280);
runSweep('dark', 420);
