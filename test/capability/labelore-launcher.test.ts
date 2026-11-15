// The /gsd-labelore launcher (scripts/labelore.mjs), run as a real subprocess against an in-test fake
// Labelore API. The fake plays the server the launcher's own state file points at; no real server is
// started and `stop` is never run against the fake, because its pid is this test process.
import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingHttpHeaders, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const run = promisify(execFile);

interface Outcome {
  code: number;
  stdout: string;
  stderr: string;
}

interface Recorded {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
}

interface FakeConfig {
  projects: { slug: string; target: string }[];
  postStatus: number;
  postBody: unknown;
}

let stateDir: string;
let projectDir: string;
let projectReal: string;
let server: Server | null;
let requests: Recorded[];
let config: FakeConfig;

function listing(): string {
  return readdirSync(projectDir, { recursive: true }).join('\n');
}

async function startFake(): Promise<number> {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push({
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      });
      response.setHeader('content-type', 'application/json');
      if (request.method === 'GET' && request.url === '/api/projects') {
        response.end(JSON.stringify({ projects: config.projects, notices: [] }));
      } else if (request.method === 'POST' && request.url === '/api/projects') {
        response.statusCode = config.postStatus;
        response.end(JSON.stringify(config.postBody));
      } else if (request.method === 'GET' && request.url === '/api/projects/demo/roadmap') {
        response.end(
          JSON.stringify({
            active: { phases: [{ number: '3', url: '/v1.0/phase-3' }] },
            history: [{ phases: [{ number: '2.1', url: '/v0.9/phase-2.1' }] }],
          }),
        );
      } else {
        response.statusCode = 404;
        response.end('{}');
      }
    });
  });
  await new Promise<void>((done) => server?.listen(0, '127.0.0.1', done));
  const { port } = server?.address() as AddressInfo;
  writeFileSync(join(stateDir, 'server.json'), JSON.stringify({ pid: process.pid, port }));
  return port;
}

async function launcher(args: string[], projectEnv: string | null = projectDir): Promise<Outcome> {
  const env: NodeJS.ProcessEnv = { ...process.env, LABELORE_STATE_DIR: stateDir };
  if (projectEnv === null) delete env.CLAUDE_PROJECT_DIR;
  else env.CLAUDE_PROJECT_DIR = projectEnv;
  try {
    const { stdout, stderr } = await run(process.execPath, ['scripts/labelore.mjs', ...args], {
      cwd: REPO_ROOT,
      env,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'labelore-state-'));
  projectDir = mkdtempSync(join(tmpdir(), 'labelore-project-'));
  mkdirSync(join(projectDir, '.planning'));
  writeFileSync(join(projectDir, '.planning', 'PROJECT.md'), '# Scratch\n');
  projectReal = realpathSync(projectDir);
  requests = [];
  server = null;
  config = {
    projects: [{ slug: 'demo', target: projectReal }],
    postStatus: 201,
    postBody: { slug: 'demo', name: 'demo', duplicate: false },
  };
});

afterEach(async () => {
  if (server) await new Promise<void>((done) => server?.close(() => done()));
  rmSync(stateDir, { recursive: true, force: true });
  rmSync(projectDir, { recursive: true, force: true });
});

describe('link', () => {
  it('with no state file prints the not-open hint, exits 0 and creates no server.json', async () => {
    const result = await launcher(['link', '3']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('not open in Labelore');
    expect(result.stdout).toContain('open');
    expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
  });

  it('prints the phase deep link from the roadmap, normalising 03 to 3', async () => {
    const port = await startFake();
    const result = await launcher(['link', '03']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/v1.0/phase-3`);
  });

  it('finds a decimal phase in a historical milestone', async () => {
    const port = await startFake();
    const result = await launcher(['link', '02.1']);
    expect(result.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/v0.9/phase-2.1`);
  });

  it('falls back to the dashboard link with no phase and with a phase that is not in the roadmap', async () => {
    const port = await startFake();
    const without = await launcher(['link']);
    const unknown = await launcher(['link', '99']);
    expect(without.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/`);
    expect(unknown.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/`);
  });

  it('prints the not-open hint when the server lists only another project, and sends no POST', async () => {
    config.projects = [{ slug: 'other', target: join(stateDir, 'elsewhere') }];
    await startFake();
    const result = await launcher(['link', '3']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('not open in Labelore');
    expect(requests.filter((entry) => entry.method === 'POST')).toHaveLength(0);
  });

  it('exits 0 with a no-.planning message when there is no project', async () => {
    const bare = mkdtempSync(join(tmpdir(), 'labelore-bare-'));
    try {
      const result = await launcher(['link', '3'], bare);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('no .planning/');
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('open', () => {
  it('adds the project to its own running server with one guarded POST, then prints the phase link', async () => {
    config.projects = [];
    const port = await startFake();
    const before = listing();
    const result = await launcher(['open', '3']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/v1.0/phase-3`);
    const posts = requests.filter((entry) => entry.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0]?.url).toBe('/api/projects');
    expect(posts[0]?.headers['content-type']).toBe('application/json');
    expect(posts[0]?.headers.origin).toBe(`http://127.0.0.1:${port}`);
    expect(JSON.parse(posts[0]?.body ?? '')).toEqual({ target: projectReal });
    expect(listing()).toBe(before);
  });

  it('reuses a listed project without a POST', async () => {
    const port = await startFake();
    const result = await launcher(['open']);
    expect(result.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/`);
    expect(requests.filter((entry) => entry.method === 'POST')).toHaveLength(0);
  });

  it('exits 1 and names the error when Labelore refuses the project', async () => {
    config.projects = [];
    config.postStatus = 422;
    config.postBody = { error: 'x-refused-reason' };
    await startFake();
    const result = await launcher(['open', '3']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('x-refused-reason');
  });

  it('exits 1 when there is no .planning/ at or above the project directory', async () => {
    const bare = mkdtempSync(join(tmpdir(), 'labelore-bare-'));
    try {
      const result = await launcher(['open'], bare);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('no .planning/');
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('stop', () => {
  it('removes a stale state file and reports not running', async () => {
    writeFileSync(join(stateDir, 'server.json'), JSON.stringify({ pid: process.pid, port: 1 }));
    const result = await launcher(['stop']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('labelore: not running');
    expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
  });

  it('ignores a state file with an invalid pid or port', async () => {
    writeFileSync(join(stateDir, 'server.json'), JSON.stringify({ pid: -1, port: 99999 }));
    const result = await launcher(['stop']);
    expect(result.stdout).toContain('labelore: not running');
    expect(readFileSync(join(projectDir, '.planning', 'PROJECT.md'), 'utf8')).toBe('# Scratch\n');
  });
});

describe('usage', () => {
  it('exits 2 on an unknown subcommand', async () => {
    const result = await launcher(['frobnicate']);
    expect(result.code).toBe(2);
  });
});
