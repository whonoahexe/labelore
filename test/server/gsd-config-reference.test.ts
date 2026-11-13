// The parser of GSD's configuration reference, the place the installed gsd-core is looked for, the read-only loader and the route
// that serves it (quick-261114-42r). Every input is made up (test/helpers/gsd-reference-fixture.ts): no run reads a real install.
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { parseGsdConfigReference } from '../../src/presentation/gsd-config-reference.ts';
import type { GsdConfigReference } from '../../src/presentation/gsd-config-reference.ts';
import { gsdCoreDir, loadGsdConfigReference, REFERENCE_READ_CAP } from '../../src/server/gsd-config-reference.ts';
import { createApp } from '../../src/server/index.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { guardedRequest } from '../helpers/guarded-request.ts';
import {
  FIXTURE_DEFAULTS,
  FIXTURE_PLANNING_CONFIG,
  FIXTURE_SCHEMA,
  writeGsdCoreTree,
} from '../helpers/gsd-reference-fixture.ts';

const made: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'labelore-gsd-ref-'));
  made.push(dir);
  return dir;
}
afterAll(async () => {
  for (const dir of made) await rm(dir, { recursive: true, force: true });
});

function parsed(): Extract<GsdConfigReference, { available: true }> {
  const result = parseGsdConfigReference({
    planningConfig: FIXTURE_PLANNING_CONFIG,
    schema: FIXTURE_SCHEMA,
    defaults: FIXTURE_DEFAULTS,
  });
  if (!result.available) throw new Error('the fixture must parse');
  return result;
}

describe('parseGsdConfigReference', () => {
  it('gives the sections in file order with " Fields" removed, and stops at the next ## heading', () => {
    const { sections } = parsed();
    expect(sections.map((section) => section.name)).toEqual(['Core', 'Workflow', 'Hook', 'Gadget', 'Advanced']);
    expect(sections.flatMap((section) => section.rows.map((row) => row.key))).not.toContain('not.part.of.it');
  });

  it('keeps each intro as the text between the heading and its table', () => {
    const { sections } = parsed();
    expect(sections[0]?.intro).toBe('');
    expect(sections[1]?.intro).toBe('Set via `workflow.*` namespace in config.json (e.g., `"workflow": { "research": true }`).');
  });

  it('reads a row into key, type, default, allowed literals, allowed text and description', () => {
    const mode = parsed().sections[0]?.rows[0];
    expect(mode).toEqual({
      key: 'mode',
      type: 'string',
      defaultText: '`"interactive"`',
      allowed: ['"interactive"', '"yolo"'],
      allowedText: '`"interactive"`, `"yolo"`',
      description:
        'Operation mode: `"interactive"` asks before acting; `"yolo"` runs without prompts. Switching it mid-run takes effect at the next gate.',
    });
  });

  it('keeps an escaped pipe as a literal pipe, skips a row that is not five cells and keeps the first of a duplicated key', () => {
    const rows = parsed().sections.flatMap((section) => section.rows);
    expect(rows.find((row) => row.key === 'project_code')?.type).toBe('string|null');
    expect(rows.find((row) => row.key === 'workflow.plan_check')?.description).toContain('a checker | or with a person');
    expect(rows.filter((row) => row.key === 'workflow.research')).toHaveLength(1);
    expect(rows.find((row) => row.key === 'workflow.research')?.defaultText).toBe('`true`');
    expect(rows.some((row) => row.key.includes('this row has'))).toBe(false);
  });

  it('lists allowed literals only when the whole cell is backticked literals', () => {
    const rows = parsed().sections.flatMap((section) => section.rows);
    expect(rows.find((row) => row.key === 'project_code')?.allowed).toBeNull();
    expect(rows.find((row) => row.key === 'project_code')?.allowedText).toBe('Any short string');
    expect(rows.find((row) => row.key === 'gadget.size')?.allowed).toBeNull();
    expect(rows.find((row) => row.key === 'context_window')?.allowed).toEqual(['200000', '1000000']);
  });

  it('turns Field Interactions items into title and text', () => {
    expect(parsed().interactions).toEqual([
      {
        title: '`commit_docs` and the ignore file',
        text: 'An explicit value wins over the ignore-file check. The ignore file only decides when nothing is set.',
      },
      { title: '`mode` and prompts', text: 'In `yolo` mode no prompt is shown. Everything else behaves the same.' },
    ]);
  });

  it('reads the manifests: valid keys, runtime keys, compilable short patterns and flattened defaults', () => {
    const reference = parsed();
    expect(reference.validKeys).toContain('workflow.human_verify_mode');
    expect(reference.runtimeKeys).toEqual(['workflow._auto_chain_active']);
    expect(reference.patterns.map((pattern) => pattern.topLevel)).toEqual(['features', 'models']);
    expect(reference.defaults).toEqual({
      mode: 'interactive',
      commit_docs: true,
      'workflow.research': true,
      'workflow.plan_check': true,
      'workflow.human_verify_mode': 'end-of-phase',
      'gates.confirm_transition': true,
      tavily_search: false,
      'statusline.show_git': true,
    });
  });

  it('drops a pattern source longer than 300 characters', () => {
    const schema = JSON.stringify({
      validKeys: ['a'],
      dynamicKeyPatterns: [{ topLevel: 'x', source: `^x\\.${'a'.repeat(300)}$`, description: '' }],
    });
    const result = parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema, defaults: null });
    expect(result.available && result.patterns).toEqual([]);
  });

  it('never throws: unusable texts answer not-parsed or give no defaults', () => {
    const notParsed = { available: false, reason: 'not-parsed' };
    expect(parseGsdConfigReference({ planningConfig: '', schema: FIXTURE_SCHEMA, defaults: null })).toEqual(notParsed);
    expect(parseGsdConfigReference({ planningConfig: '## Complete Field Reference\n\nnothing', schema: FIXTURE_SCHEMA, defaults: null })).toEqual(notParsed);
    expect(parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema: 'not json', defaults: null })).toEqual(notParsed);
    expect(parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema: '[]', defaults: null })).toEqual(notParsed);
    expect(parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema: '{"validKeys":[1]}', defaults: null })).toEqual(notParsed);
    const noDefaults = parseGsdConfigReference({ planningConfig: FIXTURE_PLANNING_CONFIG, schema: FIXTURE_SCHEMA, defaults: '{oops' });
    expect(noDefaults.available && noDefaults.defaults).toEqual({});
  });
});

