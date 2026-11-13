// Phase 13, 13-01: the quick-jump resolver on the made-up Lendshed project. Expected orders are computed from
// the presentation's own milestones and artifacts (D-04: the current phase, then the live milestone's phases
// in order, then archived milestones newest first), never hand-listed, and every anchor is checked against
// the id the page's own composer gives the same item (RESEARCH Pitfall 1).
import { beforeAll, describe, expect, it } from 'vitest';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import {
  JUMP_GROUP_CAPS,
  MAX_FROM_LENGTH,
  MAX_ID_LENGTH,
  buildJumpGroups,
  pageTargetsOf,
  currentPhaseKey,
  phaseLabelOf,
  viewingPhaseKey,
} from '../../src/presentation/jump.ts';
import type { JumpDocument, JumpResult, JumpRow } from '../../src/presentation/jump.ts';
import { decisionAnchor, findingAnchor, isJumpAnchor, requirementAnchor } from '../../src/presentation/jump-anchors.ts';
import { extractSnippets, foldCase } from '../../src/presentation/search.ts';
import { rootDocumentRedirect } from '../../src/presentation/root-redirects.ts';
import { createApp } from '../../src/server/index.ts';
import { createSearchIndexState, isReady, searchIndex } from '../../src/server/search-index.ts';
import type { JumpApiResponse, SearchHit } from '../../src/server/search-index.ts';
import type { ProjectPresentation, RequirementDto } from '../../src/server/project-presentation.ts';
import { composeContextBrief } from '../../src/web/views/context-brief.ts';
import { composeReviewThreads } from '../../src/web/views/review-threads.ts';
import { fileURLToPath } from 'node:url';
import { projectMapState } from '../../src/presentation/project-map-state.ts';
import { buildPhaseUrl } from '../../src/presentation/routes.ts';
import { loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';

let presentation: ProjectPresentation;
let snapshot: ProjectSnapshot;

beforeAll(async () => {
  const loaded = await loadFixtureProject();
  presentation = loaded.presentation;
  snapshot = loaded.snapshot;
}, 60000);

type Artifact = ProjectPresentation['artifacts'][number];

function run(query: string, from = '/', over: ProjectPresentation = presentation): JumpResult {
  return buildJumpGroups({ query, presentation: over, documents: [], contentHits: [], bodyOf: () => null, from });
}

function exactRows(result: JumpResult): JumpRow[] {
  return result.groups.find((group) => group.key === 'exact')?.rows ?? [];
}

function hasId(artifact: Artifact, kind: 'context' | 'review', id: string): boolean {
  if (artifact.kind !== kind) return false;
  const wanted = id.toUpperCase();
  if (kind === 'context') {
    const decisions = artifact.structured.decisions;
    return Array.isArray(decisions) && decisions.some((d) => String((d as { id?: unknown }).id).toUpperCase() === wanted);
  }
  const review = artifact.structured.review as { findings?: unknown } | undefined;
  const findings = review?.findings;
  return Array.isArray(findings) && findings.some((f) => String((f as { id?: unknown }).id).toUpperCase() === wanted);
}

/** The D-04 order, computed from the presentation: phase keys of every phase whose artifact of `kind` defines
 * `id`, with `first` (when it defines it) moved to the front. */
function expectedPhaseOrder(kind: 'context' | 'review', id: string, first: string | null): string[] {
  const live = presentation.milestones.filter((milestone) => !milestone.archived);
  const archived = presentation.milestones.filter((milestone) => milestone.archived).reverse();
  const order: string[] = [];
  for (const milestone of [...live, ...archived]) {
    for (const phase of milestone.phases) {
      const defines = presentation.artifacts.some(
        (artifact) => artifact.phaseKey === phase.key && hasId(artifact, kind, id),
      );
      if (defines) order.push(phase.key);
    }
  }
  if (first !== null && order.includes(first)) return [first, ...order.filter((key) => key !== first)];
  return order;
}

function phaseKeyOfUrl(url: string): string | null {
  return presentation.artifacts.find((artifact) => artifact.key === url)?.phaseKey ?? null;
}

describe('jump anchors', () => {
  it('lower-cases the id behind each prefix', () => {
    expect(decisionAnchor('D-12')).toBe('decision-d-12');
    expect(findingAnchor('WR-03')).toBe('review-finding-wr-03');
    expect(requirementAnchor('NAV-12')).toBe('requirement-nav-12');
  });

  it('accepts only the three prefixes with a bounded id, and rejects everything else', () => {
    expect(isJumpAnchor('decision-d-12')).toBe(true);
    expect(isJumpAnchor('review-finding-wr-03')).toBe(true);
    expect(isJumpAnchor('requirement-nav-12')).toBe(true);
    expect(isJumpAnchor('decision-')).toBe(false);
    expect(isJumpAnchor('decision-D-12')).toBe(false);
    expect(isJumpAnchor('section-intro')).toBe(false);
    expect(isJumpAnchor(`decision-${'a'.repeat(65)}`)).toBe(false);
    expect(isJumpAnchor('decision-d-12<script>')).toBe(false);
  });
});

describe('phaseLabelOf', () => {
  it('drops leading zeros and prefixes the version of an archived milestone', () => {
    const live = presentation.milestones.find((milestone) => !milestone.archived)!;
    const archived = presentation.milestones.find((milestone) => milestone.archived)!;
    expect(phaseLabelOf(live.phases[0]!, live)).toBe(`Phase ${Number(live.phases[0]!.identity.number)}`);
    expect(phaseLabelOf(archived.phases[0]!, archived)).toBe(
      `${archived.version} · Phase ${Number(archived.phases[0]!.identity.number)}`,
    );
  });
});

describe('viewingPhaseKey and currentPhaseKey', () => {
  it('resolves a page of a phase, a phase address and a nested address to that phase', () => {
    const context = presentation.artifacts.find((a) => a.kind === 'context' && a.phaseKey !== null)!;
    expect(viewingPhaseKey(presentation, context.key)).toBe(context.phaseKey);
    expect(viewingPhaseKey(presentation, `${context.key}?source=1#top`)).toBe(context.phaseKey);
    const live = presentation.milestones.find((milestone) => !milestone.archived)!;
    expect(viewingPhaseKey(presentation, '/v1.1/phase-3')).toBe(live.phases.find((p) => p.identity.number === '03')?.key);
    expect(viewingPhaseKey(presentation, '/v1.1/phase-3/anything-deeper')).toBe(
      live.phases.find((p) => p.identity.number === '03')?.key,
    );
  });

  it('counts a from that is not a plain project address as no viewing phase', () => {
    expect(viewingPhaseKey(presentation, '/')).toBeNull();
    expect(viewingPhaseKey(presentation, '//evil')).toBeNull();
    expect(viewingPhaseKey(presentation, `/${'a'.repeat(MAX_FROM_LENGTH)}`)).toBeNull();
    expect(viewingPhaseKey(presentation, '/v1.1/phase-3\u0000')).toBeNull();
    expect(viewingPhaseKey(presentation, '/v1.1/phase-3\u0085')).toBeNull();
    expect(viewingPhaseKey(presentation, 'v1.1/phase-3')).toBeNull();
    expect(viewingPhaseKey(presentation, 42)).toBeNull();
  });

  it('falls back to STATE\'s current phase', () => {
    expect(currentPhaseKey(presentation, '/')).not.toBeNull();
    expect(currentPhaseKey(presentation, '/roadmap')).toBe(currentPhaseKey(presentation, '/'));
    expect(currentPhaseKey(presentation, '/v1.1/phase-3')).not.toBe(currentPhaseKey(presentation, '/'));
  });
});

describe('buildJumpGroups: decision ids', () => {
  it('puts STATE\'s current phase first for D-01 with the Exact chip, then every other site in D-04 order', () => {
    const rows = exactRows(run('D-01'));
    const current = currentPhaseKey(presentation, '/');
    expect(rows[0]!.phaseKey).toBe(current);
    expect(rows[0]!.chips).toEqual([{ label: 'Exact', tone: 'complete' }]);
    expect(rows.map((row) => row.phaseKey)).toEqual(expectedPhaseOrder('context', 'D-01', current));
    for (const row of rows.slice(1)) {
      expect(row.chips).toHaveLength(1);
      expect(row.chips[0]!.tone).toBe('quiet');
      expect(row.chips[0]!.label).toMatch(/Phase \d/);
    }
    expect(rows.length).toBeGreaterThan(3);
  });

  it('puts the phase being viewed first', () => {
    const phase1Context = presentation.artifacts.find(
      (a) => a.kind === 'context' && a.key === '/v1.1/phase-1/context',
    )!;
    const rows = exactRows(run('D-01', phase1Context.key));
    expect(rows[0]!.phaseKey).toBe(phase1Context.phaseKey);
    expect(rows.map((row) => row.phaseKey)).toEqual(
      expectedPhaseOrder('context', 'D-01', phase1Context.phaseKey),
    );
  });

  it('matches case-insensitively and shows the canonical casing', () => {
    const rows = exactRows(run('d-01'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.id).toBe('D-01');
    expect(rows).toEqual(exactRows(run('D-01')));
  });

  it('answers an unknown ID-shaped query with no Exact group and the ID it looked for', () => {
    const result = run('D-99');
    expect(result.groups.find((group) => group.key === 'exact')).toBeUndefined();
    expect(result.notFoundId).toBe('D-99');
    expect(run('zz-1234').notFoundId).toBe('ZZ-1234');
    expect(run('just some words').notFoundId).toBeNull();
    expect(run('D-01').notFoundId).toBeNull();
  });

  it('caps the Exact group and drops an over-long query before comparing', () => {
    expect(exactRows(run('D-01')).length).toBeLessThanOrEqual(JUMP_GROUP_CAPS.exact);
    expect(run('D-01'.padEnd(200, '0')).groups).toEqual([]);
    expect(run('').groups).toEqual([]);
  });
});

describe('buildJumpGroups: finding ids', () => {
  it('puts phase 4 first for WR-03, then the other live phases in order, then the archived sites', () => {
    const rows = exactRows(run('WR-03'));
    const current = currentPhaseKey(presentation, '/');
    expect(rows[0]!.phaseKey).toBe(current);
    expect(rows[0]!.kind).toBe('finding');
    expect(rows.map((row) => row.phaseKey)).toEqual(expectedPhaseOrder('review', 'WR-03', current));
    const live = new Set(
      presentation.milestones.filter((m) => !m.archived).flatMap((m) => m.phases.map((p) => p.key)),
    );
    const flags = rows.map((row) => live.has(row.phaseKey ?? ''));
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });

  it('reads a REVIEW that files its findings under "## Warning Findings" (phase 3) through structured.review', () => {
    const rows = exactRows(run('WR-03', '/v1.1/phase-3'));
    const phase3 = phaseKeyOfUrl('/v1.1/phase-3/review');
    expect(phase3).not.toBeNull();
    expect(rows[0]!.phaseKey).toBe(phase3);
    expect(rows[0]!.url).toBe('/v1.1/phase-3/review');
    expect(rows.map((row) => row.phaseKey)).toEqual(expectedPhaseOrder('review', 'WR-03', phase3));
    const review = presentation.artifacts.find((a) => a.key === '/v1.1/phase-3/review')!;
    expect(review.structured.warnings).toEqual([]);
  });

  it('finds findings of every prefix: CR-01 gives finding rows only, phase 4 first', () => {
    const rows = exactRows(run('CR-01'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.kind === 'finding')).toBe(true);
    expect(rows[0]!.phaseKey).toBe(currentPhaseKey(presentation, '/'));
    expect(rows[0]!.anchor).toBe('review-finding-cr-01');
  });

  it('falls back to a from that is not a plain address: the current phase is first again', () => {
    const current = currentPhaseKey(presentation, '/');
    for (const from of ['//evil', `/${'x'.repeat(2000)}`, '/v1.1/phase-3\u0007']) {
      expect(exactRows(run('WR-03', from))[0]!.phaseKey).toBe(current);
    }
  });
});

describe('buildJumpGroups: anchors are the ids the pages give the same items', () => {
  it('every decision row anchor is an id composeContextBrief assigns to a decision row of that CONTEXT', () => {
    const rows = exactRows(run('D-01'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const artifact = presentation.artifacts.find((a) => a.key === row.url)!;
      const composed = composeContextBrief({
        kind: 'context',
        frontmatter: artifact.frontmatter,
        structured: artifact.structured,
        groups: [],
        planSegments: [],
      });
      expect(composed, row.url).not.toBeNull();
      const ids = composed!.areas.flatMap((area) =>
        area.entries.flatMap((entry) => (entry.kind === 'decision' ? [entry.decision.id] : [])),
      );
      expect(ids, row.url).toContain(row.anchor);
    }
  });

  it('every finding row anchor is an anchorId composeReviewThreads gives for that REVIEW', () => {
    const rows = [...exactRows(run('WR-03')), ...exactRows(run('CR-01')), ...exactRows(run('IN-01'))];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const artifact = presentation.artifacts.find((a) => a.key === row.url)!;
      const composed = composeReviewThreads({
        kind: 'review',
        frontmatter: artifact.frontmatter,
        structured: artifact.structured,
        groups: [],
        planSegments: [],
      });
      expect(composed, row.url).not.toBeNull();
      const ids = composed!.threads.files.flatMap((file) => file.findings.map((finding) => finding.anchorId));
      expect(ids, row.url).toContain(row.anchor);
    }
  });
});

describe('GET /api/jump', () => {
  it('answers 200 with status "building" and no groups before the index is built, then "ready" with an exact group', async () => {
    const app = createApp({ getSnapshot: () => snapshot });
    const before = await app.request('/api/jump?q=D-01');
    expect(before.status).toBe(200);
    const building = (await before.json()) as JumpApiResponse;
    expect(building.status).toBe('building');
    expect(building.groups).toEqual([]);

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    const after = await app.request('/api/jump?q=D-01&from=%2F');
    expect(after.status).toBe(200);
    const ready = (await after.json()) as JumpApiResponse;
    expect(ready.status).toBe('ready');
    expect(ready.query).toBe('D-01');
    expect(ready.groups[0]!.key).toBe('exact');
    expect(ready.groups[0]!.rows[0]!.chips[0]).toEqual({ label: 'Exact', tone: 'complete' });
  });

  it('answers 200 for an empty, absent or oversized q and from', async () => {
    const app = createApp({ getSnapshot: () => snapshot });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    for (const url of [
      '/api/jump',
      '/api/jump?q=',
      `/api/jump?q=${'a'.repeat(5000)}`,
      `/api/jump?q=WR-03&from=${'b'.repeat(5000)}`,
    ]) {
      const response = await app.request(url);
      expect(response.status, url).toBe(200);
      const body = (await response.json()) as JumpApiResponse;
      expect(body.status).toBe('ready');
    }
  });
});

describe('buildJumpGroups: content matches', () => {
  let state: ReturnType<ReturnType<typeof createSearchIndexState>['state']>;
  const bodyOf = (path: string): string | null => (isReady(state) ? (state.documents.get(path)?.body ?? null) : null);

  beforeAll(async () => {
    const built = createSearchIndexState();
    built.buildFrom(snapshot);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    state = built.state();
    expect(state.status).toBe('ready');
  });

  function withHits(query: string, from = '/'): { result: JumpResult; hits: SearchHit[] } {
    const hits = searchIndex(state, query);
    const result = buildJumpGroups({ query, presentation, documents: [], contentHits: hits, bodyOf, from });
    return { result, hits };
  }

  it('ends with a Content group of at most 5 rows and counts every hit, and is the only group with no Exact match', () => {
    const { result, hits } = withHits('session');
    expect(hits.length).toBeGreaterThan(JUMP_GROUP_CAPS.content);
    expect(result.groups.map((group) => group.key)).toEqual(['content']);
    expect(result.groups[0]!.rows).toHaveLength(JUMP_GROUP_CAPS.content);
    expect(result.contentTotal).toBe(hits.length);
    expect(result.notFoundId).toBeNull();
  });

  it('puts the Exact group first and the Content group last', () => {
    const { result } = withHits('D-01');
    const keys = result.groups.map((group) => group.key);
    expect(keys[0]).toBe('exact');
    expect(keys[keys.length - 1]).toBe('content');
  });

  it('builds each content row from its hit: title, path, address, kind, phase and the first snippet', () => {
    const { result, hits } = withHits('session');
    const rows = result.groups.find((group) => group.key === 'content')!.rows;
    rows.forEach((row, index) => {
      const hit = hits[index]!;
      const artifact = presentation.artifacts.find((candidate) => candidate.path === hit.path);
      expect(row.kind).toBe('content');
      expect(row.title).toBe(hit.title);
      expect(row.subtitle).toBe(hit.path);
      expect(row.url).toBe(rootDocumentRedirect(artifact) ?? hit.url);
      expect(row.artifactKind).toBe(hit.kind);
      expect(row.phaseKey).toBe(hit.phaseKey);
      expect(row.anchor).toBeNull();
      expect(row.id).toBeNull();
      const expected = extractSnippets(bodyOf(hit.path) ?? '', hit.matchedTerms).snippets[0] ?? null;
      expect(row.snippet).toEqual(expected);
    });
    expect(rows.some((row) => row.snippet !== null)).toBe(true);
  });

  it('gives a null snippet when the body is unavailable, and carries no markup in any field', () => {
    const hits = searchIndex(state, 'session');
    const result = buildJumpGroups({
      query: 'session',
      presentation,
      documents: [],
      contentHits: hits,
      bodyOf: () => null,
      from: '/',
    });
    expect(result.groups[0]!.rows.every((row) => row.snippet === null)).toBe(true);
    for (const row of withHits('session').result.groups[0]!.rows) {
      expect(JSON.stringify([row.title, row.subtitle, row.url, row.chips])).not.toMatch(/<mark|<\/|<script/i);
      for (const range of row.snippet?.highlights ?? []) {
        expect(range.start).toBeLessThan(range.end);
        expect(range.end).toBeLessThanOrEqual(row.snippet!.text.length);
      }
    }
  });
});

describe('foldCase', () => {
  it('is exported and folds case without changing length', () => {
    expect(foldCase('Session İDX')).toHaveLength('Session İDX'.length);
    expect(foldCase('SESSION')).toBe('session');
  });
});

// Phase 13, 13-04 Task 1: every ID family, prefix completion and the honest not-found.
function groupRows(result: JumpResult, key: 'exact' | 'ids' | 'pages' | 'files' | 'content'): JumpRow[] {
  return result.groups.find((group) => group.key === key)?.rows ?? [];
}

function requirementDto(id: string, text: string, covered = true): RequirementDto {
  return {
    id,
    category: 'Synthetic',
    text,
    tier: 'v1',
    checked: null,
    coveringPhases: covered ? [{ raw: 'Phase 1', targetPhaseKey: null }] : [],
  };
}

function withRequirements(extra: RequirementDto[]): ProjectPresentation {
  return { ...presentation, requirements: [...presentation.requirements, ...extra] };
}

describe('buildJumpGroups: requirement ids (13-04, D-06)', () => {
  it('gives SIGN-01 a definition row to its traceability row, then Mentions rows, current phase first', () => {
    const rows = groupRows(run('SIGN-01'), 'exact');
    const requirement = presentation.requirements.find((entry) => entry.id === 'SIGN-01')!;
    expect(rows[0]).toMatchObject({
      kind: 'requirement',
      id: 'SIGN-01',
      title: requirement.text,
      subtitle: 'Definition and traceability',
      url: '/traceability?q=SIGN-01',
      anchor: 'requirement-sign-01',
      chips: [{ label: 'Covered', tone: 'complete' }],
    });
    expect(rows[0]!.chips.some((chip) => chip.label === 'Exact')).toBe(false);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.length).toBeLessThanOrEqual(JUMP_GROUP_CAPS.exact);
    const mentions = rows.slice(1);
    for (const row of mentions) {
      expect(row.kind).toBe('mention');
      expect(row.chips).toEqual([{ label: 'Mentions', tone: 'quiet' }]);
      expect(row.subtitle).not.toBe('.planning/REQUIREMENTS.md');
    }
    expect(new Set(mentions.map((row) => row.subtitle)).size).toBe(mentions.length);
    const current = currentPhaseKey(presentation, '/');
    const flags = mentions.map((row) => (row.phaseKey === current ? 0 : 1));
    expect(flags).toEqual([...flags].sort((a, b) => a - b));
  });

  it('reads the same rows for sign-01 and shows the canonical id', () => {
    expect(groupRows(run('sign-01'), 'exact')).toEqual(groupRows(run('SIGN-01'), 'exact'));
    expect(groupRows(run('sign-01'), 'exact')[0]!.id).toBe('SIGN-01');
  });

  it('puts a viewing phase\'s mentions first', () => {
    const rows = groupRows(run('SIGN-01', '/v1.1/phase-1/context'), 'exact').slice(1);
    const viewing = viewingPhaseKey(presentation, '/v1.1/phase-1/context');
    expect(viewing).not.toBeNull();
    expect(rows[0]!.phaseKey).toBe(viewing);
  });

  it('marks a requirement with no covering phase Not covered, quiet', () => {
    const synthetic = withRequirements([requirementDto('ZQ-01', 'Nothing covers this', false)]);
    const rows = groupRows(run('zq-01', '/', synthetic), 'exact');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.chips).toEqual([{ label: 'Not covered', tone: 'quiet' }]);
  });
});

