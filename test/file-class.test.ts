// The file-class policy (Phase 7: D-09, D-10, D-11) decided before any read: the pure table, then the
// same decisions through discovery over an in-memory port that holds real bytes. Nothing here touches
// the disk; the Shapes project is exercised end to end in recognition-classes.test.ts.
import { describe, expect, it } from 'vitest';
import {
  BINARY_EXTENSIONS,
  IMAGE_EXTENSIONS,
  INTERNAL_EXCLUSION_REASON,
  MAX_TEXT_BYTES,
  SNIFF_BYTES,
  TEXT_EXTENSIONS,
  classifyFile,
  extensionOf,
  isInternalPath,
  needsHeadSniff,
} from '../src/planning-repo/file-class.ts';
import { discover } from '../src/planning-repo/discovery.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import type { FileRead } from '../src/planning-fs/types.ts';
import { buildSearchDocuments } from '../src/server/search-index.ts';

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

/** A head of `length` ASCII bytes with a NUL placed at `nulAt` (or none). */
function headWithNul(length: number, nulAt: number | null): Uint8Array {
  const head = new Uint8Array(length).fill(0x61);
  if (nulAt !== null) head[nulAt] = 0;
  return head;
}

/** An in-memory port that records which paths were read and which were head-sniffed. */
class SpyMemoryFs extends InMemoryPlanningFilesystem {
  readonly reads: string[] = [];
  readonly heads: string[] = [];
  override async read(relPath: string): Promise<FileRead> {
    this.reads.push(relPath);
    return super.read(relPath);
  }
  override async readHead(relPath: string, maxBytes: number): Promise<Uint8Array> {
    this.heads.push(relPath);
    return super.readHead(relPath, maxBytes);
  }
}

describe('extensionOf', () => {
  it('lowercases the text after the last dot', () => {
    expect(extensionOf('KILN.PNG')).toBe('png');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
  });

  it('is null for no extension, a leading-dot-only name and a trailing dot', () => {
    expect(extensionOf('kiln-log')).toBeNull();
    expect(extensionOf('.gitignore')).toBeNull();
    expect(extensionOf('name.')).toBeNull();
  });
});

describe('classifyFile - by extension, with no head needed', () => {
  it('classes image extensions as image, whatever the case', () => {
    for (const name of ['kiln.png', 'KILN.PNG', 'map.svg', 'photo.JPEG', 'icon.ico']) {
      expect(classifyFile({ name, size: 10, head: undefined }), name).toBe('image');
    }
  });

  it('classes known binary extensions as binary', () => {
    for (const name of ['sheet.pdf', 'font.woff2', 'db.sqlite', 'bundle.zip', 'clip.MP4']) {
      expect(classifyFile({ name, size: 10, head: undefined }), name).toBe('binary');
    }
  });

  it('classes known text extensions as text', () => {
    for (const name of ['notes.md', 'data.json', 'page.html', 'run.sh', 'LOG.TXT']) {
      expect(classifyFile({ name, size: 10, head: undefined }), name).toBe('text');
    }
  });

  it('keeps the three extension sets disjoint', () => {
    for (const ext of IMAGE_EXTENSIONS) {
      expect(BINARY_EXTENSIONS.has(ext), `${ext} in binary`).toBe(false);
      expect(TEXT_EXTENSIONS.has(ext), `${ext} in text`).toBe(false);
    }
    for (const ext of BINARY_EXTENSIONS) expect(TEXT_EXTENSIONS.has(ext), `${ext} in text`).toBe(false);
  });
});

describe('classifyFile - the bounded NUL sniff for an unknown or missing extension', () => {
  it('is binary when a NUL sits at the last index of the window', () => {
    expect(classifyFile({ name: 'odd', size: 8_000, head: headWithNul(SNIFF_BYTES, SNIFF_BYTES - 1) })).toBe('binary');
  });

  it('is text when the only NUL sits just past the window, even if the head handed over is longer', () => {
    expect(classifyFile({ name: 'odd', size: 8_001, head: headWithNul(SNIFF_BYTES + 1, SNIFF_BYTES) })).toBe('text');
  });

  it('is text for UTF-8 with non-ASCII characters and no NUL', () => {
    const head = new TextEncoder().encode('Glasur — céladon, 玉');
    expect(classifyFile({ name: 'notes', size: head.length, head })).toBe('text');
  });

  it('is binary for a UTF-16LE head, which carries NUL bytes', () => {
    const head = bytes(0x6b, 0x00, 0x69, 0x00, 0x6c, 0x00, 0x6e, 0x00);
    expect(classifyFile({ name: 'wide.dat', size: head.length, head })).toBe('binary');
  });

  it('is text for a zero-byte head', () => {
    expect(classifyFile({ name: 'empty', size: 0, head: new Uint8Array(0) })).toBe('text');
  });

  it('never sniffs a name whose extension already decides the class', () => {
    expect(classifyFile({ name: 'notes.md', size: 4, head: bytes(0, 0, 0, 0) })).toBe('text');
  });
});

