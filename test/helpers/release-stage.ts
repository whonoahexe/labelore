// Builds a real release stage for the release tests, in a temp dir, by running the release script's
// --stage-only path the way a maintainer would. Nothing here reads the real home directory or any
// real project, a failed build throws with its output instead of returning, and the helper registers
// nothing global: callers remove the directories they get.
import { execFileSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, makeTempDir } from './server-bundle.ts';

/** Builds a stage into a fresh temp dir with `release.mjs --stage-only --dir` and returns the dir. */
export function buildStage(): string {
  const dir = makeTempDir('labelore-stage');
  try {
    execFileSync(process.execPath, [join(REPO_ROOT, 'scripts/release.mjs'), '--stage-only', '--dir', dir], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const failure = error as { stdout?: Buffer; stderr?: Buffer; message: string };
    throw new Error(`release.mjs --stage-only failed: ${failure.message}\n${failure.stdout}\n${failure.stderr}`, { cause: error });
  }
  return dir;
}

/** Copies a stage into a new temp dir (links stay links), for planted variants. */
export function copyStage(src: string): string {
  const dir = makeTempDir('labelore-stage-copy');
  cpSync(src, dir, { recursive: true, verbatimSymlinks: true });
  return dir;
}
