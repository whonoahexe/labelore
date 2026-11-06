// The pause page's server-side join (Phase 11, 11-07, VIEW-17, sketch 054 C): what the page needs from the two
// pause files and the rest of the project. Pure: it reads the cached `ProjectPresentation`, never a file, and
// imports nothing from Node. It never throws on presentation data; any failure gives null.
//
// This first cut (the tracer) pairs a HANDOFF.json with the root `.continue-here.md` and names the stop and
// the next action. Pairing by folder, the pause date, the moved-on note, the gates and the disagreements
// follow in the same module.
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';
import type { PauseBody } from '../planning-repo/handlers/pause-lift.ts';

const ROOT_CONTINUE = '.planning/.continue-here.md';

export const HANDOFF_FILE = 'HANDOFF.json';
export const CONTINUE_FILE = '.continue-here.md';

export interface PauseFileRef {
  path: string;
  url: string;
}

export interface PauseStop {
  task: number | string | null;
  totalTasks: number | string | null;
  status: string | null;
}

export interface PauseText {
  text: string;
  file: string;
}

export interface PauseContext {
  active: 'handoff' | 'continue-here';
  files: { handoff: PauseFileRef | null; continueHere: PauseFileRef | null };
  stop: PauseStop;
  nextAction: PauseText | null;
}

function pauseOf(artifact: ArtifactDto | undefined): PauseBody | null {
  const pause = artifact?.structured?.pause;
  if (typeof pause !== 'object' || pause === null) return null;
  const source = (pause as { source?: unknown }).source;
  return source === 'handoff' ? (pause as PauseBody) : null;
}

/**
 * The page context for the pause file at `activePath`, or null when that path is not a pause file in the
 * presentation or its lift is absent.
 */
export function buildPauseContext(presentation: ProjectPresentation, activePath: string): PauseContext | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const active = artifacts.find((candidate) => candidate.path === activePath);
    if (active === undefined || active.kind !== 'handoff') return null;
    const pause = pauseOf(active);
    if (pause === null || pause.source !== 'handoff') return null;
    const partner = artifacts.find((candidate) => candidate.path === ROOT_CONTINUE);
    return {
      active: 'handoff',
      files: {
        handoff: { path: active.path, url: active.key },
        continueHere: partner === undefined ? null : { path: partner.path, url: partner.key },
      },
      stop: {
        task: pause.task ?? null,
        totalTasks: pause.totalTasks ?? null,
        status: pause.status ?? null,
      },
      nextAction: pause.nextAction === undefined ? null : { text: pause.nextAction, file: HANDOFF_FILE },
    };
  } catch {
    return null;
  }
}
