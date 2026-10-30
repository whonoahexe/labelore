// The plan pair's cache is per project (PLAT-08, research Pitfall 1). A plan's URL is project-relative,
// so two projects holding a plan at the same URL used to share one entry, kept forever by an infinite
// stale time. Here two copies of one fixture sit in folders that are both named lendshed (slugs
// lendshed and lendshed-2), one plan file differs between them, and one QueryClient loads the same
// plan URL under both slugs: each slug must get its own plan, and its own cache entries.
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QueryClient } from '@tanstack/react-query';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { ProjectRegistry } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { fetchPresentation } from '../../src/web/api.ts';
import { loadPair } from '../../src/web/pages/plan-pair-page.tsx';
import { projectKey } from '../../src/web/query-keys.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { TEST_PORT, testPolicy } from '../helpers/guarded-request.ts';
import { installRegistryFetch } from '../helpers/registry-fetch.ts';

const parents: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});
afterAll(async () => {
  await Promise.all(parents.map((parent) => rm(parent, { recursive: true, force: true })));
});

/** Copies the lendshed fixture into `<mkdtemp>/lendshed` and returns that copy's root. */
async function mountLendshed(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), 'labelore-plan-pair-'));
  parents.push(parent);
  const root = join(parent, 'lendshed');
  await cp(FX_ROOT, root, { recursive: true });
  return root;
}

const PLAN_FILE = join('.planning', 'phases', '01-member-sign-in-sessions', '01-01-PLAN.md');

describe('the plan pair cache', () => {
  it('keeps one project\'s plan out of another project\'s entries when both hold the same plan URL', async () => {
    const first = await mountLendshed();
    const second = await mountLendshed();

    // The plan file carries no H1, so the copy in the second project gains one right after its
    // frontmatter: its document and its title then differ from the first project's.
    const planPath = join(second, PLAN_FILE);
    const original = await readFile(planPath, 'utf8');
    const close = original.indexOf('\n---', 3);
    expect(close).toBeGreaterThan(0);
    const end = close + '\n---'.length;
    await writeFile(planPath, `${original.slice(0, end)}\n\n# A different plan in the second project\n${original.slice(end)}`);

    const registry = new ProjectRegistry();
    const a = await registry.register(first);
    const b = await registry.register(second);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect([a.slug, b.slug]).toEqual(['lendshed', 'lendshed-2']);
    restores.push(installRegistryFetch(createRegistryApp(registry, { policy: testPolicy() }), TEST_PORT));

    const presentation = await fetchPresentation('lendshed');
    const planUrl = presentation.milestones
      .flatMap((milestone) => milestone.phases)
      .flatMap((phase) => phase.plans)
      .find((plan) => plan.id === '01-01')?.key;
    expect(planUrl).toBeTruthy();
    if (!planUrl) return;

    const client = new QueryClient();
    const one = await loadPair('lendshed', planUrl, client);
    const two = await loadPair('lendshed-2', planUrl, client);

    expect(one.plan.artifact.title).not.toBe(two.plan.artifact.title);
    expect(two.plan.artifact.title).toBe('A different plan in the second project');
    expect(one.plan.document.html).not.toBe(two.plan.document.html);

    const seededOne = client.getQueryData(projectKey('lendshed', 'document', planUrl));
    const seededTwo = client.getQueryData(projectKey('lendshed-2', 'document', planUrl));
    expect(seededOne).toEqual(one.plan);
    expect(seededTwo).toEqual(two.plan);
    expect(seededOne).not.toEqual(seededTwo);

    // Nothing was written under a slug-less key, which is where the two projects used to collide.
    expect(client.getQueryData(['artifact-document', planUrl])).toBeUndefined();
  });
});
