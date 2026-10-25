// quick-261017-k44: real-corpus guards over every REVIEW.md and REVIEW-FIX.md in this repo's
// `.planning/`, the nine copied fixtures and (when present) the studio-portal checkout, built through
// the real repository load so phase, archived-phase, quick and archived-quick reports reach the
// handlers with the refs discovery gives them. Every report must carry `structured.review` /
// `structured.reviewFix` and every review must compose to a non-null page with its sibling REVIEW-FIX
// joined; the keyed reviews match the values pinned below, which come from the sketch's own data.js
// and grep over the source files - never from the composer's output.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { ReviewFixHandler, ReviewHandler } from '../../src/planning-repo/handlers/review.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import { buildReferenceRegistry } from '../../src/presentation/references.ts';
import { buildReviewContext } from '../../src/presentation/review-context.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeReviewThreads } from '../../src/web/views/review-threads.ts';
import type { ComposedReviewThreads } from '../../src/web/views/review-threads.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');
const FIXTURES = join(LB_ROOT, 'test/fixtures/review');

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
      } else if (entry.endsWith('-REVIEW.md') && !entry.endsWith('-UI-REVIEW.md')) {
        found.push(abs);
      } else if (entry.endsWith('-REVIEW-FIX.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

let lb: ProjectPresentation;
let fx: ProjectPresentation;

beforeAll(async () => {
  const load = async (root: string): Promise<ProjectPresentation> => {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    return toProjectPresentation(await repository.load());
  };
  lb = await load(LB_ROOT);
  fx = (await loadProject(FX_ROOT)).presentation;
}, 60000);

type Artifact = ProjectPresentation['artifacts'][number];

const isReview = (path: string): boolean => path.endsWith('-REVIEW.md') && !path.endsWith('-UI-REVIEW.md') && !path.includes('/sketches/');
const isFix = (path: string): boolean => path.endsWith('-REVIEW-FIX.md') && !path.includes('/sketches/');

function artifactAt(presentation: ProjectPresentation, suffix: string): Artifact {
  const found = presentation.artifacts.find((a) => a.path.endsWith(suffix));
  if (!found) throw new Error(`no artifact ending ${suffix}`);
  return found;
}

function compose(presentation: ProjectPresentation, a: Artifact): ComposedReviewThreads {
  const context = JSON.parse(
    JSON.stringify(buildReviewContext(presentation, buildReferenceRegistry(presentation), a.path)),
  ) as never;
  const model = composeReviewThreads({
    kind: 'review',
    frontmatter: a.frontmatter,
    structured: a.structured,
    groups: [],
    planSegments: [],
    reviewContext: context,
  });
  if (model === null) throw new Error(`composed null: ${a.path}`);
  return model;
}

function fixtureReview(name: string): ComposedReviewThreads {
  const file = join(FIXTURES, name);
  const content = readFileSync(file, 'utf8');
  const ref: ArtifactRef = { path: file, kind: 'review', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  const parsed = ReviewHandler.parse({ path: file, content, mtimeMs: 0, size: content.length }, ref);
  const model = composeReviewThreads({
    kind: 'review',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
  });
  if (model === null) throw new Error(`composed null: ${name}`);
  return model;
}

const verdictText = (m: ComposedReviewThreads): string => m.verdict.parts.map((p) => p.text).join('');

describe('REVIEW corpus - every file extracts and composes', () => {
  it('finds the same files on disk and in the presentation (labelore)', () => {
    const onDisk = walk(LB_PLANNING).map((p) => relative(LB_ROOT, p)).sort();
    const loaded = lb.artifacts.filter((a) => isReview(a.path) || isFix(a.path)).map((a) => a.path).sort();
    expect(loaded).toEqual(onDisk);
    expect(loaded.length).toBeGreaterThanOrEqual(6);
  });

  it('labelore: a projection on every file, and a non-null page for every review', () => {
    for (const a of lb.artifacts.filter((x) => isReview(x.path))) {
      expect(a.structured.review, a.path).toBeDefined();
      expect(() => compose(lb, a), a.path).not.toThrow();
    }
    for (const a of lb.artifacts.filter((x) => isFix(x.path))) {
      expect(a.structured.reviewFix, a.path).toBeDefined();
    }
  });

  it('the nine fixtures parse and compose without throwing', () => {
    for (const name of readdirSync(FIXTURES).filter((n) => n.endsWith('-REVIEW.md'))) {
      expect(() => fixtureReview(name), name).not.toThrow();
    }
    for (const name of readdirSync(FIXTURES).filter((n) => n.endsWith('-REVIEW-FIX.md'))) {
      const file = join(FIXTURES, name);
      const content = readFileSync(file, 'utf8');
      const ref: ArtifactRef = { path: file, kind: 'review-fix', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
      const parsed = ReviewFixHandler.parse({ path: file, content, mtimeMs: 0, size: content.length }, ref);
      expect((parsed.structured as { reviewFix?: unknown }).reviewFix, name).toBeDefined();
    }
  });

  it('serves the ROADMAP phase name as the title and joins the sibling fix report', () => {
    const lb01 = compose(lb, artifactAt(lb, '01-read-layer-domain-model/01-REVIEW.md'));
    expect(lb01.head.title).toBe('Read Layer & Domain Model');
    expect(verdictText(lb01)).toBe('5 of 7 fixed. 2 still in the code.');
    expect(lb01.also[0].label).toBe('Fix report · All fixed');
    expect(lb01.also[0].url).toContain('01-REVIEW-FIX.md');
    const lb04 = compose(lb, artifactAt(lb, '04-portability-degradation-hardening/04-REVIEW.md'));
    expect(lb04.head.title).toBe('Portability & Degradation Hardening');
    expect(verdictText(lb04)).toBe('5 findings, 2 critical. None fixed yet.');
    expect(lb04.also.map((a) => a.label)).toEqual(['Files reviewed · 36', 'Frontmatter']);
    expect(lb04.footer).toEqual({ reviewer: 'the agent (gsd-code-reviewer)', depth: 'standard' });
    const lb05 = compose(lb, artifactAt(lb, '05-per-type-document-views/05-REVIEW.md'));
    expect(lb05.head.title).toBe('Per-Type Document Views');
    expect(verdictText(lb05)).toBe('3 findings. None fixed yet.');
    expect(lb05.threads.aside).toBe('3 files · 3 comments');
  });

  it('the fixtures match the pinned verdicts', () => {
    const pins: [string, string][] = [
      ['sp01-REVIEW.md', '2 of 9 fixed. 7 still in the code.'],
      ['dd01-REVIEW.md', '26 findings, 4 critical. None fixed yet.'],
      ['clean-REVIEW.md', 'Clean. Nothing to fix across 4 files.'],
      ['sp03-REVIEW.md', '7 findings. None fixed yet.'],
      ['sb14-REVIEW.md', '2 of 12 fixed. 10 still in the code.'],
    ];
    for (const [name, text] of pins) expect(verdictText(fixtureReview(name)), name).toBe(text);
  });
});

describe('REVIEW corpus - Lendshed', () => {
  it('every report extracts and every review composes', () => {
    const reviews = fx.artifacts.filter((a) => isReview(a.path));
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    for (const a of reviews) {
      expect(a.structured.review, a.path).toBeDefined();
      expect(() => compose(fx, a), a.path).not.toThrow();
    }
    for (const a of fx.artifacts.filter((x) => isFix(x.path))) expect(a.structured.reviewFix, a.path).toBeDefined();
  });

  it('phases/01 joins its REVIEW-FIX: CR-01 and WR-01 fixed, IN-01, IN-02 and IN-03 skipped', () => {
    const model = compose(fx, artifactAt(fx, 'phases/01-member-sign-in-sessions/01-REVIEW.md'));
    const stamps = new Map(model.threads.files.flatMap((f) => f.findings).map((f) => [f.id, f.stamp.outcome]));
    expect(stamps.get('CR-01')).toBe('fixed');
    expect(stamps.get('WR-01')).toBe('fixed');
    for (const id of ['IN-01', 'IN-02', 'IN-03']) expect(stamps.get(id), id).toBe('skipped');
    expect(model.also[0].label).toBe('Fix report · Partial');
  });
});
