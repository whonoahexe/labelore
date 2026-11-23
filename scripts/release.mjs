#!/usr/bin/env node
/**
 * Labelore release script: builds the web app and the server bundle, stages only the allowlisted
 * runtime files, verifies and leak-scans the stage, packs it, checks and scans the packed bytes, and
 * prints the commands for the maintainer to run.
 *
 *   node scripts/release.mjs [--tag <tag>] [--names <file>]   the full run, cheapest refusals first:
 *       private-names file, version and tag agreement, the tag's commit, a clean tree, then build,
 *       stage, verify, smoke-start, scan, pack, check the tarball, scan the tarball, print
 *   node scripts/release.mjs --stage-only --dir <path>        build, copy, write, verify and
 *       smoke-start one stage; never reads the names file, never packs and never prints publish
 *       commands, so it is not a release
 *
 * The script only ever reads the repository's package.json and capability.json (D-11), and it
 * never tags, pushes or publishes anything: it prints those commands as text for the maintainer
 * to run (D-04, D-10). It reads no npm token.
 *
 * It uses Node builtins only, like scripts/labelore.mjs.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNamesFile, readTarball, scanTarball, scanTree } from './lib/leak-scan.mjs';
import { SIZE_BUDGET_BYTES, listStage, smokeStage, verifyPacked, verifyStage } from './lib/stage-verify.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIB = 1024 * 1024;

function note(message) {
  process.stderr.write(`${message}\n`);
}

function fail(message, code = 1) {
  note(message);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { stageOnly: false, dir: null, tag: null, names: null };
  const valueOf = (flag, index) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) fail(`${flag} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--stage-only') options.stageOnly = true;
    else if (arg === '--dir') options.dir = valueOf(arg, i++);
    else if (arg === '--tag') options.tag = valueOf(arg, i++);
    else if (arg === '--names') options.names = valueOf(arg, i++);
    else fail(`Unknown option: ${arg}`);
  }
  return options;
}

function readRepoJson(name) {
  return JSON.parse(readFileSync(join(REPO_ROOT, name), 'utf8'));
}

/** Empties `dir` and recreates it, so a leftover from an interrupted run never reaches the next one.
 * Refuses the repository itself and anything that contains it. */
