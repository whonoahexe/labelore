// quick-261018-j5h (sketch 023 A): the DEBUG composer and its view, pinned against labelore's resolved
// session, the synthetic investigating one, the four made-up Lendshed sessions, and inline sessions for
// the branches those do not cover. ViewInput
// literals are built from the handler's real parse of each file; pinned values come from the sketch's
// own data.js and model functions and the source files, never from the composer's output.
process.env.TZ = 'Asia/Kolkata';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { DebugHandler } from '../../src/planning-repo/handlers/debug.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import { composeDebugCase, entriesFor, evidenceFilters, roundBreaks } from '../../src/web/views/debug-case.ts';
import type { ComposedDebugCase } from '../../src/web/views/debug-case.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { DebugCaseView } from '../../src/web/views/debug-case-components.tsx';
import { fxPath } from '../helpers/fixture-project.ts';

const LB = new URL('../../.planning/debug/resolved/loading-state-regression.md', import.meta.url).pathname;
const KB = new URL('../../.planning/debug/knowledge-base.md', import.meta.url).pathname;
const SYN = new URL('../fixtures/debug/search-index-goes-stale.md', import.meta.url).pathname;
const FX_DD = fxPath('debug/loan-history-picks-wrong-shed.md');
const FX_RECEIPT = fxPath('debug/receipt-email-never-sent.md');
const FX_HOLDS = fxPath('debug/reservation-holds-lost-on-reconnect.md');
const FX_DOOR = fxPath('debug/resolved/door-sensor-stops-after-wifi-drop.md');

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'debug', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0, ...extra };
}

export function inputOf(content: string, path: string, headings: ViewInput['headings'] = []): ViewInput {
  const parsed = DebugHandler.parse({ path, content, mtimeMs: 0, size: content.length }, refOf(path));
  return {
    kind: 'debug',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

// In-process frontmatter keeps Dates as Dates; this variant skips the JSON round trip.
function inProcessInput(content: string, path: string): ViewInput {
  const parsed = DebugHandler.parse({ path, content, mtimeMs: 0, size: content.length }, refOf(path));
  return {
    kind: 'debug',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
  };
}

function page(file: string, headings: ViewInput['headings'] = []): ComposedDebugCase {
  const m = composeDebugCase(inputOf(readFileSync(file, 'utf8'), file, headings));
  if (m === null) throw new Error(`composed null: ${file}`);
  return m;
}

function inline(frontmatter: string, body: string, slug = 'a-session'): ComposedDebugCase | null {
  return composeDebugCase(inputOf(`---\n${frontmatter}\n---\n\n${body}`, `.planning/debug/${slug}.md`));
}

function render(model: ComposedDebugCase, extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(DebugCaseView, {
        model,
        fallbackTitle: 'Fallback',
        path: '.planning/debug/x.md',
        mode: 'view',
        onModeChange: () => undefined,
        onShowSource: () => undefined,
        chip: null,
        ...extra,
      }),
    ),
  );
}

const textOf = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const lb = page(LB);
const syn = page(SYN);

