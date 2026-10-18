// quick-261018-j5h (sketch 023 A): the DEBUG composer and its view, pinned against the two files that
// always exist (labelore's resolved session and the copied synthetic investigating one), the sibling
// sketch sessions when present, and inline sessions for the branches those do not cover. ViewInput
// literals are built from the handler's real parse of each file; pinned values come from the sketch's
// own data.js and model functions and the source files, never from the composer's output.
process.env.TZ = 'Asia/Kolkata';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
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
import { composeDebugCase } from '../../src/web/views/debug-case.ts';
import type { ComposedDebugCase } from '../../src/web/views/debug-case.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { DebugCaseView } from '../../src/web/views/debug-case-components.tsx';

const LB = new URL('../../.planning/debug/resolved/loading-state-regression.md', import.meta.url).pathname;
const KB = new URL('../../.planning/debug/knowledge-base.md', import.meta.url).pathname;
const SYN = new URL('../fixtures/debug/search-index-goes-stale.md', import.meta.url).pathname;
const DD = join(homedir(), 'Work/Ibis/deid/deid-ui/.planning/debug/mr-series-selection-picks-dwi.md');
const SA = join(homedir(), 'Work/Sideby/plan.sideby.me/.planning/debug/sfu-no-audio.md');
const RS = join(homedir(), 'Work/Ibis/resoundant/.planning/debug/resolved/heartbeat-stops-after-net-drop.md');
const SR = join(homedir(), 'Work/Sideby/plan.sideby.me/.planning/debug/sfu-reconnect-presence.md');

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'debug', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, ...extra };
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
  it.runIf(existsSync(DD))('deid: waiting on you, what to check first', () => {
    const m = page(DD);
    expect(m.status).toEqual({ label: 'Waiting on you', tone: 'in-flight' });
    expect([m.lead.variant, m.lead.kicker]).toEqual(['awaiting', 'Fixed, waiting on your check']);
    expect(m.lead.next?.label).toBe('What you need to check');
    expect(m.lead.next?.text.startsWith('human opens http://localhost:3001/face-recon/141 (hard reload)')).toBe(true);
    expect(m.lead.causes?.items.map((c) => c.label)).toEqual(['CODE', 'DATA/ENVIRONMENT']);
    expect(m.lead.fix?.label).toBe('Fix applied');
    expect(m.lead.verification?.chips?.map((c) => c.name)).toEqual([
      'Target test',
      'Mutation check',
      'No op deletion',
      'Adjacent tests',
      'Revert and reconfirm',
      'Live',
    ]);
    expect(m.lead.files?.items).toHaveLength(5);
    expect(m.facts.map((f) => `${f.label} ${f.value}`)).toEqual(['Bug class Bohrbug', 'Evidence 15', 'Ruled out 3', 'Rounds 2']);
    expect(m.head).toMatchObject({ title: 'Mr series selection picks dwi', opened: '23 Sep 2026', updated: '19:40' });
  });

  it.runIf(existsSync(SA))('sideby: diagnosed with a suggestion', () => {
    const m = page(SA);
    expect(m.status).toEqual({ label: 'Diagnosed · not fixed', tone: 'in-flight' });
    expect([m.lead.variant, m.lead.kicker]).toEqual(['diagnosed', 'Root cause found · not fixed yet']);
    expect(m.lead.causes?.items.map((c) => c.label)).toEqual(['PRIMARY', 'SECONDARY']);
    expect(m.lead.fix?.label).toBe('Suggested fix · not applied');
    expect(m.lead.verification).toBeNull();
    expect(m.head.title).toBe('Sfu no audio');
    expect(m.head.updated).toBeNull();
  });

  it.runIf(existsSync(RS))('resoundant: archived, long trigger folded, a literal local-time-free stamp', () => {
    const m = page(RS);
    expect(m.head).toMatchObject({ title: 'Heartbeat stops after net drop', opened: '3 Oct 2026', updated: '12 Oct 2026 · 22:10', archived: true });
    expect(m.trigger?.text).toHaveLength(366);
    expect(m.trigger?.short).not.toBeNull();
    expect(m.trigger?.short?.endsWith(' …')).toBe(true);
    expect(m.facts[0]).toEqual({ label: 'Bug class', value: 'Mandelbug' });
    expect(m.lead.causes?.items.map((c) => c.label)).toEqual(['Cause 1', 'Cause 2', 'Cause 3']);
    expect(m.lead.fix?.text).toBe('APPLIED 2026-10-06 — Option A only (user decision).');
    expect(m.lead.files?.items).toHaveLength(8);
  });

  it.runIf(existsSync(SR))('sideby: five rounds, a sentence for the verification', () => {
    const m = page(SR);
    expect(m.facts.map((f) => `${f.label} ${f.value}`)).toEqual(['Evidence 25', 'Ruled out 2', 'Rounds 5']);
    expect(m.trigger?.text).toHaveLength(265);
    expect(m.trigger?.short).not.toBeNull();
    expect(m.lead.causes?.items.map((c) => [c.label, c.cut])).toEqual([
      ['Cause 1', true],
      ['Cause 2', true],
      ['Cause 3', false],
    ]);
    expect(m.lead.verification).toEqual({
      kicker: 'Verified',
      chips: null,
      text: 'Round 1 VERIFIED (media-sdk v0.2.0 published, watch fc9a8f4 bumped to ^0.2.0).',
    });
    expect(m.head).toMatchObject({ opened: '29 Jun 2026', updated: '30 Jun 2026' });
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
