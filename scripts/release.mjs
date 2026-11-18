#!/usr/bin/env node
/**
 * Labelore release script: builds the web app and the server bundle, stages only the allowlisted
 * runtime files, and verifies the stage.
 *
 *   node scripts/release.mjs --stage-only --dir <path>   build, copy, write, verify and smoke-start
 *                                                         one stage; never packs, never prints publish
 *                                                         commands, so it is not a release
 *
 * The script only ever reads the repository's package.json and capability.json (D-11), and it
 * never tags, pushes or publishes anything (D-04, D-10).
 *
 * It uses Node builtins only, like scripts/labelore.mjs.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIZE_BUDGET_BYTES, smokeStage, verifyStage } from './lib/stage-verify.mjs';

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
  copyInto(stage, 'scripts/release-readme.md', 'README.md');
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(join(REPO_ROOT, 'node_modules/vite/bin/vite.js'))) fail('vite is not installed: run npm ci first');
  if (options.stageOnly) {
    if (!options.dir) fail('--stage-only needs --dir <path>');
    await stageRelease(resolve(options.dir), readRepoJson('package.json').version);
    return;
  }
  fail('The full release run is not wired yet');
}

await main();
