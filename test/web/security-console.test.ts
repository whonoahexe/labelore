// quick-261003-527: composeSecurityConsole, built from literal ViewInput objects and from the real
// corpus docs (test/security-register.test.ts covers the server extractor; the narrow e2e spec
// covers the page end to end), plus the static markup of SecurityConsoleView.
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { synthesize } from '../helpers/security-synthetic.ts';
import { SecurityHandler } from '../../src/planning-repo/handlers/security.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import {
  DOC_STATUS,
  RUN_TONE,
  SEV_PIPS,
  STAMP_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  composeSecurityConsole,
} from '../../src/web/views/security-console.ts';
import type { ComposedSecurityConsole } from '../../src/web/views/security-console.ts';
import { SecurityConsoleView } from '../../src/web/views/security-console-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const FX = new URL('../../fixtures/dense/.planning/phases/01-identity-slice/01-SECURITY.md', import.meta.url);
const LB05 = new URL(
  '../../.planning/milestones/v1.1-phases/05-per-type-document-views/05-SECURITY.md',
  import.meta.url,
);
const LB02 = new URL(
  '../../.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-SECURITY.md',
  import.meta.url,
);
const LB04 = new URL(
  '../../.planning/milestones/v1.0-phases/04-portability-degradation-hardening/04-SECURITY.md',
  import.meta.url,
);
const SP1 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-SECURITY.md`;
const SP3 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-SECURITY.md`;

const HEADINGS = [{ id: 'threat-register', text: 'Threat Register', depth: 2 }];

