// SEC-05, D-19: Labelore's one write, its own settings file, can never land inside a project it shows.
// A target that holds the settings folder is refused on add and listed unavailable (never loaded) when it
// is already remembered, and a full add, load, refresh, open and forget cycle leaves every target tree
// byte-identical. Targets are temp copies of the made-up Lendshed project; nothing here writes next to
// the committed fixtures.
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import { ProjectRegistry, createSnapshotSource, identityOfTarget, settingsInsideMessage } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import type { SnapshotSource } from '../../src/server/project-runtime.ts';
import { FileSettingsStore } from '../../src/server/settings-store.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { guardedRequest, testPolicy } from '../helpers/guarded-request.ts';

const made: string[] = [];

afterAll(async () => {
  await Promise.all(made.map((path) => rm(path, { recursive: true, force: true })));
});

/** A temp copy of the Lendshed project: the only thing this file ever points the registry at. */
async function mountFixture(): Promise<string> {
  const root = realpathSync(await mkdtemp(join(tmpdir(), 'labelore-disjoint-target-')));
  made.push(root);
  await cp(FX_ROOT, root, { recursive: true });
  return root;
}

async function outsideDir(): Promise<string> {
  const dir = realpathSync(await mkdtemp(join(tmpdir(), 'labelore-disjoint-settings-')));
  made.push(dir);
  return dir;
}

/** Every file and folder under `root`, sorted, with each file's bytes: what "byte-identical" compares. */
async function treeOf(root: string): Promise<[string, string | null][]> {
  const out: [string, string | null][] = [];
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    const full = join(entry.parentPath, entry.name);
    out.push([relative(root, full), entry.isDirectory() ? null : (await readFile(full)).toString('base64')]);
  }
  return out.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

function inside(path: string, root: string): boolean {
  return path === root || path.startsWith(root.endsWith(sep) ? root : root + sep);
}

describe('a settings folder inside a target (D-19)', () => {
  it('refuses to add a target that holds the settings folder, creating nothing inside it', async () => {
    const target = await mountFixture();
    const before = await treeOf(target);
    const settingsDir = join(target, 'labelore-settings');
    const store = new FileSettingsStore(settingsDir, identityOfTarget);
    const registry = new ProjectRegistry({ store });

    const outcome = await registry.add(target);
    expect(outcome).toEqual({
      ok: false,
      code: 'settings-inside',
      error: settingsInsideMessage(settingsDir),
      pathChecked: target,
    });
    expect(outcome.ok === false && 'error' in outcome ? outcome.error : '').toContain(
      'Set LABELORE_CONFIG_DIR to a folder outside the project and restart.',
    );
    expect(existsSync(settingsDir)).toBe(false);
    expect(await treeOf(target)).toEqual(before);
    expect((await registry.list()).projects).toEqual([]);
    registry.dispose();
  });

  it('refuses it through POST /api/projects with 422 and the path checked', async () => {
    const target = await mountFixture();
    const settingsDir = join(target, 'nested', 'labelore-settings');
    const registry = new ProjectRegistry({ store: new FileSettingsStore(settingsDir, identityOfTarget) });
    const app = createRegistryApp(registry, { policy: testPolicy() });

    const response = await guardedRequest(app, '/api/projects', { method: 'POST', body: JSON.stringify({ target }) });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: settingsInsideMessage(settingsDir), status: { pathChecked: target } });
    expect(existsSync(join(target, 'nested'))).toBe(false);
    registry.dispose();
  });

  it('lists a remembered target that holds the settings folder unavailable with the same reason, and never loads it', async () => {
    const target = await mountFixture();
    const settingsDir = join(target, 'labelore-settings');
    await mkdir(settingsDir, { recursive: true });
    const when = new Date(0).toISOString();
    await writeFile(
      join(settingsDir, 'settings.json'),
      JSON.stringify({
        version: 1,
        projects: [{ target, slug: 'inside', addedAt: when, lastOpened: null }],
        lastActive: null,
      }),
    );
    const createSource = vi.fn((_target: string): Promise<SnapshotSource> => createSnapshotSource(_target));
    const registry = new ProjectRegistry({ store: new FileSettingsStore(settingsDir, identityOfTarget), createSource });

    const [entry] = (await registry.list()).projects;
    expect(entry).toMatchObject({
      slug: 'inside',
      state: 'unavailable',
      reason: settingsInsideMessage(settingsDir),
      pathChecked: target,
    });

    // Opening, retrying and asking for its runtime all stay away from the project.
    expect(await registry.open('inside')).not.toBeNull();
    const runtime = await registry.runtime('inside', { retryFailed: true });
    expect(runtime).not.toBeNull();
    expect(runtime?.derived.presentation.loadStatus.status).not.toBe('ok');
    expect(createSource).not.toHaveBeenCalled();
    expect((await registry.list()).projects[0].state).toBe('unavailable');
    registry.dispose();
  });

  it('applies the same check when the settings folder is named by option, with a store outside the target', async () => {
    const target = await mountFixture();
    const settingsDir = join(target, 'labelore-settings');
    const registry = new ProjectRegistry({
      store: new FileSettingsStore(await outsideDir(), identityOfTarget),
      settingsDir,
    });
    expect(await registry.add(target)).toMatchObject({ ok: false, code: 'settings-inside' });
    await registry.registerCliTargets([target]);
    const [entry] = (await registry.list()).projects;
    expect(entry).toMatchObject({ sessionOnly: true, state: 'unavailable', reason: settingsInsideMessage(settingsDir) });
    expect(existsSync(settingsDir)).toBe(false);
    registry.dispose();
  });

  it('compares path segments, so a sibling folder sharing a name prefix is not inside', async () => {
    const target = await mountFixture();
    const registry = new ProjectRegistry({
      store: new FileSettingsStore(await outsideDir(), identityOfTarget),
      settingsDir: `${target}-settings`,
    });
    expect(await registry.add(target)).toMatchObject({ ok: true, duplicate: false });
    registry.dispose();
  });
});

