// Builds and runs the server bundle (release/server/labelore-server.mjs) in isolated temp directories,
// the way an installed launcher would: a cwd of its own, a clean environment, nothing from the repo on
// the module path. Nothing here looks at the real home directory or any real project, a missing file
// throws instead of returning early, and the helper registers nothing global; callers stop what they start.
import { execFileSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root: where the vite binary and the build configs live. */
export const REPO_ROOT: string = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');

const OPEN_LINE = /^Open (http:\/\/127\.0\.0\.1:(\d+))\s*$/m;
const KILL_GRACE_MS = 3_000;

/** A fresh directory under the temp dir (which honours TMPDIR). */
export function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

function viteBuild(args: string[]): void {
  try {
    execFileSync(process.execPath, [join(REPO_ROOT, 'node_modules/vite/bin/vite.js'), 'build', ...args], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const failure = error as { stdout?: Buffer; stderr?: Buffer; message: string };
    throw new Error(`vite build ${args.join(' ')} failed: ${failure.message}\n${failure.stdout}\n${failure.stderr}`, { cause: error });
  }
}

/** Builds the server bundle into `outDir` and returns the path of labelore-server.mjs. */
export function buildServerBundle(outDir: string): string {
  viteBuild(['-c', 'vite.server.config.ts', '--outDir', outDir, '--emptyOutDir']);
  return join(outDir, 'labelore-server.mjs');
}

/** Builds the web app into `outDir` (the dist a launcher would point the server at). */
export function buildWebDist(outDir: string): string {
  viteBuild(['--outDir', outDir, '--emptyOutDir']);
  return outDir;
}

/** Writes a minimal dist (an index.html only), for tests that need the API and not the web app. */
export function stubDist(dir: string): string {
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>stub</title>\n');
  return dir;
}

/**
 * The only environment a bundle test passes on: PATH, a fresh HOME and settings directory, TMPDIR when the
 * parent has one, and what the caller adds. Nothing else leaks in from the parent process.
 */
export function cleanEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: makeTempDir('labelore-home'),
    LABELORE_CONFIG_DIR: makeTempDir('labelore-config'),
  };
  if (process.env.TMPDIR) env.TMPDIR = process.env.TMPDIR;
  return { ...env, ...extra };
}

export interface StartedBundle {
  child: ChildProcess;
  port: number;
  base: string;
  /** Everything the child has written so far, stdout then stderr. */
  output(): string;
}

export interface BundleRun {
  bundle: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs?: number;
}

/** Spawns the bundle and resolves once it prints its `Open http://127.0.0.1:<port>` line. */
export function startBundle(run: BundleRun): Promise<StartedBundle> {
  const { bundle, args, cwd, env, timeoutMs = 30_000 } = run;
  const child = spawn(process.execPath, [bundle, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`the bundle printed no Open line within ${timeoutMs} ms\n${stdout}${stderr}`));
    }, timeoutMs);
    const settle = (): void => clearTimeout(timer);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const match = OPEN_LINE.exec(stdout);
      if (match) {
        settle();
        resolvePromise({
          child,
          port: Number(match[2]),
          base: match[1],
          output: () => stdout + stderr,
        });
      }
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('exit', (code, signal) => {
      settle();
      reject(new Error(`the bundle exited (code ${code}, signal ${signal}) before its Open line\n${stdout}${stderr}`));
    });
    child.once('error', (error) => {
      settle();
      reject(error);
    });
  });
}

/** Stops a started bundle: SIGTERM, then SIGKILL after a short grace. Resolves once it has exited. */
export function stopBundle(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolvePromise) => {
    const hard = setTimeout(() => child.kill('SIGKILL'), KILL_GRACE_MS);
    child.once('exit', () => {
      clearTimeout(hard);
      resolvePromise();
    });
    child.kill('SIGTERM');
  });
}

export interface BundleExit {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

/** Runs the bundle until it exits on its own (a bad flag, a missing dist) and returns how it ended. */
export function runBundleToExit(run: Omit<BundleRun, 'timeoutMs'>): Promise<BundleExit> {
  const child = spawn(process.execPath, [run.bundle, ...run.args], {
    cwd: run.cwd,
    env: run.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  return new Promise((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolvePromise({ code, signal, stdout, stderr }));
  });
}
