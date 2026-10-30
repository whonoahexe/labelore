// The folder scan (PLAT-05, SEC-05, D-14 to D-17): POST /api/projects/scan walks a folder inside $HOME,
// two levels down, and lists the GSD projects it finds; POST /api/projects/add-many remembers the picked
// ones without loading them. Every tree here is built in an mkdtemp directory that stands in for the
// user's home; nothing under the real home or fixtures/ is read or written.
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { canonicalizePath, listChildEntries, statPathSync } from '../../src/planning-fs/local-fs.ts';
import type { ChildEntry } from '../../src/planning-fs/local-fs.ts';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import {
  SCAN_DIRECTORY_VALVE,
  SCAN_MAX_DEPTH,
  SCAN_MESSAGES,
  SCAN_RESULT_CAP,
  resolveScanFolder,
  scanForProjects,
} from '../../src/server/folder-scan.ts';
import type { ScanListing } from '../../src/server/folder-scan.ts';
import { ProjectRegistry, createSnapshotSource } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { GROWTH_LIMIT } from '../helpers/growth.ts';
import { guardedRequest, testPolicy } from '../helpers/guarded-request.ts';

const cleanup: string[] = [];
afterAll(async () => {
  for (const dir of cleanup) await rm(dir, { recursive: true, force: true });
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  cleanup.push(dir);
  return dir;
}

async function touch(path: string, text = ''): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, text);
}

interface SyntheticHome {
  /** The directory standing in for $HOME. */
  home: string;
  /** A sibling of home, outside it, holding a .planning directory. */
  outside: string;
}

/** The home tree of the tracer case: four findable projects and five things the scan must not report. */
async function buildHome(): Promise<SyntheticHome> {
  const root = await tempDir('labelore-scan-');
  const home = join(root, 'home');
  const outside = join(root, 'elsewhere');
  await mkdir(home, { recursive: true });
  await touch(join(home, 'Code/acme/portal/.planning/PROJECT.md'), '# Portal\n\nA portal.\n');
  await touch(join(home, 'Code/beta/portal/.planning/STATE.md'), '# State\n');
  await touch(join(home, 'Code/solo/.planning/ROADMAP.md'), '# Roadmap\n');
  await touch(join(home, 'Code/acme/mapped/.planning/codebase/STACK.md'), '# Stack\n');
  await touch(join(home, 'Code/acme/deep/inner/.planning/PROJECT.md'), '# Too deep\n');
  await touch(join(home, 'Code/.hidden/p/.planning/PROJECT.md'), '# Hidden\n');
  await touch(join(home, 'Code/node_modules/p/.planning/PROJECT.md'), '# Modules\n');
  await touch(join(outside, '.planning/PROJECT.md'), '# Outside\n');
  await symlink(outside, join(home, 'Code/link'));
  return { home, outside };
}

function registryOver(home: string) {
  const createSource = vi.fn((target: string) => createSnapshotSource(target));
  const registry = new ProjectRegistry({ createSource, home });
  const app = createRegistryApp(registry, { policy: testPolicy() });
  return { registry, app, createSource };
}

function postJson(app: ReturnType<typeof createRegistryApp>, path: string, body: unknown) {
  return guardedRequest(app, path, { method: 'POST', body: JSON.stringify(body) });
}

