// Phase 9, plan 05: the REVIEW-DISPOSITION body extractor, pinned against the made-up Lendshed
// disposition files (one per real shape), the tolerant degrade paths and the SEC-01 growth bound.
// Pinned values come from grep over the fixture files, independent of the extractor's output.
import { describe, expect, it } from 'vitest';
import { extractReviewDisposition } from '../src/planning-repo/handlers/review-disposition.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxRead } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

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

const HAND_P2 = 'phases/02-roles-and-permissions/02-REVIEW-DISPOSITION.md'; // five columns, capitalised values
const PAIR_V4 = 'milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-DISPOSITION.md'; // two columns, no frontmatter

describe('the hand-written disposition (Lendshed phase 2)', () => {
  const model = read(HAND_P2);
  const row = (id: string) => {
    const found = model.rows.find((r) => r.id === id);
    if (!found) throw new Error(`no row ${id}`);
    return found;
  };

  it('reads six rows from the table with the classes as written', () => {
    expect(model.source).toBe('table');
    expect(model.rows.map((r) => r.id)).toEqual(['CR-01', 'CR-02', 'WR-01', 'WR-02', 'WR-03', 'IN-01']);
    expect(model.rows.map((r) => r.disposition)).toEqual(['fixed', 'open', 'deferred', 'skipped', 'other', 'other']);
    expect(model.stated).toEqual({ open: null, total: null });
  });

  it('keeps Accepted and Wont-fix as other with their own words', () => {
    expect(row('WR-03').dispositionRaw).toBe('Accepted');
    expect(row('IN-01').dispositionRaw).toBe('Wont-fix');
  });

  it('keeps the notes, a dash being no note', () => {
    expect(row('WR-01').note).toBe('Waits for the capability list to move into code (phase 3)');
    expect(row('WR-02').note).toMatch(/^Revoked rows are the audit trail/);
    expect(row('CR-02').note).toBe('needs human check');
    expect(row('IN-01').note).toBeNull();
  });

  it('lower-cases the capitalised severities and takes titles from the Finding column', () => {
    expect(model.rows.map((r) => r.severity)).toEqual(['critical', 'critical', 'warning', 'warning', 'warning', 'info']);
    expect(row('WR-01').title).toBe('mayDo lowercases the stored capability but not the requested one');
  });
});

describe('the two-column disposition (archived Lendshed phase 4)', () => {
  const model = read(PAIR_V4);

  it('reads seven rows from a table with no frontmatter', () => {
    expect(model.source).toBe('table');
    expect(model.rows.map((r) => r.id)).toEqual(['CR-01', 'WR-01', 'WR-02', 'WR-03', 'WR-06', 'IN-01', 'IN-02']);
    expect(model.rows.map((r) => r.disposition)).toEqual(['fixed', 'fixed', 'fixed', 'fixed', 'fixed', 'deferred', 'open']);
  });

  it('keeps the whole cell as dispositionRaw and the text after the id as the title', () => {
    expect(model.rows[0].dispositionRaw).toBe('fixed (see 04-REVIEW-FIX.md)');
    expect(model.rows[0].title).toBe('The loan-log entry is stamped with the receiving shed, not the shed the tool left');
    expect(model.rows[5].dispositionRaw).toMatch(/^deferred: harmless/);
    expect(model.rows[5].title).toBe('legCount is computed and never read');
  });

  it('takes the severity from the id and finds no note column', () => {
    expect(model.rows.map((r) => r.severity)).toEqual(['critical', 'warning', 'warning', 'warning', 'warning', 'info', 'info']);
    expect(model.rows.every((r) => r.note === null)).toBe(true);
  });
});

