// The release stage checks (BUND-03, BUND-04): what a staged tree may hold, how big it may be, and
// whether the staged server bundle starts and reports the version baked into it. Also the check of
// the packed tarball against the stage it was packed from.
//
// Node builtins only, like scripts/labelore.mjs, so the release script can import it with nothing
// installed. Every check returns problems as named strings instead of throwing, so one run reports
// every failure at once. The checks also refuse a stage that names the fixed port the maintainer's
// own instance holds (LNCH-02, D-09), so no shipped file points a new user at it.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { tarEntries } from './leak-scan.mjs';

/** D-07: a stage may total at most 12 MiB (12,582,912 bytes), inclusive. */
export const SIZE_BUDGET_BYTES = 12 * 1024 * 1024;

/** gsd's project-scope consent cap: an installed capability above it needs a consent prompt. */
export const CONSENT_CAP_BYTES = 16 * 1024 * 1024;

/** The exact files a stage holds outside dist/. */
export const RUNTIME_FILES = [
  'capability.json',
  'LICENSE',
  'README.md',
  'package.json',
  'scripts/labelore.mjs',
  'skills/labelore/SKILL.md',
  'server/labelore-server.mjs',
];

/** The `files` field of the stage package.json, in order. */
const STAGE_PACKAGE_FILES = ['capability.json', 'skills/', 'scripts/', 'server/', 'dist/'];
const STAGE_ENGINES_NODE = '>=22.18.0';
const FORBIDDEN_PACKAGE_FIELDS = ['bin', 'scripts', 'dependencies', 'devDependencies', 'private'];

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');
const OPEN_LINE = /^Open (http:\/\/127\.0\.0\.1:(\d+))\s*$/m;
// A port-shaped 4173: not inside a longer number, name or decimal (the dist holds a digit run `.7141733`).
const FIXED_PORT = /(?<![\w.])4173(?![\w])/;
const SMOKE_START_MS = 20_000;
const SMOKE_KILL_GRACE_MS = 3_000;

function kindOf(stat) {
  if (stat.isSymbolicLink()) return 'symlink';
  if (stat.isDirectory()) return 'dir';
  if (stat.isFile()) return 'file';
  return 'other';
}

/** Every entry under `dir` by lstat (a symlink is reported, never followed): sorted posix paths
 * relative to `dir`, each `{ path, size, kind }`. */
