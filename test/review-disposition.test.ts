// Phase 9, plan 05: the REVIEW-DISPOSITION body extractor, pinned against the made-up Lendshed
// disposition files (one per real shape), the tolerant degrade paths and the SEC-01 growth bound.
// Pinned values come from grep over the fixture files, independent of the extractor's output.
import { describe, expect, it } from 'vitest';
import { extractReviewDisposition } from '../src/planning-repo/handlers/review-disposition.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxRead } from './helpers/fixture-project.ts';

const TOOL_P1 = 'phases/01-member-sign-in-sessions/01-REVIEW-DISPOSITION.md'; // frontmatter findings + table

function read(rel: string) {
  const parsed = tryParseFrontmatter(fxRead(rel));
  return extractReviewDisposition(parsed.data, parsed.body);
}

describe('the tool-shape disposition (Lendshed phase 1)', () => {
  const model = read(TOOL_P1);

  it('reads six rows from the frontmatter, all open, exactly as written', () => {
    expect(model.source).toBe('frontmatter');
    expect(model.rows.map((r) => r.id)).toEqual(['CR-01', 'WR-01', 'IN-01', 'IN-02', 'IN-03', 'WR-02']);
    expect(model.rows.every((r) => r.disposition === 'open' && r.dispositionRaw === 'open')).toBe(true);
    expect(model.stated).toEqual({ open: 6, total: 6 });
  });

  it('takes severities from the field and titles from the frontmatter', () => {
    expect(model.rows.map((r) => r.severity)).toEqual(['critical', 'warning', 'info', 'info', 'info', 'warning']);
    expect(model.rows[0].title).toContain('Cookie signing');
    expect(model.rows[5].title).toMatch(/\(not in the current review\)$/);
  });

  it('takes each note from the table Source cell by id, a dash being no note', () => {
    expect(model.rows.map((r) => r.note)).toEqual([
      '01-REVIEW.md',
      '01-REVIEW.md',
      '01-REVIEW.md',
      '01-REVIEW.md',
      '01-REVIEW.md',
      null,
    ]);
  });
});

describe('extractReviewDisposition on small planted inputs', () => {
  it('maps blocker to critical and falls back to the id token for a missing severity', () => {
    const model = extractReviewDisposition(
      {
        findings: [
          { id: 'CR-01', severity: 'blocker', disposition: 'fixed', title: 'a' },
          { id: 'WR-07', disposition: 'Deferred (later)', title: 'b' },
          { id: 'ZZ-1', severity: 'huge', disposition: 'whatever', title: 'c' },
        ],
      },
      '',
    );
    expect(model.rows.map((r) => r.severity)).toEqual(['critical', 'warning', null]);
    expect(model.rows.map((r) => r.disposition)).toEqual(['fixed', 'deferred', 'other']);
    expect(model.rows[2].dispositionRaw).toBe('whatever');
  });

  it('skips a finding with no string id and reads no rows from a non-array', () => {
    expect(extractReviewDisposition({ findings: [{ id: 3 }, null, 'x', { id: 'IN-01' }] }, '').rows.map((r) => r.id)).toEqual(['IN-01']);
    expect(extractReviewDisposition({ findings: 'nope' }, '').source).toBe('none');
  });
});
