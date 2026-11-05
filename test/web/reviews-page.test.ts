// Phase 10 (10-22, VIEW-12): the Cross-AI reviews composer and the static markup of its page (sketch 052 winner A "Overlap"),
// on the made-up Lendshed reviews (04 three reviewers who disagree and a failed lane, 01 one reviewer). The first screen says
// who raised which concern; what the reviewers agreed on and where they disagree is derived from their own text, best-effort,
// and a concern the page cannot match stays under its reviewer.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeReviews, normaliseConcern } from '../../src/web/views/reviews-page.ts';
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
    expect(html).not.toContain('>Agreed <');
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

const FOUR = fxRead('phases/04-bulk-loan-export/04-REVIEWS.md');

describe('normaliseConcern', () => {
  it('drops a leading severity word, however it is written', () => {
    expect(normaliseConcern('HIGH: the deadline is unnamed')).toBe('the deadline is unnamed');
    expect(normaliseConcern('**MEDIUM** the deadline is unnamed')).toBe('the deadline is unnamed');
    expect(normaliseConcern('**LOW:** the deadline is unnamed')).toBe('the deadline is unnamed');
    expect(normaliseConcern('- medium - the deadline is unnamed')).toBe('the deadline is unnamed');
  });

  it('drops a path:line citation, lower-cases, strips markdown and collapses spaces', () => {
    expect(normaliseConcern('**MEDIUM** Foo   Bar  src/x.ts:12')).toBe('foo bar');
    expect(normaliseConcern('Reads `Config.maxExportLoans` once, see `src/server/config.ts:41`, at startup')).toBe(
      'reads config.maxexportloans once, see at startup',
    );
    expect(normaliseConcern('the [month walk](http://x.test/a) is _unbounded_')).toBe('the month walk is unbounded');
  });

  it('keeps an identifier with underscores whole, and a word that only starts with a severity word', () => {
    expect(normaliseConcern('MAX_EXPORT_LOANS is read once')).toBe('max_export_loans is read once');
    expect(normaliseConcern('Lowering the cap is risky')).toBe('lowering the cap is risky');
    expect(normaliseConcern('highly coupled to the config')).toBe('highly coupled to the config');
  });

  it('is empty for a text that is only a severity word', () => {
    expect(normaliseConcern('**HIGH**')).toBe('');
    expect(normaliseConcern('   ')).toBe('');
  });
});