describe('classifyFile - the text size cap', () => {
  it('keeps a text file of exactly MAX_TEXT_BYTES as text and calls one byte more large', () => {
    expect(MAX_TEXT_BYTES).toBe(1_048_576);
    expect(classifyFile({ name: 'big.md', size: MAX_TEXT_BYTES, head: undefined })).toBe('text');
    expect(classifyFile({ name: 'big.md', size: MAX_TEXT_BYTES + 1, head: undefined })).toBe('large');
  });

  it('applies the cap to an unknown extension after the sniff finds no NUL', () => {
    expect(classifyFile({ name: 'big', size: MAX_TEXT_BYTES + 1, head: headWithNul(SNIFF_BYTES, null) })).toBe('large');
  });

  it('never makes an image or a binary large', () => {
    expect(classifyFile({ name: 'huge.png', size: MAX_TEXT_BYTES * 20, head: undefined })).toBe('image');
    expect(classifyFile({ name: 'huge.pdf', size: MAX_TEXT_BYTES * 20, head: undefined })).toBe('binary');
  });
});

describe('needsHeadSniff', () => {
  it('is true only when the extension is in none of the image, binary and known-text sets', () => {
    for (const name of ['odd', 'kiln-curve.dat', 'x.weird', '.hidden']) expect(needsHeadSniff(name), name).toBe(true);
    for (const name of ['a.png', 'a.pdf', 'a.md', 'a.JSON']) expect(needsHeadSniff(name), name).toBe(false);
  });
});

describe('isInternalPath - position-scoped GSD bookkeeping', () => {
  it('is true for the root-only file names', () => {
    const names = [
      'state.json',
      'skill-manifest.json',
      'estimation-calibration.json',
      'milestone.lock',
      'STATE.md.lock',
      '.WINDOWS.lock',
      'WAITING.json',
      'agent-history.json',
      'current-agent-id.txt',
      'active-workstream',
      '.gsd-trace.jsonl',
      '.mempalace-stage',
      '.active-skill',
      'STATE.md.bak',
      '.gsd-ws-arg',
      '.gsd-allow-shrink',
    ];
    for (const name of names) expect(isInternalPath(name, false), name).toBe(true);
  });

  it('is true for the root directories tmp, async-jobs and logs', () => {
    for (const dir of ['tmp', 'async-jobs', 'logs']) expect(isInternalPath(dir, true), dir).toBe(true);
  });

  it('is true for a .lock or .tmp file at any depth, whatever its case', () => {
    expect(isInternalPath('WINDOWS.md.4242.tmp', false)).toBe(true);
    expect(isInternalPath('phases/01-x/plan.lock', false)).toBe(true);
    expect(isInternalPath('notes/draft.TMP', false)).toBe(true);
  });

  it('is false for the same names one level down', () => {
    expect(isInternalPath('sketches/001-shelf-board/state.json', false)).toBe(false);
    expect(isInternalPath('phases/01-x/tmp', true)).toBe(false);
    expect(isInternalPath('notes/milestone.lock.md', false)).toBe(false);
  });

  it('compares exact names byte for byte, so STATE.JSON at the root is not internal', () => {
    expect(isInternalPath('STATE.JSON', false)).toBe(false);
    expect(isInternalPath('Milestone.Lock', false)).toBe(true);
  });

  it('never marks config.json, HANDOFF.json or .continue-here.md internal', () => {
    for (const name of ['config.json', 'HANDOFF.json', '.continue-here.md']) expect(isInternalPath(name, false), name).toBe(false);
  });
});

const PROJECT_MD = '# Solo\n\n## What This Is\nOne file.\n';

