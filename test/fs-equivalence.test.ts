// D-08's proof by substitution. For each of the three fixtures, loading the identical tree through
// LocalFsPlanningFilesystem and through InMemoryPlanningFilesystem.fromDirectory must produce
// byte-identical stable JSON — equality is asserted on the SERIALIZED strings, never on the object
// graphs, because object equality would pass on structures that serialize differently. Nothing above
// the PlanningFilesystem interface can be reading the disk if a map-backed implementation produces
// the same bytes.
//
// The second half of this file is D-08's other reason to exist: hostile cases too awkward or unsafe
// to commit to fixtures/ — an empty backing map, a single-file map, an empty-content file, a rejecting
// read, a rejecting list, and a prototype-polluting JSON key — exercised only against
// InMemoryPlanningFilesystem. None of these is ever written to fixtures/.
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildSnapshotJson } from '../src/cli/snapshot.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { normalizeForGolden } from '../src/planning-repo/serialize.ts';
import type { DirEntry, FileRead, FsCapabilities, PlanningFilesystem } from '../src/planning-fs/types.ts';
import { fromDirectory } from './helpers/from-directory.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURES = ['sparse-empty', 'sparse-started', 'dense'] as const;

describe.each(FIXTURES)('fs-equivalence — %s', (fixtureName) => {
  it('produces byte-identical stable JSON through LocalFsPlanningFilesystem and InMemoryPlanningFilesystem.fromDirectory', async () => {
    const fixtureRoot = join(__dirname, '..', 'fixtures', fixtureName);
    const localResult = await buildSnapshotJson(fixtureRoot, { stable: true, withBodies: false });

    const inMemoryFs = await fromDirectory(fixtureRoot);
    const repo = new PlanningRepository(inMemoryFs, fixtureRoot);
    const snapshot = await repo.load();
    const inMemoryResult = normalizeForGolden(snapshot, fixtureRoot, { stable: true, withBodies: false });

    expect(JSON.stringify(inMemoryResult, null, 2)).toBe(JSON.stringify(localResult, null, 2));
  });
});

/** Wraps another PlanningFilesystem, rejecting `read()` for exactly one path with a permission error — never committed to fixtures/, since this case is unsafe/awkward to represent on a real filesystem. */
class RejectingReadFilesystem implements PlanningFilesystem {
  readonly capabilities: FsCapabilities = { watch: false, write: false };
  constructor(
    private readonly inner: PlanningFilesystem,
    private readonly rejectPath: string,
  ) {}
  list(relDir: string): Promise<DirEntry[]> {
    return this.inner.list(relDir);
  }
  read(relPath: string): Promise<FileRead> {
    if (relPath === this.rejectPath) {
      const err = new Error(`EACCES: permission denied, open '${relPath}'`) as NodeJS.ErrnoException;
      err.code = 'EACCES';
      return Promise.reject(err);
    }
    return this.inner.read(relPath);
  }
  exists(relPath: string): Promise<boolean> {
    return this.inner.exists(relPath);
  }
}

/** Wraps another PlanningFilesystem, rejecting `list()` for exactly one directory with a permission error. */
class RejectingListFilesystem implements PlanningFilesystem {
  readonly capabilities: FsCapabilities = { watch: false, write: false };
  constructor(
    private readonly inner: PlanningFilesystem,
    private readonly rejectDir: string,
  ) {}
  list(relDir: string): Promise<DirEntry[]> {
    if (relDir === this.rejectDir) {
      const err = new Error(`EACCES: permission denied, scandir '${relDir}'`) as NodeJS.ErrnoException;
      err.code = 'EACCES';
      return Promise.reject(err);
    }
    return this.inner.list(relDir);
  }
  read(relPath: string): Promise<FileRead> {
    return this.inner.read(relPath);
  }
  exists(relPath: string): Promise<boolean> {
    return this.inner.exists(relPath);
  }
}

describe('fs-equivalence — hostile cases (in-memory only, never committed to fixtures/)', () => {
  it('produces a well-formed, non-throwing snapshot for an empty backing map', async () => {
    const fs = new InMemoryPlanningFilesystem({});
    const repo = new PlanningRepository(fs, '/empty');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('not-a-gsd-project');
    expect(snapshot.project).toBeNull();
    expect(snapshot.warnings).toEqual([]);
  });

  it('produces a well-formed snapshot with empty collections for a map holding a single file', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': '# Solo\n\n## What This Is\nJust one file, nothing else under .planning/.\n',
    });
    const repo = new PlanningRepository(fs, '/solo');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(snapshot.project).not.toBeNull();
    expect(snapshot.project?.phases).toEqual([]);
    expect(snapshot.project?.milestones).toEqual([]);
    expect(snapshot.project?.requirements).toEqual([]);
  });

  it('produces a well-formed snapshot for a file whose content is the empty string', async () => {
    const fs = new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': '' });
    const repo = new PlanningRepository(fs, '/blank');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    const artifact = snapshot.project?.artifacts['.planning/PROJECT.md'];
    expect(artifact).toBeDefined();
    expect(artifact?.body).toBe('');
  });

  it('records a rejecting read as a read-stage warning without throwing', async () => {
    const inner = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': '# X\n\n## What This Is\nY\n',
      '.planning/phases/01-x/01-CONTEXT.md': '<domain>x</domain>',
    });
    const rejecting = new RejectingReadFilesystem(inner, '.planning/phases/01-x/01-CONTEXT.md');
    const repo = new PlanningRepository(rejecting, '/reject-read');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    const warning = snapshot.warnings.find((w) => w.path === '.planning/phases/01-x/01-CONTEXT.md');
    expect(warning?.stage).toBe('read');
    expect(warning?.salvage.length).toBeGreaterThan(0);
  });

  it('records a rejecting list as a discovery exclusion without throwing', async () => {
    const inner = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': '# X\n\n## What This Is\nY\n',
      '.planning/phases/01-x/01-CONTEXT.md': '<domain>x</domain>',
    });
    const rejecting = new RejectingListFilesystem(inner, '.planning/phases/01-x');
    const repo = new PlanningRepository(rejecting, '/reject-list');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(snapshot.exclusions.some((e) => e.path === '.planning/phases/01-x')).toBe(true);
  });

  it('strips a prototype-named key at depth from a JSON config artifact without polluting Object.prototype', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/config.json': '{"mode":"yolo","nested":{"__proto__":{"polluted":true},"safe":1}}',
    });
    const repo = new PlanningRepository(fs, '/hostile-json');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(snapshot.project?.config.mode).toBe('yolo');
  });
});
