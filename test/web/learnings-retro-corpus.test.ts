// quick-261017-k45 (QK45-07): real-corpus guards over every LEARNINGS file in this repo's `.planning/`
// (none today; the sketches are skipped), the dense fixture's two files, the two copied fixtures and
// (when present) the studio-portal checkout, built through the real repository load so phase and
// project-root files reach the handler with the refs discovery gives them. Every file must carry
// `structured.learnings` and compose to a non-null page whose per-kind counts equal the frontmatter
// `counts`; the four sketch files match the values pinned below, which come from the sketch's own
// data.js and the source files - never from the composer's output.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { LearningsHandler } from '../../src/planning-repo/handlers/learnings.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeLearningsRetro } from '../../src/web/views/learnings-retro.ts';
import type { ComposedLearningsRetro } from '../../src/web/views/learnings-retro.ts';
import { SP_PLANNING, STUDIO_PORTAL_ROOT } from '../helpers/studio-portal.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');
const DENSE = join(LB_ROOT, 'fixtures/dense');
const FIXTURES = join(LB_ROOT, 'test/fixtures/learnings');
const hasSp = existsSync(SP_PLANNING);

function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (['sketches', 'node_modules', 'worktrees', '.cache'].includes(entry)) continue;
        stack.push(abs);
      } else if (entry.endsWith('LEARNINGS.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

let lb: ProjectPresentation;
let dense: ProjectPresentation;
let sp: ProjectPresentation | null = null;

beforeAll(async () => {
  const load = async (root: string): Promise<ProjectPresentation> => {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    return toProjectPresentation(await repository.load());
  };
  lb = await load(LB_ROOT);
  dense = await load(DENSE);
  if (hasSp) sp = await load(STUDIO_PORTAL_ROOT);
}, 60000);

type Artifact = ProjectPresentation['artifacts'][number];

function artifactAt(presentation: ProjectPresentation, suffix: string): Artifact {
  const found = presentation.artifacts.find((a) => a.path.endsWith(suffix));
  if (!found) throw new Error(`no artifact ending ${suffix}`);
  return found;
}

function compose(a: Artifact): ComposedLearningsRetro {
  const model = composeLearningsRetro({
    kind: 'learnings',
    frontmatter: a.frontmatter,
    structured: a.structured,
    groups: [],
    planSegments: [],
  });
  if (model === null) throw new Error(`composed null: ${a.path}`);
  return model;
}

const isLearnings = (path: string): boolean => path.endsWith('LEARNINGS.md') && !path.includes('/sketches/');

function fixtureModel(name: string): ComposedLearningsRetro {
  const file = join(FIXTURES, name);
  const content = readFileSync(file, 'utf8');
  const ref: ArtifactRef = { path: file, kind: 'learnings', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  const parsed = LearningsHandler.parse({ path: file, content, mtimeMs: 0, size: content.length }, ref);
  const model = composeLearningsRetro({
    kind: 'learnings',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
  });
  if (model === null) throw new Error(`composed null: ${name}`);
  return model;
}

const perKind = (m: ComposedLearningsRetro): number[] =>
  ['decision', 'lesson', 'pattern', 'surprise'].map((k) => m.chapters.find((c) => c.kind === k)?.entries.length ?? 0);

function frontmatterCounts(a: Artifact): number[] {
  const counts = (a.frontmatter.counts ?? {}) as Record<string, unknown>;
  return ['decisions', 'lessons', 'patterns', 'surprises'].map((k) => (typeof counts[k] === 'number' ? (counts[k] as number) : 0));
}

describe('every LEARNINGS file in the corpus', () => {
  it('extracts without throwing, composes non-null and matches its frontmatter counts', () => {
    const presentations: [string, ProjectPresentation | null][] = [
      ['labelore', lb],
      ['dense', dense],
      ['studio-portal', sp],
    ];
    let files = 0;
    for (const [name, presentation] of presentations) {
      if (presentation === null) continue;
      for (const a of presentation.artifacts.filter((x) => isLearnings(x.path))) {
        files += 1;
        const label = `${name}: ${a.path}`;
        expect(a.kind, label).toBe('learnings');
        expect(a.structured.learnings, label).toBeDefined();
        const model = compose(a);
        expect(perKind(model), label).toEqual(frontmatterCounts(a));
      }
    }
    // The walk below proves the files exist on disk; the combined corpus can never be empty.
    const onDisk = [...walk(LB_PLANNING), ...walk(join(DENSE, '.planning')), ...walk(FIXTURES), ...(hasSp ? walk(SP_PLANNING) : [])];
    expect(onDisk.length).toBeGreaterThanOrEqual(4);
    expect(files).toBeGreaterThanOrEqual(2);
  });

  it('parses the two copied fixtures with the sketch counts', () => {
    expect(perKind(fixtureModel('synthetic-LEARNINGS.md'))).toEqual([3, 3, 3, 2]);
    expect(perKind(fixtureModel('sp01-LEARNINGS.md'))).toEqual([14, 9, 10, 7]);
  });

  it('reads the dense fixture files with the sketch values', () => {
    const phase = compose(artifactAt(dense, 'phases/01-identity-slice/01-LEARNINGS.md'));
    expect(perKind(phase)).toEqual([1, 1, 1, 0]);
    expect(phase.head).toMatchObject({ eyebrow: 'Learnings · Phase 1', title: 'Identity Slice', extracted: '10 Jun 2026' });
    expect(phase.lede).toBe('3 learnings from this phase: 1 decision, 1 lesson and 1 pattern, drawn from 1 source.');
    const project = compose(artifactAt(dense, '.planning/LEARNINGS.md'));
    expect(perKind(project)).toEqual([3, 2, 2, 1]);
    expect(project.head).toMatchObject({ eyebrow: 'Learnings · Project', title: 'Dense Fixture Project', extracted: '22 Aug 2026', project: null });
    expect(project.sources.map((s) => [s.label, s.count])).toEqual([['D-01', 1], ['D-02', 2]]);
    expect(project.also.map((a) => a.label)).toEqual(['Frontmatter']);
  });

  it.runIf(hasSp)('reads studio-portal phase 1 with the sketch values', () => {
    const model = compose(artifactAt(sp as ProjectPresentation, 'phases/01-portal-owned-identity-sessions/01-LEARNINGS.md'));
    expect(perKind(model)).toEqual([14, 9, 10, 7]);
    expect(model.head).toMatchObject({ eyebrow: 'Learnings · Phase 1', title: 'Portal-Owned Identity & Sessions', project: 'Cinedise Portal' });
    expect(model.sources).toHaveLength(10);
    expect(model.also.map((a) => a.label)).toEqual(['Frontmatter']);
  });
});
