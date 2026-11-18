// BUND-01 and BUND-02: the server builds into one file that holds no vite import, and that file runs
// from a directory that is not the repository, serving the prebuilt dist it is pointed at. The bundle
// is built once into a temp dir and copied alone into an install dir, so nothing in the repository's
// node_modules or source can answer for it.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { get as httpGet } from 'node:http';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';
import {
  buildServerBundle,
  buildWebDist,
  cleanEnv,
  makeTempDir,
  runBundleToExit,
  startBundle,
  stopBundle,
} from '../helpers/server-bundle.ts';
import type { StartedBundle } from '../helpers/server-bundle.ts';

let work = '';
let builtBundle = '';
let installedBundle = '';
let webDist = '';
const started: StartedBundle[] = [];

beforeAll(() => {
  work = makeTempDir('labelore-bundle');
  builtBundle = buildServerBundle(join(work, 'build', 'server'));
  webDist = buildWebDist(join(work, 'build', 'dist'));
  mkdirSync(join(work, 'install', 'server'), { recursive: true });
  installedBundle = join(work, 'install', 'server', 'labelore-server.mjs');
  copyFileSync(builtBundle, installedBundle);
}, 180_000);

afterAll(async () => {
  await Promise.all(started.map((entry) => stopBundle(entry.child)));
  if (work) rmSync(work, { recursive: true, force: true });
});

