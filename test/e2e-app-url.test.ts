// NAV-09: the browser specs' URL helper agrees with a real listening server about the project slug.
// A live Hono app over the Lendshed fixture serves /api/presentation and the SPA shell; the helper's
// output must open that shell with HTTP 200.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAdaptorServer } from '@hono/node-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { createApp } from '../src/server/index.ts';
import { artifactUrl, projectSlugAt, projectUrl } from './e2e/app-url.ts';
import { FIXTURE_ROOT } from './e2e/fixture-root.ts';

const SHELL = '<!doctype html><html><body><div id="root">Labelore shell</div></body></html>';

describe('e2e app-url helper against a live server', () => {
  let staticRoot = '';
  let server: Server;
  let base = '';

  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'labelore-app-url-'));
    await writeFile(join(staticRoot, 'index.html'), SHELL);
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(FIXTURE_ROOT), FIXTURE_ROOT);
    await repository.load();
    const app = createApp(repository, true, staticRoot);
    server = createAdaptorServer({ fetch: app.fetch, hostname: '127.0.0.1' }) as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(staticRoot, { recursive: true, force: true });
  });

  it('reads the slug the server reports', async () => {
    expect(await projectSlugAt(base)).toBe('lendshed');
  });

  it('composes a project page address the server answers with the SPA shell', async () => {
    const url = await projectUrl(base, '/roadmap');
    expect(url).toBe(`${base}/lendshed/roadmap`);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(SHELL);
  });

  it('composes an artifact address from its DTO key, under the slug, that the server answers', async () => {
    const url = await artifactUrl(base, '.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md');
    expect(url.startsWith(`${base}/lendshed/`)).toBe(true);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(SHELL);
  });

  it('rejects an artifact path the project does not hold', async () => {
    await expect(artifactUrl(base, '.planning/nope/NOPE.md')).rejects.toThrow(/No artifact \.planning\/nope\/NOPE\.md at /);
  });
});
