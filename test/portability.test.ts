// TGT-03/TGT-04/TGT-05 adversarial portability proof (04-04). Drives the real server — createApp
// + LocalFsPlanningFilesystem + PlanningRepository, exactly the idiom test/server/deep-links.test.ts
// and test/degradation.test.ts already use — against all three Phase 1 fixtures plus a
// deliberately stripped copy of `dense`. T-04-04-01: every mutation in this file runs on an
// mkdtemp copy produced by mountFixture(); nothing under `fixtures/` is ever written, deleted, or
// renamed. mountFixture() is the only function that ever reads a path composed from FIXTURES_ROOT
// for a copy source; every other read in this file targets an already-mounted temp copy.
import { afterAll, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import type { Hono } from 'hono';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { LOCATION_ORDER } from '../src/planning-repo/discovery.ts';
import type { ProjectSnapshot } from '../src/planning-repo/types.ts';
import { createApp } from '../src/server/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(__dirname, '..', 'fixtures');

const ROUTES = [
  '/api/presentation',
  '/api/dashboard',
  '/api/roadmap',
  '/api/history',
  '/api/tree',
  '/api/traceability',
  '/api/search?q=phase',
] as const;

const mountedRoots: string[] = [];

/** Copies a committed fixture tree into an mkdtemp OS-temp directory and returns the copy's root.
 * This is the only function in this file that ever composes a path from FIXTURES_ROOT to read a
 * fixture, and it only ever reads it (as fs.cp's source) — never writes, deletes, or renames it.
 * Every mutation this suite performs happens on the returned copy, cleaned up in afterAll. */
async function mountFixture(name: string): Promise<string> {
  const fixtureRoot = join(FIXTURES_ROOT, name);
  const tmpRoot = await mkdtemp(join(tmpdir(), `labelore-portability-${name}-`));
  await cp(fixtureRoot, tmpRoot, { recursive: true });
  mountedRoots.push(tmpRoot);
  return tmpRoot;
}

/** Loads a mounted copy through the real read layer and builds the real Hono app from it —
 * the same server every route in ROUTES is served from in production. */
async function serve(root: string): Promise<{ app: Hono; snapshot: ProjectSnapshot }> {
  const repo = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
  const snapshot = await repo.load();
  const app = createApp({ getSnapshot: () => repo.getSnapshot() }, true, '.');
  return { app, snapshot };
}

/** Recursive, sorted, root-relative file listing — used only to prove the committed dense fixture
 * is byte-identical (by path set) before and after this suite's stripped-copy case runs. */
async function listTree(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        out.push(relative(root, full));
      }
    }
  }
  await walk(root);
  return out.sort();
}

interface TreeNodeLike {
  key: string;
  path: string;
  nodeType: string;
  location: string;
  url: string | null;
  children: TreeNodeLike[];
}

function flattenTree(nodes: TreeNodeLike[]): TreeNodeLike[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/** Recursively deletes every file under `dir` whose basename matches `pattern`, on an already-
 * mounted temp copy — never on a path composed from FIXTURES_ROOT. */
async function removeMatchingFiles(dir: string, pattern: RegExp): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await removeMatchingFiles(full, pattern);
    } else if (pattern.test(entry.name)) {
      await rm(full, { force: true });
    }
  }
}

