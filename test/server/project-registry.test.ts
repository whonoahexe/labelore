// Pins the registry lifecycle (PLAT-02): load coalescing, the list states, the least-recently-used cap
// of five loaded runtimes, disposal (ssh mirrors and scheduled index builds), and a heap that stays
// bounded across repeated switching. Projects are made-up folders in a temp directory; where a test
// needs a real load it builds Lendshed's files in memory behind a createSource double.
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import v8 from 'node:v8';
import vm from 'node:vm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MirrorRunResult } from '../../src/cli/remote-target.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { ProjectRegistry, identityOfTarget } from '../../src/server/project-registry.ts';
import { ProjectRuntime } from '../../src/server/project-runtime.ts';
import type { SnapshotSource } from '../../src/server/project-runtime.ts';
import { readProjectTitle } from '../../src/server/project-title.ts';
import type { MirrorRunner } from '../../src/server/remote-source.ts';
import { emptySettings, saveFailedNotice, skippedNotice } from '../../src/server/settings-model.ts';
import type { SettingsState } from '../../src/server/settings-model.ts';
import { FileSettingsStore, MemorySettingsStore } from '../../src/server/settings-store.ts';
import type { SettingsStore } from '../../src/server/settings-store.ts';
import { FX_ROOT, planningFiles } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const FIXTURES = resolve(import.meta.dirname, '../../fixtures');
const LENDSHED_FILES = planningFiles(FX_ROOT);

let parent: string;

beforeAll(async () => {
  parent = await mkdtemp(join(tmpdir(), 'labelore-registry-'));
});

afterAll(async () => {
  await rm(parent, { recursive: true, force: true });
});

/** A made-up project folder (just a .planning directory); createSource doubles never read it. */
async function makeFolder(name: string): Promise<string> {
  const root = join(parent, name);
  await mkdir(join(root, '.planning'), { recursive: true });
  return root;
}

interface Double {
  createSource: ReturnType<typeof vi.fn<(target: string) => Promise<SnapshotSource>>>;
  /** One dispose spy per created source, in creation order, with the target it belongs to. */
  disposals: { target: string; dispose: ReturnType<typeof vi.fn<() => void>> }[];
}

/** A createSource that loads Lendshed's files in memory, labelled with the target it was asked for. */
function lendshedDouble(): Double {
  const disposals: Double['disposals'] = [];
  const createSource = vi.fn(async (target: string): Promise<SnapshotSource> => {
    const repository = new PlanningRepository(new InMemoryPlanningFilesystem(LENDSHED_FILES), target);
    await repository.load();
    const dispose = vi.fn<() => void>();
    disposals.push({ target, dispose });
    return {
      getSnapshot: () => repository.getSnapshot(),
      refresh: () => repository.refresh(),
      planningFilesystem: () => repository.planningFilesystem(),
      dispose,
    };
  });
  return { createSource, disposals };
}

async function registerFolders(registry: ProjectRegistry, count: number): Promise<string[]> {
  const slugs: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    const outcome = await registry.register(await makeFolder(`p${index}`));
    if (!outcome.ok) throw new Error('fixture folder was refused');
    slugs.push(outcome.slug);
  }
  return slugs;
}

const flushImmediates = (): Promise<void> => new Promise((done) => setImmediate(done));

function disposedTargets(double: Double): string[] {
  return double.disposals.filter((entry) => entry.dispose.mock.calls.length > 0).map((entry) => entry.target);
}

describe('(a) load coalescing', () => {
  it('starts one load for two concurrent requests of an unloaded project', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource });
    const [slug] = await registerFolders(registry, 1);

    const [first, second] = await Promise.all([registry.runtime(slug), registry.runtime(slug)]);

    expect(double.createSource).toHaveBeenCalledTimes(1);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    registry.dispose();
  });
});

describe('(b) list states', () => {
  it('lists unloaded, then ready after runtime()', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource });
    const [slug] = await registerFolders(registry, 1);

    expect((await registry.list()).projects[0].state).toBe('unloaded');
    await registry.runtime(slug);
    const [entry] = (await registry.list()).projects;
    expect(entry.state).toBe('ready');
    expect(entry.reason).toBeNull();
    registry.dispose();
  });

  it('shows a deleted folder as unavailable once the memo window has passed, without loading it', async () => {
    const double = lendshedDouble();
    let clock = 1_000_000;
    const registry = new ProjectRegistry({ createSource: double.createSource, now: () => clock });
    const root = await makeFolder('vanishing');
    const outcome = await registry.register(root);
    expect(outcome.ok).toBe(true);

    expect((await registry.list()).projects[0].state).toBe('unloaded');
    await rm(root, { recursive: true, force: true });

    // Inside the 10 s window the earlier check is trusted.
    clock += 1_000;
    expect((await registry.list()).projects[0].state).toBe('unloaded');

    clock += 10_000;
    const [entry] = (await registry.list()).projects;
    expect(entry.state).toBe('unavailable');
    expect(entry.reason).toContain('No such path');
    expect(entry.pathChecked).toContain('vanishing');
    expect(double.createSource).not.toHaveBeenCalled();
    registry.dispose();
  });

  it('never probes an ssh entry in a list call', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource });
    const outcome = await registry.register('sftp://fixture-host/srv/never-reached');
    expect(outcome.ok).toBe(true);
    const [entry] = (await registry.list()).projects;
    expect(entry.kind).toBe('ssh');
    expect(entry.state).toBe('unloaded');
    expect(entry.displayPath).toBe('sftp://fixture-host/srv/never-reached');
    expect(double.createSource).not.toHaveBeenCalled();
    registry.dispose();
  });
});

