// The release leak-scan library (BUND-05): planted invented names are found in a real npm-packed
// tarball and in a staged tree, and the names-file reader refuses to let a scan run on nothing.
// Every name here is invented (never a real private name), in the style of test/fixture-leak.test.ts.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { readNamesFile, readTarball, scanTarball, scanTree, type LeakNames } from '../../scripts/lib/leak-scan.mjs';

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

/** Writes a tree of relative paths to bytes or text under a new temp dir. */
function writeTree(files: Record<string, string | Buffer>): string {
  const root = tempDir('labelore-leak-tree-');
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return root;
}

describe('leak scan over a staged tree (BUND-05)', () => {
  const [, hyphenated] = INVENTED.words;
  const spacedUpper = hyphenated.replace('-', ' ').toUpperCase();

  it('finds a word in content, a word in a file name, a host, and a spaced upper-case hyphenated word', () => {
    const root = writeTree({
      'a/content.md': `first line\nthe ${INVENTED.words[0]} checkout\n`,
      [`b/${INVENTED.words[2]}-notes.md`]: 'harmless body\n',
      'c/host.md': `ssh to ${INVENTED.hosts[0]} now\n`,
      'd/spaced.md': `See ${spacedUpper} for details.\n`,
    });
    expect(scanTree(root, INVENTED)).toEqual([
      { path: 'a/content.md', kind: 'word', index: 0, line: 2 },
      { path: `b/${INVENTED.words[2]}-notes.md`, kind: 'name', index: 2, line: 0 },
      { path: 'c/host.md', kind: 'host', index: 0, line: 1 },
      { path: 'd/spaced.md', kind: 'word', index: 1, line: 1 },
    ]);
  });

  it('respects word boundaries and gives no findings on a clean tree', () => {
    const root = writeTree({
      'ok.md': `${INVENTED.words[0]}ish and un${INVENTED.words[2]} are other words\n`,
      'dir/plain.ts': 'export {};\n',
    });
    expect(scanTree(root, INVENTED)).toEqual([]);
  });

  it('scans a file with a NUL in its first 8000 bytes by path only', () => {
    const body = Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(`\n${INVENTED.words[0]}\n`)]);
    const root = writeTree({ 'bin/data.bin': body, [`bin/${INVENTED.words[0]}.bin`]: body });
    expect(scanTree(root, INVENTED)).toEqual([{ path: `bin/${INVENTED.words[0]}.bin`, kind: 'name', index: 0, line: 0 }]);
  });
});

describe('the names-file reader refuses a scan with nothing to look for (BUND-05, D-09)', () => {
  const dir = tempDir('labelore-leak-names-');
  const write = (name: string, text: string): string => {
    const path = join(dir, name);
    writeFileSync(path, text, 'utf8');
    return path;
  };

  it('refuses a missing file, naming it', () => {
    const path = join(dir, 'absent.json');
    expect(() => readNamesFile(path)).toThrow(`${path} is missing`);
  });

  it('refuses unparseable JSON, naming the file', () => {
    const path = write('bad.json', '{not json');
    expect(() => readNamesFile(path)).toThrow(`${path} is not valid JSON`);
  });

  it('refuses a non-string entry, naming the file', () => {
    const path = write('typed.json', '{"words": ["a-b", 7], "hosts": []}');
    expect(() => readNamesFile(path)).toThrow(path);
  });

  it('refuses an empty words list, saying the list is empty', () => {
    const path = write('empty.json', '{"words": [], "hosts": []}');
    expect(() => readNamesFile(path)).toThrow(`${path} lists no private words`);
  });

  it('accepts words with an empty hosts list', () => {
    const path = write('ok.json', `{"words": ["${INVENTED.words[0]}"], "hosts": []}`);
    expect(readNamesFile(path)).toEqual({ words: [INVENTED.words[0]], hosts: [] });
  });
});

describe('the tarball reader refuses link entries (BUND-05)', () => {
  /** One 512-byte ustar header (valid checksum) of the given typeflag and no body, then two zero blocks. */
  function tinyTar(name: string, typeflag: string): Buffer {
    const header = Buffer.alloc(512);
    header.write(name, 0, 'utf8');
    header.write('0000644\0', 100, 'ascii');
    header.write('00000000000\0', 124, 'ascii');
    header.write(typeflag, 156, 'ascii');
    header.write('ustar\0', 257, 'ascii');
    header.fill(0x20, 148, 156);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'ascii');
    return Buffer.concat([header, Buffer.alloc(1024)]);
  }

  it('throws on a symlink entry, naming it', () => {
    const path = join(tempDir('labelore-leak-link-'), 'link.tgz');
    writeFileSync(path, gzipSync(tinyTar('package/escape-link', '2')));
    expect(() => readTarball(path)).toThrow('package/escape-link');
  });

  it('throws on a hard-link entry, naming it', () => {
    const path = join(tempDir('labelore-leak-link-'), 'hard.tgz');
    writeFileSync(path, gzipSync(tinyTar('package/hard-link', '1')));
    expect(() => readTarball(path)).toThrow('package/hard-link');
  });

  it('reads a plain file entry from the same hand-built shape', () => {
    const path = join(tempDir('labelore-leak-link-'), 'file.tgz');
    writeFileSync(path, gzipSync(tinyTar('package/plain.txt', '0')));
    expect(readTarball(path).entries.map((e) => e.path)).toEqual(['package/plain.txt']);
  });
});
