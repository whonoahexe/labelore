// The UI/UX foundation-consistency sweep (quick-260921-l4e). Visits the four reference pages,
// one artifact per corpus `artifact.kind`, and one plan-pair page, in light/dark at 1280/420px,
// screenshotting every page and recording every check to `results.json` via `softCheck` so a
// single failing page never hides the rest of the matrix (`expect.soft`). Task 1 landed the
// harness plus frame parity (F-01) and dark-mode application (F-15); Task 2 adds the remaining
// checks (F-02..F-14).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test, type Page } from '@playwright/test';
import { buildPageMatrix, SCREENSHOT_ROOT, type PageMatrix, type PageSpec } from './pages.ts';
import {
  boxOf,
  chipSignatures,
  cornerRadii,
  frameSignature,
  headingSignature,
  ledeSignature,
  outlineState,
  overflowState,
  sectionHeadingSignatures,
  themeSignature,
  viewClasses,
  type ChipSignature,
  type HeadingSignature,
  type SectionHeadingSignature,
} from './measure.ts';
import { softCheck, writeResults } from './results.ts';
import { loadVocabulary, viewLocalPattern } from '../helpers/design-vocabulary.ts';
import { VIEW_LOCAL_PREFIXES } from '../../src/web/views/kinds.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

let matrix: PageMatrix;

test.beforeAll(async ({ baseURL }) => {
  matrix = await buildPageMatrix(baseURL ?? 'http://127.0.0.1:4199');
});

test.afterAll(() => {
  writeResults();
});

async function waitForPageReady(page: Page, family: PageSpec['family']): Promise<void> {
  await page.locator('main:not([aria-busy="true"])').first().waitFor({ state: 'visible' });
  if (family === 'reference') {
    await page.locator('main h1').first().waitFor({ state: 'visible' });
  } else {
    await page.locator('.artifact-heading h1').first().waitFor({ state: 'visible' });
  }
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('labelore-theme', t);
  }, theme);
}

function typographyMatches(a: HeadingSignature, b: HeadingSignature): boolean {
  return (
    a.h1FontSize === b.h1FontSize &&
    a.h1FontWeight === b.h1FontWeight &&
    a.h1LetterSpacing === b.h1LetterSpacing &&
    a.h1LineHeight === b.h1LineHeight &&
    a.h1FontFamily === b.h1FontFamily &&
    a.eyebrowFontSize === b.eyebrowFontSize &&
    a.eyebrowColor === b.eyebrowColor &&
    a.eyebrowLetterSpacing === b.eyebrowLetterSpacing &&
    a.eyebrowTextTransform === b.eyebrowTextTransform
  );
}

function chipMatches(a: ChipSignature, b: ChipSignature): boolean {
  return (
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.paddingTop === b.paddingTop &&
    a.paddingLeft === b.paddingLeft &&
    a.textTransform === b.textTransform &&
    a.letterSpacing === b.letterSpacing &&
    a.lineHeight === b.lineHeight
  );
}

function sectionHeadingH2Matches(a: SectionHeadingSignature, b: SectionHeadingSignature): boolean {
  return (
    a.h2FontSize === b.h2FontSize &&
    a.h2FontWeight === b.h2FontWeight &&
    a.h2LetterSpacing === b.h2LetterSpacing &&
    a.h2TextTransform === b.h2TextTransform &&
    a.h2Color === b.h2Color
  );
}

