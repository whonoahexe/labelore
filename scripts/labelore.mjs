#!/usr/bin/env node
/**
 * Labelore launcher: the command line behind the /gsd-labelore skill.
 *
 *   node labelore.mjs open [phase]   start (or reuse) Labelore on the current GSD project
 *   node labelore.mjs stop           stop the server this launcher started
 *
 * The launcher is read-only towards the project it opens: its only writes are its own state
 * directory and, on first launch, the bundle's own node_modules/ and dist/. It never touches the
 * target's .planning/. It talks only to a Labelore it started itself (pid and port in its own state
 * file, both checked live), never to a hand-run or service-run instance.
 *
 * It uses Node builtins only (plus the global fetch) because it runs before node_modules/ exists.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAUNCHER = fileURLToPath(import.meta.url);
const BUNDLE_DIR = resolve(dirname(LAUNCHER), '..');

function stateDir() {
  const explicit = process.env.LABELORE_STATE_DIR;
  if (explicit) return explicit;
  const xdg = process.env.XDG_STATE_HOME;
  const base = xdg && isAbsolute(xdg) ? xdg : join(homedir(), '.local', 'state');
  return join(base, 'labelore');
}

function ensureStateDir() {
  const dir = stateDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function serverConfigDir() {
  const explicit = process.env.LABELORE_CONFIG_DIR;
  return explicit ? explicit : join(stateDir(), 'config');
}

function note(message) {
  process.stderr.write(`${message}\n`);
}

function fail(message, code = 1) {
  note(message);
  process.exit(code);
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** The nearest directory at or above the start that holds a .planning/ directory, or null. */
function findProjectRoot(start) {
  let current = resolve(start);
  for (;;) {
    if (isDirectory(join(current, '.planning'))) return realpathSync(current);
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function startPoint() {
  const fromEnv = process.env.CLAUDE_PROJECT_DIR;
  return fromEnv ? fromEnv : process.cwd();
}

function requireNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 18)) {
    fail(`Labelore needs Node.js 22.18.0 or newer (found v${process.versions.node}).`);
  }
}

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(join(stateDir(), 'server.json'), 'utf8'));
    const { pid, port } = parsed ?? {};
    if (!Number.isInteger(pid) || pid <= 0) return null;
    if (!Number.isInteger(port) || port <= 0 || port >= 65536) return null;
    return { pid, port };
  } catch {
    return null;
  }
}

/** The server this launcher started, only when its pid is alive and its port answers the Labelore API. */
async function ownServer() {
  const state = readState();
  if (!state) return null;
  try {
    process.kill(state.pid, 0);
    const base = `http://127.0.0.1:${state.port}`;
    const response = await fetch(`${base}/api/projects`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    const body = await response.json();
    if (!body || !Array.isArray(body.projects)) return null;
    return { pid: state.pid, port: state.port, base, projects: body.projects };
  } catch {
    return null;
  }
}

function tail(path, lines) {
  try {
    return readFileSync(path, 'utf8').split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
}

function runNpm(args, message, logPath, fd) {
  note(message);
  const result = spawnSync('npm', args, {
    cwd: BUNDLE_DIR,
    stdio: ['ignore', fd, fd],
    timeout: 600000,
  });
  if (result.error || result.status !== 0) {
    note(tail(logPath, 30));
    fail(`labelore: ${args.join(' ')} failed (log: ${logPath})`);
  }
}

/** First launch: install dependencies and build the dashboard inside the bundle when they are missing. */
function ensureBuilt() {
  const needInstall = !existsSync(join(BUNDLE_DIR, 'node_modules'));
  const needBuild = !existsSync(join(BUNDLE_DIR, 'dist', 'index.html'));
  if (!needInstall && !needBuild) return;
  const logPath = join(ensureStateDir(), 'build.log');
  const fd = openSync(logPath, 'w');
  try {
    if (needInstall) {
      runNpm(
        ['ci', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund'],
        'labelore: first launch — installing dependencies (npm ci), this takes a few minutes',
        logPath,
        fd,
      );
    }
    if (needBuild) {
      runNpm(['run', 'build'], 'labelore: building the dashboard (vite build)', logPath, fd);
    }
  } finally {
    closeSync(fd);
  }
}

const OPEN_LINE = /^Open (http:\/\/127\.0\.0\.1:(\d+))\s*$/m;

async function startServer(root) {
  const dir = ensureStateDir();
  const logPath = join(dir, 'server.log');
  const fd = openSync(logPath, 'w');
  const child = spawn(process.execPath, ['src/server/index.ts', root], {
    cwd: BUNDLE_DIR,
    detached: true,
    stdio: ['ignore', fd, fd],
    env: { ...process.env, NODE_ENV: 'production', LABELORE_CONFIG_DIR: serverConfigDir() },
  });
  closeSync(fd);
  let exited = false;
  child.on('exit', () => {
    exited = true;
  });
  child.unref();
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const match = OPEN_LINE.exec(readFileSync(logPath, 'utf8'));
    if (match) {
      const port = Number(match[2]);
      writeFileSync(
        join(dir, 'server.json'),
        `${JSON.stringify({ pid: child.pid, port, startedAt: new Date().toISOString() })}\n`,
      );
      note(
        `labelore: started Labelore (pid ${child.pid}, port ${port}); log ${logPath}; stop it with: node "${LAUNCHER}" stop`,
      );
      return { pid: child.pid, port, base: match[1] };
    }
    if (exited) break;
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!exited) child.kill('SIGTERM');
  note(tail(logPath, 20));
  return fail(`labelore: Labelore did not start (log: ${logPath})`);
}

function dashboardUrl(base, slug) {
  return `${base}/${encodeURIComponent(slug)}/`;
}

async function open() {
  requireNode();
  const start = startPoint();
  const root = findProjectRoot(start);
  if (!root) fail(`labelore: no .planning/ directory at or above ${start}`);

  const own = await ownServer();
  if (own) {
    const known = own.projects.find((project) => project.target === root);
    if (known) {
      process.stdout.write(`Labelore URL: ${dashboardUrl(own.base, known.slug)}\n`);
      return;
    }
    fail(
      `labelore: Labelore started earlier is running on port ${own.port} without this project; run node "${LAUNCHER}" stop, then open again`,
    );
  }

  ensureBuilt();
  const started = await startServer(root);
  const response = await fetch(`${started.base}/api/projects`, {
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  const known = body.projects.find((project) => project.target === root);
  process.stdout.write(
    `Labelore URL: ${known ? dashboardUrl(started.base, known.slug) : `${started.base}/`}\n`,
  );
}

async function stop() {
  const own = await ownServer();
  if (own) {
    process.kill(own.pid, 'SIGTERM');
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        process.kill(own.pid, 0);
      } catch {
        break;
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    rmSync(join(stateDir(), 'server.json'), { force: true });
    process.stdout.write(`labelore: stopped Labelore (pid ${own.pid}, port ${own.port})\n`);
    return;
  }
  rmSync(join(stateDir(), 'server.json'), { force: true });
  process.stdout.write('labelore: not running\n');
}

const [command] = process.argv.slice(2);
if (command === 'open') {
  await open();
} else if (command === 'stop') {
  await stop();
} else {
  fail('usage: labelore.mjs open [phase] | stop', 2);
}
