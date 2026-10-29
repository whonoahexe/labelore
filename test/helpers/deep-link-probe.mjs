// The deep-link probe (NAV-10): starts the real CLI as a child process on a project, then asks it for every
// address the project's /api/presentation payload emits (plus the awkward hand-written classes) and checks
// that each one answers 200 text/html with the app shell. `built` runs the production app (NODE_ENV=production
// serving ./dist, so `npm run build` must have run) and compares each body with dist/index.html exactly;
// `dev` runs the development server and looks for the root div. In both modes /api/* must never fall
// through to the shell, and in built mode every /assets/ file the shell references must load while a missing
// one answers 404. Plain Node ESM with no dependencies and no imports from the repository's TypeScript.
// Usage: node test/helpers/deep-link-probe.mjs <dev|built> <project-root>
// Prints one line per failure and a final `deep-link-probe: mode=<mode> urls=<n> failed=<k>`; exits 1 on
// any failure.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_URLS = 20;
const START_TIMEOUT_MS = 60_000;
const KILL_GRACE_MS = 3_000;
const USAGE = 'usage: node test/helpers/deep-link-probe.mjs <dev|built> <project-root>';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const [mode, projectRoot] = process.argv.slice(2);

if ((mode !== 'dev' && mode !== 'built') || !projectRoot) {
  console.error(USAGE);
  process.exit(1);
}

const distIndex = join(repoRoot, 'dist', 'index.html');
if (mode === 'built' && !existsSync(distIndex)) {
  console.error('deep-link-probe: dist/index.html is missing, run npm run build first');
  process.exit(1);
}

/** @type {import('node:child_process').ChildProcess | null} */
let child = null;

function stopChild() {
  const running = child;
  child = null;
  if (running === null || running.exitCode !== null || running.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const hard = setTimeout(() => running.kill('SIGKILL'), KILL_GRACE_MS);
    running.once('exit', () => {
      clearTimeout(hard);
      resolve();
    });
    running.kill('SIGTERM');
  });
}

// A synchronous last resort for any way out of this process that skips the finally block.
process.on('exit', () => {
  if (child !== null && child.exitCode === null) child.kill('SIGKILL');
});

/** Spawns the CLI and resolves with its base URL once it prints `Open http://...`. */
function startServer() {
  const env = { ...process.env };
  if (mode === 'built') env.NODE_ENV = 'production';
  else delete env.NODE_ENV;
  const started = spawn(process.execPath, ['src/server/index.ts', projectRoot, '--port', '0'], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child = started;
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(
      () => reject(new Error(`the server printed no "Open http://" line within ${START_TIMEOUT_MS / 1000} s\n${output}`)),
      START_TIMEOUT_MS,
    );
    const fail = (message) => {
      clearTimeout(timer);
      reject(new Error(`${message}\n${output}`));
    };
    started.stdout.on('data', (chunk) => {
      output += chunk;
      const line = output.split('\n').find((candidate) => candidate.startsWith('Open http://'));
      if (line !== undefined) {
        clearTimeout(timer);
        resolve(line.slice('Open '.length).trim());
      }
    });
    started.stderr.on('data', (chunk) => {
      output += chunk;
    });
    started.once('error', (error) => fail(`could not start the server: ${error.message}`));
    started.once('exit', (code) => fail(`the server exited with ${code} before it was ready`));
  });
}

const isProjectPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/api/');

/** Walks the payload for the string values of key, url, overviewUrl and roadmapUrl; a plan's own key also
 * gives its phase page (the plan URL without its last segment). */
function collectUrls(payload) {
  const found = new Set();
  const named = new Set(['key', 'url', 'overviewUrl', 'roadmapUrl']);
  const walk = (node, parentProperty) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentProperty);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [property, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        if (!named.has(property) || !isProjectPath(value)) continue;
        found.add(value);
        if (property === 'key' && parentProperty === 'plans') {
          found.add(value.slice(0, value.lastIndexOf('/')) || '/');
        }
      } else {
        walk(value, property);
      }
    }
  };
  walk(payload, '');
  for (const alias of Object.keys(payload.routeAliases ?? {})) if (isProjectPath(alias)) found.add(alias);
  return found;
}

