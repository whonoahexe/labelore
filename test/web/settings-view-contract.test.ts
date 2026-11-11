// The settings page's contract (Phase 12, 12-09, SET-01, sketch 063 A): config.json's one URL opens the registered `settings` view, the
// page header and counts draw from the composer, and nothing on the page can change a setting. The D-12 block proves the one-URL
// claim on made-up committed projects: the gear, search, the drawer and the document route all reach /settings, HANDOFF.json keeps its
// pause page and the GSD-internal estimation-calibration.json stays without one.
import { existsSync, readFileSync } from 'node:fs';
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
import { fxPath, loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';
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

// Task 2 (12-09): every state of every instrument, over the dense fixture, this repository's own config and a made-up config that
// holds a masked secret, nulls, a polymorphic object and a list of objects.
const RICH = {
  mode: 'yolo',
  granularity: 'coarse',
  commit_docs: true,
  search_gitignored: false,
  parallelization: { enabled: true, plan_level: true, max_concurrent_agents: 3 },
  brave_search: '****7c2e',
  project_code: null,
  context_window: 120000,
  response_language: 'English',
  git: { branching_strategy: 'phase', quick_branch_template: null },
  ship: {
    pr_body_sections: [
      { heading: 'Steward sign-off', enabled: true, source: 'VERIFICATION.md ## Human Verification' },
      { heading: 'Rollback notes', enabled: false, fallback: '- No schema change in this PR.' },
    ],
  },
  workflow: { research: true, auto_advance: false },
  lendshed_desk_url: 'http://desk.example.test',
  telemetry: { sink: 'none' },
  vibe_check: true,
};

function pageOf(frontmatter: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(SettingsView, { model: ready(frontmatter) }));
}

describe('the settings instruments (read-only, 12-09 Task 2)', () => {
  const rich = pageOf(RICH);

  it('a boolean is a switch with the word On or Off, and the track is hidden from assistive technology', () => {
    expect(rich).toMatch(/<span class="view-settings-switch" data-on="true"><span class="view-settings-track" aria-hidden="true"><\/span>On<\/span>/);
    expect(rich).toMatch(/<span class="view-settings-switch" data-on="false"><span class="view-settings-track" aria-hidden="true"><\/span>Off<\/span>/);
  });

  it('an enum is a scale of every option, the chosen one aria-current with a screen-reader word', () => {
    expect(rich).toContain('class="view-settings-scale"');
    expect(rich).toMatch(/<span class="view-settings-option" aria-current="true">yolo<span class="sr-only"> \(chosen\)<\/span><\/span>/);
    expect(rich).toMatch(/<span class="view-settings-option">interactive<\/span>/);
  });

  it('null reads "set to null", an unset key reads the label, the key path and "not set"', () => {
    expect(rich).toContain('set to null');
    expect(rich).toMatch(
      /<li class="view-settings-unset-row"><span><span class="view-settings-unset-label">[^<]+<\/span> <span class="view-settings-key">[a-z_.]+<\/span><\/span><span class="view-settings-notset">not set<\/span><\/li>/,
    );
  });

  it('a masked value is its masked text inside the dashed source-t-mask box with a lock and the mask title', () => {
    expect(rich).toMatch(
      /<span class="source-t-mask view-settings-mask" title="Masked by Labelore; the file holds the real value"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>\*\*\*\*7c2e<\/span>/,
    );
  });

  it('numbers keep their grouping and strings stay as written, in the value shape', () => {
    expect(rich).toContain('>120,000</span>');
    expect(rich).toContain('>English</span>');
  });

  it('an object and a list of objects take the full panel width, keys as source-t-key spans', () => {
    expect(rich).toMatch(/data-wide="true"/);
    expect(rich).toContain('<span class="source-t-key">&quot;enabled&quot;</span>');
    expect(rich).toContain('Steward sign-off');
    expect(rich).toContain('Rollback notes');
  });

  it('the not-set fold is a details with the summary "{N} not set", open only when the panel has nothing set', () => {
    const model = ready(RICH);
    const withSomething = model.state === 'ready' ? model.panels.find((panel) => panel.setCount > 0 && panel.unset.length > 0) : undefined;
    const nothing = model.state === 'ready' ? model.panels.find((panel) => panel.setCount === 0 && panel.kind === 'group') : undefined;
    expect(withSomething).toBeDefined();
    expect(nothing).toBeDefined();
    expect(rich).toContain(`${withSomething?.unset.length} not set</summary>`);
    expect(rich).toMatch(/<details class="view-settings-unset"><summary>/);
    expect(rich).toMatch(/<details class="view-settings-unset" open=""><summary>/);
  });

  it('a panel with nothing set comes last and is muted', () => {
    const html = pageOf({ mode: 'yolo' });
    const sections = [...html.matchAll(/<section class="view-settings-panel" data-kind="([a-z-]+)" data-muted="(true|false)"/g)];
    expect(sections.length).toBeGreaterThan(1);
    expect(sections[0]?.[2]).toBe('false');
    expect(sections[sections.length - 1]?.[2]).toBe('true');
  });

  it('the Not recognised panel is absent with no unknown key and present, by full path, with some', () => {
    expect(pageOf({ mode: 'yolo' })).not.toContain('data-kind="not-recognised"');
    expect(pageOf({ mode: 'yolo' })).toContain(
      '<span class="view-settings-count-number">0</span><span class="view-settings-count-caption">Not recognised</span>',
    );
    expect(rich).toContain('data-kind="not-recognised"');
    expect(rich).toContain('lendshed_desk_url');
    expect(rich).toContain('telemetry');
    expect(rich).toContain('http://desk.example.test');
  });

  it("the dense fixture's seven unknown keys show by full path, as written", async () => {
    const dense = await loadProject(fileURLToPath(new URL('../../fixtures/dense', import.meta.url)).replace(/[\\/]$/, ''));
    const html = pageOf(configOf(dense.presentation));
    for (const path of [
      'workflow.windows_enforce',
      'workflow.schema_drift_gate',
      'workflow.drift_threshold',
      'workflow.drift_action',
      'vibe_check',
      'experimental_widget_pipeline',
      'telemetry',
    ]) {
      expect(html).toContain(path);
    }
    expect(html).toContain('>0.2</span>');
  });

  it("this repository's own config draws with every state present and no input", () => {
    const own = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../.planning/config.json', import.meta.url)), 'utf8'),
    ) as Record<string, unknown>;
    const html = pageOf(own);
    expect(html).toContain('view-settings-panel');
    expect(html).toContain('not set');
  });

  it('an empty config draws every group open and muted, with no Not recognised panel', () => {
    const html = pageOf({});
    const sections = (html.match(/<section /g) ?? []).length;
    expect(html).not.toContain('data-kind="not-recognised"');
    expect(sections).toBeGreaterThan(0);
    expect((html.match(/data-muted="true"/g) ?? []).length).toBe(sections);
    expect((html.match(/<details class="view-settings-unset" open="">/g) ?? []).length).toBe(sections);
  });

  it('nothing on the page can change a setting: no input, select, textarea, form, switch role or tab stop', () => {
    for (const html of [rich, pageOf({}), pageOf({ mode: 'yolo' })]) {
      expect(html).not.toMatch(/<(input|select|textarea|form|button)\b/);
      expect(html).not.toMatch(/role="(switch|checkbox|button|radio|slider|textbox|combobox)"/);
      expect(html).not.toMatch(/tabindex=/i);
      expect(html).not.toMatch(/\bonclick\b|\bhref=/i);
    }
  });
});
