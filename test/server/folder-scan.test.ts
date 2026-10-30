// The folder scan (PLAT-05, SEC-05, D-14 to D-17): POST /api/projects/scan walks a folder inside $HOME,
// two levels down, and lists the GSD projects it finds; POST /api/projects/add-many remembers the picked
// ones without loading them. Every tree here is built in an mkdtemp directory that stands in for the
// user's home; nothing under the real home or fixtures/ is read or written.
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import { ProjectRegistry, createSnapshotSource } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
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
  await touch(join(home, 'Work/acme/portal/.planning/PROJECT.md'), '# Portal\n\nA portal.\n');
  await touch(join(home, 'Work/beta/portal/.planning/STATE.md'), '# State\n');
  await touch(join(home, 'Work/solo/.planning/ROADMAP.md'), '# Roadmap\n');
  await touch(join(home, 'Work/acme/mapped/.planning/codebase/STACK.md'), '# Stack\n');
  await touch(join(home, 'Work/acme/deep/inner/.planning/PROJECT.md'), '# Too deep\n');
  await touch(join(home, 'Work/.hidden/p/.planning/PROJECT.md'), '# Hidden\n');
  await touch(join(home, 'Work/node_modules/p/.planning/PROJECT.md'), '# Modules\n');
  await touch(join(outside, '.planning/PROJECT.md'), '# Outside\n');
  await symlink(outside, join(home, 'Work/link'));
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

    const scan = await postJson(app, '/api/projects/scan', { folder: '~/Work' });
    expect(scan.status).toBe(200);
    const first = (await scan.json()) as {
      folder: string;
      found: { path: string; displayPath: string; name: string; alreadyAdded: boolean }[];
      capped: boolean;
      cap: number;
    };
    expect(first.folder).toBe('~/Work');
    expect(first.capped).toBe(false);
    expect(first.cap).toBe(100);
    expect(first.found.map((project) => project.displayPath)).toEqual([
      '~/Work/acme/mapped',
      '~/Work/acme/portal',
      '~/Work/beta/portal',
      '~/Work/solo',
    ]);
    expect(first.found.map((project) => project.path)).toEqual([
      join(home, 'Work/acme/mapped'),
      join(home, 'Work/acme/portal'),
      join(home, 'Work/beta/portal'),
      join(home, 'Work/solo'),
    ]);
    expect(first.found.map((project) => project.name)).toEqual(['mapped', 'Portal', 'portal', 'solo']);
    expect(first.found.every((project) => project.alreadyAdded === false)).toBe(true);

    const portals = [join(home, 'Work/acme/portal'), join(home, 'Work/beta/portal')];
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

    const again = (await (await postJson(app, '/api/projects/scan', { folder: '~/Work' })).json()) as typeof first;
    expect(again.found.map((project) => [project.displayPath, project.alreadyAdded])).toEqual([
      ['~/Work/acme/mapped', false],
      ['~/Work/acme/portal', true],
      ['~/Work/beta/portal', true],
      ['~/Work/solo', false],
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
