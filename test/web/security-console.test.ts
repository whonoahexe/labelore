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
  AT_REST_LABEL,
  BOUNDARY_TONE,
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
  extra: { initialPick?: number | null; initialAudit?: boolean; initialOpen?: readonly string[] } = {},
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
      { id: 'security-boundaries', label: 'Trust boundaries', count: '8' },
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

const REGISTER = [
  '## Threat Register',
  '',
  '| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |',
  '|---|---|---|---|---|---|---|',
  '| T-1-01 | Tampering | c | high | mitigate | m | closed |',
  '',
].join('\n');

/** A literal doc through the real handler, with a Trust Boundaries table built from the rows. */
function boundaryDoc(rows: [string, string, string][], after = ''): ViewInput {
  const table = [
    '## Trust Boundaries',
    '',
    '| Boundary | Description | Data Crossing |',
    '|---|---|---|',
    ...rows.map(([name, description, data]) => `| ${name} | ${description} | ${data} |`),
    after,
    '',
  ].join('\n');
  return inputOf(`---\nstatus: verified\n---\n\n# Doc\n\n${table}\n${REGISTER}`);
}

describe('composeSecurityConsole — trust boundaries by destination', () => {
  const doc = boundaryDoc([
    ['browser → backend (via tunnel)', 'front door', 'cookies'],
    ['Edge -> Backend (session validation)', 'hot path', 'session'],
    ['unauthenticated caller → `POST /login`', 'guessing surface', 'password'],
    ['cache (in-process)', 'shared state', 'addresses'],
    ['client → `POST /login`', 'normal login', 'handle'],
    ['Untrusted CI → build', 'third-party code', 'packages'],
  ]);
  const model = composeSecurityConsole(doc);
  const blocks = model?.boundaries?.destinations ?? [];

  it('groups shared destinations, gathers single ones into one list and ends at rest', () => {
    expect(model?.boundaries?.total).toBe(6);
    expect(blocks.map((b) => [b.label, b.countText, b.kind])).toEqual([
      ['Backend', '2 ways in', 'shared'],
      ['`POST /login`', '2 ways in', 'shared'],
      ['Other crossings', '1', 'single'],
      [AT_REST_LABEL, '1', 'at-rest'],
    ]);
    expect(blocks.map((b) => b.anchorId)).toEqual(['security-dest-0', 'security-dest-1', 'security-dest-2', 'security-dest-3']);
  });

  it('merges the -> arrow with the → arrow, case-insensitively, keeping qualifiers as asides', () => {
    const backend = blocks[0];
    expect(backend.crossings.map((c) => c.source)).toEqual(['browser', 'Edge']);
    expect(backend.crossings.map((c) => c.qualifier)).toEqual(['via tunnel', 'session validation']);
    expect(blocks[1].crossings.map((c) => c.qualifier)).toEqual([null, null]);
  });

  it('lands singletons in the single list with their destination, and no-arrow rows at rest', () => {
    const single = blocks[2].crossings[0];
    expect(single).toMatchObject({ source: 'Untrusted CI', destination: 'Build', data: 'packages' });
    const rest = blocks[3].crossings[0];
    expect(rest).toMatchObject({ source: 'cache (in-process)', qualifier: null, tone: 'quiet' });
  });

  it('tones only the unauthenticated, untrusted and anonymous sources; every data chip is quiet', () => {
    const all = blocks.flatMap((b) => b.crossings);
    expect(all.filter((c) => c.tone === 'in-flight').map((c) => c.source)).toEqual(['unauthenticated caller', 'Untrusted CI']);
    expect(all.every((c) => c.dataTone === 'quiet')).toBe(true);
    expect(BOUNDARY_TONE).toEqual({ exposed: 'in-flight', internal: 'quiet', crossing: 'quiet' });
  });

  it('counts the table rows in the nav, under the boundaries id', () => {
    expect(model?.nav.find((n) => n.label === 'Trust boundaries')).toEqual({
      id: 'security-boundaries',
      label: 'Trust boundaries',
      count: '6',
    });
  });

  it('orders ties by first appearance, and reads a lone destination as "Crossings"', () => {
    const tie = composeSecurityConsole(
      boundaryDoc([
        ['x → A', 'd', 'k'],
        ['y → B', 'd', 'k'],
        ['z → B', 'd', 'k'],
        ['w → A', 'd', 'k'],
      ]),
    )?.boundaries?.destinations;
    expect(tie?.map((b) => b.label)).toEqual(['A', 'B']);
    const lone = composeSecurityConsole(boundaryDoc([['x → A', 'd', 'k'], ['y → B', 'd', 'k']]))?.boundaries?.destinations;
    expect(lone?.map((b) => [b.label, b.countText, b.kind])).toEqual([['Crossings', '2', 'single']]);
  });

  it('falls back to the raw text for an unbalanced parenthesis and for a row with an empty side', () => {
    const odd = composeSecurityConsole(boundaryDoc([['a → (open', 'd', 'k'], ['→ b', 'd', 'k']]))?.boundaries?.destinations ?? [];
    expect(odd[0].crossings[0].destination).toBe('(open');
    expect(odd[0].crossings[0].qualifier).toBe('open');
    expect(odd[1]).toMatchObject({ kind: 'at-rest' });
    expect(odd[1].crossings[0].source).toBe('→ b');
  });

  it('degrades to no section and no nav entry without a table, or without boundaries at all', () => {
    const noTable = inputOf(`---\nstatus: verified\n---\n\n# Doc\n\n## Trust Boundaries\n\nJust prose here.\n\n${REGISTER}`);
    const none = composeSecurityConsole(noTable);
    expect(none?.boundaries).toBeNull();
    expect(none?.nav.some((n) => n.label === 'Trust boundaries')).toBe(false);
    const raw = composeSecurityConsole({
      ...noTable,
      structured: { security: { register: (noTable.structured.security as { register: unknown }).register } },
    });
    expect(raw?.boundaries).toBeNull();
  });

  it('keeps the prose around the table as the note, rendered under the blocks', () => {
    const withNote = composeSecurityConsole(boundaryDoc([['x → A', 'd', 'k']], '\nThe dominant threat classes are listed above.'));
    expect(JSON.stringify(withNote?.boundaries?.note)).toContain('dominant threat classes');
    expect(render(withNote as ComposedSecurityConsole)).toContain('dominant threat classes');
  });

  it.runIf(existsSync(SP1))('SP P1: Backend (2), the other six crossings in document order, then at rest (2)', () => {
    const sp = composed(SP1).boundaries?.destinations ?? [];
    expect(sp.map((b) => [b.label, b.countText, b.kind])).toEqual([
      ['Backend', '2 ways in', 'shared'],
      ['Other crossings', '6', 'single'],
      [AT_REST_LABEL, '2', 'at-rest'],
    ]);
    expect(sp[0].crossings.map((c) => [c.source, c.qualifier])).toEqual([
      ['browser', 'via Cloudflare tunnel'],
      ['Vercel edge', 'session validation'],
    ]);
    expect(sp[1].crossings.map((c) => c.destination)).toEqual([
      '`POST /api/login`',
      'Every handler',
      'Filesystem',
      'Vercel edge',
      '`backstage` process',
      'Build',
    ]);
    expect(sp[1].crossings[3].qualifier).toBe('route gate');
    expect(sp.flatMap((b) => b.crossings).filter((c) => c.tone === 'in-flight').map((c) => c.source)).toEqual([
      'unauthenticated caller',
    ]);
  });

  it.runIf(existsSync(SP3))('SP P3: one "Crossings · 10" block and one toned source', () => {
    const sp = composed(SP3).boundaries?.destinations ?? [];
    expect(sp.map((b) => [b.label, b.countText, b.kind])).toEqual([['Crossings', '10', 'single']]);
    expect(sp[0].crossings.filter((c) => c.tone === 'in-flight').map((c) => c.source)).toEqual(['unauthenticated browser']);
  });

  it('composes a pathological destination and source in well under 250 ms without throwing', () => {
    const started = performance.now();
    const huge = composeSecurityConsole(boundaryDoc([[`${'x'.repeat(100_000)} → ${'('.repeat(100_000)}`, 'd', 'k']]));
    expect(performance.now() - started).toBeLessThan(250);
    expect(huge?.boundaries?.destinations).toHaveLength(1);
  });
});