describe('(c) the least-recently-used cap', () => {
  it('disposes none at the cap, the oldest at one over, skips a busy runtime, and reloads once', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource, maxLoaded: 5 });
    const slugs = await registerFolders(registry, 8);
    const targets = new Map((await registry.list()).projects.map((entry) => [entry.slug, entry.target]));
    const targetOf = (slug: string): string => targets.get(slug) ?? '';

    for (const slug of slugs.slice(0, 5)) await registry.runtime(slug);
    expect(registry.loadedCount()).toBe(5);
    expect(disposedTargets(double)).toEqual([]);

    await registry.runtime(slugs[5]);
    expect(disposedTargets(double)).toEqual([targetOf(slugs[0])]);
    expect(registry.loadedCount()).toBe(5);
    expect((await registry.list()).projects.find((entry) => entry.slug === slugs[0])?.state).toBe('unloaded');

    // Project 2 has a request in flight, so loading a seventh passes it over and takes project 3.
    const busy = await registry.runtime(slugs[1]);
    expect(busy).not.toBeNull();
    busy!.inFlightRequests = 1;
    await registry.runtime(slugs[6]);
    expect(disposedTargets(double)).toEqual([targetOf(slugs[0]), targetOf(slugs[2])]);
    expect(busy!.disposed).toBe(false);
    expect(registry.loadedCount()).toBe(5);

    // Two requests for the evicted first project wait on one reload.
    const before = double.createSource.mock.calls.filter(([target]) => target === targetOf(slugs[0])).length;
    const [again, same] = await Promise.all([registry.runtime(slugs[0]), registry.runtime(slugs[0])]);
    expect(again).toBe(same);
    const after = double.createSource.mock.calls.filter(([target]) => target === targetOf(slugs[0])).length;
    expect(after - before).toBe(1);
    expect(registry.loadedCount()).toBeLessThanOrEqual(5);
    busy!.inFlightRequests = 0;
    registry.dispose();
  });

  it('counts a request as a use: the touched project outlives an older one', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource, maxLoaded: 5 });
    const slugs = await registerFolders(registry, 6);
    const targets = new Map((await registry.list()).projects.map((entry) => [entry.slug, entry.target]));

    for (const slug of slugs.slice(0, 5)) await registry.runtime(slug);
    await registry.runtime(slugs[0]);
    await registry.runtime(slugs[5]);

    expect(disposedTargets(double)).toEqual([targets.get(slugs[1])]);
    registry.dispose();
  });

  it('stays over the cap while every candidate is busy, then catches up on the next load', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource, maxLoaded: 2 });
    const slugs = await registerFolders(registry, 4);

    const first = await registry.runtime(slugs[0]);
    const second = await registry.runtime(slugs[1]);
    first!.inFlightRequests = 1;
    second!.inFlightRequests = 1;
    await registry.runtime(slugs[2]);
    expect(registry.loadedCount()).toBe(3);
    expect(disposedTargets(double)).toEqual([]);

    first!.inFlightRequests = 0;
    second!.inFlightRequests = 0;
    await registry.runtime(slugs[3]);
    expect(registry.loadedCount()).toBe(2);
    registry.dispose();
  });
});