function buildUrlSet(payload) {
  const slug = `/${payload.projectSlug}`;
  const emitted = [...collectUrls(payload)];
  const phasePages = emitted.filter((url) => /\/phase-[^/]+$/.test(url));
  const plans = emitted.filter((url) => /\/plan-[^/]+$/.test(url));
  const handWritten = [
    '',
    ...phasePages.slice(0, 1).map((url) => `${url}/`),
    ...plans.slice(0, 1).map((url) => `${url}/`),
    '/notes/kiln%2Fcurve',
    '/file/state.json',
    '/quick',
    '/no/such/page',
  ];
  return [...new Set([...emitted, ...handWritten].map((url) => `${slug}${url}`))];
}

const failures = [];
const fail = (message) => failures.push(message);

async function probe(base) {
  const presentationResponse = await fetch(`${base}/api/presentation`);
  if (!presentationResponse.ok) throw new Error(`/api/presentation answered ${presentationResponse.status}`);
  const payload = await presentationResponse.json();
  if (typeof payload.projectSlug !== 'string' || payload.projectSlug === '') {
    throw new Error('/api/presentation carries no projectSlug');
  }

  const urls = buildUrlSet(payload);
  if (urls.length < MIN_URLS) fail(`only ${urls.length} URLs were found, expected at least ${MIN_URLS}`);

  const shell = mode === 'built' ? readFileSync(distIndex, 'utf8') : null;
  for (const url of urls) {
    const response = await fetch(`${base}${url}`, { headers: { Accept: 'text/html' } });
    const body = await response.text();
    const type = response.headers.get('content-type') ?? '';
    if (response.status !== 200) fail(`${url}: answered ${response.status}, expected 200`);
    else if (!type.includes('text/html')) fail(`${url}: content-type ${type}, expected text/html`);
    else if (shell !== null && body !== shell) fail(`${url}: body is not the exact dist/index.html`);
    else if (shell === null && !body.includes('<div id="root">')) fail(`${url}: body has no root div`);
  }

  if (mode === 'built') {
    const served = await (await fetch(`${base}/`, { headers: { Accept: 'text/html' } })).text();
    const assets = [...served.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
    if (assets.length === 0) fail('the served shell references no /assets/ file');
    for (const asset of assets) {
      const response = await fetch(`${base}${asset}`);
      if (response.status !== 200) fail(`${asset}: answered ${response.status}, expected 200`);
    }
    const missing = await fetch(`${base}/assets/does-not-exist.js`, { headers: { Accept: 'text/html' } });
    const missingBody = await missing.text();
    if (missing.status !== 404) fail(`/assets/does-not-exist.js: answered ${missing.status}, expected 404`);
    else if (missingBody === shell) fail('/assets/does-not-exist.js: answered the shell');
  }

  for (const headers of [undefined, { Accept: 'text/html' }]) {
    const response = await fetch(`${base}/api/not-real`, { headers });
    const type = response.headers.get('content-type') ?? '';
    if (response.status !== 404 || !type.includes('application/json')) {
      fail(`/api/not-real: answered ${response.status} ${type}, expected 404 JSON`);
    }
  }

  const png = (payload.artifacts ?? []).find((artifact) => artifact.path.toLowerCase().endsWith('.png'));
  if (png === undefined) {
    fail('the payload has no .png artifact to check the bytes route with');
  } else {
    const response = await fetch(`${base}/api/files?route=${encodeURIComponent(png.key)}`);
    const type = response.headers.get('content-type') ?? '';
    if (response.status !== 200 || type !== 'image/png') {
      fail(`/api/files for ${png.key}: answered ${response.status} ${type}, expected 200 image/png`);
    }
  }

  return urls.length;
}

let urlCount = 0;
try {
  const base = await startServer();
  urlCount = await probe(base);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await stopChild();
}

for (const line of failures) console.error(`deep-link-probe: FAIL ${line}`);
console.log(`deep-link-probe: mode=${mode} urls=${urlCount} failed=${failures.length}`);
process.exit(failures.length === 0 ? 0 : 1);