function residualDoc(body: string, heading = 'Residual Observations'): ViewInput {
  return inputOf(`---\nstatus: verified\n---\n\n# Doc\n\n${REGISTER}\n## ${heading}\n\n${body}\n`);
}

const RESIDUAL_BODY = [
  'Not open threats — recorded so they are not rediscovered.',
  '',
  '**Title one** (relates to T-1-01, T-9-99). First prose.',
  '',
  'More prose paragraph.',
  '',
  '- item a',
  '- item b',
  '',
  '**Title two (relates to T-1-01).** Second prose.',
  '',
  '**Title three (no threat ref).** Third prose.',
].join('\n');

describe('composeSecurityConsole — residual observations', () => {
  const model = composeSecurityConsole(residualDoc(RESIDUAL_BODY));

  it('splits the lead from the items and strips the ref parenthetical from each title', () => {
    expect(model?.residuals?.label).toBe('Residual observations · 3');
    expect(model?.residuals?.lead).toEqual([{ kind: 'paragraph', text: 'Not open threats — recorded so they are not rediscovered.' }]);
    expect(model?.residuals?.items.map((i) => [i.anchorId, i.title])).toEqual([
      ['security-residual-0', 'Title one'],
      ['security-residual-1', 'Title two'],
      ['security-residual-2', 'Title three'],
    ]);
  });

  it('wires one ref per T-id, leaves an unknown id unmatched and gives no-ref items none', () => {
    const items = model?.residuals?.items ?? [];
    expect(items[0].refs).toEqual([
      { text: 'T-1-01', threatIndex: 0 },
      { text: 'T-9-99', threatIndex: null },
    ]);
    expect(items[1].refs).toEqual([{ text: 'T-1-01', threatIndex: 0 }]);
    expect(items[2].refs).toEqual([]);
    expect(model?.threats[0].residualIndexes).toEqual([0, 1]);
  });

  it('gives each item its own prose, with following blocks owned until the next title', () => {
    const items = model?.residuals?.items ?? [];
    expect(items[0].blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'list']);
    expect(items[0].blocks[0]).toEqual({ kind: 'paragraph', text: 'First prose.' });
    expect(items[1].blocks).toEqual([{ kind: 'paragraph', text: 'Second prose.' }]);
    expect(model?.extras).toEqual([]);
  });

  it('keeps a list-only Residual Observations section, and a Hardening Notes one, folded', () => {
    const listOnly = composeSecurityConsole(residualDoc('- one\n- two'));
    expect(listOnly?.residuals).toBeNull();
    expect(listOnly?.extras.map((e) => e.heading)).toEqual(['Residual Observations']);
    const hardening = composeSecurityConsole(residualDoc(RESIDUAL_BODY, 'Hardening Notes'));
    expect(hardening?.residuals).toBeNull();
    expect(hardening?.extras.map((e) => e.heading)).toEqual(['Hardening Notes']);
  });

  it('reads a ref parenthetical that follows the bold title, and stays null without structured data', () => {
    const outside = composeSecurityConsole(residualDoc('**Title** (relates to T-1-01). prose'));
    expect(outside?.residuals?.items[0]).toMatchObject({ title: 'Title', refs: [{ text: 'T-1-01', threatIndex: 0 }] });
    expect(outside?.residuals?.items[0].blocks).toEqual([{ kind: 'paragraph', text: 'prose' }]);
    const none = composeSecurityConsole({ ...residualDoc(RESIDUAL_BODY), structured: { security: { register: (residualDoc('x').structured.security as { register: unknown }).register } } });
    expect(none?.residuals).toBeNull();
  });

  it('composes pathological titles and ref lists quickly, capping refs at 20 per item', () => {
    const refs = Array.from({ length: 50_000 }, (_, i) => `T-${i}`).join(', ');
    const started = performance.now();
    // Built by hand: the extractor already caps a line at 8000 characters, but the composer must
    // not depend on that.
    const base = residualDoc('x');
    const security = base.structured.security as Record<string, unknown>;
    const huge = composeSecurityConsole({
      ...base,
      structured: {
        security: {
          ...security,
          extras: [
            {
              heading: 'Residual Observations',
              blocks: [
                { kind: 'paragraph', text: `**${'('.repeat(100_000)}** body` },
                { kind: 'paragraph', text: `**x (relates to ${refs})** y` },
              ],
            },
          ],
        },
      },
    });
    expect(performance.now() - started).toBeLessThan(250);
    expect(huge?.residuals?.items).toHaveLength(2);
    expect(huge?.residuals?.items[1].refs).toHaveLength(20);
  });

  it.runIf(existsSync(SP1))('SP P1: three observations, two of them wired to register rows', () => {
    const sp = composed(SP1);
    expect(sp.residuals?.label).toBe('Residual observations · 3');
    expect(sp.residuals?.items.map((i) => i.title)).toEqual([
      '`AUTH_MODE=dev` guard scope',
      '`Cf-Connecting-Ip` tunnel dependency',
      'Unobserved fault windows',
    ]);
    expect(sp.residuals?.items.map((i) => i.refs.map((r) => r.text))).toEqual([['T-01-07'], ['T-01-24'], []]);
    expect(sp.residuals?.items.flatMap((i) => i.refs).every((r) => r.threatIndex !== null)).toBe(true);
    expect(JSON.stringify(sp.residuals?.lead[0])).toContain('Not open threats — no register entry is unmitigated.');
    expect(sp.extras).toEqual([]);
    const index = (ref: string): number => sp.threats.findIndex((t) => t.ref === ref);
    expect(sp.threats[index('T-01-07')].residualIndexes).toEqual([0]);
    expect(sp.threats[index('T-01-24')].residualIndexes).toEqual([1]);
  });
});

