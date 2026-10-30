// Real-socket proof of what the program serves (PLAT-02, PLAT-06, SEC-05): startServer opens every
// path it is given, remembers them, serves the guarded registry app and teaches the Host policy its
// real port. Analog: the development describe of deep-links.test.ts (startServer on port 0, node
// requests to the socket). Requests go through node:http because fetch cannot choose its Host header.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import type { Server } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCli, startServer } from '../../src/server/index.ts';
import { ProjectRuntime } from '../../src/server/project-runtime.ts';
import { identityOfTarget } from '../../src/server/project-registry.ts';
import { FileSettingsStore, MemorySettingsStore } from '../../src/server/settings-store.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

interface Answer {
  status: number;
  body: string;
  json: () => unknown;
}

function send(
  port: number,
  path: string,
  options: { method?: string; host?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { Host: options.host ?? `127.0.0.1:${port}`, ...options.headers };
    const req = httpRequest(
      { host: '127.0.0.1', port, path, method: options.method ?? 'GET', headers },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ status: response.statusCode ?? 0, body, json: () => JSON.parse(body) as unknown });
        });
      },
    );
    req.on('error', reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function portOf(server: Server): number {
  return (server.address() as AddressInfo).port;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

interface ListedProject {
  slug: string;
}
function slugsOf(answer: Answer): string[] {
  return (answer.json() as { projects: ListedProject[] }).projects.map((project) => project.slug);
}

const open: Server[] = [];
const scratch: string[] = [];

async function start(paths: string[], options: Parameters<typeof startServer>[1] = {}): Promise<Server> {
  const server = await startServer(paths, { port: 0, production: true, settings: new MemorySettingsStore(), ...options });
  open.push(server);
  return server;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const server of open.splice(0)) if (server.listening) await closeServer(server);
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('the served app is the guarded registry app (SEC-05)', () => {
  it('lists every path and serves each project API, and refuses a foreign Host and an unproven POST', async () => {
    const server = await start([FX_ROOT, SHAPES_ROOT]);
    const port = portOf(server);

    const list = await send(port, '/api/projects');
    expect(list.status).toBe(200);
    expect(slugsOf(list)).toEqual(['lendshed', 'shapes']);

    const presentation = await send(port, '/api/projects/shapes/presentation');
    expect(presentation.status).toBe(200);
    expect((presentation.json() as { projectSlug: string }).projectSlug).toBe('shapes');
    const other = await send(port, '/api/projects/lendshed/presentation');
    expect((other.json() as { projectSlug: string }).projectSlug).toBe('lendshed');

    // The old single-project route is gone: the server serves only the registry app.
    expect((await send(port, '/api/presentation')).status).toBe(404);

    const foreign = await send(port, '/api/projects', { host: `evil.example:${port}` });
    expect(foreign.status).toBe(403);
    expect(foreign.json()).toMatchObject({ reason: 'host' });

    const crossOrigin = await send(port, '/api/projects/shapes/refresh', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Origin: 'http://evil.example' },
      body: '{}',
    });
    expect(crossOrigin.status).toBe(403);

    const noProof = await send(port, '/api/projects/shapes/refresh', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: '{}',
    });
    expect(noProof.status).toBe(403);

    const sameOrigin = await send(port, '/api/projects/shapes/refresh', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Origin: `http://127.0.0.1:${port}` },
      body: '{}',
    });
    expect(sameOrigin.status).toBe(200);
  }, 30_000);

  it('serves createRegistryApp and never constructs the createApp wrapper (region-scoped source scan)', () => {
    const source = readFileSync(new URL('../../src/server/index.ts', import.meta.url), 'utf8');
    const lines = source.split('\n');
    const first = lines.findIndex((line) => line.startsWith('export async function startServer'));
    expect(first).toBeGreaterThan(-1);
    let last = lines.length;
    for (let index = first + 1; index < lines.length; index += 1) {
      if (/^(function |export )/.test(lines[index])) {
        last = index;
        break;
      }
    }
    const region = lines.slice(first, last).join('\n');
    expect(region).toContain('createRegistryApp(');
    expect(region).not.toContain('createApp(');
  });

  it('learns its port after listen, also when the default port was taken and the server moved', async () => {
    const blocker = createNetServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', () => resolve()));
    const taken = (blocker.address() as AddressInfo).port;
    try {
      const server = await start([SHAPES_ROOT], { port: taken, autoPort: true });
      const real = portOf(server);
      expect(real).not.toBe(taken);
      expect((await send(real, '/api/projects')).status).toBe(200);
      const wrong = await send(real, '/api/projects', { host: `127.0.0.1:${taken}` });
      expect(wrong.status).toBe(403);
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  }, 30_000);
});

