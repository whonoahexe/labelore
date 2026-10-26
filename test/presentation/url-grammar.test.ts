import { describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import {
  addressOfPath,
  buildUrl,
  fileUrlOf,
  milestoneSegmentOf,
  normalizePhaseNumber,
  parseRoutePath,
  phaseSegmentOf,
} from '../../src/presentation/routes.ts';
import type { AddressOwner, PageName, Route } from '../../src/presentation/routes.ts';

// The readable URL grammar (D-01 to D-07 and the discretion choices), pinned scope by scope.

const owned = (milestoneVersion: string | null, number: string, projectCode: string | null = null): AddressOwner => ({
  phase: { milestoneVersion, number, projectCode, slug: 'x' },
});

function routeOf(input: string): Route {
  const parsed = parseRoutePath(input);
  if (!parsed.ok) throw new Error(`${input} did not parse: ${parsed.error.code} ${parsed.error.message}`);
  return parsed.route;
}

describe('addressOfPath - phase folders (D-05, D-06)', () => {
  it.each<[string, AddressOwner, string]>([
    ['.planning/milestones/v1.1-phases/05-x/05-03-PLAN.md', owned('v1.1', '05'), '/v1.1/phase-5/plan-03'],
    ['.planning/milestones/v1.1-phases/05-x/05-03-SUMMARY.md', owned('v1.1', '05'), '/v1.1/phase-5/plan-03/summary'],
    ['.planning/phases/05-x/05-CONTEXT.md', owned('v1.1', '05'), '/v1.1/phase-5/context'],
    ['.planning/phases/05-x/05-VERIFICATION.md', owned('v1.1', '05'), '/v1.1/phase-5/verification'],
    ['.planning/phases/05-x/05-UI-SPEC.md', owned('v1.1', '05'), '/v1.1/phase-5/ui-spec'],
    ['.planning/phases/05-x/05-100-PLAN.md', owned('v1.1', '05'), '/v1.1/phase-5/plan-100'],
    ['.planning/phases/02.1-x/02.1-01-PLAN.md', owned('v1.1', '02.1'), '/v1.1/phase-2.1/plan-01'],
    ['.planning/phases/12A-x/12A-CONTEXT.md', owned('v1.1', '12A'), '/v1.1/phase-12a/context'],
    ['.planning/phases/KR-03-x/03-CONTEXT.md', owned('v1.1', '03', 'KR'), '/v1.1/phase-kr-3/context'],
    ['.planning/phases/02-x/02-CONTEXT.md', owned(null, '02'), '/phase-2/context'],
    ['.planning/phases/02-x/02-01-PLAN.md', owned(null, '02'), '/phase-2/plan-01'],
  ])('%s -> %s', (path, owner, url) => {
    expect(addressOfPath(path, owner)).toBe(url);
  });

  it.each<[string, AddressOwner]>([
    ['.planning/phases/02-x/03-RESEARCH.md', owned('v1.1', '02')],
    ['.planning/phases/02-x/03-01-PLAN.md', owned('v1.1', '02')],
    ['.planning/phases/02-x/03-01-SUMMARY.md', owned('v1.1', '02')],
  ])('a prefix that is not its folder\'s number takes the file/ address: %s', (path, owner) => {
    expect(addressOfPath(path, owner)).toBe(fileUrlOf(path));
  });

  it('puts the recognised unprefixed files under their lower-cased kind token', () => {
    const owner = owned('v1.1', '02');
    expect(addressOfPath('.planning/phases/02-x/COVERAGE.md', owner)).toBe('/v1.1/phase-2/coverage');
    expect(addressOfPath('.planning/phases/02-x/deferred-items.md', owner)).toBe('/v1.1/phase-2/deferred-items');
    expect(addressOfPath('.planning/phases/02-x/SKELETON.md', owner)).toBe('/v1.1/phase-2/skeleton');
    expect(addressOfPath('.planning/phases/02-x/.continue-here.md', owner)).toBe('/v1.1/phase-2/continue-here');
  });

  it('keeps case and drops only .md for free-form files, with nested slashes and kept extensions', () => {
    const owner = owned('v1.1', '02');
    expect(addressOfPath('.planning/phases/02-x/Notes.md', owner)).toBe('/v1.1/phase-2/Notes');
    expect(addressOfPath('.planning/phases/02-x/scratch/mixing order.md', owner)).toBe('/v1.1/phase-2/scratch/mixing%20order');
    expect(addressOfPath('.planning/phases/02-x/kiln-floor.png', owner)).toBe('/v1.1/phase-2/kiln-floor.png');
    expect(addressOfPath('.planning/phases/02-x/sheet.json', owner)).toBe('/v1.1/phase-2/sheet.json');
  });

  it.each(['plan-01.md', 'Plan-02.md', 'plan-03/summary.md', 'plan-7/anything.md'])(
    'a free-form name that touches plan-<digits> (%s) takes the file/ address, never shadowing a plan',
    (name) => {
      const path = `.planning/phases/02-x/${name}`;
      expect(addressOfPath(path, owned('v1.1', '02'))).toBe(fileUrlOf(path));
    },
  );

  it('uses the owner\'s milestone, escaped when the version is not GSD-shaped', () => {
    expect(addressOfPath('.planning/phases/01-x/01-CONTEXT.md', owned('v1.0 / 旧', '01'))).toBe(
      '/milestone-v1.0%20%2F%20%E6%97%A7/phase-1/context',
    );
  });

  it('gives a phase file with no owner its file/ address', () => {
    const path = '.planning/phases/02-x/02-CONTEXT.md';
    expect(addressOfPath(path, null)).toBe(fileUrlOf(path));
  });
});

describe('addressOfPath - quick tasks (D-07)', () => {
  it.each<[string, string]>([
    ['.planning/quick/261024-qhq-some-slug/261024-qhq-PLAN.md', '/quick/261024-qhq'],
    ['.planning/quick/261024-qhq-some-slug/261024-qhq-SUMMARY.md', '/quick/261024-qhq/summary'],
    ['.planning/quick/261024-qhq-some-slug/261024-qhq-CONTEXT.md', '/quick/261024-qhq/context'],
    ['.planning/quick/261024-qhq-some-slug/261024-qhq-VERIFICATION.md', '/quick/261024-qhq/verification'],
    ['.planning/milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-PLAN.md', '/quick/260310-a7c'],
    ['.planning/milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-SUMMARY.md', '/quick/260310-a7c/summary'],
    ['.planning/quick/261024-qhq-some-slug/COVERAGE.md', '/quick/261024-qhq/coverage'],
    ['.planning/quick/261024-qhq-some-slug/notes.md', '/quick/261024-qhq/notes'],
    ['.planning/quick/261024-qhq-some-slug/scratch/Draft One.md', '/quick/261024-qhq/scratch/Draft%20One'],
  ])('%s -> %s', (path, url) => {
    expect(addressOfPath(path, null)).toBe(url);
  });

  it.each([
    '.planning/quick/261024-qhq-some-slug/261020-zzz-PLAN.md',
    '.planning/quick/README.md',
    '.planning/quick/stray-dir/notes.md',
    '.planning/milestones/v1.0-quick/README.md',
    '.planning/quick/261024-qhq-some-slug/summary.md',
    '.planning/quick/261024-qhq-some-slug/summary/extra.md',
  ])('%s takes the file/ address', (path) => {
    expect(addressOfPath(path, null)).toBe(fileUrlOf(path));
  });
});

describe('addressOfPath - the folder table', () => {
  it.each<[string, string]>([
    ['.planning/codebase/ARCHITECTURE.md', '/codebase/architecture'],
    ['.planning/research/STACK.md', '/research/stack'],
    ['.planning/spikes/CONVENTIONS.md', '/spikes/conventions'],
    ['.planning/spikes/001-kiln-sensor/README.md', '/spikes/001-kiln-sensor/readme'],
    ['.planning/sketches/001-shelf-board/state.json', '/sketches/001-shelf-board/state.json'],
    ['.planning/notes/per-kind-artifact-rendering.md', '/notes/per-kind-artifact-rendering'],
    ['.planning/notes/Foo Bar.md', '/notes/Foo%20Bar'],
    ['.planning/notes/foo.json', '/notes/foo.json'],
    ['.planning/todos/pending/Fix-It.md', '/todos/pending/Fix-It'],
    ['.planning/debug/resolved/leaky-cache.md', '/debug/resolved/leaky-cache'],
    ['.planning/seeds/SEED-001-glaze-library.md', '/seeds/SEED-001-glaze-library'],
    ['.planning/threads/kiln-vendor-call.md', '/threads/kiln-vendor-call'],
    ['.planning/intel/files.json', '/intel/files.json'],
    ['.planning/graphs/graph.json', '/graphs/graph.json'],
    ['.planning/ui-reviews/screenshots/glaze-panel.png', '/ui-reviews/screenshots/glaze-panel.png'],
    ['.planning/ui-reviews/Review One.md', '/ui-reviews/Review%20One.md'],
  ])('%s -> %s', (path, url) => {
    expect(addressOfPath(path, null)).toBe(url);
  });

  it.each([
    '.planning/weird/x.md',
    '.planning/workstreams/alpha/STATE.md',
    '.planning/phases/README.md',
    '.planning/phases/notes/foo.md',
    '.planning/milestones/v1.0-phases/README.md',
    '.planning/milestones/notes/x.md',
    '.planning/milestones/stray.txt',
  ])('%s takes the file/ address (unknown or reserved folder, stray, or location other)', (path) => {
    expect(addressOfPath(path, null)).toBe(fileUrlOf(path));
  });

  it('keeps the full file name when the dropped-extension name would be empty, "." or ".."', () => {
    expect(addressOfPath('.planning/notes/..md', null)).toBe('/notes/..md');
    expect(addressOfPath('.planning/notes/.md', null)).toBe('/notes/.md');
    expect(addressOfPath('.planning/notes/...md', null)).toBe('/notes/...md');
    expect(addressOfPath('.planning/codebase/..md', null)).toBe('/codebase/..md');
  });

  it('never emits a "." or ".." segment, whatever the file is called', () => {
    for (const name of ['..md', '.md', '...md', '.md.md']) {
      for (const dir of ['notes', 'codebase', 'intel']) {
        const url = addressOfPath(`.planning/${dir}/${name}`, null);
        for (const segment of url.slice(1).split('/')) expect(['', '.', '..']).not.toContain(segment);
      }
    }
  });
});

describe('addressOfPath - milestone scope (D-02 to D-04)', () => {
  it.each<[string, string]>([
    ['.planning/milestones/v1.0-ROADMAP.md', '/v1.0/roadmap'],
    ['.planning/milestones/v1.0-REQUIREMENTS.md', '/v1.0/requirements'],
    ['.planning/milestones/v1.0-MILESTONE-AUDIT.md', '/v1.0/audit'],
    ['.planning/milestones/v1.0-Retro-Notes.md', '/v1.0/retro-notes'],
    ['.planning/v1.0-ROADMAP.md', '/v1.0/roadmap'],
    ['.planning/milestones/v1.0-research/STACK.md', '/v1.0/research/stack'],
    ['.planning/milestones/v1.0-misc/Note One.md', '/v1.0/misc/Note%20One'],
  ])('%s -> %s', (path, url) => {
    expect(addressOfPath(path, null)).toBe(url);
  });

  it.each([
    '.planning/milestones/v1.0-OVERVIEW.md',
    '.planning/milestones/v1.0-PHASE-5.md',
    '.planning/milestones/v1.0-milestone-x.md',
    '.planning/milestones/v1.0-overview/x.md',
    '.planning/milestones/v1.0-workstreams/x.md',
  ])('%s takes the file/ address (reserved inside a milestone)', (path) => {
    expect(addressOfPath(path, null)).toBe(fileUrlOf(path));
  });
});

describe('addressOfPath - root files', () => {
  it.each<[string, string]>([
    ['.planning/ROADMAP.md', '/roadmap'],
    ['.planning/STATE.md', '/state'],
    ['.planning/PROJECT.md', '/project'],
    ['.planning/REQUIREMENTS.md', '/requirements'],
    ['.planning/MILESTONES.md', '/milestones'],
    ['.planning/config.json', '/settings'],
    ['.planning/HANDOFF.json', '/handoff'],
    ['.planning/PATTERNS.md', '/patterns'],
    ['.planning/.continue-here.md', '/continue-here'],
    ['.planning/Notes.txt', '/notes.txt'],
    ['.planning/..md', '/..md'],
    ['.planning/.md', '/.md'],
  ])('%s -> %s', (path, url) => {
    expect(addressOfPath(path, null)).toBe(url);
  });

  it.each([
    'SEARCH.md',
    'TRACEABILITY.md',
    'RESEARCH.md',
    'SKETCHES.md',
    'SETTINGS.md',
    'settings.json',
    'OVERVIEW.md',
    'roadmap.md',
    'ROADMAP.json',
    'V1.2.md',
    'phase-3.md',
    'Milestone-x.md',
  ])('the root file %s would shadow a page or a prefix, so it takes the file/ address', (name) => {
    const path = `.planning/${name}`;
    expect(addressOfPath(path, null)).toBe(fileUrlOf(path));
  });
});

describe('segments of milestones and phases', () => {
  it.each(['v1.1', 'v2.0.3', 'V1.1'])('a GSD-shaped version %s is its own segment', (version) => {
    expect(milestoneSegmentOf(version)).toBe(version);
  });

  it.each([
    ['v1.0 / 旧', 'milestone-v1.0%20%2F%20%E6%97%A7'],
    ['roadmap', 'milestone-roadmap'],
    ['phase-2', 'milestone-phase-2'],
    ['v1', 'milestone-v1'],
    ['1.1', 'milestone-1.1'],
  ])('the version %s gets one milestone- prefix and parses back to the exact version', (version, segment) => {
    expect(milestoneSegmentOf(version)).toBe(segment);
    expect(routeOf(`/${segment}`)).toEqual({ kind: 'milestone', milestone: version });
    expect(routeOf(`/${segment}/overview`)).toEqual({ kind: 'overview', milestone: version });
  });

  it('refuses an empty version or phase number', () => {
    expect(() => milestoneSegmentOf('')).toThrow(TypeError);
    expect(() => phaseSegmentOf({ projectCode: null, number: '' })).toThrow(TypeError);
  });

  it.each([
    ['05', '5'],
    ['0', '0'],
    ['02.1', '2.1'],
    ['12A', '12a'],
    ['3.2.1', '3.2.1'],
    ['007.010', '7.10'],
    ['01.2 / β', '01.2 / β'],
  ])('normalises the phase number %s to %s', (raw, normalised) => {
    expect(normalizePhaseNumber(raw)).toBe(normalised);
  });

  it('writes the phase segment with the lower-cased project code', () => {
    expect(phaseSegmentOf({ projectCode: null, number: '02.1' })).toBe('phase-2.1');
    expect(phaseSegmentOf({ projectCode: 'KR', number: '03' })).toBe('phase-kr-3');
    expect(phaseSegmentOf({ projectCode: 'LORE_2', number: '12A' })).toBe('phase-lore_2-12a');
  });
});

describe('parseRoutePath', () => {
  it.each<[string, Route]>([
    ['/', { kind: 'dashboard' }],
    ['/search', { kind: 'page', page: 'search' }],
    ['/roadmap', { kind: 'page', page: 'roadmap' }],
    ['/v1.1', { kind: 'milestone', milestone: 'v1.1' }],
    ['/v1.1/overview', { kind: 'overview', milestone: 'v1.1' }],
    ['/overview', { kind: 'overview', milestone: null }],
    ['/v1.1/phase-5', { kind: 'phase', milestone: 'v1.1', phase: { projectCode: null, number: '5' }, heading: null }],
    ['/phase-2.1', { kind: 'phase', milestone: null, phase: { projectCode: null, number: '2.1' }, heading: null }],
    ['/v1.1/phase-kr-3', { kind: 'phase', milestone: 'v1.1', phase: { projectCode: 'kr', number: '3' }, heading: null }],
    [
      '/v1.1/phase-5/plan-03',
      { kind: 'plan', milestone: 'v1.1', phase: { projectCode: null, number: '5' }, planNumber: '03', doc: 'plan', heading: null },
    ],
    [
      '/v1.1/phase-5/plan-03/summary',
      { kind: 'plan', milestone: 'v1.1', phase: { projectCode: null, number: '5' }, planNumber: '03', doc: 'summary', heading: null },
    ],
    [
      '/phase-2/plan-01/summary',
      { kind: 'plan', milestone: null, phase: { projectCode: null, number: '2' }, planNumber: '01', doc: 'summary', heading: null },
    ],
    ['/milestones/m~v1.1', { kind: 'legacy', pathname: '/milestones/m~v1.1' }],
    ['/milestones/current/phases/p~n~n~v01~vx', { kind: 'legacy', pathname: '/milestones/current/phases/p~n~n~v01~vx' }],
    ['/artifacts/a~x', { kind: 'legacy', pathname: '/artifacts/a~x' }],
    ['/milestones', { kind: 'document', url: '/milestones', heading: null }],
    ['/artifacts', { kind: 'document', url: '/artifacts', heading: null }],
    ['/milestones/other', { kind: 'document', url: '/milestones/other', heading: null }],
    ['/v1.1/roadmap', { kind: 'document', url: '/v1.1/roadmap', heading: null }],
    ['/v1.1/phase-5/context', { kind: 'document', url: '/v1.1/phase-5/context', heading: null }],
    ['/v1.1/phase-5/plan-03/other', { kind: 'document', url: '/v1.1/phase-5/plan-03/other', heading: null }],
    ['/codebase/architecture', { kind: 'document', url: '/codebase/architecture', heading: null }],
    ['/file/phases/README.md', { kind: 'document', url: '/file/phases/README.md', heading: null }],
  ])('%s', (input, route) => {
    expect(routeOf(input)).toEqual(route);
  });

  it('ignores one trailing slash', () => {
    expect(routeOf('/v1.1/phase-5/')).toEqual(routeOf('/v1.1/phase-5'));
    expect(routeOf('/codebase/architecture/')).toEqual(routeOf('/codebase/architecture'));
  });

  it('gives alternative percent spellings of an unreserved character one canonical url', () => {
    expect(routeOf('/notes/a%7Eb')).toEqual({ kind: 'document', url: '/notes/a%7Eb', heading: null });
    expect(routeOf('/notes/a~b')).toEqual(routeOf('/notes/a%7Eb'));
    expect(routeOf('/notes/%41')).toEqual(routeOf('/notes/A'));
    expect(routeOf('/v1.1/phase-05/context')).toEqual(routeOf('/v1.1/phase-5/context'));
    expect(routeOf('/milestone-v1.1/overview')).toEqual(routeOf('/v1.1/overview'));
  });

  it('reads a fragment as the heading', () => {
    expect(routeOf('/v1.1/phase-5/context#Heading')).toEqual({
      kind: 'document',
      url: '/v1.1/phase-5/context',
      heading: 'Heading',
    });
    expect(routeOf('/v1.1/phase-5#Why%20now')).toMatchObject({ kind: 'phase', heading: 'Why now' });
    expect(routeOf('/v1.1/phase-5/plan-03/summary#A%2FB')).toMatchObject({ kind: 'plan', doc: 'summary', heading: 'A/B' });
  });

  it.each<[string, string]>([
    ['', 'unsupported-route'],
    ['codebase/architecture', 'unsupported-route'],
    ['//host', 'empty-token'],
    ['/a//b', 'empty-token'],
    ['/a//', 'empty-token'],
    ['/a/%E0%A4%A', 'malformed-token'],
    ['/a/%', 'malformed-token'],
    ['/file/%2E%2E/x', 'malformed-token'],
    ['/notes/%2e', 'malformed-token'],
    ['/phase-', 'malformed-token'],
    ['/v1.1/phase-', 'malformed-token'],
    ['/milestone-', 'malformed-token'],
    ['/x#', 'empty-token'],
    ['/x#%E0', 'malformed-token'],
  ])('fails closed for %j', (input, code) => {
    const parsed = parseRoutePath(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.code).toBe(code);
  });

  it('parses a very long hostile path in one pass', () => {
    for (const hostile of [
      `/${'x'.repeat(300_000)}`,
      `/${'%41'.repeat(100_000)}`,
      '/a'.repeat(100_000),
      `/phase-${'a-'.repeat(50_000)}9`,
      `/v1.1/phase-${'1.'.repeat(50_000)}`,
    ]) {
      expect(() => parseRoutePath(hostile)).not.toThrow();
    }
  });
});

describe('encoding: each segment is encoded once and decoded once', () => {
  it.each<[string, string, string]>([
    ['kiln % notes.md', '/notes/kiln%20%25%20notes', '/file/notes/kiln%20%25%20notes.md'],
    ['glaze #2.md', '/notes/glaze%20%232', '/file/notes/glaze%20%232.md'],
    ['über-glaze.md', '/notes/%C3%BCber-glaze', '/file/notes/%C3%BCber-glaze.md'],
    ['a%2Fb.md', '/notes/a%252Fb', '/file/notes/a%252Fb.md'],
    ['100%.md', '/notes/100%25', '/file/notes/100%25.md'],
    ['what?.md', '/notes/what%3F', '/file/notes/what%3F.md'],
    ['a~b.md', '/notes/a%7Eb', '/file/notes/a%7Eb.md'],
  ])('%s', (name, url, fileUrl) => {
    const path = `.planning/notes/${name}`;
    expect(addressOfPath(path, null)).toBe(url);
    expect(fileUrlOf(path)).toBe(fileUrl);
    // Decoded once, the url's last segment is exactly the file name without .md (never decoded twice).
    const last = (url.split('/').pop() as string);
    expect(decodeURIComponent(last)).toBe(name.slice(0, -'.md'.length));
    // And it survives the browser's own URL normalisation and the parser unchanged.
    expect(new URL(url, 'http://labelore.local').pathname).toBe(url);
    expect(routeOf(url)).toEqual({ kind: 'document', url, heading: null });
    expect(routeOf(fileUrl)).toEqual({ kind: 'document', url: fileUrl, heading: null });
  });
});

describe('the five example addresses build and parse exactly (NAV-09)', () => {
  it.each<[string, string, AddressOwner]>([
    ['/v1.1/phase-5/plan-03', '.planning/milestones/v1.1-phases/05-x/05-03-PLAN.md', owned('v1.1', '05')],
    ['/quick/261024-qhq/summary', '.planning/quick/261024-qhq-slug/261024-qhq-SUMMARY.md', null],
    ['/codebase/architecture', '.planning/codebase/ARCHITECTURE.md', null],
    ['/notes/per-kind-artifact-rendering', '.planning/notes/per-kind-artifact-rendering.md', null],
    ['/roadmap', '.planning/ROADMAP.md', null],
  ])('%s', (url, path, owner) => {
    expect(addressOfPath(path, owner)).toBe(url);
    expect(buildUrl(routeOf(url))).toBe(url);
  });
});

describe('round trip: buildUrl(parseRoutePath(buildUrl(route))) equals buildUrl(route)', () => {
  const milestones = ['v1.0 / 旧', 'v1.1', 'v2.0.3', 'roadmap', 'phase-2', 'milestone-x', null];
  const codes = [null, 'LORE', 'kr_2'];
  const numbers = ['02.1', '12A', '3.2.1', '05'];
  const headings = [null, 'A heading / with #hash %2F 日本語'];
  const pages: PageName[] = ['roadmap', 'search', 'traceability', 'research', 'sketches'];

  const routes: Route[] = [{ kind: 'dashboard' }, { kind: 'overview', milestone: null }];
  for (const page of pages) routes.push({ kind: 'page', page });
  for (const milestone of milestones) {
    if (milestone !== null) {
      routes.push({ kind: 'milestone', milestone }, { kind: 'overview', milestone });
      routes.push({ kind: 'document', url: `/${milestoneSegmentOf(milestone)}/roadmap`, heading: null });
    }
    for (const projectCode of codes) {
      for (const number of numbers) {
        const phase = { projectCode: projectCode === null ? null : projectCode.toLowerCase(), number: normalizePhaseNumber(number) };
        for (const heading of headings) {
          routes.push({ kind: 'phase', milestone, phase, heading });
          for (const doc of ['plan', 'summary'] as const) {
            routes.push({ kind: 'plan', milestone, phase, planNumber: '03', doc, heading });
          }
        }
      }
    }
  }

  it('holds for every route kind built from hostile identities', () => {
    expect(routes.length).toBeGreaterThan(100);
    for (const route of routes) {
      const url = buildUrl(route);
      expect(url.startsWith('/')).toBe(true);
      expect(url.startsWith('//')).toBe(false);
      const parsed = parseRoutePath(url);
      expect(parsed.ok, url).toBe(true);
      if (parsed.ok) expect(buildUrl(parsed.route), url).toBe(url);
    }
  });

  it('parses a built url back to the same milestone, phase and plan', () => {
    const identity: PhaseIdentity = { milestoneVersion: 'v1.0 / 旧', number: '12A', projectCode: 'LORE', slug: 'x' };
    const url = buildUrl({
      kind: 'plan',
      milestone: identity.milestoneVersion,
      phase: { projectCode: 'lore', number: normalizePhaseNumber(identity.number) },
      planNumber: '07',
      doc: 'summary',
      heading: null,
    });
    expect(routeOf(url)).toEqual({
      kind: 'plan',
      milestone: 'v1.0 / 旧',
      phase: { projectCode: 'lore', number: '12a' },
      planNumber: '07',
      doc: 'summary',
      heading: null,
    });
  });
});
