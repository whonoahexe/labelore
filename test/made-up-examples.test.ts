// VIEW-21 (D-10, D-13): every made-up example of a rule kind carries a marker in the file itself and a row in
// test/fixtures/README.md. The test loads every fixture root through the real repository and fails (never
// skips) when a rule-kind file lacks the marker, a marked file has no row, or a row names an absent file.
// The planted controls build their own mkdtemp projects, so a check that silently passes everything fails here.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { ALL_FIXTURE_ROOTS } from './helpers/fixture-roots.ts';
import {
  EXEMPT_ROOTS,
  MADE_UP_EXAMPLE_KINDS,
  findMadeUpProblems,
  formatProblems,
  parseMadeUpIndex,
  readMadeUpMarker,
} from './helpers/made-up-examples.ts';
import type { IndexRow } from './helpers/made-up-examples.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const INDEX_PATH = join(REPO_ROOT, 'test/fixtures/README.md');

const exemptAbsolute = new Set(EXEMPT_ROOTS.map((root) => (root.path === '' ? REPO_ROOT : join(REPO_ROOT, root.path))));
const CHECKED_ROOTS = ALL_FIXTURE_ROOTS.filter((root) => !exemptAbsolute.has(root));

const SHAPES_ROOT = join(REPO_ROOT, 'test/fixtures/shapes');
const SHAPES_PREFIX = 'test/fixtures/shapes/.planning';
// Every rule-kind file in Shapes, in the order the check reports them (sorted by path): the root pause, the
// pause JSON, the three map documents, the phase pause, the three spike files.
const SHAPES_RULE_PATHS = [
  `${SHAPES_PREFIX}/.continue-here.md`,
  `${SHAPES_PREFIX}/HANDOFF.json`,
  ...['ARCHITECTURE', 'CONVENTIONS', 'STACK'].map((name) => `${SHAPES_PREFIX}/codebase/${name}.md`),
  `${SHAPES_PREFIX}/phases/02-glaze-recipes/.continue-here.md`,
  `${SHAPES_PREFIX}/spikes/001-kiln-sensor/README.md`,
  `${SHAPES_PREFIX}/spikes/CONVENTIONS.md`,
  `${SHAPES_PREFIX}/spikes/MANIFEST.md`,
];

const FRONTMATTER_MARKER = ['---', 'made_up_example: true', 'derived_from: gsd-core/templates/spec.md', 'gsd_core_version: 1.19.0', '---', ''].join('\n');
const COMMENT_MARKER = '<!-- made-up example · derived from gsd-core/templates/spec.md · gsd-core 1.19.0 -->\n';

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A temporary project holding the given files (path relative to the project root); its root is its repo root. */
function plantProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'labelore-made-up-'));
  scratch.push(root);
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
  return root;
}

function row(path: string): IndexRow {
  return { path, type: 'spec', derivedFrom: 'gsd-core/templates/spec.md', version: '1.19.0', shape: 'planted' };
}

const SPEC = '.planning/phases/01-x/01-SPEC.md';
const SPEC_BODY = '# Spec\n\nPlanted body.\n';

describe('made-up example markers and index (VIEW-21)', () => {
  it('every rule-kind file in every fixture root has a marker and an index row', async () => {
    const indexRows = parseMadeUpIndex(readFileSync(INDEX_PATH, 'utf8'));
    expect(indexRows.length).toBeGreaterThan(0);
    const problems = await findMadeUpProblems({ roots: CHECKED_ROOTS, indexRows, repoRoot: REPO_ROOT });
    expect(problems, formatProblems(problems)).toEqual([]);
  });

  it('exempts only the roots named with a reason', () => {
    for (const root of EXEMPT_ROOTS) expect(root.reason.length).toBeGreaterThan(0);
    expect(EXEMPT_ROOTS.map((root) => root.path)).toEqual(['fixtures/dense', '']);
  });

  it('the real check sees Shapes rule-kind files: with no index each is a not-indexed problem', async () => {
    const problems = await findMadeUpProblems({ roots: [SHAPES_ROOT], indexRows: [], repoRoot: REPO_ROOT });
    expect(problems).toEqual(SHAPES_RULE_PATHS.map((path) => ({ path, kind: 'not-indexed' })));
  });

  it('the rule covers the spec, check, map, intel, graph, pause and spike kinds', () => {
    for (const kind of ['intel', 'graph', 'handoff', 'continue-here', 'spikes-manifest', 'spike', 'spikes-wrap-up', 'spikes-conventions']) expect(MADE_UP_EXAMPLE_KINDS.has(kind)).toBe(true);
    for (const kind of ['spec', 'ai-spec', 'user-setup', 'eval-review', 'dom-verify', 'reviews']) expect(MADE_UP_EXAMPLE_KINDS.has(kind)).toBe(true);
    for (const name of ['stack', 'architecture', 'structure', 'conventions', 'testing', 'integrations', 'concerns']) {
      expect(MADE_UP_EXAMPLE_KINDS.has(`codebase-${name}`)).toBe(true);
    }
  });
});

