// A read-only fixture server for the LEARNINGS page e2e (quick-261017-k45). Labelore's own `.planning`
// holds no LEARNINGS file, so this starts its own server on a thin temp project holding the
// synthetic phase 5 file, the studio-portal phase 1 file and the dense project-root file. The port is
// the first free one in 5310-5319 (a bind probe on 127.0.0.1); 4173 / 4174 belong to the user's
// running instances and 4198 / 4199 to the Playwright config, so none of them is ever touched. The
// child is stopped by `stop()` (SIGTERM, then SIGKILL after 3 s) and by a process exit hook, so no
// server outlives the run. This is a helper, not a spec: it is imported, never collected.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  throw new Error(`learnings-fixture-server: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

export interface LearningsFixtureServer {
  base: string;
  dir: string;
  stop: () => Promise<void>;
}

export async function startLearningsFixtureServer(): Promise<LearningsFixtureServer> {
  const dir = mkdtempSync(join(tmpdir(), 'learnings-fixture-'));
  const put = (from: string, to: string): void => {
    const target = join(dir, to);
    mkdirSync(join(target, '..'), { recursive: true });
    copyFileSync(join(REPO, from), target);
  };
  put('test/fixtures/learnings/synthetic-LEARNINGS.md', '.planning/phases/05-per-type-document-views/05-LEARNINGS.md');
  put('test/fixtures/learnings/sp01-LEARNINGS.md', '.planning/phases/01-portal-owned-identity-sessions/01-LEARNINGS.md');
  put('fixtures/dense/.planning/LEARNINGS.md', '.planning/LEARNINGS.md');

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
    throw new Error('learnings-fixture-server: the server did not become ready');
  }
  return { base, dir, stop };
}
