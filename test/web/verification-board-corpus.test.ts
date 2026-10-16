// quick-261017-18a (Q18A-08): real-corpus guards over every VERIFICATION.md in this repo's
// `.planning/`, the dense fixture, the four copied reports and (when present) the studio-portal
// checkout, built through the real repository load so phase, archived-phase, quick and archived-quick
// reports reach the handler with the refs discovery gives them. Every report must carry
// `structured.verification` and compose to a non-null page; the five sketch reports and the harder
// shapes match the values pinned below, which come from the sketch's own data.js and grep over the
// source files - never from the composer's output.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { VerificationHandler } from '../../src/planning-repo/handlers/verification.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeVerificationBoard } from '../../src/web/views/verification-board.ts';
import type { ComposedVerificationBoard } from '../../src/web/views/verification-board.ts';
import { SP_PLANNING, STUDIO_PORTAL_ROOT } from '../helpers/studio-portal.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');
const DENSE = join(LB_ROOT, 'fixtures/dense');
const FIXTURES = join(LB_ROOT, 'test/fixtures/verification');
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
      } else if (entry.endsWith('VERIFICATION.md')) {
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

function compose(a: Artifact): ComposedVerificationBoard {
  const model = composeVerificationBoard({
    kind: 'verification',
    frontmatter: a.frontmatter,
    structured: a.structured,
    groups: [],
    planSegments: [],
  });
  if (model === null) throw new Error(`composed null: ${a.path}`);
  return model;
}

const isVerification = (path: string): boolean => path.endsWith('VERIFICATION.md') && !path.includes('/sketches/');

function fixtureBoard(name: string): ComposedVerificationBoard {
  const file = join(FIXTURES, name);
  const content = readFileSync(file, 'utf8');
  const ref: ArtifactRef = { path: file, kind: 'verification', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  const parsed = VerificationHandler.parse({ path: file, content, mtimeMs: 0, size: content.length }, ref);
  const model = composeVerificationBoard({
    kind: 'verification',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
  });
  if (model === null) throw new Error(`composed null: ${name}`);
  return model;
}

describe('VERIFICATION corpus - every file extracts and composes', () => {
  it('finds the same files on disk and in the presentation (labelore)', () => {
    const onDisk = walk(LB_PLANNING).map((p) => relative(LB_ROOT, p)).sort();
    const loaded = lb.artifacts.filter((a) => isVerification(a.path)).map((a) => a.path).sort();
    expect(loaded).toEqual(onDisk);
    expect(loaded.length).toBeGreaterThanOrEqual(12);
  });

  it('labelore: structured.verification on every file and a non-null page', () => {
    for (const a of lb.artifacts.filter((x) => isVerification(x.path))) {
      expect(a.structured.verification, a.path).toBeDefined();
      expect(() => compose(a), a.path).not.toThrow();
    }
  });

  it('the dense fixture composes from its frontmatter alone', () => {
    const m = compose(artifactAt(dense, '01-identity-slice/01-VERIFICATION.md'));
    expect(m.rail.eyebrow).toBe('Verification · Phase 1');
    expect(m.rail.title).toBe('Identity slice');
    expect(m.rail.status).toEqual({ label: 'Passed', tone: 'complete' });
    expect(m.rail.verified).toBe('10 Jun 2026 · 10:30');
    expect(m.ledger.empty).toBe('No gaps found.');
  });

  it('the four copied reports compose', () => {
    for (const name of ['synthetic', 'sp04', 'sb04', 'dd01']) {
      expect(() => fixtureBoard(`${name}-VERIFICATION.md`), name).not.toThrow();
    }
  });

  it.runIf(hasSp)('studio-portal: structured.verification on every file and a non-null page', () => {
    const files = (sp as ProjectPresentation).artifacts.filter((x) => isVerification(x.path));
    expect(files.length).toBeGreaterThanOrEqual(9);
    for (const a of files) {
      expect(a.structured.verification, a.path).toBeDefined();
      expect(() => compose(a), a.path).not.toThrow();
    }
  });

  it.runIf(hasSp)('studio-portal v1.0/04: passed with one frontmatter gap shows a C1 row', () => {
    const m = compose(artifactAt(sp as ProjectPresentation, 'v1.0-phases/04-tier-to-tier-transfers/04-VERIFICATION.md'));
    expect(m.rail.status?.label).toBe('Passed');
    expect(m.ledger.rows.map((r) => r.number)).toEqual(['C1']);
  });
});

describe('the five sketch reports', () => {
  it('syn, sp04, sb04 and dd01 compose the pinned facts from the copied files', () => {
    const syn = fixtureBoard('synthetic-VERIFICATION.md');
    expect([syn.rail.big?.value, syn.ledger.rows.length, syn.human?.steps.length, syn.truths?.details.length]).toEqual(['2', 4, 2, 10]);
    const sp04 = fixtureBoard('sp04-VERIFICATION.md');
    expect([sp04.rail.big?.value, sp04.ledger.rows.length, sp04.truths?.details.length, sp04.anti?.blockers.length]).toEqual(['7', 7, 39, 4]);
    const sb04 = fixtureBoard('sb04-VERIFICATION.md');
    expect([sb04.rail.big?.value, sb04.human?.steps.length, sb04.requirements?.details.length]).toEqual(['5', 5, 15]);
    const dd01 = fixtureBoard('dd01-VERIFICATION.md');
    expect([dd01.rail.big?.value, dd01.human?.steps.length, dd01.truths?.details.length, dd01.requirements?.details.length]).toEqual(['2', 2, 14, 9]);
    expect(dd01.human?.steps.map((s) => s.title)[0]).toBe('Run `yarn validate:routing` to completion');
  });

  it('labelore v1.1/05 through the repository', () => {
    const m = compose(artifactAt(lb, 'v1.1-phases/05-per-type-document-views/05-VERIFICATION.md'));
    expect(m.rail.eyebrow).toBe('Verification · Phase 5');
    expect(m.rail.big).toMatchObject({ value: '5/7', sub: '4 human checks recorded' });
    expect(m.ledger.empty).toBe('No blocking gaps.');
    expect(m.human?.steps).toHaveLength(4);
    expect(m.requirements?.details).toHaveLength(11);
    expect(m.spotChecks?.rows).toHaveLength(12);
  });
});

describe('harder shapes', () => {
  it('v1.0/01: a resolved check, a same-level numbered check and a second Human Verification section', () => {
    const m = compose(artifactAt(lb, 'v1.0-phases/01-read-layer-domain-model/01-VERIFICATION.md'));
    expect(m.human?.heading).toBe('Checked by a person');
    expect(m.human?.steps).toHaveLength(1);
    expect(m.rail.slips).toEqual([]);
    expect(m.also.map((a) => a.label)).toContain('Human Verification — Resolved 2026-09-09');
  });

  it('quick 260930-mp6: a task key, empty gaps and three frontmatter checks', () => {
    const m = compose(artifactAt(lb, 'quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/260930-mp6-VERIFICATION.md'));
    expect(m.rail.eyebrow).toBe('Quick verification · 260930-mp6');
    expect(m.ledger.rows).toEqual([]);
    expect(m.human?.steps).toHaveLength(3);
  });

  it('quick 261003-527 and 261003-528: a Truths section and no requirements table', () => {
    for (const id of ['261003-527', '261003-528']) {
      const a = lb.artifacts.find((x) => x.path.includes(`${id}-`) && x.path.endsWith('VERIFICATION.md'));
      expect(a, id).toBeDefined();
      const m = compose(a as Artifact);
      expect(m.requirements, id).toBeNull();
      expect(m.truths?.details.length, id).toBe(9);
    }
  });

  it.runIf(hasSp)('studio-portal quick 260727-3mo: a same-level numbered human check', () => {
    const m = compose(artifactAt(sp as ProjectPresentation, '260727-3mo-VERIFICATION.md'));
    expect(m.human?.steps.length).toBeGreaterThanOrEqual(1);
    expect(m.rail.eyebrow).toBe('Quick verification · 260727-3mo');
  });
});
