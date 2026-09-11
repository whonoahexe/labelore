// TGT-03/TGT-04/TGT-05 adversarial portability proof (04-04). Drives the real server — createApp
// + LocalFsPlanningFilesystem + PlanningRepository, exactly the idiom test/server/deep-links.test.ts
// and test/degradation.test.ts already use — against all three Phase 1 fixtures plus a
// deliberately stripped copy of `dense`. T-04-04-01: every mutation in this file runs on an
// mkdtemp copy produced by mountFixture(); nothing under `fixtures/` is ever written, deleted, or
// renamed. mountFixture() is the only function that ever reads a path composed from FIXTURES_ROOT
// for a copy source; every other read in this file targets an already-mounted temp copy.
import { afterAll, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
    const presentation = (await (await app.request('/api/presentation')).json()) as {
      artifacts: { path: string; key: string }[];
    };

    async function expectReadable(path: string, route: string): Promise<void> {
      const documentResponse = await app.request(`/api/documents?route=${encodeURIComponent(route)}`);
      expect(documentResponse.status, path).toBe(200);
      const document = (await documentResponse.json()) as { document?: { html?: string } };
      expect(document.document?.html, path).toBeTruthy();
    }

    // An unrecognized markdown document stays a navigable tree leaf.
    const capacityPlan = leaves.find((node) => node.path === '.planning/v3.0-CAPACITY-PLAN.md');
    if (!capacityPlan) throw new Error('expected a file leaf for .planning/v3.0-CAPACITY-PLAN.md');
    expect(capacityPlan.url).not.toBeNull();
    if (capacityPlan.url === null) throw new Error('unreachable — asserted above');
    await expectReadable(capacityPlan.path, capacityPlan.url);

    // Non-markdown machine state is not a tree leaf (quick-260911-vqe follow-up), but the generic
    // handler still reads it through its own artifact route.
    expect(leaves.some((node) => node.path === '.planning/HANDOFF.json')).toBe(false);
    const handoff = presentation.artifacts.find((artifact) => artifact.path === '.planning/HANDOFF.json');
    if (!handoff) throw new Error('expected an artifact for .planning/HANDOFF.json');
    await expectReadable(handoff.path, handoff.key);
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

  it('emits the LOCATION_ORDER group-key set minus the hidden other location, exactly once each, present or absent, across every shape (group-set invariant)', async () => {
    const sparseEmptyRoot = await mountFixture('sparse-empty');
    const sparseStartedRoot = await mountFixture('sparse-started');
    const denseRoot = await mountFixture('dense');
    const strippedRoot = await mountFixture('dense');
    await rm(join(strippedRoot, '.planning', 'quick'), { recursive: true, force: true });

    // The catch-all 'other' location is deliberately not a tree group (quick-260911-vqe follow-up).
    const expectedLocations = Object.keys(LOCATION_ORDER)
      .filter((location) => location !== 'other')
      .sort();

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

// quick-260910-0x4 item 7 (DATA-01's boundary, plan 01-01's original must-have restored):
// src/planning-fs/local-fs.ts is the ONLY file under src/ permitted to import the Node filesystem
// module, in any spelling. This is a durable structural gate, not a one-off shell check — it stays
// enforced after this task, catching a future regression the same way a planted violation is
// caught below.
//
// The pattern anchors on import/require SYNTAX (the module specifier in quotes as the argument of
// an import/require form), not the bare token `fs` — several files legitimately mention the module
// name in prose comments (src/cli/target-path.ts, src/planning-repo/discovery.ts,
// src/server/search-index.ts, and local-fs.ts's own comment, which quotes the import string
// verbatim inside a `//` comment) and must NOT be flagged. Comments are stripped before matching so
// prose can never trip the gate.
const REPO_ROOT = join(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const ALLOWED_FS_IMPORTER = 'src/planning-fs/local-fs.ts';

// Matches the Node filesystem module specifier — bare or `node:`-prefixed, with or without the
// `/promises` subpath — as the argument of a static `import ... from`, a bare `import '<mod>'`
// side-effect import, a `require(...)` call, or a dynamic `import(...)` call. Anchored so
// `'./fs-helper.ts'` or `'fs-extra'` (unrelated names merely containing "fs") never match: the
// quoted content must be exactly `fs`, `node:fs`, `fs/promises`, or `node:fs/promises`.
const FS_IMPORT_PATTERN = /(?:\bimport\s*\(\s*|\brequire\s*\(\s*|\bfrom\s+|\bimport\s+)['"](?:node:)?fs(?:\/promises)?['"]/;

/** Strips `/* ... *\/` block comments and `// ...` line comments so prose mentions of the module
 * name never trip FS_IMPORT_PATTERN. Not a full tokenizer — adequate because no file in this
 * codebase puts `//` or `/*` inside a string/template literal on a line this gate cares about. */
function stripCommentsForFsGate(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

async function listTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string): Promise<void> {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const abs = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        out.push(abs);
      }
    }
  }
  await walk(dir);
  return out;
}

/** Returns the repo-root-relative (posix-separated) paths of every file under `srcDir` — except
 * `allowedRelPath` — whose (comment-stripped) source imports the Node filesystem module under any
 * spelling. */
async function findFsImportViolations(srcDir: string, allowedRelPath: string): Promise<string[]> {
  const files = await listTsFiles(srcDir);
  const violations: string[] = [];
  for (const abs of files) {
    const relPath = relative(REPO_ROOT, abs).split('\\').join('/');
    if (relPath === allowedRelPath) continue;
    const source = await readFile(abs, 'utf8');
    if (FS_IMPORT_PATTERN.test(stripCommentsForFsGate(source))) {
      violations.push(relPath);
    }
  }
  return violations;
}

describe('Node filesystem module import boundary (DATA-01, quick-260910-0x4 item 7)', () => {
  it('is imported nowhere under src/ except local-fs.ts, in any real spelling', async () => {
    const violations = await findFsImportViolations(SRC_DIR, ALLOWED_FS_IMPORTER);
    expect(violations).toEqual([]);
  });

  it('is not fooled by prose mentions of the module name in comments', async () => {
    // These files mention "node:fs" in prose comments and must never appear as violations —
    // confirmed by name rather than merely by the (already-passing) empty-violations assertion
    // above, so a future refactor that turns one of these mentions into a real import is caught by
    // name, not just by count.
    const proseOnlyFiles = ['src/cli/target-path.ts', 'src/planning-repo/discovery.ts', 'src/server/search-index.ts'];
    for (const relPath of proseOnlyFiles) {
      const source = await readFile(join(REPO_ROOT, relPath), 'utf8');
      // Confirm the file genuinely still mentions the module name in prose — otherwise this test
      // would pass vacuously if the comment were ever deleted.
      expect(source).toMatch(/node:fs\b/);
    }
    const violations = await findFsImportViolations(SRC_DIR, ALLOWED_FS_IMPORTER);
    for (const relPath of proseOnlyFiles) {
      expect(violations).not.toContain(relPath);
    }
  });

  it('local-fs.ts itself is exempted despite its own comment quoting the import string verbatim', async () => {
    const source = await readFile(join(REPO_ROOT, ALLOWED_FS_IMPORTER), 'utf8');
    // Confirm the trap this test is named for actually exists in the file: a `//` comment
    // containing the literal quoted import string, which the naive (non-comment-stripping) version
    // of this gate would have matched.
    expect(source).toMatch(/\/\/.*['"]node:fs['"]/);
    const violations = await findFsImportViolations(SRC_DIR, ALLOWED_FS_IMPORTER);
    expect(violations).not.toContain(ALLOWED_FS_IMPORTER);
  });

  // Positive control (plan requirement: "a gate matching only today's literal line is theatre").
  // Plants a real import under every spelling the gate must catch, in a synthetic tmpdir tree (not
  // the real src/ — no working-tree mutation, safe even if this test crashes mid-run), confirms the
  // gate fails on each, then confirms a clean file in the same tree passes.
  it('positive control: catches a planted import under every real spelling (node:-prefixed, bare, /promises, static, require, dynamic)', async () => {
    // Self-contained cleanup (try/finally on its own tmpdir) rather than the shared mountedRoots/
    // afterAll mechanism above: that afterAll is scoped to the earlier describe block and fires
    // before this describe's tests run, so a root pushed here would never actually be removed.
    const plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-fs-gate-plant-'));
    try {
      await plantAndAssertFsGateCatchesEverySpelling(plantedRoot);
    } finally {
      await rm(plantedRoot, { recursive: true, force: true });
    }
  });
});

async function plantAndAssertFsGateCatchesEverySpelling(plantedRoot: string): Promise<void> {
  const nested = join(plantedRoot, 'nested');
  await mkdir(nested, { recursive: true });

  const spellings: Record<string, string> = {
    'static-node-prefixed.ts': `import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n`,
    'static-bare.ts': `import { readFileSync } from 'fs';\nexport const x = readFileSync;\n`,
    'static-promises-node-prefixed.ts': `import { readFile } from 'node:fs/promises';\nexport const x = readFile;\n`,
    'static-promises-bare.ts': `import { readFile } from 'fs/promises';\nexport const x = readFile;\n`,
    'require-node-prefixed.ts': `const fsMod = require('node:fs');\nexport const x = fsMod;\n`,
    'require-bare.ts': `const fsMod = require('fs');\nexport const x = fsMod;\n`,
    'require-promises.ts': `const fspMod = require('fs/promises');\nexport const x = fspMod;\n`,
    'dynamic-node-prefixed.ts': `export const x = async () => import('node:fs');\n`,
    'dynamic-bare.ts': `export const x = async () => import('fs');\n`,
    'dynamic-promises.ts': `export const x = async () => import('fs/promises');\n`,
    'nested/deep-static.ts': `import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n`,
  };
  for (const [name, content] of Object.entries(spellings)) {
    await writeFile(join(plantedRoot, name), content, 'utf8');
  }
  // A clean file in the same tree — must NOT be flagged, proving the gate discriminates rather than
  // failing the whole directory once anything is planted.
  await writeFile(join(plantedRoot, 'clean.ts'), `// mentions node:fs in prose only\nexport const y = 1;\n`, 'utf8');

  // findFsImportViolations returns paths relative to REPO_ROOT (it's built to scan under src/), so
  // pass '__none__' as the allowed-importer exemption (nothing in this synthetic tree should be
  // exempt) and compare against REPO_ROOT-relative paths of the planted files.
  const violations = await findFsImportViolations(plantedRoot, '__none__');
  for (const name of Object.keys(spellings)) {
    const relFromRepoRoot = relative(REPO_ROOT, join(plantedRoot, name));
    expect(violations, `expected ${name} to be caught`).toContain(relFromRepoRoot);
  }
  expect(violations).not.toContain(relative(REPO_ROOT, join(plantedRoot, 'clean.ts')));
}