describe('the head and hero: labelore resolved session', () => {
  it('reads the head', () => {
    expect(lb.head).toEqual({
      eyebrow: 'Debug session',
      title: 'Loading state regression',
      opened: '16 Sep 2026',
      updated: '18:55',
      archived: true,
    });
    expect(lb.status).toEqual({ label: 'Resolved', tone: 'complete' });
    expect(lb.facts).toEqual([
      { label: 'Bug class', value: 'Bohrbug' },
      { label: 'Evidence', value: '12' },
      { label: 'Ruled out', value: '2' },
    ]);
    expect(lb.trigger?.short).toBeNull();
  });

  it('leads with the resolved variant: three cut causes, a cut fix, six chips, nine files', () => {
    const lead = lb.lead;
    expect([lead.variant, lead.tone, lead.kicker]).toEqual(['resolved', 'complete', null]);
    expect(lead.causes?.kicker).toBe('Root cause · 3');
    expect(lead.causes?.items.map((c) => [c.label, c.cut])).toEqual([
      ['ENVIRONMENT', true],
      ['CODE', true],
      ['STRUCTURAL / PRE-EXISTING', true],
    ]);
    expect(lead.fix?.label).toBe('The fix');
    expect(lead.fix?.cut).toBe(true);
    expect(lead.verification?.kicker).toBe('Verified · accepted');
    expect(lead.verification?.chips?.map((c) => c.result)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'open']);
    expect(lead.files?.kicker).toBe('Files changed · 9');
    expect(lead.files?.items[0]).toMatchObject({ name: 'route-chunk-store.ts', path: 'src/web/components/route-chunk-store.ts' });
    expect(lead.resolutionLink).toBe(true);
  });

  it('composes the resolution parts and file notes for the dialog', () => {
    expect(lb.resolution?.parts.map((p) => p.label)).toEqual(['Root cause', 'Fix', 'Verification']);
    expect(lb.resolution?.files).toHaveLength(9);
    const withHeadings = page(LB, [{ id: 'resolution', text: 'Resolution', depth: 2 }]);
    expect(withHeadings.resolution?.targetId).toBe('resolution');
    expect(lb.resolution?.targetId).toBeNull();
  });
});

describe('the lead of an investigating session', () => {
  it('reads the synthetic session', () => {
    expect(syn.head).toMatchObject({ title: 'Search index goes stale', opened: '15 Oct 2026', updated: '10:42', archived: false });
    expect(syn.status).toEqual({ label: 'Investigating', tone: 'in-flight' });
    expect(syn.facts.map((f) => `${f.label} ${f.value}`)).toEqual(['Bug class Bohrbug', 'Evidence 3', 'Ruled out 1']);
    const lead = syn.lead;
    expect([lead.variant, lead.tone, lead.kicker, lead.resolutionLink]).toEqual(['open', 'in-flight', 'Where it stands', false]);
    expect(lead.hypothesis?.text).toBe(
      "The watcher's change handler invalidates the client cache but never re-indexes the file, so MiniSearch still holds the startup text",
    );
    expect(lead.test?.text.startsWith('Edit a fixture plan mid-session')).toBe(true);
    expect(lead.expecting?.text.startsWith('The old word still matches')).toBe(true);
    expect(lead.next).toEqual({
      label: 'Next action',
      text: 'Add a temporary log in `src/planning-repo/watch.ts` change handler printing whether `searchIndex.update` is reachable, then save a fixture file',
    });
    expect(lead.causes).toBeNull();
    expect(syn.resolution?.parts).toEqual([]);
  });
});