describe('the paths on the command line (PLAT-02)', () => {
  it('opens a single path as a list of one', async () => {
    const server = await start([SHAPES_ROOT]);
    expect(slugsOf(await send(portOf(server), '/api/projects'))).toEqual(['shapes']);
  });

  it('opens no project when started with no paths at all (parseCli supplies the working directory)', async () => {
    const server = await start([]);
    expect(slugsOf(await send(portOf(server), '/api/projects'))).toEqual([]);
  });

  it('lists a path that is not a project as unavailable instead of failing the start', async () => {
    const server = await start([join(tmpdir(), 'labelore-no-such-folder-08-06')]);
    const projects = (await send(portOf(server), '/api/projects')).json() as {
      projects: Array<{ state: string; sessionOnly: boolean }>;
    };
    expect(projects.projects).toHaveLength(1);
    expect(projects.projects[0]).toMatchObject({ state: 'unavailable', sessionOnly: true });
  });

  it('disposes every loaded runtime once when the server closes', async () => {
    const dispose = vi.spyOn(ProjectRuntime.prototype, 'dispose');
    const server = await start([FX_ROOT, SHAPES_ROOT]);
    const port = portOf(server);
    for (const slug of ['lendshed', 'shapes']) {
      expect((await send(port, `/api/projects/${slug}/presentation`)).status).toBe(200);
    }
    expect(dispose).not.toHaveBeenCalled();
    await closeServer(server);
    expect(dispose).toHaveBeenCalledTimes(2);
  }, 30_000);
});

describe('parseCli (D-16)', () => {
  it('keeps every positional path in order', () => {
    expect(parseCli(['a', 'b']).rawPaths).toEqual(['a', 'b']);
  });

  it('opens the working directory when there is no path', () => {
    expect(parseCli([]).rawPaths).toEqual([process.cwd()]);
  });

  it('refuses any other option by name, so there is no --scan', () => {
    expect(() => parseCli(['--scan', '~/Work'])).toThrow('Unknown option: --scan (supported: --port, --smoke)');
    expect(() => parseCli(['-x'])).toThrow('Unknown option: -x');
  });

  it('keeps --port, --port= and --smoke', () => {
    const spaced = parseCli(['--port', '5000', 'x']);
    expect(spaced).toMatchObject({ port: 5000, autoPort: false, rawPaths: ['x'], smoke: false });
    expect(parseCli(['--port=5001', 'x']).port).toBe(5001);
    expect(parseCli(['--smoke', 'x'])).toMatchObject({ smoke: true, port: 0, rawPaths: ['x'] });
    expect(parseCli(['x'])).toMatchObject({ port: 4173, autoPort: true });
  });
});

describe('what a restart remembers (PLAT-06, D-09, D-11)', () => {
  it('lists a remembered project, with the same slug, when the next start has no path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-start-server-'));
    scratch.push(dir);

    const first = await start([SHAPES_ROOT], { settings: new FileSettingsStore(dir, identityOfTarget) });
    expect(slugsOf(await send(portOf(first), '/api/projects'))).toEqual(['shapes']);
    await closeServer(first);

    const second = await start([], { settings: new FileSettingsStore(dir, identityOfTarget) });
    expect(slugsOf(await send(portOf(second), '/api/projects'))).toEqual(['shapes']);
  }, 30_000);

  it('lists a remembered project and a new path of this start together, each once, and keeps both on the next start', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-start-server-order-'));
    scratch.push(dir);

    const first = await start([SHAPES_ROOT], { settings: new FileSettingsStore(dir, identityOfTarget) });
    await closeServer(first);

    const second = await start([FX_ROOT], { settings: new FileSettingsStore(dir, identityOfTarget) });
    // Order is the registry's (last opened first, then added order); this asserts membership, not position.
    expect(slugsOf(await send(portOf(second), '/api/projects')).sort()).toEqual(['lendshed', 'shapes']);
    await closeServer(second);

    const third = await start([FX_ROOT], { settings: new FileSettingsStore(dir, identityOfTarget) });
    expect(slugsOf(await send(portOf(third), '/api/projects')).sort()).toEqual(['lendshed', 'shapes']);
  }, 30_000);

  it('reads LABELORE_CONFIG_DIR when no settings option is given', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-start-server-env-'));
    scratch.push(dir);
    const before = process.env.LABELORE_CONFIG_DIR;
    process.env.LABELORE_CONFIG_DIR = dir;
    try {
      const first = await startServer([SHAPES_ROOT], { port: 0, production: true });
      open.push(first);
      await closeServer(first);
      const second = await startServer([], { port: 0, production: true });
      open.push(second);
      expect(slugsOf(await send(portOf(second), '/api/projects'))).toEqual(['shapes']);
    } finally {
      if (before === undefined) delete process.env.LABELORE_CONFIG_DIR;
      else process.env.LABELORE_CONFIG_DIR = before;
    }
  }, 30_000);

  it('writes nothing under the settings folder when a MemorySettingsStore is given', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-start-server-mem-'));
    scratch.push(dir);
    const before = process.env.LABELORE_CONFIG_DIR;
    process.env.LABELORE_CONFIG_DIR = dir;
    try {
      const server = await start([SHAPES_ROOT]);
      expect(slugsOf(await send(portOf(server), '/api/projects'))).toEqual(['shapes']);
      await closeServer(server);
    } finally {
      if (before === undefined) delete process.env.LABELORE_CONFIG_DIR;
      else process.env.LABELORE_CONFIG_DIR = before;
    }
    const written = new FileSettingsStore(dir, identityOfTarget).read();
    expect(written.state.projects).toEqual([]);
  });
});
