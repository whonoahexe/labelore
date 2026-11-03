// Phase 9 (09-14): the milestone audit composer. The verdict is the first thing on the page; an absent or
// unrecognised status never reads as Passed.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeMilestoneAudit, VERDICT_NOT_STATED } from '../../src/web/views/milestone-audit.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { MilestoneAuditHandler } from '../../src/planning-repo/handlers/milestone-audit.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

function inputOf(audit: unknown): ViewInput {
  return {
    kind: 'milestone-audit',
    frontmatter: {},
    structured: audit === undefined ? {} : { audit },
    groups: [],
    planSegments: [],
  };
}

function auditWith(patch: Record<string, unknown>): Record<string, unknown> {
  return {
    milestone: null,
    milestoneName: null,
    verdict: { status: null, raw: null, source: null },
    audited: null,
    claimed: [],
    ...patch,
  };
}

describe('composeMilestoneAudit - the verdict', () => {
  it('labels and tones each recognised verdict', () => {
    const cases: [string, string, string][] = [
      ['passed', 'Passed', 'complete'],
      ['tech_debt', 'Tech debt only', 'in-flight'],
      ['gaps_found', 'Gaps found', 'missing'],
    ];
    for (const [status, label, tone] of cases) {
      const model = composeMilestoneAudit(inputOf(auditWith({ verdict: { status, raw: null, source: 'frontmatter' } })));
      expect(model?.intro.verdict, status).toEqual({ label, tone });
    }
  });

  it('reads "Verdict not stated" in the quiet tone when the file states none', () => {
    const model = composeMilestoneAudit(inputOf(auditWith({})));
    expect(model?.intro.verdict).toEqual({ label: VERDICT_NOT_STATED, tone: 'quiet' });
    expect(VERDICT_NOT_STATED).toBe('Verdict not stated');
  });

  it('shows an unrecognised status verbatim in the quiet tone, never as Passed', () => {
    const model = composeMilestoneAudit(
      inputOf(auditWith({ verdict: { status: null, raw: 'complete with notes', source: 'frontmatter' } })),
    );
    expect(model?.intro.verdict).toEqual({ label: 'complete with notes', tone: 'quiet' });
  });

  it('does not take a status that is only a property name of the label table', () => {
    const model = composeMilestoneAudit(inputOf(auditWith({ verdict: { status: 'constructor', raw: null, source: 'prose' } })));
    expect(model?.intro.verdict).toEqual({ label: VERDICT_NOT_STATED, tone: 'quiet' });
  });
});

