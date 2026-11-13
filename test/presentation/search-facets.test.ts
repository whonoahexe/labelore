import { beforeAll, describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import {
  EMPTY_SELECTION,
  MAX_FACET_VALUES,
  MAX_FACET_VALUE_LENGTH,
  applyFacetSelection,
  buildFacetContext,
  buildRequirementMap,
  compareNatural,
  computeFacets,
  facetSearchParams,
  knownSelection,
  parseFacetSelection,
  phaseTokenOf,
  type FacetContext,
  type FacetDimension,
  type FacetSelection,
} from '../../src/presentation/search-facets.ts';
import type { SearchHitLike } from '../../src/presentation/search.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

const PLAN_PATH = '.planning/phases/01-member-sign-in-sessions/01-01-PLAN.md';
const SUMMARY_PATH = '.planning/phases/01-member-sign-in-sessions/01-01-SUMMARY.md';
const VERIFICATION_PATH = '.planning/phases/03-account-admin-and-sessions/03-VERIFICATION.md';

function selection(partial: Partial<FacetSelection> = {}): FacetSelection {
  return { ...EMPTY_SELECTION, phase: [], type: [], req: [], ...partial };
}

function reader(values: Partial<Record<FacetDimension, string[]>>): (dimension: FacetDimension) => readonly string[] {
  return (dimension) => values[dimension] ?? [];
}

describe('parseFacetSelection', () => {
  it('reads nothing from an empty request', () => {
    expect(parseFacetSelection(reader({}))).toEqual({ phase: [], type: [], req: [] });
  });

  it('trims, drops empties, dedupes in first-seen order and upper-cases requirement ids', () => {
    const parsed = parseFacetSelection(
      reader({
        phase: [' v1.1/phase-3 ', '', '   ', 'v1.1/phase-3', 'v1.0/phase-1'],
        type: ['plan', 'plan', 'summary'],
        req: ['sign-01', 'SIGN-01', ' role-02'],
      }),
    );
    expect(parsed.phase).toEqual(['v1.1/phase-3', 'v1.0/phase-1']);
    expect(parsed.type).toEqual(['plan', 'summary']);
    expect(parsed.req).toEqual(['SIGN-01', 'ROLE-02']);
  });

  it('keeps at most MAX_FACET_VALUES values per dimension', () => {
    const many = Array.from({ length: MAX_FACET_VALUES + 30 }, (_, index) => `kind-${index}`);
    const parsed = parseFacetSelection(reader({ type: many }));
    expect(parsed.type).toHaveLength(MAX_FACET_VALUES);
    expect(parsed.type[0]).toBe('kind-0');
  });

  it('drops values over the length bound and values holding a control character', () => {
    const parsed = parseFacetSelection(
      reader({
        type: [
          'x'.repeat(MAX_FACET_VALUE_LENGTH),
          'x'.repeat(MAX_FACET_VALUE_LENGTH + 1),
          'pl\u0000an',
          'pl\nan',
          'pl\u007fan',
          'pl\u0085an',
          'plan',
        ],
      }),
    );
    expect(parsed.type).toEqual(['x'.repeat(MAX_FACET_VALUE_LENGTH), 'plan']);
  });
});

describe('facetSearchParams', () => {
  it('writes q first, then repeated phase, type and req in that order', () => {
    const params = facetSearchParams(
      'watcher',
      selection({ req: ['SIGN-01'], type: ['plan', 'summary'], phase: ['v1.1/phase-3'] }),
    );
    expect([...params].map(([key, value]) => `${key}=${value}`)).toEqual([
      'q=watcher',
      'phase=v1.1/phase-3',
      'type=plan',
      'type=summary',
      'req=SIGN-01',
    ]);
  });

  it('writes only q for an empty selection, and round-trips through the parser', () => {
    expect(facetSearchParams('a b', selection()).toString()).toBe('q=a+b');
    const params = facetSearchParams('x', selection({ type: ['plan'], req: ['ROLE-02'] }));
    const parsed = parseFacetSelection((dimension) => params.getAll(dimension));
    expect(parsed).toEqual({ phase: [], type: ['plan'], req: ['ROLE-02'] });
  });
});

describe('phaseTokenOf', () => {
  const identity = (milestoneVersion: string | null, number: string): PhaseIdentity => ({
    milestoneVersion,
    number,
    projectCode: null,
    slug: 'x',
  });

  it("is the phase's readable address without its leading slash", () => {
    expect(phaseTokenOf(identity('v1.1', '3'))).toBe('v1.1/phase-3');
  });

  it('differs between same-numbered phases of different milestones', () => {
    expect(phaseTokenOf(identity('v1.0', '3'))).not.toBe(phaseTokenOf(identity('v1.1', '3')));
  });
});

describe('compareNatural', () => {
  it('compares digit runs as numbers', () => {
    expect(['SIGN-10', 'SIGN-2', 'SIGN-1'].sort(compareNatural)).toEqual(['SIGN-1', 'SIGN-2', 'SIGN-10']);
  });
});

describe('on Lendshed', () => {
  let presentation: ProjectPresentation;
  let requirementsByPath: Map<string, string[]>;
  let context: FacetContext;

  beforeAll(async () => {
    presentation = (await loadFixtureProject()).presentation;
    requirementsByPath = buildRequirementMap(presentation);
    context = buildFacetContext(presentation, ['plan', 'summary', 'context', 'verification'], requirementsByPath);
  });

  describe('buildRequirementMap (D-08)', () => {
    it("maps a plan through its frontmatter requirements", () => {
      expect(requirementsByPath.get(PLAN_PATH)).toEqual(['SIGN-01', 'SIGN-05', 'SIGN-06']);
    });

    it('maps a summary through requirements-completed', () => {
      expect(requirementsByPath.get(SUMMARY_PATH)).toEqual(['SIGN-01', 'SIGN-05', 'SIGN-06']);
    });

    it("maps a VERIFICATION file to its phase's requirement ids", () => {
      expect(requirementsByPath.get(VERIFICATION_PATH)).toEqual([
        'ADMN-01',
        'ADMN-02',
        'ADMN-03',
        'ADMN-04',
        'ADMN-05',
        'ADMN-06',
      ]);
    });

    it('maps the root REQUIREMENTS.md to every id the project defines, and not the archived copy', () => {
      expect(requirementsByPath.get('.planning/REQUIREMENTS.md')).toHaveLength(presentation.requirements.length);
      const archived = presentation.artifacts.find((a) => a.kind === 'requirements' && a.location === 'milestone-root');
      expect(archived).toBeDefined();
      expect(requirementsByPath.has(archived!.path)).toBe(false);
    });

    it('maps a CONTEXT file that only mentions an id in prose to nothing', () => {
      const contexts = presentation.artifacts.filter((artifact) => artifact.kind === 'context');
      expect(contexts.length).toBeGreaterThan(0);
      for (const artifact of contexts) expect(requirementsByPath.has(artifact.path)).toBe(false);
    });

    it('accepts a comma-separated string and lower-case ids, and drops an id the project does not define', () => {
      const edited: ProjectPresentation = {
        ...presentation,
        artifacts: presentation.artifacts.map((artifact) =>
          artifact.path === PLAN_PATH
            ? { ...artifact, frontmatter: { requirements: 'sign-01, role-02 , NOPE-99, , sign-01' } }
            : artifact,
        ),
      };
      expect(buildRequirementMap(edited).get(PLAN_PATH)).toEqual(['ROLE-02', 'SIGN-01']);
    });

    it('never reads a non-string value as an id', () => {
      const edited: ProjectPresentation = {
        ...presentation,
        artifacts: presentation.artifacts.map((artifact) =>
          artifact.path === PLAN_PATH ? { ...artifact, frontmatter: { requirements: [1, { id: 'SIGN-01' }, null] } } : artifact,
        ),
      };
      expect(buildRequirementMap(edited).has(PLAN_PATH)).toBe(false);
    });
  });

  describe('buildFacetContext', () => {
    it('labels phases "{NN} {name}", adds the version for an archived milestone, live first then archived newest first', () => {
      const labels = [...context.phaseByToken.entries()]
        .sort((a, b) => a[1].order - b[1].order)
        .map(([token, info]) => [token, info.label]);
      expect(labels.slice(0, 2)).toEqual([
        ['v1.1/phase-1', '01 Member Sign-In & Sessions'],
        ['v1.1/phase-2', '02 Roles & Permissions'],
      ]);
      expect(labels[4]).toEqual(['v1.0/phase-1', '01 Member Data Foundation · v1.0']);
      expect(labels).toHaveLength(8);
    });
  });

  describe('knownSelection', () => {
    it('drops a phase token, kind and requirement id the project does not have', () => {
      const known = knownSelection(
        selection({
          phase: ['v9.9/phase-1', 'v1.1/phase-3'],
          type: ['plan', 'nonsense'],
          req: ['SIGN-01', 'NOPE-01'],
        }),
        context,
      );
      expect(known).toEqual({ phase: ['v1.1/phase-3'], type: ['plan'], req: ['SIGN-01'] });
    });
  });

  describe('end to end with the real context', () => {
    it('keeps only traced files for a requirement filter', () => {
      const hits = [PLAN_PATH, SUMMARY_PATH, '.planning/REQUIREMENTS.md', VERIFICATION_PATH, '.planning/PROJECT.md'].map(
        (path) => hit(path, { kind: path.includes('PLAN') ? 'plan' : 'other' }),
      );
      const kept = applyFacetSelection(hits, selection({ req: ['SIGN-05'] }), context).map((entry) => entry.path);
      expect(kept).toEqual([PLAN_PATH, SUMMARY_PATH, '.planning/REQUIREMENTS.md']);
    });
  });
});

// --- Counting rules, on a small synthetic world ----------------------------------------------------------------

function hit(path: string, overrides: Partial<SearchHitLike> = {}): SearchHitLike {
  return {
    path,
    title: path,
    kind: 'plan',
    url: `/${path}`,
    phaseKey: null,
    milestoneKey: null,
    score: 1,
    matchedTerms: [],
    ...overrides,
  };
}

/** Two live phases, one archived phase; three requirements. */
function syntheticContext(documentKinds: string[] = ['plan', 'summary', 'context']): FacetContext {
  const requirementsByPath = new Map<string, string[]>([
    ['a-plan', ['REQ-2']],
    ['b-plan', ['REQ-10', 'REQ-2', 'REQ-1']],
    ['c-summary', ['REQ-1']],
  ]);
  return {
    phaseTokenByKey: new Map([
      ['p1', 'v1.1/phase-1'],
      ['p2', 'v1.1/phase-2'],
      ['old', 'v1.0/phase-1'],
    ]),
    phaseByToken: new Map([
      ['v1.1/phase-1', { key: 'p1', label: '01 First', order: 0 }],
      ['v1.1/phase-2', { key: 'p2', label: '02 Second', order: 1 }],
      ['v1.0/phase-1', { key: 'old', label: '01 Old · v1.0', order: 2 }],
    ]),
    requirementsByPath,
    knownKinds: new Set(documentKinds),
    knownRequirementIds: new Set(['REQ-1', 'REQ-2', 'REQ-10']),
  };
}

const HITS: SearchHitLike[] = [
  hit('a-plan', { kind: 'plan', phaseKey: 'p1' }),
  hit('b-plan', { kind: 'plan', phaseKey: 'p2' }),
  hit('c-summary', { kind: 'summary', phaseKey: 'p2' }),
  hit('d-context', { kind: 'context', phaseKey: 'old' }),
  hit('e-root', { kind: 'context' }),
];

function countsOf(facet: { values: { value: string; count: number }[] }): Record<string, number> {
  return Object.fromEntries(facet.values.map((entry) => [entry.value, entry.count]));
}

describe('applyFacetSelection', () => {
  const context = syntheticContext();

  it('filters nothing for an empty selection', () => {
    expect(applyFacetSelection(HITS, selection(), context)).toEqual(HITS);
  });

  it('is OR within a dimension', () => {
    const kept = applyFacetSelection(HITS, selection({ phase: ['v1.1/phase-1', 'v1.0/phase-1'] }), context);
    expect(kept.map((entry) => entry.path)).toEqual(['a-plan', 'd-context']);
  });

  it('is AND across dimensions', () => {
    const kept = applyFacetSelection(HITS, selection({ phase: ['v1.1/phase-2'], type: ['plan'] }), context);
    expect(kept.map((entry) => entry.path)).toEqual(['b-plan']);
  });

  it('drops a hit with no value in a selected dimension', () => {
    const kept = applyFacetSelection(HITS, selection({ req: ['REQ-1'] }), context);
    expect(kept.map((entry) => entry.path)).toEqual(['b-plan', 'c-summary']);
  });
});

describe('computeFacets (D-09)', () => {
  const context = syntheticContext();

  it('counts every value over all hits when nothing is selected', () => {
    const facets = computeFacets(HITS, selection(), context);
    expect(countsOf(facets.phase)).toEqual({ 'v1.1/phase-1': 1, 'v1.1/phase-2': 2, 'v1.0/phase-1': 1 });
    expect(countsOf(facets.type)).toEqual({ plan: 2, summary: 1, context: 2 });
    expect(countsOf(facets.req)).toEqual({ 'REQ-1': 2, 'REQ-2': 2, 'REQ-10': 1 });
    expect(facets.phase.allCount).toBe(5);
    expect(facets.type.allCount).toBe(5);
  });

  it("applies the other facets' selection but ignores the facet's own", () => {
    const facets = computeFacets(HITS, selection({ phase: ['v1.1/phase-2'] }), context);
    // type and req count only hits in phase 2 (b-plan, c-summary)
    expect(countsOf(facets.type)).toEqual({ plan: 1, summary: 1, context: 0 });
    expect(countsOf(facets.req)).toEqual({ 'REQ-1': 2, 'REQ-2': 1, 'REQ-10': 1 });
    // the phase counts are unchanged from the no-selection counts
    expect(countsOf(facets.phase)).toEqual({ 'v1.1/phase-1': 1, 'v1.1/phase-2': 2, 'v1.0/phase-1': 1 });
    expect(facets.type.allCount).toBe(2);
    expect(facets.phase.allCount).toBe(5);
  });

  it('keeps a value with zero hits listed with count 0', () => {
    const facets = computeFacets(HITS, selection({ type: ['summary'] }), context);
    expect(countsOf(facets.phase)).toEqual({ 'v1.1/phase-1': 0, 'v1.1/phase-2': 1, 'v1.0/phase-1': 0 });
  });

  it('keeps a selected value that dropped to zero listed and selected', () => {
    const facets = computeFacets(HITS, selection({ phase: ['v1.0/phase-1'], type: ['summary'] }), context);
    const old = facets.phase.values.find((entry) => entry.value === 'v1.0/phase-1');
    expect(old).toMatchObject({ count: 0, selected: true });
    const summary = facets.type.values.find((entry) => entry.value === 'summary');
    expect(summary).toMatchObject({ count: 0, selected: true });
  });

  it('adds one to each requirement a hit is traced to', () => {
    const facets = computeFacets([HITS[1]], selection(), context);
    expect(countsOf(facets.req)).toEqual({ 'REQ-1': 1, 'REQ-2': 1, 'REQ-10': 1 });
    expect(facets.req.allCount).toBe(1);
  });

  it('labels phases from the context and keeps the raw kind and id as their own labels', () => {
    const facets = computeFacets(HITS, selection(), context);
    expect(facets.phase.values.map((entry) => entry.label)).toEqual(['01 First', '02 Second', '01 Old · v1.0']);
    expect(facets.type.values.every((entry) => entry.label === entry.value)).toBe(true);
    expect(facets.req.values.every((entry) => entry.label === entry.value)).toBe(true);
  });

  it('orders types by unfiltered count then kind, phases by roadmap order, requirements naturally', () => {
    const facets = computeFacets(HITS, selection({ type: ['summary'] }), context);
    // unfiltered: context 2, plan 2, summary 1 - the selection does not reorder them
    expect(facets.type.values.map((entry) => entry.value)).toEqual(['context', 'plan', 'summary']);
    expect(facets.phase.values.map((entry) => entry.value)).toEqual(['v1.1/phase-1', 'v1.1/phase-2', 'v1.0/phase-1']);
    expect(facets.req.values.map((entry) => entry.value)).toEqual(['REQ-1', 'REQ-2', 'REQ-10']);
  });

  it('gives empty lists for no hits, plus the known selected values at 0', () => {
    const known = knownSelection(selection({ phase: ['v1.1/phase-1'], type: ['plan'], req: ['REQ-2'] }), context);
    const empty = computeFacets([], known, context);
    expect(empty.phase).toEqual({
      allCount: 0,
      values: [{ value: 'v1.1/phase-1', label: '01 First', count: 0, selected: true }],
    });
    expect(empty.type.values).toEqual([{ value: 'plan', label: 'plan', count: 0, selected: true }]);
    expect(empty.req.values).toEqual([{ value: 'REQ-2', label: 'REQ-2', count: 0, selected: true }]);
    const none = computeFacets([], selection(), context);
    expect(none.phase.values).toEqual([]);
    expect(none.type.values).toEqual([]);
    expect(none.req.values).toEqual([]);
  });

  it('counts one hit once per value even when its path repeats a requirement', () => {
    const repeating = syntheticContext();
    repeating.requirementsByPath.set('b-plan', ['REQ-1', 'REQ-1']);
    const facets = computeFacets([HITS[1]], selection(), repeating);
    expect(countsOf(facets.req)).toEqual({ 'REQ-1': 1 });
  });
});

describe('knownSelection on a synthetic context', () => {
  it('ignores values the context does not know and never echoes them', () => {
    const context = syntheticContext();
    const known = knownSelection(selection({ phase: ['<script>'], type: ['<img>'], req: ['nope'] }), context);
    expect(known).toEqual({ phase: [], type: [], req: [] });
  });
});
