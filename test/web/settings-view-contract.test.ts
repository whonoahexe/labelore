// The settings page's contract (Phase 12, 12-09, SET-01, reshaped by quick-261114-42r, sketch 065 A): config.json's one URL opens the registered `settings` view, the
// page header, lede and body draw from the composer, and nothing on the page can change a setting. The D-12 block proves the one-URL
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
import { buildSearchSections } from '../../src/presentation/search.ts';
import { createSearchIndexState, searchIndex } from '../../src/server/search-index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { resolveProjectRoute } from '../../src/web/route-dispatch.ts';
import { VIEW_KINDS, viewKindOf } from '../../src/web/views/kinds.ts';
import type { ViewInput, ViewManifest } from '../../src/web/views/manifest.ts';
import { VIEW_MANIFESTS, resolveViewFor } from '../../src/web/views/manifests.ts';
import { composeSettingsReference, settingsSubjectOf } from '../../src/web/views/settings-reference.ts';
import type { SettingsModel, SettingsSubject } from '../../src/web/views/settings-reference.ts';
import { SettingsView, UnreadableNotice, settingsHeaderProps } from '../../src/web/views/settings-page-components.tsx';
import type { SettingsPageModel } from '../../src/web/views/settings-page-components.tsx';
import { parseGsdConfigReference } from '../../src/presentation/gsd-config-reference.ts';
import type { GsdConfigReference } from '../../src/presentation/gsd-config-reference.ts';
import type { SourceParseError } from '../../src/server/source-text.ts';
import { FIXTURE_DEFAULTS, FIXTURE_PLANNING_CONFIG, FIXTURE_SCHEMA } from '../helpers/gsd-reference-fixture.ts';
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

// A made-up reference (test/helpers/gsd-reference-fixture.ts) composed with a config: the model every rendering test below draws.
const REFERENCE = parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema: FIXTURE_SCHEMA, defaults: FIXTURE_DEFAULTS });

function modelOf(subject: SettingsSubject | null, parseError: SourceParseError | null = null, reference: GsdConfigReference | null = REFERENCE): SettingsModel {
  const text = subject !== null && subject.state === 'ready' ? JSON.stringify(subject.config, null, 2) : '';
  return composeSettingsReference(subject, reference, subject !== null && subject.state !== 'missing' ? { text, parseError } : null);
}

function ready(config: Record<string, unknown>): SettingsModel {
  return modelOf({ state: 'ready', config });
}

function pageOf(model: SettingsPageModel): string {
  return renderToStaticMarkup(
    createElement(SettingsView, { model, header: createElement('header', { className: 'artifact-heading' }, 'HEADER'), onOpenSourceAt: () => undefined }),
  );
}

/** The markup of one `article` entry by its id. */
function articleOf(html: string, id: string): string {
  const match = new RegExp(`<article class="view-settings-entry" id="${id}"[\\s\\S]*?</article>`).exec(html);
  if (match === null) throw new Error(`no entry ${id}`);
  return match[0];
}