describe('(d) ssh mirrors', () => {
  const OK: MirrorRunResult = {
    sshExit: 0,
    tarExit: 0,
    sshStderr: '',
    tarStderr: '',
    timedOut: false,
    spawnError: null,
  };

  function fakeRunner(): { runner: MirrorRunner; destDirs: string[] } {
    const destDirs: string[] = [];
    const runner: MirrorRunner = async (commands) => {
      destDirs.push(commands.destDir);
      await cp(join(FIXTURES, 'sparse-started', '.planning'), join(commands.destDir, '.planning'), { recursive: true });
      return { ...OK };
    };
    return { runner, destDirs };
  }

  async function mirrorDirs(): Promise<Set<string>> {
    return new Set((await readdir(tmpdir())).filter((name) => name.startsWith('labelore-remote-')));
  }

  let baseline: Set<string>;
  beforeEach(async () => {
    baseline = await mirrorDirs();
  });

  async function leftovers(): Promise<string[]> {
    return [...(await mirrorDirs())].filter((name) => !baseline.has(name));
  }

  it('removes the mirror directory when the registry is disposed', async () => {
    const { runner, destDirs } = fakeRunner();
    const registry = new ProjectRegistry({ remoteRunner: runner });
    const outcome = await registry.register('sftp://fixture-host/srv/proj');
    if (!outcome.ok) throw new Error('ssh address was refused');

    const runtime = await registry.runtime(outcome.slug);
    expect(runtime?.derived.presentation.loadStatus.status).toBe('ok');
    expect(existsSync(destDirs[0])).toBe(true);

    registry.dispose();
    expect(existsSync(destDirs[0])).toBe(false);
    expect(await leftovers()).toEqual([]);
  });

  it('removes the mirror directory when the ssh runtime is evicted', async () => {
    const { runner, destDirs } = fakeRunner();
    // The default source builder is what mirrors.
    const sshRegistry = new ProjectRegistry({ maxLoaded: 1, remoteRunner: runner });
    const ssh = await sshRegistry.register('sftp://fixture-host/srv/proj');
    if (!ssh.ok) throw new Error('ssh address was refused');
    await sshRegistry.runtime(ssh.slug);
    expect(existsSync(destDirs[0])).toBe(true);
    expect(sshRegistry.loadedCount()).toBe(1);

    // A second ssh project pushes the first one out of a cap of one.
    const other = await sshRegistry.register('sftp://other-host/srv/other');
    if (!other.ok) throw new Error('ssh address was refused');
    await sshRegistry.runtime(other.slug);
    expect(existsSync(destDirs[0])).toBe(false);
    expect(existsSync(destDirs[1])).toBe(true);
    expect(sshRegistry.loadedCount()).toBe(1);

    sshRegistry.dispose();
    expect(existsSync(destDirs[1])).toBe(false);
    expect(await leftovers()).toEqual([]);
  });
});

describe('identity de-duplication', () => {
  it('treats ssh, sftp and scp forms of one place as one project, ignoring host case and the default port', async () => {
    const registry = new ProjectRegistry({});
    const first = await registry.register('sftp://dev@Fixture-Host/srv/proj');
    expect(first).toMatchObject({ ok: true, duplicate: false });
    const slug = first.ok ? first.slug : '';

    for (const form of [
      'ssh://dev@fixture-host:22/srv/proj',
      'dev@fixture-host:/srv/proj',
      'sftp://dev@fixture-host/srv/proj/.planning',
    ]) {
      expect(await registry.register(form), form).toEqual({ ok: true, slug, duplicate: true });
    }
    expect((await registry.list()).projects).toHaveLength(1);
    registry.dispose();
  });

  it('keeps a different user, port or remote root as its own project with its own slug', async () => {
    const registry = new ProjectRegistry({});
    const first = await registry.register('sftp://dev@fixture-host/srv/proj');
    const otherUser = await registry.register('sftp://ops@fixture-host/srv/proj');
    const otherPort = await registry.register('sftp://dev@fixture-host:2222/srv/proj');
    const otherRoot = await registry.register('sftp://dev@fixture-host/srv/Proj');
    for (const outcome of [first, otherUser, otherPort, otherRoot]) {
      expect(outcome).toMatchObject({ ok: true, duplicate: false });
    }
    const slugs = [first, otherUser, otherPort, otherRoot].map((outcome) => (outcome.ok ? outcome.slug : ''));
    expect(new Set(slugs).size).toBe(4);
    expect(slugs[0]).toBe('proj');
    expect(slugs[1]).toBe('proj-2');
    registry.dispose();
  });

  it('gives two folders whose names fold to one slug base-2, and refuses a folder that is not a project', async () => {
    const registry = new ProjectRegistry({});
    const upper = await makeFolder('Same Name');
    const lower = await makeFolder('same-name');
    expect(await registry.register(upper)).toMatchObject({ ok: true, slug: 'same-name' });
    expect(await registry.register(lower)).toMatchObject({ ok: true, slug: 'same-name-2' });
    const missing = await registry.register(join(parent, 'does-not-exist'));
    expect(missing.ok).toBe(false);
    registry.dispose();
  });
});

