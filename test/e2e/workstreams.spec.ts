// Phase 11 (11-32, VIEW-20, success criterion 4; D-10 to D-13): workstreams in a real browser. One test proves a project
// without workstreams is exactly what it was (the Shapes project: no scope chip, no index, the drawer's own groups, a
// document at its own address); the other drives the made-up Brinkwater project (three workstreams) through the whole
// flow: the index first with no Roadmap or Traceability link, a branch opening its workstream, the scope chip
// switching to another workstream and back to the index, and the drawer's Shared group above the workstream's own. The
// Brinkwater server is the real CLI on a mkdtemp copy with its own settings directory, so nothing here reads or writes
// the user's settings. Every address is built through app-url.ts from what the served project reports.
import { expect, test } from '@playwright/test';
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DrawerViewModel } from '../../src/presentation/drawer.ts';
import { artifactUrl, exactUrl, projectApiUrl, projectUrl } from './app-url.ts';
import { SHAPES_BASE_URL } from './fixture-root.ts';
import { startProjectsServer } from './projects-server.ts';

const BRINKWATER_ROOT = new URL('../fixtures/brinkwater', import.meta.url).pathname.replace(/\/$/, '');

test('a project without workstreams is exactly as before: the dashboard first, no chip, no index', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const first = await projectUrl(SHAPES_BASE_URL, '/');
  await page.goto(first);

  // The first screen is the ordinary dashboard, at the address it was opened on.
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page).toHaveURL(exactUrl(first));
  await expect(page.getByText('Project · workstream mode')).toHaveCount(0);

  // The header: the links Shapes has (Research and Sketches appear only for a project with research files or sketches) in their order, and no scope chip or workstream count beside the project switcher.
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link')).toHaveText(['Dashboard', 'Roadmap', 'Traceability']);
  await expect(page.locator('.scope-chip')).toHaveCount(0);
  await expect(page.locator('.project-switcher-trigger')).not.toContainText('workstream');

  // The drawer: its own places and no Shared or scope group.
  const model = (await (await fetch(await projectApiUrl(SHAPES_BASE_URL, '/drawer'))).json()) as DrawerViewModel;
  expect('scopeGroups' in model).toBe(false);
  await page.getByRole('button', { name: 'Open planning files' }).click();
  await expect(page.locator('.sidebar-drawer')).toBeVisible();
  await expect(page.locator('.places-navigator')).not.toHaveAttribute('data-state', 'loading');
  await expect(page.locator('.places-group-label')).toHaveText([/^Current/, 'Shipped']);
  await expect(page.locator('.places-group[data-scope]')).toHaveCount(0);
  await expect(page.getByText('Shared · project')).toHaveCount(0);

  // A document opens at its own address, with no scope in it.
  const project = await artifactUrl(SHAPES_BASE_URL, '.planning/PROJECT.md');
  expect(project).not.toContain('/workstreams/');
  await page.goto(project);
  await expect(page).toHaveURL(exactUrl(project));
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.scope-chip')).toHaveCount(0);
});

test('Brinkwater: the index first, a branch opens its workstream, the chip switches, All workstreams returns', async ({
  page,
}) => {
  const parent = realpathSync(mkdtempSync(join(tmpdir(), 'workstreams-spec-')));
  const project = join(parent, 'brinkwater');
  cpSync(BRINKWATER_ROOT, project, { recursive: true });
  const server = await startProjectsServer({ paths: [project] });
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    const index = await projectUrl(server.base, '/');
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });

    // The index is the first screen: Roadmap and Traceability are absent, the header counts the workstreams, no chip.
    await page.goto(index);
    await expect(page.locator('p.eyebrow').first()).toHaveText('Project · workstream mode');
    await expect(page.locator('h1')).toHaveText('Brinkwater');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Roadmap' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Traceability' })).toHaveCount(0);
    await expect(page.locator('.project-switcher-trigger')).toContainText('3 workstreams');
    await expect(page.locator('.scope-chip')).toHaveCount(0);

    // A branch name opens that workstream at /workstreams/{name}/, where Roadmap and Traceability are back.
    await page.locator('.view-workstreams-name a', { hasText: 'intake' }).click();
    const intake = await projectUrl(server.base, '/workstreams/intake/');
    await expect(page).toHaveURL(exactUrl(intake));
    await expect(nav.getByRole('link', { name: 'Roadmap' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Traceability' })).toBeVisible();

    // The chip: a button named for the workstream, closed; opening lists the workstreams; Escape returns focus to it.
    const chip = page.getByRole('button', { name: 'Workstream: intake' });
    await expect(chip).toHaveText('ws:intake');
    await expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-expanded', 'true');
    const list = page.getByRole('navigation', { name: 'Workstreams' });
    await expect(list.getByRole('link')).toHaveCount(4);
    await expect(list.getByRole('link', { name: /^intake/ })).toHaveAttribute('aria-current', 'page');
    await expect(list.getByRole('link', { name: /^notices/ })).toContainText('Not started · no roadmap');
    await page.keyboard.press('Escape');
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
    await expect(chip).toBeFocused();

    // Choosing ledger navigates to its workstream; the chip now names it.
    await chip.click();
    await list.getByRole('link', { name: /^ledger/ }).click();
    const ledger = await projectUrl(server.base, '/workstreams/ledger/');
    await expect(page).toHaveURL(exactUrl(ledger));
    const ledgerChip = page.getByRole('button', { name: 'Workstream: ledger' });
    await expect(ledgerChip).toBeVisible();

    // The drawer: Shared · project above ws: ledger; a shared file's link carries no scope, an own file's does.
    await page.getByRole('button', { name: 'Open planning files' }).click();
    await expect(page.locator('.sidebar-drawer')).toBeVisible();
    await expect(page.locator('.places-navigator')).not.toHaveAttribute('data-state', 'loading');
    const shared = page.locator('.places-group[data-scope="shared"]');
    const own = page.locator('.places-group[data-scope="own"]');
    await expect(shared.locator('.places-group-label')).toHaveText('Shared · project');
    await expect(own.locator('.places-group-label')).toHaveText('ws: ledger');
    const sharedBox = await shared.boundingBox();
    const ownBox = await own.boundingBox();
    expect(sharedBox!.y).toBeLessThan(ownBox!.y);
    const projectRow = shared.getByRole('link', { name: 'PROJECT.md' });
    await expect(projectRow).toHaveAttribute('href', new RegExp(`^/[^/]+/project$`));
    expect(await projectRow.getAttribute('href')).not.toContain('/workstreams/');
    await expect(own.getByRole('link', { name: 'ROADMAP.md' })).toHaveAttribute('href', /\/workstreams\/ledger\/roadmap$/);
    await expect(own.getByRole('link', { name: 'config.json' })).toBeVisible();
    await expect(shared.getByRole('link', { name: 'config.json' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('.sidebar-drawer')).toBeHidden();

    // All workstreams returns to the index, and the chip is gone again.
    await ledgerChip.click();
    await page.getByRole('navigation', { name: 'Workstreams' }).getByRole('link', { name: /^All workstreams/ }).click();
    await expect(page).toHaveURL(exactUrl(index));
    await expect(page.locator('p.eyebrow').first()).toHaveText('Project · workstream mode');
    await expect(page.locator('.scope-chip')).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Roadmap' })).toHaveCount(0);
  } finally {
    await server.stop();
    rmSync(parent, { recursive: true, force: true });
  }
});