describe('tracer: scan a synthetic home over the API, pick two projects, see them listed unloaded', () => {
  let synthetic: SyntheticHome;
  beforeAll(async () => {
    synthetic = await buildHome();
  });

  it('lists the four projects in path order, adds two without loading anything, and marks them added on a second scan', async () => {
    const { home } = synthetic;
    const { registry, app, createSource } = registryOver(home);

    const scan = await postJson(app, '/api/projects/scan', { folder: '~/Code' });
    expect(scan.status).toBe(200);
    const first = (await scan.json()) as {
      folder: string;
      found: { path: string; displayPath: string; name: string; alreadyAdded: boolean }[];
      capped: boolean;
      cap: number;
    };
    expect(first.folder).toBe('~/Code');
    expect(first.capped).toBe(false);
    expect(first.cap).toBe(100);
    expect(first.found.map((project) => project.displayPath)).toEqual([
      '~/Code/acme/mapped',
      '~/Code/acme/portal',
      '~/Code/beta/portal',
      '~/Code/solo',
    ]);
    expect(first.found.map((project) => project.path)).toEqual([
      join(home, 'Code/acme/mapped'),
      join(home, 'Code/acme/portal'),
      join(home, 'Code/beta/portal'),
      join(home, 'Code/solo'),
    ]);
    expect(first.found.map((project) => project.name)).toEqual(['mapped', 'Portal', 'portal', 'solo']);
    expect(first.found.every((project) => project.alreadyAdded === false)).toBe(true);

    const portals = [join(home, 'Code/acme/portal'), join(home, 'Code/beta/portal')];
    const added = await postJson(app, '/api/projects/add-many', { targets: portals });
    expect(added.status).toBe(200);
    const addedBody = (await added.json()) as { added: number; results: { target: string; slug?: string }[] };
    expect(addedBody.added).toBe(2);
    expect(addedBody.results.map((result) => result.slug)).toEqual(['portal', 'portal-2']);

    const listed = (await (await guardedRequest(app, '/api/projects')).json()) as ProjectListResponse;
    expect(listed.projects.map((project) => [project.slug, project.state])).toEqual([
      ['portal', 'unloaded'],
      ['portal-2', 'unloaded'],
    ]);
    expect(createSource).not.toHaveBeenCalled();

    const again = (await (await postJson(app, '/api/projects/scan', { folder: '~/Code' })).json()) as typeof first;
    expect(again.found.map((project) => [project.displayPath, project.alreadyAdded])).toEqual([
      ['~/Code/acme/mapped', false],
      ['~/Code/acme/portal', true],
      ['~/Code/beta/portal', true],
      ['~/Code/solo', false],
    ]);
    expect(createSource).not.toHaveBeenCalled();
    registry.dispose();
  });

  it('is covered by the route-enumeration refusal table without edits', () => {
    const { registry, app } = registryOver(synthetic.home);
    const keys = app.routes.map((route) => `${route.method} ${route.path}`);
    expect(keys).toContain('POST /api/projects/scan');
    expect(keys).toContain('POST /api/projects/add-many');
    registry.dispose();
  });
});

// ---------------------------------------------------------------------------------------------------
// The scan refuses everything outside home and stays bounded (D-15, T-08-23 to T-08-26).

function dirEntry(name: string, kind: 'dir' | 'file' | 'link' = 'dir'): ChildEntry {
  return { name, isDirectory: kind === 'dir', isSymlink: kind === 'link' };
}

/** An in-memory tree: each directory path to its entries. Counts every listing call. */
class MemoryTree {
  readonly dirs = new Map<string, ChildEntry[]>();
  readonly calls: string[] = [];

  /** Makes `relative` and every folder above it down from `root`; `project` puts a .planning inside it. */
  add(root: string, relative: string, project: boolean): void {
    let dir = root;
    if (!this.dirs.has(dir)) this.dirs.set(dir, []);
    for (const part of relative.split('/').filter((segment) => segment.length > 0)) {
      const child = `${dir}/${part}`;
      if (!this.dirs.has(child)) {
        this.dirs.set(child, []);
        this.dirs.get(dir)?.push(dirEntry(part));
      }
      dir = child;
    }
    if (project) this.dirs.get(dir)?.push(dirEntry('.planning'));
  }

  readonly list: ScanListing = async (dir) => {
    this.calls.push(dir);
    return this.dirs.get(dir) ?? null;
  };
}

const WALK = { maxDepth: SCAN_MAX_DEPTH, cap: SCAN_RESULT_CAP, valve: SCAN_DIRECTORY_VALVE };

