// The settings page's contract (Phase 12, 12-09, SET-01, sketch 063 A): config.json's one URL opens the registered `settings` view, the
// page header and counts draw from the composer, and nothing on the page can change a setting. The D-12 block proves the one-URL
// claim on made-up committed projects: the gear, search, the drawer and the document route all reach /settings, HANDOFF.json keeps its
// pause page and the GSD-internal estimation-calibration.json stays without one.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { ScopedPlanningFilesystem } from '../../src/planning-fs/scoped-fs.ts';
import { isInternalPath } from '../../src/planning-repo/file-class.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildDrawerViewModel } from '../../src/presentation/drawer.ts';
import { buildSearchGroups } from '../../src/presentation/search.ts';
import { createSearchIndexState, searchIndex } from '../../src/server/search-index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { resolveProjectRoute } from '../../src/web/route-dispatch.ts';
import { VIEW_KINDS, viewKindOf } from '../../src/web/views/kinds.ts';
import type { ViewInput, ViewManifest } from '../../src/web/views/manifest.ts';
import { VIEW_MANIFESTS, resolveViewFor } from '../../src/web/views/manifests.ts';
import { composeSettings } from '../../src/web/views/settings-page.ts';
import type { ComposedSettings } from '../../src/web/views/settings-page.ts';
import { SettingsView, settingsHeaderProps } from '../../src/web/views/settings-page-components.tsx';
import { fxPath, loadFixtureProject } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT, loadShapesProject, shapesPath } from '../helpers/shapes-project.ts';

const lendshed = await loadFixtureProject();
const shapes = await loadShapesProject();

function configOf(presentation: ProjectPresentation): Record<string, unknown> {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === '.planning/config.json');
  if (artifact === undefined) throw new Error('the fixture has no root config.json');
  return artifact.frontmatter;
}

function settingsManifest(): ViewManifest {
  const manifest = VIEW_MANIFESTS.settings;
  if (manifest === undefined) throw new Error('the settings manifest is not registered');
  return manifest;
}

function inputFor(frontmatter: Record<string, unknown>, overrides: Partial<ViewInput> = {}): ViewInput {
  return { kind: 'config', frontmatter, structured: {}, groups: [], planSegments: [], ...overrides };
}

function ready(frontmatter: Record<string, unknown>): ComposedSettings {
  const model = composeSettings(frontmatter, { scope: null, unreadable: false });
  if (model === null) throw new Error('expected a settings model');
  return model;
}

describe('the settings view is registered (D-10, D-12)', () => {
  it("maps the wire kind config to the view kind settings and registers a manifest for it", () => {
    expect(viewKindOf('config')).toBe('settings');
    expect(VIEW_KINDS).toContain('settings');
    expect(settingsManifest().kind).toBe('settings');
  });

  it('resolves the settings manifest for config, with a lead that ends in a period and a settingsPage hook', () => {
    const resolved = resolveViewFor('config', inputFor(configOf(lendshed.presentation)));
    expect(resolved.recognized).toBe(true);
    expect(resolved.manifest.kind).toBe('settings');
    expect(resolved.manifest.lead.trim().endsWith('.')).toBe(true);
    expect(typeof resolved.manifest.settingsPage).toBe('function');
  });

  it("the manifest's settingsPage composes the root config and nothing else (D-11)", () => {
    const frontmatter = configOf(lendshed.presentation);
    const hook = settingsManifest().settingsPage;
    expect(hook?.(inputFor(frontmatter))?.state).toBe('ready');
    expect(hook?.(inputFor(frontmatter, { scope: 'ledger' }))).toBeNull();
    expect(hook?.(inputFor({}, { structuralWarning: true }))).toEqual({ state: 'unreadable' });
  });

  it("a workstream's config.json opens as a plain file: the fact-list of its frontmatter", () => {
    const blocks = settingsManifest().promote;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('data');
  });
});