function emptyDir(dir) {
  const rel = relative(dir, REPO_ROOT);
  if (rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep))) {
    fail(`Refusing to empty ${dir}: it is the repository or holds it`);
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function build(args) {
  const result = spawnSync(process.execPath, [join(REPO_ROOT, 'node_modules/vite/bin/vite.js'), 'build', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(`vite build ${args.join(' ')} failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`);
  }
}

function copyInto(stage, from, to) {
  const target = join(stage, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(REPO_ROOT, from), target);
}

/** The package.json the stage ships (RESEARCH: verified to pack to exactly the staged file set). */
function stagePackage(version) {
  return {
    name: 'labelore',
    version,
    description: "Read-only dashboard for a GSD project's .planning/",
    license: 'MIT',
    type: 'module',
    engines: { node: '>=22.18.0' },
    repository: { type: 'git', url: 'git+https://github.com/whonoahexe/labelore.git' },
    files: ['capability.json', 'skills/', 'scripts/', 'server/', 'dist/'],
  };
}

function mib(bytes) {
  return (bytes / MIB).toFixed(2);
}

/** Builds both bundles into an emptied `stage`, copies the allowlist, writes the stage package.json,
 * then verifies and smoke-starts it. Exits 1 listing every problem. Returns `{ bytes, files }`. */
async function stageRelease(stage, version) {
  emptyDir(stage);
  build(['--outDir', join(stage, 'dist'), '--emptyOutDir']);
  build(['-c', 'vite.server.config.ts', '--outDir', join(stage, 'server'), '--emptyOutDir']);
  copyInto(stage, 'capability.json', 'capability.json');
  copyInto(stage, 'LICENSE', 'LICENSE');
  copyInto(stage, 'scripts/labelore.mjs', 'scripts/labelore.mjs');
  copyInto(stage, 'skills/labelore/SKILL.md', 'skills/labelore/SKILL.md');
  copyInto(stage, 'README.md', 'README.md');
  writeFileSync(join(stage, 'package.json'), `${JSON.stringify(stagePackage(version), null, 2)}\n`);

  const verified = verifyStage(stage, { version });
  if (!verified.ok) fail(`The stage failed verification:\n${verified.problems.map((p) => `  - ${p}`).join('\n')}`);
  const smoke = await smokeStage(stage, version);
  if (!smoke.ok) fail(`The staged bundle failed its start check:\n${smoke.problems.map((p) => `  - ${p}`).join('\n')}`);
  console.log(
    `stage: ${stage} files=${verified.files} bytes=${verified.bytes} (${mib(verified.bytes)} MiB of ${SIZE_BUDGET_BYTES / MIB} MiB budget)`,
  );
  return { bytes: verified.bytes, files: verified.files };
}

function git(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return { status: result.status, stdout: (result.stdout ?? '').trim() };
}

function describeFindings(label, findings) {
  const lines = findings.map((f) => `  - ${f.path}:${f.line} ${f.kind} #${f.index}`);
  return `${label} holds private names (listed by position in the names file, never by word):\n${lines.join('\n')}`;
}

/** The checks that need nothing built, cheapest first: the names file, the versions and tag, the
 * tag's commit, a clean tree. Returns `{ version, tag, names }`. */
function preflight(options) {
  let names;
  const namesPath = resolve(options.names ?? join(REPO_ROOT, '.leak-names.local.json'));
  try {
    names = readNamesFile(namesPath);
  } catch (error) {
    fail(`The private-names file cannot be used, so there is no release: ${error instanceof Error ? error.message : String(error)}`);
  }

  const version = readRepoJson('package.json').version;
  const capabilityVersion = readRepoJson('capability.json').version;
  const tag = options.tag ?? `v${version}`;
  const tagVersion = tag.replace(/^v/, '');
  if (version !== capabilityVersion || version !== tagVersion) {
    fail(
      `The versions disagree: package.json ${version}, capability.json ${capabilityVersion}, tag ${tag} (${tagVersion}). ` +
        'The release script never rewrites a version; fix them and run it again.',
    );
  }

  const tagCommit = git(['rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`]);
  if (tagCommit.status === 0) {
    const head = git(['rev-parse', 'HEAD']);
    if (head.status !== 0 || head.stdout !== tagCommit.stdout) {
      fail(`The tag ${tag} already exists and does not point at HEAD (${tagCommit.stdout.slice(0, 12)} against ${head.stdout.slice(0, 12)}).`);
    }
  }

  const status = git(['status', '--porcelain']);
  if (status.status !== 0) fail('git status failed');
  if (status.stdout !== '') fail(`The working tree is not clean; commit or remove these first:\n${status.stdout}`);
  return { version, tag, names };
}

/** Packs the stage into an emptied `out` with npm's own pack (no scripts run) and returns its report. */
function packStage(stage, out) {
  emptyDir(out);
  const pack = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', out], {
    cwd: stage,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (pack.status !== 0) fail(`npm pack failed (exit ${pack.status})\n${pack.stdout}\n${pack.stderr}`);
  let report;
  try {
    [report] = JSON.parse(pack.stdout);
  } catch {
    fail(`npm pack printed no JSON report\n${pack.stdout}`);
  }
  if (!report || typeof report.filename !== 'string' || typeof report.integrity !== 'string') {
    fail(`npm pack's report lacks a filename or an integrity\n${pack.stdout}`);
  }
  return report;
}

async function fullRun(options) {
  const { version, tag, names } = preflight(options);
  if (!existsSync(join(REPO_ROOT, 'node_modules/vite/bin/vite.js'))) fail('vite is not installed: run npm ci first');
  const stage = join(REPO_ROOT, 'release');
  const out = join(REPO_ROOT, 'out');
  const staged = await stageRelease(stage, version);

  const treeFindings = scanTree(stage, names);
  if (treeFindings.length > 0) fail(describeFindings('The staged tree', treeFindings));

  const report = packStage(stage, out);
  const tarball = join(out, report.filename);
  const { buffer, entries } = readTarball(tarball);
  const packed = verifyPacked(buffer, listStage(stage), report.integrity);
  if (!packed.ok) fail(`The packed tarball failed verification:\n${packed.problems.map((p) => `  - ${p}`).join('\n')}`);
  const tarFindings = scanTarball(entries, names);
  if (tarFindings.length > 0) fail(describeFindings('The packed tarball', tarFindings));

  const publish = version.includes('-') ? `npm publish ${tarball} --tag next` : `npm publish ${tarball}`;
  console.log(`stage files: ${staged.files}`);
  console.log(`stage bytes: ${staged.bytes} (${mib(staged.bytes)} MiB)`);
  console.log(`packed size: ${report.size} bytes (${report.entryCount} entries, ${report.unpackedSize} bytes unpacked)`);
  console.log(`integrity: ${report.integrity}`);
  console.log(`tarball: ${tarball}`);
  console.log('');
  console.log('Nothing was tagged, pushed or published. To release, run:');
  console.log(`  git tag -a ${tag} -m "labelore ${version}"`);
  console.log(`  ${publish}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.stageOnly) {
    if (!options.dir) fail('--stage-only needs --dir <path>');
    if (!existsSync(join(REPO_ROOT, 'node_modules/vite/bin/vite.js'))) fail('vite is not installed: run npm ci first');
    await stageRelease(resolve(options.dir), readRepoJson('package.json').version);
    return;
  }
  if (options.dir) fail('--dir is only for --stage-only; a full run stages into release/');
  await fullRun(options);
}

await main();
