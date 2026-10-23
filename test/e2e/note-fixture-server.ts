// A read-only fixture server for the NOTE page e2e and the side-by-side capture (quick-261023-61l). It
// starts its own server on a thin temp project holding the notes and todos of the committed fixture
// project, of the dashboard's synthetic fixture and of this repo's own `.planning/` (all at the same
// relative paths; none collide). The port is the first free one in 5310-5319 (a bind probe on 127.0.0.1);
// 4173 / 4174 belong to the user's running instances and 4198 / 4199 to the Playwright config, so none of
// them is ever touched. The child is stopped by `stop()` (SIGTERM, then SIGKILL after 3 s) and by a
// process exit hook, so no server outlives the run. This is a helper, not a spec: it is imported, never
// collected.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LB_ROOT, NOTES_FIXTURE_ROOT, SYNTHETIC_ROOT } from '../helpers/note-corpus.ts';

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
  throw new Error(`note-fixture-server: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

export interface NoteFixtureServer {
  base: string;
  dir: string;
  stop: () => Promise<void>;
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...filesUnder(abs));
    else out.push(abs);
  }
  return out;
}

export async function startNoteFixtureServer(): Promise<NoteFixtureServer> {
  const dir = mkdtempSync(join(tmpdir(), 'note-fixture-'));
  // A root's notes and todos keep their path under `.planning/`.
  for (const root of [NOTES_FIXTURE_ROOT, SYNTHETIC_ROOT, LB_ROOT]) {
    for (const sub of ['notes', 'todos']) {
      for (const abs of filesUnder(join(root, '.planning', sub))) {
        const target = join(dir, abs.slice(root.length + 1));
        mkdirSync(join(target, '..'), { recursive: true });
        copyFileSync(abs, target);
      }
    }
  }

  const port = await firstFreePort();
  const base = `http://127.0.0.1:${port}`;
  const child: ChildProcess = spawn('node', ['src/server/index.ts', dir, '--port', String(port)], {
    cwd: LB_ROOT,
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
    throw new Error('note-fixture-server: the server did not become ready');
  }
  return { base, dir, stop };
}
