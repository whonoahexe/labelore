// The onboarding page's server-side join (Phase 11, 11-20, VIEW-18, D-03, RESEARCH C11): what the page needs from
// `onboarding/SUMMARY.md` and, for a map-only project, from the same next-step rule the Phase 10 Codebase head
// uses. Pure: it reads the cached `ProjectPresentation`, never a file, and imports nothing from Node. It builds
// no regular expression from file text and gives null on any failure, never a throw.
//
// Two commands, never merged. `summaryCommand` is the Recommended Next Step as `/gsd-onboard` wrote it: carried
// verbatim, never validated, never run. `firstScreen` is set only when the project is map-only (a codebase map and
// nothing else, TGT-09): it is the command and reason `nextStep` computes from the map readiness and the visible
// decision documents, exactly the pair the Codebase head shows. `differs` says whether the two commands are not
// the same text; neither replaces or hides the other. The command is text only: nothing here, in the server or
// in the page runs it (T-11-33).
import type { ProjectPresentation } from '../server/project-presentation.ts';
import type { OnboardingCodebase, OnboardingFileRow, OnboardingLift } from '../planning-repo/handlers/onboarding.ts';
import { hasPlanningDocCandidates, mapReadiness, nextStep } from './codebase-map.ts';
import type { NextStep } from './codebase-map.ts';
import { projectMapState } from './project-map-state.ts';

export interface OnboardingContext {
  /** The summary's Recommended Next Step, verbatim; null when the file has none. */
  summaryCommand: string | null;
  files: OnboardingFileRow[];
  codebase: Pick<OnboardingCodebase, 'brownfield' | 'readiness' | 'mapPath' | 'fastMapAvailable'>;
  docsCount: number | null;
  /** The map-only head's computed command and reason; null when the project is not map-only. */
  firstScreen: NextStep | null;
  /** True when both commands exist and are not the same text. A summary with no command has nothing to differ from. */
  differs: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readFiles(value: unknown): OnboardingFileRow[] {
  if (!Array.isArray(value)) return [];
  const rows: OnboardingFileRow[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== 'string') continue;
    rows.push({ name: entry.name, present: boolOrNull(entry.present) });
  }
  return rows;
}

/** The context for the onboarding summary at `path`, or null when that file has no lifted summary. */
export function buildOnboardingContext(presentation: ProjectPresentation, path: string): OnboardingContext | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const artifact = artifacts.find((candidate) => candidate.path === path);
    if (artifact === undefined || !isRecord(artifact.structured)) return null;
    const lifted = artifact.structured.onboarding as Partial<OnboardingLift> | undefined;
    if (!isRecord(lifted)) return null;

    const codebase: Record<string, unknown> = isRecord(lifted.codebase) ? lifted.codebase : {};
    const summaryCommand = textOrNull(lifted.command);

    const mapState = projectMapState(artifacts);
    const firstScreen: NextStep | null = mapState.mapOnly
      ? nextStep(mapReadiness(mapState.present), hasPlanningDocCandidates(artifacts))
      : null;

    return {
      summaryCommand,
      files: readFiles(lifted.files),
      codebase: {
        brownfield: boolOrNull(codebase.brownfield),
        readiness: textOrNull(codebase.readiness),
        mapPath: textOrNull(codebase.mapPath),
        fastMapAvailable: boolOrNull(codebase.fastMapAvailable),
      },
      docsCount: typeof lifted.docsCount === 'number' && Number.isFinite(lifted.docsCount) ? lifted.docsCount : null,
      firstScreen: firstScreen === null ? null : { command: firstScreen.command, reason: firstScreen.reason },
      differs: firstScreen !== null && summaryCommand !== null && firstScreen.command !== summaryCommand,
    };
  } catch {
    return null;
  }
}
