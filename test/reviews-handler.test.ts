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

const FOUR = fxRead('phases/04-bulk-loan-export/04-REVIEWS.md');

describe('extractReviews - 04-REVIEWS (three reviewers who disagree and a failed lane)', () => {
  const file = read(FOUR);

  it('reads four reviewers in file order: Claude, Codex (model unknown), OpenCode ok and Qwen failed', () => {
    expect(file.reviewers.map((r) => [r.name, r.status])).toEqual([
      ['Claude', 'ok'],
      ['Codex', 'ok'],
      ['OpenCode', 'ok'],
      ['Qwen', 'failed'],
    ]);
    expect(file.reviewers.map((r) => r.model)).toEqual([
      'example-model-a (reasoning=high)',
      'unknown',
      'example-model-b',
      'example-model-c',
    ]);
    expect(file.roster.find((r) => r.slug === 'codex')?.missing).toEqual(['04-03']);
  });

  it("keeps Codex's own '## 04-02' heading inside its body, so a reviewer's headings never split the page", () => {
    const codex = file.reviewers[1];
    expect(codex.text.startsWith('## 04-02')).toBe(true);
    expect(codex.planIds).toEqual(['04-02']);
    expect(file.reviewers[0].planIds).toEqual(['04-02', '04-03']);
    expect(file.reviewers.map((r) => r.name)).not.toContain('04-02');
  });

  it('does not treat the Plan-Revision Conflicts block as a reviewer, and keeps it as an unclaimed section', () => {
    expect(file.reviewers.some((r) => r.text.includes('REVISION_CONFLICT'))).toBe(false);
    expect(file.others).toHaveLength(1);
    expect(file.others[0].heading).toBe('Plan-Revision Conflicts');
    expect(file.others[0].text).toContain('REVISION_CONFLICT scope_reduction/04-02');
  });

  it('parses the Consensus Summary into its three lists and stops splitting there', () => {
    expect(file.consensus?.strengths).toHaveLength(2);
    expect(file.consensus?.concerns).toHaveLength(2);
    expect(file.consensus?.concerns[1]).toContain("The month walk's deadline is unnamed or untested");
    expect(file.consensus?.divergent).toHaveLength(2);
    expect(file.reviewers[3].text).not.toContain('Consensus Summary');
  });

  it("reads each reviewer's stated risk and verdicts: LOW, MEDIUM, HIGH; approve and revise on 04-03", () => {
    expect(file.reviewers.map((r) => r.risk)).toEqual(['LOW', 'MEDIUM', 'HIGH', null]);
    expect(file.reviewers[0].plans).toEqual([
      { planId: '04-02', risk: 'LOW', verdict: 'approve' },
      { planId: '04-03', risk: 'LOW', verdict: 'approve' },
    ]);
    expect(file.reviewers[2].plans.find((p) => p.planId === '04-03')?.verdict).toBe('revise');
  });

  it('reads the concern forms: bold with a colon, and a bare word with a colon under a plain Concerns line', () => {
    expect(file.reviewers[0].concerns).toHaveLength(4);
    expect(file.reviewers[1].concerns.map((c) => c.severity)).toEqual(['MEDIUM', 'MEDIUM', 'LOW']);
    expect(file.reviewers[2].concerns.map((c) => c.severity)).toEqual(['HIGH', 'MEDIUM', 'MEDIUM', 'HIGH', 'MEDIUM']);
  });

  it('marks the Qwen stub failed with no concern, and a budget-skipped stub skipped', () => {
    expect(file.reviewers[3].status).toBe('failed');
    expect(file.reviewers[3].concerns).toEqual([]);
    const skipped = read(
      '---\nreviewers: [claude, qwen]\n---\n\n# R\n\n## Claude Review\n\n## 01-01\n\n### Concerns\n- **LOW:** a thing\n\n## Qwen Review\n\nqwen review skipped: prompt budget (900 tokens) too small for the minimum review set.\n',
    );
    expect(skipped.reviewers.map((r) => r.status)).toEqual(['ok', 'skipped']);
  });
});

describe('extractReviews - odd shapes', () => {
  it('splits reviewers on "{Name} Review" and "{Name} Review ({instance})" headings, matching the roster by letters and digits', () => {
    const file = read(
      '---\nreviewers: [lm-studio, claude]\nmodels:\n  lm-studio: "local-a"\n  claude: 7\n---\n\n## LM Studio Review\n\n## 01-01\n\n### Concerns\n- **LOW:** x\n\n## Claude Review (second pass)\n\n## 01-01\n\n### Concerns\n- **LOW:** y\n',
    );
    expect(file.reviewers.map((r) => [r.name, r.instance, r.slug, r.model])).toEqual([
      ['LM Studio', null, 'lmstudio', 'local-a'],
      ['Claude', 'second pass', 'claude', null],
    ]);
  });

  it('turns a heading with no roster entry into a reviewer of its own, with no model', () => {
    const file = read('---\nreviewers: [claude]\n---\n\n## Gemini Review\n\n## 01-01\n\n### Concerns\n- **HIGH:** z\n');
    expect(file.reviewers.map((r) => [r.name, r.slug, r.model])).toEqual([['Gemini', null, null]]);
  });

  it('does not let a fenced "## X Review" line start a reviewer, nor a __proto__ name reach a prototype', () => {
    const file = read('---\nreviewers: [claude]\nmodels:\n  claude: "m"\n---\n\n## Claude Review\n\n```\n## Fake Review\n```\n\n## __proto__ Review\n\nbody\n');
    expect(file.reviewers.map((r) => r.name)).toEqual(['Claude', '__proto__']);
    expect(file.reviewers[1].model).toBeNull();
  });

  it('gives one reviewer carrying the whole text when no reviewer heading can be found', () => {
    const file = read('---\nreviewers: [claude]\n---\n\n# Review\n\nThe plan looks fine to me.\n\n- **LOW:** a nit\n');
    expect(file.reviewers).toHaveLength(1);
    expect(file.reviewers[0].name).toBe('Claude');
    expect(file.reviewers[0].text).toContain('The plan looks fine to me.');
    expect(file.consensus).toBeNull();
  });

  it('reads the reduced-weight tags', () => {
    const file = read(
      '---\nreviewers: [codex]\n---\n\n## Codex Review\n\n[reviewed-without-repo-access] [reviewed-without-source-citations]\n\n## 01-01\n\n### Concerns\n- **LOW:** a\n',
    );
    expect(file.reviewers[0].reduced).toBe(true);
    expect(file.reviewers[0].reducedWhy).toEqual(['no-repo-access', 'no-source-citations']);
  });

  it('reads a frontmatter date in UTC and a numeric plan id as text', () => {
    const file = read('---\nreviewers: [claude]\nreviewed_at: 2026-04-09\nplans_reviewed: [4]\n---\n\n## Claude Review\n\nbody\n');
    expect(file.reviewedAt).toBe('2026-04-09');
    expect(file.plansReviewed).toEqual(['4']);
  });

  it('does not count a severity word that opens a suggestion or a sentence', () => {
    const file = read('---\nreviewers: [claude]\n---\n\n## Claude Review\n\n## 01-01\n\n### Suggestions\n- Low-risk shortcuts exist here.\n- High: do it\n');
    expect(file.reviewers[0].concerns).toEqual([]);
  });
});