describe('(e) heap across repeated switching', () => {
  it('keeps at most five loaded and does not grow the heap over three rounds of eight projects', async () => {
    v8.setFlagsFromString('--expose_gc');
    const gc = vm.runInNewContext('gc') as () => void;
    // Plain functions, not vi.fn: a mock keeps every call's result, which would hold every evicted
    // snapshot alive and measure the test double instead of the registry.
    let created = 0;
    let released = 0;
    const createSource = async (target: string): Promise<SnapshotSource> => {
      const repository = new PlanningRepository(new InMemoryPlanningFilesystem(LENDSHED_FILES), target);
      await repository.load();
      created += 1;
      let disposed = false;
      return {
        getSnapshot: () => repository.getSnapshot(),
        refresh: () => repository.refresh(),
        planningFilesystem: () => repository.planningFilesystem(),
        dispose: () => {
          if (!disposed) released += 1;
          disposed = true;
        },
      };
    };
    const registry = new ProjectRegistry({ createSource, maxLoaded: 5 });
    const slugs = await registerFolders(registry, 8);

    const heapAfterRound: number[] = [];
    for (let round = 0; round < 3; round += 1) {
      for (const slug of slugs) {
        await registry.runtime(slug);
        expect(registry.loadedCount()).toBeLessThanOrEqual(5);
        await flushImmediates();
      }
      await flushImmediates();
      gc();
      gc();
      heapAfterRound.push(process.memoryUsage().heapUsed);
    }

    expect(heapAfterRound[2]).toBeLessThanOrEqual(heapAfterRound[0] * 1.25);
    // Every eviction released its source: what was created and not released is what is still loaded.
    expect(created - released).toBe(registry.loadedCount());
    registry.dispose();
  }, 60_000);
});

describe('(f) a disposed runtime', () => {
  function lendshedSource(): Promise<SnapshotSource> {
    const repository = new PlanningRepository(new InMemoryPlanningFilesystem(LENDSHED_FILES), '/project');
    return repository.load().then(() => repository);
  }

  it('never runs its scheduled search-index build', async () => {
    const source = await lendshedSource();
    const runtime = new ProjectRuntime(source, 'project');
    runtime.dispose();
    await flushImmediates();
    await flushImmediates();
    expect(runtime.derived.searchIndexState.state().status).toBe('building');
  });

  it('control: a runtime that is not disposed finishes its build', async () => {
    const source = await lendshedSource();
    const runtime = new ProjectRuntime(source, 'project');
    await flushImmediates();
    await flushImmediates();
    expect(runtime.derived.searchIndexState.state().status).toBe('ready');
    runtime.dispose();
  });

  it('is idempotent and releases the source once', async () => {
    const dispose = vi.fn();
    const repository = new PlanningRepository(new InMemoryPlanningFilesystem(LENDSHED_FILES), '/project');
    await repository.load();
    const runtime = new ProjectRuntime({ getSnapshot: () => repository.getSnapshot(), dispose }, 'project');
    runtime.dispose();
    runtime.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(runtime.disposed).toBe(true);
  });
});

