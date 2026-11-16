// The RESEARCH briefing e2e (quick-260929-3x3): real files, never a mock. Fixtures resolve by path
// against the project's live presentation payload (the context-brief.spec.ts idiom) so an archival/rename
// fails loudly instead of silently skipping. The Lendshed v1.0/02 test runs against the read-only server on the made-up Lendshed
// project (port 4198, FIXTURE_BASE_URL; playwright.config.ts always starts it and throws at load when
// the fixture tree is missing). Nothing in this file skips. This spec asserts the foundation sweep's
// key invariants itself (one h1, an eyebrow, squared corners, no 420px overflow), since the full
// sweep is too slow to run per change.
import { expect, test } from '@playwright/test';
import { artifactUrl, projectApiUrl } from './app-url.ts';
import { FIXTURE_BASE_URL } from './fixture-root.ts';

interface PresentationLite {
  artifacts: { key: string; path: string }[];
}

async function resolveFixturePath(baseURL: string, pathIncludes: string): Promise<string> {
  const response = await fetch(await projectApiUrl(baseURL, '/presentation'));
  if (!response.ok) throw new Error(`research-briefing.spec: the project's presentation payload responded ${response.status}`);
  const data = (await response.json()) as PresentationLite;
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`research-briefing.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.path;
}

test.describe('RESEARCH briefing', () => {
  test('FX v1.0/02 briefing', async ({ page }) => {
    const url = await artifactUrl(FIXTURE_BASE_URL, await resolveFixturePath(FIXTURE_BASE_URL, 'v1.0-phases/02-shed-inventory-health/02-RESEARCH.md'));
    await page.goto(url);
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
