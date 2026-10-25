// quick-261017-k45 (QK45-07): corpus guards over every LEARNINGS file in this repo's `.planning/` (none
// today; the sketches are skipped), the dense fixture's two files, the synthetic template and the
// made-up Lendshed project (D-01, D-05, D-06), built through the real repository load so phase and
// project-root files reach the handler with the refs discovery gives them. Every file must carry
// `structured.learnings` and compose to a non-null page whose per-kind counts equal the frontmatter
// `counts`; the Lendshed phase 1 file matches the values pinned below, each recounted by grep and awk in
// the made-up file itself (R5) - never from the composer's output.
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
import { FX_PLANNING, FX_ROOT, fxPath, loadProject } from '../helpers/fixture-project.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');
const DENSE = join(LB_ROOT, 'fixtures/dense');
const FIXTURES = join(LB_ROOT, 'test/fixtures/learnings');

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
let fx: ProjectPresentation;

beforeAll(async () => {
  const load = async (root: string): Promise<ProjectPresentation> => {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    return toProjectPresentation(await repository.load());
  };
  lb = await load(LB_ROOT);
  dense = await load(DENSE);
  fx = (await loadProject(FX_ROOT)).presentation;
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

function fixtureModel(file: string): ComposedLearningsRetro {
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
  if (model === null) throw new Error(`composed null: ${file}`);
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
    const presentations: [string, ProjectPresentation][] = [
      ['labelore', lb],
      ['dense', dense],
      ['lendshed', fx],
    ];
    let files = 0;
    for (const [name, presentation] of presentations) {
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
    const onDisk = [...walk(LB_PLANNING), ...walk(join(DENSE, '.planning')), ...walk(FIXTURES), ...walk(FX_PLANNING)];
    expect(onDisk.length).toBeGreaterThanOrEqual(4);
    expect(walk(FX_PLANNING).length).toBeGreaterThanOrEqual(1);
    expect(files).toBeGreaterThanOrEqual(2);
  });

  it('parses the synthetic file and the Lendshed phase 1 file with the pinned counts', () => {
    expect(perKind(fixtureModel(join(FIXTURES, 'synthetic-LEARNINGS.md')))).toEqual([3, 3, 3, 2]);
    expect(perKind(fixtureModel(fxPath('phases/01-member-sign-in-sessions/01-LEARNINGS.md')))).toEqual([14, 9, 10, 7]);
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

  it('reads Lendshed phase 1 with the pinned values', () => {
    const model = compose(artifactAt(fx, 'phases/01-member-sign-in-sessions/01-LEARNINGS.md'));
    expect(perKind(model)).toEqual([14, 9, 10, 7]);
    expect(model.head).toMatchObject({ eyebrow: 'Learnings · Phase 1', title: 'Member Sign-In & Sessions', project: 'Lendshed' });
    expect(model.sources).toHaveLength(10);
    expect(model.also.map((a) => a.label)).toEqual(['Frontmatter']);
  });
});
