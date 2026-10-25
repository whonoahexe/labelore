// Where the note corpus lives, for the tests that read real note files (quick-261023-61l): Lendshed (the
// made-up fixture project), the dashboard's synthetic fixture and labelore's own `.planning/`. No other
// project is ever read: there is no sibling root and no home-directory path (D-05).
import { join } from 'node:path';
import { FX_ROOT, fxPath } from './fixture-project.ts';
import { LB_ROOT, SYNTHETIC_ROOT, loadFiles, planningFiles } from './todo-corpus.ts';
import type { LoadedProject } from './todo-corpus.ts';

export { LB_ROOT, SYNTHETIC_ROOT, FX_ROOT };

/** The roots whose notes the guard reads: labelore, the synthetic fixture and Lendshed. */
export const NOTE_ROOTS: string[] = [LB_ROOT, SYNTHETIC_ROOT, FX_ROOT];

/** The Lendshed heartbeat-on-start note: the shape that used to need a sibling project on the machine. */
export const HEARTBEAT_NOTE: string = fxPath('notes/2026-03-25-kiosk-version-heartbeat-on-start.md');

/** The notes the sketch's quick and explore pins name, by the sketch's keys. */
export const NOTE_FILES = {
  dcrop: '.planning/notes/2026-03-24-crop-tool-photos-and-member-avatars.md',
  dround: '.planning/notes/2026-03-24-round-member-avatars.md',
  dsfx: '.planning/notes/2026-03-23-checkout-sound-cues.md',
  dcall: '.planning/notes/2026-03-23-scanner-debug-logging-for-checkout-kiosk.md',
  dback: '.planning/notes/2026-03-23-back-button-closes-the-kiosk.md',
  pcap: '.planning/notes/2026-03-24-raise-single-export-size-cap.md',
  pbrief: '.planning/notes/2026-03-26-steward-desk-milestone-brief.md',
  heartbeat: '.planning/notes/2026-03-25-kiosk-version-heartbeat-on-start.md',
  star: '.planning/notes/2026-10-16-tariff-note-tooltips.md',
  sundo: '.planning/notes/2026-10-08-brokers-want-undo.md',
  lsk: '.planning/notes/2026-10-23-sketches-page-in-labelore.md',
  lperkind: '.planning/notes/per-kind-artifact-rendering.md',
  lsurvey: '.planning/notes/artifact-structure-survey.md',
} as const;

/** Where each note file lives (the root that holds it). */
export const NOTE_HOME: Record<keyof typeof NOTE_FILES, string> = {
  dcrop: FX_ROOT,
  dround: FX_ROOT,
  dsfx: FX_ROOT,
  dcall: FX_ROOT,
  dback: FX_ROOT,
  pcap: FX_ROOT,
  pbrief: FX_ROOT,
  heartbeat: FX_ROOT,
  star: SYNTHETIC_ROOT,
  sundo: SYNTHETIC_ROOT,
  lsk: LB_ROOT,
  lperkind: LB_ROOT,
  lsurvey: LB_ROOT,
};

export function noteFile(key: keyof typeof NOTE_FILES): string {
  return join(NOTE_HOME[key], NOTE_FILES[key]);
}

/** The `notes/` and `todos/` files of a project root, keyed by their path relative to the root. */
export function notesAndTodos(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(planningFiles(root))) {
    if (path.startsWith('.planning/notes/') || path.startsWith('.planning/todos/')) out[path] = content;
  }
  return out;
}

/** Lendshed, the synthetic notes and todos and labelore's own notes and todos, in one
 * in-memory project (no path collides). */
export function combinedFiles(): Record<string, string> {
  return { ...notesAndTodos(FX_ROOT), ...notesAndTodos(SYNTHETIC_ROOT), ...notesAndTodos(LB_ROOT) };
}

export async function loadCombined(): Promise<LoadedProject> {
  return loadFiles(combinedFiles());
}
