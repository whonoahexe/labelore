// Phase 9 (09-14): the milestone audit handler. It reads the audit shapes found on real projects - the
// frontmatter-heavy Lendshed audit, this repo's own, the dense fixture's prose-only audits and the old
// heading-and-one-sentence fixture - into `structured.audit`, frontmatter first.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { MilestoneAuditHandler, extractMilestoneAudit } from '../src/planning-repo/handlers/milestone-audit.ts';
import type { MilestoneAuditBody } from '../src/planning-repo/handlers/milestone-audit.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const PATH = '.planning/milestones/v1.0-MILESTONE-AUDIT.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'milestone-audit',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'milestone-root',
    phaseIdentity: null,
    milestoneVersion: 'v1.0',
    quickTaskId: null,
  };
}

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

function parse(content: string) {
  return MilestoneAuditHandler.parse(raw(content), ref());
}

function auditOf(content: string): MilestoneAuditBody {
  return parse(content).structured?.audit as MilestoneAuditBody;
}

function textOf(url: URL): string {
  return readFileSync(url, 'utf8');
}

const DENSE_V2 = new URL('../fixtures/dense/.planning/milestones/v2.0-MILESTONE-AUDIT.md', import.meta.url);
const OLD_SHAPE = new URL('./fixtures/dashboard/ledger/.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url);
const OWN_AUDIT = new URL('../.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url);

describe('MilestoneAuditHandler', () => {
  it('claims a milestone-audit ref ahead of the generic handler, and nothing else', () => {
    expect(MilestoneAuditHandler.match(ref())).toBe(true);
    expect(MilestoneAuditHandler.match({ ...ref(), kind: 'requirements' })).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(MilestoneAuditHandler);
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('reads the Lendshed audit verdict and date from frontmatter', () => {
    const result = parse(fxRead('milestones/v1.0-MILESTONE-AUDIT.md'));
    expect(result.warning).toBeUndefined();
    const audit = result.structured?.audit as MilestoneAuditBody;
    expect(audit.verdict).toEqual({ status: 'tech_debt', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-03-19');
    expect(audit.milestone).toBe('v1.0');
    expect(audit.milestoneName).toBe('Shed Basics');
    expect(audit.claimed).toEqual(['milestone', 'milestone_name', 'audited', 'status', 'scores', 'gaps', 'tech_debt', 'nyquist']);
  });

  it("reads the dense fixture's prose Status and Audited lines when there is no frontmatter", () => {
    const audit = auditOf(textOf(DENSE_V2));
    expect(audit.verdict).toEqual({ status: 'passed', raw: null, source: 'prose' });
    expect(audit.audited).toBe('2026-03-15');
    expect(audit.milestone).toBeNull();
    expect(audit.claimed).toEqual([]);
  });

  it('states no verdict for the heading-and-sentence fixture', () => {
    const result = parse(textOf(OLD_SHAPE));
    const audit = result.structured?.audit as MilestoneAuditBody;
    expect(audit.verdict).toEqual({ status: null, raw: null, source: null });
    expect(audit.audited).toBeNull();
    expect(result.title).toBe('v1.0 audit');
  });

  it("reads this repo's own v1.0 audit: passed, with an ISO audited date", () => {
    const audit = auditOf(textOf(OWN_AUDIT));
    expect(audit.verdict).toEqual({ status: 'passed', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-09-09');
  });

  it('reads the minimal frontmatter fixture', () => {
    const audit = auditOf(
      textOf(new URL('./fixtures/shapes/.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url)),
    );
    expect(audit.verdict).toEqual({ status: 'passed', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-04-22');
  });

  it('reads a prose status by its leading words', () => {
    const prose = (status: string) => auditOf(`**Status:** ${status}\n`).verdict;
    expect(prose('Tech debt - three items carried')).toEqual({ status: 'tech_debt', raw: null, source: 'prose' });
    expect(prose('`gaps_found`')).toEqual({ status: 'gaps_found', raw: null, source: 'prose' });
    expect(prose('Passed')).toEqual({ status: 'passed', raw: null, source: 'prose' });
  });

  it('never states a verdict the file does not: an unknown status keeps its own words', () => {
    expect(auditOf('---\nstatus: complete\n---\n\nBody\n').verdict).toEqual({
      status: null,
      raw: 'complete',
      source: 'frontmatter',
    });
    expect(auditOf('**Status:** Passedover\n').verdict).toEqual({ status: null, raw: 'Passedover', source: 'prose' });
    expect(auditOf('---\naudited: 2026-01-01\n---\n\nNo status here.\n').verdict).toEqual({
      status: null,
      raw: null,
      source: null,
    });
  });

  it('lets frontmatter win over a disagreeing Status line, and leaves the body untouched', () => {
    const content = '---\nstatus: gaps_found\naudited: 2026-02-02\n---\n\n# Audit\n\n**Status:** Passed\n**Audited:** 2025-01-01\n';
    const result = parse(content);
    const audit = result.structured?.audit as MilestoneAuditBody;
    expect(audit.verdict).toEqual({ status: 'gaps_found', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-02-02');
    expect(result.body).toContain('**Status:** Passed');
    expect(result.body).toContain('**Audited:** 2025-01-01');
  });

  it('keeps the title, body and frontmatter and omits the key when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/milestone-audit-body.ts', () => ({
      extractMilestoneAudit: () => {
        throw new Error('boom');
      },
    }));
    const { MilestoneAuditHandler: Guarded } = await import('../src/planning-repo/handlers/milestone-audit.ts');
    const result = Guarded.parse(raw('---\nstatus: passed\n---\n\n# An audit\n\nBody text.\n'), ref());
    expect(result.title).toBe('An audit');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('passed');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/milestone-audit-body.ts');
  });
});

function scoreOf(value: unknown) {
  return extractMilestoneAudit({ scores: { s: value } }, '').scores[0];
}

describe('extractMilestoneAudit - the Lendshed audit', () => {
  const audit = auditOf(fxRead('milestones/v1.0-MILESTONE-AUDIT.md'));

  it('reads the scores in the author order as n over m', () => {
    expect(audit.scores.map((score) => [score.key, score.n, score.m])).toEqual([
      ['requirements', 14, 15],
      ['phases', 4, 4],
      ['integration', 6, 6],
      ['flows', 4, 4],
    ]);
  });

  it('reads the object requirement gap with its evidence and leaves integration and flows empty', () => {
    expect(audit.gaps?.map((group) => [group.key, group.items.length])).toEqual([
      ['requirements', 1],
      ['integration', 0],
      ['flows', 0],
    ]);
    const gap = audit.gaps?.[0].items[0];
    expect(gap).toMatchObject({ id: 'MEMB-04', status: 'partial' });
    expect(gap?.text).toContain('contact preference');
    expect(gap?.evidence).toContain('the kiosk screen only offers it to stewards');
    expect(gap?.fields).toEqual([{ label: 'phase', value: '01-member-data-foundation' }]);
  });

  it('groups the tech debt by phase in file order and lifts the id and the status word', () => {
    expect(audit.techDebt?.map((group) => [group.phase, group.items.length])).toEqual([
      ['02-shed-inventory-health', 2],
      ['cross-phase (integration)', 1],
      ['04-shed-to-shed-transfers', 1],
    ]);
    const [first, second] = audit.techDebt?.[0].items ?? [];
    expect(first).toMatchObject({ id: 'INT-W1', status: 'deferred', closed: false });
    expect(first.text).toBe('a condition note that holds only whitespace saves as blank and shows no repair flag');
    expect(second).toMatchObject({ id: 'WR-03', status: 'advisory', closed: false });
    const long = audit.techDebt?.[1].items[0];
    expect(long?.id).toBeNull();
    expect(long?.status).toBe('deferred');
    expect((long?.text ?? '').length).toBeGreaterThan(400);
  });

  it('counts an object item with status closed as closed and keeps its other fields', () => {
    const closed = audit.techDebt?.[2].items[0];
    expect(closed).toMatchObject({ id: null, status: 'closed', closed: true });
    expect(closed?.text).toContain('loan log export');
    expect(closed?.fields).toEqual([{ label: 'closed_by', value: 'quick 260318-a4k, commit 91c3d2e' }]);
  });

  it('reads the Nyquist lists with YAML numbers zero-padded', () => {
    expect(audit.nyquist).toEqual({
      compliant: ['01', '03'],
      partial: ['02'],
      notValidated: [],
      missing: ['04'],
      overall: 'partial',
      reason: null,
    });
  });

  it('lists the key it does not claim', () => {
    expect(audit.extras).toEqual([
      { key: 'supersedes', rows: [{ label: '', value: 'the 2026-03-18 gaps_found audit of this same milestone' }] },
    ]);
  });
});

describe("extractMilestoneAudit - this repo's own audit", () => {
  const audit = auditOf(textOf(OWN_AUDIT));

  it('reads its four scores and three empty gap groups', () => {
    expect(audit.scores.map((score) => `${score.key} ${score.n}/${score.m}`)).toEqual([
      'requirements 45/45',
      'phases 4/4',
      'integration 7/7',
      'flows 7/7',
    ]);
    expect(audit.gaps?.map((group) => group.items.length)).toEqual([0, 0, 0]);
  });

  it('counts every object debt item closed and keeps closed_by as a field', () => {
    const items = (audit.techDebt ?? []).flatMap((group) => group.items);
    expect(items.length).toBeGreaterThan(10);
    expect(items.every((item) => item.closed && item.status === 'closed')).toBe(true);
    expect(items[0].fields.map((field) => field.label)).toEqual(['closed_by']);
  });

  it('lists previously_blocking_now_closed, tech_debt_reconciliation and supersedes as labelled rows', () => {
    const keys = audit.extras.map((extra) => extra.key);
    expect(keys).toEqual(['supersedes', 'previously_blocking_now_closed', 'tech_debt_reconciliation']);
    const blocking = audit.extras[1];
    expect(blocking.rows.map((row) => row.label)).toEqual(['TGT-08', 'FIND-04', 'ATT-01', 'ATT-02', 'FLOW-G', 'FLOW-B']);
    expect(audit.extras[2].rows.map((row) => row.label)).toContain('closed_count');
  });

  it('reads the Nyquist reason and overall though every list is empty', () => {
    expect(audit.nyquist?.overall).toBe('not_applicable');
    expect(audit.nyquist?.reason).toContain('workflow.nyquist_validation is false');
    expect(audit.nyquist?.compliant).toEqual([]);
  });
});

describe('extractMilestoneAudit - shapes without structure', () => {
  it('gives the prose-only shapes no scores, gaps, debt, Nyquist or extras', () => {
    for (const url of [DENSE_V2, OLD_SHAPE]) {
      const audit = auditOf(textOf(url));
      expect(audit.scores).toEqual([]);
      expect(audit.gaps).toBeNull();
      expect(audit.techDebt).toBeNull();
      expect(audit.nyquist).toBeNull();
      expect(audit.extras).toEqual([]);
    }
  });

  it('lists a claimed key whose value it cannot read instead of dropping it', () => {
    const audit = extractMilestoneAudit({ scores: 'good', gaps: ['one'], tech_debt: 5, nyquist: 'later' }, '');
    expect(audit.claimed).toEqual([]);
    expect(audit.extras.map((extra) => extra.key)).toEqual(['scores', 'gaps', 'tech_debt', 'nyquist']);
    expect(audit.extras[1].rows).toEqual([{ label: '1', value: 'one' }]);
  });

  it('keeps a flat list of debt strings under one named group', () => {
    const audit = extractMilestoneAudit({ tech_debt: ['AUTH-06: rotate the key (open)', 'plain note'] }, '');
    expect(audit.techDebt).toEqual([
      {
        phase: 'Not grouped by phase',
        items: [
          { id: 'AUTH-06', text: 'rotate the key', status: 'open', closed: false, fields: [] },
          { id: null, text: 'plain note', status: null, closed: false, fields: [] },
        ],
      },
    ]);
  });

  it('reads a debt map keyed by phase', () => {
    const audit = extractMilestoneAudit({ tech_debt: { '03-x': ['WR-01 (resolved)'] } }, '');
    expect(audit.techDebt?.[0]).toMatchObject({ phase: '03-x' });
    expect(audit.techDebt?.[0].items[0]).toMatchObject({ id: 'WR-01', status: 'resolved', closed: true });
  });
});

describe('extractMilestoneAudit - scores', () => {
  it('reads n over m, { n, m }, a percentage and a bare number', () => {
    expect(scoreOf('3/4')).toMatchObject({ n: 3, m: 4, percent: null });
    expect(scoreOf('3 of 4')).toMatchObject({ n: 3, m: 4 });
    expect(scoreOf({ n: 3, m: 4 })).toMatchObject({ n: 3, m: 4 });
    expect(scoreOf('75%')).toMatchObject({ n: null, m: null, percent: 75 });
    expect(scoreOf('12')).toMatchObject({ n: 12, m: null, percent: null });
    expect(scoreOf(12)).toMatchObject({ n: 12, m: null });
  });

  it('shows what it cannot read verbatim', () => {
    expect(scoreOf('about half')).toEqual({ key: 's', n: null, m: null, percent: null, raw: 'about half' });
    expect(scoreOf('3/x')).toMatchObject({ n: null, m: null, raw: '3/x' });
    expect(scoreOf({ n: 3 })).toMatchObject({ n: null, m: null, raw: 'n: 3' });
  });
});

describe('extractMilestoneAudit - Nyquist lists', () => {
  it('zero-pads numbers and keeps strings verbatim', () => {
    const audit = extractMilestoneAudit({ nyquist: { compliant_phases: [1, 4, '08'], missing_phases: [12, '2.1', 2.1] } }, '');
    expect(audit.nyquist?.compliant).toEqual(['01', '04', '08']);
    expect(audit.nyquist?.missing).toEqual(['12', '2.1', '2.1']);
  });
});

describe('extractMilestoneAudit - ids and statuses', () => {
  const debtOf = (item: string) =>
    extractMilestoneAudit({ tech_debt: [{ phase: 'p', items: [item] }] }, '').techDebt?.[0].items[0];

  it('lifts a leading audit id of capitals, a hyphen and capitals or digits', () => {
    expect(debtOf('INT-W1: text')?.id).toBe('INT-W1');
    expect(debtOf('AUTH-06 - text')).toMatchObject({ id: 'AUTH-06', text: 'text' });
    expect(debtOf('FLOW-G text')?.id).toBe('FLOW-G');
    expect(debtOf('HTTP-only mode')?.id).toBeNull();
    expect(debtOf('A-1 text')?.id).toBeNull();
    expect(debtOf('WR-0123456 text')?.id).toBeNull();
  });

  it('lifts the last parenthetical that is a status word, wherever it sits', () => {
    expect(debtOf('thing (skipped by design)')).toMatchObject({ text: 'thing', status: 'skipped by design' });
    expect(debtOf('a (note) thing (Deferred)')).toMatchObject({ text: 'a (note) thing', status: 'deferred' });
    expect(debtOf('thing (deferred) and more')).toMatchObject({ text: 'thing and more', status: 'deferred' });
    expect(debtOf('thing (deferred to v2)')).toMatchObject({ text: 'thing (deferred to v2)', status: null });
  });
});

describe('extractMilestoneAudit growth', () => {
  it('stays within the caps on 10,000 debt items and a 200k-character item', () => {
    const items = Array.from({ length: 10_000 }, (_, i) => `WR-${i % 100}: item ${i} (deferred)`);
    items[0] = 'x'.repeat(200_000);
    const audit = extractMilestoneAudit({ tech_debt: [{ phase: 'p', items }], notes: items }, '');
    expect(audit.techDebt?.[0].items).toHaveLength(200);
    expect(audit.techDebt?.[0].items[0].text).toHaveLength(2000);
    expect(audit.extras[0].rows.length).toBeLessThanOrEqual(50);
    expect(audit.extras[0].rows.every((row) => row.value.length <= 2000)).toBe(true);
  });

  it('caps groups, keys and scores', () => {
    const many = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, '1/2']));
    const audit = extractMilestoneAudit(
      {
        scores: many(500),
        gaps: many(500),
        tech_debt: Array.from({ length: 500 }, (_, i) => ({ phase: `p${i}`, items: ['a'] })),
        ...many(500),
      },
      '',
    );
    expect(audit.scores).toHaveLength(20);
    expect(audit.gaps).toHaveLength(20);
    expect(audit.techDebt).toHaveLength(100);
    expect(audit.extras.length).toBeLessThanOrEqual(50);
  });

  it('scans a long prose body no faster than linearly', () => {
    const growth = measureGrowth({
      make: (n) => 'some audit prose that holds neither label\n'.repeat(Math.max(1, Math.floor(n / 42))),
      run: (text) => {
        extractMilestoneAudit({ status: 'passed' }, text);
      },
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('is not quadratic on a body of a single very long line', () => {
    const growth = measureGrowth({
      make: (n) => 'x'.repeat(n),
      run: (text) => {
        extractMilestoneAudit({}, text);
      },
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