function inputOf(content: string, headings: ViewInput['headings'] = []): ViewInput {
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-SECURITY.md',
    kind: 'security',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = SecurityHandler.parse(raw, ref);
  return {
    kind: 'security',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

function inputFor(path: URL | string, headings: ViewInput['headings'] = []): ViewInput {
  return inputOf(readFileSync(path, 'utf8'), headings);
}

function composed(path: URL | string, headings: ViewInput['headings'] = []): ComposedSecurityConsole {
  const model = composeSecurityConsole(inputFor(path, headings));
  if (!model) throw new Error(`did not compose: ${String(path)}`);
  return model;
}

function render(
  model: ComposedSecurityConsole,
  extra: { initialPick?: number | null; initialAudit?: boolean } = {},
): string {
  return renderToStaticMarkup(
    createElement(SecurityConsoleView, {
      model,
      fallbackTitle: 'Fallback title',
      path: '.planning/phases/01-x/01-SECURITY.md',
      mode: 'view',
      onModeChange: () => undefined,
      onShowSource: () => undefined,
      ...extra,
    }),
  );
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('security console tone maps', () => {
  it('chooses tones for status only and keeps severity a neutral pip count', () => {
    expect(STATUS_TONE).toEqual({ open: 'missing', 'open-low': 'in-flight', closed: 'complete', unknown: 'quiet' });
    expect(STATUS_LABEL.unknown).toBe('—');
    expect(DOC_STATUS.verified).toEqual({ label: 'Verified', tone: 'complete' });
    expect(DOC_STATUS.draft.tone).toBe('in-flight');
    expect(DOC_STATUS.open.tone).toBe('in-flight');
    expect(STAMP_TONE).toEqual({ signed: 'complete', unsigned: 'quiet' });
    expect(RUN_TONE.clear).toBe('complete');
    expect(SEV_PIPS).toEqual({ critical: 4, high: 3, medium: 2, low: 1, unknown: 0 });
  });
});

describe('composeSecurityConsole — dense fixture', () => {
  const model = composed(FX);

  it('reads the rail from the frontmatter', () => {
    expect(model.intro).toMatchObject({
      eyebrow: 'Security · Phase 1',
      title: 'Identity slice',
      status: { label: 'Draft', tone: 'in-flight' },
      created: '7 Jun 2026',
      asvs: 'Level 1',
      blocksAt: 'high+',
    });
  });

  it('is blocking: gauge, board, stamp and the prose-only risk log', () => {
    expect(model.gauge).toMatchObject({ open: 1, alarm: true, verdict: 'blocking sign-off', closedLine: '0 of 1 closed' });
    expect(model.board.columns.map((c) => c.key)).toEqual(['T']);
    expect(model.board.rows).toHaveLength(1);
    expect(model.board.rows[0].level).toBe('medium');
    expect(model.board.rows[0].cells[0].threatIndexes).toEqual([0]);
    expect(model.threats[0]).toMatchObject({ tone: 'missing', ref: 'T-1-01' });
    expect(model.stamp).toMatchObject({ signed: false, approval: 'pending' });
    expect(model.waivers.rows).toEqual([]);
    expect(JSON.stringify(model.waivers.prose)).toContain('No accepted risks.');
    expect(model.summary).toBeNull();
  });
});

describe('composeSecurityConsole — LB v1.1/05', () => {
  const model = composed(LB05, HEADINGS);

  it('reads identity, the all-clear-but-one gauge and the nav counts', () => {
    expect(model.intro).toMatchObject({
      title: 'Per type document views',
      status: { label: 'Verified', tone: 'complete' },
      created: '21 Sep 2026',
    });
    expect(model.gauge).toMatchObject({
      open: 0,
      alarm: false,
      verdict: '1 below high, non-blocking',
      closedLine: '18 of 19 closed',
    });
    expect(model.gauge.segments).toEqual([
      { status: 'closed', tone: 'complete', count: 18 },
      { status: 'open-low', tone: 'in-flight', count: 1 },
    ]);
    expect(model.stamp.signed).toBe(true);
    expect(model.nav).toEqual([
      { id: 'security-board', label: 'Threats', count: '19' },
      { id: 'security-waivers', label: 'Accepted risks', count: '8' },
      { id: 'security-flows', label: 'Trust boundaries', count: '8' },
      { id: 'security-signoff', label: 'Sign-off', count: '4/4' },
    ]);
  });

  it('puts one square per threat on the board, in STRIDE order without a missing column', () => {
    expect(model.board.columns.map((c) => c.key)).toEqual(['S', 'T', 'I', 'D', 'E']);
    expect(model.threats).toHaveLength(19);
    expect(model.threats.filter((t) => t.tone === 'in-flight').map((t) => t.ref)).toEqual(['T-05-11']);
    expect(model.threats.filter((t) => t.accepted)).toHaveLength(8);
  });

  it('links each waiver to its square and back', () => {
    expect(model.waivers.rows).toHaveLength(8);
    const first = model.waivers.rows[0];
    expect(first.refs[0].threatIndex).not.toBeNull();
    expect(model.threats[first.refs[0].threatIndex as number].riskIndexes).toContain(0);
  });

  it('names the register legend and the frontmatter as source-only', () => {
    expect(model.sourceOnly).toEqual([
      { label: 'Frontmatter', targetId: null },
      { label: 'Register legend', targetId: 'threat-register' },
    ]);
  });
});

describe('composeSecurityConsole — literal inputs', () => {
  const base = {
    kind: 'security',
    frontmatter: { status: 'verified', phase: '04', slug: '04-some-phase' },
    groups: [],
    planSegments: [],
  };
  const register = (statuses: string[]) => ({
    grouped: false,
    rows: statuses.map((s, i) => ({
      id: `T-${i}`,
      ids: [`T-${i}`],
      group: null,
      category: 'Tampering',
      component: `c${i}`,
      severity: { top: 'high', raw: 'high' },
      disposition: 'mitigate',
      status: s,
      statusRaw: s,
      mitigation: 'm',
    })),
    note: [],
    legend: '',
    prose: null,
  });

  it('counts the open rows when the frontmatter has no threats_open', () => {
    const model = composeSecurityConsole({
      ...base,
      structured: { security: { register: register(['open', 'open', 'closed']) } },
    });
    expect(model?.gauge).toMatchObject({ open: 2, alarm: true, closedLine: '1 of 3 closed' });
    expect(model?.intro).toMatchObject({ eyebrow: 'Security · Phase 4', title: 'Some phase' });
  });

  it('keeps an unrecognised status quiet and an unrated severity on its own row', () => {
    const rows = register(['strange']);
    rows.rows[0].severity = { top: 'unknown', raw: 'n/a' };
    const model = composeSecurityConsole({ ...base, structured: { security: { register: rows } } });
    expect(model?.threats[0]).toMatchObject({ tone: 'quiet', statusLabel: '—' });
    expect(model?.board.rows.map((r) => r.label)).toEqual(['Unrated']);
  });

  it('composes to null without structured.security, or with neither register rows nor prose', () => {
    expect(composeSecurityConsole({ ...base, structured: {} })).toBeNull();
    expect(composeSecurityConsole({ ...base, structured: { security: {} } })).toBeNull();
    expect(
      composeSecurityConsole({ ...base, structured: { security: { register: { grouped: false, rows: [], prose: null } } } }),
    ).toBeNull();
  });

  it('shows the register prose when there is no table', () => {
    const model = composeSecurityConsole({
      ...base,
      structured: { security: { register: { grouped: false, rows: [], prose: [{ kind: 'paragraph', text: 'Tracked in the plans.' }] } } },
    });
    expect(model?.board.prose).toEqual([{ kind: 'paragraph', text: 'Tracked in the plans.' }]);
    expect(model?.threats).toEqual([]);
  });
});

describe('SecurityConsoleView — static markup', () => {
  it('renders the dense fixture as the blocking console', () => {
    const html = render(composed(FX));
    expect(count(html, '<h1>')).toBe(1);
    expect(html).toContain('<h1>Identity slice</h1>');
    expect(html).toContain('Security · Phase 1');
    expect(html).toContain('data-alarm="true"');
    expect(html).toContain('view-security-gauge-n">1<');
    expect(count(html, 'class="view-security-square"')).toBe(1);
    expect(html).toContain('data-tone="missing"');
    expect(html).toContain('data-threat="T-1-01"');
    expect(html).toContain('aria-label="Document display"');
    expect(html).toContain('Pick a square for the threat');
  });

  it('shows the picked threat in the detail panel, and an accepted one with its waiver', () => {
    const model = composed(LB05);
    const open = model.threats.findIndex((t) => t.ref === 'T-05-11');
    const openHtml = render(model, { initialPick: open });
    expect(openHtml).toContain('T-05-11');
    expect(openHtml).toContain('Open · non-blocking');
    expect(openHtml).toContain('Mitigation · ');
    expect(openHtml).not.toContain('Pick a square for the threat');
    const accepted = model.threats.findIndex((t) => t.ref === 'T-05-03');
    const html = render(model, { initialPick: accepted });
    expect(html).toContain('Why acceptable · ');
    expect(html).toContain('input is already through');
    expect(html).toContain('plan author (05-01-PLAN.md), 21 Sep 2026');
    expect(html).toContain('R-05-01 ↓');
  });

  it('lists the four legend squares and an 8-row waiver ledger with ref buttons', () => {
    const html = render(composed(LB05));
    expect(count(html, 'class="view-security-key-sq"')).toBe(4);
    expect(count(html, 'class="view-security-waiver"')).toBe(8);
    expect(count(html, '<button type="button" class="view-security-ref">')).toBe(8);
  });

  it('LB v1.0/02: grouped board, a clamped long rationale and a picked group listing its ids', () => {
    const model = composed(LB02);
    const html = render(model, { initialPick: 0 });
    expect(html).toContain('Grouped');
    expect(html).toContain('aria-expanded="false">more<');
    const matched = model.threats.some((t) => t.ids.includes('T-02-20'));
    expect(html.includes('<button type="button" class="view-security-ref">T-02-20</button>')).toBe(matched);
    expect(html).toContain('Threats · ');
    expect(count(html, '<details>')).toBe(3);
    expect(html).not.toContain('<details open');
  });

  it('LB v1.0/04 and the fixture render the notice instead of a ledger', () => {
    for (const path of [LB04, FX]) {
      const html = render(composed(path));
      expect(html).toContain('class="notice view-security-notice"');
      expect(count(html, 'class="view-security-waiver"')).toBe(0);
    }
  });

  it.runIf(existsSync(SP1))('SP P1: ten flows, two stores that hold their data, a disclosure for each', () => {
    const html = render(composed(SP1));
    expect(count(html, 'view-security-flow-row"')).toBe(10);
    expect(count(html, 'view-security-flow-row" data-store="true"')).toBe(2);
    expect(count(html, 'holds ')).toBe(2);
    expect(count(html, 'aria-controls="flow-')).toBe(10);
  });

  it('shows the sign-off checklist and the rail stamp for a signed and an unsigned doc', () => {
    const signed = render(composed(LB05));
    expect(count(signed, 'data-done="true"')).toBe(4);
    expect(signed).toContain('Signed off');
    expect(signed).toContain('verified 2026-09-21');
    const unsigned = render(composed(FX));
    expect(count(unsigned, 'data-done="true"')).toBe(1);
    expect(count(unsigned, 'data-done="false"')).toBe(3);
    expect(unsigned).toContain('Not signed off');
    expect(unsigned).toContain('pending');
  });

  it('hides the audit trail by default and shows its runs and note when switched on', () => {
    const model = composed(LB05);
    const off = render(model);
    expect(off).not.toContain('id="security-audit"');
    expect(off).toContain('role="switch"');
    expect(off).toContain('aria-checked="false"');
    const on = render(model, { initialAudit: true });
    expect(on).toContain('id="security-audit"');
    expect(count(on, 'class="view-security-run"')).toBe(1);
    expect(on).toContain('1 (non-blocking: T-05-11) open');
    expect(on).toContain('Audit notes');
  });

  it.runIf(existsSync(SP3))('the synthetic open-threats doc renders two runs when the audit is on', () => {
    const model = composeSecurityConsole(inputOf(synthesize(readFileSync(SP3, 'utf8'))));
    expect(model).not.toBeNull();
    if (!model) return;
    const html = render(model, { initialAudit: true });
    expect(count(html, 'class="view-security-run"')).toBe(2);
    expect(html).toContain('data-alarm="true"');
    expect(count(html, 'data-tone="missing" data-accepted')).toBeGreaterThanOrEqual(2);
  });

  it('names Frontmatter and, when the register has a legend, the Register legend', () => {
    const withLegend = render(composed(LB05, HEADINGS));
    expect(withLegend).toContain('>Frontmatter<');
    expect(withLegend).toContain('>Register legend<');
    const without = render(composed(LB04, HEADINGS));
    expect(without).toContain('>Frontmatter<');
    expect(without).not.toContain('Register legend');
  });
});