describe('buildJumpGroups: plan and quick-task ids (13-04, NAV-12)', () => {
  it('gives 01-06 one plan row per phase holding it, with the plan\'s page', () => {
    const rows = groupRows(run('01-06'), 'exact');
    expect(rows.map((row) => row.url)).toEqual(['/v1.1/phase-1/plan-06']);
    expect(rows[0]).toMatchObject({ kind: 'plan', id: '01-06', anchor: null });
    expect(rows[0]!.chips).toEqual([{ label: 'Exact', tone: 'complete' }]);
    expect(rows[0]!.subtitle).toBe('Phase 1 · Plan 6');
  });

  it('matches plan numbers numerically and rejects a query that is not the plan shape', () => {
    expect(groupRows(run('01-01'), 'exact').map((row) => row.url)).toEqual(['/v1.1/phase-1/plan-01']);
    const short = run('1-6');
    expect(groupRows(short, 'exact')).toEqual([]);
    expect(groupRows(short, 'ids')).toEqual([]);
  });

  it('gives a quick task id its PLAN page, and a task with only a CONTEXT its CONTEXT page', () => {
    const plan = groupRows(run('260402-t8m'), 'exact');
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ kind: 'quick', id: '260402-t8m', url: '/quick/260402-t8m', anchor: null });
    expect(plan[0]!.title).toMatch(/restyle the top bar/i);
    expect(plan[0]!.chips).toEqual([{ label: 'Exact', tone: 'complete' }]);
    const context = groupRows(run('260403-k2p'), 'exact');
    expect(context.map((row) => row.url)).toEqual(['/quick/260403-k2p/context']);
    const verification = groupRows(run('260327-H4W'), 'exact');
    expect(verification.map((row) => row.url)).toEqual(['/quick/260327-h4w/verification']);
  });
});