describe('planted controls: the check bites', () => {
  it('an unmarked SPEC is exactly one missing-marker problem', async () => {
    const root = plantProject({ [SPEC]: SPEC_BODY });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [row(SPEC)], repoRoot: root });
    expect(problems).toEqual([{ path: SPEC, kind: 'missing-marker' }]);
  });

  it('an index row naming an absent file is exactly one indexed-file-missing problem', async () => {
    const root = plantProject({ '.planning/PROJECT.md': '# Planted\n' });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [row('.planning/phases/01-x/01-GONE.md')], repoRoot: root });
    expect(problems).toEqual([{ path: '.planning/phases/01-x/01-GONE.md', kind: 'indexed-file-missing' }]);
  });

  it('the same index row twice is exactly one duplicate-index-row problem, never merged silently', async () => {
    const root = plantProject({ [SPEC]: COMMENT_MARKER + SPEC_BODY });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [row(SPEC), row(SPEC)], repoRoot: root });
    expect(problems).toEqual([{ path: SPEC, kind: 'duplicate-index-row' }]);
  });

  it('a marked but unindexed file is exactly one not-indexed problem', async () => {
    const root = plantProject({ [SPEC]: COMMENT_MARKER + SPEC_BODY });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [], repoRoot: root });
    expect(problems).toEqual([{ path: SPEC, kind: 'not-indexed' }]);
  });

  it('a file carrying both marker forms counts as one marked example', async () => {
    const root = plantProject({ [SPEC]: FRONTMATTER_MARKER + COMMENT_MARKER + SPEC_BODY });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [row(SPEC)], repoRoot: root });
    expect(problems).toEqual([]);
  });

  it('a frontmatter marker alone satisfies the rule', async () => {
    const root = plantProject({ [SPEC]: FRONTMATTER_MARKER + SPEC_BODY });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [row(SPEC)], repoRoot: root });
    expect(problems).toEqual([]);
  });

  it('a root with no rule-kind file yields no problem', async () => {
    const root = plantProject({ '.planning/PROJECT.md': '# Planted\n', '.planning/phases/01-x/01-CONTEXT.md': '# Context\n' });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [], repoRoot: root });
    expect(problems).toEqual([]);
  });

  it('problems are sorted by path then kind and identical from call to call', async () => {
    const root = plantProject({
      '.planning/phases/02-y/02-SPEC.md': SPEC_BODY,
      [SPEC]: COMMENT_MARKER + SPEC_BODY,
    });
    const rows = [row('.planning/phases/02-y/02-SPEC.md'), row('.planning/phases/00-a/00-GONE.md')];
    const first = await findMadeUpProblems({ roots: [root], indexRows: rows, repoRoot: root });
    const second = await findMadeUpProblems({ roots: [root], indexRows: rows, repoRoot: root });
    expect(second).toEqual(first);
    expect(first).toEqual([
      { path: '.planning/phases/00-a/00-GONE.md', kind: 'indexed-file-missing' },
      { path: SPEC, kind: 'not-indexed' },
      { path: '.planning/phases/02-y/02-SPEC.md', kind: 'missing-marker' },
    ]);
  });
});

const STACK = '.planning/intel/stack.json';
const MARKER_KEYS = { made_up_example: true, derived_from: 'agents/gsd-intel-updater.md', gsd_core_version: '1.19.0' };

function intelRow(path: string): IndexRow {
  return { path, type: 'intel', derivedFrom: 'agents/gsd-intel-updater.md', version: '1.19.0', shape: 'planted' };
}

