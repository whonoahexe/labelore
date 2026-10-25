// The zero-failure, zero-skip, zero-todo gate over vitest's JSON report (TEST-01, Pitfall 14): a green run
// that quietly skipped, left a todo behind or collected nothing proves nothing, so this exits 1 for any of
// them. Plain Node ESM with no dependencies. It spawns the local vitest binary directly (not npx) so it also
// runs under a swapped HOME. Usage: `npm run test:gate -- <optional test files>`.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const vitestBin = join(repoRoot, 'node_modules', '.bin', 'vitest');
const scratch = mkdtempSync(join(tmpdir(), 'labelore-vitest-gate-'));
const reportPath = join(scratch, 'report.json');

const child = spawn(
  vitestBin,
  ['run', '--reporter=default', '--reporter=json', `--outputFile.json=${reportPath}`, ...process.argv.slice(2)],
  { cwd: repoRoot, stdio: 'inherit' },
);

child.on('error', (error) => {
  console.error(`gate: could not start vitest: ${error.message}`);
  rmSync(scratch, { recursive: true, force: true });
  process.exit(1);
});

child.on('exit', (code) => {
  let verdict = 1;
  if (!existsSync(reportPath)) {
    console.error('gate: vitest wrote no report (nothing ran or it crashed), so the gate fails');
  } else {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const total = report.numTotalTests ?? 0;
    const passed = report.numPassedTests ?? 0;
    const failed = report.numFailedTests ?? 0;
    const skipped = report.numPendingTests ?? 0;
    const todo = report.numTodoTests ?? 0;
    console.log(`gate: total=${total} passed=${passed} failed=${failed} skipped=${skipped} todo=${todo}`);
    if (total === 0) console.error('gate: zero tests ran, so the gate fails');
    else if (failed > 0 || skipped > 0 || todo > 0) console.error('gate: a failed, skipped or todo test fails the gate');
    else if (code !== 0) console.error(`gate: vitest exited ${code} with no failing test (unhandled error?), so the gate fails`);
    else verdict = 0;
  }
  rmSync(scratch, { recursive: true, force: true });
  process.exit(verdict);
});
