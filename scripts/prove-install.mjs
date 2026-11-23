#!/usr/bin/env node
/**
 * Install-channel spike harness. A maintainer tool, never shipped.
 *
 *   node scripts/prove-install.mjs --channels [--only <leg>] [--json] [--keep]
 *   node scripts/prove-install.mjs --spec <spec> [--integrity <sha512>] [--scope global|project|both]
 *                                  [--node <path>] [--keep]
 *   node scripts/prove-install.mjs --update-from <stage> --update-to <stage> [--keep]
 *
 * It drives the real `gsd capability install` (and `list`, `outdated`) against a stand-in
 * Labelore release tree for every channel gsd-core offers (local dir, npm, git, tarball), and
 * checks each outcome against what the install-channel decision was recorded from. The stand-in
 * is a small spike stage (capability.json, LICENSE, the skill and the launcher): channel
 * mechanics do not depend on the payload.
 *
 * Isolation: every gsd call runs with GSD_HOME set to a fresh temp directory and a temp cwd, so
 * nothing is written to the maintainer's real install, and the real global capability list is
 * compared before and after the run. Only `npm pack` and `npm view` are run, both with an empty
 * user npmrc: nothing here publishes, logs in to npm, or reads or writes a token.
 *
 * Install mode (--spec) installs one release for real at each scope and opens it through the
 * skill's own Bash snippet, from a project directory that is not the install dir, with npm and npx
 * shims first on PATH that record every call. Update mode (--update-from, --update-to) installs a
 * local-dir source, swaps the source for a newer release, runs `capability update` and checks the
 * launcher's restart. Both modes use a throwaway GSD_HOME and launcher state dir per leg.
 *
 * Node builtins only.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { connect, createServer as createNetServer } from 'node:net';
import { devNull, homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GSD_TOOLS = process.env.GSD_TOOLS || join(homedir(), '.claude', 'gsd-core', 'bin', 'gsd-tools.cjs');

const NETWORK_ERROR = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ECONNRESET|EHOSTUNREACH|ENETUNREACH/;

function note(message) {
  process.stderr.write(`${message}\n`);
}

function fail(message, code = 1) {
  note(message);
  process.exit(code);
}

/** Run a command to completion without blocking the event loop (the stub servers live in-process). */
function exec(command, args, { cwd, env }) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => resolveRun({ status: null, stdout, stderr: `${stderr}${String(error)}` }));
    child.on('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

function readPackageJson() {
  return JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Number of files and total bytes under a directory (dotdirs such as .git included). */
function dirStats(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        files += 1;
        bytes += lstatSync(full).size;
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return { files, bytes };
}

async function freePort() {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createNetServer();
    probe.on('error', rejectPort);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

async function waitForPort(port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await new Promise((resolveProbe) => {
      const socket = connect({ host: '127.0.0.1', port }, () => {
        socket.destroy();
        resolveProbe(true);
      });
      socket.on('error', () => resolveProbe(false));
    });
    if (open) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`nothing listened on 127.0.0.1:${port} within ${timeoutMs} ms`);
}

/** The first non-empty trimmed line of the text that matches the pattern, or null. */
function lineMatching(text, pattern) {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line && pattern.test(line)) return line;
  }
  return null;
}

function firstLine(text) {
  return lineMatching(text, /./) ?? '';
}

/** The first gsd output line that proves the outcome. */
function pickEvidence(res, outcome, proof) {
  const text = `${res.stdout}\n${res.stderr}`;
  if (proof) {
    const hit = lineMatching(text, proof);
    if (hit) return hit;
  }
  if (outcome === 'installed') {
    const hit = lineMatching(text, /"status":\s*"installed"/);
    if (hit) return hit;
  }
  return (
    lineMatching(text, /^Error|blocked|mismatch|fatal|not found/i) ??
    firstLine(res.stderr) ??
    firstLine(res.stdout)
  );
}

function classify(res, remote) {
  if (res.status === 0 && /"status":\s*"installed"/.test(res.stdout)) return 'installed';
  if (remote && NETWORK_ERROR.test(`${res.stdout}\n${res.stderr}`)) return 'unreachable';
  return 'refused';
}

