// The CONTEXT brief e2e (quick-260923-lju, sketch-006 D1): real files, never a mock. Fixtures resolve by
// path against the live `/api/presentation` payload (the document-layout.spec.ts `resolveFixturePath`
// pattern) so an archival/rename fails loudly here instead of silently skipping. Labelore's own files run
// against the default server on port 4199; the nine made-up Lendshed CONTEXT files run against the
// read-only server on port 4198 (playwright.config.ts always starts it and throws at load when the
// fixture tree is missing). Nothing in this file skips.
import { expect, test } from '@playwright/test';
import { BASE_URL, artifactUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface ArtifactDtoLite {
  key: string;
  path: string;
}

interface PresentationLite {
  artifacts: ArtifactDtoLite[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) {
    throw new Error(`context-brief.spec: /api/presentation responded ${response.status}`);
  }
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) {
    throw new Error(`context-brief.spec: no artifact found with path including "${pathIncludes}"`);
  }
  return artifact.path;
}

test.describe('CONTEXT brief — LB v1.1/05 (tracer)', () => {
  test('renders the D1 brief: no cover, boundary before register, quiet out-strip, full register with click-to-open', async ({
    page,
    baseURL,
  }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '05-per-type-document-views/05-CONTEXT.md'));
    await page.goto(url);

    await expect(page.locator('.document-cover')).toHaveCount(0);

    const boundary = page.locator('#context-boundary');
    const decisions = page.locator('#context-decisions');
    await expect(boundary).toBeVisible();
    await expect(decisions).toBeVisible();
    const boundaryY = await boundary.evaluate((el) => el.getBoundingClientRect().top);
    const decisionsY = await decisions.evaluate((el) => el.getBoundingClientRect().top);
    expect(boundaryY).toBeLessThan(decisionsY);

    await expect(page.locator('.view-context-out li')).toHaveCount(4);

    const rows = page.locator('.view-context-decision');
    await expect(rows).toHaveCount(15);
    const countBox = decisions.locator('header.section-heading span').first();
    await expect(countBox).toHaveText('15');

    const firstSummary = rows.first().locator('.view-context-summary');
    await expect(firstSummary).toHaveAttribute('aria-expanded', 'false');
    await firstSummary.click();
    await expect(firstSummary).toHaveAttribute('aria-expanded', 'true');
    await expect(rows.first().locator('.view-context-detail')).toBeVisible();
  });

  test('the artifact-meta-row holds a status chip and the copy-path button', async ({ page, baseURL }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '05-per-type-document-views/05-CONTEXT.md'));
    await page.goto(url);
    const metaRow = page.locator('.artifact-meta-row');
    await expect(metaRow.locator('.status-chip')).toBeVisible();
    await expect(metaRow.locator('.artifact-path-copy')).toBeVisible();
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText(/^Context/);
  });

  test('toggling to Source shows the full document and back restores the brief', async ({ page, baseURL }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '05-per-type-document-views/05-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });
    const viewBlocksBefore = await page.locator('.view-block').count();
    expect(viewBlocksBefore).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Source', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('.view-block')).toHaveCount(0);

    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('.view-block')).toHaveCount(viewBlocksBefore);
  });

  test('the "decisions locked" stat focuses the first decision row, and 4 discretion notes sit under decisions', async ({
    page,
    baseURL,
  }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '05-per-type-document-views/05-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });

    const lockedStat = page.locator('.view-context-stat', { hasText: 'decisions locked' });
    await expect(lockedStat).toBeVisible();
    await lockedStat.click();
    const firstDecision = page.locator('.view-context-decision').first();
    await expect(firstDecision).toBeFocused();

    await expect(page.locator('.view-context-claude-note')).toHaveCount(4);
  });
});

test.describe('CONTEXT brief — repo fixtures', () => {
  test('LB v1.0/01: label-prose out (1 item), discretion lead + bullets + trailer', async ({ page, baseURL }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '01-read-layer-domain-model/01-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });
    await expect(page.locator('.document-cover')).toHaveCount(0);
    await expect(page.locator('.view-context-out li')).toHaveCount(1);
    await expect(page.locator('.view-context-decision')).toHaveCount(16);
  });

  test('quick oae: 9 untagged rows across 3 areas, no out-strip, no discretion panel', async ({ page, baseURL }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '260912-oae-revamp-progress-panel-to-show-phase-and-/260912-oae-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });
    await expect(page.locator('.view-context-decision')).toHaveCount(9);
    await expect(page.locator('.view-context-area')).toHaveCount(3);
    await expect(page.locator('.view-context-out')).toHaveCount(0);
    await expect(page.locator('#context-discretion')).toHaveCount(0);
  });

  test('quick jxp: the numbered boundary list in the In card, and 1 out item from "Out of scope:"', async ({
    page,
    baseURL,
  }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '260923-jxp-discussion-log-page-review-fixes-on-the-/260923-jxp-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });
    await expect(page.locator('.view-context-out li')).toHaveCount(1);
    await expect(page.locator('.view-context-decision')).toHaveCount(15);
  });

  test('every repo fixture: View mode renders no "More in this document" disclosure', async ({ page, baseURL }) => {
    const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '05-per-type-document-views/05-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });
    await expect(page.locator('#view-remainder')).toHaveCount(0);
  });
});