describe('gsdCoreDir', () => {
  it('prefers LABELORE_GSD_CORE_DIR', () => {
    expect(gsdCoreDir({ LABELORE_GSD_CORE_DIR: '/x/core', CLAUDE_CONFIG_DIR: '/y' }, '/home/u')).toBe('/x/core');
  });

  it('is null under vitest without the override', () => {
    expect(gsdCoreDir({ VITEST: 'true' }, '/home/u')).toBeNull();
    expect(gsdCoreDir({ VITEST: 'true', LABELORE_GSD_CORE_DIR: '' }, '/home/u')).toBeNull();
  });

  it('uses CLAUDE_CONFIG_DIR when absolute, else the home .claude folder', () => {
    expect(gsdCoreDir({ CLAUDE_CONFIG_DIR: '/cfg' }, '/home/u')).toBe('/cfg/gsd-core');
    expect(gsdCoreDir({ CLAUDE_CONFIG_DIR: 'relative' }, '/home/u')).toBe('/home/u/.claude/gsd-core');
    expect(gsdCoreDir({}, '/home/u')).toBe('/home/u/.claude/gsd-core');
  });
});

describe('loadGsdConfigReference', () => {
  it('reads a tree laid out like an installed gsd-core', async () => {
    const dir = await tempDir();
    await writeGsdCoreTree(dir);
    const result = await loadGsdConfigReference(dir);
    expect(result.available).toBe(true);
  });

  it('answers not-found for a null or missing directory, and for a tree without the reference', async () => {
    expect(await loadGsdConfigReference(null)).toEqual({ available: false, reason: 'not-found' });
    expect(await loadGsdConfigReference(join(tmpdir(), 'labelore-no-such-gsd-core'))).toEqual({ available: false, reason: 'not-found' });
    expect(await loadGsdConfigReference(await tempDir())).toEqual({ available: false, reason: 'not-found' });
  });

  it('works without the defaults manifest', async () => {
    const dir = await tempDir();
    await mkdir(join(dir, 'references'), { recursive: true });
    await mkdir(join(dir, 'bin/shared'), { recursive: true });
    await writeFile(join(dir, 'references/planning-config.md'), FIXTURE_PLANNING_CONFIG);
    await writeFile(join(dir, 'bin/shared/config-schema.manifest.json'), FIXTURE_SCHEMA);
    const result = await loadGsdConfigReference(dir);
    expect(result.available && result.defaults).toEqual({});
  });

  it('answers unreadable for a file that cannot be read and for one that fills the read cap', async () => {
    const dir = await tempDir();
    await writeGsdCoreTree(dir);
    await writeFile(join(dir, 'bin/shared/config-schema.manifest.json'), 'x'.repeat(REFERENCE_READ_CAP));
    expect(await loadGsdConfigReference(dir)).toEqual({ available: false, reason: 'unreadable' });

    const odd = await tempDir();
    await mkdir(join(odd, 'references/planning-config.md'), { recursive: true });
    expect(await loadGsdConfigReference(odd)).toEqual({ available: false, reason: 'unreadable' });
  });

  it('answers not-parsed for files that are there but unusable', async () => {
    const dir = await tempDir();
    await writeGsdCoreTree(dir);
    await writeFile(join(dir, 'references/planning-config.md'), 'nothing useful');
    expect(await loadGsdConfigReference(dir)).toEqual({ available: false, reason: 'not-parsed' });
  });
});

describe('GET /api/gsd-config-reference', () => {
  const saved = process.env.LABELORE_GSD_CORE_DIR;
  afterEach(() => {
    if (saved === undefined) delete process.env.LABELORE_GSD_CORE_DIR;
    else process.env.LABELORE_GSD_CORE_DIR = saved;
  });

  async function appOverLendshed() {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(FX_ROOT), FX_ROOT);
    await repository.load();
    return createApp(repository, false);
  }

  it('answers the parsed reference from the made-up tree, and carries no path', async () => {
    const dir = await tempDir();
    await writeGsdCoreTree(dir);
    process.env.LABELORE_GSD_CORE_DIR = dir;
    const response = await guardedRequest(await appOverLendshed(), '/api/gsd-config-reference');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    const text = await response.text();
    const body = JSON.parse(text) as GsdConfigReference;
    expect(body.available).toBe(true);
    expect(text).not.toContain(dir);
  });

  it('answers not-found, not an error, when no install is found', async () => {
    process.env.LABELORE_GSD_CORE_DIR = join(tmpdir(), 'labelore-no-such-gsd-core');
    const response = await guardedRequest(await appOverLendshed(), '/api/gsd-config-reference');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ available: false, reason: 'not-found' });
  });
});
