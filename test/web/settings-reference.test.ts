// The settings page's composer (quick-261114-42r, SET-01, sketch 065 A): GSD's parsed reference plus a masked config.json plus its
// source text, composed into sections, tiers, counts and lines; the filter; and the key-line locator. Every reference here is the
// made-up one in test/helpers/gsd-reference-fixture.ts; every config is made up or one this repository owns.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGsdConfigReference } from '../../src/presentation/gsd-config-reference.ts';
import type { GsdConfigReference } from '../../src/presentation/gsd-config-reference.ts';
import { maskConfig } from '../../src/planning-repo/secret-mask.ts';
import {
  composeSettingsReference,
  filterSettings,
  jsonKeyLines,
  settingsSubjectOf,
} from '../../src/web/views/settings-reference.ts';
import type { SettingsEntry, SettingsModel, SettingsSubject } from '../../src/web/views/settings-reference.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { ALL_FIXTURE_ROOTS } from '../helpers/fixture-roots.ts';
import { FIXTURE_DEFAULTS, FIXTURE_PLANNING_CONFIG, FIXTURE_SCHEMA } from '../helpers/gsd-reference-fixture.ts';

const REFERENCE = parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema: FIXTURE_SCHEMA, defaults: FIXTURE_DEFAULTS });

type Reference = Extract<SettingsModel, { state: 'reference' }>;

function compose(config: unknown, reference: GsdConfigReference | null = REFERENCE): Reference {
  const subject: SettingsSubject = { state: 'ready', config: maskConfig(config).data as Record<string, unknown> };
  const text = JSON.stringify(config, null, 2);
  const model = composeSettingsReference(subject, reference, { text, parseError: null });
  if (model.state !== 'reference') throw new Error('expected the reference shape');
  return model;
}

function entryOf(model: Reference, key: string): SettingsEntry {
  for (const section of model.sections) {
    const found = [...section.entries, ...section.accepted].find((entry) => entry.key === key);
    if (found !== undefined) return found;
  }
  throw new Error(`no entry ${key}`);
}

function sectionOf(model: Reference, name: string) {
  const found = model.sections.find((section) => section.name === name);
  if (found === undefined) throw new Error(`no section ${name}`);
  return found;
}

const LENDSHED_CONFIG = JSON.parse(readFileSync(join(FX_ROOT, '.planning/config.json'), 'utf8')) as Record<string, unknown>;

describe('settingsSubjectOf', () => {
  it('keeps the plain-file rules: unreadable, workstream scope and non-object data', () => {
    expect(settingsSubjectOf({ a: 1 }, { scope: null, unreadable: false })).toEqual({ state: 'ready', config: { a: 1 } });
    expect(settingsSubjectOf(null, { scope: null, unreadable: true })).toEqual({ state: 'unreadable' });
    expect(settingsSubjectOf({ a: 1 }, { scope: 'ws', unreadable: false })).toBeNull();
    expect(settingsSubjectOf([1], { scope: null, unreadable: false })).toBeNull();
    expect(settingsSubjectOf('x', { scope: null, unreadable: false })).toBeNull();
  });
});

