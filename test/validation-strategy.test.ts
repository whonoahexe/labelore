// quick-261003-526 (V526-01, V526-10): extractValidationStrategy over the made-up Lendshed VALIDATION
// files (read through fxPath, which throws on a missing file), the dense fixture, degenerate input and the
// T-526-01 growth guard. Every pinned number below was counted in the Lendshed file itself with grep/awk,
// never copied from the extractor. The corpus pins live in test/web/validation-strategy-corpus.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fxPath } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { extractValidationStrategy } from '../src/planning-repo/handlers/validation-strategy.ts';
import type { ValidationStrategy } from '../src/planning-repo/handlers/validation-strategy.ts';

const DENSE = new URL(
  '../fixtures/dense/.planning/phases/01-identity-slice/01-VALIDATION.md',
  import.meta.url,
).pathname;
const FX1 = fxPath('phases/01-member-sign-in-sessions/01-VALIDATION.md');
const FX2 = fxPath('phases/02-roles-and-permissions/02-VALIDATION.md');
const FX4 = fxPath('phases/04-bulk-loan-export/04-VALIDATION.md');
const V102 = fxPath('milestones/v1.0-phases/02-shed-inventory-health/02-VALIDATION.md');
const V103 = fxPath('milestones/v1.0-phases/03-catalogue-browsing/03-VALIDATION.md');
const V104 = fxPath('milestones/v1.0-phases/04-shed-to-shed-transfers/04-VALIDATION.md');

function strategyOf(path: string): ValidationStrategy {
  return extractValidationStrategy(tryParseFrontmatter(readFileSync(path, 'utf8')).body);
}

describe('extractValidationStrategy — Lendshed phase 2 (15 pending tasks)', () => {
  const s = strategyOf(FX2);

  it('reads the map with its rows normalised', () => {
    const map = s.map;
    expect(map?.heading).toBe('Per-Task Verification Map');
    expect(map?.rows).toHaveLength(15);
    expect(map?.template).toBe(false);
    expect(map?.legend).toHaveLength(1);
    expect(map?.legend[0]).toContain('Status:');
    const row = map?.rows[1];
    expect(row).toMatchObject({
      id: '2-01-02',
      plan: '01',
      wave: '1',
      requirements: ['ROLE-03', 'ROLE-06', 'ROLE-02', 'ROLE-05'],
      threats: ['T-02-31…T-02-34', 'T-02-37'],
      testKind: 'integration',
      fileKind: 'create',
      fileNote: 'W0',
      status: 'pending',
    });
    const first = map?.rows[0];
    expect(first?.testKind).toBe('manual');
    expect(first?.behavior).toContain('N/A — `checkpoint:decision`');
  });

  it('reads the infrastructure, sampling, Wave 0, manual rows and sign-off', () => {
    expect(s.infra?.rows).toHaveLength(5);
    expect(s.sampling?.steps).toHaveLength(4);
    const last = s.sampling?.steps[3];
    expect(last?.when).toBe('Max feedback latency');
    expect(last?.what).toBe('60 seconds');
    expect(s.wave0?.items).toHaveLength(7);
    expect(s.wave0?.items.every((i) => i.box && !i.checked)).toBe(true);
    expect(s.manual?.rows).toHaveLength(6);
    expect(s.manual?.rows.every((r) => r.observed === null && r.outcome === null)).toBe(true);
    expect(s.signoff?.items).toHaveLength(6);
    expect(s.signoff?.items.every((i) => i.checked)).toBe(true);
    expect(s.signoff?.approval?.startsWith('pending')).toBe(true);
    expect(s.extras).toEqual([]);
    expect(s.preamble).toBe(true);
  });
});