describe('(g) registry.dispose()', () => {
  it('disposes every loaded runtime once, does nothing the second time, and answers null afterwards', async () => {
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ createSource: double.createSource });
    const slugs = await registerFolders(registry, 3);
    for (const slug of slugs) await registry.runtime(slug);

    registry.dispose();
    for (const entry of double.disposals) expect(entry.dispose).toHaveBeenCalledTimes(1);
    registry.dispose();
    for (const entry of double.disposals) expect(entry.dispose).toHaveBeenCalledTimes(1);

    expect(await registry.runtime(slugs[0])).toBeNull();
    expect(double.createSource).toHaveBeenCalledTimes(3);
  });

  it('does not keep a runtime whose load finished after the registry closed', async () => {
    let finish: (source: SnapshotSource) => void = () => undefined;
    const pending = new Promise<SnapshotSource>((resolveSource) => {
      finish = resolveSource;
    });
    const registry = new ProjectRegistry({ createSource: () => pending });
    const [slug] = await registerFolders(registry, 1);

    const loading = registry.runtime(slug);
    registry.dispose();
    const dispose = vi.fn();
    const repository = new PlanningRepository(new InMemoryPlanningFilesystem(LENDSHED_FILES), '/project');
    await repository.load();
    finish({ getSnapshot: () => repository.getSnapshot(), dispose });

    expect(await loading).toBeNull();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('a source that cannot be created', () => {
  it('becomes an unavailable project with a path-not-found message, never a throw', async () => {
    const registry = new ProjectRegistry({
      createSource: () => Promise.reject(new Error('disk on fire')),
    });
    const [slug] = await registerFolders(registry, 1);

    const runtime = await registry.runtime(slug);
    expect(runtime).not.toBeNull();
    const [entry] = (await registry.list()).projects;
    expect(entry.state).toBe('unavailable');
    expect(entry.reason).toContain('No such path');
    expect(entry.pathChecked).not.toBeNull();
    expect(registry.loadedCount()).toBe(0);

    // A failed runtime is kept until a caller asks to retry it.
    expect(await registry.runtime(slug)).toBe(runtime);
    const retried = await registry.runtime(slug, { retryFailed: true });
    expect(retried).not.toBe(runtime);
    expect(runtime!.disposed).toBe(true);
    registry.dispose();
  });
});

// ---- Remembered projects (PLAT-06, D-09, D-11, D-12) -------------------------------------------------

const SHAPES = realpathSync(SHAPES_ROOT);
const LENDSHED = realpathSync(FX_ROOT);

async function freshSettingsDir(): Promise<string> {
  return mkdtemp(join(parent, 'settings-'));
}

function fileStore(dir: string): FileSettingsStore {
  return new FileSettingsStore(dir, identityOfTarget);
}

async function settingsFile(dir: string): Promise<{ projects: Record<string, unknown>[]; lastActive: string | null }> {
  return JSON.parse(await readFile(join(dir, 'settings.json'), 'utf8')) as {
    projects: Record<string, unknown>[];
    lastActive: string | null;
  };
}

describe('(h) a project added through the registry is remembered', () => {
  it('lists the same slug and target again from a new registry over the same settings directory', async () => {
    const dir = await freshSettingsDir();
    const first = new ProjectRegistry({ store: fileStore(dir) });
    expect(await first.add(SHAPES_ROOT)).toEqual({ ok: true, slug: 'shapes', name: 'Kilnrow', duplicate: false });
    first.dispose();

    const second = new ProjectRegistry({ store: fileStore(dir) });
    const { projects, notices } = await second.list();
    expect(projects.map((project) => [project.slug, project.target])).toEqual([['shapes', SHAPES]]);
    expect(notices).toEqual([]);
    second.dispose();
  });

  it('answers a repeat add, also through the .planning folder, as the same project', async () => {
    const dir = await freshSettingsDir();
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    await registry.add(SHAPES_ROOT);
    expect(await registry.add(`${SHAPES_ROOT}/.planning`)).toMatchObject({ ok: true, slug: 'shapes', duplicate: true });
    expect((await settingsFile(dir)).projects).toHaveLength(1);
    registry.dispose();
  });

  it('keeps one entry when two simultaneous adds name one new target', async () => {
    const dir = await freshSettingsDir();
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    const [one, two] = await Promise.all([registry.add(SHAPES_ROOT), registry.add(SHAPES_ROOT)]);
    expect([one, two].map((outcome) => (outcome.ok ? outcome.duplicate : null)).sort()).toEqual([false, true]);
    expect((await registry.list()).projects).toHaveLength(1);
    expect((await settingsFile(dir)).projects).toHaveLength(1);
    registry.dispose();
  });

  it('allocates the slug against the latest file, so a second instance cannot mint the same slug', async () => {
    const dir = await freshSettingsDir();
    const early = new ProjectRegistry({ store: fileStore(dir) });
    const late = new ProjectRegistry({ store: fileStore(dir) });
    const copy = await makeFolder('shapes');
    await mkdir(join(copy, '.planning'), { recursive: true });
    expect(await early.add(SHAPES_ROOT)).toMatchObject({ slug: 'shapes' });
    expect(await late.add(copy)).toMatchObject({ slug: 'shapes-2' });
    early.dispose();
    late.dispose();
  });

  it('uses a hand-edited slug as written and reports skipped entries as notices (D-12)', async () => {
    const dir = await freshSettingsDir();
    const when = new Date(0).toISOString();
    const row = (target: string, slug: string): Record<string, unknown> => ({ target, slug, addedAt: when, lastOpened: null });
    await writeFile(
      join(dir, 'settings.json'),
      JSON.stringify({ version: 1, projects: [row(SHAPES, 'kiln-board'), row(LENDSHED, 'api')], lastActive: null }),
    );
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    const { projects, notices } = await registry.list();
    expect(projects.map((project) => project.slug)).toEqual(['kiln-board']);
    expect(notices).toEqual([skippedNotice('its slug "api" is reserved')]);
    registry.dispose();
  });

  it('keeps an entry whose write failed for this run and says so in the list notices', async () => {
    const failing: SettingsStore = {
      location: () => null,
      read: () => new MemorySettingsStore().read(),
      mutate: (update: (state: SettingsState) => SettingsState) => ({
        ok: false,
        state: update(emptySettings()),
        reason: 'EACCES',
      }),
    };
    const registry = new ProjectRegistry({ store: failing });
    expect(await registry.add(SHAPES_ROOT)).toMatchObject({ ok: true, slug: 'shapes', duplicate: false });
    const { projects, notices } = await registry.list();
    expect(projects.map((project) => project.slug)).toEqual(['shapes']);
    expect(notices).toEqual([saveFailedNotice('EACCES')]);
    expect(saveFailedNotice('EACCES')).toBe(
      'Could not save the project list: EACCES. The change lasts only until Labelore restarts.',
    );
    registry.dispose();
  });

  it('refuses a bad target with its own status and writes nothing', async () => {
    const dir = await freshSettingsDir();
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    const missing = join(parent, 'not-there');
    const outcome = await registry.add(missing);
    expect(outcome).toMatchObject({ ok: false, code: 'invalid-target', status: { status: 'path-not-found', pathChecked: missing } });
    expect(await registry.add('')).toMatchObject({ ok: false, code: 'invalid-input' });
    expect(await registry.add('a\0b')).toMatchObject({ ok: false, code: 'invalid-input' });
    expect(await registry.add('x'.repeat(1025))).toMatchObject({ ok: false, code: 'invalid-input' });
    expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    registry.dispose();
  });

  it('checks an ssh target for syntax only: it connects on first open', async () => {
    const dir = await freshSettingsDir();
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ store: fileStore(dir), createSource: double.createSource });
    expect(await registry.add('sftp://dev@fixture-host/srv/proj')).toMatchObject({ ok: true, slug: 'proj', duplicate: false });
    expect(await registry.add('dev@fixture-host:/srv/proj')).toMatchObject({ ok: true, slug: 'proj', duplicate: true });
    expect(await registry.add('ssh://dev:secret@fixture-host/srv/other')).toMatchObject({ ok: false, code: 'invalid-target' });
    expect(double.createSource).not.toHaveBeenCalled();
    expect((await settingsFile(dir)).projects).toHaveLength(1);
    registry.dispose();
  });
});

