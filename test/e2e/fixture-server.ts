// One shared helper replacing the four per-family fixture servers (debug, learnings, note, todo). It starts
// its own read-only Labelore server and returns its base URL. With no placements the server runs directly
// on the in-repo Lendshed fixture (resolveFixtureRoot throws when that tree is missing) and nothing is
// copied. With placements, each requested file is copied into a fresh mkdtemp project; every requested file
// must exist and must resolve inside the repository, so there is no list of optional sources and no route
// to another project on this machine (D-05). The port is the first free one in 5310-5319 (a bind probe on
// 127.0.0.1); 4173, 4174, 4198 and 4199 are never used (4173 and 4174 belong to the user's running
// instances, 4198 and 4199 to the Playwright config). The child is stopped by `stop()` (SIGTERM, then
// SIGKILL after 3 s) and by a process exit hook, so no server outlives the run. This is a helper, not a
// spec: it is imported, never collected. The four old servers stay until their family plans delete them.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFixtureRoot } from './fixture-root.ts';

const REPO = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');
const FIRST_PORT = 5310;
const LAST_PORT = 5319;

function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

async function firstFreePort(): Promise<number> {
  for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
    if (await portIsFree(port)) return port;
  }
  throw new Error(`fixture-server: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

export interface FixturePlacement {
  /** Repo-relative source file. */
  from: string;
  /** Project-relative target, such as `.planning/debug/x.md`. */
  to: string;
}

export interface FixtureServer {
  base: string;
  root: string;
  stop(): Promise<void>;
}

function insideRepo(abs: string): boolean {
  return abs === REPO || abs.startsWith(REPO + sep);
}

export async function startFixtureServer(placements?: FixturePlacement[]): Promise<FixtureServer> {
  let root: string;
  let tempDir: string | undefined;
  if (placements === undefined) {
    root = resolveFixtureRoot();
  } else {
    // Validate every placement before creating anything on disk.
    const resolved = placements.map((placement) => {
      const source = resolve(REPO, placement.from);
      if (!insideRepo(source)) {
        throw new Error(`fixture-server: ${placement.from} resolves outside the repository (${source})`);
      }
      if (!existsSync(source)) throw new Error(`fixture-server: placement source is missing: ${placement.from}`);
      const real = realpathSync(source);
      if (!insideRepo(real)) {
        throw new Error(`fixture-server: ${placement.from} resolves outside the repository (${real})`);
      }
      return { source: real, to: placement.to };
    });
    tempDir = mkdtempSync(join(tmpdir(), 'fixture-server-'));
    root = tempDir;
    for (const { source, to } of resolved) {
      const target = resolve(tempDir, to);
      if (target !== tempDir && !target.startsWith(tempDir + sep)) {
        rmSync(tempDir, { recursive: true, force: true });
        throw new Error(`fixture-server: ${to} resolves outside the temporary project`);
      }
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }

  const port = await firstFreePort();
  const base = `http://127.0.0.1:${port}`;
  const child: ChildProcess = spawn('node', ['src/server/index.ts', root, '--port', String(port)], {
    cwd: REPO,
    stdio: 'ignore',
  });
  const kill = (): void => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  };
  process.once('exit', kill);

  const stop = async (): Promise<void> => {
    process.removeListener('exit', kill);
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
      child.kill('SIGTERM');
      const timer = setTimeout(kill, 3000);
      await exited;
      clearTimeout(timer);
    }
    if (tempDir !== undefined) rmSync(tempDir, { recursive: true, force: true });
  };

  const deadline = Date.now() + 90_000;
  let ready = false;
  while (Date.now() < deadline && !ready) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${base}/api/dashboard`);
      ready = response.ok;
    } catch {
      /* not listening yet */
    }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) {
    await stop();
    throw new Error('fixture-server: the server did not become ready');
  }
  return { base, root, stop };
}