describe('SecurityConsoleView — residual observations markup', () => {
  const literal = composeSecurityConsole(residualDoc(RESIDUAL_BODY)) as ComposedSecurityConsole;

  it('is closed by default: a collapsed toggle with its lead, and no items', () => {
    const html = render(literal);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Residual observations · 3');
    expect(html).toContain('recorded so they are not rediscovered');
    expect(html).not.toContain('id="security-residual-0"');
    expect(html).not.toContain('aria-controls="security-residuals-list"');
  });

  it('open: anchored items, stripped titles, ref buttons only for matched refs', () => {
    const html = render(literal, { initialOpen: ['residuals'] });
    expect(html).toContain('aria-expanded="true"');
    for (const n of [0, 1, 2]) expect(html).toContain(`id="security-residual-${n}"`);
    expect(html).toContain('<h3>Title one</h3>');
    expect(html).not.toContain('(relates to');
    const list = html.slice(html.indexOf('id="security-residuals-list"'));
    expect(count(list, '<button type="button" class="view-security-ref">T-1-01</button>')).toBe(2);
    expect(count(list, 'data-plain="true">T-9-99<')).toBe(1);
    expect(count(list, 'view-security-ref')).toBe(3);
  });

  it('the picked threat links back to its observations, and other threats show nothing', () => {
    expect(render(literal, { initialPick: 0 })).toContain('2 residual observations');
    const one = composeSecurityConsole(residualDoc('**Only (relates to T-1-01).** prose')) as ComposedSecurityConsole;
    expect(render(one, { initialPick: 0 })).toContain('1 residual observation');
    expect(render(composed(LB05), { initialPick: 0 })).not.toContain('residual observation');
  });

  it.runIf(existsSync(SP1))('SP P1: closed toggle with 3 items when open, T-01-07 reverse link, no <details>', () => {
    const model = composed(SP1);
    expect(count(render(model), '<details>')).toBe(0);
    const closed = render(model);
    expect(closed).toContain('Residual observations · 3');
    expect(closed).toContain('Not open threats — no register entry is unmitigated.');
    expect(closed).not.toContain('id="security-residual-0"');
    const open = render(model, { initialOpen: ['residuals'] });
    expect(count(open, 'class="view-security-residual"')).toBe(3);
    const list = open.slice(open.indexOf('id="security-residuals-list"'));
    expect(count(list, 'class="view-security-ref">T-01-')).toBe(2);
    const at = model.threats.findIndex((t) => t.ref === 'T-01-07');
    expect(render(model, { initialPick: at })).toContain('1 residual observation');
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

  it.runIf(existsSync(SP1))('SP P1: three blocks, descriptions always visible, one toned source', () => {
    const html = render(composed(SP1));
    expect(count(html, '<div id="security-dest-')).toBe(3);
    expect(html).toContain('id="security-dest-0"');
    expect(html).toContain('id="security-dest-2"');
    expect(html).not.toContain('id="security-dest-3"');
    const first = html.slice(html.indexOf('id="security-dest-0"'), html.indexOf('id="security-dest-1"'));
    expect(first).toContain('Backend');
    expect(first).toContain(' · 2 ways in');
    expect(first).toContain('via Cloudflare tunnel');
    expect(html).toContain(' · 6');
    expect(html).toContain('Other crossings');
    expect(html).toContain('At rest / in-process');
    expect(html.lastIndexOf('At rest / in-process')).toBeGreaterThan(html.indexOf('Other crossings'));
    // The at-rest block is the last block.
    expect(html.indexOf('data-at-rest="true"')).toBeGreaterThan(html.indexOf('id="security-dest-1"'));
    expect(count(html, 'class="view-security-from" data-tone="in-flight"')).toBe(1);
    expect(count(html, 'class="view-security-carries" data-tone="quiet"')).toBe(10);
    expect(count(html, 'class="view-security-crossing-desc"')).toBe(10);
    expect(html).not.toContain('>why<');
    expect(html).not.toContain('>hide<');
    expect(count(html, 'aria-controls="flow-')).toBe(0);
  });

  it('a boundary section renders the single list with source → destination leads', () => {
    const html = render(composed(LB05));
    expect(count(html, 'id="security-boundaries"')).toBe(1);
    expect(html).toContain('Crossings');
    expect(html).not.toContain('Other crossings');
    expect(count(html, '<div id="security-dest-')).toBe(1);
    expect(count(html, 'class="view-security-to-arrow"')).toBe(8);
    expect(count(html, 'class="view-security-from" data-tone="in-flight"')).toBe(0);
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