describe('(i) command-line targets (D-09, D-22)', () => {
  it('remembers a valid path and lists a failing one for this run only, with its reason', async () => {
    const dir = await freshSettingsDir();
    const missing = join(parent, 'cli-missing-folder');
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    await registry.registerCliTargets([SHAPES_ROOT, missing, SHAPES_ROOT, missing]);

    const { projects } = await registry.list();
    expect(projects.map((project) => project.slug)).toEqual(['shapes', 'cli-missing-folder']);
    const [valid, broken] = projects;
    expect(valid).toMatchObject({ sessionOnly: false, state: 'unloaded' });
    expect(broken).toMatchObject({ sessionOnly: true, state: 'unavailable', pathChecked: missing });
    expect(broken.reason).toBe(`No such path: ${missing} (resolved: ${missing})`);

    const saved = await settingsFile(dir);
    expect(saved.projects.map((project) => project.slug)).toEqual(['shapes']);
    registry.dispose();

    const next = new ProjectRegistry({ store: fileStore(dir) });
    expect((await next.list()).projects.map((project) => project.slug)).toEqual(['shapes']);
    next.dispose();
  });

  it('gives a session-only entry a slug that no other entry holds', async () => {
    const registry = new ProjectRegistry({});
    await registry.register(await makeFolder('taken'));
    await registry.registerCliTargets([join(parent, 'taken-gone', 'taken')]);
    expect((await registry.list()).projects.map((project) => project.slug)).toEqual(['taken', 'taken-2']);
    registry.dispose();
  });
});

/** Every file and folder under `root` with the file's bytes (null for a folder): what "byte-identical" compares. */
async function treeOf(root: string): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const entry of (await readdir(root, { recursive: true, withFileTypes: true })).sort((left, right) =>
    join(left.parentPath, left.name).localeCompare(join(right.parentPath, right.name)),
  )) {
    const full = join(entry.parentPath, entry.name);
    out[full.slice(root.length)] = entry.isDirectory() ? null : await readFile(full, 'utf8');
  }
  return out;
}