describe('the settings page header and lede', () => {
  it('names the crumbs, the eyebrow, the h1 and the read-only line', () => {
    const header = settingsHeaderProps('Lendshed');
    expect(header.eyebrow).toBe('Settings');
    expect(header.title).toBe('Project settings');
    expect(header.crumbs).toEqual([{ label: 'Lendshed', to: '/' }, { label: 'Settings' }]);
    const lead = renderToStaticMarkup(createElement('p', null, header.lead));
    expect(lead).toContain('Read-only. Change a setting with');
    expect(lead).toContain('<code>/gsd-settings</code>');
    expect(lead).toContain('in your terminal.');
    expect(lead).not.toContain('view-settings-lede');
  });

  it("draws the lede with a ready config and a reference: N understood, N set, N not recognised", () => {
    const model = ready(configOf(lendshed.presentation));
    if (model.state !== 'reference') throw new Error('expected the reference shape');
    const lead = renderToStaticMarkup(createElement('p', null, settingsHeaderProps('Lendshed', model).lead));
    const { understood, set, notRecognised } = model.counts;
    expect(lead).toContain(`<b>${understood}</b> settings GSD understands, <b>${set}</b> set in this project&#x27;s <code>config.json</code>`);
    expect(notRecognised).toBeGreaterThan(0);
    expect(lead).toContain(`, <b>${notRecognised}</b> it doesn&#x27;t recognise`);
    expect(lead).toContain('Descriptions and defaults come from GSD&#x27;s configuration reference.');
  });

  it('leaves out the "doesn\'t recognise" clause at zero, and the whole lede without a ready config', () => {
    const none = ready({ mode: 'yolo' });
    expect(renderToStaticMarkup(createElement('p', null, settingsHeaderProps('P', none).lead))).not.toContain('recognise');
    for (const model of [modelOf({ state: 'missing' }), modelOf({ state: 'unreadable' }), { state: 'loading' as const }]) {
      expect(renderToStaticMarkup(createElement('p', null, settingsHeaderProps('P', model).lead))).not.toContain('view-settings-lede');
    }
  });
});

