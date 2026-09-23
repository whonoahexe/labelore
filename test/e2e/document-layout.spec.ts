// sketch-004 B3 "folded chapters" e2e coverage (quick-260922-3us Task 1). Fixtures are resolved by
// path from the live `/api/presentation` payload (never hardcoded URLs) so the suite always
// reflects this repo's own `.planning/` corpus. `runFullBehaviorChecks` is the shared behavior
// helper Task 2 (plan/verification cover/glance smoke) and Task 3 (full coverage over every type,
// plus the foundation-sweep updates) build on — Task 3 appends fixtures here rather than
// duplicating the checks. Uses plain `expect` throughout; `results.json` belongs to the separate
// foundation-consistency sweep.
import { expect, test, type Page } from '@playwright/test';

interface Fixture {
  id: string;
  /** A substring of the artifact's own `path`, unique enough in this repo's corpus to resolve to
   * exactly one artifact via `/api/presentation`. */
  pathIncludes: string;
  glance: boolean;
}

const DISCUSSION_LOG_FIXTURES: Fixture[] = [
  {
    id: '01-discussion-log',
    pathIncludes: '01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    glance: true,
  },
  {
    id: '02-discussion-log',
    pathIncludes: '02-situational-awareness-artifact-reading/02-DISCUSSION-LOG.md',
    glance: false,
  },
  {
    id: '03-discussion-log',
    pathIncludes: '03-search-browsing-traceability/03-DISCUSSION-LOG.md',
    glance: true,
  },
  {
    id: '05-discussion-log',
    pathIncludes: '05-per-type-document-views/05-DISCUSSION-LOG.md',
    glance: true,
  },
];

interface ArtifactDtoLite {
  key: string;
  path: string;
}

interface PresentationLite {
  artifacts: ArtifactDtoLite[];
}

/** Resolves a fixture's route by matching `path` against `/api/presentation`'s live artifact
 * list — never a hardcoded URL, so an archival/rename never silently starts skipping a fixture
 * (it fails loudly here instead). */
async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) {
    throw new Error(`document-layout.spec: /api/presentation responded ${response.status}`);
  }
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) {
    throw new Error(`document-layout.spec: no artifact found with path including "${pathIncludes}"`);
  }
  return artifact.key;
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('labelore-theme', t);
  }, theme);
}

async function waitForCover(page: Page): Promise<void> {
  await page.locator('.document-cover').first().waitFor({ state: 'visible' });
}

/**
 * The full sketch-004 B3 behavior contract, run against one fixture: cover present with a smaller
 * h1 than the reference roadmap page; index/fold counts match; glance present/absent per
 * `fixture.glance`; the first fold toggles; Expand all/Collapse all; the pinned chapter bar's
 * appear/disappear and offset; the last index entry opens the Also chapter and scrolls it into
 * view; the glance action (when present) opens its target; the header toggle to Source removes
 * every fold but keeps the cover, and an index click from Source returns to View with that
 * chapter open; finally, at 420px in both themes with everything expanded, no horizontal overflow.
 */