describe('the sibling sketch sessions, when present', () => {
  it('Lendshed loan history: waiting on you, what to check first', () => {
    const m = page(FX_DD);
    expect(m.status).toEqual({ label: 'Waiting on you', tone: 'in-flight' });
    expect([m.lead.variant, m.lead.kicker]).toEqual(['awaiting', 'Fixed, waiting on your check']);
    expect(m.lead.next?.label).toBe('What you need to check');
    expect(m.lead.next?.text.startsWith('Ana opens https://steward.lendshed.example/members/88/loans (hard reload)')).toBe(true);
    expect(m.lead.causes?.items.map((c) => c.label)).toEqual(['CODE', 'DATA/ENVIRONMENT']);
    expect(m.lead.fix?.label).toBe('Fix applied');
    expect(m.lead.verification?.chips?.map((c) => c.name)).toEqual([
      'Target test',
      'Mutation check',
      'Regression run',
      'Adjacent tests',
      'Revert and reconfirm',
      'Live',
    ]);
    expect(m.lead.files?.items).toHaveLength(5);
    expect(m.facts.map((f) => `${f.label} ${f.value}`)).toEqual(['Bug class Bohrbug', 'Evidence 13', 'Ruled out 2', 'Rounds 2']);
    expect(m.head).toMatchObject({ title: 'Loan history picks wrong shed', opened: '24 Mar 2026', updated: '19:40' });
  });

  it('receipt email: diagnosed with a suggestion', () => {
    const m = page(FX_RECEIPT);
    expect(m.status).toEqual({ label: 'Diagnosed · not fixed', tone: 'in-flight' });
    expect([m.lead.variant, m.lead.kicker]).toEqual(['diagnosed', 'Root cause found · not fixed yet']);
    expect(m.lead.causes?.items.map((c) => c.label)).toEqual(['PRIMARY', 'SECONDARY']);
    expect(m.lead.fix?.label).toBe('Suggested fix · not applied');
    expect(m.lead.verification).toBeNull();
    expect(m.head.title).toBe('Receipt email never sent');
    expect(m.head.updated).toBeNull();
  });

  it('door sensor: archived, long trigger folded, a literal local-time-free stamp', () => {
    const m = page(FX_DOOR);
    expect(m.head).toMatchObject({ title: 'Door sensor stops after wifi drop', opened: '3 Mar 2026', updated: '18 Mar 2026 · 22:10', archived: true });
    expect(m.trigger?.text).toHaveLength(387);
    expect(m.trigger?.short).not.toBeNull();
    expect(m.trigger?.short?.endsWith(' …')).toBe(true);
    expect(m.facts[0]).toEqual({ label: 'Bug class', value: 'Mandelbug' });
    expect(m.lead.causes?.items.map((c) => c.label)).toEqual(['Cause 1', 'Cause 2', 'Cause 3']);
    expect(m.lead.fix?.text).toBe('APPLIED 2026-03-12 — Options A and C (steward decision).');
    expect(m.lead.files?.items).toHaveLength(8);
  });

  it('reservation holds: five rounds, a sentence for the verification', () => {
    const m = page(FX_HOLDS);
    expect(m.facts.map((f) => `${f.label} ${f.value}`)).toEqual(['Evidence 20', 'Ruled out 2', 'Rounds 5']);
    expect(m.trigger?.text).toHaveLength(324);
    expect(m.trigger?.short).not.toBeNull();
    expect(m.lead.causes?.items.map((c) => [c.label, c.cut])).toEqual([
      ['Cause 1', true],
      ['Cause 2', true],
      ['Cause 3', false],
    ]);
    expect(m.lead.verification).toEqual({
      kicker: 'Verified',
      chips: null,
      text: 'First pass verified (feed-client 0.4.0 published, desk bumped to ^0.4.0).',
    });
    expect(m.head).toMatchObject({ opened: '9 Mar 2026', updated: '12 Mar 2026' });
  });
});

