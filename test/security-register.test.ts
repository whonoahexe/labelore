// quick-261003-527 (T-527-01): the SECURITY extractor over a literal mini document, the grouped and
// no-Component register shapes, the prose-only risk log, and the degrade cases (empty, ragged,
// unclosed fence, header without a separator, a 1 MB body holding one 200k-character line).
import { describe, expect, it } from 'vitest';
import { extractSecurityRegister } from '../src/planning-repo/handlers/security-register.ts';

const MINI = `# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

This phase adds a session store and an admin console.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → API | Cookies cross here | Session cookie |
| Session store | Holds sessions at rest | Hashed tokens |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Spoofing | login | high | mitigate | rate limit | open |
| T-07-02 | Tampering | form | low | mitigate | escape output | open — below high threshold (non-blocking) |
| T-07-03 | Denial of Service | parser | medium | accept | bounded input | closed |
| T-07-04 | Repudiation | audit log | high | mitigate/accept | append only | **accepted** — see log |
| T-07-05 | Information Disclosure | api | medium | mitigate | redact | pending review |
| T-07-06 | Elevation of Privilege | admin | critical | mitigate | role check | closed |
| T-07-07 | Other | misc | n/a | transfer | provider | closed |

*Status: open · closed · open — below medium threshold (non-blocking)*
*Severity: critical > high > medium > low — block_on medium*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-07-01 | T-07-03 | Input is bounded elsewhere. | plan author | 2026-09-21 |

*Accepted risks do not resurface in future audit runs.*

---

## Residual Observations

- Something worth keeping an eye on.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-19 | 7 | 4 | 3 (2 blocking) | auditor (first pass) |
| 2026-08-21 | 7 | 7 | 0 | auditor |

### Audit notes (non-gating)

1. One note.

---

## Sign-Off

- [x] All threats have a disposition
- [ ] Accepted risks documented
- [ ] \`threats_open: 0\` confirmed

**Approval:** pending
`;

describe('extractSecurityRegister', () => {
  const r = extractSecurityRegister(MINI);

  it('keeps the lead paragraph and drops the title, blockquote and rules', () => {
    expect(r.lead).toEqual([{ kind: 'paragraph', text: 'This phase adds a session store and an admin console.' }]);
  });

  it('reads trust boundaries, splitting on the arrow and marking an arrowless row as a store', () => {
    expect(r.boundaries?.rows).toHaveLength(2);
    expect(r.boundaries?.rows[0]).toMatchObject({ from: 'browser', to: 'API', data: 'Session cookie' });
    expect(r.boundaries?.rows[1]).toMatchObject({ name: 'Session store', from: null, to: null });
  });

  it('reads every register row in order with status, severity and raw text', () => {
    const rows = r.register?.rows ?? [];
    expect(rows).toHaveLength(7);
    expect(rows.map((x) => x.status)).toEqual(['open', 'open-low', 'closed', 'closed', 'unknown', 'closed', 'closed']);
    expect(rows.map((x) => x.severity.top)).toEqual(['high', 'low', 'medium', 'high', 'medium', 'critical', 'unknown']);
    expect(rows[6].severity.raw).toBe('n/a');
    expect(rows[3].statusRaw).toBe('**accepted** — see log');
    expect(rows[3].disposition).toBe('mitigate/accept');
    expect(rows[0].ids).toEqual(['T-07-01']);
    expect(r.register?.grouped).toBe(false);
    expect(r.register?.legend).toContain('Status:');
    expect(r.blockOn).toBe('medium');
  });

  it('reads the accepted risk with its refs and the note under the table', () => {
    expect(r.risks?.rows).toEqual([
      { id: 'R-07-01', ref: 'T-07-03', refs: ['T-07-03'], rationale: 'Input is bounded elsewhere.', by: 'plan author', date: '2026-09-21' },
    ]);
    expect(JSON.stringify(r.risks?.note)).toContain('do not resurface');
  });

  it('reads the audit runs, the audit note, the sign-off and the extras', () => {
    expect(r.audit?.rows.map((x) => x.open)).toEqual(['3 (2 blocking)', '0']);
    expect(JSON.stringify(r.audit?.note)).toContain('Audit notes');
    expect(r.signoff?.items).toHaveLength(3);
    expect(r.signoff?.items.filter((i) => i.checked)).toHaveLength(1);
    expect(r.signoff?.approval).toBe('pending');
    expect(r.extras.map((e) => e.heading)).toEqual(['Residual Observations']);
  });

  it('keeps a section ledger with the five known sections claimed', () => {
    expect(r.sections.filter((s) => s.claimed)).toHaveLength(5);
    expect(r.sections.filter((s) => !s.claimed).map((s) => s.heading)).toEqual(['Residual Observations']);
  });
});

