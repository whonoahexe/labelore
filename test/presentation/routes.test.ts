// The four builders every importer uses (07-06): same names and signatures as before, now emitting the
// readable grammar. The grammar itself (addressOfPath, parseRoutePath) is pinned in url-grammar.test.ts;
// this file pins what the builders produce, that their output parses back to the route it names, and that
// hostile identities stay one inert, stable address.
import { describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import {
  addressOfPath,
  buildArtifactUrl,
  buildMilestoneUrl,
  buildPhaseUrl,
  buildPlanSummaryUrl,
  buildPlanUrl,
  buildUrl,
  milestoneKeyOf,
  parsePresentationUrl,
  parseRoutePath,
  phaseKeyOf,
  presentationRoutePatterns,
} from '../../src/presentation/routes.ts';

const active: PhaseIdentity = {
  milestoneVersion: null,
  number: '01.2 / β',
  projectCode: 'LORE / 日本語',
  slug: 'route.codec / Δ',
};

const archived: PhaseIdentity = {
  ...active,
  milestoneVersion: 'v1.0 / archive',
};

const live: PhaseIdentity = { milestoneVersion: 'v1.1', number: '05', projectCode: null, slug: 'per-type-views' };

/** The url a builder produced, parsed and rebuilt: the readable grammar round-trips every url it emits. */
function roundTrip(url: string): string {
  const parsed = parseRoutePath(url);
  if (!parsed.ok) throw new Error(`${url} did not parse: ${parsed.error.code}`);
  return buildUrl(parsed.route);
}

describe('the builders emit the readable grammar', () => {
  it('phase and plan urls always carry the milestone segment (D-01)', () => {
    expect(buildPhaseUrl(live)).toBe('/v1.1/phase-5');
    expect(buildPlanUrl(live, '05-03')).toBe('/v1.1/phase-5/plan-03');
    expect(buildPlanSummaryUrl(live, '05-03')).toBe('/v1.1/phase-5/plan-03/summary');
    expect(buildMilestoneUrl('v1.1')).toBe('/v1.1/overview');
    expect(buildMilestoneUrl(null)).toBe('/overview');
  });

  it('an artifact url is the address its path would like, with or without an owning phase (D-05, D-06)', () => {
    expect(buildArtifactUrl(live, '.planning/phases/05-x/05-CONTEXT.md')).toBe('/v1.1/phase-5/context');
    expect(buildArtifactUrl(null, '.planning/STATE.md')).toBe('/state');
    expect(buildArtifactUrl(null, '.planning/config.json')).toBe('/settings');
    expect(buildArtifactUrl(live, '.planning/phases/05-x/05-03-PLAN.md')).toBe(buildPlanUrl(live, '05-03'));
    expect(buildArtifactUrl(live, '.planning/phases/05-x/05-03-SUMMARY.md')).toBe(buildPlanSummaryUrl(live, '05-03'));
    expect(buildArtifactUrl(null, '.planning/phases/05-x/05-CONTEXT.md')).toBe(
      addressOfPath('.planning/phases/05-x/05-CONTEXT.md', null),
    );
  });

  it('keeps active and archived duplicate phase numbers distinct', () => {
    expect(milestoneKeyOf(null)).toBe('current');
    expect(milestoneKeyOf(archived.milestoneVersion)).not.toBe(milestoneKeyOf(null));
    expect(phaseKeyOf(active)).not.toBe(phaseKeyOf(archived));
    expect(buildPhaseUrl(active)).not.toBe(buildPhaseUrl(archived));
  });

  it('round-trips every builder, hostile identities, plan ids and headings included', () => {
    const milestone = 'v2.0 / 日本語 %2F';
    const phase = { ...active, milestoneVersion: milestone };
    const planId = '02-07 / plan.%2F 雪';
    const artifactPath = '.planning/phases/02.x / nested/%2F/研究.md';
    const heading = 'Why dots/slashes / %2F stay 同一';

    const urls = [
      buildMilestoneUrl(milestone),
      buildPhaseUrl(phase),
      buildPhaseUrl(phase, heading),
      buildPlanUrl(phase, planId, heading),
      buildPlanSummaryUrl(phase, planId),
      buildArtifactUrl(phase, artifactPath, heading),
      buildArtifactUrl(null, artifactPath),
    ];
    for (const url of urls) {
      expect(url).not.toContain(' ');
      expect(url.startsWith('/')).toBe(true);
      expect(roundTrip(url), url).toBe(url);
    }
  });

  it('keeps a hostile plan id inside one segment: it can never add a scope or a segment', () => {
    const url = buildPlanUrl(live, '05-../../../etc/passwd');
    expect(url.split('/')).toHaveLength(4);
    const parsed = parseRoutePath(url);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.route.kind).not.toBe('plan');
  });

  it('names a plan route for a well-formed plan id', () => {
    const parsed = parseRoutePath(buildPlanUrl(live, '05-03', 'Tasks'));
    expect(parsed).toEqual({
      ok: true,
      route: {
        kind: 'plan',
        milestone: 'v1.1',
        phase: { projectCode: null, number: '5' },
        planNumber: '03',
        doc: 'plan',
        heading: 'Tasks',
      },
    });
  });

  it('normalizes headings with accidental leading hashes', () => {
    expect(buildArtifactUrl(null, '.planning/STATE.md', '#blockersconcerns')).toBe('/state#blockersconcerns');
    expect(buildArtifactUrl(null, '.planning/STATE.md', '###blockersconcerns')).toBe('/state#blockersconcerns');
    expect(buildPhaseUrl(live, '#Goal')).toBe('/v1.1/phase-5#Goal');
  });

  it('refuses an empty plan id and an empty heading', () => {
    expect(() => buildPlanUrl(live, '')).toThrow(TypeError);
    expect(() => buildArtifactUrl(null, '.planning/STATE.md', '###')).toThrow(TypeError);
  });

  it('gives traversal-shaped artifact text a file/ address that the parser then refuses', () => {
    const artifactPath = '../../../../etc/passwd / %2e%2e';
    const url = buildArtifactUrl(archived, artifactPath);
    expect(url.startsWith('/file/')).toBe(true);
    // A dot segment is never a parseable address, so such a url can resolve nothing.
    expect(parseRoutePath(url).ok).toBe(false);
    // Encoded text that merely looks like dots stays inert: one decode, never two.
    const lookalike = buildArtifactUrl(archived, '.planning/notes/%2e%2e/x.md');
    expect(lookalike).toBe('/notes/%252e%252e/x');
    expect(roundTrip(lookalike)).toBe(lookalike);
  });
});