describe('inline sessions for the remaining branches', () => {
  it('an awaiting session puts what to check first', () => {
    const m = inline(
      'status: awaiting_human_verify',
      '## Current Focus\n\nnext_action: open the page and look at the badge\n\n## Resolution\n\nroot_cause: The cache key ignored the locale.\nfix: Added the locale to the key.\n',
    );
    expect(m?.lead.variant).toBe('awaiting');
    expect(m?.lead.next).toEqual({ label: 'What you need to check', text: 'open the page and look at the badge' });
    expect(m?.lead.causes?.kicker).toBe('Root cause');
    expect(m?.lead.fix?.label).toBe('Fix applied');
  });

  it('an awaiting session with an empty root cause is an open one', () => {
    const m = inline('status: awaiting_human_verify', '## Current Focus\n\nhypothesis: h\nnext_action: n\n\n## Resolution\n\nroot_cause:\n');
    expect(m?.lead.variant).toBe('open');
    expect(m?.status).toEqual({ label: 'Waiting on you', tone: 'in-flight' });
  });

  it('a diagnosed session whose fix starts "(not applied" is a suggestion', () => {
    const m = inline(
      'status: diagnosed',
      '## Resolution\n\nroot_cause: The header was dropped by the proxy before it reached the handler.\nfix: (not applied - diagnose only) Direction: forward the header.\n',
    );
    expect(m?.lead.variant).toBe('diagnosed');
    expect(m?.lead.fix).toMatchObject({ label: 'Suggested fix · not applied', notApplied: true, text: 'forward the header.' });
    expect(m?.resolution?.parts.map((p) => p.label)).toEqual(['Root cause', 'Suggested fix · not applied']);
  });

  it('an unrecognised status is quiet, and with a root cause uses the resolved layout without a kicker', () => {
    const m = inline('status: weird_state', '## Resolution\n\nroot_cause: A real cause that is long enough to be a sentence.\n');
    expect(m?.status).toEqual({ label: 'Weird state', tone: 'quiet' });
    expect([m?.lead.variant, m?.lead.tone, m?.lead.kicker]).toEqual(['resolved', 'quiet', null]);
    expect(inline('trigger: x', '## Symptoms\n\nactual: a\n')?.status).toEqual({ label: 'Unknown', tone: 'quiet' });
  });

  it('returns null without structured.debug and for a session with nothing to show', () => {
    expect(composeDebugCase({ kind: 'debug', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    expect(inline('status: investigating', '# Debug Session: empty\n')).toBeNull();
  });

  it('never throws on junk frontmatter or structured values', () => {
    const junk = [{ debug: 5 }, { debug: 'x' }, { debug: { focus: 'a', evidence: 4, resolution: [] } }, { debug: { focus: [null, 3, { key: 5 }], resolution: { causes: 'x', files: [1], verification: 3 } } }];
    for (const structured of junk) {
      for (const frontmatter of [{ status: 5, created: [], updated: {}, trigger: 4 }, { status: null }, {}]) {
        expect(() => composeDebugCase({ kind: 'debug', frontmatter, structured, groups: [], planSegments: [] })).not.toThrow();
      }
    }
  });
});

describe('dates are read literally', () => {
  const stamps = (created: string, updated: string): [string | null, string | null] => {
    const m = inline(`status: investigating\ncreated: "${created}"\nupdated: "${updated}"`, '## Current Focus\n\nhypothesis: h\n');
    return [m?.head.opened ?? null, m?.head.updated ?? null];
  };

  it('formats a zone-less stamp without a shift', () => {
    expect(stamps('2026-09-16', '2026-09-16T18:55')).toEqual(['16 Sep 2026', '18:55']);
    expect(stamps('2026-10-03', '2026-10-12T22:10:00.000Z')).toEqual(['3 Oct 2026', '12 Oct 2026 · 22:10']);
    expect(stamps('2026-06-28', '2026-06-28')).toEqual(['28 Jun 2026', null]);
  });

  it('reads Dates that gray-matter built in-process', () => {
    const content = '---\nstatus: investigating\ncreated: 2026-10-15T09:10:00Z\nupdated: 2026-10-15T10:42:00Z\n---\n\n## Current Focus\n\nhypothesis: h\n';
    const m = composeDebugCase(inProcessInput(content, '.planning/debug/a.md'));
    expect(m?.head.opened).toBe('15 Oct 2026');
    expect(m?.head.updated).toBe('10:42');
  });
});

describe('static markup', () => {
  it('renders the resolved session', () => {
    const html = render(lb);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Loading state regression</h1>');
    expect(html).toContain('Debug session');
    expect(html).toContain('>Archived<');
    expect(html).toMatch(/<span class="view-debug-status" data-tone="complete">Resolved<\/span>/);
    expect(html).toContain('What was reported');
    expect(textOf(html)).toContain('Bug class Bohrbug Evidence 12 Ruled out 2');
    expect(html).toContain('Root cause · 3');
    expect(html.match(/>More ↗</g)).toHaveLength(4);
    expect(html).toContain('Verified · accepted');
    expect(html.match(/class="view-debug-vchip"/g)).toHaveLength(6);
    expect(html.match(/data-result="pass"/g)).toHaveLength(5);
    expect(html.match(/data-result="open"/g)).toHaveLength(1);
    expect(html).toContain('Files changed · 9');
    expect(html).toContain('The full root cause, fix and verification ↗');
    expect(html).not.toContain('All of it');
  });

  it('renders the investigating session with no clamp-only More button', () => {
    const html = render(syn);
    expect(html).toContain('Where it stands');
    expect(html).toContain('Current hypothesis');
    expect(html).toContain('Testing it by');
    expect(html).toContain('What the result means');
    expect(html).toContain('Next action');
    expect(html).not.toContain('More ↗');
    expect(html).not.toContain('The full root cause');
    expect(html).toMatch(/data-variant="open" data-tone="in-flight"/);
  });
});

describe('from disk: discovery, handler, composer and view', () => {
  let root = '';
  afterEach(async () => {
    if (root !== '') await rm(root, { recursive: true, force: true });
    root = '';
  });

  it('shows both sessions and leaves the knowledge base unrecognised', async () => {
    root = await mkdtemp(join(tmpdir(), 'debug-case-'));
    await mkdir(join(root, '.planning', 'debug', 'resolved'), { recursive: true });
    await writeFile(join(root, '.planning', 'debug', 'search-index-goes-stale.md'), readFileSync(SYN, 'utf8'));
    await writeFile(join(root, '.planning', 'debug', 'resolved', 'loading-state-regression.md'), readFileSync(LB, 'utf8'));
    await writeFile(join(root, '.planning', 'debug', 'knowledge-base.md'), readFileSync(KB, 'utf8'));
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const presentation = toProjectPresentation(await repository.load());
    const find = (suffix: string) => {
      const a = presentation.artifacts.find((x) => x.path.endsWith(suffix));
      if (!a) throw new Error(`artifact not loaded: ${suffix}`);
      return a;
    };
    const compose = (suffix: string): ComposedDebugCase => {
      const a = find(suffix);
      expect(a.kind).toBe('debug');
      const m = composeDebugCase({ kind: a.kind, frontmatter: a.frontmatter, structured: a.structured, groups: [], planSegments: [] });
      if (m === null) throw new Error('composed null');
      return m;
    };
    const resolved = render(compose('loading-state-regression.md'));
    expect(resolved).toContain('Loading state regression</h1>');
    expect(resolved).toContain('Verified · accepted');
    const open = render(compose('search-index-goes-stale.md'));
    expect(open).toContain('Where it stands');
    const kb = find('knowledge-base.md');
    expect(kb.kind).toBe('unknown');
    expect((kb.structured as Record<string, unknown>).debug).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The trail below the hero
// ---------------------------------------------------------------------------

const columnCounts = (m: ComposedDebugCase): string => m.suspects.columns.map((c) => c.items.length).join(' / ');
const filterLine = (m: ComposedDebugCase): string[] =>
  m.evidence === null ? [] : evidenceFilters(m.evidence).map((f) => `${f.label} ${f.count}`);
const shownNumbers = (m: ComposedDebugCase, filter: Parameters<typeof entriesFor>[1]): number[] =>
  m.evidence === null ? [] : entriesFor(m.evidence, filter).map((e) => e.no);

describe('Expected vs actual', () => {
  it('reads both columns and the other fields as rows', () => {
    expect(lb.symptoms?.rest.map((r) => r.label)).toEqual(['Errors', 'Timeline', 'Environment', 'Reproduction']);
    const actual = lb.symptoms?.actual?.value;
    expect(actual?.shape).toBe('blocks');
    if (actual?.shape === 'blocks') {
      const list = actual.blocks.find((b) => b.kind === 'list');
      expect(list && list.kind === 'list' ? [list.ordered, list.items.length] : null).toEqual([true, 4]);
    }
    expect(syn.symptoms?.rest.map((r) => r.label)).toEqual(['Errors', 'Reproduction', 'Started']);
  });

  it('has no section for a session without Symptoms, and the heading targets the Symptoms id', () => {
    expect(inline('status: investigating', '## Current Focus\n\nhypothesis: h\n')?.symptoms).toBeNull();
    const headed = page(LB, [{ id: 'symptoms', text: 'Symptoms', depth: 2 }]);
    expect(headed.symptoms?.targetId).toBe('symptoms');
  });

  it('renders the columns, the numbered list and the rows', () => {
    const html = render(lb);
    expect(html).toContain('Expected vs actual');
    expect(html).toContain('Should happen');
    expect(html).toContain('What happens');
    expect(html).toMatch(/<ol[^>]*>[\s\S]*?Page skeletons/);
    expect(textOf(html)).toContain('Errors');
    expect(textOf(html)).toContain('Reproduction');
  });
});

describe('Suspects', () => {
  it('builds the board for the always-present sessions', () => {
    expect(columnCounts(lb)).toBe('4 / 2 / 0');
    expect(lb.suspects.columns.map((c) => c.label)).toEqual(['Confirmed', 'Ruled out', 'Also considered']);
    expect(lb.suspects.columns[0].items.map((i) => i.kind)).toEqual(['environment', 'code', 'code', 'data']);
    expect(lb.suspects.total).toBe(6);
    expect(columnCounts(syn)).toBe('0 / 1 / 1');
    expect(syn.suspects.columns.map((c) => c.label)).toEqual(['Leading', 'Ruled out', 'Still open']);
    expect(syn.suspects.columns[1].items[0]).toMatchObject({ text: 'The client query cache serves stale search results' });
    expect(syn.suspects.columns[1].items[0].why?.startsWith("`queryClient.invalidateQueries(['search'])` fires on the SSE event")).toBe(true);
    expect(syn.suspects.columns[2].items[0].kind).toBe('testing now');
    expect(syn.suspects.total).toBe(2);
  });

  it('matches the Lendshed awaiting session', () => {
    expect(columnCounts(page(FX_DD))).toBe('2 / 4 / 0');
  });

  it('matches the other Lendshed sessions', () => {
    expect(columnCounts(page(FX_RECEIPT))).toBe('1 / 2 / 0');
    expect(page(FX_RECEIPT).suspects.columns[0].items[0].kind).toBe('root cause');
    expect(columnCounts(page(FX_DOOR))).toBe('3 / 3 / 0');
    expect(columnCounts(page(FX_HOLDS))).toBe('1 / 2 / 0');
    expect(page(FX_HOLDS).suspects.columns[0].items[0].kind).toBe('root cause');
  });

  it('renders None. for an empty column and the ruled-out reason', () => {
    const html = render(syn);
    expect(html).toContain('None.');
    expect(html).toContain('Ruled out by');
    expect(html).toContain('2 considered');
    expect(html.match(/class="view-debug-suspect"/g)).toHaveLength(2);
  });
});

describe('Evidence log', () => {
  it('filters labelore by tag, defaulting to Confirms', () => {
    const ev = lb.evidence!;
    expect(filterLine(lb)).toEqual(['Confirms 2', 'Rules out 2', 'Finding 8', 'All 12']);
    expect(ev.defaultFilter).toBe('confirms');
    expect(shownNumbers(lb, 'confirms')).toEqual([4, 6]);
    expect(shownNumbers(lb, 'eliminates')).toEqual([2, 9]);
    expect(shownNumbers(lb, 'all')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(ev.multiRound).toBe(false);
    expect(roundBreaks(ev, 'all').size).toBe(0);
  });

  it('opens the synthetic session on All', () => {
    expect(filterLine(syn)).toEqual(['Finding 3', 'All 3']);
    expect(syn.evidence?.defaultFilter).toBe('all');
  });

  it('marks round dividers across rounds on the Lendshed awaiting session', () => {
    const dd = page(FX_DD).evidence!;
    expect(dd.multiRound).toBe(true);
    const all = roundBreaks(dd, 'all');
    expect([...all.keys()]).toEqual([1, 4]);
    expect(entriesFor(dd, 'all').filter((e) => e.round === [...all.values()][0])).toHaveLength(3);
    expect(entriesFor(dd, 'all').filter((e) => e.round === [...all.values()][1])).toHaveLength(10);
    expect(shownNumbers(page(FX_DD), 'confirms')).toEqual([3, 6, 12]);
    expect(roundBreaks(dd, 'confirms').has(6)).toBe(true);
  });

  it('marks round dividers across five rounds', () => {
    expect([...roundBreaks(page(FX_HOLDS).evidence!, 'all').keys()]).toEqual([1, 9, 12, 16, 19]);
  });

  it('renders the pressed filter and only matching cards, with the card parts', () => {
    const html = render(lb);
    expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Confirms/);
    expect(html.match(/<article class="view-debug-ev"/g)).toHaveLength(2);
    expect(textOf(html)).toContain('#4 · 2026-09-16');
    expect(textOf(html)).toContain('Rules out');
    const all = render(lb, { initialFilter: 'all' });
    expect(all.match(/<article class="view-debug-ev"/g)).toHaveLength(12);
    const elim = render(lb, { initialFilter: 'eliminates' });
    expect(elim.match(/<article class="view-debug-ev"/g)).toHaveLength(2);
    expect(elim).toMatch(/view-debug-impl/);
    expect(render(syn).match(/<article class="view-debug-ev"/g)).toHaveLength(3);
  });
});

describe('Also in this session', () => {
  it('lists the other sections, the reasoning checkpoint and the frontmatter', () => {
    expect(lb.also.map((a) => a.label)).toEqual(['Postmortem', 'Reasoning checkpoint', 'Frontmatter']);
    expect(syn.also.map((a) => a.label)).toEqual(['Frontmatter']);
  });

  it('points each chip at its heading id, null for Frontmatter', () => {
    const m = page(LB, [
      { id: 'postmortem', text: 'Postmortem', depth: 2 },
      { id: 'current-focus', text: 'Current Focus', depth: 2 },
    ]);
    expect(m.also.map((a) => a.targetId)).toEqual(['postmortem', 'current-focus', null]);
  });

  it('shows no Frontmatter chip without frontmatter, and no row when empty', () => {
    const parsed = DebugHandler.parse(
      { path: '.planning/debug/a.md', content: '## Current Focus\n\nhypothesis: h\n', mtimeMs: 0, size: 1 },
      refOf('.planning/debug/a.md'),
    );
    const m = composeDebugCase({
      kind: 'debug',
      frontmatter: {},
      structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
      groups: [],
      planSegments: [],
    });
    expect(m?.also).toEqual([]);
    expect(render(m!)).not.toContain('Also in this session');
  });

  it('uses distinct short names for the long sessions', () => {
    expect(page(FX_HOLDS).also.map((a) => a.label)).toEqual([
      'Suspected cause chain',
      'Secondary kiosk defects',
      'Cross-service release note',
      'Second pass',
      'Second-pass deployment state',
      'Third pass — UAT evidence',
      'Third pass — checking the code',
      'Third pass — fixes applied',
      'Third pass deployment state',
      'Fourth pass',
      'Fourth pass UAT',
      'Frontmatter',
    ]);
    expect(page(FX_DOOR).also.map((a) => a.label)).toEqual([
      'Context',
      'Answers to open questions',
      'Follow-up hook points',
      'Field diagnostics',
      'Reasoning checkpoint',
      'Frontmatter',
    ]);
    expect(page(FX_DOOR).also[2].title).toContain('NOT implemented');
  });
});
