// BUND-01: rendered output is byte-identical. One pin, test/__golden__/render-corpus.json, holds a hash of
// every document of every committed fixture project; the in-process source server and the built bundle
// must both match it key for key. The pin was generated from the renderer before the highlighter moved to
// shiki/core and is never regenerated: a differing key is a regression to fix, not a golden to accept.
import { readFileSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer } from '../../src/server/index.ts';
import { MemorySettingsStore } from '../../src/server/settings-store.ts';
import { ALL_FIXTURE_ROOTS } from '../helpers/fixture-roots.ts';
import { collectRenderCorpus, countArtifacts, serializeCorpus } from '../helpers/render-corpus.ts';
import {
  REPO_ROOT,
  buildServerBundle,
  cleanEnv,
  makeTempDir,
  startBundle,
  stopBundle,
  stubDist,
} from '../helpers/server-bundle.ts';
import type { StartedBundle } from '../helpers/server-bundle.ts';

const MANIFEST = join(REPO_ROOT, 'test', '__golden__', 'render-corpus.json');
const TIMEOUT_MS = 300_000;

function keyPrefix(root: string): string {
  return `${root.slice(REPO_ROOT.length + 1)}::`;
}

function expectEveryRootPinned(corpus: Record<string, string>): void {
  const keys = Object.keys(corpus);
  for (const root of ALL_FIXTURE_ROOTS) {
    expect(
      keys.some((key) => key.startsWith(keyPrefix(root))),
      `no key for ${root}`,
    ).toBe(true);
  }
}

describe('render identity: the source server', () => {
  let server: Server | undefined;

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  it(
    'serves every fixture document exactly as the pinned manifest says',
    async () => {
      server = await startServer(ALL_FIXTURE_ROOTS, { port: 0, production: true, settings: new MemorySettingsStore() });
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const corpus = await collectRenderCorpus({ base, roots: ALL_FIXTURE_ROOTS });
      expectEveryRootPinned(corpus);
      expect(Object.keys(corpus).length).toBe(await countArtifacts(base, ALL_FIXTURE_ROOTS));
      await expect(serializeCorpus(corpus)).toMatchFileSnapshot('../__golden__/render-corpus.json');
    },
    TIMEOUT_MS,
  );
});

describe('render identity: the built bundle', () => {
  let work = '';
  let started: StartedBundle | undefined;

  beforeAll(async () => {
    work = makeTempDir('labelore-render');
    const bundle = buildServerBundle(join(work, 'server'));
    const dist = stubDist(makeTempDir('labelore-render-dist'));
    started = await startBundle({
      bundle,
      args: [...ALL_FIXTURE_ROOTS, '--port', '0'],
      cwd: makeTempDir('labelore-render-cwd'),
      env: cleanEnv({ LABELORE_DIST_DIR: dist }),
    });
  }, TIMEOUT_MS);

  afterAll(async () => {
    if (started) await stopBundle(started.child);
    if (work) rmSync(work, { recursive: true, force: true });
  });

  it(
    'serves every fixture document, 8 requests at a time, exactly as the pinned manifest says',
    async () => {
      if (!started) throw new Error('the bundle did not start');
      const corpus = await collectRenderCorpus({ base: started.base, roots: ALL_FIXTURE_ROOTS, concurrency: 8 });
      expectEveryRootPinned(corpus);
      expect(Object.keys(corpus).length).toBe(await countArtifacts(started.base, ALL_FIXTURE_ROOTS));
      expect(corpus).toEqual(JSON.parse(readFileSync(MANIFEST, 'utf8')));
    },
    TIMEOUT_MS,
  );
});
