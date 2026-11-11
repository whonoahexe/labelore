// Phase 12 (12-03, SET-01): the settings composer over the made-up Lendshed config.json loaded through the real repository (so the
// data is the handler's masked frontmatter, D-08). Counts and panels come from the masked data alone: Set, Not set, Not recognised
// and Masked, panels of read-only rows, and nothing invented for a key the file does not set.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SETTINGS_CATALOGUE, SETTINGS_GROUPS } from '../../src/presentation/settings-catalogue.ts';
import type { ComposedSettings, SettingsPanel, SettingsRow } from '../../src/web/views/settings-page.ts';
import { composeSettings } from '../../src/web/views/settings-page.ts';
import { loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';

const READ = { scope: null, unreadable: false };
const DENSE_ROOT = fileURLToPath(new URL('../../fixtures/dense', import.meta.url)).replace(/[\\/]$/, '');
const REPO_CONFIG = new URL('../../.planning/config.json', import.meta.url);

async function lendshedConfig(): Promise<Record<string, unknown>> {
  const { presentation } = await loadFixtureProject();
  const artifact = presentation.artifacts.find((candidate) => candidate.path === '.planning/config.json');
  if (artifact === undefined) throw new Error('the Lendshed fixture has no config.json');
  return artifact.frontmatter;
}

function ready(model: ComposedSettings | null): Extract<ComposedSettings, { state: 'ready' }> {
  if (model === null || model.state !== 'ready') throw new Error('expected a ready settings model');
  return model;
}

describe('composeSettings over the Lendshed config.json', () => {
  it('counts the keys the file sets, by hand: eight top-level and five under workflow', async () => {
    const model = ready(composeSettings(await lendshedConfig(), READ));
    // mode, granularity, model_profile, commit_docs, parallelization, brave_search, firecrawl, exa_search = 8;
    // workflow.research, plan_check, verifier, nyquist_validation, ui_phase = 5.
    expect(model.counts.set).toBe(13);
    expect(model.counts.notRecognised).toBe(0);
    expect(model.counts.masked).toBe(0);
    expect(model.counts.notSet).toBeGreaterThan(0);
  });

  it('shows parallelization as a boolean row in the shape it arrives', async () => {
    const model = ready(composeSettings(await lendshedConfig(), READ));
    const row = model.panels.flatMap((panel) => panel.rows).find((candidate) => candidate.key === 'parallelization');
    expect(row?.value).toEqual({ kind: 'boolean', on: true });
  });

  it('lists the panels with something set first, in catalogue order, and the empty groups last', async () => {
    const model = ready(composeSettings(await lendshedConfig(), READ));
    const ids = model.panels.map((panel) => panel.id);
    expect(ids[0]).toBe('run');
    const firstEmpty = model.panels.findIndex((panel) => panel.setCount === 0);
    expect(firstEmpty).toBeGreaterThan(0);
    expect(model.panels.slice(firstEmpty).every((panel) => panel.setCount === 0)).toBe(true);
  });

  it('gives a workstream scope no model, so the file reads as a plain file (D-11)', async () => {
    expect(composeSettings(await lendshedConfig(), { scope: 'intake', unreadable: false })).toBeNull();
  });

  it('gives an unreadable file the unreadable state and nothing else (D-11)', () => {
    expect(composeSettings({}, { scope: null, unreadable: true })).toEqual({ state: 'unreadable' });
  });
});

// ---------------------------------------------------------------------------------------------------------
// Edges: a made-up config per probe, composed directly
// ---------------------------------------------------------------------------------------------------------

function compose(config: unknown): Extract<ComposedSettings, { state: 'ready' }> {
  return ready(composeSettings(config, READ));
}

function panelOf(model: Extract<ComposedSettings, { state: 'ready' }>, id: string): SettingsPanel {
  const panel = model.panels.find((candidate) => candidate.id === id);
  if (panel === undefined) throw new Error(`no panel ${id}`);
  return panel;
}

function rowOf(model: Extract<ComposedSettings, { state: 'ready' }>, key: string): SettingsRow {
  const found = model.panels.filter((panel) => panel.kind === 'group').flatMap((panel) => panel.rows).find((row) => row.key === key);
  if (found === undefined) throw new Error(`no set row ${key}`);
  return found;
}

function notRecognisedKeys(model: Extract<ComposedSettings, { state: 'ready' }>): string[] {
  return model.panels.find((panel) => panel.kind === 'not-recognised')?.rows.map((row) => row.key) ?? [];
}

function unsetKeys(model: Extract<ComposedSettings, { state: 'ready' }>): string[] {
  return model.panels.flatMap((panel) => panel.unset.map((row) => row.key));
}

describe('composeSettings edges', () => {
  it('composes {} to nothing set, every key not set, every group open and muted', () => {
    const model = compose({});
    expect(model.counts).toEqual({ set: 0, notSet: SETTINGS_CATALOGUE.length, notRecognised: 0, masked: 0 });
    expect(model.panels.map((panel) => panel.id)).toEqual(SETTINGS_GROUPS.map((group) => group.id));
    for (const panel of model.panels) {
      expect(panel.openUnset, panel.id).toBe(true);
      expect(panel.muted, panel.id).toBe(true);
      expect(panel.setCount, panel.id).toBe(0);
      expect(panel.rows, panel.id).toEqual([]);
    }
  });

  it.each([[[]], ['x'], [3], [null]])('gives %j no ready model', (config) => {
    expect(composeSettings(config, READ)).toBeNull();
  });

  it('keeps a flat dotted top-level key apart from the nested value it resembles', () => {
    const model = compose({ 'workflow.research': true, workflow: { research: false } });
    expect(rowOf(model, 'workflow.research').value).toEqual({ kind: 'boolean', on: false });
    expect(notRecognisedKeys(model)).toEqual(['workflow.research']);
    expect(panelOf(model, 'not-recognised').rows[0]?.value).toEqual({ kind: 'boolean', on: true });
    expect(model.counts).toMatchObject({ set: 1, notRecognised: 1 });
  });

  it('never lets a flat dotted key fill the catalogue key it resembles', () => {
    const model = compose({ 'workflow.research': true });
    expect(model.counts).toMatchObject({ set: 0, notRecognised: 1 });
    expect(unsetKeys(model)).toContain('workflow.research');
    expect(notRecognisedKeys(model)).toEqual(['workflow.research']);
  });

  it('never lets a dotted name under a nested object fill the catalogue key it resembles', () => {
    const model = compose({ dynamic_routing: { 'tier_models.heavy': 'opus' } });
    expect(model.counts).toMatchObject({ set: 0, notRecognised: 1 });
    expect(notRecognisedKeys(model)).toEqual(['dynamic_routing.tier_models.heavy']);
    expect(unsetKeys(model)).toContain('dynamic_routing.tier_models.heavy');
  });

  it('matches keys exactly and case-sensitively: Mode and "mode " are not recognised, mode is set', () => {
    const model = compose({ Mode: 'yolo', 'mode ': 'yolo', mode: 'interactive' });
    expect(notRecognisedKeys(model)).toEqual(['Mode', 'mode ']);
    expect(rowOf(model, 'mode').value).toMatchObject({ kind: 'enum', chosen: 'interactive' });
    expect(model.counts).toMatchObject({ set: 1, notRecognised: 2 });
  });

  it('draws an enum as a scale only when the value is one of the documented options', () => {
    const chosen = rowOf(compose({ mode: 'interactive' }), 'mode').value;
    expect(chosen).toEqual({ kind: 'enum', options: ['interactive', 'yolo'], chosen: 'interactive' });
    expect(rowOf(compose({ mode: 'turbo' }), 'mode').value).toEqual({ kind: 'string', text: 'turbo' });
    expect(rowOf(compose({ workflow: { security_asvs_level: 2 } }), 'workflow.security_asvs_level').value).toMatchObject({
      kind: 'enum',
      chosen: 2,
    });
    expect(rowOf(compose({ workflow: { security_asvs_level: 9 } }), 'workflow.security_asvs_level').value).toEqual({
      kind: 'number',
      text: '9',
    });
  });

  it('counts a masked secret and shows it masked; a false secret key is not masked', () => {
    const masked = compose({ brave_search: '****7c2e' });
    expect(masked.counts.masked).toBe(1);
    expect(rowOf(masked, 'brave_search').value).toEqual({ kind: 'masked', text: '****7c2e' });
    const plain = compose({ brave_search: false });
    expect(plain.counts.masked).toBe(0);
    expect(rowOf(plain, 'brave_search').value).toEqual({ kind: 'boolean', on: false });
  });

  it('counts a string nested under a secret key as masked and reads it masked', () => {
    const model = compose({ exa_search: { key: '****abcd' } });
    expect(model.counts.masked).toBe(1);
    expect(rowOf(model, 'exa_search').value).toMatchObject({ kind: 'masked' });
  });

  it('reads null as set, with its own kind', () => {
    const model = compose({ project_code: null });
    expect(model.counts.set).toBe(1);
    expect(rowOf(model, 'project_code').value).toEqual({ kind: 'null' });
  });

  it('shows a fixed features key as set, a features.<name> pattern entry as set in Hooks and extras, and an unknown object whole', () => {
    const model = compose({
      features: { thinking_partner: true, wild_idea: true },
      telemetry: { sink: 'none', sampling: { rate: 0.1 } },
    });
    expect(rowOf(model, 'features.thinking_partner').value).toEqual({ kind: 'boolean', on: true });
    const pattern = panelOf(model, 'extra').rows.find((row) => row.key === 'features.wild_idea');
    expect(pattern?.value).toEqual({ kind: 'boolean', on: true });
    expect(pattern?.label).toContain('wild_idea');
    expect(notRecognisedKeys(model)).toEqual(['telemetry']);
    expect(panelOf(model, 'not-recognised').rows[0]).toMatchObject({ wide: true, value: { kind: 'object' } });
    expect(model.counts).toMatchObject({ set: 2, notRecognised: 1 });
  });

  it('adds a pattern entry to its panel total and never yields a not-set row for it', () => {
    const base = panelOf(compose({}), 'extra');
    const model = compose({ features: { wild_idea: true, other_idea: false } });
    const extra = panelOf(model, 'extra');
    expect(extra.total).toBe(base.total + 2);
    expect(extra.setCount).toBe(2);
    expect(extra.unset.length).toBe(base.unset.length);
    expect(unsetKeys(model).some((key) => key.includes('wild_idea') || key.includes('other_idea'))).toBe(false);
  });

  it('covers models key by key: a known child is set, the others not set, an unknown child is not recognised by its full path', () => {
    const model = compose({ models: { planning: 'opus', foo: 'x' } });
    expect(rowOf(model, 'models.planning').value).toEqual({ kind: 'string', text: 'opus' });
    expect(rowOf(model, 'models.planning').label).toBe('Model for planning');
    for (const name of ['discuss', 'research', 'execution', 'verification', 'completion']) {
      expect(unsetKeys(model)).toContain(`models.${name}`);
    }
    expect(unsetKeys(model)).not.toContain('models.planning');
    expect(notRecognisedKeys(model)).toEqual(['models.foo']);
    expect(model.counts).toMatchObject({ set: 1, notRecognised: 1 });
  });

  it('covers dynamic_routing and its tier_models key by key', () => {
    const model = compose({ dynamic_routing: { enabled: true, tier_models: { heavy: 'opus', ultra: 'x' } } });
    expect(rowOf(model, 'dynamic_routing.enabled').value).toEqual({ kind: 'boolean', on: true });
    expect(rowOf(model, 'dynamic_routing.tier_models.heavy').value).toEqual({ kind: 'string', text: 'opus' });
    for (const key of [
      'dynamic_routing.escalate_on_failure',
      'dynamic_routing.max_escalations',
      'dynamic_routing.provider_escalation',
      'dynamic_routing.tier_models.light',
      'dynamic_routing.tier_models.standard',
    ]) {
      expect(unsetKeys(model), key).toContain(key);
    }
    expect(notRecognisedKeys(model)).toEqual(['dynamic_routing.tier_models.ultra']);
  });

  it('reads a catalogued parent that arrives as a string as one not-recognised entry, its children not set', () => {
    const model = compose({ models: 'opus' });
    expect(notRecognisedKeys(model)).toEqual(['models']);
    expect(panelOf(model, 'not-recognised').rows[0]?.value).toEqual({ kind: 'string', text: 'opus' });
    for (const name of ['planning', 'discuss', 'research', 'execution', 'verification', 'completion']) {
      expect(unsetKeys(model)).toContain(`models.${name}`);
    }
    expect(model.counts.set).toBe(0);
  });

  it('holds an open-ended map whole: one set row, no not-recognised entry for its inner keys', () => {
    const model = compose({ review: { reviewer_instances: { alpha: { cli: 'x', colour: 'y' } } } });
    expect(rowOf(model, 'review.reviewer_instances')).toMatchObject({
      wide: true,
      value: { kind: 'object', value: { alpha: { cli: 'x', colour: 'y' } } },
    });
    expect(model.counts).toMatchObject({ set: 1, notRecognised: 0 });
    expect(notRecognisedKeys(model)).toEqual([]);
  });

  it('draws lists of objects wide and lists of plain values narrow', () => {
    const model = compose({ ship: { pr_body_sections: [{ heading: 'A' }] }, planning: { sub_repos: ['a', 'b'] } });
    expect(rowOf(model, 'ship.pr_body_sections').wide).toBe(true);
    expect(rowOf(model, 'planning.sub_repos').wide).toBe(false);
    expect(rowOf(model, 'planning.sub_repos').value).toEqual({ kind: 'list', value: ['a', 'b'] });
  });

  it('orders panels set groups first, then Not recognised, then empty groups, rows in catalogue order', () => {
    const model = compose({ zzz: 1, jina: true, mode: 'yolo', granularity: 'fine' });
    expect(model.panels.map((panel) => panel.id)).toEqual(['run', 'tools', 'not-recognised', 'plan', 'exec', 'check', 'git', 'extra']);
    expect(panelOf(model, 'run').rows.map((row) => row.key)).toEqual(['mode', 'granularity']);
  });

  it('keeps Not recognised rows in the order the parsed object lists them', () => {
    expect(notRecognisedKeys(compose({ zebra: 1, alpha: 2, middle: 3 }))).toEqual(['zebra', 'alpha', 'middle']);
  });

  it('never reads a prototype key as a setting, and lists an own __proto__ key as not recognised', () => {
    const model = compose(JSON.parse('{"__proto__": {"mode": "yolo"}}'));
    expect(model.counts).toMatchObject({ set: 0, notRecognised: 1 });
  });

  it('gives equal input deep-equal output', () => {
    const config = { mode: 'yolo', workflow: { research: true, mystery: 1 }, extra_thing: [1, 2], features: { x: true } };
    expect(compose(config)).toEqual(compose(structuredClone(config)));
  });

  it('gives an unset row only a key and a label: no value, no default', () => {
    const model = compose({ mode: 'yolo' });
    const unset = model.panels.flatMap((panel) => panel.unset);
    expect(unset.length).toBe(SETTINGS_CATALOGUE.length - 1);
    for (const row of unset) expect(Object.keys(row).sort()).toEqual(['key', 'label']);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The hard real configs
// ---------------------------------------------------------------------------------------------------------

/** Every top-level key of the config is accounted for by some set row, unset-free key or not-recognised entry, and nothing repeats. */
function expectAccounted(config: Record<string, unknown>, model: Extract<ComposedSettings, { state: 'ready' }>): void {
  const setKeys = model.panels.flatMap((panel) => (panel.kind === 'group' ? panel.rows.map((row) => row.key) : []));
  const unrecognised = notRecognisedKeys(model);
  const unset = unsetKeys(model);
  expect(model.counts.set).toBe(setKeys.length);
  expect(model.counts.notSet).toBe(unset.length);
  expect(model.counts.notRecognised).toBe(unrecognised.length);
  expect(new Set(setKeys).size).toBe(setKeys.length);
  expect(new Set(unset).size).toBe(unset.length);
  expect(setKeys.filter((key) => unset.includes(key))).toEqual([]);
  expect(setKeys.length + unset.length).toBeGreaterThanOrEqual(SETTINGS_CATALOGUE.length);
  for (const top of Object.keys(config)) {
    const claimed = [...setKeys, ...unrecognised].some((key) => key === top || key.startsWith(`${top}.`));
    expect(claimed, `${top} is shown somewhere`).toBe(true);
  }
  for (const panel of model.panels) {
    for (const row of panel.unset) expect(Object.keys(row).sort()).toEqual(['key', 'label']);
  }
}

describe('composeSettings over the hard real configs', () => {
  it('accounts for every key of the dense fixture, with the exact not-recognised list pinned', async () => {
    const { presentation } = await loadProject(DENSE_ROOT);
    const artifact = presentation.artifacts.find((candidate) => candidate.path === '.planning/config.json');
    if (artifact === undefined) throw new Error('the dense fixture has no config.json');
    const model = compose(artifact.frontmatter);
    expect(notRecognisedKeys(model)).toEqual([
      'workflow.windows_enforce',
      'workflow.schema_drift_gate',
      'workflow.drift_threshold',
      'workflow.drift_action',
      'vibe_check',
      'experimental_widget_pipeline',
      'telemetry',
    ]);
    expect(rowOf(model, 'planning.commit_docs').value).toEqual({ kind: 'boolean', on: true });
    expect(rowOf(model, 'project_code').value).toEqual({ kind: 'null' });
    expect(model.counts).toEqual({ set: 18, notSet: SETTINGS_CATALOGUE.length - 18, notRecognised: 7, masked: 0 });
    expectAccounted(artifact.frontmatter, model);
  });

  it("accounts for every key of this repository's own config.json, whose 1.11.0 keys are all recognised", () => {
    const config = JSON.parse(readFileSync(REPO_CONFIG, 'utf8')) as Record<string, unknown>;
    const model = compose(config);
    expect(rowOf(model, 'workflow._auto_chain_active').value).toEqual({ kind: 'boolean', on: false });
    expect(rowOf(model, 'plan_review.source_grounding_authority').value).toEqual({ kind: 'string', text: 'grep' });
    expect(notRecognisedKeys(model)).not.toContain('workflow._auto_chain_active');
    expect(notRecognisedKeys(model)).not.toContain('plan_review.source_grounding_authority');
    expect(panelOf(model, 'git').rows.some((row) => row.key === 'git.allow_default_branch_commits')).toBe(true);
    expectAccounted(config, model);
  });

  it('accounts for every key of the Lendshed config', async () => {
    const config = await lendshedConfig();
    expectAccounted(config, compose(config));
  });
});
