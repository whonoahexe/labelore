// The RESEARCH briefing e2e (quick-260929-3x3): real files, never a mock. Fixtures resolve by path
// against the live `/api/presentation` payload (the context-brief.spec.ts idiom) so an archival/rename
// fails loudly instead of silently skipping. The Labelore tests run against the repo's own server on
// port 4199; the Lendshed v1.0/02 test runs against the read-only server on the made-up Lendshed
// project (port 4198, FIXTURE_BASE_URL; playwright.config.ts always starts it and throws at load when
// the fixture tree is missing). Nothing in this file skips. This spec asserts the foundation sweep's
// key invariants itself (one h1, an eyebrow, squared corners, no 420px overflow), since the full
// sweep is too slow to run per change.
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { FIXTURE_BASE_URL } from './fixture-root.ts';
import { SCREENSHOT_ROOT } from './pages.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) throw new Error(`research-briefing.spec: /api/presentation responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`research-briefing.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

test.describe('RESEARCH briefing', () => {
  test('LB v1.0/02 briefing', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '02-situational-awareness-artifact-reading/02-RESEARCH.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#research-summary').waitFor({ state: 'visible' });

    // Cover and page invariants.
    await expect(page.locator('.document-cover')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText(/^Research/);
    await expect(page.locator('.view-research-confidence')).toContainText('Mixed confidence');
    await expect(page.locator('.view-research-domain')).toContainText('Domain');

    // Chapters number 01..06 in order.
    await expect(page.locator('.view-research-chapter-number')).toHaveText(['01', '02', '03', '04', '05', '06']);

    // 01 Standard stack: 21 packages, the Flagged lane caps at 4 then expands to 12.
    await expect(page.locator('#research-stack .view-research-package')).toHaveCount(21);
    const flagged = page.locator('.view-research-lane[data-verdict="sus"]');
    await expect(flagged.locator('.view-research-lane-items li')).toHaveCount(4);
    await expect(flagged.getByRole('button', { name: 'Show 8 more flagged' })).toBeVisible();
    await flagged.getByRole('button', { name: 'Show 8 more flagged' }).click();
    await expect(flagged.locator('.view-research-lane-items li')).toHaveCount(12);
    await expect(page.locator('.view-research-lane[data-verdict="ok"] .view-research-approved[data-dashed="true"]')).toHaveCount(0);

    // 02 Architecture (quick-260930-mp6, sketch 012 B): 23 nodes drawn in kind lanes, a details panel on
    // click, Shown as drawn back to the 23 lifted cards, and a 27-row clean list with no Changed-only filter.
    const architecture = page.locator('#research-architecture');
    await expect(architecture.locator('.lane-diagram-node')).toHaveCount(23);
    await expect(architecture.locator('.lifted-diagram-card')).toHaveCount(0);
    await architecture.locator('.lane-diagram-node', { hasText: 'Dashboard' }).first().click();
    await expect(architecture.locator('.lane-diagram-panel')).toBeVisible();
    await expect(architecture.locator('.lane-diagram-panel')).toContainText('As written');
    await page.keyboard.press('Escape');
    await expect(architecture.locator('.lane-diagram-panel')).toBeHidden();
    await architecture.getByRole('button', { name: 'Shown as drawn' }).click();
    await expect(architecture.locator('.lifted-diagram-card')).toHaveCount(23);
    await architecture.getByRole('button', { name: 'Shown as drawn' }).first().click();
    await expect(architecture.locator('.lane-diagram-node')).toHaveCount(23);
    await expect(page.locator('#research-architecture .clean-tree-row')).toHaveCount(27);
    await expect(page.getByRole('button', { name: /Changed only/ })).toHaveCount(0);

    // 03 pitfalls, 06 sources collapsed.
    await expect(page.locator('.view-research-pitfall')).toHaveCount(9);
    await expect(page.locator('.view-research-sources-toggle')).toContainText('Primary 5 · Secondary 12 · Tertiary 1');

    // At a glance sits under the recommendation.
    await expect(page.locator('.view-research-glance-row')).toHaveCount(4);

    // F-05: every status chip on the page measures the same (buttons and spans alike).
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(10);
    expect(new Set(signatures).size).toBe(1);

    // The source-only strip: 7 buttons; one lands in Source mode at its heading.
    const strip = page.locator('#research-source-only');
    await expect(strip.getByRole('button')).toHaveCount(7);
    await strip.getByRole('button', { name: 'Security Domain', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-block')).toHaveCount(0);
    const heading = page.locator('.artifact-document h2', { hasText: 'Security Domain' });
    await expect
      .poll(async () => {
        const box = await heading.boundingBox();
        const height = page.viewportSize()?.height ?? 0;
        return box !== null && box.y >= 0 && box.y < height;
      })
      .toBe(true);

    // Back to View restores the chapters.
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-research-chapter-number')).toHaveCount(6);

    // Squared corners on the new chrome.
    for (const selector of ['.figure-frame', '.lane-diagram-node', '.view-research-lane', '.view-research-pitfall']) {
      const radii = await page
        .locator(selector)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // 420px, dark: nothing overflows the page.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#research-summary').waitFor({ state: 'visible' });
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
  });

  test('FX v1.0/02 briefing', async ({ page }) => {
    const url = await resolveFixtureUrl(FIXTURE_BASE_URL, 'v1.0-phases/02-shed-inventory-health/02-RESEARCH.md');
    await page.goto(`${FIXTURE_BASE_URL}${url}`);
    await page.locator('#research-summary').waitFor({ state: 'visible' });

    // Shed inventory health draws as nine nodes in six kind lanes; Shown as drawn is the nine lifted boxes.
    await expect(page.locator('.lane-diagram-node')).toHaveCount(9);
    await expect(page.locator('.lane-diagram-lane')).toHaveCount(6);
    await page.locator('#research-architecture').getByRole('button', { name: 'Shown as drawn' }).click();
    await expect(page.locator('.lifted-diagram-card[data-kind="box"]')).toHaveCount(9);
    await expect(page.getByRole('button', { name: 'Changed only · 3' })).toBeVisible();
    await expect(page.locator('.view-research-env .status-chip', { hasText: 'blocking' })).toHaveCount(3);
    await expect(page.locator('.view-research-pitfall[data-severity="CRITICAL"]')).toHaveCount(3);
    await expect(page.locator('.view-research-approved[data-dashed="true"]')).toHaveCount(4);
  });
});

// labelore v1.0/01's system diagram: a CLI box whose right border the author drew past its corner
// (the as-drawn view must close around it with no stray bars).
test.describe('RESEARCH briefing figures', () => {
  test('LB v1.0/01 architecture figures', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '01-read-layer-domain-model/01-RESEARCH.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#research-summary').waitFor({ state: 'visible' });
    const system = page.locator('#research-architecture .figure-frame').first();

    // Lanes by default: the unboxed disk source and both outputs are nodes beside the three boxes.
    const nodes = system.locator('.lane-diagram-node');
    await expect(nodes).toHaveCount(6);
    for (const name of ['Layer A', 'Layer B', 'CLI', 'stdout JSON', 'Vitest golden-file suite']) {
      await expect(nodes.filter({ hasText: name })).toHaveCount(1);
    }
    await expect(nodes.filter({ hasText: '.planning' })).toHaveAttribute('data-kind', 'external');

    // Shown as drawn: three clean cards, the CLI title inside its card.
    await system.getByRole('button', { name: 'Shown as drawn' }).click();
    await expect(system.locator('.lifted-diagram-card[data-kind="box"]')).toHaveCount(3);
    const rows = system.locator('.lifted-diagram-row');
    for (const row of [25, 26, 27, 28]) await expect(rows.nth(row).locator('[data-glyph="line"]')).toHaveCount(0);
    const title = await system.locator('.lifted-diagram-node', { hasText: /^CLI \(src\/cli/ }).boundingBox();
    const cli = await system.locator('.lifted-diagram-card[data-kind="box"]').evaluateAll((cards, top) => {
      const hit = cards
        .map((card) => card.getBoundingClientRect())
        .find((r) => r.top <= (top as number) && r.bottom >= (top as number));
      return hit ? hit.right : null;
    }, (title?.y ?? 0) + (title?.height ?? 0) / 2);
    expect(title).not.toBeNull();
    expect(cli).not.toBeNull();
    expect(cli ?? 0).toBeGreaterThanOrEqual((title?.x ?? 0) + (title?.width ?? 0) - 0.5);
  });

  test('LB v1.0/01: figures fit with no inner scrollbar, and a tree in the structure notes spans the chapter', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '01-read-layer-domain-model/01-RESEARCH.md');
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'light'));
    await page.goto(url);
    await page.locator('#research-summary').waitFor({ state: 'visible' });
    const architecture = page.locator('#research-architecture');
    const system = architecture.locator('.figure-frame').first();

    // Every vertical scroller inside a figure body: none may overflow while the figure fits.
    const scrollers = () =>
      architecture.locator('.figure-frame-body').evaluateAll((bodies) =>
        bodies
          .flatMap((body) => [body, ...Array.from(body.querySelectorAll('*'))])
          .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
          .filter((el) => el.scrollHeight > el.clientHeight)
          .map((el) => `${el.className}: ${el.scrollHeight} > ${el.clientHeight}`),
      );
    expect(await scrollers()).toEqual([]);
    await system.screenshot({ path: join(SCREENSHOT_ROOT, 'qhq', 'system-lanes.png') });
    await system.getByRole('button', { name: 'Shown as drawn' }).click();
    await expect(system.locator('.lifted-diagram-card').first()).toBeVisible();
    expect(await scrollers()).toEqual([]);
    await system.screenshot({ path: join(SCREENSHOT_ROOT, 'qhq', 'system-as-drawn.png') });

    // The fixtures/test tree sits in the structure notes: as wide as the src/ tree above it, styled the
    // same, wider than the note's prose; a note with no figure keeps its reading measure.
    const sub = architecture.locator('.view-research-sub').filter({ has: page.locator('.view-research-note .figure-frame') }).first();
    const [outer, inner] = await Promise.all([
      sub.locator(':scope > .figure-frame').boundingBox(),
      sub.locator('.view-research-note .figure-frame').first().boundingBox(),
    ]);
    expect(Math.abs((outer?.width ?? 0) - (inner?.width ?? -10))).toBeLessThanOrEqual(1);
    const list = await sub.locator('.view-research-note ul').first().boundingBox();
    if (list) expect(inner?.width ?? 0).toBeGreaterThan(list.width);
    const look = (frame: string) =>
      sub.locator(frame).locator('.clean-tree-name').first().evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.fontSize, style.color];
      });
    expect(await look('.view-research-note .figure-frame >> nth=0')).toEqual(await look(':scope > .figure-frame'));
    const capped = await page
      .locator('div.view-research-note')
      .evaluateAll((notes) =>
        notes.filter((n) => !n.querySelector('.figure-frame')).map((n) => getComputedStyle(n).maxWidth),
      );
    expect(capped.length).toBeGreaterThan(0);
    for (const value of capped) expect(value).not.toBe('none');
    await sub.screenshot({ path: join(SCREENSHOT_ROOT, 'qhq', 'directory-structure.png') });
  });
});