describe('buildJumpGroups: a finding id beats a requirement id (13-04, RESEARCH open question 3)', () => {
  it('resolves CR-01 as findings only on a project that also defines a requirement CR-01', () => {
    const synthetic = withRequirements([requirementDto('CR-01', 'A requirement that shares the finding id')]);
    const rows = groupRows(run('CR-01', '/', synthetic), 'exact');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.kind === 'finding')).toBe(true);
    expect(rows).toEqual(groupRows(run('CR-01'), 'exact'));
  });

  it('resolves a requirement id nothing else defines as a requirement', () => {
    const synthetic = withRequirements([requirementDto('CR-77', 'Only a requirement')]);
    expect(groupRows(run('CR-77', '/', synthetic), 'exact')[0]!.kind).toBe('requirement');
  });
});

describe('buildJumpGroups: prefix completion in the IDs group (13-04, D-07)', () => {
  const find = Array.from({ length: 9 }, (_, index) => requirementDto(`FIND-0${index + 1}`, `Find requirement number ${index + 1}`));

  it('lists all nine FIND requirements in natural order with their text, for FIND and find', () => {
    const synthetic = withRequirements(find);
    for (const query of ['FIND', 'find', 'FIND-']) {
      const result = run(query, '/', synthetic);
      expect(groupRows(result, 'exact')).toEqual([]);
      const rows = groupRows(result, 'ids');
      expect(rows.map((row) => row.id), query).toEqual(find.map((entry) => entry.id));
      expect(rows.map((row) => row.title)).toEqual(find.map((entry) => entry.text));
      expect(rows.every((row) => row.kind === 'requirement' && row.subtitle === 'Requirement')).toBe(true);
      expect(rows[0]!.url).toBe('/traceability?q=FIND-01');
      expect(rows[0]!.anchor).toBe('requirement-find-01');
      expect(result.notFoundId).toBeNull();
    }
  });

  it('never exceeds twelve rows, in natural order', () => {
    const many = Array.from({ length: 20 }, (_, index) => requirementDto(`FIND-${String(index + 1).padStart(2, '0')}`, `Find ${index + 1}`));
    const rows = groupRows(run('FIND', '/', withRequirements(many)), 'ids');
    expect(rows).toHaveLength(JUMP_GROUP_CAPS.ids);
    expect(rows[11]!.id).toBe('FIND-12');
  });

  it('lists each distinct finding id once for WR-, with where it is defined', () => {
    const rows = groupRows(run('WR-'), 'ids');
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.length).toBeLessThanOrEqual(JUMP_GROUP_CAPS.ids);
    const ids = rows.map((row) => row.id!);
    expect(new Set(ids.map((id) => id.toUpperCase())).size).toBe(ids.length);
    expect(ids.every((id) => id.toUpperCase().startsWith('WR-'))).toBe(true);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
    for (const row of rows) {
      expect(row.kind).toBe('finding');
      expect(row.subtitle).toMatch(/^(.* · REVIEW|Defined in \d+ phases)$/);
      expect(row.anchor).toBe(findingAnchor(row.id!));
    }
    expect(rows.some((row) => /^Defined in \d+ phases$/.test(row.subtitle))).toBe(true);
  });

  it('lists only ids starting D-1 for D-1, in natural order', () => {
    const rows = groupRows(run('D-1'), 'ids');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.id!.toUpperCase().startsWith('D-1'))).toBe(true);
    expect(rows[0]!.id).toBe('D-10');
    expect(groupRows(run('D-1'), 'exact')).toEqual([]);
  });

  it('completes a plan id prefix and a quick id prefix', () => {
    const plans = groupRows(run('01-0'), 'ids');
    expect(plans.map((row) => row.id)).toEqual(['01-01', '01-06']);
    expect(plans[0]!.kind).toBe('plan');
    const quick = groupRows(run('2604'), 'ids');
    expect(quick.map((row) => row.id)).toEqual(['260402-t8m', '260403-k2p']);
    expect(quick[0]!.subtitle).toBe('Quick task');
  });

  it('gives a full exact match the Exact group and no IDs group', () => {
    const result = run('D-01');
    expect(groupRows(result, 'exact').length).toBeGreaterThan(0);
    expect(groupRows(result, 'ids')).toEqual([]);
  });

  it('gives no IDs group for a query that does not have the ID shape', () => {
    expect(groupRows(run('d-1 x'), 'ids')).toEqual([]);
    expect(groupRows(run('-'), 'ids')).toEqual([]);
    expect(groupRows(run('D'), 'ids')).toEqual([]);
  });
});