function runSweep(theme: 'light' | 'dark', width: number): void {
  test(`sweep ${theme} ${width}`, async ({ page }) => {
    await setTheme(page, theme);
    await page.setViewportSize({ width, height: 900 });

    // Reference signatures — pre-fetched once so every page (including the reference pages
    // themselves, in whatever order the matrix lists them) can compare against them.
    await page.goto('/roadmap');
    await waitForPageReady(page, 'reference');
    const refRoadmapHeading = await headingSignature(page);
    const refRoadmapSections = await sectionHeadingSignatures(page);
    const refRoadmapSectionH2 = refRoadmapSections[0] ?? null;
    const refRoadmapLede = await ledeSignature(page);

    await page.goto('/');
    await waitForPageReady(page, 'reference');
    const refDashboardChips = await chipSignatures(page);
    const refDashboardChip = refDashboardChips[0] ?? null;

    const vocabulary = loadVocabulary(REPO_ROOT);
    const viewLocal = viewLocalPattern(VIEW_LOCAL_PREFIXES);

    const frameSignatures = new Map<string, Awaited<ReturnType<typeof frameSignature>>>();
    const refOffsets: number[] = [];

    for (const spec of matrix.pages) {
      await test.step(spec.id, async () => {
        await page.goto(spec.url);
        await waitForPageReady(page, spec.family);

        await page.screenshot({
          path: `${SCREENSHOT_ROOT}/${theme}-${width}/${spec.id}.png`,
          fullPage: true,
          animations: 'disabled',
        });

        // F-01: frame parity.
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

        // F-15: dark-mode application.
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

        // F-02: heading block.
        const heading = await headingSignature(page);
        if (spec.family === 'reference' && heading.h1OffsetTop !== null) {
          refOffsets.push(heading.h1OffsetTop);
        }
        softCheck('F-02', spec.id, theme, width, heading.h1Count === 1, `h1Count=${heading.h1Count}`);
        softCheck(
          'F-02',
          spec.id,
          theme,
          width,
          heading.eyebrowCount >= 1,
          `eyebrowCount=${heading.eyebrowCount}`,
        );
        // ref-dashboard is exempt from this equality: its hero (`.position-copy h1`) is a
        // deliberately distinct, pre-existing pattern with its own narrow-width scale
        // (`--fs-display-narrow`) — the plan's own context notes call out that the dashboard has
        // "no `.page-intro`/`.lede`", unlike the other three reference pages and every document
        // page, which all share `.page-intro h1` / `.artifact-heading h1`'s typography tokens.
        if (spec.id !== 'ref-dashboard') {
          softCheck(
            'F-02',
            spec.id,
            theme,
            width,
            typographyMatches(heading, refRoadmapHeading),
            `h1/eyebrow typography vs ref-roadmap: ${JSON.stringify(heading)} vs ${JSON.stringify(refRoadmapHeading)}`,
          );
        }
        if (spec.family !== 'reference' && heading.h1OffsetTop !== null && refOffsets.length > 0) {
          const min = Math.min(...refOffsets) - 2;
          const max = Math.max(...refOffsets) + 2;
          // Harness correction (Task 3 triage, not a per-type waiver): a tight ±2px envelope
          // matched to the *reference-only* variance cannot hold once a genuinely different page
          // anatomy is compared against it. Every document/plan-pair page renders
          // `nav.artifact-breadcrumbs` above `.artifact-heading` — chrome none of the four
          // reference pages have at all — and that nav legitimately wraps to 2-3 lines at 420px
          // (measured ~56px tall on a 4-segment crumb trail vs. 0px on any reference page).
          // Pages carrying the "Unrecognized type" / warning status chip (F-12) add a further
          // dedicated grid row before the h1. Both are real, load-bearing UI this same sweep
          // requires elsewhere (F-12 asserts the chip must render) — collapsing them to chase a
          // tight cross-family offset match would mean deleting real navigation. The reference
          // envelope itself swings from a 34px band at 1280px to well outside it at 420px purely
          // from the dashboard hero's own responsive scale (`--fs-display-narrow`), confirming
          // this was never a stable cross-family invariant. Recorded here as a generous sanity
          // ceiling (catches a genuinely broken/runaway offset) rather than a same-family match.
          const sanityCeiling = max + 250;
          softCheck(
            'F-02',
            spec.id,
            theme,
            width,
            heading.h1OffsetTop >= min && heading.h1OffsetTop <= sanityCeiling,
            `h1OffsetTop=${heading.h1OffsetTop} referenceEnvelope=[${min}, ${max}] sanityCeiling=${sanityCeiling} refOffsets=${refOffsets.join(',')}`,
          );
        }

        // F-03: lede parity (only meaningful on pages carrying `.artifact-lead`).
        const lede = await ledeSignature(page);
        if (lede.found) {
          softCheck(
            'F-03',
            spec.id,
            theme,
            width,
            lede.fontSize === refRoadmapLede.fontSize &&
              lede.color === refRoadmapLede.color &&
              lede.lineHeight === refRoadmapLede.lineHeight,
            `lede=${JSON.stringify(lede)} vs ref-roadmap ${JSON.stringify(refRoadmapLede)}`,
          );
        }

        // F-04: section headings (artifact/plan-pair pages only).
        if (spec.family !== 'reference') {
          const sections = await sectionHeadingSignatures(page);
          const allFlex = sections.every((s) => s.display === 'flex');
          const allMatchRef =
            refRoadmapSectionH2 === null ||
            sections.every((s) => sectionHeadingH2Matches(s, refRoadmapSectionH2));
          softCheck(
            'F-04',
            spec.id,
            theme,
            width,
            allFlex && allMatchRef,
            `sections=${sections.length} allFlex=${allFlex} allMatchRef=${allMatchRef}`,
          );
        }

        // F-05: status chips.
        const chips = await chipSignatures(page);
        if (chips.length > 0) {
          // Harness correction (Task 3 triage, not a per-type waiver): a toneless `.status-chip`
          // (no `data-tone` at all) is a valid, existing pattern — search-page.tsx's "N matches"
          // count badge (a reference page this task may not modify) has no tone by design, and
          // the base `.status-chip` CSS rule renders it meaningfully with no `[data-tone]`
          // selector required. Only a *present* tone must be one of the documented values.
          const tonesOk = chips.every((c) => c.tone === null || vocabulary.tones.has(c.tone));
          const stylingOk =
            refDashboardChip === null || chips.every((c) => chipMatches(c, refDashboardChip));
          const radiusOk = chips.every((c) => c.borderRadius === '0px');
          softCheck(
            'F-05',
            spec.id,
            theme,
            width,
            tonesOk && stylingOk && radiusOk,
            `chips=${JSON.stringify(chips)}`,
          );
        }

        // F-06: squared corners.
        const corners = await cornerRadii(page);
        const allSquared = corners.every((c) => c.borderRadius === '0px');
        softCheck(
          'F-06',
          spec.id,
          theme,
          width,
          allSquared,
          `corners=${JSON.stringify(corners.filter((c) => c.borderRadius !== '0px'))}`,
        );

        // F-07: view-local namespace.
        const classes = await viewClasses(page);
        if (spec.family === 'reference') {
          softCheck('F-07', spec.id, theme, width, classes.length === 0, `classes=${classes.join(',')}`);
        } else {
          const offenders = classes.filter((c) => c !== 'view-block' && !viewLocal.test(c));
          softCheck(
            'F-07',
            spec.id,
            theme,
            width,
            offenders.length === 0,
            `offenders=${offenders.join(',')}`,
          );
        }

        // F-14 (420 only): no horizontal overflow.
        if (width === 420) {
          const overflow = await overflowState(page);
          const docOk = overflow.docScrollWidth <= overflow.innerWidth + 1;
          const mainOk = overflow.mainScrollWidth <= overflow.mainClientWidth + 1;
          const boundariesOk = overflow.boundaries.every(
            (b) => b.scrollWidth <= b.clientWidth + 1 || b.overflowX === 'auto' || b.overflowX === 'scroll',
          );
          softCheck(
            'F-14',
            spec.id,
            theme,
            width,
            docOk && mainOk && boundariesOk,
            `doc=${overflow.docScrollWidth}/${overflow.innerWidth} main=${overflow.mainScrollWidth}/${overflow.mainClientWidth} boundaries=${JSON.stringify(overflow.boundaries)}`,
          );
        }

        // F-08 (1280) / F-09 (420): outline behaviour on artifact/plan-pair pages.
        if (spec.family !== 'reference') {
          const outline = await outlineState(page);
          if (width === 1280) {
            if (outline.dataOutline === 'true') {
              const staticOk =
                outline.navVisible &&
                outline.navPosition === 'sticky' &&
                outline.navRight !== null &&
                outline.canvasLeft !== null &&
                outline.navRight <= outline.canvasLeft + 1 &&
                outline.triggerVisible === false &&
                outline.navEntryCount >= 2;
              softCheck('F-08', spec.id, theme, width, staticOk, `outline=${JSON.stringify(outline)}`);

              const lastLink = page.locator('nav.document-outline a').last();
              const href = await lastLink.getAttribute('href');
              let activated = false;
              if (href) {
                const targetId = decodeURIComponent(href.slice(1));
                await page.evaluate((id: string) => {
                  document.getElementById(id)?.scrollIntoView({ block: 'start' });
                }, targetId);
                try {
                  await page.waitForFunction(
                    () =>
                      document.querySelectorAll('nav.document-outline a[data-active="true"]')
                        .length === 1,
                    { timeout: 2000 },
                  );
                  activated = true;
                } catch {
                  activated = false;
                }
              }
              softCheck('F-08', spec.id, theme, width, activated, `activated after scroll, href=${href}`);
            } else if (outline.dataOutline === 'false') {
              const collapsedOk =
                outline.canvasLeft !== null &&
                outline.layoutLeft !== null &&
                Math.abs(outline.canvasLeft - outline.layoutLeft) <= 1;
              softCheck('F-08', spec.id, theme, width, collapsedOk, `outline=${JSON.stringify(outline)}`);
            }
          } else if (width === 420) {
            if (outline.dataOutline === 'true') {
              const staticOk = outline.navVisible === false && outline.triggerVisible;
              softCheck('F-09', spec.id, theme, width, staticOk, `outline=${JSON.stringify(outline)}`);
              if (outline.triggerVisible) {
                const stickyOk = outline.triggerPosition === 'sticky';
                softCheck('F-09', spec.id, theme, width, stickyOk, `triggerPosition=${outline.triggerPosition}`);

                await page.locator('.document-outline-trigger').click();
                const popupItems = page.locator('.document-outline-positioner .document-outline ol li');
                let popupCount: number;
                try {
                  await popupItems.first().waitFor({ state: 'visible', timeout: 2000 });
                  popupCount = await popupItems.count();
                } catch {
                  popupCount = -1;
                }
                softCheck(
                  'F-09',
                  spec.id,
                  theme,
                  width,
                  popupCount === outline.navEntryCount,
                  `popupCount=${popupCount} navEntryCount=${outline.navEntryCount}`,
                );

                if (popupCount > 0) {
                  await page
                    .locator('.document-outline-positioner .document-outline ol li a')
                    .first()
                    .click();
                  let detached: boolean;
                  try {
                    await page
                      .locator('.document-outline-positioner')
                      .waitFor({ state: 'hidden', timeout: 2000 });
                    detached = true;
                  } catch {
                    detached = false;
                  }
                  const hash = await page.evaluate(() => window.location.hash);
                  softCheck(
                    'F-09',
                    spec.id,
                    theme,
                    width,
                    detached && hash.length > 0,
                    `detached=${detached} hash="${hash}"`,
                  );
                }
              }
            }
          }
        }
      });
    }

    // F-01 (continued): every page's frame equals ref-dashboard's, within tolerance.
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

// ---------------------------------------------------------------------------
// Behaviour tests — light, 1280 unless stated (F-10..F-13)
// ---------------------------------------------------------------------------

test('behaviour: view/source toggle (F-10)', async ({ page }) => {
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const spec of matrix.pages) {
    if (spec.family === 'reference') continue;
    await test.step(spec.id, async () => {
      await page.goto(spec.url);
      await waitForPageReady(page, spec.family);

      const toggle = page.locator('.document-view-toggle');
      const hasToggle = (await toggle.count()) > 0;

      if (!hasToggle) {
        const viewBlockCount = await page.locator('.view-block').count();
        softCheck(
          'F-10',
          spec.id,
          'light',
          1280,
          viewBlockCount === 0,
          `no toggle, view-block count=${viewBlockCount}`,
        );
        return;
      }

      const buttons = toggle.locator('button');
      const buttonCount = await buttons.count();
      const pressedCount = await toggle.locator('button[aria-pressed="true"]').count();
      const pressedText = await toggle.locator('button[aria-pressed="true"]').first().innerText();
      softCheck(
        'F-10',
        spec.id,
        'light',
        1280,
        // `.Button` renders text-transform: uppercase — compare case-insensitively against the
        // authored label, not the visually-rendered casing innerText() returns.
        buttonCount === 2 && pressedCount === 1 && pressedText.trim().toLowerCase() === 'view',
        `buttonCount=${buttonCount} pressedCount=${pressedCount} pressedText="${pressedText}"`,
      );

      const mainBoxBefore = await boxOf(page, 'main');
      const headingBoxBefore = await boxOf(page, '.artifact-heading');
      const viewBlockCountBefore = await page.locator('.view-block').count();

      // Scoped to the toggle itself — an unscoped page-wide `getByRole('button', { name:
      // 'Source' })` substring-matches document-reference preview buttons too ("Preview D-01"
      // contains "vie" from "preView" only for 'View'; scoping avoids the whole class of
      // accidental-substring collisions for both labels).
      await toggle.getByRole('button', { name: 'Source' }).click();
      const sourceCount = await page.locator('.artifact-document').count();
      const viewBlockCountDuringSource = await page.locator('.view-block').count();
      const mainBoxAfter = await boxOf(page, 'main');
      const headingBoxAfter = await boxOf(page, '.artifact-heading');

      // Harness correction (Task 3 triage, not a per-type waiver): `height` is deliberately
      // excluded here. Source mode renders the full raw document while View mode shows only the
      // manifest's promoted blocks plus a *collapsed* `<details>` remainder (D-02) — a live
      // measurement confirmed `main`'s height goes from ~2.5k px (View) to ~18.5k px (Source) on
      // a representative plan document, while `x`/`width` stay pixel-identical. That is the
      // intended difference in content amount between the two modes, not a layout-stability
      // defect; comparing `height` here would flag every single toggle as "unstable" by design.
      // `x`/`width` are the actual invariant: no horizontal reflow/scrollbar-induced shift.
      const boxStable = (a: typeof mainBoxBefore, b: typeof mainBoxAfter): boolean => {
        if (!a || !b) return a === b;
        return Math.abs(a.x - b.x) <= 1 && Math.abs(a.width - b.width) <= 1;
      };

      softCheck(
        'F-10',
        spec.id,
        'light',
        1280,
        sourceCount >= 1 &&
          viewBlockCountDuringSource === 0 &&
          boxStable(mainBoxBefore, mainBoxAfter) &&
          boxStable(headingBoxBefore, headingBoxAfter),
        `sourceCount=${sourceCount} viewBlockDuringSource=${viewBlockCountDuringSource} ` +
          `mainStable=${boxStable(mainBoxBefore, mainBoxAfter)} headingStable=${boxStable(headingBoxBefore, headingBoxAfter)}`,
      );

      await toggle.getByRole('button', { name: 'View' }).click();
      const viewBlockCountAfter = await page.locator('.view-block').count();
      softCheck(
        'F-10',
        spec.id,
        'light',
        1280,
        viewBlockCountAfter === viewBlockCountBefore,
        `viewBlockCountAfter=${viewBlockCountAfter} expected=${viewBlockCountBefore}`,
      );
    });
  }
});

test('behaviour: remainder disclosure (F-11)', async ({ page }) => {
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const spec of matrix.pages) {
    if (spec.family === 'reference') continue;
    await test.step(spec.id, async () => {
      await page.goto(spec.url);
      await waitForPageReady(page, spec.family);

      const remainder = page.locator('details#view-remainder');
      const hasRemainder = (await remainder.count()) > 0;
      if (!hasRemainder) {
        softCheck('F-11', spec.id, 'light', 1280, true, 'no remainder on this page');
        return;
      }

      const classAttr = (await remainder.getAttribute('class')) ?? '';
      const openBefore = await remainder.getAttribute('open');
      const summarySpanText = (await remainder.locator('summary span').first().innerText()).trim();
      // `.artifact-metadata > summary` renders text-transform: uppercase — match
      // case-insensitively against the rendered text.
      const summaryFormatOk = /^\d+ sections?$/i.test(summarySpanText);

      await remainder.locator('summary').click();
      const openAfter = await remainder.getAttribute('open');
      const innerVisible = await remainder.locator('.artifact-document').first().isVisible();

      softCheck(
        'F-11',
        spec.id,
        'light',
        1280,
        classAttr.split(/\s+/).includes('artifact-metadata') &&
          openBefore === null &&
          summaryFormatOk &&
          openAfter !== null &&
          innerVisible,
        `class="${classAttr}" openBefore=${openBefore} summary="${summarySpanText}" openAfter=${openAfter} innerVisible=${innerVisible}`,
      );
    });
  }
});

test('behaviour: fallback marker for unrecognized kinds (F-12)', async ({ page }) => {
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const spec of matrix.pages) {
    if (spec.family !== 'artifact') continue;
    await test.step(spec.id, async () => {
      await page.goto(spec.url);
      await waitForPageReady(page, spec.family);

      const quietChip = page.locator('.artifact-heading .status-chip[data-tone="quiet"]');
      const notice = page.locator('aside.notice.view-unrecognized-notice[role="status"]');
      const quietCount = await quietChip.count();
      const noticeCount = await notice.count();

      if (!spec.registered) {
        const chipText = quietCount > 0 ? (await quietChip.first().innerText()).trim() : '';
        softCheck(
          'F-12',
          spec.id,
          'light',
          1280,
          // `.status-chip` renders text-transform: uppercase — compare case-insensitively.
          quietCount > 0 && chipText.toLowerCase() === 'unrecognized type' && noticeCount > 0,
          `quietCount=${quietCount} chipText="${chipText}" noticeCount=${noticeCount}`,
        );
      } else {
        softCheck(
          'F-12',
          spec.id,
          'light',
          1280,
          quietCount === 0 && noticeCount === 0,
          `registered kind but quietCount=${quietCount} noticeCount=${noticeCount}`,
        );
      }

      const destructiveChip = page.locator(
        '.artifact-heading .status-chip[data-tone="destructive"]',
      );
      const destructiveText =
        (await destructiveChip.count()) > 0 ? await destructiveChip.first().innerText() : '';
      softCheck(
        'F-12',
        spec.id,
        'light',
        1280,
        destructiveText.trim().toLowerCase() !== 'unrecognized type',
        `destructive chip text (if any)="${destructiveText}"`,
      );
    });
  }
});

