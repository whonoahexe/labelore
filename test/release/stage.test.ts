// BUND-03 and BUND-04: the release script stages exactly the allowlisted runtime files, every
// verification gate can fail on a planted variant, and the staged bundle starts and reports the
// version baked into it. One real stage is built once; each variant is a copy of it.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readTarball, scanTarball, scanTree, type LeakNames } from '../../scripts/lib/leak-scan.mjs';
import {
  CONSENT_CAP_BYTES,
  RUNTIME_FILES,
  SIZE_BUDGET_BYTES,
  listStage,
  smokeStage,
  verifyPacked,
  verifyStage,
} from '../../scripts/lib/stage-verify.mjs';
import { buildStage, copyStage } from '../helpers/release-stage.ts';
import { REPO_ROOT, makeTempDir } from '../helpers/server-bundle.ts';

const repoPackageBefore = readFileSync(join(REPO_ROOT, 'package.json'), 'utf8');
const repoCapabilityBefore = readFileSync(join(REPO_ROOT, 'capability.json'), 'utf8');
const VERSION = (JSON.parse(repoPackageBefore) as { version: string }).version;

let stage = '';
const temps: string[] = [];

beforeAll(() => {
  stage = buildStage();
}, 180_000);

afterAll(() => {
  for (const dir of [stage, ...temps]) if (dir) rmSync(dir, { recursive: true, force: true });
});

/** Invented words (never real private names) that the real stage does not hold. */
const MADE_UP: LeakNames = { words: ['kelvorn', 'drumplix-ward'], hosts: ['zentrel77'] };

