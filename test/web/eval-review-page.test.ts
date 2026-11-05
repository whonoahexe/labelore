// Phase 10 (10-20, VIEW-12): the Eval review composer and the static markup of its page (sketch 050 winner B), on the
// made-up Lendshed eval reviews (04 needs work, 03 not implemented). The first screen says what the audit scored
// ("64 of 100"), GSD's verdict as a chip, and how the dimensions stand; the file's numbers and words are shown as
// written and never recomputed.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeEvalReview } from '../../src/web/views/eval-review-page.ts';
import type { ComposedEvalReview } from '../../src/web/views/eval-review-page.ts';
import {
  EvalReviewView,
  evalReviewHeaderProps,
  splitEvalReviewTitle,
} from '../../src/web/views/eval-review-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { EvalReviewHandler } from '../../src/planning-repo/handlers/eval-review.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const NEEDS_WORK = fxRead('phases/04-bulk-loan-export/04-EVAL-REVIEW.md');
const NOT_IMPLEMENTED = fxRead('phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md');
const PATH = '.planning/phases/04-x/04-EVAL-REVIEW.md';

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'eval-review',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

/** The page's section groups, the way the renderer makes them: one per `##` heading, the heading and what follows. */
function groupsOf(content: string): NonNullable<ViewInput['groups']> {
  const groups: NonNullable<ViewInput['groups']> = [];
  let current: { heading: string; lines: string[] } | null = null;
  const toGroup = (g: { heading: string; lines: string[] }, index: number) => ({
    id: `g-${index}`,
    heading: g.heading,
    html: `<h2>${g.heading}</h2><p>${g.lines.slice(1).join(' ').trim()}</p>`,
  });
  for (const line of content.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) groups.push(toGroup(current, groups.length));
      current = { heading: line.slice(3).trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) groups.push(toGroup(current, groups.length));
  return groups;
}