describe('(j) order, open and forget (D-04, D-08, D-10)', () => {
  async function five(registry: ProjectRegistry): Promise<Record<'a' | 'b' | 'c' | 'd' | 'e', string>> {
    const slugs: string[] = [];
    for (const name of ['ord-a', 'ord-b', 'ord-c', 'ord-d', 'ord-e']) {
      const outcome = await registry.add(await makeFolder(name));
      if (!outcome.ok) throw new Error('fixture folder was refused');
      slugs.push(outcome.slug);
    }
    return { a: slugs[0], b: slugs[1], c: slugs[2], d: slugs[3], e: slugs[4] };
  }

  it('lists last opened first, then never-opened in added order, keeping equal stamps and unavailable places', async () => {
    const dir = await freshSettingsDir();
    const double = lendshedDouble();
    let clock = Date.parse('2026-03-01T10:00:00.000Z');
    const registry = new ProjectRegistry({ store: fileStore(dir), createSource: double.createSource, now: () => clock });
    const slug = await five(registry);

    await registry.open(slug.a);
    clock += 60_000;
    const t2 = clock;
    await registry.open(slug.b);
    await registry.open(slug.c); // the same instant as b: added order breaks the tie
    clock += 60_000;
    const t3 = clock;
    await registry.open(slug.a);

    const listed = (await registry.list()).projects;
    expect(listed.map((project) => project.slug)).toEqual([slug.a, slug.b, slug.c, slug.d, slug.e]);
    expect(listed.map((project) => project.lastOpened)).toEqual([
      new Date(t3).toISOString(),
      new Date(t2).toISOString(),
      new Date(t2).toISOString(),
      null,
      null,
    ]);

    // d is a never-opened project whose folder disappears: it is shown unavailable in the same place.
    const before = listed.map((project) => project.slug);
    await rm(join(parent, 'ord-d'), { recursive: true, force: true });
    clock += 60_000;
    const after = (await registry.list()).projects;
    expect(after.map((project) => project.slug)).toEqual(before);
    expect(after[3]).toMatchObject({ slug: slug.d, state: 'unavailable' });

    // The order is remembered across a restart.
    registry.dispose();
    const restarted = new ProjectRegistry({ store: fileStore(dir), now: () => clock });
    expect((await restarted.list()).projects.map((project) => project.slug)).toEqual(before);
    restarted.dispose();
  });

  it('orders an older open below a newer one even when the older project was added later', async () => {
    let clock = Date.parse('2026-05-05T05:05:05.000Z');
    const registry = new ProjectRegistry({ createSource: lendshedDouble().createSource, now: () => clock });
    const slug = await five(registry);
    await registry.open(slug.e);
    clock += 1_000;
    await registry.open(slug.b);
    expect((await registry.list()).projects.map((project) => project.slug)).toEqual([slug.b, slug.e, slug.a, slug.c, slug.d]);
    registry.dispose();
  });

  it('opens one entry only: stamps its lastOpened and lastActive and leaves the others as they were', async () => {
    const dir = await freshSettingsDir();
    const double = lendshedDouble();
    const clock = Date.parse('2026-04-02T08:30:00.000Z');
    const registry = new ProjectRegistry({ store: fileStore(dir), createSource: double.createSource, now: () => clock });
    const slug = await five(registry);

    const outcome = await registry.open(slug.c);
    expect(outcome).toEqual({ slug: slug.c, state: 'loading' });
    expect(await registry.open('nope')).toBeNull();
    await registry.runtime(slug.c);

    const saved = await settingsFile(dir);
    expect(saved.lastActive).toBe(slug.c);
    for (const row of saved.projects) {
      expect(row.lastOpened, String(row.slug)).toBe(row.slug === slug.c ? '2026-04-02T08:30:00.000Z' : null);
    }
    expect(double.createSource).toHaveBeenCalledTimes(1);
    registry.dispose();
  });

  it('retries a folder that was missing at its first load and has been restored', async () => {
    const dir = await freshSettingsDir();
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    const root = await makeFolder('restorable');
    const added = await registry.add(root);
    if (!added.ok) throw new Error('fixture folder was refused');

    await rm(root, { recursive: true, force: true });
    await registry.runtime(added.slug);
    expect((await registry.list()).projects[0].state).toBe('unavailable');

    await makeFolder('restorable');
    const opened = await registry.open(added.slug);
    expect(opened?.state).toBe('loading');
    await registry.runtime(added.slug);
    expect((await registry.list()).projects[0]).toMatchObject({ state: 'ready', reason: null });
    registry.dispose();
  });

  it('forgets by editing the settings file only: runtime disposed, folder byte-identical, slug back on re-add', async () => {
    const dir = await freshSettingsDir();
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ store: fileStore(dir), createSource: double.createSource });
    const root = await makeFolder('forgettable');
    await writeFile(join(root, '.planning', 'PROJECT.md'), '# Forgettable\n');
    const added = await registry.add(root);
    if (!added.ok) throw new Error('fixture folder was refused');
    await registry.runtime(added.slug);
    const before = await treeOf(root);
    expect(Object.keys(before).length).toBeGreaterThan(0);

    expect(await registry.forget(added.slug)).toEqual({ ok: true });
    expect(double.disposals[0].dispose).toHaveBeenCalledTimes(1);
    expect((await registry.list()).projects).toEqual([]);
    expect((await settingsFile(dir)).projects).toEqual([]);
    expect(await treeOf(root)).toEqual(before);
    expect(await registry.runtime(added.slug)).toBeNull();
    expect(await registry.forget(added.slug)).toEqual({ ok: false, code: 'unknown' });

    expect(await registry.add(root)).toMatchObject({ ok: true, slug: added.slug, duplicate: false });
    registry.dispose();
  });

  it('gives a re-added project its old slug back while that slug is free, even when the base is free too', async () => {
    const registry = new ProjectRegistry({});
    const first = await registry.add(await makeFolder('twin'));
    const nested = join(parent, 'elsewhere', 'twin');
    await mkdir(join(nested, '.planning'), { recursive: true });
    const second = await registry.add(nested);
    expect([first, second].map((outcome) => (outcome.ok ? outcome.slug : null))).toEqual(['twin', 'twin-2']);

    await registry.forget('twin');
    await registry.forget('twin-2');
    expect(await registry.add(nested)).toMatchObject({ ok: true, slug: 'twin-2' });
    registry.dispose();
  });

  it('keeps the entry and answers the save-failed copy when the write fails', async () => {
    const dir = await freshSettingsDir();
    const inner = fileStore(dir);
    let failing = false;
    const store: SettingsStore = {
      location: () => inner.location(),
      read: () => inner.read(),
      mutate: (update) =>
        failing ? { ok: false, state: update(inner.read().state), reason: 'EROFS' } : inner.mutate(update),
    };
    const registry = new ProjectRegistry({ store });
    const added = await registry.add(await makeFolder('stays'));
    if (!added.ok) throw new Error('fixture folder was refused');

    failing = true;
    expect(await registry.forget(added.slug)).toEqual({
      ok: false,
      code: 'save-failed',
      error: 'Could not save the project list: EROFS. The change lasts only until Labelore restarts.',
    });
    expect((await registry.list()).projects.map((project) => project.slug)).toEqual([added.slug]);
    expect((await settingsFile(dir)).projects).toHaveLength(1);
    registry.dispose();
  });

  it('removes a session-only entry from memory without touching the settings file', async () => {
    const dir = await freshSettingsDir();
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    await registry.registerCliTargets([join(parent, 'session-gone')]);
    expect(await registry.forget('session-gone')).toEqual({ ok: true });
    expect((await registry.list()).projects).toEqual([]);
    expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    registry.dispose();
  });
});