function release(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const run = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/release.mjs'), ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

/** `npm pack` of a stage into a fresh temp dir, the way the release does; returns the tarball and npm's report. */
function packStage(dir: string): { tgz: string; integrity: string } {
  const out = makeTempDir('labelore-pack');
  temps.push(out);
  const run = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', out], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  const [report] = JSON.parse(run.stdout) as { filename: string; integrity: string }[];
  return { tgz: join(out, report.filename), integrity: report.integrity };
}

/** Runs `plant` on a copy of the real stage, verifies the copy, and removes it. */
function verifyVariant(plant: (copy: string) => void): string[] {
  const copy = copyStage(stage);
  try {
    plant(copy);
    const result = verifyStage(copy, { version: VERSION });
    expect(result.ok).toBe(false);
    return result.problems;
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

describe('the staged tree (BUND-03)', () => {
  it('holds exactly the allowlisted runtime files and files under dist/', () => {
    const entries = listStage(stage);
    const files = entries.filter((entry) => entry.kind === 'file').map((entry) => entry.path);
    const outside = files.filter((path) => !path.startsWith('dist/')).sort();
    expect(outside).toEqual([...RUNTIME_FILES].sort());
    expect(files).toContain('dist/index.html');
    expect(files.filter((path) => path.split('/').includes('node_modules'))).toEqual([]);
    expect(files.filter((path) => path.endsWith('.map'))).toEqual([]);
    expect(entries.filter((entry) => entry.kind === 'symlink' || entry.kind === 'other')).toEqual([]);
  });

  it('has a package.json with the release shape and the repo version', () => {
    const pkg = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8')) as Record<string, unknown>;
    expect(pkg.name).toBe('labelore');
    expect(pkg.version).toBe(VERSION);
    expect(pkg.files).toEqual(['capability.json', 'skills/', 'scripts/', 'server/', 'dist/']);
    expect(pkg.engines).toEqual({ node: '>=22.18.0' });
    for (const field of ['bin', 'scripts', 'dependencies', 'devDependencies', 'private']) {
      expect(pkg).not.toHaveProperty(field);
    }
    const capability = JSON.parse(readFileSync(join(stage, 'capability.json'), 'utf8')) as { version: string };
    expect(capability.version).toBe(VERSION);
  });

  it('verifies, within the budget and below the consent cap', () => {
    const result = verifyStage(stage, { version: VERSION });
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.bytes).toBeLessThanOrEqual(SIZE_BUDGET_BYTES);
    expect(result.bytes).toBeLessThan(CONSENT_CAP_BYTES);
    expect(SIZE_BUDGET_BYTES).toBe(12_582_912);
    const regular = listStage(stage).filter((entry) => entry.kind === 'file');
    expect(result.files).toBe(regular.length);
    expect(result.bytes).toBe(regular.reduce((sum, entry) => sum + entry.size, 0));
  });

  it('never rewrote the repo package.json or capability.json', () => {
    expect(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).toBe(repoPackageBefore);
    expect(readFileSync(join(REPO_ROOT, 'capability.json'), 'utf8')).toBe(repoCapabilityBefore);
  });
});

describe('the size budget (BUND-04)', () => {
  it('passes at exactly its byte total and fails one byte under', () => {
    const { bytes } = verifyStage(stage, { version: VERSION });
    expect(verifyStage(stage, { version: VERSION, budgetBytes: bytes }).ok).toBe(true);
    const under = verifyStage(stage, { version: VERSION, budgetBytes: bytes - 1 });
    expect(under.ok).toBe(false);
    expect(under.problems.join('\n')).toContain('over its budget');
    expect(under.bytes).toBe(bytes);
  });
});

describe('a stage that breaks a gate fails with a named problem (BUND-03)', () => {
  it('rejects an extra top-level file', () => {
    const problems = verifyVariant((copy) => writeFileSync(join(copy, 'extra.txt'), 'x'));
    expect(problems.join('\n')).toContain('unexpected file outside dist/: extra.txt');
  });

  it('rejects a missing runtime file', () => {
    const problems = verifyVariant((copy) => rmSync(join(copy, 'LICENSE')));
    expect(problems.join('\n')).toContain('missing runtime file LICENSE');
  });

  it('rejects a sourcemap', () => {
    const problems = verifyVariant((copy) => writeFileSync(join(copy, 'dist/x.js.map'), '{}'));
    expect(problems.join('\n')).toContain('sourcemap in the stage: dist/x.js.map');
  });

  it('rejects a node_modules directory', () => {
    const problems = verifyVariant((copy) => {
      mkdirSync(join(copy, 'dist/node_modules/dep'), { recursive: true });
      writeFileSync(join(copy, 'dist/node_modules/dep/index.js'), 'x');
    });
    expect(problems.join('\n')).toContain('node_modules in the stage');
  });

  it('rejects a symlink under dist/', () => {
    const problems = verifyVariant((copy) => symlinkSync(join(copy, 'dist/index.html'), join(copy, 'dist/link.html')));
    expect(problems.join('\n')).toContain('symlink in the stage: dist/link.html');
  });

  it('rejects a bundle that imports vite', () => {
    const problems = verifyVariant((copy) => {
      const path = join(copy, 'server/labelore-server.mjs');
      writeFileSync(path, `import "vite";\n${readFileSync(path, 'utf8')}`);
    });
    expect(problems.join('\n')).toContain('reaches for vite: vite');
  });

  it('rejects a bundle with a static import of a package', () => {
    const problems = verifyVariant((copy) => {
      const path = join(copy, 'server/labelore-server.mjs');
      writeFileSync(path, `import { Hono } from "hono";\n${readFileSync(path, 'utf8')}`);
    });
    expect(problems.join('\n')).toContain('statically imports a non-builtin: hono');
  });

  it('rejects a bundle with a dynamic import of a package, and names a vite require', () => {
    const problems = verifyVariant((copy) => {
      const path = join(copy, 'server/labelore-server.mjs');
      writeFileSync(path, `${readFileSync(path, 'utf8')}\nawait import("hono");\nrequire("vite/client");\n`);
    });
    const text = problems.join('\n');
    expect(text).toContain('dynamically imports a non-builtin: hono');
    expect(text).toContain('reaches for vite: vite/client');
  });

  it('rejects a stage package.json with a bin field', () => {
    const problems = verifyVariant((copy) => {
      const path = join(copy, 'package.json');
      const pkg = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      writeFileSync(path, JSON.stringify({ ...pkg, bin: { labelore: 'scripts/labelore.mjs' } }));
    });
    expect(problems.join('\n')).toContain('package.json holds a bin field');
  });

  it('rejects a capability.json whose version differs from package.json', () => {
    const problems = verifyVariant((copy) => {
      const path = join(copy, 'capability.json');
      const capability = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      writeFileSync(path, JSON.stringify({ ...capability, version: '0.0.0-planted' }));
    });
    expect(problems.join('\n')).toContain('capability.json version');
  });
});

describe('the staged bundle starts (BUND-03 version agreement)', () => {
  it('answers /api/identity with the package.json version and / with the stage dist/index.html', async () => {
    const result = await smokeStage(stage, VERSION);
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  }, 60_000);

  it('fails when the expected version differs from the baked one', async () => {
    const result = await smokeStage(stage, '0.0.0-planted');
    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toContain('/api/identity version');
  }, 60_000);
});

describe('the leak scans of the stage and the packed tarball (BUND-05)', () => {
  it('scans the real stage clean with an invented list', () => {
    expect(scanTree(stage, MADE_UP)).toEqual([]);
  });

  it('finds an invented word planted in the bundle, in the stage and inside the packed tarball', () => {
    const copy = copyStage(stage);
    try {
      const path = join(copy, 'server/labelore-server.mjs');
      writeFileSync(path, `${readFileSync(path, 'utf8')}\n// planted: kelvorn\n`);
      const found = scanTree(copy, MADE_UP);
      expect(found.map((f) => [f.path, f.kind, f.index])).toEqual([['server/labelore-server.mjs', 'word', 0]]);
      const { tgz } = packStage(copy);
      const { entries } = readTarball(tgz);
      expect(scanTarball(entries, MADE_UP).map((f) => [f.path, f.kind, f.index])).toEqual([
        ['package/server/labelore-server.mjs', 'word', 0],
      ]);
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('the packed tarball against its stage (BUND-05)', () => {
  let tgz = '';
  let integrity = '';
  let buffer: Buffer = Buffer.alloc(0);

  beforeAll(() => {
    ({ tgz, integrity } = packStage(stage));
    ({ buffer } = readTarball(tgz));
  }, 120_000);

  it('hashes to the integrity npm reported and lists exactly the stage files', () => {
    expect(`sha512-${createHash('sha512').update(buffer).digest('base64')}`).toBe(integrity);
    expect(buffer.equals(readFileSync(tgz))).toBe(true);
    const result = verifyPacked(buffer, listStage(stage), integrity);
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails when the integrity differs', () => {
    const result = verifyPacked(buffer, listStage(stage), `sha512-${Buffer.alloc(64).toString('base64')}`);
    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toContain('npm pack reported');
  });

  it('fails when the stage listing has an entry the tarball lacks, or lacks one the tarball holds', () => {
    const listing = listStage(stage);
    const extra = [...listing, { path: 'dist/never-packed.js', size: 1, kind: 'file' as const }];
    const lacks = verifyPacked(buffer, extra, integrity);
    expect(lacks.ok).toBe(false);
    expect(lacks.problems.join('\n')).toContain('the tarball lacks dist/never-packed.js');
    const adds = verifyPacked(buffer, listing.filter((entry) => entry.path !== 'LICENSE'), integrity);
    expect(adds.ok).toBe(false);
    expect(adds.problems.join('\n')).toContain('the tarball adds LICENSE');
  });
});

describe('the release script', () => {
  it('leaves no leftover from an earlier run in the stage dir', () => {
    const dir = makeTempDir('labelore-stage-rerun');
    temps.push(dir);
    writeFileSync(join(dir, 'leftover.txt'), 'left behind by an interrupted run');
    const run = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/release.mjs'), '--stage-only', '--dir', dir], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toMatch(/^stage: .+ files=\d+ bytes=\d+ \(\d+\.\d\d MiB of 12 MiB budget\)$/m);
    expect(existsSync(join(dir, 'leftover.txt'))).toBe(false);
    expect(verifyStage(dir, { version: VERSION }).ok).toBe(true);
  }, 180_000);

  it('refuses to empty the repository or a directory that holds it', () => {
    const run = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/release.mjs'), '--stage-only', '--dir', REPO_ROOT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Refusing to empty');
    expect(existsSync(join(REPO_ROOT, 'package.json'))).toBe(true);
  });

  it('refuses a full run without a usable private-names file, before any build', () => {
    const dir = makeTempDir('labelore-names');
    temps.push(dir);
    const empty = join(dir, 'empty.json');
    writeFileSync(empty, JSON.stringify({ words: [], hosts: [] }));
    const broken = join(dir, 'broken.json');
    writeFileSync(broken, '{ not json');
    for (const names of [join(dir, 'missing.json'), empty, broken]) {
      const run = release(['--names', names]);
      expect(run.status, names).toBe(1);
      expect(run.stderr).toContain(names);
      expect(run.stdout).toBe('');
    }
  });

  it('refuses a version and tag that disagree, before any build, and rewrites nothing', () => {
    const dir = makeTempDir('labelore-names');
    temps.push(dir);
    const names = join(dir, 'names.json');
    writeFileSync(names, JSON.stringify(MADE_UP));
    const run = release(['--names', names, '--tag', 'v0.0.0-nope']);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('v0.0.0-nope');
    expect(run.stderr).toContain(VERSION);
    expect(run.stdout).toBe('');
    expect(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).toBe(repoPackageBefore);
    expect(readFileSync(join(REPO_ROOT, 'capability.json'), 'utf8')).toBe(repoCapabilityBefore);
  });

  it('holds no quoted publish, push or tag string literal', () => {
    const source = readFileSync(join(REPO_ROOT, 'scripts/release.mjs'), 'utf8');
    expect(source.match(/['"](?:publish|push|tag)['"]/g) ?? []).toEqual([]);
  });

  it('is run by the release npm script', () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(manifest.scripts.release).toBe('node scripts/release.mjs');
  });
});