describe('resolveScanFolder: containment before and after the real path', () => {
  let synthetic: SyntheticHome;
  beforeAll(async () => {
    synthetic = await buildHome();
    await touch(join(synthetic.home, 'Code/file.txt'), 'x');
  });

  function spies() {
    return {
      canonicalize: vi.fn(canonicalizePath),
      stat: vi.fn(statPathSync),
      list: vi.fn<ScanListing>(async () => []),
    };
  }

  it('refuses every folder outside home by its text, calling neither the canonicalizer nor the listing', () => {
    const { home } = synthetic;
    const outsideInputs = ['/', '/etc', join(home, '..'), '~/../elsewhere', join(home, '..', 'elsewhere'), `${home}-sibling`];
    for (const input of outsideInputs) {
      const { canonicalize, stat, list } = spies();
      const resolved = resolveScanFolder(input, { home, canonicalize, stat });
      expect(resolved.ok, input).toBe(false);
      if (resolved.ok) continue;
      expect(resolved.error, input).toMatch(/ is outside your home folder\. Labelore only scans folders inside it\.$/);
      expect(canonicalize, `${input} canonicalize`).not.toHaveBeenCalled();
      expect(stat, `${input} stat`).not.toHaveBeenCalled();
      expect(list, `${input} list`).not.toHaveBeenCalled();
    }
    // The message names the folder as the user will read it.
    const { canonicalize, stat } = spies();
    expect(resolveScanFolder('/etc', { home, canonicalize, stat })).toEqual({
      ok: false,
      error: SCAN_MESSAGES.outsideHome('/etc'),
    });
  });

  it('refuses the same folders through the API with 422 and the listing never called', async () => {
    const { home } = synthetic;
    const { registry, app } = registryOver(home);
    for (const folder of ['/', '/etc', join(home, '..'), '~/../elsewhere']) {
      const response = await postJson(app, '/api/projects/scan', { folder });
      expect(response.status, folder).toBe(422);
      const body = (await response.json()) as { error: string };
      expect(body.error, folder).toMatch(/is outside your home folder\. Labelore only scans folders inside it\.$/);
    }
    const list = vi.fn<ScanListing>(async () => []);
    expect(await registry.scan('/etc', { list })).toEqual({ ok: false, error: SCAN_MESSAGES.outsideHome('/etc') });
    expect(list).not.toHaveBeenCalled();
    registry.dispose();
  });

  it('refuses a symlink inside home that leads outside, after its real path is checked, and never lists inside it', async () => {
    const { home, outside } = synthetic;
    const { canonicalize, stat } = spies();
    expect(resolveScanFolder('~/Code/link', { home, canonicalize, stat })).toEqual({
      ok: false,
      error: SCAN_MESSAGES.outsideHome('~/Code/link'),
    });
    expect(canonicalize).toHaveBeenCalled();
    expect(stat).not.toHaveBeenCalled();

    const { registry } = registryOver(home);
    const walked: string[] = [];
    const recording: ScanListing = async (dir) => {
      walked.push(dir);
      return listChildEntries(dir);
    };
    const scanned = await registry.scan('~/Code', { list: recording });
    expect(scanned.ok).toBe(true);
    expect(walked.length).toBeGreaterThan(0);
    expect(walked.filter((dir) => dir === outside || dir.startsWith(`${outside}/`))).toEqual([]);
    expect(walked.filter((dir) => dir.endsWith('/link'))).toEqual([]);
    const refused = await registry.scan('~/Code/link', { list: recording });
    expect(refused).toEqual({ ok: false, error: SCAN_MESSAGES.outsideHome('~/Code/link') });
    expect(walked.filter((dir) => dir === outside || dir.startsWith(`${outside}/`))).toEqual([]);
    registry.dispose();
  });

  it('answers a missing folder, a file, an empty field and an unreadable folder with their own messages', () => {
    const { home } = synthetic;
    const deps = { home, canonicalize: canonicalizePath, stat: statPathSync };
    expect(resolveScanFolder('~/Code/nope', deps)).toEqual({ ok: false, error: 'There is no folder at ~/Code/nope.' });
    expect(resolveScanFolder('~/Code/file.txt', deps)).toEqual({
      ok: false,
      error: '~/Code/file.txt is a file, not a folder.',
    });
    for (const empty of ['', '   ', 5, null, undefined, 'a\0b', 'x'.repeat(1025)]) {
      expect(resolveScanFolder(empty, deps), String(empty)).toEqual({ ok: false, error: 'Enter a folder to scan.' });
    }
    for (const code of ['EACCES', 'EPERM'] as const) {
      const denied = resolveScanFolder('~/Code', { ...deps, canonicalize: () => ({ ok: false, code }) });
      expect(denied).toEqual({ ok: false, error: 'Labelore cannot read ~/Code: permission denied.' });
    }
  });

  it('accepts home itself and a folder inside it, and reports the real path to walk from', () => {
    const { home } = synthetic;
    const deps = { home, canonicalize: canonicalizePath, stat: statPathSync };
    expect(resolveScanFolder('~', deps)).toMatchObject({ ok: true, folder: home, display: '~' });
    expect(resolveScanFolder(join(home, 'Code'), deps)).toMatchObject({
      ok: true,
      folder: join(home, 'Code'),
      display: '~/Code',
    });
  });

  it('answers 400 with the empty-field message for a body without a string folder', async () => {
    const { registry, app } = registryOver(synthetic.home);
    for (const body of [{}, { folder: 5 }, [], null, 'text']) {
      const response = await postJson(app, '/api/projects/scan', body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(await response.json()).toEqual({ error: 'Enter a folder to scan.' });
    }
    const notJson = await guardedRequest(app, '/api/projects/scan', { method: 'POST', body: 'not json' });
    expect(notJson.status).toBe(400);
    registry.dispose();
  });

  it('answers 422 with the same message for a blank folder', async () => {
    const { registry, app } = registryOver(synthetic.home);
    const response = await postJson(app, '/api/projects/scan', { folder: '' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Enter a folder to scan.' });
    registry.dispose();
  });
});

describe('scanForProjects: depth, skips and caps', () => {
  it('finds the folder itself at depth 0 and depth 2, and not depth 3', async () => {
    const tree = new MemoryTree();
    tree.add('/r', '', true);
    tree.add('/r', 'a', true);
    tree.add('/r', 'a/b', true);
    tree.add('/r', 'a/b/c', true);
    const outcome = await scanForProjects({ root: '/r', list: tree.list, ...WALK });
    expect(outcome).toEqual({ found: ['/r', '/r/a', '/r/a/b'], capped: false });
    expect(tree.calls).not.toContain('/r/a/b/c');
  });

  it('finds a project nested inside a found project within the depth', async () => {
    const tree = new MemoryTree();
    tree.add('/r', 'outer', true);
    tree.add('/r', 'outer/inner', true);
    const outcome = await scanForProjects({ root: '/r', list: tree.list, ...WALK });
    expect(outcome.found).toEqual(['/r/outer', '/r/outer/inner']);
  });

  it('never descends into a symlink, a hidden folder or node_modules, and ignores a .planning that is a link or a file', async () => {
    const tree = new MemoryTree();
    tree.add('/r', 'ok', true);
    tree.add('/r', '.hidden/p', true);
    tree.add('/r', 'node_modules/p', true);
    tree.add('/r', 'viaLink/p', true);
    tree.dirs.set('/r', [
      dirEntry('ok'),
      dirEntry('.hidden'),
      dirEntry('node_modules'),
      dirEntry('viaLink', 'link'),
      dirEntry('linkPlanning'),
      dirEntry('filePlanning'),
    ]);
    tree.dirs.set('/r/linkPlanning', [dirEntry('.planning', 'link')]);
    tree.dirs.set('/r/filePlanning', [dirEntry('.planning', 'file')]);
    const outcome = await scanForProjects({ root: '/r', list: tree.list, ...WALK });
    expect(outcome.found).toEqual(['/r/ok']);
    expect(tree.calls.filter((dir) => /hidden|node_modules|viaLink/.test(dir))).toEqual([]);
  });

  it('skips a folder the listing cannot read and keeps going', async () => {
    const tree = new MemoryTree();
    tree.add('/r', 'good', true);
    tree.dirs.get('/r')?.push(dirEntry('locked'));
    const outcome = await scanForProjects({ root: '/r', list: tree.list, ...WALK });
    expect(outcome).toEqual({ found: ['/r/good'], capped: false });
    expect(tree.calls).toContain('/r/locked');
  });

  it('sorts by path in code-unit order whatever order the walk found them in', async () => {
    const tree = new MemoryTree();
    for (const name of ['b', 'B', 'a', 'a-b', 'a/b']) tree.add('/r', name, true);
    const outcome = await scanForProjects({ root: '/r', list: tree.list, ...WALK });
    expect(outcome.found).toEqual(['/r/B', '/r/a', '/r/a-b', '/r/a/b', '/r/b']);
  });

  it('stops at 100 results and reports capped; exactly 100 is not capped', async () => {
    const many = new MemoryTree();
    for (let i = 0; i < 130; i += 1) many.add('/r', `p${String(i).padStart(3, '0')}`, true);
    const capped = await scanForProjects({ root: '/r', list: many.list, ...WALK });
    expect(capped.found).toHaveLength(100);
    expect(capped.capped).toBe(true);

    const exact = new MemoryTree();
    for (let i = 0; i < 100; i += 1) exact.add('/r', `p${String(i).padStart(3, '0')}`, true);
    const full = await scanForProjects({ root: '/r', list: exact.list, ...WALK });
    expect(full.found).toHaveLength(100);
    expect(full.capped).toBe(false);
  });

  it('stops at 5,000 visited folders and reports capped; exactly 5,000 is not capped', async () => {
    const wide = new MemoryTree();
    for (let i = 0; i < 6000; i += 1) wide.add('/r', `d${i}`, false);
    const stopped = await scanForProjects({ root: '/r', list: wide.list, ...WALK });
    expect(stopped.capped).toBe(true);
    expect(stopped.found).toEqual([]);
    expect(wide.calls.length).toBeLessThanOrEqual(5000);

    const exact = new MemoryTree();
    for (let i = 0; i < 4999; i += 1) exact.add('/r', `d${i}`, false);
    const done = await scanForProjects({ root: '/r', list: exact.list, ...WALK });
    expect(done.capped).toBe(false);
    expect(exact.calls).toHaveLength(5000);
  });

  it('uses the documented limits', () => {
    expect([SCAN_MAX_DEPTH, SCAN_RESULT_CAP, SCAN_DIRECTORY_VALVE]).toEqual([2, 100, 5000]);
  });

  it('reports the cap through the API with the 100-result limit', async () => {
    const root = await tempDir('labelore-scan-cap-');
    const home = join(root, 'home');
    for (let i = 0; i < 120; i += 1) await mkdir(join(home, 'Many', `p${i}`, '.planning'), { recursive: true });
    const { registry, app } = registryOver(home);
    const response = await postJson(app, '/api/projects/scan', { folder: '~/Many' });
    const body = (await response.json()) as { found: unknown[]; capped: boolean; cap: number };
    expect(body.found).toHaveLength(100);
    expect(body.capped).toBe(true);
    expect(body.cap).toBe(100);
    registry.dispose();
  });
});

/** The growth-ratio idiom of test/helpers/growth.ts for an async function: grow n until the base run is
 * measurable, then time n and 8n, keeping the lowest of up to three readings (a linear walk reads about
 * 8, a quadratic one about 64, and GROWTH_LIMIT sits between). The result and visited-folder caps are
 * lifted for the measurement: caps are not growth. */
async function measureScanGrowth(make: (n: number) => MemoryTree): Promise<number> {
  const run = async (tree: MemoryTree): Promise<void> => {
    await scanForProjects({ root: '/r', list: tree.list, maxDepth: SCAN_MAX_DEPTH, cap: 1e9, valve: 1e9 });
  };
  const best = async (tree: MemoryTree, reps: number): Promise<number> => {
    let lowest = Infinity;
    for (let i = 0; i < reps; i += 1) {
      const started = performance.now();
      await run(tree);
      lowest = Math.min(lowest, performance.now() - started);
    }
    return lowest;
  };
  let lowestRatio = Infinity;
  for (let attempt = 0; attempt < 3 && lowestRatio >= GROWTH_LIMIT; attempt += 1) {
    let n = 1000;
    await run(make(n));
    let base = await best(make(n), 5);
    while (base < 4 && n * 16 <= 1 << 16) {
      n *= 2;
      base = await best(make(n), 5);
    }
    const t1 = base;
    const t2 = await best(make(n * 8), 5);
    const ratio = t2 < 1 ? 1 : t2 / Math.max(t1, 0.001);
    lowestRatio = Math.min(lowestRatio, ratio);
  }
  return lowestRatio;
}

describe('scanForProjects: time grows in step with the folders walked', () => {
  it('stays below the shared growth limit for a flat tree (depth 1)', async () => {
    const ratio = await measureScanGrowth((n) => {
      const tree = new MemoryTree();
      for (let i = 0; i < n; i += 1) tree.add('/r', `d${i}`, i % 3 === 0);
      return tree;
    });
    expect(ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('stays below the shared growth limit for a two-level tree (depth 2)', async () => {
    const ratio = await measureScanGrowth((n) => {
      const tree = new MemoryTree();
      const groups = Math.ceil(Math.sqrt(n));
      for (let g = 0; g < groups; g += 1) {
        for (let i = 0; i < groups; i += 1) tree.add('/r', `g${g}/d${i}`, i % 3 === 0);
      }
      return tree;
    });
    expect(ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('POST /api/projects/add-many', () => {
  let synthetic: SyntheticHome;
  beforeAll(async () => {
    synthetic = await buildHome();
  });

  it('refuses more than 100 targets and a non-string target with 400, adding nothing', async () => {
    const { registry, app, createSource } = registryOver(synthetic.home);
    const message = { error: 'Choose up to 100 projects to add.' };
    const solo = join(synthetic.home, 'Code/solo');
    const tooMany = Array.from({ length: 101 }, () => solo);
    for (const body of [{ targets: tooMany }, { targets: [solo, 5] }, { targets: 'x' }, {}, []]) {
      const response = await postJson(app, '/api/projects/add-many', body);
      expect(response.status, JSON.stringify(body).slice(0, 60)).toBe(400);
      expect(await response.json()).toEqual(message);
    }
    expect(((await (await guardedRequest(app, '/api/projects')).json()) as ProjectListResponse).projects).toEqual([]);
    expect(createSource).not.toHaveBeenCalled();
    registry.dispose();
  });

  it('adds the good targets and carries the server message for the bad one', async () => {
    const { home } = synthetic;
    const { registry, app, createSource } = registryOver(home);
    const missing = join(home, 'Code/nope');
    const response = await postJson(app, '/api/projects/add-many', {
      targets: [join(home, 'Code/solo'), missing, join(home, 'Code/acme/portal')],
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { added: number; results: Record<string, unknown>[] };
    expect(body.added).toBe(2);
    expect(body.results).toEqual([
      { target: join(home, 'Code/solo'), slug: 'solo', duplicate: false },
      { target: missing, error: `No such path: ${missing} (resolved: ${missing})` },
      { target: join(home, 'Code/acme/portal'), slug: 'portal', duplicate: false },
    ]);
    expect(createSource).not.toHaveBeenCalled();

    const again = await postJson(app, '/api/projects/add-many', { targets: [join(home, 'Code/solo')] });
    expect(await again.json()).toEqual({
      added: 0,
      results: [{ target: join(home, 'Code/solo'), slug: 'solo', duplicate: true }],
    });
    registry.dispose();
  });

  it('reads a 100-target body larger than the standard 4 KB limit, and still refuses a huge one with 413', async () => {
    const { registry, app } = registryOver(synthetic.home);
    const paths = Array.from({ length: 100 }, (_, i) => join(synthetic.home, `Code/not-there-${i}/${'x'.repeat(60)}`));
    const body = JSON.stringify({ targets: paths });
    expect(body.length).toBeGreaterThan(4096);
    const response = await guardedRequest(app, '/api/projects/add-many', { method: 'POST', body });
    expect(response.status).toBe(200);
    const answered = (await response.json()) as { added: number; results: unknown[] };
    expect(answered.added).toBe(0);
    expect(answered.results).toHaveLength(100);

    const huge = JSON.stringify({ targets: ['x'.repeat(300_000)] });
    const refused = await guardedRequest(app, '/api/projects/add-many', { method: 'POST', body: huge });
    expect(refused.status).toBe(413);
    // Every other route keeps the standard limit.
    const scan = await guardedRequest(app, '/api/projects/scan', {
      method: 'POST',
      body: JSON.stringify({ folder: 'x'.repeat(5000) }),
    });
    expect(scan.status).toBe(413);
    registry.dispose();
  });

  it('answers an empty list with added 0', async () => {
    const { registry, app } = registryOver(synthetic.home);
    const response = await postJson(app, '/api/projects/add-many', { targets: [] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ added: 0, results: [] });
    registry.dispose();
  });
});
