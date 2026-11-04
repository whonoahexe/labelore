// VIEW-21 (D-10, D-13): every made-up example of a rule kind carries a marker in the file itself and a row in
// test/fixtures/README.md. The test loads every fixture root through the real repository and fails (never
// skips) when a rule-kind file lacks the marker, a marked file has no row, or a row names an absent file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALL_FIXTURE_ROOTS } from './helpers/fixture-roots.ts';
import { EXEMPT_ROOTS, findMadeUpProblems, formatProblems, parseMadeUpIndex } from './helpers/made-up-examples.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const INDEX_PATH = join(REPO_ROOT, 'test/fixtures/README.md');

const exemptAbsolute = new Set(EXEMPT_ROOTS.map((root) => (root.path === '' ? REPO_ROOT : join(REPO_ROOT, root.path))));
const CHECKED_ROOTS = ALL_FIXTURE_ROOTS.filter((root) => !exemptAbsolute.has(root));

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
});
