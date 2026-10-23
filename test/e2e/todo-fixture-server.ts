// A read-only fixture server for the TODO page e2e and the side-by-side capture (quick-261023-61k). It
// starts its own server on a thin temp project holding the todos and notes of the three committed fixture
// projects and of the dashboard's synthetic fixture, labelore's own promoted todo (001) and its note when
// present, the chrome-drift todo's closing quick task SUMMARY at its real relative path (so that quick
// task's link resolves), and resoundant's todos and note when they exist (the sibling project is only
// read, never touched). The port is the first free one in 5310-5319 (a bind probe on 127.0.0.1); 4173 /
// 4174 belong to the user's running instances and 4198 / 4199 to the Playwright config, so none of them is
// ever touched. The child is stopped by `stop()` (SIGTERM, then SIGKILL after 3 s) and by a process exit
// hook, so no server outlives the run. This is a helper, not a spec: it is imported, never collected.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LABELORE_FIXTURE_ROOT, DUET_ROOT, PORTAL_ROOT, RESOUNDANT_ROOT, SYNTHETIC_ROOT } from '../helpers/todo-corpus.ts';

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
  throw new Error(`todo-fixture-server: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

export interface TodoFixtureServer {
  base: string;
  dir: string;
  /** The optional sources (labelore-001, resoundant) whose files were found and copied. */
  placed: string[];
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

export async function startTodoFixtureServer(): Promise<TodoFixtureServer> {
  const dir = mkdtempSync(join(tmpdir(), 'todo-fixture-'));
  const copy = (from: string, to: string): void => {
    const target = join(dir, to);
    mkdirSync(join(target, '..'), { recursive: true });
    copyFileSync(from, target);
  };
  // A root's todos and notes keep their path under `.planning/`.
  const copyTree = (root: string): void => {
    for (const sub of ['todos', 'notes']) {
      for (const abs of filesUnder(join(root, '.planning', sub))) copy(abs, abs.slice(root.length + 1));
    }
  };
  for (const root of [DUET_ROOT, PORTAL_ROOT, LABELORE_FIXTURE_ROOT, SYNTHETIC_ROOT]) copyTree(root);
  const placed: string[] = [];
  const live001 = join(REPO, '.planning/todos/pending/001-sketches-page-in-labelore.md');
  const live001Note = join(REPO, '.planning/notes/2026-10-23-sketches-page-in-labelore.md');
  if (existsSync(live001) && existsSync(live001Note)) {
    copy(live001, '.planning/todos/pending/001-sketches-page-in-labelore.md');
    copy(live001Note, '.planning/notes/2026-10-23-sketches-page-in-labelore.md');
    placed.push('labelore-001');
  }
  const summary = '.planning/milestones/v1.1-quick/260920-mzr-fix-document-page-chrome-drift-and-the-l/260920-mzr-SUMMARY.md';
  if (existsSync(join(REPO, summary))) copy(join(REPO, summary), summary);
  if (existsSync(join(RESOUNDANT_ROOT, '.planning/todos'))) {
    copyTree(RESOUNDANT_ROOT);
    placed.push('resoundant');
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
    throw new Error('todo-fixture-server: the server did not become ready');
  }
  return { base, dir, placed, stop };
}