describe('composeSettingsReference: Lendshed against the made-up reference', () => {
  const model = compose(LENDSHED_CONFIG);

  it('puts the mode entry first in Core: documented, set, GSD description split, GSD default, value lit', () => {
    const mode = entryOf(model, 'mode');
    expect(mode.tier).toBe('documented');
    expect(mode.set).toBe(true);
    expect(mode.label).toBe('How much it asks');
    expect(mode.first).toBe('Operation mode: `"interactive"` asks before acting; `"yolo"` runs without prompts.');
    expect(mode.rest).toBe('Switching it mid-run takes effect at the next gate.');
    expect(mode.defaultText).toBe('`"interactive"`');
    expect(mode.value).toEqual({ kind: 'string', text: 'interactive' });
    expect(mode.allowed).toEqual([
      { text: 'interactive', current: true, isDefault: true },
      { text: 'yolo', current: false, isDefault: false },
    ]);
    expect(mode.related.map((note) => note.title)).toEqual(['`mode` and prompts']);
  });

  it('puts an undocumented schema key in the accepted list of its home section', () => {
    expect(sectionOf(model, 'Workflow').accepted.map((entry) => entry.key)).toContain('workflow.human_verify_mode');
    const accepted = entryOf(model, 'workflow.human_verify_mode');
    expect(accepted.tier).toBe('accepted');
    expect(accepted.defaultText).toBe('`"end-of-phase"`');
    expect(accepted.set).toBe(false);
    expect(accepted.value).toBeNull();
  });

  it('puts a config key the schema does not know in unknown, as written', () => {
    expect(model.unknown.map((entry) => entry.key)).toContain('granularity');
    expect(model.unknown.every((entry) => entry.tier === 'unknown' && entry.set)).toBe(true);
    expect(model.unknown.find((entry) => entry.key === 'granularity')?.id).toBe('u-granularity');
  });

  it('puts the line of every set key on its entry', () => {
    expect(entryOf(model, 'mode').line).toBe(2);
    expect(entryOf(model, 'workflow.research').line).toBeGreaterThan(2);
    expect(entryOf(model, 'commit_docs').line).toBe(5);
  });

  it('counts: understood, set, notSet and notRecognised', () => {
    const understood = model.sections.reduce((sum, section) => sum + section.total, 0);
    const set = model.sections.reduce((sum, section) => sum + section.setCount, 0);
    expect(model.counts).toEqual({ understood, set, notSet: understood - set, notRecognised: model.unknown.length });
    expect(model.counts.set).toBeGreaterThan(0);
  });
});

describe('composeSettingsReference: sections', () => {
  const model = compose({});

  it('keeps Labelore order, shows Hook as Hooks, and puts a GSD section the list does not know before Advanced', () => {
    expect(model.sections.map((section) => section.name)).toEqual([
      'Core',
      'Workflow',
      'Search & API',
      'Hooks',
      'Gates',
      'Reviews',
      'Gadget',
      'Advanced',
    ]);
    expect(model.sections.map((section) => section.id)).toContain('s-search-api');
    expect(model.sections.map((section) => section.id)).toContain('s-hooks');
  });

  it('places undocumented keys by the catalogue homes, the namespace intros, then Core and Advanced', () => {
    expect(sectionOf(model, 'Gates').accepted.map((entry) => entry.key)).toEqual(['gates.confirm_transition']);
    expect(sectionOf(model, 'Reviews').accepted.map((entry) => entry.key)).toEqual(['review.default_reviewers']);
    expect(sectionOf(model, 'Search & API').accepted.map((entry) => entry.key)).toEqual(['tavily_search']);
    expect(sectionOf(model, 'Core').accepted.map((entry) => entry.key)).toEqual(['runtime']);
    expect(sectionOf(model, 'Advanced').accepted.map((entry) => entry.key)).toEqual(['statusline.show_git']);
    expect(sectionOf(model, 'Workflow').accepted.map((entry) => entry.key)).toEqual([
      'workflow.human_verify_mode',
    ]);
  });

  it('drops a section with no keys', () => {
    const bare: GsdConfigReference = {
      available: true,
      sections: [
        { name: 'Core', intro: '', rows: [] },
        { name: 'Git', intro: '', rows: [{ key: 'git.x', type: 'string', defaultText: '', allowed: null, allowedText: '', description: 'X.' }] },
      ],
      validKeys: [],
      runtimeKeys: [],
      patterns: [],
      defaults: {},
      interactions: [],
    };
    expect(compose({}, bare).sections.map((section) => section.name)).toEqual(['Git']);
  });

  it('is deterministic', () => {
    expect(compose(LENDSHED_CONFIG)).toEqual(compose(LENDSHED_CONFIG));
  });
});