describe('buildJumpGroups: an ID that resolves to nothing (13-04, UI-SPEC "ID not found")', () => {
  it('names the canonical id and gives neither Exact nor IDs', () => {
    for (const [query, expected] of [
      ['D-99', 'D-99'],
      ['d-99', 'D-99'],
      ['ZZZZ-01', 'ZZZZ-01'],
      ['zzzz-01', 'ZZZZ-01'],
      ['99-99', '99-99'],
      ['990101-zzz', '990101-zzz'],
      ['990101-ZZZ', '990101-zzz'],
    ] as const) {
      const result = run(query);
      expect(groupRows(result, 'exact'), query).toEqual([]);
      expect(groupRows(result, 'ids'), query).toEqual([]);
      expect(result.notFoundId, query).toBe(expected);
    }
  });

  it('leaves notFoundId null for words, a resolved id and a prefix that completes', () => {
    expect(run('roadmap').notFoundId).toBeNull();
    expect(run('SIGN-01').notFoundId).toBeNull();
    expect(run('D-1').notFoundId).toBeNull();
    expect(run('01-06').notFoundId).toBeNull();
    expect(run('260402-t8m').notFoundId).toBeNull();
  });

  it('skips every ID producer for a query over MAX_ID_LENGTH', () => {
    const synthetic = withRequirements([requirementDto(`FIND-${'1'.repeat(40)}`, 'Absurdly long id')]);
    for (const query of [`FIND-${'1'.repeat(40)}`, `D-${'0'.repeat(31)}`, `${'A'.repeat(33)}`]) {
      expect(query.length).toBeGreaterThan(MAX_ID_LENGTH);
      const result = run(query, '/', synthetic);
      expect(groupRows(result, 'exact'), query).toEqual([]);
      expect(groupRows(result, 'ids'), query).toEqual([]);
      expect(result.notFoundId, query).toBeNull();
    }
  });
});

