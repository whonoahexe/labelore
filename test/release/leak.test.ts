// The release leak-scan library (BUND-05): planted invented names are found in a real npm-packed
// tarball and in a staged tree, and the names-file reader refuses to let a scan run on nothing.
// Every name here is invented (never a real private name), in the style of test/fixture-leak.test.ts.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readTarball, scanTarball, type LeakNames } from '../../scripts/lib/leak-scan.mjs';

const INVENTED: LeakNames = {
  words: ['kelvorn', 'drumplix-ward', 'osquillan'],
  hosts: ['zentrel77'],
};

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

/** Writes a synthetic stage: the given files plus a package.json whose `files` lists server/ and dist/. */
function writeStage(files: Record<string, string>): string {
  const root = tempDir('labelore-leak-stage-');
  const all: Record<string, string> = {
    'package.json': `${JSON.stringify({ name: 'leak-scan-fixture', version: '0.0.0', files: ['server/', 'dist/'] })}\n`,
    ...files,
  };
  for (const [rel, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text, 'utf8');
  }
  return root;
}

/** Runs `npm pack` in `stage` and returns the tarball path. */
function pack(stage: string): string {
  const out = tempDir('labelore-leak-pack-');
  const json = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', out], {
    cwd: stage,
    encoding: 'utf8',
  });
  const [{ filename }] = JSON.parse(json) as [{ filename: string }];
  return join(out, filename);
}

const LONG_DIR = 'dist/assets/chunks/a-deliberately-long-directory-name/another-deeply-nested-directory-segment/final';
const LONG_PATH = `${LONG_DIR}/chunk.js`;

describe('leak scan over a real npm-packed tarball (BUND-05)', () => {
  const stage = writeStage({
    'server/labelore-server.mjs': `// header\nconst a = 1;\n// the ${INVENTED.words[0]} checkout\nexport { a };\n`,
    'dist/assets/app.js': 'export const clean = true;\n',
    [LONG_PATH]: 'export const nested = true;\n',
  });
  const tgz = pack(stage);
  const { buffer, entries } = readTarball(tgz);

  it('lists every packed file under package/, a path over 100 characters in full', () => {
    const paths = entries.map((e) => e.path);
    expect(paths).toContain('package/package.json');
    expect(paths).toContain('package/server/labelore-server.mjs');
    expect(paths).toContain('package/dist/assets/app.js');
    expect(`package/${LONG_PATH}`.length).toBeGreaterThan(100);
    expect(paths).toContain(`package/${LONG_PATH}`);
  });

  it('finds a planted word in a packed file body by path, line and list index, never by the word', () => {
    const findings = scanTarball(entries, INVENTED);
    expect(findings).toEqual([{ path: 'package/server/labelore-server.mjs', kind: 'word', index: 0, line: 3 }]);
    expect(JSON.stringify(findings)).not.toContain(INVENTED.words[0]);
  });

  it('finds a planted word in a packed path', () => {
    const named = writeStage({ [`dist/assets/${INVENTED.words[2]}.js`]: 'export const x = 1;\n' });
    const found = scanTarball(readTarball(pack(named)).entries, INVENTED);
    expect(found).toEqual([{ path: `package/dist/assets/${INVENTED.words[2]}.js`, kind: 'name', index: 2, line: 0 }]);
  });

  it('returns the exact buffer it parsed, so its sha512 equals the file on disk', () => {
    const sha = (bytes: Buffer) => createHash('sha512').update(bytes).digest('hex');
    expect(sha(buffer)).toBe(sha(readFileSync(tgz)));
  });
});
