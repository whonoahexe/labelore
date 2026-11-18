#!/usr/bin/env node
/**
 * Labelore launcher: the command line behind the /gsd-labelore skill.
 *
 *   node labelore.mjs open [phase]   start (or reuse) Labelore on the current GSD project
 *   node labelore.mjs link [phase]   print the dashboard link (read-only; what the ship:post step runs)
 *   node labelore.mjs stop           stop the server this launcher started
 *
 * The launcher is read-only towards the project it opens: its only writes are its own state
 * directory. It never writes under its own bundle directory (gsd's consent binds a hash of the
 * installed tree) and never touches the target's .planning/. It runs the prebuilt
 * server/labelore-server.mjs that ships in a release; there is no build path. It trusts and signals
 * only a server whose GET /api/identity answer matches the instanceId and pid it recorded at spawn,
 * never a hand-run or service-run instance.
 *
 * It uses Node builtins only (plus the global fetch) because a release ships no node_modules.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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

const INSTANCE_ID_SHAPE = /^[A-Za-z0-9-]{1,64}$/;
const VERSION_MAX = 64;

const isVersion = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= VERSION_MAX;

/** This launcher's own version: the version in the capability.json beside scripts/. */
function ownVersion() {
  const path = join(BUNDLE_DIR, 'capability.json');
  try {
    const { version } = JSON.parse(readFileSync(path, 'utf8')) ?? {};
    if (isVersion(version)) return version;
  } catch {
    // fall through to the failure below
  }
  return fail(
    `labelore: ${path} is missing or has no usable version, so this copy is not a valid install.`,
  );
}

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(join(stateDir(), 'server.json'), 'utf8'));
    const { pid, port, instanceId, version } = parsed ?? {};
    if (!Number.isInteger(pid) || pid <= 0) return null;
    if (!Number.isInteger(port) || port <= 0 || port >= 65536) return null;
    return {
      pid,
      port,
      instanceId:
        typeof instanceId === 'string' && INSTANCE_ID_SHAPE.test(instanceId) ? instanceId : null,
      version: isVersion(version) ? version : null,
    };
  } catch {
    return null;
  }
}

/** True while a process with this pid exists. Signal 0 delivers nothing. */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

/**
 * Asks the recorded port who it is. A match needs app labelore, the recorded instanceId and the
 * recorded pid. Never signals anything.
 */
