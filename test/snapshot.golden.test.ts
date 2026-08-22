import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildSnapshotJson } from '../src/cli/snapshot.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { normalizeForGolden } from '../src/planning-repo/serialize.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, '..', 'fixtures', 'sparse-empty');

describe('snapshot golden — sparse-empty', () => {
  it('matches the committed golden via LocalFsPlanningFilesystem (through the CLI entry point)', async () => {
    const result = await buildSnapshotJson(FIXTURE_ROOT, { stable: true, withBodies: false });
    await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot('__golden__/sparse-empty.json');
  });

  it('produces byte-identical output through InMemoryPlanningFilesystem.fromDirectory', async () => {
    const local = await buildSnapshotJson(FIXTURE_ROOT, { stable: true, withBodies: false });

    const inMemoryFs = await InMemoryPlanningFilesystem.fromDirectory(FIXTURE_ROOT);
    const repo = new PlanningRepository(inMemoryFs, FIXTURE_ROOT);
    const snapshot = await repo.load();
    const inMemoryResult = normalizeForGolden(snapshot, FIXTURE_ROOT, { stable: true, withBodies: false });

    expect(JSON.stringify(inMemoryResult, null, 2)).toBe(JSON.stringify(local, null, 2));
  });
});
