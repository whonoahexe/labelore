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
const SHAPES_MAP_PATHS = ['ARCHITECTURE', 'CONVENTIONS', 'STACK'].map((name) => `test/fixtures/shapes/.planning/codebase/${name}.md`);

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

  it('the real check sees Shapes map documents: with no index they are three not-indexed problems', async () => {
    const problems = await findMadeUpProblems({ roots: [SHAPES_ROOT], indexRows: [], repoRoot: REPO_ROOT });
    expect(problems).toEqual(SHAPES_MAP_PATHS.map((path) => ({ path, kind: 'not-indexed' })));
  });

  it('the rule covers the spec, check and map kinds', () => {
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
