// Phase 13, 13-01: the quick-jump resolver on the made-up Lendshed project. Expected orders are computed from
// the presentation's own milestones and artifacts (D-04: the current phase, then the live milestone's phases
// in order, then archived milestones newest first), never hand-listed, and every anchor is checked against
// the id the page's own composer gives the same item (RESEARCH Pitfall 1).
import { beforeAll, describe, expect, it } from 'vitest';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import {
  JUMP_GROUP_CAPS,
  MAX_FROM_LENGTH,
  buildJumpGroups,
  currentPhaseKey,
  phaseLabelOf,
  viewingPhaseKey,
} from '../../src/presentation/jump.ts';
import type { JumpResult, JumpRow } from '../../src/presentation/jump.ts';
import { decisionAnchor, findingAnchor, isJumpAnchor, requirementAnchor } from '../../src/presentation/jump-anchors.ts';
import { createApp } from '../../src/server/index.ts';
import type { JumpApiResponse } from '../../src/server/search-index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeContextBrief } from '../../src/web/views/context-brief.ts';
import { composeReviewThreads } from '../../src/web/views/review-threads.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

let presentation: ProjectPresentation;
let snapshot: ProjectSnapshot;

beforeAll(async () => {
  const loaded = await loadFixtureProject();
  presentation = loaded.presentation;
  snapshot = loaded.snapshot;
}, 60000);

type Artifact = ProjectPresentation['artifacts'][number];

function run(query: string, from = '/'): JumpResult {
  return buildJumpGroups({ query, presentation, documents: [], contentHits: [], bodyOf: () => null, from });
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