describe('composeReviews - 04-REVIEWS, three reviewers who disagree and a failed lane', () => {
  const model = composeFile(FOUR, 'Bulk Loan Export')!;
  const nameOf = (i: number): string => model.reviewers[i].name;

  it('draws the three substantive reviewers as circles, with Qwen apart and counted nowhere', () => {
    expect(model.reviewers.map((r) => [r.name, r.status, r.statusLabel])).toEqual([
      ['Claude', 'ok', null],
      ['Codex', 'ok', null],
      ['OpenCode', 'ok', null],
      ['Qwen', 'failed', 'Review failed'],
    ]);
    expect(model.layout).toBe('overlap');
    expect(model.drawn).toEqual([0, 1, 2]);
    expect(model.note).toBeNull();
    expect(model.grouped).toBe(true);
  });

  it("shows each reviewer's model verbatim, Codex's 'unknown' included, and its overall risk", () => {
    expect(model.reviewers.map((r) => r.model)).toEqual(['example-model-a (reasoning=high)', 'unknown', 'example-model-b', 'example-model-c']);
    expect(model.reviewers.map((r) => [r.risk, r.riskTone])).toEqual([
      ['LOW', 'quiet'],
      ['MEDIUM', 'in-flight'],
      ['HIGH', 'missing'],
      [null, null],
    ]);
  });

  it('shows what Codex did not reach as stated, and nothing for the lane that failed', () => {
    expect(model.reviewers[1].coverage).toEqual([
      { id: '04-02', done: true },
      { id: '04-03', done: false },
    ]);
    expect(model.reviewers[0].coverage.every((c) => c.done)).toBe(true);
    expect(model.reviewers[3].coverage).toEqual([]);
  });

  it('agrees exactly the two planted shared concerns, the deadline first with the higher severity', () => {
    expect(model.agreed.map((a) => [a.no, a.word, a.reviewers.map(nameOf), a.planId])).toEqual([
      ['A1', 'HIGH', ['Claude', 'Codex', 'OpenCode'], '04-02'],
      ['A2', 'MEDIUM', ['Claude', 'OpenCode'], '04-02'],
    ]);
    expect(model.agreed[0].tone).toBe('missing');
    expect(model.agreed[1].tone).toBe('in-flight');
  });

  it("says how each was matched: the deadline only through the file's own consensus, the cap by words and consensus", () => {
    expect(model.agreed[0].how).toBe('file');
    expect(model.agreed[1].how).toBe('both');
    expect(model.agreed[0].text).toBe("The month walk's deadline is unnamed or untested, so the timeout refusal is claimed but not shown");
    expect(model.agreed[0].concerns).toHaveLength(3);
  });

  it('keeps the seven other concerns under their reviewer, and never lists a concern twice', () => {
    expect(model.concerns).toHaveLength(12);
    expect(model.singles).toHaveLength(7);
    const inAgreed = model.agreed.flatMap((a) => a.concerns);
    expect(new Set([...inAgreed, ...model.singles]).size).toBe(12);
    expect(model.singles.map((id) => model.concerns[id].reviewer).sort()).toEqual([0, 0, 1, 1, 2, 2, 2]);
  });

  it('shows the overall-risk split and the approve-versus-revise split on 04-03, each with its reviewers and no merged verdict', () => {
    expect(model.disagreements.map((d) => d.title)).toEqual(['Overall risk', 'Verdict on 04-03']);
    const risk = model.disagreements[0];
    expect(risk.kind).toBe('risk');
    expect(risk.stances.map((s) => [nameOf(s.reviewer), s.value, s.tone])).toEqual([
      ['Claude', 'LOW', 'quiet'],
      ['Codex', 'MEDIUM', 'in-flight'],
      ['OpenCode', 'HIGH', 'missing'],
    ]);
    const verdict = model.disagreements[1];
    expect(verdict.kind).toBe('verdict');
    expect(verdict.stances.map((s) => [nameOf(s.reviewer), s.value])).toEqual([
      ['Claude', 'approve'],
      ['OpenCode', 'revise'],
    ]);
    expect(verdict.out.map((o) => [nameOf(o.reviewer), o.why])).toEqual([
      ['Codex', 'Not reviewed'],
      ['Qwen', 'Review failed'],
    ]);
    expect(Object.keys(model).filter((k) => k.toLowerCase().includes('verdict'))).toEqual([]);
  });

  it('puts Qwen in neither group: it is no agreed reviewer and no stance, only a hatched "Review failed" cell', () => {
    for (const a of model.agreed) expect(a.reviewers).not.toContain(3);
    for (const d of model.disagreements) {
      expect(d.stances.map((s) => s.reviewer)).not.toContain(3);
      expect(d.out.find((o) => o.reviewer === 3)?.why).toBe('Review failed');
    }
  });

  it('renders Agreed before Disagreements, the chip on each, the cards as the key and the consensus labelled as the file\'s own', () => {
    const html = markup(model);
    const at = (needle: string): number => html.indexOf(needle);
    expect(at('>Agreed <')).toBeGreaterThan(-1);
    expect(at('>Agreed <')).toBeLessThan(at('>Disagreements <'));
    expect(at('>Disagreements <')).toBeLessThan(at('Each review as written'));
    expect(html.split('Reviewers disagree').length - 1).toBe(2);
    expect(html).toContain('Overall risk: HIGH');
    expect(html).toContain('Review failed');
    expect(html).toContain('04-03 not reviewed');
    expect(html).toContain('Consensus summary, as the file wrote it');
    expect(html).toContain('view-reviews-draw');
  });
});

/** A reviewer's section: one plan, its concerns, optionally a verdict and a risk. */
function section(name: string, plan: string, concerns: readonly string[], extra = ''): string {
  return `## ${name} Review\n\n## ${plan}\n\n### Concerns\n${concerns.map((c) => `- ${c}`).join('\n')}\n${extra}\n`;
}

function fileOf(sections: readonly string[], head = '---\nreviewers: [a]\n---\n\n# Cross-AI Plan Review — Phase 9\n\n'): string {
  return `${head}${sections.join('\n')}`;
}