describe('the settings page header and counts', () => {
  it('names the crumbs, the eyebrow, the h1 and the read-only line', () => {
    const header = settingsHeaderProps('Lendshed');
    expect(header.eyebrow).toBe('Settings');
    expect(header.title).toBe('Project settings');
    expect(header.crumbs).toEqual([{ label: 'Lendshed', to: '/' }, { label: 'Settings' }]);
    const lead = renderToStaticMarkup(createElement('p', null, header.lead));
    expect(lead).toContain('Read-only. Change a setting with');
    expect(lead).toContain('<code>/gsd-settings</code>');
    expect(lead).toContain('in your terminal.');
  });

  it("draws Lendshed's four counts and one panel per group", () => {
    const model = ready(configOf(lendshed.presentation));
    const html = renderToStaticMarkup(createElement(SettingsView, { model }));
    for (const caption of ['Set', 'Not set', 'Not recognised', 'Masked']) expect(html).toContain(`>${caption}</span>`);
    expect(html).toContain('>13</span>');
    expect(html).toContain('4 of 47 set');
    expect(html).toContain('class="view-settings-panel"');
  });
});

describe("config.json's one URL (D-12)", () => {
  it('Lendshed: the root config.json has the key /settings and the route table opens it as a document', () => {
    const artifact = lendshed.presentation.artifacts.find((candidate) => candidate.path === '.planning/config.json');
    expect(artifact?.key).toBe('/settings');
    expect(artifact?.kind).toBe('config');
    expect(resolveProjectRoute('/settings', '', lendshed.presentation)).toEqual({
      kind: 'document',
      url: '/settings',
      artifactPath: '.planning/config.json',
    });
  });

  it("search: a hit for config.json carries /settings, and the grouped results keep it", async () => {
    const built = createSearchIndexState();
    built.buildFrom(lendshed.snapshot);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    const hits = searchIndex(built.state(), 'granularity');
    const hit = hits.find((candidate) => candidate.path === '.planning/config.json');
    expect(hit?.url).toBe('/settings');
    const groups = buildSearchGroups(hits, lendshed.presentation);
    const row = groups.flatMap((group) => group.rows).find((candidate) => candidate.path === '.planning/config.json');
    expect(row?.url).toBe('/settings');
  });

  const BRINKWATER = fileURLToPath(new URL('../fixtures/brinkwater', import.meta.url)).replace(/[\\/]$/, '');
  async function scoped(name: string): Promise<ProjectPresentation> {
    const fs = new ScopedPlanningFilesystem(new LocalFsPlanningFilesystem(BRINKWATER), name);
    const snapshot = await new PlanningRepository(fs, BRINKWATER).load();
    return toProjectPresentation(snapshot, 'brinkwater', undefined, (path) => fs.realPathOf(path));
  }

  it('the drawer: the Shared config.json row of a workstream is the same /settings address', async () => {
    const model = buildDrawerViewModel(await scoped('intake'), 'intake');
    const row = model.scopeGroups?.shared.find((candidate) => candidate.label === 'config.json');
    expect(row?.url).toBe('/settings');
  });

  it("a workstream's own config.json is a plain file: the composer gives null for it", async () => {
    const presentation = await scoped('ledger');
    const model = buildDrawerViewModel(presentation, 'ledger');
    expect(model.scopeGroups?.shared.some((candidate) => candidate.label === 'config.json')).toBe(false);
    expect(model.scopeGroups?.own.some((candidate) => candidate.label === 'config.json')).toBe(true);
    expect(composeSettings(configOf(presentation), { scope: 'ledger', unreadable: false })).toBeNull();
  });

  it('HANDOFF.json keeps its pause page', () => {
    const handoff = shapes.presentation.artifacts.find((candidate) => candidate.path === '.planning/HANDOFF.json');
    expect(handoff?.key).toBe('/handoff');
    expect(handoff?.kind).toBe('handoff');
    expect(viewKindOf('handoff')).toBe('pause');
    expect(viewKindOf('handoff')).not.toBe('settings');
  });

  it('estimation-calibration.json stays GSD-internal: the project holds the file, and no page lists it', () => {
    expect(existsSync(shapesPath('estimation-calibration.json'))).toBe(true);
    expect(SHAPES_ROOT.length).toBeGreaterThan(0);
    expect(isInternalPath('estimation-calibration.json', false)).toBe(true);
    expect(shapes.presentation.artifacts.some((candidate) => candidate.path.endsWith('estimation-calibration.json'))).toBe(false);
  });

  it('the Lendshed config.json file the tests read exists', () => {
    expect(existsSync(fxPath('config.json'))).toBe(true);
  });
});
