import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildCoverageMatrix, type CoverageStatement } from '../../src/presentation/coverage.ts';

function row(key: string, text: string, requirementIds: string[] = []): CoverageStatement {
  return { key, text, requirementIds };
}

function identities(matrix: ReturnType<typeof buildCoverageMatrix>): string[] {
  return matrix.matches.map((match) => `${match.kind}:${match.truth.key}:${match.coverage.key}`);
}

describe('buildCoverageMatrix', () => {
  it('matches normalized exact text before inference', () => {
    const matrix = buildCoverageMatrix(
      [row('t1', 'Export selected files — safely.', ['DL-01'])],
      [
        row('c-infer', 'Export selected files safely and quickly.', ['DL-01']),
        row('c-exact', ' export selected files safely ', []),
      ],
    );

    expect(matrix.matches).toEqual([
      expect.objectContaining({
        kind: 'exact',
        score: 1,
        truth: expect.objectContaining({ key: 't1' }),
        coverage: expect.objectContaining({ key: 'c-exact' }),
      }),
    ]);
    expect(matrix.unmatchedCoverage.map((item) => item.key)).toEqual(['c-infer']);
  });

  it('requires textual evidence even when requirement IDs overlap', () => {
    const matrix = buildCoverageMatrix(
      [row('t1', 'Focus returns to the exact trigger after dismissal.', ['NAV-03'])],
      [row('c1', 'Archived milestones remain browsable in their own tree.', ['NAV-03'])],
    );

    expect(matrix.matches).toEqual([]);
    expect(matrix.unmatchedTruths.map((item) => item.key)).toEqual(['t1']);
    expect(matrix.unmatchedCoverage.map((item) => item.key)).toEqual(['c1']);
  });

  it('allows ID-less rows to infer through the same Jaccard threshold', () => {
    const matrix = buildCoverageMatrix(
      [row('t1', 'archive download selection preserves frozen paths')],
      [row('c1', 'Archive download selection preserves the frozen paths exactly')],
    );

    expect(matrix.matches).toEqual([
      expect.objectContaining({
        kind: 'inferred',
        truth: { key: 't1', text: expect.any(String), requirementIds: [] },
        coverage: { key: 'c1', text: expect.any(String), requirementIds: [] },
      }),
    ]);
  });

  it('rejects otherwise strong text when both rows have disjoint IDs', () => {
    const matrix = buildCoverageMatrix(
      [row('t1', 'resolved references open a contextual preview first', ['NAV-02'])],
      [row('c1', 'resolved references open a contextual preview first for users', ['READ-05'])],
    );

    expect(matrix.matches).toEqual([]);
  });

  it('leaves equal-score ties and competing best candidates unmatched', () => {
    const tied = buildCoverageMatrix(
      [row('t1', 'alpha beta gamma delta', ['REQ-1'])],
      [
        row('c1', 'alpha beta gamma epsilon', ['REQ-1']),
        row('c2', 'alpha beta gamma zeta', ['REQ-1']),
      ],
    );
    const competing = buildCoverageMatrix(
      [
        row('t1', 'alpha beta gamma delta', ['REQ-1']),
        row('t2', 'alpha beta gamma delta epsilon', ['REQ-1']),
      ],
      [row('c1', 'alpha beta gamma delta epsilon zeta', ['REQ-1'])],
    );

    expect(tied.matches).toEqual([]);
    expect(tied.unmatchedCoverage).toHaveLength(2);
    expect(competing.matches).toEqual([]);
    expect(competing.unmatchedTruths).toHaveLength(2);
  });

  it('keeps pair identity stable when either input order changes', () => {
    const truths = [
      row('t-exact', 'Exact statement!', ['REQ-1']),
      row('t-infer', 'archive download selection preserves frozen paths', ['REQ-2']),
      row('t-miss', 'No corresponding evidence exists', ['REQ-3']),
    ];
    const coverage = [
      row('c-infer', 'Archive download selection preserves the frozen paths exactly', ['REQ-2']),
      row('c-exact', ' exact statement ', []),
      row('c-miss', 'Unrelated result remains visible', ['REQ-4']),
    ];

    const first = buildCoverageMatrix(truths, coverage);
    const reordered = buildCoverageMatrix([...truths].reverse(), [...coverage].reverse());

    expect(identities(reordered)).toEqual(identities(first));
    expect(reordered.unmatchedTruths.map((item) => item.key)).toEqual(['t-miss']);
    expect(reordered.unmatchedCoverage.map((item) => item.key)).toEqual(['c-miss']);
    expect(first.matches.length + first.unmatchedTruths.length).toBe(truths.length);
    expect(first.matches.length + first.unmatchedCoverage.length).toBe(coverage.length);
  });

  it('renders the matrix before both complete documents in the plan pair page', async () => {
    const source = await readFile('src/web/pages/plan-pair-page.tsx', 'utf8');

    expect(source.indexOf('coverage-matrix')).toBeLessThan(source.indexOf('plan-document'));
    expect(source.indexOf('plan-document')).toBeLessThan(source.indexOf('summary-document'));
    expect(source).toContain('<DocumentView document={pair.plan.document}');
    expect(source).toContain('<DocumentView document={pair.summary.document}');
    expect(source).toContain('document-overflow-boundary');
  });
});