describe('the settings page body (a ready config over a reference)', () => {
  const model = ready({ mode: 'yolo', commit_docs: true, project_code: null, workflow: { research: false }, granularity: 'standard', context_window: 1000000 });
  const html = pageOf(model);

  it('puts the header node first inside the main column, after the rail', () => {
    expect(html.indexOf('view-settings-rail')).toBeLessThan(html.indexOf('HEADER'));
    expect(html.indexOf('HEADER')).toBeLessThan(html.indexOf('view-settings-sec'));
  });

  it("draws each section in model order with an h2 and 'n of m set'", () => {
    if (model.state !== 'reference') throw new Error('expected the reference shape');
    const names = [...html.matchAll(/<section class="view-settings-sec" id="(s-[a-z-]+)"><header class="view-settings-sec-head"><h2>([^<]+)<span class="view-settings-sec-count">(\d+) of (\d+) set/g)];
    expect(names.map((match) => match[2]?.replace('&amp;', '&'))).toEqual(model.sections.map((section) => section.name));
    const core = model.sections.find((section) => section.name === 'Core');
    expect(html).toContain(`>${core?.setCount} of ${core?.total} set</span>`);
  });

  it('gives a documented entry its id, anchor, first sentence, more button and Type and Default labels', () => {
    const entry = articleOf(html, 'k-mode');
    expect(entry).toContain('href="#k-mode"');
    expect(entry).toContain('Operation mode:');
    expect(entry).toMatch(/<button type="button" class="view-settings-more" aria-expanded="false">more<\/button>/);
    expect(entry).toContain('<dt>Type</dt>');
    expect(entry).toContain('<dt>Default</dt>');
    expect(entry).toContain('<span class="view-settings-name">How much it asks</span><span class="view-settings-key">mode</span>');
    expect(entry).not.toContain('Switching it mid-run');
  });

  it("lights this project's value in an enum's options, once, and labels GSD's default", () => {
    const entry = articleOf(html, 'k-mode');
    expect((entry.match(/aria-current="true"/g) ?? []).length).toBe(1);
    expect(entry).toMatch(/aria-current="true"[^>]*>yolo<span class="sr-only"> \(this project\)<\/span><\/span>/);
    expect(entry).toMatch(/data-default="true">interactive<span class="view-settings-option-default">default<\/span>/);
  });

  it('shows no Allowed line for a boolean, and prose allowed text for a non-literal list', () => {
    expect(articleOf(html, 'k-commit_docs')).not.toContain('<dt>Allowed</dt>');
    expect(articleOf(html, 'k-project_code')).toContain('<dt>Allowed</dt>');
    expect(articleOf(html, 'k-project_code')).toContain('Any short string');
  });

  it("shows 'This project' with the value in its shape and a 'config.json L<n>' button", () => {
    const entry = articleOf(html, 'k-mode');
    expect(entry).toContain('<span class="view-settings-val-label">This project</span>');
    expect(entry).toMatch(/<button type="button" class="view-settings-line">config\.json L2<\/button>/);
    expect(articleOf(html, 'k-commit_docs')).toContain('<span class="view-settings-bool" data-on="true"><i aria-hidden="true"></i>true</span>');
    expect(articleOf(html, 'k-context_window')).toContain('<span class="view-settings-num">1000000</span>');
    expect(articleOf(html, 'k-project_code')).toContain('<span class="view-settings-null">null</span>');
  });

  it('reads an unset key as not set, with no line button', () => {
    const entry = articleOf(html, 'k-workflow.plan_check');
    expect(entry).toContain('<span class="view-settings-unset">not set</span>');
    expect(entry).not.toContain('view-settings-line');
  });

  it('folds the accepted keys under a details that opens only when no documented entry is left to read', () => {
    expect(html).toContain('<details class="view-settings-also"><summary>');
    expect(html).toMatch(/1 more key GSD accepts<\/span><span class="view-settings-quiet">· no description in GSD&#x27;s reference<\/span>/);
    const gates = /<section class="view-settings-sec" id="s-gates">[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    expect(gates).toContain('<details class="view-settings-also" open="">');
    const workflow = /<section class="view-settings-sec" id="s-workflow">[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    expect(workflow).toContain('<details class="view-settings-also"><summary>');
  });

  it("draws Not recognised as one section with the key as written, its value and an 'L<n>' button", () => {
    const unknown = /<section class="view-settings-sec" id="s-not-recognised" data-kind="not-recognised">[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    expect(unknown).toContain('granularity');
    expect(unknown).toContain('<span class="view-settings-str">standard</span>');
    expect(unknown).toMatch(/<button type="button" class="view-settings-line">L\d+<\/button>/);
    expect((html.match(/data-kind="not-recognised"/g) ?? []).length).toBe(1);
  });

  it('draws a masked value in the dashed source-t-mask box with the lock and the mask title', () => {
    const masked = pageOf(ready({ brave_search: '****7c2e' }));
    expect(masked).toMatch(
      /<span class="source-t-mask view-settings-mask" title="Masked by Labelore; the file holds the real value"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>\*\*\*\*7c2e<\/span>/,
    );
  });

  it("reads '' as empty string, an object as a dl and a list as a count with its items", () => {
    const shaped = pageOf(ready({ project_code: '', agent_skills: { planner: 'a', executor: 'b' }, review: { models: { x: 'm' } }, models: { planning: ['a', 'b'] } }));
    expect(articleOf(shaped, 'k-project_code')).toContain('<span class="view-settings-null">empty string</span>');
    expect(articleOf(shaped, 'k-agent_skills')).toContain('<dl class="view-settings-obj">');
    expect(articleOf(shaped, 'k-agent_skills')).toContain('data-wide="true"');
    expect(shaped).toContain('<span class="view-settings-sum">2 items</span>');
  });

  it('wraps filter matches in mark, from the rail query (the static markup has none to mark)', () => {
    expect(html).not.toContain('<mark>');
  });

  it('shows the status filters with counts, the filter box and the narrow selects only for a ready config', () => {
    expect(html).toContain('type="search"');
    expect(html).toContain('<span>Set in this project</span>');
    expect(html).toContain('<span>Not recognised</span>');
    expect((html.match(/<select/g) ?? []).length).toBe(2);
    const missing = pageOf(modelOf({ state: 'missing' }));
    expect(missing).not.toContain('<span>Set in this project</span>');
    expect((missing.match(/<select/g) ?? []).length).toBe(1);
  });
});

describe('the settings page without values', () => {
  it('no config.json: a quiet notice, the full reference and no This project column', () => {
    const html = pageOf(modelOf({ state: 'missing' }));
    expect(html).toContain('This project has no settings file');
    expect(html).toContain('The reference below still lists everything you can set.');
    expect(html).toContain('id="k-mode"');
    expect(html).not.toContain('view-settings-val-label');
    expect(html).not.toContain('data-tone="destructive"');
    expect(html).not.toContain('s-not-recognised');
  });

  it("unreadable config.json: the destructive notice names the line, opens Source there, and the reference is still shown", () => {
    const html = pageOf(modelOf({ state: 'unreadable' }, { line: 14, column: 3, reason: 'unexpected-character' }));
    expect(html).toContain('Can&#x27;t read config.json');
    expect(html).toContain('data-tone="destructive"');
    expect(html).toContain('The parser stopped at line 14: an unexpected character.');
    expect(html).toContain('Open Source at line 14');
    expect(html).toContain('id="k-mode"');
    expect(html).not.toContain('view-settings-val-label');
    expect((html.match(/data-tone="destructive"/g) ?? []).length).toBe(1);
  });

  it("no gsd-core reference: a quiet notice and this project's values without descriptions", () => {
    for (const reference of [null, { available: false, reason: 'not-found' } as const]) {
      const html = pageOf(modelOf({ state: 'ready', config: { mode: 'yolo', workflow: { research: true } } }, null, reference));
      expect(html).toContain('GSD&#x27;s configuration reference wasn&#x27;t found');
      expect(html).toContain('Without them this page shows only the values this project&#x27;s <code>config.json</code> sets.');
      expect(html).toContain('id="k-mode"');
      expect(html).toContain('id="k-workflow.research"');
      expect(html).toContain('<span class="view-settings-str">yolo</span>');
      expect(html).not.toContain('<dt>Type</dt>');
      expect(html).not.toContain('view-settings-rail');
    }
  });

  it('draws the header alone while loading', () => {
    const html = pageOf({ state: 'loading' });
    expect(html).toContain('HEADER');
    expect(html).not.toContain('view-settings-sec');
  });
});

describe('nothing on the settings page writes', () => {
  const COMPONENT_SOURCES = ['settings-page-components.tsx', 'settings-rail.tsx'].map((name) =>
    readFileSync(fileURLToPath(new URL(`../../src/web/views/${name}`, import.meta.url)), 'utf8'),
  );

  it('has no form or textarea, and exactly one search input', () => {
    for (const html of [pageOf(ready({ mode: 'yolo' })), pageOf(modelOf({ state: 'missing' })), pageOf(modelOf({ state: 'unreadable' }))]) {
      expect(html).not.toMatch(/<(form|textarea)\b/);
      expect(html).not.toMatch(/<input(?![^>]*type="search")/);
      expect((html.match(/<input\b/g) ?? []).length).toBe(1);
    }
  });

  it('uses no raw-HTML prop in the components, and has exactly one destructive tone', () => {
    for (const text of COMPONENT_SOURCES) expect(text).not.toContain('dangerouslySetInnerHTML');
    expect(COMPONENT_SOURCES[0]?.split('data-tone="destructive"').length).toBe(2);
    expect(COMPONENT_SOURCES[1]).not.toContain('destructive');
  });

  it('never draws a destructive tone on a page that read its config', () => {
    expect(pageOf(ready({ mode: 'yolo', granularity: 'standard' }))).not.toContain('destructive');
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
    const sections = buildSearchSections(hits, lendshed.presentation);
    const row = [...sections.milestones.flatMap((entry) => entry.groups), ...sections.outside]
      .flatMap((group) => group.rows)
      .find((candidate) => candidate.path === '.planning/config.json');
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
    expect(settingsSubjectOf(configOf(presentation), { scope: 'ledger', unreadable: false })).toBeNull();
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

// Task 3 (12-09): the unreadable state and the empty-state parity.
type ElementLike = { type: unknown; props: { children?: unknown; onClick?: () => void } };

function findClickHandler(node: unknown): (() => void) | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findClickHandler(child);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof node !== 'object' || node === null || !('props' in node)) return null;
  const element = node as ElementLike;
  if (typeof element.props.onClick === 'function') return element.props.onClick;
  return findClickHandler(element.props.children);
}

describe('the unreadable config.json (12-09 Task 3)', () => {
  const html = (parseError: Parameters<typeof UnreadableNotice>[0]['parseError']): string =>
    renderToStaticMarkup(createElement(UnreadableNotice, { parseError, onOpenSourceAt: () => undefined }));

  it('names the line and the reason words, and the button opens Source at that line', () => {
    const out = html({ line: 14, column: 3, reason: 'unexpected-character' });
    expect(out).toContain('Can&#x27;t read config.json</span>');
    expect(out).toContain('data-tone="destructive"');
    expect(out).toContain('The file isn&#x27;t valid JSON, so this project&#x27;s values aren&#x27;t shown.');
    expect(out).toContain('The reference below still lists everything you can set.');
    expect(out).toContain('The parser stopped at line 14: an unexpected character.');
    expect(out).toContain('Open Source at line 14');
    expect(out).toContain('class="source-notice-glyph"');
    expect(out).toContain('class="source-notice-lead"');
  });

  it('says each closed-set reason in its own plain words', () => {
    const words = {
      'unexpected-end': 'the file ends before the JSON does',
      'unexpected-character': 'an unexpected character',
      'expected-value': 'a value or a key name was expected',
      'not-valid': 'this is not valid JSON',
    } as const;
    for (const [reason, phrase] of Object.entries(words)) {
      expect(html({ line: 2, column: 1, reason: reason as keyof typeof words })).toContain(`line 2: ${phrase}.`);
    }
  });

  it('with no line the parser sentence is left out and the button reads "Open Source"', () => {
    for (const parseError of [null, { line: null, column: null, reason: 'not-valid' as const }]) {
      const out = html(parseError);
      expect(out).not.toContain('The parser stopped');
      expect(out).toContain('>Open Source</button>');
      expect(out).not.toContain('Open Source at line');
    }
  });

  it('the button reports the line to open (or none)', () => {
    const calls: (number | null)[] = [];
    const withLine = UnreadableNotice({ parseError: { line: 14, column: 3, reason: 'not-valid' }, onOpenSourceAt: (line) => calls.push(line) });
    findClickHandler(withLine)?.();
    const without = UnreadableNotice({ parseError: null, onOpenSourceAt: (line) => calls.push(line) });
    findClickHandler(without)?.();
    expect(calls).toEqual([14, null]);
  });

  it('the no-settings page draws the same reference page, with the quiet notice and no Copy path', () => {
    const page = readFileSync(fileURLToPath(new URL('../../src/web/pages/settings-missing-page.tsx', import.meta.url)), 'utf8');
    expect(page).toContain('SettingsView');
    expect(page).toContain("{ state: 'missing' }");
    expect(page).toContain('path={null}');
    const components = readFileSync(fileURLToPath(new URL('../../src/web/views/settings-page-components.tsx', import.meta.url)), 'utf8');
    expect(components).toContain('notice source-notice');
    expect(components).toContain('source-notice-glyph');
    expect(components).toContain('source-notice-lead');
  });
});

describe('rows that share one path (WR-05)', () => {
  it('composes two Not recognised rows for a flat dotted key and the nested key of the same path', () => {
    const model = ready({ 'workflow.foo': 1, workflow: { foo: 2 } });
    if (model.state !== 'reference') throw new Error('expected a reference model');
    expect(model.unknown.map((entry) => entry.key)).toEqual(['workflow.foo', 'workflow.foo']);
  });

  it('keys each Not recognised row by its position as well as its path, so two rows with one path never collide', () => {
    const source = readFileSync(fileURLToPath(new URL('../../src/web/views/settings-page-components.tsx', import.meta.url)), 'utf8');
    expect(source).toContain('key={`${index}:${entry.key}`}');
    const html = pageOf(ready({ 'workflow.foo': 1, workflow: { foo: 2 } }));
    expect((html.match(/class="view-settings-unknown-row"/g) ?? []).length).toBe(2);
  });
});
