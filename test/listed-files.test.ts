// The never-read proof for the 'listed' file class (Phase 11: D-01, RESEARCH C4, T-11-03, T-11-04,
// T-11-05). A file inside a spike folder other than the spike's README.md and .continue-here.md is named
// and sized but never opened: discovery decides the class from the position before any head sniff, the
// registry never parses it, the search index never holds it and no route serves its bytes. The
// filesystem double counts every read and readHead so "never read" is a measured zero, not a claim.
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import type { FileBytes, FileRead } from '../src/planning-fs/types.ts';
import { isListedPosition } from '../src/planning-repo/folders.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { filePageKindOf } from '../src/presentation/file-facts.ts';
import { createApp } from '../src/server/index.ts';
import { buildSearchDocuments, createSearchIndexState, searchIndex } from '../src/server/search-index.ts';
import type { ProjectPresentation } from '../src/server/project-presentation.ts';

const MARKER = 'LISTEDWORD';

/** Counts every content-touching call per path: read, readHead and readBytesWithin. */
class CountingFs extends InMemoryPlanningFilesystem {
  readonly reads = new Map<string, number>();
  readonly heads = new Map<string, number>();
  readonly byteReads = new Map<string, number>();

  private static bump(map: Map<string, number>, path: string): void {
    map.set(path, (map.get(path) ?? 0) + 1);
  }

  override async read(relPath: string): Promise<FileRead> {
    CountingFs.bump(this.reads, relPath);
    return super.read(relPath);
  }
  override async readHead(relPath: string, maxBytes: number): Promise<Uint8Array> {
    CountingFs.bump(this.heads, relPath);
    return super.readHead(relPath, maxBytes);
  }
  override async readBytesWithin(baseRelDir: string, relPath: string): Promise<FileBytes> {
    CountingFs.bump(this.byteReads, relPath);
    return super.readBytesWithin(baseRelDir, relPath);
  }
}

const LISTED_PATHS = [
  '.planning/spikes/001-probe/make_proxy.sh',
  '.planning/spikes/001-probe/out/result.json',
  '.planning/spikes/001-probe/runner',
  '.planning/spikes/001-probe/NOTES.md',
];
const README = '.planning/spikes/001-probe/README.md';
const CONTINUE_HERE = '.planning/spikes/006-resume/.continue-here.md';
const SKETCH_SCRIPT = '.planning/sketches/001-x/notes.sh';

const FILES: Record<string, string> = {
  '.planning/PROJECT.md': '# Spike host\n\n## What This Is\nA project with a spike.\n',
  [README]: `---\nname: probe\n---\n# Probe\n\nA readable spike README.\n`,
  [LISTED_PATHS[0]]: `#!/bin/sh\necho ${MARKER}\n`,
  [LISTED_PATHS[1]]: `{"note":"${MARKER}"}\n`,
  [LISTED_PATHS[2]]: `${MARKER} with no extension\n`,
  [LISTED_PATHS[3]]: `# Notes\n\n${MARKER} inside a markdown note\n`,
  [CONTINUE_HERE]: '# Resume the spike\n',
  [SKETCH_SCRIPT]: '#!/bin/sh\necho sketch\n',
};

async function load() {
  const fs = new CountingFs(FILES);
  const repo = new PlanningRepository(fs, '/spikes');
  const snapshot = await repo.load();
  return { fs, repo, snapshot };
}

describe('isListedPosition', () => {
  it.each([
    ['spikes/001-probe/make_proxy.sh', true],
    ['spikes/001-probe/out/result.json', true],
    ['spikes/001-probe/out/deeper/README.md', true],
    ['spikes/001-probe/NOTES.md', true],
    ['spikes/001-probe/README.md', false],
    ['spikes/006-resume/.continue-here.md', false],
    ['spikes/006-resume/out/.continue-here.md', false],
    ['spikes/MANIFEST.md', false],
    ['spikes/CONVENTIONS.md', false],
    ['spikes/WRAP-UP-SUMMARY.md', false],
    ['sketches/001-x/notes.sh', false],
    ['sketches/001-x/README.md', false],
    ['phases/01-x/spikes/001/a.sh', false],
    ['PROJECT.md', false],
  ])('%s is %s', (path, expected) => {
    expect(isListedPosition(path)).toBe(expected);
  });
});

