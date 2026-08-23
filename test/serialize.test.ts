// WR-03 regression: normalizeForGolden's absolute-path rewrite must be scoped to known path-bearing
// keys (rootPath, pathChecked, path, id, dirPath, artifactPath), never applied to every string in
// the tree by value-shape alone. Previously the JSON.stringify replacer ignored `key` entirely and
// rewrote ANY string starting with rootPath — including verbatim Artifact.body text, which this
// project's own design explicitly promises to keep byte-for-byte (markdown-sections.ts:3).
import { describe, it, expect } from 'vitest';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { normalizeForGolden } from '../src/planning-repo/serialize.ts';

const ROOT = '/project';

describe('normalizeForGolden — path-key scoping (WR-03)', () => {
  it('rewrites Project.rootPath (an actual path-bearing field) to a relative placeholder', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': `# Demo\n\n## What This Is\nbody\n`,
    });
    const repo = new PlanningRepository(fs, ROOT);
    const snapshot = await repo.load();
    const result = normalizeForGolden(snapshot, ROOT, { stable: true, withBodies: false }) as { rootPath: string };
    expect(result.rootPath).toBe('.');
  });

  it('leaves an Artifact.body verbatim even when it quotes the project root path in prose', async () => {
    const bodyWithPath = `# Demo\n\n## What This Is\nSee ${ROOT}/README.md for details.\n`;
    const fs = new InMemoryPlanningFilesystem({
      '.planning/PROJECT.md': bodyWithPath,
    });
    const repo = new PlanningRepository(fs, ROOT);
    const snapshot = await repo.load();
    const result = normalizeForGolden(snapshot, ROOT, { stable: true, withBodies: true }) as {
      project: { artifacts: Record<string, { body: string }> };
    };
    const artifact = result.project.artifacts['.planning/PROJECT.md'];
    expect(artifact.body).toContain(`${ROOT}/README.md`);
    expect(artifact.body).toBe(bodyWithPath);
  });
});