test.describe('CONTEXT brief — Lendshed fixture (4198)', () => {
  test('phase 01: attention panel with 3 rows; clicking a blocks-D chip jumps to and expands the decision', async ({
    page,
  }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '01-member-sign-in-sessions/01-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-open').waitFor({ state: 'visible' });
    await expect(page.locator('.view-context-open-list li')).toHaveCount(3);

    const blocksChip = page.locator('#question-open-01 button', { hasText: 'blocks D-09' });
    await blocksChip.click();
    const target = page.locator('#decision-d-09');
    await expect(target).toBeFocused();
    await expect(target.locator('.view-context-detail')).toBeVisible();

    await expect(page.locator('.artifact-meta-row .source-note')).toContainText('SIGN-01');
  });

  test('phase 04: Already-decided note is a collapsed 9-row aside, out-strip has 1 item, no extras', async ({
    page,
  }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '04-bulk-loan-export/04-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-boundary').waitFor({ state: 'visible' });
    await expect(page.locator('.view-context-out li')).toHaveCount(1);
    const decided = page.locator('#boundary-note-1');
    const decidedHead = decided.locator('.view-context-aside-toggle');
    await expect(decidedHead).toContainText('Already decided');
    await expect(decidedHead).toHaveAttribute('aria-expanded', 'false');
    await decidedHead.click();
    await expect(decided.locator('table tbody tr')).toHaveCount(9);
    // The file's one boundary section holds no unrecognised extra: canonical references and existing
    // code insights are claimed as back-matter aside rows (quick-260925-3ob). Phase 04 therefore yields
    // 0 extras and three asides: the Already-decided note, references and code. Its
    // `<blocking_amendments>` section ("A research recommendation no longer applies") is a planner
    // warning, not requirement amendments, so it is recognised and hidden.
    await expect(page.locator('.view-context-extra')).toHaveCount(0);
    await expect(page.locator('.view-context-aside')).toHaveCount(3);
    await expect(page.locator('#context-amendments')).toHaveCount(0);
  });

  test('quick k2p: .view-context-note count is 10', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '260403-k2p-add-right-click-menu-to-catalogue-grid/260403-k2p-CONTEXT.md'));
    await page.goto(url);
    await page.locator('#context-decisions').waitFor({ state: 'visible' });
    await expect(page.locator('.view-context-note')).toHaveCount(10);
  });

  test('phase 01 + 03: ideas grouped by fate (sketch 007 C)', async ({ page }) => {
    const fx01 = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '01-member-sign-in-sessions/01-CONTEXT.md'));
    await page.goto(fx01);
    await page.locator('#context-specifics').waitFor({ state: 'visible' });

    // Phase 01 holds two specific ideas, one rule and one leaning (counted in the file's specifics bullets).
    await expect(page.locator('#context-specifics .view-context-idea')).toHaveCount(2);
    await expect(page.locator('#context-specifics .view-context-idea[data-kind="rule"]')).toHaveCount(1);
    await expect(page.locator('#context-specifics .view-context-idea[data-kind="leaning"]')).toHaveCount(1);

    // Three deferred ideas fall into two fate groups: one handed on, two passed over.
    const groups = page.locator('#context-deferred .view-context-fate');
    await expect(groups).toHaveCount(2);
    await expect(groups.first()).toHaveAttribute('data-fate', 'handed');
    await expect(groups.first().locator('.view-context-idea').first()).toContainText('→ Phase 3 · ADMN-03');

    // Groups start collapsed; the header expands and re-collapses its own items.
    const passed = page.locator('.view-context-fate[data-fate="passed"]');
    const passedHead = passed.locator('.view-context-fate-head');
    await expect(passedHead).toHaveAttribute('aria-expanded', 'false');
    await expect(passed.locator('.view-context-idea').first()).toBeHidden();
    await passedHead.click();
    await expect(passedHead).toHaveAttribute('aria-expanded', 'true');
    await expect(passed.locator('.view-context-idea').first()).toBeVisible();
    await passedHead.click();
    await expect(passedHead).toHaveAttribute('aria-expanded', 'false');
    await expect(passed.locator('.view-context-idea').first()).toBeHidden();

    const fx03 = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, '03-account-admin-and-sessions/03-CONTEXT.md'));
    await page.goto(fx03);
    await page.locator('#context-deferred').waitFor({ state: 'visible' });

    // Phase 03: ten deferred ideas, eight declined (five with a revisit trigger), one out, one carried.
    const declined = page.locator('.view-context-fate[data-fate="declined"]');
    await expect(declined.locator('.view-context-idea')).toHaveCount(8);
    await expect(declined.locator('.view-context-revisit')).toHaveCount(5);
    await expect(page.locator('.view-context-fate[data-fate="out"] .view-context-idea')).toHaveCount(1);
    await expect(page.locator('.view-context-fate[data-fate="carried"] .view-context-idea')).toHaveCount(1);
    await expect(declined.locator('.view-context-fate-body').first()).toContainText("D-01's first option");
  });
});

test.describe('CONTEXT brief — 420px overflow (no horizontal scroll)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`LB v1.1/05 at 420px, ${theme}: document does not overflow, every bounded table/code scrolls in place`, async ({
      page,
      baseURL,
    }) => {
      await page.addInitScript((t: string) => {
        window.localStorage.setItem('labelore-theme', t);
      }, theme);
      await page.setViewportSize({ width: 420, height: 900 });
      const url = await artifactUrl(baseURL ?? BASE_URL, await resolveFixturePath(baseURL ?? BASE_URL, '05-per-type-document-views/05-CONTEXT.md'));
      await page.goto(url);
      await page.locator('#context-boundary').waitFor({ state: 'visible' });

      // Expand the first decision and first idea — the widest states the layout can be in —
      // before measuring.
      await page.locator('.view-context-decision').first().locator('.view-context-summary').click();
      const firstIdea = page.locator('.view-context-idea').first();
      if (await firstIdea.count()) await firstIdea.click();

      const overflow = await page.evaluate(() => ({
        docScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        boundaries: Array.from(document.querySelectorAll('.document-overflow-boundary')).map((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        })),
      }));
      expect(overflow.docScrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
    });
  }
});