/** The specifiers of every static import and re-export in the bundle. */
function staticSpecifiers(source: string): string[] {
  const patterns = [
    /^\s*import\s[^'"`;]*?from\s*["']([^"']+)["']/gm,
    /^\s*import\s*["']([^"']+)["']/gm,
    /^\s*export\s[^'"`;]*?from\s*["']([^"']+)["']/gm,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]));
}

/** The specifiers of every dynamic import and require call in the bundle. */
function callSpecifiers(source: string): string[] {
  const patterns = [/\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, /\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]));
}

const isVite = (specifier: string): boolean => /(^|\/)vite(\/|$)/.test(specifier);

describe('the server bundle (BUND-01)', () => {
  it('is one file whose imports are node built-ins only and never reach for vite', () => {
    const source = readFileSync(builtBundle, 'utf8');
    const statics = staticSpecifiers(source);
    expect(statics.length).toBeGreaterThan(0);
    expect(statics.filter((specifier) => !specifier.startsWith('node:'))).toEqual([]);
    // Dependency comments and templates also contain require('...') text, so calls are only checked for
    // vite, in any form: a static import, a dynamic import, a require.
    expect([...statics, ...callSpecifiers(source)].filter(isVite)).toEqual([]);
    expect(readdirSync(join(work, 'build', 'server'))).toEqual(['labelore-server.mjs']);
  });
});

describe('the server bundle from a foreign directory (BUND-02)', () => {
  it('starts from a fresh cwd and serves the dist it is pointed at', async () => {
    const run = await startBundle({
      bundle: installedBundle,
      args: [SHAPES_ROOT, '--port', '0'],
      cwd: makeTempDir('labelore-cwd'),
      env: cleanEnv({ LABELORE_DIST_DIR: webDist }),
    });
    started.push(run);
    try {
      expect(run.output().match(/^Open http:\/\/127\.0\.0\.1:\d+$/gm)).toHaveLength(1);

      const index = readFileSync(join(webDist, 'index.html'));
      const root = await fetch(`${run.base}/`);
      expect(root.status).toBe(200);
      expect(Buffer.from(await root.arrayBuffer()).equals(index)).toBe(true);

      const asset = /(?:src|href)="(\/assets\/[^"]+\.js)"/.exec(index.toString('utf8'));
      expect(asset).not.toBeNull();
      const script = await fetch(`${run.base}${asset?.[1]}`);
      expect(script.status).toBe(200);

      const list = await fetch(`${run.base}/api/projects`);
      expect(list.status).toBe(200);
      const body = (await list.json()) as { projects: unknown[] };
      expect(body.projects).toHaveLength(1);
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);
});

const PACKAGE_VERSION = (
  JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }
).version;
const INSTANCE_ID = '7b0e6a3c-52d1-4f08-9c3a-1d6e8f4a2b90';

interface Identity {
  app: string;
  version: string;
  instanceId: string | null;
  pid: number;
}

/** Starts the installed bundle on the Shapes project from a fresh cwd, with the web dist it was given. */
function startInstalled(env: Record<string, string>, bundle = installedBundle): Promise<StartedBundle> {
  return startBundle({ bundle, args: [SHAPES_ROOT, '--port', '0'], cwd: makeTempDir('labelore-cwd'), env });
}

async function identityOf(run: StartedBundle): Promise<Identity> {
  const response = await fetch(`${run.base}/api/identity`);
  expect(response.status).toBe(200);
  return (await response.json()) as Identity;
}

describe('the server bundle says who it is and never exits silently (BUND-02, LNCH-03)', () => {
  it('reports the version baked at build and the instance id it was started with', async () => {
    // No LABELORE_VERSION in the child env and no package.json beside the bundle: the version is in the file.
    const env = cleanEnv({ LABELORE_DIST_DIR: webDist, LABELORE_INSTANCE_ID: INSTANCE_ID });
    expect(env).not.toHaveProperty('LABELORE_VERSION');
    const run = await startInstalled(env);
    started.push(run);
    try {
      expect(await identityOf(run)).toEqual({
        app: 'labelore',
        version: PACKAGE_VERSION,
        instanceId: INSTANCE_ID,
        pid: run.child.pid,
      });
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);

  it('reports a null instance id when the launcher passed none', async () => {
    const run = await startInstalled(cleanEnv({ LABELORE_DIST_DIR: webDist }));
    started.push(run);
    try {
      expect((await identityOf(run)).instanceId).toBeNull();
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);

  it('refuses a foreign Host on the identity route', async () => {
    const run = await startInstalled(cleanEnv({ LABELORE_DIST_DIR: webDist }));
    started.push(run);
    try {
      // fetch ignores a Host header of its own, so this goes through node:http.
      const status = await new Promise<number | undefined>((resolvePromise, reject) => {
        httpGet(
          { host: '127.0.0.1', port: run.port, path: '/api/identity', headers: { Host: `evil.example:${run.port}` } },
          (response) => {
            response.resume();
            resolvePromise(response.statusCode);
          },
        ).on('error', reject);
      });
      expect(status).toBe(403);
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);

  it('starts through a symlinked directory instead of exiting without a word', async () => {
    const link = join(work, 'link');
    symlinkSync(join(work, 'install', 'server'), link);
    const run = await startInstalled(cleanEnv({ LABELORE_DIST_DIR: webDist }), join(link, 'labelore-server.mjs'));
    started.push(run);
    try {
      expect((await identityOf(run)).app).toBe('labelore');
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);

  it('exits 1 and names an unknown flag', async () => {
    const exit = await runBundleToExit({
      bundle: installedBundle,
      args: [SHAPES_ROOT, '--bogus'],
      cwd: makeTempDir('labelore-cwd'),
      env: cleanEnv({ LABELORE_DIST_DIR: webDist }),
    });
    expect(exit.code).toBe(1);
    expect(exit.stderr).toContain('Unknown option: --bogus');
  }, 60_000);

  it('exits 1 and names the index.html it checked when there is no dist', async () => {
    const cwd = realpathSync(makeTempDir('labelore-cwd'));
    const exit = await runBundleToExit({
      bundle: installedBundle,
      args: [SHAPES_ROOT, '--port', '0'],
      cwd,
      env: cleanEnv(),
    });
    expect(exit.code).toBe(1);
    expect(exit.stderr).toContain(join(cwd, 'dist', 'index.html'));
  }, 60_000);

  it('still lists projects with PATH reduced to the node binary alone', async () => {
    const run = await startInstalled(cleanEnv({ PATH: dirname(process.execPath), LABELORE_DIST_DIR: webDist }));
    started.push(run);
    try {
      const list = await fetch(`${run.base}/api/projects`);
      expect(list.status).toBe(200);
      expect(((await list.json()) as { projects: unknown[] }).projects).toHaveLength(1);
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);
});