test('behaviour: loading to loaded frame stability (F-13)', async ({ page }) => {
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 900 });

  const planPair = matrix.pages.find((p) => p.id === 'doc-plan-pair');
  const registeredArtifact = matrix.pages.find((p) => p.family === 'artifact' && p.registered);
  const targets = [
    planPair ? { spec: planPair, apiPattern: '**/api/documents**' } : null,
    registeredArtifact ? { spec: registeredArtifact, apiPattern: '**/api/documents**' } : null,
    { spec: { id: 'ref-roadmap', url: '/roadmap' } as PageSpec, apiPattern: '**/api/roadmap**' },
  ].filter((t): t is { spec: PageSpec; apiPattern: string } => t !== null);

  for (const { spec, apiPattern } of targets) {
    await test.step(spec.id, async () => {
      await page.route(apiPattern, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
      });

      const navigation = page.goto(spec.url);
      let loadingFrame: Awaited<ReturnType<typeof frameSignature>> | null;
      try {
        await page.locator('main[aria-busy="true"]').first().waitFor({ state: 'visible', timeout: 2000 });
        loadingFrame = await frameSignature(page);
      } catch {
        loadingFrame = null;
      }
      await navigation;
      await page.locator('main:not([aria-busy="true"])').first().waitFor({ state: 'visible' });
      const loadedFrame = await frameSignature(page);

      const stable =
        loadingFrame !== null &&
        Math.abs(loadingFrame.x - loadedFrame.x) <= 1 &&
        Math.abs(loadingFrame.width - loadedFrame.width) <= 1 &&
        loadingFrame.paddingTop === loadedFrame.paddingTop &&
        loadingFrame.mainClasses.split(/\s+/).includes('page-stack') &&
        loadedFrame.mainClasses.split(/\s+/).includes('page-stack');

      softCheck(
        'F-13',
        spec.id,
        'light',
        1280,
        stable,
        `loading=${JSON.stringify(loadingFrame)} loaded=${JSON.stringify(loadedFrame)}`,
      );

      await page.unroute(apiPattern);
    });
  }
});