describe('composeMilestoneAudit - the cover', () => {
  it('uses the milestone name, else the version, else null for the page to fall back on', () => {
    expect(composeMilestoneAudit(inputOf(auditWith({ milestoneName: 'Shed Basics', milestone: 'v1.0' })))?.intro.title).toBe('Shed Basics');
    expect(composeMilestoneAudit(inputOf(auditWith({ milestone: 'v1.0' })))?.intro.title).toBe('v1.0');
    expect(composeMilestoneAudit(inputOf(auditWith({})))?.intro.title).toBeNull();
    expect(composeMilestoneAudit(inputOf(auditWith({})))?.intro.eyebrow).toBe('Milestone audit');
  });

  it('formats a date and shows anything else as written', () => {
    expect(composeMilestoneAudit(inputOf(auditWith({ audited: '2026-03-15' })))?.intro.audited).toBe('15 Mar 2026');
    expect(composeMilestoneAudit(inputOf(auditWith({ audited: 'last Tuesday' })))?.intro.audited).toBe('last Tuesday');
    expect(composeMilestoneAudit(inputOf(auditWith({})))?.intro.audited).toBeNull();
  });

  it('composes nothing without a projection, so the promoted-section view keeps the page', () => {
    expect(composeMilestoneAudit(inputOf(undefined))).toBeNull();
    expect(composeMilestoneAudit(inputOf('nope'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The sections, composed from what the handler really makes of each audit shape
// ---------------------------------------------------------------------------

const REF: ArtifactRef = {
  path: '.planning/milestones/v1.0-MILESTONE-AUDIT.md',
  kind: 'milestone-audit',
  fileClass: 'text',
  sizeBytes: 0,
  location: 'milestone-root',
  phaseIdentity: null,
  milestoneVersion: 'v1.0',
  quickTaskId: null,
};

function composeContent(content: string) {
  const raw: RawArtifact = { path: REF.path, content, mtimeMs: 0, size: content.length };
  const parsed = MilestoneAuditHandler.parse(raw, REF);
  return composeMilestoneAudit({
    kind: 'milestone-audit',
    frontmatter: parsed.frontmatter,
    structured: parsed.structured ?? {},
    groups: [],
    planSegments: [],
  });
}

function composeFrontmatterScores(scores: Record<string, unknown>) {
  const lines = Object.entries(scores).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`);
  return composeContent(`---\nstatus: passed\nscores:\n${lines.join('\n')}\n---\n\nBody\n`)?.scores ?? [];
}

describe('composeMilestoneAudit - the Lendshed audit', () => {
  const model = composeContent(fxRead('milestones/v1.0-MILESTONE-AUDIT.md'));

  it('leads with Tech debt only, Shed Basics and the audited date', () => {
    expect(model?.intro).toEqual({
      eyebrow: 'Milestone audit',
      title: 'Shed Basics',
      verdict: { label: 'Tech debt only', tone: 'in-flight' },
      audited: '19 Mar 2026',
    });
  });

  it('draws one segment per unit: a partial score is in-flight with its unmet unit missing', () => {
    const [requirements, phases] = model?.scores ?? [];
    expect(requirements).toMatchObject({ label: 'Requirements', value: '14/15', tone: 'in-flight', fill: null });
    expect(requirements.segments).toHaveLength(15);
    expect(requirements.segments?.filter((tone) => tone === 'in-flight')).toHaveLength(14);
    expect(requirements.segments?.[14]).toBe('missing');
    expect(phases).toMatchObject({ value: '4/4', tone: 'complete' });
    expect(phases.segments).toEqual(['complete', 'complete', 'complete', 'complete']);
  });

  it('shows the object requirement gap with its evidence and "No gaps" for the empty groups', () => {
    const [requirements, integration, flows] = model?.gaps ?? [];
    expect(requirements).toMatchObject({ label: 'Requirements', count: 1, tone: 'missing', emptyText: null });
    expect(requirements.items[0]).toMatchObject({ id: 'MEMB-04', status: 'partial', long: false, evidenceLong: true });
    expect(requirements.items[0].fields).toEqual([{ label: 'Phase', value: '01-member-data-foundation', long: false }]);
    for (const group of [integration, flows]) {
      expect(group).toMatchObject({ count: 0, tone: 'complete', emptyText: 'No gaps', items: [] });
    }
  });

  it('groups the debt by phase, counts the open items only and tells the closed one apart', () => {
    const debt = model?.debt;
    expect(debt?.heading).toBe('3 items across 3 phases');
    expect(debt?.closedNote).toBe('1 closed');
    expect(debt?.groups.map((group) => [group.number, group.name, group.count])).toEqual([
      ['02', 'shed-inventory-health', 2],
      [null, 'cross-phase (integration)', 1],
      ['04', 'shed-to-shed-transfers', 1],
    ]);
    const [first, second] = debt?.groups[0].items ?? [];
    expect(first).toMatchObject({ id: 'INT-W1', status: 'deferred', tone: 'quiet', closed: false });
    expect(second).toMatchObject({ id: 'WR-03', status: 'advisory', tone: 'quiet' });
    expect(debt?.groups[1].items[0]).toMatchObject({ status: 'deferred', long: true });
    expect(debt?.groups[2].items[0]).toMatchObject({ status: 'closed', tone: 'complete', closed: true });
    expect(debt?.groups[2].items[0].fields).toEqual([{ label: 'Closed by', value: 'quick 260318-a4k, commit 91c3d2e', long: false }]);
  });

  it('shows the Nyquist chips with their lists and the unclaimed key, with the narrative folded', () => {
    expect(model?.nyquist).toEqual({
      chips: [
        { key: 'compliant', label: 'Compliant', phases: '01, 03', tone: 'complete' },
        { key: 'partial', label: 'Partial', phases: '02', tone: 'in-flight' },
        { key: 'missing', label: 'Missing', phases: '04', tone: 'quiet' },
        { key: 'overall', label: 'Overall', phases: 'partial', tone: 'quiet' },
      ],
      reason: null,
    });
    expect(model?.extras).toEqual([
      {
        label: 'Supersedes',
        rows: [{ label: '', value: 'the 2026-03-18 gaps_found audit of this same milestone', long: false }],
      },
    ]);
    expect(model?.narrativeOpen).toBe(false);
  });
});

describe("composeMilestoneAudit - this repo's own audit", () => {
  const model = composeContent(readFileSync(new URL('../../.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url), 'utf8'));

  it('reads Passed with four full scores and three "No gaps" groups', () => {
    expect(model?.intro.verdict).toEqual({ label: 'Passed', tone: 'complete' });
    expect(model?.intro.audited).toBe('9 Sep 2026');
    expect(model?.scores?.map((score) => `${score.label} ${score.value} ${score.tone}`)).toEqual([
      'Requirements 45/45 complete',
      'Phases 4/4 complete',
      'Integration 7/7 complete',
      'Flows 7/7 complete',
    ]);
    expect(model?.scores?.[0].fill).toBe(100);
    expect(model?.scores?.[0].segments).toBeNull();
    expect(model?.gaps?.map((group) => group.emptyText)).toEqual(['No gaps', 'No gaps', 'No gaps']);
  });

  it('counts every closed debt item closed, outside the total', () => {
    expect(model?.debt?.heading).toMatch(/^0 items across \d+ phases$/);
    expect(model?.debt?.closedNote).toMatch(/^\d+ closed$/);
    expect((model?.debt?.groups ?? []).every((group) => group.items.every((item) => item.tone === 'complete'))).toBe(true);
  });

  it('lists the unclaimed keys as labelled rows and states the Nyquist reason', () => {
    expect(model?.extras.map((extra) => extra.label)).toEqual([
      'Supersedes',
      'Previously blocking now closed',
      'Tech debt reconciliation',
    ]);
    expect(model?.extras[1].rows[0]).toMatchObject({ label: 'TGT-08' });
    expect(model?.nyquist?.chips).toEqual([{ key: 'overall', label: 'Overall', phases: 'not applicable', tone: 'quiet' }]);
    expect(model?.nyquist?.reason).toContain('Section skipped');
    expect(model?.narrativeOpen).toBe(false);
  });
});

describe('composeMilestoneAudit - prose-only audits', () => {
  it('opens the narrative with no scores, gaps, debt, Nyquist or unclaimed rows', () => {
    for (const url of [
      new URL('../../fixtures/dense/.planning/milestones/v2.0-MILESTONE-AUDIT.md', import.meta.url),
      new URL('../fixtures/dashboard/ledger/.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url),
    ]) {
      const model = composeContent(readFileSync(url, 'utf8'));
      expect(model).toMatchObject({ scores: null, gaps: null, debt: null, nyquist: null, extras: [], narrativeOpen: true });
    }
  });

  it('reads Passed from the dense Status line and "Verdict not stated" from the old fixture', () => {
    const dense = composeContent(readFileSync(new URL('../../fixtures/dense/.planning/milestones/v2.0-MILESTONE-AUDIT.md', import.meta.url), 'utf8'));
    expect(dense?.intro.verdict).toEqual({ label: 'Passed', tone: 'complete' });
    expect(dense?.intro.audited).toBe('15 Mar 2026');
    const old = composeContent(readFileSync(new URL('../fixtures/dashboard/ledger/.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url), 'utf8'));
    expect(old?.intro.verdict).toEqual({ label: 'Verdict not stated', tone: 'quiet' });
  });
});

describe('composeMilestoneAudit - score values', () => {
  it('reads 3/4, { n, m }, a percentage and a bare number', () => {
    const [fraction, object, percent, bare] = composeFrontmatterScores({ a: '3/4', b: { n: 3, m: 4 }, c: '75%', d: '12' });
    expect(fraction).toMatchObject({ value: '3/4', tone: 'in-flight', fill: null });
    expect(fraction.segments).toEqual(['in-flight', 'in-flight', 'in-flight', 'missing']);
    expect(object).toMatchObject({ value: '3/4', read: true });
    expect(object.segments).toHaveLength(4);
    expect(percent).toMatchObject({ value: '75%', tone: 'in-flight', segments: null, fill: 75, read: true });
    expect(bare).toMatchObject({ value: '12', segments: null, fill: null, read: true });
  });

  it('shows "about half" verbatim with no bar', () => {
    const [score] = composeFrontmatterScores({ a: 'about half' });
    expect(score).toMatchObject({ label: 'A', value: 'about half', read: false, segments: null, fill: null, tone: 'quiet' });
  });

  it('draws a proportional bar above 24 units and one segment per unit up to 24', () => {
    const [at24, at25, none, zero] = composeFrontmatterScores({ a: '24/24', b: '5/30', c: '0/4', d: '0/0' });
    expect(at24.segments).toHaveLength(24);
    expect(at25).toMatchObject({ segments: null, fill: 16.7, tone: 'in-flight' });
    expect(none).toMatchObject({ tone: 'missing', segments: ['missing', 'missing', 'missing', 'missing'] });
    expect(zero).toMatchObject({ value: '0/0', tone: 'quiet', segments: null, fill: null });
  });

  it('keeps the author order and humanises the key', () => {
    const scores = composeFrontmatterScores({ zeta_flows: '1/1', alpha: '1/1' });
    expect(scores.map((score) => score.label)).toEqual(['Zeta flows', 'Alpha']);
  });
});

describe('composeMilestoneAudit - small cases', () => {
  it('words a single open item across a single phase in the singular', () => {
    const model = composeContent('---\nstatus: tech_debt\ntech_debt:\n  - phase: 01-x\n    items: ["WR-01: one thing"]\n---\n');
    expect(model?.debt?.heading).toBe('1 item across 1 phase');
    expect(model?.debt?.groups[0].count).toBe(1);
  });

  it('drops a phase with no items and the section when none has any', () => {
    expect(composeContent('---\ntech_debt:\n  - phase: 01-x\n    items: []\n---\n')?.debt).toBeNull();
  });

  it('shows the Nyquist lists zero-padded and omits the empty ones', () => {
    const model = composeContent('---\nnyquist:\n  compliant_phases: [1, 4, "08"]\n  partial_phases: []\n---\n');
    expect(model?.nyquist?.chips).toEqual([{ key: 'compliant', label: 'Compliant', phases: '01, 04, 08', tone: 'complete' }]);
  });

  it('gives a key with no readable rows a plain "Empty" row rather than nothing', () => {
    const model = composeContent('---\nstatus: passed\nnote:\n---\n');
    expect(model?.extras).toEqual([{ label: 'Note', rows: [{ label: '', value: 'Empty', long: false }] }]);
  });
});
