// A Labelore server on several project paths for the browser specs that need more than one project
// (the switcher, the add dialog, the scan). It is the several-project sibling of fixture-server.ts: it
// spawns the real CLI on the given paths, always with a settings directory of its own (so no run reads
// or writes the user's real settings file, D-09) and optionally a seeded settings.json and extra
// environment such as HOME. The port is the first free one in 5320-5329 (a bind probe on 127.0.0.1);
// 4173-4174 and 4195-4199 (the user's instances and the Playwright config) and 5310-5319 (the fixture
// server) are never used. The child is stopped by `stop()` (SIGTERM, then SIGKILL after 3 s) and by a
// process exit hook, so no server outlives the run. This is a helper, not a spec: it is imported,
// never collected.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forgetPresentation } from './app-url.ts';

const REPO = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');
const FIRST_PORT = 5320;
const LAST_PORT = 5329;

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
  throw new Error(`projects-server: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

export interface ProjectsServerOptions {
  /** The project paths the server starts with, in order (the CLI's positional arguments). */
  paths: string[];
  /** Written as the server's settings.json before it starts: an object (serialised) or the raw text. */
  settings?: unknown;
  /** Extra environment for the server process, such as HOME. */
  env?: Record<string, string>;
}

export interface ProjectsServer {
  base: string;
  /** The server's own settings directory (LABELORE_CONFIG_DIR); removed by `stop()`. */
  configDir: string;
  stop(): Promise<void>;
}

export async function startProjectsServer(options: ProjectsServerOptions): Promise<ProjectsServer> {
  const port = await firstFreePort();
  const base = `http://127.0.0.1:${port}`;
  // A payload cached for this port by an earlier server must not be read.
  forgetPresentation(base);
  const configDir = mkdtempSync(join(tmpdir(), 'projects-server-config-'));
  if (options.settings !== undefined) {
    const text = typeof options.settings === 'string' ? options.settings : JSON.stringify(options.settings, null, 2);
    writeFileSync(join(configDir, 'settings.json'), text);
  }

  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) if (value !== undefined) env[name] = value;
  Object.assign(env, options.env ?? {});
  env.LABELORE_CONFIG_DIR = configDir;

  const child: ChildProcess = spawn(
    process.execPath,
    ['src/server/index.ts', ...options.paths, '--port', String(port)],
    { cwd: REPO, stdio: 'ignore', env },
  );
  const removeConfigDir = (): void => rmSync(configDir, { recursive: true, force: true });
  const kill = (): void => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    removeConfigDir();
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
    forgetPresentation(base);
    removeConfigDir();
  };

  const deadline = Date.now() + 60_000;
  let ready = false;
  while (Date.now() < deadline && !ready) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${base}/api/projects`);
      ready = response.status === 200;
    } catch {
      /* not listening yet */
    }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) {
    await stop();
    throw new Error('projects-server: the server did not become ready');
  }
  return { base, configDir, stop };
}
