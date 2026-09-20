import { describe, expect, it } from 'vitest';
import type { TraceabilityCoveringPhase } from '../../src/presentation/traceability.ts';
import {
  coveringPhaseSignal,
  coveringPhaseStatusLabel,
  coveringPhaseTone,
  coveringRollup,
} from '../../src/web/pages/traceability-rollup.ts';

function phase(
  diskStatus: string | null,
  overrides: Partial<TraceabilityCoveringPhase> = {},
): TraceabilityCoveringPhase {
  return {
    raw: 'Phase 1',
    phaseKey: '1',
    url: '/phases/1',
    resolved: true,
    phaseName: 'Phase 1 — Example',
    phaseDiskStatus: diskStatus,
    phaseRoadmapComplete: null,
    ...overrides,
  };
}

const unresolved = phase(null, { resolved: false, url: null, phaseName: null, raw: 'Phase 99' });

describe('coveringPhaseTone', () => {
  it('maps the four known disk statuses and falls back to quiet', () => {
    expect(coveringPhaseTone('complete')).toBe('complete');
    expect(coveringPhaseTone('in_progress')).toBe('in-flight');
    expect(coveringPhaseTone('researched')).toBe('in-flight');
    expect(coveringPhaseTone('no_directory')).toBe('missing');
    expect(coveringPhaseTone('something_new')).toBe('quiet');
    expect(coveringPhaseTone(null)).toBe('quiet');
  });
});

describe('coveringPhaseSignal / coveringPhaseStatusLabel', () => {
  it('an unresolved reference is the destructive tone and reads "Unresolved"', () => {
    expect(coveringPhaseSignal(unresolved)).toBe('destructive');
    expect(coveringPhaseStatusLabel(unresolved)).toBe('Unresolved');
  });

  it('a resolved phase carries its disk status as words, underscores spaced out', () => {
    expect(coveringPhaseStatusLabel(phase('in_progress'))).toBe('in progress');
    expect(coveringPhaseStatusLabel(phase('no_directory'))).toBe('no directory');
    expect(coveringPhaseStatusLabel(phase(null))).toBe('unknown');
  });

  it('a phase with no name or url is treated as unresolved even if flagged resolved', () => {
    expect(coveringPhaseSignal(phase('complete', { phaseName: null }))).toBe('destructive');
  });
});

describe('coveringRollup', () => {
  it('is null for a row with no covering phases', () => {
    expect(coveringRollup([])).toBeNull();
  });

  it('a single complete phase rolls up to itself with a plain count', () => {
    const only = phase('complete');
    expect(coveringRollup([only])).toEqual({ worst: only, countLabel: '1 phase' });
  });

  it('ranks complete < in-flight < unknown < missing < unresolved and shows the worst', () => {
    const complete = phase('complete');
    const inFlight = phase('in_progress');
    const unknown = phase(null);
    const missing = phase('no_directory');
    expect(coveringRollup([complete, inFlight])!.worst).toBe(inFlight);
    expect(coveringRollup([inFlight, unknown])!.worst).toBe(unknown);
    expect(coveringRollup([unknown, missing])!.worst).toBe(missing);
    expect(coveringRollup([missing, unresolved, complete])!.worst).toBe(unresolved);
  });

  it('is order-independent and keeps the first of equally-bad phases', () => {
    const a = phase('in_progress', { raw: 'A' });
    const b = phase('in_progress', { raw: 'B' });
    expect(coveringRollup([a, b])!.worst).toBe(a);
    expect(coveringRollup([b, a])!.worst).toBe(b);
  });

  it('says "worst shown" only when several phases hide a non-complete worst', () => {
    expect(coveringRollup([phase('complete'), phase('complete')])!.countLabel).toBe('2 phases');
    expect(coveringRollup([phase('complete'), phase('in_progress')])!.countLabel).toBe(
      '2 phases · worst shown',
    );
    expect(coveringRollup([phase('in_progress')])!.countLabel).toBe('1 phase');
  });
});
