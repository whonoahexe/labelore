#!/usr/bin/env node
/**
 * Install-channel spike harness. A maintainer tool, never shipped.
 *
 *   node scripts/prove-install.mjs --channels [--only <leg>] [--json] [--keep]
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

function parseArgs(argv) {
  const options = { channels: false, only: null, json: false, keep: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--channels') options.channels = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--only') {
      index += 1;
      if (!argv[index]) fail('--only needs a leg id');
      options.only = argv[index];
    } else fail(`Unknown argument: ${arg}\n${usage()}`);
  }
  return options;
}

function usage() {
  return 'Usage: node scripts/prove-install.mjs --channels [--only <leg>] [--json] [--keep]';
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
  if (!options.channels) fail(usage(), 2);
  if (!existsSync(GSD_TOOLS)) {
    fail(`gsd-tools not found at ${GSD_TOOLS}. Set GSD_TOOLS to the path of gsd-tools.cjs.`);
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
