// Phase 9 (09-14): the milestone audit composer. The verdict is the first thing on the page; an absent or
// unrecognised status never reads as Passed.
import { describe, expect, it } from 'vitest';
import { composeMilestoneAudit, VERDICT_NOT_STATED } from '../../src/web/views/milestone-audit.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

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
