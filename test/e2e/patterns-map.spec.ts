// The PATTERNS pattern-map e2e (quick-260930-wfs, sketch 013 B): real files, never a mock. Fixtures
// resolve by path against the project's live presentation payload (the research-briefing.spec.ts idiom)
// so an archival/rename fails loudly instead of silently skipping. The Lendshed v1.0/02 test runs against the read-only
// server on the made-up Lendshed project (port 4198, FIXTURE_BASE_URL; playwright.config.ts always
// starts it and throws at load when the fixture tree is missing). Nothing in this file skips. This
// spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow, squared corners,
// one chip signature, no 420px overflow), since the full sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`patterns-map.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`patterns-map.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

test.describe('PATTERNS pattern map', () => {
  test('Lendshed v1.0/02 pattern map', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, 'v1.0-phases/02-shed-inventory-health/02-PATTERNS.md'));
    await page.goto(url);
    await page.locator('#pattern-file-map').waitFor({ state: 'visible' });

    // The doc's own five groups, in order.
    await expect(page.locator('.view-patterns-label')).toHaveText([
      /^Server — fresh modules\s*5$/,
      /^Server — edits\s*3$/,
      /^Server — specs & sample feeds\s*5$/,
      /^Web\s*7$/,
      /^Ops notes\s*2$/,
    ]);

    // Meter 6 / 4 / 4 / 8.
    const counts = await page
      .locator('.view-patterns-meter-key b')
      .evaluateAll((els) => els.map((el) => el.textContent));
    expect(counts).toEqual(['6', '4', '4', '8']);

    // The mapper's note is visible.
    await expect(page.locator('.view-patterns-note')).toBeVisible();
    await expect(page.locator('.view-patterns-note')).toContainText('Check note');

    // reader.ts: partial, read the caveat, with its copy-from.
    await page.locator('.view-patterns-row', { hasText: 'reader.ts' }).click();
    const panel = page.locator('.view-patterns-panel');
    await expect(panel).toContainText('Partial');
    await expect(panel).toContainText('read the caveat');
    await expect(panel).toContainText('Copy from');

    // Planner notes sit collapsed in back matter.
    const notes = page.locator('.view-patterns-back details', { hasText: 'Notes Spanning Several Files' });
    await expect(notes).toHaveCount(1);
    await expect(notes).not.toHaveAttribute('open', '');
  });
});