describe('JSON markers (D-15, RESEARCH C13)', () => {
  it('a top-level marker passes', async () => {
    const root = plantProject({ [STACK]: JSON.stringify({ ...MARKER_KEYS, languages: ['TypeScript'] }) });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [intelRow(STACK)], repoRoot: root });
    expect(problems).toEqual([]);
  });

  it('a marker inside _meta passes', async () => {
    const root = plantProject({ [STACK]: JSON.stringify({ _meta: { updated_at: 'x', version: 1, ...MARKER_KEYS }, entries: {} }) });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [intelRow(STACK)], repoRoot: root });
    expect(problems).toEqual([]);
  });

  it('a JSON file with no marker is exactly one missing-marker problem', async () => {
    const root = plantProject({ [STACK]: JSON.stringify({ _meta: { updated_at: 'x', version: 1 }, entries: {} }) });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [intelRow(STACK)], repoRoot: root });
    expect(problems).toEqual([{ path: STACK, kind: 'missing-marker' }]);
  });

  it('a graph file is bound by the rule too', async () => {
    const graph = '.planning/graphs/graph.json';
    const root = plantProject({ [graph]: JSON.stringify({ nodes: [], links: [] }) });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [], repoRoot: root });
    expect(problems).toEqual([
      { path: graph, kind: 'missing-marker' },
      { path: graph, kind: 'not-indexed' },
    ]);
  });

  it('invalid JSON is a missing marker and never a throw', async () => {
    const root = plantProject({ [STACK]: '{ "made_up_example": true, "derived_from": ' });
    const problems = await findMadeUpProblems({ roots: [root], indexRows: [intelRow(STACK)], repoRoot: root });
    expect(problems).toEqual([{ path: STACK, kind: 'missing-marker' }]);
    expect(readMadeUpMarker({}, '{ not json')).toBeNull();
    expect(readMadeUpMarker({}, '[1, 2, 3]')).toBeNull();
  });

  it('a marker with a wrong type or a prototype key is not a marker', () => {
    expect(readMadeUpMarker({}, JSON.stringify({ ...MARKER_KEYS, made_up_example: 'true' }))).toBeNull();
    expect(readMadeUpMarker({}, '{"__proto__": {"made_up_example": true, "derived_from": "a", "gsd_core_version": "1"}}')).toBeNull();
  });

  it('reads the marker from fence lines when the YAML beside it does not parse', () => {
    const text = ['---', 'spike: 004', 'verdict: VALIDATED: with a stray colon', 'made_up_example: true', 'derived_from: agents/gsd-intel-updater.md', 'gsd_core_version: 1.19.0', '---', '# Planted', ''].join('\n');
    expect(readMadeUpMarker({}, text)).toEqual({ derivedFrom: 'agents/gsd-intel-updater.md', version: '1.19.0' });
    expect(readMadeUpMarker({}, text.replace('made_up_example: true', 'made_up_example: false'))).toBeNull();
    expect(readMadeUpMarker({}, text.replace('---\n', '').replace('spike: 004', '# spike'))).toBeNull();
  });
});

describe('marker and index parsing', () => {
  it('reads both marker forms and rejects look-alikes', () => {
    const expected = { derivedFrom: 'gsd-core/templates/spec.md', version: '1.19.0' };
    expect(readMadeUpMarker({ made_up_example: true, derived_from: expected.derivedFrom, gsd_core_version: '1.19.0' }, '')).toEqual(expected);
    expect(readMadeUpMarker({}, COMMENT_MARKER + SPEC_BODY)).toEqual(expected);
    expect(readMadeUpMarker({ made_up_example: 'yes', derived_from: 'x', gsd_core_version: '1' }, '')).toBeNull();
    expect(readMadeUpMarker({ made_up_example: true, derived_from: 'x' }, '')).toBeNull();
    expect(readMadeUpMarker({}, '<!-- made-up example -->\n# Spec\n')).toBeNull();
    expect(readMadeUpMarker({}, '# Spec\n' + COMMENT_MARKER)).toBeNull();
    expect(readMadeUpMarker({}, '')).toBeNull();
  });

  it('parses the first Path table, keeps duplicates, and stops at the first non-row line', () => {
    const markdown = [
      '# Made-up examples',
      '',
      '| Path | Type | Derived from | gsd-core | Hard shape covered |',
      '|---|---|---|---|---|',
      '| a/one.md | spec | gsd-core/templates/spec.md | 1.19.0 | first |',
      '| `a/one.md` | spec | gsd-core/templates/spec.md | 1.19.0 | again |',
      '',
      '| a/two.md | spec | x | 1 | after the table |',
    ].join('\n');
    const rows = parseMadeUpIndex(markdown);
    expect(rows.map((r) => r.path)).toEqual(['a/one.md', 'a/one.md']);
    expect(rows[0]).toEqual({ path: 'a/one.md', type: 'spec', derivedFrom: 'gsd-core/templates/spec.md', version: '1.19.0', shape: 'first' });
  });
});
