// The PLAN task navigator e2e (quick-261006-iz6, sketch 019 winner B): real corpus files, never a
// fixture mock. Fixtures resolve by path against the live `/api/presentation` payload (the
// ui-review-page.spec.ts idiom) so an archival/rename fails loudly instead of silently skipping. The
// labelore tests run on port 4199; the studio-portal tests run against the read-only server on port
// 4198 (playwright.config.ts, present only when ~/studio-portal/.planning exists) and skip themselves
// otherwise. This spec asserts the foundation sweep's key invariants itself (one h1, an eyebrow,
// squared corners, one chip signature, no 420px overflow), since the full sweep is too slow to run
// per change. Run once post-merge: npx playwright test test/e2e/plan-page.spec.ts -g "plan page"
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const STUDIO_PORTAL_AVAILABLE = existsSync(join(homedir(), 'studio-portal', '.planning'));
const SP_BASE_URL = 'http://127.0.0.1:4198';

interface PresentationLite {
  artifacts: { key: string; path: string; structured: Record<string, unknown> }[];
}

async function presentationOf(baseURL: string): Promise<PresentationLite> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) throw new Error(`plan-page.spec: /api/presentation responded ${response.status}`);
  return (await response.json()) as PresentationLite;
}

async function resolveFixtureUrl(baseURL: string, pathIncludes: string): Promise<string> {
  const data = await presentationOf(baseURL);
  const artifact = data.artifacts.find((entry) => entry.path.includes(pathIncludes));
  if (!artifact) throw new Error(`plan-page.spec: no artifact with path including "${pathIncludes}"`);
  return artifact.key;
}

/** True once the locator's box sits inside the current viewport (polled by the caller). */
async function inViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return box !== null && box.y >= 0 && box.y < height;
}

async function openPage(page: Page, url: string, theme: 'light' | 'dark', width = 1440): Promise<void> {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(url);
  await page.locator('#plan-task-workspace').waitFor({ state: 'visible' });
}

async function openSp(page: Page, pathIncludes: string): Promise<void> {
  const key = await resolveFixtureUrl(SP_BASE_URL, pathIncludes);
  await openPage(page, `${SP_BASE_URL}${key}`, 'light');
}

const tab = (page: Page, n: number): Locator => page.locator(`#plan-task-list [role="tab"][data-task="${n}"]`);