function inputOf(evalReview: unknown, groups: ViewInput['groups'] = []): ViewInput {
  return {
    kind: 'eval-review',
    frontmatter: {},
    structured: evalReview === undefined ? {} : { evalReview },
    groups,
    planSegments: [],
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, path = PATH): ComposedEvalReview | null {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = EvalReviewHandler.parse(raw, ref(path));
  return composeEvalReview(inputOf(parsed.structured?.evalReview, groupsOf(content)));
}

const renderHtml = (html: string) => createElement('section', { 'data-plain': 'true' }, `HTML:${html}`);

function markup(model: ComposedEvalReview): string {
  return renderToStaticMarkup(createElement(EvalReviewView, { model, renderHtml }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeEvalReview - 04-EVAL-REVIEW, needs work', () => {
  const model = composeFile(NEEDS_WORK)!;

  it('leads with 64 of 100 and NEEDS WORK as the in-flight verdict, both as the file wrote them', () => {
    expect(model.score).toBe('64 of 100');
    expect(model.verdict).toEqual({ word: 'NEEDS WORK', tone: 'in-flight' });
  });

  it('lists the five dimensions in file order with tone, label and measurement', () => {
    const rows = model.dimensions.map((id) => model.targets[id]);
    expect(rows.map((t) => [t.name, t.tone, t.word, t.measurement])).toEqual([
      ['Totals match', 'complete', 'Covered', 'Code'],
      ['No member names', 'complete', 'Covered', 'Code'],
      ['Draft shown before fetch', 'complete', 'Covered', 'Code'],
      ['Neutral tone', 'in-flight', 'Partial', 'LLM Judge'],
      ['Usable as sent', 'missing', 'Missing', 'Human'],
    ]);
  });

  it('counts the dimension rows by status: 3 covered, 1 partial, 1 missing', () => {
    expect(model.tally).toEqual({ covered: 3, partial: 1, missing: 1 });
    expect(model.tallyText).toBe('3 covered, 1 partial, 1 missing');
    expect(model.meter).toMatchObject({
      covered: 3,
      label: '3 of 5 dimensions covered',
      items: ['complete', 'complete', 'complete', 'in-flight', 'missing'],
    });
  });

  it("carries the file's own Coverage Score, Infrastructure Score and AI-SPEC Present as written", () => {
    expect(model.facts).toEqual([
      { key: 'Coverage Score', value: '3/5 (60%)' },
      { key: 'Infrastructure Score', value: '70/100' },
      { key: 'AI-SPEC present', value: 'Yes' },
    ]);
    expect(model.auditDate).toBe('2026-04-14');
  });
});

describe('Eval review page markup - 04-EVAL-REVIEW', () => {
  const model = composeFile(NEEDS_WORK)!;
  const out = markup(model);

  it('draws the score and the verdict chip first, in the ruled head', () => {
    expect(out.indexOf('64 of 100')).toBeGreaterThan(-1);
    expect(out.indexOf('64 of 100')).toBeLessThan(out.indexOf('view-eval-review-ledger'));
    expect(out).toMatch(/class="status-chip view-eval-review-verdict" data-tone="in-flight"[^>]*>.*NEEDS WORK/);
  });

  it('draws the tally over the shared status-meter, one square per dimension, as one image', () => {
    expect(out).toContain('<b>3</b> covered, <b>1</b> partial, <b>1</b> missing');
    expect(out).toContain('aria-label="3 of 5 dimensions covered"');
    const meter = out.slice(out.indexOf('status-meter-cells'), out.indexOf('view-eval-review-facts'));
    expect(meter.match(/data-tone="[a-z-]+"/g)).toEqual([
      'data-tone="complete"',
      'data-tone="complete"',
      'data-tone="complete"',
      'data-tone="in-flight"',
      'data-tone="missing"',
    ]);
  });

  it('draws one row per dimension, each a button with its square, label and measurement', () => {
    const rows = out.split('view-eval-review-row').length - 1;
    expect(rows).toBeGreaterThanOrEqual(5);
    expect(out).toContain('Draft shown before fetch');
    expect(out).toContain('>LLM Judge<');
    expect(out).toContain('>Covered<');
    expect(out).toContain('>Missing<');
  });

  it('draws the header override: eyebrow, the phase name as the h1, and the audit date', () => {
    expect(splitEvalReviewTitle('EVAL-REVIEW — Phase 4: Bulk Loan Export')).toEqual({
      phase: 'Phase 4',
      title: 'Bulk Loan Export',
    });
    const header = evalReviewHeaderProps(model, 'EVAL-REVIEW — Phase 4: Bulk Loan Export');
    expect(header.eyebrow).toBe('Phase 4 · Eval review');
    expect(header.title).toBe('Bulk Loan Export');
    expect(renderToStaticMarkup(createElement('div', null, header.meta))).toContain('Audited 2026-04-14');
    expect(evalReviewHeaderProps(model, 'Notes').eyebrow).toBe('Eval review');
    expect(count(out, '<h1')).toBe(0);
  });
});

describe('composeEvalReview - 03-EVAL-REVIEW, not implemented', () => {
  const model = composeFile(NOT_IMPLEMENTED)!;

  it('reads 12 of 100 and NOT IMPLEMENTED as the missing verdict', () => {
    expect(model.score).toBe('12 of 100');
    expect(model.verdict).toEqual({ word: 'NOT IMPLEMENTED', tone: 'missing' });
  });

  it('lists four dimensions, every one Missing', () => {
    expect(model.dimensions.map((id) => model.targets[id].tone)).toEqual(['missing', 'missing', 'missing', 'missing']);
    expect(model.tallyText).toBe('0 covered, 0 partial, 4 missing');
  });
});

describe('composeEvalReview - a file the page cannot shape', () => {
  it('composes nothing without a projection, or with one that holds no score, verdict, row or step', () => {
    expect(composeEvalReview(inputOf(undefined))).toBeNull();
    expect(composeFile('# Notes\n\nSome words.\n')).toBeNull();
  });
});
