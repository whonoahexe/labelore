// The CONTEXT brief e2e (quick-260923-lju, sketch-006 D1): real corpus files, never a fixture
// mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// document-layout.spec.ts `resolveFixtureUrl` pattern) so an archival/rename fails loudly here
// instead of silently skipping. Studio-portal fixtures (on port 4198, wired in Task 3) are
// test.skip when that server/project isn't present — this file's own repo-only tracer test always
// runs.
import { expect, test } from '@playwright/test';

interface ArtifactDtoLite {
  key: string;
  path: string;
}

interface PresentationLite {
  artifacts: ArtifactDtoLite[];
}

async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) {
    throw new Error(`context-brief.spec: /api/presentation responded ${response.status}`);
  }
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) {
    throw new Error(`context-brief.spec: no artifact found with path including "${pathIncludes}"`);
  }
  return artifact.key;
}

test.describe('CONTEXT brief — LB v1.1/05 (tracer)', () => {
  test('renders the D1 brief: no cover, boundary before register, quiet out-strip, full register with click-to-open', async ({
    page,
    baseURL,
  }) => {
    const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', '05-per-type-document-views/05-CONTEXT.md');
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
    const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', '05-per-type-document-views/05-CONTEXT.md');
    await page.goto(url);
    const metaRow = page.locator('.artifact-meta-row');
    await expect(metaRow.locator('.status-chip')).toBeVisible();
    await expect(metaRow.locator('.artifact-path-copy')).toBeVisible();
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText(/^Context/);
  });

  test('toggling to Source shows the full document and back restores the brief', async ({ page, baseURL }) => {
    const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', '05-per-type-document-views/05-CONTEXT.md');
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
    const url = await resolveFixtureUrl(baseURL ?? 'http://127.0.0.1:4199', '05-per-type-document-views/05-CONTEXT.md');
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
