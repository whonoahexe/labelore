// Phase 10 (10-23): a map-only project (the made-up Tidemark: a codebase map and nothing else) in a real
// browser. Every way of opening one lands on the "Mapped, not started" head with no Roadmap and no
// Traceability link in the header (D-09): started on its project folder, started on its .planning folder,
// added from the switcher by its .planning path, and found by a folder scan of a synthetic home. Then the
// copy command (D-06, RESEARCH C2): the button copies exactly the command text, reads "Copied", and the page
// issues no request while it is pressed. Every fixture is a copy in a mkdtemp folder, every server has a
// settings directory of its own, and the scan runs in a synthetic HOME, so nothing here reads or writes the
// user's settings, projects or home folder.
import { expect, test, type Page } from '@playwright/test';
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectUrl } from './app-url.ts';
import { TIDEMARK_FIXTURE_ROOT } from './fixture-root.ts';
import { startProjectsServer } from './projects-server.ts';

const SEVEN_PANELS = ['Stack', 'Architecture', 'Structure', 'Conventions', 'Testing', 'Integrations', 'Concerns'];

const scratch: string[] = [];

/** A fresh mkdtemp folder (real path) removed after the spec. */
function makeFolder(prefix: string): string {
  const folder = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  scratch.push(folder);
  return folder;
}

/** A copy of Tidemark in a mkdtemp folder of its own; returns the project folder. */
function copyTidemark(parent: string = makeFolder('mapped-not-started-')): string {
  const project = join(parent, 'tidemark');
  cpSync(TIDEMARK_FIXTURE_ROOT, project, { recursive: true });
  return project;
}

test.afterAll(() => {
  for (const folder of scratch) rmSync(folder, { recursive: true, force: true });
});

/** The head, the facts line, the seven panel entries, and a header with a Dashboard link and no Roadmap or
 * Traceability link: what a map-only project opens on, whichever way it was opened. */
async function expectMappedNotStarted(page: Page): Promise<void> {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Codebase');
  await expect(page.locator('p.eyebrow').first()).toHaveText('Mapped, not started');
  const head = page.getByRole('region', { name: 'Mapped, not started' });
  await expect(head).toBeVisible();
  await expect(head.getByText('This project has a codebase map and no roadmap yet.')).toBeVisible();
  await expect(page.locator('.view-codebase-facts .status-chip').first()).toHaveText('Complete map');
  await expect(page.getByRole('navigation', { name: 'Codebase map' }).getByRole('listitem')).toHaveCount(7);
  for (const label of SEVEN_PANELS) {
    await expect(page.getByRole('navigation', { name: 'Codebase map' }).getByText(label, { exact: true })).toBeVisible();
  }
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Roadmap' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Traceability' })).toHaveCount(0);
}

test.describe('a map-only project opens on its head', () => {
  test('started on its project folder (tracer)', async ({ page }) => {
    test.setTimeout(120_000);
    const project = copyTidemark();
    const server = await startProjectsServer({ paths: [project] });
    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(await projectUrl(server.base, '/'));
      await expectMappedNotStarted(page);
    } finally {
      await server.stop();
    }
  });
});
