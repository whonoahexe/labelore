// Pins the registry lifecycle (PLAT-02): load coalescing, the list states, the least-recently-used cap
// of five loaded runtimes, disposal (ssh mirrors and scheduled index builds), and a heap that stays
// bounded across repeated switching. Projects are made-up folders in a temp directory; where a test
// needs a real load it builds Lendshed's files in memory behind a createSource double.
import { cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import v8 from 'node:v8';
import vm from 'node:vm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MirrorRunResult } from '../../src/cli/remote-target.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { ProjectRegistry } from '../../src/server/project-registry.ts';
import { ProjectRuntime } from '../../src/server/project-runtime.ts';
import type { SnapshotSource } from '../../src/server/project-runtime.ts';
import type { MirrorRunner } from '../../src/server/remote-source.ts';
import { FX_ROOT, planningFiles } from '../helpers/fixture-project.ts';

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
