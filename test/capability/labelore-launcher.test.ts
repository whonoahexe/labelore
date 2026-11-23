// The /gsd-labelore launcher (scripts/labelore.mjs), run as a real subprocess. Most cases run against an
// in-test fake Labelore API: the fake plays the server the launcher's own state file points at. The pid
// the fake records and reports always belongs to a victim child the test spawned (never this test
// process), so a signal the launcher sends lands on that victim and nowhere else, and startFake refuses
// process.pid outright. The real-bundle cases run a staged release (built bundle, stub dist, launcher,
// capability.json) end to end.
import { execFile, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingHttpHeaders, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildServerBundle, makeTempDir, stubDist } from '../helpers/server-bundle.ts';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const run = promisify(execFile);
const OWN_VERSION = (JSON.parse(readFileSync(join(REPO_ROOT, 'capability.json'), 'utf8')) as { version: string })
  .version;
const FAKE_ID = 'fake-instance-0001';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const URL_LINE = /^Labelore URL: http:\/\/127\.0\.0\.1:(\d+)\/([^/]+)\/$/m;

interface Outcome {
  code: number;
  stdout: string;
  stderr: string;
  /** True when the run was killed for exceeding LaunchOptions.timeoutMs. */
  killed: boolean;
}

interface LaunchOptions {
  /** Extra child env, applied after the LABELORE_ATTACH_URL scrub. */
  env?: Record<string, string>;
  timeoutMs?: number;
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
  /** What GET /api/identity reports; each defaults to the matching answer for the recorded victim. */
  identityApp?: string;
  identityVersion?: string;
  identityId?: string;
  identityPid?: number;
  /** The version written to the state file (default OWN_VERSION). */
  stateVersion?: string;
}

interface FakeOptions {
  /** Record a v2.1 state, {pid, port} only. */
  legacy?: boolean;
  /** The victim to point the state at (default: a fresh one). */
  victim?: ChildProcess;
}

interface StateFile {
  pid: number;
  port: number;
  instanceId?: string;
  version?: string;
  startedAt?: string;
}

let stateDir: string;
let projectDir: string;
let projectReal: string;
let server: Server | null;
let requests: Recorded[];
let config: FakeConfig;
let victims: ChildProcess[];
let stageUsed: boolean;
let stage: string;
let stageRoot: string;
let stubs: Server[];

function listing(): string {
  return readdirSync(projectDir, { recursive: true }).join('\n');
}

/** True while a process with this pid exists (signal 0 delivers nothing). */
function alive(pid: number | undefined): boolean {
  if (pid === undefined) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** A child that does nothing until it is killed. Every victim is SIGKILLed in afterEach. */
async function spawnVictim(ignoreTerm = false): Promise<ChildProcess> {
  const script = ignoreTerm
    ? "process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)"
    : 'setInterval(()=>{},1000)';
  const child = spawn(process.execPath, ['-e', script], {
    stdio: ['ignore', ignoreTerm ? 'pipe' : 'ignore', 'ignore'],
  });
  victims.push(child);
  await new Promise<void>((done, reject) => {
    child.once('error', reject);
    if (ignoreTerm) child.stdout?.once('data', () => done());
    else child.once('spawn', () => done());
  });
  return child;
}

/** Resolves once the child has exited (immediately when it already has). */
async function exited(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((done) => child.once('exit', () => done()));
}

function writeState(state: StateFile): void {
  writeFileSync(join(stateDir, 'server.json'), JSON.stringify(state));
}

function readStateFile(): StateFile {
  return JSON.parse(readFileSync(join(stateDir, 'server.json'), 'utf8')) as StateFile;
}

async function startFake(options: FakeOptions = {}): Promise<number> {
  const victim = options.victim ?? (await spawnVictim());
  const recorded = victim.pid as number;
  const reported = config.identityPid ?? recorded;
  for (const pid of [recorded, reported]) {
    if (pid === process.pid) throw new Error('startFake refuses to record or report process.pid (this test process)');
  }
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
      if (request.method === 'GET' && request.url === '/api/identity') {
        response.end(
          JSON.stringify({
            app: config.identityApp ?? 'labelore',
            version: config.identityVersion ?? OWN_VERSION,
            instanceId: config.identityId ?? FAKE_ID,
            pid: reported,
          }),
        );
      } else if (request.method === 'GET' && request.url === '/api/projects') {
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
  writeState(
    options.legacy
      ? { pid: recorded, port }
      : { pid: recorded, port, instanceId: FAKE_ID, version: config.stateVersion ?? OWN_VERSION },
  );
  return port;
}

interface StubAnswer {
  status?: number;
  body?: unknown;
  raw?: string;
  headers?: Record<string, string>;
  delayMs?: number;
  /** Never answer. */
  hang?: boolean;
}

interface Stub {
  port: number;
  origin: string;
  requests: Recorded[];
  server: Server;
}

/** A loopback server on an OS-assigned port that records every request and answers as the callback says. */
async function startStub(answer: (request: Recorded) => StubAnswer): Promise<Stub> {
  const requests: Recorded[] = [];
  const stub = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const recorded: Recorded = {
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      };
      requests.push(recorded);
      const reply = answer(recorded);
      if (reply.hang) return;
      const send = (): void => {
        response.statusCode = reply.status ?? 200;
        response.setHeader('content-type', 'application/json');
        for (const [name, value] of Object.entries(reply.headers ?? {})) response.setHeader(name, value);
        response.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
      };
      if (reply.delayMs) setTimeout(send, reply.delayMs);
      else send();
    });
  });
  stubs.push(stub);
  await new Promise<void>((done) => stub.listen(0, '127.0.0.1', done));
  const { port } = stub.address() as AddressInfo;
  return { port, origin: `http://127.0.0.1:${port}`, requests, server: stub };
}

