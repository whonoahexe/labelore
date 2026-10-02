// quick-261003-526 (V526-01, V526-10): extractValidationStrategy over real corpus documents (a
// missing studio-portal checkout skips its files), degenerate input and the T-526-01 timing guard.
// The corpus pins live in test/web/validation-strategy-corpus.test.ts.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { extractValidationStrategy } from '../src/planning-repo/handlers/validation-strategy.ts';
import type { ValidationStrategy } from '../src/planning-repo/handlers/validation-strategy.ts';

const DENSE = new URL(
  '../fixtures/dense/.planning/phases/01-identity-slice/01-VALIDATION.md',
  import.meta.url,
).pathname;
const SP2 = `${SP_PLANNING}/phases/02-roles-permission-enforcement/02-VALIDATION.md`;
const SP1 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-VALIDATION.md`;
const SP4 = `${SP_PLANNING}/phases/04-bulk-archive-downloads/04-VALIDATION.md`;
const V102 = `${SP_PLANNING}/milestones/v1.0-phases/02-storage-health-status/02-VALIDATION.md`;
const V103 = `${SP_PLANNING}/milestones/v1.0-phases/03-file-browsing/03-VALIDATION.md`;
const V104 = `${SP_PLANNING}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-VALIDATION.md`;
const hasSp = existsSync(SP_PLANNING);

function strategyOf(path: string): ValidationStrategy {
  return extractValidationStrategy(tryParseFrontmatter(readFileSync(path, 'utf8')).body);
}

describe.runIf(hasSp)('extractValidationStrategy — studio-portal phase 2 (33 pending tasks)', () => {
  const s = strategyOf(SP2);

  it('reads the map with its rows normalised', () => {
    const map = s.map;
    expect(map?.heading).toBe('Per-Task Verification Map');
    expect(map?.rows).toHaveLength(33);
    expect(map?.template).toBe(false);
    expect(map?.legend).toHaveLength(1);
    expect(map?.legend[0]).toContain('Status:');
    const row = map?.rows[1];
    expect(row).toMatchObject({
      id: '2-01-02',
      plan: '01',
      wave: '1',
      requirements: ['ROLE-03', 'ROLE-07', 'ROLE-02', 'HARDEN-02'],
      threats: ['T-02-01…T-02-04', 'T-02-07'],
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
    expect(last?.what).toBe('90 seconds');
    expect(s.wave0?.items).toHaveLength(9);
    expect(s.wave0?.items.every((i) => i.box && !i.checked)).toBe(true);
    expect(s.manual?.rows).toHaveLength(11);
    expect(s.manual?.rows.every((r) => r.observed === null && r.outcome === null)).toBe(true);
    expect(s.signoff?.items).toHaveLength(6);
    expect(s.signoff?.items.every((i) => i.checked)).toBe(true);
    expect(s.signoff?.approval?.startsWith('pending')).toBe(true);
    expect(s.extras).toEqual([]);
    expect(s.preamble).toBe(true);
  });
});

describe.runIf(hasSp)('extractValidationStrategy — studio-portal phase 4 (off-template)', () => {
  const s = strategyOf(SP4);

  it('derives plans, glyph kinds and the prerequisite column from a map without Plan / Status columns', () => {
    expect(s.map?.heading).toBe('Final Per-Task Verification Map');
    expect(s.map?.rows).toHaveLength(15);
    expect(s.map?.rows.every((r) => r.status === 'none')).toBe(true);
    const last = s.map?.rows[14];
    expect(last).toMatchObject({ id: '04-07-01', plan: '07', wave: '4' });
    expect(s.map?.rows.filter((r) => r.testKind === 'manual')).toHaveLength(3);
    expect(s.map?.rows.filter((r) => r.testKind === 'auto')).toHaveLength(12);
    expect(s.map?.rows.every((r) => r.prerequisite !== '')).toBe(true);
  });

  it('keeps a pipe inside a backtick span in one cell', () => {
    const quick = s.infra?.rows.find((r) => r.key === 'Quick');
    expect(quick?.value).toContain("--test-name-pattern='archive|download'");
  });

  it('reads sampling bullets with no label, the Wave 0 reconciliation and the Gate table', () => {
    expect(s.sampling?.steps.every((step) => step.when === null)).toBe(true);
    expect(s.wave0?.heading).toBe('Wave 0 Reconciliation');
    expect(s.wave0?.items).toHaveLength(8);
    expect(s.wave0?.items.every((i) => !i.box)).toBe(true);
    expect(s.wave0?.lead.length).toBeGreaterThan(0);
    expect(s.wave0?.tail.length).toBeGreaterThan(0);
    expect(s.manual?.rows).toHaveLength(3);
    expect(s.manual?.rows.every((r) => r.why === '')).toBe(true);
    expect(s.preamble).toBe(false);
  });
});

describe.runIf(hasSp)('extractValidationStrategy — studio-portal phase 1 (observed)', () => {
  const s = strategyOf(SP1);

  it('reads green rows, observed outcomes, the infrastructure prose and the notes after the map', () => {
    expect(s.map?.rows).toHaveLength(13);
    expect(s.map?.rows.filter((r) => r.status === 'green')).toHaveLength(12);
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

describe.runIf(hasSp)('extractValidationStrategy — the template and mixed documents', () => {
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

  it('a 1 MB body with one 200,000-character line extracts in under 250 ms', () => {
    const header = '## Per-Task Verification Map\n\n| Task ID | Plan | Wave |\n|---|---|---|\n';
    const longRow = `| 1-01-01 | 01 | ${'x'.repeat(200_000)} |\n`;
    const filler = '| 1-01-02 | 01 | 1 |\n'.repeat(Math.floor(800_000 / 21));
    const body = `${header}${longRow}${filler}`;
    expect(body.length).toBeGreaterThan(1_000_000);
    const started = performance.now();
    const s = extractValidationStrategy(body);
    expect(performance.now() - started).toBeLessThan(250);
    expect(s.map).not.toBeNull();
  });

  it('a body of unclosed comment openers and brace tokens stays fast', () => {
    const body = `${'<!-- '.repeat(50_000)}\n## Per-Task Verification Map\n\n| Task ID | Command |\n|---|---|\n| {N}-01 | ${'{a'.repeat(50_000)} |\n`;
    const started = performance.now();
    extractValidationStrategy(body);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
