// Two proof obligations against the real dense fixture (D-02, D-11) plus the refresh-seam
// invariants (DATA-04): per-file isolation — three deliberate defects among healthy files degrade
// individually, without taking the rest of the tree down with them — and refresh() rebuilds the
// whole snapshot every call without mutating a previously returned one.
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { normalizeForGolden } from '../src/planning-repo/serialize.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DENSE_ROOT = join(__dirname, '..', 'fixtures', 'dense');

// The three deliberate corruptions named in fixtures/README.md's "Deliberate Defect Register" (D-02).
const TAB_BROKEN_PLAN = '.planning/phases/02-transport-layer/02-01-PLAN.md';
const MALFORMED_JSON = '.planning/HANDOFF.json';
const FRONTMATTER_ONLY_NO_BODY = '.planning/phases/01-identity-slice/01-VERIFICATION.md';
const CORRUPTED_PATHS = new Set([TAB_BROKEN_PLAN, MALFORMED_JSON]);

/** Looks an artifact up by path across both root-level and every phase's artifacts map, on an already-normalized (JSON-shaped) snapshot. */
function findArtifactInSerialized(serialized: unknown, path: string): { body?: unknown } | undefined {
  const root = serialized as { project?: { artifacts?: Record<string, unknown>; phases?: Array<{ artifacts?: Record<string, unknown> }> } };
  const rootArtifacts = root.project?.artifacts ?? {};
  if (rootArtifacts[path]) return rootArtifacts[path] as { body?: unknown };
  for (const phase of root.project?.phases ?? []) {
    const found = phase.artifacts?.[path];
    if (found) return found as { body?: unknown };
  }
  return undefined;
}

describe('degradation — dense fixture per-file isolation (D-02, D-11)', () => {
  it('returns an ok load status with a non-null project despite three deliberate defects', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(snapshot.project).not.toBeNull();
  });

  it('records a frontmatter-stage warning for the tab-broken plan file, whose body is still non-empty under bodies-included serialization', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();

    const warning = snapshot.warnings.find((w) => w.path === TAB_BROKEN_PLAN);
    expect(warning?.stage).toBe('frontmatter');
    expect(warning?.salvage).toContain('body intact');

    const withBodies = normalizeForGolden(snapshot, DENSE_ROOT, { stable: true, withBodies: true });
    const artifact = findArtifactInSerialized(withBodies, TAB_BROKEN_PLAN);
    expect(artifact).toBeDefined();
    expect(typeof artifact?.body).toBe('string');
    expect((artifact?.body as string).length).toBeGreaterThan(0);
  });

  it('records a structured-extraction warning for the malformed JSON file', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();
    const warning = snapshot.warnings.find((w) => w.path === MALFORMED_JSON);
    expect(warning?.stage).toBe('structured-extraction');
  });

  it('produces no warning at any stage for the frontmatter-only file with an empty body — an empty body is a legitimate document state, not a failure', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();
    const warning = snapshot.warnings.find((w) => w.path === FRONTMATTER_ONLY_NO_BODY);
    expect(warning).toBeUndefined();
  });

  it('names only the two corrupted files across every warning in the tree', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();
    expect(snapshot.warnings.length).toBeGreaterThan(0);
    for (const w of snapshot.warnings) {
      expect(CORRUPTED_PATHS.has(w.path)).toBe(true);
    }
  });

  it('gives every warning object non-empty path, stage, message, and salvage values', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();
    for (const w of snapshot.warnings) {
      expect(w.path.length).toBeGreaterThan(0);
      expect(w.stage.length).toBeGreaterThan(0);
      expect(w.message.length).toBeGreaterThan(0);
      expect(w.salvage.length).toBeGreaterThan(0);
    }
  });

  it('parses frontmatter for every other plan file in the tree', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const snapshot = await repo.load();
    const allPlans = (snapshot.project?.phases ?? []).flatMap((p) => p.plans);
    expect(allPlans.length).toBeGreaterThan(0);
    for (const plan of allPlans) {
      if (plan.path === TAB_BROKEN_PLAN) continue; // the one deliberately-corrupted plan file
      expect(Object.keys(plan.frontmatter).length).toBeGreaterThan(0);
    }
  });
});

describe('refresh seam — no mutation, byte-stable, safe under concurrency (DATA-04)', () => {
  it('returns a new object identity on refresh, and a previously captured snapshot serializes unchanged afterward', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const first = await repo.load();
    const firstSerializedBefore = JSON.stringify(normalizeForGolden(first, DENSE_ROOT, { stable: true, withBodies: false }));

    const second = await repo.refresh();
    expect(second).not.toBe(first);

    const firstSerializedAfter = JSON.stringify(normalizeForGolden(first, DENSE_ROOT, { stable: true, withBodies: false }));
    expect(firstSerializedAfter).toBe(firstSerializedBefore);
  });

  it('produces byte-identical stable output across two sequential refreshes of an unchanged tree', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const first = await repo.refresh();
    const second = await repo.refresh();
    const a = JSON.stringify(normalizeForGolden(first, DENSE_ROOT, { stable: true, withBodies: false }));
    const b = JSON.stringify(normalizeForGolden(second, DENSE_ROOT, { stable: true, withBodies: false }));
    expect(b).toBe(a);
  });

  it('resolves two concurrently started refresh() calls to complete, equal, ok snapshots — neither observes the other\'s partial state', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    const [a, b] = await Promise.all([repo.refresh(), repo.refresh()]);
    expect(a.loadStatus.status).toBe('ok');
    expect(b.loadStatus.status).toBe('ok');
    const aSerialized = JSON.stringify(normalizeForGolden(a, DENSE_ROOT, { stable: true, withBodies: false }));
    const bSerialized = JSON.stringify(normalizeForGolden(b, DENSE_ROOT, { stable: true, withBodies: false }));
    expect(bSerialized).toBe(aSerialized);
  });

  it('getSnapshot() throws only when called before any load — a programmer error, not a data condition', async () => {
    const repo = new PlanningRepository(new LocalFsPlanningFilesystem(DENSE_ROOT), DENSE_ROOT);
    expect(() => repo.getSnapshot()).toThrow();
    await repo.load();
    expect(() => repo.getSnapshot()).not.toThrow();
  });
});
