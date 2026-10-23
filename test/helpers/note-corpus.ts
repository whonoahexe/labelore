// Where the note corpus lives, for the tests that read real note files (quick-261023-61l): the committed
// fixture project (copied byte for byte from the sketches' data), the dashboard's synthetic fixture,
// labelore's own `.planning/` and each sibling project that has a `.planning/notes` folder on this
// machine. The sibling projects are only ever read; a machine without the checkouts skips the tests that
// need them (their own `it.runIf(existsSync(...))` gates).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { LB_ROOT, SYNTHETIC_ROOT, loadFiles, planningFiles } from './todo-corpus.ts';
import type { LoadedProject } from './todo-corpus.ts';

export { LB_ROOT, SYNTHETIC_ROOT };

/** The committed fixture project: the duet / portal notes and todos of the sketches. */
export const NOTES_FIXTURE_ROOT = join(LB_ROOT, 'test/fixtures/notes');

export const RESOUNDANT_ROOT = join(homedir(), 'Work/Ibis/resoundant');
export const PYEDGE_ROOT = join(homedir(), 'Work/Ibis/resoundant/pyedge');

/** The sibling project roots that hold a `.planning/notes` directory. */
export const NOTE_SIBLING_ROOTS: string[] = [RESOUNDANT_ROOT, PYEDGE_ROOT].filter((root) =>
  existsSync(join(root, '.planning', 'notes')),
);

export const PY_NOTE = join(PYEDGE_ROOT, '.planning/notes/2026-10-21-edgecan-version-heartbeat-stack-start.md');

/** The roots whose notes the guard reads: labelore, the synthetic fixture, the fixture project, siblings. */
export const NOTE_ROOTS: string[] = [LB_ROOT, SYNTHETIC_ROOT, NOTES_FIXTURE_ROOT, ...NOTE_SIBLING_ROOTS];

/** The notes the sketch's quick and explore pins name, by the sketch's keys. */
export const NOTE_FILES = {
  dcrop: '.planning/notes/2026-10-21-crop-images-and-profile-photos.md',
  dround: '.planning/notes/2026-10-21-round-profile-photos.md',
  dsfx: '.planning/notes/2026-10-20-sound-effects.md',
  dcall: '.planning/notes/2026-10-20-call-debug-logging-webrtc-turn.md',
  dback: '.planning/notes/2026-10-20-back-button-closes-app.md',
  pcap: '.planning/notes/2026-10-21-raise-single-file-download-cap.md',
  pbrief: '.planning/notes/2026-10-23-studio-media-workflow-milestone-brief.md',
  star: '.planning/notes/2026-10-16-tariff-note-tooltips.md',
  sundo: '.planning/notes/2026-10-08-brokers-want-undo.md',
  lsk: '.planning/notes/2026-10-23-sketches-page-in-labelore.md',
  lperkind: '.planning/notes/per-kind-artifact-rendering.md',
  lsurvey: '.planning/notes/artifact-structure-survey.md',
} as const;

/** Where each note file lives (the root that holds it). */
export const NOTE_HOME: Record<keyof typeof NOTE_FILES, string> = {
  dcrop: NOTES_FIXTURE_ROOT,
  dround: NOTES_FIXTURE_ROOT,
  dsfx: NOTES_FIXTURE_ROOT,
  dcall: NOTES_FIXTURE_ROOT,
  dback: NOTES_FIXTURE_ROOT,
  pcap: NOTES_FIXTURE_ROOT,
  pbrief: NOTES_FIXTURE_ROOT,
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

/** The fixture project, the synthetic notes and todos and labelore's own notes and todos, in one
 * in-memory project (no path collides). */
export function combinedFiles(): Record<string, string> {
  return { ...notesAndTodos(NOTES_FIXTURE_ROOT), ...notesAndTodos(SYNTHETIC_ROOT), ...notesAndTodos(LB_ROOT) };
}

export async function loadCombined(): Promise<LoadedProject> {
  return loadFiles(combinedFiles());
}