test.describe('Plan page', () => {
  test('LB v1.1/05-01 plan page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const presentation = await presentationOf(base);
    const url = await resolveFixtureUrl(base, '05-per-type-document-views/05-01-PLAN.md');
    await openPage(page, url, 'light');

    // Header: one h1 (the objective's first sentence), the eyebrow with the plan id, the Planned fact.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(
      "Prove the per-type view architecture end to end on the phase's flagship case",
    );
    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('Plan 05-01 · Phase 5 · Per type document views');
    const meta = page.locator('.artifact-meta-row');
    await expect(meta).toContainText('Planned');
    await expect(meta).toContainText('20 Sep 2026');

    // Head row: chips, triggers, stats.
    await expect(page.locator('.view-plan-nav-head .status-chip')).toHaveText(['Execute', 'Wave 1', 'Autonomous', 'Executed']);
    await expect(page.locator('[data-modal="deps"]')).toBeDisabled();
    await expect(page.locator('[data-modal="files"]')).toContainText('18');
    await expect(page.locator('[data-modal="reqs"]')).toContainText('3');
    await expect(page.locator('.view-plan-nav-stat b')).toHaveText(['2', 'low', '160k']);

    // Objective: Objective / Why / You get.
    await expect(page.locator('.view-plan-nav-brief dt')).toHaveText(['Objective', 'Why', 'You get']);

    // Workspace: two tasks, T1 selected with Do / Prove it / Done.
    await expect(page.locator('#plan-task-list [role="tab"]')).toHaveCount(2);
    await expect(tab(page, 1)).toHaveAttribute('aria-selected', 'true');
    const tabs = page.locator('.view-plan-nav-tabs button');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText('Do');
    await expect(tabs.nth(1)).toContainText('Prove it');
    await expect(tabs.nth(2)).toContainText('Done');

    // Read all expands the long action.
    const readAll = page.locator('[data-read-all]').first();
    await expect(readAll).toContainText('Read all');
    await expect(page.locator('.view-plan-nav-text[data-clamp="true"]')).toHaveCount(1);
    await readAll.click();
    await expect(page.locator('.view-plan-nav-text[data-clamp="true"]')).toHaveCount(0);
    await expect(readAll).toContainText('Show less');

    // ← → step through the tasks.
    await page.locator('body').press('ArrowRight');
    await expect(tab(page, 2)).toHaveAttribute('aria-selected', 'true');
    await page.locator('body').press('ArrowLeft');
    await expect(tab(page, 1)).toHaveAttribute('aria-selected', 'true');

    // Files modal: 18 rows; a T-chip closes it, selects the task and brings the workspace into view.
    await page.locator('[data-modal="files"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.view-plan-nav-filerow')).toHaveCount(18);
    expect(await dialog.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');
    await page.locator('body').press('ArrowRight'); // an open modal keeps its keys
    await dialog.locator('[data-goto="1"]').first().click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => inViewport(page, page.locator('#plan-task-workspace'))).toBe(true);
    await expect(tab(page, 1)).toHaveAttribute('aria-selected', 'true');

    // Requirements modal: three rows; VIEW-01 reads its text when the milestone archive carries items.
    await page.locator('[data-modal="reqs"]').click();
    await expect(dialog.locator('.view-plan-nav-req')).toHaveCount(3);
    const archive = presentation.artifacts.find((entry) => entry.path.endsWith('milestones/v1.1-REQUIREMENTS.md'));
    const row = dialog.locator('.view-plan-nav-req', { hasText: 'VIEW-01' });
    if (Array.isArray(archive?.structured.items) && archive.structured.items.length > 0) {
      await expect(row).toContainText('Each artifact type renders through a view selected for that type');
    } else {
      await expect(row).toContainText("Not in this project's REQUIREMENTS.md");
    }
    await expect(dialog.getByRole('link', { name: 'Open the traceability page' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Done when: two outcomes, four checks.
    await expect(page.locator('.view-plan-nav-outcomes li')).toHaveCount(2);
    await expect(page.locator('.view-plan-nav-checkset li')).toHaveCount(4);

    // F-05: every status chip on the page measures the same.
    const signatures = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main .status-chip')).map((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.fontWeight, c.paddingTop, c.paddingLeft, c.textTransform, c.letterSpacing, c.lineHeight].join('|');
      }),
    );
    expect(signatures.length).toBeGreaterThan(8);
    expect(new Set(signatures).size).toBe(1);

    // Squared corners on the new chrome.
    for (const selector of [
      '.view-plan-nav-item',
      '.view-plan-nav-tabs button',
      '.view-plan-nav-trigger',
      '#plan-source-only .status-chip',
    ]) {
      const radii = await page.locator(selector).evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRadius));
      expect(radii.length, selector).toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), selector).toBe(true);
    }

    // The strip: Threat model lands in Source mode on a marked section; View restores the navigator.
    await page.locator('#plan-source-only').getByRole('button', { name: 'Threat model', exact: true }).click();
    await expect(page.locator('.artifact-document')).toBeVisible();
    await expect(page.locator('#plan-task-workspace')).toHaveCount(0);
    const hit = page.locator('.plan-section[data-source-hit="true"]');
    await expect(hit).toHaveCount(1);
    await expect.poll(() => inViewport(page, hit)).toBe(true);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('#plan-task-workspace')).toBeVisible();

    // 420px, dark: nothing overflows.
    await page.addInitScript(() => window.localStorage.setItem('labelore-theme', 'dark'));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.reload();
    await page.locator('#plan-task-workspace').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  });

  test('LB 0x4 plan page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '260910-0x4-PLAN.md');
    await openPage(page, url, 'light');

    await expect(page.locator('.artifact-heading .eyebrow')).toHaveText('Quick plan 260910-0x4');
    await expect(page.locator('.artifact-meta-row')).toContainText('Planned 10 Sep 2026');
    await expect(page.locator('#plan-task-list [role="tab"]')).toHaveCount(7);
    await expect(tab(page, 2)).toContainText('TDD');
    await expect(tab(page, 3)).toContainText('TDD');
    await page.locator('[data-modal="reqs"]').click();
    await expect(page.getByRole('dialog').locator('.view-plan-nav-req')).toHaveCount(14);
  });

  test('LB 02-17 plan page', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:4199';
    const url = await resolveFixtureUrl(base, '02-situational-awareness-artifact-reading/02-17-PLAN.md');
    await openPage(page, url, 'light');

    await expect(page.locator('#plan-task-list [role="tab"]')).toHaveCount(1);
    await expect(page.locator('.view-plan-nav-tabs button')).toHaveText(['Verify', 'Context']);
    await expect(page.locator('#plan-task-panel')).toContainText('Waits for you to look');
    await expect(page.locator('.view-plan-nav-head .status-chip', { hasText: 'Gap closure' })).toBeVisible();
    await expect(page.locator('[data-modal="files"]')).toBeDisabled();
    await expect(page.locator('.artifact-meta-row')).toContainText('Planned 31 Aug 2026');
    await page.locator('[data-modal="deps"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.view-plan-nav-row')).toHaveCount(3);
    await expect(dialog.locator('a.view-plan-nav-row')).toHaveCount(3);
    await expect(dialog.locator('.status-chip', { hasText: 'Executed' })).toHaveCount(3);
  });

  test('SP 01-06 plan page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    await openSp(page, 'phases/01-portal-owned-identity-sessions/01-06-PLAN.md');

    await expect(page.locator('h1')).toHaveText('Close the loop');
    await expect(page.locator('.artifact-meta-row')).toContainText('Planned 3 Aug 2026');
    await tab(page, 3).click();
    await expect(page.locator('.view-plan-nav-tabs button')).toHaveText(['Action', 'Afterwards']);
    await expect(page.locator('#plan-task-panel')).toContainText('Waits for you to do it');
    const source = page.locator('.view-plan-nav-src');
    await expect(source).toContainText('Read first');
    await expect(source).toContainText('Resume signal');
    await expect(source).toContainText('After resume');
    await page.locator('[data-modal="deps"]').click();
    const dialog = page.getByRole('dialog');
    for (const id of ['01-03', '01-04', '01-05']) await expect(dialog).toContainText(id);
    await page.keyboard.press('Escape');
    await page.locator('[data-modal="reqs"]').click();
    await expect(page.getByRole('dialog')).toContainText('A member can log in to the portal with a username and password');
  });

  test('SP 04-02 plan page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    await openSp(page, 'phases/04-bulk-archive-downloads/04-02-PLAN.md');

    await expect(page.locator('.view-plan-nav-tabs button').first()).toContainText('Decision');
    await expect(page.locator('.view-plan-nav-option')).toHaveCount(2);
    await expect(page.locator('.view-plan-nav-option').first()).toContainText('Proceed');
    await expect(page.locator('.view-plan-nav-option').nth(1)).toContainText('Stop');
    await expect(page.locator('.view-plan-nav-brief dt')).toHaveText(['Why', 'You get']);
  });

  test('SP sya plan page', async ({ page }) => {
    test.skip(!STUDIO_PORTAL_AVAILABLE, 'studio-portal checkout not present');
    await openSp(page, '260802-sya-PLAN.md');

    await tab(page, 3).click();
    await expect(page.locator('#plan-task-panel h2')).toContainText('A visual pass over');
    await expect(page.locator('.artifact-heading .status-chip', { hasText: 'Warning' })).toBeVisible();
    await expect(page.locator('#plan-source-only')).toContainText('Wrapper warnings · 2');
  });
});