// Phase 13, 13-04 Task 2: pages and files by name.
function documentsOf(over: ProjectPresentation = presentation): JumpDocument[] {
  return over.artifacts.map((artifact) => ({
    path: artifact.path,
    title: artifact.title,
    kind: artifact.kind,
    url: artifact.key,
  }));
}

function runWithDocuments(query: string, documents: JumpDocument[], from = '/'): JumpResult {
  return buildJumpGroups({ query, presentation, documents, contentHits: [], bodyOf: () => null, from });
}

function artifactStub(path: string): Artifact {
  return { ...presentation.artifacts[0]!, path, key: `/stub/${path}`, phaseKey: null };
}

describe('pageTargetsOf (13-04, NAV-08)', () => {
  it('lists the fixed pages the header shows, one overview per milestone and one page per phase', () => {
    const targets = pageTargetsOf(presentation);
    const fixed = targets.slice(0, 5).map((target) => [target.title, target.url]);
    expect(fixed).toEqual([
      ['Dashboard', '/'],
      ['Roadmap', '/roadmap'],
      ['Traceability', '/traceability'],
      ['Search', '/search'],
      ['Settings', '/settings'],
    ]);
    const urls = targets.map((target) => target.url);
    expect(urls).not.toContain('/research');
    expect(urls).not.toContain('/sketches');
    for (const milestone of presentation.milestones) {
      expect(targets).toContainEqual({ title: `${milestone.name} overview`, url: milestone.overviewUrl, phaseKey: null });
      for (const phase of milestone.phases) {
        const target = targets.find((entry) => entry.phaseKey === phase.key)!;
        expect(target.url).toBe(buildPhaseUrl(phase.identity));
        expect(target.title).toBe(`${phaseLabelOf(phase, milestone)} · ${phase.name}`);
      }
    }
    const live = presentation.milestones.find((milestone) => !milestone.archived)!;
    const archived = presentation.milestones.find((milestone) => milestone.archived)!;
    expect(targets.find((entry) => entry.phaseKey === live.phases[0]!.key)!.title).toMatch(/^Phase \d+ · /);
    expect(targets.find((entry) => entry.phaseKey === archived.phases[0]!.key)!.title).toMatch(/^v1\.0 · Phase \d+ · /);
  });

  it('lists Research and Sketches only when the project has them', () => {
    const rich: ProjectPresentation = {
      ...presentation,
      artifacts: [
        ...presentation.artifacts,
        artifactStub('.planning/research/SUMMARY.md'),
        artifactStub('.planning/sketches/MANIFEST.md'),
      ],
    };
    const urls = pageTargetsOf(rich).map((target) => target.url);
    expect(urls).toContain('/research');
    expect(urls).toContain('/sketches');
    const onlyResearch: ProjectPresentation = { ...presentation, artifacts: [...presentation.artifacts, artifactStub('.planning/research/STACK.md')] };
    const research = pageTargetsOf(onlyResearch).map((target) => target.url);
    expect(research).toContain('/research');
    expect(research).not.toContain('/sketches');
  });

  it('omits Roadmap and Traceability on a map-only project', async () => {
    const tidemark = await loadProject(fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)));
    expect(projectMapState(tidemark.presentation.artifacts).mapOnly).toBe(true);
    const urls = pageTargetsOf(tidemark.presentation).map((target) => target.url);
    expect(urls).not.toContain('/roadmap');
    expect(urls).not.toContain('/traceability');
    expect(urls).toContain('/');
    expect(urls).toContain('/search');
    expect(urls).toContain('/settings');
  });
});

