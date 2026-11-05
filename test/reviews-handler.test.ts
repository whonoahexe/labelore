// Phase 10 (10-22, VIEW-12): the REVIEWS.md handler and extractor. It reads each reviewer's own section (name, model, run
// status, concerns, stated risk and verdicts) and the file's own consensus into `structured.reviews`, on the made-up Lendshed
// reviews (04 three reviewers who disagree and a failed lane, 01 one reviewer) (VIEW-21). Nothing is compared or merged here.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { ReviewsHandler, extractReviews } from '../src/planning-repo/handlers/reviews.ts';
import type { ReviewsBody } from '../src/planning-repo/handlers/reviews.ts';
import { ReviewHandler } from '../src/planning-repo/handlers/review.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxRead } from './helpers/fixture-project.ts';

const PATH = '.planning/phases/01-member-sign-in-sessions/01-REVIEWS.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'reviews',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

const ONE = fxRead('phases/01-member-sign-in-sessions/01-REVIEWS.md');

/** The extractor's reading of a whole file, frontmatter included. */
function read(content: string): ReviewsBody {
  const fm = tryParseFrontmatter(content);
  return extractReviews(fm.data, fm.body);
}

describe('ReviewsHandler', () => {
  it('claims a REVIEWS ref ahead of the generic handler, and not the code-review REVIEW token', () => {
    expect(ReviewsHandler.match(ref())).toBe(true);
    expect(ReviewsHandler.match(ref('.planning/phases/01-member-sign-in-sessions/01-REVIEW.md'))).toBe(false);
    expect(ReviewsHandler.match(ref('.planning/phases/01-member-sign-in-sessions/01-REVIEW-FIX.md'))).toBe(false);
    expect(ReviewsHandler.match(ref('.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md'))).toBe(false);
    expect(ReviewHandler.match(ref())).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(ReviewsHandler);
    expect(HANDLERS.indexOf(ReviewsHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('carries the title, the body and the reading in structured.reviews', () => {
    const result = ReviewsHandler.parse(raw(ONE), ref());
    expect(result.title).toBe('Cross-AI Plan Review — Phase 1');
    expect(result.body).toContain('## Claude Review');
    expect((result.structured?.reviews as ReviewsBody).reviewers).toHaveLength(1);
  });

  it('keeps the title, body and frontmatter when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/fenced-sections.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/fenced-sections.ts')>()),
      eachLineOutsideFences: () => {
        throw new Error('boom');
      },
    }));
    const { ReviewsHandler: Guarded } = await import('../src/planning-repo/handlers/reviews.ts');
    const result = Guarded.parse(raw('---\nstatus: kept\n---\n\n# A review\n\nBody text.\n'), ref());
    expect(result.title).toBe('A review');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('kept');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/fenced-sections.ts');
  });
});

describe('extractReviews - 01-REVIEWS (one reviewer)', () => {
  const file = read(ONE);

  it('reads one reviewer with its model as the frontmatter wrote it and no run status', () => {
    expect(file.reviewers).toHaveLength(1);
    const claude = file.reviewers[0];
    expect(claude.name).toBe('Claude');
    expect(claude.slug).toBe('claude');
    expect(claude.model).toBe('example-model-a');
    expect(claude.status).toBe('ok');
    expect(claude.reduced).toBe(false);
  });

  it('reads the date, the phase, the plans and the roster from the frontmatter', () => {
    expect(file.phase).toBe('1');
    expect(file.reviewedAt).toBe('2026-03-27');
    expect(file.plansReviewed).toEqual(['01-01']);
    expect(file.roster).toEqual([{ slug: 'claude', model: 'example-model-a', missing: [] }]);
  });

  it('reads the stated risk and the two concerns with their severities and plan', () => {
    const claude = file.reviewers[0];
    expect(claude.risk).toBe('LOW');
    expect(claude.concerns.map((c) => [c.severity, c.planId])).toEqual([
      ['MEDIUM', '01-01'],
      ['LOW', '01-01'],
    ]);
    expect(claude.concerns[0].text.startsWith('the session store keeps sessions in memory')).toBe(true);
    expect(claude.planIds).toEqual(['01-01']);
  });

  it('keeps the reviewer text as written, its own plan heading inside it, and the conflicts block out of it', () => {
    const text = file.reviewers[0].text;
    expect(text.startsWith('## 01-01')).toBe(true);
    expect(text).toContain('### Concerns');
    expect(text).not.toContain('Plan-Revision Conflicts');
    expect(text).not.toContain('Consensus Summary');
    expect(text.endsWith('---')).toBe(false);
  });

  it("reads the file's own consensus: none agreed, none divergent, and its text as written", () => {
    expect(file.consensus).not.toBeNull();
    expect(file.consensus?.concerns).toEqual([]);
    expect(file.consensus?.text).toContain('One lane ran');
    expect(file.others).toEqual([]);
  });
});
