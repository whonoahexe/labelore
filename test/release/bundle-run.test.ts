// BUND-01 and BUND-02: the server builds into one file that holds no vite import, and that file runs
// from a directory that is not the repository, serving the prebuilt dist it is pointed at. The bundle
// is built once into a temp dir and copied alone into an install dir, so nothing in the repository's
// node_modules or source can answer for it.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';
import {
  buildServerBundle,
  buildWebDist,
  cleanEnv,
  makeTempDir,
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

      const list = await fetch(`${run.base}/api/projects`, { headers: { Host: `127.0.0.1:${run.port}` } });
      expect(list.status).toBe(200);
      const body = (await list.json()) as { projects: unknown[] };
      expect(body.projects).toHaveLength(1);
    } finally {
      await stopBundle(run.child);
    }
  }, 60_000);
});