export function listStage(dir) {
  const out = [];
  const visit = (current, prefix) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const path = prefix ? `${prefix}/${entry}` : entry;
      const stat = lstatSync(full);
      const kind = kindOf(stat);
      out.push({ path, size: stat.size, kind });
      if (kind === 'dir') visit(full, path);
    }
  };
  visit(dir, '');
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** The specifiers of every static import and re-export statement in a bundle. */
function staticSpecifiers(source) {
  const patterns = [
    /^\s*import\s[^'"`;]*?from\s*["']([^"']+)["']/gm,
    /^\s*import\s*["']([^"']+)["']/gm,
    /^\s*export\s[^'"`;]*?from\s*["']([^"']+)["']/gm,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]));
}

/** The literal specifiers of every dynamic import call. Lines inside comments are skipped: JSDoc type
 * references such as `@type {import('unified').Processor}` are text, not calls. */
function dynamicSpecifiers(source) {
  const specifiers = [];
  for (const line of source.split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
    for (const match of line.matchAll(/\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) specifiers.push(match[1]);
  }
  return specifiers;
}

/** The literal specifiers of every require call. Dependency comments also contain require('...')
 * text, so these are only checked for vite. */
function requireSpecifiers(source) {
  return [...source.matchAll(/\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map((match) => match[1]);
}

/** True for the vite package or a path inside it. A specifier check, never a substring check: the
 * vitesse theme names contain "vite". */
const isVite = (specifier) => /(^|\/)vite(\/|$)/.test(specifier);

function readJson(path, problems, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    problems.push(`${label} is missing or is not valid JSON`);
    return null;
  }
}

function checkAllowlist(entries, problems) {
  const outside = entries.filter((entry) => entry.path !== 'dist' && !entry.path.startsWith('dist/'));
  const files = outside.filter((entry) => entry.kind === 'file').map((entry) => entry.path);
  for (const path of RUNTIME_FILES) if (!files.includes(path)) problems.push(`missing runtime file ${path}`);
  for (const path of files) if (!RUNTIME_FILES.includes(path)) problems.push(`unexpected file outside dist/: ${path}`);
  const parents = new Set(RUNTIME_FILES.flatMap((path) => path.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));
  for (const entry of outside) {
    if (entry.kind === 'dir' && !parents.has(entry.path)) problems.push(`unexpected directory outside dist/: ${entry.path}`);
  }
  if (!entries.some((entry) => entry.path === 'dist/index.html' && entry.kind === 'file')) {
    problems.push('dist/index.html is missing');
  }
}

function checkBundle(dir, problems) {
  let source;
  try {
    source = readFileSync(join(dir, 'server/labelore-server.mjs'), 'utf8');
  } catch {
    return;
  }
  const statics = staticSpecifiers(source);
  const dynamics = dynamicSpecifiers(source);
  if (statics.length === 0) problems.push('the server bundle has no static imports to check, so its imports are unverified');
  for (const specifier of statics) {
    if (!specifier.startsWith('node:')) problems.push(`the server bundle statically imports a non-builtin: ${specifier}`);
  }
  for (const specifier of dynamics) {
    if (!specifier.startsWith('node:')) problems.push(`the server bundle dynamically imports a non-builtin: ${specifier}`);
  }
  for (const specifier of [...statics, ...dynamics, ...requireSpecifiers(source)]) {
    if (isVite(specifier)) problems.push(`the server bundle reaches for vite: ${specifier}`);
  }
}

function checkPort(dir, entries, problems) {
  for (const entry of entries) {
    if (entry.kind !== 'file') continue;
    const bytes = readFileSync(join(dir, entry.path));
    if (bytes.subarray(0, 8000).includes(0)) continue;
    if (FIXED_PORT.test(bytes.toString('utf8'))) problems.push(`port 4173 is named in the stage: ${entry.path}`);
  }
}

function checkPackage(dir, version, problems) {
  const pkg = readJson(join(dir, 'package.json'), problems, 'package.json');
  const capability = readJson(join(dir, 'capability.json'), problems, 'capability.json');
  if (pkg) {
    if (pkg.name !== 'labelore') problems.push(`package.json name is ${JSON.stringify(pkg.name)}, not labelore`);
    for (const field of FORBIDDEN_PACKAGE_FIELDS) {
      if (field in pkg) problems.push(`package.json holds a ${field} field`);
    }
    if (JSON.stringify(pkg.files) !== JSON.stringify(STAGE_PACKAGE_FILES)) {
      problems.push(`package.json files is ${JSON.stringify(pkg.files)}, not ${JSON.stringify(STAGE_PACKAGE_FILES)}`);
    }
    if (pkg.engines?.node !== STAGE_ENGINES_NODE) {
      problems.push(`package.json engines.node is ${JSON.stringify(pkg.engines?.node)}, not ${STAGE_ENGINES_NODE}`);
    }
    if (version !== undefined && pkg.version !== version) {
      problems.push(`package.json version is ${JSON.stringify(pkg.version)}, not ${version}`);
    }
  }
  if (pkg && capability && capability.version !== pkg.version) {
    problems.push(`capability.json version ${JSON.stringify(capability.version)} differs from package.json ${JSON.stringify(pkg.version)}`);
  }
}

/** Checks a staged tree. Returns `{ ok, problems, bytes, files }`: `bytes` is the exact sum of the
 * lstat sizes of every regular file, `files` their count. */
export function verifyStage(dir, { budgetBytes = SIZE_BUDGET_BYTES, version } = {}) {
  const problems = [];
  const entries = listStage(dir);
  checkAllowlist(entries, problems);
  for (const entry of entries) {
    if (entry.path.split('/').includes('node_modules')) problems.push(`node_modules in the stage: ${entry.path}`);
    if (entry.kind === 'file' && entry.path.endsWith('.map')) problems.push(`sourcemap in the stage: ${entry.path}`);
    if (entry.kind === 'symlink') problems.push(`symlink in the stage: ${entry.path}`);
    if (entry.kind === 'other') problems.push(`non-regular entry in the stage: ${entry.path}`);
  }
  checkBundle(dir, problems);
  checkPort(dir, entries, problems);
  checkPackage(dir, version, problems);
  const regular = entries.filter((entry) => entry.kind === 'file');
  const bytes = regular.reduce((sum, entry) => sum + entry.size, 0);
  if (bytes > budgetBytes) problems.push(`the stage is ${bytes} bytes, over its budget of ${budgetBytes} bytes`);
  if (bytes >= CONSENT_CAP_BYTES) problems.push(`the stage is ${bytes} bytes, not below the consent cap of ${CONSENT_CAP_BYTES} bytes`);
  return { ok: problems.length === 0, problems, bytes, files: regular.length };
}

function killAndWait(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolvePromise) => {
    const hard = setTimeout(() => child.kill('SIGKILL'), SMOKE_KILL_GRACE_MS);
    child.once('exit', () => {
      clearTimeout(hard);
      resolvePromise();
    });
    child.kill('SIGTERM');
  });
}

async function getText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  return { status: response.status, body: Buffer.from(await response.arrayBuffer()) };
}

/** Starts the staged bundle the way an installed launcher would (a cwd of its own, a clean
 * environment, the stage's dist, `--port 0` so no fixed port is taken) and checks that
 * `/api/identity` reports `version` and that `/` returns the stage's dist/index.html.
 * Always stops the child and removes its temp dirs. Returns `{ ok, problems }`. */
export async function smokeStage(dir, version) {
  const problems = [];
  const scratch = mkdtempSync(join(tmpdir(), 'labelore-smoke-'));
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: join(scratch, 'home'),
    LABELORE_CONFIG_DIR: join(scratch, 'config'),
    LABELORE_DIST_DIR: join(dir, 'dist'),
  };
  if (process.env.TMPDIR) env.TMPDIR = process.env.TMPDIR;
  const child = spawn(
    process.execPath,
    [join(dir, 'server/labelore-server.mjs'), join(REPO_ROOT, 'fixtures/sparse-started'), '--port', '0'],
    { cwd: scratch, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  try {
    const base = await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`no Open line within ${SMOKE_START_MS} ms`)), SMOKE_START_MS);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        output += chunk;
        const match = OPEN_LINE.exec(output);
        if (match) {
          clearTimeout(timer);
          resolvePromise(match[1]);
        }
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        reject(new Error(`exited (code ${code}, signal ${signal}) before its Open line`));
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const identity = await getText(`${base}/api/identity`);
    let parsed = null;
    try {
      parsed = JSON.parse(identity.body.toString('utf8'));
    } catch {
      parsed = null;
    }
    if (identity.status !== 200 || !parsed) problems.push(`/api/identity answered ${identity.status} without JSON`);
    else {
      if (parsed.app !== 'labelore') problems.push(`/api/identity app is ${JSON.stringify(parsed.app)}, not labelore`);
      if (parsed.version !== version) problems.push(`/api/identity version is ${JSON.stringify(parsed.version)}, not ${version}`);
    }
    const root = await getText(`${base}/`);
    const expected = readFileSync(join(dir, 'dist/index.html'));
    if (root.status !== 200) problems.push(`/ answered ${root.status}`);
    else if (!root.body.equals(expected)) problems.push("/ did not return the stage's dist/index.html");
  } catch (error) {
    problems.push(`the staged bundle did not answer: ${error instanceof Error ? error.message : String(error)}\n${output}`);
  } finally {
    await killAndWait(child);
    rmSync(scratch, { recursive: true, force: true });
  }
  return { ok: problems.length === 0, problems };
}

/** Checks the packed bytes against the stage they came from: the sha512 of `buffer`, in npm's
 * `sha512-<base64>` form, must equal `integrity`, and the file entries without their `package/`
 * prefix must equal the stage's regular files. `stageListing` is `listStage(stage)`. Returns
 * `{ ok, problems }`. */
export function verifyPacked(buffer, stageListing, integrity) {
  const problems = [];
  const actual = `sha512-${createHash('sha512').update(buffer).digest('base64')}`;
  if (actual !== integrity) problems.push(`the tarball sha512 is ${actual}, but npm pack reported ${integrity}`);
  let packed = [];
  try {
    packed = [...tarEntries(gunzipSync(buffer))]
      .filter((entry) => entry.type === '0' || entry.type === '7')
      .map((entry) => (entry.path.startsWith('package/') ? entry.path.slice('package/'.length) : entry.path))
      .sort();
  } catch (error) {
    problems.push(`the tarball could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const staged = stageListing.filter((entry) => entry.kind === 'file').map((entry) => entry.path).sort();
  for (const path of staged) if (!packed.includes(path)) problems.push(`the tarball lacks ${path}`);
  for (const path of packed) if (!staged.includes(path)) problems.push(`the tarball adds ${path}`);
  return { ok: problems.length === 0, problems };
}
