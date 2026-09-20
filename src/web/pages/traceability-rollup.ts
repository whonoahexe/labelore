// The covering-phase tone vocabulary and the row rollup behind the traceability status rail
// (sketch 001, variant C). Kept DOM-free in a plain .ts file — the same seam as
// traceability-filter.ts — so the rank and the labels are unit-testable without the .tsx page (and
// the "jsx" compiler option it requires) in the import graph.
import type { TraceabilityCoveringPhase } from '../../presentation/traceability.ts';

export type CoveringPhaseTone = 'complete' | 'in-flight' | 'missing' | 'quiet' | 'destructive';

/** A3: an actively-worked covering phase and one with no directory on disk are no longer the same
 * grey chip. Module-level so the mapping is a single, testable fact rather than inlined per call
 * site; an unrecognised or missing disk status falls back to 'quiet' rather than being dropped. */
const COVERING_PHASE_TONE_BY_DISK_STATUS: Record<string, 'complete' | 'in-flight' | 'missing'> = {
  complete: 'complete',
  in_progress: 'in-flight',
  researched: 'in-flight',
  no_directory: 'missing',
};

export function coveringPhaseTone(
  diskStatus: string | null,
): 'complete' | 'in-flight' | 'missing' | 'quiet' {
  if (diskStatus === null) return 'quiet';
  return COVERING_PHASE_TONE_BY_DISK_STATUS[diskStatus] ?? 'quiet';
}

/** True when the reference resolved to a real phase the page can name and link. */
export function isResolvedCovering(covering: TraceabilityCoveringPhase): boolean {
  return Boolean(covering.resolved && covering.url && covering.phaseName);
}

/** The tone one covering phase carries — an unresolved reference is the destructive one. */
export function coveringPhaseSignal(covering: TraceabilityCoveringPhase): CoveringPhaseTone {
  return isResolvedCovering(covering) ? coveringPhaseTone(covering.phaseDiskStatus) : 'destructive';
}

/** The words a covering phase's status is shown as, everywhere it is shown as text. */
export function coveringPhaseStatusLabel(covering: TraceabilityCoveringPhase): string {
  if (!isResolvedCovering(covering)) return 'Unresolved';
  return (covering.phaseDiskStatus ?? 'unknown').replaceAll('_', ' ');
}

// Worst last. A phase whose disk status is unknown ranks above one known to be in flight — nothing
// is known about it, so it must not read as healthier than work that is verifiably under way.
const TONE_RANK: Record<CoveringPhaseTone, number> = {
  complete: 0,
  'in-flight': 1,
  quiet: 2,
  missing: 3,
  destructive: 4,
};

export interface CoveringRollup {
  /** The covering phase the rail chip is drawn from — the row's worst, first among equals. */
  worst: TraceabilityCoveringPhase;
  /** "1 phase", "3 phases", or "3 phases · worst shown" when the rail is hiding a healthier
   * majority behind a worse phase — the count line must never let the chip read as the whole story. */
  countLabel: string;
}

export function coveringRollup(
  phases: readonly TraceabilityCoveringPhase[],
): CoveringRollup | null {
  if (phases.length === 0) return null;
  let worst = phases[0]!;
  for (const phase of phases) {
    if (TONE_RANK[coveringPhaseSignal(phase)] > TONE_RANK[coveringPhaseSignal(worst)])
      worst = phase;
  }
  const noun = phases.length === 1 ? 'phase' : 'phases';
  const suffix =
    phases.length > 1 && coveringPhaseSignal(worst) !== 'complete' ? ' · worst shown' : '';
  return { worst, countLabel: `${phases.length} ${noun}${suffix}` };
}
