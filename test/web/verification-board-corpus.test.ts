// quick-261017-18a (Q18A-08): corpus guards over every VERIFICATION.md in this repo's `.planning/`, the dense
// fixture, the synthetic template report and the made-up Lendshed project (D-01, D-05, D-06), built through the
// real repository load so phase, archived-phase, quick and archived-quick reports reach the handler with the
// refs discovery gives them. Every report must carry `structured.verification` and compose to a non-null page;
// the Lendshed reports and the harder shapes match the values pinned below, each recounted by grep and awk in
// the made-up file itself (R5) and kept per file (R6), never totalled over the whole project.
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
import { FX_PLANNING, FX_ROOT, fxPath, loadProject } from '../helpers/fixture-project.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');
const DENSE = join(LB_ROOT, 'fixtures/dense');
const FIXTURES = join(LB_ROOT, 'test/fixtures/verification');

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
  const ref: ArtifactRef = { path: file, kind: 'verification', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 };
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

  it('the synthetic report composes', () => {
    expect(() => fixtureBoard('synthetic-VERIFICATION.md')).not.toThrow();
  });

  it('lendshed: at least 5 reports, found the same on disk and in the presentation', () => {
    const onDisk = walk(FX_PLANNING).map((p) => relative(FX_ROOT, p)).sort();
    const loaded = fx.artifacts.filter((a) => isVerification(a.path)).map((a) => a.path).sort();
    expect(loaded).toEqual(onDisk);
    expect(loaded.length).toBeGreaterThanOrEqual(5);
  });

  it('lendshed: structured.verification on every file and a non-null page', () => {
    for (const a of fx.artifacts.filter((x) => isVerification(x.path))) {
      expect(a.structured.verification, a.path).toBeDefined();
      expect(() => compose(a), a.path).not.toThrow();
    }
  });

  it('lendshed v1.0/04: passed with one frontmatter gap shows a C1 row', () => {
    fxPath('milestones/v1.0-phases/04-shed-to-shed-transfers/04-VERIFICATION.md');
    const m = compose(artifactAt(fx, 'v1.0-phases/04-shed-to-shed-transfers/04-VERIFICATION.md'));
    expect(m.rail.status?.label).toBe('Passed');
    expect(m.ledger.rows.map((r) => r.number)).toEqual(['C1']);
  });
});

const LX04 = 'phases/04-bulk-loan-export/04-VERIFICATION.md';
const LX03 = 'phases/03-account-admin-and-sessions/03-VERIFICATION.md';
const LX01 = 'milestones/v1.0-phases/01-member-data-foundation/01-VERIFICATION.md';

describe('the template report and the Lendshed reports', () => {
  it('syn and the three Lendshed phase reports compose the pinned facts', () => {
    const syn = fixtureBoard('synthetic-VERIFICATION.md');
    expect([syn.rail.big?.value, syn.ledger.rows.length, syn.human?.steps.length, syn.truths?.details.length]).toEqual(['2', 4, 2, 10]);
    fxPath(LX04);
    const lx04 = compose(artifactAt(fx, LX04));
    expect([lx04.rail.big?.value, lx04.ledger.rows.length, lx04.truths?.details.length, lx04.anti?.blockers.length]).toEqual(['7', 7, 21, 4]);
    fxPath(LX03);
    const lx03 = compose(artifactAt(fx, LX03));
    expect([lx03.rail.big?.value, lx03.human?.steps.length, lx03.requirements?.details.length]).toEqual(['4', 4, 6]);
    fxPath(LX01);
    const lx01 = compose(artifactAt(fx, LX01));
    expect([lx01.rail.big?.value, lx01.human?.steps.length, lx01.truths?.details.length, lx01.requirements?.details.length]).toEqual(['2', 2, 8, 5]);
    expect(lx01.human?.steps.map((s) => s.title)[0]).toBe('Run `npm run check-seed` to completion');
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

  it('lendshed quick 260327-h4w: a same-level numbered human check', () => {
    fxPath('quick/260327-h4w-move-the-live-status-socket-into-a-provider/260327-h4w-VERIFICATION.md');
    const m = compose(artifactAt(fx, '260327-h4w-VERIFICATION.md'));
    expect(m.human?.steps).toHaveLength(1);
    expect(m.rail.eyebrow).toBe('Quick verification · 260327-h4w');
  });
});