describe('(k) names from PROJECT.md (D-21)', () => {
  async function titled(name: string, projectMd: string | null): Promise<string> {
    const root = await makeFolder(name);
    if (projectMd !== null) await writeFile(join(root, '.planning', 'PROJECT.md'), projectMd);
    return root;
  }

  it('names rows by frontmatter title, else the first heading, else the folder; an edit changes the name, not the slug', async () => {
    let clock = 5_000_000;
    const registry = new ProjectRegistry({ now: () => clock });
    const front = await titled('title-front', '---\ntitle: Kiln Board\n---\n\n# Ignored heading\n');
    const heading = await titled('title-heading', '# Pottery Booking\n\nBody.\n');
    const none = await titled('title-none', null);
    for (const root of [front, heading, none]) await registry.add(root);

    const names = async (): Promise<string[]> => (await registry.list()).projects.map((project) => project.name);
    expect(await names()).toEqual(['Kiln Board', 'Pottery Booking', 'title-none']);

    await writeFile(join(heading, '.planning', 'PROJECT.md'), '# Renamed Booking\n');
    expect(await names()).toEqual(['Kiln Board', 'Pottery Booking', 'title-none']); // inside the memo window
    clock += 10_001;
    const after = (await registry.list()).projects;
    expect(after.map((project) => project.name)).toEqual(['Kiln Board', 'Renamed Booking', 'title-none']);
    expect(after.map((project) => project.slug)).toEqual(['title-front', 'title-heading', 'title-none']);
    registry.dispose();
  });

  it('reads at most 16384 bytes, trims, cuts to 200 characters and never throws', async () => {
    const late = await titled('title-late', `${'filler line\n'.repeat(2000)}# Too Late\n`);
    expect(await readProjectTitle(late)).toBeNull();
    const long = await titled('title-long', `#   ${'x'.repeat(400)}   \n`);
    expect(await readProjectTitle(long)).toBe('x'.repeat(200));
    const broken = await titled('title-broken', '---\ntitle: [unclosed\n---\n# After Broken\n');
    expect(await readProjectTitle(broken)).toBe('After Broken');
    expect(await readProjectTitle(join(parent, 'no-such-folder'))).toBeNull();
  });

  it('names an ssh row by the title remembered from its last successful load, else its folder name', async () => {
    const dir = await freshSettingsDir();
    const when = new Date(0).toISOString();
    const row = (target: string, slug: string, name?: string): Record<string, unknown> => ({
      target,
      slug,
      addedAt: when,
      lastOpened: null,
      ...(name === undefined ? {} : { name }),
    });
    await writeFile(
      join(dir, 'settings.json'),
      JSON.stringify({
        version: 1,
        projects: [
          row('sftp://dev@fixture-host/srv/remembered', 'remembered', 'Remote Title'),
          row('sftp://dev@fixture-host/srv/plain', 'plain'),
        ],
        lastActive: null,
      }),
    );
    const registry = new ProjectRegistry({ store: fileStore(dir) });
    expect((await registry.list()).projects.map((project) => project.name)).toEqual(['Remote Title', 'plain']);
    registry.dispose();
  });

  it('remembers the title a successful load found', async () => {
    const dir = await freshSettingsDir();
    const double = lendshedDouble();
    const registry = new ProjectRegistry({ store: fileStore(dir), createSource: double.createSource });
    const added = await registry.add(await makeFolder('hint-source'));
    if (!added.ok) throw new Error('fixture folder was refused');
    await registry.runtime(added.slug);
    expect((await settingsFile(dir)).projects[0].name).toBe('Lendshed');
    registry.dispose();
  });
});