describe('composeSettingsReference: the walk', () => {
  it('treats a flat dotted name as unknown under its literal path, never as the documented key', () => {
    const model = compose({ 'workflow.research': true, workflow: { 'plan_check.x': 1 } });
    expect(model.unknown.map((entry) => entry.key)).toEqual(['workflow.research', 'workflow.plan_check.x']);
    expect(entryOf(model, 'workflow.research').set).toBe(false);
  });

  it('matches exactly and case-sensitively', () => {
    const model = compose({ Mode: 'yolo', workflow: { Research: true } });
    expect(entryOf(model, 'mode').set).toBe(false);
    expect(model.unknown.map((entry) => entry.key)).toEqual(['Mode', 'workflow.Research']);
  });

  it('shows an own __proto__ key as unknown and never reads an inherited key', () => {
    const config = JSON.parse('{"__proto__": {"mode": "yolo"}, "mode": "interactive"}') as Record<string, unknown>;
    // Built without maskConfig: its copy loop assigns `out['__proto__']`, which sets a prototype instead of keeping the own key.
    const composed = composeSettingsReference({ state: 'ready', config }, REFERENCE, null);
    if (composed.state !== 'reference') throw new Error('expected the reference shape');
    const model = composed;
    expect(model.unknown.map((entry) => entry.key)).toEqual(['__proto__']);
    expect(entryOf(model, 'mode').value).toEqual({ kind: 'string', text: 'interactive' });
    expect(entryOf(compose({}), 'mode').set).toBe(false);
  });

  it('counts null as set', () => {
    const entry = entryOf(compose({ project_code: null }), 'project_code');
    expect(entry.set).toBe(true);
    expect(entry.value).toEqual({ kind: 'null' });
  });

  it('keeps an empty string as an empty string', () => {
    expect(entryOf(compose({ project_code: '' }), 'project_code').value).toEqual({ kind: 'string', text: '' });
  });

  it('reads a secret top-level string as masked and never lights an allowed option on it', () => {
    const reference: GsdConfigReference = {
      ...(REFERENCE as Extract<GsdConfigReference, { available: true }>),
      sections: [
        {
          name: 'Core',
          intro: '',
          rows: [{ key: 'brave_search', type: 'boolean', defaultText: '`false`', allowed: ['true', 'false', '"****cret"'], allowedText: '', description: 'Brave.' }],
        },
      ],
    };
    const masked = entryOf(compose({ brave_search: 'secretvalue-cret' }, reference), 'brave_search');
    expect(masked.value).toEqual({ kind: 'masked', text: '****cret' });
    expect(masked.allowed?.some((option) => option.current)).toBe(false);
    const plain = entryOf(compose({ brave_search: true }, reference), 'brave_search');
    expect(plain.value).toEqual({ kind: 'boolean', on: true });
    expect(plain.allowed?.find((option) => option.text === 'true')?.current).toBe(true);
  });

  it('sets an angle-bracket documented entry with an object of the matched remainders', () => {
    const model = compose({ review: { models: { codex: 'a', gemini: 'b' } } });
    const entry = entryOf(model, 'review.models.<cli>');
    expect(entry.set).toBe(true);
    expect(entry.value).toEqual({ kind: 'object', value: { codex: 'a', gemini: 'b' } });
    expect(entry.wide).toBe(true);
    expect(entry.line).toBe(4);
    expect(entryOf(compose({}), 'review.models.<cli>').set).toBe(false);
  });

  it('puts a schema-pattern match in its home section as a set accepted row and adds one to the total', () => {
    const before = sectionOf(compose({}), 'Advanced');
    const model = compose({ features: { zeta: true }, models: { planning: 'x' } });
    const after = sectionOf(model, 'Advanced');
    expect(after.total).toBe(before.total + 2);
    expect(after.setCount).toBe(before.setCount + 2);
    const zeta = after.accepted.find((entry) => entry.key === 'features.zeta');
    expect(zeta?.set).toBe(true);
    expect(zeta?.value).toEqual({ kind: 'boolean', on: true });
  });

  it('shows an open map under a fixed key as one entry holding its value whole', () => {
    const entry = entryOf(compose({ agent_skills: { planner: 'a', executor: ['b', 'c'] } }), 'agent_skills');
    expect(entry.value).toEqual({ kind: 'object', value: { planner: 'a', executor: ['b', 'c'] } });
    expect(entry.wide).toBe(true);
  });

  it('marks a list wide and a one-key object not wide', () => {
    expect(entryOf(compose({ agent_skills: { planner: 'a' } }), 'agent_skills').wide).toBe(false);
    const list = compose({ models: { planning: ['a'] } });
    expect(list.sections.flatMap((section) => section.accepted).find((entry) => entry.key === 'models.planning')?.wide).toBe(true);
  });

  it('numbers read as their text', () => {
    expect(entryOf(compose({ context_window: 1000000 }), 'context_window').value).toEqual({ kind: 'number', text: '1000000' });
    expect(entryOf(compose({ context_window: 1000000 }), 'context_window').allowed?.[1]).toEqual({ text: '1000000', current: true, isDefault: false });
  });

  it('lands every config entry in exactly one place, over the committed fixtures and this repository', () => {
    const roots = ALL_FIXTURE_ROOTS.filter((root) => {
      try {
        readFileSync(join(root, '.planning/config.json'), 'utf8');
        return true;
      } catch {
        return false;
      }
    });
    expect(roots.length).toBeGreaterThanOrEqual(3);
    for (const root of roots) {
      const config = JSON.parse(readFileSync(join(root, '.planning/config.json'), 'utf8')) as Record<string, unknown>;
      const model = compose(config);
      const claimed: string[] = [];
      for (const section of model.sections) {
        for (const entry of [...section.entries, ...section.accepted]) {
          if (!entry.set) continue;
          if (entry.key.includes('<') && entry.value?.kind === 'object') {
            for (const remainder of Object.keys(entry.value.value)) {
              const parts = remainder.split('.');
              claimed.push(entry.key.replace(/<[^>]*>/g, () => parts.shift() ?? ''));
            }
          } else claimed.push(entry.key);
        }
      }
      for (const entry of model.unknown) claimed.push(entry.key);
      expect(new Set(claimed).size, root).toBe(claimed.length);
      const covered = (node: unknown, path: string): boolean => {
        if (claimed.includes(path)) return true;
        if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
          return Object.entries(node as Record<string, unknown>).every(([name, child]) => covered(child, path === '' ? name : `${path}.${name}`));
        }
        return false;
      };
      expect(covered(config, ''), root).toBe(true);
    }
  });
});

