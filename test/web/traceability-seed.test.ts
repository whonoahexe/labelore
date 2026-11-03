import { describe, expect, it } from 'vitest';
import {
  parseRequirementState,
  requirementStateOf,
  traceabilityStateUrl,
  type TraceabilityRow,
} from '../../src/presentation/traceability.ts';
import {
  DEFAULT_TRACEABILITY_FILTER,
  matchesTraceabilityFilter,
  seedTraceabilityFilter,
  type TraceabilityFilterState,
} from '../../src/web/pages/traceability-filter.ts';

const VIEW = {
  currentMilestone: 'v1.1',
  archivedMilestones: [
    { version: 'v1.0', title: 'v1.0 First', sourcePath: '', total: 3, shipped: null, groups: [] },
  ],
};

function row(overrides: Partial<TraceabilityRow> = {}): TraceabilityRow {
  return {
    id: 'TGT-01',
    category: 'Targeting',
    text: 'Some requirement',
    tier: 'v1',
    requirementStatus: true,
    coveringPhases: [],
    uncovered: false,
    hasUnresolvedReference: false,
    statusDisagreement: false,
    ...overrides,
  };
}

function filter(overrides: Partial<TraceabilityFilterState> = {}): TraceabilityFilterState {
  return { ...DEFAULT_TRACEABILITY_FILTER, ...overrides };
}

describe('seedTraceabilityFilter', () => {
  it('reads ?state= into the state axis', () => {
    expect(seedTraceabilityFilter('?state=pending', VIEW).state).toBe('pending');
    expect(seedTraceabilityFilter('?state=complete', VIEW).state).toBe('complete');
    expect(seedTraceabilityFilter('?state=out-of-scope', VIEW).state).toBe('out-of-scope');
  });

  it('opens unfiltered for an empty search, an unknown state or a wrongly cased one', () => {
    expect(seedTraceabilityFilter('', VIEW)).toEqual(DEFAULT_TRACEABILITY_FILTER);
    expect(seedTraceabilityFilter('?state=bogus', VIEW)).toEqual(DEFAULT_TRACEABILITY_FILTER);
    expect(seedTraceabilityFilter('?state=Pending', VIEW)).toEqual(DEFAULT_TRACEABILITY_FILTER);
    expect(seedTraceabilityFilter('?milestone=v1.1', VIEW)).toEqual(DEFAULT_TRACEABILITY_FILTER);
  });

  it('ignores a complete or pending state paired with a milestone that is not the current one', () => {
    expect(seedTraceabilityFilter('?milestone=v9.9&state=complete', VIEW)).toEqual(
      DEFAULT_TRACEABILITY_FILTER,
    );
    expect(seedTraceabilityFilter('?milestone=v1.0&state=pending', VIEW)).toEqual(
      DEFAULT_TRACEABILITY_FILTER,
    );
    expect(seedTraceabilityFilter('?milestone=v1.1&state=pending', VIEW)).toEqual(
      filter({ state: 'pending', milestone: 'v1.1' }),
    );
  });

  it('keeps validated with an archived milestone, and drops an unknown milestone but keeps the state', () => {
    expect(seedTraceabilityFilter('?state=validated&milestone=v1.0', VIEW)).toEqual(
      filter({ state: 'validated', milestone: 'v1.0' }),
    );
    expect(seedTraceabilityFilter('?state=validated', VIEW)).toEqual(
      filter({ state: 'validated', milestone: null }),
    );
    expect(seedTraceabilityFilter('?state=validated&milestone=v9.9', VIEW)).toEqual(
      filter({ state: 'validated', milestone: null }),
    );
  });

  it('lets out-of-scope ignore the milestone', () => {
    expect(seedTraceabilityFilter('?state=out-of-scope&milestone=v1.0', VIEW)).toEqual(
      filter({ state: 'out-of-scope' }),
    );
  });

  it('never throws on a malformed search string', () => {
    expect(() => seedTraceabilityFilter('?state=%E0%A4%A&milestone=%', VIEW)).not.toThrow();
    expect(() => seedTraceabilityFilter('&&&===', { currentMilestone: null, archivedMilestones: [] })).not.toThrow();
  });
});

describe('the state axis', () => {
  const checked = row({ id: 'A-01', requirementStatus: true });
  const unchecked = row({ id: 'A-02', requirementStatus: false });

  it('requirementStateOf maps the requirement checkbox and nothing else', () => {
    expect(requirementStateOf(checked)).toBe('complete');
    expect(requirementStateOf(unchecked)).toBe('pending');
    expect(requirementStateOf(row({ requirementStatus: null }))).toBeNull();
  });

  it('pending drops a checked row and keeps an unchecked one', () => {
    const pending = filter({ state: 'pending' });
    expect(matchesTraceabilityFilter(checked, pending)).toBe(false);
    expect(matchesTraceabilityFilter(unchecked, pending)).toBe(true);
  });

  it('complete keeps a checked row and drops an unchecked one', () => {
    const complete = filter({ state: 'complete' });
    expect(matchesTraceabilityFilter(checked, complete)).toBe(true);
    expect(matchesTraceabilityFilter(unchecked, complete)).toBe(false);
  });

  it('validated and out-of-scope match no active-tier row; all changes nothing', () => {
    expect(matchesTraceabilityFilter(checked, filter({ state: 'validated' }))).toBe(false);
    expect(matchesTraceabilityFilter(unchecked, filter({ state: 'out-of-scope' }))).toBe(false);
    expect(matchesTraceabilityFilter(checked, filter({ state: 'all' }))).toBe(true);
    expect(matchesTraceabilityFilter(unchecked, filter({ state: 'all' }))).toBe(true);
  });

  it('the query and status axes still apply first', () => {
    const pendingUncovered = row({ id: 'B-01', requirementStatus: false, uncovered: true });
    expect(
      matchesTraceabilityFilter(pendingUncovered, filter({ state: 'pending', query: 'zzz' })),
    ).toBe(false);
    expect(
      matchesTraceabilityFilter(unchecked, filter({ state: 'pending', status: 'uncovered' })),
    ).toBe(false);
    expect(
      matchesTraceabilityFilter(pendingUncovered, filter({ state: 'pending', status: 'uncovered' })),
    ).toBe(true);
  });
});

describe('state parsing and addresses', () => {
  it('parseRequirementState accepts exactly the four states', () => {
    for (const state of ['complete', 'pending', 'validated', 'out-of-scope']) {
      expect(parseRequirementState(state)).toBe(state);
    }
    expect(parseRequirementState(null)).toBeNull();
    expect(parseRequirementState('')).toBeNull();
    expect(parseRequirementState('all')).toBeNull();
  });

  it('traceabilityStateUrl puts the milestone first, then the state', () => {
    expect(traceabilityStateUrl('pending')).toBe('/traceability?state=pending');
    expect(traceabilityStateUrl('validated', 'v1.0')).toBe('/traceability?milestone=v1.0&state=validated');
    expect(traceabilityStateUrl('complete', null)).toBe('/traceability?state=complete');
  });
});