async function runFullBehaviorChecks(
  page: Page,
  baseURL: string,
  fixture: Fixture,
): Promise<void> {
  const url = await resolveFixtureUrl(baseURL, fixture.pathIncludes);

  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/roadmap');
  await page.locator('.page-intro h1').first().waitFor({ state: 'visible' });
  const refFontSize = await page
    .locator('.page-intro h1')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  await page.goto(url);
  await waitForCover(page);

  const coverFontSize = await page
    .locator('.document-cover h1')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(coverFontSize, 'cover h1 must be smaller than the reference roadmap h1').toBeLessThan(
    refFontSize,
  );

  // quick-260923-jxp: index count also includes ghost rows and — once alsoStyle is 'endnotes' —
  // the endnotes sheet, which is no longer a `.document-fold`.
  const indexCount = await page.locator('.document-chapter-index li').count();
  const foldCount = await page.locator('.document-fold').count();
  const ghostCount = await page.locator('.document-ghost').count();
  const endnotesCount = await page.locator('.document-endnotes').count();
  expect(foldCount).toBeGreaterThan(0);
  expect(indexCount).toBe(foldCount + ghostCount + endnotesCount);

  const glanceCount = await page.locator('.document-cover-glance').count();
  const dataGlance = await page.locator('.document-cover-cells').first().getAttribute('data-glance');
  if (fixture.glance) {
    expect(glanceCount).toBeGreaterThan(0);
    expect(dataGlance).toBe('true');
  } else {
    expect(glanceCount).toBe(0);
    expect(dataGlance).toBe('false');
  }

  // First fold toggles aria-expanded and its body.
  const firstFoldHead = page.locator('.document-fold-head').first();
  const firstFold = page.locator('.document-fold').first();
  await expect(firstFoldHead).toHaveAttribute('aria-expanded', 'false');
  await firstFoldHead.click();
  await expect(firstFoldHead).toHaveAttribute('aria-expanded', 'true');
  await expect(firstFold.locator('.document-fold-body')).toBeVisible();
  await firstFoldHead.click();
  await expect(firstFoldHead).toHaveAttribute('aria-expanded', 'false');
  expect(await firstFold.locator('.document-fold-body').count()).toBe(0);

  // Expand all opens every fold and flips to Collapse all, which closes them. The chapter-bar
  // scroll check below deliberately runs *while everything is still expanded* — with every fold
  // collapsed the page can be shorter than the viewport, in which case "scroll to the bottom" is a
  // no-op and the cover never actually leaves view.
  const foldToolsButton = page.locator('.document-fold-tools button');
  await expect(foldToolsButton).toHaveText(/expand all/i);
  await foldToolsButton.click();
  await expect(foldToolsButton).toHaveText(/collapse all/i);
  await expect(page.locator('.document-fold[data-open="true"]')).toHaveCount(foldCount);

  // Chapter bar: absent at top, visible after scrolling past the cover.
  await expect(page.locator('.document-chapter-bar')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const chapterBar = page.locator('.document-chapter-bar');
  await chapterBar.waitFor({ state: 'visible' });
  const barBox = await chapterBar.boundingBox();
  const headerBox = await page.locator('.shell-header').boundingBox();
  expect(barBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  if (barBox && headerBox) {
    expect(Math.abs(barBox.y - (headerBox.y + headerBox.height))).toBeLessThanOrEqual(24);
  }
  const barNumberText = (await page.locator('.document-chapter-bar-number').innerText()).trim();
  expect(barNumberText).toMatch(/^\d{2}$/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.document-chapter-bar')).toHaveCount(0);

  await foldToolsButton.click();
  await expect(foldToolsButton).toHaveText(/expand all/i);
  await expect(page.locator('.document-fold[data-open="true"]')).toHaveCount(0);

  // The last index entry targets #chapter-also and scrolls it into the viewport. The scroll
  // itself is a `behavior: 'smooth'` animation (jumpTo, layout-components.tsx) — poll rather than
  // read the bounding box once, so a still-animating scroll never reads as a failure.
  // quick-260923-jxp: a fold-style Also opens/collapses like any chapter fold; an endnotes-style
  // Also (discussion logs) has no `.document-fold-head` and is always open.
  await page.locator('.document-chapter-index li button').last().click();
  const alsoTarget = page.locator('#chapter-also');
  const alsoIsEndnotes = (await alsoTarget.locator('.document-endnotes').count()) > 0 || (await page.locator('#chapter-also.document-endnotes').count()) > 0;
  if (!alsoIsEndnotes) {
    await expect(alsoTarget).toHaveAttribute('data-open', 'true');
  } else {
    await expect(alsoTarget.locator('.document-fold-head')).toHaveCount(0);
  }
  const viewportSize = page.viewportSize();
  expect(viewportSize).not.toBeNull();
  if (viewportSize) {
    const viewportHeight = viewportSize.height;
    await expect
      .poll(async () => (await alsoTarget.boundingBox())?.y ?? Number.POSITIVE_INFINITY)
      .toBeLessThan(viewportHeight);
  }
  // Collapse it back down before the glance/source checks below (fold style only — endnotes never
  // collapse).
  if (!alsoIsEndnotes) {
    await page.locator('#chapter-also .document-fold-head').click();
  }

  // The glance action opens its target chapter (only meaningful when a glance cell exists).
  // quick-260923-jxp: a discussion-log glance can target the Endnotes sheet (e.g. the discretion
  // panel) rather than a real chapter fold — the sheet itself has no fold to open, so fall back to
  // asserting it (always open) is visible instead.
  if (fixture.glance) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.document-cover-glance button').click();
    const openFold = page.locator('.document-fold[data-open="true"]').first();
    if ((await openFold.count()) > 0) {
      await expect(openFold).toBeVisible();
    } else {
      await expect(page.locator('.document-endnotes').first()).toBeVisible();
    }
  }

  // Header toggle to Source removes folds but keeps .document-cover.
  const headerToggle = page.locator('.artifact-heading .document-view-toggle');
  await headerToggle.getByRole('button', { name: 'Source' }).click();
  expect(await page.locator('.document-fold').count()).toBe(0);
  await expect(page.locator('.document-cover')).toBeVisible();

  // An index click returns to View with that chapter open.
  await page.locator('.document-chapter-index li button').first().click();
  const firstFoldAfterReturn = page.locator('.document-fold').first();
  await expect(firstFoldAfterReturn).toBeVisible();
  await expect(firstFoldAfterReturn).toHaveAttribute('data-open', 'true');

  // 420px, both themes, everything expanded: no horizontal overflow.
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto(url);
    await waitForCover(page);
    await page.locator('.document-fold-tools button').click();
    await expect(page.locator('.document-fold[data-open="true"]')).toHaveCount(foldCount);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(
      overflow.scrollWidth,
      `${fixture.id} ${theme}@420: horizontal overflow (${overflow.scrollWidth} > ${overflow.innerWidth})`,
    ).toBeLessThanOrEqual(overflow.innerWidth + 1);
  }
}

// quick-260922-3us Task 3: PLAN and VERIFICATION fixtures appended to the same full-behavior
// helper Task 1 wrote — the whole cover/fold/bar/jump/source/420 contract, proven type-agnostic.
const PLAN_AND_VERIFICATION_FULL_FIXTURES: Fixture[] = [
  { id: '01-01-plan-full', pathIncludes: '01-read-layer-domain-model/01-01-PLAN.md', glance: true },
  { id: '01-02-plan-full', pathIncludes: '01-read-layer-domain-model/01-02-PLAN.md', glance: false },
  {
    id: '05-verification-full',
    pathIncludes: '05-per-type-document-views/05-VERIFICATION.md',
    glance: true,
  },
  {
    id: '01-verification-full',
    pathIncludes: '01-read-layer-domain-model/01-VERIFICATION.md',
    glance: false,
  },
  {
    id: '02-verification-full',
    pathIncludes: '02-situational-awareness-artifact-reading/02-VERIFICATION.md',
    glance: false,
  },
];

test.describe('document layout — sketch-004 B3 (quick-260922-3us)', () => {
  for (const fixture of [...DISCUSSION_LOG_FIXTURES, ...PLAN_AND_VERIFICATION_FULL_FIXTURES]) {
    test(fixture.id, async ({ page, baseURL }) => {
      await runFullBehaviorChecks(page, baseURL ?? 'http://127.0.0.1:4199', fixture);
    });
  }

  test('05 discussion log: a reference preview opens from inside an expanded Also panel', async ({
    page,
    baseURL,
  }) => {
    const url = await resolveFixtureUrl(
      baseURL ?? 'http://127.0.0.1:4199',
      '05-per-type-document-views/05-DISCUSSION-LOG.md',
    );
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url);
    await waitForCover(page);

    // quick-260923-jxp: 05's Also chapter is now the always-open Endnotes sheet — no
    // `.document-fold-head` to click. Click it only when present (a fold-style Also).
    const alsoFoldHead = page.locator('#chapter-also .document-fold-head');
    if ((await alsoFoldHead.count()) > 0) {
      await alsoFoldHead.click();
    }
    const referenceTrigger = page.locator('#chapter-also [data-reference-key]').first();
    const found = (await referenceTrigger.count()) > 0;
    expect(found, 'expected at least one [data-reference-key] inside the Also chapter on 05').toBe(
      true,
    );
    await referenceTrigger.click();
    await expect(page.locator('.reference-preview')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// quick-260923-jxp: discussion-log review fixes — answer cards, numbered options, quiet notes
// (Task 1), ghosts/dates/Endnotes/cover-number truth (Task 2).
// ---------------------------------------------------------------------------

test.describe('discussion-log review fixes (quick-260923-jxp)', () => {
  test('answer card: numbered/titled, options list badges skip it, no "note" in the toggle label, a note toggle reveals its text', async ({
    page,
    baseURL,
  }) => {
    const url = await resolveFixtureUrl(
      baseURL ?? 'http://127.0.0.1:4199',
      '05-per-type-document-views/05-DISCUSSION-LOG.md',
    );
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url);
    await waitForCover(page);
    await page.locator('.document-fold-tools button').click(); // Expand all

    const firstItem = page.locator('.document-item').first();
    const answer = firstItem.locator('.document-answer');
    await expect(answer).toHaveCount(1);
    const answerNumberText = (await answer.locator('.document-option-number').first().innerText()).trim();
    expect(answerNumberText).toMatch(/^\d+$/);
    const answerTitleText = (await answer.locator('.document-option-title').first().innerText()).trim();
    expect(answerTitleText).not.toBe('');

    const moreButton = firstItem.locator('.document-item-more button');
    if ((await moreButton.count()) > 0) {
      const label = (await moreButton.innerText()).toLowerCase();
      expect(label).not.toContain('note');
      await moreButton.click();
      const optionList = firstItem.locator('.document-option-list');
      if ((await optionList.count()) > 0) {
        const numbers = await optionList
          .locator('.document-option-number')
          .allInnerTexts();
        const parsed = numbers.map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));
        for (let i = 1; i < parsed.length; i++) {
          expect(parsed[i]).toBeGreaterThan(parsed[i - 1]);
        }
        expect(parsed).not.toContain(Number(answerNumberText));
      }
    }

    // Every options-toggle label on the page avoids the word "note".
    const allToggleLabels = await page.locator('.document-item-more button').allInnerTexts();
    for (const label of allToggleLabels) {
      expect(label.toLowerCase()).not.toContain('note');
    }

    const noteToggle = page.locator('.document-item-note-toggle').first();
    await expect(noteToggle).toHaveCount(1);
    await expect(page.locator('.document-item-note').first()).toHaveCount(0);
    await noteToggle.click();
    await expect(noteToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.document-item-note').first()).toBeVisible();
  });

  interface GhostFixture {
    pathIncludes: string;
    ghostCount: number;
    discussedFact: string;
    loggedFact?: string;
  }

  const GHOST_FIXTURES: GhostFixture[] = [
    {
      pathIncludes: '01-read-layer-domain-model/01-DISCUSSION-LOG.md',
      ghostCount: 2,
      discussedFact: '4 of 6 offered areas',
      loggedFact: 'Aug 21, 2026',
    },
    {
      pathIncludes: '03-search-browsing-traceability/03-DISCUSSION-LOG.md',
      ghostCount: 4,
      discussedFact: '4 of 8 offered areas',
    },
    {
      pathIncludes: '02-situational-awareness-artifact-reading/02-DISCUSSION-LOG.md',
      ghostCount: 0,
      discussedFact: '4 of 4 offered areas',
    },
  ];

  for (const fixture of GHOST_FIXTURES) {
    test(`ghosts and cover facts: ${fixture.pathIncludes}`, async ({ page, baseURL }) => {
      const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', fixture.pathIncludes);
      await setTheme(page, 'light');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(url);
      await waitForCover(page);

      expect(await page.locator('.document-ghost').count()).toBe(fixture.ghostCount);
      expect(await page.locator('.document-chapter-index li[data-ghost]').count()).toBe(fixture.ghostCount);
      if (fixture.ghostCount > 0) {
        // .status-chip renders with `text-transform: uppercase` — compare case-insensitively.
        const ghostChipText = (await page.locator('.document-ghost .status-chip').first().innerText()).trim();
        expect(ghostChipText.toLowerCase()).toBe('not discussed');
      }

      const factsText = await page.locator('.document-cover-facts').innerText();
      expect(factsText).toContain(fixture.discussedFact);
      if (fixture.loggedFact) {
        expect(factsText).toContain(fixture.loggedFact);
      }
    });
  }

  test('05 discussion log: endnotes sheet holds #also-deferred, last index entry reads "Endnotes"', async ({
    page,
    baseURL,
  }) => {
    const url = await resolveFixtureUrl(
      baseURL ?? 'http://127.0.0.1:4199',
      '05-per-type-document-views/05-DISCUSSION-LOG.md',
    );
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url);
    await waitForCover(page);

    await expect(page.locator('.document-endnotes#chapter-also')).toHaveCount(1);
    await expect(page.locator('.document-endnotes#chapter-also #also-deferred')).toHaveCount(1);
    const lastIndexText = (
      await page.locator('.document-chapter-index li').last().innerText()
    ).trim();
    expect(lastIndexText).toContain('Endnotes');
  });

  const COVER_NUMBER_FIXTURES = [
    '01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    '02-situational-awareness-artifact-reading/02-DISCUSSION-LOG.md',
    '03-search-browsing-traceability/03-DISCUSSION-LOG.md',
    '05-per-type-document-views/05-DISCUSSION-LOG.md',
  ];

  for (const pathIncludes of COVER_NUMBER_FIXTURES) {
    test(`cover numbers equal rendered counts: ${pathIncludes}`, async ({ page, baseURL }) => {
      const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', pathIncludes);
      await setTheme(page, 'light');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(url);
      await waitForCover(page);
      await page.locator('.document-fold-tools button').click(); // Expand all

      const itemCount = await page.locator('.document-item').count();
      const headlineText = (
        await page.locator('.document-cover-headline strong').first().innerText()
      ).trim();
      expect(Number(headlineText)).toBe(itemCount);

      const foldCount = await page.locator('.document-fold').count();
      const topicsPillText = await page
        .locator('.document-cover-pill', { hasText: /Topics?$/ })
        .first()
        .innerText();
      expect(topicsPillText).toContain(String(foldCount));

      const claudeChoseCount = await page
        .locator('.document-item-state .status-chip', { hasText: 'Claude chose' })
        .count();
      const claudePill = page.locator('.document-cover-pill', { hasText: 'Left to Claude' });
      if (claudeChoseCount > 0) {
        expect(await claudePill.innerText()).toContain(String(claudeChoseCount));
      } else {
        expect(await claudePill.count()).toBe(0);
      }

      const deferredPanel = page.locator('#also-deferred');
      if ((await deferredPanel.count()) > 0) {
        const firstList = deferredPanel.locator('ul, ol').first();
        const deferredListItemCount = (await firstList.count()) > 0 ? await firstList.locator('> li').count() : 0;
        const deferredPill = page.locator('.document-cover-pill', { hasText: 'Deferred' });
        if (deferredListItemCount > 0) {
          expect(await deferredPill.innerText()).toContain(String(deferredListItemCount));
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// PLAN/VERIFICATION cover/glance smoke (quick-260922-3us Task 2) — a lighter check than
// `runFullBehaviorChecks` above: cover/glance presence, specific folds present/absent (with an
// item-count assertion where the fixture's shape is pinned), and the parsed headline. Archived
// fixtures are immutable, so hardcoded expected values are safe.
// ---------------------------------------------------------------------------

interface SmokeFoldExpectation {
  title: string;
  /** Asserted with `toBeGreaterThanOrEqual` — "at least one item". */
  minItems?: number;
  /** Asserted with `toBe` — an exact, pinned item count. */
  exactItems?: number;
}

interface SmokeFixture {
  id: string;
  pathIncludes: string;
  glance: boolean;
  headline?: string;
  foldsPresent?: SmokeFoldExpectation[];
  foldsAbsent?: string[];
}

const PLAN_AND_VERIFICATION_SMOKE_FIXTURES: SmokeFixture[] = [
  {
    id: '01-01-plan',
    pathIncludes: '01-read-layer-domain-model/01-01-PLAN.md',
    glance: true,
    foldsPresent: [{ title: 'Tasks', minItems: 1 }, { title: 'Must be true when done' }],
  },
  {
    id: '01-02-plan',
    pathIncludes: '01-read-layer-domain-model/01-02-PLAN.md',
    glance: false,
  },
  {
    id: '05-verification',
    pathIncludes: '05-per-type-document-views/05-VERIFICATION.md',
    glance: true,
    headline: '5/7',
    foldsPresent: [{ title: 'Needs a human', exactItems: 4 }],
  },
  {
    id: '01-verification',
    pathIncludes: '01-read-layer-domain-model/01-VERIFICATION.md',
    glance: false,
    headline: '5/5',
    foldsAbsent: ['Needs a human'],
  },
  {
    id: '02-verification',
    pathIncludes: '02-situational-awareness-artifact-reading/02-VERIFICATION.md',
    glance: false,
    headline: '6/6',
  },
];

async function runCoverGlanceSmoke(page: Page, baseURL: string, fixture: SmokeFixture): Promise<void> {
  const url = await resolveFixtureUrl(baseURL, fixture.pathIncludes);
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url);
  await waitForCover(page);

  const glanceCount = await page.locator('.document-cover-glance').count();
  const dataGlance = await page.locator('.document-cover-cells').first().getAttribute('data-glance');
  if (fixture.glance) {
    expect(glanceCount).toBeGreaterThan(0);
    expect(dataGlance).toBe('true');
  } else {
    expect(glanceCount).toBe(0);
    expect(dataGlance).toBe('false');
  }

  if (fixture.headline !== undefined) {
    const headlineText = (
      await page.locator('.document-cover-headline strong').first().innerText()
    ).trim();
    expect(headlineText).toBe(fixture.headline);
  }

  for (const fold of fixture.foldsPresent ?? []) {
    const foldSection = page
      .locator('.document-fold')
      .filter({ has: page.locator('.document-fold-name', { hasText: fold.title }) })
      .first();
    await expect(foldSection).toHaveCount(1);
    if (fold.minItems !== undefined || fold.exactItems !== undefined) {
      await foldSection.locator('.document-fold-head').click();
      const itemCount = await foldSection.locator('.document-item').count();
      if (fold.exactItems !== undefined) {
        expect(itemCount).toBe(fold.exactItems);
      } else if (fold.minItems !== undefined) {
        expect(itemCount).toBeGreaterThanOrEqual(fold.minItems);
      }
    }
  }

  for (const title of fixture.foldsAbsent ?? []) {
    expect(await page.locator('.document-fold-name', { hasText: title }).count()).toBe(0);
  }
}

test.describe('document layout — PLAN/VERIFICATION cover/glance smoke (quick-260922-3us)', () => {
  for (const fixture of PLAN_AND_VERIFICATION_SMOKE_FIXTURES) {
    test(fixture.id, async ({ page, baseURL }) => {
      await runCoverGlanceSmoke(page, baseURL ?? 'http://127.0.0.1:4199', fixture);
    });
  }

  // quick-260922-3us Task 3: a reference preview reachable from inside an expanded PLAN or
  // VERIFICATION chapter/panel. Tries each candidate fixture's every fold and Also panel in turn
  // (expanded first) — fails, never skips, if no `[data-reference-key]` is found anywhere.
  test('a reference preview opens from inside an expanded PLAN or VERIFICATION chapter/panel', async ({
    page,
    baseURL,
  }) => {
    const candidates = [
      '01-read-layer-domain-model/01-01-PLAN.md',
      '05-per-type-document-views/05-VERIFICATION.md',
      '01-read-layer-domain-model/01-VERIFICATION.md',
    ];
    let opened = false;
    for (const pathIncludes of candidates) {
      const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', pathIncludes);
      await setTheme(page, 'light');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(url);
      await waitForCover(page);
      await page.locator('.document-fold-tools button').click(); // Expand all
      const referenceTrigger = page.locator('[data-reference-key]').first();
      if ((await referenceTrigger.count()) > 0) {
        await referenceTrigger.click();
        await expect(page.locator('.reference-preview')).toBeVisible();
        opened = true;
        break;
      }
    }
    expect(
      opened,
      `expected at least one [data-reference-key] reachable inside an expanded PLAN/VERIFICATION document among: ${candidates.join(', ')}`,
    ).toBe(true);
  });
});