/** Everything the legs share, built lazily so `--only` pays only for what it uses. */
function createContext({ keep }) {
  const root = mkdtempSync(join(tmpdir(), 'labelore-proof-'));
  const memo = new Map();
  const cleanups = [];
  const once = (key, build) => {
    if (!memo.has(key)) memo.set(key, build());
    return memo.get(key);
  };
  let counter = 0;
  const tmp = (label) => {
    counter += 1;
    const dir = join(root, `${String(counter).padStart(2, '0')}-${label}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  };

  // An empty user npmrc: npm pack and npm view then read no credentials at all.
  const npmrc = join(root, 'empty.npmrc');
  writeFileSync(npmrc, '');

  const baseEnv = (home, extra = {}) => ({
    ...process.env,
    GSD_HOME: home,
    npm_config_userconfig: npmrc,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    ...extra,
  });

  const ctx = {
    root,
    keep,
    tmp,
    npmrc,
    baseEnv,
    onCleanup: (fn) => cleanups.push(fn),

    /** `gsd-tools capability <args>` in a throwaway home and cwd. */
    gsd(args, { home, cwd, env = {} }) {
      return exec(process.execPath, [GSD_TOOLS, 'capability', ...args], { cwd, env: baseEnv(home, env) });
    },

    /** `gsd-tools capability <args>` against the maintainer's real environment (read-only calls only). */
    gsdReal(args) {
      return exec(process.execPath, [GSD_TOOLS, 'capability', ...args], { cwd: root, env: process.env });
    },

    installDir(home) {
      return join(home, '.gsd', 'capabilities', 'labelore');
    },

    /** The spike stage: the files a Labelore capability carries, plus a generated package.json. */
    stage() {
      return once('stage', async () => {
        const { version } = readPackageJson();
        const dir = tmp('stage');
        mkdirSync(join(dir, 'skills', 'labelore'), { recursive: true });
        mkdirSync(join(dir, 'scripts'), { recursive: true });
        cpSync(join(REPO_ROOT, 'capability.json'), join(dir, 'capability.json'));
        cpSync(join(REPO_ROOT, 'LICENSE'), join(dir, 'LICENSE'));
        cpSync(join(REPO_ROOT, 'skills', 'labelore', 'SKILL.md'), join(dir, 'skills', 'labelore', 'SKILL.md'));
        cpSync(join(REPO_ROOT, 'scripts', 'labelore.mjs'), join(dir, 'scripts', 'labelore.mjs'));
        // No bin, no scripts, no dependencies and no private field: this is only the carrier (DIST-02).
        const manifest = {
          name: 'labelore',
          version,
          description: 'Read-only dashboard for a GSD project, distributed as a GSD capability.',
          license: 'MIT',
          type: 'module',
          engines: { node: '>=22.18.0' },
          repository: { type: 'git', url: 'git+https://github.com/whonoahexe/labelore.git' },
          files: ['capability.json', 'skills/', 'scripts/'],
        };
        writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
        return { dir, version };
      });
    },

    /** The stage packed with `npm pack`: tarball path, sha512 integrity and the version. */
    pack() {
      return once('pack', async () => {
        const stage = await ctx.stage();
        const dest = tmp('pack');
        const res = await exec('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', dest], {
          cwd: stage.dir,
          env: baseEnv(dest),
        });
        const parsed = parseJson(res.stdout);
        if (res.status !== 0 || !Array.isArray(parsed) || !parsed[0]?.filename) {
          throw new Error(`npm pack failed (exit ${res.status}): ${firstLine(res.stderr)}`);
        }
        const { filename, integrity } = parsed[0];
        const tgz = join(dest, filename);
        const bytes = readFileSync(tgz);
        const shasum = createHash('sha1').update(bytes).digest('hex');
        return { tgz, bytes, integrity, shasum, filename, version: stage.version };
      });
    },

    /** A loopback registry answering only GET /labelore and the tarball (the stub from RESEARCH). */
    registry() {
      return once('registry', async () => {
        const pack = await ctx.pack();
        const name = 'labelore';
        const version = pack.version;
        const server = createHttpServer((req, res) => {
          const base = `http://127.0.0.1:${server.address().port}`;
          const tarballPath = `/${name}/-/${name}-${version}.tgz`;
          if (req.url === `/${name}`) {
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                name,
                'dist-tags': { latest: version },
                versions: {
                  [version]: {
                    name,
                    version,
                    dist: { tarball: `${base}${tarballPath}`, integrity: pack.integrity, shasum: pack.shasum },
                  },
                },
              }),
            );
          } else if (req.url === tarballPath) {
            res.end(pack.bytes);
          } else {
            res.statusCode = 404;
            res.end('{}');
          }
        });
        await new Promise((resolveListen, rejectListen) => {
          server.on('error', rejectListen);
          server.listen(0, '127.0.0.1', resolveListen);
        });
        ctx.onCleanup(() => new Promise((resolveClose) => (server.closeAllConnections(), server.close(resolveClose))));
        return { port: server.address().port, env: { npm_config_registry: `http://127.0.0.1:${server.address().port}/` } };
      });
    },

    /** The stub-registry install, shared by npm-stub-registry and npm-outdated-pinned (one GSD_HOME). */
    stubInstall() {
      return once('stub-install', async () => {
        const pack = await ctx.pack();
        const registry = await ctx.registry();
        const home = tmp('home-npm-stub');
        const cwd = tmp('cwd-npm-stub');
        const spec = `npm:labelore@${pack.version}`;
        const res = await ctx.gsd(['install', spec, '--integrity', pack.integrity, '--scope', 'global', '--yes'], {
          home,
          cwd,
          env: registry.env,
        });
        return { spec, res, home, cwd, registry };
      });
    },

    /**
     * A git repository with two tags (an older one and the tip), served from a bare clone by a
     * loopback `git daemon`. Nothing is pushed anywhere and this repository is never used.
     */
    git() {
      return once('git', async () => {
        const stage = await ctx.stage();
        const base = tmp('git');
        const work = join(base, 'work');
        mkdirSync(work, { recursive: true });
        cpSync(stage.dir, work, { recursive: true });
        const env = baseEnv(base);
        const git = async (args, cwd = work) => {
          const res = await exec(
            'git',
            [
              '-c', 'user.name=labelore-spike',
              '-c', 'user.email=spike@example.invalid',
              '-c', 'commit.gpgsign=false',
              '-c', 'tag.gpgsign=false',
              ...args,
            ],
            { cwd, env },
          );
          if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed (exit ${res.status}): ${firstLine(res.stderr)}`);
          return res.stdout.trim();
        };
        await git(['init', '-q', '-b', 'main']);
        await git(['add', '-A']);
        await git(['commit', '-q', '-m', 'spike: first commit']);
        const firstSha = await git(['rev-parse', 'HEAD']);
        await git(['tag', 'v0.0.0-spike.1']);
        const launcher = join(work, 'scripts', 'labelore.mjs');
        writeFileSync(launcher, `${readFileSync(launcher, 'utf8')}\n`);
        await git(['commit', '-q', '-a', '-m', 'spike: second commit']);
        await git(['tag', `v${stage.version}`]);
        // A bare clone carries both tags, so nothing has to be pushed anywhere.
        await git(['clone', '-q', '--bare', work, join(base, 'rel.git')], base);
        writeFileSync(join(base, 'rel.git', 'git-daemon-export-ok'), '');

        const port = await freePort();
        const daemon = spawn(
          'git',
          ['daemon', '--listen=127.0.0.1', `--port=${port}`, `--base-path=${base}`, '--export-all', '--reuseaddr', base],
          { env, stdio: 'ignore' },
        );
        const exited = new Promise((resolveExit) => daemon.on('close', resolveExit));
        ctx.onCleanup(async () => {
          if (daemon.exitCode === null && daemon.signalCode === null) daemon.kill('SIGTERM');
          await exited;
        });
        await waitForPort(port);
        return { port, firstSha, version: stage.version };
      });
    },
  };

  ctx.dispose = async () => {
    for (const fn of cleanups.reverse()) {
      try {
        await fn();
      } catch (error) {
        note(`cleanup: ${String(error)}`);
      }
    }
    if (keep) note(`kept temp dirs under ${root}`);
    else rmSync(root, { recursive: true, force: true });
  };
  return ctx;
}

/** Build a result row from a gsd install response. */
function judge(leg, res, { spec, remote = false, proof = null, extra = '' }) {
  const outcome = classify(res, remote);
  const text = `${res.stdout}\n${res.stderr}`;
  let evidence = pickEvidence(res, outcome, proof);
  if (extra) evidence = `${evidence}; ${extra}`;
  const proofMissing = outcome === leg.expect && proof && !proof.test(text);
  if (proofMissing) evidence = `${evidence} (expected output matching ${proof} not found)`;
  const ok = outcome === 'unreachable' || (outcome === leg.expect && !proofMissing);
  return { id: leg.id, spec, expect: leg.expect, outcome, evidence, ok };
}

/** After an install, `capability list` must show labelore; returns its row (or null) and a note. */
async function listedStatus(ctx, { home, cwd, scope }) {
  const listed = await ctx.gsd(['list', '--scope', scope, '--json'], { home, cwd });
  const rows = parseJson(listed.stdout);
  const row = Array.isArray(rows) ? rows.find((entry) => entry.id === 'labelore') : null;
  return { row, note: row ? `capability list --scope ${scope}: labelore status ${row.status}` : `capability list --scope ${scope}: labelore missing` };
}

function dirLeg(id, scope) {
  return {
    id,
    expect: 'installed',
    async run(ctx) {
      const stage = await ctx.stage();
      const home = ctx.tmp(`home-${id}`);
      let cwd = ctx.tmp(`cwd-${id}`);
      if (scope === 'project') {
        mkdirSync(join(cwd, '.planning'), { recursive: true });
        writeFileSync(join(cwd, '.planning', 'config.json'), '{}\n');
        writeFileSync(join(cwd, '.planning', 'PROJECT.md'), '# Spike project\n');
      }
      const res = await ctx.gsd(['install', stage.dir, '--scope', scope, '--yes'], { home, cwd });
      const result = judge(this, res, { spec: stage.dir });
      if (result.outcome !== 'installed') return result;
      const { row, note: listNote } = await listedStatus(ctx, { home, cwd, scope });
      result.evidence = `${result.evidence}; ${listNote}`;
      if (!row || row.status !== 'active') {
        result.outcome = 'inconsistent';
        result.ok = false;
      }
      return result;
    },
  };
}

function npmTarballLeg(id, { integrity, expect, proof }) {
  return {
    id,
    expect,
    async run(ctx) {
      const pack = await ctx.pack();
      const home = ctx.tmp(`home-${id}`);
      const cwd = ctx.tmp(`cwd-${id}`);
      const pin = integrity === 'correct' ? pack.integrity : integrity;
      const spec = `npm:${pack.tgz}`;
      const res = await ctx.gsd(['install', spec, '--integrity', pin, '--scope', 'global', '--yes'], { home, cwd });
      const result = judge(this, res, { spec: `${spec} --integrity ${integrity === 'correct' ? '<sha512>' : pin}`, proof });
      if (result.outcome !== 'installed') return result;
      const { row, note: listNote } = await listedStatus(ctx, { home, cwd, scope: 'global' });
      result.evidence = `${result.evidence}; ${listNote}`;
      if (!row) {
        result.outcome = 'inconsistent';
        result.ok = false;
      }
      return result;
    },
  };
}

function gitLeg(id, { ref, expect, countInstall = false }) {
  return {
    id,
    expect,
    async run(ctx) {
      const repo = await ctx.git();
      const home = ctx.tmp(`home-${id}`);
      const cwd = ctx.tmp(`cwd-${id}`);
      const target = ref(repo);
      const res = await ctx.gsd(['install', target, '--scope', 'global', '--yes'], { home, cwd });
      let extra = '';
      if (countInstall && classify(res, false) === 'installed') {
        const { files, bytes } = dirStats(ctx.installDir(home));
        extra = `installed dir: ${files} files, ${bytes} bytes (.git included)`;
      }
      return judge(this, res, { spec: target, extra });
    },
  };
}

function tarballLeg(id, { url, proof }) {
  return {
    id,
    expect: 'refused',
    async run(ctx) {
      const home = ctx.tmp(`home-${id}`);
      const cwd = ctx.tmp(`cwd-${id}`);
      const target = typeof url === 'function' ? url() : url;
      const res = await ctx.gsd(['install', target, '--scope', 'global', '--yes'], { home, cwd });
      return judge(this, res, { spec: target, remote: true, proof });
    },
  };
}

const LEGS = [
  npmTarballLeg('npm-tgz-integrity', { integrity: 'correct', expect: 'installed' }),
  dirLeg('dir-global', 'global'),
  dirLeg('dir-project', 'project'),
  npmTarballLeg('npm-tgz-wrong-integrity', { integrity: 'sha512-AAAA', expect: 'refused', proof: /Integrity mismatch/ }),
  {
    id: 'npm-stub-registry',
    expect: 'installed',
    async run(ctx) {
      const { spec, res, home, cwd } = await ctx.stubInstall();
      const result = judge(this, res, { spec: `${spec} --integrity <sha512> (registry: loopback stub)` });
      if (result.outcome !== 'installed') return result;
      const { row, note: listNote } = await listedStatus(ctx, { home, cwd, scope: 'global' });
      result.evidence = `${result.evidence}; ${listNote}`;
      if (!row) {
        result.outcome = 'inconsistent';
        result.ok = false;
      }
      return result;
    },
  },
  {
    id: 'npm-outdated-pinned',
    expect: 'info',
    async run(ctx) {
      const { spec, res: installRes, home, cwd, registry } = await ctx.stubInstall();
      const base = { id: this.id, spec: `capability outdated --scope global (after ${spec})`, expect: this.expect, ok: true };
      if (classify(installRes, false) !== 'installed') {
        return { ...base, outcome: 'info', evidence: 'skipped: the stub-registry install did not succeed' };
      }
      const res = await ctx.gsd(['outdated', '--scope', 'global', '--json'], { home, cwd, env: registry.env });
      const parsed = parseJson(res.stdout);
      const rows = Array.isArray(parsed) ? parsed : (parsed?.capabilities ?? parsed?.rows ?? []);
      const row = Array.isArray(rows) ? rows.find((entry) => entry.id === 'labelore') : null;
      const evidence = row ? JSON.stringify(row) : firstLine(`${res.stdout}\n${res.stderr}`);
      // The outcome is informational, but a pinned install reading anything else is worth flagging.
      return { ...base, outcome: 'info', evidence: row?.status === 'pinned' ? evidence : `${evidence} (NOT pinned)`, ok: row?.status === 'pinned' };
    },
  },
  gitLeg('git-tip-tag', { ref: (repo) => `git+git://127.0.0.1:${repo.port}/rel.git#v${repo.version}`, expect: 'installed', countInstall: true }),
  gitLeg('git-old-tag', { ref: (repo) => `git+git://127.0.0.1:${repo.port}/rel.git#v0.0.0-spike.1`, expect: 'refused' }),
  gitLeg('git-sha-pin', { ref: (repo) => `git+git://127.0.0.1:${repo.port}/rel.git#sha:${repo.firstSha}`, expect: 'refused' }),
  gitLeg('git-bare-sha', { ref: (repo) => `git+git://127.0.0.1:${repo.port}/rel.git#${repo.firstSha}`, expect: 'refused' }),
  gitLeg('git-no-prefix', { ref: (repo) => `git://127.0.0.1:${repo.port}/rel.git#v${repo.version}`, expect: 'refused' }),
  tarballLeg('tarball-github-archive', {
    url: 'https://github.com/whonoahexe/labelore/archive/refs/tags/v2.1.0.tar.gz',
    proof: /HTTP 302/,
  }),
  tarballLeg('tarball-200-host', {
    // A package this project already depends on, from a host that answers exactly 200.
    url: () => {
      const hono = readPackageJson().dependencies?.hono ?? '4.13.4';
      return `https://registry.npmjs.org/hono/-/hono-${hono}.tgz`;
    },
    proof: /capability\.json not found/,
  }),
  {
    id: 'name-free',
    expect: 'info',
    async run(ctx) {
      const cwd = ctx.tmp('cwd-name-free');
      const res = await exec('npm', ['view', 'labelore', 'version'], { cwd, env: ctx.baseEnv(cwd) });
      const text = `${res.stdout}\n${res.stderr}`;
      const evidence = lineMatching(text, /E404|^\d+\.\d+\.\d+/) ?? firstLine(text);
      return { id: this.id, spec: 'npm view labelore version', expect: this.expect, outcome: 'info', evidence, ok: true };
    },
  },
];


// ---------------------------------------------------------------------------------------------
// Install mode and update mode (plan 14-07)
// ---------------------------------------------------------------------------------------------

const SNIPPET_BLOCK = /```bash\n([\s\S]*?)\n```/;
const SUBCOMMAND_SLOT = '<subcommand> [phase]';
const URL_LINE = /^Labelore URL: (http:\/\/127\.0\.0\.1:\d+\/.*)$/;
const RESTARTED_LINE = /^Restarted Labelore server \(/;

/** The one Bash block of the installed skill, which is what an agent would run. */
function readSnippet(installDir) {
  const text = readFileSync(join(installDir, 'skills', 'labelore', 'SKILL.md'), 'utf8');
  const match = SNIPPET_BLOCK.exec(text);
  if (!match || !match[1].includes(SUBCOMMAND_SLOT)) {
    throw new Error('the installed SKILL.md has no bash block with a <subcommand> [phase] slot');
  }
  return match[1];
}

/** Every entry under a directory with size and mtime, so any write shows up as a changed line. */
function treeListing(dir) {
  const lines = [];
  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      const rel = `${prefix}${entry.name}`;
      const info = lstatSync(full);
      lines.push(`${rel}|${entry.isDirectory() ? 'dir' : info.size}|${info.mtimeMs}`);
      if (entry.isDirectory()) walk(full, `${rel}/`);
    }
  };
  walk(dir, '');
  return lines.sort();
}

function hasNodeModules(dir) {
  return treeListing(dir).some((line) => /(^|\/)node_modules(\||\/)/.test(line));
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

async function waitGone(pid, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  return !isAlive(pid);
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function readServerState(stateDir) {
  try {
    return JSON.parse(readFileSync(join(stateDir, 'server.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * One run environment for the skill snippet: a throwaway GSD_HOME, project and launcher state dir,
 * and a shim dir whose npm and npx record their argv to calls.log and fail.
 */
function makeRun(ctx, { label, node }) {
  const home = ctx.tmp(`home-${label}`);
  const project = ctx.tmp(`project-${label}`);
  const state = ctx.tmp(`state-${label}`);
  const shim = ctx.tmp(`shim-${label}`);
  mkdirSync(join(project, '.planning'), { recursive: true });
  writeFileSync(join(project, '.planning', 'config.json'), '{}\n');
  writeFileSync(join(project, '.planning', 'PROJECT.md'), '# Proof project\n');
  for (const name of ['npm', 'npx']) {
    writeFileSync(join(shim, name), `#!/bin/sh\necho "${name} $*" >> "${join(shim, 'calls.log')}"\nexit 99\n`, { mode: 0o755 });
  }
  const env = {
    ...process.env,
    GSD_HOME: home,
    CLAUDE_PROJECT_DIR: project,
    LABELORE_STATE_DIR: state,
    PATH: `${shim}:${dirname(node)}:${process.env.PATH}`,
  };
  delete env.LABELORE_CONFIG_DIR;
  delete env.LABELORE_ATTACH_URL;
  const pids = new Set();
  const run = {
    home,
    project,
    state,
    shim,
    env,
    npmCalls() {
      const log = join(shim, 'calls.log');
      if (!existsSync(log)) return 0;
      return readFileSync(log, 'utf8').split('\n').filter(Boolean).length;
    },
    /** Run the installed skill's snippet with a subcommand; returns stdout and stderr lines. */
    async snippet(installDir, subcommand) {
      const script = readSnippet(installDir).replace(SUBCOMMAND_SLOT, subcommand);
      const res = await exec('bash', ['-c', script], { cwd: project, env });
      const lines = (text) => text.split('\n').map((line) => line.trimEnd()).filter(Boolean);
      const out = lines(res.stdout);
      const err = lines(res.stderr);
      const urls = out.map((line) => URL_LINE.exec(line)).filter(Boolean);
      const state2 = readServerState(state);
      if (state2?.pid) pids.add(state2.pid);
      return { status: res.status, out, err, url: urls[0]?.[1] ?? null, urlCount: urls.length };
    },
    async cleanup() {
      for (const pid of pids) {
        if (isAlive(pid)) {
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            // already gone
          }
          await waitGone(pid, 3000);
        }
      }
    },
  };
  ctx.onCleanup(() => run.cleanup());
  return run;
}

/** The checks that follow every `open`: URL answers, identity matches the state file. */
async function checkOpen(opened, run, problems, tag) {
  if (opened.status !== 0) problems.push(`${tag}: open exited ${opened.status}: ${opened.err.join(' / ') || opened.out.join(' / ')}`);
  if (opened.urlCount !== 1) problems.push(`${tag}: expected one Labelore URL line, got ${opened.urlCount}`);
  const extra = opened.out.filter((line) => !URL_LINE.test(line) && !/^labelore: running /.test(line));
  if (extra.length > 0) problems.push(`${tag}: unexpected stdout lines: ${extra.join(' / ')}`);
  if (!opened.url) return null;
  const origin = new URL(opened.url).origin;
  const page = await fetch(opened.url, { signal: AbortSignal.timeout(5000) }).catch((error) => ({ status: String(error) }));
  if (page.status !== 200) problems.push(`${tag}: GET ${opened.url} answered ${page.status}`);
  const identity = await getJson(`${origin}/api/identity`).catch((error) => ({ status: String(error), body: null }));
  const state = readServerState(run.state);
  if (identity.status !== 200 || identity.body?.app !== 'labelore') problems.push(`${tag}: /api/identity answered ${identity.status}`);
  else if (!state) problems.push(`${tag}: no server.json in the state dir`);
  else if (identity.body.instanceId !== state.instanceId || identity.body.pid !== state.pid) {
    problems.push(`${tag}: /api/identity (${identity.body.instanceId}, ${identity.body.pid}) differs from server.json (${state.instanceId}, ${state.pid})`);
  }
  return { origin, identity: identity.body, state };
}

/** One scope of install mode. Returns a result row and the list of failed assertions. */
async function proveScope(ctx, { spec, integrity, scope, node }) {
  const problems = [];
  const run = makeRun(ctx, { label: `install-${scope}`, node });
  const installCwd = scope === 'project' ? run.project : ctx.tmp(`cwd-install-${scope}`);
  const args = ['install', spec];
  if (integrity) args.push('--integrity', integrity);
  args.push('--scope', scope, '--yes');
  const installRes = await ctx.gsd(args, { home: run.home, cwd: installCwd });
  const row = { scope, installed: 'no', url: '-', npm: '-', files: '-', bytes: '-', node: '-' };
  if (installRes.status !== 0 || !/"status":\s*"installed"/.test(installRes.stdout)) {
    problems.push(`install: ${pickEvidence(installRes, 'refused', null)}`);
    return { row, problems };
  }
  row.installed = 'yes';
  const { row: listed } = await listedStatus(ctx, { home: run.home, cwd: installCwd, scope });
  if (!listed) problems.push('list: labelore is not in capability list');
  else if (scope === 'project' && listed.status !== 'active') problems.push(`list: project-scope status is ${listed.status}, not active`);

  const installDir = scope === 'project' ? join(run.project, '.gsd', 'capabilities', 'labelore') : ctx.installDir(run.home);
  const stats = dirStats(installDir);
  row.files = stats.files;
  row.bytes = stats.bytes;
  const before = treeListing(installDir);
  const nodeVersion = (await exec(node, ['--version'], { cwd: run.project, env: process.env })).stdout.trim();
  row.node = nodeVersion;

  try {
    const opened = await run.snippet(installDir, 'open');
    row.url = opened.url ?? '-';
    const seen = await checkOpen(opened, run, problems, 'open');
    if (seen?.state) {
      let exe = null;
      try {
        exe = realpathSync(`/proc/${seen.state.pid}/exe`);
      } catch (error) {
        problems.push(`open: cannot read /proc/${seen.state.pid}/exe: ${error.message}`);
      }
      if (exe && exe !== realpathSync(node)) problems.push(`open: the server runs ${exe}, not ${realpathSync(node)}`);
    }
    if (existsSync(join(run.state, 'build.log'))) problems.push('open: a build.log exists in the state dir');

    const again = await run.snippet(installDir, 'open');
    const seenAgain = await checkOpen(again, run, problems, 'reopen');
    if (seen?.state && seenAgain?.state && seen.state.pid !== seenAgain.state.pid) {
      problems.push(`reopen: the server pid changed from ${seen.state.pid} to ${seenAgain.state.pid}`);
    }
    if (again.err.some((line) => RESTARTED_LINE.test(line))) problems.push('reopen: a Restarted line was printed for an unchanged version');

    const stopped = await run.snippet(installDir, 'stop');
    if (stopped.status !== 0) problems.push(`stop: exited ${stopped.status}`);
    if (seen?.state) {
      if (!(await waitGone(seen.state.pid, 5000))) problems.push(`stop: pid ${seen.state.pid} still alive after 5 s`);
    }
    if (existsSync(join(run.state, 'server.json'))) problems.push('stop: server.json was not removed');
  } finally {
    await run.cleanup();
  }

  const calls = run.npmCalls();
  row.npm = calls;
  if (calls !== 0) problems.push(`${calls} npm or npx calls were recorded`);
  const after = treeListing(installDir);
  if (before.join('\n') !== after.join('\n')) problems.push('the install dir listing, sizes or mtimes changed during open and stop');
  if (hasNodeModules(installDir)) problems.push('a node_modules directory exists in the install dir');
  return { row, problems };
}

async function proveSpec(options) {
  const node = options.node ? resolve(options.node) : process.execPath;
  if (!existsSync(node)) fail(`--node ${node} does not exist`);
  const scopes = options.scope === 'both' ? ['global', 'project'] : [options.scope];
  const ctx = createContext({ keep: options.keep });
  const results = [];
  let before;
  let after;
  try {
    before = await ctx.gsdReal(['list', '--scope', 'global', '--json']);
    for (const scope of scopes) {
      note(`install scope ${scope} ...`);
      try {
        results.push(await proveScope(ctx, { spec: options.spec, integrity: options.integrity, scope, node }));
      } catch (error) {
        results.push({
          row: { scope, installed: 'error', url: '-', npm: '-', files: '-', bytes: '-', node: '-' },
          problems: [String(error?.stack ?? error)],
        });
      }
    }
    after = await ctx.gsdReal(['list', '--scope', 'global', '--json']);
  } finally {
    await ctx.dispose();
  }
  const lines = ['| scope | installed | url | npm calls | files | bytes | node |', '|---|---|---|---|---|---|---|'];
  for (const { row } of results) {
    lines.push(`| ${row.scope} | ${row.installed} | ${row.url} | ${row.npm} | ${row.files} | ${row.bytes} | ${row.node} |`);
  }
  const unchanged = before.status === after.status && before.stdout === after.stdout;
  process.stdout.write(`${lines.join('\n')}\n\nReal global capability list: ${unchanged ? 'unchanged' : 'CHANGED during this run'}.\n`);
  let failed = !unchanged;
  for (const { row, problems } of results) {
    for (const problem of problems) {
      failed = true;
      note(`FAIL ${row.scope}: ${problem}`);
    }
  }
  process.exitCode = failed ? 1 : 0;
}

function stageVersion(stage) {
  return JSON.parse(readFileSync(join(stage, 'capability.json'), 'utf8')).version;
}

/** The update leg: local-dir source, swap the source, `capability update`, check the restart. */
async function proveUpdate(options) {
  const from = resolve(options.updateFrom);
  const to = resolve(options.updateTo);
  for (const stage of [from, to]) {
    if (!existsSync(join(stage, 'capability.json'))) fail(`${stage} is not a release stage (no capability.json)`);
  }
  const fromVersion = stageVersion(from);
  const toVersion = stageVersion(to);
  if (fromVersion === toVersion) fail(`both stages are version ${fromVersion}; an update proof needs two versions`);
  const node = process.execPath;
  const ctx = createContext({ keep: options.keep });
  const problems = [];
  const report = [];
  let before;
  let after;
  try {
    before = await ctx.gsdReal(['list', '--scope', 'global', '--json']);
    const source = ctx.tmp('update-source');
    cpSync(from, source, { recursive: true });
    const run = makeRun(ctx, { label: 'update', node });
    const cwd = ctx.tmp('cwd-update');
    const installRes = await ctx.gsd(['install', source, '--scope', 'global', '--yes'], { home: run.home, cwd });
    if (installRes.status !== 0 || !/"status":\s*"installed"/.test(installRes.stdout)) {
      problems.push(`install of the ${fromVersion} source: ${pickEvidence(installRes, 'refused', null)}`);
    } else {
      const installDir = ctx.installDir(run.home);
      try {
        const first = await run.snippet(installDir, 'open');
        const seen = await checkOpen(first, run, problems, `open ${fromVersion}`);
        if (seen?.identity?.version !== fromVersion) problems.push(`open ${fromVersion}: /api/identity reports ${seen?.identity?.version}`);
        const oldPid = seen?.state?.pid ?? null;
        report.push(`open ${fromVersion}: ${first.url}, pid ${oldPid}`);

        // Swap the source for the newer release, as a maintainer rebuilding a local stage would.
        rmSync(source, { recursive: true, force: true });
        mkdirSync(source, { recursive: true });
        cpSync(to, source, { recursive: true });
        const updated = await ctx.gsd(['update', 'labelore', '--scope', 'global', '--yes'], { home: run.home, cwd });
        const updateText = `${updated.stdout}\n${updated.stderr}`;
        const upgradeLine = lineMatching(updateText, /upgraded/i) ?? firstLine(updateText);
        report.push(`capability update: ${upgradeLine}`);
        const parsed = parseJson(updated.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : (parsed?.updated?.[0] ?? parsed);
        const gotFrom = entry?.fromVersion ?? /"fromVersion":\s*"([^"]+)"/.exec(updated.stdout)?.[1];
        const gotTo = entry?.toVersion ?? /"toVersion":\s*"([^"]+)"/.exec(updated.stdout)?.[1];
        if (updated.status !== 0 || !/upgraded/.test(updated.stdout) || gotFrom !== fromVersion || gotTo !== toVersion) {
          problems.push(`update: expected an upgrade from ${fromVersion} to ${toVersion}, got: ${upgradeLine} (from ${gotFrom}, to ${gotTo})`);
        }

        const second = await run.snippet(installDir, 'open');
        const seen2 = await checkOpen(second, run, problems, `open ${toVersion}`);
        const restarted = second.err.filter((line) => RESTARTED_LINE.test(line));
        const want = `Restarted Labelore server (${fromVersion} → ${toVersion})`;
        if (restarted.length !== 1 || restarted[0] !== want) problems.push(`restart: expected exactly one "${want}", got ${JSON.stringify(restarted)}`);
        if (oldPid !== null && (await waitGone(oldPid, 5000)) === false) problems.push(`restart: old pid ${oldPid} is still alive`);
        if (seen2?.identity?.version !== toVersion) problems.push(`restart: /api/identity reports ${seen2?.identity?.version}, not ${toVersion}`);
        if (seen2?.state && seen2.state.pid === oldPid) problems.push('restart: the pid did not change');
        report.push(`open ${toVersion}: stderr ${JSON.stringify(restarted)}, pid ${seen2?.state?.pid}`);

        const third = await run.snippet(installDir, 'open');
        const seen3 = await checkOpen(third, run, problems, 'open again');
        if (third.err.some((line) => RESTARTED_LINE.test(line))) problems.push('open again: a Restarted line was printed');
        if (seen2?.state && seen3?.state && seen2.state.pid !== seen3.state.pid) problems.push('open again: the pid changed');
        const stopped = await run.snippet(installDir, 'stop');
        if (stopped.status !== 0) problems.push(`stop: exited ${stopped.status}`);
        if (seen3?.state && !(await waitGone(seen3.state.pid, 5000))) problems.push('stop: the server is still alive after 5 s');
        if (run.npmCalls() !== 0) problems.push(`${run.npmCalls()} npm or npx calls were recorded`);
      } finally {
        await run.cleanup();
      }
    }
    after = await ctx.gsdReal(['list', '--scope', 'global', '--json']);
  } finally {
    await ctx.dispose();
  }
  const unchanged = before.status === after.status && before.stdout === after.stdout;
  process.stdout.write(`${report.join('\n')}\n\nUpdate ${fromVersion} -> ${toVersion}: ${problems.length === 0 ? 'ok' : 'FAILED'}\nReal global capability list: ${unchanged ? 'unchanged' : 'CHANGED during this run'}.\n`);
  for (const problem of problems) note(`FAIL: ${problem}`);
  process.exitCode = problems.length > 0 || !unchanged ? 1 : 0;
}

function parseArgs(argv) {
  const options = {
    channels: false,
    only: null,
    json: false,
    keep: false,
    spec: null,
    integrity: null,
    scope: 'both',
    node: null,
    updateFrom: null,
    updateTo: null,
  };
  const value = (index, name) => {
    if (!argv[index] || argv[index].startsWith('--')) fail(`${name} needs a value`);
    return argv[index];
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--channels') options.channels = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--only') options.only = value((index += 1), arg);
    else if (arg === '--spec') options.spec = value((index += 1), arg);
    else if (arg === '--integrity') options.integrity = value((index += 1), arg);
    else if (arg === '--scope') options.scope = value((index += 1), arg);
    else if (arg === '--node') options.node = value((index += 1), arg);
    else if (arg === '--update-from') options.updateFrom = value((index += 1), arg);
    else if (arg === '--update-to') options.updateTo = value((index += 1), arg);
    else fail(`Unknown argument: ${arg}\n${usage()}`);
  }
  if (!['global', 'project', 'both'].includes(options.scope)) fail(`--scope must be global, project or both\n${usage()}`);
  return options;
}

function usage() {
  return [
    'Usage: node scripts/prove-install.mjs --channels [--only <leg>] [--json] [--keep]',
    '       node scripts/prove-install.mjs --spec <spec> [--integrity <sha512>] [--scope global|project|both] [--node <path>] [--keep]',
    '       node scripts/prove-install.mjs --update-from <stage> --update-to <stage> [--keep]',
  ].join('\n');
}

function table(results) {
  const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/\s+/g, ' ');
  const lines = ['| leg | spec | expect | outcome | evidence |', '|---|---|---|---|---|'];
  for (const r of results) {
    lines.push(`| ${cell(r.id)} | ${cell(r.spec)} | ${cell(r.expect)} | ${cell(r.outcome)} | ${cell(r.evidence)} |`);
  }
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const modes = [options.channels, options.spec !== null, options.updateFrom !== null || options.updateTo !== null];
  if (modes.filter(Boolean).length !== 1) fail(usage(), 2);
  if (!existsSync(GSD_TOOLS)) {
    fail(`gsd-tools not found at ${GSD_TOOLS}. Set GSD_TOOLS to the path of gsd-tools.cjs.`);
  }
  if (options.spec !== null) return proveSpec(options);
  if (options.updateFrom !== null || options.updateTo !== null) {
    if (!options.updateFrom || !options.updateTo) fail(`--update-from and --update-to go together\n${usage()}`, 2);
    return proveUpdate(options);
  }
  const legs = options.only ? LEGS.filter((leg) => leg.id === options.only) : LEGS;
  if (legs.length === 0) fail(`Unknown leg: ${options.only}. Legs: ${LEGS.map((leg) => leg.id).join(', ')}`);

  const ctx = createContext({ keep: options.keep });
  const onSignal = () => {
    ctx.dispose().finally(() => process.exit(130));
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const results = [];
  let before;
  let after;
  try {
    before = await ctx.gsdReal(['list', '--scope', 'global', '--json']);
    for (const leg of legs) {
      note(`leg ${leg.id} ...`);
      try {
        results.push(await leg.run(ctx));
      } catch (error) {
        results.push({ id: leg.id, spec: '', expect: leg.expect, outcome: 'error', evidence: String(error?.message ?? error), ok: false });
      }
    }
    after = await ctx.gsdReal(['list', '--scope', 'global', '--json']);
  } finally {
    await ctx.dispose();
  }

  const unchanged = before.status === after.status && before.stdout === after.stdout;
  const realLine = unchanged
    ? 'Real global capability list: unchanged (identical before and after this run).'
    : 'Real global capability list: CHANGED during this run.';
  if (options.json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    note(realLine);
  } else {
    process.stdout.write(`${table(results)}\n\n${realLine}\n`);
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of failed) note(`MISMATCH ${r.id}: expected ${r.expect}, got ${r.outcome}: ${r.evidence}`);
  process.exitCode = failed.length > 0 || !unchanged ? 1 : 0;
}

main().catch((error) => fail(String(error?.stack ?? error)));