describe('extractReviewDisposition degrade paths', () => {
  const table =
    '| Finding | Severity | Disposition | Source |\n|---|---|---|---|\n| CR-01 | critical | fixed | 01-REVIEW-FIX.md |\n| not an id | info | open | - |\n| IN-01 | info | open | - |\n';

  it('gives source none and no rows for a file with no findings and no table', () => {
    const model = extractReviewDisposition({}, '# Nothing here\n\nJust prose, no | table.\n');
    expect(model).toEqual({ source: 'none', rows: [], stated: { open: null, total: null } });
  });

  it('keeps the table rows when the frontmatter is unparseable', () => {
    const parsed = tryParseFrontmatter(`---\nfindings: [unclosed\n  - : :\n---\n\n${table}`);
    const model = extractReviewDisposition(parsed.data, parsed.body);
    expect(model.source).toBe('table');
    expect(model.rows.map((r) => r.id)).toEqual(['CR-01', 'IN-01']);
  });

  it('drops a row with no readable finding id', () => {
    const model = extractReviewDisposition({}, table);
    expect(model.rows.map((r) => r.id)).toEqual(['CR-01', 'IN-01']);
    expect(model.rows[0].note).toBe('01-REVIEW-FIX.md');
  });

  it('ignores a table whose header names no disposition column', () => {
    const model = extractReviewDisposition({}, '| Finding | Severity |\n|---|---|\n| CR-01 | critical |\n');
    expect(model.source).toBe('none');
  });

  it('skips a table inside a fence and takes the next one', () => {
    const body = `\`\`\`\n${table}\`\`\`\n\n| ID | Disposition |\n|---|---|\n| WR-09 | Fixed |\n`;
    expect(extractReviewDisposition({}, body).rows.map((r) => r.id)).toEqual(['WR-09']);
  });

  it('reads an escaped pipe inside a cell as text', () => {
    const body = '| ID | Finding | Disposition |\n|---|---|---|\n| WR-01 | a \\| b | Fixed |\n';
    const model = extractReviewDisposition({}, body);
    expect(model.rows[0].title).toBe('a | b');
    expect(model.rows[0].disposition).toBe('fixed');
  });

  it('does not throw on non-string and odd inputs', () => {
    expect(() => extractReviewDisposition({ findings: [{ id: 'WR-01', disposition: 5, title: 7 }] }, '')).not.toThrow();
    expect(() => extractReviewDisposition({}, undefined as unknown as string)).not.toThrow();
    expect(() => extractReviewDisposition(null as unknown as Record<string, unknown>, '|')).not.toThrow();
  });
});

describe('extractReviewDisposition growth', () => {
  it('reads thousands of table rows and header-like lines in time that grows linearly', () => {
    const growth = measureGrowth({
      make: (n) => {
        const noise = Array.from({ length: Math.max(1, Math.floor(n / 30)) }, () => '| a | b |\n| c | d |\n').join('');
        const rows = Array.from({ length: Math.max(1, Math.floor(n / 60)) }, (_, i) => `| WR-${String((i % 9999) + 1).padStart(2, '0')} | warning | open | - |\n`).join('');
        return `${noise}\n| Finding | Severity | Disposition | Source |\n|---|---|---|---|\n${rows}`;
      },
      run: (body) => {
        if (extractReviewDisposition({}, body).rows.length < 1) throw new Error('the table rows were lost');
      },
      maxSize: 1 << 17,
    });
    expect(growth.ratio, `table scan: ${growth.t1.toFixed(2)}ms at ${growth.n}, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
  });

  it('reads 5,000 table rows and 5,000 frontmatter findings within the row cap', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => `| WR-${String((i % 9999) + 1).padStart(4, '0')} | warning | open | - |`).join('\n');
    const findings = Array.from({ length: 5000 }, (_, i) => ({ id: `WR-${i + 1}`, disposition: 'open' }));
    const body = `| Finding | Severity | Disposition | Source |\n|---|---|---|---|\n${rows}\n`;
    expect(extractReviewDisposition({}, body).rows).toHaveLength(500);
    expect(extractReviewDisposition({ findings }, body).rows).toHaveLength(500);
  });

  it('reads one 200k-character cell in the time of a cell cut at the line cap', () => {
    const doc = (n: number) => `| Finding | Disposition |\n|---|---|\n| WR-01: ${'x|'.repeat(n / 2)} | open |\n| ${'AB-'.repeat(n / 3)} | open |\n| IN-02: t | fixed |\n`;
    const started = performance.now();
    extractReviewDisposition({}, doc(8000));
    const capMs = performance.now() - started;
    const big = performance.now();
    const model = extractReviewDisposition({}, doc(200_000));
    const bigMs = performance.now() - big;
    expect(model.rows.map((r) => r.id)).toContain('IN-02');
    for (const row of model.rows) expect((row.title ?? '').length).toBeLessThanOrEqual(400);
    // The 25x longer line is cut to the same cap first, so the cost stays flat rather than growing 25x.
    expect(bigMs).toBeLessThan(Math.max(capMs * 24, 50));
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
