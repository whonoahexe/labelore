// Phase 10 (10-20, VIEW-12): the EVAL-REVIEW.md handler and extractor. It reads the score and verdict as the file writes
// them, the Dimension Coverage and Infrastructure Audit tables, the Remediation Plan groups and the Critical Gaps into
// `structured.evalReview`, on the made-up Lendshed eval reviews (04 needs work, 03 not implemented) (VIEW-21). Nothing
// is recomputed: the file's numbers and words come through as written.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { EvalReviewHandler, extractEvalReview } from '../src/planning-repo/handlers/eval-review.ts';
import type { EvalReviewBody } from '../src/planning-repo/handlers/eval-review.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const PATH = '.planning/phases/04-bulk-loan-export/04-EVAL-REVIEW.md';

function ref(path: string = PATH): ArtifactRef {
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

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

const NEEDS_WORK = fxRead('phases/04-bulk-loan-export/04-EVAL-REVIEW.md');
const NOT_IMPLEMENTED = fxRead('phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md');

describe('EvalReviewHandler', () => {
  it('claims an EVAL-REVIEW ref ahead of the generic handler, and no other review file', () => {
    expect(EvalReviewHandler.match(ref())).toBe(true);
    expect(EvalReviewHandler.match(ref('.planning/phases/04-bulk-loan-export/04-AI-SPEC.md'))).toBe(false);
    expect(EvalReviewHandler.match(ref('.planning/phases/04-bulk-loan-export/04-REVIEW.md'))).toBe(false);
    expect(EvalReviewHandler.match(ref('.planning/phases/04-bulk-loan-export/04-CONTEXT.md'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(EvalReviewHandler);
    expect(HANDLERS.indexOf(EvalReviewHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('carries the title, the body and the reading in structured.evalReview', () => {
    const result = EvalReviewHandler.parse(raw(NEEDS_WORK), ref());
    expect(result.title).toBe('EVAL-REVIEW — Phase 4: Bulk Loan Export');
    expect(result.body).toContain('## Dimension Coverage');
    expect((result.structured?.evalReview as EvalReviewBody).score).toEqual({ value: 64, max: 100 });
  });

  it('keeps the title, body and frontmatter when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/fenced-sections.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/fenced-sections.ts')>()),
      scanFencedLines: () => {
        throw new Error('boom');
      },
    }));
    const { EvalReviewHandler: Guarded } = await import('../src/planning-repo/handlers/eval-review.ts');
    const result = Guarded.parse(raw('---\nstatus: kept\n---\n\n# An eval review\n\nBody text.\n'), ref());
    expect(result.title).toBe('An eval review');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('kept');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/fenced-sections.ts');
  });
});

describe('extractEvalReview - 04-EVAL-REVIEW (needs work)', () => {
  const review = extractEvalReview(NEEDS_WORK);

  it('reads the head lines as written', () => {
    expect(review.auditDate).toBe('2026-04-14');
    expect(review.aiSpecPresent).toBe('Yes');
    expect(review.score).toEqual({ value: 64, max: 100 });
    expect(review.verdict).toBe('NEEDS WORK');
  });

  it('reads the five dimensions with the file words, measurement and finding', () => {
    expect(review.dimensions.map((d) => [d.name, d.status, d.measurement])).toEqual([
      ['Totals match', 'COVERED', 'Code'],
      ['No member names', 'COVERED', 'Code'],
      ['Draft shown before fetch', 'COVERED', 'Code'],
      ['Neutral tone', 'PARTIAL', 'LLM Judge'],
      ['Usable as sent', 'MISSING', 'Human'],
    ]);
    expect(review.dimensions[4].finding).toMatch(/^AI-SPEC asks the steward lead/);
    expect(review.coverageScoreLine).toBe('3/5 (60%)');
  });

  it('reads the five infrastructure components with the file words', () => {
    expect(review.infrastructure.map((c) => [c.component, c.status])).toEqual([
      ['Eval tooling (Vitest)', 'Installed'],
      ['Reference dataset', 'Partial'],
      ['CI/CD integration', 'Present'],
      ['Online guardrails', 'Implemented'],
      ['Tracing', 'Not found'],
    ]);
    expect(review.infrastructureScoreLine).toBe('70/100');
  });

  it('reads the three remediation groups in file order, steps without their numbers', () => {
    expect(review.remediation.map((g) => [g.group, g.heading, g.steps.length])).toEqual([
      ['must', 'Must fix before production', 2],
      ['should', 'Should fix soon', 3],
      ['nice', 'Nice to have', 2],
    ]);
    expect(review.remediation[0].steps[0]).toMatch(/^\*\*Usable as sent:\*\* add a labelling sheet/);
    expect(review.remediation[1].steps[2]).toMatch(/^Pin the judge model name/);
  });

  it('reads the critical gaps lines', () => {
    expect(review.criticalGaps).toHaveLength(1);
    expect(review.criticalGaps[0]).toMatch(/^None\. The one MISSING dimension/);
  });
});

describe('extractEvalReview - 03-EVAL-REVIEW (not implemented)', () => {
  const review = extractEvalReview(NOT_IMPLEMENTED);

  it('reads 12 of 100, NOT IMPLEMENTED and AI-SPEC Present as the file wrote them', () => {
    expect(review.score).toEqual({ value: 12, max: 100 });
    expect(review.verdict).toBe('NOT IMPLEMENTED');
    expect(review.aiSpecPresent).toBe('No');
  });

  it('reads four dimensions all MISSING and five components', () => {
    expect(review.dimensions.map((d) => d.status)).toEqual(['MISSING', 'MISSING', 'MISSING', 'MISSING']);
    expect(review.infrastructure.map((c) => c.status)).toEqual([
      'Not found',
      'Partial',
      'Partial',
      'Partial',
      'Not configured',
    ]);
  });

  it('keeps the two empty groups as empty groups, in file order', () => {
    expect(review.remediation.map((g) => [g.heading, g.steps.length])).toEqual([
      ['Must fix before production', 3],
      ['Should fix soon', 0],
      ['Nice to have', 0],
    ]);
  });
});

describe('extractEvalReview - tolerance', () => {
  it('reads an empty body and a body with none of the template headings as nothing', () => {
    for (const body of ['', '# Notes\n\nSome words.\n\n## Ideas\n\n- one\n']) {
      const review = extractEvalReview(body);
      expect(review.score).toBeNull();
      expect(review.verdict).toBeNull();
      expect(review.dimensions).toEqual([]);
      expect(review.infrastructure).toEqual([]);
      expect(review.remediation).toEqual([]);
      expect(review.criticalGaps).toEqual([]);
    }
  });

  it('reads a score with no maximum, spaces and a decimal, and bold marks around the verdict', () => {
    expect(extractEvalReview('# T\n\n**Overall Score:** 64\n').score).toEqual({ value: 64, max: null });
    expect(extractEvalReview('# T\n\n**Overall Score:** 64.5 / 100\n').score).toEqual({ value: 64.5, max: 100 });
    expect(extractEvalReview('# T\n\n**Overall Score:** none yet\n').score).toBeNull();
    expect(extractEvalReview('# T\n\n**Verdict:** **NEEDS WORK**\n').verdict).toBe('NEEDS WORK');
    expect(extractEvalReview('# T\n\n**Verdict**: NEEDS WORK\n').verdict).toBe('NEEDS WORK');
  });

  it('finds the table columns by header text, whatever their order', () => {
    const body =
      '## Dimension Coverage\n\n| Finding | Measurement | Dimension | Status |\n|---|---|---|---|\n| why | Human | Fit | PARTIAL |\n';
    expect(extractEvalReview(body).dimensions).toEqual([
      { name: 'Fit', status: 'PARTIAL', measurement: 'Human', finding: 'why' },
    ]);
  });

  it('ignores a heading and a table inside a fenced block', () => {
    const body =
      '## Notes\n\n```\n## Dimension Coverage\n\n| Dimension | Status |\n|---|---|\n| Fake | COVERED |\n```\n';
    expect(extractEvalReview(body).dimensions).toEqual([]);
  });

  it('puts steps under no ### heading in one group called Steps, and folds an indented line into its step', () => {
    const body = '## Remediation Plan\n\n1. First step\n   continues here\n2. Second step\n';
    const review = extractEvalReview(body);
    expect(review.remediation).toEqual([
      { group: 'other', heading: 'Steps', steps: ['First step continues here', 'Second step'] },
    ]);
  });
});

describe('extractEvalReview - caps and growth (T-10-36)', () => {
  function table(rows: number): string {
    const lines = ['## Dimension Coverage', '', '| Dimension | Status | Measurement | Finding |', '|---|---|---|---|'];
    for (let i = 0; i < rows; i += 1) lines.push(`| Row ${i} | COVERED | Code | finding ${i} |`);
    return lines.join('\n');
  }

  it('keeps at most 100 rows of a table, 100 steps and 2,000 characters of a cell', () => {
    expect(extractEvalReview(table(10_000)).dimensions).toHaveLength(100);
    const steps = ['## Remediation Plan', '', '### Must fix', ''];
    for (let i = 0; i < 500; i += 1) steps.push(`${i + 1}. step ${i}`);
    const review = extractEvalReview(steps.join('\n'));
    expect(review.remediation[0].steps).toHaveLength(100);
    const long = `${table(0)}\n| Big | COVERED | Code | ${'x'.repeat(200_000)} |`;
    expect(extractEvalReview(long).dimensions[0].finding).toHaveLength(2000);
  });

  it('stays linear in the number of rows and in the length of a finding', () => {
    const rows = measureGrowth<string>({
      make: (n) => table(Math.min(n, 100)).concat('\n', 'filler line\n'.repeat(n)),
      run: (body) => extractEvalReview(body),
    });
    expect(rows.ratio).toBeLessThan(GROWTH_LIMIT);
    const cell = measureGrowth<string>({
      make: (n) => `${table(0)}\n| Big | COVERED | Code | ${'a|b '.repeat(n)} |`,
      run: (body) => extractEvalReview(body),
    });
    expect(cell.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
