// Phase 10 (10-22, VIEW-12): the Cross-AI reviews composer and the static markup of its page (sketch 052 winner A "Overlap"),
// on the made-up Lendshed reviews (04 three reviewers who disagree and a failed lane, 01 one reviewer). The first screen says
// who raised which concern; what the reviewers agreed on and where they disagree is derived from their own text, best-effort,
// and a concern the page cannot match stays under its reviewer.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeReviews } from '../../src/web/views/reviews-page.ts';
import type { ComposedReviews } from '../../src/web/views/reviews-page.ts';
import { ReviewsView, reviewsHeaderProps } from '../../src/web/views/reviews-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { ReviewsHandler } from '../../src/planning-repo/handlers/reviews.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const ONE = fxRead('phases/01-member-sign-in-sessions/01-REVIEWS.md');
const PATH = '.planning/phases/01-x/01-REVIEWS.md';

function ref(path: string): ArtifactRef {
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

function inputOf(reviews: unknown, phaseName: string | null = null): ViewInput {
  return {
    kind: 'reviews',
    frontmatter: {},
    structured: reviews === undefined ? {} : { reviews },
    groups: [],
    planSegments: [],
    phaseName,
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, phaseName: string | null = null, path = PATH): ComposedReviews | null {
  const file: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = ReviewsHandler.parse(file, ref(path));
  return composeReviews(inputOf(parsed.structured?.reviews, phaseName));
}

function markup(model: ComposedReviews): string {
  return renderToStaticMarkup(createElement(ReviewsView, { model }));
}

describe('composeReviews - 01-REVIEWS, one reviewer', () => {
  const model = composeFile(ONE, 'Member Sign-In & Sessions')!;

  it('gives one reviewer card with its model, its stated risk and the plan it reviewed', () => {
    expect(model.reviewers).toHaveLength(1);
    const claude = model.reviewers[0];
    expect(claude.name).toBe('Claude');
    expect(claude.model).toBe('example-model-a');
    expect(claude.risk).toBe('LOW');
    expect(claude.riskTone).toBe('quiet');
    expect(claude.status).toBe('ok');
    expect(claude.statusLabel).toBeNull();
    expect(claude.coverage).toEqual([{ id: '01-01', done: true }]);
  });

  it('gives no Agreed and no Disagreements group, and lists the two concerns as one reviewer\'s own', () => {
    expect(model.grouped).toBe(false);
    expect(model.agreed).toEqual([]);
    expect(model.disagreements).toEqual([]);
    expect(model.concerns.map((c) => [c.word, c.tone])).toEqual([
      ['MEDIUM', 'in-flight'],
      ['LOW', 'quiet'],
    ]);
    expect(model.singles).toEqual([0, 1]);
  });

  it('draws one circle (the overlap layout) with the reviewer drawn', () => {
    expect(model.layout).toBe('overlap');
    expect(model.drawn).toEqual([0]);
    expect(model.note).toBeNull();
  });

  it("keeps the reviewer's text and the file's consensus as closed bars, the consensus labelled as the file's own", () => {
    const html = markup(model);
    expect(html).toContain('Claude Review');
    expect(html).toContain('Consensus summary, as the file wrote it');
    expect(html).not.toContain('<details open');
    expect(html).not.toContain('Disagreements');
    expect(html).not.toContain('>Agreed<');
    expect(html).toContain('Concerns');
    expect(model.consensus?.blocks.length).toBeGreaterThan(0);
  });

  it('puts the header on the phase name, with the date, the plans and the reviewer count as meta', () => {
    const header = reviewsHeaderProps(model, 'Cross-AI Plan Review — Phase 1');
    expect(header.eyebrow).toBe('Phase 1 · Cross-AI reviews');
    expect(header.title).toBe('Member Sign-In & Sessions');
    expect(header.lead).toBeNull();
    const meta = renderToStaticMarkup(createElement('div', null, header.meta));
    expect(meta).toContain('Reviewed 2026-03-27');
    expect(meta).toContain('Plans 01-01');
    expect(meta).toContain('1 reviewer<');
  });

  it("falls back to the file's own title without a phase name", () => {
    const bare = composeFile(ONE)!;
    expect(reviewsHeaderProps(bare, 'Cross-AI Plan Review — Phase 1').title).toBe('Cross-AI Plan Review — Phase 1');
  });

  it('returns null with no projection, an empty one or no reviewer, so the promoted-section view stays', () => {
    expect(composeReviews(inputOf(undefined))).toBeNull();
    expect(composeReviews(inputOf({}))).toBeNull();
    expect(composeReviews(inputOf({ reviewers: [] }))).toBeNull();
  });
});