describe('buildJumpGroups: the Pages group (13-04, D-01)', () => {
  it('ranks Roadmap first for "road" and marks the matched letters', () => {
    const rows = groupRows(run('road'), 'pages');
    expect(rows[0]).toMatchObject({ kind: 'page', title: 'Roadmap', url: '/roadmap', subtitle: '/roadmap' });
    expect(rows[0]!.chips).toEqual([{ label: 'Page', tone: 'quiet' }]);
    expect(rows[0]!.titleHighlights).toEqual([{ start: 0, end: 4 }]);
    expect(rows[0]!.anchor).toBeNull();
  });

  it('finds a word that starts inside a title and marks it', () => {
    const rows = groupRows(run('overview'), 'pages');
    expect(rows.length).toBe(presentation.milestones.length);
    for (const row of rows) {
      const start = row.title.toLowerCase().indexOf('overview');
      expect(row.titleHighlights).toEqual([{ start, end: start + 'overview'.length }]);
    }
  });

  it('lists phase 3 pages for "phase 3", the viewing phase\'s first', () => {
    const live = presentation.milestones.find((milestone) => !milestone.archived)!;
    const phase3 = live.phases.find((phase) => phase.identity.number === '03')!;
    const rows = groupRows(run('phase 3'), 'pages');
    expect(rows[0]!.phaseKey).toBe(phase3.key);
    expect(rows.every((row) => row.title.toLowerCase().includes('phase 3'))).toBe(true);
    expect(rows.length).toBe(2);
  });

  it('puts the viewing phase first among equally good matches, and caps at five', () => {
    const live = presentation.milestones.find((milestone) => !milestone.archived)!;
    const phase2 = live.phases.find((phase) => phase.identity.number === '02')!;
    const phase4 = live.phases.find((phase) => phase.identity.number === '04')!;
    const first = (from: string): string | null => groupRows(run('phase', from), 'pages')[0]!.phaseKey;
    expect(first('/v1.1/phase-2/context')).toBe(phase2.key);
    expect(first('/v1.1/phase-4')).toBe(phase4.key);
    expect(groupRows(run('phase'), 'pages').length).toBeLessThanOrEqual(JUMP_GROUP_CAPS.pages);
  });

  it('never offers a page the header tabs hide', async () => {
    const tidemark = await loadProject(fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)));
    const result = buildJumpGroups({
      query: 'road',
      presentation: tidemark.presentation,
      documents: [],
      contentHits: [],
      bodyOf: () => null,
      from: '/',
    });
    expect(groupRows(result, 'pages')).toEqual([]);
    expect(groupRows(run('research'), 'pages')).toEqual([]);
    expect(groupRows(run('sketch'), 'pages')).toEqual([]);
  });
});