interface AnswerOptions {
  app?: string;
  version?: string;
  instanceId?: string | null;
  pid?: number;
  projects?: { slug: string; target: string }[];
  postStatus?: number;
  postBody?: unknown;
}

/** The standard Labelore answers. The pid, when given, belongs to a victim the test spawned. */
function labeloreAnswers(over: AnswerOptions = {}): (request: Recorded) => StubAnswer {
  return (request) => {
    if (request.method === 'GET' && request.url === '/api/identity') {
      return {
        body: {
          app: over.app ?? 'labelore',
          version: over.version ?? OWN_VERSION,
          instanceId: over.instanceId ?? null,
          pid: over.pid,
        },
      };
    }
    if (request.method === 'GET' && request.url === '/api/projects') {
      return { body: { projects: over.projects ?? [], notices: [] } };
    }
    if (request.method === 'POST' && request.url === '/api/projects') {
      return {
        status: over.postStatus ?? 201,
        body: over.postBody ?? { slug: 'demo', name: 'demo', duplicate: false },
      };
    }
    if (request.method === 'GET' && request.url === '/api/projects/demo/roadmap') {
      return {
        body: {
          active: { phases: [{ number: '3', url: '/v1.0/phase-3' }] },
          history: [{ phases: [{ number: '2.1', url: '/v0.9/phase-2.1' }] }],
        },
      };
    }
    return { status: 404, body: {} };
  };
}

function outcomeOf(error: unknown): Outcome {
  const failure = error as { code?: number; stdout?: string; stderr?: string; killed?: boolean };
  return {
    code: typeof failure.code === 'number' ? failure.code : 1,
    stdout: failure.stdout ?? '',
    stderr: failure.stderr ?? '',
    killed: failure.killed === true,
  };
}

/** Runs the staged release's launcher: its own bundle dir, nothing from the repository. */
async function stagedLauncher(
  args: string[],
  stageDir: string = stage,
  projectEnv: string = projectDir,
  options: LaunchOptions = {},
): Promise<Outcome> {
  stageUsed = true;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LABELORE_STATE_DIR: stateDir,
    LABELORE_CONFIG_DIR: join(stateDir, 'config'),
    CLAUDE_PROJECT_DIR: projectEnv,
  };
  // A maintainer who exports LABELORE_ATTACH_URL would otherwise POST scratch projects into a real server.
  delete env.LABELORE_ATTACH_URL;
  Object.assign(env, options.env);
  try {
    const { stdout, stderr } = await run(process.execPath, [join(stageDir, 'scripts', 'labelore.mjs'), ...args], {
      cwd: stageRoot,
      env,
      timeout: options.timeoutMs,
    });
    return { code: 0, stdout, stderr, killed: false };
  } catch (error) {
    return outcomeOf(error);
  }
}