describe('extractValidationStrategy — Lendshed phase 4 (off-template)', () => {
  const s = strategyOf(FX4);

  it('derives plans, glyph kinds and the prerequisite column from a map without Plan / Status columns', () => {
    expect(s.map?.heading).toBe('Final Per-Task Verification Map');
    expect(s.map?.rows).toHaveLength(10);
    expect(s.map?.rows.every((r) => r.status === 'none')).toBe(true);
    const last = s.map?.rows[9];
    expect(last).toMatchObject({ id: '04-06-01', plan: '06', wave: '3' });
    expect(s.map?.rows.filter((r) => r.testKind === 'manual')).toHaveLength(3);
    expect(s.map?.rows.filter((r) => r.testKind === 'auto')).toHaveLength(7);
    expect(s.map?.rows.every((r) => r.prerequisite !== '')).toBe(true);
  });

  it('keeps a pipe inside a backtick span in one cell', () => {
    const quick = s.infra?.rows.find((r) => r.key === 'Quick');
    expect(quick?.value).toContain("-t 'export|download'");
  });

  it('reads sampling bullets with no label, the Wave 0 reconciliation and the Gate table', () => {
    expect(s.sampling?.steps.every((step) => step.when === null)).toBe(true);
    expect(s.wave0?.heading).toBe('Wave 0 Reconciliation');
    expect(s.wave0?.items).toHaveLength(6);
    expect(s.wave0?.items.every((i) => !i.box)).toBe(true);
    expect(s.wave0?.lead.length).toBeGreaterThan(0);
    expect(s.wave0?.tail.length).toBeGreaterThan(0);
    expect(s.manual?.rows).toHaveLength(3);
    expect(s.manual?.rows.every((r) => r.why === '')).toBe(true);
    expect(s.preamble).toBe(false);
  });
});

describe('extractValidationStrategy — Lendshed phase 1 (observed)', () => {
  const s = strategyOf(FX1);

  it('reads green rows, observed outcomes, the infrastructure prose and the notes after the map', () => {
    expect(s.map?.rows).toHaveLength(9);
    expect(s.map?.rows.filter((r) => r.status === 'green')).toHaveLength(8);
    expect(s.map?.rows.filter((r) => r.status === 'none')).toHaveLength(1);
    expect(s.map?.rows.every((r) => r.plan.length === 2)).toBe(true);
    expect(s.manual?.rows).toHaveLength(4);
    expect(s.manual?.rows.filter((r) => (r.observed ?? '').startsWith('✅'))).toHaveLength(3);
    expect(s.manual?.rows.filter((r) => (r.outcome ?? '').startsWith('**PASS'))).toHaveLength(3);
    expect(s.manual?.rows.filter((r) => (r.observed ?? '').includes('not observed'))).toHaveLength(1);
    expect(s.infra?.tail.length).toBeGreaterThan(0);
    expect(s.map?.notes).toHaveLength(2);
    expect(s.map?.legend).toHaveLength(1);
  });
});

describe('extractValidationStrategy — the template and mixed documents', () => {
  it('reads v1.0/02: a preface, and waves 0 / TBD / 5', () => {
    const s = strategyOf(V102);
    expect(s.map?.preface.length).toBeGreaterThan(0);
    expect([...new Set(s.map?.rows.map((r) => r.wave))]).toEqual(['0', 'TBD', '5']);
  });

  it('flags v1.0/03 and v1.0/04 as template-only maps', () => {
    expect(strategyOf(V103).map?.template).toBe(true);
    expect(strategyOf(V104).map?.template).toBe(true);
  });
});

describe('extractValidationStrategy — the dense fixture', () => {
  it('reads one green row, a plain Wave 0 bullet, prose-only manual checks and 5 of 6 sign-off', () => {
    const s = strategyOf(DENSE);
    expect(s.map?.rows).toHaveLength(1);
    expect(s.map?.rows[0].status).toBe('green');
    expect(s.wave0?.items).toHaveLength(1);
    expect(s.wave0?.items[0].box).toBe(false);
    expect(s.manual?.rows).toEqual([]);
    expect(s.manual?.prose?.length).toBeGreaterThan(0);
    expect(s.signoff?.items).toHaveLength(6);
    expect(s.signoff?.items.filter((i) => i.checked)).toHaveLength(5);
    expect(s.preamble).toBe(true);
  });
});