async function handshake(state) {
  if (state.instanceId === null) return { kind: 'legacy' };
  try {
    const response = await fetch(`http://127.0.0.1:${state.port}/api/identity`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return { kind: 'stale', reason: `HTTP ${response.status}` };
    const body = await response.json();
    if (!body || body.app !== 'labelore') return { kind: 'stale', reason: 'not a Labelore server' };
    if (body.instanceId !== state.instanceId) return { kind: 'stale', reason: 'another instance' };
    if (body.pid !== state.pid) return { kind: 'stale', reason: 'another pid' };
    if (!isVersion(body.version)) return { kind: 'stale', reason: 'no usable version' };
    return { kind: 'match', version: body.version };
  } catch (error) {
    return { kind: 'stale', reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The recorded server and what the handshake made of it. `server` is set only for a match (the
 * recorded server, with the project list it serves) and is the only thing a caller may signal.
 */
async function ownServer() {
  const state = readState();
  if (!state) return { state: null, verdict: { kind: 'none' }, server: null };
  const verdict = await handshake(state);
  if (verdict.kind !== 'match') return { state, verdict, server: null };
  const base = `http://127.0.0.1:${state.port}`;
  let projects = [];
  try {
    const response = await fetch(`${base}/api/projects`, { signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      const body = await response.json();
      if (body && Array.isArray(body.projects)) projects = body.projects;
    }
  } catch {
    // an unreadable project list leaves the match in place; open adds the project itself
  }
  return {
    state,
    verdict,
    server: { pid: state.pid, port: state.port, base, projects, version: verdict.version },
  };
}

function tail(path, lines) {
  try {
    return readFileSync(path, 'utf8').split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
}

/** Polls signal 0 every 100 ms until the pid is gone or the time is up. Returns whether it is gone. */
async function waitForExit(pid, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise((done) => setTimeout(done, 100));
  }
  return !isAlive(pid);
}

const OPEN_LINE = /^Open (http:\/\/127\.0\.0\.1:(\d+))\s*$/m;

async function startServer(root) {
  const bundle = join(BUNDLE_DIR, 'server', 'labelore-server.mjs');
  if (!existsSync(bundle)) {
    fail(
      `labelore: ${bundle} is missing. This copy of Labelore is not a release build, so it cannot start a server. Install a release with gsd capability install.`,
    );
  }
  const version = ownVersion();
  const dir = ensureStateDir();
  const logPath = join(dir, 'server.log');
  const instanceId = randomUUID();
  const fd = openSync(logPath, 'w');
  const child = spawn(process.execPath, [bundle, root], {
    cwd: BUNDLE_DIR,
    detached: true,
    stdio: ['ignore', fd, fd],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      LABELORE_CONFIG_DIR: serverConfigDir(),
      LABELORE_DIST_DIR: join(BUNDLE_DIR, 'dist'),
      LABELORE_INSTANCE_ID: instanceId,
    },
  });
  closeSync(fd);
  let ended = null;
  child.on('exit', (code, signal) => {
    ended = { code, signal };
  });
  child.on('error', () => {
    ended = { code: null, signal: null };
  });
  child.unref();
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const match = OPEN_LINE.exec(readFileSync(logPath, 'utf8'));
    if (match) {
      const port = Number(match[2]);
      writeFileSync(
        join(dir, 'server.json'),
        `${JSON.stringify({ pid: child.pid, port, instanceId, version, startedAt: new Date().toISOString() })}\n`,
      );
      note(
        `labelore: started Labelore (pid ${child.pid}, port ${port}); log ${logPath}; stop it with: node "${LAUNCHER}" stop`,
      );
      return { pid: child.pid, port, base: match[1] };
    }
    if (ended) break;
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ended) {
    // The child this launcher just spawned, and nothing else.
    child.kill('SIGTERM');
    note(tail(logPath, 20));
    return fail(`labelore: Labelore did not print its address within 30 s (log: ${logPath})`);
  }
  const how = `exit code ${ended.code}, signal ${ended.signal ?? 'none'}`;
  if (readFileSync(logPath, 'utf8').trim() === '') {
    return fail(
      `labelore: the Labelore server exited (${how}) before printing its address, with no output (log: ${logPath})`,
    );
  }
  note(tail(logPath, 20));
  return fail(`labelore: Labelore did not start: the server exited (${how}) (log: ${logPath})`);
}

function dashboardUrl(base, slug) {
  return `${base}/${encodeURIComponent(slug)}/`;
}

const normPhase = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/^0+(?=\d)/, '');

/** The deep link for a phase, or the project dashboard when the phase is not in the roadmap. */
async function phaseUrl(base, slug, phase) {
  const dashboard = dashboardUrl(base, slug);
  if (phase === undefined || phase === '') return dashboard;
  try {
    const response = await fetch(`${base}/api/projects/${encodeURIComponent(slug)}/roadmap`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return dashboard;
    const roadmap = await response.json();
    const flows = [roadmap.active, ...(Array.isArray(roadmap.history) ? roadmap.history : [])];
    const rows = flows.flatMap((flow) => (flow && Array.isArray(flow.phases) ? flow.phases : []));
    const wanted = normPhase(phase);
    const row = rows.find((candidate) => normPhase(candidate.number) === wanted);
    return row && typeof row.url === 'string'
      ? `${base}/${encodeURIComponent(slug)}${row.url}`
      : dashboard;
  } catch {
    return dashboard;
  }
}

/** Adds the project to the launcher's own running server. Never talks to any other Labelore. */
async function addProject(own, root) {
  const response = await fetch(`${own.base}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: own.base },
    body: JSON.stringify({ target: root }),
    signal: AbortSignal.timeout(10000),
  });
  let answer;
  try {
    answer = await response.json();
  } catch {
    answer = null;
  }
  if (
    (response.status === 200 || response.status === 201) &&
    answer &&
    typeof answer.slug === 'string'
  ) {
    return answer.slug;
  }
  const reason =
    answer && typeof answer.error === 'string' ? answer.error : `HTTP ${response.status}`;
  return fail(`labelore: Labelore refused this project: ${reason}`);
}

/** Stderr note for a v2.1 server with no identity check that is still running. Never signals it. */
function noteLegacy(state) {
  if (!isAlive(state.pid)) return;
  note(
    `labelore: a Labelore server from an older version may still be running (pid ${state.pid}, port ${state.port}); it has no identity check, so it was not stopped. Stop it by hand if you no longer need it.`,
  );
}

async function open(phase) {
  requireNode();
  const start = startPoint();
  const root = findProjectRoot(start);
  if (!root) fail(`labelore: no .planning/ directory at or above ${start}`);
  const own = ownVersion();

  const found = await ownServer();
  let server = found.server;
  let slug;
  if (server && found.state.version === own && server.version === own) {
    const known = server.projects.find((project) => project.target === root);
    slug = known ? known.slug : await addProject(server, root);
  } else {
    let restartedFrom = null;
    if (server) {
      // A matching server of another version. The old one keeps serving from memory after an update
      // swaps the files, so replace it. The handshake just matched, so this pid is ours to signal.
      restartedFrom = server.version;
      process.kill(server.pid, 'SIGTERM');
      if (!(await waitForExit(server.pid, 5000))) {
        note(`labelore: the older Labelore server (pid ${server.pid}) has not exited yet`);
      }
    } else if (found.verdict.kind === 'legacy') {
      noteLegacy(found.state);
    }
    const started = await startServer(root);
    if (restartedFrom !== null) note(`Restarted Labelore server (${restartedFrom} → ${own})`);
    server = (await ownServer()).server;
    const known = server?.projects.find((project) => project.target === root);
    if (!server || !known) {
      process.stdout.write(`Labelore URL: ${started.base}/\n`);
      return;
    }
    slug = known.slug;
  }
  process.stdout.write(`Labelore URL: ${await phaseUrl(server.base, slug, phase)}\n`);
}

/** The ship:post path: read-only, never starts, restarts or signals a server, always exits 0. */
async function link(phase) {
  const start = startPoint();
  const root = findProjectRoot(start);
  if (!root) {
    process.stdout.write(
      `labelore: no .planning/ directory at or above ${start}; no dashboard link\n`,
    );
    return;
  }
  try {
    const { server } = await ownServer();
    const known = server?.projects.find((project) => project.target === root);
    if (server && known) {
      process.stdout.write(`Labelore URL: ${await phaseUrl(server.base, known.slug, phase)}\n`);
      return;
    }
    process.stdout.write(
      `labelore: this project is not open in Labelore. Open it with /gsd-labelore (or: node "${LAUNCHER}" open)\n`,
    );
  } catch (error) {
    process.stdout.write(
      `labelore: could not reach Labelore (${error instanceof Error ? error.message : String(error)})\n`,
    );
  }
}

async function stop() {
  const { state, verdict, server } = await ownServer();
  if (server) {
    process.kill(server.pid, 'SIGTERM');
    await waitForExit(server.pid, 5000);
    rmSync(join(stateDir(), 'server.json'), { force: true });
    process.stdout.write(`labelore: stopped Labelore (pid ${server.pid}, port ${server.port})\n`);
    return;
  }
  if (state && verdict.kind === 'legacy') noteLegacy(state);
  rmSync(join(stateDir(), 'server.json'), { force: true });
  process.stdout.write('labelore: not running\n');
}

const [command, phaseArg] = process.argv.slice(2);
if (command === 'open') {
  await open(phaseArg);
} else if (command === 'link') {
  await link(phaseArg);
} else if (command === 'stop') {
  await stop();
} else {
  fail('usage: labelore.mjs open [phase] | link [phase] | stop', 2);
}