describe('discovery through the in-memory port', () => {
  it('classes a head with a NUL inside the window as binary and one with the NUL past it as text', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': PROJECT_MD,
      '.planning/notes/inside': headWithNul(SNIFF_BYTES, SNIFF_BYTES - 1),
      '.planning/notes/outside': headWithNul(SNIFF_BYTES + 1, SNIFF_BYTES),
    });
    const { refs } = await discover(fs);
    const byPath = new Map(refs.map((ref) => [ref.path, ref]));
    expect(byPath.get('.planning/notes/inside')?.fileClass).toBe('binary');
    expect(byPath.get('.planning/notes/outside')?.fileClass).toBe('text');
    expect(byPath.get('.planning/notes/outside')?.sizeBytes).toBe(SNIFF_BYTES + 1);
  });

  it('reads at most SNIFF_BYTES bytes of a head, so nothing past the window can matter', async () => {
    const fs = new InMemoryPlanningFilesystem({ '.planning/notes/long': headWithNul(SNIFF_BYTES * 3, SNIFF_BYTES * 2) });
    const head = await fs.readHead('.planning/notes/long', SNIFF_BYTES);
    expect(head.length).toBe(SNIFF_BYTES);
    expect(head.includes(0)).toBe(false);
  });

  it('keeps a text file of exactly 1,048,576 bytes as text and calls one byte more large', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': PROJECT_MD,
      '.planning/notes/exact.md': 'a'.repeat(MAX_TEXT_BYTES),
      '.planning/notes/over.md': 'a'.repeat(MAX_TEXT_BYTES + 1),
    });
    const { refs } = await discover(fs);
    const byPath = new Map(refs.map((ref) => [ref.path, ref]));
    expect(byPath.get('.planning/notes/exact.md')?.fileClass).toBe('text');
    expect(byPath.get('.planning/notes/over.md')?.fileClass).toBe('large');
    expect(byPath.get('.planning/notes/over.md')?.sizeBytes).toBe(MAX_TEXT_BYTES + 1);
  });

  it('makes a zero-byte .png an image of size 0 and a zero-byte file with no extension text with an empty body', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': PROJECT_MD,
      '.planning/notes/empty.png': new Uint8Array(0),
      '.planning/notes/empty': '',
    });
    const snapshot = await new PlanningRepository(fs, '/zero').load();
    const artifacts = snapshot.project?.artifacts ?? {};
    expect(artifacts['.planning/notes/empty.png']?.fileClass).toBe('image');
    expect(artifacts['.planning/notes/empty.png']?.sizeBytes).toBe(0);
    expect(artifacts['.planning/notes/empty']?.fileClass).toBe('text');
    expect(artifacts['.planning/notes/empty']?.body).toBe('');
  });

  it('matches extensions without regard to case but keeps internal names byte-equal', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': PROJECT_MD,
      '.planning/notes/KILN.PNG': new Uint8Array(3),
      '.planning/STATE.JSON': '{}',
      '.planning/state.json': '{}',
    });
    const { refs, exclusions } = await discover(fs);
    const byPath = new Map(refs.map((ref) => [ref.path, ref]));
    expect(byPath.get('.planning/notes/KILN.PNG')?.fileClass).toBe('image');
    expect(byPath.get('.planning/STATE.JSON')?.fileClass).toBe('text');
    expect(byPath.has('.planning/state.json')).toBe(false);
    expect(exclusions).toContainEqual({ path: '.planning/state.json', reason: INTERNAL_EXCLUSION_REASON });
  });

  it('loads a .planning/ that holds only internal files as ok, with no artifacts, one exclusion per internal root and an empty index', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/state.json': '{}',
      '.planning/milestone.lock': 'lock',
      '.planning/tmp/a.json': '{}',
      '.planning/tmp/deeper/b.json': '{}',
      '.planning/async-jobs/job.json': '{}',
      '.planning/logs/run.txt': 'log',
    });
    const snapshot = await new PlanningRepository(fs, '/internal-only').load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(Object.keys(snapshot.project?.artifacts ?? {})).toEqual([]);
    const internal = snapshot.exclusions.filter((exclusion) => exclusion.reason === INTERNAL_EXCLUSION_REASON);
    expect(internal.map((exclusion) => exclusion.path).sort()).toEqual([
      '.planning/async-jobs',
      '.planning/logs',
      '.planning/milestone.lock',
      '.planning/state.json',
      '.planning/tmp',
    ]);
    expect(buildSearchDocuments(snapshot)).toEqual([]);
  });

  it('returns refs and exclusions in the same order on every run', async () => {
    const contents = {
      '.planning/PROJECT.md': PROJECT_MD,
      '.planning/state.json': '{}',
      '.planning/tmp/a.json': '{}',
      '.planning/notes/b.png': new Uint8Array(2),
      '.planning/notes/a.md': '# a',
    };
    const first = await discover(new InMemoryPlanningFilesystem(contents));
    const second = await discover(new InMemoryPlanningFilesystem(contents));
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});

describe('what the port is asked to read', () => {
  it('never head-sniffs an image, a binary or a known-text name, and never reads a non-text ref', async () => {
    const fs = new SpyMemoryFs({
      '.planning/PROJECT.md': PROJECT_MD,
      '.planning/notes/a.png': new Uint8Array(4),
      '.planning/notes/b.pdf': new Uint8Array(4),
      '.planning/notes/c.md': '# c',
      '.planning/notes/d.json': '{}',
      '.planning/notes/odd': headWithNul(64, 3),
      '.planning/notes/plain': 'just words',
      '.planning/notes/over.md': 'a'.repeat(MAX_TEXT_BYTES + 1),
    });
    const snapshot = await new PlanningRepository(fs, '/spy').load();
    expect(fs.heads.sort()).toEqual(['.planning/notes/odd', '.planning/notes/plain']);
    const artifacts = Object.values(snapshot.project?.artifacts ?? {});
    const nonText = artifacts.filter((artifact) => artifact.fileClass !== 'text').map((artifact) => artifact.path);
    expect(nonText.sort()).toEqual(['.planning/notes/a.png', '.planning/notes/b.pdf', '.planning/notes/odd', '.planning/notes/over.md']);
    for (const path of nonText) expect(fs.reads, path).not.toContain(path);
    expect(fs.reads).toContain('.planning/notes/c.md');
  });

  it('keeps a file text when the port cannot head-read it, so the read-time warning path still applies', async () => {
    const fs = new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': PROJECT_MD, '.planning/notes/odd': 'words' });
    fs.readHead = async () => {
      throw new Error('EACCES: permission denied');
    };
    const { refs } = await discover(fs);
    expect(refs.find((ref) => ref.path === '.planning/notes/odd')?.fileClass).toBe('text');
  });
});
