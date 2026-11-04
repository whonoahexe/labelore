// Phase 10 (10-05, VIEW-13, RESEARCH Pitfall 11): a shape-only guard over this repository's own fresh
// codebase map (.planning/codebase, seven documents written by /gsd-map-codebase). Labelore's own map is the
// only real map a test may read; it changes every time the map is refreshed, so no stamp, count or heading
// is pinned here. Only the shape the lift promises is asserted.
import { describe, expect, it } from 'vitest';
import type { CodebaseBody } from '../src/planning-repo/handlers/codebase-lift.ts';
import { CODEBASE_MAP_FILES } from '../src/planning-repo/codebase-files.ts';
import { loadProject } from './helpers/fixture-project.ts';

const LB_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DOCS = CODEBASE_MAP_FILES.map((file) => file.slice(0, -'.md'.length).toLowerCase());

async function mapDocuments(): Promise<Map<string, CodebaseBody>> {
  const { snapshot } = await loadProject(LB_ROOT);
  const found = new Map<string, CodebaseBody>();
  for (const [path, artifact] of Object.entries(snapshot.project?.artifacts ?? {})) {
    if (!path.startsWith('.planning/codebase/')) continue;
    const codebase = artifact.structured?.codebase as CodebaseBody | undefined;
    if (codebase !== undefined) found.set(codebase.doc, codebase);
  }
  return found;
}

describe("this repository's own codebase map", () => {
  it('loads seven documents, each with its document name', async () => {
    const found = await mapDocuments();
    expect([...found.keys()].sort()).toEqual([...DOCS].sort());
  });

  it('gives every document a non-negative integer key number (where set) and sections in document order', async () => {
    const found = await mapDocuments();
    for (const doc of ['stack', 'concerns']) {
      const body = found.get(doc);
      expect(Number.isInteger(body?.keyNumber), `${doc} keyNumber`).toBe(true);
      expect(body?.keyNumber ?? -1).toBeGreaterThanOrEqual(0);
    }
    for (const [doc, body] of found) {
      expect(body.keyNumber === null || (Number.isInteger(body.keyNumber) && body.keyNumber >= 0), doc).toBe(true);
      expect(body.sections.length, `${doc} sections`).toBeGreaterThan(0);
      for (const section of body.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect([2, 3]).toContain(section.level);
        expect(section.key === null || typeof section.key === 'string').toBe(true);
      }
      // A key is claimed by at most one section.
      const keys = body.sections.map((s) => s.key).filter((k): k is string => k !== null);
      expect(new Set(keys).size, `${doc} keys are unique`).toBe(keys.length);
    }
  });

  it('gives each document a stamp whose date, when present, is a calendar day', async () => {
    const found = await mapDocuments();
    for (const [doc, body] of found) {
      const { mappedAt, commit } = body.stamp;
      expect(mappedAt === null || /^\d{4}-\d{2}-\d{2}$/.test(mappedAt), `${doc} mappedAt`).toBe(true);
      expect(commit === null || commit.length === 7, `${doc} commit`).toBe(true);
    }
  });

  it("sums CONCERNS' section counts to its key number", async () => {
    const concerns = (await mapDocuments()).get('concerns');
    expect(concerns?.concerns).toBeDefined();
    const sections = concerns?.concerns?.sections ?? [];
    for (const section of sections) {
      expect(Number.isInteger(section.count) && section.count >= 0, section.heading).toBe(true);
    }
    expect(sections.reduce((sum, s) => sum + s.count, 0)).toBe(concerns?.keyNumber);
    expect(concerns?.concerns?.total).toBe(concerns?.keyNumber);
  });

  it("lifts STACK's chips as a bounded list of named chips", async () => {
    const stack = (await mapDocuments()).get('stack')?.stack;
    expect(stack).toBeDefined();
    const chips = [...(stack?.languages ?? []), ...(stack?.runtime ?? []), ...(stack?.frameworks ?? [])];
    expect(chips.length).toBeLessThanOrEqual(60);
    for (const chip of chips) {
      expect(chip.name.length).toBeGreaterThan(0);
      expect(chip.name.length).toBeLessThanOrEqual(120);
      expect(chip.version === null || chip.version.length <= 120).toBe(true);
    }
    expect(stack?.languages.length).toBeGreaterThan(0);
  });
});