describe('a spike folder through discovery and the registry', () => {
  it('reads no listed path at all, neither its content nor its head', async () => {
    const { fs } = await load();
    for (const path of LISTED_PATHS) {
      expect(fs.reads.get(path) ?? 0, `read ${path}`).toBe(0);
      expect(fs.heads.get(path) ?? 0, `readHead ${path}`).toBe(0);
      expect(fs.byteReads.get(path) ?? 0, `readBytesWithin ${path}`).toBe(0);
    }
  });

  it('still reads the README and the .continue-here.md', async () => {
    const { fs } = await load();
    expect(fs.reads.get(README)).toBeGreaterThanOrEqual(1);
    expect(fs.reads.get(CONTINUE_HERE)).toBeGreaterThanOrEqual(1);
  });

  it('classes each listed path listed with an empty body and the stat size', async () => {
    const { snapshot } = await load();
    const artifacts = snapshot.project?.artifacts ?? {};
    for (const path of LISTED_PATHS) {
      const artifact = artifacts[path];
      expect(artifact, path).toBeDefined();
      expect(artifact.fileClass, path).toBe('listed');
      expect(artifact.body, path).toBe('');
      expect(artifact.warnings, path).toEqual([]);
      expect(artifact.sizeBytes, path).toBe(Buffer.byteLength(FILES[path], 'utf8'));
    }
  });

  it('keeps the README and .continue-here.md text, and a sketch script text', async () => {
    const { snapshot } = await load();
    const artifacts = snapshot.project?.artifacts ?? {};
    expect(artifacts[README].fileClass).toBe('text');
    expect(artifacts[README].body).toContain('A readable spike README.');
    expect(artifacts[CONTINUE_HERE].fileClass).toBe('text');
    expect(artifacts[SKETCH_SCRIPT].fileClass).toBe('text');
  });

  it('keeps the spike README kind', async () => {
    const { snapshot } = await load();
    expect(snapshot.project?.artifacts[README].kind).toBe('spike');
  });
});

describe('a listed file is never indexed or served', () => {
  it('holds no marker word in the search documents or the built index', async () => {
    const { snapshot } = await load();
    const documents = buildSearchDocuments(snapshot);
    for (const path of LISTED_PATHS) expect(documents.map((doc) => doc.path)).not.toContain(path);
    expect(documents.some((doc) => doc.body.includes(MARKER))).toBe(false);

    const search = createSearchIndexState();
    search.buildFrom(snapshot);
    await new Promise((resolve) => setImmediate(resolve));
    expect(search.state().status).toBe('ready');
    expect(searchIndex(search.state(), MARKER)).toEqual([]);
  });

  it('presents each listed path without a body, and /api/documents carries no marker word', async () => {
    const { fs, repo } = await load();
    const app = createApp(repo, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    for (const path of LISTED_PATHS) {
      const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
      expect(artifact, path).toBeDefined();
      expect(artifact?.fileClass).toBe('listed');
      expect(filePageKindOf(artifact!.fileClass, artifact!.sizeBytes)).toBe('listed');
      const res = await app.request(`/api/documents?route=${encodeURIComponent(artifact!.key)}`);
      expect(await res.text(), path).not.toContain(MARKER);
    }
    expect(fs.reads.get(LISTED_PATHS[0]) ?? 0).toBe(0);
  });

  it('answers 404 from the bytes route for every listed address and reads nothing', async () => {
    const { fs, repo } = await load();
    const app = createApp(repo, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    for (const path of LISTED_PATHS) {
      const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
      expect(artifact, path).toBeDefined();
      const res = await app.request(`/api/files?route=${encodeURIComponent(artifact!.key)}`);
      expect(res.status, path).toBe(404);
      expect(fs.byteReads.get(path) ?? 0, path).toBe(0);
      expect(fs.reads.get(path) ?? 0, path).toBe(0);
    }
  });
});