describe('the old parser name is the readable parser', () => {
  it('parses dashboard and page routes', () => {
    expect(parsePresentationUrl('/')).toEqual({ ok: true, route: { kind: 'dashboard' } });
    expect(parsePresentationUrl('/roadmap')).toEqual({ ok: true, route: { kind: 'page', page: 'roadmap' } });
  });

  it('keeps the interim router patterns the web still reads until 07-07', () => {
    expect(presentationRoutePatterns.search).toBe('/search');
    expect(presentationRoutePatterns.traceability).toBe('/traceability');
    expect(presentationRoutePatterns.research).toBe('/research');
    expect(presentationRoutePatterns.sketches).toBe('/sketches');
    expect(parsePresentationUrl('/search')).toEqual({ ok: true, route: { kind: 'page', page: 'search' } });
    expect(parsePresentationUrl('/traceability')).toEqual({ ok: true, route: { kind: 'page', page: 'traceability' } });
    expect(parsePresentationUrl('/research')).toEqual({ ok: true, route: { kind: 'page', page: 'research' } });
    expect(parsePresentationUrl('/sketches')).toEqual({ ok: true, route: { kind: 'page', page: 'sketches' } });
  });

  it.each([
    ['', 'unsupported-route'],
    ['no-leading-slash', 'unsupported-route'],
    ['/v1.1//phase-5', 'empty-token'],
    ['/v1.1/phase-5#', 'empty-token'],
    ['/v1.1/%E0%A4%A', 'malformed-token'],
    ['/file/..', 'malformed-token'],
    ['/file/%2e%2e/STATE.md', 'malformed-token'],
  ])('fails closed for %s', (url, code) => {
    const parsed = parsePresentationUrl(url);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.code).toBe(code);
  });
});