describe('composeSettingsReference: states', () => {
  it('composes the reference with no values for a missing config', () => {
    const model = composeSettingsReference({ state: 'missing' }, REFERENCE, null);
    expect(model).toMatchObject({ state: 'reference', config: 'missing', unknown: [] });
    if (model.state !== 'reference') return;
    expect(model.counts.set).toBe(0);
    expect(model.counts.notSet).toBe(model.counts.understood);
    expect(model.sections.flatMap((section) => section.entries).every((entry) => !entry.set && entry.line === null)).toBe(true);
    expect(composeSettingsReference(null, REFERENCE, null)).toEqual(model);
  });

  it('composes the reference with no values for an unreadable config, carrying the parser line', () => {
    const parseError = { line: 14, column: 3, reason: 'unexpected-character' as const };
    const model = composeSettingsReference({ state: 'unreadable' }, REFERENCE, { text: '{', parseError });
    expect(model).toMatchObject({ state: 'reference', config: 'unreadable', parseError });
    if (model.state !== 'reference') return;
    expect(model.counts.set).toBe(0);
  });

  it('gives the values-only shape without a reference, never throwing', () => {
    const subject: SettingsSubject = { state: 'ready', config: { mode: 'yolo', workflow: { research: true, mystery: 1 }, 'a.b': 2 } };
    const text = JSON.stringify(subject.config, null, 2);
    for (const reference of [null, { available: false, reason: 'not-found' } as const]) {
      const model = composeSettingsReference(subject, reference, { text, parseError: null });
      expect(model.state).toBe('values-only');
      if (model.state !== 'values-only') continue;
      expect(model.entries.map((entry) => entry.key)).toEqual(['mode', 'workflow.research', 'workflow.mystery', 'a.b']);
      expect(model.entries[0]).toMatchObject({ label: 'How much it asks', set: true, line: 2 });
      expect(model.entries[3]?.label).toBeNull();
    }
    expect(composeSettingsReference({ state: 'missing' }, null, null)).toEqual({ state: 'values-only', config: 'missing', parseError: null, entries: [] });
    expect(composeSettingsReference({ state: 'unreadable' }, null, null)).toMatchObject({ state: 'values-only', config: 'unreadable', entries: [] });
  });
});

describe('jsonKeyLines', () => {
  it('maps every object key path to its 1-based line, nested objects only, first occurrence winning', () => {
    const text = ['{', '  "a": 1,', '  "b": {', '    "c": [', '      { "inner": 1 }', '    ],', '    "d": { "e": true }', '  },', '  "a": 2', '}'].join('\n');
    const lines = jsonKeyLines(text);
    expect([...lines.entries()]).toEqual([
      ['a', 2],
      ['b', 3],
      ['b.c', 4],
      ['b.d', 7],
      ['b.d.e', 7],
    ]);
  });

  it('never throws on invalid JSON and gives what it could read', () => {
    expect(jsonKeyLines('{ "a": 1,\n "b": { "c": ').get('b.c')).toBe(2);
    expect(jsonKeyLines('').size).toBe(0);
    expect(jsonKeyLines('}}}{{{ "x').size).toBe(0);
    expect(jsonKeyLines('{ "a\\"b": 1 }').has('a"b')).toBe(true);
  });

  it('keeps a key whose text holds braces and commas inside a string', () => {
    const lines = jsonKeyLines('{\n "x": "a, {b}",\n "y": 1\n}');
    expect(lines.get('y')).toBe(3);
  });
});

