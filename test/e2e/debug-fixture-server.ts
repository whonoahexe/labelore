// A read-only fixture server for the DEBUG page e2e (quick-261018-j5h). It starts its own server on a
// thin temp project holding the synthetic investigating session, labelore's own resolved session and
// knowledge base, and a copy of each sibling sketch session that exists on this machine (the sibling
// projects are only read, never touched). The port is
// the first free one in 5310-5319 (a bind probe on 127.0.0.1); 4173 / 4174 belong to the user's
// running instances and 4198 / 4199 to the Playwright config, so none of them is ever touched. The
// child is stopped by `stop()` (SIGTERM, then SIGKILL after 3 s) and by a process exit hook, so no
// server outlives the run. This is a helper, not a spec: it is imported, never collected.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SKETCH_FILES } from '../helpers/debug-corpus.ts';

const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
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
  throw new Error(`debug-fixture-server: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

export interface DebugFixtureServer {
  base: string;
  dir: string;
  /** The sketch keys (dd, sa, rs, sr) whose sibling file was found and copied. */
  placed: string[];
  stop: () => Promise<void>;
}

export async function startDebugFixtureServer(): Promise<DebugFixtureServer> {
  const dir = mkdtempSync(join(tmpdir(), 'debug-fixture-'));
  const copy = (from: string, to: string): void => {
    const target = join(dir, to);
    mkdirSync(join(target, '..'), { recursive: true });
    copyFileSync(from, target);
  };
  const put = (from: string, to: string): void => copy(join(REPO, from), to);
  put('test/fixtures/debug/search-index-goes-stale.md', '.planning/debug/search-index-goes-stale.md');
  put('.planning/debug/resolved/loading-state-regression.md', '.planning/debug/resolved/loading-state-regression.md');
  put('.planning/debug/knowledge-base.md', '.planning/debug/knowledge-base.md');
  const placed: string[] = [];
  for (const [key, file] of Object.entries(SKETCH_FILES)) {
    if (!existsSync(file)) continue;
    const name = file.slice(file.lastIndexOf('/') + 1);
    copy(file, key === 'rs' ? `.planning/debug/resolved/${name}` : `.planning/debug/${name}`);
    placed.push(key);
  }

  const port = await firstFreePort();
  const base = `http://127.0.0.1:${port}`;
  const child: ChildProcess = spawn('node', ['src/server/index.ts', dir, '--port', String(port)], {
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
    rmSync(dir, { recursive: true, force: true });
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
    throw new Error('debug-fixture-server: the server did not become ready');
  }
  return { base, dir, placed, stop };
}