describe('extractValidationStrategy — degenerate input', () => {
  it('an empty body yields every section null and does not throw', () => {
    const s = extractValidationStrategy('');
    expect(s.infra).toBeNull();
    expect(s.sampling).toBeNull();
    expect(s.map).toBeNull();
    expect(s.wave0).toBeNull();
    expect(s.manual).toBeNull();
    expect(s.signoff).toBeNull();
    expect(s.extras).toEqual([]);
    expect(s.preamble).toBe(false);
  });

  it('a body with only a sign-off yields only the sign-off', () => {
    const s = extractValidationStrategy('## Validation Sign-Off\n\n- [x] one\n- [ ] two\n\n**Approval:** pending\n');
    expect(s.signoff?.items).toEqual([
      { text: 'one', checked: true },
      { text: 'two', checked: false },
    ]);
    expect(s.signoff?.approval).toBe('pending');
    expect(s.infra).toBeNull();
    expect(s.map).toBeNull();
    expect(s.manual).toBeNull();
  });

  it('an unclosed fence, a short row and a header without a separator do not throw', () => {
    const unclosed = extractValidationStrategy('## Wave 0 Requirements\n\n```\n- [ ] x\n');
    expect(unclosed.wave0).not.toBeNull();
    const short = extractValidationStrategy(
      '## Per-Task Verification Map\n\n| Task ID | Plan | Wave | Status |\n|---|---|---|---|\n| 1-01-01 | 01 |\n',
    );
    expect(short.map?.rows).toHaveLength(1);
    expect(short.map?.rows[0]).toMatchObject({ id: '1-01-01', plan: '01', wave: '', status: 'none' });
    const noSeparator = extractValidationStrategy('## Per-Task Verification Map\n\n| Task ID | Plan |\n| 1-01-01 | 01 |\n');
    expect(noSeparator.map).toBeNull();
    expect(noSeparator.extras.map((e) => e.heading)).toEqual(['Per-Task Verification Map']);
  });

  it('counts HTML comments and keeps a stray section as an extra', () => {
    const s = extractValidationStrategy('<!-- a -->\n## Notes\n\ntext <!-- b --> more\n');
    expect(s.commentCount).toBe(2);
    expect(s.extras.map((e) => e.heading)).toEqual(['Notes']);
    expect(s.sections).toEqual([{ heading: 'Notes', claimed: false }]);
  });

  // A fixed millisecond budget flakes under parallel load and proves nothing about the shape of the cost
  // (Pitfall 11, T-526-01). Each hostile shape is timed at size n and at 8n with measureGrowth: a linear
  // scanner reads about 8, a quadratic one about 64, and GROWTH_LIMIT sits between them. Inputs are built
  // in make(), outside the timed region, and the original 1 MB shape stays as a no-throw sentinel.
  const longLineBody = (size: number): string => {
    // One very long cell (a fifth of the size) plus short filler rows, the original 1 MB shape scaled.
    const header = '## Per-Task Verification Map\n\n| Task ID | Plan | Wave |\n|---|---|---|\n';
    const longRow = `| 1-01-01 | 01 | ${'x'.repeat(Math.max(1, Math.floor(size / 5)))} |\n`;
    const filler = '| 1-01-02 | 01 | 1 |\n'.repeat(Math.max(1, Math.floor((size * 4) / 5 / 21)));
    return `${header}${longRow}${filler}`;
  };

  const openersBody = (size: number): string => {
    // Unclosed comment openers and brace tokens: both tokens repeat k times ('<!-- ' is 5 characters, '{a' is 2).
    const k = Math.max(1, Math.floor(size / 7));
    return `${'<!-- '.repeat(k)}\n## Per-Task Verification Map\n\n| Task ID | Command |\n|---|---|\n| {N}-01 | ${'{a'.repeat(k)} |\n`;
  };

  it('a 1 MB body with one 200,000-character line grows no faster than linearly and never throws', () => {
    const body = `${'## Per-Task Verification Map\n\n| Task ID | Plan | Wave |\n|---|---|---|\n'}| 1-01-01 | 01 | ${'x'.repeat(200_000)} |\n${'| 1-01-02 | 01 | 1 |\n'.repeat(Math.floor(800_000 / 21))}`;
    expect(body.length).toBeGreaterThan(1_000_000);
    const s = extractValidationStrategy(body);
    expect(s.map).not.toBeNull();
    const growth = measureGrowth({ make: longLineBody, run: (input) => void extractValidationStrategy(input) });
    expect(
      growth.ratio,
      `long line: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });

  it('a body of unclosed comment openers and brace tokens grows no faster than linearly', () => {
    expect(() => extractValidationStrategy(openersBody(350_000))).not.toThrow();
    const growth = measureGrowth({ make: openersBody, run: (input) => void extractValidationStrategy(input) });
    expect(
      growth.ratio,
      `openers: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });
});