describe('filterSettings', () => {
  const model = compose({ mode: 'yolo', workflow: { research: false }, granularity: 'standard' });
  const all = { query: '', status: 'all' as const };

  it('matches key, label, description or the JSON of a set value, case-insensitively', () => {
    const byKey = filterSettings(model, { ...all, query: 'WORKFLOW.PLAN' });
    expect(byKey.sections.flatMap((s) => s.entries.map((e) => e.key))).toEqual(['workflow.plan_check']);
    const byLabel = filterSettings(model, { ...all, query: 'how much' });
    expect(byLabel.sections.flatMap((s) => s.entries.map((e) => e.key))).toEqual(['mode']);
    const byDescription = filterSettings(model, { ...all, query: 'ignore-file' });
    expect(byDescription.empty).toBe(true);
    const byValue = filterSettings(model, { ...all, query: 'yolo' });
    expect(byValue.sections.flatMap((s) => s.entries.map((e) => e.key))).toContain('mode');
    const byText = filterSettings(model, { ...all, query: 'research pass' });
    expect(byText.sections.flatMap((s) => s.entries.map((e) => e.key))).toEqual(['workflow.research']);
  });

  it('filters by status as the sketch does', () => {
    const set = filterSettings(model, { query: '', status: 'set' });
    expect(set.sections.flatMap((s) => [...s.entries, ...s.accepted].map((e) => e.key)).sort()).toEqual(['mode', 'workflow.research']);
    expect(set.unknown).toEqual([]);
    const unset = filterSettings(model, { query: '', status: 'unset' });
    expect(unset.sections.flatMap((s) => [...s.entries, ...s.accepted]).every((e) => !e.set)).toBe(true);
    expect(unset.unknown).toEqual([]);
    const unknown = filterSettings(model, { query: '', status: 'unknown' });
    expect(unknown.unknown.map((e) => e.key)).toEqual(['granularity']);
    expect(unknown.sections.every((s) => s.dim)).toBe(true);
    expect(unknown.empty).toBe(false);
  });

  it('opens a fold while a query is typed or when no documented entry is visible', () => {
    expect(filterSettings(model, all).sections.find((s) => s.section.name === 'Workflow')?.foldOpen).toBe(false);
    expect(filterSettings(model, { ...all, query: 'zzz' }).sections.every((s) => s.foldOpen)).toBe(true);
    const noDocs = filterSettings(model, { ...all, query: 'human_verify' });
    expect(noDocs.sections.find((s) => s.section.name === 'Workflow')?.foldOpen).toBe(true);
    expect(filterSettings(model, all).sections.find((s) => s.section.name === 'Gates')?.foldOpen).toBe(true);
  });

  it('reports set/total on each rail row with no filter and the visible count otherwise, dimmed at 0', () => {
    const plain = filterSettings(model, all);
    const workflow = model.sections.find((s) => s.name === 'Workflow');
    expect(plain.sections.find((s) => s.section.name === 'Workflow')?.rail).toBe(`${workflow?.setCount}/${workflow?.total}`);
    expect(plain.unknownRail).toBe('1');
    const narrowed = filterSettings(model, { ...all, query: 'workflow.plan' });
    expect(narrowed.sections.find((s) => s.section.name === 'Workflow')?.rail).toBe('1');
    expect(narrowed.sections.find((s) => s.section.name === 'Core')?.rail).toBe('0');
    expect(narrowed.sections.find((s) => s.section.name === 'Core')?.dim).toBe(true);
    expect(narrowed.unknownRail).toBe('0');
    expect(narrowed.unknownDim).toBe(true);
  });

  it('reports empty when nothing matches', () => {
    expect(filterSettings(model, { ...all, query: 'no such thing anywhere' }).empty).toBe(true);
    expect(filterSettings(model, all).empty).toBe(false);
  });
});