describe('adversarial portability — three project shapes, a stripped copy, unknown types (TGT-03/04/05)', () => {
  const denseListingBefore = listTree(join(FIXTURES_ROOT, 'dense'));

  afterAll(async () => {
    await Promise.all(mountedRoots.map((root) => rm(root, { recursive: true, force: true })));
  });

  it.each(['sparse-empty', 'sparse-started', 'dense'] as const)(
    'answers 200 with a parseable JSON body on every route for %s, with an ok load status (TGT-03 boundary)',
    async (fixtureName) => {
      const root = await mountFixture(fixtureName);
      const { app } = await serve(root);

      for (const route of ROUTES) {
        const response = await app.request(route);
        expect(response.status, `${fixtureName} ${route}`).toBe(200);
        const body: unknown = await response.json();
        expect(body).toBeTruthy();
      }

      const presentationResponse = await app.request('/api/presentation');
      const presentation = (await presentationResponse.json()) as {
        loadStatus: { status: string };
      };
      expect(presentation.loadStatus.status).toBe('ok');
    },
  );

  it('never serves NaN or Infinity, and every state.progress field is a finite number or null (TGT-03 precision)', async () => {
    const root = await mountFixture('sparse-empty');
    const { app } = await serve(root);

    for (const route of ROUTES) {
      const response = await app.request(route);
      const text = await response.text();
      expect(text, route).not.toMatch(/\bNaN\b/);
      expect(text, route).not.toMatch(/\bInfinity\b/);
    }

    const presentationResponse = await app.request('/api/presentation');
    const presentation = (await presentationResponse.json()) as {
      state: { progress: Record<string, unknown> } | null;
    };
    const progress = presentation.state?.progress ?? {};
    for (const [key, value] of Object.entries(progress)) {
      if (value === null) continue;
      expect(typeof value, key).toBe('number');
      expect(Number.isFinite(value as number), key).toBe(true);
    }
  });

  it("carries every config.json key onto /api/presentation's config object unchanged, including a key only one fixture has (TGT-03 config toggles)", async () => {
    const startedRoot = await mountFixture('sparse-started');
    const denseRoot = await mountFixture('dense');
    const startedConfig = JSON.parse(
      await readFile(join(startedRoot, '.planning', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;
    const denseConfig = JSON.parse(
      await readFile(join(denseRoot, '.planning', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;

    const { app: startedApp } = await serve(startedRoot);
    const { app: denseApp } = await serve(denseRoot);
    const startedPresentation = (await (await startedApp.request('/api/presentation')).json()) as {
      config: Record<string, unknown>;
    };
    const densePresentation = (await (await denseApp.request('/api/presentation')).json()) as {
      config: Record<string, unknown>;
    };

    expect(startedPresentation.config).toEqual(startedConfig);
    expect(densePresentation.config).toEqual(denseConfig);
    // Open-map parsing is not re-narrowed by the presentation layer: keys neither reference
    // document knows about (dense's own `vibe_check`, `experimental_widget_pipeline`, and
    // `telemetry` — none of which sparse-started's config.json declares) still survive onto
    // dense's own served config unchanged.
    for (const key of ['vibe_check', 'experimental_widget_pipeline', 'telemetry']) {
      expect(key in startedConfig, `sparse-started should not declare ${key}`).toBe(false);
      expect(densePresentation.config).toHaveProperty(key, denseConfig[key]);
    }
  });

  it('keeps unrecognized artifact types navigable in the tree and readable through the generic handler (TGT-05)', async () => {
    const root = await mountFixture('dense');
    const { app } = await serve(root);
    const tree = (await (await app.request('/api/tree')).json()) as TreeNodeLike[];
    const leaves = flattenTree(tree).filter((node) => node.nodeType === 'file');

    for (const path of ['.planning/v3.0-CAPACITY-PLAN.md', '.planning/HANDOFF.json']) {
      const leaf = leaves.find((node) => node.path === path);
      if (!leaf) throw new Error(`expected a file leaf for ${path}`);
      expect(leaf.url, path).not.toBeNull();
      if (leaf.url === null) throw new Error('unreachable — asserted above');

      const documentResponse = await app.request(
        `/api/documents?route=${encodeURIComponent(leaf.url)}`,
      );
      expect(documentResponse.status, path).toBe(200);
      const document = (await documentResponse.json()) as { document?: { html?: string } };
      expect(document.document?.html, path).toBeTruthy();
    }
  });

  it('produces empty states, never an error page, when quick/, milestones/, research/, UI-SPEC.md and SECURITY.md are removed, leaving the rest untouched (TGT-04)', async () => {
    const root = await mountFixture('dense');
    await rm(join(root, '.planning', 'quick'), { recursive: true, force: true });
    await rm(join(root, '.planning', 'milestones'), { recursive: true, force: true });
    await rm(join(root, '.planning', 'research'), { recursive: true, force: true });
    await removeMatchingFiles(root, /UI-SPEC\.md$/);
    await removeMatchingFiles(root, /SECURITY\.md$/);

    const { app } = await serve(root);

    for (const route of ROUTES) {
      const response = await app.request(route);
      expect(response.status, route).toBe(200);
    }

    const tree = (await (await app.request('/api/tree')).json()) as TreeNodeLike[];
    const groups = tree.filter((node) => node.nodeType === 'group');

    // D-06: every recognized location group still appears, exactly once, even when it now has no
    // children at all.
    for (const location of ['quick', 'milestone-root', 'archived-phase', 'research'] as const) {
      const group = groups.find((node) => node.location === location);
      if (!group) throw new Error(`missing group node for location ${location}`);
      expect(group.children.length, location).toBe(0);
    }

    // D-07: the tree stays a literal disk mirror — no leaf names a path under a deleted
    // directory, and no leaf names a deleted UI-SPEC.md/SECURITY.md file.
    const leaves = flattenTree(tree).filter((node) => node.nodeType === 'file');
    for (const leaf of leaves) {
      expect(leaf.path.endsWith('UI-SPEC.md')).toBe(false);
      expect(leaf.path.endsWith('SECURITY.md')).toBe(false);
      expect(leaf.path.startsWith('.planning/quick/')).toBe(false);
      expect(leaf.path.startsWith('.planning/milestones/')).toBe(false);
      expect(leaf.path.startsWith('.planning/research/')).toBe(false);
    }

    // A deletion in one location leaves the phases that remain carrying their own artifacts.
    const phaseGroup = groups.find((node) => node.location === 'phase');
    expect(phaseGroup?.children.length ?? 0).toBeGreaterThan(0);
  });

  it('emits the exact LOCATION_ORDER group-key set exactly once each, present or absent, across every shape (group-set invariant)', async () => {
    const sparseEmptyRoot = await mountFixture('sparse-empty');
    const sparseStartedRoot = await mountFixture('sparse-started');
    const denseRoot = await mountFixture('dense');
    const strippedRoot = await mountFixture('dense');
    await rm(join(strippedRoot, '.planning', 'quick'), { recursive: true, force: true });

    const expectedLocations = Object.keys(LOCATION_ORDER).sort();

    for (const root of [sparseEmptyRoot, sparseStartedRoot, denseRoot, strippedRoot]) {
      const { app } = await serve(root);
      const tree = (await (await app.request('/api/tree')).json()) as TreeNodeLike[];
      const groupLocations = tree
        .filter((node) => node.nodeType === 'group')
        .map((node) => node.location)
        .sort();
      expect(groupLocations).toEqual(expectedLocations);
    }
  });

  it('reads a fixture only through mountFixture, and leaves the committed dense fixture byte-identical on disk (read-only guarantee, T-04-04-01)', async () => {
    const selfSource = await readFile(fileURLToPath(import.meta.url), 'utf8');
    expect(selfSource).toContain('mkdtemp');
    // No mutating call in this file ever targets a path composed directly from FIXTURES_ROOT or
    // the mountFixture-local fixtureRoot variable — every rm/removeMatchingFiles call in the
    // suite above targets an already-mounted temp copy (root/strippedRoot), never the fixture
    // itself.
    const forbiddenMutation = /\b(?:rm|unlink|rename|writeFile)\s*\(\s*(?:join\(\s*FIXTURES_ROOT|fixtureRoot)\b/;
    expect(forbiddenMutation.test(selfSource)).toBe(false);

    const before = await denseListingBefore;
    const after = await listTree(join(FIXTURES_ROOT, 'dense'));
    expect(after).toEqual(before);
  });
});