describe('every write path leaves a target byte-identical (SEC-05)', () => {
  it('adds, loads, refreshes, opens and forgets without changing one byte of the target', async () => {
    const target = await mountFixture();
    const before = await treeOf(target);
    const dir = await outsideDir();
    const store = new FileSettingsStore(dir, identityOfTarget);
    const registry = new ProjectRegistry({ store });
    const app = createRegistryApp(registry, { policy: testPolicy() });

    const added = await registry.add(target);
    if (!added.ok) throw new Error('the mounted fixture was refused');
    expect(await treeOf(target)).toEqual(before);

    const runtime = await registry.runtime(added.slug);
    expect(runtime?.derived.presentation.loadStatus.status).toBe('ok');
    expect(await treeOf(target)).toEqual(before);

    const refresh = await guardedRequest(app, `/api/projects/${added.slug}/refresh`, { method: 'POST' });
    expect(refresh.status).toBe(200);
    expect(await treeOf(target)).toEqual(before);

    const opened = await guardedRequest(app, `/api/projects/${added.slug}/open`, { method: 'POST' });
    expect(opened.status).toBe(200);
    await registry.runtime(added.slug);
    expect(await treeOf(target)).toEqual(before);

    const listed = (await (await guardedRequest(app, '/api/projects')).json()) as ProjectListResponse;
    expect(listed.projects.map((project) => project.slug)).toEqual([added.slug]);

    const forgotten = await guardedRequest(app, `/api/projects/${added.slug}`, { method: 'DELETE' });
    expect(forgotten.status).toBe(200);
    expect(await treeOf(target)).toEqual(before);

    // The settings file is the only thing that was written, and it lives outside the target.
    expect(existsSync(join(dir, 'settings.json'))).toBe(true);
    expect(inside(join(dir, 'settings.json'), target)).toBe(false);
    registry.dispose();
  });

  it('keeps the settings file location outside every listed local target', async () => {
    const first = await mountFixture();
    const second = await mountFixture();
    const dir = await outsideDir();
    const store = new FileSettingsStore(dir, identityOfTarget);
    const registry = new ProjectRegistry({ store });
    await registry.add(first);
    await registry.add(second);
    await registry.registerCliTargets([join(tmpdir(), 'labelore-disjoint-missing')]);

    const location = store.location();
    expect(location).not.toBeNull();
    const { projects } = await registry.list();
    expect(projects.length).toBe(3);
    for (const project of projects.filter((entry) => entry.kind === 'local')) {
      expect(inside(location ?? '', project.target), `${project.slug}: ${location} vs ${project.target}`).toBe(false);
    }
    registry.dispose();
  });
});