describe('extractSecurityRegister — other register shapes', () => {
  it('reads a grouped register', () => {
    const body = `## Threat Register

69 unique threats across 17 plans.

| Threat group | Ids | Sev | Disposition | Status | Evidence anchor |
|---|---|---|---|---|---|
| Path traversal | T-02-01, T-02-02 | high/med/low | mitigate | closed | \`paths.ts:12\` |
`;
    const reg = extractSecurityRegister(body).register;
    expect(reg?.grouped).toBe(true);
    expect(reg?.rows[0]).toMatchObject({
      group: 'Path traversal',
      ids: ['T-02-01', 'T-02-02'],
      mitigation: '`paths.ts:12`',
      status: 'closed',
    });
    expect(reg?.rows[0].severity).toEqual({ top: 'high', raw: 'high/med/low' });
    expect(JSON.stringify(reg?.note)).toContain('69 unique threats');
  });

  it('reads a register without a Component column', () => {
    const body = `## Threat Register

| Threat ID | Category | Severity | Disposition | Mitigation / evidence | Status |
|---|---|---|---|---|---|
| T-04-01 | Tampering | medium | mitigate | atomic write | closed |
`;
    const row = extractSecurityRegister(body).register?.rows[0];
    expect(row?.component).toBe('');
    expect(row?.mitigation).toBe('atomic write');
    expect(row?.category).toBe('Tampering');
  });

  it('gives zero risk rows and the prose as the note when the log has no table or an empty one', () => {
    const prose = extractSecurityRegister('## Accepted Risks Log\n\nNone accepted; see the threat register.\n').risks;
    expect(prose?.rows).toEqual([]);
    expect(JSON.stringify(prose?.note)).toContain('None accepted');
    const empty = extractSecurityRegister(
      '## Accepted Risks Log\n\n| Risk ID | Threat Ref | Rationale | Accepted By | Date |\n|---|---|---|---|---|\n\n*No accepted risks.*\n',
    ).risks;
    expect(empty?.rows).toEqual([]);
    expect(JSON.stringify(empty?.note)).toContain('No accepted risks.');
  });

  it('keeps the author text when the register has no table', () => {
    const reg = extractSecurityRegister('## Threat Register\n\nThreats are tracked in the plans.\n').register;
    expect(reg?.rows).toEqual([]);
    expect(JSON.stringify(reg?.prose)).toContain('tracked in the plans');
  });

  it('reads block_on from the legend in its other phrasings', () => {
    const legend = (line: string) =>
      extractSecurityRegister(`## Threat Register\n\n| Threat ID | Status |\n|---|---|\n| T-1-1 | open |\n\n${line}\n`).blockOn;
    expect(legend('*block_on: critical*')).toBe('critical');
    expect(legend('*only open threats at or above `low` count*')).toBe('low');
    expect(legend('*open — below high threshold (non-blocking)*')).toBe('high');
    expect(legend('*nothing relevant*')).toBeNull();
  });
});

describe('extractSecurityRegister — degrade', () => {
  it('yields an empty model for an empty body', () => {
    const r = extractSecurityRegister('');
    expect(r.register).toBeNull();
    expect(r.lead).toEqual([]);
    expect(r.sections).toEqual([]);
  });

  it('survives ragged rows, an unclosed fence, a header with no separator and missing risk cells', () => {
    const body = [
      '## Threat Register',
      '',
      '| Threat ID | Category | Severity | Status |',
      '|---|---|---|---|',
      '| T-1-1 |',
      '| T-1-2 | Spoofing | high | open | extra | cells |',
      '',
      '## Accepted Risks Log',
      '',
      '| Risk ID | Threat Ref | Rationale | Accepted By | Date |',
      '|---|---|---|---|---|',
      '| R-1 |',
      '',
      '## Trust Boundaries',
      '',
      '| Boundary | Description |',
      '| no separator row follows |',
      '',
      '## Notes',
      '',
      '```',
      'an unclosed fence | with | pipes',
    ].join('\n');
    const r = extractSecurityRegister(body);
    expect(r.register?.rows).toHaveLength(2);
    expect(r.register?.rows[0].status).toBe('unknown');
    expect(r.risks?.rows[0]).toMatchObject({ id: 'R-1', ref: '', rationale: '' });
    expect(r.boundaries?.rows).toEqual([]);
    expect(r.extras.map((e) => e.heading)).toEqual(['Notes']);
  });

  it('extracts a 1 MB body holding one 200k-character line within 250 ms', () => {
    const filler = `| T-9-9 | Spoofing | x | high | mitigate | ${'m '.repeat(10)} | closed |\n`.repeat(2000);
    const body = `# T\n\n${'x'.repeat(200_000)}\n\n## Threat Register\n\n| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |\n|---|---|---|---|---|---|---|\n${filler}\n## Sign-Off\n\n${'\n'.repeat(400_000)}`;
    expect(body.length).toBeGreaterThan(600_000);
    const started = performance.now();
    const r = extractSecurityRegister(body);
    const elapsed = performance.now() - started;
    expect(r.register?.rows.length).toBe(2000);
    expect(elapsed).toBeLessThan(250);
  });
});
