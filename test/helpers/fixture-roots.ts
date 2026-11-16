// The one list of committed fixture project roots only. Labelore's own planning tree has been untracked
// since a6859d3 and is never a test input. Tests that must hold on every committed fixture project (the
// walk-equals-model check, grammar audits) iterate this list instead of each naming its own roots. Importing it throws when a listed root has no .planning
// folder: a missing fixture is a failure, never a skip.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT: string = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');

const RELATIVE_ROOTS = [
  'test/fixtures/shapes',
  'test/fixtures/lendshed',
  'test/fixtures/tidemark',
  'test/fixtures/brinkwater',
  'fixtures/dense',
  'fixtures/sparse-empty',
  'fixtures/sparse-started',
  'test/fixtures/dashboard/ledger',
  'test/fixtures/dashboard/synthetic',
  'test/fixtures/todos/labelore',
];

/** Absolute roots (no trailing slash) of every committed fixture project, and nothing else. */
export const ALL_FIXTURE_ROOTS: readonly string[] = [...RELATIVE_ROOTS.map((root) => join(REPO_ROOT, root))];

for (const root of ALL_FIXTURE_ROOTS) {
  if (!existsSync(join(root, '.planning'))) {
    throw new Error(`Fixture root ${root} has no .planning folder; tests never skip a missing fixture.`);
  }
}