/** Stops whatever the staged launcher started, with a SIGKILL backstop on the recorded pid. */
async function cleanupLaunched(): Promise<void> {
  if (!stageUsed) return;
  let pid: number | null;
  try {
    pid = readStateFile().pid;
  } catch {
    pid = null;
  }
  await stagedLauncher(['stop']);
  if (pid !== null && pid !== process.pid && alive(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

/** A copy of the stage with its server file replaced by a script of the test's choosing. */
function stageWithServer(script: string): string {
  const copy = join(makeTempDir('labelore-stage-copy'), 'stage');
  cpSync(stage, copy, { recursive: true });
  writeFileSync(join(copy, 'server', 'labelore-server.mjs'), script);
  return copy;
}

async function launcher(
  args: string[],
  projectEnv: string | null = projectDir,
  options: LaunchOptions = {},
): Promise<Outcome> {
  const env: NodeJS.ProcessEnv = { ...process.env, LABELORE_STATE_DIR: stateDir };
  delete env.LABELORE_ATTACH_URL;
  if (projectEnv === null) delete env.CLAUDE_PROJECT_DIR;
  else env.CLAUDE_PROJECT_DIR = projectEnv;
  Object.assign(env, options.env);
  try {
    const { stdout, stderr } = await run(process.execPath, ['scripts/labelore.mjs', ...args], {
      cwd: REPO_ROOT,
      env,
      timeout: options.timeoutMs,
    });
    return { code: 0, stdout, stderr, killed: false };
  } catch (error) {
    return outcomeOf(error);
  }
}

beforeAll(() => {
  stageRoot = makeTempDir('labelore-stage');
  stage = join(stageRoot, 'stage');
  mkdirSync(join(stage, 'dist'), { recursive: true });
  mkdirSync(join(stage, 'scripts'), { recursive: true });
  mkdirSync(join(stage, 'server'), { recursive: true });
  const built = buildServerBundle(join(stageRoot, 'built'));
  cpSync(built, join(stage, 'server', 'labelore-server.mjs'));
  stubDist(join(stage, 'dist'));
  cpSync(join(REPO_ROOT, 'scripts', 'labelore.mjs'), join(stage, 'scripts', 'labelore.mjs'));
  cpSync(join(REPO_ROOT, 'capability.json'), join(stage, 'capability.json'));
}, 180_000);

afterAll(() => {
  rmSync(stageRoot, { recursive: true, force: true });
});

beforeEach(() => {
  victims = [];
  stubs = [];
  stageUsed = false;
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
  await cleanupLaunched();
  for (const victim of victims) victim.kill('SIGKILL');
  for (const listener of [...stubs, ...(server ? [server] : [])]) {
    listener.closeAllConnections();
    await new Promise<void>((done) => listener.close(() => done()));
  }
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

describe('attach (ATT-02)', () => {
  it('open attaches: identity first, then the list, then one guarded POST, and prints the attach link', async () => {
    const stub = await startStub(labeloreAnswers());
    const result = await launcher(['open', '3'], projectDir, { env: { LABELORE_ATTACH_URL: stub.origin } });
    expect(result.code).toBe(0);
    expect(stub.requests.map((entry) => `${entry.method} ${entry.url}`).slice(0, 3)).toEqual([
      'GET /api/identity',
      'GET /api/projects',
      'POST /api/projects',
    ]);
    expect(stub.requests[0]?.body).toBe('');
    expect(stub.requests[0]?.url).toBe('/api/identity');
    const post = stub.requests[2];
    expect(post?.headers['content-type']).toBe('application/json');
    expect(post?.headers.origin).toBe(stub.origin);
    expect(JSON.parse(post?.body ?? '')).toEqual({ target: projectReal });
    expect(stub.requests.filter((entry) => entry.method === 'POST')).toHaveLength(1);
    expect(result.stdout).toBe(`Labelore URL: ${stub.origin}/demo/v1.0/phase-3\n`);
  });

  it('open reuses a project the attach target already lists, with no POST', async () => {
    const stub = await startStub(labeloreAnswers({ projects: [{ slug: 'demo', target: projectReal }] }));
    const result = await launcher(['open'], projectDir, { env: { LABELORE_ATTACH_URL: stub.origin } });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Labelore URL: ${stub.origin}/demo/\n`);
    expect(stub.requests.filter((entry) => entry.method === 'POST')).toHaveLength(0);
  });

  it('open prints the returned slug when the POST answers duplicate', async () => {
    const stub = await startStub(
      labeloreAnswers({ postStatus: 200, postBody: { slug: 'other', name: 'other', duplicate: true } }),
    );
    const result = await launcher(['open'], projectDir, { env: { LABELORE_ATTACH_URL: stub.origin } });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Labelore URL: ${stub.origin}/other/\n`);
  });

  it('open attaches through localhost and sends that origin', async () => {
    const stub = await startStub(labeloreAnswers());
    const origin = `http://localhost:${stub.port}`;
    const result = await launcher(['open'], projectDir, { env: { LABELORE_ATTACH_URL: origin } });
    expect(result.code).toBe(0);
    const post = stub.requests.find((entry) => entry.method === 'POST');
    expect(post?.headers.origin).toBe(origin);
    expect(result.stdout).toBe(`Labelore URL: ${origin}/demo/\n`);
  });

  it('the attach path writes nothing: no state dir is created and no server is spawned', async () => {
    const stub = await startStub(labeloreAnswers());
    const fresh = join(makeTempDir('labelore-fresh'), 'state');
    const result = await launcher(['open'], projectDir, {
      env: { LABELORE_ATTACH_URL: stub.origin, LABELORE_STATE_DIR: fresh },
    });
    expect(result.code).toBe(0);
    expect(existsSync(fresh)).toBe(false);
    expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
  });
});

interface BadConfigRow {
  label: string;
  /** 'env' sets LABELORE_ATTACH_URL; 'file' writes attach.json (or makes it a directory when text is null). */
  via: 'env' | 'file';
  value: (decoyPort: number) => string | null;
  problem: string;
  /** Strings that must not appear in stderr. */
  hidden?: string[];
}

const BAD_CONFIG: BadConfigRow[] = [
  { label: 'not a URL', via: 'env', value: () => 'not-a-url', problem: 'is not a URL' },
  {
    label: 'query',
    via: 'env',
    value: (p) => `http://127.0.0.1:${p}/?x=1`,
    problem: 'has a query or fragment',
  },
  {
    label: 'fragment',
    via: 'env',
    value: (p) => `http://127.0.0.1:${p}/#top`,
    problem: 'has a query or fragment',
  },
  { label: 'https', via: 'env', value: (p) => `https://127.0.0.1:${p}`, problem: 'must use http://' },
  {
    label: 'userinfo',
    via: 'env',
    value: (p) => `http://someone:secret@127.0.0.1:${p}`,
    problem: 'must not hold a username or password',
    hidden: ['someone', 'secret'],
  },
  {
    label: 'non-loopback host',
    via: 'env',
    value: (p) => `http://192.0.2.10:${p}`,
    problem: 'must name 127.0.0.1, localhost or [::1]',
  },
  { label: 'no port', via: 'env', value: () => 'http://127.0.0.1', problem: 'needs an explicit port' },
  { label: 'port 80', via: 'env', value: () => 'http://127.0.0.1:80', problem: 'needs an explicit port' },
  {
    label: 'path',
    via: 'env',
    value: (p) => `http://127.0.0.1:${p}/labelore`,
    problem: 'must not have a path',
  },
  {
    label: 'invalid JSON',
    via: 'file',
    value: () => '{ not json',
    problem: 'is not valid JSON',
    hidden: ['not json'],
  },
  { label: 'array', via: 'file', value: () => '[]', problem: 'has no usable "url"' },
  { label: 'empty object', via: 'file', value: () => '{}', problem: 'has no usable "url"' },
  { label: 'empty url', via: 'file', value: () => '{"url": ""}', problem: 'has no usable "url"' },
  { label: 'unreadable (a directory)', via: 'file', value: () => null, problem: 'cannot be read' },
];

describe('attach config (ATT-01, D-03)', () => {
  it('the env var wins over attach.json', async () => {
    const fromEnv = await startStub(labeloreAnswers());
    const fromFile = await startStub(labeloreAnswers());
    writeFileSync(join(stateDir, 'attach.json'), JSON.stringify({ url: fromFile.origin }));
    const result = await launcher(['open'], projectDir, { env: { LABELORE_ATTACH_URL: fromEnv.origin } });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Labelore URL: ${fromEnv.origin}/demo/\n`);
    expect(fromEnv.requests.length).toBeGreaterThan(0);
    expect(fromFile.requests).toHaveLength(0);
  });

  for (const blank of ['', '   ']) {
    it(`an empty or blank env var falls through to attach.json (${JSON.stringify(blank)})`, async () => {
      const fromFile = await startStub(labeloreAnswers());
      writeFileSync(join(stateDir, 'attach.json'), JSON.stringify({ url: fromFile.origin }));
      const result = await launcher(['open'], projectDir, { env: { LABELORE_ATTACH_URL: blank } });
      expect(result.code).toBe(0);
      expect(result.stdout).toBe(`Labelore URL: ${fromFile.origin}/demo/\n`);
      expect(fromFile.requests.length).toBeGreaterThan(0);
    });
  }

  it('a blank env var with no attach.json uses the own server', async () => {
    const decoy = await startStub(labeloreAnswers());
    const port = await startFake();
    const result = await launcher(['open'], projectDir, { env: { LABELORE_ATTACH_URL: '  ' } });
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/`);
    expect(decoy.requests).toHaveLength(0);
  });

  it('attach.json alone attaches and is never rewritten', async () => {
    const stub = await startStub(labeloreAnswers());
    const file = join(stateDir, 'attach.json');
    writeFileSync(file, JSON.stringify({ url: stub.origin, note: 'x' }));
    const before = { bytes: readFileSync(file, 'utf8'), mtime: statSync(file).mtimeMs };
    const result = await launcher(['open', '3']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`Labelore URL: ${stub.origin}/demo/v1.0/phase-3\n`);
    expect(readFileSync(file, 'utf8')).toBe(before.bytes);
    expect(statSync(file).mtimeMs).toBe(before.mtime);
  });

  for (const row of BAD_CONFIG) {
    it(`open refuses bad attach config: ${row.label}`, async () => {
      const decoy = await startStub(labeloreAnswers());
      const file = join(stateDir, 'attach.json');
      const value = row.value(decoy.port);
      const options: LaunchOptions = {};
      if (row.via === 'env') options.env = { LABELORE_ATTACH_URL: value ?? '' };
      else if (value === null) mkdirSync(file);
      else writeFileSync(file, value);
      const result = await launcher(['open'], projectDir, options);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(row.via === 'env' ? 'LABELORE_ATTACH_URL' : file);
      expect(result.stderr).toContain(row.problem);
      expect(result.stderr).toContain("To use Labelore's own server instead:");
      for (const text of row.hidden ?? []) expect(result.stderr).not.toContain(text);
      expect(decoy.requests).toHaveLength(0);
      expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
    });
  }
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

describe('the fake', () => {
  it('refuses to record or report this test process', async () => {
    config.identityPid = process.pid;
    await expect(startFake()).rejects.toThrow('process.pid');
    expect(server).toBeNull();
  });
});

describe('against the real bundle', { timeout: 60_000 }, () => {
  it('open starts the bundled server, records its identity, and prints one URL line', async () => {
    const result = await stagedLauncher(['open']);
    expect(result.code).toBe(0);
    const lines = result.stdout.trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    const match = URL_LINE.exec(lines[0] ?? '');
    expect(match).not.toBeNull();
    const state = readStateFile();
    expect(state.port).toBe(Number(match?.[1]));
    expect(Number.isInteger(state.pid)).toBe(true);
    expect(state.instanceId).toMatch(UUID);
    expect(state.version).toBe(OWN_VERSION);
    expect(typeof state.startedAt).toBe('string');
    const identity = (await (await fetch(`http://127.0.0.1:${state.port}/api/identity`)).json()) as {
      app: string;
      instanceId: string;
      pid: number;
    };
    expect(identity.app).toBe('labelore');
    expect(identity.instanceId).toBe(state.instanceId);
    expect(identity.pid).toBe(state.pid);
    expect(result.stderr).toContain('started Labelore');
  });

  it('a second open reuses the matching server: same pid, one URL line, no started note', async () => {
    const first = await stagedLauncher(['open']);
    const before = readStateFile();
    const second = await stagedLauncher(['open']);
    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect(second.stdout.trimEnd().split('\n')).toHaveLength(1);
    expect(second.stdout).toMatch(URL_LINE);
    expect(readStateFile().pid).toBe(before.pid);
    expect(second.stderr).not.toContain('started Labelore');
  });

  it('stop stops the server it started and removes the state file', async () => {
    await stagedLauncher(['open']);
    const { pid, port } = readStateFile();
    const result = await stagedLauncher(['stop']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`labelore: stopped Labelore (pid ${pid}, port ${port})`);
    expect(alive(pid)).toBe(false);
    expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
  });

  it('a copy with no server/labelore-server.mjs exits 1, names the file, and builds nothing', async () => {
    const topLevel = readdirSync(REPO_ROOT).sort();
    const result = await launcher(['open']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('server/labelore-server.mjs');
    expect(result.stderr).toContain('not a release');
    expect(readdirSync(REPO_ROOT).sort()).toEqual(topLevel);
    expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
  });
});

type NonMatch = 'legacy' | 'another instanceId' | 'another pid' | 'another app' | 'unreachable port';
const NON_MATCH: NonMatch[] = ['legacy', 'another instanceId', 'another pid', 'another app', 'unreachable port'];

/** Sets up one non-match state around a victim the test spawned; returns that victim and the recorded port. */
async function nonMatchState(kind: NonMatch): Promise<{ victim: ChildProcess; port: number }> {
  const victim = await spawnVictim();
  if (kind === 'legacy') return { victim, port: await startFake({ legacy: true, victim }) };
  if (kind === 'another instanceId') config.identityId = 'some-other-instance';
  if (kind === 'another app') config.identityApp = 'not-labelore';
  if (kind === 'another pid') config.identityPid = (await spawnVictim()).pid as number;
  if (kind === 'unreachable port') {
    const closed = createServer();
    await new Promise<void>((done) => closed.listen(0, '127.0.0.1', done));
    const { port } = closed.address() as AddressInfo;
    await new Promise<void>((done) => closed.close(() => done()));
    writeState({ pid: victim.pid as number, port, instanceId: FAKE_ID, version: OWN_VERSION });
    return { victim, port };
  }
  return { victim, port: await startFake({ victim }) };
}

describe('stop and open after a handshake', { timeout: 60_000 }, () => {
  for (const kind of NON_MATCH) {
    it(`stop with ${kind} does not signal the recorded pid`, async () => {
      const { victim, port } = await nonMatchState(kind);
      const result = await launcher(['stop']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('labelore: not running');
      expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
      expect(alive(victim.pid)).toBe(true);
      if (kind === 'legacy') {
        expect(result.stderr).toContain(String(victim.pid));
        expect(result.stderr).toContain(String(port));
      }
    });
  }

  for (const kind of ['legacy', 'another instanceId'] as const) {
    it(`open with ${kind} starts a fresh server and leaves the recorded pid alone`, async () => {
      const { victim, port } = await nonMatchState(kind);
      const result = await stagedLauncher(['open']);
      expect(result.code).toBe(0);
      expect(result.stdout.trimEnd().split('\n')).toHaveLength(1);
      expect(result.stdout).toMatch(URL_LINE);
      const state = readStateFile();
      expect(state.instanceId).toMatch(UUID);
      expect(state.instanceId).not.toBe(FAKE_ID);
      expect(state.port).not.toBe(port);
      expect(state.pid).not.toBe(victim.pid);
      expect(alive(victim.pid)).toBe(true);
      if (kind === 'legacy') {
        expect(result.stderr).toContain(String(victim.pid));
        expect(result.stderr).toContain(String(port));
      } else {
        expect(result.stderr).not.toContain('older version may still be running');
      }
    });
  }

  it('stop with a matching handshake signals the recorded pid and removes the state', async () => {
    const victim = await spawnVictim();
    const port = await startFake({ victim });
    const result = await launcher(['stop']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`labelore: stopped Labelore (pid ${victim.pid}, port ${port})`);
    await exited(victim);
    expect(alive(victim.pid)).toBe(false);
    expect(existsSync(join(stateDir, 'server.json'))).toBe(false);
  });

  it('open fails loudly when the server exits 0 with no output', async () => {
    const copy = stageWithServer('process.exit(0);\n');
    const result = await stagedLauncher(['open'], copy);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('exit code 0');
    expect(result.stderr).toContain('no output');
    expect(result.stderr).toContain(join(stateDir, 'server.log'));
  });

  it('open fails loudly when the server prints boom and exits 3', async () => {
    const copy = stageWithServer("console.log('boom');\nprocess.exit(3);\n");
    const result = await stagedLauncher(['open'], copy);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('exit code 3');
    expect(result.stderr).toContain('boom');
  });
});

/** chmod -R a-w (or back) over a tree; deepest paths first when locking, the root first when unlocking. */
function setWritable(root: string, writable: boolean): void {
  const entries = readdirSync(root, { recursive: true, withFileTypes: true });
  const paths = entries.map((entry) => join(entry.parentPath, entry.name));
  const ordered = writable ? [root, ...paths] : [...paths.reverse(), root];
  for (const path of ordered) {
    const dir = statSync(path).isDirectory();
    chmodSync(path, writable ? (dir ? 0o755 : 0o644) : dir ? 0o555 : 0o444);
  }
}

describe('restarting a server of another version', { timeout: 60_000 }, () => {
  it('replaces an older server once, then the next open reuses the new one', async () => {
    config.identityVersion = '0.0.1-old';
    const victim = await spawnVictim();
    await startFake({ victim });
    const first = await stagedLauncher(['open']);
    expect(first.code).toBe(0);
    await exited(victim);
    expect(alive(victim.pid)).toBe(false);
    expect(first.stdout.trimEnd().split('\n')).toHaveLength(1);
    expect(first.stdout).toMatch(URL_LINE);
    const restarted = first.stderr.split('\n').filter((line) => line.startsWith('Restarted'));
    expect(restarted).toEqual([`Restarted Labelore server (0.0.1-old → ${OWN_VERSION})`]);
    const state = readStateFile();
    expect(state.pid).not.toBe(victim.pid);
    expect(state.instanceId).toMatch(UUID);
    expect(state.instanceId).not.toBe(FAKE_ID);
    expect(state.version).toBe(OWN_VERSION);

    const second = await stagedLauncher(['open']);
    expect(second.code).toBe(0);
    expect(second.stdout.trimEnd().split('\n')).toHaveLength(1);
    expect(second.stderr).not.toContain('Restarted');
    expect(readStateFile().pid).toBe(state.pid);
  });

  it('treats an older version in the state file as older even when the identity reports the current one', async () => {
    config.stateVersion = '0.0.1-old';
    const victim = await spawnVictim();
    await startFake({ victim });
    const result = await stagedLauncher(['open']);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain(`Restarted Labelore server (${OWN_VERSION} → ${OWN_VERSION})`);
    await exited(victim);
    expect(readStateFile().version).toBe(OWN_VERSION);
  });

  it('link prints the URL for an older server and leaves it running', async () => {
    config.identityVersion = '0.0.1-old';
    const victim = await spawnVictim();
    const port = await startFake({ victim });
    const result = await launcher(['link']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(`Labelore URL: http://127.0.0.1:${port}/demo/`);
    expect(alive(victim.pid)).toBe(true);
  });

  it('starts the new server after the wait when the old one ignores SIGTERM, and says so', async () => {
    config.identityVersion = '0.0.1-old';
    const victim = await spawnVictim(true);
    await startFake({ victim });
    const result = await stagedLauncher(['open']);
    expect(result.code).toBe(0);
    expect(alive(victim.pid)).toBe(true);
    expect(result.stderr).toContain(`the older Labelore server (pid ${victim.pid}) has not exited yet`);
    expect(result.stderr.split('\n').filter((line) => line.startsWith('Restarted'))).toHaveLength(1);
    expect(readStateFile().pid).not.toBe(victim.pid);
    expect(result.stdout).toMatch(URL_LINE);
  });

  it('works from a read-only copy of the stage and changes nothing under it', async () => {
    const copy = join(makeTempDir('labelore-readonly'), 'stage');
    cpSync(stage, copy, { recursive: true });
    const snapshot = (): string[] =>
      readdirSync(copy, { recursive: true })
        .map(String)
        .sort()
        .map((entry) => `${entry} ${statSync(join(copy, entry)).mtimeMs}`);
    const before = snapshot();
    let result: Outcome;
    setWritable(copy, false);
    try {
      result = await stagedLauncher(['open'], copy);
    } finally {
      setWritable(copy, true);
    }
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(URL_LINE);
    expect(snapshot()).toEqual(before);
    expect(existsSync(join(stateDir, 'server.json'))).toBe(true);
  });
});

describe('usage', () => {
  it('exits 2 on an unknown subcommand', async () => {
    const result = await launcher(['frobnicate']);
    expect(result.code).toBe(2);
  });
});