describe('composeReviews - what is never agreed', () => {
  it('does not agree two concerns that share only a severity word and no clause', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**HIGH:** the export drops duplicate rows silently']),
        section('Codex', '09-01', ['**HIGH:** nothing limits how long the sign-in request may run']),
      ]),
    )!;
    expect(model.agreed).toEqual([]);
    expect(model.singles).toHaveLength(2);
  });

  it('does not agree the same clause raised on different plans', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**HIGH:** the cap is read once at startup so a change needs a restart']),
        section('Codex', '09-02', ['**HIGH:** the cap is read once at startup so a change needs a restart']),
      ]),
    )!;
    expect(model.agreed).toEqual([]);
  });

  it('does not agree a clause too short to carry meaning', () => {
    const model = composeFile(
      fileOf([section('Claude', '09-01', ['**LOW:** no tests, anyway']), section('Codex', '09-01', ['**LOW:** no tests, either'])]),
    )!;
    expect(model.agreed).toEqual([]);
  });

  it('agrees the same opening clause on the same plan, with the higher severity, even worded differently after it', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**LOW:** the retry loop has no upper bound, which is fine for now']),
        section('Codex', '09-01', ['**HIGH:** The retry loop has no upper bound; a hung call spins forever']),
      ]),
    )!;
    expect(model.agreed).toHaveLength(1);
    expect(model.agreed[0].word).toBe('HIGH');
    expect(model.agreed[0].how).toBe('words');
    expect(model.agreed[0].reviewers).toEqual([0, 1]);
  });

  it('never counts a skipped lane, and a lone ok reviewer beside it has no groups', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**LOW:** the retry loop has no upper bound, ok']),
        '## Qwen Review\n\nqwen review skipped: prompt budget (900 tokens) too small for the minimum review set.\n',
      ]),
    )!;
    expect(model.reviewers[1].statusLabel).toBe('Review skipped');
    expect(model.grouped).toBe(false);
    expect(model.agreed).toEqual([]);
    expect(model.disagreements).toEqual([]);
  });

  it('makes no overall-risk disagreement when the reviewers state the same risk', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**LOW:** a b c d'], '\n### Risk Assessment\nLOW.\n'),
        section('Codex', '09-01', ['**LOW:** e f g h'], '\n### Risk Assessment\nLOW. Fine.\n'),
      ]),
    )!;
    expect(model.disagreements).toEqual([]);
  });

  it('makes no stance split between two approvals or between an approval and a word it cannot read', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**LOW:** a b c d'], '\n### Verdict\napprove\n'),
        section('Codex', '09-01', ['**LOW:** e f g h'], '\n### Verdict\nlooks good\n'),
        section('OpenCode', '09-01', ['**LOW:** i j k l'], '\n### Verdict\nmaybe, ask someone\n'),
      ]),
    )!;
    expect(model.disagreements).toEqual([]);
  });

  it('makes a stance split between approve words and revise words in other phrasings', () => {
    const model = composeFile(
      fileOf([
        section('Claude', '09-01', ['**LOW:** a b c d'], '\n### Verdict\nLGTM, ship it\n'),
        section('Codex', '09-01', ['**LOW:** e f g h'], '\n### Verdict\nDo not ship until the cap is fixed.\n'),
      ]),
    )!;
    expect(model.disagreements.map((d) => d.title)).toEqual(['Verdict on 09-01']);
    expect(model.disagreements[0].stances.map((s) => s.value)).toEqual(['LGTM, ship it', 'Do not ship until the cap is fixed.']);
  });
});

describe('composeReviews - four or more reviewers, and a file that cannot be split', () => {
  const concern = '**MEDIUM:** the queue is drained in one transaction so a long drain holds the lock';
  const four = fileOf([
    section('Claude', '09-01', [concern]),
    section('Codex', '09-01', [concern]),
    section('OpenCode', '09-01', [concern, '**LOW:** only opencode noticed the unused flag']),
    section('Gemini', '09-01', [concern]),
  ]);

  it('draws no circles: the roster layout shows the cards and the Agreed list, each row naming its reviewers, and says so in one line', () => {
    const model = composeFile(four)!;
    expect(model.layout).toBe('roster');
    expect(model.drawn).toEqual([]);
    expect(model.note).toBe('More than three reviewers took part, so the overlap is not drawn. Each row names its reviewers.');
    expect(model.agreed).toHaveLength(1);
    expect(model.agreed[0].reviewers).toEqual([0, 1, 2, 3]);
    const html = markup(model);
    expect(html).not.toContain('view-reviews-draw');
    expect(html).toContain('More than three reviewers took part');
    expect(html).toContain('Claude, Codex, OpenCode, Gemini');
    expect(html).toContain('Raised by one reviewer');
    expect(html).toContain('only opencode noticed the unused flag');
  });

  it('gives one card with the whole text and no groups when the reviewer headings cannot be found', () => {
    const model = composeFile('---\nreviewers: [claude]\n---\n\n# Review\n\nThe plan looks fine to me. It reads well.\n')!;
    expect(model.reviewers).toHaveLength(1);
    expect(model.grouped).toBe(false);
    expect(model.agreed).toEqual([]);
    expect(model.disagreements).toEqual([]);
    expect(model.layout).toBe('roster');
    const html = markup(model);
    expect(html).toContain('Claude');
    expect(html).not.toContain('Disagreements');
  });
});