describe('buildJumpGroups: the Files group (13-04, D-01)', () => {
  it('lists at most six CONTEXT files for "context", the viewing phase\'s first', () => {
    const documents = documentsOf();
    const rows = groupRows(runWithDocuments('context', documents, '/v1.1/phase-3/context'), 'files');
    expect(rows).toHaveLength(JUMP_GROUP_CAPS.files);
    expect(rows[0]!.url).toBe('/v1.1/phase-3/context');
    expect(rows[0]!.kind).toBe('file');
    expect(rows[0]!.artifactKind).toBe('context');
    expect(rows[0]!.chips).toEqual([]);
    expect(rows.every((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes('context'))).toBe(true);
  });

  it('ranks the file named 01-01-PLAN.md before files that merely contain the text', () => {
    const documents: JumpDocument[] = [
      { path: '.planning/a/foo-01-01-PLAN-notes.md', title: 'Foo notes', kind: 'note', url: '/a/foo' },
      { path: '.planning/b/prefix-01-01-PLAN.md', title: 'Prefix', kind: 'note', url: '/b/prefix' },
      { path: '.planning/phases/x/01-01-PLAN.md', title: 'The plan', kind: 'plan', url: '/x/plan' },
      { path: '.planning/c/01-01-PLAN-extra.md', title: 'Extra', kind: 'note', url: '/c/extra' },
    ];
    const rows = groupRows(runWithDocuments('01-01-PLAN', documents), 'files');
    expect(rows.map((row) => row.url)).toEqual(['/x/plan', '/c/extra', '/a/foo', '/b/prefix']);
  });

  it('ranks a file name prefix before a substring, then path ascending', () => {
    const documents: JumpDocument[] = [
      { path: '.planning/z/session-log.md', title: 'Z log', kind: 'note', url: '/z' },
      { path: '.planning/m/old-session.md', title: 'M old', kind: 'note', url: '/m' },
      { path: '.planning/a/session-notes.md', title: 'A notes', kind: 'note', url: '/a' },
    ];
    expect(groupRows(runWithDocuments('session', documents), 'files').map((row) => row.url)).toEqual(['/a', '/z', '/m']);
  });

  it('marks the matched slice of the title, else of the path', () => {
    const documents = documentsOf();
    const wanted = 'account admin & sessions - context';
    const byTitle = groupRows(runWithDocuments(wanted, documents, '/v1.1/phase-3/context'), 'files');
    const row = byTitle.find((entry) => entry.url === '/v1.1/phase-3/context')!;
    const start = row.title.toLowerCase().indexOf(wanted);
    expect(row.titleHighlights).toEqual([{ start, end: start + wanted.length }]);
    expect(row.subtitleHighlights).toEqual([]);

    const byPath = groupRows(runWithDocuments('03-context', documents, '/v1.1/phase-3/context'), 'files');
    const pathRow = byPath.find((entry) => entry.url === '/v1.1/phase-3/context')!;
    expect(pathRow.titleHighlights).toEqual([]);
    const at = pathRow.subtitle.toLowerCase().indexOf('03-context');
    expect(pathRow.subtitleHighlights).toEqual([{ start: at, end: at + '03-context'.length }]);
  });

  it('folds case with the length-preserving fold, so highlights index the original string', () => {
    const documents: JumpDocument[] = [
      { path: '.planning/i/notes.md', title: 'İX match here', kind: 'note', url: '/i' },
    ];
    const rows = groupRows(runWithDocuments('MATCH', documents), 'files');
    expect(rows).toHaveLength(1);
    const start = 'İX match here'.indexOf('match');
    expect(rows[0]!.titleHighlights).toEqual([{ start, end: start + 5 }]);
  });

  it('sends a root document that has a designed page to that page', () => {
    const requirements = presentation.artifacts.find((artifact) => artifact.path === '.planning/REQUIREMENTS.md')!;
    const documents: JumpDocument[] = [
      { path: requirements.path, title: requirements.title, kind: requirements.kind, url: requirements.key },
    ];
    const rows = groupRows(runWithDocuments('REQUIREMENTS', documents), 'files');
    expect(rows[0]!.url).toBe(rootDocumentRedirect(requirements) ?? requirements.key);
  });
});

describe('buildJumpGroups: name matching in general (13-04)', () => {
  it('gives no groups at all for an empty or whitespace query', () => {
    expect(runWithDocuments('', documentsOf()).groups).toEqual([]);
    expect(runWithDocuments('   ', documentsOf()).groups).toEqual([]);
  });

  it('keeps the group order exact, ids, pages, files, content', () => {
    const result = runWithDocuments('d-0', documentsOf());
    const keys = result.groups.map((group) => group.key);
    const order = ['exact', 'ids', 'pages', 'files', 'content'];
    expect(keys).toEqual([...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    const withBoth = runWithDocuments('phase', documentsOf());
    expect(withBoth.groups.map((group) => group.key)).toEqual(['pages', 'files']);
  });

  it('runs the name producers for a long query without touching the ID producers', () => {
    const long = `${'a'.repeat(MAX_ID_LENGTH)}b`;
    const documents: JumpDocument[] = [{ path: `.planning/${long}.md`, title: 'Long', kind: 'note', url: '/long' }];
    const result = runWithDocuments(long, documents);
    expect(groupRows(result, 'files').map((row) => row.url)).toEqual(['/long']);
    expect(result.notFoundId).toBeNull();
  });
});
